-- cc-0046 hermetic proof — PURE functions (asset_gap_route, asset_gap_automation, diagnose_gap).
-- Loaded AFTER the 3 pure fns are extracted from Artifact 1 into this DB. No schema dependency.
-- rev-2 (post-CONCERNS): probe fixtures now carry vertical_basis_conclusive; adds the vertical-basis
-- guard fixture (VB1) + platform near-match (G4). The vertical-alignment clause is enforced by the
-- probe + diagnose_gap guard, proven end-to-end in test_probe_seeded.sql and here via VB1/G5.
\set ON_ERROR_STOP on
\pset pager off

create temp table fx(label text, st jsonb, derive jsonb, probe jsonb, slot text,
                     e_subj text, e_state text, e_conf text, e_route text, e_auto text);

insert into fx values
('F1_carousel_no_assignment',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"no_assignment"},{"reason_code":"no_assignment"},{"reason_code":"no_assignment"}]}',
 '{"status":"ambiguous"}', null, 'static_background',
 'assignment','unassigned','conclusive','config_repair','operator_manual'),
('F4_ppyoutube_platform',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"platform_unsuitable","detail":"no_suitability_row_for_platform"}]}',
 '{"status":"ok"}', null, 'static_background',
 'platform_config','misconfigured','conclusive','config_repair','operator_manual'),
('F5_happy_ok', '{"status":"ok"}', '{"status":"ok"}', null, 'static_background',
 'none','none','conclusive', null, null),
-- G-series: asset layer; ALL carry vertical_basis_conclusive:true (a candidate template was known)
('G1_bg_unapproved',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":true,"coverage_conclusive":true,"n_inventory_total":1,"n_near_match":0,"n_existing_ungoverned":1,"dominant_ungoverned_state":"unapproved"}',
 'static_background', 'static_background','unapproved','conclusive','operator_approval','operator_manual'),
('G2_bg_unproven',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":true,"coverage_conclusive":true,"n_inventory_total":1,"n_near_match":0,"n_existing_ungoverned":1,"dominant_ungoverned_state":"unproven"}',
 'static_background', 'static_background','unproven','conclusive','operator_approval','operator_manual'),
('G3_bg_blocked',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":true,"coverage_conclusive":true,"n_inventory_total":1,"n_near_match":0,"n_existing_ungoverned":1,"dominant_ungoverned_state":"blocked"}',
 'static_background', 'static_background','blocked','conclusive','manual_triage','no_automation'),
('G4_bg_near_match_platform',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":true,"coverage_conclusive":true,"n_inventory_total":1,"n_near_match":1,"n_existing_ungoverned":0,"near_match_breakdown":[{"reason":"platform_excluded"}]}',
 'static_background', 'static_background','misconfigured','conclusive','config_repair','operator_manual'),
('G5_bg_absent',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":true,"coverage_conclusive":true,"n_inventory_total":0,"n_near_match":0,"n_existing_ungoverned":0}',
 'static_background', 'static_background','absent','conclusive','governed_sourcing','governed_auto_sourcing'),
-- VB1: vertical basis NOT established ⇒ NEVER absent (PK Concern-1/#5): classify (none, unresolved)
('VB1_vertical_basis_missing',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}',
 '{"vertical_basis_conclusive":false,"coverage_conclusive":false,"n_inventory_total":0}',
 'static_background', 'none','unresolved','insufficient','manual_triage','no_automation'),
-- C1: store-readability coverage inconclusive (basis fine) ⇒ (static_background, unresolved)
('C1_coverage_inconclusive',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ok"}', '{"vertical_basis_conclusive":true,"coverage_conclusive":false}',
 'static_background', 'static_background','unresolved','insufficient','manual_triage','no_automation'),
('L1_logo_indistinct',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:missing_required_logo"}]}',
 '{"status":"ok"}',
 '{"coverage_conclusive":true,"n_inventory_total":1,"n_near_match":0,"n_existing_ungoverned":0}',
 'logo', 'logo','unresolved','insufficient','manual_triage','no_automation'),
('S1_status_below_smoke',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"status_below_smoke"}]}',
 '{"status":"ok"}', null, 'static_background',
 'template','unproven','conclusive','operator_approval','operator_manual'),
('W1_wrong_scope_clean',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"wrong_scope"}]}',
 '{"status":"ok"}', null, 'static_background',
 'template','misconfigured','conclusive','config_repair','operator_manual'),
