# §10 — Product Objects and Data Model

## Purpose

Define the product objects and data primitives required to implement the §6 final design. This is a contract doc for engineering, not a migration plan.

No SQL DDL. No schema changes. No code edits. The doc commits to attribute names, semantics, lifecycles, and cross-object relationships at a level where engineers can derive their own DDL with confidence about intent.

The primitives committed here are:

1. `m.attention_item` — unifies Inbox sources
2. Pipeline state primitive — formalises §6.5 canonical states
3. Agent status primitive — unifies per-agent health
4. Scope primitive — client / platform / workflow scoping for multi-tenant readiness
5. `m.brief` — finalises §8.8 Q2
6. Action-event / audit primitive — audits everything in §6.2.c Action Layer
7. Build-blocking decisions — what locks before Phase 0; what waits

Notation conventions used below:
- **v1 required**: attribute MUST exist by Phase 1 ship
- **v1 optional**: attribute is allowed to be NULL or omitted in v1 implementation
- **v2 reserved**: attribute name and shape committed now; population deferred to v2
- **Polymorphic reference**: a `source_table` + `source_id` pair (no DB FK) referring to the originating row in the upstream source table

## Section-numbering note

The kickoff plan put "Page-by-page fate" at §6, "Migration sequence" at §10, and "Risks / open decisions" at §11. In practice §6 absorbed page-fate, §9 absorbed migration sequencing, and this doc takes the slot vacated. §11 will reconcile the `00_overview.md` 11-section table.

---

## 10.1 `m.attention_item` (Inbox source-of-truth + Brief Alert candidate pool)

### Purpose

A single canonical record for any item requiring operator attention. Replaces the implicit cross-table union currently driving the dashboard's `/inbox` (drafts) and `/compliance` Review Queue (policy alerts). Becomes the backing source for NOW > Daily > Inbox per §6.6 and the candidate pool for Brief Alerts per §8.2.

Without `m.attention_item`, every new attention type (format escalation, severe ack, agent recommendation) requires a new UNION branch in the Inbox query and a new escalation pathway. With it, attention-worthy items live in one shape and consumers (Inbox UI, Brief generator, Telegram push) read from one place.

### Item types

Four types in v1; reserved namespace for v2.

| Type | Subtype examples | Source upstream | Triggered by |
|---|---|---|---|
| `draft` | (none in v1) | `m.post_draft` | Auto-approver flags draft as `needs_review` AND requires operator decision |
| `policy` | (none in v1) | `m.compliance_review_queue` (existing source) | Compliance-reviewer detects policy change with operator-relevant impact |
| `format` | `format-advisor` | Format-advisor decision log | Format-advisor returns low confidence on format choice |
| `agent` | `pipeline-doctor`, `auto-approver`, `ai-diagnostic`, `compliance-reviewer`, `ai-worker` | Agent-specific log table | Agent SEVERE event, recommendation requiring decision, or stuck-item escalation |

v2 reserved types: `external_review` (commit-reviewer), `client_request` (portal), `infrastructure` (token expiry, rate limit, etc.).

Note on `infrastructure` items: token expiry alerts and similar are surfaced today via Overview banner. v1 does NOT route them through `m.attention_item` because the existing banner pattern works. v2 type reserved for unification when Brief surface absorbs more banner content.

### Severity model

Four levels; LOW excluded from v1 Inbox per §6.6.

| Severity | Examples | Inbox v1 surface |
|---|---|---|
| `CRITICAL` | HARD_BLOCK compliance flag on a draft; severe doctor auto-fix awaiting ack; expired token blocking publish (v2) | YES — always at top |
| `HIGH` | Auto-approver gate failure with high impact; policy-change alert flagged "high relevance"; agent recommendation marked `human_action_required` | YES |
| `MEDIUM` | Format-advisor low-confidence; agent recommendation without `human_action_required` | YES |
| `LOW` | Informational items | NO (excluded v1; reconsider per §6.9 deferred list) |

Severity is set at item creation by the upstream source. Severity may change over time (e.g. HIGH escalates to CRITICAL when token expiry window shortens); update path per §10.6 audit.

### Ownership

Ownership names who is expected to act on the item.

| Ownership value | v1 meaning | v2 meaning |
|---|---|---|
| `operator` | The single operator (PK) sees and acts | Operator role; PK or virtual assistant per `docs/05_risks.md` Risk 6 |
| `client:<slug>` | Reserved; no items routed here in v1 | Client portal sees and acts; RLS enforces isolation per scope primitive |
| `auto` | Item resolves automatically (e.g. transient agent recommendation that self-clears); rare in v1 | Same |

v1 default for all created items: `operator`.

### Lifecycle

States and transitions:

```
             ┌──────────────────────┐
             │  superseded         │
             └─▲─────────────────────┘
               │
  created → pending → in_progress → resolved → (terminal)
               │
               └→ dismissed → (terminal)
               │
               └→ escalated → (terminal; may create new attention_item)
               │
               └→ expired → (terminal; TTL passed without operator action)
```

State definitions:

| State | Meaning | Transition into | Transition out |
|---|---|---|---|
| `pending` | Created, awaiting operator | created | in_progress / dismissed / escalated / expired / superseded |
| `in_progress` | Operator started work, not yet complete; transient state, optional in v1 | pending | resolved / pending (if abandoned) |
| `resolved` | Operator action taken; underlying issue addressed | pending / in_progress | (terminal) |
| `dismissed` | Operator marked as not actionable / not relevant | pending | (terminal) |
| `escalated` | Operator escalated to deeper investigation; may create a new attention_item with `escalated_to` link | pending | (terminal; new item created) |
| `expired` | TTL passed without operator action; auto-expired by cleanup cron | pending | (terminal) |
| `superseded` | A newer item replaced this one (e.g. new severe alert about same subject); auto-set when the newer item's `supersedes` references this one | pending | (terminal) |

v1 implementation note: `in_progress` may be omitted (operator goes pending → resolved directly); the state is reserved for v2 multi-step workflows.

### Required attributes

