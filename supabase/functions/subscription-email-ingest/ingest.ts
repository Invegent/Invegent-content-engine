/**
 * cc-0020 Subscription Email Ingest — orchestration (Stage 3 + Stage 5 Unit B).
 *
 * Takes already-sanitized email payloads (fixtures in dev mode, Gmail-metadata
 * in production mode), runs the pure parser, maps to candidate rows, and
 * upserts them idempotently via the repository (ON CONFLICT (gmail_message_id)
 * DO NOTHING). Also exposes the accept→spend_event promotion, idempotent on
 * the candidate.
 *
 * The orchestrator is repo-agnostic — it accepts any IngestRepository (in-memory
 * for dev/tests, ServiceRoleIngestRepository for live writes). Async surface so
 * both paths drive through the same code.
 *
 * Privacy: never logs raw email bodies. Errors emit only the gmail_message_id +
 * the error message — never the full row, never any token.
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
export async function ingestEmails(
  emails: RawEmailInput[],
  repo: IngestRepository,
  opts: IngestOptions = {},
): Promise<IngestCounts> {
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
      const result = await repo.insertCandidateOnConflictDoNothing(toCandidateRow(email, parsed));
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
export async function promoteCandidate(
  candidateId: string,
  repo: IngestRepository,
): Promise<PromotionResult> {
  const candidate = await repo.getCandidate(candidateId);
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);

  const row = toSpendEventRow(candidate); // validates NOT NULL ledger columns
  await repo.setReviewStatus(candidateId, "accepted");
  const result = await repo.insertSpendEventOnConflictDoNothing(row);
  return { spend_event_id: result.spend_event_id, created: result.inserted };
}
