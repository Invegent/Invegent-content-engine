# Gate-1 Contract — the writable planner: a governed format per individual schedule row

> **⛔ SUPERSEDED (2026-07-31, PK ruling).** `c.client_publish_schedule.format_override` +
> `public.save_week_format_override` (migration `20260727100000_p1a_schedule_format_override_surface.sql`,
> "Authoritative Weekly Schedule Editor Phase 1") shipped a simpler, direct mechanism for the same
> operator need — a durable per-slot format override — and is PK's **canonical long-term path**. This
> contract's W1 dark-table design (`c.client_schedule_format_assignment` + `get_schedule_planner_state`)
> was **never applied** (verified live: neither object exists; migration ledger has no entry for
> `20260725130000`). The implementing branch `lane-w1-planner-dark` (and its rebase-forward copy
> `origin/lane/w1-planner-dark-v2`) is retired accordingly. See
> `docs/briefs/results/lane-w1-planner-dark-supersession-record-v1.md` for the full disposition.

**Created:** 2026-07-25 Sydney
**Lane:** **S2 · The writable planner (Lane 1)** — product & data contract, DESIGN ONLY
**Author:** S2 worker session (READ-ONLY)
**Executor:** TBD by PK at Gate 1
**Status:** **DRAFT — awaiting PK Gate 1.** Defines a contract; authorises NO build, NO schema change, NO write path, NO deploy.
**Canonical ID:** **NOT SELF-ALLOCATED** — central/PK act. No `cc-` number, no register version claimed.
**Lane classification (CCF-02):** PRODUCT_PROOF · **Tier T1** (design contract; docs only). Proposes T2/T3 successors.
**Result file:** created on completion of the first implementing slice, not by this contract.

---

## 0 · Stale-ref gate (PASSED — both repos)

| Repo | Fetched | Upstream (this session) | Working base | Verdict |
|---|---|---|---|---|
| CE `Invegent-content-engine` | `fetch --prune` | `3dee7e5a3c8f24f6d51a1275214d3e696c54948d` (`ls-remote` agrees) | `3dee7e5` on `main`, parity **0/0** | **AT UPSTREAM** (advanced past the ad4a6a9 base of the two prior S2 lanes to v6.26) |
| `invegent-dashboard` | `fetch --prune` | `524ca6d1c25da0c37ec014c7612a6623ce38b3bd` | checkout `fda2b51` on `tmr-template-intake-ui-v0`, **0 ahead / 5 behind** | **STALE — read via `git show origin/main:`** |

Dashboard checkout **not** pulled, checked out, or written. Only `git fetch --prune` ran there.

---

## 1 · What this contract is, and the problem it closes

Three surfaces exist on `/clients?tab=schedule` today and **nothing binds a format to a schedule
row** (established in the S2 scoping brief `72681d72…`):

- **Schedule editor** (`ScheduleTab.tsx`, WRITE via `save_publish_schedule`) — owns platform · day · time · enabled.
- **Publishing Plan Pyramid** (READ-ONLY) — shows platform × format *policy* share.
- **Client Capability Overlay** (READ-ONLY) — global capability × client.

**The writable planner is the join: it lets an operator say "this specific Monday-09:00-Facebook row
is `image_quote`," as governed data.** This document is the **product & data contract** for that — not
its implementation.

**The one constraint that dominates every section below** (from
`cc-0079-schedule-format-authority-architecture-gate1-v1.md` and re-verified in the S2 scoping brief):

> `m.slot.format_chosen` is read by **no production worker** (telemetry only). Every renderer and
> publisher keys off `m.post_draft.recommended_format`, which the **Advisor** writes last. **A per-row
> format written today is stored, displayed, and then ignored by production** unless the cc-0079
> resolver (R3) becomes the sole governed writer of `recommended_format`.

**Therefore this contract defines the data and product semantics of a per-row format, and makes its
production-honouring an explicit dependency (§6, §11) — not an assumption.** A planner that writes a
field the pipeline ignores is the ICE `declared-control-not-consulted` failure mode, and this contract
is written specifically to not commit it.

