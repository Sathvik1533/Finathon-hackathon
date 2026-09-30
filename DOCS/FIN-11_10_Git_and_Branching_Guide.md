# FIN-11 LedgerSense | Git and Branching Guide (v3)

**Parent guide:** FIN-11 Main Guide (`FIN-11_0`). If they disagree, the parent wins, then raise a contract PR.
**Shared repo:** https://github.com/Sathvik1533/Finathon-hackathon.git (one repository, everyone works in it; no forks).
**Purpose:** say exactly which branches must exist across all the guides, who owns each, in what order they merge, and the rules that keep six people from breaking each other's work.

> Note: this guide was written without being able to open the repository, so it does not assume what is already in it. Section 2 has a step that works for both an empty and a non-empty repo.

---

## 1. Branch model

| Branch | Purpose | Who pushes | Rules |
|---|---|---|---|
| `main` | Deployable releases only | Nobody directly; merge from `develop` at a release | Protected. CI green. Deploy runs only from here after the hour-34 freeze |
| `develop` | Integration branch; always green | Nobody directly; PRs from feature branches | Protected. CI green + 1 review |
| `feat/<track>/<topic>` | One module, one agent, one PR | The track owner or their agent | Created from `develop`, deleted after merge. Track is `fe`, `be`, `db`, `ai`, `infra`, `contracts`, `docs` |
| `fix/<track>/<topic>` | Bug fix found after a merge | Same | Same rules as `feat` |
| `hotfix/<topic>` | Emergency fix on production | Lead | Created from `main`, merged to `main` and back to `develop` |

**Tags:** `v0.9-e2e` (end-to-end gate, Main Guide 7.1), `v1.0` (final release). Releases are tags on `main`.

**Naming rules:** lowercase, hyphens, no spaces; the branch name is the same as the entry in the track guide (copy it, do not invent). One branch = one module = one PR under about 300 lines.

---

## 2. First-time repository setup (Lead does this once)

```bash
git clone https://github.com/Sathvik1533/Finathon-hackathon.git
cd Finathon-hackathon
git branch -a                      # see what already exists
git status
```
1. **If the repo is empty:** add a `README.md`, commit, `git push -u origin main`. **If it already has code:** do not overwrite it; put the guides in a branch and open a PR.
2. Create `develop`: `git switch -c develop && git push -u origin develop`.
3. Commit this guide set to `/docs` on `feat/docs/guides` → PR to `develop`.
4. **Give access:** GitHub → repo → Settings → Collaborators → Add people (only the repository owner can do this); each teammate accepts the emailed invitation. Give write access, not admin.
5. **Protect branches** (Settings → Branches, or Rulesets): for `main` and `develop` require a pull request, at least 1 approval, the `checks` CI job to pass, and disallow force pushes and deletion. *If the repo is private on a free plan, some protection options may be unavailable; then enforce the same rules by convention and by the CODEOWNERS review habit below.*
6. Set the default branch to `develop` (so new PRs target it) or remember to choose it manually.
7. Add the files in section 6 (CODEOWNERS, PR template, `.gitignore`, gitleaks hook) on `feat/infra/scaffold`.

Each teammate:
```bash
git clone https://github.com/Sathvik1533/Finathon-hackathon.git
cd Finathon-hackathon
git switch develop && git pull
```

---

## 3. The daily loop

```bash
git switch develop && git pull                     # always start from fresh develop
git switch -c feat/be/simulator                    # exact name from the table below
# ... agent works, tests pass ...
git add -A && git status                           # read it: no .env, no keys
git commit -m "feat(be): seeded simulator with hash test"
git fetch origin && git rebase origin/develop      # resolve conflicts on YOUR branch
git push -u origin feat/be/simulator
# open PR -> develop, fill the template, request review
```
Merge with **squash** into `develop` (one clean commit per branch). After merge: delete the remote branch, `git switch develop && git pull`, start the next branch.

**Commit message format:** `type(scope): summary` where type is `feat`, `fix`, `test`, `docs`, `chore`; scope is the track (`fe`, `be`, `db`, `ai`, `infra`, `contracts`).

