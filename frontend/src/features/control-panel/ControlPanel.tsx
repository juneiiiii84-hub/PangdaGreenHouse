import React from 'react';
import { Home } from 'lucide-react';

interface ControlPanelProps {
  selectedZone: number;
  onZoneSelect: (zone: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selectedZone, onZoneSelect }) => {
  const zones = [
    { id: 1, name: 'โซน 1', desc: 'ล่างซ้าย (South-West)' },
    { id: 2, name: 'โซน 2', desc: 'ล่างขวา (South-East)' },
    { id: 3, name: 'โซน 3', desc: 'บนซ้าย (North-West)' },
    { id: 4, name: 'โซน 4', desc: 'ตรงกลาง (Center)' },
    { id: 5, name: 'โซน 5', desc: 'บนขวา (North-East)' }
  ];

  return (
    <div className="bg-slate-950 text-white rounded-2xl md:rounded-[24px] p-4 md:p-5 shadow-xl shadow-slate-900/10 space-y-3 border border-slate-900">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500 rounded-xl">
          <Home size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-xs md:text-sm font-black tracking-wide">Greenhouse Control Panel</h2>
          <p className="text-[9px] text-slate-500">เลือกควบคุมดัชนีและการคายน้ำพืชรายโซน</p>
        </div>
      </div>

      {/* สไลด์ซ้ายขวาบนจอมือถือ และจัดเป็นตารางเมื่อเป็นจอใหญ่ */}
      <div className="flex md:grid md:grid-cols-5 gap-2 p-1.5 bg-slate-900 rounded-xl overflow-x-auto scrollbar-none">
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => onZoneSelect(zone.id)}
            className={`py-2 px-4 md:px-1 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap min-w-[70px] md:min-w-0 ${
              selectedZone === zone.id
                ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white font-bold hover:bg-slate-800'
            }`}
          >
            <span className="block text-xs md:text-sm">{zone.name}</span>
          </button>
        ))}
      </div>
      
      <div className="text-[9px] text-slate-400 bg-slate-900/40 p-2 rounded-xl text-center font-bold border border-slate-900">
        📍 พิกัดโรงเรือน: <span className="text-emerald-400 font-black">{zones.find(z => z.id === selectedZone)?.desc}</span>
      </div>
    </div>
  );
};
