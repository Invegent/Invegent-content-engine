# TMR Read RPC — Apply Hard-Stop Packet (PK apply gate)

## A. Packet status

- This is the **TMR Read RPC apply hard-stop packet**.
- **The migration file is CREATED but NOT APPLIED in this lane. No SQL executed. No DB mutation occurred.
  No live DB inspection. No RPC exists in the database yet.**
- **PK apply approval is REQUIRED before any apply** (this is a HARD STOP — see §E).

| Artifact | Path / value |
|---|---|
| **Final migration path** | `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` |
| **`final_read_rpc_migration_hash`** | `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f` |
| **`reviewed_v2_packet_hash`** | `64b4a55a460cc6732e0df5b91918bda8f72dd83ddde6ae60143920b90275b5e3` |
| **`reviewed_external_review_v2_hash`** | `7cc5fe588f4dd5ccd942c4a38691a67d750fe867d5cbdc1f25e3474cce94c1f9` |
| **`reviewed_db_rls_review_hash`** | `05d0631b05ee84f1bad585e3438167a176cddec86a5501c5434e65077751372d` |
| **`reviewed_security_review_hash`** | `18815ae8a6ab2f85ed36b304cb89c6fa2794167f7dbdf670815c1d5acd06a0b6` |
| **`schema_migration_hash`** (applied TMR schema) | `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` |
| **v2 external review id** | `8e4e531e-8621-4ab3-99c8-57ffee21af76` |
| **CE base** | `main == origin/main == c0a4520aa4d4f5bc94d11a163bff52a40fc23959`; register v4.47 |

> **Identity discipline:** the migration timestamp `20260630050000` is forward of the latest applied
> (`20260630042316`). Migration name = permanent identity — if PK requires any change to the SQL, the file
> gets a NEW timestamp + distinct name, never the same name with different SQL.

## B. Review chain

| Gate | Register | Verdict |
|---|---|---|
| Read-RPC implementation packet (v1 draft) | v4.42 | CLEAN FOR DB-RLS REVIEW |
| db-rls-auditor review | v4.43 | CLEAN (`05d0631b…`) |
| security-auditor review | v4.44 | CLEAN (`18815ae8…`) |
| external review v1 | v4.45 | **PARTIAL** — placeholders not inlined |
| packet revision → inline CASE (v2) | v4.46 | READY FOR EXTERNAL REVIEW (`64b4a55a…`) |
| external review v2 (inline CASE) | v4.47 | **CLEAN FOR PK APPROVAL / APPLY HARD-STOP** (`7cc5fe58…`, review_id `8e4e531e…`) |
| **apply hard-stop packet (this)** | **v4.48** | **READY FOR PK APPLY APPROVAL** (§G) |

- The db-rls / security **posture is unchanged** from the already-CLEAN v4.43/v4.44 reviews (same SECURITY
  DEFINER shape, pinned `search_path`, `STABLE`, service-role-only EXECUTE, same `c.*` table-access set,
  same DTO exposure). The v2 revision was **mechanical inlining** of the rollup/blocker logic only.
- **No PK *design* decision is outstanding.** The only remaining gate is the **PK apply decision** (an
  irreversible production step), which stays manual.

## C. Final migration content summary

`supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` creates **three read-only RPCs** (no other DDL):

1. **`public.get_tmr_template_list()`** — one sanitized row per provider template; **inline
   `lifecycle_rollup`** (conservative weakest-gate `CASE`) + **inline `blocker_summary`** (jsonb label
   array, empty `[]` when clean), both computed from one read-only `roll` LATERAL of `EXISTS(...)` signals.
   Counts/labels only; no payloads.
2. **`public.get_tmr_template_detail(p_provider_template_id uuid)`** — full sanitized detail; provenance
   ids only (`evidence_reference_id`/`evidence_reference_type` = soft refs, no raw payload); **JSONB guard**
   `case when jsonb_typeof(missing_fields)='array' then jsonb_array_length(...) else 0 end`; unknown id ⇒
   `{not_found:true}`.
3. **`public.get_tmr_template_filters()`** — safe filter vocabulary (distinct existing values + static CHECK
   enum sets); empty registry ⇒ empty distinct arrays + static vocab; no seeded/fake data.

**Common posture (all three):** `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path TO
'public, pg_temp'`, schema-qualified `c.*`, no `SELECT *`, no DML, no dynamic SQL, no helper function, no
provider calls, no secrets. **`production_proven`** is reachable **only** via
`EXISTS(proof_event WHERE proof_type='platform_publish' AND proof_status='passed')` — never inferred from
status text. **EXECUTE** revoked from `PUBLIC, anon, authenticated`; granted **only** to `service_role`.

**Executable-SQL equivalence:** with all comments stripped, the migration's executable SQL is
**byte-identical** (whitespace-insensitive) to the reviewed v2 packet (`64b4a55a…`) — 222/222 lines match.
The only deltas vs the packet are comment wording (helper-name references reworded) + a migration header.

## D. Static validation result

Run on `20260630050000_tmr_read_rpc_v1.sql` (hash `88efec0c…`):