---

## 4. All branches across all guides

Legend: **Wave** matches the Antigravity Playbook (Doc 9). **Doc** is where the module and its prompt are defined. Dependencies mean "merge those first". A branch marked ★ is new in v3.

### 4.1 Wave 0: scaffold and contract (hours 0 to 2)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/docs/guides` ★ | Lead | Docs 0 to 11 into `/docs` | none |
| `feat/infra/scaffold` ★ | Infra | Doc 7 Phase 0 items 3, 6, 7, 8: folders `/web /api /ai /db /infra /contracts /.github`, `.gitignore`, `.env.example` per service, gitleaks hook, compose skeleton, CODEOWNERS, PR template | `develop` exists |
| `feat/contracts/openapi` ★ | Lead | Main Guide 9; Doc 5 contract gap list | scaffold |
| `feat/db/schema-core` | Database | Doc 2 D1 (0001) | scaffold |
| `feat/be/nova-client` | Backend | Doc 1 prompt N1: `NovaClient`, `nova-discover.ts`, `nova-mapping.json` | scaffold, Nova key |

### 4.2 Wave 1: foundation (hours 2 to 10)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/db/schema-recon` | Database | Doc 2 D2 (0002) | schema-core |
| `feat/db/audit-config` | Database | Doc 2 D3 (0003) | schema-core |
| `feat/db/roles-security` | Database | Doc 2 D4 (`bootstrap.sql`, 0005) | schema-recon, audit-config |
| `feat/be/foundation` | Backend | Doc 3 B1 | schema-core |
| `feat/be/auth-rbac` | Backend | Doc 3 B2 | foundation |
| `feat/fe/layout` | Frontend | Doc 5 S1 and shared blocks | contract |
| `feat/fe/auth` | Frontend | Doc 5 S2 | layout |
| `feat/infra/docker` | Infra | Doc 6 Dockerfiles + compose | scaffold |
| `feat/infra/ci` | Infra | Doc 6 `ci.yml`, `deploy.yml` | scaffold |
| `feat/infra/aws-base` | Infra | Doc 6 runbook steps 1 to 7 (test `CREATE EXTENSION vector` early) | none |

### 4.3 Wave 2: data in and the engine (hours 10 to 19)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/db/pgvector` | Database | Doc 2 D5 (0004) | audit-config |
| `feat/db/indexes-views` | Database | Doc 2 D6 (0006) | schema-recon |
| `feat/db/nova` | Database | Doc 2 D8 (0007, 0009 grants) | roles-security, indexes-views |
| `feat/db/lab` | Database | Doc 2 D9 (0008) | schema-recon |
| `feat/db/seed-scripts` | Database | Doc 2 D7 | all of the above |
| `feat/be/config-api` | Backend | Doc 3 B3 | auth-rbac, audit-config |
| `feat/be/simulator` | Backend | Doc 3 B4 | schema-core |
| `feat/be/ingestion` | Backend | Doc 3 B5 | foundation |
| `feat/be/nova` | Backend | Doc 3 B12 importer + endpoints | nova-client, config-api, db/nova |
| `feat/be/recon-engine` | Backend | Doc 3 B6 | config-api, simulator |
| `feat/be/jobs-sse` | Backend | Doc 3 B7 | recon-engine |
| `feat/fe/sources` | Frontend | Doc 5 S16 | layout (mock first, then `be/nova`) |
| `feat/fe/batches` | Frontend | Doc 5 S3 | layout |
| `feat/fe/run-console` | Frontend | Doc 5 S4 | layout |
| `feat/fe/dashboard` | Frontend | Doc 5 S5 | run-console |

