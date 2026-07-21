-- cc-0046 ROLLBACK for Artifact 1 (DDL + helpers). Drop in reverse dependency order.
-- Reverses 20260721100000_cc0046_asset_gap_orthogonal_classification_ddl_v1.sql.
begin;
drop index if exists m.asset_gap_suggestion_diag_pair_idx;
drop function if exists public.probe_asset_inventory(text,text,text);
drop function if exists public.diagnose_gap(jsonb,jsonb,jsonb,text);
drop function if exists public.asset_gap_automation(text,text);
drop function if exists public.asset_gap_route(text,text);
alter table m.asset_gap_suggestion
  drop constraint if exists gap_absent_static_bg_requires_conclusive,
  drop column if exists evidence_confidence,
  drop column if exists diagnosed_at,
  drop column if exists diagnostic_evidence,
  drop column if exists classifier_version,
  drop column if exists failure_state,
  drop column if exists subject_kind;
commit;
