# ICE Audit Loop — Design

**Status:** ✅ LOCKED
**Date:** 28 April 2026
**Authors:** PK + Claude (Opus 4.7) + ChatGPT (review pass)
**Supersedes:** D156 external reviewer layer (per D162 paused; this loop replaces it for system-level audit)

---

## 1. What this is

A **two-side asynchronous audit loop** for the ICE system itself.

- **ChatGPT** plays the auditor. Reads the system. Raises findings.
- **Claude + operator (PK)** plays the auditee. Reviews findings. Closes them.
- **GitHub markdown** is the audit working file. Versioned, diffable, immutable history.
- **Daily snapshots** are the evidence record — a versioned export of system state used as the auditor's input each cycle.

The loop replaces the per-draft external reviewer layer (D156, paused per D162). That layer was both too noisy (every draft) and too narrow (single artifact). This loop is low-frequency (one role per night) and broad (whole-system).

---

## 2. Three-layer architecture

The system separates three concerns that must not be confused:

| Layer | Job | Storage | Refresh |
|---|---|---|---|
| **Inventory** | What does ICE own? What is it for? What's its PII risk? | `k` schema in Supabase | Live + weekly cron |
| **Evidence** | What state is the system in today? What changed? What looks risky? | `docs/audit/snapshots/YYYY-MM-DD.md` | Daily snapshot script |
| **Findings** | What did the auditor find? What did the operator decide? | `docs/audit/open_findings.md` + `docs/audit/runs/YYYY-MM-DD-{role}.md` | Per audit cycle |

**Critical principle:** keep `k` clean. Don't expand it into a copy of every Supabase internal table. The audit loop *uses* `k` as the starting map; it does not *replace* `k` with audit machinery.

---

## 3. Stated principle — snapshot quality before role breadth

The loop is only as good as the snapshot it operates on.

A shallow snapshot produces shallow findings regardless of how many auditor roles run against it. Therefore:

- **First build slice: one role, one excellent snapshot, one closure cycle.**
- **Second build slice: scale to additional roles only after Role 1 produces non-trivial findings.**

If Role 1 produces only generic SaaS-platitudes, the snapshot is the problem, not the auditor. Fix the snapshot, then scale.

---

## 4. Roles (build order)

Roles are built one at a time. Each role has its own prompt template, scope, and out-of-scope list.

| # | Role | Scope | Status |
|---|---|---|---|
| 1 | **Data / Supabase Model Auditor** | Schema integrity, k registry coverage, migration discipline, public-schema exceptions, FK/NOT NULL/index coverage, trigger consistency | ⏳ Building today |
| 2 | Security Auditor | RLS policies on ICE tables, secret exposure, OAuth state handling, public-write surfaces | Planned |
| 3 | Operations Auditor | Cron health, queue depths, error rates, EF deployment freshness, token expiry, pipeline incident patterns | Planned |
| 4 | Compliance Auditor | NDIS rule injection coverage, brand voice consistency, disclosure surfacing, PII handling | Planned |
| 5 | Financial Auditor | Cost model accuracy, per-client cost attribution, AI cost trend, subscription register | Planned |

