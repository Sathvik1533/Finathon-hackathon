import { API_BASE, authHeader } from './headers';

export interface SettlementChildOrder {
  orderId: string;
  grossPaise: number;
  feePaise: number;
  taxPaise: number;
  netPaise: number;
  status: string;
  stage?: number;
}

export interface Settlement {
  settlementId: string;
  totalGross: number;
  totalFees: number;
  totalTax: number;
  netAmount: number;
  bankCreditAmount: number | null;
  variance: number | null;
  status: 'MATCHED' | 'PENDING' | 'DISCREPANCY';
  orderCount: number;
  utr: string | null;
  childOrders?: SettlementChildOrder[];
}

export async function getSettlements(token: string): Promise<Settlement[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/settlements`, { headers: authHeader(token) });
  } catch {
    throw new Error('Could not reach the settlements API.');
  }
  if (!response.ok) {
    let message = 'Could not load settlement records.';
    try {
      const payload = await response.json();
      if (typeof payload?.error === 'string') message = payload.error;
    } catch { /* response may not be JSON */ }
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data.settlements ?? data;
}
