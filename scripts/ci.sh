#!/usr/bin/env bash
set -euo pipefail

echo "======================================================"
echo "      Finathon CI Local Verification Suite            "
echo "======================================================"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo -e "\n[1/4] Validating GitHub Actions YAML Workflow Syntax..."
python3 -c "
import glob, sys, yaml
yaml_files = glob.glob('.github/workflows/*.yml') + glob.glob('.github/workflows/*.yaml')
errors = 0
for yf in yaml_files:
    try:
        with open(yf, 'r') as f:
            yaml.safe_load(f)
        print(f'  ✓ Valid syntax: {yf}')
    except Exception as e:
        print(f'  ✗ Invalid syntax: {yf}: {e}', file=sys.stderr)
        errors += 1
if errors > 0:
    sys.exit(1)
print(f'All {len(yaml_files)} workflow files are valid.')
"

echo -e "\n[2/4] Verifying Repository Security & Secrets Hygiene..."
BLOCKED_PATTERNS=("\.env$" "\.env\." "\.pem$" "\.key$" "id_rsa" "credentials\.json$")
LEAK_FOUND=0
for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if git ls-files | grep -E "$pattern" 2>/dev/null; then
    echo "  ✗ SECURITY VIOLATION: Sensitive file matching '$pattern' is tracked!"
    LEAK_FOUND=1
  fi
done
if [ $LEAK_FOUND -ne 0 ]; then
  exit 1
fi
echo "  ✓ No sensitive files tracked in git."

echo -e "\n[3/4] Running Code Linting..."
if command -v flake8 >/dev/null 2>&1; then
  flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=.git,__pycache__,venv,.venv,node_modules
  echo "  ✓ Python critical syntax check passed."
else
  python3 -m py_compile src/app.py tests/test_smoke.py
  echo "  ✓ Python compilation syntax check passed."
fi

echo -e "\n[4/4] Executing Pytest Test Suite..."
python3 -m pytest tests/ -v

echo -e "\n======================================================"
echo "  ✓ ALL LOCAL CI CHECKS PASSED SUCCESSFULLY!          "
echo "======================================================"
