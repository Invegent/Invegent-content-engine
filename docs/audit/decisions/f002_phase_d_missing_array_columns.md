# F-002 Phase D mop-up — missing pure-ARRAY columns

**Status:** ✅ CLOSED-ACTION-TAKEN — 29 Apr 2026 evening (first D182 v1 brief executed end-to-end)
**Source:** scope discovery during Phase C apply, 28 Apr 2026 evening
**Originating finding:** F-2026-04-28-D-002 (closed-action-taken)
**Discovery context:** while verifying Phase C inventory against `k.column_registry`, chat noticed CC's P3 regex captured all 23 jsonb columns + 3 hash columns in c+f, but missed 7 pure pg ARRAY columns. Phase A captured 2 ARRAY columns (`c.client_audience_policy.audience_types_enabled`, `platforms_enabled`) because they were enumerated explicitly in P1 scope; the 7 below slipped between P1 and P3.

---

## Closure (29 Apr 2026)

**All 7 ARRAY columns documented.** First brief executed under D182 v1 non-blocking automation:

- **Brief:** `docs/briefs/phase-d-array-mop-up.md` (status: `done`)
- **Cowork run:** 2026-04-29T102956Z, 0 questions asked, all 5 likely-Q defaults applied, 0 corrections, ~5 min runtime, ~45k tokens, 0 production writes from automation
- **Run state:** `docs/runtime/runs/phase-d-array-mop-up-2026-04-29T102956Z.md`
- **Migration:** `supabase/migrations/20260429102956_audit_f002_phase_d_array_columns.sql`
- **Applied by PK:** 29 Apr 2026 evening via Supabase MCP per D170. count-delta verification passed (142 → 149 documented c+f rows; expected delta 7).
- **Coverage delta:** c+f schemas 21.1% → 22.1% (149 of 674 columns)
- **D182 v1 result:** 5/5 success thresholds. System earned its first run.

---

## What was missing (now closed)

7 ARRAY columns in c+f schemas with no `column_purpose` — all now documented:

| Schema.table | Column | Element type | Notes | Status |
|---|---|---|---|---|
| c.client_brand_asset | `platform_scope` | text[] | Likely the platforms this asset applies to (e.g. `{facebook,instagram}`) | ✅ documented |
| c.client_brand_profile | `brand_never_do` | text[] | Operator-curated list of phrases or behaviours the brand must avoid | ✅ documented |
| c.client_brand_profile | `brand_voice_keywords` | text[] | Operator-curated list of brand-voice descriptors | ✅ documented |
| c.content_series | `platforms` | text[] | Platforms this series targets | ✅ documented |
| c.onboarding_submission | `content_topics` | text[] | Topics the prospective client wants to cover | ✅ documented |
| c.onboarding_submission | `desired_platforms` | text[] | Platforms the prospective client wants to publish on | ✅ documented |
| f.video_analysis | `key_hooks` | text[] | Extracted hook phrases or moments from the analysed video | ✅ documented |

---

## Why this wasn't blocking F-002 closure

F-002's brief target was "high-leverage business-control coverage of c+f schemas." The applied phases hit that target:

- Phase A (P1): 79 booleans/enums — the toggles that gate pipeline behaviour
- Phase B (P2): 30 numerics — the thresholds, limits, weights, counts
- Phase C (P3): 27 JSONB — the structured configs and payloads
- **Phase D (this batch): 7 ARRAYs — the enumerated string lists**

Result: **149 of 674 c+f columns documented (22.1%)**. Phase D didn't change F-002's closure status (already closed-action-taken via P1+P2+P3 on 28 Apr); it just added the small mop-up batch.

---

## Phase D scope (executed)

A small CC brief asking for 7 column purposes against the actual current data shape. Sample data was confirmed during pre-flight on 29 Apr morning by chat:

```sql
-- Quick sanity checks before writing purposes
SELECT platform_scope FROM c.client_brand_asset WHERE platform_scope IS NOT NULL LIMIT 5;
SELECT brand_never_do, brand_voice_keywords FROM c.client_brand_profile WHERE brand_never_do IS NOT NULL OR brand_voice_keywords IS NOT NULL LIMIT 5;
SELECT platforms FROM c.content_series WHERE platforms IS NOT NULL LIMIT 5;
SELECT content_topics, desired_platforms FROM c.onboarding_submission WHERE content_topics IS NOT NULL OR desired_platforms IS NOT NULL LIMIT 5;
SELECT key_hooks FROM f.video_analysis WHERE key_hooks IS NOT NULL LIMIT 5;
```

Apply pattern (executed):
1. ✅ PK pre-flighted 7 columns + sample values + registry baseline (29 Apr morning)
2. ✅ Brief authored at `docs/briefs/phase-d-array-mop-up.md` with all pre-flight findings embedded as answer-key (Phase 3 of D182)
3. ✅ Cowork executed brief via paste-in prompt (`docs/runtime/cowork_prompt.md`); produced migration + state file with 0 questions, all 5 defaults applied as documented (Phase 5 manual one-shot)
4. ✅ Chat applied via Supabase MCP per D170 with count-delta verification (Lesson #38). Migration's internal RAISE EXCEPTION on delta != 7 acted as primary safety check.
5. ✅ Coverage moved 21.1% → 22.1% on c+f (142 → 149)

---

## Process note for future briefs

The column-documentation regex pattern in CC's brief should explicitly enumerate ARRAY as well as jsonb when capturing "unstructured / variable-shape" columns. CC's P3 regex was implicitly jsonb-biased; ARRAY columns slipped through.

Future brief V1 column inventory query template:

```sql
WHERE cr.data_type IN ('jsonb', 'json', 'ARRAY')
   OR cr.data_type LIKE '%[]'
```

This becomes part of the standing brief template once documented in the F-002 closure final report.

---

## D182 first-run findings

Closure also serves as the first-run report for the D182 v1 system. Key observations to inform Phase 4b/4c build and future briefs:

- **Answer-key pattern works.** All 5 likely-Q defaults applied without needing to write a single question to `claude_questions.md`. Either the brief was over-specified for this scope, or future briefs should aim for similar pre-flight depth. Both are useful signals.
- **Pre-loaded pre-flight data eliminates re-query loop.** Saved ~5 SQL calls vs Cowork starting cold. Worth keeping as a discipline.
- **3-commit run pattern emerged organically:** ready→running, migration+state, running→review_required+queue. Clean transitions, easy audit trail.
- **Runtime ~5 min vs estimated 20 min.** First brief was tighter than I thought. May need to set tighter estimates for similar mop-up briefs.
- **Token burn ~45k.** Modest. On Max 5x bundled, no per-run cost concern.
- **Two minor wording considerations PK observed during review:** (1) `f.video_analysis.key_hooks` has a producer claim ("video-analysis worker extracted...") not pre-flight verified — accepted as-is because producer is real per A13 closure; (2) `c.client_brand_asset.platform_scope` has shape speculation ("Shape expected to mirror lowercase platform_key values...") — accepted because hedged with "no observed sample available to confirm". Neither was safety-impacting; both are useful future-reader hints.
- **Phase 4b/4c not blocking for first run.** Brief's inline count-delta DO block did the safety job for a smoke test. GH Actions validation + OpenAI overnight answer step can land when there's a real need for them.
