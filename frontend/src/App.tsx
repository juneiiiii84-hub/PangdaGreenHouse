import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Download, Calendar, RefreshCcw, ChevronDown } from 'lucide-react';
import flatpickr from 'flatpickr';
import { api } from './services/api';
import type { SensorData } from './services/api';
import { ControlPanel } from './features/control-panel/ControlPanel';
import { ClimateCards } from './features/climate-cards/ClimateCards';
import { ZoneComparison } from './features/zone-comparison/ZoneComparison';
import { ZoneAverages } from './features/zone-averages/ZoneAverages';
import { useTheme } from './shared/utils/useTheme';

export default function App() {
  const [selectedZone, setSelectedZone] = useState<number>(5);
  const [dataList, setDataList] = useState<SensorData[]>([]);
  const diagnosticsData = null;
  // เก็บค่าล่าสุดแยกตามโซน — ไม่มีวันกลับเป็น null หลังจากได้รับข้อมูลครั้งแรก (ป้องกัน Flicker)
  const [latestByZone, setLatestByZone] = useState<Record<number, SensorData>>({});
  // flag ว่าข้อมูลชุดแรกโหลดเสร็จแล้ว — ใช้แสดง skeleton แทน --- ระหว่างรอ
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // สเปกสำหรับช่วงวันดาวน์โหลดข้อมูลดิบ
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [downloadZone, setDownloadZone] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadWarning, setDownloadWarning] = useState<string>('');

  const datePickerRef = useRef<HTMLInputElement>(null);

  // ธีมกลางวัน/กลางคืนอัตโนมัติ
  const themePeriod = useTheme();

  const [currentTime, setCurrentTime] = useState(Date.now());

  // อัปเดตเวลาปัจจุบันเพื่อคำนวณ Offline Timeout แบบ Real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 📡 เชื่อมท่อสตรีมมิ่งสด (Server-Sent Events) และดึงประวัติเริ่มต้นสำหรับทุกโซน
  useEffect(() => {
    // ลบ cache เก่าที่อาจเหลืออยู่จากเวอร์ชันก่อนหน้า
    localStorage.removeItem('pangda_greenhouse_data');
    localStorage.removeItem('pangda_greenhouse_diagnostics');

    // 1. ดึงประวัติข้อมูลเริ่มต้นของทั้ง 5 โซนในเวลาเดียวกันเพื่อแสดงค่าเฉลี่ย
    const loadInitialLogs = async () => {
      try {
        const promises = Array.from({ length: 5 }, (_, i) => api.getLogs(i + 1, 288));
        const results = await Promise.all(promises);
        const allData: SensorData[] = [];
        results.forEach((res) => {
          if (res.success && res.data.length > 0) {
            allData.push(...res.data);
          }
        });
        setDataList(allData);
        setIsInitialLoaded(true); // บอก UI ว่าข้อมูลชุดแรกพร้อมแล้ว หยุดแสดง skeleton
      } catch (err) {
        console.error('ไม่สามารถโหลดข้อมูลประวัติเริ่มต้นได้:', err);
        setIsInitialLoaded(true); // ถ้า error ก็หยุด skeleton ไม่ให้ค้างตลอดกาล
      }
    };
    loadInitialLogs();

    // 2. เชื่อมสายสตรีมสด
    const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : 'https://pangdagreenhouse.onrender.com');
    const eventSource = new EventSource(`${BACKEND_URL}/api/sensors/stream`);

    eventSource.onerror = (err) => {
      console.error('SSE Connection failed or closed:', err);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (!parsed) return;

        // แปลงให้เป็น Array เสมอ ไม่ว่าจะส่งมาเป็น Object เดียวหรือ Array
        const ticksArray = Array.isArray(parsed) ? parsed : [parsed];

        // กรองข้อมูลเฉพาะตัวที่มีค่าอุณหภูมิและความชื้นจริง (เพื่อข้ามข้อความเช่น {"connected": true})
        const validTicks = ticksArray.filter((t: any) => t && t.temperature !== undefined && t.humidity !== undefined);

        if (validTicks.length > 0) {
          // SSE stream ส่งมา — ถ้า initial ยังไม่เสร็จให้ mark ว่าเสร็จได้เลย
          setIsInitialLoaded(true);
          setDataList((prev) => {
            const combined = [...prev, ...validTicks];
            // กรองขอบเขตประวัติสูงสุด 288 แถว (24 ชั่วโมง) ต่อโซนในการเก็บบันทึกบนหน้าจอเพื่อความเบา
            const trimmed: SensorData[] = [];
            for (let z = 1; z <= 5; z++) {
              trimmed.push(...combined.filter((d) => d.zone === z).slice(-288));
            }
            return trimmed;
          });
          // อัปเดต latestByZone ทันทีที่ SSE stream ส่งมา — ไม่ flicker เพราะไม่มีช่วงที่เป็น null
          setLatestByZone((prev) => {
            const updated = { ...prev };
            validTicks.forEach((t: SensorData) => { if (t.zone) updated[t.zone] = t; });
            return updated;
          });
        }
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    };

    return () => {
      eventSource.close(); // ตัดขั้วสตรีมเมื่อปิดหน้าบราวเซอร์
    };
  }, []);

  // 🔬 โหลดประวัติล่าสุดของโซนที่เลือกแบบครั้งเดียวเมื่อเปลี่ยนโซน (หลีกเลี่ยงการทำ Polling ซ้ำซ้อนกับ SSE Stream)
  useEffect(() => {
    const fetchZoneLogs = async () => {
      try {
        const logsRes = await api.getLogs(selectedZone, 288);
        if (logsRes.success && logsRes.data.length > 0) {
          setDataList((prev) => {
            const filteredPrev = prev.filter((d) => d.zone !== selectedZone);
            return [...filteredPrev, ...logsRes.data];
          });
        }
      } catch (err) {
        console.error('Error fetching zone logs:', err);
      }
    };

    fetchZoneLogs();
  }, [selectedZone]);

  // 📅 เริ่มต้นใช้งาน Flatpickr สำหรับเลือกช่วงวันที่ในปฏิทินเดียว
  useEffect(() => {
    if (!datePickerRef.current) return;

    const fp = flatpickr(datePickerRef.current, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      onChange: (selectedDates) => {
        setDownloadWarning('');
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        if (selectedDates.length === 2) {
          setStartDate(formatDate(selectedDates[0]!));
          setEndDate(formatDate(selectedDates[1]!));
        } else if (selectedDates.length === 1) {
          setStartDate(formatDate(selectedDates[0]!));
          setEndDate('');
        } else {
          setStartDate('');
          setEndDate('');
        }
      }
    });

    return () => {
      fp.destroy();
    };
  }, []);

  // 📥 ฟังก์ชันดาวน์โหลดไฟล์ข้อมูลเป็น Excel
  const handleDownloadExcel = async () => {
    setDownloadWarning('');

    if (!startDate || !endDate) {
      setDownloadWarning('⚠️ กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดก่อนดาวน์โหลด');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setDownloadWarning('⚠️ วันเริ่มต้นต้องไม่เกินวันสิ้นสุด');
      return;
    }

    setIsDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;

      const zonesToDownload = downloadZone === 'all'
        ? [1, 2, 3, 4, 5]
        : [parseInt(downloadZone)];

      for (const z of zonesToDownload) {
        const res = await api.getHistoryRange(z, startDate, endDate);
        if (res.success && res.data.length > 0) {
          hasData = true;
          const headers = ['ID', 'วัน-เวลา', 'โซน', 'อุณหภูมิ (°C)', 'ความชื้น (%RH)', 'VPD (kPa)', 'Lux', 'PPFD (μmol/m²/s)'];

          const wsData: any[][] = [headers];
          res.data.forEach((row) => {
            wsData.push([
              row.id,
              new Date(row.created_at).toLocaleString('th-TH'),
              row.zone,
              row.temperature,
              row.humidity,
              row.vpd,
              row.lux,
              row.ppfd
            ]);
          });

          const ws = XLSX.utils.aoa_to_sheet(wsData);
          const zoneLetter = z === 5 ? 'A' : z === 2 ? 'B' : z === 4 ? 'C' : z === 1 ? 'D' : 'E';
          XLSX.utils.book_append_sheet(wb, ws, `โซน ${zoneLetter}`);
        }
      }

      if (hasData) {
        const zoneLetter = downloadZone === '5' ? 'A' : downloadZone === '2' ? 'B' : downloadZone === '4' ? 'C' : downloadZone === '1' ? 'D' : 'E';
        const zoneLabel = downloadZone === 'all' ? 'ทุกโซน' : `โซน${zoneLetter}`;
        XLSX.writeFile(wb, `ข้อมูลโรงเรือน_${zoneLabel}_${startDate}_ถึง_${endDate}.xlsx`);
      } else {
        setDownloadWarning('ไม่พบข้อมูลในช่วงเวลาที่เลือก');
      }
    } catch (e) {
      setDownloadWarning('เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่');
    } finally {
      setIsDownloading(false);
    }
  };

  // ใช้ latestByZone และประเมินสถานะออนไลน์ของเซ็นเซอร์
  const stableLatest = latestByZone[selectedZone] || null;

  // ตรวจสอบสถานะออนไลน์ของเซนเซอร์
  // ข้อมูลจะต้องมาจาก SSE Stream (Real-time) เท่านั้น และต้องส่งมาไม่เกิน 15 วินาที
  const isSensorOnline = (() => {
    if (!stableLatest) return false;
    const timeDiff = currentTime - new Date(stableLatest.created_at).getTime();
    return timeDiff < 15000; // เก่าเกิน 15 วินาทีถือว่าออฟไลน์
  })();

  const currentLatest = isSensorOnline ? stableLatest : null;

  return (
    <div className={`min-h-screen pb-16 font-sans theme-transition ${themePeriod === 'night' ? 'theme-night' : 'theme-day'}`}
      style={{ backgroundColor: 'var(--bg-page)' }}
    >

      {/* แถบหัวเว็บ */}
      <header
        className="border-b py-4.5 sticky top-0 z-40 shadow-md theme-transition"
        style={{
          background: `linear-gradient(to right, var(--header-from), var(--header-to))`,
          borderColor: 'var(--header-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 p-1.5 rounded-2xl shadow-sm border border-emerald-100/30 flex items-center justify-center animate-bounce hover:scale-105 transition-transform shrink-0" style={{ animationDuration: '3s' }}>
              <img src="/favicon.svg" alt="Greenhouse Logo" className="h-9 w-9" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-none">ระบบตรวจวัดสภาวะอากาศในโรงเรือนเพาะพันธุ์ไม้ผล</h1>
              <p className="text-xs text-emerald-50 mt-1.5 font-bold">(สถานีเกษตรหลวงปางดะ)</p>
            </div>
          </div>

          <div
            className="text-xs text-white px-3 py-1.5 rounded-xl font-black flex items-center gap-2 border border-white/20 transition-all duration-300"
            style={{ backgroundColor: isSensorOnline ? 'var(--header-badge-bg)' : 'rgba(239, 68, 68, 0.2)' }}
          >
            <span className={`h-2 w-2 rounded-full inline-block ${isSensorOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
            <span>{isSensorOnline ? '🟢 Online' : '🔴 Sensor Offline'}</span>
          </div>
        </div>
      </header>

      {/* เนื้อหาทั้งหมด */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ค่าเฉลี่ยรวมโรงเรือน */}
        <div className="animate-fade-in-up">
          <ZoneAverages dataList={dataList} theme={themePeriod} isInitialLoaded={isInitialLoaded} />
        </div>

        {/* เลือกโซน */}
        <div className="animate-fade-in-up delay-75">
          <ControlPanel selectedZone={selectedZone} onZoneSelect={(z) => setSelectedZone(z)} theme={themePeriod} />
        </div>

        {/* การ์ดข้อมูลเซนเซอร์ */}
        <div className="animate-fade-in-up delay-150">
          <ClimateCards
            latestData={currentLatest}
            history={dataList.filter(d => d.zone === selectedZone)}
            diagnosticsData={diagnosticsData}
            theme={themePeriod}
            isInitialLoaded={isInitialLoaded}
          />
        </div>

        {/* กราฟเปรียบเทียบ */}
        <div className="animate-fade-in-up delay-225">
          <ZoneComparison dataList={dataList} selectedZone={selectedZone} theme={themePeriod} />
        </div>

        {/* ดาวน์โหลดข้อมูล */}
        <div className="animate-fade-in-up delay-300">
          <section
            className="border rounded-[32px] p-5 shadow-xl space-y-4 theme-transition"
            style={{
              backgroundColor: 'var(--bg-section)',
              borderColor: 'var(--border-card)',
              boxShadow: `0 20px 60px ${themePeriod === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.3)'}`,
            }}
          >
            <div>
              <h3 className="text-base md:text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                <span>ดาวน์โหลดข้อมูลโรงเรือน</span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>เลือกโซนและช่วงวันที่ แล้วกดดาวน์โหลดเป็นไฟล์ Excel</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* เลือกโซน */}
              <div className="space-y-1">
                <label className="text-xs font-black tracking-wider block uppercase" style={{ color: 'var(--text-muted)' }}>เลือกโซน:</label>
                <div className="relative">
                  <select
                    value={downloadZone}
                    onChange={(e) => setDownloadZone(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer theme-transition"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="all">ทุกโซน (A-E)</option>
                    <option value="5">โซน A</option>
                    <option value="2">โซน B</option>
                    <option value="4">โซน C</option>
                    <option value="1">โซน D</option>
                    <option value="3">โซน E</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* เลือกวันที่ */}
              <div className="space-y-1">
                <label className="text-xs font-black tracking-wider block uppercase" style={{ color: 'var(--text-muted)' }}>เลือกช่วงวันที่:</label>
                <input
                  ref={datePickerRef}
                  type="text"
                  placeholder="คลิกเพื่อเลือก วันเริ่มต้น ➔ วันสิ้นสุด..."
                  className="w-full px-3 py-2.5 border rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono theme-transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* ข้อความเตือน */}
              {downloadWarning && (
                <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  {downloadWarning}
                </div>
              )}

              <button
                onClick={handleDownloadExcel}
                disabled={isDownloading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm md:text-base font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isDownloading ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
                <span>{isDownloading ? 'กำลังดึงข้อมูล...' : `ดาวน์โหลด Excel (${downloadZone === 'all' ? 'ทุกโซน' : `โซน ${downloadZone === '5' ? 'A' : downloadZone === '2' ? 'B' : downloadZone === '4' ? 'C' : downloadZone === '1' ? 'D' : 'E'}`})`}</span>
              </button>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
