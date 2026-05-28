-- cc-0020 — subscription email ingest, RPC layer.
-- APPLIED TO PRODUCTION at version 20260527114144 (mbkmaxqhsohbtwsqolns).
-- Supersedes draft 20260527130000_proposed_… (kept as no-op tombstone).
-- The anon/authenticated EXECUTE revoke from hotfix 20260527114333 is folded
-- into §5 below; the hotfix is also retained as a separate canonical file.

-- ----------------------------------------------------------------------------
-- 1. public.get_subscription_import_candidates(p_status, p_limit)
--    Parsed email candidates awaiting/under review, newest first, with the
--    matched register service name resolved via LEFT JOIN.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subscription_import_candidates(
  p_status text    DEFAULT NULL,   -- candidate|accepted|rejected|duplicate; NULL = all
  p_limit  integer DEFAULT 200
)
RETURNS TABLE (
  candidate_id            uuid,
  gmail_message_id        text,
  vendor_raw              text,
  vendor_normalised       text,
  matched_subscription_id uuid,
  matched_service_name    text,
  amount                  numeric,
  currency                text,
  billing_date            date,
  cadence                 text,
  event_type              text,
  confidence              numeric,
  source_from_domain      text,
  source_subject          text,
  source_received_at      timestamptz,
  review_status           text,
  created_at              timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.candidate_id, c.gmail_message_id, c.vendor_raw, c.vendor_normalised,
         c.matched_subscription_id, r.service_name AS matched_service_name,
         c.amount, c.currency, c.billing_date, c.cadence, c.event_type,
         c.confidence, c.source_from_domain, c.source_subject,
         c.source_received_at, c.review_status, c.created_at
  FROM k.subscription_import_candidate c
  LEFT JOIN k.subscription_register r
    ON r.subscription_id = c.matched_subscription_id
  WHERE p_status IS NULL
     OR (p_status IN ('candidate','accepted','rejected','duplicate')
         AND c.review_status = p_status)
  ORDER BY c.source_received_at DESC NULLS LAST, c.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
$$;

COMMENT ON FUNCTION public.get_subscription_import_candidates(text, integer) IS
  'cc-0020 Stage 4-B: read subscription email-import candidates for the dashboard. SECURITY DEFINER over deny-by-default k.*; service_role-only EXECUTE. Returns allow-listed metadata only (no raw email body).';

-- ----------------------------------------------------------------------------
-- 2. public.get_subscription_spend_events(p_limit)
--    Confirmed append-only spend ledger, newest first, register name resolved.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subscription_spend_events(
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  spend_event_id      uuid,
  subscription_id     uuid,
  service_name        text,
  source_candidate_id uuid,
  vendor_name         text,
  amount_original     numeric,
  currency            text,
  amount_aud          numeric,
  charged_on          date,
  cadence             text,
  event_type          text,
  source              text,
  created_at          timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.spend_event_id, e.subscription_id, r.service_name,
         e.source_candidate_id, e.vendor_name, e.amount_original, e.currency,
         e.amount_aud, e.charged_on, e.cadence, e.event_type, e.source,
         e.created_at
  FROM k.subscription_spend_event e
  LEFT JOIN k.subscription_register r
    ON r.subscription_id = e.subscription_id
  ORDER BY e.charged_on DESC, e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 2000));
$$;

COMMENT ON FUNCTION public.get_subscription_spend_events(integer) IS
  'cc-0020 Stage 4-B: read the confirmed subscription-spend ledger for the dashboard. SECURITY DEFINER over deny-by-default k.*; service_role-only EXECUTE.';

