// Runner sandbox — Docker éphémère jailé, fallback spawn restreint, 0 dépendance npm.
// API Docker Engine via socket Unix HTTP natif (node:http).
import http from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
const RUN_TIMEOUT_MS = Number(process.env.SANDBOX_TIMEOUT_MS || 5000);
const MAX_CONCURRENT = Number(process.env.SANDBOX_MAX_CONCURRENT || 3);
const MAX_CODE_BYTES = Number(process.env.SANDBOX_MAX_CODE_BYTES || 64 * 1024);
const MAX_OUTPUT_BYTES = Number(process.env.SANDBOX_MAX_OUTPUT_BYTES || 256 * 1024);

let dockerAvailable = null;

function dockerRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      { socketPath: SOCKET, method, path,
        headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, data: Buffer.concat(chunks) }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function pingDocker() {
  try {
    const r = await dockerRequest("GET", "/_ping");
    return r.status === 200;
  } catch {
    return false;
  }
}

export async function getSandboxMode() {
  if (dockerAvailable === null) dockerAvailable = await pingDocker();
  if (dockerAvailable) return "docker";
  if (process.env.NODE_ENV === "production") return "disabled";
  return "spawn";
}

function demuxDockerStream(buf) {
  let stdout = "", stderr = "";
  let off = 0;
  while (off + 8 <= buf.length) {
    const type = buf[off];
    const size = buf.readUInt32BE(off + 4);
    if (off + 8 + size > buf.length) break;
    const chunk = buf.slice(off + 8, off + 8 + size);
    const txt = chunk.toString("utf8");
    if (type === 1) stdout += txt;
    else if (type === 2) stderr += txt;
    off += 8 + size;
  }
  return { stdout, stderr };
}

function truncate(str, n) {
  if (!str || str.length <= n) return str;
  return str.slice(0, n) + "\n… [output tronqué]";
}

const sem = { running: 0, queue: [] };
function acquireSlot() {
  return new Promise((resolve) => {
    if (sem.running < MAX_CONCURRENT) {
      sem.running++;
      resolve(() => { sem.running--; flushQueue(); });
    } else {
      sem.queue.push(resolve);
    }
  });
}
function flushQueue() {
  while (sem.queue.length && sem.running < MAX_CONCURRENT) {
    sem.running++;
    const next = sem.queue.shift();
    next(() => { sem.running--; flushQueue(); });
  }
}

const rate = new Map();
function checkRate(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const rec = rate.get(ip) || [];
  const fresh = rec.filter((t) => t > windowStart);
  if (fresh.length >= 30) throw new Error("Rate limit atelier — trop de runs (30/min)");
  fresh.push(now);
  rate.set(ip, fresh);
}

function sanitizeCode(code, lang) {
  const raw = Buffer.byteLength(code || "");
  if (raw > MAX_CODE_BYTES) throw new Error(`Code trop volumineux (> ${MAX_CODE_BYTES / 1024} Ko)`);
  if (lang !== "js" && lang !== "python") throw new Error("Langage non supporté (js|python)");
}

