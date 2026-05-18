# Friction Register Consolidation Plan v1 — Amendments

**Status:** SIGNED — execution gate OPEN as of 2026-05-18 Sydney afternoon (v2.79)
**Author:** PK + chat session 2026-05-18 Sydney (after multi-LLM review)
**Companion doc:** `docs/runtime/friction_register_consolidation_plan_v1.md` (commit afc9306)
**Reviews received from:** 3 independent reviewers on v1 (ChatGPT, Gemini-style, GitHub-mode) + 4th post-amendments pre-signature cross-check (ChatGPT, see §5.5)
**Disposition:** v1 stands as authored; this addendum locks specific changes before cc-0017a authoring.

---

## 1. Why This Addendum Exists

v1 was written, committed, and reviewed by three independent LLMs. All three approved the architecture and the empirical grounding. All three flagged the same execution-readiness gaps. Rather than rewrite v1 (95% would be unchanged), this addendum locks the specific changes needed before cc-0017a can be authored.

Reviewer convergence is the signal. Where ≥2 of 3 reviewers flagged the same gap, the change is locked. Where 1 of 3 flagged a gap, the change is accepted only if pressure-test confirms it's material.

**Update 2026-05-18 Sydney evening:** §5.5 added after PK consulted ChatGPT for a 4th cross-check pre-signature. Two residual ambiguities locked (reopen window N = 14 days; triage metric measurement strategy). No new architectural decisions.

**Update 2026-05-18 Sydney afternoon (v2.79):** PK signature recorded in §9. Execution gate OPEN. cc-0017a Wave 0a brief authoring un-gated.

---

## 2. High-Convergence Changes (≥2 of 3 reviewers) — LOCKED

### Amendment A — Wave 0 splits into 0a / 0b / 0c

**Original Wave 0 scope:** 10 things in one wave (registry tables + emit_event + trigger replacement + FK migration + wrapper migration + backfills).

**Locked split:**

| Wave | Scope | Risk profile |
|---|---|---|
| **0a** — Foundational schema, observational only | New tables (`friction.source`, `friction.emission_rule`, `friction.emission_rule_history`, `friction.notification_policy`). New columns on case (`resolved_at`, `effort_level`, `triaged_at`, `triaged_by` — see Amendment E). Seed `friction.source` with current 3 sources. Partial unique index creation. NO behavioural change. | Additive only. Reversible by drop-if-exists. |
| **0b** — Engine + trigger logic | Unified `friction.emit_event` function. New attach-or-create trigger replacing `fn_promote_event_to_case`. Concurrency tests. Migrate 3 existing emit_* functions to thin wrappers calling `emit_event`. | Behavioural change. Requires parity tests + rollback plan. |
| **0c** — Constraint cleanup | Drop `event_source_check` CHECK constraint. Add FK from `friction.event.source` to `friction.source.source_code`. Permission lockdown (Amendment H). Backfill `resolved_at` on existing closed-state cases. | Migration-class. Atomic transaction. |

**Why this matters:** if 0b's new trigger has a bug, 0a still stood up cleanly with no operational impact. Three smaller D-01 reviews instead of one mega-review. Each split has its own rollback path.

### Amendment B — Resolve the dedupe key inconsistency NOW

**Problem (caught by Review 3):** v1 uses three different formulations across sections:
- North Star (§1): "deduped against `problem_key + related_object`"
- Architecture diagram (§3, Layer 4): "deduped by `problem_key + related_object + source`"
- Decision 7 (§5): "Dedupe at `problem_key + related_object + source`"
- Decision 23 (§5): "by `dedupe_fingerprint`"
- Schema sketch (§6.6): partial unique index temporarily on `(problem_key, severity)` with note

These cannot all be the canonical formulation. cc-0017 cannot ship until this is one answer.

**Locked answer:**

The canonical dedupe key is:

```
dedupe_fingerprint = sha256(
  source || ':' ||
  problem_key || ':' ||
  related_object_canonical_json
)
```

Where:
- `source` is the FK-validated source registry code
- `problem_key` is computed per-source by the `emission_rule.problem_key_formula` (a deterministic function reference, not free text — see Amendment D)
- `related_object_canonical_json` is `related_object::jsonb` normalised via `jsonb_build_object` with sorted keys (deterministic JSON serialisation)

