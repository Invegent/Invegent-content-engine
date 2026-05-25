# Avatar → YouTube pipeline — operational status (2026-05-25)

**Status: ✅ FULLY OPERATIONAL.** The HeyGen talking-avatar pipeline now generates, renders (portrait 9:16), and publishes to YouTube end-to-end. First avatar video published this date.

> Scope of this doc: a single-page closeout of the avatar→YouTube program (ai-worker v2.13.0; heygen-worker v1.2.0 → v1.3.0 → v2.0.0; youtube-publisher v1.7.0; briefs F-HEYGEN-NEVER-PRODUCED, F-HEYGEN-WORKER-LANDSCAPE-DIMENSION, F-HEYGEN-WORKER-POLL-BUDGET, F-HEYGEN-WORKER-ASYNC-RENDER, F-YT-PUB-AVATAR-EXCLUSION). Project `mbkmaxqhsohbtwsqolns`.

---

## 1. Architecture flow (live)

```
slot (platform=youtube, format_chosen=video_short_avatar)
  → m.fill_pending_slots  → skeleton post_draft + ai_job
  → ai-worker v2.13.0
        • A2: honour the slot's avatar format (override the advisor, which never picks avatar)
        • A3: generateVideoScript avatar branch → narration_text + render_style='realistic'
        • sets video_status='pending'
  → heygen-worker v2.0.0  (cron jobid 44, */30 — async two-phase)
        • Phase A (submit): submit HeyGen job (720×1280 portrait) → persist heygen_video_id
                            + heygen_submitted_at, set video_status='rendering', return fast
        • Phase B (poll, next tick): one HeyGen status check →
              completed → download MP4 → store to post-videos → video_url + video_status='generated'
              failed    → video_status='failed' + raw HeyGen error JSON
              processing→ leave 'rendering' (stale >30min → failed)
  → youtube-publisher v1.7.0  (cron jobid 34, :15/:45 — direct read)
        • predicate: video_status='generated' AND approval_status='approved'
                     AND draft_format->youtube_video_id IS NULL AND video_url NOT NULL
                     AND recommended_format IN (kinetic, kinetic_voice, stat, stat_voice, AVATAR)
        • download MP4 → multipart upload (video/mp4) → privacyStatus='unlisted'
        • set youtube_video_id/url + video_status='published' + m.post_publish audit row
```

**Validation artefacts (2026-05-25):**
- Draft **`40f9fa25-cd00-45fb-b642-f65c8446e8b5`** (NDIS-Yarns): `pending → rendering → generated → published`. HeyGen `heygen_video_id=9d05ae6bd0dd447685e2eb3a5e6f28b8` (identical across submit/poll — **no duplicate render**). Stored MP4 `post-videos/ndis-yarns/40f9fa25…_avatar_realistic.mp4`, confirmed **720×1280 portrait**, 30s, 25fps.
- **YouTube `sfQvSM2Osus`** — https://www.youtube.com/watch?v=sfQvSM2Osus (unlisted). `m.post_publish` row: platform=youtube, status=published, attempt_no=1, privacy=unlisted, 7.8 MB.
- **`ba5b34eb-abb3-4b39-ba68-23c35387e71a`** — the first (landscape 16:9) avatar render; **retired to `archived_stale`** (row + MP4 preserved as proof; non-publishable) so only true-Short portrait avatars publish.
- Seed avatar drafts `80d8d2b7`, `a501aa6a` — remain blocked (null `video_url`).

---

## 2. Deployed versions (live = repo, verified 2026-05-25)

| Function | Version | EF deploy | Repo commit | Notes |
|---|---|---|---|---|
| **ai-worker** | `v2.13.0` | live (GET-probe confirmed) | `5005b2b` | F-HEYGEN Option A A2/A3 (avatar override + narration branch). **Supersedes the stale "deployed v2.12.0" note** in the v3.06 cc-0019 record — see §6. |
| **heygen-worker** | `v2.0.0` | EF version 33 | `aa07252` | Async two-phase. Carries the 720×1280 dimension. Supersedes v1.1.0 (sync 1280×720), v1.2.0 (sync portrait), v1.3.0 (sync 240s poll). |
| **youtube-publisher** | `v1.7.0` | EF version 47 | `21e372d` | Allow-list includes `video_short_avatar`. Uploads unlisted. |

All three: repo↔deploy **in sync**; `verify_jwt=false` preserved (custom API-key/header auth). Do **not** redeploy any from an older checkout.

**Intermediate (superseded) heygen-worker versions, for the record:** v1.2.0 `2df4036` (EF v31, dimension), v1.3.0 `9f11d2b` (EF v32, poll budget). Both replaced by v2.0.0.

---

## 3. What problems were solved

| Brief | Problem | Fix | Status |
|---|---|---|---|
| **F-HEYGEN-NEVER-PRODUCED** | Avatar requested at the slot layer (40 YouTube slots) but structurally unreachable: catalog↔mix contradiction, ai-worker discarded the slot format + had no avatar script branch, nothing set `video_status='pending'`. 0 avatar videos ever rendered. | **Option A** — A1 catalog (`youtube:true`), A2 honour slot format, A3 avatar narration branch + `pending` (ai-worker v2.13.0). | ✅ IMPLEMENTED & VALIDATED |
| **F-HEYGEN-WORKER-LANDSCAPE-DIMENSION** | heygen-worker hardcoded `1280×720` landscape → not a valid YouTube Short. | Dimension → `720×1280` (portrait 9:16). | ✅ IMPLEMENTED & VALIDATED (live in v2.0.0) |
| **F-HEYGEN-WORKER-POLL-BUDGET** | 120s in-request poll ceiling false-failed valid renders. | Raised to 240s (v1.3.0) — then found unreachable (EF ~150s limit) → **superseded** by async. | ⚠️ IMPLEMENTED → SUPERSEDED |
| **F-HEYGEN-WORKER-ASYNC-RENDER** | Synchronous submit→poll→store is killed by the Supabase EF ~150s request idle-timeout; HeyGen renders for production-length narration exceed it (PK confirmed the video still rendered server-side). | **v2.0.0** async two-phase (submit / poll across cron ticks); no single invocation waits for the full render. State machine + guards; raw error JSON; stale max-age. | ✅ IMPLEMENTED & VALIDATED |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher's hardcoded format allow-list excluded `video_short_avatar` (the sole blocker; every other predicate passed). | **v1.7.0** adds avatar to the allow-list, **dimension-first** (Option B): portrait render shipped before enablement so the first publish is a true Short. | ✅ IMPLEMENTED & VALIDATED |

