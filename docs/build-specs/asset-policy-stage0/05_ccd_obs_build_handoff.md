# CCD OBS build handoff — Stage 0 (post-gate execution sequence)

**PRE-BUILD PLANNING ONLY. DO NOT EXECUTE until the hard gate clears.**

## Gate position (must all be true before CCD starts)

1. Isolated `obs` Supabase project exists as an executable build boundary
   (separate project / security boundary — PK provisioning action).
2. Concrete first-mutation plan written.
3. D-01 (`ask_chatgpt_review`) fired for that mutation AND PK exact-phrase
   approval given.

Until then: no DDL, no migration, no deploy, no project mutation, no provider/
API calls, no env/Vault/secret changes.

## Actor split

| Task | Actor |
|---|---|
| Author observer code, schema, lattice, transform, lint (repo) | CCH (authoring) |
| Provision isolated `obs` project (account/billing) | PK |
| Stand up read path, deploy + schedule observer, wire CI gates | CCD (local) |
| Apply `obs` DDL in the isolated project | CCD (against the new project ref, NOT the production connection) |
| D-01 review before any mutation | CCH fires; PK approves |

## Why CCD, not CCH, builds this

The Stage 0 safety invariant is that the observer lives in a separate boundary
that production tooling cannot reach. CCH's Supabase connection IS a
production-project connection; building the observer through it would
contradict the isolation property. CCD runs locally with separate credentials
and is the correct actor to hold the `obs` boundary independently.

## Execution sequence (after gate clears)

### Step 1 — PK: provision isolated `obs` boundary
- Create a SEPARATE Supabase project (not the production project).
- Outputs: new project ref, DB connection string, service key.
- Keep these OUT of the production project env/Vault/secrets entirely. Do not
  commit them to this repo.

### Step 2 — D-01 fires (CCH) -> PK approval
- CCH fires `ask_chatgpt_review` on the concrete first mutation (stand up `obs`
  schema + observer, read-path config, deploy).
- PK gives exact-phrase approval. Only then does CCD touch anything.

### Step 3 — CCD build, in order

**A. `obs` schema in the isolated project** (CCD `apply_migration` against the
NEW project ref, never the production one):
- the append-only observation table with mandatory `evidence_class` + `stage`
  on every value cell, idempotency key `(post_draft_id, observer_version,
  stage)`, provenance columns. (From F-precondition artefact 1.)

**B. Controlled read path into production:**
- stand up a read-replica or CDC feed from the production project that the
  observer reads. Bounded queries, `statement_timeout`, no `FOR UPDATE`, no
  advisory locks. Confirm perturbation constraints hold under load.

**C. Observer code (0A first):**
- isolated DB client (its own creds — NOT the shared production `lib/db.ts`),
  reads the slot-originated population, writes raw 0A cells only. Enforce the
  artefact 4 lint (no `values_differ`, no `provider_inferred`, no difference
  booleans) in CI before merge.

**D. F-precondition machinery as real code:**
- lattice rule (artefact 2) as a checkable constraint; the single named
  `stage0_transform` module (artefact 3); the lint config (artefact 4) wired
  into CI as `fail_mode: hard`.

**E. Defence-in-depth gates (CI):**
- the 8 scans: direct `obs` string scan; import-graph from production
  entrypoints (transitive); shared-helper scan; migration scan; RPC/function-
  body scan; view-definition scan; SECURITY DEFINER scan; cron-definition
  scan; dynamic-identifier ban/allowlist.
- **Gate #9 — extension/FDW/egress:** scan + govern `pg_net`, `http`,
  `postgres_fdw`, `dblink`, `wrappers`, and any installable egress path; prove
  no production-side egress extension points at `obs`; scan production secret
  store to prove no `obs` URL/key is present.

**F. Deploy + schedule the observer** — from a normal terminal (standing rule:
EF deploys never via the MCP wrapper). 0A runs, produces the evidence-quality
coverage report.

**G. 0B only after 0A coverage passes thresholds** — the gated counterfactual
comparison.

## Isolation model (non-negotiable)

Path B physical isolation only. Production runtime identities have no
authenticated/credentialed/runtime-held endpoint+credential route to `obs`.
Literal network air-gap is not claimed; the boundary is a separate credentialed
project + Gate #9 egress control. Path A (least-privilege runtime role) and
literal air-gap are future platform-hardening options, outside Stage 0.

## Rollback

Drop/disable the isolated `obs` boundary + unschedule the observer. Because the
sink is isolated and unread by production, rollback cannot affect the live
pipeline.
