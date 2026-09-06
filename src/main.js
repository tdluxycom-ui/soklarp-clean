const I18N_ALIASES = {
  need_number: "need_num",
  need_digits3: "need_3",
  need_digits2: "need_2",
  need_digit1: "need_1",
  need_amount: "need_amt",
  vn_login: "login_first",
  vn_bet_title: "vn_play",
  vn_need_num: "need_num",
  vn_need_amt: "need_amt",
  vn_no_slip: "slip_empty",
  vn_err: "sent_fail",
  vn_ok: "sent_ok",
  vn_no_prize: "no_prizes",
  vn_no_hist: "no_hist",
  vn_bad_xien: "xien_hint",
  prize_1: "prize_g1",
  prize_2: "prize_g2",
  prize_3: "prize_g3",
  prize_4: "prize_g4",
  prize_5: "prize_g5",
  prize_6: "prize_g6",
  prize_7: "prize_g7",
  num_grid: "grid_title",
  bulk_added: "added_n"
};

function t(key) {
  const resolved = I18N_ALIASES[key] || key;
  const pack = (window.SOKLARP_I18N && window.SOKLARP_I18N[state.lang]) || {};
  const fallback = (window.SOKLARP_I18N && window.SOKLARP_I18N.lo) || {};
  return pack[resolved] || fallback[resolved] || pack[key] || fallback[key] || key;
}

function localizeApiMessage(msg) {
  if (!msg || typeof msg !== "string") return msg;
  const exact = {
    "Please fill in all fields": "api_fill",
    "Username and password required": "api_user_pass",
    "Invalid username or password": "api_bad_login",
    "Account is banned": "api_banned",
    "Username already in use": "api_taken",
    "Current password is incorrect": "api_pw_wrong",
    "New password must be at least 10 characters": "api_pw_len",
    "Registration successful. Starting credits: 50,000 CR": "api_reg_ok",
    "Invalid stake": "need_amt",
    "Invalid stake (min 10 CR)": "need_amt",
    "Minimum bet is 10 CR": "min_cr",
    "Stake must be at least 10 CR": "min_cr",
    "Not enough CR": "api_no_cr",
    "Insufficient credits": "api_no_cr",
    "Cash transactions are disabled. This platform uses virtual credits only.": "cash_off"
  };
  if (exact[msg]) return t(exact[msg]);
  if (/not enough CR|insufficient credits/i.test(msg)) return t("api_no_cr");
  if (/invalid stake|minimum bet|stake must be/i.test(msg)) return t("need_amt");
  if (/cash (transactions|deposit|withdraw)/i.test(msg)) return t("cash_off");
  return msg;
}

function applyI18n() {
  const pack = (window.SOKLARP_I18N && window.SOKLARP_I18N[state.lang]) || {};
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = t(key);
    if (key && text && text !== key) el.textContent = text;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = t(key);
    if (key && text && text !== key) el.setAttribute("placeholder", text);
  });
  const titles = {
    "view-game-coinflip": "g_coinflip",
    "view-game-hilo": "g_hilo",
    "view-game-wheel": "g_wheel",
    "view-game-slot": "g_slot",
    "view-game-mines": "g_mines",
    "view-game-crash": "g_crash",
    "view-game-plinko": "g_plinko",
    "view-game-pokdeng": "g_pokdeng",
    "view-game-dragontiger": "g_dt",
    "view-game-horseracing": "g_horse",
    "view-game-coinpusher": "g_pusher",
    "view-game-duckshooter": "g_duck",
    "view-game-chest": "g_chest"
  };
  Object.entries(titles).forEach(([id, key]) => {
    const h = document.querySelector(`#${id} .game-header h2`);
    if (h && pack[key]) h.textContent = pack[key];
  });
  document.documentElement.lang = state.lang === "en" ? "en" : (state.lang === "vi" ? "vi" : "lo");
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === state.lang);
  });
  if (typeof refreshBetGuides === "function") refreshBetGuides();
  if (typeof refreshGameGuides === "function") refreshGameGuides();
  if (typeof updateVipRankUI === "function") updateVipRankUI();
  if (typeof refreshRateTabLabels === "function") refreshRateTabLabels();
  if (typeof syncHeroLive === "function") syncHeroLive();
  if (typeof paintLobbyPressure === "function") paintLobbyPressure();
  if (state.activeView === "betting" && state.selectedLottery) {
    applyRoomClockState("thai", state.selectedLottery.countdown || 0);
  }
  if (state.activeView === "vnlotto") {
    const live = (state.lotteries || []).find((l) => l.id === state.vnCurrentLotteryId);
    if (live) applyRoomClockState("vn", live.countdown || 0);
  }
}

window.setSoklarpLang = function(lang) {
  state.lang = (lang === "en" || lang === "vi") ? lang : "lo";
  localStorage.setItem("soklarp-lang", state.lang);
  applyI18n();
  updateUserProfileBar();
  if (state.activeView === "lobby") renderLobby();
  if (state.activeView === "betting") selectBetCategory(state.selectedBetCategory || "3top");
  if (state.activeView === "vnlotto") selectVNBetType(state.vnCurrentBetType || "lo");
  if (state.activeView === "history") loadHistory();
  if (state.activeView === "admin") renderAdminDrawControls();
  if (typeof refreshRateTabLabels === "function") refreshRateTabLabels();
  if (typeof refreshPwaInstallLabels === "function") refreshPwaInstallLabels();
};

function upgradeGameShells() {
  document.querySelectorAll("section[id^='view-game-']").forEach((section) => {
    section.classList.add("game-shell");
    const stage = section.querySelector(".play-area");
    if (stage) stage.classList.add("game-shell-stage");
  });
  injectGameGuides();
  seedEmptyHistoryBoxes();
}

const GAME_GUIDE_MAP = {
  "game-coinflip": { odds: "×1.92", how: "how_coin", rates: ["rate_coin"] },
  "game-hilo": { odds: "×1.95–33", how: "how_hilo", rates: ["rate_hilo_hi", "rate_hilo_11", "rate_hilo_tr"] },
  "game-wheel": { odds: "×0–15", how: "how_wheel", rates: ["rate_wheel"] },
  "game-slot": { odds: "×1.4–40", how: "how_slot", rates: ["rate_slot"] },
  "game-mines": { odds: "×1+", how: "how_mines", rates: ["rate_mines"] },
  "game-crash": { odds: "×1.1–50", how: "how_crash", rates: ["rate_crash"] },
  "game-plinko": { odds: "×0.2–8", how: "how_plinko", rates: ["rate_plinko"] },
  "game-pokdeng": { odds: "×1.9–2", how: "how_pd", rates: ["rate_pd"] },
  "game-dragontiger": { odds: "×1.95 / 8", how: "how_dt", rates: ["rate_dt"] },
  "game-horseracing": { odds: "×2.4–9.6", how: "how_horse", rates: ["rate_horse"] },
  "game-coinpusher": { odds: "×0–12", how: "how_pusher", rates: ["rate_pusher"] },
  "game-duckshooter": { odds: "×0–10", how: "how_duck", rates: ["rate_duck"] },
  "game-chest": { odds: "FREE", how: "how_chest", rates: ["rate_chest"] }
};

function seedEmptyHistoryBoxes() {
  document.querySelectorAll(".history-box").forEach((box) => {
    if (!box.innerHTML.trim()) {
      box.innerHTML = `<div class="empty-hist">${escapeHtml(t("no_hist"))}</div>`;
    }
  });
}

function injectGameGuides() {
  Object.entries(GAME_GUIDE_MAP).forEach(([view, meta]) => {
    const section = document.getElementById(`view-${view}`);
    if (!section || section.querySelector(".game-guide")) return;
    const box = document.createElement("aside");
    box.className = "game-guide";
    box.dataset.guide = view;
    const header = section.querySelector(".game-header");
    (header || section.firstElementChild)?.insertAdjacentElement("afterend", box);
  });
  refreshGameGuides();
}

window.refreshGameGuides = function refreshGameGuides() {
  document.querySelectorAll(".game-guide").forEach((box) => {
    const meta = GAME_GUIDE_MAP[box.dataset.guide];
    if (!meta) return;
    const pills = (meta.rates || []).map((key) => `<span class="game-guide-pill">${escapeHtml(t(key))}</span>`).join("");
    box.innerHTML = `
      <div class="game-guide-head">
        <span><i class="fa-solid fa-book-open"></i> ${escapeHtml(t("how_play"))}</span>
        <b class="game-guide-odds">${escapeHtml(meta.odds)}</b>
      </div>
      <p class="game-guide-how">${escapeHtml(t(meta.how))}</p>
      <div class="game-guide-rates">${pills}</div>
      <p class="game-guide-min">${escapeHtml(t("game_min_note"))}</p>
    `;
  });
}

/**
 * Escapes text for element content and for quoted attribute values.
 *
 * Not sufficient for an inline handler such as onclick="fn('...')": the browser
 * decodes entities in the attribute before the JavaScript parser reads it, so
 * &#39; turns back into a quote that closes the string. Pass untrusted values
 * through data attributes and addEventListener instead.
 */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Shared stake reader for mini-games (min 10 CR). */
function readStakeAmount(inputId, min = 10) {
  const el = document.getElementById(inputId);
  const amount = Number.parseInt(el?.value, 10);
    if (!Number.isFinite(amount) || amount < min) {
    showToast(t("need_amt"), t("min_cr"), "error");
    return null;
  }
  return amount;
}

window.setStakeAmount = function(inputId, value) {
  const el = document.getElementById(inputId);
  if (el) el.value = String(value);
};

const STAKE_CHIP_VALUES = [10, 50, 100, 500];
const GAME_STAKE_INPUTS = [
  "coin-amount-input",
  "hilo-amount-input",
  "wheel-amount-input",
  "slot-amount-input",
  "mines-amount-input",
  "crash-amount-input",
  "plinko-amount-input",
  "pokdeng-amount-input",
  "dt-amount-input",
  "derby-amount-input",
  "pusher-amount-input",
  "duck-amount-input"
];

function attachStakeChips(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const parent = input.parentElement;
  if (!input.value) input.value = "10";
  if (!parent || parent.querySelector(".stake-chips")) return;
  const row = document.createElement("div");
  row.className = "stake-chips";
  STAKE_CHIP_VALUES.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-btn";
    btn.textContent = String(n);
    btn.addEventListener("click", () => {
      input.value = String(n);
    });
    row.appendChild(btn);
  });
  input.insertAdjacentElement("afterend", row);
  let sib = row.nextElementSibling;
  while (sib) {
    const next = sib.nextElementSibling;
    const isDup = sib.classList.contains("quick-btn")
      || (sib.matches && sib.matches(".flex-row, .game-quick-bets") && sib.querySelector(".quick-btn"));
    if (isDup) sib.style.display = "none";
    sib = next;
  }
}

// Convert number string to colored ball HTML
function numToBalls(numStr, colorClass) {
  if (!numStr) return '';
  return numStr.toString().split('').map(function(d) {
    return '<span class="num-ball ' + (colorClass || 'num-ball-gold') + '">' + escapeHtml(d) + '</span>';
  }).join('');
}

// ==========================================================================
// 💎 GOLDEN LOTTO - FRONTEND SPA ROUTER & LOGIC
// ==========================================================================

// Global Application State
const state = {
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user")) || null,
  activeView: "auth",
  activeAdminTab: "draws",
  lotteries: [],
  lobbyCategory: "all",
  selectedLottery: null,
  selectedBetCategory: "3top",
  cart: [],
  currentBetInput: "",
  creditAdjustUsername: "",
  jackpotBase: 1542890,
  lang: (function detectLang() {
    const saved = localStorage.getItem("soklarp-lang");
    if (saved === "en" || saved === "vi" || saved === "lo") return saved;
    const nav = String(navigator.language || "").toLowerCase();
    if (nav.startsWith("vi")) return "vi";
    if (nav.startsWith("en")) return "en";
    return "lo";
  })(),
  creditAdjustNickname: "",
  creditAdjustAction: "add",
  manualDrawLotteryId: "",
  manualDrawDrawId: "",
  timerInterval: null
};

// Web Audio API Sound Synthesizer
let soundEnabled = true;
const sound = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Audio init warning:", e);
    }
  },
  playClick() {
    try {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  },
  playWin() {
    try {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + (index * 0.12));
        gain.gain.setValueAtTime(0.1, now + (index * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.12) + 0.1);
        osc.start(now + (index * 0.12));
        osc.stop(now + (index * 0.12) + 0.1);
      });
    } catch (e) {}
  },
  playCoin() {
    try {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  },
  playError() {
    try {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }
};

// --- API Helper ---
async function apiCall(endpoint, method = "GET", body = null) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(endpoint, options);
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (res.status === 401 && state.token && !String(endpoint).startsWith("/api/auth/")) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const bar = document.getElementById("user-profile-bar");
      if (bar) bar.style.display = "none";
      if (state.activeView !== "auth") switchView("auth");
    }
    if (data && typeof data.message === "string") data.message = localizeApiMessage(data.message);
    return data;
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

// Alias so both apiCall and apiRequest work identically
const apiRequest = apiCall;

// Switch UI Views
window.switchView = function(viewName) {
  document.querySelectorAll(".view-section").forEach(v => {
    v.style.display = "none";
    v.classList.remove("active");
  });
  const view = document.getElementById(`view-${viewName}`);
  if (view) {
    view.style.display = view.classList.contains("auth-split") || viewName === "lobby" || viewName === "betting" || viewName === "vnlotto" ? "flex" : "block";
    view.classList.add("active");
  }
  try { window.scrollTo(0, 0); } catch (_) {}
  state.activeView = viewName;
  document.body.dataset.view = viewName || "";
  const play = String(viewName || "").startsWith("game-") || viewName === "betting" || viewName === "vnlotto";
  document.body.classList.toggle("in-play", play);
  document.body.classList.toggle("in-minigame", String(viewName || "").startsWith("game-"));
  document.body.classList.toggle("in-app-page", viewName === "history" || viewName === "admin");
  document.body.classList.toggle("in-lobby", viewName === "lobby");
  if (viewName !== "game-crash" && typeof stopCrashRoundUi === "function") stopCrashRoundUi();
  const ticker = document.getElementById("ticker-container");
  if (ticker) ticker.style.display = viewName === "lobby" ? "flex" : "none";
  if (viewName !== "betting" && viewName !== "vnlotto") {
    syncCartBadge(headerCartCount());
  }
  try {
    const hash = viewName === "lobby" ? "#lobby" : `#${viewName}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  } catch (_) { /* ignore */ }
  if (sound && sound.playClick) sound.playClick();
  
  if (viewName !== "vnlotto" && state.vnRefreshInterval) {
    clearInterval(state.vnRefreshInterval);
    state.vnRefreshInterval = null;
    state._vnRefreshMs = 0;
  }
  if (viewName === "lobby") loadLotteries();
  if (viewName === "history") loadHistory();
  if (viewName === "admin") loadAdminPanel();
  if (viewName === "vnlotto" && !state.vnCurrentLotteryId) {
    openVNLotteryRoom("vnfast");
    return;
  }
  if (viewName === "betting" || viewName === "vnlotto") applyI18n();
  if (viewName === "game-coinflip" && window.initCoinFlipGame) initCoinFlipGame();
  if (viewName === "game-hilo" && window.initHiloGame) initHiloGame();
  if (viewName === "game-wheel" && window.initWheelGame) initWheelGame();
  if (viewName === "game-dragontiger" && window.initDragonTigerGame) initDragonTigerGame();
  if (viewName === "game-slot" && window.initSlotGame) initSlotGame();
  if (viewName === "game-mines" && window.initMinesGame) initMinesGame();
  if (viewName === "game-plinko" && window.initPlinkoGame) initPlinkoGame();
  if (viewName === "game-crash" && window.initCrashGame) initCrashGame();
  if (viewName === "game-horseracing") {
    state.selectedHorseId = state.selectedHorseId || 1;
    selectHorse(state.selectedHorseId);
  }
};

function viewFromHash() {
  const raw = (location.hash || "").replace(/^#/, "").trim();
  if (!raw) return null;
  if (document.getElementById(`view-${raw}`)) return raw;
  return null;
}

// Switch Auth Tabs (Login / Register)
window.switchAuthTab = function(tabName) {
  if (sound && sound.playClick) sound.playClick();
  const loginForm = document.getElementById("form-login");
  const regForm = document.getElementById("form-register");
  const loginBtn = document.getElementById("tab-btn-login");
  const regBtn = document.getElementById("tab-btn-register");

  if (tabName === "login") {
    if (loginForm) { loginForm.style.display = "block"; loginForm.classList.add("active"); }
    if (regForm) { regForm.style.display = "none"; regForm.classList.remove("active"); }
    if (loginBtn) loginBtn.classList.add("active");
    if (regBtn) regBtn.classList.remove("active");
  } else {
    if (loginForm) { loginForm.style.display = "none"; loginForm.classList.remove("active"); }
    if (regForm) { regForm.style.display = "block"; regForm.classList.add("active"); }
    if (loginBtn) loginBtn.classList.remove("active");
    if (regBtn) regBtn.classList.add("active");
  }
};

// Show Toast Notifications
function showToast(title, message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const THAI_BET_META = {
  "3top": { labelKey: "t3top", guideKey: "g3top", len: 3, rate: 900, ph: "589" },
  "3toad": { labelKey: "t3toad", guideKey: "g3toad", len: 3, rate: 150, ph: "088" },
  "2top": { labelKey: "t2top", guideKey: "g2top", len: 2, rate: 92, ph: "88" },
  "2bottom": { labelKey: "t2bot", guideKey: "g2bot", len: 2, rate: 92, ph: "47" },
  run_top: { labelKey: "trun_top", guideKey: "grun_top", len: 1, rate: 3.2, ph: "8" },
  run_bottom: { labelKey: "trun_bot", guideKey: "grun_bot", len: 1, rate: 4.2, ph: "5" }
};
const THAI_RATES = { "3top": 900, "3toad": 150, "2top": 92, "2bottom": 92, run_top: 3.2, run_bottom: 4.2 };

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text == null ? "" : String(text);
}

function padLast(value, len) {
  const d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.padStart(len, "0").slice(-len);
}

function betTypeLabel(type) {
  const map = {
    "3top": "t3top",
    "3toad": "t3toad",
    "2top": "t2top",
    "2bottom": "t2bot",
    run_top: "trun_top",
    run_bottom: "trun_bot",
    lo: "vn_lo",
    de: "vn_de",
    "3cang": "vn_cang",
    dau: "vn_dau",
    duoi: "vn_duoi",
    xien2: "vn_x2",
    xien3: "vn_x3",
    xien4: "vn_x4"
  };
  return map[type] ? t(map[type]) : (type || "");
}

function betStatusLabel(status) {
  if (status === "won") return t("st_won");
  if (status === "lost") return t("st_lost");
  return t("st_wait");
}

async function syncLotteryById(id) {
  if (!id) return null;
  const data = await apiCall(`/api/lottery/${id}`);
  if (!data || !data.success || !data.lottery) return null;
  const live = data.lottery;
  const idx = state.lotteries.findIndex((item) => item.id === id);
  if (idx >= 0) state.lotteries[idx] = { ...state.lotteries[idx], ...live };
  else state.lotteries.push(live);
  if (state.selectedLottery?.id === id) {
    state.selectedLottery = { ...state.selectedLottery, ...live };
  }
  if (state.vnCurrentLotteryId === id) {
    state.vnDrawId = live.nextDrawId;
  }
  return live;
}

function isStaleDrawError(data) {
  if (!data || data.success) return false;
  if (data.nextDrawId) return true;
  return /Ky da dong|het gio|closed|stale/i.test(String(data.message || ""));
}

function thaiLen(cat) {
  return (THAI_BET_META[cat] || THAI_BET_META["3top"]).len;
}

function uniqueDigitPerms(num) {
  const chars = String(num).split("");
  const out = new Set();
  const rec = (path, used) => {
    if (path.length === chars.length) {
      out.add(path);
      return;
    }
    for (let i = 0; i < chars.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      rec(path + chars[i], used);
      used[i] = false;
    }
  };
  rec("", []);
  return [...out];
}

window.refreshBetGuides = function() {
  if (state.activeView === "betting") {
    const cat = state.selectedBetCategory || "3top";
    const meta = THAI_BET_META[cat] || THAI_BET_META["3top"];
    setElText("bet-type-title", t(meta.labelKey));
    setElText("bet-guide-text", t(meta.guideKey));
    updateBetPayoutPreview();
  }
  if (state.activeView === "vnlotto" && typeof selectVNBetType === "function") {
    const desc = document.getElementById("vn-bet-desc-text");
    if (desc) desc.textContent = t(VN_GUIDE_KEYS[state.vnCurrentBetType] || "gv_lo");
  }
};

// Add Number to Cart
function addToCart(overrideNum) {
  if (!guardRoomOpen("thai")) return false;
  const numInput = document.getElementById("bet-number-input");
  let num = String(overrideNum != null ? overrideNum : (numInput ? numInput.value.trim() : "")).replace(/\D/g, "");
  const amountInput = document.getElementById("bet-amount-input");
  const amount = amountInput ? parseInt(amountInput.value, 10) : 10;
  const cat = state.selectedBetCategory || "3top";
  const meta = THAI_BET_META[cat] || THAI_BET_META["3top"];

  if (!num && numInput) num = String(numInput.placeholder || "").replace(/\D/g, "");
  if (!num) {
    numInput?.classList.add("is-invalid");
    numInput?.focus();
    showToast(t("need_number"), t("step2"), "danger");
    return false;
  }
  numInput?.classList.remove("is-invalid");
  if (num.length < meta.len) num = padLast(num, meta.len);
  if (num.length !== meta.len) {
    const msg = meta.len === 3 ? t("need_digits3") : (meta.len === 2 ? t("need_digits2") : t("need_digit1"));
    showToast(t("need_number"), msg, "danger");
    return false;
  }
  if (!amount || amount <= 0) {
    showToast(t("need_amount"), t("step3"), "danger");
    return false;
  }

  state.cart.push({
    betType: cat,
    numbers: num,
    amount,
    label: t(meta.labelKey)
  });
  state.currentBetInput = num;
  if (numInput) numInput.value = num;
  sound.playCoin();
  updateCartUI();
  updateBetPayoutPreview();
  return true;
}
window.addToCart = addToCart;

window.placeThaiBetNow = async function() {
  if (!addToCart()) return;
  await submitBets();
};

// Remove Bet Ticket from Cart
function removeCartItem(index) {
  sound.playClick();
  state.cart.splice(index, 1);
  updateCartUI();
}
window.removeCartItem = removeCartItem;

function headerCartCount() {
  if (state.vnCurrentTickets?.length) return state.vnCurrentTickets.length;
  return state.cart?.length || 0;
}

function syncCartBadge(n) {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const count = Number(n) || 0;
  badge.textContent = String(count);
  badge.classList.toggle("is-zero", count === 0);
}

// Update Cart Display UI
function updateCartUI() {
  const container = document.getElementById("cart-items-list");
  if (!container) return;
  container.innerHTML = "";

  const potWinElem = document.getElementById("cart-potential-win");
  const cartCountEl = document.getElementById("cart-count");
  const cartTotalEl = document.getElementById("cart-total");
  const cartTotalAmountEl = document.getElementById("cart-total-amount");
  const btnSubmitHidden = document.getElementById("btn-submit-bets");
  const btnSubmitAll = document.getElementById("btn-submit-all-bets");

  if (state.cart.length === 0) {
    const draft = thaiDraftTicket();
    if (draft) {
      const win = draft.amount * draft.rate;
      container.innerHTML = `<div class="slip-draft">
        <div class="cart-item-meta">
          <span class="cart-item-num">${escapeHtml(draft.num)}</span>
          <span class="cart-item-type">${escapeHtml(draft.label)} · ${escapeHtml(String(draft.amount))} CR</span>
        </div>
        <div class="slip-draft-hint">${escapeHtml(t("confirm_bet"))} → +${win.toLocaleString()} CR</div>
      </div>`;
      if (cartTotalAmountEl) cartTotalAmountEl.innerText = draft.amount.toLocaleString();
      setElText("cart-potential-win-visible", `+${win.toLocaleString()}`);
    } else {
      container.innerHTML = `<div class="empty-cart-message">${escapeHtml(t("slip_empty"))}</div>`;
      if (cartTotalAmountEl) cartTotalAmountEl.innerText = "0.00";
      setElText("cart-potential-win-visible", "+0");
    }
    if (cartCountEl) {
      cartCountEl.innerText = "0";
      cartCountEl.classList.toggle("is-zero", true);
    }
    if (cartTotalEl) cartTotalEl.innerText = draft ? `${draft.amount.toLocaleString()} CR` : "0.00 CR";
    if (potWinElem) potWinElem.innerText = draft ? `+${(draft.amount * draft.rate).toLocaleString()} CR` : "+0.00 CR";
    if (btnSubmitHidden) btnSubmitHidden.disabled = false;
    if (btnSubmitAll) btnSubmitAll.disabled = false;
    document.getElementById("btn-place-thai-now")?.classList.toggle("is-ready", !!draft);
    refreshThaiProgress();
    return;
  }

  let totalAmount = 0;
  let maxPotentialWin = 0;
  const ratesMap = THAI_RATES;

  state.cart.forEach((item, index) => {
    totalAmount += item.amount;
    const rate = ratesMap[item.betType] || 90;
    maxPotentialWin += (item.amount * rate);

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span class="cart-item-num">${escapeHtml(item.numbers)}</span>
        <span class="cart-item-type">${escapeHtml(item.label)}</span>
      </div>
      <div class="cart-item-actions">
        <span class="cart-item-amount gold-text">${escapeHtml(item.amount.toLocaleString())} CR</span>
        <button class="btn-remove-item" onclick="removeCartItem(${index})"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    container.appendChild(div);
  });

  if (cartCountEl) {
    cartCountEl.innerText = String(state.cart.length);
    cartCountEl.classList.toggle("is-zero", state.cart.length === 0);
  }
  if (cartTotalEl) cartTotalEl.innerText = `${totalAmount.toLocaleString()} CR`;
  if (cartTotalAmountEl) cartTotalAmountEl.innerText = totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (potWinElem) potWinElem.innerText = `+${maxPotentialWin.toLocaleString(undefined, { minimumFractionDigits: 2 })} CR`;
  setElText("cart-potential-win-visible", `+${maxPotentialWin.toLocaleString()}`);
  if (btnSubmitHidden) btnSubmitHidden.disabled = false;
  if (btnSubmitAll) btnSubmitAll.disabled = false;
  document.getElementById("btn-place-thai-now")?.classList.add("is-ready");
  refreshThaiProgress();
}

function setBetSteps(rootSelector, current) {
  document.querySelectorAll(`${rootSelector} .bet-step`).forEach((el, i) => {
    const n = i + 1;
    el.classList.toggle("is-current", n === current);
    el.classList.toggle("is-done", n < current);
  });
}

function refreshThaiProgress() {
  const draft = typeof thaiDraftTicket === "function" ? thaiDraftTicket() : null;
  const hasCart = state.cart.length > 0;
  const input = document.getElementById("bet-number-input");
  const num = String(input?.value || input?.placeholder || state.currentBetInput || "").replace(/\D/g, "");
  let step = 1;
  if (state.selectedBetCategory) step = 2;
  if (state.selectedBetCategory && num) step = 3;
  if (draft) step = 4;
  if (hasCart) step = 5;
  setBetSteps("#view-betting", step);
  if (state.activeView === "betting" || !state.activeView) {
    syncCartBadge(hasCart ? state.cart.length : (draft ? 1 : 0));
  }
}

function thaiDraftTicket() {
  const cat = state.selectedBetCategory || "3top";
  const meta = THAI_BET_META[cat] || THAI_BET_META["3top"];
  const input = document.getElementById("bet-number-input");
  let num = String(input?.value || input?.placeholder || state.currentBetInput || "").replace(/\D/g, "");
  if (num && num.length < meta.len) num = padLast(num, meta.len);
  const amount = parseInt(document.getElementById("bet-amount-input")?.value, 10) || 0;
  if (!num || num.length !== meta.len || amount <= 0) return null;
  return { num, amount, label: t(meta.labelKey), rate: THAI_RATES[cat] || meta.rate };
}

window.updateCalcPreview = function() {
  const catSelect = document.getElementById("calc-cat-select");
  const amountInput = document.getElementById("calc-amount-input");
  const display = document.getElementById("calc-result-display");

  if (!catSelect || !amountInput || !display) return;
  const cat = catSelect.value;
  const amt = parseFloat(amountInput.value) || 0;
  const ratesMap = THAI_RATES;
  const rate = ratesMap[cat] || 90;
  const total = amt * rate;

  display.innerText = `+${total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CR`;
};

// Clear Entire Cart
function clearCart() {
  sound.playClick();
  state.cart = [];
  updateCartUI();
}

// Submit bets to Server
async function submitBets() {
  if (!state.selectedLottery) {
    showToast(t("pick_room"), t("lobby_bet"), "danger");
    return;
  }
  if (state.cart.length === 0) {
    if (!addToCart()) return;
  }

  sound.playClick();
  const submitBtns = [
    document.getElementById("btn-submit-all-bets"),
    document.getElementById("btn-submit-bets"),
    document.getElementById("btn-place-thai-now")
  ].filter(Boolean);
  const prevHtml = submitBtns.map((btn) => btn.innerHTML);
  submitBtns.forEach((btn) => {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(t("sending"))}`;
  });

  const live = await syncLotteryById(state.selectedLottery.id);
  if (live) {
    state.selectedLottery = { ...state.selectedLottery, ...live };
    setElText("betting-draw-id", (live.nextDrawId || "").split("-").pop());
    setElText("betting-draw-id-visible", (live.nextDrawId || "").split("-").pop());
    setElText("betting-stage-draw-id", (live.nextDrawId || "").split("-").pop());
    setElText("stage-countdown-display", formatTime(live.countdown || 0));
    applyRoomClockState("thai", live.countdown || 0);
    if (!(live.countdown > 0)) {
      submitBtns.forEach((btn, i) => {
        btn.disabled = false;
        btn.innerHTML = prevHtml[i] || t("send_slip");
      });
      showToast(t("bets_closed"), t("drawing"), "danger");
      return;
    }
  }

  const payload = {
    lotteryType: state.selectedLottery.id,
    drawId: state.selectedLottery.nextDrawId,
    bets: state.cart.map(i => ({ betType: i.betType, numbers: i.numbers, amount: i.amount }))
  };

  let data = await apiCall("/api/user/bet", "POST", payload);
  if (isStaleDrawError(data)) {
    const retryLive = await syncLotteryById(state.selectedLottery.id);
    if (retryLive && retryLive.countdown > 0) {
      payload.drawId = retryLive.nextDrawId;
      data = await apiCall("/api/user/bet", "POST", payload);
    }
  }
  submitBtns.forEach((btn, i) => {
    btn.disabled = false;
    btn.innerHTML = prevHtml[i] || t("send_slip");
  });

  if (data && data.success) {
    const placedBets = [...state.cart];
    state.cart = [];
    updateCartUI();
    
    // Update local user balance
    if (data.newBalance !== undefined) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();
    }
    
    const cost = data.totalCost || placedBets.reduce((acc, curr) => acc + curr.amount, 0);
    showToast(t("sent_ok"), `${roomLabel(state.selectedLottery.id)} · ${cost.toLocaleString()} CR`, "success");
    sound.playWin();
    state._userBetsAt = 0;
    refreshRoomPendingStrip();

    // Trigger Live Quick Draw Waiting Board
    openLiveDrawWaitingBoard(state.selectedLottery, placedBets);
  } else {
    showToast(t("sent_fail"), data ? data.message : t("sent_fail"), "danger");
  }
}

