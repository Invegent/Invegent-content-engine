# Brief — M11b Seed A: NDIS Carousel Formal Governance-Layer Closure Record

**Created:** 2026-08-05 Sydney
**Author:** chat (drafted by `brief-author`)
**Executor:** Claude Code (orchestrator-directed)
**Status:** draft — awaiting PK Gate 1
**Result file:** `docs/briefs/results/m11b-seed-a-ndis-carousel-governance-closure-result-v1.md` (created on completion)

**Lane classification (CCF-02):** **T2 · PRODUCT_PROOF** — an additive single-row DML insert into `c.client_creative_governance` (DML ⇒ ≥T2 per Convention 3, `CLAUDE.md` §"Workflow acceleration conventions"), seeded as its own higher-tier apply by the parent T1 scoping packet (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md:9-10`, "the packet itself is T1... every closure lane it seeds is its own separate, higher-tier (T2) PK-gated apply"). **This brief itself authorizes design/preparation only — no DML executes under this Gate 1.**

---

## Task

Prepare (but do not apply) the governance-layer closure record for NDIS Yarns' carousel legacy route, per Seed Packet A of the M11b fleet-carousel closure scoping packet (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md` §4.1). NDIS's carousel route was already closed at the **config layer** (`c.client_format_config.is_enabled` flipped `true→false` 2026-08-04T10:20 UTC, part of the `post-cgu-v1-optimum-schedule-expansion` v11 apply — `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md:137,220-221`), but NDIS carousel has **never had a `c.client_creative_governance` row of any kind** — unlike Property Pulse's own declared-legacy carousel row from D2 (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md:138`). This is a genuinely open PK decision, not a defect to silently resolve: **Option (a)** add one additive `c.client_creative_governance` row for NDIS documenting the closure (mirroring PP's D2 shape but with `enabled=false`, since the route is being retired, not declared-legacy-live); **Option (b)** an explicit PK ruling that the existing config-layer closure is sufficient on its own and no governance row is needed (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md:141,204-206`). This brief's task is to produce the drafted migration+rollback text for Option (a), assemble the fresh live pre-check evidence both options need, name the tmr-drift-probe interaction precisely, and present the (a)/(b) choice to PK explicitly — **not** to pick between them, and **not** to execute either.

## Source context

