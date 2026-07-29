# Result — S9 Capability Enforcement, Objective 1 (resolver chokepoint, Layers 1+2)

**CLAIMED v6.58 · s9-resolver-enforcement · s9-resolver-enforcement · apply-deploy-complete · 2026-07-29T06:41:25.891Z**

**Date:** 2026-07-29 Sydney · **Tier:** T3 · **Lane class:** SAFETY_GATE
**Brief:** `docs/briefs/s9-resolver-enforcement-build-brief-v1.md`
**Architecture:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` (PK-approved 2026-07-28, five rulings)
**Packet:** `docs/briefs/artifacts/s9-resolver-enforcement-apply-deploy-packet-v1.md` (rev 3)
**Outcome:** ✅ **APPLIED + DEPLOYED + PROVEN.** Both layers live. Rollback proven. NDIS remains paused.

---

## 1. What is now live

| Layer | Object | State |
|---|---|---|
| **Layer 1** | `m.fill_pending_slots` | fail-closed capability gate live; `prosrc` md5 **`b56bbd305b8808c59b074891de06b52a`** |
| **Layer 1** | `public.is_capability_exempt_format(text)` | **NEW** — SECURITY DEFINER, STABLE, `search_path=''`, owner `postgres`, acl `{postgres=X/postgres,service_role=X/postgres}` |
| **Layer 2** | `ai-worker` | **v2.24.1 → v2.25.0**, marker `ai-worker-s9-capability-enforcement`, function version 129 |
| Ledger | `supabase_migrations.schema_migrations` | row `20260729143000` **written** (the provenance gap the S5 lane left was NOT repeated) |

Behaviour: a non-Ready requested format is **skipped/blocked with evidence**, the requested format is
**preserved**, **no fallback substitution** occurs, and **no LLM/render work** is performed for blocked
demand. Ready and exempt-`text` paths are behaviourally unchanged.

**PK rulings implemented:** (1) capability-skipped slots are terminal in v1 — no re-open/replay path
built; (2) Layer-1 exemption set is exactly `{text}`, not expandable without a fresh PK policy gate,
with the four monitoring controls retained.

## 2. Sequence executed (all STOPs cleared before each step)

| # | Step | Evidence |
|---|---|---|
| 0 | Reconcile against `origin/main` | rebased 3× during the lane as concurrent lanes landed; final base `531d155`, all landings docs-only with **zero** overlap on the 5 lane files |
| 0 | Full commit range contains only this lane's work | 6 commits, every one `feat(s9)`/`docs(s9)`; explicit grep for non-s9 returned NONE (the v6.52 corrective rule) |
| 0 | Live pre-checks | baseline `prosrc` md5 `afd62a21…` ✓ · classifier acl ✓ · `recommended_format` nullable ✓ · no CHECK on `final_format_authority` ✓ · exempt set `{text}` ✓ · helper absent ✓ · no ledger row ✓ · cron 75 active ✓ |
| 1 | **Apply DB change** | one transaction, **self-verifying**: in-transaction assertions on baseline md5, applied md5, helper ACL and helper behaviour, each `RAISE EXCEPTION` on mismatch ⇒ any deviation would have aborted the whole apply. Applied md5 = `b56bbd305b8808c59b074891de06b52a` = the reviewed artifact's body |
| 2 | PostgREST reload + REST probe | `NOTIFY pgrst, 'reload schema'`; probe returned HTTP **200 / `true`** for `text`, `false` for `video_short_avatar` — **no PGRST202**, the named STOP cleared |
| 3 | Push | `531d155..8495f0f`; post-push parity 0/0 |
| 4 | **Deploy worker** | `scripts/safe-deploy.sh ai-worker --allow-warn` (drift refreshed to B-FD *before* deploy), from the **lane worktree** with `supabase/.temp/{project-ref,linked-project.json}` copied in |
| 5 | Verify | `deploy-verifier` **content PASS / overall PASS_WITH_FLAG**; drift refreshed post-deploy → **A-LE, 2.25.0 == 2.25.0, severity none** |
| 6 | Rollback proof | executed then aborted — restored md5 **`afd62a21…` exact match**, helper `DROPPED` |

## 3. Proofs

**Deploy content (`deploy-verifier`, independently recomputed — it did not take the plan's values on trust):**
- marker `ai-worker-s9-capability-enforcement` present in the **deployed** bundle as live code, not just a comment
- pre-existing `ai-worker-cc0084-dialogue-script` **retained** (no regression)
- `VERSION == ai-worker-v2.25.0`; `verify_jwt == false`
- **Deployed entrypoint byte-identical** (LF sha256 `4604c06a70…`) to `git show 8495f0f:…/ai-worker/index.ts`
  ⇒ the **bundles-from-CWD trap did not fire**

**Behaviour (live, applied function, inside an aborted transaction so NO real occasion was consumed):**

| cell | expected | observed |
|---|---|---|
| property-pulse · linkedin · `text` (exempt) | fills, unchanged | **filled**, `ai_job` created |
| property-pulse · youtube · `video_short_kinetic` (non-ready) | blocks | **skipped**, `capability_blocked:unsupported_silent_degrade:video_short_kinetic`, **no `ai_job`** |
| property-pulse · linkedin · `image_quote` (ready) | fills, unchanged | **filled**, `ai_job` created |

The absent `ai_job` on the blocked row is the direct proof that **no downstream LLM/render work occurs
for blocked demand** — Layer 1 `CONTINUE`s before the draft/job is ever created.

**Seven-status contract (live):** `ready` ✓ · `unsupported_silent_degrade` ✓ · `template_missing` ✓ ·
`governance_unproven` ✓ · `publisher_path_missing` ✓ · `unknown` fail-closed ✓ · exempt set `{text}` ✓.
`pipeline_missing` / `asset_shortage` still have no live example to exercise — a **pre-existing** gap
carried from the classifier lane, neither introduced nor worsened here.

**Post-apply production state:** `real_blocked_slots = 0`, `capability_blocked:*:text = 0`,
`blocked_drafts = 0`, `cancelled_jobs = 0` — nothing has hit the gate in real operation yet, exactly as
predicted: all 9 affected slots are `status='future'` and promote at `scheduled_publish_at − 1440 min`,
so the **first real block is expected ~2026-07-30 07:00 UTC**.

## 4. Review chain

| Gate | Verdict |
|---|---|
| `db-rls-auditor` rev 1 | `block` — found the `text` blocker independently + the terminal-slot finding |
| `db-rls-auditor` rev 2 | `concerns` — 5 should-fixes; SF-1/SF-2 implemented, SF-3/SF-4 folded into the plan, SF-5 corrected |
| `branch-warden` | lane artifact clean at every check; `stop`s were environmental (dirty shared checkout, then origin movement) and were resolved by rebasing |
| `ask_chatgpt_review` | `review_id f636301a-78b4-4956-81d9-b26f3dfc3c78`, pinned `346cd54f…` — `partial`/medium/high, `requires_pk_escalation=true`. **Zero `concrete_defect`.** Escalation was a `policy_decision`; its `corrected_action` (exemption monitoring) was adopted |
| PK | **Approved for T3 apply/deploy** with rulings 1 and 2, discharging the review escalation |
| `deploy-verifier` | content **PASS**, overall **PASS_WITH_FLAG** (drift flag since cleared) |

## 5. Monitoring retained (PK ruling 2)

```sql
-- (a) exempt-set tripwire — MUST return exactly {text}
SELECT ice_format_key FROM t."5.3_content_format" WHERE render_engine='none' AND is_active=true;

