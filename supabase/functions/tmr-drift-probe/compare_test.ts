// supabase/functions/tmr-drift-probe/compare_test.ts
//
// tmr-drift-probe v1.0.0 — fixture-driven tests for the pure comparison logic.
//
// Run: deno test supabase/functions/tmr-drift-probe/compare_test.ts
//
// Anchors the AP-4 acceptance case (docs/briefs/ap4-capability-contract-v3-packet.md
// D-AP4-4): provider↔registry 16==16 clean; DB union pool = 6 keys vs the post-AP-4
// markers (declarative v0.5 + dashboard v0.5, both 6-key; marker_contract RETIRED
// because the vendored worker contract rebound to policy:tmr_spine) -> ZERO lagging
// flags, the loop self-reports fully green (down from AP-3's one, AP-2's three);
// fb9820f8 classified known_historical, never drift.

import {
  assert,
  assertEquals,
  assertFalse,
} from "jsr:@std/assert@1";
import {
  type BrandAssetRow,
  checkRenderSanity,
  compareProviderRegistry,
  comparePoolToMarkers,
  computeEligiblePool,
  computeVerdict,
  KNOWN_HISTORICAL_PROVIDER_IDS,
  PROBE_PLATFORMS,
  PROVIDER_PAGE_LIMIT,
  providerListPossiblyTruncated,
  type ProviderTemplate,
  type RegistryTemplate,
} from "./compare.ts";
import { POOL_MARKERS } from "./markers.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FB9820F8 = "fb9820f8-3fee-4448-b324-3d500fa74b40";

/** 16 registered generics + the fb9820f8 known-historical row (17 registry rows). */
function makeRegistry(): RegistryTemplate[] {
  const rows: RegistryTemplate[] = [];
  for (let i = 0; i < 16; i++) {
    rows.push({
      provider_template_id: `00000000-0000-4000-8000-0000000000${
        String(i).padStart(2, "0")
      }`,
      provider_template_name: `Generic Template ${i}`,
    });
  }
  rows.push({
    provider_template_id: FB9820F8,
    provider_template_name: "PP News Card 1:1 (historical)",
  });
  return rows;
}

/** Provider truth: exactly the 16 generics (fb9820f8 deleted provider-side). */
function makeProvider(): ProviderTemplate[] {
  return makeRegistry()
    .filter((r) => r.provider_template_id !== FB9820F8)
    .map((r) => ({
      id: r.provider_template_id,
      name: r.provider_template_name as string,
    }));
}

const FIVE_KEYS = [
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
];
const DAY_HERO = "bg_pp_perth_cbd_skyline_day_wide";
const SIX_KEYS = [...FIVE_KEYS, DAY_HERO];

const NOW = new Date("2026-07-06T00:00:00Z");

function makeAssetRow(
  key: string,
  idx: number,
  overrides: Partial<BrandAssetRow> = {},
  metaOverrides: Record<string, unknown> = {},
): BrandAssetRow {
  return {
    asset_id: `a000000${idx}-0000-4000-8000-000000000000`,
    is_active: true,
    platform_scope: null,
    created_at: `2026-06-0${(idx % 9) + 1}T00:00:00Z`,
    asset_meta: {
      asset_key: key,
      usage: "background",
      approved: "true",
      license_type: "owned",
      bucket: "brand-assets",
      safe_for_text_overlay: "needs_scrim",
      ...metaOverrides,
    },
    ...overrides,
  };
}

/**
 * Live-DB fixture mirroring the AP-1 state: 6 eligible backgrounds; the
 * day-hero is platform-fenced OFF instagram (fb/li pool = 6, ig = 5,
 * registers v5.02 fence fact).
 */
function makeApOneAssetRows(): BrandAssetRow[] {
  const rows = FIVE_KEYS.map((k, i) => makeAssetRow(k, i + 1));
  rows.push(
    makeAssetRow(DAY_HERO, 7, {
      platform_scope: ["facebook", "linkedin"],
    }),
  );
  return rows;
}

function poolsFor(rows: BrandAssetRow[]): Record<string, string[]> {
  const pools: Record<string, string[]> = {};
  for (const p of PROBE_PLATFORMS) {
    pools[p] = computeEligiblePool(rows, p, NOW);
  }
  return pools;
}

