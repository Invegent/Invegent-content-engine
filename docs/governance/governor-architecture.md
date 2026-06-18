# ICE Governor Architecture (Phase 0 spec)

**Status:** Phase 0 — accepted architecture, **no implementation**. This document records the
agreed design for *Governors*. It is a specification, not a build. No Governor named here is
built yet (branch-warden excepted — it predates and inspired this spec).

**Companion:** the external-review protocol (`reviewed_input_hash` + mandatory triage
classification + routing) is **already landed** in [`CLAUDE.md`](../../CLAUDE.md) under
"External review gate". This document references it and does not duplicate it.

---

## 1. Executive summary & principles

ICE's high-risk programmes (notably the SECURITY DEFINER / D-002 remediation, now formally
closed) succeeded on execution discipline. The one recurring weakness was **drift between
decision time and action time** — a remembered or derived fact going stale before the mutation
it authorized. The answer is not more stateful agents (another copy of state that can drift);
it is **deterministic governance that recomputes from ground truth close to the moment of
action**.

A **Governor** is a stateless, read-only component that *observes* ground truth, *classifies*
drift, and *never decides*. Governors generalize the pattern `branch-warden` already proves.

**Principles encoded by this spec:**

- **Facts are observed, not remembered.** A Governor recomputes from authoritative sources; it
  never trusts a passed-in summary as truth.
- **Assertion values are generated, not hand-typed.** Tooling fills a packet's observations by
  querying ground truth at draft time. A human authors *intent*, never the expected values.
- **Apply-time re-check.** Observations recorded at draft are recomputed immediately before the
  mutation and compared.
- **Drift is classified, not binary-STOP.** Benign drift may be ruled rebase-safe / proceed-safe;
  material/critical drift stops the lane. A Governor that false-STOPs on benign drift trains
  bypass and is rejected.
- **TOCTOU → in-path enforcement.** Where the gap between check and apply is dangerous (e.g.
  grants), the assertion is enforced inside the same transaction/execution path as the mutation,
  not only in a detached preflight.
- **Governors are stateless, read-only, no memory, no commit/deploy/mutation tools.**
- **Deterministic where possible.** The Governor is a *contract*; pure recompute (SHA compare,
  row counts, grant-bit reads) is a script/SQL, and an LLM agent is reserved for where
  classification adds value.

Guiding line: **the closer a fact is to mutation time, the more it must be recomputed from
ground truth.**

## 2. Why branch-warden is the reference implementation

`branch-warden` is not an analogy — it is a working Governor that has **caught real drift** (the
Lane A upstream advance `97da883 → c350ef7 → d2f6fd6`, and again on the governance-doc lane
itself). It exhibits every required property:

| Property | branch-warden |
|---|---|
| Stateless | fresh every invocation; no lane memory |
| Read-only | inspects git; cannot commit/push/mutate refs |
| Observes ground truth | HEAD, branch, parity, file set, diff — recomputed live |
| Classifies | `safe` vs `concerns`/`stop` with explicit reasons |
| Never decides | returns a verdict; orchestrator/PK decides |
| Idempotent | same ground truth → same output |

Every future Governor copies this shape. The thesis is "we have one that proved itself —
generalize it from git to grants, advisors, counts, deploys, reviews," **not** "invent governors."

## 3. Governor contract

A **Governor** is any component — script or read-only agent — satisfying this contract.

**MUST**
- Be **stateless** (no persistence/memory between runs).
- Be **read-only** (reads only authoritative ground-truth sources).
- Produce **observations** (facts recomputed now) and, where judgment helps, a **classification**
  (benign / material / critical) with explicit, human-readable reasons.
- Be **idempotent** (identical ground truth → identical output).
- Recompute from source every run — never validate against a derived/remembered summary.

**MUST NOT**
- Hold commit, push, merge, deploy, migrate, `GRANT/REVOKE`, DML/DDL, or any mutation tool.
- Make or imply a **decision** (proceed/abort) — it informs; the orchestrator or PK decides.
- Read a derived summary as a source of truth (it may *report* one, never *validate* against one).

**Implementation rule (deterministic-first):**
- **Pure recompute** (SHA/diff/count/grant-bit/parity) → **deterministic script / SQL** (no LLM).
- **Classification / interpretation** (is this drift benign? is this review a defect or a policy
  call?) → **read-only LLM agent**, branch-warden-shaped.
- A Governor may be a thin agent wrapping deterministic probes — the probes own the facts; the
  agent only classifies.

**Allowed tool profile (agent-form Governors):** `Read, Grep, Glob, read-only git (Bash),
SELECT-only SQL, list_*, get_advisors, get_edge_function`. **No** Edit/Write/commit/deploy/
apply_migration tools.