-- (b) slots proceeding BECAUSE of the exemption
SELECT cl.client_slug, sl.platform, COALESCE(sl.format_preference[1],'image_quote') AS fmt, count(*)
  FROM m.slot sl JOIN c.client cl ON cl.client_id=sl.client_id
 WHERE sl.status IN ('pending_fill','future')
   AND public.is_capability_exempt_format(COALESCE(sl.format_preference[1],'image_quote'))
 GROUP BY 1,2,3;

-- (c) inverse alert — ANY row here means the carve-out failed ⇒ rollback
SELECT * FROM m.slot WHERE skip_reason LIKE 'capability_blocked:%:text';

-- (d) live blocked state
SELECT final_format_authority, final_format_reason, count(*) FROM m.post_draft
 WHERE final_format_authority='blocked_by_capability' GROUP BY 1,2;
```
**(d) durable evidence on exemption-registry change:** widening the exempt set needs only a registry
**data** edit — no DDL, no gate — so any change to (a)'s result is a reviewable event requiring a fresh
PK policy gate, not a routine edit.

## 6. Rollback (proven, not executed)

`supabase/migrations/ROLLBACK_20260729143000_…sql` — restores the exact baseline body then drops the
helper. Proven live: restored md5 `afd62a2116d23cb0a03d089d108e6a36` (exact), helper `DROPPED`.
Layer 2 rollback = redeploy v2.24.1.

⚠ **Ordering:** the `DROP` races an in-flight cron tick (a tick on the new body can call the helper
after the rollback commits; it fails closed ⇒ `text` slots in that tick are terminally skipped). Run the
rollback immediately after a tick, or defer the `DROP` one cycle.
⚠ **Rollback does not re-open already-skipped slots** (PK ruling 1 — accepted).

## 7. Carries

1. **Terminal slots accepted** (PK ruling 1) — no re-open path built, by instruction.
2. `pipeline_missing` / `asset_shortage` have no live example to end-to-end verify (pre-existing).
3. `m.fill_pending_slots` still has no `SET search_path` (pre-existing advisor WARN) — not fixed here
   because changing the header would have invalidated the pinned `b56bbd30…` assertion. Own lane.
4. A **rejected** draft whose slot returns toward `pending_fill` now terminates at `'skipped'` if its
   format is blocked — believed intended, worth confirming.
5. `20260729120000` (S5 classifier extension) **still has no ledger row** — belongs to that lane.
6. Repo is `* text=auto`: git stores LF, Windows checks out CRLF. Pin/verify artifact hashes on the
   **blob**; applying CRLF SQL would change `prosrc` and break an md5 assertion.

## 8. ⚠ Process finding — service-role key printed to the session transcript

While probing for deploy credentials I used a shell construct (`${VAR:+yes}${VAR:-no}`) that, for a
**set** variable, expands to its **value**. `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` were therefore
printed in full to this session's transcript. This is my error, not a tooling defect.

- **Scope:** the key was already present in the local environment; no new party gained access, and it
  was not sent anywhere. The exposure is that the secret now sits in durable session/transcript storage.
- **Contract:** CCF-02 R2 requires secrets be handled **never-in-transcript**. That was violated.
- **Recommendation: rotate the Supabase `service_role` key** at PK's convenience, and treat this
  session's transcript as secret-bearing until then.
- **Corrective rule:** never interpolate a secret-bearing variable to test whether it is set — use
  `[ -n "$VAR" ] && echo set || echo unset`, which never expands the value.

## 9. Explicitly NOT done

NDIS **remains paused** (all four platforms, `paused_until=2027-01-01`) — untouched, per instruction.
Publisher-side enforcement, the `auto-approver` guard, WordPress, Layer 3 render-dispatch, R3a→R3c, and
the dashboard UI are all out of scope. **Next Capability Enforcement outcome: the publisher enforcement
build.**
