// Copie Monaco editor assets (min/vs) dans public/ et dist/ pour self-hosting 0-CDN.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules", "monaco-editor", "min", "vs");
const targets = [path.join(root, "public", "monaco-editor", "vs"), path.join(root, "dist", "monaco-editor", "vs")];

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(src)) {
  console.error("[monaco] source introuvable:", src);
  process.exit(1);
}
copyDir(src, targets[0]);
console.log("[monaco] copied to public/monaco-editor/vs");
if (fs.existsSync(path.join(root, "dist"))) {
  copyDir(src, targets[1]);
  console.log("[monaco] copied to dist/monaco-editor/vs");
}