async function runDocker(code, lang) {
  const image = lang === "js" ? "caverne-sandbox-node:latest" : "caverne-sandbox-python:latest";
  const b64 = Buffer.from(code, "utf8").toString("base64");
  const { data } = await dockerRequest("POST", "/containers/create", {
    Image: image,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: false,
    Env: [`CODE_B64=${b64}`],
    NetworkDisabled: true,
    HostConfig: {
      NetworkMode: "none",
      Memory: 128 * 1024 * 1024,
      MemorySwap: 128 * 1024 * 1024,
      NanoCpus: 500_000_000,
      PidsLimit: 64,
      ReadonlyRootfs: true,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=16m" },
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      AutoRemove: false,
    },
    User: "1000:1000",
  });
  const meta = JSON.parse(data.toString("utf8"));
  const id = meta.Id;
  if (!id) throw new Error("Docker create a échoué : " + data.toString("utf8"));

  try {
    await dockerRequest("POST", `/containers/${id}/start`);

    const waited = await Promise.race([
      dockerRequest("POST", `/containers/${id}/wait`),
      new Promise((r) => setTimeout(() => r("timeout"), RUN_TIMEOUT_MS)),
    ]);
    const timedOut = waited === "timeout";
    if (timedOut) {
      try { await dockerRequest("POST", `/containers/${id}/kill`); } catch {}
    }

    const logs = await dockerRequest("GET", `/containers/${id}/logs?stdout=1&stderr=1`);
    const { stdout, stderr } = demuxDockerStream(logs.data);
    return {
      stdout: truncate(stdout, MAX_OUTPUT_BYTES),
      stderr: truncate(stderr, MAX_OUTPUT_BYTES),
      timedOut,
      exitCode: timedOut ? -1 : (waited.status === 200 ? JSON.parse(waited.data.toString("utf8")).StatusCode : null),
      mode: "docker",
    };
  } finally {
    try { await dockerRequest("DELETE", `/containers/${id}?force=1`); } catch {}
  }
}

const NODE_MAJOR = Number(process.version.slice(1).split(".")[0]);

function buildNetNeutralizer() {
  return `
const Module = require('module');
const blocked = new Set(['net','http','https','http2','dgram','dns','child_process','cluster','worker_threads','vm','module']);
const orig = Module.prototype.require;
Module.prototype.require = function(id) {
  if (blocked.has(id)) throw new Error('interdit en sandbox: ' + id);
  return orig.apply(this, arguments);
};
if (typeof fetch !== 'undefined') {
  globalThis.fetch = () => Promise.reject(new Error('interdit en sandbox'));
}
`;
}

async function runSpawn(code, lang) {
  if (lang === "python") throw new Error("Python sandbox nécessite Docker");
  const tmpDir = mkdtempSync(path.join(tmpdir(), "caverne-sandbox-"));
  const neutralizer = path.join(tmpDir, "_net.js");
  const source = path.join(tmpDir, "_code.js");
  writeFileSync(neutralizer, buildNetNeutralizer(), "utf8");
  writeFileSync(source, code, "utf8");

  const flags = ["--max-old-space-size=128", "--disallow-code-generation-from-strings"];
  if (NODE_MAJOR >= 20) {
    flags.push("--permission", "--allow-fs-read=*", "--allow-child-process");
  }
  flags.push("--require", neutralizer, source);

  return new Promise((resolve) => {
    const out = [], err = [];
    const child = spawn(
      process.execPath,
      flags,
      { cwd: tmpDir, env: {}, timeout: RUN_TIMEOUT_MS, killSignal: "SIGKILL" }
    );
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("error", (e) => {
      rmSync(tmpDir, { recursive: true, force: true });
      resolve({ stdout: "", stderr: e.message, timedOut: false, exitCode: -1, mode: "spawn" });
    });
    child.on("close", (code, signal) => {
      rmSync(tmpDir, { recursive: true, force: true });
      const stdout = truncate(Buffer.concat(out).toString("utf8"), MAX_OUTPUT_BYTES);
      const stderr = truncate(Buffer.concat(err).toString("utf8"), MAX_OUTPUT_BYTES);
      resolve({ stdout, stderr, timedOut: signal === "SIGTERM" || signal === "SIGKILL", exitCode: code, mode: "spawn" });
    });
  });
}

export async function runInSandbox({ code, lang, ip }) {
  sanitizeCode(code, lang);
  checkRate(ip || "default");
  const release = await acquireSlot();
  try {
    const mode = await getSandboxMode();
    if (mode === "disabled") throw new Error("Exécution sandbox désactivée (Docker non disponible en production)");
    if (mode === "docker") return await runDocker(code, lang);
    return await runSpawn(code, lang);
  } finally {
    release();
  }
}
