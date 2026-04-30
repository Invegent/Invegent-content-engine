# structured_red_team_review_v1 — Proposal

**Status:** PILOT APPROVED — pre-pilot calibration scheduled (decided 30 Apr Fri afternoon)
**Authored:** PK + ChatGPT + Claude collaborative session, 30 Apr 2026
**Pilot decision:** PK + Claude session, 30 Apr 2026 ~16:10 Sydney
**Hard constraint:** Must not interfere with Phase B +24h obs checkpoint (~5pm AEST Fri 1 May) or Gate B exit decision (Sat 2 May)

---

## ⭐ PILOT DECISION (30 Apr Fri afternoon)

**Decision:** Proceed with `structured_red_team_review_v1` as a **time-boxed pilot, not a standing rule.**

**Graduation gates (falsifiable, two-step):**

```
PROPOSAL → PILOT          if pre-pilot calibration is useful
PILOT    → STANDING RULE  if it proves value during Phase C cutover review
```

A passing calibration does NOT ratify a standing rule. It only approves use on one Phase C cutover review. After Phase C, re-evaluate: useful / noisy / unnecessary.

**Plan:**

| Item | Decision |
|---|---|
| When | Sun 3 May or Mon 4 May, after Gate B exit is known |
| Hard cap | 90 minutes — no extension |
| Agent | ChatGPT first, not Grok |
| Test material | Original pre-revision Phase B brief + first CC migration draft, if reconstructable |
| Fallback if not reconstructable | Skip the artificial calibration. Use the first Phase C cutover brief as the **live pilot** instead. |
| Adoption criterion | None — passing calibration approves Phase C pilot use only |
| Ratification gate | Phase C pilot result determines proposal → standing rule decision |

**Why ChatGPT first, not Grok:**
- Lowest setup friction — already in the loop daily
- Different enough from Claude / CC to catch different blind spots
- The proposal itself states the checklist is the durable asset, not the agent

**Use Grok later if and only if:** ChatGPT calibration is noisy, misses obvious risks, or a second-model comparison is wanted before Phase C cutover.

**Hard constraint preserved:** Pilot calibration must not touch Gate B obs or exit decision. Calibration is bench work, scheduled after Gate B exit is known.

**Remaining open decisions** (per the action list):
- D-01: Adoption ratification — deferred until after Phase C pilot, NOT after calibration
- D-04: (separate — Invegent thin-pool resolution path, unrelated)

This decision was made in PK + Claude session 30 Apr ~16:10 Sydney following Claude's honest-concerns review (reconstruction cost, n=1 underpower, slow learning loop, validation circularity). PK explicitly accepted the n=1 concern and reframed the success criterion from "adoption" to "approved for one Phase C pilot, then re-evaluate."

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

**Pilot decision update (30 Apr):** if reconstruction is hard, the cleaner fallback is to **skip the artificial calibration entirely** and use the first Phase C cutover brief as the live pilot. This avoids running a calibration whose load-bearing signal (3/3 known issues caught) is already gone. Live pilot is riskier but more honest.

### Step 2 — Unprompted red-team pass

Hand the agent (**ChatGPT — pilot decision 30 Apr; Grok deferred**) the original brief + original migration with this prompt only:

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

This is the actual go/no-go test for **calibration → pilot** transition. Pilot → standing rule transition is a separate gate, evaluated after Phase C cutover use.

### Step 6 — Decide based on combined results

| Outcome | Decision (per pilot framing) |
|---|---|
| 3/3 known + 0–2 valid new issues surfaced | **Approved for one Phase C pilot.** Re-evaluate after Phase C. |
| 3/3 known + many flags, mostly noise | **Noise problem.** Refine checklist or change agent before Phase C use. Do not run on Phase C with current state. |
| 2/3 known + 1+ valid new issues | **Approved for Phase C pilot, watch closely.** Be ready to drop in Phase C if false positive rate hurts throughput. |
| 2/3 known + only the issues already known | **Suspicious.** Agent may be reading context not red-teaming. Try ChatGPT with explicit blind-test framing, or escalate to Grok before Phase C. |
| 0/3 known | **Reject this iteration.** Proposal stays as proposal. Phase C runs without the layer. |

