import express from "express";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { openSqliteStore } from "./lib/sqlite-store.mjs";
import { pruneBets } from "./lib/prune-bets.mjs";
import { createLotteryEngine } from "./lib/lottery-settle.mjs";
import { applyCanonicalRoomNames, repairUserNicknames } from "./lib/room-catalog.mjs";
import { secureRandomInt } from "./lib/secure-random.mjs";
import { createRateLimiter } from "./lib/rate-limit.mjs";
import { createCoalescingWriter } from "./lib/db-writer.mjs";
import { registerGameRoutes } from "./server/routes/games.mjs";
import { registerAuthRoutes } from "./server/routes/auth.mjs";
import { registerUserRoutes } from "./server/routes/user.mjs";
import { registerLotteryRoutes } from "./server/routes/lottery.mjs";
import { registerSocialRoutes } from "./server/routes/social.mjs";
import { registerAdminRoutes } from "./server/routes/admin.mjs";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "database.json");
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "data", "soklarp.sqlite");
const PLATFORM_MODE = "virtual-credits";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const AUTH_WINDOW_MS = 15 * 60 * 1000;
/** Failed sign-ins tolerated for one account before it is paused. */
const AUTH_MAX_FAILURES_PER_ACCOUNT = 10;
/**
 * Per-address ceiling, deliberately loose. Mobile carriers put a lot of players
 * behind one address, so the per-account limit is what actually stops a
 * password guess; this only catches obvious floods.
 */
const AUTH_MAX_FAILURES_PER_IP = 100;
const PLAY_WINDOW_MS = 10 * 1000;
const PLAY_MAX = 80;
const RATE_LIMIT_SWEEP_MS = 60 * 1000;

const authFailuresByAccount = createRateLimiter({ windowMs: AUTH_WINDOW_MS, max: AUTH_MAX_FAILURES_PER_ACCOUNT });
const authFailuresByIp = createRateLimiter({ windowMs: AUTH_WINDOW_MS, max: AUTH_MAX_FAILURES_PER_IP });
const playLimiter = createRateLimiter({ windowMs: PLAY_WINDOW_MS, max: PLAY_MAX });
/** Prevents overlapping async draw settles for the same room (double-pay). */
const drawingLocks = new Set();
let sqliteStore = null;
/** Most a play can wait to reach disk. See lib/db-writer.mjs for the trade-off. */
const SNAPSHOT_WRITE_MS = 200;
/** How often the JSON backup and the queryable SQLite tables are rebuilt. */
const SECONDARY_WRITE_MS = 15 * 1000;
let lastSnapshot = null;
let secondaryStale = false;
// Flipped true once initDb() finishes. The scheduler tick must not run before that:
// during boot the async laodl/XSMB fetches yield the event loop and a tick would
// resolve draws with stale or empty drawIds (seen live as duplicate LA-*/HN-* draws
// and an empty-drawId vnmb entry). 
let dbReady = false;

const app = express();
const PORT = process.env.PORT || 59617;

app.disable("x-powered-by");
// Behind a reverse proxy or tunnel every request arrives from the proxy's own
// address, which would drop every player into a single rate-limit bucket — ten
// wrong passwords anywhere would then lock sign-in for everybody. Set
// TRUST_PROXY to the number of proxy hops in front of this server (or any value
// Express accepts). Off by default so a directly exposed deployment cannot have
// its client address spoofed through X-Forwarded-For.
if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});
// Only credential checks are limited, and only failures count towards the cap.
// The previous middleware counted every /api/auth/* request, so a player who
// signed in, changed their password and signed out a few times was locked out
// alongside anyone actually guessing passwords.
app.use(["/api/auth/login", "/api/auth/register"], (req, res, next) => {
  const account = String(req.body?.username ?? "").trim().toLowerCase();
  const address = req.ip;
  if (!authFailuresByAccount.allows(account) || !authFailuresByIp.allows(address)) {
    const retryAfter = Math.max(
      authFailuresByAccount.retryAfterSeconds(account),
      authFailuresByIp.retryAfterSeconds(address)
    );
    if (retryAfter > 0) res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ success: false, message: "Too many failed authentication attempts. Please try again later." });
  }
  res.on("finish", () => {
    if (res.statusCode < 400) return;
    authFailuresByAccount.hit(account);
    authFailuresByIp.hit(address);
  });
  next();
});
app.use((req, res, next) => {
  const playPath = req.path.startsWith("/api/games")
    || req.path === "/api/user/bet"
    || req.path === "/api/user/vnbet";
  if (req.method !== "POST" || !playPath) return next();
  // Keyed on the session token rather than the address, so one player cannot
  // spend everyone else's allowance when the server sits behind a proxy.
  const authHeader = req.headers.authorization || "";
  const key = authHeader.startsWith("Bearer ") ? `session:${authHeader.slice(7)}` : `address:${req.ip}`;
  if (!playLimiter.hit(key)) {
    const retryAfter = playLimiter.retryAfterSeconds(key);
    if (retryAfter > 0) res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ success: false, message: "Too many play requests. Please slow down." });
  }
  next();
});
setInterval(() => {
  authFailuresByAccount.sweep();
  authFailuresByIp.sweep();
  playLimiter.sweep();
}, RATE_LIMIT_SWEEP_MS);
// Serve frontend build from dist
// Disable caching for development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, "dist")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: PLATFORM_MODE,
    dbReady,
    store: sqliteStore ? "sqlite" : "memory",
    rooms: Object.keys(db.lotteries || {}),
    uptimeSec: Math.floor(process.uptime())
  });
});


