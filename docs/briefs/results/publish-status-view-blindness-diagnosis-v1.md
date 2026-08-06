# Result — publish-status-view-blindness-diagnosis-v1

**Brief file:** None — seeded by an informational cross-session message ("CGU planning" control-tower seed, no-authority, verify-independently), scoped down by PK to Task 1 only (read-only diagnosis) before any brief/build lane opens.
**Executed by:** Claude Code (orchestrator + `db-rls-auditor` subagent, plus orchestrator-run follow-up catalog reads)
**Completed:** 2026-08-06 Sydney

---

## 1. Result status

`Complete` (as a diagnosis — no fix authored, none requested at this stage)

## 2. Commit(s)

N/A — read-only investigation, zero writes, zero DDL/DML, zero code changes.

## 3. Files changed

- `docs/briefs/results/publish-status-view-blindness-diagnosis-v1.md` — created (this file)

## 4. Actions taken

- Ran `db-rls-auditor` (read-only, T1-scoped) to diagnose why `ice_ro.publish_status` is blind to completed publishes, per the follow-on pointer from the Lane 1 ICE e2e product-proof (`docs/briefs/results/lane1-ice-e2e-product-proof-result-v1.md`, v6.154, commit `044ef01`).
- Pulled the live `ice_ro.publish_status` view definition (`pg_get_viewdef` + `pg_views`).
- Pulled the `m.post_publish` column schema (`information_schema.columns`).
- Independently re-verified the Lane-1 finding against fresh 2026-08-05/06 live data — one test case per journey (text, image_quote, short-video) — rather than trusting the prior doc's citations at face value.
- Grepped the repo for existing precedent of code reading `m.post_publish` directly, to establish the intended durable-truth pattern.
- Found an existing but **unapplied** artifact, `supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql`, that already analyzed `m.post_publish` denormalization hazards relevant to any future fix.
- On PK follow-up request, ran two additional orchestrator-level catalog reads (via `scripts/db-read.py`) to pull the purge trigger's exact definition and function body, closing the one honest-flag the subagent had raised (it had attributed the trigger by name from a migration header, not pulled it live).

## 5. Constraints confirmed

- No DDL/DML executed — confirmed (all queries were `SELECT`/catalog reads only).
- No fix/migration drafted — confirmed (out of scope for this diagnosis; PK scoped this session to Task 1 only).
- No dashboard/repo code edited — confirmed.
- No deploy/apply/merge — confirmed (nothing to deploy; docs-only).
- DB touch scoped to `ice_ro`, `m.post_publish`, `m.post_publish_queue`, and world-readable catalog (`pg_catalog`/`information_schema`) — confirmed, no broad/unscoped queries run.

## 6. Open issues

- **Root cause is a deliberate trigger, not a bug in the view alone.** `trg_cleanup_queue_on_publish_v1` (`AFTER INSERT ON m.post_publish`, function `m.cleanup_queue_on_publish_v1()`) deletes the matching `m.post_publish_queue` row the instant `status='published'` and `queue_id IS NOT NULL`. Any fix must source from `m.post_publish` (the durable, delete-protected record — confirmed by the sibling `trg_prevent_post_publish_delete` trigger also present on that table), never `m.post_publish_queue`.
- **Two independent blindness causes, not one:**
  - FB/IG/LinkedIn: queue row purged on success (the trigger above).
  - YouTube: never enters the queue at all — `queue_id` is `NULL` from row creation, so the purge trigger's guard never fires for it; it's structurally invisible from the moment of publish, for a different reason than the other three platforms.
- **`m.post_publish` denormalization gotchas already documented** in the unapplied `NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql` — 28 drafts publish on two platforms (approval_status is whole-draft, not per-platform); 155 rows where `pp.platform ≠ pd.platform`; ~140 dead/rejected/draft rows that still carry a published `post_publish` row (must never be surfaced as live); YouTube needs special-casing (keys off `video_status`, not `approval_status`). Whoever authors the corrected view must account for these or will rediscover the same traps.
- **`draft_status` is not a faithful substitute.** It's the closest existing `ice_ro` proxy and the Lane-1 doc called it "accurate," but per the cc-0080 evidence above it has known per-platform/multi-platform drift on `m.post_draft.approval_status` — directionally useful, not a durable per-platform publish source.
- No other `ice_ro` view (15 enumerated) reads `m.post_publish`, directly or indirectly — the gap is isolated to `publish_status`.

## 7. Next recommended step

PK decision needed on whether to open a brief for Task 2 (author the corrected view as a `NOT_APPLIED_*` migration artifact, secret-free, sourced from `m.post_publish`, accounting for the cc-0080 gotchas and the YouTube `queue_id=NULL` case) and Task 3 (dashboard cockpit fix on an isolated/undeployed branch) from the original seed message — this diagnosis was scoped to Task 1 only and does not itself authorize further work.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Diagnosis matches and strengthens the Lane-1 finding: confirms the blindness is total (not partial/timing-related) and root-causes it to a specific trigger + a structural YouTube gap, rather than leaving it as an unexplained observation.
- Constraints respected — no writes attempted or made; DB touch stayed scoped to the named objects.
- No unexpected files changed — this result doc is the only file this session wrote.
- Success criteria (definition pulled, root cause named, `m.post_publish` schema captured, three journeys evidenced as live test cases, trigger/function definition confirmed on follow-up) all met.
- New risk surfaced: `trg_cleanup_queue_on_publish_v1` is `SECURITY DEFINER` with a pinned `search_path` — noted here for completeness; not triaged as a security finding in this pass (out of scope for a read-only publish-status diagnosis; a security-auditor pass would be the right lane if this trigger itself becomes a change target).
- Follow-up: none required to close this diagnosis; the two Task-2/3 items above are the natural next gate, PK's call whether/when to open.

## 9. Learning notes (chat fills this)

- The cross-session seed message correctly flagged itself "NO AUTHORITY CONVEYED" and the orchestrator correctly treated it as unauthorized until PK explicitly scoped the first task — this is the pattern to repeat for any future control-tower-style seed.
- Reusable pattern: when a subagent's findings cite a DB object by name from a migration-header attribution rather than a live catalog read, treat that as an honest-flag worth a fast, cheap orchestrator-level follow-up query (via `db-read.py` catalog joins) rather than re-spinning a full subagent — closed in 3 quick reads here.
- `db-read.py` cannot resolve a `schema.table::regclass` cast for schema `m` directly (permission denied on schema `m` for that cast path) even though joined `pg_trigger`/`pg_class`/`pg_namespace` catalog reads over the same objects succeed — worth remembering as a query-shape gotcha for the R0 read path, not a coverage gap in the role itself.
