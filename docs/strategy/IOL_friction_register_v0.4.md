# ICE Operations Loop (IOL) — Friction Register Experiment

*Document v0.4 — authored 2026-05-14 Sydney. Status: final-form, awaiting PK approval to author cc-NNNN brief.*

*Iteration history: v0.1 (overclaimed autonomy, cut to 20%) → v0.2 (wrong instrumentation) → v0.3 (real cases, real emitters, real categories) → v0.4 (advisor-level polish on taxonomy, fingerprint identity, action criterion, verification rigor). v0.4 reflects nine integrations from the v0.3 final review and four reasoned rejections.*

---

## What this document is

A one-week build + 14-day measurement experiment. Tests whether a consolidated friction register — one place where issues from reconciliation, the nightly health check, and PK's own observations all live — produces operational signal worth the cost of maintaining it.

The experiment is the first step toward a longer-term system called ICE Operations Loop (IOL). The longer-term system is **not in scope here**. Only the experiment is.

Binary outcome at Day 19: pass (all five success criteria met), fail (any criterion not met), or invalid (instrument failure, distinct from failure).

---

## The problem

PK has built ICE. The engine works for two clients. The reconciliation layer (cc-0009 → cc-0012) closes one specific loop at the data layer. The nightly health check (`nightly-health-check-v1`) produces structured priority findings every night.

Operationally, PK is still the message-relayer. Reconciliation cases sit in `r.cadence_drift_log` where nothing surfaces them. Health check findings sit in `docs/audit/health/{date}.md` files PK has to remember to read. Bugs PK notices during dashboard use go into memory or chat sessions and often get lost. Three different friction streams, three different surfaces, no consolidated view.

The hypothesis: **does putting all three streams in one queryable place, with consistent severity and category fields, change PK's operational decisions during a 14-day window?**

---

## Real cases the register will hold

Pulled from production on 2026-05-14. These are not hypothetical examples.

**Case 1 — Property Pulse Instagram observer stale** (reconciliation, client_commitment, info)
Reconciliation noticed no Instagram publishing evidence for Property Pulse in the 14-day window ending 2026-05-13.

**Case 2 — NDIS Yarns YouTube observer stale** (reconciliation, client_commitment, info)
Same shape as Case 1, different client + platform.

**Case 3 — LinkedIn × NDIS Yarns stuck item (new today)** (health_check, pipeline_integrity, critical)
From 2026-05-05 health check Section 10 Priority 1. First appearance of LinkedIn-stuck affecting NDIS Yarns. Worker healthy — items aren't being selected.

**Case 4 — S17 MCP escalation rate breach** (health_check, pipeline_integrity, warn)
From 2026-05-05 health check Section 10 Priority 2. 52.0% escalation rate exceeds 40% threshold. Persistent finding across multiple nightly runs.

Note the volume mix: reconciliation produces ~3 events per week at current rate (low until PRV-2/3/4 lands). Health check produces ~5-10 events per nightly run. Manual capture is unknown — depends on PK behavior. The health check will dominate event volume; case-grouping compresses duplicates.

---

## Architecture

### Three emitters

| Emitter | Source | Method | Default category | Frequency |
|---|---|---|---|---|
| Reconciliation | `r.cadence_drift_log` | SQL trigger on INSERT | client_commitment | event-driven |
| Health check | Cowork brief `nightly-health-check-v1` v2.1 | Dual-write — brief continues writing markdown AND emits to register | pipeline_integrity | nightly |
| Manual capture | Dashboard form | Direct write via Supabase function | category required at capture, dropdown defaults to PK's last choice | ad-hoc |

The health check emitter uses Option Z (locked in prior discussion): the Cowork brief is extended to dual-write. Markdown writing continues unchanged. pg_cron migration of the health check is a deferred architectural cleanup, scheduled post-experiment regardless of outcome.

### Schema (Supabase, new `friction.*` schema)

