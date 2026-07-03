# Result — Template Selection v0 — Lane C: `select_template` read-only RPC

**Packet:** `docs/briefs/template-selection-v0-lane-c-packet.md`
**Completed:** 2026-07-03 Sydney
**Status:** ✅ APPLIED + VERIFIED — **LIVE AND DARK** (zero callers; enforces the ladder, grants nothing)

## 1. What shipped

`public.select_template(client_slug, platform, format, variant_intent?, seed?) → jsonb` — the read-only TMR template selector, composing `resolve_slot_assets` so one call returns: selected assignment/template + provider_template_id + proof block (evidence file + timestamp) + full slot resolution + ranked alternatives + per-candidate rejection reasons + warnings. SECDEF · STABLE · `search_path=''` · service-role-only. Hard gate enforced: only `visually_approved+` assignments with a passed `visual_approval` proof are selectable; variant intent is a ranker never a filter; seed rotates backgrounds never templates.

## 2. Identity + hash trail

- **Ledger:** version `20260703035154`, name `create_select_template_v1`; repo file renamed to match: `supabase/migrations/20260703035154_create_select_template_v1.sql`.
- **Single hash** — reviewed = applied = repo file: `836d764ac4901040342c58e895e495b2ab55ba145c0ae626419dbc6a2015d4f3` (applied byte-identical; re-verified pre-apply; function-absent precondition confirmed).

## 3. Gate trail

PK Lane C directive (gate 1) → ef-builder isolated worktree (6 fail-closed-safe deviations flagged, chiefly live suitability-vocabulary normalization) → **58/58 hermetic PGlite tests** (both real migrations loaded; independently re-run 58/58) → branch-warden **safe** → db-rls-auditor **PASS zero-must-fix** (exact CHECK-vocabulary coverage; live decision-chain replication) → security-auditor **GREEN apply-ready** (ships-dark grep-confirmed cross-repo; overclaim check PASS) → external review **agree/proceed zero-pushback** (`review_id e4971e2b-629c-4098-b821-ece527b09945`, hash-pinned) → PK apply approval pinned to the hash → applied via `apply_migration`.

## 4. Post-apply proof battery (ALL PASS, 2026-07-03)

| Proof | Result |
|---|---|
| Posture | `prosecdef=t`, `provolatile='s'`, `search_path=""`, `proacl={postgres=X, service_role=X}`; anon/authenticated privilege **false**, service_role **true** |
| Anon REST | **42501 / HTTP 401** |
| **PP happy path** `('property-pulse','facebook','image_quote')` | `ok` · winner **`generic_quote_card_1x1_v1`** (exactly as the pre-apply replication predicted) · 8 alternatives (9 survivors) · rejected: exactly 2 × `assignment_not_approved` (the needs-tweak pair — market_insight, testimonial) · proof evidence = `_harness/pp_proof_wall/04_quote_card_1x1.jpg` (the file PK reviewed) · embedded `slot_resolution.status='ok'` |
| Variant-intent ranker | `'stat_card.v1'` → stat hero wins with `variant_intent_match` reason; unknown intent → same quote-card winner + `variant_intent_unmatched` warning (ranker-not-filter proven live) |
| Seed semantics | different seeds → **same template**, **different background** (rotation stays in the asset layer) |
| NULL platform | `platform_input_missing` warning + winner reason `platform_skipped_null_input` (honest, never silent) |
| Fail-closed guards | `format_unmapped` (format 'video') · `client_not_found` · `no_selectable_template` for ndis-yarns with **11 × `no_assignment`** rejections (the full why-not payload) |
| Advisors | **zero findings reference `select_template`** (baseline byte-count identical to pre-apply) |

## 5. Dark-status confirmation

Zero production callers (grep-confirmed across CE + dashboard repos pre-apply; nothing wired since). No runtime, dashboard, publishing, rendering, Format Mix, or production-enablement change. The RPC enforces the selectable gate; it grants no status. Rollback standing: `DROP FUNCTION IF EXISTS public.select_template(text,text,text,text,text)` (new migration number if via migration lane).

## 6. Carries (recorded, NOT started)

`UNIQUE(template_id, client_id)` constraint on the assignment table (+ existing client_id FK carry) · shared param-length cap (p_seed nit, now ~16× amplified but service-role-only) · payload-reflection re-review if any future lane fronts this to a browser · prior carries stand (scrim 48 recalibration · location-aware v2 · logo-variant intake · testimonial source guard · 4 template tweaks · B1 registry capture).

## 7. Non-claims

No render · no publish · no production enablement · no Format Mix binding · no runtime/dashboard caller · no platform_publish proof · no production_proven / client_enabled claim · no follow-on carry lanes started.