- `docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md` §2.2 (NDIS disposition), §4.1 (Seed Packet A's own affected-surfaces/proof-requirements/rollback/PK-gates/no-volume-increase-guard spec), §7 (open policy question + drift-probe trip claim) — the packet this brief realises as its Gate-1.
- `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` Finding 1 (lines 104-125: carousel is real, high-volume, ungoverned production for 3 of 4 clients, not PP-only) and §12 addendum (lines 198-225: NDIS classified `live_legacy_route` as of 2026-08-04, config row `61e4f143-f0cf-4a9b-853c-f592daf82aaf` for `client_id fb98a472-ae4d-432d-8738-2273231c1ef4`; the schedule-expansion packet's own carousel-protection assertion originally checked the wrong client's config row, corrected in packet v5).
- `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md` — the only precedent governance-row closure in the fleet (PP, `enabled=true`, declared-legacy-live) and its own disclosed `tmr-drift-probe` side effect + the PK decision (Option C: accept) already made for that case.
- `supabase/migrations/20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql` — the exact row shape/columns and apply-then-assert-rowcount / paired-rollback-file pattern to mirror for NDIS (id, client_id, format, contract_ref, declarative_registry_ref, render_label, enabled).
- `supabase/functions/tmr-drift-probe/index.ts` — `fetchGovernedClients()` (lines 246-255) reads `c.client_creative_governance` `.eq("enabled", true)` — **filtered on `enabled=true` only**; `fetchDeclarativeRegistry()` (lines 414-420) throws `declarative_registry_ref_missing` when a row it reads has a null `declarative_registry_ref`; `runClientCheck()` (lines 591-611) fences that per-client, but every per-client `declarative_error` still becomes its own error outcome fed into `computeVerdict()` (`supabase/functions/tmr-drift-probe/compare.ts:510-516`), which flips the **entire daily run's** status `ok→error` if *any* outcome carries an error. Confirmed live cron: `supabase/migrations/20260706024858_create_tmr_drift_probe_run_v1.sql:10` (`tmr-drift-probe-daily`, `35 17 * * *` per the D2 result doc).
- `docs/00_sync_state.md:9-12` / `docs/00_action_list.md:8` — the live v6.140 PK control-tower watch ruling (Phase-2 HELD to ~2026-08-11 20:20 Sydney).
- `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md` — full ruling text + operational reading; §2 item 4 (lines 64-67) explicitly names "M11b Gate-1 briefs" as remaining at PK's discretion, and states the ruling does **not** newly authorize them — this brief's Gate 1 is exactly that category.
- `docs/00_action_list.md:36` — the standing, unapplied carry: `tmr-drift-probe` should be patched (Option B) to skip governance rows with an unresolvable `declarative_registry_ref` instead of failing its whole daily run; not yet built.

## Scope

**In scope:**
- Drafting the exact, NOT-YET-APPLIED migration text for Option (a) — one additive `INSERT` into `c.client_creative_governance` for NDIS Yarns (`client_id fb98a472-ae4d-432d-8738-2273231c1ef4`), `format='carousel'`, a `contract_ref` naming this a closure/retirement record (e.g. modelled on PP's `property_pulse.carousel.legacy_pipeline` shape — exact string is this brief's own output, not invented here), `declarative_registry_ref=NULL` (honest — no Creative Library entry exists for this legacy pipeline, same reasoning as D2), `render_label` naming the same worker-embedded pipeline PP's row names, **`enabled=false`** (per the scoping packet's own §4.1 proof-requirement text, which asserts the post-apply row must read `enabled=false` — this is a closure/retirement record, not a declared-legacy-live one).
- Drafting the paired rollback text (`DELETE` the one inserted row by its deterministic id — matches apply/rollback identity per the scoping packet's own §4.1 reasoning).
- Assembling the **fresh, session-specific** live pre-check evidence named in §4.1's proof requirements (see Allowed actions) — not reusing this scoping session's 2026-08-04/08-05 figures as current fact.
- Running/queuing the T2 review chain on the drafted (unapplied) artifact: `db-rls-auditor` fresh read, `branch-warden` safe check, `apply-harness-auditor` shadow-mode static pass.
- Explicitly assessing and stating the tmr-drift-probe impact of the **specific** `enabled` value chosen (see Notes — this is a required, non-optional analysis step, not a formality).
- Presenting Option (a) vs Option (b) to PK as an explicit, unresolved decision.

**Out of scope:**
- Any DML/DDL **apply** of any kind — no `INSERT`, no `UPDATE` to `c.client_format_config`, no `DELETE`. Executing the drafted migration requires its own, separate, explicit PK apply gate (see Forbidden actions).
- Seed Packet B (CFW + Invegent fence-hardening/retirement) and Seed Packet C (PP migrate-vs-retire feasibility) — separate lanes, not this brief's task.
- Any code change to `tmr-drift-probe` (the Option-B patch named in `docs/00_action_list.md:36`) — a separate, unscoped future T2 code lane.
- Any CGU Final Phase-2 schedule-expansion work (matrix revision, cap raises, schedule DML) — unrelated programme thread, currently held (see Forbidden actions).

## Allowed actions

- Read the current, live state via `db-rls-auditor` (read-only) to confirm, **as of execution time, not as of this drafting session**: NDIS's `c.client_format_config` carousel row (`61e4f143-f0cf-4a9b-853c-f592daf82aaf`) is still `is_enabled=false`; the NDIS carousel `format_override` schedule rows flipped in the same v11 apply remain `enabled=false`; carousel draft/render occurrence count for NDIS since 2026-08-04T10:20 UTC (expected: 0 — the scoping packet's own §7/§2.2 flags this as *not independently re-verified* by that session, so this brief's execution must be the first to actually check it); PP's D2 row's current `declarative_registry_ref` value (expected still `NULL`, confirming the trip mechanism's live precondition is unchanged); `tmr-drift-probe`'s current daily-run status (expected `error`, per the standing 2026-08-02 carry) — record the actual observed value, do not assume it.
- Draft the migration SQL + paired rollback SQL text described in Scope, following the D2 migration's own pattern (fail-loud row-count assertion, `ON CONFLICT DO NOTHING` + `RAISE EXCEPTION` if not exactly 1 row, deterministic id, paired rollback file) — as **files prepared for review, not applied**.
- Explicitly compute and state whether the drafted row's `enabled=false` value means `fetchGovernedClients()`'s `.eq("enabled", true)` filter (`tmr-drift-probe/index.ts:255`) will or will not read it, and therefore whether this specific closure record is expected to reproduce PP's D2 trip (`declarative_registry_ref_missing`) or not.
- Run `branch-warden` and `apply-harness-auditor` (shadow mode — its PASS clears no gate, per `CLAUDE.md`) against the drafted, unapplied migration.
- Draft the CAS no-volume-increase guard text (pre/post carousel-occurrence-count assertion for NDIS, hard abort on nonzero delta) as specified in the scoping packet §4.1/§3.
- Draft the result-document skeleton and the PK decision card presenting Option (a) vs Option (b).
- Read any additional repo/register evidence needed to complete the above.

