# cc-0014 Friction Register Capture Experiment — Closing Note (REVISED)

**Brief:** cc-0014 — Friction Register Capture Experiment (v1.1 final, brief frozen at commit `34305092f4`)
**Closed:** 2026-05-18 10:02 AEST (Day 4 of 14-day window)
**Closure status:** `archived` (per friction.experiment_run.status enum)
**Closed by:** PK reframing decision; chat-applied migrations `cc_0014_close_archived` → `cc_0014_reopen_for_scoring` → `cc_0014_close_archived_empirical`
**Decision ref:** D-IOL-001 in `docs/06_decisions.md`

> **REVISION NOTICE (this version supersedes the original 2026-05-18 09:21 AEST postmortem):** The original close-note made three specific empirical claims that the live database contradicts. PK elected to reopen the experiment_run, run the locked Section 11 scoring queries at Day 4, and close again with the corrected record. This revised postmortem captures the actual scoring results, the original empirical errors, and the reasoning for `archived` rather than literal-`invalid` as terminal status. **The reframing decision (D-IOL-001) stands independent of verdict status — that decision is a structural reframing, not a criterion-based conclusion.** Two follow-up docs still carry the original (incorrect) framing as of this commit: `docs/06_decisions.md` D-IOL-001 entry, and `docs/00_sync_state.md` v2.77 inline summary. Both are flagged for patching in next session.

---

## What actually happened (corrected)

Brief cc-0014 specified a 14-day operational window (2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC) followed by a Day-19 verdict against five pre-locked success criteria + invalidation gates. The window was closed at Day 4 by operator decision, not by brief mechanics.

The close happened in three phases this session:

1. **First close (status=archived, 2026-05-18 09:21 AEST):** Applied via migration `cc_0014_close_archived`. Notes captured a reframing rationale that contained three specific empirical errors (detailed below).
2. **Reopen for scoring (status=archived → running, 2026-05-18 09:53 AEST):** Applied via migration `cc_0014_reopen_for_scoring` after the empirical defect was caught at session-close verification (PK reading the recent commit log surfaced commit `ac3c1bee` showing health_check had emitted 5 events the night before, contradicting the "zero signal" claim in the postmortem).
3. **Second close (status=running → archived with full scoring, 2026-05-18 10:02 AEST):** Applied via migration `cc_0014_close_archived_empirical`. Notes now contain verbatim Day-4 scoring results from Section 11 queries Q1-Q10.

`criteria_snapshot` remained immutable throughout. The append-only DELETE-protection triggers re-engaged during the brief reopen window and lifted again on second close. No data was lost or modified.

---

## Section 11 scoring at Day 4 (run before second close)

The brief's 10 locked Section 11 queries were executed against the live in-window state:

| Query | Description | Result | Threshold | Status |
|---|---|---|---|---|
| Q1 | Total events in window | 17 | — | OK |
| Q2 | emit_error_ratio | 0.1176 (2 errors / 17 events) | ≤ 0.40 invalidation | OK |
| Q3 | Criterion 1: non-duplicate quality cases | 3 | ≥ 6 | **FAIL** |
| Q4 | Criterion 2: distinct real categories on quality cases | 2 | ≥ 2 | **PASS** |
| Q5 | Criterion 3: sources with quality cases (sources with ≥3 events) | 1 | ≥ 2 | **FAIL** |
| Q6 | Criterion 4: total actions / high-intent actions | 3 / 0 | total ≥ 3 AND high-intent ≥ 1 | **FAIL** (no high-intent) |
| Q7 | Criterion 5: incremental cases with `capture_reason_note` | 0 | ≥ 1 | **FAIL** |
| Q8 | Invalidation: late_triage_ratio | 0.8235 (14 untriaged / 17 total) | ≤ 0.50 | **INVALIDATES** |
| Q9 | Invalidation: total events | 17 | ≥ 5 | OK |
| Q10 | Invalidation: verification failure days | 2 | < 3 | OK |

**Strict brief verdict logic per Section 11:** any invalidation triggers → **INVALID**. Q8 invalidates.

---

## Why archived rather than literal-INVALID

The Q8 invalidation at Day 4 is procedurally correct but substantively misleading:

- 14 of the 17 in-window cases were auto-promoted from emitters that fired Sun 2026-05-17:
  - Reconciliation cron 85 (weekly): fired 17:30 UTC → 9 drift events
  - Cowork nightly-health-check-v1 v3.0: fired 16:02 UTC → 5 health_check events
- All 14 of those cases have `reviewed_at IS NULL` — generated **< 24h before close**.
- Q8's filter (`reviewed_at IS NULL OR reviewed_at - created_at > INTERVAL '72 hours'`) treats `NULL` as untriaged-regardless-of-age.
- At Day 19, those same 14 cases would have been a small fraction of total volume with plenty of time to triage. At Day 4 they're 82% of the window's volume.
- **The invalidation is timing-of-recent-fires, not substantive triage-discipline failure.**

