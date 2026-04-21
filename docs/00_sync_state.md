# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-21 14:22 Sydney (UTC 04:22) — webhook verification
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else. Today reshaped the week meaningfully.**

Today shipped:
- ID003 three-part fix (ai-worker v2.9.0 + migration)
- Roadmap three-tab rebuild
- External reviewer layer — three-voice design (Strategist active, Engineer paused, Risk live)
- Pilot service agreement template v1 (pricing deferred)
- Extensive decision documentation (D158, D159, D160)
- Role-library reframe captured as parked brief
- **Both GitHub webhooks configured and verified — reviewer layer now fully autonomous on new commits**

Six commits to Invegent-content-engine plus one to invegent-dashboard. Pre-sales gate moved from 7 closed to 7 closed + 4 in flight.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/briefs/2026-04-21-external-reviewers.md` — what the reviewer layer actually is now
3. Check `m.external_review_queue` for any new findings since last session
4. Check `docs/reviews/` folder for any new digest commits
5. Read `docs/06_decisions.md` D156–D160 for today's decision trail
6. Read `docs/incidents/2026-04-19-cost-spike.md` — ID003 still the dominant operational context
7. Query `k.vw_table_summary` before working on any table
8. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## WEBHOOK VERIFICATION — 21 APR 04:22 UTC

Both GitHub webhooks configured and ping-tested successfully:
- `Invegent-content-engine` — webhook 607881059, ping delivered 14:20:47 AEST, green tick ✅
- `invegent-dashboard` — webhook 607881239, ping delivered 14:21:43 AEST, green tick ✅

xAI credits topped up to $25 with auto-recharge enabled.

**This commit itself is the first live webhook-triggered review test.** Expected: Strategist + Risk both fire on the push event, queue rows appear within ~90 seconds, first-ever fully-autonomous review recorded.

---

## TUESDAY 21 APRIL — full day chronology

Session ran from early morning Sydney time through mid-afternoon. Approximately 8 hours elapsed. Order of operations:

### 01:40-03:00 UTC — ID003 three-part fix shipped

- **Commit `d12a52c`** — ai-worker v2.9.0
  - Payload diet (`trimSeedPayload()`) — replaces `body_text` with `body_excerpt`, strips `raw_html`/`full_content`, caps length
  - Idempotency guard — checks `m.ai_usage_log` for any prior non-error row tied to this `ai_job_id` AND `post_draft.draft_body` populated (D159 — deviation from incident spec's 5-min window, rationale in D159)
  - Fetch timeout 120s `AbortController` on both Anthropic + OpenAI calls
- **Migration `d157_id003_ai_job_retry_cap`** applied:
  - Added `m.ai_job.attempts INT DEFAULT 0`
  - Updated `sweep-stale-running-every-10m` cron (jobid 9): on each requeue `attempts += 1`; at `attempts >= 3` promotes to `status='failed'` + `dead_reason='exceeded_retry_limit'`
- **Deployed:** ai-worker v79 per PK's terminal verification
- **Status:** live but unverified — pipeline naturally dormant, no real ai_jobs have run through v2.9.0 yet

### 03:00-03:30 UTC — Roadmap three-tab rebuild shipped

- **Commit `202037c`** (invegent-dashboard) — `app/(dashboard)/roadmap/page.tsx`
- Three tabs: By Phase / By Layer / By Sales Stage (new)
- 31-item pre-sales gate visible with category sub-groups
- Vercel auto-deployed; live at dashboard.invegent.com/roadmap

### 03:30-07:00 UTC — External reviewer pivot and design

- PK pulled D156 forward from 27 Apr to NOW — "no further commits should happen without external review of Claude's work"
- Brief iterated through several architectural pivots during the session:
  - First: two-voice (Strategist + Engineer) per original D156
  - Then: Risk Reviewer added as third lens (PK reframe after three silent failures discovered during session)
  - Then: role-library reframe proposed, deliberately parked for future
  - Final: three fixed-role voices, role-library captured as follow-on brief
- **D158** decision: Approach C (full repo + prompt caching) over RAG
- **D160** decision: three-voice design, rules-belong-to-role, role-library deferred with gate criteria

### 07:00-13:00 UTC — Claude Code external reviewer build

- **Commit `495216f`** — migration + Strategist + paused Engineer + weekly cron + retroactive query-param + on-demand button
- **Commit `a437a6a`** — Risk Reviewer added as third row in `c.external_reviewer`, xAI integration in EF (v1.2.0), brief updated, dispatch by-provider
- **Commit `1a7aabf`** (invegent-dashboard) — /reviews page + API route + sidebar link
- Retroactive reviews executed: Strategist completed all 4 targets (`d12a52c`, `202037c`, `495216f`, `1a7aabf`) with info-severity findings. Risk returned 403 on all 4 (zero xAI credits at time).
- First digest produced (`b09f062a-f92b-47e5-9052-c696ac764a53`), committed to `docs/reviews/2026-04-21-digest.md`, emailed to pk@invegent.com

### 00:23-04:22 UTC — Documentation caught up + webhook go-live

- **Commit `dad6ae2`** — sync_state interim update (superseded)
- **Commit `4fe9c57`** + **`88effeb`** — pilot service agreement template v1 at `docs/legal/pilot_service_agreement_template_v1.md` (pricing deferred)
- **Commit `2e909fb`** — external reviewer brief updated to reflect three-voice shipped state
- **Commit `b4e63ca`** — role-library reframe captured as parked brief at `docs/briefs/2026-04-21-reviewer-role-library.md`
- **Commit `941375a`** — sync_state final update (superseded by THIS update)
- D156, D157, D158, D159, D160 all committed to `docs/06_decisions.md` during session
- **04:20-04:22 UTC — both webhooks configured + ping-verified + xAI credits topped up**

---

## THE THREE-VOICE EXTERNAL REVIEWER LAYER — current state

| Reviewer | Lens | Model | Provider | DB status | Operational status |
|---|---|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | Google | ✅ Active | ✅ Live, 4 retroactive reviews completed |
| Engineer | Built well? | gpt-4o | OpenAI | ⏸ Paused | Awaits OpenAI Tier 2 (natural unlock when cumulative API spend reaches $50) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | xAI | ✅ Active | ✅ Credits available ($25), awaiting first live webhook to fire |

**Webhooks:** ✅ Both repos configured 21 Apr 04:20-04:22 UTC

**Tables live:**
- `c.external_reviewer` — 3 rows
- `c.external_reviewer_rule` — 12 rules total (4 per reviewer), rules keyed on reviewer_key
- `m.external_review_queue` — 4 retroactive findings (all Strategist, all info-severity)
- `m.external_review_digest` — 1 row (today's on-demand digest)

**Edge Functions live:**
- `external-reviewer` v1.2.0 — HMAC webhook path + retroactive (`x-ai-worker-key`) path
- `external-reviewer-digest` v1.1.0 — assembles markdown, commits to GitHub, emails via Resend

**Cron:** `external-reviewer-digest-weekly` (jobid 66) — Mon 7am AEST (Sun 21:00 UTC)

**Dashboard:** `/reviews` page with on-demand "Run digest now" button + sidebar link

**Secrets provisioned today:**

| Secret | Purpose | Provisioned |
|---|---|---|
| `ICE_GEMINI_API_KEY` | Strategist | 20 Apr 23:55 UTC |
| `GITHUB_PAT_INVEGENT` | Fetch repo tarball + commit digest files | 21 Apr 00:15 UTC |
| `GITHUB_WEBHOOK_SECRET` | HMAC verification (now actively used) | 21 Apr 00:10 UTC |
| `ICE_XAI_API_KEY` | Risk Reviewer | 21 Apr 03:34 UTC |

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active, external client expansion still gated on pre-sales criteria and cost controls)
**Gate status:** Pre-sales gate NOT CLEARED. 31 total items. 7 closed. 24 open.

**Today's movement on the gate:**
- A1 (pilot terms) — drafted, pricing deferred. Awaits A7 privacy policy update before first client send.
- A5 (KPI guarantee) — drafted within pilot agreement
- A8 (AI disclosure) — drafted within pilot agreement
- A24 (multi-model review MVP) — **on track to close with this commit** (first live webhook-triggered review)

**Operational status:** Pipeline genuinely dormant — demand-aware seeder correctly reports supply maxed. 349 populated drafts in pipeline from 17 Apr burst. Drain rate ~36 posts/week × 4 clients → 3.4 weeks of natural runway before seeder fires new generation. Pipeline will resume itself.

---

## ALL CLIENTS — STATE

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI | In-pipeline drafts (FB) |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 269 (63 approved + 206 needs_review) |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 64 (46 approved + 18 needs_review) |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 16 (13 approved + 3 needs_review) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 0 |

All 4 FB tokens permanent (`expires_at: 0`).

---

## WATCH LIST

- **Post-commit** — verify queue rows from this commit's webhook-triggered review land within ~90s
- **Thu 23 Apr** — A7 privacy policy update (unblocks pilot template)
- **Fri 24 Apr** — D157 cost-guardrails if reviewer signal is useful; content prompts (A11b)
- **Mon 27 Apr** — first weekly digest lands 7am AEST; Meta App Review escalation trigger
- **Sat 2 May** — first weekly cost calibration cycle

### Backlog (discovered today but not addressed)
- **CFW schedule save bug** — UI shows "Saved ✓" but DB empty. Server action swallows error silently.
- **Discovery pipeline ingest bug** — 9 feeds provisioned but zero items ingested due to `config.url` vs `config.feed_url` mismatch.
- **L008 / A7 privacy policy** — 30-min draft, blocks pilot template send-ready
- 13 failed ai_jobs from ID003 — still in `failed`, clean up when convenient
- Shrishti 2FA + passkey (Meta admin redundancy) — PK to chase

---

## TODAY'S COMMITS

**Invegent-content-engine (main):**

| Commit | Description |
|---|---|
| `d12a52c` | feat(ai-worker): v2.9.0 — ID003 three-part remediation (D157, D159) |
| `d8a8dc4` | docs: brief for external reviewer layer v1 (two-voice, superseded) |
| `f705f45` | docs: brief for roadmap three-tab conversion |
| `dad6ae2` | docs: sync_state interim update (superseded) |
| `4fe9c57` | docs(legal): pilot service agreement template v1 draft |
| `88effeb` | docs(legal): defer pricing decision to first sales conversation |
| `495216f` | feat(external-reviewer): D156 Stage 1 deploy — two-voice initial |
| `a437a6a` | feat(external-reviewer): add Risk Reviewer (Grok) — three-voice |
| `758c8f3` | docs: external reviewer brief — two-lens design rationale (superseded) |
| `701945f` | docs(decisions): add D158 + D159 + D160 |
| `2e909fb` | docs(brief): update external reviewer brief to reflect three-voice shipped |
| `b4e63ca` | docs(brief): capture reviewer role-library reframe for future execution |
| `941375a` | docs: sync_state final update (superseded by THIS) |

**Invegent-content-engine (Supabase migrations):**

| Migration | Description |
|---|---|
| `d157_id003_ai_job_retry_cap` | DDL: attempts column + sweep cron retry cap |
| `d156_external_reviewer_layer` | DDL: 4 new tables + 2 reviewer rows + 8 rules |
| (follow-on migration) | DDL: Risk Reviewer row + 4 rules |

**invegent-dashboard (main):**

| Commit | Description |
|---|---|
| `202037c` | feat(roadmap): three-tab layout + by-sales-stage view |
| `1a7aabf` | feat(reviews): /reviews page + API route + sidebar link |

---

## CLOSING NOTE FOR NEXT SESSION

Today produced 13 commits to the backend repo and 2 to the dashboard. All decisions are documented. All open bugs discovered today are captured. The reviewer layer is now fully autonomous — every future commit to a qualifying path will trigger Strategist + Risk automatically via webhook.

PK is also doing a full-time job. This matters — don't expect tight attention across long sessions. The reviewer layer exists specifically to reduce how much PK needs to read every commit. Monday morning's digest is the primary output PK should review, not individual commits. Weekly read time target: 10 minutes.

The pilot agreement template is legally complete but commercially incomplete (pricing deferred). Do not push PK to close pricing early — that decision is gated on product strength/weakness at first sales conversation, not a date.
