#!/usr/bin/env node
// PostToolUse hook: runs Prettier (and ESLint for JS/TS files) on the file
// that was just written or edited. Best-effort cleanup, never blocks the tool call.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ESLINT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);
const projectRoot = path.resolve(import.meta.dirname, "..", "..");

function readStdin() {
  const chunks = [];
  return new Promise((resolve) => {
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
    process.stdin.on("error", () => resolve(""));
  });
}

function runBin(bin, args, cwd) {
  try {
    execFileSync(path.join(projectRoot, "node_modules", ".bin", bin), args, {
      cwd,
      stdio: "pipe",
    });
  } catch (err) {
    process.stderr.write(
      `[format-on-write] ${bin} ${args.join(" ")} failed:\n`,
    );
    process.stderr.write(String(err.stdout || err.message) + "\n");
  }
}

const raw = await readStdin();
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = event?.tool_input?.file_path;
if (!filePath) process.exit(0);

const absPath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(projectRoot, filePath);

if (!absPath.startsWith(projectRoot + path.sep) || !existsSync(absPath)) {
  process.exit(0);
}

if (ESLINT_EXTENSIONS.has(path.extname(absPath))) {
  runBin("eslint", ["--fix", absPath], projectRoot);
}

runBin("prettier", ["--write", absPath], projectRoot);

process.exit(0);
