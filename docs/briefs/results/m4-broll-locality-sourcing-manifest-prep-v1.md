# Result — M4 B-roll Sourcing Manifest PREP (docs/manifest only, no sourcing runs)

**Seed:** cross-session control-tower dispatch, "M4 B-roll sourcing manifest PREP" (2026-08-06), informational-only per the sending session's own framing — executed after PK confirmed in this chat
**Governing:** v6.147 allowed list ("asset sourcing and manifest preparation") + M4 acceptance test (≥3 distinct AU localities, ≥2 clips each, in the eligible VIDEO B-roll pool)
**Executed by:** Claude Code (orchestrator, live `execute_sql` reads + repo `Read`/`Grep`)
**Completed:** 2026-08-06 Sydney
**VERSION-LESS** — no register/sync-state cut, per the seed's instruction

---

## 1. Result status

`Complete` — manifest authored against live pool data; **zero downloads, zero harvest runs, zero intake writes performed.**

## 2. Commit(s)

N/A — docs/manifest-only, no commits.

## 3. Files changed

- `docs/briefs/results/m4-broll-locality-sourcing-manifest-prep-v1.md` — created (this doc)

## 4. Actions taken

**4.1 Live pool read (task 1).** `c.client_brand_asset`, `client_slug='property-pulse'`, `asset_meta->>'usage'='broll_background'`, live:

| asset_id | geo_scope | geography (specific) | eligible? | source | provider ID (`source_pexels_id`) | dupe risk |
|---|---|---|---|---|---|---|
| `42211c0f` | `au_wa_perth` | Perth skyline | **No** — `is_active=false`, `approved=false`, `sfto='needs_gradient_scrim'` (not resolver-recognised) | pexels | `31663066` | — |
| `2d62b04e` | `au_nsw` | Hurstville | ✅ | pexels | `31663307` | — |
| `4653144c` | `au_nsw_sydney_metro` | Sydney waterway | ✅ | pexels | `31639427` | — |
| `9cf9d01a` | `au_nsw_sydney_metro` | Sydney CBD skyline | ✅ | pexels | `31639440` | — |
| `aa55659e` | `generic` | architectural abstract | ✅ | pexels | `34641787` | — |
| `f84ac010` | `au_wa_perth` | Perth Cottesloe | ✅ | pexels | `32433684` | — |
| `e6e24358` | `au_nsw_sydney_metro` | Sydney Hurstville urban centre | ✅ | pexels | `31639439` | — |