// Open Live Draw Waiting & Reveal Board
window.openLiveDrawWaitingBoard = function(lottery, bets) {
  const box = document.getElementById("live-draw-waiting-box");
  if (!box || !lottery) return;
  const placedDrawId = lottery.nextDrawId;
  const isVn = lottery.type === "vietlottery" || String(lottery.id || "").startsWith("vn");
  box.style.display = "block";
  box.className = "live-wait-overlay";
  box.innerHTML = `
    <div class="live-wait-card">
      <div class="live-wait-head">
        <span class="hero-live-dot"></span>
        <b>${escapeHtml(roomLabel(lottery.id))}</b>
        <span>${escapeHtml(t("draw_id"))} #${escapeHtml((placedDrawId || "").split("-").pop() || "—")}</span>
      </div>
      <div id="waiting-ticket-summary" class="live-wait-tickets"></div>
      <div id="waiting-timer-count" class="live-wait-clock">${escapeHtml(formatTime(lottery.countdown || 0))}</div>
      <div id="waiting-result-line" class="live-wait-result">${escapeHtml(t("wait_result"))}</div>
      <button class="btn-gold" type="button" onclick="closeWaitingBoard()">${escapeHtml(t("close"))}</button>
    </div>`;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
  const ticketList = document.getElementById("waiting-ticket-summary");
  if (ticketList) {
    ticketList.innerHTML = (bets || []).map((b) => `
      <div class="live-wait-row">
        <span class="gold-text">${escapeHtml(String(b.numbers || b.num || ""))}</span>
        <span>${escapeHtml(b.label || betTypeLabel(b.betType) || "")} · ${escapeHtml(Number(b.amount || 0).toLocaleString())} CR</span>
      </div>`).join("");
  }
  if (state.waitingPoll) clearInterval(state.waitingPoll);
  let tries = 0;
  const pollMs = isVn ? 1000 : 2000;
  const maxTries = isVn ? 480 : 90;
  state.waitingPoll = setInterval(async () => {
    tries += 1;
    const live = await syncLotteryById(lottery.id);
    const timerText = document.getElementById("waiting-timer-count");
    const resultLine = document.getElementById("waiting-result-line");
    if (live?.liveDraw) {
      const left = liveDrawRemainingSecs(live.liveDraw);
      if (timerText) timerText.innerText = formatTime(left);
      if (resultLine) {
        const current = live.liveDraw.current;
        const raw = current ? live.liveDraw.prizes?.[current] : null;
        const shown = raw == null ? t("vn_wait_num") : (Array.isArray(raw) ? raw[0] : raw);
        resultLine.innerHTML = `${escapeHtml(t("vn_draw_now"))} ${escapeHtml(vnPrizeLabel(current))} · <b class="gold-text">${escapeHtml(String(shown))}</b>`;
      }
    } else if (timerText && live) {
      timerText.innerText = live.countdown > 0 ? formatTime(live.countdown) : t("drawing");
    }
    const latest = live?.lastResults?.[0];
    if (latest && latest.drawId === placedDrawId) {
      clearInterval(state.waitingPoll);
      state.waitingPoll = null;
      if (isVn && latest.prizes?.db) {
        if (resultLine) resultLine.innerHTML = `${escapeHtml(t("last_db"))} <b class="gold-text">${escapeHtml(String(latest.prizes.db))}</b>`;
        showToast(t("sent_ok"), String(latest.prizes.db), "success");
      } else {
        const top3 = latest.numbers?.top3 || "---";
        const bot2 = latest.numbers?.bottom2 || "--";
        if (resultLine) resultLine.innerHTML = `${escapeHtml(t("top3"))} <b class="gold-text">${escapeHtml(top3)}</b> · ${escapeHtml(t("bot2"))} <b>${escapeHtml(bot2)}</b>`;
        showToast(t("sent_ok"), `${top3} / ${bot2}`, "success");
      }
      state._userBetsAt = 0;
      loadHistory();
      refreshRoomPendingStrip();
      return;
    }
    if (tries > maxTries) {
      clearInterval(state.waitingPoll);
      state.waitingPoll = null;
      if (resultLine) resultLine.textContent = t("no_prizes");
    }
  }, pollMs);
};

window.closeWaitingBoard = function() {
  sound.playClick();
  if (state.waitingPoll) {
    clearInterval(state.waitingPoll);
    state.waitingPoll = null;
  }
  const box = document.getElementById("live-draw-waiting-box");
  if (box) {
    box.style.display = "none";
    box.className = "";
    box.innerHTML = "";
  }
};

// Load personal bet history
state.historyFilter = "all";

function histLocale() {
  return state.lang === "vi" ? "vi-VN" : (state.lang === "en" ? "en-US" : "lo-LA");
}

function histTime(iso) {
  return new Date(iso).toLocaleString(histLocale(), { dateStyle: "short", timeStyle: "short" });
}

function histPayoutText(b) {
  const status = b.status || "pending";
  if (status === "won") return `+${Number(b.payout || 0).toLocaleString()} CR`;
  if (status === "pending") return "—";
  return "0";
}

function renderHistorySummary(bets) {
  const box = document.getElementById("hist-summary");
  if (!box) return;
  const won = bets.filter((b) => b.status === "won");
  const lost = bets.filter((b) => b.status === "lost");
  const pending = bets.filter((b) => !b.status || b.status === "pending");
  const stake = bets.reduce((s, b) => s + Number(b.amount || 0), 0);
  const payout = won.reduce((s, b) => s + Number(b.payout || 0), 0);
  const net = payout - stake;
  box.innerHTML = `
    <div class="hist-stat"><span>${escapeHtml(t("hist_sum_bets"))}</span><b>${bets.length}</b><small>${escapeHtml(t("hist_staked"))} ${stake.toLocaleString()} CR</small></div>
    <div class="hist-stat win"><span>${escapeHtml(t("hist_sum_won"))}</span><b>${won.length}</b><small>${escapeHtml(t("hist_paid"))} ${payout.toLocaleString()} CR</small></div>
    <div class="hist-stat lose"><span>${escapeHtml(t("hist_sum_lost"))}</span><b>${lost.length}</b></div>
    <div class="hist-stat wait"><span>${escapeHtml(t("hist_wait"))}</span><b>${pending.length}</b></div>
    <div class="hist-stat ${net >= 0 ? "win" : "lose"}"><span>${escapeHtml(t("hist_sum_net"))}</span><b>${net >= 0 ? "+" : ""}${net.toLocaleString()} CR</b></div>
  `;
}

