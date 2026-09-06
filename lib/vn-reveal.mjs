export const VN_REVEAL_KEYS = ["nhat", "nhi", "ba", "tu", "nam", "sau", "bay", "db"];
export const VN_FAST_REVEAL_MS = 90_000;
export const VN_REVEAL_HOLD_MS = 2_000;

export function revealedVnKeyCount(liveDraw, now = Date.now()) {
  if (!liveDraw) return 0;
  const started = Number(liveDraw.startedAt) || now;
  const duration = Number(liveDraw.durationMs) || VN_FAST_REVEAL_MS;
  const elapsed = Math.max(0, now - started);
  if (elapsed >= duration) return VN_REVEAL_KEYS.length;
  const mid = VN_REVEAL_KEYS.length - 1;
  return Math.min(mid, 1 + Math.floor(elapsed / (duration / mid)));
}

export function sliceVnPrizes(prizes, count) {
  const out = {};
  VN_REVEAL_KEYS.slice(0, count).forEach((key) => {
    if (prizes && prizes[key] != null) out[key] = prizes[key];
  });
  return out;
}

export function publicVnLiveDraw(liveDraw, now = Date.now()) {
  if (!liveDraw) return null;
  const duration = Number(liveDraw.durationMs) || VN_FAST_REVEAL_MS;
  const started = Number(liveDraw.startedAt) || now;
  const remainingMs = Math.max(0, started + duration - now);
  const count = revealedVnKeyCount(liveDraw, now);
  const keys = VN_REVEAL_KEYS.slice(0, count);
  return {
    drawId: liveDraw.drawId,
    startedAt: started,
    durationMs: duration,
    remainingMs,
    current: keys[keys.length - 1] || "nhat",
    done: remainingMs <= 0,
    prizes: sliceVnPrizes(liveDraw.prizes, count)
  };
}
