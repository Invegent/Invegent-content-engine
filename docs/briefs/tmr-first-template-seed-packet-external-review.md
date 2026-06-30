# TMR First Template Seed Packet — External Review

## A. Review status

- **reviewed_seed_packet_hash:** `661b3d798603fcd63de6fc3e9e67a5c81fc2fb630b4725b0b908dfa35a1f99c4`
  (`docs/briefs/tmr-first-template-seed-packet-draft.md`, v4.51 — unmodified).
- **reviewed_combined_review_hash:** `cb625af8359a0a2b66e5b14b7d359d7b68e8c6a70e67c9870c19c98c0ef5f3e4`
  (`docs/briefs/tmr-first-template-seed-packet-combined-review.md`, v4.52 — unmodified).
- **schema migration hash:** `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` — MATCH.
- **read RPC migration hash:** `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f` — MATCH.
- **External review method:** genuine cross-model adversary — `ask_chatgpt_review` (gpt-4o-mini bridge).
- **review_id:** `ab1cd393-9f9b-499b-858d-e7b0d3e16dd0`.
- **reviewed_input_hash:** `661b3d79…` (the design-only SQL is byte-derived from the seed packet of
  that hash; the combined-review summary `cb625af8…` accompanied it). The review is valid **only** for
  this input; any packet/SQL change ⇒ stale ⇒ re-run required.
- **Decision / verdict / risk / confidence:** `escalate_explicit_flag` · **`partial`** · **medium** ·
  **high**. `escalate=true`. **`requires_pk_escalation=true`.**
- **PK escalation required:** **YES** — the bridge auto-escalated (escalation_reason: "Certain
  elements of the proposal require human judgment and compliance verification").
- **No migration created. No SQL executed. No DB mutation. No provider call. No live DB inspected.**
- **CE state:** `main == origin/main == 2c0741c`; register **v4.52 → v4.53** with this review.

## B. Source documents reviewed

- `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51 — the design-only seed SQL).
- `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52 — combined review).
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (schema source of truth).
- `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` (read-RPC surfacing).

## C. External review method

- **Bridge:** `ask_chatgpt_review` (gpt-4o-mini), `action_type=plan_review`. **Genuine external** tool
  call — `review_id ab1cd393-9f9b-499b-858d-e7b0d3e16dd0`, `idempotent=false`, `db_update_error=null`.
- **Input supplied:** the full design-only seed SQL (extracted verbatim from the packet, §M), the two
  hashes, the combined-review verdict, the schema CHECK/uniqueness facts, and the explicit carries.
