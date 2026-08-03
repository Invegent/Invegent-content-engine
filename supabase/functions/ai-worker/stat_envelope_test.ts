// stat_envelope_test.ts — WS-5 P1 hermetic unit tests for the stat production-envelope
// module (D-1 Option B). Fully hermetic: NO DB, NO network, NO Date/random inside the
// assertions (timestamps are caller-supplied fixtures). The loader is exercised against a
// hand-rolled chainable supabase stub (house pattern: schedule_authority_pin_test.ts).
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/stat_envelope_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  buildBoundReminder,
  B1_VIDEO_CONTEXT_LINE_MAX_CHARS,
  B1_VIDEO_CTA_TEXT_MAX_CHARS,
  B1_VIDEO_STAT_LABEL_MAX_CHARS,
  B1_VIDEO_STAT_VALUE_MAX_CHARS,
} from './video_stat_bounds.ts';
import {
  buildEnvelopeBoundReminder,
  buildEnvelopeFromFieldRows,
  buildFallbackStatEnvelope,
  buildStatBoundsQa,
  decideStatBoundsNextStep,
  describeFieldLimit,
  extractFieldLimits,
  isStatBoundsFailClosed,
  limitTripleValue,
  loadStatTemplateEnvelope,
  snapshotStatFields,
  STAT_BOUNDS_DEAD_REASON,
  validateStatScriptAgainstEnvelope,
  type StatBoundsAttempt,
  type StatEnvelope,
} from './stat_envelope.ts';

// ── Fixtures ───────────────────────────────────────────────────────────────────────────

// The LIVE tmr_field_constraints_v1 shape (real example from the WS-5 metadata population —
// a limit-TRIPLE per text_limits key; unknown sibling keys must be tolerated).
const LIVE_CONSTRAINTS = {
  slot: { kind: 'text' },
  collapse: { mode: 'none' },
  empty_ok: false,
  container: { w: 980, h: 220 },
  text_limits: {
    max_chars: { basis: 'declared_from_source', value: 60, source: 'ws5-probe', evidence_reference: null },
    max_lines: { basis: 'probe_calibrated', value: 3, source: 'ws5-probe', evidence_reference: 'probe-7' },
  },
  overflow_risk: 'high',
  content_source: 'ai_authored',
  schema_version: 'tmr_field_constraints_v1',
  modification_keys: ['HookHeadline.text', 'HookHeadline.time', 'HookHeadline.duration'],
};

const triple = (value: number | null, basis = 'declared_from_source') => ({ basis, value, source: 's', evidence_reference: null });

const fieldRow = (element: string, maxChars: number, extra: Record<string, unknown> = {}) => ({
  element_name: element,
  constraints: { schema_version: 'tmr_field_constraints_v1', text_limits: { max_chars: triple(maxChars), ...extra } },
});

const ALL_FOUR_ROWS = [
  fieldRow('StatValue', 12),
  fieldRow('StatLabel', 48, { max_lines: triple(2, 'probe_calibrated') }),
  fieldRow('ContextLine', 160),
  fieldRow('CtaText', 90),
];

const TEMPLATE_ID = 'a3d8472d-0000-0000-0000-000000000001';

// A persisted envelope with chars+lines+words limits for the validation tests.
const RICH_ENVELOPE: StatEnvelope = {
  source: 'persisted',
  templateId: TEMPLATE_ID,
  fallbackReason: null,
  limits: {
    stat_value: { maxChars: 12 },
    stat_label: { maxChars: 48, maxLines: 2 },
    context_line: { maxChars: 160, maxWords: 10 },
    cta_text: { maxChars: 90 },
  },
};

const CONFORMANT = {
  stat_value: '$62.17/hr',
  stat_label: 'Median Perth rental yield',
  context_line: 'Perth rents climbed again this quarter.',
  cta_text: 'What does this mean for your next move?',
};

