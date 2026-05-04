# Queue Integrity Incident Brief — 2026-05-05

**Status:** Investigation complete. No production changes proposed in this brief. All proposed fixes are gated through D-01 ChatGPT review per protocol v2.17.

**Author:** chat (laptop Sydney morning session)

**Trigger:** Today's autonomous Cowork health check (`docs/audit/health/2026-05-05.md`) flagged 6 true-stuck items across 4 clusters, including a NEW LinkedIn × NDIS-Yarns item — first time the LinkedIn-stuck pattern affected a second client.

**Decision context:** PK directed "fix the pipeline, not its outcomes." Investigation revealed the pipeline has multiple structural defects, and one of those — the slot-driven v4 architecture being silently active despite a `p_shadow=true` flag — fundamentally changes the v4-vs-legacy decision shape.

External review by ChatGPT challenged my initial Bug 3 causation claim and recommended a fix sequence. Both inputs are incorporated.

---

## 1. Summary

The publishing pipeline has five distinct structural issues. The "stuck items" surfaced by the nightly health check are the symptom of all five interacting. The most serious finding is not any single bug — it is that **two queue-writing paths are simultaneously active and producing real publishes**, despite one of them being labelled "shadow mode."

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | Cleanup trigger deletes queue rows by `post_draft_id` (cross-platform) | HIGH | Confirmed |
| 2 | Daily cap is loose by `p_limit` (cap=2 permits up to 4/day) | MEDIUM | Confirmed |
| 3 | `get_next_scheduled_for` fallback returns `NOW() + 5 min` when no slot found | MEDIUM | Confirmed |
| 4 | v4 "shadow mode" does not isolate effects — slot-driven drafts publish to production | HIGH | Confirmed |
| 5 | `materialise-slots-nightly` may produce slot `scheduled_publish_at` outside configured schedule | UNKNOWN | Suspected, not inspected |

The four currently-overdue "stuck" items map 1:1 to anomalous queue rows produced by Bugs 3 and 5. The **stuck items are not permanently trapped** — FIFO eventually reaches them. They are slow because of cap interaction, not because the publisher is broken.

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

**Evidence:** PP-FB and PP-LI both stopped getting `status='published'` queue rows around 2026-04-16/18. The trigger appears to have been installed in that window. Since then, every publish wipes other-platform queue rows for the same draft.

**Severity:** HIGH (multi-platform schedule integrity broken).

### Bug 2 — Daily cap loose by `p_limit`

**Function:** `m.publisher_lock_queue_v2`

The eligibility CTE evaluates `published_today < max_per_day` once per call — `published_today` is constant within a single function invocation. With `p_limit=3` and `max_per_day=2` and `published_today=0` at call start, all eligible rows pass the cap filter and the picked CTE locks up to 3.

**Evidence:** Three PP-LI publishes within 1 second on 2026-05-02 at 00:00:05.321, 00:00:06.117, 00:00:06.444. Same pattern observed across the week (3 publishes/day until May 3, then 2/day as eligibility shrunk).

**Severity:** MEDIUM (operational; effective cap = `max_per_day + p_limit - 1`).

### Bug 3 — Wall-clock fallback in `get_next_scheduled_for`

**Function:** `public.get_next_scheduled_for`

```sql
-- Fallback: no schedule configured for this client/platform
IF v_result IS NULL THEN
  RETURN p_from_utc + INTERVAL '5 minutes';
END IF;
```

**The defect:** When the 14-day forward search finds no enabled slot in `c.client_publish_schedule`, the function returns "now + 5 min" — a wall-clock anchor, not a real slot time.

**Evidence:** 4 anomalous queue rows currently exist:

| Client | Platform | scheduled_for | Configured slot? |
|---|---|---|---|
| property-pulse | linkedin | 2026-05-01 21:00:31.995 | No (12 PM AEST = 02:00 UTC) |
| ndis-yarns | linkedin | 2026-05-04 12:00:00 | No (10 AM AEST = 00:00 UTC) |
| ndis-yarns | linkedin | 2026-05-04 18:00:00 | No |
| property-pulse | youtube | 2026-05-03 10:00:57.656 | No (5 PM AEST = 07:00 UTC) |

