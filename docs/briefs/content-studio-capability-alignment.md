# Content Studio Platform/Format Capability Alignment (CCD-ready brief)

**Brief ID:** `content-studio-capability-alignment`
**Status:** BRIEF ONLY — no implementation, no DB/code/deploy. UI-alignment build (dashboard), data-driven from taxonomy + eligibility + proven-capability.
**Builds on:** the T0/T1 operator dashboard brief `33d3d1e7` (this brief supplies the capability matrix that brief's selectors consume).
**Authority impact:** none (docs-only).

---

## 1. Current mismatch summary

The Single Post UI is hardcoded old-world (FB active; LI/IG disabled; YT missing; vague format dropdown) while production has **already proven far more**. Evidence (read-only, 2026-06-13): LinkedIn has published not just text (144) but **image_quote (58), carousel (18), video (10)**; Instagram has published **image_quote (70)** + carousel (1); **website/wordpress is a live publisher** (text 15, image 6, video 3); YouTube has published **five video formats incl. avatar (22)**. The UI is the bottleneck, not the engine. Two earlier-flagged contradictions are now **resolved in data**: the `animated_*` GIF buildability contradiction is gone (clean `is_buildable=true`, no "NOT YET BUILDABLE" text); newsletter/reddit are confirmed **not buildable, no `ice_format_key`, no publisher** — correctly excluded.

## 2. Platform × format capability matrix

Legend: **Build** = `is_buildable` + `platform_support[platform]`; **Pub** = publisher exists; **Proven** = published rows (90d) exist. Source of truth = `t."5.3_content_format"` (is_buildable, platform_support) × `c.client_publish_profile` (eligibility) × `m.post_publish` (proof).

| Platform | Format | Build | Proven (90d) | UI behaviour |
|---|---|---|---|---|
| **Facebook** | text | ✅ | 117 | **Enabled** |
| Facebook | image_quote | ✅ | 117 | **Enabled** |
| Facebook | carousel | ✅ | 15 | **Enabled** |
| Facebook | animated_text_reveal / animated_data | ✅ | 0 | **Enabled — unproven badge** (buildable + supported; no prod yet) |
| Facebook | video_short_kinetic / _stat (+_voice) | ✅ | 18/18/4/2 | **Enabled** |
| Facebook | video_short_avatar | ✅ | 0 (FB) | **Enabled — unproven badge** (proven on YT) |
| **LinkedIn** | text | ✅ | 144 | **Enabled** |
| LinkedIn | image_quote | ✅ | 58 | **Enabled** (was wrongly disabled) |
| LinkedIn | carousel | ✅ | 18 | **Enabled** |
| LinkedIn | video_short_*_voice | ✅ (avatar) / ⚠️ | 10 | **Enabled for proven voice variants; avatar enabled-unproven.** Note: `video_short_kinetic/_stat` have `linkedin:false` in platform_support yet voice variants published on LI — surface only what platform_support permits; the published kinetic/stat_voice rows are the supported set |
| **Instagram** | image_quote | ✅ | 70 | **Enabled** |
| Instagram | carousel | ✅ | 1 | **Enabled** |
| Instagram | text | platform_support=false | n/a | **Hidden** (IG has no text-only; correct) |
| Instagram | video_short_avatar | ✅ | 0 | **Enabled — unproven badge** |
| Instagram | video_short_kinetic/_stat | platform_support=false | 0 | **Hidden** (not IG-supported in taxonomy) |
| **YouTube** | video_short_kinetic/_stat (+_voice) | ✅ | 24/18/9/6 | **Enabled** (video-only platform) |
| YouTube | video_short_avatar | ✅ | 22 | **Enabled** |
| YouTube | text/image/carousel | n/a | n/a | **Hidden** (YT is video-only) |
| **Website** | text / image_quote / video | (wordpress) | 15/6/3 | **Enabled if client has website channel** (NY/PP/CFW/Invegent eligibility per `client_publish_profile`; note website not in the 4-platform profile set above — gate on channel presence) |
| **Newsletter / Reddit** | — | ❌ not buildable, no publisher | 0 | **Hidden** (not in taxonomy as buildable; no publisher) |
| any | video_long_*, short_video(legacy), poll, story, audio, thread, live, article, community_post | ❌ is_buildable=false | 0 | **Hidden / not offered** |

Eligibility overlay (per `client_publish_profile`, active clients): FB+IG+LI active for all four; **YT only NY+PP**; CFW+Invegent have no YT. So YT options appear only for NY/PP. Website/wordpress gate on channel presence.

## 3. Recommended UI behaviour (rules, not a static list)

- **Enabled:** `is_buildable=true` AND `platform_support[platform]=true` AND client platform eligible. Format preference is preference-only; Advisor may override; default "Let AI decide".
- **Enabled + "unproven" badge:** buildable+supported+eligible but zero production proof (animated_*, avatar on FB/IG) — offer, but mark so the operator knows it's a first.
- **Disabled (with reason tooltip):** platform eligible but format `platform_support=false` for it (e.g. kinetic/stat on LI/IG) — show greyed with "not supported on {platform}".
- **Hidden:** `is_buildable=false` formats; platforms the client isn't eligible for; newsletter/reddit.
- **Coming soon (optional):** `is_buildable=false` but `requires_build=true` with a render_engine named (video_long_*, podcast_clip) — may show as future, non-selectable.

## 4. Recommended Single Post changes

Single Post becomes the governed submit form (per the operator-dashboard brief), with **platform multi-select gated by `list_active_clients` eligibility** and **format preference gated by the §2 matrix** (taxonomy-driven, not hardcoded). Remove the FB-only/LI-disabled/IG-disabled hardcoding and the vague 6-item dropdown. YouTube appears for NY/PP with video formats only.

## 5. Recommended Series changes

Series must consume the **same capability source** (§6) so a series targeting a platform offers the same format set Single Post does. Series episodes already get EF-chosen formats; the operator-facing series creation should gate platform/format identically — no separate Series capability logic. (Series multi-platform fan-out and slot-claiming remain their own briefs; this brief only aligns the capability *source*.)

## 6. Shared capability-source recommendation

One capability resolver, used by both Single Post and Series: a read that joins `t."5.3_content_format"` (is_buildable, platform_support, requires_build, render_engine, advisor_description) with the client's eligible platforms (`client_publish_profile` via `list_active_clients`/eligibility) and optionally annotates proven-status from `m.post_publish`. **No hardcoded platform or format arrays anywhere.** Single Post and Series import the same resolver.

## 7. Required read-only APIs/RPCs

The capability data should come via a thin read RPC rather than the UI querying taxonomy directly (keeps `t.*`/`m.*` unexposed). Proposed (the only possible new DB object): `get_studio_capabilities(p_client_id uuid)` → per-platform eligible + per-format `{buildable, supported, proven, reason}`. SECURITY DEFINER read-only; if introduced it carries a one-line D-01 note. Reuses existing `list_active_clients`; no change to `create_creative_intent`/`get_creative_intent_detail`. If PK prefers zero new DB objects, the UI can compose from `list_active_clients` + a static taxonomy snapshot shipped at build — but the RPC is preferred to prevent drift (the whole point of this brief).

## 8. Validation plan

1. NY Single Post: FB/IG/LI/YT all offered; CFW: FB/IG/LI only (no YT) — matches eligibility.
2. LinkedIn shows image_quote/carousel/text **enabled** (proven), not disabled.
3. Instagram shows image_quote/carousel enabled, text **hidden**, kinetic/stat **disabled-with-reason**.
4. YouTube shows only video formats; text/image hidden.
5. animated_* and avatar-on-FB show **enabled + unproven badge**.
6. newsletter/reddit/poll/story never appear.
7. Series offers the identical set for the same platform.
8. No hardcoded list remains (grep: no platform/format string arrays in Studio components).

## 9. D-01 risk notes

UI-only if composed client-side (no D-01). If `get_studio_capabilities` RPC is added, that's one SECURITY DEFINER read function → a single low-risk D-01 (read-only, no DML, no schema change to existing tables). No pipeline/Advisor/compliance/render/publisher change either way. Risk: matrix drift if proven-status is cached — mitigate by computing live in the RPC.

## 10. Explicitly out of scope

T2 rendered-asset QA / OCR / transcript; Option C; Fix 2 (done); register reconciliation (held); the multi-platform series fan-out + slot-claim build (separate); preserve/promo content class; any publisher or render-worker change; enabling formats the taxonomy says are not buildable (no overriding `is_buildable`). This brief aligns *what the UI offers* to *what ICE proves it can do* — it does not expand engine capability.

## 11. What CCD may implement after PK approval

Replace hardcoded platform/format lists in Single Post and Series with the shared capability resolver (§6), driven by taxonomy × eligibility × proven-status (optionally via `get_studio_capabilities`); apply the §3 enabled/disabled/hidden/unproven rules; rename the selector to "Format preference" with preference-only/Advisor-may-override/unavailable-blocked language (Q14). UI-only unless the read RPC is chosen (then one D-01). Nothing before PK approval.
