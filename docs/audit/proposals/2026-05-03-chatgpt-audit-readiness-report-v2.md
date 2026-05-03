# ChatGPT Audit Readiness Report — v2 REVISED with Claude addendum

> **Source**: External ChatGPT thread (PK-driven), revised version uploaded 2026-05-03 night Sydney.
> **Status**: REVISED PROPOSAL — supersedes v1 at `2026-05-03-chatgpt-audit-readiness-report.md`.
> **Companion**: chat-side review at `2026-05-03-chatgpt-audit-readiness-report-CHAT-REVIEW.md` is now incorporated into this revised document as the "Addendum" (sections A-G).
> **Adoption status**: Pending PK approval on implementation readiness.

## Material changes from v1

This revised document accepts and incorporates the chat-side critical review's corrections:

1. Slot status vocabulary corrected (`pending_fill`, `failed`, `filled`, `future` instead of `open`/`skipped`).
2. `v_brand_platform_audit_matrix` flagged for full rewrite from scratch (the v1 SQL was truncated/malformed).
3. `latest_post_seed` removed as a primary health signal (slot-driven v4 doesn't use the seed pathway; jobids 11/64/65 are paused).
4. Bottleneck enum extended with incident-specific values: `approved_not_queued_cap_blocked`, `slot_pending_fill_overdue`, `slot_fill_failed`, `legacy_spread_mismatch`, `publish_queue_failed_or_dead`.
5. Existing infrastructure acknowledged (`m.vw_ops_*`, `m.cron_health_*`, `m.pipeline_doctor_log`, etc.) — audit layer should extend not duplicate.
6. Workstream separation: Workstream A (urgent incident fix) prioritised; Workstream B (audit framework) deferred to backlog with minimum viable subset.
7. Speculative indexing and cron maintenance moved to backlog (`B-CRON-BLOAT P3`, `B-AUDIT-FRAMEWORK-PROPOSAL P3`).

## Section overview (v2 plan)

Full 20-view framework REJECTED. Minimum viable adoption is now 3-4 corrected views:

- C1 `audit.v_publish_queue_summary` — keep as proposed
- C2 `audit.v_slot_health_by_client_platform` — corrected slot status vocab
- C3 `audit.v_brand_platform_audit_matrix` — full rewrite with extended bottleneck enum
- C4 `audit.v_publish_success_recent` — optional

All other proposed views deferred. Indexes deferred. Cron maintenance separately backlogged.

## Document body

Full revised report content (sections 1-14 + addendum sections A-G) preserved at the canonical location of the user upload. The addendum sections A-G represent the operative implementation plan; sections 1-14 retain the original ChatGPT framing as historical context.

Key operative text:

> **G. Revised Recommendation**
>
> For tomorrow:
>
> 1. Prioritize Workstream A unless production writes are intentionally paused.
> 2. Do not build the full audit framework.
> 3. If building audit support, create only `audit.v_publish_queue_summary`, corrected `audit.v_slot_health_by_client_platform`, rewritten `audit.v_brand_platform_audit_matrix`, and optional `audit.v_publish_success_recent`.
> 4. Add backlog items: `B-AUDIT-FRAMEWORK-PROPOSAL` P3 and `B-CRON-BLOAT` P3.
> 5. Avoid speculative indexing and cron maintenance during the incident window.

---

*This file is the canonical revised proposal. v1 is preserved at `2026-05-03-chatgpt-audit-readiness-report.md` as historical record. v1 chat-side review at `2026-05-03-chatgpt-audit-readiness-report-CHAT-REVIEW.md` retained for traceability.*
