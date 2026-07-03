# Template Selection v0 — Lane C Packet — `select_template` read-only RPC

**Created:** 2026-07-03 Sydney · **Design authority:** Gate-1 design packet §4 (PK-ratified) · **PK Lane C directive** = gate 1
**Status:** review chain complete — **awaiting PK apply gate (HARD STOP)**
**Artifact:** `supabase/migrations/20260703120000_create_select_template_v1.sql` · **sha256 `836d764ac4901040342c58e895e495b2ab55ba145c0ae626419dbc6a2015d4f3`**
**Tests:** `docs/briefs/template-selection-v0-lane-c-validation.mjs` (sha256 `dec42c79…`) — **58/58**, independently re-run 58/58 (PGlite loads BOTH real migrations: the live `resolve_slot_assets` dependency + this file, grants verbatim)

## 1. What it is

`public.select_template(client_slug, platform, format, variant_intent?, seed?) → jsonb` — the TMR brain. Answers *which approved and visually proven PP template assignment ICE would use*, composing `resolve_slot_assets` so one call returns the template pick **plus** the winner's slot modifications **plus** every reason. SECDEF · STABLE · `search_path=''` · service-role-only (posture byte-matches the proven Slice-1 RPC). **Ships dark — zero callers, independently confirmed across both repos.**

## 2. Decision chain (as ratified; every rejection carries a reason code)

format_key match (`format_unmapped` if none) → generic scope → status ≥ smoke_rendered → platform suitability (negative rejects; unproven passes ONLY with `platform_suitability_unproven` warning; NULL platform = permissive + `platform_input_missing`, never silent) → assignment `visually_approved+` (`no_assignment` / `assignment_not_approved` / `assignment_blocked` / `not_visually_proven` for the `approved` pre-visual rung) → **passed `visual_approval` proof on that assignment (hard gate)** → `resolve_slot_assets` = ok (`assets_fail_closed:<echoed>`). Rank: variant_intent exact match (RANKER — unmatched = same winner + warning) → fit_status → registry-order tiebreak. **Seed never rotates the template** (background rotation only, pass-through).

Return: `selected` (assignment_id, template_id, **provider_template_id**, name, variant/format keys, aspect, assignment_status, **proof block with occurred_at + evidence file**, reasons[]) · `slot_resolution` (full winner payload) · ranked `alternatives[]` · per-candidate `rejected[]` · `warnings[]` · echoed `context`.

## 3. Predicted live behaviour (db-rls-auditor replication, pre-apply model)

`('property-pulse','facebook','image_quote')` → 11 candidates → 2 rejected `assignment_not_approved` (market_insight + testimonial, the needs-tweak pair) → **9 survivors, all asset-ok live** → winner **`generic_quote_card_1x1_v1`** (all tie on fit + created_at; id tiebreak). `variant_intent='stat_card.v1'` → stat hero wins. Unknown format → `format_unmapped`. Clients with no assignments → `no_selectable_template` with the full why-not list.

## 4. Review chain (all pinned to `836d764a…`)

| Gate | Verdict |
|---|---|
| ef-builder (isolated worktree) | 2 files only; 6 deviations flagged, all fail-closed-safe (chiefly: suitability CHECK-vocabulary normalization `not_suitable/blocked`=reject, `platform_safe/production_proven`=silent-pass, rest=warn-pass; NULL-platform winner carries `platform_skipped_null_input`, no false claim) |
| Hermetic tests | 58/58 + independent re-run 58/58 |
| branch-warden | **safe** (main @ `3d8659d` == origin, 0/0; artifacts byte-verified) |
| db-rls-auditor | **PASS, zero must-fix** — hygiene line-by-line; CHECK vocabularies covered EXACTLY (no unhandled value); no overload; SECDEF-calls-SECDEF sound; live replication above; rollback dependent-free |
| security-auditor | **GREEN, apply-ready** — zero-caller confirmed cross-repo; no escalation/disclosure widening; ~16× nested-call amplification negligible; overclaim check PASS. Notes: p_seed length nit (future shared cap) · payload-reflection caution for any future browser-facing lane · UNIQUE(template_id, client_id) hardening carry · cosmetic unreachable concat |
| external review | **agree / proceed · risk medium · confidence high · zero pushback** — `review_id e4971e2b-629c-4098-b821-ece527b09945` |

## 5. Apply / rollback

Apply = PK-gated migration (`apply_migration`, name `create_select_template_v1`); hash re-verified immediately pre-apply; precondition `select_template` absent from pg_proc. Post-apply proofs: proacl/`has_function_privilege` asserts → anon REST 42501 → service_role smokes (PP happy path expecting **quote_card winner, 9 survivors, 2 `assignment_not_approved`**; `format_unmapped`; `client_not_found`; `no_selectable_template`; NULL-platform warnings; variant-intent ranker probe; seed-never-rotates-template probe) → advisors no-new-findings. Rollback: `DROP FUNCTION IF EXISTS public.select_template(text,text,text,text,text)` — one line, zero dependents; new migration number if via the migration lane.

## 6. Boundaries / non-claims

No render · no publish · no production enablement · no Format Mix binding · no runtime integration · no dashboard work · no platform_publish proof · no production_proven / client_enabled claims. The RPC *enforces* the visually-proven gate; it *grants* nothing. **Carries:** UNIQUE(template_id, client_id) constraint · shared param-length cap · payload-reflection re-review if ever browser-faced (join the existing FK + B1-capture carries).
