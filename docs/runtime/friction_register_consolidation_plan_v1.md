# Friction Register Consolidation Plan — v1

**Status:** PLANNING — not yet executed
**Author:** PK + chat session 2026-05-18 Sydney
**Reviewers needed:** multi-LLM review before any execution
**Supersedes:** ad-hoc thinking in cc-0015 + cc-0016 briefs (those become Wave 7+ in this plan)
**Companion ref:** `docs/06_decisions.md` D-IOL-001 (friction register reframed as standing operational infrastructure)

---

## 1. North Star

> Friction is the operating system's pain ledger. Telemetry stays where it lives. Auto-healing stays where it lives. Anything requiring human awareness, prioritisation, or learning becomes a friction case — exactly once, deduped against `problem_key + related_object`, with full backlinks to raw evidence.

The "exactly once" word matters. It's the discipline that prevents friction from becoming table 12 in an already-crowded diagnostic estate.

---

## 2. Why This Plan Exists

ICE currently has **26 active diagnostic-adjacent crons** writing to **11 distinct output tables**. Many of these surfaces overlap. Several are silently broken. Hundreds of unaddressed signals sit in invisible log tables today:

- 444 dead items + 116 past-due items logged every 30 min by pipeline-doctor — no operator queue
- 141 pipeline-fixer escalations in last 7 days — no operator awareness
- 10 pending compliance reviews from May 1st — reviewer not processing
- 6 unacknowledged slot_alerts (32 critical-severity total)
- 7 open m.pipeline_incident rows
- 22 friction.event rows (the new spine; one per emitter source so far)

The pattern is: every diagnostic agent grew its own output table because no spine existed. Now we have the mess. The friction register, introduced via cc-0014, is the spine candidate. This plan defines what's needed to make it the actual spine — not just another table.

---

## 3. The Four-Layer Architecture (Visual)

```
LAYER 1 — RAW TELEMETRY (stays where it lives)
┌─────────────────────────────────────────────────────────────────────┐
│  m.pipeline_health_log    m.cron_health_snapshot    m.ef_drift_log  │
│  m.pipeline_doctor_log    m.pipeline_fixer_log     r.reconciliation │
│  m.compliance_review_queue   m.slot_alerts    m.platform_token_*    │
│                                                                     │
│  Purpose: audit, history, evidence. Not for operator workflow.      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │  (observation)
                              ▼
LAYER 2 — DETECTORS (existing agents + crons)
┌─────────────────────────────────────────────────────────────────────┐
│  pipeline-sentinel    pipeline-doctor       pipeline-fixer          │
│  cron-health          compliance-monitor    cadence-drift-checker   │
│  token-health         night-health-check    manual-FAB              │
│                                                                     │
│  Purpose: observe telemetry, decide what's worth emitting.          │
│  Detectors do NOT decide severity/category — emission_rule does.    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │  friction.emit_event(...)
                              ▼
              ┌───────────────────────────────────┐
              │   friction.emission_rule          │
              │   friction.source                 │
              │                                   │
              │   Resolves: severity, category,   │
              │   case_policy, problem_key        │
              └───────────────────────────────────┘
                              │
                              ▼
LAYER 3 — friction.event (FACTS — immutable)
┌─────────────────────────────────────────────────────────────────────┐
│  Every observation worth knowing about. Indexed by                  │
│  dedupe_fingerprint. Attached to a case via case_id FK.             │
│                                                                     │
│  Purpose: "Something happened worth triaging."                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │  trigger: attach-to-open-case-or-create
                              ▼
LAYER 4 — friction.case (DECISIONS — mutable)
┌─────────────────────────────────────────────────────────────────────┐
│  Deduped by problem_key + related_object + source.                  │
│  Many events → one case (event_count grows).                        │
│  Triage state, action decision, effort_level, resolved_at.          │
│                                                                     │
│  Purpose: "What is the operator going to do about it?"              │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
        OPERATOR UI       TELEGRAM        SUPPRESS/RESOLVE
        /operations      (notification    (close lifecycle)
        Pool view         policy)
```

**Key invariants:**
- Events are immutable facts. Cases are mutable decisions.
- Telemetry tables are NEVER replaced by friction. They remain audit.
- Notifications hang off case lifecycle, not detector code.
- One emission entrypoint = one place to inspect, tune, and audit.

