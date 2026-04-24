# CC-TASK-03 — Frontend format + platform vocab audit

**Priority:** P3 — LOW priority follow-up from 24 Apr evening router catalog unification
**Estimated effort:** 45-60 minutes
**Risk:** LOW — read-only discovery + brief authoring
**Trigger:** PK pings `@InvegentICEbot` with this file path

---

## CONTEXT

The 24 Apr evening router catalog unification replaced 7 hardcoded CHECK constraints with FK references to `t.5.0_social_platform` (platforms) and `t.5.3_content_format` (formats). This means:

1. **Vocabulary authority has shifted.** Any frontend code that hardcodes format/platform strings in dropdowns, filters, badge labels, or conditional rendering is now working against a stale source.
2. **Dead vocabulary exposure.** Four format values (`image_ai`, `video_slideshow`, `video_avatar`, `video_voiceover`) no longer exist in the catalog. Any frontend code referencing these will either:
   - Silently break on write (FK rejection) once a new format config is saved
   - Display stale labels that users can select but can't persist
3. **New platform availability.** `blog`, `newsletter`, `website`, `x`, `tiktok`, `reddit`, `threads`, `pinterest`, `medium`, `substack`, `telegram`, `whatsapp`, `discord` are all valid platforms now. Frontend filters/dropdowns limited to FB/IG/LI/YT are artificially constraining.

**This audit was explicitly scoped as a LOW-priority backlog item** in `docs/briefs/2026-04-24-router-catalog-unification-shipped.md`.

## SETUP — READ FIRST

1. Read `docs/00_sync_state.md` in full — recent state context
2. Read `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` — details on what changed 24 Apr evening
3. Read `docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — the audit that triggered the catalog unification (includes the full vocabulary lists)
4. Dev workflow: direct-push to main
5. Orphan branch sweep on `invegent-dashboard` + `invegent-portal` at session start

## OBJECTIVE

Sweep `invegent-dashboard` and `invegent-portal` repos for hardcoded format/platform strings. Produce findings brief at `docs/briefs/2026-04-25-frontend-format-vocab-audit.md`.

**Do NOT fix anything in this task.** Fix effort varies by finding (some may need `useQuery` refactor to fetch from Supabase; some may need only dropdown constant replacement). Ship audit first.

## VOCABULARIES TO SEARCH FOR

### Platforms (14 catalogued)
```
facebook, instagram, linkedin, youtube, x, tiktok, reddit, threads, pinterest,
medium, substack, telegram, whatsapp, discord, blog, newsletter, website
```
(17 total rows in `t.5.0_social_platform`. The 14 original + 3 new.)

### Formats — ACTIVE (10 in use)
```
text, image_quote, carousel, animated_text_reveal, animated_data,
video_short_kinetic, video_short_kinetic_voice,
video_short_stat, video_short_stat_voice, video_short_avatar
```

### Formats — LATENT BUT CATALOGUED (in t.5.3_content_format, not in use yet)
```
video_short, video_long_explainer, video_long_podcast_clip,
article, audio, live, newsletter, poll, story, text_post, thread, community_post, long_video, short_video
```

### Formats — DEAD / NOT IN CATALOG (HIGH severity if found in frontend)
```
image_ai
video_slideshow
video_avatar     (superseded by video_short_avatar)
video_voiceover  (superseded by video_short_kinetic_voice / video_short_stat_voice)
```

Any frontend reference to these 4 dead values is a **bug waiting to bite** — FK will reject the write.

## METHOD

### Step 1 — Enumerate call sites

For each of `invegent-dashboard` and `invegent-portal`:

```bash
# Platform references
grep -rniE "'(facebook|instagram|linkedin|youtube|blog|newsletter|website|x|tiktok|reddit|threads|pinterest|medium|substack|telegram|whatsapp|discord)'" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  app/ components/ lib/ src/ 2>/dev/null > /tmp/platform_refs_{repo}.txt

# Format references — ACTIVE vocabulary
grep -rniE "'(text|image_quote|carousel|animated_text_reveal|animated_data|video_short_kinetic|video_short_kinetic_voice|video_short_stat|video_short_stat_voice|video_short_avatar)'" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  app/ components/ lib/ src/ 2>/dev/null > /tmp/format_refs_{repo}.txt

