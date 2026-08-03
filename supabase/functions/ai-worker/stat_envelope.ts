// stat_envelope.ts — WS-5 P1 PRODUCTION-ENVELOPE ENFORCEMENT for the governed
// video_short_stat / video_short_stat_voice generator (ai-worker).
//
// PK ruling D-1 (Option B): generated stat content is VALIDATED against the persisted
// per-template constraints (c.creative_provider_template_field.constraints, shape
// tmr_field_constraints_v1) for the template public.select_template would pick at render
// time; exactly ONE bounded re-prompt is allowed; a second violation FAILS THE DRAFT CLOSED
// with a named dead_reason. NO silent truncation, NO legacy clamp fallback, NO persistence
// of out-of-envelope content. Both validation attempts are preserved in QA evidence.
//
// House pattern: PURE CORE + THIN IMPURE LOADER. Everything except
// loadStatTemplateEnvelope is pure (no I/O, no Date, no random) and hermetically tested in
// stat_envelope_test.ts. The loader mirrors video-worker's render-time selector call
// EXACTLY (video-worker/index.ts:1345 — p_platform:null, p_variant_intent:null,
// p_seed:postDraftId) so the envelope is read from the SAME template the render worker
// will later enforce. select_template is READ-ONLY (STABLE, no DML — verified against
// supabase/migrations/20260703035154_create_select_template_v1.sql and the 20260719010700
// client-scope revision, both STABLE with zero INSERT/UPDATE/DELETE).
//
// FALLBACK DOCTRINE (fail to BOUNDS, never to a clamp): on ANY envelope miss — selector
// fail-closed, RPC error, missing/unparseable constraints, absent element rows, thrown —
// the loader returns the vendored render-gate char bounds from ./video_stat_bounds.ts
// (12/48/160/90) as VALIDATION limits with source='fallback_char_bounds' and a
// machine-readable fallback_reason. The fallback is still validation: content is never
// truncated to fit it. The loader NEVER throws.
//
// Measurement contract: chars = String(value ?? '').trim().length (UTF-16 code units),
// IDENTICAL to the render gate (b1_video_stat.assertStatFieldsWithinGate) and to
// ./video_stat_bounds.ts. Blank fields are NOT this module's concern — the render gate
// owns the blank/missing check (same doctrine as video_stat_bounds.ts).

import {
  B1_VIDEO_CONTEXT_LINE_MAX_CHARS,
  B1_VIDEO_CTA_TEXT_MAX_CHARS,
  B1_VIDEO_STAT_LABEL_MAX_CHARS,
  B1_VIDEO_STAT_VALUE_MAX_CHARS,
  buildBoundReminder,
} from './video_stat_bounds.ts';

// ── Types ─────────────────────────────────────────────────────────────────────────────

export type StatFieldKey = 'stat_value' | 'stat_label' | 'context_line' | 'cta_text';

// Per-field limits extracted from tmr_field_constraints_v1 text_limits. maxChars is the
// load-bearing bound (always present); maxLines/maxWords are honored WHEN persisted
// (max_words is absent in today's data — tolerated by construction). Unknown text_limits
// keys are IGNORED, never an error.
export type StatFieldLimits = { maxChars: number; maxLines?: number; maxWords?: number };

export type StatEnvelope = {
  source: 'persisted' | 'fallback_char_bounds';
  templateId: string | null;           // registry template id (c.creative_provider_template.id)
  fallbackReason: string | null;       // machine-readable, null when source='persisted'
  limits: Record<StatFieldKey, StatFieldLimits>;
};

// Violation shape mirrors video_stat_bounds.StatBoundViolation ({field, length, max}) plus
// a unit discriminator so line/word violations stay distinguishable in QA evidence.
export type EnvelopeViolation = {
  field: string;
  kind: 'chars' | 'lines' | 'words';
  length: number;
  max: number;
};

export type StatBoundsAttempt = {
  attempt: number;                     // 1 = initial generation, 2 = the ONE bounded re-prompt
  fields: Record<StatFieldKey, string>;
  violations: EnvelopeViolation[];
  at: string;                          // ISO timestamp, caller-supplied (module stays pure)
};

export type StatBoundsOutcome = 'accepted_first_attempt' | 'accepted_after_reprompt' | 'fail_closed';

export type StatBoundsQa = {
  schema: 'stat_bounds_qa_v1';
  envelope: {
    source: StatEnvelope['source'];
    template_id: string | null;
    fallback_reason: string | null;
    limits: Record<StatFieldKey, StatFieldLimits>;
  };
  attempts: StatBoundsAttempt[];
  outcome: StatBoundsOutcome;
  dead_reason?: string;                // present ONLY when outcome='fail_closed'
};

