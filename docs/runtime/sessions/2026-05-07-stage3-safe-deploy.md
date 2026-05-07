# Session 2026-05-07 — Stage 3 SHIPPED + VERIFIED (`safe-deploy.sh`)

**Slug:** `stage3-safe-deploy`
**Action list version:** v2.48 → v2.49
**Sync close type:** standard 4-way (session + sync_state + action_list + memory)
**Closure budget impact:** ~1.0h chat. Day total v2.47+v2.48+v2.49 ~4.5h. Trailing-14-day ~50.5h above 8.0 floor.
**Production mutations chat-side:** 0
**EF deploys:** 0
**Supabase mutations:** 0
**Cron changes:** 0
**D-01 fires this session:** 2 (Stage 3 brief + Stage 3 result read-only review). T-MCP-02 cumulative 42 → 44.

---

## Outcome

Stage 3 of F-EF-DRIFT-PREVENTION shipped end-to-end. CC executed brief in ~14 min. `scripts/safe-deploy.sh` is now the canonical pre-deploy gate for Edge Function deploys, hard-blocking the standing don't-redeploy three regardless of database state, blocking Class A drift, blocking Class B unless `--allow-warn`, and PASSing C/D/repo-only/absent.

P1 SECURITY-DEFINER triage trio is now newly executable using the tool we just built ("eat our own dog food" pattern — next session opens by running `bash scripts/safe-deploy.sh heygen-avatar-creator --check-only` first to confirm BLOCK behavior on the trio before any sync work).

---

## Sequence

1. **Session start** — read `docs/00_sync_state.md` v2.48 + `docs/00_action_list.md` v2.48. Surfaced Today/Next 5 + standing P0 personal businesses + time-bound items. PK confirmed direction: Stage 3 planning + handoff only, no chat-side execution.

2. **Stage 3 brief authoring (chat)** — v1.0 brief drafted inline. PK applied 5 minor clarifications before D-01 fire:
   - (1) Schema fail-fast (exit 3) on missing `function_name` OR `class`
   - (2) Row-absence = PASS (advisory log, not full inventory)
   - (3) Raw JSON of matched row on BLOCK/WARN paths
   - (4) Connection error messages name method (CLI/psql/curl) + expected env/config
   - (5) PASS path prints exact deploy command before execution

   Brief bumped to v1.1.

3. **D-01 fire #1** (brief) — review_id `39a588d4-3fb4-41e4-a5a4-07916b6d64c7`. Verdict agree, risk medium, confidence high, 0 pushback_points, no corrected_action. T-MCP-02 42 → 43.

4. **Brief commit** — SHA `3f1135b9` to `docs/briefs/cc-stage-3-safe-deploy.md`. Handoff to CC executed.

5. **CC implementation** — Commit `3d43796` on `Invegent/Invegent-content-engine` `main`. Files: `scripts/safe-deploy.sh` (mode 100755, 9095 bytes) + `scripts/README.md` (1590 bytes). No other files modified.

6. **§1.5 pre-flight deltas (CC, all documented in commit body):**
   - **§1.5.1 conventions** — `#!/bin/bash` + `set -euo pipefail` per existing scripts; no root `package.json` so no npm-script alias
   - **§1.5.2 connection method** — CLI v2.75 has no ad-hoc SQL subcommand; psql not installed; **adopted method (c) curl + `exec_sql` RPC**. Required env `SUPABASE_SERVICE_ROLE_KEY`; optional env `SUPABASE_PROJECT_REF`.
   - **§1.5.3 SCHEMA DELTA (significant)** — brief assumed columns `function_name` and `class`; actual columns are **`slug` and `current_class`**. Per §1.5 step 5 mandate to "adapt rather than assume", schema fail-fast asserts the real names. Documented in script header AND README.
   - **§1.5.4 standing-three name match** — confirmed exact slug values; all three currently class `B-RR` severity `P1` with `security_definer_regression_risk=true`. Hardcoded array unchanged.

7. **Above-spec defensive additions (CC, net-positive):**
   - SQL-injection guard via regex `^[A-Za-z0-9_-]+$` on `<ef_name>` before SQL interpolation
   - Standing-three check fires BEFORE pre-flight — block holds even if Supabase is down or schema check fails
   - Default case for unknown future class values — surfaces as WARN, treats as advisory PASS

8. **A1–A8 acceptance** — all 8 PASS:
   | # | Result | Exit |
   |---|---|---|
   | A1 | usage block | 1 |
   | A2 | synthetic standing-three JSON + BLOCK | 2 |
   | A3 | same for `heygen-avatar-creator` | 2 |
   | A4 | same for `heygen-avatar-poller` | 2 |
   | A5 | `insights-worker` B-RR P2 row JSON + BLOCK | 1 |
   | A6 | same row + WARN + PASS (`--allow-warn`) | 0 |
   | A7 | `nonexistent-fn` PASS class=none | 0 |
   | A8 | git index mode 100755 | n/a |

