import { createDbProxy } from "../db-proxy.mjs";

export function publicLotteryView(lottery) {
  if (!lottery) return null;
  return {
    id: lottery.id,
    name: lottery.name,
    type: lottery.type,
    region: lottery.region,
    countdown: lottery.countdown,
    interval: lottery.interval,
    nextDrawId: lottery.nextDrawId,
    drawTimeOfDay: lottery.drawTimeOfDay,
    lastResults: lottery.lastResults,
    settings: { autoDraw: !!lottery.settings?.autoDraw }
  };
}

export function registerLotteryRoutes(app, { getDb, payoutRates, vnPayoutRates, platformMode }) {
  const db = createDbProxy(getDb);

  app.get("/api/rates", (_req, res) => {
    res.json({
      success: true,
      thai: db.systemSettings?.rates || payoutRates,
      vn: { ...vnPayoutRates, ...(db.systemSettings?.vnRates || {}) },
      limits: db.systemSettings?.limits || { minBet: 10, maxBet: 50000 },
      currency: "CR",
      platform: { mode: platformMode, cashFeaturesEnabled: false }
    });
  });

  app.get("/api/lottery/:id", (req, res) => {
    const lottery = db.lotteries[req.params.id];
    if (!lottery) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, lottery: publicLotteryView(lottery) });
  });

  app.get("/api/lotteries", (_req, res) => {
    res.json({ success: true, lotteries: Object.values(db.lotteries).map(publicLotteryView) });
  });
}
