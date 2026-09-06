import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Durable snapshot store. Runtime still uses an in-memory object;
 * this layer replaces racy full-file JSON rewrites with SQLite WAL.
 *
 * The `snapshot` row is the authoritative copy and is the only thing a save
 * touches. The `users` and `bets` tables exist so the file can be queried with
 * the sqlite CLI; nothing in the server reads them back, and rebuilding them on
 * every save meant deleting and re-inserting thousands of rows for each coin
 * flip. They are refreshed by `refreshIndexes` on a timer instead, and
 * `index_meta.refreshed_at` records how current they are.
 */
export function openSqliteStore(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sqlite = new DatabaseSync(filePath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA synchronous = NORMAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      nickname TEXT,
      role TEXT,
      status TEXT,
      balance REAL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      username TEXT,
      lottery_type TEXT,
      status TEXT,
      amount REAL,
      payout REAL,
      created_at TEXT,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS index_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      refreshed_at TEXT NOT NULL
    );
  `);

  const selectSnapshot = sqlite.prepare("SELECT payload FROM snapshot WHERE id = 1");
  const upsertSnapshot = sqlite.prepare(
    "INSERT INTO snapshot (id, payload, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
  );
  const insertUser = sqlite.prepare(
    "INSERT INTO users (username, nickname, role, status, balance, payload) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertBet = sqlite.prepare(
    "INSERT INTO bets (id, username, lottery_type, status, amount, payout, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const upsertIndexMeta = sqlite.prepare(
    "INSERT INTO index_meta (id, refreshed_at) VALUES (1, datetime('now')) ON CONFLICT(id) DO UPDATE SET refreshed_at = excluded.refreshed_at"
  );

  /** How many of the most recent bets the queryable index keeps. */
  const INDEXED_BETS = 5000;

  function load() {
    const row = selectSnapshot.get();
    if (!row?.payload) return null;
    return JSON.parse(row.payload);
  }

  /**
   * Persists the authoritative snapshot. `payload` is the already-serialised
   * JSON, so the caller can reuse the same string for its own backup file
   * rather than serialising the database twice.
   */
  function saveSnapshot(payload) {
    upsertSnapshot.run(payload);
  }

  /** Rebuilds the queryable tables. Cost grows with the database, so call sparingly. */
  function refreshIndexes(data) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      sqlite.exec("DELETE FROM users");
      sqlite.exec("DELETE FROM bets");
      for (const user of data.users || []) {
        insertUser.run(
          user.username,
          user.nickname ?? "",
          user.role ?? "user",
          user.status ?? "active",
          Number(user.balance || 0),
          JSON.stringify(user)
        );
      }
      for (const bet of (data.bets || []).slice(-INDEXED_BETS)) {
        insertBet.run(
          String(bet.id),
          bet.username ?? "",
          bet.lotteryType ?? "",
          bet.status ?? "",
          Number(bet.amount || 0),
          Number(bet.payout || 0),
          bet.createdAt ?? "",
          JSON.stringify(bet)
        );
      }
      upsertIndexMeta.run();
      sqlite.exec("COMMIT");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }

  /** Folds the write-ahead log back into the main file. */
  function checkpoint() {
    sqlite.exec("PRAGMA wal_checkpoint(PASSIVE)");
  }

  function close() {
    sqlite.close();
  }

  return { load, saveSnapshot, refreshIndexes, checkpoint, close, filePath };
}