The PP-LI 21:00:31 timestamp matches `created_at + 5 min` exactly. All 4 anomalous rows correlate 1:1 with currently-flagged or about-to-be-flagged stuck items.

**Severity:** MEDIUM (creates anomalous rows that sort weirdly in FIFO; not directly trapping but produces stuck-item alarms).

### Bug 4 — v4 "shadow mode" is not actually shadow

**Function:** `m.fill_pending_slots(p_max_slots, p_shadow)` — called by cron jobid 75 with `p_shadow := true`

**The defect:** The `p_shadow` parameter propagates to `m.post_draft.is_shadow` and `m.ai_job.is_shadow`, but **no downstream component honours the flag**. Specifically:
- The auto-approver does NOT filter out shadow drafts → it approves them
- The legacy `enqueue-publish-queue-every-5m` cron does NOT filter shadow drafts → they get queued
- The publisher Edge Functions do NOT filter shadow drafts → they get published

**Evidence (current state):**
- 152 shadow drafts exist (all linked to slot_id, all `created_by='fill_function'`)
- 102 of them have `approval_status='approved'`
- 52 of them are currently in `m.post_publish_queue`
- **34 of them have already been published** (rows in `m.post_publish`)

**Publishing mix in last 7 days:**
- Legacy-origin publishes: 50
- v4-origin (shadow) publishes: 27
- Both paths produce real client-facing posts

**Severity:** HIGH (architectural — the supposed isolation does not exist; v4 is half-deployed without explicit decision).

### Defect 5 — `materialise-slots-nightly` may produce anomalous `scheduled_publish_at`

**Function:** `m.materialise_slots_nightly` (or similar — not yet inspected)

**The suspicion:** The NDIS-LI stuck item `scheduled_for=2026-05-04 12:00 UTC` (10 PM AEST May 4) came from a v4-origin draft (`is_shadow=true`, `slot_id='f17e280e-...'`, `created_by='fill_function'`). NDIS-LI's configured slot is Mon-Fri 10 AM AEST = 00:00 UTC. The 12:00 UTC value does not match any enabled slot. Since `fill_pending_slots` writes `v_slot.scheduled_publish_at` directly (no fallback), the bad time must have come from the `m.slot` row itself, which is materialised by the nightly cron.

**Severity:** UNKNOWN — needs inspection before any v4 promotion.

---

## 3. Proven vs inferred

### Proven (direct read of definitions or count of database rows)
- Bug 1: trigger function definition + `pg_get_triggerdef` confirms attachment
- Bug 2: function definition + observed 3-publishes-in-1-second pattern
- Bug 3: function definition + count of anomalous rows
- Bug 4: count of `is_shadow=true` rows in `m.post_publish` (34) and `m.post_publish_queue` (52)
- The 4 stuck items are anomalous rows (1:1 mapping)

### Inferred (consistent with evidence but not directly observed)
- Bug 3 is the *cause* of stuck items — partially proven. Anomalous rows correlate 1:1 with stuck items, but the causal mechanism is "anomalous `scheduled_for` + FIFO + cap → slow eventual publish," not "trapped, never publishes." External reviewer correctly challenged my initial overclaim.
- Bug 1 has been in production since ~April 16-18 — inferred from `m.post_publish_queue` rows with `status='published'` for FB clients stopping in that window
- v4 has been silently producing for at least 7 days — counted from current state; the actual start date could be earlier (oldest slot draft is 2026-04-27)

### Unknown
- Defect 5 mechanism (materialise-slots not yet inspected)
- Whether the auto-approver was *intended* to ignore `is_shadow` or whether nobody noticed
- Whether `m.slot` rows have been seeded for clients other than the 4 we know about

---

## 4. Recommended fix order

Adopted from the external reviewer with one addition (Defect 5 inspection inserted):

