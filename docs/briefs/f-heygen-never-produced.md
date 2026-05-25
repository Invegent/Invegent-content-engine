# Brief F-HEYGEN-NEVER-PRODUCED — avatar videos have never been produced

**Created:** 2026-05-25 Sydney
**Author:** chat
**Executor:** TBD on PK's Option A/B decision — CC (migration-file authoring + ai-worker EF build); chat (migration apply via Supabase MCP); PK (manual EF deploy, decision authority)
**Status:** ✅ IMPLEMENTED & VALIDATED (2026-05-25) — was: AUTHORED. **PK chose Option A** (avatar IS a YouTube format) and it shipped end-to-end.

> **✅ FINAL OUTCOME (avatar→YouTube closeout, 2026-05-25):** Option A delivered. A1 catalog (`youtube:true` re-added to `video_short_avatar.platform_support`, 2026-05-25 07:23); A2/A3 in **ai-worker v2.13.0** (deployed/live — avatar-format override + `generateVideoScript` avatar branch writing `narration_text`/`render_style`, drafts set `video_status='pending'`); render via **heygen-worker** (now **v2.0.0**, async). Avatar now generates → renders → publishes. Proof drafts: **ba5b34eb** (first render, landscape — later retired) and **40f9fa25** (portrait 720×1280, **published** to YouTube as **sfQvSM2Osus**, unlisted, NDIS-Yarns). Downstream dimension/publisher work: F-HEYGEN-WORKER-LANDSCAPE-DIMENSION / -POLL-BUDGET / -ASYNC-RENDER + F-YT-PUB-AVATAR-EXCLUSION. Full closeout: `docs/operations/avatar-youtube-pipeline-status-2026-05-25.md`.
**Severity:** P2 (no live avatar output; no client-facing breakage — avatar is an unshipped differentiator, not a regression of a working feature)
**Result file:** `docs/briefs/results/f-heygen-never-produced.md` (created on completion)

---

## Verdict

`heygen-worker` has **never had a single draft to render.** It fires every 30 minutes (cron jobid 44) and exits `no_avatar_drafts_pending` on every run, because no `m.post_draft` in the system has ever simultaneously held `recommended_format = 'video_short_avatar'` **and** `video_status = 'pending'` — the only state its SELECT predicate can act on. The avatar format is requested *upstream* (40 slots, including one scheduled for today) but is structurally unreachable *downstream*. This is a pipeline-wiring + config-contradiction failure, not a HeyGen API, token, or credential problem.

This brief does not implement a fix. It documents the finding, states the root causes, and forces the **product decision** that the fix depends on: **is `video_short_avatar` a YouTube format or not?** The current config asserts both inconsistently and cannot be patched coherently until that is decided.

---

## Evidence (read-only audit, 2026-05-25)

All facts below were verified live via Supabase MCP `execute_sql` (read-only) + Invegent GitHub source reads. Queries are reproducible.

**E1 — Avatar is chosen heavily at the slot layer.**
`m.slot` has **40 rows** with `platform='youtube'` AND `format_chosen='video_short_avatar'`, spanning `scheduled_publish_at` 2026-04-27 → 2026-05-25. All 40 are `status='filled'` with a non-null `filled_draft_id`. The slotting layer wants avatar and believes it filled it.

**E2 — Every avatar slot is silently downgraded at draft-fill.**
Joining those 40 slots → their `filled_draft_id` drafts, and to the `m.ai_job` that filled them:

| ai_job `input_payload.format` | ai_job status | draft `recommended_format` | n |
|---|---|---|---|
| video_short_avatar | succeeded | text | 16 |
| video_short_avatar | succeeded | video_short_kinetic | 9 |
| video_short_avatar | succeeded | video_short_kinetic_voice | 7 |
| video_short_avatar | succeeded | video_short_stat_voice | 5 |
| video_short_avatar | succeeded | video_short_stat | 3 |

The ai_job carried `format=video_short_avatar` and **succeeded** in all 40 — yet **zero** drafts kept the avatar format. 100% downgrade.

**E3 — Only two `video_short_avatar` drafts have ever existed, and both are seed rows.**
`post_draft_id` `80d8d2b7…` and `a501aa6a…`: both `platform='youtube'`, client `fb98a472…`, `video_status='generated'` but **`video_url IS NULL`**, `created_at == updated_at` to the microsecond (2026-04-09 01:04:26). These were inserted directly in a "generated" state; never touched by a worker. **Zero avatar videos have ever genuinely rendered.**

