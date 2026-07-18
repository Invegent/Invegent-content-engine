# ICE Engineering Control Plane — Schema (CCF-05)

**Status:** design of record — CCF-05 rev-2 ratified 2026-07-18 (T1 governance-document phase).
Source of record: `docs/briefs/ccf-05-engineering-control-plane-brief-v1.md` (Deliverable 1 + PK operating clarifications 1–3 + RQ1–RQ3 rulings). This spec is **operative for the first pilot** (hand-maintained); it supersedes `orchestrator-operating-manual-v1.md` only when PK ratifies the CCF-05 specs as its successor. No compiler, adapter, DB, or agent is authorised by this document — each is its own future PK-gated lane.

**Companions:** `thin-orchestrator-charter.md` (who operates this) · `approval-envelope-protocol.md` (the gate artifacts) · `governor-architecture.md` (the observed/authored + Register-Generator lineage) · `../../CLAUDE.md` (CCF-02 substrate, tiers, claim protocol, external-review gate).

---

## 1. Purpose & first principle

The control plane promotes the coordination facts that already exist in the CCF-02/03 substrate — claims, R4, register heads, result-doc stubs, git state, and the orchestrator's *ephemeral scratchpad baseline* (`orchestrator-operating-manual-v1.md` §0.4) — into **durable, queryable artifacts**. It is a **hardening of the existing substrate, not a new authoritative store.**

**First principle (hard-correction A):** durable state lives in files, never in an agent's conversation. Any orchestrator session must reconstruct the entire cross-lane picture from these artifacts after a cold start. Per `governor-architecture.md` §1, the answer to drift is *not another stateful agent* — so the machine-derived parts of the control plane are a **projection regenerated from ground truth**, never trusted as remembered truth.

**Killer query it must answer:** *"what independent work is ready right now, and who owns each mutable surface?"*

## 2. The five artifacts — provenance is enforced by the file boundary

rev-1's single `control-plane.json` (mixed human/machine content, "OBSERVED-where-derivable-else-AUTHORED" slots) is **rejected**. In rev-2, *which file a field lives in determines its provenance* — no field can silently switch provenance, and no single file becomes a human/machine edit-contention hotspot.

| Artifact | Home | Provenance / writer | Mutability |
|---|---|---|---|
| `intent.json` | `docs/control-plane/` (committed) | **Authored** — human/orchestrator intent only | orchestrator-edited; never machine-overwritten |
| `envelopes/<id>.json` | `docs/control-plane/envelopes/` (committed) | **Authored** — one file per approval envelope | **immutable once presented to PK** (a change mints a new id) |
| `events-<arc>.jsonl` | `docs/control-plane/` (committed) | **Authored append-only audit** — orchestrator sole appender | append-only; never rewritten or regenerated |
| `observed.json` | `_harness/control-plane/` (regenerated) | **Observed** — recomputed from ground truth by the compiler | wholesale-regenerated; never hand-edited |
| `compiled.json` | `_harness/control-plane/` (regenerated) | **Derived** — the join of intent + observed, for querying | wholesale-regenerated; a view, never a source |

A combined/queryable view (`compiled.json`) MAY be generated, but it is **never the only file** and **never mixes concurrent human/machine editing**: human edits land in `intent.json`, machine facts in `observed.json`, and the compiler reconciles them into `compiled.json`.

**Why files, not a DB table:** a committed file satisfies hard-correction A (reconstruct from git); the CCF-02 §4 claim protocol already treats the shared main checkout as the single collision surface; a DB table would be a *new mutable production surface* behind RLS/PGRST exposure and "another copy of state that can drift" (`governor-architecture.md` §1). The split also prevents any single file from becoming ICE's highest-contention surface. No DB during the pilot (PK ruling OQ1).

## 3. Field-provenance rule (PK clarification: every field one fixed provenance)

Authored and observed values never share a slot. The compiler emits an explicit reconciliation status; the human authors intent, the machine records what is true, and the derived layer names the delta. Surface ownership is the canonical example:

```jsonc
// intent.json  (AUTHORED)
{ "arcs": [{ "id": "tmr", "title": "...", "label": "PRODUCT_PROOF",
             "status": "active", "depends_on": ["<arc_id>"], "next_pk_gate": "<one line>" }],
  "lanes": [{ "id": "cc-00xx", "arc": "tmr", "tier": "T3", "label": "PRODUCT_PROOF",
              "declared_owner_of": ["ef:image-worker"],
              "required_predecessors": ["<lane_id>"], "blockers": ["<id>"],
              "next_pk_gate": "<one line>", "approval_envelope": "<envelope_id|null>",
              "stop_conditions": ["<lane-specific STOP>"],
              "lease": { "holder": "<seat/session>", "claimed_at": "<utc>",
                         "renewed_at": "<utc>", "expires_at": "<utc>", "renewal_reason": "<event>" } }],
  "investigations": [{ "task_id": "inv-00x", "requester": "<lane|orchestrator>",
                       "question": "<…>", "evidence_source": "<paths/queries>",
                       "result": "<pending|summary ref>", "expiry": "<utc>" }],
  "window_slots": [{ "slot_id": "window-A", "attached_lane": "<lane_id|null>",
                     "context_state_attestation": { "state": "blank|seeded|active",
                                                     "attested_by": "PK|orchestrator", "attested_at": "<utc>" } }] }

// observed.json  (OBSERVED — compiler, from git + result-doc stubs + register heads)
{ "source_fingerprint": {                                   // §5 — freshness proof
    "head": "<sha>", "git_status_hash": "<sha of porcelain status>",
    "worktree_inventory_hash": "<sha of `git worktree list`>",
    "stub_scan_hash": "<sha of docs/briefs/results/* CLAIMED lines>",
    "register_head_hash": "<sha of 00_sync_state + 00_action_list heads>" },
  "generated_at_head": "<sha>",                             // convenience only; NOT sufficient alone
  "surfaces": [{ "surface_id": "ef:image-worker",
                 "observed_claim_lane": "cc-00xx", "observed_writer_commits": ["<sha>"] }],
  "lanes": [{ "id": "cc-00xx", "observed_branch": "...", "observed_commit": "<sha>",
              "observed_register_version": "v5.xx" }] }

// compiled.json  (DERIVED — reconciliation only)
{ "surfaces": [{ "surface_id": "ef:image-worker",
                 "declared_owner_lane": "cc-00xx", "observed_claim_lane": "cc-00xx",
                 "ownership_status": "matched", "writer_count": 1 }] }
```

