# Brief — ap2-tmr-drift-probe-v0

**Created:** 2026-07-06 Sydney
**Author:** chat (drafted by brief-author v1 — first code/DB-lane brief under its scoped promotion; candidate-level scrutiny applies)
**Executor:** Claude Code
**Status:** draft — ⛔ awaiting PK Gate 1
**Result file:** `docs/briefs/results/ap2-tmr-drift-probe-v0-result.md` (created on completion)

**Lane classification (CCF-02):** **T3 · SAFETY_GATE** — new edge function + new table + daily pg_cron (deploy + DDL + cron = full T3 chain and PK conditional deploy sequence).

---

## Task

Build, prove, and (via PK conditional sequence) deploy **TMR Provider/Registry Drift Probe v0**: a scheduled, read-only-against-the-world probe that mechanizes the manual Creatomate Provider Reconciliation v0 (`docs/briefs/results/creatomate-provider-reconciliation-v0-result.md`) and the ratified TMR-GOV-PROVIDER-1 guard (`docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md`). Rationale on record: **15 of the 16 live-selectable generics have zero code anchors — the registry is the ONLY deletion guard**; the fb9820f8 provider-side deletion took PP image_quote production down ~27h; the pilot closeout names "periodic provider-inventory drift probe" as a standing carry (`docs/briefs/results/tmr-pilot-closeout.md` §4). The probe runs daily, performs three checks (provider↔registry · DB pool↔declared markers · render sanity), writes exactly one evidence row per run to its own new table, and fails LOUD (a probe error is a visible failed run, never an empty success). Five design decisions (D-AP2-1..5, Notes) are presented for PK at this gate.

## Source context

- `docs/briefs/results/ap1-pool-change-drift-evidence.md` — the **blind acceptance case**: DB resolver pool = **6 keys** (day-hero promoted v5.02) while exactly **three display/evidence surfaces still declare 5** — declarative `property-pulse.json` v0.4, dashboard vendored registry (v0.4 @ b9d02ca) + assets-panel expectedKeys, and vendored contract v2 `governed_assets.background` in both workers (§2). Provider↔registry is currently 1:1 clean; the 490ad9ea/fb9820f8/bc32f52f deletions are already reconciled (§3). The probe must independently flag **exactly those three surfaces and nothing else**.
- `docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md` — the manual checklist being mechanized; checks 1 (registry vs provider id), 6 (recent-render usage), 7 (post-cleanup matrix re-run) are the probe's direct ancestors; line 17 records the probe itself and the `CREATOMATE_GENERICS_API_KEY` split as *separate* standing follow-ups.
- `docs/briefs/results/creatomate-provider-reconciliation-v0-result.md` — the manual v0: three legs (static sweep · registry matrix · provider truth via 2 GETs), join outputs (missing/extra/renamed vs `c.creative_provider_template`), verdict 16==16. AP-2 is its scheduled automation.
- `supabase/functions/drift-check/index.ts` — the proven sibling pattern: missing env → HTTP 500 + no DB writes; per-item fetch failure → `errors[]` + batch continues; writes via a dedicated writer to its own log table; `verify_jwt:false` convention. Fired daily by pg_cron `drift-check-daily-fire` jobid 80, `0 17 * * *` UTC.
- Marker surfaces for check (b): `docs/creative-library/property-pulse.json:4` (`registry_version: v0.4`) with 5-key pools; `supabase/functions/image-worker/creative_contract.ts:121,168` (contract v2 5-key pool) + the ai-worker copy.
- Per-platform pool fact: fb/li pool = 6, **instagram = 5 via `platform_scope` fence** (registers v5.02) — checks (b)/(c) must be platform-aware (Q-AP2-2).

## Scope

**In scope:** one new small edge function `supabase/functions/tmr-drift-probe/`; one new evidence table + writer path (recommended `c.tmr_drift_probe_run`, SECDEF/grants per house pattern); deno tests; the three v0 checks (D-AP2-2); one daily pg_cron schedule (D-AP2-5); result doc + ≤5-line register pointers.

**Out of scope:** fixing any drift the probe finds (AP-3 sweeps the doc/dashboard surfaces; AP-4 contract v3 ends per-key lag) · dashboard surfacing of probe results (named follow-up, D-AP2-4) · any new secret incl. the `CREATOMATE_GENERICS_API_KEY` split · alerting infra · stamper-v2 · any registry/asset/status mutation · Lane A safety gates.

