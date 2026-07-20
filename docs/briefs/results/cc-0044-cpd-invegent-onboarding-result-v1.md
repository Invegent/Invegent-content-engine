# cc-0044 Checkpoint D — Invegent onboarding CLOSED + Blocker B2 shared-attribution fix — result v1

**Lane:** cc-0044 Checkpoint D — Invegent client onboarding via governed DATA · **Class:** PRODUCT_PROOF
**Tier:** T3 (production-touching DML + one schema `CREATE OR REPLACE`) · **Date closed:** 2026-07-20 Sydney
**Verdict:** CLOSED — first non-PP client requirement-closure through governed data + reusable shared inventory, **zero client-specific code**; live render **PK visual PASS**.
**Base of this record:** origin/main `562bd76` (v6.04); recorded as register **v6.05**.

> **Recording-only result doc.** Every production change below already **landed live** on 2026-07-20 via
> `execute_sql` at PK-gated T3 apply gates (`apply_migration` is harness-deny-listed). This document is the
> canonical full-evidence record (Convention 1); the register carries the v6.05 pointer only. **No new
> production change was made to author this doc.**

---

## The outcome this proves

> A generic template is selected for a **new, non-PP client (invegent)**; ICE diagnoses its missing governed
> background requirement; the requirement is supplied through **governed data + reusable shared inventory**
> (not fresh client-specific sourcing, not client-specific code); the analyzer's auto-close pass **resolves the
> demand record automatically** when the gap disappears; and a **governed render succeeds (PK visual PASS)**.

This is the closest measurable step to "Ultimate TMR": ICE constructs and verifies another client's requirements
through **governed data, not a client-by-client build**. The mechanism — not the client — is the proof.

## Capability-matrix delta (invegent)

| Capability | Before CP-D | After CP-D (live) |
|---|---|---|
| `select_template(invegent, fb, image_quote)` | n/a (not governed) | **`ok`** (generic `generic_quote_card_1x1_v1`) |
| Governed background | none (0 client bgs) | **shared `bg_shared_datacentre_server`** via pool fallback |
| Governed logo | fenced only | governed (see supersession note) + `brand_logo_url` set |
| `image_quote` governance | disabled | **enabled** (generic selector) |
| Asset-pool policy | none ⇒ `client_only` default | **`client_preferred` + `allow_global_shared=true`** |
| Open asset-gap demand | open (`e2f70fcc` + IG/LI) | **auto-resolved** (shared `0ba46053` attributed) |
| Client-specific code added | — | **zero** |

## The five governed applies (all live, all `execute_sql` at T3 PK gates)

1. **Logo hard-blocker cleared** — fenced logo `invegent_logo_full_colour` (`d3d10010…`) → governed via CAS
   (apply sha `bc71e0e1…`) + `c.client_brand_profile.brand_logo_url` set (verified PNG HTTP 200). Chain:
   db-rls-auditor clean · external `8d3185c0` agree. Post-verify 5/5 (1 eligible logo, pool-neutral 54).
   **⚠ Superseded by v6.04** — see supersession note below (`d3d10010` since retired for the square badge
   `d3d10017`). Recorded here as-happened.
2. **Shared background promotion** — `Shared BG — Data-centre server` (`bg_shared_datacentre_server`,
   `0ba46053…`, sha `c30f186f…`) → production, **Invegent-scoped** (`allowed_clients=[invegent]`,
   `approval_status=governed`, `governance_scope=global_generic`, `safe_for_text_overlay=true`). Chain:
   db-rls-auditor clean · external `25baeeab` agree. Post-verify 5/5 (1 production shared bg, client pools 55,
   the other 7 shared bgs remain fenced/dark).
3. **Asset-pool policy + resolve proven** — `c.client_asset_pool_policy(invegent)` = `client_preferred`,
   `allow_global_shared=true`, `policy_version=cc-0044-invegent-v1`. Chain: db-rls-auditor clean · external
   `19ec12c4` escalated → PK-authorised (no concrete defect). **Proof:**
   `resolve_slot_assets(invegent, fb, image_quote)` → Background = shared `0ba46053` (reason `client_match`;
   invegent has 0 client bgs → `client_preferred` falls through to the shared pool).
4. **Governance + assignment/proof; CP-D closed** — governance row `(invegent, image_quote, enabled,
   generic-selector)` + assignment on generic template `generic_quote_card_1x1_v1` (`1cfe0f9c…`) @
   `visually_approved` + **passed `visual_approval` proof (evidence render `3db0351b`, PK visual PASS)**. Chain:
   db-rls-auditor clean · external `a4d13c28` escalated → PK-authorised. `select_template(invegent, fb,
   image_quote)` → `ok`.
5. **Blocker B2 — shared-attribution fix** — `run_asset_gap_analysis` auto-close pass (added dark in v6.00,
   `20260720120000`) unconditionally wrote the resolved asset to `resolved_client_asset_id`; when the demand was
   satisfied from the **shared** inventory (`c.shared_creative_asset`), that id is not a `c.client_brand_asset`
   row → **FK 23503** at the first live close. Fix detects `v_is_shared` and routes to
   `resolved_shared_asset_id` (client → client FK, shared → shared FK), satisfying the
   `gap_resolved_requires_one_asset` XOR CHECK either way. **Function-only, ZERO table/index/grant/RLS DDL.**
   `fix_apply.sql` sha `b38e36f3…` / rollback `9c4c64ac…`; 3 surgical edits (reverse == original). Chain:
   db-rls-auditor clean · external `348945d4` agree.

