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
//   marker_contract — RETIRED by AP-4 contract v3 (2026-07-06).
//     The vendored worker contracts (image-worker + ai-worker creative_contract.ts)
//     rebound governed_assets.background from a hardcoded 5-key asset_keys pool to a
//     POLICY REFERENCE (policy: 'tmr_spine', resolver: 'resolve_slot_assets', no key
//     list). The contract now declares NO pool, so there is nothing key-set to compare
//     against the live union pool — the comparator is key-set-only (compare.ts), so a
//     policy-only marker cannot be expressed. marker_contract + its CONTRACT_LAG_POOL
//     are therefore DROPPED (D-AP4-3). This clears the last residual drift marker: the
//     post-AP-4 probe reports zero lagging markers. (contract_version STAYS v2 — the
//     rebind is an inert annotation, never stamped; no worker redeploy for this field.)
//
//   marker_dashboard — invegent-dashboard vendored registry
//     AP-3 leg 2 re-vendor (2026-07-06, dashboard re-vendor to v0.5 @ CE 003bdb0):
//     vendored registry + assets-panel expectedKeys raised 5→6 (add day-hero).
//     This marker is now refreshed to the 6-key SIX_KEY_POOL below.
//
// Acceptance context (docs/briefs/ap4-capability-contract-v3-packet.md, D-AP4-4):
// the live resolver union pool is 6 keys (day-hero bg_pp_perth_cbd_skyline_day_wide
// promoted v5.02; fb/li=6, ig=5). After AP-3 legs 1+2 the declarative + dashboard
// surfaces declare 6; AP-4 then retired marker_contract (the vendored worker contract
// rebound to policy:tmr_spine, no pool). Both remaining markers declare 6 keys and are
// current against the UNION pool (6) — so the probe's post-AP-4 supervised run reports
// ZERO lagging markers (down from AP-3's one, AP-2's three), comparison against the
// UNION pool not per-platform ig (5) (comparePoolToMarkers, compare.ts).

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
 * The current 6-key pool the display/evidence surfaces declare after AP-3 legs 1+2
 * (CE declarative v0.5 @ 003bdb0 + dashboard re-vendor v0.5 @ 003bdb0). Used by
 * marker_declarative + marker_dashboard (AP-3's SIX_KEY_POOL — UNTOUCHED by AP-4).
 * The live pool is fb/li=6, ig=5 (day-hero platform-fenced OFF instagram); the probe
 * compares markers against the UNION (6), so a 6-key marker is current, not lagging.
 * (The former 5-key CONTRACT_LAG_POOL was deleted with marker_contract in AP-4.)
 */
const SIX_KEY_POOL: readonly string[] = Object.freeze([
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
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
    marker: "marker_dashboard",
    version: "v0.5@003bdb0",
    keys: SIX_KEY_POOL,
    source:
      "invegent-dashboard vendored registry v0.5 @ CE 003bdb0 (AP-3 leg 2 re-vendor) + assets-panel expectedKeys 6-key",
  }),
]);
