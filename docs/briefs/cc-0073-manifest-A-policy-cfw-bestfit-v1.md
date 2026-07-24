# cc-0073 — MANIFEST A: CFW pool policy (`best_fit`)

**Created:** 2026-07-24 Sydney · **Author:** chat (S5) · **Status:** authored + frozen — **HELD, NOT APPLIED**
**Parent:** `docs/briefs/cc-0073-decision-packs-a-b-c.md` (Ruling A1) · `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md`
**Ruling:** PK-9 / PK-13 — open the CFW/Invegent pool activation
**Tier:** T3 · **Change class:** data-only, ONE row, ONE table, INSERT only

> ⛔ **HOLD.** S9 is mid-mutation on cc-0080. Two production mutations never interleave.
> Await **"S5 GO — pool window open."**

> **This manifest is the POLICY ruling ONLY.** It promotes nothing, activates nothing, and changes no
> asset. Promotion travels in **Manifest B**, separately gated. Applying A without B changes CFW's
> rendered output by **exactly nothing** (§4) — which is what makes it independently safe and testable.

---

## 1. Live pre-state (re-derived 2026-07-24, stale-ref gate PASS at `052a9ba`, parity 0/0)

`c.client_asset_pool_policy` — the whole table:

| client | pool_policy | allow_global_shared | allow_vertical_shared | policy_version |
|---|---|---|---|---|
| **care-for-welfare-pty-ltd** | **NO ROW** | — | — | — |
| invegent | `client_preferred` | true | false | `cc-0044-invegent-v1` |
| property-pulse | **NO ROW** | — | — | — |
| ndis-yarns | **NO ROW** | — | — | — |

`resolve_slot_assets` defaults `v_pool_policy := 'client_only'` and only overrides it `IF FOUND`.
**No row ⇒ `client_only` ⇒ the shared pool is never consulted for CFW.** Verified in the live
function body, not inferred.

## 2. The change — exactly one row

```sql
INSERT INTO c.client_asset_pool_policy
  (client_id, pool_policy, allow_global_shared, allow_vertical_shared,
   client_asset_score_bias, minimum_fit_score, policy_version, updated_at)
VALUES
  ('3eca32aa-e460-462f-a846-3f6ace6a3cae',  -- care-for-welfare-pty-ltd
   'best_fit', true, false, 0, NULL, 'cc-0073-cfw-bestfit-v1', now());
```

Field-by-field justification:

| Field | Value | Why |
|---|---|---|
| `pool_policy` | **`best_fit`** | CHECK constraint verified live: `ANY(ARRAY['client_only','client_preferred','best_fit'])` — `best_fit` is valid. It is the **only** value that helps: under `client_preferred` the shared pool is consulted *only when the client list is empty*, and CFW has 1 client asset, so `client_preferred` would leave CFW at 1 forever. |
| `allow_global_shared` | `true` | All 8 shared assets are `governance_scope='global_generic'`; this is what puts that scope into `v_permitted`. |
| `allow_vertical_shared` | `false` | No vertical-scoped shared assets exist. `true` would invoke `derive_template_vertical()` for no benefit — avoid an unnecessary code path. |
| `client_asset_score_bias` | `0` | Matches Invegent's precedent. **Read by nothing** in `resolve_slot_assets` (grep-verified) — recorded as an inert field, not relied upon. |
| `minimum_fit_score` | `NULL` | Same — inert; Invegent's is NULL. |
| `policy_version` | `cc-0073-cfw-bestfit-v1` | Lane-traceable, distinct from `cc-0044-invegent-v1`. |

## 3. Verified resolver semantics for `best_fit`

From the live function body:

```sql
IF v_has_background AND v_pool_policy <> 'client_only'
   AND array_length(v_permitted,1) IS NOT NULL
   AND ( v_pool_policy = 'best_fit'
      OR (v_pool_policy = 'client_preferred'
          AND jsonb_array_length(v_bg_true)=0 AND jsonb_array_length(v_bg_needs)=0) )
THEN  -- consult c.shared_creative_asset
```

and the ranking:

