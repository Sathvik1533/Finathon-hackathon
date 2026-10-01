#!/usr/bin/env bash
# ==============================================================================
# FIN-11 LedgerSense | 1-Click Railway CLI Deployment
# Deploys Node.js Express API & Managed Redis connected to PostgreSQL on Supabase
# ==============================================================================
set -euo pipefail

echo "========================================================================"
echo "🚀 FIN-11 LedgerSense | Railway Fast Evaluation Deployment"
echo "========================================================================"

if ! command -v railway >/dev/null 2>&1; then
  echo "⚠️ Railway CLI not found. You can deploy via GUI at https://railway.app"
  echo "Or install Railway CLI: npm install -g @railway/cli"
  echo ""
  echo "1-Click Web Deployment:"
  echo "1. Go to https://railway.app/new"
  echo "2. Select 'Deploy from GitHub repo' -> Sathvik1533/Finathon-hackathon"
  echo "3. Add Redis: '+ New' -> 'Database' -> 'Add Redis'"
  echo "4. Add environment variables:"
  echo "   - DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
  echo "   - JWT_SECRET=[SECURE_JWT_SECRET]"
  echo "   - PORT=4000"
  exit 0
fi

echo "🚀 Deploying to Railway using railway.json & nixpacks.toml..."
railway up --detach

echo "✓ Railway deployment initiated."
echo "View status with: railway status"
