#!/usr/bin/env bash
# ============================================================================
# La Caverne aux 40 Voleurs — one-shot deployment on Alibaba Cloud ECS
#
# Run this ON THE ECS INSTANCE (Ubuntu 22.04), as root, after SSH:
#
#   ssh -i key.pem root@<ECS_PUBLIC_IP>
#   curl -fsSL https://raw.githubusercontent.com/mosaic2025/la-caverne-aux-40-voleurs/main/scripts/deploy-ecs.sh -o d.sh
#   DASHSCOPE_API_KEY=sk-xxxxx bash d.sh
#
# Prerequisite on the console side: security group must allow inbound TCP 8787.
# ============================================================================
set -euo pipefail

REPO="https://github.com/mosaic2025/la-caverne-aux-40-voleurs.git"
APP_DIR="/opt/la-caverne"
DATA_DIR="/var/lib/la-caverne"
PORT="${PORT:-8787}"

if [ -z "${DASHSCOPE_API_KEY:-}" ]; then
  echo "FATAL: DASHSCOPE_API_KEY is not set." >&2
  echo "Re-run as:  DASHSCOPE_API_KEY=sk-xxxxx bash $0" >&2
  exit 1
fi

echo "==> [1/5] Installing Node 20 + git"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates >/dev/null
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3)" -lt 20 ] 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "    node $(node -v) / npm $(npm -v)"

echo "==> [2/5] Fetching source"
rm -rf "$APP_DIR"
git clone --depth 1 "$REPO" "$APP_DIR" >/dev/null 2>&1
cd "$APP_DIR"

echo "==> [3/5] Installing dependencies"
npm ci --omit=dev >/dev/null 2>&1 || npm install --omit=dev >/dev/null 2>&1

echo "==> [4/5] Writing server/.env"
cp server/.env.example server/.env
sed -i "s|^DASHSCOPE_API_KEY=.*|DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}|" server/.env
chmod 600 server/.env

echo "==> [5/5] Starting as a systemd service (survives SSH disconnect + reboot)"
# Runtime state lives outside APP_DIR so a redeploy (rm -rf APP_DIR) never wipes it.
mkdir -p "$DATA_DIR"
cat > /etc/systemd/system/la-caverne.service <<EOF
[Unit]
Description=La Caverne aux 40 Voleurs - Qwen Cloud MoE orchestrator
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=PORT=${PORT}
Environment=NODE_ENV=production
Environment=CAVERNE_DATA_FILE=${DATA_DIR}/data.json
ExecStart=$(command -v node) ${APP_DIR}/server/server.mjs
Restart=always
RestartSec=3
StandardOutput=append:/var/log/la-caverne.log
StandardError=append:/var/log/la-caverne.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now la-caverne >/dev/null 2>&1
sleep 4

echo ""
echo "============================================================"
if curl -sf -m 10 "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  IP="$(curl -sf -m 5 https://api.ipify.org 2>/dev/null || echo '<ECS_PUBLIC_IP>')"
  echo "  DEPLOYMENT OK"
  echo ""
  echo "  Public proof URL (paste this on Devpost):"
  echo "    http://${IP}:${PORT}/api/health"
  echo ""
  echo "  Verify from your phone:"
  echo "    curl http://${IP}:${PORT}/api/health"
  echo ""
  echo "  If it works locally but NOT from outside, the ECS security"
  echo "  group is still blocking inbound TCP ${PORT}. Fix it in the console."
else
  echo "  DEPLOYMENT FAILED — health check did not answer."
  echo "  Logs:"
  tail -n 30 /var/log/la-caverne.log 2>/dev/null || journalctl -u la-caverne -n 30 --no-pager
  exit 1
fi
echo "============================================================"
