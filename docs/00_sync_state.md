# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-05-01 Friday early morning UTC / Friday late evening Sydney — **End-of-PK-on-phone session reconciliation. APPENDS to the Thursday late-evening reconciliation as the canonical session log.** PK on phone tonight; T07 step 4 attempted+rolled-back; NDIS-Yarns IG also hit Meta anti-spam (subcode 2207051) on cron retry; F-PUB-004 (auto-approver starvation) discovered as the largest production breakage of the day; F-PUB-005 (trigger doesn't gate on approval) captured as design coupling problem; T01 +21h obs clean across all metrics including zero alerts since deploy; two ChatGPT cross-checks halted wrong-direction actions tonight (wrong YT trigger fix; wrong bulk-quarantine of legacy FB drafts). action_list now at v2.3.
> Written by: PK (on phone) + Claude session sync

> ⚠️ **Session-start reading order (per memory entry 1):**
> 1. **`docs/00_sync_state.md`** (this file) — narrative log of last session
> 2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog with priorities and triggers
>
> The two files are complementary: sync_state is the session log, action_list is the working backlog. Read both at every session open.

---

## 🟣 1 MAY EARLY MORNING UTC — PK ON PHONE — APPEND-ONLY SESSION (T07 STEP 4 ATTEMPT + ROLLBACK + AUTO-APPROVER STARVATION DISCOVERY)

This section APPENDS to the Thursday late-evening reconciliation. PK was on phone (no laptop) for this session. Single continuous chat thread. Three rounds of work: (a) PK asked what chat could carry solo on phone; (b) chat applied T07 step 4 cron re-enable + monitored; (c) cron rolled back when NDIS-Yarns IG hit subcode 2207051; (d) deep investigation revealed the auto-approver starvation as the actual largest production issue; (e) ChatGPT cross-checks #1 (wrong YT trigger) and #2 (wrong bulk-quarantine) both halted by chat before harmful action; (f) T01 +21h obs run; (g) reconciliation.

### Sequence of events

**20. T07 step 4 attempted (~23:?? UTC 30 Apr / ~9:?? AM Sydney 1 May)**
   - PK on phone confirmed cron jobid 53 should be re-enabled per the v2.2 plan.
   - Chat ran `cron.alter_job(53, true)` via Supabase MCP. Pre-flight verified (only PP IG had `publish_enabled=false`; other 3 profiles `publish_enabled=true`).
   - **Discovered MCP role can't direct-UPDATE `cron.job`** — `cron.alter_job(jobid, active)` is the proper API. Used that.

**21. T07 step 5 first observation (00:18 UTC 1 May, ~12 min after re-enable)**
   - 2 cron ticks fired (00:00 + 00:15 UTC), both `succeeded` at the cron layer.
   - 4 IG publish attempts inside (cron command says `?limit=2`):
     - **CFW × 2 attempts**: failed at publisher's pre-flight gate with `not_approved:needs_review`. Did NOT reach Meta API.
     - **NDIS-Yarns × 2 attempts**: reached Meta API. 00:00 UTC: subcode 2207027 "Media ID is not available" (silent flag). 00:15 UTC: **subcode 2207051 "Action is blocked" — same anti-spam flag PP got 25 Apr**.

**22. Cron rolled back + NDIS-Yarns IG locked (00:19 UTC 1 May)**
   - Chat applied `cron.alter_job(53, false)` immediately.
   - Then `UPDATE c.client_publish_profile SET publish_enabled=false, paused_reason='meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam', paused_at=now() WHERE platform='instagram' AND client_id='fb98a472-...' AND publish_enabled=true`.
   - Final IG profile state: PP false, NDIS-Yarns false, CFW true, Invegent true. Cron jobid 53: false.
   - Original v2.2 "only PP is flagged" model was wrong. Captured as **F-PUB-002 corrigendum** in `docs/audit/runs/2026-04-30-publishers-operational.md`.

**23. Deep investigation: why did CFW fail with `not_approved:needs_review` and what does that imply?**
   - Discovered: CFW IG queue rows reference drafts in `approval_status='needs_review'`, not `'approved'`.
   - Pulled the trigger function `m.enqueue_publish_from_ai_job_v1` source — confirmed it does NOT check approval_status before inserting into queue. **F-PUB-005**: design coupling problem.
   - Then asked: why aren't the drafts auto-approved?
   - Discovered the auto-approver-sweep cron is healthy 144/144 in 24h, but its EF response shows `processed: 30, approved: 0, skipped_needs_human_review: 30` on every run.
   - The fetch function `m.auto_approver_fetch_drafts(30)` returns the same 30 highest-scored drafts every cycle. Score-DESC ordering picks 17 Apr legacy FB stragglers + 25 Apr LinkedIn drafts (per-client length cap mismatch). All 30 fail body_length or sensitive_keywords gates. No reject-cooldown means rejected drafts re-enter top-30 next cycle. Lower-scored IG drafts never reached.
   - **F-PUB-004 (HIGH, NEW)**: auto-approver starvation. 0 IG approvals + 0 LinkedIn approvals since 25 Apr 14:46 UTC. FB still works (different state-flow — drafts skip `'approved'` and go directly to `'published'`).
   - LinkedIn pipeline still publishing 3 posts in last 24h despite zero new approvals — running on the 64 already-`approved` LinkedIn drafts in queue from before 25 Apr 14:16.

