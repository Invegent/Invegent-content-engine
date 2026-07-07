# Brief — Global TMR Readiness Audit v1 (Ultimate TMR, Phase 1)

**Created:** 2026-07-06 Sydney · **Author:** chat (orchestrator draft) · **Executor:** Claude Code
**Status:** draft — ⛔ awaiting PK Gate 1 · **Tier:** T1 (read-only) · **Label:** SAFETY_GATE (governed-readiness audit + production-safety exposure surfacing)
**Result:** `docs/briefs/results/global-tmr-readiness-audit-v1-result.md`

---

## Task

Produce a **read-only** Global TMR Readiness Matrix: where every existing ICE client stands against the governed-creative TMR model, plus a **recommended rollout order** and a cross-cutting **generic-vs-PP-hardcoded inventory** of the spine. Non-mutating: no promotion, no intake, no template/asset/schema/dashboard change. The output is intelligence that lets PK approve (or reject) each later "Ultimate TMR" phase on evidence rather than as a batch. This is Phase 1 of the ultimate-TMR roadmap; **nothing downstream (onboarding contract, backfill, global dashboard, global resolver) starts before this matrix exists.**

## Why this lane, why now

PP has proven the TMR spine end-to-end (Option D: `select_template → resolve_slot_assets → buildTmrRenderPlan → render → shadow-agree → publish → proven`; drift probe green, v5.18). The strategic question is no longer "does TMR work?" but **"where does every client stand, and in what order do we bring them in?"** That is an audit, not a build — read-only, bounded (~4 clients), and it right-sizes every subsequent phase. It also fits the ICE discipline of audit/cartography before build, and maps onto the PK-ratified Seven Pillars lens (a maturity read across P2 Creative · P3 Render · P6 Config/Client).

## Source context (to be VERIFIED in the audit, not assumed)

The substrate is further along than a greenfield build implies — the audit's first job is to confirm exactly what already exists and what is genuinely PP-specific:
- **Client set (confirm):** Property Pulse, NDIS Yarns, Invegent, Care for Welfare (per `c.client`). ~4 clients — a bounded N.
- **Existing governance primitives (confirm shape + per-client population):** `c.client_brand_profile` · `c.client_brand_asset` (with `platform_scope` fencing + approval/governance/`intake_candidate` states) · `creative_template_client_assignment` (per-client template assignments *with* `creative_template_proof_event`) · `creative_provider_template` · format-mix policy · `c.tmr_shadow_decision` (shadow evidence) · `c.tmr_drift_probe_run` (drift evidence).
- **Resolver is already client-parameterized:** `resolve_brand_assets`, `resolve_slot_assets(p_client_slug,…)`, `select_template(client_slug,…)` all take a client — the resolver signature is generic; PP-specificity concentrates in (a) vendored worker constants / the `creative_library_b1_production` label path and (b) the fact that the declarative Creative Library has only `property-pulse.json` so far. **The audit must locate every residual PP hardcode** (e.g. `PP_CLIENT_ID` in `tmr-drift-probe/index.ts`, B1 label filters, single-client declarative registry).
- **Only PP is TMR-proven.** NDIS carries avatar/voice ambitions (HeyGen dormant / "do not start"; ElevenLabs voice path had a getBrand slug issue); Invegent/CFW likely barely onboarded (0 character models each).
- **Production-safety backlog is open (Lane A / B1–B5):** asset-missing publishes, render-on-dead-drafts, approve→publish stuck, video published without T2 QA. Scaling governed creation across clients multiplies the blast radius of these gaps — so readiness is not just "can we create?" but "can we create *safely*?"

## Scope — the matrix

