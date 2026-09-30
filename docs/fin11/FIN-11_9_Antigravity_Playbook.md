# FIN-11 LedgerSense | Antigravity Playbook (v3)

**Parent guide:** FIN-11 Main Guide (`FIN-11_0`). If they disagree, the parent wins, then raise a contract PR.
**Purpose:** explain, step by step, how the team uses the Antigravity IDE to build LedgerSense from these guides, in what order, and with what safety rules.
**A note on tool names:** Antigravity's menus, panel names and settings change between versions. This playbook describes the *method* (agent, workspace, task, review, terminal policy). If a button is named differently in your version, use the in-app help; the method does not change.

---

## 1. The idea in one paragraph

Antigravity is an agent-first IDE: instead of typing every line, you give an AI agent a **small, precise task** and it plans, edits files, runs commands and shows you what it did. Our guides are written to fit that: every module has a **branch**, a **prompt** to paste, and a **"Done when"** acceptance check. The human's job is to *choose the task, constrain the agent, and review the diff*. The agent's job is to write code and prove the acceptance check itself.

---

## 2. One-time setup per person (30 minutes)

| # | Step | Detail |
|---|---|---|
| 1 | Install Antigravity and sign in | Use your own account |
| 2 | Clone the repo | `git clone https://github.com/Sathvik1533/Finathon-hackathon.git` then open the folder in Antigravity (Doc 10 explains first-time repo setup and access) |
| 3 | Install runtimes | Node 20, Python 3.12, Docker with compose, `psql`, `gh` (optional), gitleaks |
| 4 | Install the pre-commit secret scan | `gitleaks` hook, so a key can never be committed |
| 5 | Create your local env files | Copy each `.env.example` to `.env`. Put real keys (Nova, later Razorpay test keys, Groq) **only** in the `.env` of the service that owns them. `.env` is gitignored |
| 6 | Open your track guide | You need Doc 0 plus your track guide (Doc 2, 3, 4, 5 or 6) open and pinned |
| 7 | Set agent safety policy | Prefer the setting where the agent **asks before running terminal commands that are not on an allow-list**. Allow-list: `npm`, `npx`, `node`, `pytest`, `python`, `docker compose`, `git status/diff/add/commit`, `psql` against local only. Never allow-list `curl` to unknown hosts, `rm -rf`, or anything that prints env files |
| 8 | Agree the "no secrets in chat" rule | Never paste a real key into a prompt or into the agent chat. Refer to the variable name instead (`NOVA_API_KEY`) |

---

## 3. The working loop for every branch (repeat this exactly)

```
1  Pick the next branch from Doc 10 (respect the merge-order waves)
2  Create the branch (or a worktree) from develop
3  Open ONE agent in that folder only
4  Paste the SHARED PREFACE for your track
5  Paste the BRANCH PROMPT (one module, one small task)
6  Let the agent plan; read the plan; fix it if it is wrong
7  Let it build; tell it to write the acceptance test FIRST or alongside
8  Ask it to run the acceptance check and paste real output
9  YOU review the diff (checklist in section 6)
10 Commit, push, open the PR to develop using the PR template
11 A second person reviews; CI must be green; the folder owner merges
12 Delete the branch; pull develop; go to 1
```

### 3.1 Why "one agent per branch, one folder per agent"
Two agents editing the same files create conflicts nobody understands. The track ownership table (Doc 0, section 2) gives each folder one owner, and each branch touches only its folder. If you want two agents at the same time on your machine, use **git worktrees** so each agent has its own directory:

```bash
git switch develop && git pull
git worktree add ../fin11-be-nova     -b feat/be/nova-client
git worktree add ../fin11-be-simulator -b feat/be/simulator
# open each worktree folder as a separate Antigravity workspace with its own agent
# when a branch is merged:
git worktree remove ../fin11-be-nova
```

### 3.2 Anatomy of a good prompt (what the guides already give you)
1. **Scope line:** "You are working only in `/api` on branch X."
2. **Constraints:** money as integer paise, parameterized SQL, nothing hardcoded, no secrets, generic errors.
3. **One task:** a single module, not "build the backend".
4. **Acceptance check:** "Done when ..." expressed as tests or commands.
5. **Evidence request:** "Run it and paste the output."

If the agent output is too large, split the prompt. The guides say "keep the PR under about 300 lines" for exactly this reason.

---

## 4. Order of work (waves) and which prompts to use

The waves respect dependencies. Branch names are in Doc 10.

