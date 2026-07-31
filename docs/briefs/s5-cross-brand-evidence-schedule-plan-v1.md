# S5 — Cross-Brand Maximum Evidence Schedule — Plan v1 (PROPOSAL — NOT APPLIED)

**Status:** PROPOSED **rev-2** · P1–P8 live verification COMPLETE (2026-07-31, read-only — see
`docs/briefs/s5-evidence-window-p1-snapshot-v1.md`, schedule baseline hash `7b8fecd8…`) · awaiting
PK gate + separate apply authorisation. **No schedule row, cap, policy, cron, or profile mutation
has been made.** Rev-2 corrections from live truth: A1/A2 shrunk (NDIS needs no demand change;
CFW/Invegent need weekend rows only), PP animated slots re-pointed to ready tests (`video_short_stat`
instagram is live-selectable; both animated formats confirmed `template_missing`), replace-all
semantics of `save_publish_schedule` pinned, dow=0..6 (0=Sunday) confirmed, brand-kit blockers
confirmed resolved, and one 🔴 STOP-class policy finding raised (announcement_card selector vs
`task_05bf8b3d` — snapshot doc, final section). §2a below carries the schedule corrections; §2
tables remain the rev-1 intent for traceability. This document is the complete reviewable plan.
**Task:** S5 — design a temporary seven-day evidence schedule for all four ICE brands to exercise
the maximum number of currently available platform × format capabilities through **normal scheduled
generation**, accumulating real evidence toward Creatomate Global graduation.
**Lane classification (CCF-02):** PRODUCT_PROOF · **T3** (publish-cadence + schedule mutations are
production posture; several amendments have no RPC/audit path and need a postgres-level channel).
**Evidence basis:** CE repo HEAD `9112972` (register v6.87, 2026-07-31); four read-only research
sweeps over CE + dashboard repos; **rev-2: P1–P8 read-only live verification against the production
DB (2026-07-31)** — results and the rollback baseline in
`docs/briefs/s5-evidence-window-p1-snapshot-v1.md`; the volatile subset re-runs at apply (§8).
**Window:** Mon **2026-08-03** 00:00 → Sun **2026-08-09** 23:59 Australia/Sydney (AEST, UTC+10).
**Rollback date:** Mon **2026-08-10**, 09:00 Sydney (§7). Apply deadline: **Sun 2026-08-02 ~22:00
Sydney**, before the 01:00 Mon nightly `materialise-slots` run.

**Terminology note (flagged, not guessed):** "Creatomate Global Ultimate" does not exist as a term in
either repo. The nearest real objects are (a) the **Creatomate Global** lane + the ratified
registry-integrity graduation contract (9 proof states, 13-rung ladder,
`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md`), and (b) **PP Ultimate
TMR Done** (`docs/governance/pp-tmr-definition-of-done-v1.md`, currently WITHHELD on open D5/D6).
This plan targets evidence for (a), which also serves (b). PK should confirm or correct this reading.

---

## 1. Current platform × format readiness matrix (all four brands)

Vocabulary = the live classifier statuses (`ready · asset_shortage · template_missing ·
pipeline_missing · governance_unproven · unsupported_silent_degrade · publisher_path_missing`) plus
the `text` carve-out (`render_engine='none'` ⇒ capability-exempt). Since 2026-07-29 the Layer-1
capability gate in `m.fill_pending_slots` **skips** (never substitutes) any slot whose format is not
`ready`/exempt, recording `capability_blocked:<status>:<format>` in `m.slot_fill_attempt` — so a
non-ready cell scheduled in this window produces **recorded gap evidence at zero token/render cost**,
not content.

### Property Pulse (format-mix enrolled — the only brand whose weekly format mix is steerable)

| Platform | Format | Readiness | Notes / blocker |
|---|---|---|---|
| facebook | image_quote | **ready** — `production_proven` (market_insight_card, own evidence 32/30/28) | governed; the fleet's strongest cell |
| facebook | text | exempt carve-out | publishes without template |
| facebook | carousel | **legacy path works** (104 real PP drafts); TMR carousel family unwired | classifier verdict for this exact cell **VERIFY LIVE** — if non-ready it becomes recorded gap evidence |
| facebook | animated_text_reveal / animated_data | buildable, **zero production proof** | candidate; classifier verdict VERIFY LIVE |
| instagram | image_quote | **ready** | governed |
| instagram | carousel | legacy path works | same caveat as FB carousel |
| linkedin | text | exempt — **currently the allocated format, 69/90d on an ungoverned path** | named pre-existing production risk; template gap → creatomate_global lane |
| linkedin | image_quote | template `production_proven` for PP; LI-specific publish evidence thin | candidate → this window's target |
| youtube | video_short_kinetic (allocated) | **unsupported_silent_degrade / format_unmapped** | since the Layer-1 gate, PP YouTube slots skip — no governed YT cell exists |
| youtube | youtube_thumbnail background | **asset_shortage** — the one live P0 in the Asset Gap Register | Asset Gap lane (Path B data-only close) |
| (9:16) | video_short_stat | selectable, `visually_approved`, **not promoted**; PP-attributable timeout rate 62.5% | timeout evidence is itself graduation evidence; existing weekly slot 2026-08-06 falls inside the window |
| (avatar) | video_short_avatar | PP has 1 active avatar; heygen landscape-only (YT Shorts excluded) | F-HEYGEN-WORKER-LANDSCAPE-DIMENSION (P3) |

### NDIS Yarns (S9 containment fully released 2026-07-30; capability blocks remain per format)

