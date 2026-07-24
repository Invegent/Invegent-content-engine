-- NOT_APPLIED_cc0080_reconcile_publish_status_v2.sql
-- =====================================================================
-- cc-0080 — PUBLISH-STATUS RECONCILER  (author-only artifact — NOT APPLIED)
-- v2 — supersedes v1 after independent Gate-1 review returned `concerns`.
-- =====================================================================
-- STATUS: NOT YET APPLIED. Apply is HARD-BLOCKED pending PK's apply gate AND
--   the segregation-of-duties control (approve-by-exact-SHA + explicit target-
--   project binding, applied by a hand that did not author/review this file).
--   The filename is deliberately NOT a valid timestamped migration name so no
--   apply tool can sweep it up; the apply lane renames it to a real identity.
--
-- v2 CHANGE LOG (all six review findings; each verified live before encoding):
--   [MUST-3a] Queue predicate was a DENY-list (`status NOT IN ('published')`),
--     asymmetric with R2/R3 and — under drift — would flip deliberately-killed
--     rows to 'published' (live vocabulary: dead=464, purged=137, skipped=32,
--     queued=26, failed=15). NOW AN EXPLICIT ALLOW-LIST: ('queued','failed'),
--     mirroring R2. dead/purged/skipped are never advanced.
--   [MUST-3b] Rollback was LOSSY. Verified: trigger tr_publish_queue_reset_on_
--     success_v1 (BEFORE UPDATE OF status) sets last_error, last_error_code,
--     last_error_subcode, last_error_at := NULL and err_368_streak := 0 on any
--     status->'published' transition. The v1 ledger recorded only 'status', so
--     those five could not be restored. NOW all six columns are audited and
--     restored. audit.new_value is nullable (NULL = "column cleared").
--   [SHOULD] Slot advance had no draft-state guard. Review said "3 of 755 belong
--     to dead/rejected/voided drafts"; the COUNT is right, the LABEL is not —
--     live verification shows the 755 candidates are approval_status published
--     390 / approved 362 / **draft 3**, and ZERO dead/rejected/voided. The 3 are
--     LinkedIn slots at slot.status='failed' whose draft never left 'draft' yet
--     has a published post_publish (an anomaly in its own right). A deny-list on
--     dead/rejected/voided would therefore have caught NOTHING (verified: 755
--     unchanged) — the same deny-list anti-pattern MUST-3a flags. NOW AN
--     ALLOW-LIST: the draft must be IN ('approved','published'). Verified cohort
--     755 -> 752, matching the reviewer's expected number. This matters because
--     m.handle_draft_rejection only re-fills `WHERE status NOT IN ('skipped',
--     'published')`, so advancing a slot PERMANENTLY forecloses its re-fill.
--   [SHOULD] R3 used a pre-UPDATE count CTE with no DISTINCT (duplicate pp rows
--     on one platform would fan out the count AND write duplicate audit rows).
--     NOW DISTINCT ON (post_draft_id) + GET DIAGNOSTICS, consistent with R2/R4.
--   [SHOULD] search_path hardened to '' (house form). All refs are schema-
--     qualified; gen_random_uuid()/now() are pg_catalog builtins (implicitly
--     searched), so '' is safe.
--   [SHOULD] R7 corrected: NO service_role grant is issued — the function is
--     OWNER-ONLY by design (one-shot backfill run by the SoD apply hand). The
--     v1 header claim "service_role invokes" was false. A scheduled sweep would
--     need a deliberate, separately-gated GRANT.
--   [SHOULD] RLS ENABLEd on the audit table for posture parity with the three
--     audited tables (all relrowsecurity=true). FORCE is deliberately NOT used:
--     FORCE would apply RLS to the owner too and block this SECURITY DEFINER
--     function's own INSERTs. ENABLE + no policy = non-owner denied, definer OK.
--
-- DISCLOSED FORWARD COUPLING (not fixed here — needs a paired publisher lane):
--   BOTH LinkedIn publishers gate `if (draft.approval_status !== 'approved')`
--   (linkedin-publisher:97, linkedin-zapier-publisher:175) and do NOT accept
--   'published' — unlike youtube-publisher:262 (`.in('approval_status',
--   ['approved','published'])`). After this reconciler advances the 308 LI
--   drafts to 'published', any FUTURE re-queue of one of them soft-fails and
--   re-queues every 60 min (`not_approved:published`) instead of duplicate-
--   posting. Safe (no duplicate post) but it burns queue ticks. Either pair a
--   publisher change mirroring youtube-publisher:262, or accept and monitor.
--
-- GROUND TRUTH (live reads, project mbkmaxqhsohbtwsqolns; counts in the packet):
--   * 28 drafts have a published post_publish on TWO platforms -> approval_status
--     is a WHOLE-DRAFT column, not per-platform.
--   * 155 published rows have post_publish.platform <> post_draft.platform -> key
--     on pp.platform ALWAYS; pd.platform appears in NO advance predicate.
--   * ~140 drafts are dead/rejected/draft yet carry a published post_publish.
--     Advancing them would RESURRECT killed content. Never auto-written.
--   * YouTube publishes OFF-QUEUE and uses approval_status as CROSS-platform
--     state with video_status as its per-platform marker -> approval_status is
--     NEVER written for a youtube publish (144 excluded, counted).
--
-- INVARIANTS (fail-closed):
--   R1  post_publish.status='published' is the ONLY trigger of any advance.
--   R2  slot.status: allow-list {filled,failed} -> 'published', per pp.platform,
--       AND the draft's approval_status must be in the ALLOW-list
--       {approved,published}. No deny-lists anywhere in this function.
--   R3  approval_status: ONLY 'approved' -> 'published', ONLY single-platform
--       drafts, ONLY platform <> 'youtube'. One row per draft (DISTINCT ON).
--   R4  queue.status: allow-list {queued,failed} -> 'published', ONLY for
--       queue-consuming platforms (facebook/instagram/linkedin). YouTube queue
--       rows are orphans (off-queue) -> never written, only counted.
--   R5  Every write is preceded by audit rows (old->new, batch_id) enabling
--       exact rollback. Dry-run writes NOTHING.
--   R6  Idempotent: post-advance the predicates no longer match -> re-run = 0.
--   R7  SECURITY DEFINER, owner postgres, search_path ''. OWNER-ONLY: EXECUTE
--       revoked from PUBLIC/anon/authenticated and NOT granted to service_role.
--
-- OUT OF SCOPE: any publisher/transport change; re-send; fabricating a
--   post_publish row; the ~140 negative-terminal anomalies (manual review); the
--   15 Instagram 'failed' queue rows with NO matching published post_publish
--   (distinct "post_publish-missing" sub-case); cc-0079 format path.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Audit table — rollback ledger. One row per (entity, column) advanced.
-- new_value is NULLABLE: NULL records "the trigger cleared this column".
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m.publish_status_reconcile_audit (
  audit_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid        NOT NULL,
  entity          text        NOT NULL CHECK (entity IN ('slot','draft','queue')),
  entity_id       uuid        NOT NULL,
  column_name     text        NOT NULL,
  old_value       text,
  new_value       text,                      -- nullable: NULL = column cleared
  platform        text,
  post_publish_id uuid,
  reconciled_at   timestamptz NOT NULL DEFAULT now(),
  reconciled_by   text        NOT NULL DEFAULT 'reconcile_publish_status_v2'
);
CREATE INDEX IF NOT EXISTS ix_psra_batch ON m.publish_status_reconcile_audit (batch_id, entity);
REVOKE ALL ON m.publish_status_reconcile_audit FROM PUBLIC, anon, authenticated;
-- Posture parity with the audited tables. ENABLE only, NOT FORCE: FORCE would
-- apply RLS to the owner and block this SECURITY DEFINER function's INSERTs.
ALTER TABLE m.publish_status_reconcile_audit ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- m.reconcile_publish_status(p_dry_run, p_platform, p_batch_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.reconcile_publish_status(
  p_dry_run  boolean DEFAULT true,
  p_platform text    DEFAULT NULL,
  p_batch_id uuid    DEFAULT gen_random_uuid()
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_slot_adv   integer := 0;
  v_draft_adv  integer := 0;
  v_queue_adv  integer := 0;
  v_anom_neg   integer := 0;
  v_anom_ytq   integer := 0;
  v_anom_multi integer := 0;
  v_anom_slotneg integer := 0;
BEGIN
  -- ===== ANOMALY COUNTS (never written; computed in both modes) =====
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
  FROM (SELECT pp.post_draft_id FROM m.post_publish pp WHERE pp.status='published'
        GROUP BY pp.post_draft_id HAVING count(DISTINCT pp.platform) > 1) m2;

  -- slots skipped by the new negative-terminal guard (disclosed, not written)
  SELECT count(*) INTO v_anom_slotneg
  FROM m.slot s
  JOIN m.post_draft pd ON pd.post_draft_id = s.filled_draft_id
  WHERE s.status IN ('filled','failed')
    AND pd.approval_status NOT IN ('approved','published')
    AND (p_platform IS NULL OR s.platform = p_platform)
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');

  -- ===== R2  SLOT: {filled,failed} -> published, draft not negative-terminal ==
  IF NOT p_dry_run THEN
    INSERT INTO m.publish_status_reconcile_audit
      (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
    SELECT DISTINCT ON (s.slot_id)
           p_batch_id, 'slot', s.slot_id, 'status', s.status, 'published', s.platform, pp.post_publish_id
    FROM m.slot s
    JOIN m.post_draft pd ON pd.post_draft_id = s.filled_draft_id
    JOIN m.post_publish pp
      ON pp.post_draft_id = s.filled_draft_id AND pp.platform = s.platform AND pp.status='published'
    WHERE s.status IN ('filled','failed')
      AND pd.approval_status IN ('approved','published')
      AND (p_platform IS NULL OR s.platform = p_platform)
    ORDER BY s.slot_id, pp.post_publish_id;

    UPDATE m.slot s SET status='published', updated_at=now()
    WHERE s.status IN ('filled','failed')
      AND (p_platform IS NULL OR s.platform = p_platform)
      AND EXISTS (SELECT 1 FROM m.post_draft pd
                  WHERE pd.post_draft_id=s.filled_draft_id
                    AND pd.approval_status IN ('approved','published'))
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');
    GET DIAGNOSTICS v_slot_adv = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_slot_adv
    FROM m.slot s
    WHERE s.status IN ('filled','failed')
      AND (p_platform IS NULL OR s.platform = p_platform)
      AND EXISTS (SELECT 1 FROM m.post_draft pd
                  WHERE pd.post_draft_id=s.filled_draft_id
                    AND pd.approval_status IN ('approved','published'))
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');
  END IF;

  -- ===== R3  approval_status: approved -> published, single-platform, non-YT ==
  IF NOT p_dry_run THEN
    INSERT INTO m.publish_status_reconcile_audit
      (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
    SELECT DISTINCT ON (pd.post_draft_id)
           p_batch_id, 'draft', pd.post_draft_id, 'approval_status', pd.approval_status,
           'published', pp.platform, pp.post_publish_id
    FROM m.post_draft pd
    JOIN (SELECT pp2.post_draft_id FROM m.post_publish pp2 WHERE pp2.status='published'
          GROUP BY pp2.post_draft_id HAVING count(DISTINCT pp2.platform)=1) single
      ON single.post_draft_id = pd.post_draft_id
    JOIN m.post_publish pp ON pp.post_draft_id=pd.post_draft_id AND pp.status='published'
    WHERE pd.approval_status='approved'
      AND pp.platform <> 'youtube'
      AND (p_platform IS NULL OR pp.platform=p_platform)
    ORDER BY pd.post_draft_id, pp.post_publish_id;

    UPDATE m.post_draft pd SET approval_status='published', updated_at=now()
    WHERE pd.approval_status='approved'
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=pd.post_draft_id AND pp.status='published'
                    AND pp.platform <> 'youtube'
                    AND (p_platform IS NULL OR pp.platform=p_platform))
      AND EXISTS (SELECT 1 FROM (SELECT pp2.post_draft_id FROM m.post_publish pp2
                                 WHERE pp2.status='published' GROUP BY pp2.post_draft_id
                                 HAVING count(DISTINCT pp2.platform)=1) s2
                  WHERE s2.post_draft_id=pd.post_draft_id);
    GET DIAGNOSTICS v_draft_adv = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_draft_adv
    FROM m.post_draft pd
    WHERE pd.approval_status='approved'
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=pd.post_draft_id AND pp.status='published'
                    AND pp.platform <> 'youtube'
                    AND (p_platform IS NULL OR pp.platform=p_platform))
      AND EXISTS (SELECT 1 FROM (SELECT pp2.post_draft_id FROM m.post_publish pp2
                                 WHERE pp2.status='published' GROUP BY pp2.post_draft_id
                                 HAVING count(DISTINCT pp2.platform)=1) s2
                  WHERE s2.post_draft_id=pd.post_draft_id);
  END IF;

  -- ===== R4  QUEUE: ALLOW-LIST {queued,failed}, queue-consuming platforms only =
  -- Audits all SIX columns the reset trigger touches so rollback is complete.
  IF NOT p_dry_run THEN
    INSERT INTO m.publish_status_reconcile_audit
      (batch_id, entity, entity_id, column_name, old_value, new_value, platform, post_publish_id)
    SELECT p_batch_id, 'queue', e.queue_id, col.name, col.oldval,
           CASE WHEN col.name='status' THEN 'published' ELSE NULL END,
           e.platform, e.post_publish_id
    FROM (
      SELECT DISTINCT ON (q.queue_id)
             q.queue_id, q.platform, q.status, q.last_error, q.last_error_code,
             q.last_error_subcode, q.last_error_at, q.err_368_streak, pp.post_publish_id
      FROM m.post_publish_queue q
      JOIN m.post_publish pp
        ON pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published'
      WHERE q.platform IN ('facebook','instagram','linkedin')
        AND q.status IN ('queued','failed')
        AND (p_platform IS NULL OR q.platform=p_platform)
      ORDER BY q.queue_id, pp.post_publish_id
    ) e
    CROSS JOIN LATERAL (VALUES
      ('status',             e.status),
      ('last_error',         e.last_error),
      ('last_error_code',    e.last_error_code::text),
      ('last_error_subcode', e.last_error_subcode::text),
      ('last_error_at',      e.last_error_at::text),
      ('err_368_streak',     e.err_368_streak::text)
    ) AS col(name, oldval);

    UPDATE m.post_publish_queue q SET status='published', updated_at=now()
    WHERE q.platform IN ('facebook','instagram','linkedin')
      AND q.status IN ('queued','failed')
      AND (p_platform IS NULL OR q.platform=p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published');
    GET DIAGNOSTICS v_queue_adv = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_queue_adv
    FROM m.post_publish_queue q
    WHERE q.platform IN ('facebook','instagram','linkedin')
      AND q.status IN ('queued','failed')
      AND (p_platform IS NULL OR q.platform=p_platform)
      AND EXISTS (SELECT 1 FROM m.post_publish pp
                  WHERE pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published');
  END IF;

  RETURN jsonb_build_object(
    'version', 'v2',
    'dry_run', p_dry_run,
    'batch_id', CASE WHEN p_dry_run THEN NULL ELSE p_batch_id END,
    'platform_filter', p_platform,
    'slot_advanced', v_slot_adv,
    'draft_approval_advanced', v_draft_adv,
    'queue_advanced', v_queue_adv,
    'anomaly_negative_terminal_with_publish', v_anom_neg,
    'anomaly_slot_negative_terminal_skipped', v_anom_slotneg,
    'anomaly_youtube_orphan_queue', v_anom_ytq,
    'anomaly_multiplatform_drafts', v_anom_multi,
    'youtube_approval_status', 'never_written_by_design',
    'queue_predicate', 'allow_list_queued_failed',
    'ran_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM authenticated;
-- R7: NO service_role grant. Owner-only by design (one-shot SoD-gated backfill).


-- ---------------------------------------------------------------------
-- ROLLBACK — restores every audited column, fail-closed per row.
-- Note: setting status away from 'published' does NOT re-fire the reset
-- trigger (it fires only on a transition TO 'published'), so the restored
-- error columns persist.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.rollback_publish_status_reconcile(p_batch_id uuid)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_slot int:=0; v_draft int:=0; v_queue int:=0;
BEGIN
  UPDATE m.slot s SET status=a.old_value, updated_at=now()
  FROM m.publish_status_reconcile_audit a
  WHERE a.batch_id=p_batch_id AND a.entity='slot' AND a.column_name='status'
    AND a.entity_id=s.slot_id AND s.status=a.new_value;
  GET DIAGNOSTICS v_slot = ROW_COUNT;

  UPDATE m.post_draft pd SET approval_status=a.old_value, updated_at=now()
  FROM m.publish_status_reconcile_audit a
  WHERE a.batch_id=p_batch_id AND a.entity='draft' AND a.column_name='approval_status'
    AND a.entity_id=pd.post_draft_id AND pd.approval_status=a.new_value;
  GET DIAGNOSTICS v_draft = ROW_COUNT;

  WITH qa AS (
    SELECT a.entity_id,
      max(a.old_value) FILTER (WHERE a.column_name='status')             AS status,
      max(a.old_value) FILTER (WHERE a.column_name='last_error')         AS last_error,
      max(a.old_value) FILTER (WHERE a.column_name='last_error_code')    AS last_error_code,
      max(a.old_value) FILTER (WHERE a.column_name='last_error_subcode') AS last_error_subcode,
      max(a.old_value) FILTER (WHERE a.column_name='last_error_at')      AS last_error_at,
      max(a.old_value) FILTER (WHERE a.column_name='err_368_streak')     AS err_368_streak
    FROM m.publish_status_reconcile_audit a
    WHERE a.batch_id=p_batch_id AND a.entity='queue'
    GROUP BY a.entity_id
  )
  UPDATE m.post_publish_queue q SET
    status             = qa.status,
    last_error         = qa.last_error,
    last_error_code    = qa.last_error_code::int,
    last_error_subcode = qa.last_error_subcode::int,
    last_error_at      = qa.last_error_at::timestamptz,
    err_368_streak     = COALESCE(qa.err_368_streak::int, 0),
    updated_at         = now()
  FROM qa
  WHERE q.queue_id = qa.entity_id AND q.status = 'published';
  GET DIAGNOSTICS v_queue = ROW_COUNT;

  RETURN jsonb_build_object('version','v2','batch_id',p_batch_id,'slot_restored',v_slot,
                            'draft_restored',v_draft,'queue_restored',v_queue,'ran_at',now());
END;
$$;
REVOKE EXECUTE ON FUNCTION m.rollback_publish_status_reconcile(uuid) FROM PUBLIC, anon, authenticated;
-- END NOT_APPLIED_cc0080_reconcile_publish_status_v2.sql
