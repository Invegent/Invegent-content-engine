# TMR Foundation + First Template Candidate — Sprint Closeout

> **Type:** docs/register closeout + handover. **No DB / code / proof / render / publish / enablement
> changes.** Read-only context; the production state below was verified across v4.55–v4.59.
> **CE state:** `main == origin/main == 4e43224`; register **v4.59 → v4.60** with this closeout.
> **DB:** prod `mbkmaxqhsohbtwsqolns`.

## 1. Sprint status

- **SPRINT CLOSED.**
- **Production reconciled** — schema, read RPCs, dashboard, seed, and migration ledger are all
  consistent.
- **The TMR registry is no longer empty** — the first provider template is present.
- **First template visible as an UNPROVEN governed inventory candidate.**
- **Migration ledger reconciled** (marker recorded once).
- **No proof / enablement / binding / render / publish** anywhere in this sprint.

## 2. Final production state

| Item | State |
|---|---|
| TMR schema (`c.creative_*`, 8 tables) | **live** (migration `20260630042316_tmr3_template_metadata_registry`, `f6733fa7…`) |
| TMR read RPCs (`get_tmr_template_list` / `_detail` / `_filters`) | **live**, service-role-only (`20260630050000_tmr_read_rpc_v1`, `88efec0c…`) |
| Dashboard route `/create/templates` | **live** (separate `invegent-dashboard` repo) |
| `creative_template_family` / `creative_provider_template` | **1 / 1** |
| fields / suitability / variants | **9 / 5 / 2** |
| client_assignment / inventory_audit | **1 / 1** |
| `creative_template_proof_event` | **0** |
| `production_proven` / `platform_safe` | **0 / 0** |
| `lifecycle_rollup` | **needs_template_edit** |
| `blocker_summary` | **[needs_template_edit, no_render_proof, no_publish_proof]** |
| `proof_summary` | **[]** |
| migration ledger marker | `supabase_migrations.schema_migrations` — version **`20260630112110`**, name **`tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix`** (statements/rollback NULL) |

## 3. What shipped

- **TMR schema** — 8 governance/metadata tables in the non-REST-exposed, service-role-only schema `c`
  (deny-all RLS; append-only audit).
- **Read RPCs** — 3 SECURITY DEFINER, service-role-only read functions that surface a sanitized
  list/detail/filters contract (counts/labels only, no payloads).
- **`/create/templates` dashboard** — read-only operator surface consuming the RPCs server-side.
- **First template seed** — one Creatomate provider template inserted across 7 TMR tables as an
  inventory candidate (zero proof events).
- **Ledger backfill** — marker-only reconciliation of `supabase_migrations.schema_migrations` after the
  `execute_sql` apply path.
- **Docs/register truth-of-record** — the full v4.50→v4.59 trail (draft → reviews → audit → apply →
  verify → ledger), each gated and pushed.

## 4. Seeded template identity

| Attribute | Value |
|---|---|
| provider | `creatomate` |
| provider_template_id | `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` |
| provider_template_name | `news_quote_insight_1x1_v1` |
| output_type | `static_image` |
| dimensions | 1080 × 1080 |
| aspect_ratio | `1:1` |
| family | `generic.real_estate.market_insight_card` / Real Estate Market Insight Card (`scope=generic`, `industry_vertical=real_estate`, `status=draft`) |
| strongest variant candidate | `market_update.v1` (`strong_candidate`, `format_key` NULL = no binding) |
| needs-edit variant candidate | `quote_card.v1` (`needs_template_edit`, missing `quote_text` + `attribution_source`) |
| client assignment | Property Pulse — `proposed` / `pilot_only` (NOT enabled) |
| template status / inventory_status | `inventory_captured` / `captured_from_docs` (hash present) |

**Classified by element truth, not name:** the element set (Headline/Subtitle/CategoryBadge/Location/
Date/Footer over a 75% scrim) is a **market-insight / news headline card**, not a true quote card —
the provider name `news_quote_insight…` is misleading (TMR-1 §1).

## 5. Governance chain (full provenance)

```
TMR schema (v4.39 apply)
 → read RPCs (v4.48/49)
 → /create/templates dashboard (separate repo)
 → seed draft (v4.51, 661b3d79…)
 → combined data-shape + security review (v4.52, CLEAN, cb625af8…)
 → external review of design SQL (v4.53, PARTIAL → PK-escalated, ab1cd393…)
 → DB/RLS auditor pre-apply gate (v4.55, CLEAN, c9f54667…)
 → PK apply (hardened SQL) → FAILED FAIL-CLOSED (c.client.id 42703; zero mutation)
 → correction id→client_id (v4.56, e54d32a7…)
 → external re-review of corrected SQL (a8948273…, AGREE, no defect)
 → corrected DB-grounded evidence (PK=client_id, resolver returns one uuid)
 → corrected apply (v4.57, execute_sql fallback) → SUCCESS
 → apply verification (all assertions pass; secret scan clean)
 → PK visual smoke of /create/templates (one needs_template_edit row)
 → ledger backfill review (v4.58, CLEAN)
 → PK-authorized ledger backfill (v4.59, version 20260630112110)
 → ledger verification (marker 1; content unchanged)
```

