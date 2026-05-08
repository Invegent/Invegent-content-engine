# Result — cc-0003 M6 Phase A — HALTED at pre-flight §1.5

**Brief:** `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md`
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**Outcome:** HALTED at pre-flight §1.5 (slot-driven sanity check failed open). No `apply_migration` call. No D-01 fire. No production state changed.

---

## 1. Halt summary

| Item | Value |
|---|---|
| Halt point | brief §1.5 (slot-driven sanity check) |
| Halt rule fired | `slot_driven_count = 2` (brief expected `0`; brief decision rule "HALT and escalate") |
| §1.3 phase_a_target_count | 11 (matches brief draft-time count; inside `[5,25]` — would have proceeded past §1.3) |
| §1.6 + §1.7 | NOT run (pre-flight sequence halted at §1.5) |
| §4 P1–P5 walk | NOT run |
| §5 D-01 packet | NOT prepared / NOT fired |
| §6 apply procedure | NOT executed |
| §7 verification queries | NOT run |
| §8 NO-OP / HALT / ROLLBACK paths | none triggered (this halt precedes §8 entirely; it is a §1.5 halt, not a §8.2 count-range halt) |
| Production writes | **NONE** |
| Cron edits | NONE |
| EF deploys | NONE |
| Files modified in repo | only this result file (created) |

---

## 2. Pre-flight results captured (§1.1 – §1.5)

### §1.1 — column structure of `m.post_publish_queue`

| column_name | data_type | is_nullable |
|---|---|---|
| client_id | uuid | YES |
| created_at | timestamp with time zone | NO |
| dead_reason | text | YES |
| platform | text | YES |
| post_draft_id | uuid | YES |
| queue_id | uuid | NO |
| scheduled_for | timestamp with time zone | YES |
| status | text | YES |
| **updated_at** | **timestamp with time zone** | **NO** |

**`updated_at` exists and is NOT NULL.** Per brief §3 note 3, this would have triggered the SQL amendment (add `, updated_at = NOW()` to the SET clause) once §1.2 trigger surface was characterised as not auto-maintaining it. The trigger function inspected at §1.2 does not maintain `updated_at`, so the amendment would have been applied. Captured here for the eventual cc-0003v2 / re-apply session — not used this turn.

### §1.2 — triggers on `m.post_publish_queue` (3 non-internal)

| tgname | enabled | event | side effects on this UPDATE |
|---|---|---|---|
| `tr_publish_queue_backoff_368_v1` | O | BEFORE UPDATE OF `last_error` | None — column event mismatch (we update `status`, not `last_error`). |
| `tr_publish_queue_reset_on_success_v1` | O | BEFORE UPDATE OF `status` | None — function body inspected; only acts when `new.status = 'published'` (zeroes error fields). Our UPDATE moves `status → 'dead'`, IF branch is FALSE; trigger returns NEW unmodified. |
| `trg_gate_queue_on_asset_status` | O | BEFORE INSERT | None — event mismatch (UPDATE not INSERT). |

`m.tg_publish_queue_reset_on_success_v1` body excerpt:

```plpgsql
if tg_op='UPDATE'
   and old.status is distinct from new.status
   and new.status = 'published'
then
  new.last_error := null;
  new.last_error_code := null;
  new.last_error_subcode := null;
  new.err_368_streak := 0;
  new.last_error_at := null;
end if;
return new;
```

Conclusion: §1.2 PASS. No external side effects on the planned UPDATE. (Captured for record; this row alone would not have halted.)

### §1.3 — Phase A target count

| metric | value |
|---|---|
| `phase_a_target_count` | **11** |
| `partition_count` (distinct `(client_id, platform)`) | 3 |
| `oldest_created_at` | 2026-04-25T02:55:00.483838Z |
| `newest_created_at` | 2026-05-01T14:55:00.537162Z |

11 inside `[5, 25]` — would have proceeded past §1.3 to §1.4. (No §8.2 halt.)

