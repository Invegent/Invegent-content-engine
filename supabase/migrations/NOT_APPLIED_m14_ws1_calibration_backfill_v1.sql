-- NOT_APPLIED_m14_ws1_calibration_backfill_v1.sql
-- =====================================================================
-- M14 WS-1 — VALUE-CALIBRATION BACKFILL for the 10 open `to_be_calibrated`
-- text_limits triples on generic_market_insight_card_1x1_v1 (6) and
-- generic_quote_card_1x1_v1 (4)  (author-only — NOT APPLIED)
-- =====================================================================
-- STATUS: AUTHOR-ONLY DRAFT. Never executed, never referenced by any
--   migration-runner list. Isolated-worktree, non-production output per the
--   PK build-acceleration ruling (docs/briefs/cgu-final-build-acceleration-
--   ruling-v1.md). Filename deliberately NOT a timestamped migration name so
--   no apply tool sweeps it up.
--
-- SOURCE EVIDENCE:
--   * docs/briefs/results/s1-m14-calibration-backfill-inventory-v1.md — the
--     inventory that scoped this lane.
--   * docs/briefs/artifacts/m14-ws1-live-constraints-baseline-v1.md — the LIVE
--     current-state read (2026-08-06, project mbkmaxqhsohbtwsqolns), full
--     current constraints JSON + CAS md5 tokens for every triple below.
--   * supabase/functions/image-worker/creative_contract.ts — the in-code
--     per-client governed-value registry (read directly, no DB query).
--   * supabase/functions/image-worker/branch_b_proof.ts — formatProofDate
--     (Date field format function), read + hand-verified.
--   * supabase/functions/image-worker/b1_production.ts — TMR_WINNER_TEXT_FIELDS
--     (confirms which template each contract entry's winner maps to).
--
-- WRITE RPC: public.set_tmr_field_constraints(p_template_id, p_element_name,
--   p_constraints jsonb [WHOLE-OBJECT REPLACE], p_expected_current_md5 [CAS],
--   p_field_kind default null, p_recorded_by default null) — defined in
--   supabase/migrations/20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql:468-531.
--   Every call below carries the EXACT p_expected_current_md5 given in the
--   baseline artifact (DB-side computed, authoritative) and a FULL
--   constraints object with every existing key preserved — ONLY the target
--   triple's value/basis/source is changed. p_recorded_by is a fixed literal
--   naming this lane so a reviewer can trace the batch.
--
-- SCOPE: ONLY the 6 + 4 = 10 open to_be_calibrated triples named in the M14
--   WS-1 baseline artifact. NO other element, NO platform-suitability
--   constraint (c.creative_template_platform_suitability /
--   set_tmr_platform_constraints — untouched, out of scope), NO schema
--   change, NO other template.
--
-- WHAT GOT CALIBRATED vs LEFT OPEN (7 calibrated with a citable basis; 3 left
-- to_be_calibrated / probe_required — see the header note above each call):
--   generic_market_insight_card_1x1_v1:
--     Headline.max_lines     -> LEFT to_be_calibrated (probe_required)  [NOT called below]
--     Subtitle.max_lines     -> LEFT to_be_calibrated (probe_required)  [NOT called below]
--     CategoryBadge.max_chars -> CALIBRATED  11  declared_from_source
--     Location.max_chars     -> LEFT to_be_calibrated (judgment call — see note) [NOT called below]
--     Date.max_chars          -> CALIBRATED  17  declared_from_source
--     Footer.max_chars         -> CALIBRATED  16  declared_from_source
--   generic_quote_card_1x1_v1:
--     QuoteText.max_lines     -> LEFT to_be_calibrated (probe_required — named open risk) [NOT called below]
--     Attribution.max_chars   -> CALIBRATED  26  declared_from_source (n=1 client, caveat noted)
--     SourceLabel.max_chars   -> CALIBRATED  12  declared_from_source (n=1 client, caveat noted)
--     Footer.max_chars         -> CALIBRATED   8  declared_from_source (n=1 client, caveat noted)
--
-- Every calibrated number is the EXACT max observed/computed length from a
-- named, re-checkable source — never a padded/invented margin. See each call's
-- comment block for the derivation. The 3 left open are ALL explicitly named
-- as probe_required (or a documented non-probe judgment call for Location) in
-- the accompanying result write-up, per the "never invent a value with no
-- citable basis" discipline stated in the baseline artifact.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- generic_market_insight_card_1x1_v1  (template_id 0e006c5c-45aa-4829-82ec-89dd282a8c56)
-- ─────────────────────────────────────────────────────────────────────

-- CategoryBadge.max_chars = 11 (declared_from_source)
-- Derivation: of the 4 hardcoded creative_contract.ts entries (PP/NDIS/CFW/Invegent),
-- ONLY NDIS and CFW actually map (via maps_to_variant.implementation_id) to
-- generic_market_insight_card_1x1_v1 — PP maps to news_static_centered_scrim_1x1_v1
-- (provider_template_id fb9820f8…), Invegent maps to generic_quote_card_1x1_v1
-- (provider_template_id 2140ca19…), both DIFFERENT templates, and are excluded per
-- the baseline artifact's explicit caution not to assume all 4 brands apply to both
-- templates. The two applicable governed category values, read directly from
-- creative_contract.ts (no DB query): NDIS_IMAGE_QUOTE_NEWS_CARD_V1.fields.renderer_fixed
-- 'category'='NDIS UPDATE' (11 chars) and CFW_IMAGE_QUOTE_NEWS_CARD_V1's 'category'=
-- 'CARE UPDATE' (11 chars). max_chars is set to the exact max OBSERVED length (11) —
-- this is a FLOOR grounded in the only two real governed values that exist for this
-- template today, not a padded guess; it will need re-calibration the day a third
-- client's category value is longer. basis=declared_from_source, source cites both
-- entries by file + field. Live read date 2026-08-06.
select public.set_tmr_field_constraints(
  '0e006c5c-45aa-4829-82ec-89dd282a8c56'::uuid,
  'CategoryBadge',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Resolved via resolveCreativeContract(...).fields.renderer_fixed[''category''] (branch_b_proof.ts:86-93, TMR D6-5) — per-client governed brand-payload string, not ai_authored, not template-fixed. Classified worker_computed as closest vocabulary fit; flagged as an open question — no vocabulary value exists for ''per-client governed contract text''. max_chars=11 is the EXACT max observed length across the 2 clients whose contract maps to THIS template (NDIS ''NDIS UPDATE''=11, CFW ''CARE UPDATE''=11); PP/Invegent map to different templates and are excluded (M14 WS-1). overflow_risk=low is an assessment, not probe evidence.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":11,"source":"live registry read of 2 clients whose creative_contract.ts entry maps to generic_market_insight_card_1x1_v1 (NDIS_IMAGE_QUOTE_NEWS_CARD_V1.fields.renderer_fixed[category]=''NDIS UPDATE'' [11 chars]; CFW_IMAGE_QUOTE_NEWS_CARD_V1.fields.renderer_fixed[category]=''CARE UPDATE'' [11 chars]; supabase/functions/image-worker/creative_contract.ts:241,306); PP and Invegent excluded (different templates per b1_production.ts TMR_WINNER_TEXT_FIELDS / maps_to_variant.implementation_id). derivation: exact max observed governed value length, no margin added. date 2026-08-06.","evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["CategoryBadge.text"]}'::jsonb,
  'f63f4282a5d10394529f2389d32b916f',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- Date.max_chars = 17 (declared_from_source)
-- Derivation: formatProofDate (branch_b_proof.ts:57-59) emits
-- `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` — day has NO
-- leading zero (1-2 digits), MONTHS is the 12 full en-AU month names, year via
-- getUTCFullYear(). Exhaustively enumerated every (day, month) pair for a
-- representative year (leap-safe: Feb capped at 29): the longest string is any
-- 2-digit day + the 9-letter month "September" + a 4-digit year, e.g.
-- "10 September 2026" / "30 September 2026" = 2 + 1 + 9 + 1 + 4 = 17 characters.
-- (The baseline artifact's own prose said "≤18" without showing the arithmetic;
-- the actual worst case, verified by exhaustive enumeration against the real
-- function, is 17 — corrected here, not merely trusted.) Assumption stated
-- explicitly: a 4-digit year (holds for the entire realistic operational horizon;
-- not re-derived for a hypothetical 5-digit year). basis=declared_from_source
-- (deterministic, code-derivable, no probe needed).
select public.set_tmr_field_constraints(
  '0e006c5c-45aa-4829-82ec-89dd282a8c56'::uuid,
  'Date',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"formatProofDate (branch_b_proof.ts:57-59) emits a deterministic ''D Month YYYY'' string at render time — worker_computed, always present. max_chars=17 computed by exhaustive enumeration of every (day,month) pair against the real function: worst case = any 2-digit day + ''September'' (9 letters, the longest MONTHS entry) + a 4-digit year, e.g. ''10 September 2026'' (2+1+9+1+4=17). Assumes a 4-digit year (not re-derived for >9999).","collapse":{"collapsible":false},"empty_ok":false,"text_limits":{"max_chars":{"basis":"declared_from_source","value":17,"source":"supabase/functions/image-worker/branch_b_proof.ts:57-59 (formatProofDate) — worst-case computed by exhaustive enumeration of every (day,month) pair: 2-digit day + longest month name ''September'' (9 chars) + 4-digit year = 17 chars exactly (e.g. ''10 September 2026''). Verified 2026-08-06, corrects the baseline artifact''s unverified ''≤ 18'' prose estimate.","evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Date.text"]}'::jsonb,
  '9c29cef29695e141f645c92657a3feda',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- Footer.max_chars = 16 (declared_from_source)
-- Derivation: same applicable-client set as CategoryBadge above (NDIS + CFW map to
-- THIS template; PP + Invegent excluded — different templates). Governed footer
-- values from creative_contract.ts: NDIS 'NDIS Yarns' (10 chars), CFW
-- 'Care For Welfare' (16 chars). max_chars = exact max observed (16, CFW).
select public.set_tmr_field_constraints(
  '0e006c5c-45aa-4829-82ec-89dd282a8c56'::uuid,
  'Footer',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Resolved via resolveCreativeContract(...).fields.renderer_fixed[''footer''] (branch_b_proof.ts:91), REQUIRED at the contract level but not required_for_render at the template-field level per the live registry row. max_chars=16 is the exact max observed length across the 2 clients whose contract maps to THIS template (NDIS ''NDIS Yarns''=10, CFW ''Care For Welfare''=16); PP/Invegent excluded (different templates, M14 WS-1).","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":16,"source":"live registry read of 2 clients whose creative_contract.ts entry maps to generic_market_insight_card_1x1_v1 (NDIS_IMAGE_QUOTE_NEWS_CARD_V1.fields.renderer_fixed[footer]=''NDIS Yarns'' [10 chars]; CFW_IMAGE_QUOTE_NEWS_CARD_V1.fields.renderer_fixed[footer]=''Care For Welfare'' [16 chars]; supabase/functions/image-worker/creative_contract.ts:243,308); PP and Invegent excluded (different templates). derivation: exact max observed governed value length, no margin added. date 2026-08-06.","evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Footer.text"]}'::jsonb,
  '3162b10e3702690d9ddba94d7e03d241',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- Headline.max_lines — LEFT to_be_calibrated (NOT called). The container geometry
-- (font auto-shrinks 30-74px within a height-capped box, b1_production.ts:281-292) is
-- DESCRIPTIVE, not a formula: deriving an exact line-count bound requires knowing the
-- ACTUAL glyph-width-at-each-font-size behaviour, a render-time property this repo
-- cannot compute from the geometry summary alone. PROBE SPEC: render
-- generic_market_insight_card_1x1_v1 with a set of headlines at increasing lengths
-- spanning the full max_chars=180 bound (e.g. 60/120/180 chars, mixing short and long
-- unbreakable tokens up to B1_HEADLINE_MAX_TOKEN_CHARS=40) and count the wrapped line
-- count at each length inside the 22%-height auto-shrink box (30-74px); the greatest
-- line count observed across all in-bound headlines that still renders without visual
-- overflow becomes max_lines.

-- Subtitle.max_lines — LEFT to_be_calibrated (NOT called). The element's own `notes`
-- field states explicitly "No container geometry evidence exists in source for this
-- element" — there is NO geometric basis to derive from at all (unlike Headline, which
-- at least has a described box). PROBE SPEC: render generic_market_insight_card_1x1_v1
-- with subtitles at increasing lengths up to max_chars=90 (deriveB1Subtitle's truncation
-- bound) and observe (a) where the element actually sits/how tall its box is at render
-- time (never measured/declared in source) and (b) the wrapped line count at 90 chars;
-- both facts are prerequisites this repo does not have today.

-- Location.max_chars — LEFT to_be_calibrated (NOT called). JUDGMENT CALL, explained: all
-- 4 registered creative_contract.ts clients declare location='' (zero non-empty
-- observations, ever). Setting max_chars=1 to match 100% observed evidence would be
-- technically "declared_from_source" but is NOT a defensible bound — it would fail-close
-- the very first real (non-empty) location value any future client contract declares,
-- for a field that is explicitly OPTIONAL/empty_ok today, turning "never used" into
-- "structurally forbidden from ever being used" by accident. Inventing a generous
-- placeholder (e.g. a guessed "40 chars for a suburb name") would violate the "never
-- invent a value with no citable basis" rule just as much as the 1-char floor would
-- overreach it — there is no real content sample of any length to ground either number.
-- This is a genuine DATA gap, not a geometry gap: no probe render is even meaningful
-- until a real location string is chosen. PROBE SPEC (once a PK/product location-content
-- decision names a representative value, e.g. "Sydney, NSW" or "Greater Western Sydney"):
-- render generic_market_insight_card_1x1_v1 with that representative location text at a
-- few candidate lengths (e.g. 15/25/35 chars) and find the overflow threshold in the
-- card's Location box (never bounded/measured in source today).

-- ─────────────────────────────────────────────────────────────────────
-- generic_quote_card_1x1_v1  (template_id 1cfe0f9c-3810-4bf1-8785-083fead4eefe)
-- ─────────────────────────────────────────────────────────────────────

-- Attribution.max_chars = 26 (declared_from_source, n=1 client — caveat stated)
-- Derivation: of the 4 hardcoded creative_contract.ts entries, ONLY Invegent's maps
-- (via maps_to_variant.implementation_id) to generic_quote_card_1x1_v1 — PP maps to
-- news_static_centered_scrim_1x1_v1, NDIS + CFW both map to
-- generic_market_insight_card_1x1_v1 (a different template). Invegent is therefore the
-- ONLY registered client that actually renders through this template today.
-- INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed 'attribution'=
-- 'Invegent — AI & Automation' = 26 chars exactly (counted char-by-char, not estimated).
-- Single-sample basis is EXPLICITLY flagged in the source citation below — this is the
-- ONLY declared value system-wide, so it is the entire citable evidence base; it will
-- need re-verification the moment a second client declares an attribution value.
select public.set_tmr_field_constraints(
  '1cfe0f9c-3810-4bf1-8785-083fead4eefe'::uuid,
  'Attribution',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"cc-0049 fail-closed field: resolved via resolveCreativeContract(...).fields.renderer_fixed[''attribution''] (branch_b_proof.ts:112-113) — per-client value declared only by clients using this winner, never a template default. buildTmrRenderPlan throws tmr_winner_brand_fields_missing if attribution+source_label aren''t both declared. max_chars=26 is the exact length of the ONLY currently-declared value (Invegent) — the sole client whose contract maps to this template; will need re-verification if a second client declares a longer value.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":26,"source":"live registry read of exactly 1 client whose creative_contract.ts entry maps to generic_quote_card_1x1_v1 (INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed[attribution]=''Invegent — AI & Automation'' [26 chars, exact count]; supabase/functions/image-worker/creative_contract.ts:376). PP/NDIS/CFW excluded (map to different templates). derivation: exact observed value length, n=1 (only registered client for this template today), no margin added. date 2026-08-06.","evidence_reference":null}},"overflow_risk":"medium","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Attribution.text"]}'::jsonb,
  'c843c47f916cafeee868456387d101ad',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- SourceLabel.max_chars = 12 (declared_from_source, n=1 client — caveat stated)
