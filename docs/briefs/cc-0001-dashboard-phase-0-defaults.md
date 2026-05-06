# Brief cc-0001 — Dashboard Phase 0 defaults confirmation

**Created:** 2026-05-08 Sydney  
**Author:** chat  
**Executor:** PK  
**Status:** issued  
**Result file:** `docs/briefs/results/cc-0001-dashboard-phase-0-defaults.md` (created on completion)

---

## Task

Read the 7 Phase 0 confirmation blockers in the dashboard architecture review and, for each, either confirm the documented default OR specify an override with brief reasoning. The output is 7 captured decisions in the result file. This is the gate (alongside S30 + M5–M8 reconciliation) that unblocks dashboard Phase 0 scheduling — but cc-0001 does NOT schedule Phase 0 work itself.

## Source context

- `docs/dashboard-review-2026-05/11_final_consolidation.md` §11.4 items 3–9 — the 7 confirmation blockers, each with its documented default.
- `docs/dashboard-review-2026-05/06_final_target_design.md` — referenced by §11.4 for primitive design rationale.
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` — referenced by §11.4 for `m.attention_item`, `m.action_event`, `m.brief`, `m.vw_pipeline_state`, `m.vw_agent_status`, scope (jsonb shape), polymorphic source reference.
- `docs/00_action_list.md` v2.46 — Today/Next 5 row 2 maps to these defaults.
- The 7 blockers at a glance (memory shorthand — authoritative version is §11.4): `m.attention_item` as TABLE-not-VIEW, Phase 0 backfill approach, `m.action_event` single-table audit, agent status VIEW v1, `m.brief` schema, scope as jsonb, polymorphic source reference.

## Scope

**In scope:** 7 confirm-or-override decisions captured in the result file. 
**Out of scope:** any other architecture review item, M5–M8 reconciliation, S30 verification, Phase 0 work itself, `00_overview.md` §11.1 reconciliation, dashboard roadmap PHASES update.

## Allowed actions

- Read `11_final_consolidation.md` and the source docs it references.
- Write the result file `docs/briefs/results/cc-0001-dashboard-phase-0-defaults.md` capturing the 7 decisions, using the `_template_result.md` shape.
- Override any default with brief reasoning if PK disagrees with it.
- Commit the result file directly (chat will fill §8 + §9 in a follow-up commit).

## Forbidden actions

- No code changes.
- No deploys.
- No DML or DDL of any kind.
- No cron triggers (manual or otherwise).
- No S30 verification work — deferred to natural cron fire window per `docs/00_sync_state.md` v2.46 hold-state.
- No close-the-loop UPDATEs to `m.chatgpt_review`.
- Do not schedule or start dashboard Phase 0 (M-09-01 / M-09-02 / M-09-03 / S-09-01 / 4 inventory sweeps are NOT in scope of this brief).
- Do not edit `00_overview.md` (separate carry item per `11_final_consolidation.md` §11.1).
- Do not touch `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold).
- Do not modify `m.ef_drift_log` (98 rows preserved per PK v2.43 keep-both decision).

## Success criteria

- Result file `docs/briefs/results/cc-0001-dashboard-phase-0-defaults.md` exists in the repo.
- For each of the 7 blockers, exactly one of: `confirm default` OR `override: {reasoning}`.
- All 7 captured. Not 6, not 8.
- No files outside `docs/briefs/results/` created or modified by the executor.
- Constraints in `Forbidden actions` confirmed in result file §5.

## Stop condition

After the result file is committed, report files changed and stop. Do not start any follow-up work. Chat will verify (§8 + §9) and propose cc-0002 if and when the gate is ready to advance.

---

## Notes

First cycle in the brief-runner-v0 trial. Templates may be unclear or over/under-specified — flag friction in result file §6 (Open issues). That feedback is the primary value of cycle #1, alongside the 7 decisions themselves.

The 7 decisions, once captured, become input to the next brief (cc-0002 or later) which — only after S30 PASS and M5–M8 reconciliation — will schedule the actual Phase 0 work. cc-0001 does NOT schedule that work.
