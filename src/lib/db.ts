import type { LogPayload, LogPhotoRecord, StoredLog } from '@/features/log/types';
import { Platform } from 'react-native';

type WebState = {
  logs: StoredLog[];
  photos: LogPhotoRecord[];
  homestead: Record<
    string,
    {
      xp: number;
      level: number;
      award_date: string;
      today_awarded: number;
      tasks_bonus_date: string;
      checkin_date: string;
      checkin_streak: number;
      equipped_decor: string;
      carbon_coins: number;
      cleanliness: number;
      happiness: number;
      owned_decors: string;
      last_interact_date: string;
      clean_count: number;
      water_count: number;
    }
  >;
  daily_tasks: Record<string, 1>;
};

const WEB_KEY = 'carbonpie.web.state.v1';
const webMemory: WebState = { logs: [], photos: [], homestead: {}, daily_tasks: {} };

function webLoad(): WebState {
  if (typeof window === 'undefined') return webMemory;
  try {
    const raw = window.localStorage.getItem(WEB_KEY);
    if (!raw) return webMemory;
    const parsed = JSON.parse(raw) as WebState;
    if (!parsed || typeof parsed !== 'object') return webMemory;
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      photos: Array.isArray((parsed as WebState).photos) ? (parsed as WebState).photos : [],
      homestead: parsed.homestead && typeof parsed.homestead === 'object' ? parsed.homestead : {},
      daily_tasks:
        parsed.daily_tasks && typeof parsed.daily_tasks === 'object' ? parsed.daily_tasks : {},
    };
  } catch {
    return webMemory;
  }
}

