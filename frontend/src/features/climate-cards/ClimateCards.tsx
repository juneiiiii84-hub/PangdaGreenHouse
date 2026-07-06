import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info } from 'lucide-react';
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

// ข้อมูล tooltip ค่าเหมาะสมและผลกระทบต่อพืช
const tooltipData: Record<string, { title: string; lines: string[] }> = {
  temp: {
    title: 'เกณฑ์ความเหมาะสม (อุณหภูมิ)',
    lines: [
      '🟢 เหมาะสมมาก: 25 — 30 °C',
      '🔵 เหมาะสม: 22—24 / 31—32 °C',
      '🟡 เฝ้าระวัง: 20—21 / 33—35 °C',
      '🔴 ไม่เหมาะสม: <20 / >35 °C'
    ]
  },
  hum: {
    title: 'เกณฑ์ความชื้นสัมพัทธ์ (RH)',
    lines: [
      '🟢 เหมาะสมมาก: 60 — 80 %RH',
      '🔵 เหมาะสม: 50—59 / 81—85 %RH',
      '🟡 เฝ้าระวัง: 40—49 / 86—90 %RH',
      '🔴 ไม่เหมาะสม: <40 / >90 %RH'
    ]
  },
  vpd: {
    title: 'เกณฑ์แรงดันไอน้ำ (VPD)',
    lines: [
      '🟢 เหมาะสมมาก: 0.4 — 0.8 kPa',
      '🔵 เหมาะสม: 0.3 / 0.9—1.2 kPa',
      '🟡 เฝ้าระวัง: 0.2 / 1.3—1.6 kPa',
      '🔴 ไม่เหมาะสม: <0.2 / >1.6 kPa'
    ]
  },
  ppfd: {
    title: 'เกณฑ์แสงพืช (PPFD)',
    lines: [
      '🟢 เหมาะสมมาก: 400 — 800 μmol',
      '🔵 เหมาะสม: 300—399 / 801—950 μmol',
      '🟡 เฝ้าระวัง: 200—299 / 951—1100 μmol',
      '🔴 ไม่เหมาะสม: <200 / >1100 μmol'
    ]
  },
  lux: {
    title: 'เกณฑ์ความสว่าง (Lux)',
    lines: [
      '🟢 เหมาะสมมาก: 21,600 — 43,200 Lux',
      '🔵 เหมาะสม: 16,200—21,599 / 43,201—51,350 Lux',
      '🟡 เฝ้าระวัง: 10,800—16,199 / 51,351—59,450 Lux',
      '🔴 ไม่เหมาะสม: <10,800 / >59,450 Lux'
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
          onClick={() => setIsModalOpen(true)}
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
          const tip = tooltipData[card.key];

          return (
            <div key={idx} className="flex flex-col gap-2">
              {/* การ์ดหลักแสดงค่าตัวเลข */}
              <div
                className={`border-2 ${styles.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden flex-grow theme-transition`}
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {/* แสงหัวการ์ด */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${styles.bgGlow}`} />

                {/* หัวการ์ด: ไอคอน + tooltip + ปุ่มข้อมูล */}
                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${styles.iconBg} ${styles.textColor}`}>
                      {card.icon}
                    </div>
                    {/* Tooltip ค่าเหมาะสม */}
                    {tip && (
                      <div className="tooltip-container">
                        <div className={`p-1.5 rounded-lg cursor-help transition-colors ${theme === 'night' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                          <Info size={13} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div className="tooltip-content">
                          <div className="font-black text-xs mb-2 border-b pb-1 border-slate-700">{tip.title}</div>
                          <div className="space-y-1 text-[10px] font-medium leading-relaxed">
                            {tip.lines.map((line, lIdx) => (
                              <div key={lIdx}>{line}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {card.action}
                </div>

                {/* ตัวเลขหลัก + สถานะ */}
                <div className="z-10">
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
                  <Line data={card.sparkline} options={sparklineOptions} />
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
    </>
  );
};
