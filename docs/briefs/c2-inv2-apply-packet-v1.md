# C-2 INV-2 — Apply Packet v1 (designated-host coherence CHECK + `clear_brand_avatar` reconciliation)

**Tier:** T3 · **Lane class:** SAFETY_GATE · **Status:** `FROZEN — issued for the T3 review chain + PK apply gate. NOTHING APPLIED.`
**Author:** Claude Code — S4 (authoring only; does not approve or apply itself)
**Base:** `origin/main` == `HEAD` == `64523be4b98a43a3c1b55390f45948dccab9822b`, parity 0/0, branch `main`.
Stale-ref gate **PASS** (`git fetch --prune` + `git ls-remote` both `64523be`).
**Source brief (PK conditionally approved):** `docs/briefs/c2-active-avatar-guard-gate1-brief-v2.md` (`3e6fc6f4…`).
**Target:** Supabase project `mbkmaxqhsohbtwsqolns`. **Channel:** `execute_sql`, **single call, one DO block = one statement = one transaction** (channel **C-1**; atomicity is intrinsic to a single DO statement, not an assumption about batch composition — see §3).

> ⛔ **NOT part of the Step B deploy** (`a44dabd8…`, held, untouched). Separate artifact/gate/window.
> ⛔ **No `≤1 active` index** (PK-withdrawn v1). ⛔ **No unique constraint on `is_active`.** No `cc-` ID self-allocated.

---

## 1. What this applies, and why

**INV-2 — a designated default host must be selectable.** A single row-level CHECK forbids a row from
being `is_default_host` while not `is_active`, so the governed designation can never point at an avatar
the resolver (which filters `is_active`) cannot see. **It constrains only the *designated* row — it says
nothing about how many rows are active, so multiple active eligible avatars remain fully permitted**
(the capability PK's ruling protects; v1's `≤1 active` ceiling is not built).

**CHECK form — exactly as PK approved (null-safe both sides):**

```sql
CHECK (is_default_host IS NOT TRUE OR is_active IS TRUE)
```

`is_default_host` is `NOT NULL`; `is_active` is nullable, so the right side uses `IS TRUE` (a NULL
`is_active` on a designated host is itself the contradiction and is correctly rejected).

**Reconciliation (G-2B):** `clear_brand_avatar` currently sets `is_active=false` without clearing
`is_default_host`; under the CHECK, clearing a *host* would violate it. The reconciled function
**co-clears `is_default_host`** in the same UPDATE, so deactivating a host can never strand its
designation (this also closes S8 §7 rule-2). `assign_brand_avatar` and `complete_avatar_training` are
**unchanged** — they add actives, which is now allowed (v2 reversal from v1). After a host is cleared,
Step B's deterministic fallback (`is_primary` → `created_at` → `brand_avatar_id`) selects; re-designation
is a separate governed act (S8-owned switch RPC — not in this packet).

## 2. PK CONDITION — default-host uniqueness is ALREADY enforced (proven live, so NO extra index)

PK: *prove whether the DB already enforces "≤1 `is_default_host=TRUE` per (client_id, render_style)"; if
NOT, add a partial unique index; do NOT constrain `is_active`.*

**Proven live at `64523be` (read-only):**
```
uq_brand_avatar_default_host_per_client_style
  = CREATE UNIQUE INDEX … ON c.brand_avatar (client_id, render_style) WHERE is_default_host
```
This is **exactly** the required uniqueness (`is_default_host` is `NOT NULL`, so `WHERE is_default_host`
indexes precisely the TRUE rows; one entry per `(client_id, render_style)`). **The uniqueness is already
enforced ⇒ this packet adds NO partial unique index and NO `is_active` constraint.** The packet
additionally *asserts this index still exists at apply time* (S1 below) so the coherence model is never
applied against a DB where the ceiling was removed.

**Resulting model (all satisfied):** multiple active eligible avatars ✅ (unconstrained) · zero-or-one
designated default host ✅ (INV-1 uq index) · deterministic primary fallback ✅ (Step B order) · no
inactive designated host ✅ (INV-2, this packet).

## 3. Control / assertion register (for `apply-harness-auditor`; every declared control maps to executable SQL in §5)

**Channel & atomicity:** the entire apply is **one `DO` block** submitted as **one `execute_sql`
call**. A `DO` block is a single SQL statement; it commits or rolls back as a unit. There is **no
`BEGIN`/`COMMIT` spanning multiple calls**, so the cc-0079 Slice-2 pooled-composition failure mode does
not apply — atomicity is a property of the single statement, not of batch behaviour. Any `RAISE` (or any
DDL failure, incl. the CHECK rejecting an existing row) aborts and rolls back the whole block, including
both DDL statements.

