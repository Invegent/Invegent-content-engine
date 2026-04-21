# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-21 late evening — M2 closure (CFW schedule save bug)
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else. Today was a long day and reshaped the week.**

### Reviewer layer now DORMANT (PK decision, 21 Apr evening)

All four rows in `c.external_reviewer` have `is_active=false` as of 21 Apr 07:56 UTC:
- `strategist` (Gemini 2.5 Pro) — paused
- `engineer` (GPT-4o) — was already paused awaiting OpenAI Tier 2
- `risk` (Grok 4.1 Fast Reasoning) — paused
- `system_auditor` (Grok 4.1 Fast Reasoning) — paused

The `external-reviewer` EF filters on `is_active=true` (verified in source), so webhooks still fire but produce `no_active_reviewers` errors and cost nothing. GitHub webhook panel will show failed deliveries — expected, cosmetic only.

The `system-auditor` EF is manual-invoke only and will not fire unless PK calls it.

**Re-enable ceremony** when ready:
```sql
UPDATE c.external_reviewer
SET is_active = true, updated_at = NOW()
WHERE reviewer_key IN ('strategist', 'risk', 'system_auditor');
```
(Leave `engineer` paused until OpenAI Tier 2 unlocks organically at $50 cumulative spend.)

### Sprint mode active — 20 open pre-sales items (Q1 + M2 closed this evening — both sprint items, not A-items; M5 opened)

PK's rationale (verbatim 21 Apr evening):

> "once we achieve 80-90% of the presales, then we can turn the reviewer on. Because till then, it'll be just going in loop because we are fixing things and then review and it'll just keep going. So rather than running these reviewer, we should sprint through the whole presale items, and then we'll start running it by the time we are about to reach the completion of presales."

Target sequence: close as many Section A items as possible. At ~18-19 of 28 closed, flip reviewers back on so they fresh-eye the near-complete state before first pilot signing.

### Today's full run at a glance

- **Morning:** ID003 three-part fix (ai-worker v2.9.0, commit `d12a52c`); three-voice external reviewer layer built + webhooks verified; pilot agreement template v1 drafted; D158 + D159 + D160 documented.
- **Afternoon:** system-auditor EF built (v1.0.0 → v1.0.1 → v1.0.2 over three commits); first audit run produced misleading severity:critical from stale snapshot content.
- **Evening:** Root-caused to stale docs in auditor context. Fix: 4 snapshots moved to `docs/archive/`, docs index rebuilt with freshness taxonomy, EF v1.0.2 adds archive exclusion, system_auditor prompt v2 adds authority hierarchy + severity anchors + suppress list. Second audit produced severity:warn with 4 real findings. Reviewer layer judged useful but noisy-during-sprint — all reviewers paused. Role library brief extended with consumption-model addendum.
- **Later evening:** Q1 sprint item closed — 13 failed ai_jobs marked dead after surfacing that the pre-approved SQL's CHECK-constraint widening was untested. Phase 1.7 DLQ foundation scoped via inspection to just `m.ai_job` (D163); `f.canonical_content_body` intentionally left unchanged (different terminal-state model); `m.post_publish_queue` deferred (needs a new CHECK constraint, not a widening — surfaced to backlog). Real finding: failures weren't ID003 timeout-loop but gpt-4o TPM saturation on concurrent rewrite jobs — separate brief parked for pick-up when pipeline resumes.
- **Even later evening:** M2 sprint item closed — CFW schedule save bug. Two-commit path on `fix/cfw-schedule-save-silent-error`: Claude Code's `fb08305` surfaced RPC errors the old silent-swallow was hiding; Claude Desktop's `a9169ef` fixed the underlying `p_slots` double-serialisation that showed up once errors were visible. DB reconciliation during diagnosis revealed the bug affected all 4 clients since at least 6 Apr — NY/PP had masking seed-migration rows; CFW/Invegent had none, making CFW the reproducible case. Squash-merged to main as `a1d7dc01`. End-to-end verified via Vercel preview: 21-row weekly schedule lands correctly for CFW with UI counter matching DB enabled-slot count. M5 opened for `getPublishSchedule` `exec_sql` + raw-interpolation hardening. New backlog item: publisher schedule-source audit.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Check `c.external_reviewer` — confirm reviewers still paused (`is_active=false` on all four rows)
3. Check file 15 Section G — pick next item from the sprint board
4. Check `m.external_review_queue` for any findings that landed before the pause (most recent 5 rows)
5. Read `docs/06_decisions.md` D156–D163 for today's decision trail
6. Read `docs/incidents/2026-04-19-cost-spike.md` — ID003 still the dominant operational context
7. Query `k.vw_table_summary` before working on any table
8. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## TUESDAY 21 APRIL — full day chronology

