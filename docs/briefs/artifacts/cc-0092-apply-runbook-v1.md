# cc-0092 Gate B — APPLY RUNBOOK v1 (A1 → A2a → Reel transport proof)

**Status: PREPARED, NOT EXECUTED. Nothing in this document has been run.**
**Prepared 2026-08-08 while the production-mutation watch gate was in force, so PK can execute in
one sitting rather than re-deriving anything at the gate.**

## ⛔ Two hard preconditions, neither the executor's to waive

1. **PRODUCTION-MUTATION WATCH GATE — ~2026-08-11 20:20 Sydney.** Not cleared at preparation time.
2. **PK GATE.** Every apply step below is PK-run or explicitly PK-authorised. Every publish is PK's
   act. The executor prepares and verifies; it does not apply and does not publish.

This runbook is shaped for **Convention 2** (conditional sequence approval): it pins artifact
hashes, names the ordered steps, and states the STOP conditions, so PK can approve the sequence once
instead of gate-by-gate. Approving it is **not** delegating deploy authority — it is PK exercising
it in one sitting.

## Pinned artifacts — the sequence is valid ONLY for these digests

sha256:16, working-copy LF, hashed in the shared default worktree `C:\Users\parve\Invegent-content-engine`.
**⚠ A CRLF checkout produces different digests — always re-hash here, never compare against a fresh clone.**

| Step | Artifact | sha256:16 |
|---|---|---|
| 1 | `NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_v1.sql` | `2fa7f9a24350c66e` |
| — | `…cc0091_a1_…_ROLLBACK_v1.sql` | `8fbd98f6225b1285` |
| 3 | `NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_v1.sql` | `8708ba7b952d04c8` |
| — | `…cc0092_a2a_…_ROLLBACK_v1.sql` | `f1e47c4b4920703f` |

**NOT in this sequence:** A2b v2 (`c88c5a87f099b676`) and its rollback — gated on the B3 proof and
the B4 verdict, and **not applicable by cc-0092 under any outcome**. A3-1/A3-2/A3-3 — observability,
deliberately excluded (applying them unwired buys nothing for a Reel proof and widens blast radius).

Re-hash immediately before step 1:

```bash
cd /c/Users/parve/Invegent-content-engine && for f in docs/briefs/artifacts/NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_v1.sql docs/briefs/artifacts/NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_ROLLBACK_v1.sql docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_v1.sql docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_ROLLBACK_v1.sql; do printf "%s  %s\n" "$(sha256sum "$f" | cut -c1-16)" "$(basename $f)"; done
```

## Apply channel — N10, NAMED

**Supabase `apply_migration`.** Both artifacts embed `BEGIN`/`COMMIT` and their pre/post-state
assertions are atomic only if the channel does not split statements.

- ⚠ **It MINTS ITS OWN VERSION.** The filename number does **not** survive. **Record the version
  actually minted** for each step — that is the permanent identity.
- ⚠ **CARRY-INFRA-1:** that `apply_migration` honours an embedded `BEGIN`/`COMMIT` as one
  transaction is **closed by assertion, not proof** (unprovable without a write). Exposure for these
  two artifacts is small — `BEGIN` is the first statement and `COMMIT` the last, so
  assertion-to-write atomicity holds either way. See `cc-0092-carry-infra-1-apply-channel-proof-procedure-v1.md`.

## Pre-flight — verified READ-ONLY 2026-08-08, re-run at the gate

Every value below matched its artifact's stated expectation at preparation time. **Re-run and
re-compare; do not trust these recorded values at the gate.**

```sql
SELECT 'A1_baseline' AS check, ice_format_key AS subject, platform_support::text AS state
  FROM t."5.3_content_format"
 WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice','video_short_kinetic')
UNION ALL SELECT 'A2a_dep','override_rows_total', count(*)::text FROM c.client_format_mix_override
UNION ALL SELECT 'A2a_dep','ig_defaults_current',
       string_agg(ice_format_key||'='||default_share_pct, ', ' ORDER BY ice_format_key)
  FROM t.platform_format_mix_default WHERE platform='instagram' AND is_current
UNION ALL SELECT 'A2a_dep','pp_ig_enabled_slots', count(*)::text
  FROM c.client_publish_schedule
 WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND enabled AND platform='instagram'
UNION ALL SELECT 'A2a_dep','pp_client_id_matches',
       (EXISTS(SELECT 1 FROM c.client WHERE client_slug='property-pulse'
                AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'))::text
ORDER BY 1,2;
```

Expected — **any deviation is a STOP:**

