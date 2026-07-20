# 🏴 La Caverne aux 40 Voleurs (English)

> **Adaptive multi-agent MoE orchestrator on Qwen Cloud** for the Qwen Cloud Global AI Hackathon 2026.
> A band of Qwen expert "thieves" directed by one Genie that knows **when NOT to be a MoE**, with real-time economic and quality gain measurement.

> 🇫🇷 French version: [`README.md`](README.md). Submission docs in English: [`docs/en/`](docs/en/).

---

## ✨ Value proposition

La Caverne does not **replace** Qwen — it **intelligently combines** several Qwen models to get more quality while spending fewer tokens than a single agent.

- **Adaptive delegation gate:** analytical tasks → 1 expert (no fusion); multi-domain tasks → top-k + editor fusion.
- **Mode veto:** the orchestrator rejects its own fusion if a single expert wins *(implemented, benchmarked once — it did **not** help; off by default, see below)*.
- **Measured gain:** **+21.9% mean quality** (range +18.9%…+23.6%) vs `qwen-turbo` single agent — 29W/6L over 40 pairwise rounds, double-judge consensus.
- **Provider policy:** only Qwen Cloud / AI Studio / Alibaba Cloud / Ollama Cloud.

---

## 🚀 Quick start

**Demo mode (no API key, 1 command):**
```bash
npm ci && sh scripts/run-demo.sh
```

**Real mode (with Qwen Cloud key):**
```bash
npm ci
cp server/.env.example server/.env   # set DASHSCOPE_API_KEY
node server/server.mjs &             # backend :8787
npm run dev                          # frontend :5273
```

---

## 📊 Results — adaptive MoE vs single agent

**Method:** pairwise A/B with randomized position, **double judge** (`qwen-max` + `qwen-plus`), a win counted **only on judge agreement**, 4-criteria rubric /20.

**Headline — final configuration (`gen_78233b44`), 3 independent runs, 40 pairwise rounds:**

| Metric | Value |
|---|---|
| Pairwise record | **29 wins / 6 losses / 5 ties** |
| Win rate on decided rounds | **82.9%** |
| Quality gain vs `qwen-turbo` | **+18.9% … +23.6%** (mean **+21.9%**) |

**Per-case detail** (longest run: 5 reps, 20 rounds — `bench/hard-1784462060104.json`):

| Case (judge /20) | qwen-turbo | MoE v2 adaptive |
|---|---:|---:|
| secure login | 14.30 | 10.80 ❌ |
| microservices migration | 13.80 | **18.60** |
| pure refactor | 13.20 | **16.70** |
| consistency | 11.90 | **19.50 ✅ (5/5 unanimous)** |
| **Global** | **13.30** | **16.40 (+23.31%)** |

**Why a range and not a single number.** The *same* `qwen-turbo` baseline scored between **13.30 and 16.00** across runs — a 2.70-point swing on identical cases. That judge variance exceeds any single-run delta, which is exactly why we score by **randomized pairwise A/B with double-judge consensus** rather than comparing absolute means. **All 6 benchmark runs are committed in [`bench/`](bench/)**, including the early naive-MoE run that gained only +4.17%.

**Known weakness, stated plainly.** On `secure login` the adaptive MoE **loses** to the single agent (10.80 vs 14.30): fusion dilutes a focused security answer. We publish the case rather than drop it.

**And the fix we tried did not work.** `MOE_MODE_VETO` (L80) was built to catch exactly this failure. We benchmarked it (`bench/hard-1784573625928.json`, 3 reps): global quality went **15.21 → 14.08, i.e. −7.40%**, and `login` collapsed to 5.67. The veto is therefore **off by default and we claim no benefit from it** — we are publishing the run that says so rather than omitting it. Diagnosing why the veto path degrades single-expert answers is the top item of future work.

- Reproduce: `node scripts/bench-hard.mjs <genieId> qwen-turbo 5`, then `node scripts/hero-table.mjs bench/<v1>.json bench/<v2>.json`. ⚠️ Makes real, billable Qwen Cloud API calls. See `docs/BENCHMARK_HARD.md`, `docs/BENCHMARK_HERO.md`, `docs/en/ARCHITECTURE.md`.

---

## 🧪 How to test (reproduce)

```bash
npm run typecheck                              # TypeScript: pass
npm run build                                  # production build: pass
node server/tests/architecture.test.mjs        # 25/25 tests green
node scripts/audit-layers.mjs                  # 81/81 layers present (file + exported symbol)
node server/server.mjs &                       # backend on :8787
node scripts/forge-champion.mjs                # forge the Champion genie → prints <genieId>
node scripts/bench-hard.mjs <genieId> qwen-turbo 5   # hard benchmark ⚠️ real billable API calls
node scripts/demo-scenario.mjs                 # end-to-end demo scenario
```

> `audit-layers.mjs` proves each layer is **implemented** — a real file exporting a real symbol — not merely planned. Behavioural correctness is covered by the 25 tests in `server/tests/architecture.test.mjs`, not by the layer audit.

---

## 🏛️ Architecture

81 functional layers (L0–L80) across 12 pillars. Diagram + details: [`docs/en/ARCHITECTURE.md`](docs/en/ARCHITECTURE.md).

**Qwen family orchestration:** `qwen-turbo` (router) · `qwen-plus` (experts) · `qwen-coder-plus` (code) · `qwen-max` (fusion + judge) · `text-embedding-v3` (routing + KB) · `z-image-turbo` (portraits) · `wan2.1` (video).

---

## 🎭 Panels (frontend)

| Panel | What it does |
|---|---|
| **Le Camp** | L'Embûche (adversarial audit) · Le Conciliabule (squad forge + debate) · Les Sceaux (generative sigil) |
| **Le Génie** | Forge a MoE, chat, choose routing strategy, watch L'Observatoire (live SSE) |
| **Les Trésors** | Benchmark Caverne vs baseline with measured gain |
| **L'Atelier** | IDE with Monaco, qwen-coder assistance, sandboxed execution |
| **La Lampe** | Companion avatar born from your exchanges — unlocked via `shazaam` in L'Atelier |

---

## 🔧 Configuration (`server/.env`)

```env
DASHSCOPE_API_KEY=sk-...        # required (Qwen Cloud / Alibaba Cloud DashScope)
# Optional
ALIBABA_API_KEY=sk-...
OLLAMA_HOST=http://localhost:11434
MOE_BAZAAR=on
MOE_SIROCCO=on
MOE_TRAITOR=on
MOE_MODE_VETO=on   # L80: veto fusion if a single expert wins
```

---

## 📦 Stack

- **Backend:** Node.js 18+ ESM, zero external dependency (native fetch). Port 8787.
- **Frontend:** React 18 + TypeScript + Vite. Port 5273.
- **Editor:** Monaco (self-hosted).
- **AI:** Qwen Cloud / AI Studio / Alibaba Cloud via DashScope, Ollama Cloud. No other provider.

---

## 📜 License

Apache 2.0 — see [`LICENSE`](LICENSE).

> 🏴 **WMF** remains the owner of the project and its concepts.
