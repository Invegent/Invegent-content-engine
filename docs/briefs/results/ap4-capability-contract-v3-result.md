CLAIMED v5.18 · ap4-capability-contract-v3 · main-checkout+isolated-worktrees · commit-gate · 2026-07-06T21:52Z (renumbered v5.17→v5.18 — parallel session committed v5.17 PP market-data intake at c9c8ea8; my code legs 98f8af3/d3f634d/cf7ab9d already pushed underneath it)

# Result — AP-4 — Capability Contract v3 (policy: tmr_spine) + 6→8 pool fold-in (Autopilot sprint 4/5 — the loop-closer)

**Packet:** `docs/briefs/ap4-capability-contract-v3-packet.md` (Gate 1 D-AP4-1..5 PK-approved, **Option B**) · **Completed:** 2026-07-06
**Status:** ✅ ALL LEGS DEPLOYED + ACCEPTANCE PASSED EXACTLY — the daily drift probe (jobid 92) now self-reports **`status=ok`, ZERO lagging markers**. The TMR governance loop is fully green: pool-current and contract-permanent.

## 1. What shipped (four surfaces, one combined lane)

Two changes folded into one lane per PK direction: (i) **contract v3** — rebind the PP image_quote capability contract's `governed_assets.background` from a hardcoded 5-key `asset_keys` list to a **policy reference** (`policy: tmr_spine`, resolver `resolve_slot_assets`, **no key list**), the permanent fix for the last residual probe marker (`marker_contract`); and (ii) **6→8 pool fold-in** — the parallel PP background promotion v2 (register v5.16, `bg_pp_advisory_desk_flatlay` + `bg_pp_kitchen_living_open_plan`, both all-platform) grew the live pool 6→8, swept into every display/evidence surface + probe markers so the sweep is not invisible to the probe.

- **CE declarative (T1, commit `98f8af3`):** `property-pulse.json` v0.5→**v0.6** — 4 governed-superset sites 6→8 (`style_guide.backgrounds`, `pp_background_plus_scrim_v1.references_assets`, `governed_asset_dependency`, `centred-scrim-1x1.expected_assets`); platform note **fb/li=8, ig=7** (only day-hero fenced); `capability_contracts[].governed_assets.background` rebound to `policy:tmr_spine` (asset_keys REMOVED); **contract_version kept `v2`** (Option B — the field is an unstamped annotation). `registry-schema-v2.md` now admits the policy-reference `{policy:'tmr_spine', resolver, note}` background form (contract v3+). History-preserving (line-244 historical rotation prose untouched). creative-graph-auditor **PASS**.
- **CE vendored worker contracts (commit `d3f634d`):** `image-worker` + `ai-worker` `creative_contract.ts` edited **identically** (parity-guarded) — interface admits the policy-reference shape (`asset_keys` optional; `policy` widened to `string` to permit `'tmr_spine'`; `resolver`/`note` optionals); value rebound to `policy:tmr_spine`; **contract_version STAYS `'v2'`**. Tests: Test 6 now asserts `policy==='tmr_spine'`, `resolver==='resolve_slot_assets'`, NO `asset_keys`, `note` exists. **NOT redeployed this lane** — the rebound field is never stamped/never runtime-read (D-AP4-2), so it deploys lazily on the next natural worker deploy (benign documented inert-field repo↔deployed lag).
- **Probe (commit `cf7ab9d`, EF redeployed):** `markers.ts` — `marker_contract` + `CONTRACT_LAG_POOL` **DROPPED** (the contract declares no pool; the comparator is key-set-only, so a policy-only marker cannot be expressed — D-AP4-3); `SIX_KEY_POOL`→`EIGHT_KEY_POOL`; `marker_declarative` + `marker_dashboard` → **v0.6/8-key**. `compare.ts` (comparator) **UNCHANGED** — constants-only sufficed. `compare_test.ts`: ACCEPTANCE union=8 vs 8-key markers → ZERO lagging; per-platform fb/li=8, ig=7; direction-of-drift + deactivation guards recut; marker-constants asserts POOL_MARKERS.length==2, both v0.6/8-key, marker_contract absent. **deno 24/24.**
- **Dashboard (commit `046c365`, Vercel prod):** `registry.ts` re-vendored v0.5→**v0.6**, pool 6→8; `actions/creative-library.ts` `expectedKeys` logo+6→logo+8. Provenance is **version-symbolic** (`CE-registry-v0.6-AP-4`) — a deliberate choice to keep the review single-pass; the exact CE commit it mirrors is the docs commit **`98f8af3`** (recorded here). `tsc` + Next build clean (65/65).

## 2. The crux (D-AP4-2) — why contract_version stays v2 / no worker redeploy

