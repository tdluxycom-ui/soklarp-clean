#!/usr/bin/env node
/**
 * Proves that every mini-game bet returns less than it stakes.
 *
 * Each game's outcome space is enumerated exactly (dice, reels, cards) or read
 * from its weight table, so this runs in milliseconds and needs no server and
 * no random sampling. It exists because four bets used to pay more than they
 * took — horse racing on any horse, hi-lo "triple", every mines cash-out, and a
 * xiên slip of repeated numbers — and the previous smoke test only ever checked
 * that the endpoints answered `success: true`.
 *
 * Usage: node scripts/test-odds.mjs
 */

import {
  COINFLIP_RATE,
  HILO_RATES,
  SLOT_RATES,
  DRAGON_TIGER_RATES,
  POKDENG_RATES,
  WHEEL_SEGMENTS,
  PLINKO_BUCKETS,
  HORSES,
  COIN_PUSHER_OUTCOMES,
  DUCK_OUTCOMES,
  MINES_MIN_BOMBS,
  MINES_MAX_BOMBS,
  MINES_TILES,
  minesRate,
  minesSurvivalProbability
} from "../lib/game-odds.mjs";
import { generateCrashPoint } from "../lib/crash-math.mjs";
import { parseXienNumbers } from "../lib/bet-numbers.mjs";
import { createLotteryEngine } from "../lib/lottery-settle.mjs";

const FLOAT_SLACK = 1e-9;

let failed = 0;
const rows = [];

/** Records a bet's return-to-player and fails the run if the house is losing. */
function checkReturn(game, bet, ret) {
  const ok = Number.isFinite(ret) && ret > 0 && ret <= 1 + FLOAT_SLACK;
  if (!ok) failed += 1;
  rows.push({ game, bet, ret, ok });
}

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Return of a weighted table where each entry pays `mult` (or `rate`). */
function tableReturn(table) {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  return table.reduce((sum, e) => sum + (e.weight / total) * (e.mult ?? e.rate), 0);
}

// ── Coin flip: one fair coin ──────────────────────────────────────────────────
checkReturn("coinflip", "head/tail", 0.5 * COINFLIP_RATE);

// ── Hi-Lo: all 216 rolls of three dice ───────────────────────────────────────
{
  const totals = new Map();
  let triples = 0;
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      for (let c = 1; c <= 6; c++) {
        const sum = a + b + c;
        totals.set(sum, (totals.get(sum) || 0) + 1);
        if (a === b && b === c) triples += 1;
      }
    }
  }
  const rolls = 216;
  const ways = (predicate) => [...totals.entries()]
    .filter(([sum]) => predicate(sum))
    .reduce((sum, [, count]) => sum + count, 0);

  const lowWays = ways((s) => s <= 10);
  const highWays = ways((s) => s >= 12);
  const elevenWays = ways((s) => s === 11);

  checkReturn("hilo", "low 3-10", (lowWays / rolls) * HILO_RATES.low);
  checkReturn("hilo", "high 12-18", (highWays / rolls) * HILO_RATES.high);
  checkReturn("hilo", "exactly 11", (elevenWays / rolls) * HILO_RATES.hilo11);
  checkReturn("hilo", "triple", (triples / rolls) * HILO_RATES.triple);

  console.log("\nHi-Lo high/low symmetry");
  const lowReturn = (lowWays / rolls) * HILO_RATES.low;
  const highReturn = (highWays / rolls) * HILO_RATES.high;
  assert(
    "high and low return within 1 point of each other",
    Math.abs(lowReturn - highReturn) < 0.01,
    `low ${lowReturn.toFixed(4)} vs high ${highReturn.toFixed(4)}`
  );
}

// ── Lucky wheel and the other weighted tables ────────────────────────────────
checkReturn("wheel", "spin", tableReturn(WHEEL_SEGMENTS));
checkReturn("plinko", "drop", tableReturn(PLINKO_BUCKETS));
checkReturn("coinpusher", "push", tableReturn(COIN_PUSHER_OUTCOMES));
checkReturn("duckshooter", "shot", tableReturn(DUCK_OUTCOMES));

// ── Horse racing: each horse is its own bet ──────────────────────────────────
{
  const totalWeight = HORSES.reduce((sum, h) => sum + h.weight, 0);
  for (const horse of HORSES) {
    checkReturn("horseracing", `horse ${horse.id}`, (horse.weight / totalWeight) * horse.mult);
  }
}

