import { createDbProxy } from "../db-proxy.mjs";
import { secureRandomInt } from "../../lib/secure-random.mjs";

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function padLast(value, len) {
  const d = digitsOnly(value);
  if (!d) return "";
  return d.padStart(len, "0").slice(-len);
}

function normalizeThaiBetNumber(betType, raw) {
  if (betType === "3top" || betType === "3toad") return padLast(raw, 3);
  if (betType === "2top" || betType === "2bottom") return padLast(raw, 2);
  if (betType === "run_top" || betType === "run_bottom") return padLast(raw, 1);
  return digitsOnly(raw);
}

function normalizeVnBetNumber(betType, raw) {
  const s = String(raw ?? "").trim().replace(/\s+/g, "");
  if (betType === "lo" || betType === "de") return padLast(s, 2);
  if (betType === "3cang") return padLast(s, 3);
  if (betType === "dau" || betType === "duoi") return padLast(s, 1);
  return s.replace(/;+/g, ",");
}

export function registerUserRoutes(app, { authenticate, getDb, saveDb, vnPayoutRates }) {
  const db = createDbProxy(getDb);
  const VN_PAYOUT_RATES = vnPayoutRates;

  app.get("/api/user/profile", authenticate, (req, res) => {
    res.json({
      success: true,
      user: {
        username: req.user.username,
        nickname: req.user.nickname,
        balance: req.user.balance,
        role: req.user.role
      }
    });
  });

  app.post("/api/user/bet", authenticate, async (req, res) => {
    const { lotteryType, drawId, bets } = req.body;
    if (!lotteryType || !drawId || !bets || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ success: false, message: "Phieu cuoc khong hop le" });
    }

    const lottery = db.lotteries[lotteryType];
    if (!lottery) {
      return res.status(400).json({ success: false, message: "Khong tim thay phong xo so" });
    }

    if (lottery.nextDrawId !== drawId) {
      return res.status(400).json({ success: false, message: "Ky da dong, thu ky moi", nextDrawId: lottery.nextDrawId, countdown: lottery.countdown });
    }

    if (lottery.countdown <= 0) {
      return res.status(400).json({ success: false, message: "Da het gio dat cuoc ky nay", nextDrawId: lottery.nextDrawId, countdown: lottery.countdown });
    }

    // Calculate total bet cost
    const blockedNumbers = lottery.settings?.blockedNumbers || [];
    const halfPayNumbers = lottery.settings?.halfPayNumbers || [];

    let totalCost = 0;
    for (const bet of bets) {
      if (!bet.betType || bet.numbers == null || String(bet.numbers).trim() === "" || bet.amount == null || isNaN(bet.amount) || bet.amount <= 0) {
        return res.status(400).json({ success: false, message: "Loai cuoc hoac so tien khong hop le" });
      }
      const num = normalizeThaiBetNumber(bet.betType, bet.numbers);
      bet.numbers = num;
      if (blockedNumbers.includes(num)) {
        return res.status(400).json({ success: false, message: `So ${num} dang bi khoa` });
      }

      if (bet.betType === "3top" || bet.betType === "3toad") {
        if (num.length !== 3 || Number.isNaN(Number(num))) return res.status(400).json({ success: false, message: `3 so can 3 chu so: ${num}` });
      } else if (bet.betType === "2top" || bet.betType === "2bottom") {
        if (num.length !== 2 || Number.isNaN(Number(num))) return res.status(400).json({ success: false, message: `2 so can 2 chu so: ${num}` });
      } else if (bet.betType === "run_top" || bet.betType === "run_bottom") {
        if (num.length !== 1 || Number.isNaN(Number(num))) return res.status(400).json({ success: false, message: `Chay can 1 chu so: ${num}` });
      } else {
        return res.status(400).json({ success: false, message: "Loai cuoc khong hop le" });
      }

      const amt = Number(bet.amount);
      const minBet = db.systemSettings?.limits?.minBet ?? 10;
      const maxBet = db.systemSettings?.limits?.maxBet ?? 50000;
      if (amt < minBet) {
        return res.status(400).json({ success: false, message: `Cuoc toi thieu ${minBet} CR` });
      }
      if (amt > maxBet) {
        return res.status(400).json({ success: false, message: `Cuoc toi da ${maxBet} CR` });
      }

      totalCost += amt;
    }

    if (req.user.balance < totalCost) {
      return res.status(400).json({ success: false, message: `Khong du CR (can ${totalCost})` });
    }

    // Deduct user balance
    req.user.balance -= totalCost;

    // Insert bets
    const timestamp = new Date().toISOString();
    for (const bet of bets) {
      const num = String(bet.numbers).trim();
      let rate = db.systemSettings?.rates?.[bet.betType] ?? 0;
      if (halfPayNumbers.includes(num)) {
        rate = rate * 0.5; // Pay 50%
      }

      db.bets.push({
        id: "bet_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
        username: req.user.username,
        nickname: req.user.nickname,
        lotteryType,
        drawId,
        betType: bet.betType,
        numbers: num,
        amount: Number(bet.amount),
        rate: rate,
        status: "pending",
        payout: 0,
        createdAt: timestamp
      });
    }

    await saveDb();

    res.json({
      success: true,
      message: "Dat cuoc thanh cong",
      newBalance: req.user.balance
    });
  });

  app.get("/api/user/bets", authenticate, (req, res) => {
    const userBets = db.bets
      .filter(b => b.username === req.user.username)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, bets: userBets });
  });

  // ðŸ‡»ðŸ‡³ Vietnamese Lottery Bet API
  app.post("/api/user/vnbet", authenticate, async (req, res) => {
    const { lotteryId, drawId, betType, numbers, amount } = req.body;

    if (!lotteryId || !drawId || !betType || !numbers || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Thong tin dat cuoc khong hop le" });
    }

    const lottery = db.lotteries[lotteryId];
    if (!lottery || lottery.type !== "vietlottery") {
      return res.status(400).json({ success: false, message: "Khong tim thay phong xo so nay" });
    }

    if (lottery.nextDrawId !== drawId) {
      return res.status(400).json({ success: false, message: "Ky da dong, thu ky moi", nextDrawId: lottery.nextDrawId, countdown: lottery.countdown });
    }

    if (lottery.countdown <= 0) {
      return res.status(400).json({ success: false, message: "Da het gio dat cuoc ky nay", nextDrawId: lottery.nextDrawId, countdown: lottery.countdown });
    }

    let num = normalizeVnBetNumber(betType, numbers);
    const amt = Number(amount);
    const validTypes = ["lo", "de", "3cang", "dau", "duoi", "xien2", "xien3", "xien4"];

    if (!validTypes.includes(betType)) {
      return res.status(400).json({ success: false, message: "Loai cuoc khong hop le" });
    }

    if ((betType === "lo" || betType === "de") && (num.length !== 2 || Number.isNaN(Number(num)))) {
      return res.status(400).json({ success: false, message: "Lo/De can 2 chu so (00-99)" });
    }
    if (betType === "3cang" && (num.length !== 3 || Number.isNaN(Number(num)))) {
      return res.status(400).json({ success: false, message: "3 Cang can 3 chu so (000-999)" });
    }
    if ((betType === "dau" || betType === "duoi") && (num.length !== 1 || Number.isNaN(Number(num)))) {
      return res.status(400).json({ success: false, message: "Dau/Duoi can 1 chu so (0-9)" });
    }
    if (["xien2", "xien3", "xien4"].includes(betType)) {
      const parts = num.split(",").map((p) => padLast(p.trim(), 2));
      const expectedCount = betType === "xien2" ? 2 : (betType === "xien3" ? 3 : 4);
      if (parts.length !== expectedCount || parts.some((p) => p.length !== 2 || Number.isNaN(Number(p)))) {
        return res.status(400).json({ success: false, message: `Xien ${expectedCount} can ${expectedCount} cap, moi cap 2 chu so` });
      }
      num = parts.join(",");
    }

    const minBet = db.systemSettings?.limits?.minBet ?? 10;
    const maxBet = Math.min(db.systemSettings?.limits?.maxBet ?? 50000, betType === "lo" ? 5000 : 50000);
    if (amt < minBet) return res.status(400).json({ success: false, message: `Cuoc toi thieu ${minBet} CR` });
    if (amt > maxBet) return res.status(400).json({ success: false, message: `Cuoc toi da ${maxBet} CR` });

    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Khong du CR (can ${amt})` });
    }

    req.user.balance -= amt;
    const rate = db.systemSettings?.vnRates?.[betType] ?? VN_PAYOUT_RATES[betType];

    db.bets.push({
      id: "vnbet_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: lotteryId,
      drawId,
      betType,
      numbers: num,
      amount: amt,
      rate,
      status: "pending",
      payout: 0,
      createdAt: new Date().toISOString(),
      gameCategory: "vietlottery"
    });

    await saveDb();

    res.json({
      success: true,
      message: `Dat cuoc thanh cong: ${betType.toUpperCase()} ${num} - ${amt.toLocaleString()} CR`,
      newBalance: req.user.balance
    });
  });

  // Submit deposit or withdrawal request
  app.post("/api/transactions", authenticate, async (req, res) => {
    return res.status(403).json({ success: false, message: "Cash transactions are disabled. This platform uses virtual credits only." });
    /*
    const { type, amount, bank, account } = req.body;
    if (!type || (type !== "deposit" && type !== "withdraw") || !amount || isNaN(amount) || amount <= 0 || !bank || !account) {
      return res.status(400).json({ success: false, message: "Invalid transaction payload" });
    }

    const amt = Number(amount);

    if (type === "withdraw") {
      if (req.user.balance < amt) {
        return res.status(400).json({ success: false, message: "Not enough CR to withdraw" });
      }
      // Deduct immediately for withdrawal
      req.user.balance -= amt;
    }

    const newTx = {
      id: "tx_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      type,
      amount: amt,
      bank,
      account,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    await saveDb();

    res.json({
      success: true,
      message: type === "deposit" ? "à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¹à¸ˆà¹‰à¸‡à¸à¸²à¸à¹€à¸‡à¸´à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ! à¸£à¸­à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸šà¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸¢à¸­à¸”à¹€à¸‡à¸´à¸™" : "à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸–à¸­à¸™à¹€à¸‡à¸´à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ! à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸ˆà¸°à¸–à¸¹à¸à¸«à¸±à¸à¸­à¸­à¸à¹à¸¥à¸°à¹‚à¸­à¸™à¹€à¸‚à¹‰à¸²à¸šà¸±à¸à¸Šà¸µà¸«à¸¥à¸±à¸‡à¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š",
      newBalance: req.user.balance,
      transaction: newTx
    });
    */
  });

  // Get user transaction history
  app.get("/api/transactions", authenticate, (req, res) => {
    const list = db.transactions.filter(t => t.username === req.user.username);
    res.json({ success: true, transactions: list });
  });

  // 1. Claim Daily Treasure Box Reward
  app.post("/api/user/claim-daily", authenticate, async (req, res) => {
    const now = new Date();
    const lastClaim = req.user.lastDailyClaim ? new Date(req.user.lastDailyClaim) : null;

    if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
      const nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
      return res.status(400).json({
        success: false,
        message: `Already claimed today. Next claim at ${nextClaimTime.toISOString()}`
      });
    }

    const rewardCredits = secureRandomInt(131) + 20;
    req.user.balance += rewardCredits;
    req.user.exp = (req.user.exp || 0) + 100;
    req.user.lastDailyClaim = now.toISOString();

    await saveDb();

    res.json({
      success: true,
      rewardCredits,
      addedExp: 100,
      newBalance: req.user.balance,
      exp: req.user.exp
    });
  });

  // â”€â”€ /api/user/balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.get("/api/user/balance", authenticate, (req, res) => {
    res.json({ success: true, balance: req.user.balance });
  });
}
