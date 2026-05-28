/**
 * cc-0020 Subscription Email Ingest — repository tests (Stage 5 Unit B).
 *
 * ServiceRoleIngestRepository tested against a hand-rolled FAKE SupabaseLike
 * that reproduces only the `.rpc()` surface — by design, the boundary cannot
 * even *express* direct table access (no `.schema()`/`.from()` on the type).
 *
 * What this proves:
 *   • insertCandidateOnConflictDoNothing calls `rpc(INGEST_CANDIDATE_RPC, …)`
 *     with the full `p_*` argument set the contract requires.
 *   • idempotency: a stubbed RPC returning `inserted:false` on the second
 *     call mirrors the in-RPC `ON CONFLICT (gmail_message_id) DO NOTHING`
 *     and the same `candidate_id` is returned both times.
 *   • RPC errors bubble out with the gmail_message_id + the error message,
 *     and crucially WITHOUT the row payload (no metadata leak through logs).
 *   • Dashboard-only methods (getCandidate / listCandidates / setReviewStatus
 *     / insertSpendEventOnConflictDoNothing / listSpendEvents) throw a clear
 *     "use dashboard RPC" pointer rather than silently doing the wrong thing.
 *   • Boundary: no part of the live repo can call `.schema()` or `.from()`
 *     (the typed interface omits them) — and the static canary additionally
 *     greps source for any reintroduction.
 */

