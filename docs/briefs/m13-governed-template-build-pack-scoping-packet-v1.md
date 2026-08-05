# M13 — Governed Template Build Pack v1: Scoping Packet

**Lane:** `m13-governed-template-build-pack-scoping`
**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor (this pass):** chat — read-only repo/doc research only
**Status:** `SCOPING_COMPLETE` — no mutation performed. Zero implementation, zero DB/deploy, zero
registry file edits, zero worker code touched.
**Tier:** T1 (docs-only, scoping). Individual build lanes this packet plans are their own future
Gate-1 briefs at T2/T3 as named in §5.
**Governing:** `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §0d (M13's own
must-have definition, PK-directed 2026-08-03) + §2.2/§2.4 (acceptance/exclusions) +
`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md` (v6.140 PK watch ruling — this lane is
explicitly compatible with the watch: it is T1, docs-only, and not a "heavy CGU Final lane"
requiring the schedule-expansion approval the ruling holds; see §7 for the watch-compatibility
check).
**Result file:** N/A this pass — this document is the deliverable.

---

## 0. Authoritative inputs

- `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §0d — M13's outcome statement,
  finite acceptance list, exclusions, sequencing directive (source of the task itself).
- Same document §2.2 (table row) — tier split T2 (schema design + structural-diff automation) / T3
  (registry/constraint-record persistence + graduation-gate authority), "lane count TBD pending a
  scoping pass" — this packet is that pass.
