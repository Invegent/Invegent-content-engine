import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// cc-0014 Stage D — server-only Supabase client scoped to the `friction` schema.
// Mirrors lib/supabase/server.ts (op-scoped client) but routes RPC calls to
// friction.fn_emit_manual_event without overriding schema per-call.
//
// Strictly server-only: imports `server-only` so any client-side import raises
// a Next.js build error. Service-role JWT read fresh from env on every
// construction; no cookie / storage surface.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function createFrictionClient(): SupabaseClient {
  if (SUPABASE_URL.length === 0) {
    throw new Error(
      "cc-0014 friction: SUPABASE_URL env var missing (see dashboard/.env.example)",
    );
  }
  if (SUPABASE_SERVICE_ROLE_KEY.length === 0) {
    throw new Error(
      "cc-0014 friction: SUPABASE_SERVICE_ROLE_KEY env var missing (see dashboard/.env.example)",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "friction" as never },
  });
}
