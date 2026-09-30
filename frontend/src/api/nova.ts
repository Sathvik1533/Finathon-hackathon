import { API_BASE, authHeader } from './headers';

export interface NovaPayment { id: string; order_ref: string; amount_paise: number; currency: string; status: string; created_at: string; }
export interface NovaGatewayTxn { id: string; gateway_payment_id: string; order_ref: string; amount_paise: number; fee_paise: number; tax_paise: number; status: string; settlement_id: string | null; captured_at: string; }
export interface NovaBankTxn { id: string; utr: string; amount_paise: number; credit_date: string; narration: string; settlement_ref: string | null; }
export interface NovaSettlement { id: string; settlement_id: string; amount_paise: number; settled_at: string; status: string; }

export interface NovaStatus {
  configured: boolean;
  mode: string;
  dataMode: 'simulated' | 'live' | 'unconfigured' | 'unknown';
  source: string;
  liveIngestionAvailable: boolean;
}

export interface NovaSyncResponse {
  payments: NovaPayment[];
  gatewayTransactions: NovaGatewayTxn[];
  bankTransactions: NovaBankTxn[];
  settlements: NovaSettlement[];
  source: string;
  dataMode: 'simulated' | 'live' | 'unconfigured' | 'unknown';
  syncedAt: string;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try { const payload = await response.json(); return new Error(typeof payload?.error === 'string' ? payload.error : fallback); }
  catch { return new Error(`${fallback} (HTTP ${response.status})`); }
}

export async function getNovaStatus(): Promise<NovaStatus> {
  let response: Response;
  try { response = await fetch(`${API_BASE}/api/nova/status`); }
  catch { throw new Error('Could not check the configured Nova source.'); }
  if (!response.ok) throw await readError(response, 'Could not check the configured Nova source.');
  return response.json();
}

export async function syncNova(token: string): Promise<NovaSyncResponse> {
  let response: Response;
  try { response = await fetch(`${API_BASE}/api/nova/sync`, { headers: authHeader(token) }); }
  catch { throw new Error('Could not reach the Nova data-feed API. No records were synchronized.'); }
  if (!response.ok) throw await readError(response, 'Could not synchronize data feeds.');
  return response.json();
}
