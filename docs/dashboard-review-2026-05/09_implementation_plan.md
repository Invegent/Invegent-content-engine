# §9 — Implementation Plan

## Purpose

Executable plan that converts the current dashboard into the §6 final design. Not a roadmap; not aspirational. Each phase is sized so a session-bounded chat operator could draft the exact migrations and tickets from this doc.

Respects:
- A7 migration cost (8–12 chat hours / ≤3 migrations / ≤2 page rewrites per phase)
- Anti-pattern severity ordering from §6.7 (AP3, AP5, AP6 = ship-blockers)
- Production safety given current ICE state (S30 hold; jobid 80+81 active 0 runs; M5–M8 in flight; jobid 53 paused; `m.ef_drift_log`=98 preserved; standing don't-redeploy on heygen-creator/poller/draft-notifier; 17+ pending close-the-loop UPDATEs not §9's problem)

## Section-numbering note

§6–§8 used "§10" as the placeholder for migration sequencing. That work is THIS section (§9). The 11-section table in `00_overview.md` is still out-of-sync; reconciliation deferred per files-changed minimisation.

---

## 9.1 Implementation Principles

These rules constrain every phase. They override convenience.

### Operator workflow continuity

- **No operator workflow breaks mid-phase.** Each phase ships in a state where PK can complete a daily session without external help.
- **Old surfaces remain reachable until new surfaces prove themselves.** A new route ships ALONGSIDE the old route; the old route 301-redirects only after one full week of stable new-route operation.
- **Action layer ships before old paths retire.** Requeue UI exists before SQL-via-chat is taken away (today's de facto path). Retry render exists before "manual chat" is taken away.

### Anti-pattern blocker priority

- **AP3 / AP5 / AP6 must clear in Phase 0 + Phase 1.** These are ship-blockers per §6.7. They cannot wait for Phase 4 polish.
- **AP4 / AP7 cleared in Phase 3 (with build-blocker resolution).** AP4 needs Q3 mechanism; AP7 needs Q4 severity threshold.
- **AP1 / AP2 are continuous discipline.** Per-page enforcement at every design review; no single phase "closes" them.

### Production safety

- **No dashboard work conflicts with live cron jobs.** jobid 80 (drift-check), 81 (drift-log retention), and any cron touching the same tables get explicit time-window checks before migrations.
- **Schema migrations are dual-write before drop.** Add new column → dual-write for one phase → cut over readers → drop old column in the FOLLOWING phase. Never additive-and-drop in the same phase.
- **DDL goes through `apply_migration` per D-170; CC writes the file, chat applies, PK approves.** Per `userMemories`.
- **D-01 ChatGPT MCP review on every production patch.** Per `userMemories`.
- **Lesson #61 P1–P5 pre-flight before any production DDL/DML.** Per `userMemories`.

### Observable → actionable transitions staged

- **A surface gains observability before it gains action.** Pipeline Log shows doctor events (Phase 1) before ack action ships (Phase 3). Exception: requeue, which is the CRITICAL gap and ships in Phase 1 alongside its surface.
- **A new action ships with logging before UX polish.** First version writes to audit log; second version improves UX (e.g. confirmation modals).

### Capacity discipline

- **Each phase ≤ 12 chat hours.** PK session length is 2–4h; phase = 3–4 sessions max.
- **Migrations per phase ≤ 3.** Anti-fatigue cap.
- **Page rewrites per phase ≤ 2.** A "page rewrite" = a `page.tsx` whose JSX changes substantially; cosmetic edits don't count.
- **Cowork is parallel automation, not phase capacity.** Don't assume Cowork bandwidth for dashboard work.

### Reversibility

- **Every phase has a defined rollback path.** Phase fails → revert to previous-phase state without data loss.
- **Irreversible operations (column drops, route deletions) happen LAST in their phase.** The phase ships with all reversible work first; irreversible operations gated on stability check.

---

## 9.2 Phase Plan (authoritative)

Five phases. Phase 0 is groundwork. Phases 1–4 are progressive build.

Numbering inside phases uses `9.2.X.Y` format for traceability.

### Summary table

| Phase | Objective | Capacity | Migrations | Page rewrites | Critical AP cleared |
|---|---|---|---|---|---|
| 0 | Groundwork (additive only, no UI) | 6–8h | 3 | 0 | None directly; enables AP3/5/6/7 |
| 1 | Foundation: sidebar + requeue + visibility | 10–12h | 2–3 | 1 (sidebar) | AP3 (requeue), AP5 (MONITOR_TABS), AP6 (UI sweep) |
| 2 | Inbox + Pipeline reframe | 10–12h | 1–2 | 2 (Pipeline, Inbox) | (continues AP2/AP3 closure) |
| 3 | Action layer + Brief MVP + Telegram | 10–12h | 0–1 | 1–2 (Brief, Visual Pipeline) | AP4 (with Q3), AP7 (with Q4) |
| 4 | Polish: LLM enrichment + retires + drops | 8–10h | 1 | 0 | AP6 final (column drops) |

**Total:** 44–54 chat hours across ~15–18 sessions. At 2–3 sessions/week = 5–9 weeks elapsed.

---

## 9.3 Phase 0 — Groundwork (additive only)

**Objective.** Land all read-only-safe schema additions, table creations, and view definitions that subsequent phases depend on. No UI changes. No removals. Operator continues using existing dashboard unchanged.

**Why this phase exists.** Phase 1 needs the schema in place before it ships UI. Pushing schema + UI in one phase exceeds the 8–12h envelope and risks rolling back UI changes that already work because of an unrelated schema migration failure.

### 9.3.1 Migrations (3)

| Migration | Description | Risk | Rollback |
|---|---|---|---|
| **M-09-01** Add severity + ack to doctor log | `ALTER TABLE m.pipeline_doctor_log ADD COLUMN severity text DEFAULT 'info' CHECK (severity IN ('info','warning','severe'))`; `ADD COLUMN ack_at timestamptz`; `ADD COLUMN ack_by text`. Backfill existing rows: severity='info'. | Low — additive only; no readers care yet | Drop columns; backfill is idempotent |
| **M-09-02** Create `m.brief` table | New table per §8.8 Q2 schema (id, generated_at, scope, alerts jsonb, decisions jsonb, summary, templated_only, generation_ms, llm_input_hash). 30-day rolling retention via daily cleanup cron added at end of Phase 3 (not Phase 0). | Low — new table; no readers | DROP TABLE |
| **M-09-03** Create `m.vw_pipeline_state` view | View JOINs `m.digest_item` + `m.ai_job` + `m.post_draft` + `m.post_publish_queue` + `m.post_publish` with derived `state` per §6.5. Read-only. Indexed on derived `state` and `client_id` for swimlane perf. | Medium — must perf-test on prod-scale; cardinality of the JOIN may be expensive | DROP VIEW |

### 9.3.2 Schema additions (additive, NOT migrations — dual-write prep)

| Addition | Description | Risk |
|---|---|---|
| **S-09-01** Per-client JSONB column on health log | `ALTER TABLE m.pipeline_health_log ADD COLUMN per_client_published_today jsonb` (additive; old NDIS+PP cols stay). Begin dual-write in cron logic at end of Phase 1; cut readers in Phase 2; drop NDIS+PP cols in Phase 4. | Low |

### 9.3.3 Code-level inventory (no commits yet — produces a report)

| Sweep | Description | Output |
|---|---|---|
| **I-09-01** Hardcoded client name sweep | grep dashboard repo for "NDIS Yarns", "Property Pulse", "Care for Welfare", "NDIS_PP", "ndis_published_today", "pp_published_today" | List of file:line per match → Phase 1 fix tickets |
| **I-09-02** MONITOR_TABS sweep | grep for `MONITOR_TABS` and any related tab-coupling patterns across `/monitor`, `/pipeline-log`, `/visuals`, `/compliance`, `/costs`, `/performance` | List of file:line per match → Phase 1 fix tickets |
| **I-09-03** Server actions inventory | List existing endpoints in `app/actions/` and `/api/`; map to §6.2.c Action Layer to identify gaps | Action gap inventory → Phase 2/3 fix tickets |
| **I-09-04** Component-level hardcoded data sweep | grep `components/` and `app/(dashboard)/components/` for client name literals (covers §7 FLAG #7 AP6 sweep completeness) | Extension of I-09-01 |

### 9.3.4 Phase 0 success criteria

- All 3 migrations applied to production via `apply_migration` after D-01 ChatGPT review per migration
- All 3 inventories produced and committed to `docs/dashboard-review-2026-05/inventory/`
- `m.vw_pipeline_state` returns expected row counts on prod data; query latency < 500ms on representative samples
- Operator daily session unchanged — zero workflow disruption
- No production cron job affected

### 9.3.5 Phase 0 sequencing and prerequisites

- **Blocked on S30.** Phase 0 should not run until S30 hold-state clears (natural drift-check fire at 17:00 UTC + verification + PK approval per `userMemories`).
- **Coordinate with M5–M8 queue integrity work in flight.** M-09-03 view depends on `m.post_publish_queue` which M5–M8 are touching. Sequence M5–M8 first OR confirm migration intent doesn't conflict.
- **Q4 severity threshold from §6.10 must resolve before M-09-01 backfill classifier writes anything beyond 'info'.** Default classifier (info/warning/severe) lives in PK approval; classifier logic in doctor EF lands in Phase 1.
- **PK explicit go before each migration.** Per D-170 + Lesson #61.

### 9.3.6 Phase 0 capacity estimate

- M-09-01: 1h (additive ALTER + backfill)
- M-09-02: 1.5h (new table + 30-day cleanup function spec)
- M-09-03: 2.5h (view DDL + perf test + EXPLAIN review)
- I-09-01–I-09-04: 2h (greps + report drafting)
- D-01 review per migration: 0.5h × 3 = 1.5h
- Total: ~7–9h (within envelope)

---

## 9.4 Phase 1 — Foundation: sidebar + requeue + visibility

**Objective.** Reset IA and ship the CRITICAL action gap closure (requeue). Surface doctor events for AP7 prevention. Sweep hardcoded client references for AP6 prevention. Operator gets the largest single workflow improvement (requeue UI) in this phase.

**Why this is Phase 1.** Sidebar restructure is the IA-reset that all subsequent phases assume. Requeue is the CRITICAL gap from §3 row 22. Doctor severity visibility is AP7 prevention foundation. These three together justify the largest user-visible change in any single phase.

### 9.4.1 What is built

| Build item | Description | Files / surfaces |
|---|---|---|
| **B-09-01** Sidebar restructure | 5 sections: NOW (Daily + Investigate sub-groups), CLIENTS, CREATE, REPORTS, ADMIN. New nav structure per §6.1 + §6.2.a. | `components/sidebar.tsx` rewrite |
| **B-09-02** Route renames + redirects | Old routes 301-redirect to new for: `/system/formats` → `/formats`, `/system/subscriptions` → `/subscriptions`. Other route renames keep BOTH paths active in Phase 1; cut over later. | Vercel rewrites or Next.js `redirects()` |
| **B-09-03** Requeue dead-item action | Server action `app/actions/requeue.ts` accepts `{table, row_id, reason}`; transitions `dead` to appropriate prior state per §6.5; writes audit row. UI surface: dead-row action menu on Pipeline Log table. | `app/(dashboard)/pipeline-log/page.tsx` action menu update; new server action |
| **B-09-04** Doctor severity surfaced | Pipeline Log row table renders `severity` column from M-09-01. Color-code: info=neutral, warning=amber, severe=red. No ack action yet (Phase 3). | `app/(dashboard)/pipeline-log/page.tsx` column add |
| **B-09-05** MONITOR_TABS removal | Per I-09-02 inventory, remove `MONITOR_TABS` from all 6 affected files. Replace with NOW internal nav links (Investigate group) where applicable. Remove tab links to `/costs`, `/performance`, `/compliance` from MONITOR_TABS context (those move to REPORTS / ADMIN). | 6 page.tsx files edited |
| **B-09-06** Hardcoded client UI sweep | Per I-09-01 + I-09-04, replace string literals with dynamic `c.client` lookups OR proper config. Excludes schema column references (those handled in Phase 4 via dual-write window). | Multiple component + page files |
| **B-09-07** `/monitor` CLIENT_TABS data-driven | Replace hardcoded array with dynamic load from `c.client` matching `getClients()` pattern in `/pipeline-log`. | `app/(dashboard)/monitor/page.tsx` |
| **B-09-08** Telegram bot provisioned | Provision new Telegram bot via @BotFather; configure bot token in Vercel env; create webhook handler endpoint that ignores all incoming bot messages (per §8.6 zero-write contract); store operator chat ID in env or new `c.operator_telegram` table. | New `/api/telegram-webhook` route; env vars |
| **B-09-09** Doctor severity classifier in EF | Update doctor Edge Function to classify each fix as info/warning/severe at write time per §6.10 Q4 default thresholds. Backfill old rows already done in M-09-01 as 'info'. | Doctor EF Deno code |

### 9.4.2 What is removed (none in this phase)

Phase 1 introduces; it does not remove. `/queue`, `/failures`, `/system/formats`, `/system/subscriptions`, `MONITOR_TABS`-coupled tabs all retire in Phase 2 or later.

### 9.4.3 Migrations (2–3)

Most migrations were Phase 0. Phase 1 adds:

| Migration | Description | Risk | Rollback |
|---|---|---|---|
| **M-09-04** Add `c.operator_telegram` (optional) | If chat ID + push time stored in DB rather than env. Alternative: env vars only. Default: skip the table; use env. | Low | DROP TABLE |
| **M-09-05** Begin dual-write on `m.pipeline_health_log` | Update health-log writer cron to populate BOTH NDIS+PP legacy cols AND new `per_client_published_today` JSONB col. Code change, not DDL. | Low — dual-write is additive | Disable JSONB writes |
| **M-09-06** (Optional) Audit log for requeue actions | If existing `m.audit_log` doesn't cover requeue events, add `m.requeue_audit` (id, requeued_by, source_table, row_id, prior_state, new_state, reason, requeued_at). Default: extend existing audit if any. | Low | DROP TABLE |

### 9.4.4 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sidebar change disorients operator briefly | High (certain) | Low | Keep both old + new nav links discoverable; ship in-app banner on first load explaining structure |
| `MONITOR_TABS` removal leaves dead links | Medium | Medium | I-09-02 inventory ensures coverage; Phase 1 acceptance check: zero `MONITOR_TABS` references survive grep |
| Requeue action mis-targets state | Medium | High | State-machine per §6.5 must be locked first; default = revert to last successful state from audit; dry-run mode in Phase 1, full action in Phase 2 if dry-run shows confidence |
| Hardcoded client sweep misses component-level (AP6 residual) | Medium | Medium | I-09-04 sweep + Phase 1 acceptance grep catches surface-level; component-level may need second pass in Phase 4 |
| Telegram bot webhook accidentally enables write path | Low | High (P4 violation) | Webhook handler returns immediately ignoring payload; integration test verifies zero state mutations |
| Doctor EF classifier wrong on first deploy | Medium | Medium | Default 'info' is safe (most events are info); classifier tuning in Phase 3 alongside ack UI |

### 9.4.5 Phase 1 success criteria

- New sidebar deployed; operator daily session completable using new nav alone
- Old routes still reachable (no 404s); only `/system/*` flatten redirects active
- Requeue dead-item UI works on Pipeline Log; audit row written per requeue
- Doctor severity column visible on Pipeline Log; severe events visually distinct
- Zero `MONITOR_TABS` references in code (verified grep)
- All hardcoded client name literals at page-level replaced with dynamic lookups (verified grep against I-09-01 inventory)
- Telegram bot reachable; daily push slot configured (push content arrives in Phase 3)
- Operator confirms workflow continuity after one full week

### 9.4.6 Phase 1 capacity estimate

- B-09-01 sidebar rewrite: 2h
- B-09-02 redirects: 0.5h
- B-09-03 requeue (server action + UI): 2.5h
- B-09-04 severity column: 1h
- B-09-05 MONITOR_TABS removal: 2h
- B-09-06 hardcoded sweep + replace: 1.5h
- B-09-07 CLIENT_TABS data-driven: 0.5h
- B-09-08 Telegram bot infra: 1.5h
- B-09-09 doctor classifier: 1h
- D-01 reviews + testing: 1.5h
- Total: ~14h (above envelope; consider splitting Telegram + classifier into Phase 1.5 OR pulling B-09-09 forward only)

**Capacity flag.** B-09-08 + B-09-09 are candidates to defer to Phase 1.5 or Phase 2 if Phase 1 runs long.

---

## 9.5 Phase 2 — Inbox + Pipeline reframe

**Objective.** Replace `/queue` with state-machine view at NOW > Daily > Pipeline. Land Inbox bulk approve to clear F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts). Inbox absorbs compliance review queue items. /failures retires. /queue retires.

**Why this is Phase 2.** Phase 1 made requeue possible at row level; Phase 2 makes the swimlane / state view usable. Phase 1 surfaced doctor severity; Phase 2 turns it into actionable triage via Inbox. The 28-draft backlog has been waiting; Phase 2 closes it.

### 9.5.1 What is built

| Build item | Description | Files / surfaces |
|---|---|---|
| **B-09-10** Pipeline state-machine swimlane view | Build NOW > Daily > Pipeline page rendering swimlanes per state from `m.vw_pipeline_state`. Counts + recent rows + client filter. Click swimlane → row table. Click row → detail panel. | New `app/(dashboard)/pipeline/page.tsx` |
| **B-09-11** /queue route 301 redirect | After Phase 2 ships and Pipeline is verified for one week, `/queue` redirects to `/pipeline`. | Vercel config or Next.js redirects |
| **B-09-12** Inbox absorbs compliance review queue | Compliance review queue items become Inbox items via type=`policy`. Filter chip activates. /api/compliance PATCH endpoint extended OR adapter built. | `app/(dashboard)/inbox/page.tsx` extended; `/api/compliance` extended |
| **B-09-13** Inbox filter chips | Add filter chip bar: All / Drafts / Policy / Format / Agent. Counts displayed per chip. Chip selection persists in URL query string. | `app/(dashboard)/inbox/page.tsx` |
| **B-09-14** Inbox bulk approve | Multi-select checkboxes on draft items; bulk action bar with "Approve N" / "Reject N" / "Skip N" buttons. Per Q5 default: confirmation modal listing any HARD_BLOCK / WARN compliance flags + per-draft opt-out + 10s undo toast. | `app/(dashboard)/inbox/page.tsx`; new bulk-approve server action |
| **B-09-15** Pipeline Log absorbs failures | `/failures` data merges into Pipeline Log filtered to dead+failed states. Failed-item action menu adds retry + accept-as-dead options. /failures route retires (301 to pipeline-log filtered view). | `app/(dashboard)/pipeline-log/page.tsx`; redirect from `/failures` |
| **B-09-16** Pipeline Log dead-item action menu | Dead row action menu: requeue (already shipped Phase 1) + accept-dead. Click row → state history panel with audit trail visible. | `app/(dashboard)/pipeline-log/page.tsx` |
| **B-09-17** Health log dual-write cutover | Cron readers + dashboard readers cut over from NDIS+PP cols to JSONB col. NDIS+PP cols still written but no longer read. Drop happens in Phase 4. | Health log cron writer + dashboard reader code |

### 9.5.2 What is removed

- `/queue` route 301-redirects to `/pipeline` (after one week of stable Pipeline operation)
- `/failures` route 301-redirects to `/pipeline-log?state=dead` (after one week)
- /api/compliance PATCH endpoint may be deprecated if Inbox absorbs it cleanly (defer to Phase 4 if uncertain)

### 9.5.3 Migrations (1–2)

| Migration | Description | Risk | Rollback |
|---|---|---|---|
| **M-09-07** (Optional) Inbox materialised view | If Inbox query across 4 source tables (drafts + compliance + format + agent escalation) is slow, materialise as `m.vw_inbox_items` with refresh trigger. Default: try server-side query first; materialise only if perf demands. | Low–Medium | DROP MATERIALIZED VIEW |
| **M-09-08** Bulk approve audit table | New `m.bulk_approve_audit` (id, approved_by, batch_id, draft_ids text[], approved_count, rejected_count, skipped_count, hard_block_overrides int, undo_window_expired_at). Per §8 P2 audit requirement. | Low | DROP TABLE |

### 9.5.4 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `m.vw_pipeline_state` perf inadequate at scale | Medium | High | Phase 0 perf test established baseline; Phase 2 ships with caching layer if needed; materialise view with periodic refresh as fallback |
| Bulk approve mass-violates HARD_BLOCK compliance | Medium | High | Q5 default: confirmation modal lists flags per draft + per-draft opt-out + 10s undo + audit trail in M-09-08 |
| /queue 301 disorients operator who has bookmarked URL | High | Low | One-week soft-launch before redirect; banner on Pipeline page acknowledging migration; old route still works for 7 days post-redirect via prepend redirect |
| Inbox absorption breaks /api/compliance contract | Medium | Medium | Endpoint extended (not replaced); /compliance UI continues to work in parallel for 2 weeks before retiring |
| Health log JSONB schema diverges from cron writer | Medium | Medium | Schema validation at write time; CI lint on JSONB shape per `c.client` join |

### 9.5.5 Phase 2 success criteria

- NOW > Daily > Pipeline page operational; daily session uses Pipeline as primary queue view
- 28 drafts in F-AAP-NEEDS-REVIEW-BACKLOG cleared via bulk approve OR explicit per-draft decisions
- /queue 301-redirects after one stable week
- /failures 301-redirects after one stable week
- Inbox shows 4 filter chips with accurate counts; chip selection persists in URL
- Health log readers cut over to JSONB; NDIS+PP cols safely unread

### 9.5.6 Phase 2 capacity estimate

- B-09-10 Pipeline state-machine page: 3h (largest single rewrite)
- B-09-11 /queue redirect: 0.25h
- B-09-12 Inbox absorb compliance: 2h
- B-09-13 Inbox filter chips: 1h
- B-09-14 Inbox bulk approve + modal + undo: 2.5h
- B-09-15 Pipeline Log absorbs failures: 1.5h
- B-09-16 Dead-item action menu: 0.5h
- B-09-17 Health log dual-write cutover: 0.5h
- D-01 reviews + testing: 1h
- Total: ~12.25h (just inside envelope)

---

## 9.6 Phase 3 — Action layer + Brief MVP + Telegram

**Objective.** Complete the Action Layer per §6.2.c (the items not in Phase 1–2). Ship Brief surface MVP at templated baseline only (no LLM yet). Activate Telegram daily push. Cross-section pre-fill mechanism per Q3.

**Why this is Phase 3.** Phase 1–2 closed the CRITICAL action gap (requeue) and the bulk-approve workflow. Phase 3 closes the rest of the action layer (retry, ack, override, inline rule update, inline reconnect) and ships Brief at minimum viable shape. LLM enrichment waits for Phase 4 because templated baseline must prove first.

### 9.6.1 What is built

| Build item | Description | Files / surfaces |
|---|---|---|
| **B-09-18** Acknowledge auto-fix action | Pipeline Log doctor-event row "Acknowledge" button. Severe events block downstream movement until ack. Server action writes `ack_at` + `ack_by`. | `app/(dashboard)/pipeline-log/page.tsx`; new server action |
| **B-09-19** Severe ack creates Inbox item | Doctor severe event auto-creates Inbox `agent` item with subtype=`pipeline-doctor` action=`acknowledge`. Item resolves on ack. | Inbox source pipeline; doctor EF or background job |
| **B-09-20** Retry failed render | Visual Pipeline Render Log row "Retry" button. Re-fires image-worker job for that `post_draft_id`. Audit row written. | `app/(dashboard)/visuals/page.tsx` (renamed Visual Pipeline) |
| **B-09-21** Override format-advisor decision | Visual Pipeline advisor decision row, low-confidence rows show "Override" button. Format picker. If downstream impact, escalates to Inbox. | `app/(dashboard)/visuals/page.tsx` |
| **B-09-22** Inline reconnect token | Overview token alert banner "Reconnect" button. Redirects to `/connect?platform=X&client_slug=Y` with deep link semantics. | `app/(dashboard)/overview/page.tsx`; CLIENTS > Connect |
| **B-09-23** Inline rule update from Inbox | Inbox `policy` item expand: "Apply" button opens inline rule editor with suggested edit pre-filled via Q3 mechanism (default: query string params). Save = PATCH `m.compliance_rule`. Returns to Inbox. | `app/(dashboard)/inbox/page.tsx`; ADMIN > Compliance Rules editor accepts pre-fill |
| **B-09-24** Cross-section pre-fill mechanism (Q3) | Standard query-string contract: `?rule_key=X&suggestion_payload=Y` (URL-encoded JSON). Compliance Rules editor reads + pre-fills. Pattern reusable for other handoffs. | New utility module; Compliance Rules page extension |
| **B-09-25** Brief surface (templated baseline only) | New `app/(dashboard)/overview/components/Brief.tsx`. Renders Alerts / Decisions / Summary blocks from templated baseline only. No LLM call yet. Hard caps enforced. Click-throughs use Q3 pre-fill. | New component; new server-side data fetcher; query Phase 0 inputs from §8.2 |
| **B-09-26** Brief generation cron | pg_cron job daily 06:30 AEST. Calls Edge Function `brief-generator` (templated only). Writes to `m.brief`. Triggers Telegram push at 07:00. | New EF; new pg_cron job |
| **B-09-27** `m.brief` 30-day cleanup cron | pg_cron daily; deletes rows older than 30 days. | New pg_cron job |
| **B-09-28** Telegram daily push | Telegram bot sends message at 07:00 AEST per §8.3 format. Dedup vs prior-day push. | Telegram bot integration |
| **B-09-29** Brief manual refresh button | Web-only "Refresh" button on Brief block. Calls EF; updates cached row; does NOT push Telegram. | Brief component |
| **B-09-30** Stale indicator on Brief items | If underlying counts change between Brief generation and current state, show strikethrough + new count on affected items. | Brief component + state diff query |

### 9.6.2 What is removed

None in Phase 3. All items from Phase 2 already retired by start of Phase 3.

### 9.6.3 Migrations (0–1)

Phase 3 is mostly UI + EF work. Possible migration:

| Migration | Description | Risk |
|---|---|---|
| **M-09-09** (Optional) Brief input snapshot table | If `m.brief` storage is insufficient for debugging, add `m.brief_input_snapshot` capturing the templated input state at generation time. Default: skip; logs in `m.pipeline_doctor_log` are sufficient. | Low |

### 9.6.4 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Q3 pre-fill mechanism choice (query string) hits URL length limits | Low | Medium | Long suggestion payloads use POST + form state; query string handles ≤ 2KB |
| Brief surface is "a nicer Overview" failing PK's critical instruction | Medium | High | Templated baseline forces salience scoring + cross-table inputs from Phase 0 view; PK sample-reads first 2 weeks; §8.6 acceptance test applied |
| Telegram daily push misfires (wrong content / wrong time) | Medium | Medium | Phase 3 ships push to PK only; one-week monitoring; toggle-off in env if needed |
| Q4 severity threshold tuned wrong; severe events too noisy or too quiet | Medium | Medium | Default classifier ships in Phase 1; Phase 3 tunes based on 4 weeks of data; ack queue depth is the metric |
| Inline rule update mass-edits compliance rule by accident | Low | High | Q3 default: query string carries SUGGESTION not COMMIT; operator clicks Save inside editor; never auto-applies |
| Brief stale indicator confuses operator | Low | Low | Visual treatment subtle; tooltip explains "underlying state changed since this Brief generated" |

### 9.6.5 Phase 3 success criteria

- All §6.2.c Action Layer items shipped (requeue + retry + ack + inline rule update + override format + inline reconnect + bulk approve)
- Brief block renders on Overview with templated baseline content
- Daily Telegram push reaches PK at 07:00 AEST; content matches web Brief
- Manual refresh button regenerates Brief on demand
- Q3 pre-fill mechanism documented + reusable across handoffs
- Inbox→ADMIN Compliance Rules handoff verified end-to-end
- F-AAP-NEEDS-REVIEW-BACKLOG closed (was Phase 2; verify still closed)
- Doctor severe events surface in Inbox; ack queue depth manageable (≤5 outstanding)

### 9.6.6 Phase 3 capacity estimate

- B-09-18 ack action: 1h
- B-09-19 severe ack → Inbox: 0.5h
- B-09-20 retry render: 1h
- B-09-21 override format: 1.5h
- B-09-22 inline reconnect: 0.5h
- B-09-23 inline rule update from Inbox: 1.5h
- B-09-24 cross-section pre-fill mechanism: 1.5h
- B-09-25 Brief component (templated): 2h
- B-09-26 Brief generation EF + cron: 1h
- B-09-27 cleanup cron: 0.25h
- B-09-28 Telegram push: 1h
- B-09-29 manual refresh: 0.25h
- B-09-30 stale indicator: 0.5h
- D-01 reviews + testing: 1h
- Total: ~13.5h (slightly above envelope; B-09-30 stale indicator candidate to defer to Phase 4)

---

## 9.7 Phase 4 — Polish: LLM enrichment + retires + drops

**Objective.** Add LLM enrichment to Brief Summary block. Retire deferred routes. Flatten URLs. Drop NDIS+PP cols from `m.pipeline_health_log` (irreversible; gated on Phase 2 dual-write success). Promote /onboarding to nav (already in sidebar from Phase 1; verify). REPORTS Calibration tab promotion.

**Why this is Phase 4.** Cleanup phase. Everything reversible has shipped. Phase 4 contains the irreversible operations (column drop) and the nice-to-have (LLM enrichment). If Phase 3 stable, Phase 4 is low-risk.

### 9.7.1 What is built

| Build item | Description |
|---|---|
| **B-09-31** LLM enrichment for Brief Summary | Brief generator EF gains LLM call (Claude default per §8.8 Q4) for Summary block. Templated baseline still ships if LLM fails. `templated_only` boolean on `m.brief` row indicates which mode. |
| **B-09-32** REPORTS Calibration tab promotion | Existing Approval Patterns inner tab on `/performance` promoted to peer tab. URL: `/performance/calibration` or `/calibration`. Calibration content unchanged (read-only per locked decision 3); only nav placement changes. |
| **B-09-33** /onboarding nav promotion verification | Verify Phase 1 sidebar correctly links /onboarding under CLIENTS. If missing, add. |
| **B-09-34** Visual Pipeline rename | `/visuals` H1 changes to "Visual Pipeline". URL stays /visuals (URL flatten not needed; "visuals" is short enough). |
| **B-09-35** Component-level hardcoded data sweep (final pass) | Per §7 FLAG #7 AP6 sweep completeness, second-pass grep across `components/` directories that may have been missed in Phase 1. |
| **B-09-36** Drift panel placeholder slot (NOT implementation) | Reserve placement under NOW > Investigate > Pipeline Log per §6.9. Actual implementation gates on F-EF-DRIFT-PREVENTION Stage 2b shipping. |

### 9.7.2 What is removed (irreversible)

| Removal | Description | Gate |
|---|---|---|
| **R-09-01** Drop NDIS+PP cols from `m.pipeline_health_log` | After Phase 2 dual-write window confirmed (4+ weeks of stable JSONB reads), drop legacy columns. Per §6.7 AP6 ship-blocker final close. | 4+ weeks of dual-write success; reader cutover verified; PK approval; D-01 review |
| **R-09-02** Drop /api/compliance PATCH (if redundant) | If Inbox absorption cleanly replaces /compliance PATCH endpoint, deprecate it. Default: keep both endpoints; never deprecate without 4 weeks zero-call telemetry. | Telemetry shows zero calls for 4+ weeks |
| **R-09-03** Retire /drafts route | 301-redirect to /inbox per §6.9 default. PK preference can override. | PK confirms preference |

### 9.7.3 Migrations (1)

| Migration | Description | Risk | Rollback |
|---|---|---|---|
| **M-09-10** Drop NDIS+PP cols | `ALTER TABLE m.pipeline_health_log DROP COLUMN ndis_published_today, DROP COLUMN pp_published_today`. Irreversible. | High in concept; mitigated by 4+ week dual-write window | Restore from Supabase Pro daily backup if catastrophic |

### 9.7.4 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM enrichment hallucinates non-existent patterns | Medium | Medium | Prompt explicitly requires citations to templated input; salience score override if claim doesn't match data; fallback to templated-only if confidence low |
| Column drop breaks unread reader code | Low (after dual-write window) | High | 4+ week dual-write + telemetry verifying zero NDIS+PP col reads; CI scan for column references before DDL |
| LLM cost spike | Low | Low | Daily generation = ~30 calls/month at ~2K tokens; trivial cost |
| /drafts retirement breaks operator bookmark | Low | Low | 301 redirect; one-week banner |

### 9.7.5 Phase 4 success criteria

- Brief Summary block uses LLM enrichment when available; templated fallback verified
- REPORTS Calibration tab is a peer tab (not inner tab); URL stable
- NDIS+PP cols dropped from `m.pipeline_health_log`; backup confirmed; readers verified zero references
- All v1 anti-pattern remediations final-closed (AP3, AP5, AP6 ship-blockers complete; AP4, AP7 prevention contingent items honored)

### 9.7.6 Phase 4 capacity estimate

- B-09-31 LLM enrichment: 2.5h
- B-09-32 Calibration promotion: 1h
- B-09-33 onboarding verify: 0.25h
- B-09-34 Visual Pipeline rename: 0.25h
- B-09-35 component-level sweep final: 1.5h
- B-09-36 drift panel slot reserve: 0.25h
- M-09-10 NDIS+PP col drop: 1h (mostly safety checks)
- R-09-03 /drafts redirect: 0.25h
- D-01 reviews + testing: 1h
- Total: ~8h (under envelope; intentional for irreversible-operation phase)

---

## 9.8 Critical Path Items (order matters)

These are the four items §6 + §7 flagged as load-bearing. Their sequencing dictates phase ordering.

### 9.8.1 Action Layer

**Order:**
1. **Requeue** (Phase 1 / B-09-03) — CRITICAL §3 row 22 gap
2. **Bulk approve** (Phase 2 / B-09-14) — closes F-AAP-NEEDS-REVIEW-BACKLOG
3. **Acknowledge** (Phase 3 / B-09-18) — AP7 prevention
4. **Inline rule update** (Phase 3 / B-09-23) — AP4 prevention
5. **Override format** (Phase 3 / B-09-21) — AP4 prevention
6. **Retry render** (Phase 3 / B-09-20) — AP2 prevention
7. **Inline reconnect** (Phase 3 / B-09-22) — UX polish

**Why this order.** Requeue is the largest single workflow gap; ship first. Bulk approve has explicit pending demand (28 drafts). Other actions ship together in Phase 3 because they all depend on Q3 + Q4 resolution.

### 9.8.2 Inbox Model

**Order:**
1. **Filter chips + severity sort** (Phase 2 / B-09-13) — structural change
2. **Compliance review queue absorption** (Phase 2 / B-09-12) — type=`policy` items
3. **Bulk approve** (Phase 2 / B-09-14) — backlog clearance
4. **Format escalations** (Phase 3 / B-09-21) — type=`format` pathway
5. **Severe ack items** (Phase 3 / B-09-19) — type=`agent` pathway

**Why this order.** Filter chips and severity sort are foundational — they make Inbox usable for absorption. Compliance items absorb in Phase 2 to retire /compliance Review Queue tab. Bulk approve closes the backlog. Format + agent escalations come in Phase 3 because they depend on action layer items shipping in same phase.

### 9.8.3 Pipeline State Model

**Order:**
1. **`m.vw_pipeline_state` view created** (Phase 0 / M-09-03) — read-only foundation
2. **Pipeline Log severity column** (Phase 1 / B-09-04) — first state-aware UI
3. **Pipeline state-machine swimlane page** (Phase 2 / B-09-10) — primary surface
4. **Pipeline Log dead-item action menu** (Phase 2 / B-09-16) — row-level actions
5. **Severe ack blocking downstream** (Phase 3 / B-09-18) — state transition gating

**Why this order.** View first (Phase 0); add UI consumers progressively. State-machine view ships in Phase 2 because Phase 0 perf testing needs to validate before primary swimlane page ships.

### 9.8.4 Brief System

**Order:**
1. **`m.brief` table** (Phase 0 / M-09-02) — storage
2. **Telegram bot infrastructure** (Phase 1 / B-09-08) — channel ready
3. **Templated baseline Brief surface** (Phase 3 / B-09-25) — web canonical
4. **Brief generation cron + Telegram daily push** (Phase 3 / B-09-26 + B-09-28) — cadence active
5. **LLM enrichment** (Phase 4 / B-09-31) — quality upgrade

**Why this order.** Storage + bot infrastructure first (no operator visibility yet). Templated baseline before LLM enrichment per §8 hybrid logic. LLM enrichment last because templated must prove first — if templated baseline is wrong, LLM enrichment will amplify the wrong.

### 9.8.5 Cross-cutting dependency: Q3 mechanism

Q3 (cross-section pre-fill) blocks:
- B-09-23 inline rule update (Phase 3)
- B-09-25 Brief drilldowns (Phase 3)
- All future cross-section handoffs

**Resolution gate.** PK confirms Q3 default (query string params) before Phase 3 Sprint Day 1. If query string is rejected, Phase 3 work pauses on B-09-23, B-09-25 specifically; other Phase 3 items continue.

### 9.8.6 Cross-cutting dependency: Q4 severity threshold

Q4 (doctor auto-fix severity threshold) blocks:
- B-09-09 doctor classifier (Phase 1)
- B-09-19 severe ack → Inbox (Phase 3)

**Resolution gate.** PK confirms Q4 default (info/warning/severe) before Phase 1 Sprint Day 1. Default ships safe (most events classify as info initially); tuning in Phase 3.

---

## 9.9 Migration Risk Table

From §6.8 + §7.8 + this plan, the high-risk migrations and their mitigations.

| Migration | Phase | Risk Level | What could break | Mitigation |
|---|---|---|---|---|
| M-09-01 doctor severity + ack columns | 0 | Low | Existing readers unaffected; default 'info' is safe | Backfill is idempotent; rollback = drop columns |
| M-09-03 `m.vw_pipeline_state` view | 0 | Medium | Perf inadequate at prod-scale | Phase 0 EXPLAIN review; perf benchmark on representative samples; fallback = materialised view in Phase 2 |
| S-09-01 health log JSONB col | 0 | Low | Cron writer schema diverges | Schema-validated writer in Phase 1 dual-write |
| M-09-05 health log dual-write code | 1 | Low | Dual-write race condition | Single transaction insert; CI test |
| B-09-08 Telegram bot infrastructure | 1 | Medium | Bot accidentally enables write path (P4 violation) | Webhook handler ignores all incoming; integration test verifies zero state mutations; §8.6 build acceptance |
| B-09-09 doctor severity classifier | 1 | Medium | Wrong classification (too noisy / too quiet) | Default 'info' safe; tune in Phase 3 from real data; ack queue depth is metric |
| B-09-10 Pipeline state-machine page | 2 | High | View perf inadequate; sidebar disorient operator | Phase 0 perf baseline; ship alongside `/queue` for one week before redirect; banner explaining migration |
| B-09-14 Inbox bulk approve | 2 | High | HARD_BLOCK mass-violation | Q5 default: confirmation modal lists per-draft flags + per-draft opt-out + 10s undo + audit table |
| B-09-17 health log JSONB read cutover | 2 | Medium | Reader missed; old col stale | CI grep + integration test; revert switch via env flag if needed |
| B-09-23 inline rule update from Inbox | 3 | Medium | Pre-fill carries unintended commit | Q3 default: query string SUGGESTION; never auto-commits; operator clicks Save inside editor |
| B-09-25 Brief surface | 3 | High (product risk) | Brief is "nicer Overview"; PK rejects | Templated baseline first; §8.6 acceptance test; PK sample-reads first 2 weeks; salience tuning from feedback |
| B-09-28 Telegram daily push | 3 | Medium | Wrong content / wrong time / spam | One-week monitoring; toggle-off via env; rate limit on CRITICAL push |
| B-09-31 LLM enrichment | 4 | Medium | Hallucination | Templated baseline always ships; LLM Summary marked when degraded; salience override if claim doesn't match data |
| M-09-10 NDIS+PP column drop | 4 | High (irreversible) | Reader missed; data lost | 4+ week dual-write window; telemetry verifies zero reads; Supabase Pro daily backup as ultimate fallback |

---

## 9.10 Rollback Strategy

### Per-phase rollback

Each phase has a defined rollback path. "Phase fails" means: more than one Phase success criterion missed, OR critical operator workflow broken, OR PK directs rollback.

| Phase | Rollback path |
|---|---|
| 0 | Drop new tables + new columns + view in reverse order. No UI changes to revert. Code-level inventory is non-destructive (just docs). |
| 1 | Revert sidebar.tsx; restore `MONITOR_TABS`; remove requeue server action + UI; remove severity column UI render (column stays in schema). Phase 0 schema preserved. |
| 2 | Revert /pipeline page; remove /queue redirect (restore `/queue`); remove Inbox filter chips; remove bulk approve UI; restore /api/compliance original endpoint; revert health log reader cutover (still dual-write, just read NDIS+PP cols). |
| 3 | Remove Brief component from Overview; disable Brief generation cron; disable Telegram daily push; remove ack action UI (column stays); remove inline rule update Apply button (operator goes back to manual paste); remove retry/override/inline-reconnect UIs. |
| 4 | LLM enrichment: revert Brief generator EF to templated-only mode (set `templated_only=true` flag). NDIS+PP column drop is the IRREVERSIBLE operation; restore from Supabase Pro daily backup if needed. /drafts redirect: remove redirect rule. |

### Backward compatibility commitments

Things that MUST remain backward-compatible across phases:

| Item | Compatibility window |
|---|---|
| `/queue` URL | Active until end of Phase 2 + 1 week soft launch; redirect after |
| `/failures` URL | Active until end of Phase 2 + 1 week; redirect after |
| `/system/formats` URL | Redirected from Phase 1 (low-risk; URL is internal) |
| `/system/subscriptions` URL | Redirected from Phase 1 |
| `m.pipeline_health_log` NDIS+PP cols | Read-supported until end of Phase 2; dual-write through Phase 4 start; drop in Phase 4 R-09-01 |
| `/api/compliance` PATCH endpoint | Active until R-09-02 gate (telemetry + 4 weeks zero-call) |
| `m.compliance_rule` row shape | No schema changes in v1; rule editor reads/writes existing shape |
| `c.client_publish_profile` shape | No schema changes in v1 |

### Hot-fix protocol

If a phase ships and operator workflow breaks within 24h:

1. PK signals via chat / Telegram
2. Identify the broken surface
3. Per-phase rollback executes for that specific item (NOT the whole phase)
4. Hot-fix migration through D-01 review per `userMemories`
5. Document in `docs/runtime/sessions/` + add to `00_action_list.md` under Active

---

## 9.11 Dependencies

### Infra dependencies

| Dependency | Required by | Where it lands |
|---|---|---|
| `m.brief` table | Phase 3 Brief surface | Phase 0 M-09-02 |
| `m.vw_pipeline_state` view | Phase 2 Pipeline page | Phase 0 M-09-03 |
| `m.pipeline_doctor_log.severity` + `ack_at` columns | Phase 1 severity surface; Phase 3 ack action | Phase 0 M-09-01 |
| `m.pipeline_health_log.per_client_published_today` JSONB col | Phase 2 reader cutover | Phase 0 S-09-01 |
| Telegram bot (token + chat ID) | Phase 3 daily push | Phase 1 B-09-08 |
| `c.operator_telegram` table OR env vars | Phase 3 push routing | Phase 1 B-09-08 (default: env vars) |
| Q3 cross-section pre-fill mechanism resolved | Phase 3 inline rule update; Phase 3 Brief drilldowns | PK approval before Phase 3 Sprint Day 1 |
| Q4 severity threshold resolved | Phase 1 doctor classifier; Phase 3 severe ack → Inbox | PK approval before Phase 1 Sprint Day 1 |
| Q5 bulk approve UX safety resolved | Phase 2 bulk approve | PK approval before Phase 2 Sprint Day 1 |
| Brief LLM provider config | Phase 4 LLM enrichment | Existing ai-worker / new brief-worker EF |
| `m.bulk_approve_audit` table | Phase 2 bulk approve | Phase 2 M-09-08 |

### Sequencing constraints

- **S30 must clear before Phase 0 starts.** Per `userMemories`: investigate parallel-fire scan `bef6be96` first; verify natural drift-check fire at 17:00 UTC; PK explicit go.
- **M5–M8 queue integrity work must reconcile with M-09-03 view definition.** Either M5–M8 ships first OR M-09-03 view is built against M5–M8 stable schema.
- **Phase 0 fully complete before Phase 1.** No partial Phase 0; UI changes in Phase 1 assume schema in place.
- **Phase 1 sidebar restructure must complete before Phase 2 retires `/queue`.** Operator must not lose nav before primary surface is migrated.
- **Phase 2 stable for 1 week before Phase 3 Brief ships.** Brief depends on Inbox + Pipeline being mature.
- **Phase 3 templated Brief stable for 4 weeks before Phase 4 LLM enrichment.** Templated baseline must prove correctness before LLM amplifies.
- **Phase 2 dual-write stable for 4 weeks before Phase 4 column drop.** Per `R-09-01` gate.
- **No EF deploys to heygen-creator / heygen-poller / draft-notifier during any phase.** Per `userMemories` standing don't-redeploy.
- **All migrations gated on D-01 ChatGPT review.** Per `userMemories` D-01 protocol.
- **All migrations gated on Lesson #61 P1–P5 pre-flight.** Per `userMemories`.

### Coordination with active workstreams

| Workstream | Interaction with this plan |
|---|---|
| F-EF-DRIFT-PREVENTION Stage 2b (drift panel UI) | Lands as B-09-36 placeholder slot in Phase 4; full implementation gates on Stage 2b shipping; not part of §9 critical path |
| F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts) | Resolved by B-09-14 bulk approve in Phase 2 |
| F-YT-NY-FORMAT-SELECTION (NY×YT blocked) | Out of scope for §9; resolves independently |
| M5–M8 queue integrity migrations | Sequence before M-09-03 view OR coordinate schema |
| Cowork weekly reconciliation | Continues in parallel; not affected by §9 phases |
| Cowork ICE Nightly Health Check | Continues in parallel; reads existing tables, not affected |
| 17+ pending close-the-loop UPDATEs to `m.chatgpt_review` | Out of scope for §9; resolves independently per D-01 protocol |
| jobid 53 (instagram-publisher) re-enable | Out of scope for §9; cap-throttle planning is separate |

