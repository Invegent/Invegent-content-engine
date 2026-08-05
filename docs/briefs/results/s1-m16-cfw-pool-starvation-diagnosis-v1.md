# S1 — M16: CFW Natural-Pool Fitness Starvation — Root-Cause Diagnosis (v1)

**Lane:** control-tower watch-week diagnostics bundle (T1, strictly read-only), per PK watch ruling
v6.140 (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`). PK authorized the bundle in-chat
2026-08-05 ("run the diagnostic"). Docs-only output, version-less — no register edit, no DB write,
no schedule/cap change, no deploy.
**Read date:** 2026-08-05, live reads against Supabase project `mbkmaxqhsohbtwsqolns`.
**Governing context:** CGU Final must-have M16 (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:202-205,240-241,490-492,555`) — the CFW-LI recovery (v6.127) used a manual replacement
slot because the natural pool returned 0 candidates ≥ fitness 60 out of 40 in scope. PK ruling:
repeated supervised manual slots are not an acceptable steady state.

## Scope

CFW = Care For Welfare Pty Ltd, `client_id 3eca32aa-e460-462f-a846-3f6ace6a3cae` (`c.client`).
CFW's content verticals: `vertical_id 11` (primary) and `12` (secondary) via
`c.client_content_scope`. Cell under diagnosis: CFW LinkedIn `image_quote`
(`t.format_quality_policy` row for `image_quote`: `min_fitness_threshold=60`,
`min_pool_size_for_format=2`).

## Live re-read of the starvation number

Re-running the production candidate-pool logic (`supabase/migrations/20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql:552-621`) against verticals 11+12 today:

- **68 pool rows in scope** (34 distinct canonical items × 2 verticals — CFW's dual vertical
  membership double-counts the same canonical items, it does not add supply), **0 qualifying at
  effective_fitness ≥ 60.**
- This is the same shape as v6.127's "0 of 40" (the raw count has drifted from 40→34 distinct
  items since the recovery, consistent with normal pool churn; the **zero-qualifying outcome is
  unchanged and reproduces live today**).

## Root-cause chain (all four links code-cited and live-verified)

### 1. Primary driver — the body-health gate starves fresh supply (evidence-dominant cause)

Every fresh (`reuse_count=0`) candidate in CFW's pool was checked against
`f.canonical_content_body.fetch_status`:

| reuse_count | fetch_status | n | passes body-health gate (≥200 chars, ≥300 words) |
|---|---|---|---|
| 0 | `paywalled` | 28 | 0 |
| 0 | `blocked` | 2 | 0 |
| 0 | `dead` | 1 | 0 |
| 0 | `timeout` | 2 | 0 |
| 0 | `success` | 2 | **0** (fetched OK but still under the length/word-count floor) |
| 2 | `success` | 34 | **34** |

**80% (28/35) of CFW's fresh candidates come from sources that never even complete a body fetch**
(dominant paywalled domains: `thesector.com.au`, `newshub.medianet.com.au`, `finance.yahoo.com`,
`www.afr.com`, `www.canberratimes.com.au`, `www.news.com.au`, `aapnews.aap.com.au`, and ~20 more
one-off paywalled/govt/news domains — full list captured in the read, available on request). Of
the remaining 20%, none clear the length/word-count floor either. **The only items that ever
become usable are the 34 already-reused ones** — there is currently zero fresh replenishment.
Ingestion itself is healthy (2–13 new pool entries/day over the last 14 days, 49 distinct source
domains) — this is a **source-quality problem, not a volume problem.**

### 2. Compounding — reuse-penalty decay with no replenishment

The only usable subset (34 items, all `content_class='analytical'` or `educational_evergreen`,
`reuse_count=2`) has already been selected twice (`reuse_count` increments +1 per fill,
`supabase/migrations/20260729143000_..._fill_pending_slots.sql:893`). At `reuse_count=2`,
`t.reuse_penalty_curve` applies a **0.65× multiplier** (curve: 0→1.00, 1→0.85, 2→0.65, 3+→0.50).
For the dominant `analytical` class (`fitness_score_max=88`): `88 × 0.65 = 57.2` — **just under**
the 60 threshold. For `educational_evergreen` (`fitness_score_max=92`): `92 × 0.65 = 59.8` — also
just under. With no fresh supply landing (link 1), the entire usable pool converges below
threshold together instead of a portion rolling over.

### 3. Contributing defect A — the gate compares the wrong fitness number

`m.check_pool_health()`'s own code comment states the design intent explicitly:
> "Fitness in production is narrowly distributed (88–98 across all entries) so fitness gating
> doesn't discriminate. **The fill function uses `fitness_per_format` jsonb at per-slot
> resolution where the variance lives.**"

