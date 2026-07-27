# cc-0046 Slice 0.5 — Inert Role-Source Package (v1 DRAFT)

**Created:** 2026-07-27 Sydney
**Author:** orchestrator (Claude Code)
**Status:** ✅ **APPLIED 2026-07-27** (inert substrate + first-admin seed live; enforcement OFF) — see §8
**Lane class / tier:** SAFETY_GATE · **T3** (creates DDL + grants + RLS; authorization substrate)
**Governs / implements:** the PK-ratified architecture of `cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` (brief PK-APPROVED v6.10) under the six `[A]` rulings of `cc-0046-slice-0-5-a-class-ruling-packet-v1.md`, ratified by PK 2026-07-27.

> ## ⚠ WHAT THIS PACKAGE IS
>
> The **inert role source of truth** — a CE-side migration that creates the `authz` schema, the role
> table, the append-only audit table, the read/write functions, and their grants/RLS — plus the
> **governed first-administrator seed** and the **enforcement sequence**. It is *inert*: **no dashboard
> code reads `public.current_user_roles()` yet, so nothing is enforced by applying it.** Enabling
> enforcement is a **separate, later, PK-gated step** and is explicitly **out of scope here**.
>
> **PK hard gate (2026-07-27):** no enforcement becomes active until **role read-back · administrator
> seeding · `auth.users` deletion behaviour · fail-closed access** are all proven. **Dashboard Phase 1
> stays CLOSED.** Applying even this inert migration is a **T3 PK apply gate** — this document stops at
> the gate; it does not apply.

---

## 0. Ratified decisions this package implements

| Ruling | Decision | Where realized below |
|---|---|---|
| A-Q0 | **A2** — governed CE authorization table | §1 `authz.user_role` |
| E-Q10 | New **`authz`** schema (not `public`/`c`/`audit`) | §1.1 |
| E-Q13 | **`postgres`** owner; `ENABLE`+`FORCE` RLS, zero policies; FORCE documented inert vs postgres/service_role | §1.2, §1.3 |
| E-Q9 (read) | **Shape A** — zero-arg SECDEF keyed on `auth.uid()`, granted `authenticated`, in `public` | §2.1 |
| E-Q14 (write) | **Shape B** — `service_role`-only fn taking the server-verified actor uid, re-validates `administrator` inside, fails closed | §2.2 |
| B-Q0 | **3 roles** — `viewer` / `governance_operator` / `administrator` | §1.1 role CHECK |
| B-Q1 | Nullable `client_id` scope column **pinned NULL by CHECK** (drop CHECK = v2 enable) | §1.1 |
| A-Q1 | Environment column **DEFERRED** (accepted limitation: preview carries prod authz) | not created |
| E-Q6 (recommended [B]) | audit actor FK **`ON DELETE SET NULL` + immutable snapshot columns** | §1.4 |
| A2-INV-2 (restated) | read on cookie-bound client; write on service client with server-verified uid | §2, §4 |

---

## 1. The migration (DRAFT — pending live `db-rls-auditor` verification)

> Migration name (permanent identity — a revision gets a NEW number, never this name with different SQL):
> `authz_role_source_inert_v1`. Single transaction. All object creation + all REVOKE/GRANT + RLS + the
> fail-closed ACL assertion land together (A2-INV-6: `CREATE` and `REVOKE` in the same migration).

### 1.1 Schema + role table

```sql
CREATE SCHEMA IF NOT EXISTS authz;
-- A2-INV-4/6: no anon/authenticated reach into authz; service_role needs USAGE for §2.2/§1.4 SECDEF fns.
REVOKE ALL   ON SCHEMA authz FROM PUBLIC;
REVOKE USAGE ON SCHEMA authz FROM anon, authenticated;   -- explicit even though a fresh schema grants none
GRANT  USAGE ON SCHEMA authz TO service_role;

CREATE TABLE authz.user_role (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('viewer','governance_operator','administrator')),
  client_id   uuid        NULL,
  granted_by  uuid        NULL,                       -- server-verified actor uid (NULL only for bootstrap)
  granted_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role),
  -- B-Q1: scope column modelled but NOT enforced in v1. Dropping this CHECK is the v2 per-client enable step.
  CONSTRAINT user_role_client_id_pinned_null CHECK (client_id IS NULL)
);
```