**Named Governors (identical contract, different adapters):**
- **Git Governor** = `branch-warden` (exists).
- **Packet Governor** — populates + re-checks packet observations.
- **Closure Governor** — recomputes end-state after apply.
- **Deployment Governor** — recomputes production state after deploy.
- **Register Generator** — derives summary counts (**a script, not an LLM agent**).

## 4. Packet schema

A packet has three zones: **`intent`** (human-authored — *what* and *why*), **`observations`**
(machine-generated, never typed), and **`gates`** (the apply contract). Example for a security
grant-revoke lane:

```yaml
packet:
  id: SEC-...-batch-N
  lane_type: security_grant_revoke        # selects the observation adapter
  intent:                                  # HUMAN-AUTHORED ONLY
    action: "revoke EXECUTE from anon,authenticated on <targets>"
    targets: [<function identities>]
    rationale: "<why>"
    intentional_retains: { service_role: true }   # explicit human intent (e.g. auth_client_id() for RLS)

  observations:                            # MACHINE-GENERATED at draft; re-checked at apply
    generated_at_head: <git sha>
    branch: main
    origin_parity: { ahead: 0, behind: 0 }
    diff_hash: <sha256 of intended diff>            # code lanes
    reviewed_input_hash: <hash>                     # ties to the external review (CLAUDE.md rule 4)
    db:
      function_signatures: [<oid/identity per target>]   # from pg_proc
      current_grants:                                    # from pg_proc.proacl / information_schema
        <target>: { anon: true|false, authenticated: true|false, service_role: true|false }
      advisor_state: [<relevant get_advisors rows>]
      register_status: { open_findings_entry: OPEN|CLOSED }
    callers:
      authenticated_browser_callers: <int>            # observed cross-repo (read-only)

  gates:
    apply_time_recheck: required            # Packet Governor re-runs observations before apply
    toctou_enforcement: in_transaction      # where it matters (§6) — the mutation carries its own guard
    drift_policy: classify                  # never binary-STOP (§6)
    review_required: true
    pk_hard_stop: true
```

Notes:
- `intent` is the only zone a human edits; `observations` are filled by the adapter and read-only
  thereafter.
- The packet is **lane-typed**; `lane_type` selects which observation adapter runs
  (security / publisher / dashboard).
- `diff_hash` / `reviewed_input_hash` make review staleness machine-detectable (see CLAUDE.md
  rule 4).

## 5. Observation generation rules

1. **Generated, never typed.** Every field under `observations` is populated by tooling querying
   ground truth. If a human can type a value there, the schema is wrong.
2. **Two timestamps, one comparison.** Observations are generated at **draft** and recomputed at
   **apply**; the Packet Governor compares and classifies any delta (§6).
3. **Source of truth per domain (no derived copies):**

   | Observation | Authoritative source | Never from |
   |---|---|---|
   | HEAD / branch / parity / file set / diff hash | git | memory, prior packet |
   | function identity / signatures | `pg_proc` | docs |
   | current grants | `pg_proc.proacl` / `information_schema.role_routine_grants` | register/summary |
   | advisor state | `get_advisors` | summary |
   | review hash + verdict + triage | review store (`m.chatgpt_review`) | recollection |
   | register *status* (OPEN/CLOSED, intentional retains) | the register (this is *intent*) | inference |
   | deploy SHA / EF flags / residual metrics | Vercel API / `list_edge_functions` / live SELECT | dashboards |

4. **Observed-state vs intent split.** "What is true now" (grants, advisors, SHAs) is recomputed
   from systems. "What we mean" (intentional retains, scope, OPEN/CLOSED) is read from the
   register. A Governor never *infers* intent and never *validates observed state against* the
   register.
5. **TOCTOU boundary.** For facts that can change between check and apply (grants), the
   authoritative re-check is enforced **in the apply transaction** (the migration carries a guard
   that re-reads `proacl` and aborts on mismatch), not only in the preflight. The preflight catches
   stale packets cheaply; the in-transaction guard closes the residual gap.

## 6. Drift taxonomy

