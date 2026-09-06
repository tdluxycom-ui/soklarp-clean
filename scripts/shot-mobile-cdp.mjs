import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.resolve("tmp-shots");
const userData = path.join(outDir, "chrome-mobile");
fs.mkdirSync(userData, { recursive: true });
const port = 9231;

const login = await fetch("http://127.0.0.1:59617/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" })
}).then((r) => r.json());
if (!login.success) throw new Error("login failed");

const chromeProc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  "--window-size=390,844",
  "about:blank"
], { stdio: "ignore" });

async function waitJson(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("cdp not ready");
}

function bind(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  return (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
}

await waitJson(`http://127.0.0.1:${port}/json/version`);
const targets = await waitJson(`http://127.0.0.1:${port}/json/list`);
const pageTarget = (targets || []).find((t) => t.type === "page");
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});
const send = bind(ws);
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:59617/" });
await new Promise((r) => setTimeout(r, 1600));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem("token", ${JSON.stringify(login.token)}); localStorage.setItem("user", ${JSON.stringify(JSON.stringify(login.user))}); localStorage.setItem("soklarp-lang","vi"); location.reload();`
});
await new Promise((r) => setTimeout(r, 3500));

async function shot(name, evalJs) {
  if (evalJs) await send("Runtime.evaluate", { expression: evalJs });
  await new Promise((r) => setTimeout(r, 900));
  const img = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = path.join(outDir, name);
  fs.writeFileSync(file, Buffer.from(img.data, "base64"));
  console.log(name, fs.statSync(file).size);
}

await shot("m-lobby.png");
await shot("m-thai.png", `openBettingRoom("yeekee3")`);
await shot("m-vn.png", `openVNLotteryRoom("vnfast")`);
await shot("m-game.png", `switchView("game-pokdeng")`);
await shot("m-slot.png", `switchView("game-slot")`);
await shot("m-hist.png", `switchView("history")`);
await shot("m-coin.png", `switchView("game-coinflip")`);
await shot("m-mines.png", `switchView("game-mines")`);
await shot("m-crash.png", `switchView("game-crash")`);
await shot("m-plinko.png", `switchView("game-plinko")`);
await shot("m-wheel.png", `switchView("game-wheel")`);
await shot("m-horse.png", `switchView("game-horseracing")`);
await shot("m-hilo.png", `switchView("game-hilo")`);
await shot("m-dt.png", `switchView("game-dragontiger")`);
await shot("m-pusher.png", `switchView("game-coinpusher")`);
await shot("m-duck.png", `switchView("game-duckshooter")`);

const health = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `({
    w: innerWidth,
    headerH: document.querySelector(".header-inner")?.getBoundingClientRect().height,
    headerOverflow: document.querySelector(".header-inner")?.scrollWidth > document.querySelector(".header-inner")?.clientWidth,
    bodyClass: document.body.className
  })`
});
console.log(JSON.stringify(health.result?.value || health, null, 2));
ws.close();
chromeProc.kill();