*Role-table FK is `ON DELETE CASCADE` (matches all 18 existing auth→auth FKs): deleting an auth user
removes their grant, which is correct. The accountability substrate is the audit table (§1.4), where
deletion must NOT erase history — hence its different `ON DELETE` (E-Q6).*

### 1.2 RLS posture (deny-by-default, house pattern)

```sql
ALTER TABLE authz.user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE authz.user_role FORCE  ROW LEVEL SECURITY;
-- ZERO policies = deny-by-default (established ICE house pattern).
COMMENT ON TABLE authz.user_role IS
  'authz role source. RLS ENABLE+FORCE with zero policies = deny-by-default. NOTE (E-Q13): FORCE is INERT against postgres/service_role (both rolbypassrls=TRUE); it is defence-in-depth only. The real boundary vs anon/authenticated is schema USAGE-fencing + explicit REVOKE (A2-INV-4/6). Reads go through public.current_user_roles() (SECDEF); writes through authz.grant_role/revoke_role (SECDEF, service_role-only).';
```

### 1.3 Grants on the role table

```sql
-- A2-INV-4/6/8: no direct DML for anyone but the RLS-bypass roles; no reach for anon/authenticated.
REVOKE ALL ON authz.user_role FROM PUBLIC, anon, authenticated;
-- service_role gets NO direct DML on the table (A2-INV-8): all writes go through the SECDEF fns in §2.2.
```

### 1.4 Append-only audit table (E-5, A2-INV-5, E-Q6)

```sql
CREATE TABLE authz.role_audit (
  id                   bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at                   timestamptz NOT NULL DEFAULT now(),
  -- E-Q6: SET NULL keeps history when the auth user is deleted; deletion is never blocked.
  actor_user_id        uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_uid_snapshot   uuid        NOT NULL,   -- immutable at insert; survives account deletion
  actor_email_snapshot text        NOT NULL,   -- immutable at insert; PII-retention accepted (E-Q6)
  action               text        NOT NULL CHECK (action IN ('grant','revoke','bootstrap')),
  target_user_id       uuid        NOT NULL,
  role                 text        NOT NULL,
  is_self_mod          boolean     NOT NULL DEFAULT false,  -- E.8: self-modification is distinguishable
  outcome              text        NOT NULL,
  detail               jsonb       NULL
);
ALTER TABLE authz.role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE authz.role_audit FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON authz.role_audit FROM PUBLIC, anon, authenticated;
-- A2-INV-5 append-only w.r.t. the application principal: service_role gets NO direct DML; inserts via §2.2 only.
-- The E-Q6 ON DELETE SET NULL referential action is the INTENDED non-application exception — do not "fix" it.
```

## 1.5 Fail-closed ACL assertion (in-transaction; aborts the migration if the posture is wrong)

