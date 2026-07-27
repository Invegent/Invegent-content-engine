// avatar_role_promotion_test.ts — cc-0083 Slice B hermetic tests for the presenter-role
// PROMOTION GATE (promoteAvatarRole). Fully hermetic: NO DB, NO network, NO Deno.serve
// (index.ts guards its listener behind `if (import.meta.main)`, so importing it here does NOT
// start the server). Exercises the pure gate that decides whether a suggestAvatarRole result
// is promoted into the CONSUMED field video_script.stakeholder_role.
//
// Contract (§2 of cc-0083-sliceB): promote iff suggested_stakeholder_role is a non-empty string
// AND suggested_stakeholder_role_confidence >= AVATAR_ROLE_MIN_CONFIDENCE (0.6). Otherwise null →
// heygen-worker resolves the client default host. Fail-open: never throws on a malformed object.
//
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/avatar_role_promotion_test.ts

import { assertEquals } from 'jsr:@std/assert@1';
import { promoteAvatarRole } from './index.ts';

// A confident, in-set single-role suggestion (the shape suggestAvatarRole returns) is PROMOTED.
Deno.test('cc-0083 promote: confident in-set role (>=0.6) => the role string', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: 'participant', suggested_stakeholder_role_confidence: 0.9 }),
    'participant',
  );
});

// Exactly at the threshold is inclusive (>= 0.6).
Deno.test('cc-0083 promote: confidence exactly at the 0.6 threshold => promoted', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: 'founder', suggested_stakeholder_role_confidence: 0.6 }),
    'founder',
  );
});

// Low-confidence suggestion is NOT promoted (left null → default host).
Deno.test('cc-0083 gate: low-confidence role (<0.6) => null (not promoted)', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: 'participant', suggested_stakeholder_role_confidence: 0.5 }),
    null,
  );
});

// A null role (suggestAvatarRole's "no clear role" result) is NOT promoted even at high confidence.
Deno.test('cc-0083 gate: null role => null (not promoted) regardless of confidence', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: null, suggested_stakeholder_role_confidence: 1 }),
    null,
  );
});

// An empty-string role is NOT promoted.
Deno.test('cc-0083 gate: empty-string role => null', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: '', suggested_stakeholder_role_confidence: 1 }),
    null,
  );
});

// Missing confidence field => treated as 0 => not promoted.
Deno.test('cc-0083 gate: missing confidence => null', () => {
  assertEquals(
    promoteAvatarRole({ suggested_stakeholder_role: 'participant' }),
    null,
  );
});

// Fail-open: a null / undefined / errored suggestion object => null (never throws).
Deno.test('cc-0083 fail-open: null/undefined/garbage suggestion => null (no throw)', () => {
  assertEquals(promoteAvatarRole(null), null);
  assertEquals(promoteAvatarRole(undefined), null);
  assertEquals(promoteAvatarRole({}), null);
  assertEquals(promoteAvatarRole({ suggested_stakeholder_role: 123, suggested_stakeholder_role_confidence: 0.9 }), null);
  assertEquals(promoteAvatarRole({ suggested_stakeholder_role: 'x', suggested_stakeholder_role_confidence: 'not-a-number' }), null);
});