// Default payouts rates (Thai lottery)
const PAYOUT_RATES = {
  "3top": 900,
  "3toad": 150,
  "2top": 92,
  "2bottom": 92,
  "run_top": 3.2,
  "run_bottom": 4.2
};

// Vietnamese lottery payout rates — tuned for ~5–15% house edge given MB-style prize tables.
// Note: street "lô ×80" is unsustainable when paying once against ~27 endings (P≈24%).
const VN_PAYOUT_RATES = {
  "lo": 3.8,         // Any 2-digit ending in prize set (~27 slots)
  "de": 85,          // Special prize last 2
  "3cang": 800,      // Special prize last 3
  "dau": 6.5,        // First digit of G7
  "duoi": 6.5,       // Last digit of G7
  "xien2": 12,
  "xien3": 28,
  "xien4": 55
};

// In-memory Database state
let db = {
  users: [],
  bets: [],
  lotteries: {},
  sessions: {}, // token -> username
  transactions: [] // deposit/withdrawal transactions
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword?.startsWith("scrypt$")) {
    // Legacy plaintext only during one-time migration; never accept after hash exists.
    return typeof storedPassword === "string" && storedPassword.length > 0 && password === storedPassword;
  }
  const [, salt, storedHash] = storedPassword.split("$");
  const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(derivedHash, "hex"));
}

function migratePlaintextPasswords() {
  let changed = 0;
  for (const user of db.users || []) {
    if (user.password && !String(user.password).startsWith("scrypt$")) {
      user.password = hashPassword(user.password);
      changed += 1;
    }
  }
  if (changed) console.log(`🔐 Migrated ${changed} plaintext password(s) to scrypt.`);
  return changed;
}

function normalizeLoadedDb(data) {
  db = data;
  if (!db.sessions) db.sessions = {};
  if (!db.transactions) db.transactions = [];
  if (!db.chatMessages) db.chatMessages = [];
  if (!db.platform) db.platform = { mode: PLATFORM_MODE, cashFeaturesEnabled: false };
  if (!db.systemSettings) {
    db.systemSettings = {
      rates: { ...PAYOUT_RATES },
      vnRates: { ...VN_PAYOUT_RATES },
      limits: { minBet: 10, maxBet: 50000 }
    };
  }
  if (!db.systemSettings.vnRates) db.systemSettings.vnRates = { ...VN_PAYOUT_RATES };
  Object.assign(VN_PAYOUT_RATES, db.systemSettings.vnRates);
  db.users.forEach((u) => {
    if (!u.status) u.status = "active";
  });
  repairUserNicknames(db.users);
  applyCanonicalRoomNames(db.lotteries);
  migratePlaintextPasswords();
}

