# Session — 2026-05-15 Sydney — cc-0014 STAGE C APPLIED (v2.74)

**Slug:** `cc-0014-stage-c-applied`

**Outcome:** **STAGE C APPLIED.** Health-check dual-write emitter live in Supabase `mbkmaxqhsohbtwsqolns`. Migration `cc_0014_c_health_check_emitter` applied. Two SECURITY DEFINER functions deployed + one pg_cron job scheduled. Cowork brief `nightly-health-check-v1` modified v2.1 → v3.0 with finding-id schema, Section 10 HTML-comment markers, and Section 12 emission instructions; committed at HEAD `bc32e86a3056c0b4d6d881c0bba1b2f6e1440aa3` via Path C (CC local git). 5 of 6 V-checks PASS. **V-C3 PENDING next live Cowork run** — not a HARD-STOP at this stage; HARD-STOP fires only if a real run produces an ID/count mismatch. **14-day experiment window still NOT started** — begins at end of Stage E. **0 D-01 fires this session** per cc-0014 brief §13 (Stage C execution matches §8 spec without divergence; P3 non-emission PK-approved as content design).

---

## HEAD progression this session

- **Baseline at session start**: `d3c952dfc4acd44c5facf97fa8b93a7c519cbbca` (v2.73 sync commit)
- **After Cowork v3.0 brief commit**: `bc32e86a3056c0b4d6d881c0bba1b2f6e1440aa3` (this session)
- Fast-forward only. No upstream race.

## Migration applied

`cc_0014_c_health_check_emitter` — applied via `apply_migration` MCP on 2026-05-15.

## Functions deployed

`friction.fn_emit_health_check_findings(p_run_id text, p_markdown_path text, p_findings jsonb)`:
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = friction, public`
- Owner: `postgres`
- `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO service_role`
- Returns: `jsonb` with `success_count`, `failure_count`, `run_id`
- Iterates `p_findings` JSONB array; per-finding INSERT to `friction.event` wrapped in EXCEPTION handler routing failures to `friction.emit_error` with SQLERRM + SQLSTATE + finding object + `emitter_version='cc-0014-v1.0'`
- Severity mapping: priority `1`→`critical`, `2`→`warn`, else `info`
- Problem key: `regexp_replace(finding_id, '^priority-[0-9]+/', '')`
- Category: hardcoded `'pipeline_integrity'`
- Reported-by: hardcoded `'system'`
- Dedupe fingerprint: `md5('health_check' || '|' || problem_key || '|' || related_object::text || '|' || 'pipeline_integrity')` (no day component; recurrence via case lookup)

`friction.fn_verify_health_check_daily(p_for_date date DEFAULT (current_date - INTERVAL '1 day')::date)`:
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = friction, public`
- Counts `friction.event` rows + `friction.emit_error` rows where `source='health_check'` for the given date
- If both counts are zero, INSERTs a marker into `friction.emit_error` with `source='health_check_verification'` and `error_message='NO_EVENTS_NO_ERRORS'`
- Returns: `jsonb` with `verification_date`, `event_count`, `error_count`, `verified_at`

## pg_cron deployed

| Cron jobid | jobname | schedule | command | active |
|---|---|---|---|---|
| 86 | `friction-verification-daily` | `15 1 * * *` UTC | `SELECT friction.fn_verify_health_check_daily();` | true |

Schedule chosen to fire ~75 minutes after Cowork nightly health check (which fires at 02:00 AEST = 16:00 UTC the prior day per memory, OR at a separate UTC time per current Cowork orchestration). pg_cron's runtime daemon executes as `postgres` superuser, which has implicit access to the `friction` schema regardless of grants.

## Cowork brief v2.1 → v3.0

| Aspect | Before (v2.1) | After (v3.0) |
|---|---|---|
| File path | `docs/briefs/nightly-health-check-v1.md` | same |
| Byte size | 19,854 B | 33,469 B |
| Blob SHA | `8e553c0383da8af958eb4fe4b0d4aa87d57873cb` | `d646f6e9797b423a213605352c4adf11f0c6f624` |
| `brief_version` | v2.1 | v3.0 |
| `default_action` | `write_markdown_only` | `write_markdown_and_emit` |
| `forbidden_actions` | listed `c.*, m.*, f.*, t.*, a.*` writes | extended to `r.*, op.*, k.*` + direct `friction.*` writes (emission only via SECURITY DEFINER function) |
| `success_output` | 2 entries | 3 entries (added `friction.event rows` side-effect) |
| Sections added | — | "Finding ID schema (NEW v3.0)", "Section 12. Emission to friction register (NEW v3.0)" with subsections 12.1-12.5 |
| Section 10 | descriptive prose | descriptive prose + HTML-comment `<!-- finding_id: priority-N/short-key -->` markers per P1/P2 bullet for ID-level reconciliation |
| Q&A defaults | 10 | 13 (added Q11/Q12/Q13 for v3.0 emission edge cases) |
| Stop conditions | 4 | 6 (added EMISSION_FAILED + BRIEF_ERROR for empty findings array when P1/P2 bullets present) |
| Success criteria table | 7 metrics | 10 metrics |
| Sunset review | 2026-06-02 | 2026-06-15 (extended by v3.0 reopening) |
| Commit | — | `bc32e86a3056c0b4d6d881c0bba1b2f6e1440aa3` via CC local git per Path C |

