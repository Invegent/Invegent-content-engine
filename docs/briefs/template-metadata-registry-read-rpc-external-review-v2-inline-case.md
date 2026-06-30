# TMR Read RPC — External Review **v2 (inline CASE)** — targeted re-run

## A. Review status

- Targeted external review of the **v2 inline-CASE** read-RPC packet, after the prior `PARTIAL` (v4.45).
- **`reviewed_v2_packet_hash` = `64b4a55a460cc6732e0df5b91918bda8f72dd83ddde6ae60143920b90275b5e3`.**
- **`prior_external_review_id` = `4f14055d-3195-4467-9b9c-411f94f70bc1`** (verdict `PARTIAL — NEEDS PACKET REVISION`).
- **`prior_external_review_hash` = `3649a882ace49310721a08281891abc00a34392846952318e1c38b93f610c71a`.**
- **`reviewed_migration_hash` = `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`.**
- **`reviewed_db_rls_review_hash` = `05d0631b05ee84f1bad585e3438167a176cddec86a5501c5434e65077751372d`.**
- **`reviewed_security_review_hash` = `18815ae8a6ab2f85ed36b304cb89c6fa2794167f7dbdf670815c1d5acd06a0b6`.**
- **External method:** ICE `ask_chatgpt_review` cross-model bridge (genuine external review — §C).
- **No migration file created · no RPC created · no SQL executed · no DB mutation · no DB inspection** (schema
  read from the applied migration file only).
- **Verdict (see §L): `CLEAN FOR PK APPROVAL / APPLY HARD-STOP PACKET`.**
- **CE state:** `main == origin/main == 4aa264c29a9e7b319aa835f07811f254c3e3cd9d`; register **v4.46**. CCF-01
  guards dry-run/log-only — not modified. All reviewed inputs unmodified.

## B. Source documents reviewed

v2 inline-CASE packet (`64b4a55a…`) · prior external review (`3649a882…`, v4.45) · db-rls-auditor review
(`05d0631b…`, v4.43) · security-auditor review (`18815ae8…`, v4.44) · applied TMR migration (`f6733fa7…`,
schema source of truth).

## C. External review method

- **Tool:** `ask_chatgpt_review` (cross-model, gpt-4o-mini). Passed: `reviewed_v2_packet_hash`, the full
  concrete `get_tmr_template_list()` SQL, the detail jsonb-guard expression, the schema NOT-NULL/CHECK facts,
  the prior PARTIAL context + prior review id, and an explicit instruction to focus on the **concrete inline
  SQL** (not the already-reviewed general posture).
- **review_id:** `8e4e531e-8621-4ab3-99c8-57ffee21af76` · idempotent: false.
- **Result:** `decision: proceed` · `verdict: agree` · `risk_level: medium` · `confidence: high` ·
  `requires_pk_escalation: false` · pushback_points: none · corrected_action: none.
- **Triage:** clean verdict (`agree`/`proceed`) — no triage class triggered; no PK escalation raised by the
  bridge. (`risk_level: medium` reflects that this packet sits on the chained-to-apply path, not a defect.)
- **Limitations:** the external model performs static SQL reasoning, not live execution; final
  owner/SECURITY DEFINER/grant/empty-state verification remains an **apply-lane** step (§J). An independent
  local static pass (this lane) reached the same conclusion.

## D. Prior PARTIAL closure check

- **Did v2 close the prior issue? YES.** The placeholder helper references are gone from the SQL.
- **`public_tmr_rollup` / `public_tmr_blockers` absent from SQL blocks? YES** — they appear only in prose/
  comments documenting the replacement; **0** occurrences as a call inside any ```sql``` block, and **no**
  `CREATE … FUNCTION public_tmr*`.
- **Final SQL now concrete enough for correctness review? YES** — `lifecycle_rollup` and `blocker_summary`
  are explicit inline `CASE` / `jsonb` expressions computed from one read-only `roll` LATERAL of
  `EXISTS(...)` signals. The exact gap the prior reviewer flagged is closed.