// ── limitTripleValue / extractFieldLimits (constraints parsing) ────────────────────────

Deno.test('limitTripleValue: live triple → its numeric value', () => {
  assertEquals(limitTripleValue(LIVE_CONSTRAINTS.text_limits.max_chars), 60);
  assertEquals(limitTripleValue(LIVE_CONSTRAINTS.text_limits.max_lines), 3);
});

Deno.test('limitTripleValue: to_be_calibrated → absent (null), regardless of value', () => {
  assertEquals(limitTripleValue({ basis: 'to_be_calibrated', value: null }), null);
  assertEquals(limitTripleValue({ basis: 'to_be_calibrated', value: 40 }), null);
});

Deno.test('limitTripleValue: non-object / non-finite / non-positive → absent', () => {
  assertEquals(limitTripleValue(null), null);
  assertEquals(limitTripleValue(60), null);
  assertEquals(limitTripleValue({ basis: 'declared_from_source', value: 'sixty' }), null);
  assertEquals(limitTripleValue({ basis: 'declared_from_source', value: 0 }), null);
  assertEquals(limitTripleValue({ basis: 'declared_from_source', value: -5 }), null);
});

Deno.test('extractFieldLimits: live constraints fixture → chars + lines, no words', () => {
  assertEquals(extractFieldLimits(LIVE_CONSTRAINTS), { maxChars: 60, maxLines: 3 });
});

Deno.test('extractFieldLimits: unknown text_limits keys are IGNORED, never an error', () => {
  const c = {
    text_limits: {
      max_chars: triple(60),
      max_glyph_width_px: triple(940),          // future/unknown key — must be ignored
      some_new_thing: { whatever: true },       // non-triple unknown — must be ignored
    },
  };
  assertEquals(extractFieldLimits(c), { maxChars: 60 });
});

Deno.test('extractFieldLimits: honors max_words when present (future key, absent today)', () => {
  const c = { text_limits: { max_chars: triple(60), max_words: triple(9, 'probe_calibrated') } };
  assertEquals(extractFieldLimits(c), { maxChars: 60, maxWords: 9 });
});

Deno.test('extractFieldLimits: missing/unusable max_chars → null (envelope miss)', () => {
  assertEquals(extractFieldLimits({}), null);
  assertEquals(extractFieldLimits({ text_limits: {} }), null);
  assertEquals(extractFieldLimits({ text_limits: { max_chars: { basis: 'to_be_calibrated', value: null } } }), null);
  assertEquals(extractFieldLimits(null), null);
  assertEquals(extractFieldLimits('not an object'), null);
});

// ── buildEnvelopeFromFieldRows ──────────────────────────────────────────────────────────

Deno.test('buildEnvelopeFromFieldRows: all four elements usable → persisted envelope', () => {
  const built = buildEnvelopeFromFieldRows(ALL_FOUR_ROWS, TEMPLATE_ID);
  assert(built.ok);
  assertEquals(built.envelope.source, 'persisted');
  assertEquals(built.envelope.templateId, TEMPLATE_ID);
  assertEquals(built.envelope.fallbackReason, null);
  assertEquals(built.envelope.limits.stat_value, { maxChars: 12 });
  assertEquals(built.envelope.limits.stat_label, { maxChars: 48, maxLines: 2 });
  assertEquals(built.envelope.limits.context_line, { maxChars: 160 });
  assertEquals(built.envelope.limits.cta_text, { maxChars: 90 });
});

Deno.test('buildEnvelopeFromFieldRows: a missing element row → miss with named reason', () => {
  const built = buildEnvelopeFromFieldRows(ALL_FOUR_ROWS.filter((r) => r.element_name !== 'CtaText'), TEMPLATE_ID);
  assertEquals(built, { ok: false, reason: 'element_row_missing:CtaText' });
});