// ---------------------------------------------------------------------------
// Check (a): provider ↔ registry
// ---------------------------------------------------------------------------

Deno.test("provider check: 16==16 clean baseline — fb9820f8 is known_historical, NOT drift", () => {
  const res = compareProviderRegistry(makeProvider(), makeRegistry());
  assertEquals(res.provider_missing, []);
  assertEquals(res.provider_unregistered, []);
  assertEquals(res.renamed, []);
  assertEquals(res.known_historical.length, 1);
  assertEquals(res.known_historical[0].provider_template_id, FB9820F8);
  assertFalse(res.drift);
  assertEquals(res.provider_count, 16);
  assertEquals(res.registered_count, 17);
});

Deno.test("provider check: allowlist contains exactly the single packet-cited id", () => {
  assertEquals(KNOWN_HISTORICAL_PROVIDER_IDS, [FB9820F8]);
});

Deno.test("provider check: a registered generic deleted provider-side lands in provider_missing (the outage class)", () => {
  const provider = makeProvider().slice(1); // delete generic 0 provider-side
  const res = compareProviderRegistry(provider, makeRegistry());
  assertEquals(res.provider_missing.length, 1);
  assertEquals(
    res.provider_missing[0].provider_template_id,
    "00000000-0000-4000-8000-000000000000",
  );
  // fb9820f8 STILL classified known_historical, not lumped into the outage class
  assertEquals(res.known_historical.length, 1);
  assert(res.drift);
});

Deno.test("provider check: an unregistered provider template lands in provider_unregistered", () => {
  const provider = [
    ...makeProvider(),
    { id: "99999999-9999-4999-8999-999999999999", name: "Rogue Template" },
  ];
  const res = compareProviderRegistry(provider, makeRegistry());
  assertEquals(res.provider_unregistered.length, 1);
  assertEquals(res.provider_unregistered[0].name, "Rogue Template");
  assert(res.drift);
});

Deno.test("provider check: same id different name -> renamed[]", () => {
  const provider = makeProvider();
  provider[3] = { ...provider[3], name: "Renamed By Someone In The UI" };
  const res = compareProviderRegistry(provider, makeRegistry());
  assertEquals(res.renamed.length, 1);
  assertEquals(res.renamed[0].id, provider[3].id);
  assertEquals(res.renamed[0].provider_name, "Renamed By Someone In The UI");
  assertEquals(res.renamed[0].registry_name, "Generic Template 3");
  assert(res.drift);
});

Deno.test("provider check (db-rls C5): a full 100-template page is possibly truncated -> guard fires (check error, never a false diff)", () => {
  assertEquals(PROVIDER_PAGE_LIMIT, 100);
  assertFalse(providerListPossiblyTruncated(16)); // live baseline
  assertFalse(providerListPossiblyTruncated(99));
  assert(providerListPossiblyTruncated(100)); // full page -> refuse to diff
  assert(providerListPossiblyTruncated(101)); // defensive: beyond the page limit too
});

Deno.test("provider check: null registry name never counts as renamed", () => {
  const registry = makeRegistry();
  registry[0] = { ...registry[0], provider_template_name: null };
  const res = compareProviderRegistry(makeProvider(), registry);
  assertEquals(res.renamed, []);
  assertFalse(res.drift);
});

// ---------------------------------------------------------------------------
// Check (b): eligible-pool filter chain replica
// ---------------------------------------------------------------------------

Deno.test("pool filter: AP-1 per-platform sets — fb/li = 6, instagram = 5 via platform_scope fence", () => {
  const pools = poolsFor(makeApOneAssetRows());
  assertEquals(pools.facebook.length, 6);
  assertEquals(pools.linkedin.length, 6);
  assertEquals(pools.instagram.length, 5);
  assert(pools.facebook.includes(DAY_HERO));
  assert(pools.linkedin.includes(DAY_HERO));
  assertFalse(pools.instagram.includes(DAY_HERO));
});

