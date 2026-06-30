# TMR Template Variant Reclassification — quote_card.v1 Micro-lane (Apply Packet)

> **Lane:** Step 2 of the PK-ratified TMR Template Proof Lifecycle v1 sequence — a **separate, dedicated** taxonomy/lifecycle correction (NOT folded into the Smoke Render Packet).
> **Status:** ⛔ **PREPARED, NOT APPLIED.** Packet-first. **Do NOT mutate the DB until PK approves this exact SQL/hash.**
> **Owner:** PK · **Date context:** 2026-07-01 Sydney · **Repo HEAD:** `954c6d3` (== origin/main, 0/0)
> **Register truth:** v4.60 · **Project:** `mbkmaxqhsohbtwsqolns`
> **`reviewed_input_hash` (sha256 of §4 canonical apply SQL):** `615f08f7512487ff2482e31b947769f8d2831acbd18f93340dc9049b57350cdd`

---

## 1. Purpose

Reclassify the variant candidate `quote_card.v1` away from `needs_template_edit` because the seeded provider template `news_quote_insight_1x1_v1` is a **market-insight / news card, not a true quote card** (it has no quote slot and no attribution/source slot). Preserve `market_update.v1` as the strongest valid variant. This removes a **false** `needs_template_edit` pin that currently holds the whole template's `lifecycle_rollup` at `needs_template_edit` (read-RPC CASE position 4, before all platform/proof gates) — making the lifecycle honest **before** any smoke-render proof begins.

A genuine quote card is a **separate future** template / template-edit lane (a new template with `quote_text` + attribution fields), explicitly **not** an edit of this template and **not** part of this lane.

## 2. Hard boundaries (this lane)

- Separate micro-lane only. **No** render · **no** publish · **no** proof events · **no** enablement · **no** Format Mix binding · **no** provider-template field additions · **no** dashboard code · **no** `production_proven` / `platform_safe` claim.
- Single guarded **one-row** `UPDATE` on `c.creative_template_variant_candidate`. No DDL, no schema change, no other table touched.
- **Stops at an exact PK approval gate before any `UPDATE`.** Packet is prepared, not applied.

## 3. Read-only ground truth (confirmed live, SELECT-only, 2026-07-01)

Project `mbkmaxqhsohbtwsqolns`, zero mutation:

**Template:** `id = 8a6fd92e-ef27-433b-b49b-010a7844dca9` · provider_template_id `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` · `news_quote_insight_1x1_v1` · status `inventory_captured` · inventory_status `captured_from_docs`.

**Variant rows (exactly 2 for this template; `quote_card.v1` is globally unique, count=1):**

| variant_key | PK `id` | fit_status | required_field_mapping_status | format_key | fit_reason |
|---|---|---|---|---|---|
| `market_update.v1` (**preserve**) | `817a8b7f-62fc-4aac-ab3b-f4057e2fb577` | `strong_candidate` | `pending` | NULL | Headline/Subtitle/Location/Date/Footer/CategoryBadge fits market insight card |
| `quote_card.v1` (**target**) | `b2621805-5d8c-43c7-a39c-9eee0964d7e7` | `needs_template_edit` | `blocked_missing_fields` | NULL | no quote slot, no attribution/source slot — requires template edit |

**Surrounding state:** `proof_event_count = 0` · platform suitability = facebook/instagram/linkedin/website `candidate`, youtube `not_suitable` (`has_platform_any=true`, `has_platform_safe=false`) · assignment = PP `proposed/pilot_only`.

**Schema facts (source `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql:121-138`):** PK = `id`; business unique key = `(template_id, variant_key)`; `fit_status` CHECK vocab includes `unsuitable` (`:127-128`) — the target value is valid. `c` is service-role-only, RLS deny-all, non-REST-exposed.

## 4. Canonical apply SQL (statement of record — hash `615f08f7…`)

```sql
UPDATE c.creative_template_variant_candidate
SET fit_status  = 'unsuitable',
    fit_reason  = 'Reclassified 2026-07-01 (quote_card.v1 micro-lane, TMR Template Proof Lifecycle v1): provider template news_quote_insight_1x1_v1 is a market-insight/news card, not a true quote card (no quote slot, no attribution/source slot). A genuine quote card requires a different template with quote_text + attribution fields, handled as a separate future template/template-edit lane — not an edit of this template. market_update.v1 remains the strongest valid variant.',
    reviewed_by = 'PK quote_card.v1 reclassification micro-lane (TMR Template Proof Lifecycle v1)',
    reviewed_at = now(),
    updated_at  = now()
WHERE id          = 'b2621805-5d8c-43c7-a39c-9eee0964d7e7'
  AND template_id = '8a6fd92e-ef27-433b-b49b-010a7844dca9'
  AND variant_key = 'quote_card.v1'
  AND fit_status  = 'needs_template_edit';
```

**Safety properties:**
- **Quadruple-guarded WHERE:** exact PK `id` + `template_id` + `variant_key` + current `fit_status`. Targets exactly one known row; cannot touch `market_update.v1` or any other row.
- **Optimistic-concurrency guard:** the `fit_status = 'needs_template_edit'` predicate means a re-run (or a row already changed) affects **0 rows** — fail-safe, no surprise mutation. **Expected affected rows = exactly 1.**
- Changes only this variant's `fit_status` + provenance columns (`fit_reason`, `reviewed_by`, `reviewed_at`, `updated_at`). No field additions, no other column, no other table.

