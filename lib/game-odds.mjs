/**
 * Payout tables and odds math for every mini game.
 *
 * Everything that decides how much a win pays lives here so that
 * scripts/test-odds.mjs can enumerate each game and assert that no single bet
 * returns more than it stakes. Four bets used to be profitable for the player
 * (horse racing on any horse, hi-lo "triple", mines by re-opening one tile,
 * and a xiên slip built from repeated numbers); keeping the numbers next to the
 * test that checks them is what stops that happening again.
 *
 * "Return" below always means expected credits returned per credit staked, so
 * a fair coin toss with no house cut would be 1.0 and every entry must be < 1.
 */

/** Weighted pick shared by every table-driven game. `rngFloat` must be in [0, 1). */
export function pickWeighted(table, rngFloat) {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let remaining = Math.max(0, Math.min(0.999999999, Number(rngFloat) || 0)) * total;
  for (const entry of table) {
    remaining -= entry.weight;
    if (remaining < 0) return entry;
  }
  return table[table.length - 1];
}

export const COINFLIP_RATE = 1.92;

/**
 * Three dice. "low" covers 3–10 (108 of 216 rolls) and "high" covers 12–18
 * (81 of 216), so they cannot share one rate: paying both 1.95 returned 0.975
 * on low but only 0.731 on high, and nobody had a reason to bet high.
 * "triple" paid 40 against a 6/216 chance, i.e. 1.111 back to the player.
 */
export const HILO_RATES = {
  low: 1.95,
  high: 2.6,
  hilo11: 6.0,
  triple: 33
};

export const SLOT_RATES = {
  triple7: 40,
  tripleDiamond: 20,
  tripleOther: 6,
  pair: 1.4
};

export const DRAGON_TIGER_RATES = {
  side: 1.95,
  tie: 8.0
};

export const POKDENG_RATES = {
  win: 1.9,
  winPok: 2.0
};

export const WHEEL_SEGMENTS = [
  { label: "x0", rate: 0, weight: 20, color: "#64748b" },
  { label: "x0.5", rate: 0.5, weight: 40, color: "#94a3b8" },
  { label: "x1.0", rate: 1.0, weight: 22, color: "#38bdf8" },
  { label: "x1.5", rate: 1.5, weight: 10, color: "#4ade80" },
  { label: "x2.5", rate: 2.5, weight: 5, color: "#facc15" },
  { label: "x5.0", rate: 5.0, weight: 2.5, color: "#fb923c" },
  { label: "x15.0", rate: 15.0, weight: 0.5, color: "#d4af37" }
];

/**
 * Seven buckets fed by a six-row peg board, so the weights are the binomial
 * coefficients the animated ball actually follows. The old cascading
 * thresholds sent 55% of balls to the centre and returned 0.693 despite the
 * comment claiming 0.92.
 */
export const PLINKO_BUCKETS = [
  { slot: 0, mult: 8.0, label: "x8", weight: 1 },
  { slot: 1, mult: 1.5, label: "x1.5", weight: 6 },
  { slot: 2, mult: 0.7, label: "x0.7", weight: 15 },
  { slot: 3, mult: 0.2, label: "x0.2", weight: 20 },
  { slot: 4, mult: 0.7, label: "x0.7", weight: 15 },
  { slot: 5, mult: 1.5, label: "x1.5", weight: 6 },
  { slot: 6, mult: 8.0, label: "x8", weight: 1 }
];

/**
 * Multipliers are 0.96 / win chance. They used to be 2.8 / 4.5 / 7 / 14
 * against 40/30/20/10 chances, which returned 1.12 to 1.40 on every horse.
 */
export const HORSES = [
  { id: 1, name: "Horse No.1", mult: 2.4, weight: 40 },
  { id: 2, name: "Horse No.2", mult: 3.2, weight: 30 },
  { id: 3, name: "Horse No.3", mult: 4.8, weight: 20 },
  { id: 4, name: "Horse No.4", mult: 9.6, weight: 10 }
];

export const COIN_PUSHER_OUTCOMES = [
  { label: "0 coins", mult: 0, weight: 30 },
  { label: "1 coin", mult: 0.4, weight: 30 },
  { label: "2 coins", mult: 0.9, weight: 22 },
  { label: "4 coins", mult: 1.8, weight: 13 },
  { label: "8 coins", mult: 4.0, weight: 4 },
  { label: "Jackpot", mult: 12.0, weight: 1 }
];

export const DUCK_OUTCOMES = [
  { label: "Miss", mult: 0, weight: 45 },
  { label: "Bronze duck", mult: 0.5, weight: 27 },
  { label: "Silver duck", mult: 1.5, weight: 20 },
  { label: "Gold duck", mult: 3.5, weight: 7 },
  { label: "Crystal duck", mult: 10.0, weight: 1 }
];

export const MINES_TILES = 25;
export const MINES_MIN_BOMBS = 1;
/** Matches the options offered by #mines-count-select in the lobby. */
export const MINES_MAX_BOMBS = 15;
export const MINES_HOUSE_EDGE = 0.02;
/** Caps the six-figure multipliers the tail of the curve would otherwise produce. */
export const MINES_MAX_RATE = 5000;

export function clampMinesBombs(bombs) {
  const count = Math.floor(Number(bombs));
  if (!Number.isFinite(count)) return 3;
  return Math.min(Math.max(count, MINES_MIN_BOMBS), MINES_MAX_BOMBS);
}

/** Chance of opening `safeRevealed` distinct tiles without hitting a mine. */
export function minesSurvivalProbability(safeRevealed, bombs) {
  const bombCount = clampMinesBombs(bombs);
  const safeTiles = MINES_TILES - bombCount;
  const opened = Math.max(0, Math.min(Math.floor(Number(safeRevealed) || 0), safeTiles));
  let probability = 1;
  for (let i = 0; i < opened; i++) {
    probability *= (safeTiles - i) / (MINES_TILES - i);
  }
  return probability;
}

/**
 * Fair odds for the tiles opened so far, less the house edge. The previous
 * `1 + safe * 0.25 * (bombs / 2)` curve returned more than the stake from the
 * very first tile (1.35 at ten mines) and grew without bound once the same
 * tile could be opened twice.
 */
export function minesRate(safeRevealed, bombs) {
  const probability = minesSurvivalProbability(safeRevealed, bombs);
  if (probability <= 0) return MINES_MAX_RATE;
  const fair = (1 - MINES_HOUSE_EDGE) / probability;
  return Number(Math.min(MINES_MAX_RATE, Math.max(1, fair)).toFixed(2));
}