-- Derivation: same single-applicable-client basis as Attribution above.
-- INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed 'source_label'='invegent.com'
-- = 12 chars exactly.
select public.set_tmr_field_constraints(
  '1cfe0f9c-3810-4bf1-8785-083fead4eefe'::uuid,
  'SourceLabel',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Same fail-closed pairing as Attribution (branch_b_proof.ts:114-115) — resolved via resolveCreativeContract(...).fields.renderer_fixed[''source_label'']. buildTmrRenderPlan throws tmr_winner_brand_fields_missing if a client selects this winner without both Attribution and SourceLabel declared. max_chars=12 is the exact length of the ONLY currently-declared value (Invegent) — the sole client whose contract maps to this template.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":12,"source":"live registry read of exactly 1 client whose creative_contract.ts entry maps to generic_quote_card_1x1_v1 (INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed[source_label]=''invegent.com'' [12 chars, exact count]; supabase/functions/image-worker/creative_contract.ts:377). PP/NDIS/CFW excluded (map to different templates). derivation: exact observed value length, n=1 (only registered client for this template today), no margin added. date 2026-08-06.","evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["SourceLabel.text"]}'::jsonb,
  '0f344dc3eebbd2865683ca6b560c2159',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- Footer.max_chars = 8 (declared_from_source, n=1 client — caveat stated)
