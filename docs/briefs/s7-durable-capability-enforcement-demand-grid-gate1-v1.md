# Brief cc-NNNN — S7: durable capability enforcement at the weekly-demand-grid boundary

**Created:** 2026-07-31 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor:** Claude Code (orchestrator + subagent chain) — PK at every gate
**Status:** draft — awaiting PK Gate 1 (investigation + design only; NOT an apply gate)
**Result file:** `docs/briefs/results/cc-NNNN-s7-durable-capability-enforcement.md` (created on completion)

> **cc-ID NOT self-allocated.** **Lane classification (CCF-02):** SAFETY_GATE. **Tier for THIS Gate-1 lane: T1** (investigation + design + read-only live verification only — zero write). The proposed `m.build_weekly_demand_grid` change itself, if PK later authorises it past this Gate 1, is tiered **T3** (see §6) — this brief does not authorise that apply.
> **Predecessor:** S6 Slice A dry-run — **STOP** (`docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md`), which found the grid's raw candidate set for NDIS was 64% (7/11) `unsupported_silent_degrade` even though 0% were `platform_support=false`, and that today's safety is accidental/downstream-containment-dependent. This brief is the direct successor PK named. **Slice A is not reopened here.**
> **Prior art, extended, not duplicated:** `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md` (the original S7 design brief) already proposed a `platform_support`-only CTE fix and was never applied. This brief **extends** that design (same insertion point, same technique) to close the deeper gap Slice A's dry-run exposed — `platform_support=true` alone is proven insufficient.

---

## Task

Investigate and design — **do not implement** — the smallest durable, data-driven fix to `m.build_weekly_demand_grid` that stops it from ever proposing a genuinely unsupported or ungoverned (platform, format) candidate, closing the gap Slice A's dry-run found. Establish the authoritative capability predicate, show exactly why the current grid can emit `unsupported_silent_degrade` candidates, design the minimal code change, prove it on the same NDIS evidence Slice A used plus a live regression check against **Property Pulse — the only currently-enrolled, live-production client** (a check Slice A's dry-run did not need to do, since NDIS is unenrolled; S7 must, since PP is not), and assess every caller/interaction without mutating anything.

## Source context

