# 🏴 La Caverne aux 40 Voleurs (English)

> **Adaptive multi-agent MoE orchestrator on Qwen Cloud** for the Qwen Cloud Global AI Hackathon 2026.
> A band of Qwen expert "thieves" directed by one Genie that knows **when NOT to be a MoE**, with real-time economic and quality gain measurement.

> 🇫🇷 French version: [`README.md`](README.md). Submission docs in English: [`docs/en/`](docs/en/).

---

## ✨ Value proposition

La Caverne does not **replace** Qwen — it **intelligently combines** several Qwen models to get more quality while spending fewer tokens than a single agent.

- **Adaptive delegation gate:** analytical tasks → 1 expert (no fusion); multi-domain tasks → top-k + editor fusion.
- **Mode veto:** the orchestrator rejects its own fusion if a single expert wins.
- **Measured gain:** +23% quality vs `qwen-turbo` single agent under a double-judge pairwise benchmark.
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

| Case (judge /20) | qwen-turbo | MoE v1 naive | MoE v2 adaptive |
|---|---:|---:|---:|
| secure login | 14.30 | 16.00 | 10.80 |
| microservices migration | 13.80 | 17.67 | **18.60** |
| pure refactor | 13.20 | 19.67 | 16.70 |
| consistency | 11.90 | 13.33 ❌ | **19.50 ✅ (5/5 unanimous)** |
| **Global** | **13.30** | 16.67 (+4%) | **16.40 (+23%) · 12/20 consensus** |

- **Pairwise A/B randomized** + **double judge** (qwen-max + qwen-plus), victory only on agreement.
- 5 reps per question. The v1 regression on `consistency` (fusion dilutes analysis) is the discovery that motivated v2 (single-expert delegation + editor fusion). Flip 13.33 → 19.50, 5/5 unanimous.
- Reproduce: `node scripts/bench-hard.mjs` then `node scripts/hero-table.mjs bench/<v1>.json bench/<v2>.json`. See `docs/BENCHMARK_HARD.md`, `docs/BENCHMARK_HERO.md`, `docs/en/ARCHITECTURE.md`.

---

## 🧪 How to test (reproduce)

```bash
npm run typecheck                              # TypeScript: pass
npm run build                                  # production build: pass
node server/tests/architecture.test.mjs        # 25/25 tests green
node scripts/audit-layers.mjs                  # 81/81 layers verified
node server/server.mjs &                       # backend on :8787
node scripts/forge-champion.mjs                # forge the Champion genie
node scripts/bench-hard.mjs                    # hard benchmark (5 reps, double judge)
node scripts/demo-scenario.mjs                 # end-to-end demo scenario
```

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
