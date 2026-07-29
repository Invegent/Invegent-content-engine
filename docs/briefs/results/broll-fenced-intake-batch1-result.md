CLAIMED · broll-fenced-intake-batch1 · main-checkout `C:\Users\parve\Invegent-content-engine` · applied · 2026-07-29

# Result — Governed Creatomate B-roll: Fenced Intake Batch 1 · ✅ APPLIED

**Date:** 2026-07-29 Sydney · **Lane:** PRODUCT_PROOF · **Tier: T2** (fenced, pool-neutral, additive DML)
**PK authorisation:** lane spec 2026-07-29 ("Governed Creatomate B-roll — Fenced Intake Batch 1").

> **Outcome:** **4** (not 5) governed-but-fenced B-roll rows registered. All ten guards passed.
> **Eligible pool unchanged at 1** — and the resolver actively **rejects all four**, proving none is
> reachable. One candidate was **dropped by PK's own provider-ID collision guard**.

---

## 1. ⛔ Precondition findings (both required stops honoured)

### 1.1 Census reconciled — the missing fourteenth identified

Previously reported 5 accept + 1 borderline + 7 reject = **13 of 14**. Machine-verified this lane:
14 downloaded · 14 review records · `sourced == reviewed` **True** · none missing either way.

**The fourteenth is `31639439`** (Macourt Media, `adelaide australia aerial` query). It sat in a fourth
bucket (`NOT_SHORTLISTED`) omitted from the 5/1/7 summary. The *data* was complete; the *summary*
under-reported.

**Final disposition: `NOT_SHORTLISTED (batch 1) — QUALITY-ELIGIBLE, HELD FOR A FUTURE BATCH`.**
It was viewed for the first time during this reconciliation. It is **AU-authentic and clean** —
mid-rise urban centre (paired residential towers, arterial road, distant CBD skyline), no
text/watermark/signage, no identifiable people, machine checks PASS. It is a **different subject class**
from the low-rise suburb aerials and arguably adds *more* rotation variety than a third Sydney aerial.
**The original "surplus same-look" reason was not evidence-based and is withdrawn.** Not added to batch
1 — PK fixed batch-1 composition, and lane scope is not the executor's to widen. **Flagged for batch 2.**

Census now reconciles exactly: **5 accept + 1 borderline + 7 reject + 1 held = 14.**

### 1.2 Provider-ID collision — candidate `31663307` DROPPED

PK's required guard *"no provider-ID collision"* **fired on a real collision.**

| | |
|---|---|
| Candidate | `31663307` — "sunny suburb aerial" |
| Collides with | **`2d62b04e`** = `broll_pp_au_suburb_aerial` — **the LIVE, ACTIVE production clip** |
| Evidence | live row `asset_meta.source_pexels_id` = `31663307`; `source_url` = `…suburban-sydney-neighborhood-**31663307**/` |
| sha256 | **DIFFERENT** — `6ff304e5…` vs live `4c89358d…` |

**The differing hash is the point.** The live row was built from the 4K master trimmed 0–29.0s and
scaled; this lane downloaded the 1080×1920 rendition directly. Same footage, different bytes — **a
sha256-only dedup would NOT have caught this.** Only the provider-ID guard did.

**Had it been inserted and later promoted, the rotation pool would have contained the same footage
twice** — seeded selection returning visually identical output from two pool slots, silently defeating
the purpose of growing the pool.

**Batch 1 = 4.** Pool arithmetic still satisfies the ratified floor: 1 eligible + 4 fenced = **5** on
full promotion; promoting the recommended top 3 reaches exactly **4**.

---

## 2. What was applied

4 rows into `c.client_brand_asset` (client `4036a6b5…` = property-pulse), each with the storage object
uploaded to `brand-assets/Property_Pulse/Broll/` and **byte-verified** (local sha256 == public-URL
sha256, all four PASS).

