# TMR-3 — db-rls-auditor Review (static / repository-only)

## A. Review status

- This is the **db-rls-auditor review** of the TMR-3 migration packet draft
  (`docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md`).
- **reviewed_input_hash = `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c`**
  (`sha256` of the packet draft at review time). The packet file is **not modified** by this review —
  the hash must remain stable.
- This review is **static / repository-only**. **No DB inspection was performed.** **No migration was
  created. No SQL was executed. No DB mutation was authorised.**
- **Verdict (see §P): `CLEAN FOR SECURITY-AUDITOR REVIEW`** — no DB/RLS blocker; remaining items are
  apply-lane verifications + write-layer integrity recommendations.
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 159c4f149d785f8b9fd15eabbcf45cede600ebfb`;
  register **v4.35**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `docs/briefs/template-metadata-registry-v1-design.md` | TMR-1 canonical object model |
| `docs/briefs/template-metadata-registry-tmr2-final-schema-rls-review.md` | TMR-2 FINAL decisions (authoritative) |
| `docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md` | **the reviewed input** (hash above) |
| `docs/briefs/tmr-dashboard-readonly-view-design-brief.md` | read-only `/create/templates` consumer |
| `docs/briefs/creative-intake-template-wizard-flow-v2.md` | template-led wizard (write/capture) consumer |
| register **v4.35** context | the DRAFTED — READY FOR REVIEW GATE status |

**TMR-1 separation confirmed preserved by the packet:** template family ≠ provider template ≠ field
inventory ≠ output contract ≠ platform suitability ≠ variant candidate ≠ client/brand assignment ≠ proof
event ≠ production enablement (each is a distinct table); and `inventory_captured ≠ renderable ≠
platform_safe ≠ client_enabled ≠ production_proven` (separate tables + a separate proof-event table; no
state implies a later one at the DB level — subject to F-004 on the write layer).

---

## C. Schema exposure review

- **Placement:** all 8 tables in the existing **`c.`** schema; no new schema; no `public` placement; no
  browser-direct table reads intended (reads go through a future reviewed SECURITY DEFINER RPC / server
  action — none in this packet).
- **Acceptable?** **Yes, structurally** — consistent with the proven non-REST-exposed `c.*`
  service-role-only sibling pattern (Control Tower P1, register v4.13).
- **Static provability of non-exposure:** **NOT statically provable from the repo.** `supabase/config.toml`
  has **no `[api]` block / no exposed-schema declaration** — the PostgREST exposed-schema list is managed
  in the **remote project**, not in repo config. So the claim "`c` is non-REST-exposed" rests on the
  **documented proven-sibling precedent**, not a repo artifact. → **APPLY-LANE VERIFY (TMR3-DBRLS-001).**
- **PGRST exposure expectation is clear:** the packet states a direct PostgREST read should return
  **PGRST106**; that expectation must be confirmed live at apply (a direct read of one TMR table returns
  PGRST106; the read RPC is the only read path).

---

## D. Table model review

All 8 tables, dependency-ordered (parent → child); surrogate `uuid` PK `default gen_random_uuid()`
(PG13+ core built-in — no `pgcrypto`); `created_at/updated_at timestamptz not null default now()`.

| # | Table | Order/FK | PK | Unique | CHECK vocab | First migration | Enable-risk |
|---|---|---|---|---|---|---|---|
| 1 | `creative_template_family` | root | uuid | `family_key` | `scope`, `status` | yes | none |
| 2 | `creative_provider_template` | → family (set null) | uuid | `(provider, provider_template_id)` | `scope`, `output_type`, `inventory_status`, `status` | yes | none |
| 3 | `creative_provider_template_field` | → template (cascade) | uuid | `(template_id, element_name)` | `field_kind` | yes | none |
| 4 | `creative_template_platform_suitability` | → template (cascade) | uuid | `(template_id, platform, placement)` | `suitability_status` | yes | see F-004 |
| 5 | `creative_template_variant_candidate` | → template (cascade) | uuid | `(template_id, variant_key)` | `fit_status` | yes | none (candidate only) |
| 6 | `creative_template_client_assignment` | → template (cascade) | uuid | partial `(template_id, coalesce(client_id,nil))` | `assignment_scope`, `assignment_status` | yes | see F-004 |
| 7 | `creative_template_inventory_audit` | → template (set null) | uuid | — (append-only) | `capture_method` | yes | none |
| 8 | `creative_template_proof_event` | → template (cascade), → assignment (set null) | uuid | — | `proof_type` | yes | none |

- **Dependency order is correct** — every FK target (family, provider_template, client_assignment) is
  created before its referrer; table 8 → table 6 (order 6 < 8) ✓.
- **Required columns / timestamps / unique constraints** are present and sensible (§J).
- **FK strategy** in-registry is hard (`on delete cascade` for child inventory; `set null` for optional
  parents) — structurally safe.
- **Does any table shape risk enabling production accidentally?** **No** — there is **no boolean
  `enabled`/`active` flag a worker reads**; all state is `text + CHECK` governance metadata; **no runtime
  consumer reads these tables** (TMR has no runtime/worker consumer yet). The only "production_proven"
  exposure is the three settable status texts flagged in **F-004** (a write-layer rule, not a DB enable).
- **All 8 belong in the first migration** (cohesive FK graph; splitting adds ordering risk for no
  benefit) — confirmed.

---

## E. Grants / revokes review

Candidate posture (packet §F): per-table `REVOKE ALL … FROM PUBLIC, anon, authenticated;` then
`GRANT … TO service_role;` with the audit table **INSERT + SELECT only**.

- **REVOKE from PUBLIC, anon, authenticated** — present for all 8 tables; **correctly names
  `anon, authenticated`** (revoking PUBLIC alone is insufficient — the standing ICE gotcha is honoured).
  **PASS.**
- **service_role grants** — `SELECT, INSERT, UPDATE, DELETE` on the 7 mutable tables; `SELECT, INSERT`
  only on the audit table. **PASS** (matches the append-only intent, §G).
- **No grant to browser roles** (anon/authenticated) anywhere — **PASS.**
- **Schema USAGE assumption** — the packet does **not** include `GRANT USAGE ON SCHEMA c TO service_role`.
  Table grants are inert without schema USAGE. `service_role` almost certainly already has `USAGE ON
  SCHEMA c` (existing `c.*` Control-Tower objects are used by service_role), but the packet should **state
  this assumption** and the apply lane should **confirm** it (or the migration should include an explicit
  `GRANT USAGE ON SCHEMA c TO service_role` — idempotent if already present). → **APPLY-LANE VERIFY
  (TMR3-DBRLS-002).**
- **Default-privilege gap** — if schema `c` carries `ALTER DEFAULT PRIVILEGES … GRANT … TO anon,
  authenticated` (Supabase applies this on `public` by default, not usually on `c`), a new table could be
  auto-granted to browser roles **at creation**; however the packet's explicit per-table `REVOKE … FROM
  anon, authenticated` (run after CREATE in the same migration) **neutralises** any such default grant.
  Confirm no residual default grant survives. → **APPLY-LANE VERIFY (TMR3-DBRLS-003)** (PASS-with-verify;
  the REVOKE ordering covers it).
- **No obvious default grant gap** otherwise. Grants are **sufficient and unambiguous** for a
  service-role-only, non-browser-readable posture.

---

## F. RLS posture review

- **Baseline (RLS-OFF in non-exposed `c` with locked grants):** **acceptable** — it is the **proven `c.*`
  sibling posture** (Control Tower, v4.13). `service_role` bypasses RLS regardless; with the schema
  non-exposed and grants revoked from anon/authenticated, anon/authenticated cannot reach the tables even
  without RLS. **PASS** (consistent with proven precedent).
- **Optional deny-all RLS hardening:** the candidate SQL (`ALTER TABLE … ENABLE ROW LEVEL SECURITY;` with
  **no `CREATE POLICY`**) is **correct and non-breaking** — deny-by-default for anon/authenticated;
  `service_role` still bypasses. **PASS.**
- **Grant/RLS mismatch?** **None** — both postures keep anon/authenticated out; the grants are the primary
  control, RLS (if enabled) is belt-and-braces. service_role semantics preserved either way.
- **Recommendation:** RLS-off baseline is acceptable and precedent-consistent; **deny-all RLS is a clean,
  cheap hardening that the security-auditor may prefer as the default for a brand-new table family**
  (defence-in-depth against a future accidental schema exposure). db-rls-auditor flags both as clean and
  **defers the final choice to security-auditor** (TMR-2 final review already routed this there).
- **Future read RPC / server action** needs **separate review** (not in this packet) — see §N.

---

## G. Audit append-only review

- `c.creative_template_inventory_audit`: `no_secret_assertion boolean not null` + `no_mutation_assertion
  boolean not null` (both **mandatory**), `inventory_hash`, `source_reference` (sanitized), `changed_fields
  jsonb`; **no raw payload columns.** **PASS** on shape.
- **Append-only enforcement:** by **grant only** (the candidate grant gives `SELECT, INSERT` and
  **omits** UPDATE/DELETE) — **documented and correct for v0.** It is **not** trigger/policy-enforced; a
  future accidental `GRANT UPDATE/DELETE` would silently break immutability. Acceptable for v0; a
  revoke-update trigger is the documented later hardening. → **PASS-with-note (TMR3-DBRLS-006);** apply
  lane must confirm no UPDATE/DELETE grant leaks onto the audit table.
- **Proof vs audit separation:** correct — capture/manual-export is recorded on the **audit** table
  (`capture_method`), proof is recorded on the **separate `proof_event`** table; capture is not proof.
- **Soft refs sufficient for first migration:** yes (audit `template_id` is `set null` nullable to allow
  family-level captures; no hard external FK).

---

## H. Proof / capability / enablement separation review

Preserved **structurally** (distinct tables; no DB enable flag):
- platform suitability is **not** proof — separate table; `proof_reference` points to evidence.
- variant candidate is **not** a binding — `fit_status` only; no binding column.
- client assignment is **not** enablement — separate table; assignment ≠ client-enabled at the worker.
- proof event is **not** publishing permission — it is an evidence record.
- production_proven requires a real `platform_publish` proof_event (the intended invariant).
- **no seed creates proof or enablement** (seed policy = none, §L).

**Flag (TMR3-DBRLS-004 — WARNING, write-layer integrity):** `production_proven` is a **settable `text`
value in three columns** — `creative_provider_template.status`, `platform_suitability.suitability_status`,
`client_assignment.assignment_status`. A DB `CHECK` **cannot** enforce that setting any of these requires
a real `creative_template_proof_event` of type `platform_publish` (a cross-row/cross-table invariant).
This is **structurally honest** (the values are legitimate lifecycle states) but the **integrity rule
must be enforced at the future write-RPC / wizard layer**, not assumed from the schema. **Carry to
security-auditor + the future write-path review.** Not a DB blocker (DB cannot cheaply enforce it).

---

## I. CHECK constraints and status vocabulary review

- **`text + CHECK` (not PG enums):** **correct** — evolvable via a later migration without an enum-type
  rewrite; consistent with TMR-2 final.
- **Completeness:** lifecycle (14 states), inventory_status (9, incl. `missing`/`stale`/`blocked`),
  suitability (incl. `unknown`/`not_suitable`/`blocked`), fit_status (incl. `needs_template_edit`/
  `unsuitable`/`blocked`), assignment scope/status, capture_method — all map honestly to the TMR
  lifecycle; **`unknown`/`missing`/`blocked` states are represented** (supports the "no optimistic data"
  dashboard requirement). **PASS.**
- **proof_event:** `proof_type` is CHECK-constrained (`smoke_render`/`visual_approval`/`platform_render`/
  `platform_publish`) — adequate. **`proof_status` has NO CHECK** (free `text`). → **WARNING
  (TMR3-DBRLS-005, minor):** add a CHECK vocab for `proof_status` (e.g. `passed`/`failed`/`pending`) or
  document it as intentionally free-form. Non-blocking.
- **Lifecycle rollup:** **derived in the UI, not stored** (TMR-1/packet) — **PASS** (avoids a stored
  rollup drifting from the source columns).

---

## J. Indexes and uniqueness review

- unique `family_key` ✓ · unique `(provider, provider_template_id)` ✓ · unique `(template_id,
  element_name)` ✓ · unique `(template_id, platform, placement)` ✓ · unique `(template_id, variant_key)` ✓
  · partial-unique `(template_id, coalesce(client_id, nil-uuid))` ✓ · proof/audit `(template_id, *_at
  desc)` + `(platform, proof_type)` + `(assignment_id)` ✓ · provider_template roll-up btrees
  `(family_id)`/`(scope)`/`(status)`/`(client_id)` ✓.
- The directive's "field_key" maps to the packet's **`element_name`** (consistent within the packet);
  "surface" maps to **`placement`**. No naming conflict inside the packet.
- **Nil-UUID sentinel** in the partial-unique expression (`coalesce(client_id,'00000000-…')`) is **safe**
  — the nil UUID is not a real `client_id`. → **PASS-with-note (TMR3-DBRLS-007).**
- **No index assumes unavailable data.** **PASS.**

---

## K. Cross-schema references review

- **In-registry FKs hard** (family → provider_template → field/suitability/variant/assignment/proof) —
  correct.
- **Soft refs (no FK) to external/operational tables:** `client_id` (uuid, → `c.client`),
  `evidence_reference` (text, → `m.post_render_log`/`m.post_publish`) + `evidence_kind` discriminator,
  `proof_reference` (text). **Avoids fragile FKs into evolving `c.client`/`m.*`** (which have their own
  lifecycle and are service-role-only). **Typed** (uuid for client_id; text + kind for evidence). **PASS.**
- **FK hardening deferred appropriately** — revisit `client_id → c.client` after stable use (TMR-2 §J).

---

## L. Seed policy review

- **No seed data in the first migration** — structure-only. **PASS.**
- **No seed of** `490ad9ea…` Creatomate template · `market_update.v1` · `quote_card.v1` · any proof/
  assignment/enablement row. The single known `490ad9ea` row may be inserted **later as real captured
  data** via the write path — never a migration seed. **PASS.**

---

## M. Rollback review

- **Reverse dependency order** `DROP TABLE IF EXISTS` (proof_event → audit → assignment → variant →
  suitability → field → provider_template → family) — correct; child-before-parent honours FKs without
  `CASCADE`. Indexes/grants drop with their tables.
- **No external/operational table mutation; no provider data deletion outside TMR tables; no CCF/runtime/
  provider side effects.** **PASS.**
- **No reviewer correction required** to the rollback SQL. (At apply: migration name = permanent
  identity; `execute_sql` fallback + ledger backfill carry only if `apply_migration` is harness-denied.)

---

## N. Future RPC / read-model note

- **No RPC is created in the TMR-3 packet** — confirmed. **PASS.**
- The future read RPC / server action **must be separately reviewed** and must: be `SECURITY DEFINER` +
  **pinned `search_path = public, pg_temp`** + schema-qualified + no dynamic SQL; EXECUTE revoked from
  PUBLIC/anon/authenticated, granted only to `service_role`; **return a whitelisted, sanitized field set
  only — no raw provider payloads, no secrets, no tokens**; **not mutate state**; keep dashboard/browser
  access **mediated** (server-side only). The packet states this. **PASS** (as a forward requirement).

---

## O. Findings

| ID | Severity | Location | Description | Required action | Blocks security-auditor? |
|---|---|---|---|---|---|
| **TMR3-DBRLS-001** | APPLY-LANE VERIFY | §C / packet §C,F | `c` non-REST-exposure not statically provable (no `[api]` block in `supabase/config.toml`) | At apply: confirm `c` not in exposed schemas; a direct PostgREST read returns PGRST106 | No |
| **TMR3-DBRLS-002** | APPLY-LANE VERIFY | §E / packet §F | `GRANT USAGE ON SCHEMA c TO service_role` not in packet (table grants inert without it) | State the assumption; at apply confirm USAGE present, or add idempotent `GRANT USAGE ON SCHEMA c` | No |
| **TMR3-DBRLS-003** | APPLY-LANE VERIFY | §E | Possible `ALTER DEFAULT PRIVILEGES` in `c` granting new tables to anon/authenticated | Confirm the explicit per-table REVOKE (post-CREATE) neutralises any default grant; verify advisors clean | No |
| **TMR3-DBRLS-004** | WARNING | §H / tables 2,4,6 | `production_proven` settable in 3 status `text` columns; DB CHECK cannot enforce a real `proof_event` exists (cross-table invariant) | Enforce at the future write-RPC/wizard layer that any `production_proven` requires a `platform_publish` proof_event; carry to security-auditor + write-path review | No |
| **TMR3-DBRLS-005** | WARNING (minor) | §I / table 8 | `proof_event.proof_status` has no CHECK vocabulary (free text) | Add a CHECK vocab (e.g. passed/failed/pending) or document intentional free-form | No |
| **TMR3-DBRLS-006** | APPLY-LANE VERIFY | §G / table 7 | Audit append-only is **grant-enforced only** (no UPDATE/DELETE grant), not trigger/policy | At apply confirm no UPDATE/DELETE grant on the audit table; consider a later revoke/trigger hardening | No |
| **TMR3-DBRLS-007** | PASS (note) | §J / table 6 | Nil-UUID sentinel in partial-unique expression index | None (nil UUID is not a real client_id) | No |
| **TMR3-DBRLS-008** | PASS | packet §E (all blocks) | All 12 candidate SQL blocks labelled `DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY`; none under `supabase/migrations/` | None | No |
| **TMR3-DBRLS-009** | PASS | §D/§H | proof/capability/enablement separation preserved structurally (distinct tables; no DB enable flag) — subject to F-004 write rule | None (DB layer) | No |
| **TMR3-DBRLS-010** | PASS | §F | RLS posture: RLS-off baseline precedent-consistent; deny-all RLS SQL correct & non-breaking; no grant/RLS mismatch | None (final RLS choice → security-auditor) | No |
| **TMR3-DBRLS-011** | PASS | §L | Seed policy = none; structure-only; no template/variant/proof seeded | None | No |
| **TMR3-DBRLS-012** | PASS | §M | Rollback reverse-order `DROP IF EXISTS`; no external/operational mutation; no side effects | None | No |
| **TMR3-DBRLS-013** | PASS | §K | Cross-schema soft refs typed (client_id uuid; evidence_reference text + evidence_kind); no fragile external FK | None (FK hardening deferred) | No |
| **TMR3-DBRLS-014** | PASS | §N | No RPC in packet; future read RPC requirements stated (SECURITY DEFINER, pinned search_path, sanitized, no mutation, separate review) | None (forward requirement) | No |

**Totals:** 0 BLOCKER · 2 WARNING (004, 005) · 4 APPLY-LANE VERIFY (001, 002, 003, 006) · 8 PASS.

---

## P. Final verdict

**✅ 1. CLEAN FOR SECURITY-AUDITOR REVIEW.**

No DB/RLS **blocker** was found. The schema placement, grants/revokes, RLS posture (baseline + optional
deny-all), table/constraint/index/FK shapes, append-only audit, proof/capability/enablement separation,
seed policy, and rollback are **structurally sound and faithful to the TMR-2 final review**. The two
WARNINGs are forward recommendations (write-layer enforcement of `production_proven`; a `proof_status`
CHECK vocab) and the four APPLY-LANE VERIFY items are confirmations the **apply lane** must perform
(schema non-exposure, schema USAGE, default-privilege neutralisation, audit no-UPDATE/DELETE grant) —
**none blocks the security-auditor review**.

**Recommended next lane: TMR-3 security-auditor Review** (carry findings TMR3-DBRLS-001…006 forward;
the security-auditor should take the final RLS-off-vs-deny-all decision and the `production_proven`
write-layer integrity rule).

---

## Explicit non-claims / scope
- **Docs/register only** — this review created **no migration file**, executed **no SQL**, performed
  **no DB inspection / mutation**, and authorised none. No `execute_sql`/`apply_migration`/DB command, no
  table/schema/RLS/grant/RPC, no runtime/edge/dashboard/CCF code, no provider API call, no render/publish/
  binding/enablement/deploy, no `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/
  schema change, **no secrets.**
- The packet file (`…tmr3-migration-packet-draft.md`) was **not modified** — its hash
  (`c125f06a…1d0c`) is stable for this review.
- Items needing live truth are explicitly marked **APPLY-LANE VERIFY** — **no live DB inspection** was
  done or implied.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only.

## Cross-references
- Reviewed packet: `docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md` (v4.35).
- TMR-2 final review (authoritative decisions): `docs/briefs/template-metadata-registry-tmr2-final-schema-rls-review.md` (v4.34).
- TMR-1 model: `docs/briefs/template-metadata-registry-v1-design.md` (v4.32).
- Proven `c.*` non-exposed service-role posture: Control Tower P1 (register v4.13).
- Standing DB gotchas applied: PGRST106, revoke-from-anon/authenticated, migration-name identity (CLAUDE.md).
- Register: v4.36 (this review).
