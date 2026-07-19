# Brief cc-0042 — Asset appetite/inventory read-path (the read-only "brain"; ships dark)

**Created:** 2026-07-19 Sydney
**Author:** chat (Post-Prep Asset-Gap read-path lane — follow-on to cc-0041)
**Executor:** Claude Code (design + prepared SQL) — apply is a later PK gate
**Status:** draft (Gate-1)
**Result file:** `docs/briefs/results/cc-0042-appetite-inventory-read-path.md` (on completion)
**Proposed tier:** **T2** (read-only additive functions; ships dark; no writes, no cron, no production consumer). Full T2 chain (db-rls-auditor + external pinned to hash + hermetic tests + rollback written before apply).
**Lane class (CCF-02):** SIDE_PROVING.

---

## Task

Build the **read-only derivation layer** cc-0041 designed: given a prepared post's `(client, platform, format)`, derive its **asset appetite before inventory resolution** (deterministically), check that appetite against **both** inventory sources honoring the client's pool policy, and return the **dual-axis verdict** (`primary_route` × `asset_gap_detected`/`asset_gap_drainability`) — the exact shape the future analyzer will persist to `m.asset_gap_suggestion`, **but this lane writes nothing**. Prepared SQL only; apply is a later PK gate. Ships **dark** — no production consumer, no cron.

## Source context (verified in source this lane)

- `docs/briefs/cc-0041-post-prep-asset-gap-analysis-brief.md` (rev-3) + `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — the applied substrate (migration `20260719160000`): `c.shared_creative_asset`, `c.client_asset_pool_policy`, `m.asset_gap_suggestion` (dual-axis columns + drainability vocab), `m.asset_gap_observation`. Result: `docs/briefs/results/cc-0041-post-prep-asset-gap-analysis.md`.
- `supabase/migrations/20260703035154_create_select_template_v1.sql` — **verified:** the pre-governance candidate query to reuse is `FROM c.creative_template_variant_candidate vc JOIN c.creative_provider_template t ON t.id=vc.template_id WHERE vc.format_key=p_format ORDER BY t.created_at ASC, t.id ASC, vc.variant_key ASC`. `select_template` applies governance filters a–e (scope/status/platform-suitability/assignment/proof) then composes `resolve_slot_assets` at step f — and returns **no appetite metadata**, so appetite must be derived independently, upstream of governance.
- `supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql` — **verified:** the read-only, governance-independent asset check over `c.client_brand_asset`; `ok` (fillable) vs `fail_closed` (`no_governed_background`/`missing_required_logo`). This is the **client-scoped** half of the two-source check; reuse **unedited**.
- `supabase/migrations/20260711065353_tmr4_generic_template_tags_and_asset_appetite.sql` — appetite columns on `c.creative_provider_template` (`image_slot_min`/`image_slot_max`/`needs_governed_background`/`text_overlay_safe_required`) + tag tables (`c.creative_template_family_tag` default ⊕ `c.creative_provider_template_tag` override; namespaces `vertical/use_case/tone/motion_treatment/length_class/aspect_fit`). `length_class ∈ (static,short_video,standard_short_video,long_video)` → maps to `slot_kind`.
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql:121` — `c.creative_template_variant_candidate` (`format_key`, `variant_key`, `fit_status ∈ unknown|candidate|strong_candidate|weak_candidate|needs_template_edit|unsuitable|blocked`).
- CLAUDE.md — SECDEF/EXECUTE-trap discipline (revoke from anon+authenticated) · fail-closed doctrine · image-workflow §2. Memory: `cc-0041-asset-gap-analysis-schema`, `client-brand-asset-fence-model`, `supabase-public-function-default-acl`, `declared-control-not-consulted`.

## Scope

**In scope (design + prepared SQL, ships dark):**
1. **`public.derive_asset_appetite(p_client_slug, p_platform, p_format, p_seed default null)`** — read-only. Produces the deterministically-ranked **pre-governance** candidate set (reuse the query above, minus a–e), derives a **canonical appetite** per candidate (appetite columns + effective `template ⊕ family` tags + `slot_kind` from `length_class`), and applies the **deterministic-candidate rule**: unambiguous top candidate → its appetite; equally-ranked candidates with **materially different** canonical appetites (differing `image_slot_min/max`, `needs_governed_background`, `text_overlay_safe_required`, aspect/crop, or sensitivity) → return `ambiguous_asset_appetite`. Returns appetite + candidate identity + ambiguity flag.
2. **`public.resolve_shared_pool_assets(...)`** — NEW read-only shared-pool evaluator over `c.shared_creative_asset`, mirroring `resolve_slot_assets`' posture: eligible iff `is_active` ∧ `production_use_allowed` ∧ scope permitted by policy ∧ `allowed/excluded_clients` ∧ `vertical_key` match ∧ sensitivity/`purpose_bound` fences ∧ multi-entity licence. Fail-closed with per-asset reason codes.
3. **`public.analyze_asset_gap(p_client_slug, p_platform, p_format, p_seed default null)`** — read-only composition: `derive_asset_appetite` → **two-source** inventory check (`resolve_slot_assets` for client-scoped **+** `resolve_shared_pool_assets` for permitted shared pools, combined per `c.client_asset_pool_policy`; **no row ⇒ `client_only`**) → **dual-axis classifier** returning `{primary_route, asset_gap_detected, asset_gap_drainability, appetite_descriptor, why_needed, permitted_governance_scopes, preferred_scope_order, sourcing_target_scope, appetite_signature}` — **the exact `m.asset_gap_suggestion` contract shape, returned not written.** A MISS exists only after **all policy-permitted pools** are checked; the asset check is **independent** of `select_template`'s governance verdict (defeats masking).
4. **Posture:** all three functions `SECURITY DEFINER · STABLE · SET search_path='' · schema-qualified`, EXECUTE **revoked from PUBLIC, anon, authenticated**, granted to `service_role` only. Fail-closed (ambiguity/error → structured return, never silent). Prepared as a non-applied migration file + rollback (`DROP FUNCTION`).

