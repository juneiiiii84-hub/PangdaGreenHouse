import type { ISensorRepository, SensorData } from '../repositories/sensor.repository.interface.js';

export interface DiagnosticResult {
  state: 'excellent' | 'good' | 'warning' | 'critical';
  status: string;
  color: string;
  desc: string;
  recommendation: string;
}

export interface OverallEvaluation {
  text: string;
  color: string;
  desc: string;
  icon: string;
}

export class ClimateService {
  constructor(private sensorRepo: ISensorRepository) {}

  calculateVPD(temp: number, rh: number): number {
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const vpd = svp * (1 - rh / 100);
    return parseFloat(vpd.toFixed(2));
  }

  getDiagnosticStatus(value: number, type: 'temp' | 'hum' | 'vpd' | 'ppfd'): DiagnosticResult {
    if (type === 'temp') {
      if (value >= 25 && value <= 30) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เหมาะสมมาก ซึ่งเป็นเกณฑ์ดีที่สุดต่อการเติบโตของใบไม้และการคายน้ำ`,
          recommendation: '✅ รักษาเสถียรภาพความร้อนในห้องควบคุมให้อยู่ในช่วงนี้ต่อไป'
        };
      }
      if ((value >= 22 && value <= 24) || (value >= 31 && value <= 32)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เหมาะสม พืชเจริญเติบโตสังเคราะห์แสงได้ปกติ`,
          recommendation: '👍 คอยสังเกตแนวโน้ม ไม่ให้อุณหภูมิผันผวนขึ้นหรือลงเร็วเกินไปในช่วงวัน'
        };
      }
      if ((value >= 20 && value <= 21) || (value >= 33 && value <= 35)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เฝ้าระวัง อุณหภูมิเบี่ยงเบนเล็กน้อย พืชอาจมีอัตราการเติบโตช้าลง`,
          recommendation: value >= 33 
            ? '⚠️ อุณหภูมิค่อนข้างสูง: แนะนำให้เปิดพัดลมระบายอากาศ (Exhaust Fan) หรือเพิ่มการไหลเวียนของลม'
            : '⚠️ อุณหภูมิค่อนข้างต่ำ: ควรลดระดับพัดลมระบายอากาศเพื่อสะสมความร้อนภายในโรงเรือน'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์ไม่เหมาะสม ส่งผลเสียต่อสรีรวิทยาของพืชอย่างรุนแรง`,
        recommendation: value > 35
          ? '🚨 อุณหภูมิสูงเกินไป: แนะนำให้เปิดพัดลมระบายอากาศทันที เปิดระบบพ่นละอองหมอกน้ำ และกางสแลนกรองแสง 50%'
          : '🚨 อุณหภูมิต่ำเกินไป: ควรปิดพัดลมระบายอากาศทั้งหมด หรือเปิดระบบเครื่องทำความร้อน (Heater) เพื่อเพิ่มความอบอุ่น'
      };
    }

    if (type === 'hum') {
      if (value >= 60 && value <= 80) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เหมาะสมมาก ป้องกันอาการใบไหม้และยับยั้งสปอร์เชื้อรา`,
          recommendation: '✅ ความชื้นดีเยี่ยม: เหมาะสมกับการเปิดปากใบดูดซึมปุ๋ยและสารอาหารอย่างราบรื่น'
        };
      }
      if ((value >= 50 && value <= 59) || (value >= 81 && value <= 85)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เหมาะสม พืชแลกเปลี่ยนก๊าซได้ปกติ`,
          recommendation: '👍 ข้อมูลปกติ: คอยดูแนวโน้มความชื้นไม่ให้อิ่มตัวในช่วงกลางคืน'
        };
      }
      if ((value >= 40 && value <= 49) || (value >= 86 && value <= 90)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เฝ้าระวัง อาจเริ่มส่งผลกระทบต่ออัตราคายน้ำพืช`,
          recommendation: value >= 86
            ? '⚠️ ความชื้นสูงเกินเกณฑ์: แนะนำให้เปิดพัดลมหมุนเวียนอากาศภายในเพื่อช่วยลดความแฉะสะสม'
            : '⚠️ ความชื้นต่ำเกินเกณฑ์: แนะนำให้สเปรย์น้ำหรือเปิดระบบพ่นหมอกเป็นรอบสั้นๆ เพิ่มความชื้นในอากาศ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์ไม่เหมาะสม แฉะหรือแห้งแล้งผิดปกติ`,
        recommendation: value > 90
          ? '🚨 ความชื้นสูงวิกฤต: เสี่ยงโรคราใบไม้และเน่าคอดิน แนะนำเปิดพัดลมระบายอากาศ 100% และหยุดให้น้ำชั่วคราว'
          : '🚨 ความชื้นต่ำวิกฤต: พืชคายน้ำเร็วจนเฉา แนะนำให้เปิดระบบเครื่องพ่นหมอกเต็มกำลังเพื่อดึงระดับความชื้นสัมพัทธ์ขึ้นด่วน'
      };
    }

    if (type === 'vpd') {
      if (value >= 0.4 && value <= 0.8) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์เหมาะสมมาก พืชคายน้ำดีที่สุด ดูดปุ๋ยแร่ธาตุได้เต็มกำลัง`,
          recommendation: '✅ ระดับแรงดันไอดีเลิศ: ช่วยรักษาอัตราการไหลเวียนของน้ำและธาตุอาหารภายในต้นพืชอย่างมีประสิทธิภาพ'
        };
      }
      if ((value >= 0.3 && value < 0.4) || (value > 0.8 && value <= 1.2)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์เหมาะสม พืชคายน้ำได้ในระดับปกติ`,
          recommendation: '👍 ตรวจสอบความชื้นและอุณหภูมิสม่ำเสมอเพื่อประคองระดับค่ากระบอกไอ'
        };
      }
      if ((value >= 0.2 && value < 0.3) || (value > 1.2 && value <= 1.6)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์เฝ้าระวัง อัตราคายน้ำเริ่มชะงัก (VPD ต่ำ) หรือคายน้ำไวเกินเฉา (VPD สูง)`,
          recommendation: value > 1.2
            ? '⚠️ VPD ค่อนข้างสูง (อากาศแห้ง): แนะนำสเปรย์ละอองน้ำฝอยเพื่อลดค่า VPD ลงมาให้อยู่ในเกณฑ์เหมาะสม'
            : '⚠️ VPD ค่อนข้างต่ำ (อากาศชื้น): แนะนำเปิดระบบระบายลมไหลผ่านใบพืชเพื่อขับไล่ไอน้ำสะสมรอบๆ ใบ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์ไม่เหมาะสม ส่งผลกระทบอย่างรุนแรงต่อการสังเคราะห์แสงและขนส่งธาตุอาหาร`,
        recommendation: value > 1.6
          ? '🚨 VPD สูงวิกฤต: พืชปิดปากใบเสี่ยงเกิดภาวะขาดสารอาหารฉับพลัน แนะนำให้กางสแลนกรองแสงลงและพ่นหมอกลดความแห้งแล้งทันที'
          : '🚨 VPD ต่ำวิกฤต: ความชื้นอิ่มตัวจนพืชไม่คายน้ำ แนะนำให้หยุดให้น้ำทางดิน เปิดพัดลมเป่าระบายหมุนเวียนลมรอบต้นพืชด่วน'
      };
    }

    // PPFD
    if (type === 'ppfd') {
      if (value >= 400 && value <= 800) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์เหมาะสมมาก เหมาะสมสำหรับการสังเคราะห์แสงและแลกเปลี่ยนคาร์บอนสูงสุด`,
          recommendation: '✅ แสงเหมาะสมมาก: ให้พลังงานแสงที่เพียงพอ พืชเติบโตได้อย่างรวดเร็วและแข็งแรง'
        };
      }
      if ((value >= 300 && value < 400) || (value > 800 && value <= 950)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์เหมาะสม พืชเจริญเติบโตได้ตามเป้าหมายดี`,
          recommendation: '👍 แสงข้อมูลปกติ: คอยดูค่าความเข้มแสงในช่วงบ่ายเพื่อหลีกเลี่ยงภาวะแสงจ้าเกินจำเป็น'
        };
      }
      if ((value >= 200 && value < 300) || (value > 950 && value <= 1100)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์เฝ้าระวัง แสงอาจน้อยเกินพืชยืดต้น หรือมากเกินพืชเครียดสะสมความร้อน`,
          recommendation: value > 950
            ? '⚠️ แสงจ้าเกินไป: แนะนำให้เปิดใช้งานระบบตาข่ายแรเงา (Shading Net) เพื่อป้องความเครียดสะสมบนใบ'
            : '⚠️ แสงค่อนข้างสลัว: แนะนำเปิดไฟส่องสว่างช่วยปลูก (Grow Lights) เสริมความเข้มแสงให้เพียงพอ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์ไม่เหมาะสม มืดเกินไปหรือร้อนแผดเผาจนใบพืชถูกทำลาย`,
        recommendation: value > 1100
          ? '🚨 แสงแดดจัดแผดเผาเกรียม: แนะนำกางสแลนกรองแสงอย่างน้อย 50% หรือสเปรย์หมอกน้ำกำบังความร้อนเฉียบพลันด่วน'
          : '🚨 แสงมืดสลัวรุนแรง: อัตราแลกธาตุพืชหยุดชะงัก แนะนำเปิดหลอดไฟช่วยปลูก (Grow Lights) เสริมประสิทธิภาพแสงสูงสุดทันที'
      };
    }

    return {
      state: 'warning',
      status: 'รอข้อมูล',
      color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      desc: 'กำลังวิเคราะห์พารามิเตอร์...',
      recommendation: 'รอข้อมูลประมวลผลเพิ่ม'
    };
  }

  getOverallEvaluation(latestData: SensorData | null): OverallEvaluation {
    if (!latestData) {
      return {
        text: 'รอข้อมูล...',
        color: 'bg-slate-50 text-slate-400',
        desc: 'ระบบกำลังประมวลผลข้อมูล...',
        icon: 'fa-solid fa-spinner'
      };
    }

    const tempEval = this.getDiagnosticStatus(latestData.temperature, 'temp');
    const humEval = this.getDiagnosticStatus(latestData.humidity, 'hum');
    const vpdEval = this.getDiagnosticStatus(latestData.vpd, 'vpd');
    const ppfdEval = this.getDiagnosticStatus(latestData.ppfd, 'ppfd');

    const scoreMap = { excellent: 100, good: 75, warning: 40, critical: 10 };
    const avgScore = (
      scoreMap[tempEval.state] +
      scoreMap[humEval.state] +
      scoreMap[vpdEval.state] +
      scoreMap[ppfdEval.state]
    ) / 4;

    if (avgScore >= 85) {
      return {
        text: 'เหมาะสมมาก',
        color: 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg border border-emerald-400/20',
        desc: '🎉 สภาพแวดล้อมโดยรวมดีเยี่ยมในทุกมิติ ดัชนีความร้อน ความชื้น แรงดันไอ และแสงสว่างประสานงานกันได้ดีเยี่ยม พืชสามารถเจริญเติบโตได้อย่างสมบูรณ์แบบสูงสุด',
        icon: 'emerald'
      };
    }
    if (avgScore >= 60) {
      return {
        text: 'เหมาะสม',
        color: 'bg-blue-500 text-white shadow-blue-500/20 shadow-lg border border-blue-400/20',
        desc: '🟢 สภาพแวดล้อมโดยรวมอยู่ในสภาวะปกติ พืชเจริญเติบโตได้ตามเกณฑ์มาตรฐานความปลอดภัยทางสรีรวิทยา คอยสังเกตความชื้นเป็นระยะ',
        icon: 'blue'
      };
    }
    if (avgScore >= 35) {
      return {
        text: 'เฝ้าระวัง',
        color: 'bg-amber-500 text-slate-900 shadow-amber-500/20 shadow-lg border border-amber-400/20',
        desc: '⚠️ เริ่มมีพารามิเตอร์บางตัวเบี่ยงเบนออกนอกเกณฑ์มาตรฐานพืชทั่วไป แนะนำให้ตรวจสอบระบบพัดลมหรือความชื้นตามข้อแนะนำเพิ่มเติม',
        icon: 'amber'
      };
    }
    return {
      text: 'ไม่เหมาะสม',
      color: 'bg-rose-500 text-white shadow-rose-500/20 shadow-lg border border-rose-400/20 animate-pulse',
      desc: '🚨 สภาพแวดล้อมวิกฤตหลายจุด! ค่าพารามิเตอร์ขัดแย้งกับเกณฑ์พฤกษศาสตร์ทั่วไป ควรรีบเปิดใช้อุปกรณ์ระบายลมหรือความชื้นเพื่อความปลอดภัยของใบพืชด่วนที่สุด',
      icon: 'rose'
    };
  }

  async getLatestData(zone: number): Promise<SensorData | null> {
    return this.sensorRepo.findLatest(zone);
  }

  async getLogs(zone: number, limit: number): Promise<SensorData[]> {
    return this.sensorRepo.findLogs(zone, limit);
  }

  async getLogsByDateRange(zone: number, start: Date, end: Date): Promise<SensorData[]> {
    return this.sensorRepo.findLogsByDateRange(zone, start, end);
  }

  async addLog(data: Omit<SensorData, 'id' | 'created_at'>): Promise<SensorData> {
    return this.sensorRepo.insert(data);
  }

  async addManyLogs(data: Omit<SensorData, 'id' | 'created_at'>[]): Promise<void> {
    return this.sensorRepo.insertMany(data);
  }
}
