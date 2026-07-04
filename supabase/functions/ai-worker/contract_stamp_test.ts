// contract_stamp_test.ts — ACI Foundation v0 / Slice B1 (ai-worker).
//
// Hermetic tests for buildContractStamp (pure helper) + the resolver gate behaviour that
// governs whether the call site stamps anything. NO network/DB. nowIso is injected as a
// fixed clock so the stamp is fully deterministic.

import { assertEquals } from 'jsr:@std/assert@1';

import { resolveCreativeContract } from './creative_contract.ts';
import { buildContractStamp } from './contract_stamp.ts';

const PP_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const OTHER_CLIENT_ID = '00000000-0000-0000-0000-000000000000';
const FIXED_NOW = '2026-06-27T00:00:00.000Z';

// Test 1 — PP image_quote: stamp deep-equals the EXACT expected object.
Deno.test('buildContractStamp: PP image_quote -> exact expected stamp', () => {
  const contract = resolveCreativeContract(PP_CLIENT_ID, 'image_quote')!;
  const stamp = buildContractStamp(contract, () => FIXED_NOW);
  assertEquals(stamp, {
    variant_key: 'property_pulse.image_quote.news_card.v1',
    contract_ref: 'property_pulse.image_quote.news_card',
    contract_version: 'v2', // v2 (2026-07-04, B1-v3): background pool 3→5, resolver-rank alignment

    selector_reason: 'pp_image_quote_default',
    registry_version: 'v0.3',
    source_commit: '2ac172b',
    resolved_at: '2026-06-27T00:00:00.000Z',
  });
});

// Test 2 — resolver returns null for non-PP client + image_quote -> call site adds NO stamp.
Deno.test('resolver null for non-PP client + image_quote (call site -> no stamp)', () => {
  assertEquals(resolveCreativeContract(OTHER_CLIENT_ID, 'image_quote'), null);
});

// Test 3 — resolver returns null for PP + non-image_quote formats -> call site adds NO stamp.
Deno.test('resolver null for PP + carousel/text (call site -> no stamp)', () => {
  assertEquals(resolveCreativeContract(PP_CLIENT_ID, 'carousel'), null);
  assertEquals(resolveCreativeContract(PP_CLIENT_ID, 'text'), null);
});

// Test 4 — resolved_at is exactly the injected clock value (purity / no Date.now leak).
Deno.test('buildContractStamp: resolved_at == injected nowIso', () => {
  const contract = resolveCreativeContract(PP_CLIENT_ID, 'image_quote')!;
  const stamp = buildContractStamp(contract, () => '1999-12-31T23:59:59.000Z');
  assertEquals(stamp.resolved_at, '1999-12-31T23:59:59.000Z');
});
