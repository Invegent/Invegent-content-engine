# RUNBOOK — AGP D-01 Gate-3 Phase 3.3: shadow-telemetry activation + soak

**Type:** planning document (runbook). **Authoring-only.** This document describes a procedure;
it does **not** execute it.
**Created:** 2026-06-19 Sydney · **Author:** chat (Session 1, implementation owner) · **Status:** DRAFT — external-review-pending
**Standing block:** Phase 3.3 flag-enable is a **standing PK BLOCK**. Nothing in this runbook is
authorised. Every flip / deploy / mutation below is a **hard PK gate** — see §9.
**Scope of authoring this artifact:** fully read-only against the system. 0 activation, 0 mutation,
0 secret change, 0 deploy, 0 DB write. Not committed to `main` (separate PK push gate).

---

## 0. What Phase 3.3 is

Gate-3 Phase 3.2 (shadow resolver + telemetry **infrastructure**) is APPLIED, DEPLOYED and VERIFIED:
the `r.avatar_resolution_shadow` table, the `public.resolve_and_record_avatar_shadow` RPC, and the
flag-gated hook in heygen-worker v2.2.0 all exist and are **inert** (the flag is OFF → strict no-op,
0 rows). **Phase 3.3 is the activation + bounded soak:** flip the `AVATAR_SHADOW_TELEMETRY` flag
truthy so each avatar submit records ONE shadow row (the deterministic shadow pick alongside the
live pick), watch the telemetry accrue for a bounded window, and decide — on evidence — whether the
deterministic resolver agrees with the live A2-pinned selection closely enough to justify the
separately-gated Gate-3 #4 cutover. **The soak changes NOTHING about live behaviour** — the shadow
result is never read back and never influences selection.

---

## 1. Verified current state (read-only, this session 2026-06-19 — verify-or-abort)

Every fact below was confirmed live read-only **today**; do **not** trust these values at flip time —
re-affirm them with §3 immediately before any flip.

| Fact | Verified value | How verified (read-only) |
|---|---|---|
| CE local HEAD | `4f553b8` (origin/main parity 0/0) | `git rev-parse HEAD` + `git rev-list --left-right --count` |
| Deployed heygen-worker | **v2.2.0**, Supabase function **version 36**, `verify_jwt=false`, ezbr_sha256 `ef5440407829e1f8999e437a720967a0dee65dc13b38a165f4217dc7782534f9` | `get_edge_function(heygen-worker)` |
| Shadow hook gating | `recordAvatarShadow` → `if (!shadowTelemetryEnabled()) return;` (truthy `AVATAR_SHADOW_TELEMETRY` ∈ {`1`,`true`,`yes`,`on`}); fail-open (errors swallowed); fires AFTER the live pick; result NEVER read back; calls typed `.rpc('resolve_and_record_avatar_shadow', {8 args})` | deployed source (version 36) |
| `lookupAvatar` | byte-unchanged (same `exec_sql` candidate query as pre-v2.2.0); live selection/submit path byte-identical | deployed source |
| `r.avatar_resolution_shadow` | exists, 21 columns; **RLS enabled, 0 policies** (deny-by-default); grants: `service_role` SELECT/INSERT/UPDATE/DELETE, `postgres` owner; `anon`/`authenticated`/`authenticator`/`PUBLIC` = none; **row count = 0 (soak baseline)** | db-rls-auditor (pg_attribute, pg_class, role_table_grants, `SELECT count(*)`) |
| `public.resolve_and_record_avatar_shadow` | SECURITY DEFINER, `search_path=public` (pinned), plpgsql, def md5 `31c12ee288b476c205f89cf6ead60dd2`; EXECUTE = `service_role`+`postgres` only (anon/authenticated/PUBLIC none); 8-arg signature `(p_post_draft_id uuid, p_client_id uuid, p_stakeholder_role text, p_render_style text, p_live_avatar_id text, p_live_voice_id text, p_live_selected_by text, p_run_id uuid)` → jsonb; INSERTs the shadow row, never reads prior rows (pure append) | db-rls-auditor (`pg_get_functiondef`, `aclexplode`) |
| Migrations applied | `20260618084054 agp_d01_3_avatar_shadow_resolver_telemetry`; `20260618092646 agp_gate3_revoke_authenticator_select_avatar_shadow` (names match repo; repo-filename timestamp prefixes differ — known cosmetic ICE drift) | `list_migrations` |
| Advisor (security) | only **INFO** `rls_enabled_no_policy` on `r.avatar_resolution_shadow` (the intended deny-by-default) — no defect | `get_advisors(security)` |
| `AVATAR_SHADOW_TELEMETRY` value | a Supabase **function secret** — NOT readable via SQL/MCP. **Inferred OFF** from row count = 0 + the strict no-op-unless-truthy gate | (not readable; inferred) |

