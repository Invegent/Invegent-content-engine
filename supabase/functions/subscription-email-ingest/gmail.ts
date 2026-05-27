/**
 * cc-0020 Subscription Email Ingest — Gmail fetch stub (Stage 3).
 *
 * FAIL-CLOSED. Live Gmail access is Stage 5 (OUT OF MVP) and is separately
 * gated behind explicit PK approval + OAuth/token work that this MVP must NOT
 * perform. This module therefore:
 *   • performs NO network calls, NO OAuth, NO token creation/refresh/storage;
 *   • returns a disabled result by default;
 *   • even when the enable flag is set, refuses (the live path is intentionally
 *     not implemented here).
 *
 * The future live implementation would mirror the existing newsletter function
 * supabase/functions/email-ingest/index.ts (refresh-token → messages.list →
 * messages.get), but ONLY once Stage 5 is approved. Until then this stays a
 * stub so nothing can accidentally read PK's mailbox.
 */

import { type RawEmailInput } from "./parser.ts";

export interface GmailFetchResult {
  ok: boolean;
  error?: string;
  messages: RawEmailInput[];
}

/** True only if explicitly enabled by env. Default OFF; fail closed if env is unreadable. */
export function gmailFetchEnabled(): boolean {
  try {
    return Deno.env.get("SUBSCRIPTION_GMAIL_INGEST_ENABLED") === "true";
  } catch {
    // No env access (e.g. sandboxed / no --allow-env) → fail closed.
    return false;
  }
}

/**
 * Fail-closed Gmail fetch. Never touches the network, OAuth, or tokens. Returns
 * ok:false with an explanatory error and an empty message list. Use manual /
 * fixture mode for the MVP.
 */
export function fetchSubscriptionEmails(): GmailFetchResult {
  if (!gmailFetchEnabled()) {
    return {
      ok: false,
      error:
        "gmail_fetch_disabled: live Gmail ingestion is OFF (Stage 5, separately gated). Use manual/fixture mode.",
      messages: [],
    };
  }
  // Enable flag is set, but the live path is intentionally NOT implemented in
  // this MVP. No OAuth/token/network is performed.
  return {
    ok: false,
    error:
      "gmail_fetch_not_implemented: live Gmail fetch is gated to Stage 5 (PK approval + D-01). No OAuth/token/network performed.",
    messages: [],
  };
}
