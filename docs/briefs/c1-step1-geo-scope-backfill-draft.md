CLAIMED v5.50 · c1-step1-geo-scope-backfill · shared default worktree (main) · register pointer (T1) · 2026-07-10T12:05:00Z

# C1 Closure · Step 1 — `geo_scope` Backfill

**Status:** ✅ **APPLIED + PROVEN 2026-07-10.** Vocabulary and pairing rule **RATIFIED by PK**
(`au_generic` may sit under a Perth headline). 31 rows written, 7 deliberately absent, pool unmoved
at 20. **C1 remains OPEN** — see §0 and §5. Applied outcome at the foot.
**Tier (proposed):** T3 — production DML on the governed asset pool.
**Parent:** `docs/briefs/c1-geo-pairing-enforcement-gate1-brief.md` §6 step 1.
**Predecessor:** v5.49 live-exposure containment (`docs/briefs/results/c1-live-exposure-containment-result.md`).
**Statement:** `_harness/c1_geo_verify_20260710/geo_scope_backfill.sql` (prepared, not run).

---

## 0. The thing to be honest about first

This step writes a **new `asset_meta` key that nothing reads.** By the standard this lane has been
applying all night, that is the C1 defect itself — governance metadata adjacent to a production path
that never consults it.

The difference is intent and sequencing, and it only holds if the sequence completes:

- `geo_scope` has a **named consumer**: §6 step 4 widens `resolve_slot_assets` to return it, and step 5
  asserts on it in `buildTmrRenderPlan`. Until step 5 flips to fail-loud, **`geo_scope` is documentation.**
- **It must not be cited as a control** in the interim. The register entry and this brief say so.
- If steps 4–5 are not funded, this key should be **deleted**, not left lying around implying a guard.

That obligation is the price of writing the field at all.

---

## 1. Proposed vocabulary — **PK DECISION, this is the gate**

A closed set. Any value outside it is a bug. `NULL`/absent means *unknown* and, once enforcement is
live, fails closed.

| `geo_scope` | Meaning | Example |
|---|---|---|
| `none` | Depicts **no place**. An object, an abstraction, or an interior making no locational claim. | keys on a table, a chart, a calculator, roof trusses against sky |
| `unidentified` | Depicts a place, but **not identifiable** to any region by a reasonable viewer. | graded subdivision lots from the air |
| `au_generic` | Identifiably **Australian**, not to a city or state. | red-tile suburb aerial, no landmark |
| `au_wa_perth` | Identifiably **Perth, WA**. | Swan River + Perth CBD |
| `au_nsw` / `au_qld` | Identifiably that state. | Sydney Harbour; Whitehaven Beach |
| `non_au` | Identifiably **outside Australia**. | São Paulo skyline |

### 1a. Proposed pairing rule (step 2 of §6 — stated here so the vocabulary can be judged)

Let `copy_geo` be the structured geography of the copy (**which does not exist yet** — see §5).

| asset `geo_scope` | may pair with copy_geo … |
|---|---|
| `none` | anything, including no geography |
| `unidentified` | anything — it makes no claim |
| `au_generic` | national/AU-wide copy, **and** any AU city (it does not contradict "Perth") |
| `au_wa_perth` | Perth / WA copy, and national copy |
| `au_nsw`, `au_qld` | that state, and national copy. **Never** another state's city. |
| `non_au` | **only** copy with no place label at all |

> **The judgment call PK owns:** is `au_generic` allowed under a "Perth median price" headline? I say
> **yes** — a generic Australian suburb does not *assert* it is Perth, and forbidding it would empty
> the pool. But `au_nsw` under a Perth headline is a lie, because Sydney *is* somewhere else.
> `non_au` under any place label is the São Paulo case and must never pair.

---

## 2. Population: 38 rows, and what gets a value

Counted from the DB, not from this document's own prose:
`background` **24** (12 live) · `broll_background` **2** (0 live) · `logo` **12** (8 live) = **38** (20 live).

