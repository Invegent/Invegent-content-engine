// text_limits_envelope_test.ts — M14 WS-3 hermetic unit tests for the registry-driven
// text_limits enforcement module. Fully hermetic: NO DB, NO network, NO Date/random
// inside the assertions. The loader is exercised against a hand-rolled chainable
// supabase stub (house pattern: ai-worker/stat_envelope_test.ts).
// Run: deno test --allow-read --allow-env supabase/functions/image-worker/text_limits_envelope_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  assertTextFieldsWithinRegistryLimits,
  buildLimitsFromFieldRows,
  extractMaxChars,
  extractTextElementValues,
  limitTripleMaxChars,
  loadTextLimitsEnvelope,
  validateTextFieldsAgainstLimits,
} from './text_limits_envelope.ts';

// ── Fixtures ───────────────────────────────────────────────────────────────────────────

const triple = (value: number | null, basis = 'declared_from_source') => ({ basis, value, source: 's', evidence_reference: null });

// A LIVE tmr_field_constraints_v1 shape (real example, mirrors the M14 WS-1 baseline).
const CATEGORY_ROW = {
  element_name: 'CategoryBadge',
  constraints: { schema_version: 'tmr_field_constraints_v1', text_limits: { max_chars: triple(11) } },
};
const FOOTER_ROW = {
  element_name: 'Footer',
  constraints: { schema_version: 'tmr_field_constraints_v1', text_limits: { max_chars: triple(16) } },
};
// Location stays to_be_calibrated per the M14 WS-1 lane's own judgment call — a real
// registry row can exist with the triple still TBC (value:null).
const LOCATION_ROW_TBC = {
  element_name: 'Location',
  constraints: { schema_version: 'tmr_field_constraints_v1', text_limits: { max_chars: { basis: 'to_be_calibrated', value: null } } },
};
const TEMPLATE_ID = '0e006c5c-45aa-4829-82ec-89dd282a8c56';

// ── limitTripleMaxChars / extractMaxChars (constraints parsing) ────────────────────────

Deno.test('limitTripleMaxChars: declared_from_source triple -> its numeric value', () => {
  assertEquals(limitTripleMaxChars(triple(11)), 11);
  assertEquals(limitTripleMaxChars(triple(180)), 180);
});

Deno.test('limitTripleMaxChars: to_be_calibrated -> null, regardless of value', () => {
  assertEquals(limitTripleMaxChars({ basis: 'to_be_calibrated', value: null }), null);
  assertEquals(limitTripleMaxChars({ basis: 'to_be_calibrated', value: 40 }), null);
});

Deno.test('limitTripleMaxChars: non-object / non-finite / non-positive -> null', () => {
  assertEquals(limitTripleMaxChars(null), null);
  assertEquals(limitTripleMaxChars(undefined), null);
  assertEquals(limitTripleMaxChars({ basis: 'declared_from_source', value: 'eleven' }), null);
  assertEquals(limitTripleMaxChars({ basis: 'declared_from_source', value: 0 }), null);
  assertEquals(limitTripleMaxChars({ basis: 'declared_from_source', value: -5 }), null);
});

Deno.test('extractMaxChars: live constraints fixture -> max_chars value', () => {
  assertEquals(extractMaxChars(CATEGORY_ROW.constraints), 11);
});

Deno.test('extractMaxChars: to_be_calibrated triple -> null (no bound, not an error)', () => {
  assertEquals(extractMaxChars(LOCATION_ROW_TBC.constraints), null);
});

Deno.test('extractMaxChars: missing/malformed shapes -> null', () => {
  assertEquals(extractMaxChars({}), null);
  assertEquals(extractMaxChars({ text_limits: {} }), null);
  assertEquals(extractMaxChars(null), null);
  assertEquals(extractMaxChars('not an object'), null);
});

// ── buildLimitsFromFieldRows (PARTIAL, per-field — the deliberate divergence from
//    stat_envelope's all-or-nothing StatFieldKey contract) ─────────────────────────────

Deno.test('buildLimitsFromFieldRows: usable rows populate the map; TBC rows are OMITTED (not a failure)', () => {
  const limits = buildLimitsFromFieldRows([CATEGORY_ROW, FOOTER_ROW, LOCATION_ROW_TBC]);
  assertEquals(limits, { CategoryBadge: 11, Footer: 16 });
  assert(!('Location' in limits), 'Location must be absent, not present with a fabricated value');
});

Deno.test('buildLimitsFromFieldRows: empty rows -> empty map', () => {
  assertEquals(buildLimitsFromFieldRows([]), {});
});

// ── extractTextElementValues (generic across ANY winner) ───────────────────────────────

