# Brief cc-NNNN — authoritative-weekly-schedule-editor-phase-1

**Created:** 2026-07-27 Sydney
**Author:** chat (brief-author)
**Executor:** Claude Code (orchestrated) + PK at every gate
**Status:** draft
**Result file:** `docs/briefs/results/cc-NNNN-authoritative-weekly-schedule-editor-phase-1.md` (created on completion)

> Registrar assigns the final `cc-NNNN` + register version via the claim-stub protocol; this draft never self-numbers.

---

## Gate-1 decisions (PK, 2026-07-27 — APPROVED with corrections)

1. **Override surface:** EXTEND the existing `public.get_week_format_allocation` contract additively (fresh migration identity + fresh review of the wrapper). Do NOT create a competing companion read path.
2. **Materialisation (1c):** override the format token only — `format_preference := ARRAY[effective_format]`.
3. **Migration identity:** a fresh migration identity for each DB change, reconciled against the applied ledger.
4. **Tier:** **1c is T3** and REQUIRES a live materialisation proof.
5. **Sunday:** INCLUDE Sunday in Phase 1. The isodow/dow convention discrepancy is a **Phase-1 PRECONDITION to resolve**, not a deferral — do not ship an incomplete (Mon–Sat-only) weekly editor.

**Revised proof (PK):** all seven days work · suggested-vs-overridden format visible · invalid platform/format combos rejected · reseeding preserves overrides · the materialised slot carries the effective format.

**Final gate:** return with the completed review chain + exact apply/deploy package BEFORE any production change.

---

## Task

Deliver **Phase 1** of the Authoritative Weekly Schedule Editor end-to-end across three sub-lanes so an operator can set a weekly format per publish slot, have that choice persist durably, and see the *effective* format reach the materialised pipeline slot. **1a** adds a durable per-slot format override to the schedule model (CE repo) with a fail-closed validating save RPC and a read path that surfaces stored-override alongside the computed allocation. **1b** adds a NEW tab inside the existing `/clients` dashboard route (separate repo) presenting a per-slot platform+format grid, seeded from the allocation, that enforces validity, shows suggested-vs-override, preserves operator overrides on reseed, and saves via the new RPC. **1c** edits the live nightly `m.materialise_slots` function (CE repo) to read the stored override and stamp it into `m.slot.format_preference`, falling back to the current allocation when no override is set. Phase 1 is **authoritative schedule *planning* + durable slot *intent*** — it is explicitly NOT authoritative downstream production behaviour; the Advisor may still replace the format downstream until each Phase 2 governed-authority slice is separately enabled and proven.

## Source context

- `docs/briefs/cc-0079-schedule-format-authority-architecture-gate1-v1.md` — the governing architecture. **§1.1 (`:44-48`)**: `c.client_publish_schedule` IS the entire schedule model, six columns `schedule_id · client_id · platform · day_of_week · publish_time · enabled`. **§1.2 (`:57`) / §1.4**: format is NOT on the schedule today — it is stamped at materialise time from the legacy profile or the mix engine, and "cannot live" on the nightly-regenerated slot; this is the rationale for a durable override column on the schedule row. **§1.4 (`:93`)**: exactly one client (`property-pulse`) is format-mix enrolled; the other three run the legacy path — so the override must work for BOTH paths. **§2.1 (`:119-128`) / §2.2**: `m.post_draft.recommended_format` (the Advisor's output) drives every renderer/publisher; the Advisor's downstream authority is the Phase-2 problem and is OUT of scope here.
- `supabase/migrations/20260725120000_durable_platform_support_guard_grid_and_materialiser.sql` — the repo copy of `m.materialise_slots`. The loop over `c.client_publish_schedule` (`:197-201`), the per-slot format computation (`:205-219`, `:288-307`), and the `INSERT INTO m.slot (… format_preference …)` write (`:309-311`) are the **1c edit site**. NOTE: this migration is the **S7 durable-guard packet, which is FROZEN-PENDING (not confirmed live) — see `docs/00_sync_state.md` v6.28 (`:29`)**; 1c MUST be authored against the LIVE function body via `pg_get_functiondef` (db-rls-auditor handoff), never the repo file header (the file-header-vs-catalogue trap, cc-0079 §9.3 `:369`).
- `supabase/migrations/20260725004336_slice_a_get_week_format_allocation_readonly_wrapper.sql` — the APPLIED read wrapper `public.get_week_format_allocation(uuid,date)`. Its jsonb contract (`:194-201`) and per-slot `entries[]` (`ordinal · schedule_id · day_of_week · publish_time · assigned_format · allocation_source · is_valid · invalid_reason_code`, `:170-188`) are the **1b seed source**. Its grant pattern — `SECURITY DEFINER`, `SET search_path TO ''`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE … TO service_role`, `OWNER TO postgres` (`:205-211`) — is the **1a save-RPC template**.
- `docs/briefs/artifacts/slice-a-get-week-format-allocation.sql` — the 13-control authoring checklist + the fail-VISIBLE §13 discipline (no catch-all; errors propagate) the 1a RPC and read path must mirror.
- `invegent-dashboard/app/(dashboard)/clients/page.tsx` — the 1b host route. Tab wiring: `TABS` array (`:342`), `buildUrl` writing `client=`/`tab=` (`:240-245`), `searchParams.client`/`tab` (`:275-279`), `needs<X>` gating flags (`:287-296`), `Promise.all` data fetch (`:298-340`), and the existing `schedule` `activeTab` block with its read-only sub-sections (`:574-625`).
- `invegent-dashboard/actions/schedule.ts` — the 1b server-action template (`get_publish_schedule`/`save_publish_schedule` via a service client, `:18-75`) and the **mandatory no-`JSON.stringify` jsonb-scalar quirk** (`:48-52`): pass `p_*` as a plain JS array/object; pre-stringifying causes a 22023 scalar error inside the RPC.
- `invegent-dashboard/components/clients/ScheduleTab.tsx` — the **"slot" naming-overload** source (`type Slot` = a cadence time-row, `:16`) and the `DAY_ORDER` Sunday-as-0 convention (`:7`); editor/tier precedent (`:75-145`).
- `invegent-dashboard/docs/dashboard/operator-journey-ia-v1.md` — the seven-beat spine incl. QUEUE/SCHEDULE (`:379`) and the **no-new-routes rule** (`:845`, `:409`, `:74`).
- `docs/briefs/results/global-client-picker-slice3-promotion-result-v1.md` — per-route `?client=` slug scoping is live production; 1b is scoped this way.
- `CLAUDE.md` — Convention-3 tiering (T2/T3), the PK deploy/merge/migrate HARD STOP, `migration name = permanent identity` + the `--no-verify-jwt` gotcha, the findings-contract requirement, and `dashboard-ia-lint` (read-only candidate) to run on the 1b diff before the gate.

## Scope

**In scope (Phase 1 only):**
- **1a (CE, T2 — additive DB):** add a nullable `format_override text` column to `c.client_publish_schedule` (cc-0079 §1.4 rationale: format cannot durably live on the nightly-regenerated `m.slot.format_preference`); author a `save_week_format_override` RPC (naming per §Naming below) — `SECURITY DEFINER`, service_role-only, `search_path=''`, fail-VISIBLE — that (i) is client-scoped, (ii) writes `format_override` onto named `schedule_id` rows, and (iii) **rejects any (platform, format) not supported by `t."5.3_content_format".platform_support`** using the three-state semantics of cc-0079 §6.1 (`:237-243`): key present+`true` = supported; key present+`false` = unsupported; key ABSENT = unsupported (fail-closed via `COALESCE(...,false)`, mirroring the live materialiser guard at migration `:294-300`). Surface stored-override alongside the computed allocation for the editor (see Open Question i — extend `public.get_week_format_allocation` vs a companion read; the executor decides on evidence and records the decision).
- **1b (dashboard, T2 — UI):** ONE new tab inside `/clients` (add to `TABS` `:342`, a `needs<X>` flag `:287-296`, a `Promise.all` fetch `:298-340`, and an `activeTab` render block, matching the existing `schedule` block `:574-625`). Grid of every schedule row (platform × day × time) carrying a platform+format, seeded from `get_week_format_allocation.entries[].assigned_format`, showing suggested-vs-override state, enforcing that every row is a valid platform+format, preserving operator overrides across a reseed, saving via the new server action → the 1a RPC. Client-scoped by `?client=` slug.
- **1c (CE, T2→T3 — production nightly function):** edit the LIVE `m.materialise_slots` to read `c.client_publish_schedule.format_override` for the current rule row and, when present, use it as the stamped `m.slot.format_preference`; when NULL, fall back to today's allocation (existing behaviour unchanged). This is the step that puts the editor on the production spine.

**Out of scope (do NOT build, propose, or imply):**
- **All Phase 2 governed-authority work.** No change to the Advisor, `ai-worker`, `m.post_draft.recommended_format`, the resolver (`m.resolve_final_format` shadow), renderers, publishers, or any downstream format authority (cc-0079 §2.1/2.2). Phase 1 stops at durable intent reaching `m.slot.format_preference`; the Advisor may still override downstream — that is the accepted Phase-1 boundary, not a defect to fix here.
- Any change to the format-mix allocator, `t.platform_format_mix_default`, enrolment, or the Slice-2 data corrections (already applied, sync_state v6.25).
- (PK correction) Sunday is now IN scope; the isodow/dow convention is a Phase-1 precondition (resolve to one authoritative convention across seed source + writer). Still OUT of scope: any unrelated `day_of_week` data repair beyond making the seed↔writer conventions consistent for all seven days.
- New dashboard routes, nav sections, or any broad IA overhaul (`docs/00_action_list.md:182`).
- Any second-brand/multi-client behaviour beyond passing the existing `?client=` slug through.

## Allowed actions

- Read both repos, the live catalogue (read-only, via `db-rls-auditor` / `ice_ro` R0 views), and the registers as evidence.
- **1a:** author the additive migration + RPC in an isolated worktree; author the exact applied SQL, rollback (a single `ALTER TABLE … DROP COLUMN format_override` + `DROP FUNCTION`), and the post-apply §P1-style privilege proof (anon/authenticated denied 42501, service_role OK) BEFORE any gate.
- **1b:** implement the tab + server action in an isolated dashboard worktree off FETCHED `origin` (never the stale local main); run `tsc` / `next build` / the existing test suite and `dashboard-ia-lint` locally; produce the diff for review.
- **1c:** author the `CREATE OR REPLACE FUNCTION m.materialise_slots(...)` diff against the **live** body (captured via `pg_get_functiondef`), preserving the existing Sunday `EXTRACT(dow)` fix and every current guard; author a byte-pinned rollback to the captured pre-image.
- Run the mandated review chain per tier before each gate: scope-relevant auditors (`db-rls-auditor` for every DB touch; `apply-harness-auditor` shadow on any apply packet), `branch-warden`, `ask_chatgpt_review` pinned to the exact packet/diff hash, `deploy-verifier` after any deploy.
- Prepare exact deploy/apply/migrate/push commands and preconditions for PK; STOP and present at every irreversible gate.

## Forbidden actions

- **No deploy, apply, migrate, merge, or push without the explicit PK gate.** Deploy/merge/migrate is a HARD STOP (`CLAUDE.md` PK gates). Local commit only on PK instruction; push only on explicit PK instruction.
- **No Phase-2 / Advisor-authority work.** Do not touch `ai-worker`, `recommended_format`, the resolver, renderers, or publishers. Phase 1 must NOT claim or create authoritative downstream production behaviour (cc-0079 §2.1/2.2).
- **No new dashboard routes or nav sections; no broad dashboard IA overhaul** (`operator-journey-ia-v1.md:845`; `docs/00_action_list.md:182`). The deliverable is exactly ONE additive tab in `/clients`.
- **Do not touch the diverged local dashboard `main` or the orphaned `AddTemplateDraftWizard.tsx` commits** — a SEPARATE PK item (`docs/00_action_list.md:188`). Work from FETCHED `origin` only; run the two-repo stale-ref gate first (cc-0079 §0 `:15-23` documents this exact failure).
- **No ambiguous reuse of "slot".** "Slot" already means (a) a cadence time-row in `ScheduleTab`/`save_publish_schedule` (`ScheduleTab.tsx:16`) and (b) the CE pipeline object `m.slot`. The editor and RPC must use an unambiguous term (e.g. "weekly format plan" / `format_override`) and never conflate the two.
- **No non-fail-closed validation.** An unsupported or unknown (platform, format) — including a `platform_support` key that is `false` OR absent — must be REJECTED, never silently accepted or coerced. No catch-all exception handler that turns an allocator/validation error into an empty success (fail-VISIBLE, per the wrapper §13 discipline).
- **Do not author 1c against the repo migration file header.** The S7 durable-guard migration is FROZEN-PENDING and may not be the live body (`sync_state` v6.28 `:29`); trusting the file over the catalogue is the standing failure mode (cc-0079 §9.3 `:369`).
- **Do not expose or re-derive the format-mix allocator, grant schema `t` USAGE, or widen access** beyond the single service_role EXECUTE the wrapper pattern already establishes (artifact scope-of-exception).
- (PK correction) Sunday IS surfaced; but the isodow/dow seed↔writer convention MUST be reconciled first (Phase-1 precondition) — do not ship the editor with a Sunday row that seeds under one convention and materialises under another.
- **No `supabase functions deploy` without `--no-verify-jwt`** on any EF path touched (none expected in Phase 1; enforce if it arises).

## Success criteria

Maps 1:1 to PK's proof — every check is verifiable on observed output, never on a plan.

1. **Durable override persists (1a).** After the save RPC runs for a client, `c.client_publish_schedule.format_override` holds the chosen format on the exact named `schedule_id` rows and NOTHING ELSE; a subsequent read returns it. (Verify: db-rls-auditor SELECT.)
2. **Unsupported combos rejected fail-closed (1a).** The save RPC REJECTS every (platform, format) whose `t."5.3_content_format".platform_support` is `false` OR key-absent (e.g. `carousel`/linkedin, `text`/youtube per cc-0079 §6.2), with a named error and zero write; accepts only supported pairs. (Verify: adversarial RPC calls.)
3. **Reseed cannot erase operator choice (1b).** Re-fetching/reseeding the grid from `get_week_format_allocation` preserves any set override (override state wins over the suggested `assigned_format`); the operator's choice survives a reseed. (Verify: UI + state trace.)
4. **Suggested-vs-override visible (1a/1b).** The read path surfaces BOTH the computed allocation (`assigned_format`, `allocation_source`) and the stored override, and the grid renders the distinction. (Verify: payload + PK visual.)
5. **Effective format reaches the pipeline slot (1c).** For a schedule row carrying `format_override`, a materialise run stamps that override into `m.slot.format_preference`; a row with NULL override still receives today's allocation unchanged (no regression). (Verify: LIVE materialise proof — see Open Question iv / P-CONVERGENCE below.)
6. **End-to-end chain proven (all).** Stored override → effective weekly allocation surfaced → `m.slot.format_preference`, demonstrated on at least one real slot per path (one enrolled client `property-pulse` and one legacy client), with the Advisor-may-still-override boundary explicitly recorded (Phase-1 scope statement, not a failure).
7. **No route added / IA lint clean (1b).** `dashboard-ia-lint` passes on the 1b diff; the route count is unchanged; the new surface is one tab.
8. **Naming unambiguous.** No new use of bare "slot" for the format-plan concept in code, RPC params, or UI copy.
9. **Rollbacks proven before apply (1a/1c).** Each DB change carries a validated rollback (1a: DROP COLUMN + DROP FUNCTION; 1c: byte-pinned CREATE OR REPLACE to the captured live pre-image) proven before the PK apply gate.

## Stop condition

Report per the result template once all criteria are met, then stop. STOP and surface to PK immediately on: any stale-ref/hash mismatch, any non-clean auditor/external-review verdict, a live pre-check failure, an unexpected file in the change set, an invalidated rollback, or any evidence that the live `m.materialise_slots` body diverges from what 1c was authored against.

---

## Notes (optional)

**Tiering (Convention 3).** 1a = **T2** (additive DB, isolated code): scope-relevant auditors + branch-warden + hermetic checks + external review pinned to hash + rollback validated before apply. 1b = **T2** (dashboard UI, read-only-to-DB via the new RPC + the applied wrapper): `dashboard-ia-lint` + branch-warden + build/tests + external review. **1c is the highest-risk sub-lane — T2→T3.** It rewrites a **production DB function on the nightly cron materialise path** that writes every scheduled slot for every client. **Escalation trigger to T3 (name it at Gate 1):** any of — the edit is not provably a pure additive branch on the existing per-rule loop; the change could alter `format_preference` for rows WITHOUT an override; the live body differs from the authored-against body; or the rollback is not a byte-exact CREATE OR REPLACE to the captured pre-image. On any trigger 1c runs the full T3 chain (db-rls-auditor + independent lead re-verification + explicit PK gate + named live pre-check STOPs + rollback proven before apply + a LIVE post-apply materialise proof).

**Sequencing.** 1a applies FIRST (1c reads its column; 1b reads via its RPC). 1c depends on 1a's column existing. 1b can be built in parallel but is only meaningful once 1a's RPC is live. Each sub-lane is its own gate; nothing applies before its PK gate.

**Enrolment reality (cc-0079 §1.4 `:93`).** Only `property-pulse` is format-mix enrolled; the other three clients run the legacy path. The override must take precedence over BOTH the allocator pick AND the legacy fallback in 1c, and the save RPC must not assume enrolment.

**Naming.** Use an unambiguous concept name for the format-plan (not bare "slot"): column `format_override`, RPC `save_week_format_override`, UI concept "weekly format plan". Final RPC name is confirmable at Gate 1.

**Open questions (PK decisions / handoffs — five; four PK-named, the fifth newly surfaced and repo-verified):**
- **(i)** surface the override by extending `public.get_week_format_allocation` vs adding a companion read — executor decides on evidence, records it; extending the applied wrapper earns a NEW migration identity + fresh review.
- **(ii)** the exact `m.materialise_slots` edit point and whether `format_override` overrides the whole allocation or only the format token — note `m.slot.format_preference` is itself a `text[]` of format tokens (migration `:309`), so an override most naturally sets `format_preference := ARRAY[override]`; confirm no other allocation-derived field must move with it.
- **(iii)** migration naming/identity discipline — a revision gets a NEW number + distinct name, never the same name with new SQL (`CLAUDE.md`).
- **(iv)** whether 1c requires `db-rls-auditor` + a LIVE materialise proof before it counts as done — this brief RECOMMENDS yes (it is a production nightly-path function; a plan cannot prove criterion 5).
- **(v)** **day-of-week convention discrepancy (load-bearing, repo-verified).** The APPLIED wrapper matches days on `EXTRACT(isodow)` and flags `day_of_week=0` as unmatchable (`20260725004336…:79`), while the live post-Sunday-repair `m.materialise_slots` matches on `EXTRACT(dow)` (`20260725120000…:245,:268`; repair applied per `sync_state` v6.28 `:24`). isodow and dow AGREE for Mon–Sat (1–6) and diverge ONLY for Sunday (isodow=7 vs dow=0) — so the impact is confined to Sunday, aligning with the existing Sunday hold. 1b seeds `entries[]` from the isodow wrapper while 1c writes overrides consumed by the dow materialiser; a Sunday row could be seedable/visible in one and honoured differently in the other. Reconcile the seed source and the writer to a single convention (or exclude Sunday in Phase 1) before criteria 5/6 can pass. Live-body confirmation is a `db-rls-auditor` handoff.

**Live-truth handoffs (resolve before the respective build/apply gate):**
- `db-rls-auditor` — confirm live: (1) `c.client_publish_schedule` columns (no `format_override` yet) + `save_week_format_override` absence; (2) `pg_get_functiondef` of live `m.materialise_slots` + `m.build_weekly_demand_grid` (is the S7 guard live? did the Sunday fix use `dow`?); (3) `public.get_week_format_allocation` live existence + contract + service_role EXECUTE.
- `branch-warden` — two-repo stale-ref gate: `fetch --prune` CE + invegent-dashboard; report HEAD/parity/ahead-behind; confirm the dashboard local-main divergence (SEPARATE PK item) so 1b is built off fetched origin.
- `register-reconciler` — check whether any post-v6.28 register entry already reconciles the isodow/dow convention, so Open Question v is not re-litigated against stale evidence.

**Verification note (orchestrator).** Must-fix #1 (isodow/dow) independently verified against both repo files (`…004336:79` isodow; `…120000:245,:268` dow, with the migration header documenting the `isodow→dow` Sunday repair). Divergence confirmed Sunday-only. This is `brief-author`'s first code+DB-lane brief → candidate-level scrutiny applied.