## 6. Safety confirmations

- **Zero `proof_event` rows.** **Zero `production_proven`.** **Zero `platform_safe`.**
- **Zero enablement. Zero binding** (assignment `proposed/pilot_only`; `format_key` NULL).
- **Zero render / publish.** No deploy of CE backend (dashboard is the separate repo).
- **No raw provider payload** stored (sanitized field metadata + inventory_hash only).
- **Secret scan CLEAN** — the only "secret" token in the live detail payload is the benign audit key
  `no_secret_assertion`; zero access_token/credential/destination_id/bearer/api_key/password markers.
- **Candidate only** — `evidence_maturity`/lifecycle caps at `inventory_captured` / `needs_template_edit`.

## 7. Incident / lesson learned

- **`c.client` PK is `client_id`, NOT `id`** — and there is no `id` column. The first apply assumed
  `id` and errored `42703` on the fail-closed resolver.
- **Future TMR/client-related SQL must verify the identity COLUMN NAME, not only slug cardinality.**
  The v4.55 DB/RLS audit checked `client_slug` cardinality + ON CONFLICT + hash but missed the PK
  column name — that is the gap to close in future audits.
- **The fail-closed single-`DO`-block design worked correctly** — the error aborted the whole
  transaction → full rollback → zero partial mutation. The discipline contained the defect.
- **Old hard-stop packet hash `25624600c450bbf09166faae12bb7628d3c855e1912a646c53053b4eafb4429a` is
  STALE/DEFECTIVE and must NOT be reused** (its authorization is exhausted).
- **Corrected packet hash `e54d32a7f82ec1dfd46be108731e10f2aa1f8eca54b054c31cd76dea654c9915` is the
  applied SQL-of-record** (no `supabase/migrations/` file exists; the packet is the record).
- Recorded to agent memory as `tmr-c-client-pk-is-client-id`.

## 8. Open carries (real)

- Template remains **`needs_template_edit`** because `quote_card.v1` requires quote/attribution/source
  fields the template lacks.
- **No render proof** exists for the template.
- **No publish proof** exists.
- Template is **not Format Mix eligible**.
- Template is **not production-usable** (candidate inventory only).
- **Next sprint: render/proof lifecycle v1.**
- **Creative Intake template-capture workflow** (the operator wizard / CI-2+) remains future work.
- **Additional provider templates** are not yet inventoried (this is the first and only TMR row).

## 9. Recommended next sprint — Template Proof Lifecycle v1

Scope:
- **Render smoke proof** for the seeded template (controlled, non-publishing render).
- **PK visual approval** of the rendered asset.
- **Decide whether to remove or fix `quote_card.v1`** (add quote/attribution/source slots, or drop the
  weak candidate so the rollup reflects the real intent).
- **Add `proof_event` rows ONLY with real evidence** (validate `evidence_reference` against `m.*`).
- **Keep production enablement SEPARATE** — proof ≠ enablement; enablement remains its own gate.
- **No Format Mix use** until proof + enablement gates exist.

## 10. Handover summary for the next session

- **Current register:** v4.60 (this closeout).
- **Current commit:** the closeout commit on `main` (pushed; HEAD == origin/main, 0/0).
- **Current DB state:** TMR registry has exactly **1** template (`news_quote_insight_1x1_v1`,
  `needs_template_edit`, 0 proof events, 0 production_proven); ledger reconciled
  (`20260630112110` / `…_clientid_fix`).
- **What NOT to do:** do not reuse the stale packet `25624600…`; do not mark anything proven/enabled/
  bound without real evidence; do not add `proof_event` rows without validated `m.*` evidence; do not
  use `c.client.id` (it does not exist — use `client_id`); do not treat the template as
  production-usable or Format-Mix-eligible.
- **Suggested first task:** brief **Template Proof Lifecycle v1** (render smoke proof for the seeded
  template), or resume any parked non-TMR lane at PK's direction.

## 11. Final verdict

**SPRINT CLOSED — TMR FOUNDATION + FIRST TEMPLATE CANDIDATE SHIPPED.**

## Cross-references
- Ledger backfill apply result: `docs/briefs/tmr-first-template-seed-ledger-backfill-apply-result.md` (v4.59).
- Seed apply result: `docs/briefs/tmr-first-template-seed-apply-result.md` (v4.57).
- Corrected apply packet (SQL-of-record): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`).
- DB/RLS audit: `docs/briefs/tmr-first-template-seed-db-rls-audit.md` (v4.55).
- Combined review: `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52).
- Seed packet draft: `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51).
- Read-path packet: `docs/briefs/tmr-read-rpc-server-action-path-packet.md` (v4.50).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Register: v4.60 (this closeout).
