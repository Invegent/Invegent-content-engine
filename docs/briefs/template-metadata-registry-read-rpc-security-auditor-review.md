# TMR Read RPC — security-auditor Review (static / repository-only)

## A. Review status

- This is the **security-auditor review** of the TMR Read RPC Implementation Packet Draft, building on
  the db-rls-auditor review (v4.43, `CLEAN FOR SECURITY-AUDITOR REVIEW`).
- **reviewed_input_hash = `6f961fdd67bba786de2641a33b680490b3657dbbb4b8b1ad600354dc935d0468`** (the
  implementation packet — matched expected; not modified).
- **reviewed_db_rls_review_hash = `05d0631b05ee84f1bad585e3438167a176cddec86a5501c5434e65077751372d`.**
- This review is **static / repository-only.** **No live DB inspection was performed. No migration was
  created. No RPC was created. No SQL was executed. No DB mutation was authorised.**
- **Verdict (see §P): `CLEAN FOR EXTERNAL REVIEW`** — 0 security blocker.
- The packet, db-rls review, and migration files are **not modified** by this review (hashes must stay stable).
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 9301ee3130091175ccca0e066a5d9b7c82473c59`;
  register **v4.43**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 object model |
| `template-metadata-registry-read-contract-rpc-design-packet.md` (v4.41) | read architecture/DTOs/rollup |
| `template-metadata-registry-read-rpc-implementation-packet-draft.md` | **reviewed input** (`6f961fdd…`) |
| `template-metadata-registry-read-rpc-db-rls-auditor-review.md` | **reviewed input** (`05d0631b…`) — findings carried |
| `template-metadata-registry-tmr3-apply-result.md` (v4.40) | applied schema state + c-exposure carry |
| `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (`f6733fa7…`) | table/column shape only |
| `tmr-dashboard-readonly-view-design-brief.md` / `creative-intake-template-wizard-flow-v2.md` | read needs |
| register **v4.43** context | the db-rls CLEAN verdict + carries |

**db-rls carries acknowledged (not dropped):** WARNING TMR-READ-DBRLS-001 (placeholder helpers → inline
CASE); IMPL-VERIFY 008 (executable CASE matches §H), 010 (c exposed-schema confirmation), 011
(jsonb_array_length non-array guard), 012 (migration owner/SECDEF/search_path/STABLE/grants/empty-state).

---

## C. Threat model summary

Threats for the read RPCs: **provider secret leakage · raw provider payload leakage · raw render/publish
payload leakage · `evidence_reference_id` leaking sensitive internal ids · candidate mistaken as proven ·
suitability mistaken as proof · assignment mistaken as enablement · proof event mistaken as publish
permission · `production_proven` inferred too loosely · browser-direct `c.*` access · SECURITY DEFINER
misuse · search_path/object hijack · placeholder-helper misuse · JSONB overexposure · empty-state
optimism · future server-action misuse.** The dominant residual risks are **(a)** the executable
lifecycle CASE must encode the conservative `production_proven` rule exactly (currently a placeholder),
and **(b)** `evidence_reference_id` exposure — both addressed below. Neither is a live risk today (no
function exists; the registry is empty; `m.*` is not browser-reachable).

---

## D. Secrets and raw payload review

The proposed RPC outputs **avoid** all of: API keys · bearer tokens · provider credentials · raw
Creatomate/HeyGen payloads · raw render payloads · raw publish payloads · raw evidence payloads ·
unbounded jsonb · internal service-role-only fields not needed by operators. Confirmed:
- **provider/raw jsonb fields are summarized only** — `brand_constraints`/`constraints`/`missing_fields`/
  `changed_fields` are **never returned raw**; surfaced as counts/labels/booleans (`has_default`,
  `missing_field_count`, the audit assertion booleans).
- **proof outputs are summaries / ids / hashes only** (no payload body).
- **No secret-bearing table referenced** (only the 8 `c.creative_template_*` tables; no `m.*`/`c.client`).
- **No provider calls.** **PASS.**

---

## E. DTO minimisation review

