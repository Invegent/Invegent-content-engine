#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write --allow-read
// _harness/ws5_p3_stat_calibration/probe-render.ts
//
// Lane A P3 — probe-render calibration harness for video_stat_reveal_9x16_v2 (c11bb8ab…).
// WS-5 kinetic probe-method precedent. OUT-OF-BAND: direct template-mode renders by
// provider_template_id, NO select_template, ZERO DB reads/writes, NO publish.
// Each probe = one render from the manifest below; a frame is extracted separately
// (ffmpeg, after download) for text-fit judgment. Probe evidence (render ids + frames)
// backs the P3 `set_tmr_field_constraints` limit triples (basis='probe_calibrated').
//
// Usage: deno run ... probe-render.ts <probe_id>
//   (one probe per invocation — keeps the 2-min ceiling watch per render honest)

import { submitAndPollCreatomateRender } from '../../supabase/functions/video-worker/creatomate_submit.ts';

const PROVIDER_TEMPLATE_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';
const BG = 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_family_backyard_summer.jpg';
const LOGO = 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png';

// Probe manifest. Char counts noted; W = deliberately wide glyphs.
const PROBES: Record<string, Record<string, string>> = {
  // R1 — realistic maxima on every field at once (fast full-envelope check)
  r1_realistic_max: {
    'EyebrowText.text': 'MARKET UPDATE',                            // 13ch (PP governed value)
    'StatValue': '$1,234,567',                                      // 10ch realistic numeric
    'StatLabel': 'MEDIAN WEEKLY ASKING RENT GROWTH YOY',            // 35ch (old prompt max)
    'ContextLine': 'Perth asking rents have climbed faster than any other capital this year.', // 75ch (old prompt max)
    'CtaText': 'Wondering what this means for your property plans?', // 49ch realistic
  },
  // R2 — render-gate maxima with wide glyphs (worst case the CURRENT floor permits)
  r2_gate_max_wide: {
    'EyebrowText.text': 'NDIS UPDATE',                              // 11ch (NDIS governed value)
    'StatValue': '+$88,888,888',                                    // 12ch = render-gate max, wide glyphs
    'StatLabel': 'HOME OWNERSHIP AMONG WORKING AUSTRALIAN ADULTS',  // 48ch = render-gate max
    'ContextLine': 'Amid mounting affordability pressure across every major Australian capital city market, homeownership amongst working households has continued moving downward.', // 160ch = render-gate max
    'CtaText': 'What would a change like this mean for your own household budget this year? Tell us below.', // 90ch = render-gate max (94ch trimmed to 90)
  },
  // R4 — lower-bracket bisection (find the one-line maxima)
  r4_bisect_low: {
    'EyebrowText.text': 'MARKET UPDATE',
    'StatValue': '$62.17/hr',                                       // 9ch single token (the prompt's own example)
    'StatLabel': 'MEDIAN ASKING RENT GROWTH',                       // 26ch
    'ContextLine': 'Perth asking rents have climbed faster than every other Australian capital city over the past year.', // 103ch → expect 3 lines
    'CtaText': 'Is your suburb keeping pace this year?',            // 38ch
  },
  // R5 — upper-bracket bisection
  r5_bisect_high: {
    'EyebrowText.text': 'NDIS UPDATE',
    'StatValue': '$650,000',                                        // 8ch single token
    'StatLabel': 'OF PARTICIPANTS SELF-MANAGING',                   // 30ch
    'ContextLine': 'Access to allied health support now varies more by postcode than by plan size, new quarterly scheme data shows for participants.', // 130ch → expect 4 lines
    'CtaText': 'What supports would you add to your plan?',         // 42ch
  },
  // R6 — StatValue one-line pin: 7ch at maximum glyph width ($ + wide digits + comma)
  r6_statvalue_7ch_wide: {
    'EyebrowText.text': 'MARKET UPDATE',
    'StatValue': '$88,888',                                         // 7ch, widest glyph mix
    'StatLabel': 'MEDIAN ASKING RENT GROWTH',                       // 26ch (known pass)
    'ContextLine': 'Perth asking rents have climbed faster than every other Australian capital city over the past year.', // known pass
    'CtaText': 'Is your suburb keeping pace this year?',            // 38ch (known pass)
  },
  // R3 — THE DEFECT REGRESSION: the live-incident content shape ("2 people", two words, 8ch)
  r3_defect_regression: {
    'EyebrowText.text': 'NDIS UPDATE',
    'StatValue': '2 people',                                        // 8ch, 2 words — the oCrtq6R9VFQ defect fixture
    'StatLabel': 'IN EVERY 5 NDIS PARTICIPANTS',
    'ContextLine': 'Support coordination access varies widely between regional and metro participants.',
    'CtaText': 'Does your plan include the supports you actually use?',
  },
};

const probeId = Deno.args[0];
if (!probeId || !PROBES[probeId]) {
  console.error(`usage: probe-render.ts <${Object.keys(PROBES).join('|')}>`);
  Deno.exit(2);
}

const modifications: Record<string, string> = {
  ...PROBES[probeId],
  'Logo.source': LOGO,
  'Background.source': BG,
  'VoiceAudio.source': '',
  'MusicBed.source': '',
};

const key = Deno.env.get('CREATOMATE_API_KEY');
if (!key) throw new Error('CREATOMATE_API_KEY not set');

const result = await submitAndPollCreatomateRender(
  { template_id: PROVIDER_TEMPLATE_ID, modifications, output_format: 'mp4' }, key, Date.now(),
);

await Deno.mkdir('_harness/ws5_p3_stat_calibration/renders', { recursive: true });
const mp4 = await (await fetch(result.url)).arrayBuffer();
const localPath = `_harness/ws5_p3_stat_calibration/renders/${probeId}.mp4`;
await Deno.writeFile(localPath, new Uint8Array(mp4));
const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(mp4));
const sha256 = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');

console.log(JSON.stringify({ probe: probeId, render_id: result.renderId, local_path: localPath,
  local_sha256: sha256, duration_ms: result.durationMs, modifications: PROBES[probeId],
  db_writes: 'NONE', published: 'NO' }));
