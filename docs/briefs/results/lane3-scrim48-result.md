# Result — Lane 3 — Scrim-48 Recalibration (`resolve_slot_assets` v1.1)

**Packet:** `docs/briefs/lane3-scrim48-packet.md` · **Completed:** 2026-07-04 Sydney
**Status:** ✅ APPLIED + VERIFIED — **queue item 3 COMPLETE; the dark decision spine now emits the PK-calibrated scrim (48) end-to-end**

## 1. What shipped

`public.resolve_slot_assets` **v1.1** via CREATE OR REPLACE — same signature `(text,text,text,uuid,text)`, same posture (STABLE · SECURITY DEFINER · `search_path=''` · service-role-only). Behaviour delta vs v1 (everything else byte-identical):

1. **`c_scrim_opacity_needs_scrim`: 64 → 48** — PK-calibrated 2026-07-03 via the Lane B proof-wall A/B (v4.78): 48 preferred default · 64 acceptable ONLY for busy backgrounds/dense text · 80 explicitly excluded. Constants no longer `to_be_calibrated`. (`text_safe` stays 40 — no governed `'true'`-class assets yet.)
2. **Governed per-asset scrim override** — PK's "busy background" 64-exception mechanized as **data, not heuristic**: `asset_meta->>'scrim_opacity_override'` (PK-set at intake/promotion, backgrounds only). Numeric → clamped `LEAST(GREATEST(x,0),100)`, used as `Scrim.opacity`, selected Background reasons[] gains `scrim_override_applied` (provenance, not a warning). Non-numeric → ignored with warning `scrim_override_invalid` once; class constant stands (fail-safe, never raises). Consulted only when the template has a Scrim element (same fence as v1).
3. **Explicit non-change:** Scrim element detection keeps NO `dynamic` filter (Lane-0 carry — generics' Scrim rows are `dynamic=false` yet accept opacity modifications).

**Composition (recorded):** `select_template` (20260703035154) and `stamp_tmr_shadow_forward` (20260703130939) embed slot_resolution — both carry the new values automatically from apply time; the stamper's `selector_version` constant tracks `select_template`, which is unchanged → no stamper migration.

## 2. Identity + hash

Ledger **`20260704002811 update_resolve_slot_assets_v1_1_scrim48`**; applied **byte-identical** to the reviewed artifact — single hash reviewed = applied = repo file: `961feef0b654ceb18d5da367dd71db128ebc998b5f4c678112c4d722d1ebaf7e` (re-verified immediately pre-apply). Repo file renamed to the ledger version (`20260704090000_…` → `20260704002811_…`; content hash unchanged, re-verified post-rename). Live pre-apply body_md5 `f83948efe7c5596f4bee112161ad4a8c` (= the v1 baseline recorded by the auditor) → post-apply `2008b8ed9b6050eb74cd6a359ffe2c82`.

## 3. Gate trail (all pinned to `961feef0…`)

ef-builder isolated worktree → **tri-suite green: 84/84 + 58/58 + 47/47** (PGlite, real migration files; both updated harnesses independently re-run) → db-rls-auditor **PASS zero-must-fix** (zero repo-vs-live drift; 0/29 assets carry the override key → apply delta = pure 64→48) → security-auditor **GREEN** (sole residual: pathological >131072-digit numeric override raises fail-loud 22003 — trusted-writer-only surface; optional regex length bound deferred) → external review **agree/proceed zero-pushback** (`review_id 6d546362-3d2e-4678-b432-9cd8de67fbe0`) → PK **"apply — override design ratified"** → this verification.

## 4. Post-apply verification (ALL PASS)

| Proof | Result |
|---|---|
| Posture | `prosecdef=t` · `provolatile='s'` · `search_path=""` · `proacl={postgres=X, service_role=X}` · anon/authenticated EXECUTE **false**, service_role **true** |
| Anon REST | **HTTP 401** |
| PP happy path (`property-pulse`/`facebook`/`image_quote`, template `0e006c5c…`, no seed) | `status ok` · winner **`bg_perth_cbd`** · **`Scrim.opacity` = 48** · Background reasons WITHOUT `scrim_override_applied` · warnings only `platform_scope_unbacked` · Logo pick unchanged `pp_logo_primary` (consistent with the v4.90 promotion invariant) |
| Override absence | **0 / 29** assets carry `scrim_opacity_override` → live delta is exactly the 64→48 constant, nothing else |
| Composition | live `select_template` default call: winner `generic_market_insight_card_1x1_v1` (v4.89 acknowledged flip, unchanged) with embedded `slot_resolution.modifications."Scrim.opacity"` = **48** |
| Advisors | zero findings reference `resolve_slot_assets` (baseline unchanged) |

## 5. Rollback (standing, reference only)

Re-apply the v1 body from `supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql` under a **NEW** migration number (never reuse a name); expected restored body_md5 `f83948efe7c5596f4bee112161ad4a8c`.

## 6. Non-claims / boundaries held

No production behaviour change (resolver + both composers remain dark — sole caller is the idle S1 stamper) · no render · no publish · no runtime/worker/dashboard change · no DML (zero rows touched; no asset received an override — setting one is a future PK intake/promotion act) · no Format Mix · no enablement · rotation (item 4) and P0 promotion review (item 5) untouched.

## 7. Carries

- Setting `scrim_opacity_override` on any real "busy" background = PK judgment at intake/promotion time (first candidates likely in the item-5 promotion review).
- Optional: regex length bound on the override value (security-auditor cosmetic residual).
- Item 4 rotation alignment (PK policy decision first) · item 5 P0 background promotion review (packet ready).