| ID | Declared control | Kind | Executable enforcement in §5 | Fail-closed? |
|---|---|---|---|---|
| **S0** | `ck_default_host_must_be_active` must not already exist (deliberately non-idempotent; a re-run aborts loudly, not silently) | pre-apply STOP | `IF v_ck<>0 THEN RAISE EXCEPTION` | yes (RAISE) |
| **S1** | `uq_brand_avatar_default_host_per_client_style` must exist (PK-condition dependency) | pre-apply STOP | `IF v_uq<>1 THEN RAISE EXCEPTION` | yes (RAISE) |
| **S2** | **baseline:** 0 rows `is_default_host AND is_active IS NOT TRUE` (else the CHECK is being added over a violating state) | pre-apply STOP | `IF v_bad<>0 THEN RAISE EXCEPTION` | yes (RAISE) |
| **A-A** | add the coherence CHECK | apply | `EXECUTE 'ALTER TABLE … ADD CONSTRAINT ck_default_host_must_be_active CHECK …'` | n/a (DDL; self-validates rows) |
| **A-B** | reconcile `clear_brand_avatar` (co-clear `is_default_host`) | apply | `EXECUTE $fn$ CREATE OR REPLACE FUNCTION … $fn$` | n/a |
| **S3** | post-apply: the CHECK constraint is present | post-apply STOP | `IF NOT EXISTS(… pg_constraint …) THEN RAISE EXCEPTION` | yes (RAISE) |
| **S4** | post-apply: `clear_brand_avatar` body now clears `is_default_host` | post-apply STOP | `IF position('is_default_host' in pg_get_functiondef(...))=0 THEN RAISE EXCEPTION` | yes (RAISE) |

