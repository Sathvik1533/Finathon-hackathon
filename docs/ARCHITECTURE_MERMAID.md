# LedgerSense FIN-11 Architecture

Below is the Mermaid flowchart illustrating the end-to-end architecture of LedgerSense.

```mermaid
flowchart TD
    UserBrowser["User Browser"] --> |"Login"| JWT["JWT Token created"]
    JWT --> ReactApp["React App (Vercel)"]
    
    subgraph ReactApp_Pages["React App"]
        LoginPage["Login"]
        DashboardPage["Dashboard"]
        NovaExplorerPage["Nova Explorer"]
        ExceptionsPage["Exceptions Queue"]
        SettlementPage["Settlement Matcher"]
        ReportPage["Recon Report"]
        TimelinePage["Timeline"]
    end
    ReactApp -.-> ReactApp_Pages
    
    ReactApp --> |"HTTPS Bearer JWT"| NodeAPI["Node.js API (Railway)"]
    
    NodeAPI --> AczenNovaAPI["Aczen Nova API"]
    subgraph NovaStreams["4 Data Streams"]
        PaymentsStream["/payments"]
        GatewayStream["/gateway-transactions"]
        BankStream["/bank-transactions"]
        SettlementStream["/settlements"]
    end
    AczenNovaAPI -.-> NovaStreams
    
    NodeAPI --> StageEngine["7-Stage Engine"]
    subgraph EngineStages["Engine Stages"]
        Stage1["Stage 1: Transaction-ID Match"]
        Stage2["Stage 2: Reference Match"]
        Stage3["Stage 3: Partial Match"]
        Stage4["Stage 4: Fee Calculation"]
        Stage5["Stage 5: Refund/Reversal Handling"]
        Stage6["Stage 6: Settlement Match"]
        Stage7["Stage 7: Risk Ranking"]
    end
    StageEngine -.-> EngineStages
    
    NodeAPI --> RedisCache["Redis Cache (mutex + summary)"]
    
    NodeAPI --> SupabaseDB["Supabase PostgreSQL"]
    subgraph DBTables["Database Tables"]
        TableRuns["finathon_runs"]
        TableExceptions["finathon_exceptions"]
        TableAudit["finathon_audit_log (immutable)"]
    end
    SupabaseDB -.-> DBTables
    
    NodeAPI --> Module11Report["Module 11 Report"]
    Module11Report --> |"JSON output + CSV download"| ReportOutput["Report Output"]
    
    subgraph FuturePhase["Future: AI Features + AWS ECS"]
        AIFeatures["AI Features (LLM Scoring)"]
        AWSDeploy["AWS ECS Containerized API"]
    end
```

ChatGPT Rendering Prompt:
"Render this Mermaid flowchart as a professional enterprise fintech architecture diagram. White background, navy blue (#1e3a5f) for infrastructure nodes, emerald green (#059669) for matched/success nodes, amber (#d97706) for exception nodes, slate gray (#475569) for labels. Sans-serif Inter font. Clean minimal arrows with labels. Title: 'LedgerSense FIN-11 Architecture'."
