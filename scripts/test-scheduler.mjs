#!/usr/bin/env node
/**
 * Checks that the draw scheduler's clock reports real elapsed time rather than
 * a count of timer callbacks, which is what made every countdown run slow.
 *
 * Usage: node scripts/test-scheduler.mjs
 */

import { createTickClock } from "../lib/tick-clock.mjs";

let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const T0 = 1_700_000_000_000;

console.log("\nSteady one-second callbacks");
{
  const clock = createTickClock(T0);
  let total = 0;
  for (let i = 1; i <= 600; i++) total += clock.elapsedSeconds(T0 + i * 1000);
  assert("600 punctual callbacks report 600 seconds", total === 600, `got ${total}`);
}

console.log("\nLate callbacks");
{
  const clock = createTickClock(T0);
  assert("a callback 2.5s late reports 2 seconds", clock.elapsedSeconds(T0 + 2500) === 2);
  assert("the leftover 0.5s lands on the next callback", clock.elapsedSeconds(T0 + 3000) === 1);
}

console.log("\nNo time is lost to rounding");
{
  // A timer that consistently fires 400 ms late is the case that used to bleed
  // a countdown dry: one second was subtracted for every 1.4 s that passed.
  const clock = createTickClock(T0);
  let reported = 0;
  const TICKS = 1000;
  for (let i = 1; i <= TICKS; i++) reported += clock.elapsedSeconds(T0 + i * 1400);
  const actual = Math.floor((TICKS * 1400) / 1000);
  assert(
    `1000 callbacks 400ms late report ${actual}s, not ${TICKS}s`,
    reported === actual,
    `got ${reported}`
  );

  // What the old scheduler would have done, for contrast.
  const drift = actual - TICKS;
  assert(
    "the old one-per-callback approach would have been 400s behind",
    drift === 400,
    `drift ${drift}`
  );
}

console.log("\nIrregular callbacks");
{
  const clock = createTickClock(T0);
  const gaps = [900, 1100, 1500, 700, 3300, 200, 1000, 4000, 100, 1200];
  let now = T0;
  let reported = 0;
  for (const gap of gaps) {
    now += gap;
    reported += clock.elapsedSeconds(now);
  }
  const actual = Math.floor(gaps.reduce((a, b) => a + b, 0) / 1000);
  assert(`jittery gaps still total ${actual}s`, reported === actual, `got ${reported}`);
}

console.log("\nStalls and clock corrections");
{
  const clock = createTickClock(T0);
  clock.elapsedSeconds(T0 + 1000);
  assert(
    "a 30 minute stall is reported in full so the draw fires at once",
    clock.elapsedSeconds(T0 + 1000 + 30 * 60 * 1000) === 1800
  );
}
{
  const clock = createTickClock(T0);
  assert("a clock stepped backwards reports no elapsed time", clock.elapsedSeconds(T0 - 5000) === 0);
  assert(
    "and does not bank the correction against later callbacks",
    clock.elapsedSeconds(T0 - 5000 + 1000) === 1
  );
}

console.log("\nA countdown reaches zero on time");
{
  // 300s room, timer consistently 250 ms late, as it is under load.
  const clock = createTickClock(T0);
  let countdown = 300;
  let now = T0;
  let callbacks = 0;
  while (countdown > 0) {
    now += 1250;
    callbacks += 1;
    countdown = Math.max(0, countdown - clock.elapsedSeconds(now));
  }
  const wallSeconds = (now - T0) / 1000;
  assert(
    `a 300s countdown ends after ${wallSeconds}s of real time`,
    Math.abs(wallSeconds - 300) <= 1.25,
    `took ${wallSeconds}s over ${callbacks} callbacks`
  );
  assert(
    "the old approach would have needed 375s of real time",
    Math.abs(300 * 1.25 - 375) < 0.01
  );
}

console.log(`\n${failed === 0 ? "All scheduler checks passed." : `${failed} scheduler check(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
