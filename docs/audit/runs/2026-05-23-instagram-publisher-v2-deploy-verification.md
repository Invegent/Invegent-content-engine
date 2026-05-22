# Evidence Memo — Instagram true-stuck pool / `instagram.publisher.v2_deployed_cron_paused`

**Date:** 2026-05-23
**Mode:** read-only verification (no deploy, no invoke, no cron change, no Supabase mutation)
**Supabase project:** `mbkmaxqhsohbtwsqolns` (content_engine)
**Repo HEAD at verification:** `7005865187…` (`main`); memo committed on `main` at the following commit.
**Pool key (corrected):** `instagram.publisher.v2_deployed_cron_paused` — supersedes the earlier working hypothesis `instagram.publisher.v2_undeployed`, which was wrong on the "undeployed" claim.

---

## Headline

Production **is** running the v2.0.0 repaired Instagram publisher. The true-stuck pool is the result of **deliberate containment** (paused crons + per-client disable), **not** missing/undeployed code.

- **Deployed-source verified ≠ controlled-drain verified.** This memo establishes the former only. No drain has been run or validated.
- **Triage action remains `track` (not `act_now`).** Do not unpause until PK approves a controlled-drain plan.

---

## A. Does HEAD source implement the v2.0.0 repair? — YES (source-verified)

File: `supabase/functions/instagram-publisher/index.ts`. Introduced by commit **`562ab3e4`** ("v2.0.0 queue-based refactor — closes M12"); predecessor v1.0.0 = **`1a74f23`**. The file is unchanged between the verification HEAD and the memo-commit HEAD (`git diff` empty); raw blob sha256 = `80683929ab8d31234a141200516c0c5ffd630e1467f319d89fb3f2cbd7b3dea4`.

| Repair claim | Evidence (line range) | Verdict |
|---|---|---|
| Queue-based selection; **no** direct unbounded `m.post_draft` read | RPC lock `259-266`; draft loaded **by `post_draft_id` from the locked queue row** `353-358` | ✅ |
| Atomic queue lock via `m.publisher_lock_queue_v1` | `259-266` (`p_platform:'instagram'`); error gate `268` | ✅ |
| Platform double-check on **queue row** AND **loaded draft** | queue-row check `283-292`; draft safety-net `363-383` | ✅ |
| `max_per_day` / `min_gap_minutes` throttle | delegated to the RPC (comment `253-258`); verified in DB — see §B | ✅ (in DB) |
| Image / video / carousel hold gates | image 30-min (`33`, `418-452`); video 60-min (`454-478`); carousel 3-step (`505-540`) + single-image fallback (`513-523`) | ✅ |
| Success → record publish + promote draft to `approval_status='published'` | `post_publish` insert `561-580`; queue→`published` `582-587`; draft→`published` `589-592` | ✅ |
| Failure/backoff that does not loop-republish | 10-min requeue + `last_error` `606-618`; failed audit row `621-634` | ⚠️ mostly — see Remaining Risks 1–2 |

**v1.0.0 root cause confirmed verbatim** (`git show 1a74f23:supabase/functions/instagram-publisher/index.ts`, lines ~140-162): selected
`FROM m.post_draft pd WHERE pd.client_id='…' AND pd.approval_status='approved' … ORDER BY pd.created_at ASC LIMIT 3`
via `exec_sql`, with **no `pd.platform='instagram'` filter** and bypassing the publish queue entirely. That is the M12 cross-post bug (FB-platform drafts published to the NDIS Yarns Instagram account, 19 Apr 2026).

## B. Can we prove production runs that repaired source? — YES (deployed-source verified)

`get_edge_function` read the deployed `instagram-publisher` source; deployed source is version **`instagram-publisher-v2.0.0`** and contains the M12 guards: **queue lock, queue-row platform check, draft-platform safety net, throttle via `publisher_lock_queue_v1`→`v2`, and auto-promote-to-published on success.**

Deployment fingerprint (`list_edge_functions` / `get_edge_function`):

```
edge fn id     886f031d-5f57-44df-add8-b9af7cf2db65   slug instagram-publisher
version        32        status ACTIVE        verify_jwt false
updated_at     2026-04-25 08:00:48 UTC   (matches D169 / the 25-Apr v2.0.0 deploy)
created_at     2026-04-13 21:37:07 UTC
ezbr_sha256    a583e6b399d988f927c3bac9ae200063e1c9c8a2a7062db55f873c6b6dc86167
```

