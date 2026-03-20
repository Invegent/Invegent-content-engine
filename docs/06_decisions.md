# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044 — YouTube Shorts Pipeline Stage A: Silent MP4 via Creatomate
**Date:** 20 March 2026 | **Status:** ✅ Complete

Silent 9:16 MP4 renders via Creatomate. video_short_kinetic + video_short_stat.
ai-worker v2.6.0 generates video_script JSON. video-worker v1.0.0 renders.
Formats gated off (is_enabled=false) until credentials confirmed.

---

## D045 — YouTube Shorts Pipeline Stage B: ElevenLabs Voice + YouTube Upload
**Date:** 20 March 2026 | **Status:** ✅ Complete

**Decision:**
With both ElevenLabs voices confirmed (NDIS Yarns + Property Pulse), wire Stage B
in a single session: TTS into MP4 + YouTube Data API v3 upload.

**Implementation (20 Mar 2026):**

video-worker v2.0.0:
- `generateAndUploadVoice()`: ElevenLabs TTS → MP3 → Supabase Storage → public URL
- Voice ID resolved per client slug: `ELEVENLABS_VOICE_ID_{SLUG_UPPER}`
  Falls back to `ELEVENLABS_VOICE_ID_NDIS` / `ELEVENLABS_VOICE_ID_PP`
- Audio element added to Creatomate render spec: `{type: 'audio', source: audioUrl, time: 0}`
- `processDraft()` handles all 4 video formats, `withVoice` flag controls audio path
- Stage A silent formats unchanged — same code path, audioUrl = null

youtube-publisher v1.0.0:
- `refreshAccessToken()`: POST to oauth2.googleapis.com/token with refresh_token
- `uploadToYouTube()`: multipart upload (JSON metadata + binary MP4)
- Uploads as `unlisted` by default — PK manually changes to public after review
- Writes `youtube_video_id` + `youtube_url` to `draft_format` jsonb
- Writes to `m.post_publish` (platform='youtube') for cross-platform consistency
- pg_cron job 34: every 30min at :15 and :45 (offset from video-worker at :00 and :30)

Format registry updated:
- `video_short_kinetic_voice`, `video_short_stat_voice`: `is_buildable=true`
- `video_long_explainer`, `video_long_podcast_clip`, `video_short_avatar`: remain `is_buildable=false` (Stage C)

Voices confirmed:
- NDIS Yarns: `iamiUYVj7ixJcRZQkS8B` — Australian female, warm/professional
- Property Pulse: `YCxeyFA0G7yTk6Wuv2oq` — confident/measured male

**To activate voice formats:**
```sql
UPDATE c.client_format_config
SET is_enabled = true
WHERE ice_format_key IN ('video_short_kinetic_voice', 'video_short_stat_voice')
  AND client_id = '<client_id>';
```

**To add external client YouTube channel:**
1. Client grants Channel Manager access to pk@invegent.com
2. OAuth Playground → get refresh token for that channel
3. Add `YOUTUBE_REFRESH_TOKEN_{CLIENT_SLUG_UPPER}` secret to Supabase
4. Update `c.client_channel` row with real `channel_id`
5. No code changes needed

**Stage C (future):**
- `video_short_avatar`: HeyGen API, AI talking head
- `video_long_explainer`: multi-scene narrated, 3-8 min
- `video_long_podcast_clip`: waveform + captions from podcast RSS

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Activate video formats for clients | `UPDATE c.client_format_config SET is_enabled=true` for desired formats | Now ready |
| Update c.client_channel with real YouTube channel IDs | OAuth Playground to get refresh tokens | Stage B setup |
| YouTube Stage C — HeyGen avatar, long-form | `video_short_avatar`, `video_long_explainer` | Phase 4 |
| m.post_format_performance population | insights-worker per-format engagement aggregates | Phase 2.1 completion |
| AI Diagnostic Agent — Tier 2 | After 1-2 weeks of Tier 1 validation | ~1 Apr 2026 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| Prospect demo generator | Needs scoping conversation | Phase 3 |
| Client health weekly report (email) | 2 days. Retention driver. | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