| Attribute | Type class | Nullable | Tier | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | v1 required | Primary key |
| `type` | enum (`draft`, `policy`, `format`, `agent`) | NO | v1 required | One of the four v1 types; new types require contract amendment |
| `subtype` | text | YES | v1 required | More granular tag, e.g. `agent.pipeline-doctor`. Free-form text; no enum constraint |
| `severity` | enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) | NO | v1 required | LOW excluded from Inbox v1 |
| `state` | enum (`pending`, `in_progress`, `resolved`, `dismissed`, `escalated`, `expired`, `superseded`) | NO | v1 required | Default `pending` on create |
| `title` | text | NO | v1 required | Short display string, ~60 chars, used in Inbox row + Brief Alerts |
| `body` | text | YES | v1 required | Longer context displayed when item expanded |
| `action_required` | enum (`approve`, `ack`, `review`, `investigate`, `configure`) | NO | v1 required | Drives action button in Inbox UI |
| `source_table` | text | NO | v1 required | Polymorphic reference: which `m.*` or `c.*` table this item describes |
| `source_id` | uuid | NO | v1 required | Polymorphic reference: row id in `source_table` |
| `scope` | jsonb | NO | v1 required | Per scope primitive §10.4; v1 default `{type: 'global'}` |
| `assignee` | text | NO | v1 required | `operator` in v1; `client:<slug>` reserved for v2 |
| `created_at` | timestamptz | NO | v1 required | |
| `updated_at` | timestamptz | NO | v1 required | Auto-updated on state change |
| `resolved_at` | timestamptz | YES | v1 required | Set when state transitions to terminal |
| `ttl_until` | timestamptz | YES | v1 optional | Optional expiration; cleanup cron expires past-due items |
| `escalated_to` | uuid | YES | v1 required | Self-reference to a successor item if state=escalated |
| `supersedes` | uuid | YES | v1 required | Self-reference to a prior item this one replaces |
| `payload` | jsonb | YES | v1 required | Type-specific extras; e.g. for `policy` items: `{rule_key, suggested_text, source_url}` |
| `resolution_action_id` | uuid | YES | v1 required | Reference to `m.action_event.id` when state=resolved |

### Relation to Inbox and Brief

**Inbox (NOW > Daily > Inbox).**
```
SELECT * FROM m.attention_item
WHERE state = 'pending'
  AND severity != 'LOW'
  AND assignee = 'operator'
ORDER BY
  CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 END,
  created_at ASC
```

Filter chips (per §6.6) bind to `type` column.

**Brief Alerts (NOW > Daily > Overview Brief block).**

Brief Alerts pull from the same source but apply salience scoring per §8.2:
```
salience = severity_weight × time_decay × novelty
filter: severity IN ('CRITICAL', 'HIGH')
select: top 3 by salience, with CRITICAL always pinned
```

Note: Brief Decisions are NOT directly populated from `m.attention_item`. Decisions are constructed by templated logic + LLM enrichment; some Decisions may reference attention_items (e.g. "28 drafts on body-length gate" references the count of `type=draft` items with that subtype) but Decisions are not 1:1.

### Lifecycle hooks (where items get created)

v1 creators:

| Source | When created | Created by |
|---|---|---|
| Auto-approver flag on draft | When `m.post_draft.approval_status` set to `needs_review` AND `auto_approver_decision = 'flag'` | ai-worker EF |
| Compliance-reviewer policy detection | When compliance-reviewer detects policy change with relevance score ≥ threshold | compliance-reviewer EF |
| Format-advisor low-confidence | When format-advisor returns confidence < threshold | format-advisor EF |
| Pipeline-doctor SEVERE event | When `m.pipeline_doctor_log` row written with `severity='severe'` | doctor EF |
| Stuck item escalation | When item stuck > 6h beyond doctor-fix window | background sweep cron |
| Calibration trend warning | When auto-approver pass rate drops > 10pp WoW | calibration cron |

v2 reserved creators: external-reviewer, client-portal, infrastructure-monitor.

### Backfill at Phase 0

Per §9.3, Phase 0 creates `m.attention_item` (additive). Backfill plan:

1. Backfill `type=draft` items from existing `m.post_draft WHERE approval_status='needs_review'`
2. Backfill `type=policy` items from existing compliance review queue
3. `type=format` and `type=agent` start empty; created by upstream EFs as those EFs gain creator hooks in Phase 1–3

Backfill writes idempotently using a `(source_table, source_id)` natural key check.

---

## 10.2 Pipeline state primitive

### Purpose

Formalise the canonical states from §6.5 as a derived view that operates as the source of truth for Pipeline (NOW > Daily) + Pipeline Log (NOW > Investigate) + per-client roll-ups (CLIENTS > [client]) + Brief Pipeline counts.

Without this primitive, every consumer (Pipeline swimlane page, Pipeline Log table, Brief input query, CLIENTS drilldown) re-implements the same JOIN logic across `m.digest_item` + `m.ai_job` + `m.post_draft` + `m.post_publish_queue` + `m.post_publish`. With it, all consumers read one shape.

### Final canonical states

