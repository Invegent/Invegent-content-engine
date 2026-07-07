CLAIMED v5.23 · image-workflow-accel-ratify · shared-main-docs · register-commit-gate · 2026-07-06T23:05Z
# Image Workflow Acceleration v1 — RATIFICATION RESULT (T1 · RECORD_ONLY)

**Date:** 2026-07-06 · **Lane:** orchestration-contract amendment (cc-0027 image lanes) · **Tier T1 · RECORD_ONLY.**
**Canonical packet:** `docs/briefs/image-workflow-acceleration-packet-v1.md` (RATIFIED, hash `dd3c3156d73d31e18fbab4c2a75fac89929bdbf81baff0096f07807df303dfe7`).

## Decision
PK ratified **all six** proposals (P1–P6) on 2026-07-06 **over an explicit `policy_decision` escalation** — no concrete defect was on the table; the residual was the irreducible production-policy judgment, which the triage contract routes to the PK decision gate.

## Review trail (two rounds)
- **rev-1** external review `2866370a-8258-456e-9e35-6f1ecb063fe0` (partial/escalate) — one actionable item: "shape" under-defined in P2. **Fixed** in rev-2.
- **rev-2** external review `634bbb74-1c8e-4d80-845e-c509d3e2ab07` (partial/escalate, hash `dd3c3156…`) — **verified** the P2 tightening (mechanical 10-check structural-diff gate; per-apply byte-verify + fail-closed pool-neutrality assertion on every intake regardless of shape) and found **no concrete defect**; escalated only the human-judgment policy call (`requires_pk_escalation`). → PK decided: ratify all six.

## What is now in force (summary; packet is canonical)
- **P1** batch-first default · **P2** tier-right-sized intake review with a MECHANICAL same-shape gate (any diff / when-in-doubt → new shape → full chain) · **P3** PK-elected per-asset promote-direct fast-path · **P4** one register pointer per batch terminal state · **P5** discovery-time text/signage reject · **P6** concurrent independent review stages.

## §2 non-negotiables — UNCHANGED
PK visual verdict is the only deciding act · text-safety crop proof before any accept · licence safety + sha256 provenance · pool-neutrality machine-assertion on EVERY intake · full T3 chain + live proof + rollback-proven on EVERY production rotation change · fenced-until-approved default · CAS/fail-closed.

## Applied
CLAUDE.md amended (new "Image workflow acceleration (v1 — P1–P6 ratified 2026-07-06)" section) · packet marked RATIFIED · register pointer v5.23. **No production/DB/render/publish change** — pure docs/contract ratification. Effect: applies to the next image batch (the market-data arc is already complete end-to-end).
