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
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
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
      title: 'อุณหภูมิอากาศ (DHT22)',
      value: `${temp.toFixed(1)} °C`,
      desc: 'อุณหภูมิความร้อนแวดล้อม',
      icon: <Thermometer size={14} />,
      glowClass: 'after:bg-rose-500/5',
      sparkline: createSparklineData('temperature', '#f43f5e'),
      textColor: 'text-rose-500'
    },
    {
      title: 'ความชื้นสัมพัทธ์ (DHT22)',
      value: `${hum.toFixed(1)} %RH`,
      desc: 'ระดับไอน้ำสัมพัทธ์สะสม',
      icon: <Droplets size={14} />,
      glowClass: 'after:bg-blue-500/5',
      sparkline: createSparklineData('humidity', '#3b82f6'),
      textColor: 'text-blue-500'
    },
    {
      title: 'Vapor Pressure Deficit (VPD)',
      value: `${vpd.toFixed(2)} kPa`,
      desc: 'แรงดันไอขาดน้ำปากใบพืช',
      icon: <Wind size={14} />,
      glowClass: 'after:bg-purple-500/5',
      sparkline: createSparklineData('vpd', '#a855f7'),
      textColor: 'text-purple-500'
    },
    {
      title: 'ความเข้มแสงแวดล้อม (PPFD)',
      value: `${ppfd.toLocaleString()} μmol`,
      desc: `ความสว่าง ${lux.toLocaleString()} LUX`,
      icon: <Sun size={14} />,
      glowClass: 'after:bg-amber-500/5',
      sparkline: createSparklineData('ppfd', '#f59e0b'),
      textColor: 'text-amber-500',
      action: (
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-500 transition-all cursor-pointer flex items-center justify-center"
        >
          <Info size={13} />
        </button>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white border border-slate-100 rounded-2xl md:rounded-[24px] p-4 md:p-5 shadow-lg shadow-slate-100/30 flex flex-col justify-between space-y-3 relative overflow-hidden after:content-[""] after:absolute after:top-0 after:right-0 after:w-28 after:h-28 after:rounded-full after:blur-2xl after:-mr-6 after:-mt-6 ${card.glowClass}`}
        >
          <div className="flex justify-between items-center">
            <div className={`p-1.5 bg-slate-50 rounded-lg ${card.textColor} border border-slate-100`}>
              {card.icon}
            </div>
            {card.action}
          </div>

          <div className="space-y-0.5 z-10">
            <span className="text-[9px] md:text-[10px] font-black tracking-wider text-slate-400 block uppercase">
              {card.title}
            </span>
            <span className="text-xl md:text-2xl font-black text-slate-800 font-mono tracking-tight block">
              {latestData ? card.value : '---'}
            </span>
            <span className="text-[9px] text-slate-400 block font-bold">
              {card.desc}
            </span>
          </div>

          <div className="h-10 w-full pt-1">
            <Line data={card.sparkline} options={sparklineOptions} />
          </div>
        </div>
      ))}

      <PpfdModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLux={lux}
        currentMultiplier={multiplier}
        onMultiplierChange={(val) => setMultiplier(val)}
      />
    </div>
  );
};
