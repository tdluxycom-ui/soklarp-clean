import { createDbProxy } from "../db-proxy.mjs";

export function registerAdminRoutes(app, {
  authenticate,
  adminOnly,
  getDb,
  saveDb,
  resolveDraw,
  resolveVNDraw,
  generateVNPrizes,
  hashPassword,
  calculateSecondsUntil,
  drawingLocks
}) {
  const db = createDbProxy(getDb);

  // Admin API routes
  app.get("/api/admin/dashboard", authenticate, adminOnly, (req, res) => {
    const totalBets = db.bets.reduce((sum, b) => sum + b.amount, 0);
    const totalPayout = db.bets.reduce((sum, b) => sum + (b.payout || 0), 0);
    const netProfit = totalBets - totalPayout;
    const activeUsers = db.users.length;
    const bannedUsers = db.users.filter((u) => u.status === "banned").length;
    const pendingBets = db.bets.filter((b) => b.status === "pending").length;

    res.json({
      success: true,
      stats: { totalBets, totalPayout, netProfit, activeUsers, bannedUsers, pendingBets }
    });
  });

  app.get("/api/admin/users", authenticate, adminOnly, (req, res) => {
    const usersList = db.users.map(u => ({
      username: u.username,
      nickname: u.nickname,
      balance: u.balance,
      role: u.role,
      status: u.status || "active",
      exp: u.exp || 0
    }));
    res.json({ success: true, users: usersList });
  });

  app.post("/api/admin/users/credit", authenticate, adminOnly, async (req, res) => {
    const { username, action, amount } = req.body;
    if (!username || !action || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Dữ liệu tín dụng không hợp lệ" });
    }

    const targetUser = db.users.find(u => u.username === username);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const amt = Number(amount);
    if (action === "add") {
      targetUser.balance += amt;
    } else if (action === "deduct") {
      if (targetUser.balance < amt) {
        return res.status(400).json({ success: false, message: "Người dùng không đủ CR" });
      }
      targetUser.balance -= amt;
    } else {
      return res.status(400).json({ success: false, message: "Thao tác không hợp lệ" });
    }

    await saveDb();
    res.json({
      success: true,
      message: `Đã cập nhật tín dụng cho ${username}`,
      newBalance: targetUser.balance
    });
  });

  app.get("/api/admin/bets", authenticate, adminOnly, (req, res) => {
    const allBets = [...db.bets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, bets: allBets });
  });

  app.post("/api/admin/draw", authenticate, adminOnly, async (req, res) => {
    const { lotteryType, drawId, numbers } = req.body;
    if (!lotteryType || !drawId || !numbers || !numbers.top3 || !numbers.bottom2) {
      return res.status(400).json({ success: false, message: "Cần số 3 trên và 2 dưới" });
    }

    const lottery = db.lotteries[lotteryType];
    if (!lottery) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng xổ số" });
    }

    if (lottery.nextDrawId !== drawId) {
      return res.status(400).json({ success: false, message: "Mã kỳ không khớp kỳ đang mở" });
    }

    const top3 = String(numbers.top3).trim();
    const bottom2 = String(numbers.bottom2).trim();

    if (top3.length !== 3 || isNaN(top3) || bottom2.length !== 2 || isNaN(bottom2)) {
      return res.status(400).json({ success: false, message: "3 trên phải 3 chữ số và 2 dưới phải 2 chữ số" });
    }

    await resolveDraw(lotteryType, { top3, bottom2 });

    res.json({ success: true, message: `Đã chốt kỳ ${lottery.name} ${drawId}` });
  });

  app.post("/api/admin/settings", authenticate, adminOnly, async (req, res) => {
    const { lotteryType, autoDraw, drawTimeOfDay, blockedNumbers, halfPayNumbers } = req.body;
    const lottery = db.lotteries[lotteryType];
    if (!lottery) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng xổ số" });
    }

    if (autoDraw !== undefined) {
      lottery.settings.autoDraw = Boolean(autoDraw);
    }
    
    if (drawTimeOfDay && lottery.type === "scheduled") {
      if (/^\d{2}:\d{2}$/.test(drawTimeOfDay)) {
        lottery.drawTimeOfDay = drawTimeOfDay;
        lottery.countdown = calculateSecondsUntil(drawTimeOfDay);
      }
    }

    if (blockedNumbers !== undefined && Array.isArray(blockedNumbers)) {
      lottery.settings.blockedNumbers = blockedNumbers.map(n => String(n).trim());
    }

    if (halfPayNumbers !== undefined && Array.isArray(halfPayNumbers)) {
      lottery.settings.halfPayNumbers = halfPayNumbers.map(n => String(n).trim());
    }

    await saveDb();
    res.json({ success: true, message: "Đã cập nhật phòng" });
  });

  // Admin view all transactions
  app.get("/api/admin/transactions", authenticate, adminOnly, (req, res) => {
    res.json({ success: true, transactions: db.transactions });
  });

  // Admin resolve transaction (Approve / Reject)
  app.post("/api/admin/transactions/resolve", authenticate, adminOnly, async (req, res) => {
    const { transactionId, action } = req.body;
    if (!transactionId || (action !== "approve" && action !== "reject")) {
      return res.status(400).json({ success: false, message: "Thao tác giao dịch không hợp lệ" });
    }

    const tx = db.transactions.find(t => t.id === transactionId);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
    }

    if (tx.status !== "pending") {
      return res.status(400).json({ success: false, message: "Giao dịch này đã được xử lý" });
    }

    const user = db.users.find(u => u.username === tx.username);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chủ giao dịch" });
    }

    if (action === "approve") {
      tx.status = "success";
      if (tx.type === "deposit") {
        user.balance += tx.amount;
      }
      // Withdrawal balance was already deducted upon submission!
    } else {
      tx.status = "rejected";
      if (tx.type === "withdraw") {
        // Refund balance if rejected
        user.balance += tx.amount;
      }
    }

    await saveDb();
    res.json({
      success: true,
      message: `${action === "approve" ? "Đã duyệt" : "Đã từ chối"} ${tx.type} ${tx.amount} CR`
    });
  });

  // Admin get system settings (rates and limits)
  app.get("/api/admin/system-settings", authenticate, adminOnly, (req, res) => {
    res.json({ success: true, settings: db.systemSettings });
  });

  // Admin update system settings
  app.post("/api/admin/system-settings", authenticate, adminOnly, async (req, res) => {
    const { rates, limits } = req.body;
    
    if (rates) {
      // Validate rates
      for (const key in rates) {
        if (isNaN(rates[key]) || rates[key] < 0) {
          return res.status(400).json({ success: false, message: `Tỷ lệ ${key} không hợp lệ` });
        }
        db.systemSettings.rates[key] = Number(rates[key]);
      }
    }

    if (req.body.vnRates) {
      db.systemSettings.vnRates = db.systemSettings.vnRates || {};
      for (const key in req.body.vnRates) {
        if (isNaN(req.body.vnRates[key]) || req.body.vnRates[key] < 0) {
          return res.status(400).json({ success: false, message: `Tỷ lệ VN ${key} không hợp lệ` });
        }
        db.systemSettings.vnRates[key] = Number(req.body.vnRates[key]);
      }
    }

    if (limits) {
      if (limits.minBet !== undefined && (!isNaN(limits.minBet) && limits.minBet >= 0)) {
        db.systemSettings.limits.minBet = Number(limits.minBet);
      }
      if (limits.maxBet !== undefined && (!isNaN(limits.maxBet) && limits.maxBet >= 0)) {
        db.systemSettings.limits.maxBet = Number(limits.maxBet);
      }
    }

    await saveDb();
    res.json({ success: true, message: "Đã cập nhật cài đặt hệ thống", settings: db.systemSettings });
  });

  // Admin toggle user ban status
  app.post("/api/admin/users/status", authenticate, adminOnly, async (req, res) => {
    const { username, status } = req.body;
    if (!username || (status !== "active" && status !== "banned")) {
      return res.status(400).json({ success: false, message: "Trạng thái thành viên không hợp lệ" });
    }

    if (username === req.user.username) {
      return res.status(400).json({ success: false, message: "Không thể đổi trạng thái tài khoản của chính mình" });
    }

    const targetUser = db.users.find(u => u.username === username);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    targetUser.status = status;
    await saveDb();
    
    // Clean active session if user is banned
    if (status === "banned") {
      for (const token in db.sessions) {
        if ((typeof db.sessions[token] === "string" ? db.sessions[token] : db.sessions[token]?.username) === username) {
          delete db.sessions[token];
        }
      }
    }

    res.json({ success: true, message: `Tài khoản [${username}] hiện ${status === "banned" ? "đã khóa" : "đang hoạt động"}` });
  });

  // Admin delete user
  app.delete("/api/admin/users", authenticate, adminOnly, async (req, res) => {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, message: "Cần tên tài khoản" });
    }

    if (username === req.user.username) {
      return res.status(400).json({ success: false, message: "Không thể xóa tài khoản của chính mình" });
    }

    const index = db.users.findIndex(u => u.username === username);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    // Remove user
    db.users.splice(index, 1);

    // Remove user's bets
    db.bets = db.bets.filter(b => b.username !== username);

    // Remove transactions
    db.transactions = db.transactions.filter(t => t.username !== username);

    // Clear session
    for (const token in db.sessions) {
      if ((typeof db.sessions[token] === "string" ? db.sessions[token] : db.sessions[token]?.username) === username) {
        delete db.sessions[token];
      }
    }

    await saveDb();
    res.json({ success: true, message: `Đã xóa tài khoản [${username}]` });
  });

  // â”€â”€ /api/admin/credit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post("/api/admin/credit", authenticate, adminOnly, async (req, res) => {
    const { username, action, amount, note } = req.body;
    const target = db.users.find(u => u.username === username);
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    const change = action === "add" ? Math.abs(amount) : -Math.abs(amount);
    target.balance = Math.max(0, (target.balance || 0) + change);
    db.transactions = db.transactions || [];
    db.transactions.push({ id: "tx_"+Date.now(), username, type: action, amount: Math.abs(amount), note: note||"Quản trị điều chỉnh", createdAt: new Date().toISOString(), status: "completed" });
    await saveDb();
    res.json({ success: true, message: `${action === "add" ? "Đã cộng" : "Đã trừ"} ${amount} CR`, newBalance: target.balance });
  });

  // â”€â”€ /api/admin/manual-draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post("/api/admin/manual-draw", authenticate, adminOnly, async (req, res) => {
    const { lotteryType, top3, bottom2 } = req.body;
    if (!lotteryType || !/^\d{3}$/.test(String(top3 || "")) || !/^\d{2}$/.test(String(bottom2 || ""))) {
      return res.status(400).json({ success: false, message: "Dữ liệu kỳ quay không hợp lệ" });
    }
    const lottery = db.lotteries?.[lotteryType];
    if (!lottery) return res.status(404).json({ success: false, message: "Không tìm thấy phòng xổ số" });
    if (lottery.type === "vietlottery") {
      return res.status(400).json({ success: false, message: "Phòng Việt Nam hãy dùng chức năng chốt kỳ VN" });
    }
    if (drawingLocks.has(lotteryType)) {
      return res.status(409).json({ success: false, message: "Kỳ này đang được chốt" });
    }
    drawingLocks.add(lotteryType);
    try {
      await resolveDraw(lotteryType, { top3: String(top3), bottom2: String(bottom2) });
      res.json({ success: true, message: "Đã chốt kỳ thủ công", drawId: lottery.nextDrawId, last: lottery.lastResults?.[0] });
    } catch (err) {
      console.error("manual-draw failed", err);
      res.status(500).json({ success: false, message: "Chốt kỳ thất bại" });
    } finally {
      drawingLocks.delete(lotteryType);
    }
  });

  app.post("/api/admin/vn-draw", authenticate, adminOnly, async (req, res) => {
    const { lotteryType, db: dbNumber } = req.body;
    const lottery = db.lotteries?.[lotteryType];
    if (!lottery || lottery.type !== "vietlottery") {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng Việt Nam" });
    }
    if (drawingLocks.has(lotteryType)) {
      return res.status(409).json({ success: false, message: "Kỳ này đang được chốt" });
    }
    const prizes = generateVNPrizes();
    if (dbNumber) {
      const digits = String(dbNumber).replace(/\D/g, "");
      if (digits.length < 2 || digits.length > 6) {
        return res.status(400).json({ success: false, message: "Số đặc biệt phải từ 2 đến 6 chữ số" });
      }
      prizes.db = digits.padStart(5, "0").slice(-5);
    }
    drawingLocks.add(lotteryType);
    try {
      await resolveVNDraw(lotteryType, prizes);
      res.json({ success: true, message: "Đã chốt kỳ Việt Nam", drawId: lottery.nextDrawId, last: lottery.lastResults?.[0] });
    } catch (err) {
      console.error("vn-draw failed", err);
      res.status(500).json({ success: false, message: "Chốt kỳ Việt Nam thất bại" });
    } finally {
      drawingLocks.delete(lotteryType);
    }
  });

  app.post("/api/admin/users", authenticate, adminOnly, async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    const nickname = String(req.body.nickname || username).trim();
    const role = req.body.role === "admin" ? "admin" : "user";
    const balance = Number(req.body.balance);
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return res.status(400).json({ success: false, message: "Tài khoản gồm 3–32 ký tự: a-z, 0-9, gạch dưới" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu tối thiểu 6 ký tự" });
    }
    if (db.users.some((u) => u.username === username)) {
      return res.status(400).json({ success: false, message: "Tài khoản đã tồn tại" });
    }
    db.users.push({
      username,
      password: hashPassword(password),
      nickname: nickname.slice(0, 40) || username,
      balance: Number.isFinite(balance) && balance >= 0 ? balance : 0,
      role,
      status: "active",
      exp: 0
    });
    await saveDb();
    res.json({ success: true, message: `Đã tạo tài khoản ${username}` });
  });

  app.post("/api/admin/users/password", authenticate, adminOnly, async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    if (!username || password.length < 6) {
      return res.status(400).json({ success: false, message: "Cần tài khoản và mật khẩu tối thiểu 6 ký tự" });
    }
    const target = db.users.find((u) => u.username === username);
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    target.password = hashPassword(password);
    for (const token in db.sessions) {
      const sess = db.sessions[token];
      if ((typeof sess === "string" ? sess : sess?.username) === username) {
        delete db.sessions[token];
      }
    }
    await saveDb();
    res.json({ success: true, message: `Đã đặt lại mật khẩu cho ${username}` });
  });

  app.post("/api/admin/bets/cancel", authenticate, adminOnly, async (req, res) => {
    const betId = req.body.betId;
    const bet = db.bets.find((b) => b.id === betId);
    if (!bet) return res.status(404).json({ success: false, message: "Không tìm thấy phiếu cược" });
    if (bet.status !== "pending") {
      return res.status(400).json({ success: false, message: "Chỉ hủy được phiếu đang chờ" });
    }
    bet.status = "cancelled";
    bet.payout = 0;
    const owner = db.users.find((u) => u.username === bet.username);
    if (owner) owner.balance = (owner.balance || 0) + Number(bet.amount || 0);
    db.transactions = db.transactions || [];
    db.transactions.push({
      id: "tx_" + Date.now(),
      username: bet.username,
      type: "add",
      amount: Number(bet.amount || 0),
      note: "Hoàn phiếu bị hủy",
      createdAt: new Date().toISOString(),
      status: "completed"
    });
    await saveDb();
    res.json({ success: true, message: "Đã hủy phiếu và hoàn CR" });
  });

  // â”€â”€ /api/admin/finance (list transactions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.get("/api/admin/finance", authenticate, adminOnly, (req, res) => {
    const txs = [...(db.transactions || [])].reverse().slice(0, 80);
    res.json({ success: true, transactions: txs });
  });

  // â”€â”€ /api/admin/finance/process â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post("/api/admin/finance/process", authenticate, adminOnly, async (req, res) => {
    return res.status(403).json({
      success: false,
      message: "Nạp/rút tiền mặt đã tắt. Hãy điều chỉnh tín dụng ảo CR."
    });
  });

  // Number stats must be registered before the SPA fallback below.
  app.get("/api/admin/number-stats", authenticate, adminOnly, (req, res) => {
    const { lottery, betType, status } = req.query;
    let bets = [...db.bets];
    if (lottery && lottery !== "all") bets = bets.filter(b => b.lotteryType === lottery);
    if (betType && betType !== "all") bets = bets.filter(b => b.betType === betType);
    if (status && status !== "all") bets = bets.filter(b => b.status === status);
    const numberMap = {};
    bets.forEach((bet) => {
      const num = bet.numbers;
      if (!numberMap[num]) numberMap[num] = { number: num, totalAmount: 0, count: 0, maxPayout: 0, betTypes: {} };
      numberMap[num].totalAmount += bet.amount;
      numberMap[num].count += 1;
      numberMap[num].maxPayout += bet.amount * (bet.rate || 1);
      numberMap[num].betTypes[bet.betType] = (numberMap[num].betTypes[bet.betType] || 0) + bet.amount;
    });
    const stats = Object.values(numberMap).sort((a, b) => b.totalAmount - a.totalAmount);
    res.json({ success: true, stats: stats.slice(0, 100), totalTickets: bets.length, totalAmount: bets.reduce((sum, bet) => sum + bet.amount, 0), maxRisk: bets.reduce((sum, bet) => sum + bet.amount * (bet.rate || 1), 0) });
  });

  app.get("/api/admin/room-settings", authenticate, adminOnly, (req, res) => {
    const lotteryType = req.query.lotteryType;
    const lottery = db.lotteries?.[lotteryType];
    if (!lottery) return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    res.json({
      success: true,
      settings: {
        autoDraw: !!lottery.settings?.autoDraw,
        blockedNumbers: lottery.settings?.blockedNumbers || [],
        halfPayNumbers: lottery.settings?.halfPayNumbers || [],
        drawTimeOfDay: lottery.drawTimeOfDay || ""
      }
    });
  });
}