```
pending_draft  →  drafting  →  needs_review  →  queued  →  publishing  →  published
                       ↓                  ↓                                       
                      dead              dead                                   
                       ↑                  ↑                                       
                       ┗────  failed  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Source fields

| State | Source signal |
|---|---|
| `pending_draft` | `m.digest_item` row exists, no `m.ai_job` row references this `digest_item_id` (legacy v3) OR no slot-driven draft created yet (v4) |
| `drafting` | `m.ai_job.status` IN (`pending`, `running`) for this draft seed |
| `needs_review` | `m.post_draft.approval_status = 'needs_review'` |
| `queued` | `m.post_publish_queue.status = 'queued'` |
| `publishing` | `m.post_publish_queue.status = 'locked'` |
| `published` | `m.post_publish` row exists with `platform_post_id IS NOT NULL` |
| `failed` | `m.post_publish_queue.status = 'failed'` (retry possible) |
| `dead` | Any of `m.post_draft.approval_status = 'dead'`, `m.post_publish_queue.status = 'dead'`, `m.ai_job.status = 'dead'` |

### Derivation logic

The canonical state for any pipeline row is computed from the combined state of all related rows. Precedence rules (highest wins):

1. If any related row is `dead` → state = `dead`
2. Else if `m.post_publish` exists with `platform_post_id` → state = `published`
3. Else if `m.post_publish_queue.status = 'failed'` → state = `failed`
4. Else if `m.post_publish_queue.status = 'locked'` → state = `publishing`
5. Else if `m.post_publish_queue.status = 'queued'` → state = `queued`
6. Else if `m.post_draft.approval_status = 'needs_review'` → state = `needs_review`
7. Else if `m.ai_job.status` IN (`pending`, `running`) → state = `drafting`
8. Else if `m.digest_item` exists → state = `pending_draft`
9. Else → state is undefined (orphan row; surface in honest limitations)

### Edge cases

From §6.HONEST and resolved here:

| Edge case | Resolution |
|---|---|
| `m.post_draft.approval_status='dead'` AND `m.post_publish_queue.status='queued'` for same `post_draft_id` | state = `dead` (precedence rule 1; drafts state takes precedence) |
| `m.post_publish` row exists AND `m.post_publish_queue.status='failed'` (race) | state = `published` (precedence rule 2; success completes) |
| `m.ai_job.status='dead'` AND `m.post_draft` doesn't exist | state = `dead` (precedence rule 1) |
| Slot-driven draft (v4) with `digest_item_id IS NULL` | LEFT JOIN handles; precedence rules unaffected; per `userMemories` Lesson #?? slot-driven pattern |
| Multiple `m.ai_job` rows for same draft seed (retries) | Use most recent by `created_at` |

### Required attributes (view contract)

| Attribute | Type class | Description |
|---|---|---|
| `pipeline_row_id` | uuid | Stable identifier per pipeline row; derived from primary upstream row (e.g. `post_draft.id` if exists, else `digest_item.id`, else `ai_job.id`) |
| `state` | text (enum from above) | Canonical state |
| `state_since` | timestamptz | When the row entered current state (most recent transition timestamp from upstream) |
| `client_id` | uuid | From upstream `c.client.id` via JOIN |
| `digest_item_id` | uuid | NULL if slot-driven v4 |
| `slot_id` | uuid | NULL if legacy v3 |
| `ai_job_id` | uuid | NULL if not yet drafting |
| `post_draft_id` | uuid | NULL if upstream (digest selected, no draft yet) |
| `post_publish_queue_id` | uuid | NULL if upstream of queue |
| `post_publish_id` | uuid | NULL if not yet published |
| `format_key` | text | From `c.client_publish_profile` resolution per workflow |
| `platform` | text | Target platform (facebook, instagram, linkedin) |
| `scheduled_publish_at` | timestamptz | If queued/publishing/published, when scheduled |
| `last_error` | text | If failed/dead, last error message |
| `dead_reason` | text | If state=dead, the reason code per Phase 1.7 of `docs/04_phases.md` |

### Relation to UI surfaces

| Surface | Reads from view |
|---|---|
| NOW > Daily > Pipeline (swimlane) | Aggregated counts per `state` + recent rows per state |
| NOW > Investigate > Pipeline Log | Row-level table with all columns; filter by client / state / time |
| NOW > Investigate > Flow | Counts per stage feed the diagram; click node → Pipeline Log filtered to that stage |
| CLIENTS > [client] | Same swimlane shape filtered to one `client_id` |
| Brief input | `state` aggregations feed templated baseline per §8.2 |
| `/queue` | Retired Phase 2; was a flat row table over `m.post_publish_queue` only |
| `/failures` | Retired Phase 2; dead+failed rows now route to Pipeline Log filtered to those states |

### Implementation note (without writing DDL)

Derivation logic ships as `m.vw_pipeline_state` (server-side view) per §9.3 M-09-03 and §6.10 Q2 default. If perf is inadequate at prod-scale, materialised view with refresh trigger is the fallback per §9.5 risk table.

---

## 10.3 Agent status primitive

### Purpose

A per-agent canonical health record that NOW > Daily > Overview agent status row + NOW > Investigate > Agents both read from. Replaces today's situation where /diagnostics is one agent surface, /pipeline-log is another, and there's no unified "are my agents healthy" view.

### Agents in scope (v1)

| Agent | Source | Cadence | Surface today | New v1 surface |
|---|---|---|---|---|
| `auto-approver` | `m.ai_job` + `m.post_draft.auto_approver_decision` | Per draft creation | None unified | NOW > Investigate > Agents card |
| `format-advisor` | Format decision log | Per draft assignment | None | NOW > Investigate > Agents card |
| `compliance-reviewer` | Compliance review log | Per draft + on policy detection | `/compliance` Review Queue (review queue itself; not health) | NOW > Investigate > Agents card |
| `ai-diagnostic` | `m.ai_diagnostic_log` | Daily | `/diagnostics` page | Seeds NOW > Investigate > Agents card |
| `pipeline-doctor` | `m.pipeline_doctor_log` | :15 / :45 every 30 min | `/pipeline-log` Tier 1 surface | NOW > Investigate > Agents card |
| `ai-worker` | `m.ai_job` | Continuous | None | NOW > Investigate > Agents card |
| `brief-generator` | `m.brief` | Daily 06:30 + on-demand | n/a (new in Phase 3) | NOW > Investigate > Agents card |

v2 reserved agents: `drift-checker` (gates on F-EF-DRIFT-PREVENTION Stage 2b ship), `insights-worker` (per `docs/04_phases.md` Phase 2.1), `feed-intelligence` (Phase 2.2), `content-analyst` (Phase 3.2), `boost-worker` (Phase 3.4).

### What counts as agent health

Four signals contribute to the severity computation:

1. **Cadence health**: `last_run_at` vs `expected_cadence`. Overdue by:
   - 0–1 cadence window: nominal
   - 1–2 windows: warning
   - \> 2 windows: critical

2. **Recent run success rate** (rolling 7d):
   - ≥ 90% success: nominal
   - 75–90% success: warning
   - < 75% success: critical

3. **Pending recommendations / acks**:
   - 0–2 outstanding: nominal
   - 3–5 outstanding: warning
   - ≥ 6 outstanding: critical

4. **Last run status**:
   - success: contributes nominal
   - failure (any kind): contributes warning
   - timeout / didn't fire: contributes critical

Combined severity = max of the four signals. Any one signal at critical → agent severity = critical.

### Severity model

| Severity | Definition | Operator action expected |
|---|---|---|
| `healthy` | All four signals nominal | None; glance and move on |
| `warning` | At least one signal at warning, none at critical | Note; investigate within current session if convenient |
| `critical` | At least one signal at critical | Investigate before continuing daily session |

### Acknowledgement model

Ack on agent status is distinct from ack on attention_item.

- **Per-agent ack**: marks the operator as having reviewed the warning/critical state
- Ack records `last_ack_at` + `last_ack_by` + `last_ack_reason` (optional)
- Ack does NOT change underlying severity
- Ack expires when severity changes (new run resets the ack since the state is fresh)
- A critical-severity agent with no ack appears in NOW > Daily > Overview agent status row prominently; ack reduces visual prominence but doesn't hide

### Required attributes

| Attribute | Type class | Nullable | Tier | Notes |
|---|---|---|---|---|
| `agent_name` | text | NO | v1 required | Primary key (one row per agent); enum constrained to v1 list above |
| `last_run_at` | timestamptz | YES | v1 required | NULL if never run |
| `last_run_status` | enum (`success`, `failure`, `timeout`, `unknown`) | NO | v1 required | Default `unknown` on create |
| `last_run_id` | text | YES | v1 required | Pointer to underlying log row (e.g. `m.pipeline_doctor_log.id`) |
| `expected_cadence_minutes` | int | NO | v1 required | E.g. 30 for pipeline-doctor; 1440 for daily agents |
| `recent_runs_success_count` | int | NO | v1 required | Rolling 7d |
| `recent_runs_failure_count` | int | NO | v1 required | Rolling 7d |
| `pending_recommendations_count` | int | NO | v1 required | Count of unresolved `m.attention_item` rows where `subtype = 'agent.{agent_name}'` AND state = 'pending' |
| `pending_acks_count` | int | NO | v1 required | Count of severe ack items pending |
| `severity` | enum (`healthy`, `warning`, `critical`) | NO | v1 required | Computed; updated on agent run |
| `severity_reason` | text | YES | v1 required | Human-readable explanation of severity |
| `last_ack_at` | timestamptz | YES | v1 required | |
| `last_ack_by` | text | YES | v1 required | Operator identity |
| `last_ack_reason` | text | YES | v1 optional | |
| `updated_at` | timestamptz | NO | v1 required | Last update; powers staleness checks |

### Relation to Diagnostics / Agents

- `/diagnostics` (Tier 2 LLM agent) becomes `agent_name = 'ai-diagnostic'` in this primitive
- Pipeline Doctor (Tier 1) becomes `agent_name = 'pipeline-doctor'`
- Both surface as cards in NOW > Investigate > Agents
- Click card → recent runs + outputs (delegates to underlying log table)
- Per-agent recommendations link via `m.attention_item.subtype = 'agent.{agent_name}'`

### Implementation note

This primitive can ship as either a TABLE (with writers per agent) or a VIEW (derived from existing logs). Default per §9.13 build-blockers:

- v1 default: VIEW (`m.vw_agent_status`) derived from existing logs + `m.attention_item` for pending counts
- Materialise to TABLE only if perf inadequate or cross-agent reporting needs additional fields
- Phase 1 ships severity column on Pipeline Log (per B-09-04) which is doctor-specific; full agent surface in Phase 3

---

## 10.4 Scope primitive

### Purpose

A shape for tagging records with their applicability domain. Today most things are global (per-operator); some have `client_id`. The scope primitive normalises this and prepares for v2 multi-client portal where RLS enforces isolation.

### Scope types

| Type | Meaning | v1 use | v2 use |
|---|---|---|---|
| `global` | Applies across all clients / all platforms / all workflows | System-wide doctor warnings, brief content, ICE-level config | Same |
| `client` | Scoped to a specific client | NDIS Yarns token expiry, Property Pulse calibration trend | Drives RLS in client portal |
| `platform` | Scoped to a specific platform (e.g. Facebook, Instagram, LinkedIn, YouTube) | Facebook API rate limit warning | Same |
| `workflow` | Scoped to a specific pipeline workflow / format / agent | ai-worker job stuck, format-advisor low-confidence on a specific format | Same |

### Scope shape

```
scope: jsonb := {
  type: 'global' | 'client' | 'platform' | 'workflow',
  value: text | null,
  secondary_scope: scope | null   // optional nested for cross-cutting items
}
```

Examples:
- `{type: 'global'}` — applies everywhere
- `{type: 'client', value: 'ndis_yarns'}` — NDIS Yarns only
- `{type: 'platform', value: 'facebook'}` — all Facebook activity across all clients
- `{type: 'client', value: 'ndis_yarns', secondary_scope: {type: 'platform', value: 'facebook'}}` — NDIS Yarns Facebook activity only
- `{type: 'workflow', value: 'format-advisor:carousel-3'}` — carousel-3 format decisions

### v1 / v2 boundaries

**v1 (locked):**
- Scope is read-only metadata
- One operator (PK) sees everything regardless of scope
- Scope is populated at item creation (not retroactively backfilled)
- UI may filter by scope (e.g. "show only NDIS Yarns attention items") but isolation is not enforced

**v2 (reserved):**
- Scope drives RLS
- Client-portal users see only `scope.type = 'client' AND scope.value = <their_slug>` rows
- Operator role sees all scopes
- Scope is enforced at DB level via row-security policies; application code does not implement filtering

### How this supports future multi-client design

v1 ships scope on `m.attention_item` and `m.brief`. v2 portal split needs:

1. Identity: client users authenticated via Supabase Auth (already exists per `docs/03_blueprint.md`)
2. RLS policies: `scope.type = 'client' AND scope.value = current_user.client_slug`
3. Operator role bypasses RLS (existing pattern)

With scope shipped in v1, the v2 portal lift is policy-only; no schema migration. The contract is forward-compatible.

### Where scope is required

| Object | Scope required v1? | Why |
|---|---|---|
| `m.attention_item` | YES | Inbox UI may filter; v2 portal needs |
| `m.brief` | YES | Brief is per-operator (`global`) v1; per-client (`scope.type='client'`) v2 |
| `m.action_event` | YES | Audit needs to know which scope an action affected |
| `m.vw_pipeline_state` | NO (derived) | `client_id` already on row; full scope unnecessary |
| `m.vw_agent_status` | NO (per-agent global) | Agents are global infrastructure; no per-client agent in v1 |

### Where scope is deferred

All other `m.*` tables retain their existing `client_id` column patterns; scope is not retroactively added. v2 may unify if needed.

---

## 10.5 `m.brief`

### Purpose

Finalise §8.8 Q2. The storage primitive for generated Brief rows; serves NOW > Daily > Overview Brief block + Telegram daily push + manual refresh.

### Final schema recommendation

| Attribute | Type class | Nullable | Tier | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | v1 required | Primary key |
| `generated_at` | timestamptz | NO | v1 required | When generation completed |
| `scope` | jsonb | NO | v1 required | Per scope primitive; v1 default `{type: 'global'}`; reserved for v2 per-client |
| `alerts` | jsonb | NO | v1 required | Array of alert objects (max 3); each: `{title, body, severity, drilldown_url, attention_item_id, content_hash}` |
| `decisions` | jsonb | NO | v1 required | Array of decision objects (max 2); each: `{title, body, recommendation, drilldown_url, content_hash}` |
| `summary` | text | NO | v1 required | ~80 word narrative |
| `templated_only` | bool | NO | v1 required | true if LLM enrichment failed; default false |
| `generation_ms` | int | NO | v1 required | Generation duration for perf monitoring |
| `llm_input_hash` | text | YES | v1 required | Hash of templated input set; for debugging dedup |
| `inputs_used` | jsonb | YES | v1 required | Snapshot of which templated inputs flowed (e.g. `{pipeline_state: true, calibration_trend: true, token_expiry: false}`) |
| `inputs_failed` | jsonb | YES | v1 required | Which templated inputs errored; per §8.7 failure mode "data incomplete" |
| `channels_pushed` | text[] | YES | v1 required | Channels that consumed this Brief (`['web']`, `['web','telegram']`) |
| `channel_pushed_at` | jsonb | YES | v1 required | Per-channel push timestamps for audit |
| `superseded_by` | uuid | YES | v1 required | Self-reference if a newer Brief replaced this one mid-day |

### Retention

30-day rolling per §8.8 Q2 default. Daily cleanup cron deletes rows older than 30 days. Audit needs are covered by source logs (`m.pipeline_doctor_log`, `m.ai_diagnostic_log`, `m.action_event`).

v2 reserved: per-Brief retention override for compliance audit; per-client retention policy.

### Generation inputs

Per §8.2 (templated baseline) + §8.2 (LLM enrichment). Recap of input contract:

**Templated baseline inputs (deterministic; ALWAYS flow):**

| Input | Source primitive | Contract |
|---|---|---|
| Pipeline state counts | `m.vw_pipeline_state` | Counts per `state` per `client_id` |
| Inbox items | `m.attention_item` WHERE state='pending' | Counts per type × severity |
| Token expiry | `c.client_channel.token_expires_at` | Per-client list within 7-day window |
| Stuck items | `m.pipeline_doctor_log` flagged + `m.ai_job` aged | Per-stage stuck count |
| Performance anomalies | REPORTS Calibration trend (computed from `m.post_draft.auto_approver_decision`) | Pass rate WoW delta |
| Cadence reminders | Last-touched timestamps on key surfaces | Items aged beyond cadence threshold |
| Recent publishing volume | `m.post_publish` 24h count vs trailing 7d avg | Volume delta with sign |
| Cron job status | `cron.job_run_details` | Cron jobs missing scheduled runs |

**LLM enrichment inputs (deterministic baseline + 24h activity log):**

| Input | Source primitive |
|---|---|
| Templated baseline outputs | Pipe-through |
| Last 24h doctor events | `m.pipeline_doctor_log` rows from 24h window |
| Last 24h diagnostic agent digest | `m.ai_diagnostic_log` daily output |
| Recent stuck-item resolutions | `m.pipeline_doctor_log` resolved events |
| Recent calibration changes | `m.compliance_rule` recent edits, `c.client_ai_profile` recent edits |

### Salience scoring (input to alert/decision selection)

Per §8.2 formula:

```
salience = severity_weight × time_decay × novelty
```

Where:
- `severity_weight`: CRITICAL=4, HIGH=3, MEDIUM=2 (LOW excluded from Brief v1)
- `time_decay`: < 6h = 1.0, < 24h = 0.7, < 7d = 0.4, > 7d = 0.1
- `novelty`: 1.0 if not surfaced in last 3 Briefs (by content_hash), 0.3 if repeat
- Severity escalation override: novelty resets to 1.0 if severity increased since last surface

Selection per block:
- Alerts: top 3 by salience, with CRITICAL severity always pinned
- Decisions: top 2 by cost-of-delay (LLM-derived where available; templated proxies = queue depth + age)
- Summary: LLM-narrated paragraph; templated fallback is 1-line health string

### Hard caps

- Alerts: max 3 items, each ≤ 1 line
- Decisions: max 2 trade-offs, each ≤ 2 lines + recommendation arrow
- Summary: max ~80 words / 4–5 sentences
- Total: ≤ ~250 words per Brief

Generation enforces caps at write time; over-cap content is dropped before persist.

### Relation to Telegram and NOW > Overview

**NOW > Daily > Overview.**
- Brief block reads latest non-superseded `m.brief` row WHERE `scope = {type: 'global'}` AND `generated_at` is most recent
- Stale indicator if generated > 4h ago; manual refresh button regenerates
- Click-throughs use `drilldown_url` from each alert/decision object; URL carries Q3 pre-fill semantics

**Telegram daily push.**
- Cron at 07:00 AEST reads same `m.brief` row
- Formats per §8.3.b template
- Writes `channels_pushed` = `[..., 'telegram']` and `channel_pushed_at.telegram` = NOW()
- Dedup vs prior push: skip if last push has same `id` or no new CRITICAL since

**Manual refresh.**
- Operator clicks button on Brief block
- New `m.brief` row generated; old row's `superseded_by` set to new row's `id`
- New row's `channels_pushed` = `['web']` only (no Telegram on manual refresh)

---

## 10.6 Action-event / audit primitive

### Purpose

A single audit primitive that records every operator action from §6.2.c Action Layer. Replaces today's situation where requeue is SQL-via-chat (no audit), retries are unlogged, ack doesn't exist, and bulk operations aren't possible.

The primitive serves three purposes:
1. Audit trail ("who did what when, what was the prior state")
2. Undo support (where applicable, e.g. bulk approve undo window)
3. Reporting ("how many requeues this month")

### Scope

All seven Action Layer items from §6.2.c get audited:

| Action type | Audit required? | Notes |
|---|---|---|
| `requeue` | YES | Prior state, new state, reason mandatory |
| `retry` | YES | Prior state, new state, payload optional |
| `acknowledge` | YES | Severity at ack time captured |
| `bulk_approve` | YES | Per-draft audit + batch summary |
| `inline_rule_update` | YES | Prior rule_text, new rule_text |
| `override_format` | YES | Original confidence, override reason |
| `inline_reconnect` | NO (delegated) | OAuth flow audits itself; action_event row redundant |

### Required audit fields (universal)

| Attribute | Type class | Nullable | Tier | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | v1 required | Primary key |
| `action_type` | text (enum: see Scope) | NO | v1 required | One of 6 v1 types |
| `actor` | text | NO | v1 required | `operator` v1; reserved for `client:<slug>` v2 |
| `actor_identity` | text | YES | v1 required | E.g. operator email or auth user_id; `pk@invegent.com` v1 |
| `target_table` | text | NO | v1 required | Polymorphic reference: which table the action affected |
| `target_id` | uuid | NO | v1 required | Polymorphic reference: row id |
| `prior_state` | jsonb | NO | v1 required | Snapshot of relevant state before action; shape varies by action_type |
| `new_state` | jsonb | NO | v1 required | Snapshot after action |
| `reason` | text | YES | v1 required | Operator-provided OR auto-generated; required for requeue |
| `payload` | jsonb | YES | v1 required | Action-specific extras |
| `scope` | jsonb | NO | v1 required | Per scope primitive |
| `created_at` | timestamptz | NO | v1 required | |
| `batch_id` | uuid | YES | v1 required | For bulk operations; NULL for single-action events |
| `correlation_id` | uuid | YES | v1 required | Links related actions; e.g. an ack that resolves an attention_item references attention_item.id |
| `attention_item_id` | uuid | YES | v1 required | If this action resolved an attention_item, that item's id |
| `undo_window_until` | timestamptz | YES | v1 required | If action supports undo, deadline; e.g. bulk_approve = created_at + 10s |
| `undone_at` | timestamptz | YES | v1 required | Set if undo executed within window |
| `undone_by_action_id` | uuid | YES | v1 required | Self-reference to the undo's own action_event row |

### Per-action specifics

#### `requeue`
- `target_table`: `m.post_draft` | `m.post_publish_queue` | `m.ai_job`
- `target_id`: row id
- `prior_state`: `{status: 'dead', dead_reason: '...'}`
- `new_state`: `{status: '<target prior state per state-machine>'}`
- `reason`: REQUIRED — no blank requeue
- `payload`: optional
- Undo: not supported (action is reversible by re-requeue if needed)

#### `retry`
- `target_table`: `m.post_publish_queue` | render queue
- `target_id`: row id
- `prior_state`: `{status: 'failed' | 'render_failed', last_error: '...'}`
- `new_state`: `{status: 'queued' | 'render_pending'}`
- `payload`: `{modified_params: <jsonb>}` if retry-with-modified-params (v2 only); empty `{}` v1
- Undo: not supported

#### `acknowledge`
- `target_table`: `m.pipeline_doctor_log` | `m.attention_item`
- `target_id`: row id
- `prior_state`: `{ack_at: null, severity: '<at ack time>'}`
- `new_state`: `{ack_at: now(), ack_by: actor_identity}`
- `payload`: `{severity_at_ack: '...'}` (severity may have changed since)
- Undo: not supported in v1 (re-ack if needed)

#### `bulk_approve`
Two-row pattern: one row per affected draft + one batch summary row.

**Per-draft row:**
- `action_type`: `bulk_approve`
- `target_table`: `m.post_draft`
- `target_id`: draft id
- `prior_state`: `{approval_status: 'needs_review', auto_approver_decision: '...'}`
- `new_state`: `{approval_status: 'approved'}`
- `batch_id`: shared across all rows in the batch
- `payload`: `{hard_block_overridden: true | false}`
- `undo_window_until`: created_at + 10 seconds

**Batch summary row:**
- `action_type`: `bulk_approve_batch`
- `target_table`: `m.post_draft`
- `target_id`: NULL (or batch_id duplicated for clarity)
- `prior_state`: `{}`
- `new_state`: `{batch_size, approved_count, rejected_count, skipped_count, hard_block_override_count}`
- `batch_id`: same as per-draft rows
- `payload`: `{filter_chip: 'drafts', body_length_filter: true}` (whatever filter was applied)
- Undo: undo_window_until applies; undo reverts ALL rows in batch

#### `inline_rule_update`
- `target_table`: `m.compliance_rule`
- `target_id`: rule id
- `prior_state`: `{rule_text: '<prior text>', rule_metadata: ...}`
- `new_state`: `{rule_text: '<new text>', rule_metadata: ...}`
- `payload`: `{suggested_by: 'compliance-reviewer', suggestion_attention_item_id: <id>}`
- Undo: standard table-restore via prior_state if within undo window (v1: no undo window for rule updates; revert is manual)

#### `override_format`
- `target_table`: format decision log (e.g. `m.format_advisor_log`)
- `target_id`: decision row id
- `prior_state`: `{format_key: '<original>', confidence: 0.62}`
- `new_state`: `{format_key: '<chosen>', overridden: true}`
- `payload`: `{original_confidence, override_reason}`
- Undo: not supported

### Single-table vs per-action tables

**Default v1: single table** with `action_type` discriminator. Reasoning:
- Cross-action reporting ("what did the operator do today") is straightforward
- Audit history per `target_id` is one query
- Schema evolution easier (add a new action_type without new table)
- Polymorphic `target_table` + `target_id` already paid the abstraction cost on `m.attention_item`

v2 may split if any single action_type accumulates >5 specialised columns that don't fit the universal shape.

### Relation to other primitives

- `attention_item.resolution_action_id` → `action_event.id` when an attention_item state transitions to `resolved`
- `action_event.attention_item_id` → `attention_item.id` for forward audit
- `action_event.scope` mirrors the scope of the affected target
- `action_event.batch_id` clusters bulk operations
- `action_event.undo_window_until` + `undone_at` + `undone_by_action_id` form the undo chain

---

## 10.7 Build-blocking decisions

### Must lock before Phase 0 starts

These decisions affect Phase 0 schema additions or naming and must resolve before any DDL.

| Decision | Default | Why locking matters |
|---|---|---|
| **`m.attention_item` is a NEW TABLE** (not a view union) | NEW TABLE | Lifecycle and resolution semantics require persistent state; view union can't carry `state`, `resolved_at`, `escalated_to` |
| **`m.attention_item` backfills from existing sources at Phase 0** | YES | Existing `/inbox` drafts + `/compliance` review queue items must appear in Inbox after Phase 0 ships; without backfill, those surfaces empty out |
| **`m.action_event` is a SINGLE TABLE** with type discriminator | SINGLE TABLE | Per-action tables fragment audit reporting; universal shape paid for already by polymorphic target ref |
| **Agent status is a VIEW** in v1 (not a table) | VIEW (`m.vw_agent_status`) | Existing logs are sufficient sources; materialise only if perf demands; reduces Phase 0 migration count by 1 |
| **Pipeline state is a VIEW** (`m.vw_pipeline_state`) per §6.10 Q2 default | VIEW | Already locked in §9.3 M-09-03 |
| **`m.brief` schema final** per §8.8 Q2 + 10.5 above | This schema | Phase 0 M-09-02 builds against this exact shape |
| **Scope is a `jsonb` column** with documented shape | YES, jsonb | Forward-compat with v2 RLS without schema migration; alternative (separate scope_type/scope_value cols) is more verbose for nested scope |
| **`m.attention_item` polymorphic reference is `source_table` + `source_id`** | YES | No DB FK; consistent with audit primitive pattern; cost: source table renames need application-level migration |

### Can wait until Phase 1–3

These can be locked closer to the phase that needs them; default behaviour ships if no PK direction.

| Decision | Where it surfaces | Default |
|---|---|---|
| **Per-action `prior_state` schema shape** | Phase 1 (B-09-03 requeue) onwards | jsonb with action-type-specific keys; documented in 10.6 |
| **`undo_window_until` default duration** | Phase 2 (B-09-14 bulk approve) | 10 seconds for bulk_approve; not supported for other actions |
| **Agent severity classifier thresholds** | Phase 1 (B-09-09 doctor classifier) | info / warning / severe per §6.10 Q4 default |
| **Brief content novelty window** | Phase 3 (B-09-25 Brief surface) | Last 3 Briefs per content_hash |
| **`m.attention_item` TTL defaults per type** | Phase 2–3 (creator hooks ship) | NULL (no auto-expire) v1; cleanup cron handles superseded states |
| **Stale indicator thresholds on Brief** | Phase 3 (B-09-30) | 4h cache TTL = stale threshold |
| **Multi-row attention_item dedup rules** | Phase 1–2 (creators ship) | Natural key = (source_table, source_id, type, subtype); dedup at create time |
| **Action audit retention** | Phase 4 (cleanup) | Indefinite v1 (small table); retention policy in v2 if growth justifies |

### Out of scope for v1

From §9.12 deferred list, items that do NOT need contract decisions in this doc:

- `client:<slug>` assignee routing (v2 portal)
- LOW severity inclusion in Inbox
- External-reviewer attention items (`type=external_review` reserved)
- Mixed-type bulk Inbox actions
- Per-request LLM override on Brief
- Email digest channel

---

## 10.8 Cross-object relationships

Compact textual diagram of how the v1 primitives reference each other.

```
             m.attention_item
             │
             ├── source_table + source_id  → (any of) m.post_draft
             │                                    m.compliance_review_queue
             │                                    m.format_advisor_log
             │                                    m.pipeline_doctor_log
             │                                    m.ai_diagnostic_log
             │
             ├── resolution_action_id  → m.action_event.id  (when state = resolved)
             │
             ├── escalated_to / supersedes  → m.attention_item.id  (self-reference)
             │
             └── scope  → (jsonb, no DB ref; v1 = global)

             m.action_event
             │
             ├── target_table + target_id  → (any of) m.post_draft
             │                                    m.post_publish_queue
             │                                    m.ai_job
             │                                    m.compliance_rule
             │                                    m.format_advisor_log
             │                                    m.pipeline_doctor_log
             │                                    m.attention_item
             │
             ├── attention_item_id  → m.attention_item.id  (when action resolves an item)
             │
             ├── batch_id  (clusters bulk operations; no DB ref)
             │
             └── undone_by_action_id  → m.action_event.id  (self-reference)

             m.brief
             │
             ├── alerts[].attention_item_id  → m.attention_item.id  (each alert can reference one)
             │
             ├── inputs_used.pipeline_state  → m.vw_pipeline_state  (no DB FK; query reference)
             │
             ├── inputs_used.inbox  → m.attention_item  (no DB FK; query reference)
             │
             ├── superseded_by  → m.brief.id  (self-reference)
             │
             └── scope  → (jsonb)

             m.vw_pipeline_state  (view)
             │
             └── derived from m.digest_item + m.ai_job + m.post_draft +
                                m.post_publish_queue + m.post_publish

             m.vw_agent_status  (view)
             │
             └── derived from m.pipeline_doctor_log + m.ai_diagnostic_log +
                                m.ai_job + m.attention_item (pending counts)