**Recorded fields the soak metrics key off (real column names):** `agree` (bool — `shadow_avatar_id
IS NOT DISTINCT FROM live`), `agree_but_multicandidate` (bool — `agree AND candidate_count>1`),
`drift_class` (text), `candidate_count` (int), `candidate_set`/`rejection_reasons` (jsonb),
`shadow_rule` ∈ {`empty`,`primary`,`default_host`,`tiebreak_id`,`tiebreak_created_at`},
`live_selected_by` ∈ {`role_filter`,`fallback_limit1`,`preset`}, `created_at`/`resolved_at` (ts).
**`drift_class` ladder (mutually exclusive):** `input_anomaly` → `candidate_empty` → `multi_primary`
→ `multi_default_host` → `none` (agree) → `marker_drift` (disagree w/ primary/default_host rule) →
`ordering_drift`.

**Non-blocking notes (carry into review):** (a) `service_role` holds UPDATE+DELETE on this
append-only table — minor over-grant; not a soak blocker (service_role is back-end only, no
anon/authenticated path); flag if append-only immutability is a stated invariant. (b) repo↔prod
migration-timestamp drift is cosmetic (names match; not a re-applied-name violation).

---

## 2. Flip mechanism (the only state change Phase 3.3 requires)

**Mechanism:** set the Supabase **function secret** `AVATAR_SHADOW_TELEMETRY` to a truthy value.
**No code change. No migration. No table/grant change. No DDL/DML.**

```
# PK-RUN ONLY, after explicit authorisation (§9). Project ref mbkmaxqhsohbtwsqolns.
supabase secrets set AVATAR_SHADOW_TELEMETRY=1 --project-ref mbkmaxqhsohbtwsqolns
# (equivalently, set it in the Supabase dashboard → Edge Functions → Secrets)
```

- **Supabase `secrets set` normally applies on the next function invocation WITHOUT a redeploy** — the
  function reads the secret at invocation via `Deno.env.get('AVATAR_SHADOW_TELEMETRY')`. The
  **no-redeploy secret flip is the expected/preferred path.** Confirm propagation empirically by the
  first shadow row after the next avatar submit (§4 V1). Do **not** redeploy speculatively.
- **IF (and only if) propagation requires a redeploy** to refresh the function env, that redeploy is a
  **separate, additional hard PK gate**. **Guard (run first):** confirm the **repo `heygen-worker`
  source equals the deployed v2.2.0** (`get_edge_function` ezbr_sha256 / `VERSION` matches the repo
  `supabase/functions/heygen-worker/index.ts`) so the redeploy ships byte-identical v2.2.0 with **zero
  behaviour change** — **abort on any divergence** (a redeploy must never smuggle in a code change).
  The redeploy MUST preserve `verify_jwt=false`:
  ```
  supabase functions deploy heygen-worker --project-ref mbkmaxqhsohbtwsqolns --no-verify-jwt
  ```
  **`--no-verify-jwt` is MANDATORY** — heygen-worker is `x-heygen-worker-key`-authed; a default deploy
  flips `verify_jwt`→true and 401s the cron caller. Re-affirm `verify_jwt=false` post-redeploy.
  **Redeploy remains a separate PK hard gate.**
- **The flip itself is a hard PK gate (the standing block).** This runbook documents it; it does not
  authorise or perform it.

---

## 3. Pre-flip re-affirmation checklist (run read-only IMMEDIATELY before any flip — verify-or-abort)