- Same document §0f / §3 — M6 PK-set shape (exactly 3 scenes, 30–45s, hard max 45s) and the
  sequencing directive ("M13 landed... before M6... the first multi-scene template should graduate
  through the Build Pack, not around it").
- `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md` — v6.140 PK ruling: Phase-2 held to watch
  close (~2026-08-11 20:20 Sydney), no new heavy CGU Final lanes before the Phase-2 ruling. Read in
  full for the watch-compatibility check (§7).
- `docs/creative-library/registry-schema-v2.md` — the existing declarative Creative Library v2
  schema (Style Guide → Patterns → Template Families → Variants → Evidence, §7 Capability
  Contracts). This is the schema M13's Blueprint/registry-linkage design must extend, not replace.
- `docs/briefs/m11c-pp-carousel-migrate-vs-retire-decision-packet-v1.md` §6/§8/§15 — the PP carousel
  decision packet's finding that the Creative Library v2 Variant object is scalar/single-render, and
  that a carousel migration would be the repo's first multi-object/multi-render extension, explicitly
  named as overlapping M13.
- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §1.2 (nine canonical
  proof states) and §4 (13-rung graduation ladder) — the existing graduation framework M13's
  "graduation-gate authority" outcome must compose with, not duplicate.
- `docs/governance/orchestrator-operating-manual-v1.md` §4 — ground-truth hierarchy naming
  `GET /v1/templates/{id}` as the provider witness, and `docs/00_sync_state.md` v6.x entries +
  `docs/00_sync_state.md` (B-roll Template Parity result) confirming empirically: Creatomate has
  **no template write API** (`GET` 200, `PATCH`/`PUT` 404, `POST` a demonstrated no-op) — this is
  the load-bearing fact behind the Capture step's one-directional, read-only design (§3, §6).

---

## 1. Scope restated (verbatim outcome, §0d)

> Asset Gap can produce a versioned Template Blueprint JSON describing the intended provider-neutral
> template contract. A human transposes that design into Creatomate. ICE then captures a versioned
> Creatomate implementation JSON, compares expected versus actual structure, persists the governed
> registry/constraint records, runs calibration and probes, obtains PK visual approval, and graduates
> the template.

**Finite acceptance** (§0d, carried verbatim): versioned Blueprint JSON schema · versioned
Creatomate Capture JSON schema · artifact IDs, hashes, and registry linkage · Asset Gap
attachment/display · automated blueprint-versus-capture structural diff · mismatches block
graduation · one real end-to-end template proof.

**This packet's own scope:** items 1–3 of that list only (the two schemas + the diff design), plus
the lane plan and the two coordination contracts the task named. It does **not** design calibration,
probes, Asset Gap display wiring, or the end-to-end proof lane itself — those are named as future
lane content in §5, not designed here.

---

## 2. Hard exclusions (restated verbatim, §2.4)

> - **M13 Build Pack — no automatic Creatomate template creation** (reinforces the rule directly
>   above, scoped explicitly to the Build Pack): a human always transposes the Blueprint into
>   Creatomate; the Capture step only ever reads back what a human built.
> - **M13 Build Pack — no automatic promotion or graduation.** The Build Pack automates the
>   blueprint-versus-capture structural diff only; PK visual approval remains the only act that
>   graduates a template, unchanged.
> - **M13 Build Pack — no bidirectional synchronization.** Capture is one-directional, read-only
>   observation of the live Creatomate implementation; nothing is ever written back into Creatomate
>   from the Blueprint or the registry.
> - **M13 Build Pack — the PK visual gate is never removed or bypassed.** A clean structural diff is
>   a precondition for graduation, never a substitute for PK's visual approval.

Every design choice below is checked against these four rules; where a choice could be read as
edging toward automation, that is flagged explicitly rather than left implicit.

---

## 3. Draft Blueprint JSON schema (v1, versioned)

**Design basis:** extends the existing Variant object (`registry-schema-v2.md` §3) and Capability
Contract (`registry-schema-v2.md` §7) shapes rather than inventing a parallel format — M13's own
outcome statement calls the Blueprint a "provider-neutral template contract," which is exactly what
the existing Variant + `required_fields`/`expected_assets` fields already declare, just not yet
paired with a captured-implementation counterpart or a diff. Fields marked **(new)** do not exist in
registry-schema-v2 today and are this packet's proposed addition; fields marked **(reused)** map
directly onto an existing registry-schema-v2 field of the same or adjacent name.

| Field | Required | Notes |
|---|---|---|
| `blueprint_id` | ✓ **(new)** | stable artifact ID for this Blueprint document, e.g. `blueprint_pp_carousel_slide_v1` |
| `blueprint_version` | ✓ **(new)** | semver of the Blueprint document itself (distinct from `schema_version` below) — bumped on any field/contract change, immutable once a Capture has diffed against it |
| `schema_version` | ✓ **(new)** | version of *this* Blueprint JSON schema (starts `v1`) — lets the structural-diff engine (§5) know which schema revision it is comparing |
| `artifact_hash` | ✓ **(new)** | sha256 of the canonicalized Blueprint JSON bytes — the "artifact IDs, hashes, and registry linkage" finite-acceptance item (§0d) |
| `client_slug` | ✓ **(reused)** | per registry-schema-v2 §1/§3 |
| `template_family_key` | ✓ **(reused)** | the Template Family this Blueprint targets (`registry-schema-v2.md:86`) — may name a **not-yet-existing** family (this Blueprint is what will justify creating it) |
| `template_variant_key_intended` | ✓ **(new, reuses naming from §3's `template_variant_key`)** | the variant key the human-authored Creatomate template is expected to be registered under once transposed — the anchor the Capture step (§4) and the diff (§5) key off |
| `compatible_ice_format_keys` | ✓ **(reused)** | verbatim from `registry-schema-v2.md:90` — existing governed format keys only, no new taxonomy invented by a Blueprint |
| `aspect_ratio` / `output_type` / `render_engine` | ✓ **(reused)** | verbatim from Variant object fields (`registry-schema-v2.md:102-104`) |
| `duration_seconds` | conditional **(new, mirrors `motion.duration_seconds` from §7 Capability Contract)** | required for video/motion Blueprints; absent for static |
| `composed_of_patterns` | ✓ **(reused)** | array of `pattern_key`, per Template Family §3 |
| `elements[]` | ✓ **(new — the provider-neutral field contract)** | array of `{ element_key, purpose, field_class ("ai_authored"\|"derived"\|"renderer_fixed"\|"governed_asset"), max_chars/numeric_only/policy where applicable }` — the provider-neutral equivalent of Capability Contract `fields` (§7), but declared as *intent* before any provider template exists, not *projected* from one |
| `expected_assets` | ✓ **(reused)** | array of `asset_key`, per Variant object |
| `registry_linkage` | ✓ **(new)** | `{ target_template_family_key, target_template_variant_key, target_capability_contract_ref (nullable) }` — explicit forward pointer to where this Blueprint will land in the registry once graduated; nullable fields for objects that don't exist yet |
| `governance` | ✓ **(reused)** | `{ owner, approval, ai_role }`, per every other registry-schema-v2 object |
| `proof_posture` | ✓ **(reused)** | starts `draft`; a Blueprint is pre-provider-existence, so it can never itself claim `proven` — mirrors the Style Guide's non-render-based posture (`registry-schema-v2.md:153`), not the Variant's |
| `evidence` | ✓ **(reused)** | §5 shape; `render_log_id` always null for a Blueprint (it precedes any render by design) |
| `source_of_authorship` | ✓ **(new)** | `"asset_gap"` \| other — names the system/process that produced this Blueprint, since M13's own outcome statement specifies Asset Gap as the producer |

**Open question (not resolved here):** whether `elements[]` needs a `sub_sequence` / repeat-group
shape from v1 to support multi-object templates (carousel-style N-slide, or a possible M6 multi-scene
shape) — see §6.

---

## 4. Draft Creatomate Capture JSON schema (v1, versioned)

**Design basis:** the Capture step is a **read-only witness**, per the ground-truth hierarchy
(`orchestrator-operating-manual-v1.md` §4: "the Creatomate editor UI showing `source: ""` is the
editor's claim; `GET /v1/templates/{id}` is the witness") and per the confirmed absence of any
Creatomate template write API (`GET` 200, `PATCH`/`PUT` 404, `POST` a no-op — `docs/00_sync_state.md`
v6.x B-roll Template Parity entry). This is also the mechanical enforcement of the "no bidirectional
synchronization" exclusion (§2): the Capture schema has no write-back field of any kind — it is
structurally incapable of being used to push data into Creatomate, not merely instructed not to.

| Field | Required | Notes |
|---|---|---|
| `capture_id` | ✓ **(new)** | stable artifact ID for this Capture document |
| `capture_version` | ✓ **(new)** | semver of the Capture document (bumped on every re-capture, e.g. after a human edits the live template) |
| `schema_version` | ✓ **(new)** | version of this Capture JSON schema |
| `artifact_hash` | ✓ **(new)** | sha256 of the canonicalized Capture JSON bytes |
| `captured_at` | ✓ **(new)** | UTC timestamp of the capture read |
| `capture_method` | ✓ **(new)** | fixed value `"GET /v1/templates/{id}"` — names the exact provider read that produced this document, per the ground-truth-hierarchy discipline (never inferred from the editor UI) |
| `provider_template_id` | ✓ **(reused, matches Variant object)** | the real Creatomate template ID this capture read |
| `raw_source_json` | ✓ **(new)** | the **verbatim, unmodified** response body of `GET /v1/templates/{id}` — preserved byte-for-byte as the primary evidence artifact; every other field below is a *derived, normalized* view of this field, never a replacement for it |
| `raw_source_hash` | ✓ **(new)** | sha256 of `raw_source_json` specifically — lets a later re-verification confirm the normalized fields below were actually derived from the named raw capture, not hand-edited |
| `normalized_elements[]` | ✓ **(new — the diffable counterpart to Blueprint `elements[]`)** | array of `{ element_key, element_type, detected_field_class (best-effort, may be `"unknown"`), dimensions/position (informational only, not diffed against a Blueprint that declares none) }` — parsed from `raw_source_json`, using the same `element_key` naming space as the Blueprint so the diff (§5) can key-match |
| `aspect_ratio` / `output_type` / `duration_seconds` | ✓ **(new — actual, not declared)** | read directly from `raw_source_json`, the actual values Creatomate reports for the live template |
| `template_variant_key_matched` | ✓ **(new)** | the `template_variant_key_intended` from the Blueprint this capture is being compared against, copied here at capture time for traceability — **not** a claim of a successful match, just a record of *which* Blueprint prompted this capture |
| `capture_actor` | ✓ **(new)** | who/what ran the capture (human operator, or the automated read step once built) — never inferred |
| `evidence` | ✓ **(reused)** | §5 shape; a Capture is not itself a render, so `render_log_id` stays null here too — a Capture proves the template *exists as configured*, not that it *renders correctly* (that is a later graduation rung, §5/§6.6) |

**Note on `capture_method` and future-proofing:** naming the exact endpoint as a fixed literal, not a
free-text description, is deliberate — it makes a future provider change (a hypothetical second
render provider, per M10's provider-neutral contract work) a schema value change, not a silent
assumption. If a second provider is ever added, this field's enum grows; the schema does not.

---

## 5. Blueprint-versus-Capture structural diff — design only (not built)

**Purpose (restated, §0d):** "compares expected versus actual structure... mismatches block
graduation." This section designs the check; it deliberately does not specify an implementation
(worker code, migration, or otherwise) — that is a T2 build lane (§7).

**Comparison basis:** the diff walks `Blueprint.elements[]` against `Capture.normalized_elements[]`,
keyed on `element_key`. Three mismatch classes, each independently reportable (not collapsed into one
pass/fail bit, so a human reviewing a CONCERNS-class diff can see exactly what differs):

1. **Missing-in-capture** — a Blueprint `element_key` has no matching Capture entry. This is the
   class that most directly enforces "a human always transposes the Blueprint into Creatomate" (§2):
   if the human's transposition dropped a field, this class catches it mechanically rather than
   relying on a second human re-reading their own work.
2. **Extra-in-capture** — a Capture `element_key` has no matching Blueprint entry. Not automatically
   an error (a human may have added a decorative element the Blueprint never specified, e.g. a static
   background shape) — surfaced as an **advisory** finding, not a graduation-blocking one, unless the
   extra element collides with a reserved field-class name.
3. **Field-class mismatch** — both sides have the `element_key`, but `Capture.normalized_elements[].
   detected_field_class` disagrees with `Blueprint.elements[].field_class` (e.g. Blueprint declared
   `ai_authored` text, Capture's best-effort detection reads it as `renderer_fixed`). This class is
   explicitly **advisory-only in v1** — `detected_field_class` is stated above as "best-effort," and
   treating an imperfect heuristic as a hard graduation block risks false-blocking a correct
   transposition. Promoting this class to blocking is a named future decision (§8), not made here.

**Blocking rule (§0d: "mismatches block graduation"):** only class 1 (missing-in-capture) and a
**dimension/output mismatch** (aspect ratio, output type, or duration disagreeing between Blueprint
and Capture beyond a to-be-calibrated tolerance) are graduation-blocking in v1. This mirrors — and is
designed to compose with, not duplicate — the existing 13-rung graduation ladder's rung 2
("field-contract compatibility") and rung 3 ("dimensions/duration/output parity")
(`creatomate-registry-integrity-graduation-contract-v1.md` §4): the structural diff is the
**mechanical instrument** that produces the evidence those two rungs already require; it does not
introduce a fourteenth rung or a competing framework.

**Where the result lives:** a `structural_diff_result` object — `{ blueprint_id, blueprint_version,
capture_id, capture_version, verdict ("clean"|"concerns"|"blocked"), findings[] (each finding typed
by class 1/2/3 above, each `element_key`-cited), diffed_at }` — attached to `registry_linkage` on both
the Blueprint and Capture as `supporting_render_log_ids`-style evidence (registry-schema-v2 §5
pattern), never as a freestanding untraceable record.

**What this diff does NOT do (guarding the exclusions, §2):** it never writes to Creatomate (read-only
Capture input only); it never itself sets `assignment_status`/`proof_status` to a graduated value —
its `verdict` is one required **input** to the PK visual-approval rung (rung 6 of the existing ladder)
and to whatever persistence lane (§7) records graduation, never the graduating act itself, matching
the CCF-04 helper precedent (`apply-harness-auditor`'s PASS "clears no gate") named in `CLAUDE.md`.

---

## 6. Coordination contract — M11c PP-carousel migrate recommendation

**M11c's finding, restated (its own §6/§8/§15 item 6):** the Creative Library v2 Variant object is
scalar/single-render by design (`registry-schema-v2.md` §3: `template_variant_key`, `provider_
template_id` — one of each per Variant, no `slides[]` or sequence array anywhere in the schema
today). A PP carousel migration (M11c recommends **migrate**, PK decision still pending) would be
"the first multi-object/multi-render Creative Library extension of any kind in this repo... zero
prior art," and M11c explicitly names the open question this packet is asked to answer: does M13
need to support multi-object from v1, or can it defer?

**This packet's answer: defer the full multi-object *implementation*, but reserve the extensibility
seam in the v1 schema now.** Reasoning:

- The Blueprint schema drafted in §3 declares `elements[]` as an **array** already (not a fixed-arity
  object) — nothing in v1's shape assumes exactly one render. Adding a `sub_sequence_key` (nullable,
  absent for every scalar/single-render Blueprint) to each `elements[]` entry, or an optional
  top-level `sequence: { slide_variant_keys: [...] }` block, is additive and non-breaking to every
  scalar Blueprint already in flight for M6 or any static format — this is the seam to reserve.
- **Fully building** N-slide-aware Capture parsing, a multi-object diff (comparing N captured
  sub-templates against N blueprinted slides), and the persistence/graduation-gate authority for a
  sequence object is real, unstarted design + build work this packet is not scoped to do (§1) — and
  per M11c §15 item 2, the carousel-specific schema shape (extend-Variant vs. new-sibling-object) is
  itself still an open PK decision M13 cannot pre-empt on M11c's behalf.
- **Coordination point, stated plainly for PK:** if PK selects carousel-migrate (M11c §15 item 1) and
  separately rules M13 should absorb that schema work, the correct order is M13's own multi-object
  lane (§7 below) informed by *both* consumers (carousel's confirmed N-independent-slide shape, §4 of
  M11c's route table, **and** whatever M6's design spike finds — §7 below) at once, not a
  carousel-only extension M6 later has to reconcile a second time. This is the coordination this
  packet was asked to name; it does not itself decide sequencing between the two consumers beyond
  what §0d/§7 already fixes (M13 before M6, full stop).

**Explicitly not decided here (PK gate):** whether M13's v1 proof lane's "one real end-to-end template
proof" (§0d finite acceptance) targets a scalar format (a static or single-render video template,
lower risk, faster proof) or attempts a multi-object shape directly. This packet recommends the
former — see §7's proof-lane note — precisely because the multi-object shape is not yet resolved for
either candidate consumer (carousel or M6).

---

## 7. Coordination contract — M6 sequencing

**§0d's own words:** "sequenced... before the first multi-scene template (M6)... the first multi-scene
template should graduate through the Build Pack, not around it." This is a hard ordering constraint,
not a suggestion — M13 must exist and be usable before M6's design spike produces a template that
needs graduating.

**Open finding this packet surfaces (not resolvable from existing docs — genuinely open):** M6 itself
is "Not yet scoped" (`creatomate-global-ultimate-final-delta-audit-v1.md` §2.2 row: "1 design spike +
1 template-authoring lane... T3 throughout") — no design document yet states whether M6's 3-scene,
30–45s shape will be **(a)** a single Creatomate template with three internal scene/timeline segments
inside one render (matching every currently-governed video template's existing single-`provider_
template_id` shape, e.g. `video_short_stat`/`video_short_kinetic`), or **(b)** three independently
rendered and stitched sub-renders (structurally identical to carousel's N-slide shape, §6). This
packet does not invent an answer — it names the fork explicitly so M13's design lane and M6's design
spike can resolve it together rather than each guessing independently:

- If **(a)**, M6 needs no multi-object Blueprint/Capture support at all — a single Variant with a
  richer `elements[]` (e.g. `Scene1.Headline`, `Scene2.StatValue`, ...) is sufficient, and M13's v1
  scalar schema (§3/§4) already covers it with no extension.
- If **(b)**, M6 becomes the *second* consumer of the same multi-object seam named in §6 for
  carousel, and the "reserve the seam, defer the build" answer in §6 applies identically here —
  strengthening, not weakening, the case for reserving (not yet filling) that seam in the v1 schema.

**Sequencing consequence for the lane plan (§8):** because M13 must land *before* M6's design spike
produces something to graduate, and because M6's own shape (a vs. b above) is still undetermined,
this packet recommends M13's scalar-only v1 (schema + diff + one real proof) proceed **now** without
waiting for M6's design spike to resolve the (a)/(b) fork — a scalar-first M13 is provably sufficient
for at least one of the two possible M6 shapes and blocks nothing regardless of which one M6 turns out
to need, whereas waiting for M6's spike to resolve first would violate §0d's own "M13 before M6"
ordering.

---

## 8. Lane plan (count + tiers)

Five lanes, each with a scoped outcome mapped to the §0d finite-acceptance list. None are frozen apply
packets — each needs its own Gate-1 brief before starting, per the standing CLAUDE.md proof lane.

| # | Lane | Tier | Outcome | Maps to §0d acceptance item(s) |
|---|---|---|---|---|
| 1 | **Blueprint + Capture schema authoring** | T2 (schema design, docs/registry-file work, no live DB) | Ratify the §3/§4 draft schemas into `docs/creative-library/registry-schema-v2.md` (or a new `m13-blueprint-capture-schema-v1.md` sibling doc) as a formal addition, with `creative-graph-auditor` static-auditing the change before any PK gate | "versioned Blueprint JSON schema"; "versioned Creatomate Capture JSON schema" |
| 2 | **Structural-diff automation** | T2 (isolated worktree, `ef-builder`; reads only — the diff engine calls `GET /v1/templates/{id}` and compares against a stored Blueprint, writes nothing to Creatomate) | Build the §5 diff engine as a callable check (worker function or standalone script — mechanism TBD at Gate-1); unit-proven against at least one known-clean and one known-mismatched fixture pair before any live template | "artifact IDs, hashes, and registry linkage" (the diff's evidence-recording shape); "automated blueprint-versus-capture structural diff" |
| 3 | **Registry/constraint persistence + graduation-gate authority** | T3 (touches the live registry/DB layer — new Blueprint/Capture/diff-result records need a durable home, and "mismatches block graduation" requires the persistence layer to actually consult the diff verdict before any graduation-adjacent status write) | Land the DB/registry-file schema for Blueprint/Capture/diff-result artifacts; wire the block-on-mismatch rule into whatever graduation-recording mechanism already exists (the 13-rung ladder's rung 2/3 evidence, §5 above) — **full T3 chain**: `db-rls-auditor` + `branch-warden` + `apply-harness-auditor` shadow pass + external review + PK apply gate, per CLAUDE.md's standing T3 requirement for anything DDL/DML or graduation-authority-bearing | "mismatches block graduation" |
| 4 | **Asset Gap attachment/display** | T2 (dashboard-facing; per `dashboard-ia-lint` before any PK gate, per CLAUDE.md's candidate-agent note) | Surface Blueprint/Capture/diff status on the Asset Gap Register (M8's own dashboard implementation is directed, §0d/§3, to "account for displaying the Build Pack" — this lane is that account) | "Asset Gap attachment/display" |
| 5 | **One real end-to-end template proof** | T3 (a real production template goes through the full Blueprint → human transposition → Capture → diff → calibration/probes → PK visual approval → graduation path) | Prove lanes 1–4 compose correctly on one real, PK-selected template — recommended scalar/single-render (§6) to avoid pre-deciding the open multi-object question; full proof-ladder discipline (rungs 1–13, `creatomate-registry-integrity-graduation-contract-v1.md` §4) applies unchanged | "one real end-to-end template proof" |

**Tier split matches §0d's own row exactly** (T2: schema design + structural-diff automation → lanes
1–2; T3: registry/constraint-record persistence + graduation-gate authority → lane 3), with two
additional lanes (4, dashboard T2; 5, proof T3) the finite-acceptance list also names but the §2.2
table's tier note did not individually break out.

**Sequencing among the five:** 1 → 2 and 1 → 3 (both need the schema first) → 4 can run in parallel
with 2/3 once lane 1's schema is stable enough to display placeholder status → 5 requires 1, 2, and 3
all landed (it is the composition proof). Lane 3's T3 apply should not begin until lane 2's diff
engine has a proven fixture pass (§ lane 2), since T3 persistence should not be built against an
unverified diff contract.

---

## 9. Watch-ruling compatibility check (v6.140)

The active PK control-tower watch ruling (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`)
holds Phase-2 and forbids "new heavy CGU Final lanes before the Phase-2 ruling." This packet is:

- **T1, docs-only, zero mutation** — matches the watch's own permitted scope (read-only monitoring
  and non-heavy documentation work).
- **Not itself a heavy lane** — it authorizes no implementation; every lane in §8 needs its own future
  Gate-1 brief and is not started by this packet's existence.
- **Not schedule/DML/cap-touching** — no schedule row, cap, or production data is referenced or
  proposed for change.

**Open question for PK, not resolved here:** whether lanes 1–5 (§8) — none of which are DML/schedule
work, but lane 3 and 5 do touch the live registry/DB — count as "heavy CGU Final lanes" under the
watch ruling's own intent, or are exempt as a *different* workstream (M13 is additive per §0d, not
part of the Phase-2 schedule-expansion matrix the watch is holding). This packet recommends treating
lanes 1–2 (pure T2, no live DB) as startable now and lanes 3/5 (T3, live registry) as subject to the
same "no heavy lane before Phase-2 ruling" hold as everything else — but that is a PK call, not
inferred here.

---

## 10. Open questions (consolidated)

1. **Multi-object schema shape** (§6) — extend-Variant-with-`slides[]` vs. new sibling "Sequence"
   object, if/when carousel migrates. Not resolved by this packet; M11c names it as its own PK
   decision (§15 item 2 there).
2. **M6's internal shape** (§7) — single richer-field render vs. N-stitched-sub-renders. Genuinely
   unknown pending M6's own design spike; this packet only names the fork.
3. **Field-class-mismatch blocking policy** (§5) — whether `detected_field_class` disagreement should
   ever become graduation-blocking once the detection heuristic is proven reliable. Deliberately left
   advisory-only in v1.
4. **Diff-engine mechanism** (§8 lane 2) — worker function, standalone script, or dashboard-triggered
   job. Not decided; a Gate-1 decision for that lane specifically.
5. **Watch-ruling scope applicability to lanes 3/5** (§9) — PK call.
6. **Carousel-migrate disposition itself** — upstream of this packet; M11c §15 item 1, PK's call, not
   re-litigated here.

---

## 11. Version-less register payload

*(No version number assigned — per CCF-02's parallel-session claim discipline; submitted for whoever
next allocates a register version. Facts-only relay per the control-tower convention — no authority
claimed by this packet.)*

> **M13 Governed Template Build Pack v1 — SCOPING PACKET COMPLETE (T1, docs-only; zero
> implementation/DB/deploy change).** Drafts the two versioned schemas §0d requires (Blueprint JSON —
> extends the existing Variant/Capability-Contract shape, `elements[]` array, `registry_linkage`
> forward-pointer, artifact hash; Creatomate Capture JSON — grounded in the confirmed `GET /v1/
> templates/{id}` read-only witness, since Creatomate has no template write API, verbatim
> `raw_source_json` preserved as primary evidence); designs (does not build) a three-class
> blueprint-versus-capture structural diff (missing-in-capture and dimension/output mismatch block
> graduation; field-class mismatch is advisory-only in v1), composing with — not duplicating — the
> existing 13-rung graduation ladder's rungs 2–3; plans 5 lanes (T2 schema authoring, T2 diff
> automation, T3 registry/graduation-gate persistence, T2 Asset Gap display, T3 one real end-to-end
> proof) matching §0d's own T2/T3 split exactly. **Names two coordination findings as open, not
> resolved:** (1) M11c's carousel-migrate packet found the Variant object is scalar/single-render and
> a carousel migration would be the repo's first multi-object extension — this packet recommends
> reserving an extensibility seam in the v1 schema now (nullable `sub_sequence_key`) without building
> multi-object support until a real consumer needs it; (2) M6 (sequenced immediately after M13, §0d)
> is itself "not yet scoped" and its own 3-scene shape — single richer render vs. N-stitched
> sub-renders — is unknown, meaning M6 could turn out to be the *second* multi-object consumer, not
> just carousel; this packet recommends proceeding with a scalar-first M13 v1 regardless, since it is
> provably sufficient for at least one of M6's two possible shapes and blocks neither. Restates all
> four §2.4 hard exclusions verbatim (no auto template creation, no auto promotion, no bidirectional
> sync, PK visual gate never removed) and checks every schema/diff design choice against them. Flags
> a watch-ruling (v6.140) applicability question for lanes 3/5 (T3, live registry) as PK's call, not
> resolved here. 6 open questions named (§10), none invented answers. Record:
> `docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md`.

---

## 12. Stop condition

This scoping packet is complete. No implementation, DB, deploy, registry-file, or worker-code change
was made in producing it. Report to PK for §6/§7/§9/§10's open decisions; do not begin any of the five
§8 lanes without its own separate Gate-1 brief and PK approval.
