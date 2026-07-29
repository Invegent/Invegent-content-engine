# Result — NDIS **Instagram** containment release (S9 §5, platform 2 of 4)

**CLAIMED v6.73 · s9-ig-containment-release · s9-ig-release · release-applied · 2026-07-29T19:22:35.880Z**

**Date:** 2026-07-30 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Packet:** `docs/briefs/s9-instagram-containment-release-packet-v1.md`
**Precedent:** `docs/briefs/results/s9-facebook-containment-release-result-v1.md` (v6.70)
**Outcome:** ✅ **INSTAGRAM RELEASED.** LinkedIn and YouTube **remain paused**. Facebook stays released.

---

## 1. What changed — one row, one column

```
c.client_publish_profile 3827af5c-3cc1-4b2b-83ff-8d0d72db80c2  (ndis-yarns · instagram)
  paused_until : 2027-01-01 00:00:00+00  ->  NULL (RELEASED)
```

| platform | state |
|---|---|
| facebook | **NULL (RELEASED)** — v6.70 |
| **instagram** | **NULL (RELEASED)** — this lane |
| linkedin | 2027-01-01 00:00:00+00 |
| youtube | 2027-01-01 00:00:00+00 |

**PK ruling recorded:** release authorised; **carousel and video_short_avatar staying stopped accepted**,
and the 12 already-scheduled slots for the blocked formats are terminal under ruling 1.

## 2. Self-verifying apply — three in-transaction STOPs

1. **Enforcement identity** — all five asserted before the update: `publisher_lock_queue_v2 bd265650…` ·
   `gate_queue_on_asset_status 1dbfe725…` · `auto_approver_fetch_drafts 2e64247e…` ·
   `fill_pending_slots b56bbd30…` · cron 48 `faca2e87…`
2. **Target row** — had to be exactly `2027-01-01 00:00:00+00`.
3. **Blast containment** — `ROW_COUNT = 1`; LinkedIn + YouTube re-asserted still paused **and** Facebook
   re-asserted still released, all after the update.

## 3. Prediction → verification

Stated **before** applying: exactly one queued IG row — `39703c93`, `image_quote`, `image_status='generated'`,
approved, healthy, due since 2026-07-29 02:00 — so one healthy `image_quote` post would publish.

Verified **after**, read-only (the eligibility predicate replicated as a plain SELECT; deliberately **not**
calling `publisher_lock_queue_v2`, which would lock rows and force an out-of-band publish):

```
queue 39703c93 · image_quote · final_format_authority=advisor
  s9_ok = true   verdict = ELIGIBLE — will publish
```

Prediction matched exactly.

## 4. Net effect

Under the pause, NDIS Instagram published **nothing** (slots were skipped `publish_path_disabled` at the
pre-existing cc-0019 gate). The release therefore **restores** the Ready format and leaves the gaps
stopped for honest, queryable reasons:

| format | classifier | pub/90d (pre-containment) | now |
|---|---|---|---|
| `image_quote` | `ready` | **27** | ✅ restored |
| `carousel` | `unsupported_silent_degrade` / `no_selectable_template` | 3 | ⛔ blocked |
| `video_short_avatar` | `unsupported_silent_degrade` / `format_unmapped` | 4 | ⛔ blocked |
| `video_short` | `template_missing` | 0 | ⛔ blocked |

**27 of the last 34 Instagram publishes (79%) come back; 7 do not.**
`text` is not reachable on Instagram (`platform_support.instagram=false`), so the template-less carve-out
plays no part here — unlike Facebook, where it carried 21 publishes.

**`video_short_avatar` note:** it reached Instagram via the **A2 override** in `ai-worker` (which pins the
format regardless of the Advisor palette), not via `client_format_config` — which disables it, yet it
published 4× in 90 days. Capability enforcement blocks it either way.

## 5. Proofs carried from the packet (all live, aborted transactions)

- **Enqueue** — a blocked draft returned **no `queue_id`**; suppressed at source by the BEFORE INSERT trigger.
- **Dequeue** — deliberately harder than the Facebook test: the draft was enqueued **while healthy**, then
  blocked **after** it was already in the queue (the legacy-data / manual-mutation / race case), and
  scheduled **earlier** so it would otherwise have won.
  `blocked_dequeued=0 · ready_dequeued=1 · all_locked_healthy=true · blocked row retained as 'queued'`.
- **Schedule-fill (Layer 1)** — 5 real carousel slots →
  `capability_blocked:unsupported_silent_degrade:carousel`.
- **Zero regression** — `image_quote` fills (the 4 `pool_thin;no_eligible_evergreen` skips are the content
  pool, not capability).

## 6. Monitoring

```sql
-- expect image_quote ONLY. carousel or video_short_avatar here = enforcement failed -> re-pause
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='instagram'
   AND pp.status='published' AND pp.published_at >= now() - interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- capability skips should now appear for IG carousel / video_short / video_short_avatar
SELECT platform, skip_reason, count(*) FROM m.slot
 WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4'
   AND skip_reason LIKE 'capability_blocked:%' GROUP BY 1,2 ORDER BY 3 DESC;
```

**Facebook tripwire at the time of this release: CLEAN** — only `image_quote` published since v6.70
(1 post, 2026-07-29 10:05:10), zero carousel.

## 7. Rollback

```sql
UPDATE c.client_publish_profile SET paused_until='2027-01-01 00:00:00+00', updated_at=now()
 WHERE client_publish_profile_id='3827af5c-3cc1-4b2b-83ff-8d0d72db80c2';
```
One column, instant, no code change. Enforcement stays live either way.

## 8. Next — LinkedIn, with a known complication

LinkedIn is platform 3 of 4. Its evidence pass must resolve one thing the Facebook and Instagram passes
did not face: the **v6.71 dashboard lane independently surfaced that LinkedIn `text` has no selectable
template** (69 Property Pulse posts published ungoverned in 90 days). For NDIS LinkedIn, `text` is the
dominant format — **71 publishes in 90 days**, the single largest cell in the whole containment.

So the LinkedIn pass must establish whether NDIS LinkedIn `text` **rides the template-less carve-out**
(`render_engine='none'` ⇒ exempt, as on Facebook where it carried 21 publishes) or is a **genuine gap**.
If it were ever *not* exempt, releasing LinkedIn would stop the largest publishing cell NDIS has — so this
must be proven, not assumed, before recommending that release.

YouTube stays last and additionally carries §5 criterion 9 (both entry paths fail-closed — built and
deployed in v6.68 — plus the fail-open `paused_until` preload item in `youtube-publisher`).
