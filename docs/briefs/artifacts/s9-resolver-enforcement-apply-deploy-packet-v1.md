# S9 Resolver Enforcement — Apply / Deploy / Rollback packet (Gate-2 candidate)

**Lane:** S9 Capability Enforcement · Objective 1 (resolver chokepoint, Layers 1+2)
**Brief:** `docs/briefs/s9-resolver-enforcement-build-brief-v1.md`
**Architecture:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` (PK-approved 2026-07-28, five rulings)
**Tier:** T3 · **Lane class:** SAFETY_GATE
**Branch:** `lane/s9-resolver-enforcement` (isolated worktree, off `origin/main` @ `2b5e44b`) — **local only, not pushed**
**Status:** BUILD COMPLETE — **STOPPED AT THE PK APPLY/DEPLOY GATE. Nothing applied, deployed, merged or pushed.**

> ## ⛔ THIS PACKET IS NOT READY TO APPLY AS-IS — see §1.
> A build-time live measurement found a **production-stopping false positive** in the
> approved design. The build is complete and correct against the approved specification;
> the *specification* has a gap. PK must rule on §1 before any apply.

---

## 0. Artifacts (pin these hashes)

| Artifact | sha256 |
|---|---|
| `supabase/migrations/20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql` | `04e30ae168700cad848ca45cce3a5f344dfa08a2093e5b4a8230f71e77c3f0f2` |
| `supabase/migrations/ROLLBACK_20260729143000_…sql` | `36898b07ba7b378323634d78c1785ef75da38809be0fae9e8bab5d5ee246c0d7` |
| `supabase/functions/ai-worker/index.ts` (v2.25.0) | `24cf5dd7b0ab479d6d15c93e779260df9429159dd7de55beec50226ca8ec6361` |
| `supabase/functions/ai-worker/capability_enforcement_test.ts` | `2b73976228c6ab2d3c2e195ef540b17ea31ba712ca5f5e8865c0b47134e50d28` |

Change set is exactly 4 files (2 new migrations, 1 modified EF, 1 new test). Zero out-of-scope files.

**Baseline provenance (verified, not assumed):** live `m.fill_pending_slots` `prosrc` md5 =
`afd62a2116d23cb0a03d089d108e6a36`, length 27080 — **byte-identical** to
`supabase/migrations/20260613020000_t1_creative_intent.sql`. No drift; the repo baseline was
safe to edit from.

---

## 1. ⛔ BLOCKER — the gate would stop all plain-text posting (PK decision required)

**This was not predicted by the architecture packet and is the single most important finding of this build.**

`text` is a **template-less format by design** — a plain text post has no visual template.
`public.select_template(<client>, <platform>, 'text', NULL, NULL)` therefore returns
`fail_closed` / `format_unmapped` with an **empty `rejected[]`**. Because text posts also publish
successfully and at high volume, the classifier's silent-degrade overlay (which is *precedence-first*)
fires, and the cell classifies **`unsupported_silent_degrade`**.

Under the approved Layer 1/Layer 2 rule (*anything `<> 'ready'` blocks*), that means **every plain-text
post is blocked** — for every client.

Live evidence (2026-07-29, read-only):

```
classify_format_capability('property-pulse','linkedin','text')
  -> status = unsupported_silent_degrade
     reason_code = format_unmapped
     evidence.publish_count = 69        (last 90 days)
     evidence.latest_published_at = 2026-07-17
     select_template_status = fail_closed, rejected = []
