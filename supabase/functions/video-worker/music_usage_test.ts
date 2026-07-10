// Hermetic unit tests for the governed music-usage recording seam (v3.7.0, cc-0034).
// Run: deno test supabase/functions/video-worker/music_usage_test.ts
// No env, no network, no DB — the supabase client is a plain in-memory stub.
import { assertEquals } from 'jsr:@std/assert@1';
import { mapSelectMusicRow, musicUsageFromBed, recordMusicUsage, type ResolvedMusicBed } from './music_usage.ts';
import { buildGovernedVideoStatPlan, type B1VideoStatFields } from './b1_video_stat.ts';

const BASE = 'https://proj.supabase.co/storage/v1/object/public/';
const TRACK = 'a1111111-1111-1111-1111-111111111111';
const STORAGE = 'post-music/global/calm/drifting_piano.mp3';

// ── mapSelectMusicRow (pure) ────────────────────────────────────────────────────
Deno.test('map: row with track_id + storage_path → url + trackId', () => {
  const bed = mapSelectMusicRow([{ storage_path: STORAGE, track_id: TRACK }], BASE);
  assertEquals(bed, { url: `${BASE}${STORAGE}`, trackId: TRACK });
});
Deno.test('map: empty result set → { url:"", trackId:null } (silent bed, N1/D3)', () => {
  assertEquals(mapSelectMusicRow([], BASE), { url: '', trackId: null });
});
Deno.test('map: null/undefined rows → { url:"", trackId:null }', () => {
  assertEquals(mapSelectMusicRow(null, BASE), { url: '', trackId: null });
  assertEquals(mapSelectMusicRow(undefined, BASE), { url: '', trackId: null });
});
Deno.test('map: does not double-prefix — storage_path is already bucket-prefixed', () => {
  const bed = mapSelectMusicRow([{ storage_path: STORAGE, track_id: TRACK }], BASE);
  assertEquals(bed.url, `${BASE}post-music/global/calm/drifting_piano.mp3`);
});
Deno.test('map: blank storage_path → treated as no bed (trackId forced null so trackId ⟺ url)', () => {
  assertEquals(mapSelectMusicRow([{ storage_path: '', track_id: TRACK }], BASE), { url: '', trackId: null });
});
Deno.test('map: storage_path present but null track_id → url set, trackId null (cannot record without id)', () => {
  const bed = mapSelectMusicRow([{ storage_path: STORAGE, track_id: null }], BASE);
  assertEquals(bed, { url: `${BASE}${STORAGE}`, trackId: null });
});

// ── musicUsageFromBed (pure) ────────────────────────────────────────────────────
Deno.test('descriptor: bed bound → { trackId, format }', () => {
  const bed: ResolvedMusicBed = { url: `${BASE}${STORAGE}`, trackId: TRACK };
  assertEquals(musicUsageFromBed(bed, 'video_short_stat'), { trackId: TRACK, format: 'video_short_stat' });
});
Deno.test('descriptor: zero eligible (trackId null) → null → NO usage (D3)', () => {
  assertEquals(musicUsageFromBed({ url: '', trackId: null }, 'video_short_stat'), null);
});

// ── resolve → plan chain: MusicBed.source key ALWAYS present, "" when no bed, volume NEVER set ──
Deno.test('chain: bed bound → MusicBed.source = the bound url; volume never set', () => {
  const fields: B1VideoStatFields = { statValue: '$782K', statLabel: 'Perth median', contextLine: 'Up 3.7%.', ctaText: 'Learn more' };
  const bed = mapSelectMusicRow([{ storage_path: STORAGE, track_id: TRACK }], BASE);
  const plan = buildGovernedVideoStatPlan(fields, 'https://x/logo.png', 'https://x/voice.mp3', bed.url);
  assertEquals('MusicBed.source' in plan.modifications, true);
  assertEquals(plan.modifications['MusicBed.source'], `${BASE}${STORAGE}`);
  assertEquals('MusicBed.volume' in plan.modifications, false);
});
Deno.test('chain: no bed → MusicBed.source present and "", volume never set', () => {
  const fields: B1VideoStatFields = { statValue: '$782K', statLabel: 'Perth median', contextLine: 'Up 3.7%.', ctaText: 'Learn more' };
  const bed = mapSelectMusicRow([], BASE);
  const plan = buildGovernedVideoStatPlan(fields, 'https://x/logo.png', 'https://x/voice.mp3', bed.url);
  assertEquals('MusicBed.source' in plan.modifications, true);
  assertEquals(plan.modifications['MusicBed.source'], '');
  assertEquals('MusicBed.volume' in plan.modifications, false);
});

