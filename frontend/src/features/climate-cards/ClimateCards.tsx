import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Thermometer, Droplets, Wind, Sun, Info } from 'lucide-react';
import { PpfdModal } from './PpfdModal';
import { DEFAULT_MULTIPLIER } from '../../shared/utils/ppfd';
import type { SensorData } from '../../services/api';

interface ClimateCardsProps {
  latestData: SensorData | null;
  history: SensorData[];
}

export const ClimateCards: React.FC<ClimateCardsProps> = ({ latestData, history }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);

  const temp = latestData ? latestData.temperature : 0;
  const hum = latestData ? latestData.humidity : 0;
  const vpd = latestData ? latestData.vpd : 0;
  const lux = latestData ? latestData.lux : 0;
  const ppfd = parseFloat((lux * multiplier).toFixed(2));

  const createSparklineData = (metric: 'temperature' | 'humidity' | 'vpd' | 'ppfd', color: string) => {
    const points = history.slice(-15).map(h => {
      if (metric === 'ppfd') return h.lux * multiplier;
      return h[metric];
    });

    return {
      labels: points.map((_, i) => i.toString()),
      datasets: [
        {
          data: points,
          borderColor: color,
          backgroundColor: `${color}18`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  const cards = [
    {
      title: 'อุณหภูมิอากาศ',
      subtitle: 'DHT22 Sensor',
      value: `${temp.toFixed(1)}`,
      unit: '°C',
      desc: 'อุณหภูมิความร้อนแวดล้อม',
      icon: <Thermometer size={16} />,
      borderColor: 'border-rose-200',
      bgGlow: 'bg-rose-500/5',
      iconBg: 'bg-rose-50 border-rose-100',
      sparkColor: '#f43f5e',
      sparkline: createSparklineData('temperature', '#f43f5e'),
      textColor: 'text-rose-500',
      valueColor: 'text-rose-600',
    },
    {
      title: 'ความชื้นสัมพัทธ์',
      subtitle: 'DHT22 Sensor',
      value: `${hum.toFixed(1)}`,
      unit: '%RH',
      desc: 'ระดับไอน้ำสัมพัทธ์สะสม',
      icon: <Droplets size={16} />,
      borderColor: 'border-blue-200',
      bgGlow: 'bg-blue-500/5',
      iconBg: 'bg-blue-50 border-blue-100',
      sparkColor: '#3b82f6',
      sparkline: createSparklineData('humidity', '#3b82f6'),
      textColor: 'text-blue-500',
      valueColor: 'text-blue-600',
    },
    {
      title: 'Vapor Pressure Deficit',
      subtitle: 'VPD (คำนวณจาก T + RH)',
      value: `${vpd.toFixed(2)}`,
      unit: 'kPa',
      desc: 'แรงดันไอขาดน้ำปากใบพืช',
      icon: <Wind size={16} />,
      borderColor: 'border-purple-200',
      bgGlow: 'bg-purple-500/5',
      iconBg: 'bg-purple-50 border-purple-100',
      sparkColor: '#a855f7',
      sparkline: createSparklineData('vpd', '#a855f7'),
      textColor: 'text-purple-500',
      valueColor: 'text-purple-600',
    },
    {
      title: 'ความเข้มแสงแวดล้อม',
      subtitle: 'BH1750 Light Sensor',
      value: `${ppfd.toLocaleString()}`,
      unit: 'μmol/m²/s',
      desc: `💡 ${lux.toLocaleString()} Lux (แสงดิบ)`,
      icon: <Sun size={16} />,
      borderColor: 'border-amber-200',
      bgGlow: 'bg-amber-500/5',
      iconBg: 'bg-amber-50 border-amber-100',
      sparkColor: '#f59e0b',
      sparkline: createSparklineData('ppfd', '#f59e0b'),
      textColor: 'text-amber-500',
      valueColor: 'text-amber-600',
      action: (
        <button
          id="ppfd-info-btn"
          onClick={() => setIsModalOpen(true)}
          title="ดูรายละเอียดการคำนวณ PPFD"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-amber-500 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer text-[10px] font-bold"
        >
          <Info size={11} />
          <span>สูตรคำนวณ</span>
        </button>
      )
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-white border-2 ${card.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden`}
          >
            {/* กลักแสงหัวการ์ด */}
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 ${card.bgGlow}`} />

            {/* หัวการ์ด: ไอคอน + ปุ่มข้อมูล */}
            <div className="flex justify-between items-start z-10">
              <div className={`p-2 rounded-xl border ${card.iconBg} ${card.textColor}`}>
                {card.icon}
              </div>
              {card.action}
            </div>

            {/* ตัวเลขหลัก */}
            <div className="z-10">
              <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase leading-none mb-1">
                {card.title}
              </div>
              <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${card.valueColor}`}>
                {latestData ? card.value : '---'}
                <span className="text-sm md:text-base font-bold ml-1 text-slate-400">{card.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">{card.desc}</div>
            </div>

            {/* Sparkline */}
            <div className="h-10 w-full">
              <Line data={card.sparkline} options={sparklineOptions} />
            </div>
          </div>
        ))}
      </div>

      <PpfdModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLux={lux}
        currentMultiplier={multiplier}
        onMultiplierChange={(val) => setMultiplier(val)}
      />
    </>
  );
};