Deno.test("pool filter: each rejection reason excludes the row (mirrors resolve_slot_assets v1.1 chain)", () => {
  const base = makeApOneAssetRows();
  const cases: [string, BrandAssetRow][] = [
    ["inactive", makeAssetRow("bg_x_inactive", 8, { is_active: false })],
    ["is_active null", makeAssetRow("bg_x_nullactive", 8, { is_active: null })],
    ["not approved", makeAssetRow("bg_x_unapproved", 8, {}, { approved: "false" })],
    ["approved missing", makeAssetRow("bg_x_noapprove", 8, {}, { approved: null })],
    ["approved garbage text", makeAssetRow("bg_x_badapprove", 8, {}, { approved: "maybe" })],
    ["license missing", makeAssetRow("bg_x_nolicense", 8, {}, { license_type: null, license: null })],
    ["license expired", makeAssetRow("bg_x_expired", 8, {}, { license_expires_at: "2025-01-01T00:00:00Z" })],
    ["wrong bucket", makeAssetRow("bg_x_bucket", 8, {}, { bucket: "post-media" })],
    ["bucket missing", makeAssetRow("bg_x_nobucket", 8, {}, { bucket: null })],
    ["not text safe", makeAssetRow("bg_x_unsafe", 8, {}, { safe_for_text_overlay: "false" })],
    ["text safety unknown", makeAssetRow("bg_x_sfto_null", 8, {}, { safe_for_text_overlay: null })],
    ["unrecognised safety tag", makeAssetRow("bg_x_sfto_odd", 8, {}, { safe_for_text_overlay: "sometimes" })],
    ["not a background", makeAssetRow("bg_x_logo", 8, {}, { usage: "logo" })],
  ];
  for (const [label, row] of cases) {
    const pool = computeEligiblePool([...base, row], "facebook", NOW);
    assertEquals(pool.length, 6, `case '${label}' should be excluded`);
    assertFalse(
      pool.includes(row.asset_meta!.asset_key as string),
      `case '${label}' leaked into the pool`,
    );
  }
});

Deno.test("pool filter: pg-boolean approved literals accepted ('t','1','yes'); jsonb boolean true accepted", () => {
  const base = makeApOneAssetRows();
  for (const approved of ["t", "1", "yes", "TRUE", true]) {
    const row = makeAssetRow("bg_x_approved_variant", 8, {}, { approved });
    const pool = computeEligiblePool([...base, row], "facebook", NOW);
    assert(
      pool.includes("bg_x_approved_variant"),
      `approved=${JSON.stringify(approved)} should be eligible`,
    );
  }
});

Deno.test("pool filter: license via 'license' key alone passes; unexpired expiry passes", () => {
  const base = makeApOneAssetRows();
  const viaLicense = makeAssetRow("bg_x_license_only", 8, {}, {
    license_type: null,
    license: "stock-standard",
  });
  const unexpired = makeAssetRow("bg_x_unexpired", 9, {}, {
    license_expires_at: "2030-01-01T00:00:00Z",
  });
  const pool = computeEligiblePool([...base, viaLicense, unexpired], "facebook", NOW);
  assert(pool.includes("bg_x_license_only"));
  assert(pool.includes("bg_x_unexpired"));
});

Deno.test("pool filter: rank order — 'true' class outranks 'needs_scrim'; (created_at, asset_id) tiebreak", () => {
  const rows: BrandAssetRow[] = [
    makeAssetRow("bg_needs_early", 1), // needs_scrim, 2026-06-02
    makeAssetRow("bg_true_late", 5, {}, { safe_for_text_overlay: "true" }), // true, 2026-06-06
    makeAssetRow("bg_needs_late", 3), // needs_scrim, 2026-06-04
  ];
  const pool = computeEligiblePool(rows, "facebook", NOW);
  assertEquals(pool, ["bg_true_late", "bg_needs_early", "bg_needs_late"]);
});

Deno.test("pool filter: asset_key falls back to asset_id when asset_meta lacks asset_key", () => {
  const row = makeAssetRow("ignored", 1, {}, { asset_key: null });
  const pool = computeEligiblePool([row], "facebook", NOW);
  assertEquals(pool, [row.asset_id]);
});

// ---------------------------------------------------------------------------
// Check (b): marker comparison — the AP-1 blind acceptance case
// ---------------------------------------------------------------------------

