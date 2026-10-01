import { config } from './config';

export interface NovaPayment {
  payment_id: string;
  order_id: string;
  amount: number; // in INR paise
  currency: string;
  status: string;
  customer_id: string;
  created_at: string;
  [key: string]: any;
}

export interface NovaGatewayTransaction {
  gateway_ref: string;
  order_id: string;
  amount: number;
  fee: number;
  tax: number;
  net_amount: number;
  status: string;
  authorized_at: string;
  settlement_id?: string;
  [key: string]: any;
}

export interface NovaBankTransaction {
  utr_number: string;
  amount: number;
  credit_debit: 'CR' | 'DR';
  narration: string;
  value_date: string;
  [key: string]: any;
}

export interface NovaSettlement {
  settlement_id: string;
  utr_number: string;
  gross_amount: number;
  fee_deductions: number;
  net_payout: number;
  transaction_count: number;
  settled_at: string;
  [key: string]: any;
}

export interface NovaStatus {
  configured: boolean;
  reachable: boolean;
  authenticated: boolean;
  teamSlot?: string;
  datasetSlice?: string;
  baseUrl: string;
  mode: 'live_authenticated' | 'reachable_unauthenticated' | 'unconfigured' | 'test_fixture';
  lastChecked?: string;
  lastImport?: {
    timestamp: string;
    recordsCount: number;
    runId?: string;
  } | null;
  error?: string | null;
}

export class NovaClientError extends Error {
  public code: string;
  public status?: number;
  public requestId?: string;

