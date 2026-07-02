# Result — Asset Intake Backfill — PP Logo + Perth Background Governance (APPLIED)

**Packet:** `docs/briefs/asset-intake-backfill-pp-logo-perth-background-packet.md`
**Apply artifact:** `_harness/asset-intake-backfill-pp-logo-perth-bg-final.sql` · sha256 `57c800d2996a426de684f5a90a528546d50ebfbc717931d5e1bfd682d9bee4ce`
**Applied:** 2026-07-02 14:15:19.977888+00 UTC (2026-07-03 Sydney), project `mbkmaxqhsohbtwsqolns`, run as `postgres` via MCP SQL (service_role holds zero privileges on the table — verified live)
**Status:** ✅ APPLIED + VERIFIED — metadata-additive DML on exactly 2 `c.client_brand_asset` rows; **no render, no publish, no proof event, no enablement, no binding, no platform_safe, no production_proven, no Format Mix claim; commit/push PK-gated separately.**

---

## 1. Gate trail (complete)

1. Discovery packet (read-only; live rows + storage + code + render-log evidence + visual file inspection) → verdict `BLOCKED_NEEDS_PK_RIGHTS_CONFIRMATION` / `BLOCKED_NEEDS_SOURCE_EVIDENCE`.
2. db-rls-auditor pass 1 (draft SQL) → `concerns` (4 low-severity re-cut items, all incorporated).
3. **PK rights confirmation 2026-07-02** (packet §10a): PP logo brand-owned/PK-authorised for ICE publishing; backgrounds licence-free, photographer attribution optional; Perth source unknown → record provenance-incomplete-but-PK-rights-confirmed.
4. Final SQL re-cut (§9d) → db-rls-auditor pass 2 → **PASS** (targeting 1-row each; pre-image byte-identical to live; 26 new keys zero-overlap; resolver provably unchanged; booleans typed; grants verified).
5. External review `ask_chatgpt_review` → `partial` / `escalate_explicit_flag` (`review_id 3c31b162-3ac4-429b-a131-d8afaaf153d0`, `reviewed_input_hash 57c800d2…bee4ce`) — **no concrete defect**; triaged `policy_decision` → PK decision gate.
6. **PK accepted the policy escalation** (provenance may remain honestly incomplete given PK's licence-free confirmation) and, after the pre-apply verification block (hash reprint + HEAD `964f764` parity 0/0 + rows re-verified unchanged), **PK approved the exact full hash** → apply authorized.
7. security-auditor: **n/a** (no SECURITY DEFINER/grant/storage/runtime surface touched).

## 2. What was applied

One `DO $$` transaction, two additive `asset_meta || jsonb_build_object(...)` merges + `updated_at = now()`, each with a `GET DIAGNOSTICS` exactly-1-row assertion:

- **`pp_logo_primary`** (`b7530c55-c320-43be-90d9-98c804694921`): `license_type:'brand_owned_or_pk_authorised'`, `source_type:'internal_brand_asset'`, `license` (brand-owned/PK-authorised, ICE publishing authorised), `attribution_required:false` (boolean), `production_use_allowed:true`, `rights_note` (creation method unrecorded), `rights_confirmed_by:'PK'`, `rights_confirmed_at:'2026-07-02'`, `approval_status:'governed'`, `approved_by:'PK'`, `approved_at:<tx now()>`, `pk_decision:'approve'`, `aspect_ratio:'1:1'`, `width:1024`, `height:1024`, `has_transparency:false`, `background_colour:'#1E2532 solid navy full-bleed'`, `logo_variants_note` (logo_light/logo_dark still deferred), `backfill_lane`, `review_packet`.
- **`bg_perth_cbd`** (`f9caed52-0859-4e22-91f6-7dc998485d77`): `license_type:'licence_free'`, `license` (licence-free PK-confirmed, attribution optional), `attribution_required:false` (boolean), `production_use_allowed:true`, **`provenance_status:'incomplete_pk_rights_confirmed'`** + `rights_note` (source/photographer unrecorded — honestly incomplete), `rights_confirmed_by/at`, `approval_status:'governed'`, `approved_by:'PK'`, `approved_at:<tx now()>`, `pk_decision:'approve'`, `aspect_ratio:'16:9'`, `width:3524`, `height:1982`, `safe_for_text_overlay:'needs_scrim'`, `has_text:false`, `has_people:false`, `scene_type`, `visual_style:'photographic'`, `backfill_lane`, `review_packet`.

**Untouched:** `approved` flag, `is_active`, `asset_url`, `asset_type`, `asset_name`, `platform_scope`, all other rows, all schema/grants/functions/storage.

## 3. Post-apply verification (all PASS, 2026-07-02 UTC)

| Check | Result |
|---|---|
| Rows affected | exactly 2 (DO-block assertions passed; `backfill_lane` marker count across whole table = 2) |
| Boolean typing | `attribution_required` jsonb boolean `false` both rows; `production_use_allowed` boolean; `width` number |
| `approved` / `is_active` | unchanged — `true`/`true` both rows |
| Forbidden claims absent | no `source_url`/`source_site`/`photographer`/`platform_safe`/`production_proven` keys on either row |
| `resolve_brand_assets('property-pulse', ['pp_logo_primary','bg_perth_cbd'])` | post-apply output **identical** to captured pre-apply baseline (2 rows, field-for-field) |
| Rollback artifact | still valid — commented rollback in the SQL file restores the pre-image (verified byte-identical to live immediately pre-apply) + original `updated_at '2026-06-22 07:07:29.550742+00'`; WHERE clauses target exactly the 2 rows |
| Production behaviour | zero change by construction (resolver filters/projects none of the added keys); no render/publish/queue action taken |

## 4. Outcome

All 4 Property Pulse governed assets now meet the same governance metadata standard (license/rights + approval provenance + selection metadata): Sydney/Brisbane (lane-3 intake), and now the PP logo + Perth background (this backfill). The v4.74 grandfathered contradiction — live production consuming rights-unrecorded assets — is closed: future Asset Selection Slice-1 can enforce the fail-closed license rules with **no grandfathering carve-out**.

## 5. Carries (recorded, NOT started)

- Perth provenance upgrade: if the original source is ever identified, replace `provenance_status:'incomplete_pk_rights_confirmed'` with full source evidence (source_url/site/photographer); Option B (§9c replacement intake) remains the standing fallback if PK revisits the risk position.
- Logo `logo_light`/`logo_dark` variants: still deferred to Asset Intake (v4.74 PK decision 2); logo creation method still unrecorded.
- Storage hygiene: orphan `brand-assets/Property_Pulse/Backgrounds/Brisbane_CBD_ Suburbs.jpg` (lane-1 leftover with space in name, unreferenced); `client_brand_profile.logo_storage_path` NULL.
- NDIS Yarns / Care For Welfare / Invegent logo rights confirmations (PK 2026-07-02) recorded in packet §10a as standing context for future backfill lanes — not yet reflected in any DB row.