`contract_version` IS stamped at runtime (`ai-worker/contract_stamp.ts` → `draft_format.contract` → echoed into `render_spec` by `image-worker/contract_echo.ts`, which copies exactly 4 identity fields: `contract_ref`/`contract_version`/`variant_key`/`selector_reason`). `governed_assets.background` is **NOT** stamped — an inert annotation. Rebinding it changes no stamped field → contract_version stays `v2`, no worker redeploy required. Independently re-verified by orchestrator code reading before acting (brief-author's first code-touching brief — candidate-level scrutiny).

## 3. Verification chain (all clean)

- creative-graph-auditor (CE v0.6): **PASS** — 4 governed sites same 8 keys, contract_version kept v2, background policy:tmr_spine no key list, platform note coherent, keys unique, references resolve, runtime-import guard holds; one pre-existing `approved_at:null` ADVISORY unrelated to this diff.
- db-rls-auditor (live pool truth): **PASS** — `c.client_brand_asset` for PP: exactly 8 governed/active backgrounds; day-hero fenced {facebook,linkedin}; the 2 new keys all-platform; per-platform ELIGIBLE (full `resolve_slot_assets` filter chain replicated) = **fb=8, li=8, ig=7** — matches markers one-for-one; resolver grants service_role/postgres only. Hygiene notes (non-blocking): 2 CBDs null `license_type` + valid `license` string; all 8 `needs_scrim` (→ 48-opacity path, expected).
- branch-warden: **safe** — worktree `ap4-contract-v3` @ `1070914` (six-file set, isolated, clean); parallel origin commits (v5.16 promotion + register reconcile + B3M harvest docs + a runtime chore, origin `1bc9eb3`) DISJOINT from all lane files → clean rebase target.
- ef-builder local checks: probe deno **24/24**; dashboard `tsc` exit 0 + Next build 65/65 (re-verified after the orchestrator's symbolic-provenance edit).
- **External review (combined diff): `agree` → proceed** (risk medium, confidence high, zero pushback, no escalation) — review_id `458b8ca6-d7fb-4165-b584-2698d0ffeb58`, pinned to combined-packet **sha256 `006c40b79df422d7e6c22dcccbe7cf39055ad107d4f7f71db3fde916c9d65d94`**. Confirmed (b) contract_version v2 sound given the stamp chain, (c) dropping marker_contract leaves no gap, (d) comparator key-set-only correct for union(8) vs 8-key with ig legitimately 7, (f) `policy:string` widening an acceptable localized loosening for an unstamped field.

## 4. Apply sequence (Convention-2, PK hash-approved "sequence approved go" — executed, zero STOPs tripped)

1. **CE integration (local):** local main ff `c1db738`→origin `1bc9eb3` (docs disjoint, preserved); worktree code cherry-picked (`64448f4`+`1070914`) onto main; docs committed → 3 commits `98f8af3`/`d3f634d`/`cf7ab9d`. Code parity vs reviewed worktree `1070914` **byte-identical** (empty diff); deno **24/24** on the integrated tree; full change set == exactly the 8 lane files, nothing stray.
2. **CE push** → origin/main `cf7ab9d` (re-verified origin unmoved at `1bc9eb3`; fast-forward).
3. **Dashboard** → committed in isolated worktree (main checkout was on a parallel session's branch — NOT touched, shared-worktree-race rule), ff-pushed branch→`origin/main` `317a593`→**`046c365`** (Vercel prod auto-deploy).
4. **Probe redeploy** (PK-run — deploy stays PK-gated): `supabase functions deploy tmr-drift-probe --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns`. Bearer-only gate intact (`config.toml` pins `verify_jwt=false`).
5. **Supervised acceptance** (§5 below).
6. This result doc + register pointers v5.18 (PK commit gate).

## 5. Acceptance (PASSED EXACTLY — D-AP4-4)

Supervised run via the cron path (`net.http_post` + vault `project_url`/`service_role_key` — the service-role key stayed in the DB, never in transcript), request_id `202814`, HTTP **200**. Evidence row `c.tmr_drift_probe_run.id = 37afba48-6b38-4968-be18-e506a94a7e6f` (run_at `2026-07-06T21:46:43.531Z`, `tmr-drift-probe-v1.0.0`):

- `status: ok` · `pool_drift: false` · **`lagging_markers: []`** (ZERO — down from AP-3's 1, AP-2's 3) · `union_pool_size: 8`
- provider: `provider_drift:false`, missing 0 / unregistered 0 / renamed 0, **known_historical 1** (fb9820f8, expected) → **16==16 clean**
- render: `render_drift:false`, **0 violations**, 19 checked, 1 legacy_shape (`c3c7489b`, informational — never drift)
- `errors: []`

The daily cron (jobid 92, `35 17 * * *`) will now self-report `ok` on its own next tick — the loop closes.

## 6. Carries / boundaries

- **Vendored worker contracts (image-worker + ai-worker `creative_contract.ts`) carry the contract-v3 rebind in repo but deploy LAZILY** on the next natural worker deploy — benign, documented, never-stamped, never-runtime-read, not-probe-checked inert-field repo↔deployed lag (D-AP4-2). No action required; will reconcile silently on the next worker version.
- Dashboard vendor provenance is **version-symbolic** (`CE-registry-v0.6-AP-4`), not a numeric CE SHA — deliberate, single-review choice; exact CE commit = `98f8af3` recorded here.
- A positive "still policy-bound?" contract marker (vs the dropped negative `marker_contract`) is a NAMED optional future follow-up (small `compare.ts` change) — not built.
- **NEXT (Autopilot sprint 5/5): AP-5 stamper v2.**
- No LIVE render-path change (`select_template`/`resolve_slot_assets`/`buildTmrRenderPlan`/`background_key` sourcing untouched — evidence-contract only) · no template/Creatomate/asset/D6/publish/registry-status/approval/proof change · no DB DML/DDL (the v5.16 pool promotion is a separate applied lane; its demotion rollback `5bea647e…` stands).
