#!/bin/sh
# Lance la Caverne en mode démo sans clé API
set -e
cd "$(dirname "$0")/.."
echo "🔮 Lancement de La Caverne en mode démo..."
node scripts/seed-demo.mjs
node server/server.mjs &
SERVER_PID=$!
sleep 2
echo "🌐 Backend : http://localhost:8787"
echo "🎨 Frontend : npm run dev (dans un autre terminal)"
echo ""
echo "Appuyez sur Entrée pour arrêter le serveur."
read -r dummy
kill $SERVER_PID 2>/dev/null || true