Do not flip unless **all** pass against live state at flip time (not this document's snapshot):

- [ ] **R1 — HEAD/parity.** CE `git rev-parse HEAD` == the PK-approved commit; `origin/main` parity 0/0.
- [ ] **R2 — deployed heygen-worker.** `get_edge_function(heygen-worker)` → `VERSION='heygen-worker-v2.2.0'`,
      function version **36** (or the PK-approved version), `verify_jwt=false`, ezbr_sha256 ==
      `ef5440…2534f9`. **Abort on any drift.**
- [ ] **R3 — lookupAvatar byte-unchanged.** Deployed source `lookupAvatar` identical to §1; live
      selection/submit path unchanged; shadow hook still flag-gated + fail-open + result-never-read-back.
- [ ] **R4 — shadow baseline.** `SELECT count(*) FROM r.avatar_resolution_shadow` == **0** (or the
      explicitly-recorded baseline). A non-zero baseline means the flag was already on — STOP and reconcile.
- [ ] **R5 — RLS/grants posture.** RLS enabled, 0 policies; `service_role` only; `anon`/`authenticated`/
      `authenticator` = none; RPC EXECUTE = `service_role`/`postgres` only.
- [ ] **R6 — RPC identity.** `resolve_and_record_avatar_shadow` def md5 == `31c12ee2…0dd2`, SECDEF,
      `search_path=public`.
- [ ] **R7 — flag currently OFF.** Inferred from R4 (0 rows) + the no-op gate. (Secret not readable.)
- [ ] **R8 — no live-selection coupling.** Confirm (read-only) the A2 pin still drives live selection and
      `c.brand_avatar` markers are unchanged (`is_primary`/`is_default_host` unchanged from the approved
      baseline) — the shadow ladder reads markers but must not have been mutated as a side effect.

Any failure → **abort, do not flip, surface to PK.**

---

## 4. Soak: window, expected volume, per-step V-checks

**Expected volume:** ~**1 row per avatar submit** (`video_short_avatar` draft passing `runSubmitPhase`).
At the current rate that is **≈6 rows / 7 days**. The soak is **volume-bounded, not time-bounded by
itself** — run until enough rows accrue to read the distribution (target ≥ ~12–20 rows, i.e. roughly
**2 weeks** at current cadence), or a PK-set end date, whichever first. Record the start timestamp and
baseline (0) at flip.

**Per-step V-checks (all read-only):**

- **V1 — activation took effect.** Within the first avatar submit after the flip, exactly **one** new
  `r.avatar_resolution_shadow` row appears. `SELECT count(*)` increments from baseline by 1 per submit.
  **If 0 rows after a known avatar submit with the flag ON, disambiguate BEFORE concluding propagation
  failure:** check heygen-worker logs for `[heygen-worker] shadow telemetry failed (non-fatal)` —
  **if present**, the RPC is firing but erroring (fail-open swallowed it), NOT propagation lag → debug
  the RPC / grants / args; do **not** redeploy for "propagation". **If absent**, treat as likely
  flag-not-propagated / no qualifying invocation / expected-volume issue → re-check the flag value and,
  only if genuinely needed, the §2 redeploy gate (with its repo==deployed guard).
- **V2 — row shape valid.** New rows have non-null `live_avatar_id`, `live_selected_by`, `shadow_rule`,
  `candidate_count`, `agree`, `drift_class`, `created_at`; `candidate_set` is a well-formed jsonb array.
- **V3 — live behaviour unchanged.** No change to live avatar selection: `m.post_draft.draft_format.
  avatar_identity` and the HeyGen payload for the same drafts are identical to pre-flip semantics; the
  render lifecycle (`pending→rendering→generated|failed`) is unaffected. The shadow write is the only
  new effect.
- **V4 — fail-open holds.** No render failed/aborted due to shadow telemetry. (Inspect heygen-worker
  logs for `shadow telemetry failed (non-fatal)`; such lines must NOT correlate with render failures.)
- **V5 — isolation intact.** RLS/grants unchanged (R5); table remains append-only in practice (row
  count only ever increases during soak); no anon/authenticated read path appears.
- **V6 — no drift on agree.** For rows with `agree=true`, `drift_class` is `none` (sanity of the ladder).
- **V7 — markers untouched.** `c.brand_avatar` `is_primary`/`is_default_host` unchanged across the soak
  (the shadow ladder reads them; the soak must not write them).

---

## 5. Metrics to watch (read-only SQL templates — `r.avatar_resolution_shadow`)

```sql
-- Row accrual over the soak (per day)
SELECT date_trunc('day', created_at) AS day, count(*) AS rows
FROM r.avatar_resolution_shadow GROUP BY 1 ORDER BY 1;

-- Agree rate (headline: how often the deterministic shadow == the live pick)
SELECT count(*) AS total,
       count(*) FILTER (WHERE agree) AS agreed,
       round(100.0 * count(*) FILTER (WHERE agree) / NULLIF(count(*),0), 1) AS agree_pct
FROM r.avatar_resolution_shadow;

-- drift_class distribution (where and how the resolver diverges)
SELECT drift_class, count(*) FROM r.avatar_resolution_shadow GROUP BY 1 ORDER BY 2 DESC;

-- agree_but_multicandidate (agreed, but >1 eligible candidate → ordering got lucky)
SELECT count(*) FILTER (WHERE agree_but_multicandidate) AS agree_but_multi,
       count(*) FILTER (WHERE candidate_count > 1)      AS multi_candidate_total
FROM r.avatar_resolution_shadow;

-- live selection method vs shadow rule (context for disagreements)
SELECT live_selected_by, shadow_rule, count(*) FROM r.avatar_resolution_shadow GROUP BY 1,2 ORDER BY 3 DESC;
```

Watch: **(1) row accrual** (is telemetry flowing?), **(2) agree rate** (headline parity signal),
**(3) drift_class distribution** (is divergence `ordering_drift`/`marker_drift` vs benign), **(4)
agree_but_multicandidate** (agreement that depended on tiebreak ordering — the soft-spot the
deterministic resolver is meant to eliminate).

---

## 6. Rollback (single step, strict no-op)

```
# PK-RUN ONLY. Unset or set the flag falsy.
supabase secrets unset AVATAR_SHADOW_TELEMETRY --project-ref mbkmaxqhsohbtwsqolns
#   (or: supabase secrets set AVATAR_SHADOW_TELEMETRY=false --project-ref mbkmaxqhsohbtwsqolns)
```

- Effect: `shadowTelemetryEnabled()` returns false → `recordAvatarShadow` returns immediately → **no
  RPC call, no new rows**. Strict no-op. Live selection was never coupled, so there is nothing else to
  revert.
- **No code, no migration, no data rollback** required. Existing shadow rows are inert telemetry —
  retain for analysis (or, if PK wants a clean baseline, a separate gated `DELETE`/`TRUNCATE` is its
  own hard gate; not part of rollback).
- If a §2 redeploy was used, no redeploy is needed to roll back (the unset flag short-circuits at the
  next invocation).

---

## 7. Decision criteria after soak (informational — Gate-3 #4 is separately BLOCKED)

The soak produces evidence only. Proceeding to **Gate-3 #4 (cutover)** is a **separate hard PK gate**
and remains BLOCKED. Indicative read of the telemetry (for PK's decision, not a trigger):
- **High agree rate + drift only `none`/benign** → the deterministic resolver tracks the live pin →
  strengthens the case to *propose* (still PK-gated) the shadow-first cutover with the 100%-parity /
  0-drift bar.
- **Non-trivial `ordering_drift`/`marker_drift`, or high `agree_but_multicandidate`** → the resolver
  diverges or only agrees by tiebreak luck → cutover NOT justified; feed back into marker/priority design.

---

## 8. Explicit non-goals of Phase 3.3

No avatar activation. No change to live avatar selection, `lookupAvatar`, the A2 pin, or
`c.brand_avatar` markers. No Branch B. No schema/migration/grant change. No new RPC. No content-engine
runtime behaviour change. No dashboard change. The soak is read-shadow-only telemetry.

---

## 9. Governance — hard PK gates (STOP conditions)

Each of the following requires **explicit PK authorisation** and is **out of scope of authoring this
runbook**:
- Flipping `AVATAR_SHADOW_TELEMETRY` truthy (the activation) — the standing block.
- Any redeploy of heygen-worker (only if §2 propagation requires it; `--no-verify-jwt` mandatory).
- Any DB mutation/migration/grant change, EF deploy, prod deploy, push to `main`, code change, or any
  live behaviour change.
- Any change to live avatar selection, `lookupAvatar`, the A2 pin, or `c.brand_avatar` markers.

Note: the SQL governance hook is **log-only / not enforcing**, and `execute_sql` stays in `ask` — do
**not** assume SQL is blocked; the gates above are the controlling constraint, not tool-level blocking.

---

## 10. Provenance of this runbook

Authoring-only artifact. All current-state facts in §1 were verified read-only on 2026-06-19
(get_edge_function + db-rls-auditor catalog reads + local git). 0 activation, 0 mutation, 0 secret
change, 0 deploy, 0 DB write performed in producing this document. DRAFT — pending Session 2 external
review; not committed to `main` (separate PK push gate).
