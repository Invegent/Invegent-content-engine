# Queue Integrity Incident Brief — 2026-05-05 (v3)

**Status:** Investigation complete, including end-to-end inspection of `materialise-slots-nightly` and `p_shadow` semantics. No production changes proposed in this brief. All proposed fixes gated through D-01 ChatGPT review per protocol v2.17.

**Author:** chat (laptop Sydney morning session)

**Trigger:** Today's autonomous Cowork health check (`docs/audit/health/2026-05-05.md`) flagged 6 true-stuck items across 4 clusters, including a NEW LinkedIn × NDIS-Yarns item.

**Decision context:** PK directed "fix the pipeline, not its outcomes." Investigation revealed structural issues in scheduling, capping, queue cleanup, and dual draft-generation. The original v1 framing of "shadow mode silently active" remains correct, but the original Defect 5 framing (slot table corruption) is REFUTED — the actual flaw is in the queue-creation path, not the slot table.

---

## Revisions in v3 (over v2)

v2 incorporated seven external review points; PK confirmed those revisions and asked for inspection of `materialise-slots-nightly` and `p_shadow` end-to-end before recommending v4 promotion. Inspections complete; v3 captures the findings.

**Major changes:**

1. **Defect 5 (original) REFUTED.** `m.materialise_slots` and `m.compute_rule_slot_times` produce correct slot times. The slot table is clean.
2. **NEW Defect 5 confirmed:** `enqueue-publish-queue-every-5m` uses `COALESCE(pd.scheduled_for, get_next_scheduled_for(...))`. Pre-F-PUB-009 drafts have `pd.scheduled_for=NULL`, so queue rows get `scheduled_for` from `get_next_scheduled_for` even when the draft has a slot with a perfectly valid `scheduled_publish_at`. **0 of 48 NDIS-LI queue rows have `q.scheduled_for = slot.scheduled_publish_at`.** Slot intent is silently ignored.
3. **`p_shadow` enforcement confirmed absent** across all 5 downstream components (ai-worker, `m.auto_approver_fetch_drafts`, auto-approver EF, enqueue cron, publisher EFs). Pure label, zero isolation.
4. **Architectural reframe:** v4 is NOT a separate queue writer — it's a draft generator that uses slot semantics. There is only ONE queue writer: the legacy enqueue cron. v4's slot timing only reaches the queue via F-PUB-009's `pd.scheduled_for` write at fill time, which doesn't apply retroactively to pre-F-PUB-009 drafts.
5. **Anomaly count corrected:** queue row 70cacfa3 (PP-LI 2026-05-04 02:00:00) was misclassified as anomalous in v1/v2. 02:00 UTC = 12 PM AEST = configured PP-LI slot. NOT anomalous. Real anomaly count is 4 (PP-LI 21:00:31.995, NDIS-LI 12:00:00, NDIS-LI 18:00:00, PP-YT 10:00:57.656).
6. **PK's item 7 correction adopted with sharper risk framing.** The dedupe guard prevents same-`post_draft_id` double-creation. It does NOT prevent: (a) same-slot double-fill across paths (handled by `ON CONFLICT (slot_id)` in v4 only), (b) same-canonical content drafted twice via different paths (no guard), (c) cross-path race conditions in slot status. 24h overlap is an option but is not safe by virtue of the dedupe guard alone. Atomic cutover is the safer default; my v2 push-back was overconfident.
7. **Migration plan adjusted:** Migration 4 is now "fix enqueue scheduled_for source + backfill pd.scheduled_for" rather than "inspect materialise-slots." The backfill ensures slot intent flows into the queue for all existing v4 drafts.

**Execution phasing (unchanged from v2):**
- Tier 1 (immediately approvable): Migrations 1, 2, 3
- Tier 2 (now confirmed defect): Migration 4 — enqueue cron + backfill
- Tier 3 (PK decision): Migration 5 — `p_shadow` binary
- Tier 4 (cutover): Migrations 6, 7, 8

---

## 1. Summary

