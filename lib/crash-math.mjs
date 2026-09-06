/** Exponential crash curve. Same constant must be used on the client. */
export const CRASH_GROWTH = 0.00008;

export function crashMultiplier(elapsedMs) {
  const t = Math.max(0, Number(elapsedMs) || 0);
  return Math.max(1, Math.exp(CRASH_GROWTH * t));
}

export function generateCrashPoint(rngFloat) {
  const e = 100;
  const h = Math.max(0, Math.min(0.999999, Number(rngFloat) || 0)) * e;
  let crashPoint = Number((((100 * e - h) / (e - h)) / 100).toFixed(2));
  if (crashPoint < 1.01) crashPoint = 1.01;
  if (crashPoint > 150) crashPoint = 150;
  return crashPoint;
}