### §1.4 — target snapshot (full 11-row capture)

Captured in apply session context for the rollback path (had apply proceeded). Preserved here for any cc-0003v2 / re-apply continuation.

| # | queue_id | client_id | platform | scheduled_for | created_at | gap (s) | pre_status | post_draft_id | draft_status | slot_id |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `7bf95451-ce60-4a05-b013-ef72cc153cc3` | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` (NY) | instagram | 2026-04-25T03:00:19.661Z | 2026-04-25T02:55:00.484Z | 319.18 | queued | `c22cf256-9124-495f-95ef-4afff3b7fd92` | approved | NULL |
| 2 | `e9f9646c-6a32-48a2-9976-65c64a23c8d2` | NY | instagram | 2026-04-25T03:15:16.761Z | 2026-04-25T03:10:00.525Z | 316.24 | queued | `ffc404b5-27f7-4b49-93d8-02c5b09f897b` | approved | NULL |
| 3 | `2a20945f-5686-4e18-a578-7f647123df12` | NY | instagram | 2026-04-25T05:00:15.484Z | 2026-04-25T04:55:00.454Z | 315.03 | queued | `4997ef43-4c23-4ca2-b0e0-655b22d9aad7` | approved | NULL |
| 4 | `198cafdd-7be0-47a6-a166-ffbe91a86750` | NY | instagram | 2026-04-25T05:15:09.242Z | 2026-04-25T05:10:00.569Z | 308.67 | queued | `a92d2f86-ec4f-4599-bc4d-41b36c4fad42` | approved | NULL |
| 5 | `1ee24789-b388-4424-ab91-422372f69d53` | NY | instagram | 2026-04-25T05:30:12.498Z | 2026-04-25T05:25:00.479Z | 312.02 | queued | `dcdafb34-48e2-4dea-8c58-b6dd51f4a568` | approved | NULL |
| 6 | `f93f8072-8f56-4371-a002-26dd6141a8f8` | NY | instagram | 2026-04-25T06:00:24.445Z | 2026-04-25T05:55:00.457Z | 323.99 | queued | `06a70358-69f4-4134-9b4a-57edce59b560` | approved | NULL |
| 7 | `958a6c98-bd5e-4db4-9aaf-18f358890f26` | NY | instagram | 2026-04-25T07:00:25.501Z | 2026-04-25T06:55:00.504Z | 325.00 | queued | `6ec14295-21b8-41cb-ae81-7abed03559c6` | approved | NULL |
| 8 | `c736a6ff-7c1a-49f0-821d-7e0da51460ab` | `fb98a472-ae4d-432d-8738-2273231c1ef4` (PP) | instagram | 2026-04-25T08:00:17.836Z | 2026-04-25T07:55:00.683Z | 317.15 | queued | `e511115d-0199-4ad0-86a2-103129a92a23` | approved | NULL |
| **9** | **`929ee2f9-7bd0-42ce-b6e0-1ff62b88f823`** | **`93494a09-cc89-41d1-b364-cb63983063a6` (CFW)** | **instagram** | **2026-04-27T06:45:30.546Z** | **2026-04-27T06:40:28.297Z** | **302.25** | **queued** | **`0a5081e5-14e0-44ed-a2e9-0c53e0755994`** | **needs_review** | **`082b081c-8196-4d78-a1a7-bc4e1063307e`** |
| **10** | **`30fa6594-a233-4f1e-a984-7b37fa170fcb`** | **CFW** | **instagram** | **2026-04-30T00:45:39.332Z** | **2026-04-30T00:40:38.477Z** | **300.86** | **queued** | **`1cf26c54-6b17-482c-9f5e-9abea95fd9db`** | **needs_review** | **`c95be2be-a807-478e-ab60-4ac85094ca96`** |
| 11 | `7bcb5574-4932-4720-ad8d-160012195935` | PP | instagram | 2026-05-01T15:00:14.718Z | 2026-05-01T14:55:00.537Z | 314.18 | queued | `4cd4ecb3-a15d-4de7-b532-390cfca580c2` | approved | NULL |

