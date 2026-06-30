# TMR Read RPC — Apply Result

## A. Apply status

| Field | Value |
|---|---|
| **Migration path** | `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` |
| **Migration hash** | `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f` (re-verified == approved before apply) |
| **Apply method** | `execute_sql` fallback (`apply_migration` **harness-denied before mutation**) + ledger backfill — the pre-authorized ICE pattern |
| **Migration version / name** | `20260630050000` / `tmr_read_rpc_v1` |
| **Applied (UTC)** | 2026-06-30 ~07:58Z (per `get_tmr_template_list().generated_at`) |
| **Project** | `mbkmaxqhsohbtwsqolns` |
| **Final verdict** | **APPLIED — VERIFIED WITH CARRY** (§J) |
| **PK approval** | Present — exact wording received ("I approve applying TMR Read RPC migration 20260630050000_tmr_read_rpc_v1.sql with hash 88efec0c… Proceed with the apply lane.") |

## B. Preflight result

- Branch `main`; `HEAD == origin/main == c96177317c9f498e6e4cf6ea2c2f10711e2405bf`; ahead/behind `0/0`; tracked tree clean.
- Register marker **v4.48** in both `00_sync_state.md` and `00_action_list.md`.
- Migration file present + hash `88efec0c…` matched the approved hash exactly (re-verified immediately before apply).
- Migration not previously in the ledger (`list_migrations`: latest prior was `20260630042316`; no `20260630050000` / `tmr_read_rpc_v1`).
- PK explicit approval text present.

## C. Apply result

- `apply_migration` was **attempted first** (directive-preferred) → **harness-denied before any mutation** (no partial state).
- Pivoted to the pre-authorized fallback: `execute_sql` of the exact reviewed SQL (the migration file's executable SQL, hash-verified `88efec0c…`), executed in one statement batch — **no error** (empty result).
- **Ledger backfill:** `insert into supabase_migrations.schema_migrations (version, name) values ('20260630050000','tmr_read_rpc_v1') on conflict (version) do nothing` → returned `{version:20260630050000, name:tmr_read_rpc_v1}` (row inserted).
- No warnings/errors. No retries. No SQL edited. No second migration created.

## D. Function verification

`pg_proc`/`pg_roles`/`pg_language` (schema `public`):

| Function | Exists | Owner | SECURITY DEFINER | Volatility | search_path | Language | Overloads |
|---|---|---|---|---|---|---|---|
| `get_tmr_template_list()` | ✅ | `postgres` | ✅ true | `s` (STABLE) | `public, pg_temp` | `sql` | 1 |
| `get_tmr_template_detail(uuid)` | ✅ | `postgres` | ✅ true | `s` (STABLE) | `public, pg_temp` | `sql` | 1 |
| `get_tmr_template_filters()` | ✅ | `postgres` | ✅ true | `s` (STABLE) | `public, pg_temp` | `sql` | 1 |

No unexpected overloads.

## E. Grant verification

`has_function_privilege(...)` (oid form):

| Function | PUBLIC exec | anon exec | authenticated exec | service_role exec |
|---|---|---|---|---|
| `get_tmr_template_list()` | ❌ false | ❌ false | ❌ false | ✅ true |
| `get_tmr_template_detail(uuid)` | ❌ false | ❌ false | ❌ false | ✅ true |
| `get_tmr_template_filters()` | ❌ false | ❌ false | ❌ false | ✅ true |

EXECUTE revoked from PUBLIC/anon/authenticated; granted to `service_role` only — as designed.

## F. Browser/table safety

The 8 `c.creative_*template*` tables (`pg_class`/`pg_policy`):

- **RLS enabled** on all 8; **policy_count = 0** on all 8 → deny-all posture **unchanged** by this migration.
- `has_table_privilege` for `anon`/`authenticated`: **SELECT = false, INSERT = false** on all 8 → **no browser table privileges added**; no direct `anon`/`authenticated` access to TMR `c.*` tables.
- This migration created **functions only** — it added **no** table grants and **no** RLS policies.

## G. Empty-registry behaviour

(service-role server-side path; **not** called from anon/authenticated)

- **`get_tmr_template_list()`** → `{ "contract_version":"tmr_read_v1", "generated_at":"2026-06-30T07:58:19Z", "rows":[] }` — `rows` empty, no error.
- **`get_tmr_template_filters()`** → `providers:[]`, `families:[]`, `platforms:[]` (empty distinct) + correct static vocab (`output_types`, `suitability_statuses`, `variant_statuses`, `client_scope_types`, `lifecycle_statuses`); no fake/seeded template data, no error.
- **`get_tmr_template_detail('00000000-…-0001')`** → `{ "not_found": true }` — safe controlled shape, no error, no raw payloads.

## H. Non-goals confirmation

No dashboard/server-action/runtime code · no seed · no template inventory inserted · no family/template/field rows · no client assignment · no proof event · no provider call · no render · no publish · no deploy · no CCF/`.claude`/`_harness` change. The empty `list`/`filters` results confirm **the registry remains empty** — the migration created functions only, mutated no data.

## I. Carries

- **Server action / backend read route NOT built yet** — a later packet covers the dashboard server-side route that calls these RPCs (service-role) and returns the DTOs.
- **`/create/templates` dashboard NOT wired yet** (the v4.33 read-only view).
- **Registry remains empty** — no template bound/enabled/proven.
- **Future write-RPC must validate `evidence_reference` against real `m.*` evidence** before any `proof_event` can be created — so `production_proven` can never be fabricated by a bare proof row.
- **`c` PostgREST exposed-schema confirmation:** the read path is server-mediated and the functions are service-role-only; browser never calls them directly. (Schema `c` is non-REST-exposed by design; this remains an operational note, not a blocker.)

## J. Final apply verdict

**✅ 2. APPLIED — VERIFIED WITH CARRY.**

The three TMR read RPCs (`get_tmr_template_list` / `get_tmr_template_detail(uuid)` / `get_tmr_template_filters`)
are live, owned by `postgres`, `SECURITY DEFINER`, `STABLE`, `search_path`-pinned, `sql`, single-overload,
EXECUTE-restricted to `service_role` only, return safe empty-registry DTOs, and added no browser table
privileges / no RLS policy change. Migration ledger records `20260630050000` / `tmr_read_rpc_v1`. The carries
in §I are forward work, not defects.

**Recommended next lane:** TMR Read RPC **server-action / backend read path** packet (dashboard server-side
calls the RPCs via the service-role client and returns the DTOs).

---

**Scope:** DB apply (3 read RPCs) + apply-result doc + register. **No template inventory inserted · no
binding · no assignment · no proof event · no dashboard/server-action/runtime code · no provider call · no
render/publish/enablement/deploy · no CCF change · no secrets.** The migration file (`88efec0c…`) was
**not modified** by this lane. Registry live but empty.

**Cross-refs:** apply hard-stop packet (v4.48), external review v2 (v4.47, review_id `8e4e531e…`), v2 packet
(v4.46), db-rls (v4.43), security (v4.44), applied TMR schema (v4.40, `f6733fa7…`). Register: v4.49.
