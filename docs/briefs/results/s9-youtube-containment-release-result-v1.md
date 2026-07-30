# Result — NDIS **YouTube** containment release (S9 §5, platform 4 of 4, LAST)

**CLAIMED v6.85 · s9-yt-containment-release · s9-yt-failclosed · release-applied · 2026-07-30T09:44:32Z**

**Date:** 2026-07-30 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Packet:** `docs/briefs/s9-youtube-containment-release-packet-v1.md`
**Outcome:** ✅ **YOUTUBE RELEASED — the S9 containment arc is complete on all four platforms.**
**Verification method:** the registered `deploy-verifier` subagent could not be launched after
repeated attempts (tool-launch failures, not a code/deploy problem). Per PK's explicit fallback
instruction, verification was performed **directly** against the same live ground truth
(`get_edge_function` + source-level inspection) using the identical checks the subagent would have
run. Recorded here as directed.

---

## 1. What changed

```
c.client_publish_profile e2261899-7a02-4a48-a364-79544791424a  (ndis-yarns · youtube)
  paused_until : 2027-01-01 00:00:00+00  ->  NULL (RELEASED)
```

| platform | state |
|---|---|
| facebook | RELEASED (v6.70) |
| instagram | RELEASED (v6.73) |
| linkedin | RELEASED (v6.77) |
| **youtube** | **RELEASED (this lane, v6.85)** — **all four platforms now released** |

**PK ruling 1 (recorded):** `pause_profile_missing` stays fail-closed. A YouTube client with no
`client_publish_profile` row must not publish automatically — that row carries both the pause
control and the publishing throttle config, so its absence means onboarding is incomplete, not
permission to continue. Live census at decision time: 4 clients total, 2 have ever produced YouTube
drafts, both hold a profile + credentials, zero regression.

**PK ruling 2 (recorded):** release despite 0% currently-reachable formats. The purpose of this
release was never to restore historical volume — it replaces a blanket platform pause with truthful
per-format enforcement. Correct post-release state: containment released, zero currently supported
production formats, unsupported demand stays capability-blocked. **Do not describe YouTube as
publishing-operational until Creatomate Global supplies at least one supported, selector-reachable
format** — carried forward as the standing caveat on this release.

## 2. Direct deploy verification (deploy-verifier unavailable — approved fallback used)

Read live via `get_edge_function` (project `mbkmaxqhsohbtwsqolns`, slug `youtube-publisher`), the
deployed bundle parsed and hashed directly rather than trusted as "looks right":

| check | result |
|---|---|
| `verify_jwt` (live config) | **`false`** ✅ |
| deployed platform version | `65`, `status=ACTIVE`, `updated_at=2026-07-30T05:34:58Z` |
| `VERSION` constant in deployed source | **`youtube-publisher-v1.17.0`** ✅ |
| deployed bundle **sha256** (CRLF-normalised) | `47ccc629…` — **byte-identical** to `git show HEAD:supabase/functions/youtube-publisher/index.ts` at commit `d1229f5` (the reviewed artifact). Zero drift — refutes the bundles-from-CWD "old code shipped" trap directly. |
| `youtube-publisher-s9-failclosed-pause-gate` marker | present ×3 |
| `youtube-publisher-s9-capability-enforcement` marker (prior, must be retained) | present ×3 |
| capability predicate `final_format_authority.is.null,final_format_authority.neq` | **exactly 2** (SELECT line 452 · atomic claim line 608) |
| `pausedUntil` (old fail-open hold map) | **0 occurrences** — confirmed removed |
| `buildPauseGate` / `pauseVerdictFor` | present (4 / 3 occurrences) |
| deny-reason strings (`pause_profile_missing`, `pause_preload_read_error`, `pause_gate_absent`, `channel_paused_until`) | all present |
| `exec_sql` occurrences | 2 — **verified pre-existing and unrelated**: `git diff d1229f5^..d1229f5` touches zero `exec_sql` lines. Both sites (OAuth-token client lookup, content-vertical lookup) predate this change; this diff introduced none. |

**Verdict: PASS**, evidenced from live ground truth, not inference.

## 3. A material check this lane did NOT skip: the stale-queue false alarm

While proving no leakage, ten `queued` rows for `ndis-yarns`/`youtube` were found sitting in
`m.post_publish_queue` since May–June 2026 with `final_format_authority = NULL`, all mapping to
`video_short_avatar` drafts. On sight this looked like a real release risk — a stamp-less backlog
that could slip through the moment the pause lifted.

