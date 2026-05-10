# ICE-PROC-001 — Patch Severity & Brief Velocity Discipline

**Status:** Active
**Adopted:** 2026-05-10 Sydney
**Authority:** PK CCH directive 2026-05-10
**Scope:** All `cc-NNNN` briefs in `docs/briefs/` and their derivatives
**Governs:** patch sequencing, addendum routing, rewrite limits, executor triage

---

## Section 1 — Problem statement

`cc-0009` is the empirical trigger for ICE-PROC-001.

**Brief size growth across patch cycles:**
- v1 ≈ 85 KB
- v2 ≈ 102 KB
- v2.1 ≈ 124 KB
- v2.2 attempt ≈ 140 KB → push timeout

**Observed issues during cc-0009 build:**
- Small wording fixes (e.g., the R15 schema-vs-registry clarification) triggered full-brief rewrites
- Patch cycles slowed delivery: each rewrite required re-reading + re-pushing a growing corpus
- Push timeout occurred mid-rewrite, leaving commit status ambiguous and requiring out-of-band verification
- Review overhead (chat-side drafting + ChatGPT review + PK reading) started outgrowing actual stage delivery
- Documentation throughput became the bottleneck, not production safety

> **cc-0009 is the empirical trigger for ICE-PROC-001.** The framework below codifies the discipline learned so cc-0010+ does not inherit the same friction.

---

## Section 2 — Severity model

Every redline (PK CCH directive, ChatGPT review note, PK comment, chat self-flag) gets a severity classification **before** any patch action.

### S1 — Production Safety

**Definition:** The redline corrects something that, if left unpatched in the core brief, could cause incorrect behaviour at apply time or at runtime.

**Examples:**
- Wrong SQL (syntax error, wrong table, wrong column)
- Wrong migration order (FK dependency violation, trigger firing before target exists)
- Missing trigger survey or pre-flight check (would skip a known production hazard)
- Cron schedule collision risk (would overwrite or race an existing job)
- FK behaviour wrong (CASCADE where SET NULL needed, or vice versa)
- Function semantics affecting runtime (e.g., not idempotent when downstream depends on idempotency)

**Rule:** **Must patch core brief before apply.** No addendum substitute. The core brief is the apply-time source of truth and must be correct before D-01 fires.

---

### S2 — Gate / Operational Clarity

**Definition:** The redline corrects something that affects HOW the apply is executed (ownership, sequencing, rollback path) but not WHAT gets applied.

**Examples:**
- Ownership ambiguity (who runs which stage)
- Branch discipline (direct-push vs feature-branch + PR + merge)
- D-01 sequencing (which gate fires when)
- Rollback ambiguity (which path on which failure mode)

**Rule:** **Use addendum by default.** Core brief patch is optional and only if PK explicitly requests. The brief stays frozen; the addendum governs interpretation at apply time and supersedes conflicting brief wording.

---

### S3 — Wording / Narrative Clarity

**Definition:** The redline improves explanatory text without changing apply behaviour or apply procedure.

**Examples:**
- Explanatory wording (clearer rationale paragraphs)
- Schema-vs-registry distinction in narrative (where the empirical check itself is already correct)
- Lesson wording / tagging
- Duplication or redundancy
- Operator narrative polish

**Rule:** **No core brief patch.** Use redline register or chat clarification. Redlines accumulate in the register; chat applies the clarified interpretation in real-time without doc churn.

---

## Section 3 — Tiebreak rules

When severity classification is unclear, default toward the less-disruptive path.

| Ambiguity | Default classification |
|---|---|
| S1 vs S2 | **S2** (addendum) |
| S2 vs S3 | **S3** (redline register) |

Bias toward the least disruptive patch path. Escalate only on explicit PK override.

**Rationale:** S1 misclassification is recoverable — an addendum can be promoted to a core patch if PK directs. S3 over-classification (treating wording fixes as production safety) is **not** recoverable — it causes the cc-0009 churn pattern this framework exists to prevent.

---

## Section 4 — Patch artifacts

### 4.1 Addenda

