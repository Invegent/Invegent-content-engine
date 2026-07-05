// manual_render_test.ts — hermetic tests for the LANE-W-trimmed ./manual_render.ts.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate.
//
// LANE W TRIM (2026-07-05, image-worker v3.23.0): the tests for the retired Lane 3B /
// B0 surfaces (isManualRenderRequest, mapResolvedAssets, buildManualModifications,
// buildGovernedTemplateSpec, PP_NEWS_STATIC_16x9, NEWS_STATIC_CENTERED_SCRIM_1x1) were
// removed with those exports — see git history (≤ v3.22.0). computePropsHash stays
// LIVE (Option-D B1 TMR production branch) and keeps its coverage here.
// Run: deno test supabase/functions/image-worker/manual_render_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { computePropsHash } from './manual_render.ts';

Deno.test('computePropsHash deterministic 64-hex; changes on input', async () => {
  const a = await computePropsHash({ 'Headline.text':'A', 'Logo.source':'u' });
  const b = await computePropsHash({ 'Headline.text':'A', 'Logo.source':'u' });
  const c = await computePropsHash({ 'Headline.text':'B', 'Logo.source':'u' });
  assertEquals(a, b);
  assert(a !== c);
  assertEquals(a.length, 64);
  assert(/^[0-9a-f]{64}$/.test(a));
});