9. **D-01 fire #2** (read-only verification of CC result) — review_id `82aff9d3-5176-41e9-9102-71f30a90e130`. Verdict agree, risk **LOW** (downgraded from medium at brief stage — implementation strictly safer than contract), confidence high, 0 pushback_points. T-MCP-02 43 → 44.

10. **v2.49 sync close** — this session file + sync_state + action_list in one commit. Memory edit separately. Manifest items folded:
    - **Sequence-honesty cleanup**: 4th → **5th** consecutive deferral on dashboard roadmap PHASES; NEW standing rule on visual-acceptance integrity; honest-limitation bullet about v2.48 premature acceptance documentation.
    - **AI cost view P3** (from ruflo analysis 6 May): NEW Active row — `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile.
    - **cc-0001 status note**: parenthetical added to existing tracked Phase 0 row noting brief-runner-v0 cycle #1 open and unexecuted. No new tracking row.

---

## Closures this session

- **F-EF-DRIFT-PREVENTION Stage 3** — CLOSED. `scripts/safe-deploy.sh` live; A1–A8 PASS; D-01 read-only PASS.
- Stage 3 brief task — closed implicitly via Stage 3 ship.

## Newly unblocked

- **P1 SECURITY-DEFINER regression-risk triage trio** (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — next session can use `safe-deploy.sh --check-only` against each to confirm BLOCK behavior, then sync repo → deployed source via Windows CLI as sync-only commits (no redeploys).
- **insights-worker P1 functional drift manual review** — sequenced after triage trio; PK reviews deployed v14.0.0 vs repo v1.6.0.

## Carry-forward state delta (vs v2.48)

- Dashboard roadmap PHASES — **fifth** consecutive deferral (was "fourth" in v2.48 docs)
- NEW standing rule (v2.49) on visual-acceptance integrity
- Honest-limitation bullet added re: v2.48 premature acceptance documentation
- AI cost view P3 added to Active table
- cc-0001 parenthetical added to existing Phase 0 row
- T-MCP-02 cumulative 42 → 44
- `m.ef_drift_log` row count unchanged at 147 (no new cron fire this session window). Next natural fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May.
- Hold-state on standing-three preserved — the script gates them but does not redeploy them.

## Honest limitations of this session

- Verification was read-only by chat (read repo files + commit body); chat did not run A1–A8 directly. Trust placed in CC's reported outputs, cross-checked against script logic. No discrepancy found.
- ChatGPT read-only review of result was a single fire; no second-opinion cross-check on the schema delta adaptation specifically.
- `--fail-with-body` curl flag is recent; if PK runs script in a non-WSL environment it may fail in unexpected ways. Untested across environments.
- Standing-three list is hardcoded; future updates require code change + sync_state + action_list updates first per encoded rule. Drift between docs and code possible if rule not followed.
- Class A AND A-LE are blocked. Acceptable per brief but worth flagging — a "matches deployed" Class A also blocks (because redeploy is unnecessary). PK reading "Class A" as permissive would be wrong.

## Next session priorities (rebuilt for v2.49)

1. **P1 SECURITY-DEFINER regression-risk triage** (P1 TOP, NEWLY UNBLOCKED) — use `safe-deploy.sh --check-only` against `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` to confirm BLOCK; then sync repo → deployed source via Windows CLI as sync-only commits.
2. **insights-worker P1 functional drift** (P1) — manual review by PK of deployed v14.0.0 vs repo v1.6.0. After triage trio.
3. **Personal businesses check-in** (P0 standing).
4. **Dashboard Architecture Review Phase 0 prerequisites** (P1) — 7 confirm-defaults via `cc-0001-dashboard-phase-0-defaults.md` + M5–M8 reconciliation. Independent of triage timeline; can run in parallel.
5. **F-YT-NY-FORMAT-SELECTION** (P1) — unblocks after #1.
6. **M6 Phase A** (P1) — unblocks after #1.
7. **AI cost view P3** (NEW v2.49) — `vw_ai_cost_monthly` + NOW dashboard tile. ~1h.
8. **Dashboard mobile responsiveness** (P3, system-wide).
9. **18+ close-the-loop UPDATEs** to `m.chatgpt_review`.
10. **Dashboard roadmap PHASES reconciliation** (P3, **5th** deferral).

## Commit ledger

- `3f1135b9` — Stage 3 brief (chat-side, this session)
- `3d43796` — Stage 3 implementation (CC, this session)
- v2.49 close commit (this commit) — SHA reported back to chat after push
