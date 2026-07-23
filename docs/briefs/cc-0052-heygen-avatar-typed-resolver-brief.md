> ## 🔖 CANONICAL ID: **cc-0052** — renumbered 2026-07-24 · ⚠ THIS BRIEF'S PLAN WAS ATTEMPTED AND FAILED
> **Former ID:** `cc-0048` — collided with the image-worker creative-contract registry recovery
> (`5a6c998`, 2026-07-22T06:41:26Z), which was already an ancestor of this brief's own branch.
> Earliest committed claim keeps the number → this lane renumbers. **PK ruling 2026-07-24, final.**
> **Provenance:** byte-exact copy of `docs/briefs/cc-0048-heygen-avatar-typed-resolver.md` from
> `origin/claude/new-session-swx6cf`, commit **`191db5f`** (2026-07-23T01:26:46Z); register lineage
> **v6.12** (`af0d9b7`).
>
> **⛔ DO NOT EXECUTE THIS BRIEF.** Its plan — replacing the `exec_sql` avatar lookup with a
> supabase-js query-builder resolver at "strict parity" — was implemented (`69541fd`), deployed,
> **caused a production outage**, and was **rolled back**. The mechanism this brief PINS (an Edge
> Function query-builder implementation) is the specific thing that failed: the `c`-schema
> PostgREST `!inner` embed does not resolve via supabase-js at runtime.
> **Status: `DEPLOYED → INCIDENT → ROLLED_BACK`.** Retained as evidence and as the design record of
> a refuted approach. Any future typed-resolver work needs a NEW brief under a new gate, and must
> first prove its contract and error behaviour.
> Incident record: `docs/briefs/results/cc-0052-heygen-typed-resolver-incident-result-v1.md`.

# Brief cc-0048 — heygen-worker avatar lookup: exec_sql → typed resolver at strict parity

**Created:** 2026-07-23 Sydney
**Author:** chat (brief-author draft — orchestrator persisted)
**Executor:** Claude Code (ef-builder, isolated worktree) + review chain; PK at every gate
**Status:** issued (PK Gate-1 approved 2026-07-23 — T3 · SAFETY_GATE · mechanism PINNED: supabase-js query-builder, EF-only)
**Result file:** `docs/briefs/results/cc-0048-heygen-avatar-typed-resolver.md` (created on completion)

**Tier:** T3 (production-touching EF + DB caller path) · **Class:** SAFETY_GATE · CCF-02 lane classification PK-ratified at Gate 1 (2026-07-23).

---

## Task

Replace the string-interpolated `public.exec_sql` **avatar lookup** in `heygen-worker` with a **typed, parameterised resolver** (mechanism PK-pinned: **supabase-js query-builder, EF-only** — see Notes) at **STRICT BEHAVIOURAL PARITY** with today's single-active-avatar production path, and rewire `heygen-worker.lookupAvatar` onto it. This is **Step 3 of the AGP v2 gate map** and the single "smallest-safe slice" named in the PK-accepted planning artifact cc-0047, Part 5 (`docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md`). It removes the SQL-injection-*shaped* string interpolation and establishes the typed resolution seam that AGP v2 steps 4–7 build on, **while changing no selection behaviour whatsoever**. It is a latent-hazard hardening + architecture-seam change — **NOT** a behaviour change, and **NOT** the patch of an anon-exposed injection (`exec_sql` is SECDEF, EXECUTE = `service_role`+`postgres` only, interpolated values are internal pipeline data).

## Source context

- `docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md` — PK-accepted canonical AGP v2 planning artifact. Part 1 architecture (single selection site; A2 pin; unordered `LIMIT 1` over a size-1 candidate set), Part 2 declared-control census + live facts, **Part 5** this named slice + Tier T3 + honest-risk framing. Register pointer v6.11 (`docs/00_sync_state.md:9-16`).
- `supabase/functions/heygen-worker/index.ts` — the EF being changed:
  - `lookupAvatar(supabase, clientId, stakeholderRole, renderStyle)` builds SQL by **direct string interpolation** of `clientId`/`renderStyle`/`stakeholderRole` and runs it via `supabase.rpc('exec_sql', {query})`. Returns `{ talking_photo_id, voice_id }` or `null` when no active avatar.
  - Live query: `SELECT ba.heygen_avatar_id, ba.heygen_voice_id FROM c.brand_avatar ba JOIN c.brand_stakeholder bs ON bs.stakeholder_id=ba.stakeholder_id WHERE ba.client_id='…' AND ba.is_active=true AND ba.render_style='…' [AND bs.role_code='…' when role non-null] LIMIT 1` — **no `ORDER BY`**.
  - Caller `runSubmitPhase` calls `lookupAvatar` only when no preset identity exists, and derives `avatar_selected_by ∈ {role_filter | fallback_limit1 | preset}` in the **caller**, not in `lookupAvatar`. Output frozen into `draft_format.avatar_identity` at `markRendering`.
  - Shadow hook `recordAvatarShadow` + its call: typed `.rpc('resolve_and_record_avatar_shadow')`, flag-gated on `AVATAR_SHADOW_TELEMETRY`, fail-open, never read back — **must remain byte-unchanged**, flag stays OFF.
  - Auth gate compares custom header `x-heygen-worker-key` to `PUBLISHER_API_KEY` — a non-JWT caller (why `verify_jwt` must stay false).
  - `VERSION = 'heygen-worker-v2.3.0'`; a code change requires a new VERSION per repo convention.
