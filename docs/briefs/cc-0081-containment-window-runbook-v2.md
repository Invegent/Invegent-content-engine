CLAIMED v7.07 · cc-0081 containment window runbook **v2** (corrected assertions) · S8 · shared checkout · gate: HOLD for "S8 GO — resume window" · 2026-07-24

# cc-0081 — Containment window runbook **v2** · corrected verification assertions

**Status:** `ARMED · NOT EXECUTED · NO DML · NO DEPLOY · HOLDING FOR RESUME SIGNAL`
**Supersedes:** runbook v1 (`08b2c7cb65b4ef432579e05d3643db8d863cd6c2ecad4e63766f38b12b56ddb2`) and evidence addendum v1 (`80e4c1802dcb3c3c3a021541989181b264e5a943036c2d50011516a22dc54fad`). **⛔ The `80e4c180…` pin is SUPERSEDED — do not reuse it.**
**Target environment:** Supabase project **`mbkmaxqhsohbtwsqolns`** (ICE production).
**Reason for v2:** the v1 neutrality assertion expected **7** non-github rows; the true value is **14**. Caught at A2 preflight before any mutation (STOP record `df17f13405aa1f98fa0da3a6dad4cdc5b7f245f7aa466b537d506a5eda41aa58`). PK ruled the correction **clerical, conditional on a delta verification proving the executable statements are byte-identical** — §1 is that proof.

**This document is machine-assembled.** The gating and mutating SQL blocks below were extracted **programmatically from v1 and substituted verbatim** — they were not retyped. Byte-identity is guaranteed by construction and independently verified in §1.

---

## 1. Delta verification — **the executable statements are byte-identical; ONLY verification assertions changed**

Every fenced block in v1 and v2 was extracted and hashed mechanically (sha256 of the block body, first 16 hex shown).

| Block | Class | v1 | v2 | Verdict |
|---|---|---|---|---|
| A1 preflight (bash) | operational | `a1ad644bcda91d72` | `a1ad644bcda91d72` | ✅ **IDENTICAL** |
| **A2 pre-check SELECT** | **GATING** | `72fa3a749b8c2b2f` | `72fa3a749b8c2b2f` | ✅ **IDENTICAL** |
| **A3 apply `DO` block** | **MUTATING** | `432a5b9f446b3363` | `432a5b9f446b3363` | ✅ **IDENTICAL** |
| A4 readbacks | **VERIFICATION** | `9f4fb61815450e21` | *(new)* | 🔁 **CHANGED — the only change** |
| **A6 rollback `DO` block** | **MUTATING** | `a386dcd2122f91ce` | `a386dcd2122f91ce` | ✅ **IDENTICAL** |

> **Both MUTATING blocks and the GATING block hash-match v1 exactly. The sole delta is the A4 verification block.** That is what makes "clerical" a proven property rather than an assertion — the statements that touch production are provably untouched.

**What changed inside A4, exhaustively:** neutrality expectation `7` → **`14`** · added a whole-table count (expect **30 total / 3 suffixed**) · added a per-row fingerprint diff against the pre-mutation baseline (expect **exactly 3 changed / 27 identical**). Nothing was removed.

---

## 2. Preflight — **re-run fresh, all six. A preflight that passed earlier is not evidence now.**

1. **Authoritative remote** — `git fetch --prune`; `HEAD` == `origin/main` == `ls-remote`; parity 0/0.
2. **Artifact hashes against the NEW pin** — this file's frozen sha256 (§6). ⛔ `80e4c180…` is superseded and must not be cited.
3. **Three github targets present** — `mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32`, `mcp_gh_3acd65f6d56d1cd4067285b2dafeef70`, `mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9`.
4. **Unsuffixed pre-state** — all three `client_secret_post`, none suffixed; whole table 0 suffixed.
5. **Bridge drift + rollback target** — `mcp-chatgpt-bridge` must still be **A-LE/clean** with deployed == repo blob `df0f1ec3…`. **If drift has moved, STOP — the rollback target is no longer known.**
6. **Environment stated** — `mbkmaxqhsohbtwsqolns`.

