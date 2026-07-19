# Handoff — shared-asset review_event + usage_event tables (ready-to-adopt for the Asset-Gap owner)

**Created:** 2026-07-19 Sydney · **Author:** chat (orchestrator)
**Type:** design handoff / drop-in — **input to the Asset-Gap lane owner** (who owns `c.shared_creative_asset`)
**Source:** cc-0041 evolution assessment (`docs/briefs/results/cc-0041-evolution-design-input-assessment.md`, idea 3 = ADOPT-CANDIDATE) + the superseded shared-pool DoR §2 (music-parity tables 4–5)
**Status:** DESIGN ONLY — nothing applied. This is a drop-in for the owner to fold into their **shared-asset promotion/rotation lane** at that lane's own T2 gate. **Not authorised to apply here.**

---

## Why this exists (and why it's a handoff, not a lane)

The cc-0041 evolution assessment ranked `review_event` + `usage_event` the **one adopt-candidate** of the four additive ideas: genuinely absent from cc-0041 (which has only the *demand-side* `m.asset_gap_*` tables), **additive-dark** (append-only logs, no reader touches them), and directly useful to the owner's upcoming **promotion** (needs an approval audit trail) and **rotation** (needs a cooldown source-of-truth) work.

`c.shared_creative_asset` is **live and actively owned** by the Asset-Gap program. Per the assessment (PK-approved), this must **fold into the owner's own lane, not open a parallel schema lane** — so this doc is a ready-to-adopt design the owner lifts when they build promotion/rotation. It ships nothing.

## Adopt condition (do NOT apply before this)

Adopt at the point the owner builds **shared-asset promotion** (the writer of `review_event`) and/or **rotation** (the writer/reader of `usage_event`). Until then these tables have no writer and no reader — applying earlier just adds empty tables ahead of need. Apply as part of, or immediately before, that lane at its **own T2 gate** with the full chain (MCP-enabled `db-rls-auditor` + `get_advisors` + external hash-pinned + PK apply + rollback pre-written).

## Proposed DDL (drop-in; owner adjusts names/schema to house convention)

Mirrors cc-0041's exact posture (`cc-0041-asset-gap-analysis-ddl-packet-v1.sql`): RLS-enabled deny-all (no policy) · `REVOKE ALL FROM public, anon, authenticated` · `GRANT` DML to `service_role` + SELECT to `inspector_ro` · non-REST-exposed. FK to the **live** `c.shared_creative_asset(id)`.

```sql
-- 1) Scoped-approval AUDIT TRAIL for a shared asset (append-only; written by the promotion lane)
create table c.shared_creative_asset_review_event (
  review_event_id   uuid primary key default gen_random_uuid(),
  shared_asset_id   uuid not null references c.shared_creative_asset(id) on delete cascade,
  -- cc-0041 uses a FLAT scope model (governance_scope + vertical_key + allowed/excluded arrays),
  -- NOT scoped-suitability rows — so record the flat context that changed, not scope_kind/value:
  governance_scope  text,                 -- the scope the transition applied to (nullable = asset-level)
  vertical_key      text,
  affected_client_id uuid,                 -- soft ref; the client a scoped decision named (nullable)
  from_status       text,                  -- prior approval_status
  to_status         text,                  -- new approval_status (mirrors c.shared_creative_asset.approval_status)
  actor             text,                  -- PK / operator / system
  note              text,
  created_at        timestamptz not null default now()
);
comment on table c.shared_creative_asset_review_event is
  'Append-only scoped-approval audit for c.shared_creative_asset: every approval_status transition recorded, never inferred. Written by the promotion lane; empty until then.';
create index shared_creative_asset_review_event_asset_idx
  on c.shared_creative_asset_review_event (shared_asset_id);

alter table c.shared_creative_asset_review_event enable row level security;
revoke all on c.shared_creative_asset_review_event from public, anon, authenticated;
grant select, insert, update, delete on c.shared_creative_asset_review_event to service_role;
grant select on c.shared_creative_asset_review_event to inspector_ro;

-- 2) Usage / rotation-cooldown SOURCE OF TRUTH (append-only; written at render, read by rotation)
create table c.shared_creative_asset_usage_event (
  usage_event_id    uuid primary key default gen_random_uuid(),
  shared_asset_id   uuid not null references c.shared_creative_asset(id) on delete cascade,
  client_id         uuid,                  -- soft ref; which client used it
  context           text,                  -- post/render context (e.g. post_draft id, format)
  used_at           timestamptz not null default now()
);
comment on table c.shared_creative_asset_usage_event is
  'Append-only usage log for c.shared_creative_asset: rotation/cooldown source of truth (reads shared_asset_id, client_id, used_at). Written at render time by the rotation lane; empty until then.';
create index shared_creative_asset_usage_event_asset_idx
  on c.shared_creative_asset_usage_event (shared_asset_id);
create index shared_creative_asset_usage_event_client_used_idx
  on c.shared_creative_asset_usage_event (client_id, used_at);

alter table c.shared_creative_asset_usage_event enable row level security;
revoke all on c.shared_creative_asset_usage_event from public, anon, authenticated;
grant select, insert, update, delete on c.shared_creative_asset_usage_event to service_role;
grant select on c.shared_creative_asset_usage_event to inspector_ro;
```

## Integration notes (for the owner)

- **`review_event`** is written by the promotion path (whatever flips `c.shared_creative_asset.approval_status`/`is_active`/`production_use_allowed`); it makes "approved for scope S" auditable rather than inferred. It reads nothing at runtime.
- **`usage_event`** is written at render time (when a shared asset is selected) and read by rotation/cooldown logic; it's the source of truth for "don't re-serve X for N days." No existing cc-0042 reader (`derive_asset_appetite`/`resolve_shared_pool_assets`/`analyze_asset_gap`) touches it — additive-dark.
- **Schema placement is the owner's call:** these reference `c.shared_creative_asset` so `c.*` is proposed for cohesion; the owner may prefer `m.*` alongside the demand tables (`m.asset_gap_*`). Either works — flag only.
- **Adapted away from the scoped-suitability model:** the assessment ranked the scoped-suitability table a near-drop, so `review_event` records cc-0041's **flat** `governance_scope`/`vertical_key`/`affected_client_id` context, NOT `scope_kind`/`scope_value` rows. This keeps the handoff consistent with the incumbent design.
- **Ledger/migration discipline:** cc-0041 applies via governed `execute_sql` with a backfilled ledger entry (`apply_migration` deny-listed); the owner follows their established mechanism + a pre-written rollback (`drop table … usage_event; drop table … review_event;`).

## What this handoff is NOT

- Not applied · not scheduled · no live schema/DDL/deploy touched.
- Not a parallel schema lane — it is input the owner folds into their promotion/rotation lane at that lane's own T2 gate.
- Not the other three ideas (licence table / cultural_review_required / scoped-suitability) — those stay deferred per the assessment.

## Handoff routing

→ **Asset-Gap lane owner** (owns `c.shared_creative_asset`): adopt when building promotion/rotation, at your own T2 gate with the full MCP-enabled chain.
→ **PK:** the assessment named the PK decision as "approve folding `review_event`/`usage_event` into the owner's promotion/rotation lane when scoped" — this doc is that ready-to-adopt design.
