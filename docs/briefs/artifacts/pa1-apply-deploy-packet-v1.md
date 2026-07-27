# Path A Apply / Deploy Packet v1 — per-client schedule-cap controls

**Lane:** schedule-cap-controls · **Deliverable A (T2)** — schedule-cap editability. **Path B (T3, `max_per_day` cadence) is a SEPARATE later packet; NOT in this one.**
**Boundary:** Path A changes only what an operator can *schedule* (a UI-advisory ceiling). It does **not** change publishing — no worker reads the new store, `max_per_day` is untouched, so **this cannot alter posts that go out.**

Nothing herein applied/deployed/committed/pushed. This is the artifact for external review + the PK apply/deploy gate.

## Artifacts
**DB (CE worktree `posting-cap-p1` @ base 28ad6ec):**
- `supabase/migrations/20260727140000_pa1_client_schedule_cap_override_store.sql` — greenfield additive: table `c.client_schedule_cap_override` (per client+platform, `max_per_day` 1..10 / `max_per_week` 1..50, both nullable, `UNIQUE(client_id,platform)`, CHECK bounds) fully locked down (RLS ENABLE+FORCE, no policy, REVOKE PUBLIC/anon/authenticated — schema `c` is PostgREST-exposed); + `public.get_schedule_caps(uuid)` and `public.save_schedule_cap_override(uuid,text,integer,integer)` — SECURITY DEFINER, `search_path=''`, service_role-only, fail-closed (22004/22023/23514/23503), both-null clears, else UPSERT.
- `docs/briefs/artifacts/pa1-rollback.sql` — DROP both functions + DROP TABLE.

**Dashboard (worktree `dash-posting-cap-p1` @ base origin/main 79e063d):** new `actions/schedule-caps.ts`, `lib/schedule-caps.ts`; modified `components/clients/ScheduleTab.tsx` (per-platform `capFor(platform)` replacing the flat hardcoded tier cap; advanced per-platform cap editor with helper + honesty note) + `app/(dashboard)/clients/page.tsx` (fetch `getScheduleCaps`, pass `capOverrides`). No new route. Typecheck (app-only) PASS.

## Ordered apply/deploy steps
### Pre-checks (STOP on any)
- P0. Greenfield still true: `c.client_schedule_cap_override` + both RPCs do NOT exist live.
- P1. branch-warden safe on both worktrees; change sets == expected (CE 2 files; dash 2 new + 2 modified); nothing stray.
- P2. All reviews clean (db-rls-auditor, dashboard-ia-lint, apply-harness-auditor shadow, external review pinned to this packet hash).

### DB apply (PK-run; HARD STOP gate)
1. `apply_migration` `pa1_client_schedule_cap_override_store` (body = the migration file).
2. Post-apply verify (STOP on fail): table exists, RLS enabled+forced, anon+authenticated denied SELECT/INSERT (42501); both RPCs EXECUTE = service_role/postgres only (anon/authenticated denied); `get_schedule_caps(<client>)` returns `{}`; `save_schedule_cap_override(<client>,'facebook',3,20)` sets it, a re-read returns it, and clear (both null) removes it; an out-of-bounds call (e.g. max_per_day=99) RAISEs with zero write.

### Dashboard deploy (separate; after DB live)
3. Merge `dash-posting-cap-p1` → dashboard `origin/main` → Vercel. Then browser-verify: for a client with an override raising Facebook, the schedule tab lets the operator enable/add slots past 5; a client without an override still blocks at 5; the editor Save/Reset works; error surfaced on an out-of-bounds attempt.

## STOP conditions
Greenfield violated (already exists) · non-clean review · unexpected file in either change set · anon/authenticated reachable after apply · invalidated rollback.

## Rollback
`pa1-rollback.sql` (DROP both functions + DROP TABLE). Additive + dark → rollback is a clean drop; no data dependency (no worker reads it). Dashboard: revert the merge / redeploy prior build.

## Review chain status
- **branch-warden: SAFE** — both worktrees isolated on feature branches, change sets exact (CE 2 files; dash 2 new + 2 modified), bases unmoved.
- **db-rls-auditor: CLEAN / high** — lock-down complete + stronger than precedent (adds FORCE RLS; postgres/service_role bypass so RPCs work); no residual anon/authenticated path; RPC grants service_role-only; fail-closed + table CHECK defence-in-depth; greenfield confirmed live; rollback inverse; only advisor delta = intended `rls_enabled_no_policy` INFO. No CE worker references the new RPCs/table (orchestrator grep) → UI-advisory claim holds.
- **dashboard-ia-lint: PASS** — no new route, coherent placement, `?client=` scoping preserved, "slot" not overloaded. Non-IA warning (handed off): the super-user cap editor is not role-gated (dashboard auth-but-no-authz) — the role-register lane (separate, already running) addresses it.
- **apply-harness-auditor (shadow): CONCERNS (medium) → ADDRESSED.** Finding: greenfield STOP was asymmetric — table `CREATE TABLE` fail-closed but RPCs `CREATE OR REPLACE` (silent clobber). FIXED: both RPCs now bare `CREATE FUNCTION` → a pre-existing RPC aborts the apply fail-closed, symmetric with the table. All other checks clean (rollback identity, fail-closed bounds + CHECK defence-in-depth, single-call channel).
- **ask_chatgpt_review: ESCALATE / partial** on hash `f5fde4378d1ca4033b02df484f2827d9` (medium/medium; review_id `5a37011b-3b7b-4389-a8b9-7759aee97f01`). Sole pushback = the un-role-gated super-user cap editor; suggested fix = role-gate before deploy. Bridge auto-escalated to PK. No concrete defect in the DDL/RPC. → PK decision gate (this is the standing authz carry; the DB apply is service_role-only with no UI exposure, separable from the dashboard editor deploy).

**Standing carry:** the cap editor (and Path B later) is reachable by any authed user until the role register lands (separate lane, running).
