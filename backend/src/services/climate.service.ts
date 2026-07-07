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
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เหมาะสมมาก ดีที่สุดต่อการเติบโตและการคายน้ำของใบพืช`,
          recommendation: '✅ อุณหภูมิกำลังพอดี เหมาะกับการเติบโตของพืช คุมระดับนี้ต่อไปได้เลยครับ'
        };
      }
      if ((value >= 22 && value <= 24) || (value >= 31 && value <= 32)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เหมาะสม พืชเจริญเติบโตและสังเคราะห์แสงได้ปกติไม่มีปัญหา`,
          recommendation: '👍 อุณหภูมิปกติทั่วไป คอยระวังไม่ให้อุณหภูมิร้อนหรือเย็นลงเร็วเกินไปนะครับ'
        };
      }
      if ((value >= 20 && value <= 21) || (value >= 33 && value <= 35)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์เฝ้าระวัง อุณหภูมิเบี่ยงเบนเล็กน้อย พืชอาจโตช้าลงบ้าง`,
          recommendation: value >= 33 
            ? '⚠️ อุณหภูมิเริ่มร้อนไปนิด: ลองเปิดพัดลมระบายอากาศหรือเพิ่มลมหมุนเวียนดูครับ'
            : '⚠️ อุณหภูมิเริ่มเย็นไปนิด: ลองลดระดับพัดลมลงเพื่อช่วยสะสมความอบอุ่นในโรงเรือนครับ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `อุณหภูมิ ${value.toFixed(1)}°C อยู่ในเกณฑ์ไม่เหมาะสม ร้อนจัดหรือเย็นจัดเกินไปจนพืชมีปัญหา`,
        recommendation: value > 35
          ? '🚨 ร้อนเกินไปขั้นวิกฤต!: รีบเปิดพัดลมระบายอากาศ พ่นหมอกน้ำ และกางสแลนกรองแสงด่วนครับ'
          : '🚨 เย็นเกินไปขั้นวิกฤต!: ควรปิดพัดลมระบายอากาศ หรือเปิดเครื่องทำความร้อนด่วนครับ'
      };
    }

    if (type === 'hum') {
      if (value >= 60 && value <= 80) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เหมาะสมมาก ช่วยลดความชื้นอับและป้องกันโรคพืช`,
          recommendation: '✅ ความชื้นดีเยี่ยม: พืชจะเปิดปากใบเพื่อดูดซึมน้ำและปุ๋ยได้ดีที่สุด รักษาค่านี้ไว้นะครับ'
        };
      }
      if ((value >= 50 && value <= 59) || (value >= 81 && value <= 85)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เหมาะสม พืชคายน้ำและเติบโตได้ปกติ`,
          recommendation: '👍 ความชื้นอยู่ในเกณฑ์ปกติ คอยระวังอย่าให้ความชื้นสะสมสูงเกินไปในช่วงกลางคืนนะครับ'
        };
      }
      if ((value >= 40 && value <= 49) || (value >= 86 && value <= 90)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์เฝ้าระวัง อาจชื้นหรือแห้งเกินไปเล็กน้อย`,
          recommendation: value >= 86
            ? '⚠️ ชื้นเกินไปนิดนึง: แนะนำเปิดพัดลมหมุนเวียนเพื่อระบายความอับชื้นสะสมครับ'
            : '⚠️ อากาศเริ่มแห้งเกินไป: แนะนำให้เปิดพ่นหมอกเป็นระยะเพื่อเพิ่มความชื้นครับ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความชื้นสัมพัทธ์ ${value.toFixed(1)}%RH อยู่ในเกณฑ์ไม่เหมาะสม แฉะหรือแห้งแล้งจนเสี่ยงเสียหาย`,
        recommendation: value > 90
          ? '🚨 ชื้นเกินไปขั้นวิกฤต!: เสี่ยงเกิดโรครา ควรเปิดพัดลมระบายอากาศ 100% และงดให้น้ำชั่วคราวนะครับ'
          : '🚨 แห้งเกินไปขั้นวิกฤต!: พืชเสี่ยงเหี่ยวเฉา รีบเปิดระบบพ่นหมอกเต็มกำลังด่วนครับ'
      };
    }

    if (type === 'vpd') {
      if (value >= 0.4 && value <= 0.8) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa ดีเยี่ยม พืชคายน้ำได้ดีที่สุดและดูดซึมปุ๋ยได้อย่างเต็มที่`,
          recommendation: '✅ ค่า VPD ดีเยี่ยม!: พืชสามารถลำเลียงน้ำและแร่ธาตุอาหารขึ้นมาใช้งานได้ดีที่สุดครับ'
        };
      }
      if ((value >= 0.3 && value < 0.4) || (value > 0.8 && value <= 1.2)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์เหมาะสม พืชคายน้ำและอาหารได้สม่ำเสมอ`,
          recommendation: '👍 ค่า VPD ปกติ คอยเช็กอุณหภูมิและความชื้นให้คงที่สม่ำเสมอนะครับ'
        };
      }
      if ((value >= 0.2 && value < 0.3) || (value > 1.2 && value <= 1.6)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa อยู่ในเกณฑ์เฝ้าระวัง อากาศเริ่มชื้นจัดหรือแห้งเกินไป`,
          recommendation: value > 1.2
            ? '⚠️ อากาศแห้งเกินไป (VPD สูง): แนะนำให้พ่นหมอกละอองน้ำฝอยเพื่อลดค่า VPD ลงมาครับ'
            : '⚠️ อากาศชื้นอับเกินไป (VPD ต่ำ): แนะนำให้เปิดพัดลมเพื่อระบายไอน้ำสะสมรอบๆ ใบพืชครับ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `แรงดันไอ VPD ${value.toFixed(2)} kPa ไม่เหมาะสม ส่งผลกระทบต่อการหายใจและการดูดสารอาหารของพืช`,
        recommendation: value > 1.6
          ? '🚨 VPD สูงจัดขั้นวิกฤต (อากาศแห้งแล้งมาก): พืชจะปิดปากใบ ควรรีบกางสแลนกรองแสงและพ่นหมอกเพิ่มความชื้นด่วนครับ'
          : '🚨 VPD ต่ำจัดขั้นวิกฤต (ชื้นเกินจนพืชไม่คายน้ำ): แนะนำให้งดให้น้ำทางดิน และรีบเปิดพัดลมระบายอากาศด่วนครับ'
      };
    }

    // PPFD
    if (type === 'ppfd') {
      if (value >= 400 && value <= 800) {
        return {
          state: 'excellent',
          status: 'เหมาะสมมาก',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในระดับดีมาก เหมาะต่อการสังเคราะห์แสงเป็นอย่างยิ่ง`,
          recommendation: '✅ แสงกำลังพอดีเยี่ยม: พืชได้รับพลังงานเต็มที่ สังเคราะห์แสงและเติบโตได้ดีมากครับ'
        };
      }
      if ((value >= 300 && value < 400) || (value > 800 && value <= 950)) {
        return {
          state: 'good',
          status: 'เหมาะสม',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s อยู่ในระดับปกติ พืชเจริญเติบโตได้ดีตามแผน`,
          recommendation: '👍 แสงอยู่ในเกณฑ์ปกติ คอยระวังแสงแดดแรงจัดในช่วงบ่ายนะครับ'
        };
      }
      if ((value >= 200 && value < 300) || (value > 950 && value <= 1100)) {
        return {
          state: 'warning',
          status: 'เฝ้าระวัง',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s ต้องเฝ้าระวัง แสงแดดอาจจ้าไปหรือน้อยไปเล็กน้อย`,
          recommendation: value > 950
            ? '⚠️ แสงแดดแรงเกินไป: แนะนำให้กางสแลนกรองแสงเพื่อช่วยลดความร้อนสะสมบนใบครับ'
            : '⚠️ แสงค่อนข้างน้อย: แนะนำให้เปิดไฟช่วยปลูก (Grow Lights) เพื่อเพิ่มความเข้มแสงให้เพียงพอครับ'
        };
      }
      return {
        state: 'critical',
        status: 'ไม่เหมาะสม',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        desc: `ความเข้มแสง PPFD ${value.toFixed(1)} μmol/m²/s ไม่เหมาะสม มืดเกินไปหรือแดดแรงจนใบพืชเครียดไหม้`,
        recommendation: value > 1100
          ? '🚨 แดดแรงเกินไปขั้นวิกฤต!: ควรรีบกางสแลนกรองแสง 50% หรือเปิดพ่นหมอกน้ำเพื่อระบายความร้อนด่วนครับ'
          : '🚨 มืดเกินไปขั้นวิกฤต!: แสงสว่างไม่พอต่อการเติบโต ควรรีบเปิดไฟช่วยปลูก (Grow Lights) ทันทีครับ'
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
        color: 'bg-emerald-50 text-white shadow-emerald-500/20 shadow-lg border border-emerald-400/20',
        desc: '🎉 สภาพแวดล้อมดีเยี่ยมทุกด้าน ทั้งอุณหภูมิ ความชื้น VPD และแสง เหมาะสำหรับพืชเจริญเติบโตได้อย่างเต็มที่',
        icon: 'emerald'
      };
    }
    if (avgScore >= 60) {
      return {
        text: 'เหมาะสม',
        color: 'bg-blue-50 text-white shadow-blue-500/20 shadow-lg border border-blue-400/20',
        desc: '🟢 สภาพอากาศปกติ พืชเติบโตได้ดีตามเกณฑ์ทั่วไป แต่อาจต้องคอยเช็กความชื้นเป็นระยะ',
        icon: 'blue'
      };
    }
    if (avgScore >= 35) {
      return {
        text: 'เฝ้าระวัง',
        color: 'bg-amber-50 text-slate-900 shadow-amber-500/20 shadow-lg border border-amber-400/20',
        desc: '⚠️ ค่าบางตัวเริ่มผิดปกติ แนะนำให้ตรวจเช็กพัดลมระบายอากาศหรือความชื้นตามคำแนะนำ',
        icon: 'amber'
      };
    }
    return {
      text: 'ไม่เหมาะสม',
      color: 'bg-rose-50 text-white shadow-rose-500/20 shadow-lg border border-rose-400/20 animate-pulse',
      desc: '🚨 อากาศในโรงเรือนวิกฤตหลายจุด! ควรรีบปรับอุณหภูมิหรือความชื้นตามคำแนะนำด่วนเพื่อป้องกันพืชเสียหาย',
      icon: 'rose'
    };�ชไม่คายน้ำ แนะนำให้หยุดให้น้ำทางดิน เปิดพัดลมเป่าระบายหมุนเวียนลมรอบต้นพืชด่วน'
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