The publishing pipeline has five distinct structural issues. The "stuck items" surfaced by the nightly health check are the symptom of all five interacting. The most serious finding is not any single bug — it is that **two draft generators feed a single queue writer that ignores slot timing**, so v4's deterministic-slot promise is partially undelivered, and `p_shadow` provides no isolation despite its name.

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | Cleanup trigger deletes queue rows by `post_draft_id` (cross-platform) | HIGH | Confirmed |
| 2 | Daily cap is loose by `p_limit` per-partition | MEDIUM | Confirmed |
| 3 | `get_next_scheduled_for` fallback returns `NOW() + 5 min` when no slot found | MEDIUM | Confirmed |
| 4 | `p_shadow` flag has no downstream enforcement — 5 components ignore it | HIGH | **Confirmed across 5 components** |
| 5 | `enqueue-publish-queue-every-5m` ignores `slot.scheduled_publish_at` when `pd.scheduled_for IS NULL` | HIGH | **Confirmed** |

The four currently-overdue "anomalous" queue rows result from interaction of Bugs 3 and 5 — their drafts predate F-PUB-009 (so `pd.scheduled_for=NULL`), and the enqueue cron filled their `scheduled_for` from `get_next_scheduled_for(...)` instead of from the slot. The **anomalous items are not permanently trapped** — FIFO eventually reaches them, slowly, due to cap interaction.

---

## 2. Confirmed bugs

### Bug 1 — Cleanup trigger cross-platform deletion

**Function:** `m.cleanup_queue_on_publish_v1`
**Trigger:** `trg_cleanup_queue_on_publish_v1` AFTER INSERT on `m.post_publish`

```sql
if new.status = 'published' and new.post_draft_id is not null then
    delete from m.post_publish_queue
    where post_draft_id = new.post_draft_id;
end if;
```

**The defect:** Filters on `post_draft_id`, not `queue_id` and not `platform`. When a draft publishes on one platform, ALL queue rows for that draft on other platforms are silently deleted.

**Severity:** HIGH (multi-platform schedule integrity broken).

### Bug 2 — Daily cap loose by `p_limit` (per-partition)

**Function:** `m.publisher_lock_queue_v2`

The eligibility CTE evaluates `published_today < max_per_day` once per row, but `published_today` is computed by lateral join on `cpp.destination_id` (per partition) at call start. The bug is that the eligibility CTE filters on this constant snapshot, allowing all rows from a partition to pass when `published_today=0` at call start. The picked CTE then locks up to `p_limit` rows ordered by `rn` — which could include 3 rows from the same partition with `max_per_day=2`.

**Confirmed multi-partition behaviour:** `publisher_lock_queue_v2(p_platform, p_limit)` is called per-platform but spans all clients within that platform. The eligibility CTE has all `(client_id, platform)` partitions. The cap fix must be per-partition.

**Evidence:** Three PP-LI publishes within 1 second on 2026-05-02. Three publishes from the same partition with `max_per_day=2`.

**Severity:** MEDIUM (operational; effective cap = `max_per_day + p_limit - 1` per partition).

### Bug 3 — Wall-clock fallback in `get_next_scheduled_for`

**Function:** `public.get_next_scheduled_for`

```sql
IF v_result IS NULL THEN
  RETURN p_from_utc + INTERVAL '5 minutes';
END IF;
```

**The defect:** When the 14-day forward search finds no enabled slot, the function returns "now + 5 min" — a wall-clock anchor.

**Evidence:** 4 anomalous queue rows currently exist (corrected from v1/v2 — 70cacfa3 reclassified as normal):

| Client | Platform | scheduled_for | Configured slot? | Origin |
|---|---|---|---|---|
| property-pulse | linkedin | 2026-05-01 21:00:31.995 | No (12 PM AEST = 02:00 UTC) | Bug 3 fingerprint (`created_at + 5 min`) |
| ndis-yarns | linkedin | 2026-05-04 12:00:00 | No (10 AM AEST = 00:00 UTC) | Mechanism unclear (clean time, no fingerprint) |
| ndis-yarns | linkedin | 2026-05-04 18:00:00 | No | Mechanism unclear (clean time, no fingerprint) |
| property-pulse | youtube | 2026-05-03 10:00:57.656 | No (5 PM AEST = 07:00 UTC) | Bug 3 fingerprint |