### 4.4 Wave 3: screens and reporting (hours 19 to 25)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/be/cases` | Backend | Doc 3 B8 | jobs-sse, schema-recon |
| `feat/be/metrics-reports` | Backend | Doc 3 B9 | recon-engine |
| `feat/be/lab` | Backend | Doc 3 B13 | simulator, metrics-reports, be/nova, db/lab |
| `feat/fe/transactions` | Frontend | Doc 5 S6 | layout |
| `feat/fe/settlements` | Frontend | Doc 5 S7 | layout |
| `feat/fe/queue` | Frontend | Doc 5 S8 | layout |
| `feat/fe/case-dossier` | Frontend | Doc 5 S9 | queue |
| `feat/fe/refunds` | Frontend | Doc 5 S10 | layout |
| `feat/fe/audit` | Frontend | Doc 5 S11 | layout |
| `feat/fe/reports` | Frontend | Doc 5 S12 | dashboard |
| `feat/fe/lab` | Frontend | Doc 5 S17 | batches |
| `feat/fe/admin-config` | Frontend | Doc 5 S13 | layout |
| `feat/fe/admin-ai` | Frontend | Doc 5 S14 | layout |
| `feat/fe/admin-users` | Frontend | Doc 5 S15 (stretch) | layout |

### 4.5 Wave 4: AI (start A1 to A3 as early as Wave 2; integrate here, hours 25 to 31)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/ai/skeleton` | AI | Doc 4 A1 | scaffold |
| `feat/ai/explain` | AI | Doc 4 A2 | skeleton |
| `feat/ai/rag` | AI | Doc 4 A3 | skeleton, db/pgvector |
| `feat/ai/policy-chat` | AI | Doc 4 A4 | rag |
| `feat/ai/brief-lab` | AI | Doc 4 A5 | explain |
| `feat/ai/investigator` | AI | Doc 4 A6 | explain |
| `feat/ai/eval` | AI | Doc 4 A7 | policy-chat |
| `feat/ai/suggest-refs` | AI | Doc 4 A8 (stretch) | skeleton |
| `feat/be/ai-proxy` | Backend | Doc 3 B10 | cases, ai/explain |

### 4.6 Wave 5: harden, release (hours 31 to 35)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/infra/aws-deploy` | Infra | Doc 6 scripts, Caddyfile, `ROLLBACK.md` | docker, ci, aws-base |
| `feat/infra/retention` | Infra | Doc 6 purge script | db/nova |
| `feat/docs/demo-script` ★ | Lead | README, data honesty sentence, credits, demo script | all screens |

Then tag `v0.9-e2e` on `develop` after Gate G-E2E, and release to `main` after the freeze.

### 4.7 Wave 6: Razorpay, Phase 2 (only after `v0.9-e2e`)

| Branch | Owner | Doc / prompt | Depends on |
|---|---|---|---|
| `feat/contracts/razorpay` ★ | Lead | Doc 11 R1 | `v0.9-e2e` |
| `feat/db/razorpay` ★ | Database | Doc 11 R2 (0010, 0011) | contracts/razorpay |
| `feat/be/razorpay-client` ★ | Backend | Doc 11 R3 | contracts/razorpay, Razorpay test keys |
| `feat/be/razorpay-import` ★ | Backend | Doc 11 R4 (B14) | razorpay-client, db/razorpay |
| `feat/be/webhooks` | Backend | Doc 11 R5 (B11 upgraded) | db/razorpay |
| `feat/fe/sources-razorpay` ★ | Frontend | Doc 11 R6 | contracts/razorpay (mock), then razorpay-import |
| `feat/infra/razorpay` ★ | Infra | Doc 11 R7 | razorpay-client |
| `feat/ai/source-razorpay` ★ | AI | Doc 11 R8 | ai/brief-lab |

### 4.8 Count
Wave 0: 5 | Wave 1: 10 | Wave 2: 15 | Wave 3: 14 | Wave 4: 9 | Wave 5: 3 | Wave 6: 8, for a total of **64 feature branches**, plus any `fix/*` and `hotfix/*` as needed. Stretch branches you may skip: `feat/fe/admin-users`, `feat/ai/suggest-refs`.

