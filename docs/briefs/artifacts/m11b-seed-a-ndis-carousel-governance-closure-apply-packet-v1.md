# Apply Packet — M11b Seed A: NDIS carousel governance-layer closure record (v1)

**Status: DRAFT / NOT FOR APPLY.** Authored under the PK-approved Gate-1 brief
`docs/briefs/m11b-seed-a-ndis-carousel-governance-closure-gate1-brief-v1.md` (Option (a) ratified,
v6.147 §2.4). This packet requires its own `db-rls-auditor` fresh pass at execution time, external
review pinned to its frozen hash, `branch-warden` safe, and an explicit PK apply gate before any SQL
in it runs — none of that has happened. **No SQL below has been executed. Applies stay watch-gated**
(v6.140, ~2026-08-11 20:20 Sydney) per the brief's own Forbidden actions, unless PK separately elects
to expedite.

## 1. Fresh live pre-checks (2026-08-06, `execute_sql` SELECT-only, project `mbkmaxqhsohbtwsqolns`)

All six required pre-checks from the brief's Success Criteria, re-run fresh this session (not reused
from the 2026-08-04/05 drafting figures):

| # | Check | Result |
|---|---|---|
| 1 | NDIS `c.client_format_config` carousel row (`61e4f143-f0cf-4a9b-853c-f592daf82aaf`) | **CONFIRMED still exists**, `is_enabled=false`, unchanged since `created_at` 2026-03-20 |
| 2 | NDIS carousel `format_override` schedule rows | **CONFIRMED all 12 rows `enabled=false`** (`c.client_publish_schedule`, facebook+instagram, all days) — ⚠ one naming discrepancy found: the only matching rollback-snapshot table in the DB is `c._rollback_post_cgu_v1_schedule_v10_20260804` (named **v10**, not v11 as the brief's "v11 apply" framing states) — the *substance* (pre-flip `enabled=true` in the snapshot vs live `enabled=false` today) checks out; the version-number citation needs reconciling with whoever owns that naming, flagged not silently corrected |
| 3 | NDIS carousel draft/render/publish activity since `2026-08-04T10:20:00+00` | **0** (post_draft, post_carousel_slide, post_render_log, post_publish all checked, exact-format-match, zero) |
| 4 | PP D2 governance row (`d2510001-0000-4000-8000-000000000001`) | `declarative_registry_ref` still **NULL**, `enabled` still **true** — unchanged, trip mechanism precondition intact |
| 5 | NDIS existing `carousel` row in `c.client_creative_governance` | **NONE** — idempotency clean |
| 6 | `tmr-drift-probe` current daily-run status | **`error`**, 3/3 most recent runs (2026-08-03 through 2026-08-05, `c.tmr_drift_probe_run`). ⚠ Correction to the brief's monitoring-surface assumption: this job is **absent from `ice_ro.cron_health`/`m.cron_health_status`** entirely — those tables/views do not track it. Ground truth is `c.tmr_drift_probe_run.status` (the probe's own logical verdict) — cited here, not the cron-scheduler's own "did the HTTP call fire" signal (`cron.job_run_details`, which shows 5/5 "succeeded" but only confirms the trigger fired, not the probe's business-logic outcome). |

**Full current error_detail for the most recent run (2026-08-05T17:35:07Z), verbatim, all 4 causes:**
```
declarative_coverage[ndis-yarns]: declarative_registry_shape (docs/creative-library/ndis-yarns.json): pattern 'pp_background_plus_scrim_v1' not found
declarative_coverage[care-for-welfare-pty-ltd]: fetch_declarative_registry 404 (docs/creative-library/care-for-welfare.json): 404: Not Found
declarative_coverage[invegent]: declarative_registry_ref_missing: governed row has no registry pointer
declarative_coverage[property-pulse]: declarative_registry_ref_missing: governed row has no registry pointer
```
**None of these 4 existing causes are about carousel** — they are pre-existing `image_quote`-governance
declarative-coverage issues for NDIS/CFW/Invegent/PP, unrelated to this packet. The PP `property-pulse`
cause IS the D2 carousel row's known trip (`declarative_registry_ref_missing`), already priced in and
PK-accepted (Option C, D2 precedent) — unchanged by this packet.

