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
  if (text.includes('รักษาเสถียรภาพความร้อน') || text.includes('อุณหภูมิกำลังพอดี')) return '✅ อุณหภูมิกำลังพอดี เหมาะกับการเติบโตของพืช คุมระดับนี้ต่อไปได้เลยครับ';
  if (text.includes('ไม่ให้อุณหภูมิผันผวน') || text.includes('อุณหภูมิปกติทั่วไป')) return '👍 อุณหภูมิปกติทั่วไป คอยระวังไม่ให้อุณหภูมิร้อนหรือเย็นลงเร็วเกินไปนะครับ';
  if (text.includes('อุณหภูมิค่อนข้างสูง') || text.includes('อุณหภูมิเริ่มร้อน')) return '⚠️ อุณหภูมิเริ่มร้อนไปนิด: ลองเปิดพัดลมระบายอากาศหรือเพิ่มลมหมุนเวียนดูครับ';
  if (text.includes('อุณหภูมิค่อนข้างต่ำ') || text.includes('อุณหภูมิเริ่มเย็น')) return '⚠️ อุณหภูมิเริ่มเย็นไปนิด: ลองลดระดับพัดลมลงเพื่อช่วยสะสมความอบอุ่นในโรงเรือนครับ';
  if (text.includes('อุณหภูมิสูงเกินไป') || text.includes('ร้อนเกินไปขั้นวิกฤต')) return '🚨 ร้อนเกินไปขั้นวิกฤต!: รีบเปิดพัดลมระบายอากาศ พ่นหมอกน้ำ และกางสแลนกรองแสงด่วนครับ';
  if (text.includes('อุณหภูมิต่ำเกินไป') || text.includes('เย็นเกินไปขั้นวิกฤต')) return '🚨 เย็นเกินไปขั้นวิกฤต!: ควรปิดพัดลมระบายอากาศ หรือเปิดเครื่องทำความร้อนด่วนครับ';

  // ความชื้น
  if (text.includes('เหมาะสมกับการเปิดปากใบดูดซึม') || text.includes('ความชื้นดีเยี่ยม')) return '✅ ความชื้นดีเยี่ยม: พืชจะเปิดปากใบเพื่อดูดซึมน้ำและปุ๋ยได้ดีที่สุด รักษาค่านี้ไว้นะครับ';
  if (text.includes('ไม่ให้อิ่มตัวในช่วงกลางคืน') || text.includes('ความชื้นอยู่ในเกณฑ์ปกติ') || text.includes('ความชื้นปกติ')) return '👍 ความชื้นอยู่ในเกณฑ์ปกติ คอยระวังอย่าให้ความชื้นสะสมสูงเกินไปในช่วงกลางคืนนะครับ';
  if (text.includes('ความชื้นสูงเกินเกณฑ์') || text.includes('ชื้นเกินไปนิดนึง')) return '⚠️ ชื้นเกินไปนิดนึง: แนะนำเปิดพัดลมหมุนเวียนเพื่อระบายความอับชื้นสะสมครับ';
  if (text.includes('ความชื้นต่ำเกินเกณฑ์') || text.includes('อากาศเริ่มแห้งเกินไป')) return '⚠️ อากาศเริ่มแห้งเกินไป: แนะนำให้เปิดพ่นหมอกเป็นระยะเพื่อเพิ่มความชื้นครับ';
  if (text.includes('ความชื้นสูงวิกฤต') || text.includes('ชื้นเกินไปขั้นวิกฤต')) return '🚨 ชื้นเกินไปขั้นวิกฤต!: เสี่ยงเกิดโรครา ควรเปิดพัดลมระบายอากาศ 100% และงดให้น้ำชั่วคราวนะครับ';
  if (text.includes('ความชื้นต่ำวิกฤต') || text.includes('แห้งเกินไปขั้นวิกฤต')) return '🚨 แห้งเกินไปขั้นวิกฤต!: พืชเสี่ยงเหี่ยวเฉา รีบเปิดระบบพ่นหมอกเต็มกำลังด่วนครับ';

  // VPD (แรงดันไอน้ำ)
  if (text.includes('ระดับแรงดันไอดีเลิศ') || text.includes('ค่า VPD ดีเยี่ยม')) return '✅ ค่า VPD ดีเยี่ยม!: พืชสามารถลำเลียงน้ำและแร่ธาตุอาหารขึ้นมาใช้งานได้ดีที่สุดครับ';
  if (text.includes('ประคองระดับค่ากระบอกไอ') || text.includes('ค่า VPD ปกติ')) return '👍 ค่า VPD ปกติ คอยเช็กอุณหภูมิและความชื้นให้คงที่สม่ำเสมอนะครับ';
  if (text.includes('VPD ค่อนข้างสูง') || text.includes('VPD สูงไป')) return '⚠️ อากาศแห้งเกินไป (VPD สูง): แนะนำให้พ่นหมอกละอองน้ำฝอยเพื่อลดค่า VPD ลงมาครับ';
  if (text.includes('VPD ค่อนข้างต่ำ') || text.includes('VPD ต่ำไป')) return '⚠️ อากาศชื้นอับเกินไป (VPD ต่ำ): แนะนำให้เปิดพัดลมเพื่อระบายไอน้ำสะสมรอบๆ ใบพืชครับ';
  if (text.includes('VPD สูงวิกฤต') || text.includes('VPD สูงจัดขั้นวิกฤต')) return '🚨 VPD สูงจัดขั้นวิกฤต (อากาศแห้งแล้งมาก): พืชจะปิดปากใบ ควรรีบกางสแลนกรองแสงและพ่นหมอกเพิ่มความชื้นด่วนครับ';
  if (text.includes('VPD ต่ำวิกฤต') || text.includes('VPD ต่ำจัดขั้นวิกฤต')) return '🚨 VPD ต่ำจัดขั้นวิกฤต (ชื้นเกินจนพืชไม่คายน้ำ): แนะนำให้งดให้น้ำทางดิน และรีบเปิดพัดลมระบายอากาศด่วนครับ';

  // แสง
  if (text.includes('แสงเหมาะสมมาก: ให้พลังงาน') || text.includes('แสงเหมาะสมมาก') || text.includes('แสงกำลังพอดีเยี่ยม')) return '✅ แสงกำลังพอดีเยี่ยม: พืชได้รับพลังงานเต็มที่ สังเคราะห์แสงและเติบโตได้ดีมากครับ';
  if (text.includes('หลีกเลี่ยงภาวะแสงจ้าเกินจำเป็น') || text.includes('แสงข้อมูลปกติ') || text.includes('แสงอยู่ในเกณฑ์ปกติ')) return '👍 แสงอยู่ในเกณฑ์ปกติ คอยระวังแสงแดดแรงจัดในช่วงบ่ายนะครับ';
  if (text.includes('แสงจ้าเกินไป: แนะนำ') || text.includes('แสงจ้าเกินไป') || text.includes('แสงแดดแรงเกินไป')) return '⚠️ แสงแดดแรงเกินไป: แนะนำให้กางสแลนกรองแสงเพื่อช่วยลดความร้อนสะสมบนใบครับ';
  if (text.includes('แสงค่อนข้างสลัว: แนะนำ') || text.includes('แสงค่อนข้างสลัว') || text.includes('แสงค่อนข้างน้อย')) return '⚠️ แสงค่อนข้างน้อย: แนะนำให้เปิดไฟช่วยปลูก (Grow Lights) เพื่อเพิ่มความเข้มแสงให้เพียงพอครับ';
  if (text.includes('แสงแดดจัดแผดเผาเกรียม') || text.includes('แสงแดดจัด') || text.includes('แดดแรงเกินไปขั้นวิกฤต')) return '🚨 แดดแรงเกินไปขั้นวิกฤต!: ควรรีบกางสแลนกรองแสง 50% หรือเปิดพ่นหมอกน้ำเพื่อระบายความร้อนด่วนครับ';
  if (text.includes('แสงมืดสลัวรุนแรง') || text.includes('แสงมืดสลัว') || text.includes('มืดเกินไปขั้นวิกฤต')) return '🚨 มืดเกินไปขั้นวิกฤต!: แสงสว่างไม่พอต่อการเติบโต ควรรีบเปิดไฟช่วยปลูก (Grow Lights) ทันทีครับ';

  return text;
};

