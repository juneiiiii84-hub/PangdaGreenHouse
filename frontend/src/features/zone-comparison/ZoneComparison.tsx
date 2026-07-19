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
import annotationPlugin from 'chartjs-plugin-annotation';
import { Layers, RefreshCw, TrendingUp, BarChart2 } from 'lucide-react';
import type { SensorData } from '../../services/api';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { ThemePeriod } from '../../shared/utils/useTheme';

// ลงทะเบียนปลั๊กอินไลบรารี Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface ZoneComparisonProps {
  dataList: SensorData[];
  selectedZone: number;
  theme: ThemePeriod;
}

type MetricType = 'temperature' | 'humidity' | 'vpd' | 'lux' | 'ppfd';

// // ค่าเหมาะสมสำหรับเส้น annotation (ช่วง "เหมาะสมมาก" ตามตารางประเมิน)
// const optimalRanges: Record<MetricType, { min: number; max: number; label: string }> = {
//   temperature: { min: 25, max: 30, label: 'อุณหภูมิเหมาะสมมาก' },
//   humidity: { min: 60, max: 80, label: 'ความชื้นเหมาะสมมาก' },
//   vpd: { min: 0.4, max: 0.8, label: 'VPD เหมาะสมมาก' },
//   lux: { min: 21600, max: 43200, label: 'Lux เหมาะสมมาก' },
//   ppfd: { min: 400, max: 800, label: 'PPFD เหมาะสมมาก' },
// };

