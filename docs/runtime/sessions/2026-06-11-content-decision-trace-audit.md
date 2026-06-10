# ICE — Current Content Decision Trace Audit (read-only)

**Date:** 2026-06-11 (window 2026-06-04 → 2026-06-11)
**Role:** CCH. **Mutations:** 0 production / 0 DB / 0 deploy / 0 provider call / 0 D-01 fired. Repo: this doc only.
**Evidence:** production SQL (read-only) + repo code on `main` (ai-worker `8204a5c7`, heygen-worker `9acb17e8`) + `m.vw_ef_drift_current` + `cron.job`.

---

## 1. Executive summary

**What ICE currently does:** a slot-driven, advisor-refined pipeline. Nightly `m.materialise_slots` creates 5 slots/wk per client×platform from `c.client_publish_schedule`, stamping a deterministic format preference (FB from `preferred_format_facebook`=image_quote; **YouTube hardcoded `video_short_avatar` in the function source**; IG/LI null). `m.fill_pending_slots` (10-min cron) selects canonicals from the signal pool, sets `format_chosen = COALESCE(format_preference[1],'image_quote')`, gated by `t.format_synthesis_policy`/`t.format_quality_policy`, creates skeleton draft + `slot_fill_synthesis_v1` ai_job. **ai-worker v2.13.0 is the real format decision-maker**: `callFormatAdvisor` (claude-sonnet-4-6, palette = `t."5.3_content_format"` platform_support opt-in ∩ `c.client_format_config`) picks the final `recommended_format`, frequently overriding the slot's choice (proven: slot image_quote → final text; slot image_quote → final video_short_stat). The single deterministic exception is the **A2 avatar override**: if the slot asked avatar, ai-worker forces avatar and records `advisor_would_have=<X>` *in prose inside recommended_reason*. Narrative shape is generated per-format in `generateVideoScript` (kinetic=scenes[], stat=stat_reveal, avatar=first-person narration). Renders route by format (heygen-worker↔avatar; video-worker/image-worker↔Creatomate). Auto-approver (auto-agent-v1) approves; an enqueue cron feeds `m.post_publish_queue`; per-platform publisher EFs execute — except **youtube-publisher, which bypasses the queue entirely and selects drafts directly**.

**Proven:** full GREEN backward traceability publish→feed for every representative post sampled (5/5, all clients, all platforms). Selection evidence lives in `m.slot` + `m.slot_fill_attempt` (pool snapshot, canonical_ids); the digest tables are NOT in the live chain (`digest_item_id` NULL on all window drafts; legacy seed-and-enqueue crons disabled).

**Unclear/implicit:** advisor_would_have and the A2 override exist only as prose; avatar identity for the 9 in-window avatar publishes is **unrecoverable** (pre-v2.1.1, LIMIT 1 no ORDER BY, not logged).

**Broken-ish (small):** YT queue rows regenerate but are never consumed (orphan recurrence of the v3.29 class); one advisor-respin produced 6 orphan carousel slide renders on a final-format=text draft.

---

## 2. Last-7-days output matrix

`m.post_publish` rows created in window: 64 (61 published, 3 failed). All publish rows with platform_post_id present on success.