---

## 4. Current Diagnostic Estate (Empirical Inventory)

### Active crons (26 total)

| Category | Crons |
|---|---|
| **Telemetry samplers (keep as-is)** | pipeline-health-snapshot-30m, cron-health-every-15m, pipeline-ai-summary-hourly |
| **Self-healing loop (keep, route escalations to friction)** | pipeline-doctor-every-30m, pipeline-fixer-30min, pipeline-healer-every-15m, incident-auto-resolver-every-30m |
| **Reconciliation lineage (working, wired)** | cadence_rule_generator_daily, reconciliation_matcher_30min, cadence_drift_checker_weekly (now daily) |
| **EF drift detection** | drift-check-daily-fire, ef-drift-log-retention-90d |
| **Critical windows / pool maintenance** | critical-window-monitor-every-30m, pool-health-check-hourly, reconcile-signal-pool-daily, expire-signal-pool-hourly, backfill-missing-pool-entries-every-15m |
| **Pipeline-incident-based (sentinel + harvester)** | pipeline-sentinel-every-15m, pipeline-doctor-log-harvester |
| **Compliance** | compliance-monitor-monthly, compliance-reviewer-monthly |
| **Token health (3 mechanisms, 2 dormant)** | token-health-daily-7am-sydney, token-expiry-alert-daily |
| **AI doctor (broken)** | ai-diagnostic-daily |
| **Friction internal** | friction-verification-daily |

### Output tables (11 distinct)

| Table | Rows | Latest write | Verdict |
|---|---|---|---|
| `m.pipeline_health_log` | 2864 | live | **KEEP** — sampler, audit |
| `m.pipeline_doctor_log` | 2226 | live | **KEEP raw log, ROUTE escalations** |
| `m.pipeline_fixer_log` | 2295 | live | **KEEP raw log, ROUTE escalations** |
| `m.pipeline_ai_summary` | 680 | live | **KEEP** — narrative summary |
| `m.ef_drift_log` | 906 | live | **KEEP** — needs consumer audit |
| `m.cron_health_snapshot` | 130 | live | **KEEP** — sampler |
| `m.cron_health_alert` | 46 (resolved) | live | **KEEP lifecycle, ROUTE material opens** |
| `m.pipeline_incident` | 76 (7 open) | live | **HISTORICAL** after dual-write proves agreement |
| `m.slot_alerts` | 48 (6 unack) | unknown | **ROUTE unacknowledged to friction** |
| `m.compliance_review_queue` | 11 (10 pending) | 2026-05-01 | **FIX reviewer, ROUTE pending to friction** |
| `m.ai_diagnostic_report` | 0 | never | **INVESTIGATE then retire if no value** |
| `m.platform_token_health` | 0 | never | **RETIRE** (after parity confirmed) |
| `m.token_expiry_alert` | 0 | never | **RETIRE** (after parity confirmed) |
| `friction.event` | 22 | live | **CANONICAL SPINE** |

### Empirical gap (most important finding from pressure-test)

**Current dedupe is NOT working as the design assumes.**

| Metric | Current value | Implication |
|---|---|---|
| total events | 22 | — |
| total cases | 22 | — |
| events with case_id | 22 | every event attached |
| max events per case | 1 | **NO AGGREGATION HAPPENING** |
| avg events per case | 1.00 | every event spawns its own case |

The `friction.fn_promote_event_to_case` BEFORE INSERT trigger creates a new case per event rather than attaching to an open case sharing the same dedupe_fingerprint. This must be fixed in Wave 0 before any new emitters are wired in, or the spine will accumulate noise faster than operator can triage.

---

## 5. The 25 Locked Decisions

### Architecture (1–6)

1. **Four-layer architecture: telemetry → detectors → events → cases → action.** Manual FAB bypasses the detector layer (operator → emit_event directly).
2. **Friction is the triage register, not the telemetry warehouse.** Every emission_rule decision is inspectable so we can answer "why didn't this telemetry produce a friction event?"
3. **Events are facts. Cases are decisions.** Foundational principle. Drives schema invariants.
4. **Central `friction.emit_event` entrypoint.** Detectors never write to friction.event directly. Three existing emit_* functions migrate to thin wrappers over emit_event in v1.
5. **`friction.emission_rule` table** for category/severity/dedupe/case-creation policy, with `problem_key_formula` column documenting per-source formula. emit_event rejects calls where no rule exists. Rule changes audited in a history table.
6. **`friction.notification_policy` table** separate from emission_rule. Emission decisions ≠ notification decisions.