## P3 non-emission rule — PK-approved as content design

**Verbatim wording landed at TWO locations in the v3.0 brief** (top of "Finding ID schema (NEW v3.0)" section AND top of "Section 12. Emission to friction register"):

> "Only P1 and P2 findings are emitted to friction.event. P3 items are informational markdown-only observations and are excluded from friction emission and ID-level count matching."

Rationale: cc-0014 brief §8 says "Each priority finding in Section 10 gets a stable anchor". The function contract accepts any priority value (V-C1 example uses `priority-1`; V-C2 example mixes `priority-1` and `priority-3`). The decision to emit only P1+P2 is a brief-content design choice within the function contract scope, not a §8 divergence. PK explicitly approved this distinction; **no D-01 required** per brief §13 governance gate.

## V-checks — 5/6 PASS, 1 PENDING

| V-check | Scope | Result |
|---|---|---|
| V-C1 | Synthetic emission with single finding: function returns `success_count=1, failure_count=0`; friction.event row has all 12 expected fields (severity=`critical`, category=`pipeline_integrity`, category_source=`emitter_default`, reported_by=`system`, problem_key=`cc-0014-test`, source_event_id composite of run_id/finding_id, raw_payload includes finding_id + run_id + markdown_path + priority + raw_finding) | **PASS** |
| V-C2 | Mixed batch (good/malformed/good): function returns `success_count=2, failure_count=1`; 2 good events inserted; malformed (missing `finding_id` → NULL source_event_id) logged to emit_error with SQLSTATE `23502` ("null value in column \"source_event_id\" of relation \"event\" violates not-null constraint") + emitter_version `cc-0014-v1.0` + raw_payload preserved | **PASS** |
| V-C3 | Live Cowork run with v3.0 brief: markdown finding_ids match friction.event rows by source_event_id | **PENDING next nightly fire / manual Cowork trigger** |
| V-C4 | `cron.job` entry for `friction-verification-daily`: jobid 86, schedule `15 1 * * *`, active=true, command `SELECT friction.fn_verify_health_check_daily();` | **PASS** |
| V-C5 | `SET ROLE authenticated; SELECT friction.fn_emit_health_check_findings(...)` raises SQLSTATE `42501` (`permission denied for function fn_emit_health_check_findings`) | **PASS** |
| V-C6 | Zero residual test rows across `friction.event` + `friction.emit_error` after V-check cleanup | **PASS** |

## ID-verifiability — confirmed at design level

Three independent paths verify any future Cowork run's findings against friction.event rows:

1. **`source_event_id` is deterministic** — composite `run_id || '/' || finding_id`. An independent reader can compute the expected source_event_id for any markdown bullet's finding_id.
2. **`finding_id` stored in `raw_payload`** — JSONB field `raw_payload->>'finding_id'` carries the literal value. Cross-reference to the HTML-comment markers in Section 10 of the markdown.
3. **`markdown_path` stored in `raw_payload`** — JSONB field `raw_payload->>'markdown_path'` carries the source markdown filename. Allows fetching the markdown at the path and grep-ing for the finding_id markers.

For V-C3 to PASS on the next live run, the Cowork tool must:
- Generate Section 10 with `<!-- finding_id: priority-N/short-key -->` markers on every P1+P2 bullet (per v3.0 brief Section 10 template)
- Build a JSONB findings array using the same finding_id values (per v3.0 brief Section 12.2)
- Call `friction.fn_emit_health_check_findings(run_id, markdown_path, findings_array)` after markdown write (per v3.0 brief Section 12.3)
- Capture `success_count` and `failure_count` from the function return; record in Section 11 emission summary (per v3.0 brief Section 12.4)

Reconciliation query (chat or PK can run post-Cowork):
```sql
SELECT source_event_id, raw_payload->>'finding_id' AS finding_id_in_raw, raw_payload->>'markdown_path' AS md_path
FROM friction.event
WHERE source = 'health_check'
  AND raw_payload->>'health_check_run_id' = '<run_id>';
```
Compare row count + `finding_id_in_raw` set to the markdown's `<!-- finding_id: ... -->` markers. Match → V-C3 PASS. Mismatch → HARD-STOP.

## V-C3 pending risk — Cowork output pipeline silent since 2026-05-05/06

**Observation, not a Stage C hard-stop**: `docs/audit/health/` directory contains only 3 markdown files (2026-05-02, 04, 05). Nothing since 2026-05-06 — per memory v2.72 carry, "Cowork brief 02:00 AEST cron 6 May did not push". 9-day gap as of this session.