Live call to `get_next_scheduled_for` for NDIS-LI right now returns `2026-07-08 00:00:00` (clean slot time, far in future due to queue stacking via `min_gap_minutes=240`). The function works correctly today. The 12:00 UTC and 18:00 UTC values from April 28-29 are not reproducible from current state — either the function logic was different at that time, or there's another writer path I haven't located. Flagging as residual unknown.

**Severity:** MEDIUM.

### Bug 4 — `p_shadow` flag has no downstream enforcement

**Function:** `m.fill_pending_slots(p_max_slots, p_shadow)` — cron jobid 75 with `p_shadow := true`

**Inspection findings (5 of 5 components have NO `is_shadow` filter):**

| Component | Filters on `is_shadow`? | Evidence |
|---|---|---|
| ai-worker | No | 142 of 152 shadow ai_jobs reached `status='succeeded'` (8 failed unrelated to shadow) |
| `m.auto_approver_fetch_drafts` SQL | No | Function definition contains no `is_shadow` filter; `WHERE pd.approval_status = 'needs_review'` only |
| auto-approver Edge Function (TS) | No | Source code v1.6.0 has no `is_shadow` reference |
| `enqueue-publish-queue-every-5m` cron | No | SQL command has no `is_shadow` filter; eligibility is `j.status='succeeded' AND pd.approval_status IN ('approved','scheduled','published')` |
| Publisher Edge Functions | No | 34 shadow drafts have `m.post_publish` rows with `status='published'` |

**Conclusion:** `p_shadow` is a label that propagates from `fill_pending_slots` into `m.post_draft.is_shadow` and `m.ai_job.is_shadow` but is read by ZERO downstream components. The supposed isolation does not exist anywhere.

**Evidence (current state):**
- 152 shadow drafts, 102 approved, 52 in publish queue, **34 already published**
- Publishing mix last 7 days: 50 legacy-origin + 27 v4-origin

**Severity:** HIGH.

### Defect 5 (revised) — Enqueue cron ignores slot intent

**Function:** `enqueue-publish-queue-every-5m` cron jobid 48

**The defect:** The queue row's `scheduled_for` is computed as `COALESCE(pd.scheduled_for, public.get_next_scheduled_for(j.client_id, j.platform, NOW()))`. There is no consideration of `slot.scheduled_publish_at`. For drafts created BEFORE F-PUB-009 was applied, `pd.scheduled_for` is NULL — so `scheduled_for` falls through to `get_next_scheduled_for`, ignoring the slot's intent.

**Evidence:**
- Of 48 currently-queued NDIS-LI rows: ALL 48 have `pd.scheduled_for=NULL`. 3 are v4-origin (have `slot_id`), 45 are legacy-origin.
- **0 of the 3 v4-origin queue rows have `q.scheduled_for = slot.scheduled_publish_at`.** Slot intent is universally ignored for these.
- Same pattern across all 4 (client × platform) clusters with stuck items.

**Original Defect 5 (slot materialisation produces wrong times) is REFUTED.** `m.materialise_slots` and `m.compute_rule_slot_times` produce correct timestamps. NDIS-LI slots all sit at 00:00 UTC (= 10 AM AEST). The slot table itself is clean.

**Severity:** HIGH (the v4 architecture's slot-determinism promise is partially undelivered — slot timing only flows to the queue via F-PUB-009's draft.scheduled_for write at fill time, and not for any draft created before F-PUB-009).

---

## 3. Inspection summary (new in v3)

### `materialise-slots-nightly` chain

Three v4 cron jobs:
- jobid 72 `materialise-slots-nightly` (15:00 UTC daily): `m.materialise_slots(7)` — creates 7 days of future slots
- jobid 73 `promote-slots-to-pending-every-5m`: `m.promote_slots_to_pending()` — transitions `future` → `pending_fill`
- jobid 75 `fill-pending-slots-every-10m`: `m.fill_pending_slots(p_max_slots:=5, p_shadow:=true)` — picks pending slots, creates skeleton drafts and ai_jobs

