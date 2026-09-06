import { secureRandomInt } from "./secure-random.mjs";

function padLast(value, len) {
  const d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.padStart(len, "0").slice(-len);
}

function generatePermutations(str) {
  if (str.length <= 1) return [str];
  const perms = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const remaining = str.slice(0, i) + str.slice(i + 1);
    for (const subPerm of generatePermutations(remaining)) {
      perms.push(char + subPerm);
    }
  }
  return [...new Set(perms)];
}

export function generateRandomNumbers() {
  const top3 = String(secureRandomInt(1000)).padStart(3, "0");
  const bottom2 = String(secureRandomInt(100)).padStart(2, "0");
  return { top3, bottom2 };
}

/**
 * Draw settle engine (Thai + VN + Laos poll). Live state stays in-memory `db`.
 */
export function createLotteryEngine({
  getDb,
  drawingLocks,
  saveDb,
  calculateSecondsUntil,
  didDrawToday,
  generateVNPrizes,
  generateNextDrawId,
  fetchXSMBResults,
  fetchLaosResults
}) {
  async function resolveDraw(lotteryId, winningNumbers) {
    const db = getDb();
    const lottery = db.lotteries[lotteryId];
    if (!lottery) return;

    const drawId = lottery.nextDrawId;
    const top3 = winningNumbers.top3;
    const bottom2 = winningNumbers.bottom2;
    const top2 = top3.slice(-2);
    const toad3 = generatePermutations(top3);
    const runTop = top3.split("");
    const runBottom = bottom2.split("");

    console.log(`RESOLVING DRAW [${lotteryId} - ${drawId}] Top3: ${top3}, Bottom2: ${bottom2}`);

    const currentBets = db.bets.filter(
      (b) => b.lotteryType === lotteryId && b.drawId === drawId && b.status === "pending"
    );

    for (const bet of currentBets) {
      let isWin = false;
      const num = String(bet.numbers ?? "");
      switch (bet.betType) {
        case "3top":
          isWin = padLast(num, 3) === top3;
          break;
        case "3toad":
          isWin = toad3.includes(padLast(num, 3));
          break;
        case "2top":
          isWin = padLast(num, 2) === top2;
          break;
        case "2bottom":
          isWin = padLast(num, 2) === bottom2;
          break;
        case "run_top":
          isWin = runTop.includes(padLast(num, 1));
          break;
        case "run_bottom":
          isWin = runBottom.includes(padLast(num, 1));
          break;
      }

      if (isWin) {
        bet.status = "won";
        bet.payout = bet.amount * bet.rate;
        const user = db.users.find((u) => u.username === bet.username);
        if (user) user.balance += bet.payout;
      } else {
        bet.status = "lost";
        bet.payout = 0;
      }
    }

    lottery.lastResults.unshift({
      drawId,
      numbers: { top3, bottom2, firstPrize: winningNumbers.firstPrize || null },
      drawnAt: new Date().toISOString()
    });
    if (lottery.lastResults.length > 30) lottery.lastResults.pop();

    if (lottery.type === "yeekee") {
      lottery.drawCounter += 1;
      if (lottery.drawCounter > 250) lottery.drawCounter = 1;
      lottery.countdown = lottery.interval;
    } else {
      lottery.countdown = calculateSecondsUntil(lottery.drawTimeOfDay);
    }

    generateNextDrawId(lotteryId);
    await saveDb();
  }

  async function resolveVNDraw(lotteryId, prizes) {
    const db = getDb();
    const lottery = db.lotteries[lotteryId];
    if (!lottery) return;

    const drawId = lottery.nextDrawId;
    console.log(`RESOLVING VN DRAW [${lotteryId} - ${drawId}]  DB: ${prizes.db}`);

    const allPrizeNumbers = [
      prizes.db,
      prizes.nhat,
      ...prizes.nhi,
      ...prizes.ba,
      ...prizes.tu,
      ...prizes.nam,
      ...prizes.sau,
      ...prizes.bay
    ];
    const lo2Set = new Set(allPrizeNumbers.map((n) => n.slice(-2)));
    const de2 = prizes.db.slice(-2);
    const cang3 = prizes.db.slice(-3);
    const dau = prizes.bay[0].charAt(0);
    const duoi = prizes.bay[0].charAt(1);

    const currentBets = db.bets.filter(
      (b) => b.lotteryType === lotteryId && b.drawId === drawId && b.status === "pending"
    );
    for (const bet of currentBets) {
      let isWin = false;
      const num = String(bet.numbers ?? "");
      switch (bet.betType) {
        case "lo":
          isWin = lo2Set.has(padLast(num, 2));
          break;
        case "de":
          isWin = padLast(num, 2) === de2;
          break;
        case "3cang":
          isWin = padLast(num, 3) === cang3;
          break;
        case "dau":
          isWin = padLast(num, 1) === dau;
          break;
        case "duoi":
          isWin = padLast(num, 1) === duoi;
          break;
        case "xien2":
        case "xien3":
        case "xien4":
          isWin = num.split(/[,;]/).filter(Boolean).every((p) => lo2Set.has(padLast(p.trim(), 2)));
          break;
      }
      if (isWin) {
        bet.status = "won";
        bet.payout = bet.amount * bet.rate;
        const user = db.users.find((u) => u.username === bet.username);
        if (user) user.balance += bet.payout;
      } else {
        bet.status = "lost";
        bet.payout = 0;
      }
    }

    lottery.lastResults.unshift({
      drawId,
      prizes,
      drawnAt: new Date().toISOString()
    });
    if (lottery.lastResults.length > 15) lottery.lastResults.pop();

    if (lottery.interval) {
      lottery.drawCounter = (lottery.drawCounter || 1) + 1;
      if (lottery.drawCounter > 999) lottery.drawCounter = 1;
      lottery.countdown = lottery.interval;
    } else {
      lottery.countdown = calculateSecondsUntil(lottery.drawTimeOfDay);
    }

    generateNextDrawId(lotteryId);
    await saveDb();
  }

  async function settleLotteryRoom(key) {
    if (drawingLocks.has(key)) return;
    drawingLocks.add(key);
    try {
      const db = getDb();
      const lottery = db.lotteries[key];
      if (!lottery || !lottery.settings?.autoDraw) {
        if (lottery) lottery.countdown = -1;
        return;
      }
      if (lottery.countdown > 0) return;

      if (lottery.type === "vietlottery") {
        if (key === "vnmb" && didDrawToday(lottery)) {
          console.log("XSMB already drawn today — skip duplicate");
          lottery.countdown = calculateSecondsUntil(lottery.drawTimeOfDay);
          return;
        }
        let prizes = null;
        if (key === "vnmb") {
          prizes = await fetchXSMBResults();
          if (prizes && lottery.lastResults?.[0]?.prizes?.db === prizes.db) {
            console.log(`XSMB API may still be yesterday (DB ${prizes.db}), retry in 60s`);
            prizes = null;
          }
        }
        if (!prizes) {
          lottery._vnmbPollCount = (lottery._vnmbPollCount || 0) + 1;
          if (key === "vnmb" && lottery._vnmbPollCount < 30) {
            lottery.countdown = 60;
          } else {
            lottery._vnmbPollCount = 0;
            prizes = generateVNPrizes();
            if (key === "vnmb") console.log("XSMB draw using random numbers (API unavailable)");
            await resolveVNDraw(key, prizes);
          }
        } else {
          lottery._vnmbPollCount = 0;
          await resolveVNDraw(key, prizes);
        }
        return;
      }

      if (key === "laos") {
        const realLaos = await fetchLaosResults(1);
        if (realLaos) {
          lottery._laosPollCount = 0;
          await resolveDraw(key, {
            top3: realLaos.top3,
            bottom2: realLaos.bottom2,
            firstPrize: realLaos.firstPrize
          });
        } else {
          lottery._laosPollCount = (lottery._laosPollCount || 0) + 1;
          if (lottery._laosPollCount >= 55) {
            lottery._laosPollCount = 0;
            console.log("Laos draw using random numbers (laodl unavailable)");
            await resolveDraw(key, generateRandomNumbers());
          } else {
            console.log(`Laos: waiting for laodl (${lottery._laosPollCount}/55)`);
            lottery.countdown = 60;
          }
        }
        return;
      }

      await resolveDraw(key, generateRandomNumbers());
    } finally {
      drawingLocks.delete(key);
    }
  }

  return { resolveDraw, resolveVNDraw, settleLotteryRoom, generateRandomNumbers };
}
