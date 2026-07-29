# Gate-1 brief — Client Platform Readiness Summary (dashboard)

**Task source:** PK work order, verbatim, 2026-07-29 ("DASHBOARD — CLIENT PLATFORM READINESS SUMMARY").
**Repo:** `invegent-dashboard` (separate repo from this one — see `docs/briefs/results/format-capability-indicator-v1-result.md` for precedent).
**Lane tier:** T2 (isolated dashboard code, read-only, zero DB/grant/migration change).

## 1. Outcome (PK's own words)

Show the readiness of every supported publishing platform for the selected client, including
platforms that have no schedule rows. For Facebook, Instagram, LinkedIn, YouTube, display:
publisher profile present/missing · publishing enabled/disabled · paused state+reason · schedule
configured or not · enabled schedule-slot count · current format capability status · classifier
reason code · responsible remediation lane · whether the platform can safely receive new scheduled
demand. Use the canonical shared capability classifier (`public.classify_format_capability`) — do
not recreate its logic in the frontend.

## 2. Live grounding (db-rls-auditor, read-only, 2026-07-29)

- `c.client_publish_profile`: confirmed columns `platform, publish_enabled, paused_until,
  paused_reason, paused_at, mode, preferred_format_facebook/instagram/linkedin` exist.
  **No youtube-equivalent preferred-format column exists.** `UNIQUE(client_id, platform)`.
- `c.client_publish_schedule`: confirmed `platform, enabled, day_of_week, publish_time,
  format_override` columns; PK `schedule_id`, `UNIQUE(client_id, platform, day_of_week,
  publish_time)`.
- `classify_format_capability(client_slug, platform, format)` with `format = NULL` does **not**
  error — confirmed live (`cfw × youtube × NULL` → identical `publisher_path_missing` shape as with
  a real format string). The `publisher_path_missing` check fires on `c.client_publish_profile`
  row-EXISTENCE alone, with absolute precedence, before `select_template`/format is ever consulted.
