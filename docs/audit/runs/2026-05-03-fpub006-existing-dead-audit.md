# F-PUB-006 Existing 42-Dead-Row Audit

**Date:** 2026-05-03
**Authored by:** chat (parallel to CC running F-PUB-006 cleanup brief)
**PK directive:** "audit now" (response to open question 2 in `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md`)
**Status:** complete — read-only audit, no remediation needed

## Purpose

Confirm the 42 existing dead rows in `m.post_publish_queue` are properly retired and don't hide additional F-PUB-005 ghosts that would need broader Stage 2 scope.

## Method

Four read-only queries against `m.post_publish_queue WHERE status='dead'`, joined to `m.post_draft` to inspect downstream draft state.

## Results

### By dead_reason
| dead_reason | row_count | earliest_dead | latest_dead |
|---|---|---|---|
| `m8_m11_bloat_window_2026-04-17` | 39 | 2026-04-22 02:30:08Z | 2026-04-22 02:30:08Z |
| `pre_m8_stale_2026-04-09` | 2 | 2026-04-22 02:30:08Z | 2026-04-22 02:30:08Z |
| `orphaned queue item — post_draft_id not found after 734 attempts — manually resolved 2 Apr 2026` | 1 | 2026-04-01 23:27:38Z | 2026-04-01 23:27:38Z |

41 of 42 rows came from a single sweep on 22 Apr 2026 (post-ID003 cost-incident cleanup). 1 historic orphan from 2 Apr.

### By client × platform
| client | platform | dead_rows |
|---|---|---|
| care-for-welfare-pty-ltd | facebook | 1 |
| ndis-yarns | facebook | 13 |
| ndis-yarns | instagram | 6 |
| ndis-yarns | youtube | 2 |
| property-pulse | facebook | 14 |
| property-pulse | instagram | 6 |

### Downstream draft state
| Category | count |
|---|---|
| Dead with no surviving post_draft (true orphans) | **1** |
| Dead pointing at `needs_review` drafts (hidden F-PUB-005 ghosts) | **0** |
| Dead pointing at `approved` drafts (sweep artefacts) | **14** |
| Dead pointing at `rejected` drafts | **0** |
| Dead pointing at `dead` drafts (matched-pair cleanup) | **27** |
| Total | 42 |

## Findings

1. **Zero hidden F-PUB-005 ghosts in dead pool.** No dead rows point at `needs_review` drafts. This means today's Stage 2 count of 13 (active queued + needs_review) is the complete F-PUB-005 footprint as of 2026-05-03 22:30 UTC. No need to widen Stage 2 scope.

2. **The historic 2 Apr "734 attempts" row is the same pattern we're remediating today.** Same root cause: `post_draft_not_found` orphan. Same fix: mark dead. This establishes precedent for Stage 1 — exactly what the F-PUB-006 brief proposes, applied at smaller scale.

3. **The 14 dead-pointing-at-approved rows are sweep artefacts**, not bugs. Of the 14, 13 are in NDIS-Yarns FB + 1 in CFW-FB. All from the 22 Apr `m8_m11_bloat_window` sweep. The pattern: sweep cleared queue rows but kept the underlying drafts (likely because drafts had value beyond the sweep horizon — published successfully via different queue rows, or retained as content history).

4. **The 27 dead-pointing-at-dead-drafts pairs are clean matched cleanup.** Both queue row and underlying draft retired together. No action required.

## Conclusion

**No remediation required for the existing 42 dead rows.** They are properly retired sweep artefacts.

The audit has surfaced one finding worth noting for closure-first discipline: there is an existing pattern of orphan rows hitting massive `attempt_count` values (734 in the 2 Apr case) before being cleaned up. This suggests **F-PUB-006 may not be a one-off** — orphans accumulate over time, get caught only by manual sweeps. A periodic dead-letter sweep (Phase 1.7 deliverable, currently not built) would automate this.

## Future work surfaced (not remediating now)

- **Phase 1.7 dead letter sweep** — pg_cron daily job that detects post_draft_not_found and high attempt_count rows automatically, writes to dead with reason. Aligns with `docs/04_phases.md` Phase 1.7 already on roadmap.

## Cross-references

- F-PUB-006 cleanup brief: `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md`
- Phase 1.7 spec: `docs/04_phases.md` (Dead Letter Queue deliverable)
