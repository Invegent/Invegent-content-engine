# Result — NDIS **LinkedIn** containment release (S9 §5, platform 3 of 4)

**CLAIMED v6.77 · s9-li-containment-release · s9-li-release · release-applied · 2026-07-29T23:12:53.878Z**

**Date:** 2026-07-30 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Packet:** `docs/briefs/s9-linkedin-containment-release-packet-v1.md`
**Outcome:** ✅ **LINKEDIN RELEASED.** YouTube **remains paused** — the last platform, and the one that carries the extra criterion.

---

## 1. What changed

```
c.client_publish_profile 198f7328-2c3b-4110-9585-ef8fa692049e  (ndis-yarns · linkedin)
  paused_until : 2027-01-01 00:00:00+00  ->  NULL (RELEASED)
```

| platform | state |
|---|---|
| facebook | **RELEASED** (v6.70) |
| instagram | **RELEASED** (v6.73) |
| **linkedin** | **RELEASED** (this lane, v6.77) |
| youtube | 2027-01-01 00:00:00+00 |

**PK ruling recorded:** authorised; `carousel` (1/90d) and `video_short_avatar` (1/90d) staying stopped accepted.

## 2. Self-verifying apply — STOPs

Five enforcement identities asserted (`publisher_lock_queue_v2 bd265650…` · `gate_queue_on_asset_status
1dbfe725…` · `auto_approver_fetch_drafts 2e64247e…` · `fill_pending_slots b56bbd30…` · cron 48
`faca2e87…`); target row had to be exactly `2027-01-01`; `ROW_COUNT = 1`; and **after** the update,
YouTube re-asserted still paused **and** Facebook + Instagram re-asserted still released.

## 3. The question this pass existed to answer

NDIS LinkedIn `text` is **71 publishes/90d — the largest cell in the entire containment**, and v6.71 had
surfaced that LinkedIn `text` has no selectable template. Measured directly rather than assumed from
Facebook:

```
status = unsupported_silent_degrade · reason = format_unmapped
is_capability_exempt_format('text') = true      (render_engine='none')
status ∈ {template_missing, unsupported_silent_degrade} = true
  => WOULD PROCEED
```

Both conditions of the narrowed carve-out hold. **Proven, not merely computed:** five *real scheduled*
LinkedIn `text` slots were driven through the **live** Layer-1 gate → **`capability_skips = 0`**.

## 4. Net effect — the cleanest release of the three

| format | classifier | pub/90d | now |
|---|---|---|---|
| `text` | `unsupported_silent_degrade` + **exempt** | **71** | ✅ restored (carve-out) |
| `image_quote` | `ready` | 8 | ✅ restored |
| `carousel` | `unsupported_silent_degrade` | 1 | ⛔ blocked |
| `video_short_avatar` | `unsupported_silent_degrade` | 1 | ⛔ blocked |

**79 of 81 publishes (97.5%) restored** — Facebook 91%, Instagram 79%. **Zero scheduled slots are
capability-blocked** (Instagram had 12).

## 5. Prediction → verification

Unlike Facebook and Instagram, **LinkedIn had nothing waiting**: zero queue rows in `queued`/`running`,
and zero cron-48 enqueue candidates. So the prediction was explicitly **no immediate publish** — release
restores *eligibility*, and publishing resumes as the 19 healthy future slots fill (at
`scheduled_publish_at − 1440 min`), capped by `max_per_day = 2`.

Verified post-release: LinkedIn `paused_until = NULL`; the other three platform states exactly as
intended. Nothing published immediately, as predicted.

**Facebook + Instagram tripwires CLEAN at the time of this release:**
`facebook · image_quote · 1 · 2026-07-29 10:05:10` and `instagram · image_quote · 1 · 2026-07-29 19:30:15`.
Zero carousel, zero `video_short_avatar` on either. The Instagram publish confirmed that release's own
prediction end-to-end.

## 6. Proofs (live, aborted transactions)

- **Publisher boundary**, via the harder post-enqueue path (enqueued while healthy, blocked *after* it was
  in the queue, scheduled *earlier* so it would otherwise win):
  `blocked_dequeued=0 · ready_dequeued=1 (a text draft) · all_locked_healthy=true · blocked row retained 'queued'`.
- **Layer-1 gate on real `text` slots**: `capability_skips = 0`.
- Those slots skipped for `bundle_diversity_insufficient:got_1_need_2` — the **content pool / synthesis
  policy**, not capability. Confirmed a **test artifact** of forcing five slots due at once: real LinkedIn
  operation over 30 days shows **zero** `bundle_diversity` skips (`pool_thin` ×11,
  `publish_path_disabled` ×6, one `compliance_skip`) and **20 slots filled**.

## 7. LinkedIn-specific mechanics (verified, not assumed)

- The **active** publisher `linkedin-zapier-publisher` calls `m.publisher_lock_queue_v2` **directly**
  (`index.ts:115`), not via the `v1` wrapper Facebook and Instagram use. Same guard inherited — proven
  against `p_platform='linkedin'`.
- `linkedin-publisher` remains **undeployed dead code** despite also calling `v2`.
- Throttles: `min_gap_minutes=240`, **`max_per_day=2` (by design)**, `max_queued_per_platform=6`,
  destination `urn:li:organization:112982689`. Restored volume ramps more slowly than Facebook's.

## 8. Monitoring

```sql
-- expect text + image_quote ONLY
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='linkedin'
   AND pp.status='published' AND pp.published_at >= now()-interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- TRIPWIRE: any capability_blocked:*:text row ANYWHERE = the carve-out has failed
SELECT platform, skip_reason, count(*) FROM m.slot
 WHERE skip_reason LIKE 'capability_blocked:%:text' GROUP BY 1,2;
```

## 9. Rollback

```sql
UPDATE c.client_publish_profile SET paused_until='2027-01-01 00:00:00+00', updated_at=now()
 WHERE client_publish_profile_id='198f7328-2c3b-4110-9585-ef8fa692049e';
```
One column, instant, no code change.

## 10. Next — YouTube, last and hardest

YouTube is the only platform left, and the only one carrying **§5 criterion 9**:

1. **Both entry paths proven fail-closed** — built and deployed in v6.68; `deploy-verifier` confirmed
   **exactly two** capability-predicate occurrences in the live bundle (SELECT + atomic pre-claim) with the
   constant resolving to a real value. This part is done, but its release-specific proof still needs running.
2. **The fail-open `paused_until` preload is still OPEN** — `youtube-publisher` wraps its per-client
   `paused_until` read in `try{}catch(_){}` and **fails open** on a read error. The architecture named this
   as an explicit **co-requirement for YouTube's release specifically**, not merely a disclosure. Because
   the YouTube hold *is* `paused_until`, a read failure there is precisely the thing that would let a
   paused channel publish.
3. YouTube is also where this whole arc started: `video_short_avatar`, **54 publishes/90d** of
   `unsupported_silent_degrade` — by far the largest single silent-degrade cell in the containment.

**Carry (unrelated to this lane):** the service-role key rotation is still outstanding on PK's side.
Note the publishers read `SUPABASE_SERVICE_ROLE_KEY`; revoking the old key before the EF secret is updated
**and** the functions redeployed would stop publishing on all three now-released platforms.
