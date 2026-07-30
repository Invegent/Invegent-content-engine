CLAIMED v6.79 · broll-rotation-governance-v1-monitoring-baseline · C:/Users/parve/Invegent-content-engine · docs-only register lane (T1) · 2026-07-30T00:00:08Z (claimed v6.78, renumbered to v6.79 — a concurrent lane landed v6.78 "Client Production Readiness Queue v1" first; earlier timestamp keeps the number)

# B-roll Rotation Governance v1 — Monitoring Baseline + Armed Condition Check (v1)

**Lane class:** SAFETY_GATE (observation only) · **Tier:** T1 (read-only DB reads + docs/routine write)
**Date:** 2026-07-30 Sydney · **Register cut:** v6.79
**Predecessor:** `docs/briefs/results/broll-rotation-governance-v1-result.md` (v6.76 — the apply itself)

---

## 1. Why this record exists

PK asked for the **first natural production sample** of `resolve_slot_assets` v1.5 (Rotation
Governance v1) — twelve evidence fields across real B-roll renders, with named alert conditions.

**The sample does not exist and could not exist.** This document records the baseline as measured,
so the eventual first render is compared against a written starting state rather than a
reconstructed memory, and arms a daily check that waits for it silently.

Boundaries honoured — **no** resolver change, **no** asset sourcing, **no** promotion or retirement,
**no** persisted-selection build, **no** geography-vocabulary migration. Every DB touch was a read.

---

## 2. Baseline — the eight recorded facts

| # | Fact | Value / evidence |
|---|---|---|
| 1 | **v1.5 apply timestamp** | **`2026-07-29 22:50:34Z`** — ledger `20260729225034_resolve_slot_assets_v1_5_rotation_governance`; the `c.client_format_copy_geography` declaration row carries the same `declared_at` |
| 2 | **Natural B-roll renders since apply** | **ZERO.** `ice_ro.render_status`: no `video_short_stat` row of any status after the apply. First check ran at `2026-07-29 23:47Z` — **57 minutes** elapsed |
| 3 | **Declared vs resolver-reachable pool** | **6 declared == 6 reachable.** 6 governed `broll_*` rows on `c.client_brand_asset` (active + approved + production_use_allowed); all six selected at least once across a 40-seed read-only probe. 7th row `broll_pp_perth_skyline` correctly rejected `inactive` (fenced intake candidate, 1920×1080) |
| 4 | **Synthetic health probe** | **PASSED.** `pool_eligible:6` · `pool_after_geo:6` · `pool_after_recent:6` · `recent_use_level:excluded_2` · `copy_geo:au`, `copy_geo_declared:true` · `geo_compat: asset_narrower_than_copy` / generic · `fallback_reason: null` · zero shortage, zero geo conflict. Live bodies byte-identical to the pinned artifact (`resolve_slot_assets` 27007/md5 `6748a194…`, `geo_relation` 1318/md5 `0701c444…`), ACL still `postgres \| service_role`. `video-worker` not redeployed since the apply ⇒ output parity untouched |
| 5 | **Alert conditions** | **NONE EVALUABLE from production renders** — and none tripped by the probe. The twelve evidence fields are unrecordable until a natural render exists. Probe results are explicitly *not* the sample |
| 6 | **First natural render starts with NO effective B-roll-history exclusion** | Measured: `recent_use_excluded = ["bg_pp_family_backyard_summer", "bg_pp_contract_signing_closeup"]` ⇒ `pool_after_recent_use = 6`. The window holds two **static image** keys because the last two real renders on this format used the static template. Correct behaviour, not a defect. Exclusion becomes load-bearing from the **second** natural render onward, once a real `broll_*` key enters the window |
| 7 | **Three pre-existing scheduled drafts remain static-background** | PP `video_short_stat` slots **2026-07-30**, **08-06**, **08-13** are all `filled`, by drafts rendered 2026-07-26/27 on template `video_stat_reveal_9x16_v2` (`a3d8472d`) with `bg_pp_*` **image** backgrounds. Those three will publish as static-background videos. Zero unfilled `video_short_stat` slots exist; the materialised horizon ends 08-13 ⇒ the first governed B-roll render needs a **new** slot beyond that date |
| 8 | **The 13 August failed draft is routed separately** | Slot `c1f38536` ← draft `452f58b9`, whose render **permanently failed** 2026-07-27 after 10 attempts (5 `timeout` / 5 `failed`). Pre-apply, pre-parity, unrelated to v1.5 — a silent no-video slot. **Not this lane's item; not folded into the rotation evidence** |

### Supporting fact (why parity has not shown up in production)

Every non-smoke `video_short_stat` render in the log predates **B-roll Parity Activation (v6.54,
2026-07-29)**. The only renders that have ever selected a governed B-roll clip are **two SMOKE
renders** (`client_id NULL`, 2026-07-29 08:59Z, resolver v1.4, winner `AU_generic_national_Suburb_9:16_V1`
/ `dd5fd75e`). Smoke renders are excluded from rotation history **by resolver design** — they can
never constitute the sample, and equally can never pollute it.

Sibling formats are not a second source: `video_short_stat_voice` / `video_short_kinetic` /
`video_short_kinetic_voice` render with no `tmr` block and no governed background at all. The
governed B-roll surface is `video_short_stat` only.

---

## 3. Armed condition check

`.claude/routines/broll-rotation-monitor.ps1`, registered as Windows Scheduled Task
**"ICE B-roll Rotation Monitor"** — daily 08:15 local, `StartWhenAvailable`, 10-minute limit.

**Match condition:** Property Pulse (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`) ·
`ice_format_key='video_short_stat'` · `client_id IS NOT NULL` (excludes smoke) ·
`created_at > 2026-07-29 22:50:34Z` · selected Background `asset_key` beginning `broll_`.

**Behaviour:**

- **No match → silent.** One append-only heartbeat line in
  `docs/runtime/monitoring/broll-rotation-monitor.log`. No notification, no lane reopen.
- **First match →** writes `docs/runtime/monitoring/broll-rotation-FIRST-MATCH.md` with the matching
  rows and the reopen checklist, then **disarms itself** (re-arming is a deliberate human act — the
  trigger file is never silently overwritten).
- **Read error →** logs loudly, returns **no verdict**, and stays armed. It never fabricates a result
  and never reopens the lane on an error.

### ⚠ Named limitation — the `broll_` predicate is checked at reopen, not in the cron

The routine reads the allowlisted read-only path (`scripts/db-read.py`), which is confined by
schema-USAGE to the 10 `ice_ro` views. **No view exposes `m.post_render_log.render_spec`**, so the
background `asset_key` is unreachable from the routine. Closing that gap means adding a secret-free
`ice_ro` view under its own T2/T3 gate — deliberately **not** done as a side effect of arming a
monitor (CLAUDE.md: coverage gap → new view under the normal gate, never a widened allowance).

Consequence, stated rather than hidden: the routine fires on the first **non-smoke PP
`video_short_stat` render after the apply**, and the reopened session confirms the `broll_` prefix.
A render that turns out to carry a static `bg_pp_*` background **is not a false alarm to discard** —
it is itself the material finding (parity not reaching production). The reopened session records it
and re-arms.

---

## 4. Stop condition

**Met.** Baseline recorded, monitor armed and test-run clean (`no matching render — silent, still
armed`). The lane is blocked on production demand, not on the resolver. Neither completion branch
was taken: **monitored steady state is NOT declared** (no natural sample), and **no remediation lane
is opened** (no evidence of a defect in v1.5).

Next action is the monitor's, not a human's.
