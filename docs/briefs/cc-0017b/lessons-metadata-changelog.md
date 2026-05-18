# cc-0017b § 9–11 — Lessons Reference, Brief Authoring Metadata, Changelog

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md) **Next:** (end of brief)

---

## 9. Lessons reference

This brief follows the established lesson baseline. Cross-references to the lessons that shaped specific design decisions:

- **L33 — Event trigger pre-flight survey mandatory.** §5.1 P3 inventories existing triggers; migration adds no new triggers (only replaces function bodies via `CREATE OR REPLACE FUNCTION`).
- **L34 — Trigger filter audit.** The new `fn_promote_event_to_case` body checks GUC + has `IF NEW.case_id IS NOT NULL THEN RETURN NEW` idempotency. V-B5 verifies the body contains both.
- **L35 — `INSERT ... ON CONFLICT DO UPDATE` for k.* registry rows.** emit_event uses `EXCEPTION WHEN unique_violation` instead (cleaner control flow for the `idempotent_replay` return path on `friction.event (source, source_event_id)`). Pattern variation, not deviation.
- **L40 — TypeScript compile checks cannot validate Supabase `.select(...)` string projections.** Not applicable (no TS this brief).
- **L41 — Chat-side MCP commits can drift local deploy machine.** Not applicable (no local deploy in 0b; pure DB migration via Supabase MCP `apply_migration`).
- **L46 — Evidence Gate.** D-01 fields in §6 separate strong vs weak evidence per Lesson 46; 8 known-weak items listed for ChatGPT review to score against.
- **L58 — Atomic push_files for documentation closes.** Brief authoring uses sequential single-file commits (different from 4-way sync close which uses atomic push). The cc-0017b brief was authored across 9 sequential commits + 1 final atomic push (this final commit covering §6–8 + §9–11) after the initial single-file ~70KB attempt exceeded bridge per-call payload limits.
- **L61 — Pre-flight verification before mutation (Q1–Q5 / P1–P5).** §5.1 P-set has 16 checks (P1–P16) covering schema state, function signatures, trigger inventory, seed slate, CHECK constraints, row counts, indexes, function volatility, drift universe, category code presence, and GUC clean state. Hard-stop summary explicit.
- **L62 — D-01 review protocol.** §6 supplies the 7 mandatory fields. Path A (satisfy corrected action) is the preferred response to partial verdicts.
- **L-v2.81-a (candidate) — parallel-session apply coordination.** Carried from v2.81. Apply session for cc-0017b must be designated explicitly to avoid concurrent-apply risk; this brief recommends Path B (separate apply session) only with explicit single-applying-chat clearance.

No new lessons proposed in this brief. Any new lessons surfacing during apply or D-01 review should be added to `docs/07_lessons.md` as part of the close-the-loop sync.

---

## 10. Brief authoring metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017b |
| Version | v1.0 |
| Wave | 0b of 10 (Friction Register Consolidation Plan) |
| Authored | 2026-05-18 Sydney evening |
| Authoring sessions | 1 (post-cc-0017a v2.81 close) |
| Author | Chat-side Claude on PK directive |
| Pre-brief introspection | 3 read-only `execute_sql` queries against `mbkmaxqhsohbtwsqolns` |
| Migration name (planned) | `cc_0017b_friction_unified_emit_event` |
| Atomicity | single transaction; all-or-nothing per PostgreSQL DDL semantics |
| Files in brief | 8 (1 index + 7 sub-files under `docs/briefs/cc-0017b/`) |
| Total V-checks | 27 (V-B1 through V-B27) |
| Total pre-flight queries | 16 (P1 through P16) |
| Hard-stop conditions | 28 (27 V-check failures + apply_migration raise + Step 1 backfill failure) |
| New objects created | 1 column (dynamic_context), 1 CHECK extension, 3 functions (emit_event, fn_severity_rank, fn_attach_or_create_inner_v1), 4 function-body rewrites, 3 emission_rule seed rows, 3 GRANTs |
| Behavioural change | SUBSTANTIAL — all 3 production emitters migrate to thin wrappers; trigger logic rewrites |
| Backward compatibility | Wrapper signatures preserved exactly; existing callers (cron 85, Cowork v3.0, FAB) require zero changes |
| Apply timing window | outside 03:30 AEST ± 30min (cron 85) and 02:00 AEST ± 30min (cron 86) |
| Rollback complexity | 5 sub-steps; 2 sub-steps (5.5.5c, 5.5.5d) require apply-session P2 body capture |
| Dependencies | cc-0017a v1.1 CLOSED-APPLIED at migration version `20260518065610` |
| Unblocks | Wave 1 (cc-0018 compliance reviewer) and Waves 2–6 emitter wiring |
| External dependencies updated | none |
| Cowork brief amendment required | NONE (per PK directive — health_check wrapper backward-compatible via 3-tier condition_key resolution) |
| FAB dashboard amendment required | NONE (manual wrapper signature preserved) |
| Cron 85 trigger amendment required | NONE (reconciliation wrapper signature preserved) |