  constructor(message: string, code: string = 'NOVA_CLIENT_ERROR', status?: number, requestId?: string) {
    // Sanitize message: never leak secrets or keys in error messages
    const sanitized = message.replace(/nova_sk_[a-zA-Z0-9_-]+/g, 'nova_sk_REDACTED');
    super(sanitized);
    this.name = 'NovaClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export class NovaClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private fixtureData: {
    payments?: NovaPayment[];
    gatewayTransactions?: NovaGatewayTransaction[];
    bankTransactions?: NovaBankTransaction[];
    settlements?: NovaSettlement[];
  } | null = null;
  private lastStatus: NovaStatus;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    fetchFn?: typeof fetch;
  }) {
    this.apiKey = options?.apiKey ?? config.novaApiKey;
    let url = options?.baseUrl ?? config.novaBaseUrl;
    // Enforce www on aczen.in to prevent 301 redirects that strip Authorization headers
    if (url.includes('aczen.in') && !url.includes('www.aczen.in')) {
      url = url.replace('aczen.in', 'www.aczen.in');
    }
    this.baseUrl = url.replace(/\/$/, '');
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
    this.lastStatus = {
      configured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
      reachable: false,
      authenticated: false,
      baseUrl: this.baseUrl,
      mode: this.apiKey ? 'reachable_unauthenticated' : 'unconfigured',
      lastChecked: undefined,
      lastImport: null,
      error: null,
    };
  }

  public setFixtureData(data: typeof this.fixtureData) {
    if (process.env.NODE_ENV === 'production' && data !== null) {
      throw new Error('Test fixtures are strictly disallowed in NODE_ENV=production');
    }
    this.fixtureData = data;
    if (data) {
      this.lastStatus.mode = 'test_fixture';
      this.lastStatus.configured = true;
      this.lastStatus.authenticated = true;
      this.lastStatus.reachable = true;
    } else {
      this.lastStatus.mode = this.apiKey ? 'reachable_unauthenticated' : 'unconfigured';
      this.lastStatus.configured = Boolean(this.apiKey && this.apiKey.trim().length > 0);
      this.lastStatus.authenticated = false;
      this.lastStatus.reachable = false;
    }
  }


  public getStatus(): NovaStatus {
    return {
      ...this.lastStatus,
      configured: Boolean(this.apiKey && this.apiKey.trim().length > 0) || this.lastStatus.mode === 'test_fixture',
    };
  }

  public setLastImport(importInfo: { timestamp: string; recordsCount: number; runId?: string }) {
    this.lastStatus.lastImport = importInfo;
  }

  // Preflight 1: Check public endpoint reachability (no key required)
  public async checkReachability(timeoutMs: number = 4000): Promise<{ reachable: boolean; status?: string; error?: string }> {
    if (this.fixtureData) {
      this.lastStatus.reachable = true;
      return { reachable: true, status: 'ok' };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await this.fetchFn(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const isReachable = res.ok;
      this.lastStatus.reachable = isReachable;
      this.lastStatus.lastChecked = new Date().toISOString();
      return { reachable: isReachable, status: isReachable ? 'ok' : `HTTP_${res.status}` };
    } catch (err: any) {
      clearTimeout(timeout);
      this.lastStatus.reachable = false;
      this.lastStatus.error = err.name === 'AbortError' ? 'Reachability check timed out' : 'Host unreachable';
      return { reachable: false, error: this.lastStatus.error ?? undefined };
    }
  }

  // Preflight 2: Check authentication against /me
  public async checkAuthentication(timeoutMs: number = 5000): Promise<{ authenticated: boolean; teamSlot?: string; datasetSlice?: string; error?: string }> {
    if (this.fixtureData) {
      this.lastStatus.authenticated = true;
      this.lastStatus.teamSlot = 'fixture_test_slot';
      this.lastStatus.datasetSlice = 'synthetic_test_slice';
      return { authenticated: true, teamSlot: 'fixture_test_slot', datasetSlice: 'synthetic_test_slice' };
    }
    if (!this.apiKey) {
      this.lastStatus.authenticated = false;
      this.lastStatus.mode = 'unconfigured';
      return { authenticated: false, error: 'NOVA_API_KEY is not set.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await this.fetchFn(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const body: any = await res.json();
        this.lastStatus.authenticated = true;
        this.lastStatus.mode = 'live_authenticated';
        this.lastStatus.teamSlot = body.team_slot || body.slot;
        this.lastStatus.datasetSlice = body.dataset_slice || body.slice;
        this.lastStatus.lastChecked = new Date().toISOString();
        return { authenticated: true, teamSlot: this.lastStatus.teamSlot, datasetSlice: this.lastStatus.datasetSlice };
      } else {
        this.lastStatus.authenticated = false;
        this.lastStatus.error = `Authentication rejected with HTTP ${res.status}`;
        return { authenticated: false, error: this.lastStatus.error ?? undefined };
      }
    } catch (err: any) {
      clearTimeout(timeout);
      this.lastStatus.authenticated = false;
      this.lastStatus.error = err.name === 'AbortError' ? 'Auth check timed out' : err.message;
      return { authenticated: false, error: this.lastStatus.error ?? undefined };
    }
  }

  // Generic paginated resource fetcher with exponential backoff on 502/503 and rate limit handling
  private async fetchResource<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    if (this.fixtureData) {
      if (path.includes('payments') && this.fixtureData.payments) return this.fixtureData.payments as unknown as T[];
      if (path.includes('gateway') && this.fixtureData.gatewayTransactions) return this.fixtureData.gatewayTransactions as unknown as T[];
      if (path.includes('bank') && this.fixtureData.bankTransactions) return this.fixtureData.bankTransactions as unknown as T[];
      if (path.includes('settlements') && this.fixtureData.settlements) return this.fixtureData.settlements as unknown as T[];
      return [];
    }

    if (!this.apiKey) {
      throw new NovaClientError(
        'NOVA_API_KEY is not configured on this server. Provider authentication requires a valid key.',
        'CREDENTIAL_REQUIRED',
        401
      );
    }

    const limit = 200;
    let offset = 0;
    let hasMore = true;
    const allRecords: T[] = [];
    const maxSafetyPages = 5; // safety cap for 1000 records
    let pagesFetched = 0;

    while (hasMore && pagesFetched < maxSafetyPages) {
      const queryParams = new URLSearchParams({
        ...params,
        limit: String(limit),
        offset: String(offset),
      });

      const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}?${queryParams.toString()}`;

      let attempts = 0;
      let success = false;
      let lastErr: any = null;

      while (attempts < 3 && !success) {
        attempts++;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await this.fetchFn(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const requestId = res.headers.get('x-request-id') || res.headers.get('request-id') || undefined;

          if (res.status === 429) {
            const retryAfterSec = parseInt(res.headers.get('retry-after') || '2', 10);
            await new Promise(r => setTimeout(r, Math.min(retryAfterSec * 1000, 5000)));
            continue;
          }

          if (res.status >= 502 && res.status <= 504) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(r => setTimeout(r, Math.pow(2, attempts - 1) * 1000));
            continue;
          }

          if (!res.ok) {
            let errorMsg = `Nova request failed with HTTP ${res.status}`;
            try {
              const errBody: any = await res.json();
              if (errBody?.error?.message) errorMsg = errBody.error.message;
              else if (errBody?.message) errorMsg = errBody.message;
            } catch {
              // ignore
            }
            throw new NovaClientError(errorMsg, `HTTP_${res.status}`, res.status, requestId);
          }

          const json: any = await res.json();
          const data: T[] = Array.isArray(json) ? json : (json.data || []);
          allRecords.push(...data);

          if (json.pagination) {
            hasMore = Boolean(json.pagination.has_more);
            offset += limit;
          } else {
            hasMore = false;
          }

          pagesFetched++;
          success = true;
        } catch (err: any) {
          clearTimeout(timeout);
          lastErr = err;
          if (err instanceof NovaClientError && err.status && err.status < 500) {
            // Do not retry 4xx errors
            throw err;
          }
          if (attempts >= 3) {
            throw err instanceof NovaClientError ? err : new NovaClientError(err.message, 'FETCH_FAILED');
          }
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
    }

    return allRecords;
  }

  public async fetchPayments(): Promise<NovaPayment[]> {
    return this.fetchResource<NovaPayment>('/payments');
  }

  public async fetchGatewayTransactions(): Promise<NovaGatewayTransaction[]> {
    return this.fetchResource<NovaGatewayTransaction>('/gateway-transactions', { txn_type: 'capture' });
  }

  public async fetchBankTransactions(): Promise<NovaBankTransaction[]> {
    return this.fetchResource<NovaBankTransaction>('/bank-transactions');
  }

  public async fetchSettlements(): Promise<NovaSettlement[]> {
    return this.fetchResource<NovaSettlement>('/settlements');
  }
}

export const novaClient = new NovaClient();
