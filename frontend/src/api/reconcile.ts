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

export async function triggerRun(token: string): Promise<ReconRunResult> {
  const res = await fetch(`${API_BASE}/api/reconcile/run`, {
    method: 'POST',
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Reconciliation failed: ' + res.status);
  return res.json();
}

export async function getHealth(token: string): Promise<{ status: string; latestRun?: ReconRunResult }> {
  const res = await fetch(`${API_BASE}/api/health`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
