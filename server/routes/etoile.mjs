// La Nuit Étoilée — génération d'images et de vidéos via DashScope (Wanx/z-image).
// Médias téléchargés et persistés localement dans server/media/ (les URLs OSS expirent).
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createImageJob, createVideoJob, pollMediaTask } from "../moe.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, "..", "media");
try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch {}

function newId(prefix) { return `${prefix}_${randomUUID()}`; }

/** Télécharge l'URL du média localement. Renvoie le chemin relatif (media/<fichier>). */
async function persistMedia(jobId, type, remoteUrl) {
  if (!remoteUrl) return null;
  const ext = type === "video" ? ".mp4" : ".png";
  const file = `${jobId}${ext}`;
  const dest = path.join(MEDIA_DIR, file);
  try {
    const r = await fetch(remoteUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return `media/${file}`;
  } catch (e) {
    console.warn("persistMedia échec:", e.message, "— URL distante conservée");
    return null;
  }
}

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  if (parts[0] !== "api" || parts[1] !== "etoile") return false;
  const { sendJson, sendError, readBody } = ctx.helpers;

  // GET /api/etoile/media/:id — sert le fichier local persisté
  if (req.method === "GET" && parts[2] === "media" && parts[3]) {
    const job = (ctx.store.etoileJobs || []).find((j) => j.id === parts[3]);
    const local = job?.localPath;
    if (!local) return sendError(res, 404, "média non disponible");
    const fp = path.join(MEDIA_DIR, path.basename(local));
    if (!fs.existsSync(fp)) return sendError(res, 404, "fichier absent");
    const mime = job.type === "video" ? "video/mp4" : "image/png";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=31536000" });
    fs.createReadStream(fp).pipe(res);
    return true;
  }

  // GET /api/etoile/jobs — liste les jobs du store
  if (req.method === "GET" && parts[2] === "jobs" && parts.length === 3) {
    const jobs = ctx.store.etoileJobs || [];
    sendJson(res, 200, jobs.slice().sort((a, b) => b.ts - a.ts));
    return true;
  }

  // POST /api/etoile/image { prompt }
  if (req.method === "POST" && parts[2] === "image") {
    const { prompt } = await readBody(req);
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) return sendError(res, 400, "prompt requis");
    try {
      const r = await createImageJob(prompt.trim());
      const job = { id: newId("eto"), prompt: prompt.trim(), promptEnrichi: r.promptEnrichi, type: "image", taskId: r.taskId, status: r.url ? "SUCCEEDED" : "PENDING", url: r.url, localPath: undefined, ts: Date.now() };
      ctx.store.etoileJobs ||= [];
      ctx.store.etoileJobs.push(job);
      if (r.url) job.localPath = await persistMedia(job.id, "image", r.url);
      ctx.save();
      sendJson(res, 201, job);
      if (r.taskId) pollMediaTask(r.taskId).then(async (rr) => {
        const j = ctx.store.etoileJobs.find((x) => x.id === job.id);
        if (!j) return;
        j.status = rr.status;
        if (rr.url) { j.url = rr.url; if (!j.localPath) j.localPath = await persistMedia(j.id, "image", rr.url); }
        if (rr.error) j.error = rr.error;
        ctx.save();
      });
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }

  // POST /api/etoile/video { prompt }
  if (req.method === "POST" && parts[2] === "video") {
    const { prompt } = await readBody(req);
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) return sendError(res, 400, "prompt requis");
    try {
      const { taskId, promptEnrichi } = await createVideoJob(prompt.trim());
      const job = { id: newId("eto"), prompt: prompt.trim(), promptEnrichi, type: "video", taskId, status: "PENDING", url: undefined, localPath: undefined, ts: Date.now() };
      ctx.store.etoileJobs ||= [];
      ctx.store.etoileJobs.push(job);
      ctx.save();
      sendJson(res, 201, job);
      pollMediaTask(taskId, 420_000, 4000).then(async (r) => {
        const j = ctx.store.etoileJobs.find((x) => x.id === job.id);
        if (!j) return;
        j.status = r.status;
        if (r.url) { j.url = r.url; j.localPath = await persistMedia(j.id, "video", r.url); }
        if (r.error) j.error = r.error;
        ctx.save();
      });
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }

  // GET /api/etoile/jobs/:id/refresh — force un refresh manuel
  if (req.method === "GET" && parts[2] === "jobs" && parts[4] === "refresh") {
    const job = (ctx.store.etoileJobs || []).find((j) => j.id === parts[3]);
    if (!job) return sendError(res, 404, "job introuvable");
    try {
      const r = await pollMediaTask(job.taskId, 120_000, 3000);
      job.status = r.status;
      if (r.url) { job.url = r.url; if (!job.localPath) job.localPath = await persistMedia(job.id, job.type, r.url); }
      if (r.error) job.error = r.error;
      ctx.save();
      sendJson(res, 200, job);
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }

  return false;
}