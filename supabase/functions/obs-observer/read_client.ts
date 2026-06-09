// Dedicated PRODUCTION READ client.
// - Reads ONLY via the OBS_PROD_READONLY_DSN env secret (the least-privilege obs_readonly role).
// - Read-only: opens a READ ONLY transaction; the role itself also has
//   default_transaction_read_only=on + 5s timeouts + column-level SELECT on the 45 approved
//   columns and NO write privileges.
// - Bounded: hard LIMIT supplied by the caller (MAX_ROWS_PER_RUN).
// - Standalone: does NOT import any shared publisher/ai-worker DB client. NO production writes.
// - The DSN VALUE never appears in this repo — only the env var NAME is referenced here.

import { Client } from "postgres";

export interface ProductionRow {
  post_draft_id: string;
  client_id: string | null;
  pd_platform: string | null;
  recommended_format: string | null;
  recommended_reason: string | null;
  draft_format: unknown;
  image_status: string | null;
  image_url: string | null;
  video_status: string | null;
  video_url: string | null;
  pd_created_at: string | null;
  pd_updated_at: string | null;
  slot_id: string | null;
  slot_platform: string | null;
  format_preference: string[] | null;
  format_chosen: string | null;
  slot_status: string | null;
  slot_skip_reason: string | null;
  source_kind: string | null;
  is_evergreen: boolean | null;
  sfa_decision: string | null;
  sfa_skip_reason: string | null;
  chosen_format: string | null;
  threshold_relaxed: boolean | null;
  ice_format_key: string | null;
  render_engine: string | null;
  render_status: string | null;
  attempt_number: number | null;
  credits_used: number | null;
}

function readonlyDsn(): string {
  const v = Deno.env.get("OBS_PROD_READONLY_DSN");
  if (!v) throw new Error("OBS_PROD_READONLY_DSN missing");
  return v;
}

// Column-scoped read over the 4 approved tables (m.post_draft spine + latest slot,
// slot_fill_attempt, post_render_log). Only the 45 approved columns are selected.
const READ_SQL = `
SELECT
  pd.post_draft_id, pd.client_id, pd.platform AS pd_platform,
  pd.recommended_format, pd.recommended_reason, pd.draft_format,
  pd.image_status, pd.image_url, pd.video_status, pd.video_url,
  pd.created_at AS pd_created_at, pd.updated_at AS pd_updated_at, pd.slot_id,
  s.platform AS slot_platform, s.format_preference, s.format_chosen,
  s.status AS slot_status, s.skip_reason AS slot_skip_reason,
  s.source_kind, s.is_evergreen,
  sfa.decision AS sfa_decision, sfa.skip_reason AS sfa_skip_reason,
  sfa.chosen_format, sfa.threshold_relaxed,
  prl.ice_format_key, prl.render_engine, prl.status AS render_status,
  prl.attempt_number, prl.credits_used
FROM m.post_draft pd
LEFT JOIN m.slot s ON s.slot_id = pd.slot_id
LEFT JOIN LATERAL (
  SELECT a.decision, a.skip_reason, a.chosen_format, a.threshold_relaxed
  FROM m.slot_fill_attempt a
  WHERE a.slot_id = pd.slot_id
  ORDER BY a.attempted_at DESC NULLS LAST
  LIMIT 1
) sfa ON true
LEFT JOIN LATERAL (
  SELECT r.ice_format_key, r.render_engine, r.status, r.attempt_number, r.credits_used
  FROM m.post_render_log r
  WHERE r.post_draft_id = pd.post_draft_id
  ORDER BY r.created_at DESC NULLS LAST
  LIMIT 1
) prl ON true
ORDER BY pd.updated_at DESC NULLS LAST
LIMIT $1
`;

export async function readProductionRows(maxRows: number): Promise<ProductionRow[]> {
  const client = new Client(readonlyDsn());
  await client.connect();
  try {
    await client.queryArray("BEGIN TRANSACTION READ ONLY");
    const res = await client.queryObject<ProductionRow>(READ_SQL, [maxRows]);
    await client.queryArray("COMMIT");
    return res.rows;
  } finally {
    await client.end();
  }
}
