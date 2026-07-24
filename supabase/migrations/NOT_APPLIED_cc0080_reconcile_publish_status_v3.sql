-- NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql
-- =====================================================================
-- cc-0080 — PUBLISH-STATUS RECONCILER, TWO-SURFACE  (author-only — NOT APPLIED)
-- v3 — supersedes v2 (sha d227fefc…). PK Rulings A and B.
-- =====================================================================
-- STATUS: NOT YET APPLIED. Apply is HARD-BLOCKED pending (1) a focused
--   re-review of this delta, (2) a branch rehearsal under the SAME frozen
--   execution model as the apply (§EXEC), and (3) PK re-opening the SoD gate.
--   Filename is deliberately NOT a timestamped migration name so no apply tool
--   sweeps it up; the apply lane renames it to a real identity.
--
-- THE PIN CHANGES ON PURPOSE. v2's pin d227fefc… is DEAD, and the delta review
--   plus S9's independent verification against it are VOID. That is the
--   authorised outcome of Ruling B — dead logic was NOT retained merely to
--   preserve a pin. A pin that survives by carrying dormant risk is worse than
--   a new pin honestly earned.
--
-- ── RULING B — QUEUE SURFACE REMOVED FROM SCOPE ─────────────────────────────
--   The queue advance, its six-column audit, and its rollback branch are GONE.
--   Rationale (verified live): m.cleanup_queue_on_publish_v1 DELETEs the queue
--   row when a published m.post_publish row is inserted, so "a queued/failed
--   queue row that has a matching published post_publish" is structurally
--   impossible. Live cohort = 0. (This is also what explains the 68 LinkedIn
--   published records whose queue_id no longer resolves.) Dormant, unexercised
--   machinery carrying a KNOWN-UNFAITHFUL rollback added risk with no benefit.
--
--   ►► FUTURE CONTRACT — DO NOT REDISCOVER THIS FROM SCRATCH ◄◄
--   Queue reconciliation becomes REQUIRED AGAIN if, and only if, queue
--   RETENTION changes — i.e. if m.cleanup_queue_on_publish_v1 stops deleting
--   the row on publish, or any path begins retaining queued/failed rows past a
--   successful publish. Trigger indicator: the read-only counter
--   `anomaly_queue_rows_with_published_publish` in this function's return
--   becomes NON-ZERO. When it does, the future lane must re-establish, at
--   minimum:
--     (a) an ALLOW-LIST predicate {queued,failed} — never a deny-list; live
--         vocabulary includes dead/purged/skipped which must never be advanced;
--     (b) a SIX-COLUMN audit (status, last_error, last_error_code,
--         last_error_subcode, last_error_at, err_368_streak) because
--         tr_publish_queue_reset_on_success_v1 clears five of them on
--         status->'published';
--     (c) a resolution for tg_publish_queue_backoff_368_v1, which RE-FIRES when
--         a rollback restores last_error (its guard old IS DISTINCT FROM new is
--         satisfied by construction), re-clobbering four audited columns and
--         mutating UN-AUDITED scheduled_for, and at err_368_streak>=3 writing
--         c.client_publish_profile (paused_until/paused_reason/paused_at) —
--         OUTSIDE the declared blast radius;
--     (d) PK's standing ruling that a tripped queue STOP is TERMINAL —
--         FREEZE and re-review, NEVER roll the queue surface back, because the
--         rollback is known unfaithful on exactly that path and would produce a
--         third state matching neither pre- nor post-apply.
--   None of (a)-(d) is implemented here. The queue surface is OUT OF SCOPE.
--
-- ── RULING A — ONE FROZEN EXECUTION MODEL (§EXEC) ───────────────────────────
--   The live pass (p_dry_run=false) runs in a SINGLE SERIALIZABLE TRANSACTION,
--   AND the writers listed below are QUIESCED for the window. Quiescence is
--   ADDITIONAL, not alternative: relevant writers demonstrably sit OUTSIDE this
--   transaction (they are pg_cron jobs and Edge Functions on their own
--   connections), so SERIALIZABLE alone would convert interleaving into an
--   abort-and-retry, not prevent it. Verified writers on the two surfaces:
--     m.slot.status        — promote-slots-to-pending-every-5m (73) ·
--                            fill-pending-slots-every-10m (75) ·
--                            recover-stuck-fill-in-progress-every-15m (76) ·
--                            try-urgent-breaking-fills-every-15m (77) ·
--                            materialise-slots-nightly (72)
--     m.post_draft.*       — auto-approver-sweep (58) · publisher-every-10m (7,
--                            facebook, writes approval_status='published') ·
--                            instagram-publisher-every-15m (53) ·
--                            wordpress-publisher-every-6h (55) ·
--                            ai-worker-every-5m (5) · dead-letter-sweep-daily
--                            (20) · pipeline-fixer-30min (36) ·
--                            pipeline-healer-every-15m (50)
--     m.post_publish (TRUTH source; a new row mid-run changes the cohort) —
--                            linkedin-zapier-publisher-every-20m (54) ·
--                            youtube-publisher-every-30min (34)
--   THE REHEARSAL MUST RUN UNDER THE SAME MODEL. A rehearsal under weaker
--   isolation proves nothing about the apply.
--   This is MACHINE-ENFORCED below: a live pass RAISEs unless the surrounding
--   transaction is SERIALIZABLE. Quiescence cannot be enforced in-function and
--   remains a named apply-lane precondition.
--
-- ── ERRATA CORRECTED (the re-cut is the legitimate window) ──────────────────
--   v2's header carried two factually wrong "verified live" claims:
--     (1) "all three audited tables relrowsecurity=true" — FALSE: m.slot is
--         relrowsecurity=FALSE (post_draft/post_publish_queue/post_publish are
--         true). Corrected below.
--     (2) "FORCE would block this SECURITY DEFINER function's own INSERTs" —
--         FALSE: postgres has rolbypassrls=true and BYPASSRLS overrides FORCE,
--         so the INSERTs would succeed either way. Corrected below.
--   The DECISION (ENABLE-not-FORCE) was and remains correct; only the reasons
--   were wrong. Correct rationale: RLS is ENABLEd because it neutralises the
--   inherited pg_default_acl grant (schema m grants {inspector_ro=r/postgres}
--   on new tables, and inspector_ro has rolbypassrls=false, so RLS-with-no-
--   policy blocks it). FORCE is omitted because it adds NO protection when the
--   only writer is a BYPASSRLS owner, while creating a real failure mode for a
--   future non-bypassing writer. THE HOUSE DEFAULT ELSEWHERE REMAINS RLS+FORCE
--   — do not generalise this exception.
--
-- ── GROUND TRUTH (live, project mbkmaxqhsohbtwsqolns) ───────────────────────
--   * 28 drafts have a published post_publish on TWO platforms -> approval_status
--     is a WHOLE-DRAFT column, not per-platform.
--   * 155 published rows have post_publish.platform <> post_draft.platform ->
--     key on pp.platform ALWAYS; pd.platform appears in NO advance predicate.
--   * ~140 drafts are dead/rejected/draft yet carry a published post_publish.
--     Advancing them would RESURRECT killed content. Never auto-written.
--   * 144 approved+single-platform YouTube drafts are excluded by R3's platform
--     rule (NOT 145 — 145 omits the single-platform gate, which fires FIRST and
--     already excludes the one cross-posted draft, counted in the 28).
--   * Expected cohorts: slot 752, draft 315, and queue-indicator 0.
--
-- ── INVARIANTS (fail-closed) ────────────────────────────────────────────────
--   R1  post_publish.status='published' is the ONLY trigger of any advance.
--   R2  slot.status: allow-list {filled,failed} -> 'published', per pp.platform,
--       AND the draft's approval_status must be in the ALLOW-list
--       {approved,published}. No deny-list governs any write-eligibility state.
--   R3  approval_status: ONLY 'approved' -> 'published', ONLY single-platform
--       drafts, ONLY platform <> 'youtube' (YouTube uses approval_status as
--       CROSS-platform state and video_status as its per-platform marker).
--   R5  Every write is preceded by audit rows enabling exact rollback; both the
--       audited and the updated row counts are RETURNED so divergence is
--       machine-visible at the gate (closes the TOCTOU visibility gap).
--   R6  Idempotent: post-advance the predicates no longer match -> re-run = 0.
--   R7  SECURITY DEFINER, owner postgres, search_path ''. OWNER-ONLY: EXECUTE
--       revoked from PUBLIC/anon/authenticated, NOT granted to service_role.
--   R8  A live pass REFUSES to run outside a SERIALIZABLE transaction.
--
-- OUT OF SCOPE: the queue surface (Ruling B, future contract above); any
--   publisher/transport change; re-send; fabricating a post_publish row; the
--   ~140 negative-terminal anomalies (manual review); cc-0079's format path.
--
-- DISCLOSED FORWARD COUPLING (unchanged; broader than LinkedIn): the R3 cohort
--   of 315 is linkedin 308 + instagram 4 + website 3. The same
--   `approval_status !== 'approved'` gate exists at linkedin-publisher:97,
--   linkedin-zapier-publisher:175 (active), instagram-publisher:592 and
--   publisher:366 (facebook) — all soft-fail `not_approved:published` and
--   re-queue — reinforced by publisher/asset_backstop.ts:78-82
--   (allowPublishedApproval=false for FB/IG). wordpress-publisher:153 differs:
--   its selection query requires approval_status='approved', so those 3 drafts
--   are SILENTLY DROPPED from selection rather than soft-failing. No duplicate
--   post results in any case; youtube-publisher:262 already accepts both.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Audit table — rollback ledger. One row per (entity, column) advanced.
-- Two entities only: 'slot' and 'draft'. new_value is NOT NULL (the queue
-- surface, which needed a nullable "column cleared" marker, is out of scope).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m.publish_status_reconcile_audit (
  audit_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid        NOT NULL,
  entity          text        NOT NULL CHECK (entity IN ('slot','draft')),
  entity_id       uuid        NOT NULL,
  column_name     text        NOT NULL,
  old_value       text,
  new_value       text        NOT NULL,
  platform        text,
  post_publish_id uuid,
  reconciled_at   timestamptz NOT NULL DEFAULT now(),
  reconciled_by   text        NOT NULL DEFAULT 'reconcile_publish_status_v3'
);
CREATE INDEX IF NOT EXISTS ix_psra_batch ON m.publish_status_reconcile_audit (batch_id, entity);
REVOKE ALL ON m.publish_status_reconcile_audit FROM PUBLIC, anon, authenticated;
-- RLS ENABLE (not FORCE) — see ERRATA above for the corrected rationale:
-- ENABLE neutralises the inherited {inspector_ro=r/postgres} default ACL;
-- FORCE would add nothing (sole writer is a BYPASSRLS owner) and would create
-- a failure mode for any future non-bypassing writer.
ALTER TABLE m.publish_status_reconcile_audit ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- m.reconcile_publish_status(p_dry_run, p_platform, p_batch_id)
-- TWO SURFACES ONLY: m.slot.status and m.post_draft.approval_status.
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
  v_slot_adv     integer := 0;
  v_slot_audit   integer := 0;
  v_draft_adv    integer := 0;
  v_draft_audit  integer := 0;
  v_anom_neg     integer := 0;
  v_anom_slotneg integer := 0;
  v_anom_multi   integer := 0;
  v_anom_ytexcl  integer := 0;
  v_queue_ind    integer := 0;
  v_anom_ytq     integer := 0;
  v_isolation    text;
