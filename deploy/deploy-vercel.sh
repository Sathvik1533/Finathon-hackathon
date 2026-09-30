#!/usr/bin/env bash
# ==============================================================================
# FIN-11 LedgerSense | 1-Click Vercel CLI Deployment
# Deploys Static Fintech Terminal Frontend to Vercel Edge CDN
# ==============================================================================
set -euo pipefail

echo "========================================================================"
echo "FIN-11 LedgerSense | Vercel Deployment"
echo "========================================================================"

if ! command -v vercel >/dev/null 2>&1; then
  echo "⚠️ Vercel CLI not found. You can deploy via GUI at https://vercel.com"
  echo "Or install Vercel CLI: npm install -g vercel"
  echo ""
  echo "1-Click Web Deployment:"
  echo "1. Go to https://vercel.com/new"
  echo "2. Import repository: Sathvik1533/Finathon-hackathon"
  echo "3. Set Root Directory to the repository root (.). Do not select web; it is a generated static output."
  echo "4. Set VITE_API_BASE in Vercel to the verified Railway API origin."
  echo "5. Use the repository build (npm run build) to compile frontend and synchronize web/."
  echo "6. Review the preview build before any production deployment."
  exit 0
fi

echo "🚀 Deploying to Vercel production..."
vercel --prod --yes

echo "✓ Vercel deployment completed successfully."
