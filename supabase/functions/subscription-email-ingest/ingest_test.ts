/**
 * cc-0020 Subscription Email Ingest — ingest scaffold tests
 * (Stage 3 + Stage 5 Unit B async surface).
 *
 * Hermetic: no network, no DB, no external imports. Exercises the in-memory
 * repository whose maps replicate the Stage 2 unique constraints, so the
 * idempotency guarantees match what the DB will enforce.
 */

import { ingestEmails, promoteCandidate } from "./ingest.ts";
import { InMemoryIngestRepository } from "./repository.ts";
import { fetchSubscriptionEmails } from "./gmail.ts";
import { applySignConvention, CandidateNotPromotableError, deriveEventType, toCandidateRow } from "./mapping.ts";
import { parseEmail } from "./parser.ts";
import {
  ALL_FIXTURES,
  audInvoice,
  missingAmount,
  monthlyReceipt,
  monthlyReceiptDuplicate,
  refundCredit,
} from "./fixtures.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}
function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: ${a} !== ${e}`);
}

// Env reader that always reports "disabled" so the gmail fail-closed path
// is exercised deterministically even if the host process has the flag set.
const disabledEnv = (_name: string): string | undefined => undefined;

// 1 — fixture/manual ingest path exists and counts correctly
Deno.test("manual ingest: 4 created, 3 low-confidence skipped", async () => {
  const repo = new InMemoryIngestRepository();
  const counts = await ingestEmails(ALL_FIXTURES, repo);
  assertEquals(counts.messages_seen, 7, "messages_seen");
  assertEquals(counts.candidates_created, 4, "created (monthly/annual/aud/multi)");
  assertEquals(counts.low_confidence_skipped, 3, "skipped (promo/refund/missing)");
  assertEquals(counts.duplicates_skipped, 0, "no dups");
  assertEquals(counts.errors, 0, "no errors");
  assertEquals((await repo.listCandidates()).length, 4, "stored candidates");
});

// 2/3 — Gmail fetch is disabled/fail-closed by default; no live access
Deno.test("gmail fetch: fail-closed (disabled) by default", async () => {
  const g = await fetchSubscriptionEmails({}, disabledEnv);
  assertEquals(g.ok, false, "not ok");
  assert((g.error ?? "").includes("disabled"), "error says disabled");
  assertEquals(g.messages.length, 0, "no messages");
});

// 4 — candidate mapping includes event_type and respects Stage 2b sign convention
Deno.test("mapping: event_type + sign convention", () => {
  const charge = toCandidateRow(monthlyReceipt, parseEmail(monthlyReceipt));
  assertEquals(charge.event_type, "charge", "charge type");
  assert(charge.amount !== null && charge.amount >= 0, "charge amount >= 0");
  assertEquals(charge.amount, 12, "charge amount value");

  const inv = toCandidateRow(audInvoice, parseEmail(audInvoice));
  assertEquals(inv.event_type, "charge", "invoice → charge");

  const refund = toCandidateRow(refundCredit, parseEmail(refundCredit));
  assertEquals(refund.event_type, "refund", "refund type");
  assert(refund.amount !== null && refund.amount <= 0, "refund amount <= 0");
  assertEquals(refund.amount, -54, "refund negated");

  // sign helper directly
  assertEquals(applySignConvention(54, "refund"), -54, "refund neg");
  assertEquals(applySignConvention(54, "credit"), -54, "credit neg");
  assertEquals(applySignConvention(12, "charge"), 12, "charge pos");
  assertEquals(applySignConvention(5, "unknown"), 5, "unknown unchanged");
  assertEquals(applySignConvention(null, "refund"), null, "null stays null");

  // promo-only / unclear → unknown
  assertEquals(deriveEventType(missingAmount, parseEmail(missingAmount)), "unknown", "missing → unknown");
});

// 5 — re-ingesting the same gmail_message_id is a no-op
Deno.test("idempotent ingest: same gmail_message_id is a no-op", async () => {
  const repo = new InMemoryIngestRepository();
  const first = await ingestEmails([monthlyReceipt], repo);
  assertEquals(first.candidates_created, 1, "first inserts one");
  const second = await ingestEmails([monthlyReceiptDuplicate], repo); // same message re-fetched
  assertEquals(second.candidates_created, 0, "re-ingest creates nothing");
  assertEquals(second.duplicates_skipped, 1, "counted as duplicate");
  assertEquals((await repo.listCandidates()).length, 1, "still one candidate");
});

// 6 — re-promoting the same candidate creates only one spend event
Deno.test("idempotent promotion: one spend_event per candidate", async () => {
  const repo = new InMemoryIngestRepository();
  await ingestEmails([monthlyReceipt], repo);
  const cand = (await repo.listCandidates())[0];

  const p1 = await promoteCandidate(cand.candidate_id, repo);
  assertEquals(p1.created, true, "first promotion creates");
  const p2 = await promoteCandidate(cand.candidate_id, repo);
  assertEquals(p2.created, false, "second promotion is a no-op");
  assertEquals(p1.spend_event_id, p2.spend_event_id, "same spend_event_id");
  assertEquals((await repo.listSpendEvents()).length, 1, "exactly one spend event");
  assertEquals((await repo.getCandidate(cand.candidate_id))?.review_status, "accepted", "candidate accepted");

  const se = (await repo.listSpendEvents())[0];
  assertEquals(se.amount_original, 12, "ledger amount_original");
  assertEquals(se.event_type, "charge", "ledger event_type explicit");
  assertEquals(se.source_candidate_id, cand.candidate_id, "links to candidate");
});

// 7 — promotion enforces the ledger's NOT NULL amount_original
Deno.test("promotion refuses candidate with no amount (amount_original NOT NULL)", async () => {
  const repo = new InMemoryIngestRepository();
  const row = toCandidateRow(missingAmount, parseEmail(missingAmount));
  assertEquals(row.amount, null, "missing amount maps to null");
  const ins = await repo.insertCandidateOnConflictDoNothing(row); // inserted directly (bypassing confidence gate)

  let threw = false;
  try {
    await promoteCandidate(ins.candidate_id, repo);
  } catch (e) {
    threw = e instanceof CandidateNotPromotableError;
  }
  assert(threw, "throws CandidateNotPromotableError");
  assertEquals((await repo.listSpendEvents()).length, 0, "no spend event created");
});
