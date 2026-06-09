# 2026-06-09 Sydney — OBS Stage 0A smoke PASS + read-path (G-RP / G-RP-RLS) — closeout

**Session window:** 2026-06-09 ~08:00 UTC → ~11:00 UTC (Sydney AEST). This file is the **closeout/documentation record** authored by CCH after the build + smoke had already landed on `main`.
**Headline:** OBS Stage 0A was resumed from the 2026-06-08 hold (recommendation C). The `obs-observer` 0A read-path was built, the obs_readonly production read-path was applied in two gated migrations (G-RP role/grants + G-RP-RLS slot-origin SELECT policy), and a manual Stage 0A smoke was run against the isolated OBS project. Observer + scheduler are **parked**; Stage 0A is **PASSED and PARKED**.
**Outcome:** Stage 0A read-path live in the isolated OBS project; production `mbkmaxqhsohbtwsqolns` received exactly the two approved obs_readonly read-path migrations and nothing else. **0B not started. Continuous scheduling requires future approval.** The four OBS Stage 0A review rows remain OPEN — close-the-loop was **NOT executed this session** (see "Review closeout" below).

---

## Scope of this session (CCH closeout lane)

Documentation synchronisation only. Explicitly **NOT** done this session: scheduler enable, observer re-run, Stage 0B start, HeyGen work, any new build, and any production `m.chatgpt_review` write (review-row closure). Per the closeout directive, those are out of lane or gated.

---

## What landed on `main` 2026-06-09 (independently verified — repo evidence)

These are CCH-verified from `list_recent_commits` + migration commit bodies (not taken on directive faith):

### obs-observer 0A read-path build (Edge Function package — OBS-only, scheduler disabled)
- `7c3f456b` — dedicated OBS write client (append-only INSERT into `obs.observation`, `ON CONFLICT DO NOTHING`).
- `ae789ef9` — obs-observer EF entry: kill-switch + gated invoke + read/transform/write.
- `f7e93d6c` — deno.json import map (postgres client).
- `8477fd42` — package README (invariants, env contract, reconcile gates).
- `a7025ff4` — Artefact-4 forbidden-term denylist (0B/comparison/inference tokens).
- `0741efbf` — 8+1 CI defence-gate runner (import/term/migration/RPC-cron/egress/secret/no-0B/deno/boundary).
- `6b5e6585` — manual smoke runbook (CCD/terminal-only, OBS-only, scheduler disabled, reconcile precondition).
- **Rework 1/8 → 8/8** (`5e07defb`, `d2b83efa`, `5e1c8f1b`, `5d74bd53`, `7621fdfb`, `752f5000`, `ead77a48`, `1caa685f`) — reworked the 0A contract + write client to the **live OBS schema** (single-row model, one record per `(post_draft_id, observer_version)`, name-cells + evidence_class enum, eligibility status sets; logic moved from `stage0_transform.ts` → `raw_observation_0a.ts`; Gate 8 `deno check --config`).
- `49271ff1` — removed the inert `stage0_transform.ts` placeholder (name reserved for the future 0A→0B transform).
- `51aa9ffb` — **smoke reconcile**: eligibility status buckets reconciled to live prod vocab (`generated`/`archived_stale` → terminal; `future` → in_flight; unknown → indeterminate safe default).
- `6e300b5e` — **smoke-surfaced fix**: `obs.observation.observed_at` is NOT NULL with no default; INSERT now stamps it server-side `now()` (provenance, not part of idempotency key → ON CONFLICT re-runs never change it).

### Production read-path migrations applied to `mbkmaxqhsohbtwsqolns` (2026-06-09)
- **G-RP** — `20260609081127_obs_readonly_production_read_path_g_rp` (repo-parity commit `5d92e741`): `CREATE ROLE obs_readonly` (least-privilege; `default_transaction_read_only=on`, 5s statement + idle timeouts; NOBYPASSRLS), `GRANT USAGE ON SCHEMA m`, column-level `GRANT SELECT` on the 45 CCH-confirmed allow-listed columns across `m.post_draft`, `m.slot`, `m.slot_fill_attempt`, `m.post_render_log`. **Role password intentionally NOT captured** — must be rotated/secret-wired via a future, separately-gated step before observer use.
- **G-RP-RLS** — `20260609103639_obs_readonly_rls_slot_origin_select_g_rp_rls` (repo-parity commit `b002dc10`): additive, permissive, role-scoped **RLS SELECT policy** giving `obs_readonly` row visibility on the **slot-originated population only** (`slot_id IS NOT NULL`; 547 rows / 4 clients). Existing portal policies untouched; `obs_readonly` stays NOBYPASSRLS, read-only, 45-column-scoped. **Approved by PK exact-phrase, D-01 review `9b03b489`.**

> **Accuracy note:** the closeout directive summarised the production delta as "unchanged except the approved G-RP-RLS slot-origin SELECT policy." The repo shows the production delta this day is **both** migrations — G-RP (role + grants, `20260609081127`) **and** G-RP-RLS (`20260609103639`). Recorded here as both, per no-fabrication discipline.

---

## What is reported from the CCD Stage 0A smoke (NOT independently CCH-verifiable)

