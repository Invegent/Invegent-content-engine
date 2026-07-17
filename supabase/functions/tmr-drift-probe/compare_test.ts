// supabase/functions/tmr-drift-probe/compare_test.ts
//
// tmr-drift-probe v2.0.0 — fixture-driven tests for the pure comparison logic
// AND the composed per-governed-client sweep (Spine Generalisation v1, D3).
//
// Run: deno test supabase/functions/tmr-drift-probe/compare_test.ts
//
// D3 (docs/briefs/spine-generalisation-v1-packet.md): the probe is client-driven.
// The expected background pool is DERIVED LIVE from the resolver per governed
// client (computeEligiblePool -> computeUnionPool); render sanity validates each
// client's recent renders against that live union. There is NO vendored-marker
// machinery any more — markers.ts / comparePoolToMarkers are RETIRED by design.
// These tests assert:
//   · provider check (a) unchanged and global — fb9820f8 known_historical, not drift;
//   · the resolver filter-chain replica (computeEligiblePool) unchanged;
//   · computeUnionPool derives the live expected pool from per-platform pools;
//   · the composed per-client sweep: governed set == the fixtured clients, live
//     pool sizes derived live, render sanity pass/violation, and the run verdict;
//   · NO marker/lag machinery remains (the module exports no PoolMarker / no
//     comparePoolToMarkers).

import {
  assert,
  assertEquals,
  assertFalse,
} from "jsr:@std/assert@1";
import {
  type BrandAssetRow,
  checkRenderSanity,
  compareProviderRegistry,
  computeDeclarativeCoverage,
  computeEligiblePool,
  computeMustDeclareSet,
  computeUnionPool,
  computeVerdict,
  KNOWN_HISTORICAL_PROVIDER_IDS,
  normaliseExemptions,
  PROBE_PLATFORMS,
  PROVIDER_PAGE_LIMIT,
  providerListPossiblyTruncated,
  type ProviderTemplate,
  type RegistryTemplate,
  type RenderRow,
} from "./compare.ts";

// ---------------------------------------------------------------------------
// Fixtures — provider ↔ registry
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

// ---------------------------------------------------------------------------
// Fixtures — PP live background pool (derived live, not vendored)
// ---------------------------------------------------------------------------

const FIVE_KEYS = [
  "bg_perth_cbd",
  "bg_sydney_cbd",
  "bg_brisbane_cbd",
  "bg_pp_au_suburb_aerial_grid",
  "bg_pp_home_keys_contract_table",
];
const DAY_HERO = "bg_pp_perth_cbd_skyline_day_wide";
const NEW_ALL_PLATFORM_KEYS = [
  "bg_pp_advisory_desk_flatlay",
  "bg_pp_kitchen_living_open_plan",
];
const EIGHT_KEYS = [...FIVE_KEYS, DAY_HERO, ...NEW_ALL_PLATFORM_KEYS];

const NOW = new Date("2026-07-07T00:00:00Z");

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
 * PP's live background asset rows: 8 eligible backgrounds. The day-hero is
 * platform-fenced OFF instagram; the two ALL-PLATFORM promotions are unfenced, so
 * per-platform pools are fb/li = 8, ig = 7; the UNION (the live-derived expected
 * pool) is 8.
 */
function makePpAssetRows(): BrandAssetRow[] {
  const rows = FIVE_KEYS.map((k, i) => makeAssetRow(k, i + 1));
  rows.push(makeAssetRow(DAY_HERO, 7, { platform_scope: ["facebook", "linkedin"] }));
  rows.push(makeAssetRow(NEW_ALL_PLATFORM_KEYS[0], 8));
  rows.push(makeAssetRow(NEW_ALL_PLATFORM_KEYS[1], 9));
  return rows;
}

function poolsFor(rows: BrandAssetRow[]): Record<string, string[]> {
  const pools: Record<string, string[]> = {};
  for (const p of PROBE_PLATFORMS) pools[p] = computeEligiblePool(rows, p, NOW);
  return pools;
}

// ---------------------------------------------------------------------------
// A minimal in-test model of the per-client sweep (mirrors index.ts logic on
// pure inputs — no DB, no network). This is what asserts the D3 behaviour.
// ---------------------------------------------------------------------------

interface FixtureGovernedClient {
  client_id: string;
  client_slug: string;
  format: string;
  render_label: string;
  assets: BrandAssetRow[];
  renders: RenderRow[];
}

