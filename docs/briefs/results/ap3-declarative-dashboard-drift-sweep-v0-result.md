CLAIMED v5.15 · ap3-declarative-dashboard-drift-sweep · main-checkout · commit-gate · 2026-07-06T10:20Z

# Result — AP-3 — Declarative + Dashboard Drift Sweep v0 (Autopilot sprint 3/5)

**Packet:** `docs/briefs/ap3-declarative-dashboard-drift-sweep-v0-packet.md` (Gate 1 D-AP3-1..5 PK-approved) · **Completed:** 2026-07-06
**Status:** ✅ ALL 3 LEGS DEPLOYED + ACCEPTANCE PASSED — the two swept surfaces are current; the probe now flags exactly ONE marker (contract), down from three.

## 1. What shipped (three legs, one pool: 5→6 + day-hero)

The AP-2 probe flagged three surfaces as lagging the live 6-key pool (day-hero `bg_pp_perth_cbd_skyline_day_wide`, promoted v5.02). AP-3 refreshed the two AP-3-owned surfaces + the probe's own markers:

- **CE declarative (T1, commit `003bdb0`):** `property-pulse.json` v0.4→**v0.5**, pool 5→6 at the 4 governed-superset sites (style_guide backgrounds prose · `pp_background_plus_scrim_v1.references_assets` · `governed_asset_dependency` · `centred-scrim-1x1.expected_assets`) + a **NEW fb/li=6-vs-ig=5 platform note** (day-hero `platform_scope={facebook,linkedin}`). History-preserving: line-244 historical rotation prose untouched (predates day-hero); line-299 contract "mod 5" left for AP-4. creative-graph-auditor PASS.
- **Dashboard (T2, commit `317a593`, Vercel prod):** `registry.ts` re-vendored v0.4→v0.5 @ CE 003bdb0, pool 5→6; `expectedKeys` logo+5→logo+6. tsc+build clean (65/65). creative-graph-auditor PASS (aligned). ff-pushed `0856dcb→317a593`.
- **Probe markers (T3, commit `bfa9b6e` [rebased from `d0305ee`], EF redeploy):** `markers.ts` — split the shared pool: `CONTRACT_LAG_POOL` (5, marker_contract) + `SIX_KEY_POOL` (6, marker_declarative+marker_dashboard). `marker_declarative`→v0.5/6, `marker_dashboard`→v0.5@003bdb0/6, `marker_contract` **unchanged** (v2/5). deno 24/24 (acceptance fixture flipped 3→1). Redeployed `--no-verify-jwt`, Bearer gate intact (unauth GET → 401).
- **Repeatable procedure (D-AP3-3):** addendum in `tmr-gov-provider-1` — *pending in the guard doc; recorded here as the durable deliverable* (on any governed pool change → refresh these surfaces + redeploy the probe).

## 2. The comparator open question — resolved constants-only (no code change)

The D-AP3 risk: docs/markers declare 6 but instagram legitimately resolves 5 (day-hero fenced). `comparePoolToMarkers` builds the **union** pool first (fb/li=6, ig=5 → union=6), then diffs each marker against union(6). So a 6-key marker vs union(6) → not lagging; ig's 5-key set is never the comparison basis → no false ig flag. Verified in-diff + by test; `index.ts`/`compare.ts` untouched (branch-warden confirmed).

## 3. Acceptance (PASSED exactly — D-AP3-4)

Supervised run via `net.http_post`+vault (the cron path), HTTP 200: **`status=drift`, `lagging_markers=["marker_contract"]`** (down from 3) · provider clean **16==16** (`provider_drift=false`) · render **0 violations + 1 legacy_shape** · errors []. The two swept surfaces now read current; the sole residual (`marker_contract`) is AP-4's to clear — after which the daily probe (jobid 92) flips to `ok` on its own.

## 4. Chain + sequence

Per-leg: CE creative-graph-auditor PASS · dashboard creative-graph-auditor PASS + branch-warden safe + external agree (`e5dcd91e…`) · probe branch-warden safe + deno 24/24 + external agree (`f7359968…`). PK conditional sequence (dashboard→probe ordered so `marker_dashboard` is true before the probe asserts it): dashboard ff-push → Vercel → **CE-origin STOP handled** (parallel commit `231764c` "reconcile v5.14 + pp b3m4", disjoint from tmr-drift-probe → probe rebased `d0305ee`→`bfa9b6e`, **pin `c35ba84…` re-verified byte-identical**) → probe ff-push → redeploy → acceptance. Zero unresolved STOPs.

## 5. Carries / boundaries

`marker_contract` + the contract surface (property-pulse.json line 299 "mod 5", worker `creative_contract.ts`) = **AP-4/contract-v3** (the by-design 6-vs-5 asymmetry) · D-AP3-3 guard-doc addendum to finalize · derive-from-resolver redesign (D-AP3-1) named future consideration. No asset/pool/worker-production/template/Creatomate/render/publish/D6 change; day-hero + ig fence already live (not this lane).
