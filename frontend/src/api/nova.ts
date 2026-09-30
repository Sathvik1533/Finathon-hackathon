import { API_BASE, authHeader } from './headers';

export interface NovaPayment {
  id: string;
  order_ref: string;
  amount_paise: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface NovaGatewayTxn {
  id: string;
  gateway_payment_id: string;
  order_ref: string;
  amount_paise: number;
  fee_paise: number;
  tax_paise: number;
  status: string;
  settlement_id: string | null;
  captured_at: string;
}

export interface NovaBankTxn {
  id: string;
  utr: string;
  amount_paise: number;
  credit_date: string;
  narration: string;
  settlement_ref: string | null;
}

export interface NovaSettlement {
  id: string;
  settlement_id: string;
  amount_paise: number;
  settled_at: string;
  status: string;
}

export interface NovaSyncResponse {
  payments: NovaPayment[];
  gatewayTransactions: NovaGatewayTxn[];
  bankTransactions: NovaBankTxn[];
  settlements: NovaSettlement[];
  source: string;
  syncedAt: string;
  provenance?: {
    teamSlot: string;
    datasetSlice: string;
    runId?: string;
  };
}

export interface NovaStatusResponse {
  configured: boolean;
  reachable: boolean;
  authenticated: boolean;
  teamSlot?: string;
  datasetSlice?: string;
  mode: string;
  lastChecked?: string;
  lastImport?: {
    timestamp: string;
    recordsCount: number;
    runId?: string;
  } | null;
  error?: string | null;
}

export async function getNovaStatus(checkLive = false): Promise<NovaStatusResponse> {
  const url = `${API_BASE}/api/nova/status${checkLive ? '?check=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to query Nova status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function syncNova(token: string): Promise<NovaSyncResponse> {
  const res = await fetch(`${API_BASE}/api/nova/sync`, {
    method: 'POST',
    headers: authHeader(token),
  });

  if (!res.ok) {
    let errorMsg = `Sync failed with HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) errorMsg = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function fetchPaymentsStream(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/payments`, {
    headers: authHeader(token),
  });
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error(`Failed to fetch payments stream: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.payments || [];
}