| check | subject | expected |
|---|---|---|
| A1_baseline | `video_short_kinetic` | `{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}` |
| A1_baseline | `video_short_kinetic_voice` | `{"youtube":true,"facebook":false}` — **instagram key ABSENT** |
| A1_baseline | `video_short_stat` | `{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}` |
| A1_baseline | `video_short_stat_voice` | `{"youtube":true,"facebook":false}` — **instagram key ABSENT** |
| A2a_dep | `override_rows_total` | `0` |
| A2a_dep | `ig_defaults_current` | `carousel=60.00, image_quote=40.00` |
| A2a_dep | `pp_ig_enabled_slots` | `5` |
| A2a_dep | `pp_client_id_matches` | `true` |

**Why the absent keys matter:** A1's rollback issues `platform_support - 'instagram'` on both
`_voice` rows. If a value has since been written there, the rollback would delete a key that
legitimately existed — converting a stated denial into "never stated", the exact corruption cc-0091
exists to prevent. A1's own pre-state block enforces this; the table above lets you see it first.

## Baseline to RECORD before step 1 (needed to prove the delta afterwards)

```sql
SELECT platform, ice_format_key, share_pct, weekly_slot_count
  FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
 WHERE platform='instagram' ORDER BY share_pct DESC;
```

Expected: `carousel 60.00 → 3`, `image_quote 40.00 → 2`, **no video row.**

Also record every other brand's Instagram grid, so "no other brand moved" is provable against a
recorded baseline rather than an assumption:

```sql
SELECT cl.client_slug, g.ice_format_key, g.share_pct, g.weekly_slot_count
  FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
 WHERE g.platform='instagram' ORDER BY 1,2;
```

## Ordered steps

### Step 1 — apply A1 *(PK)*

`apply_migration` with the full contents of the A1 forward artifact. **Record the minted version.**

A1 is **single-shot with baseline enforcement**, not idempotent. It distinguishes two aborts:
- `ALREADY APPLIED … This is a NO-OP, not a drift. No action needed` → benign, proceed to step 2.
- `baseline moved, artifact is stale` → **STOP.**

### Step 2 — verify A1

```sql
SELECT ice_format_key, platform_support
  FROM t."5.3_content_format"
 WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice','video_short_kinetic')
 ORDER BY ice_format_key;
```

Expected: the three corrected rows at `"instagram": true`; **`video_short_kinetic` UNCHANGED at
`false`** (its audio gap is real — no audio stream, 4/4 renders).

**A1 alone changes no scheduling outcome** — the Instagram default mix contains no video row at all,
so these formats produce no `candidate` row and nothing downstream sees them. Confirm that:

```sql
SELECT cl.client_slug, g.ice_format_key, g.weekly_slot_count
  FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
 WHERE g.platform='instagram' AND g.ice_format_key LIKE 'video%' ORDER BY 1,2;
```

Expected: **zero rows.** Any row here is a STOP — A1 was supposed to be inert.

### Step 3 — apply A2a *(PK)*

`apply_migration` with the full contents of the A2a forward artifact. **Record the minted version.**

