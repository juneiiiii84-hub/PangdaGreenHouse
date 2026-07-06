import React, { useState } from 'react';
import { Thermometer, Droplets, Wind, Sun, SunMedium, Moon } from 'lucide-react';
import type { SensorData } from '../../services/api';
import type { ThemePeriod } from '../../shared/utils/useTheme';
import { isDayTime, isNightTime } from '../../shared/utils/useTheme';

type AveragePeriod = 'all' | 'day' | 'night';

interface ZoneAveragesProps {
  dataList: SensorData[];
  theme: ThemePeriod;
}

export const ZoneAverages: React.FC<ZoneAveragesProps> = ({ dataList, theme }) => {
  const [averagePeriod, setAveragePeriod] = useState<AveragePeriod>('all');

  // กรองข้อมูลตามช่วงเวลาที่เลือก
  const getFilteredData = () => {
    switch (averagePeriod) {
      case 'day':
        return dataList.filter(d => isDayTime(d.created_at));
      case 'night':
        return dataList.filter(d => isNightTime(d.created_at));
      default:
        return dataList;
    }
  };

  const filteredData = getFilteredData();

  const getGreenhouseAverage = () => {
    const activeZones = [1, 2, 3, 4, 5]; // รวมโซน 5
    const zoneAvgs = activeZones
      .map(id => {
        const zoneData = filteredData.filter(d => d.zone === id);
        if (zoneData.length === 0) return null;
        return {
          temp: zoneData.reduce((s, d) => s + d.temperature, 0) / zoneData.length,
          humidity: zoneData.reduce((s, d) => s + d.humidity, 0) / zoneData.length,
          vpd: zoneData.reduce((s, d) => s + d.vpd, 0) / zoneData.length,
          ppfd: zoneData.reduce((s, d) => s + d.ppfd, 0) / zoneData.length,
          count: zoneData.length,
        };
      })
      .filter((avg): avg is NonNullable<typeof avg> => avg !== null);

    if (zoneAvgs.length === 0) return null;

    return {
      temp: zoneAvgs.reduce((s, a) => s + a.temp, 0) / zoneAvgs.length,
      humidity: zoneAvgs.reduce((s, a) => s + a.humidity, 0) / zoneAvgs.length,
      vpd: zoneAvgs.reduce((s, a) => s + a.vpd, 0) / zoneAvgs.length,
      ppfd: zoneAvgs.reduce((s, a) => s + a.ppfd, 0) / zoneAvgs.length,
      count: zoneAvgs.reduce((s, a) => s + a.count, 0),
      zoneCount: zoneAvgs.length,
    };
  };

  const avg = getGreenhouseAverage();

  const periodLabel = averagePeriod === 'day' ? 'กลางวัน (06:30-18:30)' : averagePeriod === 'night' ? 'กลางคืน (18:30-06:30)' : 'ทั้งหมด';

  const metricCards = [
    { label: 'อุณหภูมิ', value: avg ? `${avg.temp.toFixed(1)}` : '---', unit: '°C', icon: <Thermometer size={18} className="text-rose-500" />, bgIcon: 'bg-rose-50 border-rose-100' },
    { label: 'ความชื้น', value: avg ? `${avg.humidity.toFixed(1)}` : '---', unit: '%RH', icon: <Droplets size={18} className="text-blue-500" />, bgIcon: 'bg-blue-50 border-blue-100' },
    { label: 'VPD', value: avg ? `${avg.vpd.toFixed(2)}` : '---', unit: 'kPa', icon: <Wind size={18} className="text-purple-500" />, bgIcon: 'bg-purple-50 border-purple-100' },
    { label: 'PPFD', value: avg ? `${avg.ppfd.toFixed(1)}` : '---', unit: 'μmol/m²/s', icon: <Sun size={18} className="text-amber-500" />, bgIcon: 'bg-amber-50 border-amber-100' },
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
            ค่าเฉลี่ยอากาศและแสงจากโซน 1-5 ({periodLabel})
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

      {/* ข้อมูลสรุป */}
      <div
        className="text-xs font-bold border-t pt-3 flex flex-wrap justify-between items-center gap-2 theme-transition"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <span>ข้อมูลจาก {avg?.zoneCount ?? 0} โซน</span>
        <span
          className="px-2 py-0.5 rounded-full font-mono font-bold text-xs"
          style={{
            backgroundColor: theme === 'night' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
            color: '#10b981',
          }}
        >
          {avg ? `${avg.count} รายการ` : '0 รายการ'}
        </span>
      </div>
    </section>
  );
};
