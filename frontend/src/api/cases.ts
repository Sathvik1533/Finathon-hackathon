import { API_BASE, authHeader } from './headers';
import type { DiscrepancyCase } from './reconcile';

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = await response.json();
    return new Error(typeof payload?.error === 'string' ? payload.error : fallback);
  } catch {
    return new Error(`${fallback} (HTTP ${response.status})`);
  }
}

export async function getCases(token: string): Promise<DiscrepancyCase[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/cases`, { headers: authHeader(token) });
  } catch {
    throw new Error('Could not reach the cases API.');
  }
  if (!response.ok) throw await readError(response, 'Could not load exception records.');
  const data = await response.json();
  return data.cases ?? data;
}

export async function submitDecision(
  token: string,
  caseId: string,
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
  rationale: string,
): Promise<{ success: boolean; caseId: string; newStatus: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/cases/${encodeURIComponent(caseId)}/decision`, {
      method: 'POST', headers: authHeader(token), body: JSON.stringify({ decision, rationale }),
    });
  } catch {
    throw new Error('Could not reach the cases API. The decision was not saved.');
  }
  if (!response.ok) throw await readError(response, 'The decision was not saved.');
  return response.json();
}
