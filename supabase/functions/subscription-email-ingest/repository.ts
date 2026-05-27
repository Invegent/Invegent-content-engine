/**
 * cc-0020 Subscription Email Ingest — repository layer (Stage 3).
 *
 * Defines the repository interface and a STUBBED in-memory implementation that
 * faithfully models the Stage 2 DB constraints WITHOUT any database:
 *   • candidates: INSERT ... ON CONFLICT (gmail_message_id) DO NOTHING
 *   • spend events: one per accepted candidate via UNIQUE (source_candidate_id)
 *
 * The SQL the production (service-role) repository WOULD run is recorded below
 * as documentation only — it is never executed here. The live DB repository is
 * intentionally NOT implemented in this MVP (no Supabase client is constructed,
 * so this code cannot connect to any database). Wiring it is a later, separately
 * gated stage.
 */

import {
  type CandidateRow,
  type SpendEventRow,
  type StoredCandidate,
  type StoredSpendEvent,
  type ReviewStatus,
} from "./mapping.ts";

/** Documentation only — NOT executed. The shape the live service-role repo uses. */
export const CANDIDATE_UPSERT_SQL = `
INSERT INTO k.subscription_import_candidate (
  gmail_message_id, vendor_raw, vendor_normalised, matched_subscription_id,
  amount, currency, billing_date, cadence, event_type, confidence,
  source_from_domain, source_subject, source_received_at, parser_version,
  content_hash, review_status
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
ON CONFLICT (gmail_message_id) DO NOTHING
RETURNING candidate_id;`;

/** Documentation only — NOT executed. */
export const SPEND_EVENT_UPSERT_SQL = `
INSERT INTO k.subscription_spend_event (
  subscription_id, source_candidate_id, vendor_name, amount_original,
  currency, amount_aud, charged_on, cadence, event_type, source
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
ON CONFLICT (source_candidate_id) DO NOTHING
RETURNING spend_event_id;`;

export interface InsertCandidateResult {
  inserted: boolean; // false => gmail_message_id already existed (no-op)
  candidate_id: string;
}

export interface InsertSpendEventResult {
  inserted: boolean; // false => source_candidate_id already promoted (no-op)
  spend_event_id: string;
}

export interface IngestRepository {
  /** Models ON CONFLICT (gmail_message_id) DO NOTHING. */
  insertCandidateOnConflictDoNothing(row: CandidateRow): InsertCandidateResult;
  getCandidate(candidateId: string): StoredCandidate | undefined;
  listCandidates(): StoredCandidate[];
  setReviewStatus(candidateId: string, status: ReviewStatus): void;
  /** Models ON CONFLICT (source_candidate_id) DO NOTHING. */
  insertSpendEventOnConflictDoNothing(row: SpendEventRow): InsertSpendEventResult;
  listSpendEvents(): StoredSpendEvent[];
}

/**
 * In-memory stub. Keyed maps replicate the unique constraints exactly so the
 * idempotency tests exercise the same semantics the DB will enforce.
 */
export class InMemoryIngestRepository implements IngestRepository {
  private candidatesById = new Map<string, StoredCandidate>();
  private candidateIdByMessageId = new Map<string, string>(); // models UNIQUE(gmail_message_id)
  private spendById = new Map<string, StoredSpendEvent>();
  private spendIdByCandidateId = new Map<string, string>(); // models UNIQUE(source_candidate_id)

  insertCandidateOnConflictDoNothing(row: CandidateRow): InsertCandidateResult {
    const existing = this.candidateIdByMessageId.get(row.gmail_message_id);
    if (existing !== undefined) {
      return { inserted: false, candidate_id: existing }; // DO NOTHING
    }
    const candidate_id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.candidatesById.set(candidate_id, { ...row, candidate_id, created_at: now, updated_at: now });
    this.candidateIdByMessageId.set(row.gmail_message_id, candidate_id);
    return { inserted: true, candidate_id };
  }

  getCandidate(candidateId: string): StoredCandidate | undefined {
    return this.candidatesById.get(candidateId);
  }

  listCandidates(): StoredCandidate[] {
    return [...this.candidatesById.values()];
  }

  setReviewStatus(candidateId: string, status: ReviewStatus): void {
    const c = this.candidatesById.get(candidateId);
    if (!c) throw new Error(`candidate not found: ${candidateId}`);
    c.review_status = status;
    c.updated_at = new Date().toISOString();
  }

  insertSpendEventOnConflictDoNothing(row: SpendEventRow): InsertSpendEventResult {
    const existing = this.spendIdByCandidateId.get(row.source_candidate_id);
    if (existing !== undefined) {
      return { inserted: false, spend_event_id: existing }; // DO NOTHING
    }
    const spend_event_id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.spendById.set(spend_event_id, { ...row, spend_event_id, created_at: now });
    this.spendIdByCandidateId.set(row.source_candidate_id, spend_event_id);
    return { inserted: true, spend_event_id };
  }

  listSpendEvents(): StoredSpendEvent[] {
    return [...this.spendById.values()];
  }
}
