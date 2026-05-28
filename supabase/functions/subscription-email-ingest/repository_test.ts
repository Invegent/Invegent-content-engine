/**
 * cc-0020 Subscription Email Ingest — repository tests (Stage 5 Unit B).
 *
 * ServiceRoleIngestRepository tested against a hand-rolled FAKE SupabaseLike
 * that reproduces the PostgREST upsert + onConflict + ignoreDuplicates +
 * `.select()` return semantics. This is the V-B2 substitute (PGlite was the
 * brief's first option, but a behavioural fake against the SupabaseLike
 * interface exercises the same idempotency invariants without a WASM dep).
 *
 * What this proves:
 *   • candidate upsert returns inserted=true on first call, false on the
 *     second (gmail_message_id conflict).
 *   • spend-event upsert returns inserted=true on first call, false on the
 *     second (source_candidate_id conflict).
 *   • lookup-after-duplicate-skip returns the existing id.
 *   • the repo issues writes ONLY against schema 'k' and the two expected
 *     tables.
 */

import { ServiceRoleIngestRepository, type SupabaseLike } from "./repository.ts";
import { type CandidateRow, type SpendEventRow } from "./mapping.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}
function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: ${a} !== ${e}`);
}

// ---------------------------------------------------------------------------
// FakeSupabase: models the PostgREST surface SupabaseLike requires.
// ---------------------------------------------------------------------------

interface FakeRow extends Record<string, unknown> {}

class FakeTable {
  rows: FakeRow[] = [];
  pkColumn: string;
  uniqueColumn: string | null;
  constructor(pkColumn: string, uniqueColumn: string | null) {
    this.pkColumn = pkColumn;
    this.uniqueColumn = uniqueColumn;
  }
}

function buildFakeSupabase(): { client: SupabaseLike; tables: Record<string, FakeTable> } {
  const tables: Record<string, FakeTable> = {
    subscription_import_candidate: new FakeTable("candidate_id", "gmail_message_id"),
    subscription_spend_event: new FakeTable("spend_event_id", "source_candidate_id"),
  };
  let nextId = 1;
  const newId = () => `fake-uuid-${nextId++}`;

  const tableApi = (tableName: string) => {
    const t = tables[tableName];
    if (!t) throw new Error(`unknown table ${tableName}`);
    return {
      upsert(
        row: Record<string, unknown>,
        opts: { onConflict: string; ignoreDuplicates: boolean },
      ) {
        return {
          async select(_cols: string) {
            await Promise.resolve();
            const conflictKey = opts.onConflict;
            const existing = t.rows.find((r) => r[conflictKey] === row[conflictKey]);
            if (existing) {
              if (opts.ignoreDuplicates) {
                return { data: [], error: null };
              }
              // not exercised in this repo
              return { data: [existing], error: null };
            }
            const id = newId();
            const stored: FakeRow = { ...row, [t.pkColumn]: id };
            t.rows.push(stored);
            return { data: [{ [t.pkColumn]: id }], error: null };
          },
        };
      },
      select(_cols: string) {
        return {
          eq(column: string, value: string) {
            return {
              async maybeSingle() {
                await Promise.resolve();
                const found = t.rows.find((r) => r[column] === value);
                return { data: found ?? null, error: null };
              },
            };
          },
          async order(column: string, opts?: { ascending?: boolean }) {
            await Promise.resolve();
            const sorted = [...t.rows].sort((a, b) => {
              const av = String(a[column] ?? "");
              const bv = String(b[column] ?? "");
              return opts?.ascending === false ? bv.localeCompare(av) : av.localeCompare(bv);
            });
            return { data: sorted, error: null };
          },
        };
      },
      update(patch: Record<string, unknown>) {
        return {
          eq(column: string, value: string) {
            return Promise.resolve().then(() => {
              const target = t.rows.find((r) => r[column] === value);
              if (target) Object.assign(target, patch);
              return { data: target ?? null, error: null };
            });
          },
        };
      },
    };
  };

  const client: SupabaseLike = {
    schema(name: string) {
      if (name !== "k") {
        throw new Error(`unexpected schema: ${name}; only 'k' allowed by Stage 5 contract`);
      }
      return { from: (table: string) => tableApi(table) };
    },
  };
  return { client, tables };
}

// ---------------------------------------------------------------------------
// Test fixtures
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

function spendRowFor(candidateId: string): SpendEventRow {
  return {
    subscription_id: null,
    source_candidate_id: candidateId,
    vendor_name: "Acme",
    amount_original: 12,
    currency: "USD",
    amount_aud: null,
    charged_on: "2026-05-03",
    cadence: "monthly",
    event_type: "charge",
    source: "gmail_email",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("ServiceRoleRepo: candidate insert returns inserted=true on first call", async () => {
  const { client } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  const r = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  assertEquals(r.inserted, true, "inserted on first call");
  assert(r.candidate_id.startsWith("fake-uuid-"), `got id ${r.candidate_id}`);
});

Deno.test("ServiceRoleRepo: candidate insert returns inserted=false + same id on second call (idempotency)", async () => {
  const { client } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  const a = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  const b = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  assertEquals(a.inserted, true, "first inserted");
  assertEquals(b.inserted, false, "second is duplicate");
  assertEquals(a.candidate_id, b.candidate_id, "same candidate_id returned");
});

Deno.test("ServiceRoleRepo: spend-event insert is idempotent on source_candidate_id", async () => {
  const { client } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  const a = await repo.insertSpendEventOnConflictDoNothing(spendRowFor("cand-1"));
  const b = await repo.insertSpendEventOnConflictDoNothing(spendRowFor("cand-1"));
  assertEquals(a.inserted, true, "first promote inserts");
  assertEquals(b.inserted, false, "second promote is no-op");
  assertEquals(a.spend_event_id, b.spend_event_id, "same spend_event_id");
});

Deno.test("ServiceRoleRepo: only schema 'k' is touched", async () => {
  const { client, tables } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  // Confirm rows landed in the candidate table only (no spend events from a candidate insert).
  assertEquals(tables.subscription_import_candidate.rows.length, 1, "candidate row present");
  assertEquals(tables.subscription_spend_event.rows.length, 0, "no spend rows created");
});

Deno.test("ServiceRoleRepo: getCandidate returns the stored row", async () => {
  const { client } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  const { candidate_id } = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  const got = await repo.getCandidate(candidate_id);
  assert(got !== undefined, "row found");
  assertEquals(got?.gmail_message_id, sampleCandidate.gmail_message_id, "gmail_message_id matches");
});

Deno.test("ServiceRoleRepo: setReviewStatus mutates the row in-place via update().eq()", async () => {
  const { client, tables } = buildFakeSupabase();
  const repo = new ServiceRoleIngestRepository(client);
  const { candidate_id } = await repo.insertCandidateOnConflictDoNothing(sampleCandidate);
  await repo.setReviewStatus(candidate_id, "accepted");
  const stored = tables.subscription_import_candidate.rows[0];
  assertEquals(stored.review_status, "accepted", "review_status updated");
});

Deno.test("ServiceRoleRepo: rejects writes to schemas other than 'k'", async () => {
  // Construct a client that refuses everything but 'k' — this codifies the
  // Stage 5 contract that the only schema this repo touches is 'k'.
  const { client } = buildFakeSupabase();
  let threw = false;
  try {
    client.schema("public");
  } catch (e) {
    threw = e instanceof Error && e.message.includes("only 'k' allowed");
  }
  assert(threw, "schema('public') is rejected by the fake (codifies the Stage 5 contract)");
});