Status options reviewed:
- **`passed`** — overclaims; 4 of 5 success criteria fail on Day-4 data
- **`failed`** — implies criteria were fairly tested; Day 4 ≠ Day 19, evaluation was procedurally early
- **`invalid`** — strictly correct per Section 11 verdict logic (Q8 triggered), but per brief §14 means "instrument failure, redesign, re-run." The instrument worked. What didn't fit was the brief's implicit Day-19 timing assumption against Day-4 evaluation.
- **`archived`** — brief's neutral terminal state. Honest: "closed pre-fair-evaluation by operator decision." Doesn't claim verdict either direction.

PK elected `archived` with the full scoring captured in the notes column for the audit trail. `criteria_snapshot` and the actual scored Q1-Q10 results both remain on the archived row.

---

## Empirical corrections to the original 2026-05-18 09:21 postmortem

Three specific claims in the first-version postmortem were empirically wrong:

### ERROR 1 — "Reconciliation source under-frequenced"
**Original claim:** *"cron 85 ran weekly per the existing pre-cc-0014 schedule. In a 14-day window this produces at most 2 fires — insufficient to evaluate criterion 3."*

**Empirical reality:** cron 85 fired Sun 2026-05-17 17:30 UTC (its only in-window fire before close). That single fire produced **9 friction.event rows source=reconciliation**. Source qualified for criterion 3 (≥3 events). The "under-frequenced" framing measured fire-count rather than event-yield-per-fire. Weekly cadence wasn't insufficient by the brief's source-volume measure; weekly was actually slow only for ongoing-diagnostic-use, which is the operational reason daily promotion is better. Daily promotion still applied for operational reasons, but the justification text was wrong.

### ERROR 2 — "Health_check source produced zero signal across Days 1–4"
**Original claim:** *"Root cause traced to the Cowork pipeline brief being stuck at `status: review_required`... V-C3 live verification remained PENDING as of closure."*

**Empirical reality:** Commit `9215de77` (2026-05-17) reset the Cowork brief to `status: ready`. Cowork fired 2026-05-17 16:02 UTC (commit `ac3c1bee`) and the function `friction.fn_emit_health_check_findings` emitted **5 friction.event rows source=health_check**. **V-C3 was unblocked the night before close.** The original postmortem said "PENDING" because I (chat-side) read from cached internal state (v2.76 sync_state showing 1 manual event at window-open) rather than re-querying the live database before authoring closure rationale.

### ERROR 3 — "Criterion 3 unachievable / 1 source × 3 events"
**Original claim:** *"Day-19 verdict against the locked criteria on this trajectory would have read INVALID due to insufficient signal density (criterion 3 unachievable)."*

**Empirical reality:** All three sources had reached ≥3 in-window events by Day 4 (manual=3, recon=9, health_check=5). Source-volume requirement of criterion 3 was empirically met. The 1-of-2 result on Q5 is because only the 3 manual cases got triaged (PK-triaged earlier in the window); the 14 recon+health_check cases generated yesterday hadn't been triaged yet at close. Source signal-generation was solid; triage discipline at Day 4 (with most cases generated <24h before close) was the limiting factor. Different defect from "criterion unachievable."

---

## Shared root cause for the three errors

Same class as L-v2.76-a + L-v2.76-f: chat-side operated from cached internal state (v2.76 sync_state and v2.76 framing memos) when authoring closure rationale, rather than re-querying authoritative database state. ChatGPT's D-01 review on the close echoed back the same false framing — type-(c) on its own terms, but the underlying premise was false in both directions.

**New L-candidate (this session):** *"Verify live source-counts from authoritative database (`friction.event` GROUP BY source) before authoring any closure rationale that depends on source-mix claims. Cached internal state from prior session is not source-of-truth for active-window data."* Same class as L-v2.76-a and L-v2.76-f.

PK caught the defect at session-close verification by reading recent commits via the GitHub MCP — commit `ac3c1bee` plainly stated "5 P1 true-stuck clusters surfaced... friction.fn_emit_health_check_findings emitted 5 rows... V-C3 unblocked." That commit pre-dated the close by ~7 hours.

---

## What the reframing decision (D-IOL-001) does and doesn't depend on