```sql
DO $assert$
DECLARE bad int;
BEGIN
  -- No anon/authenticated USAGE on schema authz.
  IF has_schema_privilege('anon','authz','USAGE') OR has_schema_privilege('authenticated','authz','USAGE') THEN
    RAISE EXCEPTION 'authz assert: anon/authenticated must not hold USAGE on schema authz';
  END IF;
  -- No table privileges for anon/authenticated on either table.
  SELECT count(*) INTO bad FROM (
    SELECT 1 WHERE has_table_privilege('anon','authz.user_role','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('authenticated','authz.user_role','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('anon','authz.role_audit','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('authenticated','authz.role_audit','SELECT,INSERT,UPDATE,DELETE')
  ) t;
  IF bad > 0 THEN RAISE EXCEPTION 'authz assert: anon/authenticated hold table privileges they must not'; END IF;
  -- RLS enabled+forced on both.
  IF (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
      WHERE oid IN ('authz.user_role'::regclass,'authz.role_audit'::regclass)) IS NOT TRUE THEN
    RAISE EXCEPTION 'authz assert: RLS must be ENABLE+FORCE on both tables';
  END IF;
  -- FUNCTION ACLs (db-rls-auditor should_fix #2): the read fn must be authenticated-only; the write fns off-limits.
  IF NOT has_function_privilege('authenticated','public.current_user_roles()','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: authenticated must hold EXECUTE on public.current_user_roles()';
  END IF;
  IF has_function_privilege('anon','public.current_user_roles()','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: anon must NOT hold EXECUTE on public.current_user_roles()';
  END IF;
  IF has_function_privilege('anon','authz.grant_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','authz.grant_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('anon','authz.revoke_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','authz.revoke_role(uuid,text,uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: anon/authenticated must NOT hold EXECUTE on authz write functions';
  END IF;
END $assert$;
```

---

## 2. Read / write functions

### 2.1 Read — Shape A (zero-arg, `public`, granted `authenticated`)

```sql
CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS TABLE (role text, client_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''                                   -- F.3: all names fully-qualified; auth not on path
AS $$
  SELECT ur.role, ur.client_id
  FROM authz.user_role ur
  WHERE ur.user_id = auth.uid()                         -- auth.uid() schema-qualified: resolves regardless of path
$$;
-- A2-INV-6: revoke all, then grant only authenticated. (Fresh public fn is born anon=X,authenticated=X.)
REVOKE ALL ON FUNCTION public.current_user_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_roles() TO authenticated;
```

- **Zero-arg (A2-INV-1):** a caller can learn only their *own* role — no cross-user disclosure, no
  impersonation primitive, even though it is `authenticated`-reachable over PostgREST (C-6). This is the
  first `authenticated`-reachable governance object in the system; that exposure is the accepted minimum.
- **A2-INV-2:** the dashboard MUST call this on the **cookie-bound user client** (`lib/supabase/server.ts`),
  never the service client — under the service-role JWT `auth.uid()` is NULL → returns zero rows → deny.
  That is the intended self-DoS guard, not a bug. (Enforcement wiring is out of scope; recorded so the
  enforcement lane does not miswire it.)

### 2.2 Write — Shape B (`authz`, `service_role`-only, re-validates administrator inside)