**`m.materialise_slots`:** Reads `c.client_publish_schedule` rows where `enabled=true`. For each rule, calls `m.compute_rule_slot_times` to get the next 7 days of slot times. Inserts each into `m.slot` with `scheduled_publish_at = computed_time`. **No defect found.**

**`m.compute_rule_slot_times`:** Computes `(d::date + cps.publish_time)::timestamp AT TIME ZONE v_client_tz` over the 7-day window for matching `day_of_week`. The construction is correct: produces `timestamptz` representing the configured local time. NDIS-LI Mon-Fri 10:00 AEST → 00:00 UTC ✓. PP-LI Mon-Fri 12:00 AEST → 02:00 UTC ✓. **No defect found.**

**`m.slot` table state for NDIS-LI:** All 12 slots between 2026-04-27 and 2026-05-11 sit at 00:00 UTC (= 10 AM AEST), matching the configured schedule. One outlier: slot `3200729e` at 2026-04-28 07:00:00.790614 UTC — a single anomaly with sub-second precision suggesting a one-off insertion path (not the nightly materialiser). Out of scope for this brief.

**Conclusion:** Original Defect 5 framing is REFUTED. The slot table is the system's source of truth and is clean.

### `p_shadow` semantics chain

**fill_pending_slots writes `is_shadow` to:**
- `m.post_draft.is_shadow` (column populated)
- `m.ai_job.is_shadow` (column populated)

**Downstream readers — 5 components inspected:**

1. **ai-worker** — Empirical: 142 of 152 shadow ai_jobs reached `status='succeeded'` in the last 7 days. Source not read but behaviour confirms no filter.
2. **`m.auto_approver_fetch_drafts`** — Read function definition. Filters on `approval_status='needs_review'` and `auto_approve_enabled=true` via JOIN LATERAL. **No `is_shadow` clause.**
3. **auto-approver Edge Function (v1.6.0 TypeScript)** — Read full source. Processes `DraftRow` interface that does not include `is_shadow`. Approves/rejects based on content gates only. **No `is_shadow` reference anywhere.**
4. **`enqueue-publish-queue-every-5m` cron jobid 48** — Read SQL command. Eligibility: `j.status='succeeded' AND pd.approval_status IN ('approved','scheduled','published') AND NOT EXISTS post_publish_queue … AND NOT EXISTS post_publish …`. **No `is_shadow` clause.**
5. **Publisher Edge Functions** — Empirical: 34 shadow drafts have `m.post_publish` rows. Source not read but behaviour confirms no filter.

**Conclusion:** `p_shadow` is purely cosmetic. The intended isolation does not exist at any layer. This is a 5-component-wide gap, not a single missing filter.

**Implication for Migration 5 binary:**
- **(a) Remove `p_shadow` entirely:** Drop the parameter from `m.fill_pending_slots`; drop `is_shadow` columns from `m.post_draft` and `m.ai_job`. Clean. ~3 file changes (one function, one DROP COLUMN migration).
- **(b) Enforce `p_shadow` everywhere:** Add `WHERE NOT is_shadow` filters to all 5 components above. ~5 file changes (one SQL function, one EF, one cron command, two empirical-confirm components). Only correct if there's a real backfill/dev use case.

The choice remains PK's, but the cost asymmetry now favours (a) unless a use case exists.

---

## 4. Proven vs inferred (revised)

### Proven
- Bug 1: trigger function definition + `pg_get_triggerdef` confirms attachment
- Bug 2: function definition + observed 3-publishes-in-1-second pattern within same partition + confirmed multi-partition behaviour of `publisher_lock_queue_v2`
- Bug 3: function definition + count of anomalous rows + signature match (`created_at + 5 min`) for 2 of 4
- Bug 4: function/cron source code inspected for 3 of 5 readers, behaviour confirmed for the other 2 — zero `is_shadow` enforcement anywhere
- Defect 5 (revised): cron jobid 48 SQL command read; `slot.scheduled_publish_at` is not in the COALESCE chain; 0 of 48 NDIS-LI queue rows match the slot's `scheduled_publish_at`
- Original Defect 5 REFUTED: `m.materialise_slots` and `m.compute_rule_slot_times` definitions read; `m.slot` rows for NDIS-LI verified clean; live call to `get_next_scheduled_for` returns clean times

