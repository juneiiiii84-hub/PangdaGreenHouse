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
import { Layers, RefreshCw, TrendingUp, BarChart2 } from 'lucide-react';
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

  const metricTabs: { id: MetricType; label: string; emoji: string; unit: string; color: string }[] = [
    { id: 'temperature', label: 'อุณหภูมิ', emoji: '🌡️', unit: '°C', color: '#f43f5e' },
    { id: 'humidity', label: 'ความชื้น', emoji: '💧', unit: '%RH', color: '#3b82f6' },
    { id: 'vpd', label: 'VPD', emoji: '💨', unit: 'kPa', color: '#a855f7' },
    { id: 'lux', label: 'LUX', emoji: '🔆', unit: 'Lux', color: '#eab308' },
    { id: 'ppfd', label: 'PPFD', emoji: '☀️', unit: 'μmol', color: '#f97316' },
  ];

  const zoneConfig = [
    { id: 1, label: 'โซน 1', sublabel: 'ล่างซ้าย', color: '#10b981', bg: 'bg-emerald-500' },
    { id: 2, label: 'โซน 2', sublabel: 'ล่างขวา', color: '#3b82f6', bg: 'bg-blue-500' },
    { id: 3, label: 'โซน 3', sublabel: 'บนซ้าย', color: '#a855f7', bg: 'bg-purple-500' },
    { id: 4, label: 'โซน 4', sublabel: 'ตรงกลาง', color: '#f59e0b', bg: 'bg-amber-500' },
    { id: 5, label: 'โซน 5', sublabel: 'บนขวา', color: '#ec4899', bg: 'bg-pink-500' },
  ];

  const handleZoneToggle = (zone: number) => {
    if (compareZones.includes(zone)) {
      if (compareZones.length > 1) {
        setCompareZones(compareZones.filter(z => z !== zone));
      }
    } else {
      setCompareZones([...compareZones, zone].sort());
    }
  };

  const getChartDataAndOptions = () => {
    const labelsSet = new Set<string>();
    
    const sortedData = [...dataList].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    sortedData.forEach(d => {
      const tStr = new Date(d.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      labelsSet.add(tStr);
    });

    const labels = Array.from(labelsSet).slice(-30);

    if (comparisonMode === 'zones') {
      const datasets = compareZones.map(zone => {
        const zc = zoneConfig.find(z => z.id === zone)!;
        const zoneData = sortedData.filter(d => d.zone === zone);
        const dataPoints = labels.map(label => {
          const match = zoneData.find(r =>
            new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) === label
          );
          return match ? match[selectedMetric] : null;
        });

        return {
          label: `${zc.label}`,
          data: dataPoints,
          borderColor: zc.color,
          backgroundColor: `${zc.color}18`,
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
            labels: { boxWidth: 8, usePointStyle: true, font: { weight: 'bold' as const, size: 10 } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 11, weight: 'bold' as const },
            bodyFont: { size: 11 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          y: {
            border: { dash: [4, 4] },
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: { font: { size: 9 } }
          }
        }
      };

      return { data: { labels, datasets }, options };
    } else {
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
          label: `${tabA.emoji} ${tabA.label} (${tabA.unit})`,
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
          label: `${tabB.emoji} ${tabB.label} (${tabB.unit})`,
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
            labels: { boxWidth: 8, usePointStyle: true, font: { weight: 'bold' as const, size: 10 } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 11, weight: 'bold' as const },
            bodyFont: { size: 11 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          yA: {
            type: 'linear' as const,
            position: 'left' as const,
            ticks: { font: { size: 9 } },
            title: { display: true, text: `${tabA.label} (${tabA.unit})`, font: { size: 10, weight: 'bold' as const } }
          },
          yB: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 9 } },
            title: { display: true, text: `${tabB.label} (${tabB.unit})`, font: { size: 10, weight: 'bold' as const } }
          }
        }
      };

      return { data: { labels, datasets }, options };
    }
  };

  const { data, options } = getChartDataAndOptions();
  const currentMetricInfo = metricTabs.find(t => t.id === selectedMetric)!;

  return (
    <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/50 space-y-5">
      
      {/* ส่วนหัวข้อ + สวิตช์โหมด */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            📊 เปรียบเทียบข้อมูลโรงเรือน
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">เลือกโหมดการวิเคราะห์ด้านล่าง</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 w-full sm:w-auto">
          <button
            onClick={() => setComparisonMode('zones')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              comparisonMode === 'zones'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={13} />
            <span>ข้ามโซน</span>
          </button>
          <button
            onClick={() => setComparisonMode('metrics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              comparisonMode === 'metrics'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw size={13} />
            <span>2 ค่าแกนคู่</span>
          </button>
        </div>
      </div>

      {/* เนื้อหาหลัก: แผงควบคุม + กราฟ */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* ── แผงควบคุม ── */}
        <div className="lg:w-56 shrink-0 bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
          
          {comparisonMode === 'zones' ? (
            <>
              {/* เลือกดัชนี */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <TrendingUp size={11} /> ดัชนีที่แสดง
                </h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedMetric(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        selectedMetric === tab.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                      {selectedMetric === tab.id && <span className="ml-auto text-[9px] text-slate-300">({tab.unit})</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* เลือกโซน */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <BarChart2 size={11} /> โซนที่วาดเส้น
                </h4>
                <div className="flex flex-col gap-1">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => handleZoneToggle(z.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        compareZones.includes(z.id)
                          ? 'border-slate-300 bg-white shadow-sm'
                          : 'border-transparent text-slate-400 hover:bg-slate-200/50'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${z.bg}`} />
                      <span className="flex-1">{z.label}</span>
                      <span className="text-[9px] text-slate-400">{z.sublabel}</span>
                      <div className={`h-4 w-4 rounded-full border shrink-0 flex items-center justify-center text-[8px] transition-all ${
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
              {/* เลือกโซนหลัก */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">เลือกโซน</h4>
                <div className="grid grid-cols-5 gap-1">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setMetricsZone(z.id)}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        metricsZone === z.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${metricsZone === z.id ? 'bg-white' : z.bg}`} />
                      {z.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* เลือกตัวแปรแกนซ้าย */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">แกนซ้าย (สี A)</h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCompareMetricA(tab.id)}
                      disabled={compareMetricB === tab.id}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        compareMetricA === tab.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      <span>{tab.emoji}</span><span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* เลือกตัวแปรแกนขวา */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">แกนขวา (สี B)</h4>
                <div className="flex flex-col gap-1">
                  {metricTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCompareMetricB(tab.id)}
                      disabled={compareMetricA === tab.id}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        compareMetricB === tab.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      <span>{tab.emoji}</span><span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── กราฟ ── */}
        <div className="flex-1 min-h-[280px] sm:min-h-[320px] bg-slate-50/30 border border-slate-100 p-4 rounded-2xl relative">
          <div className="absolute top-2 right-3 text-[9px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
            หน่วย: {comparisonMode === 'zones' ? currentMetricInfo.unit : '2 แกน'}
          </div>
          <Line data={data} options={options} />
        </div>

      </div>
    </section>
  );
};