// The named dead_reason PK ruled for the second-violation fail-closed path (D-1).
export const STAT_BOUNDS_DEAD_REASON = 'stat_bounds_violation_after_bounded_reprompt';

// Sentinel returned by the stat generator instead of a script when the draft must die.
// Deliberately does NOT look like a video_script (no stat_value key), so it can never be
// mistaken for renderable content by any consumer.
export type StatBoundsFailClosed = { stat_bounds_fail_closed: true; stat_bounds_qa: StatBoundsQa };

export function isStatBoundsFailClosed(v: unknown): v is StatBoundsFailClosed {
  return !!v && typeof v === 'object' && (v as { stat_bounds_fail_closed?: unknown }).stat_bounds_fail_closed === true;
}

// Registry element_name → generator field key. The four AI-authored text elements of the
// governed stat template (b1_video_stat.ts modification keys StatValue/StatLabel/
// ContextLine/CtaText). EyebrowText is DELIBERATELY absent: it is governed per-client data
// (D-4), never AI-authored, so it has no generator envelope.
export const STAT_ELEMENT_FIELD_MAP: Readonly<Record<string, StatFieldKey>> = {
  StatValue: 'stat_value',
  StatLabel: 'stat_label',
  ContextLine: 'context_line',
  CtaText: 'cta_text',
};

// ── Pure: fallback envelope (vendored render-gate char bounds) ────────────────────────

export function buildFallbackStatEnvelope(reason: string): StatEnvelope {
  return {
    source: 'fallback_char_bounds',
    templateId: null,
    fallbackReason: reason,
    limits: {
      stat_value: { maxChars: B1_VIDEO_STAT_VALUE_MAX_CHARS },
      stat_label: { maxChars: B1_VIDEO_STAT_LABEL_MAX_CHARS },
      context_line: { maxChars: B1_VIDEO_CONTEXT_LINE_MAX_CHARS },
      cta_text: { maxChars: B1_VIDEO_CTA_TEXT_MAX_CHARS },
    },
  };
}

// ── Pure: tmr_field_constraints_v1 parsing ─────────────────────────────────────────────

// A text_limits entry is a limit-TRIPLE { value, basis, source?, evidence_reference? }.
// basis='to_be_calibrated' means value is null → the limit is ABSENT. Any non-object,
// non-finite, or non-positive value is also treated as absent (never a guess).
export function limitTripleValue(triple: unknown): number | null {
  if (!triple || typeof triple !== 'object') return null;
  const t = triple as { basis?: unknown; value?: unknown };
  if (t.basis === 'to_be_calibrated') return null;
  const v = Number(t.value);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
}

// Extract this element's limits from a constraints jsonb. Returns null when the element
// carries no usable max_chars (schema missing, text_limits missing/non-object, max_chars
// absent or to_be_calibrated) — the caller treats that as an envelope miss. Unknown
// text_limits keys (anything besides max_chars/max_lines/max_words) are ignored.
export function extractFieldLimits(constraints: unknown): StatFieldLimits | null {
  const tl = (constraints as { text_limits?: unknown } | null | undefined)?.text_limits;
  if (!tl || typeof tl !== 'object') return null;
  const t = tl as Record<string, unknown>;
  const maxChars = limitTripleValue(t.max_chars);
  if (maxChars === null) return null;
  const out: StatFieldLimits = { maxChars };
  const maxLines = limitTripleValue(t.max_lines);
  if (maxLines !== null) out.maxLines = maxLines;
  const maxWords = limitTripleValue(t.max_words);
  if (maxWords !== null) out.maxWords = maxWords;
  return out;
}

// Build the persisted envelope from the element rows, ALL-OR-NOTHING: every one of the four
// elements must yield a usable max_chars, else the whole envelope is a miss (the caller
// falls back to char bounds — mixed persisted/fallback limits would blur which contract a
// draft was validated against). Returns { ok:false, reason } on any miss.
export function buildEnvelopeFromFieldRows(
  rows: ReadonlyArray<{ element_name?: unknown; constraints?: unknown }>,
  templateId: string,
): { ok: true; envelope: StatEnvelope } | { ok: false; reason: string } {
  const limits: Partial<Record<StatFieldKey, StatFieldLimits>> = {};
  for (const row of rows ?? []) {
    const key = STAT_ELEMENT_FIELD_MAP[String(row?.element_name ?? '')];
    if (!key) continue;                                   // not one of the four — ignore
    const fl = extractFieldLimits(row?.constraints);
    if (fl === null) return { ok: false, reason: `constraints_unusable:${String(row?.element_name)}` };
    limits[key] = fl;
  }
  for (const element of Object.keys(STAT_ELEMENT_FIELD_MAP)) {
    const key = STAT_ELEMENT_FIELD_MAP[element];
    if (!limits[key]) return { ok: false, reason: `element_row_missing:${element}` };
  }
  return {
    ok: true,
    envelope: {
      source: 'persisted',
      templateId,
      fallbackReason: null,
      limits: limits as Record<StatFieldKey, StatFieldLimits>,
    },
  };
}