function sweepClient(gc: FixtureGovernedClient, now: Date) {
  const pools: Record<string, string[]> = {};
  for (const p of PROBE_PLATFORMS) pools[p] = computeEligiblePool(gc.assets, p, now);
  const live_pool = computeUnionPool(pools);
  const render_check = checkRenderSanity(gc.renders, live_pool.union_pool);
  return { client_slug: gc.client_slug, live_pool, render_check };
}

function sweepVerdict(
  providerDrift: boolean,
  clientResults: { render_check: { drift: boolean } }[],
) {
  const anyRenderDrift = clientResults.some((c) => c.render_check.drift);
  return computeVerdict([
    { drift: providerDrift, error: null },
    { drift: anyRenderDrift, error: null },
  ]);
}

// ---------------------------------------------------------------------------
// Check (a): provider ↔ registry (GLOBAL, unchanged)
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
  assert(providerListPossiblyTruncated(101));
});

Deno.test("provider check: null registry name never counts as renamed", () => {
  const registry = makeRegistry();
  registry[0] = { ...registry[0], provider_template_name: null };
  const res = compareProviderRegistry(makeProvider(), registry);
  assertEquals(res.renamed, []);
  assertFalse(res.drift);
});

// ---------------------------------------------------------------------------
// Check (b): eligible-pool filter chain replica (unchanged resolver replica)
// ---------------------------------------------------------------------------

Deno.test("pool filter: per-platform sets — fb/li = 8, instagram = 7 via platform_scope fence (only day-hero fenced; 2 ALL-PLATFORM)", () => {
  const pools = poolsFor(makePpAssetRows());
  assertEquals(pools.facebook.length, 8);
  assertEquals(pools.linkedin.length, 8);
  assertEquals(pools.instagram.length, 7);
  assert(pools.facebook.includes(DAY_HERO));
  assert(pools.linkedin.includes(DAY_HERO));
  assertFalse(pools.instagram.includes(DAY_HERO));
  for (const k of NEW_ALL_PLATFORM_KEYS) {
    assert(pools.facebook.includes(k));
    assert(pools.linkedin.includes(k));
    assert(pools.instagram.includes(k));
  }
});

Deno.test("pool filter: each rejection reason excludes the row (mirrors resolve_slot_assets v1.1 chain)", () => {
  const base = makePpAssetRows();
  const cases: [string, BrandAssetRow][] = [
    ["inactive", makeAssetRow("bg_x_inactive", 10, { is_active: false })],
    ["is_active null", makeAssetRow("bg_x_nullactive", 10, { is_active: null })],
    ["not approved", makeAssetRow("bg_x_unapproved", 10, {}, { approved: "false" })],
    ["approved missing", makeAssetRow("bg_x_noapprove", 10, {}, { approved: null })],
    ["approved garbage text", makeAssetRow("bg_x_badapprove", 10, {}, { approved: "maybe" })],
    ["license missing", makeAssetRow("bg_x_nolicense", 10, {}, { license_type: null, license: null })],
    ["license expired", makeAssetRow("bg_x_expired", 10, {}, { license_expires_at: "2025-01-01T00:00:00Z" })],
    ["wrong bucket", makeAssetRow("bg_x_bucket", 10, {}, { bucket: "post-media" })],
    ["bucket missing", makeAssetRow("bg_x_nobucket", 10, {}, { bucket: null })],
    ["not text safe", makeAssetRow("bg_x_unsafe", 10, {}, { safe_for_text_overlay: "false" })],
    ["text safety unknown", makeAssetRow("bg_x_sfto_null", 10, {}, { safe_for_text_overlay: null })],
    ["unrecognised safety tag", makeAssetRow("bg_x_sfto_odd", 10, {}, { safe_for_text_overlay: "sometimes" })],
    ["not a background", makeAssetRow("bg_x_logo", 10, {}, { usage: "logo" })],
  ];
  for (const [label, row] of cases) {
    const pool = computeEligiblePool([...base, row], "facebook", NOW);
    assertEquals(pool.length, 8, `case '${label}' should be excluded`);
    assertFalse(
      pool.includes(row.asset_meta!.asset_key as string),
      `case '${label}' leaked into the pool`,
    );
  }
});

