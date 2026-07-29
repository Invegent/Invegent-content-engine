CLAIMED · broll-promotion-batch1 · main-checkout `C:\Users\parve\Invegent-content-engine` · applied · 2026-07-29

# Result — Governed B-roll: PK Visual Verdict + Promotion Batch 1 · ✅ APPLIED

**Date:** 2026-07-29 Sydney · **Lane:** PRODUCT_PROOF · **Tier: T3**
**PK visual verdict:** *"Promote the top three"* (2026-07-29), following delivery of the contact-sheet
review bundle at v6.63.
**Artifacts:** `docs/briefs/artifacts/broll-promotion-batch1-forward.sql` (`19f48b62…`) · `…-rollback.sql` (`875433239…`)

> **The eligible B-roll pool went 1 → 4 — the ratified rotation-readiness floor is MET.**
> Rotation proven uniform on live production state: **10 / 10 / 10 / 10** across 40 seeds.
> Every PP governed video no longer renders the identical clip.

---

## 1. What was applied

Three fenced batch-1 rows promoted to eligible (`is_active=true`, `approved=true`,
`production_use_allowed=true`, `approval_status='governed'`, `approved_by='PK'`, `approved_at`,
`promotion_lane`):

| rank | asset_id | asset_key | geo_scope | duration |
|---|---|---|---|---|
| 1 | `f84ac010` | `broll_pp_au_wa_perth_coastal` | `au_wa_perth` | 19.7s |
| 2 | `aa55659e` | `broll_pp_generic_apartment_abstract` | `generic` | 25.0s |
| 3 | `4653144c` | `broll_pp_au_nsw_suburb_waterway` | `au_nsw_sydney_metro` | 51.0s |

**Rank 4 (`9cf9d01a` `broll_pp_au_nsw_suburb_skyline`) deliberately NOT promoted** — closest in look to
the incumbent (both Hurstville). Guard G4 asserted it stayed fenced. The older `42211c0f`
`broll_pp_perth_skyline` also remains fenced (unrecognised `sfto`, untouched by this lane).

No DDL · no GRANT · no template, resolver, worker, or parity-overlay change · no deploy.

## 2. Guard outcomes — all eight passed

| Guard | Check | Result |
|---|---|---|
| G0 | atomicity armed pre-write, re-asserted | ✅ |
| G1 | identity pin — pre-image digest `2cae61b9…` | ✅ |
| G2 | live baseline pool == 1 | ✅ |
| G3 | exactly 3 promoted, CAS-pinned to the fenced state | ✅ |
| G4 | **rank-4 skyline stays fenced** | ✅ |
| G5 | incumbent clip undisturbed and still eligible | ✅ |
| G6 | **pool EXACTLY 4** (not 3, not 5) | ✅ |
| G7 | template winner unchanged at production signature | ✅ |
| G8 | **rotation proof — all 4 clips reachable across 24 seeds** | ✅ |

Applied as ONE `execute_sql` call so `BEGIN`/`DO`/`COMMIT` composed.

## 3. Post-apply verification (live production state)

**Eligible pool = 4.** All four `approval_status='governed'`, `approved_by='PK'`:
`broll_pp_au_suburb_aerial` (incumbent) · `broll_pp_au_wa_perth_coastal` ·
`broll_pp_generic_apartment_abstract` · `broll_pp_au_nsw_suburb_waterway`.
Still fenced: `broll_pp_au_nsw_suburb_skyline`, `broll_pp_perth_skyline`.

### Rotation proof — 40 live seeds

| clip | hits |
|---|---|
| `broll_pp_generic_apartment_abstract` | 10 |
| `broll_pp_au_wa_perth_coastal` | 10 |
| `broll_pp_au_suburb_aerial` | 10 |
| `broll_pp_au_nsw_suburb_waterway` | 10 |

**Perfectly uniform — 25% each, zero unreachable clips.** The pool now delivers three genuinely
distinct looks (WA coastal · architectural abstract · Sydney waterway) plus the incumbent, rather than
one clip repeated on every render.

## 4. TPR-1 assessment — non-trigger (stated, not assumed)

This is **not** a template repoint. The governed output spec (1080×1920 / 12s) is owned by the template
and its render-time parity overlay, **neither of which was touched**; only which background asset the
resolver may select changed. TPR-1 / Addendum v1 therefore does not trigger.

