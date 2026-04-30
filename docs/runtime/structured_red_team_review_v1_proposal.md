# structured_red_team_review_v1 — Proposal

**Status:** PROPOSAL — pending PK decision (authored 30 Apr Thu afternoon, captured 30 Apr Thu evening)
**Authored:** PK + ChatGPT + Claude collaborative session, 30 Apr 2026
**Decision deadline:** None — bench work, takes priority slot when PK chooses
**Hard constraint:** Must not interfere with Phase B +24h obs checkpoint (~5pm AEST Fri 1 May) or Gate B exit decision (Sat 2 May)

---

## Why this exists

After the Phase B body-health gate patch shipped on 30 Apr afternoon, the session reflected on whether a structured red-team review layer would have caught issues earlier. Two real near-misses were observable:

1. **Function lookup by name vs `regprocedure`** — the original Phase B brief said "query the function definition" by name. PK caught the wrong-overload risk mid-stream and added the exact-signature guardrail before CC drafted. Without that catch, CC could have grabbed a different overload.
2. **Embedded `BEGIN; ... COMMIT;` in the migration** — CC drafted the migration with a transaction wrapper after Claude's "skip BEGIN/COMMIT under MCP `apply_migration`" precision-points reply. The wrapper landed cleanly via Path A acceptance, but it was a deviation from the brief's mechanical contract.
3. **(less certain)** Whether the rollback test sequence as originally drafted would have left production in a pre-patch state without the explicit "re-apply patch" step PK added (Rollback plan §5).

The current PK + CC + chat flow caught all three. But the catches were ad hoc — the right person spotted the right thing at the right time. A structured red-team layer would systematise the catch.

The question this proposal answers: **does adding a structured red-team review for Tier 2+ briefs and risky migrations reduce the probability of a future near-miss escaping into production, without creating noise that slows Tier 0/1 throughput?**

---

## The refined operational plan

### Step 0 — PK commits to running the calibration

This is bench work — estimated 60–90 minute focused slot. The decision PK is making is whether to invest that slot, not whether to adopt the layer (adoption is gated on calibration outcome).

### Step 1 — Reconstruct pre-revision Phase B artefacts

The calibration test must run on the **original** Phase B materials, not the polished final versions:

| Artefact | Original (test material) | Final (do NOT use) |
|---|---|---|
| Brief | Pre-PK-revision (no exact-signature guardrail) | Final brief at `docs/briefs/phase-b-patch-image-quote-body-health-gate.md` (already includes the guardrail) |
| CC migration draft | First draft with `BEGIN; ... COMMIT;` wrapper | Migration that landed (`20260430033748_phase_b_patch_image_quote_body_health_gate.sql`) |
| Rollback plan | Original 4-step (without §5 re-apply) | Final plan with §5 re-apply step |

The reasons the original is the right test material:
- The known issues live in the gap between original and final
- A red-team test on the final version is too easy (issues already fixed)
- Reconstruction: extractable from session chat history (the brief+migration both went through observable revisions in chat)