```

### Read-path summary

| UI surface | Primary primitive read | Joined with |
|---|---|---|
| NOW > Daily > Overview Brief block | `m.brief` (latest by generated_at) | Each alert references attention_item; click-through goes to alert.drilldown_url |
| NOW > Daily > Inbox | `m.attention_item` WHERE state=pending | None for list; expand reads source_table+source_id |
| NOW > Daily > Pipeline (swimlane) | `m.vw_pipeline_state` (aggregated) | None |
| NOW > Investigate > Pipeline Log | `m.vw_pipeline_state` (row-level) + `m.pipeline_doctor_log` | `m.action_event` history per row |
| NOW > Investigate > Visual Pipeline | format-advisor log + render log | `m.action_event` for retry/override audit |
| NOW > Investigate > Agents | `m.vw_agent_status` | `m.attention_item` for per-agent recommendation count |
| NOW > Investigate > Flow | `m.vw_pipeline_state` (counts per stage) | None |
| REPORTS > Calibration | Computed from `m.post_draft.auto_approver_decision` | None |
| CLIENTS > [client] | `m.vw_pipeline_state` filtered by client_id | `m.attention_item` filtered by scope |
| Telegram daily push | `m.brief` (same as web) | None |

### Write-path summary

| Action | Writes to |
|---|---|
| Auto-approver flag | `m.post_draft` + `m.attention_item` (creator hook) |
| Compliance policy detection | `m.compliance_review_queue` + `m.attention_item` (creator hook) |
| Format-advisor low-confidence | format-advisor log + `m.attention_item` (creator hook) |
| Doctor SEVERE event | `m.pipeline_doctor_log` (severity=severe) + `m.attention_item` (creator hook) |
| Operator approves draft (single) | `m.post_draft` (status update) + `m.action_event` |
| Operator approves drafts (bulk) | `m.post_draft` (multiple) + `m.action_event` (per-draft + batch summary) + `m.attention_item` (state=resolved) |
| Operator requeues dead item | `m.post_draft` / `m.post_publish_queue` / `m.ai_job` (status update) + `m.action_event` |
| Operator acknowledges doctor event | `m.pipeline_doctor_log` (ack_at) + `m.action_event` + `m.attention_item` (state=resolved if was an ack item) |
| Operator applies suggested rule update | `m.compliance_rule` (text update) + `m.action_event` + `m.attention_item` (state=resolved) |
| Brief generated (cron or manual) | `m.brief` |
| Telegram push fired | `m.brief.channels_pushed` (append) + `m.brief.channel_pushed_at` (update) |

---

## 10.9 Honest limitations

- **`m.attention_item` is the largest new product object.** v1 commits the contract but creators (upstream EFs that write attention_items) ship across Phase 1–3. If a creator hook is mis-implemented, the corresponding type's items don't appear in Inbox; backfill is the safety net for `draft` and `policy` types.
- **The polymorphic reference pattern (`source_table` + `source_id`) deliberately omits DB-level foreign keys.** This trades referential integrity for cross-table flexibility. Renames of source tables require application-level migration (search for `source_table = '<old_name>'` and update).
- **The view-vs-table choice for agent status (10.3) and pipeline state (10.2) is reversible if perf demands.** Materialised view with refresh trigger is the fallback; this contract doesn't change.
- **Scope primitive is metadata-only in v1.** A bug in v1 application code could leak `scope.type='client'` items to operators of other clients — but v1 has only one operator (PK), so the leak is harmless. v2 RLS migration must be carefully written; the contract is forward-compat but not self-enforcing.
- **`m.action_event` per-draft + batch summary pattern doubles row count for bulk operations.** A 28-draft bulk approve = 29 audit rows. This is intentional (per-draft auditability) but worth flagging for retention sizing.
- **`m.brief.alerts[].drilldown_url` carries Q3 pre-fill semantics but Q3 mechanism is build-blocker** per §9.13. Until Q3 resolves, drilldown URLs may degrade to filter-less destinations.
- **The `auto` ownership value on `m.attention_item` is reserved but not used in v1.** Self-resolving items (e.g. transient agent recommendation that clears itself) are not in scope for v1 creator hooks.
- **The relationship between `m.attention_item` and `m.action_event` is bidirectional but not enforced.** When an action resolves an attention_item, both `attention_item.resolution_action_id` and `action_event.attention_item_id` should populate. Application code must maintain both; no DB constraint enforces this.
- **`m.brief.alerts` and `m.brief.decisions` use jsonb arrays rather than separate tables.** This trades query flexibility (can't easily "find all briefs that mentioned token expiry") for schema simplicity. v2 may extract if reporting needs justify.
- **The `superseded_by` chain on `m.brief` could grow long if manual refresh is over-used.** Cleanup cron handles via 30-day retention, but a single day with many manual refreshes leaves an audit chain of `m.brief` rows linked by superseded_by. Acceptable v1.
- **The `format` and `agent` types on `m.attention_item` have no creator hooks until Phase 3.** Phase 0 backfill seeds only `draft` and `policy` types. Inbox v1 (Phase 2) ships with two of four types populated.
- **Severity enum on `m.attention_item` (CRITICAL/HIGH/MEDIUM/LOW) overlaps semantically with severity enum on `m.pipeline_doctor_log` (info/warning/severe).** These are deliberately distinct: attention_item severity is operator-facing prioritisation; doctor severity is event classification. A doctor severe event creates an attention_item with severity=CRITICAL; the mapping is documented but not enforced at schema level.
- **§9 Phase 2 B-09-12 "Inbox absorbs compliance review queue" implicitly assumed something like `m.attention_item`.** §10 formalises it. §9 doesn't need amendment because the implicit assumption was correct; this is just naming.
- **Backfill plan for `m.attention_item` at Phase 0 is described but not specified in DDL terms** per the constraint of this doc. Engineering writes the backfill SQL; the contract specifies the natural key (`source_table`, `source_id`) and the type mappings.
- **`m.vw_agent_status` includes `pending_recommendations_count` from `m.attention_item`.** This creates a circular dependency: agent status is computed partly from attention_item; attention_item creators include agent EFs. Resolution: the count is computed at query time (not stored on agent_status row), so no circular write dependency exists.
- **The Telegram channel push semantics rely on `m.brief.channels_pushed` array append.** Concurrent push attempts must serialise (advisory lock per §8.7). Without serialisation, the array could miss entries.
- **`m.action_event.target_id` is `uuid` type-classed; some target tables use other id types.** If any target table uses a non-uuid primary key, this contract needs amendment. v1 audit verifies all target tables in scope use uuid.
- **The 11-section table in `00_overview.md` is still out-of-sync.** §11 will reconcile.

---

*Created 2026-05-06 (Sydney). §10 of 11 in the dashboard architecture review (originally "Migration sequence" in the kickoff plan; section-numbering note above). Inputs: `06_final_target_design.md`, `07_traceability_matrix.md`, `08_brief_and_comms_layer.md`, `09_implementation_plan.md`. Six product objects committed at contract level: `m.attention_item`, pipeline state primitive (`m.vw_pipeline_state`), agent status primitive (`m.vw_agent_status`), scope primitive (jsonb shape), `m.brief` (final schema), action-event primitive (`m.action_event`). 8 build-blocker decisions for Phase 0 commit. 8 deferrable decisions for Phase 1–3. Cross-object relationship diagram + read-path / write-path summaries. No DDL written. Next: §11 Risks + open decisions consolidation + 11-section table reconciliation.*
