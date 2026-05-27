/**
 * cc-0020 Subscription Email Ingest — parser unit tests (Stage 1).
 *
 * Hermetic: no network, no external imports. Inline assert helpers so
 * `deno test` runs fully offline. Synthetic fixtures only (brief §5).
 */

import {
  dedupeByMessageId,
  MIN_CANDIDATE_CONFIDENCE,
  parseEmail,
  type ParsedCandidate,
} from "./parser.ts";
import {
  annualRenewal,
  audInvoice,
  missingAmount,
  monthlyReceipt,
  monthlyReceiptDuplicate,
  multiAmountInvoice,
  promoFalsePositive,
  refundCredit,
} from "./fixtures.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}
function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: ${a} !== ${e}`);
}

// 1 — monthly SaaS receipt -> high-confidence monthly candidate
Deno.test("monthly receipt: USD 12.00 monthly, high confidence", () => {
  const r = parseEmail(monthlyReceipt);
  assertEquals(r.amount, 12, "amount");
  assertEquals(r.currency, "USD", "currency");
  assertEquals(r.cadence, "monthly", "cadence");
  assertEquals(r.billing_date, "2026-05-03", "billing_date");
  assert(r.is_subscription_related, "is_subscription_related");
  assertEquals(r.confidence, 0.95, "confidence");
  assert(r.confidence >= MIN_CANDIDATE_CONFIDENCE, "above create threshold");
  assertEquals(r.vendor_normalised, "acmesaas", "vendor_normalised");
});

// 2 — annual renewal -> annual cadence
Deno.test("annual renewal: USD 99.00 annual, high confidence", () => {
  const r = parseEmail(annualRenewal);
  assertEquals(r.amount, 99, "amount");
  assertEquals(r.currency, "USD", "currency");
  assertEquals(r.cadence, "annual", "cadence");
  assertEquals(r.billing_date, "2026-04-15", "billing_date");
  assertEquals(r.confidence, 0.95, "confidence");
});

// 3 — AUD invoice -> AUD, total chosen
Deno.test("AUD invoice: A$54.00 AUD, total chosen", () => {
  const r = parseEmail(audInvoice);
  assertEquals(r.amount, 54, "amount");
  assertEquals(r.currency, "AUD", "currency");
  assertEquals(r.cadence, "monthly", "cadence");
  assertEquals(r.billing_date, "2026-02-12", "billing_date");
  assertEquals(r.confidence, 0.95, "confidence");
});

// 4 — promotional email with a price -> NOT a high-confidence candidate
Deno.test("promo false-positive: below create threshold", () => {
  const r = parseEmail(promoFalsePositive);
  assert(r.confidence < MIN_CANDIDATE_CONFIDENCE, "below create threshold (would be skipped)");
  assertEquals(r.confidence, 0.25, "confidence");
  assert(r.extraction_reason.includes("promotional"), "reason flags promo");
});

// 5 — refund / credit -> low confidence + flagged
Deno.test("refund/credit: low confidence, one-off, reason flags refund", () => {
  const r = parseEmail(refundCredit);
  assertEquals(r.amount, 54, "amount");
  assertEquals(r.currency, "AUD", "currency");
  assertEquals(r.cadence, "one-off", "cadence");
  assert(r.confidence < MIN_CANDIDATE_CONFIDENCE, "below create threshold");
  assertEquals(r.confidence, 0.25, "confidence");
  assert(r.extraction_reason.includes("refund/credit"), "reason flags refund/credit");
});

// 6 — multi-amount invoice -> picks the Total, not a line item / subtotal
Deno.test("multi-amount invoice: picks Total (33.00), ignores line items", () => {
  const r = parseEmail(multiAmountInvoice);
  assertEquals(r.amount, 33, "amount = Total, not 10/20/30/3");
  assertEquals(r.currency, "AUD", "currency");
  assertEquals(r.confidence, 0.85, "confidence");
});

// 7 — duplicate of the same message -> dedupe keeps exactly one
Deno.test("duplicate message: ON CONFLICT(gmail_message_id) analogue keeps one", () => {
  const a = parseEmail(monthlyReceipt);
  const b = parseEmail(monthlyReceiptDuplicate);
  assertEquals(a.gmail_message_id, b.gmail_message_id, "same message id");
  assertEquals(a.content_hash, b.content_hash, "same content hash (identical extraction)");
  const { kept, duplicates } = dedupeByMessageId([a, b]);
  assertEquals(kept.length, 1, "kept exactly one");
  assertEquals(duplicates.length, 1, "one duplicate");
});

// re-ingest is a no-op (store keyed on gmail_message_id, like the DB unique key)
Deno.test("re-ingest is a no-op", () => {
  const store = new Map<string, ParsedCandidate>();
  const ingest = (rows: ParsedCandidate[]) => {
    for (const c of dedupeByMessageId(rows).kept) {
      if (!store.has(c.gmail_message_id)) store.set(c.gmail_message_id, c); // ON CONFLICT DO NOTHING
    }
  };
  ingest([parseEmail(monthlyReceipt)]);
  assertEquals(store.size, 1, "first ingest inserts one");
  ingest([parseEmail(monthlyReceiptDuplicate)]); // same message re-fetched
  assertEquals(store.size, 1, "re-ingest does not duplicate");
});

// 8 — missing amount -> amount null, low confidence (effectively rejected)
Deno.test("missing amount: amount null, below create threshold", () => {
  const r = parseEmail(missingAmount);
  assertEquals(r.amount, null, "amount null");
  assert(r.confidence < MIN_CANDIDATE_CONFIDENCE, "below create threshold");
  assertEquals(r.confidence, 0.2, "confidence");
});

// determinism — same input always yields the same output
Deno.test("deterministic: parsing twice is byte-identical", () => {
  assertEquals(parseEmail(monthlyReceipt), parseEmail(monthlyReceipt), "deterministic output");
});

// privacy (brief §5) — output never contains the body or the full address
Deno.test("privacy: no body / no full email address in output", () => {
  const json = JSON.stringify(parseEmail(monthlyReceipt));
  assert(!json.includes("SECRET_BODY_MARKER_DO_NOT_PERSIST"), "body text not leaked");
  assert(!json.includes("billing@acmesaas.example"), "full From address not stored");
  assertEquals(parseEmail(monthlyReceipt).source_from_domain, "acmesaas.example", "domain only");
});
