// template_smoke_test.ts — hermetic tests for the LANE-W-trimmed ./template_smoke.ts.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate.
//
// LANE W TRIM (2026-07-05, video-worker v3.4.0): the Gate D2 smoke-surface tests
// (renderScript shape, props_hash, render_spec.template identity, isSmokeRequest gate)
// were removed with those exports — see git history (≤ v3.3.1). composeRenderSpec
// stays LIVE (production renderUploadAndLog, 4 call sites) and keeps coverage here.
// Run: deno test supabase/functions/video-worker/template_smoke_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { composeRenderSpec } from './template_smoke.ts';
import { buildRenderQa, safeQa } from './qa.ts';

// (1) Production-shape composeRenderSpec (no extras) is byte-identical to { qa }.
Deno.test('composeRenderSpec without extras returns exactly { qa } (production unchanged)', () => {
  const qa = safeQa(() => buildRenderQa({ engine: 'creatomate', status: 'succeeded' }));
  const spec = composeRenderSpec(qa);
  assertEquals(Object.keys(spec), ['qa']);
  assert(!('label' in spec));
  assert(!('template' in spec));
});

// (2) Signature stability: the extras path still composes { label, qa, template }
// as siblings (no live caller supplies extras since the smoke branch was retired).
Deno.test('composeRenderSpec with extras yields { label, qa, template } siblings', () => {
  const qa = safeQa(() => buildRenderQa({ engine: 'creatomate', status: 'succeeded' }));
  const spec = composeRenderSpec(qa, { label: 'some_label', template: { template_id: 't1' } });
  assertEquals(Object.keys(spec), ['label', 'qa', 'template']);
  assertEquals(spec.label, 'some_label');
  assertEquals((spec.template as any).template_id, 't1');
  assert('qa' in spec);
});

// (3) Null/undefined extras are ignored (production equivalence via the opts spread).
Deno.test('composeRenderSpec ignores null label/template extras', () => {
  const qa = safeQa(() => buildRenderQa({ engine: 'creatomate', status: 'failed' }));
  const spec = composeRenderSpec(qa, { label: null, template: null });
  assertEquals(Object.keys(spec), ['qa']);
});
