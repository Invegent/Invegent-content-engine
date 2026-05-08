-- F-YT-PUB-AVATAR-EXCLUSION — Option (b)
-- Remove the "youtube" key from t."5.3_content_format".platform_support
-- for format_key = 'video_short_avatar'.
--
-- Applied 2026-05-08 05:24:00 UTC via Supabase MCP apply_migration on
-- project mbkmaxqhsohbtwsqolns. This file is the audit-trail copy.
--
-- Rationale:
--   ai-worker v2.12.0 (commit 1ccfe9a2, 2026-05-08) introduced an opt-in
--   candidate filter that surfaces video_short_avatar for YouTube because
--   the catalog has youtube:true. However:
--     1. youtube-publisher v1.6.0 .in() filter excludes avatar (only allows
--        the 4 Creatomate-rendered formats: video_short_kinetic,
--        video_short_kinetic_voice, video_short_stat, video_short_stat_voice).
--     2. heygen-worker v1.1.0 hardcodes 1280x720 landscape, which is
--        incompatible with YouTube Shorts 9:16 vertical requirement.
--   This migration flips the catalog to match the publisher's actual
--   capability — advisor stops considering avatar for YouTube. FB/IG/LI
--   support is preserved.
--
-- Cross-publisher audit (read-only, performed pre-apply):
--   - publisher (FB) v1.8.0: no format filter, no catalog read; unaffected
--   - instagram-publisher v2.0.0: hard-coded IG_VIDEO_FORMATS Set in source
--     (includes avatar), no catalog read; unaffected. NDIS-Yarns IG
--     publish_enabled=false standing hold.
--   - linkedin-publisher v1.2.0: text-only commentary, no format awareness,
--     repo-only (not deployed); unaffected.
--
-- Simulated candidate-set diff under v2.12.0 fetchFormatContext semantics:
--   pre:  fb=10  li=4  ig=5  yt=5  yt_video_short=[avatar,kinetic,kinetic_voice,stat,stat_voice]
--   post: fb=10  li=4  ig=5  yt=4  yt_video_short=[kinetic,kinetic_voice,stat,stat_voice]
--
-- Idempotent: 'AND platform_support ? youtube' guard makes re-runs a no-op.
-- Reversible: UPDATE t."5.3_content_format"
--             SET platform_support = jsonb_set(platform_support, '{youtube}', 'true'::jsonb),
--                 updated_at = now()
--             WHERE format_key = 'video_short_avatar'
--               AND NOT platform_support ? 'youtube';
-- Scope: single-row UPDATE; no DDL; no other schema changes.
--
-- F-HEYGEN-WORKER-LANDSCAPE-DIMENSION (P3 backlog) is the proper home for
-- the heygen-worker dimension fix and downstream re-enable of avatar→YT.
--
-- D-01 review trail:
--   - Fire #1 review_id 8bd6ac37-fa9e-43af-803f-75a171080554:
--       escalate_explicit_flag, pushback on incomplete cross-publisher audit.
--   - Fire #2 review_id fa4322e5-69a7-4b77-a745-cdd0296dccc4 (re-fire after
--     empirical audit per Lesson #62 v2.50 testable-corrected-action path):
--       agree, risk_low, confidence_high, 0 pushback, 0 escalation.

UPDATE t."5.3_content_format"
SET platform_support = platform_support - 'youtube',
    updated_at = now()
WHERE format_key = 'video_short_avatar'
  AND platform_support ? 'youtube';