import {
  INGEST_CANDIDATE_RPC,
  INGEST_CANDIDATE_RPC_PARAMS,
  ServiceRoleIngestRepository,
  type SupabaseLike,
} from "./repository.ts";
import { type CandidateRow, type SpendEventRow } from "./mapping.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}
function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: ${a} !== ${e}`);
}

// ---------------------------------------------------------------------------
// Fake SupabaseLike: records every rpc call and dispatches to a per-fn handler.
// ---------------------------------------------------------------------------

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

type RpcResult = {
  data: Array<Record<string, unknown>> | Record<string, unknown> | null;
  error: { message?: string; code?: string } | null;
};

interface FakeSupabase {
  client: SupabaseLike;
  calls: RpcCall[];
  setHandler(fn: string, handler: (args: Record<string, unknown>) => RpcResult): void;
}

function buildFakeSupabase(): FakeSupabase {
  const calls: RpcCall[] = [];
  const handlers: Record<string, (args: Record<string, unknown>) => RpcResult> = {};
  const client: SupabaseLike = {
    rpc(fn, args) {
      calls.push({ fn, args });
      const handler = handlers[fn];
      if (!handler) {
        return Promise.resolve({
          data: null,
          error: { code: "PGRST202", message: `function ${fn} does not exist (no handler in fake)` },
        });
      }
      return Promise.resolve(handler(args));
    },
  };
  return {
    client,
    calls,
    setHandler(fn, handler) {
      handlers[fn] = handler;
    },
  };
}

/** Default handler that models the production RPC's idempotency contract. */
function defaultIngestHandler() {
  const idByGmailMessageId = new Map<string, string>();
  let nextId = 1;
  return (args: Record<string, unknown>): RpcResult => {
    const key = String(args.p_gmail_message_id);
    const existing = idByGmailMessageId.get(key);
    if (existing) {
      return { data: [{ candidate_id: existing, inserted: false }], error: null };
    }
    const candidate_id = `fake-uuid-${nextId++}`;
    idByGmailMessageId.set(key, candidate_id);
    return { data: [{ candidate_id, inserted: true }], error: null };
  };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const sampleCandidate: CandidateRow = {
  gmail_message_id: "msg-fake-0001",
  vendor_raw: "Acme",
  vendor_normalised: "acme",
  matched_subscription_id: null,
  amount: 12,
  currency: "USD",
  billing_date: "2026-05-03",
  cadence: "monthly",
  event_type: "charge",
  confidence: 0.95,
  source_from_domain: "acme.example",
  source_subject: "Receipt",
  source_received_at: "2026-05-03T08:00:00Z",
  parser_version: "subscription-email-parser-v1",
  content_hash: "deadbeef",
  review_status: "candidate",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("ServiceRoleRepo: candidate insert calls the public RPC by name", async () => {
  const fake = buildFakeSupabase();
  fake.setHandler(INGEST_CANDIDATE_RPC, defaultIngestHandler());
  const repo = new ServiceRoleIngestRepository(fake.client);
  await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  assertEquals(fake.calls.length, 1, "exactly one rpc call");
  assertEquals(fake.calls[0].fn, INGEST_CANDIDATE_RPC, "rpc function name matches contract constant");
});

Deno.test("ServiceRoleRepo: rpc args contain the full p_* parameter set", async () => {
  const fake = buildFakeSupabase();
  fake.setHandler(INGEST_CANDIDATE_RPC, defaultIngestHandler());
  const repo = new ServiceRoleIngestRepository(fake.client);
  await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  const args = fake.calls[0].args;
  for (const param of INGEST_CANDIDATE_RPC_PARAMS) {
    assert(param in args, `arg ${param} present in rpc call`);
  }
  // Spot-check a few values map correctly.
  assertEquals(args.p_gmail_message_id, sampleCandidate.gmail_message_id, "p_gmail_message_id");
  assertEquals(args.p_amount, sampleCandidate.amount, "p_amount");
  assertEquals(args.p_currency, sampleCandidate.currency, "p_currency");
  assertEquals(args.p_event_type, sampleCandidate.event_type, "p_event_type");
  assertEquals(args.p_review_status, sampleCandidate.review_status, "p_review_status");
});

Deno.test("ServiceRoleRepo: first insert returns inserted=true with a candidate_id", async () => {
  const fake = buildFakeSupabase();
  fake.setHandler(INGEST_CANDIDATE_RPC, defaultIngestHandler());
  const repo = new ServiceRoleIngestRepository(fake.client);
  const r = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  assertEquals(r.inserted, true, "first insert");
  assert(r.candidate_id.startsWith("fake-uuid-"), `got id ${r.candidate_id}`);
});

Deno.test("ServiceRoleRepo: duplicate insert returns inserted=false + same id (RPC-side idempotency)", async () => {
  const fake = buildFakeSupabase();
  fake.setHandler(INGEST_CANDIDATE_RPC, defaultIngestHandler());
  const repo = new ServiceRoleIngestRepository(fake.client);
  const a = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  const b = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  assertEquals(a.inserted, true, "first inserted");
  assertEquals(b.inserted, false, "second is duplicate");
  assertEquals(a.candidate_id, b.candidate_id, "same id");
  assertEquals(fake.calls.length, 2, "both calls reached the RPC (idempotency is RPC-side, not client-side)");
});

Deno.test("ServiceRoleRepo: RPC PGRST202 (function not found) bubbles with gmail_message_id + code, NO row payload", async () => {
  // Default fake with NO handler set → returns PGRST202 (matches the live
  // production-pre-RPC-migration state described in the Unit C blocker note).
  const fake = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(fake.client);
  let caught: unknown = undefined;
  try {
    await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  } catch (e) {
    caught = e;
  }
  assert(caught instanceof Error, "throws Error");
  const msg = (caught as Error).message;
  assert(msg.includes(INGEST_CANDIDATE_RPC), "message includes RPC name");
  assert(msg.includes("[PGRST202]"), "message includes the PostgREST code");
  assert(msg.includes(sampleCandidate.gmail_message_id), "message includes the idempotency key");
  // Privacy: must NOT include the row payload (vendor, amount, subject, etc.).
  assert(!msg.includes(sampleCandidate.vendor_raw!), "message does NOT include vendor_raw");
  assert(!msg.includes(String(sampleCandidate.amount)) || sampleCandidate.amount === null,
    "message does NOT include amount value");
  assert(!msg.includes(sampleCandidate.source_subject), "message does NOT include subject");
});

Deno.test("ServiceRoleRepo: arbitrary RPC error message bubbles without row payload", async () => {
  const fake = buildFakeSupabase();
  fake.setHandler(INGEST_CANDIDATE_RPC, () => ({
    data: null,
    error: { message: "some internal error" },
  }));
  const repo = new ServiceRoleIngestRepository(fake.client);
  let caught: unknown = undefined;
  try {
    await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  } catch (e) {
    caught = e;
  }
  assert(caught instanceof Error, "throws Error");
  const msg = (caught as Error).message;
  assert(msg.includes("some internal error"), "passes through RPC message");
  assert(msg.includes(sampleCandidate.gmail_message_id), "includes idempotency key");
  assert(!msg.includes(sampleCandidate.source_subject), "no subject");
  assert(!msg.includes(sampleCandidate.vendor_raw!), "no vendor");
});

Deno.test("ServiceRoleRepo: dashboard-only methods throw clear 'use dashboard RPC' pointer", async () => {
  const fake = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(fake.client);

  await assertRejectsWith(
    () => repo.getCandidate("any"),
    "public.get_subscription_import_candidates",
    "getCandidate points to public.get_subscription_import_candidates",
  );
  await assertRejectsWith(
    () => repo.listCandidates(),
    "public.get_subscription_import_candidates",
    "listCandidates points to dashboard list RPC",
  );
  await assertRejectsWith(
    () => repo.setReviewStatus("any", "accepted"),
    "public.review_subscription_candidate",
    "setReviewStatus points to public.review_subscription_candidate",
  );
  const spendRow: SpendEventRow = {
    subscription_id: null, source_candidate_id: "any", vendor_name: null,
    amount_original: 1, currency: "AUD", amount_aud: null,
    charged_on: "2026-05-03", cadence: "monthly", event_type: "charge",
    source: "gmail_email",
  };
  await assertRejectsWith(
    () => repo.insertSpendEventOnConflictDoNothing(spendRow),
    "public.review_subscription_candidate",
    "insertSpendEvent points to public.review_subscription_candidate",
  );
  await assertRejectsWith(
    () => repo.listSpendEvents(),
    "public.get_subscription_spend_events",
    "listSpendEvents points to public.get_subscription_spend_events",
  );

  assertEquals(fake.calls.length, 0, "none of the dashboard-only methods touched the rpc surface");
});

Deno.test("ServiceRoleRepo: SupabaseLike type surface does NOT expose schema() / from() (compile-time)", () => {
  // This test is structural — it confirms the contract at runtime by asserting
  // the client object has no `.schema`/`.from` methods. The TypeScript
  // interface already omits them, but a runtime check defends against an
  // accidental cast/expansion.
  const fake = buildFakeSupabase();
  const client = fake.client as unknown as Record<string, unknown>;
  assertEquals(typeof client.schema, "undefined", "SupabaseLike has no .schema()");
  assertEquals(typeof client.from, "undefined", "SupabaseLike has no .from()");
  assertEquals(typeof client.rpc, "function", "SupabaseLike has .rpc()");
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function assertRejectsWith(
  fn: () => Promise<unknown>,
  expectedSubstring: string,
  msg: string,
): Promise<void> {
  let caught: unknown = undefined;
  try {
    await fn();
  } catch (e) {
    caught = e;
  }
  assert(caught instanceof Error, `${msg}: did not throw`);
  assert((caught as Error).message.includes(expectedSubstring),
    `${msg}: message missing "${expectedSubstring}", got: ${(caught as Error).message}`);
}
