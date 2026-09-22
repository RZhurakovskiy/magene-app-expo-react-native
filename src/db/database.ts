import * as SQLite from 'expo-sqlite';
import { UserProfile, WorkoutSession, WorkoutSessionSummary } from '../types';
import { computeSessionSummary, MonitoringSessionKind } from '../utils/monitoringStats';

export type { MonitoringSessionKind } from '../utils/monitoringStats';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('pulse.db');
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      mode TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL,
      avg_hr INTEGER NOT NULL,
      max_hr INTEGER NOT NULL,
      min_hr INTEGER NOT NULL,
      distance_meters REAL,
      avg_pace_sec_per_km REAL,
      hr_samples TEXT NOT NULL,
      route TEXT
    );
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_kg REAL NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS known_device (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      device_id TEXT NOT NULL,
      device_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS monitoring_minutes (
      minute_ts INTEGER PRIMARY KEY NOT NULL,
      avg_bpm INTEGER NOT NULL,
      min_bpm INTEGER NOT NULL,
      max_bpm INTEGER NOT NULL,
      sample_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS monitoring_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      kind TEXT,
      avg_bpm INTEGER,
      min_bpm INTEGER,
      max_bpm INTEGER,
      resting_bpm INTEGER,
      minutes_tracked INTEGER,
      avg_hrv_ms INTEGER,
      has_rr INTEGER
    );
    CREATE TABLE IF NOT EXISTS app_flags (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  try {
    await db.execAsync('ALTER TABLE sessions ADD COLUMN calories_kcal REAL;');
  } catch {
    // column already exists
  }
  try {
    await db.execAsync('ALTER TABLE monitoring_minutes ADD COLUMN avg_hrv_ms INTEGER;');
  } catch {
    // column already exists
  }
  try {
    await db.execAsync('ALTER TABLE monitoring_minutes ADD COLUMN rr_count INTEGER;');
  } catch {
    // column already exists
  }
}

export async function getFlag(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_flags WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setFlag(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO app_flags (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = $value',
    { $key: key, $value: value },
  );
}

export interface KnownDeviceRecord {
  id: string;
  name: string;
}

export async function getKnownDevice(): Promise<KnownDeviceRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ device_id: string; device_name: string }>(
    'SELECT device_id, device_name FROM known_device WHERE id = 1',
  );
  return row ? { id: row.device_id, name: row.device_name } : null;
}

export async function saveKnownDevice(device: KnownDeviceRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO known_device (id, device_id, device_name) VALUES (1, $deviceId, $deviceName)
     ON CONFLICT(id) DO UPDATE SET device_id = $deviceId, device_name = $deviceName`,
    { $deviceId: device.id, $deviceName: device.name },
  );
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ weight_kg: number; age: number; gender: string }>(
    'SELECT weight_kg, age, gender FROM profile WHERE id = 1',
  );
  if (!row) return null;
  return { weightKg: row.weight_kg, age: row.age, gender: row.gender as UserProfile['gender'] };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile (id, weight_kg, age, gender) VALUES (1, $weightKg, $age, $gender)
     ON CONFLICT(id) DO UPDATE SET weight_kg = $weightKg, age = $age, gender = $gender`,
    { $weightKg: profile.weightKg, $age: profile.age, $gender: profile.gender },
  );
}

export async function insertSession(session: WorkoutSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sessions (id, mode, started_at, ended_at, duration_sec, avg_hr, max_hr, min_hr, distance_meters, avg_pace_sec_per_km, hr_samples, route, calories_kcal)
     VALUES ($id, $mode, $startedAt, $endedAt, $durationSec, $avgHr, $maxHr, $minHr, $distanceMeters, $avgPaceSecPerKm, $hrSamples, $route, $caloriesKcal)`,
    {
      $id: session.id,
      $mode: session.mode,
      $startedAt: session.startedAt,
      $endedAt: session.endedAt,
      $durationSec: session.durationSec,
      $avgHr: session.avgHr,
      $maxHr: session.maxHr,
      $minHr: session.minHr,
      $distanceMeters: session.distanceMeters ?? null,
      $avgPaceSecPerKm: session.avgPaceSecPerKm ?? null,
      $hrSamples: JSON.stringify(session.hrSamples),
      $route: session.route ? JSON.stringify(session.route) : null,
      $caloriesKcal: session.caloriesKcal ?? null,
    },
  );
}

interface SessionRow {
  id: string;
  mode: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  avg_hr: number;
  max_hr: number;
  min_hr: number;
  distance_meters: number | null;
  avg_pace_sec_per_km: number | null;
  hr_samples: string;
  route: string | null;
  calories_kcal: number | null;
}

function rowToSummary(row: SessionRow): WorkoutSessionSummary {
  return {
    id: row.id,
    mode: row.mode as WorkoutSession['mode'],
    startedAt: row.started_at,
    durationSec: row.duration_sec,
    avgHr: row.avg_hr,
    distanceMeters: row.distance_meters ?? undefined,
    avgPaceSecPerKm: row.avg_pace_sec_per_km ?? undefined,
    caloriesKcal: row.calories_kcal ?? undefined,
  };
}

function rowToSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    mode: row.mode as WorkoutSession['mode'],
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    avgHr: row.avg_hr,
    maxHr: row.max_hr,
    minHr: row.min_hr,
    distanceMeters: row.distance_meters ?? undefined,
    avgPaceSecPerKm: row.avg_pace_sec_per_km ?? undefined,
    hrSamples: JSON.parse(row.hr_samples),
    route: row.route ? JSON.parse(row.route) : undefined,
    caloriesKcal: row.calories_kcal ?? undefined,
  };
}

export async function listSessionSummaries(): Promise<WorkoutSessionSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>('SELECT * FROM sessions ORDER BY started_at DESC');
  return rows.map(rowToSummary);
}

export async function getSessionById(id: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? rowToSession(row) : null;
}

export async function listSessionsSince(sinceMs: number): Promise<WorkoutSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE started_at >= ? ORDER BY started_at DESC',
    [sinceMs],
  );
  return rows.map(rowToSession);
}

export interface MonitoringMinute {
  minuteTs: number;
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  sampleCount: number;
  avgHrvMs: number | null;
  rrCount: number;
}

export async function insertMonitoringMinute(minute: MonitoringMinute): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO monitoring_minutes (minute_ts, avg_bpm, min_bpm, max_bpm, sample_count, avg_hrv_ms, rr_count)
     VALUES ($ts, $avg, $min, $max, $count, $hrv, $rr)
     ON CONFLICT(minute_ts) DO UPDATE SET avg_bpm = $avg, min_bpm = $min, max_bpm = $max,
       sample_count = $count, avg_hrv_ms = $hrv, rr_count = $rr`,
    {
      $ts: minute.minuteTs,
      $avg: minute.avgBpm,
      $min: minute.minBpm,
      $max: minute.maxBpm,
      $count: minute.sampleCount,
      $hrv: minute.avgHrvMs,
      $rr: minute.rrCount,
    },
  );
}

