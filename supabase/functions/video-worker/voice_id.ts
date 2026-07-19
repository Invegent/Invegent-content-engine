// voice_id.ts — governed ElevenLabs voice-id resolver for video-worker.
//
// WHY THIS EXISTS (root cause): service_role lacks SELECT on c.client, so
// video-worker's getBrand() PostgREST read of c.client.client_slug returns null
// and falls back to the client UUID. The old slug-based resolver then received a
// UUID, matched no property/pp/ndis substring alias, returned null, and the voice
// render failed before ElevenLabs. The interim fix (v3.1.4) mapped a known
// client_id → the NAME of an env secret via VOICE_ENV_BY_CLIENT_ID; that map was a
// hardcoded, per-client edit-and-redeploy chokepoint.
//
// v3.9.0 (Video D6 Lane 4b, D6-9): voice identity is now GOVERNED IN THE DB.
// resolveGovernedVoice() reads c.client_voice_config (client_id PK,
// elevenlabs_voice_id NOT NULL, enabled boolean) with the service-role client and
// returns the configured voice for an enabled row. The hardcoded
// VOICE_ENV_BY_CLIENT_ID map and the slug-alias fallback are RETIRED — adding a new
// client's voice is a governed data row, not a code change.
//
// FAIL CLOSED: no row / disabled / null / empty voice id / ANY read error →
// { voiceId: null, method: 'unresolved' } — this function NEVER throws (mirrors the
// isVideoGovernanceEnabled catch-→-false pattern in index.ts). The callers keep
// their existing `if (!voiceId) throw` fail-loud so an unconfigured client renders
// video_status='failed', never a silent wrong-voice render.
//
// Importable WITHOUT side effects (no Deno.serve). The supabase client is injectable
// for hermetic tests (voice_id_test.ts) — a stub whose
// .schema().from().select().eq().eq().maybeSingle() returns a canned { data, error }.

export type VoiceResolution = { voiceId: string | null; method: string };

// Minimal structural type of the supabase client surface this resolver touches.
// Deliberately broad (schema→any) so the real service-role SupabaseClient assigns
// without a deep structural comparison, while tests can inject a canned stub.
export type SupabaseVoiceReader = { schema: (schema: string) => any };

// Governed voice resolution. Reads c.client_voice_config for an ENABLED row keyed on
// client_id and returns its elevenlabs_voice_id. Fail-closed on every negative path.
export async function resolveGovernedVoice(
  supabase: SupabaseVoiceReader,
  clientId: string,
): Promise<VoiceResolution> {
  try {
    const { data, error } = await supabase.schema('c').from('client_voice_config')
      .select('elevenlabs_voice_id').eq('client_id', clientId).eq('enabled', true).maybeSingle();
    if (error) {
      console.error('[video-worker] voice config read error (fail-closed → unresolved):', (error as any)?.message ?? error);
      return { voiceId: null, method: 'unresolved' };
    }
    const voiceId = (data?.elevenlabs_voice_id ?? '').trim();
    if (!voiceId) return { voiceId: null, method: 'unresolved' };
    return { voiceId, method: 'db:client_voice_config' };
  } catch (e: any) {
    console.error('[video-worker] voice config read threw (fail-closed → unresolved):', e?.message);
    return { voiceId: null, method: 'unresolved' };
  }
}
