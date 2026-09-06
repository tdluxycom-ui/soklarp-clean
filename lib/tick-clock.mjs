/**
 * Turns irregular timer callbacks into an exact count of elapsed whole seconds.
 *
 * The draw scheduler subtracted one second per `setInterval` callback, but a
 * 1000 ms interval does not fire every 1000 ms: garbage collection, a blocking
 * disk write or a throttled container all delay it, and the delay is never
 * given back. Every room's countdown therefore ran behind the wall clock and
 * its draw fired late, by more the longer the server stayed up.
 *
 * Recomputing each countdown from the clock instead is not an option for the
 * daily rooms: `calculateSecondsUntil` rolls over to tomorrow the moment draw
 * time passes, so a per-tick recompute would re-arm the countdown before the
 * draw branch could ever run — which is a bug this codebase already had once.
 * Reporting how much real time passed keeps that state machine intact.
 *
 * Leftover milliseconds are carried, so nothing is lost to rounding however
 * uneven the callbacks are.
 */
export function createTickClock(startedAt = Date.now()) {
  let lastAt = startedAt;
  let carryMs = 0;

  return {
    /** Whole seconds since the previous call, keeping the remainder for the next. */
    elapsedSeconds(now = Date.now()) {
      // A clock stepped backwards, say by an NTP correction, must never rewind
      // a countdown; treat it as no time having passed.
      const deltaMs = Math.max(0, now - lastAt) + carryMs;
      lastAt = now;
      const seconds = Math.floor(deltaMs / 1000);
      carryMs = deltaMs - seconds * 1000;
      return seconds;
    }
  };
}
