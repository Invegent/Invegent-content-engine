# PP Logo Variant Intake v0 — Governed Intake Packet

> **Lane:** `pp-logo-variant-intake-v0` · **Date:** 2026-07-03 (Sydney) · **Status:** ✅ APPLIED + VERIFIED (PK-approved 2026-07-03)
>
> **Apply record (2026-07-03, PK approval given in-session against SQL v2 sha `7f271632…`):**
> 1. **Uploads:** 18/18 files uploaded to `brand-assets/Property_Pulse/Logos/` (upsert=false) and verified by public URL — HTTP 200 + byte size + sha256 all matched local sources.
> 2. **DB apply:** SQL artifact executed as a single transaction via MCP `execute_sql`; assertions A1–A4 and probes P1–P3 all passed in-transaction; COMMIT clean.
> 3. **Post-apply verification (independent re-probe):** rows_inserted=18 · sha_matches=18/18 (every row's `asset_meta.sha256` equals the manifest value) · fully_fenced=18/18 · live primary resolves=1 · `resolve_slot_assets` status=ok, **Logo pick unchanged = `b7530c55…` (live pp_logo_primary)**, rejected Logo entries = 11 × `inactive` — exactly the predicted post-state; production selection provably unchanged.
> Promotion of any variant remains a separate future PK gate. CE register reconciliation/commit: pending PK instruction.
> **Client:** Property Pulse (`property-pulse`, client_id `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
> **Posture:** asset intake/governance only. The live `pp_logo_primary` is untouched; no runtime, render, publish, selector, or dashboard change.

---

## 1 · Source

- **Origin:** Claude Design project **“Property Pulse logo kit”**
  `https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd` (PK-supplied link).
- **Acquisition:** DesignSync MCP unavailable in this session (needs interactive `/design-login`); files were retrieved through PK’s authenticated Chrome session via the design project’s own `GetFile` API, bundled client-side into a single ZIP (store-only, CRC-checked) and downloaded once: `pp_logo_kit_claude_design_source.zip` (3,430,398 bytes). Extracted **37/37 files** to `_harness/pp_logo_variant_intake_v0/source/`.
- **Provenance anchor (verified):** the kit’s source raster `uploads/PP logo.png` is **byte-identical to the live production logo object** `brand-assets/Property_Pulse/Logos/PP_logo_2.png` — both sha256 `feafee4e4452663636d547af070bdec24e38094a12565ed7a3e3ccb49183da5e` (live object fetched over its public URL and hashed 2026-07-03). The kit is a rebuild of exactly the logo ICE already uses.

## 2 · Source limitations (honest record)

- The v2 kit is a **reconstruction, not the original designer master**: the roof + pulse mark was traced from the 1024 px production raster; the wordmark was **rebuilt from Urbanist 600 (“Property”) + 800 (“Pulse”) font outlines** — the closest font match, with slight letterform deviation visible in the overlay evidence (`vector/comparison_raster_vs_svg.png`, bottom panel).
- All production SVGs are **true paths/outlines** (no live-font dependency, no embedded raster). One deliberate exception: `pp_logo_master_editable.svg` keeps live `<text>` elements and **requires Urbanist 600+800 installed** — accepted as an *editing source only*, never a render asset.
- **Standing carry:** replace with the true original vector master if it is ever found. This is recorded in every proposed DB row (`source_limitations`).

## 3 · Technical verification (all 37 files)

Method: `_harness/pp_logo_variant_intake_v0/verify_assets.py` → `verification_manifest.json` / `.csv` (sha256, byte size, magic-byte format check, PNG IHDR dimensions, real alpha-channel decode via PIL, SVG path/raster/text analysis, dominant-colour extraction).

Results:

- **SVG purity:** every accepted SVG is a real vector — `<path>` elements only, **zero embedded `<image>`/base64 raster**. Fill palette is exactly the brand palette.
- **Alpha:** every “transparent” PNG genuinely uses alpha (86–96 % fully-transparent pixels); the two `square_navy_bg` files are intentionally opaque solid `#1E2532`.
- **Palette:** dominant opaque colours of every variant quantise to the declared palette — navy `#1E2532`, gold `#ECA02D`, white `#FFFFFF` (matches `uploads/primary_colors.txt` and the SVG fills).
- **Extension/format mismatches:** none. **Low-quality / off-brand files:** none found.
- **Visual identity:** master, mark, square, dark and full-colour variants visually confirmed against the live logo (side-by-side + overlay evidence sheets). White-mono variants are invisible on a white viewer and were verified by alpha + colour data (100 % white opaque pixels).
- **Duplicates found (drives the reject list):** `horizontal` = byte-identical to `full_colour`; `horizontal_white` = byte-identical to `white` (the source brand has a single lockup, so “horizontal” is the same artwork); `PP logo.png` = `PP logo 2.png` = live production logo.

### Accepted files (18)

| # | source file | asset_key | dims | bytes | fmt | alpha | sha256 |
|---|---|---|---|---|---|---|---|
| 1 | `vector/pp_logo_master.svg` | `pp_logo_master_svg` | vector | 6951 | svg | yes | `71923fd4642a062c1edb1e185808db192f1957aa7d2663091a8daabebd9ef053` |
| 2 | `vector/pp_logo_master_editable.svg` | `pp_logo_master_editable_svg` | vector | 800 | svg | yes | `e971759e807f822793bc55020bdbe16f670a07ea52b9d0f14be04ac32a8b31fe` |
| 3 | `vector/pp_logo_full_colour.svg` | `pp_logo_full_colour_svg` | vector | 6951 | svg | yes | `f12765b3d84fccc2191f4998788f8806a05b6dfb00f64d30f6c31ef4f166ecb0` |
| 4 | `vector/pp_logo_white.svg` | `pp_logo_white_svg` | vector | 6951 | svg | yes | `29d2fff49a25a7cf3f27d7b02790703eca3d51b4a0bf1f0387ffef1a4944368b` |
| 5 | `vector/pp_logo_dark.svg` | `pp_logo_dark_svg` | vector | 6951 | svg | yes | `b1800cd2e63ceec21e4570416f43e4c088cf8e229711724659b4a8ed37c91553` |
| 6 | `vector/pp_logo_mark_only.svg` | `pp_logo_mark_only_svg` | vector | 623 | svg | yes | `3cb8563bb1621c80db92ce7a19ba02e09ef511bf77b98f2658372c0a852fe115` |
| 7 | `vector/pp_logo_mark_only_dark.svg` | `pp_logo_mark_only_dark_svg` | vector | 623 | svg | yes | `0c2892c76eb37ef15e5bdbfe719299171673d7366ef4c0229875395a49550ee2` |
| 8 | `vector/pp_logo_master_transparent_512.png` | `pp_logo_master_png_512` | 512x274 | 25361 | png | yes | `88cc62acb980e9494908aa5184bd4299aee4a2989d9071220efc6b5ac8926751` |
| 9 | `vector/pp_logo_master_transparent_1024.png` | `pp_logo_master_png_1024` | 1024x547 | 57316 | png | yes | `69d9697c220bd64fe09cce9a6ad5396541dd85cbe35e481c28ceb7259b2e5697` |
| 10 | `vector/pp_logo_master_transparent_2048.png` | `pp_logo_master_png_2048` | 2048x1095 | 136752 | png | yes | `308cc34c2b0ff2875cb91224865750500d7d5e951768766f654a4a599430086f` |
| 11 | `vector/pp_logo_full_colour_1024.png` | `pp_logo_full_colour_png_1024` | 1024x547 | 61891 | png | yes | `9423a7b619bed6117e8c1f926a50b34c983af8ee695caae3c885996795cf7864` |
| 12 | `vector/pp_logo_white_1024.png` | `pp_logo_white_png_1024` | 1024x547 | 50690 | png | yes | `8f90163fd5968867423997670e05eba67f8cfcad742596906c923de9b8cee1b5` |
| 13 | `vector/pp_logo_dark_1024.png` | `pp_logo_dark_png_1024` | 1024x547 | 60522 | png | yes | `af725d11040d03d0320ac5424f7cb8385eb9a53157ddef3ac5a90c427b74ad61` |
| 14 | `assets/pp_logo_mark_only_transparent_512.png` | `pp_logo_mark_only_png_512` | 512x512 | 21082 | png | yes | `5a05207747a09e68f0ba7fe05745cc7738bdfdac74df2b74bef2db242e06b092` |
| 15 | `assets/pp_logo_mark_only_transparent_1024.png` | `pp_logo_mark_only_png_1024` | 1024x1024 | 71599 | png | yes | `5c612982d3e67020cceefd777e701ab283ff695c964546a3b1287f5bc87b0e37` |
| 16 | `assets/pp_logo_square_navy_bg_512.png` | `pp_logo_square_navy_bg_png_512` | 512x512 | 30592 | png | no (solid navy) | `4d51bba8e1d775e00bb624d74ec8a649a6c08a12ee8e0ad5c09333e65a2a4966` |
| 17 | `assets/pp_logo_square_navy_bg_1024.png` | `pp_logo_square_navy_bg_png_1024` | 1024x1024 | 73754 | png | no (solid navy) | `0956757dcc6488d6955549eae0875a5fb08ea1d0990086a279160cf2726cea3c` |
| 18 | `assets/pp_logo_watermark_white_transparent.png` | `pp_logo_watermark_white_png` | 800x428 | 45489 | png | yes | `dc4734d561c985f9496f74a9c8d6fec4413785ce54f07310d7571d3a584ed497` |

### Rejected / do-not-intake (8)

| source file | sha256 (12) | reason |
|---|---|---|
| `assets/pp_logo_horizontal_transparent_1024.png` | `c10dba390eb3` | byte-identical duplicate of `assets/pp_logo_full_colour_transparent.png` (single lockup — “horizontal” is the same artwork) |
| `assets/pp_logo_horizontal_white_transparent_1024.png` | `1bbcbebe5854` | byte-identical duplicate of `assets/pp_logo_white_transparent.png` |
| `assets/pp_logo_master_transparent.png` | `8d6808479863` | raster-derived export superseded by the crisper SVG render `vector/pp_logo_master_transparent_1024.png` (same 1024x547 role) |
| `assets/pp_logo_full_colour_transparent.png` | `c10dba390eb3` | raster-derived export superseded by `vector/pp_logo_full_colour_1024.png` |
| `assets/pp_logo_white_transparent.png` | `1bbcbebe5854` | raster-derived export superseded by `vector/pp_logo_white_1024.png` |
| `assets/pp_logo_dark_transparent.png` | `d78def1cd551` | raster-derived export superseded by `vector/pp_logo_dark_1024.png` |
| `uploads/PP logo.png` | `feafee4e4452` | source raster; byte-identical to live production `Property_Pulse/Logos/PP_logo_2.png` — evidence only, never re-uploaded |
| `uploads/PP logo 2.png` | `feafee4e4452` | byte-identical duplicate of `uploads/PP logo.png` — evidence only |

Minimum-desired-list mapping: every item on the lane’s minimum list is satisfied by an accepted file; `pp_logo_*_transparent.png` roles are satisfied by the same-size SVG renders (crisper, identical design/colours), and the “horizontal” roles by the canonical lockup files, because the brand has a single lockup arrangement.

Rejections are **quality-order decisions between duplicate/superseded exports of the same approved artwork** — no accepted file introduces a redesign. PK may override any rejection at the gate; all 37 source files remain preserved in the harness.

### Evidence retained in harness (not uploaded, not DB rows)

Rebuild-fidelity sheets (`comparison_raster_vs_svg.png`, `font_compare*.png`, `text_closeup.png`, `weight_compare.png`, `traced.json`), the kit’s own metadata CSVs, `primary_colors.txt`, and both `.dc.html` contact sheets — full hashes in `verification_manifest.json`.

## 4 · Upload plan (NOT executed — PK gate)

- **Manifest:** `_harness/pp_logo_variant_intake_v0/upload_manifest.json` (+ `.csv`) — 18 files → `brand-assets/Property_Pulse/Logos/<original filename>`, correct content-types (`image/svg+xml` / `image/png`), **upsert=false (overwrite-disabled)**.
- **No collisions:** the only existing object under `Property_Pulse/Logos/` is `PP_logo_2.png` (live logo); none of the 18 target names exist. Nothing is overwritten, nothing deleted.
- **Post-upload verification (mandatory):** for each file — public URL HTTP 200, byte size matches local, sha256 of downloaded bytes matches local source. (Machine-enforced again at DB-apply time by assertion A4.)

## 5 · Proposed DB artifact (NOT applied — PK gate)

- **File:** `_harness/pp_logo_variant_intake_v0/lane_pp_logo_variant_intake_v0.sql`
  **sha256 `7f271632eda325157d90a18b5eb365e355fe0fad4cb0ee1369d1c652b7b4a95f`** (v2 — re-cut after db-rls-auditor block; v1 `f3b58156…` used asset_type values outside the live CHECK constraint)
- **Shape:** 0 DDL / **18 data-only INSERTs** into `c.client_brand_asset`, single transaction, deterministic asset_ids (`c3a20001…c3a20018`), fail-closed assertions A1–A4 (client identity, no pre-existing ids/keys, live primary intact, storage objects present + size-matched) and in-transaction invariant probes P1–P3.
- **asset_type:** `'other'` on all 18 rows — the live CHECK constraint (`client_brand_asset_asset_type_check`) does not include finer logo-variant types, and the proven P0 intake used `'other'`; fine-grained typing lives in `asset_meta.logo_role`. (Optional future PK decision: widen the CHECK constraint — DDL, own lane.)
- **Fencing (P0-proven pattern, per row):** `is_active=false` **+** `asset_meta.approved=false` **+** `approval_status='intake_candidate'` **+** `production_use_allowed=false`.
- **Selection isolation by construction:**
  - 7 SVG rows use `usage='logo_vector_source'` → **entirely outside** the resolver candidate set (`resolve_slot_assets` only scans `usage IN ('background','logo')`); vectors are source-of-truth files, never render-selectable.
  - 11 PNG rows use `usage='logo'` → visible to the resolver **only as rejected `inactive`** (first fence), never eligible.
- **Invariant probes (machine-checked inside the apply transaction):**
  - P1: exactly 18 new rows, each fully fenced.
  - P2: `resolve_brand_assets('property-pulse', [pp_logo_primary + all 18 keys])` returns **exactly 1 row = live primary** (`b7530c55-c320-43be-90d9-98c804694921`).
  - P3: `resolve_slot_assets` on the live production template (registry id `c0b10001-…-0002`, provider `fb9820f8-3fee-4448-b324-3d500fa74b40`): status `ok`, **Logo pick unchanged = live primary**, rejected Logo entries exactly 11 × `inactive`.
  - **Pre-change baseline recorded 2026-07-03:** status `ok`, Logo pick `b7530c55…`, rejected logos 0 (7 rejected backgrounds from the P0 lane, untouched).
- **Metadata per row** includes: sha256, width/height (or `scalable` for SVG), bytes, mime/file_format, bucket + source_path + public URL, `logo_role` / `colour_mode` / `background_type`, license `brand_owned_or_pk_authorised` (attribution_required=false), rights note (PK owns/controls, mirrors 2026-07-02 confirmation), `source=claude_design_export` + project URL + in-project path, the honest `source_limitations` reconstruction record, brand palette, and visual-verification note.

## 6 · Rollback

- **DB:** `_harness/pp_logo_variant_intake_v0/rollback_pp_logo_variant_intake_v0.sql` (sha256 `2e44a694ba2cfe413a37e764270e3e36c7e53ca0b14e3da6dfa3e6691f9e16b2`) — deletes exactly the 18 deterministic asset_ids, then asserts zero remain **and** the live primary is intact.
- **Storage:** manual PK-gated deletion of the 18 uploaded objects (list = upload manifest). `PP_logo_2.png` is outside this lane and must never be deleted.
- Because every row is triple-fenced and the SVG rows are outside the resolver set, **doing nothing is also safe** — an un-promoted intake candidate has zero production effect.

## 7 · Promotion boundaries (explicitly out of scope)

Promotion of any variant (approved=true / is_active=true / production_use_allowed=true), replacing or deactivating `pp_logo_primary`, wiring the resolver or any worker to prefer new variants, Format Mix binding, render/publish tests, and dashboard changes — **each requires its own PK gate**. This lane ends at governed, fenced intake rows.

## 8 · Review chain & requirements

| Review | Scope | Verdict |
|---|---|---|
| db-rls-auditor (round 1, artifact v1 `f3b58156…`) | full audit vs live schema | **block** — 1 concrete defect (asset_type CHECK violation, fail-closed) + 1 low (opaque-row metadata string); all fences/assertions/probes/rollback/exposure verified clean |
| db-rls-auditor (round 2, artifact v2 `7f271632…`) | verify the two fixes on the re-cut artifact | **pass** — 18/18 `asset_type='other'` confirmed against the live CHECK allow-list; opaque-row strings consistent; line-for-line parity with v1 otherwise (fences, probes, ids unchanged); hash independently recomputed by the orchestrator |
| external (ask_chatgpt_review) | full intake plan pinned to reviewed_input_hash `7f271632…` | **agree / proceed** — risk medium, confidence high, no pushback points, no escalation (review_id `68a54801-6d36-4db2-ba85-74e68b5636cb`, 2026-07-03) |
| security-auditor | **not required** — no storage policy, grant, SECURITY DEFINER, runtime or permission surface touched (data-only inserts + additive object uploads) | n/a |
| PK gate | approve exact upload manifest + SQL artifact hashes | **HARD STOP** |

## 9 · Recommendation

Accept the 18-file set as fenced intake candidates. The kit is technically clean, provably derived from the exact live logo bytes, honestly recorded as a reconstruction, and the apply artifact machine-proves that production selection cannot change. Decisions PK may want to revisit at the gate: (a) the 6 superseded/duplicate raster exports are excluded — override if you want them stored anyway; (b) the editable SVG is included as an editing source with a recorded font dependency.
