import type { Request, Response } from 'express';
import { SupabaseRepository } from '../repositories/supabase.repository.js';
import { MockRepository } from '../repositories/mock.repository.js';
import { ClimateService } from '../services/climate.service.js';
import type { DiagnosticResult, OverallEvaluation } from '../services/climate.service.js';
import type { SensorData } from '../repositories/sensor.repository.interface.js';

// ตรวจหาค่าความต้องการโหมดจำลองพารามิเตอร์
const useMock = !process.env.SUPABASE_URL || 
                !process.env.SUPABASE_ANON_KEY || 
                process.env.USE_MOCK !== 'false';

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
      const ppfd = parseFloat((avgLux * 0.0185).toFixed(2));
      
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
  
  const simulatorState: Record<number, { temp: number; hum: number; lux: number }> = {
    1: { temp: 26, hum: 75, lux: 22000 },
    2: { temp: 32, hum: 52, lux: 38000 },
    3: { temp: 21, hum: 85, lux: 12000 },
    4: { temp: 27, hum: 68, lux: 24324 },
    5: { temp: 30, hum: 60, lux: 48000 }
  };

  setInterval(() => {
    const ticks: any[] = [];
    const nowIso = new Date().toISOString();
    
    for (let zone = 1; zone <= 5; zone++) {
      const state = simulatorState[zone]!;
      const tempChange = (Math.random() * 0.4 - 0.2);
      const humChange = (Math.random() * 2 - 1);
      
      state.temp = parseFloat((state.temp + tempChange).toFixed(2));
      state.hum = parseFloat(Math.min(100, Math.max(10, state.hum + humChange)).toFixed(2));
      
      const luxChange = Math.round(Math.random() * 600 - 300);
      state.lux = Math.max(0, Math.round(state.lux + luxChange));
      
      const vpd = climateService.calculateVPD(state.temp, state.hum);
      const ppfd = parseFloat((state.lux * 0.0185).toFixed(2));
      
      const tick = {
        id: -Date.now() - zone,
        created_at: nowIso,
        temperature: state.temp,
        humidity: state.hum,
        vpd,
        lux: state.lux,
        ppfd,
        zone
      };
      
      ticks.push(tick);
      
      // ส่งข้อมูลดิบเข้าแรมเพื่อเตรียมบันทึก 5 นาที
      const buf = zoneBuffers[zone];
      if (buf) {
        buf.temperature.push(state.temp);
        buf.humidity.push(state.hum);
        buf.lux.push(state.lux);
      }
    }
    
    // ยิงสตรีมมิ่งสด
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
      const { temperature, humidity, lux, zone } = req.body;
      if (temperature === undefined || humidity === undefined || lux === undefined || zone === undefined) {
        return res.status(400).json({ success: false, error: 'ข้อมูล Temp, Hum, Lux และ Zone จำเป็นต้องมีให้ครบ' });
      }

      const zoneNum = parseInt(zone);
      const tempNum = parseFloat(temperature);
      const humNum = parseFloat(humidity);
      const luxNum = parseFloat(lux);
      
      const vpd = climateService.calculateVPD(tempNum, humNum);
      const ppfd = parseFloat((luxNum * 0.0185).toFixed(2));
      
      const tick = {
        id: Date.now() + zoneNum,
        created_at: new Date().toISOString(),
        temperature: tempNum,
        humidity: humNum,
        vpd,
        lux: luxNum,
        ppfd,
        zone: zoneNum
      };

      // 1. ยิงขึ้นบอร์ดสด
      dispatchSSETicks([tick]);

      // 2. พักในบัฟเฟอร์เตรียมเฉลี่ย 5 นาที
      const buf = zoneBuffers[zoneNum];
      if (buf) {
        buf.temperature.push(tempNum);
        buf.humidity.push(humNum);
        buf.lux.push(luxNum);
      }

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

      const start = new Date(startStr);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endStr);
      end.setUTCHours(23, 59, 59, 999);

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
      const overall = climateService.getOverallEvaluation(latest);

      res.json({
        success: true,
        isSimulationMode: useMock,
        diagnostics: {
          temp: tempDiag,
          hum: humDiag,
          vpd: vpdDiag,
          ppfd: ppfdDiag
        },
        overall
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

export const sensorController = new SensorController();
