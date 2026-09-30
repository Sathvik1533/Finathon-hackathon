-- Up Migration
CREATE OR REPLACE VIEW v_run_exception_summary AS
SELECT run_id, merchant_id, category, severity, count(*) AS exception_count,
       sum(amount_at_risk_paise) AS amount_at_risk_paise
FROM exceptions
GROUP BY run_id, merchant_id, category, severity;

CREATE OR REPLACE VIEW v_run_benchmark AS
SELECT o.run_id, o.merchant_id, count(*) AS total,
  count(*) FILTER (WHERE o.predicted_status='SETTLED') AS predicted_settled,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='SETTLED') AS truth_settled,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'='SETTLED') AS true_positive,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'<>'SETTLED') AS false_approvals,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION'
                   AND o.predicted_category = t.ground_truth->>'expected_category') AS category_correct,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION') AS truth_exceptions,
  count(*) FILTER (WHERE t.ground_truth IS NOT NULL) AS labelled_rows
FROM run_outcomes o
JOIN internal_txns t ON t.id = o.internal_txn_id
GROUP BY o.run_id, o.merchant_id;

-- Down Migration
DROP VIEW IF EXISTS v_run_benchmark, v_run_exception_summary CASCADE;
