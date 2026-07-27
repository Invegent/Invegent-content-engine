# Brief cc-NNNN — schedule-cap-controls

**Created:** 2026-07-27 Sydney
**Author:** chat (brief-author) · orchestrator-verified
**Executor:** Claude Code (orchestrated) + PK at every gate
**Status:** draft
**Result file:** `docs/briefs/results/cc-NNNN-schedule-cap-controls.md` (created on completion)

> Registrar assigns the final `cc-NNNN` + register version via the claim-stub protocol; this draft never self-numbers.
> **Orchestrator verification:** the load-bearing correction below (tier is a hardcoded literal) is CONFIRMED against `invegent-dashboard/app/(dashboard)/clients/page.tsx:603` → `tier="standard"`.

---

## Gate-1 decisions (PK, 2026-07-27)

1. **(Q i) Deliverable B IS IN SCOPE.** PK elected to include `max_per_day` editability "so I can actually raise output" — the schedule cap alone can't (`max_per_day=2` caps ~14/week). B stays a **separate T3 sub-gate** with a **live publish-throughput proof**; `max_queued_per_platform` included only if needed to reach the target.
2. **(Q iii)** The override carries **both per-day AND per-week** caps (mirrors `TIERS`); no half-inherit.
3. **(Q v)** Add an **override on top of the fixed `standard` base**; do NOT rebuild per-client tier resolution in this lane.
4. Sequence: A (T2) build + gate first; B (T3) as its own gate. Apply/deploy of any cadence value is a hard PK stop.

---

## Task

Build **super-user, per-client editable posting caps** so an operator can raise a client's weekly *schedule* volume beyond the hardcoded client-side tier default that currently blocks scheduling more slots. Two deliverables, **each its own gate and tier**, so the safe change is not coupled to the production-affecting one:

- **Deliverable A (T2 — SAFE, schedule-cap editability):** a durable per-client cap-override store; a super-user dashboard control to set it; and `ScheduleTab` reading that override *on top of* the hardcoded `TIERS` caps so slots beyond the tier default can be scheduled. This changes only what the operator can *plan* in the schedule grid.
- **Deliverable B (T3 — PRODUCTION-AFFECTING, publish-cadence editability):** exposing the real throughput levers `c.client_publish_profile.max_per_day` (and, if elected, `max_queued_per_platform`). This is a **separate PK decision**, recommended NOT built inside this lane without explicit PK election — see Open Question (i).

**Load-bearing reason the two are split:** the UI schedule cap is NOT the publishing throughput. Raising the schedule cap alone will not increase real posts — actual output is throttled by `max_per_day` in the publisher (`supabase/functions/publisher/index.ts:435-443`).

## Source context

