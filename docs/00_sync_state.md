# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 mid-day AEST — A11b CFW full lock + Invegent v0.1 lock + chk_persona_type widened + 2 briefs committed
> Written by: PK + Claude session sync

---

## 🟢 24 APR MID-DAY UPDATE — A11b CLOSED (CFW FULL + INVEGENT v0.1)

### In one paragraph

A11b (CFW + Invegent content prompts) functionally closed this session. For **CFW**: `c.client_brand_profile` all 8 empty fields filled + `brand_identity_prompt` rewritten (2,671 chars, aligned with system_prompt); `c.client_ai_profile.platform_rules` populated with structured JSONB for FB + IG + LI (word counts, emoji allowed/forbidden, hashtag allowed/forbidden, voice rule); `c.client_ai_profile.system_prompt` refactored from 2,119 → 2,860 chars (cleaner separation of concerns — points to brand_identity_prompt for voice, platform_rules for specifics); 6 `c.content_type_prompt` rows created (`rewrite_v1` + `synth_bundle_v1` × FB/IG/LI). For **Invegent**: `c.client_brand_profile` INSERTED (row didn't exist) with v0.1 dual-stream framing (Stream A external + Stream B internal work-journal); `system_prompt` refactored 1,866 → 4,370 chars; `platform_rules` populated for LinkedIn + YouTube only (no FB/IG/X); `persona_type = 'hybrid_operator_and_avatar'` after widening `chk_persona_type` constraint to support mixed PK-recorded + avatar-delivered content. Three briefs committed: CFW profile (`2029383`), Invegent v0.1 profile (`53fb86c`), Invegent work-journal source-type scope (`f1b4c36`).

### What's locked in DB for CFW

| Table | Field | Before | After |
|---|---|---|---|
| `c.client_brand_profile` | presenter_identity | corporate 201 chars | practice-voice 247 chars |
| `c.client_brand_profile` | core_expertise | empty | 556 chars (paed-heavy + adult OT + service modes) |
| `c.client_brand_profile` | audience_description | empty | 863 chars, platform-differentiated |
| `c.client_brand_profile` | brand_voice_keywords | 5 items | 9 items |
| `c.client_brand_profile` | brand_values | null | 347 chars |
| `c.client_brand_profile` | brand_never_do | null | **10 items** |
| `c.client_brand_profile` | compliance_context | null | 794 chars (AHPRA + NDIS) |
| `c.client_brand_profile` | disclaimer_template | null | 220 chars |
| `c.client_brand_profile` | brand_identity_prompt | 1,413 chars (conflicted with system_prompt) | 2,671 chars (aligned) |
| `c.client_brand_profile` | model / temp / tokens | null / null / null | claude-sonnet-4-6 / 0.70 / 900 |
| `c.client_ai_profile` | platform_rules | null | JSONB: facebook + instagram + linkedin + global |
| `c.client_ai_profile` | system_prompt | 2,119 chars duplicated brand content | 2,860 chars cleaner separation |
| `c.content_type_prompt` | rows for CFW | 0 | **6** (rewrite_v1 + synth_bundle_v1 × FB/IG/LI) |

**CFW platform rules summary:**
- FB: word count 150-280, emoji max 1, hashtag 2-4
- IG: word count 100-220, emoji max 3, hashtag 5-10
- LinkedIn: word count 150-400, emoji 0, hashtag 3-5
- Global voice rule: practice voice + "our therapist" second person, never first-person I, never named

**CFW deferred (can add later):** promo_v1 prompts × 3 platforms, YouTube prompts × 3 job_types, avatar configuration.

### What's locked in DB for Invegent

| Table | Field | Before | After |
|---|---|---|---|
| `c.client_brand_profile` | entire row | **didn't exist** | **created** (v0.1) |
| `c.client_brand_profile` | brand_identity_prompt | n/a | 4,206 chars with dual-stream framing |
| `c.client_brand_profile` | brand_never_do | n/a | 10 items |
| `c.client_brand_profile` | model / temp / tokens | n/a | claude-sonnet-4-6 / 0.75 / 1100 |
| `c.client_brand_profile` | persona_type | n/a | `hybrid_operator_and_avatar` (constraint widened — see below) |
| `c.client_ai_profile` | platform_rules | null | JSONB: linkedin + youtube + global; FB/IG/X explicitly marked `not_configured_platforms` |
| `c.client_ai_profile` | system_prompt | 1,866 chars with positioning contradiction | 4,370 chars with dual-stream framing |

**Invegent positioning (v0.1):** holding brand for PK's AI-assisted builds across NDIS / property / accounting; ICE is first product; pre-product-clarity is part of the frame, not hidden.
**Voice:** first-person PK, builder-in-public, honest about mistakes as brand positioning, peer-level register.
**Platforms:** LinkedIn primary (word count 200-500, 0 emoji, hashtags 3-6), YouTube secondary (title 5-12 words, description 80-200, narration 60-150; emoji max 2 in description, hashtags 5-8 in description, avatar-aware). FB / IG / X explicitly deferred.

**Invegent deferred (explicit v0.1 scope):** all 6 `c.content_type_prompt` rows (no content flowing yet); `c.client_source`; `c.client_digest_policy`; `c.client_schedule`; `c.client_channel` for LinkedIn + YouTube; Stream B source type implementation (scoped in separate brief).

### Schema change — chk_persona_type widened

Added `hybrid_operator_and_avatar` and `hybrid_operator_only` to the allowed values on `c.client_brand_profile.persona_type`. Before: 4 values (custom_avatar, stock_avatar, cartoon, voiceover_only). After: 6 values. Applied via `apply_migration` as `widen_chk_persona_type_add_hybrid_values_20260424`. CFW row unchanged (still `voiceover_only`). Invegent updated to `hybrid_operator_and_avatar` as intended.

### Decisions made this session (noted for future D-entry batching)

- **Dual-stream content model for Invegent** — Stream A (external signals, existing ICE plumbing) + Stream B (internal work journal, new source type required). Documented in `docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md`. Worth a formal D-entry at next session close if PK wants cross-referencing.
- **Invegent publishing deliberately deferred** — brand profile is forward-compatible but no feeds, schedule, or content_type_prompt rows. Gate checklist documented for when publishing is wanted.
- **persona_type constraint widened** — small DDL adjustment, not a strategic decision; noted in migration comments only.

### New backlog items added

- **Avatar configuration for Invegent** — HeyGen avatar creation, consent signing, voice cloning. Not urgent; prompts handle absence gracefully. Will need `c.brand_avatar` + `c.brand_stakeholder` rows when actioned.
- **Stream B source type implementation** — `source_type_code='git_work_journal'` + ingest adapters + scoring profile. Scope-only brief at `docs/briefs/2026-04-24-invegent-work-journal-source-type.md`. ~9-11 hours effort estimate. Priority LOW-MEDIUM. Not blocking CFW/NDIS Yarns/Property Pulse.
- **Invegent publishing activation checklist** — 8 steps documented in v0.1 brief. ~2-3 hours of config work when PK decides to publish.
- **v0.2 positioning review for Invegent** — v0.1 is deliberately loose on product positioning. Reassess in 2-3 months with accumulated learnings.

### What's NOT closed from the morning watch list

- **Dashboard roadmap sync** — still pending. Today's additional closures (CFW/Invegent profiles) push more behind. Small catch-up job whenever convenient.
- **2 CFW IG drafts in needs_review** — still sitting (`2d8204ac...` and `fdb1ff8a...`). Paused-cron isolation still holds. Decision deferred.
- **CFW `c.client_digest_policy` row missing** — still missing. Not blocking CFW publishing but makes `run_type` report `'daily'` instead of `'hourly'`.

### 24 Apr mid-day commits (beyond morning)

- `2029383` — docs(briefs): CFW brand profile + platform_rules lock — 24 Apr A11b session
- `53fb86c` — docs(briefs): Invegent brand profile v0.1 + platform_rules lock — 24 Apr A11b session
- `f1b4c36` — docs(briefs): scope Invegent work-journal source type (Stream B) — follow-up
- Migration `cfw_lock_brand_profile_and_platform_rules_20260424` (DB-only)
- Migration `cfw_align_system_prompt_with_brand_and_platform_rules_20260424` (DB-only)
- Migration `cfw_seed_content_type_prompts_rewrite_and_synth_20260424` (DB-only)
- Migration `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2` (DB-only)
- Migration `widen_chk_persona_type_add_hybrid_values_20260424` (DB-only)
- THIS COMMIT — docs(sync_state): 24 Apr mid-day A11b close + Invegent v0.1

### Next item options for the rest of 24 Apr afternoon

1. **Dashboard roadmap sync** — overdue, now even more overdue; 20-30 min; clean content update
2. **Cron failure-rate monitoring design** — HIGH priority per 22 Apr board; spec-only today; 30-60 min
3. **A21 — Trigger ON CONFLICT audit** — read-only audit using M11 as template; 60-90 min
4. **CFW drafting end-to-end verification** — natural wait, observe first fresh draft with new prompts
5. **Close the session** — today has been substantial; end-of-day is also fine

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

### In one paragraph

Three housekeeping items closed at session start. (1) **Orphan branch sweep** across 3 repos — 8 pre-existing stale branches from 21-22 Apr squash-merged work, zero new orphans overnight, all safe to delete via GitHub UI when convenient. (2) **M8 Gate 4 regression check — PASSED** — zero duplicate canonicals across digest_runs for same client since 22 Apr 00:43 UTC merge; 24h+ of production data confirms D164 7-day NOT EXISTS guard is holding. (3) **CFW overnight digest_items anomaly investigated** — turned out to be correct behaviour, but uncovered that **yesterday's "CFW never wired into the pipeline" side-finding was wrong.** Reality: CFW has 26 `c.client_source` rows (2 enabled), 2 `c.client_content_scope` rows, runs hourly in jobid 12 `planner-hourly` loop, and has been producing drafts for weeks (13 drafts dead as `m8_m11_bloat` prove it). The 2 overnight items were the first successful selection since ID004 unstuck content-fetch — fresh canonicals at 11:00 UTC tick became IG drafts by 11:40 UTC. They're sitting in `needs_review` and won't publish (IG cron paused per D165).

### 24 Apr session-start checks

| Check | Result | Evidence |
|---|---|---|
| Orphan branch sweep (3 repos) | ✅ No new orphans | 8 stale branches pre-existing, all squash-merged 21-22 Apr |
| M8 Gate 4 regression | ✅ PASSED | Zero rows across 24h+ of post-deploy digest_runs |
| CFW overnight "anomaly" | ✅ Correct behaviour | Drafts landed legitimately at 11:40 UTC post-ID004 recovery |
| ID004 recovery (phone-checked AM) | ✅ All clients | NDIS 15, Invegent 1, PP 40, CFW 2 overnight |
| External reviewers | ✅ Still paused | 4 rows, `is_active=false` |
| IG publisher cron | ✅ Still paused | jobid 53, `active=false` |
| Router shadow | ✅ Clean | 4 rows status='ok', total_share=100.00 |

### Real CFW provisioning state (corrected — yesterday's claim was wrong)

- `c.client_source` — 26 rows, 2 enabled (`1122d89d-9406-42b7-abdf-9e6f02ccc436` and `7a012356-4eee-48b9-8102-7a38117a74ae`)
- `c.client_content_scope` — 2 rows (vertical 11 primary, vertical 12 secondary)
- `c.client_digest_policy` — **0 rows** ← this is the actual and only gap
- Planner participation — runs every hour in jobid 12 (`planner-hourly`), same loop as NDIS/PP/Invegent
- Consequence of missing policy — `run_type` defaults to `'daily'` in `create_digest_run_for_client()` (naming quirk, NOT a separate cron path)
- Throughput — low because only 2 of 26 sources enabled, not because "not wired"

Backlog item: add `c.client_digest_policy` row for CFW when convenient. Not blocking; CFW produces drafts without it.

### 2 new CFW IG drafts in `needs_review`

Added for awareness:
- `post_draft_id = 2d8204ac-e02c-4693-a6dd-7a4c3e8d09ed` — "Research Study: Early-career OTs transitioning to specialty practice"
- `post_draft_id = fdb1ff8a-d344-4a05-9a33-2771f62e99bd` — "Policy and Advocacy update"

Both `platform='instagram'`, both created 23 Apr 11:40 UTC from seed → ai_job (`instagram/rewrite_v1`, `succeeded`) → draft. IG cron paused → they won't publish. Left alone until router ships (ex-M12) or PK decides to mark dead / reassign platform.

### Calibration note

Yesterday's "CFW never wired" assertion was made from side-finding speed, not structured verification. Correct framing would have been: *"CFW has no `c.client_digest_policy` row and only 2 of 26 sources enabled, so digest throughput is near-zero."* That's defensible. "Never wired" wasn't — and it was in the sync_state for 14+ hours before being caught. Adds weight to the F11-style verification discipline already applied in 23 Apr close.

### 24 Apr commits (morning)

- `3365b87` — docs(sync_state): 24 Apr morning housekeeping — orphan sweep + M8 Gate 4 pass + CFW finding correction

---

## 🟢 23 APR SESSION UPDATE — ID004 RESOLVED

### In one paragraph

9-day silent outage in content-fetch cron resolved. Cron jobid 4 (`content_fetch_every_10min`) queried `vault.decrypted_secrets` with filter `name='INGEST_API_KEY'` (uppercase), but the actual vault entry is `name='ingest_api_key'` (lowercase). Case-sensitive string comparison → NULL subquery → null `x-ingest-key` HTTP header → EF 401. Every cron invocation since ~14 Apr 00:10 UTC failed identically, but `pg_cron.job_run_details.status` kept reporting `succeeded` because it measures `net.http_post` scheduling, not HTTP response. Fix: single `cron.alter_job` changing uppercase to lowercase. Applied 09:30 UTC; all four verification gates passed by 10:01 UTC. Root-cause diagnosis + fix + verification + incident doc + decision entry all landed this session.

**Full incident:** `docs/incidents/2026-04-23-content-fetch-casing-drift.md` (ID004)
**Decision:** D168 in `docs/06_decisions.md` — response-layer sentinel to catch this failure class. Scope defined, implementation deferred.

### Verification gates (all passed)

| Gate | Result | Evidence |
|---|---|---|
| V1 — fresh cron run post-apply | ✅ | jobid 4 status=succeeded at 09:30:00 UTC |
| V2 — bodies actually fetching | ✅ | 3 fresh successes in 15-min window (first since 14 Apr) |
| V3 — backlog trending down | ✅ | 353 → 307 → 272 pending (−81 in ~35 min, ~140 rows/hour drain rate) |
| Downstream — strict-policy client recovery | ✅ | NDIS Yarns 2 new digest_items at 10:00 UTC planner-hourly tick |

### What stays untouched tonight (per PK)

- `instagram-publisher-every-15m` (jobid 53) **remains paused** — M12 still the blocker. Do not resume until M12 verifies.
- All four external reviewers remain paused (no change).
- Cowork tasks unchanged. **Router MVP (R6) remains Fri+ schedule.**
- No re-wiring of anything else this session.

### Side-findings (separate tickets, parked)

- **CFW provisioning gap** — ~~`care-for-welfare-pty-ltd` has no `c.client_source` rows, no `c.client_digest_policy` row, not in planner loop. Never wired into the pipeline.~~ **[CORRECTED 24 Apr — see top section.]** Actual state: 26 source rows (2 enabled), 2 content_scope rows, runs hourly in planner loop; only gap is missing `c.client_digest_policy`. Correction committed 24 Apr morning housekeeping.
- **No sister casing bugs** — scan confirmed all 19 vault-secret references across 7 cron jobs are exact-match. ID004 was isolated to jobid 4.

### Optional belt-and-braces pending

11:00 UTC planner-hourly check for Invegent (zero at 10:00 tick — plausibly scope-specific given only 5 enabled `client_source` rows vs NDIS's 15). One-line footnote to be appended to ID004 incident doc post-11:00. **[Confirmed 24 Apr AM from PK phone check: Invegent produced 1 digest_item overnight — recovery complete.]**

### 23 Apr commits

- `9094d75` — docs(incident): add ID004 content-fetch silent outage
- `7ccf5df` — docs(decisions): add D168 — response-layer sentinel
- `33efcb6` — docs(sync_state): 23 Apr mid-session — ID004 resolved, D168 scoped
- fix(cron): jobid 4 vault secret filter uppercase→lowercase (applied via `cron.alter_job`, not a migration file — live DB state only)

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was a big day — morning housekeeping closed 3 items, mid-day closed A11b for both CFW (full) and Invegent (v0.1). 22 Apr's router-build state (D166, D167) is unchanged and resumes Monday+.

### Today's outcomes in one paragraph (24 Apr end-of-mid-day)

**Morning:** orphan sweep clean, M8 Gate 4 PASSED, CFW "never wired" finding from 23 Apr corrected. **Mid-day:** A11b CFW closed (brand_profile 8 fields filled, brand_identity_prompt rewritten, system_prompt refactored, platform_rules populated, 6 content_type_prompt rows created) + A11b Invegent v0.1 closed (brand_profile created with dual-stream framing, system_prompt refactored 1,866 → 4,370 chars, platform_rules populated for LinkedIn + YouTube only) + `chk_persona_type` constraint widened to support `hybrid_operator_and_avatar` for Invegent's avatar-aware positioning. Three briefs committed. Pipeline state unchanged operationally — all this is prompt-layer work that affects future drafts, not currently-flowing drafts.

### Critical state awareness for next session

1. **A11b functionally CLOSED — 24 Apr mid-day.** M1 sprint item can be marked closed on the board. CFW is ready to generate drafts with the new prompt stack on next `ai-worker` cron run after next CFW digest_item arrives. Invegent has v0.1 profile + platform rules but no content flowing yet — deliberately deferred.

2. **Verification opportunity for next session:** read one fresh CFW draft produced with the new stack (any draft created post-24 Apr 00:36 UTC — the brand_profile migration timestamp). Compare voice, format, and platform-rule adherence to intent. If the draft feels off, tune specific fields.

3. **ID004 closed.** Content-fetch cron is fetching bodies normally.

4. **M8 Gate 4 CLOSED — 24 Apr AM.** Zero duplicate canonicals across digest_runs post-merge.

5. **CFW "never wired" finding CORRECTED — 24 Apr AM.** Real gap is missing `c.client_digest_policy` row (still open — small backlog).

6. **Router work R4/R6 — still Monday+ with fresh head.** Router MVP shadow infrastructure from 22 Apr (D166, D167) is untouched.

7. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED** (`active=false`). Unchanged. Resume only AFTER router integration ships + verifies.

8. **Pipeline is clean.** 0 approved-but-unpublished FB drafts, 0 queue items. Content-fetch healthy (post-ID004). Bundler M8 dedup active. Reviewer layer still paused.

9. **Dev workflow rule: direct-push-to-main by default.** Session start: sweep non-main branches across 3 repos. Confirmed clean 24 Apr AM.

10. **Router MVP shadow infrastructure validation:** `SELECT * FROM t.platform_format_mix_default_check;` (expect 4 rows, all status='ok', total_share=100.00) + `SELECT COUNT(*) FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns'));` (expect 20 rows). See D167.

11. **M12 still superseded** (per D166). Router build track replaces the surgical fix.

12. **2 CFW IG drafts in `needs_review`** (post_draft_ids `2d8204ac...` and `fdb1ff8a...`) — older-prompt-stack drafts, paused-cron isolated. Decision TBD.

13. **Dashboard roadmap sync still pending** — now covering 22 Apr closures (M5/M6/M7/M8/M9/M11/D164/D165/D166/D167) AND 24 Apr A11b closures. Low-risk content job when convenient.

---

## SESSION STARTUP PROTOCOL (UPDATED 22 APR)

1. Read this file (`docs/00_sync_state.md`)
2. **Orphan branch sweep:** query all 3 repos for non-main branches; flag any whose tip is not reachable from main BEFORE starting work
3. Check `c.external_reviewer` — confirm reviewers still paused (`is_active=false` on all four rows)
4. Check IG publisher cron state — confirm `instagram-publisher-every-15m` (jobid 53) still paused, DO NOT resume before router integration verifies
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` — expect 4 rows, status='ok' on all
6. Check ID004 recovery status: confirm `f.canonical_content_body` pending-backlog fully drained; confirm NDIS and Invegent producing digest_items at expected daily rate over last 24h
7. Check file 15 Section G — pick next item from the sprint board
8. Check `m.external_review_queue` for any findings that landed before the pause (most recent 5 rows)
9. Read `docs/06_decisions.md` D156–D168 for accumulated decision trail
10. Query `k.vw_table_summary` before working on any table
11. **NEW 24 Apr:** if a fresh CFW draft has been produced since 24 Apr 00:36 UTC, compare voice/format/platform-rule adherence to intent. Tune specific brand_profile or platform_rules fields if off.

---

## DEV WORKFLOW RULE (ADOPTED 22 APR — D165 context)

**Default: direct-push to main.** Claude Code work ships straight to main. Vercel auto-deploys within ~60s. Matches behaviour before Opus 4.7 adaptive.

**Deviate only when:**
- Multi-repo coordinated change where half-state would break production (e.g. route change requiring an EF that hasn't deployed yet)
- PK explicitly flags the work as risky

**Session-start orphan sweep is non-negotiable.**

---

## TODAY'S FULL RUN (22 APR)

*(22 Apr narrative preserved verbatim from prior sync_state — chronology in UTC, closes M5/M6/M7/M8/M9/M11, privacy policy migration, D166/D167 router pivot. Not re-duplicated here for file length; see prior commits for detail.)*

---

## THE EXTERNAL REVIEWER LAYER — CURRENT STATE (UNCHANGED FROM 21 APR)

| Reviewer | Lens | Model | `is_active` |
|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | false |
| Engineer | Built well? | gpt-4o | false (OpenAI Tier 2 pending) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | false |
| System Auditor | Claim vs reality audit | grok-4-1-fast-reasoning | false |

All still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** — active, external client expansion gated on pre-sales criteria

**Pre-sales gate status:** 9 of 28 Section A items closed, 19 open. Router MVP work is sprint-track, not A-items.

**Today's movement on the gate:**
- A7 (privacy policy update) — ✅ CLOSED 22 Apr morning
- Sprint items closed morning of 22 Apr: M5, M6, M7, M8, M9, M11
- Sprint items closed evening of 22 Apr: D145 (mix defaults portion) via D167
- 24 Apr morning: orphan sweep clean, M8 Gate 4 PASSED, CFW "never wired" finding corrected
- 24 Apr mid-day: **M1 / A11b CLOSED** (CFW full + Invegent v0.1) — the gate item for content-prompt work
- M12 superseded (not closed) by router build per D166

**Operational status:** Pipeline clean. Bundler M8 dedup active. FB queue enqueue M11 fix live. IG publishing paused until router integration. LI / YouTube / WordPress publishing unaffected. Router shadow infrastructure live but unconnected to hot path. **CFW now has full prompt stack locked; Invegent has v0.1 prompt stack locked (publishing deliberately deferred).**

---

## ALL CLIENTS — STATE (UPDATED 24 APR MID-DAY)

| Client | client_id | FB | IG | LI | YT | Schedule rows | Pending drafts | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows (seed) | 0 | 12 content_type_prompt rows | 63 drafts dead as m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows + 6/5 tier violation | 0 | 12 content_type_prompt rows | 44 drafts dead as m8_m11_bloat |
| Care For Welfare | 3eca32aa | ✅ | ⏸ paused | ⚠ mode=null | 🔲 | 21 rows | 2 IG drafts in needs_review (older stack) | **✅ FULL STACK LOCKED 24 Apr: brand_profile + platform_rules + system_prompt + 6 content_type_prompt rows** | 13 drafts dead as m8_m11_bloat; `c.client_digest_policy` missing (backlog) |
| Invegent | 93494a09 | ⏸ not configured | ⏸ not configured | ⚠ mode=null | ⚠ mode=null | 0 rows | 0 | **🟡 v0.1 LOCKED 24 Apr: brand_profile + platform_rules + system_prompt; content_type_prompt deliberately deferred** | Publishing deferred; dual-stream content model; Stream B source type scoped for future |

All 4 FB tokens permanent (`expires_at: 0`).

---

## SPRINT MODE — THE BOARD (24 APR MID-DAY UPDATE)

Source of truth: `docs/15_pre_post_sales_criteria.md` Section G. Board snapshot:

### Quick wins (<1 hour each)

| # | Item | Status |
|---|---|---|
| Q1 | 13 failed ai_jobs SQL cleanup | ✅ CLOSED 21 Apr — D163 |
| Q2 | Discovery pipeline `config.feed_url` | ✅ CLOSED 22 Apr overnight |
| Q3 | A24 → closed in file 15 | ✅ CLOSED 21 Apr morning |
| Q4 | A7 privacy policy update | ✅ CLOSED 22 Apr — invegent.com/privacy-policy |

### Medium (1-3 hours)

| # | Item | Status |
|---|---|---|
| **M1** | **A11b CFW + Invegent content prompts** | **✅ CLOSED 24 Apr mid-day — CFW full stack + Invegent v0.1. Briefs `2029383`, `53fb86c`, `f1b4c36`.** |
| M2 | CFW schedule save bug | ✅ CLOSED 21 Apr |
| M3 | A14 RLS verification | 🟡 Audit complete; 2 HS + (5 MS→0) findings — HS-1/HS-2 OAuth state signing remain |
| M4 | A18 — 7 source-less EFs | 🔲 Not yet picked |
| M5 | `getPublishSchedule` RPC hardening | ✅ CLOSED 22 Apr — PR #3 `737d150` |
| M6 | Portal exec_sql eradication | ✅ CLOSED 22 Apr — PR #1 `9c00b5a` |
| M7 | Dashboard `feeds/create` exec_sql | ✅ CLOSED 22 Apr — PR #5 `eda95ce` |
| M8 | Bundler draft multiplication | ✅ CLOSED 22 Apr — PR #1 content-engine `ffc767d`, D164 — Gate 4 PASSED 24 Apr AM |
| M9 | Client-switch staleness + Schedule platform display | ✅ CLOSED 22 Apr — PR #4 `293f876` |
| M11 | FB-vs-IG publish disparity (8-day silent cron) | ✅ CLOSED 22 Apr — PR #2 content-engine `583cf17` |
| M12 | IG publisher `pd.platform` filter + enqueue NOT EXISTS platform-scoped | 🟡 SUPERSEDED per D166 — router build track replaces this approach |

### Router build track (22 Apr evening per D166 + D167)

| # | Item | Status |
|---|---|---|
| R1 | `t.platform_format_mix_default` + 22 seed rows + validation view | ✅ CLOSED 22 Apr evening — D167 |
| R2 | `c.client_format_mix_override` (empty, ready) | ✅ CLOSED 22 Apr evening — D167 |
| R3 | `m.build_weekly_demand_grid()` SQL function | ✅ CLOSED 22 Apr evening — D167 |
| R4 | D143 classifier — spec on paper (6 content types × rule patterns) | 🔲 Next sprint work — writing exercise, no production risk |
| R5 | Matching layer design (demand row → signal selection) | 🔲 Depends on R4 |
| R6 | `m.seed_and_enqueue_ai_jobs_v1` rewrite to call router | 🔲 HIGH RISK — hot path change, Monday+ fresh head |
| R7 | ai-worker platform-awareness | 🔲 Depends on R6 |
| R8 | Cron changes (consolidate seeding crons or add new ones) | 🔲 Depends on R6 |

### Larger (half-day+) — unchanged since 21 Apr

| # | Item | Status |
|---|---|---|
| L1 | A1 + A5 + A8 — Pilot terms + KPI + AI disclosure | 🔲 PK draft |
| L2 | A3 + A4 — One-page proof doc | 🔲 Needs A4 first |
| L3 | A16 — Clock A dashboard | 🔲 |
| L4 | A17 — Clock C seven items | 🔲 |
| L5 | A20 — Pipeline liveness monitoring | 🔲 D155 fallout; includes `cron.job_run_details` failure-rate watch |
| L6 | A21 — Trigger ON CONFLICT audit | 🔲 M11 is a live example of the class |
| L7 | A22 — ai-worker error surfacing | 🔲 |
| L8 | A23 — Live /debug_token cron | 🔲 D153 |
| L9 | A25 — Stage 2 bank reconciliation | 🔲 |
| L10 | A26 — Review discipline mechanism | 🔲 |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R6** | `seed_and_enqueue_ai_jobs_v1` rewrite (supersedes M12) | IG publisher paused until router integration verifies |
| **Cron failure-rate monitoring** | `system-auditor` or pg_cron sweep watching `cron.job_run_details` failure_rate | 2,258 silent failures over 8 days should never recur undetected |

### Blocked / external

| # | Item | Status |
|---|---|---|
| A2 | Meta App Review | In Review; escalate 27 Apr if no movement; Shrishti 2FA pending |
| A6 | Unit economics (TBC subs) | Invoice check |

### Exec_sql eradication state (unchanged)

M5/M6/M7 closed the highest-severity operator-facing write-path exec_sql sites. 30+ exec_sql sites remain in dashboard alone. `instagram-publisher` EF folds into R6. `facebook-publisher` not yet audited.

---

## WATCH LIST

### Due this session / tomorrow

- ~~M8 Gate 4 regression check~~ ✅ PASSED 24 Apr AM
- **Dashboard roadmap sync** — NOT done in 22 Apr session OR 24 Apr session; today's closures (22 Apr sprint + 24 Apr A11b) accumulating. Low-risk content update in `app/(dashboard)/roadmap/page.tsx`.

### Due week of 22-27 Apr

- **Thu 23 Apr** — PK at office; M8 Gate 4 natural window; A1+A5+A8 drafting opportunity
- **Fri 24 Apr** — **TODAY.** A11b CFW + Invegent content prompts — **✅ CLOSED mid-day**. Remaining afternoon scope: roadmap sync / cron failure-rate monitoring / A21 audit / close-session.
- **Mon 27 Apr** — Meta App Review escalation trigger if no movement
- **Sat 2 May** — original reviewer calibration cycle trigger (defer until reviewers resume)

### Backlog (open, not yet addressed)

**New 24 Apr mid-day:**
- **Avatar configuration for Invegent** — HeyGen avatar creation, consent signing, voice cloning. Prompts handle absence gracefully. Will need `c.brand_avatar` + `c.brand_stakeholder` rows.
- **Stream B source type implementation** — `source_type_code='git_work_journal'` + ingest adapters + scoring profile. Scope-only brief at `docs/briefs/2026-04-24-invegent-work-journal-source-type.md`. ~9-11 hours estimate. Priority LOW-MEDIUM.
- **Invegent publishing activation checklist** — 8 steps documented in v0.1 brief. ~2-3 hours of config work when PK decides to publish.
- **v0.2 positioning review for Invegent** — v0.1 is deliberately loose. Reassess in 2-3 months with accumulated learnings.
- **CFW — consider adding promo_v1 content_type_prompt rows** — currently only rewrite_v1 + synth_bundle_v1 × FB/IG/LI. promo_v1 for operator-brief flow if/when CFW wants it.
- **CFW — YouTube content_type_prompt rows** — if/when CFW expands to YouTube.

**Carried from 24 Apr AM:**
- CFW `c.client_digest_policy` row missing — small provisioning ticket
- 2 CFW IG drafts in needs_review from 24 Apr AM — `2d8204ac...` and `fdb1ff8a...` — decision TBD
- Stale non-main branches — 8 total across 3 repos — cosmetic cleanup via GitHub UI

**Carried from earlier:**
- ID004 sentinel (D168) — cron HTTP response health table + dashboard tile
- Publisher schedule source audit
- `m.post_publish_queue.status` has NO CHECK constraint — D163 continuation
- TPM saturation on concurrent platform rewrites — brief parked
- `docs/archive` 5th-file mystery — 30-sec investigation, not blocking
- Per-commit external-reviewer pollution — before reviewers resume
- Property Pulse Schedule Facebook 6/5 tier violation — save-side validation missing
- 30+ remaining exec_sql sites in dashboard — major cleanup arc
- `facebook-publisher` EF audit — not yet reviewed
- Shrishti 2FA + passkey — Meta admin redundancy

---

## TODAY'S COMMITS (24 APR)

**Invegent-content-engine (main):**

Morning:
- `3365b87` — docs(sync_state): 24 Apr morning housekeeping — orphan sweep clean, M8 Gate 4 passed, CFW "never wired" finding corrected, 2 new CFW IG drafts flagged

Mid-day:
- `2029383` — docs(briefs): CFW brand profile + platform_rules lock — 24 Apr A11b session
- `53fb86c` — docs(briefs): Invegent brand profile v0.1 + platform_rules lock — 24 Apr A11b session
- `f1b4c36` — docs(briefs): scope Invegent work-journal source type (Stream B) — follow-up
- Migration `cfw_lock_brand_profile_and_platform_rules_20260424` (DB-only)
- Migration `cfw_align_system_prompt_with_brand_and_platform_rules_20260424` (DB-only)
- Migration `cfw_seed_content_type_prompts_rewrite_and_synth_20260424` (DB-only)
- Migration `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2` (DB-only)
- Migration `widen_chk_persona_type_add_hybrid_values_20260424` (DB-only)
- THIS COMMIT — docs(sync_state): 24 Apr mid-day A11b close + Invegent v0.1

*(invegent-dashboard / invegent-portal / invegent-web: no 24 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

22 Apr was a long sprint day (6 M-items + A7 + D164 + D165 + workflow reset + D166 + D167). 23 Apr resolved ID004. 24 Apr closed 3 morning items and both halves of A11b mid-day.

**Pipeline state UNCHANGED operationally** from 22 Apr evening close — all 24 Apr work is prompt-layer / documentation / schema constraint work that doesn't touch the live hot path. Router infrastructure is still shadow-only. All publishers unchanged. IG publisher still paused per D165.

The prompt-layer work DOES affect future drafts though — next CFW digest_item that arrives (typically within 1-24 hours) will be drafted with the new CFW stack. That's the first verification signal we'll see. Read the first fresh draft with intent; compare voice, format, platform-rule adherence to spec.

Three things that must happen at each session start (protocol reaffirmed):
1. Session-start orphan sweep
2. Router shadow infrastructure validation
3. Read sync_state in full before starting work

Realistic next working windows:
- 24 Apr afternoon (if continuing): dashboard roadmap sync + cron failure-rate monitoring design (spec-only) + maybe A21 trigger audit
- 25 Apr Saturday: possibly dead day for building; R4 classifier spec is low-risk writing option
- 27 Apr Monday: Meta App Review escalation day if no movement; also good day for R5/R6 router work with fresh head

The M11 finding — 2,258 silent cron failures over 8 days undetected — remains the biggest systemic lesson. "Cron failure-rate monitoring" is still HIGH priority. Not blocking first pilot but would be embarrassing with a paying client's pipeline.

**Calibration reminder:** the CFW "never wired" claim from 23 Apr sat in sync_state for 14+ hours before 24 Apr's digest_item anomaly flagged it. Side-findings get the same verification rigour as main findings.

**Fresh-eyes test for next session:** does the router output still make sense? Look at `SELECT * FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns'));` — should show 20 rows, 4 platforms, shares 5-40%, slot counts 1-2. If that's not what you see, something drifted overnight and needs diagnosis before new work.

**A11b lessons (for future content-prompt work on other clients):**
1. Client source data (like the `ICE_Analysis` folder for CFW) is gold — never skip reading it before drafting. Without those 3,262 pages of clinical notes, the CFW profile would have been generic "NDIS OT practice" instead of specifically paed-heavy + adult-home-mods.
2. Pre-existing prompt fields can contradict each other silently (CFW had `brand_identity_prompt` mandating bullets and hashtags while `system_prompt` forbade them). Always read both before rewriting either.
3. Check constraints can bite mid-migration. `chk_persona_type` only allowed 4 values; the intent required a 5th. Widen the constraint in the same session if the intent justifies it, don't leave a placeholder that'll be forgotten.
4. For brand-new clients (like Invegent's missing `client_brand_profile`), v0.1-with-loose-positioning is better than waiting for perfect clarity. Tight voice + compliance + format rules survive any positioning change.
