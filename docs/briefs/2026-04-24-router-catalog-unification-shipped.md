# Router catalog unification — shipped 24 Apr 2026

**Status:** ✅ LANDED — Findings 2, 3, 5, 9 from the hardcoded-values audit closed. Bonus: Finding 6 auto-resolves when router functions are rewritten to read `content_pipeline`. Latent catalog-refresh bug fixed.

**Migration:** `router_catalog_unification_v4_trigger_disabled` (technically applied in pieces due to Supabase's migration-history wrapper conflicting with the event trigger — see incident notes below).

## What changed

### 1. `t.5.0_social_platform` extended for router use

Added two columns:

- `is_router_target BOOLEAN NOT NULL DEFAULT FALSE` — whether this platform is currently a router destination
- `content_pipeline TEXT` — which worker handles this platform's content. Values: `text_bundle | video_worker | external | owned_publish | none`

Populated for all 14 existing + 3 new platforms:

| Platform | router_target | pipeline |
|---|---|---|
| facebook, instagram, linkedin | ✅ | text_bundle |
| youtube | ✅ | video_worker |
| x, tiktok, reddit, threads, pinterest, medium, substack, telegram, whatsapp, discord | ❌ | external |
| blog, newsletter, website (new) | ❌ | owned_publish |

Three new rows added for values that were in-use but missing from the catalog:
- `blog` — 2 rows in c.client_platform_profile
- `newsletter` — 2 rows in c.client_platform_profile
- `website` — 12 rows in m.post_publish (legacy — flagged for future consolidation with `blog`)

### 2. Seven hardcoded CHECK constraints dropped

Replaced by 29 FK constraints pointing to the catalog tables. Full list:

**Platform FKs (18) → `t.5.0_social_platform(platform_code)`:**
- `m.post_draft`, `m.post_seed`, `m.post_publish`, `m.post_publish_queue`, `m.post_performance`
- `m.ai_job`, `m.ai_usage_log`, `m.platform_token_health`, `m.token_expiry_alert`
- `c.client_publish_profile`, `c.client_publish_schedule`, `c.client_channel`
- `c.client_format_config`, `c.client_platform_profile`, `c.content_type_prompt`, `c.content_series`
- `t.platform_format_mix_default`, `c.client_format_mix_override`

**Format FKs (11) → `t.5.3_content_format(ice_format_key)`:**
- `m.post_draft.recommended_format`
- `c.client_publish_profile.preferred_format_facebook/instagram/linkedin` (3)
- `c.client_format_config`, `m.post_format_performance`, `m.post_render_log`, `m.post_visual_spec`
- `c.content_series_episode.recommended_format`
- Plus cleanup: dropped my redundant duplicates where `_fkey` naming already existed on `t.platform_format_mix_default` and `c.client_format_mix_override` — pre-existing FKs retained, my additions removed.

### 3. Validation view tolerance (Finding 9)

`t.platform_format_mix_default_check` now uses `ABS(sum - 100) < 0.01` instead of strict `= 100`. Handles rounding drift legitimately.

### 4. CFW + Invegent digest_policy backfill (Finding 5)

Both had been running on hardcoded fallback defaults in `m.populate_digest_items_v1` (mode='strict', max_items=12). Both now have explicit `c.client_digest_policy` rows with the same values, stopping stealth-default behaviour.

Note: wrong CFW UUID in the earlier audit brief — actual is `3eca32aa-e460-462f-a846-3f6ace6a3cae`, not `3eca32aa-7bfc-498f-b3d9-b38df3c02d6f`. Session-memory carried forward a truncated-to-full mistranscription.

### 5. Duplicate UNIQUE cleanup

`t.5.0_social_platform` had two identical `UNIQUE(platform_code)` indexes. Dropped the unused one (`uq_social_platform_platform_code`); kept `uq_social_platform_code` which all FKs depend on.

### 6. `k.refresh_column_registry` robustness fix (bonus)

**The bug:** when any column had 2+ FKs, the function's fk CTE produced duplicate rows, which made the INSERT...ON CONFLICT statement fail with "cannot affect row a second time". This broke the event trigger on every DDL firing.

Because this function runs via `trg_k_refresh_catalog` event trigger on every DDL statement, once it broke it stayed broken for the entire migration, triggering a cascade of apparent failures.

**The fix:** added `DISTINCT ON (table_schema, table_name, column_name)` in the fk CTE, ordered by constraint_name deterministically. When a column has 2+ FKs, pick the alphabetically-first constraint. k.column_registry can only hold one FK ref per column (scalar columns, not arrays) — this is the correct shape.

## Incident notes — what went wrong and why the migration was messy

Three failed migration attempts before one succeeded cleanly. Root causes discovered in sequence:

1. **v1** — INSERT value-count mismatch (31 cols, 32 values on newsletter row)
2. **v2** — missed that `m.post_publish` had 12 legacy rows with `platform='website'`; initial orphan sweep only covered post_draft
3. **v3** — two pre-existing FKs (`*_ice_format_key_fkey`) that I didn't know about; my migration added redundant FKs creating the multi-FK-on-same-column condition that broke `k.refresh_column_registry`
4. **v4** — disabling the event trigger, letting v3's already-landed changes persist, cleaning up the 2 duplicate FKs I'd added, fixing the refresh function, then re-enabling the trigger

The `k.refresh_column_registry` bug was a pre-existing latent issue — waiting for any future migration to create a legitimate 2+FK column. Fixed as part of this work so it doesn't recur.

## What this unblocks

**Findings 2+3 (format+platform catalogs):** closed. Vocabulary drift fixed at schema level. New platforms/formats now added by row insert, not DDL migration. A CHECK constraint adding a new format is impossible — the FK enforces catalog membership instead.

**Finding 5 (stealth digest_policy defaults):** closed. All 4 active clients have explicit policy rows.

**Finding 6 (`NOT IN ('youtube')` hack in `seed_client_to_ai_v2`):** unblocked. The fix is now a 1-line change: replace the hardcoded exclusion with `platform IN (SELECT platform_code FROM t."5.0_social_platform" WHERE content_pipeline = 'text_bundle')`. Bundle this into R6's seed-and-enqueue rewrite.

**Finding 9 (view tolerance):** closed.

**Catalog-refresh robustness (bonus):** `k.refresh_column_registry` now handles any column that has 2+ FKs. Future migrations with legitimate multi-FK situations won't break the event trigger.

## What's still outstanding from the audit

- **Finding 1** (client UUIDs hardcoded in `m.enqueue_publish_from_ai_job_v1` trigger): not touched. Bundle into R6's hot-path PR — the trigger itself is being reconsidered there.
- **Finding 4** (`seed_and_enqueue_ai_jobs_v1` demand formula hardcoding): same — R6 integration.
- **Finding 7** (job priority magic numbers): deferred until TPM matters.
- **Finding 8** (AI provider CHECK): acceptable as-is per audit.

## Files touched

DB only — no app code changes. DDL migrations applied directly via Supabase MCP.

## Verification queries (for any future check)

```sql
-- Are all in-use platform values present in the catalog?
SELECT DISTINCT platform FROM m.post_draft WHERE platform IS NOT NULL
EXCEPT SELECT platform_code FROM t."5.0_social_platform";
-- Expected: zero rows

-- Are all in-use format values present in the catalog?
SELECT DISTINCT recommended_format FROM m.post_draft WHERE recommended_format IS NOT NULL
EXCEPT SELECT ice_format_key FROM t."5.3_content_format" WHERE ice_format_key IS NOT NULL;
-- Expected: zero rows

-- Validation view returns 'ok' for all 4 router platforms?
SELECT * FROM t.platform_format_mix_default_check;
-- Expected: all rows show status='ok'

-- All active clients have digest_policy rows?
SELECT cl.client_name,
       COALESCE(cdp.mode, 'MISSING') AS policy_state
FROM c.client cl
LEFT JOIN c.client_digest_policy cdp ON cdp.client_id = cl.client_id
WHERE cl.status = 'active';
-- Expected: no 'MISSING'

-- Event trigger enabled?
SELECT evtenabled FROM pg_event_trigger WHERE evtname = 'trg_k_refresh_catalog';
-- Expected: 'O'
```

## Decision log

- **Canonical vocabulary source:** `m.post_draft` superseded by `t.5.0_social_platform` + `t.5.3_content_format` (both already existed from Dec 2025 / Mar 2026, pre-dating my audit). No new catalog tables created. Correct outcome: zero parallel structures.
- **Deprecated formats (image_ai, video_slideshow, video_avatar, video_voiceover):** left alone — none are in active use; their absence from the format catalog doesn't block anything. Follow-up if any dashboard code hardcodes these strings.
- **Blog vs website:** both kept as distinct rows to preserve the 12 historical `m.post_publish` rows verbatim. Future cleanup could consolidate — noted in the `website` row's description.
- **Fix vs work around refresh_column_registry bug:** fixed properly with DISTINCT ON. Aligns with the "make things dynamic and robust" direction PK pushed during this audit.
