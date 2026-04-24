# R4 — D143 Classifier Spec

**Draft date:** 24 Apr 2026 evening (Friday end-of-session)
**Status:** 🔲 SPEC COMPLETE — awaiting PK weekend review before R5 starts
**Decision reference:** D143 (rule-based SQL content classifier) + D167 (router MVP shadow infrastructure)
**Pipeline gate:** Prerequisite for R5 (matching layer design) + R6 (seed_and_enqueue rewrite)

---

## Purpose in one paragraph

The router (D144/D167 infrastructure already shipped) needs to know what *kind* of signal each canonical is before it can match that signal to a (client × platform × format) slot. A breaking-news signal doesn't fit an evergreen carousel slot. A stat-heavy data release doesn't fit a human-story video slot. R4 is the classification layer: read each canonical's title + body + source metadata, apply a deterministic set of rules written in SQL, tag the canonical with exactly one of six content classes. Tag is cached on `f.canonical_content_body` so it's computed once per canonical and consumed everywhere downstream. No AI call. No per-client variation (that's R5's job). Pure rule-based SQL classification that PK can read and understand without trusting a black box.

---

## The six content classes

Fixed vocabulary. Not extensible without a new decision entry. Each canonical gets exactly one class.

| Code | Name | What it captures | Typical slot fit |
|---|---|---|---|
| `timely_breaking` | Breaking news, time-sensitive | Policy announcements, market moves, regulatory decisions, emergency updates | Single-image quote posts, short reactive LinkedIn text, urgent carousel |
| `stat_heavy` | Data / statistics primary | Survey results, benchmark reports, quarterly data releases, price indices | `animated_data`, `video_short_stat`, image-quote with number |
| `multi_point` | List-structured content | "5 ways to...", "Top 10...", "Three things to know about...", numbered advice | Carousel (strongest fit), multi-slide static |
| `human_story` | Personal narrative, case study | Participant stories, practitioner reflections, testimonials, profile pieces | `video_short_kinetic`, `video_short_avatar`, long-form LinkedIn text |
| `educational_evergreen` | Explainer, how-to, "what is" | Guides, FAQs, beginner content, definition pieces | Carousel, long-form text, `video_short_kinetic_voice` |
| `analytical` | Deep analysis, thought leadership | Opinion columns, policy analysis, extended commentary, "what this means" pieces | Long-form text, LinkedIn native article style |

**Why these six and not more.** Every additional class doubles R5's matching complexity. Six covers the full span of NDIS + property signal shapes observed in production over the past 90 days without splitting hairs on edge cases that matching can absorb anyway. Revisit if a seventh pattern emerges that genuinely can't be force-fit into one of the six.

**Why not zero fallback class.** Every canonical must get a class. If rules don't match any of the six cleanly, the fallback rule assigns `analytical` as the default — it's the broadest category and the least likely to create a matching misfire. Explicit "unclassified" state was considered and rejected — it would require R5 to have a policy for handling it, which just moves the problem.

---

## Classification rules (priority-ordered)

Each rule is a SQL predicate against canonical inputs. The classifier evaluates rules in order; **first match wins**. Priority ordering matters because multiple rules will match some canonicals — the order encodes which signal is more defining.

### Priority 1 — `timely_breaking`

Wins over everything else. If a canonical is about right-now news, it gets this class regardless of whether it's also structured as a list or full of stats.

**All of these must be true:**
- `canonical_content_item.first_seen_at > NOW() - INTERVAL '48 hours'` (within recency window)
- `feed_source.source_type_code IN ('rss_news', 'news_api', 'policy_rss', 'gov_rss')` (news-class source)

**OR any of these title/body markers are present** (case-insensitive regex):
- Title contains: `(^|\s)(breaking|just announced|announced today|just in|urgent|update:|this morning|this afternoon|today:|just released)(\s|$)`
- Body first 500 chars contains: `(announced today|this morning|this afternoon|just released|as of today|as of this)`
- Title contains explicit date within 48h (e.g. today's date, yesterday's date in text form)

**Rationale.** News signals have a half-life measured in hours. If the router holds them to match "perfect" slot fit later in the week, they're stale by publish time. Priority 1 ensures they flow fast through R5 into urgent slots.

