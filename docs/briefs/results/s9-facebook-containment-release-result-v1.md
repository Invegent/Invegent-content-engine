# Result — NDIS **Facebook** containment release (S9 §5, platform 1 of 4)

**CLAIMED v6.70 · s9-fb-containment-release · s9-fb-release · release-applied · 2026-07-29T10:04:20.885Z**

**Date:** 2026-07-29 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Packet:** `docs/briefs/s9-facebook-containment-release-packet-v1.md`
**Criteria:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §5 (PK ruling 4 order)
**Outcome:** ✅ **FACEBOOK RELEASED.** Instagram, LinkedIn, YouTube **remain paused**.

---

## 1. What changed — one row, one column

```
c.client_publish_profile d469a8f3-775b-41e1-b6d8-77b6c8947f99  (ndis-yarns · facebook)
  paused_until : 2027-01-01 00:00:00+00  ->  NULL (RELEASED)
```

**Post-release state, verified:**

| platform | paused_until |
|---|---|
| **facebook** | **NULL (RELEASED)** |
| instagram | 2027-01-01 00:00:00+00 |
| linkedin | 2027-01-01 00:00:00+00 |
| youtube | 2027-01-01 00:00:00+00 |

**PK ruling recorded:** release authorised, and **carousel stopping accepted** — those occasions are
terminal under ruling 1 and are not replayed.

## 2. The apply was self-verifying — three STOPs, all inside the transaction

1. **Enforcement identity** — all five live objects asserted against their proven values before the
   update; any drift would have aborted:
   `publisher_lock_queue_v2 bd265650…` · `gate_queue_on_asset_status 1dbfe725…` ·
   `auto_approver_fetch_drafts 2e64247e…` · `fill_pending_slots b56bbd30…` · cron 48 `faca2e87…`
2. **Target row state** — `paused_until` had to be exactly `2027-01-01 00:00:00+00`.
3. **Blast containment** — `ROW_COUNT = 1` enforced, and the other three NDIS platforms re-asserted
   still paused *after* the update.

## 3. Prediction, then verification

Stated **before** applying: exactly one NDIS Facebook row was queued — `c9737aaa`, `image_quote`,
approved, classifier `ready`, due since 2026-07-28 22:00 — so the release would let **one healthy
`image_quote` post** publish, and **no** carousel row was queued, so carousel blocking would only
manifest later.

Verified **after** applying, read-only (deliberately **not** calling `publisher_lock_queue_v2`, which
would lock rows and force an out-of-band publish — the eligibility predicate was replicated as a plain
SELECT instead):

```
queue c9737aaa · image_quote · final_format_authority=advisor
  st_ok=t  due_ok=t  pub_ok=t  not_paused=t  s9_capability_ok=t
  verdict = ELIGIBLE — will publish
```

`s9_capability_ok = true` is the S9 dequeue guard passing a healthy draft — enforcement present and
correctly *not* interfering. Prediction matched exactly.

## 4. What Facebook looks like from here

NDIS Facebook's reachable Advisor palette is exactly three formats
(`platform_support.facebook = true` **AND** `c.client_format_config` enabled):

| format | verdict | published/90d | behaviour now |
|---|---|---|---|
| `image_quote` | `ready` | 49 | publishes |
| `text` | `unsupported_silent_degrade` → **exempt** (template-less carve-out) | 21 | publishes |
| `carousel` | `unsupported_silent_degrade` / `no_selectable_template` | 7 | **blocked** |

70 of the last 77 Facebook publishes are unaffected. The single behavioural change is carousel stopping —
the intended enforcement, and the reason the pause existed.

## 5. Monitoring (criterion 8)

```sql
-- expect image_quote + text only; carousel here = enforcement FAILED -> re-pause immediately
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='facebook'
   AND pp.status='published' AND pp.published_at >= now() - interval '7 days'
 GROUP BY 1 ORDER BY 2 DESC;

-- blocked drafts appearing (expect carousel to start showing here)
SELECT final_format_authority, final_format_reason, count(*)
  FROM m.post_draft WHERE final_format_authority='blocked_by_capability' GROUP BY 1,2;

-- capability skips at schedule-fill
SELECT skip_reason, count(*) FROM m.slot WHERE skip_reason LIKE 'capability_blocked:%' GROUP BY 1;
```

## 6. Rollback

```sql
UPDATE c.client_publish_profile SET paused_until = '2027-01-01 00:00:00+00', updated_at = now()
 WHERE client_publish_profile_id = 'd469a8f3-775b-41e1-b6d8-77b6c8947f99';
```
Instant, total, no code change, blast radius one client + one platform. The enforcement layers stay live
either way — re-pausing does not un-deploy anything.

## 7. Carries

1. **Recorded caveat:** `classify_format_capability` does **not** consult `platform_support`, so a
   `ready` verdict does not imply the format is *reachable*. `video_short_stat` classifies `ready` for
   ndis-yarns/facebook (with `select_template` warnings `platform_suitability_unproven` and
   `platform_scope_unbacked`) but is unreachable because `platform_support.facebook = false` and
   `ai-worker` filters the palette on exactly that. Harmless today; would matter if that filter loosened.
2. **NDIS Facebook carousel is now unmet demand** — route `template_creatomate_heygen`. Closing it is a
   separate lane; until then those occasions are terminal.
3. `wordpress-publisher` remains outside enforcement (PK ruling 2). NDIS is unreachable on it (all three
   `c.client.profile` gate keys NULL), so it is not a Facebook risk — but the standing claim is
   "the four named platforms", never "every publish path".
4. **Service-role key rotation is in progress on PK's side** — unrelated to this release, but note the
   publishers read `SUPABASE_SERVICE_ROLE_KEY`; if the old key is revoked before the EF secret is
   updated and the functions redeployed, publishing stops until it is.

## 8. Next

**Instagram** is next in the fixed order (FB → IG → LI → **YT last**). It needs its own evidence pass —
its `carousel` is its own silent-degrade cell, and its palette must be re-derived rather than assumed
from Facebook's. YouTube additionally carries §5 criterion 9 (both entry paths proven fail-closed — now
built and deployed — plus the fail-open `paused_until` preload item).