## 2. Drift-probe impact of THIS packet's `enabled=false` row — computed, not assumed

`fetchGovernedClients()` (deployed `tmr-drift-probe` v10, verified against the live function body per
this brief's own 2026-08-05 addendum, re-confirmed at execution time by this pre-check's own read of
`c.tmr_drift_probe_run`) filters strictly `.eq("enabled", true)`. This packet's NDIS row is
**`enabled=false`** — it will **never be read by `fetchGovernedClients()`**, and therefore **cannot**
reach `fetchDeclarativeRegistry()`'s `declarative_registry_ref_missing` throw. **Stronger statement
than "will not re-trip":** the probe is *already* `status='error'` today from 4 pre-existing,
unrelated causes (§1 table). Since this packet's row is invisible to the probe by construction, **the
probe's post-apply status will remain byte-identical `error` with the SAME 4 causes** — this packet
cannot add a 5th cause, cannot change the count, and cannot flip `ok→error` (there is no `ok` state to
flip from). This is the most complete answer to the brief's own "not left as an assumed 'same as D2'
claim" requirement (Success criteria).

## 3. Proposed SQL (illustrative — NOT FOR APPLY)

**Execution channel (post-audit fix — pinned to one specific tool, not two alternatives):** the entire
block below (precheck + INSERT + postcheck + CAS guard) is ONE explicit `BEGIN;...COMMIT;` transaction
and MUST be submitted as ONE single `mcp__supabase__apply_migration` call — `apply_migration`
specifically (not `execute_sql`), since this packet mirrors the D2 precedent's own applied form
(`supabase/migrations/20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql`) and is
intended to land as a real, ledgered migration file at apply time, not an ad-hoc `execute_sql` DML
call. Never split across calls. (`apply-harness-auditor`'s shadow review of an earlier draft flagged
naming both tools as interchangeable as a low-severity completeness gap, finding AHA-01-2 — fixed by
pinning to the one tool consistent with this packet's own eventual migration-ledger form.)

```sql
-- PROPOSED, NOT EXECUTED. Mirrors supabase/migrations/20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql's
-- pattern exactly (deterministic id, ON CONFLICT DO NOTHING + fail-loud row-count assertion).
BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  -- Fail-closed idempotency precheck (belt-and-braces on top of ON CONFLICT — makes a re-run loud,
  -- not silent, if a row already exists from an earlier partial apply).
  IF EXISTS (SELECT 1 FROM c.client_creative_governance
             WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND format = 'carousel') THEN
    RAISE EXCEPTION 'm11b_seed_a_precheck_failed: NDIS already has a carousel governance row — STOP, do not force';
  END IF;

  INSERT INTO c.client_creative_governance
    (id, client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
  VALUES (
    'a5eed001-0000-4000-8000-000000000001',   -- deterministic id, Seed-A namespace
    'fb98a472-ae4d-432d-8738-2273231c1ef4',   -- ndis-yarns
    'carousel',
    'ndis_yarns.carousel.legacy_pipeline_retired',  -- closure/retirement record, mirrors D2's contract_ref shape
    NULL,   -- honest NULL — no Creative Library declarative-registry entry exists for this legacy pipeline (same reasoning as D2)
    'image_worker_legacy_carousel_v1',   -- same worker-embedded pipeline D2 names for PP (image-worker's buildCarouselSlideScript path)
    false   -- CLOSURE/RETIREMENT record, NOT declared-legacy-LIVE like PP's D2 row (enabled=true) — NDIS's carousel route is
            -- already closed at the config layer (client_format_config.is_enabled=false since 2026-08-04); this row documents
            -- that closure at the governance layer, it does not declare anything live
  )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'm11b_seed_a_postcheck_failed: expected exactly 1 row inserted for ndis-yarns x carousel governance closure, got %. A row may already exist — STOP, do not force.', v_rows;
  END IF;

  -- CAS no-volume-increase guard, EXECUTABLE (post-audit fix — apply-harness-auditor shadow review
  -- of an earlier draft found this guard declared only in prose/§5, not backed by any statement in
  -- this transaction; finding AHA-01-1, high severity). Asserts NDIS's carousel activity count is
  -- still exactly 0 immediately after this INSERT commits, inside the SAME atomic block.
  IF (SELECT count(*) FROM m.post_draft
      WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
        AND created_at >= '2026-08-04T10:20:00+00'
        AND (requested_format = 'carousel' OR final_format_authority = 'carousel'
             OR recommended_format = 'carousel' OR draft_format->>'format' = 'carousel')) <> 0 THEN
    RAISE EXCEPTION 'm11b_seed_a_cas_guard_failed: NDIS carousel post_draft activity is nonzero after this governance-closure INSERT — ABORT, this row must have zero render-path side effects';
  END IF;
END $$;

COMMIT;
```

## 4. Rollback plan

```sql
-- Byte-symmetric reversal — single DELETE by deterministic id, same execution-channel discipline
-- (one apply_migration call).
DELETE FROM c.client_creative_governance WHERE id = 'a5eed001-0000-4000-8000-000000000001';
```
No data is destroyed beyond the one row this packet itself would have inserted. Unconditionally safe.

## 5. CAS no-volume-increase guard (scoping packet §4.1/§3)

**Post-audit fix:** `apply-harness-auditor`'s shadow review of an earlier draft (finding AHA-01-1,
high severity) found this guard declared here in prose only, not backed by any statement in the
executable §3 transaction — a "hard abort" that lived only in text is not actually fail-closed. Fixed
before freeze: §3's `DO` block now includes an executable `count(*)` assertion (mirroring Seed B's own
CAS guard pattern, which the audit found correctly implemented from the start) confirming NDIS's
carousel activity count stays 0 immediately after the INSERT commits, inside the SAME atomic
transaction. Not deferred to a separate manual step.

