/**
 * cc-0020 Subscription Email Ingest — SYNTHETIC test fixtures (Stage 1).
 *
 * 100% fabricated. No real email, no real PK data, no real vendor mailboxes.
 * Domains use the reserved `.example` TLD. One body contains
 * SECRET_BODY_MARKER_DO_NOT_PERSIST purely so a test can prove the parser
 * output never echoes the email body (brief §5).
 *
 * Scenarios required by Stage 1 acceptance #2:
 *  1 monthly SaaS receipt          5 refund / credit
 *  2 annual renewal                6 multi-amount invoice (pick the total)
 *  3 AUD invoice                   7 duplicate of the same message
 *  4 promotional false-positive    8 missing amount
 */

import type { RawEmailInput } from "./parser.ts";

export const monthlyReceipt: RawEmailInput = {
  gmail_message_id: "msg-monthly-0001",
  thread_id: "thr-0001",
  received_at: "2026-05-03T08:00:00Z",
  from: "Acme SaaS Billing <billing@acmesaas.example>",
  subject: "Your Acme SaaS receipt",
  snippet: "Thanks for your payment.",
  body_text:
    "Hi, your subscription has been charged. Date of charge: 3 May 2026. " +
    "Plan: Pro (monthly). Total due: US$12.00. Thank you for being a customer. " +
    "(internal: SECRET_BODY_MARKER_DO_NOT_PERSIST)",
};

export const annualRenewal: RawEmailInput = {
  gmail_message_id: "msg-annual-0002",
  thread_id: "thr-0002",
  received_at: "2026-04-15T09:30:00Z",
  from: "CloudVault <receipts@cloudvault.example>",
  subject: "CloudVault annual renewal confirmation",
  snippet: "Your plan renewed.",
  body_text:
    "Your subscription has renewed for another year. Amount charged: US$99.00. " +
    "Billing date: 2026-04-15. This is an annual plan.",
};

export const audInvoice: RawEmailInput = {
  gmail_message_id: "msg-aud-0003",
  thread_id: "thr-0003",
  received_at: "2026-02-12T10:00:00Z",
  from: "DesignHub Invoices <invoices@designhub.example>",
  subject: "Invoice #INV-2026-0042 from DesignHub",
  snippet: "Your invoice is ready.",
  body_text: "Invoice date: 12 Feb 2026. Plan: Team (monthly). Total: A$54.00. Thank you.",
};

export const promoFalsePositive: RawEmailInput = {
  gmail_message_id: "msg-promo-0004",
  thread_id: "thr-0004",
  received_at: "2026-05-10T12:00:00Z",
  from: "PixelPro Marketing <hello@pixelpro.example>",
  subject: "Flash Sale — 50% off Pro!",
  snippet: "Don't miss out.",
  body_text:
    "Limited time deal! Upgrade to the Pro plan for just $5/month. " +
    "Save big — don't miss out. Promo ends soon.",
};

export const refundCredit: RawEmailInput = {
  gmail_message_id: "msg-refund-0005",
  thread_id: "thr-0003",
  received_at: "2026-02-20T11:15:00Z",
  from: "DesignHub Billing <billing@designhub.example>",
  subject: "Refund processed for invoice #INV-2026-0042",
  snippet: "Your refund is on its way.",
  body_text:
    "We have refunded A$54.00 to your card. The amount has been credited. " +
    "Reference: INV-2026-0042. Date: 20 Feb 2026.",
};

export const multiAmountInvoice: RawEmailInput = {
  gmail_message_id: "msg-multi-0006",
  thread_id: "thr-0006",
  received_at: "2026-03-01T06:45:00Z",
  from: "Ledgerly <accounts@ledgerly.example>",
  subject: "Your Ledgerly invoice",
  snippet: "Invoice attached.",
  body_text:
    "Invoice date: 1 Mar 2026. Item A: A$10.00. Item B: A$20.00. " +
    "Subtotal: A$30.00. GST: A$3.00. Total: A$33.00.",
};

/** Scenario 7: the SAME message re-fetched — identical gmail_message_id. */
export const monthlyReceiptDuplicate: RawEmailInput = { ...monthlyReceipt };

export const missingAmount: RawEmailInput = {
  gmail_message_id: "msg-missing-0008",
  thread_id: "thr-0008",
  received_at: "2026-05-01T07:00:00Z",
  from: "Acme SaaS <no-reply@acmesaas.example>",
  subject: "Your subscription is active",
  snippet: "Account status update.",
  body_text: "Thank you for being a member. Your subscription is active and in good standing.",
};

/** All distinct scenario emails (duplicate handled in its own test). */
export const ALL_FIXTURES: RawEmailInput[] = [
  monthlyReceipt,
  annualRenewal,
  audInvoice,
  promoFalsePositive,
  refundCredit,
  multiAmountInvoice,
  missingAmount,
];