---

## 9.12 Deferred Items Handling

From §6.9 deferred list, mapped to v1 status + reconsideration trigger.

| Deferred item | v1 status | Reconsider when |
|---|---|---|
| Reviews placement (Open Decision 3) | Stays in ADMIN throughout v1 | First external client onboards |
| Roadmap fate (Open Decision 4) | ADMIN > Roadmap read-only viewer; editing chat+git | Dashboard becomes editing surface |
| Layer 1/2 boundary on Performance (Open Decision 5) | Ops Performance stays in REPORTS | First external client onboards (Layer 2 portal split) |
| `/reviews` vs `m.chatgpt_review` naming clash | No `m.chatgpt_review` surface in v1 | v2 surface added |
| `/drafts` alias-vs-retire | Default alias to `/inbox` (Phase 4 R-09-03) | PK preference any time |
| Format Performance home overlap | Both lenses retained (REPORTS Performance + NOW Visual Pipeline) | Operator confusion reported |
| Calibration UI / threshold tuning | v2 (locked decision 3); read-only Calibration tab in v1 | v2 review |
| Agent simulator | v2 | v2 review |
| Agent profile pages | v2 | v2 review |
| Inline agent prompt editing | v2 | v2 review |
| Sidebar search | Not in v1 | Discoverability complaint |
| Brand/client switcher | v1 keeps global nav with per-page filtering | 5+ external clients |
| Email digest of Brief | v2 | First external client + email cadence justified |
| Mobile inbox / voice approval | Permanently out (locked decision 2) | Never |
| Role-gated nav | v1 single nav | 2nd human takes part of loop |
| `m.chatgpt_review` dashboard surface | No surface v1 | v2 if needed |
| EF drift panel placement | Slot reserved (Phase 4 B-09-36) | F-EF-DRIFT-PREVENTION Stage 2b ships |
| LOW-severity Inbox items | Excluded v1 | Visibility complaint |
| Mixed-type bulk Inbox actions | v1 = drafts only bulk | v2 |
| Two-way Telegram | Permanently out | Never |
| Multi-operator Telegram routing | v1 = single operator | 2nd operator joins |
| Brief content quality formal acceptance test | Procedural; PK sample-reads | Formalise if Brief quality regresses |
| Brief long-term audit retention | 30-day rolling v1 | Audit trail demand from external client |
| Per-request LLM override | v1 = Claude default | Cost or quality reason emerges |
| Localisation / time-zone | AEST only v1 | Multi-timezone operators |

