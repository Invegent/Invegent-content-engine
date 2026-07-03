# PP Logo Variant Promotion v0 — Gate Packet

> **Lane:** `pp-logo-variant-promotion-v0` · **Date:** 2026-07-04 (Sydney) · **Status:** ✅ APPLIED + VERIFIED (PK-approved 2026-07-04)
>
> **Apply record (2026-07-04, PK approval given in-session against artifact sha `6c1a97d6…`):** hash re-verified immediately pre-apply; artifact executed as one transaction via MCP `execute_sql`; assertions A1–A4 and probes P1/P1b/P2/P3 all passed in-transaction; COMMIT clean. **Independent post-apply re-probe:** promoted_governed=7 (full governed state, `approved_at` stamped, all intake provenance incl. sha256 intact) · held_fenced=11 · `resolve_brand_assets` over primary+7 keys = 8 rows · `resolve_slot_assets` status=ok, **Logo pick unchanged = `b7530c55…` (live pp_logo_primary)**, rejected Logo entries = 4 (the held alternate-size PNGs, down from 11) · `brand_logo_url` untouched (still PP_logo_2.png). Exactly the predicted post-state. Rollback remains standing. Register reconciliation/commit: pending PK instruction.
> **Client:** Property Pulse (`property-pulse`, client_id `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
> **Predecessor:** `pp-logo-variant-intake-v0` (registers v4.87, commit `3fdab33`) — 18 verified logo-kit files intaken as fenced candidates.

---

## 1 · What this gate decides

Promote **7 of the 18** fenced intake candidates to **governed/eligible** status; the other **11 stay fenced**. Per promoted row: `asset_meta.approved=true` · `approval_status='governed'` · `production_use_allowed=true` · `is_active=true` · `platform_scope={facebook,instagram,linkedin}` (Batch-1 backfill precedent) · `approved_by='PK'` + timestamp + promotion provenance keys.

## 2 · What promotion actually changes (and provably does NOT)

- **Production renders: unchanged.** ICE image/video workers read the logo from `c.client_brand_profile.brand_logo_url` — verified live 2026-07-04: still `…/Property_Pulse/Logos/PP_logo_2.png`. This lane never touches that column. No render output can change.
- **Resolver Logo pick: unchanged by construction.** `resolve_slot_assets` picks the FIRST eligible logo by `(created_at ASC, asset_id ASC)`. The live `pp_logo_primary` (`b7530c55…`, created 2026-06-22) is strictly older than every candidate (all created 2026-07-03 13:30:56). Promoted variants become **eligible alternatives, never the pick** while the primary is active. This is machine-enforced: assertion **A4** aborts the transaction if any promotion target is not strictly newer than the primary, and probe **P3** re-runs the live-template selection and aborts on any pick change.
- **What DOES change:** the 7 promoted variants (a) resolve via `resolve_brand_assets` for their keys, and (b) join the eligible-logo pool of the dark decision spine (`select_template` → `resolve_slot_assets` — zero runtime callers today). This is the intended payoff: future template/slot-level logo selection (e.g. white-on-scrim vs boxed badge) has governed variants ready without another gate.
- **Ordering consequence recorded:** if PK ever deactivates the primary, the next deterministic pick becomes `pp_logo_master_png_1024` (`c3a20009…`, lowest asset_id among promoted) — the white/gold transparent master, a sensible successor. The 4 held alternate-size PNGs would follow it before anything else could be picked.

## 3 · Proposed promotion set

### Promote (7)

| asset_id | asset_key | role |
|---|---|---|
| `c3a20009-9c4e…` | `pp_logo_master_png_1024` | master white_gold transparent — dark backgrounds |
| `c3a20011-9c4e…` | `pp_logo_full_colour_png_1024` | navy_gold transparent — light backgrounds |
| `c3a20012-9c4e…` | `pp_logo_white_png_1024` | white mono transparent — dark/photo backgrounds |
| `c3a20013-9c4e…` | `pp_logo_dark_png_1024` | navy mono transparent — light backgrounds |
| `c3a20014-9c4e…` | `pp_logo_mark_only_png_512` | compact mark — badges/small placements |
| `c3a20017-9c4e…` | `pp_logo_square_navy_bg_png_1024` | boxed navy badge — profile/corner box |
| `c3a20018-9c4e…` | `pp_logo_watermark_white_png` | white watermark — reduced-opacity corner use |

Rationale: one governed variant per distinct visual role, at the most useful size. Every file passed intake verification (true alpha, exact palette, identity match vs the live logo) and is viewable now at `https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/<filename>`.

### Hold — stay fenced (11)

| asset_key | why held |
|---|---|
| `pp_logo_master_png_512` / `pp_logo_master_png_2048` / `pp_logo_mark_only_png_1024` / `pp_logo_square_navy_bg_png_512` | alternate sizes — promote on demand |
| all 7 SVGs (`pp_logo_master_svg`, `pp_logo_master_editable_svg`, `pp_logo_full_colour_svg`, `pp_logo_white_svg`, `pp_logo_dark_svg`, `pp_logo_mark_only_svg`, `pp_logo_mark_only_dark_svg`) | vector source-of-truth / editing sources (`usage='logo_vector_source'` — outside the resolver by construction); render pipeline consumes PNG |

## 4 · The artifact (NOT applied)

- **File:** `_harness/pp_logo_variant_promotion_v0/promote_pp_logo_variants_v0.sql`
  **sha256 `6c1a97d6126c2da43aba3216cc1851c598cbe26dc40290593b969f5f7ee6869c`**
- **Shape:** 0 DDL / **one UPDATE touching exactly 7 rows**, single transaction.
- **Fail-closed assertions:** A1 client identity · A2 all 7 targets in the exact fenced intake pre-state (including `platform_scope IS NULL`) · A3 live primary intact · **A4 primary strictly oldest** (selection-order invariant precondition).
- **In-transaction probes:** P1 exactly 7 rows in full governed state · P1b the 11 held rows still fully fenced · P2 `resolve_brand_assets` across all 19 keys returns **exactly 8** (primary + 7 promoted) · P3 live-template `resolve_slot_assets`: status ok, **Logo pick unchanged = primary**, rejected Logo entries exactly **4 × `inactive`** (the held alternate-size PNGs; was 11 pre-promotion).
- **Meta patch per row:** promotion keys only (`approved/approval_status/production_use_allowed/approved_at/approved_by/pk_decision/promotion_lane/promotion_packet/governed_by`) — all intake provenance (sha256, source, source_limitations, licence, visual verification) is preserved untouched.

## 5 · Rollback

`_harness/pp_logo_variant_promotion_v0/rollback_pp_logo_variants_v0.sql` — **sha256 `e5561d5c74de307cec0d40cd8fc89c0d97002e975127304294ed77be244bcf62`**. One UPDATE restoring the 7 rows to the exact intake fences (strips every promotion-added key, restores the intake `pk_decision` string, `platform_scope→NULL`, `is_active→false`), then asserts full restoration + primary intact. Held rows and primary are never touched by either artifact.

## 6 · Known warning state (disclosure, not a change)

`pp_logo_primary` itself has `platform_scope=NULL`, so PP resolver calls already emit the once-per-call `platform_scope_unbacked` warning today (Batch 1 backfilled only the 3 backgrounds). Promoting these 7 with explicit scope does not clear that; backfilling the primary's scope is a separate optional micro-lane if PK wants the warning gone.

## 7 · Boundaries

No DDL · no INSERT/DELETE · no change to `pp_logo_primary` or `brand_logo_url` · no render/publish/runtime/dashboard/Format Mix/selector-logic change · no template binding · held rows untouched. Promotion makes variants *available* to the dark decision spine; nothing starts consuming them.

## 8 · Review chain

| Review | Scope | Verdict |
|---|---|---|
| db-rls-auditor | UPDATE semantics, assertion/probe correctness vs live schema, selection-order proof | **pass — zero must-fix** (2026-07-04): independently re-derived every assertion and both probe expectations against live state + actual function bodies (A2/A3/A4 hold now; P2 will be exactly 8; P3 will be ok/primary/4×inactive); UPDATE blast radius = the 7 PK-listed rows only; 3 low informational findings (rollback `updated_at=now()` cosmetic · pre-existing primary `platform_scope_unbacked` warning [§6] · P3 live-state dependency acceptable because fail-closed). Verdict bound to hashes `6c1a97d6…`/`e5561d5c…` — any edit invalidates it |
| external (ask_chatgpt_review) | full promotion plan pinned to reviewed_input_hash `6c1a97d6…` | **agree / proceed** — risk low, confidence high, zero pushback, no escalation (review_id `7da27751-0b59-4e7e-a260-de0f31a34350`, 2026-07-04). Its two noted assumptions (A2 pre-state, A4 ordering-abort behaviour) are exactly what the db-rls-auditor verified live |
| security-auditor | not required — no grant/policy/DEFINER/runtime surface | n/a |
| PK gate | approve exact artifact hash | **HARD STOP** |

## 9 · PK decision points

1. **Set composition** — the 7/11 split above is a recommendation; any candidate can be moved between lists (artifact re-cut + re-review on change).
2. **platform_scope value** — `{facebook,instagram,linkedin}` mirrors Batch 1; widen/narrow if desired.
3. **Optional follow-up (separate micro-lane):** backfill `platform_scope` on `pp_logo_primary` to clear the standing `platform_scope_unbacked` warning.
