# TMR-GOV-PROVIDER-1 — Creatomate Pre-Cleanup Guard Checklist

**Status: RATIFIED by PK 2026-07-05** (Creatomate Provider Reconciliation v0 lane; packet `docs/briefs/creatomate-provider-reconciliation-v0-packet.md`, matrix `_harness/creatomate_provider_recon/coverage_matrix_v0.md`). Born from the 2026-07-04 incident: template `fb9820f8…` deleted in the Creatomate UI during cleanup → PP image_quote production down ~27h (fail-safe held, nothing broken published).

> **Rule:** before ANY Creatomate template is deleted, renamed, paste-overwritten (repurposed), or moved, run this checklist. A template that fails ANY check is production-coupled — deleting it is a production change and takes a PK-gated lane, not a UI click.

For each template you intend to touch, check its ID against:

1. **Registry check (live DB — the ONLY reliable guard):** `SELECT provider_template_name, status FROM c.creative_provider_template WHERE provider_template_id = '<id>'` — any row whose client assignment is `visually_approved`+ is **selectable by the live TMR selector**; deleting its provider template breaks production renders the moment it wins. ⚠️ *A code grep is NOT sufficient: 15 of the 16 live-selectable generics have zero code references (selection is data-driven) — proven by the v0 reconciliation matrix.*
2. **Code check (CE repo):** `grep -r "<id>" supabase/functions/` — any non-test, non-comment hit = a wired branch (production or opt-in).
3. **Contract check:** `grep "<id>" supabase/functions/*/creative_contract.ts` — vendored contract pins are evidence surfaces; changing the template's identity invalidates them (contract version bump lane).
4. **Dashboard check:** `grep -r "<id>" ../invegent-dashboard/lib ../invegent-dashboard/actions` — status cards/vendored registry may present it as truth.
5. **Repurposing rule (the `48cba556` lesson):** paste-overwriting a template's design KEEPS its ID — every registry row, contract, doc, and test pinning that ID then describes the wrong artwork. Repurposing = same gate as deletion, PLUS a registry re-capture in the same motion.
6. **Recent-render check:** `SELECT count(*) FROM m.post_render_log WHERE render_spec::text LIKE '%<id>%' AND created_at > now() - interval '30 days'` — recent production usage = hard stop.
7. **After any ratified cleanup:** re-run the Provider Reconciliation matrix and record the delta in the registers.

**Standing follow-ups this rule implies (separate gated lanes, recorded 2026-07-05):** periodic automated provider-inventory probe vs registry (detects silent provider-side loss of the un-anchored generics) · `CREATOMATE_GENERICS_API_KEY` secret split · dashboard vendored-registry refresh · dead-reference cleanups (`fb9820f8` contracts/docs/dashboard, `490ad9ea` smoke branch, `bc32f52f` video smoke branch, `48cba556` stale 16:9 identity refs).

## Addendum (AP-3, 2026-07-06) — governed background-pool change → refresh procedure

The AP-2 provider/registry drift probe (EF `tmr-drift-probe`, daily cron jobid 92) compares the **live** eligible pool against **build-time-vendored markers**. When a governed background is promoted/deactivated (the pool changes), the following surfaces silently lag until refreshed — and the probe cannot "see" a refresh until its own markers are re-vendored + the EF redeployed. On any governed pool change, run this sweep (each its own gated lane; AP-3 v5.15 is the worked precedent for the day-hero 5→6 addition):

1. **CE declarative** `docs/creative-library/property-pulse.json`: update the governed-superset pool at the 4 sites (style_guide backgrounds prose · `pp_background_plus_scrim_v1.references_assets` · `governed_asset_dependency` · `centred-scrim-1x1.expected_assets`); bump `registry_version`; state per-platform reality if a `platform_scope` fence applies (e.g. day-hero = fb/li only). Leave historical prose + the `capability_contracts` "mod N" contract surface (that's the contract-v3 lane). → creative-graph-auditor.
2. **Dashboard** `invegent-dashboard`: re-vendor `lib/creative-library/registry.ts` (source_commit + registry_version + pool) and raise `actions/creative-library.ts` `expectedKeys`. → creative-graph-auditor + branch-warden + external review → Vercel deploy.
3. **Probe markers** `supabase/functions/tmr-drift-probe/markers.ts`: refresh `marker_declarative` + `marker_dashboard` to the new pool/versions (keep `marker_contract` on the contract's own pool). Redeploy `tmr-drift-probe --no-verify-jwt` (Bearer gate intact) **AFTER** the dashboard deploy so `marker_dashboard` is true. → supervised acceptance run.
4. **Verify:** a supervised probe run shows the expected lagging-marker set (ideally 0; a still-lagging `marker_contract` is expected until contract v3). The comparator diffs each marker against the **union** pool, so a platform-fenced key (ig=5) does not false-flag a 6-key marker.
