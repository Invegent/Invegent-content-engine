// stage0_transform — THE SINGLE named transform point.
// Converts one allowed production read row into RAW 0A observation records.
// Each cell is an independent as-observed fact tagged with its evidence_class + stage.
// This module records values verbatim; it never relates two of them and never derives a
// verdict. The later-stage difference work is out of scope here by contract.

import { OBS_CONTRACT, type ObservationCell, type ObservationRecord } from "./contract.ts";
import type { ProductionRow } from "./read_client.ts";

const EC = OBS_CONTRACT.evidenceClass0A;

function cell(key: string, value: unknown, stage: string): ObservationCell {
  return { key, value, evidence_class: EC, stage };
}

function record(
  row: ProductionRow,
  stage: string,
  source: string,
  cells: ObservationCell[],
  runId: string,
  observedAt: string,
): ObservationRecord {
  return {
    post_draft_id: row.post_draft_id,
    observer_version: OBS_CONTRACT.observerVersion,
    stage,
    evidence_class: EC,
    population: OBS_CONTRACT.population,
    eligibility: OBS_CONTRACT.eligibility,
    value_cells: cells,
    source,
    observed_at: observedAt,
    run_id: runId,
  };
}

export function transformStage0(
  row: ProductionRow,
  runId: string,
  observedAt: string,
): ObservationRecord[] {
  const out: ObservationRecord[] = [];
  const S = OBS_CONTRACT.stages;

  // Stage: slot intent — the intended/default asset preference recorded on the slot.
  if (row.slot_id) {
    out.push(record(row, S.slotIntent, "m.slot", [
      cell("slot_platform", row.slot_platform, S.slotIntent),
      cell("format_preference", row.format_preference, S.slotIntent),
      cell("format_chosen", row.format_chosen, S.slotIntent),
      cell("slot_status", row.slot_status, S.slotIntent),
      cell("slot_skip_reason", row.slot_skip_reason, S.slotIntent),
      cell("source_kind", row.source_kind, S.slotIntent),
      cell("is_evergreen", row.is_evergreen, S.slotIntent),
    ], runId, observedAt));
  }

  // Stage: fill decision — the fill/advisor decision and the format it chose.
  out.push(record(row, S.fillDecision, "m.slot_fill_attempt", [
    cell("decision", row.sfa_decision, S.fillDecision),
    cell("skip_reason", row.sfa_skip_reason, S.fillDecision),
    cell("chosen_format", row.chosen_format, S.fillDecision),
    cell("threshold_relaxed", row.threshold_relaxed, S.fillDecision),
  ], runId, observedAt));

  // Stage: draft asset — the draft's recommended format and the produced asset state.
  out.push(record(row, S.draftAsset, "m.post_draft", [
    cell("platform", row.pd_platform, S.draftAsset),
    cell("recommended_format", row.recommended_format, S.draftAsset),
    cell("recommended_reason", row.recommended_reason, S.draftAsset),
    cell("draft_format", row.draft_format, S.draftAsset),
    cell("image_status", row.image_status, S.draftAsset),
    cell("image_url", row.image_url, S.draftAsset),
    cell("video_status", row.video_status, S.draftAsset),
    cell("video_url", row.video_url, S.draftAsset),
  ], runId, observedAt));

  // Stage: render outcome — the render engine/provider used and the outcome recorded.
  if (row.render_engine || row.ice_format_key || row.render_status) {
    out.push(record(row, S.renderOutcome, "m.post_render_log", [
      cell("ice_format_key", row.ice_format_key, S.renderOutcome),
      cell("render_engine", row.render_engine, S.renderOutcome),
      cell("render_status", row.render_status, S.renderOutcome),
      cell("attempt_number", row.attempt_number, S.renderOutcome),
      cell("credits_used", row.credits_used, S.renderOutcome),
    ], runId, observedAt));
  }

  return out;
}