**24. ChatGPT cross-check #1 (replayed from earlier today)**
   - On the publisher operational audit's first-pass YT framing ("add youtube to enqueue trigger whitelist") — chat had already executed this earlier. Confirmed correct read tonight: ChatGPT pulled R6 spec evidence chat had access to but didn't surface; pre-check via `youtube-publisher` v1.5.0 EF source proved the trigger exclusion was intentional architecture (YT reads `m.post_draft` directly, not the queue). Real cause: OAuth refresh-token expiry. **Lesson #45 application** (treat external red-team pre-checks as mandatory).

**25. ChatGPT cross-check #2 (NEW tonight)**
   - On chat's proposed fix for F-PUB-004: bulk-update legacy 17 Apr FB stragglers to `'dead'` to free up auto-approver fetch slots.
   - ChatGPT pushed back: (a) `'needs_human_review'` value would VIOLATE the CHECK constraint (legal values are `draft, needs_review, approved, rejected, scheduled, published, dead`); (b) `'dead'` is destructive and could hide audit value — use reversible `'rejected'` quarantine instead; (c) stratification alone isn't enough — without reject-cooldown the same drafts re-enter top-30 every cycle.
   - Chat verified ChatGPT's claims: confirmed CHECK constraint (legal values match exactly what ChatGPT said); confirmed scope was wrong (only 12 rows match the proposed criteria, not 87+); confirmed the cap mismatch is a synthesis-layer issue not a draft-layer issue.
   - Chat halted before applying any UPDATE. Captured the corrected fix in T08 + D-08 + D-09. **Lesson #46 application** (Cron health is not system health — auto-approver is the same pattern, scoped differently).

**26. T01 Phase B +24h obs (T07 step 5 final + observations at 00:30 UTC)**
   - Ran the 4 obs queries from `docs/runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md` verbatim, plus a defensive 5th query ("any alerts of any kind since deploy").
   - All 5 targets pass:
     - Zero new exceeded_recovery_attempts ✅
     - Shadow ai_job 3/3 succeeded (100%, well below <5% target) ✅
     - Zero new slot_fill_no_body_content ✅
     - Zero new pool_thin (especially Invegent) ✅
     - Bonus: zero alerts of ANY kind since deploy ✅
   - Captured at `docs/audit/runs/2026-05-01-phase-b-+24h-obs.md`.
   - **T01 ✅ done at +21h.** T02 (Gate B exit) defaults to "exit on schedule Sat 2 May." Final check at +24h (~03:48 UTC Sat 1 May) is formality; another 3h of clean window expected.

**27. S10 baseline established (00:30 UTC 1 May)**
   - Last 24h IG: 0 published, 2 failed (the NDIS attempts at 00:00+00:15 UTC).
   - Last 24h FB: 5 published. **Healthy.**
   - Last 24h LinkedIn: 3 published. **Surprise — pipeline running on remainder of pre-25-Apr `approved` queue.**
   - Last 24h YT: 0. Known broken (OAuth).
   - This is the OTL S10 baseline going forward.

**28. action_list updated through v2.3**
   - v2.2 → v2.3: T07 step 4 attempted+rolled-back; NDIS-Yarns IG also locked; T01 ✅; T08 added P0 (F-PUB-004 patch); D-08 + D-09 added; B22 + B23 added; S11 added; F-PUB-002 corrigendum committed; F-PUB-004 + F-PUB-005 captured.

### Today's mutations (cumulative across both reconciliations)

Thursday list per the previous reconciliation. Friday early morning UTC additions:

| When | Mutation | Type |
|---|---|---|
| ~23:?? UTC 30 Apr | `cron.alter_job(53, true)` — IG cron re-enabled | DML (data update on cron.job) |
| 00:00 UTC 1 May | First IG cron tick after re-enable — 2 attempts (CFW+NDIS) — both failed in different ways | (cron run, not chat-driven) |
| 00:15 UTC 1 May | Second IG cron tick — 2 attempts (CFW+NDIS) — both failed | (cron run, not chat-driven) |
| 00:19 UTC 1 May | `cron.alter_job(53, false)` — IG cron rolled back | DML |
| 00:19 UTC 1 May | `UPDATE c.client_publish_profile SET publish_enabled=false ... WHERE client_id=NDIS-Yarns` | DML (single row) |