Deno.test("ACCEPTANCE (AP-4): union pool 6 vs post-AP-4 markers (declarative + dashboard both 6-key; marker_contract RETIRED) -> ZERO lagging flags, loop fully green", () => {
  const pools = poolsFor(makeApOneAssetRows());
  const res = comparePoolToMarkers(pools, POOL_MARKERS);

  assertEquals(res.union_pool.length, 6);
  assert(res.union_pool.includes(DAY_HERO));
  // AP-4 dropped marker_contract (the vendored worker contract rebound to policy:tmr_spine,
  // no pool). The two remaining markers both declare 6 keys and match the union -> no drift.
  assertFalse(res.drift);

  const lagging = res.markers.filter((m) => m.status === "lagging");
  assertEquals(lagging.length, 0, "zero lagging surfaces — the loop self-reports fully green");

  // Both surviving display/evidence surfaces are current (6-key vs union 6).
  const current = res.markers.filter((m) => m.status === "current");
  assertEquals(
    current.map((m) => m.marker).sort(),
    ["marker_dashboard", "marker_declarative"],
  );
  for (const m of current) {
    assertEquals(m.missing_from_marker, []);
    assertEquals(m.extra_in_marker, []);
  }
});

Deno.test("marker comparison (post-AP-4): a 5-key union pool makes both surviving 6-key markers lag (day-hero extra_in_marker)", () => {
  // Direction-of-drift regression guard: if day-hero were removed from the LIVE pool
  // again, the union drops to 5 while the AP-3-refreshed declarative/dashboard markers
  // still declare 6 -> both show day-hero as extra_in_marker. (marker_contract was
  // retired by AP-4, so there is no longer a 5-key marker to be "current" here.)
  const rows = makeApOneAssetRows().filter(
    (r) => r.asset_meta!.asset_key !== DAY_HERO,
  );
  const res = comparePoolToMarkers(poolsFor(rows), POOL_MARKERS);
  assertEquals(res.union_pool.sort(), [...FIVE_KEYS].sort());
  assert(res.drift);

  const lagging = res.markers.filter((m) => m.status === "lagging");
  assertEquals(
    lagging.map((m) => m.marker).sort(),
    ["marker_dashboard", "marker_declarative"],
  );
  for (const m of lagging) {
    assertEquals(m.extra_in_marker, [DAY_HERO]);
    assertEquals(m.missing_from_marker, []);
  }
});

Deno.test("marker comparison: a key removed from the live pool shows as extra_in_marker (deactivation direction)", () => {
  // Remove bg_sydney_cbd from the live pool but keep day-hero live -> union =
  // {perth, brisbane, aerial_grid, home_keys, day_hero} (5). Both surviving markers
  // still declare sydney (extra_in_marker) so both lag; neither is missing day-hero
  // (both are AP-3-refreshed 6-key surfaces that already declare it).
  const rows = makeApOneAssetRows().filter(
    (r) => r.asset_meta!.asset_key !== "bg_sydney_cbd",
  );
  const res = comparePoolToMarkers(poolsFor(rows), POOL_MARKERS);
  assert(res.drift);
  for (const m of res.markers) {
    assertEquals(m.status, "lagging");
    assert(m.extra_in_marker.includes("bg_sydney_cbd"));
  }
  // marker_contract was retired by AP-4; the two remaining 6-key surfaces already
  // declare day-hero, so neither is missing it.
  const declarative = res.markers.find((m) => m.marker === "marker_declarative")!;
  const dashboard = res.markers.find((m) => m.marker === "marker_dashboard")!;
  assertEquals(declarative.missing_from_marker, []);
  assertEquals(dashboard.missing_from_marker, []);
});