**E4 — Config contradiction between the two format tables.**
- `t.platform_format_mix_default`: `video_short_avatar` has `default_share_pct=10.00` on `platform='youtube'`, `is_current=true`. (This is what the slotting layer uses → it puts avatar on YouTube slots.)
- `t."5.3_content_format"`: `video_short_avatar` has `is_buildable=true` but `platform_support = {"facebook": true, "linkedin": true, "instagram": true}` — **no `youtube` key.** (This is what the ai-worker advisor uses to build the candidate palette.)
- The two tables disagree about which platform avatar belongs to. One puts it on YouTube; the other excludes YouTube.

**E5 — ai-worker (`ai-worker-v2.12.0`, repo `supabase/functions/ai-worker/index.ts`) discards the slot's chosen format and re-decides.**
- `fetchFormatContext` uses **opt-in** semantics (the v2.12.0 fix): `const s = JSON.parse(platform_support); if (s[platform] !== true) continue;`. For `platform='youtube'`, avatar's missing key → excluded from the candidate palette entirely. The advisor never sees avatar as an option on YouTube.
- The worker ignores the slot's `slot_meta.format` and runs `callFormatAdvisor` from scratch, then writes `recommended_format = decidedFormat`. The advisor's decision-rules prompt **never mentions avatar at all** — so even on platforms where avatar *is* in the palette (FB/LI/IG), the LLM is near-certain never to choose it.
- `generateVideoScript` only has branches for kinetic and stat formats; it returns `null` for `video_short_avatar`. So no `narration_text`/`video_script` is ever written for avatar.

**E6 — heygen-worker (`heygen-worker-v1.1.0`, repo `supabase/functions/heygen-worker/index.ts`) trigger state is unreachable.**
Its SELECT: `approval_status IN ('approved','published') AND video_status='pending' AND recommended_format='video_short_avatar'`, limit 3. Nothing ever sets an avatar draft to `video_status='pending'` (fill creates skeletons at NULL; ai-worker only sets `video_status` via the kinetic/stat script path). The two seed rows (E3) are `generated`, not `pending`. So the predicate returns zero rows every run → `no_avatar_drafts_pending`.

**E7 — Schedulers are healthy; the gap is upstream of them.**
`cron.job` jobid 33 (`video-worker-every-30min`) and jobid 44 (`heygen-worker-every-30min`) are both `active`, firing every 30 min, last runs `succeeded`. NB: `return_message='1 row'` confirms only that the `net.http_post` was queued, **not** that the EF did work — consistent with heygen-worker running and finding nothing.

**E8 — Downstream avatar infrastructure IS ready (the one piece of good news).**
`c.brand_avatar`: 28 rows, 28 active, across 2 clients. `c.brand_stakeholder`: 14 rows across 2 clients. `lookupAvatar` in heygen-worker resolves `talking_photo_id`/`voice_id` from these. So once routing is fixed, HeyGen can actually render — the capability exists; only the routing is broken.

---

## Root causes (ranked)

1. **Config contradiction (E4) — proximate cause of all 40 failed attempts.** Avatar is mix-allocated to YouTube but platform-excluded from YouTube. The slot layer assigns it; the ai-worker opt-in filter (E5) drops it from the YouTube palette → 100% re-decide to a YouTube-legal format.
2. **ai-worker ignores the slot's chosen format (E5).** Format is re-decided from scratch by an LLM advisor that has no avatar instruction and discards `slot_meta.format`. Even with E4 fixed, this would keep avatar near-impossible to select.
3. **No avatar script-generation path (E5).** `generateVideoScript` has no `video_short_avatar` branch → no `narration_text` → heygen-worker would hard-throw `narration_text missing` even if it received such a draft.
4. **State-machine gap (E6).** Nothing transitions an avatar draft into `video_status='pending'`, the trigger heygen-worker requires.

These compound: even fixing only #1 would not produce a HeyGen video, because #2–#4 each independently block the chain. A real fix is multi-layer.

---

## THE PRODUCT DECISION — Option A vs Option B (PK to choose)

The config contradiction (E4) cannot be patched coherently without first deciding what avatar *is*. The two options are mutually exclusive at the platform level.

### Option A — Avatar IS a YouTube format
**Intent:** make the 40 (and ongoing) YouTube avatar slots actually render HeyGen videos.

