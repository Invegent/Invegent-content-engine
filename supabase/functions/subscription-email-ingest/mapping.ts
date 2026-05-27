/**
 * cc-0020 Subscription Email Ingest — parser→row mapping (Stage 3).
 *
 * Pure, offline, deterministic. Translates a ParsedCandidate into the DB row
 * shapes from the Stage 2/2a/2b migration, deriving `event_type` and enforcing
 * the Stage 2b sign convention (event_type authoritative; charge >= 0,
 * refund/credit <= 0). No DB, no network.
 *
 * All row/stored types live here so repository.ts can import them without a
 * circular dependency (mapping.ts imports nothing from repository.ts).
 */

import { type Cadence, type ParsedCandidate, type RawEmailInput } from "./parser.ts";

export type EventType = "charge" | "refund" | "credit" | "adjustment" | "unknown";
export type ReviewStatus = "candidate" | "accepted" | "rejected" | "duplicate";

// Refund takes precedence over credit; bare "credit" is avoided so "credit card"
// does not false-positive. Charge requires an explicit billing cue + an amount.
const REFUND_WORDS = ["refund", "refunded", "chargeback", "reversal", "money back"];
const CREDIT_WORDS = ["credited", "credit note", "credit memo"];
const CHARGE_WORDS = ["charged", "invoice", "receipt", "payment", "paid", "billed", "renewal", "renewed"];

function emailText(input: RawEmailInput): string {
  return [input.subject, input.snippet ?? "", input.body_text ?? ""].join("\n").toLowerCase();
}

/**
 * Derive the candidate's event_type HYPOTHESIS from the email signals
 * (Stage 2b: candidate event_type is a hypothesis; the ledger's is confirmed
 * at promotion). Refunds/credits map accordingly but stay low-confidence via
 * the parser; promo-only / unclear / mixed emails map to `unknown`.
 */
export function deriveEventType(input: RawEmailInput, parsed: ParsedCandidate): EventType {
  const t = emailText(input);
  if (REFUND_WORDS.some((w) => t.includes(w))) return "refund";
  if (CREDIT_WORDS.some((w) => t.includes(w))) return "credit";
  if (CHARGE_WORDS.some((w) => t.includes(w)) && parsed.amount !== null) return "charge";
  return "unknown";
}

/** Force amount sign to agree with event_type (Stage 2b). NULL stays NULL. */
export function applySignConvention(amount: number | null, eventType: EventType): number | null {
  if (amount === null) return null;
  if (eventType === "refund" || eventType === "credit") return -Math.abs(amount);
  if (eventType === "charge") return Math.abs(amount);
  return amount; // adjustment / unknown: leave as-is
}

// --- Row shapes (mirror the Stage 2/2a/2b migration columns) ----------------

export interface CandidateRow {
  gmail_message_id: string;
  vendor_raw: string | null;
  vendor_normalised: string | null;
  matched_subscription_id: string | null;
  amount: number | null;
  currency: string | null;
  billing_date: string | null;
  cadence: Cadence;
  event_type: EventType;
  confidence: number;
  source_from_domain: string | null;
  source_subject: string;
  source_received_at: string;
  parser_version: string;
  content_hash: string;
  review_status: ReviewStatus;
}

export interface StoredCandidate extends CandidateRow {
  candidate_id: string;
  created_at: string;
  updated_at: string;
}

export interface SpendEventRow {
  subscription_id: string | null;
  source_candidate_id: string;
  vendor_name: string | null;
  amount_original: number; // ledger column is NOT NULL
  currency: string; // NOT NULL
  amount_aud: number | null; // nullable until FX known
  charged_on: string; // NOT NULL (date)
  cadence: Cadence;
  event_type: EventType; // NOT NULL, no DB default → must be explicit
  source: string;
}

export interface StoredSpendEvent extends SpendEventRow {
  spend_event_id: string;
  created_at: string;
}

/** Map a parsed email into a candidate row (review_status='candidate'). */
export function toCandidateRow(input: RawEmailInput, parsed: ParsedCandidate): CandidateRow {
  const event_type = deriveEventType(input, parsed);
  return {
    gmail_message_id: parsed.gmail_message_id,
    vendor_raw: parsed.vendor_raw,
    vendor_normalised: parsed.vendor_normalised,
    matched_subscription_id: null, // register matching is a later concern
    amount: applySignConvention(parsed.amount, event_type),
    currency: parsed.currency,
    billing_date: parsed.billing_date,
    cadence: parsed.cadence,
    event_type,
    confidence: parsed.confidence,
    source_from_domain: parsed.source_from_domain,
    source_subject: parsed.source_subject,
    source_received_at: parsed.source_received_at,
    parser_version: parsed.parser_version,
    content_hash: parsed.content_hash,
    review_status: "candidate",
  };
}

/** Raised when a candidate cannot satisfy the ledger's NOT NULL columns. */
export class CandidateNotPromotableError extends Error {}

/**
 * Build the spend-event row for an accepted candidate. Enforces the ledger's
 * NOT NULL columns (amount_original, currency, charged_on) and sets event_type
 * explicitly (the ledger has NO DB default — Stage 2b).
 */
export function toSpendEventRow(candidate: StoredCandidate): SpendEventRow {
  if (candidate.amount === null) {
    throw new CandidateNotPromotableError("amount_original is NOT NULL: candidate has no amount");
  }
  if (candidate.currency === null) {
    throw new CandidateNotPromotableError("currency is NOT NULL: candidate has no currency");
  }
  if (candidate.billing_date === null) {
    throw new CandidateNotPromotableError("charged_on is NOT NULL: candidate has no billing_date");
  }
  return {
    subscription_id: candidate.matched_subscription_id,
    source_candidate_id: candidate.candidate_id,
    vendor_name: candidate.vendor_raw ?? candidate.vendor_normalised,
    amount_original: candidate.amount,
    currency: candidate.currency,
    amount_aud: null, // FX normalisation is a later concern
    charged_on: candidate.billing_date,
    cadence: candidate.cadence,
    event_type: candidate.event_type, // explicit; no ledger default
    source: "gmail_email",
  };
}
