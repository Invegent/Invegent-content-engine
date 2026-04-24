# Router Track — Hardcoded Values Audit

**Draft date:** 24 Apr 2026 late-evening
**Status:** 🔲 AUDIT COMPLETE — awaiting PK weekend review
**Trigger:** PK caught the classifier spec was hardcoded; asked "is anything else hardcoded in the CWR router work?" This audit answers that.
**Scope:** All R1-R3 shipped infrastructure (D167) + R4 spec just written + router-adjacent functions that R6 will integrate with (`seed_and_enqueue_ai_jobs_v1`, `seed_client_to_ai_v2`, `populate_digest_items_v1`, `enqueue_publish_from_ai_job_v1`, `publisher_lock_queue_v2`).

## Summary — 9 findings, 3 severity tiers

| # | Finding | Severity | Recommendation |
|---|---|---|---|
| 1 | `m.enqueue_publish_from_ai_job_v1` — **client UUIDs + per-client queue caps + cadence gaps hardcoded in trigger function body** | 🔴 HIGH | Move to `c.client_publish_profile` columns; align with already-existing `min_gap_minutes` + `max_per_day` |
| 2 | Format vocabulary — **13 format keys duplicated across 4 CHECK constraints with drift** (13 vs 7 vs 7 vs 7) | 🔴 HIGH | `t.format_catalog` table, D167-pattern versioning |
| 3 | Platform vocabulary — **4/4/8 platform values across 3 CHECKs with drift** | 🔴 HIGH | `t.platform_catalog` table with `is_router_target` + `content_pipeline` attributes |
| 4 | `m.seed_and_enqueue_ai_jobs_v1` — **demand formula `CEIL(slots * 1.5)` and default max_per_day `2` hardcoded** | 🟡 MEDIUM | `t.router_policy_default` settings row + optional per-client override |
| 5 | `m.populate_digest_items_v1` — **stealth defaults `mode='strict'` + `max_items=12` for missing policy rows** | 🟡 MEDIUM | Same settings row, or require explicit policy row |
| 6 | `m.seed_client_to_ai_v2` — **`NOT IN ('youtube')` exclusion** for content pipeline | 🟡 MEDIUM | Platform catalog attribute `content_pipeline` |
| 7 | `m.seed_and_enqueue_ai_jobs_v1` + `seed_client_to_ai_v2` — **job priority magic numbers (100, 120)** | 🟢 LOW | Profile-driven when TPM saturation matters |
| 8 | `c.client_ai_profile.provider` CHECK — 4 hardcoded AI providers | 🟢 LOW | Acceptable; providers rarely change |
| 9 | `t.platform_format_mix_default_check` view — **strict `= 100` equality** (no tolerance) | 🟢 LOW | Switch to `ABS(sum - 100) < 0.01` when a legitimate override produces a rounding drift |

---

## Finding 1 — Client UUIDs hardcoded in `m.enqueue_publish_from_ai_job_v1` 🔴

**This is exactly the pattern we just dropped two orphaned v1 seed functions for.** Only this one is live, running on every ai_job UPDATE.

The trigger function encodes per-client queue caps and cadence gaps using client UUIDs directly in SQL:

```sql
IF new.platform = 'facebook' THEN
  if new.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid then
    v_max_queued := 20; v_min_gap := interval '90 minutes';   -- Property Pulse
  elsif new.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid then
    v_max_queued := 10; v_min_gap := interval '180 minutes';  -- NDIS Yarns
  else
    v_max_queued := 10; v_min_gap := interval '120 minutes';  -- default (CFW, Invegent)
  end if;
ELSIF new.platform = 'linkedin' THEN
  ...
ELSIF new.platform = 'instagram' THEN
  ...
END IF;
```

### Why this is bad (the PK principle applied)

1. **Client UUIDs in function code.** Same thing you called out on the orphaned v1 seeds: "client or brand specific functions are not good because we are working with a robust system, which is the same pipeline for everybody."

2. **Adding a new client requires editing the trigger function.** Invegent doesn't appear. Neither does CFW explicitly. They fall into the `else` branch by accident — not by config.

3. **Duplicate source of truth for cadence.** Look at `publisher_lock_queue_v2` — it reads `cpp.min_gap_minutes` and `cpp.max_per_day` from `c.client_publish_profile` already. The enqueue trigger is applying a DIFFERENT set of per-client numbers from hardcoded code. Two sources of truth; they may or may not agree; silent drift if one changes.

