# Devpost Submission — La Caverne aux 40 Voleurs (EN)

> Copy-paste-ready content for the qwencloud-hackathon.devpost.com submission form.

## Project Title
**La Caverne aux 40 Voleurs** — An Adaptive Multi-Agent MoE Orchestrator on Qwen Cloud

## Short Description (tagline)
A troupe of specialized Qwen "thieves" directed by one Genie that knows **when NOT to be a MoE** — adaptive routing, editor-fusion, self-veto. **+21.9% mean quality** vs a single agent, 29 wins / 6 losses over 40 rounds of double-judge pairwise benchmarking.

## Project Description (full)

**La Caverne aux 40 Voleurs** is an adaptive Mixture-of-Experts multi-agent orchestrator built natively on **Qwen Cloud / Alibaba Cloud (DashScope)**. Instead of always convening a panel of experts, a "Genie" classifies each query first and decides whether to delegate to a single strong expert or to run a top-k fusion — so the MoE only activates when it measurably adds value.

**Core ideas**
- **Adaptive delegation gate (L79):** analytical mono-domain tasks → 1 expert, no fusion (k=1). Constructive multi-domain tasks → top-k experts + "editor-in-chief" fusion (one narrator, not a patchwork).
- **Mode veto (L80):** the orchestrator confronts its fused answer with the best single expert alone and **rejects its own fusion** if the single expert wins. Implemented, opt-in (`MOE_MODE_VETO=on`), **off by default — and we benchmarked it: it made things worse** (−7.40% global, `bench/hard-1784573625928.json`). We publish that run and claim no benefit from the veto.
- **Qwen family orchestration:** `qwen-turbo` (router) · `qwen-plus` (experts) · `qwen-coder-plus` (code) · `qwen-max` (fusion + judge). Embeddings via `text-embedding-v3`, images via `z-image-turbo`, video via `wan2.1`.
- **Honest, reproducible benchmark:** pairwise A/B randomized + **double judge** (qwen-max + qwen-plus), victory only on agreement, 4-criteria rubric /20, 5 reps.

**Headline result (reproducible)**

Final configuration, **3 independent runs, 40 pairwise rounds**: **29 wins / 6 losses / 5 ties** — an **82.9% win rate on decided rounds**, quality gain **+18.9%…+23.6%** (mean **+21.9%**).

Per-case detail from the longest run (5 reps, 20 rounds, `bench/hard-1784462060104.json`):

| Case (judge /20) | qwen-turbo | MoE v2 adaptive |
|---|---:|---:|
| secure login | 14.30 | 10.80 ❌ |
| microservices migration | 13.80 | **18.60** |
| pure refactor | 13.20 | **16.70** |
| **consistency** | **11.90** | **19.50 ✅ (5/5 unanimous)** |
| **Global** | **13.30** | **16.40 (+23.31%)** |

**We report a range, not one number, on purpose.** The *same* `qwen-turbo` baseline scored between **13.30 and 16.00** across runs — a 2.70-point swing on identical cases. That judge variance is larger than any single-run delta, which is precisely why victory is scored by **randomized pairwise A/B with double-judge consensus** rather than by comparing absolute means. **All 6 benchmark runs are committed in `bench/`**, including the early naive-MoE run (`hard-1784388536221.json`) that gained only +4.17% — that regression on `consistency` (fusion dilutes analysis) is **the discovery that motivated v2**.

**Where we still lose:** on `secure login` the adaptive MoE scores 10.80 against the single agent's 14.30. We publish the case instead of dropping it. `MOE_MODE_VETO` (L80) was built to catch exactly this failure mode — we benchmarked it and it made things worse (−7.40% global, `login` down to 5.67, `bench/hard-1784573625928.json`), so it stays off by default and we claim no gain from it.

**Original product identity — Le Camp**
- **L'Embûche** — an adversarial strategist audits the gang's robustness and recruits a breakthrough expert.
- **Le Conciliabule** — an MoE recruiter forms the optimal squad from a natural-language mission, then runs a recruitment debate.
- **Les Sceaux** — generative SVG sigil + dynamic tide; every Genie has its own crest.

**Architecture:** 81 functional layers (L0–L80), each proven **implemented** — a real file exporting a real symbol — by a reproducible audit script (`scripts/audit-layers.mjs`); behaviour is covered separately by 25/25 green tests, plus typecheck and build green. Zero heavy dependencies: native Node ESM backend + React/Vite/TS frontend.

## Track
**Agent Society** — La Caverne is a multi-agent collaboration system in the exact terms the track asks for:

- **Distinct capabilities** — a roster of specialized Qwen "thieves", each with its own domain prompt and model tier (`qwen-plus`, `qwen-coder-plus`).
- **Task division & decomposition** — the adaptive delegation gate (L79) classifies each query and splits it across the right number of agents: one expert for analytical mono-domain work, top-k for constructive multi-domain work.
- **Role assignment** — routing scores each agent by `cosine(query, expert) × (0.6 + 0.4 × historical performance)`, so roles are earned by measured competence, not hardcoded.
- **Dialogue & negotiation** — *Le Conciliabule* forms a squad from a natural-language mission and runs a recruitment debate between agents; the *Bazar des Dinars* gives the society a token economy.
- **Conflict resolution** — an editor-in-chief fusion pass reconciles conflicting fragments into one thesis; the *40th Voleur* runs an adversarial check on the result; the mode veto lets the collective overrule its own consensus.
- **Measurable efficiency gains versus single-agent approaches** — this is the centre of our submission: **29 wins / 6 losses / 5 ties over 40 double-judged pairwise rounds, +21.9% mean quality** against a single `qwen-turbo` agent, with every run committed to `bench/` — including the ones where the society *loses*.

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
- 81/81 layers proven implemented by a reproducible script rather than asserted in a manual checklist.
- **Publishing every benchmark run, including the ones that flatter us least** — the baseline's own 2.70-point variance is disclosed, not buried.

## What we learned
That "build a MoE" is not the hard part — "knowing when NOT to be a MoE" is.

## What's next
- **Diagnose the veto regression.** We ran the `MOE_MODE_VETO=on` benchmark expecting it to rescue the weak `login` case. It did the opposite: global quality 15.21 → 14.08 (**−7.40%**) and `login` collapsed to 5.67/20. The run is committed (`bench/hard-1784573625928.json`). Understanding why the veto path degrades single-expert answers is our first task after the hackathon — we would rather ship the negative result than quietly disable the feature.
- Grow the expert pool toward the 40 of the tale. **To be precise about naming: "40 Voleurs" is the Ali Baba reference in the project's name, not a headcount.** The benchmarked Champion roster holds **5 specialized thieves with top-k = 3 selected per query** — the orchestration layer is roster-size-agnostic, and the thesis we defend is "know when to use only one", not "we have the most experts".

## Built with
Qwen Cloud (DashScope) · Alibaba Cloud ModelStudio · Node.js · React · TypeScript · Vite · Monaco · Mermaid.

## Links
- Public repo: https://github.com/mosaic2025/la-caverne-aux-40-voleurs
- Licence: Apache 2.0
- Architecture diagram: [`docs/en/ARCHITECTURE.md`](https://github.com/mosaic2025/la-caverne-aux-40-voleurs/blob/main/docs/en/ARCHITECTURE.md)
- Benchmark evidence (all runs committed): [`bench/`](https://github.com/mosaic2025/la-caverne-aux-40-voleurs/tree/main/bench)
