// ============================================================
// L68 — Génération de vidéos via Wanx / DashScope
// ============================================================

import { dsTaskFetch } from "../moe.mjs";

export async function generateVideo(prompt, { size = "1280*720" } = {}) {
  const r = await dsTaskFetch("/services/aigc/video-generation/video-synthesis", {
    method: "POST",
    body: {
      model: "wanx2.1-i2v-plus",
      input: { prompt: String(prompt).slice(0, 800) },
      parameters: { size },
    },
  });
  return {
    taskId: r.output?.task_id,
    status: r.output?.task_status,
  };
}
