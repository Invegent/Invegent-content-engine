# Run State: publish-queue-and-publish-column-purposes

Status: failed
Risk tier: 1
Started: 2026-05-03T16:03:10Z
Finished: 2026-05-03T16:03:10Z

## Work completed

- Read `docs/briefs/queue.md` — first ready brief identified: `publish-queue-and-publish-column-purposes`.
- Read `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md`.
- Read `docs/runtime/automation_v1_spec.md` (Brief frontmatter section) and `docs/runtime/state_file_template.md`.
- Read `docs/briefs/post-render-log-column-purposes.md` for prior-brief frontmatter comparison.
- Halted before any execution — no SQL run, no producer code read, no migration drafted, no production touched. Files written this run: this state file, brief frontmatter status flip, queue row update.

## Frontmatter gap (halt cause)

The v1 spec at `docs/runtime/automation_v1_spec.md` "Brief frontmatter (mandatory)" mandates 9 fields. The brief contains 4 of the 9 plus informational extras:

Present:
- `id` (spec calls this `brief_id` — minor name divergence, but functionally present)
- `status: ready`
- `risk_tier: 1`
- `owner: cc`
- Informational extras: `created`, `sunset`, `related-decisions`, `related-findings`, `related-patterns`

Missing:
- `default_action`
- `allowed_paths`
- `forbidden_actions`
- `idempotency_check`
- `success_output`

The brief body has prose equivalents — the "Output" section names the migration file and LOW followup, the "What this brief explicitly does NOT do" section enumerates forbidden actions, and idempotency is implied as `migration_file_absent` per the established column-purposes pattern. However the v1 spec is explicit that `allowed_paths` is load-bearing for scoping file writes, and the executor task instructions are explicit: "If any field is missing, write a state file noting the gap and halt."

Halt applied. Pre-flight queries deliberately not run — executing without formalised `allowed_paths` / `forbidden_actions` would erode the scoping gate the spec exists to enforce.

## Questions asked

None. The gap is structural rather than a decision-point; default-and-continue does not apply, because the missing fields define the safety scope itself, not a single decision inside a scoped run.

## Answers received

N/A.

## Corrections applied

None.

## Validation results

N/A — Phase 4b validation deferred per D183, and no executable output was produced.

## Stop conditions

`FRONTMATTER_INCOMPLETE`. Not a Tier 2/3 escalation but functionally identical: PK must intervene before this brief can be re-attempted.

## Needs PK approval

PK adds the 5 missing fields to `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` and resets `status: failed → ready`. Suggested values inferred from the brief's prose body and prior column-purposes briefs:

```yaml
default_action: draft_only
allowed_paths:
  - supabase/migrations/**
  - docs/audit/decisions/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md
forbidden_actions:
  - apply_migration
  - delete_branch
  - merge_pr
  - update_production_data
  - close_audit_finding
idempotency_check: "migration_file_absent"
success_output:
  - supabase/migrations/{YYYYMMDDHHMMSS}_audit_publish_queue_and_publish_column_purposes.sql
  - docs/runtime/runs/publish-queue-and-publish-column-purposes-{YYYY-MM-DDTHHMMSSZ}.md
  - docs/audit/decisions/publish_queue_and_publish_low_followup.md  # only if any LOW columns deferred
```

PK may also want to rename `id` → `brief_id` to align with the v1 spec's field name. Once frontmatter is complete and status reset to `ready`, the brief body is otherwise pre-flight-ready and a re-run should reach the `~70-95 min CC closure` window the brief estimates.

## Token usage

- Started: ~0
- Ended: ~30k (queue + brief + v1 spec + state-file template + one prior-brief comparison + this state file)

## Issues encountered

1. **Field-name divergence:** brief uses `id` where the v1 spec mandates `brief_id`. Cosmetic on top of the missing-fields issue, but worth aligning during the fix.
2. **Pattern of prose-form frontmatter is recurring.** The just-completed `post-render-log-column-purposes` brief frontmatter was also missing several mandatory fields (no `brief_id`, no `owner`, no `default_action`, no `forbidden_actions`, no `idempotency_check`, no `success_output`) and Cowork executed it anyway. Two consecutive briefs with sub-spec frontmatter is a weak signal that either (a) the v1 spec needs to be updated to acknowledge prose-form equivalents and downgrade the strict halt, or (b) the brief-authoring template needs to be re-issued so brief authors fill the YAML. Either way, surfacing for PK attention.
3. **Owner-field convention is undefined for the executor.** Brief is `owner: cc`. Recently-completed briefs show `owner` as `cc`, `cowork`, `cc/cowork`, and `chat`. The current Cowork executor (this run) selects on `status: ready` only — owner is not a filter. If `owner: cc` is meant to signal "Claude Code human-driven session, do not pick up from Cowork", that convention is not encoded in the v1 spec or in the executor instructions. Worth resolving before more `cc`-owned briefs land in the queue, otherwise this same brief will be picked up again on the next scheduled run.
4. **Clock divergence (cosmetic):** bash UTC returned `2026-05-03T160310Z` while Cowork-mode env reports today as `2026-05-04` (PK Sydney local). State file timestamp uses UTC per spec; no functional impact.

## Next step

1. PK adds the 5 missing frontmatter fields to `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` (suggested values above).
2. PK resets brief `status: failed → ready` and queue row to match.
3. Optional: PK clarifies the `owner: cc` vs Cowork-pickup convention in `docs/runtime/automation_v1_spec.md` so the executor knows whether to skip `owner: cc` rows. Otherwise the same brief will be picked up again on the next scheduled run.
4. Re-run by Cowork (or whichever executor PK designates) once frontmatter is complete.

Brief body remains pre-flight-ready — no work wasted, and the producer code map embedded in the brief stays useful for the re-run.
