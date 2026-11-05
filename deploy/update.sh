#!/usr/bin/env bash
# Sunucuda güncelleme: git push sonrası proje klasöründe çalıştırın →  bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Kod çekiliyor"
git pull --ff-only

echo "▶ Bağımlılıklar"
npm ci

echo "▶ Derleme"
npm run build

echo "▶ Veritabanı migration"
npm run db:deploy

echo "▶ PM2 yeniden başlatılıyor"
pm2 restart guzel-auth --update-env || pm2 start ecosystem.config.cjs
pm2 save

# PORT, .env dosyasından okunur
PORT="$(grep -E '^PORT=' .env | head -1 | cut -d= -f2 | tr -d '[:space:]')"
sleep 3
echo "▶ Sağlık kontrolü (http://127.0.0.1:${PORT:-3000}/api/health)"
curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" && echo
echo "✔ Tamam"
