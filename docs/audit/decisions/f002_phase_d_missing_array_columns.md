# F-002 Phase D mop-up — missing pure-ARRAY columns

**Status:** Backlog — small follow-up batch
**Source:** scope discovery during Phase C apply, 28 Apr 2026 evening
**Originating finding:** F-2026-04-28-D-002 (closed-action-taken)
**Discovery context:** while verifying Phase C inventory against `k.column_registry`, chat noticed CC's P3 regex captured all 23 jsonb columns + 3 hash columns in c+f, but missed 7 pure pg ARRAY columns. Phase A captured 2 ARRAY columns (`c.client_audience_policy.audience_types_enabled`, `platforms_enabled`) because they were enumerated explicitly in P1 scope; the 7 below slipped between P1 and P3.

---

## What's missing

7 ARRAY columns in c+f schemas with no `column_purpose`:

| Schema.table | Column | Element type | Notes |
|---|---|---|---|
| c.client_brand_asset | `platform_scope` | text[] | Likely the platforms this asset applies to (e.g. `{facebook,instagram}`) |
| c.client_brand_profile | `brand_never_do` | text[] | Operator-curated list of phrases or behaviours the brand must avoid |
| c.client_brand_profile | `brand_voice_keywords` | text[] | Operator-curated list of brand-voice descriptors |
| c.content_series | `platforms` | text[] | Platforms this series targets |
| c.onboarding_submission | `content_topics` | text[] | Topics the prospective client wants to cover |
| c.onboarding_submission | `desired_platforms` | text[] | Platforms the prospective client wants to publish on |
| f.video_analysis | `key_hooks` | text[] | Extracted hook phrases or moments from the analysed video |

---

## Why this isn't blocking F-002 closure

F-002's brief target was "high-leverage business-control coverage of c+f schemas." The applied phases hit that target:

- Phase A (P1): 79 booleans/enums — the toggles that gate pipeline behaviour
- Phase B (P2): 30 numerics — the thresholds, limits, weights, counts
- Phase C (P3): 27 JSONB — the structured configs and payloads

Result: **136 of 674 c+f columns documented (20.2%)**. The 7 missing ARRAYs are simple enumerated lists; their column purposes will be one-line, mostly self-evident, and not safety-sensitive in the way Phase A toggles or Phase B thresholds were. They get a Phase D mop-up in a future small batch.

---

## Phase D scope (when ready)

A small CC brief asking for 7 column purposes against the actual current data shape. Sample data:

```sql
-- Quick sanity checks before writing purposes
SELECT platform_scope FROM c.client_brand_asset WHERE platform_scope IS NOT NULL LIMIT 5;
SELECT brand_never_do, brand_voice_keywords FROM c.client_brand_profile WHERE brand_never_do IS NOT NULL OR brand_voice_keywords IS NOT NULL LIMIT 5;
SELECT platforms FROM c.content_series WHERE platforms IS NOT NULL LIMIT 5;
SELECT content_topics, desired_platforms FROM c.onboarding_submission WHERE content_topics IS NOT NULL OR desired_platforms IS NOT NULL LIMIT 5;
SELECT key_hooks FROM f.video_analysis WHERE key_hooks IS NOT NULL LIMIT 5;
```

Apply pattern:
1. CC writes 7 column purposes in a small proposals file
2. ChatGPT reviews
3. Chat applies via Supabase MCP with count-delta verification (Lesson #38)
4. F-002's c+f coverage moves from 20.2% to ~21.2% (143/674)
5. Phase D doesn't change F-002's closure status (already closed-action-taken via P1+P2+P3)

This is small enough to combine with another mop-up batch in a future session.

---

## Process note for future briefs

The column-documentation regex pattern in CC's brief should explicitly enumerate ARRAY as well as jsonb when capturing "unstructured / variable-shape" columns. CC's P3 regex was implicitly jsonb-biased; ARRAY columns slipped through.

Future brief V1 column inventory query template:

```sql
WHERE cr.data_type IN ('jsonb', 'json', 'ARRAY')
   OR cr.data_type LIKE '%[]'
```

This becomes part of the standing brief template once documented in the F-002 closure final report.
