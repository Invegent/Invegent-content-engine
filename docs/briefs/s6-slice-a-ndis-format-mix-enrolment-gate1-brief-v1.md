# Brief cc-NNNN — S6 Slice A: NDIS Yarns format-mix enrolment (dry-run-gated, zero-code onboarding proof)

**Created:** 2026-07-31 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor:** Claude Code (orchestrator + subagent chain) — PK at every gate
**Status:** draft — awaiting PK Gate 1
**Result file:** `docs/briefs/results/cc-NNNN-s6-slice-a-ndis-format-mix-enrolment.md` (created on completion)

> **cc-ID NOT self-allocated** — control tower allocates centrally (precedent: `durable-platform-support-intersection-demand-grid-gate1-v2.md:10`).
> **Lane classification (CCF-02):** SAFETY_GATE. **Tier for THIS Gate-1 lane: T1** (investigation + dry-run proof only — no write). The eventual single-row enrolment DML is its own later apply gate, tiered **T3** per the governing brief (`capability-expansion-format-reachability-gate1-brief-v1.md` §4, commit `fde6bbc`, branch `claude/gate-1-capability-expansion-paw1ew`) because it changes live slot materialisation for a client. This brief does not authorise that write.
> **Predecessor:** S6 Slice B1 (cross-client proof-event trail alignment) — **COMPLETE**, `docs/briefs/results/capability-expansion-b1-result-v1.md`, register v6.94, commit `e804112`. This brief is the next slice in the governing brief's own recommended order (`B1 → F → A → E → C → B2 → D`, §2) — chosen ahead of F on the strength of a fresh six-axis comparison (below), not merely because it is next in that list.

---

## Why Slice A over the other five (comparison, live-verified 2026-07-31 post-B1)