function webSave(next: WebState) {
  webMemory.logs = next.logs;
  webMemory.photos = next.photos;
  webMemory.homestead = next.homestead;
  webMemory.daily_tasks = next.daily_tasks;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WEB_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const isWeb = Platform.OS === 'web';
const db = (() => {
  if (isWeb) return null;
  // NOTE: Do not import expo-sqlite at module top-level.
  // Expo Web bundler may crash when evaluating expo-sqlite shims.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expoSqlite = require('expo-sqlite') as typeof import('expo-sqlite');
  return expoSqlite.openDatabaseSync('carbonpie.db');
})();

function requireDb() {
  if (!db) throw new Error('SQLite 不可用（当前平台未初始化）。');
  return db;
}

db?.execSync(`
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  avoided_kg_co2e REAL NOT NULL,
  included_in_summary INTEGER NOT NULL,
  ef_version TEXT,
  client_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
`);

db?.execSync(`
CREATE TABLE IF NOT EXISTS homestead (
  user_id TEXT PRIMARY KEY NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  award_date TEXT NOT NULL DEFAULT '',
  today_awarded INTEGER NOT NULL DEFAULT 0,
  tasks_bonus_date TEXT NOT NULL DEFAULT '',
  checkin_date TEXT NOT NULL DEFAULT '',
  checkin_streak INTEGER NOT NULL DEFAULT 0,
  equipped_decor TEXT NOT NULL DEFAULT '',
  carbon_coins INTEGER NOT NULL DEFAULT 0,
  cleanliness INTEGER NOT NULL DEFAULT 100,
  happiness INTEGER NOT NULL DEFAULT 100,
  owned_decors TEXT NOT NULL DEFAULT '',
  last_interact_date TEXT NOT NULL DEFAULT '',
  clean_count INTEGER NOT NULL DEFAULT 0,
  water_count INTEGER NOT NULL DEFAULT 0
);
`);

db?.execSync(`
CREATE TABLE IF NOT EXISTS log_photos (
  id TEXT PRIMARY KEY NOT NULL,
  log_client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  uri TEXT NOT NULL,
  source TEXT NOT NULL,
  storage_path TEXT,
  ai_category TEXT NOT NULL,
  ai_title TEXT NOT NULL,
  ai_summary TEXT NOT NULL,
  ai_encouragement TEXT NOT NULL,
  ai_confidence TEXT NOT NULL,
  ai_tags TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
`);

function migrateLogPhotoColumns() {
  if (!db) return;
  try {
    db.execSync(`ALTER TABLE log_photos ADD COLUMN storage_path TEXT;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE log_photos ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
}

migrateLogPhotoColumns();

function migrateHomesteadColumns() {
  if (!db) return;
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN checkin_date TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN checkin_streak INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN equipped_decor TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN carbon_coins INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN cleanliness INTEGER NOT NULL DEFAULT 100;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN happiness INTEGER NOT NULL DEFAULT 100;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN owned_decors TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN last_interact_date TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN clean_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE homestead ADD COLUMN water_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
}

migrateHomesteadColumns();

db?.execSync(`
CREATE TABLE IF NOT EXISTS daily_tasks (
  user_id TEXT NOT NULL,
  task_date TEXT NOT NULL,
  task_key TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, task_date, task_key)
);
`);

function parsePayload(json: string): LogPayload {
  return JSON.parse(json) as LogPayload;
}

export type HomesteadRow = {
  user_id: string;
  xp: number;
  level: number;
  award_date: string;
  today_awarded: number;
  tasks_bonus_date: string;
  checkin_date: string;
  checkin_streak: number;
  equipped_decor: string;
  carbon_coins: number;
  cleanliness: number;
  happiness: number;
  owned_decors: string;
  last_interact_date: string;
  clean_count: number;
  water_count: number;
};

export function insertLog(entry: Omit<StoredLog, 'synced'> & { synced?: number }) {
  if (isWeb) {
    const st = webLoad();
    const next: WebState = {
      ...st,
      logs: [
        {
          ...entry,
          synced: entry.synced ?? 0,
        } as StoredLog,
        ...st.logs,
      ].slice(0, 2000),
      photos: st.photos,
    };
    webSave(next);
    return;
  }
  requireDb().runSync(
    `INSERT INTO logs (id, user_id, type, payload, avoided_kg_co2e, included_in_summary, ef_version, client_id, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.user_id,
    entry.type,
    JSON.stringify(entry.payload),
    entry.avoided_kg_co2e,
    entry.included_in_summary,
    entry.ef_version,
    entry.client_id,
    entry.created_at,
    entry.synced ?? 0,
  );
}

export function listLogs(limit = 500): StoredLog[] {
  if (isWeb) {
    const st = webLoad();
    return st.logs
      .slice()
      .sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`))
      .slice(0, limit);
  }
  const rows = requireDb().getAllSync<{
    id: string;
    user_id: string;
    type: string;
    payload: string;
    avoided_kg_co2e: number;
    included_in_summary: number;
    ef_version: string | null;
    client_id: string;
    created_at: string;
    synced: number;
  }>('SELECT * FROM logs ORDER BY datetime(created_at) DESC LIMIT ?', limit);

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type as StoredLog['type'],
    payload: parsePayload(row.payload),
    avoided_kg_co2e: row.avoided_kg_co2e,
    included_in_summary: row.included_in_summary,
    ef_version: row.ef_version,
    client_id: row.client_id,
    created_at: row.created_at,
    synced: row.synced,
  }));
}

export function listUnsyncedLogs(): StoredLog[] {
  if (isWeb) {
    const st = webLoad();
    return st.logs
      .filter((l) => (l.synced ?? 0) === 0)
      .slice()
      .sort((a, b) => `${a.created_at}`.localeCompare(`${b.created_at}`));
  }
  const rows = requireDb().getAllSync<{
    id: string;
    user_id: string;
    type: string;
    payload: string;
    avoided_kg_co2e: number;
    included_in_summary: number;
    ef_version: string | null;
    client_id: string;
    created_at: string;
    synced: number;
  }>('SELECT * FROM logs WHERE synced = 0 ORDER BY datetime(created_at) ASC');

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type as StoredLog['type'],
    payload: parsePayload(row.payload),
    avoided_kg_co2e: row.avoided_kg_co2e,
    included_in_summary: row.included_in_summary,
    ef_version: row.ef_version,
    client_id: row.client_id,
    created_at: row.created_at,
    synced: row.synced,
  }));
}

export function markLogSynced(clientId: string) {
  if (isWeb) {
    const st = webLoad();
    const next: WebState = {
      ...st,
      logs: st.logs.map((l) => (l.client_id === clientId ? { ...l, synced: 1 } : l)),
      photos: st.photos,
    };
    webSave(next);
    return;
  }
  requireDb().runSync('UPDATE logs SET synced = 1 WHERE client_id = ?', clientId);
}

export function clearAllLogs() {
  if (isWeb) {
    const st = webLoad();
    webSave({ ...st, logs: [], photos: st.photos });
    return;
  }
  requireDb().execSync('DELETE FROM logs');
}

/** 清除本机全部业务数据（日志、家园、每日任务标记） */
export function wipeAllLocalUserData() {
  if (isWeb) {
    webSave({ logs: [], photos: [], homestead: {}, daily_tasks: {} });
    return;
  }
  requireDb().execSync('DELETE FROM logs');
  requireDb().execSync('DELETE FROM log_photos');
  requireDb().execSync('DELETE FROM homestead');
  requireDb().execSync('DELETE FROM daily_tasks');
}

export function rewriteUserId(fromUserId: string, toUserId: string) {
  if (isWeb) {
    const st = webLoad();
    const nextHomestead = { ...st.homestead };
    if (nextHomestead[fromUserId]) {
      nextHomestead[toUserId] = nextHomestead[fromUserId];
      delete nextHomestead[fromUserId];
    }
    const nextDaily = { ...st.daily_tasks };
    for (const k of Object.keys(nextDaily)) {
      if (k.startsWith(`${fromUserId}|`)) {
        const rest = k.slice(`${fromUserId}|`.length);
        delete nextDaily[k];
        nextDaily[`${toUserId}|${rest}`] = 1;
      }
    }
    const next: WebState = {
      logs: st.logs.map((l) =>
        l.user_id === fromUserId ? { ...l, user_id: toUserId, synced: 0 } : l,
      ),
      photos: st.photos.map((p) =>
        p.user_id === fromUserId ? { ...p, user_id: toUserId } : p,
      ),
      homestead: nextHomestead,
      daily_tasks: nextDaily,
    };
    webSave(next);
    return;
  }
  requireDb().runSync(
    'UPDATE logs SET user_id = ?, synced = 0 WHERE user_id = ?',
    toUserId,
    fromUserId,
  );
  requireDb().runSync(
    'UPDATE log_photos SET user_id = ? WHERE user_id = ?',
    toUserId,
    fromUserId,
  );
  requireDb().runSync(
    'UPDATE homestead SET user_id = ? WHERE user_id = ?',
    toUserId,
    fromUserId,
  );
  requireDb().runSync(
    'UPDATE daily_tasks SET user_id = ? WHERE user_id = ?',
    toUserId,
    fromUserId,
  );
}

export function mergeRemoteRow(remote: {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  avoided_kg_co2e: number;
  included_in_summary: boolean;
  ef_version: string | null;
  client_id: string | null;
  created_at: string;
}) {
  if (isWeb) {
    const st = webLoad();
    const clientId = remote.client_id ?? remote.id;
    if (st.logs.some((l) => l.client_id === clientId)) return;
    const next: WebState = {
      ...st,
      logs: [
        {
          id: remote.id,
          user_id: remote.user_id,
          type: remote.type as StoredLog['type'],
          payload: (typeof remote.payload === 'string'
            ? (JSON.parse(remote.payload) as LogPayload)
            : (remote.payload as LogPayload)) as LogPayload,
          avoided_kg_co2e: remote.avoided_kg_co2e,
          included_in_summary: remote.included_in_summary ? 1 : 0,
          ef_version: remote.ef_version,
          client_id: clientId,
          created_at: remote.created_at,
          synced: 1,
        },
        ...st.logs,
      ],
      photos: st.photos,
    };
    webSave(next);
    return;
  }
  const clientId = remote.client_id ?? remote.id;
  const existsRows = requireDb().getAllSync<{ c: number }>(
    'SELECT COUNT(*) as c FROM logs WHERE client_id = ?',
    clientId,
  );
  if ((existsRows[0]?.c ?? 0) > 0) return;

  requireDb().runSync(
    `INSERT INTO logs (id, user_id, type, payload, avoided_kg_co2e, included_in_summary, ef_version, client_id, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    remote.id,
    remote.user_id,
    remote.type,
    typeof remote.payload === 'string'
      ? remote.payload
      : JSON.stringify(remote.payload),
    remote.avoided_kg_co2e,
    remote.included_in_summary ? 1 : 0,
    remote.ef_version,
    clientId,
    remote.created_at,
  );
}

export function ensureHomesteadRow(userId: string) {
  if (isWeb) {
    const st = webLoad();
    if (st.homestead[userId]) return;
    webSave({
      ...st,
      homestead: {
        ...st.homestead,
        [userId]: {
          xp: 0,
          level: 1,
          award_date: '',
          today_awarded: 0,
          tasks_bonus_date: '',
          checkin_date: '',
          checkin_streak: 0,
          equipped_decor: '',
          carbon_coins: 0,
          cleanliness: 100,
          happiness: 100,
          owned_decors: '',
          last_interact_date: '',
          clean_count: 0,
          water_count: 0,
        },
      },
    });
    return;
  }
  requireDb().runSync(
    `INSERT OR IGNORE INTO homestead (user_id, xp, level, award_date, today_awarded, tasks_bonus_date, checkin_date, checkin_streak, equipped_decor, carbon_coins, cleanliness, happiness, owned_decors, last_interact_date, clean_count, water_count)
     VALUES (?, 0, 1, '', 0, '', '', 0, '', 0, 100, 100, '', '', 0, 0)`,
    userId,
  );
}

export function getHomesteadRow(userId: string): HomesteadRow | null {
  ensureHomesteadRow(userId);
  if (isWeb) {
    const st = webLoad();
    const row = st.homestead[userId];
    if (!row) return null;
    return { user_id: userId, ...row };
  }
  const rows = requireDb().getAllSync<HomesteadRow>(
    'SELECT user_id, xp, level, award_date, today_awarded, tasks_bonus_date, checkin_date, checkin_streak, equipped_decor, carbon_coins, cleanliness, happiness, owned_decors, last_interact_date, clean_count, water_count FROM homestead WHERE user_id = ?',
    userId,
  );
  return rows[0] ?? null;
}

export function updateHomesteadRow(userId: string, patch: Partial<Omit<HomesteadRow, 'user_id'>>) {
  ensureHomesteadRow(userId);
  const cur = getHomesteadRow(userId);
  if (!cur) return;
  const next: HomesteadRow = { ...cur, ...patch, user_id: userId };
  if (isWeb) {
    const st = webLoad();
    webSave({
      ...st,
      homestead: {
        ...st.homestead,
        [userId]: {
          xp: next.xp,
          level: next.level,
          award_date: next.award_date,
          today_awarded: next.today_awarded,
          tasks_bonus_date: next.tasks_bonus_date,
          checkin_date: next.checkin_date,
          checkin_streak: next.checkin_streak,
          equipped_decor: next.equipped_decor,
          carbon_coins: next.carbon_coins,
          cleanliness: next.cleanliness,
          happiness: next.happiness,
          owned_decors: next.owned_decors,
          last_interact_date: next.last_interact_date,
          clean_count: next.clean_count,
          water_count: next.water_count,
        },
      },
    });
    return;
  }
  requireDb().runSync(
    `UPDATE homestead SET xp = ?, level = ?, award_date = ?, today_awarded = ?, tasks_bonus_date = ?, checkin_date = ?, checkin_streak = ?, equipped_decor = ?, carbon_coins = ?, cleanliness = ?, happiness = ?, owned_decors = ?, last_interact_date = ?, clean_count = ?, water_count = ?
     WHERE user_id = ?`,
    next.xp,
    next.level,
    next.award_date,
    next.today_awarded,
    next.tasks_bonus_date,
    next.checkin_date,
    next.checkin_streak,
    next.equipped_decor,
    next.carbon_coins,
    next.cleanliness,
    next.happiness,
    next.owned_decors,
    next.last_interact_date,
    next.clean_count,
    next.water_count,
    userId,
  );
}

export function getDailyTaskDone(userId: string, dateStr: string, taskKey: string): boolean {
  if (isWeb) {
    const st = webLoad();
    return st.daily_tasks[`${userId}|${dateStr}|${taskKey}`] === 1;
  }
  const rows = requireDb().getAllSync<{ done: number }>(
    'SELECT done FROM daily_tasks WHERE user_id = ? AND task_date = ? AND task_key = ?',
    userId,
    dateStr,
    taskKey,
  );
  return (rows[0]?.done ?? 0) === 1;
}

export function insertLogPhoto(entry: LogPhotoRecord) {
  if (isWeb) {
    const st = webLoad();
    const next: WebState = {
      ...st,
      photos: [entry, ...st.photos]
        .sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`))
        .slice(0, 1200),
    };
    webSave(next);
    return;
  }
  requireDb().runSync(
    `INSERT OR REPLACE INTO log_photos
      (id, log_client_id, user_id, uri, source, storage_path, ai_category, ai_title, ai_summary, ai_encouragement, ai_confidence, ai_tags, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.log_client_id,
    entry.user_id,
    entry.uri,
    entry.source,
    entry.storage_path ?? null,
    entry.ai_category,
    entry.ai_title,
    entry.ai_summary,
    entry.ai_encouragement,
    entry.ai_confidence,
    JSON.stringify(entry.ai_tags),
    entry.created_at,
    entry.synced,
  );
}

export function getLogPhotoByLogId(logClientId: string): LogPhotoRecord | null {
  if (isWeb) {
    const st = webLoad();
    return st.photos.find((photo) => photo.log_client_id === logClientId) ?? null;
  }
  const rows = requireDb().getAllSync<{
    id: string;
    log_client_id: string;
    user_id: string;
    uri: string;
    source: string;
    storage_path: string | null;
    ai_category: string;
    ai_title: string;
    ai_summary: string;
    ai_encouragement: string;
    ai_confidence: string;
    ai_tags: string;
    created_at: string;
    synced: number;
  }>(
    `SELECT id, log_client_id, user_id, uri, source, storage_path, ai_category, ai_title, ai_summary, ai_encouragement, ai_confidence, ai_tags, created_at, synced
     FROM log_photos WHERE log_client_id = ? LIMIT 1`,
    logClientId,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    log_client_id: row.log_client_id,
    user_id: row.user_id,
    uri: row.uri,
    source: row.source as LogPhotoRecord['source'],
    storage_path: row.storage_path,
    ai_category: row.ai_category as LogPhotoRecord['ai_category'],
    ai_title: row.ai_title,
    ai_summary: row.ai_summary,
    ai_encouragement: row.ai_encouragement,
    ai_confidence: row.ai_confidence as LogPhotoRecord['ai_confidence'],
    ai_tags: JSON.parse(row.ai_tags || '[]') as string[],
    created_at: row.created_at,
    synced: row.synced ?? 0,
  };
}

export function getLogPhotoById(photoId: string): LogPhotoRecord | null {
  if (isWeb) {
    const st = webLoad();
    return st.photos.find((photo) => photo.id === photoId) ?? null;
  }
  const rows = requireDb().getAllSync<{
    id: string;
    log_client_id: string;
    user_id: string;
    uri: string;
    source: string;
    storage_path: string | null;
    ai_category: string;
    ai_title: string;
    ai_summary: string;
    ai_encouragement: string;
    ai_confidence: string;
    ai_tags: string;
    created_at: string;
    synced: number;
  }>(
    `SELECT id, log_client_id, user_id, uri, source, storage_path, ai_category, ai_title, ai_summary, ai_encouragement, ai_confidence, ai_tags, created_at, synced
     FROM log_photos WHERE id = ? LIMIT 1`,
    photoId,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    log_client_id: row.log_client_id,
    user_id: row.user_id,
    uri: row.uri,
    source: row.source as LogPhotoRecord['source'],
    storage_path: row.storage_path,
    ai_category: row.ai_category as LogPhotoRecord['ai_category'],
    ai_title: row.ai_title,
    ai_summary: row.ai_summary,
    ai_encouragement: row.ai_encouragement,
    ai_confidence: row.ai_confidence as LogPhotoRecord['ai_confidence'],
    ai_tags: JSON.parse(row.ai_tags || '[]') as string[],
    created_at: row.created_at,
    synced: row.synced ?? 0,
  };
}

export function listLogPhotosByUser(userId: string, limit = 120): LogPhotoRecord[] {
  if (isWeb) {
    const st = webLoad();
    return st.photos
      .filter((photo) => photo.user_id === userId)
      .slice()
      .sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`))
      .slice(0, limit);
  }
  const rows = requireDb().getAllSync<{
    id: string;
    log_client_id: string;
    user_id: string;
    uri: string;
    source: string;
    storage_path: string | null;
    ai_category: string;
    ai_title: string;
    ai_summary: string;
    ai_encouragement: string;
    ai_confidence: string;
    ai_tags: string;
    created_at: string;
    synced: number;
  }>(
    `SELECT id, log_client_id, user_id, uri, source, storage_path, ai_category, ai_title, ai_summary, ai_encouragement, ai_confidence, ai_tags, created_at, synced
     FROM log_photos WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`,
    userId,
    limit,
  );
  return rows.map((row) => ({
    id: row.id,
    log_client_id: row.log_client_id,
    user_id: row.user_id,
    uri: row.uri,
    source: row.source as LogPhotoRecord['source'],
    storage_path: row.storage_path,
    ai_category: row.ai_category as LogPhotoRecord['ai_category'],
    ai_title: row.ai_title,
    ai_summary: row.ai_summary,
    ai_encouragement: row.ai_encouragement,
    ai_confidence: row.ai_confidence as LogPhotoRecord['ai_confidence'],
    ai_tags: JSON.parse(row.ai_tags || '[]') as string[],
    created_at: row.created_at,
    synced: row.synced ?? 0,
  }));
}

export function listUnsyncedLogPhotos(userId: string): LogPhotoRecord[] {
  if (isWeb) {
    const st = webLoad();
    return st.photos
      .filter((photo) => photo.user_id === userId && (photo.synced ?? 0) === 0)
      .slice()
      .sort((a, b) => `${a.created_at}`.localeCompare(`${b.created_at}`));
  }
  const rows = requireDb().getAllSync<{
    id: string;
    log_client_id: string;
    user_id: string;
    uri: string;
    source: string;
    storage_path: string | null;
    ai_category: string;
    ai_title: string;
    ai_summary: string;
    ai_encouragement: string;
    ai_confidence: string;
    ai_tags: string;
    created_at: string;
    synced: number;
  }>(
    `SELECT id, log_client_id, user_id, uri, source, storage_path, ai_category, ai_title, ai_summary, ai_encouragement, ai_confidence, ai_tags, created_at, synced
     FROM log_photos WHERE user_id = ? AND synced = 0 ORDER BY datetime(created_at) ASC`,
    userId,
  );
  return rows.map((row) => ({
    id: row.id,
    log_client_id: row.log_client_id,
    user_id: row.user_id,
    uri: row.uri,
    source: row.source as LogPhotoRecord['source'],
    storage_path: row.storage_path,
    ai_category: row.ai_category as LogPhotoRecord['ai_category'],
    ai_title: row.ai_title,
    ai_summary: row.ai_summary,
    ai_encouragement: row.ai_encouragement,
    ai_confidence: row.ai_confidence as LogPhotoRecord['ai_confidence'],
    ai_tags: JSON.parse(row.ai_tags || '[]') as string[],
    created_at: row.created_at,
    synced: row.synced ?? 0,
  }));
}

export function markLogPhotoSynced(photoId: string, patch?: { storage_path?: string | null; uri?: string }) {
  if (isWeb) {
    const st = webLoad();
    const nextPhotos = st.photos.map((photo) =>
      photo.id === photoId
        ? {
            ...photo,
            synced: 1,
            storage_path: patch?.storage_path ?? photo.storage_path ?? null,
            uri: patch?.uri ?? photo.uri,
          }
        : photo,
    );
    webSave({ ...st, photos: nextPhotos });
    return;
  }
  requireDb().runSync(
    `UPDATE log_photos SET synced = 1, storage_path = COALESCE(?, storage_path), uri = COALESCE(?, uri) WHERE id = ?`,
    patch?.storage_path ?? null,
    patch?.uri ?? null,
    photoId,
  );
}

export function mergeRemotePhoto(photo: LogPhotoRecord) {
  insertLogPhoto({
    ...photo,
    synced: 1,
  });
}

export function setDailyTaskDone(userId: string, dateStr: string, taskKey: string, done = true) {
  if (isWeb) {
    const st = webLoad();
    const key = `${userId}|${dateStr}|${taskKey}`;
    const nextDaily = { ...st.daily_tasks };
    if (done) nextDaily[key] = 1;
    else delete nextDaily[key];
    webSave({ ...st, daily_tasks: nextDaily });
    return;
  }
  requireDb().runSync(
    'DELETE FROM daily_tasks WHERE user_id = ? AND task_date = ? AND task_key = ?',
    userId,
    dateStr,
    taskKey,
  );
  requireDb().runSync(
    `INSERT INTO daily_tasks (user_id, task_date, task_key, done)
     VALUES (?, ?, ?, ?)`,
    userId,
    dateStr,
    taskKey,
    done ? 1 : 0,
  );
}
