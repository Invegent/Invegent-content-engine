# R3a — resolver enforcement (SHADOW) · build + freeze packet · **v4**

**Created:** 2026-07-25 Sydney · **Lane:** CE code/DB implementation of R3a (cc-0079 R3, model B · D1 · shadow-first)
**Status:** **BUILT, FROZEN, NOT APPLIED / NOT DEPLOYED.** No DDL, no DML, no deploy, no commit, no push.
**Tier:** T3 (production draft-creation spine) — **but additive + shadow, reversible.**
**Contract:** `resolver-enforcement-r3-contract-gate1-v1.md` (`a354a15…`) — this builds its **§11 R3a** slice only.
**Canonical ID:** NOT self-allocated.

> **v4 supersedes v3/v2/v1.** Shadow `apply-harness-auditor`: v1 CONCERNS (3 MEDIUM) → v2 CONCERNS (1 MEDIUM
> residual + 1 LOW) → v3 CONCERNS (2 MEDIUM: an inert function/ordering predicate) → **v4 fixes it.**
> All prior versions preserved unchanged. **Use v4.**
>
> **v4 fix (the v3 finding):** v3's function-existence guard (migration pre-assertion) and the runbook's
> `resolver_present` ordering check compared `pg_get_function_identity_arguments()` to a parameter-name
> string. The auditor flagged this as inert. **Independent live check corrected the auditor's premise** —
> on this instance `pg_get_function_identity_arguments` *does* return names (`p_client_id uuid, …`), so the
> v3 predicate actually worked here — **but the auditor's recommendation is still right**: v4 switches both
> to `to_regprocedure('m.resolve_final_format(uuid,text,text,text,text)') IS NOT NULL`, which keys on the
> SIGNATURE, is version-robust, and removes any parameter-name fragility. The underlying risk was never
> open (plain `CREATE FUNCTION` fail-closes a collision inside the single-txn migration); v4 makes the
> *credited* control faithful too. Resolver body byte-identical v1→v4; ai-worker code unchanged throughout.

**Harness fixes:**
1. **check-7 apply/rollback identity (columns)** [v2] — NAMED fail-closed pre-apply assertion (aborts if
   any of the 9 columns pre-exist) + plain authoritative `ADD COLUMN` + idempotent `DROP … IF EXISTS`.
2. **check-7 apply/rollback identity (FUNCTION)** [v3, the v2 residual] — the v2 run flagged that the
   resolver was still `CREATE OR REPLACE` with no pre-existence guard, so a pre-existing definition could
   be silently overwritten and then dropped by rollback without restore. **v3 extends the pre-assertion to
   also abort if `m.resolve_final_format(uuid,text,text,text,text)` exists, and switches to plain
   `CREATE FUNCTION`** — apply is now authoritative over EVERY object (9 columns + 1 function), uniformly
   symmetric with rollback. Live: 0 of 9 columns + function absent.
3. **check-1 ordering** [v2, relabelled v3] — an executable ordering DECISION query (columns-present AND
   resolver-present, both must read `true`); v3 relabels it honestly as a **PK-gate operator-read query**
   (a DB statement cannot auto-abort an external EF deploy) rather than an auto-STOP, clearing the v2 LOW.
4. **check-2 shadow-only** [v2] — `recommended_format`/`recommended_reason` unchanged-writer is EVIDENCED:
   diff `-U15` shows those lines as unchanged context adjacent to the `+` shadow keys + a byte-identical
   grep proof. Resolver RETURNS a decision, performs no UPDATE. (Harness noted clean: `resolveShadow`
   fail-open · nullable columns · revert identity.)

> **Two artifacts, one lane. Separate hashes; apply order is FIXED.**

