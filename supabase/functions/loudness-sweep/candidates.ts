// candidates.ts — pure candidate-selection SQL for the M1 loudness-sweep EF.
//
// UNDEPLOYED (see index.ts header for the full lane context). This module is
// intentionally SQL-TEXT-ONLY and pure -- no DB client, no side effects --
// so its predicate can be reviewed and hermetically tested (does it name the
// right columns/filters?) independently of deciding HOW the sweep EF's role
// is granted read access to it (that grant-path choice is an OPEN item, see
// the L1 result doc -- not fixed here, matching design doc §8's own
// "to_be_confirmed at Phase-1 design time" note).

export const DEFAULT_BATCH_SIZE = 10;

// Selects succeeded, audio-expected renders still carrying the qa.ts
// default 'pending' status (or, defensively, no loudness_measurement_status
// key at all -- a render logged before this field existed). Oldest-first so
// a backlog drains in submission order rather than perpetually re-picking
// the newest renders.
export function selectCandidatesSql(limit: number = DEFAULT_BATCH_SIZE): string {
  return `
    SELECT render_log_id, storage_url
    FROM m.post_render_log
    WHERE status = 'succeeded'
      AND storage_url IS NOT NULL
      AND (render_spec -> 'qa' ->> 'audio_expected') = 'true'
      AND COALESCE(render_spec -> 'qa' ->> 'loudness_measurement_status', 'pending') = 'pending'
    ORDER BY created_at ASC
    LIMIT ${Number(limit)}
  `.trim();
}