CCH has **no read path to the isolated OBS project** (`invegent-obs-stage0`, ap-northeast-2): its ref/credentials are deliberately uncaptured and the CCH Supabase MCP is bound to production only. The following are **reported via the CCD terminal smoke / closeout directive**, corroborated only indirectly by the repo (the `observed_at` NOT-NULL fix `6e300b5e` proves a real smoke INSERT executed against live OBS):

- Stage 0A manual smoke **PASSED**.
- **50 valid 0A observations** recorded.
- **Idempotency verified** (re-run produced no duplicates under the `(post_draft_id, observer_version, stage)` key + `ON CONFLICT DO NOTHING`).
- Observer **disabled** (kill-switch off / gated invoke only).
- Scheduler **disabled** (no cron created).

These five are accepted for the closeout record as **reported, not CCH-verified**.

---

## Production mutations attributable to this arc

1. `apply_migration 20260609081127_obs_readonly_production_read_path_g_rp` — applied to production `mbkmaxqhsohbtwsqolns` (CCD; ~08:11 UTC). Role + grants; password uncaptured.
2. `apply_migration 20260609103639_obs_readonly_rls_slot_origin_select_g_rp_rls` — applied to production `mbkmaxqhsohbtwsqolns` (CCD; ~10:36 UTC). PK exact-phrase, D-01 `9b03b489`.

**This closeout session itself: 0 production mutation.** No EF deploy (obs-observer remains undeployed/parked). No scheduler/cron. No observer re-run. No 0B. No HeyGen. No `m.chatgpt_review` write (review-row closure NOT executed — see below).

---

## Review closeout — NOT executed this session (gated; carried forward)

The directive lists four OBS Stage 0A review rows for closure **conditional on production-write authorisation being granted**:

| review_id | Repo-confirmed role |
|---|---|
| `51752332` | (OBS Stage 0A plan review — not independently confirmed; `m.chatgpt_review` not read this session) |
| `5fed9a06` | (OBS Stage 0A plan review — not independently confirmed) |
| `c5a7cb3c` | (OBS Stage 0A plan review — not independently confirmed) |
| `9b03b489` | **Confirmed** as the G-RP-RLS migration approval D-01 (commit `b002dc10`) |

**Decision: closures NOT performed.** Reasons: (1) the directive frames closure as conditional ("if production-write authorisation is granted") and **no PK exact-phrase production-write authorisation for the closure was present** in the closeout instruction; (2) closing `m.chatgpt_review` rows is a production write that, under the standing governance model, requires its own D-01 + PK exact-phrase approval; (3) CCH's Supabase MCP was not engaged this session. **Carried forward** as a pending close-the-loop batch (status of the three non-G-RP-RLS rows to be read first; `9b03b489` close-the-loop to follow its applied migration). Closure remains a separate gated step.

---

## State at session close

- **OBS Stage 0A: PASSED + PARKED.** Read-path live in the isolated OBS project; observer + scheduler disabled.
- Production `mbkmaxqhsohbtwsqolns`: changed only by the two approved obs_readonly read-path migrations (`20260609081127` G-RP + `20260609103639` G-RP-RLS).
- **Stage 0B: NOT started.** `stage0_transform.ts` name reserved for the future 0A→0B difference transform.
- **Continuous scheduling: requires future approval** (separate `sql_destructive` D-01 for any `cron.schedule`; durable alerting must precede any unattended run).
- obs_readonly role password uncaptured → secret-wiring is a future, separately-gated step before any unattended observer use.
- Four OBS Stage 0A review rows OPEN (closeout deferred — gated).
- `heygen-worker` v2.1.0 unchanged from 2026-06-08 (committed `690a295b`, undeployed; D-01 `0d9bb255` OPEN) — untouched this session per directive.

## Truth check (session close)

| Check | Result |
|---|---|
| `origin/main` HEAD before this closeout commit | `6e300b5e` (2026-06-09 10:57:59Z) |
| OBS read-path migrations in production history | `20260609081127` (G-RP) + `20260609103639` (G-RP-RLS) |
| Smoke counts (50 obs / idempotency) | reported from CCD smoke; **not** CCH-verified (OBS isolated) |
| Review rows closed this session | **none** (gated; carried forward) |
| EF deploy / scheduler / 0B / HeyGen this session | none |
| `00_sync_state.md` / `00_action_list.md` deltas | **routed to CCD surgical `str_replace`** (both files >80 KB; full-re-emit from CCH is the L41 / L-v3.07-a clobber hazard) — patch blocks supplied in chat |
| Dashboard roadmap (4-way sync) | **N/A** — OBS is internal infra / operational, not a roadmap PHASE change |

## Honest limitations

- The smoke pass, the 50-observation count, and idempotency verification are **reported, not CCH-verified** — CCH has no path to the isolated OBS project by design.
- The directive's "production unchanged except G-RP-RLS" understated the production delta; the accurate record (both G-RP and G-RP-RLS) is used here.
- The two large `00_` index files were **not** edited by CCH this session (clobber-risk discipline); their deltas are CCD's surgical-`str_replace` lane.
