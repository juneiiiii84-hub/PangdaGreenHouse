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

export interface ISensorRepository {
  findLatest(zone: number): Promise<SensorData | null>;
  findLogs(zone: number, limit: number): Promise<SensorData[]>;
  findLogsByDateRange(zone: number, start: Date, end: Date): Promise<SensorData[]>;
  insert(data: Omit<SensorData, 'id' | 'created_at'> & { created_at?: string }): Promise<SensorData>;
  insertMany(data: (Omit<SensorData, 'id' | 'created_at'> & { created_at?: string })[]): Promise<void>;
}
