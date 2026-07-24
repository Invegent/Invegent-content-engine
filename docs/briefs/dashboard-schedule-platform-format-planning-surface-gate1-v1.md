# Brief — Dashboard Client Schedule: platform + format planning surface (Gate-1 scoping)

**Created:** 2026-07-24 Sydney
**Lane:** **S2 · Dashboard Schedule — platform + format planning surface** (PK priority 1, URGENT)
**Author:** S2 worker session (READ-ONLY)
**Executor:** TBD by PK at Gate 1
**Status:** **DRAFT — awaiting PK Gate 1.** Authorises NO build, NO schema change, NO write path, NO deploy.
**Canonical ID:** **NOT SELF-ALLOCATED.** ID allocation is a central/PK act. This document claims no `cc-` number and no register version.
**Lane classification (CCF-02):** PRODUCT_PROOF · **Tier T1** (read-only scoping; docs only). Proposes T2 successors.
**Result file:** `docs/briefs/results/…` — created on completion of the first implementing slice, not by this brief.

---

## 0 · Stale-ref gate (mandatory precondition — PASSED)

| Repo | Fetched w/ prune | Upstream SHA (fetched this session) | Working base | Verdict |
|---|---|---|---|---|
| `Invegent-content-engine` (CE) | yes | `ad4a6a944027897672764c1540f53890e027c2ee` | `ad4a6a9` on `main`, parity **0/0**, `ls-remote` agrees | **AT UPSTREAM — accepted** |
| `invegent-dashboard` | yes | `524ca6d1c25da0c37ec014c7612a6623ce38b3bd` | local checkout `fda2b512…` on branch **`tmr-template-intake-ui-v0`**, **0 ahead / 5 BEHIND** | **STALE — gate TRIPPED** |

**The gate caught a real staleness, larger than the one S6 recorded.** S6's third wake rebased onto
`6fe8d1e` (3 behind). Two further commits have landed since:

| Commit | Change | Effect here |
|---|---|---|
| `164732b` | `fix(security): cc-0054 — validate caller-controlled client identifiers at five exec_sql sites` | **The five cc-0054 sites are no longer unguarded.** S6 §0.0's "all five still PRESENT and unguarded" is stale. |
| `524ca6d` | `test(security): cc-0054 S-1 mutation test + narrowly-scoped test-harness JSX exception` | cc-0054 containment is the deployed state (memory: deployed 2026-07-24, `dpl_DkYuG4vHSsaoGggvREx2aRkjmGXp`) |

**Action taken:** every dashboard fact in this brief was read from the fetched ref via
`git show origin/main:<path>`. **The shared checkout was NOT pulled, checked out, branched or
otherwise mutated** — this lane wrote no file in `invegent-dashboard` and ran only `git fetch --prune`
(a ref update, no working-tree effect).

> Had this brief been authored from the working tree it would have described a five-site unguarded
> `exec_sql` surface that no longer exists, and would have missed `164732b` entirely.

---

## Task

Scope — **not build** — the operator surface that lets a client's publishing schedule be planned by
**both platform and format**, per PK's priority 1. Establish what exists, what is genuinely missing,
what is merely unsurfaced, and a slicing whose first increment is small enough to prove.

---

## 1 · The premise correction — this surface is not absent, it is *unjoined*

The seed framing for this lane states the planning surface is "not built, not designed, and appears in
no reviewed packet." **That is not what the code shows, and the correction changes the shape of the
work.**

`app/(dashboard)/clients/page.tsx:574-627` already stacks **three** sections on one tab
(`/clients?tab=schedule`):

| # | Section | File | Axis | Mode |
|---|---|---|---|---|
| 1 | **Schedule editor** | `components/clients/ScheduleTab.tsx` (412 lines) | platform × day × time | **WRITE** |
| 2 | **Publishing Plan Pyramid** | `components/clients/PublishingPlanPyramid.tsx` ← `actions/publishing-plan-pyramid.ts` | platform × **format** | READ-ONLY (`editable_status: 'disabled'`) |
| 3 | **Client Capability Overlay** | `components/clients/ClientCapabilityOverlay.tsx` | global capability × this client | READ-ONLY |

