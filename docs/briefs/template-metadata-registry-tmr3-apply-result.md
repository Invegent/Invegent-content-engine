# TMR-3 — Migration Apply Result

## A. Apply status

- **TMR-3 migration APPLIED.**
- **Apply method:** `apply_migration` was **harness-denied** (permission denied before any mutation —
  no DB change from that attempt), so the apply used the **PK-authorized, ICE-governance-permitted
  `execute_sql` fallback + ledger backfill** (the proven pattern from register v4.19 / GFCP Slice 1A,
  pre-specified in the apply hard-stop packet §F.11). The fallback applied the **exact approved SQL**.
- **Apply timestamp:** 2026-06-30 (CE session).
- **Migration version:** `20260630042316`.
- **Migration file path:** `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`.
- **Approved SQL hash:** `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` (file unchanged
  after apply).
- **DB mutation was limited to the approved migration** (the 8 TMR tables + indexes + grants + RLS) and
  the one-row migration-ledger backfill. **No other SQL, no seed, no runtime/RPC.**
- **Final result (see §J): `APPLIED — VERIFIED WITH CARRY`** (one non-blocking verification limit: `c`
  PostgREST exposed-schema config is not SQL-provable — mitigated by verified zero browser-role grants +
  deny-all RLS).
- **CE state:** `main == origin/main == 927cb15e04c6faf675444b10f9e4c6b103a43c14`; register **v4.39 → v4.40**.
  CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source and approval chain

| Gate | Register | Hash |
|---|---|---|
| Packet draft | v4.35 | `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c` |
| db-rls-auditor review (CLEAN) | v4.36 | `17b921edba1308f26896c1339ee65de6bdc178c3fe309679e68327ee4a82fca0` |
| security-auditor review (CLEAN) | v4.37 | `8b493320d6bd5abaf978d0b85caba3599c9fcb7899468e16e61ea4b180ecefb7` |
| external review (CLEAN — `ask_chatgpt_review` agree/proceed, review_id `3d449625…`) | v4.38 | `eba812e1279e2128055a79e2e8ec8a861aa572e4e9c67244c88194ff582d3eb7` |
| apply hard-stop packet (READY) | v4.39 | — |
| **PK final apply approval** | this lane | explicit, in the apply directive |

