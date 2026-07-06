import React, { useState } from 'react';
import { Home } from 'lucide-react';
import type { ThemePeriod } from '../../shared/utils/useTheme';

interface ControlPanelProps {
  selectedZone: number;
  onZoneSelect: (zone: number) => void;
  theme: ThemePeriod;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selectedZone, onZoneSelect, theme }) => {
  const [showMap, setShowMap] = useState(false);

  // แผนที่จับคู่รหัสโซน (หลังบ้าน) กับตัวอักษรและตำแหน่งจริงตามภาพร่าง
  const zones = [
    { id: 5, name: 'โซน A', desc: 'บนขวา (North-East)', color: 'bg-pink-500', hexColor: '#ec4899', activeClass: 'bg-pink-500 text-white border-pink-400 shadow-pink-500/20' },
    { id: 2, name: 'โซน B', desc: 'ล่างขวา (South-East)', color: 'bg-blue-500', hexColor: '#3b82f6', activeClass: 'bg-blue-500 text-white border-blue-400 shadow-blue-500/20' },
    { id: 4, name: 'โซน C', desc: 'ตรงกลาง (Center)', color: 'bg-amber-500', hexColor: '#f59e0b', activeClass: 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20' },
    { id: 1, name: 'โซน D', desc: 'ล่างซ้าย (South-West)', color: 'bg-emerald-500', hexColor: '#10b981', activeClass: 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20' },
    { id: 3, name: 'โซน E', desc: 'ด้านนอกโรงเรือน (Outside)', color: 'bg-purple-500', hexColor: '#a855f7', activeClass: 'bg-purple-500 text-white border-purple-400 shadow-purple-500/20' },
  ];

  const currentZone = zones.find(z => z.id === selectedZone);

  return (
    <div
      className="rounded-[28px] p-4 md:p-5 shadow-lg space-y-4 border theme-transition"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        boxShadow: `0 10px 40px ${theme === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.5)'}`,
      }}
    >
      {/* หัวข้อ + ปุ่มแผนที่ */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-md shadow-emerald-500/20">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>เลือกโซนโรงเรือน</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>กดเลือกโซนที่ต้องการดูข้อมูล</p>
          </div>
        </div>

        {/* ปุ่มเปิด/ปิดแผนที่ */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border hover:opacity-90 active:scale-95 shrink-0"
          style={{
            backgroundColor: showMap ? 'rgba(16,185,129,0.15)' : 'var(--bg-control)',
            borderColor: showMap ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)',
            color: showMap ? '#10b981' : 'var(--text-muted)',
          }}
        >
          <span>🗺️ {showMap ? 'ปิดแผนที่โรงเรือน' : 'ดูแผนที่โรงเรือน'}</span>
        </button>
      </div>

      {/* แผนที่โรงเรือนจำลองรูปภาพร่าง (SVG Map) */}
      {showMap && (
        <div 
          className="border rounded-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-3 flex flex-col items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="w-full max-w-lg">
            <svg viewBox="0 0 420 300" className="w-full h-auto select-none">
              {/* ตารางพื้นหลังเพื่อสไตล์พิมพ์เขียว */}
              <defs>
                <pattern id="map-grid" width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke={theme === 'night' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#map-grid)" rx="12" />

              {/* อาคาร */}
              <g>
                <rect x="90" y="30" width="130" height="65" rx="6" fill={theme === 'night' ? '#1e293b' : '#f1f5f9'} stroke="var(--border-subtle)" strokeWidth="1.5" />
                <text x="155" y="68" fill="var(--text-secondary)" fontSize="11" fontWeight="bold" textAnchor="middle">อาคาร</text>
              </g>

              {/* ต้นไม้ */}
              <g transform="translate(45, 170)">
                <path d="M 0 0 C -15 -10, -20 -30, -5 -40 C -15 -55, 15 -55, 5 -40 C 20 -30, 15 -10, 0 0" fill="#10b981" fillOpacity="0.8" />
                <rect x="-3" y="0" width="6" height="22" fill="#78350f" />
                <text x="0" y="35" fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="bold">ต้นไม้</text>
              </g>

              {/* ขอบเขตโรงเรือนรูปตัว L แบบติดกัน (ไม่มีช่องว่างตรงกลาง) */}
              
              {/* โซน D (ล่างซ้าย) - ขยายให้ชนกับโซน C โดยตรง */}
              <g onClick={() => onZoneSelect(1)} className="cursor-pointer group/zone">
                {/* ใช้ fill แบบกึ่งโปร่งใส (เมื่อไม่เลือก) หรือมีสี (เมื่อเลือก) เพื่อให้ทุกจุดบนพื้นที่รับคลิกได้ 100% ไม่หลุดลอด */}
                <rect x="90" y="130" width="70" height="90" fill={selectedZone === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.005)'} stroke="#10b981" strokeWidth={selectedZone === 1 ? 3.5 : 1.5} rx="4" />
                <circle cx="125" cy="175" r="14" fill="#10b981" className="transition-transform group-hover/zone:scale-110" />
                <text x="125" y="179" fill="#fff" fontSize="11" fontWeight="black" textAnchor="middle">D</text>
              </g>

              {/* โซน C (ตรงกลาง) - ติดกับโซน D และโซน B */}
              <g onClick={() => onZoneSelect(4)} className="cursor-pointer group/zone">
                <rect x="160" y="130" width="85" height="90" fill={selectedZone === 4 ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.005)'} stroke="#f59e0b" strokeWidth={selectedZone === 4 ? 3.5 : 1.5} rx="4" />
                <circle cx="202.5" cy="175" r="14" fill="#f59e0b" className="transition-transform group-hover/zone:scale-110" />
                <text x="202.5" y="179" fill="#fff" fontSize="11" fontWeight="black" textAnchor="middle">C</text>
              </g>

              {/* โซน B (ล่างขวา) - ติดกับโซน C */}
              <g onClick={() => onZoneSelect(2)} className="cursor-pointer group/zone">
                <rect x="245" y="130" width="60" height="90" fill={selectedZone === 2 ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.005)'} stroke="#3b82f6" strokeWidth={selectedZone === 2 ? 3.5 : 1.5} rx="4" />
                <circle cx="275" cy="175" r="14" fill="#3b82f6" className="transition-transform group-hover/zone:scale-110" />
                <text x="275" y="179" fill="#fff" fontSize="11" fontWeight="black" textAnchor="middle">B</text>
              </g>

              {/* โซน A (บนขวา) - วางพาดต่อจากโซน B ขึ้นไปข้างบนพอดี */}
              <g onClick={() => onZoneSelect(5)} className="cursor-pointer group/zone">
                <rect x="245" y="30" width="60" height="100" fill={selectedZone === 5 ? 'rgba(236,72,153,0.2)' : 'rgba(0,0,0,0.005)'} stroke="#ec4899" strokeWidth={selectedZone === 5 ? 3.5 : 1.5} rx="4" />
                <circle cx="275" cy="80" r="14" fill="#ec4899" className="transition-transform group-hover/zone:scale-110" />
                <text x="275" y="84" fill="#fff" fontSize="11" fontWeight="black" text-anchor="middle">A</text>
              </g>

              {/* โซน E (ด้านนอก) */}
              <g onClick={() => onZoneSelect(3)} className="cursor-pointer group/zone">
                <circle cx="345" cy="130" r="14" fill="#a855f7" className="transition-transform group-hover/zone:scale-110" stroke={selectedZone === 3 ? '#fff' : 'transparent'} strokeWidth="2.5" />
                <text x="345" y="134" fill="#fff" fontSize="11" fontWeight="black" text-anchor="middle">E</text>
                <text x="345" y="156" fill="var(--text-muted)" fontSize="8.5" fontWeight="black" textAnchor="middle">ด้านนอก</text>
                
                {/* ลูกศรชี้เข้าหาโรงเรือน */}
                <path d="M 325 130 L 310 130" stroke="#a855f7" strokeWidth="1.5" fill="none" />
                <path d="M 314 126 L 310 130 L 314 134" stroke="#a855f7" strokeWidth="1.5" fill="none" />
              </g>

              {/* ประตูทางเดินและหน้าต่างอิงภาพสเก็ตช์ */}
              <g stroke="var(--text-primary)" strokeWidth="2.5">
                {/* ประตูบน (โซน D) */}
                <line x1="95" y1="130" x2="115" y2="130" />
                {/* ประตูล่าง (โซน D) */}
                <line x1="95" y1="220" x2="115" y2="220" />
                {/* ประตูข้างซ้าย (โซน A) */}
                <line x1="245" y1="50" x2="245" y2="70" />
                {/* ประตูทางขวา (โซน B) */}
                <line x1="305" y1="170" x2="305" y2="190" />
              </g>

              {/* เส้นและตัวเลขสเกลระยะทางจริง (มิติเมตร) */}
              <g stroke="var(--text-muted)" strokeWidth="0.8" opacity="0.6">
                {/* 36m (ล่างโรงเรือน) */}
                <line x1="90" y1="235" x2="305" y2="235" />
                <text x="197" y="247" fill="var(--text-muted)" fontSize="8" fontWeight="bold" textAnchor="middle">36 m</text>
                
                {/* 12m (บนโรงเรือนขวา) */}
                <line x1="245" y1="18" x2="305" y2="18" />
                <text x="275" y="12" fill="var(--text-muted)" fontSize="8" fontWeight="bold" textAnchor="middle">12 m</text>

                {/* 16m (ความสูงโรงเรือนซ้าย) */}
                <line x1="75" y1="130" x2="75" y2="220" />
                <text x="66" y="178" fill="var(--text-muted)" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 66 178)">16 m</text>

                {/* 32m (ความสูงรวมฝั่งขวา) */}
                <line x1="320" y1="30" x2="320" y2="220" />
                <text x="329" y="125" fill="var(--text-muted)" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(90 329 125)">32 m</text>
              </g>
            </svg>
          </div>
          <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--text-muted)' }}>
            * คลิกเลือกโซนที่ต้องการบนแผนที่ได้โดยตรง
          </span>
        </div>
      )}

      {/* ปุ่มเลือกโซน */}
      <div className="grid grid-cols-5 gap-2.5">
        {zones.map((zone) => (
          <button
            key={zone.id}
            id={`zone-btn-${zone.id}`}
            onClick={() => onZoneSelect(zone.id)}
            className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-center transition-all cursor-pointer border ${
              selectedZone === zone.id
                ? `${zone.activeClass} font-black shadow-md`
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
        📍 โซนปัจจุบัน: <span style={{ color: currentZone?.hexColor }}>{currentZone?.name} — {currentZone?.desc}</span>
      </div>
    </div>
  );
};