- `invegent-dashboard/components/clients/ScheduleTab.tsx` — **the cap PK is blocked by.** The `TIERS` map (`:10-14`: `starter {1,3}` · `standard {2,5}` · `premium {5,7}`) is a **hardcoded client-side constant**, not a DB rule. `lim = TIERS[tier] ?? TIERS['standard']` (`:82`); the component **blocks** adding/enabling a slot past `maxPerDay`/`maxPerWeek` at `:102`, `:110`, and the per-cell `blocked` guard `:296`. So the schedule cap is enforced **UI-only**.
- `invegent-dashboard/app/(dashboard)/clients/page.tsx` — **where `tier` comes from: it does not.** `ScheduleTab` is rendered with `tier="standard"` as a **literal constant** (`:603`, orchestrator-confirmed) — NOT a `c.client` column, plan/package table, or resolved value. **Consequence:** every client is pinned today to `standard` (2/day, 5/week), so premium's 7/week is *not* reachable via the UI at all. Host route (tab wiring `:342`; `buildUrl` `:240-245`; `needs<X>` gating `:287-296`; `Promise.all` `:298-340`; `schedule` `activeTab` block `:574-625`) — the override control extends this route additively (NO new route).
- `invegent-dashboard/actions/schedule.ts` — the save-path template. `savePublishSchedule` (`:42-75`) passes slots straight to the `save_publish_schedule` RPC and performs **no cap enforcement in the action**; the mandatory no-`JSON.stringify` jsonb-scalar quirk (`:48-52`) applies to any new server action. Whether `save_publish_schedule` enforces the cap *server-side* is NOT statically resolvable here → **db-rls-auditor handoff** (Open Question (iv)).
- `supabase/functions/publisher/index.ts` — proves the **schedule cap ≠ throughput**. The publisher reads `c.client_publish_profile.max_per_day` and throttles/defers real publishing when the day count reaches it (`:435-443`; profile type `:207`); studio-origin rows bypass, feed rows keep it byte-unchanged (`:420-454`). The T3 lever Deliverable B would edit.
- `supabase/migrations/20260523_fpub_jobid48_starvation_fix.sql` — `max_queued_per_platform` is a real per-platform queue-fill throttle (throughput/starvation lever), not a UI value.
- `docs/briefs/authoritative-weekly-schedule-editor-phase-1-brief-v1.md` — the **predecessor lane**. Precedent: worktree off **FETCHED origin** (never the stale/diverged local dashboard `main`), the two-repo stale-ref gate, no-new-routes, Convention-3 tiering, `dashboard-ia-lint` on the diff, the fail-VISIBLE service_role-only RPC template.
- `docs/00_action_list.md` — active holds: broad dashboard IA overhaul **DO NOT START** (`:182`); the diverged local dashboard `main` + orphaned `AddTemplateDraftWizard.tsx` commits are a **SEPARATE PK item** — do not touch (`:188`).
- **Project memory (asserted, verify at gate):** dashboard has authentication but **zero authorization** (`dashboard-authz-security-triage-20260722`) — a "super-user only" control is NOT role-gated today; LinkedIn's `max_per_day=2` is **by design** (`linkedin-queue-cadence-working-as-designed`).
- `CLAUDE.md` — Convention-3 tiering, PK deploy/merge/migrate HARD STOP, migration-identity + `--no-verify-jwt` gotchas, findings-contract requirement.

## Scope

**In scope:**
- **A1 (store, CE, T2 — additive DB):** a durable per-client schedule-cap override store (additive column or small table, default NULL → falls back to the hardcoded `TIERS` constant when unset). Additive migration + a `SECURITY DEFINER`, service_role-only, `search_path=''`, fail-VISIBLE read/write RPC, with a validated rollback, authored in an isolated worktree. Store shape = Open Question (ii).
- **A2 (control, dashboard, T2 — UI):** a super-user surface **inside** the existing `/clients` schedule tab (or an additive tab on that route — **no new route**) to set a client's cap override, saved via a new server action → the A1 RPC.
- **A3 (read, dashboard, T2 — UI):** `ScheduleTab` reads the per-client override and uses it in place of / on top of `TIERS[tier]` (`:82,:102,:110,:296`), so slots beyond the tier default become schedulable for that client only; unaffected clients keep the tier default.

**In scope only as a SEPARATE, explicitly-elected deliverable:**
- **B (T3 — publish-cadence editability):** a control + store to edit `c.client_publish_profile.max_per_day` (and, if elected, `max_queued_per_platform`). Built ONLY on explicit PK election at Gate 1 (Open Question (i)); full T3 chain + live publish-throughput proof.

**Out of scope:** the role/permission register (separate flagged lane); any Phase-2 format-authority work; changing the `TIERS` map values globally; new routes / IA overhaul (`00_action_list.md:182`); the diverged local dashboard `main` / orphaned wizard (`:188`).

## Allowed actions
- Read both repos, the live catalogue (read-only via `db-rls-auditor` / `ice_ro` R0), and registers as evidence.
- **A1:** author the additive migration + RPC in an isolated worktree; exact applied SQL, validated rollback, post-apply privilege proof (anon/authenticated denied 42501, service_role OK) BEFORE any gate.
- **A2/A3:** implement in an isolated dashboard worktree off **FETCHED `origin`**; run `tsc`/`next build`/tests + `dashboard-ia-lint`; produce the diff.
- Run the tier-appropriate review chain before each gate (db-rls-auditor for DB; apply-harness-auditor shadow on any apply packet; branch-warden two-repo stale-ref gate first; `ask_chatgpt_review` pinned to hash; deploy-verifier after any deploy). Prepare exact commands + STOP at every irreversible gate.

