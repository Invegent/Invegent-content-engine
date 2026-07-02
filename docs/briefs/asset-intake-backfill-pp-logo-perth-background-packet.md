# Asset Intake Backfill — PP Logo + Perth Background Governance Packet

> **Discovery/packet lane only.** Per PK directive 2026-07-02: no DB mutation, no SQL apply,
> no storage upload, no asset replacement, no render, no proof, no publish, no enablement,
> no binding, no selector build, no commit until PK explicitly approves.
> Draft SQL below is **proposal-only** and contains PK-input placeholders — it is not
> executable as written and MUST NOT be run until re-cut as a final apply packet.

- **Lane:** Asset Intake Backfill — PP Logo + Perth Background Governance
- **Date:** 2026-07-02 Sydney
- **Executor:** Claude Code orchestrator (read-only discovery; docs-only output)
- **Upstream:** `docs/briefs/results/creative-asset-selection-v0-result.md` (v4.74) — PK decision 5:
  "the PP-logo and Perth-background gaps are Asset Intake backfill items."

---

## 1. Preflight Result

**PASS** (2026-07-02):

| Check | Expected | Actual |
|---|---|---|
| branch | main | main ✅ |
| HEAD | == origin/main | `964f764` == `964f764` ✅ |
| ahead/behind | 0/0 | 0/0 ✅ |
| working tree | clean except known scraps | only known untracked scraps (`_harness/`, prior briefs, settings bak) ✅ |
| registers | v4.74 | `00_sync_state.md` head = v4.74 ✅ |

## 2. Current Baseline

- v4.74 (Creative Asset Selection v0 map) complete; no selector build started; no schema/DB/render/proof/publish/binding work started.
- **Material context found this lane:** both target assets are **LIVE PRODUCTION inputs**, not idle rows.
  - v4.00 (B1-v1, image-worker v3.14.1): governed PP `image_quote` production branch consumes `pp_logo_primary` + `bg_perth_cbd` via `resolve_brand_assets`, **fail-loud, no legacy fallback for PP**.
  - v4.05 (B1-v2, image-worker v3.17.0, PROVEN + RELEASED 2026-06-27): deterministic rotation over `[bg_perth_cbd, bg_brisbane_cbd, bg_sydney_cbd]`; `bg_perth_cbd` is rotation index 0 ([b1_production.ts:31](../../supabase/functions/image-worker/b1_production.ts)).
  - Live usage counts (`m.post_render_log`, read-only, 2026-07-02): **17 `creative_library_b1_production` renders, 17 succeeded**; 12 rows reference `bg_perth_cbd`; 23 rows reference `pp_logo_primary`.
- Consequence: **any de-approval (`approved=false` / `is_active=false`) of either row would hard-fail live PP `image_quote` production renders.** All proposals below are metadata-additive only.

## 3. Scope and Non-Goals

**In scope:** document current governance state of the PP primary logo + Perth background; compare with the governed Sydney/Brisbane exemplars; propose the smallest safe backfill; name the rights evidence required.

**Non-goals:** full Asset Registry; schema change (no `background` asset_type enum, no `platform_scope` backfill design); logo_light/logo_dark variant sourcing (deferred to intake per PK decision 2, recorded in §8); selector RPC (Slice-1); any mutation.

## 4. Existing Property Pulse Asset Sources

Client: `property-pulse` = `c.client.client_id 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`.

**`c.client_brand_asset` (all 4 PP rows, read 2026-07-02):**

| asset_key | asset_id | asset_type | created | governed_by | license? | approved |
|---|---|---|---|---|---|---|
| `pp_logo_primary` | `b7530c55-c320-43be-90d9-98c804694921` | logo_primary | 2026-06-22 07:07 | creative-library-v0.1-lane1 | **none** | meta flag `true` |
| `bg_perth_cbd` | `f9caed52-0859-4e22-91f6-7dc998485d77` | other | 2026-06-22 07:07 | creative-library-v0.1-lane1 | **none** | meta flag `true` |
| `bg_sydney_cbd` | `3769be84-8280-4bc1-80e5-141ba44420c8` | other | 2026-06-22 11:34 | creative-library-intake-v0-lane3 | Pexels | `true` + `approved_by:PK` |
| `bg_brisbane_cbd` | `47f489f4-e3a4-4c2f-8ea4-215becbb5c47` | other | 2026-06-22 11:34 | creative-library-intake-v0-lane3 | Pexels | `true` + `approved_by:PK` |

