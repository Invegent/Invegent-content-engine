# Brief — M13 Governed Template Build Pack, Lane 5: One Real End-to-End Template Proof

**Created:** 2026-08-06 Sydney
**Author:** chat
**Executor:** TBD — **not authorized to start** (see §0 Blockers)
**Status:** `draft` — **BLOCKED, not issued.** Do not execute against this brief until both blockers
in §0 are resolved by PK.
**Result file:** `docs/briefs/results/m13-buildpack-lane5-e2e-proof-result-v1.md` (created on completion,
once unblocked)

---

## 0. Blockers (read this before anything else)

This brief documents scope only. It does **not** authorize execution. Two blockers, both PK
decisions, not defects this brief can fix by itself:

**Blocker A — sequencing dependency, packet's own rule.** The scoping packet's lane plan states
plainly: *"5 requires 1, 2, and 3 all landed (it is the composition proof)"*
(`docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §8). Lanes 1–2 landed
2026-08-06 (`docs/briefs/results/m13-buildpack-lane1-scalar-proof-result-v1.md`, commit `0154589`).
**Lane 3 (registry/constraint persistence, T3) has not been built** — there is currently no durable
home for a Blueprint, a Capture, or a `structural_diff_result`; they exist only as fixture files.
Lane 5's own outcome ("mismatches block graduation") cannot be demonstrated for real without
somewhere real to persist and consult those records. Running Lane 5 before Lane 3 would mean either
inventing an ad-hoc persistence mechanism this brief was never scoped to design, or faking the
"blocks graduation" step — neither is acceptable.

**Blocker B — not an authorized lane under the current watch ruling.** The active PK ruling
(`docs/briefs/cgu-final-build-acceleration-ruling-v1.md`, v6.147, still in force through the
Phase-1 schedule watch, ~2026-08-11 20:20 Sydney) named exactly three build lanes — M1 loudness
Phase-1, M7 cost-capture, **M13 Build Pack Lane 1** — plus a recycle queue (completed sessions →
M16, then M14) and an explicit instruction: *"Do not expand the fleet."* Lane 5 is not on that list,
is not in the recycle queue, and unlike Lane 1 it is squarely **T3, production-touching**: a real
human transposition into Creatomate, a real `GET /v1/templates/{id}` Capture read (a live network
call to Creatomate, not a fixture), and — per the packet's own scope — carrying the proof through
PK visual approval and **live graduation** (`assignment_status` writes against
`c.creative_template_client_assignment`, per the 13-rung ladder,
`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4). The ruling's own
§9 watch-compatibility check names this exact question as open: *"whether lanes 3/5... count as
heavy CGU Final lanes under the watch ruling's own intent... is a PK call, not inferred here."* This
brief does not resolve that question — it is restated here as the thing PK needs to rule on before
Lane 5 can start, watch-open or watch-closed.

**What this brief is for, given the blockers:** it exists so the scope is written down and ready —
so that once Lane 3 lands and PK either rules Lane 5 in-scope now or waits for watch close, no
re-scoping work is needed. Nothing below authorizes touching production.

---

## Task (once unblocked)

Prove that M13 Build Pack Lanes 1–3 compose correctly against one real, PK-selected Creatomate
template: author a real Blueprint for it, have a human transpose/confirm the template in Creatomate,
run a real Capture read, run the Lane-2 structural diff against the real Capture, persist all three
artifacts via the Lane-3 mechanism, and carry the template through the remaining rungs of the
existing 13-rung graduation ladder (PK visual approval, supervised render, publish proof, selector
eligibility, rollback proof, production promotion, post-promotion monitoring) — full ladder
discipline applies unchanged; this lane adds no shortcut through any rung.

## Source context

