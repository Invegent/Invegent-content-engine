# Result — cc-0079 Slice 2 halt ratified · AGP precedence ruling · Slice A Gate-1 · Sunday defect elevated (v6.23)

**Status:** `SLICE 2 HALTED CORRECTLY · TWO PK RULINGS ISSUED · ONE DEFECT ELEVATED · SEVEN LANES OWNED · ZERO PRODUCTION MUTATION`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers) · **Register pointer:** **v6.23**
**Date:** 2026-07-24 Sydney · **Executor:** Control Tower v2 (registrar)
**Predecessor:** v6.22 (`ad4a6a9`, pushed)

> **Zero production mutation across every lane in this pass.** No DML, no apply, no migration run, no
> deploy, no flag change, no promotion. Slice 2 did **not** apply.

---

## 0. Stale-ref gate — PASS

`git fetch --prune`; `HEAD` = `origin/main` = `ad4a6a9`, parity 0/0, re-verified immediately before commit.

## 1. 🔴 cc-0079 Slice 2 — HALTED AT GATE ④, and the halt was correct

S1 ran the gate chain and stopped: `db-rls-auditor` returned **`concerns`**. Gates ①②③ PASSED
(stale-ref · both artifacts re-hashed **from ref** · project confirmed `mbkmaxqhsohbtwsqolns`); gates
⑤⑥ PASSED independently; gates ⑦⑧⑨ **never reached**. **Production mutation: 0.**

**PK ruling, verbatim:** *"The halt was correct. A silent loss of Facebook, Instagram, and LinkedIn
would have been materially worse than delaying Slice 2."*

**The payload is CONFIRMED CORRECT — the harness is not.** S1 reproduced the §2 derivation exactly and
independently reproduced the §1 allocator table **character-for-character** — the figure v6.22 recorded
as *carried from the packet, not independently reproduced*. **6 of 15 → 0 of 15 is now verified, not
carried.** N=5 confirmed from `c.client_publish_schedule`, with a recorded caveat that the grid's
`weekly_slot_count` is a per-format count (max 2), not the platform total.

### The three must-fix defects

**M-1 (high) — the §5 assertions are SQL comments, not enforcement.** `-- must report exactly 17 rows
updated, else ABORT` and `-- A3..A5 assertions must all pass BEFORE COMMIT` are **comments**. No
`RAISE EXCEPTION`, no `DO` block, no conditional. Every statement commits regardless. §7 names
A1≠17 / A2≠7 / A3–A6 as STOP conditions and **none of those STOPs exists in the code** — the standing
`declared-control-not-consulted` failure mode, found *inside a safety harness*.

**M-2 (high) — the execution channel is unnamed, and the default channel cannot hold the transaction.**
**S1 tested this rather than reasoning about it:** two `execute_sql` calls landed on **different pooled
backends with different xids** (pid `3363924`/xid `3869213` → pid `3363941`/xid `3869214`). A `BEGIN` in
one call and a `COMMIT` in another **do not compose**. Failure window: run §4 statement-by-statement over
the routine MCP path and A1 commits alone → FB, IG **and** LI each hold **zero `is_current` rows**.
S1 then traced the consequence through `m.build_weekly_demand_grid`: its `candidate` CTE draws from
`platform_format_mix_default WHERE is_current` UNION `c.client_format_mix_override` (PP has 0 current
overrides), so with zero current rows **those three platforms vanish from the demand grid entirely and
NO ERROR IS RAISED.** A silent three-platform outage, strictly worse than today's state.

**M-3 (med) — A6 is unevaluatable as written.** A6 compares YouTube's 5 rows against a pre-apply
baseline, but §6's baseline query filters `WHERE platform IN ('facebook','instagram','linkedin')` —
excluding YouTube. A named STOP has no data to evaluate against. (S1 captured the missing baseline
anyway: fingerprint `db67ce6cdfe394e80cbec9dcee422c22`, 5 rows, sum 100.00.)

### The remediation is proven, not proposed

S1 validated both halves live and recorded the exact probes in its §10 so S5 inherits tested primitives:
a **single** `execute_sql` call **does** compose (5 statements, one session, one xid `3869215`), and
`DO $$ … IF <cond> THEN RAISE EXCEPTION …; END IF; END $$;` **aborts the entire call**
(`ERROR: P0001: A-PROBE FAILED: got 1, expected 99`). All three probes touched only temp tables and
session functions — **no production table, no residue.**

### Consequences recorded

The re-cut earns a **new sha256**, therefore external review **`f46949d3…` GOES STALE** — it is valid
only for `73dd7413…`. A fresh review is mandatory, and `db-rls-auditor` re-runs against the new hash.

## 2. 🟢 PK RULING — AGP resolver precedence (unblocks S4)

S4's Gate-1 brief surfaced a **blocker to specification**: the frozen Step B design claims its order is
*"exactly the order the dormant shadow resolver already uses."* **It is not — keys 1 and 2 are
transposed.** The shadow resolver ranks `is_primary` **first** (`agp-d01-3-shadow-resolver-telemetry.md:67-70`;
migration `20260618090000` `:155-156`, `:170`, `:176-177`, and the function `COMMENT` at `:300`).
Today both orders behave identically because `is_primary` is false on all 28 rows — **which is exactly
why it is dangerous:** the divergence is invisible now and becomes load-bearing the first time anyone
sets `is_primary`, which is precisely the multi-character world Step B exists to unlock.

