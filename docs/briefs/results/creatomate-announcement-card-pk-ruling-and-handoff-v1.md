# Result — Creatomate Global: Announcement Card PK Ruling + Handoff to Selector/Asset-Gap Decoupling

**Brief:** PK ruling on `docs/briefs/results/creatomate-announcement-card-publish-graduation-result-v1.md` (commit `0eb1afe`), issued 2026-07-30
**Executed by:** Claude Code (orchestrator)
**Completed:** 2026-07-30 Sydney

---

## 1. Result status

**Complete.** PK reviewed the full publish-proof evidence and the selector-ranking packet's undisclosed blast radius, and issued explicit rulings on all three open items. One approved action (platform-suitability upgrade) applied; everything else deliberately left stopped, per PK's own instruction, for a fresh session to pick up.

## 2. Commit(s)

- (this result doc's own commit, staged after writing — no code/migration commits in this pass)

## 3. Files changed

- None in the repo beyond this result doc. One production DML applied (below).

## 4. Actions taken

**PK's rulings, verbatim in substance:**

1. **Publish incident does not invalidate the proof.** The Facebook post was real and announcement_card genuinely passed the native Facebook delivery path; the backfilled audit record preserves the evidence. Two separate defects confirmed and kept separate: (a) pre-publish duplicate detection checked the queue but not the historical publish-audit table, (b) the publisher failed to write its own audit record. **The audit-write bug (`task_05bf8b3d`) must be proven fixed before announcement_card is allowed into unattended automatic selection** — this is now a standing release gate, not just a tracked follow-up.
2. **Platform suitability: APPROVED and APPLIED this session.** `generic_announcement_card_1x1_v1` × Facebook → `suitability_status='production_proven'`, `proof_reference='122118714753268380'` (external review: agree/low-risk, row re-verified unchanged before apply). Explicitly **not** extended to LinkedIn/Instagram/other — the duplicate LinkedIn history proves prior content traveled there, but is not a governed announcement_card native-publisher proof.
3. **Selector-ranking packet: NOT applied, stays stopped.** PK's own architectural ruling, independent of the drafted packet: template selection ordering and Asset Gap demand derivation **must be separate governed decisions** — a shared tiebreak must never let a selector-ranking change silently alter Asset Gap's output. Asset Gap should evaluate active production-eligible templates, scheduled platform/format demand, each template's required asset slots, and actual missing/unreachable assets — never infer demand from whichever template currently sorts first in `select_template`.

**Handoff:** PK named the next outcome — **"Creatomate Global — Selector and Asset Gap Decoupling"** — and explicitly instructed this session be cleared, with that outcome picked up in a fresh session. Full outcome text (ground truth, required result, release gate, boundaries, completion) is PK's own message in this session's transcript; the next session's Gate-1 brief should be drafted from it directly. Summary for continuity:
   - Separate template-selection preference from Asset Gap demand derivation (no shared tiebreak).
   - Preserve market-insight card as an eligible rollback layout.
   - Make announcement_card explicitly selectable via a governed selector field/policy, not an accidental shared tiebreak.
   - Prove Asset Gap output is unchanged unless platform/format/template-eligibility/asset-requirements genuinely change.
   - Prove one natural (unforced) announcement_card selection, real render, publisher audit, and rollback.
   - **Release gate:** unattended selection stays disabled until `task_05bf8b3d` is proven fixed or the audit-write path is independently proven healthy.
   - Boundaries: no carousel work, no B-roll governance changes, no other client, no Dashboard portfolio-weights work yet, no worker layout-logic changes unless a new concrete defect is found.

## 5. Constraints confirmed

- Only the one PK-approved DML executed (platform-suitability UPDATE, single row, guarded, external-reviewed).
- Selector-ranking packet remains unapplied, exactly as PK ruled.
- No selector/Asset Gap decoupling work started in this session — reserved for the fresh session PK named.

## 6. Open issues (carried forward, not resolved here)

- `task_05bf8b3d` (publisher audit-insert bug) — standing release gate for unattended announcement_card selection, not yet fixed.
- Selector/Asset Gap coupling — architecturally confirmed by PK as a real problem; decoupling design not yet started.
- CTA placeholder text gap — still unresolved, not blocking this ruling.

## 7. Next recommended step

Clear this session. Start "Creatomate Global — Selector and Asset Gap Decoupling" as its own Gate-1 brief in a fresh session, per PK's explicit instruction.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:** PK's ruling was applied exactly as specified — one approved DML executed under full review, nothing else touched, next outcome deliberately deferred to a fresh session rather than continued here.

## 9. Learning notes (chat fills this)

- PK's framing here is a clean example of separating "was the underlying proof valid" from "was the process that produced it clean" — the process defects were taken seriously (spun off, made a release gate) without invalidating the real evidence the proof produced. Worth carrying that distinction into future incident write-ups: a mistake in method doesn't automatically void a genuine result, but it does need its own honest accounting.
