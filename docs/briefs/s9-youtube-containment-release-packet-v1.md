# S9 — NDIS **YouTube** containment release + fail-closed pause gate (T3 apply/deploy packet)

**CLAIMED v6.82 · s9-yt-containment-release · s9-yt-failclosed · gate-2-authorised · 2026-07-30**

> Renumbered v6.81 → v6.82: `fedc3e6 docs(v6.81) Announcement Card Template Repair` landed on
> `origin/main` from a concurrent session first, so per the CCF-02 claim protocol the earlier
> claimant keeps the number and this lane renumbers.

**Tier:** T3 · **Lane class:** SAFETY_GATE
**Governing packet:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §5 (criterion 9)
**Code commit:** `1eaaccf` on `lane/s9-yt-failclosed`, rebased onto `origin/main` `8ea2456`
**PK Gate-2:** AUTHORISED — "Deploy the fail-closed pause preload, prove both entry paths, and release
NDIS YouTube into capability-controlled operation. YouTube released from blanket containment; no
supported formats currently available."

This is platform **4 of 4** and the last outcome of the S9 arc. It differs from the previous three
releases in one decisive respect, disclosed to PK before authorisation and accepted: **it restores no
publishing volume at all.**

---

## 1. Two coupled changes

### 1a. Code — `youtube-publisher` v1.16.0 → **v1.17.0** (EF deploy)

Marker `youtube-publisher-s9-failclosed-pause-gate`.

The architecture named the fail-open `paused_until` preload an explicit **co-requirement** for
YouTube's release specifically — not a disclosure to carry — because the YouTube hold *is*
`paused_until`, so a failed read of it is exactly what would let a paused channel publish.

**The flaw was worse than documented.** v1.8.0 read:

```ts
try {
  const { data: profs } = await supabase.schema('c').from('client_publish_profile')
    .select('client_id, paused_until').eq('platform','youtube').in('client_id', ids);
  for (const p of profs ?? []) { /* build hold map */ }
} catch (_) { /* best effort */ }
```

It never destructured `error`. A PostgREST failure returns `{ data: null, error }` **without
throwing**, so the `catch` never fires. The result is an empty hold map — and an empty map reads as
*nobody is paused*. The containment column could fail silently open.

Replaced with `buildPauseGate` / `pauseVerdictFor`. **A successful read plus no active pause is the
only allow.** Every other outcome denies, with a structured reason and a `retryable` flag:

| condition | reason | retryable |
|---|---|---|
| `error` returned without throwing | `pause_preload_read_error:*` | true |
| any throw at any chain stage | `pause_preload_threw:*` | true |
| payload not an array | `pause_preload_unrecognised_payload` | true |
| no profile row for the client | `pause_profile_missing` | **false** (needs configuration, not a retry) |
| `paused_until` unparseable | `pause_unparseable:*` | false |
| active pause | `channel_paused_until:<iso>` | false |
| client never resolved by the gate | `pause_gate_absent` | false |

Applied at **both** YouTube entry paths: the tick-level check after selection, and a **fresh re-read
immediately before the atomic pre-upload claim**. Nothing is consumed, approved, or uploaded on a
preload failure.

**Scope stated honestly, not overclaimed.** The capability predicate sits INSIDE the atomic claim
`UPDATE` and is genuinely atomic. The pause lives on `c.client_publish_profile`, which a PostgREST
`UPDATE` on `m.post_draft` cannot join — so the pre-claim pause check is a fresh read taken
immediately prior. That narrows the window to the claim round-trip; it does **not** mathematically
eliminate it. Closing it fully needs a claim-and-check RPC. **Recorded as a carry, not claimed as
atomic.**

### 1b. DB — the release (1-row DML)

```sql
UPDATE c.client_publish_profile SET paused_until = NULL, updated_at = now()
 WHERE client_publish_profile_id = 'e2261899-7a02-4a48-a364-79544791424a';  -- ndis-yarns · youtube
```

No schema change, no new secret, no grant change, no function change.

---

## 2. The palette derivation — why this release restores nothing

PK required the reachable palette be derived from **seven** sources and explicitly forbade inferring
reachability from classifier status alone.

