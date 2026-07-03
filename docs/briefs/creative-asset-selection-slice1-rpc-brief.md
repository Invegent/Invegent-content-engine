# Brief — Creative Asset Selection Slice-1 — read-only slot-resolver RPC

**Created:** 2026-07-03 Sydney
**Author:** Claude Code orchestrator
**Executor:** ef-builder (isolated worktree) under orchestrator; PK runs the apply gate
**Status:** draft — awaiting PK approval (gate 1)
**Result file:** `docs/briefs/results/creative-asset-selection-slice1-rpc-result.md` (on completion)

---

## Task

Build **`public.resolve_slot_assets`** — the read-only Asset Selection Slice-1 RPC designed in v4.74
and unblocked by the v4.75 governance backfill. Given a client, platform, format, and a TMR registry
template, it answers: *which governed background, logo, and scrim setting should fill this template's
slots* — or **fails closed with structured, machine-readable reasons**. It is the bridge between Asset
Intake (governed `c.client_brand_asset` rows) and TMR, and the first component of the "explainable
creative decision engine" phase. **Explainability is a day-one contract requirement:** every selection
AND every rejection carries a reason code — this is what Layer-3 dashboard "why picked / why not"
views will consume later.

## Source context

- `docs/briefs/results/creative-asset-selection-v0-result.md` — the ratified design (filter order §5, fail-closed policy §6, Slice-1 proposal §7, PK decisions §8). This brief implements it.
- `docs/briefs/results/asset-intake-backfill-pp-logo-perth-background-result.md` (v4.75) — all 4 PP assets now carry `license_type` / `approval_status:'governed'` / `safe_for_text_overlay` (backgrounds) → no grandfathering carve-out needed.
- `public.resolve_brand_assets` — the proven by-key lookup underneath; its security posture (`SECURITY DEFINER`, `search_path=''`, EXECUTE postgres+service_role only) is the posture to copy.
- Registry ground truth (read 2026-07-03): `c.creative_provider_template` (16 generic, all `smoke_rendered`) · `c.creative_provider_template_field` — dynamic non-text slots: `Background` (field_kind background, **required_for_render=true**, 12 templates), `Logo` (field_kind logo, 16), `FaceObject` (image, 1); `Scrim` shape element on 12.
- Rank/rotation precedent: B1-v2 `selectB1BackgroundKey` (FNV-1a over post_draft_id) — deterministic, no randomness.

## Proposed contract (PK to ratify at gate 1)

**Signature:** `resolve_slot_assets(p_client_slug text, p_platform text, p_format text, p_template_id uuid, p_seed text default null)`
— `p_template_id` = `c.creative_provider_template.id` (registry PK, what future Template Selection will hold). `p_seed` (e.g. `post_draft_id`) deterministically rotates among top-ranked eligible backgrounds (B1-v2 pattern); null → top-ranked.

**Returns jsonb:**

```json
{
  "status": "ok | fail_closed",
  "modifications": { "Background.source": "...", "Logo.source": "...", "Scrim.opacity": 64 },
  "selected":  [ { "slot": "Background", "asset_key": "bg_perth_cbd", "asset_id": "...", "reasons": ["governed","license_ok","text_safe_needs_scrim","client_match"] } ],
  "rejected":  [ { "asset_key": "...", "reason_code": "license_missing | license_expired | wrong_client | not_text_safe | wrong_slot_type | inactive | not_approved | output_as_input_risk" } ],
  "warnings":  [ "platform_scope_unbacked" ],
  "fail_reason": "no_governed_background | missing_required_logo | template_not_found | ..." 
}
```

**Decision order (v0 result §5, unchanged):** client → license (`license_type` present; unknown/expired ⇒ reject) → slot-type match (`asset_meta->>'usage'`) → platform (**permissive-until-backfilled + `platform_scope_unbacked` warning** — PK decision 4) → aspect (loose; Creatomate crops) → safety (`safe_for_text_overlay`; **only `brand-assets` bucket accepted** = output-as-input guard) → rank (text-safe `true` > `needs_scrim`; `false` rejected for scrim-text templates; deterministic tiebreak) → return or **FAIL CLOSED**.

**Scrim mapping (constants marked `to_be_calibrated`):** `needs_scrim` → 64 · `true` → 40 · `false` → reject for text-overlay slots. **Missing required logo ⇒ `fail_closed` (PK decision 3)** — the RPC never substitutes placeholders; smoke callers handle placeholders themselves.

## Scope

**In scope:** the RPC (one migration file, NOT applied until the PK gate) · hermetic tests (PGlite harness, cc-0020 precedent: happy-path PP, fail-closed no-governed-assets client, missing-logo stop, rejection-reason completeness, seed determinism) · packet + review chain.
**Out of scope:** Template Selection v0 · eligibility view / assignment rows · ANY worker/runtime change (no production consumer — the RPC ships dark) · dashboard UI · schema/DDL beyond the function · asset writes · platform_scope backfill · video/FaceObject slots (FaceObject returns `fail_closed:no_governed_asset` naturally).

## Allowed actions

- ef-builder: author migration SQL + tests in an isolated worktree; run local checks.
- Orchestrator: read-only DB catalog/data reads; run review chain (db-rls-auditor → **security-auditor — TRIGGERED, new SECURITY DEFINER function** → external review with `reviewed_input_hash`).

## Forbidden actions

- No migration apply, no deploy, no DML, no render, no publish, no proof event, no enablement, no binding, no platform_safe / production_proven / Format Mix claims (v4.75 holds all stand).
- No worker edits; no dashboard edits; no relaxation of fail-closed rules to make tests pass.
- No commit/push without explicit PK instruction.

## Success criteria

- Migration packet exists with the exact `CREATE FUNCTION` (SECURITY DEFINER, `search_path=''`, EXECUTE postgres+service_role only, schema-qualified reads).
- Tests pass locally: PP happy path returns 3 eligible backgrounds + logo with reasons; seed rotation deterministic; ungoverned client fails closed with reasons; every rejection carries a reason_code.
- Review chain clean (or PK-accepted); `reviewed_input_hash` recorded.
- Zero production impact demonstrable: no caller exists; function is invisible until Template Selection/shadow lanes consume it.

## Stop condition

Stop at the PK apply gate (HARD STOP): present the final migration packet + review results. Apply is PK-run. After apply: read-only smoke calls (PP + negative case), result doc, register update — each on PK instruction.

---

## Notes

Gate-1 decisions for PK (defaults proposed, one word each to ratify/override): (1) signature incl. `p_seed` rotation-in-RPC — default YES; (2) scrim constants 64/40 `to_be_calibrated` — default YES; (3) rank tiebreak = text-safe class then `created_at` asc — default YES (recently-unused ranking deferred; needs render-log reads).
