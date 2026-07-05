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
    <div className="bg-slate-950 text-white rounded-2xl md:rounded-[24px] p-4 md:p-5 shadow-xl shadow-slate-900/10 space-y-3 border border-slate-900">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500 rounded-xl">
          <Home size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black tracking-wide">Greenhouse Control Panel</h2>
          <p className="text-[10px] text-slate-500">เลือกโซนที่ต้องการดูข้อมูล</p>
        </div>
      </div>

      {/* ปุ่มเลือกโซน — เลื่อนซ้ายขวาบนมือถือ, Grid บนจอใหญ่ */}
      <div className="grid grid-cols-5 gap-2">
        {zones.map((zone) => (
          <button
            key={zone.id}
            id={`zone-btn-${zone.id}`}
            onClick={() => onZoneSelect(zone.id)}
            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all cursor-pointer ${
              selectedZone === zone.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {/* จุดสีบ่งชี้โซน */}
            <span className={`h-2 w-2 rounded-full ${selectedZone === zone.id ? 'bg-white' : zone.color}`} />
            <span className="text-[11px] font-black leading-none">{zone.name}</span>
          </button>
        ))}
      </div>

      {/* คำอธิบายโซนที่เลือก */}
      <div className="text-[10px] text-slate-400 bg-slate-900/40 px-3 py-2 rounded-xl text-center font-bold border border-slate-900">
        📍 <span className="text-emerald-400 font-black">{zones.find(z => z.id === selectedZone)?.desc}</span>
      </div>
    </div>
  );
};