| asset_key | geo_scope | pexels_id | dur | sha256 (12) |
|---|---|---|---|---|
| `broll_pp_au_wa_perth_coastal` | `au_wa_perth` | 32433684 | 19.7s | `9bf4cf20dedd` |
| `broll_pp_generic_apartment_abstract` | **`generic`** | 34641787 | 25.0s | `059ce75d0ee9` |
| `broll_pp_au_nsw_suburb_waterway` | `au_nsw_sydney_metro` | 31639427 | 51.0s | `9a91a2256f10` |
| `broll_pp_au_nsw_suburb_skyline` | `au_nsw_sydney_metro` | 31639440 | 62.7s | `1714746337f2` |

All rows: `asset_type='other'` · `usage='broll_background'` (resolver v1.4 video-Background usage) ·
`bucket='brand-assets'` · `safe_for_text_overlay='needs_scrim'` (resolver-recognised value; never
`needs_gradient_scrim`) · `platform_scope={facebook,instagram,youtube}` (LinkedIn excluded) ·
full provenance (creator, creator_url, source_url, provider id, licence + evidence URL, download
timestamp, sha256) · review notes · `label_constraint`.

**Fences, verified live on all four:** `is_active=false` · `approved=false` ·
`production_use_allowed=false` · `approval_status='intake_candidate'`.

**Geographic rule honoured:** only `34641787` carries `generic` — it is genuinely geo-neutral
(architectural abstract, no locale markers). Perth and Sydney footage carry specific scopes and are
never marked generic. Source titles independently corroborate the visual calls
(`…perth-s-scenic-coastline…`, `…hurstville-suburb…`).

## 3. Guard outcomes — all passed

| Guard | Check | Result |
|---|---|---|
| G0 | atomicity armed pre-write, re-asserted | ✅ |
| G1 | client identity exact (`client_id` + slug) | ✅ |
| G2 | **no provider-ID collision** | ✅ (fired on `31663307` → dropped pre-apply) |
| G3 | no asset-key collision | ✅ |
| G4 | no duplicate sha256 | ✅ |
| G5 | baseline eligible pool == 1, read live at apply | ✅ |
| G6 | exactly 4 rows, **all fully fenced** | ✅ |
| G7 | **pool neutrality** + existing live clip undisturbed | ✅ |
| G8 | live B-roll winner unchanged at production signature | ✅ |
| G9 | no batch-1 row is active/resolver-reachable | ✅ |

Storage-object existence was proven **before** the DB insert by the byte-verify step (public URL
fetched and hashed). Applied as ONE `execute_sql` call so `BEGIN`/`DO`/`COMMIT` composed.

## 4. Post-apply verification (live)

| metric | value |
|---|---|
| eligible B-roll pool | **1 — UNCHANGED** |
| total `broll_background` rows | 6 (2 pre-existing + 4 new) |
| resolver pick at production signature | `broll_pp_au_suburb_aerial` — **unchanged** |
| `select_template` winner (production) | `AU_generic_national_Suburb_9:16_V1` — **unchanged** |
| **batch-1 rows rejected by resolver** | **4 of 4** — none is resolver-eligible |

## 5. Rollback

**Proven before apply** (`ROLLBACK_PROOF_PASSED`): the real rollback body run verbatim against real
fenced rows — predicate matched exactly 4, deleted 4, 0 remained, eligible pool unchanged at 1, then
sentinel-aborted with zero production effect.

`_harness/broll_harvester_v0/intake_batch1_rollback.sql` deletes exactly the 4 batch-1 rows
(`intake_lane_batch LIKE 'broll-fenced-intake-batch1%'`), asserting count==4 and pool neutrality.
**Storage objects are deleted separately** — the SQL rollback covers rows only.

## 6. PK VISUAL GATE — review bundle

Contact sheets: `_harness/broll_harvester_v0/contact_sheets/pexels_<id>_sheet.jpg` (9 frames each,
sampled across the **full timeline**, not thumbnails). Delivered to PK in-session.

