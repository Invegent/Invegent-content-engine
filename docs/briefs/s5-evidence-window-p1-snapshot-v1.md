# S5 Evidence Window — P1 Live Verification Snapshot v1

**Taken:** 2026-07-31 (Sydney), read-only via `execute_sql` (R1 path; `db-read.py` had no DSN in this
environment). Project `mbkmaxqhsohbtwsqolns`. **This snapshot is the rollback baseline and the
authoritative "current values" source for every S5 amendment.** Plan under verification:
`docs/briefs/s5-cross-brand-evidence-schedule-plan-v1.md` (rev-2 incorporates these results).
**No mutation of any kind was performed.**

## P1 — Baseline snapshot (rollback source of truth)

### c.client_publish_profile (Layer B, live 2026-07-31)

| client | platform | max_per_day | min_gap_minutes | max_queued | publish_enabled | paused_until | destination_id set |
|---|---|---|---|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | 2 | 240 | 10 | true | — | ✓ |
| care-for-welfare-pty-ltd | instagram | 2 | 240 | 10 | true | — | ✓ |
| care-for-welfare-pty-ltd | linkedin | 2 | 240 | 10 | true | — | ✓ |
| invegent | facebook | 2 | 240 | 10 | true | — | ✓ |
| invegent | instagram | 2 | 240 | 10 | true | — | ✓ |
| invegent | linkedin | 2 | 240 | 10 | true | — | ✓ |
| ndis-yarns | facebook | 2 | **360** | 10 | true | — | ✓ |
| ndis-yarns | instagram | **4** | 240 | 10 | true | — | ✓ |
| ndis-yarns | linkedin | 2 | 240 | **6** | true | — | ✓ |
| ndis-yarns | youtube | **4** | **360** | 10 | true | — | ✓ |
| property-pulse | facebook | 2 | **360** | **20** | true | **2026-08-01 10:33:02Z** | ✓ |
| property-pulse | instagram | 2 | 240 | **6** | true | — | ✓ |
| property-pulse | linkedin | 2 | 240 | **8** | true | — | ✓ |
| property-pulse | youtube | 2 | **360** | 10 | true | — | ✓ |

Stale, non-blocking `paused_reason` strings remain on all 4 NDIS rows
(`ndis_capability_leak_containment_2026-07-28_advisor_silent_degrade`) and PP instagram
(`meta_subcode_2207051…`) — `paused_until` is NULL on all of them. **PP facebook carries a real
pause expiring 2026-08-01 10:33Z (20:33 Sydney) — before the window opens; re-verify at apply.**

### c.client_publish_schedule (Layer C) — full 418-row dump

Persisted at `docs/briefs/data/s5-p1-client-publish-schedule-dump-2026-07-31.json`
— **sha256 (canonical sorted JSON): `7b8fecd83ef51c7a5aeaec080d9372f6e4488497693ae963b17f1ab954c5b07a`**.
Enabled-row layout (times Sydney; dow 0=Sunday, live-confirmed):

| client | platform | enabled pattern |
|---|---|---|
| property-pulse | fb / ig / li / yt | **1/day, weekdays only (dow 1–5)** — 07:30 / 10:00 / 12:00 / 17:00 respectively |
| ndis-yarns | facebook | **4/day × all 7 days** — 08:00, 08:30, 09:00, 09:30 |
| ndis-yarns | instagram | **4/day × all 7 days** — 08:30, 11:00, 11:30, 12:00 |
| ndis-yarns | linkedin | **2/day × all 7 days** — 10:00, 10:30 |
| ndis-yarns | youtube | **4/day × all 7 days** — 08:00, 09:30, 11:30, 19:00 |
| care-for-welfare | fb / ig / li | 1/day, weekdays — 09:06 / 11:02 / 13:04 |
| invegent | fb / ig / li | 1/day, weekdays — 08:06 / 10:36 / 12:36 |

Disabled grid rows exist for all brands (CFW/Invegent 28-row grids with 5 enabled; NDIS 52–58-row
grids with 28/14 enabled; PP 8–9-row grids with 5 enabled).

### Other baselines

- **c.client_schedule_cap_override:** exactly 4 rows, all ndis-yarns, set 2026-07-27 — fb 4/28,
  ig 4/28, yt 4/28, li 2/14 (override_ids `a1095f1c…`, `976b0b98…`, `43a36542…`, `de89abfc…`).
- **c.client_format_mix_override:** **0 rows** (confirmed).
- **t.dedup_policy:** `default` 168 h / title 0.75 / diversity 2 (`is_current=true`); `strict` 336 h;
  `lenient` 72 h / diversity 1 / title 0.85. Note: **all three rows have `is_current=true`** —
  selection is by `policy_name='default' AND is_current`, so this is benign but worth knowing.
- **cron.job:** 71 jobs captured with schedule + `md5(command)` (full list in session record).
  All pipeline + publisher crons **active**, including instagram-publisher jobid 53 (`*/15`).
  Inactive: only the three legacy `seed-and-enqueue-*` jobs (11, 64, 65) — expected.
- **c.client_brand_profile:** all four brands `is_active=true` with logo + primary/secondary colours
  (PP `#1E2532/#ECA02D` · NDIS `#0A2A4A/#1C8A8A` · CFW `#233141/#00BCE4` · Invegent
  `#1B3A5C/#05ADDA`).
- **c.client_format_config:** NDIS + PP: 9 formats each, all enabled, platform-agnostic (NULL
  platform). **CFW + Invegent: 0 rows** (fallback path — expected).

## P2–P8 — verification results

