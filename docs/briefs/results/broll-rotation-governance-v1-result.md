CLAIMED · broll-rotation-governance-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · pre-apply record · 2026-07-29

# Result — Governed Creatomate B-roll: Rotation Governance v1 (PRE-APPLY)

**Date:** 2026-07-29 Sydney · **Lane:** SAFETY_GATE · **Tier: T3**
**Status:** **BUILT + DRY-RUN PROVEN + ROLLBACK VALIDATED — NOT APPLIED.** Stops at the PK
apply gate exactly as instructed.
**Brief:** `docs/briefs/broll-rotation-governance-v1-brief.md`
**Artifacts:** `docs/briefs/artifacts/broll-rotation-governance-v1-migration.sql` ·
`docs/briefs/artifacts/broll-rotation-governance-v1-rollback.sql`
**Basis:** HEAD `b32d601`, parity ahead 0 / behind 0. All DB work was
`BEGIN … ROLLBACK` against **production** (Supabase dev branches come up bare and are
useless for this — standing ICE carry).

> **Outcome in one line:** both missing controls are built and proven — 0 consecutive
> repeats over 120 production-shaped renders with all six clips reachable, and a structured
> geography compatibility gate that excludes contradictory footage and fails closed on
> shortage — with **zero** changes to the template winner, the parity overlay, any edge
> function, or any asset row. **The pool is 6; nothing is applied yet.**

---

## 1. What was built

| # | Object | Kind | Purpose |
|---|---|---|---|
| 1 | `c.geo_class` | new table | Canonical geography containment tree: generic / national / state / metro. `generic` is its own root so it can never absorb a locality claim |
| 2 | `c.client_format_copy_geography` | new table | The **governed declaration** of copy geography per (client, format). **Absent row = UNKNOWN = fail closed** |
| 3 | `public.geo_relation(text,text)` | new function | Structured containment → `same` / `a_contains_b` / `b_contains_a` / `disjoint` / `unclassified`. Never reads filenames, `asset_name` or `asset_key` |
| 4 | `public.resolve_slot_assets` | **v1.4 → v1.5**, `CREATE OR REPLACE` | Geography filter → shortage fail-closed → three-tier recent-use avoidance → unchanged seeded index → visibility payload |

### 1.1 Why there is no signature change, no `select_template` change, and no deploy

The live ACL is `postgres=X/postgres | service_role=X/postgres` — anon and authenticated are
**not** granted. A `DROP`+`CREATE` (which adding a parameter would require) resets a
`public` function to the default ACL, **granting EXECUTE to anon + authenticated**. That is
the standing ICE default-ACL trap, and it would be a security regression shipped as a
feature.

So v1.5 keeps the 5-argument signature and derives both new inputs internally:

- **copy geography** from the governed declaration keyed by `(client_id, p_format)`;
- **recent-use history** from `m.post_render_log`, keyed by `(client_id, ice_format_key)`.

Consequences: `select_template` is untouched · **no edge function is deployed** · the
video-worker is untouched · the change is a single DB apply.

### 1.2 Why visibility needs no worker change

`b1_video_stat.ts:448-465` already copies `selected[].reasons` and `slot.warnings` verbatim
into `render_spec.template.tmr`. v1.5 appends the visibility payload as **reason strings**,
so every required field is durably recorded per render through the existing channel:

```
geo_class:au_nsw_sydney_metro · geo_copy:au · geo_compat:asset_narrower_than_copy
recent_use:excluded_2 · pool_eligible:6 · pool_after_geo:6 · pool_after_recent:4
fallback:<reason>        (only when a fallback tier fired)
```

plus a structured `broll_selection` object on the resolver response for any direct caller.

## 2. The finding that shaped the design

**Copy geography does not exist anywhere in ICE.** Verified three ways:

1. `m.post_draft` has no locality/region/suburb column.
2. **0 of 281** recent property-pulse drafts carry `digest_item_id` → the
   `f.canonical_content_item.content_region_key` lineage is entirely absent.
3. That field is national-granularity only (`au` / `AU` / `unknown`) — it could never
   separate Sydney copy from Perth copy even if the lineage existed.

Live `video_short_stat` copy is national macro-economic content (RBA cash rate, Q2 CPI,
national jobs data) — no suburb, city or state appears.

Applied literally, "unknown ⇒ generic only" would pin **100%** of renders to the one generic
clip, contradicting "all six remain reachable" and undoing the ratified pool-6 target. The
resolution was to make copy geography an **explicit declared fact** (`au` for this
client+format, which is true) rather than to relabel any footage. See brief §3 for the two
decisions and their one-line reversals.

## 3. Selection algorithm (v1.5, B-roll path only)

Order is deliberate: **geography first, recent-use second** — a contradiction is never
acceptable, a repeat is merely undesirable, so recent-use can never reintroduce a
contradictory clip.

1. **Geography filter.** Asset geo missing or not a known class ⇒ `geo_unclassified`
   REJECT (never silently treated as generic). `generic` ⇒ always compatible. Copy geo
   known ⇒ compatible iff asset and copy lie on one root-to-node path; different branches ⇒
   `geo_conflict`. Copy geo unknown ⇒ generic or explicitly `geo_national_safe='true'` only.
2. **Shortage fail-closed.** Nothing compatible ⇒ `status='fail_closed'`,
   `fail_reason='no_geo_compatible_background'`, nothing bound. The requested format is
   never substituted.
3. **Recent-use, three tiers.** Exclude the two most recent → if empty, exclude only the
   immediately previous (the hard requirement) → if still empty, fall back to the full
   compatible pool (a repeat beats an empty candidate set). Tier recorded either way.
4. **Seeded index unchanged** (FNV-1a) over the filtered list — determinism preserved.

History counts `status='succeeded'` only (a clip nobody saw was not "used") and is
**sticky on retry** (rows whose `post_draft_id` equals the seed are excluded), so
re-rendering the same draft reproduces the same clip.

## 4. Proofs — all run BEGIN…ROLLBACK against production

### 4.1 Production-shaped sequence (120 renders, real `post_draft_id` seeds, each render appended to history)

| Metric | Measured | Verdict |
|---|---|---|
| Consecutive repeats | **0** | ✅ PASS |
| Distinct clips reached | **6 / 6** | ✅ PASS |
| Distribution | 18.3 / 17.5 / 16.7 / 16.7 / 15.8 / 15.0 % | ✅ balanced |
| Pool counts observed | `6/6/6` → `6/6/5` → `6/6/4` (steady state) | ✅ as designed |
| Max gap between uses of one clip | **24** | ⚠️ see below |

Distribution detail: `au_nsw_urban_centre` 22 · `au_nsw_suburb_waterway` 21 ·
`au_nsw_suburb_skyline` 20 · `au_wa_perth_coastal` 20 · `generic_apartment_abstract` 19 ·
`au_suburb_aerial` 18.

> **⚠️ Reported honestly, not massaged.** I pre-set a max-gap bar of 20 and the measurement
> came in at **24**, so that check printed FAIL. **The bar was arbitrary and not
> evidence-based** — I did not move it to make the run green. On the criterion that
> actually matters, nothing is starved: every clip is used 18–22 times out of 120 (mean gap
> ≈ 5.7) and all six remain reachable. 24 is the tail of the gap distribution, not a floor.
> The pool-counts row shows why the early renders differ: real history contained
> still-image background keys, so the first renders exercised an empty/partial exclusion set
> before reaching the steady `6/6/4`.

### 4.2 Behavioural proofs

| Proof | Result | Verdict |
|---|---|---|
| P2 retry stickiness — same draft re-rendered | same clip returned | ✅ PASS |
| P3 Perth copy declared | **4 × `geo_conflict`** (all Sydney clips), pool 6→2, picked generic | ✅ PASS |
| P4 copy geography undeclared | picked `generic`, pool→1, `copy_geography_undeclared` warning raised | ✅ PASS |
| P5 asset shortage (Melbourne copy + generic fenced) | `fail_closed / no_geo_compatible_background`, **no `Background.source` bound** | ✅ PASS |
| P6 **image-background path vs v1.4 baseline** | `(v1.5 response − 'broll_selection') == v1.4 response` exactly; `broll_selection` is `null` on that path | ✅ PASS |
| P7 determinism — identical inputs twice | identical pick | ✅ PASS |
| Geography containment unit table (12 cases) | 12 / 12 | ✅ PASS |

Containment cases proven include Sydney↔Perth `disjoint`, Sydney↔national `b_contains_a`,
national↔Perth `a_contains_b`, Sydney↔Brisbane `disjoint`, `generic`↔`au` `disjoint`,
unknown class → `unclassified`, NULL → `unclassified`.

### 4.3 Rollback validated BEFORE apply (T3 requirement)