Executable order == declared order (S0→S1→S2→A-A→A-B→S3→S4). No prose-only aborts; no non-aborting
failure branch; no assertion without its baseline. Apply/rollback identity: §6 drops exactly the
constraint A-A adds and restores the byte-exact pre-apply body of `clear_brand_avatar` (A-B's target).

## 4. Scope

**In scope:** the one CHECK (INV-2) + the `clear_brand_avatar` co-clear reconciliation + their rollback +
proof.
**Deferred to separate contracts (NOT bundled, per PK):** role exclusivity (INV-5) · retired/disabled
lifecycle carriers · production-enabled state · the governed atomic default-host **switch RPC (S8-owned)**
· actor identity & operator UX. **Also excluded:** any `is_active` uniqueness (withdrawn v1); any change to
`assign_brand_avatar` / `complete_avatar_training`; anything touching Step B.

## 5. APPLY — one `execute_sql` call, one atomic `DO` block (byte-exact)

```sql
DO $c2apply$
DECLARE
  v_ck  int;
  v_uq  int;
  v_bad int;
BEGIN
  -- S0 — idempotency guard: the CHECK must not pre-exist (loud abort on re-run).
  SELECT count(*) INTO v_ck
    FROM pg_constraint
   WHERE conname = 'ck_default_host_must_be_active'
     AND conrelid = 'c.brand_avatar'::regclass;
  IF v_ck <> 0 THEN
    RAISE EXCEPTION 'C-2 STOP S0: ck_default_host_must_be_active already exists (found %); refusing to re-apply', v_ck;
  END IF;

  -- S1 — PK-condition dependency: the default-host uniqueness index must exist.
  SELECT count(*) INTO v_uq
    FROM pg_indexes
   WHERE schemaname = 'c' AND tablename = 'brand_avatar'
     AND indexname = 'uq_brand_avatar_default_host_per_client_style';
  IF v_uq <> 1 THEN
    RAISE EXCEPTION 'C-2 STOP S1: expected uq_brand_avatar_default_host_per_client_style to pre-exist, found %', v_uq;
  END IF;

  -- S2 — baseline: no designated-but-inactive host may exist before adding the CHECK.
  SELECT count(*) INTO v_bad
    FROM c.brand_avatar
   WHERE is_default_host AND is_active IS NOT TRUE;
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'C-2 STOP S2: % designated-but-inactive host row(s) exist; refuse to add CHECK', v_bad;
  END IF;

  -- A-A — the coherence CHECK (also self-validates all existing rows).
  EXECUTE 'ALTER TABLE c.brand_avatar
           ADD CONSTRAINT ck_default_host_must_be_active
           CHECK (is_default_host IS NOT TRUE OR is_active IS TRUE)';

  -- A-B — reconcile clear_brand_avatar: co-clear is_default_host so deactivating a host
  --       can never leave a designated-but-inactive row (satisfies ck_default_host_must_be_active
  --       and closes S8 §7 rule-2). Only this one line (is_default_host = false) is added vs the
  --       pre-apply body; signature / SECDEF / search_path / all other columns are byte-identical.
  EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.clear_brand_avatar(p_brand_avatar_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $clr$
BEGIN
  UPDATE c.brand_avatar SET
    heygen_avatar_id    = NULL,
    heygen_voice_id     = NULL,
    is_active           = false,
    is_default_host     = false,
    updated_at          = now()
  WHERE brand_avatar_id = p_brand_avatar_id;
END;
$clr$;
$fn$;

  -- S3 — post-apply: the CHECK constraint is present.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_default_host_must_be_active'
       AND conrelid = 'c.brand_avatar'::regclass
  ) THEN
    RAISE EXCEPTION 'C-2 STOP S3: ck_default_host_must_be_active not present post-apply';
  END IF;

  -- S4 — post-apply: the reconciled clear_brand_avatar now clears is_default_host.
  IF position('is_default_host' IN pg_get_functiondef('public.clear_brand_avatar(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'C-2 STOP S4: clear_brand_avatar was not reconciled (is_default_host absent from body)';
  END IF;

  RAISE NOTICE 'C-2 INV-2 APPLIED: ck_default_host_must_be_active added; clear_brand_avatar co-clears is_default_host; multi-active unconstrained';
END
$c2apply$;
```

## 6. ROLLBACK — authored + validated BEFORE apply (apply/rollback identity)

One `execute_sql` call. Drops exactly the constraint A-A added and restores the **byte-exact pre-apply
body** of `clear_brand_avatar` (captured live at `64523be` via `pg_get_functiondef` — the only
difference from §5's A-B is the removed `is_default_host = false` line).

```sql
DO $c2rollback$
BEGIN
  -- R-A — drop exactly the added constraint (no-op-safe if already absent).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_default_host_must_be_active'
       AND conrelid = 'c.brand_avatar'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE c.brand_avatar DROP CONSTRAINT ck_default_host_must_be_active';
  END IF;

  -- R-B — restore the verbatim pre-apply clear_brand_avatar (NO is_default_host line).
  EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.clear_brand_avatar(p_brand_avatar_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $clr$
BEGIN
  UPDATE c.brand_avatar SET
    heygen_avatar_id    = NULL,
    heygen_voice_id     = NULL,
    is_active           = false,
    updated_at          = now()
  WHERE brand_avatar_id = p_brand_avatar_id;
END;
$clr$;
$fn$;

  RAISE NOTICE 'C-2 INV-2 ROLLED BACK: constraint dropped; clear_brand_avatar restored to pre-apply body';
END
$c2rollback$;
```

## 7. Proof (positive — each must be able to fail; all rolled-back / read-only; NO production mutation)

Run **after** a PK-run apply, in explicitly rolled-back transactions (or on a Supabase dev branch),
never as a retained write:

1. **INV-2 REJECTS a designated-but-inactive host.** In a `BEGIN … ROLLBACK` txn:
   `UPDATE c.brand_avatar SET is_active=false WHERE brand_avatar_id='83ff167d-a844-4e1c-9d1a-d8ff257c11bc'`
   (a live default host) ⇒ **expect** `ck_default_host_must_be_active` violation. *A guard that cannot
   reject is not a guard.*
2. **INV-2 ACCEPTS multi-active (capability preserved — the anti-v1 proof).** In a rolled-back txn (or an
   S8 governed fixture on a non-production test client): make a **second** avatar `is_active=true` for a
   client that already has one active for that `render_style` (two distinct stakeholders — legal under
   `UNIQUE(stakeholder_id, render_style)`), exactly **one** designated ⇒ **accepted, no violation**. This
   positively proves the CHECK imposes **no `≤1 active` ceiling**.
3. **Reconciliation.** In a rolled-back txn: `SELECT public.clear_brand_avatar('83ff167d…')` ⇒ the row is
   `is_active=false` **and** `is_default_host=false` (designation co-cleared, no CHECK violation, no
   stranded host).
4. **Advisor-clean.** `get_advisors(security)` shows **no new finding** vs the pre-apply baseline; Step B's
   resolver path is unaffected.

## 8. Gates & stop condition

**Review chain before freeze (this session):** `apply-harness-auditor` (SHADOW MODE — PASS clears no
gate; CONCERNS/INCOMPLETE returns to the author). **Then the orchestrator runs:** `db-rls-auditor` +
exact-hash external review + independent apply-hand prep. **Rollback (§6) authored + validated before
apply. Pre-apply 0-violation assertion is S2 (in-txn).** **STOP at the PK T3 apply gate — this packet
applies nothing.**

**Non-negotiable STOPs (Convention-2):** any auditor/review non-clean verdict · hash drift from this
frozen packet · the S2 baseline failing at apply · an unexpected constraint/row state · a broken rollback
path. A tripped STOP voids the sequence; resumption needs a fresh PK gate.

---

## Notes / non-claims

- Applies exactly one CHECK + one function reconciliation. **Builds no index**, adds no `is_active`
  constraint, changes neither `assign_brand_avatar` nor `complete_avatar_training`, touches neither Step B
  nor the S8-owned switch RPC.
- Multi-character capability is **preserved and positively proven** (proof 2). C-2 closes the
  *designated-but-invisible* governance contradiction only; role exclusivity, lifecycle carriers,
  production-enabled state, and operator UX are **deferred to separate contracts**.
- **Provenance:** the CHECK form is PK's exact null-safe text; the uniqueness index, the 0-row baseline,
  and the verbatim `clear_brand_avatar` body were all read live at `64523be`; the rollback body is that
  captured body minus the single added line. Nothing inherited unverified.