If reconstructing the original is genuinely hard, fall back to using the final versions and tracking only "novel issues surfaced" (not "known issues caught" — there's nothing left to catch).

### Step 2 — Unprompted red-team pass

Hand the agent (Grok if PK has access; any sufficiently capable LLM otherwise) the original brief + original migration with this prompt only:

> "Red-team this brief and migration. Surface contradictions, missing guardrails, unsafe scope, rollback gaps, weak acceptance criteria, blast radius. One pass — no debate. Output structured JSON."

Expected JSON output:
```json
{
  "verdict": "pass | review_required | blocker",
  "confidence": "low | medium | high",
  "top_issues": [],
  "missing_guardrails": [],
  "scope_creep_risks": [],
  "rollback_or_verification_gaps": [],
  "questions_for_pk": [],
  "recommended_change": ""
}
```

**No checklist given to the agent at this stage.** The point of the unprompted pass is to see what the agent surfaces from its own reasoning, before being primed by checklist items.

### Step 3 — Analyse the unprompted pass

Compare what surfaced against the three known issues:

- Did it flag the function-lookup-by-name overload risk?
- Did it flag the BEGIN/COMMIT wrapper under MCP `apply_migration`?
- Did it flag the rollback test leaving prod in pre-patch state?

Also count and classify any novel issues surfaced (issues not in the known list).

This step produces the input data for step 4.

### Step 4 — Write the red-team checklist

Draft a written, version-controlled checklist informed by what the unprompted pass missed (so the checklist covers the agent's blind spots) and what it caught well (so the checklist doesn't waste effort on things the agent already does naturally).

**Starting checklist (12 items, refined from ChatGPT's original 12):**

1. Pre-flight queries match the change scope
2. Exact function signatures used where relevant (not name-only lookup that risks wrong overload)
3. Rollback SQL captured verbatim, not summarised
4. Rollback test does not leave production in pre-patch state — patched definitions must be re-applied as the final live state, with state-transition timestamps recorded
5. Acceptance criteria are quantitative, not narrative
6. Blast radius is enumerated — what tables/functions/views are touched, what depends on them
7. Dependents are checked (`pg_depend` / equivalent)
8. STOP conditions are explicit — what would make the executor stop and escalate
9. Migration filename collision checked (no overlap with prior history per Lesson #36)
10. Migration mechanics match the apply tool's transaction contract (today: no embedded BEGIN/COMMIT under Supabase MCP `apply_migration`)
11. Allowed_paths verification (post-draft, not pre-draft) — does the migration as drafted touch only files inside the brief's allowed_paths?
12. Brief has a single logical scope — if multiple changes are necessary, they share the same blast radius and rollback story
13. **(added)** Brief specifies what "done" looks like in observable system state, not just in artefacts produced (e.g. Phase B's +24h obs queries are the model — concrete SQL yielding yes/no, not "the migration applied")

Item 4 is intentionally more rigorous than a typical rollback test — it requires the test sequence to confirm that the final live state is the patched definitions, not the original.

Items 10 and 11 are tightened from ChatGPT's original. Item 13 is new.

### Step 5 — With-checklist red-team pass

Run the red-team pass again on the same original artefacts, with the checklist provided as part of the system prompt. Same JSON output format.

This is the actual go/no-go test.

### Step 6 — Decide based on combined results

| Outcome | Decision |
|---|---|
| 3/3 known + 0–2 valid new issues surfaced | **Strong adopt.** Pilot for next Tier 2+ brief. |
| 3/3 known + many flags, mostly noise | **Noise problem.** Checklist needs work or agent isn't right. Do not adopt yet — refine and re-test. |
| 2/3 known + 1+ valid new issues | **Useful, adopt cautiously.** Pilot but watch for false positives in early runs. |
| 2/3 known + only the issues already known | **Suspicious.** Agent may be reading context not red-teaming. Do not adopt yet. |
| 0/3 known | **Reject this iteration.** Either checklist or agent (or both) is wrong. |

The "valid new issues surfaced" measure is the load-bearing one. It's the only signal that distinguishes a working red-team layer from a sophisticated regurgitation engine.

---

## Forward scope (if calibration passes)

Use the red-team layer for:
- Tier 2+ briefs before CC starts work
- Risky SQL / migration drafts before chat applies
- Gate / cutover decisions (e.g. Phase C cutover)

Do NOT use for:
- Tier 0 / Tier 1 routine docs
- Simple column-purpose population
- Closure notes
- Queue status changes
- Applying migrations
- Final decisions
- Every small task

**One pass only. No debate loop.** If the red-team output disagrees with the brief or the draft, chat reconciles once and either proceeds, patches the brief, or marks `review_required` / `blocker`. No multi-agent back-and-forth.

---

## Open decisions PK needs to make

1. **When to invest the calibration time** — proposal recommends time-boxing to one focused 60–90 min session within the next 7–10 days, after Phase B Gate B is confirmed exited cleanly.

2. **Which agent to use** — Grok (proposal author's preference, different model family / different blind spots argument) vs another Claude instance in red-team mode vs any sufficiently capable LLM. The proposal's refinement notes the **agent is secondary to the checklist**; the durable asset is the checklist itself.

3. **Whether to ratify a decision (e.g. D185)** if calibration passes — formalise the layer as a standing rule, or keep it informal and revisit periodically.

4. **Whether to reflect this in `invegent-dashboard` roadmap** — the layer is operational discipline, not a feature, but it might warrant a "Quality controls" section if adopted.

---

## Hard constraints

- Must not interfere with Phase B +24h obs checkpoint (~5pm AEST Fri 1 May)
- Must not interfere with Gate B exit decision (Sat 2 May)
- Calibration is bench work — does not happen in the same session as ICE operational work
- If Grok or any agent introduces noise that disrupts D182 / Cowork throughput, restrict layer to Gate/cutover decisions only (do not extend to Tier 2+ briefs)

---

## Origin / dialogue summary (compressed)

Three turns of refinement landed at this proposal:

**Turn 1 — ChatGPT original ("fast-track via Grok")**
- Proposed Grok as a selective red-team reviewer for Tier 2+ briefs, risky migrations, gate decisions
- Framed as a fast-track tool that would speed up the workflow
- Listed 12-ish checklist items
- Proposed pilot scope: next Tier 2+ brief only

**Turn 2 — Claude pushback**
- "Fast-track" is the wrong frame — adding a reviewer is risk reduction, not speed-up
- "Grok specifically" needs justification the proposal doesn't provide — any sufficiently capable LLM can do structural quality checks
- The pilot has no immediate test case (next Tier 2+ work is Phase C cutover, weeks away)
- Identified a calibration test using the Phase B artefacts as immediate, free, falsifiable validation
- Recommended: don't ship as-is; run the calibration test first; reframe the proposal honestly

**Turn 3 — ChatGPT revision**
- Agreed with pushback
- Reframed from "fast-track via Grok" to "calibrated red-team review for Tier 2+ risk reduction"
- Changed name to `structured_red_team_review_v1`
- Confirmed: durable asset is the written checklist, not the agent
- Sequenced: write checklist → run calibration → only then decide on forward workflow

**Turn 4 — Claude refinement (this document's basis)**
- Tightened 4 checklist items (items 10, 11, 12 as listed above; added item 13)
- Strengthened calibration success criteria — "3/3 known + valid new issues" is required, not just "3/3 known" (otherwise pattern-matching looks like success)
- Reversed sequencing — unprompted pass first (informs checklist), then write checklist, then with-checklist pass as the actual go/no-go
- Added: blind calibration on original artefacts (not the polished final versions)

This document captures Turn 4's consolidated state.

---

## Where this fits in the broader system

If adopted, `structured_red_team_review_v1` would sit alongside `docs/runtime/automation_v1_spec.md` (D182 v1) as another piece of automation/quality-control infrastructure. The two are complementary:

- D182 v1 (executor side): non-blocking automation for Tier 0/1 briefs with default-and-continue semantics
- structured_red_team_review_v1 (reviewer side): structured second-pass review for Tier 2+ briefs and risky migrations

Both follow D183's principle: build automation infrastructure when observation under load demands it, not pre-emptively. The Phase B near-misses are the observation that motivates building this; calibration is the test that confirms the build is justified.

If calibration passes and the layer is adopted, expect to:
- Add a new decision (D185 or later) ratifying the rule
- Move this file from `docs/runtime/structured_red_team_review_v1_proposal.md` to `docs/runtime/structured_red_team_review_v1_spec.md`
- Update sync_state to reference the active spec
- Update memory accordingly

If calibration fails, this file stays as a proposal and the experiment is documented for future reference.