A2a self-enforces the ordering: if A1 is not applied it aborts with *"APPLY cc-0091 A1 FIRST."*
Its post-state assertions run **inside the transaction** and abort the whole apply unless the
allocation is exactly **`carousel 2 / image_quote 2 / video_short_stat 1`, total 5** — the single
remainder slot goes to `image_quote` (rem .6 beats video's .0).

> ⚠ **Do not confuse A2a's numbers with A2b v2's.** A2a (25.00 override) → carousel 2 /
> **image_quote 2** / video **1**. A2b v2 (40/25/35 overrides) → carousel 2 / **image_quote 1** /
> video **2**. Only A2a is in this sequence.

### Step 4 — verify A2a

```sql
SELECT platform, ice_format_key, share_pct, weekly_slot_count
  FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
 WHERE platform='instagram' ORDER BY share_pct DESC;
```

Expected: `carousel 48.00 → 2`, `image_quote 32.00 → 2`, `video_short_stat 20.00 → 1`, total 5.
**The entire behavioural delta is: one carousel slot per week becomes one video slot, for Property
Pulse only.** Re-run the all-brands query and diff against the recorded baseline — every other brand
must be byte-identical.

### Step 5 — let the nightly path run *(no action)*

**Do NOT force, hand-craft, or shortcut a draft, render, or publish.** A manufactured artifact
proves nothing about the path and would make the B4 verdict worthless. Wait for the cadence.

Monitor without touching:

```bash
python scripts/db-read.py "SELECT * FROM ice_ro.draft_status LIMIT 20"
python scripts/db-read.py "SELECT * FROM ice_ro.render_status LIMIT 20"
python scripts/db-read.py "SELECT * FROM ice_ro.slot_status LIMIT 20"
```

⚠ **`video_short_stat` has never completed a render for Instagram** — all 38 existing drafts are
facebook (26) or youtube (12). A2a proves a slot is *allocated*; it cannot prove a draft is
generated, rendered, or transported. That gap **is** the B3 proof.

The render will take the **governed** path (`renderGovernedVideoStat`), because PP's
`c.client_creative_governance` row for `video_short_stat` is `enabled=true` (armed 2026-07-10).
That is the path worth proving.

### Step 6 — publish ONE Reel *(PK's act)*

`video_short_stat`, property-pulse, Instagram. The executor prepares and verifies; **PK approves the
release.**

### Step 7 — collect transport evidence

```sql
SELECT pp.post_publish_id, pp.status, pp.platform_post_id,
       pp.response_payload->>'ig_media_id' AS ig_media_id, pp.published_at,
       pd.recommended_format, prl.storage_url
  FROM m.post_publish pp
  JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
  LEFT JOIN m.post_render_log prl ON prl.post_draft_id = pp.post_draft_id
 WHERE pp.client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
   AND pp.platform='instagram' AND pd.recommended_format='video_short_stat'
 ORDER BY pp.published_at DESC;
```

Required evidence set:

- [ ] `status='published'`, non-null `platform_post_id`, `response_payload->>'ig_media_id'`
- [ ] `m.post_draft.recommended_format = 'video_short_stat'` — **format lives here; `m.post_publish`
      has no format column and no `publish_method` column** (the brief's original criterion cited a
      field that does not exist)
- [ ] the render's `storage_url`
- [ ] **independent confirmation the media is visible on the account, from someone who is not PK** —
      the Facebook root cause was precisely that self-visibility proved nothing
- [ ] **State plainly that "it published as a Reel" is an INFERENCE from code, not a DB fact.** No
      column records it; it follows from `instagram-publisher` setting `media_type='REELS'` for
      every format in `IG_VIDEO_FORMATS` (`index.ts:154-158`, `:328`).

### Step 8 — B4 verdict

Written permit/block on restoring the material Instagram discovery mix (A2b v2), grounded in step 7.
**One successful Reel = permit. Failure = block, with the failure classified.** A2b v2 is **not
applied by this lane under either outcome** — the verdict is its input.

The result doc must state **in those words** that `video_short_stat_voice` and
`video_short_kinetic_voice` remain **transport-UNPROVEN** on Instagram, and record the cc-0093
handoff. A1's `ffprobe` evidence is an *artifact* claim, not a transport claim; do not conflate them.

## STOP conditions — a tripped STOP voids the remainder of the sequence

Resumption requires a fresh PK gate. **Non-removable (Convention 2):**

1. Any artifact hash ≠ the pinned digest above.
2. Any pre-flight value ≠ its expected value.
3. Unexpected `origin/main` movement, unless independently verified benign and unrelated.
4. Any migration aborting with a message other than A1's explicit `ALREADY APPLIED … NO-OP`.
5. Any post-apply state not matching the artifact's stated expectation.
6. Unexpected files in a change set.
7. An invalidated rollback path.

**Lane-specific:**

8. A1 verified as **not inert** — any video row in any brand's Instagram grid after step 2.
9. Any brand other than property-pulse moving at step 4.
10. Total Instagram slots for PP ≠ 5 at any point. **This lane changes the mix, never the cadence.**
11. A draft/render/publish that was forced or hand-made rather than produced by the nightly path.
12. Any attempt to apply A2b v2, A3-1, A3-2 or A3-3 as part of this sequence.

## Rollback

Both rollbacks are **prepared and hash-pinned above.** Order matters if both are reverted: **A2a
rollback FIRST, then A1** — reverting A1 while A2a's override is live would leave a mix row pointing
at a format the registry again calls unsupported, i.e. a silent 20% cut in PP's Instagram output.

- **A2a rollback** DELETEs its single row, restoring `carousel 3 / image_quote 2` and an empty table.
- **A1 rollback is deliberately NON-SYMMETRIC:** `video_short_stat` → explicit `false`; both `_voice`
  rows → **REMOVE the `instagram` key**. A uniform "set false" would put two rows in a state they
  were never in. Read it before applying it.
- ⚠ **Neither rollback unpublishes anything.** Once a Reel is public, retraction is a manual PK act
  on the platform itself.
- ⚠ **Reverting A1 re-asserts a known-false registry claim.** Only do it for a deliberate reason.

## What this sequence deliberately does NOT do

- Apply A2b v2, or any material video allocation.
- Apply A3-1/A3-2/A3-3.
- Begin the 30-day audience-growth experiment — **A5, its measurement prerequisite, is not authored.**
- Touch cadence, volume, `max_per_day`, or any schedule.
- Touch Gate C (Facebook — the `Invegent Publisher` app is Unpublished/In-Development, blocked on
  business verification pending an ATO document), LinkedIn, YouTube, or Lane 5.
- Anything in cc-0093.
