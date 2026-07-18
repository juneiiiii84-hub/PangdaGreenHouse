export interface SensorData {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  vpd: number;
  lux: number;
  ppfd: number;
  zone: number;
}

export interface DiagnosticsResponse {
  success: boolean;
  isSimulationMode: boolean;
  diagnostics: {
    temp: DiagnosticItem;
    hum: DiagnosticItem;
    vpd: DiagnosticItem;
    ppfd: DiagnosticItem;
    lux?: DiagnosticItem;
  } | null;
  overall: {
    text: string;
    color: string;
    desc: string;
    icon: string;
  };
}

export interface DiagnosticItem {
  state: 'excellent' | 'good' | 'warning' | 'critical';
  status: string;
  color: string;
  desc: string;
  recommendation: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : 'https://pangdagreenhouse.onrender.com');
const API_BASE = `${BACKEND_URL}/api/sensors`;

export const api = {
  // ดึงประวัติข้อมูลย้อนหลังของโซนนั้นๆ (เพื่อเอามาวาดกราฟ)
  async getLogs(zone: number, limit: number = 100): Promise<{ success: boolean; data: SensorData[] }> {
    try {
      const res = await fetch(`${API_BASE}/logs?zone=${zone}&limit=${limit}`);
      return await res.json();
    } catch (e) {
      console.error('ไม่สามารถเรียกประวัติข้อมูลได้:', e);
      return { success: false, data: [] };
    }
  },

  // ดึงประวัติตามช่วงเวลาสำหรับปุ่มดาวน์โหลดไฟล์ข้อมูลดิบ (CSV/Excel)
  async getHistoryRange(zone: number, start: string, end: string): Promise<{ success: boolean; data: SensorData[] }> {
    try {
      const res = await fetch(`${API_BASE}/history?zone=${zone}&start=${start}&end=${end}`);
      return await res.json();
    } catch (e) {
      console.error('ไม่สามารถเรียกข้อมูลประวัติช่วงเวลาได้:', e);
      return { success: false, data: [] };
    }
  },

  // ดึงรายงานผลเกณฑ์ประเมินการเกษตร
  async getDiagnostics(zone: number): Promise<DiagnosticsResponse> {
    try {
      const res = await fetch(`${API_BASE}/diagnostics?zone=${zone}`);
      return await res.json();
    } catch (e) {
      console.error('ไม่สามารถเรียกผลวิเคราะห์ได้:', e);
      return {
        success: false,
        isSimulationMode: true,
        diagnostics: null,
        overall: { text: 'ขาดการเชื่อมต่อ', color: 'bg-slate-300 text-slate-700', desc: 'ไม่สามารถคุยกับเซิร์ฟเวอร์หลังบ้านได้', icon: 'rose' }
      };
    }
  },

  // ส่งคำขอสั่งรีบูทบอร์ด ESP32
  async requestReboot(zone: number): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/reboot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone })
      });
      return await res.json();
    } catch (e) {
      console.error('ไม่สามารถส่งคำขอรีบูทบอร์ดได้:', e);
      return { success: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้' };
    }
  }
};