So **both axes are already on the same tab, in adjacent panels.** What does not exist is the **join**:
no surface — and no schema — binds a format to an *individual schedule row*. The editor knows
Monday-09:00-Facebook; the pyramid knows Facebook-is-40%-`image_quote`; nothing says *what this
Monday 09:00 will be*.

The two panels already acknowledge the seam in authored copy
(`PublishingPlanPyramid.tsx:206-209`): *"This differs from the Schedule editor's weekly target…"*

> **The deliverable is therefore a join and a mode, not a new console.** Scoping it as greenfield
> would duplicate `get_publishing_plan_pyramid` and re-litigate a shipped read-only surface.

### 1.1 A second, sharper correction — the schedule write path EXISTS

`docs/briefs/dashboard-redesign-gap-analysis-brief-v1.md` §0.8 states: *"There is no operator write
path to schedule or format anywhere in the dashboard — every change today is a hand-run SQL
statement."*

**That is false for schedule and true for format.** Verified read-only at `origin/main`:

- `actions/schedule.ts` → `savePublishSchedule(clientId, platform, slots)` → `public.save_publish_schedule(p_client_id uuid, p_platform text, p_slots jsonb)`
- Catalog-verified live: `save_publish_schedule` and `get_publish_schedule` both exist, `provolatile='v'`.
- Reachable from the UI: `ScheduleTab.tsx:171-186` "Save schedule" button, one call per connected platform.

S6's §0.8 conclusion — *"both new surfaces are read-only by necessity, not choice"* — does not
follow for the schedule axis. **An operator can already change platform-and-time from the dashboard
today.** The format axis is the read-only one.

This matters for slicing: extending an existing write surface is a different (and higher) risk tier
than adding the first one.

---

## 2 · Q1 — what "planning by platform and format" means concretely

The phrase collapses **four distinct altitudes**. Conflating them is what produces an unbuildable
requirement, so this brief names them separately and states which exist.

| Altitude | Question it answers | Exists today? | Where |
|---|---|---|---|
| **A · Capability** | what *can* run on this platform at all | **LIVE** | `t."5.3_content_format".platform_support`; surfaced at `/create/format-capability`, `/system/formats`, PPP Layer 2, and `/create/capability-matrix` (**flag-gated dark** — `sidebar.tsx:74` conditional spread) |
| **B · Policy / mix** | what *should* run, in what proportion | **LIVE, read-only** | `t.platform_format_mix_default` → `get_publishing_plan_pyramid` → PPP Layer 2 (`effective_mix_pct`, `mix_source`, `blocked_reasons`). **No operator write path.** cc-0079 Slice 2 changes this data. |
| **C · Per-slot demand** | what *will* run in **this** Monday-09:00 row | **DOES NOT EXIST** — not in UI, **not in schema** (§4) | — |
| **D · Outcome** | what *did* run, and did it match | **unsurfaced, derivable** | `ice_ro.slot_status ⋈ draft_status ⋈ publish_status` |

**PK's requirement lands on C, and C is the only one with no substrate at any layer.**

### 2.1 What the operator sees, chooses and changes

Stated concretely, at altitude C, per client:

**Sees** — the existing platform × day × time grid, with each enabled cell additionally carrying:
1. a **mode** — *fixed* (this row demands one named format) or *policy* (this row takes whatever the
   weekly mix allocates);
2. for *policy* rows, **what the mix would actually allocate this week** for that platform and slot
   ordinal — computable today from live functions (§4);
3. a **validity mark** — whether that format is publishable on that platform (`platform_support`);
4. (later slice) the **outcome** — what the Advisor decided and what actually published.

**Chooses** — mode per row; and for *fixed* rows, a format drawn **only** from the platform-valid,
capability-clear set. Never a free-text format.

**Changes** — the schedule rows. Nothing else. Format policy (altitude B) remains a governed data
change outside the dashboard; this brief proposes no mix editor.

### 2.2 Three display invariants inherited from prior reviewed work — binding, not restated for flavour

1. **Demand, decision and outcome are three fields, never one** (gap-analysis §0.6). `m.slot.format_chosen`
   is written and then read by nothing in production — **independently re-verified for this brief**: a
   grep across all 50 `supabase/functions/*` directories returns exactly two files, both
   `obs-observer` telemetry (`raw_observation_0a.ts:67,92`; `read_client.ts:28,58`). Every renderer and
   publisher keys off `m.post_draft.recommended_format`. **A surface that renders the schedule's format
   as authoritative would encode a false authority.**