| Check | Expected | Result |
|---|---|---|
| `public_tmr_rollup` / `public_tmr_blockers` (any) | 0 | **0** ✅ |
| `CREATE … FUNCTION public_tmr*` (helper fn) | 0 | **0** ✅ |
| `SELECT *` | 0 | **0** ✅ |
| DML (`insert`/`update`/`delete`, word-boundary) | 0 | **0** ✅ (`updated_at` correctly not matched) |
| `SECURITY DEFINER` | 3 | **3** ✅ |
| `STABLE` | 3 | **3** ✅ |
| `SET search_path TO 'public, pg_temp'` | 3 | **3** ✅ |
| `CREATE OR REPLACE FUNCTION` | 3 | **3** ✅ |
| `REVOKE EXECUTE … FROM public, anon, authenticated` | 3 | **3** ✅ |
| `GRANT EXECUTE … TO service_role` | 3 | **3** ✅ |
| proof-chain `platform_publish` + `passed` | present | **present** ✅ |
| render-proof `platform_render` + `passed` | present | **present** ✅ |
| JSONB guard (`jsonb_typeof` before `jsonb_array_length`) | present | **`jsonb_typeof`×1, `jsonb_array_length`×2, guarded** ✅ |
| **final_read_rpc_migration_hash** | — | `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f` |

## E. Apply gate

> **⛔ DO NOT APPLY WITHOUT PK APPROVAL.** Apply is an irreversible production step and is the ICE HARD STOP.

The future **apply lane** (separate, PK-authorized) must:

1. Re-fetch and verify `HEAD == origin/main`, ahead/behind `0/0`, clean tree.
2. Verify register marker + current commit (expected base = this packet's commit).
3. Re-compute and verify `final_read_rpc_migration_hash` == `88efec0c…` (STOP if the file changed).
4. Apply the **exact** migration `20260630050000_tmr_read_rpc_v1.sql`
   (`apply_migration`; if harness-denied, PK-authorized `execute_sql` fallback **+ ledger backfill**
   `supabase_migrations.schema_migrations` version `20260630050000` name `tmr_read_rpc_v1`).
5. Verify the **3 functions exist** (`public.get_tmr_template_list` / `…_detail(uuid)` / `…_filters`).
6. Verify **owner = `postgres`**.
7. Verify **`SECURITY DEFINER`** (prosecdef = true).
8. Verify **`search_path` pinned** (`proconfig` contains `search_path=public, pg_temp`).
9. Verify **`STABLE`** (provolatile = 's').
10. Verify **EXECUTE revoked** from `PUBLIC`/`anon`/`authenticated`.
11. Verify **EXECUTE granted** to `service_role`.
12. Verify **no browser table privileges** were added (the functions read `c.*`; no new grants on `c.*`
    tables to anon/authenticated).
13. Verify **empty registry returns safe DTOs** (`get_tmr_template_list()` → `rows: []`;
    `get_tmr_template_filters()` → empty distinct arrays + static vocab; `get_tmr_template_detail(<random
    uuid>)` → `{not_found:true}`).
14. **Record the apply result** (`…-tmr-read-rpc-apply-result.md`) and **update the register** after apply.

If external review of the **final migration-file diff** is desired and the file matches `88efec0c…`
(== the reviewed packet SQL), no new external review is required; re-run external review **only** if the SQL
changes before apply.

## F. Carry items

- **`c` PostgREST exposed-schema confirmation** remains an implementation/apply verification (the read path
  is server-mediated; the functions are service-role-only — browser never calls them directly).
- The **registry remains empty** — applying these read RPCs creates **functions only**, no data; no template
  is bound/enabled/proven by this migration.
- **Server-action / dashboard wiring is NOT started** — a later packet covers the dashboard server-side
  route that calls these RPCs and returns the DTOs (the v4.33 read-only view).
- **Future write-RPC obligation:** before any `proof_event` can be created (and thus before
  `production_proven` can ever roll up), the write-RPC must **validate `evidence_reference` against real
  `m.*` evidence** — so a `production_proven` state can never be fabricated by inserting a bare proof row.

## G. Final packet verdict

**✅ 1. READY FOR PK APPLY APPROVAL.**

The final migration artifact is created, its executable SQL is byte-identical to the externally-reviewed
(CLEAN) v2 inline-CASE packet, all static checks pass, and the full review chain is complete with no
outstanding PK *design* decision. The only remaining gate is the **PK apply decision** (irreversible
production step — HARD STOP).

**Recommended next lane:** **PK approval / TMR Read RPC apply lane** — on PK authorization, apply
`20260630050000_tmr_read_rpc_v1.sql` exactly (hash `88efec0c…`), run the §E post-apply verification, record
the apply result, and update the register.

---

**Scope:** migration artifact + apply hard-stop packet + register ONLY. **No SQL executed · no
`apply_migration`/`execute_sql` · no DB command · no DB mutation · no live DB inspection · no RPC in the
database · no dashboard/server-action/runtime code · no provider API call · no render/publish/binding/
enablement/deploy · no seed · no CCF/`.claude`/`_harness` change · no secrets.** Reviewed inputs
(`64b4a55a…` v2 packet · `7cc5fe58…` external review · `05d0631b…` db-rls · `18815ae8…` security ·
`f6733fa7…` schema migration) **unmodified**. Registry live but empty; no template bound/enabled/proven
(`quote_card.v1` blocked/`needs_template_edit`; `market_update.v1` strong candidate but defined/unwired;
`news_card.v1` proven PP × facebook+instagram only).

**Cross-refs:** v2 packet (v4.46), external review v2 (v4.47, review_id `8e4e531e…`), db-rls (v4.43),
security (v4.44), external review v1 (v4.45), applied schema (v4.40, `f6733fa7…`). Register: v4.48.
