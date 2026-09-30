import { API_BASE, authHeader } from './headers';

export interface DiscrepancyCase {
  caseId: string;
  orderId: string;
  gatewayRef?: string;
  discrepancyType: string;
  amountAtRisk: number;
  expectedAmount: number;
  actualAmount: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  details: string;
  stageIdentified: number;
}

export interface ReconRunResult {
  runId: string;
  totalRecordsProcessed: number;
  matchedCount: number;
  discrepancyCount: number;
  totalSettledPaise: number;
  totalAmountAtRiskPaise: number;
  cases: DiscrepancyCase[];
  executedAt: string;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = await response.json();
    return new Error(typeof payload?.error === 'string' ? payload.error : fallback);
  } catch {
    return new Error(`${fallback} (HTTP ${response.status})`);
  }
}

export async function triggerRun(token: string): Promise<ReconRunResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/reconcile/run`, { method: 'POST', headers: authHeader(token) });
  } catch {
    throw new Error('Could not reach the reconciliation API. No run was created.');
  }
  if (!response.ok) throw await readError(response, 'Reconciliation run failed.');
  return response.json();
}

export async function getLatestRun(token: string): Promise<ReconRunResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/reconcile/latest`, { headers: authHeader(token) });
  } catch {
    throw new Error('Could not reach the reconciliation API.');
  }
  if (!response.ok) throw await readError(response, 'Could not load the latest reconciliation run.');
  return response.json();
}
