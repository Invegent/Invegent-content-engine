-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; not intended for replay.
-- T3 chain: db-rls-auditor pass · external review 85f59237 (agree) · forward.sql sha256 66b9ea16.
--
-- cc-0044 Checkpoint E · Step 2 — dark scope-only convergence (V-A, staged)
-- Migration identity: 20260720040000_video_c11bb8ab_scope_client_to_generic_v1
--
-- WHAT: flip the canonical c11bb8ab video registry row (a3d8472d) from client-scoped(PP) to
-- generic, client_id -> NULL. c11bb8ab must have ONE canonical registry identity shared through
-- client assignments (UNIQUE(provider, provider_template_id) forbids a duplicate row) — this is the
-- correct architecture the constraint reveals.
-- DARK: does NOT add a Background field, does NOT create an NDIS assignment or proof. PP keeps its
-- baked background and continues to select the SAME template via its own (unchanged) assignment;
-- NDIS moves only from wrong_scope -> no_assignment (still fail_closed, cannot select video).

BEGIN;

UPDATE c.creative_provider_template
   SET scope      = 'generic',
       client_id  = NULL,
       updated_at = now()
 WHERE id                   = 'a3d8472d-9438-4312-9f11-b6a920be4014'
   AND provider             = 'creatomate'
   AND provider_template_id = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab'
   AND scope                = 'client'
   AND client_id            = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

-- Fail-closed postcondition: exactly ONE row for a3d8472d, now generic + client_id IS NULL.
-- (Idempotent-safe: a re-run finds the row already generic and still asserts count=1.)
DO $$
BEGIN
  IF (SELECT count(*) FROM c.creative_provider_template
        WHERE id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
          AND scope = 'generic'
          AND client_id IS NULL) <> 1 THEN
    RAISE EXCEPTION 'cc0044_cpE_step2 scope_flip_postcondition_failed (expected exactly 1 generic/null a3d8472d row)';
  END IF;
END $$;

COMMIT;