All three promoted clips are natively **1080×1920** with durations 19.7s / 25.0s / 51.0s — each
comfortably exceeding the 12s composition length, so none renders short against it.

## 5. Rollback

**Proven BEFORE apply:** forward + rollback executed live in an aborted transaction — 3 promoted, pool
1→4, then 3 re-fenced, pool 4→1, restore **digest-exact** to `2cae61b90c9844d03396428459199b12`.

`broll-promotion-batch1-rollback.sql` re-fences the 3 rows (identity-pinned to the promoted state,
asserting rowcount==3, digest-exact restore, pool back to 1, incumbent undisturbed). **Storage objects
are deliberately untouched**, so the clips stay uploaded and fenced and could be re-promoted without
re-uploading.

## 6. Chain

| Check | Verdict |
|---|---|
| Dry run (aborted txn) | pool 1→4, rank-4 fenced, winner unchanged, 4/4 reachable (7/7/5/5 over 24 seeds) |
| Rollback proven before apply | **digest-exact**, pool 4→1, zero production effect |
| External review | **`agree`** · medium · high · **`pushback_points: []`** · `unverified_claims: []` · no escalation — `review_id ed4ccd65-8121-4d4e-aaf7-e3cb91f41a64`, pinned `19f48b62…` / `875433239…` |
| Guards executable, not prose | verified — eight `RAISE EXCEPTION` |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution (CCF-02 R1)** — session instructed not to spawn subagents; equivalent read-only checks run inline |
| **PK visual verdict + Gate 2** | ✅ **GRANTED** — *"Promote the top three"* |
| Apply | ✅ **committed, all eight guards passed** |
| Post-apply verification | ✅ pool=4, rotation 10/10/10/10 on live state |

## 7. Known caveat (disclosed, unchanged)

**The resolver still has no recent-use avoidance.** It is `STABLE` and reads no render history, so
selection is memoryless sampling with replacement. At a pool of 4 the expected **consecutive-repeat
rate is ≈25%** — a given render can repeat its predecessor. Growing the pool reduces but cannot
eliminate this; only a history-aware selector would, and that remains explicitly out of scope
(a reviewed resolver change).

The uniform 10/10/10/10 distribution is about *reachability and balance*, not about consecutive repeats.

## 8. Non-claims

- ❌ Not claimed: repeats are eliminated. They are not (§7).
- ~~Not claimed: a render has been produced through the new pool.~~ **SUPERSEDED — see §10: two live
  renders were produced through the new pool at PK's request, both succeeded.**
- ❌ Not claimed: `label_constraint` / geo labels are enforced. **No renderer reads them** (carry C1) —
  documentation only.
- ❌ Not claimed: the target of 6 is met. The floor of **4** is met; target 6 remains open, with
  `31639439` (held, quality-eligible) and `broll_pp_au_nsw_suburb_skyline` (fenced) as batch-2 stock.

## 10. ADDENDUM — live render proof through the new pool (PK request, same day)

Two `governed_video_stat_smoke` renders were run against **live production code** (video-worker
**v3.15.0**), which uses the *same spine path as production* (`select_template` at `p_platform=null`
→ `buildGovernedVideoStatPlan`). The smoke is render-only: `postDraftId=null`, `clientId=null`,
writes to `post-videos/_smoke/`, **reads no draft and publishes nothing**.

| seed | background clip selected | status | render ms | output_spec | source | music |
|---|---|---|---|---|---|---|
| `rotation-proof-b` | **`broll_pp_au_wa_perth_coastal`** (newly promoted) | `succeeded` | 38 184 | 1080×1920 / 12s | `render_time_parity_overlay` | ✓ |
| `rotation-proof-d` | **`broll_pp_au_nsw_suburb_waterway`** (newly promoted) | `succeeded` | 29 794 | 1080×1920 / 12s | `render_time_parity_overlay` | ✓ |

**Two different newly-promoted clips rendered end-to-end** — rotation is proven in real renders, not
just in resolver calls. **Measured from the produced file** (not provider-reported): `1080×1920`,
**12.0s**, h264, audio present ⇒ the governed output contract holds with the new pool, and the
render-time parity overlay still delivers it (TPR-1 contract intact under rotation).

Visual check of the surviving render: governed Property Pulse logo, all four text slots bound, Sydney
waterway aerial background — matching the reviewed clip.

