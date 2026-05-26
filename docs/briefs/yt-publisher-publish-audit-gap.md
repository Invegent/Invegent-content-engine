# Brief — F-YT-PUB-PUBLISH-AUDIT-GAP: cross-posted YouTube publishes silently miss their `m.post_publish` audit row

**Created:** 2026-05-26 Sydney
**Author:** CCD (Claude Code / laptop terminal)
**Status:** **CANDIDATE — AUTHORED, NOT implemented.** No code patched, no EF deployed, no DML applied, no backfill run. Execution gated on D-01 + PK approval (see §Governance).
**Found:** during the v3.10 Unit B-2 B2-drain watch (`docs/runtime/sessions/2026-05-26-v3.10-unit-b2-deploy-recovery.md`).
**Model / related:** `youtube-publisher` v1.9.0 (the now-live predicate that surfaced this); `docs/briefs/yt-publisher-failed-no-retry.md` (parent F-YT-FAILED-NO-RETRY work).
**Result file:** `docs/briefs/results/yt-publisher-publish-audit-gap.md` (on completion).

---

## Problem

A draft that uploads successfully to YouTube is marked `video_status='published'` with a real `draft_format.youtube_video_id`, but **no `m.post_publish` row for platform `youtube` is created** — the publish audit trail is silently incomplete for these drafts.

First observed on two v3.10-recovered B2 drafts that published on the 09:15Z cron tick:
- `93c724a6-7110-46c5-87da-689e3b62ad3b` → YouTube `VonxZesS0Ws`
- `dd990204-3bdb-4889-a6c1-414df73353fa` → YouTube `u-xYWGg1qWI`

Both have `video_status='published'` + a real `youtube_video_id`, and **no** `m.post_publish` youtube row — only their original April **Facebook** row.

## Root cause (verified from DB + code)

1. `m.post_publish` has unique constraint **`uq_publish_attempt UNIQUE (post_draft_id, attempt_no)`** (not platform-aware). (Plus PK `post_publish_pkey (post_publish_id)`.)
2. The publisher's success-path INSERT **hardcodes `attempt_no: 1`** (`supabase/functions/youtube-publisher/index.ts:255`).
3. A **cross-posted** draft (published to Facebook earlier) already has an `m.post_publish` Facebook row at `attempt_no=1`.
4. The YouTube INSERT (`attempt_no=1`) therefore **collides on `(post_draft_id, attempt_no)` and is rejected.**
5. The publisher **logs `insertErr` but does not throw** (`index.ts:258`), so `video_status='published'` is committed (the upload succeeded) while the audit row is **silently dropped**.

This is a **pre-existing latent bug** (the hardcoded `attempt_no=1` dates to v1.5.0). It was masked while the publisher only selected `approval_status='approved'` (single-platform, never-FB-published drafts → no collision). **v1.9.0's predicate broadening to `IN ('approved','published')` now routes cross-posted (`published`) drafts to YouTube — exactly the class that collides — so the latent bug became active.**

## Severity — NOT an emergency (but fix soon)

- ✅ YouTube uploads **succeed** — the videos are live (`VonxZesS0Ws`, `u-xYWGg1qWI` are real public-on-YouTube IDs).
- ✅ **No double-upload risk:** the publisher SELECT requires `video_status='generated'`, which flips to `published` on success, so a draft is never re-selected/re-uploaded.
- ✅ The gap is **backfillable** from `draft_format.youtube_video_id`.
- ⚠️ But the `m.post_publish` YouTube audit trail is **incomplete for all cross-posted drafts** — anything that reads `post_publish` (dashboard publish counts, insights, reconciliation) undercounts YouTube. The 15 B2 drafts still draining will each add to the gap until Unit A lands.

## Evidence (read-only, measured 2026-05-26)

| Measure | Value |
|---|---|
| Published video drafts with `youtube_video_id` but **no** YouTube `post_publish` (the audit-gap cohort) | **11** |
| — of which v3.10 B2-recovered (breadcrumb) | 2 |
| — of which **pre-existing / non-B2** (historical cross-posted publishes) | **9** |
| — of which have a Facebook `post_publish` at `attempt_no=1` (the collision) | **11 / 11** |
| Drafts with **any** YouTube `post_publish` row (successfully audited) | 31 |
| Drafts with **both** a FB and a YT `post_publish` row | **1** (its YT row is `attempt_no=2`) |
| Global `max(attempt_no)` in `post_publish` | 2 |
| YouTube `post_publish` rows with `attempt_no <> 1` | 1 |
| B2 drain state | 2 published / 15 still `generated` |

**Fix validation from the data:** the only draft that successfully holds both a FB and a YT audit row did so because its YouTube row uses **`attempt_no=2`** — i.e. a non-colliding attempt number is exactly the fix.

### Reproducible read-only queries

