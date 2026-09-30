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
  summary: { totalOrdersIngested: number; cleanMatchedOrders: number; discrepanciesFound: number; totalAmountAtRisk: string; totalSettled: string };
  moduleCoverage: Record<string, ModuleCoverage>;
  exceptionBreakdown: Array<{ type: string; count: number; totalAmountAtRisk: string }>;
  settlementVerification: { status: 'BALANCED' | 'DISCREPANCY_DETECTED'; gatewayNetTotal: string; bankCreditTotal: string; variance: string };
  caseDetail: Array<{ caseId: string; orderId: string; type: string; amountAtRisk: string; expected: string; actual: string; status: string; stageIdentified: number }>;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try { const payload = await response.json(); return new Error(typeof payload?.error === 'string' ? payload.error : fallback); }
  catch { return new Error(`${fallback} (HTTP ${response.status})`); }
}

export async function getReport(token: string): Promise<ReportData> {
  let response: Response;
  try { response = await fetch(`${API_BASE}/api/report`, { headers: authHeader(token) }); }
  catch { throw new Error('Could not reach the report API.'); }
  if (!response.ok) throw await readError(response, 'Could not load the report.');
  return response.json();
}

export async function downloadReportCsv(token: string): Promise<string> {
  let response: Response;
  try { response = await fetch(`${API_BASE}/api/report?format=csv`, { headers: authHeader(token) }); }
  catch { throw new Error('Could not reach the report API. The export was not created.'); }
  if (!response.ok) throw await readError(response, 'Could not export the report.');
  return response.text();
}
