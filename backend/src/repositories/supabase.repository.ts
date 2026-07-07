import { supabase } from '../services/supabase.service.js';
import type { ISensorRepository, SensorData } from './sensor.repository.interface.js';

export class SupabaseRepository implements ISensorRepository {
  private mapToSensorData(dbRow: any): SensorData {
    // ตาราง Supabase เดิมมีคอลัมน์ ppfd ซึ่งเก็บค่า LUX ดิบ
    const rawVal = Number(dbRow.ppfd || 0);
    const lux = rawVal;
    const ppfd = parseFloat((lux * 0.0185).toFixed(2)); // แปลงแสงแดดเฉลี่ย

    return {
      id: dbRow.id,
      created_at: dbRow.created_at,
      temperature: Number(dbRow.temperature || 0),
      humidity: Number(dbRow.humidity || 0),
      vpd: Number(dbRow.vpd || 0),
      lux: lux,
      ppfd: ppfd,
      zone: Number(dbRow.zone || 1)
    };
  }

  async findLatest(zone: number): Promise<SensorData | null> {
    const { data, error } = await supabase
      .from('sensor_logs')
      .select('*')
      .eq('zone', zone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return this.mapToSensorData(data[0]);
  }

  async findLogs(zone: number, limit: number): Promise<SensorData[]> {
    const { data, error } = await supabase
      .from('sensor_logs')
      .select('*')
      .eq('zone', zone)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(row => this.mapToSensorData(row)).reverse();
  }

  async findLogsByDateRange(zone: number, start: Date, end: Date): Promise<SensorData[]> {
    const { data, error } = await supabase
      .from('sensor_logs')
      .select('*')
      .eq('zone', zone)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(row => this.mapToSensorData(row));
  }

  async insert(data: Omit<SensorData, 'id' | 'created_at'> & { created_at?: string }): Promise<SensorData> {
    const payload: any = {
      temperature: data.temperature,
      humidity: data.humidity,
      vpd: data.vpd,
      ppfd: data.lux, // บันทึก LUX ดิบลงในช่อง ppfd ตามโครงสร้างตารางเดิม
      zone: data.zone
    };
    if (data.created_at) {
      payload.created_at = data.created_at;
    }

    const { data: inserted, error } = await supabase
      .from('sensor_logs')
      .insert(payload)
      .select();

    if (error || !inserted || inserted.length === 0) {
      throw new Error(`Failed to insert to Supabase: ${error?.message}`);
    }
    return this.mapToSensorData(inserted[0]);
  }

  async insertMany(data: (Omit<SensorData, 'id' | 'created_at'> & { created_at?: string })[]): Promise<void> {
    const records = data.map(d => {
      const payload: any = {
        temperature: d.temperature,
        humidity: d.humidity,
        vpd: d.vpd,
        ppfd: d.lux, // บันทึก LUX ดิบลงในช่อง ppfd ตามโครงสร้างตารางเดิม
        zone: d.zone
      };
      if (d.created_at) {
        payload.created_at = d.created_at;
      }
      return payload;
    });

    const { error } = await supabase
      .from('sensor_logs')
      .insert(records);

    if (error) {
      throw new Error(`Failed to insert many to Supabase: ${error.message}`);
    }
  }
}
