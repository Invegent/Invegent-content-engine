// supabase/functions/tmr-drift-probe/markers.ts
//
// tmr-drift-probe v1.0.0 — BUILD-TIME-VENDORED pool markers (check b comparators).
//
// RUNTIME-IMPORT GUARD: this module is a pure, side-effect-free vendored SNAPSHOT of
// what each declared/display surface says the PP background pool is. There is NO live
// JSON import, NO read of docs/creative-library, NO network/DB/storage access here.
// The declarative registry is NEVER read at runtime (same guard as the workers'
// creative_contract.ts vendored snapshots) — these constants are updated only by a
// reviewed code change, which is exactly the point: when the DB pool moves and a
// marker below does not, the probe flags that surface as LAGGING.
//
// Each marker cites its source at vendoring time (2026-07-06, repo @ 59214af):
//
//   marker_declarative — docs/creative-library/property-pulse.json
//     registry_version "v0.4" (line 4); 5-key background pool (lines 56 / 149 / 156).
//
//   marker_contract — supabase/functions/image-worker/creative_contract.ts
//     contract_version 'v2' (line 122); governed_assets.background.asset_keys 5-key
//     pool (line 168); identical vendored copy in supabase/functions/ai-worker/
//     creative_contract.ts (contract v2, both workers — AP-1 evidence §2 row 3).
//
//   marker_dashboard — invegent-dashboard vendored registry v0.4 @ b9d02ca
//     (Lane-B re-vendor; separate repo, so vendored here by citation from
//     docs/briefs/results/ap1-pool-change-drift-evidence.md §2 row 2: dashboard
//     vendored registry + assets-panel expectedKeys both declare the 5-key pool).
//
// AP-1 blind acceptance context (docs/briefs/results/ap1-pool-change-drift-evidence.md):
// the live resolver pool is 6 keys (day-hero bg_pp_perth_cbd_skyline_day_wide promoted
// v5.02) while exactly these three surfaces still declare 5 — the probe's first proving
// run must flag exactly these three markers as lagging, and nothing else.

/** A declared/display surface's view of the PP background pool. */
export interface PoolMarker {
  /** Stable marker key used in evidence rows. */
  readonly marker: string;
  /** The version tag the surface itself declares. */
  readonly version: string;
  /** The background asset_key pool the surface declares. */
  readonly keys: readonly string[];
  /** Citation for where this marker was vendored from. */
  readonly source: string;
}

/**
 * The 5-key pool all three surfaces declared at vendoring time (2026-07-06).
 * Order matches the resolver rank order recorded in contract v2 (B1-v3 alignment).
 */
const FIVE_KEY_POOL: readonly string[] = Object.freeze([
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
]);

export const POOL_MARKERS: readonly PoolMarker[] = Object.freeze([
  Object.freeze({
    marker: "marker_declarative",
    version: "v0.4",
    keys: FIVE_KEY_POOL,
    source:
      "docs/creative-library/property-pulse.json (registry_version v0.4 line 4; pool lines 56/149/156) @ 59214af",
  }),
  Object.freeze({
    marker: "marker_contract",
    version: "v2",
    keys: FIVE_KEY_POOL,
    source:
      "supabase/functions/image-worker/creative_contract.ts governed_assets.background.asset_keys (contract v2, line 168) + identical ai-worker vendored copy @ 59214af",
  }),
  Object.freeze({
    marker: "marker_dashboard",
    version: "v0.4@b9d02ca",
    keys: FIVE_KEY_POOL,
    source:
      "invegent-dashboard vendored registry v0.4 @ b9d02ca (Lane-B re-vendor) + assets-panel expectedKeys, cited via docs/briefs/results/ap1-pool-change-drift-evidence.md section 2",
  }),
]);