| DTO | Assessment |
|---|---|
| **TemplateListItem** (19 fields) | Each maps to a `/create/templates` list need (identity, family, output contract, lifecycle rollup, strongest-variant, counts, platform/client/blocker/proof **summaries**, timestamps). **No over-broad field.** Proof is **counts by type/status only** (no evidence ids in the list). **PASS.** |
| **TemplateDetail** | Drawer/inspection need — identity, family, output contract, field-inventory summary, suitability rows, variant rows, assignment rows, proof summaries, audit summary, blockers. Field-inventory exposes `has_default` boolean (not the value). **PASS** (evidence ids → §F). |
| **TemplateFilters** | Vocabulary only (providers/families/output_types/platforms/statuses/scopes). Trivially safe. **PASS.** |
| **ProofSummary** | `proof_type`/`proof_status`/`evidence_reference_type`/`evidence_reference_id`/`evidence_hash`/`occurred_at` — summary only, no payload. (`evidence_reference_id` → §F.) **PASS** with §F note. |

No field is too broad/ambiguous/unsafe except the `evidence_reference_id` minimisation question (§F).

---

## F. `evidence_reference_id` exposure review

- `evidence_reference_id` is a **soft id** pointing to a `m.post_render_log` / `m.post_publish` row — an
  **internal operational record id, NOT a secret/token/credential**, and **not** a content payload.