## Forbidden actions

- **No DML/DDL apply of any kind** — no `INSERT`/`UPDATE`/`DELETE` against any production table. Executing the drafted migration (if Option (a) is chosen) requires its own fresh, explicit PK apply gate, run through the full T2 chain, independent of this Gate 1.
- **No schedule DML, no cap raises, no new heavy CGU Final implementation lane** — the live v6.140 PK control-tower ruling holds CGU Final Phase-2 to watch close (~2026-08-11 20:20 Sydney) and orders "no new heavy CGU Final implementation lanes before the Phase-2 ruling" (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md:33-36`, `docs/00_sync_state.md:9-12`). This brief's own governance-record closure is not itself schedule DML or a cap raise, and the ruling names "M11b Gate-1 briefs" as remaining at PK's discretion rather than blanket-forbidden (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md:64-67`) — but the ruling does **not** newly authorize this lane's *apply* step either. Treat the apply step as its own, separately PK-gated decision that must name explicitly whether it proceeds now or waits for watch close (see Open questions) — never assume either answer.
- **No starting Seed Packet B or Seed Packet C** under this brief.
- **No patching `tmr-drift-probe`'s code** (the Option-B fix) under this brief — separate, unscoped lane.
- **No treating this scoping session's (2026-08-04/2026-08-05) live-state figures as current** — every fact this brief's execution reports as "current" must come from a pre-check run at execution time, named as such.
- **No silently choosing Option (a) over Option (b)** (or vice versa) — present both, decide neither.
- **No committing or pushing** any drafted artifact without explicit PK instruction (per the docs-only register lane discipline, `CLAUDE.md` "The docs-only register lane").

## Success criteria

