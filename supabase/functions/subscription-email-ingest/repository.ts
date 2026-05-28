/**
 * cc-0020 Subscription Email Ingest — repository layer (Stage 3 + Stage 5 Unit B).
 *
 * Defines the async repository interface and TWO implementations:
 *   • InMemoryIngestRepository — fixture/dev/test path. Faithfully models the
 *     Stage 2 DB constraints without any database (UNIQUE gmail_message_id and
 *     UNIQUE source_candidate_id reproduced via Maps).
 *   • ServiceRoleIngestRepository — Stage 5 Unit B production path. Writes
 *     EXCLUSIVELY via `public.*` SECURITY DEFINER RPCs called with the
 *     SERVICE_ROLE key. The schema `k` is NOT PostgREST-exposed and MUST
 *     NEVER be reached directly from this module. Per cc-0020 access rule,
 *     all ingest writes go through the RPC boundary.
 *
 * The interface is async to support both repos under one ingest orchestrator.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Stage 5 / Unit C BLOCKER (introduced by Unit B plan_review):            │
 * │                                                                         │
 * │   ServiceRoleIngestRepository depends on a future PUBLIC SECURITY       │
 * │   DEFINER write RPC `public.ingest_subscription_import_candidate(...)`  │
 * │   that does NOT yet exist in production `mbkmaxqhsohbtwsqolns`.         │
 * │                                                                         │
 * │   Unit C (deploy-DISABLED) CANNOT proceed until ALL of:                 │
 * │     (a) the RPC migration is authored against the Stage 2 schema;      │
 * │     (b) the migration applied to production behind a sql_destructive    │
 * │         D-01 + PK exact approval phrase (matches Stage 4-B precedent);  │
 * │     (c) real-PG / PGlite proof of the RPC's idempotency contract        │
 * │         executed and captured.                                          │
 * │                                                                         │
 * │   Until those land, calling the live `mode='gmail'` path will return    │
 * │   the RPC error PGRST202 ("function not found"). The function remains   │
 * │   safe-to-deploy in disabled state (`SUBSCRIPTION_GMAIL_INGEST_ENABLED  │
 * │   =false` short-circuits before any RPC is reached), but deploying the  │
 * │   function and flipping the flag would surface PGRST202 to PK without   │
 * │   any data effect. Therefore: do not deploy Unit C until (a)–(c) are    │
 * │   complete.                                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import {
  type CandidateRow,
  type SpendEventRow,
  type StoredCandidate,
  type StoredSpendEvent,
  type ReviewStatus,
} from "./mapping.ts";

/** Documentation only — the equivalent in-RPC SQL the live write performs. */
export const CANDIDATE_RPC_SQL = `
INSERT INTO k.subscription_import_candidate (
  gmail_message_id, vendor_raw, vendor_normalised, matched_subscription_id,
  amount, currency, billing_date, cadence, event_type, confidence,
  source_from_domain, source_subject, source_received_at, parser_version,
  content_hash, review_status
) VALUES (
  p_gmail_message_id, p_vendor_raw, p_vendor_normalised, p_matched_subscription_id,
  p_amount, p_currency, p_billing_date, p_cadence, p_event_type, p_confidence,
  p_source_from_domain, p_source_subject, p_source_received_at, p_parser_version,
  p_content_hash, p_review_status
)
ON CONFLICT (gmail_message_id) DO NOTHING
RETURNING candidate_id;`;

/**
 * Name of the required SECURITY DEFINER RPC that performs the candidate
 * upsert. Authored separately as a future migration (see Stage 5 / Unit C
 * blocker note above). Kept as a single constant so the canary check has one
 * place to read.
 */
export const INGEST_CANDIDATE_RPC = "ingest_subscription_import_candidate";

/**
 * Required signature of the future `public.ingest_subscription_import_candidate`
 * RPC. Recorded in code so the eventual migration can be reviewed against
 * the contract this client expects.
 *
 *   public.ingest_subscription_import_candidate(
 *     p_gmail_message_id        text,
 *     p_vendor_raw              text,
 *     p_vendor_normalised       text,
 *     p_matched_subscription_id uuid,
 *     p_amount                  numeric,
 *     p_currency                text,
 *     p_billing_date            date,
 *     p_cadence                 text,
 *     p_event_type              text,
 *     p_confidence              numeric,
 *     p_source_from_domain      text,
 *     p_source_subject          text,
 *     p_source_received_at      timestamptz,
 *     p_parser_version          text,
 *     p_content_hash            text,
 *     p_review_status           text
 *   ) RETURNS TABLE(candidate_id uuid, inserted boolean)
 *   LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, k;
 *   REVOKE EXECUTE FROM PUBLIC, anon, authenticated;
 *   GRANT EXECUTE TO service_role;
 *
 * The body performs an `INSERT … ON CONFLICT (gmail_message_id) DO NOTHING
 * RETURNING candidate_id`, then if no candidate_id was returned, SELECTs the
 * existing row's candidate_id. Returns `(candidate_id, true)` on insert,
 * `(candidate_id, false)` on duplicate.
 */
