/**
 * LedgerSense API client.
 * All requests go through /api/* (same-origin proxy in Express).
 * The browser never calls Nova, FastAPI, or the DB directly.
 */

const BASE = "/api";

// ─── Error type ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fin11",
      ...(init.headers as Record<string, string>),
    },
    ...init,
  });

  if (res.status === 401) {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.replace(`/login?next=${next}`);
    throw new ApiError(401, "unauthorized", "", "Session expired");
  }

  const requestId = res.headers.get("X-Request-Id") ?? "";

  if (!res.ok) {
    let code = "unknown_error";
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, requestId, message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)              => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string)              => request<T>(path, { method: "DELETE" }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchSource = "nova" | "simulated" | "upload";

export interface User {
  id: string;
  email: string;
  role: "reviewer" | "admin";
  merchantId: string;
  merchantName: string;
}

export interface AppConfig {
  version: number;
  exceptionCategories: Array<{ key: string; label: string; severity: string; weight: number }>;
  stages: Array<{ key: string; label: string; enabled: boolean; order: number }>;
  feeBps: number;
  gstBps: number;
  timingLagDays: number;
  confidenceThreshold: number;
  nova: { maxRejectPct: number; rateLimitPerMin: number; asOfOverride: string | null };
  lab: { tolPass: number; tolWarn: number; ksPass: number; ksWarn: number; maxIterations: number };
}

export interface NovaStatus {
  reachable: boolean;
  teamSlot: string;
  datasetSlice: string;
  rateLimitPerMin: number;
  keyPrefix: string; // exactly 16 chars
}

export interface NovaImport {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  startedAt: string;
  completedAt?: string;
  asOf?: string;
  asOfDerived: boolean;
  batchId?: string;
  requestCount: number;
  rejectCount: number;
  resourceCounts: Record<string, number>;
  error?: string;
}

export interface Batch {
  id: string;
  source: BatchSource;
  createdAt: string;
  size: number;
  latestRunStatus?: "queued" | "running" | "done" | "failed";
  latestRunId?: string;
  params?: Record<string, unknown>;
}

export interface Run {
  id: string;
  batchId: string;
  batchSource: BatchSource;
  status: "queued" | "running" | "done" | "failed";
  createdAt: string;
  completedAt?: string;
  asOf?: string;
  recordsProcessed: number;
  matchesFound: number;
  exceptionsFound: number;
  configSnapshot?: AppConfig;
}

export interface Metrics {
  runId: string;
  matchRate: number;
  settledAmountPaise: string;
  exceptionCount: number;
  amountAtRiskPaise: string;
  exceptionsByCategory: Array<{ category: string; count: number; amountAtRiskPaise: string }>;
  settlementLagDays: Array<{ day: number; count: number }>;
  benchmark: null | {
    matchRate: number;
    precision: number;
    recall: number;
    falseApprovals: number;
    categoryAccuracy: number;
  };
}

export interface Transaction {
  id: string;
  source: "internal" | "gateway" | "bank" | "refund";
  status: string;
  amountPaise: string;
  date: string;
  orderId?: string;
  gatewayRef?: string;
  bankRef?: string;
  novaId?: string;
  linkedIds?: string[];
}

export interface Settlement {
  id: string;
  bankRef: string;
  valueDate: string;
  creditPaise: string;
  expectedNetPaise: string;
  differencePaise: string;
  status: "matched" | "discrepancy" | "pending";
  novaNetPaise?: string;
  payments: Array<{
    id: string;
    grossPaise: string;
    feePaise: string;
    gstPaise: string;
    refundsPaise: string;
    netPaise: string;
  }>;
}

export interface ExceptionItem {
  id: string;
  caseId: string;
  category: string;
  severity: string;
  amountAtRiskPaise: string;
  status: "open" | "approved" | "rejected" | "escalated";
  runId: string;
  createdAt: string;
}

export interface CaseTimeline {
  id: string;
  source: "internal" | "gateway" | "bank" | "refund";
  type: string;
  date: string;
  amountPaise: string;
  status: string;
  novaId?: string;
  metadata?: Record<string, string>;
}

export interface Case {
  id: string;
  exceptionId: string;
  category: string;
  severity: string;
  amountAtRiskPaise: string;
  status: string;
  version: number;
  timeline: CaseTimeline[];
  feeBreakdown: {
    expectedFeePaise: string;
    actualFeePaise: string;
    differencePaise: string;
    expectedGstPaise: string;
    actualGstPaise: string;
  };
  deterministicExplanation: string;
  aiSuggestion?: string;
  aiUnavailable?: boolean;
  runId: string;
  batchSource: BatchSource;
}

export interface Refund {
  id: string;
  kind: "refund" | "chargeback" | "chargeback_reversal";
  originalPaymentId: string;
  amountPaise: string;
  status: string;
  date: string;
  settlementStatus: string;
  caseId?: string;
  novaId?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  caseId?: string;
  userId: string;
  userEmail: string;
  decision?: string;
  note?: string;
  aiSuggestionShown?: string;
  createdAt: string;
}

export interface LabProfile {
  id: string;
  batchId: string;
  batchSource: BatchSource;
  kind: "real" | "synthetic";
  createdAt: string;
  metrics: Record<string, number | number[]>;
}

export interface LabComparison {
  id: string;
  realProfileId: string;
  syntheticProfileId: string;
  createdAt: string;
  iterationCount: number;
  rows: Array<{
    metricKey: string;
    realValue: number | number[];
    syntheticValue: number | number[];
    error: number;
    verdict: "PASS" | "WARN" | "FAIL";
    paramHint?: string;
  }>;
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  version: number;
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  role: "reviewer" | "admin";
  createdAt: string;
}

// ─── API modules ──────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                              => api.get<User>("/auth/me"),
  login:  (email: string, password: string) => api.post<{ user: User }>("/auth/login", { email, password }),
  logout: ()                              => api.post<void>("/auth/logout", {}),
};

