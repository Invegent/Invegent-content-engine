-- =====================================================================
-- MOVED OUT OF THE MIGRATION DISCOVERY PATH (2026-08-07) -- STILL NOT APPLIED
-- =====================================================================
-- ORIGINAL PATH : supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v1.sql
-- CLASS         : UNAPPLIED EXECUTABLE RISK (self-declared; author already chose a
--                 non-timestamped filename so an apply tool would not sweep it --
--                 that mitigation is preserved, this move adds directory isolation)
-- LEDGER STATUS : not applied under any identity (verified live 2026-08-07).
--
-- Contains DDL *and* DML machinery: creates m.publish_status_reconcile_audit and
-- m.reconcile_publish_status(...) which WRITES to m.slot, m.post_draft and
-- m.post_publish_queue. Its apply gate and segregation-of-duties control are
-- unchanged and still owed.
--
-- RELATIONSHIP TO THE CURRENT PUBLISH-TRUTH ARC (do not conflate):
--   This is the cc-0080 RECONCILER (mutates lagging status surfaces).
--   The 2026-08-07 publish-truth Task-2 artifact is a DIFFERENT, ADDITIVE, READ-ONLY
--   pair -- ice_ro.publish_status_v2 + public.get_publish_status_v2() -- on branch
--   worktree-agent-a8016aefa5cab42d1 @ a45f7a3 (blobs 300c337f / ef11a8fc).
--   Neither supersedes the other; PK has approved neither for apply.
--
-- DO NOT RESTORE to supabase/migrations/. DO NOT EXECUTE.
-- BODY BELOW IS BYTE-IDENTICAL TO THE ORIGINAL.
-- =====================================================================

