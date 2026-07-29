# S9 — NDIS **Instagram** Containment Release · Gate-1 evidence packet

**Created:** 2026-07-30 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Criteria:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §5 (PK ruling 4 order — **FB ✅ → IG (this) → LI → YT last**)
**Precedent:** `docs/briefs/results/s9-facebook-containment-release-result-v1.md` (v6.70)
**Status:** **EVIDENCE COMPLETE — awaiting PK release decision. Nothing changed; Instagram is still paused.**

---

## 0. The proposed act

```sql
UPDATE c.client_publish_profile
   SET paused_until = NULL, updated_at = now()
 WHERE client_publish_profile_id = '3827af5c-3cc1-4b2b-83ff-8d0d72db80c2';
-- ndis-yarns · instagram · currently paused_until = 2027-01-01 00:00:00+00
```

**Rollback:** restore `2027-01-01`. One column, instant, no code change.
LinkedIn (`198f7328…`) and YouTube (`e2261899…`) stay paused. Facebook stays released.

---

## 1. Framing correction — what "release" actually changes

Worth stating precisely, because it also refines how the Facebook result should be read.

**Under the pause, NDIS Instagram publishes nothing at all.** The pause fails the pre-existing cc-0019
gate (`m.is_publish_eligible`) *before* any capability logic runs, so slots are skipped
`publish_path_disabled` — **7 such skips in the last 14 days**, most recent 2026-07-29 02:00.

So releasing Instagram does not "stop" anything currently running. It:

- **restores** the formats that are capability-Ready, and
- **keeps stopped** the formats that are not — but now for the **honest reason**
  (`capability_blocked:<status>:<format>`) instead of a blanket platform pause.

The publish counts below are **pre-containment 90-day history**, i.e. what the steady state looked like
before 2026-07-28 — they describe what does and does not come back.

## 2. Instagram's reachable palette

Derived from `platform_support.instagram = true` **AND** `c.client_format_config`, plus the
schedule/override path (the A2 avatar override in `ai-worker` pins `video_short_avatar` regardless of the
Advisor palette, so a scheduled avatar slot *is* reachable even though the client config disables it):

| format | reachable via | classifier | published/90d | after release |
|---|---|---|---|---|
| `image_quote` | Advisor palette | **`ready`** | **27** | ✅ **restored** |
| `carousel` | Advisor palette | `unsupported_silent_degrade` / `no_selectable_template` | **3** | ⛔ stays stopped |
| `video_short_avatar` | schedule → A2 override | `unsupported_silent_degrade` / `format_unmapped` | **4** | ⛔ stays stopped |
| `video_short` | schedule (5 future slots) | `template_missing` | 0 | ⛔ stays stopped |

**Net: 27 of the last 34 Instagram publishes (79%) come back; 7 do not.**
`text` is NOT reachable on Instagram (`platform_support.instagram = false`), so the template-less
carve-out is irrelevant here — unlike Facebook, where it carried 21 publishes.

**Scheduled demand that will now be capability-skipped at fill:** `carousel` ×5, `video_short` ×5,
`video_short_avatar` ×2 = **12 future slots**, versus `image_quote` ×5 + `(no preference)` ×11 → 16 slots
that proceed. Those 12 are terminal under PK ruling 1.

## 3. Proofs — all live, all in aborted transactions

**(a) Enqueue boundary — the blocked draft cannot even enter the queue.**
Marking a draft `blocked_by_capability` and then inserting a queue row returned **no `queue_id`** — the
BEFORE INSERT trigger suppressed it (`RETURN NULL`). Contamination prevented at source.

**(b) Dequeue boundary — a stronger test than Facebook's.** The blocked draft was enqueued **while
healthy**, then blocked **after** it was already in the queue — precisely the "arrived via legacy data,
manual mutation or a race" case the dequeue guard exists for — and scheduled **earlier** so it would
otherwise have won:

```
paused_until = NULL (released)   cc0019_eligible = true
blocked_dequeued      = 0   <- must be 0   ✅
ready_dequeued        = 1   <- expect 1    ✅
locked                = 1   all_locked_healthy = true
blocked_row_status    = queued   (retained, not consumed)
```