### Priority 2 — `stat_heavy`

Wins over `multi_point` / `human_story` / `educational` / `analytical` when data is the primary thing being communicated.

**Any of these:**
- `word_count < 600` AND numeric-token density > 3% (see density calc below)
- Title contains: `(^|\s)(\d+%|\d+[.,]\d+%|survey|study|report shows|data reveals|new figures|new data|statistics show|research shows|benchmark|findings show|increase of|decrease of|up \d|down \d|rose|fell)(\s|$)`
- `feed_source.source_name` matches known data/benchmark source list (ABS, AIHW, RBA, CoreLogic, PropTrack, REIA — maintained as a small lookup list in the function)

**Numeric-token density calc.** Count of regex matches for `\d+(?:\.\d+)?%?` in `extracted_text`, divided by `word_count`. A body with ~30 numbers in 1,000 words scores 3% — typical for a stats-focused article.

**Rationale.** A signal where numbers ARE the point needs format routing to `animated_data` / `video_short_stat` / image-quote-with-number slots. An analytical piece that happens to mention two statistics is not this class.

### Priority 3 — `multi_point`

Wins over `human_story` / `educational` / `analytical` when the structure is list-shaped.

**Any of these:**
- Title regex: `(^|\s)(\d+)\s+(ways?|things?|reasons?|tips?|steps?|signs?|mistakes?|lessons?|rules?|questions?|facts?|myths?|benefits?|strategies|tactics)(\s|$)`
- Title starts with: `^(top|the top)\s+\d+\s`
- Body contains at least 3 numbered list markers: regex `(^|\n)\s*(\d+[.)]\s+|•\s+|-\s+[A-Z])` counted ≥ 3 times
- Body contains at least 3 `<ol>` / `<ul>` markers if extracted HTML retained

**Rationale.** List content carousels exceptionally well on Instagram (30% share) and LinkedIn (40% share per D167 mix). Identifying it structurally means R5 can route high-carousel-demand slots toward these signals.

### Priority 4 — `human_story`

Wins over `educational` / `analytical` when the signal is narrative-driven.

**Any of these:**
- Title contains: `(^|\s)(my|his|her|their|our)\s+(story|journey|experience|path|road|battle|fight)(\s|$)`
- Title contains: `(^|\s)(how i|how we|why i|why we|meet)(\s|$)`
- Body first 1,000 chars: first-person pronoun density > 2% (count of `\b(I|my|me|we|our|us)\b` matches ÷ token count of first 1,000 chars)
- `feed_source.source_type_code = 'participant_contributed'` (for custom participant/practitioner story feeds if added later)

**Rationale.** Personal narrative is the strongest driver of engagement in regulated verticals (NDIS particularly). Misclassifying a story piece as `educational` would route it into explainer carousel slots where the human element gets edited out.

### Priority 5 — `educational_evergreen`

Wins over `analytical` when the content teaches rather than opines.

**Any of these:**
- Title starts with: `^(how to|what is|what are|why|when|where|the complete guide|a guide to|beginner|beginners?|introduction to|understanding|explained)`
- Title contains: `(\s)(explained|guide|guide to|learn|primer|101|fundamentals?|basics?)(\s|$)`
- Body contains `(how to|step 1|step one|first,|firstly,)` within first 500 chars
- `word_count` between 400 and 2,000 AND doesn't match stat_heavy density AND doesn't match multi_point structure

