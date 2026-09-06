import { mkdir, rm, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");

async function copyDir(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log("âš¡ Building Luxury Thai Lottery Site...");
  
  // Clean dist
  try { 
    await rm(DIST, { recursive: true, force: true }); 
    console.log("ðŸ§¹ Cleaned dist/ directory");
  } catch (err) {
    console.log("âš ï¸ Failed to clean dist/ directory:", err.message);
  }
  
  await mkdir(DIST, { recursive: true });
  
  // Copy src to dist
  await copyDir(SRC, DIST);
  console.log("âœ… Copied all source files from src/ to dist/");
  console.log("ðŸš€ Build complete!");
}

main().catch(err => {
  console.error("âŒ Build error:", err.message);
  process.exit(1);
});
