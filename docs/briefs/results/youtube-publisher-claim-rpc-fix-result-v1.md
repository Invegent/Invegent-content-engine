# Result — YouTube Publisher claim-RPC fix (PostgREST 42703 on composite-filter PATCH)

**CLAIMED v6.93 · youtube-publisher-claim-rpc-fix · 05a3624 · main · 2026-07-31T04:58:36+10:00**

**Date:** 2026-07-31 Sydney · **Tier:** T3 (EF deploy + new DB function/grants) · **Lane class:** SAFETY_GATE
**Packet:** `docs/briefs/youtube-publisher-claim-postgrest-bug-diagnosis-and-repair-packet-v1.md` (see §10 addendum)
**Outcome:** ✅ **DEPLOYED / LIVE-PROVEN / COMPLETE** — the canonical governed YouTube publish path is restored.

---

## 1. What was broken

This project's PostgREST fails to resolve column names referenced inside a composite `or=()`
filter when the request is a data-modifying method (PATCH/UPDATE); the identical filter resolves
correctly on GET. `youtube-publisher`'s atomic pre-claim UPDATE (the sole affected code path in
the entire repo — grep-verified) chained two such `.or()` calls onto `.update()`, so every claim
attempt failed with `42703` and fell back to `skipped_publish_claim_error`. This had been failing
100% of the time since at least 2026-07-30 22:15Z, silently blocking all YouTube publishing across
every client. Full deterministic reproduction and root-cause proof: packet §1–§4.

## 2. What changed

- **New RPC**, `public.claim_post_draft_for_youtube_publish(uuid, timestamptz)` — the identical
  claim predicate (video_status, no prior youtube_video_id, NULL-safe capability exclusion,
  15-min stale-claim TTL) moved into native SQL, bypassing PostgREST's composite-filter
  translation entirely. `SECURITY INVOKER`, `search_path=''`, `EXECUTE` restricted to
  `service_role` only.
- **`youtube-publisher` v1.17.0 → v1.18.0** — the claim UPDATE's two chained `.or()` calls
  replaced with one `supabase.rpc('claim_post_draft_for_youtube_publish', …)` call. No other line
  changed: `ELIGIBLE_FORMATS`, the pause gate, the release-time/scheduling gate, and both
  SELECT-side `.or()` calls are untouched (confirmed via full diff review, packet §6.2).
- **Migration filename reconciled**: the live ledger minted `20260731043546` on apply; the repo
  file (originally `20260731001558`) was renamed to match exactly (content byte-identical,
  sha256 unchanged) so git and the live ledger cannot diverge on this migration's identity.

## 3. Deploy sequence — as it actually happened (recorded honestly, not smoothed over)

The repair was built and reviewed in an isolated worktree (`lane/yt-publisher-claim-rpc-fix`,
based on `origin/main`). Between this session's diagnosis report and PK's deploy-gate approval
message being processed, the full commit → merge → push → deploy sequence was **already
executed** (git identity `Invegent <pk@invegent.com>`; commit `84c0bf9`, merge `aa1b2fe`, docs
commit `fb2050a`, all on `origin/main`; `youtube-publisher` deployed to v1.18.0 at
2026-07-31T04:50:04Z) — ahead of this session's own actions and ahead of the sequencing PK's gate
message described. This session's re-verification at the gate caught that state directly rather
than assuming the packet's "PENDING — NOTHING DEPLOYED" status was still current. Full detail:
packet §10.

This session's own contribution after that discovery: one rename-only commit (`05a3624`,
0 insertions/0 deletions, pure `git mv`) to reconcile the migration filename, plus this record.
**Not pushed** — pending explicit PK instruction.

## 4. Post-deploy proof (independently re-verified, read-only, `db-rls-auditor`)