| client | platform | format | published | failed | queued | dead/skip | sample draft | notes |
|---|---|---|---|---|---|---|---|---|
| CFW | facebook | image_quote | 4 | – | – | – | d22a9b94 | |
| CFW | instagram | image_quote | 5 | – | – | – | 7b3165a8 | |
| CFW | fb/li | (null) | – | – | – | 14 dead drafts | 34d09f64 | 100% `compliance_skip=true` — v3.32 class, intentional |
| Invegent | facebook | image_quote / video_short_stat | 2 / 3 | – | – | – | 944566f5 | stat videos = advisor override of slot image_quote |
| Invegent | instagram | image_quote | 5 | – | – | – | a72cb1c2 | |
| Invegent | linkedin | image_quote / text | 1 / 3 | – | 1 queued (text) | – | 29dce0b4 | |
| NY | facebook | image_quote / text | 4 / 1 | – | – | – | f3237733 | |
| NY | instagram | image_quote | 4 | – | – | 1 skipped (text) | 20e3baa3 | `format_not_supported_on_instagram:text` |
| NY | linkedin | image_quote / text | 1 / 4 | – | 1 queued | – | 2b465d0c | |
| NY | youtube | video_short_avatar | 4 | – | 1 queued (orphan) | 10 dead (archive) | d870f20a | dead = v3.29 archive; 1 rejected avatar draft 16d71126 |
| PP | facebook | image_quote | 3 | 3 | – | – | e908a6c7 | `facebook_photo_http_500` payload-size; drafts published on retry |
| PP | instagram | image_quote | 6 | – | – | 1 skipped (text) | c678415e | |
| PP | linkedin | image_quote / text | 4 / 2 | – | – | – | 5819cbb6 | |
| PP | youtube | video_short_avatar | 5 | – | 2 queued (1 orphan avatar, 1 text) | 10 dead (archive) | dcab6fba | |

Formats observed in production tables this window: image_quote, text, video_short_stat, video_short_avatar, **carousel (renders only — see §7 finding 2)**; kinetic/kinetic_voice/stat_voice appear only on the archived dead YT queue rows. Renders: creatomate image_quote 42 ok, video_short_stat 3 ok, carousel 5 ok + 1 fail; **heygen 2 ok (first telemetry rows ever — 06-10)**.

---

## 3. Forward trace (representative: NY × YouTube × avatar, draft d870f20a)

| step | table | join key | evidence | explicit/inferred |
|---|---|---|---|---|
| feed | f.feed_source `67eaedad` "NDIS Australia news" (rss_app) | source_id | + duplicate via "Disability support AU" — dedup worked | explicit |
| ingest | f.ingest_run `8b924d01` → f.raw_content_item `c782f5b5` | run_id/source_id | fetched 06-10 | explicit |
| normalise | f.content_item `6fda361b` | raw_content_item_id | | explicit |
| canonical | f.canonical_content_item `c72a4466` via f.content_item_canonical_map | canonical_id | first_seen 06-10 18:01 | explicit |
| body | f.canonical_content_body | canonical_id | fetch_status=success, 1494 words | explicit |
| selection | m.slot `14a7a25e` (format_preference=[video_short_avatar], source_kind=scheduled) + m.slot_fill_attempt (decision=filled, selected_canonical_ids={c72a4466}, pool snapshot) | slot_id | | explicit |
| AI | m.ai_job `8a066380` slot_fill_synthesis_v1 succeeded | post_draft_id/slot_id | | explicit |
| draft | m.post_draft d870f20a — recommended_format=video_short_avatar; reason: "avatar_override (F-HEYGEN A2); advisor_would_have=video_short_kinetic; …"; approved_by=auto-agent-v1 | post_draft_id | | explicit |
| render | heygen-worker submit/poll; draft_format.heygen_video_id; m.post_render_log heygen row (provider_job `56f74adb…`, succeeded, 06-10) | post_draft_id | | explicit |
| publish | m.post_publish youtube, platform_post_id set (draft_format.youtube_video_id matches) | post_draft_id | **queue row exists but stays `queued` — youtube-publisher bypasses queue** | explicit (bypass proven by data) |

Digest_run/digest_item: **not in chain** (NULL). The directive's assumed digest step is legacy; live selection = signal pool → slot fill.

## 4. Backward traces

5/5 sampled posts (CFW×IG image_quote 7b3165a8 → "early childhood early intervention" rss_app; PP×FB image_quote c732748a → "AU property market"; Invegent×LI text 29dce0b4 → TechCrunch AI rss_native; Invegent×FB stat 944566f5 → TechCrunch AI; NY×YT avatar d870f20a → NDIS Australia news): **GREEN** — feed item, source, body, selection reason (fill attempt + pool snapshot), format decision (visual spec + recommended_reason), platform (slot), provider (render log / worker predicate), publication event all identified. The only per-post answer that is NOT recoverable: *which avatar face/voice* (pre-v2.1.1).

---

## 5. Decision ownership map

| Decision | Owner | Evidence | Code path | Stored? | Recoverable? | Notes |
|---|---|---|---|---|---|---|
| Client eligibility | config + gate | c.client.status, client_publish_profile.publish_enabled, m.is_publish_eligible | fill_pending_slots (cc-0019 A) | yes | yes | |
| Platform eligibility | config | existence of publish_profile + publish_schedule rows | materialise_slots | yes | yes | CFW/Invegent have no YT profile → no YT slots |
| Format (initial) | deterministic | slot.format_preference | materialise_slots: per-platform pref col; **YT hardcoded avatar** | yes | yes | t.platform_format_mix_default NOT wired (aspirational) |
| Format (fill) | deterministic | slot_fill_attempt.chosen_format = pref[1] else image_quote; t.format_*_policy gates | fill_pending_slots | yes | yes | |
| Format (final) | **AI advisor** | m.post_draft.recommended_format/_reason; m.post_visual_spec (append-only history) | ai-worker callFormatAdvisor | yes | yes | advisor overrides fill choice routinely |
| A2 avatar override | deterministic | prose in recommended_reason ("advisor_would_have=…") | ai-worker v2.13.0 A2 block | prose only | parseable | structured field absent |
| Narrative shape | implicit-in-format | draft_format.video_script (scenes[] / stat_reveal / narration_text) | ai-worker generateVideoScript | yes (JSON) | yes | format = narrative proxy (§8) |
| Provider/render engine | implicit-in-format | each worker's draft-select predicate on recommended_format | heygen-worker / video-worker / image-worker | only post-hoc (render_log) | yes post-hoc | no routing table |
| Avatar identity | **LIMIT 1 fallback** | c.brand_avatar JOIN brand_stakeholder; no ORDER BY; stakeholder_role never emitted by ai-worker | heygen-worker lookupAvatar | v2.1.1+ only (draft_format.avatar_identity → render_spec) | **NO for all 9 window publishes** | NY has 7, PP has 8 active realistic avatars — pick is arbitrary |
| Schedule/cadence | config | client_publish_schedule → slot.scheduled_publish_at → queue.scheduled_for | materialise_slots; enqueue cron | yes | yes | |
| Publication gating | agent + cron | approved_by=auto-agent-v1; enqueue cron predicate | auto-approver v1.6.0; enqueue-publish-queue-every-5m | yes | yes | |
| Final execution | executors | m.post_publish | publisher v1.8.0 (FB) / instagram-publisher v2.4.0 / linkedin-zapier-publisher v1.1.0 / **youtube-publisher v1.11.0 (queue-bypassing, draft-predicate)** / wordpress-publisher | yes | yes | drift register row for youtube-publisher is STALE (shows 1.6.0; live v1.11.0 per v3.20 health GET) |

