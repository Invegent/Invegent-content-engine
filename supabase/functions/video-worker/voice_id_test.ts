// Hermetic unit tests for getVoiceIdForDraft (voice-id resolution hardening).
// Run: deno test supabase/functions/video-worker/voice_id_test.ts
// env is injected (fake map) — no real Deno env is set or read.
import { assertEquals } from 'jsr:@std/assert@1';
import { getVoiceIdForDraft } from './voice_id.ts';

const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NDIS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
const fakeEnv = (m: Record<string, string>) => (k: string) => m[k];

Deno.test('1. Property Pulse client_id resolves via client_id', () => {
  const r = getVoiceIdForDraft(
    { clientId: PP_ID, clientSlug: null, format: 'video_short_kinetic_voice' },
    fakeEnv({ ELEVENLABS_VOICE_ID_PP: 'pp_voice' }),
  );
  assertEquals(r, { voiceId: 'pp_voice', method: 'client_id:ELEVENLABS_VOICE_ID_PP' });
});

Deno.test('2. NDIS-Yarns client_id resolves via client_id', () => {
  const r = getVoiceIdForDraft(
    { clientId: NDIS_ID, clientSlug: null, format: 'video_short_stat_voice' },
    fakeEnv({ ELEVENLABS_VOICE_ID_NDIS: 'ndis_voice' }),
  );
  assertEquals(r, { voiceId: 'ndis_voice', method: 'client_id:ELEVENLABS_VOICE_ID_NDIS' });
});

Deno.test('3. UUID-valued clientSlug must NOT resolve via substring alias', () => {
  // Unknown client_id (not in the map); clientSlug is a UUID; alias envs are set.
  const r = getVoiceIdForDraft(
    { clientId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', clientSlug: PP_ID, format: 'video_short_kinetic_voice' },
    fakeEnv({ ELEVENLABS_VOICE_ID_PP: 'pp_voice', ELEVENLABS_VOICE_ID_NDIS: 'ndis_voice' }),
  );
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('4. Unknown client_id + no matching env → unresolved (caller fails loud)', () => {
  const r = getVoiceIdForDraft(
    { clientId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', clientSlug: null, format: 'video_short_kinetic_voice' },
    fakeEnv({}),
  );
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('5. Real (non-UUID) slug fallback still works for unknown client_id', () => {
  const r = getVoiceIdForDraft(
    { clientId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', clientSlug: 'property-pulse', format: 'video_short_kinetic_voice' },
    fakeEnv({ ELEVENLABS_VOICE_ID_PP: 'pp_voice' }),
  );
  assertEquals(r, { voiceId: 'pp_voice', method: 'slug_alias:pp' });
});

Deno.test('6. (sanity) PP client_id resolves even when clientSlug is the UUID (real-world case)', () => {
  const r = getVoiceIdForDraft(
    { clientId: PP_ID, clientSlug: PP_ID, format: 'video_short_kinetic_voice' },
    fakeEnv({ ELEVENLABS_VOICE_ID_PP: 'pp_voice' }),
  );
  assertEquals(r, { voiceId: 'pp_voice', method: 'client_id:ELEVENLABS_VOICE_ID_PP' });
});
