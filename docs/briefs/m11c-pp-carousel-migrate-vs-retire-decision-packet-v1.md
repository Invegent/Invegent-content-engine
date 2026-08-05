# M11c — Property Pulse Carousel: Migrate vs Retain vs Retire — PK Decision Packet v1

**Lane:** `m11c-pp-carousel-migrate-vs-retire`
**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor (this pass):** chat (Claude Code) — read-only repo/doc research; `db-rls-auditor` attempted, DB access unavailable this session (see §11)
**Status:** `DESIGN_COMPLETE` — no mutation performed. Zero schedules/governance rows/workers/templates/
dashboard code/live carousel production touched.
**Tier:** T1 (docs/read-only, design). Whichever disposition PK selects becomes its own future
Gate-1 brief at the tier its own scope requires (see §9 for the migrate-path seed, itself T2/T3).
**Predecessor:** `docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md` (commit `46edf6d`) —
this packet resolves exactly the one open question that scoping lane deliberately deferred (§4.3,
Seed Packet C), now answered in full rather than merely scoped.
**Result file:** N/A this pass — this document is the deliverable.

---

## 0. Authoritative inputs

Same lineage as M11b, not re-derived: `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md`
(§6/§7 + §12 addendum), `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md`,
the applied `post-cgu-v1-optimum-schedule-expansion` v11 packet/result, and the CGU Final programme
brief's ratified M11 retirement default (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md`
§2.2/§0f — *"migrate every active/scheduled/committed legacy route to governed by default; explicit
retirement reserved for unused/superseded/disproportionately-expensive routes, each with a recorded
PK disposition"*). New to this packet: `docs/governance/pp-tmr-definition-of-done-v1.md` (the existing
C-OQ1 ruling carrying carousel as an accepted exception to PP's Ultimate TMR definition of done) and
`docs/research/platform_format_mix_defaults.md` (the research basis for carousel's target share of
PP's platform mix).

---

## 1. Current PP carousel volume by platform

**Last independently verified: 2026-08-04 (M11a inventory + D2 result), not re-verified live this
session — DB access was unavailable (§11); treat these as the last-known, not today's, numbers.**

| Metric | Facebook | Instagram | Combined |
|---|---|---|---|
| 90d succeeded / failed renders (M11a) | 129 / 38 | 127 / 11 | 256 / 49 |
| Real delivered posts (D2 §5, underlying same window) | 23 | 14 | **37** |
| Total carousel drafts (D2 §5) | — | — | **104** |
| `m.post_carousel_slide` rows across those drafts | — | — | **629** |

An earlier, independent pull (`pp-tmr-definition-of-done-v1.md`, 2026-07-10) cited **94 drafts/90d** —
consistent with organic growth to 104 by 2026-08-04, not a contradiction. **LinkedIn carries zero
carousel volume for PP** — it was never a committed PP cell for this format, and LinkedIn carousel
publishing is hard-BLOCKed at the code level for every client regardless
(`linkedin-zapier-publisher/media_action.ts:10`, `method_not_enabled_v0`).

**Draft-to-publish conversion is low (37/104 ≈ 36%)** — a material fact for the business-value
question in §3: roughly two-thirds of carousel drafts never reach a real post. M11a/D2 do not break
down *why* (approval rejection vs. render failure vs. scheduling attrition) — this is a genuine open
question for whoever picks up the migrate path (§15 decision #5 names it as a pre-migration data
point worth having, not something this packet invents an answer for).

---

## 2. Schedule and content-strategy dependency

Two distinct, only loosely connected mechanisms exist, and conflating them would misstate the real
dependency:

1. **`c.client_publish_schedule.format_override`** — confirmed, repo-wide, **dead code**: no edge
   function reads it for format selection (M11a addendum §12). PP's schedule rows do not "decide"
   carousel eligibility; the v11 packet's own PP baseline check (`_pp_carousel_baseline`) uses PP's
   general enabled-schedule-row count (10, per the applied-result spot-check) purely as a drift-guard
   proxy, not a carousel-specific lever.
2. **`t.platform_format_mix_default`** — a real, seeded, research-backed target-mix table
   (`docs/research/platform_format_mix_defaults.md`): **carousel is recommended at 25% of Facebook
   slots, 30% of Instagram slots, and 40% of LinkedIn slots** — the highest share of any single
   format on two of the three platforms, and the outright highest on LinkedIn. The doc's own
   citations (Buffer 2026, Hootsuite 2026/2025) report carousel as the highest-engagement format on
   every platform and every industry vertical checked, with **zero exceptions found**. This table is
   consumed by two dashboard-facing RPCs (`get_global_format_capability_pyramid`,
   `get_publishing_plan_pyramid`) and by the **live, applied, shadow-posture** `m.resolve_final_format`
   resolver (migration `20260725223652`, R3a) — which computes a policy-driven format decision into
   new additive shadow columns on every draft, **without yet being the live production authority**
   (that remains the ai-worker Claude advisor's `recommended_format` write, pending a separate,
   not-yet-run "R3c flip gate").

**Net dependency:** carousel is not schedule-pinned in the sense of an explicit cadence lock, but it
*is* strategy-pinned — it is the single highest-weighted format in the documented target mix for two
of PP's three platforms, and that weighting is already live-shadow-evaluated on every draft today
(not yet acted on). Retiring carousel does not just remove a format; it removes the top-weighted
target-mix format on Instagram and (nominally) LinkedIn, and the second-highest on Facebook, from a
policy the codebase has already operationalised as far as shadow-computation, one flip gate away from
production authority.

---

## 3. Actual business/output value

- **Research basis is strong and platform-general**, not PP-specific speculation: Instagram carousels
  6.9% engagement vs. 3.3% for Reels; LinkedIn carousels 21.77% — 196% more than video, 585% more than
  text-only; nonprofit/healthcare/financial-services verticals all show carousels leading or
  co-leading engagement (`platform_format_mix_defaults.md` §Instagram/§LinkedIn/§industry tables).
  Reach is the counterweight named in the same doc (Reels/video reach further per-post) — the doc's
  own conclusion is that a mix needs both, not that carousel should dominate alone.
- **An existing PK ruling already treats carousel as strategically in-scope, not a throwaway
  experiment**: `pp-tmr-definition-of-done-v1.md`'s **C-OQ1** (2026-07-10, reinforced 2026-07-17)
  explicitly carries carousel **IN scope for PP Ultimate TMR**, "satisfiable by governed **or**
  explicitly carried" — i.e., PK has already ruled once that carousel matters enough to be a named
  target, while also already accepting, once, that it doesn't have to be governed *yet* to call
  Static/Ultimate Done. This is direct precedent for the "retain temporarily" disposition — it is not
  a novel idea this packet is introducing.
- **That same doc also recorded a real quality check**: the "carousel body-slide investigation" (task
  `task_8c5dab3b`) measured a text/second-surface overprint defect at "non-blocking, 0/600" — i.e.
  carousel has at least once been subjected to a real defect-rate measurement, even though it sits
  outside `render-qa`'s v0 instrumented scope today (`actions/render-qa.ts:26-38`,
  `QA_V0_CREATOMATE_FORMATS` explicitly excludes it).