export const INGEST_CANDIDATE_RPC_PARAMS = [
  "p_gmail_message_id",
  "p_vendor_raw",
  "p_vendor_normalised",
  "p_matched_subscription_id",
  "p_amount",
  "p_currency",
  "p_billing_date",
  "p_cadence",
  "p_event_type",
  "p_confidence",
  "p_source_from_domain",
  "p_source_subject",
  "p_source_received_at",
  "p_parser_version",
  "p_content_hash",
  "p_review_status",
] as const;

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
  insertCandidateOnConflictDoNothing(row: CandidateRow): Promise<InsertCandidateResult>;
  getCandidate(candidateId: string): Promise<StoredCandidate | undefined>;
  listCandidates(): Promise<StoredCandidate[]>;
  setReviewStatus(candidateId: string, status: ReviewStatus): Promise<void>;
  /** Models ON CONFLICT (source_candidate_id) DO NOTHING. */
  insertSpendEventOnConflictDoNothing(row: SpendEventRow): Promise<InsertSpendEventResult>;
  listSpendEvents(): Promise<StoredSpendEvent[]>;
}

/**
 * In-memory stub. Keyed maps replicate the unique constraints exactly so the
 * idempotency tests exercise the same semantics the DB will enforce. Async
 * surface so the same orchestrator drives either repo.
 */
export class InMemoryIngestRepository implements IngestRepository {
  private candidatesById = new Map<string, StoredCandidate>();
  private candidateIdByMessageId = new Map<string, string>(); // models UNIQUE(gmail_message_id)
  private spendById = new Map<string, StoredSpendEvent>();
  private spendIdByCandidateId = new Map<string, string>(); // models UNIQUE(source_candidate_id)

  insertCandidateOnConflictDoNothing(row: CandidateRow): Promise<InsertCandidateResult> {
    const existing = this.candidateIdByMessageId.get(row.gmail_message_id);
    if (existing !== undefined) {
      return Promise.resolve({ inserted: false, candidate_id: existing }); // DO NOTHING
    }
    const candidate_id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.candidatesById.set(candidate_id, { ...row, candidate_id, created_at: now, updated_at: now });
    this.candidateIdByMessageId.set(row.gmail_message_id, candidate_id);
    return Promise.resolve({ inserted: true, candidate_id });
  }

  getCandidate(candidateId: string): Promise<StoredCandidate | undefined> {
    return Promise.resolve(this.candidatesById.get(candidateId));
  }

  listCandidates(): Promise<StoredCandidate[]> {
    return Promise.resolve([...this.candidatesById.values()]);
  }

  setReviewStatus(candidateId: string, status: ReviewStatus): Promise<void> {
    const c = this.candidatesById.get(candidateId);
    if (!c) throw new Error(`candidate not found: ${candidateId}`);
    c.review_status = status;
    c.updated_at = new Date().toISOString();
    return Promise.resolve();
  }

  insertSpendEventOnConflictDoNothing(row: SpendEventRow): Promise<InsertSpendEventResult> {
    const existing = this.spendIdByCandidateId.get(row.source_candidate_id);
    if (existing !== undefined) {
      return Promise.resolve({ inserted: false, spend_event_id: existing }); // DO NOTHING
    }
    const spend_event_id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.spendById.set(spend_event_id, { ...row, spend_event_id, created_at: now });
    this.spendIdByCandidateId.set(row.source_candidate_id, spend_event_id);
    return Promise.resolve({ inserted: true, spend_event_id });
  }

  listSpendEvents(): Promise<StoredSpendEvent[]> {
    return Promise.resolve([...this.spendById.values()]);
  }
}

// ---------------------------------------------------------------------------
// Stage 5 Unit B: ServiceRoleIngestRepository (RPC-only production path)
// ---------------------------------------------------------------------------

/**
 * Minimal Supabase JS surface the live repo needs.
 *
 * NOTE: by design, this interface exposes ONLY `.rpc()`. No `.schema()`, no
 * `.from()`, no direct table access. The cc-0020 access rule (schema `k` is
 * NOT PostgREST-exposed) is codified at the type level — any future caller
 * who reaches for direct table access will get a TypeScript error rather
 * than a silent PostgREST 404 at runtime.
 */
export interface SupabaseLike {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{
    data: Array<Record<string, unknown>> | Record<string, unknown> | null;
    error: { message?: string; code?: string } | null;
  }>;
}

