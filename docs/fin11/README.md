# FIN-11 LedgerSense Documentation (v3)

This guide set describes the FIN-11 LedgerSense MVP and its Phase 2 Razorpay integration. The [Main Guide](FIN-11_0_Main_Guide_End_to_End.md) is the parent source of truth: where another guide conflicts with it, follow the Main Guide and raise a contract PR.

## Guides

| Guide | Scope |
|---|---|
| [0. Main Guide: End to End](FIN-11_0_Main_Guide_End_to_End.md) | Product scope, architecture, team plan, milestones, quality gates, demo and implementation contracts |
| [1. Data Guide: Nova API and Synthetic Engine](FIN-11_1_Data_Guide_Nova_and_Synthetic.md) | Nova onboarding and imports, source mapping, financial data rules, synthetic generation, metrics, and acceptance checks |
| [2. Database Guide](FIN-11_2_Database_Guide.md) | PostgreSQL schema, migrations, grants, tenant isolation, connection practices, and acceptance tests |
| [3. Backend Guide](FIN-11_3_Backend_Guide.md) | API modules, Nova and Razorpay connectors, reconciliation engine, endpoints, configuration, and backend checklist |
| [4. AI Service Guide](FIN-11_4_AI_Service_Guide.md) | FastAPI AI service boundaries, prompts, guards, fallbacks, environment, and acceptance checks |
| [5. Frontend Guide](FIN-11_5_Frontend_Guide.md) | Screens, shared components, frontend build sequence, Razorpay flows, and completion checklist |
| [6. AWS Deployment Guide](FIN-11_6_Deployment_Guide_AWS.md) | AWS architecture, deployment runbook, secrets, CI/CD, release, verification, and rollback |
| [7. MVP Completion Checklist](FIN-11_7_MVP_Completion_Checklist.md) | End-to-end requirements, security, deployment, demo proof, and milestone gates |
| [8. User Journey and Screens](FIN-11_8_User_Journey_and_Screens.md) | User flows, screen behavior, system responses, and QA/demo walkthroughs |
| [9. Antigravity Playbook](FIN-11_9_Antigravity_Playbook.md) | Team workflow for using Antigravity to build and review the project safely |
| [10. Git and Branching Guide](FIN-11_10_Git_and_Branching_Guide.md) | Shared repository branches, ownership, merge order, and collaboration rules |
| [11. Razorpay Integration Guide](FIN-11_11_Razorpay_Integration_Guide.md) | Phase 2 Razorpay integration plan, schema, backend, UI, security and rollout gates |

## Suggested reading order

1. Read the [Main Guide](FIN-11_0_Main_Guide_End_to_End.md) for scope and implementation contracts.
2. Read the [Git and Branching Guide](FIN-11_10_Git_and_Branching_Guide.md) and [Antigravity Playbook](FIN-11_9_Antigravity_Playbook.md) before splitting implementation work.
3. Use the data, database, backend, AI, frontend and deployment guides for track-specific work.
4. Use the [User Journey and Screens](FIN-11_8_User_Journey_and_Screens.md) for QA and demos, and the [MVP Completion Checklist](FIN-11_7_MVP_Completion_Checklist.md) to verify gates.
5. Implement [Razorpay](FIN-11_11_Razorpay_Integration_Guide.md) only after its stated Phase 2 gate is met.

## Sensitive values

Treat API keys, database credentials, webhook secrets, and customer data as sensitive. Do not commit secrets or real customer records; follow the security and secret-management requirements in the guides.
