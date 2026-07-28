# Result — Governed B-roll Consumption v1 · SLICE B (governed resolver selection)

**Date:** 2026-07-28 Sydney
**Lane:** Governed B-roll Consumption v1 (PRODUCT_PROOF) · Slice B · **Tier T3**
**Packet:** `_harness/cc_broll_consumption_sliceB_20260728/PACKET_README.md`
**Verdict:** ✅ **PROVEN** — ICE automatically selects a governed B-roll video clip for the full-frame Background of `video_short_stat`, via the real governance path (real promotion + resolver), with no asset-ID literal and no relaxation of the eligibility gates. Default PP video selection is provably unchanged.

## What was proven (PK's four criteria)

1. **Template exposes a defined B-roll slot** — template `46c5c4ac` (`AU_generic_national_Suburb_9:16_V1`) registered with a `Background` field `element_type='video'`.
2. **Resolver selects `broll_background`** — `select_template('property-pulse', NULL, 'video_short_stat', 'stat-reveal-9x16-broll-v1', seed)` → winner `46c5c4ac`, `slot_resolution.modifications['Background.source'] = …/Broll/broll_pp_au_suburb_aerial.mp4`, `slot_status=ok`.
3. **Clip selected with NO asset-ID literal** — selection is resolver-driven end to end (variant intent + `resolve_slot_assets`); no asset_id anywhere in the path.
4. **Eligibility gates unchanged** — the clip is genuinely promoted (`is_active=true`, `approved=true`); `is_active`/`approved` gates untouched; no proof-scoped exception.

Plus **containment proven**: the **no-intent control** `select_template('property-pulse', NULL, 'video_short_stat', NULL, seed)` returns an **incumbent** (`c11bb8ab`) — PP's default video selection is unchanged.

**End-to-end render:** the resolver-selected payload rendered in 13.5s (under the 2-min ceiling), producing an mp4 **byte-identical** (`sha256 58fd69c13eb34da54c681c02722da65b4e8a06b4e18d3cb48c98c6ee72150882`) to the PK-approved Slice A video (`render_id ba739160…`).

## Applied (three migrations, contained, DB-only, no EF deploy)

- **`resolve_slot_assets_v1_3_broll_background`** — scoped resolver admitting `broll_background` for a video Background field.
- **`broll_consumption_v1_slice_b_promote_register`** — CAS-guarded promotion of clip `2d62b04e` (→ governed, `safe_for_text_overlay='needs_scrim'`) with in-txn fail-closed assertions; additive registration of template `46c5c4ac` (Background video field · Logo · text · variant `stat-reveal-9x16-broll-v1` `fit_status='candidate'` · **NO platform_suitability row** · one PP assignment `visually_approved` · a `visual_approval/passed` proof_event citing Slice A).
- **`resolve_slot_assets_v1_4_broll_exclusive`** — the roll-forward fix (see below).

## The v1.3 defect the proof caught → v1.4 fix

The first proof run selected template `46c5c4ac` via intent but `resolve_slot_assets` filled its **video** Background with a still **image** (`bg_pp_city_skyline_vantage.jpg`). Root cause: the v1.3 predicate admitted image `background` assets **alongside** `broll_background` for a video field. **v1.4** made the Background predicate **exclusive by element type** (`logo` always · video Background → `broll_background` only · image Background → `background` only) and gated the shared-pool fallback with `AND NOT v_bg_is_video`. Re-run: the intent call resolved the **clip**; no-intent unchanged; image templates provably unchanged.

## Containment (why this is safe)

Template `46c5c4ac` has **no platform_suitability row** → `select_template` (which evaluates suitability only when `p_platform IS NOT NULL`) rejects it at **every explicit platform** (`no_suitability_row_for_platform`), so it can only be selected at `p_platform=null` — the production video signature. There, `fit_status='candidate'` ranks **below** the strong incumbents on a no-intent call. It wins **only** on explicit `variant_intent='stat-reveal-9x16-broll-v1'` at `p_platform=null`, a call no production path issues (production video caller = `video-worker/index.ts:1231`, `p_platform=null`, `p_variant_intent=null`). No autonomous-publish path.

## Review chain

db-rls-auditor **clean** (v1.3 SQL, re-verified after containment fix; and v1.4) · external cross-model **partial / no concrete defect** (3686d55e on the packet; af295285 on v1.4 — `apply_corrected`, no escalation) · apply-harness-auditor (shadow) **2 LOW check-7 findings, both fixed** (rollback hardened) · applied as a hash-pinned Convention-2 sequence (apply-set hash `357259fb…`) under PK authorization ("you carry it"); the v1.3 proof STOP was surfaced and PK chose roll-forward.

## Carries / next

- **Asset Gap "Video B-roll Intake v1" is now UNBLOCKED** — the consumption path is proven, so real, measurable B-roll demand now exists (the sequencing precondition PK set). The intake lane (detected appetite → approved-provider sourcing → sha256+provider-id+url dedup → fenced shortlist → PK visual gate) can reopen on its own Gate-1.
- **Shared-pool video-awareness** — the `NOT v_bg_is_video` fallback guard is inert for PP (`client_only`); for a future `best_fit` client with a video template it correctly prevents an image fallback. No shared *video* pool exists yet.
- **Making B-roll a PP default** (repoint) and **broadening beyond the youtube-scoped clip** (add platforms/suitability) are separate deliberate decisions, each needing its own gate.
- **Geo C1** — the AU-suburb clip is national-only; `label_constraint`/`geo_scope` are not machine-enforced. A promotion precondition for any Perth-labelled use.
- **Register pointers** (`00_sync_state.md`, `00_action_list.md`) — pending PK commit instruction (Convention 1: one pointer per terminal state).
