# Brief — AP-3 Declarative + Dashboard Drift Sweep v0

**Created:** 2026-07-06 Sydney · **Author:** chat (drafted by brief-author v1) · **Executor:** Claude Code
**Status:** draft — ⛔ awaiting PK Gate 1
**Sprint:** TMR Autopilot + Safety Closure, lane 3/5 · **Result:** `docs/briefs/results/ap3-declarative-dashboard-drift-sweep-v0-result.md`

---

## Task

Sweep the three lagging **display/evidence** surfaces the live AP-2 drift probe now flags so they declare the **current 6-key** PP background pool (adding day-hero `bg_pp_perth_cbd_skyline_day_wide`, promoted v5.02), then **redeploy the probe** so it sees the sweep. AP-2's run reports `drift` with exactly three lagging markers — `marker_declarative`, `marker_contract`, `marker_dashboard` — each missing only day-hero (result §4). AP-1 assigned ownership: **AP-3 sweeps the CE declarative doc + the dashboard vendored registry**; `marker_contract` (the vendored worker contract) is **AP-4/contract-v3 and STAYS at 5**. Because the probe compares against build-time-vendored markers (`markers.ts`), AP-3 must also refresh `marker_declarative` + `marker_dashboard` and redeploy `tmr-drift-probe` — else the sweep is invisible to the probe. Three legs: (1) CE declarative docs, (2) dashboard re-vendor, (3) probe-marker re-vendor + redeploy. Docs + additive display + one probe-EF redeploy — no pool/asset/worker/template/Creatomate/contract change.

## Baseline (resolved this session)
- Live pool (register truth v5.06): **fb/li = 6, ig = 5** (day-hero fenced via `platform_scope={facebook,linkedin}`).
- CE `property-pulse.json`: registry_version **v0.4**; 5-key pool at lines **56, 149, 156, 238, 244** (in-scope); line **299** = the `capability_contracts` "mod 5" surface (OUT — AP-4). Day-hero key appears **0×** today; the doc has **no `platform_scope` field** → the fb/li-vs-ig note is NEW explanatory text.
- Dashboard **origin/main = `0856dcb`, v0.4 @ b9d02ca, `expectedKeys` = logo + 5 backgrounds** (orchestrator-verified — the earlier v0.2/3-key reading was a stale local feature branch). Dashboard leg bases off `0856dcb`; expectedKeys 5→6.

## Scope (three legs)
1. **CE declarative (T1 docs).** `property-pulse.json`: add day-hero to the 5 in-scope pool sites → 6; bump registry_version v0.4→**v0.5** + changelog; state the **fb/li=6 vs ig=5** reality (new note, not a flat 6). Additive/history-preserving (Lane D discipline). Contract surface (line 299) untouched. → creative-graph-auditor.
2. **Dashboard (T2, off `0856dcb`).** Re-vendor `lib/creative-library/registry.ts` to v0.5 @ the AP-3 CE commit; raise `actions/creative-library.ts` `expectedKeys` 5→6 (add day-hero). `tsc` + Next build clean. → creative-graph-auditor (vendor fidelity) + branch-warden + external review pinned to diff hash → PK Vercel deploy.
3. **Probe (T3 EF redeploy).** `tmr-drift-probe/markers.ts`: refresh `marker_declarative` (→v0.5, 6) + `marker_dashboard` (→new dashboard version, 6); **`marker_contract` unchanged (v2/5)**. deno suite green. Redeploy `--no-verify-jwt`, Bearer check intact. → supervised acceptance run.
4. **Repeatable procedure (T1 docs).** Addendum to `docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md`: "on any governed pool change → refresh these surfaces + redeploy the probe" — so future promotions don't silently re-lag.

**Out of scope:** asset promotion/demotion/deactivation (pool is already 6 live) · contract surface / `marker_contract` (AP-4) · derive-from-resolver redesign (D-AP3-1 future) · worker production paths · Creatomate/render/publish · D6 artifact + queued publish · AP-4/AP-5 · registry status/approval/proof.

## Gate-1 decisions (PK)
- **D-AP3-1** refresh-in-place (5→6, v0.5) — **recommend for v0**; derive-from-resolver = named future consideration (changes the probe's comparator).
- **D-AP3-2** include probe re-vendor + redeploy in AP-3 — **recommend YES** (else the sweep is invisible to the probe).
- **D-AP3-3** repeatable-procedure home — **recommend** the guard doc (already lists "dashboard vendored-registry refresh" as a follow-up).
- **D-AP3-4** acceptance = supervised probe run shows **exactly ONE lagging marker (`marker_contract`)**, down from 3; provider clean 16==16; 0 render violations. Full `ok` waits for AP-4.
- **D-AP3-5** sequencing — **recommend** CE declarative first (its commit is what the dashboard + probe markers cite), then dashboard + probe legs each its own gate.

## Open question needing a PK answer
- **Probe comparator vs 6-key marker + ig=5:** confirm the probe's per-platform/union check-b logic keeps ig=5 non-flagging against a 6-key marker with **marker-constant edits only**; if a code change is needed, that's a Gate-1 scope escalation (not absorbed silently). To be verified in the probe leg's build/tests.

## Success criteria / Stop
All 4 legs land; supervised probe run = exactly one lagging marker (contract); fb/li-vs-ig note present; procedure documented; per-leg review chains clean (creative-graph-auditor, branch-warden, external review for dashboard + probe diffs, PK deploy/redeploy gates). Convention-2 STOPs apply. Result doc + register pointer at close (PK commit gate).

## Boundaries
No asset row change (day-hero + ig fence already live; demotion rollback `3c5a8e2556…` is NOT this lane) · no contract-surface edit (a probe still flagging `marker_contract` after AP-3 is the CORRECT expected outcome) · redeploy only `--no-verify-jwt` with Bearer intact · no worker/template/Creatomate/render/publish/D6 change · additive + history-preserving.
