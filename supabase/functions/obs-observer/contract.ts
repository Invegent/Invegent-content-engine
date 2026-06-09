// 0A evidence contract — types + single source of truth, aligned to the LIVE OBS schema.
//
// Live OBS write model (reconciled OBS-side by CCD):
//   obs.observation row columns inserted by the observer:
//     post_draft_id, observer_version, stage, population, eligibility,
//     observed_at (now(), NOT NULL no-default), policy_input_snapshot (jsonb object),
//     value_cells (jsonb array)
//   Idempotency key: (post_draft_id, observer_version, stage). stage is always '0A',
//   so this is effectively ONE 0A row per (post_draft_id, observer_version).
//
// NOT top-level columns (must NOT be inserted): evidence_class, source, run_id.
// (evidence_class lives PER CELL inside value_cells, never at row level.)
//
// 0A records raw observed facts + a derived lifecycle eligibility. It never relates two
// values and never derives a verdict between expected/actual — that is the later 0A->0B
// transform, out of scope here.

export interface ObservationCell {
  name: string; // live schema uses `name`, NOT `key`
  value: unknown; // as-observed value, recorded verbatim
  evidence_class: string; // observed_fact | reconstructed_fact | unknown_unavailable
  stage: string; // MUST equal the row stage, i.e. '0A'
}

export interface ObservationRecord {
  post_draft_id: string;
  observer_version: string;
  stage: string; // '0A'
  population: string; // 'slot_origin'
  eligibility: string; // terminal | in_flight | indeterminate
  policy_input_snapshot: Record<string, unknown>;
  value_cells: ObservationCell[];
}

export const OBS_CONTRACT = {
  // Bumped for the schema rework (was v0.1.0 with the wrong shape). OBS has 0 rows, so no
  // collision; the new version also keeps any future re-run isolated from the old contract.
  observerVersion: "obs-observer-0A-v0.2.0",
  stage: "0A",
  population: "slot_origin",
  evidenceClass: {
    observed: "observed_fact", // value present / directly observed
    reconstructed: "reconstructed_fact", // assembled from other observed facts (unused for raw cells)
    unknown: "unknown_unavailable", // null / unavailable
  },
  eligibility: {
    terminal: "terminal", // asset-production lifecycle is settled
    inFlight: "in_flight", // still processing
    indeterminate: "indeterminate", // cannot classify from observed state
  },
  // ==========================================================================
  // RECONCILE-BEFORE-SMOKE (CCD, OBS-side) — eligibility status vocabularies.
  // The row/column/enum shape above is now CCD-reconciled against live OBS. The ONLY
  // remaining unverified piece is the status-string sets used to derive `eligibility`.
  // IMPORTANT: a wrong status set does NOT fail-safe-reject (eligibility is still one of
  // the 3 valid enum values), so a wrong set SILENTLY mis-buckets. CCD MUST confirm these
  // against the live status vocabularies of m.slot.status / m.post_render_log.status /
  // m.post_draft.image_status / video_status before smoke. Unknown statuses fall through
  // to `indeterminate` (the safe default).
  // ==========================================================================
  terminalStatuses: [
    "published",
    "filled",
    "complete",
    "completed",
    "success",
    "succeeded",
    "done",
    "failed",
    "error",
    "dead",
    "skipped",
    "cancelled",
    "canceled",
    // CCD step-5 reconciliation vs live production status vocab (2026-06-09):
    "generated", // asset produced (image/video_status) — production lifecycle settled
    "archived_stale", // video_status — soft-retired draft; settled, will not progress
  ],
  inFlightStatuses: [
    "pending",
    "queued",
    "processing",
    "in_progress",
    "running",
    "generating",
    "rendering",
    "needs_review",
    "retry",
    "retrying",
    "awaiting",
    // CCD step-5 reconciliation vs live production status vocab (2026-06-09):
    "future", // slot.status — scheduled but not yet filled; in pipeline, not settled
  ],
} as const;