1. **Patch cleanup trigger** (Bug 1) — change DELETE filter to `queue_id = NEW.queue_id`
2. **Patch cap logic** (Bug 2) — limit lock-batch to `LEAST(p_limit, max_per_day - published_today)`
3. **Make fallback impossible** (Bug 3) — return NULL or raise; downstream handles by skipping enqueue
4. **Inspect `materialise-slots-nightly`** (Defect 5) — and the slot population logic end-to-end
5. **Decide v4 vs legacy explicitly** (Bug 4 resolution)
6. **Promote v4** (remove `p_shadow` param OR formalise its semantics)
7. **Disable legacy enqueue cron**
8. **Dead-letter contaminated queue rows** (after the above)
9. *(Out of scope)* Re-classify health view's "stuck" definition

Each step is a separate migration with its own D-01 review, pre-flight, and apply window. Steps 5-7 are tightly coordinated and may be a single migration with multi-stage verification.

---

## 5. v4 vs legacy decision point

### The framing question
This is *not* "promote v4 or stay on legacy" — it is "consolidate to one path, given that both are currently producing real publishes."

### Architectural comparison

| Aspect | Legacy enqueue | Slot-driven v4 |
|---|---|---|
| Queue creation | `enqueue-publish-queue-every-5m` cron | `m.fill_pending_slots` cron |
| Scheduling source | `get_next_scheduled_for` (Bug 3 fallback) | `m.slot.scheduled_publish_at` (Defect 5 if confirmed) |
| Determinism | Drift-prone | Deterministic if slot table is clean |
| Audit trail | None | `m.slot_fill_attempt` (162 attempts in 7d) |
| Recovery | None | `m.recover_stuck_slots` |
| Confidence scoring | None | `m.compute_slot_confidence` |
| Evergreen fallback | None | `t.evergreen_library` |
| Dedup at fill time | None | `canonical_id` block + title similarity |
| Bugs surfaced this session | Bug 3 (confirmed) | Defect 5 (suspected) |

### Recommendation
**Promote v4 deliberately.** Reasons:

1. v4 architecture is structurally cleaner — deterministic scheduling, audit trail, recovery, confidence scoring, dedup, evergreen fallback all exist in v4 and don't exist in legacy.
2. v4 has been producing real output for 7+ days. It is empirically validated as functional, even if not explicitly intended.
3. Legacy has a known structural defect (Bug 3 fallback) that produces anomalous rows.
4. Retiring v4 would mean demolishing more code than fixing it — slot table, fill_pending_slots, materialise-slots-nightly, recover_stuck_slots, slot_fill_attempt, slot_alerts, and several `t.*` reference tables would all need to be either kept (for archive) or torn down. That is a bigger surface than fixing the v4 bugs.
5. The recent investments PK has made (F-PUB-009, F-AI-WORKER-PARSER-SKIP-BUG, parser fixes) all targeted v4. Retiring v4 invalidates those.

### Pre-promotion gates (must pass before Migration D)
- **G1:** Inspect `materialise-slots-nightly` and confirm/refute Defect 5
- **G2:** Decide on the `p_shadow` flag — three options:
  - (a) Remove the parameter entirely (simpler, but breaks any backfill use case)
  - (b) Make downstream actually honour it (auto-approver, enqueue cron, publisher EFs all add `WHERE NOT is_shadow`)
  - (c) Repurpose it as "test mode for chat/CC sessions, never reaches the auto-approver"
- **G3:** Inspect auto-approver's behaviour with `is_shadow=true` drafts (currently approves them — is that intended?)
- **G4:** Read `enqueue-publish-queue-every-5m` interaction with slot-driven drafts (do they double-queue if the same draft appears in both `m.ai_job` succeeded for legacy reasons AND in a slot-driven `m.ai_job`?)

---

## 6. Queue reset policy

### Position
**Dead-letter, do not delete.** Per memory: "Dead items are never deleted — they are an audit trail" (Phase 1.7 design). The 47 historic dead queue rows already retained as audit confirm this stance.

### Scope (proposed)
Dead-letter `m.post_publish_queue` rows that meet ANY of:

1. **Anomalous scheduled_for**: `scheduled_for` does not match a configured slot in `c.client_publish_schedule` for the (client, platform) pair. Currently 4 rows. Reason code: `dead_reason='anomalous_scheduled_for_pre_v4_migration'`.
2. **Legacy-origin orphan**: `pd.is_shadow=false AND pd.slot_id IS NULL AND created_by='seed_and_enqueue'` AND the corresponding draft has been published on a different platform (cross-platform-cleanup orphan). Count TBD. Reason code: `dead_reason='cross_platform_orphan_pre_v4_migration'`.
3. **Future-scheduled legacy rows after v4 promotion**: any legacy-origin queue row scheduled for a future date once v4 is promoted. These would be re-created by v4 from their drafts via the new path. Reason code: `dead_reason='legacy_path_retired_pre_v4_recreation'`.