Deno.test("pool filter: pg-boolean approved literals accepted ('t','1','yes'); jsonb boolean true accepted", () => {
  const base = makePpAssetRows();
  for (const approved of ["t", "1", "yes", "TRUE", true]) {
    const row = makeAssetRow("bg_x_approved_variant", 10, {}, { approved });
    const pool = computeEligiblePool([...base, row], "facebook", NOW);
    assert(
      pool.includes("bg_x_approved_variant"),
      `approved=${JSON.stringify(approved)} should be eligible`,
    );
  }
});

Deno.test("pool filter: rank order — 'true' class outranks 'needs_scrim'; (created_at, asset_id) tiebreak", () => {
  const rows: BrandAssetRow[] = [
    makeAssetRow("bg_needs_early", 1),
    makeAssetRow("bg_true_late", 5, {}, { safe_for_text_overlay: "true" }),
    makeAssetRow("bg_needs_late", 3),
  ];
  const pool = computeEligiblePool(rows, "facebook", NOW);
  assertEquals(pool, ["bg_true_late", "bg_needs_early", "bg_needs_late"]);
});

// ---------------------------------------------------------------------------
// computeUnionPool — the live-derived expected pool (replaces vendored markers)
// ---------------------------------------------------------------------------

Deno.test("computeUnionPool: derives the union of per-platform pools live (PP -> 8-key expected pool)", () => {
  const pools = poolsFor(makePpAssetRows());
  const res = computeUnionPool(pools);
  assertEquals(res.union_pool.length, 8);
  assertEquals([...res.union_pool].sort(), [...EIGHT_KEYS].sort());
  assert(res.union_pool.includes(DAY_HERO));
  for (const k of NEW_ALL_PLATFORM_KEYS) assert(res.union_pool.includes(k));
  assertEquals(res.live_pools_by_platform, pools);
});

Deno.test("computeUnionPool: preserves first-seen order and de-duplicates across platforms", () => {
  const res = computeUnionPool({
    facebook: ["a", "b"],
    instagram: ["b", "c"],
    linkedin: ["c", "d"],
  });
  assertEquals(res.union_pool, ["a", "b", "c", "d"]);
});

Deno.test("computeUnionPool: no marker/lag machinery is exported (D3 retired)", async () => {
  const mod = await import("./compare.ts");
  assertFalse("comparePoolToMarkers" in mod, "comparePoolToMarkers must be gone");
  assertFalse("POOL_MARKERS" in mod, "POOL_MARKERS must be gone");
  assertFalse("EIGHT_KEY_POOL" in mod, "EIGHT_KEY_POOL must be gone");
});

// ---------------------------------------------------------------------------
// Render sanity (unchanged pure function)
// ---------------------------------------------------------------------------

Deno.test("render sanity: all keys in pool -> clean", () => {
  const renders: RenderRow[] = EIGHT_KEYS.map((k, i) => ({
    render_log_id: `r${i}`,
    created_at: "2026-07-05T00:00:00Z",
    background_key: k,
    has_tmr_evidence: true,
  }));
  const res = checkRenderSanity(renders, EIGHT_KEYS);
  assertEquals(res.checked, 8);
  assertEquals(res.violations, []);
  assertEquals(res.legacy_shape, []);
  assertFalse(res.drift);
});

Deno.test("render sanity: out-of-pool key and tmr-present-but-key-missing are both violations", () => {
  const renders: RenderRow[] = [
    { render_log_id: "r1", created_at: "t", background_key: "bg_perth_cbd", has_tmr_evidence: true },
    { render_log_id: "r2", created_at: "t", background_key: "bg_retired_key", has_tmr_evidence: true },
    { render_log_id: "r3", created_at: "t", background_key: null, has_tmr_evidence: true },
  ];
  const res = checkRenderSanity(renders, EIGHT_KEYS);
  assertEquals(res.violations.length, 2);
  assertEquals(res.violations[0].render_log_id, "r2");
  assertEquals(res.violations[0].reason, "background_key_not_in_pool");
  assertEquals(res.violations[1].render_log_id, "r3");
  assertEquals(res.violations[1].reason, "background_key_missing");
  assertEquals(res.legacy_shape, []);
  assert(res.drift);
});

Deno.test("render sanity (db-rls C2): legacy pre-Option-D shape (no background_key, no tmr) -> informational, NOT drift", () => {
  const renders: RenderRow[] = [
    { render_log_id: "r1", created_at: "t", background_key: "bg_perth_cbd", has_tmr_evidence: true },
    { render_log_id: "c3c7489b", created_at: "2026-06-26T00:00:00Z", background_key: null, has_tmr_evidence: false },
  ];
  const res = checkRenderSanity(renders, EIGHT_KEYS);
  assertEquals(res.violations, []);
  assertEquals(res.legacy_shape.length, 1);
  assertEquals(res.legacy_shape[0].render_log_id, "c3c7489b");
  assertFalse(res.drift);
});

