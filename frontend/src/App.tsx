import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Download, Calendar, RefreshCcw, ChevronDown } from 'lucide-react';
import flatpickr from 'flatpickr';
import { api } from './services/api';
import type { SensorData, DiagnosticsResponse } from './services/api';
import { ControlPanel } from './features/control-panel/ControlPanel';
import { ClimateCards } from './features/climate-cards/ClimateCards';
import { ZoneComparison } from './features/zone-comparison/ZoneComparison';
import { ZoneAverages } from './features/zone-averages/ZoneAverages';
import { useTheme } from './shared/utils/useTheme';

export default function App() {
  const [selectedZone, setSelectedZone] = useState<number>(1);
  const [dataList, setDataList] = useState<SensorData[]>([]);
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsResponse | null>(null);

  // สเปกสำหรับช่วงวันดาวน์โหลดข้อมูลดิบ
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [downloadZone, setDownloadZone] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadWarning, setDownloadWarning] = useState<string>('');

  const datePickerRef = useRef<HTMLInputElement>(null);

  // ธีมกลางวัน/กลางคืนอัตโนมัติ
  const themePeriod = useTheme();

  // 📡 เชื่อมท่อสตรีมมิ่งสด (Server-Sent Events) และดึงประวัติเริ่มต้นสำหรับทุกโซน
  useEffect(() => {
    // 1. ดึงประวัติข้อมูลเริ่มต้นของทั้ง 5 โซนในเวลาเดียวกันเพื่อแสดงค่าเฉลี่ย
    const loadInitialLogs = async () => {
      try {
        const promises = Array.from({ length: 5 }, (_, i) => api.getLogs(i + 1, 100));
        const results = await Promise.all(promises);
        const allData: SensorData[] = [];
        results.forEach((res) => {
          if (res.success) {
            allData.push(...res.data);
          }
        });
        setDataList(allData);
      } catch (err) {
        console.error('ไม่สามารถโหลดข้อมูลประวัติเริ่มต้นได้:', err);
      }
    };
    loadInitialLogs();

    // 2. เชื่อมสายสตรีมสด
    const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : 'https://pangdagreenhouse.onrender.com');
    console.log('Connecting to SSE at:', `${BACKEND_URL}/api/sensors/stream`);
    const eventSource = new EventSource(`${BACKEND_URL}/api/sensors/stream`);

    eventSource.onopen = () => {
      console.log('SSE Connection opened successfully!');
    };

    eventSource.onerror = (err) => {
      console.error('SSE Connection failed or closed:', err);
    };

    eventSource.onmessage = (event) => {
      console.log('SSE raw data received:', event.data);
      try {
        const parsed = JSON.parse(event.data);
        if (!parsed) return;

        // แปลงให้เป็น Array เสมอ ไม่ว่าจะส่งมาเป็น Object เดียวหรือ Array
        const ticksArray = Array.isArray(parsed) ? parsed : [parsed];

        // กรองข้อมูลเฉพาะตัวที่มีค่าอุณหภูมิและความชื้นจริง (เพื่อข้ามข้อความเช่น {"connected": true})
        const validTicks = ticksArray.filter((t: any) => t && t.temperature !== undefined && t.humidity !== undefined);

        if (validTicks.length > 0) {
          setDataList((prev) => {
            const combined = [...prev, ...validTicks];
            // กรองขอบเขตประวัติสูงสุด 100 แถวต่อโซนในการเก็บบันทึกบนหน้าจอเพื่อความเบา
            const trimmed: SensorData[] = [];
            for (let z = 1; z <= 5; z++) {
              trimmed.push(...combined.filter((d) => d.zone === z).slice(-100));
            }
            return trimmed;
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

  // 📅 เริ่มต้นใช้งาน Flatpickr สำหรับเลือกช่วงวันที่ในปฏิทินเดียว
  useEffect(() => {
    if (!datePickerRef.current) return;

    const fp = flatpickr(datePickerRef.current, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      onChange: (selectedDates) => {
        setDownloadWarning('');
        if (selectedDates.length === 2) {
          const start = selectedDates[0]!.toISOString().split('T')[0]!;
          const end = selectedDates[1]!.toISOString().split('T')[0]!;
          setStartDate(start);
          setEndDate(end);
        } else if (selectedDates.length === 1) {
          const start = selectedDates[0]!.toISOString().split('T')[0]!;
          setStartDate(start);
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

  const currentLatest = dataList.filter((d) => d.zone === selectedZone).slice(-1)[0] || null;

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
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-black text-base shadow-md shadow-emerald-700/25">
              G
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold text-white tracking-tight leading-none">Greenhouse Live Portal</h1>
              <p className="text-xs text-emerald-50 mt-1 font-medium">ระบบดูแลโรงเรือนอัจฉริยะ</p>
            </div>
          </div>

          <div
            className="text-xs text-white px-3 py-1.5 rounded-xl font-black flex items-center gap-2 border border-white/20"
            style={{ backgroundColor: 'var(--header-badge-bg)' }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            <span>🟢 Online</span>
          </div>
        </div>
      </header>

      {/* เนื้อหาทั้งหมด */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* เลือกโซน */}
        <ControlPanel selectedZone={selectedZone} onZoneSelect={(z) => setSelectedZone(z)} theme={themePeriod} />

        {/* การ์ดข้อมูลเซนเซอร์ */}
        <ClimateCards latestData={currentLatest} history={dataList.filter(d => d.zone === selectedZone)} diagnosticsData={diagnosticsData} theme={themePeriod} />

        {/* ค่าเฉลี่ยรวมโรงเรือน */}
        <ZoneAverages dataList={dataList} theme={themePeriod} />

        {/* กราฟเปรียบเทียบ */}
        <ZoneComparison dataList={dataList} selectedZone={selectedZone} theme={themePeriod} />

        {/* ดาวน์โหลดข้อมูล */}
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

      </main>
    </div>
  );
}