Version lineage: ai-worker 2.13.0, heygen-worker **2.1.1** (register A-LE, repo==deployed; avatar-identity telemetry patch on top of v3.31's 2.1.0), video-worker 3.1.3, image-worker 3.9.2, instagram-publisher 2.4.0, publisher 1.8.0, linkedin-zapier-publisher 1.1.0, auto-approver 1.6.0 — all consistent with window data. Exceptions flagged: youtube-publisher register row stale; insights-worker B-RR (deployed 14.2.0 ahead of repo 14.1.0 — rollback-hazard class, separate carry already known).

## 6. Platform/format matrix — intended vs actual

| platform | taxonomy mix intends | client config pins | advisor actually selects | renderer can | publisher can | actually published (7d) |
|---|---|---|---|---|---|---|
| facebook | image 30 / carousel 25 / text 20 / kinetic 10 / kinetic_voice 10 / ATR 5 | image_quote | image_quote, text, video_short_stat | all | photo+video+text | image_quote, text, video_short_stat |
| instagram | carousel 30 / kinetic 20 / stat_voice 15 / image 20 / AD 10 / ATR 5 | – | image_quote, text | all | **text NOT supported** (skip) | image_quote only |
| linkedin | carousel 40 / text 20 / image 15 / kinetic 15 / stat_voice 10 | – | text, image_quote, carousel (1 respin) | all | via Zapier | image_quote, text |
| youtube | kinetic 30 / kinetic_voice 25 / stat 20 / stat_voice 15 / **avatar 10** | **hardcode avatar 100%** | n/a (overridden) | heygen | 5-format allow-list + avatar | avatar only |

The evidence-based `t.platform_format_mix_default` portfolio is unwired; actual output is a near-monoculture set by `preferred_format_facebook` + the YT hardcode + advisor drift toward image_quote/text.

## 7. Findings (new, this audit — no action taken)

1. **F-HEYGEN-RENDER-TELEMETRY first rows CAPTURED ✅** — 2 genuine heygen rows in m.post_render_log (06-10, drafts dcab6fba PP + d870f20a NY, succeeded, provider_job_id + durations present). The v3.31 carry's functional evidence is now satisfied; avatar_identity is null/absent on both (submits pre-dated v2.1.1) — identity telemetry will populate from the next fresh submit.
2. **F-ADVISOR-RESPIN-ORPHAN-SLIDES (P3)** — draft 096e3b72 (Invegent LI) has TWO m.post_visual_spec rows (carousel + text); 6 carousel slide renders executed (5 ok/1 fail) for a draft whose final recommended_format=text. Renderer consumed a non-final spec → wasted Creatomate credits + orphan m.post_carousel_slide rows. 1 instance in window.
3. **F-YT-QUEUE-ORPHAN-RECURRENCE (P3)** — enqueue cron creates YT queue rows the youtube-publisher never consumes (it selects drafts directly). The published avatar drafts' queue rows sit at `queued` forever; the v3.29-archived class is regenerating (3 new orphans already). Candidate fix later: exclude youtube in the enqueue cron, or consume the queue in youtube-publisher.
4. **Avatar path = (2) arbitrary first avatar** — lookupAvatar LIMIT 1, no ORDER BY, stakeholder_role never emitted by ai-worker, while a 15-row role-aware inventory (c.brand_avatar × brand_stakeholder) sits ready. Connects to the open A2 avatar-policy P3 carry.
5. **Dead config quirk** — ai-worker fetchFormatContext reads `preferred_format_facebook` for every platform (column hardcoded); `preferred_format_linkedin/instagram` are dead columns today.
6. **Drift register staleness** — youtube-publisher row shows deploy 1.6.0 vs live v1.11.0.

## 8. Format vs narrative — answer: YES, format is a narrative proxy

Per ai-worker code + payloads: kinetic(±voice)=scenes[] hook→points→cta; stat(±voice)=single-stat reveal structure; avatar=first-person single narration (generic narrator POV — no role POV); image_quote=single pull-quote headline; carousel=multi-slide structured points; text=conversational prose. Choosing a format chooses the narrative pattern; there is no independent narrative dimension anywhere in data or code.

## 9. Architecture implications + recommendation

a. **Single branded host:** supportable **config-only** today — pin one active `c.brand_avatar` per client (or preset talking_photo_id/voice_id into draft_format). No code, no schema.
b. **Role-aware avatar:** schema + lookup filter already exist; the only missing link is ai-worker emitting `stakeholder_role` (and a role-pick decision) into video_script. **Wiring-only.**
c. **Narrative-pattern-first routing:** current model conflates format/narrative but can answer every audited decision; a narrative layer is design work, **not required** to fix anything observed.
d. **Conversation-cast:** not supported (single video_input/narration). Schema + design if ever wanted.

**Recommendation: instrumentation-only + config-only. No schema. No code patch required by this audit.** Concretely: close the F-HEYGEN first-row carry; let v2.1.1 avatar-identity telemetry accumulate before the A2 policy decision; if brand consistency matters now, do the config-only single-host pin; queue the two P3 findings (orphan slides, YT queue orphans) and the role-wiring as separately gated candidates. A narrative engine is not justified by the evidence — every published post in the window can already be explained end-to-end except the avatar face, and that gap is closed going forward by v2.1.1.
