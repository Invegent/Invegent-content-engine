# CCF-02 Phase 1 — Orchestration Contract Packet (Risk Routing + Findings Contract) v1

**Created:** 2026-07-05 Sydney · **Lane class:** SAFETY_GATE (self-applied per §3, pending ratification) · **Tier:** T1 docs-only, escalated to external review + PK ratification (governance-change trigger — precedent: `ice-workflow-acceleration-convention-packet.md` line 6)
**Scope:** docs/convention ONLY — no DB, no code, no dashboard, no deploy, no secrets, no production work, no new agents, no brief-author promotion, no TMR/D6 artifact change. **Pause rule honoured:** D6 untouched; lane pauses if D6 needs attention.
**Status:** DRAFT — stops at the PK ratification gate. Nothing here is in force until PK ratifies; the CLAUDE.md amendment in §5 is proposed text only.
**Skeleton:** drafted with `brief-author` (CANDIDATE — second registered run; NOT promoted by this lane).
**Supersession note (resolves the skeleton's Q1):** §1 below is proposed as the **successor text of Convention 3** — ratifying this packet ratifies Convention 3 *in this form*, superseding `ice-workflow-acceleration-convention-packet.md` §3 (which remains cited precedent). Every delta from that §3 text is flagged **[DELTA]** so PK ratifies changes visibly, never silently.

---

## §1 Convention 3 (successor) — Risk-tiered review chains

**Rule:** Gate 1 assigns every lane a tier. Doubt or mixed scope → the HIGHER tier. Escalation upward is free mid-flight (any auditor or the lead, on evidence); de-escalation requires a fresh Gate 1. Production gates get stricter, not looser.

| | **T1** | **T2** | **T3** |
|---|---|---|---|
| **Lane types** | docs / registers / read-only evidence gathering / parking moves | dark or additive DB (zero callers, fenced) · isolated code in worktree (no deploy) · read-only dashboard surfaces · **candidate-agent builds + proving runs [DELTA: added per PK 2026-07-05]** | production-touching: deploy · migration on objects WITH callers · publish · runtime/worker change · security posture (grants/SECDEF/RLS) · **secrets/credentials [DELTA: named explicitly]** · anything irreversible |
| **Required reviewers** | none beyond orchestrator verify-or-abort + **branch-warden** (`authorized-main-docs`) pre-commit + readback diff | relevant auditor(s) by scope (db-rls-auditor for any DB · security-auditor when grants/SECDEF/exposure · creative-graph-auditor for registry · dashboard-ia-lint for dashboard IA) + **branch-warden** + hermetic tests where code/DB | FULL chain: builder isolation (ef-builder/worktree) · all scope-relevant auditors · independent lead re-verification of subagent claims · **branch-warden** |
| **External review** | NOT required — unless a §1.2 escalation trigger fires | **REQUIRED**, pinned to the artifact hash; re-review on any change | **REQUIRED** on the final artifact hash; re-review on any change; non-clean verdict = hard stop |
| **PK live gate** | commit on PK instruction; push on explicit PK instruction; no live presence | PK gates asynchronously (single gate or a Convention-2 conditional sequence); no live presence during execution | **EXPLICIT PK gate** — deploy/merge/migrate/publish remain PK-run or PK-authorized hard stops; a Convention-2 sequence (with its 7 non-removable STOPs) is the only one-sitting form |
| **Rollback expectations** | git-revert path stated in the result doc (trivially reversible) | rollback artifact **written and validated before apply** (e.g. reverse-DML with expected counts); execution not required | rollback **recorded AND proven before apply** (validated against live state; promotion-guarded where applicable); an invalidated rollback path is a mandatory STOP |
| **STOP conditions** | verify-or-abort anchor mismatch · file set ≠ approved set · unexplained HEAD movement | the Convention-2 §2.1 mandatory list on any sequence · fail-loud DML asserts (expected-rowcount aborts) · any auditor non-clean verdict · hash drift at any checkpoint | everything in T2 **plus** named live pre-checks (pool/caller/posture checks specific to the lane) · deployed/applied artifact mismatch · nothing waived, ever |

### §1.1 Hard tier-assignment rules (carried from precedent §3.2, unchanged)
Any DML/DDL against the live project ≥ T2 · DDL/DML on objects WITH callers, or any grant/SECDEF/posture/secret change → T3 · any deploy/publish/push-to-main of runtime code → T3 · mixed scope → highest tier touched.

### §1.2 Escalation triggers (carried from precedent §3.4, unchanged)
External-review escalation to PK · any auditor non-clean verdict · governance/contract change (like THIS packet) · anything touching money, client-visible output, or credentials → treat as one tier higher.

### §1.3 What Convention 3 does NOT change
The 6 external-review triage classes and their routing (CLAUDE.md) are **preserved untouched** — tiers decide *when* review runs; triage classes decide *what a non-clean verdict means*. Conventions 1+2 unchanged; the 7 mandatory STOPs remain non-removable.

### §1.4 T3 vs current practice — element-by-element proof of no weakening (external-review request, 3792e950)
Every element of today's proof-lane/CLAUDE.md chain maps to the T3 row unchanged or strengthened; nothing is removed:

| Current practice (CLAUDE.md / proof lane) | T3 under this packet |
|---|---|
| ef-builder isolated worktree for code | required (builder isolation) — unchanged |
| branch-warden before commit/merge | required — unchanged (and now required at ALL tiers) |
| db-rls-auditor when DB touched | required (scope-relevant auditors) — unchanged |
| security-auditor on posture lanes | required — unchanged; posture explicitly pinned to T3 |
| external review on final diff/plan, hash-pinned, stale-on-change | required — unchanged |
| PK hard stop on deploy/merge/migrate | required — unchanged; Convention-2 sequence (already ratified) is the only one-sitting form |
| independent lead re-verification of subagent claims | required — **newly written down** (was practice, now contract) |
| rollback recorded before apply | **strengthened**: recorded AND proven before apply |
| live pre-checks | **strengthened**: named live pre-check STOPs are mandatory, not ad-hoc |
| fail-loud DML asserts | required — unchanged |

The only chain *reductions* anywhere in the tier table are at T1/T2, which today already run lighter chains by proven precedent (docs lane v3.55; dark-DB lanes v4.76–v4.81) — the table writes existing right-sizing down; it does not loosen T3 by one element.

---

## §2 Findings JSON contract (CCF-02 item 3 — answers Phase 0 O-4)

Every subagent/auditor returns its findings in this shape (exactly PK's 10 fields, top-level):

```json
{
  "verdict":   { "normalized": "clean | concerns | block | escalate | not_applicable", "native": "<the agent's own vocabulary word, preserved>" },
  "confidence": "high | medium | low",
  "must_fix":  [ { "finding": "<defect>", "evidence": "<path/query/row>", "blocking": true } ],
  "should_fix": [ { "finding": "<improvement>", "evidence": "<…>" } ],
  "observations": [ "<non-actionable but material notes>" ],
  "evidence":  [ { "source": "<path:line | query | url>", "grounds": "<which claim>" } ],
  "scope_boundary": "<what was explicitly NOT examined / cannot be claimed>",
  "open_questions": [ { "question": "<…>", "pk_decision_needed": true } ],
  "recommended_next_gate": "<the single next gate this verdict feeds>",
  "non_claims": [ "<explicit non-claims, e.g. 'live truth not verified'>" ]
}
```

**Orchestrator routing rule:** advance only on `normalized: clean`; `concerns` → fix-or-PK; `block` → halt the lane; `escalate` → PK decision gate; `not_applicable` → record why and continue.

### §2.1 Vocabulary map (all six existing vocabularies → normalized; native words retained in `verdict.native`)

| Agent | native → normalized |
|---|---|
| branch-warden | safe→clean · unsafe→block |
| db-rls-auditor | PASS→clean · concerns→concerns · block→block |
| security-auditor | GREEN→clean · AMBER→concerns · RED→block |
| creative-graph-auditor | PASS→clean · FAIL→block · ESCALATE→escalate |
| dashboard-ia-lint | PASS→clean · WARN→concerns · BLOCK→block · NO_GOVERNING_RULE→escalate |
| external review (bridge) | agree→clean · partial→per its triage class (concerns or escalate) · disagree/refusal/timeout→block |
| candidate agents (brief-author, image-harvester, image-reviewer) | DRAFT_READY/HARVEST_COMPLETE/REVIEW_COMPLETE→clean · *_PARTIAL→concerns · *_BLOCKED→block · ESCALATE→escalate |

### §2.2 Mapping from the 6-field sketch recorded at CCF-02 opening (v4.85)
`verdict`→`verdict` · `risk`→absorbed by the lane's **tier** (§1) + `must_fix[].blocking` · `files_checked`→`evidence[]` · `findings`→`must_fix`/`should_fix`/`observations` (severity-split) · `required_changes`→`must_fix` · `confidence`→`confidence`. Phase 0 O-4's evidence trail stays traceable.

### §2.3 Adoption mechanics
Per-agent charter appendix (a T1 docs edit per agent, applied lazily — the next time each agent is invoked, not as a mass rewrite). **No new agents; no tool/permission changes;** native vocabularies remain valid inside `verdict.native`, so historical records stay comparable.

---

## §3 Lightweight lane classification (not a rigid charter)

| Label | Meaning |
|---|---|
| **PRODUCT_PROOF** | advances a client-facing product capability toward or at production proof (e.g. TMR lanes, D6) |
| **SAFETY_GATE** | governance / guards / review infrastructure (CCF lanes, conventions, hooks) |
| **SIDE_PROVING** | bounded candidate-agent or tooling proving runs (e.g. cc-0027) |
| **PARKED** | recorded, NOT runnable |

**Admission rule:** a lane runs only if PK admits it under exactly one label (one line at Gate 1, alongside its tier). **PARKED lanes require explicit PK override before any execution.** Labels are routing/priority metadata — they add one Gate-1 line, not paperwork.

---

## §4 Parallel-session claim protocol (answers Phase 0 O-6)

**Claim object** (five fields): `register_version_claimed` · `lane_name` · `result_doc_path` · `repo/worktree` · `active_gate`.

**Protocol:**
1. **Claim at cut time, not commit time.** Immediately before authoring any register entry: `git fetch` + read the LIVE local register head + scan `docs/briefs/results/*-result.md` stubs for competing claims. Claim `head + 1 + (open stubs claiming higher numbers)`.
2. **Claim marker = the result-doc stub.** Create `docs/briefs/results/<lane>-result.md` immediately with a first line `CLAIMED vX.YZ · <lane_name> · <worktree> · <active_gate> · <UTC timestamp>`. The stub is an untracked docs file — visible to every session sharing the checkout the moment it exists; visible to isolated worktrees at fetch/commit re-check (step 3).
3. **Re-verify at commit.** The committing session re-reads the register head AND re-scans result stubs. On collision: **earlier claim timestamp keeps the number; the later claimant renumbers.** Renumbering is cheap; the invariant is *no two entries share a number*, not who gets which.
4. One version per lane; a renumber is a fresh claim (update the stub line). Stubs graduate into the lane's real result doc — no extra file is ever created.

**Domain precision (external-review request, 3792e950):** register entries are only ever cut in the **shared main checkout** — that is the docs-lane rule (surgical edits directly on main; isolated worktrees are for code, and their lanes record registers back in the main checkout at their commit gates). So the collision surface the protocol must close is exactly one filesystem: the main checkout, where an untracked stub is immediately visible to every session. A session cutting register entries inside an isolated worktree would already be violating the docs lane; step 3's commit-time re-scan (which runs in the main checkout, where all register commits happen) is the backstop for any such stray, because the stub graduates into a committed result doc that every worktree sees at fetch.

**Step-by-step trace against both recorded incidents:**
(a) *v4.82/v4.83 (two lanes completed same day; collision annotated in the register after the fact):* Lane A cuts stub `CLAIMED v4.82 · pp-batch2 · main · apply-gate · T1` at 09:00; Lane B reaches cut time at 11:00, runs step 1 (fetch + head v4.81 + stub scan), **sees Lane A's stub**, claims v4.83. No collision, no annotation needed — prevented at cut time.
(b) *v4.85→v4.86 (S1 lane authored its entry as v4.85 while the CCF closure lane committed v4.85 first; S1 renumbered manually after the fact):* under the protocol S1 cuts a stub claiming v4.85 at its cut time; the CCF lane at ITS cut time scans stubs, sees S1's earlier timestamp, claims v4.86 instead (or vice versa — earlier timestamp keeps the number either way, per step 3). The manual renumber-after-collision becomes a deterministic rule applied before any commit.
Residual risk stated honestly: two sessions cutting within the same seconds could both miss the other's stub; step 3's mandatory commit-time re-scan catches exactly that window, and the earlier-timestamp rule resolves it without judgment.

---

## §5 Proposed CLAUDE.md amendment (exact, surgical; applied ONLY on PK ratification, as its own T1 docs lane)

**Edit 1 —** in the `## Workflow acceleration conventions` header/intro, replace the sentence stating Convention 3 is NOT ratified with: `Convention 3 (risk-tiered review chains) was ratified <DATE> via docs/briefs/ccf-02-phase1-orchestration-contract-packet.md (successor text; supersedes the pending §3 draft in the original conventions packet).`

**Edit 2 —** append after Convention 2:

```markdown
3. **Risk-tiered review chains.** Gate 1 assigns a tier; doubt/mixed scope → higher tier.
   T1 (docs/read-only): verify-or-abort + branch-warden + readback; external review only on
   escalation triggers. T2 (dark/additive DB · isolated code · read-only dashboard · candidate
   agents): scope-relevant auditors + branch-warden + hermetic tests + external review pinned to
   hash; rollback written+validated before apply. T3 (production-touching / deploy / publish /
   posture / secrets / irreversible): full chain + independent lead re-verification + explicit PK
   gate (or a Convention-2 sequence) + named live pre-check STOPs + rollback proven before apply;
   nothing waived. DML/DDL ≥ T2; callers/grants/deploy/publish/secrets → T3; escalation up free,
   de-escalation needs a fresh Gate 1. Triage classes and Conventions 1–2 unchanged.

## CCF-02 orchestration contract (Phase 1 — ratified <DATE>)

- **Findings contract:** subagents/auditors return the 10-field findings JSON
  (verdict{normalized,native} · confidence · must_fix · should_fix · observations · evidence ·
  scope_boundary · open_questions · recommended_next_gate · non_claims — schema + vocabulary map:
  packet §2). Orchestrator advances only on normalized `clean`; concerns→fix-or-PK; block→halt;
  escalate→PK. Adopted lazily per agent as a T1 charter edit; no tool/permission changes.
- **Lane classification:** Gate 1 admits every lane under exactly one of PRODUCT_PROOF /
  SAFETY_GATE / SIDE_PROVING / PARKED, alongside its tier. PARKED runs only on explicit PK
  override.
- **Parallel-session claims:** before cutting any register entry, claim via the result-doc stub
  (`CLAIMED vX.YZ · lane · worktree · gate · timestamp` as line 1), after fetch + head read +
  stub scan; re-verify at commit; earlier timestamp keeps the number, later claimant renumbers.
```

---

## §6 What this packet does NOT do
No change to: PK gate authority · the 6 external-review triage classes/routing · Conventions 1+2 (7 STOPs non-removable) · any agent's tools/permissions · guard enforcement posture (all 4 stay log-only, flips separately PK-gated) · TMR/D6 artifacts or gates · pending PK-gated register commits (not bundled). No agent is built or promoted (brief-author remains CANDIDATE). Phase 2 (manual adoption on 2–3 real lanes) and Phase 3 (automation of proven parts) stay separately gated.

## §7 Adoption plan (on PK ratification) + rollback
1. PK ratifies (edits re-hash the packet and re-trigger review). 2. Apply §5 to CLAUDE.md (T1 docs lane, verify-or-abort). 3. Every new Gate 1 states **tier + label**; the claim protocol is effective for all new lanes immediately. 4. Findings contract adopted lazily per agent (T1 charter edits). 5. Phase 2 = the next 2–3 real lanes run the full contract manually and record friction; Phase 3 automation remains gated on Phase 2 evidence. **Rollback:** revert the CLAUDE.md section + mark this packet superseded — docs-only, trivially reversible.

## §8 Evidence + honesty notes
Phase 0 grounding: O-4 (six vocabularies → §2), O-6 (two recorded collision incidents → §4, paper-tested), O-1/O-5 (packet shape + pipeline-written-once → §1/§5). Measurement tally stated honestly: Phase 0 asked for 2–3 measured lanes; v4.88 records two (both 1-attempt packet cuts), cc-0027 adds a third (~35 min, 1 attempt) — the threshold is met. This lane records its own two measurements in its result doc. **Dogfood claim (worked example of §4, informal — protocol not yet ratified):** `CLAIMED v4.96 · ccf-02-phase1-orchestration-contract · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK ratification · 2026-07-05T~13:30Z` — the stub will be cut at recording time if PK ratifies; if a parallel lane records first, this lane renumbers per §4.3.
