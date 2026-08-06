# M13 Lane 4 design — Asset Gap Build-Pack status display (v1)

**Seed:** control-tower relay (session `local_aac5adf2-b0c4-458f-a67c-8262f198b51d`), routing M13 Lane 4 to this session per PK's item-J pre-ruling (Lane 4 pulled forward, ungated by the Phase-2 watch hold). Governing: `docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §5/§8 lane 4 + §0d ("M8's dashboard must display Build Pack status") + v6.147 watch constraints (isolated undeployed branch in `invegent-dashboard`).

**Repo:** `C:\Users\parve\invegent-dashboard`. Base branch: `dashboard-operator-cockpit-v1` (has M8's Asset Gap tab; `main` has diverged and does not contain it). New branch: `claude/m13-lane4-asset-gap-buildpack-status`, isolated worktree, undeployed.

## 1. What "status" means (v1) — and the honesty layer this design insists on

There is **no live registry** yet (Lane 3, T3, unbuilt) — nothing to query. v1 status is derived entirely from **repo-committed JSON artifacts already produced by M13 Lane 1 and the M6 lane**, hand-transcribed into a small static data module in the dashboard repo. This is explicitly a stopgap the module itself must say so about.

Three fields need to be kept **separate and never conflated**, because the two artifacts that exist today have different provenance and collapsing them would fabricate confidence that doesn't exist:

| Field | Meaning | Why it's not just "diff verdict" |
|---|---|---|
| `blueprint_exists` | A Blueprint JSON instance exists in the CE repo, per the M13 v1 schema | Always knowable, cheap |
| `capture_provenance` | `"none"` \| `"fixture"` \| `"self_check"` \| `"live_read"` | **The critical honesty field.** A `"clean"` diff verdict against a hand-authored fixture or self-check Capture proves the *tooling* works — it proves **nothing** about a real Creatomate template. Only `"live_read"` (Lane 5, unbuilt) would mean that. |
| `diff_verdict` | `clean` \| `concerns` \| `blocked` \| `not_yet_captured` | Only meaningful in light of `capture_provenance` — the UI must show them together, never the verdict alone |

**Concretely, both known artifacts today are pre-Lane-5:**

- **PP Carousel Cover v1** (`blueprint_pp_carousel_cover_v1`) — Blueprint exists (M13 Lane 1 fixture). A REAL template *is* registered (`generic_carousel_cover_1x1_v1`, `provider_template_id` `c9a59faa…`, per `property-pulse.json`), but its live element-level shape has **never actually been captured** — the Lane-1 Capture fixture is a hand-authored stand-in, not a real `GET /v1/templates/{id}` read (its own `_fixture_note` says so). `capture_provenance: "fixture"`, `diff_verdict: "clean"` (fixture-vs-fixture self-consistency only).
- **M6 Triptych v1** (`blueprint_m6_triptych_v1`) — Blueprint exists (this session's real transcription, not a fixture). No Creatomate template exists yet at all. `capture_provenance: "self_check"`, `diff_verdict: "clean"` (self-check match only — the result doc's own `_selfcheck_note` says this proves nothing about a live template).

Both rows render with an explicit, non-dismissable note: *"clean" here means the tooling/schema round-trips correctly against a hand-derived stand-in — it is NOT proof a live Creatomate template matches.* No row today can honestly claim `capture_provenance: "live_read"` — when one eventually can (Lane 5), that's the only state where a clean verdict says something about reality.

## 2. Data source (v1 — static, not live)

New pure module `lib/m13-build-pack-status.ts` (mirrors `lib/asset-gap.ts`'s discipline: types + a small typed constant, no I/O, no Supabase, directly unit-testable). Exports:

```ts
export type CaptureProvenance = 'none' | 'fixture' | 'self_check' | 'live_read';
export type DiffVerdict = 'clean' | 'concerns' | 'blocked' | 'not_yet_captured';

export type BuildPackStatusRow = {
  blueprint_id: string;
  blueprint_version: string;
  client_slug: string;
  template_family_key: string;
  template_variant_key_intended: string;
  proof_posture: string; // always 'draft' today — a Blueprint precedes any render by design
  capture_provenance: CaptureProvenance;
  diff_verdict: DiffVerdict;
  real_template_registered: boolean; // true only if a provider_template_id is actually registered in the CE creative-library registry (independent of Capture)
  source_artifact_paths: string[]; // CE-repo-relative paths, for traceability — never a live link
  note: string; // one-line honest caveat, always shown
};

export const BUILD_PACK_STATUS_SNAPSHOT_NOTE =
  'Static snapshot, manually transcribed from repo-committed CE artifacts as of 2026-08-06. ' +
  'No live registry exists yet (M13 Lane 3 unbuilt) — nothing here is fetched live and this list ' +
  'will not update itself when new artifacts land. A "clean" diff verdict below reflects tooling ' +
  'self-consistency against a fixture or self-check Capture, never a live Creatomate read.';

export const BUILD_PACK_STATUS_ROWS: BuildPackStatusRow[] = [
  {
    blueprint_id: 'blueprint_pp_carousel_cover_v1',
    blueprint_version: 'v1.0.0',
    client_slug: 'property-pulse',
    template_family_key: 'property-pulse-carousel',
    template_variant_key_intended: 'carousel-cover-1x1-v1',
    proof_posture: 'draft',
    capture_provenance: 'fixture',
    diff_verdict: 'clean',
    real_template_registered: true,
    source_artifact_paths: [
      '.claude/helpers/fixtures/m13-blueprint-capture-diff/blueprint-pp-carousel-cover-v1.json',
      '.claude/helpers/fixtures/m13-blueprint-capture-diff/capture-pp-carousel-cover-clean.json',
    ],
    note:
      'A real template IS registered (generic_carousel_cover_1x1_v1, provider_template_id c9a59faa…) ' +
      'but its live element shape has never actually been captured — this Capture is a hand-authored ' +
      'Lane-1 fixture, not a real GET /v1/templates/{id} read.',
  },
  {
    blueprint_id: 'blueprint_m6_triptych_v1',
    blueprint_version: 'v1.0.0',
    client_slug: 'property-pulse',
    template_family_key: 'property-pulse-video-triptych',
    template_variant_key_intended: 'triptych-hook-proof-cta-9x16-video-v1',
    proof_posture: 'draft',
    capture_provenance: 'self_check',
    diff_verdict: 'clean',
    real_template_registered: false,
    source_artifact_paths: [
      'docs/briefs/artifacts/m6-triptych-blueprint-v1.json',
      'docs/briefs/artifacts/m6-triptych-capture-selfcheck-v1.json',
    ],
    note:
      'No Creatomate template exists yet at all — this Blueprint awaits human transposition ' +
      '(M13 §7 sequencing: M6 stays behind M13 Lane 3). The Capture is a self-check, not a live read.',
  },
];
```

## 3. UI placement — a new sibling sub-section, not a change to `AssetGapTab.tsx`

Per the schedule tab's own precedent (`PublishingPlanPyramid`, `ClientCapabilityOverlay` rendered as additional read-only sub-sections alongside `ScheduleTab`, `page.tsx:770-826`), add a new component `components/clients/BuildPackStatusPanel.tsx` and render it as a sibling block inside the existing `activeTab === "asset-gap"` conditional (`page.tsx:909-919`), **after** `<AssetGapTab .../>`, filtered to `activeClient.client_slug`. This is deliberately **not** a prop added to `AssetGapTab.tsx` itself — Build-Pack status is a different data concept (templates, not backlog rows) with a different (static, not live) source, and keeping it a separate component keeps the M8 panel's existing props/contract untouched (lower risk, smaller diff).

Component behavior:
- Filters `BUILD_PACK_STATUS_ROWS` to `row.client_slug === activeClient.client_slug`.
- Empty state (no rows for this client) matches `AssetGapTab`'s own empty-state pattern: calm, explicit, never a crash — *"No Build Pack artifacts for this client yet."*
- Renders the `BUILD_PACK_STATUS_SNAPSHOT_NOTE` as a persistent banner at the top of the panel (not dismissable, not a tooltip — it must always be visible given the honesty requirement above).
- Each row uses the existing `Pill` tone vocabulary: `diff_verdict` clean→`emerald`, concerns→`amber`, blocked→`rose`, not_yet_captured→`slate`. `capture_provenance` gets its own smaller `sky`/`slate` pill (`fixture`/`self_check`→`slate` — deliberately NOT `emerald`/positive-toned, since neither is a proof state; `live_read` would be `sky` once it exists; `none`→`slate`).
- Zero interactive affordances — no buttons, no links that mutate anything, no "approve"/"promote"/"graduate" language anywhere (per the seed's explicit exclusion and the M13 charter's four hard exclusions, which reach the UI).
- Server component, no `'use client'`, matching `AssetGapTab.tsx`'s own convention (purely static/derived props, nothing to hydrate).

## 4. What this does NOT do (explicit non-claims, matching the M13 charter)

- No fetch, no RPC, no Supabase call for this panel — it is 100% static in v1, because there is nothing live to query yet.
- No claim that "clean" means a live template matches its Blueprint — every clean verdict is qualified by its `capture_provenance`.
- No approval, promotion, or graduation affordance of any kind.
- No auto-update — new Blueprint artifacts landing in the CE repo do NOT automatically appear here; this list is manually maintained until Lane 3 (live registry) exists, and the panel says so.

## 5. Plan

1. `dashboard-ia-lint` review of this design doc against `docs/dashboard/operator-journey-ia-v1.md` + `docs/dashboard/global-client-picker-v1-brief.md` — **before** writing code.
2. Isolated worktree off `dashboard-operator-cockpit-v1`, new branch `claude/m13-lane4-asset-gap-buildpack-status`.
3. Implement `lib/m13-build-pack-status.ts` + `components/clients/BuildPackStatusPanel.tsx` + the `page.tsx` wiring (3-line addition, one import, one render call).
4. Add a vitest unit test for the (trivial but real) filter-by-client-slug logic, matching `tests/asset-gap.test.ts`'s convention.
5. `tsc --noEmit` + `npm run build` clean.
6. Push the branch for evidence (no PR, no merge, no deploy — matches the seed's "branch push for evidence OK" scope).
7. Result doc back in this repo, working-tree only, pointer to control tower.
