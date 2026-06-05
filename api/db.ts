import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(import.meta.dir, '..', 'data', 'map.db');

// Ensure data directory exists
await Bun.write(path.join(path.dirname(DB_PATH), '.gitkeep'), '').catch(() => {});

export const db = new Database(DB_PATH, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    layer     TEXT    NOT NULL,
    ts        INTEGER NOT NULL,
    data      TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_layer_ts ON snapshots (layer, ts);
`);

export function saveSnapshot(layer: string, data: unknown): void {
  db.prepare('INSERT INTO snapshots (layer, ts, data) VALUES (?, ?, ?)').run(layer, Date.now(), JSON.stringify(data));
}

export function getLatest(layer: string): unknown | null {
  const row = db
    .prepare<{ data: string }, string>('SELECT data FROM snapshots WHERE layer = ? ORDER BY ts DESC LIMIT 1')
    .get(layer);
  return row ? JSON.parse(row.data) : null;
}

export function getRange(layer: string, from: number, to: number): { timestamp: number; geojson: unknown }[] {
  return db
    .prepare<{ ts: number; data: string }, [string, number, number]>(
      'SELECT ts, data FROM snapshots WHERE layer = ? AND ts BETWEEN ? AND ? ORDER BY ts ASC',
    )
    .all(layer, from, to)
    .map(row => ({ timestamp: row.ts, geojson: JSON.parse(row.data) }));
}

const HISTORY_DAYS = Number(process.env.HISTORY_DAYS ?? 7);

export function pruneOldSnapshots(): void {
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM snapshots WHERE ts < ?').run(cutoff);
}
