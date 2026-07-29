CLAIMED · broll-rotation-governance-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1 · 2026-07-29

# Brief — Governed Creatomate B-roll: Rotation Governance v1

**Date:** 2026-07-29 Sydney · **Lane classification:** SAFETY_GATE · **Tier: T3**
(production-touching resolver change; DDL + one governed seed row).
**Basis:** live read-only inspection + BEGIN…ROLLBACK dry runs against production,
HEAD `b32d601`, local/origin parity ahead 0 / behind 0.
**Predecessor:** `docs/briefs/results/broll-rotation-readiness-handoff-v1.md` (v6.56/v6.57) —
this lane builds the two controls that document named and deliberately did not build.

---

## 1. Task

Make the six-clip Property Pulse B-roll pool rotate without immediate repetition or
geographic contradiction, while preserving the live B-roll template and output contract.

## 2. Ground truth established before building (all live-verified)

| Fact | Value | Method |
|---|---|---|
| Eligible B-roll pool | **6** (`broll_pp_perth_skyline` remains fenced/inactive) | live resolver call |
| Geo mix | Sydney ×4 · Perth ×1 · generic ×1 | `c.client_brand_asset` |
| `geo_scope` storage | `asset_meta->>'geo_scope'` — **not a column** | `information_schema` |
| Resolver | `resolve_slot_assets` v1.4, `STABLE SECURITY DEFINER`, `search_path=''` | `pg_get_functiondef` |
| Resolver ACL | `postgres=X/postgres \| service_role=X/postgres` — **anon/authenticated NOT granted** | `pg_proc.proacl` |
| Recent-use history source | `m.post_render_log.render_spec.template.tmr.slot_reasons[slot='Background'].asset_key` — already stamped per render | live query returned real keys |
| Governed B-roll renders so far | **none** — last renders (2026-07-27) predate activation and used still-image backgrounds | live render log |
| Production call signature | `p_platform = NULL`, `p_seed = post_draft_id` | `video-worker/index.ts:1251` |

### 2.1 🔴 The blocking finding: copy geography does not exist in ICE

- `m.post_draft` has **no** locality/region/suburb column.
- **0 of 281** recent property-pulse drafts carry `digest_item_id`, so the
  `f.canonical_content_item.content_region_key` lineage is entirely absent.
- That field is national-granularity only anyway (`au` / `AU` / `unknown`) — it can never
  distinguish Sydney copy from Perth copy.
- Live `video_short_stat` copy is **national macro-economic** content (RBA cash rate, Q2
  CPI, national jobs data). No suburb, city or state appears.

**Consequence.** The rule "when copy geography is unknown, select only generic or
national-safe assets" is correct, but taken literally against a system that records no copy
geography it pins **100%** of renders to the single generic clip — contradicting the same
requirement set's "all six clips remain reachable / no clip permanently starved", and
undoing the ratified pool-6 target.

## 3. Decisions taken (PK-reversible; both were put to PK and the session returned no answer)

| # | Decision | Rationale | How to reverse |
|---|---|---|---|
| D1 | Copy geography becomes an explicit **declared** fact per (client, format), seeded `property-pulse` + `video_short_stat` ⇒ `au` (national) | Truthful — the copy genuinely is national. National is *broader* than a Sydney/Perth clip, so all six stay reachable AND the conflict rule stays live. Nothing is relabelled. | `UPDATE c.client_format_copy_geography SET copy_geo_key=…` — one row |
| D2 | Recent-use exclusion is **sticky on retry**: history excludes rows whose `post_draft_id` equals the seed | Re-rendering the same draft reproduces the same clip. Renders stay idempotent; a retry storm cannot walk the pool. The timeout/retry path is live and real. | Remove the `post_draft_id::text IS DISTINCT FROM p_seed` predicate |

**Not chosen:** treating any Sydney footage as generic; inferring geography from filenames,
`asset_name` or copy text; widening the unknown branch.

## 4. In scope

1. `c.geo_class` — canonical geography classes as a containment tree (generic / national /
   state / metro). `generic` is its own root, so it can never absorb a locality claim.
2. `c.client_format_copy_geography` — the governed declaration; **absent row = UNKNOWN =
   fail closed** to generic/national-safe only.
3. `public.geo_relation(text,text)` — structured containment; never reads filenames.
4. `resolve_slot_assets` **v1.4 → v1.5** via `CREATE OR REPLACE`:
   geography filter → asset-shortage fail-closed → three-tier recent-use avoidance →
   unchanged seeded index → visibility payload.

## 5. Out of scope / forbidden actions

- ❌ **No signature change.** `DROP`+`CREATE` would reset the ACL to anon-executable (the
  standing ICE default-ACL trap). `CREATE OR REPLACE` preserves it. This also means
  **`select_template` is unchanged and no edge function is deployed.**
- ❌ No change to the production template winner (`46c5c4ac` / `dd5fd75e`).
- ❌ No change to the 1080×1920 / 12s parity overlay (video-worker v3.15.0 untouched).
- ❌ No clip sourced, promoted, un-fenced, relabelled or mutated — **zero DML on
  `c.client_brand_asset`**.
- ❌ No voice, music or logo binding touched.
- ❌ No client-specific hardcoding — every rule is data-driven off the two new tables.
- ❌ No apply, no deploy. **The lane stops at the apply gate.**

## 6. The scope fence (the key safety property)

All new selection logic is gated on `v_bg_is_video`. A template whose Background field is an
IMAGE takes the v1.4 path with **byte-identical** behaviour. Proven, not asserted — see
result doc P6.

## 7. Success criteria

1. No consecutive repeat across a production-shaped sequence.
2. All six clips reachable; distribution balanced; nothing starved.
3. Sydney clips excluded from Perth/Brisbane/other conflicting locality copy.
4. Unknown copy geography ⇒ generic / explicitly national-safe only.
5. No compatible clip ⇒ fail closed with an asset-shortage reason; requested format never
   silently substituted.
6. Selection visibility recorded per render.
7. Image-background path unchanged.
8. Rollback written **and validated** before apply.

## 8. Stop condition

**Artifacts authored, dry-run proven, recorded, committed and pushed — apply NOT run.**
PK owns the apply gate. Post-apply proofs are listed in the runbook and are the next lane.

## 9. Open items carried to the gate

1. **D1 and D2 are unratified defaults.** Both are recorded above with one-line reversals.
2. **`db-rls-auditor` has not run.** CLAUDE.md requires it in every T3 chain. It was not
   invoked in this session; the DB evidence here is orchestrator-level R1 read-only work.
   **Run it at the gate before apply** — specifically on the two new tables' RLS/grant
   posture and the `c`-schema PostgREST exposure.
3. **Geography enforcement is live but its conflict branch is dormant** on real data: with
   copy declared `au`, no live clip can conflict. The branch is proven by construction
   (P3), not by production traffic.
4. **Recent-use history is empty at apply.** No governed B-roll render exists yet, so the
   first render after apply exercises the `excluded_2` tier with an empty exclusion set.