**Traced to source before drawing any conclusion:** `youtube-publisher` never reads
`m.post_publish_queue` at all (confirmed: zero occurrences in the deployed bundle). It selects
directly from `m.post_draft` filtered on `video_status = 'generated'` — and every one of those ten
underlying drafts already has `video_status IN ('published','failed')`. The queue rows are inert,
orphaned data from a superseded architecture; this publisher was never going to consume them,
pause or no pause. **Confirmed false alarm, not a finding** — recorded so a future session doesn't
re-discover the same dead end.

## 4. Both entry paths — proven live, not just unit-tested

Per §5 of the packet (P1–P8). P5 (pause-read failure) stays proven hermetically — inducing a live
PostgREST failure against production is not something to do for a proof. Everything provable live
was proven live, in **two separate aborted transactions** (`BEGIN…ROLLBACK`), using synthetic
`ndis-yarns` rows built to the SELECT's exact real preconditions, differing only in
`final_format_authority`:

**Transaction 1 — SELECT-path replica** (packet §5 P1, P7):
```
inserted: blocked row (final_format_authority='blocked_by_capability'), healthy row (NULL)
replica SELECT (index.ts:443-453) against just these two rows
  -> returned EXACTLY the healthy row. Blocked row excluded.
ROLLBACK.
```

**Transaction 2 — atomic-claim replica** (packet §5 P2, P7, P8):
```
same two synthetic rows, fresh transaction
replica claim UPDATE (index.ts:598-610) run against the blocked row -> 0 rows, claimed_at stayed NULL
replica claim UPDATE run against the healthy row               -> 1 row,  claimed_at stamped
ROLLBACK.
```

Both transactions rolled back — no real or synthetic row survives; nothing outside the two throwaway
UUIDs was touched.

**P6 (Ready draft, unpaused client) — proven against REAL live data, not synthetic:** exactly one
draft in the whole system currently matches the publisher's SELECT: `4f877c79…`, **property-pulse**,
`video_short_kinetic_voice`, `final_format_authority='advisor'`, generated, approved,
`scheduled_for` in the past, no `youtube_video_id` yet. property-pulse's `youtube`
`client_publish_profile` has `paused_until = NULL`. This draft is untouched by both the capability
predicate (not blocked) and the pause gate (profile exists, not paused) — **the live P6 + PP-regression
proof are the same fact, verified once.**

**P3/P4 (paused-client gate) — proven inherently by the release itself:** before the apply,
`ndis-yarns`/`youtube` carried an ACTIVE pause (`2027-01-01`); the fail-closed gate correctly denied it
every tick for the length of the containment (this was true even under the OLD fail-open code, since a
*successful* read of an active future pause was never the bug — only a *failed* read was). The fix
changes behaviour on read failure/missing profile, not on a successful active-pause read.

## 5. Release backtest against REAL live data — zero leak, confirmed post-apply

Before applying, the exact live SELECT predicate was run against real `ndis-yarns` data: **zero rows**
— no NDIS draft currently satisfies the publisher's eligibility criteria, at all, for any format.
This is the honest, verified basis for "restores nothing."

## 6. Self-verifying release apply

Executed as a single `DO $$ … $$` block, `RAISE EXCEPTION` (hard abort) on any failed assertion:

- Four enforcement identities re-verified unchanged immediately before mutating:
  `fill_pending_slots b56bbd30…` · `gate_queue_on_asset_status 1dbfe725…` ·
  `auto_approver_fetch_drafts 2e64247e…` · `publisher_lock_queue_v2 bd265650…`
- Target row's prior `paused_until` asserted **exactly** `2027-01-01 00:00:00+00`
- `UPDATE … WHERE paused_until = '2027-01-01…'` — `ROW_COUNT` asserted `= 1`
- **After** the update: Facebook/Instagram/LinkedIn re-asserted still `paused_until IS NULL`
  (a drift here would mean an unrelated mutation had occurred — it did not)

All STOPs cleared; the release applied. Post-apply row read confirms all **four** NDIS platforms now
`paused_until = NULL`, with FB/IG/LI's `updated_at` timestamps unchanged from their own prior releases
(`2026-07-29 10:03:28` / `19:21:51` / `23:12:31`) — proof nothing but the YouTube row was touched.

## 7. Post-release confirmation — the palette, re-verified against live data after the apply

