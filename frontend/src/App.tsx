import { useEffect, useState } from 'react';
import { Download, Calendar, RefreshCcw } from 'lucide-react';
import { api } from './services/api';
import type { SensorData, DiagnosticsResponse } from './services/api';
import { ControlPanel } from './features/control-panel/ControlPanel';
import { ClimateCards } from './features/climate-cards/ClimateCards';
import { ClimateDiagnostics } from './features/climate-diagnostics/ClimateDiagnostics';
import { ZoneComparison } from './features/zone-comparison/ZoneComparison';

export default function App() {
  const [selectedZone, setSelectedZone] = useState<number>(1);
  const [dataList, setDataList] = useState<SensorData[]>([]);
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsResponse | null>(null);

  // สเปกสำหรับช่วงวันดาวน์โหลดข้อมูลดิบ
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [isDownloading, setIsDownloading] = useState(false);

  // 📡 เชื่อมท่อสตรีมมิ่งสด (Server-Sent Events)
  useEffect(() => {
    // 1. ดึงประวัติข้อมูลเริ่มต้นมาเก็บในหน้าระบบก่อนเพื่อใช้วาดกราฟช่วงต้น
    const loadInitialLogs = async () => {
      const res = await api.getLogs(selectedZone, 150);
      if (res.success) {
        setDataList(res.data);
      }
    };
    loadInitialLogs();

    // 2. เชื่อมสายสตรีมสด
    const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:3001' : 'https://pangda-backend.onrender.com');
    const eventSource = new EventSource(`${BACKEND_URL}/api/sensors/stream`);

    eventSource.onmessage = (event) => {
      try {
        const newTicks = JSON.parse(event.data);
        if (Array.isArray(newTicks)) {
          setDataList((prev) => {
            const combined = [...newTicks, ...prev];
            // กรองขอบเขตประวัติสูงสุด 100 แถวต่อโซนในการเก็บบันทึกบนหน้าจอเพื่อความเบา
            const trimmed: SensorData[] = [];
            for (let z = 1; z <= 5; z++) {
              trimmed.push(...combined.filter((d) => d.zone === z).slice(0, 100));
            }
            return trimmed;
          });
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close(); // ตัดขั้วสตรีมเมื่อปิดหน้าบราวเซอร์
    };
  }, [selectedZone]);

  // 🔬 โหลดผลวิเคราะห์เกณฑ์พืชแบบสม่ำเสมอ
  useEffect(() => {
    const fetchDiagnostics = async () => {
      const res = await api.getDiagnostics(selectedZone);
      setDiagnosticsData(res);
    };

    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 5000); // อัปเดตผลทุก 5 วินาที
    return () => clearInterval(interval);
  }, [selectedZone]);

  // 📥 ฟังก์ชันดาวน์โหลดไฟล์ข้อมูลดิบเป็น CSV
  const handleDownloadCsv = async () => {
    if (!startDate || !endDate) {
      alert('กรุณาระบุวันเริ่มต้นและสิ้นสุด');
      return;
    }

    setIsDownloading(true);
    try {
      const res = await api.getHistoryRange(selectedZone, startDate, endDate);
      if (res.success && res.data.length > 0) {
        const headers = ['ID', 'Timestamp (วัน-เวลา)', 'Zone (โซน)', 'Temperature (°C)', 'Humidity (%RH)', 'VPD (kPa)', 'Lux', 'PPFD (μmol/m²/s)'];
        const csvRows = [headers.join(',')];

        res.data.forEach((row) => {
          const values = [
            row.id,
            new Date(row.created_at).toLocaleString('th-TH'),
            row.zone,
            row.temperature,
            row.humidity,
            row.vpd,
            row.lux,
            row.ppfd
          ];
          csvRows.push(values.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `greenhouse_zone_${selectedZone}_history_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('ไม่พบข้อมูลบันทึกในช่วงเวลาที่ระบุ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการโหลดไฟล์ข้อมูลดิบ');
    } finally {
      setIsDownloading(false);
    }
  };

  const currentLatest = dataList.filter((d) => d.zone === selectedZone).slice(-1)[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">
      
      {/* 🖤 แถบหัวกระดาษหน้าเว็บสีดำเข้มพรีเมียม (Slate-950) ตรงดั่งต้นแบบ */}
      <header className="bg-slate-950 border-b border-slate-900 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20">
              G
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">Greenhouse Live Portal</h1>
              <p className="text-[10px] text-slate-400 mt-1">ระบบจัดการโครงงานและคำนวณสรีรวิทยาพืชระดับ Enterprise</p>
            </div>
          </div>
          
          <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            <span>หน้าบ้าน: พร้อมเชื่อมต่อข้อมูลสด</span>
          </div>
        </div>
      </header>

      {/* เนื้อหารายละเอียดทั้งหมด */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* หน้าปัดคุมโซน */}
        <ControlPanel selectedZone={selectedZone} onZoneSelect={(z) => setSelectedZone(z)} />

        {/* การ์ดข้อมูลเซนเซอร์พร้อม Sparklines */}
        <ClimateCards latestData={currentLatest} history={dataList.filter(d => d.zone === selectedZone)} />

        {/* กล่องวิเคราะห์เกณฑ์ความปลอดภัยและเกษตรกรรมธีมมืดดั่งต้นแบบ */}
        <ClimateDiagnostics diagnosticsData={diagnosticsData} />

        {/* แผงวิเคราะห์และเปรียบเทียบชาร์ตกราฟ */}
        <ZoneComparison dataList={dataList} selectedZone={selectedZone} />

        {/* ฟังก์ชันดาวน์โหลดไฟล์ข้อมูลดิบสไตล์ปฏิทิน Monospace */}
        <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-100/30 space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <span>ดาวน์โหลดข้อมูลดิบของโซน {selectedZone} (CSV Export)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">ระบุช่วงเวลากราฟสถิติตามการเลือกพารามิเตอร์วันปฏิทิน</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-extrabold tracking-widest text-slate-400 block uppercase">วันเริ่มต้น:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-extrabold tracking-widest text-slate-400 block uppercase">วันสิ้นสุด:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              onClick={handleDownloadCsv}
              disabled={isDownloading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isDownloading ? <RefreshCcw size={12} className="animate-spin" /> : <Download size={12} />}
              <span>{isDownloading ? 'กำลังดึงข้อมูล...' : 'ดาวน์โหลดข้อมูล (Export)'}</span>
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
