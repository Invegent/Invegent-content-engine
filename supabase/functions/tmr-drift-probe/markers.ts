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
// Marker vendoring history:
//
//   marker_declarative — docs/creative-library/property-pulse.json
//     AP-3 leg 1 (2026-07-06, CE @ 003bdb0): registry_version bumped v0.4→"v0.5",
//     day-hero bg_pp_perth_cbd_skyline_day_wide added to the pool → 6 keys. This
//     marker is now refreshed to the 6-key SIX_KEY_POOL below.
//
//   marker_contract — supabase/functions/image-worker/creative_contract.ts
//     contract_version 'v2' (line 122); governed_assets.background.asset_keys 5-key
//     pool (line 168); identical vendored copy in supabase/functions/ai-worker/
//     creative_contract.ts (contract v2, both workers — AP-1 evidence §2 row 3).
//     DELIBERATELY UNCHANGED at 5 keys: the vendored worker contract is refreshed
//     by AP-4/contract-v3, NOT AP-3. A probe run still flagging marker_contract
//     after AP-3 is the CORRECT expected outcome — this marker keeps the 5-key
//     CONTRACT_LAG_POOL below.
//
//   marker_dashboard — invegent-dashboard vendored registry
//     AP-3 leg 2 re-vendor (2026-07-06, dashboard re-vendor to v0.5 @ CE 003bdb0):
//     vendored registry + assets-panel expectedKeys raised 5→6 (add day-hero).
//     This marker is now refreshed to the 6-key SIX_KEY_POOL below.
//
// AP-3 acceptance context (docs/briefs/ap3-declarative-dashboard-drift-sweep-v0-packet.md):
// the live resolver union pool is 6 keys (day-hero bg_pp_perth_cbd_skyline_day_wide
// promoted v5.02; fb/li=6, ig=5). After AP-3 legs 1+2 the declarative + dashboard
// surfaces declare 6; only the vendored worker contract still declares 5. The probe's
// post-AP-3 supervised run must therefore flag EXACTLY ONE lagging marker
// (marker_contract), down from the AP-2 three — comparison is against the UNION pool
// (6), not per-platform ig (5), so the 6-key markers do not lag (comparePoolToMarkers,
// compare.ts).

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
 * The 5-key pool the vendored worker CONTRACT still declares (contract v2). Order
 * matches the resolver rank order recorded in contract v2 (B1-v3 alignment). Used
 * ONLY by marker_contract — it lags the live 6-key union pool by design until
 * AP-4/contract-v3 refreshes the worker contract. Do NOT add day-hero here.
 */
const CONTRACT_LAG_POOL: readonly string[] = Object.freeze([
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
]);

/**
 * The current 6-key pool the display/evidence surfaces declare after AP-3 legs 1+2
 * (CE declarative v0.5 @ 003bdb0 + dashboard re-vendor v0.5 @ 003bdb0). This is
 * CONTRACT_LAG_POOL plus the day-hero key. Used by marker_declarative + marker_dashboard.
 * The live pool is fb/li=6, ig=5 (day-hero platform-fenced OFF instagram); the probe
 * compares markers against the UNION (6), so a 6-key marker is current, not lagging.
 */
const SIX_KEY_POOL: readonly string[] = Object.freeze([
  ...CONTRACT_LAG_POOL,
  "bg_pp_perth_cbd_skyline_day_wide",
]);

export const POOL_MARKERS: readonly PoolMarker[] = Object.freeze([
  Object.freeze({
    marker: "marker_declarative",
    version: "v0.5",
    keys: SIX_KEY_POOL,
    source:
      "docs/creative-library/property-pulse.json registry_version v0.5 @ CE 003bdb0",
  }),
  Object.freeze({
    marker: "marker_contract",
    version: "v2",
    keys: CONTRACT_LAG_POOL,
    source:
      "supabase/functions/image-worker/creative_contract.ts governed_assets.background.asset_keys (contract v2, line 168) + identical ai-worker vendored copy @ 59214af",
  }),
  Object.freeze({
    marker: "marker_dashboard",
    version: "v0.5@003bdb0",
    keys: SIX_KEY_POOL,
    source:
      "invegent-dashboard vendored registry v0.5 @ CE 003bdb0 (AP-3 leg 2 re-vendor) + assets-panel expectedKeys 6-key",
  }),
]);
