-- cc-0046 ROLLBACK for Artifact 3 (backfill). NULL the six additive columns on the rows this
-- backfill wrote (classifier_version='cc0046-backfill-v1'). Legacy columns are never touched here.
-- Reverses 20260721120000_cc0046_backfill_open_rows_v1.sql.
begin;
update m.asset_gap_suggestion
   set subject_kind        = null,
       failure_state       = null,
       classifier_version  = null,
       diagnostic_evidence = null,
       diagnosed_at        = null,
       evidence_confidence = null
 where classifier_version = 'cc0046-backfill-v1';
commit;
