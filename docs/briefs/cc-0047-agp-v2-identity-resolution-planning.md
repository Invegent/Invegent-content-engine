# Brief cc-0047 — AGP v2 identity-resolution planning lane (read-only)

**Created:** 2026-07-23 Sydney
**Author:** chat (brief-author)
**Executor:** Claude Code (read-only) + named handoffs (db-rls-auditor / branch-warden / ice-architecture-cartographer)
**Status:** issued (PK gate-1 approved 2026-07-23 — SAFETY_GATE · T1 · one-named-slice)
**Result file:** `docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md` (created on completion)

---

## Task

Open ONE read-only planning lane that produces the AGP v2 planning artifact and nothing else. AGP v2 reframes the old "deterministic avatar selection" work as ICE's governed **identity-resolution layer** — `creative intent → identity requirement → eligible character/host → avatar asset → provider identity` (per PK directive 2026-07-23; consistent with the layered model in `docs/briefs/character-model-v0-brand-host-designation.md`). The deliverable is a single document with five parts:

1. **Current-state identity-resolution architecture** — the complete live production path: where avatar intent originates, what metadata reaches `heygen-worker`, why `stakeholder_role` is always null, the current avatar inventory + eligibility, which controls exist but are not consulted, and the exact boundary between Creative Intelligence and Render Intelligence.
2. **Declared-control census** — every governance control that exists in schema/code/DB (markers, unique indexes, shadow resolver, flag, hook) with, for each, whether it is *consulted by live selection*, *consulted only by the dormant shadow path*, or *unconsumed*.
3. **AGP v2 gate map** — PK's recommended 7-step sequence (below) documented as the proposed forward gate map, each step named as a *future, separately-gated* lane. This lane starts none of them.
4. **Phase-3.2 compatibility decision (keep vs supersede)** — for each existing Phase-3.2 artifact (migrations, markers+indexes, shadow table, resolver function, worker telemetry hook, Character Model + CI/RI thinking), a keep-vs-supersede recommendation, and for the old Phase-3.3 activation runbook the recommended "superseded" disposition — as a *recommendation for PK*, not an applied change.
5. **Recommended smallest-safe implementation slice** — a **single named** recommendation (PK gate-1 ruling 2026-07-23): replace the unsafe legacy `exec_sql` lookup with a typed resolver/RPC at STRICT PARITY with today's single-active-avatar path — framed as a recommendation whose execution is a separate future gate (T3 when it becomes an implementation lane).

## Source context

- **PK directive 2026-07-23** (the "July-22 re-analysis" reframe; carried in orchestration context, not a repo file) — the authoritative source for the AGP v2 reframe, the KEEP/SUPERSEDE lists, and the 7-step recommended sequence this lane must document (not execute).
- `docs/briefs/agp-d01-gate3-phase3.3-activation-soak-runbook.md` — the activation/soak runbook PK is superseding; documents the shadow table, resolver RPC, and the flag-gated `heygen-worker` hook as **applied/deployed but inert** (flag OFF, 0 rows).
- `docs/briefs/agp-d01-3-shadow-resolver-telemetry.md` — the live resolution site: `heygen-worker … lookupAvatar(...)` executed via the `public.exec_sql` raw-SQL RPC with **string-interpolated** `client_id`/`render_style`/`role_code`; the A2-pin determinism gap (`LIMIT 1`, no `ORDER BY`).
- `docs/briefs/character-model-v0-brand-host-designation.md` — the intent→identity→asset→provider model; live inventory (NDIS-Yarns + Property Pulse 1 active avatar each; Invegent + Care For Welfare 0 avatars); markers all false / non-consumed by live selection; the future gated `is_default_host` host-designation write.
- `docs/briefs/creative-render-intelligence-character-architecture.md` — the CI ("who says it") vs RI ("how produced") boundary and the dependencies that gate any marker/persona-driven *live* selection.
- `docs/briefs/f-series-avatar-differentiation.md` — Branch B: `stakeholder_role` is never populated on drafts (always null; `avatar_selected_by='fallback_limit1'`); the exec_sql `lookupAvatar` shape; per-brand data inventory.
- `docs/00_action_list.md` (AGP hold-states ~652-654) — Phase 3.3 flag-enable/soak BLOCKED; #4 cutover BLOCKED; Branch B NOT AUTHORISED; repo↔prod migration-timestamp drift recorded.
- `docs/runtime/sessions/2026-06-15-agp-deterministic-avatar-resolution-d01-ratified.md`, `…/2026-06-15-avatar-governance-planning-audit-readonly.md`, `…/2026-06-16-agp-d01-2-migration-brand-avatar-markers-applied.md`, `…/2026-06-16-agp-d01-2-schema-direction-ratified.md` — PK-named provenance for the applied markers/indexes + schema-direction ratification (the census executor should read these directly for migration/marker provenance).

