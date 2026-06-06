# Asset Production Policy & Provider Routing — Stage 0 build-spec artefacts

**STATUS: PRE-BUILD PLANNING ONLY. NOT YET AUTHORISED FOR BUILD.**

This folder holds the fixed on-disk reference for the future OBS (out-of-band
shadow observer) build. These are planning/specification documents. Nothing
here has been built, deployed, or applied.

## What is in here

| File | Purpose |
|---|---|
| `01_fprecond_obs_schema.md` | F-precondition artefact 1 — `obs` row + 0A/0B output schema (concept, not DDL) |
| `02_fprecond_evidence_class_lattice.md` | F-precondition artefact 2 — evidence-class lattice rule |
| `03_fprecond_transform_contract.md` | F-precondition artefact 3 — single named 0A→0B transform contract |
| `04_fprecond_0A_lint_config.md` | F-precondition artefact 4 — 0A allowlist/denylist lint config (draft) |
| `05_ccd_obs_build_handoff.md` | CCD build handoff — execution sequence (post-gate) |

## Source spec

These artefacts implement the consolidated **Stage 0 Shadow Resolver
Specification v0.5.1** (held in working session; canonical vocabulary
`ice_format_key`; isolation model = Path B physical isolation). They are the
four "F-precondition" build artefacts that the v0.5.1 spec requires to exist
and pass review BEFORE any observer code is built.

## Hard gate (must all be true before any build begins)

1. The isolated `obs` Supabase project exists as an executable build boundary
   (separate project / security boundary — a PK provisioning action).
2. A concrete first-mutation plan is written.
3. D-01 (`ask_chatgpt_review`) fires for that mutation AND PK gives the exact
   written approval phrase for it.

Until all three hold: **no DDL, no migration, no deploy, no Supabase project
mutation, no production project mutation, no provider/API calls, no env/Vault/
secret changes, no CCD build execution.**

These documents contain **no** service keys, DB URLs, project refs,
credentials, or tokens, by design. The isolated `obs` project ref and
credentials are deliberately NOT recorded here and must never be committed to
this repo.
