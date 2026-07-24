# cc-0073 — FINAL APPLY PACKET: shared-background scrim remediation (v1)

**Created:** 2026-07-24 Sydney
**Author:** chat (S5 — Asset-Gap Drain)
**Status:** final apply packet — **authoring only; NOTHING APPLIED**
**Supersedes for apply purposes:** `docs/briefs/cc-0073-scrim-remediation-gate1-packet.md` (evidence
base, unchanged and not edited — this packet adds the ST-2 verification result and the elevated ST-9)
**Parent:** `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` · `docs/briefs/cc-0073-decision-packs-a-b-c.md`
**Lane:** PRODUCT_PROOF · **Tier T3** · origin/main `ce3e4b8`, parity 0/0

**Mutations performed: NONE.** The only external action taken was the **PK-authorized read-only
provider GET** (ST-2). No provider mutation, no database write, no promotion, no policy row, no
ledger write, no template change, no deploy, no commit, no register version, no push.
Classification re-verified frozen: 8 ledger rows, 4 open; three carousel rows
`(assignment, unassigned)`; PP YouTube `(platform_config, misconfigured)`.

---

## ST-2 — VERIFICATION RESULT: **CONFIRMED**

Read-only `GET https://api.creatomate.com/v1/templates/{id}` (Authorization header only; key
operator-held, never in transcript; no request body; no mutation).

### `generic_quote_card_1x1_v1` — `2140ca19-d075-49d3-9dc9-30d924805e22` (the template S8 renders through)

```json
{ "name":"Scrim", "type":"shape", "fill_color":"#080C1E", "opacity":"72%",
  "x":"0%","y":"0%","x_anchor":"0%","y_anchor":"0%","width":"100%","height":"100%" }
{ "name":"Background", "type":"image", "x":"0%","y":"0%","x_anchor":"0%","y_anchor":"0%" }
```
Composition 1080×1080. Element order: `Background` → `Scrim` → `Logo` → `QuoteMark` → `QuoteText`
→ `Attribution` → `SourceLabel` → `Footer`. The Scrim sits **directly above the Background and below
every text element** — the required stacking.

### `generic_market_insight_card_1x1_v1` — `48cba556-…` (re-verified LIVE, not from the local copy)

```json
{ "name":"Scrim", "type":"shape", "fill_color":"#080C1E", "opacity":"60%",
  "x":"0%","y":"0%","x_anchor":"0%","y_anchor":"0%","width":"100%","height":"100%" }
{ "name":"Headline", "type":"text", "fill_color":"#FFFFFF", "x":"7%","y":"26%","width":"86%" }
```
Live provider state matches the local harness source byte-for-byte on every field cited in the
evidence packet. The proof sheets' geometry is confirmed correct.

### Determination against the ST-2 test

| Requirement | quote_card | market_insight |
|---|---|---|
| Scrim is a **shape**, not a gradient/panel/mask | ✅ | ✅ |
| **Full-frame**: 100%×100% at x/y 0%, anchors 0%/0% | ✅ | ✅ |
| **Dark** fill | ✅ `#080C1E` | ✅ `#080C1E` |
| Stacked **above Background, below all text** | ✅ | ✅ |
| Composition matches the proof's 1080×1080 1:1 | ✅ | ✅ |

**Both templates apply a uniform full-frame alpha composite of `#080C1E` over a cover-fit 1:1
background — the same operation as `cropproof.py`'s `Image.blend(crop, #0B1220, α)`. §5b transfers.
ST-2 clears.**

### Reachability re-verified (the override must actually arrive at the render)

`resolve_slot_assets` gates the `Scrim.opacity` modification on:

```sql
SELECT EXISTS (SELECT 1 FROM c.creative_provider_template_field f
               WHERE f.template_id = p_template_id AND f.element_name = 'Scrim') INTO v_has_scrim;
```

