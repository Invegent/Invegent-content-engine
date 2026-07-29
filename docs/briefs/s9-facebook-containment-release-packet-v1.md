# S9 — NDIS Facebook Containment Release · Gate-1 evidence packet

**Created:** 2026-07-29 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Governing criteria:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §5 (PK ruling 4 — release order **Facebook → Instagram → LinkedIn → YouTube last**, each platform independently)
**Status:** **EVIDENCE COMPLETE — awaiting PK release decision. Nothing changed; the pause is still live.**

---

## 0. The proposed act (one row, one column)

```sql
UPDATE c.client_publish_profile
   SET paused_until = NULL, updated_at = now()
 WHERE client_publish_profile_id = 'd469a8f3-775b-41e1-b6d8-77b6c8947f99';
-- ndis-yarns · facebook · currently paused_until = 2027-01-01 00:00:00+00
```

**Rollback:** set `paused_until` back to `2027-01-01 00:00:00+00` on the same row. Instant, total, and
independent of the enforcement code (which stays live either way).

**The other three platforms are untouched** and remain `paused_until = 2027-01-01`:
instagram `3827af5c…` · linkedin `198f7328…` · youtube `e2261899…`.

---

## 1. §5 release criteria — Facebook

| # | Criterion | Status |
|---|---|---|
| 1 | Classifier durable record | ✅ committed + byte-verified (v6.46) |
| 2 | **This platform's enforcement live** | ✅ resolver Layers 1+2 (v6.58) **and** publisher chokepoint (v6.68) — for Facebook that is the shared `m.publisher_lock_queue_v2` predicate, inherited via the pure `v1` wrapper, plus the enqueue trigger, cron-48 filter and auto-approver guard |
| 3 | Non-Ready NDIS Facebook cells re-verified closed | ✅ §2 — `carousel` blocks; 6 video formats block |
| 4 | Live backtest, pause lifted, non-Ready still ineligible | ✅ §3 — `blocked_draft_dequeued = 0` |
| 5 | Zero regression on governed-Ready steady state | ✅ §3 — `image_quote` dequeued normally; `text` proceeds via the carve-out |
| 6 | Standard chain clean on the enforcement diffs | ✅ both builds: `db-rls-auditor` + `branch-warden` + external review + PK gate + `deploy-verifier` |
| 7 | Durable rollback path, proven | ✅ both lanes proven; **and this release's own rollback is a one-column UPDATE** |
| 8 | Go-forward signal for `blocked_by_capability`, live-readable | ✅ §5 |
| 9 | YouTube-specific extras | n/a — YouTube is last and not in scope here |

## 2. What actually changes for NDIS Facebook

The Advisor's palette for this client+platform is decided by
`t."5.3_content_format".platform_support->>'facebook' = 'true'` **AND** `c.client_format_config`.
Applying both filters, NDIS Facebook has **exactly three reachable formats**:

| format | classifier | exempt | outcome after release | published/90d |
|---|---|---|---|---|
| `image_quote` | `ready` | – | **proceeds** | **49** |
| `text` | `unsupported_silent_degrade` | ✅ template-less carve-out | **proceeds** | **21** |
| `carousel` | `unsupported_silent_degrade` (`no_selectable_template`) | ✗ | **BLOCKS** | **7** |

**So the entire behavioural change of releasing Facebook is: `carousel` stops.** That is the intended
enforcement — it is a genuine silent-degrade cell (no selectable template, yet 7 publishes in 90 days),
i.e. exactly the class this whole arc exists to close. `image_quote` (49) and `text` (21) — 70 of the
last 90 days' 77 Facebook publishes — are unaffected.

**Product consequence to accept explicitly:** NDIS Facebook carousel content stops until the underlying
gap is closed (its route is `template_creatomate_heygen`). Under PK ruling 1 those occasions are
terminal — they are not replayed later.

### 2.1 A `ready` classification that is NOT reachable — recorded, not a risk