```sql
CREATE OR REPLACE FUNCTION authz.grant_role(
  p_actor_user_id  uuid,     -- the SERVER-VERIFIED actor uid (dashboard resolved via getUser()); never client input
  p_actor_email    text,     -- server-verified actor email, for the immutable audit snapshot
  p_target_user_id uuid,
  p_role           text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_is_admin boolean; v_rows int;
BEGIN
  IF p_role NOT IN ('viewer','governance_operator','administrator') THEN
    RAISE EXCEPTION 'authz.grant_role: invalid role %', p_role USING ERRCODE = '22023';
  END IF;
  -- E-Q14: re-validate the actor is an administrator INSIDE the function → a forged/wrong actor id fails CLOSED.
  -- NOTE (security-auditor): this authenticates the actor's ROLE, not the caller's IDENTITY. Its value is
  -- confined to fail-closing an app-layer bug; "p_actor_user_id derives ONLY from getUser()" is load-bearing
  -- and owned by the enforcement lane (restated A2-INV-2 corollary), never from request input.
  SELECT EXISTS (SELECT 1 FROM authz.user_role WHERE user_id = p_actor_user_id AND role = 'administrator')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'authz.grant_role: actor % is not an administrator', p_actor_user_id USING ERRCODE = '42501';
  END IF;
  INSERT INTO authz.user_role (user_id, role, granted_by)
    VALUES (p_target_user_id, p_role, p_actor_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;   -- audit fidelity: distinguish a real grant from a no-op
  INSERT INTO authz.role_audit
    (actor_user_id, actor_uid_snapshot, actor_email_snapshot, action, target_user_id, role, is_self_mod, outcome)
    VALUES (p_actor_user_id, p_actor_user_id, p_actor_email, 'grant', p_target_user_id, p_role,
            p_actor_user_id = p_target_user_id, CASE WHEN v_rows > 0 THEN 'applied' ELSE 'noop' END);
END $$;

CREATE OR REPLACE FUNCTION authz.revoke_role(
  p_actor_user_id  uuid,
  p_actor_email    text,
  p_target_user_id uuid,
  p_role           text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_is_admin boolean; v_admin_count int; v_rows int;
BEGIN
  SELECT EXISTS (SELECT 1 FROM authz.user_role WHERE user_id = p_actor_user_id AND role = 'administrator')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'authz.revoke_role: actor % is not an administrator', p_actor_user_id USING ERRCODE = '42501';
  END IF;
  -- E.8 last-administrator protection (enforced in the DB, not the UI).
  IF p_role = 'administrator' THEN
    -- Lock all administrator rows FIRST so two concurrent revokes of different admins serialize
    -- (check-then-act is otherwise racy under READ COMMITTED — security-auditor should_fix #2).
    PERFORM 1 FROM authz.user_role WHERE role = 'administrator' FOR UPDATE;
    SELECT count(*) INTO v_admin_count FROM authz.user_role WHERE role = 'administrator';
    IF v_admin_count <= 1 AND EXISTS (SELECT 1 FROM authz.user_role
        WHERE user_id = p_target_user_id AND role = 'administrator') THEN
      RAISE EXCEPTION 'authz.revoke_role: cannot remove the last administrator' USING ERRCODE = '23514';
    END IF;
  END IF;
  DELETE FROM authz.user_role WHERE user_id = p_target_user_id AND role = p_role;
  GET DIAGNOSTICS v_rows = ROW_COUNT;   -- audit fidelity: distinguish a real revoke from a no-op
  INSERT INTO authz.role_audit
    (actor_user_id, actor_uid_snapshot, actor_email_snapshot, action, target_user_id, role, is_self_mod, outcome)
    VALUES (p_actor_user_id, p_actor_user_id, p_actor_email, 'revoke', p_target_user_id, p_role,
            p_actor_user_id = p_target_user_id, CASE WHEN v_rows > 0 THEN 'applied' ELSE 'noop' END);
END $$;

REVOKE ALL ON FUNCTION authz.grant_role(uuid,text,uuid,text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION authz.revoke_role(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION authz.grant_role(uuid,text,uuid,text)  TO service_role;
GRANT EXECUTE ON FUNCTION authz.revoke_role(uuid,text,uuid,text) TO service_role;
```

> **A2-INV-2 restated for the split identity paths (PK accepted with E-Q9/E-Q14):** the role **read** is
> issued on the cookie-bound user client, never the service client; the role **mutation** is issued on the
> service client with a uid the server has verified via `getUser()`, **never** a uid taken from request
> input (E.5 trust-boundary corollary). The `authz` schema functions above take the actor as a parameter
> *because the server verifies it first* — the re-validation inside makes a wrong value fail closed rather
> than escalate.

---

## 3. Governed first-administrator seed (E.7 step 2 — bootstrap; PK-gated, run once)

The bootstrap paradox: `grant_role` requires an existing `administrator`, and there is none. The first
administrator is therefore seeded by **governed SQL run directly as `postgres`/`service_role` under a PK
gate** — this is the one role write that does NOT go through `grant_role`.