**Structural note:** `c.client_brand_asset` has NO dedicated governance columns — `asset_key`, `usage`, `approved`, license/rights all live in the `asset_meta` jsonb. Dedicated columns: `asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope (array, NULL on all rows), is_active, notes (NULL on all rows), created_at, updated_at`. So the backfill is a **jsonb merge, no DDL**.

**`c.client_brand_profile` (PP):** `brand_logo_url` = the same `PP_logo_2.png` public URL (consistent with the asset row); `logo_storage_path` = **NULL**; `logo_extraction_method` = NULL; brand colours `#1E2532` / `#ECA02D`.

**Storage (`storage.objects`, bucket `brand-assets`):** all 4 referenced objects exist and byte-sizes match the rows. **Housekeeping finding:** an orphan `Property_Pulse/Backgrounds/Brisbane_CBD_ Suburbs.jpg` (note the space; 1,651,130 bytes; uploaded 2026-06-22 05:25 lane-1) is unreferenced by any row — the lane-3 re-sourced Brisbane superseded it. Not in scope to delete; recorded for a future storage-hygiene pass.

**Provenance trail:** `_harness/lane1_pp_assets_dml.sql` (lane-1, 2026-06-22) inserted the logo + Perth rows with `approved:true` **hard-coded in the INSERT payload** — no review packet, no PK approval fields, no license. Its own header says "Sydney/Brisbane DEFERRED (404, not uploaded)" — those two were later re-sourced properly through the lane-3 intake (review packets + PK decision + Pexels licence). **Perth and the logo never went through that intake process.** No Perth review packet exists (`docs/creative-library/intake/review-packets/` contains only Sydney + Brisbane).

## 5. PP Logo Findings