4. **Cannot change a cap without a migration.** Want to raise PP's Facebook cap from 20 to 25 for a busy policy week? Rewrite trigger, deploy, hope nothing else breaks.

5. **Observability is zero.** No dashboard view answers "what are the per-client queue caps right now?" The answer is in function source code.

### The fix

Add two columns to `c.client_publish_profile`:

```sql
ALTER TABLE c.client_publish_profile
  ADD COLUMN max_queued_depth INT,         -- how many items deep queue can go
  ADD COLUMN queue_min_gap_minutes INT;    -- minimum gap between scheduled items in queue
```

(`min_gap_minutes` and `max_per_day` already exist — but those govern the PUBLISH rate, not the QUEUE depth. The two concerns are legitimately different and should stay separated.)

Rewrite the trigger to read from the profile:

```sql
SELECT max_queued_depth, queue_min_gap_minutes
  INTO v_max_queued, v_min_gap_mins
FROM c.client_publish_profile
WHERE client_id = new.client_id AND platform = new.platform;

v_min_gap := make_interval(mins => v_min_gap_mins);
```

Backfill current hardcoded values into the profile rows for the 2 clients that currently have overrides. Default values land in the profile rows via the regular defaults mechanism.

**Effort:** 1 hour. Zero hot-path risk (trigger reads same data, new source).

**Recommendation:** bundle with R6. Hot path is already being touched there; shared migration makes sense.

---

## Finding 2 — Format vocabulary duplicated across 4 CHECK constraints with drift 🔴

Four separate CHECK constraints encode the format vocabulary:

| Location | Values | Count |
|---|---|---|
| `m.post_draft.recommended_format` | text, image_quote, carousel, animated_text_reveal, animated_data, video_short, video_short_kinetic, video_short_stat, video_short_kinetic_voice, video_short_stat_voice, video_short_avatar, video_long_explainer, video_long_podcast_clip | 13 |
| `c.client_publish_profile.preferred_format_facebook` | text, image_quote, carousel, image_ai, video_slideshow, video_avatar, video_voiceover | 7 |
| `c.client_publish_profile.preferred_format_instagram` | (same 7 as FB) | 7 |
| `c.client_publish_profile.preferred_format_linkedin` | (same 7 as FB) | 7 |

### The drift is worse than the duplication

Note: `video_short_kinetic`, `video_short_stat`, `video_short_avatar`, `animated_data` — all in `m.post_draft` but NOT in `c.client_publish_profile.preferred_format_*`. Conversely: `image_ai`, `video_slideshow`, `video_avatar`, `video_voiceover` — in the preferred_format CHECKs but not in post_draft.

These were added at different times and the vocabularies don't match. Result: a client can't set `preferred_format_facebook = 'video_short_avatar'` because the CHECK rejects it — even though that format exists in `m.post_draft` AND in `t.platform_format_mix_default` seed data.

`t.platform_format_mix_default.ice_format_key` meanwhile has NO CHECK at all — it's a free text column, whatever we seeded. So the router's "vocabulary" is actually three different vocabularies that partially overlap.

### The fix (same pattern as R4 v2 classifier)

```sql
CREATE TABLE t.format_catalog (
  format_catalog_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_code        TEXT NOT NULL,            -- 'video_short_kinetic'
  format_name        TEXT NOT NULL,            -- 'Short kinetic video'
  description        TEXT,
  output_kind        TEXT NOT NULL,            -- 'text' | 'image' | 'video' | 'carousel'
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  version            TEXT NOT NULL,
  effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by      UUID REFERENCES t.format_catalog(format_catalog_id),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT format_catalog_code_version_uniq UNIQUE (format_code, version)
);

CREATE UNIQUE INDEX format_catalog_one_current_per_code
  ON t.format_catalog (format_code) WHERE is_current = TRUE;
```

Drop all four hardcoded format CHECKs. Classifier / router / drafts / publish profile all read `format_code` from `t.format_catalog` as source of truth. FK enforces referential integrity at insert time.