- **Final migration artifact:** `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  hash `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`.

---

## C. Migration ledger verification

- **Ledger version found:** `20260630042316`, name `tmr3_template_metadata_registry` (recorded exactly
  once; `ON CONFLICT (version) DO NOTHING` guard).
- **Verification method:** read-only `SELECT … FROM supabase_migrations.schema_migrations WHERE
  version='20260630042316'` → 1 row. **PASS.**

---

## D. Table existence verification

Read-only `pg_class`/`pg_namespace` (schema `c`, `relkind='r'`, `relname like 'creative_%'`): **8 tables
present.**

| # | Table | Exists |
|---|---|---|
| 1 | `c.creative_template_family` | ✓ |
| 2 | `c.creative_provider_template` | ✓ |
| 3 | `c.creative_provider_template_field` | ✓ |
| 4 | `c.creative_template_platform_suitability` | ✓ |
| 5 | `c.creative_template_variant_candidate` | ✓ |
| 6 | `c.creative_template_client_assignment` | ✓ |
| 7 | `c.creative_template_inventory_audit` | ✓ |
| 8 | `c.creative_template_proof_event` | ✓ |

**PASS (8/8).**

---

## E. Row count / seed verification

Read-only `count(*)` per table: **all 8 = 0 rows.** **PASS — no seed data.** (No `INSERT` was run
against any TMR table; the only `INSERT` in this lane was the single migration-ledger row.)

---

## F. RLS and grants verification

- **RLS:** `relrowsecurity = true` on **all 8** tables; **0 RLS policies** (`pg_policies`). Deny-all
  hardening active. The security advisor reports `rls_enabled_no_policy` (**INFO**) on each of the 8 —
  the intended deny-by-default; no ERROR/WARN advisory for any TMR table. **PASS.**
- **Browser roles:** `anon`, `authenticated`, `PUBLIC` have **0 table privileges** on all 8 (verified
  via `information_schema.role_table_grants`). **PASS.**
- **service_role:** present on all 8 — `DELETE,INSERT,SELECT,UPDATE` on the 7 mutable tables;
  **`INSERT,SELECT` only on `c.creative_template_inventory_audit`** (append-only — `has_table_privilege`
  UPDATE=false, DELETE=false). **PASS.**
- **Schema USAGE:** `has_schema_privilege('service_role','c','USAGE') = true` (was already true; the
  migration's `GRANT USAGE` is confirmatory/idempotent). **PASS.**
- **Other grantee:** `inspector_ro` has SELECT on all 8 — a Supabase **platform read-only inspector
  role** (auto-granted by schema-`c` default privileges; present on all existing `c.*` tables; **not** a
  browser/REST role). Observed, not a finding.

---

## F-default. Default privileges

- The schema-`c` default privileges auto-granted **only** `inspector_ro` SELECT on the new tables —
  **not** `anon`/`authenticated`/`PUBLIC` (verified 0 browser grants). The explicit per-table `REVOKE …
  FROM PUBLIC, anon, authenticated` holds. **Default-privilege carry (DBRLS-003 / SEC-008 / EXT-010)
  RESOLVED in outcome:** no browser-role leakage.

---

## G. `c` schema exposure verification

- **Method:** read-only `current_setting('pgrst.db_schemas', true)` → **null** (the PostgREST
  exposed-schema list is not set at the DB level; it is a platform/PostgREST-service config).
- **Result:** the exact **PGRST106 / exposed-schema confirmation is NOT provable from DB metadata** in
  this environment. **APPLY-LANE VERIFY CARRY** (carries DBRLS-001 / SEC-006 / EXT-008).
- **Mitigation (verified):** browser roles (`anon`/`authenticated`/`PUBLIC`) have **zero table
  privileges** AND **deny-all RLS** is active on all 8 tables — so even if `c` were REST-exposed, browser
  roles can read nothing. This matches the **proven Control Tower `c.*` non-exposed, service-role-only
  posture** (register v4.13). The substantive control ("not available to browser roles") is **verified**;
  only the literal PostgREST-config confirmation remains a standing apply-lane check.

---

## H. Non-goal confirmation

✅ No runtime code · no dashboard code · no provider call (Creatomate/HeyGen) · no render · no publish ·
no template binding · no client/template/variant/platform enablement · no deploy · no CCF change. The
only DB effect is the approved migration (8 tables + indexes + grants + deny-all RLS) + the one-row
ledger backfill. No RPC / SECURITY DEFINER function was created.

---

## I. Remaining carries

- **Future read RPC / server action** required for the dashboard `/create/templates` view (the schema is
  non-browser-readable; reads go via a separately-reviewed SECURITY DEFINER RPC with pinned `search_path`,
  sanitized output) — gated.
- **Future write RPC / wizard** MUST enforce: `production_proven` requires a real `platform_publish`
  proof_event (cross-table invariant, not DDL-enforced); proof-event insertion validates
  `evidence_reference` against real `m.*` evidence (anti-fabrication); JSONB inputs sanitized.
- **`c` PostgREST exposed-schema confirmation** (§G) — standing apply-lane check; mitigated by verified
  browser-role denial + deny-all RLS.
- **No template is bound / enabled / proven by this migration alone** — the registry starts empty;
  `quote_card.v1` stays `needs_template_edit`/blocked, `market_update.v1` a strong candidate but
  defined/unwired, `news_card.v1` production-proven PP × facebook+instagram only.

---

## J. Final result

**✅ 2. APPLIED — VERIFIED WITH CARRY.**

The TMR-3 migration applied exactly once (8 `c.creative_template_*` tables, deny-all RLS, service-role-
only grants, audit append-only, no seed, ledger version `20260630042316`). Core safety **holds and is
verified**: browser roles have zero table access + deny-all RLS; audit is append-only; no seed; no
runtime/provider/dashboard/deploy side effects. The **one non-blocking carry** is §G — the literal
PostgREST exposed-schema confirmation is not SQL-provable here (`pgrst.db_schemas` null), **mitigated** by
the verified zero browser-role grants + deny-all RLS (the tables are not browser-readable regardless,
matching the proven `c.*` sibling posture). This carry does **not** block TMR read-contract **design**
(the read path is a SECURITY DEFINER RPC, independent of schema exposure).

**Recommended next lane: TMR read-contract design / read RPC packet** (the safe, server-side, sanitized
read model for `/create/templates`), with the §G PostgREST-exposure confirmation carried as a standing
apply-lane check and the future write-RPC obligations (§I) carried for the write lane.

---

## Explicit non-claims / scope
- DB mutation was **limited to the approved migration + the one-row ledger backfill**. No `apply_migration`
  ran (harness-denied, no mutation); the `execute_sql` fallback applied the exact approved SQL under PK
  approval + ICE governance (v4.19 precedent / packet §F.11). No other SQL, no seed, no RPC.
- No runtime/edge/dashboard/CCF code change; no `property-pulse.json`/`creative_contract.ts`/
  `registry-schema-v2.md` change; no provider API call; no render/publish/binding/enablement/deploy.
- **No secrets** stored (only safe identifiers + sanitized metadata; "secret" appears only in safety
  comments / the `no_secret_assertion` column).
- The migration file was **not modified** after v4.39 (hash `f6733fa7…` stable); the four reviewed-input
  files were not modified.

## Cross-references
- Migration artifact: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (v4.39).
- Apply hard-stop packet: `…-tmr3-apply-hard-stop-packet.md` (v4.39).
- Reviews: db-rls (v4.36), security (v4.37), external (v4.38). TMR-1 model: `…-v1-design.md` (v4.32).
- Apply precedent (execute_sql fallback + ledger backfill): GFCP Slice 1A (register v4.19).
- Register: v4.40 (this result).
