# cc-0073 — FINAL DATA-ONLY APPLY GATE (scrim remediation)

**Created:** 2026-07-24 Sydney · **Author:** chat (S5) · **Status:** apply gate — **NOTHING APPLIED**
**Evidence base:** `cc-0073-scrim-remediation-apply-packet-v1.md` (`reviewed_input_hash` pin `fc8e7a13…`)
**Tier:** T3 · **Change class:** data-only, one key, one table

**Excluded from this gate and this apply (ST-12):** policy changes · asset promotion · sourcing ·
template change · resolver change. CFW/Invegent mutations remain gated behind **separate** policy and
promotion manifests and are **unruled**.

---

## Stale-ref gate — PASSED 2026-07-24

```
git fetch --prune origin
fetched upstream origin/main : ce3e4b8cfd65951e1719e936aa5b12d77b6573d4
local HEAD                   : ce3e4b8cfd65951e1719e936aa5b12d77b6573d4
branch                       : main
parity (ahead/behind)        : 0 / 0
```
Base **is at** the fetched upstream SHA. No divergence. Not stale. Re-run this gate if the packet
ages past the apply window.

## Live pre-state — re-verified immediately before authoring

`SELECT` over `c.shared_creative_asset`: **total 8 · crop_proof='pass_1x1_scrim62' 8 ·
safe_for_text_overlay='true' 8 · already has `scrim_opacity_override` **0** · is_active 1.**
Population uniform; ST-1 guard clean.

---

# 1 · Exact affected rows

Exactly **8** rows of `c.shared_creative_asset`. No other table, no other row.

| # | id | asset_key | live |
|---|---|---|---|
| S1 | `84a2751e-dc06-4f0f-874d-9869c190c309` | `Shared/Backgrounds/bg_shared_soft_blue_gradient.jpg` | fenced |
| S2 | `3719033b-725e-4023-9dd2-b779ec462579` | `Shared/Backgrounds/bg_shared_neutral_concrete_texture.jpg` | fenced |
| S3 | `c36bb74f-6f3b-4939-8bdc-c47fc2f39e82` | `Shared/Backgrounds/bg_shared_soft_grey_bokeh.jpg` | fenced |
| S4 | `4a4087e6-3fd6-4833-80a3-c76aba7ed822` | `Shared/Backgrounds/bg_shared_abstract_wall_sky.jpg` | fenced |
| S5 | `9c52865f-ab7b-4437-9d96-9c69668c2013` | `Shared/Backgrounds/bg_shared_contemporary_home.jpg` | fenced |
| S6 | `bd462204-cf43-4680-8aae-4083103593e1` | `Shared/Backgrounds/bg_shared_glass_office_tower.jpg` | fenced |
| S7 | `4042286e-0012-484e-a060-25d4159f9861` | `Shared/Backgrounds/bg_shared_landscaped_garden.jpg` | fenced |
| **S8** | `0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1` | `Shared/Backgrounds/bg_shared_datacentre_server.jpg` | **LIVE — Invegent ×3** |

**Live blast radius: S8 only.** S1–S7 are fenced and render nowhere — corrected *while still fenced*,
not shipped and repaired after.

# 2 · Proposed value — `62` on the 0–100 scale

Written as the **JSON string `"62"`** (two characters). Restores the density
`cropproof.py` executed (`SCRIM_A = 0.62`) against these exact eight files.
Production today emits **40**. Authored template defaults: market_insight **60**, quote_card **72**.

> **Claim discipline.** 62 restores the **crop-proof-certified** density. It does **not** claim to
> restore quote_card's authored 72; that residual is a cc-0051 observation, not closed here.

# 3 · Abort guard against fractional-scale values

`scrim_opacity_override` is **0–100**; `suggested_scrim_opacity` is **0–1** and is read by nothing.
`resolve_slot_assets` clamps to `[0,100]` **without scale detection**, so `'0.62'` yields a
**0.62% scrim — visually none** — while still appending `scrim_override_applied`.

**Abort. Never clamp. Never coerce.** Run before apply, and again after:

```sql
-- FRACTIONAL-SCALE ABORT GUARD — must return zero rows, both pre- and post-apply
SELECT id, asset_meta->>'scrim_opacity_override' AS bad_value
FROM c.shared_creative_asset
WHERE asset_meta ? 'scrim_opacity_override'
  AND ( asset_meta->>'scrim_opacity_override' ~ '^\s*[+-]?0?\.'
     OR (asset_meta->>'scrim_opacity_override')::numeric < 1
     OR jsonb_typeof(asset_meta->'scrim_opacity_override') <> 'string' );
-- ANY row returned  =>  ABORT the lane. Do not correct in place. Re-cut the packet.
```