// Initial database structure
async function initDb() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  sqliteStore = openSqliteStore(SQLITE_PATH);

  const fromSqlite = sqliteStore.load();
  if (fromSqlite?.users) {
    normalizeLoadedDb(fromSqlite);
    console.log("Database loaded from SQLite.");
  } else if (existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(await fs.readFile(DB_PATH, "utf8"));
      normalizeLoadedDb(data);
      const migrated = snapshotForStore();
      sqliteStore.saveSnapshot(JSON.stringify(migrated));
      sqliteStore.refreshIndexes(migrated);
      console.log("Database migrated from JSON to SQLite.");
    } catch (err) {
      console.error("Failed to parse database.json, initializing fresh one:", err);
      await createFreshDb();
    }
  } else {
    await createFreshDb();
  }

  await initLotteriesState();
  console.log("Lottery rooms initialized:", Object.keys(db.lotteries).join(", "));
  await saveDb();
  await flushAll();
  console.log("Database saved with all lottery rooms.");
}

function pruneSessions() {
  const now = Date.now();
  const next = {};
  for (const [token, sess] of Object.entries(db.sessions || {})) {
    if (!sess) continue;
    if (typeof sess === "string") {
      next[token] = { username: sess, expiresAt: now + SESSION_TTL_MS };
      continue;
    }
    if (sess.username && sess.expiresAt > now) next[token] = sess;
  }
  db.sessions = next;
  return next;
}

function snapshotForStore() {
  db.bets = pruneBets(db.bets || []);
  return {
    users: db.users,
    bets: db.bets,
    lotteries: db.lotteries,
    transactions: db.transactions || [],
    systemSettings: db.systemSettings,
    sessions: pruneSessions(),
    chatMessages: (db.chatMessages || []).slice(-100),
    platform: { mode: PLATFORM_MODE, cashFeaturesEnabled: false }
  };
}

/**
 * Writes the authoritative snapshot. Serialises once and hands the same string
 * to SQLite and to the backup writer, which used to serialise the whole
 * database a second time, pretty-printed, on every play.
 */
function writeSnapshot() {
  const snapshot = snapshotForStore();
  const payload = JSON.stringify(snapshot);
  if (sqliteStore) sqliteStore.saveSnapshot(payload);
  lastSnapshot = { snapshot, payload };
  secondaryStale = true;
}

const snapshotWriter = createCoalescingWriter({
  write: writeSnapshot,
  intervalMs: SNAPSHOT_WRITE_MS,
  onError: (err) => console.error("Snapshot save failed:", err)
});

/**
 * Rebuilds the artefacts nothing reads back at runtime: the database.json
 * backup and the SQLite tables kept for CLI queries.
 */
async function writeSecondaryArtefacts() {
  if (!secondaryStale || !lastSnapshot) return;
  const { snapshot, payload } = lastSnapshot;
  secondaryStale = false;
  try {
    const tmp = DB_PATH + ".tmp";
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, DB_PATH);
  } catch (err) {
    console.error("JSON backup save failed:", err);
  }
  try {
    if (sqliteStore) {
      sqliteStore.refreshIndexes(snapshot);
      sqliteStore.checkpoint();
    }
  } catch (err) {
    console.error("SQLite index refresh failed:", err);
  }
}

const secondaryWriter = createCoalescingWriter({
  write: writeSecondaryArtefacts,
  intervalMs: SECONDARY_WRITE_MS,
  onError: (err) => console.error("Secondary save failed:", err)
});

/** Records that the database changed. The write follows within SNAPSHOT_WRITE_MS. */
async function saveDb() {
  snapshotWriter.markDirty();
  secondaryWriter.markDirty();
}

/**
 * Persists immediately and waits for it. For changes a player would notice
 * going missing after a restart — creating an account, moving credit — rather
 * than for ordinary play.
 */
async function flushDb() {
  await snapshotWriter.flush();
}

/** Everything on disk, including the backup file. Used at shutdown. */
async function flushAll() {
  await snapshotWriter.flush();
  await secondaryWriter.flush();
}

async function createFreshDb() {
  db = {
    users: [
      {
        username: "admin",
        password: hashPassword(process.env.INITIAL_ADMIN_PASSWORD || "ChangeMeBeforeLaunch!"),
        nickname: "Admin",
        balance: 99999999,
        role: "admin",
        status: "active"
      },
      {
        username: "thaiplayer",
        password: hashPassword(process.env.INITIAL_PLAYER_PASSWORD || "PlayerChangeMe!"),
        nickname: "Player",
        balance: 50000,
        role: "user",
        status: "active"
      }
    ],
    bets: [],
    lotteries: {},
    sessions: {},
    transactions: [],
    platform: { mode: PLATFORM_MODE, cashFeaturesEnabled: false },
    systemSettings: {
      rates: {
        "3top": 900,
        "3toad": 150,
        "2top": 92,
        "2bottom": 92,
        "run_top": 3.2,
        "run_bottom": 4.2
      },
      limits: {
        minBet: 10,
        maxBet: 50000
      }
    }
  };
  await saveDb();
  console.log("ðŸ†• Fresh database created with default admin and player accounts.");
}