This means V-C3 may not auto-verify on the next cron-scheduled Cowork run if the existing failure pattern persists. Two recovery paths:
- **Manual Cowork trigger by PK** — PK runs Cowork's `openclaw tui` on Windows, picks up v3.0 brief, runs it once, V-C3 verified via post-run SQL reconciliation
- **Cowork pipeline diagnosis** — separate work outside cc-0014 Stage C scope; reproduces and fixes the commit-after-cron-fire failure

Stage C itself is HARD-STOPPED only if a live Cowork run produces a count mismatch between markdown finding_ids and friction.event rows. The current Cowork-silence state means V-C3 is "not yet observed", not "observed to fail". HARD-STOP not triggered.

## Brief defects in cc-0014 §8 spec encountered this session

**None.** Stage C migration SQL and V-check fixture both worked verbatim from brief §8. L53 + L55 + L60 discipline applied at pre-flight (verified Stage A + Stage B production state, no pre-existing Stage C objects, no pg_cron job naming conflicts, `pipeline_integrity` category active, no `experiment_run.status='running'` row) — all green before apply.

Contrast with Stage B (v2.73), where 3 distinct brief V-B1 defects (UUID hex error + 2 FK references not satisfied + 1 NOT NULL column omission) were caught at pre-flight. Stage C had a cleaner brief.

## Path C strict compliance for v3.0 brief commit

v3.0 brief drafted at **33,469 B**, 3,469 B over the L58 conservative threshold (>30KB). Per PK directive: **Direct B (CC local git)** — chat MCP write paths (`create_or_update_file`, `push_files`) explicitly avoided. Mirrors v2.73 sync pattern.

Round-trip:
1. Chat drafted brief content + commit message in `/mnt/user-data/outputs/`
2. PK / CC copied files into local working tree
3. CC `git status` clean → `git pull --ff-only` confirmed HEAD `d3c952d` → `git add` + `git commit -F <msg>` + `git push origin main`
4. CC reported new HEAD `bc32e86`, diff stat 163+/31- (net +132 lines)
5. Chat ran L41/L45 post-mutation truth check: HEAD verified, byte size 33,469 confirmed (exact local match, autocrlf strips CRLF on commit), `brief_version: v3.0` present, P3 non-emission wording present verbatim at 2 locations, Section 12 present, Section 10 finding_id markers present, file tail intact
6. All 6 verification points PASS

**L58 strengthening — 2nd preventive application this session**: v2.73 sync (action_list 44KB + sync_state 29KB) at PK directive Path C, AND v3.0 brief (33KB) at PK directive Path C. Promotion eligibility: pattern-of-two preventive use across distinct commit categories (doc-sync vs single-file brief modification). One more independent preventive occurrence promotes to baseline.

## Governance state at session close

| Metric | Value | Change from v2.73 |
|---|---|---|
| D-01 fires this session | **0** | 0 (unchanged) |
| T-MCP-02 cumulative | **66** | unchanged |
| State-capture exceptions cumulative | **1** | unchanged |
| L46 baseline shape | not exercised | unchanged |
| `friction.experiment_run.status='running'` rows | **0** | unchanged (window not started) |
| Stage D work | 0 | unchanged |
| Stage E work | 0 | unchanged |

## Production mutations this session

- 1 `apply_migration` (`cc_0014_c_health_check_emitter`) — CREATE FUNCTION × 2 + cron.schedule × 1 + GRANT/REVOKE
- ~8 `execute_sql` calls for V-checks (V-C1 + V-C2 + V-C2 verify + V-C4 + V-C5 + V-C6 + 2 pre-flight) — all test data cleaned in V-C6
- 0 EF deploys
- 0 cron mutations beyond the migration's `cron.schedule` call (which installed jobid 86)
- 0 vault writes
- 0 `ask_chatgpt_review` D-01 fires
- 1 GitHub commit via CC local git workflow (`bc32e86` — v3.0 brief, Path C per PK directive)
- 0 memory edits (no directive; user_memories at cap; v2.73→v2.74 carry-by-reference)

## Open follow-ups → Stage D onward

- **Stage D** (rank 1 v2.74) — Manual capture FAB in invegent-dashboard + backend `friction.fn_emit_manual_event` migration `cc_0014_d_manual_emit_function`
- **Stage E** (rank 2 v2.74) — `/operations` read surface + RPCs + experiment_run INSERT (this is when the 14-day window starts)
- **V-C3 live Cowork verification** (rank 3 v2.74) — depends on Cowork output pipeline recovery OR manual trigger
- **Brief v1.2 doc patch** (rank 4 v2.74, P3 carry) — 6 documented defects + L60 framing
- **cc-0013 Dashboard Phase 0** (rank 5 v2.74, DEPRIORITISED) — hold pending Day-19 IOL verdict
- **Close-the-loop batch sweep** (rank 6 v2.74) — 31 eligible rows (5 prior + 2 v2.72 + 24 historical)

---

*Stage C status: APPLIED. Day 19 verdict gate: `now() + 14 days` measured from Stage E close (not from Stage C). cc-0014 closes at Day 19, not at Stage C apply. V-C3 verification window: continues until first live Cowork run produces a friction.event-vs-markdown reconciliation.*