| Field | Value | Evidence |
|---|---|---|
| asset_key / usage | `pp_logo_primary` / `logo` | row meta |
| storage | `brand-assets/Property_Pulse/Logos/PP_logo_2.png` (exists, 237,798 B, uploaded 2026-06-22 05:23) | storage.objects |
| dimensions | **1024×1024 PNG (1:1)** | file fetched + decoded this lane |
| visual | wordmark + house/pulse mark in exact brand colours (#1E2532 navy, #ECA02D amber) on a **solid navy full-bleed background — NOT transparent** | visual inspection this lane |
| approval | `approved:true` (lane-1 flag only — no `approved_by`/`approved_at`/`pk_decision`/`review_packet`/`approval_status`) | row meta vs Sydney meta |
| license / source | **none recorded** — no `source_type`, no `license`, no rights/creation evidence | row meta |
| client assignment | correct (PP `client_id`) | row |
| active | `is_active=true` | row |
| live usage | consumed by every governed PP `image_quote` render (fixed `B1_LOGO_KEY`), 23 render-log references; also `client_brand_profile.brand_logo_url` for all legacy PP paths | sync_state v4.00/v4.05; render_log counts |

**Flags:**
1. **Rights/source metadata missing — requires PK confirmation or source document before production eligibility.** The logo is presumably brand-owned (PP is an Invegent-operated brand and the file matches the locked brand-profile colours), but presumption is not evidence. PK must confirm ownership **and creation method** (in-house designed / commissioned / AI-generated) — creation method affects the rights posture and should be recorded.
2. The **solid (non-transparent) navy background** is a template-compatibility fact worth recording now: on dark templates the logo reads as a navy card. This is adjacent to the deferred `logo_light`/`logo_dark` gap (PK decision 2) — record, do not fix here.
3. `client_brand_profile.logo_storage_path` is NULL while `brand_logo_url` carries the public URL — minor profile-completeness gap, optional to backfill.

**Proposed classification (evidence-supported, pending PK confirmation):** asset role `logo`, usage `logo_primary`, source type `internal_brand_asset` (PK to confirm), client Property Pulse, production suitability **pending until rights/creation are recorded**.

## 6. Perth Background Findings

| Field | Value | Evidence |
|---|---|---|
| asset_key / usage | `bg_perth_cbd` / `background` | row meta |
| storage | `brand-assets/Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg` (exists, 1,232,061 B, uploaded 2026-06-22 05:25) | storage.objects |
| dimensions | **3524×1982 JPEG (≈16:9, 1.778)** | file fetched + decoded this lane |
| visual | aerial/drone: Perth suburbs foreground, Swan River + CBD skyline mid-frame, **large clear-sky band (~top 45%) — strong headline/scrim area**; no visible people; no baked-in text; **no stock-agency watermark** | visual inspection this lane |
| approval | `approved:true` (lane-1 flag only — same gap as the logo) | row meta |
| license / source | **none recorded** — no `source_url`, `source_site`, `photographer`, `license`, `attribution_required` | row meta vs Sydney meta |
| safe_for_text_overlay | **not recorded** (Sydney/Brisbane: `needs_scrim`) | row meta |
| aspect_ratio | not recorded (measured ≈16:9 this lane) | row meta / file |
| client assignment | correct (PP `client_id`) | row |
| live usage | **rotation index 0 (the B1-v1 fixed default)** of the live B1-v2 background rotation; 12 render-log references, 5 as `render_spec.background_key` | b1_production.ts; render_log |
| output-as-input risk | **visually low** — genuine photograph, no ICE layout/scrim/logo artifacts; uploaded 2026-06-22 05:25, before any governed render existed. BUT provenance is unrecorded, so this stays an assessment, not proof. | visual inspection; timestamps |

**Flags:**
1. **Rights/source metadata missing — requires PK confirmation or source document before production eligibility.** The image looks like standard stock drone photography (same genre as the Pexels-sourced Sydney/Brisbane), but there is **no record of where it came from**. Unknown source = fail-closed per v4.74 policy.
2. It skipped the intake review-packet process its two siblings went through (lane-1 direct upload vs lane-3 governed intake).
3. Sub-fields missing that Sydney/Brisbane have: `license`, `source_url`, `source_site`, `photographer`, `attribution_required`, `safe_for_text_overlay`, `aspect_ratio`, `has_text`, `has_people`, `scene_type`, `visual_style`, `approval_status`, `approved_by/at`, `pk_decision`, `review_packet`, `candidate_id`.

**Proposed classification (evidence-supported):** asset role `background`, usage `background`, client Property Pulse, `safe_for_text_overlay: needs_scrim` (orchestrator visual assessment — consistent with both siblings and with how B1 actually renders it under a scrim; PK to ratify), license status **missing**, production eligibility **NOT claimable until source/license evidence exists**.

## 7. Comparison With Sydney / Brisbane Governed Backgrounds

`asset_meta` field-by-field (✅ present / ❌ absent):

| Field | Sydney | Brisbane | **Perth** | **PP logo** |
|---|---|---|---|---|
| asset_key, usage, bucket, source_path, mime, bytes, approved(flag), governed_by | ✅ | ✅ | ✅ | ✅ |
| location | ✅ | ✅ | ✅ | n/a |
| license | ✅ Pexels | ✅ Pexels | ❌ | ❌ |
| source_url / source_site / photographer | ✅ | ✅ | ❌ | ❌ (n/a — needs source_type instead) |
| attribution_required | ✅ false | ✅ false | ❌ | ❌ |
| approval_status (`governed`) | ✅ | ✅ | ❌ | ❌ |
| approved_by / approved_at / pk_decision | ✅ PK | ✅ PK | ❌ | ❌ |
| review_packet | ✅ | ✅ | ❌ | ❌ |
| safe_for_text_overlay | ✅ needs_scrim | ✅ needs_scrim | ❌ | n/a |
| aspect_ratio | ✅ 16:9 | ✅ 16:9 | ❌ (≈16:9 measured) | ❌ (1:1 measured) |
| has_text / has_people | ✅ false/false | ✅ false/false | ❌ | n/a |
| scene_type / visual_style / candidate_id | ✅ | ✅ | ❌ | ❌ |
| platform_scope (column) | ❌ NULL | ❌ NULL | ❌ NULL | ❌ NULL |

Sydney/Brisbane define the house governance standard; Perth + logo carry only the 8 lane-1 bootstrap fields. The `platform_scope` gap is universal (known v4.74 finding, permissive-until-backfilled per PK decision 4) — **not** part of this backfill.

## 8. Governance Gap Summary

1. **Rights vacuum on two live production assets.** `pp_logo_primary` and `bg_perth_cbd` serve every governed PP `image_quote` render (17 successful production renders) with zero recorded license/source/rights evidence.
2. **Approval-flag inflation.** Both carry `approved:true` set mechanically by lane-1 DML — indistinguishable, to `resolve_brand_assets` and to any future selector, from Sydney/Brisbane's PK-decided approval. The flag currently encodes two different levels of assurance.
3. **Policy tension (the key PK question).** v4.74 fail-closed policy says unknown license = STOP; these two assets pre-date the policy and are grandfathered into live production. Left unresolved, Asset Selection Slice-1 faces a contradiction on day one: strictly applied, it would refuse the two assets production currently depends on.
4. **Missing selection metadata.** Perth lacks `safe_for_text_overlay`/`aspect_ratio` (Slice-1 ranking inputs); the logo lacks variant/transparency facts (`logo_light`/`logo_dark` deferred-to-intake gap, PK decision 2).
5. **Minor:** orphan lane-1 Brisbane storage object; `client_brand_profile.logo_storage_path` NULL.

## 9. Proposed Backfill Changes

**Outcome model: Outcome 1 (metadata-only update to the 2 existing rows) — additive jsonb merge, no DDL, no new rows, no storage change, no `approved`/`is_active` flip.** Structured so the always-safe evidence fields are separable from the PK-dependent rights fields.

> **SUPERSEDED DRAFTS:** §9a/§9b below are the original placeholder drafts, retained for the record.
> PK supplied the Tier-2 rights inputs on 2026-07-02 (§10a); the **FINAL apply SQL is §9d** —
> that text (and only that text) is what the review chain and any future apply run against.

### 9a. PP logo — `b7530c55-c320-43be-90d9-98c804694921`

*Tier 1 — factual fields (evidence gathered this lane, appliable once PK approves the packet):*
`aspect_ratio:"1:1"`, `width:1024`, `height:1024`, `has_transparency:false`, `background_colour:"#1E2532 (solid navy full-bleed)"`, `usage:"logo"` (already present), `backfill_lane:"asset-intake-backfill-pp-v1"`.

*Tier 2 — rights fields (BLOCKED until PK confirms; exact values PK-supplied):*
`source_type` (proposed `internal_brand_asset`), `creation_method` (in_house / commissioned / ai_generated — PK to state), `license` (e.g. `brand-owned — Property Pulse (Invegent)`), `rights_confirmed_by:"PK"`, `rights_confirmed_at:<ISO>`, `approval_status:"governed"`, `approved_by:"PK"`, `approved_at:<ISO>`, `pk_decision:"approve"`.

```sql
-- DRAFT — DO NOT RUN. Tier-2 values are placeholders pending PK confirmation.
UPDATE c.client_brand_asset
SET asset_meta = asset_meta || jsonb_build_object(
      'aspect_ratio','1:1', 'width',1024, 'height',1024,
      'has_transparency',false, 'background_colour','#1E2532 solid navy full-bleed',
      'backfill_lane','asset-intake-backfill-pp-v1',
      -- Tier 2 (PK-gated):
      'source_type','<PK_CONFIRM: internal_brand_asset>',
      'creation_method','<PK_CONFIRM: in_house|commissioned|ai_generated>',
      'license','<PK_CONFIRM: brand-owned — Property Pulse (Invegent)>',
      'rights_confirmed_by','PK', 'rights_confirmed_at','<ISO>',
      'approval_status','governed', 'approved_by','PK', 'approved_at','<ISO>',
      'pk_decision','approve'
    ),
    updated_at = now()
WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
  AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'asset_key' = 'pp_logo_primary';   -- expect exactly 1 row
```

### 9b. Perth background — `f9caed52-0859-4e22-91f6-7dc998485d77`

*Tier 1 — factual fields:* `aspect_ratio:"16:9"`, `width:3524`, `height:1982`, `safe_for_text_overlay:"needs_scrim"` (orchestrator visual assessment, PK to ratify), `has_text:false`, `has_people:false`, `scene_type:"suburbs-river-cityscape (aerial)"`, `visual_style:"photographic"`, `backfill_lane:"asset-intake-backfill-pp-v1"`.

*Tier 2 — rights fields (BLOCKED until source evidence exists):* `license`, `source_url`, `source_site`, `photographer`, `attribution_required`, `approval_status:"governed"`, `approved_by/at`, `pk_decision`, `review_packet` (a Perth review packet should be authored at that point, mirroring the Sydney/Brisbane format).

```sql
-- DRAFT — DO NOT RUN. Tier-2 values are placeholders pending source evidence.
UPDATE c.client_brand_asset
SET asset_meta = asset_meta || jsonb_build_object(
      'aspect_ratio','16:9', 'width',3524, 'height',1982,
      'safe_for_text_overlay','needs_scrim', 'has_text',false, 'has_people',false,
      'scene_type','suburbs-river-cityscape (aerial)', 'visual_style','photographic',
      'backfill_lane','asset-intake-backfill-pp-v1',
      -- Tier 2 (source-evidence-gated):
      'license','<SOURCE_EVIDENCE_REQUIRED>', 'source_url','<SOURCE_EVIDENCE_REQUIRED>',
      'source_site','<SOURCE_EVIDENCE_REQUIRED>', 'photographer','<SOURCE_EVIDENCE_REQUIRED>',
      'attribution_required',<SOURCE_EVIDENCE_REQUIRED: true|false — MUST be an unquoted jsonb boolean, per db-rls-auditor; Sydney/Brisbane carry boolean false>,
      'approval_status','governed', 'approved_by','PK', 'approved_at','<ISO>',
      'pk_decision','approve',
      'review_packet','docs/creative-library/intake/review-packets/property-pulse-bg-perth-cbd.review.md'
    ),
    updated_at = now()
WHERE asset_id = 'f9caed52-0859-4e22-91f6-7dc998485d77'
  AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'asset_key' = 'bg_perth_cbd';   -- expect exactly 1 row
```

### 9c. Perth Option B — replace-under-same-key (if source cannot be established)

If PK cannot identify the Perth file's source, the file itself can never become production-eligible under the fail-closed policy. The clean remediation is then a **lane-3-style intake for a NEW, properly-licensed Perth image** (review packet → PK approval → download under licence → upload → update the same `bg_perth_cbd` row's `asset_url`/`source_path`/meta). Same asset_key = zero code change to B1 rotation; but it **visibly changes live production renders** → PK visual gate + external review required. **Not proposed for apply here — recorded as the fallback path.**

