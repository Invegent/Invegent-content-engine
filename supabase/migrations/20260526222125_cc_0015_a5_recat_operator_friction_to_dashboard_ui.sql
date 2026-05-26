-- cc-0015 Stage A.5 — recategorise 3 dashboard-UI friction cases
-- from category 'operator_friction' to the new 'dashboard_ui'. Manual, PK-confirmed backfill.
-- PK approval phrase: "Approved: apply cc-0015 Stage A.5 recategorisation — move 53f3e533, 2cf0cd4f, b7369dc9 to dashboard_ui"
-- sql_destructive D-01: review_id bbe9a0fa-b872-4e2a-998f-743aa89036e0 (verdict=agree, risk=low, confidence=high, escalate=false).
-- Guard: bounded to category='operator_friction' AND the 3 explicit case_ids; expected ROW_COUNT=3; idempotent no-op if already moved.
-- Rollback: UPDATE friction.case SET category='operator_friction'
--           WHERE category='dashboard_ui' AND case_id IN (the same 3 ids).
UPDATE friction.case
SET category = 'dashboard_ui'
WHERE category = 'operator_friction'
  AND case_id IN (
    '53f3e533-ea5e-4040-b2a5-a966d18d6474',
    '2cf0cd4f-5907-4dfb-ace2-db8300c661c6',
    'b7369dc9-f0d1-4f70-903c-6a590c21a657'
  );
