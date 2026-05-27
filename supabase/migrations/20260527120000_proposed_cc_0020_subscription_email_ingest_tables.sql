-- ============================================================================
-- cc-0020 Subscription Email Ingest — Stage 2 schema  (DRAFT — DO NOT APPLY)
-- ============================================================================
-- STATUS: DRAFT / UNAPPLIED. This file has NOT been applied to any database —
--   no apply_migration, no `supabase db push`, no production mutation. Applying
--   it is a later, separately-gated step requiring D-01 + an explicit PK
--   approval phrase (brief docs/briefs/cc-0020-subscription-email-ingest.md
--   §3 Stage 2 + §8). The `proposed_` filename marker signals draft state.
--
-- PURPOSE: append-only foundation for parsing subscription-billing emails into
--   structured, reviewable spend history. Two new tables in schema `k`:
--     • k.subscription_import_candidate — one parsed extraction per email,
--       awaiting PK review; idempotent on gmail_message_id.
--     • k.subscription_spend_event      — confirmed historical spend ledger;
--       rows promoted from accepted candidates (append-only).
--
-- RELATIONSHIP TO EXISTING STATE: the manual catalog k.subscription_register
--   (one row per service, current-state only) remains the source of truth for
--   WHAT the subscriptions are. THIS MIGRATION NEVER WRITES TO OR ALTERS THAT
--   TABLE — the new tables only reference it via nullable FK (brief §1, §2).
--
-- PRIVACY (brief §5): NO raw email body is stored — only structured extraction
--   fields + minimal metadata: gmail_message_id, sender DOMAIN (never the full
--   address), subject line, received timestamp. No tokens/secrets ever stored.
--
-- ACCESS / SECURITY POSTURE (cc-0020 Stage 2 hardening — intentionally stricter
--   than k.subscription_register, which currently has RLS disabled):
--     • RLS is ENABLED on both tables with NO policies → the PostgREST roles
--       anon & authenticated are denied all direct access (deny-by-default).
--     • NO grants to anon/authenticated (no broad public grants). These tables
--       hold financial data and must never be client-readable directly.
--     • service_role (BYPASSRLS) performs ingest/review writes via the explicit
--       least-privilege grants below (no DELETE; the ledger is append-only).
--     • A future dashboard read path must go through a SECURITY DEFINER RPC in
--       `public` (mirroring public.get_subscriptions()) or a service-role server
--       route — NOT direct PostgREST on schema k (k.* is not REST-exposed).
--   NOTE: service_role is assumed to already hold USAGE on schema k (it manages
--   the existing register), consistent with prior k/friction migrations; no
--   schema-level grant is broadened here.
-- ============================================================================