Re-ran the exact publisher SELECT against real `ndis-yarns` YouTube data **after** the pause was
lifted: **zero rows returned.** No immediate publish is possible — confirms the packet's palette
derivation (§2) held after, not just before, the apply:

| format | classifier status | pub/90d | now |
|---|---|---|---|
| `video_short_avatar` | `unsupported_silent_degrade` (`format_unmapped`) | 54 | ⛔ capability-blocked |
| `video_short_kinetic_voice` | `unsupported_silent_degrade` | 5 | ⛔ capability-blocked |
| `video_short_kinetic` | `unsupported_silent_degrade` | 3 | ⛔ capability-blocked |
| `video_short_stat` | `unsupported_silent_degrade` (`no_selectable_template`) | 3 | ⛔ capability-blocked |
| `video_short_stat_voice` | `unsupported_silent_degrade` | 3 | ⛔ capability-blocked |
| `text` / `image_quote` | not platform-declared on YouTube | 0 | not reachable (carve-out plays no part here, unlike LinkedIn) |

**68 of 68 (100%) of historical NDIS YouTube publishes were in now-blocked formats — 0% restored.**
This is the release PK explicitly authorised in those terms: containment lifted, truthful per-format
enforcement live, zero silent degrade possible, zero volume restored until Creatomate Global ships a
supported YouTube format.

**No `video_short_avatar` publish occurred or can occur under current data** — confirmed both by the
live SELECT returning zero rows and by `video_short_avatar` carrying `client_format_config.enabled =
false` (it only ever reached YouTube via the A2 override, and capability blocks that route too).

**Next observable event (not yet reached in this session):** the earliest genuinely upcoming YouTube
slot is `video_short_kinetic_voice` at `2026-08-01 01:30 UTC`, followed by `video_short_avatar` at
`2026-08-01 09:00 UTC` — both will produce a Layer-1 `capability_blocked:unsupported_silent_degrade:*`
slot-skip on the ordinary schedule, not a publish. Monitoring query below watches for either outcome.

## 8. Monitoring

```sql
-- expect ZERO rows until Creatomate Global ships a supported YouTube format
SELECT pd.recommended_format, count(*), max(pp.published_at)
  FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='youtube'
   AND pp.status='published' AND pp.published_at >= now()-interval '1 day'
 GROUP BY 1;

-- TRIPWIRE: any video_short_avatar publish on YouTube post-release = the silent-degrade defect returned
SELECT pd.post_draft_id, pp.published_at FROM m.post_publish pp
  JOIN m.post_draft pd ON pd.post_draft_id=pp.post_draft_id
 WHERE pp.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND pp.platform='youtube'
   AND pd.recommended_format='video_short_avatar' AND pp.published_at > '2026-07-30 09:44:32+00';

-- expect ONLY capability_blocked:*, never a fallback substitution
SELECT skip_reason, count(*) FROM m.slot
 WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='youtube'
   AND status='skipped' AND scheduled_publish_at > '2026-07-30 09:44:32+00'
 GROUP BY 1;
```

## 9. Rollback

```sql
UPDATE c.client_publish_profile SET paused_until='2027-01-01 00:00:00+00', updated_at=now()
 WHERE client_publish_profile_id='e2261899-7a02-4a48-a364-79544791424a';
```
One column, instant, no code change. The v1.17.0 enforcement code stays live either way (rolling back
the pause does not require rolling back the fail-closed gate — they are independent).

## 10. Standing carries (unchanged by this lane)

- **Service-role key rotation** — still outstanding on PK's side. Publishers read
  `SUPABASE_SERVICE_ROLE_KEY`; revoking the old key before the EF secret is updated **and** the
  functions redeployed would stop publishing on all four now-released platforms.
- **Pre-claim pause check is a fresh read, not a joined predicate** — narrows but does not
  mathematically close the claim-round-trip window (packet §1a). Recorded as a carry, not silently
  claimed as atomic.
- **YouTube is not publishing-operational** until Creatomate Global supplies at least one supported,
  selector-reachable YouTube format. Do not report otherwise.

## 11. S9 arc — closed

All four platforms released: Facebook 91% restored, Instagram 79%, LinkedIn 97.5%, **YouTube 0%
(by design, disclosed and accepted)**. Publisher enforcement + fail-closed capability gates live on
every platform. Both YouTube entry paths proven live. No silent-degrade path remains open on any
released platform.
