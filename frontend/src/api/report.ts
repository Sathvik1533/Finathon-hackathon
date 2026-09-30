import { API_BASE, authHeader } from './headers';

export interface ModuleCoverage {
  status: 'IMPLEMENTED' | 'PARTIAL' | 'MISSING';
  stage?: number;
  method?: string;
  recordCount?: number;
  algorithm?: string;
  reportId?: string;
  schedule?: string;
}

export interface ReportData {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  problemStatement: string;
  summary: {
    totalOrdersIngested: number;
    cleanMatchedOrders: number;
    discrepanciesFound: number;
    totalAmountAtRisk: string;
    totalSettled: string;
  };
  moduleCoverage: Record<string, ModuleCoverage>;
  exceptionBreakdown: Array<{ type: string; count: number; totalAmountAtRisk: string }>;
  settlementVerification: {
    status: 'BALANCED' | 'DISCREPANCY_DETECTED';
    gatewayNetTotal: string;
    bankCreditTotal: string;
    variance: string;
  };
  caseDetail: Array<{
    caseId: string;
    orderId: string;
    type: string;
    amountAtRisk: string;
    expected: string;
    actual: string;
    status: string;
    stageIdentified: number;
  }>;
}

export async function getReport(token: string): Promise<ReportData> {
  const res = await fetch(`${API_BASE}/api/report`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to load compliance report: HTTP ${res.status}`);
  }

  return res.json();
}

export async function downloadReportCsv(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/report?format=csv`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to export CSV report: HTTP ${res.status}`);
  }

  return res.text();
}

export function getCsvDownloadUrl(token?: string): string {
  return `${API_BASE}/api/report?format=csv`;
}
