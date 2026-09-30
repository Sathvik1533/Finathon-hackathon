import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { checkDbHealth, initDatabaseSchema, persistReconRun, persistDecision, persistAuditLog } from './db';
import { loginUser, authenticate, AuthenticatedRequest } from './auth';
import { novaClient } from './novaClient';
import { reconEngine, DiscrepancyCase } from './reconEngine';
import { redisCache } from './redis';

const app = express();

app.use(cors());
app.use(express.json());

// Serve static web UI
const webDistPath = path.resolve(__dirname, '../../web');
app.use(express.static(webDistPath));

// In-memory state storage (persisted / synced with DB when connected)
let currentCases: DiscrepancyCase[] = [];
let latestRun: any = null;
const auditLogs: any[] = [];

// Seed initial state
(async function init() {
  try {
    await initDatabaseSchema();
    const [payments, gatewayTxs, bankTxs, settlements] = await Promise.all([
      novaClient.fetchPayments(),
      novaClient.fetchGatewayTransactions(),
      novaClient.fetchBankTransactions(),
      novaClient.fetchSettlements(),
    ]);
    latestRun = reconEngine.runReconciliation(payments, gatewayTxs, bankTxs, settlements);
    currentCases = [...latestRun.cases];
    auditLogs.unshift({
      action: 'SYSTEM_BOOTSTRAP_INITIALIZED',
      runId: latestRun.runId,
      discrepancies: latestRun.discrepancyCount,
      amountAtRisk: latestRun.totalAmountAtRiskPaise,
      user: 'system@ledgersense.internal',
      timestamp: new Date().toISOString(),
    });
    await persistReconRun(latestRun);
    await persistAuditLog('SYSTEM_BOOTSTRAP_INITIALIZED', 'system@ledgersense.internal', `Bootstrap run ${latestRun.runId}`, latestRun.runId);
    await redisCache.setLatestRunSummary(latestRun);
    await redisCache.cacheRunSummary(latestRun.runId, latestRun);
  } catch (err) {
    console.error('Initialization error:', err);
  }
})();

// 1. Health checks (B1 requirement)
app.get(['/health', '/api/health'], async (req: Request, res: Response) => {
  const dbHealth = await checkDbHealth();
  const novaStatus = novaClient.getStatus();
  const redisStatus = redisCache.getStatus();
  res.json({
    status: 'healthy',
    service: 'finathon-api',
    stack: 'Node.js + Express + TypeScript + PostgreSQL + Redis',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    nova: novaStatus,
    redis: redisStatus,
  });
});

app.get('/api/redis/status', (req: Request, res: Response) => {
  res.json(redisCache.getStatus());
});


app.get('/api/db/status', async (req: Request, res: Response) => {
  const dbHealth = await checkDbHealth();
  res.json({
    database: dbHealth,
    inMemoryRecords: {
      cases: currentCases.length,
      auditLogs: auditLogs.length,
      latestRunId: latestRun?.runId || null,
    },
  });
});

// 2. Authentication (B2: Credentials -> JWT)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const result = loginUser(username, password);
  if (!result.success) {
    res.status(401).json({ error: result.message });
    return;
  }

  auditLogs.unshift({
    action: 'USER_LOGIN',
    user: result.user?.username,
    role: result.user?.role,
    timestamp: new Date().toISOString(),
  });

  res.json({
    message: 'Login successful',
    token: result.token,
    user: result.user,
  });
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// 3. Nova Accounting API Feeds (B12: 4-Source Real Ingestion)
app.get('/api/nova/status', (req: Request, res: Response) => {
  res.json(novaClient.getStatus());
});

