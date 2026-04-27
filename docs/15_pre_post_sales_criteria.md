# ICE — Pre-Sales / Post-Sales Classification

## Generated: 2026-04-18 (v1 morning, v2 afternoon, v3 late evening) · v4 update 2026-04-21 (A24 closed) · v4.1 update 2026-04-21 evening (Q1 sprint item closed, D163 scoping documented) · v4.2 update 2026-04-21 late evening (M2 closed — CFW schedule save bug fixed, M5 opened) · v4.3 update 2026-04-22 evening (full sprint day + evening router-build pivot)
## Type: Classification document — supersedes `docs/14_pre_sales_audit_inventory.md` Section 12
## Inputs: audit inventory (38 items + 13 open questions), 3-clock framework, consultant audit (8 Apr), legal register L001–L008, PK answers 18 Apr, decisions D147–D167, 22 Apr full sprint day + evening router build

---

## ⚠️ DRIFT NOTICE — v4.4 update DUE (last verified 22 Apr; current 27 Apr)

**Status drift since v4.3.** Five closures have happened since this doc was last touched. Each is captured authoritatively in `docs/00_sync_state.md` (commit `6107e790` of 27 Apr) and the dashboard roadmap (commit `71bb329b` of 27 Apr). The full v4.4 rewrite is deferred to next session for efficiency — the closure facts below are reliable; only this doc's count and status flags lag by 5 days.

**Closures since v4.3 (5 items, all confirmed):**

| Item | Closed | Evidence | Brief mechanism |
|---|---|---|---|
| A11b | 24 Apr 2026 | Memory + sync_state + roadmap | M1: CFW + Invegent content_type_prompts (LinkedIn + YouTube + format parity 12/12) |
| A21 | 24 Apr 2026 | sync_state + roadmap (L6 / A21 audit close note) | Trigger ON CONFLICT audit CLOSED — 10+ triggers verified, no second instance of D155-class bug |
| A22 | 27 Apr 2026 | sync_state Stage 12 v2.11.0 | Lesson #33 codified: every Supabase JS write destructures `{ error }` and throws. Silent UPDATE failure mode (rowcount-zero swallow) eliminated. Surfaced via `m.slot` grants gap incident. |
| A27 | 27 Apr 2026 | sync_state Stage 11 LD18 + Stage 12 UPSERT | LD18 partial unique index `uq_post_draft_slot_id` provides DB-enforced idempotency. UPSERT-based fill function (post_draft 12.051 + ai_job 12.053) handles recovery cycles. End-to-end retry-cap pattern. |
| A28 | 27 Apr 2026 | sync_state Phase B Stage 11 LD7 + Gate B observation | LD7 ephemeral prompt caching on compliance/brand/platform_voice blocks. Slot-driven architecture replaces signal-cardinality-driven cost (~$190/mo R6) with slot-cardinality-driven cost (~$0.012/draft target). Gate B 5-7d observation will validate measured cost against $18/month target. |

**Updated count (effective 27 Apr 2026, pending v4.4 reconciliation):**
- Section A1-A26: **12 of 26 closed** (was 9): adding A11b + A21 + A22
- Section A27-A29 (D157 follow-ons): **2 of 3 closed** (was 0): adding A27 + A28; A29 (inbox anomaly monitor) still open
- Combined: **14 of 29 closed, 15 open** (was 9 of 29 closed, 20 open)
- Plus 3 timebox windows still not startable (Clocks A/B/C)

**Updated checklist (Section G — go/no-go view, brief edits):**
- `[x] A11b` — CFW + Invegent content_type_prompts (24 Apr via M1)
- `[x] A21` — Trigger ON CONFLICT audit (24 Apr via L6/A21)
- `[x] A22` — Ai-worker error surfacing via Lesson #33 (27 Apr via Stage 12)
- `[x] A27` — LLM-caller idempotency via LD18 + UPSERT (27 Apr via Stages 11+12)
- `[x] A28` — Cost guardrails via LD7 caching + Gate B measurement (27 Apr via Stage 11)

**Items below in Section A that read 🔲 Open should be treated as ✅ Closed for these five:** A11b, A21, A22, A27, A28. Section A body left unchanged for v4.4 reconciliation.

**Realistic next sales-conversation timeline:** mid-late June 2026. Gates remaining: A1+A3+A4+A5+A6+A8 (legal+proof+economics, 6 items), A2 (Meta App Review), A10b (IG publish — Meta restriction), A14+A16+A17+A18 (stability/readiness, 4 items), A20+A23 (D155-class prevention, 2 items), A25+A26 (D156 external layer, 2 items), A29 (inbox anomaly monitor, 1 item). Plus Clock A/B/C 14-day windows. Gate B observation in progress; first window for sales conversation no earlier than first week of June.

---

## Purpose

This document converts the audit's Section 12 findings into an actionable pre-sales gate. Every audit item is classified as pre-sales, post-sales tier 1/2/3, or parked. The rationale for each classification is explicit. Fresh-eyes pushback on the framework session is in Section F.

This is the definitive pre-sales gate document until superseded. When all Section A items are closed AND Clock A/B/C windows complete green, PK may begin first external sales conversations.

---

## v4.3 changes from v4.2 (22 Apr full day)

**Morning sprint-day closures (A7 is an A-item; M-items are sprint items):**
- **A7 closed ✅** — privacy policy updated and canonicalised at invegent.com/privacy-policy. 12 sections including YouTube Data API, HeyGen avatar disclosure, 24h video transcript retention. Meta App Review URL field to be updated to new canonical. GitHub Pages 404 that surfaced the issue is now irrelevant. L006 gate cleared. Commits `683b3c9` + `85052af` on invegent-web.
- **M5 closed ✅** — `getPublishSchedule` hardened: SECURITY DEFINER RPC `public.get_publish_schedule`, exec_sql removed, read-path silent-swallow eliminated. PR #3 merged `737d150`.
- **M6 closed ✅** — Portal exec_sql eradication: 5 SECURITY DEFINER RPCs (verify_draft_ownership, get_client_name_by_id, get_client_brand_profile, get_portal_drafts_count, get_packages_for_form). PR #1 portal `9c00b5a`.
- **M7 closed ✅** — Dashboard `feeds/create` exec_sql replaced with `public.create_feed_source` RPC. PR #5 dashboard `eda95ce`. Audit during M7 revealed 30+ additional exec_sql sites in dashboard — honest framing preserved in commit body.
- **M8 closed ✅** — Bundler draft multiplication root cause fix: `NOT EXISTS` guard in `m.populate_digest_items_v1` CTE prevents same canonical re-bundling for same client within 7 days. 7-day window rationale in **D164**. PR #1 content-engine `ffc767d`.
- **M9 closed ✅** — ScheduleTab + FeedsClient client-switch staleness sweep (missing `key={activeClientId}` remount pattern). Schedule now always displays all 4 platforms (greyed if not configured). PR #4 dashboard `293f876`.
- **M11 closed ✅** — FB-vs-IG publish disparity root cause: `enqueue-publish-queue-every-5m` had wrong ON CONFLICT target (post_draft_id only, actual index post_draft_id+platform). 2,258 silent cron failures over 8 days from 14 Apr onward. PR #2 content-engine `583cf17`. Cleanup discipline captured in **D165** (120 FB drafts + 41 queue items marked dead; IG publisher cron paused).