Deno.test("render sanity: zero renders -> clean (no rows is not a violation)", () => {
  const res = checkRenderSanity([], EIGHT_KEYS);
  assertEquals(res.checked, 0);
  assertFalse(res.drift);
});

// ---------------------------------------------------------------------------
// Composed per-governed-client sweep (D3) — the acceptance-shaped scenarios
// ---------------------------------------------------------------------------

/** The single governed client today: Property Pulse × image_quote. */
function ppGovernedClient(renders: RenderRow[]): FixtureGovernedClient {
  return {
    client_id: "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd",
    client_slug: "property-pulse",
    format: "image_quote",
    render_label: "creative_library_b1_production",
    assets: makePpAssetRows(),
    renders,
  };
}

/** Two TMR-shape renders whose background_keys are in PP's live pool. */
function ppInPoolRenders(): RenderRow[] {
  return [
    { render_log_id: "rp1", created_at: "2026-07-05T21:30:23Z", background_key: DAY_HERO, has_tmr_evidence: true },
    { render_log_id: "rp2", created_at: "2026-07-04T10:00:00Z", background_key: "bg_perth_cbd", has_tmr_evidence: true },
  ];
}

Deno.test("SWEEP (PP happy path): governed set == ['property-pulse']; pool derived live (8); renders in-pool -> ok", () => {
  const governed = [ppGovernedClient(ppInPoolRenders())];
  const results = governed.map((gc) => sweepClient(gc, NOW));

  // Governed set == exactly {PP}.
  assertEquals(results.map((r) => r.client_slug), ["property-pulse"]);
  // Pool derived LIVE from the resolver (not vendored) — 8 keys.
  assertEquals(results[0].live_pool.union_pool.length, 8);
  assertEquals([...results[0].live_pool.union_pool].sort(), [...EIGHT_KEYS].sort());
  // Renders in-pool -> no render drift.
  assertFalse(results[0].render_check.drift);
  assertEquals(results[0].render_check.checked, 2);
  assertEquals(results[0].render_check.violations, []);
  // Provider clean + no render drift -> ok.
  assertEquals(sweepVerdict(false, results), "ok");
});

Deno.test("SWEEP (render out of pool): a governed client's render whose background_key is not in its live pool -> drift", () => {
  const renders: RenderRow[] = [
    { render_log_id: "rp1", created_at: "t", background_key: DAY_HERO, has_tmr_evidence: true },
    { render_log_id: "rp_bad", created_at: "t", background_key: "bg_deleted_key", has_tmr_evidence: true },
  ];
  const governed = [ppGovernedClient(renders)];
  const results = governed.map((gc) => sweepClient(gc, NOW));
  assert(results[0].render_check.drift);
  assertEquals(results[0].render_check.violations.length, 1);
  assertEquals(results[0].render_check.violations[0].reason, "background_key_not_in_pool");
  // Provider clean but a render violation -> overall drift.
  assertEquals(sweepVerdict(false, results), "drift");
});

Deno.test("SWEEP (provider drift): provider-side deletion drives the run to drift even with clean client renders", () => {
  const provider = makeProvider().slice(1); // a registered generic deleted provider-side
  const providerRes = compareProviderRegistry(provider, makeRegistry());
  assert(providerRes.drift);
  const governed = [ppGovernedClient(ppInPoolRenders())];
  const results = governed.map((gc) => sweepClient(gc, NOW));
  assertFalse(results[0].render_check.drift);
  assertEquals(sweepVerdict(providerRes.drift, results), "drift");
});

Deno.test("SWEEP (zero renders): a governed client with no matching renders -> ok (no rows is not a violation)", () => {
  const governed = [ppGovernedClient([])];
  const results = governed.map((gc) => sweepClient(gc, NOW));
  assertEquals(results[0].render_check.checked, 0);
  assertFalse(results[0].render_check.drift);
  assertEquals(sweepVerdict(false, results), "ok");
});