**Out of scope (hard):**
- **No writes** — nothing touches `m.asset_gap_suggestion`/`m.asset_gap_observation` (that is the analyzer lane). These functions only **return** the verdict.
- No cron/scheduler, no synchronous draft-prep change, no production consumer (ships dark).
- No edits to `select_template` / `resolve_slot_assets` (compose/read them; surface any defect, don't patch).
- No 0A/0B population (functions read them as-is — currently empty shared pool + no policy rows ⇒ `client_only`; that is correct dark behavior).
- No promotion/approval/promotion-authority; no migration applied / EF deployed this lane (apply is the PK gate).

## Allowed / Forbidden actions

**Allowed:** read repo/migrations/registers/CLAUDE.md; read-only live-schema confirmation via db-rls-auditor; write the prepared migration SQL + hermetic test fixtures to `docs/briefs/` or `_harness/`; run db-rls-auditor + `ask_chatgpt_review` (hash-pinned) on the prepared SQL; read-only smoke of the functions is a **later** step **only** after the PK apply gate.
**Forbidden:** any `apply_migration`/`execute_sql` DDL·DML/`deploy_edge_function`/cron/push before the PK gate; any table write; editing `select_template`/`resolve_slot_assets`; granting EXECUTE to anon/authenticated; marking anything proven/approved; honoring holds (NDIS staged imagery, video D6 Lane 4 fenced — untouched).

## Success criteria

- Appetite derived **before** resolution and **deterministically**; equally-ranked materially-different appetites → `ambiguous_asset_appetite` (→ `primary_route=template_gap`, `asset_gap_drainability=blocked_by_template`), no false single-pick.
- Two-source check honors pool policy (`client_only`/`client_preferred`/`best_fit`; no row ⇒ `client_only`); MISS only after all permitted pools checked; asset check independent of governance state.
- `analyze_asset_gap` returns a payload that maps **1:1** onto the `m.asset_gap_suggestion` insert contract (so the analyzer persists it verbatim), incl. a deterministic `appetite_signature` per Artifact B (client-specific).
- All three functions ship dark: `SECDEF/STABLE/search_path=''/service-role-only`, EXECUTE revoked from anon+authenticated (post-assert the ACL); fail-closed.
- Hermetic tests demonstrate: ambiguous→template_gap · governance-masked asset gap → recorded `blocked_by_governance`/`blocked_by_template` (not drainable) · clean HIT · empty-shared-pool + no-policy ⇒ client_only behavior · static_background→drainable while video_broll/logo→triage_only.
- db-rls-auditor `clean/pass`; external review pinned to the prepared-SQL sha256; `select_template`/`resolve_slot_assets` unedited.

## Stop condition

Report the design + prepared SQL + Open Questions to PK for the Gate-1 sign-off (scope + tier + Q1–Q4). **STOP before any apply/deploy/cron.** Apply of the functions is a separate PK gate; the analyzer that calls them (and writes suggestions) is the next lane after this.

---

## Open questions for PK (Gate-1)

1. **Entry-point shape.** Three functions (`derive_asset_appetite` + `resolve_shared_pool_assets` + composing `analyze_asset_gap`) — recommended, each independently testable — vs one monolith. **Recommend the three.**
2. **`best_fit` scoring depth.** v1 implements the full pool-policy plumbing but a **minimal deterministic fit signal** (e.g. tag-overlap count + `client_asset_score_bias`); richer scoring is a later tuning pass. Since the shared pool is empty today, `best_fit` currently reduces to client-only results regardless. **Confirm minimal-now.**
3. **`why_needed` for shared-only misses.** When the client pool misses but a shared pool *would* satisfy (once populated), the reason vocab needs a `shared_pool_empty`/`no_shared_candidate` code alongside the existing `no_governed_background` etc. **Recommend adding shared-pool reason codes** (design lists them).
4. **Tier.** T2 (read-only, dark). Confirm — or escalate to T3 if you want the first shared-pool-reading function treated as production-touching.

## Notes

- This is the **read-only brain**; the analyzer lane (next, T3) adds only the thin write layer (calls `analyze_asset_gap`, UPSERTs `m.asset_gap_suggestion` via the exact partial-index `ON CONFLICT` form cc-0041 documented, inserts `m.asset_gap_observation`). Keeping derivation read-only and dark here means the analyzer lane is a small, well-bounded write step.
- Guards against ICE's `declared-control-not-consulted` failure mode: the hermetic tests must prove each fence (pool policy, sensitivity, drainability) is **actually read** by the function, not merely present.
