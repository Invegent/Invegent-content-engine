# Slice B — Governed B-roll Consumption v1 · T3 GATE PACKET (DRAFT, pre-freeze)

**Date:** 2026-07-28 Sydney · **Status:** draft plan — NOT frozen, NOT approved, no SQL applied
**Depends on:** Slice A PASSED (`docs/briefs/results/governed-broll-consumption-v1-slice-a-result.md`)
**Brief:** `docs/briefs/governed-broll-consumption-v1-gate1-brief-DRAFT.md` (PK Gate-1 approved)
**Tier:** **T3** (production resolver revision + governed promotion + registry writes + a live PP-selection change + a deploy/apply). Full chain + PK apply/deploy HARD STOP + rollback-proven.
**Design source:** live-truth db-rls-auditor map (verdict `concerns`), this lane.

## Goal (PK spec)

Prove ICE **automatically selects** the governed B-roll clip for the full-frame Background of `video_short_stat` via the REAL governance path — a real promotion + a resolver extension — with **no asset-ID literal** and **no relaxation** of the `is_active`/`approved` eligibility gates.

## The four steps

### 1 — Promote exactly ONE clip (governed, CAS-guarded)
- **Clip:** `2d62b04e-c1b5-44df-b382-59cbb991e166` (PP AU-suburb 9:16, silent).
- **Mechanism (sanctioned, no RPC):** a governed CAS-guarded UPDATE in one txn at the T3 gate, pattern per `_harness/pp_background_coverage_recon/promotion_b2p/promotion_apply.sql` — sets `is_active→true`, `asset_meta.approved→true`, `approval_status→governed`, `production_use_allowed→true`, +`approved_at/approved_by='PK'/promotion_lane/promotion_packet`. CAS guards in `WHERE` (current fenced state + `sha256=<verified bytes>`); in-txn pool-neutrality + resolver-eligibility assertion, fail-closed.
- **★ MUST-FIX 1 (text-safety):** the clip's `safe_for_text_overlay='needs_gradient_scrim'` is **rejected** by both the resolver (`text_safety_unknown`) and the promotion post-assert (they accept only `'true'`/`'needs_scrim'`). The promotion UPDATE **must also normalise `safe_for_text_overlay → 'needs_scrim'`** — which aligns with actually adding a gradient scrim to the template (Slice A polish note). Without this the whole chain fails closed silently.

### 2 — Extend the resolver (the danger point) — SCOPED, leak-free
- Live `public.resolve_slot_assets` derives template needs from `field_kind` only, filters candidates `usage IN ('background','logo')`, maps `field_kind='background'→'Background'` slot. It does **not** currently read `element_type`.
- **A global widening (`… ,'broll_background'`) is UNSAFE** — every existing `field_kind='background'` field is `element_type='image'`(14)/`'shape'`(4), **zero video**; a global form would make the `.mp4` eligible for every image Background (incl. PP's own `a3d8472d` and `image_quote`) → video bound into image slots, cross-client pool contamination.
- **Scoped change (recommended):** add `v_bg_is_video := bool_or(field_kind='background' AND element_type='video')`; widen the filter **conditionally**: `usage IN ('background','logo') OR (v_bg_is_video AND usage='broll_background')`; route `broll_background`→`'Background'` slot through the same `safe_for_text_overlay` gate. Because **no existing background field is video-typed**, broll is returned **only** for the new template's video Background — zero leak.
- Ship as a **NEW** migration number + distinct name (e.g. `resolve_slot_assets_v1_3_broll_background`); `CREATE OR REPLACE` preserves ACL + `search_path=''` (no regrant). **Rollback:** re-apply the prior (v1.2) definition verbatim.
- Eligibility gates (`is_active`/`approved`) **unchanged** — the promoted clip passes them.

### 3 — Register template `46c5c4ac` (currently NOT in the registry at all)
Rows to add: `c.creative_provider_template` (the template, 9:16, status `visually_approved`+); `c.creative_provider_template_field` — the **anchor** `Background` field (`field_kind='background'`, **`element_type='video'`**, `dynamic=true`, `required_for_render=true`) + a `Logo` field (worker fails loud without `Logo.source`) + text fields; `c.creative_template_variant_candidate` (format `video_short_stat`); `c.creative_template_platform_suitability` (≥1 platform, else hard `platform_unsuitable`); `c.creative_template_client_assignment` (PP, `visually_approved`); `c.creative_template_proof_event` (`visual_approval`/`passed` — the real PK visual+audio proof of the broll render).

### 4 — Prove auto-selection (no asset-ID literal)
`select_template('property-pulse', <platform>, 'video_short_stat')` → picks `46c5c4ac` → `v_bg_is_video=true` → scoped `resolve_slot_assets` returns the promoted broll clip as `Background.source` → worker Option-B binds it (`b1_video_stat.ts:332-334`) → render. No asset-ID anywhere.

## ★ MUST-FIX 2 / DECISION — ranking (how does 46c5c4ac get selected?)
Two incumbents (`a3d8472d` image-bg, `4cd2c9e2` baked-AV) are both `strong_candidate` with all gates satisfied; `select_template`'s tie-break is `created_at ASC` (older wins), so a newly-created `46c5c4ac` sorts **last and loses** by row-addition alone. To make PP video select the broll template, ONE of:
- **(A) Repoint PP default** — demote incumbents' `fit_status` (or deprecate PP incumbent assignments) so broll wins. **Changes live PP production video going forward.** Governed UPDATE + CAS + post-assert `≥1 selectable template remains` (a wrong demotion = PP video outage).
- **(B) Contained proof via `variant_intent`** — force-select the new variant for the proof call **without** changing PP's default selection (incumbents untouched). Proves auto-selection mechanically; PP production video unchanged. (Viability of intent in the production caller is unverified — fine for a direct proof call.)

## Missing links / verifies (close before freeze)
1. ★ Text-safety normalisation (step 1). 2. ★ Ranking decision (above). 3. PP `Logo` eligibility (worker fail-loud) — verify at gate. 4. Voiceover is a separate required input for a green combo render.

## Risk list (from the audit)
- **HIGH** broll→image-background leak (mitigated by the `element_type='video'` scope). **HIGH** silent fail-closed on `needs_gradient_scrim`. **MED** ranking mis-set → PP video outage (needs ≥1-selectable post-assert). **MED** resolver `search_path=''`/ACL posture (CREATE OR REPLACE preserves; re-confirm, no regrant). **LOW** `label_constraint` national-only not machine-enforced (Perth-brand mismatch — content flag). **LOW** `platform_scope` null → warning only.

## Gate chain (T3)
Freeze concrete SQL → `db-rls-auditor` on the concrete SQL + `get_advisors` → `apply-harness-auditor` (shadow) on the apply packet → external review pinned to packet hash → `branch-warden` → **PK apply/deploy HARD STOP** (migration apply + `safe-deploy` resolver-dependent EF if any, `--no-verify-jwt`) → live auto-selection proof + render → PK visual gate → `deploy-verifier` → result doc. Rollback (resolver v1.2 re-apply + promotion CAS-reverse + registry row deletes) written+validated before apply.