Deno.test("marker constants (post-AP-4): only declarative + dashboard remain, both 6-key (v0.5); marker_contract RETIRED", () => {
  assertEquals(POOL_MARKERS.length, 2);
  assertEquals(
    POOL_MARKERS.map((m) => m.marker),
    ["marker_declarative", "marker_dashboard"],
  );
  assertEquals(
    POOL_MARKERS.map((m) => m.version),
    ["v0.5", "v0.5@003bdb0"],
  );
  const byMarker = new Map(POOL_MARKERS.map((m) => [m.marker, m]));

  // AP-3 refreshed the display/evidence surfaces to 6 keys; AP-4 leaves them UNTOUCHED.
  assertEquals([...byMarker.get("marker_declarative")!.keys], SIX_KEYS);
  assertEquals([...byMarker.get("marker_dashboard")!.keys], SIX_KEYS);

  // marker_contract is gone after AP-4 (the vendored worker contract rebound to
  // policy:tmr_spine — no pool to compare, so no marker).
  assertFalse(POOL_MARKERS.some((m) => m.marker === "marker_contract"));

  for (const m of POOL_MARKERS) {
    assert(m.source.length > 0);
  }
});

// ---------------------------------------------------------------------------
// Check (c): render sanity
// ---------------------------------------------------------------------------

Deno.test("render sanity: all keys in pool -> clean", () => {
  const renders = SIX_KEYS.map((k, i) => ({
    render_log_id: `r${i}`,
    created_at: "2026-07-05T00:00:00Z",
    background_key: k,
    has_tmr_evidence: true,
  }));
  const res = checkRenderSanity(renders, SIX_KEYS);
  assertEquals(res.checked, 6);
  assertEquals(res.violations, []);
  assertEquals(res.legacy_shape, []);
  assertFalse(res.drift);
});

Deno.test("render sanity: out-of-pool key and tmr-present-but-key-missing are both violations", () => {
  const renders = [
    { render_log_id: "r1", created_at: "t", background_key: "bg_perth_cbd", has_tmr_evidence: true },
    { render_log_id: "r2", created_at: "t", background_key: "bg_retired_key", has_tmr_evidence: true },
    // Option-D contract guarantees background_key when the tmr block is present:
    { render_log_id: "r3", created_at: "t", background_key: null, has_tmr_evidence: true },
  ];
  const res = checkRenderSanity(renders, SIX_KEYS);
  assertEquals(res.violations.length, 2);
  assertEquals(res.violations[0].render_log_id, "r2");
  assertEquals(res.violations[0].reason, "background_key_not_in_pool");
  assertEquals(res.violations[1].render_log_id, "r3");
  assertEquals(res.violations[1].reason, "background_key_missing");
  assertEquals(res.legacy_shape, []);
  assert(res.drift);
});

Deno.test("render sanity (db-rls C2): legacy pre-Option-D shape (no background_key, no tmr) -> informational, NOT drift", () => {
  // Mirrors live truth: one succeeded B1 render (c3c7489b…, 2026-06-26) whose
  // render_spec has only [label, template] keys.
  const renders = [
    { render_log_id: "r1", created_at: "t", background_key: "bg_perth_cbd", has_tmr_evidence: true },
    { render_log_id: "c3c7489b", created_at: "2026-06-26T00:00:00Z", background_key: null, has_tmr_evidence: false },
  ];
  const res = checkRenderSanity(renders, SIX_KEYS);
  assertEquals(res.violations, []);
  assertEquals(res.legacy_shape.length, 1);
  assertEquals(res.legacy_shape[0].render_log_id, "c3c7489b");
  assertFalse(res.drift, "legacy shape must not pollute the blind acceptance case");
});

Deno.test("render sanity: zero renders -> clean (no rows is not a violation)", () => {
  const res = checkRenderSanity([], SIX_KEYS);
  assertEquals(res.checked, 0);
  assertFalse(res.drift);
});

// ---------------------------------------------------------------------------
// Run verdict
// ---------------------------------------------------------------------------

Deno.test("verdict: all clean -> ok", () => {
  assertEquals(
    computeVerdict([
      { drift: false, error: null },
      { drift: false, error: null },
      { drift: false, error: null },
    ]),
    "ok",
  );
});

Deno.test("verdict: any divergence -> drift", () => {
  assertEquals(
    computeVerdict([
      { drift: false, error: null },
      { drift: true, error: null },
      { drift: false, error: null },
    ]),
    "drift",
  );
});

Deno.test("verdict: any check error -> error, even when another check found drift", () => {
  assertEquals(
    computeVerdict([
      { drift: null, error: "creatomate_templates 500: boom" },
      { drift: true, error: null },
      { drift: false, error: null },
    ]),
    "error",
  );
});
