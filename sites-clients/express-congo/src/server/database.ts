import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { production, environment } from "@/config";
let singleton: DatabaseSync;
export function db() {
  if (production())
    throw new Error(
      "Le stockage local de démonstration est interdit en production. EC-025",
    );
  if (singleton) return singleton;
  const path = resolve(
    /* turbopackIgnore: true */
    process.env.LOCAL_DATABASE_PATH || `.data/${environment()}.db`,
  );
  mkdirSync(dirname(path), { recursive: true });
  singleton = new DatabaseSync(path);
  singleton.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  singleton.exec(`
    CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, reference TEXT UNIQUE NOT NULL, idempotency TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, volume TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'nouveau', agency TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, object_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, quote_id TEXT NOT NULL REFERENCES quotes(id), name TEXT NOT NULL, mime TEXT NOT NULL, bytes BLOB NOT NULL, status TEXT NOT NULL DEFAULT 'quarantaine', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS editorial (slug TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, truth_status TEXT NOT NULL DEFAULT 'PROPOSÉ', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
  `);
  return singleton;
}
export function rateLimit(key: string, limit = 10, seconds = 600) {
  const database = db(),
    now = Date.now();
  const row = database
    .prepare("SELECT count,expires_at FROM rate_limits WHERE key=?")
    .get(key) as { count: number; expires_at: number } | undefined;
  if (!row || row.expires_at < now) {
    database
      .prepare("INSERT OR REPLACE INTO rate_limits VALUES(?,?,?)")
      .run(key, 1, now + seconds * 1000);
    return true;
  }
  if (row.count >= limit) return false;
  database.prepare("UPDATE rate_limits SET count=count+1 WHERE key=?").run(key);
  return true;
}
