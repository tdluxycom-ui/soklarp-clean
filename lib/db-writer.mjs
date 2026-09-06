/**
 * Coalesces repeated "save the database" requests into a bounded number of
 * writes.
 *
 * The whole database is one in-memory object that gets serialised from scratch
 * on every save, and every play used to await that write before its response
 * was sent. Because the saves ran through a promise chain, a burst of plays
 * queued one full write each and the last player in the burst waited behind all
 * of them. Marking the state dirty instead lets a burst collapse into a single
 * write of the newest state.
 *
 * The trade is that up to `intervalMs` of updates are lost if the process dies
 * without running `flush`. That is the durability the store already offers —
 * SQLite runs with `synchronous = NORMAL`, which may drop recent commits on
 * power loss — so callers that cannot accept it (creating an account, moving
 * credit) should await `flush` rather than `markDirty`.
 */
export function createCoalescingWriter({ write, intervalMs = 200, onError = () => {} }) {
  let dirty = false;
  let inFlight = null;
  let timer = null;

  function startWrite() {
    dirty = false;
    inFlight = Promise.resolve()
      .then(write)
      .catch(onError)
      .finally(() => {
        inFlight = null;
        // A save requested while this one was running still needs to land.
        if (dirty) schedule();
      });
    return inFlight;
  }

  function schedule() {
    if (timer || inFlight) return;
    timer = setTimeout(() => {
      timer = null;
      startWrite();
    }, intervalMs);
    // Never hold the process open just for a pending save.
    timer.unref?.();
  }

  return {
    /** Notes that the database changed and makes sure a write is coming. */
    markDirty() {
      dirty = true;
      schedule();
    },

    /** Writes any outstanding change now and resolves once nothing is pending. */
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // Two passes cover the case where a write was already running when
      // flush was called and the newest state still has to follow it.
      for (let pass = 0; pass < 8 && (dirty || inFlight); pass++) {
        if (inFlight) await inFlight;
        else await startWrite();
      }
    },

    get pending() {
      return dirty || inFlight !== null;
    }
  };
}