**Scope of this proof (no overclaim):** equivalence is asserted at the level of the deployed source's `VERSION` constant and the presence of every M12 guard listed above, read directly from the deployed function. A **byte-for-byte diff of the deployed eszip bundle against HEAD was not performed** (`ezbr_sha256` is a bundle hash, not the raw-file hash `80683929…`, so the two are not directly comparable). "Deployed source is v2.0.0 with the M12 guards" is verified; "deployed bundle is byte-identical to HEAD" is **not** claimed.

**DB-side guards verified** (`pg_get_functiondef`, read-only):

- `m.publisher_lock_queue_v1` is a **thin compatibility shim** — body is `SELECT * FROM m.publisher_lock_queue_v2(p_limit, p_worker_id, p_lock_seconds, p_platform)`. So `v1('instagram')` routes into `v2`; there is **no v1/v2 version-skew risk** for IG.
- `m.publisher_lock_queue_v2` body confirms: platform filter `p_platform IS NULL OR q.platform = p_platform`; `for update of q skip locked`; atomic `status='running'` + `attempt_count = coalesce(attempt_count,0)+1`; `min_gap_minutes` gate; `max_per_day` gate **plus** per-partition remaining-cap filter (`rn <= GREATEST(0, max_per_day - published_today)`, commented "Bug 2 fix"); a **`cpp.publish_enabled = true`** eligibility gate; and a `paused_until` gate.
- Both functions: signature `(p_limit integer, p_worker_id text, p_lock_seconds integer, p_platform text) RETURNS SETOF m.post_publish_queue` — IG's 4-arg call is valid.

**Behavioural corroboration:** the only post-deploy IG activity in `m.post_publish` (2026-05-01 00:00 & 00:15 UTC) were **failures with IG-API errors** (`code 4 Application request limit reached`; `code 9007 Media ID is not available`) — **no `platform_mismatch` / `draft_platform_mismatch`**. Last *successful* IG publish: 2026-04-25; none since.

## C. Is the pool correctly triaged? — action `track` is correct; the old `pool_key` was not

Live containment (read-only `cron.job`):

```
53  instagram-publisher-every-15m        active=false   (*/15)
64  seed-and-enqueue-instagram-every-10m active=false   (*/10)
11  seed-and-enqueue-facebook-every-10m  active=false   (whole enqueue layer is paused)
65  seed-and-enqueue-linkedin-every-10m  active=false
```

IG `m.post_publish_queue` true-stuck pool + per-client IG profile state (`c.client_publish_profile`):

| client | slug | IG `publish_enabled` | queued | dead | drains on unpause? |
|---|---|---|---|---|---|
| `93494a09` | invegent | **true** | 16 | 6 | ✅ yes |
| `3eca32aa` | care-for-welfare-pty-ltd | **true** | 17 | 7 | ✅ yes |
| `fb98a472` | ndis-yarns (cross-post victim) | **false** | 40 | 94 | ❌ RPC won't lock it |
| `4036a6b5` | property-pulse | **false** | 50 | 67 | ❌ RPC won't lock it |

Totals: **123 queued, 174 dead.** All four profiles: `paused_until=null`, `max_per_day=2`, `min_gap_minutes=240`, destination_id + page_access_token present.

Operational consequence: **unpausing cron 53 alone would drain only invegent + care-for-welfare (~33 queued rows), throttled to ≤4 IG posts/day total** (2/client/day, 4-hour gap). NDIS Yarns + Property Pulse (90 queued rows) stay put until their profiles are re-enabled — the RPC's `publish_enabled = true` gate means they are never even locked. The throttle makes an accidental flood / re-incident structurally implausible.

## D. Steps required before any future unpause (pre-unpause checklist)

1. **PK approval** of a controlled-drain plan. This memo is read-only; nothing was changed.
2. Re-key the friction pool to `instagram.publisher.v2_deployed_cron_paused`; **do not close Q-005**.
3. Confirm scope: unpause **cron 53 only**, keep NDIS Yarns + Property Pulse `publish_enabled=false`, keep cron 64 paused for the first drain.
4. (Recommended) dry-run first: `POST {"limit":2,"dry_run":true}` — locks rows, runs validation, publishes nothing (sets `last_error='dry_run_ok'`). Requires PK; this counts as invoking the publisher and is **outside** this read-only memo.
5. Unpause: `SELECT cron.alter_job(53, active := true);` then verify `active=true`.
6. Watch first 2–3 ticks: `cron.job_run_details` (jobid 53) = succeeded; `m.post_publish` (platform='instagram', last 30 min) — **assert every row has `pd.platform = pp.platform`**; watch for `code 4` rate-limit. Expect ≤4 publishes/day total.
7. Decide separately on NY/PP profile re-enable + their 90-row backlog, and on the duplicate-window / no-cap risks below, before widening the drain.