### Recommended first-promotion ranking (for diversity — **NOT promoted in this lane**)

The existing pool clip is a **Hurstville, Sydney suburb aerial**. Ranking maximises divergence from it:

| rank | asset_key | label | creator / source | geo | why this rank |
|---|---|---|---|---|---|
| **1** | `broll_pp_au_wa_perth_coastal` | Perth Cottesloe coastal aerial | David Pickup · [pexels 32433684](https://www.pexels.com/video/aerial-view-of-perth-s-scenic-coastline-32433684/) | `au_wa_perth` | **Different state, different subject, best text-safety** — lower ~60% is smooth ocean |
| **2** | `broll_pp_generic_apartment_abstract` | Apartment-balcony architectural abstract | Nothing Ahead · [pexels 34641787](https://www.pexels.com/video/modern-urban-apartment-building-facade-34641787/) | `generic` | **Only non-aerial subject**; geo-neutral so it is usable with any stat |
| **3** | `broll_pp_au_nsw_suburb_waterway` | Sydney suburb aerial with waterway | Macourt Media · [pexels 31639427](https://www.pexels.com/video/aerial-view-of-hurstville-suburb-at-sunset-31639427/) | `au_nsw_sydney_metro` | Sydney aerial, but waterway gives visual separation from the incumbent |
| 4 | `broll_pp_au_nsw_suburb_skyline` | Sydney suburb aerial with CBD skyline | Macourt Media · [pexels 31639440](https://www.pexels.com/video/aerial-view-of-hurstville-suburbs-at-sunset-31639440/) | `au_nsw_sydney_metro` | **Closest to the incumbent** (both Hurstville aerials) — least diversity gain |

**Promoting ranks 1–3 takes the eligible pool from 1 → 4**, meeting the ratified floor with three
distinct looks (WA coastal · architectural abstract · Sydney waterway) rather than four near-identical
aerials.

**⚠ Diversity caveat for PK:** both Sydney candidates are **Hurstville** — the same suburb as the
existing pool clip. Promoting all four would give three Hurstville aerials out of five. This is why
rank 4 is ranked last, and why `31639439` (§1.1, mid-rise urban centre) is flagged for batch 2.

## 7. Boundaries honoured

- ✅ Live template winner unchanged (`46c5c4ac` / `dd5fd75e`) — G8 verified.
- ✅ video-worker v3.15.0 untouched; parity overlay untouched.
- ✅ No approval or production-use fence flipped — G6/G9 verified.
- ✅ Resolver logic unmodified (read-only calls only).
- ✅ Intake ≠ promotion: eligible pool still 1, all 4 rows resolver-rejected.
- ✅ No existing row mutated (`2d62b04e`, `42211c0f` untouched).

## 8. Non-claims

- ❌ Not claimed: the pool grew. **It is still 1.** Promotion is the next lane.
- ❌ Not claimed: 5 rows registered. **4** — `31663307` was a duplicate of live production (§1.2).
- ❌ Not claimed: PK has visually approved anything. The bundle is *for* that gate.
- ❌ Not claimed: `label_constraint` is enforced. It is documentation only — **no renderer reads geo
  labels** (standing carry C1).
- ❌ Not claimed: storage rollback is executed by the SQL rollback — objects are a separate deletion.
- ⚠ Minor gap: `original_download_url` (the direct CDN file link) was not captured in the harvest
  manifest and is therefore absent from `asset_meta`. All other provenance is complete and the
  `source_url` + `source_pexels_id` fully identify each clip.

## 9. Stop condition

**Met.** Fenced intake applied and verified, result recorded, committed, pushed. Next outcome —
**Governed Creatomate B-roll: PK Visual Verdict and Promotion Batch 1** (T3) — promotes only
PK-approved clips and proves the eligible pool rises from 1 to ≥4.
