import React from 'react';
import { Leaf, CheckCircle, Bell, AlertTriangle } from 'lucide-react';
import type { DiagnosticsResponse } from '../../services/api';

interface ClimateDiagnosticsProps {
  diagnosticsData: DiagnosticsResponse | null;
}

export const ClimateDiagnostics: React.FC<ClimateDiagnosticsProps> = ({ diagnosticsData }) => {
  if (!diagnosticsData || !diagnosticsData.diagnostics) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center py-10 text-slate-500 space-y-3">
        <Leaf size={20} className="animate-bounce text-emerald-500" />
        <span className="text-xs font-bold text-slate-400">ระบบประมวลผลดัชนีวิเคราะห์พืช...</span>
      </div>
    );
  }

  const { diagnostics, overall } = diagnosticsData;

  const getOverallIcon = (text: string) => {
    if (text === 'เหมาะสมมาก') return <Leaf size={20} className="text-emerald-400" />;
    if (text === 'เหมาะสม' || text === 'ปกติ / เหมาะสม') return <CheckCircle size={20} className="text-blue-400" />;
    if (text === 'ต้องเฝ้าระวัง' || text === 'เฝ้าระวัง') return <Bell size={20} className="text-amber-400" />;
    return <AlertTriangle size={20} className="text-rose-400 animate-pulse" />;
  };

  const items = [
    { label: 'อุณหภูมิอากาศ (DHT22)', item: diagnostics.temp, icon: '🌡️' },
    { label: 'ความชื้นสัมพัทธ์ (DHT22)', item: diagnostics.hum, icon: '💧' },
    { label: 'Vapor Pressure Deficit (VPD)', item: diagnostics.vpd, icon: '💨' },
    { label: 'ความเข้มแสงแวดล้อม (PPFD)', item: diagnostics.ppfd, icon: '☀️' }
  ];

  return (
    <section className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl md:rounded-[24px] p-5 md:p-6 shadow-2xl space-y-5">
      <div>
        <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
          <span>🛡️ วิเคราะห์สภาวะโรงเรือนเรียลไทม์ (Smart Diagnostics)</span>
        </h3>
        <p className="text-[9px] text-slate-500 mt-0.5">ประเมินสรีรวิทยาความสมดุลการคายน้ำเพื่อสุขภาพพืชรายวินาที</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* สรุปเกณฑ์รวม */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 p-4 md:p-5 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">สภาวะภาพรวม</span>
            <div className="flex items-center gap-2">
              {getOverallIcon(overall.text)}
              <h4 className="text-base font-black text-white">{overall.text}</h4>
            </div>
            <p className="text-[9.5px] text-slate-400 leading-normal pt-0.5">
              {overall.desc}
            </p>
          </div>

          <div className="text-[8.5px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-800/50 leading-relaxed font-bold">
            ℹ️ คำนวณถ่วงน้ำหนักความเหมาะสม อุณหภูมิ, ความชื้นสะสม, VPD และแสงแดด PPFD รายเวลา
          </div>
        </div>

        {/* รายละเอียดรายตัวแปร */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((row, idx) => (
            <div
              key={idx}
              className="bg-slate-950/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between space-y-2.5"
            >
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                <span className="text-[9.5px] font-black text-slate-300 flex items-center gap-1">
                  <span>{row.icon}</span>
                  <span>{row.label}</span>
                </span>
                <span className={`px-2 py-0.5 border rounded-full text-[8.5px] font-extrabold ${row.item.color}`}>
                  {row.item.status}
                </span>
              </div>

              <p className="text-[9.5px] text-slate-400 leading-relaxed font-medium">
                {row.item.desc}
              </p>

              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800/30 text-[9px] font-bold text-slate-400 leading-normal">
                {row.item.recommendation}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