Deno.test('extractTextElementValues: reads every ".text" key generically, regardless of template', () => {
  const modifications = {
    'CategoryBadge.text': 'NDIS UPDATE',
    'Headline.text': 'A headline',
    'Background.source': 'https://example.com/bg.jpg',   // non-.text key — ignored
    'Scrim.opacity': 0.4,                                  // non-.text, non-string — ignored
  };
  assertEquals(extractTextElementValues(modifications), { CategoryBadge: 'NDIS UPDATE', Headline: 'A headline' });
});

Deno.test('extractTextElementValues: a quote-card-shaped modifications map works identically (generic, not hardcoded)', () => {
  const modifications = {
    'QuoteText.text': 'Some quote',
    'Attribution.text': 'Invegent — AI & Automation',
    'SourceLabel.text': 'invegent.com',
    'Footer.text': 'Invegent',
  };
  assertEquals(extractTextElementValues(modifications), {
    QuoteText: 'Some quote',
    Attribution: 'Invegent — AI & Automation',
    SourceLabel: 'invegent.com',
    Footer: 'Invegent',
  });
});

Deno.test('extractTextElementValues: non-string ".text" value is ignored, never throws', () => {
  assertEquals(extractTextElementValues({ 'Weird.text': 42 as unknown as string }), {});
});

// ── validateTextFieldsAgainstLimits / assertTextFieldsWithinRegistryLimits ─────────────
// (Required seed tests: within-limits pass / over-limit block / missing-constraints no-op)

Deno.test('WITHIN-LIMITS PASS: a field at exactly its registry max_chars renders without throwing', () => {
  const limits = { CategoryBadge: 11 };
  const fields = { CategoryBadge: 'NDIS UPDATE' };            // exactly 11 chars
  assertEquals('NDIS UPDATE'.length, 11);
  assertEquals(validateTextFieldsAgainstLimits(fields, limits), []);
  assertTextFieldsWithinRegistryLimits(fields, limits);       // must NOT throw
});

Deno.test('WITHIN-LIMITS PASS: a field strictly under its registry max_chars renders without throwing', () => {
  const limits = { Footer: 16 };
  const fields = { Footer: 'NDIS Yarns' };                    // 10 chars, under 16
  assertTextFieldsWithinRegistryLimits(fields, limits);
});

Deno.test('OVER-LIMIT BLOCK: a field over its registry max_chars throws, naming field/length/max (mirrors b1_video wording)', () => {
  const limits = { CategoryBadge: 11 };
  const fields = { CategoryBadge: 'THIS CATEGORY IS WAY TOO LONG' }; // 29 chars > 11
  const violations = validateTextFieldsAgainstLimits(fields, limits);
  assertEquals(violations, [{ field: 'CategoryBadge', length: 29, max: 11 }]);
  assertThrows(
    () => assertTextFieldsWithinRegistryLimits(fields, limits),
    Error,
    'image_worker_text_limits: CategoryBadge length 29 exceeds max_chars=11 (registry-governed, no truncation / no AI rewrite)',
  );
});

Deno.test('MISSING-CONSTRAINTS BEHAVIOUR: a field whose registry triple is still to_be_calibrated/absent from the limits map is a NO-OP (does NOT throw), even at extreme length', () => {
  const limits = { CategoryBadge: 11 };                       // Location deliberately ABSENT (TBC)
  const fields = { CategoryBadge: 'NDIS UPDATE', Location: 'X'.repeat(500) };
  const violations = validateTextFieldsAgainstLimits(fields, limits);
  assertEquals(violations, []);                               // no violation for Location — no bound to check
  assertTextFieldsWithinRegistryLimits(fields, limits);        // must NOT throw
});

Deno.test('blank field values yield no violation regardless of limit (blank handling stays each field\'s own concern)', () => {
  const limits = { Headline: 180 };
  assertEquals(validateTextFieldsAgainstLimits({ Headline: '   ' }, limits), []);
  assertEquals(validateTextFieldsAgainstLimits({ Headline: '' }, limits), []);
});

Deno.test('multiple violations: assertion throws on the FIRST in sorted key order (deterministic)', () => {
  const limits = { Attribution: 5, Footer: 5 };
  const fields = { Footer: 'way too long for footer', Attribution: 'way too long for attribution' };
  // sorted order: Attribution before Footer
  assertThrows(
    () => assertTextFieldsWithinRegistryLimits(fields, limits),
    Error,
    'image_worker_text_limits: Attribution',
  );
});

// ── loadTextLimitsEnvelope (thin loader, chainable stub — house pattern) ───────────────

