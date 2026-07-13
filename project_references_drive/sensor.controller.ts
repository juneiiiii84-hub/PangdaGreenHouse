import type { Request, Response } from 'express';
import { SupabaseRepository } from '../repositories/supabase.repository.js';
import { MockRepository } from '../repositories/mock.repository.js';
import { ClimateService } from '../services/climate.service.js';
import type { DiagnosticResult, OverallEvaluation } from '../services/climate.service.js';
import type { SensorData } from '../repositories/sensor.repository.interface.js';

// ตรวจหาค่าความต้องการโหมดจำลองพารามิเตอร์
const useMock = process.env.USE_MOCK === 'true';

export const sensorRepo = useMock ? new MockRepository() : new SupabaseRepository();
export const climateService = new ClimateService(sensorRepo);

// จัดเก็บรายชื่อเบราว์เซอร์ที่เปิดเกาะท่อสตรีมมิ่งสด
let sseClients: Response[] = [];

// บัฟเฟอร์ในแรม สำหรับพักค่าความถี่สูง รอครบ 5 นาทีเฉลี่ยแล้วจึงเขียนลง Supabase
interface ZoneBuffer {
  temperature: number[];
  humidity: number[];
  lux: number[];
}
const zoneBuffers: Record<number, ZoneBuffer> = {
  1: { temperature: [], humidity: [], lux: [] },
  2: { temperature: [], humidity: [], lux: [] },
  3: { temperature: [], humidity: [], lux: [] },
  4: { temperature: [], humidity: [], lux: [] },
  5: { temperature: [], humidity: [], lux: [] }
};

// เก็บสถิติระยะเวลาที่ค่าพารามิเตอร์อยู่นอกเกณฑ์มาตรฐาน เพื่อทำดีเลย์แจ้งเตือนสะสมเกิน 30 นาที
interface ParameterState {
  firstEnteredTime: number | null;
  lastState: 'normal' | 'unfavorable';
  alreadyAlerted: boolean;
}

interface ZoneState {
  temp: ParameterState;
  hum: ParameterState;
  vpd: ParameterState;
  ppfd: ParameterState;
}

const zoneParameterStates: Record<number, ZoneState> = {
  1: {
    temp: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    hum: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    vpd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    ppfd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false }
  },
  2: {
    temp: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    hum: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    vpd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    ppfd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false }
  },
  3: {
    temp: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    hum: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    vpd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    ppfd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false }
  },
  4: {
    temp: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    hum: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    vpd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    ppfd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false }
  },
  5: {
    temp: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    hum: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    vpd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false },
    ppfd: { firstEnteredTime: null, lastState: 'normal', alreadyAlerted: false }
  }
};

