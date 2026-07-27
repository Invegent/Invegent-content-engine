# Result — video-worker render-claim concurrency hardening (F-VIDEO-RENDER-CLAIM, v3.13.0)

**Date:** 2026-07-27 Sydney
**Lane:** SAFETY_GATE · **Tier T3** · Option B (PK-approved)
**Brief:** `docs/briefs/video-worker-render-claim-concurrency-brief-v1.md`
**Outcome:** ✅ **COMPLETE — deployed + verified live.** video-worker v3.13.0 live; `public.claim_pending_video_drafts` migration applied.

## Problem

video-worker's per-tick draft acquisition was an unlocked PostgREST SELECT (`video_status='pending'`,
approval in approved/published, 4 video formats, `limit 4`, **no** `FOR UPDATE`). Two overlapping
invocations (overlapping 30-min cron jobid 33, or a manual trigger overlapping cron) could both select
the same pending draft and both submit a Creatomate render → duplicate render + wasted credits +
last-write-wins race on the `post_draft` update. Pre-existing (v3.12.0 F-VIDEO-RENDER-RETRY did not
introduce it; it slightly widened the pending window). Deferred by PK from the v3.12.0 external review.

## Fix (Option B — SECURITY DEFINER claim RPC, `FOR UPDATE SKIP LOCKED`)

**DB — migration `20260727120000_video_render_claim_rpc.sql`** (applied as ledger version
`video_render_claim_rpc`, 2026-07-27). Additive `public.claim_pending_video_drafts(p_limit int DEFAULT 4)`,
`LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','pg_temp'`. One atomic statement (the house
`m.fill_pending_slots` idiom): inner `SELECT … ORDER BY updated_at ASC LIMIT p_limit FOR UPDATE SKIP
LOCKED` folds in the approval + 4-format + backoff (`video_retry_after`) predicates **and** stale-claim
reclaim (`video_status='rendering'` older than 15 min), and the outer UPDATE flips `pending→rendering`,
stamps `draft_format.render_claim_at`, returns the claimed rows. No table DDL, no new column
(`video_status` is free-text/no-CHECK; state lives in the existing `draft_format` jsonb).
`REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role`.

**Worker — video-worker v3.12.0→v3.13.0** (`supabase/functions/video-worker/index.ts`):
1. Unlocked SELECT → `supabase.rpc('claim_pending_video_drafts',{p_limit:4})`, fail-loud 500 on error.
2. Dead in-JS backoff-skip block removed (backoff now enforced in the claim).
3. Transient-under-cap requeue resets `video_status 'rendering'→'pending'` + strips `render_claim_at`.
4. Terminal / at-cap branch strips `render_claim_at`.
5. `clearVideoRetryMeta` also strips `render_claim_at` (all three success updates clear the claim).
6. v3.12.0 retry model (`MAX_VIDEO_RENDER_ATTEMPTS=3`, `VIDEO_RETRY_BACKOFF_MIN=10`, `futureIso`,
   `classifyRenderFailure`) otherwise byte-unchanged.

**State machine:** claim → `rendering` (+`render_claim_at`); success → `generated` (retry+claim meta
stripped); transient<cap → `pending` (+attempts++, retry_after=now+10m, claim stripped); terminal|at-cap
→ `failed` (+`video_dead_reason`); crash mid-render → stays `rendering`, self-heals via the 15-min
stale reclaim (> the 2-min render ceiling, so a killed invocation costs at most one re-render after 15 min).

## Lane record (T3 chain — all clean, pinned to review hash `ab47c73f7b2350c893246615c8c30c9fea2b49a490c801907a19f2397db12087`)

| Gate | Verdict | Evidence |
|---|---|---|
| ef-builder (local, base v3.12.0 `ad93fec`) | built | `deno check` clean · 8/8 tests pass · exactly 3 files |
| branch-warden | **safe** | HEAD `ad93fec`, exactly 3 files, no commit/push at review time |
| db-rls-auditor | **pass / clean** | 10/10 live: `video_status` text no-CHECK · `draft_format` jsonb · owner postgres · search_path pinned · grants service_role-only (default-ACL trap neutralised) · public reachable no PGRST106 · SKIP LOCKED race-safe · ::timestamptz not lexicographic · name unique/strictly-after `20260727090955` · no new advisor |
| external review (ChatGPT) | **agree / proceed** | medium risk · high confidence · no pushback · review_id `4c09220f-e616-4a05-9e76-b961dbe06fa1` |

