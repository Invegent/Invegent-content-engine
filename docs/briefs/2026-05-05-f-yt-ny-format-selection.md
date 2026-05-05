# F-YT-NY-FORMAT-SELECTION — Investigation Brief

**Status:** P1, queued behind RECONCILE-EF-DRIFT
**Created:** 2026-05-05
**Origin:** F-YT-ASSET-GEN-GAP corrected diagnosis (Option A-lite, behavioural-only)
**Owner:** chat (read-only investigation only — no code changes until source synced)

## TL;DR

ai-worker v2.11.1 selects `recommended_format='text'` for 100% of NDIS-Yarns YouTube drafts (8 of 8 in last 14 days) and 76% of Property-Pulse YouTube drafts (13 of 17). Text-format YouTube drafts cannot publish — there is no asset-generation path for text on YouTube. Result: NY×YT has never published; PP×YT only publishes the ~24% of drafts that get a video format. This brief frames the bug for post-source-sync diagnosis. It does NOT propose a fix. EF source sync (`RECONCILE-EF-DRIFT`) is required first.

## How this was discovered

1. F-YT-ASSET-GEN-GAP initial diagnosis (March 2026 thinking) blamed asset generation: "video-worker doesn't render kinetic/stat for PP×YT."
2. Pre-flight P1 state-capture revealed deployed Edge Function source had drifted from repo (ai-worker, heygen-worker, video-worker all newer than repo). Diagnosis halted. Patch plan invalidated.
3. PK approved Option A-lite — behavioural observation against deployed state, no source access, no patch.
4. Production data showed video-worker DOES render kinetic/stat (4 PP×YT mp4 files in `post-videos` bucket). Real blocker was YouTube OAuth `invalid_grant` for PP, since fixed by PK via dashboard reconnect (F-YT-OAUTH-PP).
5. Same observation surfaced the secondary issue: ai-worker selecting `text` for the majority of YT drafts, 100% for NY. **That's this brief.**

## Behavioural evidence gathered

### Format distribution by client × platform (last 14 days, post-v2.11.1 deploy)

| Client | Format | n | % |
|---|---|---|---|
| ndis-yarns | text | 8 | 100% |
| ndis-yarns | (any video format) | 0 | 0% |
| property-pulse | text | 13 | 76% |
| property-pulse | video_short_kinetic | 2 | 12% |
| property-pulse | video_short_stat | 2 | 12% |
| property-pulse | (other) | 0 | 0% |

NY full history: 8 text drafts + 2 `video_short_avatar` test drafts (2026-04-09, identical narration_text "Hi, I'm Alex…" — clearly seed/test data, not pipeline-generated).

### Selection metadata is in `m.post_draft.draft_format->'ai'`

Each v4 slot-driven draft has an `ai` JSONB block written by ai-worker v2.11.1, including:

- `format_decided` — the chosen format (`text`, `video_short_kinetic`, `video_short_stat`, etc.)
- `format_reason` — natural-language justification (full sentences, ~50–100 words)
- `format_advisor_key: "format-advisor-v1"` — confirms a separate LLM-driven format-advisor component exists and is being used
- `provider`, `model`, `fallback_used` — which LLM made the decision
- `legacy_profile: false` — both clients on new profile system
- `is_shadow: true|false` — JSONB residue from pre-M5 era; not currently meaningful but worth logging

### Sample format_reason values (4 drafts, paraphrased to show pattern)

**PP video_short_kinetic (4f07da94):** "structured long-form analysis of multiple demographic and economic mega-trends... ideal for a kinetic text video... title is a strong hook, content naturally breaks into distinct named points... will outperform text or image_quote for an educational forward-looking piece."

**PP video_short_stat (53b16d45):** "title contains a striking numeric stat — '90% of banks hike mortgage rates' — that anchors the story and is ideal for a stat reveal animation. Despite the body being inaccessible, the headline alone provides a compelling, self-contained data point."

**PP text (53f87cdd):** "no specific numeric statistics extracted from the body — only a headline and a truncated URL preview. No usable pull quote, no specific dollar figure or percentage change, and no structured multi-point argument. Text post is the appropriate format for reactive commentary on breaking news."

**NY text (c8063e1a):** "news reaction and opinion piece about political/policy developments — public sector job cuts, budget cuts, and military spending. Content is conversational and reactive in nature, with no striking standalone statistic or structured multi-point breakdown that would justify a visual format. Plain text is the fastest and most appropriate format for commentary on breaking political news."

## Diagnosis (working hypothesis)

The `format-advisor-v1` LLM is making **content-driven** format decisions based on attributes like:
- presence of striking statistics
- structured multi-point breakdowns
- specific dollar figures / percentage changes
- usable pull quotes
- educational vs. reactive nature of the content

The advisor appears **platform-agnostic** — its prompt evidently does not gate format on `platform='youtube'`. It recommends `text` whenever the source content lacks the visual hooks it requires, **regardless of which platform the draft is destined for**.

Why NY×YT is 100% text and PP×YT is only 76% text:
- NY's content (NDIS policy, advocacy, regulatory updates) is overwhelmingly opinion/commentary — exactly the content shape the advisor associates with text.
- PP's content (property news, RBA rates, market data) sometimes carries the numeric stats and structured analyses the advisor associates with video.

This is not a randomness/sampling issue — it is **selection bias driven by content-source mix**, exactly as the format advisor was designed to do. The bug is that **YouTube specifically cannot publish text** (youtube-publisher requires `recommended_format` IN (`video_short_kinetic`, `video_short_stat`, `video_short_kinetic_voice`, `video_short_stat_voice`) and a populated `video_url`), but the advisor doesn't know this.

### Adjacent observation worth flagging