function histTicketCard(b, kind) {
  const status = b.status || "pending";
  const rate = Number(b.rate || 0);
  const title = kind === "game"
    ? gameDisplayName(b.lotteryType)
    : (roomLabel(b.lotteryType) || b.lotteryType || "—");
  const open = kind === "game"
    ? ""
    : `onclick="enterLotteryRoom('${escapeHtml(b.lotteryType || "")}')"`;
  const typeLine = kind === "game"
    ? escapeHtml(String(b.numbers || "—"))
    : `${escapeHtml(betTypeLabel(b.betType))} · ×${escapeHtml(rate || "—")}`;
  const drawTail = (b.drawId || "").split("-").pop();
  return `<article class="hist-ticket hist-${escapeHtml(status)}">
    <div class="hist-ticket-top">
      <button type="button" class="hist-open" ${open}>${escapeHtml(title)}</button>
      <span class="hist-pill hist-${escapeHtml(status)}">${escapeHtml(betStatusLabel(status))}</span>
    </div>
    <div class="hist-ticket-num">${escapeHtml(String(b.numbers || "—"))}</div>
    <div class="hist-ticket-meta">
      <span>${typeLine}</span>
      <span>${escapeHtml(Number(b.amount || 0).toLocaleString())} CR</span>
      <b class="${status === "won" ? "win-text" : ""}">${escapeHtml(histPayoutText(b))}</b>
    </div>
    <div class="hist-ticket-time">${drawTail ? `${escapeHtml(t("draw_id"))} #${escapeHtml(drawTail)} · ` : ""}${escapeHtml(histTime(b.createdAt))}</div>
  </article>`;
}

function renderHistoryTables() {
  const lotteryBody = document.getElementById("my-bets-table-body");
  const gameBody = document.getElementById("my-game-history-table-body");
  const list = document.getElementById("hist-ticket-list");
  const gameList = document.getElementById("hist-game-list");
  const bets = state.userBets || [];
  const filter = state.historyFilter || "all";
  document.querySelectorAll(".hist-filter").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-hist-filter") === filter);
  });
  const pass = (b) => filter === "all" || (b.status || "pending") === filter;
  const allLotto = bets.filter((b) => !String(b.lotteryType || "").startsWith("game_"));
  const allGames = bets.filter((b) => String(b.lotteryType || "").startsWith("game_"));
  const pendingFirst = (a, b) => {
    const pa = (!a.status || a.status === "pending") ? 0 : 1;
    const pb = (!b.status || b.status === "pending") ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  };
  const lotteryBets = allLotto.filter(pass).sort(filter === "all" ? pendingFirst : () => 0);
  const gameBets = allGames.filter(pass);
  renderHistorySummary(filter === "all" ? allLotto : lotteryBets);
  const setN = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n ? String(n) : ""; };
  setN("hist-n-all", allLotto.length);
  setN("hist-n-won", allLotto.filter((b) => b.status === "won").length);
  setN("hist-n-lost", allLotto.filter((b) => b.status === "lost").length);
  setN("hist-n-wait", allLotto.filter((b) => !b.status || b.status === "pending").length);

  const lottoLimit = state.histLottoLimit || 12;
  const gameLimit = state.histGameLimit || 8;
  const lottoShown = lotteryBets.slice(0, lottoLimit);
  const gameShown = gameBets.slice(0, gameLimit);

  if (list) {
    list.innerHTML = lottoShown.length
      ? lottoShown.map((b) => histTicketCard(b, "lotto")).join("")
      : `<div class="admin-empty">${escapeHtml(t("no_hist"))}</div>`;
  }
  const moreLotto = document.getElementById("hist-more-lotto");
  if (moreLotto) moreLotto.hidden = lotteryBets.length <= lottoShown.length;

  const gameSum = document.getElementById("hist-game-summary");
  if (gameSum) {
    const gWon = allGames.filter((b) => b.status === "won").length;
    const gStake = allGames.reduce((s, b) => s + Number(b.amount || 0), 0);
    gameSum.innerHTML = allGames.length
      ? `<span>${escapeHtml(t("hist_games"))}: <b>${allGames.length}</b></span>
         <span class="win-text">${escapeHtml(t("hist_sum_won"))} ${gWon}</span>
         <span>${escapeHtml(t("hist_staked"))} ${gStake.toLocaleString()} CR</span>`
      : "";
  }
  if (gameList) {
    gameList.innerHTML = gameShown.length
      ? gameShown.map((b) => histTicketCard(b, "game")).join("")
      : `<div class="admin-empty">${escapeHtml(t("no_hist"))}</div>`;
  }
  const moreGames = document.getElementById("hist-more-games");
  if (moreGames) moreGames.hidden = gameBets.length <= gameShown.length;

  if (lotteryBody) lotteryBody.innerHTML = "";
  if (gameBody) gameBody.innerHTML = "";
}

window.setHistoryFilter = function(filter) {
  state.historyFilter = filter;
  state.histLottoLimit = 12;
  state.histGameLimit = 8;
  document.querySelectorAll(".hist-filter").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-hist-filter") === filter);
  });
  renderHistoryTables();
};

window.showMoreHistory = function(kind) {
  if (kind === "games") state.histGameLimit = (state.histGameLimit || 8) + 8;
  else state.histLottoLimit = (state.histLottoLimit || 12) + 12;
  renderHistoryTables();
};

window.scrollToMiniGames = function() {
  switchView("lobby");
  setTimeout(() => document.getElementById("mini-games-section")?.scrollIntoView({ behavior: "smooth" }), 80);
};

async function loadHistory() {
  const lotteryBody = document.getElementById("my-bets-table-body");
  const gameBody = document.getElementById("my-game-history-table-body");
  const list = document.getElementById("hist-ticket-list");
  const gameList = document.getElementById("hist-game-list");
  if (lotteryBody) lotteryBody.innerHTML = `<tr><td colspan="8" class="no-data">${escapeHtml(t("loading"))}</td></tr>`;
  if (gameBody) gameBody.innerHTML = `<tr><td colspan="5" class="no-data">${escapeHtml(t("loading"))}</td></tr>`;
  if (list) list.innerHTML = `<div class="admin-empty">${escapeHtml(t("loading"))}</div>`;
  if (gameList) gameList.innerHTML = `<div class="admin-empty">${escapeHtml(t("loading"))}</div>`;
  const data = await apiCall("/api/user/bets");
  if (data && data.success) {
    state.userBets = data.bets || [];
    renderHistoryTables();
  } else {
    const msg = escapeHtml(t("no_hist"));
    if (list) list.innerHTML = `<div class="admin-empty">${msg}</div>`;
    if (gameList) gameList.innerHTML = `<div class="admin-empty">${msg}</div>`;
    if (lotteryBody) lotteryBody.innerHTML = "";
    if (gameBody) gameBody.innerHTML = "";
  }
}

// User Logout
async function logout() {
  try {
    if (state.token) await apiCall("/api/auth/logout", "POST");
  } catch (_) { /* ignore */ }
  state.token = null;
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  
  document.getElementById("user-profile-bar").style.display = "none";
  switchView("auth"); setTimeout(hideLoadingScreen, 100);
}

// Update User Header Profile Bar
function updateUserProfileBar() {
  if (!state.user) return;
  const bar = document.getElementById("user-profile-bar");
  bar.style.display = "flex";

  document.getElementById("header-nickname").innerText = displayNickname(state.user);
  document.getElementById("header-balance").innerText = Number(state.user.balance).toLocaleString("en-US");
  
  const roleBadge = document.getElementById("header-role");
  if (state.user.role === "admin") {
    roleBadge.innerText = t("role_admin");
    roleBadge.className = "role-badge admin-role";
    document.getElementById("btn-admin-view").style.display = "inline-flex";
  } else {
    roleBadge.innerText = t("role_member");
    roleBadge.className = "role-badge";
    document.getElementById("btn-admin-view").style.display = "none";
  }
  if (typeof updateVipRankUI === "function") updateVipRankUI();
}

// Refresh User Balance
async function refreshBalance() {
  const data = await apiCall("/api/user/balance");
  if (data && data.success) {
    state.user.balance = data.balance;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();
    showToast(t("bal_updated"), `${data.balance.toLocaleString()} CR`, "info");
  }
}

// Fetch Lotteries data & Render Lobby Cards
async function loadLotteries() {
  const grid = document.getElementById("lottery-lobby-grid");
  if (!grid) return;

  const [data, rates] = await Promise.all([
    apiCall("/api/lotteries"),
    apiCall("/api/rates")
  ]);
  if (rates && rates.success) {
    if (rates.thai) Object.assign(THAI_RATES, rates.thai);
    if (rates.vn) Object.assign(VN_RATES, rates.vn);
    state.payoutRates = rates;
    paintLobbySiteNote(rates.siteNote);
    refreshRateTabLabels();
  }
  if (data && data.success) {
    state.lotteries = data.lotteries;
    renderLobby();
  }
}

function paintLobbySiteNote(note) {
  const el = document.getElementById("lobby-site-note");
  if (!el) return;
  const text = String(note || "").trim();
  el.hidden = !text;
  el.textContent = text;
}

function refreshRateTabLabels() {
  document.querySelectorAll("#bet-type-tabs .bet-cat-btn").forEach((btn) => {
    const match = btn.getAttribute("onclick")?.match(/'([^']+)'/);
    const small = btn.querySelector("small");
    if (match && small && THAI_RATES[match[1]] != null) small.textContent = `×${THAI_RATES[match[1]]}`;
  });
  document.querySelectorAll(".vn-type-tabs .vn-tab-btn").forEach((btn) => {
    const key = String(btn.id || "").replace("vn-tab-", "");
    const small = btn.querySelector("small");
    if (small && VN_RATES[key] != null) small.textContent = `×${VN_RATES[key]}`;
  });
  const trust = document.getElementById("trust-payout-num");
  if (trust) trust.textContent = `×${THAI_RATES["3top"] ?? 900}`;
  const foot = document.getElementById("footer-rate-list");
  if (foot) {
    foot.innerHTML = `${escapeHtml(t("rate_3top"))}: <b>x${THAI_RATES["3top"] ?? 900}</b><br>
      ${escapeHtml(t("rate_3toad"))}: <b>x${THAI_RATES["3toad"] ?? 150}</b><br>
      ${escapeHtml(t("rate_2"))}: <b>x${THAI_RATES["2top"] ?? 92}</b><br>
      ${escapeHtml(t("rate_run"))}: <b>x${THAI_RATES.run_top ?? 3.2}–${THAI_RATES.run_bottom ?? 4.2}</b>`;
  }
}

// Filter Lobby by Category
window.filterLobbyCategory = function(cat) {
  sound.playClick();
  state.lobbyCategory = cat || "all";
  document.querySelectorAll(".tab-filter-btn").forEach((btn) => {
    const on = btn.getAttribute("data-lobby-cat") === state.lobbyCategory;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  renderLobby();
};

function countdownSeconds(lottery) {
  return Math.max(0, Math.floor(Number(lottery?.countdown) || 0));
}

function isUrgentCountdown(secs) {
  return secs > 0 && secs < 30;
}

function formatTimeCompact(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function roomUrgencyRank(lottery) {
  if (isVnLiveDrawing(lottery)) return liveDrawRemainingSecs(lottery.liveDraw);
  const secs = countdownSeconds(lottery);
  if (secs > 0) return 100000 + secs;
  return 1e9 + Math.abs(Number(lottery?.countdown) || 0);
}

function pickSoonestLiveRoom() {
  const list = state.lotteries || [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const diff = roomUrgencyRank(a) - roomUrgencyRank(b);
    return diff || String(a.id).localeCompare(String(b.id));
  })[0];
}

window.enterLotteryRoom = function(lotteryId) {
  const l = (state.lotteries || []).find((item) => item.id === lotteryId);
  if (!l) return;
  if (l.type === "vietlottery") openVNLotteryRoom(l.id);
  else openBettingRoom(l.id);
};

window.enterSoonestLotteryRoom = function() {
  const live = pickSoonestLiveRoom();
  if (live) enterLotteryRoom(live.id);
  else document.getElementById("lottery-lobby-grid")?.scrollIntoView({ behavior: "smooth" });
};

function isSelectedRoomClosed(kind) {
  if (kind === "vn") {
    const l = (state.lotteries || []).find((item) => item.id === state.vnCurrentLotteryId);
    return countdownSeconds(l) <= 0 || isVnLiveDrawing(l);
  }
  return countdownSeconds(state.selectedLottery) <= 0;
}

function guardRoomOpen(kind) {
  if (!isSelectedRoomClosed(kind)) return true;
  showToast(t("bets_closed"), t("drawing"), "danger");
  return false;
}

function roomLastCompact(lottery) {
  if (isVnLiveDrawing(lottery)) {
    const key = lottery.liveDraw.current || "nhat";
    const raw = lottery.liveDraw.prizes?.[key];
    const short = { db: "ĐB", nhat: "G1", nhi: "G2", ba: "G3", tu: "G4", nam: "G5", sau: "G6", bay: "G7" };
    if (raw == null) return `${short[key] || "G1"} ${t("vn_wait_num")}`;
    const shown = Array.isArray(raw) ? raw[0] : raw;
    return `${short[key] || "G1"} ${String(shown).slice(-5)}`;
  }
  const last = (lottery?.lastResults || [])[0];
  if (!last) return "";
  if (last.numbers?.top3) return String(last.numbers.top3);
  const db = last.prizes?.db;
  return db ? String(db).slice(-5) : "";
}

async function refreshRoomPendingStrip() {
  const thaiEl = document.getElementById("thai-my-pending");
  const vnEl = document.getElementById("vn-my-pending");
  if (!state.token) {
    if (thaiEl) { thaiEl.hidden = true; thaiEl.innerHTML = ""; }
    if (vnEl) { vnEl.hidden = true; vnEl.innerHTML = ""; }
    return;
  }
  if (!state.userBets || !state._userBetsAt || Date.now() - state._userBetsAt > 12000) {
    const data = await apiCall("/api/user/bets");
    if (data && data.success) {
      state.userBets = data.bets || [];
      state._userBetsAt = Date.now();
    }
  }
  paintRoomPendingStrip(state.selectedLottery?.id, state.selectedLottery?.nextDrawId, thaiEl);
  paintRoomPendingStrip(state.vnCurrentLotteryId, state.vnDrawId, vnEl);
}

function paintRoomPendingStrip(lotteryId, drawId, el) {
  if (!el) return;
  if (!lotteryId) {
    el.hidden = true;
    el.onclick = null;
    el.innerHTML = "";
    return;
  }
  const bets = (state.userBets || []).filter((b) =>
    b.lotteryType === lotteryId
    && (b.status === "pending")
    && (!drawId || b.drawId === drawId)
  );
  if (!bets.length) {
    el.hidden = true;
    el.onclick = null;
    el.innerHTML = "";
    return;
  }
  const stake = bets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  el.hidden = false;
  el.setAttribute("role", "button");
  el.onclick = () => { switchView("history"); setHistoryFilter("pending"); };
  el.innerHTML = `<i class="fa-solid fa-ticket"></i> <span>${escapeHtml(t("your_tickets"))}</span>
    <b>${bets.length}</b>
    <span class="gold-text">${stake.toLocaleString()} CR</span>
    <div class="room-pending-nums">${bets.slice(0, 8).map((b) => `<span>${escapeHtml(String(b.numbers || ""))}</span>`).join("")}</div>`;
}

function vnPrizeLabel(key) {
  const map = {
    db: "prize_db",
    nhat: "prize_g1",
    nhi: "prize_g2",
    ba: "prize_g3",
    tu: "prize_g4",
    nam: "prize_g5",
    sau: "prize_g6",
    bay: "prize_g7"
  };
  return t(map[key] || "prize_g1");
}

function liveDrawRemainingSecs(ld) {
  if (!ld) return 0;
  const started = Number(ld.startedAt) || 0;
  const dur = Number(ld.durationMs) || 90000;
  if (started) return Math.max(0, Math.ceil((started + dur - Date.now()) / 1000));
  return Math.max(0, Math.ceil((Number(ld.remainingMs) || 0) / 1000));
}

function isVnLiveDrawing(lottery) {
  return !!lottery?.liveDraw;
}

function applyCountdownClass(el, secs) {
  if (!el) return;
  el.classList.toggle("is-urgent", isUrgentCountdown(secs));
  el.classList.toggle("is-drawing", !(secs > 0));
}

function paintLotteryCountdown(lottery) {
  if (!lottery) return;
  if (isVnLiveDrawing(lottery)) {
    const left = liveDrawRemainingSecs(lottery.liveDraw);
    const cd = document.getElementById(`cd-${lottery.id}`);
    if (cd) {
      cd.textContent = formatTime(left);
      applyCountdownClass(cd, 0);
    }
    const strip = document.getElementById(`strip-cd-${lottery.id}`);
    if (strip) {
      strip.textContent = formatTimeCompact(left);
      applyCountdownClass(strip, 0);
    }
    const chip = document.getElementById(`room-chip-${lottery.id}`);
    document.getElementById(`lotto-card-${lottery.id}`)?.classList.add("is-drawing");
    chip?.classList.add("is-drawing");
    const last = roomLastCompact(lottery);
    const lastEl = chip?.querySelector(".room-chip-last");
    if (lastEl) lastEl.textContent = last;
    else if (chip && last) chip.insertAdjacentHTML("beforeend", `<span class="room-chip-last">${escapeHtml(last)}</span>`);
    return;
  }
  const secs = countdownSeconds(lottery);
  const cd = document.getElementById(`cd-${lottery.id}`);
  if (cd) {
    cd.textContent = formatTime(secs);
    applyCountdownClass(cd, secs);
  }
  const strip = document.getElementById(`strip-cd-${lottery.id}`);
  if (strip) {
    strip.textContent = secs > 0 ? formatTimeCompact(secs) : t("drawing");
    applyCountdownClass(strip, secs);
  }
  const card = document.getElementById(`lotto-card-${lottery.id}`);
  if (card) {
    card.classList.toggle("is-urgent", isUrgentCountdown(secs));
    card.classList.toggle("is-drawing", !(secs > 0));
  }
  const chip = document.getElementById(`room-chip-${lottery.id}`);
  if (chip) {
    const soonest = pickSoonestLiveRoom();
    chip.classList.toggle("is-urgent", isUrgentCountdown(secs));
    chip.classList.toggle("is-drawing", !(secs > 0));
    chip.classList.toggle("is-soonest", soonest?.id === lottery.id);
  }
}

function applyRoomClockState(kind, seconds) {
  const secs = Math.max(0, Math.floor(Number(seconds) || 0));
  const closed = !(secs > 0);
  const urgent = isUrgentCountdown(secs);
  const wrap = document.getElementById(kind === "vn" ? "vn-room-clock" : "thai-room-clock");
  if (wrap) {
    wrap.classList.toggle("is-urgent", urgent);
    wrap.classList.toggle("is-drawing", closed);
  }
  const label = document.getElementById(kind === "vn" ? "vn-clock-label" : "thai-clock-label");
  if (label) label.textContent = closed ? t("drawing") : t("closes_in");
  const banner = document.getElementById(kind === "vn" ? "vn-draw-state" : "thai-draw-state");
  if (banner) {
    banner.hidden = !closed;
    banner.textContent = t("drawing");
  }
  const view = document.getElementById(kind === "vn" ? "view-vnlotto" : "view-betting");
  if (view) view.classList.toggle("is-draw-locked", closed);
}

function renderRoomsClockStrip() {
  const track = document.getElementById("rooms-clock-track");
  if (!track) return;
  const soonest = pickSoonestLiveRoom();
  const list = [...(state.lotteries || [])].sort((a, b) => {
    const diff = roomUrgencyRank(a) - roomUrgencyRank(b);
    return diff || String(a.id).localeCompare(String(b.id));
  });
  track.innerHTML = list.map((l) => {
    const drawing = isVnLiveDrawing(l);
    const secs = drawing ? liveDrawRemainingSecs(l.liveDraw) : countdownSeconds(l);
    const cls = [
      "room-chip",
      !drawing && isUrgentCountdown(secs) ? "is-urgent" : "",
      drawing || secs <= 0 ? "is-drawing" : "",
      soonest?.id === l.id ? "is-soonest" : ""
    ].filter(Boolean).join(" ");
    const label = drawing ? formatTimeCompact(secs) : (secs > 0 ? formatTimeCompact(secs) : t("drawing"));
    const last = roomLastCompact(l);
    return `<button type="button" class="${cls}" id="room-chip-${l.id}" onclick="enterLotteryRoom('${l.id}')">
      <span class="room-chip-name">${escapeHtml(roomLabel(l.id))}</span>
      <b class="countdown-text" id="strip-cd-${l.id}">${escapeHtml(label)}</b>
      ${last ? `<span class="room-chip-last">${escapeHtml(last)}</span>` : ""}
    </button>`;
  }).join("");
  paintLobbyPressure();
}

function hotLotteryRooms() {
  return (state.lotteries || []).filter((l) => {
    if (isVnLiveDrawing(l)) return true;
    const secs = countdownSeconds(l);
    return secs > 0 && secs <= 180;
  });
}

function paintLobbyPressure() {
  const list = state.lotteries || [];
  const hot = hotLotteryRooms();
  const countEl = document.getElementById("cmd-rooms");
  if (countEl) {
    countEl.textContent = String(hot.length);
    countEl.closest(".cmd-card")?.classList.toggle("is-hot", hot.length > 0);
  }
  const cmdHint = document.getElementById("cmd-rooms-hint");
  if (cmdHint) cmdHint.textContent = hot.length ? t("cmd_hot") : t("cmd_rooms");
  const foot = document.getElementById("footer-live-line");
  if (foot) {
    const live = pickSoonestLiveRoom();
    if (!live) {
      foot.textContent = t("foot_online");
      return;
    }
    const drawing = isVnLiveDrawing(live);
    const secs = drawing ? liveDrawRemainingSecs(live.liveDraw) : countdownSeconds(live);
    foot.textContent = drawing
      ? `${roomLabel(live.id)} · ${t("vn_drawing")} ${formatTimeCompact(secs)}`
      : `${roomLabel(live.id)} · ${formatTimeCompact(secs)}`;
  }
}

function roomLabel(id) {
  return t("room_" + id);
}

function gameDisplayName(lotteryType) {
  const raw = String(lotteryType || "").replace(/^game_/, "");
  const map = {
    coinflip: "g_coinflip",
    hilo: "g_hilo",
    wheel: "g_wheel",
    slot: "g_slot",
    mines: "g_mines",
    crash: "g_crash",
    plinko: "g_plinko",
    pokdeng: "g_pokdeng",
    dragontiger: "g_dt",
    dt: "g_dt",
    horseracing: "g_horse",
    horse: "g_horse",
    coinpusher: "g_pusher",
    pusher: "g_pusher",
    duckshooter: "g_duck",
    duck: "g_duck",
    chest: "g_chest"
  };
  return map[raw] ? t(map[raw]) : (raw || lotteryType || "—");
}

function displayNickname(user) {
  const name = user?.nickname || user?.username || "Player";
  if (/à[¸¹]|Ã.|á»/.test(name)) return user.username || "Player";
  return name;
}

function syncHeroLive() {
  const live = pickSoonestLiveRoom();
  if (!live) return;
  const drawing = isVnLiveDrawing(live);
  const secs = drawing ? liveDrawRemainingSecs(live.liveDraw) : countdownSeconds(live);
  const name = document.getElementById("hero-live-name");
  const cd = document.getElementById("hero-live-cd");
  const go = document.querySelector(".hero-live-go");
  const box = document.getElementById("hero-live");
  if (name) name.textContent = roomLabel(live.id);
  if (cd) {
    cd.textContent = secs > 0 ? formatTime(secs) : t("drawing");
    applyCountdownClass(cd, drawing ? 0 : secs);
  }
  if (go) {
    go.setAttribute("onclick", `enterLotteryRoom('${live.id}')`);
    go.textContent = drawing || !(secs > 0) ? t("watch_draw") : t("bet_now");
  }
  const cta = document.querySelector(".hero-cta");
  if (cta) cta.textContent = drawing || !(secs > 0) ? t("watch_draw") : t("hero_enter");
  if (box) {
    box.classList.toggle("is-urgent", !drawing && isUrgentCountdown(secs));
    box.classList.toggle("is-drawing", drawing || !(secs > 0));
    const tag = box.querySelector(".hero-live-tag");
    if (tag) tag.textContent = drawing ? t("vn_drawing") : (secs > 0 ? (isUrgentCountdown(secs) ? t("closing_soon") : "LIVE") : t("drawing"));
  }
  paintLobbyPressure();
}

function bindLotteryCardClick(card, lotteryId) {
  card.id = `lotto-card-${lotteryId}`;
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  const open = () => enterLotteryRoom(lotteryId);
  card.addEventListener("click", (ev) => {
    if (ev.target.closest(".btn-history-draw, .btn-play-lottery, .vn-play-btn")) return;
    open();
  });
  card.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    if (ev.target.closest(".btn-history-draw")) return;
    ev.preventDefault();
    open();
  });
}

function renderLobby() {
  const grid = document.getElementById("lottery-lobby-grid");
  if (!grid) return;
  const category = state.lobbyCategory || "all";
  document.querySelectorAll(".tab-filter-btn").forEach((btn) => {
    const on = btn.getAttribute("data-lobby-cat") === category;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  syncHeroLive();
  renderRoomsClockStrip();
  grid.innerHTML = "";

  let list = state.lotteries || [];
  if (category === "yeekee") list = list.filter(l => l.type === "yeekee");
  if (category === "scheduled") list = list.filter(l => l.type === "scheduled");
  if (category === "vietlottery") list = list.filter(l => l.type === "vietlottery");
  const byUrgency = (a, b) => {
    const diff = roomUrgencyRank(a) - roomUrgencyRank(b);
    return diff || String(a.id).localeCompare(String(b.id));
  };
  const vnList = list.filter(l => l.type === "vietlottery").sort(byUrgency);
  const thaiList = list.filter(l => l.type !== "vietlottery").sort(byUrgency);

  thaiList.forEach(l => {
    const card = document.createElement("div");
    const secs = countdownSeconds(l);
    const urgent = isUrgentCountdown(secs);
    card.className = "lottery-card lc-pro is-clickable"
      + (l.type === "yeekee" ? " is-live" : "")
      + (urgent ? " is-urgent" : "")
      + (secs <= 0 ? " is-drawing" : "");
    const timeDisplay = l.type === "yeekee"
      ? `<i class="fa-solid fa-bolt"></i> ${t("closes_in")} <b class="countdown-text${urgent ? " is-urgent" : ""}" id="cd-${l.id}">${formatTime(secs)}</b>`
      : `<i class="fa-regular fa-clock"></i> ${t("next_draw")} <b>${escapeHtml(l.drawTimeOfDay || "--:--")}</b> · <b class="countdown-text${urgent ? " is-urgent" : ""}" id="cd-${l.id}">${formatTime(secs)}</b>`;
    // Home cards stay lean: name, timer, enter. Draw detail lives inside the room.
    card.innerHTML = `
      <div class="lottery-card-header">
        <span class="lux-mark">${l.type === "yeekee" ? '<i class="fa-solid fa-bolt"></i>' : '<i class="fa-solid fa-landmark"></i>'}</span>
        <span class="lottery-badge">${l.type === "yeekee" ? t("yeekee") : t("scheduled")}</span>
      </div>
      <h3 class="lc-card-title">${escapeHtml(roomLabel(l.id))}</h3>
      <div class="lottery-card-body">
        <div class="time-display-box">${timeDisplay}</div>
      </div>
      <div class="lottery-card-footer">
        <span class="card-enter">${t("bet_now")}</span>
        <button class="btn-history-draw" type="button" onclick="event.stopPropagation(); showDrawResultsHistory('${l.id}')" title="History">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
      </div>`;
    bindLotteryCardClick(card, l.id);
    grid.appendChild(card);
  });

  if (vnList.length > 0) {
    const vnDivider = document.createElement("div");
    vnDivider.className = "vn-section-full";
    vnDivider.innerHTML = `
      <div class="vn-section-divider">
        <div class="vn-divider-left">
          <span class="vn-divider-flag"><i class="fa-solid fa-star"></i></span>
          <div class="vn-divider-title">${t("vn_title")}</div>
        </div>
      </div>`;
    grid.appendChild(vnDivider);

    vnList.forEach(l => {
      const card = document.createElement("div");
      const isFast = !!l.interval;
      const secs = countdownSeconds(l);
      const urgent = isUrgentCountdown(secs);
      card.className = `lottery-card lc-pro vn-card is-clickable ${isFast ? "vn-card-fast is-live" : "vn-card-daily"}`
        + (urgent ? " is-urgent" : "")
        + (secs <= 0 ? " is-drawing" : "");
      const timeHtml = isVnLiveDrawing(l)
        ? `<span class="vn-time-fast"><i class="fa-solid fa-bolt"></i> ${t("vn_drawing")} <b class="countdown-text is-drawing" id="cd-${l.id}">${formatTime(liveDrawRemainingSecs(l.liveDraw))}</b></span>`
        : (isFast
        ? `<span class="vn-time-fast"><i class="fa-solid fa-bolt"></i> ${t("closes_in")} <b class="countdown-text${urgent ? " is-urgent" : ""}" id="cd-${l.id}">${formatTime(secs)}</b></span>`
        : `<span class="vn-time-sched"><i class="fa-regular fa-clock"></i> ${t("next_draw")} <b>${escapeHtml(l.drawTimeOfDay || "--:--")}</b> · <b class="countdown-text${urgent ? " is-urgent" : ""}" id="cd-${l.id}">${formatTime(secs)}</b></span>`);
      card.innerHTML = `
        <div class="vn-card-header">
          <span class="lux-mark"><i class="fa-solid fa-star"></i></span>
          <span class="vn-type-badge">${isFast ? "5 phút" : ((l.id === "vnmn" || l.id === "vnmt") ? t("sim_room") : t("scheduled"))}</span>
        </div>
        <h3 class="vn-card-title">${escapeHtml(roomLabel(l.id))}</h3>
        <div class="vn-card-time">${timeHtml}</div>
        <div class="lottery-card-footer">
        <span class="card-enter">${t("vn_enter")}</span>
        <button class="btn-history-draw" type="button" onclick="event.stopPropagation(); showDrawResultsHistory('${l.id}')" title="History">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
        </div>`;
      bindLotteryCardClick(card, l.id);
      grid.appendChild(card);
    });
  }
}

// Open Betting Room for a specific lottery
window.openLastBettingRoom = function() {
  const betting = document.getElementById("view-betting");
  const vn = document.getElementById("view-vnlotto");
  const inThai = betting && betting.style.display !== "none";
  const inVn = vn && vn.style.display !== "none";
  if (inThai) {
    document.querySelector(".cart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (inVn) {
    document.querySelector("#view-vnlotto .cart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const last = state.lastLotteryRoom;
  if (last?.kind === "vn") {
    openVNLotteryRoom(last.id);
    return;
  }
  if (last?.kind === "thai") {
    openBettingRoom(last.id);
    return;
  }
  if (state.selectedLottery) {
    if (String(state.selectedLottery.type || "") === "vietlottery") openVNLotteryRoom(state.selectedLottery.id);
    else openBettingRoom(state.selectedLottery.id);
    return;
  }
  const first = (state.lotteries || []).find((l) => l.type !== "vietlottery");
  if (first) openBettingRoom(first.id);
  else switchView("lobby");
};

window.toggleVNNumberGrid = function() {
  const grid = document.getElementById("vn-number-grid");
  if (!grid) return;
  if (grid.hidden) {
    grid.hidden = false;
    renderNumberGrid();
  } else {
    grid.hidden = true;
    grid.innerHTML = "";
  }
};

window.openBettingRoom = function(lotteryId) {
  if (!state.token) {
    showToast(t("vn_login"), t("bet_now"), "danger");
    switchView("auth");
    return;
  }
  const l = state.lotteries.find(item => item.id === lotteryId);
  if (!l) return;

  state.selectedLottery = l;
  state.lastLotteryRoom = { kind: "thai", id: lotteryId };
  state.cart = [];
  state.currentBetInput = "";

  const drawTail = (l.nextDrawId || "").split("-").pop();
  setElText("betting-lottery-name", roomLabel(l.id));
  setElText("room-name-display", roomLabel(l.id));
  setElText("betting-draw-id", drawTail);
  setElText("betting-draw-id-visible", drawTail);
  setElText("betting-stage-draw-id", drawTail);
  setElText("betting-stage-countdown", formatTime(l.countdown || 0));
  setElText("stage-countdown-display", formatTime(l.countdown || 0));

  updateRoomStageResults(l);
  applyRoomClockState("thai", l.countdown || 0);
  updateCartUI();
  selectBetCategory("3top");
  fetchAiPredict(l.id);
  switchView("betting");
  refreshRoomPendingStrip();
};

function setSphereDigit(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function renderThaiRecentDraws(lottery) {
  const el = document.getElementById("thai-recent-draws");
  if (!el) return;
  const rows = (lottery.lastResults || []).slice(0, 3);
  if (!rows.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = rows.map((r) => {
    const top3 = String(r.numbers?.top3 || "---");
    const bot2 = String(r.numbers?.bottom2 || "--");
    const id = (r.drawId || "").split("-").pop();
    return `<div class="recent-draw-row">
      <span class="recent-draw-id">#${escapeHtml(id)}</span>
      <span class="digit-spheres gold-spheres">${top3.split("").map((n) => `<span class="sphere-digit">${escapeHtml(n)}</span>`).join("")}</span>
      <span class="digit-spheres green-spheres">${bot2.split("").map((n) => `<span class="sphere-digit">${escapeHtml(n)}</span>`).join("")}</span>
    </div>`;
  }).join("");
}

function updateRoomStageResults(lottery) {
  const lastResults = lottery.lastResults || [];
  const latest = lastResults.length > 0 ? lastResults[0] : null;
  const top3 = latest?.numbers?.top3 || "---";
  const bot2 = latest?.numbers?.bottom2 || "--";

  setElText("betting-last-top3", top3);
  setElText("betting-last-bottom2", bot2);
  setElText("room-last-top3", top3);
  setElText("room-last-bottom2", bot2);

  const top3Arr = String(top3).split("");
  const b2Arr = String(bot2).split("");
  setElText("room-ball-1", top3Arr[0] || "?");
  setElText("room-ball-2", top3Arr[1] || "?");
  setElText("room-ball-3", top3Arr[2] || "?");
  setElText("room-ball-4", b2Arr[0] || "?");
  setElText("room-ball-5", b2Arr[1] || "?");
  setSphereDigit("room-sphere-1", top3Arr[0]);
  setSphereDigit("room-sphere-2", top3Arr[1]);
  setSphereDigit("room-sphere-3", top3Arr[2]);
  setSphereDigit("room-sphere-4", b2Arr[0]);
  setSphereDigit("room-sphere-5", b2Arr[1]);
  renderThaiRecentDraws(lottery);
  applyRoomClockState("thai", lottery.countdown || 0);
}

window.selectBetCategory = function(cat) {
  sound.playClick();
  state.selectedBetCategory = cat;
  const meta = THAI_BET_META[cat] || THAI_BET_META["3top"];

  document.querySelectorAll("#bet-type-tabs .bet-cat-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("onclick")?.includes(`'${cat}'`));
  });

  const inputEl = document.getElementById("bet-number-input");
  if (inputEl) {
    inputEl.maxLength = meta.len;
    inputEl.placeholder = meta.ph;
    const seeded = String(meta.ph || "").replace(/\D/g, "").slice(0, meta.len);
    inputEl.value = seeded;
    state.currentBetInput = seeded;
    inputEl.classList.remove("is-invalid");
  }
  setElText("bet-type-title", t(meta.labelKey));
  setElText("bet-guide-text", t(meta.guideKey));
  const toadBtn = document.querySelector("[onclick='addToadPermutations()']");
  if (toadBtn) toadBtn.style.display = cat === "3toad" ? "" : "none";
  updateBetPayoutPreview();
  updateCartUI();
};

window.handleKeypadPress = function(val) {
  sound.playClick();
  const maxLen = thaiLen(state.selectedBetCategory);
  if (state.currentBetInput.length >= maxLen) return;
  if (!/^\d$/.test(String(val))) return;
  state.currentBetInput += val;
  const inputEl = document.getElementById("bet-number-input");
  if (inputEl) inputEl.value = state.currentBetInput;
  updateBetPayoutPreview();
  updateCartUI();
};

window.syncBetNumberInput = function(el) {
  const maxLen = thaiLen(state.selectedBetCategory);
  const cleaned = String(el.value || "").replace(/\D/g, "").slice(0, maxLen);
  el.value = cleaned;
  state.currentBetInput = cleaned;
  updateBetPayoutPreview();
  updateCartUI();
};

window.keypadDelete = function() {
  sound.playClick();
  state.currentBetInput = String(state.currentBetInput || "").slice(0, -1);
  const inputEl = document.getElementById("bet-number-input");
  if (inputEl) inputEl.value = state.currentBetInput;
  updateBetPayoutPreview();
  updateCartUI();
};

window.clearBetNumber = function() {
  sound.playClick();
  state.currentBetInput = "";
  const inputEl = document.getElementById("bet-number-input");
  if (inputEl) inputEl.value = "";
  updateBetPayoutPreview();
  updateCartUI();
};

window.luckyBetNumber = function() {
  window.rollRandomLuckyNumber();
  updateBetPayoutPreview();
};

window.reverseBetNumber = function() {
  sound.playClick();
  const input = document.getElementById("bet-number-input");
  const num = (input ? input.value : state.currentBetInput || "").replace(/\D/g, "");
  if (num.length < 2) {
    showToast(t("need_number"), t("need_digits2"), "danger");
    return;
  }
  const rev = num.split("").reverse().join("");
  if (rev === num) {
    showToast(t("reverse"), num, "info");
    return;
  }
  addToCart(num);
  addToCart(rev);
};

window.addToadPermutations = function() {
  sound.playClick();
  const input = document.getElementById("bet-number-input");
  const num = (input ? input.value : state.currentBetInput || "").replace(/\D/g, "");
  if (num.length !== 3) {
    showToast(t("need_number"), t("need_digits3"), "danger");
    return;
  }
  uniqueDigitPerms(num).forEach((p) => addToCart(p));
};

window.updateBetPayoutPreview = function() {
  const cat = state.selectedBetCategory || "3top";
  const meta = THAI_BET_META[cat] || THAI_BET_META["3top"];
  const amt = parseFloat(document.getElementById("bet-amount-input")?.value) || 0;
  const rate = THAI_RATES[cat] ?? meta.rate;
  const win = amt * rate;
  const el = document.getElementById("bet-payout-preview");
  if (el) el.textContent = `${t("win_if")} ×${rate} → ${win.toLocaleString()} CR`;
};

window.setBetAmount = function(n) {
  const input = document.getElementById("bet-amount-input");
  if (input) input.value = String(n);
  updateBetPayoutPreview();
};

function startTimers() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state._tickCount = 0;
  state.timerInterval = setInterval(() => {
    state._tickCount += 1;
    state.lotteries.forEach((l) => {
      if (!(l.countdown > 0)) {
        paintLotteryCountdown(l);
        if (state.activeView === "betting" && state.selectedLottery?.id === l.id) {
          setElText("betting-stage-countdown", formatTime(0));
          setElText("stage-countdown-display", formatTime(0));
          applyRoomClockState("thai", 0);
        }
        if (state.activeView === "vnlotto" && state.vnCurrentLotteryId === l.id) {
          if (isVnLiveDrawing(l)) applyVnRoomClock(l);
          else {
            setElText("vn-countdown-display", formatTime(0));
            applyRoomClockState("vn", 0);
          }
        }
        if (l.liveDraw && liveDrawRemainingSecs(l.liveDraw) <= 0) {
          if (!l._revealReloadAt || Date.now() - l._revealReloadAt > 1500) {
            l._revealReloadAt = Date.now();
            loadLotteries().then(() => {
              if (state.activeView === "vnlotto" && state.vnCurrentLotteryId === l.id) refreshVNRoom();
            });
          }
        }
        return;
      }
      l.countdown--;
      paintLotteryCountdown(l);

      if (state.activeView === "betting" && state.selectedLottery?.id === l.id) {
        setElText("betting-stage-countdown", formatTime(l.countdown));
        setElText("stage-countdown-display", formatTime(l.countdown));
        applyRoomClockState("thai", l.countdown);
      }
      if (state.activeView === "vnlotto" && state.vnCurrentLotteryId === l.id) {
        setElText("vn-countdown-display", formatTime(l.countdown));
        applyRoomClockState("vn", l.countdown);
      }

      if (l.countdown === 0) {
        loadLotteries().then(() => {
          const updatedL = state.lotteries.find((item) => item.id === l.id);
          if (!updatedL) return;
          if (state.activeView === "betting" && state.selectedLottery?.id === l.id) {
            state.selectedLottery = updatedL;
            const drawTail = (updatedL.nextDrawId || "").split("-").pop();
            setElText("betting-draw-id", drawTail);
            setElText("betting-draw-id-visible", drawTail);
            setElText("betting-stage-draw-id", drawTail);
            updateRoomStageResults(updatedL);
          }
          if (state.activeView === "vnlotto" && state.vnCurrentLotteryId === l.id) {
            refreshVNRoom();
          }
        });
      }
    });
    paintLobbyPressure();
    if (state.activeView === "lobby") {
      syncHeroLive();
      if ((state.lotteries || []).some(isVnLiveDrawing)) {
        if (!state._lobbyRevealPoll || Date.now() - state._lobbyRevealPoll > 2000) {
          state._lobbyRevealPoll = Date.now();
          Promise.all(
            state.lotteries.filter(isVnLiveDrawing).map((room) => syncLotteryById(room.id))
          ).then(() => {
            if (state.activeView === "lobby") renderLobby();
          });
        }
      }
    }
    if (state.activeView === "admin") {
      (state.lotteries || []).forEach((room) => {
        const el = document.getElementById(`admin-cd-${room.id}`);
        if (!el) return;
        const drawing = isVnLiveDrawing(room);
        el.textContent = drawing
          ? `${t("vn_drawing")} ${formatTime(liveDrawRemainingSecs(room.liveDraw))}`
          : formatTime(room.countdown || 0);
        el.classList.toggle("is-urgent", drawing || (room.countdown || 0) < 30);
      });
    }

    if (state._tickCount % 8 === 0) {
      if (state.activeView === "betting" && state.selectedLottery?.id) {
        syncLotteryById(state.selectedLottery.id).then((live) => {
          if (!live) return;
          setElText("stage-countdown-display", formatTime(live.countdown || 0));
          setElText("betting-stage-countdown", formatTime(live.countdown || 0));
          applyRoomClockState("thai", live.countdown || 0);
          const drawTail = (live.nextDrawId || "").split("-").pop();
          setElText("betting-draw-id", drawTail);
          setElText("betting-draw-id-visible", drawTail);
          setElText("betting-stage-draw-id", drawTail);
          updateRoomStageResults(live);
        });
      }
    }

    const jpEl = document.getElementById("mega-jackpot-counter");
    if (jpEl && state.jackpotBase) {
      const pulse = (Date.now() / 8000) % 1;
      const val = state.jackpotBase + Math.sin(pulse * Math.PI * 2) * 18;
      jpEl.innerText = `CR ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, 1000);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Load Admin Control Panel
