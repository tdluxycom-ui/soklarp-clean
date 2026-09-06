/**
 * Shared parsing for the digit strings players submit on a bet slip.
 * Both the bet endpoint and the settle engine use these so a slip can never be
 * accepted under one set of rules and paid out under another.
 */

/** Right-aligned fixed-width digits, e.g. padLast("7", 2) === "07". */
export function padLast(value, len) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(len, "0").slice(-len);
}

/** How many distinct 2-digit numbers each xiên bet must carry. */
export const XIEN_SIZES = { xien2: 2, xien3: 3, xien4: 4 };

/**
 * A xiên wins only when every number on the slip appears in the prize set, so
 * repeating one number turns it into a plain lô bet — previously accepted and
 * then paid at the xiên rate (xien4 returned 13x the stake on average).
 * Requiring distinct numbers is what makes the advertised rate correct.
 */
export function parseXienNumbers(betType, raw) {
  const expected = XIEN_SIZES[betType];
  if (!expected) return { ok: false, reason: "type", expected: 0, numbers: [] };

  const numbers = String(raw ?? "")
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => padLast(part, 2));

  if (numbers.length !== expected) return { ok: false, reason: "count", expected, numbers };
  if (numbers.some((n) => n.length !== 2 || Number.isNaN(Number(n)))) {
    return { ok: false, reason: "digits", expected, numbers };
  }
  if (new Set(numbers).size !== expected) return { ok: false, reason: "duplicate", expected, numbers };

  return { ok: true, reason: "", expected, numbers };
}
