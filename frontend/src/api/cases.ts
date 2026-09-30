import { API_BASE, authHeader } from './headers';
import type { DiscrepancyCase } from './reconcile';

export async function getCases(token: string): Promise<DiscrepancyCase[]> {
  const res = await fetch(`${API_BASE}/api/cases`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to load discrepancy cases: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.cases ?? data;
}

export async function submitDecision(
  token: string,
  caseId: string,
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
  rationale: string
): Promise<{ success: boolean; caseId: string; newStatus: string }> {
  const res = await fetch(`${API_BASE}/api/cases/${caseId}/decision`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ decision, rationale }),
  });

  if (!res.ok) {
    let msg = `Decision submission failed: HTTP ${res.status}`;
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