// ฟังก์ชันสำหรับส่งการแจ้งเตือนเข้า Discord Webhook
async function sendDiscordNotify(payload: any) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(`📢 [Discord Simulation] (ไม่ได้กำหนด DISCORD_WEBHOOK_URL): ${JSON.stringify(payload)}`);
    return;
  }
  try {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      console.error(`❌ ส่ง Discord Webhook ล้มเหลว: ${response.statusText}`);
    } else {
      console.log(`🚀 ส่งการแจ้งเตือนเข้า Discord สำเร็จ`);
    }
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาดในการส่ง Discord Webhook:`, err);
  }
}

// รายชื่อโซนและรายละเอียดตำแหน่งเพื่อความสมจริง
const zoneNames: Record<number, string> = {
  1: 'โซน 1: โรงเรือนหลัก (กล้วยไม้/ไม้ดอก)',
  2: 'โซน 2: โรงเรือนชำ (ฝั่งพัดลม Exhaust)',
  3: 'โซน 3: ห้องเพาะชำเนื้อเยื่อ (Propagation)',
  4: 'โซน 4: ฝั่งทางเข้าโรงเรือนหลัก (Entrance)',
  5: 'โซน 5: พื้นที่กรองแสงพิเศษ (Shaded Area)'
};

// ฟังก์ชันประเมินความเหมาะสมของสภาพอากาศและยิงแจ้งเตือนเชิงรุก
export function evaluateAndTriggerAlert(zone: number, temp: number, hum: number, lux: number) {
  // 1. ตรวจสอบเงื่อนไขเวลา: 06:30 - 18:30 (เวลาประเทศไทย GMT+7)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bangkokTime = new Date(utc + (3600000 * 7));
  const hours = bangkokTime.getHours();
  const minutes = bangkokTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const startMins = 6 * 60 + 30; // 06:30
  const endMins = 18 * 60 + 30;  // 18:30
  
  if (timeInMinutes < startMins || timeInMinutes > endMins) {
    console.log(`[ระบบแจ้งเตือน] ขณะนี้เวลา ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} น. (อยู่นอกช่วงเวลาแจ้งเตือน 18:30 - 06:30 น.) งดแจ้งเตือน`);
    return;
  }

  // 2. ประเมินค่าความเหมาะสมของสภาพอากาศ
  const ppfd = parseFloat((lux * 0.0299).toFixed(2));
  const tempDiag = climateService.getDiagnosticStatus(temp, 'temp');
  const humDiag = climateService.getDiagnosticStatus(hum, 'hum');
  const vpd = climateService.calculateVPD(temp, hum);
  const vpdDiag = climateService.getDiagnosticStatus(vpd, 'vpd');
  const ppfdDiag = climateService.getDiagnosticStatus(ppfd, 'ppfd');

  const alerts: string[] = [];
  
  const checkParam = (
    param: 'temp' | 'hum' | 'vpd' | 'ppfd',
    diag: any,
    valueStr: string,
    label: string
  ): string | null => {
    const zState = zoneParameterStates[zone];
    if (!zState) return null;
    const pState = zState[param];
    const isUnfavorable = diag.state === 'critical' || diag.state === 'warning';

    if (isUnfavorable) {
      if (pState.lastState === 'normal') {
        pState.firstEnteredTime = Date.now();
        pState.lastState = 'unfavorable';
        pState.alreadyAlerted = false;
        console.log(`⏱️ [ระบบตรวจจับ] ${zoneNames[zone] || `โซน ${zone}`} -> ${label} เริ่มเข้าสู่สภาวะไม่เหมาะสม (${diag.status})`);
      } else {
        // เช็คระยะเวลาสะสม
        if (!pState.alreadyAlerted && pState.firstEnteredTime) {
          const elapsed = Date.now() - pState.firstEnteredTime;
          // เกณฑ์เวลา: สามารถกำหนดระยะเวลาสะสมใน .env ผ่าน ALERT_DURATION_MS ได้ (ค่าเริ่มต้น: 30 นาทีสำหรับการทำงานจริง, 30 วินาทีในโหมดจำลอง)
          const envLimit = process.env.ALERT_DURATION_MS ? parseInt(process.env.ALERT_DURATION_MS) : null;
          const limit = envLimit !== null && !isNaN(envLimit) ? envLimit : (useMock ? 30000 : 1800000);
          if (elapsed >= limit) {
            pState.alreadyAlerted = true;
            const durationText = limit === 30000 ? '30 วินาที' : (limit === 1800000 ? '30 นาที' : `${Math.round(limit / 60000)} นาที`);
            const mention = process.env.DISCORD_MENTION ? `${process.env.DISCORD_MENTION}\n` : '';
            const alertMsg = `${mention}⚠️ **[แจ้งเตือนสภาวะผิดปกติสะสมเกิน ${durationText}]**\n` +
                             `📌 **ตำแหน่ง:** ${zoneNames[zone] || `โซน ${zone}`}\n` +
                             `▪️ **พารามิเตอร์:** ${label}\n` +
                             `▪️ **ค่าที่วัดได้:** ${valueStr} (${diag.status})\n` +
                             `▪️ **รายละเอียด:** ${diag.desc}\n` +
                             `👉 **คำแนะนำ:** ${diag.recommendation.replace('✅ ', '').replace('👍 ', '').replace('⚠️ ', '').replace('🚨 ', '')}`;
            return alertMsg;
          }
        }
      }
    } else {
      if (pState.lastState === 'unfavorable') {
        console.log(`🌿 [ระบบตรวจจับ] ${zoneNames[zone] || `โซน ${zone}`} -> ${label} กลับสู่สภาวะปกติแล้ว`);
      }
      pState.firstEnteredTime = null;
      pState.lastState = 'normal';
      pState.alreadyAlerted = false;
    }
    return null;
  };

  const tempAlert = checkParam('temp', tempDiag, `${temp.toFixed(1)}°C`, '🌡️ อุณหภูมิ');
  if (tempAlert) alerts.push(tempAlert);

  const humAlert = checkParam('hum', humDiag, `${hum.toFixed(1)}%RH`, '💧 ความชื้นสัมพัทธ์');
  if (humAlert) alerts.push(humAlert);

  const vpdAlert = checkParam('vpd', vpdDiag, `${vpd.toFixed(2)} kPa`, '💨 ค่า VPD');
  if (vpdAlert) alerts.push(vpdAlert);

  const ppfdAlert = checkParam('ppfd', ppfdDiag, `${ppfd.toFixed(1)} μmol/m²/s`, '☀️ ความเข้มแสง (PPFD)');
  if (ppfdAlert) alerts.push(ppfdAlert);

  // 4. ส่งข้อมูลเข้า Discord Webhook ในรูปแบบข้อความธรรมดาหากมีรายการเตือนสะสมครบตามเวลา
  if (alerts.length > 0) {
    const combinedMessage = alerts.join('\n\n====================\n\n');
    sendDiscordNotify(combinedMessage);
  }
}



// ดันตัวข้อมูลขึ้นท่อส่งผลเรียลไทม์หาเว็บหน้าจอ
export function dispatchSSETicks(ticks: any[]) {
  const dataString = `data: ${JSON.stringify(ticks)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(dataString);
    } catch (e) {
      // ตัวกรองล้างสายเชื่อมที่พังไปแล้ว
    }
  });
}