**No DDL applied tonight. No bulk UPDATEs. ChatGPT cross-check #2 stopped the proposed bulk-quarantine of legacy FB drafts.**

### Lesson #46 vindication

F-PUB-004 (auto-approver starvation) is the most direct demonstration of Lesson #46 to date. The auto-approver-sweep cron returned 200 OK on every run (144/144 in 24h, last run 00:30 UTC) while the actual business outcome was zero approvals across IG and LinkedIn for 5+ days. Standing checks S8 (cron-level) and S9 (OAuth-level) and S10 (publish-output-level) all reported healthy or near-healthy for the auto-approver platform — but the *approvals* dimension wasn't being monitored. **S11 added tonight** to fill that gap.

This would have been visible in S10 (zero IG publishes in 24h) had it existed a week ago. S10 was added in v2.2 yesterday. So tonight's discovery is consistent with the pattern Lesson #46 names — but it's also evidence that S10 alone is not enough; S11 (fresh approvals) is a stricter upstream check.

### Today's commits — Invegent-content-engine `main`

(Thursday commits per previous reconciliation. Friday early morning UTC additions:)

| Commit | Author | What |
|---|---|---|
| (Supabase) | chat | T07 step 4 attempt — cron re-enabled |
| (Supabase × 2) | chat | T07 step 4 rollback — cron disabled + NDIS-Yarns IG locked |
| (this commit) | chat | sync_state late-evening reconciliation update + action_list v2.3 + 2026-05-01-phase-b-+24h-obs.md run state + 2026-04-30-publishers-operational.md corrigendum (F-PUB-002 update + F-PUB-004 + F-PUB-005) |

**invegent-dashboard — `main`:** none.

### Standing memory rule honoured (entry 11 — 4-way sync)

