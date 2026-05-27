/**
 * cc-0020 Subscription Email Ingest — orchestration (Stage 3).
 *
 * Dev/manual mode: takes already-sanitized email payloads (fixtures in MVP),
 * runs the pure parser, maps to candidate rows, and upserts them idempotently
 * via the repository (ON CONFLICT (gmail_message_id) DO NOTHING). Also exposes
 * the accept→spend_event promotion, idempotent on the candidate.
 *
 * No live Gmail, no network, no DB connection (the repository is injected; in
 * MVP that is the in-memory stub). Never logs tokens or raw email bodies.
 */

import { MIN_CANDIDATE_CONFIDENCE, parseEmail, type RawEmailInput } from "./parser.ts";
import { toCandidateRow, toSpendEventRow } from "./mapping.ts";
import { type IngestRepository } from "./repository.ts";

export interface IngestCounts {
  messages_seen: number;
  candidates_created: number;
  duplicates_skipped: number;
  low_confidence_skipped: number;
  errors: number;
  error_details: string[];
}

export interface IngestOptions {
  /** Confidence at/above which a candidate is created. Below → low_confidence_skipped. */
  minConfidence?: number;
}

/**
 * Ingest a batch of sanitized email payloads into candidate rows.
 * Idempotent: re-ingesting the same gmail_message_id is a no-op (counted as a
 * duplicate, not re-created).
 */
export function ingestEmails(
  emails: RawEmailInput[],
  repo: IngestRepository,
  opts: IngestOptions = {},
): IngestCounts {
  const minConfidence = opts.minConfidence ?? MIN_CANDIDATE_CONFIDENCE;
  const counts: IngestCounts = {
    messages_seen: emails.length,
    candidates_created: 0,
    duplicates_skipped: 0,
    low_confidence_skipped: 0,
    errors: 0,
    error_details: [],
  };

  for (const email of emails) {
    try {
      const parsed = parseEmail(email);
      if (parsed.confidence < minConfidence) {
        counts.low_confidence_skipped++;
        continue;
      }
      const result = repo.insertCandidateOnConflictDoNothing(toCandidateRow(email, parsed));
      if (result.inserted) counts.candidates_created++;
      else counts.duplicates_skipped++;
    } catch (e) {
      counts.errors++;
      // Only the message id + error message — never the body or any secret.
      const msg = e instanceof Error ? e.message : String(e);
      counts.error_details.push(`${email.gmail_message_id}: ${msg}`);
    }
  }

  return counts;
}

export interface PromotionResult {
  spend_event_id: string;
  created: boolean; // false => this candidate was already promoted (no-op)
}

/**
 * Promote an accepted candidate into the spend ledger. Idempotent: a second
 * promotion of the same candidate creates no additional spend event (modelled
 * by UNIQUE (source_candidate_id) in the repository). Throws
 * CandidateNotPromotableError if the candidate cannot satisfy the ledger's
 * NOT NULL columns (amount_original / currency / charged_on).
 */
export function promoteCandidate(candidateId: string, repo: IngestRepository): PromotionResult {
  const candidate = repo.getCandidate(candidateId);
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);

  const row = toSpendEventRow(candidate); // validates NOT NULL ledger columns
  repo.setReviewStatus(candidateId, "accepted");
  const result = repo.insertSpendEventOnConflictDoNothing(row);
  return { spend_event_id: result.spend_event_id, created: result.inserted };
}
