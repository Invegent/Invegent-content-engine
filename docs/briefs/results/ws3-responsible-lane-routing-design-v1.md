# WS-3 (d) — Routing every non-ready target cell to an owner: design + finding — result v1

**Created:** 2026-08-01 Sydney
**Author:** Claude Code (orchestrator)
**Tier:** **T1** (read-only design; no build, no schema change, no mutation)
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(d) —
"route every non-ready target cell to an owner (readiness queue `responsible_lane` coverage
extended, not rebuilt)"
**Verdict:** `CONCERNS` — **the cell-level routing this task was scoped to extend is already
complete; nothing needs extending.** The real gap is elsewhere and the seed packet's own
non-negotiable constraint determines the only available answer. One PK decision (§5).

---

## 1. Finding — there is no unrouted cell

`get_client_production_readiness_queue(p_client_slug)` (live since v6.78, migration
`20260730120000`) already routes **every** cell mechanically, precedence-ordered, and
fail-closed. Live read, NDIS Yarns, 2026-08-01: **46 cells, 46 routed** — 42 to a named lane,
4 to `NULL` because they are production-ready. There is no cell without an owner.

| `capability_status` (or signal) | → `responsible_lane` |
|---|---|
| `publisher_path_missing` | `publisher_onboarding` |
| *platform currently paused* (precedence: after publisher, before all else) | `capability_enforcement` |
| `template_missing` | `creatomate_global` |
| `pipeline_missing` | `worker_lane` |
| `governance_unproven` | `graduation_governance` |
| `unsupported_silent_degrade` | `capability_template_remediation` |
| `asset_shortage` | **`asset_gap`** — the ONLY route into the Asset Gap lane |
| `ready` but no real schedule/config demand | `dashboard_onboarding` |
| `ready`, real demand, not runtime-reachable | `capability_template_remediation` |
| `unknown` | `NULL` — never fabricated; reason surfaced in `missing_proof_or_gate` |
| `ready`, real demand, reachable | `NULL` — nothing to route |

**Coverage is not the problem. WS-3(d) as scoped is already satisfied.**

## 2. The load-bearing observation: zero cells route to `asset_gap`

Across all 46 NDIS cells, **not one** carries `capability_status = 'asset_shortage'`, so not
one routes to `asset_gap`. Every non-ready cell is `creatomate_global` (template missing) or
`capability_template_remediation` (silent degrade).

This corroborates the ledger from the opposite direction. The DB ledger's four open rows are
all `blocked_by_template`, and the readiness queue independently agrees: **NDIS's problem is
templates, not assets.** Two systems computed from different inputs reach the same verdict.

Consequence for WS-3: activating the live writer (WS-3(b)) will not, on today's evidence,
produce a flow of drainable asset work. It will produce an accurate, continuously-updated
statement that the asset backlog is empty and the template backlog is not. That is a real and
useful outcome — but it should be expected, not discovered as a disappointment.

## 3. The actual gap — and why it cannot be routed here

The ten orphaned items from the markdown register
(`docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md` §3) **cannot be
inherited by `responsible_lane`, and no extension of it would change that.**

The readiness queue is **cell-shaped**: one row per (client × platform × format). The orphans
are **cross-cell pool-depth facts**:

| Orphan | Why no cell carries it |
|---|---|
| NDIS has only 1 governed logo (P1-5) | NDIS `image_quote` is `ready` on that one logo. A single-point pool is a *rotation* risk, not a capability failure — the classifier correctly says `ready`. |
| 1 selectable music track globally (P2-1) | Audio is never measured anywhere in ICE; no cell status reflects it. |
| CFW / Invegent have 0 avatars, 0 voice (P2-3, P2-4) | Their avatar/voice formats are `template_missing` first — the identity gap is masked behind an earlier failure. |
| PP B-roll depth (P2-5) | PP `video_short_stat` is `ready`; depth is invisible to a readiness verdict. |
| Governed video breadth (P0-2, P0-3) | A governance/policy question, not a per-cell status. |
| Invegent/CFW brand colours (P1-2, P1-4) | Closed, and never cell-shaped. |

**A pool-depth fact only becomes a cell status when it makes a cell fail.** These, by
construction, do not — which is exactly why they are P1/P2 quality items rather than P0
blockers, per the register's own operating rule.

## 4. The seed's own constraint decides the answer

There are only two ways to make depth visible:

- **(d-i) Keep a small, explicit, non-cell owner register** for pool-depth items, and leave
  the readiness queue as the authority for cells.
- **(d-ii) Build a pool-depth detector** so depth becomes a cell status routable to `asset_gap`.

**(d-ii) is forbidden.** It requires new `subject_kind` values (music / avatar / voice /
feed-volume / provider-capability), and the standing constraint is explicit: *existing gap
types ONLY — no `subject_kind` CHECK expansion; each is post-proof and needs its own
detector.* That constraint also protects the `governed_auto_sourcing` monopoly, since widening
the pair space would require re-proving that `(static_background, absent)` is still the sole
sourcing pair (the cc-0051 brief already prices this at "all 21 new pairs must be proven
non-sourcing").

**So (d-i) is the only available answer, and it is forced by the constraints rather than
chosen for convenience.**

## 5. ⚠ This overturns the D-1 recommendation I made earlier today

`docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md` §6 recommended
**D-1 Option A** — "route the 10 items via WS-3(d) `responsible_lane` first, then demote the
markdown register." **That recommendation was wrong, and this design is why:** the destination
cannot hold them. Routing-then-demoting would demote the register into a lane that structurally
cannot inherit its contents, producing exactly the silent loss Option A was meant to prevent.

**Corrected recommendation: D-1 Option C — the two-register model**, now reached from evidence
rather than offered as a compromise:

- **DB ledger** (`m.asset_gap_suggestion`, surfaced by `ice_ro.asset_gap_backlog`) is
  authoritative for **analyzer-detected, cell-attributable asset demand**. DB-generated, live,
  no markdown.
- **`get_client_production_readiness_queue`** is authoritative for **cell ownership**. Already
  complete; do not rebuild.
- **A retained, re-scoped register** is authoritative for **cross-cell pool-depth items only** —
  the ~6 live orphans after closures, not the original 15. Everything a detector can see is
  deleted from it, so it stops competing with the ledger.

That is still "ONE register" per *kind of thing*, which is the brief's actual intent; it is not
one register for everything, because the three instruments measure genuinely different objects.

## 6. What this task did NOT do

No build, no schema change, no `responsible_lane` edit, no register re-scoping (that is D-1's
consequence, not this design's authority). The `asset_shortage` → `asset_gap` route is
untouched and remains the only path into the Asset Gap lane. Cell coverage was verified live
for NDIS Yarns only; the other three brands were not enumerated, though the routing logic is
client-agnostic and mechanical.