// ⏱️ ตัวจัดการตั้งบันทึกลง Database ทุกๆ 5 นาที
const FIVE_MINUTES = 5 * 60 * 1000;
setInterval(async () => {
  const snapshots: Omit<SensorData, 'id' | 'created_at'>[] = [];
  
  for (let zone = 1; zone <= 5; zone++) {
    const buf = zoneBuffers[zone];
    if (buf && buf.temperature.length > 0) {
      // หาค่าเฉลี่ยทางสถิติรอบ 5 นาที
      const avgTemp = buf.temperature.reduce((a, b) => a + b, 0) / buf.temperature.length;
      const avgHum = buf.humidity.reduce((a, b) => a + b, 0) / buf.humidity.length;
      const avgLux = buf.lux.reduce((a, b) => a + b, 0) / buf.lux.length;
      
      const vpd = climateService.calculateVPD(avgTemp, avgHum);
      const ppfd = parseFloat((avgLux * 0.0299).toFixed(2));
      
      snapshots.push({
        temperature: parseFloat(avgTemp.toFixed(2)),
        humidity: parseFloat(avgHum.toFixed(2)),
        vpd,
        lux: Math.round(avgLux),
        ppfd,
        zone
      });
      
      // เคลียร์ค่าแรมของโซนนั้นๆ ออกพร้อมเฉลี่ยรอบถัดไป
      buf.temperature = [];
      buf.humidity = [];
      buf.lux = [];
    }
  }

  if (snapshots.length > 0) {
    try {
      await climateService.addManyLogs(snapshots);
      console.log(`💾 บันทึก Snapshot ค่าเฉลี่ยรอบ 5 นาที ลงดีบีเรียบร้อยแล้ว: ${snapshots.length} โซน`);
    } catch (err) {
      console.error('❌ ไม่สามารถบันทึก Snapshots ลงฐานข้อมูล:', err);
    }
  }
}, FIVE_MINUTES);

