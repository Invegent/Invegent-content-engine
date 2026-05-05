# 2026-05-05 Sydney evening — F-YT-OAUTH-PP restored (Property Pulse)

**Session length (chat):** ~1h
**Status at close:** F-YT-OAUTH-PP closed for Property Pulse. F-YT-NY-FORMAT-SELECTION brief committed (queued behind RECONCILE-EF-DRIFT). RECONCILE-EF-DRIFT remains queued. M6 untouched.

---

## TL;DR

Property Pulse YouTube has been dark since 2026-04-01 because the OAuth refresh token was rejected by Google with `invalid_grant`. PK reconnected PP + NY YouTube via the in-house `dashboard.invegent.com/connect` flow (which I had not previously known existed and which superseded my staged Template 1 SQL). After verification confirmed both clients had fresh 103-char refresh_tokens, PK directed me to run Template 2 — a bounded UPDATE flipping 4 stuck PP×YT drafts back to publisher-eligible. D-01 cleared first-fire (review `91caf322-213d-4994-b781-abb54acc70b9`). Both subsequent youtube-publisher cron firings (`:15` and `:45` UTC) successfully uploaded all 4 PP×YT videos to YouTube. First PP×YT pipeline-driven publishes in ~5 weeks. While monitoring between cron firings, ran a behavioural-only investigation into the secondary blocker (NY×YT 100% text-format) and committed an investigation brief at `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` (commit `ff5ae6ae`).

## Origin and prior session continuity

This session opened on a transcript-compacted summary referencing F-YT-ASSET-GEN-GAP. The prior turn's diagnosis had been corrected from "asset generation gap" to "PP YouTube OAuth invalid_grant" via Option A-lite behavioural observation. PK had reconnected via dashboard, Template 1 SQL had been superseded, and Template 2 was staged but unrun. This session executes Template 2 and verifies the end-to-end fix.

## What happened (chronological)

### 09:02–09:03 UTC — PK reconnects YouTube OAuth via dashboard

PK ran the OAuth reconnect flow for both NDIS-Yarns and Property Pulse via `dashboard.invegent.com/connect`. URL flow witnessed in screenshots:

- `dashboard.invegent.com/connect` (initial state) — both NY×YT and PP×YT showing red "Connect" buttons
- `dashboard.invegent.com/clients?tab=connect&success=NDIS-Yarns%20connected%20successfully` — NY×YT now shows expiry 5 May 2031
- `dashboard.invegent.com/clients?tab=connect&success=Property%20Pulse%20connected%20successfully` — both NY×YT and PP×YT show expiry 5 May 2031

This flow had been built earlier as part of the dashboard's Connect tab. Code-search for `youtube oauth` in invegent-dashboard returned 0 hits — the search was either path-restricted or the OAuth integration uses different terminology in source. Important standing rule going forward: assume the dashboard `/connect` page handles platform reconnects and use it before falling back to OAuth Playground.

### 09:08 UTC — Verification of dashboard write

Queried `c.client_channel` for YouTube rows belonging to PP and NY:

| client | platform | updated_at | refresh_token present | length | length_ok | enabled |
|---|---|---|---|---|---|---|
| ndis-yarns | youtube | 09:02:00 | true | 103 | true | true |
| property-pulse | youtube | 09:03:02 | true | 103 | true | true |

103 chars is the canonical Google `refresh_token` length. Both clients' `c.client_channel.config.refresh_token` updated within the previous ~6 minutes. `is_enabled=true`, `channel_id` present. Dashboard wrote to exactly the field youtube-publisher reads.

### 09:09 UTC — Confirm exhaustive scope of stuck drafts

Queried `m.post_draft` for all rows at `video_status='failed'` for `platform='youtube'` across full history. Result: exactly 4 rows, all PP×YT, all with `youtube_upload_error` matching `invalid_grant`, all with `video_url` populated, all in (kinetic, stat) format. Same set previously enumerated; no older or hidden failed drafts.

### 09:10 UTC — D-01 fire on Template 2

Fired `ask_chatgpt_review` with `action_type=sql_destructive` and full bounded-mutation context: 4-UUID list, state guards, idempotency, reversibility, OAuth-state evidence, exact SQL.

