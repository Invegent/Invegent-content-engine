/**
 * cc-0020 Subscription Email Ingest — Edge Function entrypoint
 * (Stage 3 fixture path + Stage 5 Unit B live path; deploy-DISABLED by default).
 *
 *   • mode "manual" (default): accepts sanitized email payloads in the request
 *     body, runs the parser/ingest using an in-memory repository, and returns
 *     counts. Constructs NO Supabase client and writes to NO database.
 *   • mode "gmail": guarded by `SUBSCRIPTION_GMAIL_INGEST_ENABLED=true`. When
 *     OFF (default), returns the fail-closed Gmail result and the function
 *     constructs no Supabase client. When ON, fetches metadata-only emails
 *     from Gmail (sender allowlist + bounded window + capped maxResults; see
 *     `gmail.ts`), constructs a service-role Supabase client lazily, and
 *     upserts via the `ServiceRoleIngestRepository` with `ON CONFLICT
 *     (gmail_message_id) DO NOTHING` semantics.
 *
 * The global kill switch is `SUBSCRIPTION_GMAIL_INGEST_ENABLED`. Flipping it
 * to `false` (or removing it) short-circuits at `gmail.ts:gmailFetchEnabled()`
 * before any OAuth/network operation runs — no code change, no migration, no
 * deploy needed to disable.
 *
 * Privacy: this entrypoint never logs the request body verbatim, never logs
 * tokens, and never includes raw row payloads in the response (counts only,
 * plus per-message error pairs that carry the gmail_message_id and the error
 * message — never the body).
 */

import { ingestEmails } from "./ingest.ts";
import {
  InMemoryIngestRepository,
  ServiceRoleIngestRepository,
  type IngestRepository,
  type SupabaseLike,
} from "./repository.ts";
import { fetchSubscriptionEmails, gmailFetchEnabled } from "./gmail.ts";
import { type RawEmailInput } from "./parser.ts";

const VERSION = "subscription-email-ingest-v1.0.0-disabled";

interface RequestBody {
  mode?: "manual" | "gmail";
  emails?: RawEmailInput[];
  /** Optional override for max messages (capped server-side inside gmail.ts). */
  maxResults?: number;
  /** Optional override for the time window in days (capped server-side). */
  windowDays?: number;
}

/**
 * Lazy service-role Supabase client. Imported via dynamic JSR specifier so
 * `deno test` does not need network access to load the Supabase JS module
 * (the dynamic import only runs when mode='gmail' AND the flag is ON AND
 * service-role credentials are present).
 */
async function buildServiceRoleRepo(): Promise<ServiceRoleIngestRepository | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const mod = await import("jsr:@supabase/supabase-js@2");
    const client = mod.createClient(url, key, { auth: { persistSession: false } });
    return new ServiceRoleIngestRepository(client as unknown as SupabaseLike);
  } catch {
    // Lazy-import failure must NOT crash the function — return null and let
    // the caller handle as "no live repo available" (which we treat as fail-closed).
    return null;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  let body: RequestBody = {};
  try {
    body = await req.json() as RequestBody;
  } catch {
    // empty/invalid body → treat as manual with no emails
  }

  const mode = body.mode ?? "manual";

  if (mode === "gmail") {
    // The flag check is also done inside `fetchSubscriptionEmails`. Doing it
    // here as well means we never even construct a Supabase client while
    // disabled — additional defence-in-depth.
    if (!gmailFetchEnabled()) {
      return Response.json({
        ok: false,
        version: VERSION,
        mode: "gmail",
        error:
          "gmail_fetch_disabled: live Gmail ingestion is OFF (Stage 5 kill switch). Set SUBSCRIPTION_GMAIL_INGEST_ENABLED=true to enable.",
        messages_seen: 0,
        candidates_created: 0,
        duplicates_skipped: 0,
        low_confidence_skipped: 0,
        errors: 0,
        error_details: [],
      });
    }

    const fetchResult = await fetchSubscriptionEmails({
      maxResults: body.maxResults,
      windowDays: body.windowDays,
    });
    if (!fetchResult.ok) {
      return Response.json({
        ok: false,
        version: VERSION,
        mode: "gmail",
        error: fetchResult.error ?? "gmail_fetch_unknown_error",
        messages_seen: 0,
        candidates_created: 0,
        duplicates_skipped: 0,
        low_confidence_skipped: 0,
        errors: 0,
        error_details: [],
      });
    }

    const repo = await buildServiceRoleRepo();
    if (!repo) {
      return Response.json({
        ok: false,
        version: VERSION,
        mode: "gmail",
        error:
          "service_role_repo_unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
        messages_seen: fetchResult.messages.length,
        candidates_created: 0,
        duplicates_skipped: 0,
        low_confidence_skipped: 0,
        errors: 0,
        error_details: [],
      });
    }

    const counts = await ingestEmails(fetchResult.messages, repo as IngestRepository);
    return Response.json({
      ok: true,
      version: VERSION,
      mode: "gmail",
      gmail_meta: fetchResult.meta ?? null,
      ...counts,
    });
  }

  // manual / fixture mode — dev-only, in-memory, no database connection.
  const emails = Array.isArray(body.emails) ? body.emails : [];
  const repo = new InMemoryIngestRepository();
  const counts = await ingestEmails(emails, repo);
  return Response.json({ ok: true, version: VERSION, mode: "manual", ...counts });
});