`ownership_status ∈ {matched · declared_only · observed_only · conflict}`. `conflict` or `observed_only` (a surface claimed by no declared lane) is exactly the cross-lane collision the orchestrator surfaces to PK — including the CCF-02 §4 no-stub race the substrate alone cannot resolve.

## 4. The killer query — two thresholds (PK clarification 1: dispatch ≠ execute)

A pure read over `compiled.json`, no LLM (deterministic-first, `governor-architecture.md` §3):

- **`ready_to_dispatch`** — a lane with no open blocker, all `required_predecessors` closed, and every needed surface at `ownership_status: matched | declared_only`. `declared_only` is sufficient to *dispatch* a window to the lane.
- **`ready_to_execute` (writer)** — the stricter gate: `ownership_status: matched` (observed claim evidence present) **AND** `writer_count == 1` on every owned surface. A lane may not perform a write until it clears this threshold.

This encodes the WIP invariant "one writer per mutable surface" (`00_action_list.md` 🧭; cc-0033a↔cc-0037 precedent) mechanically.

## 5. Freshness — the full source fingerprint (PK clarification 3 / RQ3)

`generated_at_head == live HEAD` is **not** sufficient proof that a compiled view is fresh: files can change without moving HEAD (uncommitted edits, new stubs, worktree changes). `observed.json` therefore carries a **complete source fingerprint** — HEAD · git status · worktree inventory · claim/result stubs · register state. **Gate preparation MUST either rerun the compiler immediately, or verify that the full fingerprint still matches**, before trusting `compiled.json`. A stale compile is never read at a gate.

## 6. Sole-writer rule (PK clarification 2)

During the pilot the active thin-orchestrator seat is the **only** writer of the authored operating artifacts (`intent.json`, the event log, envelopes). Lanes keep owning their **result docs and claim stubs** — which the compiler *observes* into `observed.json` — but never edit `intent.json` or the event log directly. This keeps the authored artifacts single-writer and collision-free, applying the surface-ownership model to the control plane itself.

## 7. Event log — authored append-only audit (RQ2 ruling)

The event log is an **authored append-only audit record with its own governance** — NOT derived-from-git and NOT regenerated (most events — gate presented, PK hold, collision caught, attach/recycle — are orchestrator/PK actions with no git equivalent). The first implementation uses an **arc-/pilot-scoped** file (`events-<arc>.jsonl` or `events-pilot-<n>.jsonl`) with the **orchestrator as sole appender** — never one permanent global file. Each line self-identifies its source so a reader can trace to ground truth:

```jsonc
{ "event_id": "...", "kind": "claim|verify|gate|apply|close|collision|attach|recycle",
  "source_type": "git|result_doc|register|orchestrator_action|pk_action",
  "source_ref": "<sha|path|envelope_id>", "recorded_at": "<utc>", "recorded_by": "orchestrator|PK" }
```

Lines mirroring a git fact carry `source_type: git` + the sha (traceable, not authoritative); lines recording a human/orchestrator act are the authoritative history of that act.

## 8. Leases (PK ruling OQ3 / Strong-5) — human-controlled

A lease is explicit renewal, **not** a heartbeat and **not** derived from `isRunning`/chat activity (an invoked/stopped orchestrator cannot maintain a heartbeat): `{ holder, claimed_at, renewed_at, expires_at, renewal_reason }`. Renew only at meaningful events (packet accepted · new commit · verification done · gate packet prepared · PK hold). **Expiry marks a *suspected-stale candidate*, never an automatic ownership transfer** — PK or an authorised procedure resolves it (auto-reclaim is on the CCF-04 reject list).

## 9. Session attachment (RQ1 ruling) — optional adapter

Lanes are logical (durable rows); sessions/windows are disposable compute. `window_slots[].context_state_attestation` is **advisory + human-attested, never proof** — routing onto a window is refused unless a recent `blank` attestation exists, but the record is never treated as proof the context was cleared (there is no tool that verifies a real clear; a context clear is a PK-only `/clear`). The whole session-recycle adapter is **optional**; the pilot proceeds without it, and a formal session-tool capability audit is a **precondition** to building it. Detail: `thin-orchestrator-charter.md` §on attachment.

## 10. Non-goals / boundaries

- No compiler, adapter, DB, or registered agent is built or authorised here (each is a future PK-gated lane; the compiler is a distinct deterministic component of the same class as the governor Register-Generator — OQ4).
- The control plane holds no authority and makes no decision; it informs. PK decides every irreversible step.
- It does not amend the CCF-02 contract (LIVING; amends only by PK ratification).
