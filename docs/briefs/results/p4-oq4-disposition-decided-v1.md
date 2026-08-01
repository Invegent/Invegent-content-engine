# RESULT — P-4: OQ4 (Track-B queue currency) disposition DECIDED — Option A, Slice A UNBLOCKED

**Date:** 2026-08-01 Sydney · **Lane:** Programme gate P-4 (Ultimate rev-2 §4.4) · **Tier:** T1 (pure decision recording — zero code/DB/deploy/merge change) · **Class:** SAFETY_GATE
**Governing doc:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §4.4
**Decision:** PK, 2026-08-01 — **Option A: supersede**

## The question

Track-B's cc-0079 Slice-2 data-cleanup queue (format-mix table hygiene) carried an unresolved currency ruling — its only record was 7+ days stale with no closure entry — and the S6 Slice A dry-run named this ambiguity a STOP in its own right, independent of S7's absence (`docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md` §4.8/§5).

## The ruling

**PK decided Option A — S7's live guard (`docs/briefs/results/s7-demand-grid-capability-guard-applied-v1.md`, v6.106) supersedes Track-B Slice-2 as the *safety* control.** The mechanical fail-closed predicate now live in `m.build_weekly_demand_grid` (`platform_support ∩ (select_template not fail-closed ∪ {text})`) prevents any stale or ungoverned mix row from ever reaching allocation, regardless of `t.platform_format_mix_default` / `c.client_format_mix_override` table state. Data cleanliness is therefore demoted from a required safety precondition to a named hygiene carry — cleaned in a later T2 lane, not gating anything until then.

Options B (re-verify Track-B against live tables first) and C (hold pending a separate Track-B session) were not selected — both were assessed as adding verification that duplicates what S7 now enforces mechanically at the allocation boundary.

## Effect: both Slice A STOP conditions are now cleared

The S6 Slice A dry-run halted for two **independent, either-sufficient** reasons:
1. S7 absent → **CLEARED** (v6.106, applied and live-proven).
2. OQ4 ambiguous → **CLEARED** (this ruling).

Slice A's original STOP is therefore lifted. **Resumption itself — the §1.1 zero-code capability-enrolment proof on a previously unenrolled brand (NDIS, CFW, or Invegent) via `c.client_control_tower_enrollment`, reaching committed formats through governed data/assets/schedule config with an empty content-engine code diff — is a separate, not-yet-scoped execution lane (WS-1).** This result records the gate clearing only; it does not itself run or scope that resumption.

## What changed as a result (additive annotations, no history rewritten)

- `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md`: §4.3 P-4 row → DECIDED; §4.4 ruling appended; §2.4 items 2/5 updated; §7 Programme Board blockers/state updated; §8 the P-3B-pending risk retired (S7 is live), the Track-B-hygiene risk reworded from "will supersede" to "supersedes (decided)".
- `docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md`: additive note appended at §4.8/§5 recording that both STOP reasons are now cleared, without altering the original dry-run finding (which was correct at the time it was written).

## Not done here

Scoping or executing the Slice A resumption run itself; cleaning the stale Track-B Slice-2 rows (remains a named T2 hygiene carry); any DB/code/deploy change.
