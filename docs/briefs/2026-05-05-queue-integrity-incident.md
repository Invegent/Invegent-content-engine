# Queue Integrity Incident Brief — 2026-05-05 (v2)

**Status:** Investigation complete. Revised after external review. No production changes proposed in this brief. All proposed fixes are gated through D-01 ChatGPT review per protocol v2.17.

**Author:** chat (laptop Sydney morning session)

**Trigger:** Today's autonomous Cowork health check (`docs/audit/health/2026-05-05.md`) flagged 6 true-stuck items across 4 clusters, including a NEW LinkedIn × NDIS-Yarns item.

**Decision context:** PK directed "fix the pipeline, not its outcomes." Investigation revealed five structural issues, including v4 architecture being silently active despite a `p_shadow=true` flag.

---

## Required revisions before execution (v1 → v2)

External ChatGPT review identified seven tightening opportunities and a meta-recommendation to scope-down execution. v2 incorporates them:

1. **Migration ordering corrected** — v1 had Section 6 saying dead-letter happens between Migrations 6 and 7, while Section 7 listed dead-letter as Migration 8. v2 adopts the reviewer's order: bug fixes first (1-3), then investigate/fix Defect 5 (4), then `p_shadow` resolution (5), then Phase A dead-letter (6), then cutover (7-8). Source bugs fixed before cleanup of symptoms.
2. **"Promote v4 deliberately" downgraded** to **"Default intent: consolidate onto v4, pending Defect 5 inspection AND `p_shadow` resolution."** v1 outran its own evidence.
3. **`p_shadow` semantics is now a hard binary gate** (remove OR enforce everywhere), not a three-option menu. PK chooses (a) remove or (b) enforce based on whether shadow mode has a real backfill/dev use case to preserve.
4. **Cap fix is per-partition** by `(client_id, platform)`. Confirmed: `publisher_lock_queue_v2` is called per-platform but spans all clients within that platform. v1's scalar `LIMIT LEAST(...)` would only have been correct for the observed single-client case.
5. **Cleanup trigger fix adds a `queue_id IS NULL` post-apply audit** (simple count, not a full audit system).
6. **Dead-letter scope split** into Phase A (early-safe: 4 anomalous rows) and Phase B (cutover: legacy-origin futures + cross-platform orphans).
7. **"v4 already producing real output"** caveated as functionality evidence, not safety evidence for sole-writer operation.

**Push-back retained from review:** The reviewer suggested atomic cutover (promote v4 + disable legacy in same migration). I argue the **existing dedupe guard in `enqueue-publish-queue-every-5m`** (`NOT EXISTS post_publish_queue WHERE post_draft_id = ...`) makes the 24h observation period safe. The two writers operate on disjoint draft sets in practice (v4 writes via `slot_id`; legacy writes via succeeded legacy ai_jobs). I keep Migrations 7 and 8 separate to preserve a 24h rollback window. PK can override (Question 4 in Section 9).