export const configApi = {
  get:     ()                         => api.get<AppConfig>("/config"),
  update:  (data: Partial<AppConfig>) => api.post<AppConfig>("/config", data),
  history: ()                         => api.get<Array<{ version: number; createdAt: string; diff: object }>>("/config/history"),
};

export const novaApi = {
  status:     ()                    => api.get<NovaStatus>("/nova/status"),
  startImport: (asOfOverride?: string) => api.post<{ importId: string }>("/nova/import", { asOfOverride }),
  imports:    ()                    => api.get<NovaImport[]>("/nova/imports"),
  importById: (id: string)          => api.get<NovaImport>(`/nova/imports/${id}`),
};

export const batchApi = {
  list: () => api.get<Batch[]>("/batches"),
  simulate: (params: {
    size: number; seed: number; feePct: number; gstPct: number;
    lagDays: number; exceptionRates: Record<string, number>; profileId?: string;
  }) => api.post<{ batchId: string; runId: string }>("/batches/simulate", params),
  presign: (fileName: string, fileType: string) =>
    api.post<{ url: string; fields: Record<string, string>; batchId: string }>("/uploads/presign", { fileName, fileType }),
};

export const runApi = {
  list: () => api.get<Run[]>("/runs"),
  get:  (id: string) => api.get<Run>(`/runs/${id}`),
};

export const metricsApi = {
  get: (runId: string) => api.get<Metrics>(`/metrics/${runId}`),
};

export const transactionApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: Transaction[]; total: number }>(`/transactions${qs}`);
  },
  get: (id: string) => api.get<Transaction>(`/transactions/${id}`),
};

export const settlementApi = {
  list: ()          => api.get<Settlement[]>("/settlements"),
  get:  (id: string) => api.get<Settlement>(`/settlements/${id}`),
};

export const exceptionApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: ExceptionItem[]; total: number }>(`/exceptions${qs}`);
  },
};

export const caseApi = {
  get:        (id: string)                    => api.get<Case>(`/cases/${id}`),
  decide:     (id: string, decision: string, note: string, version: number) =>
    api.post<void>(`/cases/${id}/decision`, { decision, note, version }),
  explain:    (id: string)                    => api.post<{ suggestion: string }>("/ai/explain", { caseId: id }),
  policyChat: (caseId: string, message: string) =>
    api.post<{ reply: string; policyIds: string[] }>("/ai/policy-chat", { caseId, message }),
};

export const refundApi = {
  list: () => api.get<Refund[]>("/refunds"),
};

export const auditApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: AuditEntry[]; total: number }>(`/audit${qs}`);
  },
};

export const reportApi = {
  download: (runId: string, format: "json" | "csv") =>
    fetch(`${BASE}/reports/${runId}?format=${format}`, {
      credentials: "include",
      headers: { "X-Requested-With": "fin11" },
    }),
};

export const labApi = {
  profiles:       ()                                          => api.get<LabProfile[]>("/lab/profiles"),
  computeProfile: (batchId: string)                          => api.post<LabProfile>("/lab/profiles", { batchId }),
  calibrate:      (realProfileId: string)                    => api.post<{ profileId: string; params: object }>("/lab/calibrate", { realProfileId }),
  compare:        (realProfileId: string, synProfileId: string) =>
    api.post<LabComparison>("/lab/compare", { realProfileId, syntheticProfileId: synProfileId }),
  comparisons:    ()                                          => api.get<LabComparison[]>("/lab/comparisons"),
  labNarrative:   (comparisonId: string)                     => api.post<{ narrative: string }>("/ai/lab-narrative", { comparisonId }),
};

export const policyApi = {
  list:    ()                                                    => api.get<Policy[]>("/policies"),
  get:     (id: string)                                          => api.get<Policy>(`/policies/${id}`),
  save:    (id: string | null, data: { title: string; content: string }) =>
    id ? api.put<Policy>(`/policies/${id}`, data) : api.post<Policy>("/policies", data),
  reindex: ()                                                    => api.post<void>("/policies/reindex", {}),
};

export const userApi = {
  list:   ()                                                          => api.get<AppUser[]>("/users"),
  create: (data: { email: string; role: "reviewer" | "admin" })       =>
    api.post<{ user: AppUser; tempPassword: string }>("/users", data),
};
