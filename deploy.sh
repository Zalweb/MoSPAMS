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

echo "--- Rebuilding app container..."
docker compose build app

echo "--- Restarting app container..."
docker compose up -d app

echo "--- Waiting for container to be healthy..."
sleep 5
docker compose ps app

echo "--- Backend deployed successfully."
REMOTE

echo ""
echo "==> Done! Backend is live on api.mospams.shop"
echo "==> Frontend auto-deploys on Vercel — check https://vercel.com for status."
