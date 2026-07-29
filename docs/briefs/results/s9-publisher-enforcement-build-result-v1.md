# Result — S9 Capability Enforcement, Objective 2 (publisher chokepoint)

**CLAIMED v6.68 · s9-publisher-enforcement · s9-publisher-enforcement · apply-deploy-complete · 2026-07-29T09:28:32.550Z**

**Date:** 2026-07-29 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Brief:** `docs/briefs/s9-publisher-enforcement-build-brief-v1.md`
**Packet:** `docs/briefs/artifacts/s9-publisher-enforcement-apply-deploy-packet-v1.md` (rev 3)
**Architecture:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §3
**Outcome:** ✅ **APPLIED + DEPLOYED + PROVEN.** All six guards live. Rollbacks proven. **NDIS remains paused.**

---

## 1. Live state

| # | Object | Boundary | Post-apply identity |
|---|---|---|---|
| 1 | cron job 48 `enqueue-publish-queue-every-5m` | enqueue (candidate) | command md5 **`faca2e873364216c55b46e2974a469cd`** |
| 2 | `m.gate_queue_on_asset_status()` | enqueue (INSERT) | **`1dbfe725dad28651db58d3c21d05f3d6`** |
| 3 | `m.publisher_lock_queue_v2()` | dequeue (FB + IG + LI) | **`bd265650265787adc47b88e19e1ce7c6`** |
| 4+5 | `youtube-publisher` SELECT + pre-claim UPDATE | dequeue (direct read) | **v1.16.0**, marker `youtube-publisher-s9-capability-enforcement` |
| 6 | `m.auto_approver_fetch_drafts()` | approval | **`2e64247ed8cbd59176e212f23c754e12`** |

Ledger rows written for **both** migrations (`20260729173000`, `20260729183000`) — the S5 lane's omission
was not repeated. Zero table DDL, zero GRANT/REVOKE, no new objects.

**A capability-blocked draft can no longer be published on Facebook, Instagram, LinkedIn or YouTube —
even if already approved, and even though YouTube is schedule-blind and bypasses the shared queue.**

## 2. Sequence executed

| # | Step | Evidence |
|---|---|---|
| 0 | Reconcile + pre-flight | rebased 4× as concurrent lanes landed; final base `7f52cc9`; 7 commits, all `(s9)`, explicit non-s9 grep = NONE; exact 7-file set; all 5 blob hashes matched; **all four live baselines matched** |
| 1 | **Apply cron 48 FIRST** (auditor G-1) | self-verifying: `(jobname, username)` + `INTO STRICT`, asserted pre-change md5 `4a78f1bd…`, post-change assertion `faca2e87…` inside the same transaction |
| 2 | Apply the three functions | **executable drift guard** asserted all three live baselines before any `CREATE OR REPLACE`; post-apply assertions on all three md5s — any mismatch would have aborted the transaction |
| 3 | Push | `7f52cc9..856b1b0`; full range re-inspected immediately beforehand (v6.52 rule); 0/0 parity after |
| 4 | Deploy `youtube-publisher` | `safe-deploy.sh --allow-warn` from the **lane worktree** with `supabase/.temp/*` copied in; drift refreshed **before** deploy (B-FD) |
| 5 | Verify | `deploy-verifier` **content PASS / overall PASS_WITH_FLAG**; drift refreshed after → **A-LE, 1.16.0 == 1.16.0, severity none** |
| 6 | Rollback proof | all four objects restored to exact baselines, then aborted |

Apply order mattered: applying the trigger first would have opened the very starvation window the cron
filter closes, for up to one 5-minute tick.

## 3. Proofs

**Live, against the applied guards, in an aborted transaction (no real queue row or draft consumed):**

```
enqueue: blocked draft   -> 0 rows inserted        (contamination prevented)
enqueue: NULL provenance -> retained with visible last_error reason
dequeue: blocked=0  ready=1  null_provenance=0     (blocked row was scheduled EARLIEST)
auto-approval: ready -> fetched   blocked -> NOT fetched
```

**Deploy content (`deploy-verifier`, recomputed from the live bundle, not from the plan):**
- marker present ×3 including the live `const S9_PUBLISHER_MARKER`
- `VERSION == youtube-publisher-v1.16.0`, **zero residual v1.15.0 literals**
- `verify_jwt == false`, confirmed from two independent endpoints
- sibling helper `asset_backstop.ts` shipped (its relative import resolves in-bundle)
- **exactly 2 occurrences** of the capability filter — one per entry point — and it verified
  `CAPABILITY_BLOCKED` resolves to a real value, ruling out a silent `${undefined}` that would have
  made the filter match nothing. That is the "declared control production never reads" failure class,
  checked for explicitly.

**Rollback (executed then aborted):** `publisher_lock_queue_v2` → `d3fa9f82…`, `auto_approver_fetch_drafts`
→ `1bf1dbf5…`, cron 48 → `4a78f1bd…`, `gate_queue_on_asset_status` → `f58c2e4d…`. All four exact.

> **Honest note on method.** My first rollback attempt reverse-derived the baselines by stripping the
> inserted blocks. Three of four restored exactly; the trigger did **not** — my string surgery was
> imperfect. That was a flaw in the ad-hoc test, not in the rollback file, which embeds the baseline
> verbatim. Re-run by executing the file's actual embedded body, it restored `f58c2e4d…` exactly. The
> rollback files are what would really run, so that is the test that counts.

