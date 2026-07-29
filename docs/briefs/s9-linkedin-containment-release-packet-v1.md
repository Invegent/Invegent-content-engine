# S9 — NDIS **LinkedIn** Containment Release · Gate-1 evidence packet

**Created:** 2026-07-30 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Criteria:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §5 (order — **FB ✅ v6.70 → IG ✅ v6.73 → LI (this) → YT last**)
**Status:** **EVIDENCE COMPLETE — awaiting PK release decision. Nothing changed; LinkedIn is still paused.**

---

## 0. The proposed act

```sql
UPDATE c.client_publish_profile
   SET paused_until = NULL, updated_at = now()
 WHERE client_publish_profile_id = '198f7328-2c3b-4110-9585-ef8fa692049e';
-- ndis-yarns · linkedin · currently paused_until = 2027-01-01 00:00:00+00
```
**Rollback:** restore `2027-01-01`. One column, instant, no code change. YouTube (`e2261899…`) stays paused.

---

## 1. ⭐ The question this pass existed to answer — ANSWERED

The v6.71 dashboard lane surfaced that **LinkedIn `text` has no selectable template**, and NDIS LinkedIn
`text` is **71 publishes/90d — the single largest cell in the entire containment**. If it were *not*
exempt, releasing LinkedIn would stop NDIS's biggest publishing cell. I refused to carry Facebook's
result across by assumption. Measured directly:

```
classify_format_capability('ndis-yarns','linkedin','text')
  status                    = unsupported_silent_degrade
  reason_code               = format_unmapped
is_capability_exempt_format('text')                     = true      (render_engine='none')
status ∈ {template_missing, unsupported_silent_degrade} = true      (carve-out eligible)
  => OUTCOME = WOULD PROCEED
```

**`text` rides the template-less carve-out on LinkedIn, exactly as on Facebook.** Both conditions of the
narrowed carve-out are satisfied — the format is exempt AND the status is in the eligible class. The
71-publish cell is safe.

**Proven, not merely computed** — see §3(b): five *real scheduled* LinkedIn `text` slots were driven
through the **live** Layer-1 gate and produced **`capability_skips = 0`**.

## 2. LinkedIn's reachable palette

| format | reachable via | classifier | exempt | pub/90d | after release |
|---|---|---|---|---|---|
| `text` | Advisor palette | `unsupported_silent_degrade` / `format_unmapped` | ✅ | **71** | ✅ **restored** (carve-out) |
| `image_quote` | Advisor palette | **`ready`** | – | **8** | ✅ **restored** |
| `carousel` | not in palette (`platform_support.linkedin=false`); reached historically | `unsupported_silent_degrade` / `no_selectable_template` | ✗ | 1 | ⛔ stays stopped |
| `video_short_avatar` | A2 override (client config disables it) | `unsupported_silent_degrade` / `format_unmapped` | ✗ | 1 | ⛔ stays stopped |

**79 of the last 81 LinkedIn publishes (97.5%) come back; 2 do not.** This is the cleanest of the three
releases so far — Facebook restored 70/77 (91%), Instagram 27/34 (79%).

**Scheduled demand is entirely healthy — zero blocking slots:**
`(none)` ×11 → `image_quote` (ready) · `text` ×6 (exempt) · `image_quote` ×2 (ready).
So unlike Instagram (12 slots to be capability-skipped), LinkedIn has **no scheduled slot that will be
capability-blocked**.

## 3. Proofs — live, aborted transactions

**(a) Publisher boundary — again via the harder post-enqueue path.** The blocked draft was enqueued
**while healthy**, then blocked **after** it was in the queue (the legacy-data / manual-mutation / race
case), scheduled **earlier** so it would otherwise have won:

```
blocked_dequeued   = 0     <- must be 0   ✅
ready_dequeued     = 1     <- expect 1    ✅   (a `text` draft)
locked = 1 · all_locked_healthy = true · blocked_row_status = queued (retained)
```

**(b) THE KEY LEG — real scheduled `text` slots through the live Layer-1 gate:**

```
capability_skips = 0     <- MUST be 0     ✅
```

