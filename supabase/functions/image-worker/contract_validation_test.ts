// contract_validation_test.ts — ACI Foundation v0 / Slice C hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve. Exercises ./contract_validation.ts —
// the WARN-ONLY, never-throws contract validation that records an additive
// render_spec.contract_validation evidence block for the governed PP image_quote path.
// Run: deno test --allow-read supabase/functions/image-worker/contract_validation_test.ts

import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import {
  validateContract,
  EXPECTED_VARIANT_KEY,
  EXPECTED_CONTRACT_REF,
  EXPECTED_CONTRACT_VERSION,
  type ContractValidationCheck,
  type ValidateContractInput,
} from './contract_validation.ts';

const FIXED_NOW = '2026-06-28T00:00:00.000Z';
const nowIso = () => FIXED_NOW;

// A valid, fully-matching contract object (as it appears under draft_format.contract).
const VALID_CONTRACT = {
  variant_key: EXPECTED_VARIANT_KEY,
  contract_ref: EXPECTED_CONTRACT_REF,
  contract_version: EXPECTED_CONTRACT_VERSION,
  selector_reason: 'pp_image_quote_default',
};

// A baseline valid input (contract present + matching, good headline/subtitle, assets resolved).
function validInput(over: Partial<ValidateContractInput> = {}): ValidateContractInput {
  return {
    draftFormat: { contract: { ...VALID_CONTRACT } },
    headline: 'Perth median rents climb again as supply tightens',
    subtitle: 'New data shows continued upward pressure across the inner suburbs.',
    logoUrl: 'https://storage.example/pp_logo_primary.png',
    backgroundUrl: 'https://storage.example/bg_perth_cbd.jpg',
    headlineLimit: 90,
    subtitleLimit: 90,
    ...over,
  };
}

function check(checks: ContractValidationCheck[], name: ContractValidationCheck['name']): ContractValidationCheck {
  const c = checks.find((x) => x.name === name);
  assert(c, `expected a '${name}' check to be present`);
  return c!;
}

// 1. pass — fully valid inputs.
Deno.test('validateContract: valid contract + headline + subtitle + assets → pass', () => {
  const v = validateContract(validInput(), nowIso);
  assertEquals(v.status, 'pass');
  assert(v.contract_present);
  assertEquals(v.limit_source, 'fallback_constant');
  assertEquals(v.checks.length, 4);
  for (const c of v.checks) assert(c.ok, `check ${c.name} should be ok: ${c.detail}`);
  assertEquals(v.warnings, []);
  assertEquals(v.evaluated_at, FIXED_NOW);
});

// 2. missing contract — draftFormat={} (no contract key).
Deno.test('validateContract: missing contract → warn, contract_present=false, no throw', () => {
  const v = validateContract(validInput({ draftFormat: {} }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(v.contract_present);
  assertEquals(v.limit_source, 'fallback_constant');
  assertFalse(check(v.checks, 'contract_identity').ok);
  // the non-contract checks are unaffected by a missing contract
  assert(check(v.checks, 'headline').ok);
  assert(check(v.checks, 'subtitle').ok);
  assert(check(v.checks, 'assets').ok);
});

// 3a. malformed contract — draftFormat={contract:'not-an-object'}.
Deno.test('validateContract: contract is a string → warn, contract_present=false, no throw', () => {
  const v = validateContract(validInput({ draftFormat: { contract: 'not-an-object' } }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(v.contract_present);
  assertFalse(check(v.checks, 'contract_identity').ok);
});

// 3b. malformed input — draftFormat=null.
Deno.test('validateContract: draftFormat=null → warn, contract_present=false, no throw', () => {
  const v = validateContract(validInput({ draftFormat: null }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(v.contract_present);
  assertFalse(check(v.checks, 'contract_identity').ok);
});

// 4. unknown / mismatched contract — present but wrong variant_key.
Deno.test('validateContract: mismatched variant_key → contract_identity warn, no throw', () => {
  const v = validateContract(
    validInput({ draftFormat: { contract: { ...VALID_CONTRACT, variant_key: 'something.else.v9' } } }),
    nowIso,
  );
  assertEquals(v.status, 'warn');
  assert(v.contract_present);
  assertFalse(check(v.checks, 'contract_identity').ok);
});

// 5. headline warning — over the limit.
Deno.test('validateContract: over-length headline → headline warn', () => {
  const v = validateContract(validInput({ headline: 'x'.repeat(200) }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(check(v.checks, 'headline').ok);
});

// 6. subtitle warning — over the limit.
Deno.test('validateContract: over-length subtitle → subtitle warn', () => {
  const v = validateContract(validInput({ subtitle: 'y'.repeat(200) }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(check(v.checks, 'subtitle').ok);
});

// 7. empty subtitle is OK — with otherwise-valid inputs → pass.
Deno.test('validateContract: empty subtitle is allowed → subtitle ok + overall pass', () => {
  const v = validateContract(validInput({ subtitle: '' }), nowIso);
  assert(check(v.checks, 'subtitle').ok);
  assertEquals(check(v.checks, 'subtitle').detail, 'subtitle empty (allowed)');
  assertEquals(v.status, 'pass');
  assertEquals(v.warnings, []);
});

// 8. asset warning — empty logo / null background.
Deno.test('validateContract: empty logoUrl → assets warn', () => {
  const v = validateContract(validInput({ logoUrl: '' }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(check(v.checks, 'assets').ok);
});

Deno.test('validateContract: null backgroundUrl → assets warn', () => {
  const v = validateContract(validInput({ backgroundUrl: null }), nowIso);
  assertEquals(v.status, 'warn');
  assertFalse(check(v.checks, 'assets').ok);
});