**Directory:** `docs/briefs/addenda/`
**Purpose:** S2 changes (gate / operational clarity). Each addendum supersedes specific wording in the core brief without rewriting it.
**Naming:** `<brief-id>-addenda.md` — one file per brief, all S2 entries appended.
**Example:** `cc-0009-addenda.md`
**Template:** `docs/briefs/addenda/addendum-template.md`

**Format per redline (one block per entry):**
- Redline ID (e.g., R15, R16, R17 …)
- Severity (S2)
- Date (Sydney local)
- Source (PK CCH directive | ChatGPT review | chat self-flag)
- Superseded wording (quote or section reference from core brief)
- Governing interpretation (the new authoritative text)
- Status (Active | Superseded by R<YY> | Withdrawn)

**Authority precedence:** the addendum file is authoritative at apply time. When a discrepancy exists between core brief and addendum, **the addendum wins.**

---

### 4.2 Redline Register

**Directory:** `docs/briefs/redlines/`
**Purpose:** S3 changes (wording / narrative clarity). Logged for traceability; do NOT change apply behaviour.
**Naming:** `<brief-id>-redlines.md` — one file per brief, all S3 entries logged.
**Example:** `cc-0009-redlines.md`
**Template:** `docs/briefs/redlines/redline-register-template.md`

**Format:** markdown table

| ID | Severity | Issue | Decision | Status |
|---|---|---|---|---|
| Rxx | S3 | (one-line issue description) | (resolution / clarification / pointer) | Open / Resolved / Withdrawn |

**Authority precedence:** redline register entries do **NOT** supersede core brief wording — they record decisions made about narrative clarity that don't warrant doc churn. The core brief remains the structural reference for S3 items.

---

## Section 5 — Rewrite limits

Per brief: **maximum 2 full core-brief rewrites** by default.

A third rewrite is allowed only if BOTH conditions are met:
1. Severity = **S1** (production safety)
2. PK explicit approval

Otherwise, all further patches go to:
- Addendum (S2)
- Redline register (S3)

**Rationale:** caps doc churn at a known ceiling. Forces severity discipline at the third decision point. Prevents the 5+ rewrite spiral observed on cc-0009 (v1 → v2 → v2.1 → v2.2 attempted, with R15 alone requiring its own version bump despite being S3).

---

## Section 6 — Size / payload discipline

Default thresholds for core brief size:

| Size | Status |
|---|---|
| Under 80 KB | Single brief OK |
| 80–120 KB | **Warning zone** — flag at next patch decision |
| Above 120 KB | **Split strongly recommended** before next patch |

**On any push / MCP timeout during patch:**
- Do **NOT** assume file design is the issue.
- Investigate first:
  - payload ceiling (push_files MCP limit)
  - batching limit
  - token exhaustion
  - network timeout
- If unresolved after investigation: split by stage (Section 7).

**Rationale:** cc-0009 v2.2 push timed out at ~140 KB. Whether the cause was payload, token budget, or network is empirically unknown. The size threshold is a precaution informed by that incident, not a hard mechanical constraint — investigate the actual mechanism before defaulting to structural split.

---

## Section 7 — Stage split rule

When a brief must be split (per Section 6 thresholds, or PK direction), use this naming pattern:

```
docs/briefs/<brief-id>-index.md      # pointer index, executor matrix, scope summary, links to stage files
docs/briefs/<brief-id>-stage-a.md    # Stage A: pre-flight, DDL, V-checks, D-01 packet, rollback
docs/briefs/<brief-id>-stage-b.md    # Stage B contents
docs/briefs/<brief-id>-stage-c.md    # Stage C contents
…
```

**Patches hit only the affected stage file.** Cross-cutting changes (e.g., header, scope, executor matrix) go in the index file.

**Rationale:** isolates patch surface. R15-style schema-vs-registry wording in cc-0009 would have touched only the Stage A file (~30 KB) instead of the full 124 KB brief.

---

## Section 8 — Executor triage

When chat (CCH-driven executor) receives a patch directive, the workflow is:

1. **Classify severity** (S1 / S2 / S3) before drafting any patch content.
2. If **S1**: proceed to draft core-brief patch. State the classification in the response.
3. If **S2** or **S3**: **recommend addendum / redline path back to PK** before drafting any patch content. Pause for PK confirmation. Do not pre-emptively draft a core-brief patch.
4. Only proceed with core-brief rewrite if:
   - S1 (with classification confirmed in response), OR
   - PK explicit override (PK directs core-brief patch despite S2/S3 classification)