Applied the packet then ran the rollback in its prescribed order:

| Check | Result | Verdict |
|---|---|---|
| Resolver behaviour restored == pre-apply baseline | identical jsonb | ✅ PASS |
| Function definition restored | **byte-for-byte identical** | ✅ PASS |
| ACL preserved | `postgres=X/postgres \| service_role=X/postgres` | ✅ PASS |
| Governance tables removed | 0 remaining | ✅ PASS |
| Fail-closed assertion block | fires on either failure mode | ✅ present |

**Order is enforced and load-bearing:** restore the resolver **first**, then drop the tables.
Dropping first would leave v1.5 installed against missing relations — a hard error on every
governed video render.

### 4.4 A defect I found in my own artifact, and fixed

The first draft of the rollback re-typed the v1.4 body by hand and **silently dropped the
v1.4 `ANCHOR` comments**. Functionally identical, but not byte-identical — it would have
left a permanently dirty `pg_get_functiondef` diff for every future reader. Caught by
diffing the file against the live definition; the body is now written programmatically from
`pg_get_functiondef` and verified identical.

## 5. Proof fidelity — stated precisely

The dry runs executed the packet's SQL **as pasted through `execute_sql`**, which is the
migration file's text **modulo `--` comments and whitespace** (there is no writer `psql` or
DSN available in this environment; `db-read.py` is a read-only role and cannot run DDL).
Comments and whitespace cannot alter plpgsql semantics, and the file was statically checked:
no block comments, all four `$function$` tags balanced, one `BEGIN;`/one `COMMIT;`, and all
four load-bearing constructs present in the normalized body (the `v_bg_is_video` gate, the
shortage fail-closed, the sticky-retry predicate, the three recent-use tiers).

**This is closed at apply time by a mandatory step in the runbook:** after apply, dump
`pg_get_functiondef` and diff it against the file body. That is the byte-level guarantee;
until it runs, the claim is "semantically proven", not "byte-proven".

## 6. Boundaries honoured

- ✅ Template winner unchanged (`46c5c4ac` / `dd5fd75e`).
- ✅ Parity overlay untouched — video-worker v3.15.0 not edited, not deployed.
- ✅ **Zero DML on `c.client_brand_asset`** — no clip sourced, promoted, un-fenced,
  relabelled or mutated. No Sydney footage treated as generic.
- ✅ Voice, music, logo bindings untouched.
- ✅ No client-specific hardcoding — rules are data-driven off the two new tables.
- ✅ No apply, no deploy, no migration run, no render triggered.
- ✅ Image-background clients provably unaffected (P6).

## 7. Non-claims

- ❌ **Not claimed: this is live.** Nothing is applied. The pool still rotates by v1.4 rules.
- ❌ Not claimed: the geography conflict branch has fired on real traffic. With copy declared
  `au`, no live clip can conflict — the branch is proven by construction (P3), not by
  production.
- ❌ Not claimed: copy geography is measured. It is **declared** (brief §3 D1), and the
  declaration is only as true as the copy it describes.
- ❌ Not claimed: repeats are impossible. Tier 3 permits a repeat when only one compatible
  clip exists — deliberately, and it is recorded when it happens.
- ❌ Not claimed: `db-rls-auditor` reviewed this. It did not run in this session (brief §9.2)
  — required at the gate.
- ❌ Not claimed: byte-identity between the executed text and the file (§5).
- ❌ Not claimed: the four-of-six Sydney concentration is fixed. Rotation is now even across
  what exists; the pool's *content* diversity is a separate sourcing question.

## 8. Review chain

| Check | Verdict | Note |
|---|---|---|
| Live read-only ground truth | complete | resolver body, ACL, asset rows, render-log shape, draft lineage, worker call site |
| Dry-run proofs (production, rolled back) | 20 / 21 checks PASS | the one non-PASS is the arbitrary max-gap bar, §4.1 |
| Rollback validated pre-apply | PASS | byte-for-byte restore + ACL preserved |
| Git state | `main`, HEAD `b32d601`, ahead 0 / behind 0 | source-truth-check at session start |
| `db-rls-auditor` | **NOT RUN** | required at the gate (brief §9.2) |
| External review | **NOT RUN** | required before the apply gate per CLAUDE.md |

## 9. Stop condition

**Met.** Artifacts built, proven, rollback validated, records written, committed and pushed.
**The apply is PK's.** Nothing in production has changed.
