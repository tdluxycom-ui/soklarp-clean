#!/usr/bin/env node
/**
 * Checks the write-coalescing behaviour that keeps a burst of plays from
 * queueing one full database write each, and that flush still guarantees a
 * write for the changes a player would notice going missing.
 *
 * Usage: node scripts/test-persistence.mjs
 */

import { createCoalescingWriter } from "../lib/db-writer.mjs";
import { openSqliteStore } from "../lib/sqlite-store.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("\nWrite coalescing");
{
  let writes = 0;
  const writer = createCoalescingWriter({ write: () => { writes += 1; }, intervalMs: 20 });

  for (let i = 0; i < 200; i++) writer.markDirty();
  assert("a burst of saves writes nothing immediately", writes === 0, `writes ${writes}`);

  await writer.flush();
  assert("200 saves collapse into one write", writes === 1, `writes ${writes}`);
  assert("nothing is left pending after a flush", writer.pending === false);
}

console.log("\nWrites still happen without an explicit flush");
{
  let writes = 0;
  const writer = createCoalescingWriter({ write: () => { writes += 1; }, intervalMs: 10 });
  writer.markDirty();
  await sleep(60);
  assert("a marked change reaches disk on its own", writes === 1, `writes ${writes}`);
}

console.log("\nA change made during a write is not lost");
{
  let writes = 0;
  let released;
  const gate = new Promise((resolve) => { released = resolve; });
  const writer = createCoalescingWriter({
    write: async () => { writes += 1; if (writes === 1) await gate; },
    intervalMs: 5
  });

  writer.markDirty();
  await sleep(30);
  assert("the first write is in progress", writes === 1, `writes ${writes}`);

  writer.markDirty();
  released();
  await writer.flush();
  assert("the change made mid-write is written too", writes === 2, `writes ${writes}`);
}

console.log("\nA failing write does not stop later ones");
{
  let writes = 0;
  const errors = [];
  const writer = createCoalescingWriter({
    write: () => { writes += 1; if (writes === 1) throw new Error("disk full"); },
    intervalMs: 5,
    onError: (err) => errors.push(err.message)
  });

  writer.markDirty();
  await writer.flush();
  assert("the failure is reported, not thrown", errors.length === 1 && errors[0] === "disk full");

  writer.markDirty();
  await writer.flush();
  assert("a later save still writes", writes === 2, `writes ${writes}`);
}

console.log("\nSnapshot round-trip through SQLite");
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soklarp-persist-"));
  const store = openSqliteStore(path.join(dir, "test.sqlite"));

  assert("an empty store loads as null", store.load() === null);

  const data = {
    users: [{ username: "a", nickname: "A", balance: 100 }],
    bets: [{ id: "b1", username: "a", lotteryType: "vnfast", status: "pending", amount: 10, payout: 0 }],
    lotteries: { vnfast: { id: "vnfast" } },
    transactions: [],
    systemSettings: { limits: { minBet: 10 } },
    sessions: {},
    chatMessages: [],
    platform: { mode: "virtual-credits", cashFeaturesEnabled: false }
  };

  store.saveSnapshot(JSON.stringify(data));
  const loaded = store.load();
  assert("the snapshot round-trips", loaded?.users?.[0]?.username === "a" && loaded?.bets?.[0]?.id === "b1");
  assert("balances survive", loaded.users[0].balance === 100);

  // The queryable tables lag the snapshot on purpose; refreshing catches them up.
  store.refreshIndexes(data);
  store.checkpoint();
  const after = store.load();
  assert("refreshing the index tables leaves the snapshot intact", after.users[0].username === "a");

  data.users[0].balance = 250;
  store.saveSnapshot(JSON.stringify(data));
  assert("a later save overwrites the previous snapshot", store.load().users[0].balance === 250);

  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${failed === 0 ? "All persistence checks passed." : `${failed} persistence check(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