## Deploy + verification (ground truth)

- **Commit** `ca2a407` on `main` (rebased onto `b5ef4ae` after origin moved +6 disjoint commits mid-lane — video-worker untouched, migration name unique; verified benign & unrelated, clean FF push).
- **Migration applied** (ledger `video_render_claim_rpc`). Post-apply live check: fn owner=`postgres`,
  `security_definer=true`, `search_path=public,pg_temp`, grants `postgres:EXECUTE, service_role:EXECUTE`
  (no anon/authenticated/PUBLIC).
- **EF deployed** v3.13.0 via `scripts/safe-deploy.sh video-worker --allow-warn` (B-FD gate, allow-warn).
  Ops note: drift log was stale-A-LE; refreshed `drift-check?write=true&slug=video-worker` → B-FD → deploy;
  fresh worktree needed the `supabase/.temp` link marker copied in (CLI "no project ref").
- **deploy-verifier (run inline; not a registered agent this session):** content verdict **PASS** —
  marker `video-worker-v3.13.0` present in the DEPLOYED bundle (bundles-from-CWD guard: old
  `.eq('video_status','pending')` selection absent) · VERSION==repo v3.13.0 · `verify_jwt=false`.
  drift verdict **A-LE aligned** (deployed==repo). **overall PASS.**
- **Live seam proof (safe):** zero pending video drafts live (statuses published/failed/archived_stale),
  so `SELECT * FROM public.claim_pending_video_drafts(4)` returned `[]` — RPC live, callable by
  service_role, correct TABLE shape, **zero mutation**.

## Live concurrency proof (2026-07-27, PK-directed — "GO", required-proof list)

Executed against the live function with **synthetic, fingerprinted, NON-renderable** drafts (no
`video_script` → the worker cannot submit a Creatomate render for them even if seen), 0 real pending
drafts present, run at minute :10 (clear of the `*/30` cron jobid 33), fully cleaned up.

| Required proof | Result | Evidence |
|---|---|---|
| Two concurrent invocations claim a draft only once | ✅ | Seeded 6; two parallel HTTP claims (separate txns, `p_limit=4`): **A=4, B=2, overlap=∅, union=all 6 each once**. A genuine `SKIP LOCKED` split. |
| Exactly one Creatomate render submitted | ✅ (by construction) | Deployed bundle has **exactly one** `fetch(CREATOMATE_API,` submit site, reached only inside `processDraft`, which runs once per claimed draft; claim-once (above) ⟹ ≤1 render/draft/cycle. In-flight (fresh) re-claim returned **0**. No real render submitted (synthetic rows non-renderable by design). |
| Crash does not permanently strand the draft; 15-min stale claim recovers | ✅ | Backdated 3 of 6 rows' `render_claim_at` to −20 min (simulated crash); next claim recovered **exactly those 3** (`[1,2,3]`), leaving the 3 fresh in-flight rows untouched. |
| Existing retry timing + dead-letter unchanged | ✅ | Deployed bundle: `MAX_VIDEO_RENDER_ATTEMPTS=3` · `VIDEO_RETRY_BACKOFF_MIN=10` · `classifyRenderFailure` · `video_retry_after`/`video_render_attempts`/`video_dead_reason` · `max_render_attempts:`/`terminal:render` all byte-present; only `'rendering'→'pending'` reset added to the requeue branch. 8/8 unit tests passed at build. |
| No unrelated worker/publisher behaviour modified | ✅ | branch-warden 3-file set (video-worker `index.ts` + test + migration only); single EF deployed; deployed bundle changed only the selection→claim path. youtube-publisher (same class of race) untouched. |

Cleanup verified: 6/6 synthetic rows deleted, 0 remaining, 0 publish-queue refs created (AFTER-UPDATE
triggers correctly no-op'd for the `pending→rendering` flip), real pending count unchanged (0).

## Carries

- Concurrency guarantee rests on `FOR UPDATE SKIP LOCKED` (house-proven in `m.fill_pending_slots`,
  db-rls-auditor-verified here) + the verified deployed seam + 8 unit tests + the live proof above.
- youtube-publisher shares the same unlocked-SELECT race (out of scope; separate lane if desired).
- Rollback (if ever needed): redeploy v3.12.0 (does not call the RPC) **before** `DROP FUNCTION
  public.claim_pending_video_drafts(int)`.