Session ran from early morning Sydney time through late evening. Approximately 18+ hours elapsed (counting both of today's separate sessions). Chronology below is UTC.

### 01:40-03:00 UTC — ID003 three-part fix shipped

- **Commit `d12a52c`** — ai-worker v2.9.0
  - Payload diet (`trimSeedPayload()`) — replaces `body_text` with `body_excerpt`, strips `raw_html`/`full_content`, caps length
  - Idempotency guard — checks `m.ai_usage_log` for any prior non-error row tied to this `ai_job_id` AND `post_draft.draft_body` populated (D159 — deviation from incident spec's 5-min window, rationale in D159)
  - Fetch timeout 120s `AbortController` on both Anthropic + OpenAI calls
- **Migration `d157_id003_ai_job_retry_cap`** applied:
  - Added `m.ai_job.attempts INT DEFAULT 0`
  - Updated `sweep-stale-running-every-10m` cron: on each requeue `attempts += 1`; at `attempts >= 3` promotes to `status='failed'` + `dead_reason='exceeded_retry_limit'`
- **Deployed:** ai-worker v79 per PK terminal verification
- **Status:** live but unverified through real ai_jobs — pipeline has been naturally dormant all day (349 queued drafts from 17 Apr burst still draining; no new seeding)

### 03:00-07:00 UTC — Three-voice external reviewer layer shipped

- PK pulled D156 forward from 27 Apr to now — "no further commits should happen without external review of Claude's work"
- Architectural iteration: two-voice → three-voice → role-library (parked for later)
- **D158** — Approach C (full repo + prompt caching) chosen over RAG
- **D160** — three-voice design, rules-belong-to-role, role-library deferred

**Commits:**
- `495216f` — migration + Strategist + paused Engineer + weekly cron + retroactive query-param + on-demand button
- `a437a6a` — Risk Reviewer added (v1.2.0 of external-reviewer EF)
- `1a7aabf` (invegent-dashboard) — /reviews page + API route + sidebar link
- `cfc9cf88` — external-reviewer v1.2.1 (add `docs/00_sync_state.md` to QUALIFYING_PATH_PATTERNS after first live webhook was silently skipped)

Retroactive reviews executed: Strategist completed all 4 targets with info-severity findings. Risk returned 403 on initial runs (zero xAI credits at time), then completed successfully after top-up on commit `cfc9cf88` producing 4 substantive adversarial findings.

**First live three-voice review:** commit `cfc9cf88`. Strategist $1.35, Risk $0.09 (cache-hit), total $1.45. Pattern validated.

### 04:20-04:22 UTC — Both GitHub webhooks configured + ping-verified

- Invegent-content-engine — webhook 607881059, ping delivered, green tick
- invegent-dashboard — webhook 607881239, ping delivered, green tick
- xAI credits topped up to $25 with auto-recharge

### 07:00-08:00 UTC — Documentation caught up (morning wrap)

- Commits `dad6ae2`, `4fe9c57`, `88effeb`, `758c8f3`, `701945f`, `2e909fb`, `b4e63ca`, `941375a`, `4801c92d`
- Pilot service agreement template v1 drafted (pricing deferred)
- Role-library reframe captured as parked brief at `docs/briefs/2026-04-21-reviewer-role-library.md`
- D156, D157, D158, D159, D160 all committed to `docs/06_decisions.md`
- Morning sync_state written (now superseded)

### 04:59-05:30 UTC — System-auditor EF built (attempt 1)

- **Commit `f7e6a776`** — system-auditor v1.0.0 (new EF, separate from external-reviewer)
- Different lens: full system audit of docs+DB state, not per-commit review
- Manual invocation via `x-ai-worker-key`, no webhook
- New row in `c.external_reviewer` (`system_auditor`) with custom system prompt asking for structured JSON audit
- **First invocation failed:** `supabase.rpc(...).catch is not a function` — PostgrestBuilder doesn't expose `.catch()` directly
- **Commit `b24e40e6`** — v1.0.1 fix: wrap all 11 DB queries in individual try/catch blocks (net improvement: graceful degradation, one failing query no longer aborts whole audit)

### 05:21 UTC — First system audit run (v1.0.1)

- 137 docs fetched, 1.3 MB state package, 330k input tokens, 1,647 output tokens
- Cost $0.067, cache hit
- **Severity: critical.** Top finding: "Nightly reconciler missed 3 runs since 2026-04-03; pipeline data 3 days stale."
- **This finding was spurious.** Root cause: `docs/00_audit_report.md` is a 6 April frozen snapshot that was never overwritten because the reconciler it complained about stopped running. The system-auditor EF sent Grok every `.md` file under `docs/` with no signal of which docs were current vs historical. Grok regurgitated the snapshot's CRITICAL framing as today's finding.
- Three other findings were real (13 failed ai_jobs, NY queue anomaly, PP stale publishing claim) but all were already in sync_state's Watch List.

### 05:36 UTC — Reconciler-to-Supabase brief parked

- **Commit `f06e0cf2`** — `docs/briefs/2026-04-21-reconciler-to-supabase.md`
- Captures Option A (direct commit) vs Option B (audit trail + review) architecture choice
- Estimated 2-3 hour dedicated session. Not doing today. Gate to pick up: context clean + Cowork misses ≥2 more runs.

### 05:40-05:56 UTC — Archive migration (systematic fix for stale-doc problem)

Pattern identified: `docs/` contains historical snapshots with no freshness markers, confusing any AI reviewer that treats them as current claims. Solution: move superseded snapshots to `docs/archive/`, mark living docs with freshness taxonomy, teach EF to exclude archive.

Four files moved to `docs/archive/`:

| File | Why archived |
|---|---|
| `00_audit_report.md` | Frozen 6 Apr snapshot; source of v1.0.1 critical false finding |
| `10_consultant_audit_april_2026.md` | 8 Apr 4-lens audit; findings absorbed into file 15 Section A |
| `ICE_Pipeline_Audit_Apr2026.md` | Mid-April pipeline audit; superseded by live DB queries via system-auditor |
| `14_pre_sales_audit_inventory.md` | 18 Apr reconciliation; explicitly superseded by `15_pre_post_sales_criteria.md` per file 15's own header |

Commit sequence: `0229699d` (audit report archive), `bcd7ec92` (consultant + pipeline + file 14 copies, initially truncated), `23977677` + `86bfbd01` + `124b4a7e` (full content restored), `d0ce46a5` + `39b95fc5` + `592c97d1` + `453ca493` (originals deleted from root).

### 05:59 UTC — docs/00_docs_index.md rebuilt

- **Commit `3109cd65`**
- Added freshness taxonomy column to every entry: 🟢 living / 🔵 reference / 🟡 snapshot / ⚫ archived
- New ARCHIVE section explaining each archived file and its replacement
- Added entries for files that existed but weren't indexed (file 15, consent/, incidents/, legal/, reviews/)
- Authority rule stated at top: "When living and snapshot disagree, trust living. When DB and doc disagree, trust DB."
- Index maintenance rule: living doc + 30 days + material change → downgrade or archive

### 06:03 UTC — system-auditor v1.0.2 deployed

- **Commit `cda4ab7d`** — adds `EXCLUDE_DOCS_SUBPATHS = ["docs/archive/"]`, rejects any tarball entry whose path starts with one of those prefixes, tracks `skippedArchive` count, surfaces in response JSON
- Deployed by Claude Code via `supabase functions deploy system-auditor` (verified via `get_edge_function`: version 4, `VERSION = "system-auditor-v1.0.2"`)

### 07:24 UTC — system_auditor prompt v2 applied

SQL update to `c.external_reviewer` row for `reviewer_key='system_auditor'`. Prompt grew from 3,500 → 5,938 chars. Four additions:

1. **Authority hierarchy** — "live DB snapshot > docs/00_sync_state.md > all other living docs. `docs/archive/**` has been intentionally excluded from your context."
2. **Precheck before writing any finding** — 5 questions Grok must answer before each finding (is DB consistent with claim? already in sync_state Watch List? parked in brief with trigger? closed by recent commit? can this be verified or is it extrapolation?)
3. **Severity anchors with concrete examples** — critical / warn / info each with 2+ example findings showing the expected calibration. "If uncertain between two levels, choose the lower one. Severity inflation costs trust."
4. **"Do not report" suppress list** — known open items in sync_state, parked briefs, recent-commit-closed items, things inferred but not verifiable, polite framing.

### 07:30 UTC — Second system audit run (v1.0.2 + prompt v2)

- 134 docs fetched (3 fewer than v1.0.1 because 4 archived + 1 new brief + 1 extra archive file)
- `docs_skipped_archive: 5` (confirms exclusion working; 5 vs 4 expected — small mystery, worth a 30-second check)
- 1,228,429 chars state package (77 KB smaller than v1.0.1)
- 312,388 input tokens (18k less), 1,308 output tokens (20% tighter), cost $0.063
- **Severity: warn** (correctly calibrated, down from spurious critical)
- Four findings, all real and actionable:
  - 13 failed ai_jobs from ID003 (with proposed SQL) — **addressed in later-evening Q1 closure; actually TPM saturation not ID003, see D163 + brief**
  - CFW schedule save bug (sync_state Watch List item, matches known bug) — **addressed in even-later-evening M2 closure**
  - Discovery pipeline `config.url` vs `config.feed_url` mismatch (sync_state Watch List item)
  - A7 privacy policy stale for YouTube + HeyGen + video-analyser
- Self-correcting "don't have context to judge" section correctly called out LinkedIn status, full cron list, queue join chain

### 07:35-07:55 UTC — Verdict and role library addendum

Overall grade of the v1.0.2 + prompt v2 run: B+. Real improvement over v1.0.1, but findings were all items already in sync_state's Watch List, which the prompt explicitly told Grok not to re-surface. Partial failure of the suppress directive.

PK reframed the layer's value prop: not "insurance against Claude blind spots" (which the data doesn't support after 2 audits) but "continuous overnight feedback loop that preps the morning session." The gap between these framings is material for how the layer should evolve.

- **Commit `60e51518`** — `docs/briefs/2026-04-21-reviewer-role-library.md` addendum capturing:
  - Consumption model (overnight cron → `m.external_review_queue` → consolidation digest EF → `docs/reviews/YYYY-MM-DD-overnight.md` committed → read at session start)
  - The "9 roles = 15k words of morning reading" friction risk and solution (consolidation digest role)
  - Role × task composition — flat library, one row per (persona × task) combination
  - Cost tolerance confirmed $30-60/month; separate budget line from D157 Anthropic cap
  - Revised kill/keep criterion: per-role 8-week calibration checkpoint, not binary kill switch
  - Honest "didn't find anything novel after two runs" data point preserved

### 07:56 UTC — All reviewers paused (PK decision for sprint mode)

- SQL: `UPDATE c.external_reviewer SET is_active = false WHERE reviewer_key IN ('strategist', 'risk', 'system_auditor')`
- Engineer already paused earlier awaiting OpenAI Tier 2
- All four rows now `is_active=false`
- `external-reviewer` EF will return "no_active_reviewers" error for any webhook; no cost
- `system-auditor` EF is manual-invoke only; dormant by default

### 12:15 UTC — End-of-day reconciliation (morning of this day's record)

- sync_state rewritten
- file 15 updated to v4 — A24 closed
- decisions log appended with D161 + D162
- dashboard roadmap refreshed
- memory updated to reflect reviewer layer shipped + paused

### Later evening (21 Apr) — Q1 closure + D163 scoping

First Claude-Desktop sprint item picked and closed. Steps:

1. Inspected `m.ai_job` — 13 failed rows confirmed, all from 18 Apr 07:20 UTC within a 40-minute window, `attempts=0` (pre-D157 retry-cap era).
2. Peeked at sample errors — NOT the ID003 timeout-loop pattern the sync_state framed, but `openai_http_429` TPM saturation on concurrent `rewrite_v1` jobs (6 LinkedIn + 7 Instagram, all NDIS Yarns, all within one minute, gpt-4o 30k TPM ceiling hit).
3. Attempted the pre-approved `UPDATE m.ai_job SET status='dead'` — blocked by CHECK constraint. Pre-approved SQL was untested; constraint didn't allow `'dead'`.
4. 5-minute inspection of all four Phase 1.7 tables' CHECK constraints to decide scope. Findings:
   - `m.post_draft.approval_status` — already includes `'dead'` (no work needed)
   - `f.canonical_content_body.resolution_status` — has `give_up_paywalled/blocked/timeout/error` semantics; adding generic `'dead'` would duplicate vocabulary. Intentionally NOT changed.
   - `m.post_publish_queue.status` — NO CHECK constraint at all (anomaly); already has `'dead'` in data. Needs a deliberate new constraint with full vocabulary, deferred.
   - `m.ai_job.status` — missing `'dead'`; widen it.
5. Migration `phase_1_7_ai_job_add_dead_status` applied: CHECK constraint widened to include `'dead'`.
6. UPDATE ran: 13 rows → `status='dead'`, `dead_reason='openai_tpm_rate_limit_2026-04-18'` (corrected label from the erroneous pre-approved `id003_cleanup_2026-04-21`).
7. Verified: 0 rows at `failed`, 13 at `dead` with correct reason.

Decision logged as **D163**. New brief parked at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md` for the concurrency design issue.

### Even later evening (21 Apr) — M2 closure (CFW schedule save bug)

Second Claude-Desktop sprint item closed after dispatching M2 to Claude Code. Full path:

1. **Claude Code dispatch** — M2 brief authored in Claude Desktop with investigation steps, ranked root-cause hypotheses, fix criteria, verification gates. Claude Code worked for ~7 min, pushed branch `fix/cfw-schedule-save-silent-error` commit `fb08305`: destructured `{ error }` in `actions/schedule.ts`, added try/catch in `ScheduleTab.tsx`, red "Save failed" UI state with error detail. Noted but didn't fix: `getPublishSchedule` still uses `exec_sql` with raw string interpolation (SQL injection surface + mirror silent-swallow on read path — deferred to M5).

2. **Vercel preview test — first pass** — PK opened preview URL, saved schedule, saw **red "Save failed"** banner with Next.js production error-redaction message. NOT a regression — the error-surfacing fix worked perfectly, exposing an underlying bug the old silent-swallow had been hiding for weeks.

3. **DB reconciliation during diagnosis** — `c.client_publish_schedule` state: CFW 0 rows, Invegent 0 rows, NY 6 rows (all `updated_at = 2026-04-06 23:59:54`), PP 6 rows (same timestamp). NY/PP rows came from a 6 April seed migration, not UI saves. **The save-via-UI path had never worked for any client.** CFW was the reproducible case because it had no masking seed data.

4. **Root cause found** — `save_publish_schedule` RPC exists with correct signature (`p_client_id uuid, p_platform text, p_slots jsonb`, `SECURITY DEFINER`, `search_path TO 'public'`). Function body iterates `jsonb_array_elements(p_slots)`. Direct SQL call with jsonb array literal worked and inserted the row. Direct SQL call with jsonb scalar (a JSON-encoded string, simulating what supabase-js was sending) threw Postgres error **22023 "cannot extract elements from a scalar"** — the exact error the UI was catching and reporting. Cause: `savePublishSchedule` was calling `JSON.stringify(slots.map(...))` before passing to `supabase.rpc()`. supabase-js already serialises the whole params object once when building the HTTP body — pre-stringifying caused PostgREST to receive `p_slots` as a JSON string, which cast to a jsonb scalar.

5. **Fix pushed** — Commit `a9169ef` on the same feature branch. Removed the `JSON.stringify` wrapper. Passed the slots array directly. supabase-js now serialises once, PostgREST receives a proper jsonb array, `jsonb_array_elements` iterates correctly.

6. **Vercel preview test — second pass** — PK hard-refreshed preview, saved a multi-platform weekly schedule for CFW, saw **green "Saved ✓"**. DB verification showed 21 rows (7 days × 3 platforms) with 5 enabled slots exactly matching UI counter: Facebook 2/5 (Mon, Thu), Instagram 2/5 (Fri, Sat), LinkedIn 1/5 (Tue). All 9:06 AM. Clustered creation timestamps within 3 seconds confirming batched-per-platform INSERT.

7. **Merged** — PR #2 squash-merged to `main` as commit `a1d7dc01`. Vercel auto-deploys to `dashboard.invegent.com` in ~60s.

8. **M5 opened** — `getPublishSchedule` hardening: replace `exec_sql` + raw string interpolation with `public.get_publish_schedule(p_client_id UUID, p_platform TEXT)` SECURITY DEFINER RPC; destructure `{ data, error }`; surface errors same pattern as M2. Medium sprint item (30-60 min). Closes SQL injection surface + read-path silent-swallow. Claude-Code-appropriate when dispatched.

**Verification-gap lesson:** Claude Code's original verification loop tested `save_publish_schedule` via direct SQL (`SELECT save_publish_schedule(...)` with a jsonb array literal), which bypassed the supabase-js → PostgREST serialisation path where the actual bug lived. The 22023 only manifested when the call goes through the client library. Lesson for future verification: a client-library-using code path MUST be exercised through the actual client library, not just the DB function in isolation. Captured as Section F9 in file 15.

**Follow-up flagged as new backlog item:** If `c.client_publish_schedule` has been effectively empty for CFW + Invegent for weeks, what has the `publisher` Edge Function been using to schedule those clients' posts? Two hypotheses: (a) reads the same table → those clients have been posting on defaults/fallback, or (b) reads a different source → the UI has been pure theatre disconnected from publishing. Half-day investigation. Gate: when sprint has capacity.

---

## THE EXTERNAL REVIEWER LAYER — CURRENT STATE

| Reviewer | Lens | Model | Provider | DB `is_active` | Operational |
|---|---|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | Google | **false** | Paused for sprint |
| Engineer | Built well? | gpt-4o | OpenAI | **false** | Paused (OpenAI Tier 2 pending at $50 cum spend) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | xAI | **false** | Paused for sprint |
| System Auditor | Claim vs reality audit | grok-4-1-fast-reasoning | xAI | **false** | Paused; manual-invoke EF never fires unattended anyway |

**Tables live:**
- `c.external_reviewer` — 4 rows, all `is_active=false`
- `c.external_reviewer_rule` — 16 rules total (4 per reviewer, keyed on reviewer_key)
- `m.external_review_queue` — 10+ rows accumulated today; most recent is 21 Apr 07:30 UTC system audit (warn)
- `m.external_review_digest` — 1 row (today's on-demand digest)

**Edge Functions live:**
- `external-reviewer` v1.2.1 — webhook path (dormant while reviewers paused)
- `external-reviewer-digest` v1.1.0 — weekly digest cron (jobid 66, Mon 7am AEST)
- `system-auditor` v1.0.2 — manual invoke via x-ai-worker-key; currently returns `no_active_reviewers` because system_auditor row is paused

**Secrets provisioned today:** `ICE_GEMINI_API_KEY`, `GITHUB_PAT_INVEGENT`, `GITHUB_WEBHOOK_SECRET`, `ICE_XAI_API_KEY`. All in Supabase vault.

**Total reviewer spend to date:** ~$8 across ~10 reviews. No novel findings (all echoes of sync_state Watch List). Consumption-model reframe in role library brief addendum.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active, external client expansion still gated on pre-sales criteria)
**Gate status:** Pre-sales gate NOT CLEARED. **8 of 28 Section A items closed, 20 open.** (A24 closed this morning.) Q1 and M2 are sprint items, not A-items — their closures do not change the A-count but Q1 shipped the first chunk of Phase 1.7 DLQ foundation (D163) and M2 fixed a production bug affecting all 4 clients' schedule configuration since 6 April.

**Today's movement on the gate:**
- A1 (pilot terms) — template drafted, pricing deferred. Awaits A7 privacy policy update.
- A5 (KPI guarantee) — drafted within pilot agreement.
- A8 (AI disclosure) — drafted within pilot agreement.
- A24 (multi-model review MVP) — ✅ **CLOSED 21 Apr.** Three-voice layer live + system-auditor EF + prompt v2 all shipped. Full spec exceeds MVP.

**Operational status:** Pipeline genuinely dormant — demand-aware seeder correctly reports supply maxed. 349 populated drafts still draining. Drain rate ~36/week × 4 clients → ~3.4 weeks runway before seeder fires again. Pipeline will self-resume.

---

## ALL CLIENTS — STATE

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI | In-pipeline drafts (FB) |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 269 (63 approved + 206 needs_review) |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 64 (46 approved + 18 needs_review) |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 16 (13 approved + 3 needs_review) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 0 |

All 4 FB tokens permanent (`expires_at: 0`).

**NEW:** CFW now has 21 real schedule rows in `c.client_publish_schedule` from PK's M2-verification save (5 enabled slots: Mon-FB, Tue-LI, Thu-FB, Fri-IG, Sat-IG at 09:06 AEST). First real UI-saved schedule for any client. Publisher behaviour against this data not yet observed (pipeline dormant; and publisher-schedule-source audit is an open backlog item — what does the publisher actually read?).

---

## SPRINT MODE — THE BOARD

Primary objective: close pre-sales items from file 15 Section A without reviewer-loop recursion. Source of truth: `docs/15_pre_post_sales_criteria.md` Section G. Repeated here as tonight's snapshot.

### Quick wins (<1 hour each)

| # | Item | Notes |
|---|---|---|
| Q1 | ✅ **13 failed ai_jobs SQL cleanup — DONE 21 Apr evening** | Migration `phase_1_7_ai_job_add_dead_status` widened `m.ai_job.status` CHECK to include `'dead'`. 13 rows updated to `dead_reason='openai_tpm_rate_limit_2026-04-18'`. Real failure mode was gpt-4o TPM saturation on concurrent rewrite jobs, not ID003 timeout-loop. Scoping decision at D163. Concurrency brief at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md`. |
| Q2 | **Discovery pipeline one-liner** | `config.feed_url ?? config.url` in ingest-worker |
| Q3 | **A24 → closed in file 15** | Done in this morning's reconciliation |
| Q4 | **A7 privacy policy update** | Three paragraphs: YouTube + HeyGen + video-analyser; re-host |

### Medium (1-3 hours)

| # | Item | Notes |
|---|---|---|
| M1 | **A11b CFW + Invegent content_type_prompts** | 9 rows × 2 clients = 18 prompts; content strategy session |
| M2 | ✅ **CFW schedule save bug — DONE 21 Apr late evening** | Two-commit fix on `fix/cfw-schedule-save-silent-error` (`fb08305` Claude Code surfaced errors + `a9169ef` Claude Desktop fixed p_slots serialisation), squash-merged as `a1d7dc01`. Bug affected all 4 clients since 6 Apr, not CFW-specific. End-to-end verified: 21-row schedule lands correctly. See "Even later evening" chronology entry. |
| M3 | **A14 RLS verification** | Grep invegent-portal for direct Supabase queries vs `.rpc()` |
| M4 | **A18 — 7 source-less EFs investigation** | Read-only, time-consuming |
| M5 | **NEW — `getPublishSchedule` hardening** | Replace `exec_sql` + raw string interpolation in invegent-dashboard/actions/schedule.ts with SECURITY DEFINER RPC `public.get_publish_schedule(p_client_id UUID, p_platform TEXT)`. Destructure `{ data, error }`, surface errors using same pattern as M2 save-side fix. Closes (a) SQL injection surface on operator dashboard (pattern would propagate to portal), (b) read-path silent-swallow where errors currently manifest as empty arrays masquerading as "no slots configured". 30-60 min, Claude-Code-appropriate. Adjacent to A14 code-quality family. |

### Larger (half-day+)

| # | Item | Notes |
|---|---|---|
| L1 | **A1 + A5 + A8 — Pilot terms + KPI clause + AI disclosure** | One document, PK draft |
| L2 | **A3 + A4 — One-page proof doc** | Needs A4 (NY numbers) first |
| L3 | **A16 — Clock A dashboard** | New page in invegent-dashboard |
| L4 | **A17 — Clock C seven items** | New doc `16_client_handling.md` |
| L5 | **A20 — Pipeline liveness monitoring** | From D155 fallout |
| L6 | **A21 — Trigger ON CONFLICT audit** | From D155 fallout |
| L7 | **A22 — Ai-worker error surfacing** | From D155 fallout |
| L8 | **A23 — Live /debug_token cron** | D153 |
| L9 | **A25 — Stage 2 bank reconciliation** | Meta + GitHub + Vercel + Supabase |
| L10 | **A26 — Review discipline mechanism** | Unread-blocks-dashboard |

### Blocked / external

| # | Item | Status |
|---|---|---|
| A2 | Meta App Review | In Review; escalate 27 Apr if no movement; Shrishti 2FA pending |
| A6 | Unit economics (TBC subs) | Invoice check — Vercel, HeyGen, Claude Max, OpenAI |

### Sprint reactivation ceremony

When ~18-19 of 28 Section A items are closed:

```sql
UPDATE c.external_reviewer
SET is_active = true, updated_at = NOW()
WHERE reviewer_key IN ('strategist', 'risk', 'system_auditor');
```

Then invoke system audit once manually to get a fresh reading of the near-complete state:

```powershell
$response = Invoke-RestMethod -Uri "https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/system-auditor" -Method POST -Headers @{"x-ai-worker-key" = $apiKey; "Content-Type" = "application/json"} -Body "{}" -TimeoutSec 300
```

Act on any genuine findings before first pilot conversation.

---

## WATCH LIST

- **Tomorrow** — Q2 (discovery pipeline fix), Q4 (A7 privacy policy). M5 is Claude-Code-appropriate if dispatched in parallel.
- **Thu 23 Apr** — A7 (if not done Tuesday); A1+A5+A8 pilot document drafting
- **Fri 24 Apr** — A11b content prompt session for CFW + Invegent
- **Mon 27 Apr** — Meta App Review escalation trigger; first weekly digest would have landed if reviewers weren't paused
- **Sat 2 May** — original reviewer calibration cycle trigger; defer until reviewers resume

### Backlog (open, not yet addressed)
- **Publisher schedule source audit — NEW** — if `c.client_publish_schedule` has been empty for CFW + Invegent for weeks (confirmed via DB reconciliation during M2 diagnosis), what is the `publisher` Edge Function actually using to schedule those clients' posts? Two hypotheses: (a) reads same table → those clients post on defaults/fallback, (b) reads different source → UI has been pure theatre disconnected from publishing. Either way, a real finding worth confirming. Half-day investigation. Gate: when sprint has capacity.
- **`m.post_publish_queue.status` has NO CHECK constraint** — currently accepts any string; `queued/pending/published/dead` all in use, with 1 row already `'dead'` without a constraint. Phase 1.7 continuation: design full vocabulary (current + likely-future: `queued, pending, published, dead, failed, cancelled`) and add CHECK. Not urgent (pipeline works) but a real pipeline-hygiene item. Tracked under D163.
- **TPM saturation on concurrent platform rewrites** — brief parked at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md`. A digest burst on a multi-platform client fires concurrent `rewrite_v1` jobs that saturate gpt-4o's 30k TPM ceiling within one minute. Will recur on first burst after pipeline resumes from drain. Five design options captured in brief. Gate to pick up: pipeline resumes AND fresh digest has fired through rewrite step.
- **docs/archive 5th-file mystery** — `docs_skipped_archive: 5` but we only archived 4 files. Worth a 30-second investigation. Nothing breaking.
- **Per-commit external-reviewer pollution** — before reviewer pause, the per-commit EF was iterating all rows in `c.external_reviewer` including system_auditor, producing ~$0.0007 hallucinated "system_auditor" rows on every qualifying commit. Now dormant due to reviewer pause; worth a `per_commit_enabled` column or filter when reviewers resume to prevent recurrence.
- **Discovery pipeline ingest bug** — 9 feeds provisioned but zero items ingested due to `config.url` vs `config.feed_url` mismatch. Sprint item Q2.
- Shrishti 2FA + passkey (Meta admin redundancy) — PK to chase

---

## TODAY'S COMMITS

**Invegent-content-engine (main):**

Morning:
- `d12a52c` — feat(ai-worker): v2.9.0 — ID003 three-part remediation
- `d8a8dc4` — docs: brief for external reviewer layer v1 (superseded)
- `f705f45` — docs: brief for roadmap three-tab conversion
- `dad6ae2` — docs: sync_state interim update (superseded)
- `4fe9c57` — docs(legal): pilot service agreement template v1 draft
- `88effeb` — docs(legal): defer pricing decision
- `495216f` — feat(external-reviewer): D156 Stage 1 deploy — two-voice initial
- `a437a6a` — feat(external-reviewer): add Risk Reviewer (Grok) — three-voice
- `758c8f3` — docs: external reviewer brief two-lens rationale (superseded)
- `701945f` — docs(decisions): add D158 + D159 + D160
- `2e909fb` — docs(brief): update external reviewer brief — three-voice shipped
- `b4e63ca` — docs(brief): capture role-library reframe for future execution
- `941375a` — docs: sync_state interim update (superseded)
- `4801c92d` — webhook verification commit (sync_state only)
- `cfc9cf88` — fix(external-reviewer): v1.2.1 — add sync_state to qualifying paths

Afternoon/evening:
- `f7e6a776` — feat(system-auditor): v1.0.0 — one-shot system audit EF
- `b24e40e6` — fix(system-auditor): v1.0.1 — try/catch for PostgrestBuilder
- `f06e0cf2` — docs(briefs): reconciler-to-Supabase migration parked
- `0229699d` — docs(archive): move 00_audit_report.md (1/4)
- `bcd7ec92` — docs(archive): move consultant + pipeline + file 14 (2/4)
- `23977677` — docs(archive): restore full consultant audit content
- `86bfbd01` — docs(archive): restore full pipeline audit content
- `124b4a7e` — docs(archive): restore full file 14 content
- `d0ce46a5` — docs: delete 00_audit_report.md from root
- `39b95fc5` — docs: delete consultant audit from root
- `592c97d1` — docs: delete pipeline audit from root
- `453ca493` — docs: delete file 14 from root
- `3109cd65` — docs: update 00_docs_index.md with freshness column + archive section
- `cda4ab7d` — feat(system-auditor): v1.0.2 — exclude docs/archive/** from context
- `60e51518` — docs(briefs): role library brief addendum — consumption model

End-of-day reconciliation:
- docs: sync_state end-of-day reconciliation
- docs: file 15 v4 — close A24
- docs(decisions): D161 + D162

Later evening — Q1 closure + D163 scoping:
- migration `phase_1_7_ai_job_add_dead_status` applied (Supabase direct)
- UPDATE on 13 failed ai_jobs (Supabase direct)
- docs: Q1 closure + D163 + TPM brief + file 15 v4.1

Even later evening — M2 closure (this sync update):
- THIS COMMIT — docs: sync_state SHA corrections — actual squash-merge is `a1d7dc01` not `64e3daa` (pre-written-in-anticipation placeholder)

**invegent-dashboard:**

main branch:
- `202037c` — feat(roadmap): three-tab layout + by-sales-stage view (morning)
- `1a7aabf` — feat(reviews): /reviews page + API route + sidebar link (morning)
- `ac67257e` — feat(roadmap): 21 Apr end-of-day refresh — A24 closed + reviewer pause
- `1ddbd29` — feat(roadmap): Q1 closure increment — D163 Phase 1.7 DLQ foundation
- `a1d7dc01` — **fix(schedule): surface RPC errors + fix p_slots double-serialisation (M2)** — squash-merge of fix/cfw-schedule-save-silent-error (PR #2)

fix/cfw-schedule-save-silent-error branch (squashed into a1d7dc01 above):
- `fb08305` — fix(schedule): surface RPC errors — CFW schedule save silently failing (Claude Code)
- `a9169ef` — fix(schedule): pass p_slots as array not JSON.stringify'd — fixes 22023 scalar error (Claude Desktop)

---

## CLOSING NOTE FOR NEXT SESSION

Today produced ~30 commits across two repos plus the later-evening Q1 increment and the even-later-evening M2 closure. Reviewer layer shipped, validated on 2 runs ($8 spend, no novel findings), paused for sprint. 20 A-items still ahead (Q1 and M2 were sprint items, not A-items, so A-count unchanged). Sprint board above is the source of truth for tomorrow's first pick.

Two architectural nuggets from the evening:
- **D163** — Phase 1.7 DLQ foundation is partially done (m.ai_job only); `m.post_publish_queue` needs a considered CHECK constraint in a later session; `f.canonical_content_body` should NOT be changed. Keep in mind for any future pipeline-terminal-state work.
- **M2 verification-gap lesson (Section F9 in file 15)** — direct-SQL RPC tests bypass the supabase-js → PostgREST serialisation path. When fixing code that calls a DB function through a client library, verification MUST exercise the actual client library. Applies to all future Claude Code briefs.

One real production finding worth keeping visible: **the CFW/Invegent schedule UI has been disconnected from the DB for weeks.** M2 fixes the save path going forward, but the historical behaviour means: (a) any CFW/Invegent schedule anyone "set" in the UI before today was lost, and (b) the publisher Edge Function has been scheduling those clients using SOMETHING — either the empty table's fallback path or a different source entirely. That audit is a new backlog item, gated on sprint capacity.

The honest data point from the reviewer layer: still hasn't earned its keep against Claude-only review after 2 runs ($8, zero novel findings). Value case shifts from "insurance" to "continuous overnight feedback" — see role library brief addendum. Resume after ~18-19 of 28 A-items closed.

PK is also doing a full-time job. Respect that. The reviewer pause is also partly a noise reduction for PK's attention — less morning reading during the sprint.