### 9d. FINAL APPLY SQL (v1 — re-cut 2026-07-02 with PK-supplied rights values)

- **Artifact:** `_harness/asset-intake-backfill-pp-logo-perth-bg-final.sql` (byte-exact apply text; the fenced content below and this section describe it).
- **`sha256(final SQL file)` = `57c800d2996a426de684f5a90a528546d50ebfbc717931d5e1bfd682d9bee4ce`** — the review chain's `reviewed_input_hash` must equal this; any edit to the SQL stales every review.
- Shape: one `DO $$` block (single transaction) → two additive `jsonb_build_object` merges (logo `b7530c55…`, Perth `f9caed52…`), each followed by `GET DIAGNOSTICS` asserting **exactly 1 matched row** (raises + aborts the whole apply otherwise); `updated_at = now()` explicit (no triggers on the table).
- Auditor must-fix items incorporated: `attribution_required`, `has_transparency`, `has_text`, `has_people`, `production_use_allowed` are **unquoted jsonb booleans**; `width`/`height` numeric; apply-as-`postgres` and single-transaction assertions are in the file header; rollback (commented in the same file) restores the §14 pre-image **and** the original `updated_at = '2026-06-22 07:07:29.550742+00'`.
- Key values (per PK direction §10a): logo — `license_type:'brand_owned_or_pk_authorised'`, `source_type:'internal_brand_asset'`, `attribution_required:false`, `production_use_allowed:true`, rights_note incl. "creation method unrecorded", `logo_variants_note` (variants still deferred); Perth — `license_type:'licence_free'`, `attribution_required:false`, `production_use_allowed:true`, `provenance_status:'incomplete_pk_rights_confirmed'`, `safe_for_text_overlay:'needs_scrim'` preserved, rights_note recording provenance-incomplete-but-PK-rights-confirmed. Both: `approval_status:'governed'`, `approved_by:'PK'`, `approved_at: now()` (stamped at apply), `pk_decision:'approve'`, `rights_confirmed_by:'PK'`, `rights_confirmed_at:'2026-07-02'`, `review_packet:` this packet. No key overlaps the pre-existing meta; `approved`/`is_active`/`asset_url`/`asset_type` untouched → resolver output for the B1 keys provably unchanged.