### Inferred
- Bug 1 has been in production since ~April 16-18 — inferred from queue row patterns
- v4 has been silently producing for at least 8 days — oldest shadow draft 2026-04-27
- 2 of 4 anomalous queue rows (NDIS-LI 12:00, NDIS-LI 18:00) have unclear mechanism — not Bug 3 fingerprint, but `get_next_scheduled_for` is the only known source. Either function logic was different at time of insertion (April 28-29) or another writer exists

### Unknown
- Mechanism for the 2 clean-time anomalous rows (NDIS-LI 12:00, 18:00 UTC). Suspect: `get_next_scheduled_for` was different at the time, or a different cron/function inserted these. Investigation can continue in parallel with Migration 4.

---

## 5. Recommended fix order (revised)

1. **Patch cleanup trigger** (Bug 1) — change DELETE filter to `queue_id = NEW.queue_id`
2. **Patch cap logic** (Bug 2) — per-partition enforcement
3. **Fix fallback** (Bug 3) — return NULL or raise; downstream skips enqueue
4. **Fix enqueue scheduled_for source + backfill** (Defect 5) — add `slot.scheduled_publish_at` to COALESCE chain in jobid 48; backfill `pd.scheduled_for` for all existing v4 drafts where `pd.slot_id IS NOT NULL AND pd.scheduled_for IS NULL`
5. **Resolve `p_shadow` semantics** (Bug 4) — binary: remove entirely OR enforce across 5 components
6. **Phase A dead-letter** — the 4 anomalous queue rows now that source bugs (3 and 5) are fixed
7. **Promote v4** — atomic with Migration 8 (see revised position on cutover)
8. **Disable legacy enqueue + Phase B dead-letter** — atomic with Migration 7

**Position revised:** Per PK's correction, the dedupe guard is too narrow to make 24h sequential cutover safer than atomic. Migrations 7 and 8 should be atomic by default; PK can override if there's a specific reason to want the 24h rollback window.

9. *(Out of scope)* Re-classify health view's "stuck" definition

---

## 6. v4 vs legacy decision point (revised)

### The framing question
Not "promote v4 or stay on legacy." Both currently feed the same queue writer. The actual question is: **which draft generator should remain after consolidation?**

### Architectural comparison (revised)

| Aspect | Legacy `seed_and_enqueue` | Slot-driven v4 `fill_pending_slots` |
|---|---|---|
| Scope of role | Generates drafts AND triggers queue creation | Generates drafts only — does NOT write to queue |
| Scheduling source | `get_next_scheduled_for` (Bug 3 + queue stacking) | `slot.scheduled_publish_at` (deterministic IF F-PUB-009 backfill applied; ignored without it — see Defect 5) |
| Audit trail | None | `m.slot_fill_attempt` (162 attempts in 7d) |
| Recovery | None | `m.recover_stuck_slots` |
| Confidence scoring | None | `m.compute_slot_confidence` |
| Evergreen fallback | None | `t.evergreen_library` |
| Dedup at fill time | None | `canonical_id` + title similarity (within v4 only) |
| Queue-creation control | Indirectly via the cron path it triggers | None — cedes queue creation to the legacy cron |

### Recommendation (unchanged)

**Default intent: consolidate onto v4, pending Migrations 4 and 5 landing first.**

Reasons (refined):
1. v4 architecture is structurally cleaner at the DRAFT GENERATION layer — deterministic slot scheduling, audit trail, recovery, confidence scoring, dedup, evergreen fallback.
2. v4's slot-determinism only flows to the queue if Migration 4 lands (enqueue cron respects slot.scheduled_publish_at + backfill pd.scheduled_for). Without Migration 4, v4's promise is partially undelivered.
3. Legacy has a known structural defect (Bug 3) that produces anomalous queue rows.
4. Retiring v4 would mean demolishing more code than fixing it.
5. Recent investments (F-PUB-009, F-AI-WORKER-PARSER-SKIP-BUG, parser fixes) all targeted v4.
6. v4 has empirical end-to-end functionality (34 publishes succeeded). It does NOT have evidence of safe sole-writer operation — PK's item 7 stands.