All 11 rows are `instagram` platform, `queued` status. Three clients: NY (×7), PP (×2), CFW (×2). The two CFW rows are the `slot_id IS NOT NULL` outliers.

### §1.5 — slot-driven sanity check (HALT POINT)

Query result: `slot_driven_count = 2`.

Brief decision rule:

> Decision rule: expected = 0. The Bug 3 fingerprint should never appear on slot-driven drafts (M4 wrote `pd.scheduled_for` from `slot.scheduled_publish_at` for those, bypassing the `get_next_scheduled_for` fallback path entirely). If `slot_driven_count > 0`, HALT and escalate — the criterion may be capturing rows we don't intend.

**HALT — pre-flight sequence terminated at §1.5. §1.6 and §1.7 not executed.**

---

## 3. The 2 slot-bound queue IDs (the anomaly)

| field | row 9 | row 10 |
|---|---|---|
| queue_id | `929ee2f9-7bd0-42ce-b6e0-1ff62b88f823` | `30fa6594-a233-4f1e-a984-7b37fa170fcb` |
| client_id | `93494a09-cc89-41d1-b364-cb63983063a6` (CFW) | `93494a09-cc89-41d1-b364-cb63983063a6` (CFW) |
| platform | instagram | instagram |
| post_draft_id | `0a5081e5-14e0-44ed-a2e9-0c53e0755994` | `1cf26c54-6b17-482c-9f5e-9abea95fd9db` |
| draft.approval_status | needs_review | needs_review |
| draft.slot_id | `082b081c-8196-4d78-a1a7-bc4e1063307e` | `c95be2be-a807-478e-ab60-4ac85094ca96` |
| created_at | 2026-04-27T06:40:28.297146Z | 2026-04-30T00:40:38.477121Z |
| scheduled_for | 2026-04-27T06:45:30.545662Z | 2026-04-30T00:45:39.332139Z |
| (scheduled_for − created_at) | **302.25 s** (5 min 02 s) | **300.86 s** (5 min 00 s) |
| Bug 3 fingerprint match | YES (`abs(gap − 300) < 60`) | YES (`abs(gap − 300) < 60`) |

**What's surprising:** these two rows have `slot_id` populated on the draft *and* a `scheduled_for - created_at` gap matching the strict Bug 3 fingerprint (~5 min ± 60 s). Per the M4 architecture (per brief §1.5 rationale), slot-driven drafts should have `scheduled_for` written from `slot.scheduled_publish_at`, never from the `get_next_scheduled_for` 5-min wall-clock fallback.

Either (a) M4's slot → queue path has an edge case that fell back to 5-min default while leaving `slot_id` set on the draft, or (b) the strict 5-min fingerprint criterion incidentally matches a small number of slot-bound rows that happen to have been scheduled exactly ~5 min after creation by some unrelated path (e.g. cron tick alignment with a 5-min slot interval). Distinguishing (a) from (b) requires investigation — explicitly out of scope for this session per the HALT rule.

---

## 4. What's NOT in this file (and why)

- **No D-01 packet contents.** §5 packet was never prepared because §1.5 halted before §4 P1–P5 / §5 packet construction.
- **No `pre_dead_reason_count` (§1.7).** Pre-flight sequence halted at §1.5; §1.7 query was not executed.
- **No pre-state aggregates by status (§1.6).** Same reason.
- **No P1–P5 evidence.** Walk not started.
- **No verification queries V1–V6.** No apply, no verification.
- **No rollback SQL.** No apply, no rollback needed.

---

## 5. Recommended next step

Author **`docs/briefs/cc-0003v2-m6-phase-a-bug3-dead-letter.md`** (or a separate `docs/briefs/INV-cc-0003-slot-bound-anomaly.md` investigation brief) covering one of the following paths. Decision is PK's; CC drafts what PK directs.