**Rationale.** Explainer content has a long shelf life (PK's definition: "evergreen"). R5 can route these to carousel + long-form slots and know the signal won't be stale if matching takes 2-3 days.

### Priority 6 — `analytical` (default)

Everything that reaches this rule ends up here. Also explicit matches:
- `word_count > 1500`
- Body contains argument markers: count of `\b(therefore|thus|hence|consequently|because|since|however|although|despite|moreover|furthermore|accordingly|in conclusion)\b` ≥ 5
- `feed_source.source_type_code IN ('opinion_rss', 'editorial_rss', 'newsletter')` (editorial-class sources)
- Title contains: `(what this means|why it matters|the implications|analysis:|opinion:|comment:|perspective:)`

**Rationale.** Depth-of-thought content fits long-form native LinkedIn + newsletter + deep-dive video voiceover. Catching "what this means" framing specifically because it's the most common ICE-audience-relevant analytical pattern.

---

## Edge cases and tie-breakers

**Canonical has no body.** `extracted_text IS NULL` — classifier runs rules against title only. Any word-count or density rule that depends on body returns false. Priority 1 can still fire on title markers; everything else falls through to `analytical` default.

**Canonical is very short.** `word_count < 100` — classifier evaluates against title + whatever body exists; short pieces often end up `timely_breaking` (news snippet) or `analytical` (fallback). Don't add special-case rules for short content.

**Canonical body is extraction failure garbage.** `resolution_status IN ('give_up_paywalled', 'give_up_blocked', 'give_up_timeout', 'give_up_error')` — classifier still runs against title. This is intentional — PK's experience is that paywalled news pieces still produce usable router hints from title alone.

**Non-English content.** Not handled in MVP. Assume English. If Spanish/Hindi/Mandarin signals land in production, they'll likely mis-classify as `analytical` (fallback) — benign for routing. Revisit if multi-language feeds get added.

**Ambiguous case the rules can't split.** The first-match-wins priority order is the tie-break. This is deliberate: a deterministic result every time is worth more than a "best" result that varies run to run. PK can inspect the class + override manually via a classifier_override table (scoped out of MVP).

---

## Where the output lands

**Add three columns to `f.canonical_content_body`:**

```sql
ALTER TABLE f.canonical_content_body
  ADD COLUMN content_class TEXT
    CHECK (content_class IN (
      'timely_breaking', 'stat_heavy', 'multi_point',
      'human_story', 'educational_evergreen', 'analytical'
    )),
  ADD COLUMN classified_at TIMESTAMPTZ,
  ADD COLUMN classifier_version TEXT;
```

**Why `f.canonical_content_body` not `m.digest_item`:**
- Classification is about the content itself, not the client fit. Same canonical should get same class for every client.
- `f.canonical_content_body` is the layer where body text + word count already live — zero join cost to classify.
- Persists forever, so R5 + R6 + any future consumer gets it for free.
- Reclassifying on rule changes is a single UPDATE, not a per-client operation.

**Why the `classifier_version` column:**
- When the rule set gets tweaked (observed misclassification, added a seventh class), we need to know which canonicals were classified under which rules to decide whether to reclassify.
- String value like `'r4_mvp_20260424'` identifies the rule-set revision. New migration → new version string → `classifier_version < 'new_version'` → rows eligible for reclassification.

---

## The classifier function — shape, not code

```
FUNCTION m.classify_canonical(p_canonical_id UUID)
  RETURNS TABLE(
    canonical_id UUID,
    content_class TEXT,
    classified_at TIMESTAMPTZ,
    classifier_version TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER

  — Reads:
    f.canonical_content_body (extracted_text, word_count, resolution_status)
    f.canonical_content_item (canonical_title, first_seen_at)
    f.content_item_canonical_map → f.content_item → f.feed_source (source_type_code, source_name)

  — Evaluates rules in priority order 1 → 6
  — Returns the matched class + metadata
  — Does NOT write — caller decides whether to persist
```

**Why returns-table, not writes directly:**
Easier to test. Can be called with a read-only query to check what class a row *would* get without mutating. The sweep function (below) does the writes.

### The sweep function

```
FUNCTION m.classify_canonicals_unclassified(p_batch_size INT DEFAULT 100)
  RETURNS INT  — count of rows classified
  LANGUAGE plpgsql
  SECURITY DEFINER

  — Select rows where:
    content_class IS NULL
    OR classifier_version != '<current version constant>'
  — Limit by p_batch_size
  — For each: call m.classify_canonical(), UPDATE f.canonical_content_body
  — Return count
```

**Batch size discipline:**
100 per invocation is MVP-safe. At 5-minute cron cadence that's 1,200/hour. Current ingest rate is ~50 canonicals/hour. The sweep will always catch up within minutes of a new batch landing.

### The cron

```sql
SELECT cron.schedule(
  'classify-canonicals-every-5m',
  '*/5 * * * *',
  $$SELECT m.classify_canonicals_unclassified(100);$$
);
```

Why 5m and not 10m or 1m:
- 10m: canonicals that land just after bundler runs would wait up to 2 bundler cycles to get a class. Causes R5 misfires (bundler sees NULL, skips the canonical for this cycle).
- 1m: overkill. Burns database cycles on empty passes.
- 5m: matches the publish-queue cron cadence (jobid 48), stays well ahead of the 10m bundler cadence.

---

## Integration contract — what R5 / R6 consume

**R5 (matching layer) expects:**
- Every canonical with a non-paywalled body has a `content_class` within 5-10 minutes of fetch completion.
- `content_class` is one of the six vocabulary values or NULL (never an unexpected string).
- R5 filters `WHERE cb.content_class = 'multi_point'` (or whichever class its demand row needs) — simple equality, no fuzzy matching.

**R6 (seed_and_enqueue rewrite) expects:**
- R5 outputs (digest_item, platform, format, class) tuples already resolved.
- R6 doesn't touch the classifier — it's consuming R5 output which has already filtered by class.

**Dashboard consumption (future):**
- Eventually surface `content_class` in the Draft Inbox so operators see "this draft came from a stat_heavy signal" context. Not MVP.

---

## Migration plan — three atomic steps

### Step 1 — Schema (low risk, reversible)

Single migration adds three columns + CHECK constraint. Backfills NULL for all existing 14,247 rows in `f.canonical_content_body`. Zero breakage — no existing code reads these columns.

### Step 2 — Function + sweep + cron (shadow, no pipeline impact)

Ships `m.classify_canonical()` + `m.classify_canonicals_unclassified()` + `classify-canonicals-every-5m` cron. Sweep backfills all NULL rows at 100/5min = ~12 hours to classify the full backlog. Nothing downstream reads `content_class` yet, so wrong classifications are harmless.

### Step 3 — Verification gate before R5 starts

Before R5 design builds on top, verify:
- Cron health shows `classify-canonicals-every-5m` clean (no failures in 24h)
- Class distribution looks sane: no single class > 60% of classified rows, no class < 2%
- Spot-check 10 random canonicals per class — do they actually match the class? If `stat_heavy` rows are 40% genuinely stat-heavy and 60% misclassified, rules need tuning before R5 assumes the output.

**Verification query (for Step 3):**

```sql
SELECT content_class, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM f.canonical_content_body
WHERE content_class IS NOT NULL
GROUP BY content_class
ORDER BY n DESC;
```

---

## What's explicitly NOT in scope

1. **AI-assisted classification.** Rule-based SQL only, per D143. If AI classification becomes justified later (60d engagement data shows rule-based is routing wrong content to wrong slots), it's a separate decision + separate classifier function version.

2. **Per-client class preferences.** R5's job. Some clients may weigh `human_story` higher than others — that logic lives in the matching layer, not the classifier.

3. **Multi-label classification.** One class per canonical. If a canonical is both breaking news AND stat-heavy, priority ordering makes it `timely_breaking`. No secondary labels, no ranked lists.

4. **Classifier override table.** Future enhancement. MVP has no manual override path; operators can't force a canonical to a specific class. If misclassification becomes a real operational problem, add `m.canonical_class_override` table with `(canonical_id, override_class, reason, set_by)` columns and teach `classify_canonical()` to respect it. Deferred until evidence.

5. **Confidence scores.** Rules are binary (match/don't match). No "70% confident this is stat_heavy" output. Deterministic wins > probabilistic wins for this use case.

6. **Non-English support.** English only. Multi-language → `analytical` fallback, acceptable misfire rate until/unless non-English feeds go live.

7. **Reclassification on rule tune.** The `classifier_version` column enables it — write a migration that bumps the version, the sweep function will reclassify everything in the background — but the MVP doesn't automate "if rules change, auto-reclassify." Operator-triggered only.

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rules produce lopsided distribution (e.g. 90% `analytical`) | Medium | R5 chokes on narrow class supply | Step 3 verification gate before R5 starts; tune rules until distribution spans all six classes reasonably |
| Regex false positives on edge cases (e.g. "5 minute read" title → `multi_point`) | High | Minor operational annoyance; R5 routes wrong signal to wrong slot | Tighten regex to require "\d+\s+(ways\|things\|...)" not just any number word; iterate from production data |
| Classification cost at scale (14k rows backfill) | Low | 12-hour backfill window | Backfill runs in parallel with existing pipeline; zero production impact |
| `classifier_version` string drift — someone forgets to bump it after rule change | Medium | Old classifications stay stale under new rules | Bake the version string into a single CONSTANT at top of `m.classify_canonical()` function; can't be rule-changed without touching it |
| Rule priority order produces surprising results (e.g. a genuine human story gets `stat_heavy` because it quotes numbers) | Medium | Occasional misroute | Priority 4 (`human_story`) puts first-person-pronoun density high — a true story will hit the pronoun threshold before the stat threshold. Verify during Step 3 spot-check. |

---

## Dependencies for R5 to start

**Required before R5 can design the matching layer:**
- This spec reviewed + approved by PK
- Content_class distribution looks clean after Step 2 backfill (Step 3 gate passed)
- Any rule tuning completed before R5 baseline assumptions are locked in

**Not required for R5 design:**
- Full dashboard visibility of class (can be SQL-queried)
- Classifier override table
- Multi-label support
- AI classifier fallback

If Step 3 gate fails (distribution is lopsided, spot-check shows too many misfires), iterate on rules **before** R5 begins. R5 designed on top of a bad classifier just propagates the problem downstream.

---

## Open questions for PK (weekend review)

1. **Six classes — right set?** The list is derived from D167 decision text. If PK's operational experience suggests a seventh pattern (e.g. `practitioner_alert` for compliance warnings), it's cheaper to add now than after R5 is built.

2. **Priority order — right order?** `timely_breaking > stat_heavy > multi_point > human_story > educational > analytical`. If PK's experience is that `human_story` routinely gets swallowed by `stat_heavy` in the real data (e.g. participant stories that quote NDIS pricing numbers), consider promoting `human_story` above `stat_heavy`.

3. **Source-type-code lookup list for `stat_heavy` / `analytical`** — the short hard-coded source_name list. Where does it live? In-function CONSTANT array (simple, but bumping requires function re-deploy), or a small `t.classifier_source_hint` table (flexible, one more thing to maintain). Lean toward CONSTANT for MVP, table later if the list grows past ~20 entries.

4. **Dashboard surface for class distribution** — does PK want a quick panel showing "last 7 days of canonicals by class" for operational visibility, or is SQL-query adequate? Not blocking R5 either way.

5. **Classifier override path** — MVP assumes operators don't need manual override. True for now? Or is "this story was misclassified, let me force it to human_story" a realistic operational need within 4 weeks?

---

## When to start R5

After:
1. PK reviews this spec over weekend → answers to the 5 open questions
2. Any scope adjustments land (add/remove a class, reorder priority, switch override approach)
3. Optional: ship Steps 1 + 2 of migration plan (~30 min), let the backfill run overnight, Step 3 verification on Monday morning
4. R5 design can then start Monday afternoon with real classification data to reason against

Alternative: R5 design starts on paper over the weekend *assuming* the spec as written, and both R4 implementation + R5 design run in parallel. Lower serial time, higher risk if spec changes mid-design. **Recommend: serial. Spec review first, then implement R4, then R5 design on real data.**

---

## Related decisions

- **D143** — the decision this spec implements
- **D144** — the master router spec R4 feeds into
- **D167** — the router MVP infrastructure that's waiting for a classifier
- **D164** — 7-day canonical dedup window (R4 runs per-canonical, dedup runs per-client-per-canonical; no conflict)
- **A21 / L6** (24 Apr) — ON CONFLICT audit confirms the classifier function's proposed UPSERT pattern is safe (nothing we're designing here uses the dropped constraint)

## Related files

- `docs/06_decisions.md` — D143, D144, D166, D167 entries
- `docs/research/platform_format_mix_defaults.md` — research on which formats each platform needs (informs "typical slot fit" column in the class table above)
- `docs/briefs/2026-04-22-router-mvp-shadow-infrastructure.md` (if it exists; if not, D167 is the authoritative record)