### Pre-promotion gates (revised)

- **G1:** ~~Inspect materialise-slots~~ — DONE (no defect; original Defect 5 REFUTED). Replaced by: confirm Migration 4 (new Defect 5 fix) lands cleanly.
- **G2:** Resolve `p_shadow` binary (Migration 5)
- **G3:** ~~Inspect auto-approver shadow handling~~ — DONE (no filter; auto-approver approves shadow drafts indistinguishably). Replaced by: implementation of Migration 5 chosen path.
- **G4:** Confirm `enqueue-publish-queue-every-5m` post-Migration-4 behaviour respects slot intent for both v4 and legacy drafts.

### `p_shadow` binary (G2/Migration 5) — cost asymmetry

- **(a) Remove entirely:** ~3 file changes (drop param from `fill_pending_slots`, DROP COLUMN on two tables, treat existing shadow drafts as intended-production). Clean.
- **(b) Enforce everywhere:** ~5 file changes (add `WHERE NOT is_shadow` to `m.auto_approver_fetch_drafts`, auto-approver TS, jobid 48 SQL, ai-worker, publishers). More work; only correct if there's a real shadow use case.

My recommendation, given inspection findings: **(a) remove**, unless PK names a use case at Migration 5 review.

---

## 7. Queue reset policy (unchanged from v2 except for renumbering)

### Position
**Dead-letter, do not delete.** The 47 historic dead queue rows already retained as audit confirm this stance.

### Phase A — Early safe cleanup (Migration 6, after source bugs fixed)

**Scope:** The 4 currently-anomalous queue rows.

**Reason codes:**
- `dead_reason='anomalous_scheduled_for_bug3_fallback'` for Bug-3-fingerprint rows (2 confirmed)
- `dead_reason='anomalous_scheduled_for_unknown_pre_v3_brief'` for clean-time rows (2 confirmed; mechanism residual unknown)

**Why after Migrations 3 and 4:** Source bugs must be fixed first so the anomaly source is closed before cleanup.

### Phase B — Cutover cleanup (Migration 8, atomic with disable-legacy)

**Scope:** Remaining legacy-origin queue rows after v4 has been promoted as sole draft generator.

**Eligibility:** ANY of:
1. **Legacy-origin futures:** `pd.is_shadow=false AND pd.slot_id IS NULL AND created_by='seed_and_enqueue' AND scheduled_for > NOW()`
2. **Cross-platform orphans:** queue rows whose corresponding draft has been published on a different platform

### Estimated impact (refined)

PP-LI: 70 queue rows → 1 anomalous (Phase A) + ~69 mixed origin (Phase B per criteria).
NDIS-LI: 48 queue rows → 2 anomalous (Phase A) + ~45 legacy-origin futures (Phase B).
PP-YT: 10 queue rows → 1 anomalous (Phase A) + mix (Phase B).
NDIS-YT: 7 queue rows → 0 anomalous + mix (Phase B).

Total order of magnitude: 4 rows in Phase A; ~140 rows in Phase B.

---

## 8. Go/no-go gates per migration (revised)

Standard pattern: D-01 review → PK approval → P1-P5 pre-flight → apply → verify → close-the-loop UPDATE.

### Migration 1 — Cleanup trigger fix [Tier 1]
- Change function body: `DELETE FROM m.post_publish_queue WHERE queue_id = NEW.queue_id`
- Add `NEW.queue_id IS NOT NULL` guard
- Verify: pick a multi-platform draft, publish on FB, confirm LI queue row survives
- Post-apply audit: `SELECT count(*) FROM m.post_publish WHERE queue_id IS NULL AND created_at >= '2026-04-16'` — log if non-zero
- Risk: LOW