/**
 * Live service-role repository (RPC-only).
 *
 * Privacy / safety contract:
 *   • Only writes the structured CandidateRow shape through the public RPC —
 *     no body, no token, no secret reaches the DB or any log.
 *   • The RPC `public.ingest_subscription_import_candidate` performs the
 *     `INSERT … ON CONFLICT (gmail_message_id) DO NOTHING` atomically inside
 *     SECURITY DEFINER and returns `(candidate_id, inserted)`.
 *   • Errors NEVER include the raw row payload (would echo metadata). Only
 *     the error message + the gmail_message_id are surfaced to the caller.
 *
 * Boundary contract:
 *   • This class touches NO table directly. It calls only `public.*` RPCs.
 *   • The dashboard review surface (Stage 4-A/4-B) is the canonical owner of
 *     read paths (`public.get_subscription_*` RPCs) and the
 *     promotion/rejection path (`public.review_subscription_candidate`).
 *   • Therefore the IngestRepository methods other than
 *     `insertCandidateOnConflictDoNothing` are intentionally NOT implemented
 *     here — they would duplicate the dashboard's RPCs and confuse the
 *     responsibility boundary. They throw with a clear pointer to the
 *     dashboard RPC.
 */
export class ServiceRoleIngestRepository implements IngestRepository {
  private readonly db: SupabaseLike;

  constructor(supabase: SupabaseLike) {
    this.db = supabase;
  }

  async insertCandidateOnConflictDoNothing(row: CandidateRow): Promise<InsertCandidateResult> {
    const args: Record<string, unknown> = {
      p_gmail_message_id: row.gmail_message_id,
      p_vendor_raw: row.vendor_raw,
      p_vendor_normalised: row.vendor_normalised,
      p_matched_subscription_id: row.matched_subscription_id,
      p_amount: row.amount,
      p_currency: row.currency,
      p_billing_date: row.billing_date,
      p_cadence: row.cadence,
      p_event_type: row.event_type,
      p_confidence: row.confidence,
      p_source_from_domain: row.source_from_domain,
      p_source_subject: row.source_subject,
      p_source_received_at: row.source_received_at,
      p_parser_version: row.parser_version,
      p_content_hash: row.content_hash,
      p_review_status: row.review_status,
    };

    const { data, error } = await this.db.rpc(INGEST_CANDIDATE_RPC, args);

    if (error) {
      // Never include the row payload (would echo metadata); never the token.
      // Surface only: RPC name, gmail_message_id (the idempotency key), and
      // the error message + optional PostgREST code (e.g. PGRST202 if the
      // function does not yet exist in prod — see Unit C blocker note above).
      const code = error.code ? ` [${error.code}]` : "";
      throw new Error(
        `${INGEST_CANDIDATE_RPC} RPC failed for ${row.gmail_message_id}${code}: ${error.message ?? "unknown"}`,
      );
    }

    // The RPC RETURNS TABLE(candidate_id uuid, inserted boolean). Supabase
    // returns this as an array of one row.
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) {
      throw new Error(
        `${INGEST_CANDIDATE_RPC} RPC returned no row for ${row.gmail_message_id}`,
      );
    }

    const first = rows[0];
    const candidate_id = first.candidate_id;
    const inserted = first.inserted;
    if (typeof candidate_id !== "string" || typeof inserted !== "boolean") {
      throw new Error(
        `${INGEST_CANDIDATE_RPC} RPC returned malformed row for ${row.gmail_message_id}`,
      );
    }
    return { inserted, candidate_id };
  }

  // -- The methods below intentionally throw. The live ingest function calls --
  // -- ONLY insertCandidateOnConflictDoNothing. Reads + promotion are the    --
  // -- dashboard's responsibility via public.get_subscription_* and          --
  // -- public.review_subscription_candidate RPCs.                            --

  getCandidate(_candidateId: string): Promise<StoredCandidate | undefined> {
    return Promise.reject(
      new Error(
        "ServiceRoleIngestRepository.getCandidate is not implemented: " +
          "the ingest function does not read candidates back; for dashboard " +
          "reads use public.get_subscription_import_candidates RPC.",
      ),
    );
  }

  listCandidates(): Promise<StoredCandidate[]> {
    return Promise.reject(
      new Error(
        "ServiceRoleIngestRepository.listCandidates is not implemented: " +
          "for dashboard reads use public.get_subscription_import_candidates RPC.",
      ),
    );
  }

  setReviewStatus(_candidateId: string, _status: ReviewStatus): Promise<void> {
    return Promise.reject(
      new Error(
        "ServiceRoleIngestRepository.setReviewStatus is not implemented: " +
          "review state transitions are owned by the dashboard via " +
          "public.review_subscription_candidate RPC (Stage 4-B).",
      ),
    );
  }

  insertSpendEventOnConflictDoNothing(_row: SpendEventRow): Promise<InsertSpendEventResult> {
    return Promise.reject(
      new Error(
        "ServiceRoleIngestRepository.insertSpendEventOnConflictDoNothing is not " +
          "implemented: promotion to k.subscription_spend_event is owned by the " +
          "dashboard via public.review_subscription_candidate RPC (Stage 4-B). " +
          "The ingest function only writes candidates.",
      ),
    );
  }

  listSpendEvents(): Promise<StoredSpendEvent[]> {
    return Promise.reject(
      new Error(
        "ServiceRoleIngestRepository.listSpendEvents is not implemented: " +
          "for dashboard reads use public.get_subscription_spend_events RPC.",
      ),
    );
  }
}