// ── Slot 777: all 216 reel combinations ──────────────────────────────────────
{
  const symbols = ["7", "DIA", "STAR", "BELL", "CHERRY", "LEMON"];
  let paid = 0;
  let spins = 0;
  for (const r1 of symbols) {
    for (const r2 of symbols) {
      for (const r3 of symbols) {
        spins += 1;
        if (r1 === "7" && r2 === "7" && r3 === "7") paid += SLOT_RATES.triple7;
        else if (r1 === "DIA" && r2 === "DIA" && r3 === "DIA") paid += SLOT_RATES.tripleDiamond;
        else if (r1 === r2 && r2 === r3) paid += SLOT_RATES.tripleOther;
        else if (r1 === r2 || r2 === r3 || r1 === r3) paid += SLOT_RATES.pair;
      }
    }
  }
  checkReturn("slot", "spin", paid / spins);
}

// ── Dragon vs Tiger: 13 x 13 ranks, suits do not score ───────────────────────
{
  let sideWins = 0;
  let ties = 0;
  for (let d = 1; d <= 13; d++) {
    for (let t = 1; t <= 13; t++) {
      if (d > t) sideWins += 1;
      else if (d === t) ties += 1;
    }
  }
  const hands = 169;
  checkReturn("dragontiger", "dragon/tiger", (sideWins / hands) * DRAGON_TIGER_RATES.side);
  checkReturn("dragontiger", "tie", (ties / hands) * DRAGON_TIGER_RATES.tie);
}

// ── Pok Deng: two cards each, scores are (c1 + c2) mod 10 ────────────────────
{
  let paid = 0;
  let hands = 0;
  for (let p1 = 1; p1 <= 10; p1++) {
    for (let p2 = 1; p2 <= 10; p2++) {
      const pScore = (p1 + p2) % 10;
      for (let d1 = 1; d1 <= 10; d1++) {
        for (let d2 = 1; d2 <= 10; d2++) {
          hands += 1;
          const dScore = (d1 + d2) % 10;
          if (pScore > dScore) {
            paid += pScore >= 8 ? POKDENG_RATES.winPok : POKDENG_RATES.win;
          }
        }
      }
    }
  }
  checkReturn("pokdeng", "player", paid / hands);
}

// ── Mines: every mine count crossed with every cash-out point ────────────────
{
  let worstReturn = 0;
  let worstLabel = "";
  for (let bombs = MINES_MIN_BOMBS; bombs <= MINES_MAX_BOMBS; bombs++) {
    const safeTiles = MINES_TILES - bombs;
    let previousRate = 0;
    for (let opened = 1; opened <= safeTiles; opened++) {
      const rate = minesRate(opened, bombs);
      const ret = minesSurvivalProbability(opened, bombs) * rate;
      if (ret > worstReturn) {
        worstReturn = ret;
        worstLabel = `${bombs} mines, ${opened} tiles`;
      }
      if (rate < previousRate) {
        failed += 1;
        console.log(`  FAIL mines rate fell at ${bombs} mines / ${opened} tiles`);
      }
      previousRate = rate;
    }
  }
  checkReturn("mines", `best cash-out (${worstLabel})`, worstReturn);
}

// ── Crash: fixed cash-out targets over the whole random range ────────────────
{
  const STEPS = 200_000;
  let worstReturn = 0;
  let worstTarget = 0;
  for (const target of [1.1, 1.2, 1.5, 2, 3, 5, 10, 25, 50, 150]) {
    let survived = 0;
    for (let i = 0; i < STEPS; i++) {
      if (generateCrashPoint((i + 0.5) / STEPS) >= target) survived += 1;
    }
    const ret = (survived / STEPS) * target;
    if (ret > worstReturn) {
      worstReturn = ret;
      worstTarget = target;
    }
  }
  checkReturn("crash", `best fixed target (x${worstTarget})`, worstReturn);
}

