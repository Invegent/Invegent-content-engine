import "server-only";
import { Pool, type QueryResultRow } from "pg";

// CCD-PRV-002 Path A — server-only DIRECT read-only Postgres transport.
//
// Why this exists (CCD-PRV-001 finding):
//   The cc-0013 dashboard reads the `op.*` reconciliation views via supabase-js
//   REST (`db: { schema: 'op' }`). Schema `op` is NOT in the Supabase PostgREST
//   exposed-schemas allowlist, so REST returns PGRST106 ("schema must be one of
//   …") on every op.* call. This is a transport-only blocker — the views, data,
//   grants, and contracts all exist and are correct. A direct Postgres connection
//   bypasses PostgREST's schema allowlist entirely, so it can read op.* directly.
//
// Hard guarantees (CCD-PRV-002 hard stops):
//   - server-only: `import 'server-only'` raises a build error on any client import.
//   - read-only at the SESSION level: connections start with
//     `default_transaction_read_only=on`, so ANY INSERT/UPDATE/DELETE/DDL fails
//     with "cannot execute … in a read-only transaction" even if attempted.
//   - read-only at the STATEMENT level: queryOp() rejects anything that is not a
//     single SELECT (no stacked statements via embedded ';').
//   - never reads NEXT_PUBLIC_*; the connection string is server-only env.
//   - never logs the connection string / secrets.
//
// Env (server-only; set in dashboard/.env.local — gitignored — never committed):
//   PRV_READONLY_DATABASE_URL
//     A read-only Postgres connection string for project mbkmaxqhsohbtwsqolns.
//     Format (Supabase session pooler, recommended):
//       postgresql://postgres.mbkmaxqhsohbtwsqolns:<DB_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
//     or direct:
//       postgresql://postgres:<DB_PASSWORD>@db.mbkmaxqhsohbtwsqolns.supabase.co:5432/postgres
//     NOTE: `op_reader` (the cc-0012 read role) is NOLOGIN, so it cannot be the
//     connection role as-is. Use a login role that holds SELECT on op.* (e.g.
//     `postgres`). The read-only session option above is the safety belt that
//     keeps even a privileged login role from writing through this transport.

const CONNECTION_STRING = process.env.PRV_READONLY_DATABASE_URL ?? "";

/** True when the read-only DB transport env var is present. */
export function isReconEnvConfigured(): boolean {
  return CONNECTION_STRING.length > 0;
}

/** The env var name the transport requires (for operator-facing messages). */
export const RECON_ENV_VAR = "PRV_READONLY_DATABASE_URL";

// Cache the pool across Next.js dev hot-reloads to avoid exhausting connections.
const globalForPg = globalThis as unknown as { __prvReadonlyPool?: Pool };

function getPool(): Pool {
  if (!isReconEnvConfigured()) {
    throw new Error(
      `${RECON_ENV_VAR} is not set. Add it to dashboard/.env.local (server-only; gitignored). See dashboard/.env.example.`,
    );
  }
  if (!globalForPg.__prvReadonlyPool) {
    globalForPg.__prvReadonlyPool = new Pool({
      connectionString: CONNECTION_STRING,
      // Supabase requires TLS. CA verification disabled for local operator
      // tooling; supply a CA bundle if you need strict verification.
      ssl: { rejectUnauthorized: false },
      max: 3,
      // Session-level read-only belt: every transaction defaults to read-only.
      options: "-c default_transaction_read_only=on",
      // Bound runaway queries (mirrors the authenticator 8s budget).
      statement_timeout: 8000,
      query_timeout: 8000,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
    });
  }
  return globalForPg.__prvReadonlyPool;
}

/**
 * Run a single read-only SELECT against the database and return its rows.
 * Rejects anything that is not a lone SELECT statement.
 */
export async function queryOp<T extends QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const trimmed = sql.trim();
  if (!/^select\b/i.test(trimmed)) {
    throw new Error("queryOp: only SELECT statements are permitted.");
  }
  // Forbid stacked statements; allow a single optional trailing semicolon.
  if (trimmed.replace(/;\s*$/, "").includes(";")) {
    throw new Error("queryOp: multiple statements are not permitted.");
  }
  const pool = getPool();
  const result = await pool.query<T>(sql, params as unknown[]);
  return result.rows;
}