For **each existing client**, audit these dimensions (PK's 10 + 1 added), each answer **evidence-cited or explicitly `unknown`**:

| # | Dimension | Question |
|---|---|---|
| 1 | Brand kit | logo · colors · fonts · visual rules present in `client_brand_profile`? |
| 2 | Asset pool | backgrounds/brand images — active / approved / fenced / intake_candidate / missing (`client_brand_asset`) |
| 3 | Template families | registered templates + `creative_template_client_assignment` state |
| 4 | Platform suitability | which templates resolve on FB / LI / IG / YouTube / website (via `platform_scope` + assignment) |
| 5 | Format mix | which formats enabled/disabled per client |
| 6 | Render proof | smoke-rendered / production-rendered (`post_render_log` + proof events) |
| 7 | Publish proof | live output per platform (`post_publish`) |
| 8 | Policy / compliance fit | text limits, disclaimers, regulated-claim constraints (esp. NDIS) |
| 9 | Provider readiness | Creatomate / HeyGen / ElevenLabs / image path / Zapier path — current recorded state only (no external probing) |
| 10 | **Safety exposure (added)** | per-client exposure to the Lane A B1–B5 gaps (asset-missing publish, render-on-dead-draft, approve→publish stuck, video-without-QA) |
| 11 | TMR status (roll-up) | one of the readiness classes below |

**Readiness classification (per client):** `TMR-ready` · `needs asset intake` · `needs template mapping` · `needs platform mapping` · `needs render proof` · `needs publish proof` · `not onboarded` (first-match / lowest-unmet-rung wins).

**Plus one cross-cutting section (not per-client):** the **generic-vs-PP-hardcoded inventory** — every place the spine assumes Property Pulse (constants, label filters, single-client registry, probe scoping), each with a file/line citation, classified `already-generic` / `PP-hardcoded-must-generalise` / `PP-hardcoded-acceptable`. This is what de-risks and right-sizes the later resolver/onboarding phases.

## Output

`docs/briefs/results/global-tmr-readiness-audit-v1-result.md` containing: (1) the readiness matrix (clients × 11 dimensions, every cell cited or `unknown`); (2) the generic-vs-PP inventory; (3) a **recommended rollout order** with rationale (which client next, and which phase — intake vs template-mapping vs proof); (4) an explicit "what this audit did NOT verify" list. Docs-only; no schema, no UI.

## Method (all read-only)

Reuse proven agents, no mutation anywhere:
- `ice-architecture-cartographer` → the spine map + the generic-vs-PP inventory (static, cited).
- `db-rls-auditor` → live per-client state (brand profile, asset pool, assignments, proof events, render/publish rows) via SELECT-only reads. Required because the DB **is** part of the audit subject (CCF-02 R1).
- Orchestrator synthesis → the matrix + rollout order from the returned findings. Optional `security-auditor` only if a provider-readiness question touches secret posture (read-only).

## Gate-1 decisions (PK)

- **D1 — client scope.** Recommend **all 4** (PP, NDIS, Invegent, CFW) — small N, and a partial audit can't produce a rollout order. *(alt: PP + NDIS only.)*
- **D2 — readiness taxonomy.** Recommend **adopt PK's 7-class scheme** above as-is.
- **D3 — the 2 additions** (dimension 10 safety-exposure + the cross-cutting generic-vs-PP inventory). Recommend **include both** — they're the two things that most change the downstream sequencing.
- **D4 — provider-readiness depth.** Recommend **recorded current state only** (what the DB/config say today) — **no** live external calls to Creatomate/HeyGen/ElevenLabs. *(Keeps it read-only + cheap.)*
- **D5 — output form.** Recommend a **markdown result doc** first (matrix + rollout order); a rendered visual/artifact of the matrix is an optional add-on, not required for Gate 1.
- **D6 — does the audit recommend the Phase-2 onboarding-contract shape?** Recommend **NO** — the audit *inventories what exists* and names gaps; it does **not** design new tables or the onboarding contract (that is a separate later Gate-1 lane, informed by this matrix).

## Boundaries (hard)

Read-only throughout — **no DML/DDL, no promotion/intake/demotion, no template/asset/registry/schema change, no dashboard build, no new tables, no cron/EF/worker change, no external-provider calls or mutation, no render, no publish.** The audit **does not decide** the rollout — it *recommends* an order for PK. It **does not design** the onboarding contract, the global resolver, or the global dashboard — those are later PK-gated lanes this matrix informs. Every matrix cell is evidence-cited or `unknown`; a dimension that would require a mutation to determine is marked `unknown`, never resolved by mutating. No client's live selection/rotation is touched.

## Success criteria / Stop

**Success:** a complete clients × 11 matrix (every cell cited or `unknown`), the generic-vs-PP inventory, and a recommended rollout order — zero mutations, all agent verdicts clean (db-rls-auditor pass, cartographer PASS/WARN), and an explicit not-verified list. **Stop** (surface to PK): any dimension that cannot be answered read-only; any finding that a "readiness" claim would require touching production to confirm; any discovery that a client's live selection is at risk from an open safety gate (that becomes an immediate PK flag, not just a matrix cell).

## Note

This is the read-only first move of a much larger reframe (ICE as a productised, multi-client governed factory). It commits PK to nothing beyond the audit while making Phases 2–7 evidence-based. Recommend approving **only this lane** at Gate 1; let the matrix earn each subsequent phase.