## Closed-demand evidence (the loop closing)

At the live close (`p_dry_run=false`): the analyzer's auto-close pass **resolved `e2f70fcc`** (+ its IG and LI
sibling suggestions) — `resolved:3 errors:0` — attributing the shared background `0ba46053` via
`resolved_shared_asset_id`. The carousel demand row was correctly left **open** (not producible from this apply).

> **⚠ Reconcile gotcha (carried to memory):** the **dry-run** reconcile path **skips the `UPDATE`**, so the
> FK/CHECK path is exercised **only** at live `p_dry_run=false`. Always verify a real close (`errors:0` +
> read-back `status='resolved'`), never the dry-run preview. This is precisely how B2 hid until the first live run.

**Net outcome:** diagnose → governed-data → resolve → render (PK PASS) → auto-close, **zero client code**, the
background drawn from the **reusable shared inventory** — not fresh client-specific sourcing.

## Supersession / forward-notes (append-only; no historical rewrite)

CP-D happened chronologically *before* two lanes that were recorded ahead of it (register base moved to v6.04
before this backfill was cut). Recorded honestly with forward-pointers:

- **Logo (apply #1) superseded by v6.04** (`docs/briefs/results/cc-0044-invegent-logo-swap-result-v1.md`): the
  full-colour logo `d3d10010` promoted here was later **retired** and replaced by the square brand-badge
  `invegent_logo_square_brand_bg` (`d3d10017`) after PK flagged it as faint on the busy datacentre background.
  The **current** governed active invegent logo is `d3d10017`.
- **Proof #1 (v6.03,** `docs/briefs/results/cc-0044-proof1-invegent-shared-pool-render-result-v1.md`**)** built
  directly on CP-D's live state (shared-bg promote + pool policy + governance were "the CP-D onboarding lane's
  work, already live") and rendered a fresh **independent** proof `9725a8c3` (distinct from CP-D's own proof
  render `3db0351b`). Both PK PASS.

## Ledger-backfill disposition

All CP-D applies landed via `execute_sql` (`apply_migration` deny-listed) → none minted a migration-ledger entry.
Disposition (per the CLOSEOUT stance + ICE convention):

- **B2 shared-attribution fix (schema `CREATE OR REPLACE`)** → backfilled as a real, replayable migration:
  `supabase/migrations/20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1.sql`
  (header + faithful applied DDL body, body sha `b38e36f3…`; rollback ref recorded). This is the clearest ledger
  candidate — it changes a function definition.
- **The five data applies** (logo promote + `brand_logo_url`, shared-bg promote, pool-policy, governance,
  assignment/proof) → recorded **here + in the v6.05 register pointer**, **not** as migration files: they are
  UUID-specific, CAS/idempotency-guarded governed DML — record-only, not replayable schema. (Two earlier
  in-progress backfill-record files for shared-bg/pool-policy exist untracked on the stale local main working
  tree; their facts are folded into this doc and they are intentionally not carried into this commit.)

## Chain / tier / guardrails honoured

- **T3** every production apply: db-rls-auditor clean + external review pinned per apply + PK apply gate; every
  external escalation was `policy_decision`-class (no concrete defect) → PK-authorised.
- Pool-neutrality preserved on every apply (other clients' pools unchanged); fenced-until-approved default.
- `apply_migration` / raw-deploy deny-listed → `execute_sql` only. Secrets: none handled in this lane.
- This recording lane: isolated worktree off origin/main `562bd76` (register-churn pattern); local stale main
  (behind origin 4, dirty) **not** touched; commit/push remain PK-gated hard stops.

## Carries / follow-ups (non-blocking)

- Footer LinkedIn banner (`task_a6e31a0f`) — template Footer is text-only + no banner asset exists yet.
- Logo-tone: closed by v6.04 (square badge live); the earlier full-colour-faint chip (`task_906f13d3`) is
  superseded.
- CFW handoff — `_harness/cc0044_cpd_invegent_20260720/CFW_HANDOFF_b2fix_and_closure.md`; CFW session ARCHIVED →
  deliver on unarchive.
- End-to-end CFW closure (`49f5b676`) still blocked on B1 (source one CFW background) — unchanged by this lane.

## Source artifacts

- Closeout packet: `_harness/cc0044_cpd_invegent_20260720/CLOSEOUT_register_pointers.md`
- Full lane state: `_harness/cc0044_cpd_invegent_20260720/SESSION_SEED_cpd_invegent.md`
- B2 fix + rollback: `_harness/cc0044_b2_shared_attr_fix_20260720/{fix_apply.sql,rollback_apply.sql}`
- Outcome brief: `docs/briefs/cc-0044-ultimate-tmr-proof-1-data-only-onboarding.md` (untracked draft on local main)
