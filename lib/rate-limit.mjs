/**
 * Fixed-window counters for abuse limits.
 *
 * Replaces two bare Maps that were never pruned, so every address that ever
 * touched the server kept an entry for the lifetime of the process.
 */

/** Stops one busy key from crowding out the rest if a sweep falls behind. */
const DEFAULT_MAX_KEYS = 50_000;

export function createRateLimiter({ windowMs, max, maxKeys = DEFAULT_MAX_KEYS }) {
  const hits = new Map();

  function evictExpired(now) {
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }

  function enforceCapacity(now) {
    if (hits.size <= maxKeys) return;
    evictExpired(now);
    // Map iterates in insertion order, so the oldest windows go first.
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) break;
      hits.delete(key);
    }
  }

  return {
    /** True while another event for `key` would stay within the window's cap. */
    allows(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) return true;
      return entry.count < max;
    },

    /** Records one event for `key` and reports whether it was within the cap. */
    hit(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        enforceCapacity(now);
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },

    /** Whole seconds until `key`'s window resets, for a Retry-After header. */
    retryAfterSeconds(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) return 0;
      return Math.ceil((entry.resetAt - now) / 1000);
    },

    sweep(now = Date.now()) {
      evictExpired(now);
    },

    get size() {
      return hits.size;
    }
  };
}