# Format references — DEAD vocabulary (highest priority)
grep -rniE "'(image_ai|video_slideshow|video_avatar|video_voiceover)'" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  app/ components/ lib/ src/ 2>/dev/null > /tmp/dead_format_refs_{repo}.txt
```

Filter out test files, comments, and obviously irrelevant matches (e.g., English word 'text' appearing in JSX prose).

### Step 2 — Classify each call site

| Category | Action | Severity |
|---|---|---|
| Dead format in production code path | List for fix | HIGH |
| Dead format in test/mock only | Note but don't flag | LOW |
| Platform dropdown limited to FB/IG/LI/YT when catalog has more | List for fix | MEDIUM |
| Format dropdown hardcoded to 10-format active list | List for fix (should fetch from t.5.3_content_format) | MEDIUM |
| String constant matches a current catalog value but is duplicated across N files | Consolidation opportunity | LOW |
| String in conditional branch (e.g., `if (platform === 'facebook')`) | Expected — business logic differs per platform. Not a finding. | N/A |

### Step 3 — Write findings

Produce `docs/briefs/2026-04-25-frontend-format-vocab-audit.md`:

- Executive summary: N HIGH (dead formats) / M MEDIUM (constrained dropdowns) / K LOW (duplicated constants)
- Per-severity sections with file paths, line numbers, current code, recommended fix approach
- Recommended pattern: a new `hooks/useFormatVocab.ts` + `hooks/usePlatformVocab.ts` that fetch from Supabase on mount with cache. Dropdowns consume these hooks. No hardcoding.
- Migration plan: which findings block R6 (shouldn't — frontend is not hot path) vs which are cleanup-on-touch

## DELIVERABLES

**Files created:**
- `docs/briefs/2026-04-25-frontend-format-vocab-audit.md`

**Files modified:** NONE

**Commit message:**
```
docs(briefs): frontend format + platform vocab audit — findings report

Sweep of invegent-dashboard + invegent-portal repos for hardcoded platform + format strings. Cross-referenced against t.5.0_social_platform (17 platforms) and t.5.3_content_format (active + dead vocabulary).

Findings: {X HIGH (dead formats) / Y MEDIUM (constrained dropdowns) / Z LOW (duplicated constants)}.

Follow-up: recommend useFormatVocab + usePlatformVocab hooks to eliminate hardcoding. Dead vocabulary (image_ai/video_slideshow/video_avatar/video_voiceover) needs removal before frontend writes hit FK rejection.

Context: 24 Apr evening router catalog unification shifted vocabulary authority to t.5.0_social_platform + t.5.3_content_format.
```

## VERIFICATION CHECKLIST

- [ ] Both repos swept (dashboard + portal)
- [ ] All 4 dead format values searched explicitly
- [ ] All 17 platform codes searched
- [ ] All 10 active format codes searched
- [ ] Each finding has file + line number + current code snippet
- [ ] Fix recommendation given but not applied
- [ ] Brief structure matches `docs/briefs/2026-04-24-router-hardcoded-values-audit.md` (continuity)
- [ ] Orphan branch sweep performed on both repos at session start

## OUT OF SCOPE

- **Fixing any finding** — fix work is separate (may involve hook creation + dropdown refactor, potentially across many files)
- Backend vocabularies (DB-layer already handled)
- Translation files (format labels in i18n are a different concern)
- Mock data in tests (unless production code path also references them)

## EXPECTED SCALE

- ~200-400 matches on initial grep (many will be filtered as comments, prose, or tests)
- Expected 10-30 real findings after filtering
- Zero HIGH findings would be a good outcome — means the dead vocabulary only ever lived in DB-layer CHECK constraints
- 5-15 MEDIUM findings would be expected — platform dropdowns almost certainly hardcode FB/IG/LI/YT

## COMMIT BACK TO SYNC_STATE

After this lands, add lines to `docs/00_sync_state.md`:
- "Frontend vocab audit CC-TASK-03 CLOSED — {counts} — commit {sha}"
- If HIGH findings: add fix tasks to sprint board

## CROSS-REPO NOTE

This is a multi-repo audit. Clone/cd into both:
- `github.com/Invegent/invegent-dashboard`
- `github.com/Invegent/invegent-portal`

Still commit the BRIEF to `github.com/Invegent/Invegent-content-engine` (the docs-home repo) under `docs/briefs/`. Keep all briefs in one place regardless of which code they audit.
