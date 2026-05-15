"use server";

import "server-only";
import { createFrictionClient } from "@/lib/supabase/friction";

// cc-0014 Stage D — Server Action wrapper for friction.fn_emit_manual_event.
//
// Operator gate: requires DASHBOARD_FRICTION_FAB_ENABLED=true at deploy time.
// Without it, the action refuses and the FAB does not render. This is the
// explicit internal gate per PK guardrail; service-role credentials remain
// server-side only and the client never writes friction.event directly.
//
// Validation is defense-in-depth — the SQL function also validates.

export type FrictionSeverity = "info" | "warn" | "critical";

export interface EmitFrictionInput {
  observation_text: string;
  severity: FrictionSeverity;
  category: string;
  current_route?: string | null;
  notes?: string | null;
}

export type EmitFrictionResult =
  | { ok: true; event_id: string }
  | { ok: false; error: string };

const VALID_SEVERITIES: ReadonlyArray<FrictionSeverity> = [
  "info",
  "warn",
  "critical",
];

function isFabEnabled(): boolean {
  return process.env.DASHBOARD_FRICTION_FAB_ENABLED === "true";
}

export async function emitFriction(
  input: EmitFrictionInput,
): Promise<EmitFrictionResult> {
  if (!isFabEnabled()) {
    return {
      ok: false,
      error:
        "Friction capture is not enabled in this deployment. Set DASHBOARD_FRICTION_FAB_ENABLED=true to activate.",
    };
  }

  const text = (input.observation_text ?? "").trim();
  if (text.length < 5) {
    return { ok: false, error: "observation_text must be at least 5 characters" };
  }
  if (!VALID_SEVERITIES.includes(input.severity)) {
    return { ok: false, error: "severity must be info, warn, or critical" };
  }
  if (!input.category || input.category.length === 0) {
    return { ok: false, error: "category is required" };
  }

  const client = createFrictionClient();
  const { data, error } = await client.rpc("fn_emit_manual_event", {
    p_observation_text: input.observation_text,
    p_severity: input.severity,
    p_category: input.category,
    p_current_route: input.current_route ?? null,
    p_related_object: null,
    p_notes: input.notes ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, event_id: String(data) };
}