| Platform | Format | Readiness | Notes / blocker |
|---|---|---|---|
| facebook | image_quote | **ready** — promoted `production_proven` 2026-07-29 (14/14/12 own evidence) | governed |
| facebook | text | exempt — 21/90d | |
| facebook | carousel | **blocked** — `no_selectable_template` (7/90d demand stopped) | creatomate_global lane |
| instagram | image_quote | **ready** (79% of IG volume restored) | governed |
| instagram | carousel / video_short_avatar / video_short | **blocked** | template/format gaps |
| linkedin | text | exempt — **71/90d, the largest single cell** | proven through the live gate (capability_skips=0) |
| linkedin | image_quote | **ready** — PK visual PASS | governed |
| linkedin | carousel / video_short_avatar | **blocked** | |
| youtube | all 5 video formats | **blocked — 0% of volume restorable, by design** | "YouTube is NOT publishing-operational until Creatomate Global supplies a supported, selector-reachable format" — existing schedule rows already generate recorded skip evidence |
| (9:16) | video_short_stat | assignment exists, **zero NDIS-attributable evidence** | non-transferability rule: PP proof cannot graduate NDIS |

### Care for Welfare (7 live cells; thin config)

| Platform | Format | Readiness | Notes / blocker |
|---|---|---|---|
| facebook / instagram / linkedin | image_quote | template `production_proven` for CFW (10/10/8 own evidence, promoted 2026-07-29) | governed — but see brand-kit tension below |
| all | brand kit | 2026-07-06 census: **no brand colours, no `client_format_config` rows** (fallback path); 16 logo variants intaken **fenced** | in direct tension with the 2026-07-29 promotion — **VERIFY LIVE** how governed renders resolve CFW brand assets before the window |
| youtube | any | **publisher_path_missing** — no `client_publish_profile` row AND no schedule row (true double absence) | `publisher_onboarding` lane; fail-closed (`pause_profile_missing` rule) — **not schedulable, not to be worked around** |
| website | text/image | live publisher (40 publishes), outside the 4-platform set + outside S9 enforcement | **out of scope for this window; untouched** |
| (video) | any | no avatar (0 active), no video evidence | capability gap |

### Invegent