```sql
-- BOOTSTRAP — run once, under PK apply gate, AFTER the migration and read-back verification.
-- Seeds PK as the first administrator. Fully idempotent: the audit row is written ONLY when the
-- role row was actually inserted (RETURNING is empty on ON CONFLICT), so a re-run writes nothing.

-- TOCTOU guard (security-auditor should_fix #3): re-confirm EXACTLY ONE pk@invegent.com row AT SEED TIME,
-- not only at db-rls-auditor time — else a duplicate auth row minted in the window would seed two admins.
DO $seedguard$
BEGIN
  IF (SELECT count(*) FROM auth.users WHERE email = 'pk@invegent.com') <> 1 THEN
    RAISE EXCEPTION 'authz seed: expected exactly one pk@invegent.com auth row';
  END IF;
END $seedguard$;

WITH pk AS (
  SELECT id, email FROM auth.users WHERE email = 'pk@invegent.com'
),
ins AS (
  INSERT INTO authz.user_role (user_id, role, granted_by)
  SELECT pk.id, 'administrator', NULL FROM pk
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING user_id
)
INSERT INTO authz.role_audit
  (actor_user_id, actor_uid_snapshot, actor_email_snapshot, action, target_user_id, role, is_self_mod, outcome)
SELECT pk.id, pk.id, pk.email, 'bootstrap', pk.id, 'administrator', true, 'seeded'
FROM ins JOIN pk ON pk.id = ins.user_id;   -- fires only on a genuine first insert
```

*(db-rls-auditor should_fix #1 applied: the earlier draft wrote an unconditional `bootstrap` audit row on
every run — a false `seeded` record on re-run. Now audit-idempotent.)*

*Exact `auth.users.id` for `pk@invegent.com` is resolved by the seed's own `WHERE email=` lookup — no id is
hardcoded. `db-rls-auditor` confirms the row exists at apply time.*

---

## 4. Enforcement sequence (E.7 — the ordered gate map; enforcement itself is OUT OF SCOPE here)

1. **Apply the migration inert** (§1–§2). Nothing reads `current_user_roles()` yet → zero behaviour change.
   *T3 PK apply gate.*
2. **Seed the first administrator** (§3) by governed SQL under a PK gate.
3. **Verify read-back:** `SELECT * FROM public.current_user_roles()` returns `administrator` for PK's session
   through the enforcement path, still inert.
4. **Prove the `auth.users` delete path** against the actor FK (E-Q6 / E.5.1): on a scratch/non-production
   auth row, prove `ON DELETE SET NULL` **fires and mutates the audit row** (deletion is NOT blocked; history
   survives). Under `postgres` ownership the referential action bypasses RLS by role attribute (E-Q13 = NO), so
   this should succeed — prove it, do not assume.
5. **Prove fail-closed access:** an unassigned session gets zero rows from `current_user_roles()`; a wrong-role
   session is denied a governance write; a correct-role session is permitted (positive control).
6. **Only then** — a SEPARATE PK-gated lane — wire the dashboard guards and enable enforcement behind the
   kill switch (E-6 → Vercel instant-rollback to a pinned pre-enforcement deployment id, recorded first).

**Steps 4 + 5 are the PK hard gate.** No enforcement is enabled until all pass.

---

## 5. Byte-pinned rollback

Inert and reversible — no dependent object exists until enforcement wiring (step 6, separate lane):

```sql
-- rollback authz_role_source_inert_v1
DROP FUNCTION IF EXISTS authz.revoke_role(uuid,text,uuid,text);
DROP FUNCTION IF EXISTS authz.grant_role(uuid,text,uuid,text);
DROP FUNCTION IF EXISTS public.current_user_roles();
DROP TABLE    IF EXISTS authz.role_audit;
DROP TABLE    IF EXISTS authz.user_role;
DROP SCHEMA   IF EXISTS authz;             -- safe while empty of other objects
```

Rollback is clean because the package is inert: no worker, RPC, trigger, view, or dashboard path reads any
of these objects until the enforcement lane wires them.

---

## 6. Open [B] items the enforcement lane still owns (recorded, NOT resolved here)

