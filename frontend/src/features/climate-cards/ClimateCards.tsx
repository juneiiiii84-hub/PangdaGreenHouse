import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info, X } from 'lucide-react';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { SensorData, DiagnosticsResponse } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';

const getHumanFriendlyRecommendation = (
  key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux',
  state?: 'excellent' | 'good' | 'warning' | 'critical'
): string => {
  if (!state) return 'กำลังวิเคราะห์...';

  switch (key) {
    case 'temp':
      if (state === 'excellent') return 'ดีที่สุดต่อการเติบโตและการคายน้ำของใบพืช';
      if (state === 'good') return 'พืชสังเคราะห์แสงและทำงานได้ปกติไม่มีปัญหา';
      if (state === 'warning') return 'อากาศเริ่มเย็นหรือร้อนเกินไป พืชอาจเติบโตช้าลงเล็กน้อย';
      return 'ร้อนจัดจนเหี่ยวเฉาใบไหม้ หรือเย็นจัดจนต้นพืชหยุดชะงัก';

    case 'hum':
      if (state === 'excellent') return 'ปากใบเปิดพอดี พืชดูดปุ๋ยและคายน้ำได้ดีที่สุด';
      if (state === 'good') return 'ความชื้นปานกลาง พืชเจริญเติบโตได้ปกติ';
      if (state === 'warning') return 'อากาศเริ่มแห้งทำให้คายน้ำเร็วเกินไป หรือชื้นเกินจนจำกัดการคายน้ำ';
      return 'ชื้นจัดจนเสี่ยงโรคราใบไม้ระบาด หรือแห้งจัดจนต้นพืชขาดน้ำ';

    case 'vpd':
      if (state === 'excellent') return 'แรงดันไอน้ำดีเยี่ยม พืชลำเลียงน้ำและปุ๋ยขึ้นจากดินได้สูงที่สุด';
      if (state === 'good') return 'พืชคายน้ำได้ปกติและลำเลียงอาหารไปเลี้ยงยอดได้สม่ำเสมอ';
      if (state === 'warning') return 'คายน้ำได้ช้าเพราะอากาศชื้นเกิน หรือคายน้ำเร็วเกินเพราะอากาศแห้ง';
      return 'พืชจะปิดปากใบสนิท ทำให้ไม่สามารถดูดซึมปุ๋ยไปเลี้ยงต้นได้';

    case 'ppfd':
      if (state === 'excellent') return 'ความเข้มแสงกำลังพอดี พืชสังเคราะห์อาหารและเติบโตได้เร็วที่สุด';
      if (state === 'good') return 'ความเข้มแสงเพียงพอต่อการเจริญเติบโตได้อย่างแข็งแรงปกติ';
      if (state === 'warning') return 'แสงน้อยไปจนต้นพืชยืดหาแสง หรือแสงแดดแรงไปจนพืชเครียดสะสมความร้อน';
      return 'มืดเกินไปจนไม่เติบโต หรือแดดแรงจัดเกินจนผิวใบแห้งไหม้เสียหาย';

    case 'lux':
      if (state === 'excellent') return 'ความสว่างรอบข้างดีเลิศ พืชสังเคราะห์แสงได้สมบูรณ์';
      if (state === 'good') return 'ความสว่างอยู่ในระดับปกติ พืชเจริญเติบโตได้อย่างราบรื่น';
      if (state === 'warning') return 'แสงสลัวพืชสังเคราะห์แสงได้ช้าลง หรือแดดเริ่มแรงขึ้นจนอุณหภูมิใบสูง';
      return 'มืดเกินไปจนไม่เติบโต หรือแสงจ้าจัดแผดเผาจนผิวใบเสียหาย';

    default:
      return 'กำลังวิเคราะห์...';
  }
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
    title: 'เกณฑ์ความเหมาะสมความชื้นสัมพัทธ์ (%RH)',
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
    title: 'เกณฑ์ความเหมาะสมความต่างของความดันไอน้ำ (VPD)',
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
    title: 'เกณฑ์ความเหมาะสมค่าแสงที่พืชได้รับ (PPFD)',
    description: 'ความเข้มแสงแดดหรือไฟช่วยปลูกเฉพาะช่วงคลื่นแสงที่พืชสามารถนำไปใช้สังเคราะห์แสงเจริญเติบโตได้โดยตรง',
    unit: 'μmol/m²/s',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '400 — 800 μmol', effect: 'ความเข้มแสงกำลังพอดี พืชสังเคราะห์อาหารและเติบโตได้เร็วที่สุด' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '300 — 399 μmol หรือ 801 — 950 μmol', effect: 'ความเข้มแสงเพียงพอต่อการเจริญเติบโตได้อย่างแข็งแรงปกติ' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '200 — 299 μmol หรือ 951 — 1100 μmol', effect: 'แสงน้อยไปจนต้นพืชยืดหาแสง หรือแสงแดดแรงไปจนพืชเครียดสะสมความร้อน' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 200 μmol หรือสูงกว่า 1100 μmol', effect: 'มืดเกินไปจนไม่เติบโต หรือแดดแรงจัดเกินจนผิวใบแห้งไหม้เสียหาย' },
    ]
  },
  lux: {
    title: 'เกณฑ์ความเหมาะสมความส่องสว่าง (Lux)',
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
  const [activeDetailMetric, setActiveDetailMetric] = useState<'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux' | null>(null);
  const [viewPpfdFormula, setViewPpfdFormula] = useState(false);
  const multiplier = DEFAULT_MULTIPLIER;

  const handleOpenDetailMetric = (key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux') => {
    setViewPpfdFormula(false);
    setActiveDetailMetric(key);
  };

  const getPpfdDiagnostics = (ppfdVal: number) => {
    if (ppfdVal >= 400 && ppfdVal <= 800) {
      return {
        state: 'excellent' as const,
        status: 'เหมาะสมมาก',
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      };
    } else if ((ppfdVal >= 300 && ppfdVal < 400) || (ppfdVal > 800 && ppfdVal <= 950)) {
      return {
        state: 'good' as const,
        status: 'เหมาะสม',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      };
    } else if ((ppfdVal >= 200 && ppfdVal < 300) || (ppfdVal > 950 && ppfdVal <= 1100)) {
      return {
        state: 'warning' as const,
        status: 'เฝ้าระวัง',
        color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      };
    } else {
      return {
        state: 'critical' as const,
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      };
    }
  };

  const temp = latestData ? latestData.temperature : 0;
  const hum = latestData ? latestData.humidity : 0;
  const vpd = latestData ? latestData.vpd : 0;
  const lux = latestData ? latestData.lux : 0;
  const ppfd = parseFloat((lux * multiplier).toFixed(2));

  const diagnostics = diagnosticsData?.diagnostics;

  const createSparklineData = (metric: 'temperature' | 'humidity' | 'vpd' | 'ppfd', color: string) => {
    const points = history.slice(-12).map(h => {
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

  const getDynamicStyles = (key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux', customState?: 'excellent' | 'good' | 'warning' | 'critical') => {
    const lookupKey = key === 'lux' ? 'ppfd' : key;
    const diag = diagnostics?.[lookupKey];
    const state = customState || diag?.state;

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
      desc: 'ระดับความร้อน-เย็นภายในโรงเรือน',
      icon: <Thermometer size={16} />,
      sparkColor: '#f43f5e',
      sparkline: createSparklineData('temperature', '#f43f5e'),
    },
    {
      key: 'hum' as const,
      title: 'ความชื้นสัมพัทธ์ (%RH)',
      subtitle: 'เซนเซอร์ DHT22',
      value: `${hum.toFixed(1)}`,
      unit: '%RH',
      desc: 'ปริมาณไอน้ำที่มีอยู่ในอากาศ',
      icon: <Droplets size={16} />,
      sparkColor: '#3b82f6',
      sparkline: createSparklineData('humidity', '#3b82f6'),
    },
    {
      key: 'vpd' as const,
      title: 'ความต่างของความดันไอน้ำ (VPD)',
      subtitle: 'ดัชนีชี้วัดการดูดปุ๋ยและคายน้ำ',
      value: `${vpd.toFixed(2)}`,
      unit: 'kPa',
      desc: 'ดัชนีชี้วัดการคายน้ำและอัตราการดูดปุ๋ยของต้นไม้',
      icon: <Wind size={16} />,
      sparkColor: '#a855f7',
      sparkline: createSparklineData('vpd', '#a855f7'),
    },
    {
      key: 'ppfd' as const,
      title: 'ค่าแสงที่พืชได้รับ (PPFD)',
      subtitle: 'แสงที่ใบพืชนำไปสังเคราะห์ได้จริง',
      value: `${ppfd.toLocaleString()}`,
      unit: 'μmol/m²/s',
      desc: 'ปริมาณแสงที่พืชนำไปใช้สังเคราะห์แสงได้จริง',
      icon: <Sun size={16} />,
      sparkColor: '#f59e0b',
      sparkline: createSparklineData('ppfd', '#f59e0b'),
    },
    {
      key: 'lux' as const,
      title: 'ความส่องสว่าง (Lux)',
      subtitle: 'เซนเซอร์แสง BH1750',
      value: `${lux.toLocaleString()}`,
      unit: 'Lux',
      desc: 'ระดับความสว่างทั่วไปที่สายตามนุษย์รับรู้',
      icon: <Sun size={16} />,
      sparkColor: '#eab308',
      sparkline: createSparklineData('ppfd', '#eab308'),
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {cards.map((card, idx) => {
          const isNight = theme === 'night';
          const cardDiag = isNight ? null : (card.key === 'ppfd' ? getPpfdDiagnostics(ppfd) : (diagnostics?.[card.key === 'lux' ? 'ppfd' : card.key] || null));
          const styles = getDynamicStyles(card.key, cardDiag?.state);

          const badgeStatus = isNight ? 'ไม่มีการประเมิน' : (cardDiag ? cardDiag.status : 'รอข้อมูล...');
          const badgeColor = isNight 
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800' 
            : (cardDiag ? cardDiag.color : 'bg-slate-100 text-slate-400 border-slate-200');

          const cardBorderColor = isNight ? 'border-slate-200 dark:border-slate-800/80 shadow-none' : styles.borderColor;
          const cardBgGlow = isNight ? 'opacity-0' : styles.bgGlow;

          return (
            <div key={idx} className="flex flex-col gap-2">
              {/* การ์ดหลักแสดงค่าตัวเลข */}
              <div
                className={`border-2 ${cardBorderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden flex-grow theme-transition`}
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {/* แสงหัวการ์ด */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${cardBgGlow}`} />

                {/* หัวการ์ด: ไอคอน + ปุ่มข้อมูล (ย้ายมาขวาบน) */}
                <div className="flex justify-between items-start z-10">
                  <div className={`p-2 rounded-xl border ${styles.iconBg} ${styles.textColor}`}>
                    {card.icon}
                  </div>
                  {/* ปุ่ม Info สำหรับเปิดดูเกณฑ์ (ภาษาคน) ย้ายมาด้านบนขวา */}
                  <button
                    onClick={() => handleOpenDetailMetric(card.key)}
                    title="ดูคำอธิบายเกณฑ์ความเหมาะสม"
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <Info size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* ตัวเลขหลัก + สถานะ */}
                <div className="z-10 animate-fade-in">
                  <div className="flex justify-between items-center mb-1.5 gap-1.5">
                    <span 
                      className="font-black tracking-tighter uppercase leading-none whitespace-nowrap text-[8.8px] xs:text-[9.8px] sm:text-[10.2px] md:text-[11px] lg:text-[11.8px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {card.title}
                    </span>
                    <span className={`px-1.5 py-0.5 border rounded-full text-[8.2px] xs:text-[9px] font-black shrink-0 transition-colors whitespace-nowrap ${badgeColor}`}>
                      {badgeStatus}
                    </span>
                  </div>
                  <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${styles.valueColor}`}>
                    {latestData ? card.value : '---'}
                    <span className="text-sm md:text-base font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{card.unit}</span>
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
                </div>

                {/* Sparkline */}
                <div className="h-12 w-full mt-2">
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
                  {isNight ? 'ไม่มีการประเมินสภาพแวดล้อมในช่วงกลางคืน' : (cardDiag ? getHumanFriendlyRecommendation(card.key, cardDiag.state) : 'กำลังวิเคราะห์...')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

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
            {activeDetailMetric === 'ppfd' && viewPpfdFormula ? (
              // หน้าจอสูตรคำนวณ PPFD
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                      <Sun size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-black" style={{ color: 'var(--text-primary)' }}>
                        สูตรการแปลงค่าแสง PPFD
                      </h3>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        การแปลงหน่วยความสว่างทั่วไป (Lux) เป็นความเข้มแสงพืช (PPFD)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewPpfdFormula(false)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="กลับไปหน้าเกณฑ์ความเหมาะสม"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div
                  className="border p-4 rounded-2xl space-y-4"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="text-xs font-black font-mono" style={{ color: 'var(--text-value)' }}>
                    สูตร: PPFD (μmol/m²/s) = LUX × 0.0185 (ตัวคูณสำหรับแสงแดดธรรมชาติ)
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--text-muted)' }}>ค่าความสว่างปัจจุบัน:</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{lux.toLocaleString()} LUX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--text-muted)' }}>ตัวคูณแปลงค่าแสงแดด (Daylight Factor):</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>× 0.0185</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-600 dark:text-amber-500 text-sm">ผลลัพธ์ PPFD ที่ได้:</span>
                      <span className="font-black text-amber-600 dark:text-amber-500 text-base">{ppfd.toLocaleString()} μmol/m²/s</span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    ตัวคูณแสงธรรมชาติแบบคงที่อ้างอิงจากมาตรฐานโรงเรือนคือ <strong>0.0185</strong> เพื่อแปลงจากระดับความสว่างทั่วไปที่ตาคนรับรู้ (Lux) ไปเป็นปริมาณโฟตอนแสงที่ใบพืชนำไปใช้สังเคราะห์แสงได้จริง (PPFD)
                  </p>
                </div>
              </div>
            ) : (
              // หน้าจอเกณฑ์ปกติ
              <div className="space-y-4">
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

                {/* ปุ่มแสดงสูตรคำนวณ PPFD สำหรับการ์ด PPFD */}
                {activeDetailMetric === 'ppfd' && (
                  <button
                    onClick={() => setViewPpfdFormula(true)}
                    className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-500 rounded-xl text-xs font-black transition-all border border-amber-200 dark:border-amber-500/30 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚙️ สูตรคำนวณ PPFD</span>
                  </button>
                )}

                {/* ปุ่มปิด */}
                <button
                  onClick={() => setActiveDetailMetric(null)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span>ปิดหน้าต่างนี้</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
