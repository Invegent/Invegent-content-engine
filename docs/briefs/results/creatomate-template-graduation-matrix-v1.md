# Creatomate Template Graduation Matrix — v1

> **Type:** Read-only classification report. **No template activation, no registry mutation, no production change was made producing this doc.**
> **Scope:** Every row in `c.creative_provider_template` (27 rows, live `COUNT(*)` confirmed twice — matches PK's expected count). Live DB inventory pulled by `db-rls-auditor` (SELECT-only, via `ice_ro.template_registry_status`, `c.creative_*`, `m.post_render_log`/`post_draft`/`post_publish`). Code-side facts (selector mechanics, worker field contracts, asset-slot/voice-music wiring) pulled by static grep/read of `supabase/migrations/*.sql`, `supabase/functions/{image-worker,video-worker}/*.ts`, `docs/creative-library/*.json`.
> Where DB and code/docs conflict, **both are stated** and the conflict is flagged — no silent reconciliation.

---

## 0. Headline findings (read first)

1. **The one row with the "best" DB status (`production_proven`, real render/draft/publish history) is dead.** Row 17 (`fb9820f8…`, PP's `news_static_centered_scrim_1x1_v1`) shows `status='production_proven'` and 21 succeeded renders / 16 drafts / 12 publishes — but the Creatomate provider template was **deleted provider-side**. `docs/creative-library/property-pulse.json` marks it `provider_status: retired_provider_deleted`, and `image-worker/index.ts:931-932` independently calls it "the dead legacy template ... GONE." **The DB `status` column is stale and would mislead anyone trusting it at face value.** Treat as RETIRED, not production.
2. **Only 3 of 27 templates have ever produced a real Creatomate render**: row 5 (`48cba556`, 60 renders), row 7 (`2140ca19`, 11 renders), row 19 (`c11bb8ab`, 8 renders + 5 timeouts) — plus the now-dead row 17 and superseded row 18. **22 of 27 templates have zero render-log history.**
3. **6 of 27 templates are deliberately fenced** (rows 20–25, the "ICE reskin_video_templates_v1" batch): each T2 migration carries an explicit in-transaction fail-closed assertion that keeps `variant_candidate=0`, and `status='classified'` sits below the `smoke_rendered` floor `select_template` requires. No worker code references any of the six IDs. This is by design, not a defect — but it is 6 of the 27 that are structurally unreachable today.
4. **Video has exactly one reachable production path**: `video-worker`'s `renderGovernedVideoStat` only knows the `stat_hero_card`-shaped field contract (`StatValue`/`StatLabel`/`ContextLine`/`CtaText`/`Logo`/`Background`/`VoiceAudio`/`MusicBed`). The 4 fenced templates in the `listicle_card` and `news.quote_card` video families (rows 21, 22, 23, 24) have **no worker code that could render them even if un-fenced** — graduating those needs new worker code, not just a data change.
5. **The practical production winners today**: static 1:1 market-insight card = row 5; static 1:1 quote card = row 7; video 9:16 stat reveal = row 19. Every other one of the 27 either has zero proof, is dead, or is intentionally out of reach.

---

## 1. Quick-reference table (all 27)

| # | provider_template_id | name / family | scope | dims·dur | DB status | render proof | selector eligibility | classification |
|---|---|---|---|---|---|---|---|---|
| 1 | `54b305c8` | generic_stat_hero_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | **none** | candidate-suitability only, no proven assignment | **BLOCKED — proof-required** |
| 2 | `a75e7139` | generic_announcement_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 3 | `05c37472` | generic_portrait_feed_card_4x5_v1 | generic (PP) | 1080×1350 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 4 | `ca5b1509` | generic_youtube_thumbnail_16x9_v1 | generic (PP) | 1280×720 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 5 | `48cba556` | generic_market_insight_card_1x1_v1 | generic (PP prod-proven; NDIS, CFW visually_approved) | 1080×1080 static | smoke_rendered | **60 renders / 54 drafts / 48 publishes** | selectable, live PP `image_quote` winner | **PRODUCTION (PP)** — data-only extend to NDIS/CFW |
| 6 | `03459d76` | generic_auction_snapshot_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 7 | `2140ca19` | generic_quote_card_1x1_v1 | generic (PP; Invegent visually_approved) | 1080×1080 static | smoke_rendered | **11 renders / 11 drafts / 8 publishes** | selectable, real proof, registry status lags reality | **PRODUCTION-READY, data-only status bump** |
| 8 | `0b1f7079` | generic_story_static_card_9x16_v1 | generic (PP) | 1080×1920 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 9 | `590ca39a` | generic_linkedin_landscape_card_1200x628_v1 | generic (PP) | 1200×628 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 10 | `8aeb946c` | generic_carousel_closing_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 11 | `b662f999` | generic_news_summary_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 12 | `47ad6a9c` | generic_listicle_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 13 | `b95e0c9e` | generic_before_after_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 14 | `1dcb4c91` | generic_testimonial_card_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 15 | `c9a59faa` | generic_carousel_cover_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 16 | `c4c0fc9d` | generic_carousel_body_1x1_v1 | generic (PP) | 1080×1080 static | smoke_rendered | none | candidate-suitability only | **BLOCKED — proof-required** |
| 17 | `fb9820f8` | news_static_centered_scrim_1x1_v1 | client (PP, DB says prod-proven) | 1080×1080 static | production_proven *(stale)* | 21✓/5✗ renders / 16 drafts / 12 publishes *(historical, pre-2026-07-05)* | provider template **deleted upstream** | **RETIRED — DB status is wrong** |
| 18 | `82cefac3` | video_stat_reveal_9x16_v1 | client→(PP) | 1080×1920×12s video | governance_reviewed | 1 render, 0 drafts/publishes joined | zero field/suitability/variant rows — governance orphan | **OBSOLETE — superseded by row 19** |
| 19 | `c11bb8ab` | video_stat_reveal_9x16_v2 | generic (PP, NDIS visually_approved) | 1080×1920×12s video | visually_approved | **8✓/5⏱ renders / 4 drafts / 3 publishes** | live `video_short_stat` winner (worker calls `select_template(p_platform=null)`) | **PRODUCTION (video)** — data-only status bump; 38% timeout rate flagged |
| 20 | `c6dcaa2d` | "ICE Generic Stat Reveal 9x16 v1" | generic, no assignment | 720×1280×8s video | classified | none | **fenced** (variant_candidate=0 enforced) | **BLOCKED — fenced, likely superseded by row 26** |
| 21 | `817ce92d` | "ICE Generic Multi-Stat Tips 1x1 v1" | generic, no assignment | 1080×1080×9s video | classified | none | **fenced** | **BLOCKED — fenced + no worker path (listicle-video)** |
| 22 | `416658f5` | "ICE Generic Quote Statement 9x16 v1" | generic, no assignment | 720×1280×8s video | classified | none | **fenced** | **BLOCKED — fenced + no worker path (quote-video)** |
| 23 | `314974f6` | "ICE Generic Quote Statement 1x1 v1" | generic, no assignment | 1080×1080×8s video | classified | none | **fenced** | **BLOCKED — fenced + no worker path (quote-video)** |
| 24 | `2bda9382` | "ICE Generic Multi-Stat Tips 9x16 v1" | generic, no assignment | 720×1280×9s video | classified | none | **fenced** | **BLOCKED — fenced + no worker path (listicle-video)** |
| 25 | `8d5cd8df` | "ICE Generic Stat Reveal 1x1 v1" | generic, no assignment | 1080×1080×8s video | classified | none | **fenced** | **BLOCKED — fenced, likely companion of row 26** |
| 26 | `03bc6a3c` | "Stat Reveal 9×16 — Governed AV v2" | generic (PP visually_approved) | 720×1280×12s video | visually_approved | **none found** | has field/suitability/variant rows (self-documented as successor to row 20) | **NEAREST-TO-GRADUATE video — needs one real render proof** |
| 27 | `46c5c4ac` | AU_generic_national_Suburb_9:16_V1 (B-roll bg) | generic (PP visually_approved) | 720×1280×8s video | visually_approved | none matched directly *(see §5.4 nuance)* | `fit_status='candidate'` (not strong), zero suitability row → reachable only via `p_platform=null`+explicit intent, never a default winner | **CONTAINED-BY-DESIGN, not blocked** |

---

## 2. Full 15-field dossier

Grouped by layout family. Fields not stated in either agent's pull are marked "not recorded."

### 2.1 Static family — `generic.*` card set (rows 1–4, 6, 8–16 — 13 unproven templates, identical shape)

All 13 share this profile (deltas noted per-family below):

- **Client/global scope:** generic (client-agnostic template), assigned to PP only via `c.creative_template_client_assignment`.
- **Format/platform:** static image card, platform suitability rows exist for facebook/instagram/linkedin/website/etc. but every one is `suitability_status='candidate'` — none reached `platform_safe`/`production_proven`.
- **Layout family:** `generic.<family>` (see per-row name column above), 1:1 unless noted (row 3 = 4:5, row 4 = 16:9, row 8 = 9:16, row 9 = 1200×628).
- **Provider status:** `captured_from_provider_read` — template exists on Creatomate, was read back at capture time; never independently re-verified live.
- **Field contract:** `Background` (image, dynamic, `required_for_render=true`) + `Scrim` (static shape) + `Logo` (image, dynamic, not required) + 1–2 family-specific text elements (`Headline`/`CategoryBadge`/`Rating`/`SlideNumber`/`CTA`) — `supabase/migrations/20260702111455_*.sql:53-56`, `20260702124329_*.sql:60-63,75-78,92-95,108-111,122-125,133-136,147-150,159-162,172-175`.
- **Dimensions/duration:** per row above; static, no duration.
- **Asset-slot support:** background image slot + logo slot. **No video-background slot, no audio slots anywhere in this family** — `image-worker/b1_production.ts` only wires `Background.source`/`Logo.source`/`Scrim.opacity`/text fields (lines 11-12, 201-260, 326-329).
- **Voice/music support:** none — static image, not applicable.
- **Visual status:** `smoke_rendered` (status column) but this reflects the capture-time smoke test, not an ongoing proof; `assignment_status` where present is `visually_approved`, never `production_proven`.
- **Real-render proof:** **zero** `m.post_render_log` rows for any of these 13 `provider_template_id`s.
- **Real-draft proof:** **zero** — no draft ever selected this template (per the render-log join; drafts that never render aren't independently traceable to a template).
- **Publish proof:** **zero**.
- **Selector eligibility:** technically reachable by `select_template` (status ≥ smoke_rendered, scope=generic) but each family's `client_assignment` sits at `visually_approved`, and the initial capture migration explicitly **deletes and never re-inserts** `client_assignment` rows (`20260702111455…sql:11`) — so live selectability for most of these 13 depends on whatever undocumented later apply (if any) re-added an assignment. Not independently confirmed row-by-row.
- **Current blocker:** never exercised against the live Creatomate API in production; zero render/draft/publish history means the field contract is untested end-to-end.
- **Next required gate:** a real render→draft→publish smoke run (T2 lane: db-rls-auditor + branch-warden if any code changes, external review if selector/worker code changes) before any status/production claim. This is an **action**, not a pure data edit.

### 2.2 Static family — `generic.real_estate.market_insight_card` (row 5, `48cba556`) — **PRODUCTION**

- **Scope:** generic template; PP assignment = `production_proven`; NDIS + CFW assignments = `visually_approved`.
- **Format/platform:** static image, 1:1, real estate market-insight card. Platform suitability = candidate-only (same as §2.1), but the client-assignment `production_proven` is what actually governs PP's live selectability.
- **Layout family:** `generic.real_estate.market_insight_card`.
- **Provider status:** `captured_from_provider_read`, live and repeatedly re-rendered (60 times).
- **Field contract:** same generic card shape as §2.1 (Background/Scrim/Logo/text).
- **Dimensions/duration:** 1080×1080, static.
- **Asset-slot support:** background image + logo (same as §2.1).
- **Voice/music support:** n/a (static).
- **Visual status:** `production_proven` for PP; `visually_approved` for NDIS/CFW.
- **Real-render proof:** **60 succeeded renders**, 2026-06-22 → 2026-07-29 (still active).
- **Real-draft proof:** **54 distinct drafts**.
- **Publish proof:** **48 publishes** across 4 platforms (mix of `published`/`failed` outcomes at the publish stage — publish-stage failures are a separate concern from render/draft proof).
- **Selector eligibility:** confirmed live winner for PP's `image_quote` selection path.
- **Current blocker:** none for PP. **Data-hygiene note (not a functional blocker):** 3 of the 60 render rows carry a stale internal `registry_template_id="pp-news-centred-scrim-16x9"` tag that doesn't match any of the 27 current registry ids — leftover from before this provider ID was repurposed (see §5.2). Separately, `docs/creative-library/property-pulse.json` still describes this `provider_template_id` as PP's *retired* 16:9 scrim card, not the current 1:1 market-insight card — **vendored-registry drift**, PP's own JSON is stale relative to the DB.
- **Next required gate:** none to remain production for PP. If PK wants NDIS/CFW at parity, promoting their assignment to `production_proven` is **data-only** (they already render the identical template). Fixing the PP JSON drift and the 3 mistagged render rows is a housekeeping item, not a gate.

### 2.3 Static family — `generic.news.quote_card` (row 7, `2140ca19`) — **PRODUCTION-READY, data-only**

- **Scope:** generic template; PP + Invegent assignments, both `visually_approved`.
- **Format/platform:** static 1:1 quote card.
- **Layout family:** `generic.news.quote_card`.
- **Provider status:** `captured_from_provider_read`, actively re-rendered.
- **Field contract:** generic card shape (Background/Scrim/Logo/Headline-equivalent text).
- **Dimensions/duration:** 1080×1080, static.
- **Asset-slot support:** background image + logo.
- **Voice/music support:** n/a.
- **Visual status:** `visually_approved` (registry `status` field, not yet `production_proven` despite real proof existing).
- **Real-render proof:** **11 succeeded renders**, 2026-07-23 → 2026-07-29.
- **Real-draft proof:** **11 distinct drafts**.
- **Publish proof:** **8 publishes** across 3 platforms.
- **Selector eligibility:** confirmed selectable and used.
- **Current blocker:** none functional — the registry's `status`/`assignment_status` columns simply haven't been bumped to reflect the proof that already exists.
- **Next required gate:** **data-only** status correction (`visually_approved` → `production_proven`) — no code, no new render needed. First candidate for the "graduate data-only" batch.

### 2.4 Static family — `property_pulse.news.centered_scrim_card` static (row 17, `fb9820f8`) — **RETIRED**

- **Scope:** client (PP), `production_proven` in DB.
- **Format/platform:** static 1:1/jpg news scrim card.
- **Layout family:** `property_pulse.news.centered_scrim_card`.
- **Provider status:** `captured_from_docs` — the row's own inventory notes say a live provider read was unavailable (separate Creatomate project). Independently, `property-pulse.json` marks `provider_status: retired_provider_deleted` and `image-worker/index.ts:931-932` treats it as dead.
- **Field contract:** not independently re-verified (provider template is gone).
- **Dimensions/duration:** 1080×1080, static, jpg.
- **Asset-slot support:** historical only.
- **Voice/music support:** n/a.
- **Visual status:** DB says `production_proven` — **contradicted by provider deletion**.
- **Real-render proof:** 21 succeeded + 5 failed, but **all historical** (2026-06-25 → 2026-07-05), nothing since — consistent with the provider template having been deleted after that window.
- **Real-draft proof:** 16 distinct drafts (historical).
- **Publish proof:** 12 publishes (historical).
- **Selector eligibility:** **none today** — a `select_template` call that reached this row would fail at render time since Creatomate no longer serves the provider template.
- **Current blocker:** **provider-side deletion; DB status is stale/wrong and would mislead any consumer trusting it.**
- **Next required gate:** correct `status`/`inventory_status` in the registry to reflect retirement (data-only fix, no code change) so `select_template` and any dashboard reading `status='production_proven'` stop treating it as live.

### 2.5 Video family — `property_pulse.news.centered_scrim_card` / stat-reveal lineage (rows 18, 19)

**Row 18 (`82cefac3`, v1) — OBSOLETE:**
- Scope: originally client(PP); zero field/suitability/variant-candidate rows (governance orphan).
- Field contract / asset-slots / voice-music: not independently wired — no field rows recorded.
- Visual status: `governance_reviewed`; the migration's own comment at registration time says *"video_short_stat still fail_closed/format_unmapped (row not selectable)."*
- Real-render proof: 1 succeeded render only (2026-07-09), zero drafts/publishes joined.
- Selector eligibility: structurally invisible (no `variant_candidate` row = not in `select_template`'s candidate set at all).
- Blocker: superseded by v2 (row 19).
- Next gate: formal retire/supersede tag (data-only); no further use expected.

**Row 19 (`c11bb8ab`, v2) — PRODUCTION (video):**
- Scope: flipped from client(PP)→generic 2026-07-20 so NDIS could share it; both PP and NDIS assignments `visually_approved`.
- Format/platform: `video_short_stat`, video-worker's single production video render path.
- Layout family: same lineage, generic scope.
- Provider status: live, actively re-rendered.
- Field contract: `StatValue`/`StatLabel`/`ContextLine`/`CtaText` (hard-gated max-chars), `Logo.source` (required, fail-loud), `Background.source` (optional — resolver-bound per client since 2026-07-20), `VoiceAudio.source` (**required** — throws `b1_video_missing_voiceover` if blank), `MusicBed.source` (**optional** — an explicit `''` is an intentional silent bed per house convention, not an error) — `video-worker/b1_video_stat.ts:98-106,547-584`, `index.ts:561,576-584,701,1213-1260`.
- Dimensions/duration: 1080×1920, 12s.
- Asset-slot support: background image/video slot (resolver-bound, includes the governed B-roll path), logo slot.
- Voice/music support: **full** — VO required, music bed optional/intentionally-silent-capable.
- Visual status: `visually_approved`.
- Real-render proof: **8 succeeded + 5 timeout** (13 total attempts, 2026-07-10 → 2026-07-27).
- Real-draft proof: 4 distinct drafts.
- Publish proof: 3 publishes, 1 platform.
- Selector eligibility: confirmed live winner — `video-worker` calls `select_template(p_platform=null)` by design (video is one 9:16 render, not per-platform), which **skips platform-suitability filtering entirely** for this call (`index.ts:1226-1231`, migration `20260703035154…sql:204`).
- Current blocker: **38% timeout rate** (5 of 13) against the known [hard 2-minute Creatomate render ceiling with no retry](../../../docs/briefs/results — see memory `video-worker-2min-render-timeout-no-retry`) — a reliability concern, not a selectability one. Registry `status` also hasn't caught up to reflect the real proof (still `visually_approved`, not `production_proven`).
- Next required gate: (a) data-only status bump given proof exists; (b) separately, a reliability review of the timeout rate — outside this classification's scope but flagged as a live risk on the one video template actually in production.

### 2.6 Video family — fenced "reskin" batch (rows 20–25) — **BLOCKED**

All six share: scope generic, no client assignment, `status='classified'` (below the `smoke_rendered` floor `select_template` requires), **zero** field rows, **zero** render/draft/publish history, and an explicit in-migration fail-closed assertion holding `variant_candidate=0` (`20260717014905…sql:109-115`, `20260717045204…sql:82-88`, `20260717034005…sql:50-56`). No worker code (`supabase/functions/**`) references any of the six provider_template_ids — confirmed by grep, zero hits.

| row | family | dims/dur | worker-path status |
|---|---|---|---|
| 20 `c6dcaa2d` | generic.stat_hero_card | 720×1280×8s | worker path EXISTS (video-worker's stat-reveal contract) — self-documented as the duplicate root of row 26 |
| 25 `8d5cd8df` | generic.stat_hero_card | 1080×1080×8s | same family as 20/26 — worker path exists |
| 21 `817ce92d` | generic.listicle_card | 1080×1080×9s | **no worker path** — video-worker has no multi-stat/listicle video render function |
| 24 `2bda9382` | generic.listicle_card | 720×1280×9s | **no worker path** — same |
| 22 `416658f5` | generic.news.quote_card | 720×1280×8s | **no worker path** — video-worker has no quote-statement video render function |
| 23 `314974f6` | generic.news.quote_card | 1080×1080×8s | **no worker path** — same |

- Asset-slot / voice-music support: **not recorded** — zero field rows means the actual element names on these Creatomate templates are unverified from either DB or code. This must be checked before any graduation decision.
- Current blocker: deliberate governance fence (by design) + (for 21/22/23/24) no worker code capable of rendering the format at all even if un-fenced.
- Next required gate: (i) confirm each template's real field/element names against Creatomate (currently zero field rows recorded anywhere); (ii) for 20/25, if element names match the existing `b1_video_stat` contract, un-fencing + a real render/draft/publish proof could be **data-only + proof**, no new worker code; (iii) for 21/22/23/24, graduation requires **new worker code** (a listicle-video and a quote-video render function/field-mapping in `video-worker`) before un-fencing means anything.

### 2.7 Video — "Governed AV v2" (row 26, `03bc6a3c`) — nearest-to-graduate

- Scope: generic, PP assignment `visually_approved`.
- Format/platform: 9:16 video, same `generic.stat_hero_card` family as rows 20/25.
- Layout family: `generic.stat_hero_card`.
- Provider status: `captured_from_manual_entry`.
- Field contract: has field/suitability/variant-candidate rows (unlike rows 20–25) — the actual field names were not itemized by either agent pull; recommend re-verifying against `c.creative_provider_template_field` directly before graduation (this doc's DB pull confirmed the row EXISTS and is `strong_candidate`-eligible, not its literal field names).
- Dimensions/duration: 720×1280, 12s.
- Asset-slot / voice/music support: presumed same family as row 19 (governed AV) — not independently itemized; verify before use.
- Visual status: `visually_approved`.
- Real-render proof: **none found** — no `m.post_render_log` row matched `03bc6a3c` directly.
- Real-draft/publish proof: none.
- Selector eligibility: has the governance rows (`variant_candidate`, suitability, assignment) that rows 20–25 lack — structurally the closest fenced-adjacent template to being selectable.
- Current blocker: no real render ever executed despite otherwise-complete governance rows. Its own `fit_reason` self-documents it as a "Route A governed-AV duplicate of `c6dcaa2d`" (row 20) — **its intended relationship to row 19 (`c11bb8ab`, the current live winner) and row 20 is not resolved by the data**: is it meant to eventually replace `c11bb8ab`, or serve a distinct slot? This is a PK product decision, not inferable from DB/code.
- Next required gate: one real render→draft→publish smoke run; then a PK decision on its relationship to row 19/row 20 before any promotion.

### 2.8 Video — B-roll background variant (row 27, `46c5c4ac`) — contained by design

- Scope: generic, PP assignment `visually_approved`.
- Format/platform: 9:16 video, national-suburb B-roll background.
- Layout family: `property_pulse.news.centered_scrim_card` (shares the lineage tag with rows 17/18, but functions as a *background asset* template within `video_short_stat`, per `docs/briefs/results/governed-broll-consumption-v1-slice-a-result.md:10`).
- Provider status: `captured_from_manual_entry`.
- Field contract: full-frame B-roll VIDEO `Background.source` composited with the governed stat/logo/text/audio contract.
- Dimensions/duration: 720×1280, 8s, mp4.
- Asset-slot support: video-background slot (its defining feature) + logo/text/audio pass-through from the governed contract.
- Voice/music support: inherits the governed AV contract (audible per memory `governed-broll-consumption-v1-proven`).
- Visual status: `visually_approved`.
- Real-render proof: **no direct match** in `m.post_render_log` keyed to `46c5c4ac` as a top-level `render_spec.template`. **Nuance, not a contradiction:** per memory, this template is consumed as a *nested background asset inside `c11bb8ab`'s renders* (the resolver picks it as `video_short_stat`'s B-roll bg), so its real usage would show up inside row 19's render_spec, not under its own top-level key — this DB pull did not query that nested path, so "zero direct proof" is accurate but **not the same as "never used."** Flagged as an open verification gap, not resolved here.
- Selector eligibility: `fit_status='candidate'` (not `strong_candidate`), **zero platform-suitability row** — per `select_template`'s ranking (`strong_candidate` bucket ranks before `candidate`), this template **structurally can never win the default no-intent ranking**; it is reachable only via `p_platform=null` + an explicit `variant_intent`. Per memory (`governed-broll-consumption-v1-proven`) this containment is **intentional**, not a defect.
- Current blocker: none for its designed contained role.
- Next required gate: none required to keep functioning as designed. Promoting it to `strong_candidate` (to compete as a default winner) is a **data-only flip** but is a deliberate PK product decision, not a fix.

---

## 3. Practical production winner by format

| Format | Winner | Proof status |
|---|---|---|
| Static 1:1 real-estate market-insight card | **row 5 (`48cba556`)** | proven, live, multi-client |
| Static 1:1 news quote card | **row 7 (`2140ca19`)** | proven, live (registry status lags) |
| Static 1:1 PP news scrim card | **none — gap** | sole candidate (row 17) is retired |
| Static: all other 13 families (announcement, feed-portrait, youtube-thumb, auction-snapshot, story-static, linkedin-landscape, carousel×4, news-summary, listicle-static, before/after, testimonial) | sole candidate by elimination, but **unproven** | zero render history each |
| Video 9:16 stat reveal (`video_short_stat`) | **row 19 (`c11bb8ab`)** | proven, live, single production path, 38% timeout rate flagged |
| Video B-roll background variant | **row 27 (`46c5c4ac`)**, contained | intentional narrow-path winner, not a default |
| Video listicle-tips, video quote-statement | **no winner — gap**, no worker path exists at all | n/a |

---

## 4. Graduation classification

### 4.1 Can graduate **data-only** (no code, no new render — registry/status correction only)
- **Row 7** (`2140ca19`) — promote `visually_approved` → `production_proven`; proof already exists.
- **Row 19** (`c11bb8ab`) — same status promotion; proof already exists (timeout-rate risk should be logged alongside, not blocking the data fix).
- **Row 5** (`48cba556`) — optional: promote NDIS/CFW assignment to `production_proven` to match PP (same template, no new render needed).
- **Row 17** (`fb9820f8`) — data-only, but in the *opposite* direction: correct `status`/`inventory_status` to reflect retirement so downstream consumers stop reading it as live.
- **Row 18** (`82cefac3`) — data-only supersede/retire tag.

### 4.2 Requires an actual proof run before any data change is honest (not data-only)
- Rows 1–4, 6, 8–16 (13 unproven static families) — need a real render→draft→publish smoke event first.
- Row 26 (`03bc6a3c`) — same; otherwise the nearest video template to graduation.
- Rows 20, 25 — need field-contract verification (zero field rows recorded) before it's even known whether they're data-only-eligible against the existing `b1_video_stat` worker path.

### 4.3 Requires new worker compatibility (code change, not data)
- Rows 21, 24 (listicle-video family) — video-worker has no render function for this field shape.
- Rows 22, 23 (quote-video family) — same, no render function exists.
- (Conditionally) rows 20, 25 if their field/element names turn out not to match the existing `b1_video_stat` contract — unverified either way.

### 4.4 Duplicates / obsolete / retired
- **Row 17** — RETIRED: provider deleted the template; DB `status='production_proven'` is stale and wrong.
- **Row 18** — OBSOLETE: superseded by row 19, governance-orphan, one-time render only.
- **Row 20** — likely OBSOLETE/superseded by row 26 per the row's own self-documented `fit_reason` — pending PK confirmation of intended relationship.
- **Data-hygiene, not part of the 27, flagged for whoever owns render-log/registry hygiene:**
  - `provider_template_id=bc32f52f…` has 1 real render in `m.post_render_log` but **no corresponding row in the current 27-row registry at all** — it maps to PP's other deleted legacy template (`centred-scrim-9x16-video`, `retired_provider_deleted` per `property-pulse.json`).
  - 3 of row 5's 60 render rows carry a stale internal tag (`registry_template_id="pp-news-centred-scrim-16x9"`) that matches no current registry id — leftover from the provider-ID repurpose.
  - `docs/creative-library/property-pulse.json` still describes row 5's `provider_template_id` as PP's retired 16:9 scrim card, contradicting both the live DB row and NDIS's own JSON — vendored-registry drift PP's file needs to catch up on.

---

## 5. First batches to graduate

### 5.1 First static batch (2 templates, zero new renders needed)
1. **Row 5** (`48cba556`) — already production for PP; batch action = optional NDIS/CFW status parity (data-only).
2. **Row 7** (`2140ca19`) — data-only status promotion; proof already exists.

Beyond these two, all 13 remaining static families are equally unproven (zero render history each) — there is no data-driven basis to rank a "batch 2" among them; that selection should be driven by which formats current PK/schedule demand needs next, not by anything this DB/code pull can differentiate.

### 5.2 First video batch (1 confirmed + 1 near-miss)
1. **Row 19** (`c11bb8ab`) — data-only status promotion; already the live `video_short_stat` winner. Timeout-rate review flagged as a parallel, non-blocking risk item.
2. **Row 26** (`03bc6a3c`) — nearest candidate: has full governance rows, just needs one real render→draft→publish proof run, then a PK decision on its relationship to row 19/row 20.

Rows 20/25 are the next tier (same worker-compatible family, but need field-contract verification first, since zero field rows are recorded for them). Rows 21–24 are **not** batch-eligible until video-worker gains a listicle-video and a quote-video render path — that is a worker-compatibility project, not a graduation-batch item.

---

## 6. Open questions / verification gaps (not resolved by this pull)

1. Whether rows 20/25's actual Creatomate element names match the `b1_video_stat` contract (`StatValue`/`StatLabel`/`ContextLine`/`CtaText`/`Logo`/`Background`/`VoiceAudio`/`MusicBed`) — zero field rows recorded for either.
2. Row 26's intended relationship to row 19 (replace vs. coexist) and to row 20 (successor vs. unrelated duplicate) — PK product decision, not inferable from data.
3. Row 27's real usage as a nested background asset inside row 19's renders — not queried in this pull; the "zero direct render proof" finding is accurate for the top-level `render_spec.template` key only.
4. Whether image-worker's B1 path actually maps every family-specific text field (`CategoryBadge`/`Rating`/`SlideNumber`/`CTA`) across all 13 unproven static families, or only the common `Headline`/`Subtitle` shape — the code pull confirmed the generic shape but did not exhaustively verify each family's distinct fields are wired. Worth checking before batch-2 static graduation to rule out a hidden worker-compatibility gap in what otherwise looks like a data-only class.
5. Exact per-row `assignment_status` for the 13 unproven static families beyond rows 5/17 (the only two DB-confirmed `production_proven` assignments) — the DB pull gave an aggregate (22 of 24 assignment rows are `visually_approved`) rather than a full per-row join; treat the §2.1 "visually_approved" label as the aggregate default unless re-verified per row.

---

*Sources: `db-rls-auditor` live SELECT-only pull (2026-07-29) against `ice_ro.template_registry_status`, `c.creative_provider_template` + 7 related governance tables, `m.post_render_log`/`post_draft`/`post_publish`. Code-side pull (2026-07-29, read-only) of `supabase/migrations/20260702111455*`, `20260702124329*`, `20260703035154_create_select_template_v1.sql`, `20260709055112*`, `20260709205827*`, `20260717014905*`, `20260717045204*`, `20260717034005*`, `20260720040000*`, `20260720130000*`, `supabase/functions/image-worker/index.ts`, `supabase/functions/image-worker/b1_production.ts`, `supabase/functions/video-worker/index.ts`, `supabase/functions/video-worker/b1_video_stat.ts`, `docs/creative-library/property-pulse.json`, `docs/creative-library/ndis-yarns.json`.*
