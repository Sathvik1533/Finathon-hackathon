import { API_BASE, authHeader } from './headers';

export interface SettlementChildOrder {
  orderId: string;
  grossPaise: number;
  feePaise: number;
  taxPaise: number;
  netPaise: number;
  status: string;
  stage: number;
}

export interface Settlement {
  settlementId: string;
  totalGross: number;
  totalFees: number;
  totalTax: number;
  netAmount: number;
  bankCreditAmount: number | null;
  variance: number;
  status: 'MATCHED' | 'PENDING' | 'DISCREPANCY';
  orderCount: number;
  utr: string | null;
  childOrders?: SettlementChildOrder[];
}

export async function getSettlements(token: string): Promise<Settlement[]> {
  const res = await fetch(`${API_BASE}/api/settlements`, { headers: authHeader(token) });
  if (!res.ok) throw new Error('Failed to fetch settlements');
  const data = await res.json();
  return data.settlements ?? data;
}