('T1_tie_divergent',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"no_assignment"},{"reason_code":"assignment_not_approved"}]}',
 '{"status":"ok"}', null, 'static_background',
 'none','unresolved','insufficient','manual_triage','no_automation'),
('A1_appetite_ambiguous_asset',
 '{"status":"fail_closed","fail_reason":"no_selectable_template","rejected":[{"reason_code":"assets_fail_closed:no_governed_background"}]}',
 '{"status":"ambiguous"}', null, 'static_background',
 'appetite','ambiguous','conclusive','manual_triage','no_automation'),
('U_format_unmapped',
 '{"status":"fail_closed","fail_reason":"format_unmapped","rejected":[]}',
 '{"status":"ok"}', null, 'static_background',
 'template','unsupported','conclusive','capability_backlog','backlog'),
('U_client_not_found',
 '{"status":"fail_closed","fail_reason":"client_not_found","rejected":[]}',
 '{"status":"ok"}', null, 'static_background',
 'none','unresolved','insufficient','manual_triage','no_automation');

create temp view res as
select f.label,
  d->>'subject_kind'        as a_subj,
  d->>'failure_state'       as a_state,
  d->>'evidence_confidence' as a_conf,
  public.asset_gap_route(d->>'subject_kind', d->>'failure_state')      as a_route,
  public.asset_gap_automation(d->>'subject_kind', d->>'failure_state') as a_auto,
  f.e_subj, f.e_state, f.e_conf, f.e_route, f.e_auto
from fx f, lateral public.diagnose_gap(f.st, f.derive, f.probe, f.slot) d;

\echo '=== FIXTURE RESULTS ==='
select label,
  a_subj||'/'||a_state||'/'||a_conf||' -> '||coalesce(a_route,'∅')||'/'||coalesce(a_auto,'∅') as got,
  case when a_subj is not distinct from e_subj and a_state is not distinct from e_state
        and a_conf is not distinct from e_conf and a_route is not distinct from e_route
        and a_auto is not distinct from e_auto then 'PASS' else 'FAIL' end as verdict
from res order by label;

\echo '=== SUMMARY ==='
select count(*) filter (where a_subj is not distinct from e_subj and a_state is not distinct from e_state
        and a_conf is not distinct from e_conf and a_route is not distinct from e_route
        and a_auto is not distinct from e_auto) as passed,
       count(*) as total,
       count(*) filter (where not (a_subj is not distinct from e_subj and a_state is not distinct from e_state
        and a_conf is not distinct from e_conf and a_route is not distinct from e_route
        and a_auto is not distinct from e_auto)) as failed
from res;

\echo '=== SOLE-SOURCING INVARIANT (exactly 1 pair: static_background/absent) ==='
with pairs as (
  select s as subject, st as state
  from unnest(array['static_background','logo','image','video_broll','template','assignment','platform_config','appetite','none']) s
  cross join unnest(array['absent','unassigned','unapproved','unproven','blocked','misconfigured','negative','unsupported','ambiguous','unresolved','none']) st
)
select subject, state, public.asset_gap_route(subject,state) route, public.asset_gap_automation(subject,state) auto
from pairs
where public.asset_gap_route(subject,state) = 'governed_sourcing'
   or public.asset_gap_automation(subject,state) = 'governed_auto_sourcing';

\echo '=== CONSTRAINT PROOF (sole-sourcing CHECK) ==='
create temp table cc0046_ck(
  subject_kind text, failure_state text, evidence_confidence text,
  constraint gap_absent_static_bg_requires_conclusive
    check ( subject_kind is distinct from 'static_background'
         or failure_state is distinct from 'absent'
         or evidence_confidence is not distinct from 'conclusive' ));
do $$ begin
  insert into cc0046_ck values ('static_background','absent','insufficient');
  raise exception 'CONSTRAINT_FAIL: forged absent+insufficient accepted';
exception when check_violation then raise notice 'CONSTRAINT OK: forged absent+insufficient rejected';
end $$;
do $$ begin
  insert into cc0046_ck values ('static_background','absent',null);
  raise exception 'CONSTRAINT_FAIL: forged absent+NULL accepted';
exception when check_violation then raise notice 'CONSTRAINT OK: forged absent+NULL rejected';
end $$;
insert into cc0046_ck values ('static_background','absent','conclusive');
insert into cc0046_ck values ('static_background','misconfigured','insufficient');
select 'CONSTRAINT rows accepted: '||count(*)::text as ok from cc0046_ck;
