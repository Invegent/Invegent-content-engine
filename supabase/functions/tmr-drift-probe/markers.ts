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
//     day-hero bg_pp_perth_cbd_skyline_day_wide added to the pool → 6 keys.
//     AP-4 6→8 fold-in (2026-07-06, PP promotion v2 @ v5.16): two more ALL-PLATFORM
//     backgrounds promoted (bg_pp_advisory_desk_flatlay + bg_pp_kitchen_living_open_plan)
//     → registry_version v0.6, pool = 8 keys. This marker is now refreshed to the
//     8-key EIGHT_KEY_POOL below.
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
//     AP-4 6→8 re-vendor (2026-07-06, PP promotion v2 @ v5.16): vendored registry +
//     assets-panel expectedKeys raised 6→8 (add bg_pp_advisory_desk_flatlay +
//     bg_pp_kitchen_living_open_plan). This marker is now refreshed to the 8-key
//     EIGHT_KEY_POOL below.
//
// Acceptance context (docs/briefs/ap4-capability-contract-v3-packet.md, D-AP4-4, +
// the 6→8 background pool fold-in, PP promotion v2 @ v5.16): the live resolver union
// pool is now 8 keys. Two ALL-PLATFORM backgrounds (bg_pp_advisory_desk_flatlay +
// bg_pp_kitchen_living_open_plan) were promoted on top of the AP-3 day-hero, so the
// per-platform pools are fb/li=8, ig=7 (only day-hero bg_pp_perth_cbd_skyline_day_wide
// is platform_scope-fenced OFF instagram; the two new keys are ALL-PLATFORM). The UNION
// is 8. After AP-3 legs 1+2 + this 6→8 fold-in the declarative + dashboard surfaces
// declare 8; AP-4 retired marker_contract (the vendored worker contract rebound to
// policy:tmr_spine, no pool). Both remaining markers declare 8 keys and are current
// against the UNION pool (8) — so the probe's supervised run reports ZERO lagging
// markers (down from AP-3's one, AP-2's three), comparison against the UNION pool not
// per-platform ig (7) (comparePoolToMarkers, compare.ts).

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
 * The current 8-key pool the display/evidence surfaces declare after AP-3 legs 1+2
 * plus the AP-4 6→8 background pool fold-in (PP promotion v2 @ v5.16): the AP-3 6 keys
 * + two ALL-PLATFORM promotions (bg_pp_advisory_desk_flatlay + bg_pp_kitchen_living_open_plan).
 * Used by marker_declarative + marker_dashboard. The live pool is fb/li=8, ig=7 (only
 * day-hero bg_pp_perth_cbd_skyline_day_wide is platform-fenced OFF instagram; the two new
 * keys are ALL-PLATFORM); the probe compares markers against the UNION (8), so an 8-key
 * marker is current, not lagging. (The former 5-key CONTRACT_LAG_POOL was deleted with
 * marker_contract in AP-4; the 6→8 fold-in keeps marker_contract DROPPED.)
 */
const EIGHT_KEY_POOL: readonly string[] = Object.freeze([
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
  "bg_pp_perth_cbd_skyline_day_wide",
  "bg_pp_advisory_desk_flatlay",
  "bg_pp_kitchen_living_open_plan",
]);

export const POOL_MARKERS: readonly PoolMarker[] = Object.freeze([
  Object.freeze({
    marker: "marker_declarative",
    version: "v0.6",
    keys: EIGHT_KEY_POOL,
    source:
      "docs/creative-library/property-pulse.json registry_version v0.6 (AP-4 6→8 + contract v3)",
  }),
  Object.freeze({
    marker: "marker_dashboard",
    version: "v0.6",
    keys: EIGHT_KEY_POOL,
    source:
      "invegent-dashboard vendored registry v0.6 (AP-4 re-vendor 6→8) + assets-panel expectedKeys 8-key",
  }),
]);