## Allowed actions

ef-builder isolated worktree (EF + tests; PGlite/hermetic proof of table + writer migration before any live gate) · new-name migration with RLS/grants per house SECDEF pattern (`REVOKE ... FROM PUBLIC, anon, authenticated`; service-role-only writer) · probe logic: GET-only against Creatomate `/v1/templates` using the EF-resident `CREATOMATE_API_KEY`; SELECT-only against `c.creative_provider_template`, the resolver pool, build-time-vendored markers, `m.post_render_log` · fail-loud per the drift-check pattern · named live pre-check before Gate 2: one GET confirming the key enumerates the project holding the 16 registered generics (Q-AP2-1) · full T3 chain: deno → branch-warden → db-rls-auditor (table/grants) → security-auditor (new secret-using EF) → external review on the final diff → PK conditional deploy sequence (`--no-verify-jwt`) → cron.schedule as the sequence's final step (D-AP2-5).

## Forbidden actions

No provider writes of any kind (GET only; TMR-GOV-PROVIDER-1 governs all provider mutation) · probe writes ONLY its own evidence table (no writes to `c.creative_provider_template`, `c.client_brand_asset`, `c.tmr_shadow_decision`, `m.post_render_log`, registry docs, or any status/approval field) · no new secret in v0 · no fixing of found drift (AP-3/AP-4's lanes) · no render/publish/deploy authority beyond this lane's own EF · no background promotion/deactivation (the 5 fenced P0 candidates stay fenced) · **no enforcement behaviour** — the probe informs (evidence rows), never blocks/gates/auto-remediates (consistent with all CC guards remaining log-only) · fail-silent forbidden · deploy/DDL/cron = HARD STOPS inside the PK conditional sequence (conventions 1–2, 7 mandatory STOPs; migration names permanent) · registers = ≤5-line pointers, commits PK-gated.

## Success criteria

- **Blind acceptance case flagged exactly**: first proving run independently flags the three lagging 5-key surfaces vs DB pool 6 — and nothing else.
- **Zero false positives on the clean provider↔registry axis** (16==16 baseline; already-reconciled deletions not re-flagged).
- **Render sanity clean**: last N B1 renders' `background_key` ∈ current pool.
- **One machine-readable evidence row per run**; an induced-error test produces a visible FAILURE record, never an empty success.
- **Chain complete**: deno green · db-rls-auditor pass (anon/authenticated provably excluded) · security-auditor GREEN · branch-warden safe · external review clean · PK conditional sequence zero STOPs · cron job visible in `cron.job` at the approved offset with its first natural fire verified.

## Stop condition

Report result, then stop. Deploy, migration apply, and cron.schedule occur ONLY inside the PK-approved conditional sequence; any tripped STOP voids the remainder. Register commits await PK instruction.

---

## Notes — Gate-1 design decisions (PK decides; recommendations only)

- **D-AP2-1 — probe surface.** *Recommend NEW small EF `tmr-drift-probe`* (different data domain + secret + blast radius than `drift-check`; independent rollback). Alternative: extend drift-check.
- **D-AP2-2 — checks in v0.** (a) provider↔registry (the outage class); (b) pool-lag: DB resolver eligible pool (full filter chain, **per-platform sets**, doc markers diffed against the union) vs the `registry_version`-tagged pools the docs declare, markers **vendored into the EF at build time** (runtime-import guard preserved); (c) render sanity, last 20 B1 renders.
- **D-AP2-3 — evidence sink.** *Recommend new table `c.tmr_drift_probe_run`* (one row per run; dedicated-log-table precedent).
- **D-AP2-4 — signal path.** *Recommend evidence-row-only in v0*; dashboard surfacing (ICE Health card) = named follow-up lane; no new alerting infra.
- **D-AP2-5 — cadence.** Daily, *recommend `30 17 * * *` UTC* (30 min after drift-check jobid 80); cron.schedule rides as the final step of this lane's conditional sequence (S1 precedent supports a separate gate if PK prefers).

**Watch item:** brief-author's first code/DB-lane brief — candidate-level scrutiny per the v4.99 scoped promotion.

**Open questions:** Q-AP2-1 provider key/project identity (named live pre-check) · Q-AP2-2 per-platform comparator + marker strategy · Q-AP2-3 lane numbering · Q-AP2-4 cron offset + gate structure · Q-AP2-5 v0 surfacing confirmation.