async function loadAdminPanel() {
  const data = await apiCall("/api/admin/dashboard");
  if (data && data.success) {
    const stats = data.stats || (data.dashboard ? data.dashboard.stats : {});
    const totalBets = stats.totalBets || stats.totalBetsAmount || 0;
    const totalPayout = stats.totalPayout || stats.totalPayoutAmount || 0;
    const netProfit = stats.netProfit || (totalBets - totalPayout);
    const users = stats.activeUsers || 0;
    
    const el = id => document.getElementById(id);
    
    if (el("admin-total-users")) el("admin-total-users").textContent = users.toLocaleString();
    if (el("admin-total-bets")) el("admin-total-bets").textContent = totalBets.toLocaleString() + " CR";
    if (el("admin-total-payout")) el("admin-total-payout").textContent = totalPayout.toLocaleString() + " CR";
    if (el("admin-total-revenue")) {
      el("admin-total-revenue").textContent = netProfit.toLocaleString() + " CR";
      el("admin-total-revenue").style.color = netProfit >= 0 ? "#2ecc71" : "#e74c3c";
    }
    if (el("admin-active-draws")) el("admin-active-draws").textContent = String(hotLotteryRooms().length);
    if (el("admin-pending-bets")) el("admin-pending-bets").textContent = Number(stats.pendingBets || 0).toLocaleString();
    if (el("admin-banned-users")) el("admin-banned-users").textContent = Number(stats.bannedUsers || 0).toLocaleString();
    state.adminRoomOps = data.roomOps || [];
    const noteBanner = el("admin-site-note-banner");
    const note = String(data.settings?.siteNote || data.siteNote || "").trim();
    if (noteBanner) {
      noteBanner.hidden = !note;
      noteBanner.textContent = note;
    }
    
    // Backward compat
    if (el("admin-stat-revenue")) el("admin-stat-revenue").innerText = totalBets.toLocaleString("th-TH") + " CR";
    if (el("admin-stat-payout")) el("admin-stat-payout").innerText = totalPayout.toLocaleString("th-TH") + " CR";
    if (el("admin-stat-profit")) el("admin-stat-profit").innerText = netProfit.toLocaleString("th-TH") + " CR";
    if (el("admin-stat-users-count")) el("admin-stat-users-count").innerText = users;
  }

  renderAdminDrawControls();
  loadAdminUsers();
  loadAdminAllBets();
  loadAdminFinanceRequests();
  loadAdminSystemSettings();
  if (typeof loadNumberStats === 'function') loadNumberStats();
  if (typeof loadAdminGames === "function") loadAdminGames();
}

function adminRoomLabel(id) {
  const map = {
    yeekee3: "Yeekee 3 phút",
    yeekee30: "Yeekee 30 phút",
    hanoi: "Hà Nội",
    laos: "Lào",
    vnfast: "VN nhanh",
    vnmb: "Miền Bắc",
    vnmn: "Miền Nam",
    vnmt: "Miền Trung"
  };
  return map[id] || id || "—";
}

function adminBetTypeLabel(type) {
  const map = {
    "3top": "3 trên",
    "3toad": "3 đảo",
    "2top": "2 trên",
    "2bottom": "2 dưới",
    run_top: "Đá trên",
    run_bottom: "Đá dưới",
    lo: "Lô",
    de: "Đề",
    "3cang": "3 càng",
    dau: "Đầu",
    duoi: "Đuôi",
    xien2: "Xiên 2",
    xien3: "Xiên 3",
    xien4: "Xiên 4"
  };
  return map[type] || type || "—";
}

function isVnLotteryId(id) {
  return ["vnfast", "vnmb", "vnmn", "vnmt"].includes(id);
}

function isSimVnRoom(id) {
  return id === "vnmn" || id === "vnmt";
}

function adminVipRank(exp) {
  const value = Number(exp || 0);
  if (value >= 5000) return "Kim cương";
  if (value >= 2500) return "Vàng";
  if (value >= 1000) return "Bạc";
  return "Đồng";
}

function adminFmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function adminLastResultLine(result, roomId) {
  if (!result) return "Chưa có kết quả";
  const vn = isVnLotteryId(roomId) || result.prizes;
  if (vn && result.prizes) {
    const db = result.prizes.db;
    const g1 = result.prizes.nhat || result.prizes.g1;
    if (!db) return "Chưa có kết quả";
    return g1 ? `ĐB ${db} · G1 ${g1}` : `ĐB ${db}`;
  }
  if (result.numbers?.top3) {
    return `3 trên ${result.numbers.top3} · 2 dưới ${result.numbers.bottom2 || "--"}`;
  }
  return "Chưa có kết quả";
}

function adminStatusBadge(status) {
  const label = adminStatusVi(status);
  const cls = status === "won" ? "is-won" : status === "lost" ? "is-lost" : status === "pending" ? "is-pending" : status === "cancelled" ? "is-cancel" : "";
  return `<span class="admin-pill ${cls}">${escapeHtml(label)}</span>`;
}

function adminMiniStats(items) {
  return items.map((item) => `<div class="admin-mini-stat"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(String(item.value))}</b></div>`).join("");
}

function renderAdminDrawControls() {
  const container = document.getElementById("admin-draws-list") || document.getElementById("admin-draw-control-grid");
  if (!container) return;
  const rooms = [...(state.lotteries || [])].sort((a, b) => roomUrgencyRank(a) - roomUrgencyRank(b));
  if (!rooms.length) {
    container.innerHTML = `<div class="admin-empty">Chưa có phòng xổ số để điều khiển.</div>`;
    return;
  }
  container.innerHTML = "";

  rooms.forEach(l => {
    const card = document.createElement("div");
    const secs = countdownSeconds(l);
    card.className = "admin-control-card"
      + (isVnLiveDrawing(l) ? " is-drawing" : "")
      + (!isVnLiveDrawing(l) && secs > 0 && secs < 30 ? " is-urgent" : "");
    const last = (l.lastResults || [])[0];
    const lastLine = adminLastResultLine(last, l.id);
    const sim = isSimVnRoom(l.id) ? `<span class="admin-pill is-sim">Mô phỏng</span>` : "";
    const liveNow = isVnLiveDrawing(l)
      ? `<div class="admin-live-now">Đang sổ ${escapeHtml(vnPrizeLabel(l.liveDraw.current))} · ${escapeHtml(formatTime(liveDrawRemainingSecs(l.liveDraw)))}</div>`
      : "";
    const last3 = (l.lastResults || []).slice(0, 3).map((r) => {
      return `<div class="admin-result-row"><span>${escapeHtml((r.drawId || "").split("-").pop() || "—")}</span><b class="gold-text">${escapeHtml(adminLastResultLine(r, l.id))}</b></div>`;
    }).join("") || `<div class="admin-result-row">Chưa có lịch sử</div>`;
    const ops = (state.adminRoomOps || []).find((r) => r.id === l.id) || {};
    card.innerHTML = `
      <h4>${escapeHtml(adminRoomLabel(l.id))} ${sim}</h4>
      ${liveNow}
      <div class="admin-control-meta">
        <div>Kỳ tiếp: <b class="gold-text">${escapeHtml(l.nextDrawId || "-")}</b></div>
        <div>Đóng nhận: <b class="admin-cd${(l.countdown || 0) < 30 || isVnLiveDrawing(l) ? " is-urgent" : ""}" id="admin-cd-${l.id}">${escapeHtml(isVnLiveDrawing(l) ? `${t("vn_drawing")} ${formatTime(liveDrawRemainingSecs(l.liveDraw))}` : formatTime(l.countdown || 0))}</b></div>
        <div>Kết quả gần nhất: ${escapeHtml(lastLine)}</div>
        <div class="auto-toggle-row">
          <span>Tự quay</span>
          <label class="switch">
            <input type="checkbox" id="auto-check-${l.id}" ${l.settings?.autoDraw ? "checked" : ""} onchange="toggleAutoDraw('${l.id}')">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="admin-mini-stats admin-room-ops">
        <div class="admin-mini-stat"><span>Phiếu chờ</span><b>${Number(ops.pendingCount || 0).toLocaleString()}</b></div>
        <div class="admin-mini-stat"><span>Cược chờ</span><b>${Number(ops.pendingStake || 0).toLocaleString()} CR</b></div>
        <div class="admin-mini-stat"><span>Rủi ro</span><b>${Math.round(Number(ops.pendingRisk || 0)).toLocaleString()} CR</b></div>
      </div>
      <div class="admin-mini-results">${last3}</div>
      <div class="admin-control-actions">
        <button class="btn-admin-draw" type="button" ${isVnLiveDrawing(l) ? "disabled" : ""} onclick="openManualDrawModal('${l.id}', '${l.nextDrawId || ""}')">
          ${isVnLiveDrawing(l) ? "Đang sổ — chờ hết 1:30" : (l.type === "vietlottery" ? "Chốt kỳ Việt Nam" : "Chốt kỳ thủ công")}
        </button>
        <button class="quick-btn" type="button" onclick="openAdminRoomBets('${l.id}')">Xem phiếu chờ</button>
      </div>
    `;
    container.appendChild(card);
  });

  const settled = document.getElementById("admin-draw-result-list");
  if (settled) {
    settled.innerHTML = rooms.map((l) => {
      const rows = (l.lastResults || []).slice(0, 3).map((r) => {
        return `<div class="admin-result-row"><span>${escapeHtml(r.drawId || "—")}</span><b class="gold-text">${escapeHtml(adminLastResultLine(r, l.id))}</b></div>`;
      }).join("") || `<div class="admin-result-row">Chưa có lịch sử</div>`;
      const sim = isSimVnRoom(l.id) ? `<span class="admin-pill is-sim">Mô phỏng</span>` : "";
      return `<div class="admin-control-card admin-settled-card"><h4>${escapeHtml(adminRoomLabel(l.id))} ${sim}</h4>${rows}</div>`;
    }).join("");
  }
}

window.toggleAutoDraw = async function(lotteryId) {
  if (!lotteryId) {
    lotteryId = document.getElementById("settings-room-select")?.value;
  }
  const checkEl = document.getElementById(`auto-check-${lotteryId}`) || document.getElementById("admin-auto-draw-toggle");
  if (!lotteryId || !checkEl) {
    showToast("Quản trị", "Hãy chọn phòng trước", "danger");
    return;
  }
  const checked = checkEl.checked;
  const data = await apiCall("/api/admin/settings", "POST", {
    lotteryType: lotteryId,
    autoDraw: checked
  });
  if (data && data.success) {
    showToast("Đã lưu", `${adminRoomLabel(lotteryId)} tự quay: ${checked ? "bật" : "tắt"}`, "success");
    loadLotteries();
  }
};

window.saveAdminSettings = async function() {
  const rates = {
    "3top": Number(document.getElementById("rate-3top")?.value),
    "3toad": Number(document.getElementById("rate-3toad")?.value),
    "2top": Number(document.getElementById("rate-2top")?.value),
    "2bottom": Number(document.getElementById("rate-2bottom")?.value),
    run_top: Number(document.getElementById("rate-run-top")?.value),
    run_bottom: Number(document.getElementById("rate-run-bottom")?.value)
  };
  const vnRates = {
    lo: Number(document.getElementById("rate-lo")?.value),
    de: Number(document.getElementById("rate-de")?.value),
    "3cang": Number(document.getElementById("rate-3cang")?.value),
    dau: Number(document.getElementById("rate-dau")?.value),
    duoi: Number(document.getElementById("rate-duoi")?.value),
    xien2: Number(document.getElementById("rate-xien2")?.value),
    xien3: Number(document.getElementById("rate-xien3")?.value),
    xien4: Number(document.getElementById("rate-xien4")?.value)
  };
  const limits = {
    minBet: Number(document.getElementById("limit-min-bet")?.value),
    maxBet: Number(document.getElementById("limit-max-bet")?.value)
  };
  const siteNote = String(document.getElementById("admin-site-note")?.value || "").slice(0, 400);
  const rateRes = await apiCall("/api/admin/system-settings", "POST", { rates, vnRates, limits, siteNote });
  if (!rateRes || !rateRes.success) {
    showToast("Lưu thất bại", rateRes?.message || "Tỷ lệ", "danger");
    return;
  }
  const roomId = document.getElementById("settings-room-select")?.value;
  if (roomId) {
    const parseList = (id) => String(document.getElementById(id)?.value || "").split(",").map((s) => s.trim()).filter(Boolean);
    await apiCall("/api/admin/settings", "POST", {
      lotteryType: roomId,
      autoDraw: !!document.getElementById("admin-auto-draw-toggle")?.checked,
      blockedNumbers: parseList("blocked-numbers-input"),
      halfPayNumbers: parseList("half-pay-numbers-input"),
      drawTimeOfDay: String(document.getElementById("admin-draw-time")?.value || "").trim()
    });
  }
  Object.assign(THAI_RATES, rates);
  Object.assign(VN_RATES, vnRates);
  refreshRateTabLabels();
  showToast("Đã lưu", "Đã cập nhật tỷ lệ và giới hạn phòng", "success");
  const saved = document.getElementById("admin-settings-saved");
  if (saved) {
    saved.hidden = false;
    setTimeout(() => { saved.hidden = true; }, 4000);
  }
  loadLotteries();
};

window.saveBlockedNumbers = async function(lotteryId) {
  sound.playClick();
  const inputEl = document.getElementById(`blocked-input-${lotteryId}`);
  if (!inputEl) return;
  const list = inputEl.value.split(',').map(s => s.trim()).filter(s => s.length > 0 && !isNaN(s));
  const data = await apiCall("/api/admin/settings", "POST", { lotteryType: lotteryId, blockedNumbers: list });
  if (data && data.success) {
    showToast("Đã lưu", adminRoomLabel(lotteryId), "success");
    loadLotteries();
  }
};

window.saveHalfPayNumbers = async function(lotteryId) {
  sound.playClick();
  const inputEl = document.getElementById(`halfpay-input-${lotteryId}`);
  if (!inputEl) return;
  const list = inputEl.value.split(',').map(s => s.trim()).filter(s => s.length > 0 && !isNaN(s));
  const data = await apiCall("/api/admin/settings", "POST", { lotteryType: lotteryId, halfPayNumbers: list });
  if (data && data.success) {
    showToast("Đã lưu", adminRoomLabel(lotteryId), "success");
    loadLotteries();
  }
};

async function loadAdminUsers(more) {
  const tbody = document.getElementById("admin-users-table-body") || document.getElementById("admin-users-tbody");
  if (!tbody) return;
  if (!more) state.adminUserLimit = 25;
  tbody.innerHTML = `<tr><td colspan="5" class="no-data">Đang tải...</td></tr>`;

  const data = await apiCall("/api/admin/users");
  if (!(data && data.success)) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">Không tải được danh sách thành viên</td></tr>`;
    return;
  }
  const q = String(document.getElementById("admin-user-search")?.value || "").trim().toLowerCase();
  const stFilter = document.getElementById("admin-user-status")?.value || "all";
  const roleFilter = document.getElementById("admin-user-role")?.value || "all";
  const users = (data.users || []).filter((u) => {
    if (stFilter !== "all" && (u.status || "active") !== stFilter) return false;
    if (roleFilter !== "all" && (u.role || "user") !== roleFilter) return false;
    if (!q) return true;
    return String(u.username || "").toLowerCase().includes(q) || String(u.nickname || "").toLowerCase().includes(q);
  });
  const summary = document.getElementById("admin-users-summary");
  if (summary) {
    summary.innerHTML = adminMiniStats([
      { label: "Hiển thị", value: users.length },
      { label: "Tổng thành viên", value: (data.users || []).length },
      { label: "Đã khóa", value: (data.users || []).filter((u) => u.status === "banned").length }
    ]);
  }
  tbody.innerHTML = "";
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">Không có thành viên phù hợp</td></tr>`;
    const emptyMore = document.getElementById("admin-users-more");
    if (emptyMore) emptyMore.hidden = true;
    return;
  }
  const shown = users.slice(0, state.adminUserLimit || 25);
  const moreBtn = document.getElementById("admin-users-more");
  if (moreBtn) moreBtn.hidden = users.length <= shown.length;
  shown.forEach(u => {
    const isMe = (u.username === state.user.username);
    const safeUser = escapeHtml(u.username);
    const nick = displayNickname(u);
    const status = u.status || "active";
    const roleVi = u.role === "admin" ? "Quản trị" : "Thành viên";
    const statusVi = status === "banned" ? "Đã khóa" : "Hoạt động";
    const vip = u.vip || adminVipRank(u.exp);
    const tr = document.createElement("tr");
    // The action buttons carry the nickname in data attributes and are wired up
    // below rather than through onclick. A nickname is free text, and the
    // browser decodes entities in an attribute before handing the value to the
    // JavaScript parser, so an escaped quote inside onclick="fn('...')" still
    // closes the string and runs whatever follows it — in an admin's session.
    tr.innerHTML = `
      <td data-label="Tài khoản"><b>${safeUser}</b><div class="text-muted">${escapeHtml(nick)} · ${roleVi}</div></td>
      <td data-label="Số dư" class="gold-text">${Number(u.balance).toLocaleString()} CR</td>
      <td data-label="VIP">${escapeHtml(vip)} · ${Number(u.exp || 0).toLocaleString()} EXP</td>
      <td data-label="Trạng thái">${statusVi}</td>
      <td data-label="Thao tác">
        <button class="btn-action-table" type="button" data-user-action="credit">Tín dụng</button>
        <button class="btn-action-table" type="button" data-user-action="password">Mật khẩu</button>
        <button class="btn-action-table" type="button" data-user-action="status" ${isMe ? "disabled" : ""}>${status === "banned" ? "Mở khóa" : "Khóa"}</button>
        <button class="btn-action-table" type="button" data-user-action="delete" ${isMe ? "disabled" : ""}>Xóa</button>
      </td>
    `;
    tr.querySelectorAll("[data-user-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        switch (btn.dataset.userAction) {
          case "credit": openCreditModal(u.username, nick); break;
          case "password": openResetPasswordModal(u.username); break;
          case "status": toggleUserStatus(u.username, status); break;
          case "delete": deleteUserAccount(u.username); break;
        }
      });
    });
    tbody.appendChild(tr);
  });
}

window.toggleUserStatus = async function(username, currentStatus) {
  sound.playClick();
  const nextStatus = currentStatus === "banned" ? "active" : "banned";
  const data = await apiCall("/api/admin/users/status", "POST", { username, status: nextStatus });
  if (data && data.success) {
    showToast("Đã cập nhật", `${username} → ${nextStatus === "banned" ? "đã khóa" : "đang hoạt động"}`, "success");
    loadAdminUsers();
  }
};

window.deleteUserAccount = async function(username) {
  sound.playClick();
  if (!confirm(`Xóa vĩnh viễn tài khoản [${username}]?`)) return;
  const data = await apiCall(`/api/admin/users?username=${encodeURIComponent(username)}`, "DELETE");
  if (data && data.success) {
    showToast("Đã xóa", username, "success");
    loadAdminUsers();
  } else {
    showToast("Thất bại", data ? data.message : "Không xóa được tài khoản", "danger");
  }
};

function adminStatusVi(status) {
  if (status === "won") return "Trúng";
  if (status === "lost") return "Trượt";
  if (status === "pending") return "Đang chờ";
  if (status === "cancelled") return "Đã hủy";
  return status || "—";
}

async function loadAdminAllBets(more) {
  const tbody = document.getElementById("admin-bets-table-body") || document.getElementById("admin-bets-tbody");
  if (!tbody) return;
  if (!more) state.adminBetLimit = 25;
  tbody.innerHTML = `<tr><td colspan="7" class="no-data">Đang tải...</td></tr>`;

  const data = await apiCall("/api/admin/bets");
  if (!(data && data.success)) {
    tbody.innerHTML = `<tr><td colspan="7" class="no-data">Không tải được phiếu cược</td></tr>`;
    return;
  }
  const room = document.getElementById("admin-bets-room")?.value || "all";
  const st = document.getElementById("admin-bets-status")?.value || "all";
  const q = String(document.getElementById("admin-bets-search")?.value || "").trim().toLowerCase();
  let bets = (data.bets || []).filter((b) => !String(b.lotteryType || "").startsWith("game_"));
  if (room !== "all") bets = bets.filter((b) => b.lotteryType === room);
  if (st !== "all") bets = bets.filter((b) => b.status === st);
  if (q) {
    bets = bets.filter((b) => String(b.username || "").toLowerCase().includes(q) || String(b.nickname || "").toLowerCase().includes(q) || String(b.numbers || "").toLowerCase().includes(q) || String(b.drawId || "").toLowerCase().includes(q));
  }
  const pending = bets.filter((b) => b.status === "pending").length;
  const won = bets.filter((b) => b.status === "won").length;
  const stake = bets.reduce((s, b) => s + Number(b.amount || 0), 0);
  const payout = bets.reduce((s, b) => s + Number(b.payout || 0), 0);
  const summary = document.getElementById("admin-bets-summary");
  if (summary) {
    summary.innerHTML = adminMiniStats([
      { label: "Phiếu", value: bets.length },
      { label: "Đang chờ", value: pending },
      { label: "Trúng", value: won },
      { label: "Tổng cược", value: `${stake.toLocaleString()} CR` },
      { label: "Đã trả", value: `${payout.toLocaleString()} CR` }
    ]);
  }
  tbody.innerHTML = "";
  if (!bets.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="no-data">Chưa có phiếu cược phù hợp</td></tr>`;
    const emptyMore = document.getElementById("admin-bets-more");
    if (emptyMore) emptyMore.hidden = true;
    return;
  }
  const shownBets = bets.slice(0, state.adminBetLimit || 25);
  const moreBets = document.getElementById("admin-bets-more");
  if (moreBets) moreBets.hidden = bets.length <= shownBets.length;

  shownBets.forEach(b => {
    const safeId = escapeHtml(b.id || "");
    const canCancel = b.status === "pending" && b.id;
    const pay = Number(b.payout || 0);
    const payText = b.status === "won" ? `+${pay.toLocaleString()} CR` : (b.status === "pending" ? "Chưa chốt" : "0 CR");
    const drawTail = (b.drawId || "").split("-").pop() || "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Người chơi">${escapeHtml(b.nickname || b.username || "")}</td>
      <td data-label="Phòng">${escapeHtml(adminRoomLabel(b.lotteryType))}<div class="text-muted">${escapeHtml(drawTail)}</div></td>
      <td data-label="Loại / số">${escapeHtml(adminBetTypeLabel(b.betType))} <b class="gold-text">${escapeHtml(b.numbers || "")}</b></td>
      <td data-label="Mức cược">${Number(b.amount || 0).toLocaleString()} CR</td>
      <td data-label="Trả thưởng">${payText}</td>
      <td data-label="Trạng thái">${adminStatusBadge(b.status)}</td>
      <td data-label="Thao tác">${canCancel ? `<button class="btn-action-table" type="button" onclick="cancelAdminBet('${safeId}')">Hủy hoàn</button>` : "—"}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.loadAdminGames = async function() {
  const tbody = document.getElementById("admin-games-table-body");
  const catalog = document.getElementById("admin-games-catalog");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="no-data">Đang tải...</td></tr>`;
  const data = await apiCall("/api/admin/games");
  if (!(data && data.success)) {
    if (catalog) catalog.innerHTML = `<div class="admin-empty">Không tải được thống kê trò chơi</div>`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="no-data">Không tải được lịch sử trò chơi</td></tr>`;
    return;
  }
  if (catalog) {
    const q = String(document.getElementById("admin-games-search")?.value || "").trim().toLowerCase();
    const games = (data.games || []).filter((g) => !q || String(g.name || "").toLowerCase().includes(q));
    catalog.innerHTML = games.map((g) => `
      <div class="admin-game-card">
        <h4>${escapeHtml(g.name)}</h4>
        <div class="admin-control-meta">
          <div>Lượt chơi: <b>${Number(g.plays || 0).toLocaleString()}</b></div>
          <div>Tổng cược: <b>${Number(g.stake || 0).toLocaleString()} CR</b></div>
          <div>Trả thưởng: <b>${Number(g.payout || 0).toLocaleString()} CR</b></div>
        </div>
      </div>
    `).join("") || `<div class="admin-empty">Chưa có dữ liệu minigame</div>`;
  }
  if (!tbody) return;
  const recent = data.recent || [];
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">Chưa có lượt chơi mini game</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  recent.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Người chơi">${escapeHtml(b.nickname || b.username || "")}</td>
      <td data-label="Trò chơi">${escapeHtml(gameDisplayName(b.lotteryType))}</td>
      <td data-label="Mức cược">${Number(b.amount || 0).toLocaleString()} CR</td>
      <td data-label="Kết quả">${adminStatusBadge(b.status)}</td>
      <td data-label="Trả thưởng">${b.status === "won" ? `+${Number(b.payout || 0).toLocaleString()} CR` : "—"}</td>
    `;
    tbody.appendChild(tr);
  });
};

