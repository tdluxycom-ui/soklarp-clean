/** Exponential crash curve. Same constant must be used on the client. */
export const CRASH_GROWTH = 0.00008;

export function crashMultiplier(elapsedMs) {
  const t = Math.max(0, Number(elapsedMs) || 0);
  return Math.max(1, Math.exp(CRASH_GROWTH * t));
}

/** One round in this many busts at 1.00, which is where the house edge comes from. */
export const CRASH_INSTANT_BUST_ODDS = 101;
export const CRASH_MAX_POINT = 150;

/**
 * The 1/x crash curve, mapping a uniform [0, 1) draw to a bust multiplier.
 *
 * The curve on its own pays back almost exactly the stake at every cash-out
 * target, so the instant-bust branch below is what makes the game profitable.
 * Two earlier details quietly handed the edge back to the player: rounding the
 * multiplier with `toFixed(2)` moved the win threshold half a cent in their
 * favour, and clamping the low tail up to 1.01 turned guaranteed busts into
 * wins. Cashing out at 1.10 every round returned 1.0037 per credit staked.
 * Truncating instead of rounding keeps every remaining fraction with the house.
 */
export function generateCrashPoint(rngFloat) {
  const draw = Math.max(0, Math.min(0.999999999, Number(rngFloat) || 0));
  if (draw < 1 / CRASH_INSTANT_BUST_ODDS) return 1;

  // Re-spread the surviving draws back over [0, 1) so the curve keeps its shape.
  const e = 100;
  const h = ((draw - 1 / CRASH_INSTANT_BUST_ODDS) / (1 - 1 / CRASH_INSTANT_BUST_ODDS)) * e;
  const crashPoint = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.min(CRASH_MAX_POINT, Math.max(1, crashPoint));
}
