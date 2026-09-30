#!/usr/bin/env bash
set -euo pipefail

echo "======================================================"
echo "      Finathon CI Local Verification Suite            "
echo "======================================================"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo -e "\n[1/5] Validating GitHub Actions YAML Workflow Syntax..."
python3 -c "
import glob, sys, yaml
yaml_files = sorted(glob.glob('.github/workflows/*.yml') + glob.glob('.github/workflows/*.yaml'))
errors = 0
for yf in yaml_files:
    try:
        with open(yf, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)
            if not content or 'jobs' not in content:
                raise ValueError('Missing jobs or empty workflow definition')
        print(f'  ✓ Valid syntax: {yf}')
    except Exception as e:
        print(f'  ✗ Invalid syntax: {yf}: {e}', file=sys.stderr)
        errors += 1
if errors > 0:
    sys.exit(1)
print(f'All {len(yaml_files)} workflow files are valid.')
"

echo -e "\n[2/5] Verifying Repository Secrets Hygiene (Filenames)..."
# Exclude legitimate template files (.env.example, .env.sample, .env.template)
TRACKED_LEAKS=$(git ls-files | grep -v -E '\.env\.(example|sample|template)$' | grep -E '(^|/)(\.env(\..+)?|.*\.pem|.*\.key|.*id_rsa.*|.*credentials\.json)$' || true)
if [ -n "$TRACKED_LEAKS" ]; then
  echo "  ✗ SECURITY VIOLATION: Sensitive file(s) tracked in git repository:"
  echo "$TRACKED_LEAKS"
  exit 1
fi
echo "  ✓ No forbidden sensitive files tracked in git."

echo -e "\n[3/5] Scanning Tracked Code for Leaked API Credentials..."
LEAK_FOUND=0
for file in $(git ls-files | grep -v -E '^(docs/|\.gitleaks\.toml)'); do
  if [ -f "$file" ]; then
    if grep -E 'nova_sk_[A-Za-z0-9_\-]{43}' "$file" 2>/dev/null | grep -v 'nova_sk_REPLACE_ME' >/dev/null; then
      echo "  ✗ SECURITY VIOLATION: Active Nova API key detected in $file!"
      LEAK_FOUND=1
    fi
    if grep -E 'rzp_(test|live)_[A-Za-z0-9]{10,}' "$file" 2>/dev/null | grep -v 'rzp_test_REPLACE_ME' >/dev/null; then
      echo "  ✗ SECURITY VIOLATION: Active Razorpay key detected in $file!"
      LEAK_FOUND=1
    fi
  fi
done
if [ $LEAK_FOUND -ne 0 ]; then
  echo "  ✗ Security check failed: Live credentials committed in code!"
  exit 1
fi
echo "  ✓ No live API keys or credentials detected in codebase."

echo -e "\n[4/5] Running Code Linting & Syntax Checks..."
if command -v flake8 >/dev/null 2>&1; then
  flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=.git,__pycache__,venv,.venv,node_modules
  echo "  ✓ Flake8 critical syntax checks passed."
else
  python3 -m compileall -q -x '(\.venv|venv|\.git|node_modules)/' .
  echo "  ✓ Python compilation syntax check passed."
fi

echo -e "\n[5/6] Executing Pytest Test Suite..."
TEST_TARGETS="tests"
if [ -d ai/tests ]; then
  TEST_TARGETS="$TEST_TARGETS ai/tests"
fi
python3 -m pytest $TEST_TARGETS -v

echo -e "\n[6/6] Executing Node.js TypeScript API Test Suite..."
if [ -d api ]; then
  (cd api && node dist/test_api.js)
  echo "  ✓ Node.js Express API test suite passed."
fi

echo -e "\n======================================================"
echo "  ✓ ALL LOCAL CI CHECKS PASSED SUCCESSFULLY!          "
echo "======================================================"