**(c) Schedule-fill boundary (Layer 1) — real scheduled carousel slots:**
```
5 × { decision: skipped, format: carousel,
      skip_reason: "capability_blocked:unsupported_silent_degrade:carousel" }
```

**(d) Zero regression — `image_quote` still fills:** `1 filled`, `4 skipped pool_thin;no_eligible_evergreen`.
The `pool_thin` skips are the **content pool**, not capability — unrelated to this release and
pre-existing.

### 3.1 Two live behaviours confirmed along the way (neither is a defect)

- The **pre-existing asset-hold branch** of `gate_queue_on_asset_status` still works: a first fixture with
  no generated image was deferred `+4h` at enqueue, which is why an early proof attempt showed `due=f`.
  That is the original v-unchanged behaviour I preserved byte-for-byte, doing its job.
- Instagram throttles are healthy and not a factor: `min_gap_minutes=240`, `max_per_day=4`,
  `published_today=0`, last publish 2026-07-28 02:00.

## 4. §5 criteria — Instagram

| # | Criterion | Status |
|---|---|---|
| 1 | Classifier durable record | ✅ v6.46 |
| 2 | This platform's enforcement live | ✅ resolver L1+L2 (v6.58) + publisher chokepoint (v6.68). Instagram dequeues via `publisher_lock_queue_v1` → the shared `v2` predicate |
| 3 | Non-Ready IG cells re-verified closed | ✅ §2 — carousel, video_short_avatar, video_short all block |
| 4 | Backtest with pause lifted | ✅ §3(b) — and via the harder post-enqueue blocking path |
| 5 | Zero regression on Ready steady state | ✅ §3(d) — `image_quote` fills and dequeues |
| 6 | Standard chain clean | ✅ inherited from the two enforcement builds |
| 7 | Durable rollback proven | ✅ one-column UPDATE; enforcement rollbacks proven in their own lanes |
| 8 | Go-forward signal readable | ✅ §6 |
| 9 | YouTube-specific | n/a |

## 5. Risk

| Risk | Assessment |
|---|---|
| A blocked draft publishes | **Closed** — proven at both boundaries, including the post-enqueue race case |
| Ready content stops | **No** — `image_quote` proven to fill and dequeue |
| Avatar cross-platform leak | **Closed by capability** — `video_short_avatar` on IG classifies non-Ready and blocks. Note this is the format with 4 IG publishes in 90d despite `client_format_config` disabling it, i.e. it reached IG via the A2 override, not the palette |
| Blast radius if wrong | One client, one platform; rollback is one column |

**Residual:** `wordpress-publisher` remains outside enforcement (PK ruling 2); NDIS is unreachable on it.
The standing claim is "the four named platforms", never "every publish path".

## 6. Monitoring after release

```sql
-- expect image_quote ONLY. carousel or video_short_avatar here = enforcement failed -> re-pause
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='instagram'
   AND pp.status='published' AND pp.published_at >= now() - interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- capability skips should now appear for IG carousel / video_short / video_short_avatar
SELECT skip_reason, count(*) FROM m.slot
 WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='instagram'
   AND skip_reason LIKE 'capability_blocked:%' GROUP BY 1 ORDER BY 2 DESC;
```

## 7. Recommendation

**Release Instagram.** All eight applicable criteria are met with live evidence, proven at three
boundaries (enqueue, dequeue, schedule-fill) including the harder post-enqueue race case. Releasing
restores 79% of Instagram's pre-containment publishing (`image_quote`, 27/90d) and leaves the three
genuine capability gaps stopped with honest, queryable reasons.

**What I need from PK:** (a) authorisation to run the §0 UPDATE, and (b) acceptance that **Instagram
carousel (3/90d) and video_short_avatar (4/90d) stay stopped**, and that the 12 already-scheduled slots
for those formats are terminal under ruling 1.

**Then:** LinkedIn. Note the v6.71 dashboard lane independently surfaced that **LinkedIn `text` has no
selectable template** (69 PP posts published ungoverned in 90d) — LinkedIn's evidence pass must
establish whether NDIS LinkedIn `text` rides the template-less carve-out (as on Facebook) or is a
genuine gap. YouTube remains last, with §5 criterion 9.