- **Conversion caveat (§1):** 37 delivered posts from 104 drafts is real output, but at a materially
  lower conversion rate than this packet can fully explain from existing docs — the business-value
  case rests on the *delivered* 37/quarter, not the gross 104, and whoever owns the migrate-or-retain
  decision should treat the conversion gap as worth a cheap investigation before the next PK gate, not
  because it changes today's disposition but because it changes how big a "cost of retaining legacy"
  number actually is.

**Conclusion for this section:** carousel is not a marginal, historically-accumulated format for PP
the way it was for CFW/NDIS/Invegent (M11b) — it is a strategically-weighted, research-grounded,
already-once-explicitly-ruled-on format with real, if imperfectly-converting, delivered output.

---

## 4. Complete draft → slide → render → publish route (code-cited)

| Stage | Mechanism | Citation |
|---|---|---|
| **1. Draft format selection** | `ai-worker`'s `fetchFormatContext()` offers `carousel` in the advisor palette (gated by `c.client_format_config`, PP's row `fc339e1e…` stays `is_enabled=true`); `callFormatAdvisor()` (Claude) picks it for content with "3+ distinct structured points and minimum 200 words" | `ai-worker/index.ts:1188-1197, 1234-1250` |
| **2. Content-to-slides** | `image-worker`'s carousel block picks up `recommended_format='carousel'`, `image_status='pending'` (deliberately **no** `approval_status` gate, to avoid an approval/render deadlock); calls `callContentAdvisor()` (Claude, `claude-sonnet-4-6`) which returns a 3–6 slide spec (`hook`/`point`/`cta` types, headline ≤55 chars, sub_text ≤90 chars) | `image-worker/index.ts:1208-1213, 826-839` |
| **3. Per-slide render** | `buildCarouselSlideScript()` — a **100% code-generated Creatomate source-mode script**: fixed 1080×1080 canvas, hand-coded `elements[]` (shapes + text + optional logo image), background is a **flat brand-colour fill** (`fill_color: primaryColour`), no background image, no template row, no `select_template` call of any kind | `image-worker/index.ts:841-865` |
| **4. Asset binding (the whole of it)** | `getBrandAndSlug(clientId)` reads `c.client_brand_profile` directly for `brand_logo_url`/colours/name — **one** bound asset (the logo), sourced with **zero rotation, zero pool, zero resolver** (contrast: `image_quote`'s TMR path calls `resolve_slot_assets` via `select_template`'s embedded `slot_resolution`) | `image-worker/index.ts:1034-1038` |
| **5. Slide persistence** | `upsert_carousel_slide` RPC → `m.post_carousel_slide` (slide_index, slide_type, headline, sub_text, image_url, image_status, render_id) | `image-worker/index.ts:1244-1247` |
| **6. Render logging** | `renderUploadAndLog()` → `write_render_log` RPC → `m.post_render_log`, called **without a `renderSpec` argument at all** for carousel (the call site simply omits the field) → `p_render_spec` resolves to `NULL` at the SQL layer, confirmed at the function definition | `image-worker/index.ts:1242-1243` (call site), `write_render_log`, `supabase/migrations/20260626000000_h3_1_write_render_log_attempt_number_autocompute.sql:39-73` |
| **7. Publish — Facebook** | `publisher/index.ts` — organic multi-photo carousel via Graph API | `publisher/index.ts:429-526` |
| **8. Publish — Instagram** | `instagram-publisher/index.ts` — per-slide child container → parent carousel container → publish | `instagram-publisher/index.ts:374-404, 820-850` |
| **9. Publish — LinkedIn** | Classified correctly but hard-BLOCKed (`method_not_enabled_v0`) — moot for PP, which never scheduled carousel on LinkedIn | `linkedin-zapier-publisher/guard.ts:26,81-85`, `media_action.ts:10` |

**A genuinely new finding this session:** `m.post_carousel_slide`'s own table-creation SQL and the
`upsert_carousel_slide` RPC's definition **do not exist anywhere in `supabase/migrations/`** — a
repo-wide search for `CREATE TABLE` / `CREATE FUNCTION` matching either name returns zero results.
This is the same "chat-applied migration never backfilled to repo" pattern this programme has already
named as a standing risk (L-v3.06-a) — carousel's core data model has no tracked schema definition at
all, not even an untracked-but-findable one. Whoever picks up the migrate path should backfill this
before touching the table, per the repo's own established discipline (reconstruct from
`information_schema`/`pg_get_functiondef` live reads, the same method used for the R3a resolver
reconciliation, `docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md`).