### 5.1 Path A — narrow the criterion (if the 2 slot-bound rows are coincidental matches, not Bug-3 victims)

Patch §2 selection criterion to:

```sql
WHERE q.status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
  AND pd.slot_id IS NULL
```

(joining `m.post_draft pd ON pd.post_draft_id = q.post_draft_id`)

This would dead-letter only 9 rows (rows 1–8 + 11) and leave the 2 CFW slot-bound rows for separate handling. cc-0003v2 §1.5 then becomes "expected = 0; HALT if > 0" applied to the narrowed criterion (which would now naturally pass).

The 2 slot-bound rows would need their own classification: M6 Phase B (cc-0004), M8 cleanup (cc-0005), or a new finding (e.g. `F-M4-SLOT-FALLBACK-EDGE-CASE`).

### 5.2 Path B — investigate the 2 slot-bound rows first

Read-only investigation:

- Read `c.client_publish_schedule` rows for the 2 slot_ids (`082b081c-8196-4d78-a1a7-bc4e1063307e`, `c95be2be-a807-478e-ab60-4ac85094ca96`) — what was `scheduled_publish_at` and `fill_window_opens_at` at slot definition time?
- Read `m.slot` (or current slot table per current naming) for the 2 slot_ids — what was the slot's intended publish time?
- Inspect `m.publisher_lock_queue_v2` / queue-insert function bodies to understand the path that could produce a 5-min default while `pd.slot_id` is set.
- Compare `slot.scheduled_publish_at` vs `q.scheduled_for` for these 2 rows. If they differ, M4's intent (write `pd.scheduled_for` from `slot.scheduled_publish_at`) was bypassed for these rows.
- git log on the queue-insert / M4 cascade migration history for any known edge case.

Outcome of investigation determines whether to proceed with Path A (narrow + treat 2 separately) or Path C (broaden + include 2).

### 5.3 Path C — broaden the criterion (if the 2 slot-bound rows ARE Bug-3 victims that happened to have slot_id set after the fact)

Drop the §1.5 sanity check or change its expected value, document the rationale, dead-letter all 11. This is the most invasive option and should not be chosen without the investigation in 5.2 establishing causality.

### 5.4 Path D — close M6 Phase A as ambiguous; defer to broader queue cleanup

Mark M6 Phase A as "scope-disputed; deferred to Phase 0 m.vw_pipeline_state implementation". Let the view's classification rules (`§10.2 precedence rule 1`) handle these rows for the operator UI without dead-lettering them at the table level. Lowest-risk option but leaves the 11 rows in `queued` status indefinitely (the publisher won't actually publish them anomalously per cc-0003 brief §5.2 `consequence_if_delayed`, but they'll keep surfacing in health-check Cowork).

### 5.5 Recommendation

CC's read-only investigation isn't a substitute for PK + chat re-evaluating reconciliation §6 Q1 with this empirical finding. The cc-0003 brief was authored on the assumption that the strict 5-min fingerprint would cleanly partition Bug-3 rows from slot-driven rows. Pre-flight §1.5 falsified that assumption with a 2-row exception. Path B (investigate first) is the soundest sequence; Path A or C follows from B's findings.

---

## 6. Hold-state assertions

- No `apply_migration` calls.
- No SQL DDL or DML executed (only `SELECT` against `information_schema.columns`, `pg_trigger`, `pg_proc`, `m.post_publish_queue`, `m.post_draft`).
- No D-01 fire.
- No EF deploys.
- No cron edits.
- No code changes.
- `STANDING_THREE` array untouched.
- `m.ef_drift_log` untouched.
- `m.chatgpt_review` untouched (no close-the-loop entry; no fire was made).
- Memory `recent_updates` untouched (chat-owned).
- cc-0003 brief file (`docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md`) untouched.
- This result file is the only repo change in this commit.

---

*Result authored by CC, 2026-05-09 Sydney. Awaiting PK direction (cc-0003v2 patch brief OR separate investigation brief OR alternative path).*