| # | Artifact | Path | sha256 | Bytes |
|---|---|---|---|---|
| 1 | DB migration **v4** (columns + function + `to_regprocedure` pre-assertion + resolver) | `docs/briefs/artifacts/r3a-resolver-shadow-migration-v4.sql` | `07313a891e27b557eb91e2285db94938347655ffdb0c4dc961cc0917d08f080c` | (see freeze) |
| 2 | ai-worker shadow diff v2 (wide-context; **code unchanged**) | `docs/briefs/artifacts/r3a-ai-worker-shadow-v2.diff` | `c578f98dd0b988a7436d0dc8aabe5fd0d97f763abbc6ca1bdaeaf49e420c39f5` | 13023 |
| — | shadow-boundary evidence | `docs/briefs/artifacts/r3a-shadow-boundary-evidence.md` | `5250875e7b60649207fbc48943e191878053c30c92a0978730181b401fbf7135` | 2317 |
| — | apply+deploy runbook **v4** (ordering decision query via `to_regprocedure` + fn-symmetric rollback) | `docs/briefs/artifacts/r3a-apply-deploy-runbook-v4.md` | `093daf486dfe604dfef6e2efd6293926ac6dc6420cc4e0ff14a05feb1db257fa` | (see freeze) |

> The resolver function body (Part 2) is **byte-identical** v1→v2→v3; the ai-worker code is unchanged
> across all versions (the v2 diff differs from v1 only in context width). Only the migration's Part 1
> (pre-assertion + `CREATE` keyword) changed v2→v3.

---

## 0 · Stale-ref gate
CE `HEAD == origin/main == 64523be`, parity 0/0. Worktree `C:\Users\parve\ce-wt-r3a-shadow` (branch
`r3a-resolver-shadow`), 0 commits ahead of base. Re-run at the gate.

---

## 1 · MANDATED PRE-BUILD PROOF — the natural tuple `(client_id, platform, day_of_week, publish_time)`

Proven first-hand, live, 2026-07-25, **before** any build (the dispatch precondition):

| Property | Evidence | Verdict |
|---|---|---|
| **Unique** | constraint `client_publish_schedule_client_id_platform_day_of_week_publ_key` = `UNIQUE (client_id, platform, day_of_week, publish_time)` — **constraint-enforced**, not merely data-unique | ✅ |
| **Normalized** | `publish_time` = `time without time zone`, **0 rows with non-zero seconds**; `day_of_week` integer with `CHECK 0..6`; `platform` FK → `t."5.0_social_platform"` (bounded) | ✅ |
| **Timezone-stable** | every tuple component is a stored local-definition value carrying no timezone; the identity never shifts. Only the *derived occurrence timestamp* uses the client tz — the key does not | ✅ |
| **Durable across delete-recreate** | `public.save_publish_schedule` does `DELETE … WHERE client_id AND platform` then `INSERT … SELECT FROM jsonb_array_elements`, reproducing `day_of_week`/`publish_time` **byte-identically**; the surrogate `schedule_id` (PK) changes, the natural tuple is reproduced exactly → a D1 assignment keyed on the tuple **re-attaches** | ✅ |
| **No ambiguous duplicate match** | UNIQUE ⇒ ≤1 row per tuple; live 237/237 rows distinct, **0 duplicate tuples** (enabled or all) | ✅ |

**Conclusion: duplicates are NOT permitted — no disambiguator required. Safe to build D1 on this key.**
The §7 anti-resurrection rule (a genuinely removed day/time must not silently re-bind) is honoured
downstream: R3a's resolver reads only `is_current` planner assignments; the planner-assignment store +
its `is_current`/`superseded_by` versioning is R3b/W1, not built here — in R3a `requested_format`/
`format_mode` arrive as caller inputs (NULL until W1), so the tuple proof is the **precondition** that
lets R3b key assignments safely.

---

## 2 · What R3a does (shadow, reversible)

- **Adds** 9 additive nullable columns to `m.post_draft` (no default, no backfill, no consumer change).
- **Adds** `m.resolve_final_format(uuid,text,text,text,text)` — the governed resolver: SECURITY DEFINER,
  **deterministic** (no `now()`/`random()`; `format_resolved_at` is caller-stamped), grant-disciplined
  (owner postgres, EXECUTE to `service_role` only, revoked from PUBLIC/anon/authenticated).