// ── Pure: envelope validation ──────────────────────────────────────────────────────────

// Human/prompt-readable limit description, e.g. "max 60 chars, max 3 lines". Used to state
// the ACTUAL persisted limits in the generation prompt (D-1: the prompt names the real
// envelope, not hardcoded numbers).
export function describeFieldLimit(l: StatFieldLimits): string {
  const parts = [`max ${l.maxChars} chars`];
  if (l.maxLines !== undefined) parts.push(`max ${l.maxLines} line${l.maxLines === 1 ? '' : 's'}`);
  if (l.maxWords !== undefined) parts.push(`max ${l.maxWords} word${l.maxWords === 1 ? '' : 's'}`);
  return parts.join(', ');
}

// Measurement identical to the render gate: trimmed String, UTF-16 code units for chars.
// Lines = 1 + newline count on the trimmed value; words = whitespace-separated tokens.
// Blank fields yield NO violations here (the render gate owns blanks — same doctrine as
// video_stat_bounds.validateStatScriptBounds). A field exactly AT a limit is conformant.
export function validateStatScriptAgainstEnvelope(
  script: { stat_value?: unknown; stat_label?: unknown; context_line?: unknown; cta_text?: unknown },
  envelope: StatEnvelope,
): EnvelopeViolation[] {
  const violations: EnvelopeViolation[] = [];
  const fields: StatFieldKey[] = ['stat_value', 'stat_label', 'context_line', 'cta_text'];
  for (const field of fields) {
    const trimmed = String((script as Record<string, unknown>)[field] ?? '').trim();
    if (trimmed.length === 0) continue;                   // blanks: render gate's concern
    const l = envelope.limits[field];
    if (trimmed.length > l.maxChars) {
      violations.push({ field, kind: 'chars', length: trimmed.length, max: l.maxChars });
    }
    if (l.maxLines !== undefined) {
      const lines = trimmed.split(/\r?\n/).length;
      if (lines > l.maxLines) violations.push({ field, kind: 'lines', length: lines, max: l.maxLines });
    }
    if (l.maxWords !== undefined) {
      const words = trimmed.split(/\s+/).length;
      if (words > l.maxWords) violations.push({ field, kind: 'words', length: words, max: l.maxWords });
    }
  }
  return violations;
}

// ── Pure: the one-re-prompt-then-fail-closed decision (D-1 state machine) ──────────────

export type StatBoundsDecision = 'accept' | 'reprompt' | 'fail_closed';

// attemptNumber is 1-based. Violations on attempt 1 → exactly ONE re-prompt; violations on
// attempt 2 (or any later — defensive, the caller never goes past 2) → fail closed.
export function decideStatBoundsNextStep(attemptNumber: number, violationCount: number): StatBoundsDecision {
  if (violationCount === 0) return 'accept';
  return attemptNumber <= 1 ? 'reprompt' : 'fail_closed';
}

// ── Pure: re-prompt reminder ───────────────────────────────────────────────────────────

// Bounds-reminder block for the ONE re-prompt: names each violated field with actual vs
// limit. When every violation is a chars violation, this DELEGATES to the Task-A
// buildBoundReminder (video_stat_bounds.ts — unmodifiable, its wording is proven);
// otherwise it emits the same-shaped sentence with unit-aware wording.
export function buildEnvelopeBoundReminder(violations: EnvelopeViolation[]): string {
  if (violations.every((v) => v.kind === 'chars')) {
    return buildBoundReminder(violations.map((v) => ({ field: v.field, length: v.length, max: v.max })));
  }
  const unit = (k: EnvelopeViolation['kind']) => k;
  const measured = violations
    .map((v) => `${v.field} was ${v.length} ${unit(v.kind)} (max ${v.max})`)
    .join(', ');
  const limits = violations
    .map((v) => `${v.field} max ${v.max} ${unit(v.kind)}`)
    .join(', ');
  return `Your previous response violated hard limits: ${measured}. ` +
    `Rewrite so EVERY field is within its limit: ${limits}. Return ONLY the JSON.`;
}