> **Staleness caveat (load-bearing):** every current-state fact cited above was verified read-only in the source sessions on 2026-06-15/18/19 — over a month before this brief. This lane must **re-verify all live-state claims** (avatar inventory, marker values, `stakeholder_role` population, deployed `heygen-worker` version, flag/row-count, migration-timestamp drift) as a named handoff before asserting them as current — see Allowed actions and the STOP condition.

## Scope

**In scope:**
- Producing the single five-part AGP v2 planning artifact described in **Task**, entirely from read-only evidence.
- Documenting PK's recommended 7-step sequence **as a gate map** (naming each as a future separately-gated lane).
- Recommending (not applying) the Phase-3.2 keep-vs-supersede dispositions and the single smallest-safe next slice.
- Producing a gap matrix (declared control → consulted-by-live? / consulted-by-shadow? / unconsumed) and an explicit statement of the boundary between Creative Intelligence and Render Intelligence.
- Naming, as handoffs, every live-DB / live-render / git-truth / cross-repo (dashboard) fact the census needs but this lane cannot itself verify.

**Out of scope:**
- The **register marking of the old AGP work** ("Infrastructure retained; original activation plan superseded by AGP v2") — that is a SEPARATE docs-lane action, scheduled by PK gate-1 ruling to run *after this planning artifact is accepted*. It is NOT performed or drafted here.
- **Every step 2-7 as EXECUTION.** Steps 2-7 are documented *as the gate map*; none is started. Specifically: no HOST/PERSONA governance split is implemented (step 2); no exec_sql→typed-resolver replacement is built (step 3); no `is_default_host` designation is written (step 4); no fenced test condition or alternative avatar is created (step 5); no shadow soak is run or flag flipped (step 6); no cutover of any slice (step 7).
- Any code, migration, DDL/DML, secret change, EF deploy, marker write, second-avatar activation, or register/CLAUDE.md edit.
- Judging brand/likeness/consent conformance or making any product decision reserved to PK.

## Allowed actions

- `Read`/`Grep`/`Glob` across the CE repo (briefs, registers, session notes, `supabase/functions/**`, schema docs) to gather and cite evidence.
- Assemble the five-part artifact with every material claim carrying a `(path)` or `(path:line)` citation; anything ungrounded goes to open questions or a named handoff, never into the artifact as fact.
- **Named handoffs (this lane requests, does not perform):**
  - **`db-rls-auditor`** — live DB truth needed to complete the census: current `c.brand_avatar` inventory + `is_active`/`is_primary`/`is_default_host` values per brand; live `stakeholder_role` population on recent drafts; shadow-table row count + RLS/grant posture; RPC/function definitions as currently applied.
  - **`ice-architecture-cartographer`** — if a cited current-architecture snapshot/map of the identity-resolution path is wanted, generate it read-only from CE source (it does not verify live/DB/deploy truth — that stays with db-rls-auditor).
  - **`branch-warden`** — CE HEAD/parity and the recorded repo↔prod migration-timestamp drift as a git-truth confirmation.
  - **Cross-repo note:** if the identity-resolution architecture requires dashboard-side evidence, the census must flag it as a cross-repo handoff, not assert it.

