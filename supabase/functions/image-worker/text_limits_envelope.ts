// text_limits_envelope.ts — M14 WS-3 REGISTRY-DRIVEN TEXT-LIMITS ENFORCEMENT
// (image-worker). The image counterpart of ai-worker/stat_envelope.ts and
// video-worker/b1_video_stat.assertStatFieldsWithinGate: image-worker had ZERO
// `text_limits` reads anywhere in its source (S1 inventory,
// docs/briefs/results/s1-m14-calibration-backfill-inventory-v1.md) — the existing
// hard gates (assertHeadlineWithinGate / B1_SUBTITLE_MAX_CHARS truncation) enforce
// HARDCODED TS constants that happen to match the registry's declared_from_source
// values today, but are NOT read from c.creative_provider_template_field, so a
// future registry-only calibration change would silently NOT take effect at
// render time. This module closes that gap: it reads the WINNER template's
// governed text_limits.max_chars constraints (any winner, any element the winner
// map actually produces — not hardcoded to the two M14 WS-1 templates) and
// enforces them against the RESOLVED text values before the Creatomate render.
//
// House pattern: PURE CORE + THIN IMPURE LOADER, mirroring stat_envelope.ts.
// Everything except loadTextLimitsEnvelope is pure (no I/O, no Date, no random)
// and hermetically tested in text_limits_envelope_test.ts.
//
// GENERALITY (M16 Option C precedent): the module does NOT hardcode element names
// per template. It derives the element set from whatever `.text` keys the
// TMR_WINNER_TEXT_FIELDS[winnerName] mapping actually produced for THIS render
// (extractTextElementValues reads plan.modifications generically), then queries
// the registry for exactly those element_name rows on the winner's
// registry_template_id. A winner with zero governed text_limits rows validates
// zero fields (empty limits map) — never an error.
//
// SCOPE: char-count enforcement only (the load-bearing bound per the M14 WS-1
// baseline — "max_lines is honored WHEN persisted" is stat_envelope's contract,
// NOT adopted here: no line-count enforcement is possible without an actual
// render, and every max_lines triple calibrated by WS-1 stays to_be_calibrated /
// probe_required by design). max_chars is the only limit this module reads or
// enforces.
//
// ── PER-FIELD FAIL-CLOSED / NO-OP CONTRACT (WITHIN a loaded envelope) ─────────
// A field's registry max_chars IS calibrated (non-null, basis != to_be_calibrated)
// AND the resolved value exceeds it -> THROW (fail the draft closed), exactly
// like assertHeadlineWithinGate / b1_video_stat.assertStatFieldsWithinGate — no
// truncation, no AI rewrite. A field's registry max_chars is STILL
// to_be_calibrated / absent (no row, or the row's limit triple is TBC) -> NO-OP
// for that specific field — there is nothing to enforce, and this MUST NOT
// regress a field that renders unconstrained today (e.g. CategoryBadge/Location
// on generic_market_insight_card_1x1_v1 before/without the M14 WS-1 backfill).
//
// ── WHOLE-ENVELOPE-LOAD-FAILURE POSTURE: (b) FAIL-OPEN, DELIBERATE CHOICE ─────
// Two postures were named for a total envelope-load miss (selector/registry
// unreachable, template_id missing, field-rows read error, loader threw):
//   (a) fail-closed to a vendored floor bound, mirroring stat_envelope.ts's
//       buildFallbackStatEnvelope; OR
//   (b) fail-open to "no enforcement, proceed as today" for THAT LOAD FAILURE
//       specifically (a within-envelope over-limit ALWAYS still throws).
// This module implements (b). Reasoning:
//   1. stat_envelope's fallback works because video-worker/ai-worker's FOUR
//      governed fields ALL already carry an established vendored floor
//      (video_stat_bounds.ts: 12/48/160/90) that predates the registry and was
//      independently render-probe-validated. image-worker has NO equivalent
//      floor for 6 of the 8 newly-covered fields (CategoryBadge / Location /
//      Date / Footer / Attribution / SourceLabel never had ANY bound before
//      this lane) — inventing one now to serve as a fallback would violate the
//      same "never invent a value with no citable basis" discipline WS-1 was
//      built under. A fabricated fallback bound is exactly the failure mode
//      this whole programme exists to prevent.
//   2. Fail-closed on a transient DB read hiccup would introduce a BRAND NEW
//      render-blocking failure mode for fields that have ZERO enforcement
//      today (status quo = always renders). That is a regression, not
//      additive/shadow-first behaviour — CLAUDE.md's house convention prefers
//      preserving the existing default path byte-for-byte and adding new
//      behaviour conservatively.
//   3. Headline and Subtitle are NOT weakened by this choice: they keep their
//      OWN existing, independent hard gates (assertHeadlineWithinGate throws at
//      180 chars; deriveB1Subtitle truncates to 90 chars by construction) —
//      those run BEFORE this module and are completely unaffected by whether
//      THIS envelope's load succeeds. This module's own governed check on
//      Headline/Subtitle is belt-and-braces (redundant with, not a replacement
//      for, the existing gates); its fail-open posture on load failure leaves
//      today's real protection on those two fields fully intact.
// A within-envelope over-limit (we DID get a usable max_chars for a field and
// the resolved value exceeds it) is NEVER affected by this posture — that
// branch always throws, matching the fleet's dominant hard-gate convention.
//
// NO side effects in the pure functions: no Deno.serve, no network/secret
// access, no Date.now, no random.