### Explicitly NOT proposed

- No `approved`/`is_active` flip in either direction (de-approval breaks live fail-loud production; the flags already read `true`).
- No new rows, no storage writes, no `asset_type` change (`other` → `background` enum design is a schema question for the Asset Registry, not this backfill), no `platform_scope` backfill, no logo variant sourcing, no profile `logo_storage_path` fix (optional follow-up, separate).

## 10. Rights / Licensing Evidence Required

**PP logo — rights/source metadata missing — requires PK confirmation or source document before production eligibility.** PK to confirm: (1) Property Pulse/Invegent owns the mark; (2) creation method (in-house / commissioned — if commissioned, that the deliverable rights were assigned; if AI-generated, which tool, for the record); (3) exact `license` wording to record.

**Perth background — rights/source metadata missing — requires source evidence before production eligibility.** Needed: original source (URL/site/photographer) + licence terms — e.g. the Pexels/Unsplash page if it was stock-sourced like its siblings, or the photographer/agreement if commissioned. If PK can name the source, Tier 2 unblocks; if not, Option B (9c) is the path. **Do not invent rights: until evidence exists the asset must remain NOT production-eligible under the selection policy, even though it is currently rendering in production (see §11).**

### 10a. PK rights confirmation — RECEIVED 2026-07-02