| format | scheduled | client cfg | `platform_support.youtube` | classifier | `select_template` | publisher allow-list | exempt | pub/90d |
|---|---|---|---|---|---|---|---|---|
| `video_short_avatar` | **14 future** | **false** | true | `unsupported_silent_degrade` (`format_unmapped`) | `fail_closed` | ✅ | ❌ | **54** |
| `video_short_kinetic_voice` | 4 future | true | true | `unsupported_silent_degrade` | `fail_closed` | ✅ | ❌ | 5 |
| `video_short_kinetic` | 0 | true | true | `unsupported_silent_degrade` | `fail_closed` | ✅ | ❌ | 3 |
| `video_short_stat` | 0 | true | true | `unsupported_silent_degrade` (`no_selectable_template`) | `fail_closed` | ✅ | ❌ | 3 |
| `video_short_stat_voice` | 0 | true | true | `unsupported_silent_degrade` | `fail_closed` | ✅ | ❌ | 3 |
| `text` | 0 | true | **null** | — | — | ❌ | ✅ | 0 |
| `image_quote` | 0 | true | **null** | — | — | ❌ | ✅ | 0 |

**54 + 5 + 3 + 3 + 3 = 68 = the exact 90-day NDIS YouTube publish total.** Every single NDIS YouTube
publish in the window was in a format that is now capability-blocked. Restored share: **0%**
(Facebook 91% · Instagram 79% · LinkedIn 97.5%).

Three specifics PK named:

- **`video_short_avatar` — blocked.** The arc's origin and the largest silent-degrade cell anywhere
  (54/90d, last published 2026-07-27). `client_format_config` has it **disabled**, so exactly as on
  Instagram it reaches YouTube via the **A2 override**, not the Advisor palette. Capability blocks it
  on either route.
- **`video_short_kinetic` — blocked.** 3/90d, no slots currently scheduled.
- **The `{text}` carve-out plays no part on YouTube.** `text` and `image_quote` are the only exempt
  formats and both have `platform_support.youtube = null`; neither is in the publisher's
  `ELIGIBLE_FORMATS`. Nothing rides the exemption onto YouTube — unlike LinkedIn, where `text` carried
  71 publishes.
- A further 11 scheduled slots (`video_long_explainer` 5, `video_long_podcast_clip` 5, `video_short` 1)
  are `is_buildable = false` — unreachable regardless of capability.

**So the release converts a blanket pause into honest, queryable per-format capability blocks and
closes the silent-degrade defect, while restoring no volume.** PK was shown this before authorising
and accepted it in those terms.

---

## 3. Regression surface checked BEFORE deploy

The publisher's SELECT is **not client-scoped** — it spans all clients — so the new
`pause_profile_missing` denial could in principle stop a different client.

- Clients publishing to YouTube in 90d: **property-pulse 106**, **ndis-yarns 68**. No others.
- **Both hold a `youtube` `client_publish_profile` row.** property-pulse `paused_until = NULL`.
- Currently eligible under the exact SELECT predicate, across all clients: **1 draft**, property-pulse,
  `video_short_kinetic_voice`, profile present, unpaused → gate returns `ok`.

⇒ `pause_profile_missing` is a real fail-closed guard with **zero current regression surface**.

**`m.post_publish_queue` is not this publisher's exposure.** `youtube-publisher` SELECTs `m.post_draft`
directly (index.ts:19) rather than the platform-tagged queue Facebook/Instagram use. The 10 `queued`
YouTube rows there are irrelevant to it — and are the reason this platform needed its own two
enforcement edits rather than inheriting the queue guard.

---

## 4. Ordered deploy sequence with STOPs

1. **Push `1eaaccf` to `origin/main`.** Mandatory *before* deploy — the drift gate hashes GitHub main,
   and the v6.54 DEPLOY-GATE LAW requires code on origin/main first.
   **STOP** if the push reveals unexpected commits in the `origin/main..HEAD` range.