// — needed to sign laodl.com API requests
function laodlSignature(plaintext, passphrase) {
  const salt = crypto.randomBytes(8);
  let data = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (data.length < 48) {
    const h = crypto.createHash("md5");
    h.update(prev); h.update(Buffer.from(passphrase, "utf8")); h.update(salt);
    prev = h.digest();
    data = Buffer.concat([data, prev]);
  }
  const key = data.subarray(0, 32);
  const iv = data.subarray(32, 48);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from("Salted__", "utf8"), salt, ct]).toString("base64");
}

// Fetch full historical results from laodl.com API
async function fetchLaosHistory() {
  try {
    const secret = process.env.LAODL_SECRET || "laodlsignature123";
    const sigPath = "/api/v1/website/laolot/WinPrizeHistory?type=1";
    const apiUrl = "https://laodl.com/api/website/laolot/WinPrizeHistory?type=1";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "X-SIGNATURE-APP": laodlSignature(JSON.stringify(sigPath) + secret, secret)
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const rounds = (data.resultData || []).filter(r => r.winNumber && /^\d{6}$/.test(String(r.winNumber)));
    if (rounds.length === 0) return null;
    return rounds.map(r => {
      const win = String(r.winNumber);
      const dateStr = (r.roundDate || "").slice(0, 10);
      return {
        // roundNumber cycles yearly on laodl.com — embed the date to keep IDs unique
        drawId: `LAOS-${dateStr.replace(/-/g, "")}-${r.roundNumber}`,
        numbers: { top3: win.slice(-3), bottom2: win.slice(-2), firstPrize: win },
        drawnAt: dateStr ? `${dateStr}T13:05:00.000Z` : new Date().toISOString() // 20:05 ICT = 13:05 UTC
      };
    });
  } catch (err) {
    console.log("⚠️ Failed to fetch Laos history from laodl.com:", err.message || err);
    return null;
  }
}

