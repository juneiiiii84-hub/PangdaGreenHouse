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
    const sortedData = [...dataList].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // กำหนดเวลา 06.30 ถึง 18.30 ระยะห่าง 30 นาที (ทั้งหมด 25 จุด)
    const labels = [
      '06.30', '07.00', '07.30', '08.00', '08.30', '09.00', '09.30', '10.00',
      '10.30', '11.00', '11.30', '12.00', '12.30', '13.00', '13.30', '14.00',
      '14.30', '15.00', '15.30', '16.00', '16.30', '17.00', '17.30', '18.00',
      '18.30'
    ];

    if (comparisonMode === 'zones') {
      const datasets = compareZones.map(zone => {
        const zc = zoneConfig.find(z => z.id === zone)!;
        const zoneData = sortedData.filter(d => d.zone === zone);
        
        // แมปกระจายข้อมูลสัดส่วนสม่ำเสมอเข้าหา 25 จุดช่วงเวลา
        const dataPoints = labels.map((_, i) => {
          if (zoneData.length === 0) return null;
          const dataIndex = Math.floor((i / (labels.length - 1)) * (zoneData.length - 1));
          const point = zoneData[dataIndex];
          return point ? point[selectedMetric] : null;
        });

        return {
          label: `${zc.label}`,
          data: dataPoints,
          borderColor: zc.color,
          backgroundColor: `${zc.color}18`,
          borderWidth: 2.5,
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 6,
        };
      });

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 10, usePointStyle: true, font: { weight: 'bold' as const, size: 11 } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' as const },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, weight: 'bold' as const }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          y: {
            border: { dash: [4, 4] },
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: { font: { size: 10 } }
          }
        }
      };

      return { data: { labels, datasets }, options };
    } else {
      const zoneData = sortedData.filter(d => d.zone === metricsZone);
      
      // แมปดึงค่าของ A และ B ให้ตรง 25 จุดช่วงเวลา
      const dataA = labels.map((_, i) => {
        if (zoneData.length === 0) return null;
        const dataIndex = Math.floor((i / (labels.length - 1)) * (zoneData.length - 1));
        const point = zoneData[dataIndex];
        return point ? point[compareMetricA] : null;
      });

      const dataB = labels.map((_, i) => {
        if (zoneData.length === 0) return null;
        const dataIndex = Math.floor((i / (labels.length - 1)) * (zoneData.length - 1));
        const point = zoneData[dataIndex];
        return point ? point[compareMetricB] : null;
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
          pointRadius: 3
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
          pointRadius: 3
        }
      ];

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 10, usePointStyle: true, font: { weight: 'bold' as const, size: 11 } }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' as const },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, weight: 'bold' as const }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15 }
          },
          yA: {
            type: 'linear' as const,
            position: 'left' as const,
            ticks: { font: { size: 10 } },
            title: { display: true, text: `${tabA.label} (${tabA.unit})`, font: { size: 11, weight: 'bold' as const } }
          },
          yB: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } },
            title: { display: true, text: `${tabB.label} (${tabB.unit})`, font: { size: 11, weight: 'bold' as const } }
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
          <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
            📊 เปรียบเทียบข้อมูลโรงเรือน
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">เลือกโหมดการวิเคราะห์ด้านล่าง</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 w-full sm:w-auto">
          <button
            onClick={() => setComparisonMode('zones')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              comparisonMode === 'zones'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>ข้ามโซน</span>
          </button>
          <button
            onClick={() => setComparisonMode('metrics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              comparisonMode === 'metrics'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw size={14} />
            <span>2 ค่าแกนคู่</span>
          </button>
        </div>
      </div>
 
      {/* เนื้อหาหลัก: แผงควบคุม + กราฟ */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* ── แผงควบคุม ── */}
        <div className="lg:w-60 shrink-0 bg-white border border-slate-200/60 p-4 rounded-2xl space-y-4 shadow-sm">
          
          {comparisonMode === 'zones' ? (
            <>
              {/* เลือกดัชนี (เปลี่ยนจากลิสต์ปุ่มเป็น Dropdown) */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <TrendingUp size={12} /> ดัชนีที่แสดง
                </h4>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs md:text-sm font-black text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  {metricTabs.map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.emoji} {tab.label} ({tab.unit})
                    </option>
                  ))}
                </select>
              </div>
 
              {/* เลือกโซน */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <BarChart2 size={12} /> โซนที่วาดเส้น
                </h4>
                <div className="flex flex-col gap-1.5">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => handleZoneToggle(z.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs md:text-sm font-bold text-left transition-all cursor-pointer ${
                        compareZones.includes(z.id)
                          ? 'border-slate-350 bg-white shadow-sm'
                          : 'border-transparent text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${z.bg}`} />
                      <span className="flex-1 text-slate-700">{z.label}</span>
                      <span className="text-[10px] text-slate-400">{z.sublabel}</span>
                      <div className={`h-4.5 w-4.5 rounded-full border shrink-0 flex items-center justify-center text-[10px] transition-all ${
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
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">เลือกโซน</h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setMetricsZone(z.id)}
                      className={`py-2 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 border ${
                        metricsZone === z.id
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${metricsZone === z.id ? 'bg-white' : z.bg}`} />
                      {z.id}
                    </button>
                  ))}
                </div>
              </div>
 
              {/* เลือกตัวแปรแกนซ้าย (Dropdown) */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">แกนซ้าย (สี A)</h4>
                <select
                  value={compareMetricA}
                  onChange={(e) => setCompareMetricA(e.target.value as MetricType)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs md:text-sm font-black text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  {metricTabs.map(tab => (
                    <option key={tab.id} value={tab.id} disabled={compareMetricB === tab.id}>
                      {tab.emoji} {tab.label} ({tab.unit})
                    </option>
                  ))}
                </select>
              </div>
 
              {/* เลือกตัวแปรแกนขวา (Dropdown) */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">แกนขวา (สี B)</h4>
                <select
                  value={compareMetricB}
                  onChange={(e) => setCompareMetricB(e.target.value as MetricType)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs md:text-sm font-black text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  {metricTabs.map(tab => (
                    <option key={tab.id} value={tab.id} disabled={compareMetricA === tab.id}>
                      {tab.emoji} {tab.label} ({tab.unit})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
 
        {/* ── กราฟ ── */}
        <div className="flex-1 min-h-[290px] sm:min-h-[340px] bg-slate-50/20 border border-slate-100 p-4 rounded-2xl relative shadow-inner">
          <div className="absolute top-2 right-3 text-xs font-black text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            หน่วย: {comparisonMode === 'zones' ? currentMetricInfo.unit : '2 แกน'}
          </div>
          <Line data={data} options={options} />
        </div>
 
      </div>
    </section>
  );
};
