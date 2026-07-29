# S9 Publisher Enforcement (Objective 2) — Apply / Deploy / Rollback packet

**Rev 2 (2026-07-29)** — incorporates the `db-rls-auditor` F-1 starvation defect (PK ruling: **option (a)**,
filter cron 48 and keep the trigger) and closes F-2 with live evidence.

**Lane:** S9 Capability Enforcement · Objective 2 (publisher chokepoint)
**Brief:** `docs/briefs/s9-publisher-enforcement-build-brief-v1.md`
**Architecture:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §3
**Tier:** T3 · **Lane class:** SAFETY_GATE · **Branch:** `lane/s9-publisher-enforcement` — **local only, not pushed**
**Status:** BUILD COMPLETE — **STOPPED AT THE PK APPLY/DEPLOY GATE.** Nothing applied, deployed, merged or pushed.

---

## 1. What this enforces

Objective 1 (LIVE, v6.58) writes the signal: `m.post_draft.final_format_authority='blocked_by_capability'`.
This lane makes that signal *binding at publish time*, across **six** guards on **two boundaries**
(PK ruling 2026-07-29: enqueue prevents contamination, dequeue prevents publication):

| # | Object | Boundary | Effect |
|---|---|---|---|
| 1 | cron job 48 `enqueue-publish-queue-every-5m` | enqueue (candidate selection) | a blocked draft never consumes the single `DISTINCT ON (client,platform)` slot |
| 2 | `m.gate_queue_on_asset_status()` | enqueue (INSERT) | blocked draft suppressed per-row (`RETURN NULL`), never raises |
| 3 | `m.publisher_lock_queue_v2()` | dequeue | blocked / NULL / dangling draft never handed to a publisher — Facebook + Instagram (via the pure `v1` wrapper) + LinkedIn-zapier, no EF change |
| 4 | `youtube-publisher` SELECT | dequeue (direct read) | YouTube bypasses the queue entirely |
| 5 | `youtube-publisher` pre-claim UPDATE | dequeue (claim) | closes the TOCTOU window before the irreversible public upload |
| 6 | `m.auto_approver_fetch_drafts()` | approval | blocked draft can never be auto-approved into eligibility |

**Fail-closed on unknown provenance (PK ruling 1).** The dequeue guard is an **EXISTS-must-match**, so
NULL `post_draft_id`, a *dangling* `post_draft_id`, and a blocked draft all fail closed through one
positive test. `IS DISTINCT FROM` is null-safe, so a healthy draft (`final_format_authority IS NULL`,
the normal state — 2854 live rows) stays eligible; a bare `<>` would have excluded every healthy draft.

---

## 2. F-1 — the defect this rev fixes (found by `db-rls-auditor`, not by me)

Cron 48 selects **`DISTINCT ON (client_id, platform)`, oldest first** — exactly one candidate per
client-platform per 5-minute tick — and dedupes with `NOT EXISTS (queue row for this draft)`.

Guard 2 suppresses the INSERT, so **no queue row is ever created**, so the blocked draft re-qualifies on
every tick and, being oldest, wins that single slot **forever**. The effect is not "one draft is
skipped" — it is **enqueue permanently dead for that client+platform**, starving every healthy newer
draft behind it. Precedent: `20260523083823_fpub_jobid48_starvation_fix` is already in the ledger.

**Proven live, before and after, in an aborted transaction** (two property-pulse/linkedin jobs, the
blocked one made strictly older):

```
blocked_older = c1b39e22…   healthy_newer = 4c1436e7…
OLD candidate CTE picks c1b39e22…   <- STARVED (the blocked draft holds the slot)
NEW candidate CTE picks 4c1436e7…   <- FIXED   (healthy draft proceeds)
```

*(A first attempt at this proof was inconclusive because all four candidate jobs shared an identical
`created_at`, making `ORDER BY created_at LIMIT 1` non-deterministic. That was a flawed fixture, not a
flawed fix; the timestamps were made explicitly distinct and the result above is unambiguous.)*

**Remedy per PK ruling (a):** one predicate added inside cron 48's `DISTINCT ON` subquery, and the
trigger's suppression **kept** as defence-in-depth.

