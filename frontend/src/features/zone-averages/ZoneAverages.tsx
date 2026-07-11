import React, { useState } from 'react';
import { Thermometer, Droplets, Wind, Sun, SunMedium, Moon } from 'lucide-react';
import type { SensorData } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';
import { isDayTime, isNightTime } from '../../shared/utils/useTheme';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';

type AveragePeriod = 'all' | 'day' | 'night';

interface ZoneAveragesProps {
  dataList: SensorData[];
  theme: ThemePeriod;
}

export const ZoneAverages: React.FC<ZoneAveragesProps> = ({ dataList, theme }) => {
  const [averagePeriod, setAveragePeriod] = useState<AveragePeriod>('all');

  // กรองข้อมูลตามช่วงเวลาที่เลือก (คำนวณเฉพาะโซนในร่ม A-D เท่านั้น ไม่นับโซน E ที่อยู่ด้านนอก)
  const getFilteredData = () => {
    const now = new Date().getTime();
    // กรองเฉพาะข้อมูลที่รายงานเข้ามาภายใน 15 นาทีล่าสุด (ป้องกันข้อมูลเก่าจากเซนเซอร์ที่ออฟไลน์หรือข้อมูลจำลองในอดีต)
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
    // รวมโซน A-D (ยกเว้นโซน E ที่อยู่ด้านนอก) และเฉลี่ยตรงๆ จากข้อมูลทั้งหมดที่กรองแล้วตามช่วงเวลา
    if (filteredData.length === 0) return null;

    const sumTemp = filteredData.reduce((s, d) => s + d.temperature, 0);
    const sumHum = filteredData.reduce((s, d) => s + d.humidity, 0);
    const sumVpd = filteredData.reduce((s, d) => s + d.vpd, 0);
    const sumPpfd = filteredData.reduce((s, d) => s + (d.lux * DEFAULT_MULTIPLIER), 0);
    const count = filteredData.length;

    return {
      temp: sumTemp / count,
      humidity: sumHum / count,
      vpd: sumVpd / count,
      ppfd: sumPpfd / count,
    };
  };

  const avg = getGreenhouseAverage();

  const periodLabel = averagePeriod === 'day' ? ' (กลางวัน 06:30-18:30)' : averagePeriod === 'night' ? ' (กลางคืน 18:30-06:30)' : '';

  const metricCards = [
    { label: 'อุณหภูมิอากาศ', value: avg ? `${avg.temp.toFixed(1)}` : '---', unit: '°C', icon: <Thermometer size={18} className="text-rose-500" />, bgIcon: 'bg-rose-50 border-rose-100' },
    { label: 'ความชื้นสัมพัทธ์ (%RH)', value: avg ? `${avg.humidity.toFixed(1)}` : '---', unit: '%RH', icon: <Droplets size={18} className="text-blue-500" />, bgIcon: 'bg-blue-50 border-blue-100' },
    { label: 'ความต่างของความดันไอน้ำ (VPD)', value: avg ? `${avg.vpd.toFixed(2)}` : '---', unit: 'kPa', icon: <Wind size={18} className="text-purple-500" />, bgIcon: 'bg-purple-50 border-purple-100' },
    { label: 'ค่าแสงที่พืชได้รับ (PPFD)', value: avg ? `${avg.ppfd.toFixed(1)}` : '---', unit: 'μmol/m²/s', icon: <Sun size={18} className="text-amber-500" />, bgIcon: 'bg-amber-50 border-amber-100' },
  ];

  return (
    <section
      className="border rounded-[32px] p-5 shadow-xl space-y-5 theme-transition"
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
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
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

      {/* การ์ดค่าเฉลี่ยรวม — แสดงเต็มความกว้าง */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((m, idx) => (
          <div
            key={idx}
            className="border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all theme-transition"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${m.bgIcon}`}>
                {m.icon}
              </div>
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </span>
            </div>
            <div className="font-black font-mono text-2xl md:text-3xl" style={{ color: 'var(--text-value)' }}>
              {m.value}
              <span className="text-sm font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] md:text-xs font-bold leading-normal mt-2" style={{ color: 'var(--text-muted)' }}>
        *หมายเหตุ: คำนวณจากโซนภายในโรงเรือน (A, B, C, D) โดยไม่นำโซน E มาร่วมคำนวณเนื่องจากเป็นพื้นที่เปรียบเทียบภายนอก
      </p>
    </section>
  );
};
