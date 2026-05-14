# Session — 2026-05-14 Sydney — cc-0014 STAGE A APPLIED (v2.72)

**Slug:** `cc-0014-stage-a-applied`

**Outcome:** **STAGE A APPLIED.** `friction.*` schema deployed to Supabase `mbkmaxqhsohbtwsqolns`. Migration `cc_0014_a_friction_schema` applied. 5 tables + 2 v1.1-patch triggers + full grants matrix live. All 11 V-checks PASS. Zero residual test rows. **The 14-day experiment window has NOT started** — begins at end of Stage E.

> Session file written retroactively on 2026-05-15 as part of v2.73 sync catch-up commit. No production state mutation in the writing of this file.

---

## Migration applied

`cc_0014_a_friction_schema` — applied via `apply_migration` MCP on 2026-05-14.

## Schema delivered — `friction.*` (NEW)

5 tables:

| Table | Purpose |
|---|---|
| `friction.category` | Reference table. Seeded with 6 active categories + 1 `unclassified` placeholder (`counts_for_success=false`). |
| `friction.event` | Append-only event log. Emitters write here. NOT NULL columns: `source`, `source_event_id`, `observed_at`, `severity`, `category` (FK → `friction.category`), `category_source`, `reported_by`, `problem_key`, `observation_text`, `dedupe_fingerprint`, `emitted_at`. |
| `friction.case` | Grouped events. 4 row-validity CHECK constraints. |
| `friction.emit_error` | Emitter failure sink. Every emitter wraps its INSERT in an exception handler that logs here. Never raises. |
| `friction.experiment_run` | Experiment boundary. Locks `criteria_snapshot` at run start via the v1.1 patch trigger. |

4 CHECK constraints on `friction.case`:
- `quality_flag_requires_real_category` — quality_flag IS NULL OR category != 'unclassified'
- `track_or_defer_requires_next_review`
- `suppress_requires_reason`
- `capture_reason_note_required_for_incrementality`

2 triggers (v1.1 patch — D-01 pushback 3 type-(b) reclassified genuine):
- `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run` — BEFORE DELETE, call `friction.fn_prevent_delete_during_run()`. Block DELETE while any `experiment_run.status='running'`. Pre-experiment test-row cleanup unaffected (executes BEFORE the run is set running).
- `friction_experiment_run_criteria_immutable` — BEFORE UPDATE on `friction.experiment_run`, calls `friction.fn_lock_criteria_snapshot()`. Block UPDATE on `criteria_snapshot` while status='running'. Other column UPDATEs permitted.

Full grants matrix per brief Section 3 (service_role / authenticated / anon all explicit). Most rigorous V-check block to date for a single migration.

## V-checks — 11/11 PASS

| V-check | Scope | Result |
|---|---|---|
| V-A1 | Schema `friction` exists | PASS |
| V-A2 | All 5 tables created | PASS |
| V-A3 | Category seed correct: 6 active + 1 unclassified | PASS |
| V-A4 | `quality_flag_requires_real_category` raises on intentional bad INSERT | PASS |
| V-A5 | `track_or_defer_requires_next_review` raises | PASS |
| V-A6 | `suppress_requires_reason` raises | PASS |
| V-A7 | `service_role` INSERT to `friction.event` succeeds | PASS |
| V-A8 | `anon` SELECT denied with SQLSTATE 42501 | PASS |
| V-A9 | Test row cleanup verified zero residual | PASS |
| V-A10 | DELETE-protection trigger 3-phase test: DELETE permitted before run → blocked during run → permitted after status changes | PASS |
| V-A11 | criteria_snapshot immutability 2-phase test: criteria_snapshot mutation blocked / other column mutation permitted | PASS |

## Self-correctively caught defect at V-A10/V-A11

V-A10 originally used fabricated UUID `cc0014va10` — contains non-hex char `v`. PostgreSQL UUID parser rejected. Corrected to `00cc0014a10a` (12 hex chars, valid segment length). V-A11 had same defect class with `cc00014va11a` (13 chars in segment 5 — max is 12).

Pattern: fabricated UUIDs must use only hex digits (0-9, a-f) and verify segment lengths (8-4-4-4-12). Same defect class recurred in Stage B V-B1 — see L60 candidate in 2026-05-15 session file.

## D-01 history — 2 fires, both partial, distinct L62 classifications

| review_id | brief version | verdict | pushback classification | resolution |
|---|---|---|---|---|
| `903cfd8e-5c59-45d5-a310-1e2ff35ef93e` | v1.0 | partial / escalate_explicit_flag | pushback 3 type-(b) genuine | v1.1 patch added `fn_prevent_delete_during_run` + `fn_lock_criteria_snapshot` triggers + V-A10 + V-A11 |
| `873985f7-4069-4471-a3e1-0e0e0e0e0e0e` | v1.1 | partial / escalate_explicit_flag | both remaining pushbacks type-(c) generic consistency-bias | PK state-capture override per L62 |