| group | rows | treatment |
|---|---|---|
| Live backgrounds | 12 | assigned (all pixel-verified 2026-07-10) |
| Deactivated backgrounds (v5.49) | 5 | assigned (all pixel-verified) |
| B-roll (fenced) | 2 | assigned (both verified at intake) |
| Logos | 12 | assigned `none` — **see §2a, this is load-bearing** |
| **Fenced backgrounds, NEVER pixel-verified** | **7** | **DELIBERATELY LEFT ABSENT** — see §2b |
| **Total** | **38** | 31 written, 7 left `NULL` |

### 2a. Logos must be backfilled or production dies

`resolve_slot_assets` scans `usage IN ('background','logo')` in one loop. If step 5 fails closed on a
missing `geo_scope`, and logos carry none, **every render returns `missing_required_logo`** — a total
outage. Logos depict no place; `none` is both true and safe. Skipping them would be the outage.

### 2b. The seven unverified assets get NOTHING, on purpose

`bg_pp_au_suburb_texture` · `bg_pp_contract_signing_closeup` · `bg_pp_family_backyard_summer` ·
`bg_pp_for_sale_sign_street` · `bg_pp_open_home_entry` · **`bg_pp_perth_skyline_dawn_moody`** ·
`bg_pp_transaction_keys_contract`

All are currently fenced (`is_active=false`, `approved=false`), so they select nothing today. I have
**not looked at their pixels.** Assigning a `geo_scope` from their names is exactly the method that
produced four bad clips and missed a street sign tonight.

Leaving them absent gives a useful property: **once enforcement fails closed, none of them can be
re-approved into production without a pixel verification that produces a `geo_scope`.** The gap is
the guard.

Two deserve advance suspicion:
- **`bg_pp_perth_skyline_dawn_moody`** — a *second* Perth-named asset nobody has verified. If it is not
  Perth, its name would authorise the exact mislabel enforcement exists to prevent.
- **`bg_pp_for_sale_sign_street`** — the name promises signage. `bg_pp_modern_home_exterior_front`
  already carried a legible street blade past review.

---

## 3. Assignments (evidence-cited; artifacts in `_harness/c1_geo_verify_20260710/`)

### Live backgrounds (12)

| asset_key | `geo_scope` | evidence |
|---|---|---|
| `bg_perth_cbd` | `au_wa_perth` | Swan River + Perth CBD from South Perth; skyline located by gradient scan, 3× zoom |
| `bg_pp_perth_cbd_skyline_day_wide` | `au_wa_perth` | Kings Park vantage; CBD, freeway, Swan River, Elizabeth Quay |
| `bg_pp_au_suburb_aerial_grid` | `au_generic` | red-tile suburb, reads AU; **no landmark, not verified to a state** (verdict `PASS_GENERIC_ONLY`) |
| `bg_pp_subdivision_land_estate` | `unidentified` | graded lots from the air; no AU marker. Its own note says "geography unconfirmed" |
| `bg_pp_new_build_construction_site` | `none` | roof trusses against sky |
| `bg_pp_kitchen_living_open_plan` | `none` | interior |
| `bg_pp_advisory_desk_flatlay` | `none` | desk flat-lay |
| `bg_pp_market_data_chart_grid` | `none` | abstract chart |
| `bg_pp_home_keys_contract_table` | `none` | model house + keys |
| `bg_pp_inspection_checklist_clipboard` | `none` | clipboard (bears handwritten "CHECK LIST" — text, not place) |
| `bg_pp_mortgage_calculator_keys` | `none` | calculator + keys |
| `bg_pp_sold_sign_closeup` | `none` | sign on grass ("SOLD"/"FOR SALE" — text, not place) |

### Deactivated backgrounds (5)

| asset_key | `geo_scope` | evidence |
|---|---|---|
| `bg_pp_city_skyline_vantage` | `non_au` | dense high-rise, consistent with São Paulo |
| `bg_pp_coastal_waterfront` | `au_qld` | Whitehaven / Hill Inlet silica sandbar |
| `bg_sydney_cbd` | `au_nsw` | harbour heads, Sydney Tower |
| `bg_brisbane_cbd` | `au_qld` | Brisbane River, CBD, bridge |
| `bg_pp_modern_home_exterior_front` | `unidentified` | streetscape; the blade names **streets** ("MIDDLEBOROUGH TCE"/"NORTHAM") but I did **not** verify a city. **Stays deactivated regardless — it fails the signage rule.** |

### B-roll (2, fenced)

