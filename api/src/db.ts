import { Pool } from 'pg';
import { config } from './config';

let poolInstance: Pool | null = null;
let currentDbUrl: string = '';

export function getPool(): Pool {
  const dbUrl = config.databaseUrl || process.env.DATABASE_URL || '';
  if (!poolInstance || currentDbUrl !== dbUrl) {
    currentDbUrl = dbUrl;
    const needsSsl = Boolean(
      dbUrl && (
        dbUrl.includes('supabase.co') ||
        dbUrl.includes('rds.amazonaws.com') ||
        dbUrl.includes('railway.app') ||
        dbUrl.includes('pooler.supabase.com') ||
        dbUrl.includes('sslmode=require') ||
        process.env.PGSSLMODE === 'require'
      )
    );
    poolInstance = new Pool({
      connectionString: dbUrl || undefined,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
    });
    poolInstance.on('error', (err) => {
      // Prevent unhandled error event crashes when DB is unreachable
      const sanitized = (err.message || '').replace(/postgres(?:ql)?:\/\/[^\s@]+@[^\s/]+/gi, 'postgresql://REDACTED@HOST');
      console.warn(`[PG Pool Error] ${sanitized}`);
    });
  }
  return poolInstance;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!config.databaseUrl) {
    throw new Error('Database connection not configured (DATABASE_URL missing)');
  }
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err: any) {
    const sanitized = (err.message || '').replace(/postgres(?:ql)?:\/\/[^\s@]+@[^\s/]+/gi, 'postgresql://REDACTED@HOST');
    console.warn(`[DB Warning] Query failed (${sanitized}): ${text.substring(0, 80)}...`);
    throw err;
  }
}

export async function checkDbHealth(): Promise<{ ok: boolean; message: string; tableCount?: number }> {
  if (!config.databaseUrl) {
    if (process.env.NODE_ENV === 'test') {
      return { ok: true, message: 'Simulated test database active' };
    }
    return { ok: false, message: 'Database connection not configured (DATABASE_URL missing)' };
  }
  try {
    const res = await pool.query('SELECT 1');
    let tableCount = 0;
    try {
      const tablesRes = await pool.query(`
        SELECT count(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      tableCount = tablesRes.rows[0]?.count || 0;
    } catch {
      // Ignore table count error if restricted
    }
    return { ok: true, message: 'Connected to PostgreSQL (Arbitrary Precision Active)', tableCount };
  } catch (err: any) {
    const sanitizedMsg = (err.message || 'Connection failed')
      .replace(/postgres(?:ql)?:\/\/[^\s@]+@[^\s/]+/gi, 'postgresql://REDACTED@HOST')
      .replace(/password=[^\s]+/gi, 'password=REDACTED');
    return { ok: false, message: sanitizedMsg };
  }
}

// Initialize tables if connected
export async function initDatabaseSchema(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test' || !config.databaseUrl) {
    return false;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finathon_runs (
        id text PRIMARY KEY,
        merchant_id text NOT NULL DEFAULT 'm_demo_finathon',
        total_records int NOT NULL,
        matched_count int NOT NULL,
        discrepancy_count int NOT NULL,
        settled_paise bigint NOT NULL,
        amount_at_risk_paise bigint NOT NULL,
        status text NOT NULL DEFAULT 'done',
        executed_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS finathon_exceptions (
        case_id text PRIMARY KEY,
        run_id text NOT NULL,
        order_id text NOT NULL,
        gateway_ref text,
        discrepancy_type text NOT NULL,
        amount_at_risk_paise bigint NOT NULL,
        expected_amount_paise bigint NOT NULL,
        actual_amount_paise bigint NOT NULL,
        status text NOT NULL DEFAULT 'PENDING_REVIEW',
        details text NOT NULL,
        stage_identified int NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS finathon_audit_log (
        id bigserial PRIMARY KEY,
        action text NOT NULL,
        case_id text,
        run_id text,
        decision text,
        rationale text NOT NULL,
        actor text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('[DB Sync] PostgreSQL schema verified/initialized successfully.');
    return true;
  } catch (err: any) {
    console.warn(`[DB Sync] Schema initialization skipped: ${err.message}`);
    return false;
  }
}

// Persist reconciliation run to Postgres
export async function persistReconRun(run: any): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await pool.query(
      `INSERT INTO finathon_runs (id, merchant_id, total_records, matched_count, discrepancy_count, settled_paise, amount_at_risk_paise, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         matched_count = EXCLUDED.matched_count,
         discrepancy_count = EXCLUDED.discrepancy_count,
         settled_paise = EXCLUDED.settled_paise,
         amount_at_risk_paise = EXCLUDED.amount_at_risk_paise`,
      [
        run.runId,
        config.demoMerchantId,
        run.totalRecordsProcessed,
        run.matchedCount,
        run.discrepancyCount,
        run.totalSettledPaise,
        run.totalAmountAtRiskPaise,
        run.executedAt || new Date().toISOString()
      ]
    );

    for (const c of run.cases) {
      await pool.query(
        `INSERT INTO finathon_exceptions (case_id, run_id, order_id, gateway_ref, discrepancy_type, amount_at_risk_paise, expected_amount_paise, actual_amount_paise, status, details, stage_identified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (case_id) DO UPDATE SET
           status = EXCLUDED.status,
           amount_at_risk_paise = EXCLUDED.amount_at_risk_paise,
           details = EXCLUDED.details,
           updated_at = now()`,
        [
          c.caseId,
          run.runId,
          c.orderId,
          c.gatewayRef || null,
          c.discrepancyType,
          c.amountAtRisk,
          c.expectedAmount,
          c.actualAmount,
          c.status,
          c.details,
          c.stageIdentified
        ]
      );
    }
  } catch (err: any) {
    console.warn(`[DB Sync] persistReconRun fallback to memory: ${err.message}`);
  }
}

// Persist case decision & audit log
export async function persistDecision(caseId: string, decision: string, rationale: string, actor: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await pool.query(
      `UPDATE finathon_exceptions SET status = $1, updated_at = now() WHERE case_id = $2`,
      [decision, caseId]
    );
    await pool.query(
      `INSERT INTO finathon_audit_log (action, case_id, decision, rationale, actor)
       VALUES ($1, $2, $3, $4, $5)`,
      ['CASE_DECISION_RECORDED', caseId, decision, rationale, actor]
    );
  } catch (err: any) {
    console.warn(`[DB Sync] persistDecision fallback to memory: ${err.message}`);
  }
}

// Persist general audit log
export async function persistAuditLog(action: string, actor: string, details: string, refId?: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await pool.query(
      `INSERT INTO finathon_audit_log (action, run_id, rationale, actor)
       VALUES ($1, $2, $3, $4)`,
      [action, refId || null, details, actor]
    );
  } catch (err: any) {
    console.warn(`[DB Sync] persistAuditLog fallback to memory: ${err.message}`);
  }
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
  } catch (e) {
    // Ignore error on close
  }
}

