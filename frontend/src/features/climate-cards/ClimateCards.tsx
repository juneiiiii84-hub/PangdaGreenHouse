import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info, X } from 'lucide-react';
import { PpfdModal } from './PpfdModal';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { SensorData, DiagnosticsResponse } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';

const simplifyRecommendation = (text: string): string => {
  if (!text) return 'กำลังวิเคราะห์...';

  // อุณหภูมิ
  if (text.includes('รักษาเสถียรภาพความร้อน')) return '✅ อุณหภูมิเหมาะสม ดีต่อการเติบโต คุมระดับนี้ต่อไป';
  if (text.includes('ไม่ให้อุณหภูมิผันผวน')) return '👍 อุณหภูมิปกติ ควรสังเกตไม่ให้ผันผวนเร็วเกินไป';
  if (text.includes('อุณหภูมิค่อนข้างสูง')) return '⚠️ อากาศร้อนขึ้น: เปิดพัดลมระบายอากาศหรือเพิ่มการไหลเวียนของลม';
  if (text.includes('อุณหภูมิค่อนข้างต่ำ')) return '⚠️ อากาศเย็นลง: ลดระดับพัดลมระบายอากาศเพื่อสะสมความร้อน';
  if (text.includes('อุณหภูมิสูงเกินไป')) return '🚨 ร้อนจัดวิกฤต: เปิดพัดลมระบายอากาศ พ่นหมอกน้ำ และกางสแลนกรองแสง';
  if (text.includes('อุณหภูมิต่ำเกินไป')) return '🚨 หนาวจัดวิกฤต: ปิดพัดลมระบายอากาศ หรือเปิดเครื่องทำความร้อน';

  // ความชื้น
  if (text.includes('เหมาะสมกับการเปิดปากใบดูดซึม')) return '✅ ความชื้นพอดี: พืชเปิดปากใบรับปุ๋ยได้ดี รักษาค่านี้ไว้';
  if (text.includes('ไม่ให้อิ่มตัวในช่วงกลางคืน')) return '👍 ความชื้นปกติ: ระวังไม่ให้ชื้นสะสมสูงเกินไปในช่วงกลางคืน';
  if (text.includes('ความชื้นสูงเกินเกณฑ์')) return '⚠️ เริ่มชื้นไป: เปิดพัดลมหมุนเวียนเพื่อลดความอับชื้นสะสม';
  if (text.includes('ความชื้นต่ำเกินเกณฑ์')) return '⚠️ เริ่มแห้งไป: เปิดระบบพ่นหมอกน้ำเป็นรอบสั้นๆ เพื่อเพิ่มความชื้น';
  if (text.includes('ความชื้นสูงวิกฤต')) return '🚨 ชื้นจัดวิกฤต: เสี่ยงราใบไม้ เปิดพัดลมระบายลม 100% และหยุดให้น้ำ';
  if (text.includes('ความชื้นต่ำวิกฤต')) return '🚨 แห้งจัดวิกฤต: พืชเสี่ยงเฉา เปิดเครื่องพ่นหมอกเต็มกำลังด่วน';

  // VPD
  if (text.includes('ระดับแรงดันไอดีเลิศ')) return '✅ VPD ดีเลิศ: พืชลำเลียงน้ำและอาหารได้เต็มประสิทธิภาพ';
  if (text.includes('ประคองระดับค่ากระบอกไอ')) return '👍 VPD ปกติ: ตรวจสอบอุณหภูมิและความชื้นสม่ำเสมอ';
  if (text.includes('VPD ค่อนข้างสูง')) return '⚠️ อากาศแห้ง (VPD สูง): พ่นหมอกน้ำฝอยเพื่อลดค่า VPD ลงมา';
  if (text.includes('VPD ค่อนข้างต่ำ')) return '⚠️ อากาศชื้นอับ (VPD ต่ำ): เปิดพัดลมระบายลมขับไล่ไอน้ำสะสมรอบใบ';
  if (text.includes('VPD สูงวิกฤต')) return '🚨 แห้งวิกฤต (VPD สูงจัด): พืชปิดปากใบ กางสแลนกรองแสงและพ่นหมอกด่วน';
  if (text.includes('VPD ต่ำวิกฤต')) return '🚨 ชื้นวิกฤต (VPD ต่ำจัด): หยุดให้น้ำทางดิน เปิดพัดลมระบายลมด่วน';

  // แสง
  if (text.includes('แสงเหมาะสมมาก: ให้พลังงาน') || text.includes('แสงเหมาะสมมาก')) return '✅ แสงดีเยี่ยม: พืชเติบโตเร็ว สังเคราะห์แสงได้เต็มที่';
  if (text.includes('หลีกเลี่ยงภาวะแสงจ้าเกินจำเป็น') || text.includes('แสงข้อมูลปกติ')) return '👍 แสงปกติ: ระวังแสงจ้าเกินไปในช่วงบ่าย';
  if (text.includes('แสงจ้าเกินไป: แนะนำ') || text.includes('แสงจ้าเกินไป')) return '⚠️ แสงจ้าไป: กางตาข่ายกรองแสง (Shading Net) บรรเทาความเครียด';
  if (text.includes('แสงค่อนข้างสลัว: แนะนำ') || text.includes('แสงค่อนข้างสลัว')) return '⚠️ แสงสลัวไป: เปิดหลอดไฟช่วยปลูก (Grow Lights) เสริมความเข้มแสง';
  if (text.includes('แสงแดดจัดแผดเผาเกรียม') || text.includes('แสงแดดจัด')) return '🚨 แดดเผาวิกฤต: กางสแลนกรองแสง 50% และพ่นหมอกน้ำด่วน';
  if (text.includes('แสงมืดสลัวรุนแรง') || text.includes('แสงมืดสลัว')) return '🚨 มืดจัดวิกฤต: พืชเติบโตได้ไม่ดี เปิดไฟช่วยปลูก (Grow Lights) ทันที';

  return text;
};

