# Brief — Spine Generalisation v1 (Ultimate TMR, Phase 5 — de-hardcode, dark-first)

**Created:** 2026-07-06 Sydney · **Author:** chat (orchestrator draft) · **Executor:** Claude Code
**Status:** draft — ⛔ awaiting PK Gate 1 · **Tier:** T2 (this lane — evidence-only/dark; the live-gate rewire is a later T3 lane) · **Label:** SAFETY_GATE
**Result:** `docs/briefs/results/spine-generalisation-v1-result.md`
**Predecessor evidence:** `docs/briefs/results/global-tmr-readiness-audit-v1-result.md` (v5.22) — the 5 PP-hardcoded chokepoints + the "resolver already generic" finding.

---

## Task

Begin de-hardcoding the governed-creative spine so a second client can enter it **without a code fork** — starting with the safest chokepoint and the reusable foundation, and explicitly **not** touching the live production render gate in this lane. Every change here is **behaviour-preserving and inert**: PP's governed behaviour stays byte-identical, and no other client becomes governed as a result (onboarding a client is a separate later *data* lane).

## Source context (from the audit, cited)

The audit (v5.22) established: the DB resolver layer is already client-generic (`select_template`/`resolve_slot_assets` take a slug, zero PP literal), but **five chokepoints are PP-hardcoded**. They span three risk tiers:
- **Live production (T3):** the Option-D gate `isB1GovernedImageQuote`→PP UUID (`image-worker/b1_production.ts:69`), `B1_GOVERNED_CLIENT_SLUG` (`:33`), and the capability-contract resolver duplicated in both workers (`{image,ai}-worker/creative_contract.ts:124-221`). Rewiring these changes the live render/stamp path.
- **Evidence-only / dark (T2):** the drift probe — `PP_CLIENT_ID` (`tmr-drift-probe/index.ts:99`), the B1 label filter, and the vendored PP-only `POOL_MARKERS` (`markers.ts:77-103`). Consumed by nothing at runtime; a change can't affect a render or publish.
- **Docs/config (T1/T2):** the declarative registry existing only as `property-pulse.json`.

ICE discipline is build-dark → prove → flip live (Option D, the AP lanes). So generalisation should start with the dark chokepoint + the reusable governance source, prove the pattern byte-identical, and only then rewire the live gate.

## The phasing (the central Gate-1 decision — D1)

Recommended arc, each its own PK-gated lane:
- **v1 (THIS lane, T2):** establish the reusable **client-creative-governance source** ("which client is governed for which format, with which contract-ref + declarative-registry-ref") populated to reproduce PP's current state exactly; then **generalise the drift probe** to read the governed client(s) + expected pool from that source instead of `PP_CLIENT_ID`/vendored markers. Dark, evidence-only, byte-identical for PP. This also permanently closes the AP-3/AP-4 "markers lag the live pool" carry (the probe derives per-client rather than snapshotting).
- **v2 (next, T3):** rewire the live image-worker gate + ai-worker contract resolver to consume the same governance source (behaviour-preserving: PP render byte-identical, non-PP still legacy because they have no governed data yet). Full T3 chain.
- **v3 (data lane, not code):** onboard NDIS Yarns — populate its governance row + declarative registry + assets/assignments — which is what actually flips a second client governed.

**D1 asks PK:** approve this dark-first phasing (recommended), or fold the live-gate rewire into v1 (raises this lane to T3), or sequence differently.

## Scope — v1 (assuming D1 = recommended)

1. **Client-creative-governance source.** A single lookup answering `governed(client_id, format) → { contract_ref, declarative_registry_ref, enabled }`. **Form is Gate-1 decision D2** (below). Populate it with exactly one row that reproduces today's truth: PP × `image_quote` → the existing contract + `property-pulse.json`. No other client governed.
2. **Generalise the drift probe** (`tmr-drift-probe`) to iterate the governed clients from the source (today: just PP) and resolve each one's expected background pool from the **live resolver/registry** rather than the vendored `POOL_MARKERS` constants — **D3 decides** whether to derive-live (closes the marker-lag carry but changes what "drift" detects) or keep vendored-per-client markers. `PP_CLIENT_ID`/`B1_PRODUCTION_LABEL`/`EIGHT_KEY_POOL` literals removed in favour of per-client values.
3. **Acceptance = byte-identical evidence for PP.** A supervised probe run after the change produces the same verdict shape as today for PP (`status` per live pool, provider 16==16, render sanity), and the governed-client set = exactly {PP}. Zero live render/publish/gate change.