// สคริปต์จำลองการทำงาน ESP32 ส่งค่าสดทุกๆ 5 วินาที
if (useMock) {
  console.log('⚡ ระบบทำงานในโหมดจำลองพารามิเตอร์ (Simulation Mode)');
  
  const mockAnomalies: Record<number, { type: string; label: string; duration: number } | null> = {
    1: null, 2: null, 3: null, 4: null, 5: null
  };

  setInterval(() => {
    const ticks: any[] = [];
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bangkokTime = new Date(utc + (3600000 * 7));
    const hour = bangkokTime.getHours();
    const nowIso = now.toISOString();

    const configs: Record<number, { minTemp: number; maxTemp: number; minHum: number; maxHum: number; maxLux: number }> = {
      1: { minTemp: 22.0, maxTemp: 30.5, minHum: 60.0, maxHum: 85.0, maxLux: 30000 },
      2: { minTemp: 21.5, maxTemp: 33.5, minHum: 50.0, maxHum: 80.0, maxLux: 35000 },
      3: { minTemp: 23.0, maxTemp: 27.5, minHum: 75.0, maxHum: 92.0, maxLux: 8000  },
      4: { minTemp: 22.0, maxTemp: 32.0, minHum: 55.0, maxHum: 82.0, maxLux: 28000 },
      5: { minTemp: 21.0, maxTemp: 28.5, minHum: 65.0, maxHum: 88.0, maxLux: 12000 }
    };
    
    for (let zone = 1; zone <= 5; zone++) {
      const cfg = configs[zone]!;
      
      // 1. คำนวณความเข้มแสงแดด (Lux) ตามเวลากลางวัน-กลางคืน (ระฆังคว่ำ)
      let baseLux = 0;
      if (hour >= 6 && hour <= 18) {
        const rad = Math.PI * (hour - 6) / 12;
        baseLux = Math.sin(rad) * cfg.maxLux;
      }

      // 2. คำนวณอุณหภูมิอากาศ (Temp) ต่ำสุด 05:00 และสูงสุด 14:00
      const tempCycle = Math.cos(2 * Math.PI * (hour - 14) / 24);
      let baseTemp = cfg.minTemp + ((tempCycle + 1) / 2) * (cfg.maxTemp - cfg.minTemp);

      // 3. คำนวณความชื้นสัมพัทธ์ (Hum) ผกผันกับอุณหภูมิ
      let baseHum = cfg.maxHum - ((baseTemp - cfg.minTemp) / (cfg.maxTemp - cfg.minTemp)) * (cfg.maxHum - cfg.minHum);

      // สุ่มเกิดเหตุการณ์ผิดปกติ 1.5% ในแต่ละรอบสำหรับการจำลองแบบ mock
      if (!mockAnomalies[zone] && Math.random() < 0.015) {
        const eventTypes = [
          { type: 'FAN_FAILURE', label: '🚨 พัดลมระบายอากาศขัดข้อง (อุณหภูมิพุ่งสูง)', duration: 36 },
          { type: 'MIST_SYSTEM_OFF', label: '💧 เครื่องพ่นหมอกหยุดทำงาน (ความชื้นต่ำมาก)', duration: 24 },
          { type: 'SUN_GLARE', label: '☀️ เมฆเปิดแดดจัดฉับพลัน (แสงแดดสูงเกิน)', duration: 18 },
          { type: 'DOOR_OPENED', label: '🚪 ประตูโรงเรือนถูกเปิดค้างไว้ (ความชื้นลด)', duration: 12 }
        ];
        let selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;
        if (zone === 3 && selectedEvent.type === 'FAN_FAILURE') {
          selectedEvent = eventTypes[1]!;
        }
        mockAnomalies[zone] = { type: selectedEvent.type, label: selectedEvent.label, duration: selectedEvent.duration };
        console.log(`\n[Simulation] เกิดเหตุการณ์ผิดปกติ: ${selectedEvent.label} ที่โซน ${zone}`);
      }

      let tempMod = 0;
      let humMod = 0;
      let luxMod = 0;

      const anomaly = mockAnomalies[zone];
      if (anomaly) {
        anomaly.duration--;
        if (anomaly.type === 'FAN_FAILURE') {
          tempMod = 4.5 + Math.random() * 1.5;
          humMod = -10 - Math.random() * 5;
        } else if (anomaly.type === 'MIST_SYSTEM_OFF') {
          humMod = -25 - Math.random() * 10;
          tempMod = 1.0 + Math.random() * 1.0;
        } else if (anomaly.type === 'SUN_GLARE') {
          luxMod = 12000 + Math.random() * 5000;
          tempMod = 2.0 + Math.random() * 1.0;
        } else if (anomaly.type === 'DOOR_OPENED') {
          humMod = -15 - Math.random() * 5;
          tempMod = 1.5 + Math.random() * 1.0;
        }

        if (anomaly.duration <= 0) {
          console.log(`\n[Simulation] เหตุการณ์คลี่คลาย: ${anomaly.label} ที่โซน ${zone} สิ้นสุดลง`);
          mockAnomalies[zone] = null;
        }
      }

      const finalTemp = parseFloat((baseTemp + tempMod + (Math.random() * 0.4 - 0.2)).toFixed(2));
      const finalHum = parseFloat(Math.max(5, Math.min(100, baseHum + humMod + (Math.random() * 2.0 - 1.0))).toFixed(2));
      const finalLux = Math.max(0, Math.round(baseLux + luxMod + (Math.random() * 1000 - 500)));

      const vpd = climateService.calculateVPD(finalTemp, finalHum);
      const ppfd = parseFloat((finalLux * 0.0299).toFixed(2));
      
      const tick = {
        id: -Date.now() - zone,
        created_at: nowIso,
        temperature: finalTemp,
        humidity: finalHum,
        vpd,
        lux: finalLux,
        ppfd,
        zone
      };
      
      ticks.push(tick);
      
      const buf = zoneBuffers[zone];
      if (buf) {
        buf.temperature.push(finalTemp);
        buf.humidity.push(finalHum);
        buf.lux.push(finalLux);
      }
    }
    
    dispatchSSETicks(ticks);
  }, 5000);
}

