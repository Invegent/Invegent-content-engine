# R6 pre-rewrite rollback artefacts

Preserved 2026-04-24 Session 2 before R6 implementation.

## Files

- `seed_and_enqueue_v1_d152.sql` — live body of `m.seed_and_enqueue_ai_jobs_v1` as of this commit. Post-D152 patch. Replaced by R6 Task A.
- `enqueue_publish_v1_d155.sql` — live body of `m.enqueue_publish_from_ai_job_v1` trigger as of this commit. Post-D155 patch. Replaced by R6 Task F.

## If R6 needs rollback

1. Pause crons 11, 64, 65.
2. Paste `seed_and_enqueue_v1_d152.sql` into a migration and apply.
3. Paste `enqueue_publish_v1_d155.sql` into a migration and apply.
4. Revert cron command strings to reference the restored functions (they will by default — Task D was just text polish).
5. Resume crons.

Reference: `docs/briefs/2026-04-24-r6-impl-spec.md` Task G rollback section.