async function loadAdminFinanceRequests() {
  const list = document.getElementById("admin-finance-list");
  const tbody = document.getElementById("admin-finance-tbody");
  const data = await apiCall("/api/admin/finance");
  if (!(data && data.success)) {
    if (list) list.innerHTML = `<div class="admin-empty">Không tải được sổ tín dụng</div>`;
    return;
  }
  const typeFilter = document.getElementById("admin-finance-type")?.value || "all";
  const q = String(document.getElementById("admin-finance-search")?.value || "").trim().toLowerCase();
  let txs = data.transactions || data.requests || [];
  if (typeFilter !== "all") txs = txs.filter((r) => r.type === typeFilter);
  if (q) {
    txs = txs.filter((r) =>
      String(r.username || "").toLowerCase().includes(q)
      || String(r.note || "").toLowerCase().includes(q)
    );
  }
  const typeVi = (type) => ({
    add: "Cộng CR",
    deduct: "Trừ CR",
    bonus: "Thưởng",
    daily: "Thưởng ngày",
    adjust: "Điều chỉnh"
  }[type] || type || "—");
  const summary = document.getElementById("admin-finance-summary");
  if (summary) {
    const added = Number(data.summary?.added || 0);
    const deducted = Number(data.summary?.deducted || 0);
    summary.innerHTML = adminMiniStats([
      { label: "Bút toán", value: txs.length },
      { label: "Đã cộng / thưởng", value: `${added.toLocaleString()} CR` },
      { label: "Đã trừ", value: `${deducted.toLocaleString()} CR` }
    ]);
  }
  const html = txs.length === 0
    ? `<div class="admin-empty">Chưa có lịch sử tín dụng. Dùng form phía trên hoặc nút Tín dụng ở tab Thành viên.</div>`
    : txs.slice(0, 80).map((r) => {
      const sign = r.type === "deduct" ? "−" : "+";
      return `<div class="admin-control-card admin-ledger-card">
        <div class="admin-ledger-top">
          <b>${escapeHtml(r.username || "")}</b>
          <span class="admin-pill">${escapeHtml(typeVi(r.type))}</span>
        </div>
        <div class="gold-text">${sign}${Number(r.amount || 0).toLocaleString()} CR</div>
        <div class="text-muted">${escapeHtml(r.note || "Điều chỉnh CR")} · ${escapeHtml(adminFmtWhen(r.createdAt))}</div>
      </div>`;
    }).join("");
  if (list) list.innerHTML = html;
  if (tbody) tbody.innerHTML = `<tr><td colspan="7">${html}</td></tr>`;
}

window.processFinanceRequest = async function(id, status) {
  sound.playClick();
  const data = await apiCall("/api/admin/finance/process", "POST", { id, status });
  if (data && data.success) {
    showToast("Đã xử lý", status === "approve" ? "Đã duyệt" : "Đã từ chối", "success");
    loadAdminFinanceRequests();
  }
};

async function loadAdminSystemSettings() {
  const data = await apiCall("/api/admin/system-settings");
  if (!(data && data.success && data.settings)) return;
  const rates = data.settings.rates || {};
  const vn = data.settings.vnRates || {};
  const limits = data.settings.limits || {};
  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null && !Number.isNaN(value)) el.value = value;
  };
  setVal("rate-3top", rates["3top"] || 900);
  setVal("rate-3toad", rates["3toad"] || 150);
  setVal("rate-2top", rates["2top"] || 92);
  setVal("rate-2bottom", rates["2bottom"] || 92);
  setVal("rate-run-top", rates["run_top"] || 3.2);
  setVal("rate-run-bottom", rates["run_bottom"] || 4.2);
  setVal("rate-lo", vn.lo ?? VN_RATES.lo);
  setVal("rate-de", vn.de ?? VN_RATES.de);
  setVal("rate-3cang", vn["3cang"] ?? VN_RATES["3cang"]);
  setVal("rate-dau", vn.dau ?? VN_RATES.dau);
  setVal("rate-duoi", vn.duoi ?? VN_RATES.duoi);
  setVal("rate-xien2", vn.xien2 ?? VN_RATES.xien2);
  setVal("rate-xien3", vn.xien3 ?? VN_RATES.xien3);
  setVal("rate-xien4", vn.xien4 ?? VN_RATES.xien4);
  setVal("limit-min-bet", limits.minBet ?? 10);
  setVal("limit-max-bet", limits.maxBet ?? 50000);
  const noteEl = document.getElementById("admin-site-note");
  if (noteEl) noteEl.value = data.settings.siteNote || "";
  const noteBanner = document.getElementById("admin-site-note-banner");
  const note = String(data.settings.siteNote || "").trim();
  if (noteBanner) {
    noteBanner.hidden = !note;
    noteBanner.textContent = note;
  }
  loadAdminRoomSettings();
}

window.showMoreAdminUsers = function() {
  state.adminUserLimit = (state.adminUserLimit || 25) + 25;
  loadAdminUsers(true);
};

window.showMoreAdminBets = function() {
  state.adminBetLimit = (state.adminBetLimit || 25) + 25;
  loadAdminAllBets(true);
};

window.openAdminPendingBets = function() {
  const sel = document.getElementById("admin-bets-status");
  if (sel) sel.value = "pending";
  switchAdminTab("bets");
};

window.openAdminRoomBets = function(roomId) {
  const room = document.getElementById("admin-bets-room");
  const st = document.getElementById("admin-bets-status");
  if (room) room.value = roomId || "all";
  if (st) st.value = "pending";
  switchAdminTab("bets");
};

window.openAdminBannedUsers = function() {
  const sel = document.getElementById("admin-user-status");
  if (sel) sel.value = "banned";
  switchAdminTab("users");
}

window.loadAdminRoomSettings = async function() {
  const roomId = document.getElementById("settings-room-select")?.value;
  if (!roomId) return;
  const data = await apiCall(`/api/admin/room-settings?lotteryType=${encodeURIComponent(roomId)}`);
  if (!data || !data.success) return;
  const s = data.settings || {};
  const blocked = document.getElementById("blocked-numbers-input");
  const half = document.getElementById("half-pay-numbers-input");
  const auto = document.getElementById("admin-auto-draw-toggle");
  if (blocked) blocked.value = (s.blockedNumbers || []).join(",");
  if (half) half.value = (s.halfPayNumbers || []).join(",");
  if (auto) auto.checked = !!s.autoDraw;
  const drawTime = document.getElementById("admin-draw-time");
  if (drawTime) drawTime.value = s.drawTimeOfDay || "";
};

window.handleQuickCredit = async function() {
  const username = String(document.getElementById("finance-quick-username")?.value || "").trim();
  const action = document.getElementById("finance-quick-action")?.value || "add";
  const amount = Number(document.getElementById("finance-quick-amount")?.value);
  const note = document.getElementById("finance-quick-note")?.value || "";
  if (!username) {
    showToast("Thiếu tài khoản", "Nhập tên tài khoản cần điều chỉnh", "danger");
    return;
  }
  if (!amount || amount <= 0) {
    showToast("Số không hợp lệ", "Nhập số CR lớn hơn 0", "danger");
    return;
  }
  const data = await apiCall("/api/admin/credit", "POST", { username, action, amount, note });
  if (data && data.success) {
    showToast("Đã cập nhật tín dụng", `${username} · ${amount.toLocaleString()} CR`, "success");
    if (document.getElementById("finance-quick-amount")) document.getElementById("finance-quick-amount").value = "";
    loadAdminFinanceRequests();
    loadAdminUsers();
    loadAdminPanel();
  } else {
    showToast("Thất bại", data?.message || "Không điều chỉnh được tín dụng", "danger");
  }
};

window.switchAdminTab = function(tabName) {
  sound.playClick();
  state.activeAdminTab = tabName;
  document.querySelectorAll("#view-admin .quick-btn").forEach((btn) => {
    if (btn.getAttribute("onclick")?.includes("switchAdminTab")) {
      btn.classList.toggle("active", btn.getAttribute("onclick")?.includes(`'${tabName}'`));
    }
  });
  document.querySelectorAll("#view-admin .admin-tab-panel").forEach((panel) => {
    panel.style.display = "none";
  });
  const tabEl = document.getElementById(`admin-tab-content-${tabName}`) || document.getElementById(`admin-tab-${tabName}`);
  if (tabEl) tabEl.style.display = "block";

  if (tabName === "finance" || tabName === "finance-requests") loadAdminFinanceRequests();
  if (tabName === "settings" || tabName === "system-settings") loadAdminSystemSettings();
  if (tabName === "users") loadAdminUsers();
  if (tabName === "bets") loadAdminAllBets();
  if (tabName === "draws") renderAdminDrawControls();
  if (tabName === "number-stats" && typeof loadNumberStats === "function") loadNumberStats();
  if (tabName === "games") loadAdminGames();
};

// Modals
window.openModal = function(modalId) {
  sound.playClick();
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("active");
  modal.style.display = "flex";
};

window.closeModal = function(modalId) {
  sound.playClick();
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("active");
  modal.style.display = "none";
};

window.openCreditModal = function(username, nickname) {
  state.creditAdjustUsername = username;
  state.creditAdjustNickname = nickname;
  state.creditAdjustAction = "add";
  const userBox = document.getElementById("finance-credit-username") || document.getElementById("credit-modal-username");
  const nickBox = document.getElementById("credit-modal-nickname");
  if (userBox) {
    if ("value" in userBox) userBox.value = username;
    else userBox.innerText = username;
  }
  if (nickBox) nickBox.innerText = nickname || username;
  const amtBox = document.getElementById("finance-credit-amount") || document.getElementById("credit-amount");
  if (amtBox) amtBox.value = "";
  const actionBox = document.getElementById("finance-credit-action");
  if (actionBox) actionBox.value = "add";
  openModal("modal-credit");
};

window.syncManualDrawModalFields = function() {
  const roomId = document.getElementById("draw-modal-room")?.value;
  const live = (state.lotteries || []).find((l) => l.id === roomId);
  const idEl = document.getElementById("draw-modal-draw-id");
  if (idEl) idEl.value = live?.nextDrawId || state.manualDrawDrawId || "";
  state.manualDrawLotteryId = roomId;
  state.manualDrawDrawId = live?.nextDrawId || "";
  const thai = document.getElementById("draw-modal-thai-fields");
  const vn = document.getElementById("draw-modal-vn-fields");
  const isVn = isVnLotteryId(roomId) || live?.type === "vietlottery";
  if (thai) thai.style.display = isVn ? "none" : "block";
  if (vn) vn.style.display = isVn ? "block" : "none";
};

window.openManualDrawModal = function(lotteryId, drawId) {
  if (!lotteryId) {
    const first = (state.lotteries || [])[0];
    if (!first) {
      showToast("Quản trị", "Chưa có phòng xổ số để chốt tay", "danger");
      return;
    }
    lotteryId = first.id;
    drawId = first.nextDrawId;
  }
  state.manualDrawLotteryId = lotteryId;
  state.manualDrawDrawId = drawId || "";
  const roomEl = document.getElementById("draw-modal-room");
  if (roomEl) roomEl.value = lotteryId;
  const t3 = document.getElementById("draw-modal-top3");
  const b2 = document.getElementById("draw-modal-bottom2");
  const vndb = document.getElementById("draw-modal-vndb");
  if (t3) t3.value = "";
  if (b2) b2.value = "";
  if (vndb) vndb.value = "";
  syncManualDrawModalFields();
  openModal("modal-manual-draw");
};

window.handleConfirmCredit = async function() {
  const amount = parseInt((document.getElementById("finance-credit-amount") || document.getElementById("credit-amount"))?.value, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast("Số không hợp lệ", "Nhập số CR lớn hơn 0", "danger");
    return;
  }
  const action = document.getElementById("finance-credit-action")?.value || state.creditAdjustAction || "add";
  const note = document.getElementById("finance-credit-note")?.value || "";
  const data = await apiCall("/api/admin/credit", "POST", {
    username: state.creditAdjustUsername,
    action,
    amount,
    note
  });
  if (data && data.success) {
    showToast("Đã cập nhật tín dụng", `${state.creditAdjustUsername} · ${amount.toLocaleString()} CR`, "success");
    closeModal("modal-credit");
    loadAdminUsers();
    loadAdminFinanceRequests();
  } else {
    showToast("Thất bại", data?.message || "Không điều chỉnh được tín dụng", "danger");
  }
};

window.handleConfirmManualDraw = async function() {
  const roomId = document.getElementById("draw-modal-room")?.value || state.manualDrawLotteryId;
  if (!roomId) {
    showToast("Quản trị", "Hãy chọn phòng trước", "danger");
    return;
  }
  const live = (state.lotteries || []).find((l) => l.id === roomId);
  const isVn = isVnLotteryId(roomId) || live?.type === "vietlottery";
  let data;
  if (isVn) {
    const dbNumber = String(document.getElementById("draw-modal-vndb")?.value || "").trim();
    data = await apiCall("/api/admin/vn-draw", "POST", { lotteryType: roomId, db: dbNumber });
  } else {
    const top3 = String(document.getElementById("draw-modal-top3")?.value || "").trim();
    const bottom2 = String(document.getElementById("draw-modal-bottom2")?.value || "").trim();
    if (top3.length !== 3 || Number.isNaN(Number(top3))) {
      showToast("3 trên không hợp lệ", "Nhập đúng 3 chữ số", "danger");
      return;
    }
    if (bottom2.length !== 2 || Number.isNaN(Number(bottom2))) {
      showToast("2 dưới không hợp lệ", "Nhập đúng 2 chữ số", "danger");
      return;
    }
    data = await apiCall("/api/admin/manual-draw", "POST", {
      lotteryType: roomId,
      drawId: live?.nextDrawId || state.manualDrawDrawId,
      top3,
      bottom2
    });
  }

  if (data && data.success) {
    showToast("Đã chốt kỳ", adminRoomLabel(roomId), "success");
    closeModal("modal-manual-draw");
    loadLotteries();
    setTimeout(loadAdminPanel, 1000);
  } else {
    showToast("Chốt kỳ thất bại", data?.message || "Không chốt được kỳ", "danger");
  }
};

window.handleCreateUser = async function() {
  const username = String(document.getElementById("admin-new-username")?.value || "").trim();
  const nickname = String(document.getElementById("admin-new-nickname")?.value || "").trim();
  const password = String(document.getElementById("admin-new-password")?.value || "");
  const balance = Number(document.getElementById("admin-new-balance")?.value);
  const role = document.getElementById("admin-new-role")?.value || "user";
  if (!username || !password) {
    showToast("Thiếu thông tin", "Nhập tài khoản và mật khẩu", "danger");
    return;
  }
  const data = await apiCall("/api/admin/users", "POST", { username, nickname, password, balance, role });
  if (data && data.success) {
    showToast("Đã tạo thành viên", username, "success");
    ["admin-new-username", "admin-new-nickname", "admin-new-password"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    loadAdminUsers();
    loadAdminPanel();
  } else {
    showToast("Không tạo được", data?.message || "Tạo tài khoản thất bại", "danger");
  }
};

window.openResetPasswordModal = function(username) {
  const box = document.getElementById("reset-password-username");
  const pass = document.getElementById("reset-password-value");
  if (box) box.value = username;
  if (pass) pass.value = "";
  openModal("modal-reset-password");
};

window.handleResetPassword = async function() {
  const username = String(document.getElementById("reset-password-username")?.value || "").trim();
  const password = String(document.getElementById("reset-password-value")?.value || "");
  if (!username || password.length < 6) {
    showToast("Mật khẩu không hợp lệ", "Mật khẩu tối thiểu 6 ký tự", "danger");
    return;
  }
  const data = await apiCall("/api/admin/users/password", "POST", { username, password });
  if (data && data.success) {
    showToast("Đã đặt lại mật khẩu", username, "success");
    closeModal("modal-reset-password");
  } else {
    showToast("Thất bại", data?.message || "Không đổi được mật khẩu", "danger");
  }
};

window.cancelAdminBet = async function(betId) {
  if (!betId) return;
  if (!confirm("Hủy phiếu này và hoàn CR cho người chơi?")) return;
  const data = await apiCall("/api/admin/bets/cancel", "POST", { betId });
  if (data && data.success) {
    showToast("Đã hủy phiếu", "Đã hoàn tín dụng", "success");
    loadAdminAllBets();
    loadAdminUsers();
    loadAdminPanel();
  } else {
    showToast("Không hủy được", data?.message || "Hủy phiếu thất bại", "danger");
  }
};

// Finance Deposit/Withdraw Modal Handlers
state.financeType = "deposit";

window.openFinanceModal = function() {
  showToast(t("cash_off"), t("min_cr"), "info");
};

window.submitFinanceRequest = async function() {
  showToast(t("cash_off"), t("api_no_cr"), "info");
};

window.openDrawResultsModal = async function(lotteryId) {
  await showDrawResultsHistory(lotteryId);
};

window.showDrawResultsHistory = async function(lotteryId) {
  sound.playClick();
  await syncLotteryById(lotteryId);
  const lottery = (state.lotteries || []).find((l) => l.id === lotteryId);
  const name = roomLabel(lotteryId);
  const heading = document.getElementById("draw-results-heading");
  if (heading) heading.textContent = `${t("history_short")} · ${name}`;

  const results = lottery?.lastResults || [];
  const content = document.getElementById("modal-draw-results-content");
  if (content) {
    if (!results.length) {
      content.innerHTML = `<p>${escapeHtml(t("no_hist"))}</p>`;
    } else if (lottery.type === "vietlottery") {
      content.innerHTML = results.slice(0, 15).map((r) => {
        const db = r.prizes?.db || "-----";
        const drawTail = (r.drawId || "").split("-").pop();
        return `<div class="vn-history-item"><span class="vn-history-draw-id">${escapeHtml(drawTail)}</span> ${escapeHtml(t("prize_db"))}: <span class="vn-history-db">${escapeHtml(String(db))}</span></div>`;
      }).join("");
    } else {
      content.innerHTML = results.slice(0, 15).map((r) => {
        const top3 = r.numbers?.top3 || r.top3 || "---";
        const bot2 = r.numbers?.bottom2 || r.bottom2 || "--";
        const drawTail = (r.drawId || "").split("-").pop();
        return `<div class="draw-hist-row" style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);">
          <b>${escapeHtml(drawTail)}</b>
          <span>${escapeHtml(t("top3"))} <b class="gold-text">${escapeHtml(top3)}</b></span>
          <span>${escapeHtml(t("bot2"))} <b>${escapeHtml(bot2)}</b></span>
        </div>`;
      }).join("");
    }
  }
  openModal("modal-draw-results");
};

// Mini Games Client Logic
state.coinHistory = [];
state.hiloHistory = [];
state.selectedCoinSide = null;
state.selectedHiloType = null;

window.initCoinFlipGame = function() {
  const amt = document.getElementById("coin-amount-input");
  if (amt && !amt.value) amt.value = "10";
  if (!state.selectedCoinSide) state.selectedCoinSide = "head";
  const hBtn = document.getElementById("coin-btn-head");
  const tBtn = document.getElementById("coin-btn-tail");
  if (hBtn) hBtn.classList.toggle("active", state.selectedCoinSide === "head");
  if (tBtn) tBtn.classList.toggle("active", state.selectedCoinSide === "tail");
  const coin = document.getElementById("coin-anim");
  if (coin) {
    coin.classList.toggle("is-head", state.selectedCoinSide === "head");
    coin.classList.toggle("is-tail", state.selectedCoinSide === "tail");
  }
  renderCoinHistory();
};

window.selectCoinSide = function(side) {
  sound.playClick();
  state.selectedCoinSide = side;
  const hBtn = document.getElementById("coin-btn-head");
  const tBtn = document.getElementById("coin-btn-tail");
  const coin = document.getElementById("coin-anim");
  if (side === "head") {
    if (hBtn) hBtn.classList.add("active");
    if (tBtn) tBtn.classList.remove("active");
    if (coin) { coin.classList.remove("is-tail"); coin.classList.add("is-head"); }
  } else {
    if (hBtn) hBtn.classList.remove("active");
    if (tBtn) tBtn.classList.add("active");
    if (coin) { coin.classList.remove("is-head"); coin.classList.add("is-tail"); }
  }
};

window.playCoinFlip = async function() {
  if (!state.selectedCoinSide) {
    showToast(t("pick_side"), t("pick_coin"), "danger");
    return;
  }
  const amount = parseInt(document.getElementById("coin-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }
  const spinBtn = document.getElementById("btn-spin-coin");
  spinBtn.disabled = true;
  spinBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const data = await apiCall("/api/games/coinflip", "POST", { betOn: state.selectedCoinSide, amount });
  const coinFace = document.getElementById("coin-anim");
  if (coinFace) {
    coinFace.classList.add("is-flipping");
    coinFace.classList.remove("is-head", "is-tail");
  }
  setTimeout(() => {
    spinBtn.disabled = false;
    spinBtn.innerHTML = t("play");
    if (coinFace) {
      coinFace.classList.remove("is-flipping");
      coinFace.classList.toggle("is-head", data?.result === "head");
      coinFace.classList.toggle("is-tail", data?.result === "tail");
    }

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();
      
      const statusMsg = document.getElementById("coin-status-msg");
      const resultLabel = data.result === "head" ? t("coin_head") : t("coin_tail");
      if (data.win) {
        if (statusMsg) statusMsg.innerText = `${t("g_win")} [${resultLabel}] +${data.payout.toLocaleString()} CR`;
        showToast(t("g_win"), `${resultLabel} ×1.95`, "success");
        sound.playWin();
      } else {
        if (statusMsg) statusMsg.innerText = `${t("g_lose")} [${resultLabel}]`;
        sound.playError();
      }

      state.coinHistory.unshift({
        time: new Date().toLocaleTimeString(),
        bet: state.selectedCoinSide === "head" ? t("coin_head") : t("coin_tail"),
        amount,
        result: resultLabel,
        win: data.win,
        payout: data.payout
      });
      if (state.coinHistory.length > 10) state.coinHistory.pop();
      renderCoinHistory();
    }
  }, 1200);
};

function renderCoinHistory() {
  const container = document.getElementById("coin-history-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.coinHistory.length === 0) {
    return;
  }
  state.coinHistory.forEach(h => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span>${escapeHtml(t("hist_outcome"))}: <b class="gold-text">${escapeHtml(h.result)}</b></span>
        <span class="text-muted">${escapeHtml(t("hist_stake"))}: ${escapeHtml(h.bet)} (${h.amount} CR)</span>
      </div>
      <div>${h.win ? `<b class="green-text">+${h.payout} CR</b>` : `<span class="danger-text">${escapeHtml(t("g_lose"))}</span>`}</div>
    `;
    container.appendChild(div);
  });
}

window.initHiloGame = function() {
  const amt = document.getElementById("hilo-amount-input");
  if (amt && !amt.value) amt.value = "10";
  if (!state.selectedHiloType) state.selectedHiloType = "high";
  const sel = document.getElementById("hilo-type-select");
  if (sel) sel.value = state.selectedHiloType;
  document.querySelectorAll(".hilo-opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `hilo-btn-${state.selectedHiloType}`);
  });
  renderHiloHistory();
};

window.selectHiloType = function(type) {
  sound.playClick();
  state.selectedHiloType = type;
  const sel = document.getElementById("hilo-type-select");
  if (sel) sel.value = type;
  document.querySelectorAll(".hilo-opt-btn").forEach(btn => btn.classList.remove("active"));
  const btn = document.getElementById(`hilo-btn-${type}`);
  if (btn) btn.classList.add("active");
};

window.playHilo = async function() {
  const selected = document.getElementById("hilo-type-select")?.value || state.selectedHiloType;
  if (selected) state.selectedHiloType = selected;
  if (!state.selectedHiloType) {
    showToast(t("pick_side"), "High / Low / 11 / Triple", "danger");
    return;
  }
  const amount = parseInt(document.getElementById("hilo-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }
  const shakeBtn = document.getElementById("btn-shake-hilo");
  shakeBtn.disabled = true;
  shakeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const data = await apiCall("/api/games/hilo", "POST", { betType: state.selectedHiloType, amount });
  setTimeout(() => {
    shakeBtn.disabled = false;
    shakeBtn.innerHTML = t("play");
    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();
      
      const d1 = document.getElementById("hilo-d1");
      const d2 = document.getElementById("hilo-d2");
      const d3 = document.getElementById("hilo-d3");
      const faces = ["", "\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
      if (d1) { d1.className = `lux-die dice-val-${data.dice[0]}`; d1.textContent = faces[data.dice[0]] || String(data.dice[0]); }
      if (d2) { d2.className = `lux-die dice-val-${data.dice[1]}`; d2.textContent = faces[data.dice[1]] || String(data.dice[1]); }
      if (d3) { d3.className = `lux-die dice-val-${data.dice[2]}`; d3.textContent = faces[data.dice[2]] || String(data.dice[2]); }

      if (data.win) {
        showToast(t("g_win"), `${data.total} (+${data.payout} CR)`, "success");
        sound.playWin();
      } else {
        showToast(t("g_lose"), String(data.total), "danger");
        sound.playError();
      }

      state.hiloHistory.unshift({
        time: new Date().toLocaleTimeString("th-TH"),
        bet: state.selectedHiloType,
        amount,
        dice: data.dice,
        total: data.total,
        win: data.win,
        payout: data.payout
      });
      if (state.hiloHistory.length > 10) state.hiloHistory.pop();
      renderHiloHistory();
    }
  }, 1200);
};

function renderHiloHistory() {
  const container = document.getElementById("hilo-history-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.hiloHistory.length === 0) {
    return;
  }
  state.hiloHistory.forEach(h => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span>${escapeHtml(t("hist_outcome"))}: <b class="gold-text">${escapeHtml(h.dice.join("+"))} = ${h.total}</b></span>
        <span class="text-muted">${escapeHtml(t("hist_stake"))}: ${escapeHtml(String(h.bet))} (${h.amount} CR)</span>
      </div>
      <div>${h.win ? `<b class="green-text">+${h.payout} CR</b>` : `<span class="danger-text">${escapeHtml(t("g_lose"))}</span>`}</div>
    `;
    container.appendChild(div);
  });
}

// ======================== LUCKY WHEEL MINI GAME ========================
state.wheelHistory = [];

window.initWheelGame = function() {
  renderWheelHistory();
};

window.playLuckyWheel = async function() {
  const amount = parseInt(document.getElementById("wheel-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }

  const spinBtn = document.getElementById("btn-spin-wheel");
  spinBtn.disabled = true;
  spinBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const disc = document.getElementById("wheel-disc");
  const data = await apiCall("/api/games/wheel", "POST", { amount });
  if (disc && data && data.success) {
    const slice = 360 / 7;
    const target = 1440 + (360 - ((data.chosenIndex + 0.5) * slice));
    disc.style.transition = "none";
    disc.style.transform = "rotate(0deg)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        disc.style.transition = "transform 2.4s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
        disc.style.transform = `rotate(${target}deg)`;
      });
    });
  }
  setTimeout(() => {
    spinBtn.disabled = false;
    spinBtn.innerHTML = t("play");

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      const statusMsg = document.getElementById("wheel-status-msg");
      if (data.win) {
        if (statusMsg) statusMsg.innerText = `${t("g_win")} [${data.chosen.label}] +${data.payout.toLocaleString()} CR`;
        showToast(t("g_win"), `${data.chosen.label} +${data.payout.toLocaleString()} CR`, "success");
        sound.playWin();
      } else {
        if (statusMsg) statusMsg.innerText = `${data.chosen.label} ${data.payout} CR`;
        sound.playCoin();
      }

      state.wheelHistory.unshift({
        time: new Date().toLocaleTimeString("th-TH"),
        amount,
        label: data.chosen.label,
        win: data.win,
        payout: data.payout
      });
      if (state.wheelHistory.length > 10) state.wheelHistory.pop();
      renderWheelHistory();
    }
  }, 2500);
};

