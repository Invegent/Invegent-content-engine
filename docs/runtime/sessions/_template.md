# YYYY-MM-DD Sydney — {session title} — v{sync_state version}

**Session window:** YYYY-MM-DD HH:MM UTC → HH:MM UTC (Sydney: HH:MM–HH:MM AEST/AEDT).
**Headline:** {one sentence stating what happened.}
**Outcome:** {one sentence stating what state changed at session close.}

---

## Stages / work units this session

### Stage / unit 1 — {name}

#### Pre-flight evidence (L44)

- Q1: {probe} — PASS / FAIL / FLAGGED
- Q2: {probe} — PASS / FAIL / FLAGGED
- …

{Verbatim probe output captured in stage brief — referenced not duplicated unless brevity dictates.}

#### D-01

- review_id: `{uuid}`
- action_type: `{type}`
- verdict / risk / confidence: {…}
- pushback_points: {n}
- routing: proceed / apply_corrected / escalate_{…}
- **L46 classification:** INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING / N/A (clean agree)
- PK approval phrase: "{phrase}"

#### Apply

- Mechanism: {apply_migration / deploy_edge_function / execute_sql net.http_post}
- Timestamp: YYYY-MM-DD HH:MM:SS UTC
- Migration name / EF version: {…}
- Result: {success / error}

#### Post-mutation truth check (L45)

| Table | Pre | Post | Delta | Expected | Match |
|---|---|---|---|---|---|
| {schema.table} | … | … | … | … | PASS / FAIL |

Sanity sample (≥3 rows) captured in stage brief or inline if compact.

**Mismatch declarations:** {none / list with accept-with-variance | re-fire | rollback decision per L45}

#### Close-the-loop

- `m.chatgpt_review` row `{uuid}` resolved: `status='resolved'`, `resolved_by='{tag}'`, `escalation_resolved_at={ts}`

---

### Stage / unit 2 — {name}

{Repeat structure as needed.}

---

## GENERIC-NON-BLOCKING log (L46)

Every reviewer fire classified GENERIC-NON-BLOCKING this session is recorded here for false-positive rate audit.

| review_id | action_type | Missing field(s) | Reviewer text (verbatim, abbreviated if long) | Rationale |
|---|---|---|---|---|
| `{uuid}` | {type} | new defect / new evidence / corrective action | "{quote}" | {one line} |

**Override trigger watch:** {note if any proposed action has accumulated 2 consecutive GNB classifications this session — third fire requires PK explicit approval per protocol.}

If no GNB fires this session: write "None this session."

---

## Truth Check (session close)

Run before session-close 4-way sync writes.

| Check | Method | Result | Mismatch? |
|---|---|---|---|
| Live row counts for tables modified | `SELECT count(*) FROM …` per touched table | {counts} | yes / no |
| Result file pointer | Latest result file in `docs/audit/health/` or `docs/briefs/results/` | {filename / SHA} | yes / no |
| Open review rows this session | `SELECT id, status FROM m.chatgpt_review WHERE created_at >= session_start` | {n open / n resolved} | yes / no |
| `docs/00_sync_state.md` deltas | Sections this session affects | {list} | yes / no |
| `docs/00_action_list.md` deltas | Items moved Backlog→Active→Closed this session | {list} | yes / no |

**Mismatch declarations:** {none / list each with reconciliation decision — declared not normalised}

---

## Production mutations this session

Numbered list — every `apply_migration`, `deploy_edge_function`, `execute_sql` write, vault change, and off-chat PK action that touches production.

1. {action} — {timestamp} — {outcome}
2. {action} — {timestamp} — {outcome}
…

**No EF redeploy / no source edits / no schema changes beyond X** — explicit negations as relevant.

---

## Lessons captured this session

- **L{N} candidate / vindicated / promoted** — {one-line summary}
- …

---

## KOI activity this session

- **KOI-NN NEW**: {one-line summary}
- **KOI-NN cumulative**: {one-line summary}

---

## Follow-up findings opened

### F-{NAME}

**Status:** OPEN / RESOLVED — Severity P{0–4}.

{One paragraph describing the finding, scope, and any reconciliation options.}

**Surfaced at:** `docs/00_action_list.md` ({row reference}); {other locations}.

---

## State at session close

- Headline state changes.
- Cron jobs / EFs touched and their post-session status.
- Vault changes.
- 4-way sync commits: per-session file (this) + sync_state v{N} + action_list v{N} + dashboard roadmap if relevant + memory edit if relevant.

**Next major work:** {what's queued for the next session — PK direction or default candidate.}
