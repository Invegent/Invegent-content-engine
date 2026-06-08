# Asset Production Policy & Provider Routing — Stage 0 build-spec artefacts

**STATUS: Stage 0 FOUNDATION APPLIED (2026-06-08) to the isolated OBS project only. The 0A observer / read-path and everything after remain PRE-BUILD and BLOCKED — a new concrete plan + new D-01 + PK exact-phrase approval are required before any further build.**

This folder holds the fixed on-disk reference for the OBS (out-of-band shadow
observer) build. These are planning/specification documents. Only the Stage 0
schema/table **foundation** has been applied (to the isolated OBS project — see
below); no observer code, read-path, runtime, cron, or 0B work has been built,
deployed, or applied. A read-only diagnostic (`06_stage0_readonly_diagnostic_2026-06-08.md`)
has since answered the Stage 0 questions from existing production evidence and
recommends **holding 0A** (recommendation C — the residual gaps are
source-instrumentation gaps, not observer-read gaps).

## Stage 0 foundation status — APPLIED (2026-06-08)

The Stage 0 **foundation mutation** has been applied to the isolated OBS project
`invegent-obs-stage0` (project ref held privately; ap-northeast-2 / Seoul) **only**.

- **Migration `obs_stage0_observation_foundation`** — additive DDL: schema `obs`;
  `evidence_class` + `stage_kind` enums; append-only `obs.observation` table
  (mandatory `stage` + `row_evidence_class`; idempotency key
  `(post_draft_id, observer_version, stage)`; provenance columns; 0A/0B class
  CHECKs; append-only trigger; 4 inspection indexes); `payload_cells_valid`
  validator.
- **Governance** — D-01 `fd3e519a-17d0-45eb-94a9-cab27a407612` (PK exact-phrase
  approval; closed **`completed`** on 2026-06-08). CCD applied after a pre-apply
  isolation check (connected ref = OBS, not production; `obs.observation` absent
  pre-apply).
- **Production `mbkmaxqhsohbtwsqolns`** — untouched. Re-checked post-apply: no
  `obs` schema, no `obs.observation`.
- **Isolation** — OBS remains physically separate (Path B).

**Still BLOCKED:** the 0A observer / read-path and everything after it. See the
Hard gate below — a new concrete plan + new D-01 + PK exact-phrase approval are
required before any further build. No read path, CDC, deploy, observer runtime,
cron, provider call, or 0B work has occurred or is authorised.

## What is in here

| File | Purpose |
|---|---|
| `01_fprecond_obs_schema.md` | F-precondition artefact 1 — `obs` row + 0A/0B output schema (concept, not DDL) |
| `02_fprecond_evidence_class_lattice.md` | F-precondition artefact 2 — evidence-class lattice rule |
| `03_fprecond_transform_contract.md` | F-precondition artefact 3 — single named 0A→0B transform contract |
| `04_fprecond_0A_lint_config.md` | F-precondition artefact 4 — 0A allowlist/denylist lint config (draft) |
| `05_ccd_obs_build_handoff.md` | CCD build handoff — execution sequence (post-gate) |
| `06_stage0_readonly_diagnostic_2026-06-08.md` | Stage 0 read-only diagnostic (2026-06-08) — Q1/Q3/Q5/Q7 answered from existing production evidence; **recommendation C (hold 0A)**; residual gaps are source-instrumentation, not observer-read |

## Source spec

These artefacts implement the consolidated **Stage 0 Shadow Resolver
Specification v0.5.1** (held in working session; canonical vocabulary
`ice_format_key`; isolation model = Path B physical isolation). They are the
four "F-precondition" build artefacts that the v0.5.1 spec requires to exist
and pass review BEFORE any observer code is built.

## Hard gate

**Foundation gate — SATISFIED for the Stage 0 foundation mutation (2026-06-08):**
the isolated OBS project exists; the concrete first-mutation plan was written;
D-01 `fd3e519a-17d0-45eb-94a9-cab27a407612` fired and PK gave the exact-phrase
approval; CCD applied the foundation to the isolated OBS project only.

**The same discipline now gates the next step (0A observer / read-path) and
everything after.** Before any further build, all of these must hold again for
that specific mutation:

1. A concrete plan for the next mutation is written.
2. D-01 (`ask_chatgpt_review`) fires for that mutation AND PK gives the exact
   written approval phrase for it.
3. (Read-path specifically) the controlled read-path method, production
   perturbation controls, and OBS credential isolation are decided and reviewed
   first.

Until then: **no DDL, no migration, no deploy, no Supabase project mutation, no
production project mutation, no read path, no CDC, no OBS↔production connection,
no provider/API calls, no env/Vault/secret changes, no observer runtime, no
cron, no 0A build, no 0B work, no CCD build execution.**

These documents contain **no** service keys, DB URLs, project refs,
credentials, or tokens, by design. The isolated `obs` project ref and
credentials are deliberately NOT recorded here and must never be committed to
this repo.