function renderWheelHistory() {
  const container = document.getElementById("wheel-history-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.wheelHistory.length === 0) {
    return;
  }
  state.wheelHistory.forEach(h => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span>วงล้อตกช่อง: <b class="gold-text">${h.label}</b></span>
        <span class="text-muted">เดิมพัน: ${h.amount} CR</span>
      </div>
      <div><b class="${h.win ? 'green-text' : 'gold-text'}">+${h.payout} CR</b></div>
    `;
    container.appendChild(div);
  });
}

// ======================== DRAGON TIGER MINI GAME ========================
state.selectedDragonTigerSide = null;
state.dtHistory = [];

window.initDragonTigerGame = function() {
  const amt = document.getElementById("dt-amount-input");
  if (amt && !amt.value) amt.value = "10";
  if (!state.selectedDragonTigerSide) state.selectedDragonTigerSide = "dragon";
  document.querySelectorAll("#dt-btn-dragon, #dt-btn-tie, #dt-btn-tiger").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `dt-btn-${state.selectedDragonTigerSide}`);
  });
  const status = document.getElementById("dt-status-msg");
  const sideKey = { dragon: "dt_dragon", tiger: "dt_tiger", tie: "dt_tie" }[state.selectedDragonTigerSide];
  if (status && sideKey) status.innerText = t(sideKey);
  renderDragonTigerHistory();
};

window.selectDragonTigerSide = function(side) {
  sound.playClick();
  state.selectedDragonTigerSide = side;
  document.querySelectorAll("#view-game-dragontiger .hilo-opt-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll("#dt-btn-dragon, #dt-btn-tie, #dt-btn-tiger").forEach((btn) => btn.classList.remove("active"));
  const btn = document.getElementById(`dt-btn-${side}`);
  if (btn) btn.classList.add("active");
  const status = document.getElementById("dt-status-msg");
  if (status) status.innerText = side === "dragon" ? "Dragon" : (side === "tiger" ? "Tiger" : "Tie");
};

window.playDragonTiger = async function() {
  if (!state.selectedDragonTigerSide) {
    showToast(t("pick_side"), t("pick_dt"), "danger");
    return;
  }
  const amount = parseInt(document.getElementById("dt-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }

  const playBtn = document.getElementById("btn-play-dt");
  playBtn.disabled = true;
  playBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const dCard = document.getElementById("dt-dragon-card");
  const tCard = document.getElementById("dt-tiger-card");
  if (dCard) { dCard.className = "lux-playing-card lux-card-back"; dCard.textContent = ""; }
  if (tCard) { tCard.className = "lux-playing-card lux-card-back"; tCard.textContent = ""; }

  const data = await apiCall("/api/games/dragontiger", "POST", { betType: state.selectedDragonTigerSide, amount });
  setTimeout(() => {
    playBtn.disabled = false;
    playBtn.innerHTML = t("play");

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      if (dCard) { dCard.className = "lux-playing-card"; dCard.textContent = `${data.dragonCard.rank}${data.dragonCard.suit}`; }
      if (tCard) { tCard.className = "lux-playing-card"; tCard.textContent = `${data.tigerCard.rank}${data.tigerCard.suit}`; }

      const statusMsg = document.getElementById("dt-status-msg");
      let winnerLabel = data.result === "dragon" ? "Dragon" : (data.result === "tiger" ? "Tiger" : "Tie");
      
      if (data.win) {
        if (statusMsg) statusMsg.innerText = `${t("g_win")} [${winnerLabel}] +${data.payout.toLocaleString()} CR`;
        showToast(t("g_win"), `${winnerLabel} +${data.payout.toLocaleString()} CR`, "success");
        sound.playWin();
      } else {
        if (statusMsg) statusMsg.innerText = `${t("g_lose")} [${winnerLabel}]`;
        sound.playError();
      }

      state.dtHistory.unshift({
        time: new Date().toLocaleTimeString("th-TH"),
        bet: state.selectedDragonTigerSide,
        amount,
        dragon: `${data.dragonCard.rank}${data.dragonCard.suit}`,
        tiger: `${data.tigerCard.rank}${data.tigerCard.suit}`,
        result: data.result,
        win: data.win,
        payout: data.payout
      });
      if (state.dtHistory.length > 10) state.dtHistory.pop();
      renderDragonTigerHistory();
    }
  }, 1200);
};

function renderDragonTigerHistory() {
  const container = document.getElementById("dt-history-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.dtHistory.length === 0) {
    return;
  }
  state.dtHistory.forEach(h => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span>ไพ่: <b class="danger-text">🐉 ${h.dragon}</b> VS <b class="gold-text">🐅 ${h.tiger}</b></span>
        <span class="text-muted">แทง: ${h.bet} (${h.amount} CR)</span>
      </div>
      <div>${h.win ? `<b class="green-text">+${h.payout} CR</b>` : `<span class="danger-text">เสีย</span>`}</div>
    `;
    container.appendChild(div);
  });
}

// ======================== SLOT 777 MACHINE MINI GAME ========================
state.slotHistory = [];

window.initSlotGame = function() {
  const amt = document.getElementById("slot-amount-input");
  if (amt && !amt.value) amt.value = "10";
  renderSlotHistory();
};

