# ICE Classifier Concentration Audit — 2026-06-12

**Directive:** ICE Classifier Concentration Audit Directive (PK, 12 June 2026). Evidence-only; no implementation approved.
**Inputs:** evidence snapshot `0848a03`, gap classification `1d96193`, live classifier DB functions, live rule taxonomy, 110-item stratified 30-day sample, live fitness matrix, live slot→draft chain.
**Executed by:** CCH. **Production effect:** 0 DB writes / 0 migrations / 0 code or prompt changes / 0 deploys / 0 provider calls / 0 label updates / 0 policy reconnection / 0 Option C work. All reads via `execute_sql` + GitHub MCP.

---

## A. Classifier location and mechanism

The classifier is **not an Edge Function and not model/prompt-based**. It is a **rule-based PL/pgSQL function pair in the database**:

- **`m.classify_canonical(canonical_id)`** — loads title + extracted body + word_count + first_seen + source-type/source-name arrays, then iterates `t.content_class` (`is_current AND is_active`) in `priority_rank` order: timely_breaking → stat_heavy → multi_point → human_story → educational_evergreen → analytical. Within a class, rules are grouped (`AND` within a `rule_group`, `OR` across groups). First class with a fully-matching group wins. A class with zero active rules would match unconditionally (none currently exists). **Step 5 hard backstop: nothing matched → `'analytical'`.**
- **`m.evaluate_rule(...)`** — implements 8 rule types (title_regex, body_regex, numeric_density, word_count_range, source_type_match, source_name_match, pronoun_density, recency_window, list_marker_count). **Every body-dependent rule returns FALSE when body is NULL** (fail-closed).
- Output written to `f.canonical_content_body.content_class` + `classified_at` + `classifier_version` (all rows `v1`). Batch entrypoint `m.classify_canonicals_unclassified`; classification runs same-day as body-row creation.
- **No confidence scores exist.** **No separate "unclassified/fallback" label exists** — rule-matched analytical and backstop-default analytical are indistinguishable in the stored data.
- 6 labels exist; analytical is BOTH a real class (3 rule groups: word_count ≥1500 / "analysis:|opinion:" title markers / opinion-source match) AND the universal default.

## B. Label distribution (30-day window, n = 1,631; 0 NULL)

| Class | n | % |
|---|---|---|
| analytical | 1,507 | 92.4% |
| educational_evergreen | 56 | 3.4% |
| stat_heavy | 49 | 3.0% |
| human_story | 7 | 0.4% |
| timely_breaking | 6 | 0.4% |
| multi_point | 6 | 0.4% |

Concentration persists on fully-fetched bodies (435/479 = 90.8% analytical). 1,152/1,631 (70.6%) of items were classified **without a body** (fetch not successful → title + source signals only).

## C. Audit sample summary

**Sample: 110 items**, stratified — 50 analytical/unfetched (title-only path), 25 analytical/fetched, 35 non-analytical (all 7 human_story + all 6 timely_breaking + all 6 multi_point + 8 educational + 8 stat_heavy). Deterministic md5-ordered selection (not cherry-picked). Reviewer: CCH, judging assigned label against title (+ body where fetched) under the taxonomy's own class definitions.

| Verdict | Count | % |
|---|---|---|
| Correct | 55 | 50.0% |
| Questionable | 37 | 33.6% |
| Incorrect | 16 | 14.5% |
| Insufficient content | 2 | 1.8% |

Per-stratum precision: **analytical 41% clean** (31/75 correct; 35 questionable — mostly timely/stat/educational/human content swallowed by the backstop; 7 incorrect; 2 insufficient). **multi_point 6/6** and **stat_heavy 8/8 correct** (high precision, low recall — they fire rarely but rightly). **educational 3/8** (the `^why` rule over-triggers on news-analysis headlines). **human_story 4/7** (a mid-title "Meet New Mandates" false-positive ×3 — also a dedup leak: the same Avaana article exists as 3 canonicals). **timely 3/6** clean.