---

## 5. Missing template identity, asset binding, and render provenance

Concretely, relative to `image_quote`'s TMR path, carousel has:

| Evidence type | `image_quote` (governed) | `carousel` (today) |
|---|---|---|
| Template identity | `select_template` winner: `implementation_id`, `registry_template_id`, `variant_key`, `format_key`, `aspect_ratio` | **None** — no template row exists anywhere for carousel |
| Background asset | Resolved via `resolve_slot_assets`, evidenced by `asset_keys`/`asset_ids` | **None** — flat colour fill, not an asset at all |
| Logo asset | Resolved via the same `slot_resolution`, fail-loud reachability check | Read directly from `client_brand_profile`, no rotation/pool, best-effort fallback to plain text if absent |
| `props_hash` | Computed, deterministic, stored | **Not computed** |
| `resolver_used` / `fallback_taken` flags | Present, self-documenting | **Not present** |
| `render_spec` | Full TMR evidence object (`template`, `tmr`, `background_key`, `contract_validation`) | **`NULL`**, every render, by omission at the call site (§4, row 6) |
| QA instrumentation | In `QA_V0_CREATOMATE_FORMATS` scope | **Explicitly excluded** (`actions/render-qa.ts:26-38`) |
| Capability classification | Real `select_template`/`resolve_slot_assets` composition | Would resolve to `template_missing` if ever run through `classify_format_capability` (no code special-cases it; confirmed zero `'carousel'` references in either classifier migration) — an outcome the codebase already anticipates literally (`capability_blocked:template_missing:carousel`, cited verbatim in `docs/briefs/s9-resolver-enforcement-build-brief-v1.md:198`) |

**This is not a partial governance gap — it is a complete absence of the entire evidence contract**
that every other governed format in this programme has. A production incident involving a wrong or
stale carousel render today would have no `render_spec` to diagnose from, no template version to roll
back, and no asset-resolution trail to audit — only the raw Creatomate render script itself,
reconstructable only from the render log's `output_url`/`storage_url`, not from any structured
evidence field.

---

## 6. Schema/worker/resolver/dashboard/evidence changes required for a governed migration