**Apply mechanism (at the PK-approved apply step, not now):** primary `apply_migration` with migration identity `tmr_variant_reclassify_quote_card_v1_unsuitable` (real apply-time UTC version > prior max); if harness-denied → byte-identical `execute_sql` fallback + ledger backfill marker (the proven TMR pattern). Re-verify hash `615f08f…` immediately before apply.

## 5. Rollback (reference only — not executed by this packet)

```sql
UPDATE c.creative_template_variant_candidate
SET fit_status  = 'needs_template_edit',
    fit_reason  = 'no quote slot, no attribution/source slot — requires template edit',
    reviewed_by = NULL,
    reviewed_at = NULL,
    updated_at  = now()
WHERE id          = 'b2621805-5d8c-43c7-a39c-9eee0964d7e7'
  AND template_id = '8a6fd92e-ef27-433b-b49b-010a7844dca9'
  AND variant_key = 'quote_card.v1'
  AND fit_status  = 'unsuitable';
```

Restores the exact prior state (`needs_template_edit` + original fit_reason + null reviewer fields). Fully reversible; no data loss.

## 6. Post-apply verification (run after a PK-approved apply)

1. **Target reclassified:** `quote_card.v1` → `fit_status='unsuitable'`, `reviewed_at` set. Expect 1 row.
2. **Preserved:** `market_update.v1` → `fit_status='strong_candidate'`, `reviewed_at` still NULL (untouched).
3. **Invariants:** `variant_total=2`, `proof_event_count=0` (unchanged — no proof inserted).
4. **Read-RPC projection** `public.get_tmr_template_list()` for this template, predicted **exactly**:
   - `lifecycle_rollup`: `needs_template_edit` → **`platform_candidate`** (not blocked; inv_captured; has_fields; **has_needs_edit now false**; has_platform_any true; has_platform_safe false).
   - `blocker_summary`: `[needs_template_edit, no_render_proof, no_publish_proof]` → **`[no_render_proof, no_publish_proof]`** (`needs_template_edit` dropped; `no_render_proof`/`no_publish_proof` correctly persist — no proof exists).
   - `proof_summary`: `[]` (unchanged).
   - `strongest_variant_candidate`: `market_update.v1` / `strong_candidate` (unchanged).

## 7. Non-claims (explicit)

After this reclassification the template remains an **inventory candidate**. It is **not** render-proven, publish-proven, production-proven, platform-safe, enabled, bound, Format Mix eligible, or production usable. `platform_candidate` means "physically a candidate on some platforms" — **not** proven and **not** safe. This lane only removes a false blocker; it adds **no** capability.

## 8. Review chain + gates

1. **db-rls-auditor** (read-only) — **DONE, verdict `pass`** (no `must_fix_before_proceed`). Live-confirmed: WHERE cardinality = exactly 1; `market_update.v1` excluded (blast radius = 1 row); `'unsuitable'` valid under the live `fit_status` CHECK; optimistic guard idempotent (re-run → 0 rows); table grants `service_role`=DML, **no anon/authenticated**, RLS deny-all (the only advisor touch is a pre-existing by-design INFO `rls_enabled_no_policy`, not introduced here); rollback cleanly reverses; migration name `tmr_variant_reclassify_quote_card_v1_unsuitable` does not collide (current max applied version `20260630112110`). Two **non-blocking** notes carried to the apply step: (a) a round-trip rollback leaves `updated_at` at apply/rollback time, not the true pre-apply timestamp — provenance-only, no data loss; (b) if the `execute_sql` fallback path is used, the **ledger backfill marker MUST be applied** so repo↔prod migration tracking does not drift (known TMR pattern).
2. **External review** `ask_chatgpt_review` (`sql_destructive`) on the §4 canonical SQL — **DONE, CLEAN.** `review_id = cc66dca5-b1e9-435c-8414-3499136b1d6e`; verdict **agree**, risk **low**, confidence **high**, `escalate=false`, `requires_pk_escalation=false`, zero pushback; reviewed against hash `615f08f7512487ff2482e31b947769f8d2831acbd18f93340dc9049b57350cdd`. (Security-auditor not invoked — no SECURITY DEFINER / grant / caller-principal surface; this is a data-value reclassification on an already-locked-down service-role-only table.)
3. **PK apply gate (HARD STOP):** PK reviews the reviewed packet and gives exact approval of SQL/hash `615f08f…`. Only then: re-verify hash → apply (`apply_migration`, or `execute_sql` fallback + ledger backfill) → §6 post-apply verification → result doc + register.

## 9. Verdict

```
READY FOR PK APPLY GATE  (both review gates CLEAN)
  · db-rls-auditor: pass (no must-fix)
  · external review: agree / low / high / no-escalate (cc66dca5-…)
```

Prepared, **not applied**. No DB mutation, no migration file, no render, no publish, no proof event, no enablement, no binding, no dashboard change. The apply is a HARD STOP — PK-gated on exact SQL/hash `615f08f7512487ff2482e31b947769f8d2831acbd18f93340dc9049b57350cdd`.
