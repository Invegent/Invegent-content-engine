# M13 Governed Template Build Pack — Blueprint + Creatomate Capture Schema (v1)

> **Status: M13 Build Pack Lane 1 — schema authoring, T2, declarative only.** This is a new
> **sibling document** to [registry-schema-v2.md](registry-schema-v2.md) — it is **not** merged
> into that file (per the Lane 1 brief's explicit out-of-scope item: "Ratifying the sibling schema
> doc into `registry-schema-v2.md` itself — leave that file untouched"). It **extends** the
> existing Variant object (`registry-schema-v2.md` §3) and Capability Contract (`registry-schema-v2.md`
> §7) vocabulary rather than inventing a parallel format, per the ratified scoping packet
> (`docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §3/§4).
>
> **Declarative only — NOT consumed by production workers.** No resolver change · no dashboard
> change · no runtime behaviour change · no DB-backed registry introduced (see §3, Registry
> posture, below — restated verbatim from `registry-schema-v2.md` §6).
>
> Field tables below are transcribed **verbatim** from the ratified scoping packet
> (`docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §3 Blueprint, §4 Capture) —
> this document does not redesign them. The one addition beyond the packet's own draft is the
> dormant `sub_sequence_key` seam on each Blueprint `elements[]` entry (§1.1 below), reserved per
> the PK ruling recorded in packet §6/§13 addendum ("reserve the seam, defer the build").

## 0. Document header

| | |
|---|---|
| `$schema` | `m13-blueprint-capture-schema-v1` (this document's own identity — a markdown field-table schema, not raw JSON Schema, matching how `registry-schema-v2.md` itself documents shapes) |
| `schema_version` | `v1` (governs both the Blueprint schema, §1, and the Capture schema, §2, below) |
| `artifact-id` | `docs/creative-library/m13-blueprint-capture-schema-v1.md` |
| `hash` | N/A for this document itself — `artifact_hash` is a **per-instance** field on every produced Blueprint/Capture *document* (§1/§2 field tables below), not a hash of this schema-definition file |
| `registry-linkage` | extends `registry-schema-v2.md` §3 (Variant object) + §7 (Capability Contract, `maps_to_variant`); a graduated Blueprint/Capture pair is expected to land at a `template_family_key`/`template_variant_key` already governed by that document — see `registry_linkage` (§1) / `template_variant_key_matched` (§2) |

**Design basis (restated from the scoping packet):** the Blueprint is a "provider-neutral template
contract" authored *before* any Creatomate template exists; the Capture is a one-directional,
read-only witness of what a human actually built, grounded in the confirmed absence of any
Creatomate template write API (`GET` 200, `PATCH`/`PUT` 404, `POST` a demonstrated no-op —
`docs/00_sync_state.md` v6.x B-roll Template Parity entry, cited in packet §4).

---

## 1. Blueprint JSON schema (v1)

Fields transcribed verbatim from `m13-governed-template-build-pack-scoping-packet-v1.md` §3.

| Field | Required | Notes |
|---|---|---|
| `blueprint_id` | ✓ **(new)** | stable artifact ID for this Blueprint document, e.g. `blueprint_pp_carousel_slide_v1` |
| `blueprint_version` | ✓ **(new)** | semver of the Blueprint document itself (distinct from `schema_version` below) — bumped on any field/contract change, immutable once a Capture has diffed against it |
| `schema_version` | ✓ **(new)** | version of *this* Blueprint JSON schema (starts `v1`) — lets the structural-diff engine (§4 below) know which schema revision it is comparing |
| `artifact_hash` | ✓ **(new)** | sha256 of the canonicalized Blueprint JSON bytes — the "artifact IDs, hashes, and registry linkage" finite-acceptance item (packet §0d) |
| `client_slug` | ✓ **(reused)** | per `registry-schema-v2.md` §1/§3 |
| `template_family_key` | ✓ **(reused)** | the Template Family this Blueprint targets (`registry-schema-v2.md:86`) — may name a **not-yet-existing** family (this Blueprint is what will justify creating it) |
| `template_variant_key_intended` | ✓ **(new, reuses naming from §3's `template_variant_key`)** | the variant key the human-authored Creatomate template is expected to be registered under once transposed — the anchor the Capture step (§2) and the diff (§4) key off |
| `compatible_ice_format_keys` | ✓ **(reused)** | verbatim from `registry-schema-v2.md:90` — existing governed format keys only, no new taxonomy invented by a Blueprint |
| `aspect_ratio` / `output_type` / `render_engine` | ✓ **(reused)** | verbatim from Variant object fields (`registry-schema-v2.md:102-104`) |
| `duration_seconds` | conditional **(new, mirrors `motion.duration_seconds` from §7 Capability Contract)** | required for video/motion Blueprints; absent for static |
| `composed_of_patterns` | ✓ **(reused)** | array of `pattern_key`, per Template Family §3 |
| `elements[]` | ✓ **(new — the provider-neutral field contract)** | array of `{ element_key, purpose, field_class ("ai_authored"\|"derived"\|"renderer_fixed"\|"governed_asset"), max_chars/numeric_only/policy where applicable }` — the provider-neutral equivalent of Capability Contract `fields` (§7), but declared as *intent* before any provider template exists, not *projected* from one. **See §1.1 for the entry shape including the dormant `sub_sequence_key` seam.** |
| `expected_assets` | ✓ **(reused)** | array of `asset_key`, per Variant object |
| `registry_linkage` | ✓ **(new)** | `{ target_template_family_key, target_template_variant_key, target_capability_contract_ref (nullable) }` — explicit forward pointer to where this Blueprint will land in the registry once graduated; nullable fields for objects that don't exist yet |
| `governance` | ✓ **(reused)** | `{ owner, approval, ai_role }`, per every other registry-schema-v2 object |
| `proof_posture` | ✓ **(reused)** | starts `draft`; a Blueprint is pre-provider-existence, so it can never itself claim `proven` — mirrors the Style Guide's non-render-based posture (`registry-schema-v2.md:153`), not the Variant's |
| `evidence` | ✓ **(reused)** | `registry-schema-v2.md` §5 shape; `render_log_id` always null for a Blueprint (it precedes any render by design) |
| `source_of_authorship` | ✓ **(new)** | `"asset_gap"` \| other — names the system/process that produced this Blueprint, since M13's own outcome statement specifies Asset Gap as the producer |

### 1.1 `elements[]` entry shape (v1) — including the dormant `sub_sequence_key` seam

Each `elements[]` entry (packet §3's `{ element_key, purpose, field_class, max_chars/numeric_only/
policy where applicable }`) carries **one field beyond the packet's own draft**, added by this
lane per the PK ruling that the ordered-sequence/multi-object seam be *reserved, not built*
(packet §6: "reserve the extensibility seam in the v1 schema now... additive and non-breaking to
every scalar Blueprint already in flight"; §13 addendum narrows — but does not close — the open
question of exactly where a future sequence-binding layer lives):

| Field | Required | Notes |
|---|---|---|
| `element_key` | ✓ | stable key for this element, e.g. `Headline`, `Background`, `Logo` — the join key the structural diff (§4) matches against `Capture.normalized_elements[].element_key` |
| `purpose` | ✓ | one-line statement of what this element is for |
| `field_class` | ✓ | `"ai_authored"` \| `"derived"` \| `"renderer_fixed"` \| `"governed_asset"` |
| `max_chars` / `numeric_only` / `policy` | conditional | present only where applicable (e.g. `ai_authored` text fields), mirroring the Capability Contract `fields.ai_authored[]`/`derived[]` shape (`registry-schema-v2.md` §7) |
| `sub_sequence_key` | optional, **nullable — DORMANT RESERVED SEAM (new, this lane)** | **absent or `null` for every scalar/single-render Blueprint.** Reserved for a future ordered-sequence/multi-object extension (carousel N-slide, or a possible M6 N-stitched-sub-render shape — packet §6/§7) so that filling the seam later is additive, not a schema-breaking change to any Blueprint already in flight. **No multi-object behaviour is implemented by this field** — it carries no diff logic, no sequencing rule, and no runtime meaning in v1. Every fixture in `.claude/helpers/fixtures/m13-blueprint-capture-diff/` keeps this field `null` (see Lane 1 result). Packet §13 addendum flags that the sequence-binding layer may instead belong at the Capability Contract layer (`maps_to_variant` mapping to an ordered list of `template_variant_key`s) rather than inside this field — **that placement question is explicitly not resolved by this document**; the field stays reserved-and-unused either way. |

---

## 2. Creatomate Capture JSON schema (v1)

Fields transcribed verbatim from `m13-governed-template-build-pack-scoping-packet-v1.md` §4.
**No write-back field of any kind** — the Capture schema is structurally incapable of pushing data
into Creatomate, not merely instructed not to (packet §4, mechanical enforcement of the
"no bidirectional synchronization" exclusion, §3 below).

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
| `normalized_elements[]` | ✓ **(new — the diffable counterpart to Blueprint `elements[]`)** | array of `{ element_key, element_type, detected_field_class (best-effort, may be `"unknown"`), dimensions/position (informational only, not diffed against a Blueprint that declares none) }` — parsed from `raw_source_json`, using the same `element_key` naming space as the Blueprint so the diff (§4) can key-match |
| `aspect_ratio` / `output_type` / `duration_seconds` | ✓ **(new — actual, not declared)** | read directly from `raw_source_json`, the actual values Creatomate reports for the live template |
| `template_variant_key_matched` | ✓ **(new)** | the `template_variant_key_intended` from the Blueprint this capture is being compared against, copied here at capture time for traceability — **not** a claim of a successful match, just a record of *which* Blueprint prompted this capture |
| `capture_actor` | ✓ **(new)** | who/what ran the capture (human operator, or the automated read step once built) — never inferred |
| `evidence` | ✓ **(reused)** | `registry-schema-v2.md` §5 shape; a Capture is not itself a render, so `render_log_id` stays null here too — a Capture proves the template *exists as configured*, not that it *renders correctly* |

**Note on `capture_method` and future-proofing (verbatim from packet §4):** naming the exact
endpoint as a fixed literal, not a free-text description, is deliberate — it makes a future
provider change (a hypothetical second render provider, per M10's provider-neutral contract work)
a schema value change, not a silent assumption. If a second provider is ever added, this field's
enum grows; the schema does not.

---

## 3. Registry posture (restated verbatim, `registry-schema-v2.md` §6)

Every v2 registry document — and this sibling schema, by the same discipline — must state:

- **Declarative only — not consumed by production workers.**
- No resolver change · no dashboard change · no runtime behaviour change.
- No DB-backed registry introduced (the registry is repo/config files, not tables).
- Source of truth remains **ICE governance**; **providers remain renderers only**.
- PK approval authority unchanged; AI may propose, never approves.

Nothing this document defines is read at runtime by any production worker; no resolver, dashboard,
or runtime behaviour changes as a result of this document existing. No DB table is introduced —
Blueprint and Capture documents are, in this lane, fixture JSON files only (see §5, Handoff).

---

## 4. Structural diff — pointer only

The blueprint-versus-capture structural diff itself is designed in scoping packet §5 and
**implemented** by `.claude/helpers/m13-blueprint-capture-diff.mjs` (this lane) against fixtures
only — see that file's header comment for the four finding classes (`missing_in_capture` BLOCK,
`dimension_output_mismatch` BLOCK, `extra_in_capture` ADVISORY unless a reserved-field-class-name
collision, `field_class_mismatch` ADVISORY-only in v1) and the `clean`/`concerns`/`blocked`
verdict rollup. This document does not restate the diff's design in full — that authority stays
with the scoping packet; this section is a pointer so a reader of the schema doc can find the
diff engine.

---

## 5. Four hard exclusions (restated verbatim, scoping packet §2, itself quoting audit §2.4)

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

Every design choice in §1/§2/§4 above is consistent with these four rules: the Blueprint schema
has no field that could trigger template creation; the Capture schema has no write-back field
(§2); the diff engine (§4) only ever reports a `structural_diff_result` — it never writes a
graduation status; and nothing in this document or the diff engine substitutes for, or bypasses,
PK's visual approval act.

---

## Handoff

This lane (M13 Build Pack Lane 1 — scalar proof) proves the **diff engine and both schemas in
isolation, against fixtures only.** It does **not** compose the full five-lane Build Pack
(`docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §8). Explicitly **not done**
by this lane, still needed:

- **Lane 3 — registry/constraint persistence (T3, DB-touching).** Blueprint, Capture, and
  `structural_diff_result` documents have no durable home yet — this lane's fixtures live only as
  files under `.claude/helpers/fixtures/m13-blueprint-capture-diff/`. Landing a real registry/DB
  schema for these artifacts, and wiring "mismatches block graduation" into whatever
  graduation-recording mechanism already exists (the 13-rung ladder's rung 2/3 evidence,
  `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4), is unbuilt.
  Needs its own T3 Gate-1 brief and the full chain (`db-rls-auditor` + `branch-warden` +
  `apply-harness-auditor` shadow pass + external review + PK apply gate).
- **Lane 4 — Asset Gap dashboard display.** Nothing in this lane surfaces Blueprint/Capture/diff
  status on the Asset Gap Register or any dashboard surface. That is its own T2 lane
  (`dashboard-ia-lint` before any PK gate, per CLAUDE.md's candidate-agent note).
- **Lane 5 — the real end-to-end template proof.** This lane's Capture fixtures are **hand-authored
  JSON standing in for** a real `GET /v1/templates/{id}` response — no live Creatomate API call was
  made anywhere in this lane (helper, tests, or fixture authorship). A real human transposition of
  a Blueprint into Creatomate, a real Capture read of that live template, and the full 13-rung
  proof-ladder discipline through PK visual approval and graduation are all still required and are
  explicitly out of scope here.
- **This lane proves:** the diff engine's four finding classes and verdict rollup are mechanically
  correct against fixtures grounded in one real, already-registered PP template
  (`generic_carousel_cover_1x1_v1` — see the fixtures' own evidence notes for citations), and that
  both schemas are internally consistent and composable with the existing Creative Library v2
  vocabulary. It does **not** prove live composition of all five lanes together.