Deno.test('buildEnvelopeFromFieldRows: an element with unusable constraints → miss (all-or-nothing)', () => {
  const rows = [
    ...ALL_FOUR_ROWS.filter((r) => r.element_name !== 'StatLabel'),
    { element_name: 'StatLabel', constraints: { text_limits: { max_chars: { basis: 'to_be_calibrated', value: null } } } },
  ];
  const built = buildEnvelopeFromFieldRows(rows, TEMPLATE_ID);
  assertEquals(built, { ok: false, reason: 'constraints_unusable:StatLabel' });
});

Deno.test('buildEnvelopeFromFieldRows: extra non-stat elements (e.g. EyebrowText) are ignored', () => {
  const rows = [...ALL_FOUR_ROWS, { element_name: 'EyebrowText', constraints: { baked: { eyebrow_value_ndis_yarns: 'NDIS UPDATE' } } }];
  const built = buildEnvelopeFromFieldRows(rows, TEMPLATE_ID);
  assert(built.ok);
});

// ── Fallback envelope ───────────────────────────────────────────────────────────────────

Deno.test('buildFallbackStatEnvelope: vendored render-gate char bounds + machine-readable reason', () => {
  const env = buildFallbackStatEnvelope('select_template_fail_closed:no_selectable_template');
  assertEquals(env.source, 'fallback_char_bounds');
  assertEquals(env.templateId, null);
  assertEquals(env.fallbackReason, 'select_template_fail_closed:no_selectable_template');
  assertEquals(env.limits.stat_value.maxChars, B1_VIDEO_STAT_VALUE_MAX_CHARS);
  assertEquals(env.limits.stat_label.maxChars, B1_VIDEO_STAT_LABEL_MAX_CHARS);
  assertEquals(env.limits.context_line.maxChars, B1_VIDEO_CONTEXT_LINE_MAX_CHARS);
  assertEquals(env.limits.cta_text.maxChars, B1_VIDEO_CTA_TEXT_MAX_CHARS);
  // Fallback carries char bounds ONLY — no lines/words invented.
  assertEquals(env.limits.stat_label.maxLines, undefined);
});

// ── describeFieldLimit (prompt limit text) ─────────────────────────────────────────────

Deno.test('describeFieldLimit: chars only / chars+lines / chars+lines+words', () => {
  assertEquals(describeFieldLimit({ maxChars: 12 }), 'max 12 chars');
  assertEquals(describeFieldLimit({ maxChars: 60, maxLines: 3 }), 'max 60 chars, max 3 lines');
  assertEquals(describeFieldLimit({ maxChars: 60, maxLines: 1, maxWords: 9 }), 'max 60 chars, max 1 line, max 9 words');
});

// ── validateStatScriptAgainstEnvelope ───────────────────────────────────────────────────

Deno.test('validate: conformant script → no violations', () => {
  assertEquals(validateStatScriptAgainstEnvelope(CONFORMANT, RICH_ENVELOPE), []);
});

Deno.test('validate: boundary-exact is conformant (strictly-greater), one over violates', () => {
  const exact = { ...CONFORMANT, cta_text: 'q'.repeat(90) };
  assertEquals(validateStatScriptAgainstEnvelope(exact, RICH_ENVELOPE), []);
  const over = { ...CONFORMANT, cta_text: 'q'.repeat(91) };
  assertEquals(validateStatScriptAgainstEnvelope(over, RICH_ENVELOPE), [
    { field: 'cta_text', kind: 'chars', length: 91, max: 90 },
  ]);
});

Deno.test('validate: max_lines violation detected (kind=lines); at-limit conformant', () => {
  const two = { ...CONFORMANT, stat_label: 'line one\nline two' };
  assertEquals(validateStatScriptAgainstEnvelope(two, RICH_ENVELOPE), []);
  const three = { ...CONFORMANT, stat_label: 'one\ntwo\nthree' };
  assertEquals(validateStatScriptAgainstEnvelope(three, RICH_ENVELOPE), [
    { field: 'stat_label', kind: 'lines', length: 3, max: 2 },
  ]);
});