-- ----------------------------------------------------------------------------
-- 3. public.get_subscription_spend_trends(p_months)
--    Monthly net-spend aggregation for the Trends view. Amounts already carry
--    event_type-authoritative sign (charge >=0, refund/credit <=0), so SUM is
--    net. Prefers AUD-normalised amount, falling back to original when no FX.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subscription_spend_trends(
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  month_start date,
  net_aud     numeric,
  charges_aud numeric,
  refunds_aud numeric,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('month', e.charged_on)::date AS month_start,
    SUM(COALESCE(e.amount_aud, e.amount_original)) AS net_aud,
    SUM(CASE WHEN e.event_type = 'charge'
             THEN COALESCE(e.amount_aud, e.amount_original) ELSE 0 END) AS charges_aud,
    SUM(CASE WHEN e.event_type IN ('refund','credit')
             THEN COALESCE(e.amount_aud, e.amount_original) ELSE 0 END) AS refunds_aud,
    COUNT(*) AS event_count
  FROM k.subscription_spend_event e
  WHERE e.charged_on >= (date_trunc('month', current_date)
                         - make_interval(months => GREATEST(COALESCE(p_months, 12), 1) - 1))
  GROUP BY 1
  ORDER BY 1;
$$;

COMMENT ON FUNCTION public.get_subscription_spend_trends(integer) IS
  'cc-0020 Stage 4-B: monthly net subscription spend (last p_months) for the dashboard Trends view. SECURITY DEFINER over k.*; service_role-only EXECUTE.';

-- ----------------------------------------------------------------------------
-- 4. public.review_subscription_candidate(p_candidate_id, p_decision, p_matched_subscription_id)
--    Transactional accept/reject. ACCEPT promotes the candidate into the
--    append-only ledger IDEMPOTENTLY (UNIQUE(source_candidate_id) + ON CONFLICT
--    DO NOTHING); REJECT marks the candidate without any ledger promotion.
--    The whole function runs in one transaction — any RAISE rolls it all back.
--
--    NOTE: the candidate table has no free-text note column, so there is no
--    p_notes parameter (a review_note column would be a separate, gated tables
--    change). Matching is via matched_subscription_id → k.subscription_register
--    (FK enforces referential integrity).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_subscription_candidate(
  p_candidate_id          uuid,
  p_decision              text,                 -- 'accepted' | 'rejected'
  p_matched_subscription_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c          k.subscription_import_candidate%ROWTYPE;
  v_match    uuid;
  v_spend_id uuid;
  v_existing uuid;
  v_charged  date;
  v_promoted boolean := false;
BEGIN
  IF p_decision NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'review_subscription_candidate: p_decision must be accepted|rejected (got %)', p_decision
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  SELECT * INTO c
    FROM k.subscription_import_candidate
   WHERE candidate_id = p_candidate_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review_subscription_candidate: candidate % not found', p_candidate_id
      USING ERRCODE = 'P0002';  -- no_data_found
  END IF;

  v_match := COALESCE(p_matched_subscription_id, c.matched_subscription_id);

  -- REJECT: mark rejected, never promote.
  IF p_decision = 'rejected' THEN
    UPDATE k.subscription_import_candidate
       SET review_status = 'rejected',
           matched_subscription_id = v_match,
           updated_at = now()
     WHERE candidate_id = p_candidate_id;
    RETURN jsonb_build_object(
      'candidate_id',  p_candidate_id,
      'review_status', 'rejected',
      'promoted',      false,
      'spend_event_id', NULL
    );
  END IF;

  -- ACCEPT: idempotent promotion. UNIQUE(source_candidate_id) guarantees at
  -- most one ledger row per candidate; re-accepting is a safe no-op.
  SELECT spend_event_id INTO v_existing
    FROM k.subscription_spend_event
   WHERE source_candidate_id = p_candidate_id;

  IF v_existing IS NULL THEN
    -- Ledger requires NOT NULL amount/currency/charged_on and an EXPLICIT
    -- event_type (no default). Candidate fields may be NULL → refuse to promote
    -- rather than fabricate ledger values.
    IF c.amount IS NULL THEN
      RAISE EXCEPTION 'cannot promote candidate % — amount is NULL', p_candidate_id USING ERRCODE = '22004';
    END IF;
    IF c.currency IS NULL THEN
      RAISE EXCEPTION 'cannot promote candidate % — currency is NULL', p_candidate_id USING ERRCODE = '22004';
    END IF;
    v_charged := COALESCE(c.billing_date, c.source_received_at::date);
    IF v_charged IS NULL THEN
      RAISE EXCEPTION 'cannot promote candidate % — no billing_date or received date', p_candidate_id USING ERRCODE = '22004';
    END IF;

    INSERT INTO k.subscription_spend_event (
      subscription_id, source_candidate_id, vendor_name,
      amount_original, currency, amount_aud, charged_on,
      cadence, event_type, source
    ) VALUES (
      v_match, p_candidate_id, COALESCE(c.vendor_normalised, c.vendor_raw),
      c.amount, c.currency,
      CASE WHEN c.currency = 'AUD' THEN c.amount ELSE NULL END,  -- amount_aud only when already AUD
      v_charged, c.cadence,
      c.event_type,                          -- explicit (ledger has no default); candidate sign-checks guarantee ledger sign-checks pass
      'gmail_email'
    )
    ON CONFLICT (source_candidate_id) DO NOTHING
    RETURNING spend_event_id INTO v_spend_id;

    IF v_spend_id IS NULL THEN
      -- concurrent promotion won the race; adopt the existing row
      SELECT spend_event_id INTO v_spend_id
        FROM k.subscription_spend_event
       WHERE source_candidate_id = p_candidate_id;
    ELSE
      v_promoted := true;
    END IF;
  ELSE
    v_spend_id := v_existing;  -- already promoted — idempotent
  END IF;

  UPDATE k.subscription_import_candidate
     SET review_status = 'accepted',
         matched_subscription_id = v_match,
         updated_at = now()
   WHERE candidate_id = p_candidate_id;

  RETURN jsonb_build_object(
    'candidate_id',   p_candidate_id,
    'review_status',  'accepted',
    'promoted',       v_promoted,
    'spend_event_id', v_spend_id
  );
END;
$$;

COMMENT ON FUNCTION public.review_subscription_candidate(uuid, text, uuid) IS
  'cc-0020 Stage 4-B: transactional accept/reject of an email-import candidate. ACCEPT promotes idempotently into k.subscription_spend_event (UNIQUE source_candidate_id, explicit event_type); REJECT marks the candidate only. SECURITY DEFINER; service_role-only EXECUTE.';

-- ----------------------------------------------------------------------------
-- 5. Grants — financial data: revoke the default PUBLIC EXECUTE, grant only to
--    service_role (the dashboard's server-side caller). NO anon/authenticated.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_subscription_import_candidates(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_events(integer)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_trends(integer)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_subscription_candidate(uuid, text, uuid)   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_subscription_import_candidates(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_spend_events(integer)            TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_spend_trends(integer)            TO service_role;
GRANT EXECUTE ON FUNCTION public.review_subscription_candidate(uuid, text, uuid)   TO service_role;

-- Folded in from hotfix 20260527114333 — these RPCs are SECURITY DEFINER over the
-- deny-by-default k.* financial tables and must be service_role-only (server-side).
-- Explicitly revoke EXECUTE from anon + authenticated so there is no browser/PostgREST
-- path to candidate/spend data or the review mutation.
REVOKE EXECUTE ON FUNCTION public.get_subscription_import_candidates(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_events(integer)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_trends(integer)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.review_subscription_candidate(uuid, text, uuid)   FROM anon, authenticated;