```bash
git fetch --prune && git rev-parse HEAD origin/main && git rev-list --left-right --count origin/main...HEAD
python scripts/db-read.py "SELECT slug,current_class,deployed_hash_normalised,repo_hash_normalised FROM ice_ro.deploy_drift_status WHERE slug LIKE 'mcp-%'"
```

**STOP on any:** parity ≠ 0/0 · any hash mismatch · not exactly 3 targets · any target not `client_secret_post` (**lever inert for that row**) · any row already suffixed · chatgpt drift moved or hashes diverged · github deployed hash ≠ `2b9b7c1d…`.

## 3. A2 · Pre-check — ABORT unless exactly 3 rows, all `client_secret_post`, all with a secret, none already suffixed

```sql
SELECT client_id, token_endpoint_auth_method, last_used_at,
       (client_secret IS NOT NULL)              AS has_secret,
       (client_secret LIKE '%.cc0081-disabled') AS already_disabled
FROM m.mcp_oauth_client
WHERE client_id IN ('mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32',
                    'mcp_gh_3acd65f6d56d1cd4067285b2dafeef70',
                    'mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9');
```

## 4. A3 · Apply — one atomic statement, fail-closed on row count

```sql
DO $$
DECLARE n int;
BEGIN
  UPDATE m.mcp_oauth_client
     SET client_secret = client_secret || '.cc0081-disabled'
   WHERE client_id IN ('mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32',
                       'mcp_gh_3acd65f6d56d1cd4067285b2dafeef70',
                       'mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9')
     AND token_endpoint_auth_method <> 'none'
     AND client_secret IS NOT NULL
     AND client_secret NOT LIKE '%.cc0081-disabled';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN
    RAISE EXCEPTION 'cc-0081 lever aborted: expected 3 rows, updated %', n;
  END IF;
END $$;
```

**`ROW_COUNT <> 3` → `RAISE` → full rollback. Partial application is impossible.** Any error: do not retry without re-running A2.

## 5. A4 · Readbacks — **CORRECTED**

```sql
-- A4.1 TARGETS — expect exactly 3 rows, all disabled = true
SELECT client_id, (client_secret LIKE '%.cc0081-disabled') AS disabled
FROM m.mcp_oauth_client
WHERE client_id IN ('mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32',
                    'mcp_gh_3acd65f6d56d1cd4067285b2dafeef70',
                    'mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9');

-- A4.2 NEUTRALITY (CORRECTED 7 -> 14) — every non-github client untouched
SELECT count(*) AS chatgpt_clients_untouched
FROM m.mcp_oauth_client
WHERE client_id NOT LIKE 'mcp_gh_%'
  AND client_secret NOT LIKE '%.cc0081-disabled';          -- expect 14

-- A4.3 WHOLE-TABLE — expect 30 total / 3 suffixed
SELECT count(*)                                                    AS total_clients,
       count(*) FILTER (WHERE client_id LIKE 'mcp_gh_%')           AS github_rows,
       count(*) FILTER (WHERE client_id NOT LIKE 'mcp_gh_%')       AS chatgpt_rows,
       count(*) FILTER (WHERE client_secret LIKE '%.cc0081-disabled') AS suffixed_rows
FROM m.mcp_oauth_client;                                   -- expect 30 / 16 / 14 / 3

-- A4.4 PER-ROW FINGERPRINT DIFF vs the pre-mutation baseline (§7)
--      expect EXACTLY 3 changed and 27 identical, across all 30 rows
SELECT client_id,
       CASE WHEN client_id LIKE 'mcp_gh_%' THEN 'github' ELSE 'chatgpt' END AS bridge,
       left(md5(client_secret),8) AS secret_fp_post
FROM m.mcp_oauth_client
ORDER BY bridge, client_id;
```