---

## 2 · The unit — the fields (platform · day · time · selected format)

The governed unit is a **format assignment on one schedule row**, keyed to
`c.client_publish_schedule.schedule_id` (the row that already carries platform · day_of_week ·
publish_time · enabled).

| Field | Meaning | Domain | Source of truth |
|---|---|---|---|
| `schedule_id` | the row being planned | FK → `c.client_publish_schedule.schedule_id` | existing |
| `format_mode` | **fixed** (this row demands one named format) or **policy** (this row draws from the weekly mix) | enum `{fixed, policy}` | **NEW** |
| `requested_format` | the chosen format, **required iff `format_mode='fixed'`, NULL iff `policy`** | `t."5.3_content_format".ice_format_key`, constrained by §3 | **NEW** |
| `assigned_by` | actor who set it | text (see §8 honesty caveat) | **NEW** |
| `assigned_at` | when | timestamptz | **NEW** |
| `assignment_reason` | governed enum + optional detail | enum (§8) | **NEW** |

**`format_mode` is first-class and never inferred.** Per the gap-analysis §0.7 invariant, the *same*
format divergence is a violation in fixed mode and routine in policy mode; a surface that cannot state
the mode mislabels one of them.

**Default for every existing and new row: `policy`.** The planner is opt-in per row. Absence of a
fixed assignment = today's behaviour exactly (§9 migration).

---

## 3 · Supported-format constraints (per platform, from `platform_support`)

**A `fixed` `requested_format` is choosable ONLY from the platform-valid, capability-clear set for that
row's platform.** Free-text is never accepted. The eligible set is the **five-predicate conjunction**
named in `cc-0079` §6.3, evaluated for `(requested_format, row.platform)`:

1. `t."5.3_content_format".platform_support->>platform` is **present AND true** — key **absent ⇒ unsupported** (the v2.11.2 opt-in semantics: `!== true` ⇒ excluded);
2. format is `is_buildable = true`;
3. format has **both** a current `t.format_synthesis_policy` **and** `t.format_quality_policy` (Amendment B);
4. a publisher path supports it on that platform;
5. a template/provider exists for it (`ice_ro.template_registry_status`) for the brand+aspect.

**Predicates 1–3 are computable read-only today; 4–5 partially. The contract requires the eligible-set
computation to be a single governed function, not re-derived per surface** — otherwise the planner and
the pipeline can disagree about what "valid" means. Recommended: the eligible set is served by one RPC
(a natural extension of `get_publishing_plan_pyramid`'s per-cell `platform_support`/`blocked_reasons`,
which already computes 1–4).

**Presentation rule:** the picker shows only eligible formats as selectable; ineligible ones appear
**disabled with a reason** ("not publishable on LinkedIn" / "no template for this brand"), never hidden
— hiding a format an operator expects reads as a bug (gap-analysis §0.5 error-state principle).

---

## 4 · Allocator interaction — the load-bearing section

This is where a naïve design silently corrupts the mix. The mechanics, read first-hand this session:

- `m.build_weekly_demand_grid(client, week)` computes, **per platform**, a set of
  `(ice_format_key, share_pct, weekly_slot_count)` where `weekly_slot_count = COUNT(enabled schedule
  rows for that platform)`. It works at the **(platform, format, share) grain — it has no per-row
  concept at all.**
- `m.allocate_week_formats(shares, N)` spreads those shares over **N** slots (Hamilton largest-remainder
  + smooth round-robin), anchored to ISO-week ordinals (deterministic, convergent).

**The hazard:** if a `fixed` row is left inside the policy population, the allocator still counts it in
`N` and still distributes mix share across it — so the fixed format is **double-counted** and the
policy rows are **under-allocated**. A fixed assignment must therefore be **subtracted from the policy
pool**, not layered on top of it.

**Contract rule — the two modes partition the row set:**

```
For a client-week, per platform:
  FIXED rows   → each takes its own requested_format. Removed from the policy population.
  POLICY rows  → N_policy = COUNT(enabled rows) − COUNT(fixed rows).
                 allocate_week_formats(shares, N_policy) distributes the mix over ONLY these.
```

**Consequences the contract makes explicit:**

- **Fixed rows do not consume mix share and do not distort attainment.** A fixed `image_quote` on
  Monday is not "an image_quote the mix allocated"; it is demand the operator pinned. Mix
  attainment (target vs achieved) is assessed over the **policy** rows only, and the surface must label
  fixed rows as excluded from that denominator.
- **This is additive to the existing allocator, not a rewrite of it.** `build_weekly_demand_grid` and
  `allocate_week_formats` are unchanged; the new step is *partitioning the rows before N is computed*.
  Whether that partition lives in `materialise_slots`/`fill_pending_slots` or in a wrapper is an
  **implementation choice for the successor T3 lane**, not decided here.
- **Interaction with `client_format_mix_override`:** the existing per-(client,platform,format) *share*
  override (read live inside `build_weekly_demand_grid`) is a **policy-level** control and stays
  independent. A per-row fixed assignment is a **different grain** (one row, not a client-wide share)
  and must not be modelled as an override row — conflating them would make one row's pin silently
  reweight the whole platform. The contract keeps them separate objects.

---

## 5 · Fallback behaviour

Two distinct fallback questions; the contract answers both **fail-safe, explicit, recorded** — never
silent (the arch brief §3 catalogues the current silent fallbacks as defects).

**5a — a `fixed` row whose format becomes ineligible** (e.g. a template retired, `platform_support`
flipped). The mix cannot silently "rescue" it, and it must not ship an unpublishable draft.

> **Rule:** default behaviour is a **governed gap** — the slot goes `status='skipped'` with a named
> `skip_reason` (e.g. `fixed_format_ineligible:<fmt>`), extending the existing `skip_reason`
> vocabulary rather than inventing a mechanism. Substitution to another format is permitted **only**
> via an explicit per-(format, platform) allow-list, **off by default**, and every substitution is
> stamped `assignment_reason='resolver_fallback'` with the original and the substitute recorded.
> *(This mirrors cc-0079 §3 and open-question 3; PK ratifies whether any substitution is ever allowed
> or gap is always preferred.)*

**5b — a `policy` row when the mix is empty/all-ineligible.** Same fail-closed rule: a governed skip
with a named reason, never the current hardcoded `'text'` collapse (cc-0079 §9.2). **This is cc-0079's
to fix in the worker; the planner only guarantees it never *writes* a format that would trigger it.**

---

## 6 · Invalid-state presentation

The planner must render four distinct invalid/edge states, each visibly different from a healthy
assignment and from each other (no composite indicator — gap-analysis §0.10c):

| State | Trigger | Presentation |
|---|---|---|
| **Ineligible pick** | operator selects a format failing §3 | disabled option + reason; cannot be saved |
| **Stranded fixed** | a saved fixed format later becomes ineligible | row flagged "will skip: `<reason>`", not silently dropped |
| **Mode/authority divergence** | fixed row where the pipeline's final format ≠ `requested_format` | shown as an **exception** (fixed) — this is the whole point of mode being first-class |
| **Not-yet-honoured** | assignment written but cc-0079 resolver not live (§11) | row shows **"planned — not yet enforced by production"** — the honesty label that prevents the decorative-control lie |

The last row is mandatory until §11's dependency clears. **A planner that shows a fixed assignment as
"active" while `recommended_format` still ignores it is a false green.**

**Substrate dependency:** the dashboard has **no `error.tsx` / `not-found.tsx` / `global-error.tsx`**
(re-confirmed at `524ca6d`). These invalid states need a non-fatal render substrate the repo lacks;
introducing it is the dashboard code owner's gate, named here as a precondition, not designed.

---

## 7 · Edit and deletion behaviour

The planner writes governed data; edits are **versioned, not destructive**, mirroring the existing
`client_format_mix_override` pattern (`is_current` · `superseded_by` · `effective_from`) so history is
never lost and provenance survives.