**Governance:** every production deploy went through an `ef_deploy` D-01 (`a62a5ff6` v1.2.0, `9a0813b7` v1.3.0, `24dcf55b` v2.0.0, `c76aea38` publisher v1.7.0) plus a `plan_review` (`6fb98c05` async). All returned `escalate_explicit_flag`, all classified **GENERIC-NON-BLOCKING per L46** (each pushback restated already-disclosed `known_weak_evidence`), all closed in `m.chatgpt_review` after the explicit PK approval phrase. No schema migration was required (the async change rides on the unconstrained `video_status` text column + `draft_format` JSONB).

---

## 4. Remaining carries (all NON-BLOCKING — polish/ops, not defects)

1. **Unlisted privacy.** youtube-publisher hardcodes `privacyStatus='unlisted'` for *all* platforms. Making avatar (or any) Shorts public is a separate, deliberate publisher decision — not in scope here.
2. **Mild letterboxing.** The portrait render shows modest brand-colour bands top/bottom because the source `c.brand_avatar` talking photo was captured landscape (HeyGen centres a landscape-origin avatar in a portrait canvas; there is no `fit` parameter). The result is a usable Short. Full-bleed would require **portrait-native avatars** in `c.brand_avatar` — a future enhancement.
3. **Possible portrait-native avatars later.** Re-capture/re-register NDIS-Yarns (and other client) avatars in portrait so they fill the 9:16 frame edge-to-edge.
4. **Monitoring / tuning.** First real async renders give HeyGen's true render-time profile. Tunables (not yet load-tested): `STALE_RENDER_MAX_MS` (30 min), the `*/30` cron cadence (detection latency up to ~30 min — fine for a scheduled pipeline; tighten to `*/10` only if faster detection is wanted), `MAX_SUBMITS`/`MAX_POLLS` (3/5). Watch `m.post_publish` rows land and that no avatar draft sticks in `rendering`.

---

## 5. Lessons learned

- **Synchronous Edge-Function polling is an anti-pattern for long external jobs.** A Supabase EF has a ~150s request idle-timeout; any submit→poll-until-done→download flow that can exceed it will be 504-killed mid-poll, and (worse) can leave a draft stuck `pending` so the cron re-submits → duplicate external renders + wasted spend. The durable pattern is **stateful + async**: submit and persist the external job id immediately, then poll across subsequent cron ticks. (Raising the in-request poll budget — what F-HEYGEN-WORKER-POLL-BUDGET tried — cannot beat the platform request limit; it was the wrong axis.)
- **HeyGen API credits are separate from the Creator-plan subscription.** A render can fail fast right after submit with an *opaque* error if the **API balance** is exhausted even while the Creator plan is active. Top up API balance specifically; surface the **raw** provider error (the old worker logged `[object Object]` — v2.0.0 now `JSON.stringify`s it).
- **Portrait-first is mandatory for YouTube Shorts.** YouTube classifies Shorts by vertical/square aspect (+≤3min) — the `#Shorts` hashtag is **not** sufficient. A 16:9 video tagged `#Shorts` uploads fine but is a regular video. Render at `720×1280` (or `1080×1920` on a higher HeyGen tier) *before* enabling publishing, or you ship mislabeled landscape "Shorts".
- **Slot/advisor/catalog mismatch was the root cause of "avatar never produced."** Three layers disagreed: the slot/mix layer *allocated* avatar to YouTube, the `5.3_content_format` catalog *excluded* YouTube for avatar, and ai-worker re-decided the format from scratch (the LLM advisor never picks avatar) with no avatar script path. Demand existed upstream but was structurally unreachable downstream. The fix had to span all layers (catalog + advisor-override + script branch + state transition), not any single one.
- **(Process) Verify deployed-vs-repo and live state before asserting versions/status.** This closeout caught that the index files still said "deployed ai-worker v2.12.0" while live is v2.13.0 — see §6.

---

## 6. Contradiction flagged (for the next index sync)

The `00_action_list.md` / `00_sync_state.md` v3.06 cc-0019 records state **"deployed ai-worker v2.12.0"** and assess cc-0019 **Unit B** ("ai-worker publish-eligibility preflight") as *absent in v2.12.0*. **Live ai-worker is now v2.13.0** (GET-probe + repo `5005b2b`, F-HEYGEN Option A). That "v2.12.0" line is therefore **stale**. This does not change cc-0019's conclusion by itself (the v2.13.0 avatar work is unrelated to the eligibility preflight), but **cc-0019 Unit B's "not implemented" finding should be re-verified against v2.13.0** if/when cc-0019 is revisited. Flagged here; the carried-forward note in `00_sync_state.md` records the corrected live version.

---

*Authored 2026-05-25 (Sydney). Docs-only closeout — no deploys, no DB mutation, no renders performed in this update. Live versions GET-probe-verified.*