**Harness limitation found:** the smoke writes to a **fixed** storage path
(`_smoke/governed_video_stat_v1.mp4`), so the second render **overwrote** the first. Only the last
render's bytes survive at that URL; per-render evidence lives in `m.post_render_log`. A seed-scoped
smoke path would let multiple rotation renders be compared side by side — recorded, not fixed here.

**⚠ NEW PRODUCT RISK SURFACED BY ROTATION — geo/copy mismatch.** The pool now spans Perth coastal, two
Sydney clips and a generic abstract. **Any geo-specific stat copy can now land on a mismatched
background** — the smoke's own built-in sample copy is literally *"Perth median house price"*, which
under rotation can render over a Sydney aerial. This was impossible while the pool held one clip.
Every row carries a `label_constraint` documenting the rule, but **no renderer reads it** (standing
carry C1) — it is documentation, not a control. **Neutral national copy was deliberately used for this
proof** to avoid baking a mismatch into the evidence. Two closure options, neither taken here: keep
governed video copy geo-neutral by policy, or make the resolver geo-aware (a reviewed resolver change).

## 11. ADDENDUM — Promotion Batch 2 (partial) · pool 4 → 5 · target 6 NOT reached

**PK instruction:** *"Promote the remaining two to hit target 6."* **Only ONE of the two was
promotable. Executed the half that qualifies; the second is blocked on two independent grounds.**

### 11.1 Promoted (pool 4 → 5)

`9cf9d01a` **`broll_pp_au_nsw_suburb_skyline`** (`au_nsw_sydney_metro`, 1080×1920, 62.7s,
`sfto='needs_scrim'`) → `governed` / `approved_by=PK`. Guards: G0 atomicity · G1 baseline pool==4 ·
G2 exactly 1 promoted (CAS-pinned) · G3 pool==5 · **G4 declared == resolver-reachable** ·
G5 the 16:9 Perth clip stays fenced · G6 winner unchanged. Rollback proven digest-exact beforehand.

**Live verification:** pool **5**, all native 1080×1920, all `needs_scrim`, distribution over 50 seeds
**11 / 11 / 10 / 10 / 8** — all five reachable.

### 11.2 ⛔ `42211c0f` `broll_pp_perth_skyline` NOT promoted — two independent blockers

**Blocker 1 — it would create a FALSE 6.** Measured in an aborted transaction, promoting both:

| measure | value |
|---|---|
| flag-based pool count (`is_active` + `approved`) | **6** |
| **resolver-reachable distinct clips** | **5** |
| rejection | `broll_pp_perth_skyline => text_safety_unknown` |

Its `safe_for_text_overlay='needs_gradient_scrim'` is **not in the resolver's accepted vocabulary**
(`'true'` / `'needs_scrim'` only), so the resolver fails it closed. The pool would *report* 6 while
production could only ever reach 5 — precisely the declared-vs-actual failure mode this arc exists to
eliminate. **A new guard (G4) was added to this lane asserting declared == resolver-reachable**, so a
future promotion cannot reintroduce this silently.

**Blocker 2 — it is 16:9 LANDSCAPE, and editing `sfto` would NOT fix it.** The row is
**1920×1080** (`aspect_ratio: 16:9`, `render_crop: "cover-crop to 9:16"`). Cropping to 9:16 retains a
608×1080 region — **~32% of frame** — and requires a **≈1.78× upscale** to reach 1080×1920. Every one
of the five pooled clips is **native 1080×1920 with zero upscale**. Promoting it would inject a
visibly soft, heavily-cropped background whose degradation is invisible in the pool count.