// คำอธิบายเกณฑ์ความเหมาะสมอ้างอิงตารางประเมิน แปลเป็นภาษาคนพูดเข้าใจง่าย
const detailExplanations: Record<string, { title: string; description: string; unit: string; list: { status: string; color: string; range: string; effect: string }[] }> = {
  temp: {
    title: 'เกณฑ์ความเหมาะสมอุณหภูมิอากาศ',
    description: 'อุณหภูมิอากาศคือระดับความร้อนเย็นในโรงเรือน ซึ่งส่งผลโดยตรงต่อการระเหยน้ำและอัตราการเจริญเติบโตของยอดพืช',
    unit: '°C',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '25 — 30 °C', effect: 'ดีที่สุดต่อการขยายตัวของใบและการเจริญเติบโตของต้นพืช' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '22—24 °C หรือ 31—32 °C', effect: 'พืชสามารถสังเคราะห์แสงและทำงานได้ปกติไร้ปัญหา' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '20—21 °C หรือ 33—35 °C', effect: 'อากาศเย็นหรือร้อนไปเล็กน้อย พืชอาจเจริญเติบโตช้าลง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 20 °C หรือสูงกว่า 35 °C', effect: 'ร้อนจัดจนพืชเครียดใบไหม้เหี่ยวเฉา หรือหนาวจัดพืชหยุดชะงักรุนแรง' },
    ]
  },
  hum: {
    title: 'เกณฑ์ความเหมาะสมความชื้นสัมพัทธ์ (RH)',
    description: 'ปริมาณไอน้ำในอากาศ มีความสำคัญในการควบคุมให้พืชคายน้ำและเปิดปากใบเพื่อดึงสารอาหารได้อย่างราบรื่น',
    unit: '%RH',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '60 — 80 %RH', effect: 'ปากใบเปิดกำลังพอดี พืชกินปุ๋ยและคายน้ำได้ดีที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '50—59 %RH หรือ 81—85 %RH', effect: 'ระดับความชื้นปานกลาง พืชเติบโตตามวัฏจักรได้ปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '40—49 %RH หรือ 86—90 %RH', effect: 'อากาศเริ่มแห้งทำให้พืชคายน้ำไวไป หรือชื้นเกินจนเกิดลมบล็อกปากใบ' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 40 %RH หรือสูงกว่า 90 %RH', effect: 'ชื้นจัดเสี่ยงโรคราใบไม้ระบาด หรือแห้งจัดพืชสูญเสียน้ำเฉา' },
    ]
  },
  vpd: {
    title: 'เกณฑ์ความเหมาะสมแรงดันไอน้ำ (VPD)',
    description: 'ดัชนีชี้วัดความแห้งแล้งรอบๆ ใบพืช เป็นตัวนำทางว่าพืชจะคายน้ำและลำเลียงปุ๋ยขึ้นจากดินได้มีประสิทธิภาพแค่ไหน',
    unit: 'kPa',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '0.4 — 0.8 kPa', effect: 'ค่าแรงดันไอน้ำดีเลิศ พืชลำเลียงน้ำและปุ๋ยขึ้นจากดินได้สูงสุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '0.3 kPa หรือ 0.9 — 1.2 kPa', effect: 'อัตราคายน้ำปกติ ลำเลียงสารอาหารขึ้นเลี้ยงยอดได้สม่ำเสมอ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '0.2 kPa หรือ 1.3 — 1.6 kPa', effect: 'คายน้ำช้าเพราะชื้นสะสม หรือสูญเสียน้ำเร็วเกินเนื่องจากอากาศแห้ง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 0.2 kPa หรือสูงกว่า 1.6 kPa', effect: 'พืชปิดปากใบสนิท ไม่ดึงปุ๋ยขึ้นมาเลี้ยงต้น ยอดชะงัก' },
    ]
  },
  ppfd: {
    title: 'เกณฑ์ความเหมาะสมแสงพืช (PPFD)',
    description: 'ปริมาณโฟตอนความเข้มแสงแดดหรือแสงไฟช่วยปลูกช่วงความยาวคลื่นที่พืชนำไปใช้ในการสังเคราะห์แสงเพื่อเติบโตโดยตรง',
    unit: 'μmol/m²/s',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '400 — 800 μmol', effect: 'แสงเข้มกำลังพอดีเยี่ยม พืชจะสังเคราะห์อาหารสร้างพลังงานได้ไวที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '300 — 399 μmol หรือ 801 — 950 μmol', effect: 'ปริมาณความเข้มแสงเพียงพอต่อการเติบโตได้ตามปกติแข็งแรง' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '200 — 299 μmol หรือ 951 — 1100 μmol', effect: 'แสงสลัวพืชเริ่มยืดหาแสง หรือแสงจ้าเกินทำให้ใบเครียดเก็บความร้อน' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 200 μmol หรือสูงกว่า 1100 μmol', effect: 'มืดจัดจนไม่สามารถโตได้ หรือแดดจัดเกินไปแผดเผาจนผิวใบไม้ไหม้ตาย' },
    ]
  },
  lux: {
    title: 'เกณฑ์ความเหมาะสมความสว่าง (Lux)',
    description: 'ค่าความสว่างของแสงโดยรวมทั้งหมดรอบตัวเซนเซอร์ บอกระดับสายตาความสว่างรวมรอบทิศทาง',
    unit: 'Lux',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '21,600 — 43,200 Lux', effect: 'ความสว่างรอบข้างดีเลิศ พืชได้รับระดับพลังงานสมบูรณ์' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '16,200—21,599 Lux หรือ 43,201—51,350 Lux', effect: 'ความสว่างอยู่ในเกณฑ์ปกติ พืชเติบโตราบรื่น' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '10,800—16,199 Lux หรือ 51,351—59,450 Lux', effect: 'แสงเริ่มน้อยสลัวลง หรือเริ่มสะสมแดดจ้าจนอุณหภูมิใบพืชสูงขึ้น' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 10,800 Lux หรือสูงกว่า 59,450 Lux', effect: 'มืดเกินไปสังเคราะห์แสงไม่ได้ หรือสว่างจ้าเกินไปแผดเผาผิวใบเสียหาย' },
    ]
  }
};

