// stat_generation_binding_test.ts — WS-5 P1 hermetic flow tests for the v2.26.0 stat
// generation branch (D-1 Option B + the PK gate-correction-1 template binding).
//
// Fully hermetic: globalThis.fetch is STUBBED (canned Anthropic-shaped responses; every
// request body captured) and restored in finally — NO network, NO DB, NO Deno.serve
// (index.ts guards its listener behind import.meta.main). Proves, end-to-end through the
// real exported generateVideoScript:
//   • accept-first-attempt → video_script carries stat_template_binding + stat_bounds_qa;
//   • violation → ONE re-prompt whose request contains the bounds reminder → accept →
//     outcome accepted_after_reprompt with BOTH attempts preserved;
//   • two violations → the fail-closed SENTINEL (no script) with dead_reason + binding
//     inside stat_bounds_qa;
//   • no envelope supplied → fallback_char_bounds validation, NO binding key.
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/stat_generation_binding_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { generateVideoScript } from './index.ts';
import {
  isStatBoundsFailClosed,
  STAT_BOUNDS_DEAD_REASON,
  type StatEnvelope,
} from './stat_envelope.ts';

const TEMPLATE_ID = 'a3d8472d-0000-0000-0000-000000000001';
const PROVIDER_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';

const ENVELOPE: StatEnvelope = {
  source: 'persisted',
  templateId: TEMPLATE_ID,
  fallbackReason: null,
  selected: { templateId: TEMPLATE_ID, providerTemplateId: PROVIDER_ID, variantKey: 'stat-reveal-9x16-video-v2' },
  limits: {
    stat_value: { maxChars: 12 },
    stat_label: { maxChars: 48 },
    context_line: { maxChars: 160 },
    cta_text: { maxChars: 90 },
  },
};

const CONFORMANT_SCRIPT = {
  format: 'stat_reveal',
  stat_value: '$782K',
  stat_label: 'Perth median house price',
  context_line: 'Up 3.7% over the past quarter.',
  cta_text: 'What does this mean for you?',
  total_duration_s: 20,
  narration_text: 'Perth median house price is $782K. Up 3.7% over the past quarter.',
};

const VIOLATING_SCRIPT = { ...CONFORMANT_SCRIPT, cta_text: 'q'.repeat(91) };   // 91 > 90

