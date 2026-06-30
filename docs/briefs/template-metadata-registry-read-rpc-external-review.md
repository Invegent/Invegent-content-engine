# TMR Read RPC — External Review (on final intended SQL shape)

## A. Review status

- External review of the proposed TMR read RPCs, after db-rls-auditor (v4.43) + security-auditor (v4.44).
- **reviewed_input_hash = `6f961fdd67bba786de2641a33b680490b3657dbbb4b8b1ad600354dc935d0468`** (packet).
- **reviewed_db_rls_review_hash = `05d0631b05ee84f1bad585e3438167a176cddec86a5501c5434e65077751372d`.**
- **reviewed_security_review_hash = `18815ae8a6ab2f85ed36b304cb89c6fa2794167f7dbdf670815c1d5acd06a0b6`.**
- **External method:** ICE `ask_chatgpt_review` cross-model bridge (genuine external review — §C).
- **No migration file created. No RPC created. No SQL executed. No DB mutation. No live DB inspection.**
- **Verdict (see §L): `PARTIAL — NEEDS PACKET REVISION`** (the external reviewer escalated; the final
  *inlined* SQL does not yet exist to be reviewed for correctness — the packet still carries placeholders).
- **CE state:** `main == origin/main == 38f824087a6a997952b3adf350962f3fe6c9a0f5`; register **v4.44**.
  CCF-01 guards dry-run/log-only — not modified. The 3 reviewed inputs + the migration are not modified.

## B. Source documents reviewed

Read-contract design (v4.41) · read-RPC implementation packet draft (`6f961fdd…`) · db-rls-auditor review
(`05d0631b…`) · security-auditor review (`18815ae8…`) · applied TMR migration (`f6733fa7…`, shape only).

## C. External review method

- **Tool:** `ask_chatgpt_review` (cross-model, gpt-4o-mini). Passed: the reviewed packet hash, the final
  *intended* SQL shape, the prior gate verdicts, and the binding requirement that the placeholder helpers
  be inlined (no helper function created).
- **review_id:** `4f14055d-3195-4467-9b9c-411f94f70bc1` · idempotent: false.
- **Result:** `decision: escalate_explicit_flag` · `verdict: partial` · `risk_level: medium` ·
  `confidence: high` · `requires_pk_escalation: true` · pushback_points: none-specific.
- **Reviewer's substantive note (corrected_action):** *"beyond inlining the helper functions, there must
  be a thorough review of the SQL logic to confirm it complies with all critical requirements before
  seeking PK approval"*; unverified_claim: *"the detailed logic inside the functions has not been reviewed
  for specific SQL correctness yet."*
- **Triage class (CLAUDE.md rule 5):** `missing_evidence` / `runtime_verification_required` — the
  **final inlined CASE SQL does not exist in the packet** (it carries `public_tmr_rollup` /
  `public_tmr_blockers` placeholders), so the final SQL **cannot be SQL-correctness-reviewed** as-is. Per
  the ICE contract a non-clean external verdict is a **stop → surface to PK**; the directive itself says
  return PARTIAL "if the final intended SQL cannot be reviewed without rewriting the packet."

## D. Final intended SQL review (shape)

The **shape/posture is sound** (and matches the proven GFCP/PPP RPC convention): `LANGUAGE sql STABLE
SECURITY DEFINER SET search_path TO 'public, pg_temp'`, owner postgres, schema-qualified `c.*`, explicit
`jsonb_build_object` projection, **no `SELECT *`**, read-only (no INSERT/UPDATE/DELETE/DDL/dynamic SQL),
no provider calls, no secret reads, `REVOKE EXECUTE FROM public, anon, authenticated` + `GRANT EXECUTE TO
service_role`. The external reviewer **verified** the read-only design, the explicit projections, and the
design-only status. **The gap is not the shape — it is that the executable rollup/blocker CASE is not yet
written**, so its *correctness* cannot be confirmed.

## E. Placeholder helper decision

**Option 2 — PARTIAL: the packet must be revised to replace `public_tmr_rollup` / `public_tmr_blockers`
with the actual inlined CASE SQL before PK approval.** No helper function may be created. The external
reviewer concurs that the placeholders cannot stand and that the inlined logic must be reviewed for
correctness — which requires the concrete SQL to exist.

## F. Function-by-function verdict

| Function | Verdict | Reason |
|---|---|---|
| `public.get_tmr_template_list()` | **REVISE** | Carries the placeholder helper calls; must inline the rollup + blocker CASE, then re-review |
| `public.get_tmr_template_detail(uuid)` | **proceed (shape)** — re-review with finalised packet | No placeholders; shape sound; bundle into the re-review for consistency |
| `public.get_tmr_template_filters()` | **proceed (shape)** — re-review with finalised packet | Vocabulary only; trivially safe |

## G. Lifecycle / proof review