| Axis | A (this brief) | F (dashboard 7-state) | B2 (broaden assignments) | C (YouTube onboarding) | D (animated formats) | E (video_short_stat reliability) |
|---|---|---|---|---|---|---|
| Capability reach added | Indirect but real — improves steering quality across every already-`ready` cell of an enrolled brand | None directly (visibility only) | Direct, incremental, one proof at a time | Gated — 0 until prereqs clear | 0 now; largest *potential* later | 0 — protects existing cells only |
| Platform/format coverage unlocked | None directly (steering, not eligibility) | None | Yes — portrait 4:5, story 9:16, LinkedIn 1200×628 per client | YouTube column, but blocked | Animated formats, but blocked on code+taxonomy | None |
| Dependency on S5 | **Real** — format-policy-adjacent; must not jump the Track-B queue (OQ4) or precede the S7 `platform_support` fix without a dry-run proof (OQ3) | None | None directly | None directly | None directly | None (passive/observational) |
| Asset sufficiency | Fully sufficient — pure DML, no creative assets needed | Fully sufficient — no assets, no DB | Plausible (brand kits reported complete, not independently verified) but needs a real render→draft→publish proof per template×client | N/A for the profile row; blocked entirely without a YT-supported format (none exists today) | Least sufficient — needs new worker render path + un-fenced templates | N/A — no new assets, but feeds the B-roll pool gap (1 governed clip vs ratified floor 3) it doesn't fix |
| Advances zero-code onboarding proof | **Yes — uniquely.** A single governed DML row onboards a brand into deeper multi-brand steering; zero code, zero deploy | No (dashboard code, separate repo) | No (broadens an already-enrolled brand's templates, not brand onboarding) | No (needs PK-side OAuth, a manual action) | No (the opposite — new worker code + deploy) | No (observational) |
| Smallest safe implementation boundary | Small **if** scoped to one brand + a mandatory pre-write dry-run (this brief's design) | Smallest of all six — but delivers the least on every capability axis | Medium-large — T3, one proof chain per template×client | Large — T3, multi-step, secret-adjacent | Largest — new code + EF deploy + taxonomy flip | Smallest (T1, observation-only) but does not unlock anything |

**Verdict:** Slice A is the only slice that directly advances the zero-code onboarding proof PK named, and its principal risk (the demand grid's blindness to `platform_support`, live-reconfirmed below) is fully containable inside a small, safe boundary by making the dry-run proof a hard prerequisite rather than an assumption — which is what this brief scopes. Slice F remains the correct **second** move (smallest absolute boundary, zero risk, no capability gain) and is not displaced — it can run in parallel in the separate `invegent-dashboard` repo without colliding with this brief.

## Live ground truth re-confirmed this session (2026-07-31, post-B1, via `execute_sql` against `mbkmaxqhsohbtwsqolns`)

- `c.client_control_tower_enrollment` — **exactly one row**: Property Pulse, `control_type='format_mix'`, `enabled=true`, `rollout_stage='enforce'`, seeded `2026-06-28` "to preserve existing Phase 1 Property Pulse hardcoded enrollment behaviour." No other brand enrolled. Confirms governing brief §1.1 unchanged.
- `m.build_weekly_demand_grid` function body **does not reference `platform_support`** (`pg_get_functiondef(...) ILIKE '%platform_support%'` → `false`). Confirms governing brief §1.2 unchanged — the structural gap this brief's dry-run must guard against is still live today.
- `c.client_publish_profile` youtube rows exist only for `ndis-yarns` and `property-pulse`; **CFW and Invegent still have zero** — confirms Slice C remains genuinely blocked (context for why C is not the pick).
- Template-assignment breadth (25 rows, live read): Property Pulse holds ~20 `visually_approved`/`smoke_rendered` assignments; NDIS/CFW/Invegent hold only the four `production_proven` rows this session's B1 apply just aligned, plus one further NDIS `visually_approved` row on the video template (`c11bb8ab…`, row 19) — confirms the breadth imbalance this whole lane exists to close, and that B2 is real future work, not yet started.
- Row-19 `video_short_stat` reliability: **8 succeeded / 5 timeout = 38.5%** timeout rate, unchanged from the governing brief's citation — confirms Slice E's premise is still live and untouched (context only; not the pick).
- Track-B queue hold ("Slice 2 awaiting 'S7 GO — Slice 2 window open'") is the most recent repo record found (`docs/00_sync_state.md:550`, an older register block); no closure of that hold was found in a newer entry. **OQ4 (queue currency) is therefore still open** and is carried into this brief's Forbidden actions and Stop condition, not assumed either way.

---

## Task

Investigate and prepare — **do not execute** — the smallest safe governed enrolment of **NDIS Yarns** (PK-supplied: strong scheduled demand) into `c.client_control_tower_enrollment` (`control_type='format_mix'`), as a **zero-code, zero-deploy** proof that a new brand can be onboarded into the platform's multi-brand format-mix steering purely through governed data. The write itself (one INSERT-or-activate row) is real but small; the actual risk is entirely in whether `m.build_weekly_demand_grid` / `m.materialise_slots` would allocate NDIS a `platform_support=false` format once enrolled — a risk this brief's own executor must retire with a **read-only dry-run simulation before any write is proposed for apply**, not assume away. This brief covers investigation + the dry-run design + freezing the eventual apply packet's shape; the apply itself is a separate, later PK gate (per Convention 2 it may be pre-authorised as part of a pinned sequence, but is not authorised by this brief).

## Source context

- `docs/briefs/capability-expansion-format-reachability-gate1-brief-v1.md` (commit `fde6bbc`, branch `claude/gate-1-capability-expansion-paw1ew`, not on main) — the governing brief; §2 Slice A, §5 Slice-A dependencies/STOPs, §7 ladder note (Slice A touches no selectability rung directly), OQ3, OQ4.
- `docs/briefs/results/capability-expansion-b1-result-v1.md` — predecessor slice, COMPLETE, establishes the audit/dry-run/live-guard pattern this brief reuses.
- `supabase/migrations/20260628120000_control_tower_p1_enrollment_format_mix.sql` — `c.client_control_tower_enrollment` DDL; seeded PP-only (:16-18, 32-36); write RPC/enrolment API explicitly deferred to P2 (:27-30), so today's enrolment path is a raw governed DML act, not an API call.
- `supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql` — `m.build_weekly_demand_grid` / `m.materialise_slots` / `m.allocate_week_formats`, the functions the dry-run must exercise read-only.
- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md` — the demand grid never consults `platform_support` (:28, live-reconfirmed above); the durable fix (S7) is design-only, sequenced third, NOT this brief's scope.
- `docs/briefs/cc-0079-slice-2-external-review-record-v1.md:5` — the Track-B strictly-serial queue hold ("S7 GO — Slice 2 window open"); this brief must not jump or absorb it (OQ4).
- `docs/00_action_list.md:592` — F-AIW-PREF-COL-HARDCODE must be fixed before ANY platform-specific preferred-format config is set; this brief sets no preferred-format config, but any future slice building on this enrolment must respect that fence.
- `docs/00_action_list.md:588, :591` — the PARKED `t.platform_format_mix_default` subsystem; do not wire it, independently or otherwise.
- `CLAUDE.md` — Convention 3 risk tiers, CCF-02 lane classification, PK hard stops on deploy/merge/migrate, S5 boundary.

## Scope

**In scope:**
- Read-only live verification of every claim above (already performed once in this brief; a fresh executor re-confirms at its own Gate 1 in case time has passed).
- Designing and specifying the read-only dry-run simulation: given a hypothetical NDIS `format_mix` enrolment row, compute (via `SELECT`-only calls into `m.build_weekly_demand_grid`/`m.materialise_slots` logic, or an equivalent read-only reproduction of their allocation logic) what formats would be allocated to NDIS across its next scheduling window, and check every allocated format against NDIS's live `platform_support` state per platform. Zero rows written.
- Drafting the eventual single-row apply packet (assignment shape, guards, rollback) as a **frozen draft**, per the B1 precedent (hash-pinned, guard-gated, byte-exact rollback) — for its OWN future Gate 1, not issued by this brief.
- Surfacing OQ3 (may A precede the S7 fix on the strength of a dry-run proof, or must the durable fix land first) and OQ4 (is the Track-B queue still current, and does Slice A have to sequence behind it) to PK as named decisions this brief cannot resolve itself.

**Out of scope:**
- Any actual INSERT/UPDATE into `c.client_control_tower_enrollment` or any other table.
- The S7 durable `platform_support`-intersection fix itself (separate design-only lane, sequenced third per the governing brief).
- CFW/Invegent enrolment (NDIS only, per PK-supplied priority and to keep the boundary smallest).
- Any S5 seven-day evidence schedule or cap-amendment work.
- Slices B2, C, D, E, F (each is its own future lane).

## Allowed actions

- Read repo docs/migrations/worker source; read-only live verification via `db-rls-auditor` or direct read-only `execute_sql`/R0 views for every claim marked "verify live."
- Design and document the read-only dry-run method precisely enough that a later executor can run it without further judgment calls.
- Draft (not issue) the eventual apply packet for the NDIS enrolment row, including its guards and rollback, as a frozen artifact awaiting its own Gate 1.
- Author the result doc; surface OQ3/OQ4 to PK explicitly.

## Forbidden actions

- **No production mutation of any kind:** no DML/DDL, no migration apply, no EF deploy, no enrolment row actually written, no cron/schedule change, no `platform_support` flip, no template/assignment/status change.
- **No S5 overlap:** do not touch, duplicate, or amend the seven-day evidence schedule or cap-amendment work.
- **No S7 jump:** do not implement or propose implementing the durable `platform_support`-intersection fix itself; that is design-only, sequenced third, a separate lane.
- **Track-B queue respected:** do not reorder, jump, or absorb the S8 lever → S5 policy → S5 pilot → Slice 2 → cc-0080 queue; OQ4 currency is a named PK decision, not an executor assumption.
- **F-AIW-PREF-COL-HARDCODE:** no platform-specific preferred-format config may be set (this brief sets none, but a future executor must not drift into it).
- **PARKED `t.platform_format_mix_default`:** do not wire it.
- **CFW/Invegent stay out of this slice's write scope** (NDIS only) — broadening enrolment to other brands is a separate future Gate 1.
- **13-rung ladder / selector-ranking / `task_05bf8b3d`:** not directly touched by this slice, but any downstream lane built on this enrolment must still respect them.
- Deploy/merge/migrate remain PK hard stops; no secrets in any artifact; no new agents.

## Success criteria

- The dry-run method is specified precisely enough to run deterministically and read-only.
- Either (a) the dry-run has actually been run this pass and its result recorded (no `platform_support=false` allocation found, or the opposite, honestly reported), or (b) if not run this pass, it is named as the explicit next executor action before any apply draft is trusted.
- OQ3 and OQ4 are recorded as open PK decisions, not silently resolved either way.
- The eventual apply packet is drafted (frozen shape: one row, explicit guards mirroring the B1 pattern — pre-image check, rollback-symmetry, fail-closed row count) but **not issued** — it awaits its own Gate 1 after PK rules on OQ3/OQ4 and reviews the dry-run result.
- Zero production mutations. Result doc written per `docs/briefs/_template_result.md`. One register pointer only (Convention 1), and only once PK accepts this brief at Gate 1 — not before.

## Stop condition

Report result per the result template, then stop — do not proceed to apply, and do not begin any other slice (B2/C/D/E/F) in the same pass. If the dry-run finds a `platform_support=false` format would be allocated to NDIS, STOP and surface that as a hard blocker on Slice A until the S7 fix lands or a narrower per-format exclusion is separately PK-ruled — do not attempt to work around it inside this slice.

---

## Notes

- This brief itself is a **draft awaiting PK Gate 1** — nothing here is authorised for execution, including the dry-run (the dry-run is read-only and low-risk, but still requires Gate-1 sign-off before an executor spends the DB-read budget on it, per house practice).
- The comparison table above is this session's own synthesis (live-verified today), not a re-statement of the governing brief's original §6 recommendation (which named B1 first, F second, before OQ3-style axis weighting was requested) — recorded here so a future reader can see why Slice A was chosen over Slice F for the *third* move, not just accept the governing brief's original order uncritically.
- If PK's Gate-1 ruling on OQ3 is "the S7 fix must land first," this brief's dry-run design is not wasted — it becomes the acceptance test S7's own fix must pass before Slice A can proceed.
