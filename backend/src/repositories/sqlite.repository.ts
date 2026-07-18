import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import type { ISensorRepository, SensorData } from './sensor.repository.interface.js';

export class SQLiteRepository implements ISensorRepository {
  private db: DatabaseSync;

  constructor() {
    const dbDir = path.resolve('data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'greenhouse.db');
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sensor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        vpd REAL NOT NULL,
        lux INTEGER NOT NULL,
        ppfd REAL NOT NULL,
        zone INTEGER NOT NULL
      )
    `);
    
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sensor_logs_zone_created ON sensor_logs (zone, created_at)
    `);
  }

  private mapRow(row: any): SensorData {
    return {
      id: Number(row.id),
      created_at: row.created_at,
      temperature: Number(row.temperature || 0),
      humidity: Number(row.humidity || 0),
      vpd: Number(row.vpd || 0),
      lux: Number(row.lux || 0),
      ppfd: Number(row.ppfd || 0),
      zone: Number(row.zone || 1)
    };
  }

  async findLatest(zone: number): Promise<SensorData | null> {
    const query = this.db.prepare('SELECT * FROM sensor_logs WHERE zone = ? ORDER BY created_at DESC LIMIT 1');
    const row = query.get(zone) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  async findLogs(zone: number, limit: number): Promise<SensorData[]> {
    const query = this.db.prepare('SELECT * FROM sensor_logs WHERE zone = ? ORDER BY created_at DESC LIMIT ?');
    const rows = query.all(zone, limit) as any[];
    return rows.map(r => this.mapRow(r)).reverse();
  }

  async findLogsByDateRange(zone: number, start: Date, end: Date): Promise<SensorData[]> {
    const query = this.db.prepare('SELECT * FROM sensor_logs WHERE zone = ? AND created_at BETWEEN ? AND ? ORDER BY created_at ASC');
    const rows = query.all(zone, start.toISOString(), end.toISOString()) as any[];
    return rows.map(r => this.mapRow(r));
  }

  async insert(data: Omit<SensorData, 'id' | 'created_at'> & { created_at?: string }): Promise<SensorData> {
    const createdAt = data.created_at || new Date().toISOString();
    const query = this.db.prepare(`
      INSERT INTO sensor_logs (created_at, temperature, humidity, vpd, lux, ppfd, zone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = query.run(
      createdAt,
      data.temperature,
      data.humidity,
      data.vpd,
      data.lux,
      data.ppfd,
      data.zone
    );
    
    const lastInsertId = result.lastInsertRowid as number;
    return {
      id: lastInsertId,
      created_at: createdAt,
      temperature: data.temperature,
      humidity: data.humidity,
      vpd: data.vpd,
      lux: data.lux,
      ppfd: data.ppfd,
      zone: data.zone
    };
  }

  async insertMany(data: (Omit<SensorData, 'id' | 'created_at'> & { created_at?: string })[]): Promise<void> {
    const insertStmt = this.db.prepare(`
      INSERT INTO sensor_logs (created_at, temperature, humidity, vpd, lux, ppfd, zone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // ใช้ transactions เพื่อความเร็วสูงสุดและรักษาอายุฮาร์ดดิสก์
    this.db.exec('BEGIN TRANSACTION');
    try {
      for (const d of data) {
        const createdAt = d.created_at || new Date().toISOString();
        insertStmt.run(
          createdAt,
          d.temperature,
          d.humidity,
          d.vpd,
          d.lux,
          d.ppfd,
          d.zone
        );
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
