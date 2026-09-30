# FIN-11 LedgerSense | Deployment Guide, AWS (v2)

**Parent guide:** FIN-11 Project Guide. If they disagree, the parent wins, then raise a contract PR.
**Track:** DevOps / AWS. Owns `/infra` and `/.github`. Branch prefix `feat/infra/*`. Deploy only from `main` after the hour-34 code freeze.
**Stack deployed:** Next.js (web), Express (api), FastAPI (ai), PostgreSQL on RDS, S3, SSM/Secrets Manager, Caddy, CloudWatch.

## What changed in v2
1. **Nova:** `NOVA_API_KEY` and `NOVA_BASE_URL` live in SSM under `/fin11/prod/api/`; egress to `www.aczen.in` is verified from the box; CI never uses the real key; a gitleaks rule detects `nova_sk_` tokens; smoke test checks Nova connectivity (admin only step).
2. **Fixes to the previous version:**
   - The release script ran `docker compose run --rm migrate` but no `migrate` service existed. It is defined below.
   - Healthchecks used `wget`, which is not in `node:20-slim` or `python:3.12-slim`. They now use `node` and `python` one-liners.
   - `release-on-box.sh` claimed automatic rollback but had no rollback logic. It is implemented below.
   - The Caddyfile did not redirect `/ai/*` explicitly; it now returns 404 for `/ai/*` so the AI service is provably not public.
3. Retention job for `nova_records` (run as `migrator`, since `api_app` cannot delete).

---

## 1. What Antigravity can and cannot do here
Antigravity writes Dockerfiles, compose files, scripts and workflows and can run them locally. Account-level actions (AWS console resources, MFA, DNS, pasting secrets, creating the Nova key) are done by a human. The runbook marks who does each step.

**Shared preface (paste before every infra prompt)**
> You are working only in `/infra` and `/.github` on the branch named below. The database is PostgreSQL only (RDS in production, `pgvector/pgvector` image locally). Never write a secret into any file, image layer, log or workflow; secrets come from AWS SSM or Secrets Manager at boot. Only the reverse proxy publishes ports (80 and 443). The ai container has no published port. The RDS instance is private. The Nova API key exists only in the api service environment. Make scripts idempotent and safe to re-run, and print what they will do before doing it. Keep manual console steps in a separate list.

## 2. Target architecture
```
Internet -> 443 -> Caddy proxy (EC2)
   |-- /api/* -> api (Express): public via proxy, SSE flush on
   |-- /ai/*  -> 404 (explicit)
   |-- /*     -> web (Next.js)
   |-- ai (FastAPI): internal Docker network only
   +--> RDS PostgreSQL (private subnet, pgvector, 5432 from app SG only)
   +--> S3 (private, presigned URLs)
   +--> SSM / Secrets Manager (EC2 instance role, path /fin11/prod/)
   +--> CloudWatch (logs, alarms)
   +--> outbound HTTPS to www.aczen.in (Nova API, read-only), from the api container only
```
Option A (recommended for 36 hours): one EC2 instance with docker-compose, RDS in private subnets. Option B (ECS Fargate behind an ALB) is cleaner but slower; choose it only if the team already knows it.

## 3. Step-by-step runbook