// Anthropic-shaped fetch stub: returns responses[i] for call i (last one repeats), captures
// every parsed request body. Restored by the caller in finally.
function stubFetch(responses: Array<Record<string, unknown>>) {
  const original = globalThis.fetch;
  const requests: Array<{ system: string; user: string }> = [];
  let calls = 0;
  globalThis.fetch = ((_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    requests.push({ system: String(body.system ?? ''), user: String(body.messages?.[0]?.content ?? '') });
    const script = responses[Math.min(calls, responses.length - 1)];
    calls += 1;
    return Promise.resolve(new Response(
      JSON.stringify({ content: [{ text: JSON.stringify(script) }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
  }) as typeof fetch;
  return { restore: () => { globalThis.fetch = original; }, requests, callCount: () => calls };
}

const OPTS = {
  anthropicKey: 'test-key-hermetic',
  formatKey: 'video_short_stat',
  postTitle: 'Perth market update',
  postBody: 'Perth median house price hit $782K, up 3.7% over the past quarter.',
  clientName: 'Property Pulse',
  vertical: 'real_estate',
};

Deno.test('flow: conformant first attempt → script carries stat_template_binding + accepted_first_attempt QA; ONE model call; prompt states envelope limits', async () => {
  const stub = stubFetch([CONFORMANT_SCRIPT]);
  try {
    const out = await generateVideoScript({ ...OPTS, statEnvelope: ENVELOPE }) as Record<string, any>;
    assert(out !== null && !isStatBoundsFailClosed(out));
    assertEquals(out.stat_value, '$782K');
    // Binding persisted INSIDE video_script (rides the set_draft_video_script merge).
    assertEquals(out.stat_template_binding.template_id, TEMPLATE_ID);
    assertEquals(out.stat_template_binding.provider_template_id, PROVIDER_ID);
    assertEquals(out.stat_template_binding.variant_key, 'stat-reveal-9x16-video-v2');
    assertEquals(out.stat_template_binding.envelope_source, 'persisted');
    // QA: one attempt, no violations, binding echoed, no dead_reason.
    assertEquals(out.stat_bounds_qa.outcome, 'accepted_first_attempt');
    assertEquals(out.stat_bounds_qa.attempts.length, 1);
    assertEquals(out.stat_bounds_qa.attempts[0].violations, []);
    assertEquals(out.stat_bounds_qa.stat_template_binding.template_id, TEMPLATE_ID);
    assertEquals('dead_reason' in out.stat_bounds_qa, false);
    assertEquals(stub.callCount(), 1);
    // The system prompt states the ACTUAL envelope limits, not the old hardcoded 35/75/65.
    assert(stub.requests[0].system.includes('max 48 chars'));
    assert(stub.requests[0].system.includes('max 160 chars'));
    assert(stub.requests[0].system.includes('max 90 chars'));
  } finally { stub.restore(); }
});

Deno.test('flow: violation then conformant → EXACTLY one re-prompt carrying the bounds reminder; accepted_after_reprompt with BOTH attempts', async () => {
  const stub = stubFetch([VIOLATING_SCRIPT, CONFORMANT_SCRIPT]);
  try {
    const out = await generateVideoScript({ ...OPTS, statEnvelope: ENVELOPE }) as Record<string, any>;
    assert(out !== null && !isStatBoundsFailClosed(out));
    assertEquals(stub.callCount(), 2);
    // The re-prompt = same system prompt + appended bounds reminder naming actual vs limit.
    assertEquals(stub.requests[1].system, stub.requests[0].system);
    assert(stub.requests[1].user.startsWith(stub.requests[0].user));
    assert(stub.requests[1].user.includes('cta_text was 91 chars (max 90)'));
    // Both attempts preserved (D-1) — attempt 1 with the violation, attempt 2 clean.
    assertEquals(out.stat_bounds_qa.outcome, 'accepted_after_reprompt');
    assertEquals(out.stat_bounds_qa.attempts.length, 2);
    assertEquals(out.stat_bounds_qa.attempts[0].violations, [{ field: 'cta_text', kind: 'chars', length: 91, max: 90 }]);
    assertEquals(out.stat_bounds_qa.attempts[0].fields.cta_text, 'q'.repeat(91));
    assertEquals(out.stat_bounds_qa.attempts[1].violations, []);
    assertEquals(out.stat_template_binding.template_id, TEMPLATE_ID);
  } finally { stub.restore(); }
});

Deno.test('flow: two violations → fail-closed SENTINEL (no script), dead_reason + binding inside stat_bounds_qa, exactly 2 calls', async () => {
  const stub = stubFetch([VIOLATING_SCRIPT, VIOLATING_SCRIPT]);
  try {
    const out = await generateVideoScript({ ...OPTS, statEnvelope: ENVELOPE });
    assert(isStatBoundsFailClosed(out));
    assertEquals(stub.callCount(), 2);                          // ONE bounded re-prompt, never a third
    const qa = (out as { stat_bounds_qa: Record<string, any> }).stat_bounds_qa;
    assertEquals(qa.outcome, 'fail_closed');
    assertEquals(qa.dead_reason, STAT_BOUNDS_DEAD_REASON);
    assertEquals(qa.attempts.length, 2);                        // BOTH attempts preserved (D-1)
    assertEquals(qa.stat_template_binding.template_id, TEMPLATE_ID);   // evidence carries identity
    // The sentinel is NOT a renderable script.
    assertEquals('stat_value' in (out as Record<string, unknown>), false);
  } finally { stub.restore(); }
});

Deno.test('flow: no envelope supplied → fallback_char_bounds validation, NO binding key (nothing was selected)', async () => {
  const stub = stubFetch([CONFORMANT_SCRIPT]);
  try {
    const out = await generateVideoScript({ ...OPTS }) as Record<string, any>;
    assert(out !== null && !isStatBoundsFailClosed(out));
    assertEquals(out.stat_bounds_qa.envelope.source, 'fallback_char_bounds');
    assertEquals(out.stat_bounds_qa.envelope.fallback_reason, 'envelope_not_provided');
    assertEquals('stat_template_binding' in out, false);
    assertEquals('stat_template_binding' in out.stat_bounds_qa, false);
    // Fallback limits are the vendored render-gate floor.
    assert(stub.requests[0].system.includes('max 12 chars'));
    assert(stub.requests[0].system.includes('max 48 chars'));
  } finally { stub.restore(); }
});