Deno.test("SWEEP (multi-client shape): the loop generalises — a second governed client is checked with its OWN live pool", () => {
  // Proves no PP literal is baked into the sweep: a second fixtured client with a
  // DIFFERENT pool and label is swept independently. (No such row exists in prod —
  // onboarding is a v3 DATA lane — this only exercises the code's generality.)
  const second: FixtureGovernedClient = {
    client_id: "00000000-0000-4000-8000-0000000000ff",
    client_slug: "example-second",
    format: "image_quote",
    render_label: "creative_library_b1_production",
    assets: [makeAssetRow("bg_second_only", 1, {}, { safe_for_text_overlay: "true" })],
    renders: [
      { render_log_id: "s1", created_at: "t", background_key: "bg_second_only", has_tmr_evidence: true },
    ],
  };
  const governed = [ppGovernedClient(ppInPoolRenders()), second];
  const results = governed.map((gc) => sweepClient(gc, NOW));

  assertEquals(results.map((r) => r.client_slug), ["property-pulse", "example-second"]);
  assertEquals(results[0].live_pool.union_pool.length, 8);
  assertEquals(results[1].live_pool.union_pool, ["bg_second_only"]);
  assertFalse(results[0].render_check.drift);
  assertFalse(results[1].render_check.drift);
  assertEquals(sweepVerdict(false, results), "ok");
});

// ---------------------------------------------------------------------------
// Check (d): declarative coverage (D4 invariant) — v2.1.0
// ---------------------------------------------------------------------------

/**
 * A governed-background asset row for the must_declare filter (usage=background,
 * is_active, approved, production_use_allowed). Defaults are eligible; overrides
 * exercise each exclusion.
 */
function makeGovernedBg(
  key: string,
  idx: number,
  metaOverrides: Record<string, unknown> = {},
  overrides: Partial<BrandAssetRow> = {},
): BrandAssetRow {
  return {
    asset_id: `d000000${idx}-0000-4000-8000-000000000000`,
    is_active: true,
    platform_scope: null,
    created_at: `2026-07-0${(idx % 9) + 1}T00:00:00Z`,
    asset_meta: {
      asset_key: key,
      usage: "background",
      approved: "true",
      production_use_allowed: "true",
      ...metaOverrides,
    },
    ...overrides,
  };
}

Deno.test("must_declare: keeps live governed backgrounds; production_use_allowed ABSENT is allowed (COALESCE=true)", () => {
  const rows: BrandAssetRow[] = [
    makeGovernedBg("bg_a", 1),
    // production_use_allowed absent -> COALESCE(...,true)=true -> included
    makeGovernedBg("bg_b", 2, { production_use_allowed: null }),
  ];
  assertEquals(computeMustDeclareSet(rows), ["bg_a", "bg_b"]);
});

Deno.test("must_declare: excludes inactive / unapproved / production_use_allowed=false / non-background / keyless", () => {
  const rows: BrandAssetRow[] = [
    makeGovernedBg("bg_keep", 1),
    makeGovernedBg("bg_inactive", 2, {}, { is_active: false }),
    makeGovernedBg("bg_unapproved", 3, { approved: "false" }),
    makeGovernedBg("bg_no_prod", 4, { production_use_allowed: "false" }),
    makeGovernedBg("bg_logo", 5, { usage: "logo" }),
    makeGovernedBg("bg_keyless", 6, { asset_key: null }),
  ];
  assertEquals(computeMustDeclareSet(rows), ["bg_keep"]);
});

Deno.test("must_declare: broader than check (b) — no license/bucket/text-safety fence excludes a governed bg", () => {
  // A governed background with NO license + wrong bucket + not text-safe would be
  // resolver-INELIGIBLE (check b), but is STILL must_declare for D4 (check d).
  const rows: BrandAssetRow[] = [
    makeGovernedBg("bg_governed_but_ineligible", 1, {
      license: null,
      license_type: null,
      bucket: "post-media",
      safe_for_text_overlay: "false",
    }),
  ];
  assertEquals(computeMustDeclareSet(rows), ["bg_governed_but_ineligible"]);
  // ...and it is NOT in the resolver eligible pool.
  assertEquals(computeEligiblePool(rows, "facebook", NOW), []);
});

Deno.test("normaliseExemptions: string entries, {key} objects, mixed, empty, and non-array all handled", () => {
  assertEquals(normaliseExemptions([]), []); // empty = no exemptions
  assertEquals(normaliseExemptions(undefined), []); // missing field
  assertEquals(normaliseExemptions(null), []);
  assertEquals(normaliseExemptions(["bg_x", "bg_y"]), ["bg_x", "bg_y"]);
  assertEquals(
    normaliseExemptions([{ key: "bg_x", reason: "legacy" }, { key: "bg_y" }]),
    ["bg_x", "bg_y"],
  );
  assertEquals(
    normaliseExemptions(["bg_x", { key: "bg_y" }, { reason: "no key" }, "", 42]),
    ["bg_x", "bg_y"],
  );
});