Out of scope for the audit loop entirely:
- Per-draft content review (was D156's job; closed)
- External-content fact-checking (different problem)
- Performance benchmarking (different problem; use `m.pipeline_health_log` directly)

---

## 5. Severity rubric

5 tiers. Critical and High are the action-required tiers. Medium and Low are quality. Info is observation.

| Tier | Definition | Closure SLA |
|---|---|---|
| **Critical** | Active client/security/compliance/financial exposure. Resolve before next external interaction. | Same day |
| **High** | Likely production failure, cross-client risk, broken publishing, or migration drift. | Within 7 days |
| **Medium** | Model, documentation, quality, or maintainability issue. | Address in normal sprint flow |
| **Low** | Cleanup, naming inconsistency, polish. | Opportunistic |
| **Info** | Observation worth knowing. Not a finding. Auto-closes after 30 days if no follow-up. | None |

Examples (anchored to ICE concrete):

- **Critical:** RLS gap exposes one client's drafts to another. Token in plaintext in EF logs. Cron writing to wrong client's pool.
- **High:** Recently-added critical migration table has no purpose registered. R6 ai-worker still picks up shadow jobs and fails them. Discovery EF returning 100% failure for 24h+.
- **Medium:** Older table has missing column purposes. Slow query on a rarely-used view. Trigger fires twice on the same event because of an upgrade artifact.
- **Low:** Naming inconsistency between `client_id` and `clientId` across helpers. Outdated comment.
- **Info:** "47 new canonicals processed since last audit." "Pool depth held steady within 5% of last week."

---

## 6. Snapshot scope

Versioned markdown file at `docs/audit/snapshots/YYYY-MM-DD.md`. Each snapshot is immutable evidence; never overwrite, only add new dates.

### 6.1 In scope

**Inventory layer (k):**
- `k.schema_registry` — list of ICE-owned schemas with purpose
- `k.table_registry` — table-level inventory + purpose coverage
- `k.column_registry` — column-level inventory + purpose coverage
- `k.pii_risk_level` — risk classification per object

**Evidence layer (Supabase state):**
- Migration list (count + last 10 entries by date)
- Edge Function inventory (deployed name + version + last_deployed_at — no source)
- `cron.job` summarised: jobid, jobname, schedule, active, target endpoint/function. Full command text NOT included unless investigating a specific finding.
- Cron failure summary: last 7 days, count by jobname, last failure timestamp
- Recent ai_job failures (last 7 days, redacted: job_type + status + error excerpt + count)
- `m.signal_pool` aggregated by vertical (count, avg fitness, oldest/newest)
- `m.slot` status counts by client × platform × status
- `m.slot_alerts` unacknowledged (last 7 days, by alert_kind + severity)
- Token expiry status per client × platform (days remaining; do NOT include token values)
- RLS policy summary on ICE tables (table → policy count + names)
- Recent post_publish counts per client × platform (last 7 days)
- GitHub state: commit count + last commit SHA + branch list (per repo)

**Decision-context layer:**
- Pointer to current `docs/00_sync_state.md` SHA
- Pointer to current `docs/06_decisions.md` SHA
- Pointer to current `docs/04_phases.md` SHA

### 6.2 Explicitly out of scope (security boundary)

- **Actual content** of any draft, post, canonical, or feed item
- **Vault secrets** in any form (names only if needed; never values)
- **OAuth tokens** in any form
- **Full database dumps** or any large data payloads
- **PII columns** (anything classified `pii_risk_level >= medium` is summarised, not enumerated)
- **Full cron command text** unless investigating a specific finding

### 6.3 Snapshot format

Markdown wrapper with JSON code blocks for tabular data. Best of both worlds — human-scannable, machine-parseable.

```markdown
# Audit Snapshot — 2026-04-28

## Summary
- ICE schemas: 7 (a, c, f, k, m, r, t)
- Active feeds: 68
- Active crons: 50
- ...

## k Registry Coverage
{ JSON code block here }

## Slot Status Counts
{ JSON code block here }
```

The first snapshot today will be generated manually via Supabase MCP queries; later automated via a Cowork task or Windows script.

---

## 7. ChatGPT integration mechanism

### 7.1 Hard constraint — no writes

**ChatGPT has no write access to anything in this project.** Not Supabase, not GitHub, not local files. ChatGPT generates findings as text output (in chat or via API). Operator (PK) or Claude commits the markdown. This is non-negotiable.

### 7.2 Build order

| Phase | Mechanism | Cost | When |
|---|---|---|---|
| **Phase 1 — Manual** | Operator pastes snapshot + role prompt into ChatGPT chat. Pastes findings back to Claude for closure. | Zero infrastructure | First runs |
| **Phase 2 — Project-assisted** | ChatGPT Project with snapshot folder as knowledge source. Operator asks the audit question; ChatGPT reads latest snapshot directly. | ChatGPT Plus subscription | Once Phase 1 produces consistent findings |
| **Phase 3 — API job** | Scheduled OpenAI API call with snapshot + role prompt. Output dumped to a file for operator review. | API cost (~$0.10/run estimate) | Only when Phase 2 friction justifies it |

Phase 1 is fine forever if operator burden stays low.

---

## 8. Snapshot generation mechanism

### 8.1 First version: manual via Supabase MCP

Today's snapshot generated by Claude running queries via Supabase MCP, formatting per Section 6.3, committing to `docs/audit/snapshots/2026-04-28.md`. No automation yet.

### 8.2 Second version: Cowork task or Windows script

Once snapshot format proves stable across 2-3 manual runs, automate via:

- **Option A — Cowork task** (preferred if Cowork can handle the queries + formatting + GitHub commit)
- **Option B — Windows PowerShell script** triggered by Task Scheduler, similar to the existing nightly Cowork task pattern

Decision deferred until first manual run reveals what kind of automation actually fits.

### 8.3 Never via Edge Function

EFs add deploy complexity and token management for a job that doesn't need to run inside Supabase. Snapshots run from outside Supabase, query into it.

---

## 9. Closure workflow

### 9.1 The loop

1. **Auditor side (overnight or manual):** Snapshot exists → ChatGPT plays role → outputs findings as markdown → operator/Claude commits findings to `docs/audit/runs/YYYY-MM-DD-{role}.md` AND appends new findings to `docs/audit/open_findings.md`.
2. **Auditee side (in chat with operator):** Operator says "process today's audit" → Claude reads `open_findings.md` and the run file → Claude proposes closure for each finding with reasoning → Operator approves / pushes back / adds nuance → Claude commits closures (batched at end of session, all in one commit).

### 9.2 Closure types

Each finding closes as exactly one of:

- **Explanatory** — "this is intentional because [reason], referencing [decision/commit]". Use when the finding is misframing reality. Common for v1 audits.
- **Action taken** — "fixed in [commit] / captured as backlog [item]". Use when the finding identifies a real issue we now address.
- **Redundant** — "already addressed in finding [F-id] or decision [D-id]". Use for duplicate findings across runs.
- **Genuine open** — "auditor is right, this needs work and is captured as [TODO/backlog item]". Use when there's a real gap but it's not getting fixed today.

### 9.3 Hard rule — no auto-close

Claude never auto-closes findings without operator approval per item. The whole point of the loop is operator-in-the-loop. Auto-close defeats the audit.

### 9.4 Commit batching

Closures are committed in one commit at the end of the session, not one-per-finding. Single commit message summarises the count: "audit: close 4 findings (2 explanatory, 1 action-taken, 1 redundant)".

---

## 10. Finding format

Each finding has a unique ID and lives in `open_findings.md` until closed. Closed findings stay visible (struck through or marked resolved) so the audit trail persists.

### 10.1 Finding ID format

`F-YYYY-MM-DD-{role-letter}-NNN`

- `D` = Data Auditor, `S` = Security, `O` = Operations, `C` = Compliance, `F` = Financial
- `NNN` = sequential within that role and date

Example: `F-2026-04-28-D-001` is the first Data Auditor finding from 28 April 2026.

### 10.2 Finding structure

```markdown
## F-2026-04-28-D-001  ·  HIGH  ·  open
**Role:** Data Auditor
**Raised:** 2026-04-28 02:14 UTC (audit run: runs/2026-04-28-data.md)
**Area:** Schema integrity
**Object:** public.create_feed_source_rss

### Issue
Three overloads exist: 3-param, 5-param, 6-param. The 6-param overload
has a latent NOT NULL bug — INSERT omits output_kind and refresh_cadence.
Has never executed against PostgREST due to schema-cache miss but is a
loaded gun if any caller starts using it.

### Evidence
- Snapshot: f.feed_source NOT NULL columns include output_kind, refresh_cadence
- Snapshot: pg_proc shows three overloads of create_feed_source_rss
- Decisions log: D180 documents this side-finding

### Recommended action
Drop overload B, OR fix it to set defaults for the missing NOT NULL columns.

### Resolution
[empty until closed]
```

### 10.3 Closure entry

When closed, the Resolution section is filled:

```markdown
### Resolution
**Closed 2026-04-28 04:30 UTC by operator** — Action taken: dropped
overload B in migration 010 (commit abc1234). 5-param overload is the
canonical write path for discovery-pipeline writes.
```

The status header changes from `· open` to `· closed-action-taken` (or `closed-explanatory` / `closed-redundant` / `closed-noted` as appropriate).

---

## 11. File structure

```
docs/
  audit/
    00_audit_loop_design.md       ← this file
    open_findings.md              ← active register, append + close
    roles/
      data_auditor.md             ← Role 1 prompt + scope
      security_auditor.md         ← future
      ops_auditor.md              ← future
      compliance_auditor.md       ← future
      financial_auditor.md        ← future
    runs/
      2026-04-28-data.md          ← first run
    snapshots/
      2026-04-28.md               ← first snapshot
    decisions/
      audit_scope_policy.md       ← scope policy doc (k owned vs Supabase managed)
```

---

## 12. Rotation schedule + override triggers

### 12.1 Default rotation (when fully operational)

| Day | Role |
|---|---|
| Mon | Operations |
| Tue | Data |
| Wed | Compliance |
| Thu | Security |
| Fri | Financial |
| Sat-Sun | No scheduled run |

Each role gets a deep look weekly. Operator processes one role's findings per day.

### 12.2 Override triggers (run an off-schedule pass)

These events trigger an immediate run of a specific role outside the schedule:

| Event | Trigger | Role |
|---|---|---|
| New migration applied | Any DDL via Supabase MCP | Data |
| New EF deployed | Any `supabase functions deploy` | Operations |
| New cron registered or modified | INSERT/UPDATE on `cron.job` | Operations |
| RLS policy added or removed | DDL on `pg_policies` | Security |
| Cost spike alert (>2x baseline) | `m.cost_alert` raised | Financial |
| New compliance rule added | INSERT on `t.compliance_rule` | Compliance |
| Pipeline incident (Critical/High in DLQ) | INSERT on `m.pipeline_incident` | Operations |

Override triggers are not implemented in Phase 1. Manual triggering (operator says "let's audit X") is sufficient until automation justifies the trigger plumbing.

---

## 13. Replacing D156

D156 (external reviewer layer) was paused per D162. This audit loop supersedes it for system-level review. The reviewer layer's per-draft scope is permanently retired — content review is now the auto-approver's job (single role, deterministic rules) plus the audit loop's compliance auditor (system-level patterns, not per-draft).

A formal D181 entry locks this in.

---

## 14. First build slice (today)

Steps 1-3 are this design session. Steps 4-7 are the live test of the loop.

1. ✅ `docs/audit/00_audit_loop_design.md` — this file
2. ⏳ `docs/audit/open_findings.md` — empty register, header only
3. ⏳ `docs/audit/roles/data_auditor.md` — role 1 prompt + scope
4. ⏳ `docs/audit/snapshots/2026-04-28.md` — first manual snapshot
5. ⏳ First Data Auditor pass (operator runs ChatGPT Project)
6. ⏳ First closure session (operator + Claude)
7. ⏳ First closures committed to `open_findings.md`

After step 7: review what worked, what didn't, decide whether to automate snapshot generation next or move to Role 2.

---

## 15. What the loop is NOT

- Not a SQL findings table (markdown is the register)
- Not a real-time alerting system (use Sentinel + slot_alerts for that)
- Not a replacement for code review (CC briefs and chat handle that)
- Not a replacement for human judgment (operator-in-the-loop is the whole point)
- Not a continuous-monitoring system (it's a periodic audit, by design)
- Not a substitute for PK's own reading of the system (it's an additional eye, not a primary one)

---

## 16. Related decisions

- **D156** — external reviewer layer (paused per D162; superseded by this loop for system-level audit)
- **D162** — sprint-mode pause on reviewer layer
- **D170** — MCP-applied migrations (Data Auditor will check migration discipline against this pattern)
- **D175** — versioned reference table FK pattern (Data Auditor checks)
- **D177** — fitness scale 0..100 (Data Auditor checks consistency at use sites)
- **D180** — discovery decides assignment, intelligence decides retention (informs how Data Auditor reads `f.feed_discovery_seed` triggers)
- **D181 (pending)** — locks the audit loop architecture and ChatGPT no-write rule

---

End of design doc. Living document — update as the loop evolves.