**Execution phasing (per reviewer's meta-recommendation):**
- **Tier 1 (immediately approvable):** Migrations 1, 2, 3 — three confirmed independent bugs, isolated, low-to-medium risk
- **Tier 2 (investigation required):** Migration 4 — Defect 5 inspection; may or may not produce a code change
- **Tier 3 (PK decision required):** Migration 5 — `p_shadow` binary
- **Tier 4 (cutover, after Tiers 1-3):** Migrations 6, 7, 8 — Phase A dead-letter, promote v4, disable legacy + Phase B dead-letter

---

## 1. Summary

The publishing pipeline has five distinct structural issues. The "stuck items" surfaced by the nightly health check are the symptom of all five interacting. The most serious finding is not any single bug — it is that **two queue-writing paths are simultaneously active and producing real publishes**, despite one of them being labelled "shadow mode."

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | Cleanup trigger deletes queue rows by `post_draft_id` (cross-platform) | HIGH | Confirmed |
| 2 | Daily cap is loose by `p_limit` per-partition | MEDIUM | Confirmed |
| 3 | `get_next_scheduled_for` fallback returns `NOW() + 5 min` when no slot found | MEDIUM | Confirmed |
| 4 | v4 "shadow mode" does not isolate effects — slot-driven drafts publish to production | HIGH | Confirmed |
| 5 | `materialise-slots-nightly` may produce slot `scheduled_publish_at` outside configured schedule | UNKNOWN | Suspected, not inspected |

The four currently-overdue "stuck" items map 1:1 to anomalous queue rows produced by Bugs 3 and 5 (mixed origin: 1 from legacy fallback, 1+ from v4 slot materialisation). The **stuck items are not permanently trapped** — FIFO eventually reaches them. They are slow because of cap interaction, not because the publisher is broken.

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

### Bug 2 — Daily cap loose by `p_limit` (per-partition)

**Function:** `m.publisher_lock_queue_v2`

The eligibility CTE evaluates `published_today < max_per_day` once per row, but `published_today` is computed by lateral join on `cpp.destination_id` (per partition) at call start. The bug is that the eligibility CTE filters on this constant snapshot, allowing all rows from a partition to pass when `published_today=0` at call start. The picked CTE then locks up to `p_limit` rows ordered by `rn` — which could include 3 rows from the same partition with `max_per_day=2`.

**Confirmed multi-partition behaviour:** `publisher_lock_queue_v2(p_platform, p_limit)` is called per-platform but spans all clients within that platform. The eligibility CTE has all `(client_id, platform)` partitions. The cap fix must therefore be per-partition.

**Evidence:** Three PP-LI publishes within 1 second on 2026-05-02 at 00:00:05.321, 00:00:06.117, 00:00:06.444. Three publishes from the same `(client_id, platform)` partition with `max_per_day=2`. Same pattern observed across the week (3/day until May 3, then 2/day as eligibility shrunk).

**Severity:** MEDIUM (operational; effective cap = `max_per_day + p_limit - 1` per partition).

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

| Client | Platform | scheduled_for | Configured slot? | Origin |
|---|---|---|---|---|
| property-pulse | linkedin | 2026-05-01 21:00:31.995 | No (12 PM AEST = 02:00 UTC) | Bug 3 (legacy fallback) |
| ndis-yarns | linkedin | 2026-05-04 12:00:00 | No (10 AM AEST = 00:00 UTC) | Defect 5 (v4 slot) |
| ndis-yarns | linkedin | 2026-05-04 18:00:00 | No | TBD |
| property-pulse | youtube | 2026-05-03 10:00:57.656 | No (5 PM AEST = 07:00 UTC) | TBD |

The PP-LI 21:00:31 timestamp matches `created_at + 5 min` exactly — characteristic Bug 3 signature. The NDIS-LI 12:00 row is from a v4 slot-driven draft, so its `scheduled_for` came from `m.slot.scheduled_publish_at` — Defect 5. The remaining two need origin classification before Phase A dead-letter.

**Severity:** MEDIUM (creates anomalous rows that sort weirdly in FIFO; not directly trapping but produces stuck-item alarms).

### Bug 4 — v4 "shadow mode" is not actually shadow

**Function:** `m.fill_pending_slots(p_max_slots, p_shadow)` — called by cron jobid 75 with `p_shadow := true`

**The defect:** The `p_shadow` parameter propagates to `m.post_draft.is_shadow` and `m.ai_job.is_shadow`, but **no downstream component honours the flag**. Specifically:
- The auto-approver does NOT filter out shadow drafts → it approves them
- The legacy `enqueue-publish-queue-every-5m` cron does NOT filter shadow drafts → they get queued
- The publisher Edge Functions do NOT filter shadow drafts → they get published

**Evidence (current state):**
- 152 shadow drafts exist (all linked to `slot_id`, all `created_by='fill_function'`)
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

**Severity:** UNKNOWN — needs inspection in Migration 4 before any v4 promotion.

---

## 3. Proven vs inferred

### Proven (direct read of definitions or count of database rows)
- Bug 1: trigger function definition + `pg_get_triggerdef` confirms attachment
- Bug 2: function definition + observed 3-publishes-in-1-second pattern within same partition + confirmed multi-partition behaviour of `publisher_lock_queue_v2`
- Bug 3: function definition + count of anomalous rows + signature match (`created_at + 5 min`)
- Bug 4: count of `is_shadow=true` rows in `m.post_publish` (34) and `m.post_publish_queue` (52)
- The 4 stuck items are anomalous rows (1:1 mapping)
- v4 has empirical evidence of end-to-end functionality (34 successful publishes via the slot-driven path)

### Inferred (consistent with evidence but not directly observed)
- Bug 3 is the *cause* of stuck items — partially proven. Anomalous rows correlate 1:1 with stuck items, but the causal mechanism is "anomalous `scheduled_for` + FIFO + cap → slow eventual publish," not "trapped, never publishes."
- Bug 1 has been in production since ~April 16-18 — inferred from `m.post_publish_queue` rows with `status='published'` for FB clients stopping in that window
- v4 has been silently producing for at least 7 days — counted from current state; the actual start date could be earlier (oldest slot draft is 2026-04-27)
- **v4's existing output proves functionality, NOT safety as sole writer.** v4 has not been validated for: slot time correctness, duplicate prevention under sole-writer load, shadow-semantics safety, all-clients/all-platforms coverage.

### Unknown
- Defect 5 mechanism (materialise-slots not yet inspected)
- Whether the auto-approver was *intended* to ignore `is_shadow` or whether nobody noticed
- Whether `m.slot` rows have been seeded for clients other than the 4 we know about
- Origin classification of 2 of the 4 anomalous queue rows (NDIS-LI 18:00, PP-YT 10:00:57)

---

## 4. Recommended fix order (revised — reviewer's logic adopted)

1. **Patch cleanup trigger** (Bug 1) — change DELETE filter to `queue_id = NEW.queue_id`
2. **Patch cap logic** (Bug 2) — per-partition enforcement
3. **Fix fallback** (Bug 3) — return NULL or raise; downstream skips enqueue
4. **Inspect/fix `materialise-slots-nightly`** (Defect 5) — read function, confirm or refute defect, fix if confirmed
5. **Resolve `p_shadow` semantics** — binary: remove entirely OR enforce everywhere downstream
6. **Phase A dead-letter** — the 4 anomalous queue rows now that source bugs (3 and 5) are fixed
7. **Promote v4** — flip cron jobid 75 `p_shadow := false` (or remove parameter per Migration 5)
8. **Disable legacy enqueue + Phase B dead-letter** — set cron jobid 48 to `active=false`; dead-letter remaining legacy-origin futures and cross-platform orphans
9. *(Out of scope)* Re-classify health view's "stuck" definition

Migrations 7 and 8 are kept separate (24h observation between them). Existing dedupe guard in `enqueue-publish-queue-every-5m` prevents double-creation during the observation window.

---

## 5. v4 vs legacy decision point (revised wording)

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

### Recommendation (revised)

**Default intent: consolidate onto v4, pending Defect 5 inspection AND `p_shadow` resolution.**

Reasons:
1. v4 architecture is structurally cleaner — deterministic scheduling, audit trail, recovery, confidence scoring, dedup, evergreen fallback all exist in v4 and don't exist in legacy.
2. v4 has empirical evidence of end-to-end functionality (34 publishes succeeded). It does NOT yet have evidence of safe sole-writer operation.
3. Legacy has a known structural defect (Bug 3 fallback) that produces anomalous rows.
4. Retiring v4 would mean demolishing more code than fixing it — slot table, fill_pending_slots, materialise-slots-nightly, recover_stuck_slots, slot_fill_attempt, slot_alerts, and several `t.*` reference tables would all need to be either kept (for archive) or torn down.
5. Recent investments (F-PUB-009, F-AI-WORKER-PARSER-SKIP-BUG, parser fixes) all targeted v4. Retiring v4 invalidates those.

### Pre-promotion gates (must pass before Migration 7)

- **G1:** Inspect `materialise-slots-nightly` and confirm/refute Defect 5 (Migration 4)
- **G2:** Resolve `p_shadow` semantics binary (Migration 5) — see below
- **G3:** Inspect auto-approver's behaviour with `is_shadow=true` drafts (currently approves them — is that intended?)
- **G4:** Confirm `enqueue-publish-queue-every-5m` interaction with slot-driven drafts under the dedupe guard (verify no double-queue scenarios)

### `p_shadow` binary (G2)

Either:
- **(a) Remove the parameter entirely** — drop `p_shadow` from `m.fill_pending_slots`; drop `is_shadow` column from `m.post_draft` and `m.ai_job` (data migration: assume all existing shadow drafts were intended-production — they've already been publishing). Cleanest if no real shadow use case exists.
- **(b) Enforce shadow semantics everywhere downstream** — auto-approver, enqueue cron, publisher EFs all add `WHERE NOT is_shadow`. Correct if PK has a real backfill/dev use case.

The choice is PK's. The reviewer expressed a preference for (a). The brief surfaces both options; PK decides at Migration 5.

---

## 6. Queue reset policy (split into two phases)

### Position
**Dead-letter, do not delete.** Per memory: "Dead items are never deleted — they are an audit trail." The 47 historic dead queue rows already retained as audit confirm this stance.

### Phase A — Early safe cleanup (Migration 6, after source bugs are fixed)

**Scope:** The 4 currently-anomalous queue rows.

**Eligibility:** `scheduled_for` does not match a configured slot in `c.client_publish_schedule` for the (client, platform) pair.

**Reason codes:**
- `dead_reason='anomalous_scheduled_for_bug3_fallback'` for legacy-origin rows (1 confirmed: PP-LI 21:00)
- `dead_reason='anomalous_scheduled_for_defect5_slot_materialise'` for v4-origin rows (1 confirmed: NDIS-LI 12:00)
- Origin classification of the 2 remaining ambiguous rows happens during Migration 6 pre-flight

**Why after Migrations 3 and 4:** Source bugs (3 and 5) must be fixed first. If we dead-letter Phase A before fixing the materialise-slots bug, the buggy nightly cron could refill anomalous rows the next morning.

### Phase B — Cutover cleanup (Migration 8, atomic with disable-legacy)

**Scope:** Remaining legacy-origin queue rows after v4 has been promoted as sole writer for 24h.

**Eligibility:** ANY of:
1. **Legacy-origin futures**: `pd.is_shadow=false AND pd.slot_id IS NULL AND created_by='seed_and_enqueue'` AND `scheduled_for > NOW()`. These would be re-created by v4 from their slot rows. Reason: `dead_reason='legacy_path_retired_pre_v4_recreation'`.
2. **Cross-platform orphans**: queue rows whose corresponding draft has been published on a different platform (post-Migration 1, this won't accumulate further but pre-existing orphans need cleanup). Reason: `dead_reason='cross_platform_orphan_pre_v4_migration'`.

**Why later:** These rows depend on v4 being promoted and proven before being removed. Premature removal would create publishing gaps if v4 has issues.

### Estimated impact

PP-LI: 70 currently-queued rows → 1 anomalous (Phase A) + ~69 legacy-origin (Phase B).
NDIS-LI: 48 rows → 2 anomalous (Phase A) + mix (Phase B).
PP-YT: 10 rows → 1 anomalous (Phase A) + mix (Phase B).
NDIS-YT: 7 rows → 0 anomalous + mix (Phase B).

Total order of magnitude: ~4 rows in Phase A; ~140 rows in Phase B; ~140 rows recreated by v4 over 1-2 weeks following promotion.

---

## 7. Go/no-go gates per migration (revised)

Each migration follows the standard pattern:
- ChatGPT MCP review (D-01) — chat fires the review with structured context
- PK explicit approval after review
- Pre-flight P1-P5 (Lesson #61) — chat runs verification queries
- Apply via Supabase MCP `apply_migration` (D-170)
- Post-apply verification — chat runs verification queries
- Close-the-loop UPDATE on the review row

### Migration 1 — Cleanup trigger fix (Bug 1) [Tier 1]
- Change function body: `DELETE FROM m.post_publish_queue WHERE queue_id = NEW.queue_id` (drop the `post_draft_id` filter)
- Add `NEW.queue_id IS NOT NULL` guard
- Verify: pick a multi-platform draft, publish on FB, confirm LI queue row survives
- Post-apply audit: `SELECT count(*) FROM m.post_publish WHERE queue_id IS NULL AND created_at >= '2026-04-16'` — log if non-zero (informational; the new trigger no-ops on NULL queue_id by design, but knowing how often this happens is useful for future hygiene)
- Risk: LOW (narrowing a DELETE filter; can't make things worse than current state)

### Migration 2 — Cap fix (Bug 2, per-partition) [Tier 1]
- In the eligibility CTE, add filter: `WHERE rn <= GREATEST(0, COALESCE(cpp.max_per_day, 999) - stats.published_today)`
- This caps each `(client_id, platform)` partition independently before the picked CTE applies the global `LIMIT p_limit`
- Verify: simulate scenario with two clients having 3 eligible rows each, cap=2 per client, p_limit=3 — should lock 3 total (2 from one client + 1 from another OR 2 + 0 depending on FIFO order), never 3 from same client
- Pre-flight: confirm `publisher_lock_queue_v2` behaviour by running the eligibility CTE manually for each platform to see whether multi-partition cases occur in practice (already confirmed)
- Risk: LOW (tightening a filter)

### Migration 3 — Fallback fix (Bug 3) [Tier 1]
- Replace `RETURN p_from_utc + INTERVAL '5 minutes'` with `RETURN NULL`
- Update enqueue cron (`enqueue-publish-queue-every-5m`) to skip rows where the function returned NULL — emit a warning log row
- Verify: query for any new anomalous rows in next 24h — should be zero
- Risk: MEDIUM (changes downstream cron behaviour; need to verify cron handles NULL cleanly)

### Migration 4 — Inspect/fix `materialise-slots-nightly` (Defect 5) [Tier 2]
- Read the function definition (chat reads via Supabase MCP)
- Check current `m.slot` rows for `scheduled_publish_at` not matching configured slots
- Document findings
- If a defect is confirmed, propose a fix in this migration
- If no defect found, document closure with evidence
- Risk: LOW to MEDIUM depending on whether a fix is needed

### Migration 5 — Resolve `p_shadow` semantics [Tier 3]
- PK chooses (a) remove or (b) enforce
- If (a): drop the `p_shadow` parameter from `m.fill_pending_slots`; drop `is_shadow` column from `m.post_draft` and `m.ai_job` (data migration: existing shadow drafts treated as intended-production)
- If (b): add `WHERE NOT is_shadow` filter to auto-approver, enqueue cron, publisher EFs
- Coordinated multi-file change; touches multiple Edge Functions if (b)
- Risk: MEDIUM

### Migration 6 — Phase A dead-letter [Tier 4]
- Origin-classify the 4 anomalous queue rows (1 known Bug 3, 1 known Defect 5, 2 TBD)
- UPDATE: `status='dead'`, `dead_reason='anomalous_scheduled_for_bug3_fallback'` OR `dead_reason='anomalous_scheduled_for_defect5_slot_materialise'`
- Verify: queue depth decreases by 4; no new anomalous rows in 24h (confirms Migrations 3 and 4 hold)
- Risk: LOW (status flip)

### Migration 7 — Promote v4 [Tier 4]
- Cron jobid 75: change `p_shadow := true` to `p_shadow := false` (or remove parameter per Migration 5)
- Observe for 24h; verify slot-driven drafts produce queue rows correctly
- Verify production publishing continues at expected cadence
- Existing dedupe guard in `enqueue-publish-queue-every-5m` (`NOT EXISTS post_publish_queue WHERE post_draft_id = ...`) prevents double-creation during the observation window — this is why Migrations 7 and 8 can be sequential rather than atomic
- Risk: HIGH (the actual switchover; rollback = revert cron command flag)

### Migration 8 — Disable legacy enqueue + Phase B dead-letter [Tier 4, atomic]
- Cron jobid 48 (`enqueue-publish-queue-every-5m`): set `active=false`
- Mark `public.get_next_scheduled_for` as deprecated (comment + raise notice on call)
- DO NOT delete `get_next_scheduled_for` — kept for audit and rollback
- Generate dead-letter list for legacy-origin futures and cross-platform orphans
- Apply UPDATE setting `status='dead'` + `dead_reason`
- Verify no new legacy-origin queue rows in 24h
- Risk: HIGH (can be rolled back by setting `active=true` if v4 falters; dead-letter rows can be reverted via UPDATE if needed)

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

1. **v4 default vs retire**: Confirm "default to v4 pending Defect 5 + `p_shadow` resolution" is the right call (revised from v1's "promote v4 deliberately").
2. **`p_shadow` binary** (G2/Migration 5): (a) remove entirely, or (b) enforce everywhere downstream. PK decides based on whether shadow mode has a real use case to preserve.
3. **Migration cadence**: One per session? One per week? Batched? My recommendation: Migrations 1, 2, 3 each per session (each is isolated and small, Tier 1 immediately approvable); Migration 4 separate (inspection-first, Tier 2); Migration 5 separate (decision-first, Tier 3); Migrations 6-8 sequential with appropriate observation windows (Tier 4).
4. **Atomic vs separate Migration 7/8**: Reviewer suggests atomic cutover. I argue the existing dedupe guard makes 24h observation safe, so separate is fine and preserves a cleaner rollback window. PK decides.
5. **Materialise-slots inspection — this session or as Migration 4**: Do you want chat to inspect this session before finalising the brief, or let Migration 4 do it?
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

## v1 → v2 changelog

- **§ Required revisions before execution** added (top of brief) — captures the seven reviewer points and the one push-back
- **§ 1 Summary** — Bug 2 description tightened; "mixed origin" of stuck items called out
- **§ 2 Bug 2** — wording specifies per-partition behaviour and confirms multi-partition CTE
- **§ 2 Bug 3** — origin column added to anomalous-rows table; calls out 2 of 4 origins still TBD
- **§ 3 Proven vs inferred** — added "v4 functionality vs safety" caveat (Point 7); added unknown about origin classification of 2 rows
- **§ 4 Recommended fix order** — renumbered to reviewer's order: trigger, cap, fallback, inspect-materialise, resolve `p_shadow`, Phase A dead-letter, promote v4, disable legacy + Phase B
- **§ 5 Decision point** — recommendation reworded to "Default intent: consolidate onto v4 pending Defect 5 + `p_shadow` resolution"; `p_shadow` binary added; G2 framing simplified
- **§ 6 Queue reset** split into Phase A (Migration 6) and Phase B (Migration 8); rationale for ordering added
- **§ 7 Go/no-go gates** renumbered to match new fix order; Tier labels added; Migration 1 adds `queue_id IS NULL` audit; Migration 2 specifies per-partition fix; Migration 8 combines disable-legacy + cutover-dead-letter
- **§ 8 Health classifier** unchanged
- **§ 9 Open questions** updated (Q1 reworded; Q2 binary; Q3 includes Tier framing; Q4 added re: atomic vs separate; Q5 reworded)
- **§ 10, § 11** unchanged

---

*Brief drafted by chat 2026-05-05 morning Sydney session. v1 reviewed by external ChatGPT, revised to v2. Awaiting PK decision on Section 9 questions before any production changes.*
