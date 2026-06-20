// voice_id.ts — pure ElevenLabs voice-id resolver for video-worker.
//
// WHY THIS EXISTS (root cause): service_role lacks SELECT on c.client, so
// video-worker's getBrand() PostgREST read of c.client.client_slug returns null
// and falls back to the client UUID. The old getVoiceId(clientSlug) then received
// a UUID, matched no property/pp/ndis substring alias, returned null, and the
// voice render failed before ElevenLabs with
//   "No ElevenLabs voice ID configured for client_slug=<uuid>".
//
// Fix: resolve the ElevenLabs voice by client_id (always present on the draft),
// independent of getBrand().clientSlug. A UUID-valued clientSlug MUST NOT enter
// the substring-alias path. getBrand() is still used for brand colour/logo/profile;
// only voice identity stops depending on its slug fallback.
//
// Pure + dependency-free + unit-tested (voice_id_test.ts). Importable WITHOUT
// side effects (no Deno.serve). env is injectable for hermetic tests.
//
// NOTE: this maps a known client_id to the NAME of an existing env secret; it never
// reads or prints secret VALUES beyond the resolved voice id needed by the caller.

// Confirmed client_id → env-secret NAME map (existing secrets — do not rename).
export const VOICE_ENV_BY_CLIENT_ID: Record<string, string> = {
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd': 'ELEVENLABS_VOICE_ID_PP',   // Property Pulse
  'fb98a472-ae4d-432d-8738-2273231c1ef4': 'ELEVENLABS_VOICE_ID_NDIS', // NDIS-Yarns
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VoiceResolution = { voiceId: string | null; method: string };

// Resolution order:
//   1. client_id first (authoritative; the UUID is always on the draft).
//   2. slug secondary, ONLY if a REAL (non-UUID) slug is available:
//        - exact ELEVENLABS_VOICE_ID_<SLUG_UPPER> (slug upper-cased, '-'→'_')
//        - else substring aliases: 'ndis' → PP/NDIS voice envs.
//      A UUID-valued clientSlug MUST NOT enter this path.
//   3. else unresolved (null) → caller fails loud.
export function getVoiceIdForDraft(
  opts: { clientId: string; clientSlug?: string | null; format: string },
  env: (k: string) => string | undefined = (k) => Deno.env.get(k),
): VoiceResolution {
  const { clientId, clientSlug } = opts;

  // 1. client_id first.
  const envName = VOICE_ENV_BY_CLIENT_ID[clientId];
  if (envName) {
    const v = env(envName);
    if (v) return { voiceId: v, method: `client_id:${envName}` };
  }

  // 2. slug secondary — only when a REAL slug is available (never a UUID).
  if (clientSlug && !UUID_RE.test(clientSlug)) {
    const slugUpper = clientSlug.toUpperCase().replace(/-/g, '_');
    const exact = env(`ELEVENLABS_VOICE_ID_${slugUpper}`);
    if (exact) return { voiceId: exact, method: `slug_exact:${slugUpper}` };

    const lower = clientSlug.toLowerCase();
    if (lower.includes('ndis')) {
      const v = env('ELEVENLABS_VOICE_ID_NDIS');
      if (v) return { voiceId: v, method: 'slug_alias:ndis' };
    }
    if (lower.includes('property') || lower.includes('pp')) {
      const v = env('ELEVENLABS_VOICE_ID_PP');
      if (v) return { voiceId: v, method: 'slug_alias:pp' };
    }
  }

  // 3. unresolved.
  return { voiceId: null, method: 'unresolved' };
}
