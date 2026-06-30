# TMR-3 — External Review on Final SQL (review-only)

## A. Review status

- This is the **external review on the TMR-3 candidate SQL** — the third TMR-3 review gate, after
  db-rls-auditor (v4.36) and security-auditor (v4.37).
- **reviewed_packet_hash = `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c`** (matched expected).
- **reviewed_db_rls_review_hash = `17b921edba1308f26896c1339ee65de6bdc178c3fe309679e68327ee4a82fca0`** (matched expected).
- **reviewed_security_review_hash = `8b493320d6bd5abaf978d0b85caba3599c9fcb7899468e16e61ea4b180ecefb7`.**
- An **external cross-model review WAS performed** via ICE's documented `ask_chatgpt_review` bridge
  (see §C) — **not** a fabricated tool result. The supporting structural analysis (§D–§K) is static /
  repository-only.
- **No DB inspection was performed. No migration was created. No SQL was executed. No DB mutation was
  authorised.**
- **Verdict (see §N): `CLEAN FOR PK APPLY HARD STOP`.**
- The three reviewed-input files are **not modified** by this review (their hashes must stay stable).
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 49571a80e639ce137931118a897bea5a2ff96728`;
  register **v4.37**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 canonical object model |
| `template-metadata-registry-tmr2-final-schema-rls-review.md` | TMR-2 FINAL design decisions |
| `template-metadata-registry-tmr3-migration-packet-draft.md` | **reviewed input** (`c125f06a…`) |
| `template-metadata-registry-tmr3-db-rls-auditor-review.md` | **reviewed input** (`17b921ed…`) — findings carried |
| `template-metadata-registry-tmr3-security-auditor-review.md` | **reviewed input** (`8b493320…`) — findings carried |
| `tmr-dashboard-readonly-view-design-brief.md` | read-only `/create/templates` consumer |
| `creative-intake-template-wizard-flow-v2.md` | template-led wizard (write/capture) consumer |
| register **v4.37** context | the security-auditor CLEAN verdict + carries |

**TMR-1 separation confirmed preserved** (distinct tables; no DB enable flag): family ≠ provider
template ≠ field inventory ≠ output contract ≠ platform suitability ≠ variant candidate ≠ client/brand
assignment ≠ proof event ≠ production enablement; `inventory_captured ≠ renderable ≠ platform_safe ≠
client_enabled ≠ production_proven`.

---

## C. External review method

- **Tool used:** ICE's documented external-review bridge **`ask_chatgpt_review`** (the cross-model
  adversary mandated by CLAUDE.md — gpt-4o-mini backend). This is the project's canonical external
  review mechanism; a **true external (cross-model) review was available and used.**
- **Input passed to the reviewer:** a full prose description of the 8-table candidate SQL (schema
  placement, PK/FK strategy, CHECK vocabularies, grants/revokes, RLS baseline + optional deny-all,
  rollback, no-seed, no-RPC), the two prior gate verdicts, and all five known carries, with the
  reviewed_input_hash.
- **reviewed_input_hash:** `c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c` (the packet
  hash — the review is valid only for this exact packet; any packet change invalidates it).
- **review_id:** `3d449625-02d0-4c67-aca8-802debbc57ab` · idempotent: false (first review this UTC day
  on this input).
- **Result:** **`decision: proceed` · `verdict: agree` · `risk_level: medium` · `confidence: high` ·
  pushback_points: none · requires_pk_escalation: false · escalate: false.** The bridge did **not**
  auto-escalate (no disagree / high-risk / low-confidence / refusal / timeout). Reviewer reason:
  "Reviewer agrees; safe to proceed."
- **Triage classification (CLAUDE.md rule 5):** the verdict is **clean (agree)** — no `concrete_defect`,
  `missing_evidence`, `structural_DDL_DML_escalation`, `policy_decision`, `scope_design_concern`, or
  `runtime_verification_required` was raised. (The DDL is design-only and **not applied**, so the
  structural-DDL escalation path is the **PK apply hard-stop** that already gates this lane.)
- **Limitations:** the cross-model reviewer assessed the **described** SQL + posture, not a live DB; live
  truths remain **APPLY-LANE VERIFY** (§K). No DB inspection was performed.

---

## D. Candidate SQL structural review

- **CREATE TABLE order:** dependency-safe (family → provider_template → field/suitability/variant/
  assignment → proof_event; proof_event references both provider_template and client_assignment, both
  created earlier). **PASS.**
- **Primary keys:** surrogate `uuid default gen_random_uuid()` (PG13+ core; no `pgcrypto`). **PASS.**
- **FKs:** in-registry hard (`on delete cascade` for child inventory; `set null` for optional parents);
  cross-schema **soft** (`client_id`, `evidence_reference`, `proof_reference` — no FK). **PASS.**
- **Timestamps:** `created_at/updated_at timestamptz not null default now()` (audit/proof carry the
  relevant subset). **PASS.**
- **Comments:** `COMMENT ON TABLE/COLUMN` present, carrying the anti-overclaim semantics. **PASS.**
- **CHECK constraints:** present on every status/enum field except `proof_status` (§G). **PASS (one note).**
- **Indexes:** business-key UNIQUEs inline; the **partial-unique expression index** on client_assignment
  (`coalesce(client_id, nil-uuid)`) is valid Postgres and handles the nullable client_id correctly;
  roll-up btrees + time-desc proof/audit indexes present. **PASS.**
- **Grant/revoke blocks:** `REVOKE ALL … FROM PUBLIC, anon, authenticated` per table; `GRANT … TO
  service_role`; audit INSERT+SELECT only. **PASS** (schema USAGE is an apply-lane verify, §K).
- **Optional deny-all RLS block:** `ALTER TABLE … ENABLE ROW LEVEL SECURITY` with **no policies** —
  correct deny-by-default; service_role bypasses. **PASS.**
- **Rollback block:** `DROP TABLE IF EXISTS` in reverse dependency order. **PASS.**
- **No SQL correctness issue found.** The cross-model reviewer concurred (§C).

---

## E. Table-by-table review

| # | Table | Structural verdict | Key risk | Pre-apply correction | Blocks PK apply? |
|---|---|---|---|---|---|
| 1 | `creative_template_family` | PASS | none | none | No |
| 2 | `creative_provider_template` | PASS | `status='production_proven'` settable (write-layer, §I) | none (write-RPC rule) | No |
| 3 | `creative_provider_template_field` | PASS | jsonb `constraints` unbounded (§H) | none (write-RPC sanitises) | No |
| 4 | `creative_template_platform_suitability` | PASS | `suitability_status='production_proven'` settable (§I) | none (write-RPC rule) | No |
| 5 | `creative_template_variant_candidate` | PASS | jsonb `missing_fields` unbounded (§H) | none | No |
| 6 | `creative_template_client_assignment` | PASS | `assignment_status='production_proven'` settable (§I); nil-uuid sentinel | none (sentinel safe) | No |
| 7 | `creative_template_inventory_audit` | PASS | append-only is grant-only (§I/§K) | none (apply-lane verify) | No |
| 8 | `creative_template_proof_event` | PASS | `proof_status` no CHECK (§G); fabrication risk (§I) | optional CHECK (recommend) | No |

No table blocks PK apply approval. Risks are all write-layer or apply-lane (carried).

---

## F. Grants / RLS review

- **REVOKE from PUBLIC, anon, authenticated** — present and complete (correctly names anon+authenticated).
- **service_role grants** — correct (audit INSERT+SELECT only). **Schema `USAGE`** is an apply-lane
  verify (§K). **Default-privilege leak** neutralised by the explicit REVOKE (apply-lane verify, §K).
- **Baseline RLS-off** posture is precedent-consistent (Control Tower `c.*`, v4.13). **Optional deny-all
  RLS** SQL is correct and non-breaking.

**External reviewer position on RLS:**
> **Option 2 — RECOMMEND enabling deny-all RLS before apply.**

**Rationale:** the cross-model reviewer (medium risk) and the security-auditor both favour defense-in-
depth. The security linchpin — non-exposure of `c` — is **not statically provable** (§K); deny-all RLS
is **cheap, non-breaking** (`service_role` bypasses), and protects against a future *accidental* exposure
of `c`. The packet **already contains** the correctly-formed deny-all SQL, so adopting it is a **posture
choice for PK**, not a packet revision. **This is a PK DECISION (TMR3-EXT-003), not a blocker.**

---

## G. CHECK / status vocabulary review

- **`text + CHECK`** strategy confirmed appropriate (evolvable; no enum-type churn). Lifecycle (14),
  inventory_status (9), suitability (7), fit_status (7), assignment scope (5)/status (7), capture_method
  (5), proof_type (4) are all CHECK-bounded and map honestly to the TMR lifecycle, with
  `unknown`/`missing`/`blocked` represented. **PASS.**
- **`proof_event.proof_status` has no CHECK** (free `text`).

**External reviewer position on `proof_status`:**
> **Option 2 — `proof_status` SHOULD receive a CHECK vocabulary before apply** (e.g.
> `('passed','failed','pending','superseded')`), for consistency with the rest of the schema.

**Rationale:** low-risk but cheap to add at migration finalisation; improves data quality and matches the
schema's `text + CHECK` discipline. **Free-form remains acceptable** if PK prefers (the field is a status
label on an evidence record, not an enablement gate). **This is a PK DECISION / recommended pre-apply
edit (TMR3-EXT-004), not a blocker.** (Adding it would change the packet, so if adopted, the packet is
re-stamped and this gate's hash note is updated at the apply-lane.)

---

## H. JSONB / raw payload / secrets review

- The `jsonb` columns (`brand_constraints`, `constraints`, `missing_fields`, `changed_fields`) are
  **necessary** (variable-shape metadata) and **safe by design intent** (sanitized metadata only), but
  **unbounded by the schema** — the DB cannot prevent a careless writer dumping raw/sensitive content.
- The candidate SQL stores **no raw provider payloads** and **no secret columns**; sanitization is
  **deferred to the future write-RPC** (correct layering).
- **Position:** **documentation + the future write-RPC validation are sufficient** — **no SQL-level
  constraint is required for apply** (a CHECK cannot meaningfully bound free JSON). The write-RPC MUST
  validate/bound/sanitize jsonb inputs (carry **TMR3-EXT-007**). Not a blocker.

---

## I. Audit and proof integrity review

- `inventory_hash`, mandatory `no_secret_assertion` / `no_mutation_assertion`, sanitized
  `source_reference`, audit **append-only by grant**, proof events **separate** from capability —
  all present and correct.
- **production_proven lifecycle enforcement** and **proof-event anti-fabrication** (validate
  `evidence_reference` → a real `m.post_render_log` / `m.post_publish` row) are **cross-table invariants
  the DDL cannot enforce**; they are **binding requirements on the future write-RPC** (carries
  **TMR3-EXT-005, TMR3-EXT-006**).
- **Position:** **future write-RPC enforcement is sufficient; the migration packet needs NO additional DB
  constraints** for apply. A DB-level trigger to enforce these is **possible later hardening**, not
  required for v0. The external reviewer recommends **no extra DB guard** beyond the documented write-RPC
  obligations. Proof/capability separation is preserved structurally.

---

## J. Seed and rollback review

- **No seed data** in the first migration — confirmed. **No seed of** `490ad9ea…` · `market_update.v1` ·
  `quote_card.v1` · any proof/assignment row. **PASS.**
- **Rollback** drops **only the 8 TMR tables** in reverse dependency order; **does not touch external
  operational tables** (`c.client`, `m.*`); deletes no provider data outside TMR. **PASS.**

---

## K. Apply-lane verification checklist (carried — to perform AT apply, not now)

1. Confirm `c` schema is **non-REST-exposed** (a direct PostgREST read of a TMR table returns **PGRST106**).
2. Confirm or add **`GRANT USAGE ON SCHEMA c TO service_role`** (idempotent).
3. Confirm **default privileges** in `c` do not leak access to anon/authenticated (the explicit per-table
   REVOKE neutralises; verify advisors clean).
4. Confirm the **audit table has no UPDATE/DELETE grant** (append-only by grant).
5. **Confirm the packet hash** (`c125f06a…`) immediately before apply; if the packet changed, **re-run
   the affected review gates**.
6. **Re-stamp the migration name/timestamp** to the real apply date (migration name = permanent identity).
7. **Verify the final migration SQL matches the reviewed packet** (or re-review the delta) before
   `apply_migration`.

---

## L. PK decision checklist (before apply)

1. **RLS posture** — ratify **deny-all RLS** (external + security-auditor recommendation) vs RLS-off
   baseline. *(TMR3-EXT-003)*
2. **`proof_status` CHECK** — adopt a CHECK vocab (recommended) vs accept free-form. *(TMR3-EXT-004)* If
   adopted, the packet is re-stamped (small SQL addition) before apply.
3. **Acknowledge the future write-RPC binding obligations** (conditions on the *future* write lane, not
   apply blockers):
   - `production_proven` transitions require a real `platform_publish` proof_event *(TMR3-EXT-005)*;
   - proof-event creation is restricted and `evidence_reference` is validated against real `m.*` evidence
     (anti-fabrication) *(TMR3-EXT-006)*;
   - jsonb inputs are validated/bounded/sanitized *(TMR3-EXT-007)*.
4. **Confirm no seed data** in the first migration. *(TMR3-EXT-012)*
5. **Authorise the apply** (`apply_migration`, or the `execute_sql` fallback + ledger backfill if
   harness-denied) — the **PK apply HARD STOP**.

---

## M. Findings

| ID | Severity | Source | Description | Required action | Blocks PK apply? |
|---|---|---|---|---|---|
| **TMR3-EXT-001** | PASS | §C | External cross-model review (`ask_chatgpt_review`) = agree/proceed, risk medium, confidence high, no pushback, no PK escalation (`review_id 3d449625…`) | None | No |
| **TMR3-EXT-002** | PASS | §D | Candidate SQL structurally correct (order/PK/FK/CHECK/index/grant/rollback) | None | No |
| **TMR3-EXT-003** | PK DECISION | §F | RLS posture: recommend **deny-all RLS** (packet SQL present) | PK ratifies deny-all vs RLS-off | No |
| **TMR3-EXT-004** | PK DECISION / recommend | §G | `proof_event.proof_status` no CHECK; recommend adding vocab | PK adopts CHECK (re-stamp) or accepts free-form | No |
| **TMR3-EXT-005** | WARNING (write-layer; carry SEC-003/DBRLS-004) | §I | `production_proven` settable; cross-table invariant | Future write-RPC enforces proof_event requirement | No |
| **TMR3-EXT-006** | WARNING (write-layer; carry SEC-010) | §I | Proof-event fabrication risk | Future write-RPC validates `evidence_reference` → real `m.*` | No |
| **TMR3-EXT-007** | WARNING (write-layer; carry SEC-002) | §H | jsonb columns unbounded | Future write-RPC sanitises jsonb | No |
| **TMR3-EXT-008** | APPLY-LANE VERIFY (carry SEC-006/DBRLS-001) | §K | `c` non-REST-exposure not statically provable | Verify PGRST106 at apply | No |
| **TMR3-EXT-009** | APPLY-LANE VERIFY (carry SEC-007/DBRLS-002) | §K | Schema USAGE for service_role | Confirm/add at apply | No |
| **TMR3-EXT-010** | APPLY-LANE VERIFY (carry SEC-008/DBRLS-003) | §K | Default-privilege leak | Confirm REVOKE neutralises | No |
| **TMR3-EXT-011** | APPLY-LANE VERIFY (carry SEC-009/DBRLS-006) | §K | Audit append-only grant | Confirm no UPDATE/DELETE grant | No |
| **TMR3-EXT-012** | PASS | §J | No seed; rollback TMR-only reverse-order | None | No |
| **TMR3-EXT-013** | PASS | §A/§D | All 12 SQL blocks DESIGN-ONLY labelled; none under `supabase/migrations/`; packet hash matches | None | No |
| **TMR3-EXT-014** | APPLY-LANE VERIFY | §K | Re-stamp migration name; verify final SQL == reviewed packet (hash) before apply | Apply-lane | No |

**Totals:** 0 BLOCKER · 3 WARNING (005, 006, 007) · 4 APPLY-LANE VERIFY (008–011) + 1 (014) · 2 PK DECISION (003, 004) · 4 PASS (001, 002, 012, 013).

---

## N. Final verdict

**✅ 1. CLEAN FOR PK APPLY HARD STOP.**

No external-review **blocker** was found. The cross-model reviewer **agreed (proceed, no pushback, no
escalation)**, concurring with the db-rls-auditor and security-auditor gates. The candidate SQL is
**structurally correct and faithful to the TMR-2 final design**; the WARNINGs are **future-write-RPC
controls**, the APPLY-LANE VERIFY items are confirmations the apply lane performs, and the two PK
DECISIONS (deny-all RLS — recommended; `proof_status` CHECK — recommended) are posture choices that do
**not** block apply approval. **The packet can go to PK for explicit apply approval**, with the §L PK
decisions and §K apply-lane verifications.

**Recommended next lane: PK apply decision / TMR-3 apply hard-stop packet** — PK ratifies §L, then runs
or authorises the apply (`apply_migration`, or `execute_sql` fallback + ledger backfill if harness-
denied). **Still no apply, no migration file** until PK explicitly authorises. If PK adopts the
`proof_status` CHECK or any SQL change, **re-stamp + re-confirm the hash / re-run the affected gate**
before apply.

---

## Explicit non-claims / scope
- **Docs/register only** — created **no migration file**, executed **no SQL**, performed **no DB
  inspection/mutation**, authorised none. No `execute_sql`/`apply_migration`/DB command, no table/schema/
  RLS/grant/RPC, no runtime/edge/dashboard/CCF code, no provider API call, no render/publish/binding/
  enablement/deploy, no `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema
  change, **no secrets.**
- The external review **was a genuine cross-model review** (`ask_chatgpt_review`, review_id
  `3d449625…`), not a fabricated result; the supporting structural analysis is static/repository-only.
- The **packet** (`c125f06a…`), **db-rls review** (`17b921ed…`), and **security review** (`8b493320…`)
  files were **not modified** — their hashes are stable.
- Items needing live truth are **APPLY-LANE VERIFY** — no live DB inspection done or implied.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only.

## Cross-references
- Reviewed packet: `docs/briefs/template-metadata-registry-tmr3-migration-packet-draft.md` (v4.35, `c125f06a…`).
- db-rls-auditor review: `…-tmr3-db-rls-auditor-review.md` (v4.36, `17b921ed…`).
- security-auditor review: `…-tmr3-security-auditor-review.md` (v4.37, `8b493320…`).
- TMR-2 final review: `…-tmr2-final-schema-rls-review.md` (v4.34); TMR-1 model: `…-v1-design.md` (v4.32).
- External review bridge: `ask_chatgpt_review` (CLAUDE.md external-review gate); review_id `3d449625-02d0-4c67-aca8-802debbc57ab`.
- Register: v4.38 (this review).
