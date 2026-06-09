// raw_observation_0a — builds ONE raw 0A observation record per production draft row.
//
// NAMING: this module is deliberately NOT called "stage0_transform". That name is reserved
// (F-precondition 3) for the later 0A->0B transform. This module is unambiguously 0A-only:
// it records raw observed facts + a derived lifecycle eligibility. It performs NO 0A->0B
// work — no relating of two values, no expected/actual verdict, no provider attribution.
//
// Output shape matches the live OBS schema (see contract.ts):
//   one ObservationRecord per (post_draft_id, observer_version); stage '0A';
//   population 'slot_origin'; derived eligibility; policy_input_snapshot object;
//   raw facts as value_cells {name, value, evidence_class, stage:'0A'}.

import { OBS_CONTRACT, type ObservationCell, type ObservationRecord } from "./contract.ts";
import type { ProductionRow } from "./read_client.ts";

const C = OBS_CONTRACT;

function evidenceClassFor(value: unknown): string {
  return value === null || value === undefined
    ? C.evidenceClass.unknown
    : C.evidenceClass.observed;
}

function cell(name: string, value: unknown): ObservationCell {
  return {
    name,
    value: value === undefined ? null : value,
    evidence_class: evidenceClassFor(value),
    stage: C.stage,
  };
}

function normStatus(s: unknown): string | null {
  return s === null || s === undefined ? null : String(s).trim().toLowerCase();
}

// Derives the lifecycle eligibility from observed statuses ONLY (single-row classification,
// not a comparison). in_flight dominates: if anything is still processing the outcome is not
// settled. Unknown/empty statuses fall through to indeterminate (safe default).
export function deriveEligibility(row: ProductionRow): string {
  const E = C.eligibility;
  const terminal = new Set<string>(C.terminalStatuses as readonly string[]);
  const inFlight = new Set<string>(C.inFlightStatuses as readonly string[]);

  const statuses = [
    normStatus(row.render_status),
    normStatus(row.slot_status),
    normStatus(row.video_status),
    normStatus(row.image_status),
  ].filter((s): s is string => s !== null);

  if (statuses.length === 0) return E.indeterminate;
  if (statuses.some((s) => inFlight.has(s))) return E.inFlight;
  if (statuses.some((s) => terminal.has(s))) return E.terminal;
  return E.indeterminate;
}

// The policy inputs that drive which asset format is produced for the slot, captured as a
// raw snapshot object (verbatim observed values; nulls preserved).
function policyInputSnapshot(row: ProductionRow): Record<string, unknown> {
  return {
    platform: row.pd_platform ?? null,
    recommended_format: row.recommended_format ?? null,
    recommended_reason: row.recommended_reason ?? null,
    draft_format: row.draft_format ?? null,
    slot_format_preference: row.format_preference ?? null,
    slot_format_chosen: row.format_chosen ?? null,
    slot_status: row.slot_status ?? null,
    slot_source_kind: row.source_kind ?? null,
    is_evergreen: row.is_evergreen ?? null,
    attempt_decision: row.sfa_decision ?? null,
    attempt_chosen_format: row.chosen_format ?? null,
    attempt_threshold_relaxed: row.threshold_relaxed ?? null,
    render_engine: row.render_engine ?? null,
    render_status: row.render_status ?? null,
    ice_format_key: row.ice_format_key ?? null,
  };
}

export function buildRaw0AObservation(row: ProductionRow): ObservationRecord {
  const value_cells: ObservationCell[] = [
    cell("draft.platform", row.pd_platform),
    cell("draft.recommended_format", row.recommended_format),
    cell("draft.recommended_reason", row.recommended_reason),
    cell("draft.draft_format", row.draft_format),
    cell("draft.image_status", row.image_status),
    cell("draft.image_url", row.image_url),
    cell("draft.video_status", row.video_status),
    cell("draft.video_url", row.video_url),
    cell("slot.platform", row.slot_platform),
    cell("slot.format_preference", row.format_preference),
    cell("slot.format_chosen", row.format_chosen),
    cell("slot.status", row.slot_status),
    cell("slot.skip_reason", row.slot_skip_reason),
    cell("slot.source_kind", row.source_kind),
    cell("slot.is_evergreen", row.is_evergreen),
    cell("attempt.decision", row.sfa_decision),
    cell("attempt.skip_reason", row.sfa_skip_reason),
    cell("attempt.chosen_format", row.chosen_format),
    cell("attempt.threshold_relaxed", row.threshold_relaxed),
    cell("render.ice_format_key", row.ice_format_key),
    cell("render.render_engine", row.render_engine),
    cell("render.status", row.render_status),
    cell("render.attempt_number", row.attempt_number),
    cell("render.credits_used", row.credits_used),
  ];

  return {
    post_draft_id: row.post_draft_id,
    observer_version: C.observerVersion,
    stage: C.stage,
    population: C.population,
    eligibility: deriveEligibility(row),
    policy_input_snapshot: policyInputSnapshot(row),
    value_cells,
  };
}
