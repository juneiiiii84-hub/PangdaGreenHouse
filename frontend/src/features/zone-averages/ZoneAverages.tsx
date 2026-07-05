import React from 'react';
import { Thermometer, Droplets, Wind, Sun } from 'lucide-react';
import type { SensorData } from '../../services/api';

interface ZoneAveragesProps {
  dataList: SensorData[];
}

export const ZoneAverages: React.FC<ZoneAveragesProps> = ({ dataList }) => {
  const zones = [
    { id: 1, name: 'โซน 1', desc: 'ล่างซ้าย (South-West)', color: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-100', glow: 'bg-emerald-500/5' },
    { id: 2, name: 'โซน 2', desc: 'ล่างขวา (South-East)', color: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-100', glow: 'bg-blue-500/5' },
    { id: 3, name: 'โซน 3', desc: 'บนซ้าย (North-West)', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-100', glow: 'bg-purple-500/5' },
    { id: 4, name: 'โซน 4', desc: 'ตรงกลาง (Center)', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-100', glow: 'bg-amber-500/5' },
  ];

  const calculateZoneAverages = (zoneId: number) => {
    const zoneData = dataList.filter((d) => d.zone === zoneId);
    if (zoneData.length === 0) return null;

    const sumTemp = zoneData.reduce((sum, d) => sum + d.temperature, 0);
    const sumHum = zoneData.reduce((sum, d) => sum + d.humidity, 0);
    const sumVpd = zoneData.reduce((sum, d) => sum + d.vpd, 0);
    const sumPpfd = zoneData.reduce((sum, d) => sum + d.ppfd, 0);
    const count = zoneData.length;

    return {
      temp: sumTemp / count,
      humidity: sumHum / count,
      vpd: sumVpd / count,
      ppfd: sumPpfd / count,
      count,
    };
  };

  const getGreenhouseAverage = () => {
    const activeZones = [1, 2, 3, 4];
    const zoneAvgs = activeZones
      .map(id => calculateZoneAverages(id))
      .filter((avg): avg is NonNullable<typeof avg> => avg !== null);

    if (zoneAvgs.length === 0) return null;

    const sumTemp = zoneAvgs.reduce((sum, a) => sum + a.temp, 0);
    const sumHum = zoneAvgs.reduce((sum, a) => sum + a.humidity, 0);
    const sumVpd = zoneAvgs.reduce((sum, a) => sum + a.vpd, 0);
    const sumPpfd = zoneAvgs.reduce((sum, a) => sum + a.ppfd, 0);
    const count = zoneAvgs.length;

    return {
      temp: sumTemp / count,
      humidity: sumHum / count,
      vpd: sumVpd / count,
      ppfd: sumPpfd / count,
      count: zoneAvgs.reduce((sum, a) => sum + a.count, 0)
    };
  };

  const greenhouseAvg = getGreenhouseAverage();

  return (
    <section className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-xl shadow-slate-100/30 space-y-5">
      <div>
        <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
          ⚡ ค่าเฉลี่ยสภาพแวดล้อมในแต่ละโซน
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          วิเคราะห์ค่าเฉลี่ยสภาวะอากาศและแสงสว่างจากประวัติข้อมูลการบันทึกของโซนในโรงเรือน (โซน 1-4)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {zones.map((zone) => {
          const avg = calculateZoneAverages(zone.id);

          return (
            <div
              key={zone.id}
              className={`bg-white border border-slate-150 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden`}
            >
              {/* ตราเรืองแสงตามสีโซน */}
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -mr-4 -mt-4 ${zone.glow}`} />

              {/* หัวการ์ด: ชื่อโซน */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${zone.color}`} />
                  <span className="text-sm font-black text-slate-800">{zone.name}</span>
                </div>
                <span className="text-xs text-slate-400 font-bold max-w-[90px] text-right truncate">
                  {zone.desc.split(' ')[0]}
                </span>
              </div>

              {/* ค่าเฉลี่ยต่างๆ */}
              <div className="grid grid-cols-2 gap-2.5 z-10">
                {/* อุณหภูมิ */}
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100/60 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Thermometer size={11} className="text-rose-500" />
                    <span>อุณหภูมิ</span>
                  </div>
                  <div className="text-sm font-black text-slate-700 mt-0.5 font-mono">
                    {avg ? `${avg.temp.toFixed(1)}` : '---'}
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">°C</span>
                  </div>
                </div>

                {/* ความชื้น */}
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100/60 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Droplets size={11} className="text-blue-500" />
                    <span>ความชื้น</span>
                  </div>
                  <div className="text-sm font-black text-slate-700 mt-0.5 font-mono">
                    {avg ? `${avg.humidity.toFixed(1)}` : '---'}
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">%</span>
                  </div>
                </div>

                {/* VPD */}
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100/60 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Wind size={11} className="text-purple-500" />
                    <span>VPD</span>
                  </div>
                  <div className="text-sm font-black text-slate-700 mt-0.5 font-mono">
                    {avg ? `${avg.vpd.toFixed(2)}` : '---'}
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">kPa</span>
                  </div>
                </div>

                {/* PPFD */}
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100/60 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Sun size={11} className="text-amber-500" />
                    <span>PPFD</span>
                  </div>
                  <div className="text-sm font-black text-slate-700 mt-0.5 font-mono">
                    {avg ? `${avg.ppfd.toFixed(1)}` : '---'}
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">μmol</span>
                  </div>
                </div>
              </div>

              {/* ท้ายการ์ด: จำนวนข้อมูล */}
              <div className="text-xs text-slate-400 font-bold border-t border-slate-50 pt-1.5 mt-1 flex justify-between items-center">
                <span>จำนวนข้อมูล</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold text-xs">
                  {avg ? `${avg.count} แถว` : '0 แถว'}
                </span>
              </div>
            </div>
          );
        })}

        {/* การ์ดที่ 5: ค่าเฉลี่ยรวมในโรงเรือน (Greenhouse Average) */}
        <div
          className="bg-emerald-50/30 border border-emerald-250 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden text-slate-800"
        >
          {/* ตราเรืองแสงสีเขียวพรีเมียม */}
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -mr-4 -mt-4 bg-emerald-500/5" />

          {/* หัวการ์ด */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-black text-slate-800">เฉลี่ยโรงเรือน</span>
            </div>
            <span className="text-xs text-slate-400 font-bold max-w-[90px] text-right truncate">
              โซน 1-4 รวมกัน
            </span>
          </div>

          {/* ค่าเฉลี่ยต่างๆ */}
          <div className="grid grid-cols-2 gap-2.5 z-10">
            {/* อุณหภูมิ */}
            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100/60 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-405 uppercase">
                <Thermometer size={11} className="text-rose-500" />
                <span>อุณหภูมิ</span>
              </div>
              <div className="text-sm font-black text-slate-705 mt-0.5 font-mono">
                {greenhouseAvg ? `${greenhouseAvg.temp.toFixed(1)}` : '---'}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">°C</span>
              </div>
            </div>

            {/* ความชื้น */}
            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100/60 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-405 uppercase">
                <Droplets size={11} className="text-blue-500" />
                <span>ความชื้น</span>
              </div>
              <div className="text-sm font-black text-slate-705 mt-0.5 font-mono">
                {greenhouseAvg ? `${greenhouseAvg.humidity.toFixed(1)}` : '---'}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">%</span>
              </div>
            </div>

            {/* VPD */}
            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100/60 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-405 uppercase">
                <Wind size={11} className="text-purple-500" />
                <span>VPD</span>
              </div>
              <div className="text-sm font-black text-slate-705 mt-0.5 font-mono">
                {greenhouseAvg ? `${greenhouseAvg.vpd.toFixed(2)}` : '---'}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">kPa</span>
              </div>
            </div>

            {/* PPFD */}
            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100/60 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-405 uppercase">
                <Sun size={11} className="text-amber-500" />
                <span>PPFD</span>
              </div>
              <div className="text-sm font-black text-slate-705 mt-0.5 font-mono">
                {greenhouseAvg ? `${greenhouseAvg.ppfd.toFixed(1)}` : '---'}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">μmol</span>
              </div>
            </div>
          </div>

          {/* ท้ายการ์ด: จำนวนข้อมูลทั้งหมด */}
          <div className="text-xs text-slate-400 font-bold border-t border-emerald-100/60 pt-1.5 mt-1 flex justify-between items-center">
            <span>ข้อมูลรวม</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono font-bold text-xs">
              {greenhouseAvg ? `${greenhouseAvg.count} แถว` : '0 แถว'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