The five slots did skip, but for `bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen` —
the **content-pool / synthesis policy** (`text` uses a 2-source bundle), *not* capability. Confirmed a
**test artifact**, not a finding: I forced five slots due simultaneously so they competed for the same
signal pool. In real operation over the last 30 days LinkedIn shows **zero** `bundle_diversity` skips
(`pool_thin;no_eligible_evergreen` ×11, `publish_path_disabled` ×6, one `compliance_skip`) and
**20 slots filled**. LinkedIn fill works normally.

## 4. LinkedIn-specific mechanics (differ from FB/IG — verified, not assumed)

- The **active** publisher is `linkedin-zapier-publisher`, which calls `m.publisher_lock_queue_v2`
  **directly** (`index.ts:115`), not through the `v1` wrapper that Facebook and Instagram use. It
  inherits the same S9 dequeue guard either way — proven in §3(a) against `p_platform='linkedin'`.
- `linkedin-publisher` remains **undeployed dead code** (re-verified against `list_edge_functions` in the
  v6.68 lane) despite also calling `v2`.
- Throttles: `min_gap_minutes=240`, **`max_per_day=2` (by design)**, `max_queued_per_platform=6`,
  destination `urn:li:organization:112982689`. The lower daily cap means restored volume ramps more
  slowly than Facebook's.

## 5. §5 criteria — LinkedIn

| # | Criterion | Status |
|---|---|---|
| 1 | Classifier durable record | ✅ v6.46 |
| 2 | Enforcement live for this platform | ✅ resolver L1+L2 (v6.58) + publisher chokepoint (v6.68); LinkedIn dequeues via `v2` **directly** |
| 3 | Non-Ready LI cells re-verified closed | ✅ §2 — `carousel` + `video_short_avatar` block |
| 4 | Backtest with pause lifted | ✅ §3(a), post-enqueue race path |
| 5 | Zero regression on Ready/exempt steady state | ✅ §3(b) — `text` passes the gate (`capability_skips=0`); `image_quote` is `ready` |
| 6 | Standard chain clean | ✅ inherited from both enforcement builds |
| 7 | Durable rollback proven | ✅ one-column UPDATE |
| 8 | Go-forward signal readable | ✅ §7 |
| 9 | YouTube-specific | n/a |

## 6. Risk

| Risk | Assessment |
|---|---|
| The 71-publish `text` cell stops | **Closed** — proven exempt AND proven `capability_skips=0` on real slots |
| A blocked draft publishes | **Closed** — §3(a), including the post-enqueue race case |
| Ready content stops | **No** — `image_quote` is `ready`; zero blocking slots scheduled |
| Blast radius if wrong | One client, one platform; rollback is one column |

**Residual:** `wordpress-publisher` stays outside enforcement (PK ruling 2); NDIS unreachable on it. The
standing claim is "the four named platforms", never "every publish path".

## 7. Monitoring after release

```sql
-- expect text + image_quote ONLY. carousel or video_short_avatar here = enforcement failed -> re-pause
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='linkedin'
   AND pp.status='published' AND pp.published_at >= now() - interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- TRIPWIRE: any capability_blocked:*:text row anywhere = the carve-out has failed
SELECT platform, skip_reason, count(*) FROM m.slot
 WHERE skip_reason LIKE 'capability_blocked:%:text' GROUP BY 1,2;
```

## 8. Recommendation

**Release LinkedIn.** All eight applicable criteria are met with live evidence. The one genuine risk —
that the 71-publish `text` cell would stop — is closed by direct measurement *and* by driving real
scheduled slots through the live gate. Releasing restores **97.5%** of LinkedIn's pre-containment
publishing and leaves only two single-publish gap cells stopped, with no scheduled slot affected.

**What I need from PK:** (a) authorisation to run the §0 UPDATE, and (b) acceptance that LinkedIn
`carousel` (1/90d) and `video_short_avatar` (1/90d) stay stopped.

**Then YouTube — last, and the hardest.** It additionally carries §5 criterion 9: both entry paths proven
fail-closed (built + deployed v6.68, and `deploy-verifier` confirmed exactly two predicate occurrences in
the live bundle) **plus** the still-open fail-open `paused_until` preload (`try{}catch(_){}` in
`youtube-publisher`), which the architecture named as a co-requirement for YouTube's release
specifically. YouTube is also the platform whose original incident (`video_short_avatar`, 54 publishes/90d)
started this whole arc.