**Explicitly OUT of v1:** the live image-worker/ai-worker gate + contract rewire (→ v2) · onboarding any client / populating NDIS data (→ v3) · multi-file declarative registry loader beyond the `_ref` pointer (→ v2/v3) · any new template/asset/format/promotion · dashboard.

## Gate-1 decisions (PK)

- **D1 — phasing.** Dark-first (v1 probe+source, v2 live gate, v3 onboarding) — **recommended**. *(alt: fold live gate into v1 → T3.)*
- **D2 — governance-source form.** (a) a thin new DB table `c.client_creative_governance` (explicit, auditable) — **recommended**; (b) a code config-manifest map; (c) derive implicitly from existing `creative_template_client_assignment` production_proven state (no new object, but couples gate to assignment churn). *(If (a): DML/DDL → this sub-step is T2 dark/additive with db-rls-auditor + a written+validated rollback.)*
- **D3 — probe pool source.** (a) derive each client's expected pool **live** from the resolver/registry (closes the marker-lag carry permanently; the probe stops needing vendored markers) — **recommended**, but note it changes drift semantics (it no longer catches declarative-doc lag, only live-vs-live); (b) keep per-client vendored markers (preserves declarative-lag detection; more maintenance). This is the AP-3 D-AP3-1 "derive-from-resolver" question, now live.
- **D4 — behaviour-preservation proof.** Supervised probe run: governed set == {PP}, PP verdict shape unchanged, zero live production change — **recommended** as the acceptance gate. Plus branch-warden + hermetic deno tests + external review pinned to the diff; db-rls-auditor if D2=(a).
- **D5 — the `resolve_brand_assets` repo-drift finding.** The audit found no `CREATE FUNCTION resolve_brand_assets` in `supabase/migrations/**` though it's used live. Fold a **read-only** capture (fetch live `pg_get_functiondef`, add to repo) into v1, or spin a separate tiny lane? **Recommend a separate tiny lane** (keep v1 focused) — but flag it here so it isn't lost.

## Boundaries (hard)

Behaviour-preserving + inert: **PP governed output byte-identical; no other client becomes governed by this lane.** No live image-worker/ai-worker gate or contract-resolver change (that is v2). No render, no publish, no promotion/intake, no template/asset/format change, no dashboard. If D2=(a) the only DDL is the additive governance table (dark, rollback written+validated before apply). The probe redeploy (if changed) is `--no-verify-jwt`, Bearer gate intact. Re-verify HEAD before any commit (active parallel churn). The lane **does not onboard a client** — it builds the mechanism and proves it changes nothing yet.

## Success criteria / Stop

**Success:** the governance source exists and resolves to exactly {PP × image_quote → current contract + registry}; the drift probe is client-driven (no PP literals) and a supervised run shows governed-set=={PP} with PP's verdict shape unchanged; hermetic tests green; all agent verdicts clean (db-rls-auditor pass if D2=(a), branch-warden safe); external review agree on the pinned diff; zero live production change. **Stop → PK:** any sign the change alters PP's live render/publish or governed selection; any non-clean verdict; any discovery that generalising the probe would make a second client's data go live prematurely.

## Note

This is the load-bearing enabler of the whole Ultimate-TMR roadmap, sequenced so the *first* generalisation lands on the one chokepoint that cannot break a render (the probe) and builds the source that the risky live-gate lane (v2) will reuse. Recommend approving **v1 only** at this gate; v2's T3 live rewire gets its own brief once the pattern is proven dark.
