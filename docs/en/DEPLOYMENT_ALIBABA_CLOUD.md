# Backend deployment on Alibaba Cloud — proof for the hackathon

> The rule requires deploying the **backend** on Alibaba Cloud + a proof. Qwen Cloud / ModelStudio (DashScope) covers the **API usage** requirement, but **hosting the Node backend needs a compute service** (ECS / Function Compute / Container Service). ModelStudio alone is not a backend host.

## Recommended: ECS (best fit for our SSE + long-running server)

La Caverne is a long-running HTTP server with **SSE streaming** (`/api/ask`) and file persistence → ECS is the right target (Function Compute is request-scoped and a poor fit for SSE).

### Steps (Alibaba Cloud console)

1. **ECS console** → create an instance:
   - Region: `ap-southeast-1` (Singapore) — same region as your ModelStudio free quota.
   - Instance spec: cheapest pay-as-you-go (e.g. `ecs.t6-c1m1.large` or any free-trial eligible).
   - Image: **Ubuntu 22.04**.
   - Security group: open **8787** (TCP, 0.0.0.0/0) + 22 (SSH).
   - Key pair: create / reuse, save the `.pem`.
2. **SSH in** (from Termux: `ssh -i key.pem root@<ECS_PUBLIC_IP>`).
3. Install Node 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs git
   ```
4. Clone + run:
   ```bash
   git clone https://github.com/mosaic2025/la-caverne-aux-40-voleurs.git
   cd la-caverne-aux-40-voleurs
   npm ci
   cp server/.env.example server/.env
   # edit server/.env: DASHSCOPE_API_KEY=sk-... (your Qwen Cloud / DashScope key)
   PORT=8787 nohup node server/server.mjs > server.log 2>&1 &
   ```
5. Verify: `curl http://<ECS_PUBLIC_IP>:8787/api/health` → `{"ok":true}`.

### Proof to put on Devpost
- Live URL: `http://<ECS_PUBLIC_IP>:8787/api/health`
- Screenshot of the ECS instance page + the `curl` response.
- (Optional) point the frontend `npm run build` then serve `dist/` on the same ECS via `npx serve dist` on port 5273, or a 2nd Nginx.

## Alternative: Function Compute (FC) custom runtime
Only if ECS is not available. FC HTTP triggers struggle with SSE, so the `/api/ask` stream may not work end-to-end; non-streaming routes (`/api/health`, `/api/genies`, `/api/camp/*`) will. Use the `s` CLI (Serverless Devs) with a Node custom runtime. Not recommended for the full demo.

## What counts as "proof"
A reachable URL + a screenshot of the Alibaba Cloud console showing the running resource. Put both in the Devpost submission and in `docs/en/DEPLOYMENT_PROOF.md`.
