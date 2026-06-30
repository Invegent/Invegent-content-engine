# TMR First Template Seed — DB/RLS Auditor Re-Run (read-only pre-apply gate)

## 1. Audit status

- **reviewed_apply_hard_stop_packet_hash:** `25624600c450bbf09166faae12bb7628d3c855e1912a646c53053b4eafb4429a`
  (`docs/briefs/tmr-first-template-seed-apply-hard-stop-packet.md`, v4.54 — unmodified).
- **schema migration hash:** `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` — MATCH.
- **read RPC migration hash:** `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f` — MATCH.
- **seed packet hash:** `661b3d798603fcd63de6fc3e9e67a5c81fc2fb630b4725b0b908dfa35a1f99c4` — MATCH.
- **external review id (hardened SQL):** `20d37004-6020-4347-84e4-244932f862b2` (partial → PK-escalate; guards verified, no new defect). Prior design-SQL review `ab1cd393…` superseded/stale.
- **Method:** `db-rls-auditor` subagent, **read-only** catalog/metadata/SELECT queries against live
  project `mbkmaxqhsohbtwsqolns`. **No migration created. No SQL executed except read-only metadata
  queries. No DB mutation. No seed applied.**
- **CE state:** `main == origin/main == 76f6c90`; register **v4.54 → v4.55** with this audit.

## 2. Sources reviewed