- Live smoke matrix (exact, read-only):
  - `care-for-welfare-pty-ltd` × youtube × any format → `publisher_path_missing` /
    `no_publish_profile_row` / `publisher_onboarding` (CFW has **zero** rows in both
    `client_publish_profile` and `client_publish_schedule` for youtube — true double-absence).
  - `care-for-welfare-pty-ltd` × facebook/instagram/linkedin × `image_quote` → all `ready`.
  - `property-pulse` × facebook/instagram/linkedin × `image_quote` → all `ready`.
  - `property-pulse` × youtube × `video_short_stat` → **`unsupported_silent_degrade`** /
    `no_selectable_template` / `enforcement_r3` (PP DOES have a youtube profile row,
    `publish_enabled=true`, 5 enabled schedule rows — this is a genuinely different, live failure
    class from CFW's `publisher_path_missing`, not a fixture artifact). The panel must render these
    as visibly distinct states.
  - `property-pulse` × instagram: `paused_reason` is populated
    (`meta_subcode_2207051_block_25_apr_pp_ig_anti_spam`) while `paused_until IS NULL` and
    `publish_enabled=true` — a stale/non-blocking flag. The panel must show `paused_reason`
    independent of whether the platform is *currently* paused (`paused_until` is the operative
    gate the workers honour).
- `classify_format_capability` grants reconfirmed: `service_role` (+ owner `postgres`) only, no
  `anon`/`authenticated`/`PUBLIC`. Unchanged — this lane adds a new caller, not a new grant.

## 3. Design (reuse-first — zero new DB reads beyond the existing classifier RPC)

Everything except the capability call is **already fetched** by `app/(dashboard)/clients/page.tsx`
for the existing "schedule" tab (`needsSchedule` gate): `publishProfiles` (`c.client_publish_profile`
rows for the client), `scheduleSlots` (per-platform `c.client_publish_schedule` rows via
`getPublishSchedule`, already carries `enabled`), and `allocationResult` (Slice A
`getWeekFormatAllocation`, already carries each platform's current-week `assigned_format` /
`legacy_format` = `preferred_format_<platform>`). No new table/RPC is queried for those.

**Only new call:** the existing, unmodified `getFormatCapabilityMap` (`actions/format-capability.ts`)
— already the canonical dashboard-side caller of `classify_format_capability`, already fails closed
to `unknown` per-cell, already never invents a status. Reused verbatim.

Per platform (fixed 4-platform list, NOT derived from schedule rows — this is what makes an
unscheduled platform still appear):

- **No `client_publish_profile` row** → call the classifier with a fixed, real (non-NULL) probe
  format (`image_quote`). Provably safe/irrelevant on this branch per §2's live NULL test — the
  precedence check fires on row-existence before format is ever read. This guarantees the RPC is
  always actually called (never locally guessed) so `publisher_path_missing` comes from the real
  classifier, not frontend logic.
- **Profile row exists** → call the classifier with the client's actual current-week format signal:
  first entry's `assigned_format` from the (already-fetched) Slice A allocation, falling back to its
  `legacy_format`. If neither exists (profile present, nothing scheduled, no legacy preference on
  file — only possible for youtube, which has no preferred-format column), pass `format: null`,
  which `getFormatCapabilityMap` **already** fails closed to `unknown` for, without an RPC call
  (existing, unmodified behaviour — not a new special case).
- "Safe for new scheduled demand" = `profile present AND publish_enabled=true AND NOT currently
  paused (paused_until in the future) AND capability.status === 'ready'`. Pure composition of
  already-fetched/already-classified facts — never re-derives *why* the classifier decided
  `ready`/not, never a new classification.

## 4. Files (new, additive only)

- `lib/platform-readiness.ts` — pure types + `buildCapabilityPair` + `isCurrentlyPaused` +
  `buildPlatformReadinessRow` (mirrors `lib/format-capability.ts` convention: pure, unit-testable,
  no I/O).
- `components/clients/PlatformReadinessSummary.tsx` — read-only table, one row per platform, reusing
  the existing `CapabilityCell` component verbatim for the status/reason/routed-lane cell (zero new
  badge styling).
- `app/(dashboard)/clients/page.tsx` — modified: after the existing `needsSchedule` data resolves,
  build the 4 capability pairs, call `getFormatCapabilityMap` once more (reused, unmodified), build
  `PlatformReadinessRow[]`, render `<PlatformReadinessSummary>` as the first block inside the
  existing "schedule" tab section (above `<ScheduleTab>` — "near Schedule / Format Plan" per PK's
  placement instruction).
- Tests mirroring `tests/format-capability.test.ts` convention for the new pure functions in
  `lib/platform-readiness.ts` (fixture-based, not live DB).

## 5. Explicitly NOT touched (boundaries, verbatim from PK)

`lib/format-capability.ts`, `actions/format-capability.ts`, `components/format-capability/*`,
`WeekFormatPlanTab.tsx`, `actions/week-format-plan.ts` (Format Plan stays schedule-driven,
unchanged) — zero edits. No migration, no grant change, no publisher-profile write, no schedule-row
write, no publish-enable write, no template-promotion/portfolio-weight code touched. Read-only
visibility only.

## 6. Required proof (PK's own acceptance bar)

- CFW: youtube row appears despite zero schedule rows; shows `Publisher path missing` (not
  `Unknown`); facebook/instagram/linkedin rows unchanged from live classifier truth (`ready`).
- PP: all four platforms show real live readiness, including youtube's real
  `unsupported_silent_degrade` (not fabricated as `ready` or hidden); existing weekly Format Plan
  tab is byte-unchanged and stays schedule-driven.

## 7. Completion

Build (`ef-builder`, isolated worktree off `invegent-dashboard`'s `origin/main`) → hermetic checks
(tsc, vitest, `next build`) → `branch-warden` → external review (`ask_chatgpt_review`) → **stop at
the dashboard merge/deploy gate for PK**. Only after PK deploys + a production smoke check does this
brief's result doc get written, committed, and pushed in this (CE) repo.
