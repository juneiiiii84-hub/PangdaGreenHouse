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
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่ในช่วงที่เหมาะสมอย่างยิ่งสำหรับการเจริญเติบโตของพืช`,
          recommendation: '✅ อุณหภูมิอยู่ในระดับที่เหมาะสมอย่างต่อเนื่อง ควรควบคุมสภาพแวดล้อมเพื่อรักษาเสถียรภาพนี้ไว้'
        };
      }
      if ((roundedValue >= 22 && roundedValue <= 24.9) || (roundedValue >= 28.1 && roundedValue <= 31)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่ในเกณฑ์ปกติ พืชสามารถเจริญเติบโตได้ตามปกติ`,
          recommendation: '👍 ควรติดตามการแกว่งตัวของอุณหภูมิเพื่อป้องกันความผันผวนที่รวดเร็วเกินไปในระหว่างวัน'
        };
      }
      if ((roundedValue >= 20 && roundedValue <= 21.9) || (roundedValue >= 31.1 && roundedValue <= 34)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C เริ่มคลาดเคลื่อนจากระดับที่เหมาะสม ซึ่งอาจชะลอการเจริญเติบโตของพืช`,
          recommendation: roundedValue > 31
            ? '⚠️ อุณหภูมิค่อนข้างสูง: แนะนำให้เปิดพัดลมระบายอากาศเพื่อระบายความร้อนสะสม'
            : '⚠️ อุณหภูมิค่อนข้างต่ำ: แนะนำให้ปรับลดความเร็วของพัดลมระบายอากาศลงเพื่อรักษาความอบอุ่น'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `อุณหภูมิ ${roundedValue.toFixed(1)}°C อยู่นอกเกณฑ์ที่เหมาะสม เสี่ยงต่อการทำให้พืชเหี่ยวเฉาหรือหยุดเจริญเติบโต`,
        recommendation: roundedValue > 34
          ? '🚨 อุณหภูมิสูงเกินเกณฑ์: แนะนำให้เปิดพัดลมระบายอากาศและระบบพ่นหมอกทันที พร้อมกางตาข่ายพรางแสงเพื่อลดความร้อน'
          : '🚨 อุณหภูมิต่ำเกินเกณฑ์: แนะนำให้ปิดพัดลมระบายอากาศ หรือเปิดอุปกรณ์ทำความร้อน (Heater) เพื่อเพิ่มอุณหภูมิ'
      };
    }

    if (type === 'hum') {
      if (roundedValue >= 65 && roundedValue <= 75) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความชื้นสัมพัทธ์ ${roundedValue.toFixed(1)}%RH อยู่ในช่วงที่เหมาะสมอย่างยิ่ง ช่วยลดความเสี่ยงต่อการเกิดโรคพืช`,
          recommendation: '✅ ระดับความชื้นเหมาะสมมาก เอื้อต่อการเปิดปากใบเพื่อดูดซึมน้ำและธาตุอาหารได้อย่างเต็มประสิทธิภาพ'
        };
      }
      if ((roundedValue >= 55 && roundedValue <= 64.9) || (roundedValue >= 75.1 && roundedValue <= 85)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความชื้นสัมพัทธ์ ${roundedValue.toFixed(1)}%RH อยู่ในเกณฑ์ปกติ พืชสามารถเจริญเติบโตได้ตามปกติ`,
          recommendation: '👍 ควรเฝ้าระวังและควบคุมไม่ให้ความชื้นสัมพัทธ์สะสมสูงเกินไปในช่วงเวลากลางคืน'
        };
      }
      if ((roundedValue >= 40 && roundedValue <= 54.9) || (roundedValue >= 85.1 && roundedValue <= 90)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความชื้นสัมพัทธ์ ${roundedValue.toFixed(1)}%RH เริ่มมีความคลาดเคลื่อน ซึ่งอาจส่งผลกระทบต่ออัตราการคายน้ำของพืช`,
          recommendation: roundedValue > 85
            ? '⚠️ ความชื้นสัมพัทธ์เริ่มสูงขึ้น: แนะนำให้เปิดพัดลมหมุนเวียนอากาศเพื่อช่วยระบายความชื้นสะสม'
            : '⚠️ ความชื้นสัมพัทธ์เริ่มต่ำลง (อากาศแห้ง): แนะนำให้เปิดระบบพ่นหมอกเป็นรอบสั้นๆ เพื่อเพิ่มความชื้น'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความชื้นสัมพัทธ์ ${roundedValue.toFixed(1)}%RH อยู่นอกช่วงที่เหมาะสมอย่างรุนแรง (อากาศแห้งหรือชื้นเกินไป)`,
        recommendation: roundedValue > 90
          ? '🚨 ความชื้นสูงเกินเกณฑ์วิกฤต (เสี่ยงต่อโรครา): แนะนำให้เปิดพัดลมระบายอากาศเต็มกำลังและงดการให้น้ำชั่วคราว'
          : '🚨 ความชื้นต่ำเกินเกณฑ์วิกฤต (พืชเสี่ยงขาดน้ำ): แนะนำให้เปิดระบบพ่นหมอกเต็มกำลังเพื่อเพิ่มระดับความชื้นสัมพัทธ์โดยเร็ว'
      };
    }

    if (type === 'vpd') {
      if (roundedValue >= 0.4 && roundedValue <= 0.8) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa อยู่ในเกณฑ์ที่เหมาะสมอย่างยิ่ง ช่วยเสริมประสิทธิภาพการดูดซึมสารอาหาร`,
          recommendation: '✅ ระดับความต่างของความดันไอน้ำดีเยี่ยม ส่งเสริมระบบรากและปากใบให้ทำงานร่วมกันอย่างสมดุล'
        };
      }
      if ((roundedValue >= 0.3 && roundedValue <= 0.39) || (roundedValue >= 0.81 && roundedValue <= 1.2)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa อยู่ในเกณฑ์ปกติ พืชสามารถลำเลียงน้ำและธาตุอาหารได้ดีตามธรรมชาติ`,
          recommendation: '👍 ควรตรวจเช็คอุณหภูมิและความชื้นสัมพัทธ์อย่างสม่ำเสมอเพื่อรักษาระดับค่า VPD ให้อยู่ในเกณฑ์นี้'
        };
      }
      if ((roundedValue >= 0.2 && roundedValue <= 0.29) || (roundedValue >= 1.21 && roundedValue <= 1.6)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa เริ่มมีความคลาดเคลื่อน พืชอาจคายน้ำผิดปกติและเจริญเติบโตช้าลง`,
          recommendation: roundedValue > 1.2
            ? '⚠️ ค่า VPD เริ่มสูงขึ้น (อากาศแห้ง): แนะนำให้เปิดระบบพ่นหมอกเพื่อเพิ่มความชื้นสัมพัทธ์และปรับค่า VPD'
            : '⚠️ ค่า VPD เริ่มต่ำลง (อากาศชื้น): แนะนำให้เปิดพัดลมระบายอากาศเพื่อช่วยเพิ่มการไหลเวียนของลม'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ค่า VPD ${roundedValue.toFixed(2)} kPa อยู่ในระดับที่ไม่เหมาะสม พืชอาจปิดปากใบเพื่อป้องกันการขาดน้ำและหยุดดูดซึมธาตุอาหาร`,
        recommendation: roundedValue > 1.6
          ? '🚨 ค่า VPD สูงเกินเกณฑ์วิกฤต (แห้งจัด): แนะนำให้กางตาข่ายพรางแสงและเปิดระบบพ่นหมอกเพื่อลดอุณหภูมิใบพืชทันที'
          : '🚨 ค่า VPD ต่ำเกินเกณฑ์วิกฤต (ชื้นจัด): พืชคายน้ำลดลง แนะนำให้งดการให้น้ำชั่วคราวและเปิดพัดลมระบายอากาศเพื่อไล่ความชื้น'
      };
    }

    // PPFD
    if (type === 'ppfd') {
      if (roundedValue >= 400 && roundedValue <= 800) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์ที่เหมาะสมอย่างยิ่ง ช่วยให้กระบวนการสังเคราะห์แสงสมบูรณ์ที่สุด`,
          recommendation: '✅ ปริมาณความเข้มแสงดีเยี่ยม ช่วยให้พืชสร้างอาหารและเจริญเติบโตได้อย่างรวดเร็วและแข็งแรง'
        };
      }
      if ((roundedValue >= 300 && roundedValue <= 399.9) || (roundedValue >= 800.1 && roundedValue <= 950)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์ปกติ พืชสามารถเจริญเติบโตได้ตามปกติ`,
          recommendation: '👍 ควรคอยสังเกตและควบคุมความเข้มแสงในช่วงบ่ายไม่ให้สูงเกินระดับความต้องการของพืช'
        };
      }
      if ((roundedValue >= 200 && roundedValue <= 299.9) || (roundedValue >= 950.1 && roundedValue <= 1100)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s เริ่มมีความคลาดเคลื่อน แสงอาจมีปริมาณน้อยไปหรือแรงเกินไปเล็กน้อย`,
          recommendation: roundedValue > 950
            ? '⚠️ ความเข้มแสงเริ่มสูงขึ้น: แนะนำให้เตรียมกางตาข่ายพรางแสงเพื่อลดระดับความร้อนสะสมบริเวณใบพืช'
            : '⚠️ ความเข้มแสงเริ่มต่ำลง: แนะนำให้เปิดระบบไฟช่วยปลูก (Grow Lights) เพื่อเสริมปริมาณแสงให้เพียงพอ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความเข้มแสง PPFD ${roundedValue.toFixed(1)} μmol/m²/s อยู่ในเกณฑ์ไม่เหมาะสม แสงสลัวเกินไปหรือสว่างจ้าจนเสี่ยงใบไหม้`,
        recommendation: roundedValue > 1100
          ? '🚨 ความเข้มแสงสูงเกินเกณฑ์วิกฤต (เสี่ยงใบไหม้): แนะนำให้กางตาข่ายพรางแสงและเปิดระบบพ่นหมอกเพื่อระบายความร้อนทันที'
          : '🚨 ความเข้มแสงต่ำเกินเกณฑ์วิกฤต (พืชชะงักการเติบโต): แนะนำให้เปิดระบบไฟช่วยปลูก (Grow Lights) เพื่อเสริมประสิทธิภาพแสงทันที'
      };
    }

    // LUX
    if (type === 'lux') {
      if (roundedValue >= 13377 && roundedValue <= 26757) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux อยู่ในเกณฑ์ที่เหมาะสมอย่างยิ่งสำหรับการสังเคราะห์แสงของพืช`,
          recommendation: '✅ ระดับความสว่างของแสงแดดเหมาะสมดีเยี่ยม เอื้อต่อการเจริญเติบโตของพืชได้อย่างมีประสิทธิภาพ'
        };
      }
      if ((roundedValue >= 10032 && roundedValue <= 13376) || (roundedValue >= 26758 && roundedValue <= 31774)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux อยู่ในเกณฑ์ปกติ พืชสามารถเจริญเติบโตได้ดีตามปกติ`,
          recommendation: '👍 ระดับความสว่างปกติ ควรตรวจสอบแนวโน้มและการเปลี่ยนแปลงของปริมาณแสงในระหว่างวัน'
        };
      }
      if ((roundedValue >= 6688 && roundedValue <= 10031) || (roundedValue >= 31775 && roundedValue <= 36790)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux เริ่มคลาดเคลื่อน แสงเริ่มสลัวหรือเริ่มร้อนแรงขึ้น`,
          recommendation: roundedValue > 31774
            ? '⚠️ ความสว่างเริ่มสูงขึ้น: แนะนำให้เตรียมกางตาข่ายพรางแสงเพื่อชะลอการสะสมของความร้อน'
            : '⚠️ ความสว่างเริ่มต่ำลง: ปริมาณแสงเริ่มสลัว พืชอาจสังเคราะห์แสงได้ลดลงชั่วขณะ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความสว่าง ${roundedValue.toLocaleString()} Lux อยู่ในระดับที่ไม่เหมาะสม เนื่องจากปริมาณแสงมืดสลัวหรือสว่างจ้าเกินไป`,
        recommendation: roundedValue > 36790
          ? '🚨 ความสว่างสูงเกินเกณฑ์วิกฤต: แนะนำให้กางตาข่ายพรางแสงและเปิดระบบพ่นหมอกเพื่อระบายความร้อนโดยเร็ว'
          : '🚨 ความสว่างต่ำเกินเกณฑ์วิกฤต: แนะนำให้เปิดระบบไฟช่วยปลูก (Grow Lights) เพื่อเพิ่มระดับแสงสว่างทันที'
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
        desc: '🎉 สภาพแวดล้อมโดยรวมอยู่ในเกณฑ์ดีเยี่ยมทุกด้าน ทั้งอุณหภูมิ ความชื้นสัมพัทธ์ ปริมาณแสง และค่าแรงดันไอน้ำมีความสมดุล ช่วยส่งเสริมการเติบโตของพืชได้ดีที่สุด',
        icon: 'emerald'
      };
    }
    if (avgScore >= 60) {
      return {
        text: 'เหมาะสม',
        color: 'bg-blue-500 text-white shadow-blue-500/20 shadow-lg border border-blue-400/20',
        desc: '🟢 สภาพแวดล้อมโดยรวมอยู่ในเกณฑ์ปกติ พืชเจริญเติบโตได้ดีตามเกณฑ์สรีรวิทยา ควรเฝ้าระวังระดับความชื้นสัมพัทธ์เป็นระยะ',
        icon: 'blue'
      };
    }
    if (avgScore >= 35) {
      return {
        text: 'เฝ้าระวัง',
        color: 'bg-amber-500 text-slate-900 shadow-amber-500/20 shadow-lg border border-amber-400/20',
        desc: '⚠️ สภาพแวดล้อมบางปัจจัยเริ่มคลาดเคลื่อนจากระดับที่เหมาะสม แนะนำให้ตรวจสอบระบบระบายอากาศหรือระบบควบคุมความชื้นตามคำแนะนำเพิ่มเติม',
        icon: 'amber'
      };
    }
    return {
      text: 'ไม่เหมาะสม',
      color: 'bg-rose-500 text-white shadow-rose-500/20 shadow-lg border border-rose-400/20 animate-pulse',
      desc: '🚨 สภาพแวดล้อมโดยรวมอยู่ในเกณฑ์วิกฤตในหลายด้าน แนะนำให้เปิดระบบระบายอากาศหรืออุปกรณ์ปรับระดับความชื้นโดยเร็วเพื่อป้องกันความเสียหายต่อพืช',
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
