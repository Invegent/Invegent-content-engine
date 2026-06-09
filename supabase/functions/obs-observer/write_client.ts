// Dedicated OBS WRITE client.
// - Writes ONLY to obs.observation in the isolated OBS project, via the OBS_WRITE_DSN env secret.
// - Append-only: INSERT ... ON CONFLICT (post_draft_id, observer_version, stage) DO NOTHING.
//   There is NO UPDATE / DELETE path here.
// - Standalone: does NOT import any shared publisher/ai-worker DB client.
// - NEVER connects to production. The DSN VALUE never appears in this repo — only the NAME.
//
// NOTE (RECONCILE-BEFORE-SMOKE): the obs.observation column list below mirrors the OBS
// foundation design and is not live-verified by the authoring agent. A wrong column name
// causes the INSERT to error at smoke (fail-safe: no partial/garbage rows). See contract.ts.

import { Client } from "postgres";
import type { ObservationRecord } from "./contract.ts";

function writeDsn(): string {
  const v = Deno.env.get("OBS_WRITE_DSN");
  if (!v) throw new Error("OBS_WRITE_DSN missing");
  return v;
}

const INSERT_SQL = `
INSERT INTO obs.observation
  (post_draft_id, observer_version, stage, evidence_class, population, eligibility,
   value_cells, source, observed_at, run_id)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::timestamptz, $10)
ON CONFLICT (post_draft_id, observer_version, stage) DO NOTHING
`;

export async function writeObservations(
  records: ObservationRecord[],
): Promise<{ inserted: number; skippedExisting: number }> {
  if (records.length === 0) return { inserted: 0, skippedExisting: 0 };
  const client = new Client(writeDsn());
  await client.connect();
  let inserted = 0;
  try {
    for (const r of records) {
      const res = await client.queryArray(INSERT_SQL, [
        r.post_draft_id,
        r.observer_version,
        r.stage,
        r.evidence_class,
        r.population,
        r.eligibility,
        JSON.stringify(r.value_cells),
        r.source,
        r.observed_at,
        r.run_id,
      ]);
      inserted += res.rowCount ?? 0; // 0 when ON CONFLICT skipped (idempotent re-run)
    }
  } finally {
    await client.end();
  }
  return { inserted, skippedExisting: records.length - inserted };
}
