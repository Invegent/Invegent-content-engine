# Brief — Move nightly reconciler from Cowork to Supabase pg_cron

**Date captured:** 2026-04-21
**Status:** Parked — dedicated session required
**Priority:** Medium — meaningful reliability win, not blocking pre-sales gate
**Trigger that created this brief:** System auditor (Grok) surfaced stale pipeline health data (3 days unverified) because the Cowork-hosted reconciler missed runs when PK's Windows machine was off.

---

## The problem

The nightly reconciler updates `docs/00_sync_state.md` with the authoritative current state of the pipeline: deployed Edge Function versions, cron activity, ai_job health, publish queue depth, recent publishing activity, token expiry alerts, and related operational facts.

It runs via Cowork scheduled tasks on PK's Windows machine. When PK shuts the machine down (reboots, travel, end-of-day power-off), the reconciler silently doesn't run. The sync_state becomes stale without any alert.

Symptom: 21 April system audit returned `severity: critical` partly because Grok (correctly) couldn't reconcile stale sync_state dates with live DB state. The audit docs PK had been accumulating (`00_audit_report.md`, `10_consultant_audit_april_2026.md`) referenced reconciler runs dated 3-6 April. Three missed nights was already flagged in PK memory (Apr 4-6).

This is a classic hosting-choice problem: the reconciler is SQL-native work (it queries the Supabase DB to assemble a markdown document), but it runs on a laptop that can be off.

---

## The fix — move to Supabase pg_cron + Edge Function

### Architecture

- New Edge Function: `reconciler` or `sync-state-generator`
- Runs as a Supabase pg_cron job, midnight AEST (15:00 UTC for AEDT, 14:00 UTC for AEST)
- Assembles the same sync_state content the Cowork version assembles today — but in Deno/TypeScript on Supabase infra
- Writes output in one of two modes:
  - **Option A:** commits `docs/00_sync_state.md` directly to GitHub via the Invegent PAT
  - **Option B:** writes to a new table `m.sync_state_snapshot(generated_at, markdown_body, head_sha_at_time)` and a lightweight human-review step commits latest to GitHub if-and-when PK wants

Option A is zero-friction but means an agent is now writing to the repo without human review. Option B is safer and creates a clean audit trail of what was asserted, when. My lean: **Option B**, because the whole point of the reviewer layer is that agent writes deserve scrutiny.

### What the reconciler needs to assemble

Audit the current Cowork version first to get the exact query list. Expected sections (from reading current sync_state format):
- Deployed Edge Function versions (via Supabase management API)
- Active cron jobs
- ai_job health (status counts, recent activity)
- Publish queue depth + active states
- Recent publishing (last 7d grouped by client × platform)
- Token expiry summary
- Reviewer queue summary
- Open incident state
- Last commit per repo

### Why this isn't trivial

Couple of genuine complications:
1. The current Cowork reconciler reads both Supabase state AND GitHub state (commit history, file existence). The Edge Function can do both but the GitHub fetch adds latency.
2. Writing markdown that matches the existing sync_state format byte-for-byte matters — tooling downstream (system-auditor, external-reviewer digest) treats sync_state as a known shape.
3. pg_cron on Supabase can't invoke arbitrary logic directly — it calls a SQL function that calls `net.http_post` to the Edge Function URL. We already have this pattern (reviewer-digest cron does this). Just replicate.
4. Secrets: the reconciler needs `GITHUB_PAT_INVEGENT` to commit to repo (Option A) or just reads Supabase (Option B). Either is covered by existing env vars.

### Deprecation path for Cowork version

Once Supabase reconciler is live and verified running reliably for 7 days:
1. Add a "scheduled-by: supabase-pg-cron" or "scheduled-by: cowork" marker in the generated sync_state output
2. Turn off the Cowork scheduled task
3. Update `docs/00_sync_state.md` header line to reflect new source of truth

### Scope notes

- This is NOT the same as the Cowork daily inbox task (email triage). That stays on the Windows machine because it's interactive work.
- This IS a direct replacement for the sync_state reconciler and any pipeline-health snapshot taker that Cowork currently runs as scheduled tasks.
- Audit any other Cowork scheduled tasks in the same session and decide per-task whether they should move.

---

## Acceptance criteria

- [ ] Reconciler runs nightly without PK's machine being on
- [ ] Produced sync_state matches format of current Cowork output (no downstream tooling breakage)
- [ ] Audit trail table (if Option B) exists and captures each run
- [ ] Cowork scheduled task turned off cleanly
- [ ] `docs/00_sync_state.md` header documents the new scheduler
- [ ] One week of reliable runs verified before calling the migration complete

---

## Related work / dependencies

- D156 external reviewer layer (done) — gives us the pattern for Edge Function + pg_cron invocation
- System-auditor v1.0.0 (today) — surfaced the staleness problem that motivated this brief
- Cowork scheduled task audit — before deprecating Cowork reconciler, list all Cowork scheduled tasks so nothing else accidentally dies with it

## Estimated effort

2-3 hours in a focused session. Most of the time goes to exactly matching the current sync_state output format so nothing downstream breaks.

## Gate for picking this up

Start this session when:
- System-auditor prompt quality work (Path B) is complete and verified
- Current session context is clean (this isn't a ten-minute squeeze-in)
- The Cowork version has missed ≥ 2 more runs since this brief was captured (confirms the problem hasn't resolved itself via PK never turning laptop off again)
