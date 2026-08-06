# Brief — M13 Governed Template Build Pack, Lane 1: Scalar Proof (schemas + structural diff)

**Created:** 2026-08-06 Sydney
**Author:** chat
**Executor:** ef-builder (isolated worktree), orchestrated by chat
**Status:** issued
**Result file:** `docs/briefs/results/m13-buildpack-lane1-scalar-proof-result-v1.md` (created on completion)

---

## Task

Implement M13 Build Pack Lane 1 — the two versioned JSON schemas (Blueprint, Creatomate Capture)
and the blueprint-versus-capture structural-diff automation — as designed (not re-designed) in the
ratified scoping packet. Scalar/single-render shape only; the ordered-sequence seam is reserved in
the schema (present, dormant) per the PK ruling. All artifacts are isolated/non-production:
docs/schema files and a zero-authority repo helper with hermetic tests, nothing DB- or
deploy-touching.

## Source context

- `docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §3 (Blueprint schema draft),
  §4 (Capture schema draft), §5 (structural-diff design), §8 lane 1 + lane 2 (this brief's scope) —
  the design authority; implement its field tables and diff classes verbatim, do not redesign them.
- `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` §1–§2 — the standing authorization: isolated
  branches, schema authoring without live apply, automated tests/fixtures are explicitly allowed
  during the watch; M13 Lane 1 is one of the three named build lanes. Still prohibited: any DB
  migration/apply, any live registry write, any Creatomate API call.
- `docs/creative-library/registry-schema-v2.md` §3 (Variant object), §7 (Capability Contract) — the
  existing schema the Blueprint/Capture schemas extend; field names/shapes must be consistent with
  this document's vocabulary (e.g. `template_family_key`, `template_variant_key`, `aspect_ratio`,
  `output_type`, `render_engine`, `expected_assets`, `governance`, `evidence`, `proof_posture`).
- `.claude/helpers/apply-harness-auditor.mjs` + `.claude/helpers/apply-harness-auditor.test.mjs` +
  `.claude/helpers/fixtures/apply-harness-auditor/` — the CCF-04 zero-authority-helper pattern to
  mirror: pure-core exported functions (deterministic, unit-testable, no fs/network/child-process
  beyond reading the input file in `main()`), fail-closed on parse error, `node --test` runner,
  findings enumerated independently of the rolled-up verdict.
- `CLAUDE.md` — orchestration contract; this is a T2 isolated-code lane per the workflow-acceleration
  conventions (risk-tiered review chains §3).

## Scope

**In scope:**
1. `docs/creative-library/m13-blueprint-capture-schema-v1.md` — a new sibling doc (per packet §8 lane
   1's own choice of "ratify into registry-schema-v2.md OR a new sibling doc" — use the sibling doc to
   avoid editing the existing ratified file) containing:
   - The versioned **Blueprint JSON schema** (packet §3's field table, verbatim: `blueprint_id`,
     `blueprint_version`, `schema_version`, `artifact_hash`, `client_slug`, `template_family_key`,
     `template_variant_key_intended`, `compatible_ice_format_keys`, `aspect_ratio`/`output_type`/
     `render_engine`, `duration_seconds` (conditional), `composed_of_patterns`, `elements[]`,
     `expected_assets`, `registry_linkage`, `governance`, `proof_posture`, `evidence`,
     `source_of_authorship`). `elements[]` entries carry an optional, nullable `sub_sequence_key`
     (the reserved seam — absent/null for every scalar Blueprint, per the ruling's "ordered-sequence
     seam preserved" instruction and packet §6).
   - The versioned **Creatomate Capture JSON schema** (packet §4's field table, verbatim:
     `capture_id`, `capture_version`, `schema_version`, `artifact_hash`, `captured_at`,
     `capture_method` (fixed `"GET /v1/templates/{id}"`), `provider_template_id`, `raw_source_json`,
     `raw_source_hash`, `normalized_elements[]`, `aspect_ratio`/`output_type`/`duration_seconds`,
     `template_variant_key_matched`, `capture_actor`, `evidence`). No write-back field of any kind.
   - A `$schema`/`schema_version`/artifact-id/hash/registry-linkage header block per field, matching
     the existing registry-schema-v2.md documentation style (a markdown field table, not raw JSON
     Schema — consistent with how registry-schema-v2.md itself documents shapes).
   - State the registry posture lines (declarative only, not consumed by production workers, no DB
     registry introduced) matching registry-schema-v2.md §6, and the four §2.4 hard exclusions
     restated verbatim (no auto template creation, no auto promotion, no bidirectional sync, PK visual
     gate never bypassed).
2. `.claude/helpers/m13-blueprint-capture-diff.mjs` — the structural-diff engine (packet §5), as a
   standalone Node script mirroring the apply-harness-auditor pattern:
   - Pure core: parse a Blueprint JSON + a Capture JSON (already-parsed objects, not files, in the
     exported functions), walk `Blueprint.elements[]` vs `Capture.normalized_elements[]` keyed on
     `element_key`.
   - Three finding classes, each independently reportable: `missing_in_capture` (BLOCK),
     `dimension_output_mismatch` (BLOCK — aspect_ratio/output_type/duration_seconds disagreement
     beyond a stated tolerance placeholder), `extra_in_capture` (ADVISORY unless the extra
     `element_key` collides with a reserved field-class name), `field_class_mismatch` (ADVISORY-only
     in v1, per packet §5 — never promote to BLOCK).
   - Verdict rollup: `clean` (no findings) / `concerns` (advisory findings only) / `blocked` (any BLOCK
     finding) — matches the CCF-02 findings-contract vocabulary named in CLAUDE.md.
   - Emit a `structural_diff_result` object per packet §5's shape: `{ blueprint_id, blueprint_version,
     capture_id, capture_version, verdict, findings[], diffed_at }` — each finding cites its
     `element_key` and class.
   - Fail-closed: malformed/unparseable input (missing required field, not valid JSON) → verdict
     `incomplete`, never a fabricated `clean`.
   - Zero fs writes anywhere; a thin `main()` (only invoked directly, guarded like
     apply-harness-auditor's) reads two file paths from argv for CLI use; no network, no child
     process, no git.
   - Do NOT call the Creatomate API, do NOT read/write any DB, do NOT touch the live registry — this
     helper operates only on two already-produced JSON documents (a Blueprint fixture and a Capture
     fixture in this lane; real Capture documents are out of scope until the end-to-end proof lane,
     §5 below).
3. `.claude/helpers/fixtures/m13-blueprint-capture-diff/` — fixture JSON files:
   - One realistic scalar Blueprint fixture based on a **real registered template's known structure**
     — use one of the three existing PP carousel slide templates named in the scoping packet's §13
     addendum (`generic_carousel_cover_1x1_v1`, `generic_carousel_body_1x1_v1`, or
     `generic_carousel_closing_1x1_v1`) or another already-documented scalar variant from
     `docs/creative-library/property-pulse.json` if that is a cleaner scalar example — read-only
     evidence from the repo's own registry docs, no live Creatomate/DB calls.
   - A matching Capture fixture (clean pass — verdict `clean`).
   - Deliberately-mismatched Capture fixtures: one triggering `missing_in_capture`, one triggering
     `dimension_output_mismatch`, one triggering `extra_in_capture` (non-colliding, advisory), one
     triggering `field_class_mismatch` (advisory), and one malformed/incomplete input to exercise the
     fail-closed path.
4. `.claude/helpers/m13-blueprint-capture-diff.test.mjs` — hermetic `node --test` suite proving: the
   clean pass, each BLOCK class fires correctly, each ADVISORY class fires correctly (and never
   escalates to BLOCK), and the fail-closed path returns `incomplete` on malformed input. No network,
   no DB, no real live template calls anywhere in the test suite.
5. A short handoff-notes section (either a `## Handoff` section at the bottom of the schema doc, or a
   separate `docs/briefs/m13-buildpack-lane1-handoff-notes-v1.md`) naming explicitly what the
   post-watch end-to-end proof lane (packet §8 lane 5) still needs beyond this lane: a real human
   transposition of a Blueprint into Creatomate, a real `GET /v1/templates/{id}` Capture read (this
   lane only proves the diff engine against fixtures), the registry/constraint persistence lane
   (packet §8 lane 3, T3), and the Asset Gap display wiring (packet §8 lane 4). State plainly that
   this lane proves the diff engine and schemas in isolation, not the live composition of all five
   lanes.