**Evening router-build pivot:**
- **D166** — Router sequencing reversed. M12 surgical fix superseded by D144 router MVP build. M12 is polish on code the router replaces entirely. App Review waiting window funds the work. Pipeline is uniquely clean — zero risk moment to build shadow infrastructure.
- **D167** — Router MVP shadow infrastructure shipped:
  - `t.platform_format_mix_default` — 23 seed rows, all platforms sum to 100, validation view `t.platform_format_mix_default_check` confirms integrity
  - `c.client_format_mix_override` — empty table ready for future per-client overrides
  - `m.build_weekly_demand_grid(p_client_id, p_week_start)` — SQL function producing demand grid for any client any week
  - Research basis committed as `docs/research/platform_format_mix_defaults.md` — Buffer 2026 (45M+ posts) + Hootsuite 2026 + YouTube Shorts data, 10 source citations
- **D145 partially closed** — the mix-defaults research portion is shipped via D167. The content_type × format benchmark table portion (matching-layer data) remains deferred, still gated on D143 classifier.

**A-count change:** A7 closed → **9 of 28 Section A items closed, 19 open.** All morning M-items and evening router work are sprint-track, not A-items, so the numbering of Section A is unchanged.

**Sprint item change on the board:**
- **M12 status: SUPERSEDED (not closed)** — per D166. If router build stalls, M12 remains fallback to safely resume IG publishing. Kept on the board for visibility.
- **New track opened: R1-R8** — router build items. R1-R3 closed this evening (shadow infrastructure). R4-R8 remain — R4 (classifier spec) is safe low-risk writing work; R6 (`seed_and_enqueue` rewrite) is HIGH RISK hot-path change, Friday+ only.

**Process lessons for v4.3:**
- **Vercel webhook verified healthy** — Claude Code's confident claim that webhook didn't fire for commit `150f1e5` was wrong. Two deploys existed (webhook + manual). Calibration note: verify Claude Code's infrastructure claims before acting.
- **Past chats recovery via `conversation_search`** surfaced D142-D146 full specs from 17 Apr + 20 Apr chats. `docs/06_decisions.md` has pointers-only for these; full specs live in git history + past chats.
- **Pipeline state at session close is documentation-worthy asset.** Tonight's router build landed safely because pipeline was uniquely clean (0 orphaned drafts, 0 queue items, M8+M11 active, IG paused). This was D167's permission to proceed — explicit in the decision entry.

---

## v4.2 changes from v4.1 (21 Apr late evening)

**Sprint item closures (not A-items, but tracked for completeness):**
- **M2 closed ✅** — CFW schedule save bug fixed. Full chronology in sync_state "Even later evening" section. Two-commit fix on `fix/cfw-schedule-save-silent-error`: `fb08305` (Claude Code) surfaced RPC errors the old silent-swallow was hiding; `a9169ef` (Claude Desktop) fixed the underlying `p_slots` double-serialisation that showed up once errors were visible. Squash-merged to `main` via PR #2 as `a1d7dc01`. DB reconciliation during diagnosis revealed the bug affected all 4 clients since at least 6 April, not CFW-specific — NY + PP had masking seed-migration rows; CFW + Invegent had nothing, making CFW the reproducible case. End-to-end verified via Vercel preview: 21-row weekly schedule lands correctly with UI counter matching DB enabled-slot count.

**New sprint item surfaced:**
- **M5 opened** — `getPublishSchedule` hardening in `invegent-dashboard/actions/schedule.ts`. Replace `exec_sql` + raw string interpolation with SECURITY DEFINER RPC `public.get_publish_schedule(p_client_id UUID, p_platform TEXT)`. Destructure `{ data, error }` and surface errors using same pattern as the M2 save-side fix. Closes (a) SQL injection surface on operator dashboard (low exploitability today but pattern would propagate to portal), (b) read-path silent-swallow where the function currently returns `[]` on any PostgrestError, masquerading as "no slots configured" (a latent bug that would itself have been mistaken for the save bug). Medium sprint item (30-60 min). Claude-Code-appropriate. Adjacent to A14 code-quality family.

**New backlog item surfaced:**
- **Publisher schedule source audit** — if `c.client_publish_schedule` has been effectively empty for CFW + Invegent for weeks (confirmed via DB reconciliation during M2 diagnosis), what is the `publisher` Edge Function actually using to schedule those clients' posts? Two hypotheses: (a) reads same table → those clients post on defaults/fallback, (b) reads different source → UI has been disconnected from publishing. Half-day investigation. Tracked in sync_state backlog. Gate: when sprint has capacity.

**New Section F9** captures a verification-scope lesson surfaced by M2: a client-library-using code path must be exercised through the actual client library, not just the DB function in isolation. Claude Code's direct SQL verification of `save_publish_schedule` bypassed the supabase-js → PostgREST serialisation path where the actual bug lived.

**No new A-items surfaced.** A-count unchanged at 8 of 28 closed, 20 open. Both Q1 and M2 are sprint items, not A-items.

---

## v4.1 changes from v4 (21 Apr later evening)

**Sprint item closures (not A-items, but tracked for completeness):**
- **Q1 closed ✅** — 13 failed ai_jobs marked terminal dead. Migration `phase_1_7_ai_job_add_dead_status` widened `m.ai_job.status` CHECK constraint to include `'dead'`. Dead reason: `openai_tpm_rate_limit_2026-04-18`. See **D163** for the Phase 1.7 DLQ foundation scoping decision. A-count unchanged (still 8 of 28 closed, 20 open) because Q1 is a sprint item, not an A-item — but its closure ships the first increment of Phase 1.7 DLQ foundation and unblocks evidence for A22.
- **M2 dispatched** — CFW schedule save bug handed to Claude Code for investigation (local dev + iterative fix cycle). *(Subsequently closed — see v4.2 above.)*