- `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet.md` (v4.54 — the hardened §3 SQL audited).
- `docs/briefs/tmr-first-template-seed-packet-external-review.md` (v4.53),
  `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52),
  `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51).
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (schema source of truth),
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` (read-RPC grants/surfacing).

## 3. Hardened SQL scope

The §3 DO block targets **only** the 7 mutable TMR tables in schema `c`
(`creative_template_family`, `creative_provider_template`, `creative_provider_template_field`,
`creative_template_platform_suitability`, `creative_template_variant_candidate`,
`creative_template_client_assignment`, `creative_template_inventory_audit`) and reads `c.client`
(fail-closed PP resolution). It inserts **ZERO** rows into `c.creative_template_proof_event` and
**writes nothing** that marks verified / platform_safe / production_proven / enabled / approved /
publish-proven; `format_key` is NULL (no binding); no `evidence_reference`/`proof_status`. Confirmed
by static read of the SQL.

## 4. Live DB / RLS / grants audit (check A)

- **All 8 TMR tables exist** in schema `c`; `relrowsecurity = true` on **all 8**.
- **anon / authenticated:** **ZERO grants** (explicit confirm query returned empty) — no direct
  insert/update/delete (or select) path.
- **service_role:** the 7 mutable tables have `SELECT/INSERT/UPDATE/DELETE`; **`creative_template_inventory_audit` has `SELECT/INSERT` only (no UPDATE/DELETE)** — matches the append-only audit design.
- **PUBLIC:** nothing. **Verdict: PASS** — grant + RLS posture matches the service-role-only design;
  the apply runs as service_role/admin only; no browser-role write path.

## 5. Read RPC grant audit (check B)

`public.get_tmr_template_list()` · `get_tmr_template_filters()` · `get_tmr_template_detail(uuid)` —
`proacl = {postgres=X/postgres, service_role=X/postgres}` on all three. **EXECUTE not held by
PUBLIC / anon / authenticated; granted to `service_role` only. No grant drift since v4.49.**
**Verdict: PASS.**

## 6. Property Pulse slug guard audit (check C)

- `c.client.client_slug` column **exists**.
- `SELECT count(*) FROM c.client WHERE client_slug = 'property-pulse'` = **1** (count only; no other
  client data exposed).
- **Verdict: PASS** — the `SELECT … INTO STRICT … WHERE client_slug='property-pulse'` guard resolves
  to **exactly one** client; it would correctly abort if that ever became 0 or >1.

## 7. Existing-template / idempotency audit (check D)

- Existing `creatomate` / `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` rows = **0**.
- Total `c.creative_provider_template` = **0**; total `c.creative_template_family` = **0**.
- **Verdict: PASS** — registry empty; first run is a pure insert; `ON CONFLICT DO NOTHING/DO UPDATE`
  makes a re-run idempotent.

## 8. Constraint / index / ON CONFLICT audit (check E)

All ON CONFLICT targets are backed by live unique objects:

| ON CONFLICT target | Live backing | Result |
|---|---|---|
| `creative_template_family(family_key)` | `creative_template_family_family_key_key` | PASS |
| `creative_provider_template(provider, provider_template_id)` | `creative_provider_template_provider_provider_template_id_key` | PASS |
| `creative_provider_template_field(template_id, element_name)` | unique | PASS |
| `creative_template_platform_suitability(template_id, platform, placement)` | unique | PASS |
| `creative_template_variant_candidate(template_id, variant_key)` | unique | PASS |
| assignment expression target | **`creative_template_client_assignment_uq`** = `CREATE UNIQUE INDEX … USING btree (template_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid))` | PASS — see note |

**Expression-index inference (the prior escalation point):** the live index definition is
`(template_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid))`. The §3 packet SQL
writes `ON CONFLICT (template_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO NOTHING` — **byte-identical** (COALESCE case is normalized by the parser; same arg order, same
literal, same `::uuid` cast). **Inference will resolve. Verdict: PASS** (at-apply re-confirm retained
as a belt-and-braces carry — already satisfied in the packet).

## 9. Hashing function audit (check F)

- `SELECT encode(sha256(convert_to('tmr-availability-probe','UTF8')),'hex')` **succeeded** →
  `4bbd24cc28fa806a5c5044402dd065b2ac6d25032250ef7bd93563f8f97553fa`. Core `sha256(bytea)` +
  `convert_to(text,name)` + `encode(bytea,text)` are all available.
- `pgcrypto` extension **installed** (`digest()` available as a fallback, not needed).
- **Verdict: PASS** — the deterministic `inventory_hash` expression works in the live DB as written.

## 10. No-fake-proof / no-enablement audit (check G)

Static confirmation of the §3 SQL:
- **Zero** inserts into `c.creative_template_proof_event`.
- No assignment of `verified` / `platform_safe` / `production_proven` / `client_enabled` / `approved`
  / publish-proven; no `evidence_reference`; no `proof_status='passed'`; no `format_key` binding; no
  production binding.
- Conservative statuses only (`inventory_captured` / `captured_from_docs` / `candidate` /
  `not_suitable` / `proposed` / `pilot_only` / `draft`). **Verdict: PASS.**

## 11. Dashboard expected result audit (check H)

Consistent with the read RPC logic (`get_tmr_template_list`): after apply — **one row**,
`lifecycle_rollup = needs_template_edit` (short-circuits at `has_needs_edit` via `quote_card.v1`),
`blocker_summary = [needs_template_edit, no_render_proof, no_publish_proof]`, `proof_summary = []`,
**not `production_proven`**; detail drawer shows seeded metadata (fields/platforms/variants/assignment/
audit) with `proof_events: []`. **Verdict: PASS.**

## 12. Findings

| ID | Severity | Description | Required action | Blocks apply? |
|---|---|---|---|---|
| TMR-SEED-DBRLS-001 | **PASS** | 8 tables exist; RLS enabled; anon/auth zero grants; service_role DML matches design; audit append-only (SELECT/INSERT only) | none | No |
| TMR-SEED-DBRLS-002 | **PASS** | 3 read RPCs EXECUTE = service_role only; no PUBLIC/anon/auth; no drift | none | No |
| TMR-SEED-DBRLS-003 | **PASS** | `client_slug='property-pulse'` cardinality = exactly 1 → INTO STRICT guard resolves | none | No |
| TMR-SEED-DBRLS-004 | **PASS** | registry empty (0/0/0) → clean first insert; ON CONFLICT idempotent | none | No |
| TMR-SEED-DBRLS-005 | **PASS** | all 5 column unique keys + expression index `…_uq` present; ON CONFLICT inference resolves (packet target byte-matches live def) | at-apply: keep the ON CONFLICT expression byte-identical (already satisfied) | No |
| TMR-SEED-DBRLS-006 | **PASS** | core `sha256(bytea)`/`convert_to`/`encode` available (probe succeeded); pgcrypto present | none (fallback exists) | No |
| TMR-SEED-DBRLS-007 | **PASS** | zero proof events; no enablement/binding/production_proven/evidence_reference; conservative statuses | none | No |
| TMR-SEED-DBRLS-008 | **PASS** | expected dashboard result (needs_template_edit, blockers, empty proof_summary) consistent with read RPC | none | No |
| TMR-SEED-DBRLS-009 | **PK DECISION** (advisory) | All 8 TMR tables are RLS-enabled-with-no-policy → `rls_enabled_no_policy` advisor at **INFO** (the intended fail-closed posture for service-role-only tables; service_role bypasses RLS, anon/auth have no grants) | PK accepts the by-design no-policy stance (already the live production posture for these tables) | No |

**No BLOCKER. No REQUIRED SQL ADJUSTMENT.** The only non-PASS item (DBRLS-009) is an advisory
acceptance of an already-live, intended posture — it does not block the apply.

## 13. Final verdict

**CLEAN FOR PK APPLY DECISION.**

The hardened §3 SQL is safe against the live DB: correct service-role-only grant/RLS posture, the four
hardened guards all verified against live metadata (PP slug = 1 → fail-closed resolves; expression
index present and byte-matching; sha256 available; registry empty → idempotent), zero fake proof,
zero enablement, and an honest conservative dashboard result. No high-severity exposure/grant/RLS gap,
no migration-name collision, no required SQL change.

**Recommended next lane:** **PK Apply Authorization / Seed Apply** — PK runs/authorises the apply of
migration `tmr_first_template_seed_news_quote_insight_1x1_v1` (the §3 body), then the §7 post-apply
verification runs. The apply remains a PK hard stop; this audit clears the read-only safety gate only.

## 14. Explicit non-claims / scope

Docs/register only. **No** migration file · `supabase/migrations/` change · `apply_migration` ·
`execute_sql` mutation · seed execution · row insert/update/delete · proof event · render / publish /
deploy · `invegent-dashboard` / runtime / server-action / dashboard / CCF / `.claude` / `_harness`
edit · secret. Only **read-only** catalog/metadata/SELECT queries were run. The hard-stop packet
(`25624600…`), seed packet (`661b3d79…`), and reviews are unmodified. **Seed NOT applied.**

## Cross-references
- Apply hard-stop packet (audited): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet.md` (v4.54, `25624600…`).
- External RE-review (hardened SQL): `ask_chatgpt_review` `20d37004-6020-4347-84e4-244932f862b2`.
- Combined review: `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Register: v4.55 (this audit).