Never copy `suggested_scrim_opacity` into `scrim_opacity_override` — the scales differ by 100×.

# 4 · Apply + rollback

```sql
BEGIN;

-- APPLY — one statement; expect exactly 8 rows
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta || jsonb_build_object('scrim_opacity_override','62'),
       updated_at = now()
 WHERE id IN ('84a2751e-dc06-4f0f-874d-9869c190c309','3719033b-725e-4023-9dd2-b779ec462579',
              'c36bb74f-6f3b-4939-8bdc-c47fc2f39e82','4a4087e6-3fd6-4833-80a3-c76aba7ed822',
              '9c52865f-ab7b-4437-9d96-9c69668c2013','bd462204-cf43-4680-8aae-4083103593e1',
              '4042286e-0012-484e-a060-25d4159f9861','0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1')
   AND asset_meta->>'crop_proof' = 'pass_1x1_scrim62'   -- guard: only proof-62 rows
   AND NOT (asset_meta ? 'scrim_opacity_override');     -- IDEMPOTENCY guard: fail-closed if set

-- in-transaction assertion: exactly 8, else abort
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM c.shared_creative_asset
   WHERE asset_meta->>'scrim_opacity_override' = '62';
  IF n <> 8 THEN RAISE EXCEPTION 'cc-0073 ABORT: expected 8 rows at override=62, got %', n; END IF;
END $$;

COMMIT;   -- only after the assertion passes and the §3 guard returns zero rows
```

**Rollback — key deletion. No prior value exists to restore** (all 8 verified without the key).

```sql
UPDATE c.shared_creative_asset
   SET asset_meta = asset_meta - 'scrim_opacity_override',
       updated_at = now()
 WHERE id IN ( … the same 8 ids … );
```

Rollback restores byte-identical prior `asset_meta`. The idempotency guard means a re-run of APPLY
updates **0** rows rather than double-applying or overwriting. **Pre-apply snapshot** of
`id, asset_meta` for all 8 to disk, so rollback is byte-diffed rather than assumed.

# 5 · Database readback

```sql
-- R1 — stored value, all 8
SELECT id, asset_meta->>'asset_key' AS asset_key,
       asset_meta->>'scrim_opacity_override' AS override,
       jsonb_typeof(asset_meta->'scrim_opacity_override') AS json_type
FROM c.shared_creative_asset ORDER BY asset_key;
-- PASS: 8 rows · override = '62' on every row · json_type = 'string' on every row

-- R2 — nothing else moved: asset_meta differs ONLY by the new key
SELECT id, (asset_meta - 'scrim_opacity_override') = <pre_apply_snapshot.asset_meta> AS meta_otherwise_identical
FROM c.shared_creative_asset;                      -- PASS: true on all 8

-- R3 — fences untouched
SELECT id, is_active, production_use_allowed, approval_status, allowed_clients
FROM c.shared_creative_asset ORDER BY id;          -- PASS: byte-identical to pre-apply snapshot

-- R4 — ledger untouched (classification frozen)
SELECT id, subject_kind, failure_state, primary_route, asset_gap_drainability, status, asset_gap_detected
FROM m.asset_gap_suggestion ORDER BY id;
-- PASS: 8 rows, 4 open; carousel ×3 = (assignment, unassigned); PP YouTube = (platform_config, misconfigured)

-- R5 — spine unmutated
SELECT md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('resolve_slot_assets','select_template');
-- PASS: both digests identical to pre-apply
```

# 6 · Resolver-output proof — BOTH sides

`scrim_override_applied` appears **identically** for a working `62` and a broken `0.62`. Its presence
is **not** a pass. The emitted value must be asserted.

```sql
-- P1 — Invegent, all three live platforms, pinned seed
SELECT p AS platform,
  public.select_template('invegent',p,'image_quote',NULL,'cc0073-postapply')
    ->'slot_resolution'->'modifications'->>'Scrim.opacity' AS scrim_opacity,
  public.select_template('invegent',p,'image_quote',NULL,'cc0073-postapply')
    ->'slot_resolution'->'selected'->0->'reasons' AS reasons
FROM unnest(ARRAY['facebook','instagram','linkedin']) p;
```

| Assertion | Pass condition |
|---|---|
| **P1a — emitted value** | `Scrim.opacity` = **`62`** on all three. Was **40**. **A value `< 1` is the ST-9 silent failure → ABORT.** |
| **P1b — reason present** | `reasons` contains `scrim_override_applied` — required, but **only counts paired with P1a** |
| **P1c — stored ≠ emitted** | R1 says `'62'` **and** P1a says `62`. Either alone is not a pass. |