```sql
IF v_pool_policy = 'best_fit' THEN
  ... jsonb_agg(e ORDER BY ((e->>'sfto') IS DISTINCT FROM 'true'),  -- text_safe first
                (e->>'_ord')::timestamptz ASC, (e->>'asset_id')::uuid ASC, (e->>'_origin') ASC)
```

**`best_fit` = client assets **plus** shared assets, merged into one list**, ordered text-safe-first
then by `created_at`. Rotation is `hash(seed) mod count` — **uniform over the whole merged list**, so
every asset including CFW's own is equally likely.

### 🔶 Consequence PK should know before ruling

CFW's brand asset `bg_cfw_brand_texture_navy_waves` is `safe_for_text_overlay='needs_scrim'`; the
shared assets are `'true'`. The `best_fit` sort puts text-safe first, so **CFW's own brand-navy
background sorts LAST** in the ranked list. It is **not** dropped and — because the pick is
`hash mod count`, not "take the first" — it remains **equally likely** (1-in-N). But CFW's brand
texture goes from **100% of cards** to **1-in-4** once Manifest B lands.

That is the intended product outcome (rotation instead of one repeated card), but it *is* a visible
brand-appearance change and should be a conscious ruling, not a side effect.

## 4. Blast radius — applying A **alone** changes nothing

With A applied and B **not** applied, the shared-pool loop runs but rejects all 8:
7 on `inactive` / `production_use_not_allowed`, and S8 on `not_in_allowlist`
(`allowed_clients=[invegent]`, CFW not in it). CFW's resolved background therefore stays
`bg_cfw_brand_texture_navy_waves`, scrim 48, pool size 1 — **byte-identical to today.**

This is deliberate: A is independently applyable, independently reversible, and independently
provable, with **zero** rendered change. All visible change is gated behind B.

**Other clients:** PP, NDIS have no policy row ⇒ `client_only` ⇒ unaffected by construction.
Invegent's row is untouched.

## 5. Apply guards

```sql
-- G1 pre: CFW must have NO row (else this is an UPDATE, not an INSERT → re-cut)
SELECT count(*) FROM c.client_asset_pool_policy
 WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae';        -- MUST be 0

-- G2 pre: table-wide baseline
SELECT client_id, pool_policy FROM c.client_asset_pool_policy;  -- MUST be exactly 1 row (invegent)

-- G3 post: exactly 2 rows; invegent untouched
SELECT client_id, pool_policy, allow_global_shared, allow_vertical_shared, policy_version
FROM c.client_asset_pool_policy ORDER BY client_id;
-- PASS: 2 rows — invegent client_preferred/true/false/cc-0044-invegent-v1 UNCHANGED
--                CFW      best_fit/true/false/cc-0073-cfw-bestfit-v1
```

## 6. Rollback

```sql
DELETE FROM c.client_asset_pool_policy
 WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae'
   AND policy_version='cc-0073-cfw-bestfit-v1';   -- version guard: never delete another lane's row
```

Restores byte-identical prior state (no row). PK is the table's own primary key, so a re-run of the
INSERT raises a duplicate-key error rather than silently double-applying.

## 7. Proof

| # | Check | Pass condition |
|---|---|---|
| A1 | Row exists, correct values | G3 above |
| A2 | Invegent row untouched | `client_preferred` / true / false / `cc-0044-invegent-v1`, `updated_at` unchanged |
| A3 | Row count == 2 | exactly |
| A4 | **CFW rendered output UNCHANGED** | `select_template('care-for-welfare-pty-ltd',{fb,ig,li},'image_quote',NULL,'cc0073-baseline')` → still `bg_cfw_brand_texture_navy_waves`, `Scrim.opacity=48` |
| A5 | **Shared pool is REACHED and correctly fenced** | see §7a — must discriminate by **slot**, not by `reason_code` |
| A6 | PP / NDIS / Invegent unchanged | pinned seed `cc0073-baseline`: PP 48/48/48 · NDIS 55/55/55 · Invegent 62/62/62, same backgrounds |
| A7 | Spine unmutated | `pg_get_functiondef` md5 of `resolve_slot_assets` = `75d59925316ccde39073113557504596`, `select_template` = `41df4745707d0396f145d32d7ffd7483` |

**A5 is the real proof of this manifest:** it demonstrates the unlock works *without* changing a
single rendered pixel.

