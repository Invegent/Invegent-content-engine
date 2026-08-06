# M14 WS-1 — Live Constraints Baseline (`generic_market_insight_card_1x1_v1` + `generic_quote_card_1x1_v1`)

**Read at:** 2026-08-06, live query against Supabase project `mbkmaxqhsohbtwsqolns`, orchestrator-run
(`mcp__supabase__execute_sql`, SELECT-only, zero writes). This is the CURRENT LIVE state, post the
v6.126 WS-5 metadata-population apply (`docs/briefs/results/ws5-metadata-population-closeout-result-v1.md`)
— both templates already carry live field constraints; WS-1's job is to fill in the `to_be_calibrated`
placeholders within them, NOT to bootstrap from NULL.

**Governing write RPC:** `public.set_tmr_field_constraints(p_template_id uuid, p_element_name text,
p_constraints jsonb, p_expected_current_md5 text default null, p_field_kind text default null,
p_recorded_by text default null)` (`supabase/migrations/20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql:468-533`).
**This is a WHOLE-OBJECT REPLACE under CAS, not a JSON patch** — `p_constraints` must be the FULL new
constraints object (every existing key preserved except the ones you are calibrating), and
`p_expected_current_md5` must equal `md5(current_constraints::text)` EXACTLY (the current row is
non-null for every element below, so `p_expected_current_md5` is REQUIRED, not optional — passing
`null` when current is non-null returns `cas_mismatch`, not a bootstrap). The exact current md5 for
every element in scope is given below — use it verbatim; do not recompute from the JSON printed here
in case of any whitespace/key-order serialization difference (Postgres `::text` cast has a canonical
form; if in doubt, treat the md5 given here as authoritative since it was computed DB-side).

**Validator (`c.tmr_validate_field_constraints`) rules that apply to every write:** schema_version
must stay `'tmr_field_constraints_v1'`; only these top-level keys are allowed:
`schema_version, modification_keys, slot, content_source, empty_ok, text_limits, overflow_risk,
container, collapse, asset, baked, notes`; `text_limits` triples must have shape
`{value, basis, source?, evidence_reference?}` with `basis` one of `declared_from_source` |
`probe_calibrated` | `to_be_calibrated`; `to_be_calibrated` REQUIRES `value:null`; any other basis
REQUIRES `value` to be a positive number; `declared_from_source` REQUIRES a non-empty `source` string;
`probe_calibrated` REQUIRES a non-empty `evidence_reference` string. **Do not invent a value with no
citable basis** — if you cannot ground a number, leave that triple `to_be_calibrated` and mark it
`probe_required` in your result write-up instead.

---

## Template ids

- `generic_market_insight_card_1x1_v1` → `template_id = 0e006c5c-45aa-4829-82ec-89dd282a8c56`
- `generic_quote_card_1x1_v1` → `template_id = 1cfe0f9c-3810-4bf1-8785-083fead4eefe`

## `generic_market_insight_card_1x1_v1` — 9 field rows, current live `constraints` + md5

Only the 6 elements with an open `to_be_calibrated` triple are reproduced with their FULL current
constraints JSON below (you need the full object to do a whole-object replace); the other 3
(Background/Logo/Scrim — no `text_limits` key at all, not text fields) are NOT in scope for WS-1's
calibration pass and are listed only for completeness at the end.

### Headline (md5 `1c08b2b90ad4d5b30187ac475eeeb9d9`) — target: `max_lines`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"assertHeadlineWithinGate (b1_production.ts:102) also enforces an unbreakable-token bound of 40 chars (B1_HEADLINE_MAX_TOKEN_CHARS, b1_production.ts:47) — not representable in the max_chars/max_lines/min_font_px vocabulary, recorded here for completeness. Hard-gate field: throws on blank or over-180-char headline before any render call.","collapse":{"collapsible":false},"empty_ok":false,"container":{"summary":"Top-anchored y26%, height capped 22% (bottom ≈518px/1080), font auto-shrinks 30-74px — cc-0033a overprint fix. Source: b1_production.ts:281-292."},"text_limits":{"max_chars":{"basis":"declared_from_source","value":180,"source":"supabase/functions/image-worker/b1_production.ts:41 (B1_HEADLINE_MAX_CHARS)","evidence_reference":null},"max_lines":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"high","content_source":"ai_authored","schema_version":"tmr_field_constraints_v1","modification_keys":["Headline.text"]}
```
Note: `max_chars` is already `declared_from_source`, non-TBC — do not touch it, only fill `max_lines`.
The container geometry (font auto-shrinks 30-74px within a height-capped box) is DESCRIPTIVE, not a
formula — deriving an exact line-count bound from it requires knowing the actual glyph-width-at-each-
font-size behavior, which is a render-time property, not something computable from the geometry summary
alone. Judge for yourself whether this is safely derivable or must be `probe_required`.

### Subtitle (md5 `439319ebadd5c4a1e2f441736b9af98a`) — target: `max_lines`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Derived via deriveB1Subtitle (b1_production.ts:59-67): first non-empty paragraph of draft_body, truncated to 90 chars — worker_computed, not ai_authored. overflow_risk=high: per b1_production.ts:275-276, Subtitle has no declared y/height bound of its own (falls back to provider default y540); cc-0033a fixed only Headline's box. No container geometry evidence exists in source for this element.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"declared_from_source","value":90,"source":"supabase/functions/image-worker/b1_production.ts:52 (B1_SUBTITLE_MAX_CHARS)","evidence_reference":null},"max_lines":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"high","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Subtitle.text"]}
```
Note: explicitly "no container geometry evidence exists in source for this element" per its own notes
field — there is NO geometric basis to derive `max_lines` from at all. This one has essentially no
paper-first path; treat accordingly.

