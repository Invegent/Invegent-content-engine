# ICE-PROC-002 — Pooled Resolution (Friction Register)

**Status:** Active — **V-G1 PK-approved 2026-05-26** as the operating reference for the current cc-0015 surface
**Adopted:** 2026-05-26 Sydney
**Authority:** PK CCD directive 2026-05-26 (cc-0015 Stage G); V-G1 approval 2026-05-26
**Scope:** Triage + resolution of `friction.case` rows via the `/operations` friction-register surface
**Governs:** the weekly pool-session rhythm, triage defaults, suppression discipline, and the anti-patterns it exists to prevent
**Related:** cc-0015 brief (`docs/briefs/cc-0015-friction-pool-view.md`); reconciliation re-brief (`docs/briefs/cc-0015b-pool-view-reconciliation.md`)

> This document codifies *how to run pooled resolution today* against the surface that is **actually shipped** (cc-0015 Stage A/A.5/B/F). It deliberately does **not** assume Stage C/D/E exist. cc-0015 is **NOT complete**; this doc is the Stage G durable artefact, not a completion marker.

---

## Section 1 — Why pooling

Friction cases are resolved in **concentrated sessions over related sets**, not one at a time as they arrive.

- **Concentration beats context-switching.** Handling a case the moment it lands forces a context switch out of whatever you were doing and back; the switch cost usually dwarfs the case. Batching related cases into one session pays that cost once.
- **Related cases are reviewed together.** Cases of the same category share root causes, surfaces, and fixes. Reviewing a category as a set surfaces duplicates, reveals the common cause, and lets you decide the *set's* disposition coherently — instead of making five inconsistent one-off calls.
- **The register is a queue, not an inbox.** A case being filed is not a request to act now. It is a request to be *considered in the next relevant pool session*. The triage defaults (Section 2) encode exactly that.

---

## Section 2 — Triage defaults

Every case gets an `action_decision` at triage. The defaults bias toward pooling.

| Decision | When | Notes |
|---|---|---|
| **`track`** | **Default for any non-blocking issue.** | The case is real and worth doing, but not now — it joins the pool for batched resolution. Most cases land here. |
| `act_now` | **Reserved** for genuine blockers **or** genuine quick wins (a fix so small that pooling it would cost more than doing it). | Use sparingly. If you find most cases going `act_now`, the bar has slipped — re-read this section. |
| `defer_intentionally` | A real issue you are consciously choosing not to schedule yet (needs a precondition, a decision, or a future window). | Distinct from `track`: `track` = will batch; `defer_intentionally` = parked with intent. |
| `suppress` / `ignore` / `duplicate` | See Section 5. | Discipline applies — do not reach for these to shrink the list. |

**`critical` interrupts pooling.** A case with `severity = 'critical'` is not subject to the weekly rhythm — it is handled when it is seen. Critical is the one signal that overrides "track and batch." Everything `info` / `warn` flows through the pool.

---

## Section 3 — Pool cadence

The standing pool session is **Friday 09:00 Sydney**. Within it, each pool has its own cadence:

| Pool (saved view) | Cadence |
|---|---|
| **Dashboard UI** | **Weekly.** Review every Friday session. |
| **Register reconciliation** | **Weekly if ≥ 3 open cases; otherwise biweekly.** Don't convene a dedicated reconciliation review for one or two cases — let them accumulate to a reviewable set. |
| **Pipeline/friction cases** | **Triggered**, not calendar-driven — convened by a `critical` case or when a grouped review is warranted (a cluster of related pipeline integrity cases). |
| **All tracked** | **Maintenance view.** Use to sweep the full tracked backlog periodically and spot stale or now-irrelevant cases. |
| **New/untriaged** | **Maintenance view.** Use at the start of a session to triage anything not yet triaged before working the category pools. |

Cadence is a floor, not a ceiling — a `critical` always pulls forward regardless of pool.

---

## Section 4 — Pool session protocol

A pool session is a fixed, repeatable loop:

