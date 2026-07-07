import type { ISensorRepository, SensorData } from './sensor.repository.interface.js';

export class MockRepository implements ISensorRepository {
  private mockLogs: SensorData[] = [];

  constructor() {
    this.generateInitialData();
  }

  private calculateVPD(temp: number, rh: number): number {
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const vpd = svp * (1 - rh / 100);
    return parseFloat(vpd.toFixed(2));
  }

  private generateInitialData() {
    const now = Date.now();
    for (let i = 49; i >= 0; i--) {
      const timestamp = new Date(now - i * 10 * 60 * 1000).toISOString();
      for (let zone = 1; zone <= 5; zone++) {
        let baseTemp = 26;
        let baseHum = 70;
        let baseLux = 25000;

        if (zone === 1) {
          baseTemp = 26; baseHum = 75; baseLux = 22000;
        } else if (zone === 2) {
          baseTemp = 32; baseHum = 52; baseLux = 38000;
        } else if (zone === 3) {
          baseTemp = 21; baseHum = 85; baseLux = 12000;
        } else if (zone === 4) {
          baseTemp = 27; baseHum = 68; baseLux = 24324;
        } else if (zone === 5) {
          baseTemp = 30; baseHum = 60; baseLux = 48000;
        }

        const timeFactor = Math.sin((50 - i) / 8);
        const temp = parseFloat((baseTemp + timeFactor * 1.5 + Math.random() * 0.4 - 0.2).toFixed(2));
        const humidity = parseFloat(Math.min(100, Math.max(10, baseHum - timeFactor * 5 + Math.random() * 1.5 - 0.75)).toFixed(2));
        const vpd = this.calculateVPD(temp, humidity);
        const lux = Math.max(0, Math.round(baseLux + timeFactor * 8000 + Math.random() * 1500 - 750));
        const ppfd = parseFloat((lux * 0.0185).toFixed(2));

        this.mockLogs.push({
          id: -(zone * 1000 + i),
          created_at: timestamp,
          temperature: temp,
          humidity: humidity,
          vpd: vpd,
          lux: lux,
          ppfd: ppfd,
          zone: zone
        });
      }
    }
  }

  async findLatest(zone: number): Promise<SensorData | null> {
    const zoneLogs = this.mockLogs.filter(log => log.zone === zone);
    if (zoneLogs.length === 0) return null;
    return zoneLogs[zoneLogs.length - 1] || null;
  }

  async findLogs(zone: number, limit: number): Promise<SensorData[]> {
    return this.mockLogs
      .filter(log => log.zone === zone)
      .slice(-limit);
  }

  async findLogsByDateRange(zone: number, start: Date, end: Date): Promise<SensorData[]> {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return this.mockLogs.filter(log => {
      if (log.zone !== zone) return false;
      const t = new Date(log.created_at).getTime();
      return t >= startTime && t <= endTime;
    });
  }

  async insert(data: Omit<SensorData, 'id' | 'created_at'> & { created_at?: string }): Promise<SensorData> {
    const { created_at, ...rest } = data;
    const newLog: SensorData = {
      id: -Date.now(),
      created_at: created_at || new Date().toISOString(),
      ...rest
    } as SensorData;
    this.mockLogs.push(newLog);
    return newLog;
  }

  async insertMany(data: (Omit<SensorData, 'id' | 'created_at'> & { created_at?: string })[]): Promise<void> {
    data.forEach((d, idx) => {
      const { created_at, ...rest } = d;
      this.mockLogs.push({
        id: -Date.now() - idx,
        created_at: created_at || new Date().toISOString(),
        ...rest
      } as SensorData);
    });
  }

  simulateTick() {
    const nowIso = new Date().toISOString();
    const nextTicks: SensorData[] = [];
    for (let zone = 1; zone <= 5; zone++) {
      const zonePrev = this.mockLogs.filter(d => d.zone === zone);
      const lastPoint = zonePrev[zonePrev.length - 1];
      
      const tempChange = (Math.random() * 0.4 - 0.2);
      const humChange = (Math.random() * 2 - 1);
      
      const temp = parseFloat((lastPoint ? lastPoint.temperature + tempChange : 26 + tempChange).toFixed(2));
      const humidity = parseFloat(Math.min(100, Math.max(10, lastPoint ? lastPoint.humidity + humChange : 70 + humChange)).toFixed(2));
      const vpd = this.calculateVPD(temp, humidity);
      
      const luxChange = Math.round(Math.random() * 600 - 300);
      const lux = Math.max(0, lastPoint ? Math.round(lastPoint.lux + luxChange) : 25000 + luxChange);
      const ppfd = parseFloat((lux * 0.0185).toFixed(2));
      
      const tick = {
        id: -Date.now() - zone,
        created_at: nowIso,
        temperature: temp,
        humidity: humidity,
        vpd: vpd,
        lux: lux,
        ppfd: ppfd,
        zone: zone
      };
      
      this.mockLogs.push(tick);
      nextTicks.push(tick);
    }

    // จำกัดขนาดย้อนหลังสูงสุด 200 รายการต่อโซนในหน่วยความจำ
    const limit = 200;
    const trimmed: SensorData[] = [];
    for (let z = 1; z <= 5; z++) {
      trimmed.push(...this.mockLogs.filter(d => d.zone === z).slice(-limit));
    }
    this.mockLogs = trimmed;

    return nextTicks;
  }
}
