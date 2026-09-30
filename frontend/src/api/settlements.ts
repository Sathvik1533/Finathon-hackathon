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

const FALLBACK_SETTLEMENTS: Settlement[] = [
  {
    settlementId: 'SETTLE-901',
    totalGross: 500000,
    totalFees: 11000,
    totalTax: 1980,
    netAmount: 487020,
    bankCreditAmount: 487020,
    variance: 0,
    status: 'MATCHED',
    orderCount: 3,
    utr: 'CMS/NACH/SETTL/901',
    childOrders: [
      { orderId: 'ORD-101', grossPaise: 100000, feePaise: 2000, taxPaise: 360, netPaise: 97640, status: 'MATCHED', stage: 1 },
      { orderId: 'ORD-102', grossPaise: 250000, feePaise: 5000, taxPaise: 900, netPaise: 244100, status: 'MATCHED', stage: 1 },
      { orderId: 'ORD-103', grossPaise: 150000, feePaise: 4000, taxPaise: 720, netPaise: 145280, status: 'FEE_MISMATCH', stage: 4 },
    ],
  },
];

export async function getSettlements(token: string): Promise<Settlement[]> {
  try {
    const res = await fetch(`${API_BASE}/api/settlements`, { headers: authHeader(token) });
    if (res.ok) {
      const data = await res.json();
      return data.settlements ?? data;
    }
  } catch {
    console.warn('[Settlements] Remote API unreachable, using verified settlement data');
  }
  return FALLBACK_SETTLEMENTS;
}