```sql
-- (1) audit-gap cohort: published video drafts with a youtube_video_id but no YT post_publish
SELECT count(*) AS affected_total
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
  AND pd.video_status='published'
  AND pd.draft_format->>'youtube_video_id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id=pd.post_draft_id AND pp.platform='youtube');

-- (2) of those, how many have a Facebook post_publish at attempt_no=1 (the collision)
-- same WHERE as (1) AND EXISTS (... pp.platform='facebook' AND pp.attempt_no=1)

-- (3) current post_publish unique constraints + indexes
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='m' AND t.relname='post_publish' AND c.contype IN ('u','p');

-- (4) drafts that already hold BOTH a FB and a YT audit row (+ what attempt_no the YT row uses)
SELECT count(*) FROM (
  SELECT post_draft_id FROM m.post_publish WHERE platform IN ('facebook','youtube')
  GROUP BY post_draft_id HAVING count(DISTINCT platform) > 1) x;

-- (5) duplicate-risk guard for the backfill: any cohort draft already has a YT post_publish (must be 0 by definition of the cohort)
-- (6) current B2 drain state: count by video_status WHERE draft_format ? 'youtube_b2_recovery'
```

## Scope

**In scope:**
- Stop cross-posted YouTube publishes from losing their `m.post_publish` audit row (Unit A — publisher fix).
- Backfill the missing historical YouTube audit rows (Unit B).

**Out of scope:**
- Re-uploading any video (all affected videos are already live on YouTube — only the audit row is missing).
- Facebook `post_publish` rows (never touched).
- B3 (9 never-connected) drafts — they never uploaded to YouTube, so they have no `youtube_video_id` and are not in the cohort.
- Any OAuth / predicate / retry / auth / quota change — v1.9.0 behavior is preserved.
- Schema redesign of the uniqueness model beyond what Unit A needs (a `(post_draft_id, platform, attempt_no)` migration is an *option to evaluate*, not a requirement).

## Unit A — `youtube-publisher` v1.10.0 code fix (ef_deploy gated)

Goal: the YouTube success-path INSERT must not collide with another platform's `attempt_no=1` row, and an audit-insert failure must not be silently swallowed.

- **Attempt-number fix (preferred):** instead of the hardcoded `attempt_no: 1`, compute the **next available `attempt_no` per `post_draft_id`** for the INSERT — e.g. `coalesce(max(attempt_no),0)+1` over existing `m.post_publish` rows for that draft (validated by the lone success case, which used `attempt_no=2`). Alternatives to evaluate: a deterministic per-platform offset, or (schema option) a migration to `uq_publish_attempt (post_draft_id, platform, attempt_no)` so per-platform `attempt_no=1` no longer collides.
- **Do not swallow the audit failure:** on `insertErr`, either (a) throw **after** `youtube_video_id` is persisted to the draft (so the existing pre-upload `m.post_publish` reconcile guard / forward-recovery handles it next tick), or (b) write a durable `youtube_audit_insert_failed` marker in `draft_format`, or (c) reconcile forward safely. Evaluate which is cleanest given the reconcile guard already exists.
- **Preserve unchanged:** the v1.9.0 `approval_status IN ('approved','published')` predicate; the no-`youtube_video_id` guard; the pre-upload `m.post_publish` reconcile guard; failure classification (auth/quota/transient/terminal); bounded retry; channel auth-hold; the 5-format allow-list; unlisted privacy; the 2/tick cap. **No re-upload of already-published videos.**

## Unit B — `sql_destructive` backfill of missing YouTube audit rows (gated)

Backfill `m.post_publish` youtube rows for the cohort:
- **Cohort predicate:** `video_status='published'` AND `draft_format->>'youtube_video_id' IS NOT NULL` AND no existing `m.post_publish` row with `platform='youtube'` AND `recommended_format` in the 5 YouTube video formats.
- **Insert per cohort row:** `platform='youtube'`, `platform_post_id = draft_format->>'youtube_video_id'`, `published_at = coalesce((draft_format->>'youtube_published')::timestamptz, now())`, `status='published'`, **non-colliding `attempt_no`** (`coalesce(max(attempt_no) for the draft,0)+1`), `client_id` from the draft, `response_payload` reconstructed from `draft_format` (`youtube_url`, `youtube_b2_recovery` marker) where available.
- **Safety:** snapshot-first cohort table; **must avoid duplicates** (skip any draft that already has a YT row); **must not touch Facebook rows**; **must not touch B3/no-channel rows** (they have no `youtube_video_id`, so excluded by construction); hard-abort on an unexpected count **unless PK approves the changed count** (the cohort grows as the 15 remaining B2 drafts drain — re-measure at apply time).
- Recompute the cohort live at apply time (do not hardcode the count).

## Governance

- **Unit A** — `ef_deploy` D-01 + PK approval phrase.
- **Unit B** — `sql_destructive` D-01 + PK approval phrase.
- **A-then-B recommended:** (1) deploy v1.10.0 so all *future* cross-posted publishes write their audit row correctly; (2) backfill the missing *historical* YouTube audit rows (so the backfill is a one-time catch-up against a now-correct publisher).
- **No apply/deploy in this authoring pass.**

## Stop condition

Brief authored only. No `youtube-publisher` v1.10.0 code written/committed; no prepared backfill DML; no deploy; no DML; no backfill; B3 untouched. Execution is a separate, supervised, D-01-gated step (A-then-B) on PK direction.