- Drafted (unapplied) migration text exists for Option (a), matching the D2 pattern (deterministic id, `ON CONFLICT DO NOTHING` + row-count assertion, `client_id`/`format`/`contract_ref`/`declarative_registry_ref=NULL`/`render_label`/`enabled=false` all named and justified), plus its paired rollback file (single `DELETE` by id).
- The `enabled=false` value's tmr-drift-probe impact is explicitly computed and stated (will `fetchGovernedClients()` read this row or not, and therefore will the `declarative_registry_ref_missing` trip recur) — not left as an assumed "same as D2" claim.
- Fresh, execution-time live pre-check results are recorded for: NDIS `client_format_config` state, NDIS carousel occurrence count since 2026-08-04T10:20 UTC, PP D2 row's current `declarative_registry_ref`, `tmr-drift-probe`'s current daily-run status.
- `db-rls-auditor` fresh pass, `branch-warden` safe result, and `apply-harness-auditor` shadow-mode result are all recorded (verdicts named, not summarised away).
- The Option (a)/(b) decision card is presented to PK explicitly, with the trade-offs from the scoping packet (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md:141`) restated, not re-litigated from scratch.
- Zero DB/schedule/config mutation occurs as a result of this brief's execution.

## Stop condition

Once the drafted artifact, the fresh live pre-check evidence, the T2 review-chain results, and the Option (a)/(b) decision card are assembled, report to PK per the result-doc template and **stop**. Do not proceed to any DML apply gate without a fresh, separate, explicit PK instruction naming the exact hash of the frozen migration and confirming whether it proceeds now or after the Phase-2 watch closes.

---

## Notes

**Correction to the scoping packet's own §7 claim, found this session:** `docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md:332-334` states "Any new `client_creative_governance` row for carousel will trip `tmr-drift-probe`'s known `declarative_registry_ref_missing` failure mode ... unless the still-open Option-B patch lands first" — stated as a blanket claim. A direct re-read of `tmr-drift-probe/index.ts:246-255` this session shows `fetchGovernedClients()` filters strictly `.eq("enabled", true)` — an `enabled=false` row (which is what Seed Packet A's own §4.1 proof-requirement text specifies for NDIS's post-apply state) would **not** be read by that function and should **not** reproduce the trip, unlike PP's D2 row (`enabled=true`). This is presented as a finding for the executor to verify and state explicitly at execution time (Success criteria above), not asserted here as settled fact — this brief did not run the probe or query live governance rows, and a second, unfiltered read site could in principle exist elsewhere in the codebase that this repo-wide grep (single match, `tmr-drift-probe/index.ts:251`) did not surface as live.

**On the watch-ruling ambiguity:** the v6.140 ruling text distinguishes "CGU Final Phase-2" (schedule-expansion matrix/cap work, explicitly held) from "M11b Gate-1 briefs" (explicitly named as remaining at PK's discretion, not newly authorized). This brief takes the conservative reading — draft/prep now, apply only on a fresh explicit PK gate — but does not itself resolve whether PK wants that apply gate considered before or only after 2026-08-11 20:20 Sydney. Name that explicitly at the apply-gate ask.

---

## Open questions (PK decisions needed)

1. **Governance row or not.** Does PK want a `c.client_creative_governance` row for NDIS at all (Option a), or does the already-applied config-layer closure suffice on its own (Option b)? This is the single governing decision for the whole lane, left unresolved by the scoping packet itself. — *PK decision needed.*
2. **`declarative_registry_ref` handling.** If Option (a) is chosen, does the closure row need `declarative_registry_ref` populated (requiring a real Creative Library entry to exist first) or is `NULL` acceptable per the D2 precedent's honesty reasoning? — *PK decision needed.*
3. **Drift-probe re-verification.** Given `enabled=false` appears NOT to trip `fetchGovernedClients()`'s filter (per this session's code re-read), does PK want the "no re-trip" conclusion independently re-verified via a real live daily run before treating it as settled, or is the static code reading sufficient? — *PK decision needed.*
4. **Apply-gate timing.** Should the eventual apply gate (if PK authorizes Option a) be considered before the CGU Final Phase-2 watch closes (2026-08-11 20:20 Sydney), or held until after? — *PK decision needed.*

## Evidence gaps (named, not invented)

- No DB tool was available to this drafting session — current (2026-08-05) live state of NDIS's `client_format_config` row, carousel occurrence count since 2026-08-04T10:20 UTC, PP D2's current `declarative_registry_ref` value, and `tmr-drift-probe`'s current daily-run status were NOT independently re-verified; handoff to `db-rls-auditor` at execution time.
- Whether `tmr-drift-probe/index.ts:251` is the only read site of `c.client_creative_governance` with no `enabled` filter anywhere in the repo was not exhaustively audited (43-file grep match, only the probe function itself was fully read) — handoff to `register-reconciler` if this needs closing before relying on the "no re-trip" conclusion.