## E. Inline `lifecycle_rollup` review

- **CASE ordering / floor:** 10-branch `CASE`, first-match-wins, ordered weakest-gate-first
  (`blocked → inventory_missing → inventory_incomplete → needs_template_edit → platform_unknown →
  platform_candidate → unassigned → assigned_candidate → production_proven → platform_safe`). Correct
  conservative floor; preserves `inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled ≠
  production_proven`.
- **No optimistic promotion:** `production_proven` is reached **only** at branch 9 via the publish-proof
  EXISTS; the terminal `else` returns `platform_safe` (already verified at branch 6), never proven.
- **SQL validity:** the `roll` LATERAL is a no-FROM scalar `SELECT` (one row) correlated to outer `pt`,
  `left join … on true` — valid. All `roll.*` signals are non-null booleans because `inventory_status` and
  `status` are `NOT NULL` in the schema (so the `IN`/equality signals are never three-valued) and `EXISTS`
  is always boolean. **PASS.**

## F. Inline `blocker_summary` review

- **SQL validity:** `coalesce((select jsonb_agg(b) from unnest(array[ case … end, … ]::text[]) as b where b
  is not null), '[]'::jsonb)` — `unnest` of a typed `text[]` of conditional labels, null-filtered, aggregated
  to a jsonb string array. Valid; no helper call.
- **Safety / output:** short labels only (no counts of raw rows, no payloads). Empty → `[]` (all-null array
  ⇒ `jsonb_agg` NULL ⇒ coalesced). **PASS.**

## G. JSONB guard review

- `'missing_field_count', case when jsonb_typeof(v.missing_fields) = 'array' then
  jsonb_array_length(v.missing_fields) else 0 end` — `jsonb_typeof(NULL)` is `NULL` → `else 0`; a non-array
  jsonb (object/scalar) → `else 0`; only a real array reaches `jsonb_array_length`, so it can never raise
  `cannot get array length of a non-array`. `missing_fields` is never returned raw (count only). **PASS.**

## H. Corrected LATERAL / aggregation review

- **Strongest-variant:** a `limit 1` row LATERAL ordered by a `fit_status` rank `CASE` — selects one row;
  `left join … on true` → null when none; surfaced via `case when vc.variant_key is not null …`.
- **Variant count:** a **separate** `count(*)` LATERAL (`vcc`) — the v1 invalid pattern (aggregate +
  `order by`/`limit` in one SELECT) is fixed. Same DTO keys.
- **Other LATERALs (`ps`/`ca`/`pe`/`au`):** `jsonb_agg`/`max` sub-aggregates, each `coalesce`d at the call
  site; `pe` pre-groups by `(proof_type, proof_status)`. SQL-structurally correct. **PASS.**

## I. Security posture confirmation (unchanged — not re-litigated)

Confirmed unchanged from the db-rls (v4.43) + security (v4.44) CLEAN reviews: function signatures · the 8
`c.*` table-access set (SELECT-only via EXISTS/LATERAL) · `SECURITY DEFINER` (owner postgres) · pinned
`search_path TO 'public, pg_temp'` · `STABLE`/read-only · service_role-only EXECUTE (`REVOKE FROM public,
anon, authenticated`) · no browser-direct `c.*` · no mutation · no dynamic SQL · no provider calls · no raw
payloads/secrets · DTO exposure. No DB/security posture change is introduced by the inlining. **PASS.**

## J. Remaining apply-lane verification (carried)

- Final migration SQL hash recorded **before** apply; timestamp re-stamped forward of the latest applied;
  migration name = permanent identity.
- Post-apply: functions owner `postgres`; `SECURITY DEFINER`; `search_path` pinned; `STABLE`; EXECUTE
  revoked from PUBLIC/anon/authenticated and granted `service_role` only; **no** browser table privileges.