**PK ruled — `is_default_host` before `is_primary`.** *"The designated default host is the governed
control Step B is introducing. An unset and currently ungoverned `is_primary` marker must not outrank
it."* The recorded resolver order is:

1. **explicit governed assignment, where applicable**
2. **`is_default_host`**
3. **`is_primary` — only as a secondary fallback**
4. **the remaining deterministic tie-breakers**

**The Step B specification must explicitly state that it INTENTIONALLY DIVERGES from the shadow
resolver rather than claiming to reuse its precedence unchanged.** The shadow resolver is recorded as
**superseded on ordering** — a carry, not an edit; it is applied SQL and must not be rewritten.

⚠ **Rank 1 is a key that appears in neither the shadow resolver nor the frozen design.** S4 is directed
to pin it by evidence — cite the mechanism if it exists, or record rank 1 as a **reserved position,
currently inapplicable**. It must not be manufactured to fill, nor silently dropped.

**Stage-2 proof — PK raised the bar above the brief's own design.** A size-one candidate set is **not
acceptable proof**. The proof requires **at least two simultaneously eligible candidates** —
**A** (`is_primary=true`, `is_default_host=false`) and **B** (`is_primary=false`, `is_default_host=true`)
— and **B must win**, plus a proof of the fallback behaviour when no default host exists. Recorded
constraint: constructing two eligible candidates implies either a read-only replay or the creation of
real rows, and **creating rows is a production mutation needing its own gate and window** — the route
must be named, not assumed. The reason-code vocabulary must be pinned **before** the proof is designed,
because under the shadow's own `shadow_rule` derivation a row that is both primary and designated emits
`primary`, not `default_host` — which would make Candidate B's win unobservable on a correct resolver.

**Unchanged:** **Step B does NOT close C-2** and must not be claimed to. `assign_brand_avatar` still
sets `is_active = true` unconditionally with no per-(client, render_style) guard; Step B makes a second
active avatar **safe to survive**, not **prevented**. C-2 is a governance control, not a database one.

## 3. 🟢 PK RULING — Schedule Slice A, Gate 1 APPROVED (narrow scope)

A read-only **operator-truth panel** for the current planning period showing: platform · scheduled
slot/day/time · **format actually assigned by the allocator** · valid/invalid status · **the specific
reason when invalid** · **the underlying schedule row and allocation source needed for traceability.**
(The last two are PK additions beyond the original scoping — they are what make it operator truth
rather than a summary.)

**Acceptance oracle:** reproduce the known current live allocation **before** Slice 2 · the expected
**0-of-15** result **after** Slice 2 · and ⚠ **any mismatch as a VISIBLE FAILURE rather than a silent
empty state.** The third clause is load-bearing: there is **no error-state substrate anywhere in `app/`**
(no `error.tsx`, `global-error.tsx`, `not-found.tsx`), so a panel failing to a blank render would hide
exactly the defect class it exists to expose.

**PK boundaries, verbatim:** *"Do not add a new write path, change allocator behaviour, or perform a
broad visual redesign inside Slice A."* And: **this is the first slice of the schedule redesign, not
the completed redesign** — PK has named the following slice (join a selected format to an individual
**writable** schedule row), and it is not open.

## 4. ⚠ Planning-surface correction — present but UNJOINED (a control-tower error)

The control tower seeded S2 with the claim that the planning surface is *"not built, not designed, and
appears in no reviewed packet."* **That was wrong, and S2 disproved it from code.**
`app/(dashboard)/clients/page.tsx:574-627` already stacks three sections on `/clients?tab=schedule`:
the **Schedule editor** (`ScheduleTab.tsx`, platform × day × time, **WRITE**), the **Publishing Plan
Pyramid** (platform × **format**, read-only), and the **Client Capability Overlay**.

**Both axes are already on the same tab, in adjacent panels. What is missing is the JOIN** — no surface
and no schema binds a format to an *individual schedule row*. **The deliverable is a join and a mode,
not a new console;** scoping it greenfield would duplicate `get_publishing_plan_pyramid` and
re-litigate a shipped surface.

**Second correction, to a different record:** the gap-analysis brief §0.8 states *"There is no operator
write path to schedule or format anywhere in the dashboard."* **That is false for schedule and true for
format** — `actions/schedule.ts` → `savePublishSchedule` → `public.save_publish_schedule` exists, is
catalog-verified live, and is reachable from a "Save schedule" button. Extending an existing write
surface is a different and higher risk tier than adding the first one.

## 5. ⚠ `image_quote` incident correction — RESOLVED, and it never gated video

The control tower carried this as an **active incident** and seeded S3 with it as a possible blocker.
**Wrong on both counts.** Re-verified live by the registrar:

| Client | Failures (last) | Successes since (last) | State |
|---|---|---|---|
| `care-for-welfare-pty-ltd` | 202, last **2026-07-22 06:30Z** | 8, last **2026-07-23 15:30Z** | **RECOVERED** |
| `invegent` | 148, last **2026-07-23 03:30Z** | 7, last **2026-07-23 06:30Z** | **RECOVERED** |

Fixed by cc-0048 (image-worker v3.32.0) then cc-0049 (v3.33.0). **The `CREATIVE_CONTRACT_REGISTRY`
gate never applied to the video path.** PK ruling: it *"is not a video blocker and must not re-enter
scope."* **Residual carry unchanged:** no post-v3.33.0 Property Pulse `image_quote` render exists
(cc-0049 §5a — natural fill only, not manufacturable), and no PK visual PASS exists for the Invegent
quote-card geometry. `succeeded` is a provider outcome, not layout correctness.

## 6. 🔴 Sunday `day_of_week` defect — ELEVATED by PK, no longer parked

S2 surfaced it and correctly declined to action it, assessing it dormant. **PK overruled the parking**
and attached it to the schedule program as a **mandatory contained blocker**, on the reasoning that a
save which appears successful but produces no slots **directly blocks trustworthy client schedule
planning** — priority 1.

**The defect:** `ScheduleTab.tsx:6-7` writes Sunday as `day_of_week = 0`
(`DAY_ORDER = [1,2,3,4,5,6,0]`); `m.compute_rule_slot_times` matches
`EXTRACT(isodow FROM d)::integer = v_day_of_week`, and **`isodow` returns 1–7 — Sunday is 7**. `0`
matches nothing. The toggle saves, the UI shows "Saved ✓", and **zero slots are ever produced. Silent.**
Live: slots exist on isodow **1–5 only** (233/230/237/242/214); zero Saturday, zero Sunday.

**PK's containment, exactly:** Slice A **must visibly detect and label** the mismatch · a **separate
minimal repair packet** is authored for the `0` vs `7` contract · **the mutation must NOT be silently
included inside the read-only Slice A** · **no apply without its own reviewed gate and production
window.**

## 7. Board — seven lanes, ownership current

| Session | Lane | Priority | State |
|---|---|---|---|
| **S1** | cc-0079 Slice 2 **apply hand** | 1 | **Halted, standing by.** Explicitly barred from authoring or modifying its own apply packet. |
| **S2** | **Sunday `0` vs `7` repair packet** (new) | 1 | Authoring. Gate-1 scoping brief already delivered. |
| **S3** | Creatomate governed video | 2 | May complete + freeze; **production window CLOSED until Slice 2 clears its gate.** |
| **S4** | AGP Step B + `:92` | 3 | **Unblocked by §2**; may finish and freeze. |
| **S5** | Slice 2 **harness re-cut** | 1 | Authoring. **Three repairs only.** |
| **S6** | Schedule **Slice A** build | 1 | **Gate 1 granted**; building read-only. |
| **S7** | Durable `platform_support`/grid correction | 1 | **Design-only**; may not implement while the Slice 2 window is active. |

**Slice 2 chain as PK ratified it:** S5 freezes the harness-only re-cut → fresh independent review
against the new exact hash → S1 receives it as the **independent apply hand** → S1 runs the gate chain
and **stops at PK apply gate ⑦** → **no production mutation before that gate.** S5's authorization is
narrow: **single-call transaction containment · executable fail-closed assertions · the missing
YouTube baseline.** The data payload and allocator table remain frozen.

## 8. What this lane committed — and what it deliberately did NOT

**Committed:** this result doc + S1's halt result (`cc-0079-slice-2-apply-lane-halt-v1.md`, read in
full, `07d61a16…`, 16841 B) + both registers.

**DEFERRED, named and not lost — three Gate-1 artifacts were IN FLIGHT at commit time and are
therefore NOT hash-pinned here:** S2's planning-surface scoping brief · S4's Step B Gate-1 brief ·
S3's Creatomate Gate-1 packet. **A hash taken while a session is still writing is a false pin**, and
two of these demonstrably moved mid-pass (S1's halt doc `191e2dafa5…`→`07d61a16…`; S3's packet
`d409376b…`→`1af25e02…`). Each will be recorded at its frozen hash in a follow-up pass, after being
read in full. **No prior register entry amended; no history rewritten.**

**Production mutations: 0.** `branch-warden` ran before commit with parity re-verified immediately
beforehand.

## 9. Next gate

> **S5** freezes the re-cut → **control tower runs the fresh external review** against the new hash →
> **S1** re-runs the gate chain from ① → **PK apply gate ⑦**.
> **S4** freezes Step B with rank 1 resolved by evidence and the two-candidate Stage-2 proof route named.
> **S6** builds Slice A read-only, including visible detection of the Sunday mismatch.
> **S2** returns the minimal `0` vs `7` repair packet — its own gate, its own window.
> **S3** freezes the video packet; window stays closed.
> **S7** returns the durable-correction design; **must surface early if it finds the read-time
> intersection makes Slice 2's data change unnecessary** — that is needed before the apply gate, not after.
> **🔴 The published `2f89e33f…` Facebook item remains a separate PK action.** It does not block these
> lanes. ICE cannot observe or remove it; only PK can confirm removal.