Deno.test('validate: max_words violation detected (kind=words); at-limit conformant', () => {
  const ten = { ...CONFORMANT, context_line: 'w1 w2 w3 w4 w5 w6 w7 w8 w9 w10' };
  assertEquals(validateStatScriptAgainstEnvelope(ten, RICH_ENVELOPE), []);
  const eleven = { ...CONFORMANT, context_line: 'w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11' };
  assertEquals(validateStatScriptAgainstEnvelope(eleven, RICH_ENVELOPE), [
    { field: 'context_line', kind: 'words', length: 11, max: 10 },
  ]);
});

Deno.test('validate: measurement matches the render gate (trimmed UTF-16 units, emoji = 2)', () => {
  // 👇 is 2 UTF-16 code units — same measurement doctrine as video_stat_bounds/the gate.
  const v = validateStatScriptAgainstEnvelope({ ...CONFORMANT, stat_value: '1234567890👇' }, RICH_ENVELOPE);
  assertEquals(v, []); // 10 + 2 = 12 = at limit
  const over = validateStatScriptAgainstEnvelope({ ...CONFORMANT, stat_value: '12345678901👇' }, RICH_ENVELOPE);
  assertEquals(over, [{ field: 'stat_value', kind: 'chars', length: 13, max: 12 }]);
});

Deno.test('validate: blank fields are NOT violations (render gate owns blanks)', () => {
  assertEquals(validateStatScriptAgainstEnvelope({ stat_value: '', stat_label: '  ', cta_text: undefined }, RICH_ENVELOPE), []);
});

// ── decideStatBoundsNextStep (the D-1 state machine, pure) ─────────────────────────────

Deno.test('decide: no violations → accept (both attempts)', () => {
  assertEquals(decideStatBoundsNextStep(1, 0), 'accept');
  assertEquals(decideStatBoundsNextStep(2, 0), 'accept');
});

Deno.test('decide: violations on attempt 1 → exactly one re-prompt', () => {
  assertEquals(decideStatBoundsNextStep(1, 1), 'reprompt');
  assertEquals(decideStatBoundsNextStep(1, 4), 'reprompt');
});

Deno.test('decide: violations on attempt 2 (or later, defensive) → fail_closed', () => {
  assertEquals(decideStatBoundsNextStep(2, 1), 'fail_closed');
  assertEquals(decideStatBoundsNextStep(3, 1), 'fail_closed');
});

// ── buildEnvelopeBoundReminder ─────────────────────────────────────────────────────────

Deno.test('reminder: all-chars violations DELEGATE to the Task-A buildBoundReminder verbatim', () => {
  const v = [{ field: 'cta_text', kind: 'chars' as const, length: 133, max: 90 }];
  assertEquals(buildEnvelopeBoundReminder(v), buildBoundReminder([{ field: 'cta_text', length: 133, max: 90 }]));
});

Deno.test('reminder: mixed-kind violations name units and demand JSON-only', () => {
  const v = [
    { field: 'cta_text', kind: 'chars' as const, length: 133, max: 90 },
    { field: 'stat_label', kind: 'lines' as const, length: 3, max: 2 },
  ];
  const r = buildEnvelopeBoundReminder(v);
  assert(r.includes('cta_text was 133 chars (max 90)'));
  assert(r.includes('stat_label was 3 lines (max 2)'));
  assert(r.includes('stat_label max 2 lines'));
  assert(r.includes('Return ONLY the JSON.'));
});

// ── QA evidence shape ──────────────────────────────────────────────────────────────────