## Forbidden actions

- **No flip of the shadow-telemetry flag** and no shadow soak — **Phase 3.3 flag-enable/soak is a standing PK BLOCK** (`docs/00_action_list.md` ~654; runbook).
- **No cutover of any slice** — **#4 cutover is BLOCKED** (`docs/00_action_list.md` ~654).
- **No Branch B / persona-driven or marker-driven live selection** — **Branch B is NOT AUTHORISED** (`docs/00_action_list.md` ~654; `f-series-avatar-differentiation.md`).
- **No marker write** (`is_default_host`/`is_primary`) — the host-designation write is a future, separately-gated migration.
- **No second-avatar activation** (`c.brand_avatar.is_active` flip) — creating multi-candidate telemetry by activating a real production avatar is explicitly disallowed (PK directive 2026-07-23, step 5).
- **No migration / DDL / DML / secret change / EF deploy / provider (HeyGen) call.**
- **No code change** to `heygen-worker`, `ai-worker`, `lookupAvatar`, the A2 pin, or the shadow resolver.
- **No register or CLAUDE.md edit** — including NOT performing the separate old-AGP "superseded" register marking (recommend only; PK scheduled it for after acceptance).
- **No approval / no marking anything proven.**

## Success criteria

- The five-part artifact exists and is internally complete: (1) current-state identity-resolution architecture, (2) declared-control census + gap matrix, (3) AGP v2 gate map covering all 7 recommended steps as future gated lanes, (4) Phase-3.2 keep-vs-supersede table, (5) single recommended smallest-safe slice (exec_sql → typed resolver/RPC at strict parity).
- Every current-state claim is either (a) cited to a repo path/line, or (b) explicitly marked "requires live re-verification" and routed to the correct named handoff — with **zero** live/DB/deploy/git facts asserted as current without either a citation or a handoff.
- The CI↔RI boundary and the HOST-vs-PERSONA governance separation (step 2) are stated explicitly, including the requirement that a `no_persona_available` condition must not block deterministic host resolution.
- The unsafe string-interpolated `exec_sql` lookup is documented as a named safety concern with STRICT-PARITY-first framing for its future remediation (step 3 = the named slice).
- The document performs **zero** mutations of any kind and does not perform the separate old-AGP register marking.

## Stop condition

When the five-part artifact is complete and all live-truth gaps are routed to named handoffs, report the result per the result template and stop. **Hard STOP (surface to PK, do not proceed) if:** any active hold-state (Phase 3.3 / cutover / Branch B) appears to have changed since `00_action_list.md` ~652-654; or the evidence base is found to contradict the AGP v2 reframe (e.g. the shadow infrastructure is no longer dormant, or a second production avatar is already active); or any step would require a mutation. Do not resolve such a contradiction — return it to PK.

---

## Notes

**CCF-02 admission (PK-ratified at gate 1, 2026-07-23):**
- **Lane classification:** **SAFETY_GATE** — the lane's load-bearing output is the governed identity-resolution *posture*, and it surfaces a real security-shaped concern (the string-interpolated `exec_sql` avatar lookup).
- **Risk tier:** **T1 (docs / read-only)** — no DB/code/deploy touch; verify-or-abort + branch-warden + readback; external review only on an escalation trigger (Convention 3). **Forward note:** the step-3 exec_sql remediation, when it becomes an *implementation* lane, is production-touching (callers/DML) → **T3**, not T1 — this planning lane merely names it.
- **Smallest-safe slice framing:** **single named slice** (PK ruling) — exec_sql → typed resolver/RPC at strict parity; not presented as a menu.
- **Old-AGP register marking:** scheduled by PK to run as its own verify-or-abort docs-lane **after this planning artifact is accepted**; not performed here.
- **Findings contract:** the executor returns the CCF-02 10-field findings block; orchestrator routes on `verdict.normalized`.
- **brief-author scope note:** this is a docs/planning-shaped brief (brief-author's proven scope); it *describes* future code/DB lanes but is not itself one.
