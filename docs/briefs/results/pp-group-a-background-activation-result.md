# Result — PP Group A background activation (4 approved backgrounds → live rotation)

- **Version:** v5.58
- **Date:** 2026-07-17 (Sydney)
- **Tier / lane:** T3 · PRODUCT_PROOF
- **Verdict:** ✅ APPLIED — live in production, machine-proven at the resolver.
- **Client:** Property Pulse — `client_id = 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`
- **Table:** `c.client_brand_asset`
- **Packet + runnable SQL:** `_harness/group_a_bg_activation_20260717/` (packet.md sha `14f7f76a…`)

## What changed
Flipped `is_active` **false→true** on 4 already-approved, already-governed Property Pulse
background images, moving them from held-reserve into the **live selection pool**. No new rows,
no schema change, no `asset_meta` rewrite — `is_active` + `updated_at` only.

| asset_key | asset_name | asset_id | sha256 (verified live) |
|---|---|---|---|
| `bg_sydney_cbd` | Sydney CBD suburbs | `3769be84-8280-4bc1-80e5-141ba44420c8` | `74cfd47f3ffb…` |
| `bg_brisbane_cbd` | Brisbane CBD suburbs | `47f489f4-e3a4-4c2f-8ea4-215becbb5c47` | `812d8f39350c…` |
| `bg_pp_city_skyline_vantage` | City skyline vantage (generic) | `b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12` | `2ef9d39b15ba…` |
| `bg_pp_coastal_waterfront` | Coastal waterfront (AU) | `b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13` | `b164c47a28ed…` |

## Why `is_active` was the sole blocker
Production reads `public.resolve_slot_assets` (SECURITY DEFINER, STABLE), which admits a
background iff **`is_active=true` AND `asset_meta->>'approved'='true'`** (+ license present,
`bucket='brand-assets'`, `safe_for_text_overlay ∈ {true,needs_scrim}`, platform not excluded). It
does **not** read `production_use_allowed`. All 4 targets already satisfied every predicate except
`is_active` (verified live pre-apply). `production_use_allowed=null` on Sydney/Brisbane was left
**untouched** (resolver-irrelevant; keeps rollback byte-exact) — optional cosmetic hygiene follow-up.

## Gates (all clean)
- **PK visual approval:** all 4 approved after viewing the images (bytes sha256-matched to governed records).
- **External review:** `ask_chatgpt_review` → verdict `agree` / decision `proceed`, risk medium,
  confidence high, no pushback, no escalation. `review_id = 6eaf4740-c757-478c-a88f-2809de9e8e3f`,
  `reviewed_input_hash = 14f7f76a6276…` (packet.md).
- **PK write authorization:** given explicitly ("authorized — apply").

## Apply + proof (evidence)
- **Baseline probe** (`resolve_slot_assets('property-pulse','facebook','1x1','1cfe0f9c…')`):
  `status=ok`, Background `inactive` rejects = **12**, all 4 Group A keys present as `inactive`.
- **Apply** (`execute_sql`, CAS-guarded `UPDATE … SET is_active=true` on the 4 pinned ids with
  `is_active=false AND approved='true' AND approval_status='governed' AND usage='background'`):
  **rowcount = 4**, RETURNING = exactly the 4 target keys.
- **Post-apply probe:** `status=ok`, Background `inactive` rejects **12 → 8**,
  `group_a_still_inactive = 0`, no `fail_closed`.
- **Readback:** live active PP background pool **12 → 16**.
- Seedless default pick unchanged (`bg_perth_cbd`) — no default displacement.

## Rollback
`_harness/group_a_bg_activation_20260717/04_rollback.sql` — mirror flip `is_active=true→false` on
the same 4 ids, expect rowcount=4; restores exact baseline (apply touched only `is_active`).

## Open / not done
- **Regression render (supervised `governed_image_quote_smoke`) NOT run** — it requires the
  `x-series-key` secret (not handled in-transcript) and is the PK-run supervised entrypoint. This
  change only *enlarges* the eligible pool (4 assets of the same `needs_scrim` class as the 12
  already-live); the render/scrim/template path is byte-unchanged, and the resolver machine-proof
  confirms the enlarged pool resolves cleanly. Left as an optional PK-run belt-and-braces step.

## Inventory after this lane
- **PP backgrounds:** 16 live (was 12) · 8 still in reserve (7 unapproved candidates + "Modern AU
  townhouse exteriors" which is governed but `approved=false`).
- **PP background video (B-roll):** unchanged — 0 live, 2 fenced candidates.