| asset_key | `geo_scope` | note |
|---|---|---|
| `broll_pp_perth_skyline` | `au_wa_perth` | verified Perth at intake |
| `broll_pp_au_suburb_aerial` | **`au_nsw`** | It **is** Hurstville, Sydney. PK accepted it as "generic-AU, national stats only" — that intent is expressed by the **pairing rule** (`au_nsw` pairs with national copy, never with Perth), **not** by mislabelling the asset `au_generic`. The row records what it is; the rule records what it may do. |

### Logos (12) → `none`

**Live (8):** `pp_logo_primary` · `pp_logo_master_png_1024` · `pp_logo_full_colour_png_1024` ·
`pp_logo_white_png_1024` · `pp_logo_dark_png_1024` · `pp_logo_mark_only_png_512` ·
`pp_logo_square_navy_bg_png_1024` · `pp_logo_watermark_white_png`

**Fenced (4):** `pp_logo_master_png_2048` · `pp_logo_master_png_512` · `pp_logo_mark_only_png_1024` ·
`pp_logo_square_navy_bg_png_512`

Assigned by `usage='logo'` in the statement, not by enumerating names — an enumeration is one typo away
from silently skipping a logo, and a skipped logo becomes an outage the day enforcement fails closed.

---

## 4. Relationship to the existing `geography` key

`geography` is **free prose** on 4 rows (`generic_non_au`, `au_qld_not_wa`, `au_nsw_sydney_hurstville`,
`au_wa_perth`). It is **not** touched. `geo_scope` is the machine-readable enum; `geography` stays as a
human description. Deleting or rewriting `geography` is out of scope and would destroy provenance.

**Note the disagreement this exposes:** `broll_pp_au_suburb_aerial.geography` says
`au_nsw_sydney_hurstville` while its `label_constraint` prose says "GENERIC AU SUBURB ONLY". Both are
mine, both are true, and neither is machine-readable. That is C1 in one row.

---

## 5. What this step does NOT do — the remaining wall

Even with all 39 rows backfilled, **enforcement is impossible**, because there is nothing to compare
against:

- `B1Fields.location` is hardcoded `''` in production.
- There is **no `image_location` column** on `m.post_draft`, and no geo/location/region column anywhere
  in schemas `m`, `c`, `t`.
- The place name lives inside the free text of `image_headline`.

**§6 step 3 (a structured geography on the copy) is the real work, and it is upstream of the renderer.**
This backfill is necessary and insufficient. It should not be mistaken for progress on enforcement.

---

## 6. Guards for the apply (when gated)

1. Pre-check: exactly 38 PP rows in `usage IN ('background','logo','broll_background')`
   (24 background / 2 broll_background / 12 logo); abort on drift.
2. Pre-check: **no row already has `geo_scope`** (this is a first backfill; never silently overwrite).
3. Every written value is a member of the closed vocabulary — asserted, not assumed.
4. `get diagnostics` rowcount asserted **per group** (12 / 5 / 2 / 12), not in aggregate.
5. Post-check: exactly **31** rows have `geo_scope`; exactly **7** do not, and they are the named seven.
6. **Pool-neutrality:** the live-eligible pool must remain **20** (12 bg + 8 logo). `geo_scope` is not
   read by any selector today, so a change here would mean the statement touched a fence. Fail closed.
7. `branch-warden` **before** apply.
8. `RAISE` placeholder/arg parity + zero `%%` literals, checked before execution.

## 7. Rollback

`asset_meta = asset_meta - 'geo_scope'` on the 31 rows, with a rowcount assertion. The key did not
exist before; removing it restores the exact prior state. No fence is touched, so rollback is
side-effect-free.

## 8. Open questions for PK

1. **Ratify the vocabulary** (§1). Adding a value later is cheap; changing the meaning of one is not.
2. **Ratify the pairing rule** (§1a) — specifically: may `au_generic` sit under a "Perth" headline?
3. Do the **seven unverified assets** get pixel-verified now, or stay absent as a fail-closed gap?
4. **`bg_pp_perth_skyline_dawn_moody`** — verify before it can ever be re-approved?
5. Should `geo_scope` be a **typed column** rather than a jsonb key? `m.music_track` puts its fences in
   typed columns and that is the better shape. This backfill assumes jsonb to stay same-shape with the
   existing pool; a column is a migration (DDL, T3) and a larger lane.
