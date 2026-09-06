import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.resolve("tmp-shots");
const userData = path.join(outDir, "chrome-bet");
fs.mkdirSync(userData, { recursive: true });
const port = 9231;

const login = await fetch("http://127.0.0.1:59617/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" })
}).then((r) => r.json());

const chromeProc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  "--window-size=1440,1100",
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
await send("Log.enable");
const logs = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === "Runtime.exceptionThrown") logs.push("EXC " + (msg.params?.exceptionDetails?.text || ""));
  if (msg.method === "Runtime.consoleAPICalled") {
    logs.push((msg.params?.args || []).map((a) => a.value || a.description || "").join(" "));
  }
});

await send("Page.navigate", { url: "http://127.0.0.1:59617/" });
await new Promise((r) => setTimeout(r, 1800));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem("token", ${JSON.stringify(login.token)}); localStorage.setItem("user", ${JSON.stringify(JSON.stringify(login.user))}); localStorage.setItem("soklarp-lang","vi"); location.reload();`
});
await new Promise((r) => setTimeout(r, 3500));

const before = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `({
    hasPlaceThai: typeof placeThaiBetNow,
    hasOpen: typeof openBettingRoom,
    lottoCount: (state.lotteries||[]).length,
    view: state.activeView,
    err: window.__lastErr || null
  })`
});
console.log("before", before.result?.value);

const thai = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      openBettingRoom("yeekee3");
      await new Promise(r => setTimeout(r, 400));
      const inp = document.getElementById("bet-number-input");
      await placeThaiBetNow();
      await new Promise(r => setTimeout(r, 800));
      return {
        view: state.activeView,
        num: inp.value,
        cart: state.cart.length,
        toast: [...document.querySelectorAll(".toast")].map(t => t.textContent).slice(0,3),
        btn: document.getElementById("btn-place-thai-now")?.disabled,
        draw: state.selectedLottery?.nextDrawId,
        cd: state.selectedLottery?.countdown
      };
    } catch (e) {
      return { error: String(e && e.stack || e) };
    }
  })()`
});
console.log("thai", JSON.stringify(thai.result?.value || thai, null, 2));

const vn = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      await openVNLotteryRoom("vnfast");
      await new Promise(r => setTimeout(r, 500));
      const inp = document.getElementById("vn-bet-number");
      await placeVNBetNow();
      await new Promise(r => setTimeout(r, 800));
      return {
        view: state.activeView,
        num: inp.value,
        tickets: state.vnCurrentTickets.length,
        toast: [...document.querySelectorAll(".toast")].map(t => t.textContent).slice(0,4),
        draw: state.vnDrawId
      };
    } catch (e) {
      return { error: String(e && e.stack || e) };
    }
  })()`
});
console.log("vn", JSON.stringify(vn.result?.value || vn, null, 2));
console.log("logs", logs.slice(-20));
ws.close();
chromeProc.kill();
