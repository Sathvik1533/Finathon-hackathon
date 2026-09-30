-- Seed script for FIN-11 LedgerSense local development and Supabase bootstrap
-- Demo credentials:
-- Admin: admin@acme.com / Password123!
-- Reviewer: reviewer@acme.com / Password123!
-- Bcrypt hash for 'Password123!' is '$2b$10$95j6u41sJkZ2L1hB7bT0teE8wD.zW3C1lH5G7dF0aB1cE2gH3iJ4k'

-- 1. Demo Merchant
INSERT INTO merchants (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Retail India Pvt Ltd', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Users
INSERT INTO users (id, merchant_id, email, password_hash, role, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'admin@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'admin', true, now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'reviewer@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'reviewer', true, now())
ON CONFLICT (id) DO NOTHING;

-- 3. Default Config v1
INSERT INTO config (merchant_id, version, values, updated_by, change_note, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  1,
  '{
    "stages": [
      {"key":"txn_id_match","enabled":true},
      {"key":"reference_match","enabled":true},
      {"key":"partial_match","enabled":true},
      {"key":"fee_calculation","enabled":true},
      {"key":"refund_handling","enabled":true},
      {"key":"settlement_match","enabled":true},
      {"key":"classification","enabled":true}
    ],
    "tolerance": {"amount_paise":100,"date_window_days":3},
    "fees": {"fee_bps":200,"gst_bps":1800,"rounding":"half_up"},
    "settlement": {"tolerance_paise":100,"lag_days":2},
    "confidence": {"auto_match_min":0.90,"review_min":0.60,"weights":{"amount":0.5,"date":0.2,"reference":0.3}},
    "categories": {
      "FEE_MISMATCH": {"severity":"medium","basis":"difference","weight_bps":10000},
      "MISSING_BANK_CREDIT": {"severity":"high","basis":"net","weight_bps":10000},
      "TIMING_LAG": {"severity":"low","basis":"net","weight_bps":2000},
      "AMOUNT_MISMATCH": {"severity":"high","basis":"difference","weight_bps":10000},
      "PARTIAL_REFUND_NOT_REFLECTED": {"severity":"high","basis":"difference","weight_bps":10000},
      "UNMATCHED_REVERSAL": {"severity":"medium","basis":"net","weight_bps":8000},
      "MISSING_SETTLEMENT": {"severity":"high","basis":"net","weight_bps":10000},
      "DUPLICATE_BANK_CREDIT": {"severity":"high","basis":"net","weight_bps":10000},
      "DUPLICATE_PAYMENT": {"severity":"medium","basis":"gross","weight_bps":10000},
      "AMBIGUOUS_MATCH": {"severity":"low","basis":"gross","weight_bps":5000}
    },
    "nova": {"max_reject_pct":2,"rate_limit_per_min":100,"as_of_override":null},
    "lab": {"tol_pass":0.10,"tol_warn":0.25,"ks_pass":0.10,"ks_warn":0.20,"max_iterations":5,"amount_model":"empirical_quantiles"},
    "razorpay": {"max_reject_pct":2,"rate_limit_per_min":60,"page_size":100,"default_lookback_days":30},
    "reference_metrics": {"fee_bps":200,"settlement_lag_days":2,"refund_rate_bps":150}
  }'::jsonb,
  '00000000-0000-0000-0000-000000000011',
  'Initial configuration baseline for FIN-11 reconciliation engine',
  now()
)
ON CONFLICT (merchant_id, version) DO NOTHING;

-- 4. Global Policies
INSERT INTO policies (id, merchant_id, policy_key, title, body, version, created_by, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    NULL,
    'POL_FEE_TOLERANCE',
    'Payment Gateway Fee Mismatch Policy',
    'Discrepancies in gateway fees exceeding 100 paise (1 INR) must be flagged for audit. If the observed fee rate differs from the standard MDR contract rate (2.00% + 18% GST) by more than 5 basis points, the reviewer may approve only if supported by volume tier discounts agreed in writing; otherwise escalate to finance ops.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    NULL,
    'POL_MISSING_CREDIT',
    'Missing Bank Settlement Credit Policy',
    'When a gateway reports a capture as settled, but no corresponding bank UTR credit arrives within T+2 business days (or configured lag_days), verify whether the as-of snapshot date has elapsed. If elapsed and bank confirmation is absent, escalate to treasury for chargeback and suspense account tracing.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    NULL,
    'POL_TIMING_LAG',
    'In-Flight Settlement and Timing Lag Policy',
    'Payments captured within the settlement window (capture date + lag_days > as_of) are categorized as TIMING_LAG with low severity. No immediate manual escalation is required unless the transaction remains uncredited across consecutive cycle cuts.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000104',
    NULL,
    'POL_DUPLICATE_CREDIT',
    'Duplicate Bank Settlement and Reversal Policy',
    'Any double UTR or surplus credit must not be marked settled. Escalate immediately to the banking operations desk to issue an official recovery notice before the closing ledger cutoff.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    NULL,
    'POL_REFUNDS_NETTING',
    'Refund Netting and Chargeback Reversal Policy',
    'Customer refunds must net against current batch settlement credits. When a refund is recorded internally or by gateway but withheld from settlement payout, categorize as PARTIAL_REFUND_NOT_REFLECTED.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  )
ON CONFLICT DO NOTHING;

-- 5. Prompt Templates
INSERT INTO prompt_templates (id, name, version, template, model, temperature, created_by, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    'explain_case',
    1,
    'You are a senior financial reconciliation analyst for FIN-11 LedgerSense.
Review the following reconciliation discrepancy evidence bundle.
Explain the root cause of the discrepancy in 2-3 objective sentences.
Cite policy ids from the retrieved policies where applicable.
Only cite numbers that appear in the evidence bundle.
Never issue prescriptive approval or rejection commands; instead state what company policy permits or requires.
Evidence Bundle:
{{bundle}}',
    'llama-3.3-70b-versatile',
    0.10,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    'brief',
    1,
    'You are a financial controller preparing an executive summary of a reconciliation batch run.
Summarize the run metrics concisely in 4-6 sentences, highlighting the match rate, primary exception categories, total Amount at Risk, and source provenance.
Do not hallucinate numbers outside the provided payload.
Metrics:
{{metrics}}',
    'llama-3.3-70b-versatile',
    0.10,
    '00000000-0000-0000-0000-000000000011',
    now()
  )
ON CONFLICT (name, version) DO NOTHING;
