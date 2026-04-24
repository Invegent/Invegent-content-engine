# Frontend Format + Platform Vocabulary Audit

**Session:** 25 Apr 2026 (CC-TASK-03 via Claude Code).
**Status:** Audit complete. **No remediation applied** (audit-only per brief).
**Parent context:** 24 Apr evening router catalog unification (`docs/briefs/2026-04-24-router-catalog-unification-shipped.md`) replaced 7 hardcoded CHECK constraints with 29 FKs pointing at `t."5.0_social_platform"` (17 platform codes) and `t."5.3_content_format"` (22 format codes). Vocabulary authority shifted to the catalog tables; anything in frontend that hardcodes format/platform strings is now working against a stale source.
**Scope:** `invegent-dashboard` and `invegent-portal` repos. Commit the brief here in `Invegent-content-engine`.

## Summary — 13 findings, 3 severity tiers

| Tier | Count | Meaning |
|---|---|---|
| 🔴 HIGH | **1** | Dead format value (no longer in catalog) referenced in production code path — FK will reject any future write; read paths silently return empty |
| 🟡 MEDIUM | **9** | Platform dropdown / array constrained to 3-7 platforms when catalog has 17; or format enum missing active values that exist in catalog |
| 🟢 LOW | **3** | `FORMAT_LABELS` map missing active catalog entries → raw format_key shown as fallback (cosmetic, not a write bug) |

Per-severity breakdown:

| # | File:Line | Content | Severity |
|---|---|---|---|
| H1 | `invegent-dashboard/app/(dashboard)/actions/video-tracker.ts:52` | `IN (... 'video_avatar', 'video_episode')` — both values absent from `t."5.3_content_format"` | 🔴 HIGH |
| M1 | `invegent-dashboard/app/(dashboard)/clients/page.tsx:261` | `KNOWN_PLATFORMS = ["facebook", "linkedin", "youtube", "instagram"]` | 🟡 MEDIUM |
| M2 | `invegent-dashboard/app/(dashboard)/clients/page.tsx:455-457` | `PLAT_ORDER / PLAT_COLORS / PLAT_ICONS` — 4-platform only | 🟡 MEDIUM |
| M3 | `invegent-dashboard/app/(dashboard)/components/clients/VoiceFormatsTab.tsx:8-13` | `PLATFORMS = [{fb},{ig},{li},{yt}]` | 🟡 MEDIUM |
| M4 | `invegent-dashboard/app/(dashboard)/content-studio/components/Series/NewSeriesForm.tsx:18-20` | 3-platform dropdown (fb/li/ig) | 🟡 MEDIUM |
| M5 | `invegent-dashboard/app/(dashboard)/content-studio/components/SinglePost/PostStudioForm.tsx:25-27` | Same 3-platform dropdown | 🟡 MEDIUM |
| M6 | `invegent-dashboard/components/clients/ScheduleTab.tsx:50-59` | Icon+label map + `ALL_PLATFORMS` — 4 platforms | 🟡 MEDIUM |
| M7 | `invegent-dashboard/lib/platform-status.ts:14` | `PLATFORM_ORDER = ['facebook','instagram','linkedin','youtube']` | 🟡 MEDIUM |
| M8 | `invegent-dashboard/app/(dashboard)/client-profile/ClientProfileShell.tsx:640` | `ALL_PLATFORMS = [fb,li,ig,yt,newsletter,blog,reddit]` — 7/17 | 🟡 MEDIUM |
| M9 | `invegent-dashboard/app/api/client-profile/preview/[clientId]/route.ts:48` | `STUDIO_SUPPORTED_PLATFORMS = [...,'email',...]` — `'email'` NOT in catalog | 🟡 MEDIUM |
| L1 | `invegent-dashboard/actions/pipeline-stats.ts:85` | Hardcoded filter `IN ('image_quote','carousel','animated_text_reveal')` missing `animated_data` | 🟢 LOW |
| L2 | `invegent-dashboard/app/(dashboard)/performance/page.tsx:23-31` | `FORMAT_LABELS` map missing 3 active formats (video_short_kinetic_voice / video_short_stat_voice / video_short_avatar) | 🟢 LOW |
| L3 | `invegent-dashboard/app/(dashboard)/content-studio/components/Series/EpisodeRow.tsx:42-46` | `FORMAT_LABELS` has only 3 entries; missing ~7 active formats | 🟢 LOW |