6. If §6 steps 4–5 are not funded, **do we delete `geo_scope`** rather than leave an unread field?

---

# Applied outcome (2026-07-10)

**PK ratified** the §1 vocabulary and the §1a pairing rule, explicitly including: `au_generic` **may**
sit under a Perth headline. Applied same session.

## Result (read back from the DB; the DO block's own assertions are not evidence)

| `geo_scope` | n | assets |
|---|---|---|
| `au_wa_perth` | 2 bg + 1 broll | `bg_perth_cbd`, `bg_pp_perth_cbd_skyline_day_wide`, `broll_pp_perth_skyline` |
| `au_nsw` | 1 bg + 1 broll | `bg_sydney_cbd`, `broll_pp_au_suburb_aerial` |
| `au_qld` | 2 | `bg_brisbane_cbd`, `bg_pp_coastal_waterfront` |
| `non_au` | 1 | `bg_pp_city_skyline_vantage` |
| `au_generic` | 1 | `bg_pp_au_suburb_aerial_grid` |
| `unidentified` | 2 | `bg_pp_subdivision_land_estate`, `bg_pp_modern_home_exterior_front` |
| `none` | 8 bg + 12 logos | objects, abstractions, interiors |
| **`<ABSENT>`** | **7** | the named unverified fenced backgrounds |

- **31 written, 7 absent.** Every value a JSON string, every value inside the closed vocabulary.
- **Pool unmoved: 20.** `geo_scope` is read by nothing, so any movement would have meant a fence was
  touched — the statement asserts neutrality and rolls back on drift.
- Asserted, not assumed: **no unverified asset received a value.**
- Guards: population 38 = 24/2/12 · first-backfill (no pre-existing key) · per-group rowcounts
  (12/5/2/12) · vocabulary + jsonb-type check · pool neutrality · `branch-warden` **before** apply ·
  `RAISE` arity + zero `%%` checked before execution.

## 🚨 NEW FINDING — a multi-tenant precondition nobody had written down

A proof query of mine reported `logo_without_none = 23`, which looked like 23 PP logos had escaped the
backfill. **The query was wrong — it was missing the `client_id` filter.** All 12 PP logos are `none`.

But chasing it surfaced a real defect in the plan:

> **Three other clients hold 23 background/logo assets with no `geo_scope`.**
> They have **zero live assets** today, so nothing breaks now. But `resolve_slot_assets` is **not
> PP-scoped** — it resolves by `client_slug`. The moment §6 step 5 fails closed on a missing
> `geo_scope`, **every one of those clients' first governed render dies with
> `missing_required_logo`**, and it will look like an onboarding bug, not a backfill gap.

**Hard gate for step 5 (new):** either the backfill extends to **all** clients before enforcement
flips, **or** the fail-loud assert scopes itself to clients that have opted in. This is the
`missing_required_logo` outage that §2a guarded PP against, displaced onto the tenants who were not
in the room.

## Standing

- **C1 is still OPEN.** Nothing reads `geo_scope`. This step is documentation with a named consumer.
  If §6 steps 4–5 are not funded, **delete the key** rather than leave an unread field implying a guard.
- The wall is unchanged (§5): `B1Fields.location` is hardcoded `''`, there is no `image_location`
  column, and the place name lives inside free-text `image_headline`. **Step 3 is the real work.**
- Rollback (validated, unused): `asset_meta = asset_meta - 'geo_scope'` on the 31 rows, rowcount
  asserted. The key did not exist before; removal restores the exact prior state.
- Open questions 3–6 (§8) remain unanswered: verify the seven? verify
  `bg_pp_perth_skyline_dawn_moody`? typed column vs jsonb key? delete-if-unfunded?

## 9. Non-claims

- I have not verified the seven fenced assets, and have assigned them nothing.
- `bg_pp_city_skyline_vantage` is verified **non-Australian**; "São Paulo" is inherited from its
  existing prose, not independently confirmed by me. `non_au` is the claim I can support.
- `bg_pp_au_suburb_aerial_grid` is verified *Australian-looking*, not verified to a state.
- No claim that this step advances enforcement. It does not. See §5.
