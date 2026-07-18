# Brief CCF-05 — ICE Engineering Control Plane + thin governed orchestrator (rev-2)

**Created:** 2026-07-18 Sydney · **Revised:** 2026-07-18 (rev-2, incorporating PK Gate-1 verdict on rev-1)
**Author:** CCF-05 lane (orchestrator-drafted)
**Executor:** PK decision at Gate 1 (this brief proposes; nothing is built)
**Status:** ✅ **RATIFIED (rev-2) — T1 governance-document phase ONLY.** PK Gate-1 decision recorded below. This approval authorises writing the governance specs; it authorises **no** implementation, automation, register change, deployment, production action, or new registered agent.
**Lane class:** SIDE_PROVING · **Tier:** T1 (read-only design; no DB, no code, no deploy, no production touch, no register cut)
**Result file:** `docs/briefs/results/ccf-05-engineering-control-plane-result.md` (created on completion)
**Register:** NOT claimed by this lane — register version is claimed through the TMR Lane Orchestrator session (head v5.67), and only after PK ratifies rev-2.

---

## PK Decision Panel (Gate-1 ratification of rev-2)

> The brief must demonstrate the gate-compression it proposes — so the decision is on one screen. Every item below is grounded in the deliverables that follow.

**APPROVE (7 decisions):**
1. **File-based control plane, not a DB table** — separate authored / observed / compiled / event / envelope artifacts (Deliverable 1). No DB during the pilot.
2. **Invoked supervisor under the new charter — no always-on registered agent** for the first build; prove the control plane manually first (Deliverable 2, Deliverable 6).
3. **Manual, human-controlled stale-lease reclamation** — explicit lease expiry/renewal; expiry = *suspected-stale candidate*, never an ownership transfer (Deliverable 3, Strong-5).
4. **A distinct deterministic compiler** — same architectural pattern as the governor Register-Generator, but a separate component (Deliverable 6, OQ4).
5. **CCF-05 doc homes** — governance specs → `docs/governance/{control-plane-schema.md, thin-orchestrator-charter.md, approval-envelope-protocol.md}`; operating/generated artifacts → `docs/control-plane/` (committed) + `_harness/control-plane/` (regenerated) (OQ5).
6. **Session context-state = advisory + human-attested, never proof**; the session-recycle adapter is **OPTIONAL** in the pilot — the core control plane works with zero session-management tools (Deliverable 7, OQ6).
7. **Pilot manually on ONE live multi-lane window** before any automation (Deliverable 6).

**NOT approved by this gate (explicitly deferred to their own future PK gates):** compiler implementation · any new registered agent · any DB change · any session-management automation or reliance on unaudited session tools · any production / deploy / promotion / governance-flip action · any register cut or `CLAUDE.md` amendment.

### PK Gate-1 ratification (2026-07-18) — three operating clarifications carried into the governance specs

1. **`ready_to_dispatch` ≠ `ready_to_execute`.** `declared_only` ownership may qualify a lane for **dispatch**; writer **execution** requires observed claim evidence and `ownership_status: matched`, with `writer_count` exactly one. (→ Deliverables 1, 3.)
2. **The active thin-orchestrator seat is the SOLE writer of authored control-plane operating artifacts during the pilot.** Lanes keep owning their result docs and claim stubs, but do **not** directly edit `intent.json` or the pilot event log. Approval envelopes are written by the orchestrator and become immutable once presented to PK. (→ Deliverables 1, 2, 4.)
3. **`generated_at_head == live HEAD` is NOT sufficient freshness proof.** `observed.json` must carry a **complete source fingerprint** — HEAD, git status, worktree inventory, claim/result stubs, register state — and gate preparation must either rerun the compiler or verify the full fingerprint still matches. (→ Deliverables 1, 5; RQ3.)

**Residual rulings:** RQ1 — a formal session-tool capability audit is approved as a **precondition** to the optional adapter; the first pilot proceeds **without** it. RQ2 — the first event log is **arc-/pilot-scoped**, thin orchestrator as sole appender; **not** one permanent global file. RQ3 — regenerate immediately before gate preparation, or validate the full source fingerprint before trusting cached compiled state.

**Deliverable 5 division of labor (clarified):** the deterministic compiler **observes and reconciles facts**; the thin orchestrator performs **gate preparation and semantic synthesis**.