// คำอธิบายเกณฑ์ความเหมาะสมอ้างอิงตารางประเมิน แปลเป็นภาษาคนพูดเข้าใจง่าย
const detailExplanations: Record<string, { title: string; description: string; unit: string; list: { status: string; color: string; range: string; effect: string }[] }> = {
  temp: {
    title: 'เกณฑ์ความเหมาะสมอุณหภูมิอากาศ',
    description: 'ระดับความร้อนเย็นในโรงเรือน ส่งผลโดยตรงต่อการระเหยน้ำและการเติบโตของยอดพืช',
    unit: '°C',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '25 — 30 °C', effect: 'ดีที่สุดต่อการเติบโตและการคายน้ำของใบพืช' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '22—24 °C หรือ 31—32 °C', effect: 'พืชสังเคราะห์แสงและทำงานได้ปกติไม่มีปัญหา' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '20—21 °C หรือ 33—35 °C', effect: 'อากาศเริ่มเย็นหรือร้อนเกินไป พืชอาจเติบโตช้าลงเล็กน้อย' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 20 °C หรือสูงกว่า 35 °C', effect: 'ร้อนจัดจนเหี่ยวเฉาใบไหม้ หรือเย็นจัดจนต้นพืชหยุดชะงัก' },
    ]
  },
  hum: {
    title: 'เกณฑ์ความเหมาะสมความชื้นสัมพัทธ์ (RH)',
    description: 'ปริมาณไอน้ำในอากาศ ช่วยควบคุมการเปิดปากใบพืชเพื่อให้ดูดซึมปุ๋ยและสารอาหารได้อย่างราบรื่น',
    unit: '%RH',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '60 — 80 %RH', effect: 'ปากใบเปิดพอดี พืชดูดปุ๋ยและคายน้ำได้ดีที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '50—59 %RH หรือ 81—85 %RH', effect: 'ความชื้นปานกลาง พืชเจริญเติบโตได้ปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '40—49 %RH หรือ 86—90 %RH', effect: 'อากาศเริ่มแห้งทำให้คายน้ำเร็วเกินไป หรือชื้นเกินจนจำกัดการคายน้ำ' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 40 %RH หรือสูงกว่า 90 %RH', effect: 'ชื้นจัดจนเสี่ยงโรคราใบไม้ระบาด หรือแห้งจัดจนต้นพืชขาดน้ำ' },
    ]
  },
  vpd: {
    title: 'เกณฑ์ความเหมาะสมแรงดันไอน้ำ (VPD)',
    description: 'ดัชนีวัดระดับความแห้งแล้งรอบใบพืช ช่วยระบุประสิทธิภาพการคายน้ำและการลำเลียงปุ๋ยขึ้นจากดิน',
    unit: 'kPa',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '0.4 — 0.8 kPa', effect: 'แรงดันไอน้ำดีเยี่ยม พืชลำเลียงน้ำและปุ๋ยขึ้นจากดินได้สูงที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '0.3 kPa หรือ 0.9 — 1.2 kPa', effect: 'พืชคายน้ำได้ปกติและลำเลียงอาหารไปเลี้ยงยอดได้สม่ำเสมอ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '0.2 kPa หรือ 1.3 — 1.6 kPa', effect: 'คายน้ำได้ช้าเพราะอากาศชื้นเกิน หรือคายน้ำเร็วเกินเพราะอากาศแห้ง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 0.2 kPa หรือสูงกว่า 1.6 kPa', effect: 'พืชจะปิดปากใบสนิท ทำให้ไม่สามารถดูดซึมปุ๋ยไปเลี้ยงต้นได้' },
    ]
  },
  ppfd: {
    title: 'เกณฑ์ความเหมาะสมแสงพืช (PPFD)',
    description: 'ความเข้มแสงแดดหรือไฟช่วยปลูกเฉพาะช่วงคลื่นแสงที่พืชสามารถนำไปใช้สังเคราะห์แสงเจริญเติบโตได้โดยตรง',
    unit: 'μmol/m²/s',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '400 — 800 μmol', effect: 'ความเข้มแสงกำลังพอดี พืชสังเคราะห์อาหารและเติบโตได้เร็วที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '300 — 399 μmol หรือ 801 — 950 μmol', effect: 'ความเข้มแสงเพียงพอต่อการเจริญเติบโตได้อย่างแข็งแรงปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '200 — 299 μmol หรือ 951 — 1100 μmol', effect: 'แสงน้อยไปจนต้นพืชยืดหาแสง หรือแสงแดดแรงไปจนพืชเครียดสะสมความร้อน' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 200 μmol หรือสูงกว่า 1100 μmol', effect: 'มืดเกินไปจนโตไม่ได้ หรือแดดแรงจัดเกินจนผิวใบแห้งไหม้เสียหาย' },
    ]
  },
  lux: {
    title: 'เกณฑ์ความเหมาะสมความสว่าง (Lux)',
    description: 'ระดับความสว่างรวมรอบๆ เซนเซอร์ เพื่อประเมินความสว่างรวมในโรงเรือน',
    unit: 'Lux',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '21,600 — 43,200 Lux', effect: 'ความสว่างรอบข้างดีเลิศ พืชสังเคราะห์แสงได้สมบูรณ์' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '16,200—21,599 Lux หรือ 43,201—51,350 Lux', effect: 'ความสว่างอยู่ในระดับปกติ พืชเจริญเติบโตได้อย่างราบรื่น' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '10,800—16,199 Lux หรือ 51,351—59,450 Lux', effect: 'แสงสลัวพืชสังเคราะห์แสงได้ช้าลง หรือแดดเริ่มแรงขึ้นจนอุณหภูมิใบสูง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 10,800 Lux หรือสูงกว่า 59,450 Lux', effect: 'มืดเกินไปจนไม่เติบโต หรือแสงจ้าจัดแผดเผาจนผิวใบเสียหาย' },
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
      title: 'อุณหภูมิอากาศ',
      subtitle: 'เซนเซอร์ DHT22',
      value: `${temp.toFixed(1)}`,
      unit: '°C',
      desc: 'ระดับความร้อน-เย็นในโรงเรือน',
      icon: <Thermometer size={16} />,
      sparkColor: '#f43f5e',
      sparkline: createSparklineData('temperature', '#f43f5e'),
    },
    {
      key: 'hum' as const,
      title: 'ความชื้นสัมพัทธ์',
      subtitle: 'เซนเซอร์ DHT22',
      value: `${hum.toFixed(1)}`,
      unit: '%RH',
      desc: 'ปริมาณไอน้ำในอากาศ',
      icon: <Droplets size={16} />,
      sparkColor: '#3b82f6',
      sparkline: createSparklineData('humidity', '#3b82f6'),
    },
    {
      key: 'vpd' as const,
      title: 'ความอับชื้น-แห้งแล้ง (VPD)',
      subtitle: 'ดัชนีชี้วัดการดูดปุ๋ยและคายน้ำ',
      value: `${vpd.toFixed(2)}`,
      unit: 'kPa',
      desc: 'แรงดันไออากาศรอบใบพืช (ค่ายิ่งต่ำยิ่งอับชื้น ค่ายิ่งสูงยิ่งแห้งแล้ง)',
      icon: <Wind size={16} />,
      sparkColor: '#a855f7',
      sparkline: createSparklineData('vpd', '#a855f7'),
    },
    {
      key: 'ppfd' as const,
      title: 'ความเข้มแสงพืช (PPFD)',
      subtitle: 'แสงที่ใบพืชนำไปสังเคราะห์ได้จริง',
      value: `${ppfd.toLocaleString()}`,
      unit: 'μmol/m²/s',
      desc: 'ปริมาณความเข้มแสงที่มีประโยชน์ต่อพืช',
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
      title: 'ความสว่างรอบข้าง (Lux)',
      subtitle: 'เซนเซอร์แสง BH1750',
      value: `${lux.toLocaleString()}`,
      unit: 'Lux',
      desc: 'ระดับความสว่างของแสงโดยรวมทั้งหมด',
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
              <div
                className="rounded-xl p-3 shadow-md text-xs flex flex-col gap-1 min-h-[64px] justify-center transition-all hover:shadow-lg border theme-transition"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-card)',
                }}
              >
                <div className="font-black flex items-center gap-1 text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <span>💡 คำแนะนำ:</span>
                </div>
                <p className="font-semibold leading-relaxed text-xs" style={{ color: 'var(--text-secondary)' }}>
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
