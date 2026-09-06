export const ROOM_CATALOG = {
  yeekee3: { name: "Yeekee 3 min" },
  yeekee30: { name: "Yeekee 30 min" },
  hanoi: { name: "Hanoi Daily" },
  laos: { name: "Lao Development" },
  vnfast: { name: "VN Fast 5 min" },
  vnmb: { name: "XSMB — North" },
  vnmn: { name: "XSMN — South (simulated)" },
  vnmt: { name: "XSMT — Central (simulated)" }
};

export function looksMojibake(value) {
  return /à[¸¹]|Ã.|á»|ðŸ/.test(String(value || ""));
}

export function applyCanonicalRoomNames(lotteries) {
  if (!lotteries) return;
  for (const [id, meta] of Object.entries(ROOM_CATALOG)) {
    if (lotteries[id]) lotteries[id].name = meta.name;
  }
}

export function repairUserNicknames(users) {
  if (!Array.isArray(users)) return;
  for (const user of users) {
    if (!user) continue;
    if (looksMojibake(user.nickname) || !user.nickname) {
      if (user.username === "admin") user.nickname = "Admin";
      else if (user.username === "thaiplayer") user.nickname = "Player";
      else user.nickname = user.username;
    }
  }
}