- **Deployed worker (LIVE-VERIFIED 2026-07-23 this session, not merely asserted):** VERSION `heygen-worker-v2.3.0`, Supabase function version 41, `verify_jwt=false`; the AGP shadow hook is present in the deployed bundle. Live post-deploy *parity* proof remains a deploy-verifier handoff.
- **`exec_sql` posture (LIVE-VERIFIED 2026-07-23):** SECDEF, `search_path=public`, EXECUTE = `service_role`+`postgres` only (anon/authenticated/authenticator = NO).
- **Inventory (LIVE-VERIFIED 2026-07-23):** 1 active realistic avatar/brand for NDIS-Yarns + Property Pulse; 0 for Invegent + CFW; markers 0-set; `stakeholder_role` null on 86/86 drafts, all `avatar_selected_by='fallback_limit1'` — candidate set is size 1 today, so parity is currently unambiguous.
- `CLAUDE.md` — T3 review chain (Convention 3), the `--no-verify-jwt` deploy gotcha, CCF-02 findings contract, deploy-verifier / branch-warden roles.

## Scope

**In scope:**
- Introduce a typed, parameterised avatar resolver via the **supabase-js query-builder** (PK-pinned mechanism — EF-only, no new DB object) that replaces the `exec_sql` string-interpolated avatar lookup at strict parity, and rewire `heygen-worker.lookupAvatar` onto it.
- New VERSION bump for the code change.

**Out of scope (PK-specified — keep OUT of this slice):**
- host/persona selection behaviour · marker backfill (`is_primary`/`is_default_host`) · second-avatar activation (`is_active` flip) · shadow telemetry activation or soak (`AVATAR_SHADOW_TELEMETRY` stays OFF) · service-role grant remediation · Invegent or Care For Welfare avatar onboarding.
- The **second** string-interpolated `exec_sql` (brand-colour lookup on `c.client_brand_profile`) — a NAMED SIBLING FOLLOW-UP, separate lane; do NOT fold it in.
- Any change to WHICH avatar is selected (parity is mandatory).
- The append-only `r.avatar_resolution_shadow` `service_role` UPDATE+DELETE over-grant — a SEPARATE safety follow-up; MUST NOT be folded in without a separate PK scope ruling.
- **A new typed RPC** — de-scoped by the PK Gate-1 mechanism ruling (query-builder pinned). Switching to an RPC needs a fresh PK decision (see Notes / Stop condition).

## Allowed actions

- In an **isolated worktree** (ef-builder): edit `heygen-worker/index.ts` to introduce the query-builder resolver and rewire `lookupAvatar`; bump VERSION.
- Write **hermetic parity tests** (see Success criteria) proving byte-identical selection on the current path.
- Run local/targeted tests and read-only checks only.
- Prepare (not run) the exact deploy command **with `--no-verify-jwt`** and a written+validated rollback, for the PK gate.

## Forbidden actions

- **No code/deploy/cutover in the brief-preparation act itself** — implementation is a separate future PK gate; every irreversible step (code merge, EF deploy) is a PK gate.
- **`--no-verify-jwt` is MANDATORY on any heygen-worker redeploy.** Deployed `verify_jwt=false` today; the caller uses the custom `x-heygen-worker-key` header, not a JWT. A default `supabase functions deploy` flips `verify_jwt`→true and 401s the caller (401→502). Any deploy plan lacking the flag = STOP.
- **No change to which avatar is selected.** No `ORDER BY` added, no new candidate, no relaxation of the `is_active` ∧ exact `render_style` ∧ optional `role_code` filter, `LIMIT 1` semantics preserved, `null`-on-no-row preserved.
- **Shadow hook byte-unchanged; `AVATAR_SHADOW_TELEMETRY` stays OFF.** No shadow soak.
- **Standing holds UNCHANGED:** Phase 3.3 flag-enable/soak **BLOCKED** · cutover **BLOCKED** · Branch B **NOT AUTHORISED** · no marker write · no second-avatar activation · no persona-driven selection.
- **Do NOT touch the sibling brand-profile `exec_sql` or the shadow-table over-grant** — separate lanes.
- **Do NOT silently switch to a typed RPC** if the query-builder proves awkward — that is a STOP → surface to PK for a fresh mechanism decision.
- No approval, no self-grading, no marking anything proven; `Status` stays as issued until the implementation lane runs under its own PK gates.