**Does depend on:**
- Manual FAB workflow being validated as a real operational tool (empirically true: PK filed 3/3 events and validated triage round-trip)
- Register schema being stable production infrastructure (true)
- A structural choice about whether ICE evaluates ongoing operational tools via experiments (PK's call: no, they evaluate via continued operational use)

**Does NOT depend on:**
- Whether the experiment would have passed at Day 19 (independent question)
- Whether all three sources produced signal (they did, contrary to original postmortem)
- Whether daily recon cadence is "needed" vs "operationally preferred" (operationally preferred regardless of experiment)

The reframing stands. The justification text in the original postmortem was wrong on three points; the structural decision was correct.

---

## What changed today (revised)

1. Migration `cc_0014_close_archived` applied 09:21 (status running → archived, original notes with wrong framing)
2. Atomic 4-file docs push commit `d6bf9e4a` (original postmortem + session note + D-IOL-001 + sync_state v2.77)
3. Single-file commit `90187ad5` (action_list.md v2.77 rebuild)
4. Memory edits #8 + #15 (cc-0014 archived; D-IOL-001 logged)
5. Session-close verification surfaced empirical defect via commit `ac3c1bee` reading
6. Migration `cc_0014_reopen_for_scoring` applied 09:53 (status archived → running)
7. Section 11 queries Q1-Q10 executed against live state (results captured above)
8. Migration `cc_0014_close_archived_empirical` applied 10:02 (status running → archived; notes column now 6729 chars with full empirical scoring + corrections)
9. This revised postmortem (current commit)

## What did NOT change (revised)

- friction.* schema (stable throughout)
- 3-emitter design (all three sources confirmed operational at close)
- Manual FAB live on dashboard.invegent.com
- /operations triage route
- criteria_snapshot remains immutable on archived row
- Cowork brief v3.0 at HEAD `bc32e86`
- All other ICE pipeline behaviour
- D-IOL-001 reframing decision

---

## Brief §14 commitments — disposition (revised)

The brief's Section 14 enumerated three closure paths: pass, fail, invalid. `archived` bypasses verdict-path commitments (it's a brief-level terminal state, not a verdict outcome). Substantive commitments that map onto post-close work:

- **Pass-path next-layer design** → cc-0015 friction-pool-view brief drafted (commit `9a5dc155`), unblocked for execution
- **Pass-path health_check pg_cron migration scope** → folded into infrastructure diagnostic phase
- **Fail-path table archival** → NOT invoked. Schema, emitters, triggers, UI all stay live in production.
- **Fail-path postmortem within 14 days** → this revised file satisfies it

---

## Cumulative D-01 history for cc-0014 (final, revised)

| review_id | brief version / session | verdict | classification | resolution |
|---|---|---|---|---|
| `903cfd8e` | v1.0 D-01 (v2.72) | partial | type-(b) | PK-resolved Path A re-fire; close-the-loop UPDATE resolved 2026-05-17 |
| `873985f7` | v1.1 D-01 (v2.72) | partial | type-(c) | PK-resolved state-capture override per L62; brief frozen v1.1; close-the-loop UPDATE resolved 2026-05-17 |
| `3ff74643` | close-as-passed (2026-05-17) | partial | type-(b) | Pushback accepted; revised plan to archived instead of passed |
| `6a90cacf` | close-as-archived first attempt (2026-05-18) | partial | type-(c) | PK explicit approval per L62; archived applied (notes contained empirical errors, since corrected) |
| `94bd6835` | recon daily cadence (2026-05-18) | partial | type-(c) | PK explicit approval per L62; daily cadence applied |
| `3830b7cc` | reopen for scoring (2026-05-18) | partial | type-(c) | PK explicit approval per L62; reopen + scoring + correct close applied |

Total D-01 fires for cc-0014 lineage: **6**. State-capture exceptions consumed: **0** (type-(c) PK approvals are not overrides of type-(b)).

---

## Lessons (revised)

- **L62**: type-(b) vs type-(c) classification continues to be the canonical D-01 escalation discipline. Four of six D-01 fires for cc-0014 were type-(c) generic. Today's session reinforces that even when type-(c) classifications are correct, the underlying premise can still be wrong — type-(c) is about ChatGPT's pushback being generic, not about Claude's reasoning being right.
- **L-candidate (new this session, promotion pending):** *"Verify live source-counts from authoritative database before authoring closure rationale."* Same class as L-v2.76-a + L-v2.76-f.
- **Mid-experiment reframing is legitimate** when the framing itself is wrong, distinct from changing criteria mid-experiment when the data is uncomfortable. cc-0014 closure remains the former. The reframing decision is not invalidated by the empirical correction of its justification text.
- **`archived` as honest terminal state** for closed-pre-verdict cases remains valid even after empirical correction — possibly more clearly justified now that Day-4 scoring shows the Q8 invalidation would have been a timing artefact rather than substantive failure.
- **Session-close verification caught the defect.** Reading recent commits via the GitHub MCP at session-close ritual surfaced commit `ac3c1bee` and the V-C3 unblock. This is an evidence-positive use of the verification ritual and should be preserved as a standing close-step.

## Forward links

- D-IOL-001 — Friction Register as Standing Infrastructure (decision in `docs/06_decisions.md`, with original framing carrying empirical errors; needs follow-up patch with reference to this revised postmortem)
- `docs/00_sync_state.md` v2.77 inline summary — carries original framing; needs follow-up patch
- `docs/00_action_list.md` v2.77 cc-0014 STATUS BLOCK — carries original framing; needs follow-up patch
- cc-0015 friction-pool-view brief — unblocked
- cc-0016 friction-capture-evidence brief — unblocked, parallel-executable
- Reconciliation daily cadence diagnostic — first daily fire 2026-05-19 03:30 AEST
- Health_check diagnostic — V-C3 was UNBLOCKED 2026-05-17 by Cowork fire; further fires expected; next-session diagnostic = verify continued daily emission

---

*Revised postmortem closes the brief §14 "within 14 days" commitment. Supersedes the original 2026-05-18 09:21 AEST version. Brief cc-0014 fully closed.*