---

## 9.13 Build-Blockers (carry forward)

Items that prevent Phase 0 (or specific later phase) from starting. Must resolve before kick-off.

### Resolved before any phase

| Source | Status |
|---|---|
| §6.10 Q1 Brief content generation source | RESOLVED in §8.2 as HYBRID |
| §6.10 Q2 Pipeline state derivation logic | DEFAULT in §6: server-side view (`m.vw_pipeline_state`); confirmed in M-09-03 |

### Block Phase 0 start

| Question | Default | PK action required |
|---|---|---|
| **S30 hold-state cleared** | n/a | Wait for natural drift-check fire 17:00 UTC; verify; explicit go per `userMemories` |
| **M5–M8 reconciliation with M-09-03 view** | M5–M8 first | PK confirms M5–M8 sequencing OR confirms M-09-03 view is safe to build now |

### Block Phase 1 start

| Question | Default | PK action required |
|---|---|---|
| **§6.10 Q4 doctor severity threshold** | info / warning / severe (severe = ack required) | PK confirms or proposes alternative |
| **§8.8 Q1 Telegram bot infrastructure** | Provision new via @BotFather; bot token in Vercel env | PK confirms or names existing bot |
| **§8.8 Q3 operator push time** | 07:00 AEST | PK confirms or proposes alternative |