| # | Step | Who | Details and verification |
|---|---|---|---|
| 1 | Secure the account | You (console) | IAM user or role with MFA, never root. Monthly budget alert. Verify alert visible in Billing |
| 2 | Network and security groups | You or Antigravity with CLI | Default VPC fine. `sg-proxy`: 80 and 443 from the internet; SSH closed (use SSM Session Manager) or your IP only. `sg-db`: 5432 only from the app group. **Outbound: leave HTTPS (443) open so the api can reach Nova** |
| 3 | Create RDS PostgreSQL | You (console) | Not public, private subnet group, encryption on, backups on. Confirm engine version supports pgvector; run `CREATE EXTENSION vector` as master **now**. Run `bootstrap.sql` |
| 4 | Create the S3 bucket | You (console) | Block all public access, default encryption, CORS PUT from your domain only. Instance role limited to this bucket |
| 5 | **Create the Nova production key** | **You (Nova portal)** | Sign in at `https://www.aczen.in/nova-api` with the allowlisted email, create a key named `fin11-prod`. Only one key is active per account: if you use the same account for development, decide who rotates. Copy it once |
| 6 | Store secrets | You (console) | SSM SecureString under `/fin11/prod/<service>/`: `api/DATABASE_URL` (api_app), `api/JWT_SECRET`, `api/INTERNAL_KEY`, **`api/NOVA_API_KEY`**, `api/NOVA_BASE_URL` (`https://www.aczen.in/nova-api/v1`), `api/RAZORPAY_WEBHOOK_SECRET`; `ai/DATABASE_URL` (ai_service), `ai/INTERNAL_KEY`, `ai/GROQ_API_KEY`. The instance role reads only this path. **The `ai` path must not contain any Nova parameter** |
| 7 | Launch EC2 | You (console) | Ubuntu LTS, attach the instance role, install Docker and the compose plugin. Prefer 2 GB or more RAM and add swap (three app containers plus the embedding model). Build images in CI, never on the box |
| 8 | **Verify Nova reachability from the box** | You | Over SSM Session Manager: `curl -fsS https://www.aczen.in/nova-api/v1/health` must return `{"status":"ok"}`. If it fails, check DNS, outbound rules, and that the URL contains `www` |
| 9 | Domain and HTTPS | You then Antigravity | A record to an Elastic IP; Caddy obtains a Let's Encrypt certificate once 80 and 443 are reachable |
| 10 | Images to ECR | Antigravity (CI) | Workflow builds web, api, ai and pushes tags equal to the git commit SHA |
| 11 | Run migrations | Antigravity (script) | Release step: pre-migration RDS snapshot, then `migrate up` with migrator credentials (migrations 0001 to 0009), then set role passwords from secrets |
| 12 | Start the stack | Antigravity (script) | `docker compose -f docker-compose.prod.yml up -d` with env injected from SSM |
| 13 | Verify | You | Smoke test, security checklist item 20 against the public URL, then the full demo flow once **including a Nova import** |
| 14 | Observe | Antigravity | Container logs to CloudWatch; alarm on failed health checks; confirm RDS backups; **metric filter alarm if logs ever contain `nova_sk_`** |
| 15 | Rollback plan | Runbook | Keep the previous image tag; redeploy it. Undo a migration by restoring the pre-migration snapshot |
| 16 | Clean up | You | After the demo: stop or terminate EC2, delete RDS (final snapshot if wanted), empty and delete the S3 bucket, delete ECR images, **revoke the `fin11-prod` Nova key** |

## 4. Files Antigravity should produce

### docker-compose.prod.yml
```yaml
# images are built in CI and pulled; nothing is built on the box
services:
  proxy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile:ro", "caddy_data:/data"]
    environment: [DOMAIN]
    depends_on: [web, api]
    restart: unless-stopped
  web:
    image: ${ECR_REGISTRY}/fin11-web:${TAG}
    env_file: /run/fin11/web.env          # public values only
    expose: ["3000"]
    restart: unless-stopped
  api:
    image: ${ECR_REGISTRY}/fin11-api:${TAG}
    env_file: /run/fin11/api.env          # written from SSM at boot, chmod 600; includes NOVA_API_KEY
    expose: ["4000"]
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 15s
    restart: unless-stopped
  ai:
    image: ${ECR_REGISTRY}/fin11-ai:${TAG}
    env_file: /run/fin11/ai.env           # no Nova variables
    expose: ["8000"]                      # NO ports: internal Docker network only
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/ai/health').status==200 else 1)"]
      interval: 15s
    restart: unless-stopped
  migrate:                                # NEW: one-off release job
    image: ${ECR_REGISTRY}/fin11-api:${TAG}
    command: ["npm", "run", "migrate", "up"]
    env_file: /run/fin11/migrate.env      # DATABASE_URL for the migrator role only
    profiles: ["release"]
volumes: { caddy_data: {} }
```

### Caddyfile
```
{$DOMAIN} {
  handle /api/* {
    reverse_proxy api:4000 {
      flush_interval -1        # required so SSE events (runs and Nova imports) are not buffered
    }
  }
  handle /ai/* { respond 404 }   # the AI service is never public
  handle {
    encode gzip
    reverse_proxy web:3000
  }
}
```
HTTP to HTTPS redirect is automatic in Caddy; verify it.

### load-secrets.sh (core loop)
```bash
set -euo pipefail
mkdir -p /run/fin11 && chmod 700 /run/fin11
for svc in api ai web migrate; do
  aws ssm get-parameters-by-path --path /fin11/prod/$svc/ --with-decryption \
    --query 'Parameters[*].[Name,Value]' --output text |
  while IFS=$'\t' read -r name value; do echo "$(basename "$name")=$value"; done \
    > /run/fin11/$svc.env
  chmod 600 /run/fin11/$svc.env
done
```
Never `echo` the file contents or run with `set -x`. Values are not printed.