**Regression:** `deno check` clean; **402 passed / 0 failed** excluding `image-worker`, whose single
failure is **pre-existing** (verified identical on a clean `origin/main`).

**Blast radius on apply: zero.** 835 queue rows, 0 NULL `post_draft_id`, 31 queued, 5 dangling (all
non-queued), 0 drafts blocked. All six guards are **inert on day 1** and purely forward-looking.

## 4. Review chain

| Gate | Verdict |
|---|---|
| `db-rls-auditor` (first) | **`block`** — F-1 cron 48 head-of-line starvation · F-2 unproven chained `.or()` · F-3 CRLF |
| `db-rls-auditor` (re-audit) | **`concerns`, ZERO must-fix** — F-1 fix confirmed, F-2 closure validated; G-1..G-7 raised |
| `branch-warden` | lane content clean at every check; `stop`s were environmental (origin drift, foreign unpushed commit) and resolved |
| `ask_chatgpt_review` | **`agree`** / medium / high, **zero pushback points**, `requires_pk_escalation=false`, decision `proceed` — `08661e17-7bb9-420a-b88c-f15c5590ef32`, pinned `ce3785bf…` |
| PK | **Approved for T3 apply/deploy** |
| `deploy-verifier` | content **PASS**, overall **PASS_WITH_FLAG** (drift flag since cleared) |

**F-1 was the lane's most important finding and I missed it.** cron 48 selects `DISTINCT ON
(client_id, platform)` oldest-first — one candidate per client-platform per tick — and dedupes on
`NOT EXISTS (queue row)`. Because the trigger suppresses the INSERT, no queue row is ever created, so a
blocked draft re-wins that single slot every tick forever: **enqueue permanently dead for that
client+platform**, starving healthy newer drafts. Reproduced and fixed, proven before/after:
`OLD picks c1b39e22…` (starved) → `NEW picks 4c1436e7…` (fixed).

**Narrowing the auditor added:** because `ai-worker` deliberately does not write `approval_status`, a
blocked draft normally stays `'draft'`, which cron 48's approval filter already excludes. Starvation
therefore requires a draft blocked **after** approval, or one manually approved — narrower than first
stated, but real and reachable via the dashboard approve RPC.

**G-1..G-6 all fixed** (apply order · provenance claim + a citation to a non-existent filename ·
`(jobname, username)` + `INTO STRICT` · executable drift guard replacing comment-only md5s · third
rollback hash · block comments inside the stored cron command). G-7 accepted as low.

## 5. Monitoring

```sql
-- blocked drafts held at the publisher boundary
SELECT final_format_authority, count(*) FROM m.post_draft
 WHERE final_format_authority='blocked_by_capability' GROUP BY 1;

-- queue rows held for unknown draft provenance (PK ruling 1: retained, not dropped)
SELECT queue_id, platform, post_draft_id, last_error FROM m.post_publish_queue
 WHERE last_error LIKE 'capability_hold:%';

-- the four enforcement identities (drift tripwire)
SELECT p.proname, md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='m' AND p.proname IN
  ('gate_queue_on_asset_status','publisher_lock_queue_v2','auto_approver_fetch_drafts');
SELECT md5(command) FROM cron.job WHERE jobname='enqueue-publish-queue-every-5m' AND username='postgres';
-- expect 1dbfe725… / bd265650… / 2e64247e… / faca2e87…
```

## 6. Scope boundary — read this before claiming coverage

**The four named platforms are enforced.** This is NOT "no publish path can emit a capability-blocked
draft": `wordpress-publisher` is **deployed**, direct-reads `m.post_draft`, and is **excluded by PK
ruling 2**. It remains a future caller/dequeue census item.

## 7. Carries

1. **`wordpress-publisher` uncovered** (above) — scope boundary, not a defect.
2. `draft_approve_and_enqueue_scheduled` returns `ok:true` even when the enqueue row was suppressed —
   an operator sees "approved and scheduled" for a draft that will never publish; only an ephemeral log
   warning records it. Product decision: refuse the approve, or surface the block.
3. No durable record of **suppression events** (per-draft evidence is durable; the count is not).
4. `publisher_lock_queue_v1/v2` + `auto_approver_fetch_drafts` have `proacl = NULL` (EXECUTE to PUBLIC),
   latent-contained by schema-`m` having no anon/authenticated USAGE. Unchanged here, but now better
   justified as its own T3 REVOKE lane since `v2` has become a safety control.
5. 5 dangling `post_draft_id` queue rows exist (all non-queued) — now fail-closed by design.
6. `20260729120000` (S5 classifier v2, the 7th status `publisher_path_missing`) is still **unapplied**;
   while dark, that status can never be a block reason.
7. **Service-role key rotation still outstanding** from the Objective 1 lane (transcript disclosure).

## 8. Not done

**NDIS remains PAUSED on all four platforms** — untouched. Containment release stays a separate,
per-platform, PK-ordered act (Facebook → Instagram → LinkedIn → YouTube last), each with its own live
proof. This lane released nothing. WordPress, Layer 3 render-dispatch, R3a→R3c and the dashboard UI
remain out of scope.

**S9 Capability Enforcement Objectives 1 and 2 are now both LIVE.** The remaining arc is the
per-platform containment release.
