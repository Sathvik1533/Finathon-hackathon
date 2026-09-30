# FIN-11 LedgerSense Documentation

This documentation set describes the FIN-11 LedgerSense MVP, including its data sources, database, backend, AI service, frontend, AWS deployment, and completion criteria.

## Guides

| Guide | Scope |
|---|---|
| [Data Guide: Nova API and Synthetic Engine](FIN-11_1_Data_Guide_Nova_and_Synthetic.md) | Nova onboarding and imports, source mapping, financial data rules, synthetic generation, metrics, and acceptance checks |
| [Database Guide](FIN-11_2_Database_Guide.md) | PostgreSQL schema, migrations, grants, connection practices, and database acceptance tests |
| [Backend Guide](FIN-11_3_Backend_Guide.md) | API modules, Nova connector, reconciliation engine, endpoints, configuration, and backend checklist |
| [AI Service Guide](FIN-11_4_AI_Service_Guide.md) | FastAPI AI service boundaries, prompts, guards, fallbacks, environment, and acceptance checks |
| [Frontend Guide](FIN-11_5_Frontend_Guide.md) | Screens, shared components, frontend build sequence, and completion checklist |
| [AWS Deployment Guide](FIN-11_6_Deployment_Guide_AWS.md) | AWS architecture, deployment runbook, secrets, CI/CD, release, verification, and rollback |
| [MVP Completion Checklist](FIN-11_7_MVP_Completion_Checklist.md) | End-to-end requirements, security, deployment, demo proof, and milestone gates |

## Suggested reading order

1. [MVP Completion Checklist](FIN-11_7_MVP_Completion_Checklist.md) for scope and milestone gates.
2. [Data Guide](FIN-11_1_Data_Guide_Nova_and_Synthetic.md) and [Database Guide](FIN-11_2_Database_Guide.md) for data contracts.
3. [Backend Guide](FIN-11_3_Backend_Guide.md), [AI Service Guide](FIN-11_4_AI_Service_Guide.md), and [Frontend Guide](FIN-11_5_Frontend_Guide.md) for implementation.
4. [AWS Deployment Guide](FIN-11_6_Deployment_Guide_AWS.md) for production rollout.

> The uploaded documentation package did not include the referenced “FIN-11 Project Guide.” Where an individual guide defers to that parent guide, resolve any conflicts with the project owner before implementation.

## Sensitive values

Treat API keys, database credentials, webhook secrets, and customer data as sensitive. Do not commit secrets or real customer records; follow the security and secret-management requirements in the guides.
