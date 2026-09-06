import { secureRandomInt, secureRandomFloat } from "../../lib/secure-random.mjs";
import { crashMultiplier, generateCrashPoint } from "../../lib/crash-math.mjs";
import {
  pickWeighted,
  COINFLIP_RATE,
  HILO_RATES,
  SLOT_RATES,
  DRAGON_TIGER_RATES,
  POKDENG_RATES,
  WHEEL_SEGMENTS,
  PLINKO_BUCKETS,
  HORSES,
  COIN_PUSHER_OUTCOMES,
  DUCK_OUTCOMES,
  MINES_TILES,
  clampMinesBombs,
  minesRate
} from "../../lib/game-odds.mjs";

/**
 * @param {import("express").Express} app
 * @param {{ authenticate: Function, getDb: () => any, saveDb: () => Promise<void> }} deps
 */
export function registerGameRoutes(app, { authenticate, getDb, saveDb }) {
  const db = new Proxy({}, {
    get(_t, prop) {
      return getDb()[prop];
    },
    set(_t, prop, value) {
      getDb()[prop] = value;
      return true;
    }
  });

  // Mini Game: Coin Flip (à¸«à¸±à¸§-à¸à¹‰à¸­à¸¢)
  app.post("/api/games/coinflip", authenticate, async (req, res) => {
    const { betOn, amount } = req.body;
    if (!betOn || (betOn !== "head" && betOn !== "tail") || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid coin-flip bet" });
    }
  
    const amt = Number(amount);
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
    }
  
    // Deduct user balance
    req.user.balance -= amt;
  
    // Spin the coin
    const result = secureRandomFloat() < 0.5 ? "head" : "tail";
    const isWin = (betOn === result);
    const rate = COINFLIP_RATE;
    const payout = isWin ? Math.floor(amt * rate) : 0;
  
    if (isWin) {
      req.user.balance += payout;
    }
  
    // Log into bets history
    db.bets.push({
      id: "game_cf_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_coinflip",
      drawId: "INSTANT",
      betType: betOn === "head" ? "head" : "tail",
      numbers: result === "head" ? "H" : "T",
      amount: amt,
      rate: rate,
      status: isWin ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      win: isWin,
      result,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Mini Game: Hi-Low (à¹„à¸®à¹‚à¸¥)
  app.post("/api/games/hilo", authenticate, async (req, res) => {
    const { betType, amount } = req.body;
    if (!betType || (betType !== "high" && betType !== "low" && betType !== "hilo11" && betType !== "triple") || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid Hi-Lo bet" });
    }
  
    const amt = Number(amount);
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
    }
  
    // Deduct user balance
    req.user.balance -= amt;
  
    // Roll 3 dice (CSPRNG)
    const d1 = secureRandomInt(6) + 1;
    const d2 = secureRandomInt(6) + 1;
    const d3 = secureRandomInt(6) + 1;
    const total = d1 + d2 + d3;
  
    const allSame = d1 === d2 && d2 === d3;
    let outcome = "";
    if (total === 11) {
      outcome = "hilo11";
    } else if (total >= 12) {
      outcome = "high";
    } else {
      outcome = "low";
    }

    const isWin = betType === "triple" ? allSame : (betType === outcome);
    const rate = HILO_RATES[betType];
    const payout = isWin ? Math.floor(amt * rate) : 0;
  
    if (isWin) {
      req.user.balance += payout;
    }
  
    // Log into bets history
    let betLabel = betType;
    if (betType === "high") betLabel = "high";
    if (betType === "low") betLabel = "low";
    if (betType === "hilo11") betLabel = "11";
    if (betType === "triple") betLabel = "triple";
  
    db.bets.push({
      id: "game_hl_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_hilo",
      drawId: "INSTANT",
      betType: betLabel,
      numbers: `${d1}+${d2}+${d3} = ${total}`,
      amount: amt,
      rate: rate,
      status: isWin ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      win: isWin,
      dice: [d1, d2, d3],
      total,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Mini Game: Lucky Wheel (à¸§à¸‡à¸¥à¹‰à¸­à¸¡à¸«à¸²à¸ªà¸™à¸¸à¸ VIP)
  app.post("/api/games/wheel", authenticate, async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Invalid stake" });
    }
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
    }
  
    req.user.balance -= amt;
  
    const chosen = pickWeighted(WHEEL_SEGMENTS, secureRandomFloat());
    const chosenIndex = WHEEL_SEGMENTS.indexOf(chosen);
    const payout = Math.floor(amt * chosen.rate);
    const isWin = (payout > amt);
  
    if (payout > 0) {
      req.user.balance += payout;
    }
  
    db.bets.push({
      id: "game_wh_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_wheel",
      drawId: "INSTANT",
      betType: "wheel",
      numbers: chosen.label,
      amount: amt,
      rate: chosen.rate,
      status: isWin ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      win: isWin,
      chosenIndex,
      chosen,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Mini Game: Dragon vs Tiger Cards (à¹€à¸ªà¸·à¸­à¸¡à¸±à¸‡à¸à¸£ VIP)
  app.post("/api/games/dragontiger", authenticate, async (req, res) => {
    const { betType, amount } = req.body;
    if (!betType || (betType !== "dragon" && betType !== "tiger" && betType !== "tie") || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid Dragon Tiger bet" });
    }
  
    const amt = Number(amount);
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
    }
  
    req.user.balance -= amt;
  
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];
  
    const dragonRankIdx = secureRandomInt(13);
    const tigerRankIdx = secureRandomInt(13);
    const dragonSuit = suits[secureRandomInt(4)];
    const tigerSuit = suits[secureRandomInt(4)];
  
    const dragonCard = { rank: ranks[dragonRankIdx], suit: dragonSuit, val: dragonRankIdx + 1 };
    const tigerCard = { rank: ranks[tigerRankIdx], suit: tigerSuit, val: tigerRankIdx + 1 };
  
    let result = "";
    if (dragonCard.val > tigerCard.val) result = "dragon";
    else if (dragonCard.val < tigerCard.val) result = "tiger";
    else result = "tie";
  
    const isWin = (betType === result);
    const rate = betType === "tie" ? DRAGON_TIGER_RATES.tie : DRAGON_TIGER_RATES.side;
    const payout = isWin ? Math.floor(amt * rate) : 0;
  
    if (isWin) {
      req.user.balance += payout;
    }
  
    let betLabel = betType === "dragon" ? "dragon" : (betType === "tiger" ? "tiger" : "tie");
  
    db.bets.push({
      id: "game_dt_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_dragontiger",
      drawId: "INSTANT",
      betType: betLabel,
      numbers: `ðŸ‰ ${dragonCard.rank}${dragonCard.suit} VS ðŸ… ${tigerCard.rank}${tigerCard.suit}`,
      amount: amt,
      rate: rate,
      status: isWin ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      win: isWin,
      result,
      dragonCard,
      tigerCard,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Mini Game: Slot 777 Machine (à¸ªà¸¥à¹‡à¸­à¸• 777 à¸¡à¸«à¸²à¹‚à¸Šà¸„ VIP)
  app.post("/api/games/slot", authenticate, async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Invalid stake" });
    }
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
    }
  
    req.user.balance -= amt;
  
    const symbols = ["7", "DIA", "STAR", "BELL", "CHERRY", "LEMON"];
    const pick = () => symbols[secureRandomInt(symbols.length)];
    const reel1 = pick();
    const reel2 = pick();
    const reel3 = pick();
  
    let rate = 0;
    if (reel1 === "7" && reel2 === "7" && reel3 === "7") rate = SLOT_RATES.triple7;
    else if (reel1 === "DIA" && reel2 === "DIA" && reel3 === "DIA") rate = SLOT_RATES.tripleDiamond;
    else if (reel1 === reel2 && reel2 === reel3) rate = SLOT_RATES.tripleOther;
    else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) rate = SLOT_RATES.pair;
  
    const payout = Math.floor(amt * rate);
    const isWin = payout > 0;
  
    if (isWin) {
      req.user.balance += payout;
    }
  
    db.bets.push({
      id: "game_sl_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_slot",
      drawId: "INSTANT",
      betType: "slot",
      numbers: `${reel1} | ${reel2} | ${reel3}`,
      amount: amt,
      rate: rate,
      status: isWin ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      win: isWin,
      reels: [reel1, reel2, reel3],
      rate,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Mini Game: Mines Bomb Sweeper (à¹€à¸à¸¡à¸ªà¹à¸à¸™à¸£à¸°à¹€à¸šà¸´à¸” VIP)
  app.post("/api/games/mines", authenticate, async (req, res) => {
    const { action, amount, bombsCount, tileIndex } = req.body;
    
    if (action === "start") {
      const amt = Number(amount);
      if (!amt || isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: "Invalid stake" });
      }
      if (req.user.balance < amt) {
        return res.status(400).json({ success: false, message: `Not enough CR (need ${amt})` });
      }
  
      req.user.balance -= amt;
  
      const bCount = clampMinesBombs(bombsCount);
      const grid = Array(MINES_TILES).fill("gem");
      let placed = 0;
      while (placed < bCount) {
        const idx = secureRandomInt(MINES_TILES);
        if (grid[idx] !== "bomb") {
          grid[idx] = "bomb";
          placed++;
        }
      }
  
      req.user.activeMinesGame = {
        amount: amt,
        bombsCount: bCount,
        grid: grid,
        revealed: []
      };
  
      await saveDb();
  
      return res.json({
        success: true,
        newBalance: req.user.balance
      });
    }
  
    if (action === "reveal") {
      const game = req.user.activeMinesGame;
      if (!game) {
        return res.status(400).json({ success: false, message: "No active mines game" });
      }
  
      const idx = parseInt(tileIndex);
      if (isNaN(idx) || idx < 0 || idx >= MINES_TILES) {
        return res.status(400).json({ success: false, message: "Invalid tile" });
      }
      // Re-opening an already opened tile used to grow the multiplier again,
      // which turned a 100 CR stake into any payout the caller wanted.
      if (game.revealed.includes(idx)) {
        return res.status(400).json({ success: false, message: "Tile already opened" });
      }
  
      const isBomb = (game.grid[idx] === "bomb");
  
      if (isBomb) {
        const lostAmt = game.amount;
        db.bets.push({
          id: "game_mn_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
          username: req.user.username,
          nickname: req.user.nickname,
          lotteryType: "game_mines",
          drawId: "INSTANT",
          betType: `mines (${game.bombsCount})`,
          numbers: "bomb",
          amount: lostAmt,
          rate: 0,
          status: "lost",
          payout: 0,
          createdAt: new Date().toISOString()
        });
  
        const fullGrid = game.grid;
        req.user.activeMinesGame = null;
        await saveDb();
  
        return res.json({
          success: true,
          isBomb: true,
          fullGrid,
          newBalance: req.user.balance
        });
      } else {
        game.revealed.push(idx);
        const safeCount = game.revealed.length;
        const rate = minesRate(safeCount, game.bombsCount);
        const currentPayout = Math.floor(game.amount * rate);
  
        return res.json({
          success: true,
          isBomb: false,
          rate,
          currentPayout,
          newBalance: req.user.balance
        });
      }
    }
  
    if (action === "cashout") {
      const game = req.user.activeMinesGame;
      if (!game || game.revealed.length === 0) {
        return res.status(400).json({ success: false, message: "Nothing to cash out" });
      }
  
      const safeCount = game.revealed.length;
      const rate = minesRate(safeCount, game.bombsCount);
      const payout = Math.floor(game.amount * rate);
  
      req.user.balance += payout;
  
      db.bets.push({
        id: "game_mn_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
        username: req.user.username,
        nickname: req.user.nickname,
        lotteryType: "game_mines",
        drawId: "INSTANT",
        betType: `mines (${game.bombsCount})`,
        numbers: `gems ${safeCount}`,
        amount: game.amount,
        rate: rate,
        status: "won",
        payout: payout,
        createdAt: new Date().toISOString()
      });
  
      const fullGrid = game.grid;
      req.user.activeMinesGame = null;
      await saveDb();
  
      return res.json({
        success: true,
        payout,
        fullGrid,
        newBalance: req.user.balance
      });
    }
  
    return res.status(400).json({ success: false, message: "Invalid action" });
  });
  
  // Plinko Peg Drop Game
  app.post("/api/games/plinko", authenticate, async (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ success: false, message: "Stake must be at least 10 CR" });
    }
  
    const amt = Number(amount);
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: "Not enough CR" });
    }
  
    req.user.balance -= amt;
  
    const chosen = pickWeighted(PLINKO_BUCKETS, secureRandomFloat());
    const payout = Math.floor(amt * chosen.mult);
    req.user.balance += payout;
  
    db.bets.push({
      id: "game_plk_" + Math.random().toString(36).substr(2) + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_plinko",
      drawId: "INSTANT",
      betType: "plinko",
      numbers: chosen.label,
      amount: amt,
      rate: chosen.mult,
      status: payout > 0 ? "won" : "lost",
      payout: payout,
      createdAt: new Date().toISOString()
    });
  
    await saveDb();
  
    res.json({
      success: true,
      chosen,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // Space Crash Rocket Game
  function publicCrashState(round) {
    const live = Number(crashMultiplier(Date.now() - round.startedAt).toFixed(2));
    return { liveMultiplier: live, startedAt: round.startedAt };
  }

  async function settleCrashBust(user, round) {
    db.bets.push({
      id: "game_cr_" + Date.now().toString(36) + secureRandomInt(1e6).toString(36),
      username: user.username,
      nickname: user.nickname,
      lotteryType: "game_crash",
      drawId: "INSTANT",
      betType: "Crash",
      numbers: `crash x${round.crashPoint.toFixed(2)} / bust`,
      amount: round.amount,
      rate: 0,
      status: "lost",
      payout: 0,
      createdAt: new Date().toISOString()
    });
    user.activeCrashGame = null;
    await saveDb();
    return {
      success: true,
      crashed: true,
      isWin: false,
      crashPoint: round.crashPoint,
      payout: 0,
      newBalance: user.balance
    };
  }

  app.get("/api/games/crash", authenticate, async (req, res) => {
    const round = req.user.activeCrashGame;
    if (!round?.startedAt) {
      return res.json({ success: true, flying: false });
    }
    const live = crashMultiplier(Date.now() - round.startedAt);
    if (live >= round.crashPoint) {
      const settled = await settleCrashBust(req.user, round);
      return res.json(settled);
    }
    res.json({ success: true, flying: true, ...publicCrashState(round) });
  });

  app.post("/api/games/crash", authenticate, async (req, res) => {
    const action = req.body?.action || (req.body?.cashoutAt ? "legacy" : "start");

    if (action === "start") {
      const amt = Number(req.body?.amount);
      if (!amt || Number.isNaN(amt) || amt < 10) {
        return res.status(400).json({ success: false, message: "Minimum bet is 10 CR" });
      }
      if (req.user.activeCrashGame?.startedAt) {
        const live = crashMultiplier(Date.now() - req.user.activeCrashGame.startedAt);
        if (live >= req.user.activeCrashGame.crashPoint) {
          await settleCrashBust(req.user, req.user.activeCrashGame);
        } else {
          return res.status(400).json({ success: false, message: "Crash round already in flight" });
        }
      }
      if (req.user.balance < amt) {
        return res.status(400).json({ success: false, message: "Insufficient credits" });
      }
      req.user.balance -= amt;
      req.user.activeCrashGame = {
        amount: amt,
        crashPoint: generateCrashPoint(secureRandomFloat()),
        startedAt: Date.now()
      };
      await saveDb();
      return res.json({
        success: true,
        flying: true,
        startedAt: req.user.activeCrashGame.startedAt,
        newBalance: req.user.balance
      });
    }

    if (action === "cashout") {
      const round = req.user.activeCrashGame;
      if (!round?.startedAt) {
        return res.status(400).json({ success: false, message: "No crash round in flight" });
      }
      const live = Number(crashMultiplier(Date.now() - round.startedAt).toFixed(2));
      if (live >= round.crashPoint) {
        const settled = await settleCrashBust(req.user, round);
        return res.json(settled);
      }
      const cashoutAt = Math.max(1, live);
      const payout = Math.floor(round.amount * cashoutAt);
      req.user.balance += payout;
      db.bets.push({
        id: "game_cr_" + Date.now().toString(36) + secureRandomInt(1e6).toString(36),
        username: req.user.username,
        nickname: req.user.nickname,
        lotteryType: "game_crash",
        drawId: "INSTANT",
        betType: "Crash",
        numbers: `crash x${round.crashPoint.toFixed(2)} / out x${cashoutAt.toFixed(2)}`,
        amount: round.amount,
        rate: cashoutAt,
        status: "won",
        payout,
        createdAt: new Date().toISOString()
      });
      req.user.activeCrashGame = null;
      await saveDb();
      return res.json({
        success: true,
        isWin: true,
        crashed: false,
        cashoutAt,
        crashPoint: round.crashPoint,
        payout,
        newBalance: req.user.balance
      });
    }

    // Legacy instant settle (tests / old clients sending cashoutAt)
    const { amount, cashoutAt } = req.body;
    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ success: false, message: "Minimum bet is 10 CR" });
    }
    const amt = Number(amount);
    if (req.user.balance < amt) {
      return res.status(400).json({ success: false, message: "Insufficient credits" });
    }
    let cashoutTarget = Number(cashoutAt);
    if (!Number.isFinite(cashoutTarget)) cashoutTarget = 1.5;
    cashoutTarget = Math.min(50, Math.max(1.1, Number(cashoutTarget.toFixed(2))));
    req.user.balance -= amt;
    const crashPoint = generateCrashPoint(secureRandomFloat());
    const isWin = crashPoint >= cashoutTarget;
    const finalMult = isWin ? cashoutTarget : 0;
    const payout = Math.floor(amt * finalMult);
    if (isWin) req.user.balance += payout;
    db.bets.push({
      id: "game_cr_" + Date.now().toString(36) + secureRandomInt(1e6).toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_crash",
      drawId: "INSTANT",
      betType: "Crash",
      numbers: `crash x${crashPoint.toFixed(2)} / out x${cashoutTarget.toFixed(2)}`,
      amount: amt,
      rate: finalMult,
      status: isWin ? "won" : "lost",
      payout,
      createdAt: new Date().toISOString()
    });
    await saveDb();
    res.json({
      success: true,
      crashPoint,
      cashoutTarget,
      isWin,
      payout,
      newBalance: req.user.balance
    });
  });
  
  // 7. Coin Pusher 3D Arcade
  app.post("/api/games/coinpusher", authenticate, async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 10) return res.status(400).json({ success: false, message: "Invalid stake (min 10 CR)" });
    if (req.user.balance < amt) return res.status(400).json({ success: false, message: "Not enough CR" });
    req.user.balance -= amt;
  
    const chosen = pickWeighted(COIN_PUSHER_OUTCOMES, secureRandomFloat());
    const payout = Math.floor(amt * chosen.mult);
    if (payout > 0) req.user.balance += payout;
    db.bets.push({
      id: "game_cp_" + Date.now().toString(36) + secureRandomInt(1e6).toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_coinpusher",
      drawId: "INSTANT",
      betType: "Coin Pusher",
      numbers: chosen.label,
      amount: amt,
      rate: chosen.mult,
      status: payout > amt ? "won" : "lost",
      payout,
      createdAt: new Date().toISOString()
    });
    await saveDb();
    res.json({ success: true, chosen, payout, newBalance: req.user.balance });
  });
  
  // 8. Pokdeng 3D Card
  app.post("/api/games/pokdeng", authenticate, async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 10) return res.status(400).json({ success: false, message: "Invalid stake (min 10 CR)" });
    if (req.user.balance < amt) return res.status(400).json({ success: false, message: "Not enough CR" });
    req.user.balance -= amt;
  
    const pCard1 = secureRandomInt(10) + 1;
    const pCard2 = secureRandomInt(10) + 1;
    const pScore = (pCard1 + pCard2) % 10;
  
    const dCard1 = secureRandomInt(10) + 1;
    const dCard2 = secureRandomInt(10) + 1;
    const dScore = (dCard1 + dCard2) % 10;
  
    let isWin = false;
    let mult = 0;
    if (pScore > dScore) {
      isWin = true;
      mult = pScore >= 8 ? POKDENG_RATES.winPok : POKDENG_RATES.win;
    }
  
    const payout = isWin ? Math.floor(amt * mult) : 0;
    if (isWin) req.user.balance += payout;
    db.bets.push({
      id: "game_pd_" + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_pokdeng",
      drawId: "INSTANT",
      betType: "Pok Deng",
      numbers: `P${pScore} vs D${dScore}`,
      amount: amt,
      rate: mult,
      status: isWin ? "won" : "lost",
      payout,
      createdAt: new Date().toISOString()
    });
    await saveDb();
    res.json({ success: true, pCard1, pCard2, pScore, dCard1, dCard2, dScore, isWin, mult, payout, newBalance: req.user.balance });
  });
  
  // 9. Horse Racing Derby 3D
  app.post("/api/games/horseracing", authenticate, async (req, res) => {
    const { amount, selectedHorse } = req.body;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 10) return res.status(400).json({ success: false, message: "Invalid stake (min 10 CR)" });
    if (req.user.balance < amt) return res.status(400).json({ success: false, message: "Not enough CR" });
    req.user.balance -= amt;
  
    const winner = pickWeighted(HORSES, secureRandomFloat());
    const isWin = (Number(selectedHorse) === winner.id);
    const payout = isWin ? Math.floor(amt * winner.mult) : 0;
    if (isWin) req.user.balance += payout;
    db.bets.push({
      id: "game_hr_" + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_horseracing",
      drawId: "INSTANT",
      betType: `Horse ${selectedHorse}`,
      numbers: winner.name,
      amount: amt,
      rate: isWin ? winner.mult : 0,
      status: isWin ? "won" : "lost",
      payout,
      createdAt: new Date().toISOString()
    });
    await saveDb();
    res.json({ success: true, winner, isWin, payout, newBalance: req.user.balance });
  });
  
  // 10. Lucky Duck Shooter 3D
  app.post("/api/games/duckshooter", authenticate, async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 10) return res.status(400).json({ success: false, message: "Invalid stake (min 10 CR)" });
    if (req.user.balance < amt) return res.status(400).json({ success: false, message: "Not enough CR" });
    req.user.balance -= amt;
  
    const chosen = pickWeighted(DUCK_OUTCOMES, secureRandomFloat());
    const payout = Math.floor(amt * chosen.mult);
    if (payout > 0) req.user.balance += payout;
    db.bets.push({
      id: "game_dk_" + Date.now().toString(36),
      username: req.user.username,
      nickname: req.user.nickname,
      lotteryType: "game_duckshooter",
      drawId: "INSTANT",
      betType: "Duck Shooter",
      numbers: chosen.label,
      amount: amt,
      rate: chosen.mult,
      status: payout > amt ? "won" : "lost",
      payout,
      createdAt: new Date().toISOString()
    });
    await saveDb();
    res.json({ success: true, chosen, payout, newBalance: req.user.balance });
  });
  
}
