# C-2 INV-2 — Apply Result: APPLIED & PROVEN (v1)

> **Lane:** C-2 INV-2 (designated-host coherence CHECK + `clear_brand_avatar` reconciliation) · **Apply hand:** S1 (independent; S4 authored) · **Type:** T3 apply result · **Verdict: PASS**
> **Outcome:** **APPLIED to production and PROVEN.** The `ck_default_host_must_be_active` CHECK is live; `clear_brand_avatar` co-clears `is_default_host`; multi-active is unconstrained; no `is_active` uniqueness; Step B worker healthy; the §6 rollback is proven executable.
> **Applied artifact:** `docs/briefs/c2-inv2-apply-packet-v1.md`, sha256 **`c58028cb…`**, from immutable ref **`330da9b`** — §5 `DO $c2apply$` block extracted byte-exact and submitted as ONE `execute_sql` call (no `apply_migration`, so no ledger version; identity = packet hash @ ref).
> **Target:** project `mbkmaxqhsohbtwsqolns`. **Applied:** 2026-07-25.

---

## 1 · Pre-apply verification (all STOP-checks passed)

| Check | Result |
|---|---|
| `330da9b` ancestor of current origin/main (`6ca551bc`) | ✅ yes |
| Packet bytes from `330da9b` | ✅ `c58028cb…` / 14181 B (reproduced independently) |
| Origin movement `330da9b→6ca551bc` scope | ✅ ONE commit `6ca551b` (claim-stub helper) — only `.claude/helpers/claim-stub.*` + fixtures; no C-2 / production / Step B / migration file |
| §5 re-extract from ref == staged copy | ✅ byte-identical (`2221ebeb…`) |
| S0 / S1 / S2 live | ✅ **0 / 1 / 0** |
| live `clear_brand_avatar` body | ✅ md5 `88971ae0…` == §6 R-B target |

## 2 · The apply (committed)

Submitted the §5 `DO $c2apply$` block byte-exact from `330da9b` as one `execute_sql` call. Returned no error → all in-block assertions passed (S0→S1→S2 pre-STOPs · A-A CHECK · A-B `clear_brand_avatar` · S3→S4 post-STOPs) and both DDL statements committed atomically (single DO statement = one transaction; the cc-0079 Slice-2 pooled-composition mode cannot apply).

## 3 · Post-apply verification (dispatch steps 3–6)

| # | Check | Result |
|---|---|---|
| 3 | CHECK present + definition | ✅ `CHECK (((is_default_host IS NOT TRUE) OR (is_active IS TRUE)))` — exact PK form |
| 3 | designation uniqueness index | ✅ `uq_brand_avatar_default_host_per_client_style` present (unchanged) |
| 3 | `clear_brand_avatar` reconciled | ✅ body now co-clears `is_default_host` (`body_coclears=true`; md5 `88971ae0→b5e818f7`) |
| 4 | multiple active avatars remain allowed | ✅ **proof-2** (rolled-back txn): activated a 3rd avatar → no violation; the CHECK imposes no `≤1 active` ceiling. 2 actives in steady state |
| 5 | no uniqueness constraint on `is_active` | ✅ **0** unique constraints AND **0** unique indexes reference `is_active` |
| 6 | Step B worker v2.4.1 healthy | ✅ `heygen-worker` version 44, `VERSION='heygen-worker-v2.4.1'`, `verify_jwt=false`, `ezbr_sha256 3ce996b6…` — unchanged (C-2 is a DB constraint; no worker touch) |

**Behavioral proofs (§7, all in rolled-back transactions — NO production mutation):**
- **Proof-1 PASS** — `UPDATE … is_active=false` on the live default host `83ff167d` was rejected with `check_violation`. *A guard that cannot reject is not a guard.*
- **Proof-2 PASS** — activating a 3rd avatar succeeded (no ceiling; anti-v1 capability preserved).
- **Proof-3 PASS** — `clear_brand_avatar('83ff167d')` set the row `is_active=false AND is_default_host=false` (co-cleared, no violation, no stranded host).

## 4 · Rollback proof (dispatch step 7)

Ran the §6 `DO $c2rollback$` block byte-exact inside a `BEGIN … ROLLBACK` transaction. **Inside the txn** the constraint was dropped (`ck=0`) and `clear_brand_avatar` restored to the pre-apply body (`md5=88971ae0…`) — proving R-A + R-B execute cleanly and restore the exact pre-apply state — then **ROLLBACK discarded it, so C-2 remains applied**. The rollback is validated and available: R-A drops exactly the added constraint; R-B restores the byte-exact pre-apply body. Fully reversible, no data destroyed.

## 5 · Final production state (confirmed after all rolled-back proofs)

`ck_default_host_must_be_active` present with the PK form; `clear_brand_avatar` md5 `b5e818f7` (reconciled); 28 avatar rows; **2 active, 2 default-host**; proof target `83ff167d` still `is_active=true / is_default_host=true` (proofs left it untouched). The resulting coherence model — multiple active eligible avatars ✅ · zero-or-one designated default host ✅ (INV-1 uq index) · deterministic primary fallback ✅ (Step B) · no inactive designated host ✅ (INV-2, this apply).

## 6 · Boundary (unchanged)

C-2 closes only the *designated-but-invisible* contradiction. It built **no** `≤1 active` index (PK-withdrawn v1), added **no** `is_active` constraint, changed neither `assign_brand_avatar` nor `complete_avatar_training`, and touched neither Step B (`a44dabd8…`, deployed v2.4.1) nor the S8-owned atomic switch RPC. Role exclusivity (INV-5), lifecycle carriers, production-enabled state, and operator UX remain deferred to separate contracts.

## 7 · Non-claims

The only production change is the C-2 DDL: one CHECK constraint added + one `CREATE OR REPLACE FUNCTION public.clear_brand_avatar` (co-clear), via a single atomic `execute_sql` DO block. No `apply_migration` (no ledger version), no migration file, no other schema/row/worker change, no git commit/push/deploy by this lane. Every behavioral and rollback proof ran in explicitly rolled-back transactions — zero production data mutated. All facts live as of 2026-07-25.