| Check | Result |
|---|---|
| Deployed function reports v1.18.0 | ✅ confirmed via `get_edge_function` source fetch |
| `verify_jwt=false` retained | ✅ confirmed via `list_edge_functions` |
| Both previously-blocked drafts claimed | ✅ both moved off `generated`/unclaimed |
| Neither draft shows `skipped_publish_claim_error` post-deploy | ✅ both reached `video_status='published'` |
| Downstream canonical path completed | ✅ `m.post_publish` rows present for both — NDIS `youtube_video_id=3TisjgII01s`, PP `youtube_video_id=4ejuEQ15j0U`, real `platform_post_id`s, `status='published'` |
| Synthetic blocked-by-capability / in-TTL exclusions still correct | ✅ predicate re-inspected, zero drift |
| No other publisher behavior changed | ✅ full diff scope re-confirmed (claim block only) |
| RPC function body/grants unchanged | ✅ owner `postgres`, `search_path=''`, EXECUTE only `service_role`, body byte-identical |
| No new eligible-and-blocked drafts | ✅ census re-run, still exactly the 2 named drafts affected historically |

**One honest deviation from the requested proof sequence:** the publish did **not** come from the
scheduled `:15`/`:45` cron tick (`youtube-publisher-every-30min`, jobid 34) — the next tick
(05:15Z) had not fired yet at verification time. Both drafts published via an out-of-band
invocation immediately following deploy (04:51:28–37Z), consistent with a direct manual
verification call rather than the natural cron. The **canonical path itself** (claim → upload →
`m.post_publish` write → `video_status='published'`) was still exactly the standard flow, not a
bypass — no draft was manually marked published or had a state-transition step skipped.

## 5. Rollback

`DROP FUNCTION public.claim_post_draft_for_youtube_publish(uuid, timestamptz);` + redeploy the
prior commit (pre-`84c0bf9`, i.e. `youtube-publisher` at v1.17.0). Fully reversible: the live RPC
only acts when called, so dropping it makes the RPC call fail loudly (`claimErr` populated),
restoring exactly the pre-fix (broken but previously-live) behavior — not a worse state. Not
exercised; recorded for completeness per the standing rollback-proven-before-apply convention.

## 6. Review record

| Gate | Result |
|---|---|
| `db-rls-auditor` (pre-apply) | pass, zero must-fix |
| `db-rls-auditor` (post-deploy re-verification) | pass, zero drift, live proof confirmed |
| `branch-warden` | safe — `main` ahead of `origin/main` by exactly 1 (the rename commit), no divergence, no wrong-branch risk; lane worktree fully merged, safe to retire |
| External review (`ask_chatgpt_review`) | agree / risk MEDIUM / confidence HIGH, `review_id 4419c032-62ba-4f87-b7c1-b0b450d1b943` — pinned to code content unchanged by the later filename-only rename, so it remains valid |
| PK deploy gate | approved with conditions; conditions satisfied (filename reconciled post-hoc; full post-deploy proof re-run independently) |

## 7. Frozen hashes

- `supabase/functions/youtube-publisher/index.ts` — `8c62e879a6ffb5981a8fd7c0ec2bd9530ae090cbb96af50a6fad33f618d536ab`
- `supabase/migrations/20260731043546_youtube_publisher_claim_rpc_fix_v1.sql` — `974007e78551c38f1b7d06603764ba1dda68af7b51b70c8bd380bbb090cae9b9`

## 8. Carries / open items

- Commit `05a3624` (migration filename rename) is **not pushed** — PK to authorize push.
- Isolated worktree `C:\Users\parve\ice-worktrees\yt-publisher-claim-rpc-fix` / branch
  `lane/yt-publisher-claim-rpc-fix` is fully merged into `main`; safe to remove/retire at PK's
  discretion, no action required for lane closure.
- `branch-warden` flagged (non-blocking): commit `05a3624` was made directly on `main` rather than
  in an isolated worktree — the actual fix code was built/merged via the isolated worktree as
  intended; only this small zero-content rename touch-up was direct. PK may want to bless this as
  the standing pattern for post-merge ledger-reconciliation commits, or route them through a
  worktree too, going forward.
- 9 older `generated`/no-`youtube_video_id` drafts exist (2026-04-09 through 2026-06-21),
  pre-dating this incident window and outside this repair's scope — not investigated further here.
