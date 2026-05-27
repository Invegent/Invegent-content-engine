/**
 * cc-0020 Subscription Email Ingest — pure parser (Stage 1).
 *
 * Pure, offline, deterministic. NO network, NO LLM, NO Deno/Supabase imports.
 * Given a sanitized email record, it extracts structured subscription-spend
 * fields for human review. Conservative by design: it only proposes
 * *candidates*; PK accepts/rejects downstream (brief §2 flow).
 *
 * Privacy (brief §5): the parser receives `snippet`/`body_text` TRANSIENTLY to
 * extract structured fields, but its OUTPUT never contains the body — only the
 * allow-listed metadata (gmail_message_id, sender DOMAIN, subject, received_at)
 * plus the extracted numeric/categorical fields. Nothing here logs or returns
 * tokens, secrets, or full addresses.
 *
 * Idempotency (brief §4): the primary dedupe key is `gmail_message_id` (the
 * immutable RFC822 id, passed through unchanged). `content_hash` is the
 * secondary defence — a deterministic hash of the normalised extraction,
 * independent of the message id.
 */

export const PARSER_VERSION = "subscription-email-parser-v1";

/** At/above this confidence the ingest layer should create a candidate row. */
export const MIN_CANDIDATE_CONFIDENCE = 0.4;

export type Cadence = "monthly" | "annual" | "one-off" | "unknown";

/**
 * Sanitized email input. `snippet` and `body_text` are TRANSIENT extraction
 * material and are never persisted by the ingest layer.
 */
export interface RawEmailInput {
  gmail_message_id: string;
  thread_id?: string | null;
  received_at: string; // ISO 8601
  from: string; // full From header, e.g. `Acme Billing <billing@acmesaas.example>`
  subject: string;
  snippet?: string | null;
  body_text?: string | null;
}

/**
 * Parser output. Field names align to `k.subscription_import_candidate`
 * (brief §2) so the Stage 3 ingest mapping is 1:1. `matched_subscription_id`
 * and `review_status` are NOT set here — they are assigned at ingest/review.
 */
export interface ParsedCandidate {
  gmail_message_id: string;
  is_subscription_related: boolean;
  vendor_raw: string | null;
  vendor_normalised: string | null;
  amount: number | null;
  currency: string | null; // AUD | USD | GBP | EUR
  billing_date: string | null; // YYYY-MM-DD
  cadence: Cadence;
  confidence: number; // 0..1, conservative
  extraction_reason: string;
  source_from_domain: string | null;
  source_subject: string;
  source_received_at: string;
  content_hash: string; // secondary idempotency defence (brief §4)
  parser_version: string;
}

// --- Keyword vocabularies ------------------------------------------------

const STRONG_BILLING = [
  "invoice",
  "receipt",
  "charged",
  "billed",
  "payment",
  "paid",
  "renewal",
  "renewed",
  "subscription",
];

const PROMO_SIGNALS = [
  "sale",
  "% off",
  "discount",
  "limited time",
  "upgrade now",
  "don't miss",
  "hurry",
  "ends soon",
  "coupon",
  "promo",
  "deal",
  "save up to",
];

const REFUND_SIGNALS = [
  "refund",
  "refunded",
  "credited",
  "credit note",
  "reversal",
  "chargeback",
  "money back",
];

// --- Currency / amount extraction ---------------------------------------

interface AmountHit {
  amount: number;
  currency: string;
  index: number;
  ambiguousSymbol: boolean;
}

const SYMBOL_PREFIX = /(AU\$|A\$|US\$|\$|£|€)\s?(\d[\d,]*(?:\.\d{1,2})?)/g;
const CODE_PREFIX = /\b(AUD|USD|GBP|EUR)\s?(\d[\d,]*(?:\.\d{1,2})?)/gi;
const CODE_SUFFIX = /(\d[\d,]*(?:\.\d{1,2})?)\s?(AUD|USD|GBP|EUR)\b/gi;

const ANCHOR =
  /\b(grand\s+total|total\s+due|total\s+paid|amount\s+paid|amount\s+charged|amount\s+due|you\s+were\s+charged|you\s+paid|payment\s+of|charged|total)\b/gi;

function symbolToCurrency(sym: string): { currency: string; ambiguous: boolean } {
  switch (sym.toUpperCase()) {
    case "A$":
    case "AU$":
      return { currency: "AUD", ambiguous: false };
    case "US$":
      return { currency: "USD", ambiguous: false };
    case "£":
      return { currency: "GBP", ambiguous: false };
    case "€":
      return { currency: "EUR", ambiguous: false };
    case "$":
    default:
      // Bare "$" is ambiguous; assume USD (symbol's canonical meaning) but flag it.
      return { currency: "USD", ambiguous: true };
  }
}

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

function collectAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  for (const m of text.matchAll(SYMBOL_PREFIX)) {
    const { currency, ambiguous } = symbolToCurrency(m[1]);
    hits.push({ amount: toNumber(m[2]), currency, index: m.index ?? 0, ambiguousSymbol: ambiguous });
  }
  for (const m of text.matchAll(CODE_PREFIX)) {
    hits.push({ amount: toNumber(m[2]), currency: m[1].toUpperCase(), index: m.index ?? 0, ambiguousSymbol: false });
  }
  for (const m of text.matchAll(CODE_SUFFIX)) {
    hits.push({ amount: toNumber(m[1]), currency: m[2].toUpperCase(), index: m.index ?? 0, ambiguousSymbol: false });
  }
  return hits.filter((h) => !Number.isNaN(h.amount));
}

function anchorIndexes(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(ANCHOR)) out.push(m.index ?? 0);
  return out;
}

interface AmountChoice {
  amount: number | null;
  currency: string | null;
  ambiguousSymbol: boolean;
  anchored: boolean;
  ambiguousMultiple: boolean;
}

/**
 * Pick the charged amount. Prefer an amount anchored to a "total/charged/paid"
 * cue (and the largest such, since a total is >= line items). With no anchor,
 * use the amount only if it is unambiguous (exactly one distinct value);
 * multiple distinct amounts with no clear total => null (brief: "choose total
 * only if clear").
 */
function chooseAmount(text: string): AmountChoice {
  const hits = collectAmounts(text);
  if (hits.length === 0) {
    return { amount: null, currency: null, ambiguousSymbol: false, anchored: false, ambiguousMultiple: false };
  }
  const anchors = anchorIndexes(text);
  const anchored = hits.filter((h) => anchors.some((a) => a <= h.index && h.index - a <= 60));
  if (anchored.length > 0) {
    const pick = anchored.reduce((best, h) => (h.amount > best.amount ? h : best));
    return { amount: pick.amount, currency: pick.currency, ambiguousSymbol: pick.ambiguousSymbol, anchored: true, ambiguousMultiple: false };
  }
  const distinct = [...new Set(hits.map((h) => h.amount))];
  if (distinct.length === 1) {
    const pick = hits[0];
    return { amount: pick.amount, currency: pick.currency, ambiguousSymbol: pick.ambiguousSymbol, anchored: false, ambiguousMultiple: false };
  }
  return { amount: null, currency: null, ambiguousSymbol: false, anchored: false, ambiguousMultiple: true };
}

// --- Cadence / date / vendor --------------------------------------------

function detectCadence(text: string, isRefund: boolean): Cadence {
  if (isRefund || /\b(one[-\s]?time|one[-\s]?off|once[-\s]?off)\b/.test(text)) return "one-off";
  if (/\b(annual|annually|yearly|per\s+year|\/\s?yr|\/\s?year|12\s+months)\b/.test(text)) return "annual";
  if (/\b(monthly|per\s+month|\/\s?mo|\/\s?month|every\s+month)\b/.test(text)) return "monthly";
  return "unknown";
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Extract a YYYY-MM-DD billing date from text; fall back to received_at's date. */
function detectBillingDate(text: string, receivedAt: string): string | null {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dMonY = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (dMonY) {
    const mm = MONTHS[dMonY[2].slice(0, 3).toLowerCase()];
    if (mm) return `${dMonY[3]}-${mm}-${dMonY[1].padStart(2, "0")}`;
  }

  const monDY = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monDY) {
    const mm = MONTHS[monDY[1].slice(0, 3).toLowerCase()];
    if (mm) return `${monDY[3]}-${mm}-${monDY[2].padStart(2, "0")}`;
  }

  // Fallback: the date the email was received (ISO 8601 → first 10 chars).
  const fallback = receivedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : null;
}

function extractDomain(from: string): string | null {
  const m = from.match(/@([A-Za-z0-9.-]+)/);
  return m ? m[1].toLowerCase().replace(/[>.\s]+$/, "") : null;
}

const SUBDOMAIN_NOISE = new Set(["billing", "mail", "email", "accounts", "www", "no-reply", "noreply", "send", "notifications"]);
const TLD_NOISE = new Set(["com", "co", "net", "org", "io", "app", "example"]);
const ROLE_WORDS = /\b(billing|invoices?|no[-\s]?reply|noreply|accounts?|support|team|hello|notifications?|receipts?)\b/gi;