**Eligible pool = 6** (matches the seed's figure). All 7 rows' `source_pexels_id` values are distinct — **zero provider-ID collisions in the current pool** (the dedup gotcha — dedup keys on `source_pexels_id`/`source_pixabay_id`, not `sha256`, per `docs/briefs/video-broll-intake-v1-gate1-brief-v1.md`'s provenance set and confirmed here by the actual stored key name; `provider_id` is not a literal key — it is stored per-provider as `source_pexels_id`/`source_pixabay_id` — worth naming precisely so a future sourcing pass greps the right key). `reuse_count`/`last_used_at` are not stored on the asset row itself — the v1.5 resolver's recent-use avoidance (below) computes this from render history at call time, not from a stored column.

**Locality concentration, grouped by the containment tree (generic/national/state/metro), not by raw `geo_scope` string:**

| Locality group | Clips | Meets "≥2" bar? |
|---|---|---|
| Sydney / NSW (`au_nsw` + `au_nsw_sydney_metro` ×3) | **4** | ✅ |
| Perth / WA (`au_wa_perth`) | **1** | ❌ — one short |
| *(generic, not a locality)* | 1 | n/a |

**Confirms the seed's framing exactly:** 4/6 eligible clips are Sydney-concentrated; only **2** real AU localities exist today (Sydney, Perth), and Perth itself is below the per-locality floor. **Zero** distinct localities currently clear "≥2 clips" except Sydney. The gap to the M4 bar (≥3 localities × ≥2 clips) is: (a) Perth needs +1 minimum to reach 2, (b) a wholly new 3rd locality needs ≥2 clips from scratch.

**4.2 Resolver/copy-geography precondition, live-verified (not assumed).** `public.resolve_slot_assets` is confirmed live at **v1.5** (`pg_get_functiondef` contains the `v1.5` marker and a live `geo_relation` call — `docs/briefs/broll-rotation-governance-v1-brief.md`, applied per `docs/briefs/results/broll-rotation-governance-v1-result.md`'s full-pass test matrix). Property Pulse's declared copy geography for `video_short_stat` (`c.client_format_copy_geography`, live row): **`copy_geo_key='au'`** (national — "live `video_short_stat` copy is national macro-economic content," PK-declared 2026-07-29). Under the governed containment rule, a locality-level clip (state/metro) is a valid **`asset_narrower_than_copy`** match against a national copy declaration — this is the pool's normal, already-proven operating mode (test-matrix row 8/9), not a new assumption. **Consequence: a new AU locality (Brisbane, Melbourne, or any other real Australian place) is reachable under PP's current copy-geography declaration without any further governance change** — sourcing a new locality does not require touching `c.client_format_copy_geography`.

**4.3 The manifest (task 2).**

**Target localities — 4 named candidates, ranked, with rationale (none sourced yet):**

| Rank | Locality | `geo_scope` proposal | Rationale |
|---|---|---|---|
| — | **Perth reinforcement** | `au_wa_perth` (existing) | Already 1 clip short of the per-locality floor; cheapest way to clear one-third of the bar — reuse an already-established locality rather than open a new one |
| 1 (primary new) | **Brisbane, QLD** | `au_qld_brisbane` | Large AU capital with materially different visual signature from Sydney/Perth (subtropical suburb, Story Bridge/CBD river-bend skyline) — good Pexels/Pixabay stock-footage availability observed in the same aerial-suburb/CBD-skyline genre the existing pool already uses, minimising a genre mismatch against the proven template's Background field |
| 2 (alternate new) | **Melbourne, VIC** | `au_vic_melbourne` | Second-largest AU capital, visually distinct (grid CBD, Yarra river, denser inner suburb tile-roof stock) — strong fallback if Brisbane sourcing underperforms the batch's "stop when sufficient" rule |
| 3 (regional option, margin only) | **Gold Coast, QLD** or **Adelaide, SA** | `au_qld_gold_coast` / `au_sa_adelaide` | Only pursued if the primary+alternate batch does not clear the bar with margin — named so a future sourcing lane is not left improvising a 4th candidate under time pressure |

**Clips-per-locality targets (batch sizing, reusing the proven `video-broll-intake-v1` shape — source 8, target 4–6 accepted, "stop when sufficient, do not maximise"):**

| Locality | Source (candidates to review) | Target accepted | Resulting total in pool |
|---|---|---|---|
| Perth (reinforcement) | 3 | 1–2 | 2–3 (clears the ≥2 floor, margin if 2 accepted) |
| Brisbane (primary new) | 5 | 2–3 | 2–3 (clears the ≥2 floor with margin) |
| **Total batch** | **8** | **4–5** | Sydney 4 (unchanged) + Perth 2–3 + Brisbane 2–3 = **8–10 eligible, 3 distinct localities, every named locality ≥2** |

This clears the M4 bar (≥3 distinct localities, ≥2 each) with real margin at the low end of the target range, and does not require touching Melbourne/Gold Coast/Adelaide unless Brisbane underperforms — per the ratified "stop when sufficient, do not maximise" rule, not a quota.

**Licence-safe sourcing rule (reused verbatim from the ratified `video-broll-intake-v1` Gate-1 brief — not re-litigated here):**
- **Approved:** Pexels Video; Pixabay Video (**never assume site-wide CC0** — verify each individual clip's licence terms); any other source only with an individually **archived** CC0/public-domain licence statement (not a verbal claim).
- **Excluded:** YouTube/social-platform downloads; generic "no copyright" aggregation sites.

**Per-clip metadata requirements (reused verbatim from `docs/briefs/results/broll-rotation-readiness-handoff-v1.md` §4, the binding activation-handoff contract — not re-derived):**
- `asset_type='other'`, `asset_meta.usage='broll_background'`, `bucket='brand-assets'`.
- `safe_for_text_overlay` ∈ `{'true','needs_scrim'}` **only** — `'needs_gradient_scrim'` is confirmed, live, NOT resolver-recognised (`42211c0f` is the standing proof of this exact failure mode; do not repeat it).
- Provenance set, all mandatory: creator, source URL, provider ID (the live key names are `source_pexels_id`/`source_pixabay_id`, confirmed by reading an existing row — **not** a generic `provider_id` key), download timestamp, archived licence evidence, `sha256` of the actual downloaded bytes (byte-verified against the public URL at apply time, not at manifest time).
- Technical set: `mime`, `duration_s` (≥12s usable after trim), `fps`, `has_audio`, `motion`, `loopable`, `aspect_ratio` — native 9:16 preferred, must crop safely to 1080×1920 (verified at review, not deferred).
- `geo_scope` at the most specific level actually depicted (e.g. `au_qld_brisbane`, not `au_qld` or `au`); `asset_name`/`asset_key` must agree with `geo_scope` — **no "generic" label on a geographically specific clip.** Reuse the existing pool's `label_constraint` convention (a plain-language note in `asset_meta`, e.g. "BRISBANE QLD SPECIFIC. MUST NEVER be labelled generic-AU, national, Sydney, or Perth. NOT machine-enforced (carry C1) — documentation only") — this is the only real control today, since the resolver still cannot filter on geography by itself (unchanged by v1.5; v1.5 adds copy-geography **conflict exclusion**, not a geography **filter over the sourcing set**).
- Safe-content rules: no readable signage, no watermarks, no third-party branding; person-free by default (identifiable people only with adequately evidenced release posture, same standing caution as the image-sourcing lane).
- `platform_scope = ['facebook','instagram','youtube']` explicit on every new row — **never `NULL`**, LinkedIn excluded until its governed video path is proven (unchanged standing rule; note the two EXISTING rows above show `platform_scope: null` live — a still-open carry from the prior lane, out of scope for this manifest, not touched or repeated here).
- All four fences (`is_active`, `approved`, `production_use_allowed`, `approval_status`) **false** at insert — fenced-first, PK visual gate is the only promotion path.

**4.4 Sourcing lane's own Gate-1 requirements + tier (task 3).** This is the **second** B-roll video-sourcing batch of the identical shape as `video-broll-intake-v1` (same table `c.client_brand_asset`, same `asset_type='other'`, same written-column set, same four fences all false at insert, same eligibility-relevant `asset_meta` key set — usage/bucket/license/safe_for_text_overlay/sha256/asset_key — same `bucket='brand-assets'`, no DDL, no GRANT/REVOKE, no upsert). Per `CLAUDE.md`'s P2 tiering rule ("same shape is a mechanical structural-diff gate... full chain runs ONCE per shape, not per asset"), this batch qualifies as **the same shape** as the already-reviewed `broll-fenced-intake-batch1` lane — **the per-apply guards are never waived regardless** (byte-verify local sha256 == public-URL sha256; in-txn fail-closed pool-neutrality assertion pinned to a live-re-read eligible-pool count at apply time; `branch-warden` clean; rollback written and validated before apply).

- **Tier: T2** for the DB write (same proven fenced-insert shape, additive, isolated) — **not automatically re-escalated to T3**, since nothing here touches the resolver, a template, or any enabled/fit_status/promotion state.
- **Chain for the future execution lane:** `db-rls-auditor` (live selector version + current exact eligible-pool count, re-verified at apply time — same-shape, so this can be a lighter confirmatory pass, not a full fresh review) → external review pinned to the apply-packet hash → `branch-warden` → the four per-apply guards inside the apply transaction → **PK visual gate**, per clip/batch (unchanged — PK visual sign-off remains the only deciding act, per the image/video-workflow non-negotiables).
- **Promotion of any sourced clip is a separate, later T3 lane** — unchanged from the prior lane's own boundary.
- Named explicit exclusions, per the seed: no downloads, no harvest runs, no intake writes, and `platform_scope` **enforcement design** (the still-open M4 platform-scope-enforcement item, `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:228-230,599-601`) is its **own**, separately ruled item — this manifest sources locality diversity only and does not design or touch the enforcement lane.

## 5. Constraints confirmed (per the seed's governing ruling)

- Zero sourcing runs — confirmed: no `WebFetch`/`WebSearch`/download of any candidate clip was performed
- Zero harvest runs — confirmed: `_harness/` untouched
- Zero intake writes — confirmed: every DB call this session was a plain `SELECT`
- Zero `platform_scope` enforcement design — confirmed: this doc names the item as explicitly out of scope and does not propose an enforcement mechanism

## 6. Open issues

1. **The two existing Sydney/Perth-adjacent rows' `platform_scope` is still `null`, live** (`2d62b04e`, `4653144c`, `9cf9d01a`, `aa55659e`, `f84ac010`, `e6e24358` all show `platform_scope: null` in the live read) — this is the still-open carry named in `broll-rotation-readiness-handoff-v1.md` §8 item 3 ("correcting the two existing rows... needs its own gate"), now apparently applying to more rows than just the original two. Not fixed here (out of scope for a manifest-only pass); flagged so the eventual sourcing/enforcement lanes don't assume it was resolved.
2. **`42211c0f` (fenced Perth clip, `needs_gradient_scrim`) remains a dead asset** unless a future lane corrects its `sfto` value — named, not touched, per the standing "do not mutate existing rows" rule this manifest inherits.
3. This manifest's locality/rationale choices (Brisbane primary, Melbourne alternate) are a recommendation, not a PK ruling — unlike the prior lane's brief, no PK gate has been taken on this specific locality choice yet. Whoever runs the eventual Gate-1 for execution should treat §4.3's ranked list as a proposal to confirm or override, not a decided fact.

## 7. Next recommended step

Present this manifest to PK for a Gate-1 decision on: (a) locality choice (Brisbane primary / Melbourne alternate / regional margin option — confirm or override), (b) batch sizing (8 sourced / 4–5 accepted, split 3-Perth/5-Brisbane — confirm or adjust), (c) whether to also fold in the still-open `platform_scope: null` correction on the six live rows as a small separate T2 DML gate (named in §6 item 1, not this manifest's own scope). Once ratified, the execution lane runs the chain named in §4.4 — sourcing, review, dedup, fenced insert — terminating at the PK visual gate, same shape as the proven precedent.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**
- All four seed tasks answered against live pool data (7 rows read in full, including the full `asset_meta` jsonb of a sample row to get exact provenance key names) and live resolver/copy-geography state (v1.5 marker + `geo_relation` call confirmed in `pg_get_functiondef`; PP's `copy_geo_key='au'` read live).
- Constraints respected: zero sourcing, zero harvest, zero writes — confirmed in §5.
- The manifest corrects one small but real precision gap in how the seed described the dedup mechanism: "provider ID" is not a literal `asset_meta` key in this schema — it's `source_pexels_id`/`source_pixabay_id` per provider, confirmed by reading a live row rather than assumed from the memory note's shorthand.
- New finding not anticipated by the seed: PP's live copy-geography declaration (`copy_geo='au'`, national) was independently confirmed to already permit any new AU locality without a governance change — this was checked rather than assumed, since a wrong assumption here would have produced a manifest recommending clips the resolver's v1.5 geo-conflict logic might then reject.

## 9. Learning notes (chat fills this)

- When a memory note names a mechanism in shorthand ("dedup on provider ID not sha256"), reading one live row's full `asset_meta` jsonb is cheap and settles the exact key name — worth doing before citing the gotcha in a forward-looking manifest, so the next sourcing lane greps the right field.
- The "same shape" mechanical test in `CLAUDE.md`'s P2 tiering rule applied cleanly here on a second real instance (this being the second B-roll video-sourcing batch of an identical shape to the first) — useful as a second data point that the rule is usable in practice, not just in the abstract.