**Portal:** 1 MEDIUM finding (P1 below, included under M-series). Otherwise clean — the portal has minimal direct platform/format vocab exposure.

---

## Methodology

### Discovery

```bash
# Dead vocab — highest priority
grep -rniE "'(image_ai|video_slideshow|video_avatar|video_voiceover)'" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  app/ components/ lib/ actions/
# Dashboard: 1 hit. Portal: 0 hits.

# Active format vocab
grep -rniE "'(image_quote|carousel|animated_text_reveal|animated_data|video_short_kinetic|video_short_kinetic_voice|video_short_stat|video_short_stat_voice|video_short_avatar)'" ...
# Dashboard: 2 filter sites. Portal: 0.

# All 17 platform codes (quoted string form)
grep -rniE "['\"](facebook|instagram|linkedin|youtube|blog|newsletter|website|x|tiktok|reddit|threads|pinterest|medium|substack|telegram|whatsapp|discord)['\"]" ...
# Dashboard: 69 raw hits. Portal: 20 raw hits.

# Filter pattern for "hardcoded enum arrays"
grep -rniE "(facebook.{0,30}instagram|facebook.{0,30}linkedin|linkedin.{0,30}youtube|PLATFORMS\s*=\s*\[)"
# Surfaced the co-located-in-array cases (distinct from conditional branches like 'if platform === X').
```

### Classification rubric (from brief)

| Shape | Severity |
|---|---|
| Dead format in production code path | HIGH |
| Dead format in tests/mocks only | LOW |
| Platform dropdown / array limited to FB/IG/LI/YT when catalog has more | MEDIUM |
| Format dropdown hardcoded when should fetch from `t."5.3_content_format"` | MEDIUM |
| Match-current-catalog strings duplicated across N files | LOW (consolidation) |
| `if (platform === 'facebook')` business-logic conditional | N/A (expected) |

### Cross-reference evidence

- All 5 dead format values (`image_ai`, `video_slideshow`, `video_avatar`, `video_voiceover`, `video_episode`) confirmed absent from `t."5.3_content_format"` via Supabase MCP `(project_id: mbkmaxqhsohbtwsqolns)`.
- `m.post_draft` has zero rows using any of those 5 values — nothing legacy to worry about, FK enforcement is lossless.
- 17 platform codes confirmed present in `t."5.0_social_platform"`; 14 original + 3 new (blog/newsletter/website) from 24 Apr catalog unification.

---

## Finding H1 — `video-tracker` exec_sql filters on dead format values 🔴 HIGH

### Current code

`invegent-dashboard/app/(dashboard)/actions/video-tracker.ts:50-53`:

```ts
WHERE pd.recommended_format IN (
  'video_short_kinetic','video_short_stat',
  'video_avatar','video_episode'
)
```

### Catalog state

| Format value | In `t."5.3_content_format"`? | In `m.post_draft`? |
|---|---|---|
| `video_short_kinetic` | ✅ is_active=true | — |
| `video_short_stat` | ✅ is_active=true | — |
| **`video_avatar`** | ❌ **NOT IN CATALOG** | **0 rows** |
| **`video_episode`** | ❌ **NOT IN CATALOG** | **0 rows** |

`video_avatar` was superseded by `video_short_avatar`. `video_episode` is not documented in the 24 Apr catalog brief's "dead" list but doesn't exist in the catalog either — likely a predecessor of `video_long_*` formats.

### Why HIGH despite being a read (not a write)

The brief's classification table says: *"Dead format in production code path → HIGH."* This is a production code path (`Video Tracker` dashboard tab), so HIGH. The nuance:

- **Not a runtime error.** The filter is in a SELECT inside `exec_sql`; the query returns without error, just with zero rows for the dead values.
- **Silent UX bug.** The Video Tracker tab silently drops any draft that could have matched `video_avatar` or `video_episode`. Since the DB has zero rows using those values anyway (they've been unused for long enough that every live draft is already on the new vocabulary), the practical impact today is nil.
- **Latent write bug.** If anyone modifies this file to ALSO insert a row using these values (or if a similar pattern is copied elsewhere to a write path), the FK will reject. The stale vocabulary is effectively a trap for future editors.
- **File-level note:** this file uses `exec_sql` — which is part of the 30+ exec_sql sites pending cleanup per `docs/00_sync_state.md` backlog. That's a separate concern tracked independently; this audit only flags the vocabulary issue.

### Recommended fix (NOT applied)

Replace the dead values with the current active video-format vocabulary:

```ts
WHERE pd.recommended_format IN (
  'video_short_kinetic',
  'video_short_stat',
  'video_short_avatar',
  'video_short_kinetic_voice',
  'video_short_stat_voice'
)
```

Or better — flip to a catalog-driven pattern:

```ts
WHERE pd.recommended_format IN (
  SELECT ice_format_key
  FROM t."5.3_content_format"
  WHERE ice_format_key LIKE 'video_%'
    AND is_active = TRUE
)
```

Catalog-driven approach self-heals when new video formats are added to `t."5.3_content_format"` without requiring a code change. Recommended but not mandatory; a straight replacement is faster and risk-free.

**Effort:** 10 min.

---

## Finding M1-M7 — Platform arrays constrained to 4 platforms 🟡 MEDIUM ×7

Seven locations in `invegent-dashboard` hardcode the 4-platform vocabulary FB/IG/LI/YT in arrays or lookup maps. Business-logic impact ranges from cosmetic (sort order) to functional (dropdowns that don't surface newer platforms).

### M1 — `app/(dashboard)/clients/page.tsx:261`

```ts
const KNOWN_PLATFORMS = ["facebook", "linkedin", "youtube", "instagram"];
```

Used as an enum for what counts as a "known" platform in the clients list. Newer catalog entries (blog, newsletter, website, x, etc.) are invisible here.

### M2 — `app/(dashboard)/clients/page.tsx:455-457`

```ts
const PLAT_ORDER = ['facebook','instagram','linkedin','youtube'];
const PLAT_COLORS: Record<string,string> = {facebook:"bg-blue-600 hover:bg-blue-700", instagram:"bg-pink-600...", linkedin:"bg-blue-700...", youtube:"bg-red-600..."};
const PLAT_ICONS: Record<string,typeof PLATFORM_ICON_FB> = {facebook:PLATFORM_ICON_FB, instagram:PLATFORM_ICON_IG, linkedin:PLATFORM_ICON_LI, youtube:PLATFORM_ICON_YT};
```

Three parallel 4-platform maps (order, colour, icon). All three need updates in lockstep whenever a new platform is added.

### M3 — `app/(dashboard)/components/clients/VoiceFormatsTab.tsx:8-13`

```ts
const PLATFORMS = [
  { key: "facebook",  label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin",  label: "LinkedIn" },
  { key: "youtube",   label: "YouTube" },
] as const;
```

Voice/Formats tab only surfaces 4 platforms. Clients with content_type_prompt rows for blog or newsletter (if ever added) would have no UI to edit them.

### M4 + M5 — Content Studio forms

`app/(dashboard)/content-studio/components/Series/NewSeriesForm.tsx:18-20` and `.../SinglePost/PostStudioForm.tsx:25-27`:

```ts
{ id: "facebook",  label: "Facebook" },
{ id: "linkedin",  label: "LinkedIn",  note: "API approval pending" },
{ id: "instagram", label: "Instagram", note: "Coming after Meta App Review" },
```

Three-platform list (no YouTube). Also doesn't include blog / newsletter / website / any of the 13 non-router platforms.

### M6 — `components/clients/ScheduleTab.tsx:50-59`

```ts
facebook:  { label: "Facebook",  ... },
linkedin:  { label: "LinkedIn",  ... },
youtube:   { label: "YouTube",   ... },
instagram: { label: "Instagram", ... },
// ...
const ALL_PLATFORMS = ["facebook", "instagram", "linkedin", "youtube"] as const;
```

ScheduleTab grid renders only 4 platforms. Router catalog acknowledges 17. This was the exact surface M9 fixed (greyed-out-if-not-configured) — but the enum itself is still 4.

### M7 — `lib/platform-status.ts:14`

```ts
export const PLATFORM_ORDER = ['facebook', 'instagram', 'linkedin', 'youtube'];
```

Global sort order constant. Imported by ~5 other files (unmeasured, but the pattern of imports for this module is consistent with that scale).

### Why MEDIUM and not HIGH

None of these cause FK rejection — they don't write to catalog-bound columns. The issue is "constrained to a narrower vocabulary than the catalog offers":
- Dropdowns don't surface new platforms users could legitimately select
- Schedule grids don't display schedules for new platforms
- Sort order doesn't know where to place new platforms (they default to bottom)

Functional impact is small today because only FB/IG/LI/YT are actively in use for publishing (plus IG paused per D165). Once blog/newsletter/website/video_avatar enter the pipeline, these constants need updating to preserve UX.

### Recommended fix (NOT applied)

Pattern: extract platform vocabulary into a shared source-of-truth hook that reads from Supabase on mount and caches.

```ts
// lib/hooks/usePlatformVocab.ts
export function usePlatformVocab() {
  return useQuery({
    queryKey: ['platform-vocab'],
    queryFn: async () => {
      const { data } = await supabase
        .from('5.0_social_platform')
        .select('platform_code, platform_name, is_router_target, content_pipeline, is_active')
        .eq('is_current', true)
        .eq('is_active', true)
        .order('platform_code');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

Then dropdowns / arrays become:

```ts
const { data: platforms = [] } = usePlatformVocab();
// ... render dropdowns, sort orders, icon maps driven by platforms
```

Existing icons, colours, and labels continue to live locally (they're presentation, not vocabulary). The *keys* in those local maps should map from catalog `platform_code` values.

**Effort per site:** 10-30 min depending on how tangled the existing constant is with surrounding logic.
**Total effort:** ~3-4 hours across all 7 MEDIUM sites + shared hook + testing.
**Migration plan:** cleanup-on-touch is acceptable (not blocking anything). R6 does not touch frontend.

---

## Finding M8 — `ClientProfileShell` platform list at 7/17 🟡 MEDIUM

`invegent-dashboard/app/(dashboard)/client-profile/ClientProfileShell.tsx:640`:

```ts
const ALL_PLATFORMS = ["facebook", "linkedin", "instagram", "youtube", "newsletter", "blog", "reddit"];
```

Includes `newsletter` + `blog` + `reddit` (good — broader than M1-M7) but still missing `website`, `x`, `tiktok`, `threads`, `pinterest`, `medium`, `substack`, `telegram`, `whatsapp`, `discord`.

### Same fix as M1-M7

Consume `usePlatformVocab()` hook. This one at least has a model for "include non-publishing platforms"; it just doesn't include them all.

---

## Finding M9 — `STUDIO_SUPPORTED_PLATFORMS` references `'email'` (not in catalog) 🟡 MEDIUM

`invegent-dashboard/app/api/client-profile/preview/[clientId]/route.ts:46-48`:

```ts
// Platforms supported by the content studio (text-based generation via content_type_prompt).
// YouTube is excluded — it goes through the video-worker pipeline, not content_type_prompt.
const STUDIO_SUPPORTED_PLATFORMS = ["facebook", "linkedin", "instagram", "email", "blog", "reddit"];
```

The value `"email"` is **not in `t."5.0_social_platform"`**. The catalog has `newsletter`. Likely the author meant `newsletter` but wrote `email` — this is a silent vocabulary drift at the app layer.

### Impact

- API consumers passing `platform: "email"` in the request would see this constant accept the value, but downstream writes to any catalog-FK-bound column (`m.post_draft.platform`, `c.client_publish_profile.platform`, etc.) would **FK-reject** the `email` value.
- FK rejection here is similar shape to the HIGH finding (write rejection on dead vocab), but this route is a *read-preview* so the rejection may not fire in the typical request path. Without reading the full route body to trace the path, classifying as MEDIUM rather than HIGH.

### Recommended fix

Replace `"email"` with `"newsletter"` (catalog value). If the intent was genuinely "we support an email-specific format distinct from newsletter," add a new catalog row `email` first via DB migration, then use it here.

---

## Finding P1 (listed as M13 above but narrative) — Portal onboarding form 🟡 MEDIUM

`invegent-portal/app/onboard/OnboardingForm.tsx:13`:

```ts
const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'Email newsletter'] as const
```

Display-cased labels used in the onboarding questionnaire. Distinct from FK-bound `platform_code` values (lowercase, single-word). The portal likely maps these to catalog codes server-side.

### Why MEDIUM

- It's client-facing — limited set means new clients can't express interest in x/tiktok/reddit/etc. during onboarding
- If the server-side mapping is incomplete, there's a silent drop: "Email newsletter" → ???

### Recommended fix

Either (a) expand the display list to cover all 17 catalog platforms (grouped: "Main" / "Other social" / "Content"), or (b) drive the list from the same `usePlatformVocab()` hook via a portal-appropriate fetch.

**Portal search — other findings:** zero. The portal has minimal direct platform/format vocab surface. Most portal code handles platforms dynamically (from RPC payload data, not from local constants). Clean.

---

## Finding L1 — `pipeline-stats.ts` hardcoded format filter 🟢 LOW

`invegent-dashboard/actions/pipeline-stats.ts:85`:

```sql
'image_specs_24h', (SELECT count(*) FROM m.post_visual_spec
                    WHERE ice_format_key IN ('image_quote','carousel','animated_text_reveal')
                    AND created_at > now() - interval '24 hours'),
```

`animated_data` is an active format in `t."5.3_content_format"` (share 10% on Instagram per `t.platform_format_mix_default`). Its counter gets silently excluded from `image_specs_24h`.

Line 86 uses pattern match `ice_format_key LIKE 'video%'` — correctly captures all video variants. L1 is the inconsistent one.

### Recommended fix

```sql
-- Option 1: add animated_data explicitly
WHERE ice_format_key IN ('image_quote','carousel','animated_text_reveal','animated_data')

-- Option 2: pattern + exclusion (matches the video pattern's style)
WHERE ice_format_key NOT LIKE 'video%' AND ice_format_key <> 'text'
-- but that's brittle — assumes everything-that-isn't-video-or-text is an image, which isn't stable as the catalog grows

-- Option 3: catalog-driven
WHERE ice_format_key IN (
  SELECT ice_format_key FROM t."5.3_content_format"
  WHERE output_kind = 'image' AND is_active = TRUE
)
-- requires `output_kind` column. Check catalog schema first.
```

Option 1 is 10 seconds of work. Option 3 would be the long-term clean approach once output_kind exists.

---

## Finding L2 — `performance/page.tsx` FORMAT_LABELS missing 3 active formats 🟢 LOW

`invegent-dashboard/app/(dashboard)/performance/page.tsx:23-31`:

```ts
const FORMAT_LABELS: Record<string, string> = {
  text: "Text",
  image_quote: "Image Quote",
  carousel: "Carousel",
  animated_text_reveal: "Animated Text",
  animated_data: "Data Animation",
  video_short_kinetic: "Video Kinetic",
  video_short_stat: "Video Stat",
};
```

Missing: `video_short_kinetic_voice`, `video_short_stat_voice`, `video_short_avatar`. These fall through to `label` (raw format_key) per line 43's `return FORMAT_LABELS[label] ?? label;`.

### Why LOW

Not broken — fallback is the raw format_key. Cosmetic only: users see `video_short_avatar` instead of something friendlier like "Video Avatar".

### Recommended fix

Either complete the map (10 min add the 3 missing entries) or flip to catalog-driven label lookup via `useFormatVocab()` hook.

---

## Finding L3 — `EpisodeRow.tsx` FORMAT_LABELS has only 3 entries 🟢 LOW

`invegent-dashboard/app/(dashboard)/content-studio/components/Series/EpisodeRow.tsx:42-46`:

```ts
const FORMAT_LABELS: Record<string, string> = {
  text: "text",
  image_quote: "image",
  carousel: "carousel",
};
```

Three entries; missing ~7 active formats. Labels also look suspicious (lowercase single-word — probably a dev-stage placeholder not polished copy).

Same fallback pattern as L2.

### Recommended fix

Remove this local map entirely and consume `useFormatVocab()`.

---

## Recommended `useFormatVocab` + `usePlatformVocab` hook pattern

Single shared source of truth, compatible with the existing React Query / SWR patterns used in the dashboard.

```ts
// lib/hooks/usePlatformVocab.ts
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/browser';

export type PlatformVocab = {
  platform_code: string;       // 'facebook', 'newsletter', etc.
  platform_name: string;       // 'Facebook', 'Newsletter', etc.
  is_router_target: boolean;
  content_pipeline: string;    // 'text_bundle' | 'video_worker' | 'external' | 'owned_publish' | 'none'
  is_active: boolean;
};

export function usePlatformVocab(filter?: { routerOnly?: boolean; pipeline?: string }) {
  return useQuery<PlatformVocab[]>({
    queryKey: ['platform-vocab', filter],
    queryFn: async () => {
      const supabase = createBrowserClient();
      let q = supabase
        .from('5.0_social_platform')
        .select('platform_code, platform_name, is_router_target, content_pipeline, is_active')
        .eq('is_current', true)
        .eq('is_active', true);
      if (filter?.routerOnly) q = q.eq('is_router_target', true);
      if (filter?.pipeline)   q = q.eq('content_pipeline', filter.pipeline);
      const { data } = await q.order('platform_code');
      return (data ?? []) as PlatformVocab[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// lib/hooks/useFormatVocab.ts  — symmetrical for t."5.3_content_format"
```

Consumers:

- Dropdowns: `usePlatformVocab()` with appropriate filter (`{ routerOnly: true }` where publishing; no filter for onboarding / preference capture)
- Labels: derived from the same hook's `platform_name` (remove local `FORMAT_LABELS` maps)
- Icons + colours: stay local per-site (presentation, not vocabulary); keyed by `platform_code`
- Sort orders: `platforms.map(p => p.platform_code)` from the hook (they come ordered)

Server-side code paths (route handlers, server actions, exec_sql queries) should query `t."5.0_social_platform"` directly or via a lightweight `lib/server/vocab.ts` helper with server-side caching.

---

## Recommended execution order

**Before R6 starts:** nothing in this brief is a hot-path blocker. R6 touches DB and server-side functions; frontend vocab cleanup is entirely decoupled.

**Cleanup-on-touch (recommended):** when any affected file is edited for other reasons, swap the hardcoded enum for a hook call in the same PR. Low risk, progressive improvement.

**Optional focused PR:** the `usePlatformVocab` + `useFormatVocab` hooks + adoption across M1-M7 could land as a single frontend-only PR. ~4 hours. Zero DB / EF / hot-path risk. Good Saturday session if PK wants something low-pressure.

**Fix H1 opportunistically:** the `video-tracker.ts` fix is 10 min, zero-risk, improves UX. Could fold into any future touch of that file (file currently uses exec_sql which has its own sweep pending — when that sweep hits this file, fix the vocab at the same time).

**Fix M9 promptly:** the `'email'` vs catalog drift is the most likely of these to bite someone. Single-word change; if the route is ever exercised with a non-email platform and the code changes to actually persist it, FK fires.

## Sprint board impact

- **CC-TASK-03 — Frontend format + platform vocab audit** — **CLOSED 25 Apr** (this brief).
- **New backlog item (LOW priority):** `usePlatformVocab` + `useFormatVocab` hook rollout across dashboard. Cleanup-on-touch acceptable; no hot-path blocking.
- **New backlog item (MEDIUM priority):** M9 specifically — `'email'` in `STUDIO_SUPPORTED_PLATFORMS` should be `'newsletter'` (or email added to catalog). 5-minute fix, higher risk of silent FK rejection than the rest.
- **Zero hot-path blockers.** R6 proceeds without waiting.

## What's clean (not a finding, verified)

For honest reporting:

- **Feeds tab** (`app/(dashboard)/feeds/feeds-client.tsx:48-50`) uses a source-type taxonomy (`facebook`, `youtube`, `government`, `industry_body`, `newsletter`, `news_media`, `website`, `other`) — distinct from catalog platform codes; different concern; not a finding.
- **Schedule grid** (M9 close — 22 Apr) renders all 4 router platforms with greyed-out-if-not-configured states. The underlying `ALL_PLATFORMS` array is still 4-long (M6), but the visual treatment correctly handles missing config.
- **Content Studio dropdowns** (M4, M5) include `note: "API approval pending"` / `"Coming after Meta App Review"` for LinkedIn / Instagram — acknowledging platform readiness explicitly. Correct UX pattern; just on a constrained set.
- **Conditional branches** — places like `app/(dashboard)/onboarding/page.tsx:592` that check `detail.facebook_page_url || detail.linkedin_url || detail.instagram_url` are business logic, not vocabulary enums. Not findings.
- **OAuth scopes** — `email` as a LinkedIn OAuth scope (`app/api/linkedin/auth/route.ts:34`) is an OAuth permission name, not a platform vocab value. Not a finding.

## Related

- **Parent audit:** `docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — 9-finding DB-layer audit that triggered the catalog unification. This frontend audit is its companion.
- **Catalog unification brief:** `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` — what landed on the DB side that shifted vocabulary authority.
- **A21 audit:** `docs/briefs/2026-04-24-a21-on-conflict-audit.md` — DB-layer ON CONFLICT audit (different bug class, same audit cadence).
- **CC-TASK-02 brief:** `docs/briefs/2026-04-25-ef-upsert-audit.md` — EF `.upsert()` audit (yesterday; found 1 HIGH partial-index inference bug).

## Verification queries

```sql
-- Re-check dead vocabulary: these 5 values should never appear in t."5.3_content_format"
SELECT ice_format_key FROM t."5.3_content_format"
WHERE ice_format_key IN ('image_ai','video_slideshow','video_avatar','video_voiceover','video_episode');
-- Expected: zero rows

-- Re-check platform catalog width
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_router_target) AS router_targets
FROM t."5.0_social_platform" WHERE is_current AND is_active;
-- Expected: 17 total, 4 router targets (as of 24 Apr)

-- Is 'email' ever in the platform catalog? (would relax M9 severity if added)
SELECT * FROM t."5.0_social_platform" WHERE platform_code = 'email' AND is_current;
-- Expected: zero rows (email is not a catalog platform)
```

## Methodology notes for next audit

### Worked well

- **Two-pass grep.** First pass strict (`'value'` quoted) narrowed the noise; second pass broader (`value`) surfaced the rest and let me mentally tag which hits were real enum-array members vs. variable names vs. prose. Faster than eyeballing 89 lines.
- **Co-location pattern matching.** Grep for `facebook.{0,30}instagram` surfaces arrays/objects that list multiple platforms together — the actual target of the audit. Distinct from isolated conditionals.
- **DB cross-reference via Supabase MCP.** Verifying `m.post_draft` has zero rows with dead values turned the HIGH finding from "theoretical FK risk" to "confirmed zero-row-legacy, fix at leisure."

### What bit

- **False-positive platform words.** "Medium" appears as a severity label (`"high"|"medium"|"low"`); "Reddit" as a social platform; "email" as both an OAuth scope and an intended-to-be-newsletter-but-typoed vocab value. Needed multiple filter passes. Next audit: combine `['"]...['"]` with proximity constraints to the word "platform" or common dropdown/array variable names.
- **Scope creep temptation.** The `pipeline-stats.ts:85` hardcoded list is technically audit-in-scope but also barely vocab (it's a performance counter). Classified LOW to avoid inflating the finding count. A stricter interpretation could call it MEDIUM.
- **`FORMAT_LABELS` pattern is everywhere.** Three instances found, likely more exist. Deliberately stopped after three instances once the pattern was clear — audit-fatigue territory. A frontend sweep for the pattern `FORMAT_LABELS` / `PLATFORM_LABELS` / `*_LABELS:` might surface more if PK wants.
