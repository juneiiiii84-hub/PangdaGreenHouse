import React from 'react';
import { Home } from 'lucide-react';

interface ControlPanelProps {
  selectedZone: number;
  onZoneSelect: (zone: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selectedZone, onZoneSelect }) => {
  const zones = [
    { id: 1, name: 'โซน 1', desc: 'ล่างซ้าย (South-West)', color: 'bg-emerald-500' },
    { id: 2, name: 'โซน 2', desc: 'ล่างขวา (South-East)', color: 'bg-blue-500' },
    { id: 3, name: 'โซน 3', desc: 'บนซ้าย (North-West)', color: 'bg-purple-500' },
    { id: 4, name: 'โซน 4', desc: 'ตรงกลาง (Center)', color: 'bg-amber-500' },
    { id: 5, name: 'โซน 5', desc: 'บนขวา (North-East)', color: 'bg-pink-500' },
  ];

  return (
    <div className="bg-white text-slate-800 rounded-[28px] p-4 md:p-5 shadow-lg shadow-slate-100/50 space-y-4 border border-slate-100/80">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500 rounded-xl shadow-md shadow-emerald-500/20">
          <Home size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm md:text-base font-black tracking-wide text-slate-800">Greenhouse Control Panel</h2>
          <p className="text-xs text-slate-400">เลือกโซนที่ต้องการดูข้อมูล</p>
        </div>
      </div>

      {/* ปุ่มเลือกโซน — เลื่อนซ้ายขวาบนมือถือ, Grid บนจอใหญ่ */}
      <div className="grid grid-cols-5 gap-2.5">
        {zones.map((zone) => (
          <button
            key={zone.id}
            id={`zone-btn-${zone.id}`}
            onClick={() => onZoneSelect(zone.id)}
            className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-center transition-all cursor-pointer border ${
              selectedZone === zone.id
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-white border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold'
            }`}
          >
            {/* จุดสีบ่งชี้โซน */}
            <span className={`h-2 w-2 rounded-full ${selectedZone === zone.id ? 'bg-white animate-pulse' : zone.color}`} />
            <span className="text-xs md:text-sm leading-none">{zone.name}</span>
          </button>
        ))}
      </div>

      {/* คำอธิบายโซนที่เลือก */}
      <div className="text-xs md:text-sm text-slate-600 bg-slate-50/50 px-4 py-2.5 rounded-2xl text-center font-black border border-slate-100/80">
        📍 <span className="text-emerald-600">{zones.find(z => z.id === selectedZone)?.desc}</span>
      </div>
    </div>
  );
};