But the actual candidate-pool CTE in `fill_pending_slots`
(`20260729143000_..._fill_pending_slots.sql:557,565`) computes
`effective_fitness = sp.fitness_score_max × reuse_multiplier` — **`fitness_score_max` is the
class-wide MAX across ALL formats** (e.g., for `analytical`, 88 comes from the `text` format;
the format actually being filled, `image_quote`, scores only **55** for that class per
`t.class_format_fitness`), not the format-specific number the comment says should be used.
**Verified empirically this does not change today's outcome** (recomputing with the correct
per-format score also yields 0 qualifying — link 1/2 dominate either way), but it is a real
mismatch between documented intent and shipped code that affects every other class/format pair
too, in either direction (silently passing weaker candidates for formats where the class-max
comes from a *different*, higher-scoring format; possibly the reverse elsewhere).

### 4. Contributing defect B — the pool-health self-heal never sees the real bottleneck

`fill_pending_slots` is designed to relax the threshold by 10 when the pool looks unhealthy
(`m.check_pool_health()` returns `health='red'`). Live-computed today:
`m.check_pool_health(11)` = **`health: 'green'`** (`active=69 ≥50`, `distinct_sources=49 ≥3`) —
same for vertical 12. **The relaxation safety valve cannot fire**, because `check_pool_health()`
measures only raw active-row count and source diversity — it has no visibility into body-fetch
success rate or reuse-decayed fitness, which is where CFW's actual failure lives. (Note: relaxed
threshold would be 50; the 34 reused items at 57.2 effective fitness would in fact clear a
relaxed-by-10 threshold — so this defect is directly load-bearing, not cosmetic.)

## Root-cause classification

**Content-source quality mismatch, compounded by a reuse-decay/no-replenishment dynamic, masked
by two scoring/health-check defects that prevent the system's own self-healing from engaging.**
Not a volume problem (ingestion flowing, 49 distinct sources); not a scope/vertical-mapping
problem (dedup logic and vertical join behave as designed). CFW's assigned content sources
(insurance/aged-care/disability-adjacent AU news + government domains) skew heavily paywalled,
and the two defects above mean the system cannot detect or route around that on its own.

## Remediation options (bounded, tier estimates — none performed)

1. **Sourcing swap (T2, targets link 1 directly).** Re-tune CFW's vertical 11/12 source list to
   de-weight/replace the paywalled domains identified above with open-access equivalents,
   reusing the same fenced-first sourcing pattern already proven for M12 (music) and the B-roll
   batches. Highest-confidence fix — removes the starvation at its root. Estimate: 1 sourcing/
   config lane + a short proof window to confirm body-health pass rate recovers.

2. **Fix the fitness-gate defect (T2, structural_DDL_DML_escalation — touches a live selection
   function).** Change the candidate-pool CTE to use `sp.fitness_per_format->>v_chosen_format`
   instead of `sp.fitness_score_max`, matching `check_pool_health()`'s own documented intent.
   Must be scoped with a review of effects on every other class/format pair (pool-wide function,
   not CFW-specific) — needs its own db-rls-auditor + external-review pass per CLAUDE.md's T2/T3
   gate, not a drive-by patch.

3. **Fix the health-check blind spot (T1/T2, isolated function-only change).** Extend
   `m.check_pool_health()` (or add a parallel per-format check) to also measure body-health pass
   rate and post-reuse-decay effective fitness, so the existing auto-relax mechanism can actually
   detect and respond to this failure mode. Cheapest, most isolated option; on its own it would
   let CFW clear a relaxed-by-10 threshold today (57.2 ≥ 50) as a stopgap while option 1 lands,
   but does not fix the underlying supply problem.

**Recommended sequencing (diagnosis only, not a decision):** option 1 is the actual fix; option 3
is a cheap parallel safety-net that would unstick the pool immediately without waiting on new
sourcing; option 2 is correctness hygiene that should happen but is not on the critical path for
CFW specifically (verified not to change today's outcome).

## Unknowns / not verified in this read

- Whether CFW's source list was deliberately curated to include the paywalled domains (business
  reasons for source selection not read here) or is inherited/default.
- Whether other clients/verticals share the same paywall-heavy source skew (not checked — scope
  was CFW-LI only, per the seed).
- Live behavior of the T0 manual-slot bridge going forward (out of scope — this is a read-only
  root-cause diagnosis, not a remediation or bridge-usage review).

**No pool entry, source config, scoring function, or health-check function was modified by this
read.** All queries were `SELECT`-only.