### Migration 2 — Cap fix per-partition [Tier 1]
- Add to eligibility CTE: `WHERE rn <= GREATEST(0, COALESCE(cpp.max_per_day, 999) - stats.published_today)`
- Caps each `(client_id, platform)` partition independently before the picked CTE applies global `LIMIT p_limit`
- Verify: simulate 2 clients with 3 eligible rows each, cap=2 per client, p_limit=3 — lock distributes correctly
- Risk: LOW

### Migration 3 — Fallback fix [Tier 1]
- Replace `RETURN p_from_utc + INTERVAL '5 minutes'` with `RETURN NULL`
- Update jobid 48 to skip rows where `get_next_scheduled_for` returned NULL; emit warning log row
- Verify: query for new anomalous rows in next 24h — should be zero
- Risk: MEDIUM (changes downstream cron behaviour)

### Migration 4 — Enqueue scheduled_for source fix + backfill (NEW DEFECT 5) [Tier 2]
- **SQL change:** Update jobid 48 command to use `COALESCE(pd.scheduled_for, s.scheduled_publish_at, public.get_next_scheduled_for(j.client_id, j.platform, NOW()))` — add slot lookup before fallback
- **Backfill:** `UPDATE m.post_draft pd SET scheduled_for = s.scheduled_publish_at FROM m.slot s WHERE pd.slot_id = s.slot_id AND pd.scheduled_for IS NULL AND pd.slot_id IS NOT NULL` — brings existing v4 drafts in line with F-PUB-009 intent
- **Verify:** post-apply, query `SELECT count(*) FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id JOIN m.slot s ON s.slot_id = pd.slot_id WHERE q.scheduled_for != s.scheduled_publish_at AND q.status = 'queued'` — should be near zero (modulo legacy-origin rows without slot_id)
- Risk: MEDIUM (backfill modifies existing draft rows)

### Migration 5 — Resolve `p_shadow` semantics [Tier 3]
- PK chooses (a) remove or (b) enforce
- If (a): drop `p_shadow` parameter from `m.fill_pending_slots`; DROP COLUMN `is_shadow` from `m.post_draft` and `m.ai_job` (data treated as intended-production)
- If (b): add `WHERE NOT is_shadow` filter to `m.auto_approver_fetch_drafts`, auto-approver TS, jobid 48 SQL, ai-worker fetch query, publisher EFs
- Risk: MEDIUM

### Migration 6 — Phase A dead-letter [Tier 4]
- Origin-classify the 4 anomalous queue rows
- UPDATE: `status='dead'`, `dead_reason` per Section 7
- Verify: queue depth decreases by 4; no new anomalous rows in 24h
- Risk: LOW

### Migration 7 + 8 (atomic cutover, recommended) — Promote v4 + Disable legacy + Phase B [Tier 4]
- **Atomic recommendation per PK's item 7 correction.** Single migration window:
  - Cron jobid 75: change `p_shadow := true` to `p_shadow := false` (or remove parameter per Migration 5)
  - Cron jobid 48: set `active=false`
  - Mark `public.get_next_scheduled_for` deprecated
  - Generate Phase B dead-letter list and apply UPDATEs
- **Alternative (separate, with 24h overlap):** PK can request Migrations 7 and 8 separated for a rollback window. Note: the dedupe guard in jobid 48 prevents same-`post_draft_id` double-creation but does NOT prevent (a) different drafts from different paths targeting the same slot/canonical content, (b) cross-path race conditions in slot status. The 24h overlap is an option, not a safety claim.
- Risk: HIGH either way; atomic is the cleaner default.

### Optional Migration 9 — Health view classifier (separate workstream — Section 9)

---

## 9. Health-view classifier follow-up (separate workstream)

### Issue
The current "stuck" classification flags any queue row with `scheduled_for <= NOW()` as stuck. With cap-limited publishing + FIFO, "overdue" is the normal state during backlog catch-up.

### Proposed new classifier
- **ANOMALOUS** — queue row whose `scheduled_for` does not match a configured slot for the (client, platform) pair
- **CAPACITY_BACKLOG** — overdue but in FIFO position behind older eligible rows
- **TRUE_STUCK** — at FIFO position 1 with all throttle filters passing, no `paused_until`, no stale lock — but hasn't been picked

