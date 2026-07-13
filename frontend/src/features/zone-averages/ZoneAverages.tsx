import React, { useState } from 'react';
import { Thermometer, Droplets, Wind, Sun, SunMedium, Moon, Info, X } from 'lucide-react';
import type { SensorData } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';
import { isDayTime, isNightTime } from '../../shared/utils/useTheme';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';

type AveragePeriod = 'all' | 'day' | 'night';

interface ZoneAveragesProps {
  dataList: SensorData[];
  theme: ThemePeriod;
  isInitialLoaded?: boolean;
}

interface DiagnosticResult {
  state: 'excellent' | 'good' | 'warning' | 'critical';
  status: string;
  color: string;
}

const getAverageDiagnostics = (
  key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux',
  value: number
): DiagnosticResult => {
  let roundedValue = value;
  if (key === 'temp' || key === 'hum' || key === 'ppfd') {
    roundedValue = Math.round(value * 10) / 10;
  } else if (key === 'vpd') {
    roundedValue = Math.round(value * 100) / 100;
  } else if (key === 'lux') {
    roundedValue = Math.round(value);
  }

  if (key === 'temp') {
    if (roundedValue >= 25 && roundedValue <= 30) return { state: 'excellent', status: 'เหมาะสมมาก', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if ((roundedValue >= 22 && roundedValue <= 24.9) || (roundedValue >= 30.1 && roundedValue <= 32)) return { state: 'good', status: 'เหมาะสม', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    if ((roundedValue >= 20 && roundedValue <= 21.9) || (roundedValue >= 32.1 && roundedValue <= 35)) return { state: 'warning', status: 'เฝ้าระวัง', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    return { state: 'critical', status: 'ไม่เหมาะสม', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  }
  if (key === 'hum') {
    if (roundedValue >= 60 && roundedValue <= 80) return { state: 'excellent', status: 'เหมาะสมมาก', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if ((roundedValue >= 50 && roundedValue <= 59.9) || (roundedValue >= 80.1 && roundedValue <= 85)) return { state: 'good', status: 'เหมาะสม', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    if ((roundedValue >= 40 && roundedValue <= 49.9) || (roundedValue >= 85.1 && roundedValue <= 90)) return { state: 'warning', status: 'เฝ้าระวัง', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    return { state: 'critical', status: 'ไม่เหมาะสม', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  }
  if (key === 'vpd') {
    if (roundedValue >= 0.4 && roundedValue <= 0.8) return { state: 'excellent', status: 'เหมาะสมมาก', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if ((roundedValue >= 0.3 && roundedValue <= 0.39) || (roundedValue >= 0.81 && roundedValue <= 1.2)) return { state: 'good', status: 'เหมาะสม', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    if ((roundedValue >= 0.2 && roundedValue <= 0.29) || (roundedValue >= 1.21 && roundedValue <= 1.6)) return { state: 'warning', status: 'เฝ้าระวัง', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    return { state: 'critical', status: 'ไม่เหมาะสม', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  }
  if (key === 'ppfd') {
    if (roundedValue >= 400 && roundedValue <= 800) return { state: 'excellent', status: 'เหมาะสมมาก', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if ((roundedValue >= 300 && roundedValue <= 399.9) || (roundedValue >= 800.1 && roundedValue <= 950)) return { state: 'good', status: 'เหมาะสม', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    if ((roundedValue >= 200 && roundedValue <= 299.9) || (roundedValue >= 950.1 && roundedValue <= 1100)) return { state: 'warning', status: 'เฝ้าระวัง', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    return { state: 'critical', status: 'ไม่เหมาะสม', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  }
  // LUX
  if (roundedValue >= 21600 && roundedValue <= 43200) return { state: 'excellent', status: 'เหมาะสมมาก', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  if ((roundedValue >= 16200 && roundedValue <= 21599) || (roundedValue >= 43201 && roundedValue <= 51350)) return { state: 'good', status: 'เหมาะสม', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
  if ((roundedValue >= 10800 && roundedValue <= 16199) || (roundedValue >= 51351 && roundedValue <= 59450)) return { state: 'warning', status: 'เฝ้าระวัง', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  return { state: 'critical', status: 'ไม่เหมาะสม', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
};

const getDynamicBorderColor = (state?: 'excellent' | 'good' | 'warning' | 'critical', theme?: 'night' | 'day') => {
  if (theme === 'night') return 'border-slate-200 dark:border-slate-800/80 shadow-none';
  switch (state) {
    case 'excellent': return 'border-emerald-500 shadow-emerald-500/5';
    case 'good': return 'border-blue-500 shadow-blue-500/5';
    case 'warning': return 'border-amber-500 shadow-amber-500/5';
    case 'critical': return 'border-rose-500 shadow-rose-500/5';
    default: return 'border-slate-200';
  }
};

const getDynamicIconBg = (state?: 'excellent' | 'good' | 'warning' | 'critical') => {
  switch (state) {
    case 'excellent': return 'bg-emerald-50 border-emerald-100 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    case 'good': return 'bg-blue-50 border-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    case 'warning': return 'bg-amber-50 border-amber-100 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    case 'critical': return 'bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    default: return 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800';
  }
};

const getDynamicValueColor = (state?: 'excellent' | 'good' | 'warning' | 'critical') => {
  switch (state) {
    case 'excellent': return 'text-emerald-600 dark:text-emerald-400';
    case 'good': return 'text-blue-600 dark:text-blue-400';
    case 'warning': return 'text-amber-600 dark:text-amber-400';
    case 'critical': return 'text-rose-600 dark:text-rose-400';
    default: return 'text-slate-700 dark:text-slate-200';
  }
};

const getGreenhouseSummary = (avg: any) => {
  if (!avg) return 'ขณะนี้ระบบยังไม่มีข้อมูลจากเซ็นเซอร์ในโรงเรือน';

  const temp = avg.temp;
  const hum = avg.humidity;
  const vpd = avg.vpd;
  const lux = avg.lux;

  // ตรวจสอบว่าอากาศและความชื้นอยู่ในเกณฑ์ปกติหรือไม่
  const isTempGood = temp >= 22 && temp <= 32;
  const isHumGood = hum >= 50 && hum <= 85;
  const isVpdGood = vpd >= 0.3 && vpd <= 1.2;
  const isAirAndHumidityGood = isTempGood && isHumGood && isVpdGood;

  // ตรวจสอบสถานะแสง
  const isLightLow = lux < 21600;
  const isLightHigh = lux > 43200;

  if (isAirAndHumidityGood) {
    if (isLightLow) {
      return 'เรื่องอากาศและระบบความชื้นดีอยู่แล้วไม่ต้องปรับอะไร แต่ต้องแก้เรื่อง "แสง" ทันที โดยการม้วนสแลนพรางแสงออกเพื่อให้แดดเข้ามากขึ้น หรือถ้าเป็นช่วงฟ้าปิดฝนตก ต้องเปิดไฟช่วยปลูก (Grow Light) เพื่อเพิ่มความเข้มแสง';
    } else if (isLightHigh) {
      return 'เรื่องอากาศและระบบความชื้นดีอยู่แล้วไม่ต้องปรับอะไร แต่ต้องแก้เรื่อง "แสง" ทันที เนื่องจากแดดจัดแสงจ้าเกินไป ควรดึงสแลนกรองแสงลงเพื่อปกป้องผิวใบพืชเสียหายจากความร้อนสะสม';
    } else {
      return 'ขณะนี้สภาพแวดล้อมโดยรวมในโรงเรือนเหมาะสมดีแล้ว ทั้งระบบอากาศ ความชื้น และแสงสว่างอยู่ในเกณฑ์ปกติ พืชสามารถเจริญเติบโตได้อย่างสมบูรณ์แบบโดยไม่ต้องปรับปรุงใดๆ ในเวลานี้';
    }
  } else {
    // ในกรณีที่อากาศหรือความชื้นเริ่มมีปัญหา
    let airIssues: string[] = [];
    if (temp > 32) airIssues.push('อุณหภูมิในโรงเรือนค่อนข้างร้อน');
    if (temp < 22) airIssues.push('อากาศค่อนข้างเย็น');
    if (hum > 85) airIssues.push('ความชื้นสัมพัทธ์สูงแฉะเกินเกณฑ์เสี่ยงเชื้อรา');
    if (hum < 50) airIssues.push('อากาศแห้งแล้งเกินไป');

    let lightIssues = '';
    if (isLightLow) {
      lightIssues = ' แต่ต้องแก้เรื่อง "แสง" ทันที โดยการม้วนสแลนพรางแสงออกเพื่อให้แดดเข้ามากขึ้น หรือถ้าเป็นช่วงฟ้าปิดฝนตก ต้องเปิดไฟช่วยปลูก (Grow Light) เพื่อเพิ่มความเข้มแสง';
    } else if (isLightHigh) {
      lightIssues = ' แต่ต้องแก้เรื่อง "แสง" ทันที เนื่องจากแดดจัดแสงจ้าเกินไป ควรดึงสแลนกรองแสงลงเพื่อปกป้องผิวใบพืช';
    } else {
      lightIssues = ' ส่วนระบบแสงอยู่ในเกณฑ์เหมาะสมแล้วไม่ต้องปรับเปลี่ยนอะไร';
    }

    const airSummary = airIssues.length > 0 ? `พบว่า${airIssues.join(' และ')}` : 'เรื่องอากาศและระบบความชื้นดีอยู่แล้ว';
    return `${airSummary}${lightIssues}`;
  }
};

const detailExplanations: Record<string, { title: string; description: string; unit: string; list: { status: string; color: string; range: string; effect: string }[] }> = {
  temp: {
    title: 'เกณฑ์ความเหมาะสมอุณหภูมิอากาศ',
    description: 'ระดับความร้อนเย็นในโรงเรือน ส่งผลโดยตรงต่อการระเหยน้ำและการเติบโตของยอดพืช',
    unit: '°C',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '25.0 — 30.0 °C', effect: 'ดีที่สุดต่อการเติบโตและการคายน้ำของใบพืช' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '22.0 — 24.9 °C หรือ 30.1 — 32.0 °C', effect: 'พืชสังเคราะห์แสงและทำงานได้ปกติไม่มีปัญหา' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '20.0 — 21.9 °C หรือ 32.1 — 35.0 °C', effect: 'อากาศเริ่มเย็นหรือร้อนเกินไป พืชอาจเติบโตช้าลงเล็กน้อย' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 20.0 °C หรือสูงกว่า 35.0 °C', effect: 'ร้อนจัดจนเหี่ยวเฉาใบไหม้ หรือเย็นจัดจนต้นพืชหยุดชะงัก' },
    ]
  },
  hum: {
    title: 'เกณฑ์ความเหมาะสมความชื้นสัมพัทธ์ (%RH)',
    description: 'ปริมาณไอน้ำในอากาศ ช่วยควบคุมการเปิดปากใบพืชเพื่อให้ดูดซึมปุ๋ยและสารอาหารได้อย่างราบรื่น',
    unit: '%RH',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '60.0 — 80.0 %RH', effect: 'ปากใบเปิดพอดี พืชดูดปุ๋ยและคายน้ำได้ดีที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '50.0 — 59.9 %RH หรือ 80.1 — 85.0 %RH', effect: 'ความชื้นปานกลาง พืชเจริญเติบโตได้ปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '40.0 — 49.9 %RH หรือ 85.1 — 90.0 %RH', effect: 'อากาศเริ่มแห้งทำให้คายน้ำเร็วเกินไป หรือชื้นเกินจนจำกัดการคายน้ำ' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 40.0 %RH หรือสูงกว่า 90.0 %RH', effect: 'ชื้นจัดจนเสี่ยงโรคราใบไม้ระบาด หรือแห้งจัดจนต้นพืชขาดน้ำ' },
    ]
  },
  vpd: {
    title: 'เกณฑ์ความเหมาะสมความต่างของความดันไอน้ำ (VPD)',
    description: 'ดัชนีวัดระดับความแห้งแล้งรอบใบพืช ช่วยระบุประสิทธิภาพการคายน้ำและการลำเลียงปุ๋ยขึ้นจากดิน',
    unit: 'kPa',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '0.40 — 0.80 kPa', effect: 'แรงดันไอน้ำดีเยี่ยม พืชลำเลียงน้ำและปุ๋ยขึ้นจากดินได้สูงที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '0.30 — 0.39 kPa หรือ 0.81 — 1.20 kPa', effect: 'พืชคายน้ำได้ปกติและลำเลียงอาหารไปเลี้ยงยอดได้สม่ำเสมอ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '0.20 — 0.29 kPa หรือ 1.21 — 1.60 kPa', effect: 'คายน้ำได้ช้าเพราะอากาศชื้นเกิน หรือคายน้ำเร็วเกินเพราะอากาศแห้ง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 0.20 kPa หรือสูงกว่า 1.60 kPa', effect: 'พืชจะปิดปากใบสนิท ทำให้ไม่สามารถดูดซึมปุ๋ยไปเลี้ยงต้นได้' },
    ]
  },
  ppfd: {
    title: 'เกณฑ์ความเหมาะสมค่าแสงที่พืชได้รับ (PPFD)',
    description: 'ความเข้มแสงแดดหรือไฟช่วยปลูกเฉพาะช่วงคลื่นแสงที่พืชสามารถนำไปใช้สังเคราะห์แสงเจริญเติบโตได้โดยตรง',
    unit: 'μmol/m²/s',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '400.0 — 800.0 μmol/m²/s', effect: 'ความเข้มแสงกำลังพอดี พืชสังเคราะห์อาหารและเติบโตได้เร็วที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '300.0 — 399.9 μmol/m²/s หรือ 800.1 — 950.0 μmol/m²/s', effect: 'ความเข้มแสงเพียงพอต่อการเจริญเติบโตได้อย่างแข็งแรงปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '200.0 — 299.9 μmol/m²/s หรือ 950.1 — 1100.0 μmol/m²/s', effect: 'แสงน้อยไปจนต้นพืชยืดหาแสง หรือแสงแดดแรงไปจนพืชเครียดสะสมความร้อน' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 200.0 μmol/m²/s หรือสูงกว่า 1100.0 μmol/m²/s', effect: 'มืดเกินไปจนไม่เติบโต หรือแดดแรงจัดเกินจนผิวใบแห้งไหม้เสียหาย' },
    ]
  },
  lux: {
    title: 'เกณฑ์ความเหมาะสมความส่องสว่าง (Lux)',
    description: 'ระดับความสว่างรวมรอบๆ เซนเซอร์ เพื่อประเมินความสว่างรวมในโรงเรือน',
    unit: 'Lux',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '21,600 — 43,200 Lux', effect: 'ความสว่างรอบข้างดีเลิศ พืชสังเคราะห์แสงได้สมบูรณ์' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '16,200 — 21,599 Lux หรือ 43,201 — 51,350 Lux', effect: 'ความสว่างอยู่ในระดับปกติ พืชเจริญเติบโตได้อย่างราบรื่น' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '10,800 — 16,199 Lux หรือ 51,351 — 59,450 Lux', effect: 'แสงสลัวพืชสังเคราะห์แสงได้ช้าลง หรือแดดเริ่มแรงขึ้นจนอุณหภูมิใบสูง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 10,800 Lux หรือสูงกว่า 59,450 Lux', effect: 'มืดเกินไปจนไม่เติบโต หรือแสงจ้าจัดแผดเผาจนผิวใบเสียหาย' },
    ]
  }
};

export const ZoneAverages: React.FC<ZoneAveragesProps> = ({ dataList, theme }) => {
  const [averagePeriod, setAveragePeriod] = useState<AveragePeriod>('all');
  const [activeDetailMetric, setActiveDetailMetric] = useState<'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux' | null>(null);

  // กรองข้อมูลตามช่วงเวลาที่เลือก (คำนวณเฉพาะโซนในร่ม A-D เท่านั้น ไม่นับโซน E ที่อยู่ด้านนอก)
  const getFilteredData = () => {
    const now = new Date().getTime();
    const activeData = dataList.filter(d => (now - new Date(d.created_at).getTime()) < 15 * 60 * 1000);
    const insideData = activeData.filter(d => [1, 2, 4, 5].includes(Number(d.zone)));
    switch (averagePeriod) {
      case 'day':
        return insideData.filter(d => isDayTime(d.created_at));
      case 'night':
        return insideData.filter(d => isNightTime(d.created_at));
      default:
        return insideData;
    }
  };

  const filteredData = getFilteredData();

  const getGreenhouseAverage = () => {
    if (averagePeriod === 'all') {
      const now = new Date().getTime();
      const activeLatestRecords: SensorData[] = [];
      const zones = [1, 2, 4, 5];

      zones.forEach(zoneId => {
        const zoneLogs = dataList.filter(d => Number(d.zone) === zoneId);
        const latest = zoneLogs.slice(-1)[0] || null;
        if (latest && (now - new Date(latest.created_at).getTime()) < 15 * 60 * 1000) {
          activeLatestRecords.push(latest);
        }
      });

      if (activeLatestRecords.length === 0) return null;

      const sumTemp = activeLatestRecords.reduce((s, d) => s + d.temperature, 0);
      const sumHum = activeLatestRecords.reduce((s, d) => s + d.humidity, 0);
      const sumVpd = activeLatestRecords.reduce((s, d) => s + d.vpd, 0);
      const sumPpfd = activeLatestRecords.reduce((s, d) => s + (d.lux * DEFAULT_MULTIPLIER), 0);
      const sumLux = activeLatestRecords.reduce((s, d) => s + d.lux, 0);
      const count = activeLatestRecords.length;

      return {
        temp: sumTemp / count,
        humidity: sumHum / count,
        vpd: sumVpd / count,
        ppfd: sumPpfd / count,
        lux: sumLux / count,
      };
    } else {
      if (filteredData.length === 0) return null;

      const sumTemp = filteredData.reduce((s, d) => s + d.temperature, 0);
      const sumHum = filteredData.reduce((s, d) => s + d.humidity, 0);
      const sumVpd = filteredData.reduce((s, d) => s + d.vpd, 0);
      const sumPpfd = filteredData.reduce((s, d) => s + (d.lux * DEFAULT_MULTIPLIER), 0);
      const sumLux = filteredData.reduce((s, d) => s + d.lux, 0);
      const count = filteredData.length;

      return {
        temp: sumTemp / count,
        humidity: sumHum / count,
        vpd: sumVpd / count,
        ppfd: sumPpfd / count,
        lux: sumLux / count,
      };
    }
  };

  const avg = getGreenhouseAverage();

  const periodLabel = averagePeriod === 'day' ? ' (กลางวัน 06:30-18:30)' : averagePeriod === 'night' ? ' (กลางคืน 18:30-06:30)' : '';

  const metricCards = [
    { 
      key: 'temp' as const,
      label: 'อุณหภูมิอากาศ', 
      value: avg ? `${avg.temp.toFixed(1)}` : '---', 
      rawVal: avg ? avg.temp : null,
      unit: '°C', 
      icon: <Thermometer size={18} />, 
    },
    { 
      key: 'hum' as const,
      label: 'ความชื้นสัมพัทธ์ (%RH)', 
      value: avg ? `${avg.humidity.toFixed(1)}` : '---', 
      rawVal: avg ? avg.humidity : null,
      unit: '%RH', 
      icon: <Droplets size={18} />, 
    },
    { 
      key: 'vpd' as const,
      label: 'ความต่างของความดันไอน้ำ (VPD)', 
      value: avg ? `${avg.vpd.toFixed(2)}` : '---', 
      rawVal: avg ? avg.vpd : null,
      unit: 'kPa', 
      icon: <Wind size={18} />, 
    },
    { 
      key: 'ppfd' as const,
      label: 'ค่าแสงที่พืชได้รับ (PPFD)', 
      value: avg ? `${avg.ppfd.toFixed(1)}` : '---', 
      rawVal: avg ? avg.ppfd : null,
      unit: 'μmol/m²/s', 
      icon: <Sun size={18} />, 
    },
    { 
      key: 'lux' as const,
      label: 'ความส่องสว่าง (LUX)', 
      value: avg ? `${Math.round(avg.lux).toLocaleString()}` : '---', 
      rawVal: avg ? avg.lux : null,
      unit: 'Lux', 
      icon: <Sun size={18} />, 
    },
  ];

  const displayAvg = avg;

  return (
    <section
      className="border rounded-[32px] p-5 shadow-xl space-y-5 card-dimensional theme-transition"
      style={{
        backgroundColor: 'var(--bg-section)',
        borderColor: 'var(--border-card)',
        boxShadow: `0 20px 60px ${theme === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.3)'}`,
      }}
    >
      {/* หัวข้อ + แถบเลือกช่วงเวลา */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            📊 ค่าเฉลี่ยรวมทั้งโรงเรือน
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            ค่าเฉลี่ยอากาศและแสงจากโซน A-D{periodLabel}
          </p>
        </div>

        {/* แถบเมนูเลือก กลางวัน / กลางคืน / ทั้งหมด */}
        <div
          className="flex p-1.5 rounded-2xl gap-1 w-full sm:w-auto"
          style={{ backgroundColor: 'var(--bg-control)' }}
        >
          <button
            onClick={() => setAveragePeriod('all')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer interaction-bounce ${
              averagePeriod === 'all'
                ? 'bg-emerald-500 text-white shadow-sm'
                : ''
            }`}
            style={averagePeriod !== 'all' ? { color: 'var(--text-muted)' } : undefined}
          >
            <span>ทั้งหมด</span>
          </button>
          <button
            onClick={() => setAveragePeriod('day')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer interaction-bounce ${
              averagePeriod === 'day'
                ? 'bg-amber-500 text-white shadow-sm'
                : ''
            }`}
            style={averagePeriod !== 'day' ? { color: 'var(--text-muted)' } : undefined}
          >
            <SunMedium size={13} />
            <span>กลางวัน</span>
          </button>
          <button
            onClick={() => setAveragePeriod('night')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer interaction-bounce ${
              averagePeriod === 'night'
                ? 'bg-indigo-500 text-white shadow-sm'
                : ''
            }`}
            style={averagePeriod !== 'night' ? { color: 'var(--text-muted)' } : undefined}
          >
            <Moon size={13} />
            <span>กลางคืน</span>
          </button>
        </div>
      </div>

      {/* การ์ดค่าเฉลี่ยรวม — แสดงเต็มความกว้างพร้อมสถานะประเมินและปุ่มข้อมูล */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map((m, idx) => {
          const isNight = theme === 'night';
          const diag = (isNight || m.rawVal === null) ? null : getAverageDiagnostics(m.key, m.rawVal);
          const badgeStatus = isNight ? 'ไม่มีการประเมิน' : (diag ? diag.status : 'รอข้อมูล...');
          
          const isCritical = !isNight && diag?.state === 'critical';
          const isWarning = !isNight && diag?.state === 'warning';
          const glowClass = isCritical ? 'glow-critical' : (isWarning ? 'glow-warning' : '');

          const badgeColor = isNight 
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800' 
            : (diag ? `${diag.color} ${glowClass}` : 'bg-slate-100 text-slate-400 border-slate-200');

          const cardBorderColor = isNight ? 'border-slate-200 dark:border-slate-800/80 shadow-none' : getDynamicBorderColor(diag?.state, theme);
          const valueColor = getDynamicValueColor(diag?.state);
          const iconBg = getDynamicIconBg(diag?.state);

          return (
            <div
              key={idx}
              className={`border-2 ${cardBorderColor} rounded-2xl p-4 flex flex-col justify-between space-y-3 card-dimensional theme-transition relative overflow-hidden`}
              style={{
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {/* หัวการ์ด: ไอคอน + สถานะประเมิน */}
              <div className="flex justify-between items-center z-10">
                <div className={`p-2 rounded-xl border ${iconBg}`}>
                  {m.icon}
                </div>
                <span className={`px-2 py-0.5 border rounded-full text-[9px] sm:text-[9.5px] md:text-[10px] font-black shrink-0 transition-colors whitespace-nowrap ${badgeColor}`}>
                  {badgeStatus}
                </span>
              </div>

              {/* ตัวเลข + ชื่อหัวข้อ + ปุ่มข้อมูล */}
              <div className="z-10">
                <div className="flex items-center mb-1.5 gap-1.5">
                  <span className="text-[11px] sm:text-[11.5px] md:text-[12px] font-black uppercase tracking-tight" style={{ color: 'var(--text-muted)' }}>
                    {m.label}
                  </span>
                  <button
                    onClick={() => setActiveDetailMetric(m.key)}
                    title="ดูคำอธิบายเกณฑ์ความเหมาะสม"
                    className={`p-1 rounded-md cursor-pointer transition-colors shrink-0 ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <Info size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
                <div className="flex flex-col items-start gap-1 font-mono tracking-tight leading-none">
                  <span className={`text-2xl md:text-3xl font-black ${valueColor}`}>{m.value}</span>
                  <span className="text-[10px] md:text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* คำอธิบายภาพรวมสภาพแวดล้อม */}
      {displayAvg ? (
        <div 
          className="border p-4.5 rounded-2xl space-y-2.5 theme-transition"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h4 className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            📢 ระบบประเมินสภาพแวดล้อมเฉลี่ยของโรงเรือน:
          </h4>
          <div className="text-xs md:text-sm font-semibold leading-relaxed space-y-1.5 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
            {getGreenhouseSummary(displayAvg)}
          </div>
        </div>
      ) : (
        <div 
          className="border p-4.5 rounded-2xl space-y-2.5 theme-transition text-center"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500 py-2">
            📭 ยังไม่มีข้อมูลบันทึกสำหรับช่วงเวลานี้ (เริ่มบันทึกข้อมูลเวลา 16:30 น. เป็นต้นไป)
          </div>
        </div>
      )}

      <p className="text-[10px] md:text-xs font-bold leading-normal mt-2" style={{ color: 'var(--text-muted)' }}>
        *หมายเหตุ: คำนวณจากโซนภายในโรงเรือน (A, B, C, D) โดยไม่นำโซน E มาร่วมคำนวณเนื่องจากเป็นพื้นที่เปรียบเทียบภายนอก
      </p>

      {/* หน้าต่างแสดงคำอธิบายเกณฑ์ประเมินอัจฉริยะ (ภาษาคนเข้าใจง่าย) */}
      {activeDetailMetric && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 border theme-transition"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5 items-center">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Info size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black" style={{ color: 'var(--text-primary)' }}>
                      {detailExplanations[activeDetailMetric].title}
                    </h3>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      ข้อมูลอ้างอิงตามเกณฑ์การประเมินความเหมาะสมในโรงเรือน
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDetailMetric(null)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* อธิบายความสำคัญ */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {detailExplanations[activeDetailMetric].description}
              </p>

              {/* รายการเกณฑ์ 4 ระดับ (ภาษาคน) */}
              <div className="space-y-2">
                {detailExplanations[activeDetailMetric].list.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <span className={`w-[82px] text-center py-1 rounded-full text-[10px] font-black border uppercase whitespace-nowrap flex-shrink-0 ${item.color}`}>
                        {item.status}
                      </span>
                      <span className="text-xs font-black font-mono flex flex-wrap items-center gap-1" style={{ color: 'var(--text-value)' }}>
                        {item.range.includes('หรือ') ? (
                          <>
                            {item.range.split('หรือ').map((part, pIdx, arr) => (
                              <React.Fragment key={pIdx}>
                                <span className="whitespace-nowrap">{part.trim()}</span>
                                {pIdx < arr.length - 1 && <span className="text-[10px] text-slate-500 font-medium px-0.5">หรือ</span>}
                              </React.Fragment>
                            ))}
                          </>
                        ) : (
                          <span className="whitespace-nowrap">{item.range}</span>
                        )}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium mt-1 sm:mt-0" style={{ color: 'var(--text-secondary)' }}>
                      {item.effect}
                    </span>
                  </div>
                ))}
              </div>

              {/* ปุ่มปิด */}
              <button
                onClick={() => setActiveDetailMetric(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>ปิดหน้าต่างนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
