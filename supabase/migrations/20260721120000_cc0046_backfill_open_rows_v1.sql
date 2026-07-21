-- cc-0046 — Orthogonal Gap Classification & Routing Precision — ARTIFACT 3 (backfill, DML)
-- =============================================================================================
-- ⛔ DESIGN — NOT APPLIED. T3 PK apply gate (gate #3 of 3). Depends on Artifacts 1 + 2 (applied).
-- Brief: docs/briefs/cc-0046-orthogonal-gap-classification-brief.md (rev-3, Gate-1 APPROVED d1ca6de)
--
-- WHAT (Gate-1 #7 corrected): re-diagnose ONLY status='open' rows from CURRENT evidence and write the
--   six new orthogonal columns. RESOLVED / DISMISSED / any non-open (historical) row is left NULL —
--   a current re-probe is NOT their contemporaneous diagnosis. No precise class is written on
--   insufficient evidence: analyze_asset_gap itself returns evidence_confidence='insufficient' +
--   failure_state='unresolved' in those cases, which is exactly what is recorded (honest, not precise).
--
-- SAFETY: reads only via the STABLE analyze_asset_gap (which reads select_template/derive/resolve/probe);
--   writes ONLY the 6 additive columns on OPEN rows; legacy columns untouched; triggers no sourcing.
--   The gap_absent_static_bg_requires_conclusive CHECK (Artifact 1) is honoured by construction —
--   analyze emits evidence_confidence='conclusive' whenever it emits (static_background, absent).
-- Rollback: _harness/cc0046_backfill/rollback.sql (NULL the 6 columns where classifier_version='cc0046-backfill-v1').
-- NOTE: applied via execute_sql at the T3 gate; recorded via this filename's fixed identity.
-- =============================================================================================
begin;

with diag as (
  select s.id,
         g->>'subject_kind'        as subject_kind,
         g->>'failure_state'       as failure_state,
         g->'diagnostic_evidence'  as diagnostic_evidence,
         g->>'evidence_confidence' as evidence_confidence
  from m.asset_gap_suggestion s
  join c.client cl on cl.client_id = s.client_id
  cross join lateral public.analyze_asset_gap(
               cl.client_slug, s.platform, s.format,
               coalesce(s.latest_source_post_id::text, s.appetite_signature)) g
  where s.status = 'open'
)
update m.asset_gap_suggestion s
   set subject_kind        = d.subject_kind,
       failure_state       = d.failure_state,
       classifier_version  = 'cc0046-backfill-v1',
       diagnostic_evidence = d.diagnostic_evidence,
       diagnosed_at        = now(),
       evidence_confidence = d.evidence_confidence
  from diag d
 where s.id = d.id
   and s.status = 'open';   -- concurrency guard: never touch a row that moved off 'open'

commit;

-- Post-apply verification (run read-only after commit; NOT part of the transaction):
--   select subject_kind, failure_state,
--          public.asset_gap_route(subject_kind, failure_state) as route,
--          evidence_confidence, count(*)
--   from m.asset_gap_suggestion where status='open' group by 1,2,3,4 order by 1,2;
--   -- expect the 3 carousel rows → (assignment, unassigned)/config_repair; PP YouTube → (platform_config,
--   -- misconfigured)/config_repair; ZERO rows with route='governed_sourcing' unless a genuine absence exists.