**STOP → run A6 immediately if:** A4.1 ≠ 3 all-true · A4.2 ≠ **14** · A4.3 ≠ 30/16/14/**3** · A4.4 shows any change outside the three targets.

## 6. A5 · Post-lever proof — the review gate must still work

One live `ask_chatgpt_review` call. The lever touches only `mcp_gh_*` rows, so this **must** still succeed. **If it fails, the exclusion list was wrong → A6 rollback immediately.**

## 7. A6 · Rollback — deterministic, exact-length strip

```sql
DO $$
DECLARE n int;
BEGIN
  UPDATE m.mcp_oauth_client
     SET client_secret = left(client_secret, length(client_secret) - length('.cc0081-disabled'))
   WHERE client_id IN ('mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32',
                       'mcp_gh_3acd65f6d56d1cd4067285b2dafeef70',
                       'mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9')
     AND client_secret LIKE '%.cc0081-disabled';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'cc-0081 rollback: expected 3, got %', n; END IF;
END $$;
```

Restores the **original bytes** — a true undo, not a re-mint. Validated before apply.

## 8. Pre-mutation baseline — 30-row fingerprint (captured, for the A4.4 diff)

`left(md5(client_secret),8)` per client — enough to detect any change, useless for recovering a secret. **No `client_secret` value was read or recorded.**

**Targets (must change):** `mcp_gh_6e4ec94e…` = `767d17db` · `mcp_gh_3acd65f6…` = `aa350f91` · `mcp_gh_a7565c37…` = `425705f1`

**Non-targets (must be identical) — 13 github:** `0b57305c`=`4df3dac3` · `5153a863`=`c8bd4b9e` · `6708979a`=`af1f730e` · `6d8c032b`=`74f3f492` · `6f886844`=`6001b62e` · `78207138`=`7b13aec3` · `7f04c6b4`=`98e86663` · `7f853467`=`645a3c9c` · `acdd7db9`=`d87dd5aa` · `da3069c5`=`524d9aa5` · `e6c911a5`=`170e8647` · `ea98450c`=`7e1ad7bf` · `ecd978d3`=`6000655d`

**Non-targets (must be identical) — 14 chatgpt:** `0973af50`=`9cfee3d0` · `164be3bf`=`b51584db` · `22a601f4`=`f981290c` · `2cbc3980`=`bdab9833` · `3223edb8`=`512787be` · `3237c6a2`=`ca6696dd` · `37bdbacd`=`6ed4214d` · `69ff8298`=`32c448c9` · `7a93d2e2`=`20cf86a3` · `8efaec6d`=`49f934bb` · **`a73a5315`=`db261915` (the live `ask_chatgpt_review` connector)** · `bfae9f37`=`9f2fbe9e` · `c81c5496`=`a31db0cb` · `d523f33d`=`dba053c5`

## 9. ⛔ Wording constraint — unchanged, and not yet earned

*"outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains."*

**Not revocation.** Does not kill an already-issued access token (moot — floors 2026-06-03 / 06-13 / 06-17 passed) · does not stop a new consent flow · **does not close L3** · **L2 remains open even after the full three-part patch lands.** Nothing has been blocked yet, because nothing has been applied.

**Carried:** the shared table means the lever will also block those three client_ids at the **ChatGPT bridge's** `/token` — intended and harmless (they are github-bridge clients), same shared-table defect class as L3.

**`mcp_gh_6e4ec94e…` remains the justification for the window:** issued 2026-05-04 against the **v2.0.0 read-only** bridge, it silently acquired GitHub **write** authority when v3.0.0 deployed on 2026-05-14, with nobody re-consenting.

## 10. Non-claims

**Nothing in this runbook has been executed.** No DML, no deploy, no redeploy, no commit, no staging, no rollback. Live state at assembly: **30 clients / 16 github / 14 chatgpt / 0 suffixed.** No secret was read; only truncated md5 fingerprints recorded. The §1 delta verification is a mechanical hash comparison of extracted blocks, not an assertion. Baseline fingerprints must be re-confirmed at preflight — this document's §8 is evidence from the prior window, not live proof.