| Wave | Goal | Prompts / branches | Gate |
|---|---|---|---|
| **0 Scaffold** (hours 0-2) | Repo, compose, contract, Nova key, discovery | `feat/infra/scaffold`, `feat/contracts/openapi`, `feat/be/nova-client` (N1), `feat/db/schema-core` (D1) | Hour 2 freeze |
| **1 Foundation** (2-10) | Auth and shell | B1, B2, D2, D3, D4, F: layout (S1), auth (S2), infra docker | Login works on real API |
| **2 Data in** (10-19) | Engine inputs and engine | B3, B4, B5, B12 (`feat/be/nova`), D5-D9, B6, B7, S16, S3, S4, S5 | Nova import produces a batch |
| **3 Screens** (19-25) | Everything visible | B8, B9, B13, S6-S12, S17, S13-S15 | All screens read live data |
| **4 AI** (25-31) | Explanation and RAG | A1-A8, B10, S9 AI panel | AI proxy integrated |
| **5 Freeze and release** (31-35) | Harden, deploy | infra ci, aws-base, aws-deploy, retention; security pass; tag `v0.9-e2e` | Release, smoke test |
| **6 Razorpay** (after G-E2E) | Fourth source | Doc 11 prompts R1-R8 | Doc 11 acceptance |

### 4.1 Prompt index (where each prompt lives)

| Track | Prompt IDs | Location |
|---|---|---|
| Database | D1-D10 | Doc 2, section 7 |
| Backend | B1-B14 (each module's "Prompt" line), N1 | Doc 3, section 3; Doc 1, section 5 |
| AI | A1-A8 | Doc 4, section 4 |
| Frontend | one prompt per screen S1-S17, plus the shared blocks | Doc 5, section 3 |
| Infra | five branch prompts | Doc 6, section 6 |
| Razorpay (Phase 2) | R1-R8 | Doc 11, section 9 |

---

## 5. Shared prefaces (paste first, every time)

Each track guide has its own preface; do not paraphrase them. Their key clauses:

| Track | Clauses that matter most |
|---|---|
| Database (Doc 2) | Only `/db`, `/infra/db`; plain SQL migrations; money BIGINT paise; `merchant_id` on every table; no passwords in files; prove with psql |
| Backend (Doc 3) | Only `/api`; connect as `api_app`; parameterized SQL; IDs from JWT only; nothing hardcoded; engine never depends on AI or reads `ground_truth`; Nova and Razorpay secrets only from env, never logged |
| AI (Doc 4) | Only `/ai`; every route needs `X-Internal-Key`; untrusted text delimited and truncated; outputs validated; no Nova or Razorpay anything |
| Frontend (Doc 5) | Only `/web`; typed client from OpenAPI; never call the DB, FastAPI, Nova or Razorpay; no mock data in the final build; plain-text rendering |
| Infra (Doc 6) | Only `/infra`, `/.github`; secrets from SSM at boot; only the proxy publishes ports; scripts idempotent and print before doing |

---

## 6. How to review an agent's diff (do all of these)

1. **Scope:** files changed are only inside your folder.
2. **Secrets:** search the diff for `nova_sk_`, `rzp_`, `KEY=`, `SECRET=`, real emails, passwords. `gitleaks detect` locally.
3. **Hardcoding:** any rate, tolerance, category, stage order, or tenant id typed into code is a reject.
4. **SQL:** string-built SQL is a reject; every query must include `merchant_id` (or `batch_id` inside a tenant-checked batch).
5. **Money:** floating-point arithmetic on money is a reject; only integer paise/BigInt.
6. **Tests:** the acceptance check exists as a test and the agent pasted its real output. Run it yourself once.
7. **Layers:** the engine imports nothing from `services` or `models`; `web` imports nothing from server code; `ai` has no Nova/Razorpay.
8. **Size:** under about 300 lines; otherwise ask to split.
9. **Honesty:** no accuracy claims on Nova/upload/Razorpay data; the data honesty statement is untouched.

## 7. Common failure patterns and the fix

| Symptom | Cause | Fix |
|---|---|---|
| Agent invents Nova filters or field names | It guessed | Point it at `docs/nova-discovery.md` and `nova-mapping.json`; forbid guessing |
| Agent "helpfully" adds mock data | Frontend work before the API exists | Use the Prism mock from the contract only, remove before release |
| Agent uses `Math.random` or `Date.now` in the generator/engine | Convenience | Restate: one seeded PRNG, `asOf` passed in |
| Agent edits a merged migration | It sees a bug | Refuse; add a new migration |
| Agent prints `.env` to debug | Terminal policy too loose | Tighten allow-list; rotate the key if it was printed |
| PR too big to review | Prompt too wide | Split by module; one screen or one endpoint per PR |
| Two agents conflict | Shared folder | Use worktrees and per-track folders |

## 8. Antigravity and secrets (special care)

- The agent can read files in the workspace. Keep real keys in a gitignored `.env` and instruct: "Never open, print or copy `.env`."
- Tests use `FixtureNovaClient` and a fixture Razorpay client (`NODE_ENV=test`); the real APIs are never called in CI.
- If a key appears in a chat, a log or a diff: treat it as leaked. Nova: revoke and recreate in the portal. Razorpay: regenerate in the Dashboard. Then update your `.env`/SSM and run gitleaks on history.

## 9. What Antigravity cannot do for you
Create AWS console resources, enable MFA, own the DNS, paste secrets into SSM, create the Nova or Razorpay keys, or decide product trade-offs. Those are human steps and are listed as such in the Deployment Guide.
