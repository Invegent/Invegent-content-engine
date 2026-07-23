-- cc-0049 / F-ONB-ACTIVATE-NOLOGO-1 — normalize logo_extraction_method in activate_client_from_submission
-- PK ruling 2026-07-23: keep {scraped,uploaded,manual}; none/favicon/blank/missing/unsupported -> NULL.
-- Redefines ONLY public.activate_client_from_submission. No constraint/scanner/data change.
-- CREATE OR REPLACE preserves owner (postgres), ACL ({postgres,service_role}=X), SECURITY DEFINER, search_path.
-- Only two expressions change vs the current definition (both logo_extraction_method write paths); everything else is byte-identical.

CREATE OR REPLACE FUNCTION public.activate_client_from_submission(p_submission_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_submission     RECORD;
  v_brand_scan     JSONB;
  v_ai_scan        JSONB;
  v_profile_id     UUID;
  v_result         JSONB;
BEGIN
  SELECT form_data, business_name, website_url
  INTO v_submission
  FROM c.onboarding_submission
  WHERE submission_id = p_submission_id;

  IF v_submission IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Submission not found');
  END IF;

  v_brand_scan := v_submission.form_data -> 'brand_scan_result';
  v_ai_scan    := v_submission.form_data -> 'ai_profile_scan_result';

  INSERT INTO c.client_brand_profile (
    client_id,
    brand_name,
    brand_bio,
    presenter_identity,
    core_expertise,
    audience_description,
    brand_voice_keywords,
    brand_values,
    brand_identity_prompt,
    brand_colour_primary,
    brand_colour_secondary,
    accent_hex,
    brand_logo_url,
    logo_storage_path,
    logo_extraction_method,
    extraction_confidence,
    website_scraped_at,
    is_active,
    version,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_client_id,
    v_submission.business_name,
    v_ai_scan  ->> 'persona_description',
    -- presenter_identity: use persona_description (full persona), not presenter_name
    v_ai_scan  ->> 'persona_description',
    CASE WHEN v_ai_scan -> 'content_topics' IS NOT NULL
      THEN (SELECT STRING_AGG(elem, ', ') FROM
            JSONB_ARRAY_ELEMENTS_TEXT(v_ai_scan -> 'content_topics') WITH ORDINALITY AS t(elem, ord)
            WHERE ord <= 3)
    END,
    NULL,
    CASE WHEN v_ai_scan ->> 'brand_voice' IS NOT NULL
      THEN ARRAY(SELECT TRIM(x) FROM UNNEST(
        STRING_TO_ARRAY(v_ai_scan ->> 'brand_voice', ',')
      ) AS x WHERE TRIM(x) != '')
    END,
    NULL,
    v_ai_scan  ->> 'system_prompt_draft',
    v_brand_scan ->> 'primary_hex',
    v_brand_scan ->> 'secondary_hex',
    v_brand_scan ->> 'accent_hex',
    v_brand_scan ->> 'logo_url',
    v_brand_scan ->> 'logo_storage_path',
    -- cc-0049: allow-list normalize; scraped/uploaded/manual pass through, all else (none/favicon/blank/missing) -> NULL
    CASE WHEN (v_brand_scan ->> 'extraction_method') IN ('scraped', 'uploaded', 'manual')
         THEN (v_brand_scan ->> 'extraction_method')
         ELSE NULL END,
    CASE WHEN v_brand_scan ->> 'confidence' IS NOT NULL
      THEN (v_brand_scan ->> 'confidence')::NUMERIC
    END,
    CASE WHEN v_brand_scan ->> 'scanned_at' IS NOT NULL
      THEN (v_brand_scan ->> 'scanned_at')::TIMESTAMPTZ
    END,
    TRUE,
    1,
    'Created from onboarding submission ' || p_submission_id::TEXT,
    NOW(),
    NOW()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    brand_bio             = EXCLUDED.brand_bio,
    presenter_identity    = EXCLUDED.presenter_identity,
    core_expertise        = EXCLUDED.core_expertise,
    brand_voice_keywords  = EXCLUDED.brand_voice_keywords,
    brand_identity_prompt = EXCLUDED.brand_identity_prompt,
    brand_colour_primary  = EXCLUDED.brand_colour_primary,
    brand_colour_secondary= EXCLUDED.brand_colour_secondary,
    accent_hex            = EXCLUDED.accent_hex,
    brand_logo_url        = EXCLUDED.brand_logo_url,
    logo_storage_path     = EXCLUDED.logo_storage_path,
    -- cc-0049: identical allow-list normalization on the UPDATE path (EXCLUDED is already normalized; re-applied for textual symmetry + edit-safety)
    logo_extraction_method= CASE WHEN EXCLUDED.logo_extraction_method IN ('scraped', 'uploaded', 'manual')
                                 THEN EXCLUDED.logo_extraction_method
                                 ELSE NULL END,
    extraction_confidence = EXCLUDED.extraction_confidence,
    website_scraped_at    = EXCLUDED.website_scraped_at,
    is_active             = TRUE,
    version               = c.client_brand_profile.version + 1,
    updated_at            = NOW()
  RETURNING client_brand_profile_id INTO v_profile_id;

  UPDATE c.onboarding_submission
  SET status      = 'approved',
      reviewed_by = 'operator',
      reviewed_at = NOW(),
      updated_at  = NOW()
  WHERE submission_id = p_submission_id;

  v_result := jsonb_build_object(
    'ok',               TRUE,
    'client_id',        p_client_id,
    'profile_id',       v_profile_id,
    'brand_name',       v_submission.business_name,
    'brand_scan_found', v_brand_scan IS NOT NULL,
    'ai_scan_found',    v_ai_scan IS NOT NULL
  );

  RETURN v_result;
END;
$function$;
