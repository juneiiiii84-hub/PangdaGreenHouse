/*
 * ESP32 Sensor Logging & SD Card Auto Data Recovery
 * 
 * เฟิร์มแวร์สำหรับบอร์ด ESP32 เพื่อวัดค่าอุณหภูมิ, ความชื้น และแสงแดด (Lux)
 * โดยจะทำการส่งข้อมูลไปยัง Dashboard Backend API
 * หากตรวจพบเน็ตหลุด (Wi-Fi ขัดข้อง หรือเซิร์ฟเวอร์ออฟไลน์) จะบันทึกค่าเก็บไว้ใน SD Card ทันที (CSV format)
 * และเมื่อการเชื่อมต่อเครือข่ายกลับมาใช้งานได้ปกติ ระบบจะดึงข้อมูลที่ค้างอยู่ใน SD Card 
 * ส่งย้อนหลังกลับไปยังเซิร์ฟเวอร์โดยอัตโนมัติพร้อมเวลารายการดั้งเดิม (Time Recovery)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <SD.h>
#include <FS.h>
#include <time.h>

// ==================== CONFIGURATION ====================

// 1. การตั้งค่า Wi-Fi
const char* ssid = "RPFWIFI";          // เปลี่ยนเป็นชื่อ Wi-Fi ของคุณ
const char* password = "royalproject";  // เปลี่ยนเป็นรหัสผ่าน Wi-Fi ของคุณ

// 2. การตั้งค่า Backend Server (Render Cloud API)
const char* reportUrl = "https://pangdagreenhouse.onrender.com/api/sensors/report"; 

// 3. ตั้งค่าหมายเลข Zone ของโรงเรือน (1-5)
const int zoneId = 5;                         // ⚠️ เปลี่ยนเป็น 5 สำหรับ โซน A (บนขวา) ในหน้าเว็บ Vercel

// 4. พินเชื่อมต่อการ์ดรีดเดอร์ SD Card (พิน SPI มาตรฐาน ESP32)
#define SD_CS_PIN 5   // ขา Chip Select (CS) ต่อเข้า Pin 5 ของ ESP32

// 5. เปิดใช้งานการวัดเซ็นเซอร์จริง (DHT22 / BH1750) 
// หากยังไม่มีอุปกรณ์ต่อจริง ให้คอมเมนต์บรรทัดนี้ออก ระบบจะใช้ข้อมูลจำลอง (Mock Data) อัตโนมัติเพื่อตรวจสอบผลเทส
#define USE_REAL_SENSORS 

#ifdef USE_REAL_SENSORS
  #include <DHT.h>
  #include <Wire.h>
  #include <BH1750.h>
  
  #define DHTPIN 4        // ขาต่อเซ็นเซอร์ DHT22 (Pin 4)
  #define DHTTYPE DHT22   // ประเภทเซ็นเซอร์ DHT 22 (AM2302)
  DHT dht(DHTPIN, DHTTYPE);
  BH1750 lightMeter;
#endif

// =======================================================

// ข้อมูลสำหรับ NTP (Network Time Protocol) เพื่อซิงค์เวลากับอินเทอร์เน็ต
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; // เวลาประเทศไทย (GMT+7)
const int   daylightOffset_sec = 0;   // ประเทศไทยไม่มี Daylight Saving

unsigned long lastReadTime = 0;
const unsigned long readInterval = 5000; // รอบการอ่านค่าส่งทุกๆ 5 วินาที

unsigned long lastSDLogTime = 0;
const unsigned long sdLogInterval = 300000; // บันทึกลง SD Card ทุกๆ 5 นาทีเมื่อออฟไลน์ (300,000 ms)

// ซิงค์เวลาจากอินเทอร์เน็ตผ่าน NTP
void syncTimeNTP() {
  Serial.println("🕒 ซิงค์เวลาจาก NTP Server...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  struct tm timeinfo;
  int retry = 0;
  while(!getLocalTime(&timeinfo) && retry < 10) {
    Serial.print(".");
    delay(500);
    retry++;
  }
  
  if(getLocalTime(&timeinfo)) {
    Serial.println("\n✅ ซิงค์เวลากับดาวเทียมสำเร็จ!");
    char timeStr[50];
    strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);
    Serial.printf("⏰ เวลาปัจจุบันบนบอร์ด: %s\n", timeStr);
  } else {
    Serial.println("\n❌ ไม่สามารถดึงเวลาจาก NTP ได้ (อาจใช้นาฬิกาเริ่มต้นของบอร์ด)");
  }
}

// สร้าง ISO 8601 Timestamp (YYYY-MM-DDTHH:MM:SS.000Z)
String getISOTimeString() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    // หากดึงเวลาไม่ได้ จะใช้เวลาแบบจำลองชั่วคราว
    return "";
  }
  char timeStringBuff[50];
  // รูปแบบ ISO8601 พร้อม Offset +07:00 สำหรับเวลาประเทศไทย
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S+07:00", &timeinfo);
  return String(timeStringBuff);
}

// เริ่มต้นใช้งาน SD Card
bool initSDCard() {
  Serial.print("💾 กำลังติดตั้ง SD Card...");
  if(!SD.begin(SD_CS_PIN)){
    Serial.println("ล้มเหลว!");
    return false;
  }
  uint8_t cardType = SD.cardType();
  if(cardType == CARD_NONE){
    Serial.println("ตรวจพบการ์ดหลวม หรือไม่มีการเชื่อมต่อ SD card");
    return false;
  }
  Serial.println("สำเร็จ!");
  return true;
}

// บันทึกข้อมูลค้างลงในไฟล์ SD card เมื่อออฟไลน์
void logDataToSD(String timestamp, float temp, float hum, int lux, int zone) {
  // เปิดไฟล์แบบเขียนต่อท้าย (APPEND)
  File file = SD.open("/offline_logs.csv", FILE_APPEND);
  if(!file){
    Serial.println("❌ ไม่สามารถเปิดไฟล์บน SD card เพื่อเขียนได้");
    return;
  }
  
  // บันทึกโครงสร้าง CSV: timestamp,temp,hum,lux,zone
  file.print(timestamp);
  file.print(",");
  file.print(temp, 2);
  file.print(",");
  file.print(hum, 2);
  file.print(",");
  file.print(lux);
  file.print(",");
  file.println(zone);
  file.close();
  
  Serial.printf("💾 [SD Card] บันทึกข้อมูลออฟไลน์รอบเวลา %s ลงการ์ดสำเร็จ\n", timestamp.c_str());
}

// ยิงข้อมูล HTTP POST ไปยัง Backend
bool sendReport(String timestamp, float temp, float hum, int lux, int zone) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  WiFiClientSecure client;
  client.setInsecure(); // ข้ามการตรวจสอบ SSL เพื่อให้ส่งข้อมูลผ่าน HTTPS (Render) ได้สำเร็จ
  
  HTTPClient http;
  http.begin(client, reportUrl);
  http.addHeader("Content-Type", "application/json");
  
  // สร้าง Payload เป็น JSON String
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temp, 2) + ",";
  jsonPayload += "\"humidity\":" + String(hum, 2) + ",";
  jsonPayload += "\"lux\":" + String(lux) + ",";
  jsonPayload += "\"zone\":" + String(zone);
  if (timestamp.length() > 0) {
    jsonPayload += ",\"timestamp\":\"" + timestamp + "\"";
  }
  jsonPayload += "}";
  
  int httpResponseCode = http.POST(jsonPayload);
  bool success = false;
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    // ค้นหาข้อความ "success":true ในผลตอบกลับ
    if (response.indexOf("\"success\":true") != -1) {
      success = true;
    } else {
      Serial.printf("⚠️ เซิร์ฟเวอร์ส่งข้อความปฏิเสธ: %s\n", response.c_str());
    }
  } else {
    Serial.printf("⚠️ ส่ง HTTP POST ล้มเหลว, รหัสข้อผิดพลาด: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
  return success;
}

// ฟังก์ชันกู้คืนข้อมูลและอัปโหลดประวัติจาก SD card ย้อนหลังเมื่อออนไลน์
void recoverOfflineData() {
  if (!SD.exists("/offline_logs.csv")) {
    return; // ไม่มีไฟล์ข้อมูลค้าง
  }
  
  File logFile = SD.open("/offline_logs.csv", FILE_READ);
  if (!logFile) {
    Serial.println("❌ ไม่สามารถเปิดไฟล์ /offline_logs.csv เพื่อกู้คืนได้");
    return;
  }
  
  // เปิดไฟล์ชั่วคราวเพื่อเก็บรายการที่ยังส่งไม่สำเร็จ (ถ้าเน็ตเกิดหลุดกลางคันระหว่างส่ง)
  File tempFile = SD.open("/temp_logs.csv", FILE_WRITE);
  if (!tempFile) {
    Serial.println("❌ ไม่สามารถเปิดไฟล์สำรองชั่วคราวเพื่อเขียนได้");
    logFile.close();
    return;
  }
  
  Serial.println("\n♻️  ตรวจพบข้อมูลสภาพอากาศค้างส่งใน SD Card! เริ่มการกู้คืนข้อมูล...");
  bool stopSending = false;
  int successCount = 0;
  int totalCount = 0;
  
  while (logFile.available()) {
    String line = logFile.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    
    totalCount++;
    
    // หากเกิดเน็ตหลุดอีกครั้งระหว่างทยอยส่ง ให้บันทึกบรรทัดที่เหลือเก็บลงไฟล์ชั่วคราวทันที
    if (stopSending) {
      tempFile.println(line);
      continue;
    }
    
    // แปลงบรรทัด CSV
    int comma1 = line.indexOf(',');
    int comma2 = line.indexOf(',', comma1 + 1);
    int comma3 = line.indexOf(',', comma2 + 1);
    int comma4 = line.indexOf(',', comma3 + 1);
    
    if (comma1 == -1 || comma2 == -1 || comma3 == -1 || comma4 == -1) {
      continue; // รูปแบบข้อมูลบรรทัดนั้นเสีย ข้ามไป
    }
    
    String timestamp = line.substring(0, comma1);
    float temp = line.substring(comma1 + 1, comma2).toFloat();
    float hum = line.substring(comma2 + 1, comma3).toFloat();
    int lux = line.substring(comma3 + 1, comma4).toInt();
    int zone = line.substring(comma4 + 1).toInt();
    
    // ทดลองส่งข้อมูลย้อนหลังพร้อมเวลากำกับเดิม
    bool success = sendReport(timestamp, temp, hum, lux, zone);
    if (success) {
      successCount++;
      Serial.printf("   [+] ส่งประวัติย้อนหลังสำเร็จ: %s (โซน %d)\n", timestamp.c_str(), zone);
      delay(200); // ดีเลย์สั้นๆ เพื่อให้เซิร์ฟเวอร์ทยอยบันทึกได้สบาย
    } else {
      Serial.println("   [!] ตรวจพบการส่งสะดุดล้มเหลวระหว่างกู้คืน หยุดทำการส่งชุดที่เหลือ");
      stopSending = true;
      tempFile.println(line); // บันทึกเก็บไว้อีกรอบ
    }
  }
  
  logFile.close();
  tempFile.close();
  
  // ลบไฟล์เดิมทิ้งเพื่อไม่ให้ซ้ำซ้อน
  SD.remove("/offline_logs.csv");
  
  // ตรวจสอบว่าในไฟล์ชั่วคราวยังมีรายการที่ส่งไม่ผ่านหลงเหลืออยู่ไหม
  File checkTemp = SD.open("/temp_logs.csv", FILE_READ);
  bool hasUnsent = checkTemp.available();
  checkTemp.close();
  
  if (hasUnsent) {
    // เปลี่ยนชื่อไฟล์ชั่วคราวกลับมาเป็นคิวเดิม รอเน็ตดีรอบหน้า
    SD.rename("/temp_logs.csv", "/offline_logs.csv");
    Serial.println("⚠️ มีข้อมูลบางส่วนที่ส่งไม่สำเร็จ ได้บันทึกค้างไว้ใน SD card รอการลองครั้งถัดไป");
  } else {
    // ส่งหมดเกลี้ยง ลบไฟล์ชั่วคราวทิ้ง
    SD.remove("/temp_logs.csv");
    Serial.println("🎉 กู้คืนและส่งประวัติย้อนหลังเสร็จสิ้นเรียบร้อย ข้อมูลใน SD Card เคลียร์สะอาดแล้ว!");
  }
  
  Serial.printf("📊 สรุปผลการกู้คืน: ส่งผ่าน %d จากทั้งหมด %d รายการ\n\n", successCount, totalCount);
}

// อ่านค่าจำลองอุณหภูมิ
float getTemperature() {
  #ifdef USE_REAL_SENSORS
    float t = dht.readTemperature();
    if (isnan(t)) return 28.0; // หากเซ็นเซอร์เสีย ให้ใช้ค่าเริ่มต้น
    return t;
  #else
    // สุ่มข้อมูลจำลองช่วง 25 - 29 องศาเซลเซียส
    return 25.0 + (random(0, 400) / 100.0);
  #endif
}

// อ่านค่าจำลองความชื้น
float getHumidity() {
  #ifdef USE_REAL_SENSORS
    float h = dht.readHumidity();
    if (isnan(h)) return 70.0;
    return h;
  #else
    // สุ่มความชื้นช่วง 60% - 75%
    return 60.0 + (random(0, 1500) / 100.0);
  #endif
}

// ฟังก์ชัน Calibrate ค่าแสง BH1750 เพื่อปรับค่าให้เท่ากับเครื่องวัดมาตรฐาน
float calibrateLux(float rawLux) {
  // คำนวณแบบสมการเส้นตรง 3 ช่วง (3-Segment Piecewise Linear Calibration) เพื่อให้ตรงกับจุดทดสอบจริงทั้ง 4 จุด:
  // 1) แสงน้อย (< 432 Lux ดิบ): จูนจาก 16.4 Lux (ดิบ 31) ถึง 613.8 Lux (ดิบ 432)
  // 2) แสงปานกลาง (432 ถึง 473 Lux ดิบ): จูนจาก 613.8 Lux (ดิบ 432) ถึง 700.4 Lux (ดิบ 472.95)
  // 3) แสงจัด (>= 473 Lux ดิบ): จูนจาก 700.4 Lux (ดิบ 472.95) ถึง 1047.8 Lux (ดิบ 874.15)
  if (rawLux < 432.0) {
    float calibrated = (1.49 * rawLux) - 29.78;
    if (calibrated < 0.0) {
      calibrated = 0.0; // ป้องกันค่าติดลบในที่มืดสนิท
    }
    return calibrated;
  } 
  else if (rawLux < 472.95) {
    return 2.1148 * (rawLux - 432.0) + 613.8;
  } 
  else if (rawLux < 1964.58) {
    return 1.46155 * (rawLux - 472.95) + 700.4;
  }
  else if (rawLux < 13823.13) {
    // ปรับสเกลช่วงแดดจ้าปกติ: จูนจาก 2,880.5 Lux (ดิบ 1,964.58) ไปยัง 23,808.0 Lux (ดิบ 13,823.13)
    // Slope = (23808.0 - 2880.5) / (13823.13 - 1964.58) = 1.76476
    return 1.76476 * (rawLux - 1964.58) + 2880.5;
  }
  else {
    // ปรับสเกลช่วงแดดแรงสูงสุด: จูนจาก 23,808.0 Lux (ดิบ 13,823.13) ไปยัง 36,983.0 Lux (ดิบ 20,384.25)
    // Slope = (36983.0 - 23808.0) / (20384.25 - 13823.13) = 2.008
    return 2.008 * (rawLux - 13823.13) + 23808.0;
  }
}

// อ่านค่าจำลองแสงแดด
int getLux() {
  #ifdef USE_REAL_SENSORS
    float raw = lightMeter.readLightLevel();
    if (raw < 0) return 0;
    return (int)calibrateLux(raw);
  #else
    // สุ่มค่าแสง 15,000 - 25,000 Lux
    return 15000 + random(0, 10000);
  #endif
}

// ==================== MAIN SETUP & LOOP ====================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("🎬 เริ่มต้นระบบบอร์ด ESP32 Logging & Recovery");
  Serial.println("=============================================");
  
  // ติดตั้ง SD Card
  if (!initSDCard()) {
    Serial.println("⚠️ ระบบรันต่อโดยไม่มี SD card (หากเน็ตหลุดข้อมูลจะไม่ถูกบันทึกสำรอง!)");
  }
  
  // ติดตั้งเซ็นเซอร์จริง (ถ้าเปิดใช้งาน)
  #ifdef USE_REAL_SENSORS
    Serial.println("🔌 เริ่มต้นติดตั้งอุปกรณ์เซ็นเซอร์จริง...");
    dht.begin();
    Wire.begin();
    // ลองเปิดใช้งานเซ็นเซอร์ที่ Address 0x23 (ค่าเริ่มต้นเมื่อ ADDR ต่อ GND หรือปล่อยว่างในบางรุ่น)
    if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23)) {
      Serial.println("✅ เซ็นเซอร์แสง BH1750 พร้อมใช้งาน (Address: 0x23)");
    } 
    // หากไม่สำเร็จ ให้ลองใช้ Address 0x5C (กรณีมีตัวต้านทาน Pull-up ดึงขา ADDR ขึ้นอัตโนมัติ)
    else if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C)) {
      Serial.println("✅ เซ็นเซอร์แสง BH1750 พร้อมใช้งาน (Address: 0x5C)");
    } else {
      Serial.println("❌ เซ็นเซอร์แสง BH1750 ติดตั้งล้มเหลว");
    }
  #endif

  // เชื่อมต่อ Wi-Fi
  Serial.printf("🌐 กำลังเชื่อมต่อ Wi-Fi: %s ", ssid);
  WiFi.begin(ssid, password);
  
  int wifiRetry = 0;
  while (WiFi.status() != WL_CONNECTED && wifiRetry < 20) {
    delay(500);
    Serial.print(".");
    wifiRetry++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ เชื่อมต่อ Wi-Fi สำเร็จ!");
    Serial.print("📶 IP Address บอร์ด ESP32: ");
    Serial.println(WiFi.localIP());
    
    // ตั้งค่าเวลาเครื่องบอร์ดหลังต่อเน็ตผ่าน NTP
    syncTimeNTP();
  } else {
    Serial.println("\n❌ เชื่อมต่อ Wi-Fi ล้มเหลว (ระบบจะทำงานในโหมด Offline และบันทึกค่าลง SD Card จนกว่าจะต่อ Wi-Fi สำเร็จ)");
  }
}

void loop() {
  // สลับการต่อเน็ตและกู้คืนข้อมูลออฟไลน์แบบอัตโนมัติเมื่อตรวจพบการต่อ Wi-Fi สำเร็จ
  static bool wasOffline = true;
  
  if (WiFi.status() == WL_CONNECTED) {
    if (wasOffline) {
      Serial.println("\n🟢 ระบบตรวจพบ Wi-Fi กลับมาต่อได้แล้ว!");
      syncTimeNTP(); // ซิงค์เวลารอบใหม่เพื่อป้องกันเวลาเพี้ยน
      recoverOfflineData(); // ดึงข้อมูลค้างย้อนหลังจาก SD Card ส่งขึ้นเซิร์ฟเวอร์
      wasOffline = false;
    }
  } else {
    if (!wasOffline) {
      Serial.println("\n🔴 [คำเตือน] ตรวจพบสายเน็ต / Wi-Fi หลุดการเชื่อมต่อ!");
      wasOffline = true;
    }
  }
  
  // รันตรวจสอบการอ่านค่าตามรอบเวลา (interval)
  if (millis() - lastReadTime >= readInterval) {
    lastReadTime = millis();
    
    float temperature = getTemperature();
    float humidity = getHumidity();
    int lux = getLux();
    String currentTimestamp = getISOTimeString();
    
    float ppfd = lux * 0.0299; // ใช้ตัวคูณ 0.0299 เพื่อปรับแต่งค่าให้ตรงตามสเปกตรัมแสงมาตรฐาน (เช่น หลอดไฟพืชหรือการกรองแสงในโรงเรือน)
    Serial.printf("\n📊 [วัดค่าได้] Temp: %.2fC | Hum: %.2f%% | Lux: %d | PPFD: %.2f umol/m2/s | Time: %s\n", 
                  temperature, humidity, lux, ppfd, currentTimestamp.c_str());
                  
    // ยิงส่งแบบเรียลไทม์ปกติ
    bool sendSuccess = false;
    if (WiFi.status() == WL_CONNECTED) {
      sendSuccess = sendReport(currentTimestamp, temperature, humidity, lux, zoneId);
    }
    
    if (sendSuccess) {
      Serial.println("🚀 [ONLINE] ส่งข้อมูลเข้า Database สดสำเร็จ");
    } else {
      // หากส่งไม่ผ่านไม่ว่าจะด้วย Wi-Fi หลุด หรือเซิร์ฟเวอร์หลักดับ 
      // จะทำการเซฟสำรองลง SD card ทุกๆ 5 นาที (300,000 ms) เพื่อถนอมอายุการใช้งาน SD Card
      if (lastSDLogTime == 0 || millis() - lastSDLogTime >= sdLogInterval) {
        lastSDLogTime = millis();
        Serial.println("⚠️ ส่งข้อมูลไม่สำเร็จ! ทำการเซฟสำรองลง SD card...");
        logDataToSD(currentTimestamp, temperature, humidity, lux, zoneId);
      } else {
        Serial.println("💾 [OFFLINE] ข้ามการบันทึกลง SD Card เนื่องจากยังไม่ครบ 5 นาที");
      }
    }
  }
}