⚠ **Scope note:** this expands the lane beyond the Gate-1 brief to a fourth object — cron job 48. Its
command is **DB state with no repo provenance**, exactly like `publisher_lock_queue_v1/v2`. The paired
migration + rollback are the first repo record of it.

## 3. F-2 — closed with live evidence, not assumption

`db-rls-auditor` flagged that chained `.or()` in supabase-js was unproven in this codebase, and that if
two `or=` params did **not** AND, the v1.14.0 release-time gate and the v1.15.0 claim-staleness guard
would be silently disabled — reopening two previously-fixed incident classes on an irreversible public
upload. Tested directly against this PostgREST instance:

```
single  or=(slug.eq.property-pulse,slug.eq.ndis-yarns)                    -> ndis-yarns, property-pulse   (2 rows)
chained + or=(slug.eq.ndis-yarns,slug.eq.invegent)                        -> ndis-yarns                   (1 row)
```
The chained result is the **intersection**, so repeated `or=` params **compose as AND**. Had the second
overridden the first we would have seen `ndis-yarns + invegent`. Both YouTube guards are sound as written.

---

## 4. Artifacts (pin these — sha256 of the **git blob / LF-canonical** content)

| Artifact | sha256 |
|---|---|
| `supabase/migrations/20260729173000_s9_publisher_enforcement.sql` | *(recompute at freeze)* |
| `supabase/migrations/ROLLBACK_20260729173000_s9_publisher_enforcement.sql` | *(recompute at freeze)* |
| `supabase/migrations/20260729183000_s9_cron48_capability_filter.sql` | *(recompute at freeze)* |
| `supabase/migrations/ROLLBACK_20260729183000_s9_cron48_capability_filter.sql` | *(recompute at freeze)* |
| `supabase/functions/youtube-publisher/index.ts` (v1.16.0) | *(recompute at freeze)* |

> **⚠ LINE ENDINGS (`db-rls-auditor` F-3).** The repo sets `* text=auto`: git stores **LF**, Windows checks
> out **CRLF**. Verify with `git show HEAD:<path> | sha256sum`, never by hashing the working-tree file.
> **Apply the LF blob.** CRLF bytes would land carriage returns in `prosrc`, and the rollback's own
> `VERIFY AFTER RUNNING` md5 assertion would then fail. The new `last_error` string also contains UTF-8
> em-dashes that become stored **data**, so the channel must be byte-exact UTF-8 (F-10).

**Baselines — all re-derived from live `prosrc`/`command` and asserted in the generators:**

| object | md5 |
|---|---|
| `m.publisher_lock_queue_v2` | `d3fa9f82937ad7f9cbad79ad21ce0b46` |
| `m.auto_approver_fetch_drafts` | `1bf1dbf52ce56fd51b2f81c059dcfe29` |
| `m.gate_queue_on_asset_status` | `f58c2e4daa8288446689a513cb06fd54` |
| cron 48 `command` | `4a78f1bdba9c598f0799c8ba1cc40186` (post-change `747c643163f1f7a1c500e63ec5411d31`) |

`m.publisher_lock_queue_v1` is **not** modified — a pure delegating wrapper, live body md5
`54a6af1f965d40be2c7769d7e57e8ed2`, recorded in the rollback header for provenance.

## 5. Proofs (all read-only or transaction-aborted; nothing applied)

| Boundary | Result |
|---|---|
| Enqueue trigger | body md5 == generated file · blocked draft → **0 rows inserted** · NULL provenance → **retained with visible `last_error`** |
| Enqueue cron 48 | OLD → starves on the blocked draft · NEW → healthy draft proceeds (§2) |
| Dequeue `v2` | blocked → **0** · ready → **1** · NULL provenance → **0**. The blocked row was scheduled **earliest**, so absent the guard it would have been picked first |
| Auto-approval | body md5 == generated file · ready → fetched · blocked → **not fetched** |
| YouTube | chained `or=` proven to AND (§3); `deno check` clean |
| Regression | **402 passed / 0 failed** excluding `image-worker`, whose single failure is **pre-existing** (verified identical on clean `origin/main`: its `index.ts` calls `Deno.serve` at top level, needing `--allow-net`) |

Every DB proof asserted the applied body md5 equals the generated file. **That assertion caught a real
transcription drift mid-run** (an abbreviated comment block) which was corrected — the check is
load-bearing, not decorative.