BEGIN
  -- ===== R8  FROZEN EXECUTION MODEL — machine-enforced =====
  -- A live pass MUST run inside a single SERIALIZABLE transaction (Ruling A).
  -- Cron/EF quiescence is an additional apply-lane precondition that cannot be
  -- enforced from inside the function; it is named in the header and packet.
  IF NOT p_dry_run THEN
    SELECT current_setting('transaction_isolation') INTO v_isolation;
    IF lower(v_isolation) <> 'serializable' THEN
      RAISE EXCEPTION
        'cc-0080 R8: live pass requires a SERIALIZABLE transaction (found "%"). Start with SET TRANSACTION ISOLATION LEVEL SERIALIZABLE and quiesce the writers named in the artifact header.',
        v_isolation;
    END IF;
  END IF;

  -- ===== ANOMALY / INDICATOR COUNTS (read-only; both modes) =====
  SELECT count(*) INTO v_anom_neg
  FROM m.post_draft pd
  WHERE pd.approval_status IN ('dead','rejected','voided','draft')
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=pd.post_draft_id AND pp.status='published'
                  AND (p_platform IS NULL OR pp.platform=p_platform));

  SELECT count(*) INTO v_anom_multi
  FROM (SELECT pp.post_draft_id FROM m.post_publish pp WHERE pp.status='published'
        GROUP BY pp.post_draft_id HAVING count(DISTINCT pp.platform) > 1) m2;

  -- Slots the R2 allow-list deliberately skips (draft not approved/published).
  SELECT count(*) INTO v_anom_slotneg
  FROM m.slot s
  JOIN m.post_draft pd ON pd.post_draft_id = s.filled_draft_id
  WHERE s.status IN ('filled','failed')
    AND pd.approval_status NOT IN ('approved','published')
    AND (p_platform IS NULL OR s.platform = p_platform)
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=s.filled_draft_id AND pp.platform=s.platform AND pp.status='published');

  -- Drafts excluded SPECIFICALLY by R3's YouTube rule (pass the single-platform
  -- gate, are 'approved', platform='youtube'). Expected 144 — NOT 145; 145 omits
  -- the single-platform gate, which fires first.
  SELECT count(DISTINCT pd.post_draft_id) INTO v_anom_ytexcl
  FROM m.post_draft pd
  JOIN (SELECT pp2.post_draft_id FROM m.post_publish pp2 WHERE pp2.status='published'
        GROUP BY pp2.post_draft_id HAVING count(DISTINCT pp2.platform)=1) single
    ON single.post_draft_id = pd.post_draft_id
  JOIN m.post_publish pp ON pp.post_draft_id=pd.post_draft_id AND pp.status='published'
  WHERE pd.approval_status='approved' AND pp.platform='youtube';

  -- FUTURE-CONTRACT TRIGGER INDICATOR (read-only, never written by this lane).
  -- Non-zero => queue retention changed => the queue future contract in the
  -- header becomes required again. Expected 0.
  -- RESTRICTED TO QUEUE-CONSUMING PLATFORMS BY DESIGN. YouTube publishes
  -- OFF-QUEUE, and 37 stale YouTube queue rows exist whose drafts published via
  -- the off-queue path; those rows were never the publish vehicle. Including
  -- them would make this counter permanently non-zero and destroy its value as
  -- a trigger. They are reported separately as v_anom_ytq.
  SELECT count(*) INTO v_queue_ind
  FROM m.post_publish_queue q
  WHERE q.platform IN ('facebook','instagram','linkedin')
    AND q.status IN ('queued','failed')
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=q.post_draft_id AND pp.platform=q.platform AND pp.status='published');

  -- Known pre-existing artifact, reported for completeness (expected 37).
  -- NOT a retention-change signal; NOT actionable in this lane.
  SELECT count(*) INTO v_anom_ytq
  FROM m.post_publish_queue q
  WHERE q.platform='youtube' AND q.status <> 'published'
    AND EXISTS (SELECT 1 FROM m.post_publish pp
                WHERE pp.post_draft_id=q.post_draft_id AND pp.platform='youtube' AND pp.status='published');

  -- ===== R2  SLOT: {filled,failed} -> published; draft IN {approved,published} =
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
    GET DIAGNOSTICS v_slot_audit = ROW_COUNT;

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
    v_slot_audit := v_slot_adv;
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
    GET DIAGNOSTICS v_draft_audit = ROW_COUNT;

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
    v_draft_audit := v_draft_adv;
  END IF;

  RETURN jsonb_build_object(
    'version', 'v3_two_surface',
    'dry_run', p_dry_run,
    'batch_id', CASE WHEN p_dry_run THEN NULL ELSE p_batch_id END,
    'platform_filter', p_platform,
    'isolation', CASE WHEN p_dry_run THEN NULL ELSE v_isolation END,
    'slot_advanced', v_slot_adv,
    'slot_audit_rows_written', v_slot_audit,
    'draft_approval_advanced', v_draft_adv,
    'draft_audit_rows_written', v_draft_audit,
    'ledger_divergence', (v_slot_adv <> v_slot_audit) OR (v_draft_adv <> v_draft_audit),
    'anomaly_negative_terminal_with_publish', v_anom_neg,
    'anomaly_slot_skipped_draft_not_approved', v_anom_slotneg,
    'anomaly_multiplatform_drafts', v_anom_multi,
    'anomaly_youtube_approval_excluded', v_anom_ytexcl,
    'anomaly_queue_rows_with_published_publish', v_queue_ind,
    'anomaly_youtube_orphan_queue', v_anom_ytq,
    'queue_surface', 'out_of_scope_ruling_b',
    'youtube_approval_status', 'never_written_by_design',
    'ran_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION m.reconcile_publish_status(boolean,text,uuid) FROM authenticated;
-- R7: NO service_role grant. Owner-only by design (one-shot SoD-gated backfill).


-- ---------------------------------------------------------------------
-- ROLLBACK — two surfaces. Fail-closed per row: restores only if the current
-- value is still the one this batch wrote, so a later legitimate write is
-- never clobbered. Trigger census (verified): m.slot has NO triggers;
-- m.post_draft's trg_handle_draft_rejection gates on 'rejected' (no-op in both
-- directions), trg_release_queue_on_asset_ready is column-scoped to
-- image_status/video_status (never fires on this SET list),
-- trg_post_draft_updated_at is benign, trg_prevent_published_draft_delete is
-- BEFORE DELETE only. The rollback direction must still be REHEARSED on a
-- branch under the same SERIALIZABLE model before any prod apply.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.rollback_publish_status_reconcile(p_batch_id uuid)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_slot int:=0; v_draft int:=0;
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

  RETURN jsonb_build_object('version','v3_two_surface','batch_id',p_batch_id,
                            'slot_restored',v_slot,'draft_restored',v_draft,'ran_at',now());
END;
$$;
REVOKE EXECUTE ON FUNCTION m.rollback_publish_status_reconcile(uuid) FROM PUBLIC, anon, authenticated;
-- END NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql
