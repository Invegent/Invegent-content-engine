# P2 lane state — Shared Asset Pool dark-DDL — PREPARED, HALTED AT R1

**Lane:** P2 (assessment §5) · SIDE_PROVING · **T3** (PK-assigned Gate 1, 2026-07-19)
**Brief:** `docs/briefs/shared-asset-pool-p2-dark-ddl-brief-v1.md`
**Design of record:** `docs/briefs/shared-asset-pool-design-of-record-v1.md` (RATIFIED, register v5.74)
**Recorded:** 2026-07-19 Sydney · **PK ruling:** Option 1 (preserve + resume); **R1 override refused.**

---

## STATE (exact)

- **PREPARED — HALTED AT R1**
- **Static review clean**
- **Mandatory MCP-enabled DB/RLS verification not performed**
- **Not externally reviewed for apply**
- **Not merged**
- **Not applied**

This packet lives on an **isolated branch** (`claude/ice-shared-asset-pool-p2-prepared`), deliberately **not** merged to `main`. The `main`/session-branch register carries only a pointer to this branch + commit, marked blocked/unapplied.

## Artifacts (pinned)

| Artifact | Path | sha256 |
|---|---|---|
| Migration (prepared, dark, empty, **unapplied**) | `supabase/migrations/20260719072503_create_shared_asset_pool_v0.sql` | `f8eaa7206de083bd9a3153a539dbd66608978c91c605ae677ab2d8893a9c82c6` |
| Rollback companion | `_harness/shared_asset_pool_v0/20260719072503_create_shared_asset_pool_v0.rollback.sql` | `6ab35fa0d3b7e6189f1bf56d08c3844e9861f92402123719677d80fbfae89c26` |
| Gate-1 brief | `docs/briefs/shared-asset-pool-p2-dark-ddl-brief-v1.md` | `80dbbb2105957948816e3eae9a6db0e861755c6fdcd9cb771ce61024a7e70b65` |

The migration authors six empty, fenced, RLS-deny-all/service-role-only tables (`m.shared_asset`, `m.shared_asset_suitability`, `m.shared_asset_license`, `m.shared_asset_review_event`, `m.shared_asset_usage_event`, `c.client_asset_profile`), mirroring the music-v0 posture. Ships dark: no resolver reads them, no data, no RPC, no storage, no worker change.

## Why halted (R1)

`db-rls-auditor` returned **`block`** — **not a SQL defect.** Its `mcp__supabase__*` tools are **not wired this session** (only Read/Grep/Glob), so the six mandated live checks could not run. R1 forbids an orchestrator substitution at P2/T3 (the P1 orchestrator-read was a T1-only stopgap). Per the brief's stop condition, the lane halts **before any apply**. PK explicitly refused the R1-override option.

**Static review (repo-grounded, clean — no defect found):** RLS/REVOKE/GRANT complete on all six; fail-closed fences (approval_status/approved/production_use_allowed/is_active + brand_neutral all default not-eligible); no anon/authenticated table grant; `m.*`/`c.*` REST-unexposed; sane CHECK vocabularies; ON DELETE CASCADE FKs; reverse-order zero-residue rollback; migration version unique/non-colliding. **branch-warden: `safe`.**

## PK rulings on the three authored decisions (2026-07-19)

1. **Fences as real boolean columns** — **approved IN PRINCIPLE**, subject to the live (MCP-enabled) auditor confirming exact **defaults, constraints, and compatibility**. Not finally frozen.
2. **`approval_status` vocabulary** (`'intake_candidate','visual_reviewed','approved_scoped','restricted','rejected','archived'`) — **NOT approved.** The MCP-enabled auditor must compare it against existing **canonical status vocabularies** and either recommend reuse or justify a new vocabulary **before the packet is frozen.**
3. **"No offline parse"** — treated as an **outstanding verification gap**, NOT a ratified design choice. First genuine parse/execute must occur at the MCP-enabled re-review or a non-persisting dry-run.

## Resume protocol (MANDATORY — do not deviate)

Resume P2 **only** in a session where `db-rls-auditor` has working Supabase MCP access. Then, before external review:
1. Live catalog checks — `to_regclass` NULL for all six tables; migration version `20260719072503` absent from `supabase_migrations.schema_migrations`; schemas `m`/`c` exist; `c.client(client_id)` is a valid PK/unique FK target.
2. `get_advisors` (security + performance) — baseline + predicted-delta triage (unindexed FK on `review_event.asset_id` + `usage_event.asset_id`; RLS-enabled-no-policy INFO as intended).
3. RLS/grant verification against live truth, incl. the music-v0 precedent posture and the schema-`c` USAGE caveat (anon/authenticated hold `c` USAGE → no table grant to them).
4. **Vocabulary reconciliation** for `approval_status` (ruling 2).
5. **FK-index triage** (ruling: decide whether to add covering indexes on the two unindexed child FKs).
6. Confirm **fences-as-columns** defaults/constraints/compat (ruling 1).

**After any required correction: freeze ONE new packet hash, run the complete T3 review chain** (branch-warden → MCP-enabled db-rls-auditor `pass` → external review pinned to the new hash → independent lead re-verification), then **return to PK at the apply hard-stop.**

## Not authorised (standing)

No DDL apply · no resolver work (P4/P5) · no data intake/promotion/approval · no shared-pool activation · no P3–P5 downstream work · no merge of the migration into `main`.