### release-on-box.sh (with real rollback)
```bash
#!/usr/bin/env bash
set -euo pipefail
TAG="$1"; PREV_FILE=/opt/fin11/PREV_TAG
PREV="$(cat $PREV_FILE 2>/dev/null || echo none)"
./load-secrets.sh
aws rds create-db-snapshot --db-instance-identifier fin11-db \
  --db-snapshot-identifier "pre-$TAG-$(date +%s)"                 # pre-migration snapshot
docker compose -f docker-compose.prod.yml pull
TAG="$TAG" docker compose -f docker-compose.prod.yml --profile release run --rm migrate
TAG="$TAG" docker compose -f docker-compose.prod.yml up -d
if ./smoke-test.sh "https://$DOMAIN"; then
  echo "$TAG" > "$PREV_FILE"; echo "release $TAG ok"
else
  echo "smoke test failed, rolling back to $PREV" >&2
  [ "$PREV" != none ] && TAG="$PREV" docker compose -f docker-compose.prod.yml up -d
  exit 1                       # a migration rollback is manual: restore the pre-$TAG snapshot
fi
```

### smoke-test.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
B="$1"
curl -fsS "$B/api/health"                                                        # api up
test "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/exceptions")" = 401       # logged out
test "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/nova/status")" = 401      # Nova status needs auth
test "$(curl -s -o /dev/null -w '%{http_code}' "$B/ai/health")" = 404            # ai not public
test "$(curl -s -o /dev/null -w '%{http_code}' "$B/docs")" = 404                 # no /docs in prod
# manual next: login as admin, GET /api/nova/status shows reachable:true, run an import, watch SSE
```

### .gitleaks.toml (custom rule, add to the repo root)
```toml
[[rules]]
id = "nova-api-key"
description = "Nova API key"
regex = '''nova_sk_[A-Za-z0-9_\-]{43}'''
[allowlist]
regexes = ['''nova_sk_REPLACE_ME''']
```

### CI (pull requests) and deploy (main only)
```yaml
# .github/workflows/ci.yml (pin action versions; verify current ones)
on: {pull_request: {branches: [develop, main]}}
jobs:
  checks:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: {POSTGRES_PASSWORD: ci, POSTGRES_DB: fin11}
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
        with: {fetch-depth: 0}                 # gitleaks needs history
      - uses: gitleaks/gitleaks-action@v2
      - uses: actions/setup-node@v4
        with: {node-version: 20}
      - run: npm ci && npm run lint && npm test # NODE_ENV=test uses FixtureNovaClient; no NOVA_API_KEY in CI
        env: {DATABASE_URL: "postgres://postgres:ci@localhost:5432/fin11", NODE_ENV: test}
      - run: npm run migrate up
        env: {DATABASE_URL: "postgres://postgres:ci@localhost:5432/fin11"}
      - uses: actions/setup-python@v5
        with: {python-version: "3.12"}
      - run: pip install -r ai/requirements.txt && pytest ai
```
```yaml
# .github/workflows/deploy.yml (push to main only, after checkpoint hour 35)
on: {push: {branches: [main]}}
permissions: {id-token: write, contents: read}         # OIDC, no long-lived AWS keys
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: {role-to-assume: "${{ secrets.AWS_DEPLOY_ROLE_ARN }}", aws-region: ap-south-1}
      - uses: aws-actions/amazon-ecr-login@v2
      - run: ./infra/scripts/build-push.sh ${{ github.sha }}
      - run: ./infra/scripts/deploy.sh ${{ github.sha }}     # SSM Run Command on the EC2 box
