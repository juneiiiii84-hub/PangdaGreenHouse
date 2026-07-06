import React from 'react';
import { Home } from 'lucide-react';
import type { ThemePeriod } from '../../shared/utils/useTheme';

interface ControlPanelProps {
  selectedZone: number;
  onZoneSelect: (zone: number) => void;
  theme: ThemePeriod;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selectedZone, onZoneSelect, theme }) => {
  const zones = [
    { id: 1, name: 'โซน A', desc: 'ล่างซ้าย (South-West)', color: 'bg-emerald-500' },
    { id: 2, name: 'โซน B', desc: 'ล่างขวา (South-East)', color: 'bg-blue-500' },
    { id: 3, name: 'โซน C', desc: 'บนซ้าย (North-West)', color: 'bg-purple-500' },
    { id: 4, name: 'โซน D', desc: 'ตรงกลาง (Center)', color: 'bg-amber-500' },
    { id: 5, name: 'โซน E', desc: 'บนขวา (North-East)', color: 'bg-pink-500' },
  ];

  return (
    <div
      className="rounded-[28px] p-4 md:p-5 shadow-lg space-y-4 border theme-transition"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        boxShadow: `0 10px 40px ${theme === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.5)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500 rounded-xl shadow-md shadow-emerald-500/20">
          <Home size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm md:text-base font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>เลือกโซนโรงเรือน</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>กดเลือกโซนที่ต้องการดูข้อมูล</p>
        </div>
      </div>

      {/* ปุ่มเลือกโซน */}
      <div className="grid grid-cols-5 gap-2.5">
        {zones.map((zone) => (
          <button
            key={zone.id}
            id={`zone-btn-${zone.id}`}
            onClick={() => onZoneSelect(zone.id)}
            className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-center transition-all cursor-pointer border ${
              selectedZone === zone.id
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                : 'border-transparent font-bold hover:opacity-80'
            }`}
            style={selectedZone !== zone.id ? {
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-muted)',
            } : undefined}
          >
            {/* จุดสีบ่งชี้โซน */}
            <span className={`h-2 w-2 rounded-full ${selectedZone === zone.id ? 'bg-white animate-pulse' : zone.color}`} />
            <span className="text-xs md:text-sm leading-none">{zone.name}</span>
          </button>
        ))}
      </div>

      {/* คำอธิบายโซนที่เลือก */}
      <div
        className="text-xs md:text-sm px-4 py-2.5 rounded-2xl text-center font-black border theme-transition"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-card)',
          color: 'var(--text-secondary)',
        }}
      >
        📍 <span className="text-emerald-500">{zones.find(z => z.id === selectedZone)?.desc}</span>
      </div>
    </div>
  );
};
