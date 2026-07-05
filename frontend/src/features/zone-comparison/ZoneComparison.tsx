import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Layers, RefreshCw } from 'lucide-react';
import type { SensorData } from '../../services/api';

// ลงทะเบียนปลั๊กอินไลบรารี Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ZoneComparisonProps {
  dataList: SensorData[];
  selectedZone: number;
}

type MetricType = 'temperature' | 'humidity' | 'vpd' | 'lux' | 'ppfd';

export const ZoneComparison: React.FC<ZoneComparisonProps> = ({ dataList }) => {
  const [comparisonMode, setComparisonMode] = useState<'zones' | 'metrics'>('zones');
  
  // โหมดเปรียบเทียบข้ามโซน
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('temperature');
  const [compareZones, setCompareZones] = useState<number[]>([1, 2, 4]);

  // โหมดเปรียบเทียบสองดัชนีแกนคู่
  const [compareMetricA, setCompareMetricA] = useState<MetricType>('temperature');
  const [compareMetricB, setCompareMetricB] = useState<MetricType>('humidity');
  const [metricsZone, setMetricsZone] = useState<number>(1);

  const metricTabs: { id: MetricType; label: string; unit: string; color: string }[] = [
    { id: 'temperature', label: '🌡️ อุณหภูมิ', unit: '°C', color: '#f43f5e' },
    { id: 'humidity', label: '💧 ความชื้น', unit: '%RH', color: '#3b82f6' },
    { id: 'vpd', label: '💨 VPD', unit: 'kPa', color: '#a855f7' },
    { id: 'lux', label: '🔆 LUX', unit: 'Lux', color: '#eab308' },
    { id: 'ppfd', label: '☀️ PPFD', unit: 'μmol/m²/s', color: '#f97316' },
  ];

  const handleZoneToggle = (zone: number) => {
    if (compareZones.includes(zone)) {
      if (compareZones.length > 1) {
        setCompareZones(compareZones.filter(z => z !== zone));
      } else {
        alert("ต้องการเลือกเปรียบเทียบอย่างน้อย 1 โซน");
      }
    } else {
      setCompareZones([...compareZones, zone].sort());
    }
  };

  const getChartDataAndOptions = () => {
    const labelsSet = new Set<string>();
    
    // เรียงตามเวลาจากอดีตหาล่าสุด
    const sortedData = [...dataList].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    sortedData.forEach(d => {
      const tStr = new Date(d.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      labelsSet.add(tStr);
    });

    const labels = Array.from(labelsSet).slice(-30); // วาดจุดย้อนหลัง 30 แถวช่วงเวลา

    if (comparisonMode === 'zones') {
      const zoneColors: Record<number, string> = {
        1: '#10b981', // เขียว Emerald
        2: '#3b82f6', // ฟ้า Blue
        3: '#a855f7', // ม่วง Purple
        4: '#f59e0b', // เหลือง Amber
        5: '#ec4899', // ชมพู Pink
      };

      const datasets = compareZones.map(zone => {
        const zoneData = sortedData.filter(d => d.zone === zone);
        const dataPoints = labels.map(label => {
          const match = zoneData.find(r => 
            new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) === label
          );
          return match ? match[selectedMetric] : null;
        });

        return {
          label: `Zone ${zone}`,
          data: dataPoints,
          borderColor: zoneColors[zone] || '#64748b',
          backgroundColor: `${zoneColors[zone]}0b`,
          borderWidth: 2.5,
          tension: 0.4,
          fill: false,
          pointRadius: 2.5,
          pointHoverRadius: 6,
        };
      });

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 8, usePointStyle: true, font: { weight: 'bold' as const, size: 10, family: 'Prompt' } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Prompt', size: 11, weight: 'bold' as const },
            bodyFont: { family: 'Prompt', size: 11 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, family: 'Prompt' }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          y: {
            border: { dash: [4, 4] },
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: { font: { size: 9, family: 'Prompt' } }
          }
        }
      };

      return { data: { labels, datasets }, options };
    } else {
      // โหมดเปรียบเทียบสองแกน (Dual Y Axis) สำหรับ 1 โซนเดี่ยว
      const zoneData = sortedData.filter(d => d.zone === metricsZone);
      const dataA = labels.map(label => {
        const match = zoneData.find(r => 
          new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) === label
        );
        return match ? match[compareMetricA] : null;
      });

      const dataB = labels.map(label => {
        const match = zoneData.find(r => 
          new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) === label
        );
        return match ? match[compareMetricB] : null;
      });

      const tabA = metricTabs.find(t => t.id === compareMetricA)!;
      const tabB = metricTabs.find(t => t.id === compareMetricB)!;

      const datasets = [
        {
          label: `${tabA.label} (${tabA.unit})`,
          data: dataA,
          borderColor: tabA.color,
          backgroundColor: `${tabA.color}0a`,
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'yA',
          fill: false,
          pointRadius: 2.5
        },
        {
          label: `${tabB.label} (${tabB.unit})`,
          data: dataB,
          borderColor: tabB.color,
          backgroundColor: `${tabB.color}0a`,
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'yB',
          fill: false,
          pointRadius: 2.5
        }
      ];

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 8, usePointStyle: true, font: { weight: 'bold' as const, size: 10, family: 'Prompt' } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Prompt', size: 11, weight: 'bold' as const },
            bodyFont: { family: 'Prompt', size: 11 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, family: 'Prompt' }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          yA: {
            type: 'linear' as const,
            position: 'left' as const,
            ticks: { font: { size: 9, family: 'Prompt', color: tabA.color } },
            title: { display: true, text: `${tabA.label} (${tabA.unit})`, font: { size: 10, family: 'Prompt', weight: 'bold' as const } }
          },
          yB: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 9, family: 'Prompt', color: tabB.color } },
            title: { display: true, text: `${tabB.label} (${tabB.unit})`, font: { size: 10, family: 'Prompt', weight: 'bold' as const } }
          }
        }
      };

      return { data: { labels, datasets }, options };
    }
  };

  const { data, options } = getChartDataAndOptions();
  const currentMetricInfo = metricTabs.find(t => t.id === selectedMetric)!;

  return (
    <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-6">
      
      {/* ส่วนหัวข้อและสวิตช์โหมด */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            📊 เปรียบเทียบดัชนีสภาพอากาศโรงเรือน
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">เลือกพารามิเตอร์หรือกลุ่มโซนที่ประสงค์จะเปรียบเทียบแนวโน้ม</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 w-full lg:w-auto">
          <button
            onClick={() => setComparisonMode('zones')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              comparisonMode === 'zones' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>เปรียบเทียบข้ามโซน</span>
          </button>
          <button
            onClick={() => setComparisonMode('metrics')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              comparisonMode === 'metrics' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw size={14} />
            <span>เปรียบเทียบ 2 ค่าแกนคู่</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* แผงควบคุมกราฟ */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
          {comparisonMode === 'zones' ? (
            <>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">เลือกดัชนีอากาศหลัก:</h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedMetric(tab.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedMetric === tab.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100/50 border border-slate-200/50 text-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">โซนที่เปิดวาดเส้น:</h4>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
                  {[
                    { id: 1, label: 'โซน 1 (ล่างซ้าย)', color: 'bg-[#10b981]' },
                    { id: 2, label: 'โซน 2 (ล่างขวา)', color: 'bg-[#3b82f6]' },
                    { id: 3, label: 'โซน 3 (บนซ้าย)', color: 'bg-[#a855f7]' },
                    { id: 4, label: 'โซน 4 (ตรงกลาง)', color: 'bg-[#f59e0b]' },
                    { id: 5, label: 'โซน 5 (บนขวา)', color: 'bg-[#ec4899]' }
                  ].map(z => (
                    <button
                      key={z.id}
                      onClick={() => handleZoneToggle(z.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        compareZones.includes(z.id)
                          ? 'border-slate-300 bg-white shadow-sm'
                          : 'border-transparent text-slate-500 hover:bg-slate-200/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-md ${z.color}`}></span>
                        <span className="truncate max-w-[80px] lg:max-w-none">{z.label}</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all text-[8px] ${
                        compareZones.includes(z.id)
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 text-transparent'
                      }`}>✓</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">เลือกโซนหลัก:</h4>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map(z => (
                    <button
                      key={z}
                      onClick={() => setMetricsZone(z)}
                      className={`py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        metricsZone === z
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">ตัวแปรแกนฝั่งซ้าย:</h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCompareMetricA(tab.id)}
                      disabled={compareMetricB === tab.id}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        compareMetricA === tab.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100/50 border border-slate-200/50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">ตัวแปรแกนฝั่งขวา:</h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCompareMetricB(tab.id)}
                      disabled={compareMetricA === tab.id}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        compareMetricB === tab.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100/50 border border-slate-200/50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="text-[9px] text-slate-400 bg-white p-3 border border-slate-200/50 rounded-xl leading-relaxed font-medium">
            💡 แผนภูมิรองรับการประมวลผลข้อมูลความถี่สูงแบบเรียลไทม์จากระบบจำลองหลังบ้านโดยอัตโนมัติ
          </div>
        </div>

        {/* ตารางแสดงภาพกราฟ */}
        <div className="lg:col-span-3 h-80 bg-slate-50/30 border border-slate-100 p-4 rounded-2xl relative">
          <div className="absolute top-2 right-4 text-[9px] font-bold text-slate-400">
            หน่วยแกนข้อมูล: {comparisonMode === 'zones' ? currentMetricInfo.unit : '2 แกนพิกัดอิสระ'}
          </div>
          <Line data={data} options={options} />
        </div>

      </div>
    </section>
  );
};
