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
}

export async function syncNova(token: string): Promise<NovaSyncResponse> {
  const res = await fetch(`${API_BASE}/api/nova/sync`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Nova sync failed: ' + res.status);
  return res.json();
}
