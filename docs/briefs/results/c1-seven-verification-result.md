CLAIMED v5.51 · c1-seven-verification-backfill · shared default worktree (main) · register pointer (T1) · 2026-07-10T12:40:00Z

# Result — The Seven: Pixel Verification + `geo_scope` Backfill Completion

**Lane:** c1-seven-verification-backfill · **Date:** 2026-07-10 · **Tier:** T3 (production DML)
**Label:** SAFETY_GATE · **Verdict:** APPLIED + PROVEN. **C1 remains OPEN.**
**Predecessor:** v5.50 (`docs/briefs/c1-step1-geo-scope-backfill-draft.md`)
**Evidence:** `_harness/c1_geo_verify_20260710/seven/` (images, zooms, `SEVEN_VERIFICATION_FINDING.md`)

## Why these seven existed

At v5.50, seven fenced PP backgrounds were **deliberately left without `geo_scope`** because nobody
had ever looked at their pixels. Assigning a value from an asset's *name* is the method that produced
four bad clips and let a street sign through review. **The gap was designed to be the guard.**

PK then asked for them to be verified. **The gap earned its keep.**

## What the pixels showed

Of seven assets never verified, **three carry defects and one would have been mis-scoped:**

| asset_key | recorded verdict | what it actually is |
|---|---|---|
| `bg_pp_open_home_entry` | `PASS_WITH_NOTE` | 🚨 **A North American house.** Painted lap siding, colonial carriage lantern, brass grip-set handleset, double-hung sashes with colonial grilles, letter slot, porch swing. Not Australian vernacular. |
| `bg_pp_perth_skyline_dawn_moody` | `PASS_WITH_NOTE` | 🚨 **Genuinely Perth** (Central Park tower, Bell Tower spire, Elizabeth Quay, Swan River) — **but the towers carry legible corporate signage: AMP · Citibank · Westpac · "The New Esplanade Hotel."** Same defect class as D3 and the `MIDDLEBOROUGH TCE` street blade. |
| `bg_pp_transaction_keys_contract` | `ACCEPT_VISUAL_ONLY` | 🚨 The document under the model house is **Ukrainian** — `Отримав ( ла )` / `Дата і підпис` ("Received" / "Date and signature"). Its prose hedged at *"unsigned foreign…"* and stopped. |
| `bg_pp_au_suburb_texture` | `ACCEPT_VISUAL_ONLY` | Australian **regional** town, cool-climate. Its own prose says *"photographed over a NSW regional town."* Pixels confirm *Australian regional*, not NSW. **Scoped `au_nsw`, not `au_generic`** — `au_generic` would permit a Perth headline over a NSW town, the exact `broll_pp_au_suburb_aerial` mistake. |

Clean: `bg_pp_contract_signing_closeup` (pen on genuinely blank paper) · `bg_pp_family_backyard_summer`
(depicts a place, unidentifiable) · `bg_pp_for_sale_sign_street` (generic corflute; **the lower panel
was zoomed specifically — no agency branding**).

**`PASS_WITH_NOTE` sits on the North American house AND on the bank-logo skyline.** Neither note
mentioned either fact.

## Applied (PK ratified: the four clean assignments + `non_au` for the porch)

| asset_key | `geo_scope` | `is_active` | `approved` |
|---|---|---|---|
| `bg_pp_au_suburb_texture` | `au_nsw` | false | false |
| `bg_pp_perth_skyline_dawn_moody` | `au_wa_perth` | false | false |
| `bg_pp_open_home_entry` | **`non_au`** | false | false |
| `bg_pp_contract_signing_closeup` | `none` | false | false |
| `bg_pp_for_sale_sign_street` | `none` | false | false |
| `bg_pp_transaction_keys_contract` | `none` | false | false |
| `bg_pp_family_backyard_summer` | `unidentified` | false | false |

PK ratified the four clean values and `non_au` explicitly. `au_wa_perth` (Perth skyline) and `none`
(Ukrainian flat-lay) were applied on the orchestrator's recommendation, unchallenged — both are
**geography** calls, and both assets are geographically fine. **Their defects are text-safety, not
geography.**

## Coverage: 38 of 38, zero absent

```
none          23   (16 live: 8 backgrounds + 8 logos)
au_wa_perth    4   (2 live)
au_nsw         3
unidentified   3   (1 live)
au_qld         2
non_au         2
au_generic     1   (1 live)
──────────────────
              38   (20 live, 0 absent)
```

## Guards (one transaction, fail-closed)

1. Pre: exactly **31** rows already carried `geo_scope`; none of the seven did.
2. Pre: **all seven fenced** — abort if any was live.
3. `get diagnostics` rowcount asserted **= 7**.
4. Post: coverage **38 written / 0 absent**.
5. Post: every value a jsonb **string** inside the closed vocabulary.
6. **Post: fences untouched — `geo_scope` must never approve.** Asserted that none of the seven became
   `is_active` or `approved`. A backfill that quietly flipped a fence is the failure one discovers late.
7. Post: **pool neutrality** — 20 → 20. `geo_scope` is unread, so any movement would mean a fence moved.
8. `branch-warden` **before** apply (returned `concerns`: an unnamed sibling tracked-modified file;
   git-safe for a non-committing DML).

## ⚠ Two hazards now recorded ONLY where the machine cannot see them

`bg_pp_perth_skyline_dawn_moody` (bank logos) and `bg_pp_transaction_keys_contract` (Ukrainian
document) are **geographically correct** and carry correct `geo_scope` values. Their defects are
text-safety, and **no field the system reads records them.** They live in this document.

Both are fenced, so neither can render. But **if someone re-approves the Perth skyline because "it
really is Perth", they will ship AMP and Citibank logos.** Nothing enforces a crop-proof.

> This is C1's shape again, one level down: a hazard recorded adjacent to the asset, in a place the
> production path never consults. Verifying the pixels did not fix it — it only moved the record from
> nowhere to a markdown file.

**Recommended:** a required render-scale crop-proof before either is ever re-approved, and — if a
text-safety field is ever added — it must be read by something, or not added at all.

## Standing

- **C1 is still OPEN.** Nothing reads `geo_scope`. Step 1 is now complete **for Property Pulse only**.
- **Three other clients hold 23 unscoped bg/logo assets** (0 live). `resolve_slot_assets` is not
  PP-scoped: a fail-closed flip kills their first governed render with `missing_required_logo`.
  Hard gate for step 5, unchanged.
- The wall is unchanged: `B1Fields.location` is hardcoded `''`, no `image_location` column exists, the
  place name lives in free-text `image_headline`. **Step 3 is the real work and is untouched.**
- All seven remain fenced. Live pool 20. Nothing selects them.
- Rollback: `asset_meta = asset_meta - 'geo_scope'` on the 7 (or all 38), rowcount asserted.