— existence only, **independent of the `dynamic` flag.** Both templates have a `Scrim` field row
(`element_type='shape'`, `dynamic=false`). The `dynamic=false` value is ICE registry metadata, not a
Creatomate constraint, and the path is **empirically proven**: 16 NDIS assets carry
`scrim_opacity_override='55'` and render through `market_insight` (also `dynamic=false`) — 34
successful NDIS `image_quote` renders in the last 30 days.

### 🔶 New finding from ST-2 — quote_card's authored scrim is **72%**, not 60%

The two templates disagree with each other, and production disagrees with both:

| Template | Authored `Scrim.opacity` | Production ships | Gap |
|---|---|---|---|
| `generic_market_insight_card_1x1_v1` | 60% | 40% | −20 |
| `generic_quote_card_1x1_v1` | **72%** | 40% | **−32** |

**Invegent's live card is under-scrimmed by 32 points against its own template's design intent** —
worse than the −20 stated in the evidence packet. The remediation's direction is unchanged and its
urgency increases.

**This does not change the proposed value, and here is why it must not.**
`scrim_opacity_override` is a key on the **ASSET**, not on the template. The same eight shared assets
are intended to serve **both** templates — `quote_card` for Invegent today, `market_insight` for CFW
if Ruling A1/A2 land. A per-asset key structurally cannot encode a per-template density. One value
must serve both.

**62 is the correct single value** because it is the only value with an executed proof behind it
(`cropproof.py SCRIM_A = 0.62`, run against these exact eight files). It sits **+2 above**
market_insight's authored 60 and **−10 below** quote_card's authored 72.

> **Claim discipline — what this packet does and does not assert.** It asserts that 62 restores the
> **crop-proof-certified** density. It does **not** assert that 62 restores quote_card's authored
> design intent of 72. Those are different claims and only the first is evidenced. The residual
> 10-point gap on the quote card is **recorded as an observation** (see Adjacent Findings 6) —
> strictly better than today's 40, and not something this apply claims to have closed.

---

## 1. Affected assets — all 8 rows of `c.shared_creative_asset`

Population verified uniform: every row has `crop_proof='pass_1x1_scrim62'`,
`safe_for_text_overlay='true'`, and **no** `scrim_opacity_override` key.

| # | id | asset_key | live today |
|---|---|---|---|
| S1 | `84a2751e-dc06-4f0f-874d-9869c190c309` | `Shared/Backgrounds/bg_shared_soft_blue_gradient.jpg` | fenced |
| S2 | `3719033b-725e-4023-9dd2-b779ec462579` | `Shared/Backgrounds/bg_shared_neutral_concrete_texture.jpg` | fenced |
| S3 | `c36bb74f-6f3b-4939-8bdc-c47fc2f39e82` | `Shared/Backgrounds/bg_shared_soft_grey_bokeh.jpg` | fenced |
| S4 | `4a4087e6-3fd6-4833-80a3-c76aba7ed822` | `Shared/Backgrounds/bg_shared_abstract_wall_sky.jpg` | fenced |
| S5 | `9c52865f-ab7b-4437-9d96-9c69668c2013` | `Shared/Backgrounds/bg_shared_contemporary_home.jpg` | fenced |
| S6 | `bd462204-cf43-4680-8aae-4083103593e1` | `Shared/Backgrounds/bg_shared_glass_office_tower.jpg` | fenced |
| S7 | `4042286e-0012-484e-a060-25d4159f9861` | `Shared/Backgrounds/bg_shared_landscaped_garden.jpg` | fenced |
| **S8** | `0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1` | `Shared/Backgrounds/bg_shared_datacentre_server.jpg` | **LIVE — Invegent ×3 platforms** |

## 2–4. Proof · production · proposed

| # | Recorded proof | Production now | Proposed override | Δ |
|---|---|---|---|---|
| S1–S7 | 62 | 40 | **`"62"`** | +22 |
| S8 | 62 | 40 (vs template intent 72) | **`"62"`** | +22 |