| Platform | Format | Readiness | Notes / blocker |
|---|---|---|---|
| facebook / instagram / linkedin | image_quote | **`production_proven`** via `generic_quote_card_1x1_v1` (11/11/8 across 3 platforms, 100% Invegent-attributable) | governed |
| all | brand kit | 2026-07-06 census: `brand_logo_url` NULL, no colours ("missing logo is a hard-fail for governed image_quote"); 17 logo variants intaken **fenced** | in tension with July `production_proven` renders — **VERIFY LIVE** (`c.client_brand_profile`, `c.client_brand_asset` for `93494a09…`) |
| youtube | any | **publisher_path_missing** — no profile row | `publisher_onboarding` lane; not schedulable |
| all | governed backgrounds | **0** (P1 thin-pool, masked by "no gap") | Asset Gap lane |
| — | cc-0049 lane | geometry PK-PASSED; lane **OPEN overall** (outstanding §5a regression render is Property Pulse's) | window renders may naturally discharge it — flag to PK |

**Fleet-wide structural facts that shape the schedule:**
- **YouTube currently has zero governed operational cells for any brand.** NDIS blocked by design;
  PP's allocated format is unsupported (skips since the Layer-1 gate); CFW/Invegent have no profile
  row. YouTube participates in this window **only as recorded capability-gap evidence**.
- **Format targeting is only steerable for PP.** `m.format_mix_enrolled()` hardcodes PP's UUID;
  other brands take `preferred_format_<platform>` (only FB populated; IG/LI fall back to
  `image_quote`; YouTube is hardcoded `video_short_avatar` in the materialiser). The ai-worker
  format advisor can override any slot's intent — divergence is recorded and is itself evidence.
- **The Layer-1 gate is the arbiter.** Where this plan's expected classification is wrong, the
  outcome is a recorded skip, not a silent substitution — both outcomes are usable evidence.

---

## 2. Proposed seven-day schedule

Design rules applied: slot times ≥ 4.5 h apart (respects `min_gap_minutes=240` with margin — this
plan deliberately does **not** touch `min_gap_minutes`, see §3); per-brand time offsets stagger fill
and render load (mitigates the open `task_500c9698` image-worker poll race); weekend days included
(no weekend evidence exists today); no CFW/Invegent YouTube slots (fail-closed onboarding absence is
already recorded by the readiness queue — scheduling against a missing profile adds nothing);
NDIS/PP YouTube rows left at existing cadence (their skips are the gap evidence — no additions, to
avoid manufacturing repetitive skip rows).

Column key — **D/R/P**: draft / render / publish permitted. **Cap consumed**: against the §3
temporary values. All times Australia/Sydney. "iq" = image_quote.

### Property Pulse — 2 slots/day on FB (08:00, 16:30), IG (09:00, 17:30), LI (10:00, 14:45); YT existing rows only

Weekly format intent comes from temporary mix overrides (A4): FB iq 45 / carousel 25 / atr 15 /
text 15 · IG iq 45 / carousel 30 / ad 25 · LI text 50 / iq 50. Per-day intents below are the design
allocation; `m.allocate_week_formats` (Hamilton) does the real ordinal assignment and the advisor may
override — divergence is recorded evidence, not failure.

| Day | Platform | Intended formats (2 slots) | Readiness | Times | D/R/P | Cap consumed | Expected evidence | Blocker / gap |
|---|---|---|---|---|---|---|---|---|
| Mon 08-03 | facebook | iq · carousel | ready · legacy-uncertain | 08:00 · 16:30 | ✅✅✅ | 2/4 publish | governed iq render+publish; carousel classifier verdict + render or recorded skip | TMR carousel unwired |
| Mon | instagram | iq · carousel | ready · legacy-uncertain | 09:00 · 17:30 | ✅✅✅ | 2/4 | same, IG surface | same |
| Mon | linkedin | text · iq | exempt · candidate | 10:00 · 14:45 | ✅✅✅ | 2/2 | first governed PP×LI iq publish evidence | LI publish clamp 2/day |
| Mon | youtube | (existing row) video (hardcoded/allocated) | unsupported | existing | ✅ slot only | 0 | `capability_blocked` skip row = gap evidence | no governed YT cell fleet-wide |
| Tue 08-04 | facebook | iq · animated_text_reveal | ready · candidate | 08:00 · 16:30 | ✅✅✅ | 2/4 | first atr production evidence, or recorded skip | atr zero production proof |
| Tue | instagram | iq · animated_data | ready · candidate | 09:00 · 17:30 | ✅✅✅ | 2/4 | first ad production evidence, or recorded skip | ad zero production proof |
| Tue | linkedin | iq · text | candidate · exempt | 10:00 · 14:45 | ✅✅✅ | 2/2 | LI iq accumulation | |
| Wed 08-05 | facebook | iq · carousel | ready · legacy-uncertain | 08:00 · 16:30 | ✅✅✅ | 2/4 | carousel repeat sample (different topic via dedup) | |
| Wed | instagram | iq · carousel | ready · legacy-uncertain | 09:00 · 17:30 | ✅✅✅ | 2/4 | | |
| Wed | linkedin | text · iq | exempt · candidate | 10:00 · 14:45 | ✅✅✅ | 2/2 | | |
| Thu 08-06 | facebook | iq · text | ready · exempt | 08:00 · 16:30 | ✅✅✅ | 2/4 | governed-vs-exempt same-day contrast | |
| Thu | instagram | iq · animated_data | ready · candidate | 09:00 · 17:30 | ✅✅✅ | 2/4 | | |
| Thu | linkedin | iq · text | candidate · exempt | 10:00 · 14:45 | ✅✅✅ | 2/2 | | |
| Thu | (9:16) | video_short_stat — **existing natural weekly slot** | visually_approved, selectable | existing | ✅✅ per current path | — | first post-TPR-parity natural render; timeout-rate datapoint (62.5% history) | not promoted; timeout class |
| Fri 08-07 | facebook | iq · carousel | ready · legacy-uncertain | 08:00 · 16:30 | ✅✅✅ | 2/4 | | |
| Fri | instagram | iq · carousel | ready · legacy-uncertain | 09:00 · 17:30 | ✅✅✅ | 2/4 | | |
| Fri | linkedin | text · iq | exempt · candidate | 10:00 · 14:45 | ✅✅✅ | 2/2 | | |
| Sat 08-08 | facebook | iq · animated_text_reveal | ready · candidate | 08:00 · 16:30 | ✅✅✅ | 2/4 | weekend pool-health datapoint | weekend pools unmeasured |
| Sat | instagram | iq · carousel | ready · legacy-uncertain | 09:00 · 17:30 | ✅✅✅ | 2/4 | | |
| Sat | linkedin | text · iq | exempt · candidate | 10:00 · 14:45 | ✅✅✅ | 2/2 | | |
| Sun 08-09 | facebook | iq · carousel | ready · legacy-uncertain | 08:00 · 16:30 | ✅✅✅ | 2/4 | | |
| Sun | instagram | iq · animated_data | ready · candidate | 09:00 · 17:30 | ✅✅✅ | 2/4 | | |
| Sun | linkedin | iq · text | candidate · exempt | 10:00 · 14:45 | ✅✅✅ | 2/2 | | |

PP distinct format tests across the week: **iq (governed), carousel, animated_text_reveal,
animated_data, text, video_short_stat** — ≥4 distinct on most days, per the brief, without forcing
unsupported combinations.

### NDIS Yarns — 2 slots/day on FB (08:15, 16:45), IG (09:15, 17:45), LI (10:15, 15:00); YT existing rows only

Not mix-enrolled: formats resolve via `preferred_format_<platform>` (+ advisor). Intended = the
brand's honest current format set: iq (governed, all 3 platforms) + text (exempt, FB/LI). Carousel
and all video formats stay blocked → **not scheduled as content**; their standing demand is already
recorded. The pattern repeats daily (topics differentiated by dedup policy):

| Day | Platform | Intended formats | Readiness | Times | D/R/P | Cap consumed | Expected evidence | Blocker / gap |
|---|---|---|---|---|---|---|---|---|
| Mon–Sun (daily) | facebook | iq · (text/iq, advisor-decided) | ready · exempt | 08:15 · 16:45 | ✅✅✅ | 2/4 | governed iq volume evidence post-release; advisor format-choice distribution | carousel blocked (`no_selectable_template`) |
| Mon–Sun (daily) | instagram | iq · iq | ready | 09:15 · 17:45 | ✅✅✅ | 2/4 | IG governed accumulation toward `production_proven` platform depth | carousel/avatar/video_short blocked |
| Mon–Sun (daily) | linkedin | text · iq | exempt · ready | 10:15 · 15:00 | ✅✅✅ | 2/2 | largest-cell (text) continuity + governed iq depth | carousel/avatar blocked |
| Mon–Sun | youtube | (existing rows) video_short_avatar (hardcoded) | **blocked by design** | existing | ✅ slot only | 0 | `capability_blocked` skip rows — the standing YT gap record | 0% restorable until Creatomate Global ships a supported format |

NDIS distinct format tests: **iq (×3 platforms), text (×2)** — 2 distinct formats, 4 platform
surfaces. Four-per-day is **not reachable** for NDIS without unblocking carousel/video (template
gaps, named in §9) — recorded as a visible capability shortfall, not padded.

### Care for Welfare — 1 slot/day per platform: FB 08:30, IG 09:30, LI 11:00 (no YT — no profile row)

| Day | Platform | Intended format | Readiness | Time | D/R/P | Cap consumed | Expected evidence | Blocker / gap |
|---|---|---|---|---|---|---|---|---|
| Mon–Sun (daily) | facebook | iq | ready (template production_proven) | 08:30 | ✅✅✅ | 1/3 | CFW-attributable governed evidence depth; **pool-health/pool_thin data** (feed is thin — skips expected and are evidence) | brand-kit tension (colours/format-config) — pre-check P6 |
| Mon–Sun (daily) | instagram | iq | ready | 09:30 | ✅✅✅ | 1/3 | same | |
| Mon–Sun (daily) | linkedin | iq | ready | 11:00 | ✅✅✅ | 1/2 | same | |
| — | youtube | — **not scheduled** | publisher_path_missing | — | — | — | gap already recorded by readiness queue | first-time OAuth onboarding = its own future lane |

CFW distinct format tests: **iq (×3 platforms)**; text/carousel/video all unavailable (no format
config, no avatar, no templates) → §9. Website channel deliberately untouched.

### Invegent — 1 slot/day per platform: FB 08:45, IG 09:45, LI 11:15 (no YT — no profile row)

| Day | Platform | Intended format | Readiness | Time | D/R/P | Cap consumed | Expected evidence | Blocker / gap |
|---|---|---|---|---|---|---|---|---|
| Mon–Sun (daily) | facebook | iq (quote_card winner) | ready (production_proven) | 08:45 | ✅✅✅ | 1/3 | Invegent-attributable depth; may naturally discharge the open cc-0049 §5a regression obligation (flag to PK) | logo/brand-kit tension — pre-check P6 |
| Mon–Sun (daily) | instagram | iq | ready | 09:45 | ✅✅✅ | 1/3 | | |
| Mon–Sun (daily) | linkedin | iq | ready | 11:15 | ✅✅✅ | 1/2 | | |
| — | youtube | — **not scheduled** | publisher_path_missing | — | — | — | gap recorded | publisher_onboarding lane |

---

### §2a — Rev-2 schedule corrections (from P1 live verification, 2026-07-31)

The §2 tables were designed against repo-derived assumptions; live truth changes them as follows —
**this section governs where they conflict:**

1. **NDIS Yarns: NO schedule change at all.** Live grid is already 4/day×7 (fb, ig, yt) and
   2/day×7 (li) — at or above the S5 target. NDIS's window contribution runs on the existing grid;
   its YT slots already produce the capability-skip gap evidence daily.
2. **CFW + Invegent: weekend extension only.** Both already run 1/day weekdays on fb/ig/li; the
   only Layer-C change is adding dow 0 (Sun) and dow 6 (Sat) rows at their existing times.
3. **Property Pulse is the real expansion:** fb/ig/li go from 1/day×5 (07:30/10:00/12:00) to
   2/day×7 — second daily slot at 16:30 (fb), 17:30 (ig), 16:45 (li), and weekend rows added at
   both times. PP fb's 360-min gap is respected (08:00→16:30 ≈ 8.5 h; the existing 07:30 slot
   moves to 08:00 for uniformity **only if PK prefers — default: keep 07:30, add 16:30**). YT
   unchanged (its 5 weekly skip rows are the gap evidence).