/** Registrable-ish second-level label, e.g. billing.acmesaas.example -> acmesaas */
function brandFromDomain(domain: string): string | null {
  const labels = domain.split(".").filter((l) => l && !SUBDOMAIN_NOISE.has(l));
  while (labels.length > 1 && TLD_NOISE.has(labels[labels.length - 1])) labels.pop();
  const brand = labels[labels.length - 1];
  return brand ? brand.replace(/[^a-z0-9]/gi, "").toLowerCase() : null;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractVendor(from: string, domain: string | null): { raw: string | null; normalised: string | null } {
  const normalised = domain ? brandFromDomain(domain) : null;
  let display = from.includes("<") ? from.slice(0, from.indexOf("<")).trim() : "";
  display = display.replace(/^["']|["']$/g, "").replace(ROLE_WORDS, "").replace(/\s{2,}/g, " ").trim();
  const raw = display || (normalised ? titleCase(normalised) : null);
  return { raw, normalised };
}

// --- Deterministic content hash (FNV-1a 32-bit) -------------------------

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

// --- Main parser ---------------------------------------------------------

export function parseEmail(input: RawEmailInput): ParsedCandidate {
  // Combine the visible text for scanning. Body is used transiently only.
  const text = [input.subject, input.snippet ?? "", input.body_text ?? ""].join("\n");
  const lower = text.toLowerCase();

  const domain = extractDomain(input.from);
  const { raw: vendorRaw, normalised: vendorNormalised } = extractVendor(input.from, domain);

  const isRefund = includesAny(lower, REFUND_SIGNALS);
  const isPromo = includesAny(lower, PROMO_SIGNALS);
  const hasStrongKeyword = includesAny(lower, STRONG_BILLING);

  const amt = chooseAmount(text);
  const cadence = detectCadence(lower, isRefund);
  const billingDate = detectBillingDate(text, input.received_at);

  const hasPlanWord = /\b(plan|subscription|monthly|annual|yearly)\b/.test(lower);
  const isSubscriptionRelated = hasStrongKeyword || (hasPlanWord && amt.amount !== null);

  // --- Conservative confidence ------------------------------------------
  const reasons: string[] = [];
  let confidence = 0;

  if (amt.amount !== null) {
    confidence += 0.35;
    reasons.push("amount found");
  } else {
    reasons.push(amt.ambiguousMultiple ? "multiple amounts, no clear total" : "no amount");
  }

  if (amt.currency && !amt.ambiguousSymbol) confidence += 0.1;
  else if (amt.currency && amt.ambiguousSymbol) {
    confidence += 0.05;
    reasons.push("'$' ambiguous → assumed USD");
  }

  if (hasStrongKeyword) {
    confidence += 0.25;
    reasons.push("billing keyword");
  }
  if (amt.anchored) {
    confidence += 0.1;
    reasons.push("explicit total/charged anchor");
  }
  if (cadence !== "unknown") confidence += 0.1;
  if (vendorNormalised) confidence += 0.05;

  if (isPromo) {
    confidence -= 0.3;
    reasons.push("promotional signals");
  }
  if (isRefund) {
    confidence = Math.min(confidence, 0.25);
    reasons.push("refund/credit detected");
  }
  if (amt.amount === null) confidence = Math.min(confidence, 0.2);
  if (amt.ambiguousMultiple) confidence = Math.min(confidence, 0.25);

  confidence = Math.round(clamp01(confidence) * 100) / 100;

  const contentHash = fnv1a(
    [vendorNormalised, amt.amount, amt.currency, billingDate, cadence].join("|"),
  );

  return {
    gmail_message_id: input.gmail_message_id,
    is_subscription_related: isSubscriptionRelated,
    vendor_raw: vendorRaw,
    vendor_normalised: vendorNormalised,
    amount: amt.amount,
    currency: amt.currency,
    billing_date: billingDate,
    cadence,
    confidence,
    extraction_reason: reasons.join("; "),
    source_from_domain: domain,
    source_subject: input.subject,
    source_received_at: input.received_at,
    content_hash: contentHash,
    parser_version: PARSER_VERSION,
  };
}

/**
 * Pure analogue of the DB `INSERT ... ON CONFLICT (gmail_message_id) DO NOTHING`
 * (brief §4). Keeps the first occurrence of each gmail_message_id; treats any
 * later occurrence as a duplicate. Proves re-ingest is a no-op at the logic
 * layer before the DB unique constraint is added in Stage 2.
 */
export function dedupeByMessageId(candidates: ParsedCandidate[]): {
  kept: ParsedCandidate[];
  duplicates: ParsedCandidate[];
} {
  const seen = new Set<string>();
  const kept: ParsedCandidate[] = [];
  const duplicates: ParsedCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.gmail_message_id)) duplicates.push(c);
    else {
      seen.add(c.gmail_message_id);
      kept.push(c);
    }
  }
  return { kept, duplicates };
}