## 5. Why 62 preserves the proof

Unchanged from the evidence packet §5 and now strengthened by live provider confirmation:

- **§5a** `cropproof.py` executed `Image.blend(centre_1:1_crop@1080, #0B1220, 0.62)` + white text.
- **§5b** Both templates perform a uniform full-frame composite of `#080C1E` over a cover-fit 1:1
  background — **live-verified this pass**, the same operation.
- **§5c** Colour delta at α=0.62: R 1.86 / G 3.72 / B 1.24 of 255 ⇒ **≤1.46% luminance**, production
  scrim **darker on all three channels** ⇒ contrast ≥ certified.
- **§5d** Three independent sources converge on 60–62 (`cropproof.py` 0.62 · market_insight authored
  60% · PP style guide ~62% evidence-derived). The resolver's 40 matches none. ST-2 adds a fourth
  data point at 72 — every authored source sits **at or above** 60; **40 is the outlier.**
- **§5e** Mechanism already live and proven (16 NDIS rows at 55).

## 6. Rollback

```sql
-- APPLY — one statement, expect exactly 8 rows
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta || jsonb_build_object('scrim_opacity_override','62'),
       updated_at = now()
 WHERE id IN (S1…S8)
   AND asset_meta->>'crop_proof' = 'pass_1x1_scrim62'
   AND NOT (asset_meta ? 'scrim_opacity_override');

-- ROLLBACK — restores byte-identical prior state
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta - 'scrim_opacity_override',
       updated_at = now()
 WHERE id IN (S1…S8);
```

Rollback is a **key deletion**; no prior value exists to lose. The apply is idempotency-guarded, so a
re-run cannot double-apply or overwrite. **Pre-apply snapshot** of `id, asset_meta` for all 8 written
to disk so rollback is byte-diffed, not assumed.

## 7. Production-equivalent visual proof

**Static — current, in `_harness/cc0073_packA_contactsheet/`,** rebuilt at live-verified production
values (`#080C1E` full-bleed; Headline x 7% / y 26% / w 86%; rendered 1080 then downscaled):

| File | Shows |
|---|---|
| `contact_sheet_raw.jpg` | 1:1 centre crops, no scrim |
| `contact_sheet_as_rendered.jpg` | **the defect** — 40% (48% for the CFW `needs_scrim` asset) |
| `contact_sheet_proposed_scrim62.jpg` | **the remediation** — 62% |

**Live — required after apply, before the lane closes.** Static sheets are evidence, not proof.

| Step | Check | Pass condition |
|---|---|---|
| L1 | **Stored value** — `SELECT asset_meta->>'scrim_opacity_override'` on all 8 | exactly the string **`62`** on 8 rows; `jsonb_typeof` = `string`; **no row matches `^0?\.`** |
| L2 | **Resolver output** — `select_template('invegent',<platform>,'image_quote',NULL,seed)` | `modifications->>'Scrim.opacity'` = **`62`** (numeric 62, **not** 0.62) on facebook, instagram, linkedin |
| L3 | Resolver reasons | `scrim_override_applied` present **and** L2's value is 62 — presence alone is NOT a pass (see ST-9) |
| L4 | Live render | `m.post_render_log` row for invegent `image_quote` = `succeeded` |
| L5 | **PK visual PASS** | headline/quote legibility, background not crushed, correct Invegent badge, no cross-client leak |
| L6 | Untouched clients | PP / NDIS / CFW resolved `Scrim.opacity` byte-identical pre/post (PP 48 · NDIS 55 · CFW 48) |
| L7 | Spine unmutated | `pg_get_functiondef` of `resolve_slot_assets` **and** `select_template` byte-identical pre/post |
| L8 | Fences untouched | `is_active` · `production_use_allowed` · `approval_status` · `allowed_clients` byte-identical pre/post on all 8 |
| L9 | Ledger untouched | all 8 `m.asset_gap_suggestion` rows, 6 classification columns, byte-identical pre/post |