// ── Xiên slips must carry distinct numbers to be priced as xiên ──────────────
console.log("\nXiên slip validation");
assert("xien2 rejects a repeated number", !parseXienNumbers("xien2", "12,12").ok);
assert("xien3 rejects a repeated number", !parseXienNumbers("xien3", "12,12,34").ok);
assert("xien4 rejects a repeated number", !parseXienNumbers("xien4", "12,12,12,12").ok);
assert("xien2 accepts two distinct numbers", parseXienNumbers("xien2", "12,34").ok);
assert("xien4 accepts four distinct numbers", parseXienNumbers("xien4", "12,34,56,78").ok);
assert("xien3 rejects too few numbers", !parseXienNumbers("xien3", "12,34").ok);

// ── Settling a xiên slip that an older build would have accepted ─────────────
console.log("\nSettling malformed xiên slips");
{
  // Special prize 12345 puts "45" in the prize set, so a slip of repeated 45s
  // would have won at the xiên rate under the old settle logic.
  const prizes = {
    db: "12345", nhat: "54321",
    nhi: ["11111", "22222"],
    ba: ["33333", "44444", "55555", "66666", "77777", "88888"],
    tu: ["1234", "2345", "3456", "4567"],
    nam: ["5678", "6789", "7890", "8901", "9012", "0123"],
    sau: ["123", "234", "345"],
    bay: ["45", "56", "67", "78"]
  };
  const db = {
    users: [{ username: "p", balance: 1000 }],
    lotteries: {
      vnfast: {
        id: "vnfast", type: "vietlottery", interval: 300, drawCounter: 1,
        nextDrawId: "VNFAST-TEST", lastResults: [], settings: { autoDraw: true }
      }
    },
    bets: [
      { id: "repeat", username: "p", lotteryType: "vnfast", drawId: "VNFAST-TEST", betType: "xien4", numbers: "45,45,45,45", amount: 100, rate: 55, status: "pending", payout: 0 },
      { id: "valid", username: "p", lotteryType: "vnfast", drawId: "VNFAST-TEST", betType: "xien2", numbers: "45,56", amount: 100, rate: 12, status: "pending", payout: 0 },
      { id: "losing", username: "p", lotteryType: "vnfast", drawId: "VNFAST-TEST", betType: "xien2", numbers: "45,99", amount: 100, rate: 12, status: "pending", payout: 0 }
    ]
  };

  const engine = createLotteryEngine({
    getDb: () => db,
    drawingLocks: new Set(),
    saveDb: async () => {},
    calculateSecondsUntil: () => 300,
    didDrawToday: () => false,
    generateVNPrizes: () => prizes,
    generateNextDrawId: () => {},
    fetchXSMBResults: async () => null,
    fetchLaosResults: async () => null
  });

  await engine.resolveVNDraw("vnfast", prizes);

  const bet = (id) => db.bets.find((b) => b.id === id);
  assert(
    "a repeated-number slip is voided rather than paid",
    bet("repeat").status === "cancelled" && bet("repeat").payout === 0,
    `status ${bet("repeat").status}, payout ${bet("repeat").payout}`
  );
  assert(
    "a valid xien2 on two drawn endings wins",
    bet("valid").status === "won" && bet("valid").payout === 1200,
    `status ${bet("valid").status}, payout ${bet("valid").payout}`
  );
  assert(
    "a xien2 with one missed ending loses",
    bet("losing").status === "lost" && bet("losing").payout === 0,
    `status ${bet("losing").status}, payout ${bet("losing").payout}`
  );
  // Stakes were already deducted when the slips were placed, so settling adds
  // back the 100 voided stake and the 1200 payout: 1000 + 100 + 1200.
  assert(
    "the voided stake is returned and the winner is paid",
    db.users[0].balance === 2300,
    `balance ${db.users[0].balance}`
  );
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("\nReturn to player per bet (must stay below 1.0)");
const gameWidth = Math.max(...rows.map((r) => r.game.length));
const betWidth = Math.max(...rows.map((r) => r.bet.length));
for (const row of rows) {
  const edge = ((1 - row.ret) * 100).toFixed(2);
  console.log(
    `  ${row.ok ? "ok  " : "FAIL"} ${row.game.padEnd(gameWidth)}  ${row.bet.padEnd(betWidth)}  ` +
    `RTP ${row.ret.toFixed(4)}  house ${edge.padStart(6)}%`
  );
}

console.log(`\n${failed === 0 ? "All odds checks passed." : `${failed} odds check(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