The "valid new issues surfaced" measure is the load-bearing one. It's the only signal that distinguishes a working red-team layer from a sophisticated regurgitation engine.

**Critical reminder (per pilot decision):** any "approved" outcome above is approved for **one Phase C pilot**, not for adoption as a standing rule. The standing rule decision happens after Phase C, not after this calibration. n=1 is too small for adoption.

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

1. ~~**When to invest the calibration time**~~ — RESOLVED 30 Apr: Sun 3 May or Mon 4 May, 90min hard cap, after Gate B exit is known.

2. ~~**Which agent to use**~~ — RESOLVED 30 Apr: ChatGPT first. Grok deferred — used only if ChatGPT calibration is noisy or misses obvious risks, or for a second-model comparison before Phase C.

3. **Whether to ratify a decision (e.g. D185)** if calibration passes — DEFERRED. Calibration outcome only approves Phase C pilot. Standing-rule ratification (D185 or later) decided after Phase C, not after calibration.

4. **Whether to reflect this in `invegent-dashboard` roadmap** — STANDING NO (for now). The layer is operational discipline, not a roadmap-visible feature. Re-evaluate if it becomes a standing rule.

---

## Hard constraints

- Must not interfere with Phase B +24h obs checkpoint (~5pm AEST Fri 1 May)
- Must not interfere with Gate B exit decision (Sat 2 May)
- Calibration is bench work — does not happen in the same session as ICE operational work
- If ChatGPT or any agent introduces noise that disrupts D182 / Cowork throughput, restrict layer to Gate/cutover decisions only (do not extend to Tier 2+ briefs)
- 90 minute hard cap on calibration session — no extension. If reconstruction or analysis bleeds past 90min, abort calibration and use Phase C as the live pilot instead.

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

**Turn 5 — Pilot decision (30 Apr Fri afternoon, PK + Claude)**
- PK + Claude reviewed the proposal end-to-end
- Claude raised four honest concerns the proposal underweighted: reconstruction cost (possibly fatal to calibration), n=1 underpower, slow learning loop (1-2 Tier 2+ briefs/month), validation circularity (PK + chat judging novelty are the same brief authors)
- PK accepted the n=1 concern and reframed: "passing calibration ≠ adoption; passing calibration = approved for one Phase C pilot only"
- PK chose ChatGPT over Grok on lowest-friction grounds
- PK chose Sun 3 / Mon 4 May (after Gate B exit known)
- PK added the "if reconstruction is hard, skip artificial calibration and use Phase C as live pilot" fallback — cleaner than running a calibration with no load-bearing signal

This document's PILOT DECISION header (top of file) captures Turn 5's resolved position.

---

## Where this fits in the broader system

If adopted, `structured_red_team_review_v1` would sit alongside `docs/runtime/automation_v1_spec.md` (D182 v1) as another piece of automation/quality-control infrastructure. The two are complementary:

- D182 v1 (executor side): non-blocking automation for Tier 0/1 briefs with default-and-continue semantics
- structured_red_team_review_v1 (reviewer side): structured second-pass review for Tier 2+ briefs and risky migrations

Both follow D183's principle: build automation infrastructure when observation under load demands it, not pre-emptively. The Phase B near-misses are the observation that motivates building this; calibration is the test that confirms the build is justified.

If the layer graduates to standing rule (after Phase C pilot, NOT after calibration), expect to:
- Add a new decision (D185 or later) ratifying the rule
- Move this file from `docs/runtime/structured_red_team_review_v1_proposal.md` to `docs/runtime/structured_red_team_review_v1_spec.md`
- Update sync_state to reference the active spec
- Update memory accordingly

If calibration fails or Phase C pilot fails, this file stays as a proposal and the experiment is documented for future reference.