**Scope of this approval:** CCF-05 rev-2 is ratified for the **T1 governance-document phase only**. Nothing here authorises implementation, automation, register changes, deployment, production action, or a new registered agent.

---

## Task

Design the **ICE Engineering Control Plane** — a durable, queryable projection of the coordination state that today lives as prose across registers, claim-stubs, result docs, and the orchestrator's *ephemeral scratchpad baseline* — plus a **thin governed orchestrator** that operates it as a **dispatcher + evidence compiler**, not a technical director or a standing watcher. Goal: scale ICE feature delivery with safety/quality uncompromised by attacking the four real bottlenecks (sequential dependency structure, shared-state contention, gate-preparation quality, PK cognitive fragmentation) — **not** by adding agents (we have enough) and **not** by recreating the CCF-03-retired observer. Output is this Gate-1 brief only; nothing is applied.

## Source context

- `CLAUDE.md` — the standing ICE orchestration contract (tiers, gates, claim protocol, external-review gate, deploy gotchas). CCF-05 builds *under* it and amends nothing.
- `docs/briefs/ccf-02-phase1-orchestration-contract-packet.md` — the LIVING substrate: T1–T3 tiers (§1), 10-field findings contract (§2), lane labels (§3), **parallel-session claim protocol (§4)** with its own honestly-stated residual gap. CCF-05 hardens this substrate; it does not replace it.
- `docs/briefs/results/ccf-03-phase0-closeout-result.md` — the RETIRE verdict (Option A). Substrate STRONGLY validated across ~20 lanes / 3 parallel sessions / zero unrecovered collisions; observer ROLE value **not demonstrated**. The reconciliation in §5 turns on this document.
- `docs/briefs/ccf-04-mechanical-assistants-charter.md` — "remove manual effort WITHOUT removing judgment"; zero-authority assistants; the explicit reject list (auto claim-resolution, auto-merge, auto-approval…). CCF-05's compiler and orchestrator sit inside these boundaries.
- `docs/governance/governor-architecture.md` — stateless, read-only, **facts observed not remembered**; recompute from ground truth; branch-warden is the reference; the Register-Generator is a deterministic script, not an LLM. The compiler is a Register-Generator-class component.
- `docs/governance/orchestrator-operating-manual-v1.md` — the empirical spine. The supervisor seat is a **reader + relay**, holds **no authority**, verifies from ground truth not reports, runs a digest loop, a cross-lane hazard checklist, and paste-block discipline. **§0.4 puts the cross-lane picture in the session's scratchpad** — the exact ephemeral-state failure CCF-05 fixes.
- `docs/00_action_list.md` → **🧭 Active parallel lanes** (2026-07-16): "One writer per edge function; scope lanes by the artifact they own, not by topic"; claim-stub before any register cut; deploy sequencing held by the orchestrator; deploy stays a PK hard-stop. The WIP model CCF-05 formalizes.

## Framing (read first)

