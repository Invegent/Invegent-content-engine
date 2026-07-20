# cc-0044 Checkpoint B — carries emitted by the resolve_slot_assets v1.2 lane

These are NOT part of this resolver migration. They are handed to the orchestrator for separate
PK-gated disposition. Both block BROAD shared-pool activation; neither blocks applying v1.2 dark.

## CARRY-1 (ACTIVATION-BLOCKING) — analyzer↔resolver text-safety parity
- **What:** `public.resolve_shared_pool_assets` (used by `analyze_asset_gap` to decide `v_shared_hit`)
  does NOT apply the background text-safety fence (`safe_for_text_overlay`), but the v1.2 resolver DOES
  (a shared static_background with sfto false/null/unknown is rejected at resolution).
- **Consequence:** a non-text-safe shared bg can be counted a "shared hit" by the analyzer (→ "no gap")
  yet fail-closed at render. Direction is FAIL-SAFE (no bad render; at worst a missed gap-detection).
- **Activation condition (either):**
  (a) NO broad shared-pool client activation until analyzer and resolver text-safety eligibility are
      aligned (give `resolve_shared_pool_assets` / `analyze_asset_gap` the same text-safety fence); OR
  (b) for the narrowly controlled Proof #1 ONLY: the selected shared asset must already carry a
      resolver-accepted `safe_for_text_overlay` value AND evidence must show analyzer diagnosis and
      render resolution AGREE for that exact asset.
- **Not fixed here** (this lane is resolver-only, per PK instruction 2).

## CARRY-2 (CONCRETE DEFECT, latent) — analyze_asset_gap array-append raises 22P02
- **What:** live `public.analyze_asset_gap` builds `v_permitted` via bare-literal append:
  `v_permitted := v_permitted || 'vertical_shared';` / `|| 'global_generic';` (v_permitted is text[]).
  With an untyped literal, Postgres resolves `text[] || unknown` as array-concat and tries to cast the
  string to text[] → `ERROR 22P02 malformed array literal`.
- **When it fires:** the moment a client has a `client_asset_pool_policy` row with pool_policy
  `client_preferred` or `best_fit` AND an allow_* flag true — i.e. the FIRST shared-pool activation.
  It has never fired because 0 policy rows exist today.
- **Evidence:** empirically caught by this lane's v1.2 fixture proof (the resolver mirrored the same
  form and raised 22P02 until fixed with an explicit `::text` cast). The resolver v1.2 uses the safe
  `::text` form; `analyze_asset_gap` still carries the latent form.
- **Fix (separate lane):** add `::text` to both append literals in `analyze_asset_gap` (value-identical;
  a one-line-each patch). MUST land before / together with the first policy-row activation, else the
  analyzer errors on the proof client.