**Result:** review_id `91caf322-213d-4994-b781-abb54acc70b9`. `verdict=agree`, `risk_level=medium`, `confidence=high`. No pushback points. No assumptions flagged as weak. Reviewer did note two assumptions (token verification will allow retries; state guards prevent unintended rows) — both well-founded given the verification already performed.

**T-MCP-08 +1 (counter-pattern to Lesson #62):** strong evidence + bounded scope + reversibility + PK pre-approval all clear D-01 first-fire even on `sql_destructive`. Continues the v2.38 clean-proceed pattern (now 3-of-3 across M5 original + M5 corrected + Template 2).

### 09:11 UTC — Template 2 applied via Supabase MCP

```sql
UPDATE m.post_draft
SET video_status = 'generated',
    draft_format = draft_format - 'youtube_upload_error' - 'youtube_upload_attempted',
    updated_at   = now()
WHERE post_draft_id IN (
        '4f07da94-986c-47e4-b9a9-b304004111b0',
        '53b16d45-9f70-4381-b025-3903710828b4',
        'e59a561d-3b80-46be-a641-cdd26941e027',
        '2cc22fce-2bd4-445b-802e-5ba3789f8595'
      )
  AND video_status = 'failed'
  AND video_url   IS NOT NULL
RETURNING ...
```

4 rows returned, all `video_status='generated'`, all `upload_error_cleared=true`, all `has_video_url=true`. Idempotent. Reversible. Drafts now match youtube-publisher's eligibility filter.

### 09:15 UTC — First cron 34 firing post-Template-2

cron 34 (`youtube-publisher-every-30min`, schedule `15,45 * * * *`) fired. `cron.job_run_details` shows `succeeded`, return_message `1 row`. youtube-publisher's `.limit(2)` cap meant 2 of 4 drafts uploaded.

Verification at ~09:23 UTC showed:

| post_draft_id | format | YouTube video ID | published_at |
|---|---|---|---|
| 4f07da94-... | video_short_kinetic | `fD3_BmOegaY` | 09:15:09 |
| 2cc22fce-... | video_short_kinetic | `FU6AwvULcAs` | 09:15:13 |

Both `m.post_publish` rows created. `pp_status='published'`. `draft_format.youtube_upload_error` not rewritten (clean upload).

### 09:24–09:46 UTC — Holding window: Storage check + NY×YT brief

With 21 minutes until the next firing, ran two productive read-only items per PK approval:

**B — Storage sanity check on remaining 2 stat-format drafts.** Queried `storage.objects` directly for the `_stat.mp4` files referenced by the remaining drafts' `video_url`. Both files present in `post-videos` bucket, sizes 150,655 and 154,840 bytes, mimetype `video/mp4`, paths matched `video_url` exactly. The :45 firing would have real bytes to upload.

**A — F-YT-NY-FORMAT-SELECTION investigation brief.** Behavioural-only diagnosis of the secondary blocker discovered during F-YT-ASSET-GEN-GAP. Key findings:

- ai-worker v2.11.1 invokes a separate component `format-advisor-v1` (visible in `m.post_draft.draft_format.ai.format_advisor_key`) that decides `recommended_format` based on content shape
- Format reasoning is full natural language stored in `draft_format.ai.format_reason` — readable, content-driven, e.g. "the title contains a striking numeric stat — '90% of banks hike mortgage rates' — that anchors the story and is ideal for a stat reveal animation"
- The advisor is **platform-agnostic**: it reasons about content shape (stats, structured breakdowns, pull quotes, dollar figures) without considering that YouTube specifically cannot publish text-format drafts
- NY's content (NDIS policy/opinion) lacks the visual hooks the advisor wants → 100% text → 0% YouTube publish viability
- PP's content (property news with rates/percentages) sometimes has the hooks → 24% video → publishes when video format chosen
- PP and NY YouTube configs are **identical** (`client_ai_profile.platform_rules.youtube`, `generation`, `client_publish_profile.video_generation_enabled`, etc.) — ruled out as cause
- Bonus signals to track: NY's text drafts hit OpenAI fallback (`fallback_used: true`, `gpt-4o`) while PP stayed on Anthropic, suggesting NY's heavier system_prompt may push it into rate limits or token caps; `is_shadow: true` JSONB residue persists in `draft_format.ai` despite M5 column removal — investigate post-source-sync

Brief committed at `docs/briefs/2026-05-05-f-yt-ny-format-selection.md`, commit `ff5ae6ae2fd`. **Frames the bug only — does NOT propose a fix.** 4 candidate fix shapes listed (advisor prompt extension / post-decision override / pre-filter candidates / per-client column) with no pre-commitment. Resolution path requires `RECONCILE-EF-DRIFT` to be closed first so I can read v2.11.1's actual source.

### 09:45 UTC — Second cron 34 firing

cron 34 fired. `succeeded`, `1 row`. The remaining 2 stat-format drafts processed.

### 09:48 UTC — Final verification

| post_draft_id | format | YouTube video ID | published_at |
|---|---|---|---|
| 53b16d45-... | video_short_stat | `vRTXpKrf56k` | 09:45:11 |
| e59a561d-... | video_short_stat | `1_YU6Yc_FfI` | 09:45:17 |

Both `m.post_publish` rows created. Both `video_status='published'`. No `youtube_upload_error` written by publisher's catch handler. Clean.

## Final outcome — F-YT-OAUTH-PP RESTORED

All 4 PP×YT drafts that were rendered before the OAuth issue interrupted them have now successfully uploaded to YouTube:

| post_draft_id | format | YouTube video ID | URL | published_at |
|---|---|---|---|---|
| `4f07da94-986c-47e4-b9a9-b304004111b0` | video_short_kinetic | `fD3_BmOegaY` | https://youtu.be/fD3_BmOegaY | 09:15:09 |
| `2cc22fce-2bd4-445b-802e-5ba3789f8595` | video_short_kinetic | `FU6AwvULcAs` | https://youtu.be/FU6AwvULcAs | 09:15:13 |
| `53b16d45-9f70-4381-b025-3903710828b4` | video_short_stat | `vRTXpKrf56k` | https://youtu.be/vRTXpKrf56k | 09:45:11 |
| `e59a561d-3b80-46be-a641-cdd26941e027` | video_short_stat | `1_YU6Yc_FfI` | https://youtu.be/1_YU6Yc_FfI | 09:45:17 |

All uploaded as unlisted (youtube-publisher v1.6.0 default). First pipeline-driven YT publishes for Property Pulse since 2026-04-01 (~5 weeks dark). End-to-end pipeline confirmed working: ai-worker v2.11.1 → video-worker v2.1.0 → Supabase Storage → youtube-publisher v1.6.0 → YouTube Data API → `m.post_publish`.

## Decisions made this session

- **D-YT-OAUTH-1 (5 May):** Treat invegent-dashboard `/connect` and `/clients?tab=connect` as the canonical reconnect path for FB/IG/LI/YT OAuth tokens. OAuth Playground / Google Cloud Console flow is fallback only. (Reflected as memory edit.)
- **D-YT-OAUTH-2 (5 May):** F-YT-OAUTH-PP closed for Property Pulse. NY×YT not part of this finding — NY has no historical YT publishes and no failed drafts; reconnect was precautionary.
- **D-RECONCILE-1 (5 May):** RECONCILE-EF-DRIFT remains P1 and blocks all EF code patches. PK runs `npx supabase functions download` locally when ready; reply "synced" to unblock.
- **D-NY-FORMAT-1 (5 May):** F-YT-NY-FORMAT-SELECTION queued behind RECONCILE-EF-DRIFT. No fix attempted until source available.
- **D-M6-1 (5 May):** M6 Phase A remains the next sequenced item but is now ranked behind RECONCILE-EF-DRIFT and the NY×YT format-selection investigation. PK directs.

## Standing rules honoured

- **D-01:** 1 fire this session (Template 2). review_id `91caf322`. Cleared first-fire, no escalation, no pushback. T-MCP-02 quota: 33 → 34.
- **Lesson #61 (P1 pre-flight):** state captured immediately before Template 2 apply (full draft enumeration, OAuth state verification, storage sanity, scope confirmation). T-MCP-14 (re-snapshot rule) implicitly honoured — only ~2 minutes between final state-check and Template 2 D-01 fire.
- **G1 convention:** session record at `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md`; sync_state.md updated as pointer index only.
- **D170:** Template 2 applied via Supabase MCP `execute_sql` (DML on existing schema). No `apply_migration` needed.
- **D-186 closure budget:** ~1h closure attributable this session (mostly verification + D-01 + brief authoring). Day total ~7h. Trailing-14d ~26h. Above 8.0 floor.
- **No EF deploys.** No code patches. No M6.
- **Old D-01 review `a80cf579-c3c2-4e92-8374-d8d051220dd5` (the superseded F-YT avatar Step 1 review)** never cited as cleared. Remains superseded.

## Lessons reinforced / candidates

- **Counter-pattern to Lesson #62 (state-capture override) — clean proceeds on bounded production DML when evidence is strong.** This session's Template 2 D-01 cleared first-fire. Combined with v2.38's M5 original + corrected packets, that's 3-of-3 clean proceeds across `sql_destructive` actions in 24h. Pattern observed in all three: PK pre-approves + change is bounded + evidence is empirically grounded + rollback path explicit. Track for T-MCP-06 nuance — the `sql_destructive` category does not deterministically escalate.
- **Behavioural-only diagnosis without source can produce well-grounded investigation briefs.** F-YT-NY-FORMAT-SELECTION was scoped, characterised, and 4 candidate fix shapes identified entirely from production data (`m.post_draft.draft_format.ai.format_reason`, config comparison, format distribution by client × platform). The `format_advisor_key` field made the architecture self-revealing without source access.
- **Code search is not exhaustive.** GitHub MCP `search_code` returned 0 hits for `youtube oauth` against invegent-dashboard despite the OAuth flow being live and shown in screenshots. Don't conclude a feature is missing from a 0-hit search — assume code may not be indexed and check with PK. (Reflected as memory edit.)
- **`net._http_response` is unreliable for recent rows.** During monitoring, drafts in `m.post_draft` showed clear evidence of publisher cron at 09:15 (timestamps 09:15:09, 09:15:13) but `net._http_response` did not contain corresponding rows for that firing. `cron.job_run_details` is the authoritative source for cron firing timing.

## Honest limitations

- **Did not verify NY×YT OAuth end-to-end.** NY has zero historical YT video drafts (only 2 test avatar drafts from 2026-04-09 that never published). Cannot prove NY's new refresh_token works for upload until ai-worker selects a video format for NY×YT — which is currently 0% of the time per F-YT-NY-FORMAT-SELECTION.
- **HeyGen-hosted URLs in 2 NY avatar test drafts have expired** (`?Expires=1776301302` ≈ 15 Apr 2026). Not actionable; latent issue noted in F-YT-NY-FORMAT-SELECTION brief.
- **`is_shadow: true` JSONB residue in `draft_format.ai` persists post-M5.** Memory entry #14 noted this risk; M5 dropped column + indexes but legacy code paths still write the JSONB key. Not a regression; investigated post-source-sync.
- **F-YT-NY-FORMAT-SELECTION fix path is unconfirmed.** Brief lists 4 candidate fix shapes; the actual implementation depends on `format-advisor-v1`'s architecture which is not visible without source sync.
- **Brief `brief_038_format_advisor_fix.md` (referenced in repo from earlier work) intentionally not consulted.** That brief was written against pre-v2.11.1 state and may itself be superseded.

## Recommended next session start

In order:

1. **RECONCILE-EF-DRIFT source sync** — PK runs the four `npx supabase functions download` commands locally and commits as a sync-only commit. Until this is done, no EF code patches are safe.
2. **F-YT-NY-FORMAT-SELECTION diagnosis** — read newly-synced `ai-worker/index.ts` v2.11.1 source, locate `format-advisor-v1`, read its prompt template + candidate format list, decide between the 4 candidate fix shapes from the brief.
3. **M6 Phase A** — only if no live issue outranks it. The 108 historical Bug 3 fingerprint dead-letter is still ready (v2.36 brief reusable).

## Files changed this session

- **NEW** `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` — investigation brief (commit `ff5ae6ae`)
- **NEW** `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` — this file (this commit)
- **MODIFIED** `docs/00_sync_state.md` — pointer index updated (this commit)
- **MODIFIED** `docs/00_action_list.md` — bumped to v2.39 (this commit)

## Database mutations this session

- **1 mutation:** Template 2 UPDATE on `m.post_draft` for 4 specific UUIDs. D-01 cleared `91caf322`. 4 rows affected. Idempotent, reversible.

No schema changes. No new migrations. No EF deploys.

---

*End of session record.*
