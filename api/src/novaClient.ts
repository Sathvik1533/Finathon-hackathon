import { config } from './config';
import { demoBankTransactions, demoGatewayTransactions, demoPayments, demoSettlements } from './fixtures/novaDemo';

export interface NovaPayment {
  payment_id: string;
  order_id: string;
  amount: number; // paise in the local FIN-11 demonstration fixture
  currency: string;
  status: string;
  customer_id: string;
  created_at: string;
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
  stage?: number;
}

export interface NovaBankTransaction {
  utr_number: string;
  amount: number;
  credit_debit: 'CR' | 'DR';
  narration: string;
  value_date: string;
  settlement_ref?: string | null;
}

export interface NovaSettlement {
  settlement_id: string;
  utr_number: string;
  gross_amount: number;
  fee_deductions: number;
  net_payout: number;
  transaction_count: number;
  settled_at: string;
}

export type DataMode = 'simulated' | 'unconfigured';

/**
 * Live Nova ingestion is not implemented in this repository. The only
 * available records are deliberately opt-in local/test fixtures.
 */
export class NovaClient {
  private readonly demoMode = config.novaMode === 'demo' && process.env.NODE_ENV !== 'production';

  public getStatus(): {
    configured: boolean;
    mode: 'demo' | 'unconfigured';
    dataMode: DataMode;
    source: string;
    liveIngestionAvailable: false;
  } {
    return {
      configured: Boolean(config.novaApiKey && config.novaBaseUrl),
      mode: this.demoMode ? 'demo' : 'unconfigured',
      dataMode: this.demoMode ? 'simulated' : 'unconfigured',
      source: this.demoMode
        ? 'Local FIN-11 demonstration fixtures'
        : config.novaMode === 'nova'
          ? 'Live Nova adapter is not implemented; no source records loaded'
          : 'No live source is configured; no source records loaded',
      liveIngestionAvailable: false,
    };
  }

  public async fetchPayments(): Promise<NovaPayment[]> {
    return this.demoMode ? demoPayments : [];
  }

  public async fetchGatewayTransactions(): Promise<NovaGatewayTransaction[]> {
    return this.demoMode ? demoGatewayTransactions : [];
  }

  public async fetchBankTransactions(): Promise<NovaBankTransaction[]> {
    return this.demoMode ? demoBankTransactions : [];
  }

  public async fetchSettlements(): Promise<NovaSettlement[]> {
    return this.demoMode ? demoSettlements : [];
  }
}

export const novaClient = new NovaClient();