2. **Mode is a first-class attribute** (gap-analysis §0.7). The same divergence is a *violation* in fixed
   mode and *routine* in policy mode. One visual cannot serve both.
3. **No composite health number** (gap-analysis §0.10c). Format-authority divergence and absolute
   publish outcome are blind to each other's failure class.

---

## 3 · Q2 — which routes and components it lives in or replaces

**Recommendation: extend `/clients?tab=schedule` in place. Add no new route.**

| File (at dashboard `origin/main` `524ca6d`) | Role in this lane |
|---|---|
| `app/(dashboard)/clients/page.tsx:574-627` | **host** — the schedule tab block; where a new panel mounts |
| `components/clients/ScheduleTab.tsx` | **extend** — the platform × day × time grid gains a per-cell mode/format affordance (later slice) |
| `components/clients/PublishingPlanPyramid.tsx` | **keep, do not duplicate** — Layer 1 schedule summary + Layer 2 format matrix already ship |
| `actions/publishing-plan-pyramid.ts` | **reuse** — `get_publishing_plan_pyramid` already returns both `schedule_summary[]` and `format_matrix[]` |
| `actions/schedule.ts` | **the write boundary** — `save_publish_schedule` today accepts only `{day_of_week, publish_time, enabled}` |
| `components/clients/ClientCapabilityOverlay.tsx` | untouched |

**Explicitly NOT the host:**

- `/create/capability-matrix` — altitude A, and **dark** (flag-gated in nav at `sidebar.tsx:74`).
- `/create/format-capability` — altitude A, global not per-client.
- A new top-level nav entry — the governing IA spec `docs/dashboard/operator-journey-ia-v1.md` is
  **unratified** (gap-analysis §1.2), and the registers carry a standing *"DO NOT START: broad
  dashboard IA overhaul"*. Extending an existing tab needs neither.

**cc-0054 posture.** `app/(dashboard)/clients/page.tsx` calls `exec_sql` at six sites
(`:110,132,152,185,193,201`) and is client-scoped. It is **not** one of the five cc-0054 authoritative
targets, and `164732b`/`524ca6d` have since landed the caller-identifier validation. This brief still
proposes **no** client-conveyance mechanism and encodes `?client=` in nothing — client scope is drawn
as a **state**, per gap-analysis §9.4. Any implementing slice re-verifies the containment state at its
own gate rather than trusting this paragraph.

---

## 4 · Q3 — the data contract, and whether it exists

All rows below were verified **first-hand this session** unless the Verified column says otherwise.

| Object | Exists? | Verified how | Note |
|---|---|---|---|
| `t.platform_format_mix_default` | **YES** | cited — cc-0079 Slice 2 packet v2 §6 pins 17 current rows by identity | Altitude B source. **cc-0079 Slice 2 renormalizes it and is queued, not applied.** |
| `t."5.3_content_format".platform_support` | **YES** | cited (arch brief §6.1) + consumed in `actions/capability-matrix.ts:40-45`, which documents the three-state semantics (present-true / present-false / **absent ⇒ unsupported**) | Altitude A source |
| `m.build_weekly_demand_grid(p_client_id uuid, p_week_start date)` | **YES, live** | `pg_proc` catalog read this session | **Read by zero dashboard files** (grep at `origin/main`) |
| `m.allocate_week_formats(p_formats jsonb, p_n integer)` | **YES, live** | `pg_proc` catalog read this session | **Read by zero dashboard files** |
| `m.slot.format_chosen` | **YES as a column** | `ice_ro.slot_status` column list, this session | **Read by no production worker** — §2.2. Telemetry only. |
| `public.get_publishing_plan_pyramid(p_client_id uuid)` | **YES, live** | `pg_proc` catalog read this session | Already returns `schedule_summary[]` **and** `format_matrix[]` |
| `public.save_publish_schedule(p_client_id, p_platform, p_slots jsonb)` | **YES, live** | `pg_proc` catalog read this session | The existing write boundary |
| **A per-row format or mode column on `c.client_publish_schedule`** | **NO** | **`pg_catalog` read this session** — the table has exactly 8 columns: `schedule_id · client_id · platform · day_of_week · publish_time · enabled · created_at · updated_at` | **This is the schema gap. Altitude C has no substrate.** |