**Out of scope (do not build in this lane):**
- Lane 3 (registry/constraint persistence, T3, DB-touching) — no DB writes, no migrations, no RPC
  calls of any kind.
- Lane 4 (Asset Gap dashboard display).
- Lane 5 (the real end-to-end proof with an actual human-transposed Creatomate template) — fixtures
  only in this lane, no live `GET /v1/templates/{id}` call.
- Ratifying the sibling schema doc into `registry-schema-v2.md` itself (leave that file untouched).
- Any multi-object/sequence *implementation* — the seam is a dormant, nullable field only.
- Any change to `docs/00_sync_state.md` / `docs/00_action_list.md` (register pointer entries are the
  orchestrator's job after the result doc, not ef-builder's).

## Allowed actions

- Read any file in the repo for evidence (registry-schema-v2.md, property-pulse.json, the M11c/M13
  packets, apply-harness-auditor.mjs and its tests/fixtures as the pattern to mirror).
- Write/edit only the files named in Scope, all inside the isolated worktree
  `C:/Users/parve/ice-worktrees/m13-buildpack-lane1` (branch `lane/m13-buildpack-lane1-scalar-proof`).
- Run `node --test .claude/helpers/m13-blueprint-capture-diff.test.mjs` (or the whole `.claude/helpers`
  suite) locally in the worktree to prove the tests pass.