| Action | Contract |
|---|---|
| **Set fixed** | write assignment `{schedule_id, mode=fixed, requested_format, assigned_by, assigned_at, reason}`; supersede any prior current assignment for that `schedule_id` |
| **Change format** | new current version; prior version retained with `superseded_by` |
| **Revert to policy** | write `mode=policy, requested_format=NULL` as a new current version — **an explicit governed act, recorded**, not a delete |
| **Delete the schedule row** | assignment is FK-bound to `schedule_id`; when the row is deleted (`save_publish_schedule` does `DELETE`-then-`INSERT` per platform — see §9 hazard), the assignment must **not silently resurrect** onto a new row that reuses the slot. See §9. |
| **Disable the row** | assignment persists but is inert (a disabled row materialises nothing); re-enabling restores the fixed demand |

**No hard delete of assignment history in the normal path.** Physical deletion is an admin/GC concern
outside this contract.

---

## 8 · Audit & provenance requirements

Every assignment records: **who · when · what changed · why · from-what.** Governed enum for
`assignment_reason` (extensible, not free prose): `{operator_choice, campaign_requirement,
platform_constraint, resolver_fallback, migration_default, reverted_to_policy}`, plus an optional
free-text detail field.

**⚠ Honest limitation — binding, from the `ice-has-no-actor-identity` finding:** ICE has **no actor
identity**. Every existing audit "actor" column is free text; there are **zero FKs to `auth.users`**;
`auth.uid()` is **NULL under service-role**, which is how every dashboard write reaches the DB. So
`assigned_by` **cannot** be a trustworthy identity today.

> **Contract rule:** `assigned_by` is recorded as **best-effort attribution, explicitly labelled
> non-authoritative** in both schema comment and UI ("attributed, unverified"). The contract MUST NOT
> imply the actor is authenticated. Real per-operator attribution is an **S1/authz dependency** (§11)
> — the dashboard has authentication but **zero authorization**; every account is operator-equivalent.
> Designing a provenance field that *looks* authoritative while any account can write it would encode a
> false accountability. The field is built to receive a real identity later, and honest until then.

---

## 9 · Migration from the current unjoined surfaces

**Baseline (no behaviour change):** every existing schedule row is implicitly `mode=policy`. Introducing
the assignment object with a `policy` default reproduces today's behaviour for 100% of rows —
`reason='migration_default'`, zero fixed assignments, allocator population unchanged. **The migration
is inert by construction; it lights up only when an operator sets the first fixed row.**

**Three hazards the migration contract must handle, all verified:**

1. **`save_publish_schedule` is `DELETE`-then-`INSERT` per platform** (read first-hand). Every save
   **destroys and recreates** all of a platform's schedule rows with **new `schedule_id`s**. An
   assignment FK-bound to `schedule_id` would be **orphaned on every schedule save**. → **The
   assignment must bind to a stable identity that survives a save, OR `save_publish_schedule` must be
   changed to upsert-by-natural-key `(client, platform, day_of_week, publish_time)` instead of
   delete-recreate.** This is the single most important migration finding and a **required successor
   decision** — the current write path is structurally incompatible with per-row provenance.
2. **Sunday `0`-vs-ISO-`7` contract** — reference S2's own repair packet **`1c2230d0…`**. A fixed
   assignment on a Sunday row is inert until that repair lands, because the row materialises no slot
   regardless of format. **The planner must not offer Sunday as assignable until `1c2230d0` is applied**
   (or must show Sunday assignments as "will not materialise — pending contract repair"). §10.
3. **Two client-selection mechanisms / `?client=` conveyance** (gap-analysis §0.3) — the planner is
   client-scoped; it inherits whatever conveyance cc-0054 establishes and **encodes `?client=` in
   nothing**. Client scope is a **state**, not a mechanism.

---

## 10 · Sunday semantics

Per the S2 repair packet **`1c2230d0…`** (frozen, its own gate, queued behind cc-0079 Slice 2):

