# Slice B — Governed B-roll Consumption v1 · T3 APPLY PACKET (pre-freeze)

**Date:** 2026-07-28 · **Tier:** T3 · **Client:** Property Pulse · **Format:** `video_short_stat` · **Proof platform:** `NULL` (production signature)
**Posture:** CONTAINED PROOF via `variant_intent`. Additive; PP default selection unchanged. Containment is TWO-fold and verified: (1) the template has **NO platform_suitability row**, so it is selectable ONLY at `p_platform=null` and is rejected `platform_unsuitable` at every explicit platform — it can never become the sole selectable at youtube; (2) at `p_platform=null` its `fit_status='candidate'` ranks BELOW the strong incumbents on a no-intent call. The proof forces it with `p_variant_intent`.
**Status:** DRAFT — not reviewed, not frozen, NOT applied. Apply is a PK HARD STOP.

## Artifacts
| File | Role | Apply |
|---|---|---|
| `01_resolve_slot_assets_v1_3_broll_background.sql` | Migration A (DDL) — scoped resolver, 4 anchors | `apply_migration name=resolve_slot_assets_v1_3_broll_background` |
| `02_promote_and_register_broll_slice_b.sql` | Migration B (DML) — CAS promotion + additive registration | `apply_migration name=broll_consumption_v1_slice_b_promote_register` |
| `01_ROLLBACK_resolve_slot_assets_v1_2.sql` | rollback A (verbatim v1.2 body) | on unwind |
| `02_ROLLBACK_promote_and_register_broll_slice_b.sql` | rollback B (delete rows + refence clip) | on unwind |

## Apply order (PK gate)
1. **Migration A** (resolver v1.3). 2. **Migration B** (promotion + registration). Order is safe either way, but A→B keeps the broll selectable-path complete before the registration is proven.

## What each migration does
- **A — resolver v1.3:** admits `usage='broll_background'` **only** when the template's Background field is `element_type='video'` (`v_bg_is_video`), routing it through the Background slot + the same text-safety gate. Four anchors (DECLARE / needs-SELECT / client-asset WHERE / three `asset_usage` sites). Shared-pool loop byte-identical. **Leak-free:** zero existing background field is video-typed, so no other template/client can pull the mp4.
- **B — promotion + registration:** CAS-guarded flip of clip `2d62b04e` to `is_active=true` / `approved=true` / `approval_status=governed` / `production_use_allowed=true` / **`safe_for_text_overlay='needs_scrim'`** (mandatory normalisation), with in-txn eligibility + pool-neutrality assertions (fail-closed). Then registers template `46c5c4ac` (provider_template `visually_approved` · Background **video** field + Logo + text fields · variant `stat-reveal-9x16-broll-v1` `fit_status='candidate'` · **NO platform_suitability row** [deliberate — see containment] · ONE PP assignment `visually_approved` · a `visual_approval/passed` proof_event citing the Slice A PK visual gate).

## Post-apply PROOF (read-only + one render → PK visual gate)
1. `SELECT public.select_template('property-pulse', NULL, 'video_short_stat', 'stat-reveal-9x16-broll-v1', '<seed>');`
   — **platform NULL** (mirrors the production video call at `index.ts:1231`) + the variant intent. Assert `winner.provider_template_id = 46c5c4ac…` AND `slot_resolution.modifications->>'Background.source'` = the clip's public URL AND **no asset-ID literal** anywhere (selection is resolver-driven). Also assert the **no-intent** control `select_template('property-pulse', NULL, 'video_short_stat', NULL, '<seed>')` still returns an **incumbent** (proves default selection is unchanged).
2. Render template `46c5c4ac` with the resolver-returned `modifications` (Background.source/Logo.source/Scrim.opacity + text) → confirm the auto-selected composite renders → **PK visual gate**.
3. `deploy-verifier` not required (no EF deploy in this packet — DB-only). If the worker path is later exercised, video-worker is unchanged (Option-B binding already live).

## Must-fixes (all closed in the SQL)
1. ✅ Text-safety normalised to `needs_scrim` in the promotion. 2. ✅ All four resolver anchors changed. 3. ✅ Containment corrected: NO platform_suitability row → template selectable only at `p_platform=null`; proof uses `platform=null`+intent; no youtube default-win path. 4. ✅ Exactly one PP assignment row.

## Risks (from the audit) + mitigations
- **broll→image-bg leak:** mitigated by the `element_type='video'` scope (no existing video-typed bg field). **silent fail-closed on text-safety:** fixed by the `needs_scrim` normalisation. **default-win / autonomous-publish:** ELIMINATED — with no suitability row the template is rejected at every explicit platform (`no_suitability_row_for_platform`) and only reachable at `p_platform=null`, where `candidate` ranks below the strong incumbents on the production no-intent call; the audit's youtube default-win gap cannot arise. Verified: the only production `select_template` video caller (`video-worker/index.ts:1231`, smoke `:1417`) passes `p_platform=null`, `p_variant_intent=null`. **resolver ACL/search_path:** `CREATE OR REPLACE` preserves ACL + `search_path=''`; no regrant. **label_constraint (national-only):** content-governance flag — pair the proof with a generic national stat, never a Perth label.
- **Carry (future):** if PP ever adds a per-platform youtube `video_short_stat` render, a youtube suitability row for THIS template would be needed and MUST be paired with an intent-pinned caller or an incumbent youtube row — revisit containment then. Not in scope now.

## Gate chain
Freeze SQL → **db-rls-auditor on the concrete SQL (this packet)** → **apply-harness-auditor (shadow)** → **external review pinned to packet hash** → **branch-warden** (if committing the harness) → **PK apply HARD STOP** (apply_migration A then B) → post-apply proof (select_template + render) → PK visual gate → result doc + register pointer. Rollback validated before apply (files above).

## Scope reminder (unchanged)
No sourcing, no new promotion beyond this one clip, no default-selection change, no publish, no worker/EF deploy. Broadening beyond `youtube` (to fb/ig/li) and making B-roll a PP default are separate later decisions.