1. **Open `/operations`** (the friction-register surface).
2. **Triage the new arrivals first** — apply the **New/untriaged** saved view, give each untriaged case an `action_decision` per Section 2.
3. **Choose the pool** — select a saved view (Dashboard UI / Register reconciliation / Pipeline/friction cases / All tracked) or set category/triage/action filters directly. (Filters are URL-param-driven, so a pool view is bookmarkable and reload-stable.)
4. **Review the related cases together** — read the set as a set. Look for the shared cause, duplicates, and the coherent disposition for the group.
5. **Make triage decisions** for the set (`track` / `act_now` / `defer_intentionally` / suppression per Section 5).
6. **Record notes** where a decision needs context for the next session (why deferred, what it's waiting on, which cases are duplicates of which).
7. **Do not fix cases one-by-one while triaging** — unless a case is `critical`. Triaging and fixing are different modes; mixing them is the primary anti-pattern (Section 6).
8. **End the session by identifying batch candidates** — note which `track`ed cases form a coherent batch to resolve together. *(When the Stage C batch-resolution UI exists, these become its input. Stage C does **not** exist yet — for now this is a written note, e.g. in the session log or a case note, not a UI action.)*

---

## Section 5 — Suppression discipline

`suppress`, `ignore`, and `duplicate` remove a case from the working pool. They are not list-shrinking tools — each has a narrow valid use.

- **`track` is usually better than `suppress`.** If the issue is real, `track` keeps it in the pool where it will be batched and resolved. `suppress` removes a real issue from view, which re-creates the very "silently frozen backlog" problem the register exists to prevent. Default to `track`; reach for `suppress` only when the conditions below hold.
- **`suppress` is valid when:** the case describes a real condition that you have made a deliberate, recorded decision **not** to act on for the foreseeable future (e.g., a known cosmetic quirk accepted as-is, or noise from a source you've decided to tolerate) — **and** you record *why* (use a note / `suppression_reason`). Suppression without a recorded reason is not allowed.
- **`ignore` is appropriate when:** the case is not a real issue — test/smoke artefacts, mis-fires, or noise that should never have been a case. (Example: the cc-0016 Stage B smoke cases.)
- **`duplicate` is appropriate when:** the case restates an existing case. Mark it `duplicate` and, in the note, point to the case it duplicates so the canonical one carries the work.

If you are tempted to `suppress` to make the list shorter, that is the signal to `track` instead.

---

## Section 6 — Anti-patterns

These are the behaviours pooled resolution exists to prevent. If a session drifts into one, stop and reset.

- **Fixing in the moment while triaging.** Triage assigns dispositions; it does not fix. Dropping into a fix mid-triage destroys the concentration the session is for and leaves the rest of the pool un-triaged. (Exception: `critical`.)
- **One-by-one resolution outside sessions.** Picking off cases ad hoc as they catch your eye re-introduces the context-switching cost and produces inconsistent dispositions across related cases.
- **Newest-first bias.** Working the most recent arrivals first starves older cases and skews the register toward recency rather than importance. Work the pool as a set; let cadence and severity drive order, not arrival time.
- **Mixing Repair Board v0 semantics with general friction pools.** `/operations/pools` (Repair Board v0) is a *different model* (notes-`pool_key`, pipeline-incident repair). Do not import its semantics into the general friction-register pools on `/operations`, or vice versa. See Section 8.
- **Using "Pipeline pool" wording.** The saved view is named **"Pipeline/friction cases"** precisely to avoid colliding with the Repair Board v0 ("pools"). Do not relabel it "Pipeline pool" — that wording collides with the specialist repair surface and conflates the two models.

---

## Section 7 — Review

This process gets its **first review after 4 weeks of use** (2026-06-26, the fourth Friday 09:00 Sydney session). The review evaluates:

- **Are the saved views useful?** Which get used, which don't, whether the predicates match how cases actually cluster, and whether any view should be added, dropped, or re-scoped.
- **Should Stage C / D / E proceed?** Whether real session experience justifies building batch resolution (Stage C), status-strip pool counts (Stage D), and/or the pool-session tracking UI (Stage E) — each still **held** (Section 9). The review produces a recommendation; the build remains separately PK-gated.
- **Should the current deferrals be promoted?** Specifically the source filter, sort, and FAB category-description hydration (Section 9) — whether session friction justifies promoting any of them out of "deferred."

The review is a process check, not a cc-0015 completion gate. cc-0015 remains NOT complete independent of this review's outcome.

---

## Section 8 — COEXIST model (the two "pool" surfaces)

There are two surfaces with "pool"-adjacent names. They are **separate by design and must not be conflated.**

| Surface | What it is | Backing |
|---|---|---|
| **`/operations`** | The **general friction-register** list + the Stage B filter bar + saved views. The subject of this process doc. | `friction.category` / `friction.case` via the extended `friction.fn_recent_cases` (category / triage_state / action_decision filters) |
| **`/operations/pools`** | **Repair Board v0** — the specialist **pipeline-incident repair** surface. NOT governed by this doc; NOT changed by cc-0015. | notes-`pool_key` parsing + a code-side editorial catalog; no DB pool tables |

cc-0015 **coexists with** Repair Board v0; it does not supersede or modify it. Pooled resolution (this doc) operates only on `/operations`.

---

## Section 9 — Current shipped surface + known deferrals

**Shipped and in use (cc-0015):**
- Stage A — pool schema (`dashboard_ui` category + `friction.pool_session`) — applied + verified.
- Stage A.5 — recategorisation backfill (3 dashboard-UI cases → `dashboard_ui`) — applied + verified.
- Stage B RPC — `fn_recent_cases` category/triage/action filters — applied + verified.
- Stage B frontend — `/operations` filter bar + saved views + URL-param filters + category-description hydration on the triage form — deployed to production.
- Stage F — operator help copy — deployed; production smoke PASS.

**Current saved views (Section 3 maps cadence to these):**
- Dashboard UI · Register reconciliation · Pipeline/friction cases · All tracked · New/untriaged

**Known deferrals — do not assume these exist when running a session:**
- **Stage C** — batch resolution UI — **HELD** (session Step 8 batch candidates are notes only until this ships).
- **Stage D** — status-strip pool counts — **HELD**.
- **Stage E** — pool-session tracking UI — **HELD** (`friction.pool_session` exists from Stage A, but there is no UI writing to it yet).
- **Source filter** on `/operations` — **DEFERRED**.
- **Sort** on `/operations` — **DEFERRED**.
- **FAB category-description hydration** — **DEFERRED** (the `/operations` triage form has live category descriptions; the FAB does not).

> **cc-0015 is NOT complete.** Stage G (this doc) being authored does not complete cc-0015 — Stages C/D/E remain held and the above remain deferred.

---

## Appendix A — Change log

| Date | Change | Author |
|---|---|---|
| 2026-05-26 | Initial authoring (cc-0015 Stage G). Documentation-only; no production mutation. | PK CCD directive + CCD |
| 2026-05-26 | **V-G1 approved** — PK confirmed this doc as the operating reference for the current cc-0015 `/operations` saved-views + pooled-resolution surface. Stage C/D/E remain held; cc-0015 NOT complete; +4-week process review due ≈ 2026-06-26. | PK + CCD |

---

*ICE-PROC-002 is a process document. It does not weaken any apply-time gate (D-01, V-checks, close-the-loop). It governs the operating rhythm around the shipped `/operations` friction-register surface, and is explicitly scoped to what exists today — not to the held Stage C/D/E surfaces.*