async function initLotteriesState() {
  const laosHistory = await fetchLaosHistory();

  const defaultLotteries = {
    yeekee3: {
      id: "yeekee3",
      name: "Yeekee 3 min",
      type: "yeekee",
      countdown: 180,
      interval: 180,
      drawCounter: 1,
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true, blockedNumbers: [], halfPayNumbers: [] }
    },
    yeekee30: {
      id: "yeekee30",
      name: "Yeekee 30 min",
      type: "yeekee",
      countdown: 1800,
      interval: 1800,
      drawCounter: 1,
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true, blockedNumbers: [], halfPayNumbers: [] }
    },
    hanoi: {
      id: "hanoi",
      name: "Hanoi Daily",
      type: "scheduled",
      countdown: 0,
      drawTimeOfDay: "18:30",
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true, blockedNumbers: [], halfPayNumbers: [] }
    },
    laos: {
      id: "laos",
      name: "Lao Development",
      type: "scheduled",
      countdown: 0,
      drawTimeOfDay: "20:05",
      nextDrawId: "",
      lastResults: laosHistory || [],
      settings: { autoDraw: true, blockedNumbers: [], halfPayNumbers: [] }
    },
    // ðŸ‡»ðŸ‡³ Vietnamese Lottery Rooms
    vnfast: {
      id: "vnfast",
      name: "VN Fast 5 min",
      type: "vietlottery",
      region: "MB",
      countdown: 300,
      interval: 300,
      drawCounter: 1,
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true }
    },
    vnmb: {
      id: "vnmb",
      name: "XSMB — North",
      type: "vietlottery",
      region: "MB",
      countdown: 0,
      drawTimeOfDay: "18:15",
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true }
    },
    vnmn: {
      id: "vnmn",
      name: "XSMN — South (simulated)",
      type: "vietlottery",
      region: "MN",
      countdown: 0,
      drawTimeOfDay: "16:30",
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true }
    },
    vnmt: {
      id: "vnmt",
      name: "XSMT — Central (simulated)",
      type: "vietlottery",
      region: "MT",
      countdown: 0,
      drawTimeOfDay: "17:30",
      nextDrawId: "",
      lastResults: [],
      settings: { autoDraw: true }
    }
  };

  for (const key in defaultLotteries) {
    if (!db.lotteries[key]) {
      db.lotteries[key] = defaultLotteries[key];
    } else {
      db.lotteries[key] = { ...defaultLotteries[key], ...db.lotteries[key] };
    }
    if (key === "laos" && laosHistory && laosHistory.length > 0) {
      db.lotteries[key].lastResults = laosHistory;
    }
    if (!db.lotteries[key].lastResults || db.lotteries[key].lastResults.length === 0) {
      if (db.lotteries[key].type === "vietlottery") {
        // Seed VN lottery — try real results for vnmb, random for others
        let samplePrizes = null;
        if (key === "vnmb") {
          samplePrizes = await fetchXSMBResults();
        }
        if (!samplePrizes) {
          samplePrizes = generateVNPrizes();
        }
        db.lotteries[key].lastResults = [
          { drawId: `${key.toUpperCase()}-003`, prizes: samplePrizes, drawnAt: new Date(Date.now() - 300000).toISOString() }
        ];
      } else {
        db.lotteries[key].lastResults = [
          { drawId: `${key.toUpperCase()}-003`, numbers: { top3: "589", bottom2: "47" }, drawnAt: new Date(Date.now() - 180000).toISOString() },
          { drawId: `${key.toUpperCase()}-002`, numbers: { top3: "123", bottom2: "99" }, drawnAt: new Date(Date.now() - 360000).toISOString() },
          { drawId: `${key.toUpperCase()}-001`, numbers: { top3: "782", bottom2: "15" }, drawnAt: new Date(Date.now() - 540000).toISOString() }
        ];
      }
    }
    generateNextDrawId(key);

    applyCanonicalRoomNames(db.lotteries);
    repairUserNicknames(db.users);

    // Scheduled rooms: arm the countdown for the next draw on every boot.
    // (The old tick re-armed the countdown before the draw branch could ever fire,
    // so scheduled rooms never actually drew — initialization belongs here.)
    const sched = db.lotteries[key];
    if (sched.type === "scheduled" || (sched.type === "vietlottery" && !sched.interval)) {
      sched.countdown = calculateSecondsUntil(sched.drawTimeOfDay);
    }
  }

  // Refresh vnmb with today's real XSMB result (replaces stale random data on restart)
  if (db.lotteries.vnmb && db.lotteries.vnmb.lastResults?.length > 0) {
    const realPrizes = await fetchXSMBResults();
    if (realPrizes && db.lotteries.vnmb.lastResults[0].prizes?.db !== realPrizes.db) {
      db.lotteries.vnmb.lastResults.unshift({
        drawId: `XSMB-${getThaiDateString().replace(/-/g, "")}`,
        prizes: realPrizes,
        drawnAt: new Date().toISOString()
      });
      if (db.lotteries.vnmb.lastResults.length > 15) db.lotteries.vnmb.lastResults.pop();
      console.log("✅ vnmb updated with today's real XSMB result");
    }
  }

  // Refresh laos with real Laos results from laodl.com
  if (db.lotteries.laos && laosHistory && laosHistory.length > 0) {
    db.lotteries.laos.lastResults = laosHistory;
    console.log(`✅ laos populated with ${laosHistory.length} real results from laodl.com (Kỳ ${laosHistory[0].drawId}: ${laosHistory[0].numbers.firstPrize})`);
  }

  // Boot inside the draw window → draw/poll immediately instead of skipping to tomorrow
  for (const key of ["laos", "vnmb", "vnmn", "vnmt", "hanoi"]) {
    armMissedDrawWindow(db.lotteries[key]);
  }

  for (const key of ["laos", "vnmb", "vnmn", "vnmt", "hanoi"]) {
    const l = db.lotteries[key];
    if (l) {
      const target = l.drawTimeOfDay || `mỗi ${Math.round((l.interval || 0) / 60)} phút`;
      console.log(`⏳ ${key}: draw lúc ${target}, countdown ${l.countdown}s`);
    }
  }
}