- Storage convention is **Sunday = 0** (`CHECK (day_of_week BETWEEN 0 AND 6)`); the deviant readers are
  `m.compute_rule_slot_times` + `m.materialise_slots` (`isodow`, 1–7). Until the `isodow→dow` repair
  applies, **a Sunday row materialises nothing**, so a fixed format on it is doubly inert.
- **Contract rule:** the planner treats Sunday assignability as **gated on `1c2230d0`**. Before that
  repair: Sunday rows are either not offered for fixed assignment, or shown with an explicit
  "pending contract repair — will not materialise" state. **The planner must not silently accept a
  Sunday fixed format that cannot take effect** — that would reproduce the exact "Saved ✓, produces
  nothing" defect one layer up.
- After the repair: Sunday is a normal assignable day. **The 24 existing disabled Sunday rows stay
  inert** (PK ruling: not activated or rewritten opportunistically).

---

## 11 · Explicit dependency map (nothing here is decided on another lane's behalf)

| Dependency | Owner | Effect if unresolved |
|---|---|---|
| **Format authority resolver (R3)** — `recommended_format` written by a governed resolver that honours `format_mode` | **cc-0079 Slices 3–4** | **The planner's fixed format is not honoured by production.** Until this lands, every assignment is "planned, not enforced" (§6). **This is the gating dependency for the planner to *mean* anything.** |
| **`save_publish_schedule` delete-recreate** | successor T3 lane | assignments orphan on every save (§9.1) unless the write path changes to upsert |
| **Sunday contract repair** | S2 packet `1c2230d0…` | Sunday assignments inert (§10) |
| **Actor identity / authz** | **S1** (authz PARKED by PK) | `assigned_by` non-authoritative; no per-operator accountability (§8) |
| **Client conveyance** | **S1 · cc-0054** | client scope drawn as state only; no `?client=` (§9.3) |
| **Error-state substrate** | dashboard code owner | invalid states (§6) have no non-fatal render today |
| **Eligible-set RPC** | successor T2 lane | §3 predicates must be one governed function, not per-surface |

> **The planner is a coherent product only after cc-0079 R3.** This contract can be *approved* and its
> data model *built* ahead of R3 (as governed storage + a "planned, not enforced" surface), but it
> must not be *presented as controlling production* until R3 makes `recommended_format` honour it.

---

## 12 · Recommended slicing (for PK, not decided here)

Ordered so each slice is provable and none ships a decorative control:

- **W1 — data model, dark.** Additive assignment object (`policy` default, versioned, provenance
  columns), no UI, no worker read. Proves storage + the `client_format_mix_override`-style versioning.
  **T2.** Does not touch `save_publish_schedule` yet — so it must be paired with, or gated behind, the
  §9.1 write-path decision.
- **W2 — read-only planner surface.** Show each row's mode + (for policy rows) what the mix would
  allocate this week, reusing S6's Slice A allocator panel. No write. **T2.** Independent of R3.
- **W3 — writable fixed assignment.** The picker (§3) + versioned write (§7) + partition-the-pool
  allocator wiring (§4). **T3.** **Gated on cc-0079 R3** (else "planned, not enforced") **and** the
  §9.1 write-path fix.
- **W4 — Sunday + campaign extensions.** After `1c2230d0` and any campaign-taxonomy decision.

**First approvable increment: W1+W2** (governed storage + read-only surface), explicitly labelled
"planning, not yet enforced," which is honest and useful before R3.

---

## Scope

**In scope:** the product & data contract for a governed per-row format assignment — fields,
constraints, fallback, invalid-state presentation, allocator interaction, edit/delete, Sunday, audit,
migration — plus its dependency map and a recommended slicing.

**Out of scope:** any implementation · schema DDL · write path · worker change · the cc-0079 resolver
(depended on, not designed) · authz/actor identity (S1) · client conveyance (cc-0054) · the
`save_publish_schedule` rewrite (named as a required successor decision, not designed) · campaign
taxonomy · any new nav/IA · applying `1c2230d0` or cc-0079 Slice 2.

## Allowed actions (this lane — complete)

