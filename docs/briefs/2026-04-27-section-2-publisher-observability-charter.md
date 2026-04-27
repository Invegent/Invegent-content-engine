# Section 2 — Publisher Observability (Charter)

**Created:** 27 April 2026
**Track:** Concrete-the-pipeline
**Section purpose:** Make the publisher pipeline visible. Today we know posts go out because we look at Facebook. We do not know why a scheduled slot didn't fire without running SQL. This section closes that gap.

---

## Why this section exists

A publishing audit on 27 April surfaced five distinct root causes for missed scheduled slots, none of which were visible in the dashboard:

1. `c.client_publish_profile.mode` was NULL on 4 of 13 client × platform rows. The publisher filters `WHERE mode='auto'` so these never run.
2. `r6_enabled` was false for CFW and Invegent, leaving them in no-man's-land between publishing pathways.
3. CFW had 24 inherited NDIS-Yarns feed assignments hidden from the UI (only enabled feeds rendered).
4. Instagram has no per-client enable surface — entire platform paused at the cron level.
5. YouTube has not published in 14+ days for any client, with no UI explanation.

All five were diagnosed via SQL. None should require SQL to diagnose.

This section delivers: per-platform UI controls so PK can fix what's wrong without writing SQL, plus a reason-code resolver that tells PK (and eventually clients) why each scheduled slot did or didn't publish.

## Stages

| Stage | Title | Effort | Depends on |
|---|---|---|---|
| 2.1 | Per-platform toggles on Overview | 3 hrs CC | — |
| 2.2 | Assigned-but-disabled feed visibility | 3 hrs CC | — (parallel with 2.1) |
| 2.3 | Slot outcome resolver function | 3-4 hrs CC + chat | 2.1 (mode toggle) |
| 2.4 | Schedule adherence view | 4-6 hrs CC | 2.3 |
| 2.5 | YouTube root-cause drill-down | 3-4 hrs CC + chat | 2.3 |

Total Section 2: 16-20 hrs CC + several chat sessions.

## Section 2 done when

- PK can change mode/r6/publish/auto-approve per platform without SQL.
- Every assigned feed (enabled or disabled) is visible per client.
- Every scheduled slot in the last 14 days resolves to a reason code.
- The dashboard surfaces "X% adherence with N missed slots, here's why" per client × platform.
- A future client looking at their own portal can see why a post they expected didn't go out.

## Out of scope for Section 2

- Auto-doctor agent that fixes problems automatically (Phase D / Section 3).
- Pipeline section health rollup (Section 3).
- IG cron re-enablement (waits on Meta restriction status).
- LinkedIn Community Management API decisions (separate track).

---

*End of Section 2 charter.*
