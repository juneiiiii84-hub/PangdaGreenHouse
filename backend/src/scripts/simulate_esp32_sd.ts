import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const REPORT_URL = `${BACKEND_URL}/api/sensors/report`;
const SD_CARD_FILE = path.join(process.cwd(), 'sdcard_logs.json');

let isOnline = true;
let lastSDLogTime = 0;
const SD_LOG_INTERVAL = 300000; // 5 นาที (300,000 มิลลิวินาที)

// ดึงข้อมูล Log ทั้งหมดจากไฟล์ SD Card จำลอง
function loadSDCardLogs(): any[] {
  if (!fs.existsSync(SD_CARD_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SD_CARD_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

// บันทึก Log ทั้งหมดลงในไฟล์ SD Card จำลอง
function saveSDCardLogs(logs: any[]) {
  // จำกัดไม่ให้ไฟล์บวมเกิน 1000 รายการย้อนหลัง
  const trimmed = logs.slice(-1000);
  fs.writeFileSync(SD_CARD_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

// ชื่อเรียกโซนเพื่อแสดงล็อกความสมจริง
const zoneNames: Record<number, string> = {
  1: 'โซน 1: โรงเรือนหลัก (กล้วยไม้/ไม้ดอก)',
  2: 'โซน 2: โรงเรือนชำ (ฝั่งพัดลม Exhaust)',
  3: 'โซน 3: ห้องเพาะชำเนื้อเยื่อ (Propagation)',
  4: 'โซน 4: ฝั่งทางเข้าโรงเรือนหลัก (Entrance)',
  5: 'โซน 5: พื้นที่กรองแสงพิเศษ (Shaded Area)'
};

// เก็บบันทึกเหตุการณ์ผิดปกติจำลอง
const zoneAnomalies: Record<number, { type: string; label: string; duration: number } | null> = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null
};

// จำลองการอ่านค่าสภาพอากาศจากเซ็นเซอร์ ESP32 ในแต่ละโซนตามคาบวันคืนและวิกฤตความปลอดภัย
function readSensors(zone: number) {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bangkokTime = new Date(utc + (3600000 * 7));
  const hour = bangkokTime.getHours();

  // กำหนดขอบเขตข้อมูลรายโซน
  const configs: Record<number, { minTemp: number; maxTemp: number; minHum: number; maxHum: number; maxLux: number }> = {
    1: { minTemp: 22.0, maxTemp: 30.5, minHum: 60.0, maxHum: 85.0, maxLux: 30000 }, // โซนหลัก
    2: { minTemp: 21.5, maxTemp: 33.5, minHum: 50.0, maxHum: 80.0, maxLux: 35000 }, // โซนพัดลมระบายอากาศ
    3: { minTemp: 23.0, maxTemp: 27.5, minHum: 75.0, maxHum: 92.0, maxLux: 8000  }, // โซนเพาะชำ
    4: { minTemp: 22.0, maxTemp: 32.0, minHum: 55.0, maxHum: 82.0, maxLux: 28000 }, // ฝั่งทางเข้า
    5: { minTemp: 21.0, maxTemp: 28.5, minHum: 65.0, maxHum: 88.0, maxLux: 12000 }  // โซนกรองแสง
  };

  const cfg = configs[zone] || configs[1]!;

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

  // --- ระบบสุ่มเกิดเหตุการณ์ผิดปกติ (Anomalies) ---
  // มีโอกาส 2% ในการเกิดภัยพิบัติจำลองในแต่ละรอบ
  if (!zoneAnomalies[zone] && Math.random() < 0.02) {
    const eventTypes = [
      { type: 'FAN_FAILURE', label: '🚨 พัดลมระบายอากาศขัดข้อง (อุณหภูมิพุ่งสูง)', duration: 30 }, // 2.5 นาที
      { type: 'MIST_SYSTEM_OFF', label: '💧 เครื่องพ่นหมอกหยุดทำงาน (ความชื้นต่ำวิกฤต)', duration: 24 }, // 2 นาที
      { type: 'SUN_GLARE', label: '☀️ เมฆเปิดแดดจัดแผดเผา (แสงแดดสูงเกินค่าปกติ)', duration: 18 }, // 1.5 นาที
      { type: 'DOOR_OPENED', label: '🚪 ประตูโรงเรือนเปิดทิ้งไว้ (ความชื้นหล่นฮวบ)', duration: 12 } // 1 นาที
    ];
    let selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;
    if (zone === 3 && selectedEvent.type === 'FAN_FAILURE') {
      selectedEvent = eventTypes[1]!; // สเปรย์ชำหยุดทำงานแทน
    }
    zoneAnomalies[zone] = { type: selectedEvent.type, label: selectedEvent.label, duration: selectedEvent.duration };
    console.log(`\n🔥 [เกิดเหตุการณ์ผิดปกติ] ${selectedEvent.label} ที่ ${zoneNames[zone]} (จะสิ้นสุดใน ${selectedEvent.duration * 5} วินาที)`);
  }

  let tempMod = 0;
  let humMod = 0;
  let luxMod = 0;

  const anomaly = zoneAnomalies[zone];
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
      console.log(`\n🌿 [เหตุการณ์คลี่คลาย] ${anomaly.label} ที่ ${zoneNames[zone]} ได้รับการแก้ไขกลับสู่สภาวะปกติแล้ว`);
      zoneAnomalies[zone] = null;
    }
  }

  const finalTemp = baseTemp + tempMod + (Math.random() * 0.4 - 0.2);
  const finalHum = Math.max(5, Math.min(100, baseHum + humMod + (Math.random() * 2.0 - 1.0)));
  const finalLux = Math.max(0, Math.round(baseLux + luxMod + (Math.random() * 1000 - 500)));

  return {
    temperature: parseFloat(finalTemp.toFixed(2)),
    humidity: parseFloat(finalHum.toFixed(2)),
    lux: finalLux,
    zone: zone,
    timestamp: new Date().toISOString()
  };
}

// ยิงข้อมูล HTTP POST ไปที่ API ของ Backend
async function sendReport(log: any): Promise<boolean> {
  try {
    const response = await fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: log.temperature,
        humidity: log.humidity,
        lux: log.lux,
        zone: log.zone,
        timestamp: log.timestamp
      })
    });

    if (response.ok) {
      const resData: any = await response.json();
      return resData.success;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// ดึงข้อมูลที่ไม่สำเร็จ (unsent) จาก SD card มายิงย้อนหลัง
async function recoverOfflineData() {
  const logs = loadSDCardLogs();
  const unsentLogs = logs.filter(log => log.status === 'unsent');

  if (unsentLogs.length === 0) {
    return;
  }

  console.log(`\n♻️  พบข้อมูลค้างใน SD card จำนวน ${unsentLogs.length} รายการ กำลังพยายามกู้คืนและส่งย้อนหลัง...`);

  let successCount = 0;
  for (const log of unsentLogs) {
    const success = await sendReport(log);
    if (success) {
      log.status = 'sent';
      successCount++;
    } else {
      console.log(`❌ ส่งข้อมูลย้อนหลังรอบเวลา ${log.timestamp} (โซน ${log.zone}) ล้มเหลว (ตรวจพบเซิร์ฟเวอร์ยังออฟไลน์อยู่)`);
      break;
    }
  }

  saveSDCardLogs(logs);

  if (successCount > 0) {
    console.log(`💾 กู้คืนข้อมูลส่งเข้าคลาวด์/DB สำเร็จ ${successCount}/${unsentLogs.length} รายการ และบันทึกสถานะการส่งแล้ว\n`);
  }
}

// ฟังก์ชันเริ่มต้นการทำงานของสคริปต์
async function main() {
  console.log('==================================================');
  console.log('🤖 เครื่องจำลองบอร์ด ESP32 (พร้อมการบันทึกค่าลง SD Card)');
  console.log(`📡 ส่งข้อมูลไปที่: ${REPORT_URL}`);
  console.log(`💾 ที่เก็บไฟล์ SD Card จำลอง: ${SD_CARD_FILE}`);
  console.log('==================================================');
  console.log('ควบคุมโปรแกรมจำลอง:');
  console.log('👉 พิมพ์ [d] แล้วกด Enter เพื่อจำลองสถานะ "เน็ตหลุด" (Disconnect)');
  console.log('👉 พิมพ์ [r] แล้วกด Enter เพื่อจำลองสถานะ "เน็ตใช้งานได้ปกติ" (Reconnect)');
  console.log('👉 พิมพ์ [q] แล้วกด Enter เพื่อออกจากโปรแกรมจำลอง');
  console.log('==================================================\n');

  // ตั้งค่า Listen คีย์บอร์ด
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', async (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      console.log('\n👋 ปิดเครื่องจำลอง ESP32...');
      process.exit();
    } else if (key.name === 'd') {
      if (isOnline) {
        isOnline = false;
        console.log('\n🔴 [เปลี่ยนโหมด] จำลองสถานะ: เน็ตหลุด (Disconnected) -> ข้อมูลทั้งหมดจะบันทึกใน SD card เท่านั้น');
      }
    } else if (key.name === 'r') {
      if (!isOnline) {
        isOnline = true;
        console.log('\n🟢 [เปลี่ยนโหมด] จำลองสถานะ: เชื่อมต่อสำเร็จ (Connected) -> เริ่มกู้คืนข้อมูลและส่งข้อมูลปกติ');
        await recoverOfflineData();
      }
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();
    if (cmd === 'q') {
      console.log('\n👋 ปิดเครื่องจำลอง ESP32...');
      process.exit();
    } else if (cmd === 'd') {
      if (isOnline) {
        isOnline = false;
        console.log('\n🔴 [เปลี่ยนโหมด] จำลองสถานะ: เน็ตหลุด (Disconnected) -> ข้อมูลทั้งหมดจะบันทึกใน SD card เท่านั้น');
      } else {
        console.log('\n⚠️  สถานะปัจจุบันเป็นเน็ตหลุดอยู่แล้ว');
      }
    } else if (cmd === 'r') {
      if (!isOnline) {
        isOnline = true;
        console.log('\n🟢 [เปลี่ยนโหมด] จำลองสถานะ: เชื่อมต่อสำเร็จ (Connected) -> เริ่มกู้คืนข้อมูลและส่งข้อมูลปกติ');
        await recoverOfflineData();
      } else {
        console.log('\n⚠️  สถานะปัจจุบันเชื่อมต่อปกติอยู่แล้ว');
      }
    }
  });

  // กู้คืนเมื่อโปรแกรมเปิดครั้งแรก (ถ้าออนไลน์)
  if (isOnline) {
    await recoverOfflineData();
  }

  // ลูปรันอัตโนมัติทุกๆ 5 วินาที
  setInterval(async () => {
    console.log(`\n🕒 [รอบการทำงาน: ${new Date().toLocaleTimeString()}] เริ่มอ่านค่าเซ็นเซอร์...`);

    const currentReadings: any[] = [];
    for (let zone = 1; zone <= 5; zone++) {
      currentReadings.push(readSensors(zone));
    }

    if (isOnline) {
      console.log(`🌐 กำลังพยายามส่งข้อมูลไปยังเซิร์ฟเวอร์แบบเรียลไทม์...`);
      let successCount = 0;

      for (const reading of currentReadings) {
        const success = await sendReport(reading);
        if (success) {
          successCount++;
        } else {
          console.log(`❌ ส่งข้อมูลโซน ${reading.zone} ล้มเหลว -> เปลี่ยนสถานะเป็น: เน็ตหลุด (Disconnected)`);
          isOnline = false;
          break;
        }
      }

      if (successCount > 0) {
        console.log(`🚀 [ONLINE] ส่งข้อมูลเรียลไทม์สำเร็จ ${successCount}/5 โซน (ไม่บันทึกข้อมูลสำรองลง SD card)`);
      }

      if (!isOnline) {
        // หากเน็ตหลุดระหว่างส่ง ให้เก็บข้อมูลของโซนที่เหลือรวมถึงตัวที่ล้มเหลวลงใน SD card ทุกๆ 5 นาที
        const now = Date.now();
        if (lastSDLogTime === 0 || now - lastSDLogTime >= SD_LOG_INTERVAL) {
          lastSDLogTime = now;
          const sdLogs = loadSDCardLogs();
          for (const r of currentReadings) {
            const alreadySent = currentReadings.indexOf(r) < successCount;
            if (!alreadySent) {
              sdLogs.push({ ...r, status: 'unsent' });
            }
          }
          saveSDCardLogs(sdLogs);
          console.log(`⚠️ บันทึกข้อมูลเฉพาะส่วนที่ค้างลง SD card เรียบร้อยแล้ว`);
        } else {
          console.log(`⚠️ ส่งข้อมูลไม่สำเร็จ (ข้ามการเซฟลง SD Card เนื่องจากยังไม่ครบ 5 นาที)`);
        }
      }
    } else {
      // โหมดออฟไลน์: พยายามส่งข้อมูลของโซนแรกเพื่อตรวจสอบว่าเน็ตกลับมาใช้งานได้หรือยัง
      console.log(`📡 [OFFLINE] กำลังตรวจสอบการเชื่อมต่อกับเซิร์ฟเวอร์...`);
      const testSuccess = await sendReport(currentReadings[0]);
      
      if (testSuccess) {
        console.log(`🟢 [การเชื่อมต่อกลับมาแล้ว] เริ่มกู้คืนข้อมูลและเปลี่ยนสถานะเป็น Online`);
        isOnline = true;
        await recoverOfflineData();
        
        // ส่งข้อมูลรอบปัจจุบันแบบเรียลไทม์ต่อเลย
        console.log(`🌐 กำลังพยายามส่งข้อมูลไปยังเซิร์ฟเวอร์แบบเรียลไทม์...`);
        let successCount = 0;
        for (const reading of currentReadings) {
          const success = await sendReport(reading);
          if (success) successCount++;
        }
        if (successCount > 0) {
          console.log(`🚀 [ONLINE] ส่งข้อมูลเรียลไทม์สำเร็จ ${successCount}/5 โซน`);
        }
      } else {
        // ยังคงออฟไลน์อยู่: บันทึกข้อมูลลง SD card ทุกๆ 5 นาที
        const now = Date.now();
        if (lastSDLogTime === 0 || now - lastSDLogTime >= SD_LOG_INTERVAL) {
          lastSDLogTime = now;
          const sdLogs = loadSDCardLogs();
          for (const reading of currentReadings) {
            sdLogs.push({ ...reading, status: 'unsent' });
          }
          saveSDCardLogs(sdLogs);
          console.log(`💾 [OFFLINE] บันทึกข้อมูลสภาพอากาศลง SD card แล้ว (สถานะ: unsent)`);
        } else {
          console.log(`💾 [OFFLINE] ข้ามการบันทึกลง SD Card เนื่องจากยังไม่ครบ 5 นาที`);
        }
      }
    }
  }, 5000);
}

main().catch(err => {
  console.error('Fatal error in simulator:', err);
});
