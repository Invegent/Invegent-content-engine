# cc-0073 — Gate-1 packet: shared-background scrim remediation

**Created:** 2026-07-24 Sydney
**Author:** chat (S5 — Asset-Gap Drain)
**Status:** Gate-1 packet — **authoring only, nothing applied**
**Parent:** `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` · `docs/briefs/cc-0073-decision-packs-a-b-c.md`
**Lane classification:** PRODUCT_PROOF · **Tier T3** (mutates live production rotation rendering)

**Mutations performed: NONE.** No promotion, assignment, policy row, ledger write, harvest, upload,
template change, deploy, commit, register version, or push. Classification frozen and re-verified
unchanged: 8 ledger rows, 4 open; three carousel rows `(assignment, unassigned)`; PP YouTube
`(platform_config, misconfigured)`.

## Scope fence — this apply does exactly one thing

**IN:** `UPDATE c.shared_creative_asset SET asset_meta = asset_meta || '{"scrim_opacity_override":"62"}'`
for **eight** rows. Nothing else.

**OUT, in the same apply, without exception:** no resolver/`select_template` code change · no
`c.client_asset_pool_policy` row · no promotion (`is_active` / `production_use_allowed` /
`approval_status` / `allowed_clients` untouched) · no sourcing · no template change · no client-asset
change · no ledger write.

---

## 1. Every affected asset

All **8** rows of `c.shared_creative_asset`. The population is uniform: every row has
`crop_proof='pass_1x1_scrim62'`, `safe_for_text_overlay='true'`, and **no**
`scrim_opacity_override` key today (`asset_meta ? 'scrim_opacity_override'` = false, all 8).

| # | id | asset_key | live? |
|---|---|---|---|
| S1 | `84a2751e-dc06-4f0f-874d-9869c190c309` | `Shared/Backgrounds/bg_shared_soft_blue_gradient.jpg` | fenced |
| S2 | `3719033b-725e-4023-9dd2-b779ec462579` | `Shared/Backgrounds/bg_shared_neutral_concrete_texture.jpg` | fenced |
| S3 | `c36bb74f-6f3b-4939-8bdc-c47fc2f39e82` | `Shared/Backgrounds/bg_shared_soft_grey_bokeh.jpg` | fenced |
| S4 | `4a4087e6-3fd6-4833-80a3-c76aba7ed822` | `Shared/Backgrounds/bg_shared_abstract_wall_sky.jpg` | fenced |
| S5 | `9c52865f-ab7b-4437-9d96-9c69668c2013` | `Shared/Backgrounds/bg_shared_contemporary_home.jpg` | fenced |
| S6 | `bd462204-cf43-4680-8aae-4083103593e1` | `Shared/Backgrounds/bg_shared_glass_office_tower.jpg` | fenced |
| S7 | `4042286e-0012-484e-a060-25d4159f9861` | `Shared/Backgrounds/bg_shared_landscaped_garden.jpg` | fenced |
| **S8** | `0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1` | `Shared/Backgrounds/bg_shared_datacentre_server.jpg` | **LIVE — Invegent, all 3 platforms** |

**Live blast radius is S8 only.** S1–S7 are fenced and render nowhere today; correcting them now
means the defect is fixed *before* promotion rather than shipped and repaired afterwards. Only
Invegent's live card changes appearance on this apply.

## 2–4. Recorded proof · actual production · proposed override

| # | Recorded proof opacity | Actual production opacity | Proposed `scrim_opacity_override` | Δ |
|---|---|---|---|---|
| S1–S7 | **62** (`pass_1x1_scrim62`) | **40** (`sfto='true'`) | **"62"** | +22 |
| S8 | **62** | **40** — shipping now, every Invegent card | **"62"** | +22 |

Production opacity is not asserted from documentation — it is the live function body.
`pg_get_functiondef(public.resolve_slot_assets)` read 2026-07-24:

```
c_scrim_opacity_needs_scrim CONSTANT numeric := 48;
c_scrim_opacity_text_safe   CONSTANT numeric := 40;
...
v_scrim_opacity := CASE WHEN v_pick->>'sfto' = 'needs_scrim' THEN 48 ELSE 40 END;
v_scrim_override_txt := v_pick->>'scrim_opacity_override';
IF v_scrim_override_txt ~ '^\s*[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)\s*$' THEN
  v_scrim_opacity := LEAST(GREATEST((v_scrim_override_txt)::numeric, 0), 100);
  v_bg_reasons := v_bg_reasons || 'scrim_override_applied';
```

All 8 carry `sfto='true'` ⇒ the 40 branch ⇒ **62 was never applied to any of them.**

## 5. Why 62 preserves the proof — the load-bearing argument

Not "62 looks safer". The claim is that **62 reconstructs the exact compositing operation the crop
proof performed**, and three independent sources agree on that density.

### 5a. What the proof actually did

`_harness/image_harvester_v0/cc0044_shared_bg_20260720/cropproof.py` — the authoritative text-safety
gate for these eight assets:

```python
SIZE = 1080
SCRIM_RGB = (0x0B, 0x12, 0x20)   # #0B1220
SCRIM_A   = 0.62
crop  = im.crop(centre_square).resize((1080,1080), LANCZOS)
scrim = Image.new("RGB",(1080,1080), SCRIM_RGB)
proof = Image.blend(crop, scrim, 0.62)      # uniform full-frame alpha composite
# then white headline + footer drawn over it
```

So `pass_1x1_scrim62` certifies: *centre 1:1 crop at 1080, uniform full-frame blend toward a dark
navy at α=0.62, white text legible.* Nothing else.

### 5b. What production does at `Scrim.opacity = 62`

Verified from the provider template source
(`_harness/cc0033_headline_calibration/generic_market_insight_card_1x1_v1_provider_template_source.json`):

```json
{ "name":"Scrim", "type":"shape", "x":"0%","y":"0%","x_anchor":"0%","y_anchor":"0%",
  "width":"100%","height":"100%", "fill_color":"#080C1E", "opacity":"60%" }
{ "name":"Background", "type":"image", "x":"0%","y":"0%","x_anchor":"0%","y_anchor":"0%" }
{ "name":"Headline", "type":"text", "x":"7%","y":"26%","width":"86%" }
```

The Scrim is a **full-bleed rectangle at uniform opacity over a cover-fit 1:1 background** — the same
operation as `Image.blend`, over the same framing. Setting opacity to 62 makes production perform the
proof's composite.

### 5c. The only difference is the scrim colour, and it moves in the safe direction

| | Proof | Production |
|---|---|---|
| Scrim colour | `#0B1220` = (11,18,32) | `#080C1E` = (8,12,30) |

Per-channel contribution difference at α=0.62: **R 1.86 / G 3.72 / B 1.24 out of 255** ⇒ **≤1.46%
luminance**, and **the production scrim is darker than the proof scrim on all three channels.**
Therefore rendered contrast at 62 is **greater than or equal to** the contrast the crop proof
certified. The proof is preserved, with a conservative margin — not approximated.

### 5d. Three independent sources converge on ~60–62

| Source | Value | Nature |
|---|---|---|
| `cropproof.py` `SCRIM_A` | **0.62** | the executed text-safety gate |
| Template `Scrim.opacity` authored default | **60%** | the designer's own value |
| `docs/creative-library/property-pulse.json:32` + styleguide | **~62%** on `#0B1220` | "evidence-derived from the proven caption/headline scrim" |

The resolver's 40 agrees with **none** of them. 62 is the only value consistent with all three, and
it sits 2 points above the template's own default — i.e. the proposal does not invent a density, it
restores the one every artefact already records.

### 5e. The mechanism is already proven in production

`scrim_opacity_override` is **not** a novel or dark path. **16 live NDIS Yarns backgrounds already
carry `scrim_opacity_override='55'`** and have rendered through it (34 successful NDIS `image_quote`
renders in the last 30 days). This apply uses an existing, production-exercised mechanism with a
different value on different rows.

### 5f. Honest limits of the claim

- **62 does not rescue every asset.** `contact_sheet_proposed_scrim62.jpg` shows **S5** (home
  exterior) and **S7** (formal garden) remain marginal at 62 — busy foliage and bright sky defeat a
  uniform scrim. This *supports* the Pack A verdict that S5/S7 are unsuitable, and the remediation
  is not offered as a fix for them. It restores the certified density; it does not upgrade an asset.
