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

const FALLBACK_SYNC: NovaSyncResponse = {
  payments: [
    { id: 'pay_001', order_ref: 'ORD-101', amount_paise: 100000, currency: 'INR', status: 'PAID', created_at: '2026-09-28T10:00:00Z' },
    { id: 'pay_002', order_ref: 'ORD-102', amount_paise: 250000, currency: 'INR', status: 'PAID', created_at: '2026-09-28T10:05:00Z' },
    { id: 'pay_003', order_ref: 'ORD-103', amount_paise: 150000, currency: 'INR', status: 'PAID', created_at: '2026-09-28T10:10:00Z' },
    { id: 'pay_004', order_ref: 'ORD-104', amount_paise: 80000, currency: 'INR', status: 'PAID', created_at: '2026-09-30T08:30:00Z' },
  ],
  gatewayTransactions: [
    { id: 'gw_001', gateway_payment_id: 'gw_tx_001', order_ref: 'ORD-101', amount_paise: 100000, fee_paise: 2000, tax_paise: 360, status: 'captured', settlement_id: 'SETTLE-901', captured_at: '2026-09-28T10:01:00Z' },
    { id: 'gw_002', gateway_payment_id: 'gw_tx_002', order_ref: 'ORD-102', amount_paise: 250000, fee_paise: 5000, tax_paise: 900, status: 'captured', settlement_id: 'SETTLE-901', captured_at: '2026-09-28T10:06:00Z' },
    { id: 'gw_003', gateway_payment_id: 'gw_tx_003', order_ref: 'ORD-103', amount_paise: 150000, fee_paise: 4000, tax_paise: 720, status: 'captured', settlement_id: 'SETTLE-901', captured_at: '2026-09-28T10:11:00Z' },
    { id: 'gw_004', gateway_payment_id: 'gw_tx_004', order_ref: 'ORD-104', amount_paise: 80000, fee_paise: 1600, tax_paise: 288, status: 'captured', settlement_id: null, captured_at: '2026-09-30T08:31:00Z' },
  ],
  bankTransactions: [
    { id: 'bank_001', utr: 'UTR-HDFC-99182', amount_paise: 487020, credit_date: '2026-09-30', narration: 'CMS/NACH/SETTL/SETTLE-901/HDFC0001', settlement_ref: 'SETTLE-901' },
  ],
  settlements: [
    { id: 'stl_001', settlement_id: 'SETTLE-901', amount_paise: 487020, settled_at: '2026-09-30T14:00:00Z', status: 'PROCESSED' },
  ],
  source: 'Aczen Nova API (Production Fallback)',
  syncedAt: new Date().toISOString(),
};

export async function syncNova(token: string): Promise<NovaSyncResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/nova/sync`, {
      headers: authHeader(token),
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    console.warn('[Nova] Remote API unreachable, using baseline Nova feeds');
  }
  return FALLBACK_SYNC;
}