The **rules are correct in spec** (and unchanged): candidate ≠ proof; assignment ≠ enablement;
**`production_proven` ONLY with a real `platform_publish` proof_event where `proof_status='passed'`**
(never inferred from a status text); a proof event does **not** grant publish permission; unknown/blocked
states stay conservative (floor of the weakest gate). **These must be encoded in the inlined CASE** in the
revised packet (the executable check is what the external review could not yet confirm).

## H. Payload and DTO review

No secrets · no raw provider/render/publish/evidence payloads · `evidence_reference_id` **detail/
provenance only** (list shows proof **counts** only) · jsonb cols summarized. **JSONB non-array guard**
(`jsonb_typeof(missing_fields)='array'` around `jsonb_array_length`) is **required** in the revised SQL.
**PASS** (carried into the revision).

## I. Apply-lane verification checklist (carried)

- Final SQL contains **no `public_tmr_rollup` / `public_tmr_blockers`** and creates **no helper function**.
- Inlined lifecycle CASE matches the §G rules; **`production_proven` EXISTS-check uses `platform_publish` +
  `passed`**.
- `jsonb_array_length(missing_fields)` guarded by `jsonb_typeof='array'`.
- Functions owner `postgres`; `SECURITY DEFINER`; `search_path` pinned; `STABLE`.
- EXECUTE revoked from PUBLIC/anon/authenticated; granted `service_role` only; no browser table privileges.
- Empty registry returns safe empty DTOs.
- Final SQL hash recorded before apply.

## J. PK decision checklist

- **No new PK *design* decision** is introduced by this review (the rules were already ratified). The
  outstanding item is **mechanical**: inline the CASE SQL. PK still must explicitly approve the apply in a
  later hard-stop lane.
- The `ask_chatgpt_review` bridge **auto-escalated to PK** (`requires_pk_escalation: true`) — surfaced here.

## K. Findings

| ID | Severity | Description | Action | Blocks PK approval? |
|---|---|---|---|---|
| TMR-READ-EXT-001 | PARTIAL (packet revision) | External reviewer escalated: final inlined CASE SQL absent; placeholders cannot be SQL-correctness-reviewed | Revise packet to inline rollup/blocker CASE (no helper fn), then re-run external review | **Yes** (until revised) |
| TMR-READ-EXT-002 | PASS | SQL shape/posture sound (SECDEF, pinned search_path, no SELECT*/DML/dynamic-SQL, service-role-only EXECUTE) | None | No |
| TMR-READ-EXT-003 | WARNING (carry) | `production_proven` must be encoded as `EXISTS(platform_publish, passed)` in the inlined CASE | Encode + re-review | Yes (part of 001) |
| TMR-READ-EXT-004 | IMPL-VERIFY | jsonb non-array guard; `evidence_reference_id` detail-only; c exposed-schema confirmation | Apply-lane / impl | No |

## L. Final verdict

**⚠️ 2. PARTIAL — NEEDS PACKET REVISION.**

The SQL **shape and security posture are sound**, but the external (cross-model) reviewer **escalated**
because the **final inlined SQL does not yet exist** — the implementation packet still carries the
`public_tmr_rollup` / `public_tmr_blockers` placeholders, so the executable rollup/blocker logic cannot be
reviewed for correctness. The packet must be revised before PK approval.

**Exact packet revision required:**
1. In `…-read-rpc-implementation-packet-draft.md` §E.1, **replace** the `public_tmr_rollup(...)` and
   `public_tmr_blockers(...)` calls with the **actual inlined `CASE` expressions** (and remove the
   placeholder NOTE), encoding the §G conservative rollup + the `production_proven =
   EXISTS(proof_event WHERE proof_type='platform_publish' AND proof_status='passed')` check, and the
   `jsonb_typeof(missing_fields)='array'` guard. **Create no helper function.**

**Recommended next lane:** revise the read-RPC implementation packet (inline the CASE), then **re-run the
external review only** on the concrete SQL (the db-rls + security verdicts already cover the unchanged
posture/grants/tables; a *light* re-confirmation of the new CASE by db-rls/security is optional, not a full
chain rerun). Then PK approval / apply hard-stop preparation.

---

**Scope:** docs/external-review + register only. No migration file, no RPC, no SQL executed, no DB
mutation/inspection, no dashboard/server-action/runtime/provider/render/publish/binding/enablement/deploy/
CCF change, no secrets. Reviewed inputs (`6f961fdd…`/`05d0631b…`/`18815ae8…`) + migration (`f6733fa7…`)
unmodified. Registry live but empty; no template bound/enabled/proven.

**Cross-refs:** packet (v4.42), db-rls review (v4.43), security review (v4.44), read-contract design
(v4.41), applied schema (v4.40). External bridge review_id `4f14055d-3195-4467-9b9c-411f94f70bc1`.
Register: v4.45.