### Brief structure (8 files)

| File | Sections | Size (approx) |
|---|---|---|
| `cc-0017b-friction-register-unified-emit-event.md` (index) | Header + 1 + 2 | 13.7 KB |
| `cc-0017b/risks-and-grants.md` | 3 + 4 | 10.3 KB |
| `cc-0017b/preflight-pset.md` | 5.1 | 10.0 KB |
| `cc-0017b/migration-sql-part-a.md` | 5.2 Steps 1–6 | 21.2 KB |
| `cc-0017b/migration-sql-part-b.md` | 5.2 Steps 7–11 | 15.1 KB |
| `cc-0017b/vchecks.md` | 5.3 | 28.4 KB |
| `cc-0017b/hardstop-rollback.md` | 5.4 + 5.5 | 16.5 KB |
| `cc-0017b/d01-postapply-deferred.md` | 6 + 7 + 8 | ~10 KB |
| `cc-0017b/lessons-metadata-changelog.md` | 9 + 10 + 11 | ~6 KB |
| **Total brief size** | | **~131 KB** |

Multi-file structure required because the original single-file commit attempt at ~70 KB exceeded the GitHub MCP bridge's per-call payload limit. Sequential `create_or_update_file` for files 1–7, atomic `push_files` for the final commit (files 8 + 9 together).

---

## 11. Changelog

### v1.0 — 2026-05-18 Sydney evening (this version)

Initial brief authored after read-only introspection captured 3 evidence snapshots from `mbkmaxqhsohbtwsqolns`:

- **Q1** Function signatures for the 3 production emitters + helpers.
- **Q2–Q3** CHECK constraints + trigger inventory + idempotency schema state.
- **Q4–Q8** Empirical drift_type universe + health_check problem_key universe + transition-window calibration + fingerprint format split.

**Locks incorporated from PK directives 2026-05-18:**

1. **GUC bypass** for trigger no-op when emit_event in control (cleaner than WHEN clause filter on the trigger binding). Transaction-local via `set_config(..., is_local := true)`. GUC name: `friction.emit_event_active`.
2. **source_event_id idempotency** leveraging existing `UNIQUE (source, source_event_id)` constraint. emit_event catches `unique_violation` → returns `idempotent_replay` disposition with the prior event/case IDs.
3. **p_category_override parameter** added to emit_event signature (Amendment E.1 extension to Amendment E's p_severity_override).
4. **reported_by enum-safe** validation — emit_event raises P0001 if `p_reported_by` not in the 5-value enum. Wrapper mappings: reconciliation+health_check → `'system'`; manual → `'pk'`.
5. **Reopen marker semantics locked** — `resolved_at = NULL` + `resolution_kind = 'reopened'` (transient state marker, overwritten on operator triage) + `reopen_count++` (monotonic recurrence counter). Severity REPLACES (not max) on reopen per PK directive.
6. **DO NOT add `'severity_override'`** to category_source enum. Store severity override provenance in `dynamic_context` jsonb column instead.
7. **Add `'category_override'`** to category_source enum only for non-manual paths (when p_reported_by ≠ 'pk' AND p_category_override IS NOT NULL). Manual path with category override preserves `'manual_at_capture'` (cc-0014 semantics).
8. **Health_check 3-tier `condition_key` resolution** — (1) explicit `condition_key` field on finding → (2) parse `'true-stuck-*'` problem_key → `'true_stuck'` → (3) `emit_error` code `'CONDITION-KEY-UNRESOLVED'` + skip. Backward-compatible with current Cowork brief JSON output (tier 2 covers all 5 current problem_keys per Q6).

**Authoring trajectory this session:**

- Initial design draft presented inline (Phase 1) — first-task layout of unified emit_event signature, attach-or-create strategy, 14-day reopen logic, wrapper plan, 8 open questions.
- Read-only introspection (Phase 2) — 3 batched `execute_sql` queries; 8 critical findings documented in §1.1 anchor table.
- Revised design (Phase 3) — PK amendments incorporated; dynamic_context column added; category_source extension minimised to one value; 3-tier health_check resolution drafted.
- Full brief authoring (Phase 4) — initial single-file commit at ~70 KB failed bridge per-call limit. Strategy changed to multi-file split under `docs/briefs/cc-0017b/` subdirectory. 7 files committed sequentially via `create_or_update_file`; final 2 files committed atomically via `push_files` to finish the brief in fewer round-trips.

**No D-01 fired this version.** No production mutations this version. Migration body is canonical and ready for D-01 + apply once PK approves the authoring.

---

### Future patch slots

| Slot | Purpose | Trigger |
|---|---|---|
| v1.1 | Defects surfaced in D-01 review (type-b substantive) | D-01 returns `partial` with material findings |
| v1.2 | Defects surfaced post-apply but pre-close | Any V-check fails; rollback executed; remediation drafted |
| v2.0 | Per-source tunable reopen window + cross-source dedupe | Empirical data after ~30 days of cc-0017b production |

---

**END OF BRIEF.** Return to [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md) (index).