NY's most recent text draft (c8063e1a, 2026-05-05 09:00) used **`provider: openai, model: gpt-4o, fallback_used: true`**. PP's drafts at the same time used **`provider: anthropic, model: claude-sonnet-4-6`**. Different LLM may produce different format-advisor outputs. NY's `system_prompt` is 1896 chars vs PP's 221 chars — much heavier prompt, possibly tipping NY into Anthropic rate limits or token caps and triggering OpenAI fallback. Worth investigating as a confounding variable, but unlikely to be the primary driver — the platform-agnostic advisor logic is the dominant signal.

## What's been ruled out

- **Client config differences are not the cause.** PP and NY have identical `client_ai_profile.platform_rules.youtube` (same structure, same target_seconds=45, same output_type=short_script, same include_stage_directions). They have identical `generation` parameters (temp 0.7, max 900 tokens). They have identical `client_publish_profile` for YouTube (mode=auto, status=active, video_generation_enabled=true, image_generation_enabled=false, max_per_day=2, min_gap_minutes=360).
- **`client_publish_profile` has no `preferred_format_youtube` column.** Format preference per-platform exists for Facebook/LinkedIn/Instagram but not YouTube. So there's no client-level override path currently exposed.
- **`f.canonical_content_body.content_class` not exercised.** It exists, may carry classifier output, but on the slot-driven v4 path most YT drafts have `digest_item_id=NULL` so the v3 join path doesn't apply. Need to trace the v4 path through `slot_id` to confirm what content the advisor actually sees.
- **video-worker is not the bug.** It successfully renders kinetic/stat MP4s when called with those formats — confirmed by 4 files in `post-videos` bucket.
- **youtube-publisher is not the format-selection bug.** It correctly publishes whatever it's given. It does exclude `video_short_avatar` from its `.in()` filter — that's a separate latent issue, not the active blocker.

## Open questions (require source visibility)

All of these require `RECONCILE-EF-DRIFT` to be resolved first:

1. **Where does `format-advisor-v1` live in the codebase?** Is it inside ai-worker v2.11.1 (a function/module) or a separate Edge Function called by ai-worker? Source sync of ai-worker will answer this.
2. **What inputs does the format advisor receive?** Just the slot's source content? Or also platform context, client persona, historical performance? Need to read the advisor's prompt construction.
3. **Does the advisor's prompt mention `platform`?** If yes, it's been told the platform but is ignoring it. If no, that's the gap to fill.
4. **Are video formats even listed as candidates for YouTube?** The advisor may be choosing among `[text, image_quote, video_short_kinetic, video_short_stat, video_short_avatar]` for all platforms. If `text` is in the YouTube candidate list, the advisor can pick it.
5. **What's `content_class` set to for the bodies in question?** If a content classifier is upstream of the advisor, classifier output might be a cleaner pre-filter than the advisor's free-form reasoning.
6. **Why is NY hitting OpenAI fallback (`fallback_used: true`)?** Anthropic rate limit? Token cap from NY's 1896-char system_prompt? Bug in provider routing? May be confounding the format-decision distribution between clients.
7. **What does `is_shadow: true` mean post-M5?** Memory says M5 removed `p_shadow` / `is_shadow` from the database tier. Why is the JSONB residue still being written? Is some code path still in shadow mode?

## Possible fix shapes (do NOT pre-commit to any of these)

List for thinking only. Do not start implementation until source is in repo.

- **Fix shape A — platform-aware advisor prompt:** Extend the format-advisor's system prompt to include `platform` and gate candidate formats: "For platform=youtube, candidates are kinetic / stat / avatar / kinetic_voice / stat_voice only. Never `text` or `image_quote`." Lowest-risk if the advisor is a simple LLM call.
- **Fix shape B — post-decision override:** Wrap the advisor result in a platform-specific check: `if platform == 'youtube' and format_decided in {'text','image_quote'}: format_decided = 'video_short_avatar'` (or some default video format). Mechanical fallback. Less elegant but verifiable.
- **Fix shape C — pre-filter candidate list:** Build the candidate list per-platform before calling the advisor, so the advisor never sees `text` as an option for YouTube. Cleaner separation of concerns than B.
- **Fix shape D — per-client `preferred_format_youtube` column:** Add to `c.client_publish_profile` mirror of FB/LI/IG. Allows clients to override default. Architectural change, not just code.

Which is right depends on the actual advisor architecture, which we'll see when source is committed.

## Out of scope for this brief

- ai-worker code changes (blocked on source sync)
- format-advisor prompt changes (blocked on source sync)
- youtube-publisher's `video_short_avatar` exclusion (separate latent issue)
- heygen-worker v1.1.0 column-vs-JSONB drift on `video_url` (separate latent issue)
- M6 queue integrity Phase A (paused; resumes once F-YT track closes)

## Next session restart point

When `RECONCILE-EF-DRIFT` is closed (source synced):

1. Read `supabase/functions/ai-worker/index.ts` (newly synced v2.11.1).
2. Locate `format-advisor-v1` — function name, module path, call site.
3. Read its prompt template + candidate-format list.
4. Decide between fix shapes A / B / C / D.
5. Author CC-stage brief at `docs/briefs/cc-stage-NN-yt-format-selection-fix.md` proposing the chosen fix.
6. Through D-01 review, apply, deploy, verify on next NY×YT slot draft.

## Constraint compliance

- Read-only investigation. No mutations.
- No EF deploys.
- No avatar Step 1 revival (still invalidated).
- M6 not started.
- Old D-01 review `a80cf579…` not cited as cleared (remains superseded).
- Old brief `brief_038_format_advisor_fix.md` (referenced in repo from earlier work) intentionally not consulted; that brief was written against pre-v2.11.1 state and may itself be superseded.
