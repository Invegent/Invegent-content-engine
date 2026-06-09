// obs-observer — OBS Stage 0A evidence-recording observer.
//
// RUNTIME: the ISOLATED OBS project ONLY (project-ref cvprkjpmlfhlwflokzvv). NEVER production.
// READS production ONLY via the obs_readonly role (column-scoped, read-only, bounded).
// WRITES ONLY to OBS obs.observation (append-only), ONE 0A row per (post_draft_id, observer_version).
// Scheduler DISABLED by default. Manual smoke only (CCD / terminal).
// No 0A->0B difference logic. No external provider calls. No publisher/render side effects.

import { OBS_CONTRACT } from "./contract.ts";
import { readProductionRows } from "./read_client.ts";
import { buildRaw0AObservation } from "./raw_observation_0a.ts";
import { writeObservations } from "./write_client.ts";

function flagOn(v: string | undefined, def = false): boolean {
  if (v === undefined) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function clampInt(v: string | undefined, def: number, lo: number, hi: number): number {
  const n = v ? parseInt(v, 10) : def;
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

function sanitiseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // Strip anything resembling a DSN/credential before it ever leaves the function.
  return msg.replace(/postgres(ql)?:\/\/\S+/gi, "[dsn-redacted]");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // 1. Kill switch — DISABLED BY DEFAULT. No read/write of any kind unless explicitly enabled.
  if (!flagOn(Deno.env.get("OBS_OBSERVER_ENABLED"), false)) {
    return json({ ok: false, reason: "observer_disabled" }, 200);
  }

  // 2. Gated manual invoke — require the worker key. The key is never logged or returned.
  const wantKey = Deno.env.get("OBS_WORKER_KEY") ?? "";
  if (wantKey.length === 0 || req.headers.get("x-worker-key") !== wantKey) {
    return json({ ok: false, reason: "unauthorised" }, 401);
  }

  const runId = crypto.randomUUID(); // response-only trace id; NOT written to OBS
  const maxRows = clampInt(Deno.env.get("MAX_ROWS_PER_RUN"), 200, 1, 1000);

  try {
    // 3. READ production (read-only, column-scoped, bounded) via obs_readonly.
    const rows = await readProductionRows(maxRows);

    // 4. BUILD one raw 0A observation record per draft (no multi-row sub-stages).
    const records = rows.map((r) => buildRaw0AObservation(r));

    // 5. WRITE append-only into OBS obs.observation (ON CONFLICT DO NOTHING => idempotent).
    const { inserted, skippedExisting } = await writeObservations(records);

    return json({
      ok: true,
      run_id: runId,
      observer_version: OBS_CONTRACT.observerVersion,
      read_count: rows.length,
      candidate_records: records.length,
      inserted,
      skipped_existing: skippedExisting,
      max_rows_per_run: maxRows,
    }, 200);
  } catch (err) {
    return json({ ok: false, run_id: runId, error: sanitiseError(err) }, 500);
  }
});