**New backlog items surfaced during Q1 (tracked in sync_state Backlog, not Section A):**
- `m.post_publish_queue.status` has no CHECK constraint at all — needs one with deliberate vocabulary design. Phase 1.7 DLQ continuation work, not a quick win.
- TPM saturation on concurrent platform rewrites — brief parked at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md`. Will recur on first digest burst after pipeline resumes from drain. Gate to pick up in brief.

**No new A-items surfaced.** Q1 cleanup was mechanical; D163 scoping is architectural but doesn't change the pre-sales gate composition.

---

## v4 changes from v3 (21 Apr end-of-day)

**Closures:**
- **A24 closed ✅** — Stage 1 external multi-model review layer shipped 21 Apr. Original MVP spec was Architect Reviewer (Gemini per-commit) + Sceptic (GPT-4 weekly). Actual shipment exceeded MVP: three-voice layer (Strategist Gemini + Engineer GPT paused + Risk Grok) plus standalone System Auditor EF for whole-system audits. Webhooks verified on both repos, full infrastructure live. See D160 + D161. Layer is currently dormant (reviewers paused for sprint, see D162) — infrastructure is live, activation is a one-line SQL.

**Sprint decision (D162):** All four reviewers (`strategist`, `engineer`, `risk`, `system_auditor`) set to `is_active=false` on 21 Apr evening. Rationale: external review of sprint work creates review-loop recursion (we fix something, reviewer fires, finding is already known, we fix next, reviewer fires again…). Re-enable target: ~18-19 of 28 Section A items closed — fresh eyes on a near-stable state before first pilot signing.

**No new A-items surfaced.** Items A27, A28, A29 remain the open items surfaced 18 Apr from D157 (cost guardrails). Today's reviewer work did not add new pre-sales blockers.

**Change log moved to new entries at bottom.**

---

## v3 changes from v2 (afternoon → late evening)

**Closures:**
- **A9 closed** ✅ — reframed once more and resolved. Path was not feed-assignment (v2 direction) but 307-row backfill plus D152 seeder fix preventing recurrence.
- **A10 split** — A10a (IG config: tokens + mode + destination_id for all 4) closed ✅. A10b (first IG post actually publishes) remains open for Sunday morning verification.
- **A11 split** — A11a (CFW + Invegent FB/IG tokens activated) closed ✅. A11b (CFW + Invegent content_type_prompts across 3 platforms × 3 job types) remains open. **[v4.4 NOTE: A11b closed 24 Apr — see drift notice at top.]**
- **A12 + A13** — remain confirmed.
- **A15 closed** ✅ — publisher and weekly-manager-report committed + pushed Saturday.
- **A18 reduced** — 7 source-less EFs remaining (was 8). One recovered during Saturday investigation.

**New pre-sales items surfaced Saturday (A19–A26):**

From D155 fallout (the 7-day silent stall):
- **A19** — FB token refresh (now a formalised audit record). Closed ✅ — all 4 clients refreshed Saturday.
- **A20** — Pipeline liveness monitoring (ai_job stall alert + last-success freshness alert per client × platform).
- **A21** — Trigger ON CONFLICT audit across all 10+ triggers (same class of bug as D155 may exist elsewhere). **[v4.4 NOTE: closed 24 Apr — see drift notice at top.]**
- **A22** — Ai-worker error surfacing (UPDATE rollbacks currently fail silently). **[v4.4 NOTE: closed 27 Apr via Stage 12 v2.11.0 / Lesson #33 — see drift notice at top.]**
- **A23** — D153 live `/debug_token` cron (replace the sentinel expiry approach).

From D156 strategic direction (external epistemic diversity layer):
- **A24** — Stage 1 external multi-model review layer. MVP: Architect Reviewer (Gemini 2.5 Pro, per-commit) + Sceptic (GPT-4, weekly).
- **A25** — Stage 2 bank reconciliation layer. MVP: Meta reconciliation + GitHub + Vercel + Supabase.
- **A26** — Review discipline mechanism (unread-blocks-dashboard + weekly block).

**Section H update:** 3 of 4 remaining open questions addressed or reframed.

---

## Framework (reference)

**Clock A — Production continuity:** 14 consecutive days, ≥95% schedule adherence, supply ratio ≥1.5×, miss reasons captured for any deviation.

**Clock B — Operational time:** average <2 hours/day across the same 14-day window.

**Clock C — Client handling readiness:** 7-item checklist (inbound channel, SLA, routing, review modes, emergency pause, testimonial capture, billing automation).

Clock A + B + C all green = gate to first external sales conversation.

---

## Classification schema

- **Pre-sales** — must be true before first external sales conversation. Non-negotiable.
- **Post-sales Tier 1** — within 7 days of first contract signed.
- **Post-sales Tier 2** — within 30–60 days of first sale.
- **Post-sales Tier 3** — ongoing hygiene.
- **Parked** — do not work on until specific trigger fires.

---

## Headline finding (v4.3 — superseded by v4.4 drift notice at top)

**v4.3 reading (preserved for change-log accuracy):** Still not cleared to start the 14-day Clock A window. A7 closed this morning (privacy policy) is the first A-item closure since 21 Apr; remaining closures (M5, M6, M7, M8, M9, M11 + D164 + D165 + D166 + D167) are all sprint-track, not A-items. A-count moves from 8/28 → 9/28 closed.

**v4.4 reading (current):** A-count now 14/29 closed (A11b + A21 closed 24 Apr; A22 + A27 + A28 closed 27 Apr via Stages 11-12). Still not cleared to start 14-day Clock A window — gate items remaining listed in drift notice at top. Gate B 5-7d shadow observation in progress; earliest exit Sat 2 May.

### Sprint order recommendation (v4.3 — superseded)

Friday-forward priorities given PK dead-day Thursday:
1. **R4 (classifier spec on paper)** — low-risk writing work, builds momentum for router matching layer, zero production touch
2. **A11b content prompts** — CFW + Invegent × 3 platforms × 3 job types = 18 rows. PK-session needed.
3. **L1 pilot document (A1 + A5 + A8)** — drafted template exists, needs final pass
4. **M4 A18 source-less EFs investigation** — pick up when PK has 3+ hours
5. **Larger builds last:** A16 Clock A dashboard, A20-A23 monitoring, A25-A26 external layer

**Deliberately deferred:** R6 (`seed_and_enqueue_ai_jobs_v1` rewrite) — HIGH RISK hot-path change. Needs explicit planning session + verification gates. Not suitable for casual picking-up.

### v4.4 sprint order (current)

Phase B in shadow observation — most build paused for 5-7 days. Parallel-safe work during Gate B:
1. **L1 pilot doc (A1 + A5 + A8)** — template v1 exists; final pass + A8 disclosure clause integration
2. **A6 subscription costs** — invoice walk + `k.subscription_register` reconciliation. Pure data work, no infra touch.
3. **A4 → A3 proof doc** — extract NDIS Yarns metrics; build invegent.com/proof page if data supports it.
4. **A18 source-less EFs** — 7 remaining EFs investigated + source pulled. Half-day blocks.
5. **A16 Clock A dashboard** — `/continuity` page, schedule adherence per client × platform.
6. **A14 RLS verification** — through-portal-route audit (M3 partial, 2 OAuth findings remain).

**Deliberately deferred during Gate B:** anything that touches Phase B pipeline state. No new migrations on `feature/slot-driven-v3-build`. No ai-worker redeploys. Gate B observation requires uninterrupted 5-7 day window.

Full sprint board maintained in `docs/00_sync_state.md`.

---

## Item count summary (v4.3 — superseded by v4.4 drift notice at top)

| Classification | Count | Change from v4.2 |
|---|---|---|
| Pre-sales (Section A) | 28 | 0 |
| Pre-sales closed / confirmed | **9** | +1 (A7 privacy policy closed 22 Apr morning) |
| Pre-sales open | **19** | -1 |
| Post-sales Tier 1 (Section B) | 8 | 0 |
| Post-sales Tier 2 (Section C) | 6 | 0 |
| Post-sales Tier 3 (Section D) | 12 | 0 |
| Parked (Section E) | 4 | 0 |
| **Total** | **58** | 0 |

**v4.4 supplement (effective 27 Apr 2026):** Pre-sales closed = 14 (A11b + A21 closed 24 Apr; A22 + A27 + A28 closed 27 Apr). Pre-sales open = 15 in A1-A26 plus A29 = 16 functional open items (was 19 in v4.3 plus A27-A29). Gate items remaining listed in drift notice at top.

A27, A28, A29 (ID003 follow-ons surfaced 18 Apr in D157) are tracked in the dashboard roadmap but not in the A1-A26 numbering of this file's Section A. Treating them as a separate group of 3 makes the actual open count 15 in A1-A26 plus 1 in A27-A29 = 16 functional pre-sales items still open, plus the 3 timebox windows. Keeping the main count at 28 to preserve v3 comparability.

---

## Section A — Pre-sales items (28; v4.4 supplement: 14 closed / confirmed, 15 open)

**Definition: must be closed before first external sales conversation. Each item has a named deliverable and a completion test.**

**v4.4 NOTE:** five status flags below show 🔲 Open but should be read as ✅ Closed per the drift notice at top: **A11b** (24 Apr), **A21** (24 Apr), **A22** (27 Apr), **A27** (27 Apr), **A28** (27 Apr). Body text in the tables below is preserved verbatim from v4.3 for change-log integrity; the canonical status is the drift notice.

### A-items from v2 (status updated)

| # | Status | Item | Rationale | Concrete action | Audit ref |
|---|---|---|---|---|---|
| A1 | 🔲 Open | Pilot structure with liability waiver (supersedes solicitor engagement) | Per D147: solicitor is deferred until first pilot revenue. Pre-sales deliverable becomes a clean pilot agreement with explicit waiver language rather than a solicitor-reviewed productised agreement. | Draft pilot terms: half-priced service (or 3-month free trial), waiver clause (experimental service, client solely responsible for published content, limited warranties). Keep to one page. PK-drafted; no solicitor needed at this gate. Template v1 drafted 21 Apr morning. | Audit #2 (reframed), D147 |
| A2 | 🔲 Open | Meta App Review — status resolved OR pilot workaround documented | Standard Access is the productised gate. Pilot-mode (1–2 clients where PK is added as admin on their Business Manager) is defensible under Meta Developer Policies. | Two parallel tracks: (a) await Meta decision, escalate via dev support on 27 Apr if no movement; (b) draft pilot-mode doc specifying first 1–2 clients run under their Business Manager access, time-boxed to Standard Access confirmation. **27 Apr escalation date reached today — contact dev support if no progress.** | Audit #1, Sec 4 Gate 1, Sec 6 L002 |
| A3 | 🔲 Open | One-page proof document | Single most important sales asset. Without it, no artefact to open a conversation with. | 1-page PDF / URL at invegent.com/proof. Content: NDIS Yarns posts published, reach trend, top-3 performing posts with numbers, compliance rules enforced, time saved vs manual. One before/after snapshot. | Audit #6, Consultant Audit 1 |
| A4 | 🔲 Open | NDIS Yarns numbers worth showing | A3 depends on this. Consultant audit said 4–8 weeks of organic growth needed. Now ~10 weeks in. | Extract NY metrics end of week. If numbers support proof doc → produce A3. If thin → identify what would make them credible and close that gap. | Audit #9, Consultant Audit 1 |
| A5 | 🔲 Open | Buyer-risk clause — "50% off next month on KPI miss" | Per D148: capital-preserving form of the consultant's 90-day money-back recommendation. Month-on-month cadence, KPI-triggered. | Define 2–3 measurable KPIs (minimum posts/week, engagement rate, follower growth) with thresholds. Include clause in A1 pilot terms. Drafted within pilot template v1. | Audit #8, D148 |
| A6 | 🔲 Open | Unit economics confirmed — all subscription costs known | Cannot price a service without cost base. 4 TBC rows in subscription register. | Check invoices: Vercel, HeyGen, Claude Max, OpenAI. Update `k.subscription_register`. Confirm firm monthly number. | Audit #32 |
| A7 | ✅ Closed | Privacy policy updated — YouTube + HeyGen + video-analyser | Closed 22 Apr morning. New canonical at invegent.com/privacy-policy with 12 sections including YouTube Data API, HeyGen consent, 24h video transcript retention. `invegent.com/privacy` 301-redirects. L006 cleared. Meta App Review URL field to be updated. | **Done 22 Apr.** Commits `683b3c9` + `85052af` on invegent-web. | Audit #4, Sec 1.13, L006 |
| A8 | 🔲 Open | AI content disclosure clause in service agreement / pilot terms | L007 gate. Contractual clause pre-sales; per-post labelling infrastructure is Tier 2. | Draft clause: "Content generated by ICE is AI-assisted under compliance-aware editorial rules. Client agrees to disclose AI assistance where required by platform policy or regulatory framework." Include in A1. Drafted within pilot template v1. | Audit #5, L007 |
| A9 | ✅ Closed | Orphan drafts resolved (reframe #2) | v2 reframed this as feed-assignment per H6. The actual Saturday resolution was different: 307 rows backfilled to correct client_id, D152 seeder fix prevents recurrence at source. No feed-assignment work needed — the orphans weren't from unassigned feeds, they were from the D142 seeder writing NULL. | **Done 18 Apr afternoon.** 307 rows backfilled. D152 applied to seeder. | Audit #22, D152 |
| A10a | ✅ Closed | Instagram config — tokens + mode + destination_id for all 4 clients | Was A10 in v2. Split because "config live" and "first post actually publishes" are different confirmations. | **Done 18 Apr afternoon.** All 4 IG profiles activated, IG Business Account IDs populated. | Audit #27, PK H12 |
| A10b | 🔲 Open | Instagram — first post actually publishes successfully | Config existing ≠ content flowing. Must see at least one IG post land for at least one client before declaring IG publishing live. **22 Apr update: IG publisher cron paused per D165 and is awaiting router integration per D166 (sprint track R6). A10b cannot close until router-driven IG pipeline ships.** **27 Apr update: router track superseded by slot-driven build. A10b now gated only on Meta restriction clear (24-48h auto-recovery from 25 Apr — overdue by 2 days, may need manual chase).** | Originally Sunday morning verification; gated on Meta restriction clear. | PK H12, 18 Apr evening split; D165/D166 22 Apr; 27 Apr Meta restriction note |
| A11a | ✅ Closed | CFW + Invegent FB/IG tokens activated | Split from A11 because tokens and prompts are two independent workstreams. Tokens done Saturday; prompts still pending. | **Done 18 Apr afternoon.** All 4 FB tokens refreshed to permanent; all 4 IG profiles activated. | Audit #15, #16, PK H11 |
| A11b | 🔲 Open *(see v4.4 drift notice — closed 24 Apr)* | CFW + Invegent content_type_prompts — 9 rows × 2 clients | Table shows 0/0/0 for both. Without prompts, ai-worker has no template to generate against for these two clients — Clock A cannot start with them producing nothing. | Content strategy session: write prompts for CFW × (Facebook, Instagram, LinkedIn) × (3 job types) = 9 rows. Same for Invegent. Friday 24 Apr per continuity brief plan. **Closed 24 Apr via M1: CFW + Invegent content_type_prompts shipped (LinkedIn + YouTube + format parity 12/12).** | Audit #15, #16, split v3 |
| A12 | ✅ Confirmed | HeyGen not exposed in v1 client portal | Code search of `invegent-portal` shows zero HeyGen / avatar / consent references. HeyGen is backend-only. L005 gate not violated at the portal level. | Verified 18 Apr morning via GitHub code search. If any client-facing route is added later that exposes HeyGen, consent flow must be built first (D149 Legal Advisor is a fit for that gate check). | Audit #24, L005 |
| A13 | ✅ Confirmed | video-analyser not exposed to clients | Code search + PK H15: video-analyser is part of feed inflow, processing YouTube video transcripts for signal extraction. Backend-only. Not client-facing. L004 gate not violated. | Verified. No action needed. | Audit #25, L004, PK H15 |
| A14 | 🔲 Open | RLS audit — confirm no portal route bypasses SECURITY DEFINER | Only 10 of 138 tables have RLS enabled. If all portal queries go through SECURITY DEFINER RPCs, RLS-off is missing defence-in-depth but not exploitable. If any portal page queries tables directly, client could read another client's data. | Grep `invegent-portal` codebase for direct Supabase queries (not via `.rpc()` calls). Confirm every query is either (a) RLS-enforced, or (b) SECURITY DEFINER RPC. Flag exceptions. Verification only — may not require building. Related to M5 — same code-quality family; findings may overlap. Audit partially complete 22 Apr (M3) — 2 HS OAuth findings + 5 MS exec_sql findings (MS closed via M6). | Audit #23 |
| A15 | ✅ Closed | Publisher + weekly-manager-report committed | Both had uncommitted changes at audit start. Production code differed from repo. | **Done 18 Apr afternoon.** Both committed and pushed. | Audit #36 |
| A16 | 🔲 Open | Clock A dashboard — exists and measures schedule adherence | Cannot declare "95% adherence" without a dashboard showing it. Does not exist currently. | Build `/continuity` page in dashboard. Data source: compare `c.client_publish_schedule` expected slots vs `m.post_publish` actual. Rolling 14-day per client × platform with miss reasons. Simple — just correct, not beautiful. NOTE: M2 resolution means `c.client_publish_schedule` will now actually reflect reality for clients who set schedules post-21 Apr; pre-21 Apr schedules were lost. A16 should be built assuming schedule data starts accruing from 21 Apr onward. | Audit #37, new from framework |
| A17 | 🔲 Open | Clock C seven items — each explicitly defined and lived | The 7 items are listed but none have a written definition of "done." | New doc `docs/16_client_handling.md`. One paragraph per item: what it is, what ready looks like, where it lives, SLA. Inbound + SLA + routing can share one section; testimonial capture and billing automation need actual build. | New from framework |
| A18 | 🔲 Open | 7 source-less Edge Functions — full investigation (was 8) | Per PK H16: "this requires a full on investigation to ensure why there is error, I think these are presales." Recovery / rollback blind spot. One of the original 8 recovered Saturday; 7 remain. | For each of the 7: check Supabase function logs for error rates, extract deployed source via Supabase dashboard, commit to `supabase/functions/`, add to deployment pipeline. Identify any showing unhealthy error signals — those get priority. | Audit #18, PK H16, 18 Apr update |

### New A-items surfaced 18 April (A19–A26)

| # | Status | Item | Rationale | Concrete action | Source |
|---|---|---|---|---|---|
| A19 | ✅ Closed | FB token refresh — formalised audit record | 3 of 4 FB tokens had been dead since 13 Apr PDT. Stored `token_expires_at` was stale. Token-expiry alerter was trusting the sentinel field, not reality. Refresh done Saturday; formalising here as a logged A-item rather than an ad-hoc action. | **Done 18 Apr afternoon.** All 4 FB tokens refreshed to permanent (`expires_at: 0`). Verified via `/debug_token`. D153 (A23 below) is the durable fix for the underlying trust-the-sentinel problem. | D155 session, 18 Apr evening |
| A20 | 🔲 Open | Pipeline liveness monitoring — ai_job stall + last-success freshness per client × platform | D155 root cause went undetected for 7 days because no alert watched for "ai_jobs accumulating in queued state" or "no successful publish per client × platform in >24h." Both are single-query checks. Their absence is what made the stall silent. **22 Apr: M11 was a second instance of the same class — 2,258 silent cron failures over 8 days. A20 scope should include `cron.job_run_details` failure_rate watch.** | (a) pg_cron daily: SELECT client × platform combinations where last `m.post_publish.published_at` > NOW() - 48h AND expected_posts > 0, write to `m.liveness_alert`. (b) pg_cron every 4h: ai_job stall check — queued > succeeded growth rate over 24h, write to same table. (c) NEW: pg_cron daily sweep of `cron.job_run_details` looking for failure_rate > 0.5 over past 24h per job — alert if any job has been failing silently. Dashboard banner surfaces unresolved alerts. | D155 fallout, M11 confirms, continuity brief |
| A21 | 🔲 Open *(see v4.4 drift notice — closed 24 Apr)* | Trigger ON CONFLICT audit — all triggers, not just enqueue | D155 was an ON CONFLICT clause mismatch on one trigger. The same class of bug may exist on other triggers. **22 Apr update: M11 proved the class recurs (enqueue cron had wrong ON CONFLICT target for 8 days).** Proof-by-audit required, not just assertion. | Query pg_trigger → for each trigger function, grep the body for ON CONFLICT clauses. For each, verify clause columns exactly match a unique constraint on the target table. Write findings to `docs/briefs/2026-04-XX-trigger-on-conflict-audit.md`. **Closed 24 Apr (L6 / A21). 10+ triggers verified, no second instance of D155-class bug found.** | D155 fallout, M11, continuity brief |
| A22 | 🔲 Open *(see v4.4 drift notice — closed 27 Apr via Stage 12 v2.11.0)* | Ai-worker error surfacing — UPDATE rollbacks currently fail silently | The D155 symptom was ai_worker UPDATE silently rolled back by the faulty trigger. The function didn't check the UPDATE's effect count. Pattern may exist in other EFs. M2 closure provides additional evidence of the "swallow error, lie to caller" anti-pattern — A22 scope could usefully extend beyond `UPDATE` rowcount checks to "any RPC call that doesn't destructure `{ error }`". | Audit all EFs that do UPDATE against pipeline tables. Each must check rowcount and surface a failure (log line + row in a failures table) if 0. Patch in single commit. Consider widening scope to include rpc() calls without `{ error }` destructuring based on M2 pattern. **Closed 27 Apr via Stage 12 v2.11.0 — Lesson #33 codified: every Supabase JS write destructures `{ error }` and throws. Surfaced via the silent slot UPDATE incident (m.slot zero service_role grants → 19 of 20 shadow drafts left their slots in pending_fill).** | D155 fallout, continuity brief, M2 pattern |
| A23 | 🔲 Open | D153 — live `/debug_token` cron (replaces sentinel approach) | Current token-expiry alerter trusts `token_expires_at` which is stale when Meta revokes mid-cycle. Fix per D153: cron calls Meta's live `/debug_token` endpoint daily per FB token, writes real status to `m.token_expiry_alert`. | Spec Wednesday 22 Apr per continuity brief. Build Thursday or Friday. | D153, D155 fallout, continuity brief |
| A24 | ✅ Closed | Stage 1 external multi-model review layer — MVP exceeded | Per D156: ICE's monitoring shares Claude's epistemic foundation. MVP was Architect Reviewer (Gemini per-commit) + Sceptic (GPT-4 weekly). Actual shipment: three-voice layer + System Auditor EF. | **Done 21 Apr.** Three-voice (Strategist Gemini active, Engineer GPT paused, Risk Grok active) + System Auditor separate EF + webhooks on both repos + weekly digest cron + /reviews dashboard. Currently dormant (D162 sprint pause) — infrastructure live, reactivation is one SQL statement. See D160 + D161. | D156, D160, D161 |
| A25 | 🔲 Open | Stage 2 bank reconciliation layer — MVP | Per D156: external system is authoritative when it disagrees with ICE's DB. MVP is Meta Graph API reconciliation (catches the D155 symptom platform-side), followed by GitHub + Vercel + Supabase reconciliation for deploy drift. | Sequencing pushed back — original plan was Tue 21 Apr, but session focused on Stage 1 hardening. Build when Stage 1 proven to earn its keep post-sprint reactivation. | D156, continuity brief |
| A26 | 🔲 Open | Review discipline mechanism — unread-blocks-dashboard + weekly block | A24 + A25 outputs are theatre without structural reading-discipline. PK identified this as the missed angle Saturday evening. Unread items in `m.external_review_queue` block dashboard home until acknowledged. Weekly scheduled Monday review block. | Build when reviewers resume post-sprint. Currently moot — reviewers paused, no unread output accumulating. | D156, continuity brief |

### Section A completion test (v4.3 — superseded by v4.4 supplement at top)

All 28 items marked closed or confirmed. A27–A29 (from D157, tracked in dashboard roadmap) must also close. Then and only then: Clock A + B + C 14-day window starts. No external sales conversation before window completes with metrics in range.

---

## Section B — Post-sales Tier 1 (8, unchanged from v2)

**Definition: within 7 days of first signed pilot. Required for service delivery to the first client.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| B1 | Complete `docs/secrets_reference.md` with 20+ missing env vars | If any token needs rotating and nobody knows where it lives, publishing breaks. | Walk Edge Function source for each env var. Cross-check against Supabase secrets. One row per secret: name, purpose, owning function(s), rotation cadence, replacement source. |
| B2 | Client-specific portal dashboard — "what ICE did for your page this month" | Consultant Audit 1's critical deliverable. Per PK H8: starting point exists; Tier 1 to validate / rebuild. | Walk portal as a client. If operator-oriented, rebuild one page as client-oriented (posts published, reach, top performer, upcoming schedule). |
| B3 | Document `c.client_service_agreement` + `c.onboarding_submission` tables | Core of signing + onboarding. Both have NULL/TODO purpose. D151 rule applies. | Call Claude API to write purpose per D151. Review output. Write to k.table_registry. ~20 rows × 2 tables. |
| B4 | Onboarding runbook for first client | From signed pilot to first autonomous post: what PK does, in order, with timing. | `docs/17_first_client_onboarding_runbook.md`. Step by step. Each step has a "done when" and estimated duration. |
| B5 | Billing automation — invoice → payment → dunning | Clock C item 7. By client 2 needs automation. Do it before client 1. | Choose Xero (already referenced) or Stripe. Set up recurring invoice template. Test with $1 self-invoice. |
| B6 | Testimonial capture workflow | Clock C item 6. Every client who renews at month 3 is a testimonial opportunity. | Define when (month 3 check-in), how (scripted email + optional video), where it goes (proof page + sales deck). Calendar day-90 ask. |
| B7 | Emergency pause workflow | Clock C item 5. One-click halt procedure. | SQL function `public.pause_client(p_client_id UUID)`: set all `c.client_publish_profile.mode` to 'manual', drain queue, pause relevant crons. Test against Invegent first. |
| B8 | Inbound channel + SLA + routing defined | Clock C items 1–3. | Pick channel (support@invegent.com or portal form). Commit SLA: pipeline issues 4h business hours, other 24h. Publish in onboarding doc + portal footer. |

---

## Section C — Post-sales Tier 2 (6, unchanged from v2)

**Definition: within 30–60 days of first sale.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| C1 | Auto-approver — define target demand-met ratio and raise to target | Reframed per PK H9. Correct math: supply-ratio × pass-rate = demand met. 23% pass rate is acceptable if supply is 4× demand (D142 seeder targets supply ratio 1.5× — combined: at 1.5× × 23% = 35% of demand met; below target). Target = demand met ratio ≥ 100% with acceptable PK review burden. | Set demand-met target. Diagnose top rejection reasons per client (PP is body_too_long dominant — prompt length fix). Measure combined supply × pass-rate = demand met. Adjust either lever. |
| C2 | Clear compliance review queue + set SLA | 4 items AI-reviewed, pending human review since 1 Apr (17 days stale). | Review the 4. Set SLA: human review within 7 days of AI confidence score. Wire nag if >7 days. |
| C3 | Per-post AI disclosure labelling | Contract clause (A8) is pre-sales. Per-post label infrastructure is best practice. | Column `m.post_draft.ai_disclosure_text`. Configurable per client profile. Include in publisher output. |
| C4 | Fix cron schedule fragility (Audit 4 Gap 3) | 42 active crons firing into one Supabase instance. At 10 clients → concurrency-contended. | Move from time-based firing to queue-table reads. Per-client concurrency guards. Critical between clients 5–10. |
| C5 | Document `k.vw_feed_intelligence` + keep | Per PK H14: not advocating drop; the question was "is it used?" Default is keep + document. D151 rule applies. | Read view definition. Call Claude API per D151. Wire to Feed page in dashboard if surface makes sense. |
| C6 | HeyGen productisation decision | Currently backend-only (A12 confirmed). Decision point: offer avatar features in v2 pilot packaging, or park indefinitely. | PK decision. If "yes in v2": consent flow is a hard gate first (E2 unparks). If "no/not yet": stays parked. |

---

## Section D — Post-sales Tier 3 (12, unchanged from v2)

**Definition: ongoing doc / governance / hygiene.**

| # | Item | Action |
|---|---|---|
| D1 | sync_state drift — EF count | Fix in next sync. Verify per D150. |
| D2 | sync_state drift — cron count | Same as D1. |
| D3 | sync_state drift — feed count | Same as D1. |
| D4 | Close client-assets bucket issue in sync_state | Bucket is public. Remove "fix first thing" note. |
| D5 | Clean up 2 local-only Edge Functions | Delete `ai-diagnostic` or deploy. Remove `linkedin-publisher` (superseded by linkedin-zapier-publisher). |
| D6 | Document 22 TODO tables per D151 | Batch job. Priority: `c.*` and `m.*` first. |
| D7 | Brief 041 result file | Log as PARTIAL / blocked on tokens. |
| D8 | Brief 042 result file | DONE in reality. Retroactive result.md. |
| D9 | Brief 036 gap investigated | Intentional skip or forgotten? Check. |
| D10 | Subscription register 13 vs 12 rows reconciled | Query `SELECT * FROM k.subscription_register`. D151 for any NULL purpose. |
| D11 | 115 SECURITY DEFINER functions — dead code sweep | Quarterly. For each: called by any Edge Function or dashboard route? If not, deletion candidate. |
| D12 | Audit brief SQL templates fixed | 3 queries had column mismatches. Update for next audit. |

---

## Section E — Parked (4, unchanged from v2)

**Definition: do not work on until specific trigger fires.**

| # | Item | Trigger to unpark |
|---|---|---|
| E1 | CFW brand colours NULL | When CFW reaches full production (after A11b completion). |
| E2 | HeyGen productisation for clients | L005 consent flow shipped end-to-end + C6 decision to include avatar in client packaging. |
| E3 | Self-serve SaaS onboarding | After 5+ pilot / managed service clients retained for 3+ months each. |
| E4 | Creator / entertainment tier | After self-serve SaaS layer exists. Not before. |

---

## Section F — Fresh-eyes pushback on the framework session

### F1 — You cannot start the 14-day Clock A window today
Audit flagged stability defects but not as Clock A blockers. See Section A items A10b, A11b, A18, A20–A26. Fix first, then start clock.

### F2 — Auto-approver 23% is not necessarily a problem
50% was a one-day snapshot miscoded as a benchmark. Define target first. Classed as Tier 2 (C1).

### F3 — 90-day cash money-back is the wrong form for a sole trader
Resolved per D148 — "50% off next month on KPI miss" is the capital-preserving alternative.

### F4 — Meta App Review is softer than "no external clients until Standard Access"
Pilot clients where PK is admin on their Business Manager is defensible. Captured in A2 two-track approach.

### F5 — The sync_state handoff protocol has a trust-but-verify hole
Resolved per D150 — verify-commit-landed step added to session-close SOP.

### F6 (new v3) — The first D155-class silent failure surfaces an epistemic problem, not a monitoring problem
Adding more Claude-written monitors to watch Claude-written pipelines compounds the blind spot. D156 sets external layer as the correct response — A24–A26 are not optional, they are the commercial viability gate for a managed content service.

### F7 (new v4) — Reviewer layer paused during sprint is not "giving up on D156"
The sprint pause (D162) is a noise-reduction decision, not a reversal.

### F8 (new v4.1) — Pre-approved SQL should be flagged when it's DDL
Q1 closure surfaced that the sync_state's pre-approved `UPDATE SET status='dead'` was untested — CHECK constraint rejected `'dead'`.

### F9 (new v4.2) — Verification scope must match the actual call path, not a proxy
M2 closure surfaced that Claude Code's direct-SQL RPC verification passed cleanly but missed the actual bug.

### F10 (new v4.3) — Superseded is not closed
M12 was an active sprint item with a specific surgical fix scoped. Evening deep-read revealed the fix is polish on code the router replaces.

### F11 (new v4.3) — External-agent claims about infrastructure need through-verification
Claude Code's morning roadmap-sync report asserted Vercel GitHub auto-deploy didn't fire for commit `150f1e5`. This was wrong.

### F12 (new v4.4 — Lesson #33 generalised) — Silent failure is the costliest failure mode
The 27 Apr Stage 12 silent-UPDATE incident hid an architectural bug for ~8 hours before being detected. The Supabase JS client returned `{ data: null, error: ... }` but the calling code never destructured `{ error }`, so the PostgREST permission error was invisible. Pattern recurs across every layer that abstracts over an underlying call (rpc, pg trigger, fetch, message bus, etc): if the abstraction returns success-shaped data on partial failure without the caller checking the error channel, bugs accumulate silently. **Standing rule:** every abstraction boundary must have an explicit error check at the calling layer, with `throw` for must-succeed paths and `console.error` for best-effort paths. Codified in ai-worker v2.11.0; applies to all future EF code, all future Supabase JS writes, all future RPC calls, all future trigger function calls.

### F13 (new v4.4) — Recovery systems own dependent state
The 27 Apr Stage 12 recovery+fill+LD18 conflict surfaced that `m.recover_stuck_slots()` was resetting slot fields without considering the rows that pointed BACK at the slot (post_draft via filled_draft_id, ai_job via slot_id). Two architectural choices to handle this: (a) recovery deletes dependent rows when resetting (loses audit trail), or (b) downstream functions become idempotent via UPSERT (preserves audit trail). PK chose (b). Now codified: when designing a recovery-style function, enumerate every row that points back at the primary entity and either delete it or arrange for the next-stage function to refresh it. Applies to slot recovery, draft rejection, queue requeue, ai_job retry — any "reset to initial state" operation.

---

## Section G — Pre-sales gate checklist (go / no-go)

This is the single list PK pulls up before opening a sales conversation. **v4.4 supplement: 5 boxes additionally tickable per drift notice at top.**

```
Legal (no solicitor required at pilot stage per D147)
[ ] A1  Pilot terms + liability waiver drafted (template v1 done, final pending)
[ ] A5  50% off KPI miss clause with defined KPIs (drafted within A1)
[x] A7  Privacy policy updated (YouTube + HeyGen + video-analyser) — invegent.com/privacy-policy live
[ ] A8  AI disclosure clause in pilot terms (drafted within A1)

