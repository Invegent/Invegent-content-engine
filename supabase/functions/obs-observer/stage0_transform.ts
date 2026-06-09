// RESERVED / INERT — intentionally holds no logic.
//
// This filename ("stage0_transform") is reserved (F-precondition 3) for the FUTURE
// difference transform and must NOT contain 0A raw-observation logic. The 0A raw
// observation builder now lives in `raw_observation_0a.ts` (exported: buildRaw0AObservation).
//
// The previous 0A logic that lived here (and its incorrect multi-row / wrong-schema output)
// has been removed. This stub exists only because the repo bridge cannot delete files.
//
// ACTION FOR CCD: `git rm supabase/functions/obs-observer/stage0_transform.ts` at the
// terminal to fully free the reserved name. Until then this module is inert and exports
// nothing usable.

export const RESERVED_STAGE0_TRANSFORM = true as const;