**Live blast radius (re-derived independently by the auditor):** 835 queue rows · 0 NULL `post_draft_id`
· 31 queued · **5 dangling `post_draft_id`, all non-queued** · queue rows that become newly ineligible on
apply: **0**. Zero drafts currently carry the marker, so all six guards are **inert on day 1** and purely
forward-looking.

## 6. Apply / deploy plan

**Pre-apply STOPs** — any one trips ⇒ abort: baseline md5 drift on any of the four objects · artifact
sha256 ≠ pinned · `origin/main` moved to an unreviewed commit · unexpected files in the change set ·
rollback path invalidated.

1. Apply `20260729173000` (three functions, one transaction). Assert the three post-change body md5s.
2. Apply `20260729183000` (cron 48). It is **self-verifying**: locates the job by `jobname` (not a
   hardcoded jobid) and asserts the current command md5 before altering; drift aborts the transaction.
3. Insert `schema_migrations` ledger rows for **both** versions if applying via `execute_sql`
   (`apply_migration` mints its own version — the S5 lane's omission left a real gap; do not repeat it).
4. Push, **then** deploy `youtube-publisher` — the drift gate hashes **GitHub main**, and
   `supabase functions deploy` bundles from **CWD**, so deploy from the lane worktree after copying in
   `supabase/.temp/{project-ref,linked-project.json}`. Refresh `drift-check?write=true&slug=youtube-publisher`
   before deploying, and again after.
5. `deploy-verifier` on `youtube-publisher`: marker `youtube-publisher-s9-capability-enforcement`,
   `VERSION == youtube-publisher-v1.16.0`, `verify_jwt` unchanged.

⚠ **Push route (`branch-warden`).** The shared checkout's local `main` is **1 ahead of origin** with
another session's unpushed commit (`8fbba80`, cc-0087 migration backfill). Merging via `main` would drag
it — the v6.52 incident class. **Push the lane branch directly**; it cannot carry `8fbba80`. CCF-02 R4
forbids pushing another session's commit without explicit PK authorisation.

## 7. Rollback (proven byte-fidelity; execution not performed)

Both rollback files restore exact pre-change state — three function bodies (md5-verified against live)
and cron 48's exact command. The cron rollback asserts the **post-change** md5 first, so a double-rollback
or unrelated drift aborts rather than clobbering.

⚠ Rollback does **not** re-open slots or drafts already blocked — consistent with PK ruling 1
(capability-skipped occasions are terminal).

## 8. Carries (not fixed here)

1. **F-4** — `draft_approve_and_enqueue_scheduled` returns `ok:true` even when the enqueue row was
   suppressed. The operator sees "approved and scheduled" for a draft that will never publish; the only
   trace is an ephemeral `RAISE WARNING`. Product decision: refuse the approve, or surface the block.
2. **F-5** — `wordpress-publisher` is deployed, direct-reads `m.post_draft`, and is **excluded by PK
   ruling 2**. The result doc must therefore claim *"the four named platforms are enforced"*, never
   *"no publish path can emit a capability-blocked draft"*.
3. **F-7** — 5 dangling `post_draft_id` queue rows exist (all non-queued). The migration header's
   "0 NULL ⇒ no live behaviour changed" is still true for queued rows, but dangling is precisely one of
   the three fail-closed cases.
4. **F-8** — `publisher_lock_queue_v1/v2`, `auto_approver_fetch_drafts` and `gate_queue_on_asset_status`
   all have `proacl = NULL` (EXECUTE to PUBLIC), latent-contained by schema-`m` having no anon/authenticated
   USAGE. Unchanged by this lane, but now better justified as its own T3 REVOKE lane since
   `publisher_lock_queue_v2` has become a safety control. **Do not bolt it onto this migration** — it would
   break the apply/rollback identity.
5. No durable record of *suppression events* — only ephemeral log warnings. The per-draft evidence
   (`final_format_authority`/`final_format_reason`/`resolver_evidence`) is durable; the count of blocked
   enqueues is not.
6. `20260729120000` (S5 classifier v2, adds the 7th status `publisher_path_missing`) remains **unapplied**
   with no ledger row — while it stays dark, `publisher_path_missing` can never be a block reason.