-- NOT_APPLIED_cc0080_reconcile_publish_status_v1.sql
-- =====================================================================
-- cc-0080 — PUBLISH-STATUS RECONCILER  (author-only artifact — NOT APPLIED)
-- =====================================================================
-- STATUS: NOT YET APPLIED. Read-only-authored under the cc-0080 Gate-1 lane.
--   Apply is HARD-BLOCKED pending PK's apply gate AND the segregation-of-duties
--   control (approve-by-exact-SHA + explicit target-project binding, applied by
--   a hand that did not author/review this file). This file name is deliberately
--   NOT a valid timestamped migration name so it cannot be swept up by an apply
--   tool by accident; the apply lane renames it to a real migration identity.
--
-- PURPOSE: make m.post_publish (the authoritative publication record, written by
--   ALL six publishers) the source of truth, and advance the LAGGING internal
--   status surfaces (m.slot.status, m.post_draft.approval_status,
--   m.post_publish_queue.status) to agree with it — idempotently, fail-closed,
--   and WITHOUT touching any publisher transport.
--
-- GROUND TRUTH THIS DESIGN IS BUILT ON (live reads 2026-07-24, project
--   mbkmaxqhsohbtwsqolns; full dry-run counts in the Gate-1 packet):
--   * 28 drafts have a published post_publish on TWO distinct platforms — so
--     approval_status is a genuine WHOLE-DRAFT column, NOT per-platform.
--   * 155 published rows have post_publish.platform <> post_draft.platform — so
--     the reconciler MUST key on pp.platform (publish truth), never pd.platform.
--   * ~140 drafts are approval_status IN ('dead','rejected','draft') yet carry a
--     published post_publish row. Advancing those to 'published' would RESURRECT
--     deliberately-killed content. THEY ARE NEVER AUTO-WRITTEN — only surfaced.
--   * YouTube publishes OFF-QUEUE and treats approval_status as CROSS-platform
--     state, using video_status as its per-platform marker. The reconciler NEVER
--     writes approval_status for a youtube publish.
--
-- INVARIANTS (fail-closed):
--   R1  post_publish.status='published' is the ONLY trigger of any advance.
--   R2  slot.status: advance {filled,failed} -> 'published' when a published
--       post_publish exists for THAT slot's platform. Never advances 'skipped'
--       or any state not in the allow-list (ambiguous -> skip+count).
--   R3  approval_status: advance ONLY 'approved' -> 'published', AND ONLY when
--       the draft is SINGLE-PLATFORM (exactly one distinct published platform)
--       AND that platform <> 'youtube'. Every other current status is SKIPPED
--       and counted as an anomaly. YouTube is never touched here.
--   R4  post_publish_queue: only QUEUE-CONSUMING platforms are reconciled
--       (facebook/instagram/linkedin). YouTube queue rows are ORPHAN (off-queue)
--       -> never written, only counted. A queue row is advanced to 'published'
--       ONLY if a published post_publish exists for (post_draft_id, platform).
--   R5  Every write is preceded by an audit row (old->new) in
--       m.publish_status_reconcile_audit, stamped with p_batch_id, enabling
--       exact rollback. Dry-run writes NOTHING (audit or target).
--   R6  Idempotent: after an apply, the WHERE predicates no longer match the
--       advanced rows, so a re-run touches 0 rows (proven in the harness).
--   R7  SECURITY DEFINER, owner postgres, SET search_path — least privilege;
--       EXECUTE revoked from PUBLIC/anon/authenticated (service_role invokes).
--
-- OUT OF SCOPE (do NOT add here): any publisher/transport change; re-send;
--   fabricating a post_publish row; the ~140 negative-terminal anomalies (manual
--   review); the 15 Instagram 'failed' queue rows that have NO matching published
--   post_publish (a distinct "post_publish-missing" sub-case); cc-0079 format path.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Audit table — rollback ledger. One row per status advance.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m.publish_status_reconcile_audit (
  audit_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid        NOT NULL,
  entity          text        NOT NULL CHECK (entity IN ('slot','draft','queue')),
  entity_id       uuid        NOT NULL,
  column_name     text        NOT NULL,
  old_value       text,
  new_value       text        NOT NULL,
  platform        text,
  post_publish_id uuid,            -- the truth row that justified the advance
  reconciled_at   timestamptz NOT NULL DEFAULT now(),
  reconciled_by   text        NOT NULL DEFAULT 'reconcile_publish_status_v1'
);
REVOKE ALL ON m.publish_status_reconcile_audit FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------
-- m.reconcile_publish_status(p_dry_run, p_platform, p_batch_id)
--   p_dry_run  DEFAULT true  -> counts ONLY, zero writes (audit or target).
--   p_platform DEFAULT NULL  -> all platforms; else restrict to one.
--   p_batch_id DEFAULT gen_random_uuid() -> rollback handle (apply mode only).
-- Returns jsonb: would/did-advance counts per surface + anomaly counts + batch.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.reconcile_publish_status(
  p_dry_run  boolean DEFAULT true,
  p_platform text    DEFAULT NULL,
  p_batch_id uuid    DEFAULT gen_random_uuid()
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_slot_adv    integer := 0;
  v_draft_adv   integer := 0;
  v_queue_adv   integer := 0;
  v_anom_neg    integer := 0;   -- dead/rejected/draft/voided WITH a published row
  v_anom_ytq    integer := 0;   -- youtube orphan queue rows
  v_anom_multi  integer := 0;   -- multi-platform drafts (approval handled per-platform-safe)
BEGIN
  -- ===== ANOMALY COUNTS (never written; always computed, both modes) =====
  SELECT count(*) INTO v_anom_neg
  FROM m.post_draft pd
  WHERE pd.approval_status IN ('dead','rejected','voided','draft')
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=pd.post_draft_id AND pp.status='published'
                  AND (p_platform IS NULL OR pp.platform=p_platform));

  SELECT count(*) INTO v_anom_ytq
  FROM m.post_publish_queue q
  WHERE q.platform='youtube' AND q.status <> 'published'
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=q.post_draft_id AND pp.platform='youtube' AND pp.status='published');

  SELECT count(*) INTO v_anom_multi
  FROM (SELECT post_draft_id FROM m.post_publish WHERE status='published'
        GROUP BY post_draft_id HAVING count(DISTINCT platform) > 1) m2;

  -- ===== R2  SLOT advance {filled,failed} -> published (per pp.platform) =====
  IF NOT p_dry_run THEN
    INSERT INTO m.publish_status_reconcile_audit
      (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
    SELECT p_batch_id, 'slot', s.slot_id, 'status', s.status, 'published', s.platform, pp.post_publish_id
    FROM m.slot s
    JOIN m.post_publish pp
      ON pp.post_draft_id = s.filled_draft_id AND pp.platform = s.platform AND pp.status='published'
    WHERE s.status IN ('filled','failed')
      AND (p_platform IS NULL OR s.platform = p_platform);

    UPDATE m.slot s SET status='published', updated_at=now()
    WHERE s.status IN ('filled','failed')
      AND (p_platform IS NULL OR s.platform = p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');
    GET DIAGNOSTICS v_slot_adv = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_slot_adv
    FROM m.slot s
    WHERE s.status IN ('filled','failed')
      AND (p_platform IS NULL OR s.platform = p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');
  END IF;

  -- ===== R3  approval_status advance: approved -> published, single-platform,
  --           platform <> youtube. Nothing else. =====
  WITH single AS (
    SELECT post_draft_id FROM m.post_publish WHERE status='published'
    GROUP BY post_draft_id HAVING count(DISTINCT platform)=1
  ),
  eligible AS (
    SELECT pd.post_draft_id, pp.platform, pp.post_publish_id
    FROM m.post_draft pd
    JOIN single ON single.post_draft_id=pd.post_draft_id
    JOIN m.post_publish pp ON pp.post_draft_id=pd.post_draft_id AND pp.status='published'
    WHERE pd.approval_status='approved'
      AND pp.platform <> 'youtube'
      AND (p_platform IS NULL OR pp.platform=p_platform)
  )
  SELECT count(*) INTO v_draft_adv FROM eligible;

  IF NOT p_dry_run AND v_draft_adv > 0 THEN
    WITH single AS (
      SELECT post_draft_id FROM m.post_publish WHERE status='published'
      GROUP BY post_draft_id HAVING count(DISTINCT platform)=1
    ),
    eligible AS (
      SELECT pd.post_draft_id, pp.platform, pd.approval_status AS old_status, pp.post_publish_id
      FROM m.post_draft pd
      JOIN single ON single.post_draft_id=pd.post_draft_id
      JOIN m.post_publish pp ON pp.post_draft_id=pd.post_draft_id AND pp.status='published'
      WHERE pd.approval_status='approved' AND pp.platform <> 'youtube'
        AND (p_platform IS NULL OR pp.platform=p_platform)
    ),
    ins AS (
      INSERT INTO m.publish_status_reconcile_audit
        (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
      SELECT p_batch_id, 'draft', post_draft_id, 'approval_status', old_status, 'published', platform, post_publish_id
      FROM eligible
      RETURNING entity_id
    )
    UPDATE m.post_draft pd SET approval_status='published', updated_at=now()
    FROM eligible e WHERE pd.post_draft_id=e.post_draft_id AND pd.approval_status='approved';
  END IF;

  -- ===== R4  QUEUE advance for queue-consuming platforms only (never youtube) =====
  IF NOT p_dry_run THEN
    INSERT INTO m.publish_status_reconcile_audit
      (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
    SELECT p_batch_id, 'queue', q.queue_id, 'status', q.status, 'published', q.platform, pp.post_publish_id
    FROM m.post_publish_queue q
    JOIN m.post_publish pp ON pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published'
    WHERE q.platform IN ('facebook','instagram','linkedin')
      AND q.status NOT IN ('published')
      AND (p_platform IS NULL OR q.platform=p_platform);

    UPDATE m.post_publish_queue q SET status='published', updated_at=now()
    WHERE q.platform IN ('facebook','instagram','linkedin')
      AND q.status NOT IN ('published')
      AND (p_platform IS NULL OR q.platform=p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published');
    GET DIAGNOSTICS v_queue_adv = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_queue_adv
    FROM m.post_publish_queue q
    WHERE q.platform IN ('facebook','instagram','linkedin')
      AND q.status NOT IN ('published')
      AND (p_platform IS NULL OR q.platform=p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published');
  END IF;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'batch_id', CASE WHEN p_dry_run THEN NULL ELSE p_batch_id END,
    'platform_filter', p_platform,
    'slot_advanced', v_slot_adv,
    'draft_approval_advanced', v_draft_adv,
    'queue_advanced', v_queue_adv,
    'anomaly_negative_terminal_with_publish', v_anom_neg,
    'anomaly_youtube_orphan_queue', v_anom_ytq,
    'anomaly_multiplatform_drafts', v_anom_multi,
    'youtube_approval_status', 'never_written_by_design',
    'ran_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM authenticated;


-- ---------------------------------------------------------------------
-- ROLLBACK — restore prior status for a batch. Idempotent; verifies current
-- value is the one the batch wrote before restoring (fail-closed: skips a row
-- that has since changed, so a later legitimate write is never clobbered).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.rollback_publish_status_reconcile(p_batch_id uuid)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_slot int:=0; v_draft int:=0; v_queue int:=0;
BEGIN
  UPDATE m.slot s SET status=a.old_value, updated_at=now()
  FROM m.publish_status_reconcile_audit a
  WHERE a.batch_id=p_batch_id AND a.entity='slot' AND a.entity_id=s.slot_id
    AND s.status=a.new_value;                    -- only if still the value we wrote
  GET DIAGNOSTICS v_slot = ROW_COUNT;

  UPDATE m.post_draft pd SET approval_status=a.old_value, updated_at=now()
  FROM m.publish_status_reconcile_audit a
  WHERE a.batch_id=p_batch_id AND a.entity='draft' AND a.entity_id=pd.post_draft_id
    AND pd.approval_status=a.new_value;
  GET DIAGNOSTICS v_draft = ROW_COUNT;

  UPDATE m.post_publish_queue q SET status=a.old_value, updated_at=now()
  FROM m.publish_status_reconcile_audit a
  WHERE a.batch_id=p_batch_id AND a.entity='queue' AND a.entity_id=q.queue_id
    AND q.status=a.new_value;
  GET DIAGNOSTICS v_queue = ROW_COUNT;

  RETURN jsonb_build_object('batch_id',p_batch_id,'slot_restored',v_slot,
                            'draft_restored',v_draft,'queue_restored',v_queue,'ran_at',now());
END;
$$;
REVOKE EXECUTE ON FUNCTION m.rollback_publish_status_reconcile(uuid) FROM PUBLIC, anon, authenticated;
-- END NOT_APPLIED_cc0080_reconcile_publish_status_v1.sql