It fails the same acceptance bar applied to every batch-1 candidate (§ intake brief: "must crop safely
to 1080×1920", no upscale). **Correcting `sfto` alone would clear Blocker 1 and leave Blocker 2
untouched** — producing a genuine 6 made of five sharp clips and one soft one.

### 11.3 Target 6 — the clean route (NOT taken; PK decision)

`31639439` (Macourt Media, mid-rise urban centre) is **already downloaded, reviewed clean this session
and machine-PASS at native 1080×1920 / 51.6s** — but it is **NOT in the database**; it exists only as a
local harvest artifact. Reaching a genuine 6 with it requires a **fenced intake** (upload +
guarded insert, the v6.63 pattern) followed by a promotion — not a fence-flip.

**Options for PK:** (a) accept the honest **5**; (b) intake + promote `31639439` → genuine **6**;
(c) re-source a portrait Perth clip to replace `42211c0f`'s intent; (d) re-encode `42211c0f` to native
1080×1920 portrait and re-intake it as a new asset. **Editing `sfto` in place is not recommended** —
it fixes the symptom and ships the upscale.

## 12. ADDENDUM — Batch 3: intake + promote `31639439` · 🎯 **TARGET 6 REACHED**

**PK instruction:** *"Intake and promote 31639439 to hit 6."* Executed as **two guarded applies** —
a pool-neutral fenced intake (T2), then a promotion (T3) — not one combined write, so the
pool-neutrality property of intake stayed provable.

### 12.1 Geography corrected before insert

The clip's Pexels **query tag was `adelaide australia aerial`**, but its **source title is
`stunning-aerial-view-of-hurstville-at-sunset-31639439`** ⇒ it is **Hurstville, Sydney NSW**. Labelled
`geo_scope='au_nsw_sydney_metro'`, never generic and never Adelaide. **Fourth independent instance this
arc of a Pexels tag being wrong about geography.**

### 12.2 Intake (T2, pool-neutral)

`broll_pp_au_nsw_urban_centre` · native **1080×1920**, 51.6s, no audio, zero upscale · sha256
`acb408d2…` **re-verified** and **byte-verified** local == public URL · full Pexels provenance.
Collision checks all **CLEAN** (provider-ID, sha256, asset-key). Guards G0–G8; **G8 asserted pool
neutrality — pool held at 5 across the intake.** All fences closed on insert.

### 12.3 Promotion (T3) — pool 5 → 6

Guards: G0 atomicity · G1 intake row present · G2 baseline pool==5 · G3 exactly 1 promoted (CAS-pinned)
· G4 pool **exactly 6** · **G5 declared == resolver-reachable** (the guard added at v6.67) ·
G6 the 16:9 Perth clip stays fenced · **G7 every eligible clip is native 1080×1920** (new — blocks the
upscale-injection class directly) · G8 template winner unchanged.

### 12.4 Live verification — 90 seeds

| clip | geo_scope | dims | share |
|---|---|---|---|
| `broll_pp_generic_apartment_abstract` | `generic` | 1080×1920 | 20.0% |
| `broll_pp_au_wa_perth_coastal` | `au_wa_perth` | 1080×1920 | 18.9% |
| `broll_pp_au_nsw_urban_centre` | `au_nsw_sydney_metro` | 1080×1920 | 16.7% |
| `broll_pp_au_suburb_aerial` | `au_nsw` | 1080×1920 | 15.6% |
| `broll_pp_au_nsw_suburb_skyline` | `au_nsw_sydney_metro` | 1080×1920 | 14.4% |
| `broll_pp_au_nsw_suburb_waterway` | `au_nsw_sydney_metro` | 1080×1920 | 14.4% |

**Pool = 6, all `governed`, all native 1080×1920, all six resolver-reachable** (uniform expectation
16.7%). **The ratified target of 6 is MET** — floor 4 met at v6.64, target 6 met here.

### 12.5 ⚠ Geographic concentration — stated plainly

**Four of the six clips are Sydney/Hurstville** (`au_nsw_sydney_metro` ×3 + `au_nsw` ×1 — all from the
same suburb, three from the same creator). The pool is **6 distinct clips but only 3 distinct
localities**: Sydney ×4, Perth ×1, generic ×1.

Rotation is genuinely varied in *subject* (low-rise suburb aerial · waterway · CBD-skyline aerial ·
mid-rise urban centre · coastal · architectural abstract), but a viewer seeing several PP videos will
mostly see Hurstville. **Reaching the target did not fix the concentration** — a future batch should
deliberately target non-Sydney, non-aerial footage (Melbourne/Brisbane/regional, street-level).

Remaining fenced: `broll_pp_perth_skyline` (`42211c0f`) — still blocked as 16:9 requiring a ≈1.78×
upscale (§11.2); **G7 now blocks its promotion mechanically**, not just by review.

## 9. Stop condition

**Met.** Promotion applied, pool increase and rotation proven on live state, result recorded, committed,
pushed. Governed B-roll rotation is now live at the ratified floor.