| Check | Result |
|---|---|
| **P2** RPC channels | ✅ All exist with researched signatures: `save_publish_cadence(uuid,text,int,int,text)` · `save_schedule_cap_override(uuid,text,int,int)` · `save_publish_schedule(uuid,text,jsonb)` · `get_publish_cadence` · `get_schedule_caps` · `get_publishing_plan_pyramid` · `classify_format_capability(p_client_slug text, p_platform text, p_format text)` |
| **P3** `save_publish_schedule` semantics | ✅ **REPLACE-ALL**: `DELETE … WHERE client_id AND platform` then INSERT from jsonb (`day_of_week`, `publish_time`, `enabled` default true). ⇒ every call must submit the **complete** desired row set; rollback = resubmit the P1 dump's rows for that (client, platform). The delete fires the future-slot re-flow trigger — apply in one pre-window batch only. |
| **P4** day_of_week convention | ✅ `m.compute_rule_slot_times` matches `EXTRACT(dow FROM d)::integer = day_of_week` ⇒ **0..6, 0=Sunday**. The repo-research ISO-1..7 warning does NOT apply to the live function; Sunday=0 rows are valid (NDIS's dow-0 rows fire). |
| **P5** classifier verdicts (22 cells) | See below — 4 upgrades, 2 downgrades vs the plan's assumptions, 1 governance conflict. |
| **P6** brand kits | ✅ RESOLVED — all four brands have active profiles with logo + colours; the 2026-07-06 census blockers (CFW colours, Invegent logo) are closed live. CFW/Invegent still have no format config (fallback → image_quote; consistent with plan). |
| **P7** destination_id | ✅ non-NULL on all 14 profiles (throttle-fragility R5 precondition absent). |
| **P8** release state | ✅ all four NDIS `paused_until` NULL; `publish_enabled=true` on all 14 cells; publisher + pipeline crons active. ⚠ PP facebook paused until 2026-08-01 10:33Z (expires pre-window; re-verify at apply). |

### P5 classifier detail (live 2026-07-31)

**READY (selectable, governed):** PP fb image_quote (**winner = announcement.v1 — see STOP flag**) ·
PP fb carousel (carousel_cover.v1, visually_approved) · PP ig image_quote (market_update.v1,
production_proven) · PP ig carousel · PP li image_quote (production_proven) · **PP ig
video_short_stat (stat-reveal-9x16-broll-v1 via `AU_generic_national_Suburb_9:16_V1`,
visually_approved — a governed video cell the plan assumed unavailable)** · NDIS fb/ig/li
image_quote (production_proven) · CFW fb/ig/li image_quote (production_proven) · Invegent fb/ig/li
image_quote (production_proven).

**template_missing (slots would SKIP → recorded gap evidence):** PP fb animated_text_reveal · PP ig
animated_data (`format_unmapped`, routed `template_creatomate_heygen`). **G6 confirmed live.**

**unsupported_silent_degrade (exempt `text` still fills; others skip):** PP fb text (5/90d) · PP li
text (68/90d) · PP yt video_short_kinetic (28/90d) · NDIS fb text (20/90d) · NDIS li text (70/90d).

### 🔴 STOP-class finding for the PK gate (policy_decision)

`select_template('property-pulse','facebook','image_quote')` now selects
**`generic_announcement_card_1x1_v1`** (assignment `c922da41…`, visually_approved, winning the FB
selection) — while register v6.87 still carries the **`task_05bf8b3d` release gate**:
*announcement_card may not enter unattended automatic selection* until the Facebook publisher's
`m.post_publish` `attempt_no` audit-row bug is proven fixed. Every unattended PP×facebook
image_quote fill (S5's daily cell — and today's natural cadence too, independent of S5) will render
and publish announcement_card. **PK must rule before the window opens:** (a) accept the exposure for
the window, (b) exclude/deprioritise the PP fb image_quote cell, or (c) prove the publisher fix
first. This plan does not choose.

## Consequences applied to the plan (rev-2)

1. **A1 shrinks.** NDIS needs **no Layer-C change** (already 4/4/2/4 per day × 7 days — at or above
   the S5 target). CFW/Invegent need only **weekend extension** (dow 0 and 6 rows at their existing
   times). PP needs the real expansion: 1/day weekdays → 2/day all-week on fb/ig/li; YT unchanged.
2. **A1 mechanism pinned.** Replace-all semantics: each `save_publish_schedule` call submits
   existing + new rows; rollback = resubmit P1 rows (hash-pinned dump above).
3. **A2 shrinks.** Only five raises remain: PP fb 2→4 · PP ig 2→4 · NDIS fb 2→4 · CFW fb/ig 2→3 ·
   Invegent fb/ig 2→3. NDIS ig already 4; NDIS li queue raise dropped (6 has served 2/day×7 fine);
   LinkedIn clamp untouched everywhere.
4. **PP matrix upgrades:** animated_* slots re-pointed to **ready** tests — `video_short_stat` on
   instagram (new governed cell; also feeds the B-roll rotation-evidence carry) and additional
   carousel/image_quote sampling. The two animated formats stay in the week as **one deliberate
   gap-evidence slot each** (skip rows confirm G6 at zero cost), not as content.
5. **min_gap corrections absorbed:** PP fb and NDIS fb run 360 min gaps — PP fb slot times set
   08:00/16:30 (8.5 h) and NDIS's existing morning cluster already publishes through deferral;
   no `min_gap_minutes` change proposed (unchanged from rev-1).
6. **PP fb pause (exp. 2026-08-01) + announcement_card STOP flag** added to the apply-gate
   pre-checks.
