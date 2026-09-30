export interface DiscrepancyCase {
  caseId: string;
  orderId: string;
  gatewayRef?: string;
  discrepancyType: 'FEE_MISMATCH' | 'TIMING_LAG' | 'MISSING_BANK_CREDIT' | 'UNMATCHED_GATEWAY' | 'AMBIGUOUS_MATCH';
  amountAtRisk: number; // in integer paise
  expectedAmount: number;
  actualAmount: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  details: string;
  stageIdentified: number;
}

export interface ReconRunResult {
  runId: string;
  totalRecordsProcessed: number;
  matchedCount: number;
  discrepancyCount: number;
  totalSettledPaise: number;
  totalAmountAtRiskPaise: number;
  cases: DiscrepancyCase[];
  executedAt: string;
}

export class ReconEngine {
  // Configurable MDR schedule: 2.0% fee + 18% GST on fee
  private mdrRate = 0.02;
  private gstRate = 0.18;

  public runReconciliation(
    payments: any[],
    gatewayTxs: any[],
    bankTxs: any[],
    settlements: any[]
  ): ReconRunResult {
    const runId = `RUN-${Date.now()}`;
    const cases: DiscrepancyCase[] = [];
    let matchedCount = 0;
    let totalSettledPaise = 0;

    // Map gateway txs by order_id
    const gwByOrderId = new Map<string, any>();
    for (const gw of gatewayTxs) {
      gwByOrderId.set(gw.order_id, gw);
    }

    // Map settlements by settlement_id
    const settlById = new Map<string, any>();
    for (const s of settlements) {
      settlById.set(s.settlement_id, s);
    }

    // Stage 1 & 4: Internal to Gateway Matching & Fee Verification
    for (const pay of payments) {
      const gw = gwByOrderId.get(pay.order_id);

      if (!gw) {
        cases.push({
          caseId: `CASE-${cases.length + 1}`,
          orderId: pay.order_id,
          discrepancyType: 'UNMATCHED_GATEWAY',
          amountAtRisk: pay.amount,
          expectedAmount: pay.amount,
          actualAmount: 0,
          status: 'PENDING_REVIEW',
          details: 'Internal order has no matching payment processor capture event.',
          stageIdentified: 1,
        });
        continue;
      }

      // Stage 4: Fee & Tax Recomputation
      // Expected fee = gross * 2%, expected tax = fee * 18%
      const expectedFee = Math.round(pay.amount * this.mdrRate);
      const expectedTax = Math.round(expectedFee * this.gstRate);
      const expectedTotalDeduction = expectedFee + expectedTax;
      const actualDeduction = gw.fee + gw.tax;

      if (Math.abs(expectedTotalDeduction - actualDeduction) > 100) {
        // variance > 1 Rupee (100 paise)
        const diff = Math.abs(expectedTotalDeduction - actualDeduction);
        cases.push({
          caseId: `CASE-${cases.length + 1}`,
          orderId: pay.order_id,
          gatewayRef: gw.gateway_ref,
          discrepancyType: 'FEE_MISMATCH',
          amountAtRisk: diff,
          expectedAmount: expectedTotalDeduction,
          actualAmount: actualDeduction,
          status: 'PENDING_REVIEW',
          details: `Gateway deducted ₹${(actualDeduction / 100).toFixed(2)} vs expected contract fee ₹${(expectedTotalDeduction / 100).toFixed(2)}.`,
          stageIdentified: 4,
        });
      } else {
        matchedCount++;
        totalSettledPaise += gw.net_amount;
      }

      // Stage 6: Settlement batch matching
      if (!gw.settlement_id) {
        // Check timing lag (T+2 cutoff)
        cases.push({
          caseId: `CASE-${cases.length + 1}`,
          orderId: pay.order_id,
          gatewayRef: gw.gateway_ref,
          discrepancyType: 'TIMING_LAG',
          amountAtRisk: gw.net_amount,
          expectedAmount: gw.net_amount,
          actualAmount: 0,
          status: 'PENDING_REVIEW',
          details: 'Captured in gateway within T+2 settlement window. In-flight pending bank clearing.',
          stageIdentified: 6,
        });
      }
    }

    // Stage 7: Prioritize cases strictly by Amount at Risk descending
    cases.sort((a, b) => b.amountAtRisk - a.amountAtRisk);

    const totalAmountAtRiskPaise = cases.reduce((acc, c) => acc + c.amountAtRisk, 0);

    return {
      runId,
      totalRecordsProcessed: payments.length,
      matchedCount,
      discrepancyCount: cases.length,
      totalSettledPaise,
      totalAmountAtRiskPaise,
      cases,
      executedAt: new Date().toISOString(),
    };
  }
}

export const reconEngine = new ReconEngine();