- `docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md` — the predecessor finding: grid's raw candidates 0/11 `platform_support=false` but 7/11 `unsupported_silent_degrade`; safety accidental (NDIS's own `c.client_format_config` already enables two `platform_support=false` formats client-wide, masked only by `t.platform_format_mix_default` not yet offering them as candidates).
- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md` — original S7 design brief; the `platform_capable` CTE, its insertion point (between `enabled_set` and `policy_backed`), and the rejection of a CHECK constraint / trigger-as-primary-control (§ rationale carried forward verbatim below).
- `docs/briefs/cc-0079-slice-2-external-review-record-v1.md` — Track-B's own Slice-2 packet explicitly names "a `platform_support` intersection inside `m.build_weekly_demand_grid`… a named code successor, out of this data-only scope" — confirms this brief does not collide with Track-B's scope (data-only vs. code-only, cited by the queue's own author).
- `docs/briefs/results/shared-capability-contract-classifier-result-v1.md` + live `public.classify_format_capability` — the 7-status governance vocabulary this brief reuses rather than reinventing.
- `CLAUDE.md` — Convention 3 risk tiers, PK hard stops on deploy/merge/migrate, S5 boundary, "coverage gap → new view, not a workaround."

## Scope

**In scope:** live-verifying the authoritative predicate, the root-cause read of why the gap exists, designing the minimal `CREATE OR REPLACE` fix (function-body-only, unchanged signature/return columns — the same technique already used for `m.write_render_log` H3.1 and endorsed by the original S7 brief), simulating before/after against NDIS's 11 candidates AND Property Pulse's 11 candidates (live), auditing every caller, and drafting (not freezing, not applying) a bounded apply-packet proposal for its own future Gate 2/apply gate.

**Out of scope:** any actual `CREATE OR REPLACE`, any write to any table, re-opening Slice A, Track-B's own data-cleanup scope (cc-0079 Slice 2), S5's schedule/cap work, a full de-duplication of the three now-identified parallel eligibility implementations (`build_weekly_demand_grid`, `resolve_final_format`, `get_week_format_allocation`) — named as a carry, not attempted here.

## Allowed actions

- Read-only live verification via `execute_sql`/catalog reads (function bodies, grants, volatility, live data joins, live function calls to `STABLE`-only functions).
- Design and document the proposed `CREATE OR REPLACE` text and its rollback, as a **draft proposal**, not frozen, not applied.
- Author the result doc; surface every finding, including ones that raise the tier beyond what was originally assumed.

## Forbidden actions

- No `CREATE OR REPLACE`, no DDL, no DML, no migration apply, no deploy.
- No touch to S5 (schedule/cap tables or functions), no touch to Track-B/cc-0079 rows or packets, no re-opening Slice A.
- No attempt to flip R3a (`resolve_final_format`) live or reconcile the three parallel implementations — name as a carry only.
- Deploy/merge/migrate remain PK hard stops; no secrets in any artifact.

## Success criteria

- Every required-outcome item below answered with live evidence, not assumption.
- The proposed fix is shown to leave `format_override`-pinned slots and the grid's own STABLE/return-signature contract untouched.
- Every caller of `m.build_weekly_demand_grid` and `m.materialise_slots` is enumerated and assessed, including two NOT obviously connected by name (`resolve_final_format`, `get_week_format_allocation` — found only by reading `prosrc`, not `pg_get_functiondef`, which silently missed them once already this session).
- Zero production mutations.

## Stop condition

Report result per the result template, then stop. Do not implement.

---

## 1. The authoritative capability predicate (required outcome 1)

A `(client, platform, format)` allocation is genuinely safe to feed into the demand grid **iff both**:

```
COALESCE((t."5.3_content_format".platform_support ->> platform)::boolean, false)   -- structural: can this platform show this format at all
AND (public.select_template(client_slug, platform, format) ->> 'status') <> 'fail_closed'   -- governed: is there a real, live-selectable, proven template right now
```

Both halves are **already-adopted, already-live signals** — nothing new is invented:

- The `platform_support` half is the **exact, verbatim predicate** already used identically in two other places, found by reading `prosrc` (not just `pg_get_functiondef`, which — a lesson from this session — silently misses cross-function references baked into dollar-quoted bodies containing nested calls):
  - `public.resolve_final_format` (the SHADOW R3a resolver) — its own comment reads *"mirrors `m.build_weekly_demand_grid`'s policy-backed ∩ platform_support ∩ client-enabled set"* — i.e. its author already knew the grid was missing this and independently re-derived it in a parallel, still-shadow implementation.
  - `public.get_week_format_allocation` (the live, already-shipped Weekly Schedule Editor Phase 1 read RPC) — computes `is_valid`/`effective_is_valid` per slot using this identical `COALESCE((platform_support ->> platform)::boolean, false)` join on `ice_format_key`.
- The `select_template`/`fail_closed` half is exactly what `public.classify_format_capability` (the live S5 seven-status classifier) already keys its `unsupported_silent_degrade`/`no_selectable_template`/`format_unmapped` classifications on (rung 10 of the 13-rung graduation ladder — *"a live `select_template` call, not a status read"*).

**Why compose it here, in the grid, rather than only rely on the two existing partial implementations:** neither existing implementation is upstream of the *allocation* decision itself. `get_week_format_allocation` is read-only diagnostic (reports invalidity after a format is already assigned); `resolve_final_format` is a parallel SHADOW computation that never actually feeds the grid. Only a change **inside `m.build_weekly_demand_grid` itself** prevents an unsafe candidate from ever entering `enabled_set`/`policy_backed`/`normalised`/`raw_alloc` in the first place.

## 2. Why the current grid emits `unsupported_silent_degrade` candidates (required outcome 2)

`m.build_weekly_demand_grid`'s candidate pipeline (`candidate → candidate_share → enabled_set → policy_backed → per_platform_total → normalised → …`) filters **only** on: (a) presence in `t.platform_format_mix_default`/`c.client_format_mix_override`, (b) `c.client_format_config.is_enabled`, (c) `t.format_synthesis_policy`/`t.format_quality_policy` currency (`pg_get_functiondef` re-read live this session, ILIKE `%platform_support%` → `false`, confirmed). It contains **zero** reference to `t."5.3_content_format".platform_support` and **zero** reference to template-graduation/selectability state. Both missing checks are exactly what §1's predicate supplies. This is not a new defect — it is the same one the original S7 brief found for PP; this session's contribution is proving the *narrower* `platform_support`-only fix (that brief's own proposal) is **insufficient on its own**, because §5 below shows a majority of the actually-emitted candidates for both NDIS and PP are `platform_support=true` yet still `unsupported_silent_degrade`.

## 3. Proposed minimal fix (required outcome 3) — design only, not applied

Insert **one** CTE at the exact position the original S7 brief already identified and justified (downstream of the `candidate` UNION so it covers defaults *and* overrides; upstream of `per_platform_total`/`normalised` so existing renormalisation applies to survivors with zero new arithmetic), extended to both halves of §1's predicate:

```sql
-- NEW: resolve the client's slug once (grid already receives p_client_id)
-- (added as a cheap scalar CTE near the top of the function body)
client_slug AS (
  SELECT cl.client_slug FROM c.client cl WHERE cl.client_id = p_client_id
),
capability_gated AS (
  SELECT es.platform, es.ice_format_key, es.share_pct
  FROM enabled_set es
  WHERE EXISTS (
    SELECT 1 FROM t."5.3_content_format" cf
     WHERE cf.ice_format_key = es.ice_format_key
       AND cf.is_active = true
       AND COALESCE((cf.platform_support ->> es.platform)::boolean, false)
  )
  AND (
    SELECT (public.select_template((SELECT client_slug FROM client_slug), es.platform, es.ice_format_key) ->> 'status')
  ) IS DISTINCT FROM 'fail_closed'
)
```

…and repoint `policy_backed`'s `FROM enabled_set es` at `capability_gated`. **Nothing else in the function changes** — same technique the original S7 brief validated: `CREATE OR REPLACE` of a `STABLE` function, unchanged signature (`p_client_id uuid, p_week_start date`) and unchanged return columns (`client_id, platform, ice_format_key, share_pct, weekly_slot_count`) — no dependent object is invalidated.

**Fail-closed by construction:** an unknown `ice_format_key`, a null `platform_support`, a malformed JSON value, or a `select_template` call that errors/returns no row all resolve toward exclusion, not inclusion (`COALESCE(…, false)` for the first; `IS DISTINCT FROM 'fail_closed'` requires an actual non-`fail_closed` status to pass — a `NULL` status, e.g. from a failed call, does **not** satisfy `IS DISTINCT FROM 'fail_closed'` as `NULL` since SQL's `IS DISTINCT FROM` treats `NULL` as distinct from `'fail_closed'`, which would be a **fail-open** bug — flagged explicitly as a design correction needed before freeze: this must be rewritten as `= 'ok'` or an explicit `NOT IN ('fail_closed')` with a `COALESCE(…, 'fail_closed')` wrapper so a `NULL`/error result fails closed, not open. **This is deliberately surfaced as an open design defect in this Gate-1 draft, not silently fixed**, so PK sees the exact reasoning; the apply-packet proposal in §8 uses the corrected form.

## 4. Data-driven, cross-brand, zero brand-specific code (required outcome 4)

Both `platform_support` (keyed by `ice_format_key` + a JSON key per platform) and `select_template` (parameterised by `client_slug`, `platform`, `format`) are already fully data-driven per-client, per-platform, per-format signals. The new CTE's only input beyond what the function already receives is `p_client_id` (already a parameter, resolved to `client_slug` via one cheap join). **Zero client-name literals, zero per-brand branches, zero new configuration surface** — the guard self-updates the moment any client's template graduates (rung 6→10) or any platform's `platform_support` flag changes, with no code change and no re-deploy.

## 5. Three-state distinction (required outcome 5)

The guard does **not** treat `platform_support=true` as sufficient — three states are distinguished, live-evidenced on the very data this session already gathered:

| State | Definition | Allocation decision | NDIS example | PP example |
|---|---|---|---|---|
| **Unsupported (hard/structural)** | `platform_support=false` | Never allocate; permanent until a taxonomy edit | none found live today (0/11 for NDIS, 0/11 for PP) | none found live today |
| **Temporarily unavailable (governed, not yet proven)** | `platform_support=true` AND `select_template` fail-closed for a resolvable reason (`no_selectable_template`/`template_missing`/`governance_unproven`/`asset_shortage`) | Excluded today; **self-heals with zero code change** the instant a template graduates | facebook/carousel, instagram/carousel (`no_selectable_template`) | (none of PP's are this sub-reason — see next row) |
| **Supported-but-degraded (active, currently happening)** | Same fail-closed test, **and** `classify_format_capability` reports `unsupported_silent_degrade` because a legacy/ungoverned path is *already* auto-publishing it (real `m.post_publish` rows in the 90-day window) | Excluded from allocation identically to the row above — but flagged distinctly for operator visibility (§7), because it is active risk, not a dormant gap | facebook/text (20 publishes/90d), linkedin/text (70 publishes/90d), youtube video_short_kinetic/kinetic_voice/stat_voice (3–5 publishes/90d each) | facebook/text (`unsupported_silent_degrade`), linkedin/text, youtube video_short_kinetic/kinetic_voice/stat_voice — **the exact same five sub-formats, on PP, the one LIVE ENROLLED client** |

The allocation guard's SQL (§3) does not need to distinguish rows 2 and 3 internally — both fail the same `select_template` test and are excluded identically — but §7 proposes a companion read-only diagnostic that reports which of the two applies, because an operator deciding what to fix next needs to know "nothing has ever tried this" vs. "this is silently leaking into production right now" are different urgencies.

## 6. Before/after — the same 11 NDIS candidates, PLUS a live Property Pulse regression check (required outcomes 6, 7, 8)

**NDIS (unenrolled — hypothetical, matches the Slice A dry-run exactly):**

| platform | BEFORE (all 11 candidates, current live grid) | AFTER (proposed guard) |
|---|---|---|
| facebook | image_quote 40%/11, carousel 33%/9, text 27%/8 | **image_quote 100%/28** (sole survivor; carousel + text excluded) |
| instagram | carousel 60%/17, image_quote 40%/11 | **image_quote 100%/28** (carousel excluded) |
| linkedin | text 57%/8, image_quote 43%/6 | **image_quote 100%/14** (text excluded) |
| youtube | kinetic 33%/9, kinetic_voice 28%/8, stat 22%/6, stat_voice 17%/5 | **video_short_stat 100%/28** (sole survivor; other three excluded) |

7 of 11 raw candidates excluded; the 4 `ready` candidates each become their platform's sole allocation (NDIS currently has exactly one genuinely proven template per platform).

**Property Pulse (ENROLLED, LIVE PRODUCTION — the regression-critical check Slice A did not need to run):**

| platform | BEFORE (live today) | AFTER (proposed guard) |
|---|---|---|
| facebook | image_quote 40%/2, carousel 33%/2, **text 27%/1 (degrading)** | image_quote + carousel survive, **renormalised 54.5%/45.5% → 3/2** (text's 1 slot/wk redistributes to the two real formats, by largest-remainder) |
| instagram | carousel 60%/3, image_quote 40%/2 | **unchanged — 60%/3, 40%/2** (both already `ready`; zero effect) |
| linkedin | image_quote 43%/2, **text 57%/3 (degrading)** | **image_quote 100%/5** (text's 3 slots/wk redistribute entirely to image_quote) |
| youtube | **kinetic 33%/2, kinetic_voice 28%/1, stat_voice 17%/1 (all degrading)**, video_short_stat 22%/1 | **video_short_stat 100%/5** (the other three formats' combined 4 slots/wk redistribute entirely to the one proven format) |

**This is a real, material, live-production behaviour change for PP**, not a no-op — 5 of PP's own 11 candidates are today `unsupported_silent_degrade` (facebook/text, linkedin/text, and 3 of 4 YouTube formats), identically to NDIS's pattern. **Requirement 7 (prove the 7 unsupported candidates are rejected or explicitly surfaced) and requirement 8 (prove supported candidates and existing overrides remain stable) are both satisfied structurally by §3's CTE placement** — `platform_capable`/`capability_gated` only shrinks the *candidate* set feeding `per_platform_total`/`normalised`; it cannot re-order or corrupt the survivors' relative shares (instagram's unchanged row above proves this — where nothing was excluded, nothing changed), and it has **zero interaction with `format_override`**, which is resolved entirely inside `m.materialise_slots` *before* it ever calls the grid (§3 of the Slice-A result doc already proved 97/98 of NDIS's own slots bypass the grid via `format_override` regardless of this change).

## 7. Companion diagnostic (proposed, not built here)

Per `CLAUDE.md`'s "coverage gap → new view, not a workaround": propose `ice_ro.format_mix_capability_gaps` (secret-free, R0-servable) — one row per `is_current` mix/override entry that `capability_gated` (§3) would exclude, carrying `platform`, `ice_format_key`, `stored_share`, the reclassified-away share, and **which** of §5's rows 2/3 applies (`select_template` fail reason **and** a live `unsupported_silent_degrade`/publish-count check). This is a **future T2 lane of its own** — named here as the natural companion to §3, not scoped into this brief's apply proposal.

## 8. Bounded apply-packet proposal (required deliverable — draft, NOT frozen, NOT applied)

**Corrected guard (fail-closed on `NULL`/error, per §3's self-flagged defect):**

```sql
CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
 RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