```sql
CREATE SCHEMA friction;

-- Category reference table — six categories plus 'unclassified' as a triage placeholder
CREATE TABLE friction.category (
  category_code      text PRIMARY KEY,
  display_label      text NOT NULL,
  default_sla_hours  integer,
  description        text,
  counts_for_success boolean NOT NULL DEFAULT true,
  is_active          boolean NOT NULL DEFAULT true
);

INSERT INTO friction.category (category_code, display_label, default_sla_hours, description, counts_for_success) VALUES
  ('client_commitment',    'Client commitment',    24,  'A promise to a client (cadence, platform, content type) is at risk or broken', true),
  ('pipeline_integrity',   'Pipeline integrity',   48,  'The engine itself is misbehaving — stuck items, EF failures, cron drift, security findings', true),
  ('operator_friction',    'Operator friction',    NULL, 'Something makes ICE harder to operate — UI bug, missing affordance, navigation pain', true),
  ('external_dependency',  'External dependency',  72,  'Something outside ICE is blocked or stale — API approvals, OAuth expirations, vendor responses', true),
  ('content_quality',      'Content quality',      24,  'Output quality issue — wrong tone, factual error, compliance miss', true),
  ('unclassified',         'Unclassified',         NULL, 'Triage placeholder — required to be reclassified before quality_flag can be set', false);

-- Events table — immutable, append-only, raw evidence
CREATE TABLE friction.event (
  event_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source              text NOT NULL,
  source_event_id     text NOT NULL,
  observed_at         timestamptz NOT NULL,
  severity            text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  category            text NOT NULL REFERENCES friction.category(category_code),
  category_source     text NOT NULL DEFAULT 'emitter_default' CHECK (category_source IN ('emitter_default', 'manual_at_capture', 'triage_override')),
  reported_by         text NOT NULL CHECK (reported_by IN ('system', 'pk', 'client', 'vendor', 'unknown')),
  problem_key         text NOT NULL,
  observation_text    text NOT NULL,
  related_object      jsonb,
  raw_payload         jsonb,
  dedupe_fingerprint  text NOT NULL,
  emitted_at          timestamptz NOT NULL DEFAULT now(),
  case_id             uuid,
  UNIQUE (source, source_event_id)
);

CREATE INDEX ON friction.event (observed_at DESC);
CREATE INDEX ON friction.event (dedupe_fingerprint);
CREATE INDEX ON friction.event (category, severity);
CREATE INDEX ON friction.event (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX ON friction.event (problem_key);

-- Cases table — triage layer, groups events
CREATE TABLE friction.case (
  case_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title           text NOT NULL,
  first_seen_at        timestamptz NOT NULL,
  last_seen_at         timestamptz NOT NULL,
  event_count          integer NOT NULL DEFAULT 1,
  severity             text NOT NULL,
  category             text NOT NULL REFERENCES friction.category(category_code),
  problem_key          text NOT NULL,
  triage_state         text NOT NULL DEFAULT 'new' CHECK (triage_state IN ('new', 'acknowledged', 'duplicate', 'ignored')),
  quality_flag         boolean,
  capture_reason       text CHECK (capture_reason IN ('missed_without_register', 'would_have_deferred', 'would_have_rediscovered', 'centralized_context', 'routine_log', 'other')),
  capture_reason_note  text,  -- required when capture_reason is missed/deferred/rediscovered
  action_decision      text CHECK (action_decision IN ('act_now', 'track', 'defer_intentionally', 'suppress', 'ignore', 'duplicate')),
  next_review_at       timestamptz,  -- required when action_decision is 'track' or 'defer_intentionally'
  suppression_reason   text,         -- required when action_decision is 'suppress'
  notes                text,
  reviewed_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (
    quality_flag IS NULL OR category != 'unclassified'  -- can't flag quality on uncategorized cases
  ),
  CHECK (
    (action_decision NOT IN ('track', 'defer_intentionally')) OR (next_review_at IS NOT NULL)
  ),
  CHECK (
    (action_decision != 'suppress') OR (suppression_reason IS NOT NULL)
  )
);

CREATE INDEX ON friction.case (triage_state, severity);
CREATE INDEX ON friction.case (category);
CREATE INDEX ON friction.case (next_review_at) WHERE next_review_at IS NOT NULL;
```

### `problem_key` and dedupe fingerprint

`problem_key` is a stable, human-readable identifier of *what kind of problem* the event represents. Derived inside emitter logic from data the emitter already has:

