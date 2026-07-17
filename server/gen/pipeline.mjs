// ============================================================
// L72 — Pipeline multimodal : image → vidéo → voix synchronisée
// ============================================================

import { generateImage } from "./image.mjs";
import { generateVideo } from "./video.mjs";
import { tts } from "./tts.mjs";

export async function multimodalPipeline({ imagePrompt, videoPrompt, narration }) {
  const image = await generateImage(imagePrompt);
  const video = await generateVideo(videoPrompt || imagePrompt);
  const voice = narration ? await tts({ text: narration }) : null;
  return { image, video, voice, stage: "async_tasks_created" };
}