`git fetch --prune` + read-only ref reads (both repos; dashboard via `git show origin/main:`);
read-only CE reads; R0 `db-read.py` over `pg_catalog` + `ice_ro`
(`build_weekly_demand_grid`, `m.slot` columns, `c.client_format_mix_override` columns); authoring this
one document.

## Forbidden actions (all honoured)

No code · no schema change · no DML/DDL · no migration · no dashboard file edited (S6 write precedence)
· no deploy · no new write path · no `cc-` ID self-allocation · no register version · no self-approval ·
no commit · no push. Hold-states honoured: cc-0079 Slice 2 queued · S2 Sunday packet `1c2230d0` queued ·
authz PARKED · 24 Sunday rows inert.

## Success criteria for this contract

1. Both stale-ref gates run and recorded. ✅ §0
2. Every mandated element defined and evidence-cited: fields §2 · constraints §3 · allocator §4 ·
   fallback §5 · invalid-state §6 · edit/delete §7 · Sunday §10 (refs `1c2230d0`) · audit §8 ·
   migration §9. ✅
3. The `format_chosen`-not-consumed and delete-recreate hazards surfaced as gating dependencies, not
   glossed. ✅ §1, §9.1, §11
4. Nothing presented as controlling production ahead of cc-0079 R3. ✅ §6, §11, §12
5. Nothing approved, built, or mutated. ✅

## Stop condition

**Contract ends the lane. Freeze at Gate 1.** Return path + sha256 + byte count to the control tower.
No implementation until PK rules at Gate 1 and the §11 dependencies are sequenced.

## Unresolved decisions (for PK's decision sheet)

1. **`save_publish_schedule` delete-recreate (§9.1)** — change to upsert-by-natural-key, or bind
   assignments to a stable identity? **Required before W3; structurally blocks per-row provenance.**
2. **Fallback (§5)** — is any fixed→other substitution ever allowed (allow-list), or is a governed gap
   always preferred?
3. **Approve W1+W2 (dark model + read-only surface) now**, deferring the writable W3 until cc-0079 R3?
4. **Sunday (§10)** — gate assignability on `1c2230d0`, or offer with a "pending repair" label?
5. **`assigned_by` (§8)** — accept non-authoritative attribution now, or hold the writable planner until
   S1 provides real actor identity?
6. **Allocate a `cc-` ID / register block**, or keep unnumbered as design?

## Non-claims

Does not claim the contract is approved or costed. Does not design the resolver, the write-path fix,
authz, or the error substrate. Does not claim `m.materialise_slots`/`fill_pending_slots` were read in
full — the allocator interaction was derived from `build_weekly_demand_grid` (read in full this
session) + the cited cc-0079 architecture brief; the successor lane re-reads the fill path in full.
Does not claim per-row format is honoured by production today (it is not — §1). Does not assert the
dashboard working tree is relevant (5 commits stale, unused). Does not decide any §-question — all are
PK's.

## Evidence basis

CE `3dee7e5` (parity 0/0) · dashboard `origin/main = 524ca6d` (read via `git show`; checkout left at
`fda2b51`, not pulled). Live reads 2026-07-25, project `mbkmaxqhsohbtwsqolns` (R0 `db-read.py`):
`pg_get_functiondef(m.build_weekly_demand_grid)` (read in full) · `pg_attribute` for `m.slot`
(23 cols — `format_preference text[]`, `format_chosen text`, `created_by text`, no mode/authority/reason
columns) and `c.client_format_mix_override` (11 cols — the `is_current`/`superseded_by`/`reason`
versioning pattern mirrored in §7). Prior S2 artefacts: scoping brief `72681d72…` · Sunday repair
packet **`1c2230d0…`**. Cited: `cc-0079-schedule-format-authority-architecture-gate1-v1.md`,
`dashboard-redesign-gap-analysis-brief-v1.md` (`3beb67e7…`), and memory findings
`ice-has-no-actor-identity`, `declared-control-not-consulted`, `dashboard-authz-security-triage`.
**No write, DDL or DML was issued in this lane.**