```

`text` publish volume in the last 90 days — the healthiest, highest-volume path in the system:

| client | platform | published (90d) |
|---|---|---|
| ndis-yarns | linkedin | **71** |
| property-pulse | linkedin | **69** |
| invegent | linkedin | **48** |
| ndis-yarns | facebook | 21 |
| care-for-welfare-pty-ltd | linkedin | 11 |

This **directly contradicts architecture packet §5 release criterion 5**, which names
"LinkedIn `text`" as an example of governed-Ready steady state that must classify `ready`.
It does not. The criterion as written **cannot be met** with the classifier as it stands.

### 1.1 What would actually happen on apply, today

Measured across every `pending_fill`/`future` slot that would **actually reach** the S9 gate
(i.e. that passes the pre-existing cc-0019 publish-eligibility gate):

| outcome | slots | detail |
|---|---|---|
| `ready` → unaffected | **85** | image_quote / carousel across invegent, care-for-welfare, property-pulse |
| **blocked** | **16** | of which **7 are `text`** (6 property-pulse LinkedIn, 1 property-pulse Facebook) |

The other 9 blocked slots are property-pulse YouTube `video_short_kinetic` (4),
`video_short_stat_voice` (3), `video_short_kinetic_voice` (2) — all
`unsupported_silent_degrade`, all arguably *correct* blocks (these are the real silent-degrade class
this lane exists to close).

### 1.2 Operationally important, and slightly counter-intuitive

**Every NDIS slot is currently cc-0019-ineligible** (the 4-platform containment pause sets
`paused_until=2027-01-01`, so `m.is_publish_eligible` returns false and the pre-existing gate fires
*before* the new one). Confirmed in the dry run below.

⇒ **While containment holds, applying this changes nothing for NDIS.** Its entire immediate live
effect lands on **Property Pulse**. That is the opposite of the intuition that this is "the NDIS lane",
and it should be explicit in the apply decision.

### 1.3 Options for PK (I have not chosen one — this is a `policy_decision` + classifier-coverage defect)

| # | Option | Notes |
|---|---|---|
| **A** | **Exempt template-less formats at the gate.** The format registry already carries a clean discriminator: `t."5.3_content_format".render_engine = 'none'`, which today is true for **`text` and nothing else** (`output_mime_type='text/plain'`). Gate would read: block only if non-ready **and** the format requires a render engine. | Smallest, registry-grounded, no classifier change. Narrow and auditable. Recommended starting point. |
| **B** | **Fix the classifier** so a template-less format returns `ready` (or a new `not_applicable`). | Correct at the root, but changes a shared contract two other consumers (S2 dashboard, S8 register) already read — a wider blast radius and its own T3 lane. |
| **C** | Apply as-is and accept text posting stopping. | Not recommended; ~220 publishes/90d across 5 client-platform cells. |
| **D** | Apply Layer 2 only, hold Layer 1. | Does not help — Layer 2 blocks `text` identically, and `'text'` is the *default* `decidedFormat` for five of the eleven documented fallback paths. |

**I did not implement any of these.** Adding a `text` carve-out unilaterally is exactly the class of
silent exception PK ruling 3 exists to prevent, and choosing between A and B is a contract decision,
not a build detail. The build implements the approved spec faithfully; the spec needs a ruling.

---

## 2. What was built (both layers, per the approved design)

### Layer 1 — `m.fill_pending_slots` (migration `20260729143000`)

One fail-closed gate, inserted immediately **after** the existing cc-0019 gate and **above** the T0
manual branch (so manual and automated slots are gated uniformly — PK ruling 2026-07-29, no carve-out).

- Resolves `client_slug` from `v_slot.client_id` (the function otherwise works purely in uuid; the
  classifier is slug-keyed). **This was a required addition named by the brief's specialist review.**
- Calls `public.classify_format_capability(slug, platform, COALESCE(format_preference[1],'image_quote'))`.
- `ready` → behaviour byte-for-byte unchanged. Anything else → **skip with evidence, then `CONTINUE`**
  before any pool query, skeleton draft, `ai_job`, or token spend. **No re-pick, no substitution.**
- Blocked state (zero DDL, existing columns only):
  - `m.slot.status='skipped'`, `skip_reason='capability_blocked:<status>:<format>'`
  - `m.slot_fill_attempt.decision='skipped'`, same `skip_reason`,
    `pool_snapshot={gate,client_slug,capability:<full classifier jsonb>}`,
    `error_message=<SQLSTATE/SQLERRM>` on the exception path only.
  - `m.slot.format_chosen` is **not** overwritten; no `post_draft` row is created, so
    `video_status`/`approval_status`/publish statuses are untouched **by construction**.

**Per-slot fault isolation (brief must-fix, both constraints honoured):** the `BEGIN…EXCEPTION WHEN
OTHERS` block wraps **only the classifier call** — not the surrounding slot logic — so it cannot mask an
unrelated defect; and the exception is **never re-raised** (re-raising would abort the whole batch
transaction and roll back other clients' already-filled slots in the same 10-minute tick).
`SQLSTATE`/`SQLERRM` are captured to `error_message` **and** emitted via `RAISE WARNING`, so a real
recurring classifier defect stays distinguishable from an expected non-ready classification.

### Layer 2 — `ai-worker` v2.24.1 → **v2.25.0** (marker `ai-worker-s9-capability-enforcement`)

One classifier call on **both** draft paths:

- **Main path** — after the Advisor's pick and after all three unconditional pins (A2 avatar,
  cc-0084 dialogue, schedule-authority `video_short_stat`), so it is the true last word regardless of
  which of the 11 documented fallback paths produced `decidedFormat`; and **before**
  `writeVisualSpec`/`assemblePrompts`/the LLM call and before any video-script or dialogue generation
  ⇒ a blocked draft incurs **zero** generation cost (PK ruling 2026-07-29, short-circuit).
- **Evergreen path** — architecture §1.3 fallback **#6**, which writes `recommended_format` directly
  from `input_payload.format` and bypasses Advisor + resolver entirely, so it carries its own copy of
  the gate; the main-path check can never see it.

Blocked-state write (PK ruling 3 — existing format-authority columns only, zero DDL):

| field | value | why |
|---|---|---|
| `recommended_format` | **`NULL`** | **Never a substitute.** Every renderer/publisher keys off an exact value (`heygen-worker .eq('recommended_format','video_short_avatar')`, `video-worker IN (...)`), so `NULL` matches none ⇒ unreachable downstream by construction. Column is nullable, FK-only (FKs permit NULL) — re-verified live. |
| `requested_format` | preserved unconditionally | what was actually asked for |
| `final_format_authority` | `'blocked_by_capability'` | free-text column, no CHECK enum — re-verified live |
| `final_format_reason` | `'<status>:<reason_code>'` | classifier's own values |
| `resolver_evidence` | full classifier jsonb **verbatim** | never re-derived locally |

**Deliberately NOT written** — each omission is load-bearing:
- `approval_status` — the skeleton row stays `'draft'`, so `m.auto_approver_fetch_drafts`
  (`WHERE approval_status='needs_review'`) **cannot see it**. Writing `'needs_review'` here would hand
  a capability-blocked draft straight to the auto-approver. *(The full auto-approver guard remains the
  separate publisher brief's job; this is the resolver-side half of that protection.)*
- `video_status`, any publish-failure status, `draft_title`/`draft_body` — no render failed, no
  approval decision was made, no generation ran.

`ai_job` → **`'cancelled'`**, not `'failed'`: `pipeline-fixer` re-queues `'locked'`
(`index.ts:49-59`) and dead-letters `'failed'` (`:136-146`) but **never touches `'cancelled'`**, so a
capability block cannot enter a retry or dead-letter loop (the cc-0040 failure class).
`m.slot` → `'skipped'` + the same `capability_blocked:<status>:<format>` code.

**Fail-closed everywhere:** RPC error, throw, unresolvable `client_slug`, or an unrecognised classifier
payload all classify as **not ready**. No branch anywhere turns a failure into `ready`.
The ready test is **generic** (`status === 'ready'`) — blocked statuses are never enumerated, so the
7th status (`publisher_path_missing`) and any future 8th are covered **by construction**, with no list
to update. This is asserted by two dedicated tests.

---

## 3. Verification performed (all read-only or transaction-aborted)

| Check | Result |
|---|---|
| `deno check` on `ai-worker/index.ts` | **clean** |
| New hermetic suite `capability_enforcement_test.ts` | **11/11 pass** — ready-unchanged · canonical blocked write · rpc-error · rpc-throw · unresolved-slug (and proves the classifier is *not* called) · slug-throw · 5 unrecognised payload shapes · absent format · `publisher_path_missing` · hypothetical future status · reason-string formats |
| Full `ai-worker` suite (regression) | **75/75 pass, 0 failed** |
| Layer 1 SQL compiles & installs | **PASS** — rebuilt in-DB from live `prosrc` inside an aborted transaction; resulting `prosrc` md5 = `e1544399ffa84ef2312cddc2c0689b24`, **exactly equal** to the migration artifact's body ⇒ the file PK will apply is byte-identical to what was compile-tested |
| Layer 1 behaviour dry run (transaction aborted via `RAISE EXCEPTION`) | **PASS** — `processed=3`; a **ready** LinkedIn `image_quote` slot filled normally with an `ai_job` enqueued (**zero regression on the governed-ready steady state**); two NDIS slots were skipped `publish_path_disabled` by the *pre-existing* cc-0019 gate, confirming correct gate ordering and §1.2 |
| Rollback identity | **PASS** — rollback file's embedded body hashes to `afd62a2116d23cb0a03d089d108e6a36`, exactly the live baseline |
| Change-set scope | **PASS** — exactly the 4 intended files |
| Build-time verify items (architecture §7 items 3–4) | **RESOLVED, no DDL** — `recommended_format` nullable + FK-only (no `NOT NULL`); `final_format_authority` free `text` (no CHECK). Re-confirmed live this session, not carried from the brief. |

**Nothing was applied, deployed, merged, or pushed.** Both DB exercises ran inside transactions that
were aborted; the dry run deliberately terminated with `RAISE EXCEPTION` so the abort is guaranteed
rather than relying on an explicit `ROLLBACK` reaching the server.

---

## 4. Apply / deploy plan (for PK — **do not run until §1 is ruled on**)

**Order: migration first, then EF deploy.** Unlike the R3a lane, order is *not* hard here — neither
sequence produces an inconsistent state, because the two layers are independent chokepoints on the
same signal. Migration-first is preferred only because it stops the work earlier (cheaper); Layer 2
is the backstop for anything already past fill.

**Pre-apply STOP conditions (any one trips ⇒ abort, void the remainder, return to PK):**
1. `SELECT md5(prosrc) …` for `m.fill_pending_slots` ≠ `afd62a2116d23cb0a03d089d108e6a36` (baseline moved).
2. Any artifact sha256 in §0 ≠ the value pinned there.
3. `origin/main` has moved to a commit not reviewed here.
4. `public.classify_format_capability` acl ≠ `{postgres=X/postgres,service_role=X/postgres}`.
5. `recommended_format` has gained a `NOT NULL`, or `final_format_authority` a CHECK.
6. Any change set beyond the 4 files in §0.

**Step 1 — apply Layer 1**
```
supabase/migrations/20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql
```
Post-apply assertion (must return `e1544399ffa84ef2312cddc2c0689b24`):
```sql
SELECT md5(prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='m' AND p.proname='fill_pending_slots';
```
⚠ **Ledger discipline** — `apply_migration` mints its own version. If applied via `execute_sql`, insert
the `supabase_migrations.schema_migrations` row explicitly. The concurrent S5 lane
(`20260729120000`) **skipped this and left a real provenance gap** (recorded in v6.52); do not repeat it.

**Step 2 — push, then deploy `ai-worker`**
- ⚠ **The drift gate hashes GitHub `main`, not the local worktree** — the code must be **on `origin/main`
  before deploying**, or `drift-check` compares against the wrong source.
- ⚠ **`supabase functions deploy` bundles from the CWD, not from HEAD** — deploy from a checkout that
  actually contains v2.25.0, or old code ships.
- ⚠ Before pushing: `git fetch` and inspect the **full** `origin/main..HEAD` list, not just this lane's
  commit (the v6.52 corrective rule — a concurrent session's commit was bundled into a push on
  2026-07-29 by skipping exactly this check).
```bash
scripts/safe-deploy.sh ai-worker --allow-warn
```
`verify_jwt=false` is already set for `ai-worker` in `supabase/config.toml:86-87`; confirm it is still
`false` after deploy (a flip breaks `x-series-key`-only callers 401→502).
Then refresh drift: `drift-check?write=true&slug=ai-worker`.

**Step 3 — post-deploy verification**
- `deploy-verifier` on `ai-worker`: expect marker `ai-worker-s9-capability-enforcement` present in the
  deployed bundle, `VERSION == ai-worker-v2.25.0`, `verify_jwt == false`.
- Live signal query for the new state:
```sql
SELECT final_format_authority, final_format_reason, count(*)
  FROM m.post_draft WHERE final_format_authority='blocked_by_capability'
 GROUP BY 1,2 ORDER BY 3 DESC;

SELECT skip_reason, count(*) FROM m.slot
 WHERE skip_reason LIKE 'capability_blocked:%' GROUP BY 1 ORDER BY 2 DESC;
```

## 5. Rollback

| Layer | Rollback | Proven |
|---|---|---|
| Layer 1 | `ROLLBACK_20260729143000_…sql` — `CREATE OR REPLACE` restoring the exact pre-change body | Body hash-verified `afd62a21…` == live baseline; verify command embedded in the file header |
| Layer 2 | redeploy the prior `ai-worker` (v2.24.1) | version-bump revert; no data backfill needed or proposed |

**No data is un-written by either rollback.** Slots skipped `capability_blocked:…` and drafts marked
`blocked_by_capability` remain as historical fact — consistent with every other `skip_reason` code,
none of which are retroactively cleared. Rollback restores *future* behaviour only.

**Concurrency (evidenced, not assumed):** `m.fill_pending_slots` runs via `cron.job` **jobid 75**,
`*/10 * * * *`, as `postgres` (verified live). PostgreSQL resolves a `plpgsql` body at the start of each
individual call; `CREATE OR REPLACE` takes a brief catalog lock but does not alter or abort a call
already in progress. An in-flight tick completes on the body it started with; the next tick (≤10 min)
picks up the new definition. No partial-execution or mixed-body risk, and **no need to pause the cron
job** — for either the forward apply or the rollback.

**Boundary:** rollback of this build is fully independent of the live 4-platform NDIS containment
pause. That pause's rollback is a separate, per-platform, PK-ordered act (architecture §5) and is
untouched here.

---

## 6. Explicitly NOT done (scope held)

Publisher-side enforcement (`m.publisher_lock_queue_v2` predicate, the YouTube two-edit
dequeue/claim change, the `auto-approver` guard) · WordPress · Layer 3 render-dispatch · R3a→R3c ·
dashboard UI · any change to `select_template`, `resolve_slot_assets`, or the classifier body ·
lifting any part of the NDIS containment pause · `lane/s9-cta-text-bounded-regen`.

Avatar remains paused; nothing in this change alters that.

## 7. Carries surfaced (not fixed here)

1. **§1 blocker** — needs a PK ruling before apply.
2. `20260729120000` (S5 classifier extension) still has **no `schema_migrations` ledger row** — that
   timestamp remains free for a future collision. Belongs to that lane; re-confirmed still open.
3. `youtube-publisher`'s fail-open `paused_until` preload (`try{}catch(_){}`) — architecture §1.4,
   named as a YouTube-release co-requirement, out of scope here.