DECLARE
  v_client_slug text;
BEGIN
  SELECT cl.client_slug INTO v_client_slug FROM c.client cl WHERE cl.client_id = p_client_id;
  RETURN QUERY
  WITH slots_per_platform AS ( … unchanged … ),
  candidate AS ( … unchanged … ),
  candidate_share AS ( … unchanged … ),
  enabled_set AS ( … unchanged … ),
  capability_gated AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (
      SELECT 1 FROM t."5.3_content_format" cf
       WHERE cf.ice_format_key = es.ice_format_key
         AND cf.is_active = true
         AND COALESCE((cf.platform_support ->> es.platform)::boolean, false)
    )
    AND COALESCE(
      (public.select_template(v_client_slug, es.platform, es.ice_format_key) ->> 'status'),
      'fail_closed'
    ) <> 'fail_closed'
  ),
  policy_backed AS (
    SELECT cg.platform, cg.ice_format_key, cg.share_pct
    FROM capability_gated cg
    WHERE EXISTS (SELECT 1 FROM t.format_synthesis_policy sp WHERE sp.ice_format_key = cg.ice_format_key AND sp.is_current = true)
      AND EXISTS (SELECT 1 FROM t.format_quality_policy qp WHERE qp.ice_format_key = cg.ice_format_key AND qp.is_current = true)
  ),
  … everything from per_platform_total downward: unchanged, verbatim …
  SELECT p_client_id AS client_id, ar.platform, ar.ice_format_key, ar.share_pct, ( … unchanged … )
  FROM alloc_ranked ar
  ORDER BY ar.platform, ar.share_pct DESC, ar.ice_format_key;
