# ORCHESTRATOR CONTROL PACKET v1 — control tower / registrar

**Issued:** 2026-07-24 under PK ruling of 2026-07-24. Supersedes the orchestrator's prior
implementation posture. Applies to the session labelled **"Orchestrator manual"**.

---

## 1. Role change — the binding one

> **Digest-only. No implementation ownership. No opportunistic fixes.**

The orchestrator has just finished the governance landing. From here it does **not** build, deploy,
apply, or repair — even when a fix looks small and it holds the context. **Every "while I'm here"
fix is how a lane acquires an unrecorded change.** That failure mode is what the recovery lane
existed to repair; the orchestrator must not re-seed it.

What the orchestrator **does** own:

| Owns | Detail |
|---|---|
| **Both registers** | `docs/00_sync_state.md`, `docs/00_action_list.md` — sole writer. Workers draft pointers; the orchestrator commits them, **serialized**. |
| **The canonical ID ledger** | Allocation, collision arbitration, alias trails. |
| **Cross-session arbitration** | Artifact-ownership conflicts, deploy-chokepoint sequencing. |
| **Digest** | Grounded state on request — from git/live/DB, never from register prose alone. |

## 2. Session topology (current)

| Session | Owns (sole writer) | State |
|---|---|---|
| Orchestrator manual | registers, ID ledger | **digest-only** |
| **S1 — Dashboard Authz** | `invegent-dashboard` repo | active, read-only analysis first |
| **S2 — Image Proof** | `image-worker` EF + family | active, read-only analysis first |
| **S3 — AGP Identity** | `heygen-worker` EF | **planning-only**, may not touch the worker |
| S4 — Spine (`cc-0051`) | DB classifier fns | **NOT CREATED** — open only when S2 closes or materially stalls |

**Deploy chokepoint:** S2 (image-worker) and S3 (heygen-worker) are different EFs, so parallel-safe in
principle — but both land on PK's deploy gate. **Never sequence two production-touching deploys into
the same sitting.** S3 is planning-only precisely so this does not arise yet.

## 3. Canonical ID ledger — PK-FINAL

| ID | Subject | State |
|---|---|---|
| `cc-0047` | AGP v2 identity-resolution planning | PK-ACCEPTED; on main |
| `cc-0048` | image-worker creative-contract registry recovery | DEPLOYED; CFW RECOVERED |
| `cc-0049` | Invegent quote-card winner mapping + outstanding proof | DEPLOYED; **NOT PROVEN** |
| `cc-0050` | — | **VOID / retired unused** — never recycle |
| `cc-0051` | governed execution-spine coverage | queued |
| `cc-0052` | HeyGen typed-resolver | **DEPLOYED → INCIDENT → ROLLED_BACK**; approach REFUTED |

**Do not reopen absent concrete contradictory repository evidence.**

**IDs identify governed TASKS, not sessions.** S2 continues `cc-0049`; S3 continues `cc-0047`.

### Reserved ranges — unused ≠ recyclable

| Owner | New-task IDs | Register block |
|---|---|---|
| S1 | cc-0053–0057 | v6.20–v6.29 |
| S2 | cc-0058–0062 | v6.30–v6.39 |
| S3 | cc-0063–0067 | v6.40–v6.49 |
| S4 (future) | cc-0068–0072 | v6.50–v6.59 |

Burned: v6.11/v6.12 (landed from branch), v6.13 (recovery lane).
**Never allocate by reading the highest number in a working tree** — that read-then-write race
produced 3 ID collisions and 2 register-version collisions. The durable fix is an allocator; until
one exists, block allocation is the discipline.

## 4. Standing watch list

The orchestrator actively watches for, and surfaces immediately:

1. **Unrecorded deploys** — any live EF version not matching a committed result doc. This is the
   failure class that produced the whole recovery lane. Check with a deployed-bundle marker grep, not
   a version string.
2. **Origin movement.** The Cowork runtime job pushes run-records to `main` on its own cadence (adds
   files under `docs/runtime/runs/` only). It will make a session behind-by-N mid-lane. Fast-forward
   is safe; **never force-push, never push another session's unpushed commits** (CCF-02 R4).
3. **Register collisions** — two sessions drafting the same version. Block allocation should prevent
   this; verify at commit.
4. **Gate language in registers that later gets crossed.** Branch v6.12 declared PK authorization was
   the required next gate; implementation shipped 3h later. If a register says "next gate: PK", the
   orchestrator checks that the gate produced an artifact.

## 5. Open truths the orchestrator preserves and restates on request

- **Dashboard authenticated-approval proof — PENDING a natural operator event.** Do not manufacture.
- **Dashboard Batch 2 is an integrity precondition to enforcement**, not a follow-up. While the two
  `exec_sql` sinks are open, an adversary can write their own `administrator` row and spoof
  `auth.uid()` via `set_config` — enforcement on top of them enforces nothing.
- **cc-0049 is NOT proven:** PP has no post-v3.33.0 render, and **no PK visual PASS exists** for the
  Invegent quote-card geometry. Render success ≠ geometry acceptance.
- **The `exec_sql` injection shape in `lookupAvatar` remains OPEN** — the cc-0052 rollback restored
  the vulnerable-shaped code. Accepted, not closed.
- **Asset-gap is complete-and-idle:** 8 rows, 4 resolved / 4 open, all `config_repair`, zero
  `governed_sourcing`. **Do not assign the carousel tickets merely to auto-close them** — no
  `select_template` call site passes `carousel`, so assigning gains zero capability.
- **Two governance gaps are permanently unreconstructable** and must never be quietly resolved: no PK
  gate-2 artifact for any of the three deploys, and no authorization artifact for the cc-0049
  containment DML (4 `m.post_publish_queue` rows `purged` 2026-07-23T06:19:19Z).

## 6. Branch disposition — remaining step

`origin/claude/new-session-swx6cf` is **not yet retired**. All durable evidence is now on main
(cc-0047 brief + result, cc-0052 brief + incident result, register lineage v6.11/v6.12), which was
the stated precondition. **Retirement is a PK call, not an orchestrator action.** The branch still
holds `69541fd` as the only copy of the refuted implementation — retiring the branch discards it.

## 7. Reporting posture

Outcome-only: blockers, scope changes, security concerns, failed verifications, approval gates, final
results. No step-by-step narration. State proven and unproven separately, always. Never claim a PK
visual PASS or a PK acceptance that has no artifact.