- Run other local, read-only checks (lint/typecheck if configured) as needed.

## Forbidden actions

- No DB reads/writes of any kind (no `execute_sql`, no `apply_migration`, no live registry query).
- No Creatomate API calls (no `GET`, no `POST`, nothing network-touching in the helper or tests).
- No deploy, no `git push`, no merge into `main`, no commit outside the isolated worktree.
- No edits to `docs/creative-library/registry-schema-v2.md` or `docs/creative-library/property-pulse.json`
  (read-only evidence sources).
- No edits to `docs/00_sync_state.md` / `docs/00_action_list.md`.
- No schedule/cap DML, no production migration, no live selector/palette/routing/voice change, no
  cron/deploy activation, no intake/promotion — the full standing prohibited list from
  `cgu-final-build-acceleration-ruling-v1.md` §1, none of which this lane's file set touches anyway.
- Nothing writes the live Creative Library registry; every artifact produced is either a doc file or a
  fixture-driven local helper — treat as `NOT_APPLIED_*` in spirit (no apply step exists to run).

## Success criteria

- `docs/creative-library/m13-blueprint-capture-schema-v1.md` exists with both complete field tables
  (matching packet §3/§4 verbatim, including the dormant `sub_sequence_key` seam) and the registry
  posture / hard-exclusion restatement.
- `.claude/helpers/m13-blueprint-capture-diff.mjs` exists, exports a pure core, and implements the
  three finding classes + verdict rollup + fail-closed behavior described above.
- `.claude/helpers/fixtures/m13-blueprint-capture-diff/` contains a clean-pass pair plus one fixture
  per mismatch class plus one malformed-input fixture, each traceable to a real registered template's
  known structure (cited by file/line).
- `node --test .claude/helpers/m13-blueprint-capture-diff.test.mjs` passes locally, covering clean
  pass, each BLOCK class, each ADVISORY class, and the fail-closed path.
- Handoff notes name lanes 3/4/5 explicitly as NOT done by this lane.
- `git status` in the worktree shows only the files named in Scope changed — nothing else.

## Stop condition

Report result per the result template (`docs/briefs/_template_result.md`), listing every file
created/modified, confirming each Forbidden-actions item was not done, and confirming `git status`
in the worktree matches exactly the approved file set. Do not commit. Do not push. Do not merge. Then
stop — the orchestrator runs branch-warden verification, external review, and presents the PK merge
gate.

---

## Notes

PK authorized this lane directly in this session's chat window ("Yes, go ahead — proceed as build
lane L3") after the orchestrator flagged that the originating cross-session relay message lacked the
`INFORMATIONAL — NO AUTHORITY CONVEYED` disclaimer required by
`docs/governance/orchestrator-operating-manual-v1.md` §3 and asked for direct confirmation. This brief
is the record of that confirmation and the resulting scope, per CLAUDE.md's standing proof-lane
discipline (a code lane still gets a brief even when PK's go-ahead was given informally in chat).