Representative mislabels with better labels: "Melbourne couple trade caravan life for first home" → human_story; CDC "Milestones by 5 Years" (1,558w evergreen reference) → educational_evergreen (caught by analytical's own ≥1500-word rule); "10 Money Lessons Nobody Told Me" → multi_point (regex requires digit directly adjacent to keyword; "10 Money Lessons" misses); "SA State Budget explained:" → educational (rule needs `explained` followed by space/end; the colon defeats it); "Why These ASX Real Estate Stocks Are Back In Focus" → analytical (educational `^why` false positive); "Breaking cycles of disadvantage…" → analytical (timely "breaking" false positive).

## D. Main failure patterns

1. **Backstop conflation.** `analytical` = real class + universal default, with no confidence and no `unclassified` label. Rule-matched and defaulted rows are indistinguishable; the 92.4% is unauditable from the stored label alone.
2. **Title-only classification for 70.6% of items.** All body rules fail closed on unfetched bodies, so most items face only narrow title regexes + (dead) source rules → fall through to backstop.
3. **Three dead source-grounded rule groups (vocabulary mismatch).** timely_breaking group 1 expects source codes `rss_news/news_api/policy_rss/gov_rss`; actual codes are `rss_app/rss_native/email_newsletter/youtube_channel/google_trends/youtube_analytics` — **can never fire** (this killed the one broad timely rule: any fresh news/gov item). analytical group 3 expects `opinion_rss/editorial_rss/newsletter` — none exist. stat_heavy group 3 matches source names `["RBA","CoreLogic",…]` with `match_type='exact'` against actual names like "RBA - Media Releases" — **never fires** (should be substring). Same defect class as the RECONCILE-BEFORE-SMOKE lessons: rule vocabulary never validated against live data.
4. **Brittle regex pattern set.** Near-misses observed in-sample: `explained:` (colon boundary), `10 Money Lessons` (intervening word), `fall` vs `fell`, `poll finds` absent, `What the budget means` vs `what this means`.
5. **False-positive keyword matches in minority classes.** `^why` (educational) fires on news commentary (5/8 sampled educational wrong); mid-title `meet` (human_story); `breaking` as an ordinary verb (timely).
6. **Data-quality side findings:** `first_seen_at` advances over time (observed later than `classified_at` on 1,532/1,631 rows — behaving like last_seen), which would silently distort the 48-h recency rule if the dead source codes are ever fixed; duplicate canonicals (same article ×3) indicate a dedup leak.

## E. Is 92.4% analytical real or defective?

**Answer: Mixed.**

A large share of the feed genuinely is news/analysis/commentary — property-market and NDIS-policy reporting dominates the source list, and 50% of sampled labels are defensibly correct, with analytical legitimately the largest class. But the **degree** of concentration is defect-inflated: the backstop conflation (D1), title-only path (D2), three dead source rules (D3) and brittle/narrow patterns (D4) all push borderline timely, stat, educational and human content into analytical, while false positives (D5) simultaneously pollute the small classes that do fire. From the sample, roughly a third of analytical labels are questionable and ~9% outright wrong; a working estimate of the **true** analytical share is **~55–70%, not 92%**, with stat_heavy and timely_breaking undercounted several-fold. So: **real-world skew toward analytical exists; the extremity of 92.4% is a classifier artefact layered on top of it.**

## F. Downstream architecture impact

The fitness matrix is genuinely differentiated (analytical→text 88; stat_heavy→animated_data 97/stat 95; multi_point→carousel 98; human_story→avatar 92; educational→carousel 92; timely→image_quote 95). With 92% of content entering as analytical, the advisor effectively receives one fitness row ("text 88 / carousel 75") for nearly everything:

- **image_quote monotony:** primarily slot-pin driven (FB/IG/LI slots pin image_quote), but the classifier contributes — misclassified stat_heavy items lose their 95-score push toward stat formats (observed: stat_heavy drafts still end 12× image_quote vs 4× stat formats; mislabelled ones never even get the chance).
- **Avatar overuse:** **not** classifier-driven — the YouTube avatar pin is the hardcoded A2 override. But the human_story undercount (7 items/30d) means the avatar-92 fitness signal almost never fires legitimately: avatar volume is policy-set, not content-earned. This matters for the avatar-share decision.
- **Carousel underuse:** directly tied — the two carousel-top classes (multi_point 98, educational 92) are exactly the ones the defects undercount.
- **Stat/kinetic underuse:** stat_heavy undercount starves stat formats of their strongest entry path.
- **Advisor override behaviour:** coherent, and partially **compensatory** — its prose rationales re-derive content nature from the actual draft text (effectively re-classifying), which is why LinkedIn iq→text overrides (70%) align with analytical's text-88. The advisor is masking some classifier weakness; it cannot recover stat/carousel/avatar fitness signals that never reached it.
- **Option C readiness:** any class-conditioned policy envelope would inherit the flattening — under current classification it would be an "analytical envelope" for ~92% of demand. Classifier repair is logically upstream of a class-aware envelope, though the keep/retire/reconnect fork itself can still be decided with this known.
- **Narrative-vs-format:** unaffected in evidence terms — the narrative dimension remains uncaptured regardless of classifier quality. This audit neither opens nor closes it.

## G. Decision readiness

- **Classifier repair: Ready.** The defects are specific, enumerated, and individually cheap (fix the three vocabulary mismatches; widen/repair brittle patterns; separate the backstop into an explicit `unclassified` label or add a matched-vs-defaulted flag; optionally classify after fetch rather than before). A repair brief can be authored on this audit alone. *(Not implemented — readiness marking only, per directive.)*
- **Option C implementation: Not ready.** Unchanged from the gap classification (per-format performance gap), now plus: a class-conditioned envelope should not be seeded from a 92%-flattened class signal.
- **Narrative policy: Not ready.** Unchanged — the dimension is still uninstrumented; this audit provides no narrative evidence either way.

---

**Future implementation candidates — not approved:** (1) classifier v2 repair brief (vocab fixes + pattern repair + unclassified/confidence flag + classify-after-fetch); (2) dedup-leak check (Avaana ×3 canonicals); (3) `first_seen_at` drift investigation (first_seen behaving as last_seen).

---

**Authority impact:**
none