END;
$function$
```

- **Affected callers (regression surface, all assessed live this session):** `m.materialise_slots` (writes `m.slot`; zero code change needed, same signature) → `c.handle_schedule_rule_change` (trigger; unaffected, calls `materialise_slots` unchanged) · `m.match_demand_to_canonicals` / `m.diagnose_match_pool_adequacy` (read grid output for content-matching/pool diagnostics; will now see a **smaller, safer** demand-cell set — behaviourally correct, no code change needed, but their *output shape* changes: fewer demand cells reported for any client whose candidates include excluded formats) · `public.resolve_final_format` (SHADOW R3a; independent computation, not called by nor calling the grid; becomes more redundant with this fix but is not touched) · `public.get_week_format_allocation` (independent computation; becomes *consistent* with the grid after this fix instead of only catching bad allocations after the fact).
- **Tier:** **T3** — not T2/"dark", because §6 proves this is a **live production behaviour change for the one enrolled client (PP)**, not an additive/inert change. Convention 3 (`CLAUDE.md`): callers/behaviour change → T3.
- **Rollback shape:** byte-exact `CREATE OR REPLACE` back to the current live body (already captured verbatim this session via `pg_get_functiondef`, available for the apply packet) — function-body-only, no schema/table change, no data migration, matching the `m.write_render_log` H3.1 precedent. Trivially reversible; no backfill.
- **Grants:** no change needed — `select_template` already grants `EXECUTE` to `service_role` and `postgres` (verified live), matching `m.materialise_slots`' owner (`postgres`, `SECURITY DEFINER`) and the RPC-wrapper's service-role callers; `build_weekly_demand_grid` itself remains non-`SECDEF`, unchanged.
- **Not yet in this proposal, named as required before an actual apply gate:** (a) the `search_path` pin `build_weekly_demand_grid` still lacks (`proconfig: null`, confirmed live — a pre-existing nit carried since v4.13, **not introduced by this proposal**, but worth fixing in the same `CREATE OR REPLACE` while the function is open, PK's call); (b) a hermetic hold-out test proving the corrected `COALESCE(…,'fail_closed')` fail-closed behaviour under a simulated `select_template` error/NULL; (c) `apply-harness-auditor` + `db-rls-auditor` passes on the frozen packet; (d) explicit PK sign-off that a live PP behaviour change (§6) is acceptable, since Slice A's own gate never authorised changing PP's live output — this brief's Gate 1 does not authorise that either.

## 9. Interaction with S5, Track-B, and slot materialisation — assessed, nothing mutated (required outcome 9)

- **S5:** owns `c.client_publish_schedule` and cap/cadence surfaces. §3's proposal touches only `m.build_weekly_demand_grid`'s body — no S5 table or function is read differently or written at all. `format_override` (S5-adjacent, Weekly Schedule Editor-owned) is untouched and structurally prior to the grid in `materialise_slots`' control flow (§6).
- **Track-B / cc-0079:** its own Slice-2 packet already names this exact code fix as "a named code successor, out of this data-only scope" (§ Source context) — **no collision, this is the anticipated next step**, not a jump of the queue. This proposal makes Track-B's Slice-2 data cleanup **less urgent but not moot** (a code-level guard fail-closes bad rows regardless of whether the mix tables are cleaned, but leaving bad rows in `t.platform_format_mix_default` is still wasted/confusing data worth cleaning independently). Track-B's own currency (OQ4, from Slice A) is **still unresolved** and, per PK's instruction this turn, is **not required to block this S7 investigation** — but PK's instruction also confirms it **must** receive an explicit disposition before Slice A can later pass; nothing in this S7 packet resolves that for Slice A.
- **Slot materialisation:** `m.materialise_slots` calls the grid with an unchanged signature/return shape — requires zero code change. Only currently-affected client in live production: **Property Pulse** (§6) — the only one where `format_mix_enrolled=true` today.

## 10. Open items carried to the eventual apply gate (not resolved here)

1. The `IS DISTINCT FROM`/`COALESCE` fail-closed correction (§3) must be reviewed, not just self-flagged.
2. §7's diagnostic view is a separate future T2 lane.
3. PK must explicitly weigh PP's live behaviour change (§6) — this Gate-1 does not pre-authorise it.
4. Track-B/OQ4 disposition remains outstanding and gates Slice A specifically, per PK's standing instruction — unaffected by this brief.
5. The three-way logic duplication (`build_weekly_demand_grid`, `resolve_final_format`, `get_week_format_allocation`) is a named future consolidation carry, not attempted here.

---

## Notes

This brief intentionally goes further than a typical Gate-1 (it includes concrete SQL and a live PP regression check) because PK's required-outcome list asked for the live contract, the exact predicate, and a bounded apply-packet proposal directly — those are produced here as **drafts awaiting Gate 2/apply gate**, not as an authorisation to run them.
