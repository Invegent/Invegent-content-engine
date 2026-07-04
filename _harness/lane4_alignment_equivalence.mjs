// lane4_alignment_equivalence.mjs — Lane 4 B1-v3 rotation-alignment equivalence harness.
// Mirrors selectB1BackgroundKey (supabase/functions/image-worker/b1_production.ts) EXACTLY:
// FNV-1a 32-bit over the seed string (charCodeAt, Math.imul, >>>0), mod 5, into the
// resolver-rank-ordered 5-key pool (PK decision 2026-07-04 "Option A-now-D-later").
// Usage: node _harness/lane4_alignment_equivalence.mjs <seeds.json>
//   where <seeds.json> is a JSON array of seed strings (post_draft_ids).
// Prints JSON [{seed, key}] to stdout for cross-checking against the live SQL resolver.
import { readFileSync } from 'node:fs';

const B1_BACKGROUND_KEYS = [
  'bg_perth_cbd',
  'bg_sydney_cbd',
  'bg_brisbane_cbd',
  'bg_pp_au_suburb_aerial_grid',
  'bg_pp_home_keys_contract_table',
];

function selectB1BackgroundKey(postDraftId) {
  let h = 0x811c9dc5;                       // FNV offset basis
  for (let i = 0; i < postDraftId.length; i++) {
    h ^= postDraftId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);           // FNV prime
  }
  return B1_BACKGROUND_KEYS[(h >>> 0) % B1_BACKGROUND_KEYS.length];
}

const path = process.argv[2];
if (!path) {
  console.error('usage: node lane4_alignment_equivalence.mjs <seeds.json>');
  process.exit(1);
}
const seeds = JSON.parse(readFileSync(path, 'utf8'));
if (!Array.isArray(seeds) || seeds.some((s) => typeof s !== 'string')) {
  console.error('seeds file must be a JSON array of strings');
  process.exit(1);
}
console.log(JSON.stringify(seeds.map((seed) => ({ seed, key: selectB1BackgroundKey(seed) })), null, 2));
