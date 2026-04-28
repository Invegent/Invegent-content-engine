# F-002 Phase C Final Report

> Finding ID: F-002 (MEDIUM)
> Status: closed-action-taken (28 Apr 2026)
> Cycle: Audit cycle 1
> Closed by: 3-phase column purpose backfill (P1 + P2 + P3)

---

## The finding

F-002 raised 0% column-purpose coverage in `k.column_registry` for the `c` and `f` schemas — the most operationally important client-config and feed-layer schemas, totalling 674 columns. MEDIUM severity: nothing was broken, but future audit cycles could not reason safely about column semantics, and any operator joining the project had no in-system documentation of what each column gates or stores.

## The closure approach

A three-phase backfill driven by regex over column metadata: P1 = booleans + status/mode/kind/type enums (highest confidence, narrowest semantics), P2 = numeric thresholds, limits, weights, counts, scores (decision parameters), P3 = JSONB configs and payload-named columns (schema-within-schema). For each phase: CC produced draft proposals plus a draft migration → chat sanity-checked the draft against live DB samples → ChatGPT reviewed the wording in read-only mode → chat applied the corrected version via Supabase MCP → the audit run file received a per-phase addendum. F-002's closure was bounded to high-leverage P1–P3 columns; P4–P6 (FK columns, audit timestamps, surrogate keys) were declared out of scope at brief time.

## Numbers

| Phase | Drafted | Applied | Coverage delta (c+f) |
|---|---|---|---|
| P1 (booleans/enums) | 83 | 79 | 0% → 11.7% |
| P2 (numerics) | 31 | 30 | 11.7% → 16.2% |
| P3 (JSONB / payload-named) | 29 | 27 | 16.2% → 20.2% |
| **Total** | **143** | **136** | **0% → 20.2%** |

Final coverage by schema: `c` at **22.3%** (107/479), `f` at **14.9%** (29/195). Combined **136/674** columns documented.

The seven-row gap between drafted (143) and applied (136) is the sum of: 6 LOW-confidence rows isolated to followup files, plus 1 surrogate-key UUID (`c.client_format_config.config_id`) the P3 regex caught accidentally and the apply step correctly excluded as P6-deferred.

## What got deferred

- **6 LOW-confidence rows** across three followup files (`f002_p1`, `_p2`, `_p3_low_confidence_followup.md`), distributed 4 + 1 + 1 by phase. Each is awaiting a joint operator + chat session to write purposes from operator knowledge rather than schema inference.
- **7 pure-ARRAY columns** missed by the P3 regex, captured separately in `f002_phase_d_missing_array_columns.md`. Phase D mop-up; not blocking F-002 closure since the missed columns are simple enumerated lists, not safety-sensitive toggles or thresholds.
- **The remaining ~538 undocumented `c`+`f` columns** — out of scope for cycle 1. A future cycle's snapshot will identify the next priority batch.

## The pattern that worked

Two-layer review caught distinct categories of safety issue at each phase:

- **Phase A (P1) — 5 issues caught:** 4 LOW-confidence rows that CC's draft auto-flowed into the migration (process-level fix: LOW rows go to a Deferred section, never the SQL); plus consent-default wording on `consent_required`, voice-clone-as-consent equivalence, pipeline-specific overstating on `r6_enabled`/`use_markdown`/`is_featured`, and transient D156/D162 paused state baked into `external_reviewer.is_active` purposes that should outlive the decision.
- **Phase B (P2) — 14 issues caught:** external/stale platform claims (Meta Ads floor, UTC day boundary), precedence assertions softened to "may be superseded when configured", removed unverified arithmetic invariants on the ingest_run counters, removed speculation on why `error_count` is always 0, and stripped specific code-path references (`assemblePrompts()`, "ai-worker reads X", "popularity signal during video synthesis") plus interpretation framing ("friction metric"). Default wording shifted to "downstream X may use this for Y" rather than "X reads this and does Y".
- **Phase C (P3) — 8 issues caught:** 3 from chat sanity-sampling shape across multiple rows where CC's single-row sample had misled the proposal (`c.client_channel.config` had OAuth credentials in 2 of 4 rows, not empty; `c.client.profile` carried WordPress credentials, not just `{ai}`; `f.video_analysis.raw_metadata` had 2 keys not 1; the audit table's `old/new_value` columns had mixed scalars not pure strings) + 4 from ChatGPT review catching residual code-path / element-shape / inference issues + 1 LOW row correctly self-isolated by CC into the Deferred section (the `f.raw_content_item.payload_hash` anomaly: 2123 payload rows, 0 hash rows, designed-but-unimplemented).

The progression matters. Phase A revealed the LOW-row discipline; Phase B revealed the speculation/code-path discipline; Phase C revealed JSONB single-row sampling can mislead. Each phase's correction rate (5, 14, 8) reflected those distinct review focuses, not declining draft quality.

## Lessons recorded

- **#35** — new tables ship with column purposes at creation, not retroactively
- **#36** — migration filenames are permanent audit artefacts; the `_corrected` suffix and the `k.fn_check_migration_naming_discipline()` detector (built during F-003 closure) enforce this
- **#37** — ChatGPT external review of CC proposals before apply, read-only and second-pair-of-eyes
- **#38** — count-delta verification beats time-window verification, because `k.refresh_column_registry`'s ON CONFLICT bumps `updated_at` on every row regardless of whether `column_purpose` changed
- **#39** — chat-side JSONB shape verification samples across rows, not single-row; single-row sampling missed 3 of 4 P3 claims

Lesson source: `docs/00_sync_state.md` evening section, decisions log D181, audit run file `2026-04-28-data.md`.

## Closing framing

F-002 is closed-action-taken. The closure is real but bounded: 136 high-leverage column purposes are now in `k.column_registry`, the two-layer review pattern is proven across three phases, the recurrence-prevention layer (slice 1: PENDING_DOCUMENTATION sentinel, 14-day grace, DEFERRED escape hatch, F-003 detector) is live, and five lessons have been captured. Closed does not mean done — Gate B observation continues through the earliest exit on Sat 2 May, the 6 LOW rows still need joint operator-and-chat resolution, the 7 ARRAY columns still need Phase D mop-up, and a wider audit cycle 2 will re-snapshot and identify the next batch. F-002 itself transitions out of the open findings register and stays closed; the open follow-up surface is owned by separate files, not by re-opening this finding.