### Why separate
1. After Migrations 1-8, the queue is much cleaner. Designing on a clean queue is easier.
2. Bundling adds scope and timeline risk.
3. Current classifier's noise is informative.

### Sunset
After Migration 8 completes. Separate brief.

---

## 10. Open questions for PK

1. **v4 default**: Confirm "default to v4 pending Migrations 4 and 5" given the new Defect 5 finding. v4's slot-determinism only flows to queue with Migration 4 in place.
2. **`p_shadow` binary** (Migration 5): (a) remove or (b) enforce. Inspection shows cost asymmetry favours (a) unless a use case exists.
3. **Migration cadence**: Tier 1 (Migrations 1-3) one per session; Migration 4 separate; Migration 5 separate after PK decision; Migrations 6-8 sequential or atomic per Section 8.
4. **Atomic vs separate Migration 7/8**: My v3 recommendation is atomic (per PK's item 7 correction). PK can override.
5. **Closure budget**: Architectural work this session (this brief + inspections); each migration adds ~30-60 min closure budget.
6. **Mechanism for 2 clean-time anomalous rows** (NDIS-LI 12:00, 18:00): residual unknown. Investigate as part of Migration 4 work or defer? My recommendation: defer; Migration 4 closes the source path going forward.

---

## 11. Standing rules honoured

- **D-01**: Each of Migrations 1-8 fires `ask_chatgpt_review` MCP before apply
- **D-170**: Chat applies migrations via Supabase MCP `apply_migration`; CC writes any migration files
- **D-186**: Closure budget — this brief is architectural (excluded); fix migrations count
- **Lesson #61**: Pre-flight P1-P5 before each migration's apply
- **Lesson #62**: Type-(c) escalation pattern — apply canonical promotion guidance if any review escalates without specific evidence
- **G1 convention**: This brief is at `docs/briefs/`, not `docs/runtime/sessions/`. Today's session file will reference this brief.

---

## 12. Outstanding pre-existing items NOT addressed by this brief

- T05 Meta dev support contact (P1-urgent, blocked on PK action)
- F-AAP-NEEDS-REVIEW-BACKLOG (30 drafts in needs_review)
- F-PUB-009 7-day flow check (calendar-paced)
- F-AI-WORKER-PARSER-SKIP-BUG V3-V5 acid test (fires tonight UTC)
- ICE Dashboard Architecture Review §1 (when PK signals)

---

## v2 → v3 changelog

- **§ Revisions in v3** added
- **§ 1 Summary** — reframed: 5 defects with revised Defect 5 framing; `p_shadow` enforcement section added
- **§ 2 Defect 4** — inspection table added showing 5 components confirmed not to filter `is_shadow`
- **§ 2 Defect 5** — entirely rewritten: original (slot table) REFUTED; new (enqueue cron ignores slot) CONFIRMED with evidence
- **§ 3 Inspection summary** — NEW section documenting `materialise-slots-nightly` chain and `p_shadow` chain inspections
- **§ 4 Proven vs inferred** — updated to reflect inspection results
- **§ 5 Recommended fix order** — Migration 4 redirected from "inspect materialise" to "enqueue cron + backfill"; Migrations 7+8 marked as atomic by default
- **§ 6 Decision point** — architectural comparison revised; v4's role clarified as draft generator, not queue writer; `p_shadow` cost asymmetry analysis
- **§ 7 Queue reset** — reason codes for unknown-mechanism rows added
- **§ 8 Migrations** — Migration 4 rewritten as scheduled_for source fix; Migrations 7+8 collapsed to atomic recommendation with separate-option notes
- **§ 9, § 11, § 12** — unchanged
- **§ 10 Open questions** — Q1 reframed; Q4 atomic preference stated; Q6 added re: residual mechanism unknown

---

*Brief drafted by chat 2026-05-05 morning Sydney session. v1 reviewed by external ChatGPT → v2 incorporated 7 review points + 1 push-back. PK accepted v2 and asked for `materialise-slots-nightly` and `p_shadow` inspection. Inspections done; v3 captures findings. Awaiting PK decision on Section 10 questions before any production changes.*