## 8. Stop conditions

Any one halts the apply; the remainder is void; resumption needs a fresh gate.

- **ST-1** Any of the 8 rows already carries `scrim_opacity_override` (guard trips → 0 rows) → STOP, re-cut, never force.
- **ST-2** ✅ **CLEARED THIS PASS.** Re-arms if either template is re-authored before apply — re-run the GET if the packet ages past the gate.
- **ST-3** Rows updated ≠ **8**.
- **ST-4** Any column other than `asset_meta`/`updated_at` differs pre/post; or any `asset_meta` key other than `scrim_opacity_override` differs.
- **ST-5** Any other client's resolved `Scrim.opacity` changes (L6).
- **ST-6** `resolve_slot_assets` or `select_template` definition differs pre/post (L7).
- **ST-7** Any `m.asset_gap_suggestion` classification column changes (L9).
- **ST-8** Invegent's post-apply render fails, or PK's visual verdict is anything but PASS.
- **ST-9 🔴 BLOCKING — scale discipline.** See below.
- **ST-10** External review `reviewed_input_hash` ≠ this packet's hash.
- **ST-11** Unexpected origin movement, or files outside the approved change set.
- **ST-12** Any attempt to bundle promotion, pool-policy, sourcing, template or resolver change into this apply.

### 🔴 ST-9 — BLOCKING scale condition

Two differently-scaled keys coexist in `asset_meta`:

| Key | Scale | Read by the resolver? |
|---|---|---|
| `scrim_opacity_override` | **0–100** | **YES** — the only one |
| `suggested_scrim_opacity` | **0–1** (`'0.55'`, `'0.56'`, `'0.72'`) | **NO** — read by nothing |

`resolve_slot_assets` does `LEAST(GREATEST(value::numeric,0),100)` — it clamps **without scale
detection**. `'0.62'` therefore yields a **0.62% scrim — visually no scrim at all** — while still
appending `scrim_override_applied` to the reasons, i.e. **reporting success while delivering the
defect it was meant to fix.**

Enforcement, mandatory:

1. **Write `62`. Never `0.62`.** The literal is the two-character string `62`.
2. **Abort on fractional scale — do not clamp, do not coerce.** Pre-apply and post-apply assertion:
   any override value matching `^\s*0?\.` or numerically `< 1` ⇒ **ABORT**, no correction attempt.
3. **Prove both sides.** L1 asserts the **stored** value is `62`; L2 asserts the **resolver-emitted**
   `Scrim.opacity` is `62`. Neither alone is a pass.
4. **`scrim_override_applied` is not evidence of success** — it appears identically for `62` and
   `0.62`. L3 passes only when paired with L2's value assertion.
5. **Never copy `suggested_scrim_opacity` into `scrim_opacity_override`** — the scales differ by 100×.

## Honest limits — retained, unchanged

- **62 does not rescue S5 and S7.** `contact_sheet_proposed_scrim62.jpg` shows the home exterior and
  the formal garden remain marginal at 62 — busy foliage and bright sky defeat a uniform scrim at any
  density. This **reinforces the Pack A verdict** that S5/S7 are unsuitable rather than contradicting
  it. The remediation restores a certified density; it does not upgrade an asset.
- **Live blast radius is S8 / Invegent only.** S1–S7 are fenced and render nowhere, so they are
  **corrected while still fenced** rather than shipped and repaired afterwards.

## Adjacent findings — recorded, deliberately EXCLUDED from this apply

1. `suggested_scrim_opacity` is a **declared control production never reads** across ~20 PP/CFW/NDIS
   rows with deliberate per-asset values (0.48–0.72) that have never affected a render. Same failure
   class, larger surface. **Its own lane.**
2. CFW's live background carries `suggested_scrim_opacity='0.55'`, no `crop_proof`, no override ⇒ 48.
   Out of scope (client asset, no scrim-62 proof to restore); its correct density belongs to the CFW
   promotion lane.