interface MonitoringRow {
  minute_ts: number;
  avg_bpm: number;
  min_bpm: number;
  max_bpm: number;
  sample_count: number;
  avg_hrv_ms: number | null;
  rr_count: number | null;
}

function rowToMonitoringMinute(row: MonitoringRow): MonitoringMinute {
  return {
    minuteTs: row.minute_ts,
    avgBpm: row.avg_bpm,
    minBpm: row.min_bpm,
    maxBpm: row.max_bpm,
    sampleCount: row.sample_count,
    avgHrvMs: row.avg_hrv_ms ?? null,
    rrCount: row.rr_count ?? 0,
  };
}

export async function listMonitoringMinutesBetween(fromMs: number, toMs: number): Promise<MonitoringMinute[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MonitoringRow>(
    'SELECT * FROM monitoring_minutes WHERE minute_ts >= ? AND minute_ts <= ? ORDER BY minute_ts ASC',
    [fromMs, toMs],
  );
  return rows.map(rowToMonitoringMinute);
}

export interface MonitoringSession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  kind: MonitoringSessionKind | null;
  avgBpm: number | null;
  minBpm: number | null;
  maxBpm: number | null;
  restingBpm: number | null;
  minutesTracked: number | null;
  avgHrvMs: number | null;
  hasRr: boolean;
}

interface MonitoringSessionRow {
  id: string;
  started_at: number;
  ended_at: number | null;
  kind: string | null;
  avg_bpm: number | null;
  min_bpm: number | null;
  max_bpm: number | null;
  resting_bpm: number | null;
  minutes_tracked: number | null;
  avg_hrv_ms: number | null;
  has_rr: number | null;
}

function rowToMonitoringSession(row: MonitoringSessionRow): MonitoringSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    kind: (row.kind as MonitoringSessionKind | null) ?? null,
    avgBpm: row.avg_bpm,
    minBpm: row.min_bpm,
    maxBpm: row.max_bpm,
    restingBpm: row.resting_bpm,
    minutesTracked: row.minutes_tracked,
    avgHrvMs: row.avg_hrv_ms,
    hasRr: row.has_rr === 1,
  };
}

export async function createMonitoringSession(id: string, startedAt: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO monitoring_sessions (id, started_at) VALUES (?, ?)', [id, startedAt]);
}

export async function finalizeMonitoringSession(id: string, endedAt: number): Promise<void> {
  const db = await getDb();
  const session = await db.getFirstAsync<MonitoringSessionRow>(
    'SELECT * FROM monitoring_sessions WHERE id = ?',
    [id],
  );
  if (!session) return;

  const minutes = await listMonitoringMinutesBetween(session.started_at, endedAt);
  const summary = computeSessionSummary(minutes, session.started_at, endedAt);

  await db.runAsync(
    `UPDATE monitoring_sessions SET ended_at = $end, kind = $kind, avg_bpm = $avg, min_bpm = $min,
       max_bpm = $max, resting_bpm = $resting, minutes_tracked = $minutes, avg_hrv_ms = $hrv, has_rr = $hasRr
     WHERE id = $id`,
    {
      $id: id,
      $end: endedAt,
      $kind: summary.kind,
      $avg: summary.avgBpm,
      $min: summary.minBpm,
      $max: summary.maxBpm,
      $resting: summary.restingBpm,
      $minutes: summary.minutesTracked,
      $hrv: summary.avgHrvMs,
      $hasRr: summary.hasRr ? 1 : 0,
    },
  );
}

export async function listMonitoringSessions(): Promise<MonitoringSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MonitoringSessionRow>(
    'SELECT * FROM monitoring_sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC',
  );
  return rows.map(rowToMonitoringSession);
}

export async function getMonitoringSession(id: string): Promise<MonitoringSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MonitoringSessionRow>('SELECT * FROM monitoring_sessions WHERE id = ?', [id]);
  return row ? rowToMonitoringSession(row) : null;
}

// Close any session left open by an app kill so it doesn't dangle.
export async function closeDanglingSessions(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<MonitoringSessionRow>(
    'SELECT * FROM monitoring_sessions WHERE ended_at IS NULL',
  );
  for (const row of rows) {
    const last = await db.getFirstAsync<{ ts: number }>(
      'SELECT MAX(minute_ts) as ts FROM monitoring_minutes WHERE minute_ts >= ?',
      [row.started_at],
    );
    const endedAt = last?.ts ? last.ts + 60000 : row.started_at;
    await finalizeMonitoringSession(row.id, endedAt);
  }
}
