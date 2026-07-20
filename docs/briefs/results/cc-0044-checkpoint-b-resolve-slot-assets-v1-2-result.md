# Result cc-0044 Checkpoint B — resolve_slot_assets v1.2 shared-pool fallback

**Brief file:** `docs/briefs/cc-0044-ultimate-tmr-proof-1-data-only-onboarding.md` (Route B / Checkpoint B)
**Executed by:** Claude Code (build lane) + PK (irreversible apply/push authorised this window)
**Completed:** 2026-07-20 Sydney

> **Scope:** this is the **Checkpoint B** result only — NOT the final cc-0044 result. It records the
> resolver change that models the shared-pool fallback the cc-0041 schema already carries. It ships
> **DARK / behaviour-preserving**; shared-pool activation is a separate, gated future step.

---

## 1. Result status

`Complete` — v1.2 is LIVE, dark, and proven behaviour-preserving.

## 2. Commit(s)

- `<PENDING PUSH>` — `feat(resolver): resolve_slot_assets v1.2 pool-policy-governed shared-pool fallback (dark)` — migration `20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql` (+ lane harness/result). Committed after re-baseline onto `origin/main` and a post-rebase branch-warden pass; the pushed migration is byte-identical to the applied+reviewed artifact (SHA-256 `411b330f…`, body MD5 `5ef7e729…`).

## 3. Files changed

- `supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql` — created (the reviewed v1.2 migration; version renumbered from the review-time `20260720050000` to `20260720150000` for monotonic ledger order — **content byte-identical**, so the external review pin holds)
- `_harness/cc0044_cpB_resolve_shared_fallback/ROLLBACK_resolve_slot_assets_live_captured.sql` — created (byte-exact live v1.1 rollback artifact)
- `_harness/cc0044_cpB_resolve_shared_fallback/CARRIES.md` — created (carries C1/C2)
- `docs/briefs/results/cc-0044-checkpoint-b-resolve-slot-assets-v1-2-result.md` — created (this file)

## 4. Actions taken

### 4.1 Captured v1.1 baseline + byte-exact rollback
- Captured the EXACT live `pg_get_functiondef(public.resolve_slot_assets(text,text,text,uuid,text))` and built the change FROM the live body (the repo ledger `20260704002811_...scrim48` had diverged — it was NOT used as the base).
- Saved the byte-exact rollback artifact; validated it against live: **`prosrc` MD5 `2008b8ed9b6050eb74cd6a359ffe2c82`, length 12668** — an exact match to the live v1.1 body.

### 4.2 v1.2 migration
- `CREATE OR REPLACE FUNCTION public.resolve_slot_assets(...)`, modifying ONLY the `static_background` candidate-set construction. Logo and every other slot untouched.
- Preserved: `SECURITY DEFINER`, `SET search_path=''`, `STABLE`, owner `postgres`, ACL `{postgres=X/postgres, service_role=X/postgres}` (service_role EXECUTE only; no anon/authenticated), the `no_governed_background` / `missing_required_logo` fail-closed returns, seed rotation, and the scrim + per-asset scrim-override logic.
- Reads two additional `c.*` tables under the SECDEF definer: `c.client_asset_pool_policy` and `c.shared_creative_asset`. Pool→scope mapping mirrors `analyze_asset_gap` exactly (`allow_vertical_shared`→`vertical_shared`, `allow_global_shared`→`global_generic`, only for `client_preferred`/`best_fit`). Shared eligibility **inlines** the canonical `resolve_shared_pool_assets` fence chain (it does NOT call that function — that function returns only a single top asset with no text-safety, so it cannot support `best_fit` merge), then applies the resolver's own text-safety classification.
- **Applied LIVE 2026-07-20** (PK-authorised, execute_sql; `apply_migration` deny-listed): live `prosrc` MD5 = **`5ef7e729c4d084d5a15d2edec799b79c`** (len 19715). Ledger backfilled: **version `20260720150000`**, name `resolve_slot_assets_v1_2_shared_pool_fallback`.

