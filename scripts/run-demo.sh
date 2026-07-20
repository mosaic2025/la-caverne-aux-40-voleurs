#!/bin/sh
# Lance La Caverne en mode démo, seed inclus, puis enchaîne le scénario de démo.
# Usage : sh scripts/run-demo.sh   (Ctrl-C pour arrêter)
set -e
cd "$(dirname "$0")/.."

echo "🔮  Seed de La Caverne (mode démo, sans clé API)…"
node scripts/seed-demo.mjs

echo "🚀  Démarrage backend sur :8787…"
node server/server.mjs >/tmp/caverne-backend.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT INT TERM

# attendre que le serveur réponde
i=0
while [ $i -lt 40 ]; do
  if fetch -qo /dev/null http://localhost:8787/api/health 2>/dev/null || curl -sf http://localhost:8787/api/health >/dev/null 2>&1; then
    break
  fi
  i=$((i+1)); sleep 0.5
done

echo "🌐  Backend : http://localhost:8787  (logs : /tmp/caverne-backend.log)"
echo "🎨  Frontend : npm run dev  (dans un autre terminal → http://localhost:5273)"
echo ""
echo "🎬  Scénario de démo automatique…"
node scripts/demo-scenario.mjs || echo "⚠️  Scénario de démo : voir /tmp/caverne-backend.log"
echo ""
echo "✅  Démo prête. Le backend reste actif. Ctrl-C pour arrêter."
while kill -0 $SERVER_PID 2>/dev/null; do sleep 1; done
