import { createDbProxy } from "../db-proxy.mjs";
import { sanitizeChatText } from "../../lib/sanitize.mjs";
import { secureRandomInt } from "../../lib/secure-random.mjs";

export function registerSocialRoutes(app, { authenticate, getDb, saveDb }) {
  const db = createDbProxy(getDb);

  app.get("/api/chat/messages", (_req, res) => {
    if (!db.chatMessages) db.chatMessages = [];
    res.json({ success: true, messages: db.chatMessages.slice(-30) });
  });

  app.post("/api/chat/send", authenticate, async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Message required" });
    }
    if (!db.chatMessages) db.chatMessages = [];
    const msg = {
      id: "c_" + Date.now().toString(36),
      nickname: sanitizeChatText(req.user.nickname).slice(0, 40) || "Player",
      text: sanitizeChatText(text),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      role: req.user.role
    };
    if (!msg.text) {
      return res.status(400).json({ success: false, message: "Empty message" });
    }
    db.chatMessages.push(msg);
    if (db.chatMessages.length > 100) db.chatMessages.shift();
    await saveDb();
    res.json({ success: true, message: msg });
  });

  app.get("/api/live-wins", (_req, res) => {
    const mask = (name) => {
      const s = String(name || "Player");
      if (s.length <= 2) return `${s[0] || "P"}***`;
      return `${s[0]}***${s.slice(-1)}`;
    };
    const won = (db.bets || [])
      .filter((b) => b.status === "won" && Number(b.payout) > 0)
      .slice(-16)
      .reverse()
      .map((b) => ({
        user: mask(b.nickname || b.username),
        game: String(b.lotteryType || "game").replace(/^game_/, ""),
        amount: Number(b.payout) || 0,
        icon: "◆"
      }));
    const paid = (db.bets || []).reduce((sum, b) => sum + Number(b.payout || 0), 0);
    res.json({
      success: true,
      currency: "CR",
      note: "Recent virtual-credit wins",
      jackpot: 900000 + (paid % 650000),
      wins: won
    });
  });

  app.get("/api/ai-predict/:lotteryId", (_req, res) => {
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    const hotDigits = digits.slice(0, 3);
    res.json({
      success: true,
      hotDigits,
      winProbability: null,
      disclaimer: "Entertainment tip only — not a prediction of outcomes",
      recommendedTop3: `${hotDigits[0]}${hotDigits[1]}${hotDigits[2]}`,
      recommendedBottom2: `${hotDigits[0]}${hotDigits[1]}`
    });
  });
}
