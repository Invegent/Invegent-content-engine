# cc-stage-NN — {short slug}

**Brief:** `docs/briefs/cc-NNNN-{parent-slug}.md`
**Stage:** {A | B | C | D | E | …}
**Created:** YYYY-MM-DD Sydney
**Author:** chat
**Executor:** chat (apply via Supabase MCP) | CC (push migration file first)
**Status:** draft | issued | in-progress | applied | closed | blocked
**Session file (on close):** `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`

---

## Atomicity gate (L48 — pre-Stage-A only; skip for B–N)

For new parent briefs, answer these three questions before Stage A authoring proceeds.

| Q | Question | Answer |
|---|---|---|
| Q1 | Can this brief succeed or fail as one atomic unit? | yes / no |
| Q2 | More than 3 unresolved assumptions at brief approval? | yes / no |
| Q3 | Would a late-stage failure force rollback of earlier stages? | yes / no |

**Decision rule:** if Q1=no, Q2=yes, or Q3=yes — two or more of these — the brief splits into atomic sub-builds (cc-NNNNa / cc-NNNNb / …) before Stage A authoring continues. Document the split decision in the parent brief.

For Stage B onward of an already-split brief, this section is omitted; the parent atomicity decision carries.

---

## Pre-flight evidence (L44)

Probe queries traverse the **same path** the migration or EF invocation will use. Output captured verbatim — not paraphrased, not summarised.

### Probes

| # | Probe | Path it verifies |
|---|---|---|
| Q1 | {SQL or net.http_post call} | {what assumption this validates} |
| Q2 | {SQL or net.http_post call} | {what assumption this validates} |
| … | | |

### Probe output (verbatim)

```
Q1 output:
{paste raw result here on authoring}

Q2 output:
{paste raw result here on authoring}
```

### Probe verdict

- Q1: PASS / FAIL / FLAGGED — {one-line interpretation if not obvious}
- Q2: PASS / FAIL / FLAGGED — {one-line interpretation}

**Halt condition:** any probe contradicts a brief assumption → halt stage, amend brief (or escalate to parent brief if assumption is parent-scoped), re-fire D-01.

---

## Task

{One paragraph: what this stage does. Reference parent brief sections.}

## Source context

- `path/to/parent-brief.md §X.Y` — {why this is relevant}
- `path/to/related-result.md` — {why this is relevant}
- {commit hash, table name, EF name — anything the executor needs to find the right thing}

## Scope

**In scope:** {what is included.}
**Out of scope:** {what is explicitly excluded.}

## Allowed actions

- {Specific list of what the executor may do.}

## Forbidden actions

- {Specific list of what the executor must NOT do. Always include active hold-state items from `docs/00_sync_state.md`.}

---

## Migration / EF deploy / invocation

{The actual production action. SQL block, deploy command, or net.http_post payload.}

```sql
-- migration body OR
-- EF deploy command OR
-- net.http_post payload
```

---

## D-01 fire

- review_id: `{filled on fire}`
- action_type: {sql_destructive | ef_deploy | config_change | plan_review}
- Required context fields per `docs/runtime/mcp_review_protocol.md`:
  - decision_under_review: …
  - production_action_if_approved: …
  - consequence_if_delayed: …
  - cost_of_waiting: …
  - current_evidence: {references the Pre-flight evidence block above}
  - known_weak_evidence: …
  - default_action: …

**Response classification (L46):** INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING — {one-line rationale, missing fields if GNB}

---

## V-checks (pre-mutation expectation)

Define the expected post-mutation state in measurable terms BEFORE applying.

- V1: {assertion}
- V2: {assertion}
- …
- V{n}: {assertion}

---

## Apply

- Mechanism: `apply_migration` / `deploy_edge_function` / `execute_sql net.http_post`
- Timestamp on apply: {filled at apply}
- Migration name (if any): {filled at apply — permanent per Lesson #36}
- Apply result: {success / error message verbatim}

---

## Post-mutation truth check (L45)

Required after every production mutation. Count-delta and sanity sample captured verbatim.

### Count-delta

| Table | Pre-mutation count | Post-mutation count | Delta | Expected delta | Match? |
|---|---|---|---|---|---|
| {schema.table} | {n} | {n+k} | +k | +k | PASS / FAIL |

### Sanity sample (≥3 rows across JSONB / variant shape)

```
{paste 3 raw rows here on apply — distinct shapes if JSONB columns present;
 if no JSONB, distinct row classes per the table's typical variance}
```

### V-check results

- V1: PASS / FAIL — {one-line interpretation}
- V2: PASS / FAIL — {one-line interpretation}
- …

### Mismatch declaration (L45)

If any actual differs from expected — **declared here, not silently normalised**.

| What | Expected | Actual | Decision |
|---|---|---|---|
| {metric} | {value} | {value} | accept-with-variance / re-fire / rollback / escalate |

Reference cc-0009 Stage E "closed with verified variance" pattern (L43 candidate) for the accept-with-variance pathway.

---

## Close-the-loop

- `m.chatgpt_review` row {review_id} UPDATE: `status='resolved'`, `resolved_by='cc-NNNN-stage-{X}-apply-YYYY-MM-DD'`, `action_taken={summary including any L45 mismatch declaration or L46 classification rationale}`
- Migration name for close-the-loop UPDATE: `cc_NNNN_stage_{x}_close_the_loop` (or batched per the close-the-loop batching pattern)

## Success criteria

- {Concrete, verifiable check.}
- {Concrete, verifiable check.}
- Count-delta PASS.
- All V-checks PASS, or mismatch declared per L45.
- D-01 review row resolved.

## Stop condition

Stage closed when all success criteria met AND session file updated AND any follow-up findings opened in `docs/00_action_list.md`.

---

## Notes (optional)

{Anything else the executor should know. KOI candidates raised mid-stage. Tactical pivots under PK directive (L42 pattern). Empty if nothing.}