- `docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §8 lane 5 (this brief's own
  scope row), §9 (watch-compatibility open question, restated as Blocker B), §6/§13 addendum (the
  scalar-first recommendation and the three real, already-registered PP carousel templates).
- `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` (the active watch ruling — Blocker B).
- `docs/briefs/results/m13-buildpack-lane1-scalar-proof-result-v1.md` (Lane 1's own Handoff section
  names this lane's prerequisites verbatim: "a real human transposition of a Blueprint into
  Creatomate, a real Capture read of that live template, and the full 13-rung proof-ladder discipline
  through PK visual approval and graduation are all still required").
- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4 — the 13-rung
  ladder this lane's proof must satisfy in full, with no rung skipped or retroactively assumed.
- `docs/creative-library/m13-blueprint-capture-schema-v1.md` — the two schemas this lane instantiates
  for real (Lane 1's output).
- `.claude/helpers/m13-blueprint-capture-diff.mjs` — the diff engine this lane runs against a real
  Capture instead of a fixture.

## Scope (once unblocked — not yet approved)

**In scope:**
1. Select one real target template with PK. §7's proof-lane note (packet §6) recommends a
   scalar/single-render candidate to avoid pre-deciding the still-open multi-object question (§6/§7
   of the scoping packet). **Open candidate, not decided here:** the three already-registered PP
   carousel templates (`generic_carousel_cover_1x1_v1` / `_body_1x1_v1` / `_closing_1x1_v1` —
   `docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md` §13 addendum) are each
   individually scalar, already sit at `assignment_status='visually_approved'` with 3 passed
   `smoke_render` + 3 passed `visual_approval` proof events, but are **stalled** at
   `required_field_mapping_status='pending'`. Using one of these as the Lane-5 proof target would
   mean the Lane-1 fixture (already grounded in `generic_carousel_cover_1x1_v1`'s documented facts)
   gets corrected/confirmed by a real Capture read — but whether to target an existing stalled
   template versus a fresh one is a PK choice, not resolved here.
2. Author a real Blueprint document (schema per `m13-blueprint-capture-schema-v1.md` §1) for the
   selected template.
3. Human (PK or PK-designated) transposes/confirms the Creatomate template matches the Blueprint.
4. Run a real Capture (`GET /v1/templates/{id}`) against the live template — the first live
   Creatomate API call in this lane sequence; everything before this point (Lanes 1–2, this lane's
   own Blueprint authoring) stays fixture/document-only.
5. Run `.claude/helpers/m13-blueprint-capture-diff.mjs` against the real Blueprint + real Capture.
6. Persist Blueprint, Capture, and the `structural_diff_result` via whatever mechanism Lane 3 lands
   (full T3 chain on Lane 3 itself, separately gated — not designed here).
7. Carry the template through the remaining unsatisfied rungs of the 13-rung ladder for the client
   being graduated, with rollback proven before any apply (rung 11) and no rung skipped.
8. Result doc naming exactly which rungs were newly satisfied and which were already satisfied
   before this lane (e.g. the three PP carousel templates already hold rung 6).

**Out of scope:**
- Redesigning Lanes 1–3's schemas or diff logic — this lane consumes them as built.
- Any multi-object/sequence work — stays scalar per §7's recommendation, matching Lanes 1–2.
- Any production mutation before Blockers A and B are both resolved.

## Allowed actions (once unblocked)

- TBD at the fresh Gate-1 this lane needs once both blockers clear — full T3 chain per CLAUDE.md's
  workflow-acceleration Convention 3 (`db-rls-auditor` + `branch-warden` + `apply-harness-auditor`
  shadow pass + external review + explicit PK apply gate; independent lead re-verification; named
  live pre-check STOPs; rollback proven before apply — nothing waived, this is T3 throughout).

## Forbidden actions

- **Starting this lane's execution before Blocker A clears** (Lane 3 landed) **or before Blocker B
  clears** (explicit fresh PK ruling that Lane 5 is authorized now, separate from the three lanes
  the v6.147 ruling named) — whichever is later.
- Any live Creatomate API call, any registry/DB write, or any graduation-status change under the
  cover of *this* brief alone — those all require the fresh T3 Gate-1 this brief is not.
- Skipping, retroactively assuming, or reordering any of the 13 graduation-ladder rungs.
- Treating an already-passed rung (e.g. the three PP carousel templates' existing rung-6 visual
  approval) as satisfying a *different* rung it was not evidenced for.

## Success criteria (once unblocked)

- Real Blueprint + real Capture + real `structural_diff_result` exist and are persisted via Lane 3's
  mechanism, not as fixture files.
- The diff engine's verdict on the real pair is recorded, whatever it is (clean/concerns/blocked) —
  a `blocked` verdict is a valid, useful outcome of this lane, not a failure to avoid.
- The selected template reaches a specific, named point on the 13-rung ladder, with every rung's
  evidence individually cited (no rung inferred from a later one).
- Result doc names exactly what Lanes 1–5 together now prove, and what (if anything) still isn't
  proven about the M13 Build Pack as a whole.

## Stop condition

**Right now: stop here.** This brief is written and ready; it authorizes nothing. Report to PK: Lane
3 needs its own Gate-1 (T3, DB-touching) before Lane 5 can even be scheduled, and Lane 5 itself needs
a fresh, explicit PK ruling on watch-scope (Blocker B) separate from re-confirming "go ahead" —
because the current v6.147 ruling's own three named lanes did not include it and its §9 explicitly
left this open.

---

## Notes

Requested by PK directly in chat ("Start Lane 5 brief — the real end-to-end proof"). Drafting the
brief itself is within the watch ruling's allowed list ("documentation, architecture and Gate-1
rulings"). Flagging the two blockers in §0 rather than silently deferring them is the point of this
brief existing now rather than later — so the scope is ready the moment both clear, and so PK sees
the actual dependency chain (Lane 3, then a fresh watch-scope ruling) before assuming Lane 5 can
start immediately.
