const base = "http://127.0.0.1:59617";
const rooms = await fetch(base + "/api/lotteries").then((r) => r.json());
const list = rooms.lotteries || rooms.data || rooms;
const rows = (Array.isArray(list) ? list : []).map((l) => ({
  id: l.id,
  type: l.type,
  countdown: l.countdown,
  nextDrawId: l.nextDrawId,
  autoDraw: l.settings?.autoDraw,
  interval: l.interval
}));
console.log(JSON.stringify(rows, null, 2));

const login = await fetch(base + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" })
}).then((r) => r.json());
const auth = { Authorization: "Bearer " + login.token, "Content-Type": "application/json" };

for (const l of list) {
  const body = l.type === "vietlottery"
    ? { lotteryId: l.id, drawId: l.nextDrawId, betType: "lo", numbers: "88", amount: 10 }
    : { lotteryType: l.id, drawId: l.nextDrawId, bets: [{ betType: "3top", numbers: "589", amount: 10 }] };
  const url = l.type === "vietlottery" ? "/api/user/vnbet" : "/api/user/bet";
  const res = await fetch(base + url, { method: "POST", headers: auth, body: JSON.stringify(body) }).then((r) => r.json());
  console.log(l.id, res.success || res.message, "cd=" + l.countdown);
}