### Block Phase 2 start

| Question | Default | PK action required |
|---|---|---|
| **§6.10 Q5 bulk approve UX safety** | Confirmation modal listing HARD_BLOCK / WARN flags + per-draft opt-out + 10s undo | PK confirms or proposes alternative |

### Block Phase 3 start

| Question | Default | PK action required |
|---|---|---|
| **§6.10 Q3 cross-section pre-fill mechanism** | Query string params (URL-encoded JSON for long payloads) | PK confirms or proposes alternative |
| **§8.8 Q2 `m.brief` schema + retention** | Schema spec'd in §8.8 + 30-day rolling | PK confirms or proposes alternative |
| **§8.8 Q4 LLM choice for enrichment** | Claude API with OpenAI fallback + templated ultimate failsoft | PK confirms or proposes alternative |
| **§8.8 Q5 multi-client scope** | v1 = global only (`scope` column reserved for v2) | PK confirms |

### No blockers for Phase 4

Phase 4 inherits all build-blocker resolutions. Independent gates: 4+ week dual-write window for column drop; PK approval for irreversible operations.

---

## 9.14 Honest limitations

- Capacity estimates are author-shoes. PK's actual session pace will calibrate phase boundaries.
- The Phase 0 perf test of `m.vw_pipeline_state` is the highest-risk-of-rework item. If perf is inadequate, M-09-03 changes shape (materialised view + refresh trigger) and Phase 2 B-09-10 timeline shifts.
- Q3 mechanism choice (query string default) may be inadequate for long suggestion payloads. If PK rejects query string in favor of session storage or DB row, B-09-23 + B-09-25 estimates increase.
- Brief surface (B-09-25) is the highest-risk-of-product-failure item. Templated baseline may produce content that fails the §8.6 acceptance test ("is this a nicer Overview?"). If so, salience scoring needs tuning before Phase 3 closes; PK sample-read feedback is the calibration mechanism.
- LLM enrichment cost projection (Phase 4) is rough: ~30 calls/month at ~2K tokens. Real cost depends on Claude pricing at time of build. Trivial in v1.
- Cowork capacity is NOT counted in this plan. If Cowork bandwidth becomes available for parallel dashboard work, phases can compress; default plan does not assume.
- Component-level grep sweeps (I-09-04, B-09-35) depend on grep discipline. False negatives possible. Phase 4 second-pass mitigates but doesn't guarantee.
- The 4-week dual-write window before column drop (R-09-01) is heuristic. Could be 2 weeks if reader cutover is verifiably complete; could be 8 weeks if uncertainty remains. PK + reader-telemetry data informs.
- This plan does NOT include the 17+ pending close-the-loop UPDATEs to `m.chatgpt_review`. Those resolve independently per D-01 protocol.
- This plan does NOT include cap-throttle planning for re-enabling jobid 53 (instagram-publisher). That is separate work.
- This plan does NOT include client-portal (Layer 2) work. Per `docs/04_phases.md` Phase 3.1, that lands when first external client onboards.
- The 11-section table in `00_overview.md` is still out-of-sync. Reconciliation deferred to a single later session per files-changed minimisation.
- §10 in this review series was originally "migration sequence"; that work is THIS doc (§9). §10 + §11 are now reserved for: §10 = New product objects (`m.attention_item` + agent status + scope primitive + `m.brief` finalised); §11 = Risks + open decisions consolidation. Final review structure may differ from the kickoff plan; will be reconciled at §11.

---

*Created 2026-05-06 (Sydney). §9 of 11 in the dashboard architecture review (formerly §10 in the kickoff plan; section-numbering note above). Inputs: `02_target_ia_mapping.md`, `06_final_target_design.md`, `07_traceability_matrix.md`, `08_brief_and_comms_layer.md`. Five phases (0–4) with explicit migrations, build items, success criteria, capacity estimates. 5 build-blockers carried forward (Q1 Brief, Q2 pipeline state, Q3 pre-fill, Q4 severity threshold, Q5 bulk approve UX) PLUS 5 channel-related (§8.8 Q1–Q5). Phase 0 blocked on S30 clearance + M5–M8 reconciliation. Total ~44–54 chat hours / 5–9 weeks elapsed at 2–3 sessions/week. Next: §10 New product objects.*