- **Leak risk is low:** the id alone grants **no access** — `m.*` is service-role-only and **not
  browser-reachable**; the read path is server-mediated; the id is a provenance pointer ("this proof came
  from render_log X").
- **The packet already minimises it:** the **list** RPC exposes proof **counts only** (no evidence id);
  `evidence_reference_id` appears **only in the detail (drawer) DTO** — provenance inspection where it is
  actually useful.

**Position: Option 2 — acceptable in the detail/provenance view only (already satisfied by the packet).**
Rationale: the id is non-secret and m.* is not browser-reachable, so exposure is low-risk; restricting it
to the detail view (not the high-density list) honours data-minimisation. **Recommendation
(non-blocking):** the future **server action** MAY redact/gate `evidence_reference_id` or prefer
`evidence_hash` + `evidence_reference_type` where a hash exists, if PK later wants a stricter posture.
**Not a blocker; not a packet revision** (the packet's list/detail split already implements Option 2).

---

## G. Candidate / proof / enablement separation review

Preserved structurally (distinct DTO sub-objects; conservative rollup; no output makes an unproven
template look usable):
- platform suitability is **not** proof (`suitability_status` is physical fit; proof is the proof_event).
- variant candidate is **not** a binding (`fit_status` only).
- client assignment is **not** enablement (separate sub-object; `unassigned`/`assigned_candidate` floors).
- proof event is **not** publishing permission (a record, not a grant).
- `production_proven` requires a real `platform_publish` proof_event with `proof_status='passed'` (§H).
- `lifecycle_rollup` is **derived, conservative, and not stored as truth**. **PASS.**

---

## H. `production_proven` proof-chain review

- The spec (packet §H rule 9) requires `production_proven` **only** when
  `EXISTS (proof_event WHERE proof_type='platform_publish' AND proof_status='passed')` — **never inferred
  from a status text alone.** A proof event **still does not itself grant publishing permission** (it is
  evidence, reported read-only). **Correct.**
- **Carry (binding):** the **future write-RPC must validate `evidence_reference`** against real `m.*`
  evidence to prevent **proof-event fabrication** (an operator must not be able to fabricate a passed
  `platform_publish` proof_event). The read RPC only *reports*; the write-RPC enforces.
- **Position: CLEAN FOR EXTERNAL REVIEW (warning carry).** The proof-chain rule is correct in spec; the
  **executable inlined CASE must encode it exactly** (tied to §I / DBRLS-001/008), which external review +
  implementation verify. **Not a packet revision.** (TMR-READ-SEC-005.)

---

## I. Placeholder helper review

The db-rls WARNING (TMR-READ-DBRLS-001): the list function references `public_tmr_rollup` /
`public_tmr_blockers`, which the packet NOTE (line 187) says are **inlined as explicit CASE at
implementation** (no helper, no dynamic SQL).

**Position: Option 1 — clean IF the final migration inlines the CASE logic exactly, with the binding
constraints:**
- **No helper function is created** in the first implementation (a separate `public_tmr_*` function would
  be **new SECURITY DEFINER/SQL surface** requiring its own db-rls + security review — avoid it).
- The rollup/blocker logic is **inlined as explicit CASE** in the 3 reviewed functions.
- **External review MUST verify no placeholder helper calls remain** in the final SQL (no
  `public_tmr_rollup`/`public_tmr_blockers` references survive).

**Not a packet revision** — the packet is a design draft that explicitly flags the inlining; external
review is exactly where the final SQL (with inlined CASE, no helpers) is verified. (TMR-READ-SEC-006.)

---

## J. JSONB safety review

- jsonb **returns are summarized** (counts/labels/booleans); **no unbounded raw jsonb** is returned; **no
  secret/raw payload leaks through any jsonb field** (the raw jsonb columns are never selected directly).
- **`jsonb_array_length(missing_fields)`** errors if `missing_fields` is non-array jsonb — a
  **runtime-correctness / availability** concern (a query error), **not a data-leak**. The implementation
  must guard it (`jsonb_typeof(missing_fields)='array'`, or the write-path always stores an array).
- **Position: CLEAN with implementation-lane guard** (TMR-READ-SEC-007 / DBRLS-011). **Not a packet
  revision** (no security leak; impl detail).

---

## K. SECURITY DEFINER and access-control security review

- **SECURITY DEFINER justified** (read non-exposed `c.*`); **`search_path` pinned** `'public, pg_temp'`;
  **no dynamic SQL**; **no mutation**; **no provider calls**; **no secret reads**; **no direct browser
  `c.*` reads**; **service-role-only EXECUTE** (REVOKE from PUBLIC/anon/authenticated; GRANT to
  `service_role` only); **server-action/backend mediation** expected.
- **Service-role-only EXECUTE is ACCEPTABLE for first implementation** — the browser never calls the
  function; the dashboard server action (service-role client) does. (A browser-facing `authenticated`
  EXECUTE would need a separate, stricter review with row-scoping; **not** proposed.) **PASS.**

---

## L. Empty-state and operator safety review

- Empty registry → empty arrays / zero rows (`rows:[]`, filters `[]`+vocab); unknown id → `{not_found}`.
- **No fake `490ad9ea` template · no fake `quote_card.v1` availability · no fake `market_update.v1`
  proof · no optimistic seeded data.** `unknown`/`not_captured`/`blocked` states remain visible; **blockers
  cap the lifecycle display.** **PASS.**

---

## M. Future server-action / dashboard mediation requirements (binding for the later lanes)

- The **server action / backend route** calls the **service-role** RPC; the **browser receives sanitized
  DTOs only**.
- **No direct `c.*` reads from the browser**; **no mutation through the read path**; **no raw payload
  exposure**; **no proof/enablement mutation** via reads.
- **UI wording must keep candidate / proof / enablement separate** (a candidate/suitability badge must
  never read as proven/enabled; `production_proven` reserved for the real proof chain).

---

## N. External review readiness

The packet is **clean enough for external review**. No packet revision is required. The external reviewer
should focus on:
- **SQL correctness** of the 3 functions (LATERAL aggregates, `jsonb_agg` ordering, `coalesce`/null-handling);
- **removal/inlining of the placeholder helpers** — verify **no `public_tmr_rollup`/`public_tmr_blockers`
  calls remain** and the rollup/blocker logic is an explicit inlined CASE;
- **lifecycle CASE correctness** — especially the `production_proven` `EXISTS(platform_publish, passed)` check;
- **`evidence_reference_id` exposure** — confirm it is detail-only (not in the list) and consider the
  optional server-action redaction/hash preference;
- **JSONB non-array guards** (`jsonb_array_length(missing_fields)`);
- **SECURITY DEFINER / `search_path` / grants** (service-role-only EXECUTE);
- **DTO minimisation.**

---

## O. Findings

| ID | Severity | Source | Description | Required action | Blocks external review? |
|---|---|---|---|---|---|
| **TMR-READ-SEC-001** | PASS | §D | No secrets/keys/tokens/credentials/raw provider/render/publish payloads; jsonb summarized; proof as ids/hashes/summaries; no secret-bearing tables; no provider calls | None | No |
| **TMR-READ-SEC-002** | PASS | §E | DTO minimisation — each field maps to a real operator need; list uses proof **counts** only | None | No |
| **TMR-READ-SEC-003** | WARNING (recommend) | §F | `evidence_reference_id` exposure | **Option 2 (detail-only) — already satisfied**; future server action MAY redact/hash if PK wants stricter minimisation | No |
| **TMR-READ-SEC-004** | PASS | §G | Candidate/proof/enablement separation preserved; no output makes unproven look usable | None | No |
| **TMR-READ-SEC-005** | WARNING (carry; DBRLS-001/008) | §H | `production_proven` proof-chain rule correct in spec; executable inlined CASE must encode it; write-RPC must validate `evidence_reference` (anti-fabrication) | Verify at external review + impl; write-RPC obligation | No |
| **TMR-READ-SEC-006** | WARNING (carry; DBRLS-001) | §I | Placeholder helpers `public_tmr_rollup`/`public_tmr_blockers` | **Option 1** — inline CASE, **create no helper function**, external review verifies none remain | No |
| **TMR-READ-SEC-007** | IMPL-VERIFY (DBRLS-011) | §J | `jsonb_array_length(missing_fields)` non-array guard | Guard at impl (`jsonb_typeof='array'`); runtime-correctness, not a leak | No |
| **TMR-READ-SEC-008** | PASS | §K | SECURITY DEFINER/search_path/no-dynamic-SQL/no-mutation/no-secret/no-browser-c.* reads; service-role-only EXECUTE acceptable for first impl | None | No |
| **TMR-READ-SEC-009** | PASS | §L | Empty-state/operator safety (no fake rows/proof; unknown/blocked visible; blockers cap) | None | No |
| **TMR-READ-SEC-010** | IMPL-VERIFY (DBRLS-010) | §K | `c` PostgREST exposed-schema confirmation (carry) | Verify at apply; read path already server-mediated/service-role-only | No |
| **TMR-READ-SEC-011** | PASS | §M | Future server-action mediation requirements recorded (sanitized DTOs, no direct c.* reads, no mutation, UI separation) | Enforce at the server-action/dashboard lane | No |

**Totals:** 0 BLOCKER · 3 WARNING (003, 005, 006) · 2 IMPLEMENTATION-LANE VERIFY (007, 010) · 6 PASS.

---

## P. Final verdict

**✅ 1. CLEAN FOR EXTERNAL REVIEW.**

No security **blocker** was found. The proposed read RPCs have a **strong no-secrets / sanitized-summary
posture** (no secrets/credentials/raw provider/render/publish/evidence payloads; jsonb summarized; proof
as ids/hashes/counts), **preserve candidate/proof/enablement separation**, derive **`production_proven`
only from a real `platform_publish`/`passed` proof_event**, are **service-role-only EXECUTE +
server-mediated**, and are **empty-state safe**. The three WARNINGs are **carries/recommendations**:
`evidence_reference_id` is acceptable detail-only (already satisfied; optional future redaction); the
`production_proven` executable CASE + write-RPC anti-fabrication are verified at external review/impl; and
the **placeholder helpers must be inlined as explicit CASE with no helper function created** (external
review verifies none remain). **None requires packet revision.** The IMPL-VERIFY items carry to
implementation/apply.

**Recommended next lane: TMR Read RPC external review** (on the final SQL — which must inline the rollup
CASE with no placeholder helpers; the external reviewer focuses on SQL correctness, helper removal,
lifecycle-CASE correctness, `evidence_reference_id` exposure, JSONB guards, SECURITY DEFINER/grants, DTO
minimisation).

---

## Explicit non-claims / scope
- **Docs/register only** — no migration file, no RPC created, no `execute_sql`/`apply_migration`/DB
  command, **no live DB inspection/mutation**, no dashboard/server-action/runtime code, no
  `supabase/migrations/` edit, no provider API call, no render/publish/binding/enablement/deploy, no seed,
  **no secrets.**
- The reviewed **packet** (`6f961fdd…`), **db-rls review** (`05d0631b…`), and **migration** (`f6733fa7…`)
  files were **not modified** — their hashes are stable.
- Items needing live truth are **IMPLEMENTATION-LANE VERIFY** — no live DB inspection done or implied.
- The registry is live but **empty**; **no template is bound/enabled/proven**. `quote_card.v1` stays
  `needs_template_edit`/blocked; `market_update.v1` a strong candidate but defined/unwired; `news_card.v1`
  production-proven PP × facebook+instagram only.

## Cross-references
- Reviewed packet: `…-read-rpc-implementation-packet-draft.md` (v4.42, `6f961fdd…`).
- db-rls review: `…-read-rpc-db-rls-auditor-review.md` (v4.43, `05d0631b…`).
- Read contract design: `…-read-contract-rpc-design-packet.md` (v4.41). Applied schema: `…20260630042316…` (v4.40, `f6733fa7…`).
- Register: v4.44 (this review).