// ── Types ─────────────────────────────────────────────────────────────────────────────

// A limit-TRIPLE per tmr_field_constraints_v1: { value, basis, source?, evidence_reference? }.
// basis='to_be_calibrated' means value is null -> the limit is ABSENT.
export type LimitTriple = { basis?: unknown; value?: unknown } | null | undefined;

export type TextLimitsEnvelope = {
  source: 'persisted' | 'unavailable';
  templateId: string | null;
  fallbackReason: string | null;         // machine-readable, null when source='persisted'
  // element_name -> maxChars, ONLY for elements with a usable (non-TBC) constraint.
  // An element absent from this map has NOTHING to enforce (no-op, never a violation).
  limits: Readonly<Record<string, number>>;
};

export type TextLimitViolation = { field: string; length: number; max: number };

// ── Pure: tmr_field_constraints_v1 limit-triple parsing (mirrors stat_envelope.limitTripleValue) ──

export function limitTripleMaxChars(triple: LimitTriple): number | null {
  if (!triple || typeof triple !== 'object') return null;
  const t = triple as { basis?: unknown; value?: unknown };
  if (t.basis === 'to_be_calibrated') return null;
  const v = Number(t.value);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
}

// Extract max_chars from a single field row's `constraints` jsonb. Returns null when
// the element carries no usable max_chars (schema missing, text_limits missing/
// non-object, max_chars absent, or basis='to_be_calibrated') — the caller treats that
// as "no bound for this element" (no-op), NOT an envelope-load failure.
export function extractMaxChars(constraints: unknown): number | null {
  const tl = (constraints as { text_limits?: unknown } | null | undefined)?.text_limits;
  if (!tl || typeof tl !== 'object') return null;
  return limitTripleMaxChars((tl as Record<string, unknown>).max_chars as LimitTriple);
}

// Build the limits map from field rows, PARTIALLY — unlike stat_envelope's
// all-or-nothing StatFieldKey shape (a closed 4-key set), this is an OPEN set keyed by
// whatever element names the caller asked for. A row with no usable max_chars is simply
// OMITTED from the result (per-field no-op), never a whole-envelope failure — this is
// the deliberate divergence from stat_envelope's all-or-nothing contract, because
// image-worker's fields are a heterogeneous mix of calibrated and still-TBC triples
// (M14 WS-1 backfill leaves several TBC by design) that must coexist in one render.
export function buildLimitsFromFieldRows(
  rows: ReadonlyArray<{ element_name?: unknown; constraints?: unknown }>,
): Record<string, number> {
  const limits: Record<string, number> = {};
  for (const row of rows ?? []) {
    const name = typeof row?.element_name === 'string' ? row.element_name : '';
    if (!name) continue;
    const maxChars = extractMaxChars(row?.constraints);
    if (maxChars !== null) limits[name] = maxChars;
  }
  return limits;
}

// ── Pure: element-name -> value extraction from a Creatomate modifications map ─────────

// Generic across ANY winner: reads whatever '<Element>.text' keys the winner's
// TMR_WINNER_TEXT_FIELDS mapping produced (b1_production.ts), independent of which
// template it is. Non-string values at a '.text' key are ignored (defensive — every
// live winner map emits strings, but this module must not throw on a shape surprise
// that is not itself a length violation).
export function extractTextElementValues(
  modifications: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const suffix = '.text';
  for (const key of Object.keys(modifications ?? {})) {
    if (!key.endsWith(suffix)) continue;
    const value = modifications[key];
    if (typeof value === 'string') out[key.slice(0, -suffix.length)] = value;
  }
  return out;
}

// ── Pure: validation ────────────────────────────────────────────────────────────────

