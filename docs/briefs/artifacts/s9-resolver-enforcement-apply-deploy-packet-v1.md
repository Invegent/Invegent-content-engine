# S9 Resolver Enforcement — Apply / Deploy / Rollback packet

**Rev 3 (2026-07-29)** — PK ruling **"Option A"** (template-less carve-out), **narrowed** per
`db-rls-auditor` findings SF-1 (status-class scope) and SF-2 (`is_active` filter); rebased onto
current `origin/main`.

**Lane:** S9 Capability Enforcement · Objective 1 (resolver chokepoint, Layers 1+2)
**Brief:** `docs/briefs/s9-resolver-enforcement-build-brief-v1.md`
**Architecture:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` (PK-approved 2026-07-28, five rulings)
**Tier:** T3 · **Lane class:** SAFETY_GATE
**Branch:** `lane/s9-resolver-enforcement` (isolated worktree) — **rebased onto `origin/main` @ `b7568ce`, 3 ahead / 0 behind. Local only, not pushed.**
**Status:** BUILD COMPLETE, rev-3 re-cut and re-proven — **STOPPED AT THE PK APPLY/DEPLOY GATE.
Nothing applied, deployed, merged or pushed.**

> **Rev-1 blocker §1 (`text` would be blocked for every client) is RESOLVED** by PK ruling Option A,
> implemented and proven below. **One open item remains for PK: §1A (capability-skipped slots are
> terminal)** — now much smaller in scope, but still a decision, not a defect.

---

## 0. Artifacts (pin these hashes — **all changed again in rev 3**)

| Artifact | sha256 (LF-canonical — see note) |
|---|---|
| `supabase/migrations/20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql` | `0d15dfe422a81aa2734afc14b6503328ffdeae0bc9120f94f0b8537e9d7ed09b` |
| `supabase/migrations/ROLLBACK_20260729143000_…sql` | `3e53b34afe31d7812463c65a453a30b86e91646b0ad9e12849f6a89b58e29af6` |
| `supabase/functions/ai-worker/index.ts` (v2.25.0) | `4604c06a706ee1f274db910e205933e900d3a192818ef1f6849b88da217cac24` |
| `supabase/functions/ai-worker/capability_enforcement_test.ts` | `fb328fac894f7f3ef4282a59b65239b5269215aebcf20900a735b0bfa570bb6b` |

Change set is exactly 5 files (2 migrations, 1 modified EF, 1 new test, this packet). Nothing out of scope.

> **⚠ LINE ENDINGS — READ BEFORE APPLYING.** The repo sets `* text=auto`, so git stores **LF** while a
> Windows checkout renders **CRLF**. The hashes above are of the **LF/git-blob** content; verify with
> `git show HEAD:<path> | sha256sum`, **not** by hashing the Windows working-tree file.
> **The migration must be applied as LF.** Applying CRLF content still works functionally, but the
> resulting `prosrc` contains carriage returns, so the post-apply `md5` assertion in §4 would fail and
> trip a STOP for the wrong reason. If applying by copy-paste, strip carriage returns first.

**Baseline provenance (verified, not assumed):** live `m.fill_pending_slots` `prosrc` md5 =
`afd62a2116d23cb0a03d089d108e6a36`, length 27080. The migration's embedded pre-change body matches
that **exactly**.
*(Rev-1 also claimed byte-identity with `20260613020000_t1_creative_intent.sql`; `db-rls-auditor`
correctly flagged that as imprecise — the repo file is CRLF, so it matches only after newline
normalisation. The authoritative comparison is the LIVE `prosrc`, which matches exactly. Claim withdrawn.)*

**Migration identity:** `20260729143000` was **never applied** and holds **no `schema_migrations` ledger
row** (re-verified), so re-cutting it in place is not a rewrite of an applied migration and does not
violate the migration-name-is-permanent-identity rule.

---

## 1. ✅ RESOLVED — template-less carve-out (PK ruling: Option A)

**The problem (rev 1):** `text` is template-less by design, so `select_template` legitimately fail-closes
`format_unmapped` with an empty `rejected[]`; because text posts publish heavily, the classifier's
precedence-first silent-degrade overlay returned `unsupported_silent_degrade`. Under the approved
`<> 'ready'` rule that would have blocked **all plain-text posting** (~220 publishes/90d).

**The ruling:** carve out `render_engine='none'` at the gate.

**What was built.** One new read-only accessor, used by **both** layers so the exempt set has a single
source of truth and cannot drift between them or from the registry:

```sql
CREATE OR REPLACE FUNCTION public.is_capability_exempt_format(p_format text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM t."5.3_content_format" fmt
                  WHERE fmt.ice_format_key = p_format
                    AND fmt.render_engine  = 'none'
                    AND fmt.is_active      = true);