Drift = any delta between draft-time and apply-time observations (or between observations and the
action's preconditions). It is **classified**, never treated as a binary stop.

| Class | Triggers (examples) | Output | Lane action |
|---|---|---|---|
| **Benign** | origin advanced but is a **clean ancestor**; drift is **docs-only**; **none of my target files/objects touched**; parity behind-only and fast-forwardable | `benign: rebase-safe` / `proceed-safe`, delta enumerated | auto-classify rebase-safe; orchestrator rebases or proceeds; **no hard stop** |
| **Material** | my **target files changed upstream**; **grant state changed** vs observed; **advisor state changed**; **target set count changed**; **review hash ≠ current packet hash** (review stale) | `material: STOP` + specific reason | **STOP** → regenerate observations / re-review / re-authorize |
| **Critical** | **migration content changed**; **security state changed under us**; **apply target differs** from what was reviewed/authorized; ground-truth source unreadable | `critical: STOP` | **HARD STOP** → surface to PK; no auto-resolution |

**Canonical benign test (must pass):** the Lane A case — `behind: 2`, both commits docs-only,
clean ancestor, my files untouched upstream → the Governor must emit `benign: rebase-safe`, **not**
`parity != 0/0 → STOP`. A taxonomy that hard-STOPs here is rejected.

**Rule:** every classification carries (a) the class, (b) the exact delta, (c) *why it matters* (or
doesn't). "parity≠0/0" alone is never an acceptable output.

## 7. Register generated-summary format

The register separates a **generated block** (observed, recomputed, do-not-hand-edit) from
**authored entries** (intent, human-owned).

```markdown
<!-- GENERATED:governor=register-generator DO NOT HAND-EDIT BELOW -->
## Summary (generated <stamp> from ground truth)
- open findings: <n>                 # source: authored entries (intent)
- closed last 30d: <n>               # source: authored entries with closure stamp
- functions still granted anon/authenticated: <n>   # source: pg_proc.proacl (OBSERVED)
- search_path pinned / remaining: <n> / <n>         # source: pg_proc (OBSERVED)
<!-- /GENERATED -->

## Findings (authored — human intent)
- <finding entries ...>
```

Rules:
- **Observed-state counts** (grants remaining, search_path pinned) are computed from
  `pg_proc`/`proacl` — the same source the action reads, never from counting register lines.
- **Intent counts** (open/closed findings) are computed from authored entries.
- The generated block is rewritten wholesale by the **Register Generator (a deterministic script,
  not an LLM)**; hand-editing it is a contract violation a Governor can flag (block hash mismatch).
- This kills count drift at the source: summaries can no longer be typed.

## 8. Review protocol (already landed — reference only)

The external-review requirements are **live** in [`CLAUDE.md`](../../CLAUDE.md) → "External review
gate", and are **not duplicated here**:
- **Rule 4 — `reviewed_input_hash`** mandatory; a review is valid only for the exact packet/diff
  hash it reviewed; on change the review is stale and must be re-run.
- **Rule 5 — mandatory triage classification:** `concrete_defect`, `missing_evidence`,
  `structural_DDL_DML_escalation`, `policy_decision`, `scope_design_concern`,
  `runtime_verification_required`, with per-class **triage routing**.

A Governor consumes these fields (e.g. the Packet Governor STOPs on `reviewed_input_hash`
mismatch); it does not redefine them.

## 9. Backtest requirements (before any Governor goes live)

**No Governor enters the live loop until its classifier is proven against real history** — the same
proof-lane discipline that proved `ef-builder` and `branch-warden`. Backtest is read-only, no apply.

**Mandatory replay cases:**
1. **Lane A upstream drift** (docs-only, clean ancestor) → must classify **benign: rebase-safe**. A
   false-STOP here **fails the backtest**.
2. **The `ice_publication_evidence` overclaim** (packet claims columns that don't exist) → must
   classify **material/critical: STOP** on observation mismatch vs `information_schema`.
3. **A grant case** where observed `proacl` matches intent → **proceed-safe**; and a synthetic case
   where a grant changed under us → **material: STOP**.
4. **Review staleness** — diff changed after review → **STOP** on `reviewed_input_hash` mismatch.

**Pass criteria:** 100% correct class on the mandatory cases; **zero false-STOPs** on the benign
cases (the trust-killer); every output carries a *why-it-matters* reason. Backtest results reviewed
at a PK gate before the Governor runs in any real lane.

## 10. Implementation roadmap (not authorized by this doc)

0. **(done / in progress)** Governor contract + packet schema + drift taxonomy + register format
   (this doc); **review-protocol edit landed** in `CLAUDE.md`.
1. **Packet Governor** — built, then **backtested (§9)**, then one live lane behind a PK gate.
2. **Closure Governor** — reuses Phase-1 adapters; post-apply end-state recompute.
3. **Deployment Governor** — deterministic part first (SHA/flags/SQL residuals); browser-network
   surface (no client `/rpc/`) as an evidence add-on.
4. **Register Generator** — a deterministic script; reporting layer; last.

Each is branch-warden-shaped. Deterministic where possible; LLM only for classification. **Each
phase is its own gated lane and requires explicit PK authorization** — this document authorizes
none of them.

## 11. Explicit non-goals

- **No implementation** of any Governor (Packet/Closure/Deployment) or the Register Generator is
  authorized by this spec. It records architecture only.
- **No stateful governance agents, ever** — no Lane State Keeper, Evidence Ledger, or memory
  coordinator. A Governor that holds state is rejected by the contract.
- **No decision-making by Governors** — they observe and classify; humans/orchestration decide.
- This document makes **no DB/migration/grant/code/deploy/product/security change** and does not
  reopen the formally-closed D-002 remediation (`auth_client_id()` retained intentionally for RLS).
