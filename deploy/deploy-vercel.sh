#!/usr/bin/env bash
# ==============================================================================
# FIN-11 LedgerSense | 1-Click Vercel CLI Deployment
# Deploys Static Fintech Terminal Frontend to Vercel Edge CDN
# ==============================================================================
set -euo pipefail

echo "========================================================================"
echo "🚀 FIN-11 LedgerSense | Vercel Fast Evaluation Deployment"
echo "========================================================================"

if ! command -v vercel >/dev/null 2>&1; then
  echo "⚠️ Vercel CLI not found. You can deploy via GUI at https://vercel.com"
  echo "Or install Vercel CLI: npm install -g vercel"
  echo ""
  echo "1-Click Web Deployment:"
  echo "1. Go to https://vercel.com/new"
  echo "2. Import repository: Sathvik1533/Finathon-hackathon"
  echo "3. Root directory: web (or leave blank; vercel.json will handle outputDirectory)"
  echo "4. Click Deploy!"
  exit 0
fi

echo "🚀 Deploying to Vercel production..."
vercel --prod --yes

echo "✓ Vercel deployment completed successfully."