Both rows pending close-the-loop UPDATE on `m.chatgpt_review.status='resolved'`.

8 review rounds total before any production write: strategic v0.1 → v0.2 → v0.3 → v0.4 (across 4 hostile reviews), then brief v1.0 → v1.1 (D-01 type-(b) → patch → D-01 type-(c) → override). Most-iterated build to date.

## Lessons / candidates this session

- **L58 NEW candidate v2.72** — MCP `create_or_update_file` reliability degrades on payloads larger than ~30KB inline content. cc-0014 brief at 62KB committed via Claude Code local git after 2 failed direct-MCP attempts (placeholder string at 87 bytes, then truncated stub at 5,845 bytes). Threshold observed working at 23KB (strategy doc via Claude Code) / observed broken at 62KB (brief via direct MCP). Default to Claude Code local git for any GitHub commit >30KB markdown content. Promotion pending pattern repeat.
- **L59 NEW candidate v2.72** — Schema-enforced append-only via trigger is structurally stronger than convention-only enforcement, AND it's cheap to add. v1.1 patch added 2 triggers after D-01 review correctly classified convention-only enforcement as a discipline shortcut at odds with the brief's own load-bearing argument. Brief-authoring discipline: when a brief claims a load-bearing property (append-only, immutable, monotonic), encode it in schema (CHECK, trigger, FK), not in convention. Promotion pending pattern repeat.
- **L60 NEW candidate (seeded v2.72, reified v2.73)** — Fabricated test-fixture validity must be verified at brief-authoring time across UUID hex-validity, FK target existence, and NOT NULL completeness. V-A10/V-A11 caught self-correctively at execution; same defect class recurred in V-B1 (Stage B). See 2026-05-15 session file for full L60 framing.
- **L62 type-(c) state-capture override empirically used v2.72** — v1.1 D-01 partial verdict reflected questions ChatGPT was asked to attack without surfacing concrete new evidence → PK approved override → Stage A executed. Distinct from v1.0 D-01 type-(b) classification on same brief. Both classifications correctly applied within same session.

## Pre-experiment state at close of Stage A

- `friction` schema live; 5 tables; 6 active categories + 1 unclassified seeded
- `friction.event` empty (no emitters yet)
- `friction.case` empty (no triage yet)
- `friction.emit_error` empty (no failures yet)
- `friction.experiment_run` empty (no `status='running'` row — comes at Stage E close)
- **14-day experiment window has NOT started**
- main HEAD at session close: `81a67325` (v2.72 action_list commit), built on `34305092f4` (cc-0014 v1.1 brief) + `c00bcdc` (IOL strategy v0.4 + dashboard v0.2 archive)

## Production mutations this session

- 1 `apply_migration` (`cc_0014_a_friction_schema`)
- 0 `execute_sql` writes outside V-checks
- 0 EF deploys
- 0 cron mutations
- 0 vault writes
- 2 `ask_chatgpt_review` D-01 fires (903cfd8e + 873985f7)
- 3 GitHub commits via Claude Code local git workflow (brief at `34305092f4`, strategy + dashboard archive at `c00bcdc`, action_list v2.72 at `81a67325`)
- 2 memory edits (line 14 + line 27 replaced for cc-0014 + IOL direction)

## T-MCP-02 + state-capture

- T-MCP-02 cumulative: 66 (+2 from 64 at v2.71)
- State-capture exceptions v2.72: 1 (v1.1 type-(c) override)
- L46 baseline shape v2.72: 0 clean pass-through D-01s this session (both fires returned partial — different shape from v2.68's 5-streak baseline)

## Open follow-ups → Stage B onward

- Stage B: reconciliation emitter SQL trigger on `r.cadence_drift_log`
- Stage C: health check Cowork brief v3.0 dual-write + pg_cron verification (HARD-STOP if fails)
- Stage D: manual capture FAB + `friction.fn_emit_manual_event`
- Stage E: read surface (`/operations`) + experiment_run creation (14-day window starts)
- Close-the-loop UPDATEs on 2 m.chatgpt_review rows (`903cfd8e` + `873985f7`)
- Brief v1.2 doc patch — combine 3 V-A10/V-A11 UUID defects + 3 V-B1 defects (Stage B) + L60 framing
- Per-session file for this session **not written at v2.72 close** (this file is the carry-over retroactive write at v2.73 close)

---

*Stage A status: APPLIED. Day 19 verdict gate: `now() + 14 days` measured from Stage E close (not from Stage A). cc-0014 closes at Day 19, not at Stage A apply.*
