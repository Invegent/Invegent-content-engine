# ICE Workflow Acceleration Convention — Ratification Packet (v1)

**Created:** 2026-07-05 Sydney · **Scope:** docs/convention ONLY — no code, no DB, no deploy, no dashboard, no runtime change
**Status:** external review agree zero-pushback (`review_id 4864c9cf-0ba4-4034-ab25-a4dd965436ec`, hash `df4c31bd…`; first attempt `6f4e4418…` = transient worker error, no verdict). **PK RATIFIED CONVENTIONS 1 + 2 on 2026-07-05** — CLAUDE.md amendment applied for those two (docs lane, this date). **Convention 3 (risk-tiered review chains) NOT ratified** — §3 remains a pending PK decision; existing proof-lane/docs-lane precedents continue to govern chain sizing until PK decides.
**Goal:** improve lane throughput WITHOUT weakening governance. Three conventions: (1) recording compression, (2) conditional sequence approvals, (3) risk-tiered review chains.
**Self-classification:** under its own Convention 3 this packet is a **Tier 1** lane (docs-only) — but because it amends the orchestration contract, it is escalated to external review + PK ratification (the "governance change" exception in §3.4).

---

## 1. Convention 1 — Recording compression

**Rule:** the **result doc** (`docs/briefs/results/<lane>-result.md`) is the single canonical full record of a lane. Registers become **pointer entries**. The same long facts are written ONCE.

| Artifact | Role after this convention |
|---|---|
| Packet (`docs/briefs/<lane>-packet.md`) | Pre-gate contract: what/why/hash/plan/boundaries. Not re-narrated in the result — the result links it. |
| Result doc | CANONICAL: identity/hashes, gate trail, verification evidence, non-claims, rollback, carries. |
| `docs/00_sync_state.md` | ONE pointer entry per lane (template §1.1). No narrative mirror. |
| `docs/00_action_list.md` | Marker line updated with the same pointer content; queue-table row updated status + result link only. |
| Memory (auto-memory) | Index-line update only; no fact bodies duplicated from the result doc. |

### 1.1 Register-entry template (both registers)

```
> **✅ vX.YZ <LANE NAME> — <VERDICT/STATUS>** — <identity: ledger/commit/fn-version> · hash `<sha256-8>…` ·
> result `docs/briefs/results/<lane>-result.md` · next gate: <what> · queue impact: <item N status>.
```

Target: ≤ 5 lines / ≤ 80 words. Anything longer belongs in the result doc.

**Worked example — Lane 3 rewritten.** The actual v4.91 sync_state entry ran ~700 words and was mirrored (~700 more) into the action_list marker (~1,400 duplicated words + collision surface). Under this convention it becomes:

```
> **✅ v4.91 LANE 3 SCRIM-48 — APPLIED + VERIFIED** — ledger 20260704002811 · hash `961feef0…` ·
> result docs/briefs/results/lane3-scrim48-result.md · next gate: item 4 rotation (PK policy) ·
> queue: item 3 COMPLETE.
```

Same truth-of-record (the result doc holds every fact the long entry held), ~95% smaller register delta, near-zero collision surface.

**What does NOT change:** result docs stay full-evidence (they may not be compressed); the verify-or-abort / surgical-edit / exact-file-set rules of the docs lane are untouched; memory keeps its own index discipline.

---

## 2. Convention 2 — Conditional sequence approvals

**Rule:** PK MAY approve a multi-step sequence in ONE gate sitting when the approval names (a) the pinned hash, (b) the ordered steps, and (c) explicit STOP conditions. The orchestrator executes end-to-end and HARD-STOPS the moment any STOP condition trips — surfacing to PK, never improvising past it.

This formalizes the proven Lane 4 pattern (2026-07-04): PK's 10-step proceed-sequence took commit → merge → pre-deploy pool check → double deploy → verify → record from days of round-trips to ~40 minutes, with safety carried by the tripwires rather than by per-step sittings.

### 2.1 Mandatory STOP conditions (every sequence approval includes at least these)

