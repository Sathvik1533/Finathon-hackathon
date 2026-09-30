import { API_BASE, authHeader } from './headers';

export interface AuditEntry {
  id: string;
  eventType: string;
  entityId: string;
  actorUsername: string;
  actorRole: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function getAuditLogs(token: string): Promise<AuditEntry[]> {
  const res = await fetch(`${API_BASE}/api/audit-logs`, { headers: authHeader(token) });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const data = await res.json();
  return data.logs ?? data;
}
