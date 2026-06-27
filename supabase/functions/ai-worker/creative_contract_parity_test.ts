// creative_contract_parity_test.ts — ACI Foundation v0 / Slice B1 (ai-worker).
//
// Asserts the ai-worker vendored creative-contract projection is BYTE-FOR-BEHAVIOUR
// identical to the image-worker original: the frozen constant deep-equals, source_commit
// matches, and the deterministic resolver agrees across both copies for the governed
// PP image_quote gate and the negative cases.
//
// TEST-ONLY cross-dir import: this file imports ../image-worker/creative_contract.ts ONLY
// to compare the two vendored copies. Tests are NOT deployed, so this does NOT violate the
// no-_shared / no cross-function RUNTIME-import rule — no production ai-worker path imports
// anything under ../image-worker.

import { assert, assertEquals } from 'jsr:@std/assert@1';

import {
  PP_IMAGE_QUOTE_NEWS_CARD_V1 as PP_AI,
  resolveCreativeContract as resolveAi,
} from './creative_contract.ts';

import {
  PP_IMAGE_QUOTE_NEWS_CARD_V1 as PP_IMG,
  resolveCreativeContract as resolveImg,
} from '../image-worker/creative_contract.ts';

const PP_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const OTHER_CLIENT_ID = '00000000-0000-0000-0000-000000000000';

// Parity 1 — the two vendored constants are deep-equal.
Deno.test('parity: PP_IMAGE_QUOTE_NEWS_CARD_V1 deep-equal across ai-worker + image-worker', () => {
  assertEquals(PP_AI, PP_IMG);
});

// Parity 2 — provenance source_commit matches.
Deno.test('parity: source.source_commit equal across copies', () => {
  assertEquals(PP_AI.source.source_commit, PP_IMG.source.source_commit);
});

// Parity 3 — resolver agrees + is non-null for the governed PP image_quote gate.
Deno.test('parity: resolveCreativeContract(PP, image_quote) deep-equal + non-null across copies', () => {
  const ai = resolveAi(PP_CLIENT_ID, 'image_quote');
  const img = resolveImg(PP_CLIENT_ID, 'image_quote');
  assert(ai !== null, 'ai-worker resolver returned null for PP image_quote');
  assert(img !== null, 'image-worker resolver returned null for PP image_quote');
  assertEquals(ai, img);
});

// Parity 4 — negative cases: null in BOTH copies for non-PP client + image_quote, and PP + carousel.
Deno.test('parity: resolver null in both copies for negative cases', () => {
  assertEquals(resolveAi(OTHER_CLIENT_ID, 'image_quote'), null);
  assertEquals(resolveImg(OTHER_CLIENT_ID, 'image_quote'), null);
  assertEquals(resolveAi(PP_CLIENT_ID, 'carousel'), null);
  assertEquals(resolveImg(PP_CLIENT_ID, 'carousel'), null);
});