Proof
[ ] A3  One-page proof document written and hosted
[ ] A4  NDIS Yarns numbers support the proof document

Platform
[ ] A2  Meta App Review resolved OR pilot workaround documented (27 Apr escalation overdue)

Stability — original (22 Apr closures + v4.4 closures ticked)
[x] A9  Orphan drafts resolved (307 backfilled + D152 prevents recurrence)
[x] A10a Instagram config done for all 4 clients
[ ] A10b First IG post actually publishes — gated only on Meta restriction clear (overdue)
[x] A11a CFW + Invegent FB/IG tokens activated
[x] A11b CFW + Invegent content_type_prompts (closed 24 Apr via M1)
[x] A12 HeyGen not exposed in v1 portal (confirmed via code search)
[x] A13 video-analyser internal-only (confirmed)
[ ] A14 RLS verification — no portal route bypasses SECURITY DEFINER
[x] A15 Publisher + weekly-manager-report committed
[ ] A16 Clock A dashboard live
[ ] A18 7 source-less Edge Functions investigated + source pulled

Stability — D155 fallout (v3) + v4.4 closures
[x] A19 FB token refresh across 4 clients
[ ] A20 Pipeline liveness monitoring (ai_job stall + last-success freshness + cron failure-rate)
[x] A21 Trigger ON CONFLICT audit across all triggers (closed 24 Apr via L6)
[x] A22 Ai-worker error surfacing (closed 27 Apr via Stage 12 v2.11.0 — Lesson #33)
[ ] A23 D153 live /debug_token cron

External epistemic layer (v3 → updated v4)
[x] A24 Stage 1 multi-model review MVP — EXCEEDED (three-voice + System Auditor + webhooks + dashboard)
[ ] A25 Stage 2 bank reconciliation layer MVP (Meta + GitHub + Vercel + Supabase)
[ ] A26 Review discipline (unread-blocks-dashboard + weekly block)

Clock C
[ ] A17 All 7 client-handling items defined and documented

Economics
[ ] A6  All TBC subscription costs resolved

ID003 follow-ons (surfaced 18 Apr via D157) + v4.4 closures
[x] A27 LLM-caller idempotency (closed 27 Apr via Stages 11+12 — LD18 + UPSERT)
[x] A28 Cost guardrails (closed 27 Apr via Stage 11 LD7 + Gate B observation)
[ ] A29 Inbox anomaly monitor live

Timebox
[ ] Clock A window complete — 14 consecutive days ≥95% adherence
[ ] Clock B window complete — avg <2 hrs/day ops time
[ ] Clock C — all 7 items green

First external sales conversation authorised only when every box above is ticked.
```

**Current score (v4.4 supplement, 27 Apr 2026): 14 of 29 closed, 15 open** (plus 3 timebox windows not yet startable). Realistic first-conversation timeline: mid-late June 2026. Gate B observation (5-7d) running now — does not directly close pre-sales items but validates the cost-predictability foundation that A28 just closed.

---

## Section H — Open questions still requiring PK input (1 of 16 remaining)

12 of 16 resolved in PK Q&A on 18 Apr morning. 3 of the remaining 4 addressed Saturday:

| # | Question | Blocking item | Status |
|---|---|---|---|
| H1 | Vercel deployment state | A16 | Still open — PK to run `vercel login` once in terminal, caches a token the MCP can use. One-time 5-second action. Partially addressed 22 Apr: Vercel webhook confirmed healthy for main branch via screenshot evidence; MCP access still pending. |
| H2 | Last commit dates for dashboard / portal / web repos | A14, A16 | Resolving through actual use — A24 Stage 1 + A25 Stage 2 will surface deploy drift automatically once built. Can close once A25 priority 3 (Vercel reconciliation) is live. |
| H3 | Meta App Review status change since 14 Apr | A2 | Partially addressed: invegent.com DNS TXT verified 18 Apr ✅. Shrishti 2FA + passkey still pending — PK to chase. **27 Apr escalation trigger reached today.** Privacy policy URL should be updated in Meta App Review form to new canonical. |
| H16 | 8 source-less EFs — any showing unhealthy error signals | A18 | Resolved as standalone question — investigation happens inside A18 execution, not separately. |

**Resolved in v2 or earlier (unchanged):**
- H4 → D147 (pilot + waiver, defer solicitor)
- H5 → portal code search: zero avatar/consent/HeyGen references (A12 satisfied)
- H6 → orphan drafts reframed twice; ultimately resolved via D152 backfill not feed-assignment (A9 closed)
- H7 → no proof doc elsewhere (A3 stands)
- H8 → Tier 1 to validate / rebuild client dashboard (B2)
- H9 → auto-approver math clarified: supply × pass-rate = demand met (C1 reframed)
- H10 → D148 (50% off next month on KPI miss)
- H11 → CFW + Invegent in Clock A scope (A11a closed, A11b closed 24 Apr via M1)
- H12 → Instagram fix for v1 (A10a closed, A10b gated on Meta restriction clear)
- H13 → D151 (universal table purpose rule)
- H14 → keep vw_feed_intelligence + document (C5)
- H15 → video-analyser internal-only (A13 confirmed)

---

## Section I — Advisor Layer Plan (per D149, unchanged substantively from v2)

Parallel track to pre-sales work. Not on the critical path — does not gate any Section A item. But highest-leverage long-term investment because it transfers to every future project.

**v3 note:** per D156, the Stage 1 Devil's Advocate (Gemini 2.5 Pro reading any D149 advisor output within 2 hours) is now the external counterpart to this layer.

**v4 note:** advisor layer build (Sales Advisor, Thu 23 Apr) is deferred until sprint completes — no new Claude-assisted layers during sprint for the same reason reviewers are paused (noise during fast iteration).

**v4.3 note:** router build (D166/D167) has taken sprint attention that would otherwise have advanced advisor layer. Sales Advisor build now realistically post-R6 completion or post-pilot-signing, whichever comes first.

**v4.4 note:** R6 superseded by slot-driven Phase A + B (now COMPLETE). Sales Advisor build still deferred — Gate B observation in progress, build pause for 5-7 days. Reactivation of advisor layer realistic post Gate B exit (early-to-mid May).

### Build order
1. **Sales Advisor** — Claude Project, custom instruction, GitHub repo connected. Ask three real questions. Validate over two weeks. Devil's Advocate (Gemini) runs in parallel from day one. **Now deferred until sprint nears completion.**
2. **Legal/Risk Advisor (week 3 if Sales Advisor validates)** — same template.
3. **Ops Discipline Advisor (week 4)** — reads Clock B metrics, catches overcommitment.
4. **Product Strategy Advisor (week 5)** — separate voice from session-active Claude.

### Validation criteria (after 2 weeks with Sales Advisor)
- Did PK read advisor responses and change any decision based on them?
- Did the advisor catch anything PK would not have caught alone?
- Did Devil's Advocate surface counter-angles the advisor missed?
- Are the responses specific to ICE context (good) or generic consulting platitudes (bad)?

If yes to first three, proceed to next advisor. If no, tighten brief and retry once before abandoning the pattern.

### Audit infrastructure (build before first consultation)
`m.advisor_log` table per D149. `m.external_review_queue` per D156 (Devil's Advocate outputs go here). Retrospective verdict filled in after 6 weeks. After a quarter: advisors with poor retrospective scores get rewritten or retired.

### What this does NOT replace
- PK's strategic commitments (decisions stay with PK)
- Human advisors / mentors / peers
- High-stakes one-shot calls

---

## Change log

- **2026-04-18 morning** — v1 initial classification.
- **2026-04-18 afternoon** — v2 reflecting PK answers to 16 open questions.
- **2026-04-18 late evening** — v3 reflecting Saturday afternoon/evening closures + D155 fallout + D156 strategic direction.
- **2026-04-21 end-of-day** — v4. **A24 closed.** D162 sprint-mode pause.
- **2026-04-21 later evening** — v4.1. **Q1 closed**. D163 Phase 1.7 DLQ foundation scoping.
- **2026-04-21 late evening** — v4.2. **M2 closed**. M5 opened. F9 lesson.
- **2026-04-22 full day + evening** — v4.3. Biggest sprint day. Morning: M5+M6+M7+M8+M9+M11+A7 closed. Evening router-build pivot: D166 + D167. F10 + F11.
- **2026-04-27 (current)** — **v4.4 update DEFERRED to next session** for efficiency. Five closures (A11b 24 Apr; A21 24 Apr; A22 + A27 + A28 27 Apr) captured authoritatively in `docs/00_sync_state.md` (commit `6107e790`) and dashboard roadmap (commit `71bb329b`). Drift notice at top of this document carries the canonical status until v4.4 reconciliation. Two new framework lessons: F12 (silent failure is the costliest failure mode — Lesson #33 generalised) + F13 (recovery systems own dependent state — Lesson #34 generalised). Slot-driven Phase B observation (Gate B) starts 27 Apr afternoon; earliest exit Sat 2 May.

---

*End of classification v4.3 with v4.4 drift notice. Next pickup: full v4.4 reconciliation after Gate B exit (or earlier if a closure is needed for sales-conversation gating). Realistic Friday+ targets during Gate B: A1 pilot doc final pass, A6 subscription costs reconciliation, A4 → A3 proof doc, A18 source-less EFs.*
