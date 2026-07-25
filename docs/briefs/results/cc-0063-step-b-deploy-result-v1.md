# AGP Step B (heygen-worker v2.4.1) — Deployment Result (v1)

> **Lane:** cc-0063 Step B — governed host-designation resolver + `:92` repair · **Deploy hand:** S1 (independent; S4 authored) · **Type:** T3 EF-deploy result
> **Verdict:** **PASS** — deployed to production on the exact reviewed change, deploy-verifier clean, `verify_jwt` preserved, no regression. **One residual by design:** Stage-2 leg-1 (live designation-driven submit) is UNOBSERVED and cannot be manufactured — the standing non-claim holds until a natural avatar submit arrives.
> **Landed commit:** CE `origin/main` `64523be → 7d413f3` (FF). **Deployed:** `heygen-worker` internal version 44, `VERSION='heygen-worker-v2.4.1'`. Project `mbkmaxqhsohbtwsqolns`, 2026-07-25.

---

## 1 · Pre-landing verification (all STOP-checks passed)

| Check | Result |
|---|---|
| Reviewed diff hash | ✅ `git diff c8f8578 e5c8d96 -- heygen-worker/` = **`a44dabd8…`** (exact) |
| Change set | ✅ exactly `heygen-worker/index.ts` + `index.test.ts` — nothing bundled |
| Stale-ref both refs | ✅ CE origin/main `64523be`, Step B branch `e5c8d96` — undrifted |
| Tests | ✅ `deno test` **15/15** |
| branch-warden | ✅ **safe** — FF-only, 2 files, one commit, dirty tree not swept |

## 2 · Landing

`git checkout e5c8d96 -- <2 files>` onto the main checkout (blobs verified == e5c8d96; staged diff hashed **`a44dabd8…`**), committed as **`7d413f3`** (parent `64523be`, exactly 2 files, +229/−32), branch-warden `safe`, pushed `64523be..7d413f3 main -> main` (clean FF). Local main tracked origin cleanly; no other lane's commit rode along.

## 3 · Deploy (sanctioned path)

Per the documented EF-deploy sequence (merge → drift-refresh → B-FD → `safe-deploy --allow-warn` → re-refresh → A-LE):

1. **Drift refresh (slug-scoped):** replicated cron jobid-80's `net.http_post` to `drift-check?write=true&slug=heygen-worker` (vault-sourced auth, no secret in transcript) → class moved from **stale A-LE** (cached, repo still 2.3.0) to **B-FD** (repo v2.4.1 ahead of deployed v2.3.0) once GitHub-raw propagated. This is the sanctioned pre-deploy step; safe-deploy reads the cached register.
2. **Deploy:** `scripts/safe-deploy.sh heygen-worker --allow-warn` from the main checkout (carries v2.4.1 + `config.toml`) → WARN(B-FD)+allow-warn → `supabase functions deploy heygen-worker` → uploaded `index.ts` + `qa.ts` → **exit 0** (Docker-off warning benign).
3. **Re-refresh:** → resolved to **A-LE clean** (deployed == repo v2.4.1, `repo_hash_normalised == deployed_hash_normalised == ff440794…`).

**verify_jwt posture:** preserved `false` via `config.toml [functions.heygen-worker] verify_jwt = false` (no CLI flag; the pin is the mechanism). Deployed from a CWD carrying config.toml — the 401→502 flip did not occur.

## 4 · deploy-verifier — overall PASS

Recomputed from ground truth (deployed bundle via `get_edge_function` + repo at `7d413f3` + live drift view), never from claimed values:

- **`deploy_content_verdict: PASS`** — the deployed bundle contains the Step B marker (`ORDER BY ba.is_default_host DESC, ba.is_primary DESC, ba.created_at ASC, ba.brand_avatar_id ASC` + `avatar_resolution_outcome`) **and** `VERSION='heygen-worker-v2.4.1'` (bundles-from-CWD "old code" trap defended); deployed VERSION == repo; **`verify_jwt == false`**.
- **`drift_verdict: CLEAN`** — A-LE with `direction=clean`, `severity=none`, identical normalised hashes (deployed==repo). The agent verified from the live `drift-check classify()` source that A-LE here = normalise-equal (line-ending only), a clean state, not the stale class.
- **`overall: PASS`**, `human_stop_signal: false`. Deployed internal version 44, `ezbr_sha256 3ce996b6…`.

## 5 · Post-deploy checks (dispatch 5–8)

- **5. Live version + deployed commit** ✅ — `heygen-worker-v2.4.1` (internal 44); source commit `7d413f3` on origin/main.
- **6. Designation-driven selection consulted** ✅ (deployed) — the deployed `lookupAvatar` SELECTs `is_default_host`/`is_primary` and applies the ruled total order; leg-3 (read-only live-engine replay) independently confirmed **B(default_host) beats A(is_primary)** with no ties. **Live call-site signal (leg-1) pending — see §6.**
- **7. Single-candidate no-regression** ✅ (verified in logic) — for the two live single-candidate designated sets, the resolver still selects the same designated avatar (identity unchanged = Stage-1 parity), now emitting `default_host` instead of `fallback_limit1`. leg-2 hermetic tests cover this; live confirmation arrives with the same natural submit as leg-1.
- **8. Rollback preserved** ✅ — see §7.

## 6 · The one residual — Stage-2 leg-1 (by design, not a defect)

`m.post_render_log` carries **0** `default_host` rows post-deploy — no natural `video_short_avatar` submit for ndis-yarns/property-pulse has occurred since the deploy. The brief (§7.5) **forbids manufacturing a submit**; leg-1 must be a natural cron-driven render emitting the first-ever `default_host` (falsifier is sharp: 86/86 history is `fallback_limit1`, zero `default_host`). Until leg-1 is observed, **Stage 2 is INCOMPLETE, not waived**, and the standing non-claim holds verbatim: *"designation is consulted and outranks `is_primary`/storage order (proven by leg-2 hermetic + leg-3 live-engine + the deployed code), but live multi-candidate governed selection is NOT yet proven."* This residual is the brief's designed acceptance boundary, not a deploy defect. **Also unchanged:** the `fallback_taken` telemetry population flips (86/86 `fallback_limit1` → governed picks yield `fallback_taken=false`); a step-change at the first governed render.

## 7 · Rollback (preserved, code-only)

**v2.4.1 → v2.3.0:** revert commit `7d413f3` on main (or deploy from a pre-landing `64523be` checkout, which carries the v2.3.0 heygen source, blob `cc1fa2f6`) → `scripts/safe-deploy.sh heygen-worker --allow-warn` → deployed VERSION returns to `heygen-worker-v2.3.0`. **Zero data blast radius** — code-only; no schema/row/migration change; the designation columns/rows are independent (a rolled-back resolver reverts to the unordered `LIMIT 1`). Prior deployed version fully recoverable.

## 8 · Boundary (unchanged) — Step B does NOT close C-2

Step B makes a second active avatar **survivable** (designated host wins the deterministic order), **not prevented**. `assign_brand_avatar`'s unguarded `is_active=true` keeps C-2 OPEN — a separate lane (building under S4). Step B does not open Step C, does not onboard Invegent/CFW (both have zero `c.brand_avatar` rows), and does not govern the `:427` preset short-circuit.

## 9 · Non-claims

The only production change is: one FF commit to CE main (`7d413f3`, 2 heygen files) + the heygen-worker EF redeploy (v2.3.0→v2.4.1) + two slug-scoped drift-log refreshes (bookkeeping writes to `m.ef_drift_log`, the same the nightly cron makes). No schema/migration/other-worker/DB-content change; no secret handled in plaintext (vault-sourced). Stage-2 leg-1 unobserved; the non-claim stands. All facts live as of 2026-07-25.