// Thai-local calendar date (UTC+7) of an ISO timestamp
function thaiDateOf(iso) {
  return new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

function didDrawToday(lottery) {
  const latest = lottery.lastResults?.[0];
  if (!latest) return false;
  const todayCompact = getThaiDateString().replace(/-/g, "");
  if (latest.drawId && latest.drawId.includes(todayCompact)) return true;
  return thaiDateOf(latest.drawnAt) === getThaiDateString();
}

// If the server boots at any point after a room's draw time and today's result is
// not recorded yet, arm the countdown to 1 so the scheduler draws/polls right away
// (with the fresh drawId initLotteriesState just generated). Without this, a reboot
// after draw time skips the whole day and that day's bets hang as pending forever.
function armMissedDrawWindow(lottery) {
  if (!lottery || !lottery.drawTimeOfDay) return;
  const now = getThaiTime();
  const secsToMidnight = 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
  const secs = calculateSecondsUntil(lottery.drawTimeOfDay);
  // calculateSecondsUntil rolls over to tomorrow once today's drawTime passes —
  // i.e. it then exceeds the time remaining until midnight.
  if (secs > secsToMidnight && !didDrawToday(lottery)) {
    lottery.countdown = 1;
    console.log(`⏰ ${lottery.id}: đã qua giờ draw ${lottery.drawTimeOfDay} mà chưa có kết quả — sẽ draw/poll ngay bây giờ`);
  }
}

// Date (Thai-local, UTC+7) that the still-pending round of a daily room belongs to:
// today's while today's result is missing (even after draw time — armMissedDrawWindow
// resolves it right after boot), tomorrow's once today's result exists and draw time
// has passed. Using the generation-time date unconditionally labelled every daily
// draw with the PREVIOUS day's date (e.g. HN-<Saturday> resolved on Sunday 18:44).
function nextScheduledDrawDate(lottery) {
  const now = getThaiTime();
  const secsToMidnight = 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
  const pastDrawTime = calculateSecondsUntil(lottery.drawTimeOfDay) > secsToMidnight;
  if (pastDrawTime && didDrawToday(lottery)) now.setDate(now.getDate() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function generateNextDrawId(lotteryId) {
  const lottery = db.lotteries[lotteryId];
  const dateStr = getThaiDateString();
  if (lottery.type === "yeekee") {
    const padCounter = String(lottery.drawCounter).padStart(3, "0");
    lottery.nextDrawId = `${lotteryId.toUpperCase()}-${dateStr.replace(/-/g, "")}-${padCounter}`;
  } else if (lottery.type === "vietlottery") {
    if (lottery.interval) {
      // Fast draw type
      const padCounter = String(lottery.drawCounter || 1).padStart(3, "0");
      lottery.nextDrawId = `${lotteryId.toUpperCase()}-${dateStr.replace(/-/g, "")}-${padCounter}`;
    } else {
      // Daily scheduled
      const prefix = { vnmb: "XSMB", vnmn: "XSMN", vnmt: "XSMT", vnfast: "XSVN" }[lotteryId] || lotteryId.toUpperCase();
      lottery.nextDrawId = `${prefix}-${nextScheduledDrawDate(lottery).replace(/-/g, "")}`;
    }
  } else {
    const prefix = lotteryId === "hanoi" ? "HN" : "LA";
    lottery.nextDrawId = `${prefix}-${nextScheduledDrawDate(lottery).replace(/-/g, "")}`;
  }
}

// Generate a full Vietnamese lottery prize table (Miá»n Báº¯c style)
function generateVNPrizes() {
  const r = () => String(secureRandomInt(100000)).padStart(5, "0");
  const r4 = () => String(secureRandomInt(10000)).padStart(4, "0");
  const r3 = () => String(secureRandomInt(1000)).padStart(3, "0");
  const r2 = () => String(secureRandomInt(100)).padStart(2, "0");

  return {
    db: r(),                    // Giáº£i Äáº·c Biá»‡t (1 sá»‘, 5 chá»¯ sá»‘)
    nhat: r(),                  // Giáº£i Nháº¥t (1 sá»‘)
    nhi: [r(), r()],            // Giáº£i NhÃ¬ (2 sá»‘)
    ba: [r(), r(), r(), r(), r(), r()], // Giáº£i Ba (6 sá»‘)
    tu: [r4(), r4(), r4(), r4()],        // Giáº£i TÆ° (4 sá»‘)
    nam: [r4(), r4(), r4(), r4(), r4(), r4()], // Giáº£i NÄƒm (6 sá»‘)
    sau: [r3(), r3(), r3()],    // Giáº£i SÃ¡u (3 sá»‘)
    bay: [r2(), r2(), r2(), r2()] // Giáº£i Báº£y (4 sá»‘, 2 chá»¯ sá»‘)
  };
}

// Helpers
function getThaiDateString() {
  // Current date in Thai timezone (UTC+7)
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 7));
  const year = nd.getFullYear();
  const month = String(nd.getMonth() + 1).padStart(2, "0");
  const date = String(nd.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function getThaiTime() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 7));
  return nd;
}