*(Populated from this session's Creative Library v2 / TMR-mechanics research, `docs/creative-library/
registry-schema-v2.md` read in full — see citations below.)*

**The declarative object graph itself is layered, and the single-render assumption is concentrated in
exactly one layer, not spread across all five:**

- **Style Guide (§1)** and **Creative Patterns (§2)** are format-agnostic siblings — nothing here
  assumes a single render. PP's own Style Guide purpose string already spans "static, carousel, and
  video formats" descriptively (`property-pulse.json:27`). A carousel's per-slide `hook`/`point`/`cta`
  structure (`docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md` §4 step
  2) maps naturally onto a new `pattern_type` enum value (alongside the existing `branding_strip`/
  `headline_block`/`stat_card`/etc., `registry-schema-v2.md:74-75`) — **this layer needs no
  structural change**, only a new enum member.
- **Template Families → Variants (§3) is exactly where the single-image assumption lives, concretely.**
  The Variant object (`registry-schema-v2.md:99-111`) declares `template_variant_key`,
  `aspect_ratio`, `output_type`, `provider_template_id` — **all scalar fields describing one rendered
  artifact.** There is no `slides[]`, no `sequence`, no per-slide sub-variant array anywhere in the
  schema today. A carousel entry needs either (a) extending the Variant object with a `slides: [{
  slide_variant_key, provider_template_id, required_fields }]` array (turning one Variant into a
  container of N independently-proof-tracked slides), or (b) a new sibling object type ("Sequence"/
  "Slide Set") sitting between Template Family and Variant. **Neither is pre-decided here — this is
  the real open design question**, matching what D2's own result doc already flagged ("extending the
  Creative Library v2 schema to represent a non-template-family multi-slide object... its own
  design-gate lane," `d2-...-v1.md:18-20`) and what M11b's Seed Packet C named without resolving.
- **Evidence (§5)** compounds the same question: "only variants carry a render-based `proven` status"
  and require "a real `render_log_id`" — **singular** (`registry-schema-v2.md:109-110,162-164`).
  Whichever Variant shape is chosen, PK/the build lane must also decide what "proven" means for a
  carousel: every slide independently proven, or the sequence-as-a-whole against one representative
  render — the schema's current proof model does not answer this for free.
- **Capability Contracts (§7, v0.3)** map one `contract_key` to exactly one `template_variant_key`
  (`registry-schema-v2.md:197`) — this layer inherits whichever choice is made above without its own
  independent change.

**The runtime consumption path has the identical single-render assumption, not just the schema.**
`buildTmrRenderPlan()` (`supabase/functions/image-worker/b1_production.ts:356-417`) returns exactly
one `{ providerTemplateId, modifications, tmrEvidence, backgroundAssetKey, logoAssetKey }` per call —
**a carousel migration needs this plan builder extended in lockstep with whichever schema option is
chosen**, not as an independent, later concern.

**This would be the first multi-object/multi-render Creative Library extension of any kind in this
repo, static or video — genuinely new ground, not an extension of an established pattern.** There is
no static multi-slide precedent to reuse (the only similarly-named TMR object,
`generic_carousel_cover_1x1_v1`, is a single-image "cover" template, already correctly distinguished
from carousel-the-format in D2's own result doc — not a multi-slide precedent). The closest adjacent
effort is CGU Final's own **M13 — "Governed Template Build Pack v1"** (schema design + structural-diff
automation + graduation-gate authority), explicitly sequenced *before* M6 (video multi-scene) in the
programme's own dependency ordering, but **"Not yet scoped"** — nothing concrete exists there to
reuse yet, only a stated sequencing intent that a carousel migration should track, and possibly
coordinate with rather than duplicate (§15 names this as a PK decision).

**`property-pulse.json` (and every other client's Creative Library JSON, confirmed by direct read)
still has zero carousel/multi-slide family or pattern entry today** — only the brand-constitution
purpose string's passing mention, no declarative object.

**`select_template` / `resolve_slot_assets` generalisation (§7 expands on this, with an important
caution):** both RPCs key purely on `(client_slug, platform, format, variant_intent, seed)`, with the
winner/asset-resolution logic living entirely in the declarative registry + database function — no
per-client **or per-format** code branch/allowlist exists in either RPC body (confirmed by reading the
actual PL/pgSQL, not just the header comments). A new `format='carousel'` candidate set, once
registered with real `c.creative_provider_template` rows and a `c.creative_template_client_assignment`
for PP, would be selectable by the existing, unmodified selector/resolver machinery.

**Worker change required:** `image-worker/index.ts`'s carousel block needs a new governed branch,
parallel to `image_quote`'s (§4; D2's migration comment: `isImageGovernanceEnabled` is hardcoded to
`'image_quote'` only). The branch would call `select_template`/`resolve_slot_assets` per whichever
schema shape (§6 above) is chosen, build a real `renderSpec` matching `image_quote`'s TMR evidence
shape, and pass it into `renderUploadAndLog()` — currently omitted entirely for carousel (§4, row 6).

**Schema/migration change required regardless of disposition:** backfilling `m.post_carousel_slide`'s
own `CREATE TABLE`/`upsert_carousel_slide` definitions into `supabase/migrations/` (§4's new finding)
is a pure git↔DB parity fix, needed independent of which disposition PK selects. Beyond that, the
Creative Library schema extension (above) drives whatever new registry tables/columns a migration
specifically needs.

**Dashboard change:** per M11b's own dashboard research (§1.1 of that packet, carried forward here
unchanged) — none of the existing dashboard surfaces need code changes for a migration; they already
render `client_format_config`/`client_creative_governance` state generically. The one true dashboard
gap remains documentation, not code: no IA spec exists for how "governed" vs "declared-legacy" vs
"retired" should look distinctly, which matters more for a migration's *rollout* visibility than for
the migration itself.

**Evidence/proof changes:** whatever migration lane executes this would need to close the `render-qa`
v0 exclusion (§5) as part of its own success criteria, or explicitly carry it forward with a named
reason — silently leaving carousel un-QA'd after a "governed" migration would be a real regression
per the CGU Final M11 rule's own spirit (governed = the *full* evidence path, not a partial one).

---

## 7. Does the governed design generalize to future clients without client-specific code?

**Yes, on the evidence gathered — carousel is the single cleanest generalization case in this whole
programme, precisely because it currently has zero client-specific code to begin with.** Every stage
in §4's route table (draft selection, slide generation, per-slide render, publish) runs identical code
for all four clients today — the *only* thing that differs per client is data (`client_format_config`
rows, brand colours/logo). A TMR migration would not be introducing generalization to a
client-branching mechanism — it would be *removing* the one place carousel currently reaches into
`client_brand_profile` directly (§4, step 4) and replacing it with the same `client_slug`-keyed
`select_template`/`resolve_slot_assets` call every other governed format already uses for all four
clients without incident. The generalization risk in this migration is not "will it work for a second
client" (it already structurally would, by the selector's own design) — it is entirely concentrated in
the Creative Library schema question (§6): whichever multi-slide representation is chosen has to be
authored once per client's `property-pulse.json`-equivalent file (as `image_quote` already is,
per-client, today), which is normal TMR content work, not a code-generalization risk.

**One real caution, not a reason to reverse this conclusion:** the selector's *design* is
client/format-agnostic, but the *deployed* `select_template` function has, at least twice in this
repo's own history, silently diverged from its tracked migration lineage — an undocumented
`scope='client'` extension shipped to production with no migration file at the time
(`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §0.3), and the
subsequent `CREATE OR REPLACE` (cc-0089, applied 2026-07-31) appears to be based on the original body
and does not obviously carry that extension forward. Neither this packet nor the research behind it
independently re-verified live DB state (out of scope, read-only, and DB access was unavailable this
session regardless — §11). **Any migration build lane's own Phase 1 must include a live
`pg_get_functiondef` read of the deployed `select_template`/`resolve_slot_assets` bodies as a named
precondition** — not assume the migration files alone describe current behaviour. This is a caution
about verifying the mechanism before relying on it, not a finding that the mechanism itself doesn't
generalize.

---

## 8. Migration complexity, operational risk, and proof ladder

**Complexity — real, not trivial, concentrated in two places:** (a) the Creative Library schema
decision (§6) is genuine, unresolved design work — this is the same judgment D2's own result doc
already flagged as "its own design-gate lane," and this packet does not resolve it, only frames the
two live options; (b) building + proving N-slide-aware render logic in `image-worker` is a real code
change to a currently 100%-legacy-composed block, touching a shared surface (§1 of M11b: identical
code serves all four clients, so any code edit here is fleet-wide by construction, even though only PP
would initially have a governed carousel assignment).

**Operational risk:** carousel is PP's **highest-volume ungoverned format** by a wide margin (104
drafts/90d vs. the much smaller `video_short_kinetic`/`video_short_stat` volumes this same programme
has already migrated) — a migration bug here has more blast radius, by volume, than any prior
migration in this programme. Mitigant: the D2 declared-legacy governance row already exists and is
`enabled=true` but structurally inert (never consulted by the render path, §4) — a governed cutover
can reuse the exact "dark-then-flip" pattern this programme has already proven twice (PP video_short_
stat and video_short_kinetic both landed `enabled=false` first, proof events attached, then flipped
live only after a proof render — `docs/00_action_list.md` v6.120/v6.121).