-- Derivation: same single-applicable-client basis as Attribution/SourceLabel above.
-- INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed 'footer'='Invegent' = 8 chars.
-- NOTE: this template's Footer row carries element_id d306d254… (a UUID) rather than a
-- literal 'Footer' per the baseline artifact — a capture-time inconsistency, not a
-- defect; the element_name column itself (what set_tmr_field_constraints keys on) reads
-- 'Footer', so this call is unaffected.
select public.set_tmr_field_constraints(
  '1cfe0f9c-3810-4bf1-8785-083fead4eefe'::uuid,
  'Footer',
  '{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Same governed brand-payload resolution as market-insight''s Footer (branch_b_proof.ts:91, TMR D6-5). Live registry''s Footer row for this template carries element_id d306d254... (a UUID) rather than literal ''Footer'' — a capture inconsistency, not a defect; the element_name column itself reads ''Footer''. max_chars=8 is the exact length of the ONLY currently-declared value (Invegent ''Invegent'') — the sole client whose contract maps to this template.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":8,"source":"live registry read of exactly 1 client whose creative_contract.ts entry maps to generic_quote_card_1x1_v1 (INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.renderer_fixed[footer]=''Invegent'' [8 chars, exact count]; supabase/functions/image-worker/creative_contract.ts:368). PP/NDIS/CFW excluded (map to different templates). derivation: exact observed value length, n=1 (only registered client for this template today), no margin added. date 2026-08-06.","evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Footer.text"]}'::jsonb,
  'b1b74cdec8fb1fdc7d2836162297bb49',
  null,
  'm14_ws1_calibration_backfill_v1'
);