4. **PP format intents re-pointed to live-ready cells:** `animated_text_reveal` (fb) and
   `animated_data` (ig) are live-confirmed `template_missing` → each keeps exactly **one**
   deliberate gap-evidence slot in the week (Tue), and every other §2 slot that named them becomes:
   ig → **`video_short_stat`** (live-selectable governed video via the B-roll template — also feeds
   the "no natural video_short_stat render since the rotation apply" carry), fb → carousel or
   image_quote. Live-ready PP cells for the window: fb iq (⚠ announcement_card STOP flag) ·
   fb carousel · ig iq · ig carousel · ig video_short_stat · li iq · plus exempt text on fb/li.
5. **PP facebook is paused until 2026-08-01 10:33Z** (expires before the window) — re-verify NULL
   at apply; if still set, that is a named live pre-check failure → STOP.

## 3. Exact temporary cap amendments required

Three structural layers (research-confirmed): **Layer A** dashboard schedule caps (UI-advisory only,
no worker reads them) · **Layer B** publish cadence (`c.client_publish_profile`, enforced twice:
`m.publisher_lock_queue_v2` + publisher EFs) · **Layer C** demand (`c.client_publish_schedule` rows —
one row = one recurring weekly slot). Raising A alone changes nothing; C creates the drafts; B lets
them publish. There is **no expiring-cap primitive** in ICE — the window is composed from these
amendments plus the §7 dated rollback.

### A1 — Layer C: temporary schedule rows (the actual evidence driver)

Target state for the window — **rev-2, live-verified baseline** (P1 snapshot hash `7b8fecd8…`):

| Brand | facebook | instagram | linkedin | youtube |
|---|---|---|---|---|
| property-pulse | 1/day×5 → **2/day × 7** (07:30, 16:30) | 1/day×5 → **2/day × 7** (10:00, 17:30) | 1/day×5 → **2/day × 7** (12:00, 16:45) | **no change** (5 skip-evidence rows/wk stand) |
| ndis-yarns | **NO CHANGE** (already 4/day × 7) | **NO CHANGE** (4/day × 7) | **NO CHANGE** (2/day × 7) | **NO CHANGE** (4/day × 7 — daily skip evidence) |
| care-for-welfare-pty-ltd | add Sat+Sun @ 09:06 → **1/day × 7** | add Sat+Sun @ 11:02 → **1/day × 7** | add Sat+Sun @ 13:04 → **1/day × 7** | **none (no profile — do not create)** |
| invegent | add Sat+Sun @ 08:06 → **1/day × 7** | add Sat+Sun @ 10:36 → **1/day × 7** | add Sat+Sun @ 12:36 → **1/day × 7** | **none** |

