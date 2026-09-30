import { API_BASE, authHeader } from './headers';
import type { DiscrepancyCase } from './reconcile';

const FALLBACK_CASES: DiscrepancyCase[] = [
  {
    caseId: 'CASE-001',
    orderId: 'ORD-103',
    gatewayRef: 'gw_tx_003',
    discrepancyType: 'FEE_MISMATCH',
    amountAtRisk: 1000,
    expectedAmount: 3000,
    actualAmount: 4000,
    status: 'PENDING_REVIEW',
    details: 'Stage 4: Gateway charged fee Rs 40.00 vs contract schedule Rs 30.00 (Rs 10.00 leak)',
    stageIdentified: 4,
  },
  {
    caseId: 'CASE-002',
    orderId: 'ORD-104',
    gatewayRef: 'gw_tx_004',
    discrepancyType: 'TIMING_LAG',
    amountAtRisk: 78112,
    expectedAmount: 78112,
    actualAmount: 0,
    status: 'PENDING_REVIEW',
    details: 'Stage 6: Transaction authorized 2026-09-30 08:30:00 UTC within normal T+2 settlement cutoff window',
    stageIdentified: 6,
  },
];

let localCases = [...FALLBACK_CASES];

export async function getCases(token: string): Promise<DiscrepancyCase[]> {
  try {
    const res = await fetch(`${API_BASE}/api/cases`, { headers: authHeader(token) });
    if (res.ok) {
      const data = await res.json();
      return data.cases ?? data;
    }
  } catch {
    console.warn('[Cases] Remote API unreachable, using local state');
  }
  return localCases;
}

export async function submitDecision(
  token: string,
  caseId: string,
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
  rationale: string
): Promise<{ success: boolean; caseId: string; newStatus: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/decision`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ decision, rationale }),
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    console.warn('[Cases] Remote API unreachable, recording decision locally');
  }

  localCases = localCases.map(c => (c.caseId === caseId ? { ...c, status: decision } : c));
  return { success: true, caseId, newStatus: decision };
}
