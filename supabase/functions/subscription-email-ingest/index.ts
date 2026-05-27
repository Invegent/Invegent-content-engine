/**
 * cc-0020 Subscription Email Ingest — Edge Function entrypoint (Stage 3 scaffold).
 *
 * MVP is FIXTURE/MANUAL-ONLY and DEV-ONLY:
 *   • mode "manual" (default): accepts sanitized email payloads in the request
 *     body, runs the parser/ingest using an in-memory repository, and returns
 *     counts. It constructs NO Supabase client and writes to NO database.
 *   • mode "gmail": returns the fail-closed Gmail stub result (live Gmail is
 *     Stage 5, separately gated).
 *
 * The production service-role write path (INSERT into k.subscription_import_*
 * via a real repository) is intentionally NOT wired here — wiring it, deploying
 * this function, and applying the migration are later, separately gated steps.
 * Because no Supabase client is created, this scaffold cannot connect to any DB.
 */

import { ingestEmails } from "./ingest.ts";
import { InMemoryIngestRepository } from "./repository.ts";
import { fetchSubscriptionEmails } from "./gmail.ts";
import { type RawEmailInput } from "./parser.ts";

const VERSION = "subscription-email-ingest-v0-scaffold";

Deno.serve(async (req: Request): Promise<Response> => {
  let body: { mode?: string; emails?: RawEmailInput[] } = {};
  try {
    body = await req.json();
  } catch {
    // empty/invalid body → treat as manual with no emails
  }

  const mode = body.mode ?? "manual";

  if (mode === "gmail") {
    // Fail-closed: never reads a real mailbox in the MVP.
    const result = fetchSubscriptionEmails(); // result.ok is already false (fail-closed)
    return Response.json({ version: VERSION, mode, ...result });
  }

  // manual / fixture mode — dev-only, in-memory, no database connection.
  const emails = Array.isArray(body.emails) ? body.emails : [];
  const repo = new InMemoryIngestRepository();
  const counts = ingestEmails(emails, repo);
  return Response.json({ ok: true, version: VERSION, mode: "manual", ...counts });
});
