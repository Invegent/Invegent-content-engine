# Result — ratify NDIS Sensitive-Real-Imagery rule (Rule 3.5) — closes OQ-1

**Brief / packet file:** `docs/briefs/ndis-sensitive-real-imagery-rule-ratification-packet-v1.md`
**Executed by:** Claude Code (orchestrator) + PK (ratification gate)
**Completed:** 2026-07-19 Sydney
**Lane:** T1 · SAFETY_GATE · docs-only register lane (verify-or-abort, no worktree, no DB, no deploy)

---

## 1. Result status

`Complete` — OQ-1 of `docs/briefs/generic-shared-asset-pool-assessment-v1.md` §6 is resolved; the P2 sensitive-class hard-exclusion fence now cites a real, PK-ratified governing rule.

## 2. Commit(s)

- Committed this lane on branch `claude/ice-spiral-discussion-wrfsqx` (3 content files + this result doc + 2 register pointers). Push is a separate PK hard stop.
- Review identity (stable): external rev-2 `c244a050` (the ratified text; rev-1 `7f35cf0c` caught the over-reach that rev-2 confirms fixed).

## 3. Files changed

- `docs/compliance/ndis_content_rules.md` — modified (Rule 3.5 added to Group 3; Version 1.0→1.1; Last updated; v1.1 changelog entry)
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md` — modified (risk 4.3 mitigation: `v5.79` seed reference → Rule 3.5 citation + OQ-1 RESOLVED note)
- `docs/briefs/ndis-sensitive-real-imagery-rule-ratification-packet-v1.md` — created (the ratification packet)
- `docs/briefs/results/ndis-sensitive-real-imagery-rule.md` — created (this result doc)
- `docs/00_sync_state.md`, `docs/00_action_list.md` — modified (v5.73 pointer entries)

## 4. Actions taken

- **Confirmed OQ-1's core claim by full-repo grep:** the seed's *"v5.79 NDIS Sensitive-Real-Imagery policy"* does not exist at HEAD — `v5.79`/`Sensitive-Real-Imagery` appear only inside the assessment packet's own OQ-1 and non_claims lines (`generic-shared-asset-pool-assessment-v1.md:165,192,215`). The interim grounding named (Rule 3.4 + "D7 purpose-binding") is real but adjacent: Rule 3.4 governs **text** (participant privacy), not imagery.
- **PK routing (2026-07-19):** ratify a fresh rule → OQ-A analogy grounding · OQ-B Rule 3.5 in Group 3 · OQ-C target risk 4.3 (task had said 4.1 = brand-conflict; corrected) · OQ-D NDIS-vertical-scoped.
- **brief-author** drafted the ratification packet (DRAFT_READY); refused to invent an imagery-specific NDIS paragraph (none in-repo) and surfaced it as an explicit PK handoff.
- **External review:** rev-1 (`7f35cf0c`) partial→escalate — caught a real over-reach (brand/affiliation-neutrality folded into a privacy-grounded rule, contradicting OQ-D). Fixed by removing those clauses and pointing them to risk 4.1's `brand_neutral` mechanism. rev-2 (`c244a050`) partial→escalate with **no concrete defect** — the residual flag is the inherent "human sign-off on a compliance rule" (policy_decision), which routes to the PK ratification gate.
- **PK ratified** the tightened Rule 3.5 → applied both docs edits to the working tree.
- **branch-warden** (authorized docs-lane, feature branch): verdict `safe` — branch correct, HEAD unmoved at `2630dcf`, origin parity 0/0, change set == exactly the approved files, diffs surgical.

## 5. Constraints confirmed

- No NDIS document/section/paragraph invented — the imagery-specific clause rests on the privacy principle by analogy (PK's knowing OQ-A election), stated plainly in the rule's source line.
- Docs-only: no DB write, no migration, no resolver edit, no deploy, no asset promotion or reclassification.
- The P2 fence / shared-asset table / resolver were NOT built — each remains a separate future PK gate.
- No change to the ai-worker compliance seed (`t.5.7_compliance_rule`); no CLAUDE.md change.
- Surgical edits only — no full-file re-emission, no historical rewrite.

## 6. Open issues

- **Analogy-grounding is a knowing policy call, not a document citation.** If PK later obtains an imagery-specific NDIS source paragraph, Rule 3.5's source line should be upgraded from analogy to a direct citation (a small follow-up docs edit).
- Rule 3.5 lives in `ndis_content_rules.md`, whose stated function is the ai-writer **text** compliance block — the imagery rule is read by neither the ai-writer prompt nor the image resolver today. It is a governing citation for the (future) P2 fence, not runtime-wired. If PK later prefers a text-only compliance file, the rule can move to a standalone `ndis_imagery_rules.md` (OQ-B alternative, not chosen).

## 7. Next recommended step

None required to close OQ-1. Downstream (separate future PK gates, unchanged): build the P2 hard-exclusion fence (dark additive DDL, `db-rls-auditor` lane) with Rule 3.5 as its governing citation; the assessment's other open questions (OQ-2 data home, OQ-3 licence bar, OQ-4 schema placement, OQ-5 scoped-delta invariant) remain independently open.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**

- Output matches the ratification packet and PK's four OQ decisions.
- Constraints respected (no invented citation; docs-only; no build/deploy/promotion).
- No unexpected files changed — branch-warden confirmed the change set == approved set.
- Success criteria met: the seed `v5.79` reference is gone; risk 4.3 cites Rule 3.5; the compliance file's version + changelog are bumped with a source citation; OQ-1 closed.
- New risk: the analogy-grounding is the one non-document-cited element — recorded as a knowing PK election, flagged for a future upgrade if a source appears.

## 9. Learning notes

- The external adversary earned its cost: rev-1 caught a genuine scope-bleed (privacy rule silently absorbing brand-neutrality) that contradicted PK's own OQ-D — a defect a single pass would have shipped.
- Loop-termination discipline: rev-2's generic "a human must judge this compliance rule" is a `policy_decision`, not a defect to keep fixing — re-reviewing it forever would be the ceremony-drag failure mode. Terminating at the PK gate was correct.
- Reusable pattern: when a rule's grounding is analogy-based (no direct source), state the analogy and the missing-source fact in the rule's own source line — honesty travels with the artifact, not just the result doc.