Deno.test("coverage (ok): declared ⊇ must_declare -> ok, zero violations", () => {
  const res = computeDeclarativeCoverage(
    ["bg_a", "bg_b", "bg_c"], // declared
    [], // exempt
    ["bg_a", "bg_b"], // must_declare
  );
  assertEquals(res.status, "ok");
  assertEquals(res.violation_keys, []);
  assertEquals(res.must_declare_count, 2);
  assertEquals(res.declared_count, 3);
  assertEquals(res.exempt_count, 0);
});

Deno.test("coverage (drift): a must_declare key neither declared nor exempt -> drift + violation listed", () => {
  const res = computeDeclarativeCoverage(
    ["bg_a"], // declared
    [], // exempt
    ["bg_a", "bg_undeclared"], // must_declare
  );
  assertEquals(res.status, "drift");
  assertEquals(res.violation_keys, ["bg_undeclared"]);
  assertEquals(res.must_declare_count, 2);
  assertEquals(res.declared_count, 1);
});

Deno.test("coverage (exempt-covers): a must_declare key in exempt_set -> ok (declared ∪ exempt covers it)", () => {
  const res = computeDeclarativeCoverage(
    ["bg_a"], // declared
    ["bg_exempted"], // exempt
    ["bg_a", "bg_exempted"], // must_declare
  );
  assertEquals(res.status, "ok");
  assertEquals(res.violation_keys, []);
  assertEquals(res.exempt_count, 1);
});

Deno.test("coverage (empty exemptions): [] behaves as zero exemptions — undeclared must_declare drifts", () => {
  const exempt = normaliseExemptions([]); // the live registry's current value
  assertEquals(exempt, []);
  const res = computeDeclarativeCoverage(["bg_a"], exempt, ["bg_a", "bg_b"]);
  assertEquals(res.status, "drift");
  assertEquals(res.violation_keys, ["bg_b"]);
});

Deno.test("coverage: violations are in must_declare order and de-duplicated", () => {
  const res = computeDeclarativeCoverage(
    ["bg_a"],
    [],
    ["bg_z", "bg_a", "bg_y", "bg_z"], // bg_z repeated
  );
  assertEquals(res.violation_keys, ["bg_z", "bg_y"]);
  assertEquals(res.must_declare_count, 3); // distinct must_declare keys
});

Deno.test("coverage (end-to-end D4 shape): live must_declare from rows vs declared+exempt from registry", () => {
  // 3 live governed backgrounds; registry declares 2, exempts 1 -> ok.
  const rows: BrandAssetRow[] = [
    makeGovernedBg("bg_perth_cbd", 1),
    makeGovernedBg("bg_sydney_cbd", 2),
    makeGovernedBg("bg_intentionally_exempt", 3),
  ];
  const mustDeclare = computeMustDeclareSet(rows);
  const declared = ["bg_perth_cbd", "bg_sydney_cbd"];
  const exempt = normaliseExemptions([
    { key: "bg_intentionally_exempt", reason: "held back deliberately" },
  ]);
  const okRes = computeDeclarativeCoverage(declared, exempt, mustDeclare);
  assertEquals(okRes.status, "ok");
  assertEquals(okRes.violation_keys, []);

  // Now a 4th live governed background appears, undeclared + unexempted -> drift.
  rows.push(makeGovernedBg("bg_new_live_undeclared", 4));
  const driftRes = computeDeclarativeCoverage(
    declared,
    exempt,
    computeMustDeclareSet(rows),
  );
  assertEquals(driftRes.status, "drift");
  assertEquals(driftRes.violation_keys, ["bg_new_live_undeclared"]);
});

// ---------------------------------------------------------------------------
// Run verdict (unchanged pure function)
// ---------------------------------------------------------------------------

Deno.test("verdict: all clean -> ok", () => {
  assertEquals(
    computeVerdict([
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
    ]),
    "drift",
  );
});

Deno.test("verdict: any check error -> error, even when another check found drift", () => {
  assertEquals(
    computeVerdict([
      { drift: null, error: "creatomate_templates 500: boom" },
      { drift: true, error: null },
    ]),
    "error",
  );
});