## Forbidden actions
- **No deploy/apply/migrate/merge/push without the explicit PK gate** (HARD STOP). Local commit only on PK instruction; push only on explicit PK instruction.
- **Do NOT build the role/permission register** (separate lane). State plainly that until roles exist, the dashboard has auth but ZERO authz, so any "super-user" cap control is reachable by ANY authed operator — a stated dependency/risk, not a blocker for A.
- **Do NOT edit `max_per_day` / `max_queued_per_platform` (Deliverable B) unless PK explicitly elects it at Gate 1** — production publish-cadence values; LinkedIn's 2/day is by design; changing them = real publishing change = T3 + live throughput proof.
- **No broad dashboard IA overhaul; no new routes.** A2 is additive to `/clients` only.
- **Do NOT touch the diverged local dashboard `main` / orphaned `AddTemplateDraftWizard.tsx`** — build off FETCHED `origin`; two-repo stale-ref gate first.
- **Do NOT change the shared `TIERS` map values** — the override is per-client; global defaults stay.
- **No `supabase functions deploy` without `--no-verify-jwt`**; mind CRLF / `?client=` conventions on dashboard edits.

## Success criteria
1. **Override persists (A1).** After the RPC runs for one client, the store holds the chosen cap on exactly that client and nothing else; a read returns it; NULL = fall back to the tier constant. (db-rls-auditor SELECT.)
2. **Higher cap unblocks scheduling for one client (A3).** With an override above the tier default, `ScheduleTab` lets an operator enable/add slots up to the new cap (the `:102`/`:110`/`:296` blocks respect the override). (UI + PK visual.)
3. **Other clients unaffected (A3).** A client with no override still blocks at the hardcoded tier default. (UI on a second client.)
4. **No route added / IA lint clean (A2).** `dashboard-ia-lint` passes; route count unchanged.
5. **Authz reality recorded (A2/A3).** The result doc states the control is NOT role-gated today (auth-but-no-authz) and names the role-register dependency.
6. **Rollback proven before apply (A1).**
7. **(Deliverable B ONLY, if elected) Real throughput moves.** A live publish-throughput check shows a raised `max_per_day` produces more real posts for one client/platform in a window, LinkedIn by-design caveat recorded. (LIVE publish proof.)

## Stop condition
Report per the result template once the elected deliverable's criteria are met, then stop. STOP + surface to PK on: any stale-ref/hash mismatch, non-clean auditor/external verdict, live pre-check failure, unexpected file in the change set, invalidated rollback, or any sign a cadence value (`max_per_day`) was about to ship without an explicit PK T3 election.

---

## Notes

**Tiering.** A1/A2/A3 = T2 (additive DB + dashboard UI; schedule cap is UI-only). B = T3 (edits a production publish-cadence value). Escalate to T3 the moment any deliverable writes a value the publisher/queue worker reads at runtime.

**Sequencing.** A1 first (A3 reads its store via A2's RPC); A2/A3 meaningful only once A1 is live. Each its own gate.

**Open questions (PK decisions / handoffs):**
- **(i) [PK DECISION — prominent]** Does this lane ALSO expose the real throughput levers (`max_per_day`/`max_queued_per_platform`)? Schedule cap alone does NOT increase output (`max_per_day=2` caps ~14/week/platform). Recommend A (T2, safe) and B (T3) as SEPARATE decisions; build B only on explicit PK election.
- **(ii)** Where does the override live (new `c.client` column, jsonb, or dedicated `c.client_schedule_cap_override` table)? Greenfield (no existing per-client tier source). Lean: dedicated additive table/column, default NULL.
- **(iii) [PK DECISION]** Per-day AND per-week caps (mirroring `TIERS`), or a single weekly number? Block logic checks both; a partial override must define both or inherit the unset half.
- **(iv)** Does `save_publish_schedule` enforce the cap server-side? → **db-rls-auditor** (`pg_get_functiondef`). If yes, A must move that server ceiling too.
- **(v) [PK DECISION — verified correction]** `tier` is hardcoded `"standard"` (`page.tsx:603`), so premium/7-week is unreachable today. Does A add an override on top of the fixed `standard` base, or also make the base tier per-client selectable? Draft assumes the former unless PK says otherwise.

**Live-truth handoffs (before the respective gate):** `db-rls-auditor` (save_publish_schedule server-side enforcement; live `client_publish_profile` cap columns/values; per-client cap-store absence) · `branch-warden` (two-repo stale-ref gate; dashboard local-main divergence) · `security-auditor` advisory (auth-but-no-authz posture of any "super-user" control — this lane does NOT fix it).
