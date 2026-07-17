// ============================================================
// L67 — Génération d'images via Wanx / DashScope
// ============================================================

import { dsTaskFetch } from "../moe.mjs";

export async function generateImage(prompt, { size = "1024*1024", n = 1 } = {}) {
  const r = await dsTaskFetch("/services/aigc/text2image/image-synthesis", {
    method: "POST",
    body: {
      model: "wanx2.1-t2i-turbo",
      input: { prompt: String(prompt).slice(0, 800) },
      parameters: { size, n },
    },
  });
  return {
    taskId: r.output?.task_id,
    status: r.output?.task_status,
    results: r.output?.results || [],
  };
}