// ── recordMusicUsage (stubbed supabase — no network/DB) ─────────────────────────
function makeSupabaseStub(behaviour: { result?: { error: { message?: string } | null }; reject?: boolean } = {}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      if (behaviour.reject) return Promise.reject(new Error('rpc-transport-error'));
      return Promise.resolve(behaviour.result ?? { error: null });
    },
  };
  return { client, calls };
}

Deno.test('record: bed bound + rpc ok → { recorded:true } with the right params (platform NULL)', async () => {
  const { client, calls } = makeSupabaseStub();
  const res = await recordMusicUsage(client, {
    musicUsage: { trackId: TRACK, format: 'video_short_stat' },
    renderId: 'cm-render-123', clientId: 'client-9', postDraftId: 'draft-7',
  });
  assertEquals(res, { recorded: true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].fn, 'record_music_usage');
  assertEquals(calls[0].args, {
    p_track_id: TRACK,
    p_render_id: 'cm-render-123',
    p_client_id: 'client-9',
    p_draft_id: 'draft-7',
    p_platform: null,
    p_format: 'video_short_stat',
  });
});

Deno.test('record: no musicUsage (no bed bound) → NO rpc call, { recorded:false } (D3)', async () => {
  const { client, calls } = makeSupabaseStub();
  const res = await recordMusicUsage(client, { musicUsage: null, renderId: 'cm-render-123', clientId: 'c', postDraftId: 'd' });
  assertEquals(res, { recorded: false });
  assertEquals(res.error, undefined); // no-op is NOT a failure → no alarm
  assertEquals(calls.length, 0);
});

Deno.test('record: null renderId (production path) → NO rpc call (FIX 2: never call with null render_id)', async () => {
  const { client, calls } = makeSupabaseStub();
  const res = await recordMusicUsage(client, { musicUsage: { trackId: TRACK, format: 'video_short_stat' }, renderId: null, clientId: 'c', postDraftId: 'd' });
  assertEquals(res, { recorded: false });
  assertEquals(calls.length, 0);
});

Deno.test('record: null renderId (smoke path) → NO rpc call (FIX 2: guarded on BOTH paths)', async () => {
  const { client, calls } = makeSupabaseStub();
  const res = await recordMusicUsage(client, { musicUsage: { trackId: TRACK, format: 'video_short_stat' }, renderId: null, clientId: null, postDraftId: null });
  assertEquals(res, { recorded: false });
  assertEquals(calls.length, 0);
});

// PK 2026-07-10: recordMusicUsage NEVER throws. It returns { recorded:false, error } on a real write
// failure; the CALLER (renderUploadAndLog) decides how loudly to log and always keeps the render.
Deno.test('record: production draft + rpc error → { recorded:false, error } (does NOT throw)', async () => {
  const { client, calls } = makeSupabaseStub({ result: { error: { message: 'relation "m.music_usage_event" does not exist' } } });
  const res = await recordMusicUsage(client, {
    musicUsage: { trackId: TRACK, format: 'video_short_stat' },
    renderId: 'cm-render-123', clientId: 'client-9', postDraftId: 'draft-7',
  });
  assertEquals(res.recorded, false);
  assertEquals(typeof res.error, 'string');
  assertEquals(res.error?.includes('does not exist'), true);
  assertEquals(calls.length, 1); // the rpc was attempted
});

Deno.test('record: production draft + rpc transport rejection → { recorded:false, error } (does NOT throw)', async () => {
  const { client } = makeSupabaseStub({ reject: true });
  const res = await recordMusicUsage(client, {
    musicUsage: { trackId: TRACK, format: 'video_short_stat' },
    renderId: 'cm-render-123', clientId: 'client-9', postDraftId: 'draft-7',
  });
  assertEquals(res.recorded, false);
  assertEquals(res.error, 'rpc-transport-error');
});

Deno.test('record: smoke (postDraftId null) + rpc error → { recorded:false, error }, rpc attempted (no throw)', async () => {
  const { client, calls } = makeSupabaseStub({ result: { error: { message: 'boom' } } });
  const res = await recordMusicUsage(client, {
    musicUsage: { trackId: TRACK, format: 'video_short_stat' },
    renderId: 'cm-render-123', clientId: null, postDraftId: null,
  });
  assertEquals(res.recorded, false);
  assertEquals(res.error, 'boom');
  assertEquals(calls.length, 1);
});