### Sequencing
Dead-letter happens AFTER Migrations 1-3 land (so the trigger and cap are fixed), AFTER Migration 6 lands (v4 promoted, fully validated for 24h), BEFORE Migration 7 (legacy disabled). This way the new pipeline fills back in cleanly without conflicting with stale legacy rows.

### Estimated impact
PP-LI: 70 currently-queued rows → most are legacy-origin → most get dead-lettered.
NDIS-LI: 48 rows → mix.
PP-YT: 10 rows → mix (1 anomalous).
NDIS-YT: 7 rows → check.
Total order of magnitude: ~150 rows dead-lettered; ~150 rows recreated by v4 over the following 1-2 weeks.

---

## 7. Go/no-go gates per migration

Each migration follows the standard pattern:
- ChatGPT MCP review (D-01) — chat fires the review with structured context
- PK explicit approval after review
- Pre-flight P1-P5 (Lesson #61) — chat runs verification queries
- Apply via Supabase MCP `apply_migration` (D-170)
- Post-apply verification — chat runs verification queries
- Close-the-loop UPDATE on the review row

### Migration 1 — Cleanup trigger fix (Bug 1)
- Change function body: `DELETE FROM m.post_publish_queue WHERE queue_id = NEW.queue_id` (drop the `post_draft_id` filter)
- Add NEW.queue_id IS NOT NULL guard
- Verify: pick a multi-platform draft, publish on FB, confirm LI queue row survives
- Risk: LOW (narrowing a DELETE filter; can't make things worse than current state)

### Migration 2 — Cap fix (Bug 2)
- Two options:
  - (a) In the picked CTE, replace `LIMIT p_limit` with `LIMIT LEAST(p_limit, max_per_day - published_today)`
  - (b) In the eligibility CTE, replace constant `published_today` with a running window function that increments per locked row
- Option (a) is simpler and adequate
- Verify: simulate 5 eligible items, cap=2, p_limit=3 — should lock exactly 2
- Risk: LOW

### Migration 3 — Fallback fix (Bug 3)
- Replace `RETURN p_from_utc + INTERVAL '5 minutes'` with `RETURN NULL`
- Update enqueue cron (`enqueue-publish-queue-every-5m`) to skip rows where the function returned NULL — emit a warning log row
- Decision: dead-letter the 4 existing anomalous rows in this migration OR a separate cleanup migration?
  - Recommend: dead-letter in this migration (small batch, atomic with the fix)
- Verify: query for any new anomalous rows in next 24h — should be zero
- Risk: MEDIUM (changes downstream cron behaviour; need to verify cron handles NULL cleanly)

### Migration 4 — Inspect `materialise-slots-nightly`
- Read the function definition
- Check current `m.slot` rows for non-slot scheduled_publish_at values
- Document any defects as Defect 5 in this brief or a follow-up brief
- Not a code change unless a defect is confirmed
- Risk: NONE (inspection only)

### Migration 5 — Resolve `p_shadow` semantics
- Decide G2 option (a/b/c)
- Apply the chosen approach across all downstream components consistently
- This is a coordinated multi-file change spanning multiple Edge Functions
- Risk: MEDIUM (touching auto-approver, enqueue cron, publisher EFs)

### Migration 6 — Promote v4
- Cron jobid 75: change `p_shadow := true` to `p_shadow := false` (or remove parameter per Migration 5)
- Verify slot-driven drafts produce queue rows correctly
- Verify production publishing continues at expected cadence
- Risk: HIGH (the actual switchover; needs 24h observation before Migration 7)

### Migration 7 — Disable legacy enqueue
- Cron jobid 48 (`enqueue-publish-queue-every-5m`): set `active=false`
- Mark `public.get_next_scheduled_for` as deprecated (comment + raise notice)
- DO NOT delete `get_next_scheduled_for` — kept for audit and rollback
- Verify no new legacy-origin queue rows in 24h
- Risk: HIGH (can be rolled back by setting active=true if v4 falters)

### Migration 8 — Dead-letter contaminated queue
- Generate dead-letter list per Section 6
- D-01 review of the LIST itself (which rows, why)
- Apply UPDATE setting `status='dead'` + `dead_reason`
- Verify queue depth post-migration
- Risk: LOW (status flip; can't break anything since rows are already not eligible for selection)

### Optional Migration 9 — Health view classifier (separate workstream — see Section 8)

---

## 8. Health-view classifier follow-up (separate workstream)

### Issue
The current "stuck" classification in the health check's Section 6a/6b flags any queue row with `scheduled_for <= NOW()` as overdue/stuck. With cap-limited publishing + FIFO, "overdue" is the normal state during backlog catch-up.

### Proposed new classifier
- **ANOMALOUS** — queue row whose `scheduled_for` does not match a configured slot for the (client, platform) pair. Genuinely concerning.
- **CAPACITY_BACKLOG** — overdue but in FIFO position behind older eligible rows. Expected during catch-up. Surface as informational, not stuck.
- **TRUE_STUCK** — at FIFO position 1 with all throttle filters passing, no `paused_until`, no stale lock — but hasn't been picked by the publisher in N consecutive cron runs.

### Why this is a separate workstream
1. After Migrations 1-8, the queue will be much cleaner. Designing the new classifier on a clean queue is easier than designing it on contaminated data.
2. Bundling this with the bug fixes adds scope and timeline risk.
3. The current classifier's noise is informative — it's pointing at real issues even if with the wrong label. We don't lose visibility by deferring.

### Sunset
The current classifier is acceptable until Migration 8 completes. After that, write a separate brief and ship a new classifier.

---

## 9. Open questions for PK before chat proceeds

1. **v4 promote vs retire**: Confirm "promote v4" is the right call given the new evidence (v4 already half-deployed, architecture cleaner, retirement bigger demolition).
2. **Migration cadence**: One per session? One per week? Batched? My recommendation: one per session for Migrations 1-3 (each is isolated), then batched coordination for 4-7, separate for 8.
3. **`p_shadow` decision** (G2 above): (a) remove, (b) honour downstream, (c) repurpose.
4. **Queue reset scope**: Full reset (all anomalous + legacy-origin), partial (anomalous only), or hold (no reset, let the existing queue drain naturally)?
5. **Materialise-slots inspection — now or as Migration 4**: Do you want chat to inspect it this session before finalising the brief, or proceed with the brief as-is and inspect under Migration 4?
6. **Closure budget**: This brief is architectural work (excluded). Each fix migration adds ~30-60 min of closure budget per session. Does that fit current pacing or should we slow down?

---

## 10. Standing rules honoured

- **D-01**: Each of Migrations 1-8 fires `ask_chatgpt_review` MCP before apply
- **D-170**: Chat applies migrations via Supabase MCP `apply_migration`; CC writes any migration files
- **D-186**: Closure budget — this brief is architectural (excluded); fix migrations count
- **Lesson #61**: Pre-flight P1-P5 before each migration's apply
- **Lesson #62**: Type-(c) escalation pattern — apply the canonical promotion guidance if any review escalates without specific evidence
- **G1 convention**: This brief is a planning artefact at `docs/briefs/`, not a session file at `docs/runtime/sessions/`. The session file for today will reference this brief.

---

## 11. Outstanding pre-existing items NOT addressed by this brief

These remain on action_list and are independent of the queue integrity work:

- T05 Meta dev support contact (P1-urgent, blocked on PK action)
- F-AAP-NEEDS-REVIEW-BACKLOG (30 drafts in needs_review)
- F-PUB-009 7-day flow check (calendar-paced)
- F-AI-WORKER-PARSER-SKIP-BUG V3-V5 acid test (fires tonight UTC)
- ICE Dashboard Architecture Review §1 (when PK signals)

---

*Brief drafted by chat 2026-05-05 morning Sydney session. Awaiting PK decision on Section 9 questions before any production changes.*