| Source | `problem_key` derivation | Example |
|---|---|---|
| reconciliation | `drift_type` from `r.cadence_drift_log` | `observer_stale`, `under_publication`, `over_publication` |
| health_check | priority finding anchor from brief | `stuck_items_linkedin_ndis_yarns`, `s17_escalation_rate_breach`, `cron_inactive_instagram_publisher` |
| manual | first 50 chars of `observation_text`, lowercased, non-alphanumerics replaced with `_` | `header_overlaps_queue_counter`, `draft_inbox_pagination_broken` |

Dedupe fingerprint:
```
md5(source || problem_key || related_object_hash || category)
```

**Day is deliberately not in the fingerprint.** Recurrence is identified by 7-day case lookup window: when a new event arrives, look for an open case (`triage_state != 'ignored'`) with matching fingerprint linked within the last 7 days. If found, link to that case and update `last_seen_at` and `event_count`. If not, create a new case.

### Reported-by vs source

Reviewer-driven correction in v0.4: `reported_by` is the *channel* (system / pk / client / vendor / unknown), `source` is the *emitter* (reconciliation / health_check / manual). A client reporting a content quality issue is `source='manual'`, `reported_by='client'`, `category='content_quality'`. Encoding the messenger as category would hide what the friction actually is.

For the experiment's three emitters:
- reconciliation: `reported_by='system'`
- health_check: `reported_by='system'`
- manual: `reported_by='pk'` (default; future capture forms may populate `client` or `vendor`)

### Automatic deterministic case grouping (with override)

When a new event arrives:
1. Compute fingerprint
2. Look for open case (triage_state != 'ignored') with matching fingerprint within last 7 days
3. If found: link event to case, update `last_seen_at` and `event_count`, escalate severity if higher
4. If not: create new case with event's fields as initial values

PK can override at triage by splitting cases (move events to a new case) or merging cases (combine two cases). Both leave audit trail in `notes`.

### Day-3 grouping calibration window

If after 72 hours the grouping is producing obvious malformations (distinct issues collapsing into one case, or one issue fragmenting into many cases), PK can adjust the fingerprint or grouping logic *once*. Rules:

- Change must be documented in the run state file
- Change must be applied **retroactively** — all prior events regroup according to new logic
- Change cannot modify success criteria
- Change cannot retroactively reclassify `quality_flag` on cases already triaged

This is calibration, not p-hacking. Past 72 hours: no grouping changes for the rest of the window.

### What happens at triage

PK reviews new cases (target: within 48 hours of `created_at`). For each case, sets:

- `triage_state` — `new` → `acknowledged` | `duplicate` | `ignored`
- `category` — if was `unclassified`, must reclassify before any quality_flag can be set
- `quality_flag` — boolean: is this a quality issue worth tracking?
- `capture_reason` — why this case mattered (or didn't)
- `capture_reason_note` — required when capture_reason is missed/deferred/rediscovered
- `action_decision` — what's next
- `next_review_at` — required when action is `track` or `defer_intentionally`
- `suppression_reason` — required when action is `suppress`
- `notes` — free-form context

---

## Success criterion (compound, locked before start)

The experiment passes if, during the 14-day window, ALL of the following hold:

| # | Criterion | Why |
|---|---|---|
| 1 | At least **6 non-duplicate quality cases** (`quality_flag = true` after triage, distinct cases) | Volume of useful signal |
| 2 | At least **2 distinct real categories** (excluding `unclassified` — it does not count) | Tests breadth: register surfaces different shapes of problem |
| 3 | At least **2 sources** produced quality cases. **Exception**: if a source produced fewer than 3 total events in the window, it is treated as having no opportunity and excluded from the count. | Source mix — proves consolidation works across emitters |
| 4 | At least **3 cases produce concrete action decisions**, including at least **1 `act_now`** OR **1 `defer_intentionally` with explicit `next_review_at`** | Tests downstream operational effect, not passive watchlist accumulation |
| 5 | At least **1 case** has `capture_reason ∈ {missed_without_register, would_have_deferred, would_have_rediscovered}` **with a written `capture_reason_note`** explaining why | Tests incrementality — register surfaced something otherwise lost |

The criterion is fixed before the experiment starts. **No mid-run changes.** Day-3 calibration is for grouping/instrumentation, not criteria.

### Invalidation conditions (distinct from failure)

Outcomes that invalidate the experiment and require redesign before re-running:

- Manual capture form takes more than 30 seconds for typical submission → instrument failure
- More than 40% of events are malformed, mis-routed, or noise → emitter contract failure
- Fewer than 5 total events captured across the 14-day window (any source) → no opportunities
- PK fails to triage within 72 hours for more than half the cases → operator process failure

Invalidation forces remove-and-redesign. Not an extension loophole.

### If criterion fails

Register has not earned its keep. Emitters removed. Table archived (preserved as read-only data for postmortem; no further inserts). Postmortem document authored.

### If criterion passes

The pass unlocks the *next layer of design work only*: a triage/resolution architecture session and a health check pg_cron migration scope. **Autonomy ladder, action catalogue, brief runner, and dry-run engine are not unlocked by this experiment.** They become discussable only after at least one full case lifecycle (capture → triage → action → verification of action's effect) has been observed in production.

This gate is real, not rhetorical. Capture passing does not imply automation readiness.

---

## Verification rigor on the health check emitter

The reviewer's strongest point in v0.3 review: dual-write to the Cowork brief is acceptable as experiment tactic but has three failure modes — split-brain truth, silent partial failure, parser/schema drift. v0.4 addresses this with stable identifiers:

Each health check emission must include:
- `health_check_run_id` (e.g. `nightly-health-check-v1-2026-05-04T160846Z`) — already available in the brief
- `finding_id` (e.g. `priority-1/linkedin-ndis-yarns`) — to be added to the brief as a stable anchor per priority finding
- `markdown_path` (e.g. `docs/audit/health/2026-05-05.md`) — for back-reference

Daily verification (run as part of the next morning's session start):

```sql
-- For yesterday's health check run, compare friction.event rows to markdown findings
WITH yesterday AS (
  SELECT health_check_run_id, finding_id
  FROM friction.event
  WHERE source = 'health_check'
    AND (raw_payload->>'health_check_run_id') = '<yesterday_run_id>'
)
SELECT * FROM yesterday;
-- Manual compare to that day's markdown file's Section 10 priority findings.
-- Mismatch = silent partial failure. Investigate before continuing.
```

ID-level verification, not count-level. Two findings missing and two duplicates can produce a matching count; this catches that.

If verification fails on any single day during the experiment, the run is flagged but does not invalidate the experiment. If verification fails on three or more days, the emitter is broken and the experiment invalidates.

### Hard rule post-experiment

If the experiment passes, no autonomy-layer work begins until the health check has a single canonical source path. Either pg_cron migration is complete, or dual-write is explicitly accepted as a long-term mode with documented risk acceptance.

---

## Build estimate

**One week.** Five working days, conservatively scoped.

| Day | Work |
|---|---|
| 1 | Schema authoring (`friction.category`, `friction.event`, `friction.case` + indexes + CHECK constraints). cc-NNNN brief, D-01, applied via `apply_migration`. |
| 2 | Reconciliation emitter — SQL trigger on `r.cadence_drift_log` INSERT, derives `problem_key` from `drift_type`, writes to `friction.event` with `category='client_commitment'`, `reported_by='system'`. Smoke test on a manual INSERT. |
| 3 | Health check emitter — extend `nightly-health-check-v1` Cowork brief to dual-write. Add stable `finding_id` to each priority finding in Section 10. Each finding becomes one `friction.event` row. Verify on next nightly run with ID-level check. |
| 4 | Manual capture form — minimal Next.js form, reachable from any route via floating action button. Required fields: observation_text, severity, category (with last-choice default), current_route auto-filled. Optional: related_object, notes. |
| 5 | Read surface — minimal `/operations` route in invegent-dashboard showing recent cases sorted by severity + triage_state. Pre-experiment documentation: start date, success criteria locked, kill criteria locked. Begin 14-day window. |

**Day 19:** PK reviews against compound success criterion. Verdict is pass / fail / invalid.

---

## What's explicitly NOT in scope

- **No AI clustering.** Deterministic grouping only.
- **No playbooks.** Action catalogue is post-experiment.
- **No brief runner.** Resolution is out of scope.
- **No dry-run engine.** Out of scope until at least one full case lifecycle is observed.
- **No health check pg_cron migration.** Cowork dual-write only.
- **No CC emitter.** Three emitters only.
- **No customer-facing register.** Operator-only.
- **No autonomy language.** This is capture, not operation.

### Rejected from the v0.3 final review (with reasoning)

- **External-dependency auto-emitter.** Considered and rejected. The experiment doesn't need to test every category — `external_dependency` events can be captured manually if encountered during the window. Adding a third auto-emitter expands scope without proportional benefit to the experiment's core hypothesis.
- **Formal action_list duplication audit at Day-19.** Replaced with a single lightweight check: "did any register quality cases describe issues already tracked in `00_action_list.md`?" Logged in postmortem, not a measurement step.
- **Move category off manual form.** Rejected. Keep category required at capture with last-choice default to avoid under-load classification cost. PK can override at triage if needed.
- **30-day archive expiry on failure.** Over-engineering for a 14-day experiment. Archive on failure, schedule postmortem within 14 days, drop only if explicitly approved post-postmortem.

---

## Risks worth naming

**1. Manual capture discipline.** If PK doesn't write items during the window, criterion 3 (source mix) is at risk. Mitigation: floating action button on every dashboard route, form ≤15 seconds with category dropdown defaulting to PK's last choice. If submission cost exceeds 30 seconds, that's invalidation.

**2. Health check volume could dominate.** ~5-10 events per night × 14 = 70-140 events. Most dedupe into ~15-25 cases via `problem_key`. If grouping is wrong, Day-3 calibration window addresses it.

**3. Reconciliation volume is currently low.** Only 3 cases on 13 May, all info severity. If reconciliation produces zero new cases during the window, criterion 3 still passes via health_check + manual provided the volume-3 exception applies.

**4. Dual-write silent failure.** Markdown succeeds, event emit fails. Mitigation: ID-level daily verification, three-day fail threshold for invalidation, hard rule that autonomy-layer work blocks on single-source canonical health check post-experiment.

---

## Connection to existing ICE infrastructure

- **`r.cadence_drift_log`** — feeds reconciliation emitter, unchanged in structure
- **`docs/audit/health/{date}.md`** — health check continues writing here, emitter adds dual-write
- **`m.chatgpt_review` (D-01)** — unchanged; cc-NNNN brief for the register goes through standard D-01
- **`docs/00_action_list.md`** — continues as human backlog. The register is the *machine backlog*. Day-19 review includes a lightweight duplication check.
- **Cowork nightly health check** — extends to dual-write, adds stable `finding_id` per priority finding. No structural change otherwise.
- **`ICE-PROC-001` patch severity discipline** — friction event severity maps cleanly onto patch severity for items that eventually become briefs.

---

## What changed from v0.3

Reviewer-driven changes integrated:

1. Removed `client_feedback` as category; added `reported_by` field (system / pk / client / vendor / unknown). Six real categories plus `unclassified` as triage placeholder.
2. `unclassified` does not count toward success criterion 2. Enforced by `friction.category.counts_for_success = false`.
3. Removed `severity_ceiling` on `operator_friction`. Impact determines severity, not category.
4. Added `problem_key` field, derived from existing emitter data (no new emitter contract).
5. Removed `day` from dedupe fingerprint. Recurrence handled by 7-day case lookup window.
6. Criterion 4 tightened: 3 actions including at least 1 `act_now` or `defer_intentionally` with `next_review_at`. `suppress` requires `suppression_reason`.
7. `capture_reason_note` required when criterion 5 capture_reason is used.
8. Health check emitter requires stable `health_check_run_id` + `finding_id` + `markdown_path`. ID-level daily verification.
9. Pass consequence narrowed to triage/resolution design + health check pg_cron scope. Autonomy ladder explicitly gated on observed case lifecycle.
10. Day-3 grouping calibration bounded: documented, retroactive, cannot change criteria, cannot reclassify quality_flag.

Reviewer-driven changes rejected with reasoning (above in "What's explicitly NOT in scope").

---

## Review history

- v0.1 — Three hostile reviews converged on six structural problems. Cut to ~20%.
- v0.2 — Three more hostile reviews: instrumentation wrong. Reconciliation auto-emitter didn't test net-new capture.
- v0.3 — Three real emitters, real cases from production, events/cases split, 7 categories, compound success criterion.
- v0.4 (this document) — Advisor-level polish from final hostile review. Nine integrations, four reasoned rejections. Final-form before cc-NNNN authoring.

---

*Document v0.4. cc-NNNN brief authoring follows once approved.*