function calculateSecondsUntil(timeStr) {
  const [targetHour, targetMinute] = timeStr.split(":").map(Number);
  const now = getThaiTime();
  
  const target = getThaiTime();
  target.setHours(targetHour, targetMinute, 0, 0);
  
  if (target.getTime() <= now.getTime()) {
    // Time already passed today, target is tomorrow
    target.setDate(target.getDate() + 1);
  }
  
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

// Fetch real XSMB results from external API
async function fetchXSMBResults() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://api-xsmb-today.onrender.com/api/v1", {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) { console.log("⚠️ XSMB API returned status", res.status); return null; }
    const data = await res.json();
    const r = data.results;
    if (!r || !r["ĐB"] || !r["G7"]) { console.log("⚠️ XSMB API response missing data"); return null; }
    const prizes = {
      db: String(r["ĐB"]?.[0] || "").padStart(5, "0"),
      nhat: String(r["G1"]?.[0] || "").padStart(5, "0"),
      nhi: (r["G2"] || []).map(n => String(n).padStart(5, "0")),
      ba: (r["G3"] || []).map(n => String(n).padStart(5, "0")),
      tu: (r["G4"] || []).map(n => String(n).padStart(4, "0")),
      nam: (r["G5"] || []).map(n => String(n).padStart(4, "0")),
      sau: (r["G6"] || []).map(n => String(n).padStart(3, "0")),
      bay: (r["G7"] || []).map(n => String(n).padStart(2, "0"))
    };
    // Validate: must have exactly 27 numbers total
    const total = 1 + 1 + prizes.nhi.length + prizes.ba.length + prizes.tu.length + prizes.nam.length + prizes.sau.length + prizes.bay.length;
    if (total !== 27) { console.log("⚠️ XSMB API returned wrong number count:", total); return null; }
    console.log(`✅ XSMB real results fetched — ĐB: ${prizes.db}, date: ${data.time}`);
    return prizes;
  } catch (err) {
    console.log("⚠️ XSMB API fetch failed:", err.message || err);
    return null;
  }
}

// CryptoJS-compatible AES (OpenSSL "Salted__" format, AES-256-CBC, EVP_BytesToKey/MD5)


// Fetch real Laos Development Lottery results from laodl.com API (winNumber = 6 digits)
async function fetchLaosResults(maxAttempts = 3) {
  const secret = process.env.LAODL_SECRET || "laodlsignature123";
  const sigPath = "/api/v1/website/laolot/WinPrizeHistory?type=1";
  const apiUrl = "https://laodl.com/api/website/laolot/WinPrizeHistory?type=1";
  // Draw ends 20:00, results may post a few minutes later — retry up to 3 times
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
          "X-SIGNATURE-APP": laodlSignature(JSON.stringify(sigPath) + secret, secret)
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) { console.log(`⚠️ laodl.com API returned status ${res.status} (attempt ${attempt})`); continue; }
      const data = await res.json();
      const rounds = data.resultData || [];
      // Laos shares UTC+7 with Thailand — compare with server's Thai-local date
      const now = getThaiTime();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayRound = rounds.find(r => String(r.roundDate || "").startsWith(todayStr));
      if (!todayRound) {
        // LDL không mở thưởng ngày này (cuối tuần) — không chờ, dùng random
        console.log(`ℹ️ laodl.com không có kỳ nào cho ${todayStr} (nghỉ cuối tuần?)`);
        return null;
      }
      if (todayRound.winNumber && /^\d{6}$/.test(String(todayRound.winNumber))) {
        const win = String(todayRound.winNumber);
        console.log(`✅ Laos real results fetched — kỳ ${todayRound.roundNumber}: ${win}`);
        // Lao betting convention: top3/bottom2 = last 3/2 digits of the win number
        return { top3: win.slice(-3), bottom2: win.slice(-2), firstPrize: win };
      }
      console.log(`⚠️ laodl.com chưa có kết quả hôm nay ${todayStr} (attempt ${attempt})`);
    } catch (err) {
      console.log(`⚠️ laodl.com fetch failed (attempt ${attempt}):`, err.message || err);
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 20000));
  }
  return null;
}

