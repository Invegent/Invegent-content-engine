CLAIMED v5.25 · spine-generalisation-v1 · isolated-worktrees · commit-gate · 2026-07-07T~00:10Z

# Result — Spine Generalisation v1 (Ultimate TMR, Phase 5 — dark-first de-hardcode)

**Packet:** `docs/briefs/spine-generalisation-v1-packet.md` (Gate 1 D1–D5 PK-approved as recommended) · **Tier:** T2 (core) + T3 (grant fix) · **Label:** SAFETY_GATE · **Completed:** 2026-07-07
**Status:** ✅ COMPLETE + ACCEPTANCE-PROVEN — the drift probe is now client-driven, PP behaviour preserved, no second client governed, zero live render/publish change.

## What shipped (2 CE commits, both pushed to origin/main)

1. **Core generalisation — commit `e65ac76`** (reviewed as `9ab519f`, byte-identical): additive `c.client_creative_governance` table (migration `20260707000000`, one PP row: `4036a6b5 × image_quote → property_pulse.image_quote.news_card / property-pulse.json / creative_library_b1_production`, `enabled=true`) + `tmr-drift-probe` **v2.0.0**: reads governed clients from the table (today {PP}), derives each client's expected pool **live** from the resolver, retires the vendored markers (`markers.ts` deleted, `POOL_MARKERS`/`comparePoolToMarkers` gone, `lagging_markers` field removed — D3). `PP_CLIENT_ID`/`B1_PRODUCTION_LABEL` literals removed. `compare.ts` comparator otherwise preserved; per-client render sanity + global provider check retained.
2. **Grant-gap fix — commit `f1ab019`** (T3): `GRANT SELECT ON c.client TO service_role;` (migration `20260707010000`).

## The STOP (honest record)

The core lane passed pre-apply review, but **supervised acceptance FAILED first** with `status=error`: `"governed_clients_select: permission denied for table client"`. Root cause: v2's `fetchGovernedClients()` joins `c.client` (for `client_slug`) — a read v1 never did — and **`service_role` had no grant on `c.client`** (only postgres). The probe did exactly what it's designed to: fail-closed, wrote one honest error row, broke nothing (dark/evidence-only; nowhere near a render/publish). The pre-apply db-rls-auditor review had asserted service_role held this grant — a review miss (same class as AP-2's grant gap). The STOP voided the sequence; PK approved Fix A (the grant) as a fresh T3 gate.

## Review chain

- **Core (table + probe):** db-rls-auditor PASS (FK/RLS/grants/ordering/seed) · branch-warden safe (`9ab519f`, exactly 5 files, `markers.ts` true delete) · deno **26/26** + lint 0 · external review pinned to the diff (`85337073…`, partial→structural-DDL escalation, no concrete defect → PK).
- **Grant fix:** db-rls-auditor PASS zero-must-fix (c.client sole gap, minimal grant, no widening) · **security-auditor GREEN** (service_role backend-only; c.client holds no secrets [vault]; no untrusted-principal gain; trivial rollback) · branch-warden safe (`f1ab019`, 1 file, off origin/main, LinkedIn commit `4e81263` absent) · external review **agree** (`334f0905`, medium/high) → structural escalation to PK.

## Apply + acceptance

Core: migration `20260707000000` applied + probe v2.0.0 deployed `--no-verify-jwt` (PK-run). Grant: `20260707010000` applied by PK via SQL editor; **ledger reconciled** (INSERT into `supabase_migrations.schema_migrations`) so repo↔DB match. Post-grant verification: `service_role` gained SELECT on `c.client`; anon/authenticated/PUBLIC **unchanged (none)**; independent resolver-filter count confirms the live pool.

**Supervised acceptance — PASSED (run `203785`, evidence in `c.tmr_drift_probe_run`):**
- `status=ok` · version `tmr-drift-probe-v2.0.0`
- `governed_clients == ['property-pulse']` (slug, not UUID) · count 1
- provider missing 0 / unregistered 0 → **16==16 clean**
- PP render sanity: **0 violations** / 20 checked / 1 legacy_shape · `live_pool_size=11` (derived live)
- **no `lagging_markers` field** (retired by design, D3) · `errors: []`
- **prior error row PRESERVED** (`ok@11:04 | error@09:35 | drift@09:22`) — honest evidence, not edited away.

All D4 conditions met: governed-set=={PP}; PP verdict clean; no live production change; no second client governed; full chain + PK gates passed.

## Carries / next

- **D3 consequence (as approved):** the probe now reports **live** truth (`live_pool_size=11`), while the register/declarative say 9 (v5.20 + the v5.24 "pool-neutral" balcony/coastal intake). **The live PP eligible background pool is 11, independently confirmed** — the declarative/register lag by 2. Under D3 this is a **separate audit/dashboard concern**, no longer a probe drift signal. Flag for the declarative/dashboard sweep (Phase 4) or a mini-reconcile: register says 9, live is 11 — reconcile the truth.
- **NEXT = Spine Generalisation v2 (T3):** rewire the live image-worker gate (`isB1GovernedImageQuote`, `b1_production.ts:69`) + the ai-worker contract resolver to consume `c.client_creative_governance` (behaviour-preserving: PP byte-identical, non-PP still legacy). Its own Gate-1 brief.
- **Then v3 (data lane):** onboard NDIS Yarns — populate its governance row + declarative registry + assets/assignments.
- Review-quality note: db-rls-auditor's pre-apply grant claim was wrong twice-running for this probe (AP-2 m.post_render_log; here c.client) — worth having grant checks assert via a live `SET ROLE service_role` probe rather than reading `role_table_grants` alone.

## Boundaries honoured

No live render gate rewire (that is v2) · no Option-D production behaviour change · no NDIS onboarding · no asset intake/promotion · no template promotion · no publisher/render mutation. Only surfaces touched: the additive governance table, the dark drift probe, and the one backend grant. Local main + the unrelated parallel LinkedIn commit `4e81263` never touched (R4).