### 4.9 Name conflicts resolved in v3
- Nova: `feat/be/nova-client` (client, discovery, mapping; Wave 0) and `feat/be/nova` (importer, endpoints, SSE; Wave 2) are two different branches. v2 used both names in different guides for what looked like the same work.
- `feat/be/webhooks` existed in v2 as optional B11; in v3 it is built in Wave 6 and is a Must after the gate.

---

## 5. Ownership map and conflict avoidance

| Folder | Only this track edits | Notes |
|---|---|---|
| `/web` | Frontend | Generated API client is regenerated, never hand-edited |
| `/api` | Backend | `api/config/*.json` mappings frozen after hour 2 (Nova) or after R3 (Razorpay) |
| `/db`, `/infra/db` | Database | **Migration numbers are reserved:** 0001 to 0006 core, 0007 nova, 0008 lab, 0009 grants, 0010 razorpay, 0011 razorpay grants. Nobody picks a number |
| `/ai` | AI | |
| `/infra`, `/.github` | Infra | |
| `/contracts` | Lead | Change only via `feat/contracts/*` PRs approved by Backend + Frontend + Lead |
| `/docs`, `README.md` | Lead | |
| Root `package.json`, lockfiles, `docker-compose*.yml` | Infra | Ask Infra; lockfile conflicts are regenerated, not hand-merged |

If your work needs a change in someone else's folder, do not make it: open an issue titled `needs:<track> <what>` and continue with a stub or mock.

---

## 6. Files to add on `feat/infra/scaffold`

**`.github/CODEOWNERS`** (replace handles with your teammates' GitHub usernames)
```
/web/            @frontend-owner
/api/            @backend-owner
/db/             @database-owner
/infra/db/       @database-owner
/ai/             @ai-owner
/infra/          @infra-owner
/.github/        @infra-owner
/contracts/      @lead @backend-owner @frontend-owner
/docs/           @lead
```

**`.github/pull_request_template.md`**
```
## Branch / module
<branch name> | <guide + module id, e.g. Backend Guide B4>

## What changed (max 5 lines)

## Acceptance check ("Done when") - paste real output
<test output, psql output, curl result, or screenshot>

## Safety checklist
- [ ] Only my track's folder changed
- [ ] No secrets, no .env, no sample real data (gitleaks clean)
- [ ] Nothing hardcoded (rates, categories, tolerances, ids)
- [ ] Money as integer paise; SQL parameterized; merchant_id in every query
- [ ] Under ~300 lines
- [ ] Docs updated if behaviour or contract changed
```

**`.gitignore` must include:** `.env`, `.env.*` (but not `.env.example`), `node_modules/`, `.next/`, `dist/`, `__pycache__/`, `.venv/`, `*.pem`, `/mnt`, local Antigravity workspace state if any.

---

## 7. Merge rules

1. **CI green** (lint, tests, migrations on throwaway Postgres, pytest, gitleaks with the Nova and Razorpay rules).
2. **One reviewer who is not the author**; the folder owner merges. The Database owner is the only one who merges anything under `/db`.
3. **Acceptance evidence** pasted in the PR.
4. **No merge on red `develop`.** If `develop` breaks, the last merger fixes it or reverts within 15 minutes.
5. **Code freeze at hour 34:** only `fix/*` branches for bugs and security after this.
6. **Release:** PR `develop` → `main` (merge commit), tag, deploy from `main` only.
7. **Never rewrite shared history.** No force-push to `main` or `develop`.

## 8. If a secret is committed
1. Stop and tell the Lead. 2. **Rotate first:** Nova (revoke key in the portal, create a new one), Razorpay (regenerate Test/Live key; rotate the webhook secret), Groq, JWT secret. 3. Remove from the branch and, if it reached `develop` or `main`, clean history with a history-rewrite tool agreed by the Lead. 4. Run gitleaks on the full history. 5. Add a rule or test so it cannot recur.

## 9. Tracking work
Create one GitHub issue per branch, titled exactly as the branch name, labelled with the track and wave. The PR closes the issue. A GitHub Project board with columns *Blocked, Ready, In progress, In review, Merged* gives the Lead the whole picture in one screen.