**Migration complexity:** MEDIUM. Need to:
1. Build the catalog table + seed it with the union of current values
2. Reconcile the 13-vs-7 drift (decide per value whether it's current)
3. Drop the 4 CHECK constraints
4. Add FK from each column to `format_catalog.format_code`
5. Any app code that hardcodes format strings → still works because the strings are unchanged, just not CHECK-enforced

**Effort:** 2-3 hours including reconciling the drift.

**Recommendation:** do this BEFORE R6. R6 will write into `m.post_draft` a lot; if the CHECK-vs-catalog mismatch isn't reconciled, we'll hit insert failures.

---

## Finding 3 — Platform vocabulary drift 🔴

Similar to Finding 2. Three CHECK constraints:

| Location | Values | Count |
|---|---|---|
| `t.platform_format_mix_default.platform` | facebook, instagram, linkedin, youtube | 4 |
| `c.client_format_mix_override.platform` | facebook, instagram, linkedin, youtube | 4 |
| `m.post_draft.platform` | blog, facebook, instagram, linkedin, newsletter, other, x, youtube | 8 |

The router mix tables acknowledge only 4 platforms; post_draft acknowledges 8. If newsletter publishing (via Resend, Phase 2) or blog publishing gets router-driven, we'd need to update multiple CHECKs in lockstep.

More importantly: **router target vs destination platform is a real distinction the schema doesn't capture.** YouTube is a platform in post_draft BUT excluded from the router (per Finding 6). Blog and newsletter are platforms in post_draft but not in the router mix. There's no place to express "this platform is a router target (yes/no)" except in another CHECK constraint somewhere or in function source.

### The fix

```sql
CREATE TABLE t.platform_catalog (
  platform_catalog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_code       TEXT NOT NULL,
  platform_name       TEXT NOT NULL,
  is_router_target    BOOLEAN NOT NULL DEFAULT FALSE,  -- FB/IG/LI/YT true; blog/newsletter/x false for now
  content_pipeline    TEXT NOT NULL,  -- 'text_bundle' | 'video_worker' | 'podcast_worker' | 'external'
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  version             TEXT NOT NULL,
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by       UUID REFERENCES t.platform_catalog(platform_catalog_id),
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_catalog_code_version_uniq UNIQUE (platform_code, version)
);

CREATE UNIQUE INDEX platform_catalog_one_current_per_code
  ON t.platform_catalog (platform_code) WHERE is_current = TRUE;
```

Seed with the 8 platforms currently in `m.post_draft`. Mark FB/IG/LI/YT as `is_router_target=TRUE`; blog/newsletter/other/x as `FALSE`. Set `content_pipeline` per platform.

Drop the 3 hardcoded platform CHECKs, replace with FK to `platform_catalog.platform_code`.

**Side benefit:** Finding 6 resolves automatically. `seed_client_to_ai_v2` can filter `WHERE platform IN (SELECT platform_code FROM t.platform_catalog WHERE content_pipeline = 'text_bundle')` instead of hardcoding `NOT IN ('youtube')`.

**Effort:** 2 hours.

**Recommendation:** do together with Finding 2 as one migration. Both are catalog tables, both follow the same pattern, both need to ship before R6.

---

## Finding 4 — Router demand formula hardcoded 🟡

In `m.seed_and_enqueue_ai_jobs_v1`:

```sql
case
  when COUNT(cps.schedule_id) > 0
    then CEIL(COUNT(cps.schedule_id) * 1.5)::int    -- ← 1.5 = target_depth_multiplier
  else CEIL(COALESCE(cpp.max_per_day, 2) * 7 * 1.5)::int  -- ← 2 default, * 7, * 1.5
end as target_depth
```

Three hardcoded numbers:
- `1.5` — target_depth_multiplier (want 1.5x drafts in pipeline for every scheduled slot)
- `2` — default max_per_day when profile value is null (affects CFW which lacks a digest_policy)
- `* 7` — convert max_per_day to per-week (correct math but the constant is still in function body)

Adding a per-client target-depth multiplier (e.g. a news-heavy client wants 2.5x depth) requires rewriting the function.

### The fix

Add a settings table (universal across the system):

```sql
CREATE TABLE t.router_policy_default (
  policy_default_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key       TEXT NOT NULL,
  setting_value     JSONB NOT NULL,
  description       TEXT,
  version           TEXT NOT NULL,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rpd_key_version_uniq UNIQUE (setting_key, version)
);

-- Seed:
INSERT INTO t.router_policy_default (setting_key, setting_value, description, version) VALUES
  ('target_depth_multiplier', '1.5',  'Target drafts-in-pipeline per weekly scheduled slot', 'v1'),
  ('default_max_per_day',     '2',    'Fallback max_per_day when client_publish_profile.max_per_day is null', 'v1'),
  ('target_depth_window_days', '7',   'Planning horizon in days for target depth calculation', 'v1');
```

Plus optional `c.client_publish_profile.target_depth_multiplier` (nullable; if set, overrides the default).

Functions read from `t.router_policy_default` + profile overrides. No hardcoded numbers in function body.

**Effort:** 1.5 hours including refactoring `seed_and_enqueue_ai_jobs_v1`.

**Recommendation:** fold into R6 — `seed_and_enqueue_ai_jobs_v1` is being rewritten anyway, add the config reads at the same time.

---

## Finding 5 — `populate_digest_items_v1` stealth defaults 🟡

```sql
if v_mode is null then v_mode := 'strict'; end if;
if v_max_items is null then v_max_items := 12; end if;
```

If `c.client_digest_policy` row is missing (CFW currently — per sync_state it's a known gap) or has NULL fields, the function substitutes hardcoded defaults. CFW is running on this — 12 max items, strict mode — without anything in the dashboard telling operators that's happening.

### The fix (two options)

**Option A:** Same `t.router_policy_default` table as Finding 4, add rows:
```sql
INSERT INTO t.router_policy_default (setting_key, setting_value, description, version) VALUES
  ('digest_default_mode',      '"strict"', 'Default digest mode when client_digest_policy is absent', 'v1'),
  ('digest_default_max_items', '12',       'Default max_items when client_digest_policy is absent', 'v1');
```

Function reads from the table instead of hardcoded literals.

**Option B:** Require every active client to have a `c.client_digest_policy` row. Backfill CFW. Remove the NULL-fallback branches entirely. Any client without a policy row fails the function explicitly rather than silently running on defaults.

**Recommendation:** Option B is cleaner. CFW needs a digest_policy row anyway (already on backlog). Fix that first, then remove the NULL-safety branches from `populate_digest_items_v1`. Makes the function stricter, which is correct.

**Effort:** 30 min. Minimal risk — the fallback values are already what CFW is effectively running on, so backfilling CFW's policy row with the same values is a no-op behaviourally.

---

## Finding 6 — `NOT IN ('youtube')` exclusion in seed_client_to_ai_v2 🟡

```sql
AND platform NOT IN ('youtube')
```

Excluded because YouTube content comes via video-worker not the text/bundle pipeline. Accurate description, bad shape. If a new vertical brings podcast support (podcast_worker) or newsletter (handled differently), another `NOT IN ('podcast', 'newsletter', 'youtube')` accretion.

### The fix

Resolves automatically once Finding 3 (platform catalog) lands. Query becomes:

```sql
AND platform IN (
  SELECT platform_code
  FROM t.platform_catalog
  WHERE content_pipeline = 'text_bundle'
    AND is_current = TRUE
    AND is_active = TRUE
)
```

No function code change needed to add a new pipeline kind — insert a platform catalog row with `content_pipeline = 'podcast_worker'` and the text_bundle seeder naturally skips it.

**Effort:** 10 min (a single line change after Finding 3 ships).

---

## Finding 7 — Job priority magic numbers 🟢

`seed_and_enqueue_ai_jobs_v1` uses priority `100`.
`seed_client_to_ai_v2` uses priority `120`.

Why different? No comment in either function. Probably the v2 version wanted higher priority because it uses a richer seed payload; not documented.

### The fix

Add `job_priority` to `c.client_ai_profile` or a settings row; default 100; override per-client where meaningful.

**Effort:** 30 min.

**Recommendation:** defer to when TPM saturation actually matters (post D157 retry cap proving). Two priority levels on a 4-client system isn't a real routing decision yet.

---

## Finding 8 — AI provider CHECK constraint 🟢

```sql
CHECK (provider = ANY (ARRAY['openai', 'anthropic', 'google', 'custom']))
```

Adding Cohere or Groq requires a DDL migration.

**Recommendation:** accept as hardcoded. AI providers don't turn over frequently (4 providers in 3 years). Migration cost is low when it happens. Not worth a catalog table for 4 rows.

---

## Finding 9 — Validation view strict equality 🟢

```sql
CASE WHEN sum(default_share_pct) = 100::numeric THEN 'ok'
ELSE 'INVALID — does not sum to 100' END AS status
```

No tolerance. Current seed rows sum to exactly 100 so this works. If a legitimate override (e.g. a client adjusting 3 formats' shares by +1 each to 103) produces 99.99 via rounding, view reports INVALID.

### The fix

```sql
CASE WHEN ABS(sum(default_share_pct) - 100) < 0.01 THEN 'ok'
ELSE 'INVALID — sum ' || sum(default_share_pct) || ' not within tolerance of 100' END AS status
```

**Effort:** 5 min.

**Recommendation:** bundle with Finding 2/3 migration — it's trivially small.

---

## What's clean (not hardcoded, good design)

For honest reporting:

- **`c.client_ai_profile.status`, `provider`** CHECKs — state machine constraints, correct design
- **`m.ai_job.status`, `m.post_draft.approval_status`, `m.post_seed.status`, `m.digest_run.status`** CHECKs — state machine constraints
- **`m.populate_digest_items_v1`** 7-day dedup window — hardcoded but **explicitly** per D164 with documented revisit triggers
- **`t.platform_format_mix_default`** share values — stored as data not code, versioning already present
- **`c.client_format_mix_override`** — table-driven overrides, correct pattern
- **R4 classifier spec v2** — table-driven (after the rewrite)

---

## Recommended execution order

**Before R6 starts** (required prereqs):
1. **Finding 2 + 3 + 9** — format_catalog + platform_catalog + view tolerance fix. Single migration. 3-4 hours. Blocks nothing but makes R6 safer.
2. **Finding 5** — CFW digest_policy backfill. 30 min. Already on backlog; just prioritise it.

**Bundled with R6** (same hot-path migration):
3. **Finding 1** — extract client UUIDs from enqueue trigger into `c.client_publish_profile`. 1 hour. Same PR as R6 since trigger is being considered anyway.
4. **Finding 4** — `t.router_policy_default` settings table + refactor `seed_and_enqueue_ai_jobs_v1` to read it. 1.5 hours.
5. **Finding 6** — 1-line change to seed_client_to_ai_v2 after Finding 3 ships.

**Defer** (not blocking anything):
6. **Finding 7** — job priority magic numbers. 30 min when TPM saturation matters.
7. **Finding 8** — AI provider CHECK. Genuinely acceptable as-is.

**Total additional work before R6:** ~5 hours (Findings 2+3+5+9) + bundled changes in R6's own migration (Findings 1+4+6).

**R6 estimate revision:** original 3-4 hours for classifier-only R4 becomes 3-4h + ~5h for catalog migration + ~2h bundled prereqs folded into R6 = **~10-11 hours total remaining router prep work** before IG publisher can resume.

---

## Open questions for PK

1. **Finding 2 + 3 scope — widen + reconcile, or freeze current vocabulary?** The CHECK constraints show vocabulary drift that's never been reconciled. Migration could:
   (a) union everything + flag inconsistencies for later review, or
   (b) pick the post_draft vocabulary as canonical (13 formats, 8 platforms) + update other CHECKs to match.
   Leaning (b) — post_draft is the final storage, it's the de facto truth.

2. **Finding 5 — CFW digest_policy backfill values?** Currently CFW runs effective `strict` mode + 12 max_items (from hardcoded defaults). Keep those values, or tune for CFW's actual cadence?

3. **Finding 4 — target_depth_multiplier per-client or global only?** MVP could be global-only (one `t.router_policy_default` row, all clients use it). Per-client override column added only when a client genuinely needs a different multiplier. Start simple?

4. **Finding 7 — job priority now or later?** If "later" means "never" that's fine; if it means "when TPM hits," fair. But once TPM saturates, fixing priority config under pressure is worse than fixing it now. 30 min trade.

5. **Migration sequencing — as one PR or separate?** Findings 2+3+5+9 could be one migration (catalog setup) or 4 separate (one per concern). Single migration is atomic, easier to rollback. Separate is easier to review. I lean single.

---

## Related decisions + briefs

- **D141-D146** — original router direction + D143 classifier
- **D166** — router sequencing reversal (build router before M12)
- **D167** — router MVP shadow infrastructure (the table-driven pattern established here)
- **D164** — 7-day dedup window (intentional hardcoding with revisit triggers — distinguishes from unintentional)
- **`docs/briefs/2026-04-24-r4-d143-classifier-spec.md`** — R4 v2 table-driven classifier (the trigger for this audit)
- **`docs/briefs/2026-04-24-a21-on-conflict-audit.md`** — A21 findings dropped the v1 seed functions (first instance of "client-specific functions are bad"); this audit extends that principle systematically
