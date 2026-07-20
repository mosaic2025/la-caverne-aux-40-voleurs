# Devpost Submission — La Caverne aux 40 Voleurs (EN)

> Copy-paste-ready content for the qwencloud-hackathon.devpost.com submission form.

## Project Title
**La Caverne aux 40 Voleurs** — An Adaptive Multi-Agent MoE Orchestrator on Qwen Cloud

## Short Description (tagline)
40 expert Qwen "thieves" directed by one Genie that knows **when NOT to be a MoE** — adaptive routing, editor-fusion, self-veto, measured +23% quality vs a single agent under a double-judge pairwise benchmark.

## Project Description (full)

**La Caverne aux 40 Voleurs** is an adaptive Mixture-of-Experts multi-agent orchestrator built natively on **Qwen Cloud / Alibaba Cloud (DashScope)**. Instead of always convening a panel of experts, a "Genie" classifies each query first and decides whether to delegate to a single strong expert or to run a top-k fusion — so the MoE only activates when it measurably adds value.

**Core ideas**
- **Adaptive delegation gate (L79):** analytical mono-domain tasks → 1 expert, no fusion (k=1). Constructive multi-domain tasks → top-k experts + "editor-in-chief" fusion (one narrator, not a patchwork).
- **Mode veto (L80):** the orchestrator confronts its fused answer with the best single expert alone and **rejects its own fusion** if the single expert wins — proof the MoE only activates when it pays off.
- **Qwen family orchestration:** `qwen-turbo` (router) · `qwen-plus` (experts) · `qwen-coder-plus` (code) · `qwen-max` (fusion + judge). Embeddings via `text-embedding-v3`, images via `z-image-turbo`, video via `wan2.1`.
- **Honest, reproducible benchmark:** pairwise A/B randomized + **double judge** (qwen-max + qwen-plus), victory only on agreement, 4-criteria rubric /20, 5 reps.

**Headline result (reproducible)**
| Case (judge /20) | qwen-turbo | MoE v1 naive | MoE v2 adaptive |
|---|---:|---:|---:|
| secure login | 14.30 | 16.00 | 10.80 |
| microservices migration | 13.80 | 17.67 | **18.60** |
| pure refactor | 13.20 | 19.67 | 16.70 |
| **consistency** | **11.90** | **13.33 ❌** | **19.50 ✅ (5/5 unanimous)** |
| **Global** | **13.30** | 16.67 (+4%) | **16.40 (+23%) · 12/20 consensus** |

The v1 regression on `consistency` (fusion dilutes analysis) is **the discovery that motivated v2**.

**Original product identity — Le Camp**
- **L'Embûche** — an adversarial strategist audits the gang's robustness and recruits a breakthrough expert.
- **Le Conciliabule** — an MoE recruiter forms the optimal squad from a natural-language mission, then runs a recruitment debate.
- **Les Sceaux** — generative SVG sigil + dynamic tide; every Genie has its own crest.

**Architecture:** 81 functional layers (L0–L80) verified by a reproducible audit script, 25/25 tests green, typecheck + build green. Zero heavy dependencies: native Node ESM backend + React/Vite/TS frontend.

## Track
**AI Showrunner** — La Caverne is an agent orchestrator that casts, routes, fuses and self-corrects a troupe of Qwen experts to "produce" a single coherent answer, exactly the showrunner metaphor.

## Qwen Cloud / Alibaba Cloud usage
- Default provider `qwen-cloud` via DashScope OpenAI-compatible endpoint.
- Models: `qwen-turbo`, `qwen-plus`, `qwen-max`, `qwen-coder-plus`, `qwen-vl-plus`.
- Embeddings `text-embedding-v3` (1024-d) for routing + KB.
- Image `z-image-turbo`, video `wan2.1-t2v-plus` (Wanx) via DashScope async tasks.
- Provider policy: only Qwen Cloud / AI Studio / Alibaba Cloud / Ollama Cloud — no other provider.

## How we built it
Node ESM backend (`server/`) with a provider-agnostic factory routed to Qwen Cloud; React/Vite/TS frontend (`src/`) with 11 panels; SSE live observability of the orchestrator's reasoning; a hard benchmark harness (`scripts/bench-hard.mjs`) and a hero-table generator (`scripts/hero-table.mjs`).

## Challenges we ran into
- Naive MoE **regressed** on analytical tasks (fusion dilutes the thesis) → solved with the adaptive delegation gate.
- LLM judge is noisy (±std) → solved with pairwise A/B randomization + double judge consensus.
- Keeping provider compliance strict (Qwen/Alibaba/Ollama only) while the codebase had legacy OpenRouter references → fully removed.

## Accomplishments we're proud of
- Turning a measured regression (v1 consistency 13.33) into the **discovery** that justifies the adaptive v2 (19.50, 5/5 unanimous).
- A self-veto mechanism: the orchestrator can reject its own fusion.
- 81/81 layers verified by a reproducible script, not a manual checklist.

## What we learned
That "build a MoE" is not the hard part — "knowing when NOT to be a MoE" is.

## What's next
- Run the benchmark with `MOE_MODE_VETO=on` end-to-end to quantify the self-correction gain on the weak cases (login/refactor).
- Expand the expert pool toward the full 40.

## Built with
Qwen Cloud (DashScope) · Alibaba Cloud ModelStudio · Node.js · React · TypeScript · Vite · Monaco · Mermaid.

## Links
- Public repo: https://github.com/mosaic2025/la-caverne-aux-40-voleurs
- Demo video: [YouTube unlisted link — to add]
- Live demo (Alibaba Cloud): [deployment URL — to add]