type StubOpts = {
  rowsResult?: { data: unknown; error: { code?: string; message?: string } | null };
  readThrows?: boolean;
};

function stubDb(opts: StubOpts) {
  const calls: { reads: Array<{ table: string; eq: [string, unknown]; in: [string, string[]] }> } = { reads: [] };
  const db = {
    schema: (_s: string) => ({
      from: (t: string) => ({
        select: (_c: string) => ({
          eq: (k: string, v: unknown) => ({
            in: (k2: string, vals: string[]) => {
              if (opts.readThrows) throw new Error('stub read threw');
              calls.reads.push({ table: t, eq: [k, v], in: [k2, vals] });
              return Promise.resolve(opts.rowsResult ?? { data: null, error: null });
            },
          }),
        }),
      }),
    }),
  };
  return { db, calls };
}

Deno.test('loader: happy path -> persisted envelope with a partial limits map (TBC rows omitted)', async () => {
  const { db, calls } = stubDb({ rowsResult: { data: [CATEGORY_ROW, FOOTER_ROW, LOCATION_ROW_TBC], error: null } });
  const env = await loadTextLimitsEnvelope(db, TEMPLATE_ID, ['CategoryBadge', 'Footer', 'Location']);
  assertEquals(env.source, 'persisted');
  assertEquals(env.templateId, TEMPLATE_ID);
  assertEquals(env.fallbackReason, null);
  assertEquals(env.limits, { CategoryBadge: 11, Footer: 16 });
  assertEquals(calls.reads, [{ table: 'creative_provider_template_field', eq: ['template_id', TEMPLATE_ID], in: ['element_name', ['CategoryBadge', 'Footer', 'Location']] }]);
});

Deno.test('loader: null templateId -> unavailable envelope (fail-OPEN posture), no DB call', async () => {
  const { db, calls } = stubDb({});
  const env = await loadTextLimitsEnvelope(db, null, ['CategoryBadge']);
  assertEquals(env.source, 'unavailable');
  assertEquals(env.fallbackReason, 'missing_template_id');
  assertEquals(env.limits, {});
  assertEquals(calls.reads.length, 0);
});

Deno.test('loader: empty elementNames -> persisted envelope with empty limits (correct no-op read, NOT the fail-open path)', async () => {
  const { db, calls } = stubDb({});
  const env = await loadTextLimitsEnvelope(db, TEMPLATE_ID, []);
  assertEquals(env.source, 'persisted');
  assertEquals(env.fallbackReason, null);
  assertEquals(env.limits, {});
  assertEquals(calls.reads.length, 0);
});

Deno.test('WHOLE-ENVELOPE-LOAD-FAILURE (fail-OPEN posture (b)): DB read error -> unavailable envelope, empty limits, downstream assertion is a no-op regardless of field length', async () => {
  const { db } = stubDb({ rowsResult: { data: null, error: { code: '42501', message: 'permission denied' } } });
  const env = await loadTextLimitsEnvelope(db, TEMPLATE_ID, ['CategoryBadge']);
  assertEquals(env.source, 'unavailable');
  assert(env.fallbackReason!.startsWith('field_rows_read_error:42501'));
  assertEquals(env.limits, {});
  // Fail-OPEN verification: even an absurdly long field value does NOT throw when the
  // envelope failed to load — this is the deliberate posture-(b) behaviour, distinct
  // from an in-envelope over-limit (which always throws — see the OVER-LIMIT BLOCK test
  // above using the SAME assertion function with a loaded envelope).
  assertTextFieldsWithinRegistryLimits({ CategoryBadge: 'X'.repeat(1000) }, env.limits);
});

Deno.test('WHOLE-ENVELOPE-LOAD-FAILURE (fail-OPEN posture (b)): loader throws internally -> unavailable envelope, never propagates the throw', async () => {
  const { db } = stubDb({ readThrows: true });
  const env = await loadTextLimitsEnvelope(db, TEMPLATE_ID, ['CategoryBadge']);
  assertEquals(env.source, 'unavailable');
  assert(env.fallbackReason!.startsWith('envelope_loader_threw:'));
  assertEquals(env.limits, {});
  assertTextFieldsWithinRegistryLimits({ CategoryBadge: 'X'.repeat(1000) }, env.limits);
});

Deno.test('loader: rows contain an unrelated/duplicate element_name -> ignored gracefully, never throws', async () => {
  const { db } = stubDb({ rowsResult: { data: [CATEGORY_ROW, { element_name: '', constraints: {} }], error: null } });
  const env = await loadTextLimitsEnvelope(db, TEMPLATE_ID, ['CategoryBadge']);
  assertEquals(env.limits, { CategoryBadge: 11 });
});
