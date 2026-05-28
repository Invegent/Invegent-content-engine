/**
 * cc-0020 Subscription Email Ingest — repository layer (Stage 3 + Stage 5 Unit B).
 *
 * Defines the async repository interface and TWO implementations:
 *   • InMemoryIngestRepository — fixture/dev/test path. Faithfully models the
 *     Stage 2 DB constraints without any database (UNIQUE gmail_message_id and
 *     UNIQUE source_candidate_id reproduced via Maps).
 *   • ServiceRoleIngestRepository — Stage 5 Unit B production path. Writes via
 *     the Supabase JS client using the SERVICE_ROLE key against schema `k`.
 *     Uses PostgREST upsert with onConflict + ignoreDuplicates to mirror the
 *     Stage 2 ON CONFLICT … DO NOTHING semantics.
 *
 * The interface is async to support both repos under one ingest orchestrator.
 *
 * The reference SQL the live repo executes through PostgREST is recorded below
 * as documentation. The live execution is parameterised PostgREST upsert; the
 * SQL strings are NOT raw-executed (no SQL injection surface).
 */

import {
  type CandidateRow,
  type SpendEventRow,
  type StoredCandidate,
  type StoredSpendEvent,
  type ReviewStatus,
} from "./mapping.ts";

/** Documentation only — the equivalent SQL the PostgREST upsert produces. */
export const CANDIDATE_UPSERT_SQL = `
INSERT INTO k.subscription_import_candidate (
  gmail_message_id, vendor_raw, vendor_normalised, matched_subscription_id,
  amount, currency, billing_date, cadence, event_type, confidence,
  source_from_domain, source_subject, source_received_at, parser_version,
  content_hash, review_status
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
ON CONFLICT (gmail_message_id) DO NOTHING
RETURNING candidate_id;`;

/** Documentation only — the equivalent SQL the PostgREST upsert produces. */
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
// Stage 5 Unit B: ServiceRoleIngestRepository (production path)
// ---------------------------------------------------------------------------

/**
 * Minimal Supabase JS surface the repo needs. Declared as an interface so
 * tests can inject a fake without pulling the JSR client into the test graph.
 * The live caller in index.ts constructs a real `createClient(...)` instance.
 */
export interface SupabaseLike {
  schema(name: string): {
    from(table: string): {
      upsert(
        row: Record<string, unknown>,
        opts: { onConflict: string; ignoreDuplicates: boolean },
      ): {
        select(cols: string): Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
      };
      select(cols: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
        };
        order(column: string, opts?: { ascending?: boolean }): Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
      };
      update(patch: Record<string, unknown>): {
        eq(column: string, value: string): Promise<{ data: unknown; error: { message?: string } | null }>;
      };
    };
  };
}

/**
 * Live service-role repository.
 *
 * Privacy / safety contract:
 *   • Only writes the structured CandidateRow / SpendEventRow shapes — no body,
 *     no token, no secret reaches the DB or any log.
 *   • UPSERT uses onConflict='gmail_message_id', ignoreDuplicates=true on the
 *     candidate write to match Stage 2's `ON CONFLICT … DO NOTHING`.
 *   • UPSERT uses onConflict='source_candidate_id', ignoreDuplicates=true on
 *     the spend-event write — promotion is idempotent at the constraint layer.
 *   • Errors NEVER include the raw row payload (which would echo metadata).
 *     Only the error message + the gmail_message_id (the idempotency key) are
 *     surfaced to the caller; the caller logs at most that pair.
 */
export class ServiceRoleIngestRepository implements IngestRepository {
  private readonly db: SupabaseLike;

  constructor(supabase: SupabaseLike) {
    this.db = supabase;
  }

  private k() {
    return this.db.schema("k");
  }

  async insertCandidateOnConflictDoNothing(row: CandidateRow): Promise<InsertCandidateResult> {
    const { data, error } = await this.k()
      .from("subscription_import_candidate")
      .upsert(row as unknown as Record<string, unknown>, {
        onConflict: "gmail_message_id",
        ignoreDuplicates: true,
      })
      .select("candidate_id");

    if (error) {
      // Never include the row payload (would echo metadata); never the token.
      throw new Error(
        `subscription_import_candidate upsert failed for ${row.gmail_message_id}: ${error.message ?? "unknown"}`,
      );
    }

    if (data && data.length > 0) {
      // Inserted row; PostgREST returned the new candidate_id.
      return { inserted: true, candidate_id: String(data[0].candidate_id) };
    }

    // ignoreDuplicates collapsed onto an existing row → look it up to return its id.
    const { data: existing, error: lookupErr } = await this.k()
      .from("subscription_import_candidate")
      .select("candidate_id")
      .eq("gmail_message_id", row.gmail_message_id)
      .maybeSingle();

    if (lookupErr || !existing) {
      throw new Error(
        `subscription_import_candidate lookup after duplicate-skip failed for ${row.gmail_message_id}: ${lookupErr?.message ?? "no row"}`,
      );
    }
    return { inserted: false, candidate_id: String(existing.candidate_id) };
  }

  async getCandidate(candidateId: string): Promise<StoredCandidate | undefined> {
    const { data, error } = await this.k()
      .from("subscription_import_candidate")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (error) throw new Error(`getCandidate ${candidateId}: ${error.message ?? "unknown"}`);
    return (data as StoredCandidate | null) ?? undefined;
  }

  async listCandidates(): Promise<StoredCandidate[]> {
    const { data, error } = await this.k()
      .from("subscription_import_candidate")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listCandidates: ${error.message ?? "unknown"}`);
    return (data as StoredCandidate[] | null) ?? [];
  }

  async setReviewStatus(candidateId: string, status: ReviewStatus): Promise<void> {
    const { error } = await this.k()
      .from("subscription_import_candidate")
      .update({ review_status: status, updated_at: new Date().toISOString() })
      .eq("candidate_id", candidateId);
    if (error) throw new Error(`setReviewStatus ${candidateId}: ${error.message ?? "unknown"}`);
  }

  async insertSpendEventOnConflictDoNothing(row: SpendEventRow): Promise<InsertSpendEventResult> {
    const { data, error } = await this.k()
      .from("subscription_spend_event")
      .upsert(row as unknown as Record<string, unknown>, {
        onConflict: "source_candidate_id",
        ignoreDuplicates: true,
      })
      .select("spend_event_id");

    if (error) {
      throw new Error(
        `subscription_spend_event upsert failed for candidate ${row.source_candidate_id}: ${error.message ?? "unknown"}`,
      );
    }

    if (data && data.length > 0) {
      return { inserted: true, spend_event_id: String(data[0].spend_event_id) };
    }

    const { data: existing, error: lookupErr } = await this.k()
      .from("subscription_spend_event")
      .select("spend_event_id")
      .eq("source_candidate_id", row.source_candidate_id)
      .maybeSingle();

    if (lookupErr || !existing) {
      throw new Error(
        `subscription_spend_event lookup after duplicate-skip failed for candidate ${row.source_candidate_id}: ${lookupErr?.message ?? "no row"}`,
      );
    }
    return { inserted: false, spend_event_id: String(existing.spend_event_id) };
  }

  async listSpendEvents(): Promise<StoredSpendEvent[]> {
    const { data, error } = await this.k()
      .from("subscription_spend_event")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listSpendEvents: ${error.message ?? "unknown"}`);
    return (data as StoredSpendEvent[] | null) ?? [];
  }
}