PK confirmed (recorded verbatim in scope):

1. The **Property Pulse logo** is owned/controlled by PK/Invegent and authorised for ICE-generated publishing across external platforms. *(PK also confirmed the same for the NDIS Yarns, Care For Welfare, and Invegent logos — recorded here as standing context for FUTURE backfill lanes; NOT acted on in this lane.)*
2. **Relevant background images are licence-free for use, with photographer attribution optional, not mandatory** — applied in this lane to `bg_perth_cbd` only.

Scope of this lane's application: `pp_logo_primary` + `bg_perth_cbd` only. Perth's exact photographer/source remains unknown → recorded as **provenance incomplete but PK rights-confirmed** (`provenance_status:'incomplete_pk_rights_confirmed'`), per PK direction. Logo creation method remains unrecorded (noted in `rights_note`); `logo_light`/`logo_dark` variants remain deferred to Asset Intake (v4.74 PK decision 2). This confirmation unblocks §9d Tier-2 values; the **apply itself remains a PK hard stop**.

## 11. Production Eligibility Impact

- **Today (before backfill):** under strict v4.74 rules, only Sydney + Brisbane are production-eligible. Yet live B1-v2 production consumes Perth (rotation index 0) and the logo (every render) — a **grandfathered contradiction**, surfaced here as required, not worked around.
- **This packet does not change production.** Metadata-additive updates alter nothing `resolve_brand_assets` returns for the B1 keys (it projects fixed meta fields: asset_key, bucket, source_path, usage, location, approved) and flip no flags. Zero render behaviour change.
- **After Tier 2 completes (PK rights + Perth source):** all 4 PP assets reach the Sydney/Brisbane governance standard; Slice-1 can enforce fail-closed with no grandfathering carve-out.
- **If Perth Tier 2 cannot complete:** PK decision required between (a) Option B replacement, (b) removing Perth from the B1 rotation (code change, separate lane), or (c) an explicit, recorded PK risk-acceptance grandfathering it. **This packet recommends (a) and makes no eligibility claim meanwhile.**

## 12. Asset Selection Impact

- Slice-1 (`Background.source` + `Logo.source` + `Scrim.opacity`) gains: Perth `safe_for_text_overlay` → `Scrim.opacity` mapping input; aspect/dimension fields for the size/aspect filter; rights fields for filter step 2 (license present · valid · unexpired).
- The two-assurance-level `approved` flag is resolved by `approval_status:'governed'` + `approved_by` presence — giving Slice-1 a queryable distinction between PK-governed approval and bootstrap flags **without** any schema change or flag flip.
- Logo `has_transparency:false` + solid-navy facts feed the deferred logo-variant decision (PK decision 2: record missing `logo_light`/`logo_dark` — this packet records the underlying facts).
- No policy relaxation anywhere: fail-closed triggers (unknown/expired license, wrong client, missing release, unsafe, output-as-input) all preserved.

## 13. Review Requirements

| Review | When | Status |
|---|---|---|
| `db-rls-auditor` | on the proposed backfill SQL (target rows, blast radius, RLS/grants/caller implications, rollback) | **RUN 2026-07-02 — verdict `concerns` (low-severity re-cut items only; nothing blocks PK review). See 13a.** |
| `security-auditor` | only if SECURITY DEFINER/grants/storage-policy/secrets touched — **not triggered** (jsonb DML on 2 rows; `resolve_brand_assets` untouched) | n/a unless scope changes |
| `ask_chatgpt_review` (external) | on the **final** apply packet once PK supplies Tier-2 values (placeholders make the current SQL unreviewable as a final diff; `reviewed_input_hash` must be cut on the finalized SQL) | **RUN 2026-07-02 on §9d — verdict `partial` / escalate-to-PK (policy, not defect). See 13b.** |
| PK gate | apply is a HARD STOP — PK reviews this packet, supplies rights confirmations/source evidence, then approves the exact final SQL | pending |

