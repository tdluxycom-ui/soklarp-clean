// One-shot migration (2026-08-23): fix off-by-one drawId labels in scheduled rooms.
// Before the generateNextDrawId fix, daily draws were labelled with the previous
// day's date (id generated right after a draw, same evening). Relabel each
// PREFIX-YYYYMMDD entry with the Thai-local date of its own drawnAt, then dedupe
// per date (keep the newest entry). LAOS-YYYYMMDD-round imported entries are left
// untouched; a LA-YYYYMMDD entry whose date is covered by an imported real round
// is dropped entirely (it was a bogus duplicate of the real result).
import fs from "node:fs";

const path = process.argv[2] || "data/database.json";
const db = JSON.parse(fs.readFileSync(path, "utf8"));
const thaiDateOf = iso => new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");

// laos: drop LA-YYYYMMDD entries duplicated by an imported real LAOS-YYYYMMDD-* round
const laos = db.lotteries.laos;
const realDates = new Set(
  laos.lastResults.filter(r => /^LAOS-(\d{8})-/.test(r.drawId)).map(r => r.drawId.match(/^LAOS-(\d{8})-/)[1])
);
const laosBefore = laos.lastResults.length;
laos.lastResults = laos.lastResults.filter(r => {
  const m = r.drawId.match(/^LA-(\d{8})$/);
  return !(m && realDates.has(m[1]));
});
console.log(`laos: dropped ${laosBefore - laos.lastResults.length} bogus LA- entries`);

const rooms = [["hanoi", "HN"], ["laos", "LA"], ["vnmb", "XSMB"], ["vnmn", "XSMN"], ["vnmt", "XSMT"]];
for (const [id, prefix] of rooms) {
  const l = db.lotteries[id];
  let relabeled = 0;

  const fixed = [];
  const byDate = new Map();
  for (const r of l.lastResults) {
    const m = r.drawId.match(new RegExp(`^${prefix}-(\\d{8})$`));
    if (m) {
      const want = `${prefix}-${thaiDateOf(r.drawnAt)}`;
      if (r.drawId !== want) { r.drawId = want; relabeled++; }
      // dedupe resolved entries per date, keep the newest
      if (!byDate.has(want) || new Date(r.drawnAt) > new Date(byDate.get(want).drawnAt)) byDate.set(want, r);
    } else {
      fixed.push(r); // imported / non-matching entries pass through untouched
    }
  }

  const kept = [...fixed, ...byDate.values()].sort((a, b) => new Date(b.drawnAt) - new Date(a.drawnAt));
  const dropped = l.lastResults.length - kept.length;
  l.lastResults = kept;
  console.log(`${id.padEnd(6)} | relabeled: ${relabeled} | dupes dropped: ${dropped} | total: ${kept.length} | newest: ${kept[0]?.drawId} @ ${kept[0]?.drawnAt.slice(0, 10)}`);
}

fs.writeFileSync(path, JSON.stringify(db, null, 2));
console.log("✅ migration saved");
