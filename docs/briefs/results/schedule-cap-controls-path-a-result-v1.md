# Result — Schedule-Cap Controls, Path A (per-client per-platform schedule cap)

**Date:** 2026-07-27 Sydney · **Tier:** T2 (additive greenfield DB + dashboard UI) · **Lane class:** PRODUCT_PROOF
**Brief:** `docs/briefs/schedule-cap-controls-brief-v1.md` · **Packet:** `docs/briefs/artifacts/pa1-apply-deploy-packet-v1.md` (hash `f5fde4378d1ca4033b02df484f2827d9`)
**Verdict:** COMPLETE — applied + deployed. Path B (`max_per_day` cadence, T3) is the next packet.

## Outcome
Super-user, per-(client,platform) editable **schedule cap**, replacing the hardcoded literal `tier="standard"` (5/week for every client). Operators can now raise how many slots they schedule per platform. **Boundary:** UI-advisory only — no worker reads the store; `max_per_day` untouched — so this does **not** change publishing throughput (that's Path B).

## Shipped
- **DB (applied via `apply_migration` `pa1_client_schedule_cap_override_store`):** table `c.client_schedule_cap_override` (per client+platform; `max_per_day` 1..10 / `max_per_week` 1..50 nullable; `UNIQUE(client_id,platform)`; CHECK bounds; FK to `c.client`). Locked down (RLS **ENABLE+FORCE**, no policy, REVOKE PUBLIC/anon/authenticated — schema `c` is PostgREST-exposed). Two `SECURITY DEFINER`, `search_path=''`, service_role-only RPCs: `get_schedule_caps(uuid)` and `save_schedule_cap_override(uuid,text,integer,integer)` (fail-closed 22004/22023/23514/23503; both-null clears; else UPSERT). Bare `CREATE FUNCTION` (fail-closed on collision). Rollback `pa1-rollback.sql` (drop both fns + table).
- **Dashboard (deployed — `invegent-dashboard` `main` @ `4f10248`, ff from `79e063d`, Vercel prod):** `actions/schedule-caps.ts`, `lib/schedule-caps.ts`; `ScheduleTab.tsx` per-platform `capFor(platform)=COALESCE(override, TIERS.standard)` + super-user per-platform cap editor (helper note: raises scheduling only; honesty line: not yet role-restricted); `page.tsx` fetch/pass `capOverrides`. No new route.

## Review chain
branch-warden safe · db-rls-auditor **clean/high** (lock-down stronger than precedent; no anon path; greenfield live; rollback inverse; no worker reads it) · dashboard-ia-lint **PASS** · apply-harness-auditor shadow **CONCERNS→addressed** (greenfield symmetry: RPCs switched to bare `CREATE FUNCTION`) · external `5a37011b` **escalate/partial → PK cleared** (sole point: un-role-gated editor = standing authz carry; PK chose ship-both).

## Post-apply proof (live, project mbkmaxqhsohbtwsqolns)
Greenfield re-confirmed pre-apply. Post-apply: RLS enabled+forced; both RPCs `postgres`/`service_role` only; `save_schedule_cap_override(property-pulse,'facebook',3,20)` → `{ok,set}`, fresh read `{facebook:{3,20}}`; out-of-bounds `(…,99,20)` → RAISE 23514 zero write; clear `(…,null,null)` → `{ok,cleared}`, store back to **0 rows** (baseline clean, no test residue).

## Carries
- **Authz (standing):** the super-user cap editor is reachable by any authed user until the **role register** lands (separate lane, running in its own session). Consistent with the dashboard's current auth-but-no-authz posture; Path A only affects scheduling ceilings.
- **Record:** committed on isolated branch `posting-cap-p1` (unpushed CE record); CE main is worked by concurrent lanes — register pointer + merge left to PK.
- **Rendered-UI visual acceptance:** PK (auth-gated).

## Next
**Path B (T3)** — editable `max_per_day` (the real publish-throughput lever; all clients currently 2/day). Own packet + full chain + live throughput proof. PK value calls pending: target `max_per_day` (3 ≈ 21/week) and whether LinkedIn rises or holds at 2 (by-design).
