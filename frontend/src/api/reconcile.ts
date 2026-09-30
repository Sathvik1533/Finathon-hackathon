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

export interface ReconcileAnalyticsSeries {
  key: string;
  label: string;
  volumePaise: number;
  orderCount: number;
  matchedCount: number;
}

export interface ReconcileAnalyticsResult {
  period: string;
  range: string;
  totalVolumePaise: number;
  totalOrders: number;
  series: ReconcileAnalyticsSeries[];
}

export async function triggerRun(token: string): Promise<ReconRunResult> {
  const res = await fetch(`${API_BASE}/api/reconcile/run`, {
    method: 'POST',
    headers: authHeader(token),
  });

  if (!res.ok) {
    let msg = `Reconciliation run failed with HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

export async function getLatestRun(token: string): Promise<ReconRunResult | null> {
  const res = await fetch(`${API_BASE}/api/reconcile/latest`, {
    headers: authHeader(token),
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch latest run: HTTP ${res.status}`);
  }

  return res.json();
}

export async function getReconcileAnalytics(
  token: string,
  period: 'monthly' | 'annually' = 'monthly',
  range = 'all',
  startDate?: string,
  endDate?: string
): Promise<ReconcileAnalyticsResult> {
  const params = new URLSearchParams({ period, range });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const res = await fetch(`${API_BASE}/api/reconcile/analytics?${params.toString()}`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch reconciliation analytics: HTTP ${res.status}`);
  }

  return res.json();
}

export async function getHealth(token?: string): Promise<any> {
  const headers = token ? authHeader(token) : { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/api/health`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch health status: HTTP ${res.status}`);
  }
  return res.json();
}