**Severity is NOT part of the dedupe key.** Reasoning: if the same problem worsens from warn to critical, that's an *escalation of the same case*, not a new case. The case's severity column becomes mutable and upgradeable; the dedupe key remains stable.

**Partial unique index becomes:**

```sql
CREATE UNIQUE INDEX case_open_dedupe_uniq
  ON friction."case" (dedupe_fingerprint)
  WHERE resolved_at IS NULL;
```

And `friction.case` needs a `dedupe_fingerprint` column (currently doesn't have one — currently only `friction.event` does). Add to 0a.

**All v1 references to the dedupe key get retrofitted to point at this single canonical definition.**

### Amendment C — Triage time metrics need columns

**Problem (caught by Reviews 2 + 3):** Success criterion "Operator triage time per case < 2 min average" cannot be measured against current schema. There's `created_at` and `reviewed_at` but no way to capture "first viewed" vs "decision made".

**Locked addition to 0a:**

```sql
ALTER TABLE friction."case"
  ADD COLUMN first_viewed_at timestamptz,
  ADD COLUMN triaged_at timestamptz,
  ADD COLUMN triaged_by text;
```

- `first_viewed_at`: set on first GET of case from /operations UI
- `triaged_at`: set when action_decision is first non-NULL
- `triaged_by`: operator identity (PK for now, multi-user later)

Triage time becomes `triaged_at - first_viewed_at`. This is the v1 measurement basis for Wave 7+. (See §5.5 Clarification 2 for the Waves 1-6 fallback formula.)

### Amendment D — Sentinel dual-write success criterion: time AND count

**Problem (caught by Reviews 2 + 3):** "14 days overlap" alone is insufficient if event volume is low or if a rare-but-critical alert type doesn't fire in those 14 days.

**Locked criterion:**

Sentinel dual-write proves equivalence when ALL of:
1. At least 14 days elapsed since dual-write began
2. At least 50 m.pipeline_incident → friction.event pairs successfully cross-examined
3. At least 1 instance of each known sentinel check_name (no_drafts_48h, no_posts_48h, ai_queue_depth, stuck_ai_jobs, feed_ingest_stalled) successfully routed
4. Zero discrepancies in severity/category mapping
5. PK signs off explicitly

Whichever takes longer.

---

## 3. Medium-Convergence Changes (1 of 3, pressure-test confirms) — LOCKED

### Amendment E — Severity dynamic override path

**Caught by:** Review 2 only.

**Pressure test:** Review 2's concern is real. A stuck Instagram publish at a paying client matters more than the same on an internal test page. Rule-only severity is "rigid prison" — and we have one such case empirically today: NDIS Yarns vs Property Pulse are both internal, but the future external client load is exactly where severity should vary by client metadata.

**Locked answer:**

`friction.emit_event` accepts an optional `p_severity_override` parameter:

```sql
CREATE FUNCTION friction.emit_event(
  ...existing params...,
  p_severity_override text DEFAULT NULL,
  p_dynamic_context jsonb DEFAULT NULL
) ...
```

- If `p_severity_override IS NOT NULL`: use it (must be valid severity enum)
- If `p_severity_override IS NULL`: fall back to `emission_rule.default_severity`
- `category_source` column already records this distinction (`'emitter_default'` vs `'manual_at_capture'`) — extend to include `'severity_override'`
- `p_dynamic_context` jsonb is stored on the event for audit; detector can pass `{"client_tier": "external", "vip": true}` as evidence for the override

**This is not a "rule engine"; it's an escape hatch. Most emissions use rule defaults. Overrides are explicit and audited.**

### Amendment F — Direct-write enforcement

**Caught by:** Review 3 only.

**Pressure test:** Real risk. We're trusting "all emitters use emit_event" by convention only. A future developer could `INSERT INTO friction.event` directly, bypassing emission_rule, bypassing dedupe, polluting the spine.

**Locked answer:**

In 0c, lock down direct writes:

```sql
-- Revoke direct INSERT/UPDATE on event from public/authenticated roles
REVOKE INSERT, UPDATE ON friction.event FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction.event FROM authenticated;
REVOKE INSERT, UPDATE ON friction."case" FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction."case" FROM authenticated;

-- Only the emit_event function (SECURITY DEFINER) and admin roles can write
GRANT EXECUTE ON FUNCTION friction.emit_event(...) TO service_role, authenticated;
```

Existing 3 emit_* functions inherit because they call emit_event as thin wrappers (or are themselves SECURITY DEFINER and granted explicitly).

Adds a single source of truth at the permission boundary. Direct INSERT attempt = SQL error, not silent pollution.

### Amendment G — Case lifecycle richer than `resolved_at IS NULL`

**Caught by:** Review 3 only.

**Pressure test:** Real risk. Auto-setting `resolved_at` when `action_decision IN ('suppress','ignore','duplicate')` means suppressed/ignored cases look identical to truly-resolved cases. We lose ability to do "this problem keeps coming back, but I keep suppressing it" recurrence analysis.

**Locked answer:**

Add `resolution_kind` column to case (not just `resolved_at` boolean-via-NULL):

```sql
ALTER TABLE friction."case"
  ADD COLUMN resolution_kind text
    CHECK (resolution_kind IS NULL OR resolution_kind IN (
      'acted_on',       -- act_now completed
      'tracked_done',   -- track completed
      'deferred_done',  -- defer_intentionally completed
      'suppressed',     -- intentionally hidden, may recur
      'ignored',        -- not worth tracking
      'duplicate',      -- merged with another case
      'reopened'        -- previously resolved, recurred (special)
    ));
```

Rules:
- `resolved_at IS NULL` ↔ case is open
- When `resolved_at` is set, `resolution_kind` MUST be set
- `reopened` is reserved for cases that previously had `resolved_at` set but recurrence triggered reopening (clears `resolved_at`, increments a `reopen_count`)
- "Reopened" cases preserve the original `case_id` — important for recurrence analysis

**This subtly changes Decision 7's "attach to OPEN cases only" rule:**

When dedupe sees a matching `dedupe_fingerprint` on a CLOSED case (resolved_at IS NOT NULL):
- If closed within last N days (locked to 14 days in §5.5 Clarification 1): **reopen the case**, attach event, set `reopen_count = reopen_count + 1`
- If closed more than N days ago: **new case**, with a `predecessor_case_id` link to the old one for audit

This is more sophisticated than what v1 had. It's also what makes recurrence trends visible — "this problem has recurred 4 times in 6 months" is operationally important signal.

Add `reopen_count integer NOT NULL DEFAULT 0` and `predecessor_case_id uuid REFERENCES friction.case(case_id)` columns in 0a.

---

## 4. Telegram Wave Re-sequencing — LOCKED

**Caught by:** Review 2.

**Pressure test:** Real. v1 has Telegram landing in Wave 6, but operators (PK) wire emitters in Waves 1-5 (compliance, doctor/fixer, sentinel, slot_alerts, token). During those waves, friction.event gets new traffic but the operator has no real-time alerting beyond looking at /operations manually. That's a 5-wave "black hole" where critical things hit the spine but no Telegram fires.

**Locked re-sequence:**

| Wave (new) | Wave (old) | Scope |
|---|---|---|
| 0a | 0a | Schema |
| 0b | 0b | Engine |
| 0c | 0c | Constraints |
| 1 | 1 | Compliance reviewer fix + emission |
| **2** | **6** | **Telegram → case-lifecycle trigger** ← MOVED EARLIER |
| 3 | 2 | Doctor/fixer audit + selective emission |
| 4 | 3 | Sentinel dual-write retrofit |
| 5 | 4 | slot_alerts emitter |
| 6 | 5 | Token simplification |
| 7 | 7 | Pool view design |
| 8 | 8 | Evidence/attachments |
| 9 | 9 | ai_diagnostic investigation |
| 10 | 10 | m.pipeline_incident historical mode |

Telegram lands immediately after compliance (Wave 1). Compliance Wave's emitter is low-volume (~10 pending events), so it's the right scale to validate Telegram routing before the heavier doctor/sentinel emitters fire in Waves 3-4.

**v1 sentinel-owned Telegram path stays live until Wave 4 (sentinel dual-write begins).** During Waves 1-3, sentinel still pings Telegram its old way for sentinel events; new emitters use the new case-lifecycle Telegram path. Two Telegram paths coexist for ~3-4 weeks. Cleanup of sentinel's direct Telegram code happens in Wave 4 alongside the dual-write retrofit.

---

## 5. Schema Naming Consistency Fix — LOCKED

**Caught by:** Review 2.

**Problem:** v1 §6.1 uses `default_category_code` (in `friction.source`) but v1 §6.2 uses `default_category` (in `friction.emission_rule`). One column refers to the same FK target with two different names.

**Locked answer:**

Both columns use the name `default_category_code` and FK to `friction.category(category_code)`. cc-0017a DDL conforms. No legacy naming.

---

## 5.5 Pre-Signature Clarifications — LOCKED 2026-05-18 Sydney evening

After v1 + amendments were committed and pre-signature chat review surfaced two residual ambiguities, PK consulted ChatGPT for a 4th independent cross-check before signing. ChatGPT confirmed the architecture is sound and that the concerns raised in the pre-signature review are healthy not stop-signs. Two specific clarifications are locked here to remove residual ambiguity before signature lands.

### Clarification 1 — Reopen window N = 14 days

**Resolves:** Amendment G "If closed within last N days (TBD, propose 7 days)" for the recurrence-reopens-existing-case window.

**LOCKED: N = 14 days.**

Reasoning:
- 7 days too short for fortnightly/weekly pipeline issues — a problem firing once every 10 days would always present as "new" rather than as recurring, defeating the purpose of recurrence analysis.
- 30 days too long — keeps old cases sticky and clutters /operations with reopens of long-resolved issues; recurrence after a month is usually a genuinely new occurrence.
- 14 days is the middle ground:
  - Catches same-week and fortnightly recurrence as reopen.
  - Catches monthly compliance reviewer recurrence as new case (correct — fresh review cycle, not a "the same problem keeps coming back" signal).
  - Aligns with the sentinel dual-write 14-day overlap criterion in Amendment D, so the operational windows in the friction subsystem are consistent.

**Implementation:** when `friction.emit_event` finds a closed case with matching `dedupe_fingerprint`, check `now() - case.resolved_at < interval '14 days'` to decide reopen-vs-new. Constant lives in the `emit_event` function body. If we need this per-source-tunable later, lift to a `friction.config` table or per-source override on `friction.source` table — v2 work, not v1 scope.

### Clarification 2 — Triage time metric measurement strategy

**Resolves:** Amendment C left `triaged_at - first_viewed_at` as the canonical metric, but `first_viewed_at` is only populated by /operations UI instrumentation which lands in Wave 7. The pre-Wave-7 measurement basis was not explicitly locked.

**LOCKED:**

| Phase | Triage time formula | Captures |
|---|---|---|
| Waves 1–6 (no UI; created_at available, first_viewed_at NULL) | `triaged_at - created_at` | Total responsiveness including time-to-look |
| Wave 7+ (UI live; first_viewed_at populated) | `triaged_at - first_viewed_at` (primary) + `triaged_at - created_at` (secondary) | Operator decision speed (primary) + operator latency to see new cases (secondary) |

In Wave 7, both metrics live; pool view chooses which to display per context. The `triaged_at - created_at` series persists as a continuous secondary chart across Waves 1-6 + Wave 7+, so we never lose the pre-UI baseline for comparison.

The v1 success criterion in plan §10 (`Operator triage time per case < 2 min average`) is interpreted against whichever formula is active in the phase being measured. The threshold remains the same; only the source columns change.

### Why these are clarifications, not new amendments

Both resolve open ambiguities within existing locked amendments (G and C respectively). No new architectural decision; no new schema column; no new sequencing change. The 32-decision total in §7 stands. §8 audit trail updated to note the 4th cross-check.

---

## 6. Acknowledged Future Gaps (NOT v1)

Reviewers raised these. All confirmed v2 scope, not blockers for v1 execution:

- **Cross-source dedupe** (Review 1): same underlying problem reported by sentinel + doctor should ideally collapse. v1 dedupes per-source (different sources → different cases). v2 work after we have empirical examples.
- **Bulk actions on similar cases** (Review 1): UI feature for pool view v2 iteration after we know operator workflow patterns.
- **Auto-suggestions from historical resolutions** (Review 1): LLM-assisted resolution. Premature.
- **SLA timers + stale-open auto-expiry** (Review 2): explicit work for v2. v1 success criterion "0 open cases > 30 days old" surfaces the problem manually for now.
- **Per-source tunable reopen window** (ChatGPT 4th cross-check, §5.5): v1 locks single global 14-day constant. If empirical data shows different sources need different windows, lift to per-source override in v2.

These are added to v1 §12 ("Decisions That Are NOT in v1") to keep the doc honest.

---

## 7. Final Lock Summary

**Pre-signature clarifications locked in §5.5 are within existing amendments G and C — no new decision count.**

After this addendum, v1 is execution-ready. Total locked decisions:

- v1 original: 25 decisions
- Amendments A–G: 7 amendments
- Total: **25 + 7 = 32 decisions** governing execution

cc-0017a authoring may begin once:

1. ✅ This addendum is committed to repo (this commit, plus §5.5 clarifications)
2. ✅ PK explicit approval (sign-off below — RECORDED 2026-05-18 v2.79)
3. cc-0017a brief authored to v1 + amendments combined scope
4. cc-0017a brief passes D-01 review

**Until then:** continue manual FAB + reconciliation trigger + night job emissions as today. No new emitter wiring. No m.pipeline_incident changes.

---

## 8. Reviewer Convergence Audit Trail

| Issue | Review 1 (earlier) | Review 2 (ChatGPT-mode) | Review 3 (GitHub-mode) | Locked? |
|---|---|---|---|---|
| Wave 0 too large | ✅ split into a/b | ✅ split into 0a/0b | ✅ split into 0a/0b/0c | YES (Amendment A) |
| Dedupe key inconsistency | — | — | ✅ caught | YES (Amendment B) |
| Triage time not measurable | — | ✅ caught | ✅ caught | YES (Amendment C) |
| Time-only overlap insufficient | — | ✅ caught | ✅ caught | YES (Amendment D) |
| Severity override needed | — | ✅ caught | — | YES (Amendment E) |
| Direct-write enforcement | — | — | ✅ caught | YES (Amendment F) |
| Case lifecycle richer | — | — | ✅ caught | YES (Amendment G) |
| Telegram too late | — | ✅ caught | — | YES (re-sequencing §4) |
| Naming inconsistency | — | ✅ caught | — | YES (§5) |
| Cross-source dedupe v2 | ✅ noted | — | — | NO (v2 scope) |
| SLA auto-expiry v2 | — | ✅ noted | — | NO (v2 scope) |

10 of 11 reviewer findings incorporated into v1 + amendments. 2 acknowledged as v2 scope. Zero reviewer findings rejected.

**Post-commit 4th cross-check (ChatGPT, pre-signature):** PK consulted ChatGPT after v1 + amendments commits to pressure-test the doc before signing. ChatGPT confirmed the architecture is sound and that the concerns raised in the pre-signature chat review are healthy not stop-signs. Two specific residual ambiguities were locked as §5.5 clarifications (reopen window N = 14 days; triage time metric measurement strategy by phase). No new architectural decisions surfaced. The 4th cross-check is captured here for audit trail; it operates outside the structured D-01 / ChatGPT Review MCP infrastructure (planning docs benefit from multi-reviewer perspective; production mutations use D-01).

---

## 9. Sign-Off

**Plan version:** v1 + amendments (this document)
**Architecture review:** complete, 3 independent LLMs + 4th pre-signature cross-check (§5.5)
**Pressure-test:** complete, 4 rounds
**Empirical validation:** complete (26 cron census, 11 output table audit, dedupe gap confirmed)
**Pre-signature clarifications:** locked in §5.5 (reopen window N = 14 days; triage metric measurement strategy)
**Execution gate:** OPEN — PK approval recorded 2026-05-18 Sydney afternoon (v2.79)

PK approval: **Parveen Kumar (PK) — approved 2026-05-18 Sydney**
Date: **2026-05-18**

**Status:** SIGNED. cc-0017a Wave 0a brief authoring is now unblocked. Next session opens with cc-0017a authoring as rank 1.