- **`generic_quote_card_1x1_v1` (2140ca19…) — Scrim `fill_color` and authored opacity are NOT
  verified in-repo.** It is confirmed to *have* a `Scrim` field (so the resolver will emit
  `Scrim.opacity`), but only `generic_market_insight_card_1x1_v1` has an authoring source here.
  **S8 renders through quote_card.** A read-only provider GET on 2140ca19 must confirm the Scrim is
  full-bleed and dark-navy **before apply** — see stop condition ST-2. If its Scrim is geometrically
  different (e.g. a panel, or a gradient), §5b does not transfer and the packet must be re-cut.

## 6. Rollback, per asset

Uniform and exact, because no row has the key today:

```sql
-- APPLY (one statement, 8 rows)
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta || jsonb_build_object('scrim_opacity_override','62'),
       updated_at = now()
 WHERE id IN (S1…S8)                                   -- ids listed in §1
   AND asset_meta->>'crop_proof' = 'pass_1x1_scrim62'  -- guard: only proof-62 rows
   AND NOT (asset_meta ? 'scrim_opacity_override');    -- guard: fail-closed if already set

-- ROLLBACK (restores byte-identical prior state)
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta - 'scrim_opacity_override',
       updated_at = now()
 WHERE id IN (S1…S8);
```

| # | Rollback value | Verification |
|---|---|---|
| S1–S8 | **key absent** (`asset_meta ? 'scrim_opacity_override'` → false) | post-rollback: resolver returns 40 and `scrim_override_applied` disappears from `reasons` |

Rollback is a key deletion, not a value restore — there is no prior value to lose. The apply is
idempotent-guarded (`NOT (asset_meta ? …)`), so a re-run cannot double-apply or silently overwrite.

**Pre-apply snapshot to disk:** `SELECT id, asset_meta FROM c.shared_creative_asset` → the packet
directory, so rollback can be byte-diffed rather than assumed.

## 7. Production-equivalent visual proof

**Static proof — current, rebuilt at true production values** in `_harness/cc0073_packA_contactsheet/`.
The earlier as-rendered sheet blended toward pure black with approximate text placement; it has been
**rebuilt** to composite `#080C1E` full-bleed with the Headline at the template's authored geometry
(x 7%, y 26%, width 86%), rendered at 1080 then downscaled.

| File | Shows |
|---|---|
| `contact_sheet_raw.jpg` | 1:1 centre crops, no scrim — framing only |
| `contact_sheet_as_rendered.jpg` | **the defect** — `#080C1E` @ **40%** (48% for the CFW `needs_scrim` asset), production geometry |
| `contact_sheet_proposed_scrim62.jpg` | **the remediation** — same compositing @ **62%** |

Reading them side by side: at 40% the headline is weak on S1/S2/S4/S6/S8 and effectively unreadable
on S5/S7; at 62% S1–S4, S6 and S8 become clean, and S5/S7 stay marginal (§5f).

**Live proof — required after apply, before the lane closes.** Static sheets are evidence, not proof.

| Step | Check | Pass condition |
|---|---|---|
| L1 | `select_template('invegent', <platform>, 'image_quote', NULL, seed)` | `modifications->>'Scrim.opacity'` = **62** (was 40) on facebook, instagram, linkedin |
| L2 | same call | `selected[0].reasons` now contains **`scrim_override_applied`** |
| L3 | Real production render for Invegent | `m.post_render_log` row `succeeded` |
| L4 | **PK visual PASS** on the rendered card | headline + footer legibility, no crushed background, correct badge, no cross-client leak |
| L5 | Untouched clients unchanged | PP / NDIS / CFW `Scrim.opacity` byte-identical pre/post (PP 48, NDIS 55, CFW 48) |
| L6 | Spine unmutated | `pg_get_functiondef` of `resolve_slot_assets` **and** `select_template` byte-identical pre/post |
| L7 | Fences untouched | `is_active` / `production_use_allowed` / `approval_status` / `allowed_clients` byte-identical pre/post on all 8 |

## 8. Stop conditions

Any one halts the apply; the remainder is void and resumption needs a fresh gate.