window.playSlotMachine = async function() {
  const amount = parseInt(document.getElementById("slot-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }

  const spinBtn = document.getElementById("btn-spin-slot");
  spinBtn.disabled = true;
  spinBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const r1 = document.getElementById("slot-reel-1");
  const r2 = document.getElementById("slot-reel-2");
  const r3 = document.getElementById("slot-reel-3");
  if (r1) r1.className = "slot-reel slot-spinning";
  if (r2) r2.className = "slot-reel slot-spinning";
  if (r3) r3.className = "slot-reel slot-spinning";

  const data = await apiCall("/api/games/slot", "POST", { amount });
  setTimeout(() => {
    spinBtn.disabled = false;
    spinBtn.innerHTML = t("play");

    const SLOT_ICON = { "7": "7", DIA: "◆", STAR: "★", BELL: "♪", CHERRY: "●", LEMON: "○" };
    const icon = (sym) => SLOT_ICON[sym] || sym;
    if (r1) { r1.className = "slot-reel"; r1.innerText = icon(data.reels[0]); }
    if (r2) { r2.className = "slot-reel"; r2.innerText = icon(data.reels[1]); }
    if (r3) { r3.className = "slot-reel"; r3.innerText = icon(data.reels[2]); }

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      const statusMsg = document.getElementById("slot-status-msg");
      if (data.win) {
        if (statusMsg) statusMsg.innerText = `${t("g_win")} [${data.reels.join(" ")}] +${data.payout.toLocaleString()} CR (x${data.rate})`;
        showToast(t("g_win"), `${data.reels.join(" ")} x${data.rate} (+${data.payout.toLocaleString()} CR)`, "success");
        sound.playWin();
      } else {
        if (statusMsg) statusMsg.innerText = `${t("g_lose")} [${data.reels.join(" ")}]`;
        sound.playError();
      }

      state.slotHistory.unshift({
        time: new Date().toLocaleTimeString("th-TH"),
        amount,
        reels: data.reels.join(" "),
        win: data.win,
        payout: data.payout
      });
      if (state.slotHistory.length > 10) state.slotHistory.pop();
      renderSlotHistory();
    }
  }, 1500);
};

function renderSlotHistory() {
  const container = document.getElementById("slot-history-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.slotHistory.length === 0) {
    return;
  }
  state.slotHistory.forEach(h => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-meta">
        <span>${escapeHtml(t("hist_outcome"))}: <b class="gold-text">${escapeHtml(h.reels)}</b></span>
        <span class="text-muted">${escapeHtml(t("hist_stake"))}: ${h.amount} CR</span>
      </div>
      <div>${h.win ? `<b class="green-text">+${h.payout} CR</b>` : `<span class="danger-text">${escapeHtml(t("g_lose"))}</span>`}</div>
    `;
    container.appendChild(div);
  });
}

// ======================== MINES BOMB SWEEPER MINI GAME ========================
state.minesActive = false;
state.minesCurrentRate = 1.0;
state.minesCurrentPayout = 0;

window.initMinesGame = function() {
  const amt = document.getElementById("mines-amount-input");
  if (amt && !amt.value) amt.value = "10";
  renderMinesGridInitial();
};

function renderMinesGridInitial() {
  const grid = document.getElementById("mines-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 25; i++) {
    const btn = document.createElement("button");
    btn.className = "mines-tile";
    btn.innerHTML = "<i class=\"fa-solid fa-question\"></i>";
    btn.disabled = true;
    grid.appendChild(btn);
  }
}

window.startMinesGame = async function() {
  const amount = parseInt(document.getElementById("mines-amount-input").value);
  const bombsCount = parseInt(document.getElementById("mines-count-select").value);

  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "danger");
    return;
  }

  const startBtn = document.getElementById("btn-start-mines");
  const cashoutBtn = document.getElementById("btn-cashout-mines");

  startBtn.disabled = true;
  startBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;

  const data = await apiCall("/api/games/mines", "POST", { action: "start", amount, bombsCount });
  startBtn.disabled = false;
  startBtn.innerHTML = t("play");

  if (data && data.success) {
    state.minesActive = true;
    state.minesCurrentRate = 1.0;
    state.minesCurrentPayout = 0;
    state.user.balance = data.newBalance;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();

    document.getElementById("mines-current-rate").innerText = "x1.00";
    document.getElementById("mines-cashout-amt").innerText = "0 CR";
    cashoutBtn.disabled = true;
    document.getElementById("mines-status-msg").innerText = t("playing");

    // Build interactive 5x5 grid
    const grid = document.getElementById("mines-grid");
    grid.innerHTML = "";
    for (let i = 0; i < 25; i++) {
      const btn = document.createElement("button");
      btn.className = "mines-tile mines-tile-active";
      btn.innerHTML = "<i class=\"fa-solid fa-question\"></i>";
      btn.onclick = () => revealMinesTile(i, btn);
      grid.appendChild(btn);
    }
  }
};

async function revealMinesTile(index, tileBtn) {
  if (!state.minesActive || tileBtn.disabled) return;
  sound.playClick();
  tileBtn.disabled = true;

  const data = await apiCall("/api/games/mines", "POST", { action: "reveal", tileIndex: index });
  if (data && data.success) {
    if (data.isBomb) {
      sound.playError();
      tileBtn.innerHTML = "<i class=\"fa-solid fa-burst\"></i>";
      tileBtn.className = "mines-tile mines-tile-bomb";
      state.minesActive = false;
      document.getElementById("btn-cashout-mines").disabled = true;
      document.getElementById("mines-status-msg").innerText = t("g_lose");
      showToast(t("g_lose"), "💣", "danger");

      // Reveal all tiles
      const grid = document.getElementById("mines-grid");
      const tiles = grid.querySelectorAll(".mines-tile");
      data.fullGrid.forEach((type, idx) => {
        if (tiles[idx]) {
          tiles[idx].disabled = true;
          if (type === "bomb") {
            tiles[idx].innerHTML = "<i class=\"fa-solid fa-burst\"></i>";
            tiles[idx].className = "mines-tile mines-tile-bomb";
          } else {
            tiles[idx].innerHTML = "<i class=\"fa-solid fa-gem\"></i>";
            tiles[idx].className = "mines-tile mines-tile-gem";
          }
        }
      });
    } else {
      sound.playCoin();
      tileBtn.innerHTML = "<i class=\"fa-solid fa-gem\"></i>";
      tileBtn.className = "mines-tile mines-tile-gem";
      
      state.minesCurrentRate = data.rate;
      state.minesCurrentPayout = data.currentPayout;

      document.getElementById("mines-current-rate").innerText = `x${data.rate.toFixed(2)}`;
      document.getElementById("mines-cashout-amt").innerText = `${data.currentPayout.toLocaleString()} CR`;
      document.getElementById("btn-cashout-mines").disabled = false;
      document.getElementById("mines-status-msg").innerText = `${data.currentPayout.toLocaleString()} CR`;
    }
  }
}

window.cashoutMines = async function() {
  if (!state.minesActive) return;
  sound.playClick();
  
  const cashoutBtn = document.getElementById("btn-cashout-mines");
  cashoutBtn.disabled = true;

  const data = await apiCall("/api/games/mines", "POST", { action: "cashout" });
  if (data && data.success) {
    state.minesActive = false;
    state.user.balance = data.newBalance;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();

    showToast(t("cashout"), `+${data.payout.toLocaleString()} CR`, "success");
    sound.playWin();
    document.getElementById("mines-status-msg").innerText = `${t("cashout")} +${data.payout.toLocaleString()} CR`;

    // Reveal all tiles
    const grid = document.getElementById("mines-grid");
    const tiles = grid.querySelectorAll(".mines-tile");
    data.fullGrid.forEach((type, idx) => {
      if (tiles[idx]) {
        tiles[idx].disabled = true;
        if (type === "bomb") {
          tiles[idx].innerHTML = "<i class=\"fa-solid fa-burst\"></i>";
          tiles[idx].className = "mines-tile mines-tile-bomb";
        } else {
          tiles[idx].innerHTML = "<i class=\"fa-solid fa-gem\"></i>";
          tiles[idx].className = "mines-tile mines-tile-gem";
        }
      }
    });
  }
};

// Attach Event Listeners on DOM load
document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/health").then((r) => r.json()).then((h) => {
    const n = Array.isArray(h?.rooms) ? h.rooms.length : 0;
    if (n) {
      const el = document.getElementById("auth-rooms-count");
      if (el) el.textContent = String(n);
    }
  }).catch(() => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js?v=7").then((reg) => {
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            sw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch((error) => console.warn("Service worker registration failed:", error));
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (state._swReloaded) return;
      state._swReloaded = true;
      location.reload();
    });
  }
  setupPwaInstall();
  // Check user session
  if (state.token && state.user) {
    updateUserProfileBar();
    apiCall("/api/user/profile").then((me) => {
      if (me?.success && me.user) {
        state.user = { ...state.user, ...me.user };
        localStorage.setItem("user", JSON.stringify(state.user));
        updateUserProfileBar();
      }
      if (!state.token) {
        setTimeout(hideLoadingScreen, 100);
        return;
      }
      const fromHash = viewFromHash();
      switchView(fromHash && fromHash !== "auth" ? fromHash : "lobby");
      setTimeout(hideLoadingScreen, 100);
    });
  } else {
    logout();
  }

  window.addEventListener("hashchange", () => {
    if (!state.token) return;
    const fromHash = viewFromHash();
    if (fromHash && fromHash !== state.activeView && fromHash !== "auth") {
      switchView(fromHash);
    }
  });

  GAME_STAKE_INPUTS.forEach(attachStakeChips);
  upgradeGameShells();
  applyI18n();
  document.getElementById("lang-toggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang]");
    if (btn) setSoklarpLang(btn.getAttribute("data-lang"));
  });
  document.getElementById("chat-input-text")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatMessage();
    }
  });
  document.getElementById("form-change-password")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("pw-current")?.value;
    const newPassword = document.getElementById("pw-new")?.value;
    const data = await apiCall("/api/auth/password", "POST", { currentPassword, newPassword });
    if (data?.success) {
      showToast(t("password"), data.message, "success");
      closeModal("modal-password");
      e.target.reset();
    }
  });

  // Auth Forms submission listeners
  const loginForm = document.getElementById("form-login");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userEl = document.getElementById("login-username");
      const passEl = document.getElementById("login-password");

      const data = await apiCall("/api/auth/login", "POST", {
        username: userEl.value,
        password: passEl.value
      });

      if (data && data.success) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        userEl.value = "";
        passEl.value = "";
        
        showToast(t("login_ok"), displayNickname(data.user), "success");
        updateUserProfileBar();
        switchView("lobby"); setTimeout(hideLoadingScreen, 100);
      } else {
        showToast(t("login_fail"), data ? data.message : t("login_fail"), "danger");
      }
    });
  }

  const regForm = document.getElementById("form-register");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userEl = document.getElementById("reg-username");
      const nickEl = document.getElementById("reg-nickname");
      const passEl = document.getElementById("reg-password");

      const data = await apiCall("/api/auth/register", "POST", {
        username: userEl.value,
        nickname: nickEl.value,
        password: passEl.value
      });

      if (data && data.success) {
        showToast(t("register_ok"), data.message, "success");
        userEl.value = "";
        nickEl.value = "";
        passEl.value = "";
        switchAuthTab("login");
      } else {
        showToast(t("register_fail"), data ? data.message : t("register_fail"), "danger");
      }
    });
  }

  // Header Buttons
  const btnRefresh = document.getElementById("btn-refresh-balance");
  if (btnRefresh) btnRefresh.addEventListener("click", () => { refreshBalance(); sound.playClick(); });
  
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", () => logout());

  const btnAdminView = document.getElementById("btn-admin-view");
  if (btnAdminView) btnAdminView.addEventListener("click", () => switchView("admin"));

  // Keypad
  document.querySelectorAll(".keypad-btn[data-val]").forEach(btn => {
    btn.addEventListener("click", () => handleKeypadPress(btn.dataset.val));
  });

  const kpClear = document.getElementById("keypad-clear");
  if (kpClear) kpClear.addEventListener("click", () => {
    sound.playClick();
    state.currentBetInput = "";
    document.getElementById("bet-number-input").value = "";
  });

  const kpDel = document.getElementById("keypad-delete");
  if (kpDel) kpDel.addEventListener("click", () => {
    sound.playClick();
    state.currentBetInput = state.currentBetInput.slice(0, -1);
    document.getElementById("bet-number-input").value = state.currentBetInput;
  });

  // Cart action triggers
  const btnAddToCart = document.getElementById("btn-add-to-cart");
  if (btnAddToCart) btnAddToCart.addEventListener("click", addToCart);
  
  const btnClearCart = document.getElementById("btn-clear-cart");
  if (btnClearCart) btnClearCart.addEventListener("click", clearCart);

  const btnSubmitBets = document.getElementById("btn-submit-bets");
  if (btnSubmitBets) btnSubmitBets.addEventListener("click", submitBets);

  // Return to Lobby triggers
  const btnBetBack = document.getElementById("btn-bet-back");
  if (btnBetBack) btnBetBack.addEventListener("click", () => switchView("lobby"));

  const btnHistBack = document.getElementById("btn-history-back");
  if (btnHistBack) btnHistBack.addEventListener("click", () => switchView("lobby"));

  const btnAdminBack = document.getElementById("btn-admin-back");
  if (btnAdminBack) btnAdminBack.addEventListener("click", () => switchView("lobby"));

  const btnGoHist = document.getElementById("btn-go-history");
  if (btnGoHist) btnGoHist.addEventListener("click", () => switchView("history"));

  // Initial load
  loadLotteries();
  startTimers();
  fetchLiveWinsMarquee();
  setInterval(fetchLiveWinsMarquee, 30000);
});

// ======================== VIP FEATURES & INTERACTIONS ========================

// 1. Daily Treasure Box Reward
window.openDailyRewardModal = function() {
  const chest = document.getElementById("chest-box-anim");
  const result = document.getElementById("daily-claim-result");
  const btn = document.getElementById("btn-claim-chest");
  if (chest) chest.style.display = "block";
  if (result) {
    result.style.display = "none";
    result.innerText = "";
  }
  if (btn) btn.style.display = "inline-block";
  const rewardDisplay = document.getElementById("reward-amount-display");
  if (rewardDisplay) rewardDisplay.innerText = "+ ? CR";
  openModal("modal-daily-reward");
};

window.claimDailyReward = async function() {
  const data = await apiRequest("/api/user/claim-daily", "POST");
  if (data && data.success) {
    sound.playWin();
    const chest = document.getElementById("chest-box-anim");
    const result = document.getElementById("daily-claim-result");
    const btn = document.getElementById("btn-claim-chest");
    if (chest) chest.style.display = "none";
    if (result) {
      result.style.display = "block";
      result.innerText = `${t("g_win")} +${Number(data.rewardCredits).toLocaleString()} CR`;
    }
    const rewardDisplay = document.getElementById("reward-amount-display");
    if (rewardDisplay) rewardDisplay.innerText = `+${Number(data.rewardCredits).toLocaleString()} CR`;
    if (btn) btn.style.display = "none";
    
    state.user.balance = data.newBalance;
    state.user.exp = data.exp;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();
    showToast(t("sent_ok"), `+${data.rewardCredits} CR`, "success");
  } else {
    showToast(t("sent_fail"), data?.message || t("sent_fail"), "danger");
  }
};

// 2. VIP Rank Status UI
window.openVipRankModal = function() {
  updateVipRankUI();
  openModal("modal-vip-rank");
};

function updateVipRankUI() {
  if (!state.user) return;
  const exp = state.user.exp || 0;
  let rank = "BRONZE VIP";
  let icon = "🥉";
  let maxExp = 1000;

  if (exp >= 5000) {
    rank = "DIAMOND VIP";
    icon = "💎";
    maxExp = 10000;
  } else if (exp >= 2500) {
    rank = "GOLD VIP";
    icon = "🥇";
    maxExp = 5000;
  } else if (exp >= 1000) {
    rank = "SILVER VIP";
    icon = "🥈";
    maxExp = 2500;
  }

  const pct = Math.min(100, Math.floor((exp / maxExp) * 100));

  const hIcon = document.getElementById("header-vip-icon");
  const hName = document.getElementById("header-vip-name");
  if (hIcon) {
    hIcon.hidden = false;
    hIcon.innerHTML = '<i class="fa-solid fa-crown"></i>';
  }
  if (hName) hName.innerText = rank;

  const mName = document.getElementById("vip-modal-rank-name");
  const mExp = document.getElementById("vip-modal-exp-val");
  const mFill = document.getElementById("vip-progress-fill");
  if (mName) mName.innerText = rank;
  if (mExp) mExp.innerText = `${exp.toLocaleString()} / ${maxExp.toLocaleString()} EXP`;
  if (mFill) mFill.style.width = `${pct}%`;
  const cmdName = document.getElementById("cmd-vip-name");
  const cmdExp = document.getElementById("cmd-vip-exp");
  if (cmdName) cmdName.textContent = rank;
  if (cmdExp) cmdExp.textContent = `${exp.toLocaleString()} EXP`;
  if (typeof paintLobbyPressure === "function") paintLobbyPressure();
}

window.openInfoModal = function(page) {
  const titleEl = document.getElementById("info-modal-title");
  const bodyEl = document.getElementById("info-modal-body");
  const titles = {
    about: "foot_about",
    terms: "foot_terms",
    privacy: "foot_privacy",
    faq: "foot_faq",
    responsible: "foot_responsible"
  };
  if (titleEl) titleEl.textContent = t(titles[page] || "foot_about");
  if (bodyEl) bodyEl.innerHTML = t("info_" + page);
  openModal("modal-info");
};

// 3. Live Winner Ticker Marquee
async function fetchLiveWinsMarquee() {
  const data = await apiRequest("/api/live-wins");
  if (data && data.success && data.wins) {
    const container = document.getElementById("marquee-content");
    if (!container) return;
    if (Number(data.jackpot) > 0) state.jackpotBase = Number(data.jackpot);
    container.innerHTML = data.wins.length
      ? data.wins.map((w) =>
        `<span>${escapeHtml(w.icon || "◆")} ${escapeHtml(w.user)} ${escapeHtml(t("ticker_won"))} ${escapeHtml(w.game)} <b>+${escapeHtml(Number(w.amount).toLocaleString())} CR</b></span>`
      ).join("")
      : `<span>${escapeHtml(t("jackpot_sub"))}</span>`;
  }
}

// 4. AI Trend Predictor
window.fetchAiPredict = async function(lotteryId) {
  const data = await apiRequest(`/api/ai-predict/${lotteryId}`);
  if (data && data.success) {
    state.aiPredict = data;
    setElText("ai-hot-digits", (data.hotDigits || []).join(" · "));
    setElText("ai-top3-suggest", data.recommendedTop3 || "—");
    setElText("ai-bot2-suggest", data.recommendedBottom2 || "—");
    const probElem = document.getElementById("ai-win-prob");
    if (probElem) probElem.innerText = data.winProbability != null ? `${data.winProbability}%` : (data.disclaimer || "Fun tip only");
  }
};

window.aiAutoFillDigits = function() {
  if (!state.aiPredict) return;
  state.currentBetInput = state.aiPredict.recommendedTop3;
  const input = document.getElementById("bet-number-input");
  if (input) input.value = state.currentBetInput;
  showToast(t("lucky_ok"), state.currentBetInput, "info");
};

// 5. Live Community Chat Drawer
window.toggleChatDrawer = function() {
  const drawer = document.getElementById("chat-drawer");
  if (!drawer) return;
  drawer.classList.toggle("open");
  if (drawer.classList.contains("open")) {
    fetchChatMessages();
  }
};

async function fetchChatMessages() {
  const data = await apiRequest("/api/chat/messages");
  if (data && data.success && data.messages) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;
    container.innerHTML = data.messages.map(m => `
      <div class="chat-msg-item ${m.role === 'admin' ? 'admin-msg' : ''}">
        <div class="msg-meta">
          <b class="${m.role === 'admin' ? 'gold-text' : 'user-text'}">${escapeHtml(m.nickname)}</b>
          <small>${escapeHtml(m.time)}</small>
        </div>
        <div class="msg-body">${escapeHtml(m.text)}</div>
      </div>
    `).join("");
    container.scrollTop = container.scrollHeight;
  }
}

window.sendChatMessage = async function() {
  const input = document.getElementById("chat-input-text");
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = "";

  const data = await apiRequest("/api/chat/send", "POST", { text });
  if (data && data.success) {
    fetchChatMessages();
  }
};

// Fast Bet Amount Chip Modifiers
window.addBetAmount = function(val) {
  sound.playClick();
  if (val === undefined || val === null || val === "") {
    addToCart();
    return;
  }
  const input = document.getElementById("bet-amount-input");
  if (!input) return;
  let curr = parseInt(input.value) || 0;
  input.value = curr + Number(val);
  if (typeof updateBetPayoutPreview === "function") updateBetPayoutPreview();
};

window.submitBets = submitBets;
window.submitAllBets = submitBets;

window.setBetAmountMax = function() {
  sound.playClick();
  const input = document.getElementById("bet-amount-input");
  if (!input || !state.user) return;
  input.value = Math.min(50000, state.user.balance || 1000);
};

window.initPlinkoGame = function() {
  const pegs = document.getElementById("plinko-pegs");
  if (!pegs || pegs.childElementCount) return;
  for (let r = 0; r < 7; r++) {
    const row = document.createElement("div");
    row.className = "plinko-peg-row";
    for (let i = 0; i < r + 3; i++) {
      const peg = document.createElement("span");
      peg.className = "plinko-peg";
      row.appendChild(peg);
    }
    pegs.appendChild(row);
  }
};

function highlightPlinkoSlot(slot) {
  document.querySelectorAll("#plinko-slots span").forEach((el) => {
    el.classList.toggle("is-hit", Number(el.dataset.slot) === Number(slot));
  });
}

function animatePlinkoBall(slot) {
  return new Promise((resolve) => {
    const board = document.getElementById("plinko-board");
    const ball = document.getElementById("plinko-ball");
    if (!board || !ball) {
      resolve();
      return;
    }
    const rows = 6;
    let rights = Math.max(0, Math.min(rows, Number(slot) || 3));
    let lefts = rows - rights;
    const path = [];
    for (let i = 0; i < rows; i++) {
      const goRight = rights > 0 && (lefts === 0 || Math.random() < rights / (rights + lefts));
      if (goRight) {
        path.push(1);
        rights--;
      } else {
        path.push(-1);
        lefts--;
      }
    }
    const w = board.clientWidth;
    const h = board.clientHeight;
    ball.hidden = false;
    ball.classList.add("is-dropping");
    let x = 0.5;
    let step = 0;
    const place = (nx, ny) => {
      ball.style.left = `${nx * w}px`;
      ball.style.top = `${ny * (h - 42)}px`;
    };
    place(0.5, 0.06);
    const tick = () => {
      if (step >= path.length) {
        place((Number(slot) + 0.5) / 7, 0.88);
        highlightPlinkoSlot(slot);
        setTimeout(resolve, 260);
        return;
      }
      x += path[step] * (0.48 / 7);
      place(x, 0.12 + ((step + 1) / rows) * 0.68);
      step += 1;
      setTimeout(tick, 130);
    };
    setTimeout(tick, 80);
  });
}

window.playPlinkoGame = async function() {
  const amountInput = document.getElementById("plinko-amount-input");
  const amount = parseInt(amountInput.value, 10);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "error");
    return;
  }

  const dropBtn = document.getElementById("btn-drop-plinko");
  const ball = document.getElementById("plinko-ball");
  dropBtn.disabled = true;
  dropBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;
  highlightPlinkoSlot(-1);
  if (ball) {
    ball.hidden = false;
    ball.classList.remove("is-dropping");
  }
  sound.playCoin();

  const data = await apiRequest("/api/games/plinko", "POST", { amount });
  if (data && data.success && data.chosen) {
    await animatePlinkoBall(data.chosen.slot);
    state.user.balance = data.newBalance;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();
    const status = document.getElementById("plinko-status-msg");
    if (status) status.innerText = `${data.chosen.label} +${data.payout.toLocaleString()} CR`;
    if (data.payout > 0) {
      sound.playWin();
      showToast(t("g_win"), `${data.chosen.label} +${data.payout.toLocaleString()} CR`, "success");
    } else {
      showToast(t("g_plinko"), data.chosen.label, "info");
    }
  }
  dropBtn.disabled = false;
  dropBtn.innerHTML = t("play");
};

const CRASH_GROWTH = 0.00008;
let crashAnimTimer = null;
let crashPollTimer = null;
let crashStartedAt = 0;
let crashChartPts = [];

function crashChartSize(canvas) {
  const parent = canvas.parentElement;
  const w = Math.max(280, parent ? parent.clientWidth : 720);
  const h = Math.max(180, parent ? parent.clientHeight : 320);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

function drawCrashChart(crashed) {
  const canvas = document.getElementById("crash-chart");
  const rocket = document.getElementById("crash-rocket-icon");
  const stage = document.getElementById("crash-stage");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { w, h } = crashChartSize(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8, 10, 16, 0.55)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(228,195,106,0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  if (!crashChartPts.length) {
    if (rocket) {
      rocket.style.left = "18px";
      rocket.style.bottom = "22px";
      rocket.style.top = "auto";
    }
    return;
  }
  const maxM = Math.max(1.8, ...crashChartPts.map((p) => p.m));
  const padL = 16;
  const padB = 22;
  const padT = 28;
  const padR = 36;
  const last = crashChartPts[crashChartPts.length - 1];
  const xAt = (i) => padL + (i / Math.max(1, crashChartPts.length - 1)) * (w - padL - padR);
  const yAt = (m) => h - padB - ((m - 1) / (maxM - 1)) * (h - padT - padB);
  if (crashChartPts.length < 2 && !crashed) {
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const t = i / 35;
      const m = 1 + t * t * 1.55;
      const x = padL + t * (w - padL - padR);
      const y = yAt(m);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(228,195,106,0.32)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    if (rocket) {
      rocket.style.left = "18px";
      rocket.style.bottom = "22px";
      rocket.style.top = "auto";
    }
    return;
  }
  ctx.beginPath();
  crashChartPts.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.m);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = crashed ? "#ff6b6b" : "#e4c36a";
  ctx.lineWidth = 3;
  ctx.shadowColor = crashed ? "rgba(255,80,80,.45)" : "rgba(228,195,106,.45)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (rocket && stage) {
    const x = xAt(crashChartPts.length - 1);
    const y = yAt(last.m);
    rocket.style.left = `${x - 10}px`;
    rocket.style.top = `${y - 18}px`;
    rocket.style.bottom = "auto";
    rocket.classList.toggle("is-bust", !!crashed);
  }
}

function resetCrashChart() {
  crashChartPts = [{ m: 1 }];
  const stage = document.getElementById("crash-stage");
  if (stage) stage.classList.remove("is-bust");
  drawCrashChart(false);
}

window.initCrashGame = function() {
  resetCrashChart();
  const counter = document.getElementById("crash-multiplier-counter");
  const sub = document.getElementById("crash-status-sub");
  if (counter) counter.innerText = "x1.00";
  if (sub) sub.innerText = t("crash_wait");
  if (state.crashAutoAt) setCrashAuto(state.crashAutoAt);
};

window.setCrashAuto = function(mult) {
  sound.playClick();
  const next = Number(mult);
  state.crashAutoAt = state.crashAutoAt === next ? null : next;
  document.querySelectorAll(".crash-tgt").forEach((btn) => {
    btn.classList.toggle("is-on", Number(btn.dataset.at) === state.crashAutoAt);
  });
  const hint = document.getElementById("crash-auto-hint");
  if (hint) hint.textContent = state.crashAutoAt ? `${t("crash_auto")} x${state.crashAutoAt.toFixed(1)}` : "";
};

function stopCrashRoundUi() {
  if (crashAnimTimer) clearInterval(crashAnimTimer);
  if (crashPollTimer) clearInterval(crashPollTimer);
  crashAnimTimer = null;
  crashPollTimer = null;
  const rocket = document.getElementById("crash-rocket-icon");
  const launchBtn = document.getElementById("btn-launch-crash");
  const cashBtn = document.getElementById("btn-cashout-crash");
  if (rocket) rocket.classList.remove("rocket-flying");
  if (launchBtn) {
    launchBtn.disabled = false;
    launchBtn.textContent = t("launch");
  }
  if (cashBtn) cashBtn.disabled = true;
}

function applyCrashResult(data) {
  state.crashAutoBusy = false;
  stopCrashRoundUi();
  if (!data) return;
  if (typeof data.newBalance === "number") {
    state.user.balance = data.newBalance;
    localStorage.setItem("user", JSON.stringify(state.user));
    updateUserProfileBar();
  }
  const counter = document.getElementById("crash-multiplier-counter");
  const sub = document.getElementById("crash-status-sub");
  const stage = document.getElementById("crash-stage");
  if (data.crashPoint) crashChartPts.push({ m: Number(data.crashPoint) });
  if (data.isWin) {
    sound.playWin();
    if (counter) counter.innerText = `x${Number(data.cashoutAt).toFixed(2)}`;
    if (sub) sub.innerText = `+${Number(data.payout).toLocaleString()} CR`;
    drawCrashChart(false);
    showToast(t("cashout"), `x${Number(data.cashoutAt).toFixed(2)}  +${Number(data.payout).toLocaleString()} CR`, "success");
  } else {
    if (stage) stage.classList.add("is-bust");
    if (counter) counter.innerText = `x${Number(data.crashPoint).toFixed(2)}`;
    if (sub) sub.innerText = `x${Number(data.crashPoint).toFixed(2)}`;
    drawCrashChart(true);
    showToast("Crash", `x${Number(data.crashPoint).toFixed(2)}`, "error");
  }
}

window.playCrashGame = async function() {
  const amount = readStakeAmount("crash-amount-input");
  if (amount == null) return;

  const launchBtn = document.getElementById("btn-launch-crash");
  const cashBtn = document.getElementById("btn-cashout-crash");
  const rocket = document.getElementById("crash-rocket-icon");
  const counter = document.getElementById("crash-multiplier-counter");
  const sub = document.getElementById("crash-status-sub");

  launchBtn.disabled = true;
  const data = await apiRequest("/api/games/crash", "POST", { action: "start", amount });
  if (!data?.success || !data.flying) {
    launchBtn.disabled = false;
    return;
  }

  state.user.balance = data.newBalance;
  localStorage.setItem("user", JSON.stringify(state.user));
  updateUserProfileBar();

  crashStartedAt = data.startedAt || Date.now();
  resetCrashChart();
  if (rocket) rocket.classList.add("rocket-flying");
  if (cashBtn) cashBtn.disabled = false;
  if (sub) sub.innerText = t("crash_flying");
  sound.playCoin();

  crashAnimTimer = setInterval(() => {
    const live = Math.exp(CRASH_GROWTH * Math.max(0, Date.now() - crashStartedAt));
    crashChartPts.push({ m: live });
    if (crashChartPts.length > 240) crashChartPts = crashChartPts.slice(-240);
    if (counter) counter.innerText = `x${live.toFixed(2)}`;
    drawCrashChart(false);
    if (state.crashAutoAt && live >= state.crashAutoAt && !state.crashAutoBusy) {
      state.crashAutoBusy = true;
      cashoutCrash();
    }
  }, 50);

  crashPollTimer = setInterval(async () => {
    const stateData = await apiRequest("/api/games/crash", "GET");
    if (stateData?.crashed || stateData?.isWin) applyCrashResult(stateData);
  }, 180);
};

window.cashoutCrash = async function() {
  const cashBtn = document.getElementById("btn-cashout-crash");
  if (cashBtn) cashBtn.disabled = true;
  const data = await apiRequest("/api/games/crash", "POST", { action: "cashout" });
  applyCrashResult(data);
};

// Thermal Ticket Print Preview Modal
window.openThermalTicketModal = function(bet) {
  if (!bet) return;
  document.getElementById("slip-username").innerText = bet.nickname || (state.user ? state.user.nickname : "ผู้เล่น");
  document.getElementById("slip-lottery-name").innerText = bet.lotteryType || "หวยยี่กี";
  document.getElementById("slip-draw-id").innerText = bet.drawId || "001";
  document.getElementById("slip-timestamp").innerText = new Date(bet.createdAt || Date.now()).toLocaleString("th-TH");
  
  const betsContainer = document.getElementById("slip-bets-list");
  if (betsContainer) {
    betsContainer.innerHTML = `
      <div class="receipt-info-row">
        <span>${bet.betType} [${bet.numbers}]:</span>
        <b>${bet.amount} CR</b>
      </div>
    `;
  }
  document.getElementById("slip-total-amt").innerText = `${bet.amount.toLocaleString()} CR`;

  openModal("modal-thermal-ticket");
};

// Theme Mode Switcher (VIP Gold -> Cyberpunk -> Emerald)
state.currentTheme = localStorage.getItem("theme") || "gold";
if (state.currentTheme !== "gold") {
  document.documentElement.setAttribute("data-theme", state.currentTheme);
}

window.cycleThemeMode = function() {
  sound.playClick();
  const themes = [
    { id: "gold", name: "VIP GOLD" },
    { id: "cyberpunk", name: "CYBERPUNK" },
    { id: "emerald", name: "EMERALD" }
  ];

  let currIdx = themes.findIndex(t => t.id === state.currentTheme);
  currIdx = (currIdx + 1) % themes.length;
  state.currentTheme = themes[currIdx].id;
  localStorage.setItem("theme", state.currentTheme);

  if (state.currentTheme === "gold") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", state.currentTheme);
  }

  const nameElem = document.getElementById("header-theme-name");
  if (nameElem) nameElem.innerText = themes[currIdx].name;

  showToast(t("admin_ok"), themes[currIdx].name, "info");
};

// 1-Click Lucky Random Picker
window.rollRandomLuckyNumber = function() {
  sound.playCoin();
  let len = 3;
  if (state.selectedBetCategory === "2top" || state.selectedBetCategory === "2bottom") len = 2;
  if (state.selectedBetCategory === "run_top" || state.selectedBetCategory === "run_bottom") len = 1;

  let num = "";
  for (let i = 0; i < len; i++) {
    num += Math.floor(Math.random() * 10).toString();
  }

  state.currentBetInput = num;
  const input = document.getElementById("bet-number-input");
  if (input) input.value = state.currentBetInput;

  showToast(t("lucky_ok"), num, "success");
};

// Copy Ticket Numbers to Clipboard
window.copyTicketNumbers = function() {
  sound.playClick();
  const betsContainer = document.getElementById("slip-bets-list");
  if (!betsContainer) return;
  const text = betsContainer.innerText.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
  showToast(t("admin_ok"), "clipboard", "success");
};

// Favorite Lucky Numbers Manager (Save & Auto-Fill)
state.favNumbers = JSON.parse(localStorage.getItem("fav_numbers")) || ["895", "92", "777"];

window.saveOrFillFavNumber = function() {
  sound.playClick();
  const input = document.getElementById("bet-number-input");
  const currVal = input ? input.value.trim() : "";

  if (currVal) {
    if (!state.favNumbers.includes(currVal)) {
      state.favNumbers.push(currVal);
      localStorage.setItem("fav_numbers", JSON.stringify(state.favNumbers));
      showToast(t("added_n"), currVal, "success");
    } else {
      showToast(currVal, "OK", "info");
    }
  } else {
    if (state.favNumbers.length > 0) {
      const randomFav = state.favNumbers[Math.floor(Math.random() * state.favNumbers.length)];
      state.currentBetInput = randomFav;
      if (input) input.value = randomFav;
      showToast(t("lucky_ok"), randomFav, "success");
    } else {
      showToast(t("need_num"), t("step2"), "warning");
    }
  }
};

// Coin Pusher 3D Game Handler
window.playCoinPusherGame = async function() {
  const amount = parseInt(document.getElementById("pusher-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "error");
    return;
  }

  const dropBtn = document.getElementById("btn-drop-coinpusher");
  dropBtn.disabled = true;
  dropBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;
  sound.playCoin();

  const stage = document.getElementById("pusher-display");
  const payoutEl = document.getElementById("pusher-payout");
  if (stage) {
    stage.classList.remove("is-drop");
    void stage.offsetWidth;
    stage.classList.add("is-drop");
  }
  const data = await apiCall("/api/games/coinpusher", "POST", { amount });
  setTimeout(() => {
    dropBtn.disabled = false;
    dropBtn.innerHTML = t("play");

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      const status = document.getElementById("pusher-status-msg");
      if (status) status.innerText = `${data.chosen.label} +${data.payout.toLocaleString()} CR`;
      if (payoutEl) payoutEl.innerText = `${data.chosen.label} · +${data.payout.toLocaleString()} CR`;

      if (data.payout > 0) {
        sound.playWin();
        showToast(t("g_win"), `${data.chosen.label} +${data.payout.toLocaleString()} CR`, "success");
      } else {
        showToast(t("g_pusher"), data.chosen.label, "info");
      }
    }
    if (stage) stage.classList.remove("is-drop");
  }, 1200);
};

// Pokdeng 3D Card Game Handler
window.playPokdengGame = async function() {
  const amountEl = document.getElementById("pokdeng-amount-input");
  const amount = parseInt(amountEl?.value || "10", 10);
  if (amountEl && !amountEl.value) amountEl.value = "10";
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "error");
    return;
  }

  const dealBtn = document.getElementById("btn-deal-pokdeng");
  dealBtn.disabled = true;
  dealBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;
  sound.playClick();

  const data = await apiCall("/api/games/pokdeng", "POST", { amount });
  setTimeout(() => {
    dealBtn.disabled = false;
    dealBtn.innerHTML = t("play");

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      document.getElementById("pokdeng-dealer-score").innerText = String(data.dScore);
      document.getElementById("pokdeng-player-score").innerText = String(data.pScore);

      const pCardsBox = document.getElementById("pokdeng-player-cards");
      const dCardsBox = document.getElementById("pokdeng-dealer-cards");
      const cardHtml = (value) => `<div class="lux-playing-card">${escapeHtml(value)}</div>`;
      if (pCardsBox) pCardsBox.innerHTML = cardHtml(data.pCard1) + cardHtml(data.pCard2);
      if (dCardsBox) dCardsBox.innerHTML = cardHtml(data.dCard1) + cardHtml(data.dCard2);

      const status = document.getElementById("pokdeng-status-msg");
      if (data.isWin) {
        sound.playWin();
        if (status) status.innerText = `${t("g_win")} ${data.pScore} vs ${data.dScore} +${data.payout.toLocaleString()} CR`;
        showToast(t("g_win"), `${data.pScore} vs ${data.dScore} +${data.payout.toLocaleString()} CR`, "success");
      } else {
        sound.playError();
        if (status) status.innerText = `${t("g_lose")} ${data.pScore} vs ${data.dScore}`;
        showToast(t("g_lose"), `${data.pScore} vs ${data.dScore}`, "info");
      }
    }
  }, 1200);
};

// Horse Racing Derby Game Handler
state.selectedHorseId = 1;
window.selectHorse = function(id) {
  sound.playClick();
  state.selectedHorseId = id;
  document.querySelectorAll(".horse-opt-btn").forEach(btn => {
    btn.classList.remove("active");
    btn.style.borderColor = "rgba(255,255,255,0.1)";
  });
  const activeBtn = document.getElementById(`horse-btn-${id}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.style.borderColor = "var(--gold-primary)";
  }
};

window.playHorseRacingGame = async function() {
  const amount = parseInt(document.getElementById("derby-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "error");
    return;
  }

  const startBtn = document.getElementById("btn-start-derby");
  startBtn.disabled = true;
  startBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;
  sound.playCoin();

  document.querySelectorAll(".derby-horse").forEach((el) => {
    el.style.transition = "none";
    el.style.transform = "translateX(0)";
  });
  document.querySelectorAll(".derby-lane").forEach((el) => el.classList.remove("is-win"));
  const data = await apiCall("/api/games/horseracing", "POST", { amount, selectedHorse: state.selectedHorseId });
  const winnerId = Number(data?.winner?.id || 0);
  requestAnimationFrame(() => {
    document.querySelectorAll(".derby-horse").forEach((el) => {
      const id = Number(el.dataset.horse);
      const laneW = el.parentElement ? el.parentElement.clientWidth : 240;
      const max = Math.max(48, laneW - 40);
      const finish = id === winnerId ? max * 0.86 : max * (0.46 + Math.random() * 0.26);
      el.style.transition = "transform 1.35s cubic-bezier(.15,.75,.2,1)";
      el.style.transform = `translateX(${finish}px)`;
    });
  });
  setTimeout(() => {
    startBtn.disabled = false;
    startBtn.innerHTML = t("play");

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();
      const winLane = document.querySelector(`.derby-lane[data-horse="${winnerId}"]`);
      if (winLane) winLane.classList.add("is-win");
      const status = document.getElementById("derby-status-msg");
      if (data.isWin) {
        sound.playWin();
        if (status) status.innerText = `${t("g_win")} ${data.winner.name} +${data.payout.toLocaleString()} CR`;
        showToast(t("g_win"), `${data.winner.name} +${data.payout.toLocaleString()} CR`, "success");
      } else {
        sound.playError();
        if (status) status.innerText = data.winner.name;
        showToast(t("g_horse"), data.winner.name, "info");
      }
    }
  }, 1500);
};

// Lucky Duck Shooter Game Handler
window.playDuckShooterGame = async function() {
  const amount = parseInt(document.getElementById("duck-amount-input").value);
  if (isNaN(amount) || amount < 10) {
    showToast(t("need_amt"), "10 CR", "error");
    return;
  }

  const shootBtn = document.getElementById("btn-shoot-duck");
  if (shootBtn) {
    shootBtn.disabled = true;
    shootBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("playing")}`;
  }
  sound.playCoin();

  const stage = document.getElementById("duck-display");
  const ducks = [...document.querySelectorAll(".duck-fly")];
  ducks.forEach((el) => el.classList.remove("is-hit"));
  if (stage) stage.classList.remove("is-miss");
  const data = await apiCall("/api/games/duckshooter", "POST", { amount });
  setTimeout(() => {
    if (shootBtn) {
      shootBtn.disabled = false;
      shootBtn.innerHTML = t("play");
    }

    if (data && data.success) {
      state.user.balance = data.newBalance;
      localStorage.setItem("user", JSON.stringify(state.user));
      updateUserProfileBar();

      const miss = Number(data.chosen?.mult || 0) <= 0;
      if (miss) {
        if (stage) stage.classList.add("is-miss");
      } else if (ducks.length) {
        const hitMap = { 0.5: 0, 1.5: 1, 3.5: 2, 10: 3 };
        const idx = hitMap[Number(data.chosen.mult)] ?? 0;
        ducks[idx].classList.add("is-hit");
      }

      const status = document.getElementById("duck-status-msg");
      if (status) status.innerText = `${data.chosen.label} +${data.payout.toLocaleString()} CR`;

      if (data.payout > 0) {
        sound.playWin();
        showToast(t("g_win"), `${data.chosen.label} +${data.payout.toLocaleString()} CR`, "success");
      } else {
        showToast(t("g_duck"), data.chosen.label, "info");
      }
    }
  }, 900);
};

// ==========================================================================
// 🇻🇳 VIETNAMESE XỔ SỐ (LÔ ĐỀ) — COMPLETE SYSTEM
// ==========================================================================

const VN_GUIDE_KEYS = { lo: "gv_lo", de: "gv_de", "3cang": "gv_cang", dau: "gv_dau", duoi: "gv_duoi", xien2: "gv_x2", xien3: "gv_x3", xien4: "gv_x4" };
const VN_LABEL_KEYS = { lo: "vn_lo", de: "vn_de", "3cang": "vn_cang", dau: "vn_dau", duoi: "vn_duoi", xien2: "vn_x2", xien3: "vn_x3", xien4: "vn_x4" };
const VN_RATES = { lo: 3.8, de: 85, "3cang": 800, dau: 6.5, duoi: 6.5, xien2: 12, xien3: 28, xien4: 55 };
const VN_MAXLEN = { lo: 2, de: 2, "3cang": 3, dau: 1, duoi: 1, xien2: 11, xien3: 14, xien4: 17 };
const VN_PLACEHOLDERS = { lo: "88", de: "88", "3cang": "168", dau: "4", duoi: "7", xien2: "12,34", xien3: "12,34,56", xien4: "12,34,56,78" };

function vnTypeName(type) {
  return t(VN_LABEL_KEYS[type] || "vn_lo");
}

function normalizeVNNumber(raw, betType) {
  const s = String(raw || "").trim();
  if (["xien2", "xien3", "xien4"].includes(betType)) {
    return s.replace(/\s+/g, "").replace(/;+/g, ",").split(",").filter(Boolean).map((p) => padLast(p, 2)).join(",");
  }
  if (betType === "lo" || betType === "de") return padLast(s, 2);
  if (betType === "3cang") return padLast(s, 3);
  if (betType === "dau" || betType === "duoi") return padLast(s, 1);
  return s.replace(/\D/g, "");
}

function validateVNNumber(betType, numbers) {
  const num = normalizeVNNumber(numbers, betType);
  if (betType === "lo" || betType === "de") {
    if (num.length !== 2 || Number.isNaN(Number(num))) return t("need_digits2");
  } else if (betType === "3cang") {
    if (num.length !== 3 || Number.isNaN(Number(num))) return t("need_digits3");
  } else if (betType === "dau" || betType === "duoi") {
    if (num.length !== 1 || Number.isNaN(Number(num))) return t("need_digit1");
  } else if (["xien2", "xien3", "xien4"].includes(betType)) {
    const expected = betType === "xien2" ? 2 : (betType === "xien3" ? 3 : 4);
    const parts = num.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length !== expected || parts.some((p) => p.length !== 2 || Number.isNaN(Number(p)))) {
      return t("vn_bad_xien");
    }
  }
  return null;
}

state.vnCurrentLotteryId = null;
state.vnCurrentBetType = "lo";
state.vnCurrentTickets = [];
state.vnCountdownInterval = null;
state.vnRefreshInterval = null;

window.openVNLotteryRoom = async function(lotteryId) {
  if (!state.token) {
    showToast(t("vn_login"), t("vn_bet_title"), "danger");
    switchView("auth");
    return;
  }
  sound.playClick();
  state.lastLotteryRoom = { kind: "vn", id: lotteryId };
  state.vnCurrentLotteryId = lotteryId;
  state.vnCurrentTickets = [];
  state.vnCurrentBetType = "lo";
  state.vnBetType = "lo";
  if (state.vnCountdownInterval) clearInterval(state.vnCountdownInterval);
  if (state.vnRefreshInterval) clearInterval(state.vnRefreshInterval);
  switchView("vnlotto");
  selectVNBetType("lo");
  await refreshVNRoom();
};

async function refreshVNRoom() {
  const id = state.vnCurrentLotteryId;
  if (!id) return;
  const data = await apiCall(`/api/lottery/${id}`);
  if (!data || !data.success) return;
  const l = data.lottery;
  state.vnDrawId = l.nextDrawId;
  const live = state.lotteries.find((item) => item.id === id);
  if (live) {
    live.countdown = l.countdown;
    live.nextDrawId = l.nextDrawId;
    live.lastResults = l.lastResults;
    live.liveDraw = l.liveDraw;
  }

  setElText("vn-room-name", roomLabel(l.id));
  setElText("vn-draw-id-display", (l.liveDraw?.drawId || l.nextDrawId || "").split("-").pop());
  const wantMs = isVnLiveDrawing(l) ? 1000 : 8000;
  if (state._vnRefreshMs !== wantMs) {
    if (state.vnRefreshInterval) clearInterval(state.vnRefreshInterval);
    state._vnRefreshMs = wantMs;
    state.vnRefreshInterval = setInterval(refreshVNRoom, wantMs);
  }
  applyVnRoomClock(l);
  refreshRoomPendingStrip();
  const simNote = document.getElementById("vn-sim-note");
  if (simNote) simNote.style.display = (id === "vnmn" || id === "vnmt") ? "block" : "none";
  renderVNLastDb(l.lastResults, l.liveDraw);

  renderVNPrizeTable(l.lastResults, l.liveDraw);
  renderVNHistory(l.lastResults);
  renderVNTickets();
  updateVNPayoutPreview();
  renderVNQuickNumbers();
}

function applyVnRoomClock(lottery) {
  if (!lottery) return;
  const view = document.getElementById("view-vnlotto");
  if (isVnLiveDrawing(lottery)) {
    const left = liveDrawRemainingSecs(lottery.liveDraw);
    setElText("vn-countdown-display", formatTime(left));
    applyRoomClockState("vn", 0);
    const label = document.getElementById("vn-clock-label");
    if (label) label.textContent = `${t("vn_draw_now")} ${vnPrizeLabel(lottery.liveDraw.current)}`;
    const banner = document.getElementById("vn-draw-state");
    if (banner) {
      banner.hidden = false;
      banner.textContent = t("vn_drawing");
    }
    view?.classList.add("is-draw-locked", "is-vn-revealing");
    renderVNLiveBoard(lottery.liveDraw);
    return;
  }
  view?.classList.remove("is-vn-revealing");
  const board = document.getElementById("vn-live-board");
  if (board) board.hidden = true;
  applyRoomClockState("vn", lottery.countdown || 0);
}

function renderVNLiveBoard(liveDraw) {
  const board = document.getElementById("vn-live-board");
  if (!board) return;
  if (!liveDraw) {
    board.hidden = true;
    return;
  }
  const key = liveDraw.current || "nhat";
  const raw = liveDraw.prizes?.[key];
  const shown = raw == null ? t("vn_wait_num") : (Array.isArray(raw) ? raw.join("  ") : raw);
  board.hidden = false;
  setElText("vn-live-now-label", `${t("vn_draw_now")} · ${vnPrizeLabel(key)}`);
  setElText("vn-live-now-num", shown);
}

function renderVNLastDb(results, liveDraw) {
  const el = document.getElementById("vn-last-db-balls");
  if (!el) return;
  if (isVnLiveDrawing({ liveDraw })) {
    const db = liveDraw.prizes?.db;
    el.innerHTML = db
      ? numToBalls(db, "num-ball-red")
      : `<span class="vn-prize-pending">${escapeHtml(t("prize_db"))}</span>`;
    return;
  }
  const db = results?.[0]?.prizes?.db;
  if (!db) {
    el.innerHTML = `<span class="sphere-digit">-</span>`;
    return;
  }
  el.innerHTML = numToBalls(db, "num-ball-red");
}

function renderVNPrizeTable(results, liveDraw) {
  const container = document.getElementById("vn-prize-table-container");
  if (!container) return;
  const drawing = isVnLiveDrawing({ liveDraw });
  const latest = results && results[0];
  const p = drawing ? (liveDraw.prizes || {}) : latest?.prizes;
  if (!drawing && (!results || !results.length || !p)) {
    container.innerHTML = `<div class="vn-prize-table-loading">${escapeHtml(t("vn_no_prize"))}</div>`;
    return;
  }
  const makeNums = (arr, big = false, pending = false) => {
    if (pending || arr == null) {
      return `<div class="vn-prize-numbers"><span class="vn-prize-pending">${escapeHtml(t("vn_wait_num"))}</span></div>`;
    }
    const items = Array.isArray(arr) ? arr : [arr];
    return `<div class="vn-prize-numbers">${items.map((n) => `<span class="vn-prize-num ${big ? "vn-prize-db" : ""}">${escapeHtml(n)}</span>`).join("")}</div>`;
  };
  const row = (key, labelKey, extra = "") => {
    const has = p && p[key] != null;
    const live = drawing && liveDraw.current === key;
    return `<tr class="${extra}${live ? " is-live-prize" : ""}"><td class="vn-prize-label">${escapeHtml(t(labelKey))}</td><td>${makeNums(p?.[key], key === "db", !has)}</td></tr>`;
  };
  container.innerHTML = `
    <table class="vn-prize-table">
      <tbody>
        ${row("db", "prize_db", "vn-row-db")}
        ${row("nhat", "prize_g1")}
        ${row("nhi", "prize_g2")}
        ${row("ba", "prize_g3")}
        ${row("tu", "prize_g4")}
        ${row("nam", "prize_g5")}
        ${row("sau", "prize_g6")}
        ${row("bay", "prize_g7", "vn-row-g7")}
      </tbody>
    </table>
    <div class="vn-prize-meta">${escapeHtml(t("draw_id"))}: ${escapeHtml((drawing ? liveDraw.drawId : latest?.drawId) || "—")}${drawing ? ` · ${escapeHtml(t("vn_drawing"))}` : ""}</div>`;
}

function renderVNHistory(results) {
  const el = document.getElementById("vn-results-history");
  if (!el) return;
  if (!results || results.length === 0) {
    el.innerHTML = `<div class="vn-no-tickets">${escapeHtml(t("vn_no_hist"))}</div>`;
    return;
  }
  el.innerHTML = results.slice(0, 10).map((r) => {
    const db = r.prizes ? r.prizes.db : "-----";
    const bay0 = r.prizes?.bay ? r.prizes.bay[0] : "--";
    return `<div class="vn-history-item">
      <span class="vn-history-draw-id">${escapeHtml((r.drawId || "").split("-").pop())}</span>
      <span>${escapeHtml(t("prize_db"))}:</span>
      <span class="vn-history-db">${escapeHtml(db)}</span>
      <span>G7: ${escapeHtml(String(bay0))}</span>
    </div>`;
  }).join("");
}

window.selectVNBetType = function(type) {
  sound.playClick();
  state.vnCurrentBetType = type;
  state.vnBetType = type;
  document.querySelectorAll(".vn-tab-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(`vn-tab-${type}`)?.classList.add("active");
  setElText("vn-bet-desc-text", t(VN_GUIDE_KEYS[type] || "gv_lo"));
  const inp = document.getElementById("vn-bet-number");
  if (inp) {
    inp.maxLength = VN_MAXLEN[type] || 2;
    inp.placeholder = VN_PLACEHOLDERS[type] || "88";
    inp.value = VN_PLACEHOLDERS[type] || "88";
    inp.classList.remove("is-invalid");
  }
  const alias = document.getElementById("vn-number-input");
  if (alias) alias.value = "";
  const tools = document.getElementById("vn-bulk-tools");
  if (tools) tools.style.display = (type === "lo" || type === "de") ? "" : "none";
  const comma = document.getElementById("vn-xien-comma");
  if (comma) comma.style.display = ["xien2", "xien3", "xien4"].includes(type) ? "" : "none";
  const grid = document.getElementById("vn-number-grid");
  if (grid && !grid.hidden) renderNumberGrid();
  else if (grid) {
    grid.hidden = true;
    grid.innerHTML = "";
  }
  renderVNQuickNumbers();
  updateVNPayoutPreview();
  renderVNTickets();
};

function renderVNQuickNumbers() {
  const container = document.getElementById("vn-quick-numbers");
  if (!container) return;
  const type = state.vnCurrentBetType;
  let suggestions = [];
  if (type === "dau" || type === "duoi") suggestions = ["0","1","2","3","4","5","6","7","8","9"];
  else if (type === "3cang") suggestions = ["168","688","888","999","100","777","123","456","789","000"];
  else if (["xien2","xien3","xien4"].includes(type)) suggestions = ["12,34","18,68","88,99","07,47"];
  else suggestions = ["88","68","86","18","28","36","78","99","00","07","47","69","89","56"];
  container.innerHTML = suggestions.map((n) =>
    `<button type="button" class="vn-quick-num-btn" onclick="setVNNumber('${n}')">${n}</button>`
  ).join("");
}

window.setVNNumber = function(n) {
  const inp = document.getElementById("vn-bet-number");
  const alias = document.getElementById("vn-number-input");
  if (inp) inp.value = n;
  if (alias) alias.value = n;
  updateVNPayoutPreview();
  renderVNTickets();
};

window.setVNAmount = function(amt) {
  const inp = document.getElementById("vn-bet-amount");
  const alias = document.getElementById("vn-amount-input");
  if (inp) inp.value = amt;
  if (alias) alias.value = amt;
  updateVNPayoutPreview();
  renderVNTickets();
};

window.formatVNBetInput = function(el) {
  const type = state.vnCurrentBetType;
  el.value = ["xien2","xien3","xien4"].includes(type)
    ? el.value.replace(/[^0-9,]/g, "")
    : el.value.replace(/\D/g, "");
  const alias = document.getElementById("vn-number-input");
  if (alias) alias.value = el.value;
  updateVNPayoutPreview();
  renderVNTickets();
};

window.handleVNKeypad = function(val) {
  sound.playClick();
  const inp = document.getElementById("vn-bet-number");
  if (!inp) return;
  const type = state.vnCurrentBetType;
  const maxLen = VN_MAXLEN[type] || 2;
  if (val === ",") {
    if (!["xien2","xien3","xien4"].includes(type)) return;
    if (inp.value.endsWith(",") || !inp.value) return;
  } else if (!/^\d$/.test(val)) return;
  if (inp.value.length >= maxLen) return;
  inp.value += val;
  formatVNBetInput(inp);
};

window.clearVNNumber = function() {
  sound.playClick();
  setVNNumber("");
};

window.luckyVNNumber = function() {
  sound.playCoin();
  const type = state.vnCurrentBetType;
  const randPair = () => String(Math.floor(Math.random() * 100)).padStart(2, "0");
  let num = "";
  if (type === "dau" || type === "duoi") num = String(Math.floor(Math.random() * 10));
  else if (type === "3cang") num = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  else if (type === "xien2") num = `${randPair()},${randPair()}`;
  else if (type === "xien3") num = `${randPair()},${randPair()},${randPair()}`;
  else if (type === "xien4") num = `${randPair()},${randPair()},${randPair()},${randPair()}`;
  else num = randPair();
  setVNNumber(num);
};

function updateVNPayoutPreview() {
  const type = state.vnCurrentBetType || "lo";
  const num = document.getElementById("vn-bet-number")?.value || "-";
  const amt = Number(document.getElementById("vn-bet-amount")?.value) || 0;
  const rate = VN_RATES[type] || 0;
  const win = amt * rate;
  setElText("vn-preview-type", vnTypeName(type));
  setElText("vn-preview-num", num);
  setElText("vn-preview-amt", `${amt.toLocaleString()} CR`);
  setElText("vn-preview-win", win > 0 ? `+${win.toLocaleString()} CR` : "0 CR");
  const box = document.getElementById("vn-payout-preview");
  if (box) box.textContent = `${t("win_if")} ${vnTypeName(type)} ×${rate} → ${win.toLocaleString()} CR`;
}
window.updateVNPayoutPreview = updateVNPayoutPreview;

function readVNStake() {
  const amt = Number(document.getElementById("vn-bet-amount")?.value);
  return Number.isFinite(amt) && amt > 0 ? amt : 0;
}

window.addVNToSlip = function() {
  if (!guardRoomOpen("vn")) return false;
  const betType = state.vnCurrentBetType;
  const inp = document.getElementById("vn-bet-number");
  let raw = inp?.value;
  if (!String(raw || "").trim()) raw = inp?.placeholder || "";
  const numbers = normalizeVNNumber(raw, betType);
  const amount = readVNStake();
  if (!numbers) {
    inp?.classList.add("is-invalid");
    inp?.focus();
    showToast(t("vn_need_num"), t("step2"), "danger");
    return false;
  }
  inp?.classList.remove("is-invalid");
  if (!amount) { showToast(t("vn_need_amt"), t("step3"), "danger"); return false; }
  const err = validateVNNumber(betType, numbers);
  if (err) { showToast(t("need_number"), err, "danger"); return false; }
  state.vnCurrentTickets.push({ betType, numbers, amount, label: vnTypeName(betType) });
  sound.playCoin();
  setVNNumber(numbers);
  renderVNTickets();
  return true;
};

window.placeVNBetNow = async function() {
  if (!addVNToSlip()) return;
  await submitVNSlip();
};

window.removeVNSlipItem = function(index) {
  state.vnCurrentTickets.splice(index, 1);
  renderVNTickets();
};

window.submitVNBet = function() {
  addVNToSlip();
};

window.submitVNSlip = async function() {
  if (!state.token) {
    showToast(t("vn_login"), t("vn_bet_title"), "danger");
    return;
  }
  if (!state.vnCurrentTickets.length) {
    if (!addVNToSlip()) return;
  }
  const lotteryId = state.vnCurrentLotteryId;
  const live = await syncLotteryById(lotteryId);
  const lottery = live || state.lotteries.find((l) => l.id === lotteryId);
  let drawId = live?.nextDrawId || state.vnDrawId || lottery?.nextDrawId || null;
  if (live && !(live.countdown > 0)) {
    applyRoomClockState("vn", live.countdown || 0);
    showToast(t("bets_closed"), t("drawing"), "danger");
    return;
  }
  if (!lotteryId || !drawId) {
    showToast(t("vn_err"), t("pick_room"), "danger");
    return;
  }
  const btn = document.getElementById("vn-submit-bet");
  const prev = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(t("sending"))}`;
  }
  let ok = 0;
  let lastBalance = state.user?.balance;
  const pending = [...state.vnCurrentTickets];
  const remaining = [];
  for (const ticket of pending) {
    let data = await apiCall("/api/user/vnbet", "POST", {
      lotteryId,
      drawId,
      betType: ticket.betType,
      numbers: ticket.numbers,
      amount: ticket.amount
    });
    if (isStaleDrawError(data)) {
      const retryLive = await syncLotteryById(lotteryId);
      if (retryLive && retryLive.countdown > 0) {
        drawId = retryLive.nextDrawId;
        data = await apiCall("/api/user/vnbet", "POST", {
          lotteryId,
          drawId,
          betType: ticket.betType,
          numbers: ticket.numbers,
          amount: ticket.amount
        });
      }
    }
    if (data && data.success) {
      ok += 1;
      lastBalance = data.newBalance;
    } else {
      remaining.push(ticket);
      showToast(t("vn_err"), (data && data.message) || t("vn_err"), "danger");
      break;
    }
  }
  state.vnCurrentTickets = remaining;
  if (lastBalance != null && state.user) {
    state.user.balance = lastBalance;
    updateUserProfileBar();
  }
  renderVNTickets();
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = prev || t("send_slip");
  }
  if (ok) {
    sound.playWin();
    showToast(t("vn_ok"), `${ok} · CR`, "success");
    state._userBetsAt = 0;
    refreshRoomPendingStrip();
    const placed = pending.slice(0, ok);
    const room = (state.lotteries || []).find((l) => l.id === lotteryId) || live || { id: lotteryId, type: "vietlottery", nextDrawId: drawId, countdown: live?.countdown || 0 };
    if (placed.length) openLiveDrawWaitingBoard(room, placed);
  }
};

