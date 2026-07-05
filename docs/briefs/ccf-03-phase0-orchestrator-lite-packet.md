# CCF-03 Phase 0 — Orchestrator-Lite Observation Pilot (Proposal Packet) v1

**Created:** 2026-07-05 Sydney · **Tier:** T1 · **Label:** SAFETY_GATE (docs/planning packet only)
**Status:** draft — stops at the PK review gate. Nothing in this packet is practiced, in force, or binding until PK approves; the packet itself changes no file, register, agent, tool, or authority.
**Scope:** proposal/convention ONLY — no code, no hooks, no DB, no deploy, no secrets, no new agents, no new durable repo documents, no enforcement flips, no authority transfer of any kind.
**Skeleton:** drafted with `brief-author` (PROVEN on docs/planning briefs — this packet is inside that proven scope; CLAUDE.md team table, brief-author row).
**What CCF-03 is NOT:** a new document system. It is a low-friction coordination layer around parallel-session work already happening, layered ON TOP of the CCF-02 contract, which remains the durable coordination substrate unchanged (§13).
**Session-environment facts:** four platform facts load-bearing to this design (per-message PK confirmation on cross-session messages; zero-prompt silent reads; no silent session open/drive/close; the 2026-07-05 push-rejection incident) are **orchestrator-verified session-environment facts, 2026-07-05** — platform mechanics not recorded in repo files. They are marked **[SEF]** below wherever relied on.

---

## §1 Problem statement (grounded in this week's incidents)

ICE runs multiple parallel Claude Code sessions against one repo and one production stack — typically session 1 = TMR/D6/cleanup lanes, session 2 = image harvesting/assets, session 3 = CCF/governance/docs (orchestrator context; parallelism itself is repo-recorded: the Creatomate provider-recon lane ran as a parallel session the same day as the CCF lanes (`docs/00_sync_state.md:41`, v4.99: "provider recon PASS v4.98"), and CCF-02 Phase 2 recorded a *live cross-session claim win* — "concurrent v4.98 claim, zero collision" (`docs/briefs/ccf-02-phase3-synthesis-packet.md:11`)).

The collision surface is real, current, and register-cited:

- **Register version race (recorded incident):** "S1 renumbered v4.85→v4.86 after a concurrent-session version collision" (`docs/00_action_list.md:8`, v4.86 cycle line). The CCF-02 claim protocol was ratified partly on this incident and paper-traced against it (`docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:119-122`).
- **Unpushed-local-ahead push rejection (2026-07-05):** a docs push was rejected because origin had moved — another lane's commit `89088eb` landed first; recovery required read-only remote inspection + rebase of two local commits (`3777374`, `aaf1ea0`). Contract-compliant handling, but a live example of cross-session local-ahead friction. **[SEF]** (orchestrator-verified session fact; the foreign commit is independently register-corroborated: v5.07 records `89088eb` pushed, `docs/00_sync_state.md:9`).
- **Shared-checkout precedent:** an earlier parallel lane "shared the SAME git checkout and the review branch pointer flipped mid-task" (`docs/00_action_list.md:95`); CLAUDE.md carries the standing gotcha "Re-verify HEAD/branch before any commit (shared-worktree race); prefer isolated worktrees" (CLAUDE.md, Standing ICE deploy/DB gotchas).

CCF-02 already closed the *durable-record* side of this (claim protocol `docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:107-123`; R4 harness sub-roots + never-push-foreign-commits `docs/briefs/ccf-02-phase3-synthesis-packet.md:43`). What remains open is the *live-awareness* side: no session currently knows what its siblings are about to touch, so collisions are caught at commit/push time (after work is staged) and every cross-session question routes through PK. Phase 0 tests whether one session, acting as **orchestrator-lite with zero authority**, can move detection earlier and reduce PK interruptions — using only observation capabilities that already exist.

## §2 Why BOARD.md is deferred (Convention-1 rationale)

A committed live-board file is the obvious design and is **deliberately not proposed**:

1. **Convention 1 makes the result doc canonical and registers pointer-only precisely to shrink duplicated truth and collision surface** (`docs/briefs/ice-workflow-acceleration-convention-packet.md:10-41`; CLAUDE.md Convention 1). A committed BOARD.md would be a NEW high-churn shared file — a new drift-and-collision surface of exactly the kind Convention 1 removed, touched by every session on every lane transition.
2. **CCF-02 Phase 3 posture limits new durable coordination machinery to four named zero-authority helpers, none built, each its own future PK-gated lane** (`docs/briefs/ccf-02-phase3-synthesis-packet.md:45-68`; CLAUDE.md Phase 3 posture). A durable board file created now would be a fifth artifact admitted without evidence of need.
3. **The durable substrate already exists:** claim stubs + registers + result docs + the evening board (`docs/briefs/results/evening-board-2026-07-05.md`) already record every claim, gate, and handover durably. Phase 0's question is whether silent observation over those existing surfaces suffices — §11 names the evidence that would justify a durable board in Phase 2, and only that evidence.