`video_short_stat` classifies **`ready`** for ndis-yarns/facebook (real PK-approved template
`a3d8472d`, visual proof passed 2026-07-20, assets resolve). It has **zero** Facebook publish history,
which looked like a new-exposure risk on release.

It is not: **`platform_support.facebook = false`** for that format, and `ai-worker` filters the palette
with `if (s[platform] !== true) continue`, so the Advisor can never select it on Facebook.

Worth recording as a standing caveat: **`classify_format_capability` does not consult `platform_support`,
so a `ready` verdict does not imply the format is reachable on that platform.** `select_template` itself
returned two warnings here — `platform_suitability_unproven` and `platform_scope_unbacked` — which the
classifier does not surface as a non-ready status. Harmless today because the palette filter is stricter;
it would matter if that filter were ever loosened.

## 3. Release backtest (live, aborted transaction — nothing persisted)

Simulated the release by setting `paused_until = NULL` for NDIS Facebook, then drove the real
`m.publisher_lock_queue_v2(20, …, 'facebook')` against a capability-blocked draft and a healthy one:

```
paused_until = NULL (released)
blocked_draft_dequeued = 0   <- MUST be 0   ✅
ready_draft_dequeued   = 1   <- expect 1    ✅
total_locked           = 1
```

The blocked row was scheduled **earlier** than the healthy one, so absent the guard it would have been
picked first. This is criteria 4 and 5 in a single proof, against the **live applied** enforcement.

## 4. Risk assessment

| Risk | Assessment |
|---|---|
| A blocked draft publishes after release | **Closed** — proven above, at the live dequeue boundary, with the pause lifted |
| Healthy content stops | **No** — `image_quote` + `text` proven to flow; they are 70 of the last 77 publishes |
| Enqueue contamination | **Closed** — enqueue trigger + cron-48 filter (v6.68) |
| Auto-approver revives a blocked draft | **Closed** — guarded before it can set `approved` |
| YouTube's schedule-blind path leaks | **n/a** — YouTube stays paused; its own edits are live but its release is last and carries extra criteria |
| Blast radius if wrong | **One client, one platform.** Rollback is a single-column UPDATE, instant, no code change |

**Residual, disclosed:** `wordpress-publisher` is deployed and direct-reads `m.post_draft`, and is
excluded from enforcement by PK ruling 2. NDIS-Yarns is confirmed unreachable on it (all three
`c.client.profile` gate keys NULL), so it is not a Facebook-release risk — but the enforcement claim
remains "the four named platforms", not "every publish path".

## 5. Go-forward monitoring (criterion 8)

```sql
-- blocked drafts, by reason
SELECT final_format_authority, final_format_reason, count(*)
  FROM m.post_draft WHERE final_format_authority='blocked_by_capability' GROUP BY 1,2;

-- capability skips at schedule-fill
SELECT skip_reason, count(*) FROM m.slot
 WHERE skip_reason LIKE 'capability_blocked:%' GROUP BY 1 ORDER BY 2 DESC;

-- NDIS Facebook publishes since release (expect image_quote + text only, never carousel)
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='facebook'
   AND pp.status='published' AND pp.published_at >= now() - interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- TRIPWIRE: any carousel publish after release means enforcement failed -> re-pause immediately
```

## 6. Recommendation

**Release Facebook.** All eight applicable §5 criteria are met with live evidence; the only behavioural
change is that `carousel` stops, which is the intended enforcement outcome and the reason the pause
existed; and the rollback is a single-column UPDATE with no code involvement.

**What I need from PK:** (a) authorisation to run the §0 UPDATE, and (b) explicit acceptance that NDIS
Facebook carousel stops and those occasions are terminal (PK ruling 1).

**Not in this packet:** Instagram, LinkedIn and YouTube remain paused. Each needs its own evidence pass;
Instagram's `carousel` is its own silent-degrade cell and YouTube additionally carries the fail-open
`paused_until` preload item (§5 criterion 9).