### 13a. db-rls-auditor findings (2026-07-02, read-only, project `mbkmaxqhsohbtwsqolns`)

**Verdict: `concerns` — no high-severity findings; low-severity re-cut items only.**

Confirmed clean:
- **Targeting:** each §9 WHERE clause matches exactly 1 live row (triple-keyed asset_id + client_id + asset_key, verified live).
- **Pre-image:** §14 rollback payload is byte-identical to the live `asset_meta` of both rows (logo 8 keys, Perth 9 keys); neither row updated since insert (2026-06-22 07:07).
- **Additivity:** zero overlap between proposed keys and existing meta — pure top-level jsonb merge, no clobber of `asset_key`/`bucket`/`source_path`/`usage`/`location`/`approved`.
- **Blast radius:** `public.resolve_brand_assets` (the ONLY DB function referencing the table; no dependent views; no worker/dashboard code reads `asset_meta` directly — all access via the RPC) filters/projects none of the added keys → **zero production impact**.
- **Grants/RLS:** table grants = postgres ALL + inspector_ro SELECT only; anon/authenticated/service_role hold nothing; schema `c` not REST-exposed; RLS-off acceptable (unreachable except via the service_role-gated SECURITY DEFINER RPC). No advisor finding touches either object.
- **Triggers:** none — the explicit `updated_at = now()` is necessary and correct; no side-effects for rollback.
- **Migration discipline:** agrees with PK-run DML (data-only, 2 rows, env-specific UUIDs) rather than a migration.

Must-fix at final re-cut (before apply):
1. `attribution_required` (and all boolean keys) must be **unquoted jsonb booleans** in the final `jsonb_build_object` — as drafted the placeholder would store a string, breaking type parity with the Sydney/Brisbane exemplars (§9b annotated accordingly).
2. Re-run db-rls-auditor + external review on the **finalized** SQL (placeholders resolved, `reviewed_input_hash` cut on the final text). Draft as written must never be executed.
3. **Apply must run as `postgres`** (SQL editor / MCP) — `service_role` has no UPDATE grant on the table — in a single transaction with a 1-row-per-statement assertion (abort on 0 or >1).
4. Optional: rollback statement should also restore `updated_at = '2026-06-22 07:07:29.550742+00'` (same value both rows) if byte-exact reversal is desired.

**FINAL-SQL RE-AUDIT (2026-07-02, second db-rls-auditor pass on §9d): verdict `PASS`.** All 4 must-fix items verified incorporated (7 booleans unquoted with live type-parity check vs Sydney/Brisbane; DO-block single transaction with 1-row RAISE assertions; apply-as-postgres verified against live grants — service_role holds ZERO privileges on the table, so postgres is mandatory not optional; rollback restores pre-image + original `updated_at`, both payloads verified byte-identical to live). Live `?`-operator check: all 26 new keys vs both rows = zero overlap. `resolve_brand_assets` baseline (2 rows) captured pre-apply for the §14 readback. `now()` serializes to the exact ISO-8601 jsonb format of the exemplar `approved_at`. Informational only: `rights_confirmed_at` is date-only vs full-timestamp `approved_at` (new key, no exemplar — accepted). Blast radius re-verified unchanged (no triggers/views/other readers; advisors clean on both objects). Procedural: audit is valid only for file sha256 `57c800d2996a426de684f5a90a528546d50ebfbc717931d5e1bfd682d9bee4ce` (orchestrator re-confirmed the hash post-audit).

### 13b. External review (`ask_chatgpt_review`, 2026-07-02) — on §9d FINAL SQL