---

## Remaining risks (carry into any drain plan)

1. **Narrow duplicate-publish window (EF logic).** If `media_publish` succeeds (post is live on IG) but a subsequent DB write throws, the `catch` (`606-618`) requeues the row as `status='queued'` and a later tick can re-publish → duplicate IG post. No idempotency key on container creation. Mitigate with small batches + monitoring. (A success-but-uncommitted row left in `status='running'` is *not* re-selected — the RPC requires `status='queued'` — so that sub-case orphans rather than duplicates.)
2. **No max-attempt cap in the EF.** The failure path requeues indefinitely (10-min backoff) and never sets `dead`; the 174 existing `dead` rows were terminated by another sweeper, not this function. Persistently-failing rows (e.g. `code 9007 Media ID not available`) loop ~every 10–15 min and emit a `failed` audit row each tick.
3. **Meta app rate-limit exposure.** The 25-Apr & 1-May failures include `code 4 Application request limit reached`. The `max_per_day=2` / `min_gap=240m` throttle strongly mitigates, but a wide drain could still trip app-level limits.
4. **Carousel path uses string-interpolated `exec_sql`** (`507-511`, `WHERE post_draft_id='${q.post_draft_id}'`). Low risk (system-controlled UUID) but a latent injection-shaped pattern; carousel remains untested against real IG containers (per D169).
5. **Whole enqueue layer remains paused** (jobs 11/64/65). Unpausing only 53 drains existing queued rows; new IG drafts still arrive via the M11 approval trigger, not cron 64.

---

## `/operations` triage note — Instagram pool

```
triage_state: acknowledged
category: pipeline_integrity
quality_flag: yes
action_decision: track
next_review_at: PENDING — set to the PK-approved controlled-drain review date (no date authorized in this directive)
capture_reason: would_have_rediscovered
capture_reason_note: Rediscovered manually as a repeated Instagram true-stuck pool before pooled root-cause view existed.

pool_key: instagram.publisher.v2_deployed_cron_paused
diagnosis_confirmed: get_edge_function read deployed instagram-publisher source; deployed source is version
  instagram-publisher-v2.0.0 and contains M12 guards: queue-lock via publisher_lock_queue_v1->v2,
  queue-row platform check, draft-platform safety net, throttle, and auto-promote-to-published on success.
  Pool is stuck due to deliberate containment: jobid 53 publisher active=false, jobid 64 enqueuer
  active=false, and NY/PP IG profiles publish_enabled=false. Not a missing-code issue.
status: v2.0.0 deployed-source verified; controlled drain not yet verified. Do not unpause until PK approves
  drain plan.
action_decision: track
repair_candidate: controlled unpause of jobid 53 only after PK-approved drain plan; keep NY/PP disabled
  initially; observe invegent+CFW under throttle before widening.
remaining_risks: narrow duplicate window if IG publish succeeds but DB write fails; no EF max-attempt cap;
  prior Meta rate-limit errors; carousel SQL interpolation pattern; enqueue layer remains paused.
```

---

## Provenance (commands / sources used; all read-only)

- `git rev-parse HEAD`; `git show 562ab3e4 --stat`; `git log --follow -- supabase/functions/instagram-publisher/index.ts` → only `562ab3e4` + `1a74f23` touch it.
- `git show 1a74f23:supabase/functions/instagram-publisher/index.ts` → v1.0.0 draft-selection bug.
- Read of `supabase/functions/instagram-publisher/index.ts` @ HEAD (line ranges above).
- Supabase MCP (read-only): `list_projects`, `list_edge_functions`, `get_edge_function(instagram-publisher)`.
- Supabase MCP `execute_sql` (SELECT/catalog only): `pg_proc`/`pg_get_functiondef` for `publisher_lock_queue_v1`/`_v2`; `cron.job` (jobs 11/53/64/65); `m.post_publish_queue` IG status breakdown; `m.post_publish` latest IG rows; `c.client` + `c.client_publish_profile` for the 4 IG clients.
- Decision/brief context: `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md`; `docs/briefs/2026-04-25-cc-task-instagram-publisher-v2-verify.md`.

**No production mutation occurred.** No deploy, no function invocation, no cron change, no Supabase write, no friction.case/friction.event write, Q-005 left open.
