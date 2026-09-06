#!/usr/bin/env node
/**
 * Unit checks for the input handling and abuse limits that protect the admin
 * panel and the sign-in endpoint. Pure functions only, no server needed.
 *
 * Usage: node scripts/test-security.mjs
 */

import { sanitizeNickname, sanitizeChatText, escapeHtml } from "../lib/sanitize.mjs";
import { createRateLimiter } from "../lib/rate-limit.mjs";
import { repairUserNicknames } from "../lib/room-catalog.mjs";

let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\nNickname sanitising");
assert("strips a script tag", sanitizeNickname("<script>bad()</script>") === "bad()");
assert("strips an image handler payload", sanitizeNickname('<img src=x onerror=alert(1)>') === "");
assert("strips control characters", sanitizeNickname("ab\u0000\u001fcd") === "abcd");
assert("collapses runs of whitespace", sanitizeNickname("Nguyen  Van   A") === "Nguyen Van A");
assert("caps the length at 40", sanitizeNickname("a".repeat(60)).length === 40);
assert("keeps Vietnamese diacritics", sanitizeNickname("Trần Thị B") === "Trần Thị B");
assert("keeps an apostrophe, which belongs in real names", sanitizeNickname("O'Brien") === "O'Brien");
assert("returns empty for whitespace only", sanitizeNickname("   ") === "");
assert("returns empty for null", sanitizeNickname(null) === "");

console.log("\nStored nicknames are cleaned on load");
{
  const users = [
    { username: "victim", nickname: "<img src=x onerror=alert(1)>" },
    { username: "normal", nickname: "Bình thường" },
    { username: "admin", nickname: "" }
  ];
  repairUserNicknames(users);
  assert(
    "a markup payload already in the database falls back to the username",
    users[0].nickname === "victim",
    `got ${JSON.stringify(users[0].nickname)}`
  );
  assert("an ordinary name is left alone", users[1].nickname === "Bình thường");
  assert("a blank admin name becomes Admin", users[2].nickname === "Admin");
}

console.log("\nEscaping");
assert(
  "escapes the five characters that matter in markup",
  escapeHtml(`<a href="x" title='y'>&`) === "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;"
);
assert("chat text keeps plain punctuation", sanitizeChatText("hello, world!") === "hello, world!");
assert("chat text drops tags", sanitizeChatText("<b>hi</b>") === "hi");

console.log("\nRate limiter");
{
  const limiter = createRateLimiter({ windowMs: 1000, max: 3 });
  const t = 1_000_000;
  assert("allows a fresh key", limiter.allows("a", t));
  assert("first hit is within the cap", limiter.hit("a", t));
  assert("second hit is within the cap", limiter.hit("a", t));
  assert("third hit is within the cap", limiter.hit("a", t));
  assert("no further hits are allowed once the cap is reached", !limiter.allows("a", t));
  assert("fourth hit reports over the cap", !limiter.hit("a", t));
  assert("a different key is unaffected", limiter.allows("b", t));
  assert("reports seconds until the window resets", limiter.retryAfterSeconds("a", t) === 1);
  assert("the key frees up once the window passes", limiter.allows("a", t + 1001));
  assert("retry-after is zero outside the window", limiter.retryAfterSeconds("a", t + 1001) === 0);
}

console.log("\nRate limiter housekeeping");
{
  const limiter = createRateLimiter({ windowMs: 1000, max: 5 });
  const t = 2_000_000;
  for (let i = 0; i < 500; i++) limiter.hit(`key-${i}`, t);
  assert("holds one entry per key", limiter.size === 500, `size ${limiter.size}`);
  limiter.sweep(t + 1001);
  assert("sweeping drops expired entries", limiter.size === 0, `size ${limiter.size}`);
}
{
  const limiter = createRateLimiter({ windowMs: 60_000, max: 5, maxKeys: 100 });
  const t = 3_000_000;
  for (let i = 0; i < 1000; i++) limiter.hit(`key-${i}`, t);
  assert(
    "stays within maxKeys even while every window is still open",
    limiter.size <= 100,
    `size ${limiter.size}`
  );
  assert("the most recent key survives eviction", !limiter.allows("key-999", t) === false);
}

console.log(`\n${failed === 0 ? "All security checks passed." : `${failed} security check(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