- **E-Q1 kill switch** — Vercel instant-rollback to a pinned pre-enforcement deployment id (recorded before enable).
- **E-Q6 delete-path proof** — step 4 above; PII-retention (email snapshot of a deleted user) accepted at ratification.
- **D-Q4** — Slice 0.5 does NOT unblock Slice 1 (no governed write RPC for 3 of 4 ops). Separate CE lane.
- **Enforcement guards** — `requireRole()` choke-point + build-time completeness gate (C.4) + per-action wiring; the F.4 mutation-blind test standard applies. All in the separate enforcement lane.
- **`actor_email_snapshot` is NOT NULL but `auth.users.email` is nullable** (db-rls-auditor open question) — the enforcement lane MUST always pass a server-verified, non-null actor email to `grant_role`/`revoke_role`; a NULL fails the write closed (acceptable, but must be handled). The §3 seed is safe (PK's email is populated; confirmed live count=1).
- **Sole-administrator lockout via `auth.users` CASCADE** (security-auditor) — deleting the *only* administrator's `auth.users` row CASCADE-removes their `authz.user_role` row **without firing `revoke_role`'s last-admin guard** (a referential action cannot run the SECDEF guard). Result = zero administrators → `grant_role` can no longer be called (it needs an existing admin). This is a **recoverable availability** risk, not an escalation: recovery = re-run the §3 governed bootstrap as `postgres` under a PK gate. **Accepted + recoverable; operational control: maintain ≥2 administrators once enforcement is live.** §4 step-4/5 must additionally prove this CASCADE→lockout→re-bootstrap path on a scratch row.
- **B-Q1 v2 enable is more than dropping the CHECK** (security-auditor) — the PK is `(user_id, role)` with `client_id` NOT in it, so dropping `user_role_client_id_pinned_null` alone would collide when the same role is scoped to two `client_id`s. **v2 must also add `client_id` to the primary key.** Recorded so the v2 lane does not miswire it.
- **Enforcement-gate exec_sql reconciliation** (security-auditor, enforcement lane ONLY — does NOT affect this inert apply) — the ruling packet §3 records "six further `exec_sql` sinks besides the two Batch-2 sinks" while memory/registers record cc-0053+cc-0054 as "7/7 contained". A **fresh live `exec_sql`-sink census** must reconcile these **before** enforcement is enabled (the E-Q2 precondition is only as strong as the containment of every postgres-reaching path).

---

## 7. Review status (T3 chain — REQUIRED before the apply gate)

> **Hash pin note:** `reviewed_input_hash = cc902a96…` pins the substantive package (§0–§6 — the SQL, seed, and
> sequence) at the moment all three reviews ran. Edits after that point are **confined to this §7 review-log**
> (recording verdicts/ids); **no §1–§3 SQL changed after the pin.** A future edit to §1–§6 voids the external review.


- [x] `db-rls-auditor` — **concerns → 2 should-fix APPLIED** (seed audit-idempotency §3; function-ACL assertion §1.5). All six live catalog assumptions VERIFIED (authz absent · `auth.uid()` NULL-under-service-role independently re-verified, resolving the prior substitution · public default-ACL traps · `postgres` REFERENCES on `auth.users` · `pk@invegent.com` count=1 · rolbypassrls). No must-fix, no block. Exposed-schema list deliberately routed to the E-Q11 pre-apply UI STOP.
- [x] `security-auditor` — **concerns / GREEN for the inert apply, no must-fix → all 4 should-fix APPLIED** (audit-fidelity `outcome` via GET DIAGNOSTICS on both write fns; last-admin guard `FOR UPDATE` concurrency lock; seed TOCTOU single-row guard; CASCADE-lockout + ≥2-admin control documented). Bootstrap-abuse fully blocked for the named authenticated adversary; the read fn cannot become cross-user disclosure; residual is only the accepted postgres/service_role path (E-Q13). GREEN scoped to the inert apply only — enforcement enable is NOT blessed.
- [ ] `apply-harness-auditor` (shadow) — the in-txn fail-closed ACL assertion (§1.5) + apply/rollback identity. Advisory, clears no gate; agent-type not registered this session → run the helper at freeze if invoked, else noted.
- [ ] `branch-warden` — before any commit (deferred to commit time; nothing committed yet).
- [x] external `ask_chatgpt_review` — **partial → escalate to PK** (risk high, confidence medium), review id `df82a33b-8eb1-4cba-8f82-df1a9c9fd7aa`, pinned `reviewed_input_hash = cc902a96778de266696ca9f958357dbe4440d7b997930a17ef422600cc6c3cf2`. **No `concrete_defect`** — generic "validate access control / test role-management edge cases" (triage: `structural_DDL_DML_escalation` + `policy_decision` → PK judgment gate; its edge-case recommendation IS the §4 step-4/5 proof plan). **Any change to this package voids this review (re-run required).**
- [ ] PK apply gate (T3) — deploy/migrate is a HARD STOP.

**Post-apply confirmation gates (named now):** re-run `get_advisors(security+performance)` after apply (expect zero new findings) · the §4 step-4 `auth.users` delete-path proof + step-5 fail-closed proofs before enforcement.

**§1–§3 APPLIED 2026-07-27 (see §8). Enforcement remains OFF.**

---

## 8. APPLIED — result record (2026-07-27, PK-authorized conditional apply)

**Authorization:** PK conditional apply (Convention 2) — "apply the inert authz substrate + governed first-admin seed" once the census refresh changed only the census and not the role-source SQL (verified: SQL §1–§6 byte-identical to the reviewed `cc902a96`). Enforcement to stay OFF until the remaining proofs complete.

**Pre-apply live STOP checks (all passed):** `authz` schema absent · `public.current_user_roles` absent · `pk@invegent.com` = exactly 1 auth row · no migration-name collision.

**Applied:**
- Migration **`authz_role_source_inert_v1`** (project `mbkmaxqhsohbtwsqolns`) — `apply_migration` returned success; the in-txn §1.5 fail-closed ACL assertion **passed** (a bad posture would have aborted the whole migration).
- **First-administrator seed** (§3) — `execute_sql`; seeded **`pk@invegent.com = administrator`** (1 role row), one `bootstrap/seeded` audit row (`is_self_mod=true`).

**Post-apply verification (all PASS):**
- Posture: `authz` present · both tables RLS **enable+force** · `authenticated` **can** read fn / **cannot** grant / **no** authz USAGE / **cannot** SELECT role table · `anon` **cannot** read · `service_role` **can** grant.
- **Read-back:** `current_user_roles()` under PK's verified JWT → `administrator` (client_id NULL).
- **Fail-closed:** unknown uid → 0 rows; NULL-uid (service-role) → 0 rows.
- **Advisors (post-DDL):** only the 3 expected by-design findings on the new objects — 2× `rls_enabled_no_policy` (INFO, intended deny-by-default) + 1× `authenticated_security_definer_function_executable` (WARN, the intended Shape-A read fn / C-6). Zero unexpected; no new `function_search_path_mutable` (search_path='' held).

**Enforcement: OFF.** Nothing reads `current_user_roles()` yet → zero behaviour change.

**Remaining before enforcement enable (PK gate, NOT done here):**
1. **Deletion-path proof** (§4 step-4) — `auth.users` delete vs the actor FK / role-row CASCADE + sole-admin lockout → re-bootstrap recovery. **Deferred: needs a scratch auth user (account creation), a separate deliberate step — not performed autonomously.**
2. **Fresh `exec_sql` + equivalent privileged-sink census** (PK-mandated enforcement precondition; reconcile "six sinks" vs "7/7 contained").
3. Enforcement guards + kill switch (E-6) + the five ruled role mappings — the separate enforcement lane.

**Not yet committed to the repo:** `apply_migration` mints its own ledger version; the repo migration file, rollback pin, result-doc, and register pointer are a PK-instructed docs-lane follow-up. Rollback (§5) remains valid while inert.
