#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write
// _harness/ws5_p2_pp_nonregression/pp-nonregression-render.ts
//
// Lane A P2 — MANDATORY PP NON-REGRESSION RENDER (PK ruling D-3, 2026-08-03).
// OUT-OF-BAND by the ws4-d4 precedent: hand-supplied provider_template_id, NO select_template,
// NO classify_format_capability, ZERO DB reads or writes. NO publish. The result is a local mp4
// + printed JSON evidence; PK's visual comparison against the accepted baseline
// (f607a66d / _harness/cc0044_cpE_coupled_proof/renders/cc0044_cpE_pp_governed_video.mp4)
// is the only deciding act.
//
// Comparison design (recorded in the lane record):
//   - provider template c11bb8ab-18bd-45ff-aedd-0a59cb3773ab (video_stat_reveal_9x16_v2,
//     post-eyebrow-parameterisation save; saved source frozen at
//     docs/briefs/artifacts/ws5-p2-video-stat-reveal-9x16-v2-eyebrow-param-source-v1.json f98a8e08…)
//   - EyebrowText.text = 'MARKET UPDATE' passed EXPLICITLY (proves the new dynamic binding AND
//     preserves PP's copy per D-3)
//   - 4 stat texts = the template's own saved defaults (byte-same strings as pre-edit) so the
//     visual diff vs baseline isolates template chrome/geometry/animation
//   - Background = the baseline's governed asset bg_pp_family_backyard_summer; Logo = PP_logo_2.png
//   - VoiceAudio/MusicBed = '' (explicit silent — Creatomate '' = silent by design). Audio-SHAPE
//     non-regression is proven STATICALLY: the saved post-edit source's audio elements are
//     byte-identical to pre-edit (only the track-5 eyebrow element changed).
//   - 2-min render ceiling watch: poll timeout surfaced, not retried (STOP rule).

import { submitAndPollCreatomateRender } from '../../supabase/functions/video-worker/creatomate_submit.ts';

const PROVIDER_TEMPLATE_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';

const modifications: Record<string, string> = {
  'EyebrowText.text': 'MARKET UPDATE',
  'StatValue': '34.2%',
  'StatLabel': 'MEDIAN PRICE GROWTH',
  'ContextLine': 'Perth dwelling values over the past 12 months, outpacing the national average.',
  'CtaText': "Thinking of selling? Let's talk numbers.",
  'Logo.source': 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png',
  'Background.source': 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_family_backyard_summer.jpg',
  'VoiceAudio.source': '',
  'MusicBed.source': '',
};

const key = Deno.env.get('CREATOMATE_API_KEY');
if (!key) throw new Error('CREATOMATE_API_KEY not set');

const renderScript = { template_id: PROVIDER_TEMPLATE_ID, modifications, output_format: 'mp4' };
const started = Date.now();
console.log('[pp-nonregression] submitting template-mode render (out-of-band, zero DB writes)…');
const result = await submitAndPollCreatomateRender(renderScript, key, started);

const outPath = new URL('./renders/', import.meta.url).pathname.replace(/^\//, '').replace(/\//g, '\\');
await Deno.mkdir('_harness/ws5_p2_pp_nonregression/renders', { recursive: true });
const mp4 = await (await fetch(result.url)).arrayBuffer();
const localPath = '_harness/ws5_p2_pp_nonregression/renders/ws5_p2_pp_nonregression.mp4';
await Deno.writeFile(localPath, new Uint8Array(mp4));

const bytes = new Uint8Array(mp4);
const digest = await crypto.subtle.digest('SHA-256', bytes);
const sha256 = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');

console.log(JSON.stringify({
  render_id: result.renderId,
  creatomate_url: result.url,
  local_path: localPath,
  local_sha256: sha256,
  bytes: bytes.length,
  duration_ms: result.durationMs,
  credits_used: result.creditsUsed,
  modifications,
  template_id: PROVIDER_TEMPLATE_ID,
  db_writes: 'NONE',
  published: 'NO',
}, null, 2));