-- QuoteText.max_lines — LEFT to_be_calibrated (NOT called). This element's own `notes`
-- field carries an EXPLICIT, NAMED open production risk: "KNOWN GAP: unlike
-- market_insight/announcement_card, no TMR_WINNER_LAYOUT_GUARD exists for
-- generic_quote_card_1x1_v1 — no structural fix built. cc-0049 result doc: PK visual
-- PASS scoped to two specific renders only, NOT a standing waiver; headline lengths near
-- 180 chars never probed against this box." This is the strongest signal in the whole
-- lane that a number here would be an invented guess, not a grounded calibration.
-- PROBE SPEC: render generic_quote_card_1x1_v1 with QuoteText at a range of lengths up
-- to max_chars=180 (mirroring B1_HEADLINE_MAX_CHARS, since QuoteText.text: f.headline
-- per TMR_WINNER_TEXT_FIELDS), INCLUDING lengths near the 180-char bound the notes flag
-- as never tested, and observe both the wrapped line count AND whether it visually
-- collides with Attribution/SourceLabel/Footer below it (no layout guard exists to
-- prevent this today) — this is a genuine visual-safety probe, not just a line count.

-- No `begin;`/`commit;` wrapper: every statement above is a single
-- autocommit-safe `select public.set_tmr_field_constraints(...)` call — none
-- depend on a shared transaction, and each is independently a whole-object
-- CAS replace (its own atomic UPDATE inside the function). A reviewer running
-- this against a scratch DB may safely wrap the whole file in their own
-- `begin; ... rollback;` for a dry run; this file is never executed by any
-- apply tool regardless.

-- ── ROLLBACK (reference only — NOT executed) ──────────────────────────
-- Each set_tmr_field_constraints call above is a CAS UPDATE, not an INSERT — rollback is
-- simply RE-CALLING set_tmr_field_constraints for the same (template_id, element_name)
-- with p_constraints = the ORIGINAL full JSON given in
-- docs/briefs/artifacts/m14-ws1-live-constraints-baseline-v1.md and
-- p_expected_current_md5 = the NEW md5 this apply would produce (i.e. md5 of the
-- constraints object written above) — never applied here, named for the future apply
-- lane only.
-- END NOT_APPLIED_m14_ws1_calibration_backfill_v1.sql