const { resolveDraw, resolveVNDraw, settleLotteryRoom } = createLotteryEngine({
  getDb: () => db,
  drawingLocks,
  saveDb,
  calculateSecondsUntil,
  didDrawToday,
  generateVNPrizes,
  generateNextDrawId,
  fetchXSMBResults,
  fetchLaosResults
});

// Background scheduler tick
setInterval(() => {
  if (!dbReady) return;
  for (const key in db.lotteries) {
    const lottery = db.lotteries[key];
    if (lottery.countdown > 0) {
      lottery.countdown -= 1;
      continue;
    }
    if (!lottery.settings?.autoDraw) {
      lottery.countdown = -1;
      continue;
    }
    // Fire-and-forget with lock inside settleLotteryRoom
    settleLotteryRoom(key).catch((err) => console.error(`Draw settle failed [${key}]:`, err));
  }
}, 1000);

// API Middlewares
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Please sign in (Unauthorized)" });
  }
  const token = authHeader.split(" ")[1];
  const session = db.sessions[token];
  const username = typeof session === "string" ? session : session?.username;
  if (!username || (typeof session === "object" && session.expiresAt <= Date.now())) {
    delete db.sessions[token];
    return res.status(401).json({ success: false, message: "Session expired. Please sign in again" });
  }
  const user = db.users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" });
  }
  if (user.status === "banned") {
    return res.status(403).json({ success: false, message: "Account is banned" });
  }
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access only" });
  }
  next();
}

registerAuthRoutes(app, {
  authenticate,
  getDb: () => db,
  saveDb,
  flushDb,
  hashPassword,
  verifyPassword,
  sessionTtlMs: SESSION_TTL_MS
});

registerLotteryRoutes(app, {
  getDb: () => db,
  payoutRates: PAYOUT_RATES,
  vnPayoutRates: VN_PAYOUT_RATES,
  platformMode: PLATFORM_MODE
});

registerUserRoutes(app, {
  authenticate,
  getDb: () => db,
  saveDb,
  vnPayoutRates: VN_PAYOUT_RATES
});

registerGameRoutes(app, {
  authenticate,
  getDb: () => db,
  saveDb
});

registerSocialRoutes(app, {
  authenticate,
  getDb: () => db,
  saveDb
});

registerAdminRoutes(app, {
  authenticate,
  adminOnly,
  getDb: () => db,
  saveDb,
  flushDb,
  resolveDraw,
  resolveVNDraw,
  generateVNPrizes,
  hashPassword,
  calculateSecondsUntil,
  drawingLocks
});

app.get("/poster", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "poster-live.html"));
});

// Live XSMB results page — must be BEFORE catch-all
app.get("/live", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "live-xsmb.html"));
});
app.get("/truc-tiep", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "live-xsmb.html"));
});

// Live Laos results page — must be BEFORE catch-all
app.get("/livelaos", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "live-laos.html"));
});
app.get("/live-laos", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "live-laos.html"));
});
app.get("/truc-tiep-laos", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "live-laos.html"));
});

// Fallback to serving the HTML index for single-page application router support
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Plays are only written every SNAPSHOT_WRITE_MS, so an orderly shutdown has to
// drain what is still pending instead of dropping the last fraction of a second.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await flushAll();
      if (sqliteStore) sqliteStore.close();
    } catch (err) {
      console.error("Shutdown save failed:", err);
    }
    process.exit(0);
  });
}

// Main Server Boot
initDb().then(() => {
  dbReady = true;
app.listen(PORT, () => {
    console.log(`
==================================================
ðŸ’Ž Luxury Thai Lottery Web Server Running
ðŸš€ Local URL: http://localhost:${PORT}
ðŸ•’ Current Time: ${getThaiTime().toLocaleString("th-TH")}
==================================================
    `);
  });
});