2. **Refresh drift-check** before deploying (fresh-worktree gotcha).
3. **Deploy** `youtube-publisher` via `scripts/safe-deploy.sh --allow-warn`, **with
   `--no-verify-jwt`** — a bare deploy flips `verify_jwt` true and breaks `x-series-key` callers
   (401→502).
   **STOP** on any deploy error.
4. **`deploy-verifier`** on the live bundle: v1.17.0 VERSION · `youtube-publisher-s9-failclosed-pause-gate`
   marker present · `youtube-publisher-s9-capability-enforcement` marker retained · **exactly 2**
   capability-predicate occurrences · `verify_jwt` unchanged.
   **STOP** on `deploy_content_verdict = MISMATCH` (bundles-from-CWD "old code shipped" guard).
5. **Proofs, in aborted transactions** (§5).
   **STOP** if any proof fails or is inconclusive.
6. **Apply the release** with in-transaction assertions (§6).
   **STOP** on any assertion failure.
7. **Observe** the first capability block or healthy publish; confirm **no `video_short_avatar`
   publish**.

Rollback at every point after step 6 is one column (§7).

---

## 5. Required proofs — both entry paths

PK required both YouTube entry paths proven, for the full matrix, with no TOCTOU window before the
irreversible upload.

| # | case | path | expected |
|---|---|---|---|
| P1 | capability-blocked draft | SELECT | not returned |
| P2 | capability-blocked draft | atomic pre-claim | 0 rows claimed |
| P3 | paused client | tick-level gate | `skipped_channel_pause_gate` |
| P4 | paused client | pre-claim re-read | `skipped_channel_pause_gate_preclaim` |
| P5 | pause-read failure | both | deny every client, retryable, nothing uploaded |
| P6 | Ready draft, unpaused client | both | proceeds |
| P7 | `final_format_authority IS NULL` | SELECT + claim | remains eligible (the normal healthy state) |
| P8 | no TOCTOU | claim | predicate inside the atomic UPDATE; blocked-after-SELECT ⇒ 0 rows |

P5 is proven hermetically (13 tests) because a live PostgREST failure cannot be induced safely.
P1/P2/P7/P8 are proven live in aborted transactions. **`publisher_lock_queue_v2` is never called live**
— it locks rows and forces an out-of-band publish; the eligibility predicate is replicated read-only
instead.

---

## 6. Self-verifying release apply

Inside one transaction, `RAISE EXCEPTION` on any failure:

- All five enforcement identities unchanged: `publisher_lock_queue_v2 bd265650…` ·
  `gate_queue_on_asset_status 1dbfe725…` · `auto_approver_fetch_drafts 2e64247e…` ·
  `fill_pending_slots b56bbd30…` · cron 48 `faca2e87…`
- Target row's prior `paused_until` is **exactly** `2027-01-01 00:00:00+00`
- `ROW_COUNT = 1`
- **After** the update: Facebook, Instagram and LinkedIn re-asserted still released (`NULL`)
- Live deployed `youtube-publisher` VERSION is v1.17.0 (the release must not precede the gate)

## 7. Rollback

```sql
UPDATE c.client_publish_profile SET paused_until = '2027-01-01 00:00:00+00', updated_at = now()
 WHERE client_publish_profile_id = 'e2261899-7a02-4a48-a364-79544791424a';
```

One column, instant, no code change. The enforcement layers stay live either way. The code rollback
is a separate redeploy of v1.16.0 — but note that reverts the fail-open flaw, so the pause and the
gate should be restored together.

---

## 8. Review question

Is there a defect in the fail-closed gate, the deploy ordering, the release assertions, or the
seven-source palette derivation? Specifically:

1. Does denying on `pause_profile_missing` with `retryable = false` create an availability risk for a
   future client that has YouTube drafts but no `client_publish_profile` row — and is fail-closed still
   the right call there, given PK's standing ruling that unknown provenance must be held with a visible
   reason rather than become an undocumented bypass?
2. Is the honest non-atomic disclosure for the pre-claim pause check adequate, or does the residual
   claim-round-trip window need closing before release rather than as a carry?
3. Does releasing a platform where **0%** of formats are reachable carry any risk the blanket pause was
   incidentally covering — i.e. is `paused_until` load-bearing for anything other than publish
   suppression?