- Empty registry returns safe DTOs (`rows: []`, empty distinct arrays, `{ not_found: true }`).
- `c` exposed-schema confirmation carry (read path is server-mediated; functions service-role-only).

## K. Findings

| ID | Severity | Description | Blocks PK approval? |
|---|---|---|---|
| TMR-READ-EXTv2-001 | PASS | Prior PARTIAL closed — placeholders removed; concrete inline SQL present; no helper fn created | No |
| TMR-READ-EXTv2-002 | PASS | `lifecycle_rollup` inline CASE SQL-valid + conservative floor; `production_proven` only via `platform_publish`+`passed` | No |
| TMR-READ-EXTv2-003 | PASS | `blocker_summary` inline jsonb SQL-valid + safe (labels only, empty `[]`) | No |
| TMR-READ-EXTv2-004 | PASS | `jsonb_typeof='array'` guard sufficient; `missing_fields` never raw | No |
| TMR-READ-EXTv2-005 | PASS | corrected LATERALs SQL-valid (split row/count; no-FROM scalar `roll`) | No |
| TMR-READ-EXTv2-006 | PASS | security posture/signatures/table-access/grants/DTO unchanged (carried from v4.43/v4.44) | No |
| TMR-READ-EXTv2-007 | IMPLEMENTATION-LANE VERIFY | post-apply owner/SECDEF/search_path/grant/empty-state checks (§J) | No |

**0 BLOCKER · 0 PK DECISION · 0 WARNING · 6 PASS · 1 IMPLEMENTATION-LANE VERIFY.**

## L. Final verdict

**✅ 1. CLEAN FOR PK APPROVAL / APPLY HARD-STOP PACKET.**

The v2 inline-CASE packet closes the exact gap the prior external review flagged: the final
`lifecycle_rollup` / `blocker_summary` SQL is concrete, the placeholder helpers are gone (no helper function
created), `production_proven` is encoded only via `EXISTS(platform_publish, passed)`, the
`jsonb_array_length` guard is sufficient, and the corrected LATERALs are SQL-valid. The genuine cross-model
external reviewer **agreed / proceed** (review_id `8e4e531e-8621-4ab3-99c8-57ffee21af76`, no pushback, no PK
escalation) and an independent local static pass concurs. Security posture, grants, table access, function
signatures, and DTO exposure are unchanged from the already-CLEAN db-rls / security reviews.

**Recommended next lane:** **PK approval / TMR Read RPC apply hard-stop packet preparation** — create the
re-stamped `…_tmr_read_rpc_v1.sql` migration file (NOT applied), record its final SQL hash, run external
review on the final migration-file diff if it differs from this packet, and **stop for the PK apply gate**.
No db-rls / security re-review is required (posture/grants/tables/DTO unchanged); a light re-confirm remains
optional.

---

**Scope:** docs/external-review + register only. No migration file, no RPC, no SQL executed, no DB
mutation/inspection, no dashboard/server-action/runtime/provider/render/publish/binding/enablement/deploy/CCF
change, no secrets. Reviewed inputs (`64b4a55a…` v2 packet · `6f961fdd…` v1 · `05d0631b…` db-rls ·
`18815ae8…` security · `3649a882…` external · `f6733fa7…` migration) **unmodified**. Registry live but
empty; no template bound/enabled/proven (`quote_card.v1` blocked/`needs_template_edit`; `market_update.v1`
strong candidate but defined/unwired; `news_card.v1` proven PP × facebook+instagram only).

**Cross-refs:** v2 packet (v4.46), v1 packet (v4.42), db-rls review (v4.43), security review (v4.44), prior
external review (v4.45, review_id `4f14055d-3195-4467-9b9c-411f94f70bc1`), applied schema (v4.40). This
external bridge review_id `8e4e531e-8621-4ab3-99c8-57ffee21af76`. Register: v4.47.