### CategoryBadge (md5 `f63f4282a5d10394529f2389d32b916f`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Resolved via resolveCreativeContract(...).fields.renderer_fixed['category'] (branch_b_proof.ts:86-93, TMR D6-5) — per-client governed brand-payload string, not ai_authored, not template-fixed. Classified worker_computed as closest vocabulary fit; flagged as an open question — no vocabulary value exists for 'per-client governed contract text'. No max_chars ever declared; overflow_risk=low is an assessment, not probe evidence.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["CategoryBadge.text"]}
```

### Location (md5 `fc3ff2b5c8fcc6e1409f6e6c71b3b557`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Resolved via resolveCreativeContract(...).fields.renderer_fixed['location'] (branch_b_proof.ts:95), OPTIONAL — defaults to '' when the client's contract omits it. Same worker_computed classification and open-vocabulary-question as CategoryBadge above.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Location.text"]}
```

### Date (md5 `9c29cef29695e141f645c92657a3feda`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"formatProofDate (branch_b_proof.ts:57-59) emits a deterministic 'D Month YYYY' string at render time — worker_computed, always present. Mechanically bounded (≤18 chars) but no MAX_CHARS constant exists in source, so max_chars stays to_be_calibrated per the never-invent discipline.","collapse":{"collapsible":false},"empty_ok":false,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Date.text"]}
```
Note: read `formatProofDate` in `supabase/functions/image-worker/branch_b_proof.ts:57-59` yourself and
compute the TRUE worst case exactly (the note above says "≤18 chars" but does not show the arithmetic —
verify it rather than trusting the prose; this is a strong `declared_from_source` candidate since the
format is deterministic and code-derivable, no probe needed, IF you show your own working from the
actual function).

### Footer (md5 `3162b10e3702690d9ddba94d7e03d241`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Resolved via resolveCreativeContract(...).fields.renderer_fixed['footer'] (branch_b_proof.ts:91), REQUIRED at the contract level but not required_for_render at the template-field level per the live registry row. Same worker_computed classification as CategoryBadge/Location/Date above.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Footer.text"]}
```

Not in scope (no `text_limits` key, non-text field kinds — do not touch):
`Background` (md5 `8c85d8869352937395e5cf433aa1a7a4`), `Logo` (md5 `86083591ef37fdfbafed845d2c99fbfd`),
`Scrim` (md5 `96d7893922ea2492c3107c9ea031efcc`).

## `generic_quote_card_1x1_v1` — 8 field rows

### QuoteText (md5 `84a920257b1237587bf14f423dd709ca`) — target: `max_lines`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"KNOWN GAP: unlike market_insight/announcement_card, no TMR_WINNER_LAYOUT_GUARD exists for generic_quote_card_1x1_v1 — no structural fix built. cc-0049 result doc: PK visual PASS scoped to two specific renders only, NOT a standing waiver; headline lengths near 180 chars never probed against this box. overflow_risk=high reflects this open, named risk.","collapse":{"collapsible":false},"empty_ok":false,"text_limits":{"max_chars":{"basis":"declared_from_source","value":180,"source":"supabase/functions/image-worker/b1_production.ts:41 (B1_HEADLINE_MAX_CHARS) via TMR_WINNER_TEXT_FIELDS['generic_quote_card_1x1_v1']: QuoteText.text: f.headline (b1_production.ts:241)","evidence_reference":null},"max_lines":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"high","content_source":"ai_authored","schema_version":"tmr_field_constraints_v1","modification_keys":["QuoteText.text"]}
```
Note: this element's own `notes` field explicitly documents an OPEN, NAMED production risk (no layout
guard, never probed near 180 chars) — this is about as strong a signal as exists in this whole lane
that `max_lines` here is genuinely `probe_required`, not paper-derivable. Do not force a number here.

### Attribution (md5 `c843c47f916cafeee868456387d101ad`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"cc-0049 fail-closed field: resolved via resolveCreativeContract(...).fields.renderer_fixed['attribution'] (branch_b_proof.ts:112-113) — per-client value declared only by clients using this winner, never a template default. buildTmrRenderPlan throws tmr_winner_brand_fields_missing if attribution+source_label aren't both declared. No max_chars measured.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"medium","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Attribution.text"]}
```