// Measurement: trimmed string length (UTF-16 code units) — mirrors
// assertHeadlineWithinGate / assertStatFieldsWithinGate exactly. Blank fields yield NO
// violation here (blank/missing is each field's OWN concern — e.g. Headline's blank
// check already lives in assertHeadlineWithinGate and runs before this module).
// Iterates fields in SORTED key order for a deterministic first-violation report.
export function validateTextFieldsAgainstLimits(
  fields: Readonly<Record<string, string | number | null | undefined>>,
  limits: Readonly<Record<string, number>>,
): TextLimitViolation[] {
  const violations: TextLimitViolation[] = [];
  for (const field of Object.keys(fields).sort()) {
    const max = limits[field];
    if (max === undefined) continue;                 // no governed bound for this field — no-op
    const trimmed = String(fields[field] ?? '').trim();
    if (trimmed.length === 0) continue;               // blank handling is each field's own concern
    if (trimmed.length > max) violations.push({ field, length: trimmed.length, max });
  }
  return violations;
}

// Hard-gate assertion. THROWS on the first violation (fail loud, no truncation, no AI
// rewrite) — mirrors b1_video_stat.assertStatFieldsWithinGate's wording style exactly
// ("b1_video: {field} length {n} exceeds max_chars={max}"). A field with no governed
// bound (limits[field] === undefined) is a silent no-op, per the per-field contract
// above.
export function assertTextFieldsWithinRegistryLimits(
  fields: Readonly<Record<string, string | number | null | undefined>>,
  limits: Readonly<Record<string, number>>,
): void {
  const violations = validateTextFieldsAgainstLimits(fields, limits);
  if (violations.length > 0) {
    const v = violations[0];
    throw new Error(
      `image_worker_text_limits: ${v.field} length ${v.length} exceeds max_chars=${v.max} (registry-governed, no truncation / no AI rewrite)`,
    );
  }
}

// ── Impure: the thin envelope loader ──────────────────────────────────────────────────

// Minimal structural view of the service client — keeps the loader mockable in
// hermetic tests without importing @supabase/supabase-js here (mirrors stat_envelope's
// EnvelopeDb / TS2589 excessive-instantiation avoidance).
type EnvelopeDb = {
  // deno-lint-ignore no-explicit-any
  schema: (s: string) => any;
};

const errBrief = (e: { code?: string; message?: string } | null | undefined): string =>
  `${e?.code ?? ''}:${String(e?.message ?? '').slice(0, 200)}`;

// Resolve the text-limits envelope for the ALREADY-SELECTED winner (templateId = the
// caller's plan.tmrEvidence.registry_template_id from the SAME select_template response
// the render will use — this module does NOT call select_template itself; the caller
// has already resolved the winner via buildTmrRenderPlan). elementNames is the set to
// fetch (derived by the caller from extractTextElementValues, so exactly the elements
// THIS render actually produced text for). NEVER throws — every miss class (missing
// templateId, empty elementNames, DB read error, thrown exception) returns an
// 'unavailable' envelope with limits={} (fail-OPEN posture (b), see module header) and a
// machine-readable fallbackReason. A read that succeeds but returns zero usable rows is
// still source='persisted' with an empty/partial limits map — that is NOT a load
// failure, it is a correct (if under-calibrated) read (per-field no-op, not fail-open).
export async function loadTextLimitsEnvelope(
  supabase: EnvelopeDb,
  templateId: string | null,
  elementNames: readonly string[],
): Promise<TextLimitsEnvelope> {
  if (!templateId) {
    return { source: 'unavailable', templateId: null, fallbackReason: 'missing_template_id', limits: {} };
  }
  const names = [...new Set(elementNames.filter((n) => typeof n === 'string' && n.length > 0))];
  if (names.length === 0) {
    // Nothing to check — a correct (not failed) empty read, not the fail-open path.
    return { source: 'persisted', templateId, fallbackReason: null, limits: {} };
  }
  try {
    const { data: rows, error } = await supabase
      .schema('c')
      .from('creative_provider_template_field')
      .select('element_name, constraints')
      .eq('template_id', templateId)
      .in('element_name', names);
    if (error) {
      return { source: 'unavailable', templateId, fallbackReason: `field_rows_read_error:${errBrief(error)}`, limits: {} };
    }
    const limits = buildLimitsFromFieldRows((rows ?? []) as Array<{ element_name?: unknown; constraints?: unknown }>);
    return { source: 'persisted', templateId, fallbackReason: null, limits };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { source: 'unavailable', templateId, fallbackReason: `envelope_loader_threw:${msg.slice(0, 200)}`, limits: {} };
  }
}