3. NDIS `needs_scrim` rows run at 48 while their 16 `sfto='true'` siblings run at 55 — inconsistent
   within one brand. Recorded only.
4. `news_static_centered_scrim_1x1_v1` (PP's live client template) bakes a **static** scrim; whether
   the resolver's emitted `Scrim.opacity` is honoured or ignored there is **unverified**. PP is
   untouched by this apply.
5. **cc-0051 handoff (reasoning only, no change authored):** the resolver's 40/48 constants disagree
   with every authored template default (60, 72) and every crop proof (62). Whether the constants
   should change — or become template-aware — is a resolver-design question owned by cc-0051. This
   packet corrects **data** so production matches the proof, and touches no code.
6. **New, from ST-2:** the two generic templates authored different scrim densities (60 vs 72) while a
   **per-asset** override key cannot express a per-template value. If per-template scrim intent
   matters, that is a schema/resolver question — **cc-0051**, not this apply.

## Gate ruling requested

> **RULING S1 — apply the scrim remediation.** Recommend **yes**. ST-2 is confirmed on both
> templates against live provider state. One guarded statement, 8 rows, one key, single-key rollback,
> live blast radius limited to Invegent's card, an already-proven mechanism, and it restores a
> density certified by an executed proof rather than inventing one. ST-9 is enforced as blocking with
> both-sides post-apply proof.

**Sequencing (unchanged):** this lands **before** any CFW policy row, any promotion manifest, and any
sourcing. Policy (`best_fit`) and promotion remain **separate manifests** and stay gated on: scrim
remediation **proven** · PK receiving the CFW contact sheet · separate review of the two manifests.
No Invegent client asset may be introduced under `client_preferred` in a way that suppresses its
shared pool.

---

## FREEZE MANIFEST — shared-checkout handoff

Per the shared-checkout protocol: frozen paths + hashes, never a staged index. **Nothing is staged;
the git index was not touched.** Recording is the control tower's; these paths are handed off frozen.

Computed 2026-07-24 against the working tree at origin/main `ce3e4b8`:

| Path | sha256 |
|---|---|
| `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` | `e14e6dd1b4fa6881da4ba27363ce8a26b391e9cb992da9edf013cad1add65073` |
| `docs/briefs/cc-0073-decision-packs-a-b-c.md` | `87f3339b39f3d5d6666ef98ccbf287b31774e00f0519d00ac06e503466a06928` |
| `docs/briefs/cc-0073-scrim-remediation-gate1-packet.md` | `c1f31a861c067a72acaf5a277ba40bd140d38ca1c711a51a97b4ada6dbf48cc4` |
| `_harness/cc0073_packA_contactsheet/contact_sheet_raw.jpg` | `dbe51d09f6a9deb0462c71a0e1f0103891f3b52e5b8e7ce46372bebc190e9c5d` |
| `_harness/cc0073_packA_contactsheet/contact_sheet_as_rendered.jpg` | `2defab2ab4cc401358cad6f81d276584ef4c83e59f5c04c0201da8232c20281a` |
| `_harness/cc0073_packA_contactsheet/contact_sheet_proposed_scrim62.jpg` | `378af2b6c1eebd44839989d95cf2b25e4034d78e0dcad8788f2bb79b69d4d223` |
| `_harness/cc0073_packA_contactsheet/integrity_report.json` | `4ecc203e868a60571a61a1fededb37cd67890c475b58724732c6c2169d3dd387` |

**This packet's own sha256** is emitted to `_harness/cc0073_packA_contactsheet/FREEZE.sha256` after
finalization (a file cannot contain its own hash) and is reported in the handoff message. It is the
value external review must pin as `reviewed_input_hash` per ST-10.

**Abort the recording pass on any drift from these values.** Nothing is staged; the git index was not
used as a handoff channel.