**Proof ladder — mapping onto the existing 13-rung graduation contract**
(`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4, a reusable,
format-agnostic checklist built on 9 canonical DB-tracked proof states): rungs 1-5 (provider existence
→ field-contract compatibility → dimension/output parity → governed asset resolution → n/a audio
check) roll up to **`candidate`**/**`ready_for_proof`** and are pure design/build work following
whichever Variant/Sequence shape §6 resolves to — but **rung 1 itself cannot be expressed until §6's
schema question is answered**, since "provider existence" needs a Variant (or Sequence) object to
attach to; rung 6 (a real `creative_template_proof_event` row, PK visual approval) is the first hard
human gate, rolling up to **`visually_approved`**, and must not be skipped or inferred from any prior
carousel approval — none exists, carousel has never been visually approved as a governed artifact,
only accepted as an ungoverned legacy output; rungs 7-9 (supervised render through the real worker
path → first real governed draft → first real publish, rolling up to **`render_proven`** →
**`real_draft_proven`** → **`publish_proven`**) are where the D2 "dark-then-flip" pattern applies
directly, exactly as it did for `video_short_stat`/`video_short_kinetic`; **rung 10 (live selector-
eligibility) is a named trap worth calling out explicitly** — the graduation contract itself warns
that a *status* read is not sufficient, only an actual live `select_template` RPC call confirming the
template is really returned as `selected` (its own cautionary precedent: a prior format's `scope`
column gap meant a status read alone would have been wrong); rung 11 (rollback proof, a byte-exact
reverse validated against a captured pre-image, before any forward change) matches this packet's own
§12 rollback shape; rung 12 (`production_proven`, gated on client-attributable evidence only — never
inherited from another client or aggregated across templates) is the actual "done" bar; **rung 13
(post-promotion health monitoring, not a one-time check) has a real, named cautionary example already
in this repo's history — a 62.5% PP render-timeout rate surfaced only through *ongoing* monitoring
after promotion, not at the promotion gate itself** (same source doc) — a carousel migration, given
its per-slide sequential Creatomate-call pattern (§4, step 3) and the render-latency risk named below,
should treat rung 13 as a real, not perfunctory, requirement.

**Named risk this packet will not soften: this migration would be the first multi-object/multi-render
Creative Library extension of any kind in this repo (§6)** — the proof ladder above is proven for
single-render formats only; applying it to a sequence-of-slides object is itself part of the open
design work, not a mechanical checklist run.

**Named risk this packet will not paper over:** carousel's render is **entirely synchronous per-slide
Creatomate calls in a loop** (§4, step 3) inside a single edge-function invocation — a governed
version adding a `select_template` RPC round-trip per slide increases the invocation's total latency
and Creatomate-call count proportionally to slide count (3-6×). Whether this fits inside the
2-minute EF wall-clock budget this programme has used as a hard ceiling elsewhere (M6, §0 of the CGU
Final brief) is an open question a migration build lane must measure, not assume.

---

## 9. Cost and risk of retaining the legacy route (Option 2 — retain temporarily, declared legacy)

- **The `tmr-drift-probe` side effect is real, ongoing, and disclosed, not hypothetical** — every
  day since 2026-08-02, the daily cron's status reads `error` instead of `ok` because PP's D2
  governance row has no `declarative_registry_ref` (§10 below has the full treatment). Retaining the
  legacy route as-is means this continues indefinitely, or until the separately-carried Option-B patch
  (`tmr-drift-probe` skip-if-unresolvable) lands — which is itself an unstarted, separate T2 code lane.
- **No evidence/QA coverage accrues over time** — every additional week of legacy carousel volume is
  additional un-auditable production output, with the render-qa v0 exclusion (§5) meaning defects
  (like the overprint case, C-OQ1) are found only by ad-hoc investigation, not systematic instrumentation.
- **Tension with the CGU Final ratified default, named plainly:** the M11 rule (§0, this packet)
  defaults active/committed/high-volume routes to *migrate*, reserving retirement for the
  disproportionate-cost exception. "Retain declared-legacy indefinitely" is not itself one of M11's
  two named outcomes — it was accepted once already, temporarily, at C-OQ1 (2026-07-10/07-17), before
  M11 existed as a ratified rule. **Retaining is only a valid Option 2 today if PK explicitly re-rules
  it as a bounded, time-boxed carry** (a real date or a real trigger condition for revisiting it), not
  as tacit indefinite inertia — otherwise "Option 2" quietly becomes "Option 2 forever," which the
  ratified M11 default does not permit without a recorded exception.
- **Real, quantifiable technical debt is not accruing at zero cost even if nothing breaks** — the
  missing `m.post_carousel_slide` migration backfill (§4) and the missing render-qa coverage (§5) both
  get harder to reconstruct the longer they're deferred, since institutional memory of "how this
  actually behaves" is the only source for either, absent the schema/evidence this packet has already
  named as missing.

---

## 10. Impact of retirement (Option 3) on weekly output and format diversity

- **Per the target-mix research (§2), retiring carousel means giving up the single highest-weighted
  format on Instagram (30%) and LinkedIn (40%, though PP has zero LinkedIn carousel volume today
  regardless) and the second-highest on Facebook (25%, after `image_quote`'s equivalent share)** — if
  PP's actual cadence ever converges toward the documented target mix (via the R3a resolver's eventual
  flip to live authority, §2), retirement forecloses that convergence for this one format entirely,
  not just today's ungoverned volume.
- **Concretely, per the worked examples in `platform_format_mix_defaults.md`** (§2): a 5-slot/week
  Facebook cadence implies roughly 1 carousel slot/week; a 5-slot/week Instagram cadence implies
  roughly 1-2. Retirement removes that share from the mix outright — the doc's own framing is that the
  remaining formats (`image_quote`, `text`, video) would need to absorb it, which the doc itself argues
  against on reach/engagement-balance grounds ("any mix that ignores either [carousel or video] is
  wrong").
- **Retirement is the cleanest operationally** — no ongoing legacy-route risk, no `tmr-drift-probe`
  side effect (the D2 governance row would be disabled/removed, resolving it directly), no technical
  debt accrual. The cost is entirely on the content-strategy side (§2/§3), not the engineering side.
- **Retirement does not require accepting a worse *engagement* outcome forever** — it only forecloses
  *this specific bespoke pipeline*; nothing about retiring the legacy route prevents a **future,
  separately-scoped** governed carousel build being proposed again later, this time cleanly (no legacy
  carry-along). Framed honestly: retirement trades a real, if modest, near-term content-mix cost for a
  clean slate, not a permanent capability loss — the CGU Final M11 rule's own "disproportionately
  expensive" retirement exception would need to be the recorded justification if PK selects this path,
  given §3's finding that carousel is not a marginal format for PP specifically.

---

## 11. Treatment of the `tmr-drift-probe` side effect (each disposition's path)

| Disposition | What happens to the side effect |
|---|---|
| **Migrate** | Once a real Creative Library registry entry + `declarative_registry_ref` exists for PP carousel (a natural consequence of building the governed path, §6), `tmr-drift-probe`'s `fetchGovernedClients()` sweep resolves cleanly for this row — the side effect is closed **as a byproduct of migration**, not by a separate patch. |
| **Retain (declared-legacy)** | The side effect continues indefinitely unless the separately-carried Option-B patch (`tmr-drift-probe` skip-if-unresolvable-`declarative_registry_ref`) is built and deployed — its own unstarted T2 lane, not part of this packet. PK previously accepted this (Option C, D2 result §8) as a disclosed, known cost; retaining longer only extends that acceptance, it doesn't change its shape. |
| **Retire** | Disabling or deleting the D2 governance row removes the offending row from `fetchGovernedClients()`'s `WHERE enabled=true` scan entirely — the side effect closes immediately, the same way it would for any other client's carousel row that never existed. |

**This packet does not pre-select the Option-B patch as mandatory for any path** — it is one
legitimate way to resolve the *retain* disposition's cost (§9), but not the only one (time-boxing
retain, or migrating, both resolve it structurally without touching `tmr-drift-probe` at all).

---

## 12. Rollback and containment requirements per disposition

| Disposition | Rollback / containment shape |
|---|---|
| **Migrate** | Standard dark-then-flip pattern already proven twice in this programme (video_short_stat, video_short_kinetic): new governance/registry rows land `enabled=false` first; a supervised proof render exercises the real worker path before any flip; rollback = re-disable the governance row (`enabled=true→false`) plus (if needed) revert the worker code branch — both cheap, reversible, no data loss, matching this programme's apply/rollback-identity discipline. |
| **Retain** | No apply, no rollback needed — this is the status quo. If PK time-boxes it (§9), the "rollback" is simply the time-box's own expiry triggering a fresh decision, not a DB action. |
| **Retire** | `c.client_format_config`'s carousel row → `is_enabled=false` (draft-eligibility closes, same mechanism as the NDIS/CFW/Invegent closures in M11b); the D2 `c.client_creative_governance` row → `enabled=false` (or an explicit retirement `contract_ref`, matching M11b's Seed-Packet-B pattern for CFW/Invegent) — **not a DELETE**, to preserve D2's own historical record rather than erase it. Rollback = re-enable both rows exactly as M11b's own seed packets specify (apply/rollback identity, no fabricated intermediate state). |

**Containment standing rule, applying to all three options for the duration of this decision packet's
own life** (i.e., until PK selects one): PP's carousel config lever stays untouched
(`is_enabled=true`, per v11's own Protection 1) — this packet proposes no change to today's live
routing, only a decision framework for PK to act on next.

---

## 13. Migrate / retain / retire comparison matrix

| Dimension | 1. Migrate to governed TMR | 2. Retain as declared-legacy | 3. Retire |
|---|---|---|---|
| Aligns with CGU Final ratified M11 default | **Yes** — the named default for active/committed routes | No — valid only as an explicit, time-boxed PK exception | Only if PK records the "disproportionately expensive" justification |
| Preserves current business value (§3) | **Yes, and improves it** (evidence/QA/rollback all gained) | Yes, unchanged | **No** — forecloses PP's highest-weighted IG/2nd-highest-FB format |
| `tmr-drift-probe` side effect | Resolved as a byproduct | Continues indefinitely (or needs the separate Option-B patch) | Resolved immediately |
| Engineering cost | **Real and genuinely novel** — this would be the first multi-object/multi-render Creative Library extension in the repo, static or video, zero prior art (§6/§8); Variant/Sequence schema decision + `buildTmrRenderPlan()` extension + worker branch + backfilled migrations (§4) + render-qa closure (§5) | None | Small — 2 config-layer disables, matching M11b's proven pattern |
| Operational risk | Real but mitigable — reuses the proven dark-then-flip pattern (§8/§12) and a format-agnostic proof ladder; highest-volume format this programme has migrated; deployed `select_template` has drifted from tracked migrations before (§7) — verify live before relying on it | None new (existing, disclosed risk only) | Minimal — same shape as 3 already-executed closures (M11b) |
| Generalizes to future clients | **Yes, cleanly** (§7) — carousel has zero client-specific code to begin with | N/A | N/A |
| Reversibility | High (dark-then-flip, cheap rollback) | Trivial (no change) | High (disable, not delete — cheap re-enable) |
| Leaves an open policy debt if selected without a fresh ruling | No | **Yes** — needs an explicit time-box/trigger, else it silently becomes indefinite | No |

---

## 14. Recommended disposition

**Migrate, sequenced as its own future build lane — not retain, and not retire.**

The evidence assembled here does not support treating this as a close call: carousel is (a) the CGU
Final programme's own ratified default outcome for an active, committed, high-volume route (§0), (b)
independently supported by real engagement research as PP's most strategically valuable format on two
platforms (§2/§3), (c) already has a dark, structurally inert governance row waiting to be made real
(D2), (d) has zero client-specific code to generalize around (§7, the cleanest case in this programme),
and (e) has a proven, low-risk rollout pattern (dark-then-flip) already exercised twice for other PP
formats (§8/§12). The blockers against migrating immediately are real, bounded, and named rather than
hidden: the Creative Library schema decision (§6) is genuinely novel — this would be the first
multi-object Creative Library extension in the repo, static or video, with zero prior art to reuse —
and the render-latency question (§8) needs measuring, not assuming. **Recommending migrate is not the
same as recommending it start immediately or in isolation**: given §6's finding that this overlaps
directly with CGU Final's own not-yet-scoped M13 ("Governed Template Build Pack v1" — schema design +
structural-diff automation + graduation-gate authority, already sequenced before M6 in the programme's
own ordering), the responsible sequencing question — coordinate with M13, or proceed independently and
risk building a schema extension M13 later has to reconcile — is itself a named PK decision (§15), not
resolved here.

**Retire is the wrong call given §3's finding** that carousel is not a marginal, accidentally-accrued
format for PP the way it was for CFW/NDIS/Invegent — retiring it here would mean discarding real,
research-grounded strategic value to solve what is, at bottom, an engineering-effort problem.
**Retain-as-is is not a stable disposition** under the CGU Final ratified rule without an explicit,
time-boxed PK exception — it is a reasonable *interim* state (and the only sane one for the weeks
this migration actually takes to design and build), but should not be mistaken for a third permanent
option.

---

## 15. PK decisions still required

None of the following are resolved by this packet — each is a real judgment call for PK, named rather
than assumed:

1. **Confirm the disposition** — migrate (this packet's recommendation), or override with retain
   (time-boxed, with an explicit expiry/trigger named) or retire (with the disproportionate-cost
   exception recorded per M11).
2. **If migrate: which Creative Library schema option (§6)** — a genuine multi-slide-aware variant
   shape (schema extension) vs. N independent single-slide variants stitched by worker orchestration
   (no schema extension, more worker logic). This is real design work this packet does not resolve.
3. **If migrate: whether the render-latency question (§8) forces a render-path redesign** (e.g.
   parallel per-slide Creatomate calls instead of the current sequential loop) before or as part of
   the migration, or whether it is measured first and found acceptable as-is.
4. **If migrate: whether closing the `render-qa` v0 exclusion (§6/§5) is an in-scope success criterion
   for the migration itself**, or a named, separately-tracked follow-up carry.
5. **The conversion-rate question (§1)** — whether investigating *why* only 37/104 carousel drafts
   convert to real posts is worth a small, separate, cheap read-only investigation before or alongside
   the migration build (it does not block the disposition decision itself).
6. **If migrate: sequencing against CGU Final's M13 ("Governed Template Build Pack v1")** — M13 is
   itself not-yet-scoped but is explicitly the programme's own intended schema-design + structural-
   diff-authority lane for exactly this class of change (§6/§14). PK should decide whether a carousel
   migration waits for/coordinates with M13, or proceeds independently now with the risk that M13
   later has to reconcile a schema extension it didn't design.
7. **If migrate: require a live `pg_get_functiondef` read of `select_template`/`resolve_slot_assets`
   as Phase 1's first step (§7)** — the deployed functions have drifted from tracked migration files
   at least twice in this repo's history; this packet recommends treating that verification as
   mandatory, not optional, but it is PK's call to confirm as a hard gate on the build lane.

---

## 16. Bounded implementation-lane seed (if migration is selected)

*(Mirrors M11b's own seed-packet shape — a scope description for a future Gate-1 brief, not itself an
apply packet. No SQL is frozen here.)*

- **Phase 1 — Design (T1, read-only):** resolve PK decision #2 above (schema shape); author the
  Creative Library v2 template-family entry design for PP carousel; measure the render-latency
  question (#3) against a real or synthetic timing test; back-fill `m.post_carousel_slide`'s missing
  migration definitions (§4) into `supabase/migrations/` as a pure git↔DB parity fix, independent of
  the rest of the migration.
- **Phase 2 — Build (T2, isolated worktree, `ef-builder`):** register the template family + PP
  variant(s) in `docs/creative-library/property-pulse.json`; add a governed carousel branch to
  `image-worker/index.ts` (calling `select_template`/`resolve_slot_assets`, building a real
  `renderSpec` with full TMR evidence, matching `image_quote`'s shape); land the D2 governance row's
  eventual flip path (`enabled` stays `true` at the *declaration* layer throughout — D2 already set
  that — but the render-path gate needs its own new check, since D2's row is not consulted by the
  render path today, §4/§6).
- **Phase 3 — Proof (T2/T3, the proven dark-then-flip pattern):** rungs 1-6 of the 13-rung graduation
  contract (inventory → registration → assignment → asset-resolution proof → pre-visual QA → **PK
  visual approval**, the first hard human gate); then rungs 7-9 (supervised render through the real
  worker path → first real governed draft → first real publish), matching PP's own
  `video_short_stat`/`video_short_kinetic` precedent exactly.
- **Proof requirements:** `creative-graph-auditor` static-audits the new template-family entry before
  any DB apply; `db-rls-auditor` + `branch-warden` on every DML step; `apply-harness-auditor` shadow
  pass on the governance-flip packet; external review (`ask_chatgpt_review`) on the final worker-code
  diff per the standing CLAUDE.md rule (a config change affecting clients); PK visual approval (rung
  6) before any live-draft rung.
- **Rollback:** re-disable the render-path governance check (worker-side, a config/flag revert, not a
  code revert) + D2's row stays `enabled=true` throughout (it was never the render gate) — matching
  §12's migrate-path rollback shape exactly.
- **PK gates:** Gate 1 (design brief approval) → Gate 1b (build brief approval, post-design) → T2/T3
  chain per phase → PK visual approval (rung 6, hard stop) → PK apply gate (any DB/deploy step) →
  result doc per phase.
- **No-volume-increase guard, extended from M11b:** PP's carousel *legacy* volume must not increase
  during design/build (identical CAS pattern to M11b's seed packets) — the migration's own governed
  volume, once flipped live, is expected to *replace* legacy volume 1:1 per draft, not add to it; any
  apparent net increase in total carousel output during the transition is itself a STOP condition
  worth investigating, not a success signal.

---

## 17. Acceptance criteria (for whichever disposition PK selects)

**If migrate:** a real governed PP carousel render (rung 7+) produces a `render_spec` with the same
structural shape as `image_quote`'s (§5 table, right-hand column populated where today it's empty);
`tmr-drift-probe` returns to `ok` for the PP carousel governance row without a manual patch; the
`m.post_carousel_slide` migration backfill (§4) is committed; PK visual approval is recorded before
any real-draft rung; zero regression to FB/IG delivered-post volume during the dark-then-flip window
(CAS-asserted, §16).

**If retain (time-boxed):** an explicit expiry date or trigger condition is recorded in the register
(not left open-ended); the `tmr-drift-probe` side effect is named as an accepted, continuing cost for
that exact window; a fresh Gate-1 re-decision is required at the time-box's expiry — silent
extension is not acceptable.

**If retire:** `client_format_config` + `client_creative_governance` rows both flip to
`enabled=false` (not deleted); `tmr-drift-probe`'s side effect closes immediately, independently
verified; zero PP carousel drafts created after the cutover (CAS-asserted, matching M11b's own
proven pattern); the M11 "disproportionately expensive" exception is recorded in the same result doc,
not assumed.

---

## 18. Version-less register payload

*(No version number assigned — per CCF-02's parallel-session claim discipline and this session's
handoff convention for the previous M11b lane, submitted for whoever next allocates a register
version.)*

> **M11c PP carousel migrate-vs-retire — DECISION PACKET COMPLETE (T1, docs-only; zero code/DB/
> deploy/merge change).** Answers the one question M11b's own Seed Packet C deliberately deferred:
> compares migrate/retain/retire for Property Pulse's carousel format across volume (104 drafts/37
> real posts per 90d, last verified 2026-08-04, not re-verified live this session), strategy
> dependency (carousel is the top-weighted target-mix format on Instagram/LinkedIn and 2nd on
> Facebook per `platform_format_mix_defaults.md`, already shadow-evaluated live by the R3a resolver),
> the complete code route (draft→slide→render→publish, fully cited), the missing template
> identity/asset-binding/render-provenance evidence (carousel has none of the TMR evidence contract
> `image_quote` has — confirmed at the exact `write_render_log` call site, which omits `renderSpec`
> entirely), and the schema/worker/dashboard changes a migration needs. **The schema research
> sharpened materially**: the Creative Library v2 Variant object (`registry-schema-v2.md` §3) is
> scalar/single-render by design — a carousel migration would be **the first multi-object/multi-
> render Creative Library extension of any kind in this repo**, zero prior art (static or video), and
> overlaps directly with CGU Final's own not-yet-scoped M13 ("Governed Template Build Pack v1").
> `select_template`/`resolve_slot_assets` are confirmed genuinely client/format-agnostic by design —
> the cleanest generalization case in this programme (§7) — but the *deployed* `select_template` has
> drifted from tracked migrations at least twice historically; a live function-body read is named as
> a mandatory Phase-1 precondition, not optional. Also covers the `tmr-drift-probe` side effect's
> resolution path per disposition and rollback/containment per disposition. **Recommends MIGRATE**,
> sequenced as its own future 3-phase build lane (design → build → dark-then-flip proof, T1→T2/T3),
> reusing this programme's already-proven pattern from PP's `video_short_stat`/`video_short_kinetic`
> migrations, coordinated with M13 rather than run in isolation. Names 7 PK decisions still required
> (§15) before that lane can start, including the M13-sequencing question and the mandatory live
> function-drift check. **DB access was unavailable this session (second consecutive occurrence, see
> §11)** — no live re-verification of today's volume/schedule/cron numbers; every figure here is
> either code-cited (verifiable by any reader) or explicitly dated to its last live-verified source.
> Record: `docs/briefs/m11c-pp-carousel-migrate-vs-retire-decision-packet-v1.md`.

---

## 11+. Evidence caveats

- **DB access was unavailable to this session, again** — the same failure mode as M11b (`db-read.py`
  fails closed, no `ICE_READONLY_DSN*` credential, no `mcp__supabase__*` tool bound). None of this
  packet's volume/schedule/cron figures were independently re-verified live today; every number here
  either comes from a previously-verified, dated source (M11a 2026-08-04, D2 2026-08-02, PP TMR DoD
  2026-07-10/07-17) or is a static code citation (verifiable without DB access at all). This is named
  as PK decision input #5 is named — not smoothed over.
- **This packet does not itself resolve the Creative Library schema question (§6/§15#2)** — it
  presents the two live options accurately but deliberately does not pick one, since that is real,
  unstarted design work, not something inferable from existing docs.
- **The render-latency question (§8/§15#3) is stated as a real open risk, not measured** — this
  session had no way to run a timing test against the live Creatomate API or EF wall-clock budget;
  flagged as a pre-migration measurement, not assumed either way.

## 19. Stop condition

This design packet is complete. Per the lane's own instruction, **no schedule, governance row,
worker, template, dashboard code, or live carousel production route was mutated in producing it.**
Report to PK for the disposition decision (§15); do not begin the implementation-lane seed (§16)
without its own separate Gate-1 brief and PK approval.