function refreshVNProgress() {
  const draft = typeof vnDraftTicket === "function" ? vnDraftTicket() : null;
  const hasCart = state.vnCurrentTickets.length > 0;
  const inp = document.getElementById("vn-bet-number");
  const raw = String(inp?.value || inp?.placeholder || "").trim();
  let step = 1;
  if (state.vnCurrentBetType) step = 2;
  if (state.vnCurrentBetType && raw) step = 3;
  if (draft) step = 4;
  if (hasCart) step = 5;
  setBetSteps("#view-vnlotto", step);
  if (state.activeView === "vnlotto") {
    syncCartBadge(hasCart ? state.vnCurrentTickets.length : (draft ? 1 : 0));
  }
}

function vnDraftTicket() {
  const type = state.vnCurrentBetType || "lo";
  const inp = document.getElementById("vn-bet-number");
  const raw = String(inp?.value || inp?.placeholder || "").trim();
  const num = normalizeVNNumber(raw, type);
  const amount = readVNStake();
  if (!num || !amount || validateVNNumber(type, num)) return null;
  return { num, amount, label: vnTypeName(type), rate: VN_RATES[type] || 3.8 };
}

function renderVNTickets() {
  const el = document.getElementById("vn-current-tickets");
  const countEl = document.getElementById("vn-ticket-count");
  if (!el) return;
  if (countEl) {
    const draftCount = !state.vnCurrentTickets.length && vnDraftTicket() ? 1 : 0;
    countEl.textContent = String(state.vnCurrentTickets.length || draftCount);
  }
  const total = state.vnCurrentTickets.reduce((sum, item) => sum + Number(item.amount || item.amt || 0), 0);
  setElText("vn-slip-total", total.toLocaleString());
  if (!state.vnCurrentTickets.length) {
    const draft = vnDraftTicket();
    if (draft) {
      const win = Math.round(draft.amount * draft.rate);
      el.innerHTML = `<div class="slip-draft">
        <div class="cart-item-meta">
          <span class="cart-item-num">${escapeHtml(draft.num)}</span>
          <span class="cart-item-type">${escapeHtml(draft.label)} · ${escapeHtml(String(draft.amount))} CR</span>
        </div>
        <div class="slip-draft-hint">${escapeHtml(t("confirm_bet"))} → +${win.toLocaleString()} CR</div>
      </div>`;
      setElText("vn-slip-total", draft.amount.toLocaleString());
      document.getElementById("vn-submit-bet")?.classList.add("is-ready");
    } else {
      el.innerHTML = `<div class="vn-no-tickets">${escapeHtml(t("vn_no_slip"))}</div>`;
      document.getElementById("vn-submit-bet")?.classList.remove("is-ready");
    }
    refreshVNProgress();
    return;
  }
  el.innerHTML = state.vnCurrentTickets.map((item, i) => {
    const label = item.label || item.type || vnTypeName(item.betType);
    const num = item.numbers || item.num || item.number || "";
    const amt = item.amount || item.amt || 0;
    return `<div class="cart-item">
      <div class="cart-item-meta">
        <span class="cart-item-num">${escapeHtml(String(num))}</span>
        <span class="cart-item-type">${escapeHtml(String(label))}</span>
      </div>
      <div class="cart-item-actions">
        <span class="cart-item-amount gold-text">${Number(amt).toLocaleString()} CR</span>
        <button type="button" class="btn-remove-item" onclick="removeVNSlipItem(${i})"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>`;
  }).join("");
  document.getElementById("vn-submit-bet")?.classList.add("is-ready");
  refreshVNProgress();
}

// Hide loading screen after app initializes
function hideLoadingScreen() {
  const ls = document.getElementById('app-loading-screen');
  if(ls) {
    ls.style.transition = 'opacity 0.4s ease';
    ls.style.opacity = '0';
    setTimeout(() => { ls.style.display = 'none'; }, 400);
  }
}

// ═══════════════════════════════════════
// 🎯 NUMBER GRID SELECTOR (00-99) 
// ═══════════════════════════════════════
window.renderNumberGrid = function() {
  const container = document.getElementById("vn-number-grid");
  if (!container) return;
  const betType = state.vnBetType || state.vnCurrentBetType || "lo";
  if (!["lo", "de", "xien2", "xien3", "xien4"].includes(betType)) {
    container.innerHTML = "";
    return;
  }
  let html = `<div class="num-grid-wrapper"><div class="num-grid-title"><i class="fa-solid fa-table-cells"></i> ${escapeHtml(t("num_grid"))}</div><div class="num-grid">`;
  for (let i = 0; i < 100; i++) {
    const num = i.toString().padStart(2, "0");
    html += `<button type="button" class="num-grid-btn" onclick="pickGridNumber('${num}')">${num}</button>`;
  }
  html += "</div></div>";
  container.innerHTML = html;
};

window.pickGridNumber = function(num) {
  const input = document.getElementById("vn-bet-number") || document.getElementById("vn-number-input");
  if (!input) return;
  const betType = state.vnBetType || state.vnCurrentBetType || "lo";
  if (["xien2", "xien3", "xien4"].includes(betType)) {
    const current = input.value.trim();
    input.value = current ? `${current},${num}` : num;
  } else {
    input.value = num;
  }
  const alias = document.getElementById("vn-number-input");
  if (alias && alias !== input) alias.value = input.value;
  updateVNPayoutPreview();
};

// ═══════════════════════════════════════
// 🔧 BULK BETTING TOOLS
// ═══════════════════════════════════════
window.bulkRudHna = function() {
  const digit = prompt(t("need_1"));
  if (!digit || digit.length !== 1 || Number.isNaN(Number(digit))) {
    showToast(t("need_num"), t("need_1"), "danger");
    return;
  }
  const numbers = [];
  for (let i = 0; i < 10; i++) numbers.push(digit + i);
  bulkAddVNBets(numbers);
};

window.bulkRudLang = function() {
  const digit = prompt(t("need_1"));
  if (!digit || digit.length !== 1 || Number.isNaN(Number(digit))) {
    showToast(t("need_num"), t("need_1"), "danger");
    return;
  }
  const numbers = [];
  for (let i = 0; i < 10; i++) numbers.push(i + "" + digit);
  bulkAddVNBets(numbers);
};

window.bulkGlabTua = function() {
  const num = prompt(t("need_2"));
  if (!num || num.length !== 2 || Number.isNaN(Number(num))) {
    showToast(t("need_num"), t("need_2"), "danger");
    return;
  }
  const reversed = num[1] + num[0];
  const numbers = [num];
  if (reversed !== num) numbers.push(reversed);
  bulkAddVNBets(numbers);
};

window.bulk19Door = function() {
  const digits = prompt(t("need_2"));
  if (!digits || digits.length !== 2 || Number.isNaN(Number(digits))) {
    showToast(t("need_num"), t("need_2"), "danger");
    return;
  }
  const d1 = digits[0], d2 = digits[1];
  const set = new Set();
  // All combinations of d1 and d2 with 0-9
  for (let i = 0; i < 10; i++) {
    set.add(d1 + '' + i);
    set.add(i + '' + d1);
    set.add(d2 + '' + i);
    set.add(i + '' + d2);
  }
  bulkAddVNBets([...set]);
};

window.bulkAddVNBets = function(numbers) {
  const amount = (typeof readVNStake === "function" && readVNStake()) || Number(document.getElementById("vn-bet-amount")?.value) || 10;
  const betType = state.vnBetType || state.vnCurrentBetType || "lo";
  let added = 0;
  numbers.forEach((num) => {
    state.vnCurrentTickets.push({
      betType,
      numbers: String(num).padStart(2, "0"),
      amount,
      label: vnTypeName(betType)
    });
    added += 1;
  });
  renderVNTickets();
  showToast(t("bulk_added"), `${added} · ${vnTypeName(betType)}`, "success");
};


// ═══════════════════════════════════════
// 📊 ADMIN NUMBER STATS
// ═══════════════════════════════════════
window.loadNumberStats = async function() {
  const lottery = document.getElementById('admin-stats-lottery-select')?.value || 'all';
  const betType = document.getElementById('admin-stats-bet-type')?.value || 'all';
  const status = document.getElementById('admin-stats-status')?.value || 'pending';
  const container = document.getElementById('admin-number-stats-table');
  if (container) container.innerHTML = '<div class="admin-empty">Đang tải thống kê số...</div>';

  const data = await apiCall('/api/admin/number-stats?lottery=' + lottery + '&betType=' + betType + '&status=' + status);
  if (!data || !data.success) {
    if (container) container.innerHTML = '<div class="admin-empty">Không tải được thống kê số. Thử làm mới.</div>';
    return;
  }

  const el = id => document.getElementById(id);
  if (el('ns-total-tickets')) el('ns-total-tickets').textContent = Number(data.totalTickets || 0).toLocaleString();
  if (el('ns-total-amount')) el('ns-total-amount').textContent = Number(data.totalAmount || 0).toLocaleString() + ' CR';
  if (el('ns-max-risk')) el('ns-max-risk').textContent = Math.round(data.maxRisk || 0).toLocaleString() + ' CR';

  if (!container) return;
  const stats = data.stats || [];
  if (stats.length === 0) {
    container.innerHTML = '<div class="admin-empty">Chưa có dữ liệu cược cho bộ lọc này.</div>';
    return;
  }

  const typeLabels = { '3top': '3 trên', '3toad': '3 đảo', '2top': '2 trên', '2bottom': '2 dưới', 'run_top': 'Đá trên', 'run_bottom': 'Đá dưới', 'lo': 'Lô', 'de': 'Đề', '3cang': '3 càng', 'dau': 'Đầu', 'duoi': 'Đuôi', 'xien2': 'Xiên 2', 'xien3': 'Xiên 3', 'xien4': 'Xiên 4' };
  const maxAmt = stats[0]?.totalAmount || 1;
  let html = '<table class="admin-table"><thead><tr><th>#</th><th>Số</th><th>Số phiếu</th><th>Tổng cược</th><th>Rủi ro</th><th>Loại cược</th></tr></thead><tbody>';
  stats.forEach(function(s, i) {
    const pct = Math.round((s.totalAmount / maxAmt) * 100);
    const riskCls = pct > 80 ? 'is-hot' : pct > 50 ? 'is-warm' : 'is-cool';
    const types = Object.entries(s.betTypes || {}).map(function(e) { return (typeLabels[e[0]] || e[0]) + ': ' + Number(e[1]).toLocaleString(); }).join(', ');
    html += '<tr>';
    html += '<td data-label="#">' + (i + 1) + '</td>';
    html += '<td data-label="Số"><b class="gold-text">' + escapeHtml(String(s.number || '—')) + '</b></td>';
    html += '<td data-label="Số phiếu">' + Number(s.count || 0) + '</td>';
    html += '<td data-label="Tổng cược" class="' + riskCls + '">' + Number(s.totalAmount || 0).toLocaleString() + ' CR</td>';
    html += '<td data-label="Rủi ro">' + Math.round(s.maxPayout || 0).toLocaleString() + ' CR</td>';
    html += '<td data-label="Loại cược" class="text-muted">' + escapeHtml(types) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
};

function refreshPwaInstallLabels() {
  const bar = document.getElementById("pwa-install-bar");
  const btn = document.getElementById("pwa-install-btn");
  if (!bar || bar.hidden || !btn) return;
  btn.textContent = state._pwaDeferred ? t("install_app") : t("install_ios");
}

function setupPwaInstall() {
  const bar = document.getElementById("pwa-install-bar");
  const btn = document.getElementById("pwa-install-btn");
  const close = document.getElementById("pwa-install-x");
  if (!bar || !btn) return;
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  if (standalone || localStorage.getItem("soklarp-hide-install") === "1") return;
  const desktopInstall = () => window.matchMedia("(min-width: 769px)").matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    state._pwaDeferred = ev;
    if (desktopInstall()) return;
    bar.hidden = false;
    refreshPwaInstallLabels();
  });
  if (ios && window.innerWidth < 820 && !desktopInstall()) {
    bar.hidden = false;
    refreshPwaInstallLabels();
  }
  btn.onclick = async () => {
    if (state._pwaDeferred) {
      state._pwaDeferred.prompt();
      state._pwaDeferred = null;
      bar.hidden = true;
      return;
    }
    showToast(t("install_app"), t("install_ios"), "success");
  };
  if (close) {
    close.onclick = () => {
      bar.hidden = true;
      localStorage.setItem("soklarp-hide-install", "1");
    };
  }
}