**This is the gate that prevents the cc-0009 pattern.** Without it, every patch directive defaults to a core-brief rewrite regardless of severity. With it, only ~33% of redlines (the S1 ones, empirically) hit the core brief.

---

## Section 9 — Adoption rule

### 9.1 cc-0009 case study

`cc-0009` is the empirical trigger and the migration case study.

- **Freeze cc-0009 core brief** at the latest valid commit on `main`. Verify commit state before declaring frozen (the v2.2 push timeout left status ambiguous).
- All future cc-0009 redlines route to:
  - `docs/briefs/addenda/cc-0009-addenda.md` (S2)
  - `docs/briefs/redlines/cc-0009-redlines.md` (S3)
- No more full rewrites of `cc-0009` core brief unless PK explicitly overrides under Section 5 conditions.

The cc-0009 freeze + addendum/redline-register seeding is governed separately by a follow-up directive; this framework doc does not itself perform the freeze.

### 9.2 cc-0010 onward

All new briefs (`cc-0010+`) MUST cite ICE-PROC-001 in their header:

> **Patching governed by ICE-PROC-001.**

This makes the framework discoverable from any brief without re-stating the rules. The header line is the only required citation; the rest of the brief operates under ICE-PROC-001 by default.

### 9.3 Existing briefs (cc-0001 through cc-0008)

Closed briefs are unaffected — they have already shipped. ICE-PROC-001 governs only briefs that are in active patch cycles or future briefs.

---

## Appendix A — cc-0009 R1–R15 retrospective classification

If ICE-PROC-001 had been in force from cc-0009 v1, classification of the 15 redlines would have been:

| Redline | Topic | Severity | Path |
|---|---|---|---|
| R1 | Stage ownership matrix | S2 | Addendum |
| R2 | Cron schedule consistency lock | S2 | Addendum |
| R3 | 15-calendar-date horizon wording | S3 | Redline register |
| R4 | Speculative row-estimate removal | S3 | Redline register |
| R5 | m.* write exception | S2 | Addendum |
| R6 | Stage E sync-wording removal | S3 | Redline register |
| R7 | r.normalise_text narrowed body | **S1** | Core brief |
| R8 | V4 DST fixed test cases | **S1** | Core brief |
| R9 | Idempotency key explicit surfacing | S2 | Addendum |
| R10 | L38 candidate-only flag | S3 | Redline register |
| R11 | Stage B branch discipline | **S1** | Core brief |
| R12 | CREATE SCHEMA IF NOT EXISTS decision rule | **S1** | Core brief |
| R13 | r.normalise_text idempotency assertion | **S1** | Core brief |
| R14 | Cron fixed-AEST-anchor wording | S2 | Addendum |
| R15 | Schema vs registry wording | S3 | Redline register |

**Distribution:** 5× S1 (core brief), 5× S2 (addendum), 5× S3 (redline register).

**Observed result if framework had been in force:** 1 core brief at v1 + at most 1 v2 rewrite covering all S1 items in batch = **2 full rewrites instead of 4 attempted**. Documentation overhead estimated to drop ~50–70%.

---

## Appendix B — File / directory inventory

Process owns the following paths:

```
docs/process/
└── ICE-PROC-001-patch-severity.md         (this document)

docs/briefs/addenda/
├── addendum-template.md                   (template for new addenda)
└── <brief-id>-addenda.md                  (per-brief; created on first S2)

docs/briefs/redlines/
├── redline-register-template.md           (template for new redline registers)
└── <brief-id>-redlines.md                 (per-brief; created on first S3)
```

`.gitkeep` is not needed in `addenda/` or `redlines/` because each directory holds at minimum its template.

---

## Appendix C — Change log

| Date | Change | Author |
|---|---|---|
| 2026-05-10 | Initial adoption | PK CCH directive + chat |

---

*ICE-PROC-001 is a process framework, not a production-safety control. It does not weaken any apply-time gate (D-01, P1–P5 pre-flight, V-checks, close-the-loop UPDATE). It governs only the doc-churn surface around those gates.*