## 6. Review tier

**T2** per CLAUDE.md Convention 3 (DML ⇒ ≥T2). A single additive INSERT into a non-secret,
non-privilege-bearing table, reversible by construction, touching no schedule/cap/deploy/secret
surface. Full T2 chain required: `db-rls-auditor` fresh pass (this doc §1) + `branch-warden` safe +
`apply-harness-auditor` shadow (§8 below) + external review pinned to the frozen hash + explicit PK
apply gate.

## 7. Option (a) vs Option (b) — presented, not decided here

Per the brief, this is the single governing decision for the lane. **Restated from the scoping
packet, not re-litigated:**
- **Option (a) (this packet):** add an explicit `c.client_creative_governance` closure row for NDIS,
  mirroring PP's D2 shape but `enabled=false`. Pro: self-documenting, matches PP's own precedent
  pattern, gives any future code reading this table the correct governed state from day one, and (per
  §2 above) provably causes zero drift-probe impact. Con: one more row in a table whose only other
  reader (`tmr-drift-probe`) already ignores it by construction — arguably adds record-keeping value
  without any functional necessity, since the config-layer closure (§1 check 1, already live since
  2026-08-04) already fully controls the render-eligibility outcome.
- **Option (b):** rule the existing config-layer closure sufficient on its own, no governance row
  needed. Pro: zero new surface, nothing to maintain. Con: leaves an asymmetry with PP's D2 record
  (which does have a governance row) and does not give a future governance-table consumer any signal
  that NDIS's carousel route was a deliberate closure rather than simply never-configured.

**Per v6.147 §2.4, PK has already ratified Option (a)** ("Seed A — option (a), explicit `enabled=false`
governance closure row"). This section is retained for completeness/audit trail, not because the
choice remains open.

## 8. `apply-harness-auditor` shadow-mode result

See the combined shadow-review section in the result doc (`docs/briefs/results/m11b-seed-a-seed-b-apply-packet-authoring-result-v1.md`)
— run against both packets together, findings recorded there per-packet.