app.post('/api/nova/sync', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [payments, gatewayTxs, bankTxs, settlements] = await Promise.all([
      novaClient.fetchPayments(),
      novaClient.fetchGatewayTransactions(),
      novaClient.fetchBankTransactions(),
      novaClient.fetchSettlements(),
    ]);

    auditLogs.unshift({
      action: 'NOVA_FEED_SYNC',
      user: req.user?.username,
      records: payments.length + gatewayTxs.length + bankTxs.length + settlements.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Nova financial data streams ingested successfully',
      counts: {
        payments: payments.length,
        gatewayTransactions: gatewayTxs.length,
        bankTransactions: bankTxs.length,
        settlements: settlements.length,
      },
      sample: {
        payments: payments.slice(0, 2),
        gatewayTransactions: gatewayTxs.slice(0, 2),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to ingest Nova streams', details: err.message });
  }
});

// 4. 7-Stage Reconciliation Run (B6) with Distributed Job Locking & Cache
app.post('/api/reconcile/run', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  // Acquire distributed mutex lock to prevent concurrent reconciliation runs
  const lock = await redisCache.acquireLock('reconciliation:run', 30);
  if (!lock.acquired) {
    res.status(409).json({
      error: 'Reconciliation run already in progress. Mutex lock held by another worker.',
    });
    return;
  }

  try {
    const [payments, gatewayTxs, bankTxs, settlements] = await Promise.all([
      novaClient.fetchPayments(),
      novaClient.fetchGatewayTransactions(),
      novaClient.fetchBankTransactions(),
      novaClient.fetchSettlements(),
    ]);

    const result = reconEngine.runReconciliation(payments, gatewayTxs, bankTxs, settlements);
    currentCases = result.cases;
    latestRun = result;

    // Cache summary in Redis / Memory store
    await redisCache.cacheRunSummary(result.runId, result);
    await redisCache.setLatestRunSummary(result);

    auditLogs.unshift({
      action: 'RECONCILIATION_RUN_COMPLETED',
      runId: result.runId,
      discrepancies: result.discrepancyCount,
      amountAtRisk: result.totalAmountAtRiskPaise,
      user: req.user?.username,
      timestamp: new Date().toISOString(),
    });

    await persistReconRun(result);
    await persistAuditLog('RECONCILIATION_RUN_COMPLETED', req.user?.username || 'system', `Run ${result.runId}: ${result.discrepancyCount} discrepancies`, result.runId);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Reconciliation failed', details: err.message });
  } finally {
    await lock.release();
  }
});

// Cache query endpoints for run summaries
app.get('/api/reconcile/latest', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const cached = await redisCache.getLatestRunSummary();
  if (cached) {
    res.json(cached);
    return;
  }
  if (latestRun) {
    res.json(latestRun);
    return;
  }
  res.status(404).json({ error: 'No reconciliation run recorded yet' });
});

app.get('/api/reconcile/summary/:runId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const cached = await redisCache.getRunSummary(req.params.runId);
  if (cached) {
    res.json(cached);
    return;
  }
  if (latestRun && latestRun.runId === req.params.runId) {
    res.json(latestRun);
    return;
  }
  res.status(404).json({ error: `Run summary for ${req.params.runId} not found` });
});

// 5. Exception Management & Review Cases (B8)
app.get('/api/cases', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const cachedLatest = await redisCache.getLatestRunSummary();
  res.json({
    total: currentCases.length,
    cases: currentCases,
    latestRunSummary: cachedLatest || latestRun,
    cacheStatus: redisCache.getStatus(),
  });
});


app.get('/api/cases/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const caseItem = currentCases.find((c) => c.caseId === req.params.id);
  if (!caseItem) {
    res.status(404).json({ error: `Case ${req.params.id} not found` });
    return;
  }
  res.json(caseItem);
});

app.post('/api/cases/:id/decision', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { decision, reason } = req.body;
  if (!['APPROVED', 'REJECTED', 'ESCALATED'].includes(decision)) {
    res.status(400).json({ error: 'Decision must be APPROVED, REJECTED, or ESCALATED' });
    return;
  }

  const caseId = String(req.params.id);
  const caseIndex = currentCases.findIndex((c) => c.caseId === caseId);
  if (caseIndex === -1) {
    res.status(404).json({ error: `Case ${caseId} not found` });
    return;
  }

  currentCases[caseIndex].status = decision;
  const rationaleText = reason || 'Reviewed by finance analyst';

  auditLogs.unshift({
    action: 'CASE_DECISION_RECORDED',
    caseId,
    decision,
    reason: rationaleText,
    user: req.user?.username,
    timestamp: new Date().toISOString(),
  });

  await persistDecision(caseId, decision, rationaleText, req.user?.username || 'admin');

  res.json({
    message: `Case ${caseId} updated to ${decision}`,
    case: currentCases[caseIndex],
  });
});

// 6. Settlements & Batches (B6 & B9)
app.get('/api/settlements', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const settlements = await novaClient.fetchSettlements();
  const bankTxs = await novaClient.fetchBankTransactions();
  res.json({ settlements, bankTransactions: bankTxs });
});

// 7. Immutable Audit Trail (B2 & DB Core)
app.get('/api/audit-logs', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    count: auditLogs.length,
    logs: auditLogs,
  });
});

export default app;

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`[API Server] Running at http://localhost:${config.port}`);
  });
}
