#!/usr/bin/env node
/* Quick start server without rebuild */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 59617;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log(`🚀 Starting server on port ${PORT}...`);
console.log(`📁 Serving: ${path.join(ROOT, "dist")}\n`);

const serve = spawn("node", ["server.js"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: PORT }
});

serve.on("error", (err) => {
  console.error("❌ Server error:", err);
  process.exit(1);
});

serve.on("close", (code) => {
  console.log(`\n📴 Server stopped (code ${code})`);
  process.exit(code);
});

process.on("SIGINT", () => {
  console.log("\n⏹️  Stopping server...");
  serve.kill();
});