1. Artifact hash ≠ the pinned approved hash at any re-verification point.
2. `origin/<branch>` moved unexpectedly (unless branch-warden independently verifies the advance as benign AND unrelated).
3. Any review verdict in the chain is not clean (any `stop`/`block`/`concerns`/non-agree).
4. A named live pre-check fails (e.g. Lane 4's "eligible pool must be exactly these 5 keys").
5. Deployed/applied version or source does not match the approved artifact on post-step verification.
6. Unexpected files appear in the change set (file set ≠ approved set).
7. The rollback path recorded in the packet is no longer valid as written.

PK may add lane-specific STOPs; the orchestrator may add stricter ones; neither may remove from this list.

### 2.2 Conditional-approval template (PK issues; orchestrator echoes back before executing)

```
Approved: <lane> sequence on pinned hash <sha256>.
Sequence: 1) … 2) … 3) … (each step named; deploy/apply/push steps explicit)
STOP conditions: §2.1 list + <lane-specific>.
Reporting: outcome-only at completion, immediate surface on any STOP.
Boundaries: <unchanged hard boundaries for the lane>.
```

**What does NOT change:** each irreversible step still executes only inside an approved sequence; a tripped STOP voids the remainder of the sequence (resuming requires a fresh PK gate); deploy/merge/migrate remain PK-authority actions — the sequence is HOW PK exercises that authority in one sitting, not a delegation of it.

---

## 3. Convention 3 — Risk-tiered review chains

**Rule:** the review chain is sized to the lane's risk tier, decided at Gate 1. Doubt or mixed scope → the HIGHER tier. Production gates get stricter, not looser.

### 3.1 Tier table

| Tier | Lane types | Required chain | Explicitly NOT required |
|---|---|---|---|
| **T1** | docs/registers/read-only evidence gathering; parking-register moves | verify-or-abort anchors · exact file set · branch-warden (`authorized-main-docs`) · readback diff | ef-builder · auditors · external review (unless §3.4 triggers) |
| **T2** | dark/additive DB (zero callers, SELECT-only or fenced INSERT) · isolated code in worktree (no deploy) · read-only dashboard surfaces | relevant auditor(s) (db-rls / security / creative-graph / ia-lint as scope demands) · branch-warden · hermetic tests where code/DB · **external review pinned to hash** | PK live presence during execution (PK gates asynchronously) |
| **T3** | production-touching: deploy · migration on live objects with callers · publish · runtime/worker change · security posture (grants/SECDEF) · anything irreversible | FULL chain (builder isolation · auditors · independent lead re-verification · external review) · **explicit PK gate (or PK conditional sequence per §2)** · live pre-checks with STOP conditions · **rollback proof recorded before apply** | — (nothing waived, ever) |

### 3.2 Hard tier-assignment rules

- Any DML/DDL against the live project ≥ T2; DDL/DML touching objects WITH callers, or any grant/SECDEF/posture change → T3.
- Any deploy/publish/push-to-main of runtime code → T3.
- Mixed-scope lane → the highest tier any part touches.
- An auditor or the lead may escalate a lane's tier mid-flight on evidence; no one may de-escalate without a fresh Gate 1.

### 3.3 Worked examples (recent real lanes)

| Lane | Tier under this convention | What it actually paid | Delta |
|---|---|---|---|
| Lane 3 result/register package (commit of docs + renamed migration file) | **T1** (the APPLY was T3 and paid full chain, correctly; the subsequent register/docs commit is T1) | full pre-commit branch-warden — correct and kept | none — already right-sized |
| **Lane 4 deploy** (rotation alignment, 2 worker deploys) | **T3** with a §2 conditional sequence | exactly the proposed model: full chain + pinned hash + PK 10-step sequence + STOP pool-check + post-deploy byte verification | none — Lane 4 IS the exemplar |
| PP background/asset visibility surfaces (read-only dashboard lanes, e.g. the shadow panel / asset-spreadsheet views) | **T2** (read-only dashboard) | full-chain-equivalent incl. browser review | lighter: ia-lint/relevant auditor + branch-warden + external review; no production gates needed since zero write surface |
| PP asset intake/promotion DML (fenced, resolver-excluded) | **T2** (fenced additive DML, zero callers) → any PROMOTION flipping production-consumed state → **T3** | full chain | mostly right-sized already; convention makes the T2/T3 boundary explicit |

### 3.4 Escalation triggers (override the table upward)

External-review escalation to PK · any auditor non-clean verdict · governance/contract changes (like THIS packet) · anything touching money, client-visible output, or credentials → treat as one tier higher (T1→T2, T2→T3).

---

## 4. Non-negotiables (unchanged and unweakened by all three conventions)

Hash pinning (`reviewed_input_hash` discipline, stale-on-change) · branch-warden before every commit/merge · independent lead re-verification of subagent claims · live-truth re-derivation (registers/bridges never trusted over live HEAD/DB) · pre-deploy STOP checks · fail-loud DML asserts (expected-rowcount aborts) · rollback recorded before apply, proof for T3 · external review for every T2/T3 lane · PK hard stops on deploy/merge/migrate/publish · "AI proposes, PK approves."

---

## 5. Proposed CLAUDE.md amendment (surgical append; exact text)

Append the following section to `CLAUDE.md` after the docs-only register lane section:

```markdown
## Workflow acceleration conventions (v1 — ratified <DATE>)

1. **Recording compression.** The result doc is the canonical lane record. `00_sync_state.md`
   and `00_action_list.md` receive POINTER entries only (≤5 lines: version · verdict · identity/
   hash · result-doc link · next gate/queue impact). Long facts are written once, in the result doc.

2. **Conditional sequence approvals.** PK may approve a multi-step sequence (incl. deploy/apply/
   push) in one gate when the approval pins the artifact hash, names the ordered steps, and
   states STOP conditions. Mandatory STOPs: hash mismatch · unexpected origin movement · any
   non-clean review verdict · named live pre-check failure · deployed/applied artifact mismatch ·
   unexpected files · invalidated rollback path. A tripped STOP voids the remainder; resumption
   requires a fresh PK gate. This is how PK exercises deploy authority in one sitting — not a
   delegation of it.

3. **Risk-tiered review chains.** Gate 1 assigns a tier; doubt → higher tier.
   T1 (docs/read-only): verify-or-abort + branch-warden; no auditors/external review.
   T2 (dark/additive DB · isolated code · read-only dashboard): relevant auditors + branch-warden
   + hermetic tests + external review pinned to hash.
   T3 (production-touching/deploy/publish/posture/irreversible): full chain + PK explicit gate
   (or §2 sequence) + live STOP pre-checks + rollback proof. DML/DDL ≥ T2; callers/grants/deploy
   → T3; mixed scope → highest tier; escalation up is free, de-escalation needs a new Gate 1.

   Non-negotiables (all tiers): hash pinning · branch-warden pre-commit · lead re-verification ·
   live-truth checks · fail-loud DML asserts · rollback before apply · PK hard stops unchanged.
```

---

## 6. What this packet does NOT do

No change to: subagent charters/permissions · the external review bridge or triage classes · PK gate authority · the proof-lane or docs-lane mechanics beyond entry length · memory conventions beyond de-duplication · CCF-02 scope (Convention 3 feeds its routing-rules deliverable; adoption there is CCF-02's own gated work) · lane-admission/product-proof charter (separate PK decision, deliberately not bundled here).

## 7. Adoption plan (on PK ratification)

1. PK ratifies (optionally with edits — any edit re-hashes this packet).
2. Apply the §5 CLAUDE.md amendment (T1 docs lane, verify-or-abort).
3. Next register entries use the §1.1 template immediately; existing long entries are NOT rewritten (no historical rewrite).
4. Next PK multi-step approval uses the §2.2 template.
5. Every new Gate 1 states its tier.
6. Rollback: delete the CLAUDE.md section + revert to prior conventions (docs-only, trivially reversible).