- **`review_id`:** `3c31b162-3ac4-429b-a131-d8afaaf153d0` · **`reviewed_input_hash`:** `57c800d2996a426de684f5a90a528546d50ebfbc717931d5e1bfd682d9bee4ce` (== current file hash; review valid for this exact SQL only)
- **Verdict:** `partial` · risk `medium` · confidence `high` · **decision `escalate_explicit_flag` (requires PK)** → per contract, non-clean = STOP → surfaced to PK. **Apply may not proceed on this review alone; PK's explicit decision is the gate.**
- **What it verified:** the transaction is additive and follows the governance standard set by the exemplar assets; live usage confirms both assets are integral to production renders.
- **Objections (no `concrete_defect` raised):** (1) legal implications of recording rights on a `provenance incomplete` asset need PK's final confirmation; (2) whether the metadata amendments could later force removal of in-use assets on governance grounds; (3) provenance-incomplete status should be re-evaluated in ongoing governance, not treated as settled once recorded.
- **Mandatory triage classification:** `policy_decision` (primary — the rights posture for a provenance-incomplete asset is PK's judgment call, not a defect; PK pre-decided this direction in §10a, and PK's apply approval constitutes the final confirmation the reviewer asks for) · `structural_DDL_DML_escalation` (secondary — production DML, already routed to the PK hard stop by design).
- **Routing:** `policy_decision` → **PK decision gate**. Orchestrator addition responsive to objection (3): if PK later learns the Perth source, a follow-up metadata update should replace `provenance_status:'incomplete_pk_rights_confirmed'` with full source evidence; and Option B (§9c) remains the standing fallback if PK ever revisits the risk position.

### 13c. security-auditor

**Not triggered — recorded n/a with reason:** the final SQL touches no SECURITY DEFINER function, no grants, no `ALTER FUNCTION`, no storage policy, no secret/runtime surface — it is 2-row jsonb DML on a table whose only reader (`resolve_brand_assets`) is untouched and whose output is provably unchanged. Both db-rls-auditor passes confirmed no grant/RLS/exposure delta and clean security advisors on both objects.

## 14. Apply / Rollback Plan (if applicable)

**Apply (future, PK-gated):** re-cut §9 SQL with PK-supplied Tier-2 values (no placeholders; booleans unquoted per 13a) → `db-rls-auditor` re-confirm + external review on the final SQL → PK approves → PK-run (or PK-authorized) execution **as `postgres`** in a single transaction with 1-row-per-statement assertions → readback verify (2 rows, expected keys present, `approved`/`is_active` unchanged, `resolve_brand_assets('property-pulse', array['pp_logo_primary','bg_perth_cbd'])` returns identical rows to pre-apply) → result doc.

**Rollback:** restore the captured pre-image `asset_meta` (full pre-apply values recorded below), or strip the added keys with jsonb `-` operators. Rollback is metadata-only; production render behaviour is unaffected in both directions.

Pre-image (verbatim, read 2026-07-02 — this is the rollback payload):

```json
// pp_logo_primary (b7530c55-c320-43be-90d9-98c804694921)
{"mime":"image/png","bytes":237798,"usage":"logo","bucket":"brand-assets","approved":true,"asset_key":"pp_logo_primary","governed_by":"creative-library-v0.1-lane1","source_path":"Property_Pulse/Logos/PP_logo_2.png"}
// bg_perth_cbd (f9caed52-0859-4e22-91f6-7dc998485d77)
{"mime":"image/jpeg","bytes":1232061,"usage":"background","bucket":"brand-assets","approved":true,"location":"Perth","asset_key":"bg_perth_cbd","governed_by":"creative-library-v0.1-lane1","source_path":"Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg"}
```

## 15. Final Verdict

**Packet-level: `READY_FOR_PK_REVIEW`** (updated 2026-07-02 after PK rights input + full review chain).

Progression:
1. *Discovery pass:* `BLOCKED_NEEDS_PK_RIGHTS_CONFIRMATION` (logo) / `BLOCKED_NEEDS_SOURCE_EVIDENCE` (Perth) — per directive §6 Outcome 3.
2. *2026-07-02:* PK supplied the rights confirmation (§10a) → final SQL re-cut (§9d, sha256 `57c800d2…bee4ce`).
3. *Review chain complete:* db-rls-auditor **PASS** on the final SQL (§13a) · external review **`partial` → escalated to PK** (`policy_decision`, no concrete defect — §13b) · security-auditor **n/a** (§13c).

**What PK now decides (the apply hard stop):**
- Confirm the external reviewer's escalation point: recording `provenance_status:'incomplete_pk_rights_confirmed'` on `bg_perth_cbd` is an accepted standing rights posture (PK's §10a direction, re-affirmed at the apply gate), with Option B (§9c) as the standing fallback and full source evidence as the preferred future upgrade.
- Approve (or reject) the exact §9d SQL for a **PK-run apply as `postgres`**.
- Commit of this packet + the SQL artifact remains PK-gated separately.

**Nothing has been mutated:** no DB write, no storage change, no render, no publish, no commit. Outputs of this lane: this packet + `_harness/asset-intake-backfill-pp-logo-perth-bg-final.sql`.