### 4.3 Behaviour contracts (static_background slot)
- **`client_only`** (the default and ALL current clients — no policy row ⇒ client_only): unchanged client candidate path; output **byte-identical** to v1.1.
- **`client_preferred`**: if ANY eligible client background exists → use the client set only; otherwise evaluate the eligible shared set.
- **`best_fit`**: combine eligible client + shared backgrounds into ONE normalised set, ranked by comparable existing signals — text-safety class (`true` before `needs_scrim`), then created_at ASC, then asset_id ASC, with **origin (`client`<`shared`) as a FINAL tie-breaker only** (origin does NOT auto-outrank). `client_asset_score_bias` / `minimum_fit_score` are **RESERVED / UNIMPLEMENTED in v1.2** — no `best_fit` policy row may be activated until those scoring semantics receive a separate architecture ruling.

### 4.4 2,000-input PP/NDIS regression — zero mismatches
- Method: a temporary in-session callable copy of the NEW body (its `prosrc` MD5 == the migration body MD5) vs the live function, over `{property-pulse, ndis-yarns} × 25 templates × {NULL,facebook,instagram,linkedin} × {image_quote,video_short_stat} × 5 seeds = 2000 inputs`, asserting exact JSONB equality. **0 mismatches** (pre-apply, live-v1.1 vs v1.2-body). Confirmed 0 pool-policy rows so no current client can change behaviour. **No production rows were written** (a temporary callable copy only).

### 4.5 Seven isolated fixture scenarios
Run in an **isolated in-session sandbox** (parallel fixture tables in the session-temp schema — never the production `c.*` tables; no local Docker/Postgres was available). All passed:
1. `client_preferred`, no own bg → resolves the shared background; `Scrim.opacity`=40 for a text-safe shared asset.
2. `client_preferred`, with an eligible own bg → own only (shared set not scanned).
3. `best_fit`, own + shared eligible → top = the earlier-created shared asset, ranking ABOVE the later client asset (client does **not** auto-outrank); across seeds all three URLs (own + two shared) appear → true merge.
4. `client_only`, no own bg → `fail_closed / no_governed_background` (shared pool ignored).
5. Shared asset selected → valid `Background.source` URL + scrim modification (covered by scenario 1).
6. `client_preferred` with no permitted scope → `fail_closed / no_governed_background` (scope gating).
7. `vertical_shared` → resolves the matching-vertical asset; rejects the mismatched-vertical asset as `vertical_mismatch`; a `production_use_allowed=false` asset is correctly excluded.
- **The fixture proof caught a real latent defect** (see §6 / CARRY-2): a bare-literal `text[]` array append raised `22P02 malformed array literal`; fixed with an explicit `::text` cast (value-identical) before re-proof.

### 4.6 DB / RLS posture preservation (db-rls-auditor: PASS)
- CREATE OR REPLACE preserves owner/ACL/SECDEF/search_path — verified live; the migration adds NO GRANT/REVOKE and no new EXECUTE grantee (anon/auth EXECUTE = false).
- Both new `c.*` tables are RLS-enabled deny-all with no anon/authenticated grant; read only via the postgres-definer function → no new REST/anon surface (no PGRST106 trap).
- Pure function-body replace: no DDL/ALTER/DROP, no GRANT/REVOKE, no `m.*`/`c.*` writes, no ON CONFLICT/upsert.
- Migration naming: a NEW distinct identity; ledger version minted at apply (execute_sql path) → backfilled explicitly.

### 4.7 External review + PK acceptance
- `ask_chatgpt_review` (review_id `c092c71a-d4c5-4278-a00b-e1bb9aaddab3`), pinned to migration SHA-256 `411b330f…` / body MD5 `5ef7e729…`: verdict **disagree / risk high / confidence medium → auto-escalate to PK**. It **verified the load-bearing claims** (0 pool-policy rows, 2000/0 regression) and named **no concrete defect** — the pushback was generic T3-render-heart caution (triage: `policy_decision` + `runtime_verification_required`, not `concrete_defect`). Its asks (more testing, risk assessment on the new `c.*` reads) are discharged by the 2000-input regression, the seven fixture scenarios, and the named post-apply PP render-heart proof. **PK accepted at the gate and authorised the apply + push this window.**

