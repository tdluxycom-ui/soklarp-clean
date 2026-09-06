/** Keep pending lottery tickets plus a bounded tail of settled history. */
const MAX_SETTLED = 4000;

export function pruneBets(bets) {
  if (!Array.isArray(bets) || bets.length <= MAX_SETTLED + 200) return bets;
  const pending = [];
  const settled = [];
  for (const bet of bets) {
    if (bet?.status === "pending") pending.push(bet);
    else settled.push(bet);
  }
  if (settled.length <= MAX_SETTLED) return bets;
  return pending.concat(settled.slice(-MAX_SETTLED));
}
