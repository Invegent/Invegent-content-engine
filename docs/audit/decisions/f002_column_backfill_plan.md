# F-002 Column Purpose Backfill — Overnight Job Plan

**Status:** ✅ DESIGNED (build deferred to a future session)
**Date:** 28 April 2026
**Source:** Audit closure F-2026-04-28-D-002

---

## Why this doc exists

F-002 (MEDIUM) flagged that schemas `c` and `f` are at 0% column-purpose coverage in `k.column_registry` — 479 columns in `c` and 195 in `f`, total **674 columns** with no documentation.

Verified during closure: `k.column_registry` refresh **is** working — rows exist with full type / nullable / FK metadata. The 0% is genuine documentation backlog, not a broken pipeline.

Manually documenting 674 columns is not session-feasible (even at 1 minute per column = 11+ hours). This doc designs the overnight-assisted approach.

---

## Approach — three phases

### Phase 1 — Snapshot generation (overnight)

A nightly script runs and produces:

**File:** `docs/audit/snapshots/columns/YYYY-MM-DD-c-and-f.md`

**Contents per undocumented column:**
- Schema name
- Table name
- Column name + ordinal position
- Data type (incl. text/uuid/timestamp etc.)
- Nullable flag
- Foreign key target (if any)
- Sample non-null values (top 3 distinct, redacted if PII risk)
- Existing column comment from `pg_description` if any
- The table's purpose from `k.table_registry` (provides context for the column)

This script can run as part of the broader audit snapshot job, or as its own scheduled task. Lightweight — pure SQL, no AI calls.

### Phase 2 — Auditor proposes purposes (overnight)

Same overnight slot, ChatGPT (or Claude API) reads the column snapshot and proposes a 1-line purpose for each undocumented column.

**Output file:** `docs/audit/snapshots/columns/YYYY-MM-DD-c-and-f-proposals.md`

**Format per proposal:**

```markdown
### c.client_publish_profile.boost_score_threshold
- **Type:** numeric
- **Nullable:** true
- **Existing comment:** (none)
- **Sample values:** [4.5, 5.0, 5.5]
- **Table purpose:** "Per-client per-platform publishing profile..."
- **Proposed column_purpose:** "Engagement-rate threshold (avg likes + shares per follower) above which a published post becomes eligible for auto-boost. Compared against m.post_performance after 24h."
- **Confidence:** high | medium | low
- **Reasoning:** "Name suggests an engagement threshold; sample values 4.5-5.5 consistent with engagement rate %. Confirmed by table purpose mentioning boost_enabled."
```

ChatGPT has **no write access** per the audit-loop rule (D181 candidate). This is proposal-generation only.

### Phase 3 — Operator approval + application (in chat)

Each session, the operator reviews a batch (target: 20-50 columns per session) with Claude:

1. Operator says: "process today's column proposals batch X"
2. Claude reads `YYYY-MM-DD-c-and-f-proposals.md`
3. Claude presents a batch in chat — table format showing column + proposed purpose + confidence
4. Operator approves / edits inline / rejects
5. Claude applies UPDATE migration to `k.column_registry`
6. Approved batch is moved to `applied/` archive; remaining proposals stay in the open file

This is the audit-loop pattern at column granularity. Same shape as F-001 closure.

---

## Prioritisation — high-leverage first

The auditor recommended **business-control columns first, keys/timestamps later.** Concretely, prioritise in this order:

| Priority | Column pattern | Why |
|---|---|---|
| P1 | Boolean flags (`*_enabled`, `is_*`) and mode/status enums | Control behaviour. Operators need to know what each toggle means. |
| P2 | Threshold and limit columns (`*_threshold`, `*_max_per_*`, `*_min_*`) | Decision parameters. Future operators will tune these. |
| P3 | JSONB / structured config columns | Schema-within-schema. Most likely to be misused without docs. |
| P4 | Foreign key columns (already typed in metadata) | Easy to document but lower leverage. |
| P5 | Audit columns (`created_at`, `updated_at`, `created_by`) | Self-documenting. |
| P6 | Surrogate primary keys (`*_id` UUIDs) | Self-documenting. |

The overnight proposer should **score each column's leverage** and present P1-P3 first. P5-P6 may not need explicit purposes at all (ChatGPT can mark as "skip — self-documenting").

---

## Build estimate

| Component | Effort | Status |
|---|---|---|
| Snapshot SQL queries (column metadata + sample values + table purpose) | ~30 min chat | not started |
| Snapshot script wrapper (Cowork or Windows scheduled task) | ~30 min chat | not started |
| ChatGPT prompt for column proposal generation | ~15 min chat | not started |
| Operator approval workflow (chat-driven, parallels F-001 pattern) | already proven via F-001 | done |
| First test run on small batch (20-30 columns) | ~30 min chat | not started |

**Total: ~2 hr build** before first overnight run.

---

## When to build

Not today — F-001 closure already exercised the pattern manually and the high-priority Phase B documentation gap is now closed. The lower-priority backfill work can wait until:

- The audit loop has run 2-3 cycles and the operator wants to scale the documentation work
- A focused docs sprint is appropriate (e.g. before first external client)
- Or, the next Data Auditor pass re-raises F-002 with stronger evidence that it's blocking something

This doc is the design brief. When the build slot arrives, it's mechanical: snapshot → propose → approve → apply.

---

## Forward discipline rule

**New tables ship with both table purpose AND column purposes at creation time, not retroactively.** This prevents accumulating new column-doc backlog while the existing one is being worked through.

Captured as Lesson #35 candidate in standing memory.

---

## Related

- **F-2026-04-28-D-001** — table-level backfill (closed, action-taken)
- **F-2026-04-28-D-002** — column-level backfill (this doc)
- **F-2026-04-28-D-003** — migration naming discipline (related — both are documentation discipline gaps)
