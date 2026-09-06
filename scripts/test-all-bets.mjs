// Full bet-coverage test: every lottery room x every bet type, every mini game.
// Usage: node scripts/test-all-bets.mjs [baseUrl] [username] [password]
const BASE = process.argv[2] || "http://localhost:59617";
const USERNAME = process.argv[3] || "checktest";
const PASSWORD = process.argv[4] || "CheckTest12345";

let token = "";
let passed = 0, failed = 0;
const failures = [];

function record(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; failures.push(`${name}: ${detail}`); console.log(`  ❌ ${name} → ${detail}`); }
}

async function api(path, method = "GET", body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

console.log(`\n🎯 Testing ${BASE}\n`);

{
  await api("/api/auth/register", "POST", { username: USERNAME, password: PASSWORD, nickname: "Check" });
  const r = await api("/api/auth/login", "POST", { username: USERNAME, password: PASSWORD });
  token = r.data?.token;
  record("login", !!token, JSON.stringify(r.data));
}

// ── Lotteries state ──
const lotteries = {};
{
  const r = await api("/api/lotteries");
  for (const l of r.data?.lotteries || []) lotteries[l.id] = l;
  console.log(`\n📋 Rooms: ${Object.keys(lotteries).join(", ")}`);
  record("GET /api/lotteries", Object.keys(lotteries).length >= 8, JSON.stringify(r.data));
}

// ── Thai-style lottery bets (6 types each) ──
console.log("\n🎰 Thai-style rooms (/api/user/bet)");
const thaiTypes = [
  ["3top", "123"], ["3toad", "321"], ["2top", "45"], ["2bottom", "67"],
  ["run_top", "8"], ["run_bottom", "9"]
];
for (const room of ["yeekee3", "yeekee30", "hanoi", "laos"]) {
  const l = lotteries[room];
  if (!l) { record(`${room}: room exists`, false, "missing from /api/lotteries"); continue; }
  const bets = thaiTypes.map(([betType, numbers]) => ({ betType, numbers, amount: 10 }));
  const r = await api("/api/user/bet", "POST", { lotteryType: room, drawId: l.nextDrawId, bets });
  record(`${room}: all 6 bet types in one ticket`, r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}

// ── Vietnamese lottery bets (8 types each) ──
console.log("\n🇻🇳 VN rooms (/api/user/vnbet)");
const vnTypes = [
  ["lo", "12"], ["de", "34"], ["3cang", "567"], ["dau", "7"],
  ["duoi", "8"], ["xien2", "11,22"], ["xien3", "11,22,33"], ["xien4", "11,22,33,44"]
];
for (const room of ["vnfast", "vnmb", "vnmn", "vnmt"]) {
  const l = lotteries[room];
  if (!l) { record(`${room}: room exists`, false, "missing"); continue; }
  for (const [betType, numbers] of vnTypes) {
    const r = await api("/api/user/vnbet", "POST", { lotteryId: room, drawId: l.nextDrawId, betType, numbers, amount: 10 });
    record(`${room}: ${betType}`, r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
  }
}

// ── Mini games ──
console.log("\n🎲 Mini games (/api/games/*)");
{
  const r = await api("/api/games/coinflip", "POST", { betOn: "head", amount: 10 });
  record("coinflip", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/hilo", "POST", { betType: "high", amount: 10 });
  record("hilo", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/wheel", "POST", { amount: 10 });
  record("wheel", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/dragontiger", "POST", { betType: "dragon", amount: 10 });
  record("dragontiger", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/slot", "POST", { amount: 10 });
  record("slot", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{ // mines: start → reveal → cashout
  const s = await api("/api/games/mines", "POST", { action: "start", amount: 10, bombsCount: 3 });
  record("mines: start", s.data?.success === true, `HTTP ${s.status} ${JSON.stringify(s.data)}`);
  const rev = await api("/api/games/mines", "POST", { action: "reveal", tileIndex: 0 });
  record("mines: reveal", rev.data?.success === true, `HTTP ${rev.status} ${JSON.stringify(rev.data)}`);
  if (!rev.data?.isBomb) {
    const co = await api("/api/games/mines", "POST", { action: "cashout" });
    record("mines: cashout", co.data?.success === true, `HTTP ${co.status} ${JSON.stringify(co.data)}`);
  } else {
    console.log("  ℹ️ mines: hit bomb on reveal, cashout skipped (valid)");
  }
}
{
  const r = await api("/api/games/plinko", "POST", { amount: 10 });
  record("plinko", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const start = await api("/api/games/crash", "POST", { action: "start", amount: 10 });
  record("crash start", start.data?.success === true, `HTTP ${start.status} ${JSON.stringify(start.data)}`);
  const cash = await api("/api/games/crash", "POST", { action: "cashout" });
  record("crash cashout", cash.data?.success === true, `HTTP ${cash.status} ${JSON.stringify(cash.data)}`);
}
{
  const r = await api("/api/games/coinpusher", "POST", { amount: 10 });
  record("coinpusher", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/pokdeng", "POST", { amount: 10 });
  record("pokdeng", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/horseracing", "POST", { amount: 10, selectedHorse: 1 });
  record("horseracing", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await api("/api/games/duckshooter", "POST", { amount: 10 });
  record("duckshooter", r.data?.success === true, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
}

// ── History & balance sanity ──
{
  const r = await api("/api/user/bets");
  const mine = (r.data?.bets || []).filter(b => b.username === USERNAME);
  record("GET /api/user/bets records all games", mine.length >= 20, `only ${mine.length} bets`);
  const pending = mine.filter(b => b.status === "pending");
  console.log(`\n📊 Bets recorded: ${mine.length} (pending: ${pending.length})`);
  const r2 = await api("/api/user/profile");
  console.log(`💰 Balance after tests: ${r2.data?.user?.balance}`);
  record("balance is a finite number >= 0", Number.isFinite(r2.data?.user?.balance) && r2.data.user.balance >= 0, JSON.stringify(r2.data));
}

console.log(`\n${"═".repeat(50)}`);
console.log(`✅ PASSED: ${passed}   ❌ FAILED: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(`  - ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