## 7a. A5 — corrected predicate (defect found and fixed pre-apply, 2026-07-24)

**The A5 predicate as first written would have produced a FALSE PASS.** Counting
`reason_code IN ('inactive','production_use_not_allowed','not_in_allowlist')` returns **7 today —
before any policy row exists** — because CFW has 7 fenced **client LOGO** assets rejected as
`inactive` on the `Logo` slot. Those are not shared-pool rejections at all. A proof that counts them
would "pass" identically whether or not the shared pool is reached, i.e. it would prove nothing.

Shared-pool rejections are emitted as `slot='Background'` with
`asset_key = COALESCE(sa.asset_meta->>'asset_key', sa.id::text)`, which for every shared row is
`Shared/Backgrounds/…`. **The proof must discriminate on slot + asset_key, never on `reason_code`.**

```sql
WITH r AS (
  SELECT p AS platform,
         public.select_template('care-for-welfare-pty-ltd',p,'image_quote',NULL,'cc0073-baseline')
           ->'slot_resolution' AS sr
  FROM unnest(ARRAY['facebook','instagram','linkedin']) p
)
SELECT platform,
  sr->'selected'->0->>'asset_key'            AS bg,
  sr->'modifications'->>'Scrim.opacity'      AS scrim,
  (SELECT count(*) FROM jsonb_array_elements(sr->'rejected') e
    WHERE e->>'slot'='Background' AND e->>'asset_key' LIKE 'Shared/Backgrounds/%') AS shared_bg_rejections,
  (SELECT count(*) FROM jsonb_array_elements(sr->'rejected') e
    WHERE e->>'slot'='Logo') AS logo_rejections
FROM r ORDER BY platform;
```

### Captured BASELINE — read-only, pre-apply, 2026-07-24

| platform | bg | scrim | shared_bg_rejections | logo_rejections |
|---|---|---|---|---|
| facebook | `bg_cfw_brand_texture_navy_waves` | 48 | **0** | 7 |
| instagram | `bg_cfw_brand_texture_navy_waves` | 48 | **0** | 7 |
| linkedin | `bg_cfw_brand_texture_navy_waves` | 48 | **0** | 7 |

**`shared_bg_rejections = 0` on every platform is the proof that the shared loop does not run today.**

### A5 PASS condition (post-apply)

| Field | Must become | Meaning |
|---|---|---|
| `shared_bg_rejections` | **0 → 8** | the shared pool is now **reached**: 7 × `inactive`, 1 × `not_in_allowlist` (S8) |
| `bg` | **unchanged** `bg_cfw_brand_texture_navy_waves` | output did not change |
| `scrim` | **unchanged** `48` | output did not change |
| `logo_rejections` | **unchanged** `7` | untouched control — if this moves, something unrelated changed |

**A5 passes only if `shared_bg_rejections` goes 0 → 8 *while* `bg` and `scrim` stay identical.**
That is the two-sided claim: reachability proven, output unchanged. Either half alone is not a pass —
"nothing broke" is not evidence the unlock worked, and "the pool is reached" without byte-identical
output would mean the change was not inert.

## 8. Stop conditions

- CFW already has a policy row (G1 ≠ 0) → STOP, re-cut as an UPDATE with explicit PK ruling.
- Table baseline ≠ 1 row pre-apply → STOP (another lane wrote here).
- Post-apply row count ≠ 2, or Invegent's row differs in any field → STOP + rollback.
- **CFW's resolved background or scrim changes (A4)** → STOP + rollback: A alone must be inert.
- Any other client's resolved output drifts at the pinned seed → STOP + rollback.
- Spine digest differs → STOP.
- Any `m.asset_gap_suggestion` classification column changes → STOP.
- Any attempt to bundle Manifest B, sourcing, template or resolver change → STOP.
- Unexpected origin movement or out-of-set files → STOP.

## 9. Explicitly NOT in this manifest

Asset promotion (Manifest B) · sourcing · resolver or template change · ledger mutation · any change
to Invegent's existing policy row · any PP/NDIS policy row · commit/register/push.

---

**Ruling requested:** apply the single CFW `best_fit` policy row. Recommend **yes** — it is the
structural unlock, one row, trivially reversible, and provably inert until Manifest B lands.