export class SensorController {
  // บอร์ดหรือเว็บเข้ามาเกาะท่อสตรีมมิ่งสด
  async stream(req: Request, res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.write('data: {"connected": true}\n\n');
    sseClients.push(res);
    
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
  }

  // ช่องทางรับค่ารายงานผ่าน HTTP POST สำหรับบอร์ด ESP32 จริง
  async reportData(req: Request, res: Response) {
    try {
      const { temperature, humidity, lux, zone, created_at, timestamp } = req.body;
      if (temperature === undefined || humidity === undefined || lux === undefined || zone === undefined) {
        return res.status(400).json({ success: false, error: 'ข้อมูล Temp, Hum, Lux และ Zone จำเป็นต้องมีให้ครบ' });
      }

      const zoneNum = parseInt(zone);
      const tempNum = parseFloat(temperature);
      const humNum = parseFloat(humidity);
      const luxNum = parseFloat(lux);
      
      const vpd = climateService.calculateVPD(tempNum, humNum);
      const ppfd = parseFloat((luxNum * 0.0299).toFixed(2));
      
      const customTime = created_at || timestamp;
      // หากมีเวลาส่งมา และห่างจากเวลาเซิร์ฟเวอร์เกิน 2 นาที (120,000 ms) จะถือเป็นประวัติย้อนหลัง (Data Recovery)
      const isHistorical = customTime && (Math.abs(Date.now() - new Date(customTime).getTime()) > 120000);
      
      if (isHistorical) {
        // ประวัติย้อนหลัง (ข้อมูลกู้คืนจาก SD card ตอนเน็ตหลุด)
        const tick = {
          temperature: tempNum,
          humidity: humNum,
          vpd,
          lux: luxNum,
          ppfd,
          zone: zoneNum,
          created_at: new Date(customTime).toISOString()
        };
        
        await climateService.addLog(tick);
        return res.json({ success: true, message: 'บันทึกข้อมูลย้อนหลังลงฐานข้อมูลเรียบร้อยแล้ว' });
      }

      // ข้อมูลเรียลไทม์ปกติ
      const tick = {
        id: Date.now() + zoneNum,
        created_at: customTime ? new Date(customTime).toISOString() : new Date().toISOString(),
        temperature: tempNum,
        humidity: humNum,
        vpd,
        lux: luxNum,
        ppfd,
        zone: zoneNum
      };

      // 1. ยิงขึ้นหน้าเว็บสด
      dispatchSSETicks([tick]);

      // 2. พักในบัฟเฟอร์เตรียมเฉลี่ย 5 นาที
      const buf = zoneBuffers[zoneNum];
      if (buf) {
        buf.temperature.push(tempNum);
        buf.humidity.push(humNum);
        buf.lux.push(luxNum);
      }

      // 3. ประเมินความเหมาะสมสภาพอากาศเพื่อแจ้งเตือนทาง Discord (เฉพาะการรายงานสดปกติเท่านั้น)
      evaluateAndTriggerAlert(zoneNum, tempNum, humNum, luxNum);

      res.json({ success: true, message: 'บันทึกเรียบร้อย' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async getLatest(req: Request, res: Response) {
    try {
      const zone = parseInt(req.query.zone as string) || 1;
      const latest = await climateService.getLatestData(zone);
      res.json({ success: true, isSimulationMode: useMock, data: latest });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async getLogs(req: Request, res: Response) {
    try {
      const zone = parseInt(req.query.zone as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await climateService.getLogs(zone, limit);
      res.json({ success: true, isSimulationMode: useMock, data: logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const zone = parseInt(req.query.zone as string) || 1;
      const startStr = req.query.start as string;
      const endStr = req.query.end as string;

      if (!startStr || !endStr) {
        return res.status(400).json({ success: false, error: 'จำเป็นต้องระบุวันเริ่มต้นและสิ้นสุด' });
      }

      const start = new Date(`${startStr}T00:00:00+07:00`);
      const end = new Date(`${endStr}T23:59:59.999+07:00`);

      const logs = await climateService.getLogsByDateRange(
        zone,
        start,
        end
      );

      res.json({ success: true, isSimulationMode: useMock, data: logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async getDiagnostics(req: Request, res: Response) {
    try {
      const zone = parseInt(req.query.zone as string) || 1;
      const latest = await climateService.getLatestData(zone);
      
      if (!latest) {
        return res.json({
          success: true,
          isSimulationMode: useMock,
          diagnostics: null,
          overall: climateService.getOverallEvaluation(null)
        });
      }

      const tempDiag = climateService.getDiagnosticStatus(latest.temperature, 'temp');
      const humDiag = climateService.getDiagnosticStatus(latest.humidity, 'hum');
      const vpdDiag = climateService.getDiagnosticStatus(latest.vpd, 'vpd');
      const ppfdDiag = climateService.getDiagnosticStatus(latest.ppfd, 'ppfd');
      const luxDiag = climateService.getDiagnosticStatus(latest.lux, 'lux');
      const overall = climateService.getOverallEvaluation(latest);

      res.json({
        success: true,
        isSimulationMode: useMock,
        diagnostics: {
          temp: tempDiag,
          hum: humDiag,
          vpd: vpdDiag,
          ppfd: ppfdDiag,
          lux: luxDiag
        },
        overall
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

export const sensorController = new SensorController();