-- Idempotency-abort guard (mirrors cc-0015 Stage A style): refuse to re-run if
-- either table already exists, so an accidental second apply is a clear error
-- rather than a silent partial.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'k' AND table_name = 'subscription_import_candidate') THEN
    RAISE EXCEPTION 'ABORT: k.subscription_import_candidate already exists — cc-0020 Stage 2 already applied?';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'k' AND table_name = 'subscription_spend_event') THEN
    RAISE EXCEPTION 'ABORT: k.subscription_spend_event already exists — cc-0020 Stage 2 already applied?';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. k.subscription_import_candidate — parsed extraction awaiting review
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS k.subscription_import_candidate (
  candidate_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id        text NOT NULL,                    -- immutable RFC822 id; idempotency key
  vendor_raw              text,                             -- vendor string as seen (display name / domain)
  vendor_normalised       text,                             -- canonicalised brand for matching
  matched_subscription_id uuid REFERENCES k.subscription_register (subscription_id) ON DELETE SET NULL,
  amount                  numeric,                          -- extracted amount magnitude (currency below)
  currency                text,                             -- AUD | USD | GBP | EUR
  billing_date            date,
  cadence                 text NOT NULL DEFAULT 'unknown'
                            CHECK (cadence IN ('monthly','annual','one-off','unknown')),
  confidence              numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source_from_domain      text,                             -- sender DOMAIN only (privacy — never full address)
  source_subject          text,                             -- subject line (allow-listed metadata)
  source_received_at      timestamptz,
  parser_version          text,
  content_hash            text,                             -- secondary idempotency defence (brief §4)
  review_status           text NOT NULL DEFAULT 'candidate'
                            CHECK (review_status IN ('candidate','accepted','rejected','duplicate')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_import_candidate_gmail_message_id_key UNIQUE (gmail_message_id)
);

COMMENT ON TABLE k.subscription_import_candidate IS
  'cc-0020: one parsed subscription-billing email awaiting PK review. Append-only intake; idempotent on gmail_message_id. NO raw email body stored (privacy, brief §5). Reference-only to k.subscription_register (never writes it).';
COMMENT ON COLUMN k.subscription_import_candidate.gmail_message_id IS
  'Immutable RFC822 message id — UNIQUE idempotency key; ingest uses ON CONFLICT (gmail_message_id) DO NOTHING.';
COMMENT ON COLUMN k.subscription_import_candidate.source_from_domain IS
  'Sender DOMAIN only — the full email address is intentionally NOT stored (brief §5).';
COMMENT ON COLUMN k.subscription_import_candidate.content_hash IS
  'Deterministic hash of the normalised extraction — secondary duplicate defence, independent of the message id.';

CREATE INDEX IF NOT EXISTS subscription_import_candidate_review_status_idx ON k.subscription_import_candidate (review_status);
CREATE INDEX IF NOT EXISTS subscription_import_candidate_received_at_idx   ON k.subscription_import_candidate (source_received_at DESC);
CREATE INDEX IF NOT EXISTS subscription_import_candidate_vendor_idx        ON k.subscription_import_candidate (vendor_normalised);
CREATE INDEX IF NOT EXISTS subscription_import_candidate_content_hash_idx  ON k.subscription_import_candidate (content_hash);
CREATE INDEX IF NOT EXISTS subscription_import_candidate_matched_sub_idx   ON k.subscription_import_candidate (matched_subscription_id);

-- ----------------------------------------------------------------------------
-- 2. k.subscription_spend_event — confirmed historical spend ledger (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS k.subscription_spend_event (
  spend_event_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     uuid REFERENCES k.subscription_register (subscription_id) ON DELETE SET NULL,
  source_candidate_id uuid REFERENCES k.subscription_import_candidate (candidate_id) ON DELETE SET NULL,
  vendor_name         text,
  amount_original     numeric NOT NULL,                     -- amount as charged, in `currency`
  currency            text    NOT NULL,                     -- AUD | USD | GBP | EUR
  amount_aud          numeric,                              -- AUD-normalised; nullable until FX known
  charged_on          date    NOT NULL,
  cadence             text    NOT NULL DEFAULT 'unknown'
                        CHECK (cadence IN ('monthly','annual','one-off','unknown')),
  source              text    NOT NULL DEFAULT 'gmail_email', -- provenance: gmail_email | manual | ...
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_spend_event_source_candidate_key UNIQUE (source_candidate_id)
);

COMMENT ON TABLE k.subscription_spend_event IS
  'cc-0020: confirmed historical subscription-spend ledger (append-only). One row per accepted candidate (UNIQUE source_candidate_id prevents double-promotion); NULL candidate allowed for manual entries. Reference-only to k.subscription_register. NO raw email body.';
COMMENT ON COLUMN k.subscription_spend_event.source_candidate_id IS
  'FK to the accepted candidate; UNIQUE so one accepted candidate yields at most one spend event (idempotent promotion). NULL allowed for manual entries (multiple NULLs permitted by SQL UNIQUE).';
COMMENT ON COLUMN k.subscription_spend_event.amount_aud IS
  'AUD-normalised amount; nullable until an FX conversion is known.';

CREATE INDEX IF NOT EXISTS subscription_spend_event_subscription_idx ON k.subscription_spend_event (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_spend_event_charged_on_idx   ON k.subscription_spend_event (charged_on DESC);
CREATE INDEX IF NOT EXISTS subscription_spend_event_vendor_idx       ON k.subscription_spend_event (vendor_name);

-- ----------------------------------------------------------------------------
-- 3. Security — RLS enabled, deny-by-default, least-privilege grants
-- ----------------------------------------------------------------------------
ALTER TABLE k.subscription_import_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE k.subscription_spend_event      ENABLE ROW LEVEL SECURITY;

-- No policies are created. With RLS enabled and no policy, the non-superuser
-- PostgREST roles (anon, authenticated) get NO row access. service_role has
-- BYPASSRLS and operates via the explicit grants below. This is intentionally
-- stricter than k.subscription_register (RLS currently disabled there).

-- Least privilege. Candidate: ingest INSERTs, review UPDATEs review_status.
-- Spend ledger: append-only → INSERT + SELECT only (no UPDATE/DELETE granted).
GRANT SELECT, INSERT, UPDATE ON k.subscription_import_candidate TO service_role;
GRANT SELECT, INSERT          ON k.subscription_spend_event      TO service_role;

-- Deliberately NO grants to anon or authenticated. A dashboard read path must
-- go via a SECURITY DEFINER RPC in `public` (cf. public.get_subscriptions())
-- or a service-role server route — added in a later stage, not here.
