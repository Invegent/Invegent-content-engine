# M16 — W-1 Fleet-Relevance Analysis: Does Option C Also Surface NDIS's Starvation? (v1)

**Lane:** M16 pool-health-fix build, isolated worktree `lane/m16-pool-health-fix-build`.
**Nature:** READ-ONLY ANALYSIS. No live query was run beyond what is already cited below
(all facts are supplied by the task brief, sourced from prior live reads on 2026-08-06 and
the Day-3 watch-log). Nothing in this document is applied to any database, and it does not
gate on or block the Section-1/Section-2 SQL in
`supabase/migrations/NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql`.

## Question

Does Option C's health-visibility fix (Section 1 of the sibling migration file) also surface
NDIS-Yarns' `pool_thin` / `bundle_diversity_insufficient` starvation (Day-3 watch-log finding
W-1) to the same `check_pool_health()`-gated auto-relax path that CFW's starvation goes
through?

## Cited facts (not re-derived here)

1. NDIS-Yarns (`client_id fb98a472-ae4d-432d-8738-2273231c1ef4`) shares the EXACT SAME
   verticals as CFW: `vertical_id 11` and `12`, per `c.client_content_scope` (live-queried
   2026-08-06).
2. `check_pool_health(11)` and `check_pool_health(12)` both return `health:'green'` LIVE
   TODAY (2026-08-06T03:55:21Z) — identical `total:1582, active:70, distinct_sources:49,
   avg_fitness:88.37` for both. `m.signal_pool` is scoped by `vertical_id` only, not by
   client, so CFW and NDIS are reading the literal same pool rows when either client's slot
   fills consult vertical 11 or 12
   (`docs/briefs/artifacts/m16-live-baseline-check_pool_health-v1.sql`).
3. Day-3 watch-log (`docs/briefs/artifacts/cgu-final-phase1-watch-log-v1.md`, "Day 3"
   section, finding W-1): since the v11 apply, NDIS fills=7 vs 17 non-capability skips, split:
   - `bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen` — FB 5, LI 4 (pool avg
     fitness 42 — populated but diversity-thin).
   - `pool_thin;no_eligible_evergreen` — IG 3, LI 2, FB 1 (eligible pool 0 at attempt).
4. `t.format_quality_policy` (min_fitness_threshold, min_pool_size_for_format) and
   `t.format_synthesis_policy` are looked up by `ice_format_key` ONLY — no `client_id` column
   in either query (`m16-live-baseline-fill_pending_slots-v1.sql`, lines ~432-435). These are
   GLOBAL per-format policies, not per-client. CFW's documented `image_quote` policy row
   (`min_fitness_threshold=60`, `min_pool_size_for_format=2`) applies identically to NDIS's
   `image_quote` slots.
5. The `pool_thin` skip reason (baseline file line ~671,
   `v_skip_reason := COALESCE(v_skip_reason,'pool_thin') || ';no_eligible_evergreen'`) is set
   precisely when `v_pool_count` (the post-relax-attempt qualifying count) stays below
   `v_quality.min_pool_size_for_format` even after the `check_pool_health()`-gated relax
   branch ran (or did not run, because health was not `'red'`) — lines ~526-597 of the
   baseline file. This is the SAME code path CFW's starvation goes through.

## Analysis

### Path 1 — `pool_thin` skips (IG 3, LI 2, FB 1 in the W-1 breakdown)

`pool_thin` is set in `fill_pending_slots` exactly when the candidate_pool CTE (and, if it
ran, the relaxed_pool CTE) both fail to clear `v_quality.min_pool_size_for_format` (baseline
lines ~526-671). The relax branch is gated on `check_pool_health()`'s `health` value at the
SAME vertical (11/12) NDIS shares with CFW (fact 1+2). Since:

- the pool rows being measured are the identical rows CFW's starvation is diagnosed against
  (fact 2 — same `vertical_id`, same `m.signal_pool` table, no client-side filter inside
  `check_pool_health()`), and
- `check_pool_health()` currently returns `green` for both verticals today, meaning the relax
  valve has NEVER fired for NDIS's `image_quote`/other-format `pool_thin` skips either (same
  masking defect S1 documented for CFW),

Option C's fix — IF it flips verticals 11/12's health away from `'green'` (and, per the
worked arithmetic in Section 1 of the sibling migration file, to `'red'` specifically, which
is the exact string the relax branch requires) — would extend the identical relax opportunity
to NDIS's `pool_thin`-classified attempts. **This is a plausible, evidence-supported
extension**, not a certainty: NDIS's `pool_thin` skips are on IG/LI/FB and possibly
non-`image_quote` formats (the exact `chosen_format` per skipped attempt is not enumerated in
the cited W-1 breakdown, only platform+reason), so whether the relaxed threshold would
actually surface a qualifying NDIS candidate depends on NDIS's own per-format pool state at
relax time (analogous to the arithmetic that showed CFW's 34 reused items clear the relaxed
threshold — that specific number is CFW's, not independently re-derived for NDIS here).

**Conclusion for `pool_thin`: Option C plausibly helps.** It removes the same masking defect
for the same shared pool; whether it actually produces enough relaxed-threshold candidates for
NDIS's specific formats is not verified in this analysis (would require a live re-read of
NDIS's per-format `fitness_per_format` / body-health / decay state at each attempt, which is
out of scope here — this is a plausibility argument from the shared-pool + shared-policy +
shared-code-path facts already cited, not a new live measurement).

### Path 2 — `bundle_diversity_insufficient` skips (FB 5, LI 4 in the W-1 breakdown)

This skip reason is set in an entirely different branch of `fill_pending_slots`
(baseline lines ~606-636, the bundle-synthesis-mode `ELSE` branch): it fires when a bundle
format's candidate pool has ENOUGH qualifying rows (`v_pool_count >= min_pool_size_for_format`
already passed) but the picked bundle's distinct-source count is below
`v_dedup.same_source_diversity_min`. This check runs strictly AFTER the
`min_pool_size_for_format` / `check_pool_health()` relax gate (which only fires when the pool
is BELOW min size) — a pool that already cleared the size gate never reaches the relax branch
at all (`IF v_pool_count < v_quality.min_pool_size_for_format THEN ... check_pool_health ...`,
baseline line ~526, is simply not entered).

**Conclusion for `bundle_diversity_insufficient`: Option C is UNAFFECTED / does not apply.**
This is a distinct source-diversity check on a bundle format, gated on
`v_dedup.same_source_diversity_min`, with no dependency on `check_pool_health()` or its
`health` value at all. Fixing the health-visibility blind spot cannot change an outcome that
never consults `check_pool_health()` in the first place.

## Bottom line

| NDIS skip category (W-1) | Goes through `check_pool_health()`-gated relax? | Option C relevance |
|---|---|---|
| `pool_thin;no_eligible_evergreen` (IG 3, LI 2, FB 1) | Yes — same code path, same shared vertical-11/12 pool as CFW | **Plausibly extends the same relax opportunity** (not independently re-verified for NDIS's specific per-format numbers) |
| `bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen` (FB 5, LI 4) | No — a distinct source-diversity check gated on `same_source_diversity_min`, reached only when the pool ALREADY cleared the min-size gate | **Not affected** |

This is analysis only. No SQL was executed, no live NDIS-specific query was run beyond the
facts already supplied and cited above, and nothing here is a claim that Option C fixes
NDIS's `pool_thin` skips — only that the mechanism by which it could help (the shared pool +
shared global format policy + shared relax code path) is the same mechanism CFW's diagnosis
already demonstrates, and that the `bundle_diversity_insufficient` category is provably outside
that mechanism's reach.