- **ai-worker** (v2.20.0→v2.21.0) computes the resolver's decision into the shadow columns on both
  draft paths **and leaves `recommended_format` exactly as today** (the Advisor pick). Fail-safe: any
  resolver error → shadow columns null + `final_format_reason='resolver_unavailable'`, draft proceeds.

**Production output is unchanged.** Renderers/publishers read `recommended_format`, which no path in R3a
alters. The shadow columns are read by nothing yet — they exist to measure the shadow delta for the R3c
flip decision.

### Precedence implemented (contract §3 / dispatch)
`fixed`→**planner** iff `requested_format` passes the capability gate, else recorded fallback ·
`policy`→**advisor** iff in the eligible set, else **policy** pick (highest-share eligible) ·
`manual`→**operator** iff eligible · `legacy`→**advisor** iff eligible, else recorded fallback ·
deterministic fallback = highest-share eligible (tie: key ASC), always stamped · empty eligible set →
**governed_skip**. **An invalid planner request is never silently ignored** — it surfaces as
`fixed_format_ineligible:<fmt>` with `fallback_occurred=true`.

The resolver EMITS: `planner_requested_format` · `effective_format` · `authority` · `reason` ·
`fallback_occurred` · `support_evidence` · `policy_evidence` · `policy_version` · `gate_predicates`.

### Eligible-set — live-verified
Reproduced the **post-Slice-2 valid palettes exactly** (read-only, inline): fb `[image_quote,carousel,
text]` · ig `[carousel,image_quote]` · li `[text,image_quote]` · yt `[video_short_kinetic,…4]`. The
resolver's eligibility = the allocator's policy-backed set **∩ platform_support** (precedence gate 1).

---

## 3 · Review chain — all clean
| Gate | Result |
|---|---|
| Tuple proof (§1) | PASS — key is constraint-unique, normalized, tz-stable, durable, unambiguous |
| `db-rls-auditor` (artifact 1 v1) | **pass** — additive/nullable safe · search_path='' all-qualified · born-anon grants correct · deterministic · row-scoped · **zero new advisors** |
| `db-rls-auditor` (artifact 1 **v2 delta**) | **pass** — pre-assertion read-only + fail-closed + correctly pinned · plain ADD authoritative/additive · rollback idempotent · 3 column lists agree · no new advisor |
| `branch-warden` (artifact 2) | **safe** — exactly `supabase/functions/ai-worker/index.ts`, 0-ahead, base at origin/main, main undisturbed (code unchanged v1→v2) |
| Local build | `deno check` clean · `recommended_format`/`reason` byte-unchanged both paths (evidenced §check-2) |
| Shadow `apply-harness-auditor` | v1 **CONCERNS** (3 MEDIUM) → v2 **CONCERNS** (1 MEDIUM + 1 LOW) → v3 **CONCERNS** (2 MEDIUM, inert predicate) → **v4 PASS** (clean, 0 findings, 10/10 checks) |
| `db-rls-auditor` (v4 delta) | **pass** — `to_regprocedure` guard read-only + signature-exact; function + 9 columns live-absent; plain CREATE safe under pre-assertion; grants unchanged; rollback idempotent+symmetric |
| External review (pinned **`07313a89…+c578f98d…`**, v4) | ⚠ **partial → PK escalation** (review_id `3cf06a5c-4a49-4279-9003-9ba64c22a998`). No concrete defect named; asks for regression-test + runtime-stability evidence. Triage: `runtime_verification_required` — a shadow lane produces divergence evidence POST-apply by design; the static chain (harness PASS · db-rls pass · branch-warden safe · deno clean) + live-validated `to_regprocedure` is the pre-apply evidence available. **This is a PK decision gate — surfaced, not overridden.** |