interface ClimateCardsProps {
  latestData: SensorData | null;
  history: SensorData[];
  diagnosticsData: DiagnosticsResponse | null;
  theme: ThemePeriod;
}

export const ClimateCards: React.FC<ClimateCardsProps> = ({ latestData, history, diagnosticsData, theme }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDetailMetric, setActiveDetailMetric] = useState<'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux' | null>(null);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);

  const temp = latestData ? latestData.temperature : 0;
  const hum = latestData ? latestData.humidity : 0;
  const vpd = latestData ? latestData.vpd : 0;
  const lux = latestData ? latestData.lux : 0;
  const ppfd = parseFloat((lux * multiplier).toFixed(2));

  const diagnostics = diagnosticsData?.diagnostics;

  const createSparklineData = (metric: 'temperature' | 'humidity' | 'vpd' | 'ppfd', color: string) => {
    const points = history.slice(-15).map(h => {
      if (metric === 'ppfd') return h.lux * multiplier;
      return h[metric];
    });

    return {
      labels: points.map((_, i) => i.toString()),
      datasets: [
        {
          data: points,
          borderColor: color,
          backgroundColor: `${color}18`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  const getDynamicStyles = (key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux') => {
    const lookupKey = key === 'lux' ? 'ppfd' : key;
    const diag = diagnostics?.[lookupKey];
    const state = diag?.state;

    switch (state) {
      case 'excellent':
        return {
          borderColor: 'border-emerald-500 shadow-emerald-500/5',
          bgGlow: 'bg-emerald-500/5',
          iconBg: 'bg-emerald-50 border-emerald-100',
          textColor: 'text-emerald-500',
          valueColor: 'text-emerald-600',
          recBg: 'bg-emerald-50/40 border border-emerald-100/70',
          recTitleColor: 'text-emerald-800',
          recTextColor: 'text-emerald-600/90',
        };
      case 'good':
        return {
          borderColor: 'border-blue-500 shadow-blue-500/5',
          bgGlow: 'bg-blue-500/5',
          iconBg: 'bg-blue-50 border-blue-100',
          textColor: 'text-blue-500',
          valueColor: 'text-blue-600',
          recBg: 'bg-blue-50/40 border border-blue-100/70',
          recTitleColor: 'text-blue-800',
          recTextColor: 'text-blue-600/90',
        };
      case 'warning':
        return {
          borderColor: 'border-amber-500 shadow-amber-500/5',
          bgGlow: 'bg-amber-500/5',
          iconBg: 'bg-amber-50 border-amber-100',
          textColor: 'text-amber-500',
          valueColor: 'text-amber-600',
          recBg: 'bg-amber-50/40 border border-amber-100/70',
          recTitleColor: 'text-amber-800',
          recTextColor: 'text-amber-600/90',
        };
      case 'critical':
        return {
          borderColor: 'border-rose-500 shadow-rose-500/5',
          bgGlow: 'bg-rose-500/5',
          iconBg: 'bg-rose-50 border-rose-100',
          textColor: 'text-rose-500',
          valueColor: 'text-rose-600',
          recBg: 'bg-rose-50/40 border border-rose-100/70',
          recTitleColor: 'text-rose-800',
          recTextColor: 'text-rose-600/90',
        };
      default:
        const defaultMap = {
          temp: { border: 'border-rose-200', glow: 'bg-rose-500/5', ibg: 'bg-rose-50 border-rose-100', tc: 'text-rose-500', vc: 'text-rose-600', rbg: 'bg-rose-50/40 border border-rose-100/70', rtc: 'text-rose-800', rtc2: 'text-rose-600/90' },
          hum: { border: 'border-blue-200', glow: 'bg-blue-500/5', ibg: 'bg-blue-50 border-blue-100', tc: 'text-blue-500', vc: 'text-blue-600', rbg: 'bg-blue-50/40 border border-blue-100/70', rtc: 'text-rose-800', rtc2: 'text-blue-600/90' },
          vpd: { border: 'border-purple-200', glow: 'bg-purple-500/5', ibg: 'bg-purple-50 border-purple-100', tc: 'text-purple-500', vc: 'text-purple-600', rbg: 'bg-purple-50/40 border border-purple-100/70', rtc: 'text-purple-800', rtc2: 'text-purple-600/90' },
          ppfd: { border: 'border-amber-200', glow: 'bg-amber-500/5', ibg: 'bg-amber-50 border-amber-100', tc: 'text-amber-500', vc: 'text-amber-600', rbg: 'bg-amber-50/40 border border-amber-100/70', rtc: 'text-amber-800', rtc2: 'text-amber-600/90' },
          lux: { border: 'border-amber-200', glow: 'bg-amber-500/5', ibg: 'bg-amber-50 border-amber-100', tc: 'text-amber-500', vc: 'text-amber-600', rbg: 'bg-amber-50/40 border border-amber-100/70', rtc: 'text-amber-800', rtc2: 'text-amber-600/90' },
        };
        const def = defaultMap[key];
        return {
          borderColor: def.border,
          bgGlow: def.glow,
          iconBg: def.ibg,
          textColor: def.tc,
          valueColor: def.vc,
          recBg: def.rbg,
          recTitleColor: def.rtc,
          recTextColor: def.rtc2,
        };
    }
  };

  const cards = [
    {
      key: 'temp' as const,
      title: 'อุณหภูมิ',
      subtitle: 'DHT22 Sensor',
      value: `${temp.toFixed(1)}`,
      unit: '°C',
      desc: 'ความร้อนในโรงเรือน',
      icon: <Thermometer size={16} />,
      sparkColor: '#f43f5e',
      sparkline: createSparklineData('temperature', '#f43f5e'),
    },
    {
      key: 'hum' as const,
      title: 'ความชื้น',
      subtitle: 'DHT22 Sensor',
      value: `${hum.toFixed(1)}`,
      unit: '%RH',
      desc: 'ไอน้ำในอากาศ',
      icon: <Droplets size={16} />,
      sparkColor: '#3b82f6',
      sparkline: createSparklineData('humidity', '#3b82f6'),
    },
    {
      key: 'vpd' as const,
      title: 'VPD',
      subtitle: 'คำนวณจาก อุณหภูมิ + ความชื้น',
      value: `${vpd.toFixed(2)}`,
      unit: 'kPa',
      desc: 'แรงดันไอน้ำ (ดูดซึมปุ๋ยได้ดีแค่ไหน)',
      icon: <Wind size={16} />,
      sparkColor: '#a855f7',
      sparkline: createSparklineData('vpd', '#a855f7'),
    },
    {
      key: 'ppfd' as const,
      title: 'PPFD (แสงที่พืชใช้ได้)',
      subtitle: 'คำนวณจาก Lux × ตัวคูณ',
      value: `${ppfd.toLocaleString()}`,
      unit: 'μmol/m²/s',
      desc: 'แสงที่พืชใช้สังเคราะห์ได้',
      icon: <Sun size={16} />,
      sparkColor: '#f59e0b',
      sparkline: createSparklineData('ppfd', '#f59e0b'),
      action: (
        <button
          id="ppfd-info-btn"
          onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
          title="ดูรายละเอียดการคำนวณ PPFD"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-amber-500 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer text-xs font-bold"
        >
          <Info size={11} />
          <span>สูตรคำนวณ</span>
        </button>
      )
    },
    {
      key: 'lux' as const,
      title: 'ความสว่าง (Lux)',
      subtitle: 'BH1750 Light Sensor',
      value: `${lux.toLocaleString()}`,
      unit: 'Lux',
      desc: 'ความสว่างรวมในโรงเรือน',
      icon: <Sun size={16} />,
      sparkColor: '#eab308',
      sparkline: createSparklineData('ppfd', '#eab308'),
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {cards.map((card, idx) => {
          const styles = getDynamicStyles(card.key);
          const lookupKey = card.key === 'lux' ? 'ppfd' : card.key;
          const cardDiag = diagnostics?.[lookupKey];

          return (
            <div key={idx} className="flex flex-col gap-2">
              {/* การ์ดหลักแสดงค่าตัวเลข */}
              <div
                className={`border-2 ${styles.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden flex-grow theme-transition`}
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {/* แสงหัวการ์ด */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${styles.bgGlow}`} />

                {/* หัวการ์ด: ไอคอน + ปุ่มข้อมูล (เมื่อคลิกจะเปิด Modal แสดงเกณฑ์) */}
                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${styles.iconBg} ${styles.textColor}`}>
                      {card.icon}
                    </div>
                    {/* ปุ่ม Info สำหรับเปิดดูเกณฑ์ (ภาษาคน) */}
                    <button
                      onClick={() => setActiveDetailMetric(card.key)}
                      title="ดูคำอธิบายเกณฑ์ความเหมาะสม"
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                      <Info size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  {card.action}
                </div>

                {/* ตัวเลขหลัก + สถานะ */}
                <div className="z-10 animate-fade-in">
                  <div className="flex justify-between items-center mb-1.5 gap-1">
                    <span className="text-xs font-black tracking-wide uppercase leading-none" style={{ color: 'var(--text-muted)' }}>
                      {card.title}
                    </span>
                    <span className={`px-2 py-0.5 border rounded-full text-[10.5px] font-black shrink-0 transition-colors ${cardDiag ? cardDiag.color : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                      {cardDiag ? cardDiag.status : 'รอข้อมูล...'}
                    </span>
                  </div>
                  <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${styles.valueColor}`}>
                    {latestData ? card.value : '---'}
                    <span className="text-sm md:text-base font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{card.unit}</span>
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
                </div>

                {/* Sparkline */}
                <div className="h-12 w-full">
                  <Line 
                    data={createSparklineData(
                      card.key === 'temp' ? 'temperature' :
                      card.key === 'hum' ? 'humidity' :
                      card.key === 'vpd' ? 'vpd' : 'ppfd', 
                      card.sparkColor
                    )} 
                    options={sparklineOptions} 
                  />
                </div>
              </div>

              {/* กล่องคำแนะนำ */}
              <div className={`rounded-xl p-3 shadow-md text-xs flex flex-col gap-1 min-h-[64px] justify-center transition-all hover:shadow-lg ${styles.recBg}`}>
                <div className={`font-black flex items-center gap-1 text-[10.5px] uppercase tracking-wider ${styles.recTitleColor}`}>
                  <span>💡 คำแนะนำ:</span>
                </div>
                <p className={`font-semibold leading-relaxed text-xs ${styles.recTextColor}`}>
                  {cardDiag ? simplifyRecommendation(cardDiag.recommendation) : 'กำลังวิเคราะห์...'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <PpfdModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLux={lux}
        currentMultiplier={multiplier}
        onMultiplierChange={(val) => setMultiplier(val)}
      />

      {/* หน้าต่างแสดงคำอธิบายเกณฑ์ประเมินอัจฉริยะ (ภาษาคนเข้าใจง่าย) */}
      {activeDetailMetric && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 border theme-transition"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* หัวหน้าต่าง */}
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
                  <div className="flex items-center gap-2">
                    <span className={`w-[82px] text-center py-1 rounded-full text-[10px] font-black border uppercase whitespace-nowrap flex-shrink-0 ${item.color}`}>
                      {item.status}
                    </span>
                    <span className="text-xs font-black font-mono" style={{ color: 'var(--text-value)' }}>
                      {item.range}
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
      )}
    </>
  );
};