```
**The real Nova key is never a GitHub secret.** It exists only in SSM.

## 5. Environment variables per service

| Service | Variables (values from SSM or Secrets Manager; never git, never images) |
|---|---|
| web | `NEXT_PUBLIC_API_BASE_URL=/api` (public value only) |
| api | `NODE_ENV=production`, `PORT`, `DATABASE_URL` (api_app), `JWT_SECRET`, `JWT_TTL_SECONDS`, `COOKIE_DOMAIN`, `CORS_ORIGIN`, `INTERNAL_KEY`, `AI_SERVICE_URL=http://ai:8000`, `AI_TIMEOUT_MS`, `S3_BUCKET`, `AWS_REGION`, `UPLOAD_MAX_BYTES`, **`NOVA_API_KEY`, `NOVA_BASE_URL`**, `RAZORPAY_WEBHOOK_SECRET` |
| ai | `ENV=production`, `DATABASE_URL` (ai_service), `INTERNAL_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, fallback provider settings, `EMBEDDING_MODEL` |
| migrate (release only) | `DATABASE_URL` (migrator role) |

## 6. Branch prompts (paste after the shared preface)
- **feat/infra/docker:** Create production Dockerfiles for `/web` (Next.js standalone), `/api` (TypeScript build, non-root, `node:20-slim`) and `/ai` (`python:3.12-slim`, uvicorn without reload, non-root). Create `docker-compose.yml` for local dev (web, api, ai, `pgvector/pgvector` Postgres, MinIO) and `docker-compose.prod.yml` exactly as in the Deployment Guide (including the `migrate` service and node/python healthchecks). Only the proxy publishes ports. `.env.example` per service with dummy values (`NOVA_API_KEY=nova_sk_REPLACE_ME`). Acceptance: `docker compose up` starts everything and every `/health` passes.
- **feat/infra/ci:** Create `ci.yml` (gitleaks with the custom Nova rule, lint and unit tests for api and web with `NODE_ENV=test`, migrations against a throwaway `pgvector/pgvector:pg16` service, pytest for ai) and `deploy.yml` (main only, OIDC, images tagged by commit SHA, deploy script). No AWS or Nova keys in the repo. Pin action versions.
- **feat/infra/aws-base:** Write `infra/aws/README.md` and idempotent AWS CLI scripts for security groups, private encrypted RDS, private S3 with CORS for presigned PUT, instance role limited to the `/fin11/prod/` path and the bucket, ECR repositories. Do not print or commit secrets. List every manual console step separately, including creating the Nova key and storing it in SSM.
- **feat/infra/aws-deploy:** Write `infra/scripts`: `load-secrets.sh`, `release-on-box.sh` (snapshot, pull, migrate profile, up, smoke test, rollback to previous tag), `smoke-test.sh`, the Caddyfile with `flush_interval -1` and `/ai/*` 404, and `infra/ROLLBACK.md`.
- **feat/infra/retention:** Write `infra/scripts/purge-nova-records.sh` that, running as `migrator`, deletes `nova_records` older than N days (default 30, argument) after printing the row count and asking for `--yes`. Document that it is manual.

## 7. Release, verification and rollback

**Release order (every time):** CI green on main; release tag created; images tagged with commit SHA in ECR; pre-migration snapshot taken and previous tag noted; migrations applied with the migrator role; `up -d` with the new tag; health checks pass for web, api and ai; smoke test; security checklist item 20 on the public URL; full demo flow once (login, Nova status, Nova import, run, decision, audit).

**Rollback:** application fault: redeploy the previous tag with the same script. Bad migration: stop the stack, restore the pre-migration snapshot to a new instance or point-in-time, update `DATABASE_URL`, redeploy the previous tag. Leaked secret: rotate in SSM (**for Nova: revoke the key in the portal, create a new one, update `/fin11/prod/api/NOVA_API_KEY`**), restart containers, run gitleaks on history.

**Known traps**
- SSE is buffered by proxies by default: keep `flush_interval -1` on `/api/*` and send heartbeats from the API. This also affects Nova import progress.
- Cookies need HTTPS and same site: serve web and api from one domain.
- pgvector on RDS needs a supported engine version: test `CREATE EXTENSION vector` early.
- Small instances run out of memory building images: build in CI.
- **Nova: the apex domain `aczen.in` redirects and clients drop the Authorization header (401). Always use `www`.**
- **Nova allows 120 requests per minute per key; a second import started while another is running doubles the load. The API allows one active import per merchant.**
- Free-tier limits and pricing differ by account and change; confirm in your billing console and set the budget alert first.

## 8. AWS deployment completion checklist
- [ ] IAM with MFA (no root use); budget alert created (You)
- [ ] RDS PostgreSQL private, encrypted, backups on, pgvector enabled, three roles created (You + Antigravity)
- [ ] S3 private, public access blocked, presigned upload tested from the browser (You)
- [ ] All secrets in SSM or Secrets Manager; none in git, images, logs or workflow files (You)
- [ ] **`NOVA_API_KEY` exists only under `/fin11/prod/api/`; `curl` to Nova `/health` works from the box (You)**
- [ ] Security groups: DB reachable only from the app group; ai container not published (You)
- [ ] HTTPS works; HTTP redirects to HTTPS; certificate valid (You)
- [ ] CI green: lint, tests, migrations 0001 to 0009 on throwaway Postgres, gitleaks including the Nova rule (Antigravity)
- [ ] Images pushed to ECR tagged with commit SHA; deploy via OIDC (Antigravity)
- [ ] Migrations applied through the release step with a pre-migration snapshot (Antigravity)
- [ ] Smoke test passes: `/api/health` 200, logged-out 401, `/api/nova/status` 401, `/ai` 404, `/docs` 404 (Antigravity)
- [ ] SSE progress works through the proxy for runs and Nova imports (events arrive live, not in one burst) (You)
- [ ] Admin Nova import succeeds on the public URL; no `nova_sk_` in logs (`grep` on CloudWatch export) (You)
- [ ] Security checklist (parent guide section 8) re-run on the public URL, including logged-out and prompt-injection tests (You)
- [ ] Full demo flow passes on AWS; backup screen recording saved (You)
- [ ] Rollback tested once (previous tag redeployed) (You)
- [ ] Cleanup plan scheduled for after the demo, including revoking the Nova key (You)
