import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Durable snapshot store. Runtime still uses an in-memory object;
 * this layer replaces racy full-file JSON rewrites with SQLite WAL.
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

  function load() {
    const row = selectSnapshot.get();
    if (!row?.payload) return null;
    return JSON.parse(row.payload);
  }

  function save(data) {
    const payload = JSON.stringify({
      users: data.users || [],
      bets: data.bets || [],
      lotteries: data.lotteries || {},
      transactions: data.transactions || [],
      systemSettings: data.systemSettings || {},
      sessions: data.sessions || {},
      chatMessages: (data.chatMessages || []).slice(-100),
      platform: data.platform || { mode: "virtual-credits", cashFeaturesEnabled: false }
    });
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      upsertSnapshot.run(payload);
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
      const recentBets = (data.bets || []).slice(-5000);
      for (const bet of recentBets) {
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
      sqlite.exec("COMMIT");
      sqlite.exec("PRAGMA wal_checkpoint(PASSIVE)");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }

  function close() {
    sqlite.close();
  }

  return { load, save, close, filePath };
}