export const ZoneComparison: React.FC<ZoneComparisonProps> = ({ dataList, selectedZone: _selectedZone, theme }) => {
  const [comparisonMode, setComparisonMode] = useState<'zones' | 'metrics'>('zones');

  // โหมดเปรียบเทียบข้ามโซน
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('temperature');
  const [compareZones, setCompareZones] = useState<number[]>([1, 2, 4]);

  // โหมดเปรียบเทียบสองค่าแกนคู่
  const [compareMetricA, setCompareMetricA] = useState<MetricType>('temperature');
  const [compareMetricB, setCompareMetricB] = useState<MetricType>('humidity');
  const [metricsZone, setMetricsZone] = useState<number>(1);

  // คำนวณสถิติย้อนหลัง 24 ชั่วโมง (Min, Max, Avg)
  const getZoneStats = (zoneId: number, metric: MetricType) => {
    const sortedData = get24HourData();
    const zoneRecords = sortedData.filter(d => d.zone === zoneId);
    if (zoneRecords.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };

    const values = zoneRecords.map(r => {
      if (metric === 'ppfd') return r.lux * DEFAULT_MULTIPLIER; // แปลงแสงแดดเฉลี่ย
      return r[metric];
    }).filter(v => v !== null && !isNaN(v));

    if (values.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return {
      min: parseFloat(min.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      avg: parseFloat(avg.toFixed(1)),
      count: values.length
    };
  };

  const metricTabs: { id: MetricType; label: string; emoji: string; unit: string; color: string }[] = [
    { id: 'temperature', label: 'อุณหภูมิอากาศ', emoji: '🌡️', unit: '°C', color: '#f43f5e' },
    { id: 'humidity', label: 'ความชื้นสัมพัทธ์ (%RH)', emoji: '💧', unit: '%RH', color: '#3b82f6' },
    { id: 'vpd', label: 'ความต่างของความดันไอน้ำ (VPD)', emoji: '💨', unit: 'kPa', color: '#a855f7' },
    { id: 'lux', label: 'ความส่องสว่าง (Lux)', emoji: '🔆', unit: 'Lux', color: '#eab308' },
    { id: 'ppfd', label: 'ค่าแสงที่พืชได้รับ (PPFD)', emoji: '☀️', unit: 'μmol', color: '#f97316' },
  ];

  const zoneConfig = [
    { id: 5, label: 'โซน A', sublabel: '', color: '#ec4899', bg: 'bg-pink-500' },
    { id: 2, label: 'โซน B', sublabel: '', color: '#3b82f6', bg: 'bg-blue-500' },
    { id: 4, label: 'โซน C', sublabel: '', color: '#f59e0b', bg: 'bg-amber-500' },
    { id: 1, label: 'โซน D', sublabel: '', color: '#10b981', bg: 'bg-emerald-500' },
    { id: 3, label: 'โซน E', sublabel: '', color: '#a855f7', bg: 'bg-purple-500' },
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



  // กรองข้อมูล 24 ชม.ย้อนหลัง
  const get24HourData = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return [...dataList]
      .filter(d => new Date(d.created_at) >= twentyFourHoursAgo)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getChartDataAndOptions = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sortedData = [...dataList]
      .filter(d => new Date(d.created_at) >= twentyFourHoursAgo)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const labels: string[] = [];
    for (let i = 48; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 30 * 60 * 1000);
      const h = time.getHours().toString().padStart(2, '0');
      const m = time.getMinutes() < 30 ? '00' : '30';
      labels.push(`${h}:${m}`);
    }

    const nowMs = now.getTime();

    if (comparisonMode === 'zones') {
      const datasets = compareZones.map(zone => {
        const zc = zoneConfig.find(z => z.id === zone)!;
        const zoneData = sortedData.filter(d => d.zone === zone);

        // แมปข้อมูลเข้า 49 จุดเวลา โดยเฉลี่ยข้อมูลที่ตกอยู่ในช่วง 30 นาทีของแต่ละช่องเวลา
        const dataPoints = labels.map((_, i) => {
          if (zoneData.length === 0) return null;
          
          const slotTimeMs = nowMs - (48 - i) * 30 * 60 * 1000;
          const rangeStart = slotTimeMs - 15 * 60 * 1000;
          const rangeEnd = slotTimeMs + 15 * 60 * 1000;
          
          const matchingPoints = zoneData.filter(d => {
            const time = new Date(d.created_at).getTime();
            return time >= rangeStart && time < rangeEnd;
          });
          
          if (matchingPoints.length === 0) return null;
          
          const sum = matchingPoints.reduce((acc, point) => {
            let val = 0;
            if (selectedMetric === 'ppfd') val = point.lux * DEFAULT_MULTIPLIER;
            else val = point[selectedMetric];
            return acc + val;
          }, 0);
          
          return sum / matchingPoints.length;
        });

        return {
          label: `${zc.label}`,
          data: dataPoints,
          borderColor: zc.color,
          backgroundColor: `${zc.color}18`,
          borderWidth: 2.5,
          tension: 0.4,
          fill: false,
          pointRadius: 1.5,
          pointHoverRadius: 6,
        };
      });

      // เส้นค่าเหมาะสม (annotation)
      const annotations: Record<string, any> = {};

      const textColor = theme === 'night' ? '#cbd5e1' : '#1e293b';
      const gridColor = theme === 'night' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)';

      const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 10, usePointStyle: true, font: { weight: 'bold' as const, size: 11 }, color: textColor }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: theme === 'night' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            titleColor: textColor,
            bodyColor: theme === 'night' ? '#94a3b8' : '#475569',
            borderColor: theme === 'night' ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' as const },
            bodyFont: { size: 12 }
          },
          annotation: { annotations }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 9.5, weight: 'bold' as const },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              autoSkipPadding: 8,
              color: textColor,
              callback: (_val: any, index: number): string | null => {
                const label = labels[index];
                if (!label || !label.includes(':')) return label || null;
                if (index === labels.length - 1 || index === 0) return label;
                const minutes = label.split(':')[1];
                if (minutes !== '00') return null;
                const hour = parseInt(label.split(':')[0]!, 10);
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                const interval = isMobile ? 3 : 2;
                if (hour % interval === 0 && (labels.length - 1 - index) > 2) {
                  return label;
                }
                return null;
              }
            }
          },
          y: {
            border: { dash: [4, 4] },
            grid: { color: gridColor },
            ticks: { font: { size: 10 }, color: textColor }
          }
        }
      };

      return { data: { labels, datasets }, options };
    } else {
      const zoneData = sortedData.filter(d => d.zone === metricsZone);

      const dataA = labels.map((_, i) => {
        if (zoneData.length === 0) return null;
        const slotTimeMs = nowMs - (48 - i) * 30 * 60 * 1000;
        const rangeStart = slotTimeMs - 15 * 60 * 1000;
        const rangeEnd = slotTimeMs + 15 * 60 * 1000;
        
        const matchingPoints = zoneData.filter(d => {
          const time = new Date(d.created_at).getTime();
          return time >= rangeStart && time < rangeEnd;
        });
        
        if (matchingPoints.length === 0) return null;
        
        const sum = matchingPoints.reduce((acc, point) => {
          let val = 0;
          if (compareMetricA === 'ppfd') val = point.lux * DEFAULT_MULTIPLIER;
          else val = point[compareMetricA];
          return acc + val;
        }, 0);
        return sum / matchingPoints.length;
      });

      const dataB = labels.map((_, i) => {
        if (zoneData.length === 0) return null;
        const slotTimeMs = nowMs - (48 - i) * 30 * 60 * 1000;
        const rangeStart = slotTimeMs - 15 * 60 * 1000;
        const rangeEnd = slotTimeMs + 15 * 60 * 1000;
        
        const matchingPoints = zoneData.filter(d => {
          const time = new Date(d.created_at).getTime();
          return time >= rangeStart && time < rangeEnd;
        });
        
        if (matchingPoints.length === 0) return null;
        
        const sum = matchingPoints.reduce((acc, point) => {
          let val = 0;
          if (compareMetricB === 'ppfd') val = point.lux * DEFAULT_MULTIPLIER;
          else val = point[compareMetricB];
          return acc + val;
        }, 0);
        return sum / matchingPoints.length;
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
          pointRadius: 1.5
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
          pointRadius: 1.5
        }
      ];

      const textColor = theme === 'night' ? '#cbd5e1' : '#1e293b';

      const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { boxWidth: 10, usePointStyle: true, font: { weight: 'bold' as const, size: 11 }, color: textColor }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: theme === 'night' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            titleColor: textColor,
            bodyColor: theme === 'night' ? '#94a3b8' : '#475569',
            borderColor: theme === 'night' ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' as const },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 9.5, weight: 'bold' as const },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              autoSkipPadding: 8,
              color: textColor,
              callback: (_val: any, index: number): string | null => {
                const label = labels[index];
                if (!label || !label.includes(':')) return label || null;
                if (index === labels.length - 1 || index === 0) return label;
                const minutes = label.split(':')[1];
                if (minutes !== '00') return null;
                const hour = parseInt(label.split(':')[0]!, 10);
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                const interval = isMobile ? 3 : 2;
                if (hour % interval === 0 && (labels.length - 1 - index) > 2) {
                  return label;
                }
                return null;
              }
            }
          },
          yA: {
            type: 'linear' as const,
            position: 'left' as const,
            ticks: { font: { size: 10 }, color: textColor },
            title: { display: true, text: `${tabA.label} (${tabA.unit})`, font: { size: 11, weight: 'bold' as const }, color: textColor }
          },
          yB: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 }, color: textColor },
            title: { display: true, text: `${tabB.label} (${tabB.unit})`, font: { size: 11, weight: 'bold' as const }, color: textColor }
          }
        }
      };

      return { data: { labels, datasets }, options };
    }
  };

  const { data, options } = getChartDataAndOptions();
  const currentMetricInfo = metricTabs.find(t => t.id === selectedMetric)!;

  return (
    <section
      className="border rounded-3xl p-5 shadow-xl space-y-5 theme-transition"
      style={{
        backgroundColor: 'var(--bg-section)',
        borderColor: 'var(--border-card)',
        boxShadow: `0 20px 60px ${theme === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.5)'}`,
      }}
    >

      {/* หัวข้อ + สวิตช์โหมด */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 theme-transition" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h3 className="text-base md:text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            📊 เปรียบเทียบข้อมูลโรงเรือน
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>ย้อนหลัง 24 ชั่วโมง พร้อมเส้นค่าเหมาะสม</p>
        </div>

        <div className="flex p-1.5 rounded-2xl gap-1 w-full sm:w-auto" style={{ backgroundColor: 'var(--bg-control)' }}>
          <button
            onClick={() => setComparisonMode('zones')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              comparisonMode === 'zones'
                ? 'shadow-sm'
                : ''
            }`}
            style={comparisonMode === 'zones'
              ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }
              : { color: 'var(--text-muted)' }
            }
          >
            <Layers size={14} />
            <span>เปรียบเทียบข้อมูลในแต่ละโซน</span>
          </button>
          <button
            onClick={() => setComparisonMode('metrics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              comparisonMode === 'metrics'
                ? 'shadow-sm'
                : ''
            }`}
            style={comparisonMode === 'metrics'
              ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }
              : { color: 'var(--text-muted)' }
            }
          >
            <RefreshCw size={14} />
            <span>เปรียบเทียบค่าสองค่าในแต่ละโซน</span>
          </button>
        </div>
      </div>

      {/* เนื้อหาหลัก: แผงควบคุม + กราฟ */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* แผงควบคุม */}
        <div
          className="lg:w-60 shrink-0 border p-4 rounded-2xl space-y-4 shadow-sm theme-transition"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >

          {comparisonMode === 'zones' ? (
            <>
              {/* เลือกค่าที่ต้องการดู */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <TrendingUp size={12} /> ค่าที่ต้องการดู
                </h4>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                  className="w-full border rounded-xl px-3 py-2.5 text-xs md:text-sm font-black focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm theme-transition"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
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
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <BarChart2 size={12} /> เลือกโซนที่จะแสดง
                </h4>
                <div className="flex flex-col gap-1.5">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => handleZoneToggle(z.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs md:text-sm font-bold text-left transition-all cursor-pointer`}
                      style={{
                        borderColor: compareZones.includes(z.id) ? 'var(--border-primary)' : 'transparent',
                        backgroundColor: compareZones.includes(z.id) ? 'var(--bg-card)' : 'transparent',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${z.bg}`} />
                      <span className="flex-1">{z.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{z.sublabel}</span>
                      <div className={`h-4.5 w-4.5 rounded-full border shrink-0 flex items-center justify-center text-[10px] transition-all ${
                        compareZones.includes(z.id)
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : ''
                      }`}
                        style={!compareZones.includes(z.id) ? { borderColor: 'var(--border-primary)', color: 'transparent' } : undefined}
                      >✓</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* เลือกโซนหลัก */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>เลือกโซน</h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {zoneConfig.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setMetricsZone(z.id)}
                      className={`py-2 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 border ${
                        metricsZone === z.id
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                          : ''
                      }`}
                      style={metricsZone !== z.id ? {
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-muted)',
                      } : undefined}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${metricsZone === z.id ? 'bg-white' : z.bg}`} />
                      {z.label.replace('โซน ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* เลือกค่าแกนซ้าย */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>ค่าแกนซ้าย</h4>
                <select
                  value={compareMetricA}
                  onChange={(e) => setCompareMetricA(e.target.value as MetricType)}
                  className="w-full border rounded-xl px-3 py-2.5 text-xs md:text-sm font-black focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm theme-transition"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {metricTabs.map(tab => (
                    <option key={tab.id} value={tab.id} disabled={compareMetricB === tab.id}>
                      {tab.emoji} {tab.label} ({tab.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* เลือกค่าแกนขวา */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>ค่าแกนขวา</h4>
                <select
                  value={compareMetricB}
                  onChange={(e) => setCompareMetricB(e.target.value as MetricType)}
                  className="w-full border rounded-xl px-3 py-2.5 text-xs md:text-sm font-black focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm theme-transition"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
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

        {/* คอนเทนเนอร์แสดงผลกราฟและสถิติ */}
        <div className="flex-1 flex flex-col gap-3">
          {/* แผงแสดงสถิติย้อนหลัง 24 ชั่วโมง (Min / Max / Avg) แทนเส้นประบนกราฟ */}
          <div 
            className="p-3.5 rounded-2xl border theme-transition flex flex-wrap gap-2 items-center"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="text-[10px] font-black uppercase tracking-wider w-full mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <span>📊 สถิติย้อนหลัง 24 ชั่วโมง (Min / Max / Avg):</span>
            </div>

            {comparisonMode === 'zones' ? (
              <div className="flex flex-wrap gap-2">
                {compareZones.map(zoneId => {
                  const zc = zoneConfig.find(z => z.id === zoneId);
                  if (!zc) return null;
                  const stats = getZoneStats(zoneId, selectedMetric);
                  if (stats.count === 0) return null;
                  const unit = currentMetricInfo.unit;
                  return (
                    <div 
                      key={zoneId} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold theme-transition"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${zc.bg}`} />
                      <span className="font-black" style={{ color: 'var(--text-primary)' }}>{zc.label}:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ต่ำสุด <span className="font-mono font-black text-emerald-500">{stats.min}</span> | 
                        สูงสุด <span className="font-mono font-black text-rose-500">{stats.max}</span> | 
                        เฉลี่ย <span className="font-mono font-black text-blue-500">{stats.avg}</span> {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                {(() => {
                  const statsA = getZoneStats(metricsZone, compareMetricA);
                  const statsB = getZoneStats(metricsZone, compareMetricB);
                  const tabA = metricTabs.find(t => t.id === compareMetricA)!;
                  const tabB = metricTabs.find(t => t.id === compareMetricB)!;
                  
                  return (
                    <>
                      <div 
                        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold theme-transition"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <span className="font-black" style={{ color: tabA.color }}>{tabA.emoji} {tabA.label}:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ต่ำสุด <span className="font-mono font-black text-emerald-500">{statsA.min}</span> | 
                          สูงสุด <span className="font-mono font-black text-rose-500">{statsA.max}</span> | 
                          เฉลี่ย <span className="font-mono font-black text-blue-500">{statsA.avg}</span> {tabA.unit}
                        </span>
                      </div>
                      <div 
                        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold theme-transition"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <span className="font-black" style={{ color: tabB.color }}>{tabB.emoji} {tabB.label}:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ต่ำสุด <span className="font-mono font-black text-emerald-500">{statsB.min}</span> | 
                          สูงสุด <span className="font-mono font-black text-rose-500">{statsB.max}</span> | 
                          เฉลี่ย <span className="font-mono font-black text-blue-500">{statsB.avg}</span> {tabB.unit}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* กราฟ */}
          <div
            className="flex-1 min-h-[290px] sm:min-h-[340px] border p-4 rounded-2xl relative shadow-inner theme-transition"
            style={{
              backgroundColor: theme === 'night' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="absolute top-2 right-3 text-xs font-black border px-2.5 py-1 rounded-full shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              หน่วย: {comparisonMode === 'zones' ? currentMetricInfo.unit : '2 แกน'}
            </div>
            <Line data={data} options={options} />
          </div>
        </div>

      </div>
    </section>
  );
};