## §3 Orchestrator-lite role definition + default

**Role:** one already-running session doubles as a coordination observer across its siblings. **Default: session 3 (CCF/governance/docs) doubles in the role whenever multiple lanes are active.** A dedicated 4th coordination session is an optional later variant, explicitly NOT the Phase 0 default (orchestrator context, PK-approved input).

**Authority: zero.** The role adds no gate, approval, deploy, merge, mutation, or direction power. It observes, warns on exception, and presents consolidated summaries to PK. This extends CLAUDE.md's core principle ("agents reduce cognitive load; PK stays at every irreversible gate") sideways to sessions: the orchestrator-lite is to its sibling sessions what a read-only auditor is to a lane — findings in, decisions stay with PK.

**Amendment B — PK-confirmation prompt as zero-authority ENFORCEMENT (mechanical, not promised):** any orchestrator-to-session instruction sent by message **requires PK confirmation through the platform prompt, per message**; the message then arrives in the target session as a labelled user turn. **[SEF]** The orchestrator-lite therefore mechanically CANNOT silently direct another session — every directive passes through PK's hands by platform construction. This is stronger than a charter promise: the enforcement lives in the tool surface, the same design principle as brief-author's read-only toolset (CLAUDE.md team table). Sessions also cannot silently open, drive, or close sibling sessions (closing/archiving is PK-confirmed; there is no create-session tool). **[SEF]**

## §4 Silent-observation protocol (Amendment A — observe first, message never routinely)