Mechanism (P3-resolved): `public.save_publish_schedule(client_id, platform, slots_jsonb)` is
**REPLACE-ALL** — it deletes every row for the (client, platform) and inserts the submitted set.
Therefore each call submits the **complete** desired row set (P1 dump rows + the additions above,
including the disabled grid rows if their preservation is desired — default: resubmit enabled rows
only and accept disabled-grid loss is NOT acceptable → **submit the full per-cell row set from the
P1 dump plus additions, preserving each row's `enabled` flag**). Rollback = resubmit the P1 dump's
rows verbatim per cell. The delete fires `trg_handle_schedule_rule_change` (unfilled future slots
re-flowed) — all A1 calls land in **one batch, before the 2026-08-03 window**, never mid-window.
P4-resolved: `day_of_week` is **0..6 with 0=Sunday** (`EXTRACT(dow)` in the live
`m.compute_rule_slot_times`); weekend rows use dow 6 (Sat) and 0 (Sun).

### A2 — Layer B: publish cadence raises (`public.save_publish_cadence`, service_role; audit rows automatic in `c.publish_cadence_change_log`)

**Rev-2 — exactly five calls remain** (live baseline from the P1 snapshot; max_queued passed back
unchanged at each cell's current value so the RPC alters only max_per_day):

| Brand | Platform | max_per_day now → window | max_queued (unchanged) | Call |
|---|---|---|---|---|
| property-pulse | facebook | 2 → **4** | 20 | `save_publish_cadence('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook',4,20,'s5-evidence-window')` |
| property-pulse | instagram | 2 → **4** | 6 | `save_publish_cadence('4036a6b5-…','instagram',4,6,'s5-evidence-window')` |
| ndis-yarns | facebook | 2 → **4** | 10 | `save_publish_cadence('fb98a472-ae4d-432d-8738-2273231c1ef4','facebook',4,10,'s5-evidence-window')` |
| care-for-welfare | facebook + instagram | 2 → **3** | 10 | `save_publish_cadence('3eca32aa-e460-462f-a846-3f6ace6a3cae',<platform>,3,10,'s5-evidence-window')` |
| invegent | facebook + instagram | 2 → **3** | 10 | `save_publish_cadence('93494a09-cc89-41d1-b364-cb63983063a6',<platform>,3,10,'s5-evidence-window')` |

No change (rev-2): PP linkedin (clamp 2) · PP youtube (2, no governed cell) · NDIS instagram
(already 4) · NDIS linkedin (clamp 2; **queue raise 6→10 dropped** — 6 has served 2/day×7 fine) ·
NDIS youtube (already 4; publishes impossible anyway) · CFW/Invegent linkedin (clamp 2). The 4s/3s
give deferral headroom over the ≤2-slot/day demand without opening uncontrolled volume; LinkedIn's
design clamp (`>2` rejected, SQLSTATE 23514) is **deliberately preserved**. min_gap facts absorbed:
PP fb + NDIS fb run **360** (not 240) — slot spacing in §2a respects it; still no min_gap change.

### A3 — Layer A: UI schedule-cap overrides (advisory; prevents operator-facing UI blocks during the window)

`public.save_schedule_cap_override(client_id, platform, 4, 20)` — **rev-2: only for the cells A1
touches**: PP fb/ig/li and CFW + Invegent fb/ig/li (9 calls). **NDIS's four pre-existing override
rows (set 2026-07-27: fb/ig/yt 4/28, li 2/14) are NOT touched and NOT rolled back** — they predate
the window. Clean rollback for the 9 new rows: `(client_id, platform, NULL, NULL)` deletes the row →
tier default (2/day, 5/week). No audit table — baseline captured in the P1 snapshot doc.

### A4 — PP temporary format-mix overrides (the only per-format steering that exists)

INSERT into `c.client_format_mix_override` (currently **0 rows globally**; audit table
`c.client_format_mix_audit` exists) for property-pulse, window-scoped:

| Platform | override_share_pct |
|---|---|
| facebook | image_quote 45 · carousel 25 · animated_text_reveal 15 · text 15 |
| instagram | image_quote 45 · carousel 30 · animated_data 25 |
| linkedin | text 50 · image_quote 50 |

Rollback = delete the inserted rows (restores `t.platform_format_mix_default` behaviour). No RPC
found for this table → postgres channel, T3. Non-PP brands cannot be steered (hardcoded enrolment
gate) — recorded in §9 as a capability gap, **not** worked around by editing
`preferred_format_<platform>` on the credential-bearing profile table.

### A5 — deliberately NOT amended (the "do not simply remove every limit" list)

| Control | Current | Ruling |
|---|---|---|
| `min_gap_minutes` | 240 | **unchanged** — no RPC, no audit trail, credential-bearing table; schedule designed around it (≥4.5 h spacing) |
| LinkedIn max_per_day clamp | 2 | **unchanged** — design clamp preserved |
| Worker per-tick caps (image 3+2+2+2+3, video 4, ai 5, heygen 3/5, publishers 1–3) | — | **unchanged** — arithmetic headroom is ~10× the planned volume; raising them buys nothing and re-opens the April cost-incident failure mode |
| Retry ceilings (video 3, IG 5, YT 5) + `RENDER_ATTEMPT_CAP=5` | — | **unchanged** — they are the cost containment |
| Evergreen 30% ceiling + 30d cooldown | — | **unchanged** — repetition guard |
| Capability-exempt set (`{text}`) | — | **unchanged** — PK ruling: not expandable without a fresh policy gate |
| Layer-1 capability gate itself | — | **unchanged** — it is the arbiter that converts unsupported intents into recorded gap evidence |
| All §6 holds | — | **unchanged** |

### A6 — armed contingency (NOT applied at window start): dedup relaxation

If by end of Day 2 `pool_thin`/`bundle_diversity_insufficient` skips exceed ~40% of CFW/Invegent
slots, PK may elect: `UPDATE t.dedup_policy SET same_canonical_block_hours = 72 WHERE
policy_name='default' AND is_current=true;` (current 168; the seeded `lenient` profile value).
**Global — affects every brand**; restore to 168 at rollback. This is a `policy_decision`-class
choice and fires only through its own mini-gate mid-window. Default posture: leave 168 and accept
thin-pool skips as honest evidence.

---

## 4. Expected daily and weekly volumes

Steady-state baseline (2026-06-26 verified window): 121 slots / 121 drafts / ~106 publishes per
7 days, ~$0.48/day LLM.

| Brand | Slots/day (content) | Slots/wk | Expected drafts/wk | Expected renders/wk | Expected publishes/wk |
|---|---|---|---|---|---|
| property-pulse | 6 (+existing YT/stat) | 42+ | 36–42 | 40–55 (carousel multi-slide; video retries; atr/ad uncertain) | 32–40 (LI capped 14) |
| ndis-yarns | 6 (+existing YT skips) | 42 | 36–42 | 30–40 | 32–40 (LI capped 14) |
| care-for-welfare | 3 | 21 | 10–18 (**pool_thin expected**) | 10–18 | 10–18 |
| invegent | 3 | 21 | 10–18 (thin pool) | 10–18 | 10–18 |
| **Total** | **~18–19** | **~126–132** | **~92–120** | **~90–130** | **~84–116** |

Roughly **+5–25% slot volume** over baseline but redistributed: weekend coverage added, CFW/Invegent
moved from ~0.3–0.5/day to 3/day, PP format breadth widened. Draft/render capacity headroom at
current worker caps: image-worker alone can clear ~288 image_quote drafts/day (3 × 96 ticks) —
per-tick caps are not the constraint; **signal-pool supply and dedup are**, and their skips are
recorded evidence.

Cost projection: ~1.5–2× baseline LLM spend (≈ $1.00–1.50/day; window total ≈ $7–11) — inside the
$30/month Stop-1 line but material: **daily `m.ai_usage_log` cost check is a named window control**
(§8). Creatomate: plan tier/quota is **recorded nowhere in either repo** (named risk R1); daily
`credits_used` sum from `m.post_render_log` is a named window control.

---

## 5. Pipeline-capacity and governance risks

| # | Risk | Grounding | Mitigation in this plan |
|---|---|---|---|
| R1 | **Creatomate quota unknown; no 429 handling, no concurrency limiter, no credit budget anywhere in the codebase** | research-confirmed absence | modest volume (+≤25%); daily `credits_used` read; STOP condition on render-failure spike |
| R2 | **April 2026 cost-spike precedent** (~$107 in 4 days, 80× expected; retry loop) | `docs/incidents/2026-04-19-cost-spike.md` | retry ceilings untouched; per-tick caps untouched; daily cost check; window abort path |
| R3 | **`task_500c9698`** — image_quote poll has no client filter, no ORDER BY, `limit(3)`: cross-client starvation is volume-triggered | `docs/00_sync_state.md:55` | per-brand slot-time staggering (15-min offsets); daily per-brand render-completion check; STOP if one brand starves |
| R4 | **`max_per_day` counts the UTC day** (boundary = 10:00 Sydney) while slots are Sydney-local | publisher EF + lock RPC | headroom (cap 4 vs demand 2) absorbs boundary bunching |
| R5 | **`destination_id` throttle fragility** — NULL/mismatch makes max_per_day silently no-op (historic 18/day vs cap 2) | `ig-reenable-throttled-drain-v1.md` | pre-check P7; daily publish-count vs cap reconciliation |
| R6 | **Schedule-edit trigger deletes unfilled future slots** and re-materialises | cc-stage-05 | single pre-window apply batch; no mid-window schedule edits |
| R7 | **`save_publish_schedule` semantics unverified** (no repo migration) | research | pre-check P3 (read `pg_get_functiondef` live); fallback governed INSERT |
| R8 | **PP headline-overprint defect class** (D5 open; 41% measured historically; PK-declared BLOCKER) may reproduce at volume | `pp-tmr-definition-of-done-v1.md` | overprint occurrences during the window are recorded evidence for D5; daily visual spot-check of PP publishes; STOP on recurrence spike |
| R9 | **video_short_stat 62.5% PP timeout rate** burns credits ~1.6× per success | graduation contract §2.4 | natural weekly slot only (no added video volume) |
| R10 | **NDIS platforms only just released** (FB 07-29 → YT 07-30) — window doubles NDIS volume immediately after containment | S9 result docs | NDIS caps raised only to 4 (FB) / unchanged (IG 4, LI 2); daily NDIS publish review |
| R11 | **Rollback read-path**: `c.publish_cadence_change_log` is grant-less (RLS FORCE, revoked from service_role) | PB1 migration | P1 snapshot is the primary restoration source; postgres channel named for the audit read |
| R12 | **Advisor format override** may erode intended format coverage | materialiser/advisor research | divergence recorded per draft; mid-window review Day 2; accepted as evidence, not fought |
| R13 | **Brand-kit tensions** (CFW colours, Invegent logo) could fail governed renders at volume | census vs promotions conflict | pre-check P6; failures route to Asset Gap / brand-kit lanes, recorded |
| R14 | **`service_role` reportedly lacks UPDATE on `c.client_publish_profile`** (worker pause writes "silently no-op in prod") | `docs/00_sync_state.md:324` | all profile-table amendments routed via the named RPCs or postgres channel; P2 verifies |

Governance risks: every amendment is production posture (T3); two amendments (A1 fallback, A4) have
no RPC/audit → manual before/after capture is mandatory; the window has **no automatic expiry
mechanism** — the §7 dated rollback plus a scheduled reminder is the only close (named explicitly so
it cannot be silently forgotten).

---

## 6. Holds and pauses that MUST remain (none are modified by this plan)

1. **NDIS sensitive-imagery phases:** Phase 2 CLOSED · Phase 3 HELD + purpose-bound · §D cultural
   HARD-BLOCKED · "an unfilled specialist role is NEVER permission to proceed." No imagery sourcing
   of any kind is part of this window.
2. **Purpose-binding:** participant/cultural imagery never auto-enters the reusable pool.
3. **Fenced-first defaults + never-waived per-apply guards** (byte-verify · public-URL sha256 ·
   in-txn pool-neutrality · branch-warden). All currently-fenced assets (9 NDIS photos, 3 shared
   backgrounds, CFW 16 + Invegent 17 logo variants, 8 of 9 music tracks) **stay fenced**.
4. **PK deploy/merge/migrate hard stop; T3 "nothing waived."** This window deploys nothing.
5. **YouTube fail-closed rules:** `pause_profile_missing` = deny; CFW/Invegent YT absence is
   respected, not worked around; "YouTube is not publishing-operational" stays true all week.
6. **`task_05bf8b3d` release gate:** announcement_card stays OUT of unattended selection — the
   selector-ranking packet stays unapplied (and the selector↔Asset-Gap decoupling ruling stands).
7. **cc-0046 dashboard role enforcement stays OFF** (separate T3 activation package + fresh
   privileged-sink census required).
8. **Music governance:** `VIDEO_WORKER_MUSIC_ENABLED` stays off; Drifting Piano remains the only
   Content-ID-cleared track; the aural approval gate for the other 8 is untouched.
9. **Kill switches stay closed:** `OBS_OBSERVER_ENABLED` off · `SUBSCRIPTION_GMAIL_INGEST_ENABLED`
   off · `ice_readonly NOLOGIN` remains the R0 kill switch.
10. **Standing don't-redeploy three** (`heygen-avatar-creator`, `heygen-avatar-poller`,
    `draft-notifier`) + service-role key-rotation ordering constraint.
11. **TPR-1 + Addendum:** no template repoint occurs in this window (three-surface parity rule not
    triggered).
12. **Asset Gap invariants:** `asset_gap` fires only from `asset_shortage`; paused platform outranks
    every capability branch; only `(static_background, absent, conclusive)` is auto-sourceable.
13. **Capability-exempt set stays `{text}`**; the Layer-1 gate itself is untouched.
14. **CFW website channel**: outside the 4-platform set and outside this window — untouched.

Explicitly surfaced (per the brief's "controlled replacement" clause): **no held item above is
proposed for replacement in this plan.** If PK wants any hold lifted for the window, that is a
separate gate with its own packet.

---

## 7. Rollback: exact date and restoration values

**Rollback date: Monday 2026-08-10, 09:00 Australia/Sydney** (or immediately on any tripped STOP —
a tripped STOP voids the remainder of the window per Convention 2).

| Amendment | Restoration action | Restoration value |
|---|---|---|
| A1 schedule rows | `save_publish_schedule` per touched cell (PP fb/ig/li · CFW fb/ig/li · Invegent fb/ig/li), resubmitting the P1 dump rows verbatim (replace-all restores exactly); NDIS untouched | P1 dump `docs/briefs/data/s5-p1-client-publish-schedule-dump-2026-07-31.json`, sha256 `7b8fecd83ef51c7a5aeaec080d9372f6e4488497693ae963b17f1ab954c5b07a` |
| A2 max_per_day (5 calls) | `save_publish_cadence` back to P1 values | PP fb (2,20) · PP ig (2,6) · NDIS fb (2,10) · CFW fb/ig (2,10) · Invegent fb/ig (2,10) — live-verified 2026-07-31 |
| A3 UI cap overrides (9 new rows) | `save_schedule_cap_override(client, platform, NULL, NULL)` per new row; **NDIS's 4 pre-existing rows left untouched** | new rows deleted → tier default (2/day, 5/week); NDIS rows remain fb/ig/yt 4/28 · li 2/14 |
| A4 PP mix overrides | DELETE the inserted `c.client_format_mix_override` rows | table back to 0 rows (global state pre-window) |
| A6 dedup (only if elected) | `UPDATE t.dedup_policy SET same_canonical_block_hours=168 WHERE policy_name='default' AND is_current=true` | 168 |
| (nothing else changed) | — | — |

Restoration verification (same session as rollback): re-run the P1 snapshot reads
(`get_publishing_plan_pyramid` per client · `get_publish_cadence` · `get_schedule_caps` ·
`c.client_publish_schedule` rows · `t.dedup_policy`) and diff against P1 — must be identical.
Because there is no automatic expiry primitive, the apply session must also set a **2026-08-10
rollback reminder** (routine/calendar — PK's choice of mechanism) as part of the sequence.
Mid-window slots already consumed are not "rolled back" — they are the evidence; rollback restores
**configuration**, never rewrites history.

## 8. PK apply gate (hard stop — nothing in this document is authorised yet)

**Gate 1 (this document):** PK reviews and accepts/amends the plan. Tier T3 · PRODUCT_PROOF.

**Freeze:** on acceptance, pin this file with `node .claude/helpers/hash-checkpoint.mjs` and record
the hash. (Optional, zero-authority: a shadow `apply-harness-auditor` pass over the apply packet.)

**External review:** `ask_chatgpt_review` on the frozen packet; `reviewed_input_hash` recorded;
any non-clean verdict routes by triage class per the orchestration contract. A review is valid only
for the frozen hash — any edit re-runs it.

**Rev-2 status of the pre-apply checks:** P1–P8 were run read-only on 2026-07-31 and are recorded in
`docs/briefs/s5-evidence-window-p1-snapshot-v1.md`. P2/P3/P4/P6/P7 are **resolved** (P3: replace-all;
P4: dow 0..6, 0=Sunday; P6: brand kits complete). P5 reclassified the matrix (§2a). At apply time,
re-run only the volatile subset — the P1 value snapshot (STOP on drift from the recorded baseline),
P8 (incl. **PP facebook `paused_until` must be NULL** — its 2026-08-01 pause must have expired), and
the 🔴 **announcement_card / `task_05bf8b3d` PK ruling** (snapshot doc, final section) which **must
be decided before the window opens**. The original check list is retained below for the apply
session's use:
- **P1 snapshot (rollback baseline):** `get_publishing_plan_pyramid()` × 4 clients ·
  `get_publish_cadence()` × 4 · `get_schedule_caps()` × 4 · full `c.client_publish_schedule` dump ·
  `c.client_format_mix_override` (expect 0 rows) · `t.dedup_policy` current row · `cron.job`
  (jobid, schedule, active, md5(command)). Pin the snapshot artefact hash.
- **P2:** confirm the RPC channels work as documented (`save_publish_cadence`,
  `save_schedule_cap_override` exist with the researched signatures/bounds).
- **P3:** `pg_get_functiondef('public.save_publish_schedule')` — resolve upsert-vs-replace before
  any A1 call; else use the governed INSERT fallback.
- **P4:** resolve the `day_of_week` convention (0..6 vs ISO 1..7) from the live table + one existing
  row; a wrong-convention row silently never materialises.
- **P5:** `classify_format_capability` live for every §2 "candidate/legacy-uncertain" cell (PP
  carousel FB/IG, atr, ad; NDIS text FB) — reclassify the matrix where it disagrees; non-ready cells
  become expected-skip rows, and that expectation is recorded before the window.
- **P6:** brand-kit reality for CFW + Invegent (`c.client_brand_profile.brand_logo_url`, brand
  colours, `client_format_config`) — resolves the census-vs-promotion tension before volume.
- **P7:** `destination_id` non-NULL on all 14 active profiles (R5).
- **P8:** confirm all four NDIS `paused_until` NULL, `publish_enabled=true` on all 14 cells, and IG
  cron 53 + publisher crons active.

**Apply (PK-run or Convention-2 sequence with these non-removable STOPs):** hash mismatch ·
unexpected origin movement · non-clean review · any P1–P8 failure · applied state ≠ declared A1–A4
values on readback · unexpected rows in the change set · invalidated rollback (P1 snapshot
unreadable). Order: P1 snapshot → A2 → A3 → A4 → A1 (single batch) → readback diff → confirm nightly
materialise output for 08-03 → arm the 08-10 rollback reminder.

**Daily window controls (read-only):** `ice_ro.slot_status` / `render_status` / `publish_status` /
`pipeline_health` / `cron_health` · `m.ai_usage_log` daily cost · `credits_used` daily sum ·
publish-count vs cap reconciliation (R5) · PP visual spot-check (R8). **Window STOPs (abort +
rollback early):** LLM spend > $5/day · render failure rate > 50% on any governed format · any
publish exceeding its cap (R5 trip) · any hold in §6 found disturbed.

**Close-out:** result doc in `docs/briefs/results/` (house template) with the full
selected/rendered/published/degraded/failed/blocked record per cell, the §9 gap list reconciled, the
graduation-ladder deltas per template×client, and a register POINTER entry (Convention 1). Rollback
per §7, then restoration diff attached to the result doc.

---

## 9. Capability-gap list (feeds Dashboard + Asset Gap lanes)

| # | Gap | Class | Routed lane |
|---|---|---|---|
| G1 | YouTube: zero governed operational cells fleet-wide (NDIS by-design block; PP format unmapped; CFW/Invegent no profile) | platform capability | creatomate_global (format) + publisher_onboarding (CFW/Inv) |
| G2 | Format steering impossible for non-PP brands (`format_mix_enrolled` hardcoded) — caps evidence breadth at 1–2 formats for 3 of 4 brands | pipeline capability | orchestrator backlog (mix-enrolment generalisation, own gate) |
| G3 | Carousel: TMR family unwired (body/closing structurally blocked); NDIS `no_selectable_template` on all 3 platforms | template | creatomate_global |
| G4 | video_short_stat: NDIS zero own evidence (non-transferability); PP timeout class 62.5%; platform-reachability inconsistency (`platform_support.facebook=false` vs `ready`) | template/pipeline | creatomate_global + classifier-coverage carry |
| G5 | video_short_avatar: CFW+Invegent 0 avatars; heygen landscape-only blocks YT Shorts (`F-HEYGEN-WORKER-LANDSCAPE-DIMENSION`, P3) | asset + pipeline | avatar governance (AGP) — activation plan currently SUPERSEDED |
| G6 | animated_text_reveal / animated_data: zero production proof, no per-brand readiness assessment anywhere | format proof | this window supplies the first datapoints (PP) |
| G7 | PP LinkedIn `text` (69/90d) + PP YouTube `video_short_kinetic` (28/90d) run/ran ungoverned with no selectable template | template | creatomate_global (named pre-existing risk) |
| G8 | PP `youtube_thumbnail` background `asset_shortage` — the one live P0 Asset Gap item | asset | **Asset Gap lane** (Path B data-only close) |
| G9 | CFW brand kit: no colours, no format config, logo fenced-unpromoted; Invegent: logo NULL + colours missing, 17 variants fenced | asset/config | Asset Gap / brand-kit promotion gates (per-asset PK) |
| G10 | `text` unreachable on instagram (`platform_support=false`) and youtube (null) | format taxonomy | policy decision (registry change gate) |
| G11 | `story` format: template exists (row 8), no engine format key | format taxonomy | creatomate_global backlog |
| G12 | No cost caps / Creatomate quota tracking / 429 handling implemented (design doc exists, unbuilt) | pipeline safety | cost-guardrails build lane (own gate) |
| G13 | `task_500c9698` (poll race) + `task_05bf8b3d` (publish audit-row loss) — both volume-sensitive open defects | defect | existing task register |
| G14 | No expiring-cap / evidence-window primitive exists (this window is hand-composed) | governance tooling | candidate future helper (post-window review) |

Every "blocked" cell in §2 maps to one of G1–G11; none was silently substituted.

---

*Prepared 2026-07-31 (Sydney) on branch `claude/s5-cross-brand-evidence-schedule-x7rbn8`. Sources:
CE+dashboard repos at HEAD `9112972`; register v6.87; the S9 release result docs; the Creatomate
graduation contract + template matrix; the PB1/PA1 cap migrations; the S9 Layer-1 gate migration;
the cost-incident and cap-window records. All live-state claims carry the §8 verify-or-abort
pre-checks.*
