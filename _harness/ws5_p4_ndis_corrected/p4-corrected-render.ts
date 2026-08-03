#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write
// _harness/ws5_p4_ndis_corrected/p4-corrected-render.ts
//
// Lane A P4 — THE CORRECTED NDIS REPLACEMENT RENDER (re-close condition 3).
// OUT-OF-BAND (ws4-d4 precedent): hand-supplied provider_template_id, no select_template call
// at render time, ZERO DB writes, NO publish. PK's visual verdict is the only deciding act.
//
// LIVE BOUNDS ENFORCEMENT (PK P4 instruction "confirm the live bounds pass"): before firing,
// the content below is validated by the DEPLOYED production validator code
// (ai-worker/stat_envelope.ts — imported, not reimplemented) against the PERSISTED envelope
// (the P3-applied constraints, values below byte-matched to the persisted rows whose md5s are
// in ws5-p3-apply-record-v1.md). ANY violation → abort, no render.
//
// Content provenance: reshaped from the ORIGINAL incident draft 4d81324a-526e-4709-b67d-c3e0f18628b5
// (publish oCrtq6R9VFQ — evidence, untouched): same story ("two people with the same needs can
// get opposite NDIS outcomes"), now inside the envelope:
//   stat_value  "2 people" (8ch, 2 words — WRAPPED)   → "2"    (1ch, 1 word)
//   stat_label  "Same needs, different NDIS outcomes" (35ch)   → "Same needs, opposite outcomes" (29ch)
//   context     76ch (was fine)                                → 90ch expanded to carry "people"
//   cta         57ch + emoji                                   → "Has NDIS access been inconsistent?" (34ch)
//   eyebrow     baked static "MARKET UPDATE" (wrong brand)     → governed 'NDIS UPDATE' (11ch ≤ 13)
// Assets: governed resolve_slot_assets output (read-only call, recorded):
//   Background bg_ny_brand_texture_navy_waves · Logo ny_logo_full_colour_transparent.png
// Audio: silent ('' both slots) — visual-quality proof; audio path proven by the preserved publish.

import {
  validateStatScriptAgainstEnvelope,
  type StatEnvelope,
} from '../../supabase/functions/ai-worker/stat_envelope.ts';
import { submitAndPollCreatomateRender } from '../../supabase/functions/video-worker/creatomate_submit.ts';

const PROVIDER_TEMPLATE_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';

// The PERSISTED envelope (P3 apply, template a3d8472d…): values transcribed from the live rows.
const envelope: StatEnvelope = {
  source: 'persisted',
  templateId: 'a3d8472d-9438-4312-9f11-b6a920be4014',
  fallbackReason: null,
  selected: null, // out-of-band: no selector call; binding not applicable to this proof render
  limits: {
    stat_value:   { maxChars: 7,   maxLines: 1, maxWords: 1 },
    stat_label:   { maxChars: 30,  maxLines: 1 },
    context_line: { maxChars: 130, maxLines: 4 },
    cta_text:     { maxChars: 38,  maxLines: 1 },
  },
};

const content = {
  stat_value: '2',
  stat_label: 'Same needs, opposite outcomes',
  context_line: 'Two people with similar needs can receive opposite results under the current NDIS system.',
  cta_text: 'Has NDIS access been inconsistent?',
};

const EYEBROW = 'NDIS UPDATE';         // governed baked value (persisted); max_chars 13
if (EYEBROW.length > 13) throw new Error(`eyebrow exceeds persisted max_chars: ${EYEBROW.length}`);

// ── LIVE BOUNDS GATE (deployed validator code + persisted limits) ──
const violations = validateStatScriptAgainstEnvelope(content, envelope);
if (violations.length > 0) {
  console.error('LIVE BOUNDS FAIL — aborting, no render:', JSON.stringify(violations, null, 2));
  Deno.exit(1);
}
console.log('[p4] live bounds PASS (deployed validator, persisted envelope):',
  JSON.stringify({ checked: content, limits: envelope.limits, eyebrow: { value: EYEBROW, maxChars: 13 } }));

const modifications: Record<string, string> = {
  'EyebrowText.text': EYEBROW,
  'StatValue': content.stat_value,
  'StatLabel': content.stat_label,
  'ContextLine': content.context_line,
  'CtaText': content.cta_text,
  'Logo.source': 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/NDIS_Yarns/Logos/ny_logo_full_colour_transparent.png',
  'Background.source': 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/NDIS_Yarns/Backgrounds/bg_ny_brand_texture_navy_waves.jpg',
  'VoiceAudio.source': '',
  'MusicBed.source': '',
};

const key = Deno.env.get('CREATOMATE_API_KEY');
if (!key) throw new Error('CREATOMATE_API_KEY not set');

const result = await submitAndPollCreatomateRender(
  { template_id: PROVIDER_TEMPLATE_ID, modifications, output_format: 'mp4' }, key, Date.now(),
);

await Deno.mkdir('_harness/ws5_p4_ndis_corrected/renders', { recursive: true });
const mp4 = await (await fetch(result.url)).arrayBuffer();
const localPath = '_harness/ws5_p4_ndis_corrected/renders/ws5_p4_ndis_corrected.mp4';
await Deno.writeFile(localPath, new Uint8Array(mp4));
const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(mp4));
const sha256 = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');

console.log(JSON.stringify({
  render_id: result.renderId, creatomate_url: result.url, local_path: localPath,
  local_sha256: sha256, bytes: (mp4 as ArrayBuffer).byteLength, duration_ms: result.durationMs,
  live_bounds: 'PASS', modifications, db_writes: 'NONE', published: 'NO',
}, null, 2));