The orchestrator-lite does NOT poll siblings via messages (a poll round-trip costs two PK confirmations — the opposite of the pilot's goal **[SEF]**). Each sweep derives the live board silently, from zero-prompt sources only **[SEF]**:

| State derived | Source (zero-prompt) |
|---|---|
| Which sessions are active | list sessions |
| Each session's current lane / tier / label / gate | full-text search of sibling session transcripts (Gate-1 declarations are mandatory per CCF-02 — CLAUDE.md lane classification) |
| Register head + competing claims | register head reads (`docs/00_sync_state.md`, `docs/00_action_list.md`) + claim-stub scan of `docs/briefs/results/*-result.md` line 1 (protocol: `docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:112-115`) |
| Git divergence / unpushed-local-ahead / foreign commits | `git fetch` + ahead/behind counts + read-only foreign-commit inspection (the R4-compliant handling already contract-mandated: `docs/briefs/ccf-02-phase3-synthesis-packet.md:43`) |
| Worktree occupancy | `git worktree list` |
| Armed/pending PK gates and handovers | known gate/result docs — e.g. the D6 armed sequence and do-not-touch list in the evening board (`docs/briefs/results/evening-board-2026-07-05.md:7-12,28-30`) |

**Sweep cadence:** at natural checkpoints (own commit/cut points; before any PK gate presentation; session start/close), not a timed poll loop — Phase 0 measures whether checkpoint-driven sweeps suffice (§8).

**Transcript-hygiene rule:** sibling transcripts should never contain secret material (R2 rider: conveyance is file-handoff, never-in-transcript — CLAUDE.md R2). If a sweep nonetheless surfaces secret-looking content, the orchestrator-lite reports the hygiene breach to PK and never re-transcribes the material (see Open question Q2).

**Amendment D — live board is non-repo scratchpad only:** the orchestrator-lite may keep its working board in its own session scratchpad/context. It survives context compaction; it dies with the session — an accepted Phase 0 limitation (and itself a measured escalation criterion, §11). **No committed BOARD.md; no new durable repo document.** Any metrics or handover recording goes into the EXISTING evening-board/handover result-doc pattern (`docs/briefs/results/evening-board-2026-07-05.md`), under Convention 1.

## §5 Exception-messaging protocol (exhaustive trigger list)

Messages are the exception, never the routine. Each costs one PK confirmation prompt — counted as a PK interruption in §8's metrics **[SEF]**. The ONLY triggers:

1. **"Hold your push"** — sweep shows the target session about to push into a detected divergence (the 2026-07-05 rejection class, §1).
2. **"Another session owns this resource"** — target is about to touch a register version, worktree, deploy target, secret, or DB object another session has claimed or is mid-flight on.
3. **A D6/product-proof interrupt becomes actionable** — e.g. the armed D6 condition trips (facebook publish of draft `8bbbd34c…` lands, slot 2026-07-05 21:30Z — `docs/briefs/results/evening-board-2026-07-05.md:9-11`) and the owning session should pick it up.
4. **End-of-lane handoff** — a completed lane's carry belongs to another session's queue.
5. **PK-approved instruction relay** — PK has decided; the orchestrator-lite carries the exact instruction (and the platform prompt still confirms the send — Amendment B).

No other message class exists in Phase 0. In particular: no status polls, no progress nudges, no "anything to report?" round-trips.

**Per-session status questions** — when a sibling IS messaged under a trigger, it answers exactly this set (mirrors the CCF-02 claim object, `docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:109`):
- current lane · tier · label;
- resources about to be touched: register versions, worktrees, deploy targets, secrets, DB objects;
- the gate currently waited on;
- unpushed local commits (count + subjects).

## §6 Gate-batching model (presentation-only fence — Amendment C)

Gate batching = **one consolidated PK summary of pending gates across sessions** (e.g. "session 1 waits on the D6 post-publish sequence; session 2 has 18 image verdicts open; session 3 has a register commit pending" — all three real, per `docs/briefs/results/evening-board-2026-07-05.md:14-26` and `docs/00_sync_state.md:9`).

**It is NEVER a combined approval.** Every gate keeps its own pinned hash/artifact and its own individual PK decision. Convention-2 conditional sequence approvals are unchanged and remain per-artifact with their 7 non-removable STOPs (`docs/briefs/ice-workflow-acceleration-convention-packet.md:51-61`; CLAUDE.md Convention 2). Batching changes the *presentation order* of PK's queue, never the *decision unit*. A batch summary that invited a single yes-to-all would be a Phase 0 protocol violation and is forbidden by this packet's own terms (§9).

## §7 Concrete collision examples (what a sweep catches, and when)

1. **Register version race** — the recorded v4.85→v4.86 collision (`docs/00_action_list.md:8`): a sweep's stub-scan + head-read sees both claimants before either commits; the claim protocol's earlier-timestamp rule (`docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:114`) still resolves it — the sweep just surfaces it earlier, before authoring effort is spent.
2. **Push rejection / unpushed-local-ahead** — the 2026-07-05 incident (§1, **[SEF]**): a fetch + ahead/behind sweep detects origin movement (`89088eb`) before the docs session attempts its push → trigger 1 message replaces a rejected push + rebase recovery. This is also Convention-2 STOP #2's signal class (`docs/briefs/ice-workflow-acceleration-convention-packet.md:54`) and R4's named concern (`docs/briefs/ccf-02-phase3-synthesis-packet.md:43`).
3. **Deploy overlap** — two T3 lanes targeting overlapping workers/functions in one day is a real pattern (2026-07-05 alone: fn87 v3.22.0 Option D, then Lane W image-worker v3.23.0 + video-worker v3.4.0 — `docs/00_sync_state.md:9,57`); a sweep that sees two Gate-1 T3 declarations naming the same deploy target fires trigger 2 before either builds.
4. **Secret/resource clash** — two lanes invoking the same provider key or one lane rotating a key another is using mid-flight (posture change = T3; use = T2+rider — CLAUDE.md R2). The rider's Gate-1 declaration is transcript-visible, so a sweep can see two lanes declaring the same secret.
5. **Shared-checkout conflict** — register cuts happen only in the shared main checkout (`docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:117`); the branch-pointer-flip precedent (`docs/00_action_list.md:95`) and the CLAUDE.md shared-worktree gotcha define the class; `git worktree list` + transcript search show who is standing where.

## §8 Success metrics + baseline + observation window

**Metrics (all counted, recorded in the evening-board pattern per Amendment D):**
- PK confirmation prompts generated by orchestrator-lite messaging (each = one PK interruption) — the pilot FAILS its own purpose if this number is high;
- push stops avoided or detected early (vs. rejected-at-push);
- register version collisions (count; v4.86-class);
- unpushed-local-ahead incidents (count; 2026-07-05-class);
- resource-ownership pauses (trigger-2 events and their outcome);
- total PK interruption count across sessions (all sources, to test net reduction — see Evidence gap G3 on baseline);
- gate-batching usefulness (PK's qualitative call per consolidated summary: used / ignored / confusing).

**Baseline = this week's recorded incidents:** 1 register version collision (v4.85→v4.86, `docs/00_action_list.md:8`) + 1 push rejection with 2-commit rebase recovery (2026-07-05, §1 **[SEF]**). Honest note: a full interruption-count baseline was never recorded, so that metric can only be counted forward (Evidence gap G3).

**Observation window (proposed, PK-adjustable — Open question Q1):** the next 5 multi-session working days OR ~10 coordinated lanes, whichever comes first; metrics tallied in each day's evening-board doc; Phase-0 verdict cut at window close.

## §9 Non-goals (hard boundaries) + Forbidden actions (register hold-states carried forward)

**9.1 Hard boundaries (non-goals, PK-set):** no committed BOARD.md or ANY new durable repo document · no new helper (the four Phase-3 helpers stay unbuilt and separately gated — CLAUDE.md Phase 3 posture) · no new agent · no automation · no repo enforcement · no approval/deploy/mutation authority · no replacement of the CCF-02 claim protocol, registers, or result docs · no enforcement flips (all 4 guards stay log-only, flips separately PK-gated — `docs/briefs/results/evening-board-2026-07-05.md:19`).

**9.2 Forbidden actions — active hold-states this pilot (and this packet's lane) must not touch** (source: `docs/briefs/results/evening-board-2026-07-05.md:28-30` do-not-touch + `docs/00_sync_state.md:9`):
- **D6 armed artifact** `af74058b…` — apply only via the PK-approved 7-step post-publish sequence; the orchestrator-lite may OBSERVE the condition tripping (§5 trigger 3) but never runs the sequence itself.
- **Live pool state** — no promotion/deactivation (re-enters the coupling rule; day-hero rollback `3c5a8e2556…` is itself T3/PK-gated).
- **TMR registry statuses** — `production_proven` only via D6.
- **The 4 log-only guards** — no enforcement flips.
- **Creatomate provider account** — TMR-GOV-PROVIDER-1 checklist before ANY cleanup (`docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md`).
- **Hash-pinned harness evidence packages** — new work in its own sub-root (R4).
- **Other sessions' unpushed commits** — never pushed without explicit PK authorization (R4, `docs/briefs/ccf-02-phase3-synthesis-packet.md:43`).
- **Pending register commit** — v5.07 records "register commit pending" (`docs/00_sync_state.md:9`); this packet's lane does not bundle or pre-empt it.

## §10 Phase 1 / Phase 2 sketch (later, gated, evidence-dependent)

- **Phase 1 (only if Phase 0 shows value):** formalize the orchestrator-lite role — named in Gate-1 declarations, sweep checklist written down, evening-board board-section standardized. **Still zero authority; still no new durable doc.** Own PK gate.
- **Phase 2 (only on §11 evidence):** a durable board artifact (committed file or register section), designed then — not now — against the specific failure Phase 0 demonstrated. Own packet, own external review, own PK ratification, consistent with the Phase-3 zero-authority posture (`docs/briefs/ccf-02-phase3-synthesis-packet.md:45-68`).

## §11 Escalation criteria to a durable board file (Phase 2 triggers — evidence, not appetite)

A durable board is justified only if Phase 0 records one or more of: sessions lose claim context · the orchestrator-lite session dies losing too much state (Amendment D's accepted risk materializing) · collisions persist because nothing durable records active claims · overnight coordination needs persistence · silent observation cannot reliably reconstruct the active board. Absent these, Phase 2 is not entered.

## §12 Rollback / removal

Stop the practice. Nothing to un-build, no repo artifact to remove, no charter to revert (this packet adds no CLAUDE.md text in Phase 0). The CCF-02 claim protocol, registers, and result docs continue unchanged — they never stopped being the coordination substrate (§13).

## §13 Relationship to CCF-02 (unchanged substrate; advisory layer on top)

The CCF-02 contract is living and amends only by PK ratification (CLAUDE.md CCF-02 section; `docs/briefs/ccf-02-phase3-synthesis-packet.md:86-87`). CCF-03 Phase 0 changes none of it:
- **Claim protocol** (`docs/briefs/ccf-02-phase1-orchestration-contract-packet.md:107-123`) — remains THE durable collision-prevention mechanism; the orchestrator-lite reads its stubs, never writes or renumbers another session's claim.
- **R4** (`docs/briefs/ccf-02-phase3-synthesis-packet.md:43`) — harness sub-roots and never-push-foreign-commits remain binding on every session including the orchestrator-lite.
- **Tiers, labels, findings contract, Conventions 1–3, the 7 STOPs, triage classes** — untouched.
- **PK gates** — every one keeps its own hash and its own decision (§6); Amendment B makes the zero-authority claim mechanical **[SEF]**.
CCF-03 layers *advisory awareness* on top: it can say "look before you push" earlier; it can never say "approved."

---

## Success criteria (for this packet's lane, gate-1 shape)

- Packet persisted at `docs/briefs/ccf-03-phase0-orchestrator-lite-packet.md` by the orchestrator, byte-matching the approved draft.
- PK review verdict recorded (approve pilot / amend / reject); if approved, the observation window and metric tally locations are named.
- No register entry, CLAUDE.md change, or practice change occurs before PK approval.

## Stop condition

This packet stops at the PK review gate. On PK approval the pilot begins under §4–§8; on rejection the packet is marked superseded — nothing to unwind (§12).