Deno.test('QA: both attempts preserved, envelope echoed, fail_closed carries the named dead_reason', () => {
  const a1: StatBoundsAttempt = {
    attempt: 1,
    fields: snapshotStatFields({ stat_value: '$62.17/hr', stat_label: 'x'.repeat(50), context_line: 'c', cta_text: 'q' }),
    violations: [{ field: 'stat_label', kind: 'chars', length: 50, max: 48 }],
    at: '2026-08-03T00:00:00.000Z',
  };
  const a2: StatBoundsAttempt = {
    attempt: 2,
    fields: snapshotStatFields({ stat_value: '$62.17/hr', stat_label: 'y'.repeat(49), context_line: 'c', cta_text: 'q' }),
    violations: [{ field: 'stat_label', kind: 'chars', length: 49, max: 48 }],
    at: '2026-08-03T00:00:01.000Z',
  };
  const qa = buildStatBoundsQa(RICH_ENVELOPE, [a1, a2], 'fail_closed');
  assertEquals(qa.schema, 'stat_bounds_qa_v1');
  assertEquals(qa.envelope, {
    source: 'persisted',
    template_id: TEMPLATE_ID,
    fallback_reason: null,
    limits: RICH_ENVELOPE.limits,
  });
  assertEquals(qa.attempts.length, 2);
  assertEquals(qa.attempts[0].fields.stat_label, 'x'.repeat(50));   // attempt-1 content preserved
  assertEquals(qa.attempts[1].fields.stat_label, 'y'.repeat(49));   // attempt-2 content preserved
  assertEquals(qa.outcome, 'fail_closed');
  assertEquals(qa.dead_reason, STAT_BOUNDS_DEAD_REASON);
  assertEquals(STAT_BOUNDS_DEAD_REASON, 'stat_bounds_violation_after_bounded_reprompt');
});

Deno.test('QA: success outcomes carry NO dead_reason key', () => {
  const qa = buildStatBoundsQa(RICH_ENVELOPE, [], 'accepted_first_attempt');
  assertEquals('dead_reason' in qa, false);
  assertEquals(buildStatBoundsQa(RICH_ENVELOPE, [], 'accepted_after_reprompt').dead_reason, undefined);
});

Deno.test('snapshotStatFields: stringifies verbatim (untrimmed), null/undefined → empty', () => {
  assertEquals(snapshotStatFields({ stat_value: ' 42% ', stat_label: undefined, context_line: null, cta_text: 7 as unknown }), {
    stat_value: ' 42% ',
    stat_label: '',
    context_line: '',
    cta_text: '7',
  });
});

// ── isStatBoundsFailClosed sentinel guard ───────────────────────────────────────────────

Deno.test('sentinel: guard accepts only the fail-closed marker object', () => {
  const qa = buildStatBoundsQa(RICH_ENVELOPE, [], 'fail_closed');
  assert(isStatBoundsFailClosed({ stat_bounds_fail_closed: true, stat_bounds_qa: qa }));
  assertEquals(isStatBoundsFailClosed(null), false);
  assertEquals(isStatBoundsFailClosed(undefined), false);
  assertEquals(isStatBoundsFailClosed({ stat_value: '42%' }), false);
  assertEquals(isStatBoundsFailClosed({ stat_bounds_fail_closed: false }), false);
  // A real video_script carrying stat_bounds_qa (success path) is NOT the sentinel.
  assertEquals(isStatBoundsFailClosed({ stat_value: '42%', stat_bounds_qa: qa }), false);
});

// ── loadStatTemplateEnvelope (thin loader, chainable stub — house pattern) ─────────────

type StubOpts = {
  rpcResult?: { data: unknown; error: { code?: string; message?: string } | null };
  rpcThrows?: boolean;
  rowsResult?: { data: unknown; error: { code?: string; message?: string } | null };
};