CCF-05 is **not greenfield**. It is a *hardening* of the CCF-02/03 substrate: promote the coordination facts that already exist (claims, R4, register heads, result-doc stubs, git state, the manual's baseline snapshot) from prose scattered across files and one session's scratchpad into a **queryable projection over that same substrate**. Per governor-architecture §1, the answer to drift is *not more stateful agents* (another copy of state that can drift) — so the control plane is a **projection regenerated from ground truth**, not a new authoritative store.

Two hard corrections shape every part of the design:

- **A — Durable state lives in files, never in an agent's conversation.** Any orchestrator session must reconstruct the *entire* cross-lane picture from the substrate after a cold start. The manual's scratchpad baseline is replaced by committed files.
- **B — Do not recreate the CCF-03-retired standing observer.** The substrate absorbs routine contention. CCF-05 adds durable *artifacts* + a *thin, invoked* operator that runs to prepare a gate then stops — not a permanent watcher. §5 proves the distinction with real evidence.

**Governing rev-2 principle — provenance is enforced by file boundaries, not by convention.** rev-1 mixed human and machine content in one `control-plane.json` and used "OBSERVED where derivable, else AUTHORED" slots. Both are removed. In rev-2, *which file a field lives in determines its provenance*: authored intent, observed ground truth, and derived reconciliation are physically separate artifacts, so no field can silently switch provenance and no single file becomes a human/machine edit-contention hotspot.

---

## Deliverable 1 — Control-plane schema (multi-artifact; provenance by file)

**Decision (OQ1 — PK ruled: files, reject single-file, no DB in pilot).** Five artifacts, each with exactly one provenance and one writer-class:

| Artifact | Home | Provenance / writer | Mutability |
|---|---|---|---|
| `intent.json` | `docs/control-plane/` (committed) | **Authored** — human/orchestrator intent only | edited by the orchestrator/PK; never machine-overwritten |
| `envelopes/<id>.json` | `docs/control-plane/envelopes/` (committed) | **Authored** — one file per approval envelope | **immutable once presented to PK** (a change = a new envelope id) |
| `events-<arc>.jsonl` (arc-/pilot-scoped, RQ2) | `docs/control-plane/` (committed) | **Authored audit record** — orchestrator sole appender | append-only; never rewritten or regenerated (see Strong-7) |
| `observed.json` | `_harness/control-plane/` (regenerated) | **Observed** — recomputed from ground truth by the compiler | wholesale-regenerated; never hand-edited |
| `compiled.json` | `_harness/control-plane/` (regenerated) | **Derived** — the join of intent + observed for querying | wholesale-regenerated; a convenience view, never a source |

A combined/queryable view (`compiled.json`) MAY be generated, but it is **never the only file** and **never mixes concurrent human/machine editing** — human edits land in `intent.json`, machine facts in `observed.json`, and the compiler reconciles them into `compiled.json`.

**Field-provenance rule (mandatory-2 — every field one fixed provenance).** "OBSERVED-where-derivable-else-AUTHORED" is killed. Authored and observed values never share a slot; the compiler emits an explicit reconciliation status. Example for surface ownership:

```jsonc
// intent.json (AUTHORED)
{ "lanes": [{ "id": "cc-00xx", "arc": "tmr", "tier": "T3", "label": "PRODUCT_PROOF",
              "declared_owner_of": ["ef:image-worker"],          // authored intent
              "required_predecessors": ["<lane_id>"], "blockers": ["<id>"],
              "next_pk_gate": "<one line>", "approval_envelope": "<envelope_id|null>",
              "stop_conditions": ["<lane-specific STOP>"] }],
  "arcs": [{ "id": "tmr", "title": "...", "label": "PRODUCT_PROOF", "status": "active",
             "depends_on": ["<arc_id>"] }] }

// observed.json (OBSERVED — compiler, from git + result-doc stubs + register heads)
{ "source_fingerprint": {                                        // freshness proof (clarification 3 / RQ3)
    "head": "<sha>", "git_status_hash": "<sha of porcelain status>",
    "worktree_inventory_hash": "<sha of `git worktree list`>",
    "stub_scan_hash": "<sha of docs/briefs/results/* CLAIMED lines>",
    "register_head_hash": "<sha of 00_sync_state + 00_action_list heads>" },
  "generated_at_head": "<sha>",                                  // convenience; NOT a sufficient freshness signal alone
  "surfaces": [{ "surface_id": "ef:image-worker",
                 "observed_claim_lane": "cc-00xx",               // who actually claimed it (stub/branch)
                 "observed_writer_commits": ["<sha>"] }],
  "lanes": [{ "id": "cc-00xx", "observed_branch": "...", "observed_commit": "<sha>",
              "observed_register_version": "v5.xx" }] }

// compiled.json (DERIVED — reconciliation only)
{ "surfaces": [{ "surface_id": "ef:image-worker",
                 "declared_owner_lane": "cc-00xx", "observed_claim_lane": "cc-00xx",
                 "ownership_status": "matched" }] }   // ∈ {matched · declared_only · observed_only · conflict}
```

`ownership_status ∈ {matched, declared_only, observed_only, conflict}` is the reconciliation signal the orchestrator acts on — `conflict` or `observed_only` (someone claimed a surface no lane declared) is exactly the cross-lane collision the thin orchestrator surfaces to PK.

**Killer query — two thresholds (clarification 1: dispatch ≠ execute).** A pure read over `compiled.json`, no LLM (governor deterministic-first rule):
- **`ready_to_dispatch`** — a lane with no open blocker, all `required_predecessors` closed, and every needed surface at `ownership_status: matched|declared_only`. `declared_only` is enough to *dispatch* a window to the lane.
- **`ready_to_execute` (writer)** — the stricter gate: `ownership_status: matched` (observed claim evidence present) AND `writer_count == 1` on every owned surface. A lane may not perform a write until it clears this threshold.

**Sole-writer rule (clarification 2).** During the pilot the active thin-orchestrator seat is the **only** writer of the authored operating artifacts (`intent.json`, the event log, envelopes). Lanes keep owning their **result docs and claim stubs** (the compiler observes those into `observed.json`); they never edit `intent.json` or the event log directly. This keeps the authored artifacts single-writer and collision-free, consistent with the surface-ownership model applied to the control plane itself.

**Why files, not a DB table (OQ1 rationale, PK-confirmed):** a committed file satisfies hard-correction A (every session reconstructs from git); the claim protocol (CCF-02 §4) already treats the shared main checkout as the single collision surface; a DB table would be a *new mutable production surface* behind RLS/PGRST exposure and "another copy of state that can drift" (governor §1). The split further prevents the single file from becoming ICE's highest-contention surface.

## Deliverable 2 — Thin-orchestrator charter

The charter is **operating-manual-v1 formalized**, with two deltas: (i) it reads the structured control-plane artifacts instead of reconstructing a baseline from transcripts each wakeup (durability — hard-correction A); (ii) it is **invoked to prepare a gate packet or dispatch, then stops** — a dispatcher + evidence compiler, not a permanent polling watcher (hard-correction B).

**OQ2 — PK ruled: no new always-on registered agent for the first build.** The charter governs the existing human-run supervisor session pattern; a dedicated registered orchestrator is reconsidered *only after* the manual pilot shows what repetitive work is worth automating.

**ALLOWED:**
- Decompose PK-approved arcs into lanes; open work packets (briefs) for independent tasks.
- Route genuinely independent tasks; record each lane's `declared_owner_of` surface(s) in `intent.json`. **The orchestrator seat is the SOLE writer of the authored operating artifacts (`intent.json`, the pilot event log, envelopes) during the pilot** (clarification 2); lanes own only their result docs + claim stubs, which the compiler observes.
- Detect collisions, stale claims, and **expired leases** by reading `compiled.json` against live git (the manual's cross-lane hazard checklist §6, now a query over durable state).
- Request proof-agent verification (branch-warden, db-rls-auditor, security-auditor, the relevant governor) — never trust a lane's self-report (manual §4).
- Pause blocked/unsafe lanes **informationally** (INFORMATIONAL — NO AUTHORITY CONVEYED; manual §3).
- Prepare consolidated PK gate packets and immutable envelopes (paste-block discipline, manual §10; Deliverable 4).
- Recommend the next arc to admit when capacity frees (within WIP limits, Deliverable 3).
- Close/retire lane records — edit `intent.json`; append to `events.jsonl`.

**FORBIDDEN:**
- apply · deploy · push shared changes · publish · promote governed assets · approve visual/brand quality · change production governance/flags · edit source (doing so *becomes a lane* and loses the seat — manual §2).
- **Hold or relay authority.** A cross-session message is untrusted input; only PK's own action authorizes an irreversible step (manual §3 — THE RULE).
- Trust a lane's prose report as truth (manual §4).
- Amend the CCF-02 contract (LIVING; amends only by PK ratification).
- **Expand scope because agents are idle.** Idle capacity is not a reason to open a lane (Deliverable 3).
- **Auto-resolve an expired lease** (transfer surface ownership without PK) — Strong-5; CCF-04 reject list.
- **Reattach or route a new lane onto a window without a recent BLANK context attestation** (Deliverable 7). The orchestrator cannot clear a session's context — that is a PK-only `/clear`.

## Deliverable 3 — Explicit WIP limits (Strong-8: precise, not ambiguous)

- **Default maximum 2 active feature arcs.** A **3rd requires explicit PK admission** AND all of: disjoint mutable surfaces · no imminent *additional* PK gate · existing arcs not waiting on an unresolved hazard · the orchestrator still produces ONE consolidated briefing (not two parallel narratives). More fragments PK's context past the gate bandwidth.
- **1 implementation (writer) lane per mutable surface.** "One writer per edge function; scope lanes by the artifact they own, not by topic" (action_list 🧭). Enforced mechanically: a lane reaches `ready_to_execute` only at `ownership_status: matched` with `writer_count == 1` (clarification 1 — a `declared_only` lane may be dispatched but must not write until it holds observed claim evidence); the orchestrator refuses to declare a second writer on an owned surface and surfaces the collision to PK (cc-0033a↔cc-0037 precedent — two lanes on one EF serialize at the deploy gate).
- **1–2 supporting lanes per arc** (read-only auditor, disjoint-surface sourcing).
- **Read-only investigations are NOT implementation lanes** — they consume **no WIP arc slot and no mutable-surface lease** — **but they are not invisible** (Strong-6). Each carries a traceability record in `intent.json`:
  ```jsonc
  { "investigations": [{ "task_id": "inv-00x", "requester": "<lane|orchestrator>",
                         "question": "<what is being asked>", "evidence_source": "<paths/queries>",
                         "result": "<pending|summary ref>", "expiry": "<utc>" }] }
  ```
  Delegated reasoning stays traceable; an expired investigation with no result is a flag, not a silent drop.
- **A new lane opens only** for genuinely independent work (disjoint surfaces) **or to remove a blocker** — never to fill idle capacity.

## Deliverable 4 — Bounded approval-envelope protocol

Gate batching done safely = a rigorous Convention-2 (CCF-02) + governor apply-time re-check + manual §10 paste-block, expressed as an **immutable** `envelopes/<id>.json` the orchestrator prepares and PK executes:

```jsonc
{ "envelope_id": "...", "lane": "...", "presented_at": "<utc>",   // immutable once presented — a change = a new id
  "pinned": { "reviewed_input_hash": "...", "diff_hash": "...", "artifact_version": "..." },
  "ordered_steps": ["1 ...", "2 ..."],
  "preconditions_still_true": ["named live pre-check A", "..."],   // re-checked immediately before apply
  "automatic_stops": ["hash mismatch", "unexpected origin movement", "any non-clean review",
                      "named live pre-check fail", "deployed artifact mismatch",
                      "unexpected files in change set", "invalidated rollback"],  // 7 non-removable Convention-2 STOPs + lane-specific
  "max_scope": { "files": ["..."], "objects": ["..."] },
  "expected_post_step_evidence": ["step 1 → rowcount = N", "step 2 → live SELECT shows ..."],
  "rollback": { "written": true, "validated_before_apply": true, "path": "..." },
  "no_improvisation_outside_envelope": true }
```

**Immutability (mandatory-1):** once an envelope is presented to PK it is frozen; any change mints a new `envelope_id` (this is `reviewed_input_hash` discipline made physical — CLAUDE.md external-review rule 4). **A tripped STOP voids the remainder; resumption requires a fresh PK gate.** The envelope *pins* an irreversible step; it never self-authorizes it — deploy/merge/migrate/publish stay PK-run hard stops.

**Calibration — what combines vs stays separate** (the judgment PK ratifies):

- **COMBINES into one envelope** when steps share **one** judgment and every gate between them is machine-checkable:
  - `apply_migration` + in-transaction pool-neutrality/fail-closed assertion + post-apply live SELECT/sha256 proof — one judgment, all evidence mechanical (image-workflow P2 "per-apply guards never waived" + governor Closure-Governor end-state recompute).
  - build → branch-warden → external review pinned to hash → the deploy command — one judgment ("ship this exact reviewed artifact"), gated by the 7 STOPs. The deploy still stays PK-run.
- **STAYS SEPARATE** when a **new human judgment** intervenes:
  - A **governance flip** (enable a client, flip a guard to production) **after** a visual/quality proof is a **distinct PK judgment** — image-workflow §2: "PK visual verdict is the only deciding act," fenced-until-approved default.
  - Deploy an EF (code-correct judgment) vs then flip its per-client governance flag (client-safe judgment) — two gates. A `policy_decision` PK already answered is *answered, not passed* (manual §9), but a *new* posture flip is a new decision.
  - Security/posture changes (grants, SECDEF, secrets) never combine — T3, nothing waived.

**The rule:** combine steps behind one judgment with mechanical gates; split the moment a visual, governance, or security judgment intervenes.

## Deliverable 5 — CCF-03 reconciliation (why this is not the retired observer)

CCF-03 retired the **standing observer role** — a permanent, zero-authority watcher that polled `lastActivityAt` and, across a ~20-lane window, **never had to speak**: every collision (v5.17→v5.18, v5.20→v5.21, the closeout's own v5.27→v5.28→v5.29) was absorbed by the substrate. The role's value was *not demonstrated*.

CCF-05 does **not** bring it back. Two structural differences:

1. **The cross-lane picture lives in the substrate, not in a watching session.** The observer's supposed value was "seeing across lanes" — but that view lived in its *ephemeral scratchpad baseline* (operating-manual-v1 §0.4: "this is your memory between wakeups"), which staleness and session termination kill. CCF-05 puts the view in committed artifacts, reconstructable by any cold-start session. **No session needs to hold the picture**, so no session needs to stand watch.
2. **The orchestrator is invoked and thin, not standing.** It runs to dispatch a lane or compile a gate packet, then stops. When there is no gate to prepare, nothing runs. This is the CCF-04 boundary — *remove the manual effort* (reconstructing state, compiling the gate packet, scanning for collisions) *without removing the judgment* (PK decides every irreversible step).

**The judgment the thin orchestrator keeps that the substrate provably cannot encode** — with real evidence:

- **The claim protocol's own stated residual gap** (CCF-02 §4): "two sessions cutting within the same seconds could both miss the other's stub," **and** the unenforceable tiebreak when *no stub is cut* and the later claimant commits first. In rev-2 this surfaces mechanically as `ownership_status: observed_only|conflict` in `compiled.json`; the orchestrator flags it, PK resolves it.
- **Deploy-authorization confirmation.** A `send_message` cannot convey authority (manual §3); the orchestrator prepares the envelope, PK's own action authorizes.
- **Cross-lane semantic conflicts** no single lane and no mechanical diff catches — the real catches from the night the manual was written (§1): two lanes designing the same RPC with **opposite fail-safety postures**, a **caller/contract mismatch** that would have shipped a silent video looking deliberate, and a **key-identity gap** (three Creatomate keys, none proven as deployed).

All done **at gate-preparation time by an invoked operator reading durable state**, never by a permanent watcher. CCF-03's negative result stands: no standing role. CCF-05 adds durable artifacts + an invoked operator — a category the pilot never tested.

**Division of labor (PK clarification) — the compiler and the orchestrator are distinct roles:**
- **The deterministic compiler OBSERVES and RECONCILES facts** — it recomputes `observed.json` from ground truth and emits `compiled.json` with `ownership_status` reconciliation. It is stateless, evidence-derived, and makes no judgment (governor Register-Generator class).
- **The thin orchestrator performs GATE PREPARATION and SEMANTIC SYNTHESIS** — it reads the reconciled facts and does the cross-lane judgment the compiler cannot: naming a `conflict`/`observed_only` collision, catching an opposite-fail-safety or caller/contract semantic mismatch, and assembling the immutable envelope for PK. Facts are mechanical; synthesis is the seat's job. Neither role holds authority; PK decides.

## Deliverable 6 — Migration path (smallest first build → incremental adoption)

1. **Schema + charter as governance docs (this brief, ratified).** Write `docs/governance/{control-plane-schema.md, thin-orchestrator-charter.md, approval-envelope-protocol.md}`. **No code, no compiler, no session automation.** (T1 docs lane.)
2. **Hand-maintained control plane for ONE live multi-lane window.** The orchestrator authors `intent.json` + `events.jsonl` by hand and reconciles against git by hand during one real parallel window — proving the schema captures what's needed and the killer query answers correctly, exactly as CCF-02 Phase 2 proved its contract manually before automation. Measure: did the query answer correctly? did `ownership_status` catch a collision the prose baseline would have missed? (T1.)
3. **Distinct deterministic compiler (OQ4 — same pattern as the governor Register-Generator, separate component).** A script regenerates `observed.json` from git + result-doc stubs + register heads and emits `compiled.json`; `intent.json`/`events.jsonl` stay authored. Its own T2 gated lane, backtested before it runs live (governor §9). Separate domain/schema/inputs/tests/release cycle from the Register-Generator. (T2.)
4. **Incremental agent adoption.** Lanes begin emitting their claim/surface/evidence into `intent.json` (lazy per-lane adoption, the CCF-02 §2.3 pattern); the orchestrator reads structured state instead of reconstructing from transcripts.

Each step is its own PK-gated lane. Judgment is never automated; approval/promotion/deploy are never automated (CCF-02 Phase 3 posture; CCF-04 standing boundaries + reject list).

## Deliverable 7 — Lane ↔ session attachment + recycle protocol (OPTIONAL adapter in pilot)

**Core model (a direct consequence of hard-correction A):** **lanes are logical** — durable records in the control plane; **sessions/windows are disposable compute** attached to a lane. Truth never lives in a window — it lives in the control-plane artifacts + result docs — so windows are **fungible** and safe to wipe and reuse.

**Mandatory-3 + RQ1 ruling — this whole deliverable is OPTIONAL, and the first pilot proceeds WITHOUT it.** The core control plane (Deliverables 1–6) **works with zero session-management tools** — it is files. The recycle adapter is a *separable layer*; PK approved a **formal session-tool capability audit** (`list_sessions`/`isRunning`/`set_session_title`/`archive_session`) as a **precondition lane** to building the adapter — those capabilities are not assumed. The first pilot runs entirely without the adapter.

**Recycle protocol (stable window pool).** PK may keep a fixed set of named window slots recycled across lanes instead of open/archive churn. When a lane finishes, a window is *reattached* to a new lane — **only after a mandatory context clear.**

**Session-state = advisory + human-attested, never proof (mandatory-3 + OQ6).** `clear_state` is renamed to `context_state_attestation`:
```jsonc
{ "window_slots": [{ "slot_id": "window-A", "attached_lane": "<lane_id|null>",
    "context_state_attestation": { "state": "blank|seeded|active",
                                   "attested_by": "PK|orchestrator", "attested_at": "<utc>" } }] }
```
The orchestrator **refuses to route a new lane onto a window unless a recent BLANK attestation exists**, but **never describes the record as proof the context was cleared** — there is no tool that can verify a real clear.

**Division of labor — recorded tool-by-tool, not overstated:**
- **Context clear = PK-only.** There is **no orchestrator tool to clear/reset a session's context.** It is a user `/clear` inside the window. Hard fact.
- **Orchestrator (subject to the tool-capability audit):** may rename (`set_session_title`) and archive (`archive_session`, prompts PK), and authors/hands the seed brief on reattach — reported verified by the orchestrator session; the audit confirms before reliance.
- **Flow:** lane closes → **PK `/clears` the window (mandatory)** → PK attests BLANK → orchestrator renames + hands the seed → PK pastes.

**Hard rule (safety-critical):** **never reattach/reuse a window without a recent BLANK attestation.** Dropping a new task onto a session still holding a finished lane's context is the known **stale-context-bleed** failure mode (the stale line-refs-post-cc-0037 incident; operating-manual-v1 §11 "least reliable node… stale summaries").

**Equivalence note:** recycle-with-clear and archive-then-open-fresh are functionally identical (both yield a blank, re-seeded session); the control plane treats windows as fungible compute either way. Recycle is an operator convenience over the same attachment model, not a different mechanism.

**Strong-7 — event-history source-of-truth rule.** The event log is an **authored append-only audit record with its own governance** (NOT derived-from-git and NOT regenerated) — because most events (gate presented, PK hold, collision caught, attach/recycle) are orchestrator actions with no git equivalent. **RQ2 ruling:** the first implementation uses an **arc-/pilot-scoped** event log (e.g. `events-<arc>.jsonl` or `events-pilot-<n>.jsonl`), with the **thin orchestrator as the sole appender** — **not** one permanent global event file. Each line self-identifies its source so a reader can trace to ground truth:
```jsonc
{ "event_id": "...", "kind": "claim|verify|gate|apply|close|collision|attach|recycle",
  "source_type": "git|result_doc|register|orchestrator_action|pk_action",
  "source_ref": "<sha|path|envelope_id>", "recorded_at": "<utc>", "recorded_by": "orchestrator|PK" }
```
Lines that mirror a git fact carry `source_type: git` + the sha (traceable, not authoritative); lines recording a human/orchestrator act are the authoritative history of that act. The log is never rewritten — append-only, distinct from the wholesale-regenerated `observed.json`.

---

## Scope

**In scope:** the read-only *design* (rev-2) of the multi-artifact control-plane schema, the thin-orchestrator charter, WIP limits, the approval-envelope protocol, the CCF-03 reconciliation, the migration path, and the optional session-attachment protocol — as this brief, for PK's Gate-1 ratification.

**Out of scope:** building any artifact or compiler, writing any script, registering any agent, amending `CLAUDE.md`, cutting any register entry, any session-management automation, any DB/code/deploy/production/governance change, any external review (Gate 1 is the review for a draft brief).

## Allowed actions

- Read the cited evidence (done).
- Produce this brief as a file in `docs/briefs/` (a proposal artifact; not a register cut, not a production touch).
- Surface residual open questions and hand the brief to the TMR Lane Orchestrator session for the register claim + PK Gate-1 ratification.

## Forbidden actions

- No implementation of the control plane, compiler, orchestrator, or session adapter.
- No register cut (`00_sync_state.md` / `00_action_list.md`) and no register-version assignment — claimed only through the orchestrator session (head v5.67), and only after PK ratifies rev-2.
- No `CLAUDE.md` amendment (CCF-02 is LIVING).
- No DB / code / deploy / migration / governance-flip / publish / promotion / session automation.
- No relayed authority; no commit; no push.
- Honour active hold-states in `docs/00_sync_state.md` (TMR D6 lane in flight; do not touch it).

## Success criteria

- All seven deliverables present, each grounded in cited evidence, with no invented facts.
- All 4 mandatory + 4 strong rev-1 revisions incorporated; all 6 OQ rulings baked in.
- The design satisfies hard-correction A (state in the substrate; any session reconstructs it) and hard-correction B (no standing observer; §5 distinguishes with real evidence).
- Provenance is enforced by file boundaries; no field mixes authored/observed slots.
- The killer query is answerable from `compiled.json`.
- The PK decision panel demonstrates one-screen gate-compression.
- The three PK operating clarifications (dispatch≠execute · sole-writer orchestrator · full source fingerprint) and all RQ1–RQ3 rulings are carried into the deliverables.
- All questions ruled at ratification; nothing resolved unilaterally.

## Stop condition

Gate-1 ratified (rev-2, T1 governance-document phase only). **Next authorised step:** write the three governance specs — `docs/governance/{control-plane-schema.md, thin-orchestrator-charter.md, approval-envelope-protocol.md}` — carrying the three operating clarifications and all rulings above, as its own T1 docs lane under the orchestrator's register claim (head v5.67). No implementation, no compiler, no session automation, no register change, no production action, no new registered agent is authorised by this approval. Report and stop.

---

## Residual questions — all RULED at Gate-1 ratification (2026-07-18)

All six rev-1 OQs and all three rev-2 RQs are now closed:

1. **RQ1 — tool-capability audit (RULED).** A formal session-tool capability audit is approved as a **precondition lane** to the optional recycle adapter; the first pilot proceeds **without** the adapter. (Deliverable 7.)
2. **RQ2 — event-log scope (RULED).** The first implementation uses an **arc-/pilot-scoped** event log with the thin orchestrator as **sole appender** — **not** one permanent global file. (Deliverable 1 table, Strong-7.)
3. **RQ3 — compiled-view freshness (RULED).** Gate preparation must **regenerate immediately** before use, or **validate the full source fingerprint** (HEAD + git status + worktree inventory + claim/result stubs + register state) still matches. `generated_at_head == live HEAD` alone is insufficient. (Deliverables 1, 5.)

## Notes

- rev-2 is orchestrator-drafted, consistent with the ICE contract's "orchestrator drafts brief → PK approves (gate 1)."
- **Status of this approval:** rev-2 is **ratified for the T1 governance-document phase only.** The design (this brief) is approved; **no artifact, compiler, adapter, or agent is built**, no code/DB/deploy/production change is made, no session automation is enabled, no register version is claimed by this lane (the claim stays with the orchestrator session, head v5.67), and the CCF-02 contract is unchanged. operating-manual-v1 remains the live supervisor manual until the governance specs land and PK ratifies them as its successor. Every implementation, automation, and production step named in the migration path is its own future PK-gated lane.