### 4.8 Post-apply live verification
- Live function MD5 == `5ef7e729…` (v1.2), ledger row `20260720150000` present, posture byte-preserved.
- **Dark confirmed (precise):** `c.client_asset_pool_policy` has **no rows** (⇒ every client resolves via the unchanged client_only path) AND there are **zero eligible shared assets** (the `c.shared_creative_asset` table holds 8 rows inserted by a separate lane, **all fully fenced** — 0 intrinsically eligible; the resolver would reject them even were a policy opted in).
- **Render-heart byte-identical spot-check:** live v1.2 vs a temporary copy of the v1.1 rollback body over the full 2000-input PP/NDIS matrix → **0 mismatches**; a real PP `image_quote` resolution (Background `Perth_CBD_Suburbs.jpg`, `Scrim.opacity`=48, Logo `PP_logo_2.png`) is unchanged.

## 5. Constraints confirmed (forbidden items — NOT done)
- No `c.client_asset_pool_policy` rows set — confirmed (0 rows).
- No shared/client asset promoted — confirmed.
- No render performed — confirmed.
- No register entry cut by this lane — confirmed (pointer handed to the orchestrator).
- `client_only` path unchanged, logo/other slots untouched, fail-closed behaviour preserved — confirmed (2000/0 regression + fixtures).
- No waiver of standing guards (verify_jwt N/A for DB; SECDEF/search_path preserved; migration-name discipline; hashes re-pinned).

## 6. Open issues (carries — block BROAD shared-pool activation; neither blocks the dark apply)
- **CARRY-1 (activation-blocking) — analyzer↔resolver text-safety parity.** `resolve_shared_pool_assets` (used by `analyze_asset_gap` to decide `shared_hit`) does NOT apply the text-safety fence the resolver applies. A non-text-safe shared bg could be counted a "shared hit" by the analyzer yet fail-closed at render (FAIL-SAFE direction). **No broad activation until aligned; Proof #1 may proceed only if the chosen shared asset already carries a resolver-accepted text-safety value AND analyzer diagnosis + render resolution agree for that exact asset.**
- **CARRY-2 (concrete latent defect, found by this lane's fixture proof).** Live `analyze_asset_gap` builds `v_permitted` with bare-literal appends (`v_permitted || 'vertical_shared'` / `|| 'global_generic'`) → raises `22P02 malformed array literal` the moment the FIRST `client_preferred`/`best_fit` policy row exists. Fix = add `::text` to both (value-identical, one line each), separate lane; **must land before/with the first activation.**
- **main-drift / commit landing:** re-baseline the migration onto current `origin/main` before commit (handled in the closeout push step).
- **Cross-lane note:** a separate "Route-B resolver wiring" kickoff (2026-07-20) still treated the resolver→shared read as an open question; this lane RESOLVES it — the live resolver now reads `c.shared_creative_asset` (dark). That lane should converge here, not re-wire.

## 7. Next recommended step

Hold shared-pool activation until CARRY-1 (analyzer parity) and CARRY-2 (`analyze_asset_gap` `::text`) are dispositioned. The next cc-0044 checkpoint (demand-write loop / first surfaced-requirement closure) proceeds independently; this checkpoint's resolver substrate is now live and dark.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass` (pending the commit/push landing confirmation).

**Notes:**
- Output matches the Checkpoint B brief: shared-pool fallback modelled, ships dark, client_only byte-identical.
- Constraints respected (no policy rows, no promotion, no render, no register cut).
- Only the approved files changed (migration + lane harness + this result doc).
- Success criteria for the checkpoint (behaviour-preserving substrate, proven) met; activation is a later gate.
- New risk: CARRY-2 will break `analyze_asset_gap` at first activation if not fixed first — tracked.

## 9. Learning notes (chat fills this)

- The load-bearing fixture proof earned its keep — it caught a real `22P02` latent bug (also present in live `analyze_asset_gap`) that pure inspection and the client_only regression both missed (that code path is never exercised for client_only).
- Precise dark-state wording matters: "no pool-policy rows AND zero eligible shared assets" is correct; "shared table empty" is now false (8 fenced rows exist from a separate lane).
- Building from the captured LIVE body (not the diverged repo ledger) was essential — the repo `20260704002811` had drifted from live.
