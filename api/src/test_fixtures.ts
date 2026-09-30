import { novaClient } from './novaClient';

export const TEST_FIXTURE_DATA = {
  payments: [
    { payment_id: 'pay_001', order_id: 'ORD-101', amount: 100000, currency: 'INR', status: 'PAID', customer_id: 'cust_1', created_at: '2026-09-28T10:00:00Z' },
    { payment_id: 'pay_002', order_id: 'ORD-102', amount: 250000, currency: 'INR', status: 'PAID', customer_id: 'cust_2', created_at: '2026-09-28T10:15:00Z' },
    { payment_id: 'pay_003', order_id: 'ORD-103', amount: 150000, currency: 'INR', status: 'PAID', customer_id: 'cust_3', created_at: '2026-09-28T11:00:00Z' },
    { payment_id: 'pay_004', order_id: 'ORD-104', amount: 80000, currency: 'INR', status: 'PAID', customer_id: 'cust_4', created_at: '2026-09-28T12:00:00Z' },
  ],
  gatewayTransactions: [
    { gateway_ref: 'gw_tx_001', order_id: 'ORD-101', amount: 100000, fee: 2000, tax: 360, net_amount: 97640, status: 'CAPTURED', authorized_at: '2026-09-28T10:01:00Z', settlement_id: 'SETTLE-901' },
    { gateway_ref: 'gw_tx_002', order_id: 'ORD-102', amount: 250000, fee: 5000, tax: 900, net_amount: 244100, status: 'CAPTURED', authorized_at: '2026-09-28T10:16:00Z', settlement_id: 'SETTLE-901' },
    { gateway_ref: 'gw_tx_003', order_id: 'ORD-103', amount: 150000, fee: 4000, tax: 720, net_amount: 145280, status: 'CAPTURED', authorized_at: '2026-09-28T11:02:00Z', settlement_id: 'SETTLE-901' },
    { gateway_ref: 'gw_tx_004', order_id: 'ORD-104', amount: 80000, fee: 1600, tax: 288, net_amount: 78112, status: 'CAPTURED', authorized_at: '2026-09-30T09:00:00Z' },
  ],
  bankTransactions: [
    { utr_number: 'UTR-HDFC-99182', amount: 487020, credit_debit: 'CR' as const, narration: 'CMS/NACH/SETTL/SETTLE-901/HDFC0001', value_date: '2026-09-30' },
  ],
  settlements: [
    { settlement_id: 'SETTLE-901', utr_number: 'UTR-HDFC-99182', gross_amount: 500000, fee_deductions: 12980, net_payout: 487020, transaction_count: 3, settled_at: '2026-09-30T04:00:00Z' },
  ],
};

export function setupTestFixtures() {
  novaClient.setFixtureData(TEST_FIXTURE_DATA);
}