### Dedupe and aggregation (7–10)

7. **Dedupe at `problem_key + related_object + source`.** Dedupe attaches events only to OPEN cases (per Decision #25). problem_key formula documented per emission_rule.
8. **Aggregation pattern: many events → one case with event_count and backlinks.** Schema already supports this (event_count column on case, case_id FK on event). What's missing is trigger logic — addressed in Wave 0.
9. **Meta-cases for runaway emitters** — **DEFERRED TO V2.** Needs observed volume baselines first.
10. **No silent suppression.** Events are always recorded. Suppression operates at case level (events attach to existing case rather than spawning new cases). event_count grows; raw events remain queryable.

### Migration strategy (11–15)

11. **Sentinel dual-write overlap.** Sentinel writes to both m.pipeline_incident AND friction.event until success criterion met: "every m.pipeline_incident write produces a friction.event with consistent severity; no operator-noticed gaps for 14 days." Audit all writers to m.pipeline_incident before starting (sentinel + auto-resolver, possibly others).
12. **m.pipeline_incident becomes historical post-overlap.** Backfill 7 currently-open incidents into friction.case so operator sees them in /operations.
13. **Doctor escalation emission.** Emit only when fixes_applied fails, repeats N times, or finds same issue persistently. Group emissions by platform × client (matching night job pattern).
14. **Fixer escalations + slot_alerts + compliance pending → friction.** cadence_drift already wired (trigger live on r.cadence_drift_log).
15. **Token simplification (two-step).** Add direct-query approach to night job FIRST; verify parity with existing mechanisms; THEN retire dormant writers. Not same-wave retire.

### Telegram (16–17)

16. **Telegram moves from sentinel-owned to case-lifecycle-driven.** v1 simplest implementation: trigger on case INSERT for severity=critical only. Re-escalation logic and warn-batching are v2.
17. **Notification policy lives in `friction.notification_policy` table.** Separate from emission_rule.

### Effort and triage (18–19)

18. **`effort_level` column on case at triage, optional.** Values: quick (<30 min) / moderate (30 min – 2 hours) / deep (>2 hours). Time anchors documented to prevent drift.
19. **Pool view designed after absorbing one week of empirical volume.** cc-0015 Stage A (schema additions: effort_level + dashboard_ui category split) can run parallel to emitter wiring. Stages B–F wait for volume data.

### Sequencing (20–22)

20. **Absorb full firehose first, observe one week, then design pool view.** Avoids designing UI against assumptions.
21. **Two distinct sequences tracked:**
    - Investigation order (broken surfaces): compliance reviewer → doctor/fixer behaviour → token → ai_diagnostic
    - Execution order (new wiring): schema foundation → compliance → doctor/fixer → sentinel dual-write → slot_alerts → token → Telegram → pool view → evidence → ai_diagnostic → historical mode
22. **Five v1 emission credibility requirements:** strict contract, dedupe discipline, case lifecycle ownership, suppression rules, backlinks to evidence. Sixth (emit rate ceiling) is v2.

### Foundational schema fixes (23–25, surfaced by pressure-test)

23. **Fix `friction.fn_promote_event_to_case` to attach-to-open-case by dedupe_fingerprint.** Use `INSERT … ON CONFLICT` against a partial unique index `friction.case (dedupe_fingerprint) WHERE resolved_at IS NULL` to handle race conditions under concurrent emit_event calls.
24. **Replace `friction.event.source` CHECK constraint with FK to `friction.source` registry.** New sources added without DDL. Source has metadata (display_label, owner, default_severity, default_category, deprecated_at). Strict registration: emit_event fails if source not pre-registered.
25. **Define "case is open" explicitly via `friction.case.resolved_at` column.** Case is open iff `resolved_at IS NULL`. Auto-set `resolved_at = now()` when action_decision IN ('suppress','ignore','duplicate'). Operator explicit close for 'act_now', 'defer_intentionally', 'track'.

---

## 6. The v1 Emission Contract (Schema Sketch)

```sql
-- 6.1 Source registry
CREATE TABLE friction.source (
  source_code              text PRIMARY KEY,
  display_label            text NOT NULL,
  owner                    text NOT NULL,
  default_severity         text NOT NULL CHECK (default_severity IN ('info','warn','critical')),
  default_category_code    text NOT NULL REFERENCES friction.category(category_code),
  is_active                boolean NOT NULL DEFAULT true,
  deprecated_at            timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- Seed with current 3 sources to preserve continuity
INSERT INTO friction.source VALUES
  ('reconciliation', 'Reconciliation drift', 'system', 'warn', 'client_commitment', true, NULL, now()),
  ('health_check',   'Night health check',   'system', 'warn', 'pipeline_integrity', true, NULL, now()),
  ('manual',         'Manual FAB',           'pk',     'info', 'unclassified', true, NULL, now());

-- 6.2 Emission rule
CREATE TABLE friction.emission_rule (
  rule_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source               text NOT NULL REFERENCES friction.source(source_code),
  condition_key        text NOT NULL,
  enabled              boolean NOT NULL DEFAULT true,
  default_severity     text CHECK (default_severity IN ('info','warn','critical')),
  default_category     text REFERENCES friction.category(category_code),
  problem_key_formula  text NOT NULL, -- docs the per-source dedupe shape
  dedupe_scope         text NOT NULL DEFAULT 'open_cases',
  case_policy          text NOT NULL DEFAULT 'auto_create',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, condition_key)
);

-- 6.3 Emission rule history (audit who changed what)
CREATE TABLE friction.emission_rule_history (
  history_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id      uuid NOT NULL REFERENCES friction.emission_rule(rule_id),
  changed_at   timestamptz NOT NULL DEFAULT now(),
  changed_by   text NOT NULL,
  change_kind  text NOT NULL CHECK (change_kind IN ('insert','update','enable','disable','delete')),
  before_row   jsonb,
  after_row    jsonb
);

-- 6.4 Notification policy
CREATE TABLE friction.notification_policy (
  policy_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text REFERENCES friction.category(category_code),
  severity       text NOT NULL CHECK (severity IN ('info','warn','critical')),
  case_state     text NOT NULL, -- new / re-escalated / stale_open / resolved
  notify_telegram boolean NOT NULL DEFAULT false,
  notify_threshold_minutes integer,
  enabled        boolean NOT NULL DEFAULT true,
  UNIQUE (category, severity, case_state)
);

-- 6.5 Case closure
ALTER TABLE friction."case"
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN effort_level text CHECK (effort_level IS NULL OR effort_level IN ('quick','moderate','deep'));

-- 6.6 Partial unique index for race-safe dedupe
CREATE UNIQUE INDEX case_open_dedupe_uniq
  ON friction."case" (problem_key, severity)
  WHERE resolved_at IS NULL;
-- Note: real predicate uses (dedupe_fingerprint, source) — finalised in cc-0017

-- 6.7 Unified emit_event function (sketch)
CREATE FUNCTION friction.emit_event(
  p_source            text,
  p_condition_key     text,
  p_source_event_id   text,
  p_observed_at       timestamptz,
  p_related_object    jsonb,
  p_observation_text  text,
  p_raw_payload       jsonb,
  p_reported_by       text DEFAULT 'system'
) RETURNS TABLE (event_id uuid, case_id uuid, attached_to_existing boolean)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_rule           friction.emission_rule;
  v_dedupe         text;
  v_existing_case  uuid;
  v_event_id       uuid;
BEGIN
  -- 1. Resolve rule (REJECT if not registered — strict contract)
  SELECT * INTO v_rule FROM friction.emission_rule
   WHERE source = p_source AND condition_key = p_condition_key AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emission_rule not registered for source=% condition_key=%', p_source, p_condition_key;
  END IF;

  -- 2. Compute dedupe fingerprint per rule's problem_key_formula
  -- (formula evaluation logic — detail in cc-0017)

  -- 3. Try to attach to existing open case
  -- SELECT case_id FROM friction.case WHERE problem_key=... AND resolved_at IS NULL FOR UPDATE
  -- IF FOUND: increment event_count, set last_seen_at, INSERT event with case_id
  -- IF NOT FOUND: INSERT case, INSERT event with new case_id

  -- 4. Return (event_id, case_id, attached_to_existing)
END;
$$;
```

This is illustrative — the precise SQL is finalised in cc-0017 with D-01 review.

---

## 7. Migration Sequence (10 Waves)

Each wave is a separate brief; each requires D-01 review before execution.

```
Wave 0 ── cc-0017 ── Schema foundation
            │
            │   - friction.source registry
            │   - friction.emission_rule + history
            │   - friction.notification_policy
            │   - friction.case.resolved_at + effort_level
            │   - Partial unique index for race-safe dedupe
            │   - Unified friction.emit_event() function
            │   - Replace promote_event_to_case trigger with attach-or-create logic
            │   - Drop event.source CHECK; add FK to friction.source
            │   - Migrate 3 existing emit_* functions to thin wrappers
            │   - Backfill resolved_at on existing closed-state cases
            ▼
Wave 1 ── cc-0018 ── Compliance reviewer fix + emission
            │   Highest business risk: 10 pending reviews from May 1
            ▼
Wave 2 ── cc-0019 ── Doctor/fixer behaviour audit + selective emission
            │   Map exact division of labour across doctor/fixer/healer/auto-resolver
            │   Then emit escalations grouped by platform × client
            ▼
Wave 3 ── cc-0020 ── Sentinel dual-write retrofit
            │   Audit all writers to m.pipeline_incident first
            │   Sentinel keeps writing m.pipeline_incident AND emits to friction
            │   2-week overlap → success criterion → freeze m.pipeline_incident
            ▼
Wave 4 ── cc-0021 ── slot_alerts emitter
            ▼
Wave 5 ── cc-0022 ── Token simplification
            │   Add direct query first; verify parity; retire dormant later
            ▼
Wave 6 ── cc-0023 ── Telegram → case-lifecycle trigger
            │   Replace sentinel-owned Telegram path
            ▼
Wave 7 ── cc-0015 ── Pool view design (with 1-week empirical volume data)
            │   Stage A (schema: effort_level + dashboard_ui split) parallel-eligible from Wave 0
            │   Stages B–F land here
            ▼
Wave 8 ── cc-0016 ── Evidence/attachments
            │   Unchanged from existing brief
            ▼
Wave 9 ── cc-0024 ── ai_diagnostic investigation
            │   Empty for weeks. Fix or retire — explicit decision required.
            ▼
Wave 10 ── cc-0025 ── m.pipeline_incident historical-only mode
            │   Backfill 7 open incidents to friction.case
            │   Disable writes to m.pipeline_incident
```

---

## 8. Investigation Order for Broken Surfaces

Distinct from execution order. Investigations land within their owning wave.

| Order | Surface | Wave | Question to answer |
|---|---|---|---|
| 1 | compliance-reviewer | Wave 1 | Does it still produce useful AI analysis? Fix or retire? |
| 2 | pipeline-doctor / fixer / healer / auto-resolver | Wave 2 | What's the exact division of labour? What auto-fixes vs labels? |
| 3 | token health (3 mechanisms) | Wave 5 | Which of the 3 actually works? Parity check vs direct query |
| 4 | ai_diagnostic | Wave 9 | Has it ever produced useful output? Spec gap or implementation gap? |

Each is a 30-60 min investigation, not a multi-day deep dive. Findings inform the corresponding wave's emit-or-retire decisions.

---

## 9. Open Questions Deferred to Execution

Questions left unanswered at planning time, to be resolved when their wave is scoped:

1. **m.ef_drift_log** (906 rows, daily writes): who reads it? If nobody, retire after Wave 0.
2. **m.scan_critical_windows() → m.slot_alerts**: is "critical window" client-facing cadence (overlap with reconciliation) or separate?
3. **Cron 78 (critical-window-monitor)** and **Cron 79 (pool-health-check-hourly)**: are these signal-pool maintenance or diagnostic? Confirm scope before deciding emit-or-not.
4. **Telegram bot details** (token, chat ID): currently sentinel-owned; will move to notification policy in Wave 6.
5. **Exact problem_key formula per source**: defined during each emitter's wave, not at planning.
6. **Backfill granularity for m.pipeline_incident**: do all 76 rows backfill or only the 7 open? Likely only open + a few historical highlights.

---

## 10. Success Criteria — How We'll Know the Spine Is Working

After Wave 6 (all major emitters wired, Telegram migrated):

| Criterion | Target |
|---|---|
| `friction.case` has > 1 case with `event_count > 1` | yes — dedupe demonstrably working |
| `friction.event.source` distinct values | ≥ 6 (was 3) |
| Friction events/day average | 10–100, not 1000+ |
| Open cases > 30 days old | 0 (else SLA discipline broken) |
| Sources emitting per emission_rule (no rogue writes) | 100% |
| New emitter added without DDL | yes — registry pattern proven |
| Telegram pings only on critical case INSERT | yes — no parallel alert paths |
| m.pipeline_incident new writes | 0 (after dual-write proves agreement) |
| 444 dead items + 116 past-due visible in /operations | yes — invisible signal now visible |
| Operator triage time per case | < 2 min average |

If any of these fail after Wave 6, the consolidation is incomplete and needs an addendum wave before being declared done.

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Dedupe logic in new trigger has a bug; cases under-collapse or over-collapse | D-01 review on cc-0017 must include explicit test cases: 16-event reconciliation burst → 1 case; cross-source events with same fingerprint → handled correctly |
| New emitters produce more volume than pool view can absorb | Wave 6 review checkpoint: if friction events > 200/day for any wave, pause before next |
| Existing 3 emit functions break during migration | Wave 0 keeps them as thin wrappers — backwards compatibility for in-flight callers |
| Telegram channel deluged by new case INSERTs | v1 limits to critical severity only; notification_policy makes future tuning trivial |
| Pipeline-doctor auto-fixes broken by Wave 2 changes | Wave 2 starts with read-only audit; no write changes until division of labour is documented |
| m.pipeline_incident open incidents lost during freeze | Wave 10 explicit backfill step; verify count match before disabling writes |

---

## 12. Decisions That Are NOT in v1

Explicitly deferred to v2 or later:

- Meta-cases for runaway emitters (need volume baseline first)
- Emission rate ceiling per source (need volume baseline first)
- Telegram warn-batching and stale-open re-escalation (v1 has critical-only on INSERT)
- Full rule engine with complex evaluation logic (v1 has static rule lookup)
- Auto-categorisation by LLM (manual category assignment via emission_rule for now)
- Cross-source dedupe (two emitters report the same underlying problem) — needs research
- Friction → action calendar integration (deferred until pool view operational)

---

## 13. What This Plan Replaces

- The ad-hoc emit_event design implied across cc-0014 + cc-0015 + cc-0016 briefs (those briefs become wave components)
- Memory item "cc-0015 + cc-0016 unblocked and parallel-executable" — superseded by wave sequencing
- Multiple session-level discussions about "should friction be the spine" — answered: yes, with conditions
- The unstated assumption that current dedupe-via-fingerprint is working — empirically falsified

---

## 14. Multi-LLM Review Request

This document is ready for review by independent LLMs (ChatGPT, Gemini, others). Specific questions to test:

1. **Are the 25 locked decisions complete?** What's missing?
2. **Is the 4-layer architecture cleanly separated?** Any cross-layer leakage we're not seeing?
3. **Is the wave sequencing right?** Should anything land earlier or later?
4. **Are the success criteria measurable?** What can't be measured?
5. **Are the risks correctly weighted?** What risks are missing?
6. **Does the schema sketch (Section 6) preserve enough flexibility for v2?** Any irreversible design choices?
7. **Is Wave 0 too large?** Should it split into 0a + 0b?
8. **The "2-week overlap" criterion for sentinel dual-write — sufficient?** Or should it be event-count-based rather than time-based?

Reviewers: flag any "yes but…" answers explicitly. Don't paper over disagreements.

---

## 15. Sign-Off

This is **v1 of the plan**. It is not execution scope until:
- Multi-LLM review surfaces no material gaps
- PK explicit approval
- cc-0017 brief authored (Wave 0)
- D-01 review of cc-0017 returns approved

Until then: continue manual FAB + reconciliation trigger + night job emissions as today. No new emitter wiring. No m.pipeline_incident changes.

