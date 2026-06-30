# TMR Template Variant Reclassification — quote_card.v1 Micro-lane (Apply Result)

> **Lane:** Step 2 of the PK-ratified TMR Template Proof Lifecycle v1 sequence.
> **Status:** ✅ **APPLIED — VERIFIED.** Single guarded one-row reclassification.
> **Date:** 2026-07-01 Sydney · **Project:** `mbkmaxqhsohbtwsqolns`
> **Packet:** `docs/briefs/tmr-template-variant-reclassification-quote-card-v1-micro-lane-apply-packet.md`
> **Migration file (in-repo record):** `supabase/migrations/20260630222620_tmr_variant_reclassify_quote_card_v1_unsuitable.sql`
> **reviewed_input_hash:** `615f08f7512487ff2482e31b947769f8d2831acbd18f93340dc9049b57350cdd` (re-verified MATCH immediately before apply)

---

## 1. What was applied

Reclassified the variant candidate `quote_card.v1` of the seeded TMR provider template `news_quote_insight_1x1_v1` (`8a6fd92e-…` / provider `490ad9ea-…`) from `fit_status='needs_template_edit'` → `'unsuitable'`, with provenance (`fit_reason`, `reviewed_by`, `reviewed_at`, `updated_at`). The template is a market-insight / news card, not a true quote card; the false `needs_template_edit` flag was pinning the whole template's read-RPC `lifecycle_rollup` at `needs_template_edit`. `market_update.v1` (strong_candidate) preserved untouched.

## 2. Gates (all passed before apply)

- **db-rls-auditor:** `pass` (no must-fix) — live-confirmed cardinality 1, blast radius 1, CHECK-valid, idempotent guard, service-role-only/no anon-authenticated, clean rollback, no migration-name collision.
- **External review:** `ask_chatgpt_review` (`sql_destructive`) `cc66dca5-b1e9-435c-8414-3499136b1d6e` — verdict **agree**, risk **low**, confidence **high**, no escalation, reviewed against hash `615f08f…`.
- **PK apply gate:** exact-hash approval phrase given 2026-07-01.

## 3. Pre-apply re-verification (read-only, immediately before)

- Hash re-verified == `615f08f…` ✓
- WHERE match count = **1** ✓ · `market_update.v1` = `strong_candidate` / `reviewed_at` NULL ✓ · proof_event_count = **0** ✓ · migration-name collision = **0** ✓ · max version `20260630112110`.

## 4. Apply mechanism

- `apply_migration` (identity `tmr_variant_reclassify_quote_card_v1_unsuitable`) was **harness-denied** (expected; consistent with prior TMR lanes).
- Fell back to the pre-authorized **`execute_sql`** path running the **byte-identical** approved UPDATE (no error).
- **Ledger backfill marker applied immediately afterward** (per PK directive + db-rls-auditor note): `INSERT INTO supabase_migrations.schema_migrations (version, name)` → version **`20260630222620`** (real apply-time UTC, > prior max `20260630112110`), name `tmr_variant_reclassify_quote_card_v1_unsuitable`, `ON CONFLICT (version) DO NOTHING`. Returned 1 row → recorded. Repo↔prod drift avoided; in-repo migration file added to match.

## 5. Post-apply verification (§6 of packet — all PASS)

| Check | Expected | Actual | Result |
|---|---|---|---|
| `quote_card.v1` fit_status | `unsuitable` | `unsuitable` | ✅ |
| `quote_card.v1` reviewed_at set | YES | YES | ✅ |
| `market_update.v1` fit_status | `strong_candidate` | `strong_candidate` | ✅ |
| `market_update.v1` reviewed_at | NULL | NULL | ✅ |
| variant_total | 2 | 2 | ✅ |
| proof_event_count | 0 | 0 | ✅ |
| RPC `lifecycle_rollup` | `platform_candidate` | `platform_candidate` | ✅ |
| RPC `blocker_summary` | `["no_render_proof","no_publish_proof"]` | `["no_render_proof","no_publish_proof"]` | ✅ |
| RPC `proof_summary` | `[]` | `[]` | ✅ |
| RPC `strongest_variant_candidate` | `market_update.v1`/`strong_candidate` | `market_update.v1`/`strong_candidate` | ✅ |
| RPC `variant_candidate_count` | 2 | 2 | ✅ |
| ledger marker present | 1 | 1 | ✅ |

**Net effect:** `lifecycle_rollup` moved `needs_template_edit → platform_candidate`; `blocker_summary` dropped `needs_template_edit` (now `[no_render_proof, no_publish_proof]`). The lifecycle is now honest ahead of any smoke-render proof.

## 6. Non-claims / safety (post-apply)

- Mutation surface: **exactly one row** (the `quote_card.v1` variant) + **one ledger marker row**. Nothing else.
- **0** proof events · **0** render · **0** publish · **0** enablement · **0** Format Mix binding · **0** provider-template field additions · **0** provider/API call · **0** dashboard code · **0** runtime change · **0** DDL · **0** grant/RLS change.
- The template remains an **inventory candidate**. It is **not** render-proven, publish-proven, production-proven, platform-safe, enabled, bound, Format Mix eligible, or production usable. `platform_candidate` = a physical candidate on some platforms, **not** proven and **not** safe. A genuine quote card remains a separate future template lane.
- Fully reversible via the §5 rollback in the packet / migration file.

## 7. Verdict

```
APPLIED — VERIFIED
```

Step 2 (quote_card.v1 micro-lane) complete. Next in the PK-ratified sequence: **Step 3 — `Template Proof Lifecycle v1 — Smoke Render Packet`** (separate lane; proof write-RPC design → safe `_smoke/` Creatomate render with synthetic data → `smoke_render` evidence → PK visual approval → `visual_approval` sequencing; no publish, no Format Mix binding, no production-proven claim).
