# TMR First Template Seed — Ledger Backfill Review (marker-only)

## A. Review status

- **reviewed_ledger_backfill_packet_hash:** `df3742ea7852b7d1a12c9adf41fd8f0fa0f367f9e8de0566608057cb1558ccae`
  (`docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md` — unmodified).
- **reviewed_apply_result_hash:** `c8119302219da7874426fb89c55c17ee2e8817836899ab785df60e8209984240`
  (`docs/briefs/tmr-first-template-seed-apply-result.md` — unmodified).
- **corrected hard-stop packet hash:** `e54d32a7f82ec1dfd46be108731e10f2aa1f8eca54b054c31cd76dea654c9915`
  (applied SQL-of-record; unchanged).
- **Review type:** **marker-only ledger** review (read-only).
- **No ledger mutation. No TMR content mutation. No proof / render / publish / enablement.**
- **CE state:** `main == origin/main == 7c34ae7`; register **v4.57 → v4.58** with this review.

## B. Source documents reviewed

- `docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md` (the packet under review).
- `docs/briefs/tmr-first-template-seed-apply-result.md` (v4.57 apply truth-of-record).
- `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`, applied SQL).
- `docs/briefs/tmr-first-template-seed-db-rls-audit.md` (v4.55 DB/RLS audit).
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` (schema + read RPC).

## C. PK visual smoke record

PK confirmed the live `/create/templates` surface (production, login-gated):
- page **loads**; **one** visible row.
- template = **`news_quote_insight_1x1_v1`**; provider = **creatomate**; inventory = **captured_from_docs**.
- lifecycle = **Needs template edit**; blockers show **needs_template_edit, no_render_proof, no_publish_proof**.
- **Production Proven = 0**; **Needs Attention = 1**.
- **read-only disclaimer visible.**

This matches the read-RPC surfacing verified here — the live UI honestly shows the candidate, unproven row.

## D. Ledger-need review

- **The seed is already applied and verified** (v4.57) — TMR content present and correct.
- **The ledger marker is missing:** `supabase_migrations.schema_migrations` has **0** rows for
  `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix` (and **0** for any
  `tmr_first_template_seed%` / `news_quote_insight%` / `clientid_fix` equivalent).
- **Why:** `apply_migration` was harness-denied → the corrected SQL landed via the `execute_sql`
  fallback, which does not write the ledger. The backfill is needed **only** to reconcile the ledger
  truth-of-record; it does not change any applied content. **Backfill is genuinely required, no
  duplicate exists.**

## E. Ledger SQL review

Proposed design-only SQL (from the packet):
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260630060000', 'tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix')
ON CONFLICT (version) DO NOTHING;
```

| Aspect | Assessment |
|---|---|
| Target table | **`supabase_migrations.schema_migrations` ONLY** — no `c.creative_*` reference. **PASS.** |
| Target columns | `version`, `name` (both `text`). **PASS.** |
| Idempotency | `ON CONFLICT (version) DO NOTHING` — **`version` is confirmed the PRIMARY KEY** (live catalog check), so inference resolves; re-run is a no-op. **PASS.** (`idempotency_key` has a separate UNIQUE; left NULL → multiple NULLs don't conflict — safe.) |
| Marker identity | `name = tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix` — **correctly the applied corrected migration identity.** **PASS.** |
| Version / name convention | 14-digit timestamp; proposed `20260630060000` **sorts after** the current max `20260630050000`. The value is a **placeholder**, not the real apply-time UTC timestamp. → **IMPLEMENTATION-LANE VERIFY** (LBR-006). |
| statements / rollback | Left NULL (**marker-only**). The ledger row alone does not embed the corrected-packet hash; provenance lives in the docs (apply-result + corrected packet). Optionally populate `statements` (corrected `DO` block) + `rollback` (§6 DELETEs) for fuller provenance. → **PK DECISION** (LBR-007); marker-only is the safe default. |
| Marker-only? | Yes — one ledger row, no content, no seed rerun, no proof/enable/bind/render/publish. **PASS.** |

## F. TMR no-change safety review

A future ledger backfill writes **one row in a different schema** (`supabase_migrations`) and therefore
**cannot** alter TMR content. The backfill MUST leave unchanged: provider_template row (1) · fields (9)
· suitability (5) · variants (2) · assignment (1) · audit (1) · **proof_event (0)** · read-RPC output
(`needs_template_edit`, blockers, empty proof_summary) · dashboard state. Verified current state
(read-only) already matches; the backfill is structurally incapable of changing it. **PASS.**

## G. Findings

| ID | Severity | Description | Required action | Blocks ledger apply? |
|---|---|---|---|---|
| LBR-001 | **PASS** | Backfill genuinely needed — seed applied, marker absent (0 exact / 0 equivalent), no duplicate | none | No |
| LBR-002 | **PASS** | SQL touches only `supabase_migrations.schema_migrations`; no `c.creative_*`; no seed rerun | none | No |
| LBR-003 | **PASS** | Idempotent — `ON CONFLICT (version)` infers the confirmed PK (`version`) | none | No |
| LBR-004 | **PASS** | No proof / enablement / binding / render / publish introduced | none | No |
| LBR-005 | **PASS** | Marker identity is the correct applied corrected migration name | none | No |
| LBR-006 | **IMPLEMENTATION-LANE VERIFY** | Version `20260630060000` is a placeholder (sorts after `20260630050000`) | apply lane sets the actual apply-time UTC 14-digit timestamp, or PK confirms the placeholder; keep it > `20260630050000` | No |
| LBR-007 | **PK DECISION** | `statements`/`rollback` left NULL (marker-only) | PK: accept marker-only (default) or populate statements/rollback for fuller provenance | No |
| LBR-008 | **PASS** | TMR content + read-RPC + dashboard state unaffected (different schema/table) | post-backfill re-verify counts unchanged | No |

**No BLOCKER. No PARTIAL-forcing defect.** The two non-PASS items are an apply-time version detail and
an optional provenance choice — neither blocks the ledger backfill.

## H. Final verdict

**CLEAN FOR PK LEDGER BACKFILL AUTHORIZATION.**

The backfill is genuinely needed, the design-only SQL is marker-only, idempotent (PK `version`
confirmed), correctly identified, and structurally incapable of touching TMR content or introducing
proof/enablement. The only open items are the apply-time version string (IMPLEMENTATION-LANE VERIFY)
and the optional statements/rollback population (PK DECISION).

**Next lane:** **PK Ledger Backfill Authorization / marker-only backfill** — PK runs/authorises the
single `INSERT … ON CONFLICT (version) DO NOTHING` (with the real apply-time version), then §E/§F
post-backfill verification (ledger row exists; TMR counts + read-RPC + dashboard unchanged). The seed
remains applied and verified throughout; this only reconciles the ledger.

## I. Explicit non-claims / scope

Docs/register only. **No** ledger mutation · `supabase_migrations` insert · `apply_migration` ·
`execute_sql` mutation · `supabase/migrations/` file · TMR content insert/update/delete · proof event ·
enable / bind / render / publish / deploy · dashboard / runtime / CCF / `.claude` / `_harness` edit ·
secret. Read-only catalog/SELECT queries only. The ledger packet (`df3742ea…`), apply result
(`c8119302…`), and corrected packet (`e54d32a7…`) are **unmodified**.

## Cross-references
- Ledger backfill packet (reviewed): `docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md` (`df3742ea…`).
- Apply result: `docs/briefs/tmr-first-template-seed-apply-result.md` (v4.57, `c8119302…`).
- Corrected apply packet (applied): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`).
- Register: v4.58 (this review).