## Success criteria

- **Interpolation removed:** zero string interpolation of `clientId`/`renderStyle`/`stakeholderRole` into SQL in the avatar-lookup path; values are query-builder args / bound parameters.
- **Strict selection parity (hermetic):** for every input tuple `(clientId, stakeholderRole, renderStyle)` the typed resolver returns the SAME `{talking_photo_id, voice_id}` as today's `lookupAvatar`, and `null` when no active avatar exists — covering: (a) the live single-active path (`stakeholder_role` null, `avatar_selected_by='fallback_limit1'`); (b) the role-filter branch (dormant but code-live); (c) the no-active-avatar → `null` case; (d) the preset short-circuit still bypasses the resolver.
- **Caller derivation unchanged:** `avatar_selected_by` continues to be derived in `runSubmitPhase` exactly as today; `draft_format.avatar_identity` freeze unchanged. (Seam-boundary open question below.)
- **Filter/ordering identity:** same filter set (`client_id` ∧ `is_active=true` ∧ exact `render_style` ∧ optional `role_code` join), `LIMIT 1`, **no `ORDER BY` introduced**.
- **Shadow + sibling untouched:** `recordAvatarShadow` and the brand-profile `exec_sql` are byte-identical.
- **T3 review chain clean:** branch-warden `safe` · external review pinned to the final diff hash (`reviewed_input_hash` recorded) · independent lead re-verification · explicit PK deploy gate (or a Convention-2 pinned sequence). *(db-rls-auditor DDL/grant review NOT required — query-builder adds no DB object; db-rls-auditor remains the handoff for the post-deploy live-parity read.)*
- **Deploy guard + live parity:** deploy command carries `--no-verify-jwt`; post-deploy, deploy-verifier `overall=PASS` (marker-in-deployed-bundle · VERSION==repo · `verify_jwt` still false). A live post-deploy parity proof is a deploy-verifier / orchestrator-substitution handoff, not claimed by this brief.
- **Rollback written + validated BEFORE any apply:** EF redeploy of the prior version (`heygen-worker-v2.3.0`, function version 41, `--no-verify-jwt`). EF-only, no data migration — rollback is clean.

## Stop condition

STOP and surface to PK on ANY of: a parity divergence in any hermetic test · branch-warden not `safe` · any non-clean external verdict · a deploy plan missing `--no-verify-jwt` or that would flip `verify_jwt`→true · `reviewed_input_hash` ≠ current diff hash · deployed bundle/VERSION mismatch at deploy-verifier · unexpected files in the change set · an invalidated rollback path · the query-builder cannot cleanly express the `c.brand_avatar`→`brand_stakeholder` role join (→ fresh PK mechanism decision, do NOT silently switch to an RPC) · any attempt to alter selection, touch the sibling `exec_sql`, touch the shadow over-grant, or trip a standing hold. Otherwise, on all criteria met and PK approval at each gate: report result per the result template, then stop.

---

## Notes

- **Mechanism (PK Gate-1 ruling 2026-07-23): supabase-js query-builder, EF-only.** No new RPC, no migration. Smallest blast radius; rollback = EF redeploy only. Caveat carried into the Stop condition: the `c.brand_avatar`→`brand_stakeholder` role join must be expressible cleanly via PostgREST embedding (the role_code filter lives on the joined `brand_stakeholder`); if not, STOP → PK (the typed-RPC alternative needs a fresh PK decision, it is de-scoped here).
- **Honest risk framing:** `exec_sql` is SECDEF + `service_role`/`postgres` EXECUTE only, interpolated values are internal pipeline data — proactive latent-hazard hardening + a typed seam, NOT an anon-exposed injection patch. No security advisor flags `exec_sql`; the interpolation is a design finding, not an advisor hit.
- **Parity is currently unambiguous because the candidate set is size 1** (one active avatar per brand) with an unordered `LIMIT 1`; the resolver must preserve that exact behaviour, not "improve" ordering — determinism-by-policy is AGP v2 step 5+, explicitly out of this slice.
- **Seam-boundary open question (implementation detail, parity held either way):** `lookupAvatar` today returns `{talking_photo_id, voice_id}` and `avatar_selected_by` is derived by the caller. The implementer draws the typed seam explicitly — either keep the 2-field contract (caller keeps `avatar_selected_by`) or widen the return — with strict parity held either way. Decide at build; not a Gate-1 blocker.
- **This brief NAMES; it does not implement.** Every irreversible step (code merge, EF deploy) is a separate PK gate above this lane. brief-author's first code/DB-lane draft — treated with candidate-level scrutiny at Gate 1 (orchestrator review: clean, one strengthening — deployed-worker state is live-verified this session, not merely asserted).
