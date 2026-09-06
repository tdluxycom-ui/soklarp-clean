const base = "http://127.0.0.1:59617";
const login = await fetch(base + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "thaiplayer", password: "player123" })
}).then((r) => r.json());
if (!login.success) throw new Error("login " + JSON.stringify(login));
const token = login.token;
const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

const rooms = await fetch(base + "/api/lotteries").then((r) => r.json());
const list = rooms.lotteries || rooms.data || rooms;
const yeekee = (Array.isArray(list) ? list : []).find((x) => x.id === "yeekee3") || {};
const vnfast = (Array.isArray(list) ? list : []).find((x) => x.id === "vnfast") || {};

const thai = await fetch(base + "/api/user/bet", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    lotteryType: "yeekee3",
    drawId: yeekee.nextDrawId,
    bets: [{ betType: "3top", numbers: "589", amount: 10 }]
  })
}).then((r) => r.json());

const vn = await fetch(base + "/api/user/vnbet", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    lotteryId: "vnfast",
    drawId: vnfast.nextDrawId,
    betType: "lo",
    numbers: "88",
    amount: 10
  })
}).then((r) => r.json());

const game = await fetch(base + "/api/games/pokdeng", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ amount: 10 })
}).then((r) => r.json());

const coin = await fetch(base + "/api/games/coinflip", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ betOn: "head", amount: 10 })
}).then((r) => r.json());

const slot = await fetch(base + "/api/games/slot", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ amount: 10 })
}).then((r) => r.json());

const daily = await fetch(base + "/api/user/claim-daily", {
  method: "POST",
  headers: auth
}).then((r) => r.json());

console.log({
  login: login.success,
  thai: thai.success || thai.message,
  vn: vn.success || vn.message,
  pokdeng: game.success || game.message,
  coin: coin.success || coin.message,
  slot: slot.success || slot.message,
  daily: daily.success || daily.message,
  yeekeeDraw: yeekee.nextDrawId,
  vnDraw: vnfast.nextDrawId
});
