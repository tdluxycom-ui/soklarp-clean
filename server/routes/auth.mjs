import crypto from "node:crypto";
import { createDbProxy } from "../db-proxy.mjs";
import { sanitizeNickname } from "../../lib/sanitize.mjs";

export function registerAuthRoutes(app, { authenticate, getDb, saveDb, flushDb, hashPassword, verifyPassword, sessionTtlMs }) {
  const db = createDbProxy(getDb);

  app.post("/api/auth/register", async (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
      return res.status(400).json({ success: false, message: "Please fill in all fields" });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername) || password.trim().length < 10 || nickname.trim().length > 40) {
      return res.status(400).json({ success: false, message: "Username must be 3-32 characters; password must be at least 10 characters." });
    }
    const cleanNickname = sanitizeNickname(nickname);
    if (!cleanNickname) {
      return res.status(400).json({ success: false, message: "Display name must contain at least one usable character" });
    }
    if (db.users.some((u) => u.username === cleanUsername)) {
      return res.status(400).json({ success: false, message: "Username already in use" });
    }
    db.users.push({
      username: cleanUsername,
      password: hashPassword(password.trim()),
      nickname: cleanNickname,
      balance: 50000,
      role: "user",
      status: "active"
    });
    await flushDb();
    res.json({ success: true, message: "Registration successful. Starting credits: 50,000 CR" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    const user = db.users.find((u) => u.username === cleanUsername && verifyPassword(password.trim(), u.password));
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid username or password" });
    }
    if (user.status === "banned") {
      return res.status(403).json({ success: false, message: "Account is banned" });
    }
    if (!user.password.startsWith("scrypt$")) {
      user.password = hashPassword(password.trim());
      await saveDb();
    }
    const token = crypto.randomBytes(48).toString("base64url");
    db.sessions[token] = { username: user.username, expiresAt: Date.now() + sessionTtlMs };
    await saveDb();
    res.json({
      success: true,
      message: "Login success",
      user: {
        username: user.username,
        nickname: user.nickname,
        balance: user.balance,
        role: user.role,
        exp: Number(user.exp || 0)
      },
      token
    });
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token && db.sessions[token]) delete db.sessions[token];
    await saveDb();
    res.json({ success: true, message: "Logged out" });
  });

  app.post("/api/auth/password", authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password required" });
    }
    if (!verifyPassword(String(currentPassword), req.user.password)) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
    if (String(newPassword).trim().length < 10) {
      return res.status(400).json({ success: false, message: "New password must be at least 10 characters" });
    }
    req.user.password = hashPassword(String(newPassword).trim());
    await flushDb();
    res.json({ success: true, message: "Password updated" });
  });
}