Work required (all four layers — anything less leaves the chain broken):
- **A1 (config, D-01 #2 sql_destructive):** add `"youtube": true` to `video_short_avatar.platform_support` in `t."5.3_content_format"`. Resolves the contradiction in favour of YouTube. (Reconcile, don't duplicate — confirm the mix-default 10% youtube share stays.)
- **A2 (ai-worker, D-01 #3 ef_deploy):** for buildable video formats, **honour the slot's chosen format** rather than re-deciding — OR teach `callFormatAdvisor` to respect/keep avatar when the slot requested it. (Honouring the slot is the cleaner change and also fixes root cause #2 generally.)
- **A3 (ai-worker, same deploy):** add a `video_short_avatar` branch to `generateVideoScript` that produces `narration_text` (+ any `render_style`/`stakeholder_role` hints heygen-worker reads from `draft_format.video_script`), and set `video_status='pending'` on avatar drafts so heygen-worker picks them up (root causes #3 + #4).
- **A4 (verify infra):** confirm `ICE_HEYGEN_API_KEY` env secret is set on heygen-worker, and that heygen-worker is actually deployed (E7 caveat). Confirm `c.brand_avatar.render_style` values match what A3 will emit. No mutation — verification only.

**Tradeoffs:** more build (two EF behaviours + a config change + a script branch); introduces real HeyGen API spend + render latency (`POLL_MAX_ATTEMPTS=24 × 5s = 120s` per video) into the YouTube path; depends on A4 holding. Upside: ships the avatar differentiator on the platform that already has 40 queued slots and a ready avatar library (E8).

### Option B — Avatar is NOT a YouTube format
**Intent:** stop the false demand; make config self-consistent; optionally enable avatar where it *is* declared supported.

Work required:
- **B1 (config, D-01 #2 sql_destructive):** remove/zero the `video_short_avatar` row for `platform='youtube'` in `t.platform_format_mix_default` (set `is_current=false` or supersede), and **re-distribute its 10% share** across the remaining YouTube video formats so the mix still sums correctly. This stops new YouTube avatar slots being created. Config now agrees with `5.3_content_format` (avatar = FB/LI/IG only).
- **B2 (no EF change required for the core fix):** with avatar removed from the YouTube mix, the ai-worker already routes YouTube to legal formats — the silent-downgrade *symptom* disappears because the false demand is gone. The 40 historical slots already filled as text/kinetic stay as-is (their windows passed; no rework needed unless PK wants it).
- **B3 (OPTIONAL — enable avatar on FB/IG/LI, D-01 #3 ef_deploy if taken):** if PK wants avatar to actually ship somewhere, the same A2/A3 ai-worker work (honour slot format + avatar script branch + `video_status='pending'`) is needed, scoped to FB/LI/IG. Without B3, Option B means **avatar never produces anywhere** — it just stops the system *pretending* to attempt it on YouTube. That is a legitimate "park the feature cleanly" outcome; it must be a conscious choice, not a default.

**Tradeoffs:** smallest fix if B3 is declined (one config migration, no EF deploy, contradiction resolved, no more wasted avatar slots). But avatar remains an unshipped capability despite a ready 28-avatar library (E8). B3 brings most of Option A's build back, just on different platforms.

### Decision matrix

| | Avatar produces on YouTube? | Avatar produces on FB/IG/LI? | Config consistent? | EF deploy needed? |
|---|---|---|---|---|
| **A** | ✅ (after A1–A4) | unchanged (still excluded by advisor unless A2 generalises) | ✅ | ✅ |
| **B (no B3)** | ❌ (removed) | ❌ (still never chosen) | ✅ | ❌ |
| **B + B3** | ❌ (removed) | ✅ (after B3) | ✅ | ✅ |

### Recommendation (PK's call to confirm)
If avatar is a genuine product priority, **Option A** is the stronger play: the demand already exists (40 YouTube slots), the avatar library is populated, and YouTube Shorts is the format-native home for a talking-head short. If avatar is not a near-term priority, take **Option B without B3** as the clean, one-migration park — it removes the silent waste and the config lie immediately, and A2/A3/B3 can be revisited later. The worst outcome is leaving it as-is: the system keeps allocating ~10% of YouTube slots to a format it structurally cannot produce, every cycle, indefinitely.

---

## Scope

**In scope:** the config reconciliation (A1 or B1) and, conditionally, the ai-worker behaviour changes (A2/A3, or B3). Verification of HeyGen env + deploy state (A4).

**Out of scope (all options):** changing the publisher EFs, cron schedules, the slotting/materialise functions' core logic, re-working the 40 historical mis-filled drafts (unless PK explicitly requests), Instagram re-enablement, any `friction.*` write, cc-0015 / Q-005 / Stage E. No mutation of the two seed avatar drafts (E3) without separate direction.

## Allowed actions (authoring phase — this brief)
- Read-only SQL already run (evidence above).
- This brief file commit/push (doc-only — done).

## Forbidden actions (until PK decision + D-01 chain + approval phrase)
- Do **not** apply any migration, deploy any EF, invoke any worker, or mutate any row.
- Do **not** change any cron job.
- Do **not** alter `t.platform_format_mix_default` or `t."5.3_content_format"` until A-vs-B is chosen and the D-01 gate is cleared.
- Honour all active hold-state in `docs/00_sync_state.md`.

## D-01 requirements (per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001)

- **D-01 #1 — `plan_review`:** this brief / the chosen option's coordinated steps. Fire once PK selects A or B.
- **D-01 #2 — `sql_destructive`:** the config migration (A1 add youtube support to `5.3_content_format`, **or** B1 supersede the youtube avatar mix row + re-distribute share). DDL/DML on `t.*` → `apply_migration` only (never `execute_sql`, never `supabase db push`). Run P1–P5 pre-flight (Lesson #61); if any DDL touches `k.schema_registry`-registered tables, run the L33–L35 event-trigger pre-flight survey. Fired at execution time + explicit PK approval phrase.
- **D-01 #3 — `ef_deploy`:** the ai-worker deploy (Option A's A2/A3, or Option B's B3). PK deploys manually from `C:\Users\parve\Invegent-content-engine` (Windows MCP times out on `functions deploy`). Fired at execution time + explicit PK approval phrase.
- Explicit PK approval phrase required before **each** production mutation. Hard-stop discipline on every step.

## Validation plan (per option, at execution time — read-only first)

**Shared pre-snapshot:** current count of YouTube slots with `format_chosen='video_short_avatar'`; current `recommended_format` distribution of their filled drafts; `heygen-worker` GET version probe; confirm `ICE_HEYGEN_API_KEY` presence via CLI.

**Option A post-checks:** (1) `5.3_content_format` avatar row shows `youtube:true`; (2) a controlled `m.fill_pending_slots(n)` in review yields an avatar slot whose draft keeps `recommended_format='video_short_avatar'` with a non-empty `narration_text` and `video_status='pending'`; (3) one supervised heygen-worker invoke renders a real video → `video_url` populated, `video_status='generated'`, file in `post-videos` storage; (4) regression — non-avatar YouTube formats still fill normally.

**Option B post-checks:** (1) no current YouTube avatar mix row (`is_current=true`); (2) the YouTube mix shares still sum correctly; (3) over ≥2 fill cycles, **zero** new slots get `format_chosen='video_short_avatar'` on YouTube; (4) if B3 taken, the Option A checks #2–#4 scoped to FB/LI/IG.

## Success criteria
- Config is internally consistent: the platform set for avatar in `t.platform_format_mix_default` matches `t."5.3_content_format".platform_support`.
- **Option A:** at least one HeyGen video renders end-to-end (slot → avatar draft → `pending` → heygen-worker → stored `video_url`), and the YouTube avatar path no longer silently downgrades.
- **Option B (no B3):** no new YouTube avatar slots are created; no silent-downgrade waste; avatar is cleanly parked with the decision recorded.
- **Option B + B3:** avatar renders end-to-end on FB/LI/IG.
- No regression to any other format or platform's publishing.

## Stop condition
Brief authored + pushed. **Do not implement.** Next step is PK's A-vs-B decision, then the D-01 chain drives execution in a separate supervised session.

---

## Honest limitations / not verified
- **`ICE_HEYGEN_API_KEY` presence not confirmed** — secret plaintext is not readable via MCP; needs a CLI `supabase secrets list` check (hash-only) or a heygen-worker probe. Required before any Option A/B3 render claim.
- **heygen-worker deploy state not confirmed** — cron jobid 44 returns HTTP-queue success only (E7); the v1.1.0 source is in repo but a live GET version probe was not run this session.
- **FB/LI/IG avatar path not exercised** — avatar IS in those platforms' `platform_support`, but the advisor prompt still never mentions avatar, so it is unverified whether avatar is *ever* chosen there in practice. (Consistent with E3: zero non-seed avatar drafts on any platform.)
- **The 40 historical mis-filled drafts** are left as-is in this brief; reworking them is a separate scoped decision.
- **Mix-share re-distribution maths (Option B1)** must be computed against the live YouTube mix at execution time, not assumed.
