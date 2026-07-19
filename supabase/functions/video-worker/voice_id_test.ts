// Hermetic unit tests for resolveGovernedVoice (governed voice resolution, D6-9).
// Run: deno test supabase/functions/video-worker/voice_id_test.ts
// No real DB or network — a stub supabase client returns a canned { data, error }
// from .schema().from().select().eq().eq().maybeSingle().
import { assertEquals } from 'jsr:@std/assert@1';
import { resolveGovernedVoice, type SupabaseVoiceReader } from './voice_id.ts';

const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// Build a stub whose terminal .maybeSingle() resolves to the canned result.
// Records the (schema, table, columns, eq filters) actually requested for assertion.
function stubSupabase(result: { data: any; error: any }) {
  const calls: {
    schema?: string;
    table?: string;
    columns?: string;
    eqs: Array<[string, unknown]>;
  } = { eqs: [] };
  const eqNode = {
    eq(column: string, value: unknown) {
      calls.eqs.push([column, value]);
      return eqNode; // chainable: supports the two .eq() calls, then .maybeSingle()
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
  };
  const client: SupabaseVoiceReader = {
    schema(schema: string) {
      calls.schema = schema;
      return {
        from(table: string) {
          calls.table = table;
          return {
            select(columns: string) {
              calls.columns = columns;
              return eqNode as any;
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

Deno.test('1. enabled row with a voice id → db:client_voice_config', async () => {
  const { client, calls } = stubSupabase({ data: { elevenlabs_voice_id: 'pp_voice' }, error: null });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: 'pp_voice', method: 'db:client_voice_config' });
  // sanity: reads the governed table for this client, enabled=true filter present.
  assertEquals(calls.schema, 'c');
  assertEquals(calls.table, 'client_voice_config');
  assertEquals(calls.eqs, [['client_id', PP_ID], ['enabled', true]]);
});

Deno.test('2. no row (data null) → unresolved (caller fails loud)', async () => {
  const { client } = stubSupabase({ data: null, error: null });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('3. read error → unresolved (FAIL CLOSED, never throws)', async () => {
  const { client } = stubSupabase({ data: null, error: { message: 'permission denied' } });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('4. null elevenlabs_voice_id → unresolved', async () => {
  const { client } = stubSupabase({ data: { elevenlabs_voice_id: null }, error: null });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('5. empty / whitespace voice id → treated as unresolved', async () => {
  const { client } = stubSupabase({ data: { elevenlabs_voice_id: '   ' }, error: null });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});

Deno.test('6. surrounding whitespace on a real id is trimmed', async () => {
  const { client } = stubSupabase({ data: { elevenlabs_voice_id: '  ndis_voice  ' }, error: null });
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: 'ndis_voice', method: 'db:client_voice_config' });
});

Deno.test('7. a thrown read (rejected promise) → unresolved (fail closed)', async () => {
  const client: SupabaseVoiceReader = {
    schema() {
      return {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return { maybeSingle: () => Promise.reject(new Error('network down')) };
                    },
                  };
                },
              } as any;
            },
          };
        },
      };
    },
  };
  const r = await resolveGovernedVoice(client, PP_ID);
  assertEquals(r, { voiceId: null, method: 'unresolved' });
});