- **ST-1** Any of the 8 rows already has `scrim_opacity_override` at apply time (guard trips → 0 rows
  updated → STOP and re-cut; never force).
- **ST-2** The read-only provider GET on `generic_quote_card_1x1_v1` (2140ca19…) shows a Scrim that is
  not a full-bleed dark rectangle, or `fill_color` materially lighter than `#0B1220` (§5f).
- **ST-3** Row count updated ≠ **8**.
- **ST-4** Any column other than `asset_meta`/`updated_at` differs pre/post, or any `asset_meta` key
  other than `scrim_opacity_override` differs.
- **ST-5** Any other client's resolved `Scrim.opacity` changes (L5).
- **ST-6** `resolve_slot_assets` or `select_template` definition differs pre/post (L6).
- **ST-7** Any `m.asset_gap_suggestion` classification column changes (all 8 rows, 6 columns).
- **ST-8** Invegent's post-apply render fails, or PK's visual verdict is anything but PASS.
- **ST-9** The value written is anything other than the string `"62"` — specifically, a **fractional**
  value. See the hazard below.
- **ST-10** External review's `reviewed_input_hash` ≠ this packet's hash.
- **ST-11** Unexpected origin movement, or files outside the approved change set.

### ⚠️ ST-9 hazard, stated explicitly

Two differently-scaled keys coexist in `asset_meta`:

- `scrim_opacity_override` — **0–100**, and the **only** key the resolver reads (`'55'` on 16 NDIS rows).
- `suggested_scrim_opacity` — **0–1 fractions** on most PP/CFW rows (`'0.55'`, `'0.56'`, `'0.72'`),
  and **read by nothing**.

The resolver clamps to `[0,100]` without scale detection. Writing `'0.62'` instead of `'62'` yields a
**0.62% scrim — effectively no scrim at all**, silently, with `scrim_override_applied` still reported
as if it worked. The apply must write the string `"62"`, and L1 must assert the resolved value is
`62`, not merely that an override was applied.

---

## Adjacent findings — recorded, deliberately NOT in this apply

1. **`suggested_scrim_opacity` is a declared control production never reads.** Present on ~20
   PP/CFW/NDIS rows with carefully chosen per-asset values (0.48–0.72) that have never affected a
   render. Same failure class as this defect, larger surface. **Needs its own lane.**
2. **CFW's live background** (`bg_cfw_brand_texture_navy_waves`) carries
   `suggested_scrim_opacity='0.55'`, no `crop_proof`, no override ⇒ renders at 48. Out of scope
   (client asset, no scrim-62 proof to restore) — its correct density is an open question for the
   CFW promotion lane, not this one.
3. **NDIS `needs_scrim` rows** carry `suggested_scrim_opacity='0.55'` and no override ⇒ 48, while
   their 16 `sfto='true'` siblings run at 55. Inconsistent within one brand. Recorded only.
4. **`news_static_centered_scrim_1x1_v1`** (PP's live client template) bakes a **static** scrim — the
   registry note says `Scrim.opacity` is dynamic on the TMR generics but static here. Whether the
   resolver's emitted `Scrim.opacity` is honoured or ignored on PP's card is **unverified**. PP is
   untouched by this apply; flagged for the record.
5. **cc-0051 handoff (reasoning only, no change authored):** the resolver's 40/48 constants disagree
   with both the template's authored default (60) and every crop proof on file. Whether the
   constants should change is a resolver-design question owned by cc-0051. **This packet deliberately
   does not propose that** — it corrects data so production matches the proof, without touching code.

## Gate-1 ruling requested

> **RULING S1 — Apply the scrim remediation?** Recommend **yes**: set
> `scrim_opacity_override='62'` on all 8 `c.shared_creative_asset` rows, subject to ST-2 clearing
> first. One statement, guarded, single-key rollback, live blast radius limited to Invegent's card,
> and it restores a certified density rather than inventing one.

**Sequencing:** this lands **before** any CFW policy row, any promotion manifest, and any sourcing —
so the seven fenced assets are corrected while still dark, and Invegent's live card is proven at the
restored density first. Per Ruling 3, promotion and policy remain gated and travel in **separate**
manifests.