// ── Pure: QA evidence (D-1 mandate — both attempts preserved) ──────────────────────────

// Snapshot the four fields AS GENERATED (stringified verbatim, untrimmed — evidence, not
// content: this object is never rendered).
export function snapshotStatFields(script: {
  stat_value?: unknown; stat_label?: unknown; context_line?: unknown; cta_text?: unknown;
}): Record<StatFieldKey, string> {
  return {
    stat_value: String(script.stat_value ?? ''),
    stat_label: String(script.stat_label ?? ''),
    context_line: String(script.context_line ?? ''),
    cta_text: String(script.cta_text ?? ''),
  };
}

export function buildStatBoundsQa(
  envelope: StatEnvelope,
  attempts: StatBoundsAttempt[],
  outcome: StatBoundsOutcome,
): StatBoundsQa {
  const qa: StatBoundsQa = {
    schema: 'stat_bounds_qa_v1',
    envelope: {
      source: envelope.source,
      template_id: envelope.templateId,
      fallback_reason: envelope.fallbackReason,
      limits: envelope.limits,
    },
    attempts,
    outcome,
  };
  if (outcome === 'fail_closed') qa.dead_reason = STAT_BOUNDS_DEAD_REASON;
  return qa;
}

// ── Impure: the thin envelope loader ──────────────────────────────────────────────────

// Minimal structural view of the service client — keeps the loader mockable in hermetic
// tests without importing @supabase/supabase-js here. Deliberately `any`-returning: binding
// the real supabase-js generic chain here trips TS2589 (excessively deep instantiation) at
// the index.ts call site; the loader guards every read defensively regardless.
type EnvelopeDb = {
  // deno-lint-ignore no-explicit-any
  rpc: (fn: string, args: Record<string, unknown>) => any;
  // deno-lint-ignore no-explicit-any
  schema: (s: string) => any;
};

const errBrief = (e: { code?: string; message?: string } | null | undefined): string =>
  `${e?.code ?? ''}:${String(e?.message ?? '').slice(0, 200)}`;

// Resolve the envelope for the would-be render-time winner. MIRRORS video-worker's
// select_template call EXACTLY (index.ts:1345): p_platform null, p_format
// 'video_short_stat' (the governed format — the _voice generator variant shares the same
// governed template contract), p_variant_intent null, p_seed = post_draft_id (seed never
// changes the winner — select_template v0 contract). NEVER throws; every miss class
// returns the fallback char-bounds envelope with a machine-readable reason.
export async function loadStatTemplateEnvelope(
  supabase: EnvelopeDb,
  clientSlug: string | null,
  postDraftId: string,
): Promise<StatEnvelope> {
  if (!clientSlug) return buildFallbackStatEnvelope('client_slug_unresolved');
  try {
    const { data, error } = await supabase.rpc('select_template', {
      p_client_slug: clientSlug,
      p_platform: null,
      p_format: 'video_short_stat',
      p_variant_intent: null,
      p_seed: postDraftId,
    });
    if (error) return buildFallbackStatEnvelope(`select_template_rpc_error:${errBrief(error)}`);
    const resp = data as { status?: unknown; fail_reason?: unknown; selected?: { template_id?: unknown } | null } | null;
    if (resp?.status !== 'ok') {
      return buildFallbackStatEnvelope(
        `select_template_not_ok:${String(resp?.status ?? 'no_response')}:${String(resp?.fail_reason ?? '')}`.replace(/:$/, ''),
      );
    }
    const templateId = typeof resp.selected?.template_id === 'string' ? resp.selected.template_id : '';
    if (!templateId) return buildFallbackStatEnvelope('select_template_missing_template_id');

    const { data: rows, error: rowsErr } = await supabase.schema('c').from('creative_provider_template_field')
      .select('element_name, constraints')
      .eq('template_id', templateId)
      .in('element_name', Object.keys(STAT_ELEMENT_FIELD_MAP));
    if (rowsErr) return buildFallbackStatEnvelope(`field_rows_read_error:${errBrief(rowsErr)}`);

    const built = buildEnvelopeFromFieldRows(
      (rows ?? []) as Array<{ element_name?: unknown; constraints?: unknown }>,
      templateId,
    );
    if (!built.ok) return buildFallbackStatEnvelope(built.reason);
    return built.envelope;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return buildFallbackStatEnvelope(`envelope_loader_threw:${msg.slice(0, 200)}`);
  }
}
