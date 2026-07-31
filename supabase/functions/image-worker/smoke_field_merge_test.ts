// Unit tests for mergeSmokeOverrideFields (cc-0089 follow-up #2 — smoke-only
// cta/slide_number field-merge stomp fix).
// Fully hermetic: NO DB, NO network, NO Deno.serve.
// Run: deno test --allow-read --allow-env --allow-net --no-check supabase/functions/image-worker/smoke_field_merge_test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import { mergeSmokeOverrideFields } from './smoke_field_merge.ts';

// cta — no override supplied: a contract-resolved base value must survive untouched
// (this is the exact bug: previously `cta: undefined` from the override stomped this).
Deno.test('mergeSmokeOverrideFields: no cta override + base has contract cta -> base cta survives', () => {
  const base = { headline: 'h', subtitle: 's', cta: 'Explore the latest market update' };
  const merged = mergeSmokeOverrideFields(base, {});
  assertEquals(merged.cta, 'Explore the latest market update');
});

// cta — no override supplied, base has NO cta (e.g. non-PP client with no contract entry):
// key stays absent/undefined, matching the b1_production.ts f.cta !== undefined guard.
Deno.test('mergeSmokeOverrideFields: no cta override + base has no cta -> stays undefined', () => {
  const base = { headline: 'h', subtitle: 's' };
  const merged = mergeSmokeOverrideFields(base, {});
  assertEquals(merged.cta, undefined);
});

// cta — explicit override supplied: it wins over a contract-resolved base value
// (the 2026-07-29 compat lane's "supervisor steer" capability must still work).
Deno.test('mergeSmokeOverrideFields: explicit cta override wins over base contract cta', () => {
  const base = { headline: 'h', subtitle: 's', cta: 'Explore the latest market update' };
  const merged = mergeSmokeOverrideFields(base, { cta: 'Supervisor override text' });
  assertEquals(merged.cta, 'Supervisor override text');
});

// cta — explicit override supplied, base has no cta at all: override still applies.
Deno.test('mergeSmokeOverrideFields: explicit cta override applies even when base has none', () => {
  const base = { headline: 'h', subtitle: 's' };
  const merged = mergeSmokeOverrideFields(base, { cta: 'Supervisor override text' });
  assertEquals(merged.cta, 'Supervisor override text');
});

// slide_number — mirror of the four cta cases above (same bug class, same fix shape).
Deno.test('mergeSmokeOverrideFields: no slide_number override + base has one -> base value survives', () => {
  const base = { headline: 'h', subtitle: 's', slide_number: '2' };
  const merged = mergeSmokeOverrideFields(base, {});
  assertEquals(merged.slide_number, '2');
});

Deno.test('mergeSmokeOverrideFields: no slide_number override + base has none -> stays undefined', () => {
  const base = { headline: 'h', subtitle: 's' };
  const merged = mergeSmokeOverrideFields(base, {});
  assertEquals(merged.slide_number, undefined);
});

Deno.test('mergeSmokeOverrideFields: explicit slide_number override wins over base value', () => {
  const base = { headline: 'h', subtitle: 's', slide_number: '2' };
  const merged = mergeSmokeOverrideFields(base, { slide_number: '9' });
  assertEquals(merged.slide_number, '9');
});

Deno.test('mergeSmokeOverrideFields: explicit slide_number override applies even when base has none', () => {
  const base = { headline: 'h', subtitle: 's' };
  const merged = mergeSmokeOverrideFields(base, { slide_number: '9' });
  assertEquals(merged.slide_number, '9');
});

// Non-override keys (e.g. subtitle) pass through untouched — the merge is additive-only.
Deno.test('mergeSmokeOverrideFields: unrelated base keys pass through unchanged', () => {
  const base = { headline: 'h', subtitle: 's', category: 'market' };
  const merged = mergeSmokeOverrideFields(base, { cta: 'x' });
  assertEquals(merged.headline, 'h');
  assertEquals(merged.subtitle, 's');
  assertEquals((merged as any).category, 'market');
});
