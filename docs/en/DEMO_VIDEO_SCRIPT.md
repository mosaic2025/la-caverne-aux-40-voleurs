# Demo Video Script — 5 min max (EN)

> Record a screen capture (1080p, ~4:30–5:00). Speak in English or add EN subtitles. Show the live app + a terminal for the benchmark.

## 0:00–0:20 — Hook
"On a single Qwen model, hard multi-domain tasks hit a ceiling. La Caverne aux 40 Voleurs is an adaptive MoE orchestrator on Qwen Cloud that knows **when NOT to be a MoE**."

## 0:20–0:50 — Architecture (1 slide / diagram)
Show `docs/en/ARCHITECTURE.md` Mermaid diagram. One line: "A Genie classifies the query, routes to Qwen experts, fuses with qwen-max, and can self-veto its fusion."

## 0:50–2:00 — Live demo (frontend :5273)
1. **Le Camp** → trigger **L'Embûche** (adversarial audit), then **Le Conciliabule** (forge a squad from a natural-language mission + recruitment debate), then **Les Sceaux** (generative SVG sigil).
2. **Le Génie** → ask an analytical question → show **L'Observatoire** SSE: delegation to a single expert (no fusion). Ask a multi-domain question → top-k + editor fusion. Narrate the routing decision live.

## 2:00–3:00 — The benchmark (terminal)
`node scripts/bench-hard.mjs` (or show pre-computed `docs/BENCHMARK_HARD.md`). Highlight the hero table:
- v1 naive MoE: **+4%**, regresses on `consistency` (13.33).
- v2 adaptive: **+23%**, flips `consistency` to **19.50 (5/5 unanimous)** under a double judge.
- "The v1 regression is the discovery that motivated v2."

## 3:00–3:40 — Self-veto + observability
Turn on `MOE_MODE_VETO=on`, re-ask a code question, show the veto event in L'Observatoire: "the orchestrator compared fused vs best-single and kept the single expert — it self-corrects."

## 3:40–4:20 — Qwen Cloud usage
Quick montage: qwen-turbo (router), qwen-plus (experts), qwen-coder-plus (code), qwen-max (fusion + judge), text-embedding-v3 (routing), z-image-turbo (portraits). "Provider policy: Qwen / Alibaba / Ollama only."

## 4:20–4:50 — Compliance + proofs
- `node scripts/audit-layers.mjs` → 81/81.
- `node server/tests/architecture.test.mjs` → 25/25.
- `npm run typecheck && npm run build` → green.
- Public repo URL on screen.

## 4:50–5:00 — Closing
"Sésame, ouvre-toi. An orchestrator that knows when not to be a MoE. Repo link + live demo URL in the description."

## Recording tips
- Hide secrets/keys from screen.
- Show the Alibaba Cloud deployment URL at 3:40 if available.
- Export to MP4, upload unlisted to YouTube, paste link in Devpost.
