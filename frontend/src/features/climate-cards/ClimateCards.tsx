import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info, X } from 'lucide-react';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { SensorData, DiagnosticsResponse } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';



// คำอธิบายเกณฑ์ความเหมาะสมอ้างอิงตารางประเมิน แปลเป็นภาษาคนพูดเข้าใจง่าย
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
    description: 'ระดับความสว่างรวมรอบๆ เซนเซอร์ (แปลงเกณฑ์มาจากค่าหลัก PPFD)',
    unit: 'Lux',
    list: [
      { status: 'เหมาะสมมาก', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', range: '13,378 — 26,756 Lux', effect: 'ความสว่างรอบข้างดีเลิศ พืชสังเคราะห์แสงได้สมบูรณ์' },
      { status: 'เหมาะสม', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', range: '10,033 — 13,377 Lux หรือ 26,757 — 31,773 Lux', effect: 'ความสว่างอยู่ในระดับปกติ พืชเจริญเติบโตได้อย่างราบรื่น' },
      { status: 'เฝ้าระวัง', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', range: '6,689 — 10,032 Lux หรือ 31,774 — 36,789 Lux', effect: 'แสงสลัวพืชสังเคราะห์แสงได้ช้าลง หรือแดดเริ่มแรงขึ้นจนอุณหภูมิใบสูง' },
      { status: 'ไม่เหมาะสม', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', range: 'ต่ำกว่า 6,689 Lux หรือสูงกว่า 36,789 Lux', effect: 'มืดเกินไปจนไม่เติบโต หรือแสงจ้าจัดแผดเผาจนผิวใบเสียหาย' },
    ]
  }
};

interface ClimateCardsProps {
  latestData: SensorData | null;
  history: SensorData[];
  diagnosticsData: DiagnosticsResponse | null;
  theme: ThemePeriod;
  isInitialLoaded?: boolean;
}

export const ClimateCards: React.FC<ClimateCardsProps> = ({ latestData, history, diagnosticsData, theme, isInitialLoaded = true }) => {
  const [activeDetailMetric, setActiveDetailMetric] = useState<'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux' | null>(null);
  const [viewPpfdFormula, setViewPpfdFormula] = useState(false);
  const multiplier = DEFAULT_MULTIPLIER;

  const handleOpenDetailMetric = (key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux') => {
    setViewPpfdFormula(false);
    setActiveDetailMetric(key);
  };

  const getMetricDiagnostics = (
    key: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux',
    value: number
  ) => {
    let state: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
    let recommendation = '';

    let roundedValue = value;
    if (key === 'temp' || key === 'hum' || key === 'ppfd') {
      roundedValue = Math.round(value * 10) / 10;
    } else if (key === 'vpd') {
      roundedValue = Math.round(value * 100) / 100;
    } else if (key === 'lux') {
      roundedValue = Math.round(value);
    }

    if (key === 'temp') {
      if (roundedValue >= 25 && roundedValue <= 30) {
        state = 'excellent';
        recommendation = 'รักษาเสถียรภาพความร้อนในห้องควบคุมให้อยู่ในช่วงนี้ต่อไป';
      } else if ((roundedValue >= 22 && roundedValue <= 24.9) || (roundedValue >= 30.1 && roundedValue <= 32)) {
        state = 'good';
        recommendation = 'คอยสังเกตแนวโน้ม ไม่ให้อุณหภูมิผันผวนขึ้นหรือลงเร็วเกินไปในช่วงวัน';
      } else if ((roundedValue >= 20 && roundedValue <= 21.9) || (roundedValue >= 32.1 && roundedValue <= 35)) {
        state = 'warning';
        recommendation = roundedValue > 32
          ? 'อุณหภูมิค่อนข้างสูง: แนะนำให้เปิดพัดลมระบายอากาศ (Exhaust Fan) หรือเพิ่มการไหลเวียนของลม'
          : 'อุณหภูมิค่อนข้างต่ำ: ควรลดระดับพัดลมระบายอากาศเพื่อสะสมความร้อนภายในโรงเรือน';
      } else {
        state = 'critical';
        recommendation = roundedValue > 35
          ? 'อุณหภูมิสูงเกินไป: แนะนำให้เปิดพัดลมระบายอากาศทันที เปิดระบบพ่นละอองหมอกน้ำ และกางสแลนกรองแสง 50%'
          : 'อุณหภูมิต่ำเกินไป: ควรปิดพัดลมระบายอากาศทั้งหมด หรือเปิดระบบเครื่องทำความร้อน (Heater) เพื่อเพิ่มความอบอุ่น';
      }
    } else if (key === 'hum') {
      if (roundedValue >= 60 && roundedValue <= 80) {
        state = 'excellent';
        recommendation = 'ความชื้นดีเยี่ยม: เหมาะสมกับการเปิดปากใบดูดซึมปุ๋ยและสารอาหารอย่างราบรื่น';
      } else if ((roundedValue >= 50 && roundedValue <= 59.9) || (roundedValue >= 80.1 && roundedValue <= 85)) {
        state = 'good';
        recommendation = 'ข้อมูลปกติ: คอยดูแนวโน้มความชื้นไม่ให้อิ่มตัวในช่วงกลางคืน';
      } else if ((roundedValue >= 40 && roundedValue <= 49.9) || (roundedValue >= 85.1 && roundedValue <= 90)) {
        state = 'warning';
        recommendation = roundedValue > 85
          ? 'ความชื้นสูงเกินเกณฑ์: แนะนำให้เปิดพัดลมหมุนเวียนอากาศภายในเพื่อช่วยลดความแฉะสะสม'
          : 'ความชื้นต่ำเกินเกณฑ์: แนะนำให้สเปรย์น้ำหรือเปิดระบบพ่นหมอกเป็นรอบสั้นๆ เพิ่มความชื้นในอากาศ';
      } else {
        state = 'critical';
        recommendation = roundedValue > 90
          ? 'ความชื้นสูงวิกฤต: เสี่ยงโรคราใบไม้และเน่าคอดิน แนะนำเปิดพัดลมระบายอากาศ 100% และหยุดให้น้ำชั่วคราว'
          : 'ความชื้นต่ำวิกฤต: พืชคายน้ำเร็วจนเฉา แนะนำให้เปิดระบบเครื่องพ่นหมอกเต็มกำลังเพื่อดึงระดับความชื้นสัมพัทธ์ขึ้นด่วน';
      }
    } else if (key === 'vpd') {
      if (roundedValue >= 0.4 && roundedValue <= 0.8) {
        state = 'excellent';
        recommendation = 'ระดับแรงดันไอดีเลิศ: ช่วยรักษาอัตราการไหลเวียนของน้ำและธาตุอาหารภายในต้นพืชอย่างมีประสิทธิภาพ';
      } else if ((roundedValue >= 0.3 && roundedValue <= 0.39) || (roundedValue >= 0.81 && roundedValue <= 1.2)) {
        state = 'good';
        recommendation = 'ตรวจสอบความชื้นและอุณหภูมิสม่ำเสมอเพื่อประคองระดับค่าแรงดันไอ';
      } else if ((roundedValue >= 0.2 && roundedValue <= 0.29) || (roundedValue >= 1.21 && roundedValue <= 1.6)) {
        state = 'warning';
        recommendation = roundedValue > 1.2
          ? 'VPD ค่อนข้างสูง (อากาศแห้ง): แนะนำสเปรย์ละอองน้ำฝอยเพื่อลดค่า VPD ลงมาให้อยู่ในเกณฑ์เหมาะสม'
          : 'VPD ค่อนข้างต่ำ (อากาศชื้น): แนะนำเปิดระบบระบายลมไหลผ่านใบพืชเพื่อขับไล่ไอน้ำสะสมรอบๆ ใบ';
      } else {
        state = 'critical';
        recommendation = roundedValue > 1.6
          ? 'VPD สูงวิกฤต: พืชปิดปากใบเสี่ยงเกิดภาวะขาดสารอาหารฉับพลัน แนะนำให้กางสแลนกรองแสงลงและพ่นหมอกลดความแห้งแล้งทันที'
          : 'VPD ต่ำวิกฤต: ความชื้นอิ่มตัวจนพืชไม่คายน้ำ แนะนำให้หยุดให้น้ำทางดิน เปิดพัดลมเป่าระบายหมุนเวียนลมรอบต้นพืชด่วน';
      }
    } else if (key === 'ppfd') {
      if (roundedValue >= 400 && roundedValue <= 800) {
        state = 'excellent';
        recommendation = 'แสงเหมาะสมมาก: ให้พลังงานแสงที่เพียงพอ พืชเติบโตได้อย่างรวดเร็วและแข็งแรง';
      } else if ((roundedValue >= 300 && roundedValue <= 399.9) || (roundedValue >= 800.1 && roundedValue <= 950)) {
        state = 'good';
        recommendation = 'แสงข้อมูลปกติ: คอยดูค่าความเข้มแสงในช่วงบ่ายเพื่อหลีกเลี่ยงภาวะแสงจ้าเกินจำเป็น';
      } else if ((roundedValue >= 200 && roundedValue <= 299.9) || (roundedValue >= 950.1 && roundedValue <= 1100)) {
        state = 'warning';
        recommendation = roundedValue > 950
          ? 'แสงจ้าเกินไป: แนะนำให้เปิดใช้งานระบบตาข่ายแรเงา (Shading Net) เพื่อป้องกันความเครียดสะสมบนใบ'
          : 'แสงค่อนข้างสลัว: แนะนำเปิดไฟส่องสว่างช่วยปลูก (Grow Lights) เสริมความเข้มแสงให้เพียงพอ';
      } else {
        state = 'critical';
        recommendation = roundedValue > 1100
          ? 'แสงแดดจัดแผดเผาเกรียม: แนะนำกางสแลนกรองแสงอย่างน้อย 50% หรือสเปรย์หมอกน้ำกำบังความร้อนเฉียบพลันด่วน'
          : 'แสงมืดสลัวรุนแรง: อัตราแลกธาตุพืชหยุดชะงัก แนะนำเปิดหลอดไฟช่วยปลูก (Grow Lights) เสริมประสิทธิภาพแสงสูงสุดทันที';
      }
    } else if (key === 'lux') {
      const ppfdVal = roundedValue * DEFAULT_MULTIPLIER;
      if (ppfdVal >= 400 && ppfdVal <= 800) {
        state = 'excellent';
        recommendation = 'ระดับแสงเหมาะสมมากสำหรับการเจริญเติบโตของพืช';
      } else if ((ppfdVal >= 300 && ppfdVal <= 399.9) || (ppfdVal >= 800.1 && ppfdVal <= 950)) {
        state = 'good';
        recommendation = 'ระดับแสงปกติ สังเกตแนวโน้มของแสงแดดในช่วงกลางวัน';
      } else if ((ppfdVal >= 200 && ppfdVal <= 299.9) || (ppfdVal >= 950.1 && ppfdVal <= 1100)) {
        state = 'warning';
        recommendation = ppfdVal > 950
          ? 'แสงเริ่มแรงเกินไป: แนะนำให้เตรียมกางสแลนกรองแสงเพื่อชะลอความร้อนสะสม'
          : 'แสงค่อนข้างสลัว: พืชสังเคราะห์แสงได้ช้าลงเล็กน้อย';
      } else {
        state = 'critical';
        recommendation = ppfdVal > 1100
          ? 'แสงแดดจัดแผดเผา: แนะนำให้กางสแลนกรองแสงอย่างน้อย 50% หรือเปิดพัดลมสเปรย์หมอกน้ำเพื่อกำบังความร้อนเฉียบพลันด่วน'
          : 'แสงมืดสลัวรุนแรง: อัตราแลกธาตุพืชหยุดชะงัก แนะนำเปิดหลอดไฟช่วยปลูก (Grow Lights) เสริมประสิทธิภาพแสงสังเคราะห์';
      }
    }

    const statusMap = {
      excellent: 'เหมาะสมมาก',
      good: 'เหมาะสม',
      warning: 'เฝ้าระวัง',
      critical: 'ไม่เหมาะสม'
    };

    const colorMap = {
      excellent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      good: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };

    return {
      state,
      status: statusMap[state],
      color: colorMap[state],
      recommendation
    };
  };

  const temp = latestData ? latestData.temperature : 0;
  const hum = latestData ? latestData.humidity : 0;
  const vpd = latestData ? latestData.vpd : 0;
  const lux = latestData ? latestData.lux : 0;
  const ppfd = parseFloat((lux * multiplier).toFixed(2));

  const diagnostics = diagnosticsData?.diagnostics;

  const createSparklineData = (metric: 'temperature' | 'humidity' | 'vpd' | 'ppfd' | 'lux', color: string) => {
    const points = history.slice(-12).map(h => {
      if (metric === 'ppfd') return h.lux * multiplier;
      if (metric === 'lux') return h.lux;
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
    const diag = diagnostics?.[key];
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
          hum: { border: 'border-blue-200', glow: 'bg-blue-500/5', ibg: 'bg-blue-50 border-blue-100', tc: 'text-blue-500', vc: 'text-blue-600', rbg: 'bg-blue-50/40 border border-blue-100/70', rtc: 'text-blue-800', rtc2: 'text-blue-600/90' },
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
      title: 'ความส่องสว่าง (LUX)',
      subtitle: 'เซนเซอร์แสง BH1750',
      value: `${lux.toLocaleString()}`,
      unit: 'Lux',
      desc: 'ระดับความสว่างทั่วไปที่สายตามนุษย์รับรู้',
      icon: <Sun size={16} />,
      sparkColor: '#eab308',
      sparkline: createSparklineData('lux', '#eab308'),
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {cards.map((card, idx) => {
          const isNight = theme === 'night';
          const valueMap = { temp, hum, vpd, ppfd, lux };
          const cardDiag = (isNight || !latestData) ? null : getMetricDiagnostics(card.key, valueMap[card.key]);
          const styles = getDynamicStyles(card.key, cardDiag?.state);

          const badgeStatus = isNight ? 'ไม่มีการประเมิน' : (cardDiag ? cardDiag.status : 'ออฟไลน์');
          
          const isCritical = !isNight && cardDiag?.state === 'critical';
          const isWarning = !isNight && cardDiag?.state === 'warning';
          const glowClass = isCritical ? 'glow-critical' : (isWarning ? 'glow-warning' : '');

          const badgeColor = isNight 
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800' 
            : (cardDiag ? `${cardDiag.color} ${glowClass}` : 'bg-slate-100 text-slate-400 border-slate-200');

          const cardBorderColor = isNight ? 'border-slate-200 dark:border-slate-800/80 shadow-none' : styles.borderColor;
          const cardBgGlow = isNight ? 'opacity-0' : styles.bgGlow;

          return (
            <div key={idx} className="flex flex-col gap-2">
              {/* การ์ดหลักแสดงค่าตัวเลข */}
              <div
                className={`border-2 ${cardBorderColor} rounded-2xl p-4 shadow-sm card-dimensional flex flex-col justify-between space-y-3 relative overflow-hidden flex-grow theme-transition`}
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {/* แสงหัวการ์ด */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${cardBgGlow}`} />

                {/* หัวการ์ด: ไอคอน + สถานะประเมิน */}
                <div className="flex justify-between items-center z-10">
                  <div className={`p-2 rounded-xl border ${styles.iconBg} ${styles.textColor}`}>
                    {card.icon}
                  </div>
                  <span className={`px-2 py-0.5 border rounded-full text-[9px] sm:text-[9.5px] md:text-[10px] font-black shrink-0 transition-colors whitespace-nowrap ${badgeColor}`}>
                    {badgeStatus}
                  </span>
                </div>

                {/* ตัวเลขหลัก + ชื่อหัวข้อ + ปุ่มข้อมูล */}
                <div className="z-10">
                  <div className="flex items-center mb-1.5 gap-1.5">
                    <span 
                      className={`font-black uppercase leading-tight whitespace-normal sm:whitespace-nowrap ${
                        card.title.length > 25 
                          ? 'text-[10.2px] sm:text-[11.5px] md:text-[12px] lg:text-[12.5px] xl:text-[13px] tracking-tighter' 
                          : 'text-[11.5px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[13.5px] tracking-tight'
                      }`}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {card.title}
                    </span>
                    {/* ปุ่ม Info สำหรับเปิดดูเกณฑ์ (ภาษาคน) ย้ายมาด้านข้างหัวข้อ */}
                    <button
                      onClick={() => handleOpenDetailMetric(card.key)}
                      title="ดูคำอธิบายเกณฑ์ความเหมาะสม"
                      className={`p-1 rounded-md cursor-pointer transition-colors shrink-0 ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                      <Info size={12} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${styles.valueColor}`}>
                    {!isInitialLoaded ? (
                      <span className="skeleton inline-block w-20 h-8 align-middle" />
                    ) : (
                      <>{latestData ? card.value : '---'}<span className="text-sm md:text-base font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{card.unit}</span></>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-[10.5px] md:text-xs mt-1 font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
                </div>

                {/* Sparkline */}
                <div className="h-12 w-full mt-2">
                  <Line 
                    data={createSparklineData(
                      card.key === 'temp' ? 'temperature' :
                      card.key === 'hum' ? 'humidity' :
                      card.key === 'vpd' ? 'vpd' :
                      card.key === 'lux' ? 'lux' : 'ppfd', 
                      card.sparkColor
                    )} 
                    options={sparklineOptions} 
                  />
                </div>
              </div>

              {/* กล่องคำแนะนำ */}
              <div
                className="rounded-xl p-3 shadow-md text-xs flex flex-col gap-1 min-h-[64px] justify-center card-dimensional border theme-transition"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-card)',
                }}
              >
                <div className="font-black flex items-center gap-1 text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <span>💡 คำแนะนำ:</span>
                </div>
                <p className="font-semibold leading-relaxed text-[10px] sm:text-[11px] md:text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {isNight 
                    ? 'ระบบงดการประเมินในช่วงเวลากลางคืน' 
                    : (cardDiag ? cardDiag.recommendation : 'ไม่สามารถประเมินได้เนื่องจากเซนเซอร์ออฟไลน์')}
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
                    สูตร: PPFD (μmol/m²/s) = LUX × {multiplier} (ตัวคูณปรับจูนค่าแสงพืช)
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--text-muted)' }}>ค่าความสว่างปัจจุบัน:</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{lux.toLocaleString()} LUX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--text-muted)' }}>ตัวคูณแปลงค่าแสง (Calibration Factor):</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>× {multiplier}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-600 dark:text-amber-500 text-sm">ผลลัพธ์ PPFD ที่ได้:</span>
                      <span className="font-black text-amber-600 dark:text-amber-500 text-base">{ppfd.toLocaleString()} μmol/m²/s</span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    ตัวคูณปรับจูนค่าแสงที่จูนให้ตรงกับเครื่องวัดมาตรฐานคือ <strong>{multiplier}</strong> เพื่อแปลงจากระดับความสว่าง (Lux) ไปเป็นปริมาณโฟตอนแสงที่ใบพืชนำไปใช้สังเคราะห์แสงได้จริง (PPFD)
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`w-[82px] text-center py-1 rounded-full text-[10px] font-black border uppercase whitespace-nowrap flex-shrink-0 ${item.color}`}>
                          {item.status}
                        </span>
                        <span className="text-xs font-black font-mono whitespace-nowrap" style={{ color: 'var(--text-value)' }}>
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
