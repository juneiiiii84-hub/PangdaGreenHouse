import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info } from 'lucide-react';
import { PpfdModal } from './PpfdModal';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { SensorData, DiagnosticsResponse } from '../../services/api';

const simplifyRecommendation = (text: string): string => {
  if (!text) return 'กำลังวิเคราะห์สภาวะแวดล้อม...';
  
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
  if (text.includes('แสงมืดสลัวรุนแรง') || text.includes('แสงมืดสลัว')) return '🚨 มืดจัดวิกฤต: การโตชะงัก เปิดไฟช่วยปลูก (Grow Lights) ทันที';

  return text;
};

interface ClimateCardsProps {
  latestData: SensorData | null;
  history: SensorData[];
  diagnosticsData: DiagnosticsResponse | null;
}

export const ClimateCards: React.FC<ClimateCardsProps> = ({ latestData, history, diagnosticsData }) => {
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
      title: 'อุณหภูมิอากาศ',
      subtitle: 'DHT22 Sensor',
      value: `${temp.toFixed(1)}`,
      unit: '°C',
      desc: 'อุณหภูมิความร้อนแวดล้อม',
      icon: <Thermometer size={16} />,
      sparkColor: '#f43f5e',
      sparkline: createSparklineData('temperature', '#f43f5e'),
    },
    {
      key: 'hum' as const,
      title: 'ความชื้นสัมพัทธ์',
      subtitle: 'DHT22 Sensor',
      value: `${hum.toFixed(1)}`,
      unit: '%RH',
      desc: 'ระดับไอน้ำสัมพัทธ์สะสม',
      icon: <Droplets size={16} />,
      sparkColor: '#3b82f6',
      sparkline: createSparklineData('humidity', '#3b82f6'),
    },
    {
      key: 'vpd' as const,
      title: 'Vapor Pressure Deficit',
      subtitle: 'VPD (คำนวณจาก T + RH)',
      value: `${vpd.toFixed(2)}`,
      unit: 'kPa',
      desc: 'แรงดันไอขาดน้ำปากใบพืช',
      icon: <Wind size={16} />,
      sparkColor: '#a855f7',
      sparkline: createSparklineData('vpd', '#a855f7'),
    },
    {
      key: 'ppfd' as const,
      title: 'ความเข้มแสงแวดล้อม (PPFD)',
      subtitle: 'คำนวณจาก Lux * Multiplier',
      value: `${ppfd.toLocaleString()}`,
      unit: 'μmol/m²/s',
      desc: 'ความเข้มแสงสังเคราะห์แสงของพืช',
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
      title: 'ความเข้มแสงแวดล้อม (Lux)',
      subtitle: 'BH1750 Light Sensor',
      value: `${lux.toLocaleString()}`,
      unit: 'Lux',
      desc: 'ความสว่างรอบข้างรวมในโรงเรือน',
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
                className={`bg-white border-2 ${styles.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden flex-grow`}
              >
                {/* กลักแสงหัวการ์ด */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${styles.bgGlow}`} />

                {/* หัวการ์ด: ไอคอน + ปุ่มข้อมูล */}
                <div className="flex justify-between items-start z-10">
                  <div className={`p-2 rounded-xl border ${styles.iconBg} ${styles.textColor}`}>
                    {card.icon}
                  </div>
                  {card.action}
                </div>

                {/* ตัวเลขหลัก + สถานะความเหมาะสม */}
                <div className="z-10">
                  <div className="flex justify-between items-center mb-1.5 gap-1">
                    <span className="text-xs font-black tracking-wide text-slate-400 uppercase leading-none">
                      {card.title}
                    </span>
                    <span className={`px-2 py-0.5 border rounded-full text-[10.5px] font-black shrink-0 transition-colors ${
                      cardDiag ? cardDiag.color : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {cardDiag ? cardDiag.status : 'รอข้อมูล...'}
                    </span>
                  </div>
                  <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${styles.valueColor}`}>
                    {latestData ? card.value : '---'}
                    <span className="text-sm md:text-base font-bold ml-1 text-slate-400">{card.unit}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">{card.desc}</div>
                </div>

                {/* Sparkline */}
                <div className="h-12 w-full">
                  <Line data={card.sparkline} options={sparklineOptions} />
                </div>
              </div>

              {/* กล่องคำแนะนำที่เพิ่มเข้ามาด้านล่าง */}
              <div className={`rounded-xl p-3 shadow-md text-xs flex flex-col gap-1 min-h-[64px] justify-center transition-all hover:shadow-lg ${styles.recBg}`}>
                <div className={`font-black flex items-center gap-1 text-[10.5px] uppercase tracking-wider ${styles.recTitleColor}`}>
                  <span>💡 คำแนะนำ:</span>
                </div>
                <p className={`font-semibold leading-relaxed text-xs ${styles.recTextColor}`}>
                  {cardDiag ? simplifyRecommendation(cardDiag.recommendation) : 'กำลังวิเคราะห์สภาวะแวดล้อม...'}
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