- **Limitation (recorded honestly):** the bridge model reviewed the **summarized context + SQL**, not
  the raw migration files. Its `unverified_claims` ("data-shape safety not confirmed", "enum/status
  validity not assessed", "idempotency not validated") reflect **its limited inputs**, not new
  defects — the **byte-level enum/column/FK verification against the schema migration was performed in
  the v4.52 combined review** (`cb625af8…`). This is genuine external validation, but its independent
  schema verification depth is bounded by the context it was given.

## D. Seed SQL / data-shape review

- **Table order / FK preservation:** `family → provider_template → fields/platforms/variants/assignment/audit` — FK-correct (combined review §C confirmed against the DDL). **PASS.**
- **Generated IDs:** PKs use `gen_random_uuid()` defaults; `provider_template_id` is the external
  Creatomate id (data, not a generated PK); the assignment `coalesce(... ,'000…')` is the index
  sentinel, not a faked `client_id`. **No improperly hardcoded generated UUID. PASS.**
- **Row coverage:** 1 family · 1 provider_template · 9 fields · 5 platforms · 2 variants · 1 assignment
  · 1 audit. **PASS.**
- **Zero proof_event rows.** **PASS** (external `verified_claims` confirms).
- **No unrelated tables touched** (only the 7 TMR tables). **PASS.**

## E. Enum / status / conservatism review

All values valid against schema CHECKs (verified byte-level in v4.52; restated to the external bridge):
`inventory_captured` / `captured_from_docs` · `candidate` / `not_suitable` · `proposed` / `pilot_only`
· `strong_candidate` / `needs_template_edit` · `draft` · `static_image` · `manual_sanitized_export`.
**No `verified`, no `platform_safe`, no `production_proven`, no `client_enabled`, no binding.**
**Verdict: PASS (conservative).** The external bridge did not dispute any value; it flagged that it
could not independently re-verify them from its limited context (tool limitation, §C).

## F. Property Pulse client_id resolution review

- Resolve by `client_slug = 'property-pulse'` — **endorsed** (deterministic, no faked UUID).
- **Exactly-one-row guard required; fail closed on zero/multiple** — the apply SQL must wrap the
  subquery in a single-row guard (`INTO STRICT` / precheck), else a 0-row result silently sets
  `client_id=NULL`. **This is the external reviewer's #1 pushback** and matches combined-review
  TMR-SEED-REV-004.
- **No UUID fabrication.** Confirmed.
- **Status:** clean for the apply packet **with implementation-lane verification** — the apply
  hard-stop packet must bake the single-row fail-closed guard in as a hard gate. **IMPLEMENTATION-LANE
  VERIFY** (not a packet-draft defect).

## G. Idempotency and ON CONFLICT review

- family / provider_template: `ON CONFLICT … DO UPDATE … RETURNING id` — idempotent. **PASS.**
- fields / platforms / variants: `ON CONFLICT … DO NOTHING` on real inline UNIQUEs. **PASS.**
- assignment: `ON CONFLICT` targets the **expression** unique index
  `creative_template_client_assignment_uq` — inference must be confirmed before apply, else use
  `WHERE NOT EXISTS`. **Second external pushback; matches TMR-SEED-REV-005. IMPLEMENTATION-LANE VERIFY.**
- audit: append-only (no unique key) — re-run appends a duplicate; intended **run-once**. **WARNING
  (TMR-SEED-REV-006).**
- **Does the apply packet need to adjust the SQL before PK approval?** Not the draft content, but the
  **apply hard-stop packet** must (a) add the single-row client guard, (b) confirm/replace the
  expression-index conflict target, (c) enforce run-once for the audit insert, (d) fill the two
  `RESOLVE_AT_APPLY` hashes deterministically. These are apply-lane hardening steps, recorded as gates.

## H. No-fake-proof / no-enablement review

- **Zero proof events** (no smoke_render / visual_approval / platform_render / platform_publish). **PASS.**
- **No `evidence_reference`** fabricated (no proof rows). **PASS.**
- **No `production_proven`** (read RPC encodes it only via a real passing `platform_publish`). **PASS.**
- **No Format Mix eligibility, no enablement, no bind to production.** **PASS.**

## I. Payload / secret review

- **No raw provider payload** (sanitized field metadata only). **PASS.**
- **No API key / token / bearer / secret; no provider credential; no raw render/publish payload.** **PASS.**
- **No browser-role access** — schema `c` non-REST-exposed, deny-all RLS, service-role-only future
  insert. **PASS.**

## J. Dashboard expected result review

Re-affirmed (independently re-derived from the read RPC in v4.52 §J):
- one row · **`lifecycle_rollup = needs_template_edit`** (short-circuits at `has_needs_edit` via
  `quote_card.v1`) · `blocker_summary = [needs_template_edit, no_render_proof, no_publish_proof]` ·
  `proof_summary = []` · detail drawer shows fields/platforms/variants/assignment/audit ·
  **not `production_proven`**. **Honest and conservative. PASS.**

## K. Findings

| ID | Severity | Description | Required action | Blocks PK apply packet? |
|---|---|---|---|---|
| TMR-SEED-EXT-001 | **PK DECISION** | External bridge returned **`partial` + `requires_pk_escalation`** (review_id `ab1cd393…`). Per CLAUDE.md a non-clean external verdict is surfaced to PK, not auto-cleared. | PK decides whether to proceed to the apply hard-stop packet carrying the four verifications below. | **Gates self-certification** — routes to PK, who owns the apply hard-stop anyway |
| TMR-SEED-EXT-002 | **IMPLEMENTATION-LANE VERIFY** | PP `client_id` slug resolution needs a fail-closed exactly-one-row guard (external pushback #1; = TMR-SEED-REV-004). | apply packet: add single-row guard, fail-closed, no faked UUID. | No (apply-lane gate) |
| TMR-SEED-EXT-003 | **IMPLEMENTATION-LANE VERIFY** | Assignment `ON CONFLICT` expression-index inference must be confirmed (external pushback #2; = TMR-SEED-REV-005). | apply packet: confirm inference or use `WHERE NOT EXISTS`. | No |
| TMR-SEED-EXT-004 | **IMPLEMENTATION-LANE VERIFY** | `inventory_hash` (×2) are RESOLVE_AT_APPLY (external pushback #4; = TMR-SEED-REV-007). | apply packet: compute deterministic sha256 of sanitized capture. | No |
| TMR-SEED-EXT-005 | **IMPLEMENTATION-LANE VERIFY** | Canonical `market_update` ice_format_key unconfirmed (external pushback #3; = TMR-SEED-REV-011); `format_key` NULL in this seed. | confirm before any **future binding** (not this seed). | No |
| TMR-SEED-EXT-006 | **WARNING** | Audit table append-only — re-run duplicates (= TMR-SEED-REV-006). | apply packet: run-once or `WHERE NOT EXISTS`. | No |

**No new `concrete_defect` was raised by the external reviewer** — every pushback point maps to an
already-documented apply-lane verification. **No `structural_DDL_DML_escalation` beyond the apply gate
itself** (the seed creates no schema, only rows, and is design-only here).

## L. Final verdict

**PARTIAL — PK ESCALATION (external reviewer returned `partial` + `requires_pk_escalation`).**

This lane **does not self-certify CLEAN**: the genuine external bridge auto-escalated to PK
(`review_id ab1cd393…`, verdict `partial`, risk medium, confidence high). Honestly, **no packet-draft
content revision is required** — the four pushback points are exactly the apply-lane verifications the
v4.52 combined review already named, and no new defect was found. The escalation is a
**`policy_decision` + `runtime_verification_required`** routing: the named post-apply/at-apply gate
(the four verifications) lives in the **next lane**, which is itself a PK hard-stop.

**Recommended next lane (PK decision):** proceed to **TMR First Template Seed Apply Hard-Stop Packet**,
which must **bake in TMR-SEED-EXT-002/003/004/006 as mandatory at-apply gates** (single-row client
guard · expression-index conflict confirmation · deterministic hashes · audit run-once) and carry
EXT-005 forward to the future binding lane. **PK owns the proceed/hold decision at that hard-stop.**
No targeted *correction* lane is needed (no draft defect); the verifications are apply-lane hardening.

## M. Explicit non-claims / scope

Docs/register only. **No** migration file · `supabase/migrations/` change · `execute_sql` /
`apply_migration` / DB query / DB mutation · seed / row insert · proof event · render / publish /
deploy · `invegent-dashboard` / runtime / server-action / dashboard / CCF / `.claude` / `_harness`
edit · secret added. Reviewed seed packet (`661b3d79…`) and combined review (`cb625af8…`) **unmodified**.
**No claim of independent external schema validation beyond the bridge's limited-context review** (§C).

## Cross-references
- Reviewed packet: `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51, `661b3d79…`).
- Combined review: `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52, `cb625af8…`).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- External review: `ask_chatgpt_review` review_id `ab1cd393-9f9b-499b-858d-e7b0d3e16dd0`.
- Register: v4.53 (this review).
