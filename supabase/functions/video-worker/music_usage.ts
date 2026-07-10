// music_usage.ts — CREATIVE-LIBRARY VIDEO TMR / governed music-usage recording (video-worker).
//
// cc-0034 (v3.7.0): a governed render must record WHICH governed music track it consumed, into
// m.music_usage_event, via the RPC public.record_music_usage. This module is the small, testable
// seam for that recording so the decision logic (D3 "bed actually bound" and D5 strict/lenient)
// is exercised hermetically without importing index.ts (whose Deno.serve entrypoint cannot be
// pulled into a unit test). index.ts calls these three helpers; the RPC contract is OWNED by the
// TMR Music Lane migration — this worker only CALLS it (the RPC 404s until that migration lands,
// which is expected: the governed combo branch is DARK and the smoke follows the apply).
//
// record_music_usage(p_track_id uuid, p_render_id uuid, p_client_id uuid DEFAULT NULL,
//                    p_draft_id uuid DEFAULT NULL, p_platform text DEFAULT NULL,
//                    p_format text DEFAULT NULL) RETURNS void
//   - p_render_id is the CREATOMATE render UUID (NOT m.post_render_log.render_log_id).
//   - Idempotent per render id (ON CONFLICT DO NOTHING) → a retry is safe.
//   - Raises on unknown/NULL track_id.

// The resolved governed bed: the public URL ('' = no eligible track / silent bed, N1) plus the
// governed track_id it came from (null when there is no bound bed). trackId is deliberately kept
// null whenever url is '' so that "bed bound" ⟺ trackId !== null ⟺ url !== '' (D3: a usage row is
// written ONLY when a bed was actually bound).
export type ResolvedMusicBed = { url: string; trackId: string | null };

// The descriptor passed into renderUploadAndLog when — and only when — a bed was bound.
export type MusicUsageDescriptor = { trackId: string; format: string };

// PURE. Map a public.select_music result row set to the resolved bed. Mirrors the exact URL
// composition the worker used before (…/object/public/<storage_path>, storage_path already
// bucket-prefixed — do NOT double-prefix). An empty result set → { url:'', trackId:null }. A row
// with a blank storage_path is treated as "no bed" (url '') and, so that trackId tracks url
// exactly (D3), its trackId is forced null. A row with a storage_path but a null/blank track_id
// yields a non-empty url with trackId null — record_music_usage cannot be called without a track
// id, so the caller (keying on trackId) correctly records nothing.
export function mapSelectMusicRow(
  rows: Array<{ storage_path?: string | null; track_id?: string | null }> | null | undefined,
  publicObjectBaseUrl: string,
): ResolvedMusicBed {
  const list = rows ?? [];
  if (list.length === 0) return { url: '', trackId: null };
  const row = list[0] ?? {};
  const storagePath = String(row.storage_path ?? '');
  if (!storagePath) return { url: '', trackId: null };
  const rawTrack = row.track_id == null ? '' : String(row.track_id);
  const trackId = rawTrack.length > 0 ? rawTrack : null;
  return { url: `${publicObjectBaseUrl}${storagePath}`, trackId };
}

// PURE. Build the usage descriptor for a render. Returns null when no bed was bound (trackId
// null) → the caller passes musicUsage:null → recordMusicUsage no-ops → NO usage row (D3).
export function musicUsageFromBed(bed: ResolvedMusicBed, format: string): MusicUsageDescriptor | null {
  return bed.trackId ? { trackId: bed.trackId, format } : null;
}

// Minimal structural shape of the supabase client this module needs (kept local so tests can pass
// a plain stub — no network, no DB). rpc is typed as a PromiseLike (thenable), which the real
// supabase-js rpc builder satisfies without being a full Promise; the resolved value is read
// permissively for the same reason (supabase's own rpc payload is `any`-typed here).
type MusicUsageRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error?: { message?: string } | null } | null | undefined>;
};

// Outcome of a recordMusicUsage attempt:
//   { recorded: true }                   — a usage row was written (or idempotently already present).
//   { recorded: false }                  — nothing to record (no bed bound / no render id): NOT a failure.
//   { recorded: false, error: <msg> }    — a bed WAS bound but the RPC write failed. The caller decides
//                                          how loudly to log; per PK 2026-07-10 it NEVER fails the render.
export type RecordMusicUsageResult = { recorded: boolean; error?: string };

// Record the governed music-track usage for a successful render, if a bed was bound. NEVER THROWS
// (PK 2026-07-10 reversed the earlier strict-throw): losing a bookkeeping write must not destroy a
// paid, successful render. Returns a RecordMusicUsageResult; the caller (renderUploadAndLog) logs
// the alarm and always continues.
//   - No-op → { recorded:false } (no error) when musicUsage is absent (no bed bound) OR renderId is
//     null (FIX 2 — never call the RPC with a null render id; the partial unique index only
//     constrains non-NULL render_id, so a NULL would double-log on retry).
//   - platform is NULL deliberately: a draft fans out to multiple platforms; do not invent one.
export async function recordMusicUsage(
  supabase: MusicUsageRpcClient,
  opts: {
    musicUsage: MusicUsageDescriptor | null | undefined;
    renderId: string | null;
    clientId: string | null;
    postDraftId: string | null;
  },
): Promise<RecordMusicUsageResult> {
  const { musicUsage, renderId, clientId, postDraftId } = opts;
  if (!musicUsage || !renderId) return { recorded: false };  // nothing to record (FIX 2)
  try {
    const res = await supabase.rpc('record_music_usage', {
      p_track_id: musicUsage.trackId,
      p_render_id: renderId,
      p_client_id: clientId,
      p_draft_id: postDraftId,
      p_platform: null,
      p_format: musicUsage.format,
    });
    const error = res?.error;
    if (error) return { recorded: false, error: error.message ?? 'record_music_usage returned an error' };
    return { recorded: true };
  } catch (e: any) {
    // A transport/unexpected rejection is still just a lost bookkeeping write — surface it, never throw.
    return { recorded: false, error: (e?.message ?? String(e)).slice(0, 300) };
  }
}