- ✅ docs/00_sync_state.md — THIS COMMIT (PK-on-phone reconciliation appended)
- ✅ docs/00_action_list.md — at v2.3
- ✅ docs/audit/runs/2026-04-30-publishers-operational.md — corrigendum + F-PUB-004 + F-PUB-005
- ✅ docs/audit/runs/2026-05-01-phase-b-+24h-obs.md — NEW (T01 result captured)
- ✅ docs/06_decisions.md — no new decisions tonight (D185 was reserved yesterday; tonight's evidence reinforces the case)
- ✅ docs/briefs/queue.md — F04 still ready; nothing changed
- ⚠️ invegent-dashboard roadmap page.tsx — still deferred per R07
- ✅ Memory entries — auto-regenerate from chat history; no `memory_user_edits` directives changed

---

## ⛔ DO NOT TOUCH NEXT SESSION (UPDATED FROM PREVIOUS)

(All Thursday-late-evening protections still apply. Friday early-morning additions:)

- **The NDIS-Yarns IG `publish_enabled=false` row state** (T07 step 4 rollback). Do not flip back to `true` until T08 (F-PUB-004 fix) lands AND T05 (Meta dev support outcome) decides recovery.
- **The cron jobid 53 `active=false` state.** Do not re-enable until: (a) T08 patch deployed AND (b) at least one fresh CFW or Invegent IG draft observed reaching `approved` status. Then revisit with `?limit=1` only.
- **The Phase B body-health gate** continues to hold per +21h observation. Final +24h checkpoint at ~03:48 UTC Sat 1 May. T02 exit decision Saturday.

---

## 🟡 NEXT SESSION (Sat 2 May or later)

> **All next-session items are also in `docs/00_action_list.md` v2.3 with priorities and triggers.** Read that file alongside this one for the active backlog view.

### Required (time-bound)

1. **Personal businesses check-in** — per standing rule entry 19 (P0).

2. **Re-check T01 obs at full +24h mark (~03:48 UTC Sat 1 May)** — verify no new alerts in the +21h→+24h window. Default verdict: exit Gate B on schedule.

3. **T02 — Gate B exit decision** — Saturday. Default exit on schedule per T01 result.

4. **T08 — Author auto-approver patch (F-PUB-004 fix)** (P0). Chat authors TypeScript patch. ChatGPT cross-check before deploy per Lesson #45. PK deploys via Supabase EF dashboard.

5. **PK: T06** — reconnect YouTube OAuth via Supabase dashboard (3 clients). Runs in parallel with T08; doesn't block.

6. **PK: T05** — Meta dev support contact, single conversation covering business verification + PP IG block + NDIS-Yarns IG block + App Review status (R08).

### Strategic — ready when bandwidth allows

7. **O-01: Author Platform-Source-of-Truth map** (~30 min chat work) — most enabling OTL piece.

8. **R09: Author reconciliation v2 brief** — after T01 + T02 done.

9. **R01 calibration session** — Sun 3 May or Mon 4 May (T04, after Gate B exit known). 90min hard cap.

### Strict ordering for IG re-enable

T07 step 4 cannot be retried until ALL of:
- T08 (F-PUB-004 patch) deployed
- At least one fresh CFW or Invegent IG draft observed in `approval_status='approved'` (proves auto-approver patch works)
- T05 Meta dev support outcome known for PP and NDIS-Yarns
- Cron command updated to `?limit=1` (currently `?limit=2`) — chat can apply this when re-enable time comes

### Backlog (no specific deadline)

See `docs/00_action_list.md` v2.3 📌 Backlog and 🏗 Operational Truth Layer sections for the full lists with triggers.

---

## D182 sunset review reminder

No D182 brief work tonight (PK on phone). System still at 7 briefs validated across 2 brief shapes. F04 (post_render_log) remains queued for CC overnight. Sunset review still 12 May 2026.

---

## STRATEGIC POSTURE

Tonight's session was unplanned: PK was on phone with no laptop, asked what chat could carry solo. The answer turned out to be much bigger than expected.

The session escalated through three phases:

1. **Routine T07 step 4 application** — chat re-enabled IG cron per yesterday's plan. Quick mobile-friendly action.
2. **Surprise discovery** — NDIS-Yarns IG also flagged. Cron rolled back. T07 step 4 rollback noted as correctly handled.
3. **Deeper investigation triggered by the rollback** — the CFW × 2 failures (`not_approved:needs_review`) led to discovery of F-PUB-004 (auto-approver starvation) — the largest production breakage of the day.

The takeaway: tonight's session is **the most validating evidence yet for Lesson #46**. The auto-approver was returning 200 OK on every cron run while approving zero drafts for 5+ days. This is exactly the failure mode Lesson #46 names. S11 standing check added tonight to fill the specific gap.

The takeaway is also **the most validating evidence yet for D-01 / D185 (red-team review v1 ratification)**. Two ChatGPT cross-checks tonight prevented two wrong-direction actions:
- (1) Earlier today: wrong YT trigger fix migration (averted)
- (2) Tonight: wrong bulk-quarantine of 87 legacy FB drafts (averted)

Neither catch was Phase-C work. Both were real-stakes production. Both prevented harm.

**Tomorrow's priority order is now reordered**: T08 (F-PUB-004 patch) is P0 because no IG re-enable is possible until it lands. T06 (YT OAuth) and T05 (Meta dev support) are P1 and run in parallel.

**The strategic non-time-bound thread** continues to be `structured_red_team_review_v1` (D-01 / D185). Tonight's evidence accumulates further — when R10 (Phase C cutover live pilot) eventually runs and the ratification call happens, the case for adoption will be strong.

---

## CLOSING NOTE FOR NEXT SESSION

Tonight made cron-vs-business-truth visible at a deeper layer than the YT/IG audit yesterday. The publisher audit discovered cron-layer monitoring missed YT broken since 11 Apr and IG queue piling up. Tonight's auto-approver investigation discovered cron-layer monitoring missed approvals starving since 25 Apr. Same pattern, different system, shorter time-to-detection thanks to S10 + S11 being on the radar already.

**Read `docs/00_action_list.md` v2.3 at the start of the next session.** Standing checks now S1-S11. Tomorrow's Today/Next 5 already rebuilt: personal businesses → T08 → T06 → T02 → T05.

The Phase B body-health filter has held through 21+ hours with zero alerts of any kind. T02 Gate B exit decision tomorrow is essentially pre-made (default: exit on schedule).

Beyond that:
- (a) PK actions: T06 OAuth, T05 Meta contact — quick wins, do them first
- (b) Strategic + production: T08 F-PUB-004 patch (chat authors, ChatGPT reviews, PK deploys) — unblocks IG/LinkedIn and is the most consequential change of the week
- (c) Strategic stream: OTL O-01 through O-06 — start with O-01
- (d) Backlog: F08, B-items waiting for triggers

All sorted by priority in `docs/00_action_list.md` v2.3.

---

## END OF FRIDAY 1 MAY EARLY MORNING UTC SESSION

Full reconciliation complete. T07 step 4 attempted+rolled-back. NDIS-Yarns IG locked. T01 ✅. F-PUB-004 + F-PUB-005 captured. Action list at v2.3. T08 P0 for tomorrow. PK ChatGPT cross-checks #1 + #2 both validated. Phase B obs clean. Fresh start ready.
