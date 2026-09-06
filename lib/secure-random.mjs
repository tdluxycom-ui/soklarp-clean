import crypto from "node:crypto";

export function secureRandomInt(maxExclusive) {
  return crypto.randomInt(0, maxExclusive);
}

export function secureRandomFloat() {
  return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
}
