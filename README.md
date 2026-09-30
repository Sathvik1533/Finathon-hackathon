# Finathon-hackathon

[![CI Pipeline](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/ci.yml/badge.svg)](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/ci.yml)
[![CD Deployment Pipeline](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/cd.yml/badge.svg)](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/cd.yml)
[![CodeQL Security Analysis](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/codeql.yml/badge.svg)](https://github.com/Sathvik1533/Finathon-hackathon/actions/workflows/codeql.yml)

Automated Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Finathon Hackathon project.

---

## CI/CD Pipeline Architecture

This repository is equipped with GitHub Actions workflows designed to automate validation, testing, security scanning, packaging, and deployments.

### 1. Continuous Integration (CI) - `.github/workflows/ci.yml`
- **Triggers**:
  - `push` to `main`, `master`, `develop`, `auth`
  - `pull_request` against `main`, `master`, `develop`
  - `workflow_dispatch` (manual trigger via GitHub UI/CLI)
- **Stages**:
  - **Structure & Lint Validation**: Checks workflow YAML syntax, verifies flake8 Python syntax rules, and checks for accidental tracking of sensitive files (`.env`, `.key`, `credentials.json`).
  - **Python Test Matrix**: Validates compatibility across Python `3.10`, `3.11`, and `3.12` running `pytest` with coverage.
  - **Node.js Test Matrix**: Automatically runs for Node projects (`18.x`, `20.x`, `22.x`) when `package.json` is present.
  - **Security & Dependency Audit**: Scans dependencies with `pip-audit` and `npm audit`.
  - **CI Gate**: Unified required status check for GitHub branch protection.

### 2. Continuous Deployment (CD) - `.github/workflows/cd.yml`
- **Triggers**:
  - Push to `main` branch
  - GitHub Releases (`published`)
  - Manual `workflow_dispatch` with target environment (`staging` or `production`) and dry-run toggle
- **Stages**:
  - **Build & Artifact Packaging**: Computes build metadata, builds and validates multi-stage Docker container images.
  - **Deploy Staging**: Deploys to staging environment and validates health check.
  - **Deploy Production**: Deploys to production environment with release gating.

### 3. CodeQL Security Analysis - `.github/workflows/codeql.yml`
- Automated static code security analysis powered by GitHub CodeQL for Python and JavaScript/TypeScript.

---

## Local CI Execution

You can run the same verification suite locally before committing:

```bash
./scripts/ci.sh
# Or via Makefile
make ci
```

### Additional Developer Commands

```bash
make install   # Install development and testing dependencies
make test      # Run pytest suite
make lint      # Check Python code syntax
make run       # Start local development server (http://localhost:8000)
```

---

## Deployment Secrets Configuration

To connect the CD pipeline with your cloud hosting or webhook endpoints, configure the following repository secrets under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Optional / Required |
|-------------|-------------|---------------------|
| `DEPLOY_WEBHOOK_URL_STAGING` | Deployment webhook URL for staging environment | Optional |
| `DEPLOY_WEBHOOK_URL_PROD` | Deployment webhook URL for production environment | Optional |

If webhook secrets are omitted, the CD pipeline runs in simulation mode, validating packaging and artifact integrity.

---

## FIN-11 LedgerSense Documentation

Implementation documentation for data onboarding and synthetic generation, database design, backend APIs, the AI service, frontend screens, AWS deployment, and the end-to-end MVP completion checklist is available in [`docs/fin11/`](docs/fin11/README.md).

- [FIN-11 documentation index](docs/fin11/README.md)
- [MVP completion checklist](docs/fin11/FIN-11_7_MVP_Completion_Checklist.md)
- [AWS deployment guide](docs/fin11/FIN-11_6_Deployment_Guide_AWS.md)

See the index for the full guide list and suggested reading order.
