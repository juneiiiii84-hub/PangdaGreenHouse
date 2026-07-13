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
  constructor(private sensorRepo: ISensorRepository) { }

  calculateVPD(temp: number, rh: number): number {
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const vpd = svp * (1 - rh / 100);
    return parseFloat(vpd.toFixed(2));
  }

  getDiagnosticStatus(value: number, type: 'temp' | 'hum' | 'vpd' | 'ppfd' | 'lux'): DiagnosticResult {
    let roundedValue = value;
    if (type === 'temp' || type === 'hum' || type === 'ppfd') {
      roundedValue = Math.round(value * 10) / 10;
    } else if (type === 'vpd') {
      roundedValue = Math.round(value * 100) / 100;
    } else if (type === 'lux') {
      roundedValue = Math.round(value);
    }

    if (type === 'temp') {
      if (roundedValue >= 25 && roundedValue <= 28) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่ในเกณฑ์ดีมากต่อการเจริญเติบโตของพืช`,
          recommendation: '✅ อุณหภูมิคงที่ดีแล้ว รักษาให้อยู่ในช่วงนี้ต่อไป'
        };
      }
      if ((roundedValue >= 22 && roundedValue <= 24.9) || (roundedValue >= 28.1 && roundedValue <= 31)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่ในเกณฑ์ดี พืชโตได้ปกติ`,
          recommendation: '👍 คอยดูแลไม่ให้อุณหภูมิขึ้นลงเร็วเกินไปในช่วงวัน'
        };
      }
      if ((roundedValue >= 20 && roundedValue <= 21.9) || (roundedValue >= 31.1 && roundedValue <= 34)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่ในเกณฑ์เฝ้าระวัง พืชอาจโตช้าลง`,
          recommendation: roundedValue > 31
            ? '⚠️ อุณหภูมิเริ่มสูง: แนะนำเปิดพัดลมระบายอากาศเพื่อระบายความร้อน'
            : '⚠️ อุณหภูมิเริ่มต่ำ: แนะนำลดระดับพัดลมระบายอากาศลง'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C ไม่เหมาะสม อาจทำให้พืชเหี่ยวเฉาหรือหยุดโตได้`,
        recommendation: roundedValue > 34
          ? '🚨 อุณหภูมิสูงเกินไป: แนะนำให้เปิดพัดลมระบายอากาศทันที เปิดระบบพ่นละอองหมอก และกางสแลนกรองแสง 50%'
          : '🚨 อุณหภูมิต่ำเกินไป: ควรปิดพัดลมระบายอากาศทั้งหมด หรือเปิดระบบทำความร้อนเพื่อเพิ่มความอบอุ่น'
      };
    }

    if (type === 'hum') {
      if (roundedValue >= 65 && roundedValue <= 75) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความชื้น ${roundedValue.toFixed(1)}%RH เหมาะสมมาก ช่วยป้องกันโรคพืชและเชื้อรา`,
          recommendation: '✅ ความชื้นดีเยี่ยม ช่วยให้พืชดูดซึมปุ๋ยและน้ำได้ดีที่สุด'
        };
      }
      if ((roundedValue >= 55 && roundedValue <= 64.9) || (roundedValue >= 75.1 && roundedValue <= 85)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความชื้น ${roundedValue.toFixed(1)}%RH เหมาะสมดี พืชเติบโตได้ปกติ`,
          recommendation: '👍 ดูแลไม่ให้ชื้นเกินไปในช่วงเวลากลางคืน'
        };
      }
      if ((roundedValue >= 40 && roundedValue <= 54.9) || (roundedValue >= 85.1 && roundedValue <= 90)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความชื้น ${roundedValue.toFixed(1)}%RH อยู่ในเกณฑ์เฝ้าระวัง พืชอาจจะเฉาหรือแฉะเกินไป`,
          recommendation: roundedValue > 85
            ? '⚠️ ความชื้นเริ่มสูง: แนะนำให้เปิดพัดลมหมุนเวียนอากาศเพื่อช่วยระบายความชื้นสะสม'
            : '⚠️ ความชื้นเริ่มต่ำ: แนะนำให้พ่นน้ำหรือเปิดระบบพ่นหมอกสั้นๆ เพื่อเพิ่มความชื้น'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความชื้น ${roundedValue.toFixed(1)}%RH ไม่เหมาะสม แห้งแล้งหรือแฉะเกินไปอย่างรุนแรง`,
        recommendation: roundedValue > 90
          ? '🚨 ชื้นเกินเกณฑ์วิกฤต: แนะนำเปิดพัดลมระบายอากาศ 100% และหยุดรดน้ำชั่วคราวเพื่อป้องกันโรครา'
          : '🚨 แห้งเกินเกณฑ์วิกฤต: พืชอาจเฉาแห้ง แนะนำให้เปิดเครื่องพ่นหมอกเต็มกำลังเพื่อดึงระดับความชื้นขึ้นด่วน'
      };
    }

    if (type === 'vpd') {
      if (roundedValue >= 0.4 && roundedValue <= 0.8) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa เหมาะสมมาก พืชดูดปุ๋ยและโตได้ดีที่สุด`,
          recommendation: '✅ ค่า VPD ดีมาก ช่วยให้ระบบรากและใบทำงานได้อย่างมีประสิทธิภาพ'
        };
      }
      if ((roundedValue >= 0.3 && roundedValue <= 0.39) || (roundedValue >= 0.81 && roundedValue <= 1.2)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa เหมาะสมดี พืชทำงานได้ตามปกติ`,
          recommendation: '👍 คอยตรวจเช็คอุณหภูมิและความชื้นให้อยู่ในเกณฑ์เหมาะสมต่อเนื่อง'
        };
      }
      if ((roundedValue >= 0.2 && roundedValue <= 0.29) || (roundedValue >= 1.21 && roundedValue <= 1.6)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa อยู่ในเกณฑ์เฝ้าระวัง พืชอาจจะโตช้าหรือเหี่ยวเฉาได้`,
          recommendation: roundedValue > 1.2
            ? '⚠️ อากาศแห้งเกินไป (VPD สูง): แนะนำพ่นละอองหมอกเพื่อเพิ่มความชื้นในอากาศ'
            : '⚠️ อากาศชื้นเกินไป (VPD ต่ำ): แนะนำเปิดพัดลมระบายอากาศช่วยให้อากาศหมุนเวียน'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa ไม่เหมาะสม อาจทำให้พืชหยุดโตหรือขาดน้ำรุนแรง`,
        recommendation: roundedValue > 1.6
          ? '🚨 อากาศแห้งจัดจนต้นพืชขาดสารอาหาร: แนะนำให้กางสแลนกรองแสงลงและเปิดพ่นหมอกช่วยด่วน'
          : '🚨 อากาศชื้นจัดจนพืชหยุดคายน้ำ: แนะนำหยุดรดน้ำและเปิดพัดลมระบายอากาศด่วน'
      };
    }

    // PPFD
    if (type === 'ppfd') {
      if (roundedValue >= 400 && roundedValue <= 800) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s เหมาะสมมาก พืชสังเคราะห์แสงได้ดีที่สุด`,
          recommendation: '✅ แสงดีมาก ช่วยให้พืชเจริญเติบโตได้อย่างรวดเร็วและแข็งแรง'
        };
      }
      if ((roundedValue >= 300 && roundedValue <= 399.9) || (roundedValue >= 800.1 && roundedValue <= 950)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s เหมาะสมดี พืชเติบโตได้ตามปกติ`,
          recommendation: '👍 คอยดูระดับแสงในช่วงบ่ายไม่ให้จ้าเกินไป'
        };
      }
      if ((roundedValue >= 200 && roundedValue <= 299.9) || (roundedValue >= 950.1 && roundedValue <= 1100)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์เฝ้าระวัง แสงอาจน้อยหรือมากเกินไป`,
          recommendation: roundedValue > 950
            ? '⚠️ แสงเริ่มแรงเกินไป: แนะนำให้เปิดใช้งานระบบตาข่ายแรเงา (Shading Net) เพื่อลดความร้อน'
            : '⚠️ แสงค่อนข้างสลัว: แนะนำเปิดไฟช่วยปลูก (Grow Lights) เพื่อเพิ่มแสง'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s ไม่เหมาะสม แสงมืดเกินไปหรือแรงจนใบอาจไหม้`,
        recommendation: roundedValue > 1100
          ? '🚨 แดดแรงจัดจนเสี่ยงใบไหม้: แนะนำให้กางสแลนกรองแสง 50% และพ่นหมอกช่วยลดความร้อนด่วน'
          : '🚨 แสงมืดเกินไปจนพืชหยุดโต: แนะนำเปิดไฟช่วยปลูก (Grow Lights) เสริมแสงให้พืชด่วน'
      };
    }

    // LUX
    if (type === 'lux') {
      if (roundedValue >= 13377 && roundedValue <= 26757) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux เหมาะสมมากสำหรับพืช`,
          recommendation: '✅ แสงแดดอยู่ในช่วงที่ดีที่สุดต่อการเติบโตของพืช'
        };
      }
      if ((roundedValue >= 10032 && roundedValue <= 13376) || (roundedValue >= 26758 && roundedValue <= 31774)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux เหมาะสม พืชสังเคราะห์แสงได้ปกติ`,
          recommendation: '👍 แสงแดดปกติ คอยสังเกตแนวโน้มความสว่างในช่วงวัน'
        };
      }
      if ((roundedValue >= 6688 && roundedValue <= 10031) || (roundedValue >= 31775 && roundedValue <= 36790)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux อยู่ในเกณฑ์เฝ้าระวัง แสงแดดอาจน้อยไปหรือแรงไป`,
          recommendation: roundedValue > 31774
            ? '⚠️ แสงเริ่มแรงเกินไป: แนะนำให้เตรียมกางสแลนกรองแสงเพื่อชะลอความร้อนสะสม'
            : '⚠️ แสงค่อนข้างสลัว: พืชสังเคราะห์แสงได้ช้าลงเล็กน้อย'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux ไม่เหมาะสม มืดเกินไปหรือสว่างจ้าเกินไป`,
        recommendation: roundedValue > 36790
          ? '🚨 แดดจัดเกินไปจนเสี่ยงใบไหม้: แนะนำกางสแลนกรองแสงและพ่นหมอกระบายความร้อนด่วน'
          : '🚨 แสงสลัวเกินไปจนพืชไม่เติบโต: แนะนำเปิดไฟช่วยปลูก (Grow Lights) เสริมแสงด่วน'
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
