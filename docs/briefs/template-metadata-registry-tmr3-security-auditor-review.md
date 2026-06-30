# TMR-3 — security-auditor Review (static / repository-only)

## A. Review status

- This is the **security-auditor review** of the TMR-3 migration packet draft, building on the
  db-rls-auditor review (v4.36, `CLEAN FOR SECURITY-AUDITOR REVIEW`).
- **reviewed_packet_hash = `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c`**
  (matches the expected hash from the db-rls-auditor review — packet unchanged).
- **reviewed_db_rls_review_hash = `17b921edba1308f26896c1339ee65de6bdc178c3fe309679e68327ee4a82fca0`.**
- This review is **static / repository-only**. **No DB inspection was performed. No migration was
  created. No SQL was executed. No DB mutation was authorised.**
- **Verdict (see §O): `CLEAN FOR EXTERNAL REVIEW`** — 0 security blocker.
- The packet and db-rls review files are **not modified** by this review (their hashes must stay stable).
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 0edd302f25a05a1c8b2e10dfef916de0af3f3be5`;
  register **v4.36**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 canonical object model |
| `template-metadata-registry-tmr2-final-schema-rls-review.md` | TMR-2 FINAL security-relevant decisions |
| `template-metadata-registry-tmr3-migration-packet-draft.md` | **reviewed input** (`c125f06a…`) |
| `template-metadata-registry-tmr3-db-rls-auditor-review.md` | **reviewed input** (`17b921ed…`) — findings carried |
| `tmr-dashboard-readonly-view-design-brief.md` | read-only `/create/templates` consumer |
| `creative-intake-template-wizard-flow-v2.md` | template-led wizard (write/capture) consumer |
| register **v4.36** context | the db-rls CLEAN verdict + carries |

**TMR-1 separation confirmed preserved** (distinct tables; no DB enable flag): family ≠ provider
template ≠ field inventory ≠ output contract ≠ platform suitability ≠ variant candidate ≠ client/brand
assignment ≠ proof event ≠ production enablement; `inventory_captured ≠ renderable ≠ platform_safe ≠
client_enabled ≠ production_proven`.

---

## C. Threat model summary

Threats considered for TMR: **provider secret leakage** · **raw provider payload leakage** · **accidental
production enablement** · **candidate mistaken as proof** · **platform suitability mistaken as production
proof** · **client assignment mistaken as enablement** · **browser-direct data access** · **unsafe future
SECURITY DEFINER read/write RPCs** · **audit/proof tampering or fabrication** · **rollback/seed creating
unsafe state** · **cross-schema reference confusion / privilege leak** · **operator-UI misinterpretation**.
The dominant residual risks are **(a) write-layer integrity** (a future RPC could let an operator set
`production_proven` or fabricate a proof_event without real evidence) and **(b)** the **unverifiable
non-exposure** of schema `c` — both addressed below; **neither exists today** (no runtime/worker consumer
reads these tables, and no write path exists).

---

## D. Secrets and raw payload review

The packet **avoids** all of: API keys · bearer tokens · provider credentials · raw Creatomate/HeyGen
payloads · raw provider responses · full render/publish payloads. Confirmed:
- **`inventory_hash`** references a sanitized capture **instead of** storing the raw provider payload.
- **`inventory_source` / `source_reference`** record the sanitized capture method/source, not the payload.
- **`no_secret_assertion boolean not null`** and **`no_mutation_assertion boolean not null`** are
  mandatory on every audit row.
- `provider_template_id`, `provider_project_reference` are **safe identifiers / sanitized references**;
  `default_value_safe` is "only if non-sensitive"; `style_summary` is sanitized.
- **No column** is designed to hold a secret, token, credential, or full unsanitized payload.

**Residual (TMR3-SEC-002, WARNING — write-layer):** the **`jsonb` columns** (`brand_constraints`,
`constraints`, `missing_fields`, `changed_fields`) are **unbounded by the schema** — a careless writer
*could* dump sensitive/raw content into them. The DB cannot prevent this; the **future write-RPC/wizard
must validate, bound, and sanitize** jsonb inputs (and the `no_secret_assertion` attestation makes the
operator responsibility explicit). **Not a packet blocker** (no writer exists; no consumer reads them).

---

## E. Data minimisation review

- Each table stores **only the metadata TMR needs** (identity, classification, lifecycle, evidence
  references) — confirmed against TMR-1 §2–§10.
- Provider fields are **summarized** (element name/type/kind/flags), not raw content.
- Default values are **summaries** (`default_value_safe`/`style_summary`), not raw sensitive values.
- **Evidence references use IDs/hashes** (`evidence_reference`, `inventory_hash`, `proof_reference`),
  not embedded raw evidence.
- **Cross-schema references are soft and typed** (`client_id uuid`, `evidence_reference text` +
  `evidence_kind` discriminator) — no embedded operational data.
- **No seed data** ⇒ no accidental disclosure / no false proof at creation.
- The only minimisation gap is the jsonb-column vector (TMR3-SEC-002) — a write-layer control.

---

## F. Capability / proof / enablement separation review

Structurally preserved (distinct tables; no DB enable flag; candidate ≠ binding; suitability ≠ proof;
assignment ≠ enablement; proof_event ≠ publishing permission; production_proven intended to require a
real `platform_publish` proof_event; no seed creates proof/enablement).

**db-rls warning carried — `production_proven` text-settable in 3 status columns**
(`provider_template.status`, `platform_suitability.suitability_status`, `client_assignment.assignment_status`).
**Security position: ACCEPTABLE AS A CARRY to the future write-RPC/wizard enforcement — NOT a
packet-revision blocker, NOT a DB-constraint redesign.** Rationale:
- These tables have **no runtime/worker consumer** today — nothing in production reads them to gate
  publishing; the present security impact is **zero**.
- The values are **legitimate lifecycle states**; a DB `CHECK` **cannot** cheaply enforce a cross-table
  invariant ("this status requires a `platform_publish` proof_event for the same template/platform").
- The **correct enforcement point is the future write-RPC/wizard** (separately reviewed), which **MUST**
  enforce: *a `production_proven` transition in any of the 3 columns requires a real, evidence-backed
  `platform_publish` proof_event*. **Recorded as a binding requirement (TMR3-SEC-003) on that future
  review** — not droppable.

---

## G. Status vocabulary safety review

- **`text + CHECK`** strategy: **safe and evolvable** (no enum-type rewrite churn). Statuses are not
  over-permissive (every status field except `proof_status` is CHECK-bounded). **`unknown`/`missing`/
  `not_suitable`/`blocked`** states exist (supports the honest "no optimistic data" dashboard).
- **`production_proven` naming**: risky **only** if a consumer treats it as gospel — mitigated by §F
  (write-layer enforcement + no current consumer). Acceptable.
- **db-rls warning carried — `proof_event.proof_status` has no CHECK** (free `text`). **Security
  position: free-form `proof_status` is ACCEPTABLE for the draft (low-risk status label on an evidence
  record, not an enablement gate), BUT we RECOMMEND adding a CHECK vocab** (e.g.
  `('passed','failed','pending','superseded')`) **at migration finalisation** for consistency with the
  rest of the schema. **Not a packet-revision blocker (TMR3-SEC-004)** — the external reviewer / apply
  lane can fold it in.

---

## H. Audit and tamper-resistance review

- **Append-only audit** (`creative_template_inventory_audit`): enforced by **grant** (INSERT+SELECT only,
  no UPDATE/DELETE) — documented; carry **TMR3-SEC-009 (apply-lane verify)** that no UPDATE/DELETE grant
  leaks. A trigger-enforced append-only is a documented later hardening (acceptable for v0).
- **Proof events separate** from capability/assignment; `no_secret_assertion`/`no_mutation_assertion`
  mandatory; `inventory_hash` + sanitized `source_reference`; `captured_by`/`recorded_by` present.
- **service_role-only access is sufficient at the DB layer** (no anon/authenticated reach).
- **Tamper/fabrication risk is at the write layer (TMR3-SEC-010, WARNING):** the future write-RPC **must
  restrict who can create proof events** and **validate `evidence_reference` points to a real
  `m.post_render_log`/`m.post_publish` row** before allowing any `production_proven` transition —
  otherwise an operator could fabricate a proof_event. Carried to the write-RPC review (binding).

---

## I. Access-control security review

- **No direct anon/authenticated table access** (REVOKE names both); **service-role-only**; **no
  browser-direct reads**; future reads only via a **reviewed SECURITY DEFINER read RPC / server action**
  (none in this packet).

**RLS posture — security-auditor's required position (RLS-off vs deny-all):**
> **Recommendation: Option 2 — RECOMMEND deny-all RLS hardening as the selected posture** (RLS ON, no
> permissive policies), carried into external review / PK ratification.

**Rationale:** the db-rls-auditor correctly found RLS-off precedent-consistent (Control Tower `c.*`,
v4.13) and acceptable *given* non-exposure + locked grants. **However**, the **non-exposure of `c` is NOT
statically provable** (no `[api]` block in `supabase/config.toml`; APPLY-LANE VERIFY — TMR3-SEC-006), so
the security linchpin is **unverifiable until apply**. **Deny-all RLS is cheap, non-breaking
(`service_role` bypasses RLS), and provides defense-in-depth** against a future *accidental* exposure of
`c` (e.g., someone later adds `c` to the exposed-schema list). For a brand-new governance table family
holding provider/client metadata, **belt-and-braces is the safer default**. **This requires NO packet
revision** — the packet already includes the correctly-formed optional deny-all SQL (packet §G); selecting
it is a **posture decision** the external reviewer + PK ratify, not a text change. Recorded as
**TMR3-SEC-005 (WARNING/recommendation)** — not a blocker.

- **Future read RPC**: must pin `search_path`, be read-only, return sanitized summaries (§J).
- **Future write RPC**: must enforce lifecycle transitions + proof validation (§F/§H/§J).

---

## J. Future RPC / write-layer requirements (binding forward controls)

These are **required** of the later (separately-reviewed) RPC/server-action slices — none built here:
- **SECURITY DEFINER functions MUST pin `search_path = public, pg_temp`**, be schema-qualified, no
  dynamic SQL; EXECUTE revoked from PUBLIC/anon/authenticated, granted only to `service_role`.
- **Read functions MUST be read-only** (STABLE; no mutation) and return **sanitized summaries only** —
  evidence IDs/hashes OK; **no provider secrets, no raw payloads, no tokens, no raw `render_spec`**.
- **Write functions MUST enforce lifecycle transitions** (a status cannot jump past an un-evidenced gate).
- **`production_proven` MUST NOT be directly operator-settable** without proof-chain validation (a real
  `platform_publish` proof_event referencing real `m.*` evidence) — see §F/§H.
- **Proof-event insertion MUST be restricted** and **evidence-validated** (anti-fabrication, §H).
- **No mutation through read endpoints; no secret/raw-payload exposure through any endpoint.**
- **Browser/dashboard access stays mediated** (server-side only).

---

## K. Seed and rollback security review

- **No seed data in the first migration** — structure-only. **No seed of** `490ad9ea…` Creatomate
  template · `market_update.v1` · `quote_card.v1` · any proof/assignment/enablement row. **PASS.**
- **Rollback** removes **only the 8 TMR tables in reverse dependency order** (`DROP IF EXISTS`); it
  **does not touch external/operational tables** (`c.client`, `m.*`) and **deletes no provider data
  outside TMR**. **PASS.**

---

## L. Operator / dashboard safety review

The read-only `/create/templates` design (v4.33) supports honest presentation: **no seeded optimistic
data** (explicit empty state), **`unknown`/`not_captured` states shown**, **blockers visible**,
**candidate never shown as proven**, **suitability never shown as publish proof**, **assignment never
shown as enablement**, **proof/provenance summaries without raw payloads**. **PASS.**
- **UI wording note (carries §F):** a `production_proven` badge must be reserved for **real evidence**
  (the view brief already states proven is reserved for real render+publish evidence). The same
  write-layer rule (§F) backs the UI claim.

---

## M. External review readiness

The packet is **clean enough for external review**. No packet revision is required before external
review. The external reviewer should focus on:
- **SQL correctness** of the candidate DDL (types, FK actions, the partial-unique expression index);
- **CHECK vocabulary completeness** — including the **`proof_status` CHECK decision** (§G / TMR3-SEC-004);
- **grant/revoke completeness** — including **schema `USAGE`** (TMR3-SEC-007) and **default-privilege
  neutralisation** (TMR3-SEC-008);
- **RLS baseline vs deny-all** — security-auditor **recommends deny-all** (§I / TMR3-SEC-005); the
  reviewer + PK ratify;
- **append-only audit enforcement** (no UPDATE/DELETE grant — TMR3-SEC-009);
- **rollback correctness**;
- the **PK security decisions** required before apply: (1) the **RLS posture**, (2) acknowledgement that
  **`production_proven` enforcement + proof-event anti-fabrication are binding requirements on the future
  write-RPC** (not apply blockers).

---

## N. Findings

| ID | Severity | Source | Description | Required action | Blocks external review? |
|---|---|---|---|---|---|
| **TMR3-SEC-001** | PASS | §D | No secrets/keys/tokens/credentials/raw provider payloads in any column; `inventory_hash` + sanitized refs + no_secret/no_mutation assertions | None | No |
| **TMR3-SEC-002** | WARNING (write-layer) | §D/§E | `jsonb` columns unbounded by schema — could hold sensitive/raw content if a writer dumps payloads | Future write-RPC must validate/bound/sanitize jsonb inputs | No |
| **TMR3-SEC-003** | WARNING (write-layer; carries DBRLS-004) | §F | `production_proven` text-settable in 3 status columns; cross-table invariant not DB-enforceable | **Binding requirement on the future write-RPC/wizard:** `production_proven` requires a real `platform_publish` proof_event | No |
| **TMR3-SEC-004** | WARNING/recommend (carries DBRLS-005) | §G | `proof_event.proof_status` has no CHECK vocab | Recommend adding a CHECK vocab at migration finalisation; free-form acceptable for the draft | No |
| **TMR3-SEC-005** | WARNING/recommend (RLS decision) | §I | RLS posture: security-auditor recommends **deny-all RLS** hardening (packet SQL already present) | Select deny-all at external review / PK ratification (no packet revision needed) | No |
| **TMR3-SEC-006** | APPLY-LANE VERIFY (carries DBRLS-001) | §I | `c` non-REST-exposure not statically provable | Confirm at apply (direct read → PGRST106) | No |
| **TMR3-SEC-007** | APPLY-LANE VERIFY (carries DBRLS-002) | §I | `GRANT USAGE ON SCHEMA c TO service_role` absent from packet | Confirm/add idempotent USAGE at apply | No |
| **TMR3-SEC-008** | APPLY-LANE VERIFY (carries DBRLS-003) | §E/§I | Possible `ALTER DEFAULT PRIVILEGES` leak in `c` | Confirm explicit per-table REVOKE neutralises; advisors clean | No |
| **TMR3-SEC-009** | APPLY-LANE VERIFY (carries DBRLS-006) | §H | Audit append-only grant-enforced only | Confirm no UPDATE/DELETE grant on audit table at apply | No |
| **TMR3-SEC-010** | WARNING (write-layer) | §H | Proof-event fabrication risk | Future write-RPC must restrict proof-event creation + validate `evidence_reference` → real `m.*` row | No |
| **TMR3-SEC-011** | PASS | §D / packet §E | All 12 candidate SQL blocks `DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY`; none under `supabase/migrations/`; packet hash matches | None | No |
| **TMR3-SEC-012** | PASS | §K | Seed policy none; rollback TMR-only reverse-order; no external mutation | None | No |
| **TMR3-SEC-013** | PASS | §J | Future read/write RPC security requirements stated as binding forward controls | Enforce at the RPC review | No |
| **TMR3-SEC-014** | PASS | §L | Operator/dashboard safety (no-seed/unknown/blockers/candidate≠proven/suitability≠proof/assignment≠enablement/sanitized provenance) | None | No |

**Totals:** 0 BLOCKER · 5 WARNING (002, 003, 004, 005, 010) · 4 APPLY-LANE VERIFY (006–009) · 5 PASS.

---

## O. Final verdict

**✅ 1. CLEAN FOR EXTERNAL REVIEW.**

No security **blocker** was found. The packet's **no-secrets / sanitized-metadata** posture is strong
(`inventory_hash`, sanitized refs, mandatory no-secret/no-mutation assertions, no payload/credential
columns); the **capability/proof/enablement separation** holds structurally; **service-role-only,
non-browser-readable** access is correct; **no seed**; **rollback is TMR-only**. The five WARNINGs are
**write-layer / forward controls** (jsonb sanitisation; `production_proven` and proof-event enforcement
on the future write-RPC; `proof_status` CHECK recommendation) and the **RLS recommendation** (security-
auditor recommends **deny-all** hardening) — **none requires packet revision**. The four APPLY-LANE
VERIFY items carry from the db-rls review and are confirmed at apply.

**Recommended next lane: TMR-3 external review on the final SQL** (record `reviewed_input_hash`). The
external reviewer + PK should ratify the **RLS posture (deny-all recommended)** and acknowledge the
**write-RPC binding requirements** (production_proven proof-chain validation; proof-event anti-fabrication;
jsonb sanitisation) as conditions on the *future* write lane — not apply blockers.

---

## Explicit non-claims / scope
- **Docs/register only** — created **no migration file**, executed **no SQL**, performed **no DB
  inspection/mutation**, authorised none. No `execute_sql`/`apply_migration`/DB command, no table/schema/
  RLS/grant/RPC, no runtime/edge/dashboard/CCF code, no provider API call, no render/publish/binding/
  enablement/deploy, no `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema
  change, **no secrets.**
- The **packet** (`c125f06a…`) and the **db-rls review** (`17b921ed…`) files were **not modified** — their
  hashes are stable.
- Items needing live truth are **APPLY-LANE VERIFY** — no live DB inspection done or implied.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only.

## Cross-references
- Reviewed packet: `docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md` (v4.35, `c125f06a…`).
- db-rls-auditor review: `docs/briefs/template-metadata-registry-tmr3-db-rls-auditor-review.md` (v4.36, `17b921ed…`).
- TMR-2 final review: `docs/briefs/template-metadata-registry-tmr2-final-schema-rls-review.md` (v4.34).
- TMR-1 model: `docs/briefs/template-metadata-registry-v1-design.md` (v4.32).
- Proven `c.*` non-exposed service-role posture: Control Tower P1 (register v4.13).
- Register: v4.37 (this review).