function stubDb(opts: StubOpts) {
  const calls: { rpc: Array<{ fn: string; args: Record<string, unknown> }>; reads: number } = { rpc: [], reads: 0 };
  const db = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.rpc.push({ fn, args });
      if (opts.rpcThrows) throw new Error('stub rpc threw');
      return Promise.resolve(opts.rpcResult ?? { data: null, error: null });
    },
    schema: (_s: string) => ({
      from: (_t: string) => ({
        select: (_c: string) => ({
          eq: (_k: string, _v: unknown) => ({
            in: (_k2: string, _vals: string[]) => {
              calls.reads += 1;
              return Promise.resolve(opts.rowsResult ?? { data: null, error: null });
            },
          }),
        }),
      }),
    }),
  };
  return { db, calls };
}

const OK_SELECTION = {
  data: { status: 'ok', selected: { template_id: TEMPLATE_ID, provider_template_id: 'c11bb8ab' }, fail_reason: null },
  error: null,
};

Deno.test('loader: happy path → persisted envelope; select_template call MIRRORS video-worker (platform null, format video_short_stat, seed=post_draft_id)', async () => {
  const { db, calls } = stubDb({ rpcResult: OK_SELECTION, rowsResult: { data: ALL_FOUR_ROWS, error: null } });
  const env = await loadStatTemplateEnvelope(db, 'ndis-yarns', 'draft-123');
  assertEquals(env.source, 'persisted');
  assertEquals(env.templateId, TEMPLATE_ID);
  assertEquals(env.limits.stat_label, { maxChars: 48, maxLines: 2 });
  assertEquals(calls.rpc, [{
    fn: 'select_template',
    args: { p_client_slug: 'ndis-yarns', p_platform: null, p_format: 'video_short_stat', p_variant_intent: null, p_seed: 'draft-123' },
  }]);
});

Deno.test('loader miss: null client slug → fallback, no RPC call', async () => {
  const { db, calls } = stubDb({});
  const env = await loadStatTemplateEnvelope(db, null, 'draft-123');
  assertEquals(env.source, 'fallback_char_bounds');
  assertEquals(env.fallbackReason, 'client_slug_unresolved');
  assertEquals(calls.rpc.length, 0);
});

Deno.test('loader miss: select_template RPC error → fallback with reason', async () => {
  const { db } = stubDb({ rpcResult: { data: null, error: { code: 'PGRST301', message: 'boom' } } });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assertEquals(env.source, 'fallback_char_bounds');
  assert(env.fallbackReason!.startsWith('select_template_rpc_error:PGRST301'));
});

Deno.test('loader miss: fail-closed selection → fallback naming the fail_reason', async () => {
  const { db } = stubDb({ rpcResult: { data: { status: 'fail_closed', selected: null, fail_reason: 'no_selectable_template' }, error: null } });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assertEquals(env.source, 'fallback_char_bounds');
  assertEquals(env.fallbackReason, 'select_template_not_ok:fail_closed:no_selectable_template');
});

Deno.test('loader miss: ok selection without template_id → fallback', async () => {
  const { db } = stubDb({ rpcResult: { data: { status: 'ok', selected: {} }, error: null } });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assertEquals(env.fallbackReason, 'select_template_missing_template_id');
});

Deno.test('loader miss: field-rows read error → fallback', async () => {
  const { db } = stubDb({ rpcResult: OK_SELECTION, rowsResult: { data: null, error: { code: '42501', message: 'denied' } } });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assert(env.fallbackReason!.startsWith('field_rows_read_error:42501'));
});

Deno.test('loader miss: element rows absent → fallback (element_row_missing)', async () => {
  const { db } = stubDb({ rpcResult: OK_SELECTION, rowsResult: { data: [], error: null } });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assertEquals(env.fallbackReason, 'element_row_missing:StatValue');
});

Deno.test('loader miss: throw anywhere → fallback, NEVER a throw out of the loader', async () => {
  const { db } = stubDb({ rpcThrows: true });
  const env = await loadStatTemplateEnvelope(db, 'pp', 'd1');
  assertEquals(env.source, 'fallback_char_bounds');
  assert(env.fallbackReason!.startsWith('envelope_loader_threw:'));
});
