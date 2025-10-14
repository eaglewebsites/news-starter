/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MARKET_HOSTS = [
  "sandhillspost.com",
  "salinapost.com",
  "greatbendpost.com",
  "hutchpost.com",
  "hayspost.com",
  "jcpost.com",
  "stjosephpost.com",
  "littleapplepost.com",
];

const SRC_EXT = new Set([".js", ".jsx", ".ts", ".tsx"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", "build", ".git", "__tests__", "tests"]);

let violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
    } else {
      const ext = path.extname(entry.name);
      if (!SRC_EXT.has(ext)) continue;
      inspect(path.join(dir, entry.name));
    }
  }
}

function inspect(file) {
  const text = fs.readFileSync(file, "utf8");

  // 1) Hardcoded market domains (should be relative)
  for (const host of MARKET_HOSTS) {
    const rx = new RegExp(String.raw`https?:\/\/(?:www\.)?${host}\/`, "i");
    if (rx.test(text)) {
      violations.push({ file, msg: `Hardcoded market domain detected: ${host}. Use relative href.` });
    }
  }

  // 2) Raw next/link import (prefer SafeLink), allow SafeLink itself
  if (!file.endsWith(path.normalize("components/SafeLink.js"))) {
    if (/from\s+['"]next\/link['"]/.test(text)) {
      violations.push({ file, msg: `Importing next/link directly — prefer "@/components/SafeLink".` });
    }
  }
}

walk(ROOT);

if (violations.length) {
  console.error("❌ verify:links failed with the following issues:\n");
  for (const v of violations) {
    console.error(`- ${v.file}\n  → ${v.msg}\n`);
  }
  process.exit(1);
} else {
  console.log("✅ verify:links passed (no hardcoded market domains; no raw next/link).");
}
