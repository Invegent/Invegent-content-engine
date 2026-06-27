// contract_echo_test.ts — ACI Foundation v0 / Slice B2 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve. Exercises ./contract_echo.ts —
// the evidence-only echo of the four creative-contract identity fields into render_spec.
// Run: deno test --allow-read supabase/functions/image-worker/contract_echo_test.ts

import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import { echoContractToRenderSpec } from './contract_echo.ts';

// A representative base render_spec (matches the governed PP image_quote branch shape).
function baseSpec(): Record<string, unknown> {
  return {
    label: 'b1_production',
    template: { provider_template_id: 'tpl_abc', props_hash: 'deadbeef' },
    background_key: 'bg_perth_cbd',
    subtitle_chars: 42,
  };
}

const FULL_CONTRACT = {
  variant_key: 'centred-scrim-1x1',
  contract_ref: 'property_pulse.image_quote.news_card',
  contract_version: 'v1',
  selector_reason: 'pp_image_quote_default',
  // these MUST NOT be echoed
  registry_version: 'v0.3',
  source_commit: '2ac172b',
  resolved_at: '2026-06-27T00:00:00.000Z',
};

// 1 — contract present (all 4 string fields): exactly those 4 fields added, base preserved.
Deno.test('echo: full contract → four identity fields added, base preserved', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, { contract: FULL_CONTRACT });
  // four echoed, exact values
  assertEquals(out.variant_key, 'centred-scrim-1x1');
  assertEquals(out.contract_ref, 'property_pulse.image_quote.news_card');
  assertEquals(out.contract_version, 'v1');
  assertEquals(out.selector_reason, 'pp_image_quote_default');
  // base fields preserved
  assertEquals(out.label, 'b1_production');
  assertEquals(out.template, base.template);
  assertEquals(out.background_key, 'bg_perth_cbd');
  assertEquals(out.subtitle_chars, 42);
  // exactly base(4) + echoed(4) = 8 keys, nothing else
  assertEquals(Object.keys(out).sort(), [
    'background_key', 'contract_ref', 'contract_version', 'label',
    'selector_reason', 'subtitle_chars', 'template', 'variant_key',
  ]);
});

// 2 — contract absent: null draftFormat / {} with no contract / contract=null → unchanged.
Deno.test('echo: absent contract (null draftFormat) → unchanged, no keys added', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, null);
  assertEquals(out, base);
  assertFalse('variant_key' in out);
});

Deno.test('echo: absent contract ({} no contract key) → unchanged, no keys added', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, {});
  assertEquals(out, base);
  assertFalse('variant_key' in out);
});

Deno.test('echo: absent contract (contract=null) → unchanged, no keys added', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, { contract: null });
  assertEquals(out, base);
  assertFalse('variant_key' in out);
});

// 3 — malformed / partial contract → ignored (unchanged).
Deno.test('echo: malformed (missing one of four) → unchanged', () => {
  const base = baseSpec();
  const partial = { ...FULL_CONTRACT } as Record<string, unknown>;
  delete partial.selector_reason;
  const out = echoContractToRenderSpec(base, { contract: partial });
  assertEquals(out, base);
  assertFalse('variant_key' in out);
});

Deno.test('echo: malformed (field is number/null instead of string) → unchanged', () => {
  const base1 = baseSpec();
  const out1 = echoContractToRenderSpec(base1, {
    contract: { ...FULL_CONTRACT, contract_version: 1 },
  });
  assertEquals(out1, base1);
  assertFalse('variant_key' in out1);

  const base2 = baseSpec();
  const out2 = echoContractToRenderSpec(base2, {
    contract: { ...FULL_CONTRACT, selector_reason: null },
  });
  assertEquals(out2, base2);
  assertFalse('variant_key' in out2);

  // empty string is also rejected (non-empty required)
  const base3 = baseSpec();
  const out3 = echoContractToRenderSpec(base3, {
    contract: { ...FULL_CONTRACT, variant_key: '' },
  });
  assertEquals(out3, base3);
  assertFalse('variant_key' in out3);
});

Deno.test('echo: malformed (contract is a string, not an object) → unchanged', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, { contract: 'centred-scrim-1x1' });
  assertEquals(out, base);
  assertFalse('variant_key' in out);
});

// 4 — input not mutated: original object still has no variant_key after a valid echo.
Deno.test('echo: input render_spec is not mutated', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, { contract: FULL_CONTRACT });
  // function returns a NEW object on a valid echo
  assert(out !== base);
  // original untouched
  assertFalse('variant_key' in base);
  assertFalse('contract_ref' in base);
  assertFalse('contract_version' in base);
  assertFalse('selector_reason' in base);
  assertEquals(Object.keys(base).sort(), [
    'background_key', 'label', 'subtitle_chars', 'template',
  ]);

  // even a frozen base must not throw and must not be mutated
  const frozen = Object.freeze(baseSpec());
  const out2 = echoContractToRenderSpec(frozen, { contract: FULL_CONTRACT });
  assertEquals(out2.variant_key, 'centred-scrim-1x1');
  assertFalse('variant_key' in frozen);
});

// 5 — only the four fields echoed; registry_version/source_commit/resolved_at NOT copied.
Deno.test('echo: only four fields echoed (provenance not copied)', () => {
  const base = baseSpec();
  const out = echoContractToRenderSpec(base, { contract: FULL_CONTRACT });
  assertFalse('registry_version' in out);
  assertFalse('source_commit' in out);
  assertFalse('resolved_at' in out);
});
