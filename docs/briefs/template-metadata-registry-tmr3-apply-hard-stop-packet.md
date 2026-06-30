# TMR-3 — Apply Hard-Stop Packet (final migration prepared; NOT applied)

## A. Packet status

- This is the **TMR-3 apply hard-stop packet**.
- The **final migration artifact has been prepared** (`supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`).
- **No migration has been applied. No SQL has been executed. No DB mutation has occurred. No DB
  inspection was performed.**
- **Explicit PK apply approval is still required before any DB command** (`apply_migration`, or the
  `execute_sql` fallback + ledger backfill if harness-denied).
- **Final status (see §J): `READY FOR PK APPLY APPROVAL`.**
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == b3976c7bba0e9f9e0880b425b39aee335a9bf276`;
  register **v4.38**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.
- **No auto-apply mechanism exists** (verified): no `.github/workflows/`, no CI/script invoking
  `supabase db push`/`migration up`/`apply_migration`, no auto-migration setting in
  `supabase/config.toml`, only dry-run/log-only CCF guards, no active git hooks. Creating this `.sql`
  file is inert until someone manually applies it.

---

## B. Source documents and hashes

| Document | sha256 |
|---|---|
| TMR-3 migration packet draft (reviewed input) | `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c` |
| TMR-3 db-rls-auditor review | `17b921edba1308f26896c1339ee65de6bdc178c3fe309679e68327ee4a82fca0` |
| TMR-3 security-auditor review | `8b493320d6bd5abaf978d0b85caba3599c9fcb7899468e16e61ea4b180ecefb7` |
| TMR-3 external review | `eba812e1279e2128055a79e2e8ec8a861aa572e4e9c67244c88194ff582d3eb7` |
| **FINAL migration SQL** (`20260630042316_tmr3_template_metadata_registry.sql`) | **`f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`** |

All four reviewed-input hashes were **verified to match** their expected values at preflight (the
packet/db-rls/security/external hashes carried from v4.35–v4.38). None of the reviewed input files was
modified by this lane.

---

## C. PK decisions carried (ratified for apply-packet preparation)

1. **deny-all RLS — ADOPTED** as the final RLS posture (`ENABLE ROW LEVEL SECURITY`, no policies, on all
   8 tables). The RLS-off baseline is **not** used.
2. **`proof_status` CHECK — ADOPTED** with vocabulary `('passed','failed','pending','superseded')`
   (NULL allowed).
3. **No seed data** in the first TMR migration — confirmed (0 `INSERT`).
4. **Future write-RPC obligations — ACKNOWLEDGED** (recorded in §H; not enforced by this DDL):
   production_proven requires a real `platform_publish` proof_event; proof-event insertion validates
   `evidence_reference`; JSONB inputs are sanitized.
5. **Apply still requires explicit PK approval** — this lane prepared the artifact only; it did **not**
   apply.

---

## D. Final migration artifact

| Field | Value |
|---|---|
| **Filename** | `20260630042316_tmr3_template_metadata_registry.sql` |
| **Full path** | `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` |
| **Timestamp basis** | current UTC at preparation (`date -u +%Y%m%d%H%M%S` → `20260630042316`); forward of the latest applied `20260630000000_gfcp_slice1a_…` |
| **Re-stamp reason** | the packet's `20260701000000` was an **illustrative** stamp; migration name = permanent identity, so the real file is stamped at preparation time (re-stampable again at apply if PK prefers a later stamp — must remain forward of the latest applied) |
| **Final SQL hash** | `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` |
| **Migration file created?** | **YES** (prepared) |
| **Migration file executed?** | **NO** — not applied, not run, no DB command |

**Structure (verified):** 8 `CREATE TABLE c.creative_template_*`; surrogate `uuid` PK
`gen_random_uuid()`; `text + CHECK` vocabularies; hard in-registry FKs; soft cross-schema refs;
1 partial-unique expression index (client_assignment) + 14 roll-up/lookup indexes; `GRANT USAGE ON
SCHEMA c`; per-table `REVOKE … FROM PUBLIC, anon, authenticated`; service-role grants (audit
INSERT+SELECT only); deny-all RLS on all 8; **0 seed `INSERT`, 0 `CREATE FUNCTION`/RPC, 0 `CREATE
POLICY`**; rollback as a commented reference section (not executed). No secrets / no raw payloads.

---

## E. Delta from reviewed packet

Exact deltas of the final SQL vs the reviewed packet draft (`c125f06a…`) — **all within the ratified PK
decisions + mechanical re-stamp/comment housekeeping**:

| # | Delta | Type | Ratified by | Re-review needed? |
|---|---|---|---|---|
| D1 | Filename/timestamp re-stamped `20260701000000` → `20260630042316` | mechanical (file identity) | PK decision 5 | No |
| D2 | **deny-all RLS adopted as the final posture** (the packet presented it as *optional* alongside an RLS-off baseline; the final file includes only the deny-all `ENABLE RLS` block — identical SQL, now the chosen posture) | posture selection | PK decision 1 | No |
| D3 | **`proof_status` CHECK vocab added** (`passed/failed/pending/superseded`; NULL allowed) — the one genuinely new SQL line vs the packet (which had `proof_status text` free-form) | additive CHECK constraint | PK decision 2 | No |
| D4 | **`GRANT USAGE ON SCHEMA c TO service_role`** added explicitly (idempotent) — the packet noted it as an apply-lane assumption; now in the SQL | additive idempotent grant | apply-lane item → folded in | No |
| D5 | Comment/formatting housekeeping: removed the per-block `DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY` labels (this is now a real migration file), added a migration header noting apply is PK-gated, kept rollback as commented SQL, added a few clarifying `COMMENT ON`/inline comments (no structural change) | comment-only | covered (cosmetic) | No |

**No additional deltas.** No structural change beyond D2/D3/D4; no table/column/constraint/grant change
outside the ratified set; **no seed, no RPC, no runtime/dashboard/provider change.** No delta is
material-and-uncovered → **no review gate needs re-running.** (If PK later prefers a different stamp or
edits the SQL, re-stamp + re-confirm the hash and re-run the affected gate.)

---

## F. Apply-lane verification checklist (perform AT apply — not now)

1. Confirm schema `c` is **non-REST-exposed** (a direct PostgREST read of a TMR table returns **PGRST106**).
2. Confirm `GRANT USAGE ON SCHEMA c TO service_role` is effective (it is in the SQL; idempotent).
3. Confirm **default privileges** in `c` do not leak access to anon/authenticated (the explicit per-table
   REVOKE neutralises; verify advisors clean post-apply).
4. Confirm the **audit table has no UPDATE/DELETE grant** (append-only — the SQL grants only
   SELECT+INSERT).
5. **Confirm the final SQL hash** `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`
   immediately before apply (and that the file is byte-identical to this committed artifact).
6. Confirm **final SQL matches this committed migration artifact** (path D above).
7. Confirm **branch/HEAD/origin parity** (`main`, HEAD == origin/main, 0/0) before apply.
8. Confirm **tree state** clean.
9. Confirm **no runtime/provider/dashboard/deploy changes** are bundled with the apply.
10. Confirm the **rollback section** (§G) is understood before any production rollback.
11. If applying via `apply_migration`: ledger records version `20260630042316`. If harness-denied →
    `execute_sql` the exact reviewed SQL, then **backfill** `supabase_migrations.schema_migrations`
    (version `20260630042316` / name `tmr3_template_metadata_registry`) exactly once.

---

## G. Rollback notes

- Rollback removes **only the 8 TMR tables in reverse dependency order** (proof_event → audit →
  assignment → variant → suitability → field → provider_template → family), via `DROP TABLE IF EXISTS`
  (indexes/grants/RLS drop with their tables). The rollback SQL is included **as a commented reference
  section** in the migration file — it is **not executed**.
- Rollback **must not touch external operational tables** (`c.client`, `m.*`) and **deletes no provider
  data outside the TMR tables**.
- Rollback **must be explicitly reviewed** before any production rollback (and is only clean while the
  tables hold no downstream-referenced data; at creation there is none).

---

## H. Future write-lane obligations (binding on the later, separately-reviewed write-RPC)

- **`production_proven` cannot be operator-set directly** without a real `platform_publish` proof_event
  (the DDL cannot enforce this cross-table invariant; the write-RPC must).
- **Proof-event insertion must validate `evidence_reference`** against real `m.post_render_log` /
  `m.post_publish` evidence (anti-fabrication).
- **JSONB inputs must be sanitized** and bounded before storage (`brand_constraints`, `constraints`,
  `missing_fields`, `changed_fields`).
- **Future SECURITY DEFINER RPCs must pin `search_path = public, pg_temp`**, be schema-qualified, no
  dynamic SQL, EXECUTE service-role-only.
- **Read endpoints must be read-only and return sanitized summaries** (evidence ids/hashes OK; no
  secrets, no raw payloads).
- **Write endpoints must enforce lifecycle transitions** (no jumping past an un-evidenced gate).

---

## I. Hard stop

**STOP HERE.**
- **Do not apply.**
- **Do not run `execute_sql`.**
- **Do not run `apply_migration`.**
- **Do not run any DB command.**
- The next lane requires **explicit PK apply approval**.

---

## J. Final status

**✅ 1. READY FOR PK APPLY APPROVAL.**

The final migration artifact (`20260630042316_tmr3_template_metadata_registry.sql`, hash
`f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`) and this apply hard-stop packet are
**prepared** — incorporating the PK-ratified deltas (deny-all RLS, `proof_status` CHECK,
`GRANT USAGE ON SCHEMA c`, no seed) — with **no apply performed, no SQL executed, no DB mutation**. The
deltas vs the reviewed packet are all within the ratified decisions (§E); **no review gate needs
re-running**. The packet awaits **explicit PK apply approval** (§F apply-lane checklist + §H write-lane
obligations acknowledged).

**Recommended next lane: PK final apply approval / TMR-3 migration apply** — PK runs or authorises
`apply_migration` (or `execute_sql` fallback + ledger backfill if harness-denied), after the §F
apply-lane verifications.

---

## Explicit non-claims / scope
- **The migration file was PREPARED, NOT APPLIED.** No `execute_sql`, no `apply_migration`, no DB
  command, no DB mutation/inspection, no deploy. The only `supabase/` change is the **one new migration
  file** (inert until manually applied).
- No runtime/edge/dashboard/CCF code change; no `property-pulse.json`/`creative_contract.ts`/
  `registry-schema-v2.md` change; no provider API call; no render/publish/binding/enablement; **no
  secrets** (the SQL holds only safe identifiers + sanitized metadata; the word "secret" appears only in
  safety comments / the `no_secret_assertion` column).
- The four reviewed-input files (packet `c125f06a…`, db-rls `17b921ed…`, security `8b493320…`, external
  `eba812e1…`) were **not modified**.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only.

## Cross-references
- Final migration artifact: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`.
- Reviewed packet: `docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md` (v4.35).
- Reviews: db-rls (v4.36), security (v4.37), external (v4.38).
- TMR-2 final review: `…-tmr2-final-schema-rls-review.md` (v4.34); TMR-1 model: `…-v1-design.md` (v4.32).
- Apply lane precedent (execute_sql fallback + ledger backfill): GFCP Slice 1A (register v4.19).
- Register: v4.39 (this packet).