$fn$;
```

Audit the entire exempt set with one query — **it is never hardcoded in a worker**:

```sql
SELECT ice_format_key FROM t."5.3_content_format"
 WHERE render_engine='none' AND is_active=true;
-- -> 'text'   (output_mime_type='text/plain'), and nothing else across 13 populated rows
```

**Why a function rather than an inline query in each layer** — this is the one thing the ruling did not
specify and it is not cosmetic: **schema `t` grants USAGE to `postgres` / `inspector_ro` / `retool_ui`
only, NOT `service_role`** (verified live), so the `ai-worker` edge function *cannot* read
`t."5.3_content_format"` directly. The alternatives were to route a safety gate through the arbitrary-SQL
`exec_sql` function (a known authz hazard) or to hardcode the exempt list in the worker (guaranteed
drift). A dedicated minimal accessor avoids both.

**⚠ Posture change vs rev 1, stated plainly:** rev 1 advertised **zero DDL**. That is no longer true —
Option A necessarily introduces `CREATE FUNCTION` plus four grant statements. There is still **no
`ALTER TABLE` and no table-schema change of any kind**. The grants are mandatory, not decorative: new
`public` functions are born anon-executable via `pg_default_acl`, so `REVOKE` from
`PUBLIC`/`anon`/`authenticated` + `GRANT` to `service_role` is required to match the security posture of
`classify_format_capability` / `select_template`.

### 1.0 Rev-3 narrowings (applied after `db-rls-auditor` re-audit — both make the carve-out *smaller*)

**SF-1 — the exemption is scoped to the status class the ruling actually addresses.** As first built,
an exempt format bypassed *every* non-ready status. The auditor was right that this is too wide: the
template-coverage artefact surfaces **only** as `template_missing` / `unsupported_silent_degrade`, and a
template-less format can still carry a **genuine** gap (`publisher_path_missing`, `governance_unproven`,
`asset_shortage`, `pipeline_missing`) that must still block. Both layers now require the status to be in
`{template_missing, unsupported_silent_degrade}` before the exemption is even consulted.

Note where the enumeration sits: on the **exemption (narrowing) side**, never the block side. Any status
not listed — including a future 8th — is **not** exempt and therefore still blocks. The block decision
remains generic (`<> 'ready'`), so the "covered by construction" property is preserved rather than
traded away. *(This does qualify the rev-2 wording, which the auditor correctly flagged as overclaiming.)*

**SF-2 — the helper now filters `is_active = true`.** Without it, inserting a deactivated registry row
with `render_engine='none'` would silently grant an exemption — a plain data edit becoming a safety-gate
change with no DDL and no gate. `NULL` `is_active` does not match, so this is fail-closed too.

Both are one-line narrowings; neither can widen the gate. Proven again in an aborted transaction (§3).

**Evaluation order (deliberate).** The exemption is checked **only after** a non-ready verdict, **and
only for a carve-out-eligible status**, and against **exactly the format string that was classified**:
- the ready path is byte-unchanged and pays **no** extra round-trip;
- classification and exemption cannot diverge onto different format strings;
- the carve-out is a *narrowing of the block*, never a widening of "ready".

**Fail-closed, in the safe direction.** An exemption lookup that errors, throws, or returns anything
other than boolean `true` ⇒ **NOT exempt ⇒ still gated**. An exemption that cannot be proven is never
granted. (`EXISTS` never returns NULL; NULL/unknown/missing format ⇒ `false`.)

### 1.1 Proven live (aborted transaction)

```
exempt: text=t  video_short_avatar=f  NULL=f  no_such_format_xyz=f
helper acl: {postgres=X/postgres, service_role=X/postgres}   <- anon/authenticated correctly ABSENT
PP linkedin  text                -> filled  (ai_job enqueued)   <- carve-out works
PP youtube   video_short_kinetic -> skipped capability_blocked:unsupported_silent_degrade:video_short_kinetic
PP linkedin  image_quote         -> filled  (ai_job enqueued)   <- zero regression
```

### 1.2 Blast radius after the carve-out (every `pending_fill`/`future` slot, re-measured)

| outcome | slots | detail |
|---|---|---|
| never reaches the gate (cc-0019 ineligible) | **102** | all NDIS — see §1.3 |
| `ready`, unaffected | **84** | image_quote / carousel across invegent, care-for-welfare, property-pulse |
| **exempt** (template-less, proceeds) | **7** | property-pulse `text`: 6 LinkedIn + 1 Facebook |
| **BLOCKED** | **9** | property-pulse YouTube only: `video_short_kinetic` ×4, `video_short_stat_voice` ×3, `video_short_kinetic_voice` ×2 |

**All 9 remaining blocks are `unsupported_silent_degrade` on real video formats — precisely the class
this lane exists to close.** Zero text slots are blocked anywhere.

### 1.3 Still counter-intuitive, still worth restating

**While the containment pause holds, every NDIS slot is cc-0019-ineligible**, so the pre-existing gate
fires first and the S9 gate never runs for NDIS. Applying this changes nothing for NDIS today; the
entire immediate live effect is on **Property Pulse**.

**Latent NDIS exposure on containment lift** (must be a named precondition of the containment-lift lane):
`video_short_avatar` ×15 (YouTube), `carousel` ×5 (IG) + ×4 (FB), `video_short_kinetic_voice` ×3,
`video_short_avatar` ×2 (IG), plus `template_missing` video formats ×23 — all block the moment the pause
lifts. The 8 NDIS `text` slots (5 LinkedIn + 3 Facebook) are now **exempt** and will not block.

---

## 1A. ⛔ STILL OPEN — a capability-blocked slot is **TERMINAL** (PK decision required)

Found by `db-rls-auditor`; **not resolved by the Option A ruling**, though much smaller in scope now.

Nothing re-opens a `skipped` slot:

| mechanism | predicate | re-opens? |
|---|---|---|
| `m.recover_stuck_slots` | `WHERE status='fill_in_progress'` | **no** |
| `m.promote_slots_to_pending` | `WHERE status='future'` | **no** |
| `m.materialise_slots` | re-inserts `ON CONFLICT DO NOTHING` | **no** |

So *"preserved as unmet demand"* is true **only as an audit record**. **Rollback restores future
behaviour only** — it does not re-open slots already skipped, so the damage window is not bounded by
rollback speed. All 9 currently-affected slots are `status='future'`, so the effect arrives **gradually**
as `promote_slots_to_pending` walks them in (at `scheduled_publish_at` − 1440 min): a post-apply
monitoring window will look **deceptively quiet at first**.

**Materially better after Option A:** the exposure is now 9 property-pulse YouTube video slots that
*should* be blocked, not 16 including healthy text. Losing those publishing occasions may well be the
correct outcome — but it should be an explicit acceptance, not a silent side effect.

**PK decision:** accept permanent loss of capability-skipped occasions in writing, **or** commission a
re-open path (its own lane) before Layer 1 goes live?

---

## 2. What was built

### Layer 1 — `m.fill_pending_slots` (migration `20260729143000`, rev 2)

Two objects, **one transaction** (they must apply together — the gate calls the helper):
1. **NEW** `public.is_capability_exempt_format(text)` (§1).
2. One fail-closed capability gate in `m.fill_pending_slots`, immediately **after** the existing cc-0019
   gate and **above** the T0 manual branch, so manual and automated slots are gated uniformly
   (PK ruling 2026-07-29, no carve-out by slot origin).

- Resolves `client_slug` from `v_slot.client_id` (the function otherwise works purely in uuid; the
  classifier is slug-keyed) — a required addition named by the brief's specialist review.
- `ready` → byte-for-byte unchanged · non-ready **+ exempt** → proceeds unchanged · non-ready **+ not
  exempt** → **skip with evidence**, then `CONTINUE` before any pool query, skeleton draft, `ai_job` or
  token spend. **No re-pick, no substitution.**
- Blocked state (no table-schema change):
  `m.slot.status='skipped'`, `skip_reason='capability_blocked:<status>:<format>'`;
  `m.slot_fill_attempt.decision='skipped'`, same `skip_reason`,
  `pool_snapshot={gate,client_slug,capability:<full classifier jsonb>}`,
  `error_message=<SQLSTATE/SQLERRM>` on exception paths only.
  `m.slot.format_chosen` is not overwritten and no `post_draft` row is created, so
  `video_status`/`approval_status`/publish statuses are untouched **by construction**.

**Per-slot fault isolation (brief must-fix, both constraints honoured, independently confirmed by
`db-rls-auditor`):** each `BEGIN…EXCEPTION WHEN OTHERS` block wraps **only its single call** — never the
surrounding slot logic — so neither can mask an unrelated defect; and neither **re-raises**, because an
escaping exception would abort the whole batch transaction and roll back other clients' already-filled
slots in the same 10-minute tick. `SQLSTATE`/`SQLERRM` are captured to `error_message` **and** emitted
via `RAISE WARNING`.

### Layer 2 — `ai-worker` v2.24.1 → **v2.25.0** (marker `ai-worker-s9-capability-enforcement`)

One classifier call on **both** draft paths, both routed through the same
`shouldBlockOnCapability()` decision (so the carve-out cannot apply to one path and not the other):

- **Main path** — after the Advisor's pick and after all three unconditional pins (A2 avatar, cc-0084
  dialogue, schedule-authority `video_short_stat`), so it is the true last word regardless of which of
  the 11 documented fallback paths produced `decidedFormat`; and **before**
  `writeVisualSpec`/`assemblePrompts`/the LLM call and before any video-script or dialogue generation
  ⇒ a blocked draft incurs **zero** generation cost (PK ruling 2026-07-29, short-circuit).
- **Evergreen path** — architecture §1.3 fallback **#6**, which writes `recommended_format` directly from
  `input_payload.format` and bypasses Advisor + resolver entirely, so it carries its own copy of the gate.

Blocked-state write (PK ruling 3 — existing format-authority columns only):

| field | value | why |
|---|---|---|
| `recommended_format` | **`NULL`** | **Never a substitute.** Every renderer/publisher keys off an exact value, so `NULL` matches none ⇒ unreachable downstream by construction. Column is nullable, FK-only (FKs permit NULL) — re-verified live. |
| `requested_format` | preserved unconditionally | what was actually asked for |
| `final_format_authority` | `'blocked_by_capability'` | free-text column, no CHECK enum — re-verified live |
| `final_format_reason` | `'<status>:<reason_code>'` | classifier's own values |
| `resolver_evidence` | full classifier jsonb **verbatim** | never re-derived locally |

**Deliberately NOT written** — each omission load-bearing: `approval_status` (skeleton stays `'draft'`,
so `m.auto_approver_fetch_drafts`'s `WHERE approval_status='needs_review'` **cannot see it**; writing
`'needs_review'` would hand a blocked draft to the auto-approver) · `video_status` · any publish-failure
status · `draft_title`/`draft_body` (no generation ran).

`ai_job` → **`'cancelled'`**, not `'failed'`: `pipeline-fixer` re-queues `'locked'` and dead-letters
`'failed'` but **never touches `'cancelled'`**, so a capability block cannot enter a retry or
dead-letter loop (the cc-0040 failure class). `m.slot` → `'skipped'` + the same composed code.

**Fail-closed everywhere:** RPC error, throw, unresolvable `client_slug`, unrecognised classifier
payload, or an unproven exemption all resolve to **blocked**. No branch turns a failure into `ready` or
into an exemption. The ready test is **generic** (`status === 'ready'`) — blocked statuses are never
enumerated, so `publisher_path_missing` and any future status are covered **by construction**.

---

## 3. Verification performed (all read-only or transaction-aborted)

| Check | Result |
|---|---|
| `deno check` | **clean** |
| Hermetic suite `capability_enforcement_test.ts` | **20/20 pass** — ready-unchanged · canonical blocked write · rpc-error · rpc-throw · unresolved-slug (proves the classifier is not called) · slug-throw · 5 unrecognised payload shapes · absent format · `publisher_path_missing` · hypothetical future status · reason-string formats · **+6 carve-out**: exempt-does-not-block · non-exempt-still-blocks · ready-short-circuits-before-exemption-lookup · 6 fail-closed exemption variants · absent-format-never-exempt · format passed through (not hardcoded) · **+3 rev-3 scope tests**: 7 genuine-gap statuses still block on a template-less format *and never even consult the exemption* · the eligible-status set is exactly the two artefact statuses · `template_missing` on a template-less format is exempt |
| Full `ai-worker` suite (regression) | **84/84 pass, 0 failed** |
| Layer 1 compiles & installs | **PASS** — rebuilt in-DB from live `prosrc` inside an aborted transaction; resulting `prosrc` md5 = `b56bbd305b8808c59b074891de06b52a`, **exactly equal** to the rev-2 artifact's body |
| Helper behaviour + ACL | **PASS** — `text`=true, `video_short_avatar`/NULL/unknown=false; acl `{postgres=X/postgres,service_role=X/postgres}`, anon/authenticated absent |
| Layer 1 behaviour dry run (aborted) | **PASS** — PP LinkedIn `text` **filled** (carve-out) · PP YouTube `video_short_kinetic` **skipped** with the exact composed code · PP LinkedIn `image_quote` **filled** (zero regression) |
| Rollback identity | **PASS** — rollback file's embedded body hashes to `afd62a2116d23cb0a03d089d108e6a36`, exactly the live baseline; also drops the new helper |
| Build-time verify items (architecture §7 items 3–4) | **RESOLVED** — `recommended_format` nullable + FK-only; `final_format_authority` free `text`, no CHECK |

**Nothing was applied, deployed, merged, or pushed.** Every DB exercise ran inside a transaction
terminated by `RAISE EXCEPTION`, so the abort is guaranteed rather than relying on an explicit
`ROLLBACK` reaching the server.

### 3.1 Rev-1 review chain (verdicts that drove this re-cut)

| Reviewer | Verdict | Substance |
|---|---|---|
| `branch-warden` | `stop` | **Lane artifact passed every check** — correct base, 1 commit ahead, exact file set, nothing on `main`, nothing pushed, isolated worktree. `stop` was on the **environment** (§3.2). |
| `db-rls-auditor` | `block` | SQL mechanically clean, privilege-neutral, constraint-compatible, fault-isolated, reversible. Independently confirmed §1 **and** found §1A. |

`db-rls-auditor` proved apply/rollback identity more strongly than rev 1 claimed: a line-by-line diff of
forward vs rollback showed exactly **2 insertion hunks, 98 additions, 0 deletions, 0 modifications** —
the migration is provably *baseline-plus-pure-insertion*. It also confirmed no bypass path
(`try_urgent_breaking_fills` / `create_manual_slot_internal` create slots only, so they **are** gated),
classifier latency 37–84 ms/call (~0.2–0.4 s per 10-min tick — negligible), and zero new advisor lints.

**⚠ Rev 2 has NOT yet been re-reviewed.** Both auditors and external review must re-run against the
rev-2 hashes in §0 — the rev-1 verdicts are pinned to superseded artifacts and are **stale for apply
purposes**. See §7.

### 3.2 ⚠ Shared-checkout hazard (environment, not this artifact)

The shared default checkout `C:/Users/parve/Invegent-content-engine` carries **5 modified TRACKED files**
from a **concurrent, still-active lane** — `docs/00_action_list.md`, `docs/00_sync_state.md`,
`supabase/functions/video-worker/{b1_video_stat.ts, b1_video_stat_test.ts, index.ts}`.

1. **Any `git commit -a` or broad `git add` from the shared checkout would bundle another lane's work** —
   the v6.52 process exception repeating. Before any push: `git fetch` and inspect the **full**
   `origin/main..HEAD` list, not just this lane's commits.
2. **`supabase functions deploy` bundles the CWD**, and the shared checkout is at `2b5e44b`, which does
   **not** contain v2.25.0 — deploying `ai-worker` from there would ship **old code**. Deploy from
   `C:/Users/parve/ice-worktrees/s9-resolver-enforcement` (copy in
   `supabase/.temp/{project-ref,linked-project.json}` first).
3. The lane branch's upstream is `origin/main` (from `--track`), so a bare `git push` from the lane
   worktree would target **main**. Name the full refspec explicitly.

---

## 4. Apply / deploy plan (for PK)

**Order: migration first, then EF deploy.** Order is not hard here — the two layers are independent
chokepoints on the same signal and neither sequence produces an inconsistent state. Migration-first
stops the work earlier; Layer 2 is the backstop for anything already past fill.

**Pre-apply STOP conditions (any one trips ⇒ abort, void the remainder, return to PK):**
1. `md5(prosrc)` for `m.fill_pending_slots` ≠ `afd62a2116d23cb0a03d089d108e6a36` (baseline moved).
2. Any artifact sha256 ≠ the rev-2 value pinned in §0.
3. `origin/main` has moved to a commit not reviewed here.
4. `public.classify_format_capability` acl ≠ `{postgres=X/postgres,service_role=X/postgres}`.
5. `recommended_format` has gained a `NOT NULL`, or `final_format_authority` a CHECK.
6. Any change set beyond the 5 files in §0.
7. `SELECT ice_format_key FROM t."5.3_content_format" WHERE render_engine='none' AND is_active=true`
   returns anything other than exactly `{text}` — the exempt set must be what was reviewed.
8. §1A has not been ruled on.

**Step 1 — apply Layer 1** (`20260729143000_…sql`). Post-apply assertions:
```sql
SELECT md5(prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='m' AND p.proname='fill_pending_slots';
-- expect: b56bbd305b8808c59b074891de06b52a

SELECT proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='is_capability_exempt_format';
-- expect: {postgres=X/postgres,service_role=X/postgres}  (anon/authenticated MUST be absent)

SELECT public.is_capability_exempt_format('text'), public.is_capability_exempt_format('video_short_avatar');
-- expect: t, f
```
⚠ **Ledger discipline** — `apply_migration` mints its own version. If applied via `execute_sql`, insert
the `supabase_migrations.schema_migrations` row explicitly. The concurrent S5 lane (`20260729120000`)
skipped this and left a real provenance gap; do not repeat it. With two ledger-less files now in
`supabase/migrations/`, a future `supabase db push` would treat **both** as pending.

**Step 1b — PostgREST schema reload + REST probe (NAMED STOP — `db-rls-auditor` SF-3).**
`ai-worker` reaches the new helper over PostgREST. A stale schema cache returns **PGRST202**, the
worker's fail-closed branch treats that as *not exempt*, and **`text` gets blocked at Layer 2** — the
exact symptom §4 Step 3 says means "roll back". Close the window before deploying:
```sql
NOTIFY pgrst, 'reload schema';
```
Then probe over REST as `service_role` (not just in SQL) and require `true`:
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/is_capability_exempt_format" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"p_format":"text"}'
# expect: true    — anything else (esp. PGRST202) is a STOP; do not deploy ai-worker
```

**Step 2 — push, then deploy `ai-worker`**
- ⚠ **The drift gate hashes GitHub `main`, not the local worktree** — the code must be on `origin/main`
  before deploying, or `drift-check` compares against the wrong source.
- ⚠ **Deploy from the lane worktree** (§3.2 item 2), not the shared checkout.
```bash
scripts/safe-deploy.sh ai-worker --allow-warn
```
`verify_jwt=false` is already set for `ai-worker` in `supabase/config.toml:86-87`; confirm it is still
`false` after deploy (a flip breaks `x-series-key`-only callers 401→502).
Then refresh drift: `drift-check?write=true&slug=ai-worker`.

**Step 3 — post-deploy verification**
- `deploy-verifier` on `ai-worker`: marker `ai-worker-s9-capability-enforcement` present in the deployed
  bundle, `VERSION == ai-worker-v2.25.0`, `verify_jwt == false`.
- Live signal queries:
```sql
SELECT final_format_authority, final_format_reason, count(*)
  FROM m.post_draft WHERE final_format_authority='blocked_by_capability'
 GROUP BY 1,2 ORDER BY 3 DESC;

SELECT skip_reason, count(*) FROM m.slot
 WHERE skip_reason LIKE 'capability_blocked:%' GROUP BY 1 ORDER BY 2 DESC;
```
- **Watch for the §1A pattern**: per §1.2 expect blocks ONLY on property-pulse YouTube
  `video_short_kinetic` / `video_short_stat_voice` / `video_short_kinetic_voice`. **Any
  `capability_blocked:*:text` row means the carve-out has failed — roll back.**

## 5. Rollback

| Layer | Rollback | Proven |
|---|---|---|
| Layer 1 | `ROLLBACK_20260729143000_…sql` — restores the exact pre-change body, then `DROP FUNCTION public.is_capability_exempt_format(text)` | Body hash-verified `afd62a21…` == live baseline; both verify commands embedded in the file header |
| Layer 2 | redeploy the prior `ai-worker` (v2.24.1) | version-bump revert; no data backfill needed |

**No data is un-written.** Slots skipped `capability_blocked:…` and drafts marked
`blocked_by_capability` remain as historical fact — and per **§1A are NOT re-opened**. Rollback restores
*future* behaviour only.

**⚠ Rollback ordering (`db-rls-auditor` SF-4).** The concurrency argument below covers the function
*body*, but not the **dropped helper**: a tick that started on the new body can call
`is_capability_exempt_format` after the rollback commits. It fails closed (⇒ not exempt), which means
`text` slots in that one tick are **terminally** skipped (§1A). Mitigation: run the rollback **immediately
after a tick**, or restore the body first and defer the `DROP` by one cron cycle — the helper is inert
once the gate is gone.

**Concurrency (evidenced):** `m.fill_pending_slots` runs via `cron.job` **jobid 75**, `*/10 * * * *`, as
`postgres`. PostgreSQL resolves a `plpgsql` body at the start of each call; `CREATE OR REPLACE` takes a
brief catalog lock but does not alter or abort a call already in progress. An in-flight tick completes
on the body it started with; the next tick (≤10 min) picks up the new definition. No partial-execution
or mixed-body risk, and **no need to pause the cron job** — for either the forward apply or the rollback.

**Boundary:** independent of the live 4-platform NDIS containment pause, whose rollback is a separate,
per-platform, PK-ordered act (architecture §5).

---

## 6. Explicitly NOT done (scope held)

Publisher-side enforcement (`m.publisher_lock_queue_v2` predicate, YouTube two-edit dequeue/claim, the
`auto-approver` guard) · WordPress · Layer 3 render-dispatch · R3a→R3c · dashboard UI · any change to
`select_template`, `resolve_slot_assets`, or the classifier body · lifting any part of the NDIS
containment pause · `lane/s9-cta-text-bounded-regen`.

Avatar remains paused; nothing here alters that.

### 3.3 Rev-2 review chain and how rev 3 answers it

| Reviewer | Rev-2 verdict | Disposition in rev 3 |
|---|---|---|
| `db-rls-auditor` | **`concerns`** (up from rev-1 `block`) | text blocker confirmed **resolved**; security posture confirmed correct; `pg_default_acl` trap confirmed **closed** (it verified live that the function *is* born anon/authenticated-executable, so the REVOKEs are load-bearing, and that all four grant statements sit inside the same transaction ⇒ no committed exposure window). 5 should-fixes → **SF-1 and SF-2 implemented** (§1.0); **SF-3 and SF-4 added to the plan** (§4 Step 1b, §5); **SF-5 count corrected** (84, not 85). MF-2 carried as §1A. |
| `branch-warden` | **`stop`** (environment) | Lane artifact impeccable — exact 5-file set, all four sha256 byte-matched, clean isolated worktree, nothing pushed, no leakage to `main`. The `stop` was that `origin/main` advanced `2b5e44b → b7568ce` (a concurrent lane pushed B-roll Parity Activation v1 / video-worker v3.15.0 **LIVE**), making the base pin stale. **Resolved: lane rebased onto `b7568ce`** — zero file overlap, `merge-tree` clean, 3 ahead / 0 behind. |

Other things `db-rls-auditor` established that are worth keeping: no bypass path
(`try_urgent_breaking_fills` / `create_manual_slot_internal` create slots only, so they *are* gated);
classifier latency 37–84 ms/call ⇒ ~0.2–0.4 s per 10-min tick; **zero new advisor lints** (the helper
carries `search_path=''` and REVOKEs anon/authenticated, so it joins neither the 41 anon- nor the 50
authenticated-SECDEF-executable populations); the helper leaks nothing (a single boolean membership
oracle to `service_role`, over a table with no RLS and no anon/authenticated grant) and has **no
injection surface** (`LANGUAGE sql`, static `SELECT EXISTS`, no dynamic SQL).

**Timing precision it added:** all 9 blocked slots are `source_kind='scheduled'`, `status='future'`,
earliest `scheduled_publish_at` 2026-07-31 07:00 UTC ⇒ **first real block lands ~2026-07-30 07:00 UTC**,
roughly 24 h after apply. Size the monitoring window to that, not to weeks.

**⚠ Rev 3 has not itself been re-audited.** It differs from the audited rev 2 by exactly the two
narrowings in §1.0 (both strictly reduce what is exempt), the doc/plan additions above, and the rebase.
A confirmatory pass is item 2 of §7.

## 7. Required before apply

1. **PK ruling on §1A** (terminal slots) — the one open decision.
2. **Confirmatory `db-rls-auditor` pass on rev 3** — scoped to the §1.0 narrowings (SF-1 status-class
   condition, SF-2 `is_active` filter). Rev 2 was already audited `concerns` with everything else clean.
3. **Re-run `branch-warden`** against the rebased rev-3 commit (base is now `b7568ce`).
4. **Run external review** (`ask_chatgpt_review`) pinned to the rev-3 hashes in §0. Deliberately not run
   on rev 1 or rev 2, because each ruling/finding re-cut the artifact and would have made the review
   stale on arrival; rev 3 is the first candidate-final artifact.

## 8. Carries surfaced (not fixed here)

1. **§1A** — capability-skipped slots are terminal; needs a ruling. **This is the only open blocker.**
2. **Latent NDIS exposure on containment lift** (§1.3) — should be a named precondition on that lane.
   NDIS `text` is now exempt and will not block.
3. `20260729120000` (S5 classifier extension) still has **no `schema_migrations` ledger row**.
4. A **rejected** draft (`m.handle_draft_rejection`) whose slot returns toward `pending_fill` now
   terminates permanently at `'skipped'` if its format is blocked. Confirm intended.
5. `m.fill_pending_slots` carries no `SET search_path` (pre-existing advisor WARN). Deliberately not
   fixed — changing the header would invalidate the pinned `b56bbd30…` assertion. Separate lane.
6. `youtube-publisher`'s fail-open `paused_until` preload — architecture §1.4, YouTube-release
   co-requirement, out of scope here.
7. Shared-checkout contamination hazard (§3.2) — an active concurrent lane, not this one's doing.
