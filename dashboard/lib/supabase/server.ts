import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// cc-0013 Stage B — single server-only Supabase access point for the dashboard.
//
// Contract (pinned by cc-0013 Phase 0 brief §7):
//   - The ONLY module in the dashboard that references SUPABASE_SERVICE_ROLE_KEY.
//   - Uses `import 'server-only'` (top of file) so any client-side import raises
//     a Next.js build error.
//   - Scopes the supabase-js client to the `op` schema via `db: { schema: 'op' }`,
//     so `client.from('v_reconciliation_summary')` routes to `op.v_reconciliation_summary`.
//     Direct r.* / m.* / c.* access from this client requires an explicit
//     `.schema('r')` call which is forbidden per cc-0013 Phase 0 §9 + V4.
//   - Disables session persistence + auto-refresh — service-role JWT is read
//     fresh from env on every client construction; no cookie / storage surface.
//
// Strictly server-only:
//   - Reading process.env.SUPABASE_SERVICE_ROLE_KEY from a Client Component would
//     yield `undefined` (Next.js does not expose non-NEXT_PUBLIC_ env vars to the
//     client bundle).
//   - The `server-only` package additionally raises a build error if a Client
//     Component imports this module transitively.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function createOpClient(): SupabaseClient {
  if (SUPABASE_URL.length === 0) {
    throw new Error(
      "cc-0013 dashboard: SUPABASE_URL env var missing (see dashboard/.env.example)",
    );
  }
  if (SUPABASE_SERVICE_ROLE_KEY.length === 0) {
    throw new Error(
      "cc-0013 dashboard: SUPABASE_SERVICE_ROLE_KEY env var missing (see dashboard/.env.example)",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "op" as never },
  });
}
