// 0A evidence contract — types + the single source of truth for OBS labels.
// 0A records RAW observed values only. This module defines what a 0A row looks like.
// It never relates two values and never derives a verdict — that is later-stage work,
// out of scope by contract.

export interface ObservationCell {
  key: string;
  value: unknown; // as-observed value, recorded verbatim. Never a derived verdict.
  evidence_class: string;
  stage: string;
}

export interface ObservationRecord {
  post_draft_id: string;
  observer_version: string;
  stage: string; // part of the idempotency key
  evidence_class: string;
  population: string;
  eligibility: string;
  value_cells: ObservationCell[];
  source: string; // provenance: which production lineage table produced this row
  observed_at: string; // provenance (ISO timestamp)
  run_id: string; // provenance (per-invoke uuid)
}

// ============================================================================
// RECONCILE-BEFORE-SMOKE  (CCD, OBS-side — single edit point)
// ----------------------------------------------------------------------------
// These label strings + the obs.observation column names used by write_client.ts
// are authored from the OBS foundation design. They have NOT been verified against
// the live OBS project, because the authoring agent (CCH) cannot touch OBS.
//
// Before the manual smoke run, CCD MUST confirm each label against the live OBS
// enums (e.g. SELECT enumlabel FROM pg_enum JOIN pg_type ON ...) and confirm the
// obs.observation column names. If a label or column is wrong, the enum CHECK /
// obs.value_cells_valid() REJECTS the insert (fail-safe: no bad rows are written),
// and these constants are the ONLY place to correct it, then re-run.
// ============================================================================
export const OBS_CONTRACT = {
  observerVersion: "obs-observer-0A-v0.1.0",
  evidenceClass0A: "observed_raw", // 0A raw-observation class (reconcile)
  population: "asset_policy_v1", // (reconcile)
  eligibility: "observed", // (reconcile)
  stages: {
    slotIntent: "slot_intent", // intended/default asset preference for the slot (reconcile)
    fillDecision: "fill_decision", // the fill/advisor decision + chosen format (reconcile)
    draftAsset: "draft_asset", // draft recommended format + produced asset state (reconcile)
    renderOutcome: "render_outcome", // render provider/engine + outcome (reconcile)
  },
} as const;
