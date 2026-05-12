// ice-evidence-materialiser — cc-0010B Stage B
//
// Reads r.expected_publication rows in window (today_sydney - backfill_days .. today_sydney + horizon_days
// Sydney-local, status IN ('expected','backfilled')), matches against m.post_publish / m.post_publish_queue /
// m.post_draft (in that priority order), and UPSERTs evidence rows into r.ice_publication_evidence
// with idempotency on expected_publication_id.
//
// Brief: docs/briefs/cc-0010B-ice-evidence-materialiser.md @ v1.3 commit 1b0bbff7a442883dc443debd54b1dd2bf4fe1761
// cc-0010A v1.5 r.* foundation applied 2026-05-12 via cc_0010a_r_evidence_matcher_schema_foundation (V1-V8 PASS)
//
// Auth: x-cron-secret header compared against Deno.env.get('CRON_SECRET').
// JWT verification disabled at gateway (verify_jwt = false in supabase/config.toml).
//
// Pipeline placement: invoked by pg_cron via net.http_post (Stage D, future) and on-demand for first
// invocation (Stage E, future). Not invoked by any other EF.
//
// v1.3 guardrail (slot_id):
//   - r.expected_publication has NO slot_id column (verified 2026-05-12 live schema).
//   - Materialiser MUST NOT SELECT, JOIN, WHERE, or condition on r.expected_publication.slot_id.
//   - slot_id is captured downstream from matched m.post_draft.slot_id via:
//       * direct read when match source is m.post_draft
//       * chain via m.post_publish.post_draft_id -> m.post_draft.slot_id (published)
//       * chain via m.post_publish_queue.post_draft_id -> m.post_draft.slot_id (queue states)
//
// R2 v1.1 (run-id stamping):
//   - INSERT path: created_by_run_id + updated_by_run_id = current Stage E audit run_id.
//   - UPDATE path: updated_by_run_id = current run_id; created_by_run_id PRESERVED via payload omission.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  badRequest,
  buildSupabaseClient,
  closeReconciliationRun,
  ensureCronSecret,
  fetchExistingEvidenceIds,
  fetchExpectedPublications,
  fetchPostDraftInWindow,
  fetchPostDraftsByIds,
  fetchPostPublishInWindow,
  fetchPostPublishQueueInWindow,
  internalError,
  okJson,
  openReconciliationRun,
  upsertEvidence,
} from "./lib/db.ts";
import {
  buildEvidenceFromDraft,
  buildEvidenceFromPublish,
  buildEvidenceFromQueue,
  buildLocalWindow,
  buildUtcFetchBounds,
  indexByClientPlatformSydDate,
  pickLatestByTimestamp,
  type EvidenceRow,
  type PostDraftRow,
  type RunMode,
} from "./lib/materialiser.ts";

interface RequestBody {
  horizon_days?: number;
  backfill_days?: number;
  run_mode?: RunMode;
  triggered_by?: string;
}

interface ResponseSummary {
  reconciliation_run_id: string;
  rows_planned: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  rows_in_window: number;
  horizon: { start: string; end: string; today: string };
  duration_ms: number;
}

serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return badRequest(`Method ${req.method} not allowed; POST required`);
  }

  const authError = ensureCronSecret(req);
  if (authError) return authError;

  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text.length > 0) body = JSON.parse(text) as RequestBody;
  } catch (e) {
    return badRequest(`Invalid JSON body: ${(e as Error).message}`);
  }

  const horizonDays = typeof body.horizon_days === "number" ? body.horizon_days : 7;
  const backfillDays = typeof body.backfill_days === "number" ? body.backfill_days : 0;
  const runMode: RunMode = body.run_mode ?? "manual";
  if (!["manual", "scheduled", "backfill"].includes(runMode)) {
    return badRequest(`Invalid run_mode '${runMode}'; must be one of: manual, scheduled, backfill`);
  }
  if (horizonDays < 0 || horizonDays > 60) {
    return badRequest(`horizon_days out of range [0..60]: ${horizonDays}`);
  }
  if (backfillDays < 0 || backfillDays > 60) {
    return badRequest(`backfill_days out of range [0..60]: ${backfillDays}`);
  }
  const triggeredBy = body.triggered_by ?? `ice-evidence-materialiser-${runMode}`;

  let supabase;
  try {
    supabase = buildSupabaseClient();
  } catch (e) {
    return internalError(`Supabase client construction failed: ${(e as Error).message}`);
  }

  // Brief §2.5: run_type='ice_evidence_materialisation' for all cc-0010B fires.
  const runType = "ice_evidence_materialisation";
  const triggerLabel = runMode === "scheduled"
    ? "scheduled"
    : runMode === "backfill"
    ? "backfill"
    : "manual";

  let runId: string;
  try {
    runId = await openReconciliationRun(supabase, {
      runType,
      trigger: triggerLabel,
      triggeredBy,
    });
  } catch (e) {
    return internalError(`Failed to open r.reconciliation_run: ${(e as Error).message}`);
  }

  let rowsInWindow = 0;
  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let windowStartLocalDate = "";
  let windowEndLocalDate = "";
  let todayLocalDate = "";

  try {
    const localWindow = buildLocalWindow(horizonDays, backfillDays);
    windowStartLocalDate = localWindow.windowStartLocalDate;
    windowEndLocalDate = localWindow.windowEndLocalDate;
    todayLocalDate = localWindow.todayLocalDate;
    const utcBounds = buildUtcFetchBounds(windowStartLocalDate, windowEndLocalDate);

    const expectedRows = await fetchExpectedPublications(
      supabase,
      windowStartLocalDate,
      windowEndLocalDate,
    );
    rowsInWindow = expectedRows.length;

    // Empty-pipeline envelope — PASS per L43.
    if (expectedRows.length === 0) {
      await closeReconciliationRun(supabase, runId, {
        status: "succeeded",
        rowsProcessed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        summaryJson: {
          run_mode: runMode,
          horizon_start: windowStartLocalDate,
          horizon_end: windowEndLocalDate,
          today_local: todayLocalDate,
          horizon_days: horizonDays,
          backfill_days: backfillDays,
          rows_in_window: 0,
          note: "no_expected_publication_rows_in_window",
        },
      });
      return okJson({
        reconciliation_run_id: runId,
        rows_planned: 0,
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: 0,
        rows_in_window: 0,
        horizon: { start: windowStartLocalDate, end: windowEndLocalDate, today: todayLocalDate },
        duration_ms: Date.now() - startedAt,
      } satisfies ResponseSummary);
    }

    const [publishRows, queueRows, draftRows] = await Promise.all([
      fetchPostPublishInWindow(supabase, utcBounds.windowStartUtc, utcBounds.windowEndUtc),
      fetchPostPublishQueueInWindow(supabase, utcBounds.windowStartUtc, utcBounds.windowEndUtc),
      fetchPostDraftInWindow(supabase, utcBounds.windowStartUtc, utcBounds.windowEndUtc),
    ]);

    const publishIdx = indexByClientPlatformSydDate(publishRows, (r) => r.published_at);
    const queueIdx = indexByClientPlatformSydDate(queueRows, (r) => r.scheduled_for);
    const draftIdx = indexByClientPlatformSydDate(draftRows, (r) => r.created_at);

    const draftByIdInWindow = new Map<string, PostDraftRow>();
    for (const d of draftRows) draftByIdInWindow.set(d.post_draft_id, d);

    type Planned = {
      ep: typeof expectedRows[number];
      match:
        | { kind: "publish"; row: typeof publishRows[number] }
        | { kind: "queue"; row: typeof queueRows[number] }
        | { kind: "draft"; row: typeof draftRows[number] }
        | null;
    };

    const referencedDraftIds = new Set<string>();
    const planned: Planned[] = [];

    for (const ep of expectedRows) {
      const key = `${ep.client_id}|${ep.platform}|${ep.expected_local_date}`;

      const publishMatches = publishIdx.get(key);
      if (publishMatches && publishMatches.length > 0) {
        const pick = pickLatestByTimestamp(publishMatches, (r) => r.published_at);
        if (!draftByIdInWindow.has(pick.post_draft_id)) referencedDraftIds.add(pick.post_draft_id);
        planned.push({ ep, match: { kind: "publish", row: pick } });
        continue;
      }

      const queueMatches = queueIdx.get(key);
      if (queueMatches && queueMatches.length > 0) {
        const pick = pickLatestByTimestamp(queueMatches, (r) => r.scheduled_for);
        if (pick.post_draft_id && !draftByIdInWindow.has(pick.post_draft_id)) {
          referencedDraftIds.add(pick.post_draft_id);
        }
        planned.push({ ep, match: { kind: "queue", row: pick } });
        continue;
      }

      const draftMatches = draftIdx.get(key);
      if (draftMatches && draftMatches.length > 0) {
        const pick = pickLatestByTimestamp(draftMatches, (r) => r.created_at);
        planned.push({ ep, match: { kind: "draft", row: pick } });
        continue;
      }

      planned.push({ ep, match: null });
      rowsSkipped += 1;
    }

    if (referencedDraftIds.size > 0) {
      const extraDrafts = await fetchPostDraftsByIds(supabase, Array.from(referencedDraftIds));
      for (const d of extraDrafts) draftByIdInWindow.set(d.post_draft_id, d);
    }

    const matchedEpIds = planned
      .filter((p) => p.match !== null)
      .map((p) => p.ep.expected_publication_id);
    const existingSet = await fetchExistingEvidenceIds(supabase, matchedEpIds);

    const insertPayload: EvidenceRow[] = [];
    const updatePayload: EvidenceRow[] = [];

    for (const p of planned) {
      if (!p.match) continue;
      const isNewRow = !existingSet.has(p.ep.expected_publication_id);
      let evidence: EvidenceRow;

      switch (p.match.kind) {
        case "publish": {
          const pp = p.match.row;
          const capturedSlotId = draftByIdInWindow.get(pp.post_draft_id)?.slot_id ?? null;
          evidence = buildEvidenceFromPublish(p.ep, pp, capturedSlotId, runId, isNewRow);
          break;
        }
        case "queue": {
          const q = p.match.row;
          const capturedSlotId = q.post_draft_id
            ? (draftByIdInWindow.get(q.post_draft_id)?.slot_id ?? null)
            : null;
          evidence = buildEvidenceFromQueue(p.ep, q, capturedSlotId, runId, isNewRow);
          break;
        }
        case "draft": {
          const d = p.match.row;
          evidence = buildEvidenceFromDraft(p.ep, d, runId, isNewRow);
          break;
        }
      }

      if (isNewRow) insertPayload.push(evidence);
      else updatePayload.push(evidence);
    }

    // R2 v1.1: two homogeneous-shape UPSERT calls so PostgREST does not blanket-include
    // created_by_run_id in the UPDATE side of `ON CONFLICT DO UPDATE`.
    const insertedResult = await upsertEvidence(supabase, insertPayload);
    const updatedResult = await upsertEvidence(supabase, updatePayload);
    rowsInserted = insertedResult.count;
    rowsUpdated = updatedResult.count;

    await closeReconciliationRun(supabase, runId, {
      status: "succeeded",
      rowsProcessed: rowsInWindow,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      summaryJson: {
        run_mode: runMode,
        horizon_start: windowStartLocalDate,
        horizon_end: windowEndLocalDate,
        today_local: todayLocalDate,
        horizon_days: horizonDays,
        backfill_days: backfillDays,
        rows_in_window: rowsInWindow,
        publish_rows_fetched: publishRows.length,
        queue_rows_fetched: queueRows.length,
        draft_rows_fetched: draftRows.length,
        referenced_drafts_fetched: referencedDraftIds.size,
      },
    });
  } catch (e) {
    const errMsg = (e as Error).message ?? String(e);
    try {
      await closeReconciliationRun(supabase, runId, {
        status: "failed",
        rowsProcessed: rowsInWindow,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
        errorSummary: errMsg,
        summaryJson: {
          run_mode: runMode,
          horizon_start: windowStartLocalDate,
          horizon_end: windowEndLocalDate,
          today_local: todayLocalDate,
          horizon_days: horizonDays,
          backfill_days: backfillDays,
          error: errMsg,
        },
      });
    } catch (closeErr) {
      console.error("Failed to close reconciliation_run after materialiser error:", closeErr);
    }
    return internalError(`Materialiser failed: ${errMsg}`);
  }

  return okJson({
    reconciliation_run_id: runId,
    rows_planned: rowsInWindow,
    rows_inserted: rowsInserted,
    rows_updated: rowsUpdated,
    rows_skipped: rowsSkipped,
    rows_in_window: rowsInWindow,
    horizon: { start: windowStartLocalDate, end: windowEndLocalDate, today: todayLocalDate },
    duration_ms: Date.now() - startedAt,
  } satisfies ResponseSummary);
});