**Carried correctness note (db-rls-auditor):** the resolver applies `platform_support` where the
allocator demand-grid does not, so the resolver eligible set is a strict subset. Intended (it will never
propose an unpublishable format). In shadow it only affects `shadow_resolved_format`. **The R3c flip gate
must reconcile this**, and complete the three §6.3 predicates recorded as `not_evaluated_r3a`
(buildable · publisher_path · template_provider).

---

## 4 · ⚠ Apply ordering is a HARD sequencing constraint

The shadow columns are written **unconditionally** in the `post_draft` UPDATE (only the resolver *call*
is fail-safe). Therefore:

> **Artifact 1 (columns + resolver) MUST be applied and verified live BEFORE artifact 2 (ai-worker
> deploy).** Deploying the worker first makes every draft UPDATE reference non-existent columns → the
> draft write fails. This is a correctness precondition, not an ordering nicety.

**v2 makes this executable (harness check-1):** the runbook's §STEP 2 is a NAMED live pre-check —
`SELECT count(*) = 9 AS ok_to_deploy_worker FROM information_schema.columns WHERE … (the 9 names)` — a
**hard STOP** on the worker deploy when it returns false. The ordering is enforced at the gate, not narrated.

**Deploy standing gotchas (enforce at the gate):**
- ai-worker is an `x-ai-worker-key` caller → deploy with **`--no-verify-jwt`** (CLI default flips it true → 401→502). Prefer `scripts/safe-deploy.sh ai-worker --allow-warn`.
- Supabase bundles from CWD → deploy from the worktree (or merge to main first), else old code ships silently. Grep the deployed bundle for `ai-worker-v2.21.0`.
- Helper+entrypoint change → after deploy refresh `drift-check?write=true&slug=ai-worker`; run `deploy-verifier` (VERSION==repo, marker-in-bundle, verify_jwt=false).

---

## 5 · Gate sequence (STOP at PK)
1. Re-run §0 stale-ref.
2. **PK apply gate — artifact 1** (migration via `apply_migration`; note it stamps its own version → add the repo migration file after, as with the Slice A wrapper).
3. Post-apply proof: columns exist; `m.resolve_final_format` present; grant probe (anon/authenticated denied, service_role OK); a read-only smoke calling the resolver for property-pulse across modes reproduces §2 eligible sets.
4. **PK deploy gate — artifact 2** (ai-worker v2.21.0, `--no-verify-jwt`, from the worktree). deploy-verifier.
5. Shadow observation opens (the R3c exit criteria clock starts): ≥1 full weekly planning+materialisation cycle · zero unsupported shadow-effective formats · all divergences classified · no unexplained planner override · PK review · exact flip+rollback packet. **The flip is R3c — NOT this lane.**

## 6 · Rollback (additive-only, zero data mutated — v2 idempotent + authoritative)
- Artifact 2: revert ai-worker to v2.20.0 (redeploy) — or EF prior-version.
- Artifact 1 (v2): `DROP FUNCTION IF EXISTS m.resolve_final_format(uuid,text,text,text,text);` then
  `ALTER TABLE m.post_draft DROP COLUMN IF EXISTS advisor_format, … , DROP COLUMN IF EXISTS resolver_evidence;`
  (full idempotent block in the artifact header + runbook). **The v2 pre-assertion proves apply created
  all nine (none pre-existed)**, so rollback drops only migration-owned columns and never operator data;
  `IF EXISTS` makes it re-runnable. **Blast radius: zero production output, zero data.**

## 7 · Scope honoured / non-claims
Shadow only — `recommended_format` writer unchanged; **no flip** (R3c owns it). No planner-assignment
store (R3b/W1). No `save_publish_schedule` change (D2 not taken — D1 chosen). No capability-gate code
predicates (buildable/publisher/template recorded `not_evaluated_r3a`). No deploy, no apply, no commit,
no push. Does not claim the flip is safe without the shadow window (it is not). Does not claim the three
code-side predicates are evaluated (they are honestly deferred).