### SourceLabel (md5 `0f344dc3eebbd2865683ca6b560c2159`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Same fail-closed pairing as Attribution (branch_b_proof.ts:114-115) — resolved via resolveCreativeContract(...).fields.renderer_fixed['source_label']. buildTmrRenderPlan throws tmr_winner_brand_fields_missing if a client selects this winner without both Attribution and SourceLabel declared.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["SourceLabel.text"]}
```

### Footer (md5 `b1b74cdec8fb1fdc7d2836162297bb49`) — target: `max_chars`
```json
{"slot":{"slot_key":"card","activation":"persistent"},"notes":"Same governed brand-payload resolution as market-insight's Footer (branch_b_proof.ts:91, TMR D6-5). Live registry's Footer row for this template carries element_id d306d254... (a UUID) rather than literal 'Footer' — a capture inconsistency, not a defect; element_name column itself reads 'Footer'.","collapse":{"collapsible":false},"empty_ok":true,"text_limits":{"max_chars":{"basis":"to_be_calibrated","value":null,"source":null,"evidence_reference":null}},"overflow_risk":"low","content_source":"worker_computed","schema_version":"tmr_field_constraints_v1","modification_keys":["Footer.text"]}
```

Not in scope: `Background` (md5 `6a493bf1d2bf36a6082d3a2010a70986`), `Logo` (md5 `41401dff8fbfe8bed6a2b7fdcef74a04`),
`QuoteMark` (md5 `5fad45481d707becbeff1bb3241ca0af`), `Scrim` (md5 `4776f71e2797d281a0ea89882c86e178`).

## Where to find the per-client governed VALUES for CategoryBadge/Location/Footer/Attribution/SourceLabel

`supabase/functions/image-worker/creative_contract.ts` is an in-code, hand-authored, per-client
registry (`CREATIVE_CONTRACT_REGISTRY`, keyed on `client_id::recommended_format`) of the EXACT
`renderer_fixed` string values each client's contract declares for `category`/`footer`/`location`/
`attribution`/`source_label`/`cta`. Read this file directly (no DB query needed — it's committed
source, not live state, so there's no drift risk reading it as-is). **Important nuance to verify
yourself, do not assume:** this registry's header comment says it is used for "ADDITIVE STAMPING
ONLY" on a specific PP-image_quote-gated path, but `branch_b_proof.ts`'s own `buildProofFieldsFromDraft`
(cited as the actual source in the constraints `notes` fields above) calls `resolveCreativeContract`
directly to build category/footer/location for the RENDER itself — check `branch_b_proof.ts` and
`b1_production.ts`'s `TMR_WINNER_TEXT_FIELDS` mapping yourself to confirm exactly which clients'
values actually flow through THIS registry for THESE TWO SPECIFIC TEMPLATES (`generic_market_insight_card_1x1_v1`,
`generic_quote_card_1x1_v1`) versus any other rendering path. The registry currently has exactly 4
entries (PP/NDIS/CFW/Invegent), each mapped via `maps_to_variant.implementation_id` to ONE specific
template — read which of the 4 actually maps to each of the two target templates before using their
values as your derivation basis, and do NOT assume all 4 brands' values apply to both templates just
because the M14 inventory table lists both as "4-brand exposure" (that count may come from a different
system — the general TMR client-assignment table — than this specific hardcoded contract registry).
If you find fewer than 4 clients' values genuinely grounding a given field for a given template, use
only what you can actually verify, and say so explicitly rather than assuming full coverage.

**`location` observation across all 4 registered clients: every single one is `''` (empty string)** —
there is currently ZERO evidence of what a populated `location` value would look like or how long it
could be. Think carefully about whether "declared_from_source: max_chars=1" (matching 100% observed
evidence) or a more generous placeholder is defensible, or whether this one is honestly `probe_required`
/ stays `to_be_calibrated` — this is a genuine judgment call, make it explicitly and explain your
reasoning rather than picking a number silently.