> **Verdict: the contract for altitudes A, B and D exists and is live. The contract for altitude C —
> the one PK's requirement actually names — does not exist at any layer.**

**Non-claim on method.** An `information_schema.columns` read for `c.client_publish_schedule` returned
**0 rows** — that view is privilege-filtered and `ice_readonly` holds no grant on `c.*`, so it is *not*
evidence of absence. The column list above comes from `pg_catalog` (`pg_attribute`/`pg_class`), which
is not privilege-filtered. Recording the distinction so no later lane reads a privilege artefact as a
schema fact.

---

## 5 · Q4 — genuinely missing vs merely unsurfaced

### 5.1 Genuinely missing (needs new substrate — cannot be built read-only)

| # | Missing thing | Owner / precondition |
|---|---|---|
| M1 | **`format_mode` + `requested_format` on `c.client_publish_schedule`** (the arch brief's **R4**) | schema change, T2; own Gate 1 |
| M2 | **A governed format write path.** `save_publish_schedule` accepts only day/time/enabled; extending its `p_slots` contract is an RPC change, not a UI change | T2/T3; own gate |
| M3 | **Format authority resolution** (arch brief **R3** — the resolver as sole writer of `recommended_format`) | **cc-0079 Slices 3–4.** Until it lands, any per-row format is *declared-but-not-consulted* |
| M4 | **Error / empty / degraded substrate.** Confirmed this session at `origin/main`: **no `error.tsx`, `global-error.tsx` or `not-found.tsx` anywhere in `app/`** | dashboard code owner; own gate |

> **M3 is the sharpest constraint in this brief.** Building M1+M2 without M3 ships a control the
> production path does not read — the exact `declared-control-not-consulted` failure mode. **A
> per-slot fixed-format picker built today would be decorative**, because `image-worker` /
> `video-worker` / the publishers key off `recommended_format`, which the Advisor writes last.

### 5.2 Merely unsurfaced (data live today, buildable read-only)

| # | Unsurfaced thing | Source |
|---|---|---|
| U1 | **What the mix would allocate this week**, per platform, per slot ordinal | `m.build_weekly_demand_grid` + `m.allocate_week_formats` — both live, both unread by the dashboard |
| U2 | **Per-slot authority ledger** — demand · allocated · Advisor · final · outcome | `ice_ro.slot_status ⋈ draft_status ⋈ publish_status` (gap-analysis §0.8) |
| U3 | **Platform-validity of each allocated format** | `platform_support`, already in the PPP payload |
| U4 | **Per-platform stage funnel + reconciliation state** | `ice_ro` views (gap-analysis §0.10a/b) |

**The gap is therefore asymmetric:** *seeing* the plan is unsurfaced-but-buildable; *setting* the plan
per slot is genuinely missing and gated on cc-0079.

---

## 6 · Finding — a live defect in the existing schedule editor (surfaced, NOT actioned)

Raised because it lands **inside the surface being scoped**, and any per-slot format grid inherits it.

**`ScheduleTab.tsx` lets an operator enable a Sunday slot that can never materialise.**

- UI: `ScheduleTab.tsx:6-7` — `ALL_DAYS = ["Sun","Mon",…]`, `DAY_ORDER = [1,2,3,4,5,6,0]`. Sunday is
  written as `day_of_week = 0` (`toggle()` / `addTime()` → `savePublishSchedule`).
- CE: `m.compute_rule_slot_times` — read first-hand this session via `pg_get_functiondef` —
  matches `WHERE EXTRACT(isodow FROM d)::integer = v_day_of_week`. **`isodow` returns 1–7; Sunday is 7.**
  `day_of_week = 0` matches nothing.
- Effect: the toggle saves successfully, the UI shows "Saved ✓", and **zero slots are ever produced**.
  Silent, no error, no surface.

**Live data (read-only, `ice_ro.slot_status`, all schedule-sourced slots):** slots exist on isodow
**1–5 only** (233/230/237/242/214, 14 schedule rows each). **Zero on Saturday, zero on Sunday** —
consistent with the arch brief's finding that all Sunday rows are currently `enabled=false`, i.e. the
defect is **dormant, not live**. *(Confirming that no Sunday row is currently enabled requires a read
of `c.client_publish_schedule`, which the R0 path cannot reach — named as a verification handoff to
`db-rls-auditor` / an R1 read, not asserted here.)*

**Per PK's blocker rule, this is NOT claimed as blocking work and NOT actioned.** It does not block
scoping. The minimum containment, if PK elects it, is one of: disable the Sunday column in
`ScheduleTab`, or reconcile the convention — **PK's call, not this lane's.** No change is proposed,
designed or sequenced here.

---

## 7 · Q5 — recommended slicing

Ordered by (operator value ÷ blast radius). **Only Slice A is proposed for immediate Gate-1 approval.**

### Slice A — "What this week actually allocates" (READ-ONLY) ← **recommended first slice**

Add one read-only panel to the existing schedule tab that calls the two live allocator functions for
the selected client's current ISO week and renders, per platform, the ordered per-slot format
allocation with each entry marked valid/invalid against `platform_support`.

- **Tier:** T2 (read-only dashboard). **New schema:** none. **New RPC:** none. **Write path:** none.
- **New route:** none. **cc-0054 target files touched:** none.
- **Depends on cc-0079 resolution:** **no** — it renders *demand/allocation*, explicitly labelled as
  such, never as the final format (§2.2 invariant 1).
- **Why first:** it is the smallest thing that makes altitude C legible, and it is the only proposal
  here with a **pre-existing falsifiable oracle**.

**Proof (this is the slice's whole point).** `docs/briefs/cc-0079-slice-2-apply-packet-v2.md` §1
already records, machine-derived, what the live allocator returns for `property-pulse` at N=5:

| Platform | Expected panel output **today** (pre-Slice-2) | invalid |
|---|---|---|
| linkedin | `carousel · carousel · text · image_quote · video_short_kinetic` | 3 of 5 |
| instagram | `carousel · carousel · image_quote · video_short_kinetic · video_short_stat_voice` | 2 of 5 |
| facebook | `image_quote · image_quote · carousel · text · video_short_kinetic` | 1 of 5 |

The panel **PASSES** only if it reproduces that table before cc-0079 Slice 2 applies, and the §1
AFTER table (**0 invalid of 5 on every platform**) once it does. **6 of 15 → 0 of 15** becomes an
operator-visible fact rather than a figure in a packet.

> This also gives Slice 2 a post-apply operator proof it does not currently have.

### Slice B — Per-slot authority ledger (READ-ONLY)

Demand · allocated · Advisor · final · outcome as **five distinct fields** (gap-analysis §0.8, §6),
mode-aware, no composite health number. Buildable from `ice_ro` today. Independent of cc-0079.

### Slice C — `format_mode` + `requested_format` on the schedule (SCHEMA — **HOLD**)

The arch brief's **R4**. **Do not start before cc-0079 Slice 3/4 (the resolver, R3) lands** — see
§5.1 M3. Shipping C without R3 produces a control production never reads.

### Slice D — Format write path (**OUT OF SCOPE — named, not designed**)

Extending `save_publish_schedule` to carry format/mode. **This brief proposes no such surface.** Its
safety would depend on authorization that does not exist — every authenticated account is currently
operator-equivalent. **Not proposed, not designed, and the authz lane is not reopened** (Slice 0.5 and
Slice 1 remain PARKED BY PK).

---

## Scope

**In scope:** read-only scoping analysis; evidence-cited answers to the five seed questions; a
recommended slicing with a falsifiable first slice; findings and open questions surfaced to PK.

**Out of scope:** any dashboard file change · any schema change · any write path · any format-authority
resolution (cc-0079's) · any authorization design or role model · any IA overhaul or new nav entry ·
any `cc-` ID or register version · applying cc-0079 Slice 2 · fixing §6.

## Allowed actions (this lane, already complete)

- `git fetch --prune` + read-only ref reads in both repos; dashboard files read via `git show origin/main:<path>`.
- Read-only CE repo reads (`Read`/`Grep`/`Glob`) and read-only greps over `supabase/functions/`.
- Read-only DB via the R0 path (`python scripts/db-read.py`): `ice_ro` views + world-readable `pg_catalog`.
- Authoring this one document in `docs/briefs/`.

## Forbidden actions

- **No write to any file in `C:\Users\parve\invegent-dashboard`.** (Honoured — none written; the shared checkout was not pulled or checked out.)
- No code, no DB mutation, no DML, no migration, no deploy, no commit, no push.
- No `cc-` ID self-allocation; no register version claimed.
- No approval of this brief — **Gate 1 is PK's.**
- No proposal of a surface whose safety depends on authorization that does not exist; no reopening of the authz lane.
- No broad dashboard IA overhaul.
- Standing hold-states honoured: cc-0079 Slice 2 **queued, NOT applied** · authz Slice 0.5 / Slice 1 **PARKED BY PK** · `brand_payload_contract_unresolved` incident untouched.

## Success criteria

1. Base proven against fetched upstream in both repos, staleness described rather than silently absorbed. ✅ §0
2. Every material claim carries a file, catalog or packet citation; first-hand vs cited is distinguished. ✅
3. All five seed questions answered. ✅ §2 (Q1) · §3 (Q2) · §4 (Q3) · §5 (Q4) · §7 (Q5)
4. First slice is read-only, touches no cc-0054 target, needs no schema, and has a falsifiable pass criterion. ✅ §7 Slice A
5. Nothing approved, applied, committed or mutated. ✅

## Stop condition

**This brief ends the lane.** Return frozen path + sha256 to the control tower for recording. No
implementation begins until PK rules at Gate 1.

---

## Open questions for PK (Gate 1)

1. **Approve Slice A only, or Slice A + B together?** Recommendation: **A only** — it self-proves against Slice 2.
2. **Does Slice A run before or after cc-0079 Slice 2 applies?** Recommendation: **before** — it captures the pre-state operator-visibly and then demonstrates the improvement.
3. **§6 Sunday defect** — contain now (disable the Sunday column), reconcile the `day_of_week` convention, or leave dormant and record? *(A decision, not a request to act.)*
4. **Is a per-slot fixed-format control wanted at all**, given it stays decorative until cc-0079 R3 lands — or is policy-mode-only planning sufficient for now?
5. **Allocate a `cc-` ID and register block to this lane**, or keep it unnumbered as scoping?

## Non-claims

This brief does not claim: that Slice A is costed or designed (it is scoped); that any surface here is
approved; that the format-authority problem is solved (it is cc-0079's); that cc-0054 containment is
verified live *by this lane* (read from `origin/main` commit messages + prior records — an implementing
slice re-verifies at its own gate); that no Sunday schedule row is currently enabled (§6 — R0 cannot
reach `c.*`; named as a handoff); that `docs/dashboard/operator-journey-ia-v1.md` is ratified (it is
not); or that the dashboard working tree's state is relevant to anything above (it is 5 commits stale
and was deliberately not used).

## Evidence basis

CE `ad4a6a9` (fetched, parity 0/0). Dashboard **`origin/main = 524ca6d`** (fetched; read via
`git show`, shared checkout left at `fda2b51` on `tmr-template-intake-ui-v0`, **not** pulled).
Live catalog + `ice_ro` reads via `scripts/db-read.py` (R0, zero-prompt, read-only), 2026-07-24:
`pg_proc` (8 RPCs), `pg_get_functiondef(m.compute_rule_slot_times)`, `pg_attribute`
(`c.client_publish_schedule`), `information_schema.columns` (`ice_ro`), `ice_ro.slot_status` isodow
distribution. Repo greps: `format_chosen` across all 50 `supabase/functions/*`; `ice_ro.*`,
`platform_format_mix|format_chosen|build_weekly_demand_grid|allocate_week_formats|platform_support`,
`client_publish_schedule`, and error-substrate enumeration across dashboard `origin/main`.
Prior artefacts consulted: `docs/briefs/cc-0079-schedule-format-authority-architecture-gate1-v1.md` ·
`docs/briefs/cc-0079-slice-2-apply-packet-v2.md` · `docs/briefs/dashboard-redesign-gap-analysis-brief-v1.md`
(sha256 `3beb67e7…` — **recomputed and matched this session**) · `docs/briefs/_template_brief.md`.
**No write was issued in this lane.**