```sql
-- P2 — no other client moved. SAME PINNED SEED pre and post, so the same asset is picked
--      and the comparison is valid (NDIS mixes 55 and 48 rows, so it has no single constant).
SELECT slug, platform,
  public.select_template(slug,platform,'image_quote',NULL,'cc0073-baseline')
    ->'slot_resolution'->'modifications'->>'Scrim.opacity' AS scrim_opacity
FROM (SELECT unnest(ARRAY['property-pulse','ndis-yarns','care-for-welfare-pty-ltd']) slug) c
CROSS JOIN (SELECT unnest(ARRAY['facebook','instagram','linkedin']) platform) p;
```

**Pre-apply baseline captured 2026-07-24 at seed `cc0073-baseline` — post-apply must match exactly:**

| Client | facebook | instagram | linkedin |
|---|---|---|---|
| property-pulse | 48 | 48 | 48 |
| ndis-yarns | 55 | 55 | 55 |
| care-for-welfare-pty-ltd | 48 | 48 | 48 |
| *(invegent — the one that must change)* | *40 → **62*** | *40 → **62*** | *40 → **62*** |

Any drift in the first three rows ⇒ **ABORT** (ST-5).

# 7 · Production-equivalent visual proof

**Static — already produced, current, at live-verified production values** (`#080C1E` full-bleed;
Headline x 7% / y 26% / w 86%; rendered 1080 then downscaled), in `_harness/cc0073_packA_contactsheet/`:

| File | Shows |
|---|---|
| `contact_sheet_raw.jpg` | 1:1 centre crops, no scrim |
| `contact_sheet_as_rendered.jpg` | **the defect** — 40% (48% for the CFW `needs_scrim` asset) |
| `contact_sheet_proposed_scrim62.jpg` | **the remediation** — 62% |

**Live — required after apply, before the lane closes.** Static sheets are evidence, not proof.

| # | Check | Pass condition |
|---|---|---|
| V1 | Real Invegent `image_quote` production render | `m.post_render_log` row `succeeded` |
| V2 | Rendered card carries the corrected scrim | render's `modifications` show `Scrim.opacity = 62` |
| V3 | **PK visual PASS** | quote/headline legibility · background not crushed · correct Invegent badge · no cross-client brand leak · scrim reads as one deliberate density |
| V4 | No regression elsewhere | next PP / NDIS / CFW renders visually unchanged |

**V3 is the deciding act. Nothing else closes the lane.**

---

## Honest limits — verbatim, unchanged

- **62 does not rescue S5 and S7.** `contact_sheet_proposed_scrim62.jpg` shows the home exterior and
  the formal garden remain marginal at 62 — busy foliage and bright sky defeat a uniform scrim at any
  density. This **reinforces the Pack A verdict** that S5/S7 are unsuitable rather than contradicting
  it. The remediation restores a certified density; it does not upgrade an asset.
- **Live blast radius is S8 / Invegent only.** S1–S7 are fenced and render nowhere, so they are
  **corrected while still fenced** rather than shipped and repaired afterwards.

## Abort conditions — consolidated

ST-1 any row already carries the key (guard → 0 rows) · **ST-2 cleared; re-arms if either template
is re-authored before apply** · ST-3 rows updated ≠ 8 · ST-4 any column or `asset_meta` key other
than the target differs · ST-5 any other client's `Scrim.opacity` drifts at the pinned seed · ST-6
spine digest differs · ST-7 any ledger classification column changes · ST-8 Invegent render fails or
PK visual verdict ≠ PASS · **ST-9 any fractional-scale value anywhere → abort, never clamp** ·
ST-10 `reviewed_input_hash` ≠ `fc8e7a13…` · ST-11 unexpected origin movement or out-of-set files ·
ST-12 any attempt to bundle policy, promotion, sourcing, template or resolver change.

## Handoff — frozen, not staged

`_harness/cc0073_packA_contactsheet/FREEZE.sha256` is authoritative. **Nothing is staged; the git
index was not used as a handoff channel** (`git diff --cached` = 0 files). S4 stages after verifying
hashes. No commit, no register version, no push from this session.

**This gate's own sha256 is appended to FREEZE.sha256 after finalization and reported in the handoff
message.** Evidence-packet pin for ST-10 remains `fc8e7a132aa9abdb13f70d28cb721a8e8411cc926f4c5e37f9d3a7a158c5b3c8`.
