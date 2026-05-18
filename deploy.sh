#!/usr/bin/env bash
# Deploy MoSPAMS to production server
# Usage: bash deploy.sh

set -e

PEM="$HOME/Documents/WEBTECH.pem"
HOST="ubuntu@16.176.210.53"
REMOTE_DIR="/var/www/mospams"

echo "==> Pushing to GitHub..."
git push origin main

echo "==> Connecting to server and deploying backend..."
ssh -i "$PEM" -o StrictHostKeyChecking=no "$HOST" bash <<'REMOTE'
set -e
cd /var/www/mospams

echo "--- Pulling latest code..."
git pull origin main

echo "--- Rebuilding and restarting all services..."
docker compose build app ai-service
docker compose up -d

echo "--- Waiting for containers to be healthy..."
sleep 10
docker compose ps

echo "--- Pulling Ollama fallback model (skipped if already present)..."
docker exec mospams-ollama ollama pull phi3:mini || true

echo "--- Backend deployed successfully."
REMOTE

echo ""
echo "==> Done! Backend is live on api.mospams.shop"
echo "==> Frontend auto-deploys on Vercel — check https://vercel.com for status."
