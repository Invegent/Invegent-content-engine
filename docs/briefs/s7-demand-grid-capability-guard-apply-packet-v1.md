# S7 apply packet — `m.build_weekly_demand_grid` capability guard (amended predicate, D1 exemption)

**Created:** 2026-08-01 Sydney
**Author:** Claude Code orchestrator (WS-2 of the Ultimate programme brief, executed post-P-1 ratification)
**Lane classification (CCF-02):** SAFETY_GATE · **Tier: T3** (live production behaviour change for Property Pulse — YouTube allocation only, see §4)
**Status:** DRAFT FOR P-3A REVIEW CHAIN → freeze → **P-3B (separate PK T3 apply authorisation — HARD STOP; nothing in this packet authorises the apply)**
**Supersedes:** §8 of `docs/briefs/s7-durable-capability-enforcement-demand-grid-gate1-v1.md` (the Gate-1 draft proposal). The Gate-1 brief remains the investigation record; THIS packet is the apply artifact.
**Amendment provenance:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §0 warning + §1.2 D1 (DECIDED) + §3 WS-2 — the drafted S7 predicate conflicted with D1 (governed template-less text path); the amendment below resolves it exactly as the ratified brief specifies.

---

## §0 What changed vs. the Gate-1 draft (the two amendments)

1. **D1 governed template-less exemption.** The drafted guard excluded any format whose
   `select_template` call fail-closes — which template-less `text` always does (there is no
   template to select; `render_engine='none'`). With D1 ratified (governed template-less text
   path, all brands), the predicate gains an explicit governed-exemption clause: **exemption set
   exactly `{text}`** (mirroring the S9 resolver exemption), **still intersected with
   `platform_support`** — so text passes the guard only where the taxonomy marks it supported
   (live: `{"facebook": true, "linkedin": true, "instagram": false}`, youtube absent → COALESCE
   false; text can never leak onto IG/YT through the exemption).
2. **Fail-closed correction made canonical.** The Gate-1 draft's §3 self-flagged
   `IS DISTINCT FROM 'fail_closed'` NULL fail-open defect is corrected everywhere:
   `COALESCE((…->>'status'), 'fail_closed') <> 'fail_closed'` — a NULL/errored/absent
   `select_template` result now fails **closed** (excluded), never open.

## §1 The amended capability predicate

A candidate `(client, platform, ice_format_key)` survives iff:

```
platform_supported(format, platform)                                   -- structural half
AND ( ice_format_key = 'text'                                          -- D1 governed exemption, set exactly {text}
      OR COALESCE((select_template(slug, platform, format)->>'status'),
                  'fail_closed') <> 'fail_closed' )                    -- governed half, fail-closed on NULL/error
```

where `platform_supported` = `EXISTS (… t."5.3_content_format" cf WHERE cf.ice_format_key = … AND cf.is_active AND COALESCE((cf.platform_support ->> platform)::boolean, false))`.

Formally: `platform_support ∩ (¬fail_closed ∪ {text})` — exactly the ratified programme-brief §3 WS-2 form.

## §2 The apply migration (single artifact, single channel, self-verifying)

- **Migration name (permanent identity):** `s7_demand_grid_capability_guard_v1`
- **Channel:** `mcp__supabase__apply_migration` (project `mbkmaxqhsohbtwsqolns`) — one call, one
  migration, executed as a single transaction. If PK elects to apply via psql/SQL editor instead,
  the SQL below MUST be wrapped in an explicit `BEGIN; … COMMIT;`.
- **Structure:** C-1 baseline identity gate (executable, aborts the transaction on mismatch) →
  the `CREATE OR REPLACE` → C-2 marker assert + C-3 full 14-row matrix-equality assert
  (executable; any failure raises → the entire transaction, including the `CREATE OR REPLACE`,
  rolls back). No step of the harness is prose-only.

```sql
-- ============================================================
-- s7_demand_grid_capability_guard_v1
-- C-1: baseline identity gate (fail-closed; aborts txn on mismatch)
-- ============================================================
DO $$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef('m.build_weekly_demand_grid(uuid,date)'::regprocedure))
    INTO v_md5;
  IF v_md5 <> '2dff1dab88fb1f9e3f341ea6f9f843c7' THEN
    RAISE EXCEPTION
      'S7 C-1 STOP: live m.build_weekly_demand_grid body md5 % != frozen baseline 2dff1dab88fb1f9e3f341ea6f9f843c7 — the function changed since freeze; apply is VOID, re-derive and re-freeze', v_md5;
  END IF;
END $$;

-- ============================================================
-- C-4 transaction-identity guard (AHA-05-1 remediation):
-- records this transaction's id. ON COMMIT DROP means an
-- autocommit (unwrapped) execution drops it at statement end,
-- so C-2/C-3 below DETECT non-single-transaction execution and
-- fail loudly instead of reporting a false green.
-- ============================================================
CREATE TEMP TABLE s7_txn_guard ON COMMIT DROP AS SELECT txid_current() AS xid;

-- ============================================================
-- The guarded function (amended predicate: §1)
-- Changes vs. live baseline: (a) DECLARE + client-slug resolution,
-- (b) NEW capability_gated CTE, (c) policy_backed reads FROM capability_gated.
-- Everything else is byte-identical to the captured live body.
-- ============================================================
CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
 RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
DECLARE
  v_client_slug text;
BEGIN
  SELECT cl.client_slug INTO v_client_slug FROM c.client cl WHERE cl.client_id = p_client_id;
  RETURN QUERY
  WITH slots_per_platform AS (
    SELECT cps.platform, COUNT(*)::integer AS weekly_slots
    FROM c.client_publish_schedule cps
    WHERE cps.client_id = p_client_id AND cps.enabled = true
    GROUP BY cps.platform
  ),
  candidate AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct AS share_pct
    FROM t.platform_format_mix_default d
    WHERE d.is_current = true
    UNION
    SELECT o.platform, o.ice_format_key, NULL::numeric
    FROM c.client_format_mix_override o
    WHERE o.client_id = p_client_id AND o.is_current = true
  ),
  candidate_share AS (
    SELECT cand.platform, cand.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct
                FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = cand.platform AND o.ice_format_key = cand.ice_format_key
               LIMIT 1),
             max(cand.share_pct),
             0
           ) AS share_pct
    FROM candidate cand
    GROUP BY cand.platform, cand.ice_format_key
  ),
  enabled_set AS (
    SELECT cs.platform, cs.ice_format_key, cs.share_pct
    FROM candidate_share cs
    WHERE EXISTS (
      SELECT 1
      FROM c.client_format_config cfg
      WHERE cfg.client_id = p_client_id
        AND cfg.ice_format_key = cs.ice_format_key
        AND cfg.is_enabled = true
        AND (
          cfg.platform = cs.platform
          OR (
            cfg.platform IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM c.client_format_config cfg2
              WHERE cfg2.client_id = p_client_id
                AND cfg2.ice_format_key = cs.ice_format_key
                AND cfg2.platform = cs.platform
            )
          )
        )
    )
  ),
  capability_gated AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (
      SELECT 1 FROM t."5.3_content_format" cf
       WHERE cf.ice_format_key = es.ice_format_key
         AND cf.is_active = true
         AND COALESCE((cf.platform_support ->> es.platform)::boolean, false)
    )
    AND (
      es.ice_format_key = 'text'
      OR COALESCE(
           (public.select_template(v_client_slug, es.platform, es.ice_format_key) ->> 'status'),
           'fail_closed'
         ) <> 'fail_closed'
    )
  ),
  policy_backed AS (
    SELECT cg.platform, cg.ice_format_key, cg.share_pct
    FROM capability_gated cg
    WHERE EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                   WHERE sp.ice_format_key = cg.ice_format_key AND sp.is_current = true)
      AND EXISTS (SELECT 1 FROM t.format_quality_policy qp
                   WHERE qp.ice_format_key = cg.ice_format_key AND qp.is_current = true)
  ),
  per_platform_total AS (
    SELECT pb.platform AS platform, NULLIF(SUM(pb.share_pct), 0) AS total_share
    FROM policy_backed pb
    GROUP BY pb.platform
  ),
  normalised AS (
    SELECT pb.platform, pb.ice_format_key,
           CASE
             WHEN ppt.total_share IS NULL
               THEN 100.0 / NULLIF(COUNT(*) OVER (PARTITION BY pb.platform), 0)
             ELSE pb.share_pct * 100.0 / ppt.total_share
           END AS share_pct
    FROM policy_backed pb
    JOIN per_platform_total ppt ON ppt.platform = pb.platform
  ),
  with_slots AS (
    SELECT n.platform, n.ice_format_key, n.share_pct,
           COALESCE(sp.weekly_slots, 0) AS weekly_slots
    FROM normalised n
    LEFT JOIN slots_per_platform sp ON sp.platform = n.platform
  ),
  raw_alloc AS (
    SELECT ws.platform, ws.ice_format_key, ws.share_pct, ws.weekly_slots,
           (ws.share_pct / 100.0) * ws.weekly_slots AS raw,
           floor((ws.share_pct / 100.0) * ws.weekly_slots)::integer AS fl,
           ((ws.share_pct / 100.0) * ws.weekly_slots)
             - floor((ws.share_pct / 100.0) * ws.weekly_slots) AS rem
    FROM with_slots ws
  ),
  alloc_ranked AS (
    SELECT ra.*,
           row_number() OVER (
             PARTITION BY ra.platform
             ORDER BY ra.rem DESC, ra.share_pct DESC, ra.ice_format_key ASC
           ) AS rk,
           SUM(ra.fl) OVER (PARTITION BY ra.platform) AS base_sum,
           MAX(ra.weekly_slots) OVER (PARTITION BY ra.platform) AS plat_slots
    FROM raw_alloc ra
  )
  SELECT p_client_id AS client_id,
         ar.platform,
         ar.ice_format_key,
         ar.share_pct,
         (ar.fl + CASE WHEN ar.rk <= (ar.plat_slots - ar.base_sum) THEN 1 ELSE 0 END)::integer
           AS weekly_slot_count
  FROM alloc_ranked ar
  ORDER BY ar.platform, ar.share_pct DESC, ar.ice_format_key;
END;
$function$;

-- ============================================================
-- C-2 marker assert + C-3 full matrix-equality assert (fail-closed;
-- any failure rolls back the entire migration incl. the CREATE OR REPLACE)
-- ============================================================
DO $$
DECLARE
  v_bad integer;
  v_guard_xid bigint;
BEGIN
  -- C-4: single-transaction proof (AHA-05-1). If the artifact was executed
  -- unwrapped (autocommit), the ON COMMIT DROP guard table no longer exists
  -- and the CREATE OR REPLACE above has ALREADY COMMITTED unguarded — fail
  -- loudly so the operator runs the rollback migration instead of trusting
  -- a false green.
  IF to_regclass('pg_temp.s7_txn_guard') IS NULL THEN
    RAISE EXCEPTION
      'S7 C-4 STOP: transaction guard table absent — this artifact was NOT executed as a single transaction; the CREATE OR REPLACE may already be committed UNVERIFIED. Run the rollback migration now, then re-apply through the named single-transaction channel';
  END IF;
  SELECT xid INTO v_guard_xid FROM s7_txn_guard;
  IF v_guard_xid IS DISTINCT FROM txid_current() THEN
    RAISE EXCEPTION
      'S7 C-4 STOP: transaction id changed since C-1 (guard % vs current %) — not a single transaction; treat as unverified apply, run the rollback migration', v_guard_xid, txid_current();
  END IF;

  -- C-2: the deployed body carries the guard marker
  IF position('capability_gated' in
       pg_get_functiondef('m.build_weekly_demand_grid(uuid,date)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'S7 C-2 STOP: capability_gated marker absent post-apply — wrong body shipped; transaction rolled back';
  END IF;

  -- C-3: post-apply output for BOTH clients equals the frozen expected matrix,
  -- strictly, in both directions (no unexpected rows, no missing rows).
  WITH expected(client_id, platform, ice_format_key, share_pct, weekly_slot_count) AS (
    VALUES
      -- NDIS-Yarns fb98a472-ae4d-432d-8738-2273231c1ef4
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'facebook','image_quote',60.00,17),
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'facebook','text',40.00,11),
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'instagram','image_quote',100.00,28),
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'linkedin','text',57.14,8),
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'linkedin','image_quote',42.86,6),
      ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,'youtube','video_short_stat',100.00,28),
      -- Property Pulse 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'facebook','image_quote',40.00,2),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'facebook','carousel',33.33,2),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'facebook','text',26.67,1),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'instagram','carousel',60.00,3),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'instagram','image_quote',40.00,2),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'linkedin','text',57.14,3),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'linkedin','image_quote',42.86,2),
      ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,'youtube','video_short_stat',100.00,5)
  ),
  actual AS (
    SELECT g.client_id, g.platform, g.ice_format_key,
           round(g.share_pct, 2) AS share_pct, g.weekly_slot_count
    FROM (VALUES ('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid),
                 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid)) c(id)
    CROSS JOIN LATERAL m.build_weekly_demand_grid(c.id) g
  ),
  diff AS (
    (SELECT * FROM actual EXCEPT SELECT * FROM expected)
    UNION ALL
    (SELECT * FROM expected EXCEPT SELECT * FROM actual)
  )
  SELECT count(*) INTO v_bad FROM diff;

  IF v_bad <> 0 THEN
    RAISE EXCEPTION
      'S7 C-3 STOP: post-apply matrix diverges from frozen expectation by % row(s) — live data moved since freeze OR guard misbehaves; transaction rolled back, apply VOID, re-derive and re-freeze', v_bad;
  END IF;
END $$;
```

**C-3 freshness semantics (intended, not incidental):** the expected matrix is pinned to the
frozen live derivation (§4). If mix tables, `client_format_config`, schedules, taxonomy, or
template graduation state move between freeze and apply, C-3 trips and the whole apply rolls
back — the correct outcome is re-derive → re-freeze → fresh P-3B, never a partial apply.

## §3 Rollback migration (byte-exact restore, self-verifying)

- **Migration name:** `s7_demand_grid_capability_guard_v1_rollback` (new identity, per house rule)
- **Channel:** same single-transaction channel as §2.
- **C-R1:** post-restore, the body md5 MUST equal the frozen baseline
  `2dff1dab88fb1f9e3f341ea6f9f843c7` (byte-exact restoration proven executable, or the rollback
  itself rolls back). No pre-gate: rollback must always be runnable.

```sql
-- s7_demand_grid_capability_guard_v1_rollback
-- Restores the captured live baseline body VERBATIM (source: live
-- pg_get_functiondef capture, 2026-08-01, md5 2dff1dab88fb1f9e3f341ea6f9f843c7).
CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
 RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH slots_per_platform AS (
    SELECT cps.platform, COUNT(*)::integer AS weekly_slots
    FROM c.client_publish_schedule cps
    WHERE cps.client_id = p_client_id AND cps.enabled = true
    GROUP BY cps.platform
  ),
  candidate AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct AS share_pct
    FROM t.platform_format_mix_default d
    WHERE d.is_current = true
    UNION
    SELECT o.platform, o.ice_format_key, NULL::numeric
    FROM c.client_format_mix_override o
    WHERE o.client_id = p_client_id AND o.is_current = true
  ),
  candidate_share AS (
    SELECT cand.platform, cand.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct
                FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = cand.platform AND o.ice_format_key = cand.ice_format_key
               LIMIT 1),
             max(cand.share_pct),
             0
           ) AS share_pct
    FROM candidate cand
    GROUP BY cand.platform, cand.ice_format_key
  ),
  enabled_set AS (
    SELECT cs.platform, cs.ice_format_key, cs.share_pct
    FROM candidate_share cs
    WHERE EXISTS (
      SELECT 1
      FROM c.client_format_config cfg
      WHERE cfg.client_id = p_client_id
        AND cfg.ice_format_key = cs.ice_format_key
        AND cfg.is_enabled = true
        AND (
          cfg.platform = cs.platform
          OR (
            cfg.platform IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM c.client_format_config cfg2
              WHERE cfg2.client_id = p_client_id
                AND cfg2.ice_format_key = cs.ice_format_key
                AND cfg2.platform = cs.platform
            )
          )
        )
    )
  ),
  policy_backed AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                   WHERE sp.ice_format_key = es.ice_format_key AND sp.is_current = true)
      AND EXISTS (SELECT 1 FROM t.format_quality_policy qp
                   WHERE qp.ice_format_key = es.ice_format_key AND qp.is_current = true)
  ),
  per_platform_total AS (
    SELECT pb.platform AS platform, NULLIF(SUM(pb.share_pct), 0) AS total_share
    FROM policy_backed pb
    GROUP BY pb.platform
  ),
  normalised AS (
    SELECT pb.platform, pb.ice_format_key,
           CASE
             WHEN ppt.total_share IS NULL
               THEN 100.0 / NULLIF(COUNT(*) OVER (PARTITION BY pb.platform), 0)
             ELSE pb.share_pct * 100.0 / ppt.total_share
           END AS share_pct
    FROM policy_backed pb
    JOIN per_platform_total ppt ON ppt.platform = pb.platform
  ),
  with_slots AS (
    SELECT n.platform, n.ice_format_key, n.share_pct,
           COALESCE(sp.weekly_slots, 0) AS weekly_slots
    FROM normalised n
    LEFT JOIN slots_per_platform sp ON sp.platform = n.platform
  ),
  raw_alloc AS (
    SELECT ws.platform, ws.ice_format_key, ws.share_pct, ws.weekly_slots,
           (ws.share_pct / 100.0) * ws.weekly_slots AS raw,
           floor((ws.share_pct / 100.0) * ws.weekly_slots)::integer AS fl,
           ((ws.share_pct / 100.0) * ws.weekly_slots)
             - floor((ws.share_pct / 100.0) * ws.weekly_slots) AS rem
    FROM with_slots ws
  ),
  alloc_ranked AS (
    SELECT ra.*,
           row_number() OVER (
             PARTITION BY ra.platform
             ORDER BY ra.rem DESC, ra.share_pct DESC, ra.ice_format_key ASC
           ) AS rk,
           SUM(ra.fl) OVER (PARTITION BY ra.platform) AS base_sum,
           MAX(ra.weekly_slots) OVER (PARTITION BY ra.platform) AS plat_slots
    FROM raw_alloc ra
  )
  SELECT p_client_id AS client_id,
         ar.platform,
         ar.ice_format_key,
         ar.share_pct,
         (ar.fl + CASE WHEN ar.rk <= (ar.plat_slots - ar.base_sum) THEN 1 ELSE 0 END)::integer
           AS weekly_slot_count
  FROM alloc_ranked ar
  ORDER BY ar.platform, ar.share_pct DESC, ar.ice_format_key;
END;
$function$;

-- C-R1: byte-exact restoration proof (fail-closed)
DO $$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef('m.build_weekly_demand_grid(uuid,date)'::regprocedure))
    INTO v_md5;
  IF v_md5 <> '2dff1dab88fb1f9e3f341ea6f9f843c7' THEN
    RAISE EXCEPTION 'S7 C-R1 STOP: restored body md5 % != baseline 2dff1dab88fb1f9e3f341ea6f9f843c7 — restoration NOT byte-exact; rolled back', v_md5;
  END IF;
END $$;
```

## §4 Re-derived before/after matrices (amended predicate — LIVE-SIMULATED, not hand arithmetic)

Method: the full live CTE pipeline (captured body, md5-pinned) was re-run 2026-08-01 as a
standalone read-only query with `capability_gated` inserted, against live production data for
both clients. Live `select_template` calls, live taxonomy, live schedules. The per-candidate
predicate evaluation (all 22 rows) was separately read back; every exclusion below is
evidenced by a live `fail_closed` status, never assumption.

**Property Pulse (ENROLLED, LIVE PRODUCTION):**

| platform | BEFORE (live 2026-08-01) | AFTER (amended guard, live-simulated) | change |
|---|---|---|---|
| facebook | image_quote 40%/2 · carousel 33.33%/2 · text 26.67%/1 | image_quote 40%/2 · carousel 33.33%/2 · text 26.67%/1 | **NONE** (text survives via D1; carousel live `select_template='ok'` post-D2) |
| instagram | carousel 60%/3 · image_quote 40%/2 | carousel 60%/3 · image_quote 40%/2 | **NONE** |
| linkedin | text 57.14%/3 · image_quote 42.86%/2 | text 57.14%/3 · image_quote 42.86%/2 | **NONE** (text survives via D1) |
| youtube | kinetic 33.33%/2 · kinetic_voice 27.78%/1 · stat 22.22%/1 · stat_voice 16.67%/1 | **video_short_stat 100%/5** | kinetic/kinetic_voice/stat_voice excluded (live `fail_closed`); stat absorbs all 5 slots |

> **Headline for P-3B:** under the amended predicate, PP's live behaviour change is confined to
> **YouTube only** — FB/IG/LI are row-for-row identical to today. The Gate-1 draft (pre-D1)
> would additionally have de-allocated FB text and LI text; D1 governs those cells instead.
> This materially shrinks the blast radius PK is asked to authorise.

**NDIS-Yarns (unenrolled — hypothetical; grid callable but `format_override` covers 97/98 slots):**

| platform | BEFORE (live 2026-08-01) | AFTER (amended guard, live-simulated) | change |
|---|---|---|---|
| facebook | image_quote 40%/11 · carousel 33.33%/9 · text 26.67%/8 | **image_quote 60%/17 · text 40%/11** | carousel excluded (live `fail_closed`); text SURVIVES via D1 |
| instagram | carousel 60%/17 · image_quote 40%/11 | **image_quote 100%/28** | carousel excluded; text cannot enter (platform_support instagram=false — exemption stays intersected) |
| linkedin | text 57.14%/8 · image_quote 42.86%/6 | text 57.14%/8 · image_quote 42.86%/6 | **NONE** (text survives via D1) |
| youtube | kinetic 33.33%/9 · kinetic_voice 27.78%/8 · stat 22.22%/6 · stat_voice 16.67%/5 | **video_short_stat 100%/28** | three kinetic-family formats excluded (live `fail_closed`) |

Exclusion counts: PP 3/11 (was 5/11 pre-D1) · NDIS 5/11 (was 7/11 pre-D1). Every excluded cell
is a live `select_template` `fail_closed` with `platform_support=true` — i.e. the
temporarily-unavailable / silently-degrading classes; zero structural (`platform_support=false`)
candidates exist in either live set today. All exclusions self-heal with zero code change the
moment a template graduates.

## §5 Caller / regression surface (re-verified live 2026-08-01 — one correction vs. Gate-1)

`prosrc` scan for `build_weekly_demand_grid` (5 referencing functions):

| fn | relationship | impact |
|---|---|---|
| `m.materialise_slots` (SECDEF, owner postgres, `search_path=public, pg_temp`) | real caller | zero code change; signature/return shape unchanged; runs as postgres → has EXECUTE on `select_template` ✓ |
| `public.get_week_format_allocation` (SECDEF postgres, EXECUTE: postgres+service_role) | **REAL CALLER — correction:** the Gate-1 brief called this an "independent computation"; live `prosrc` shows it now calls `m.build_weekly_demand_grid(p_client_id, v_monday)` directly. | Weekly Schedule Editor read RPC will report the **gated** allocation post-apply — behaviourally correct (dashboard shows the safe grid), but it is a live read-path output change PK should know about at P-3B |
| `m.match_demand_to_canonicals` / `m.diagnose_match_pool_adequacy` (non-SECDEF) | real callers | see a smaller, safer demand-cell set; no code change; called via service_role paths → EXECUTE on `select_template` ✓ |
| `m.resolve_final_format` (R3a SHADOW) | **comment-only reference** ("mirrors …'s policy-backed ∩ platform_support ∩ client-enabled set") — not a call | none; consolidation remains the named carry |
| `c.handle_schedule_rule_change` (trigger) | indirect via `materialise_slots` | unaffected |

`format_override` interaction: unchanged — resolved inside `m.materialise_slots` **before** the
grid is consulted; the guard cannot touch pinned slots (Gate-1 §6 evidence stands).

## §6 Declared control / assertion register (apply-harness-auditor input)

| ID | Control | Enforcement |
|---|---|---|
| C-1 | Baseline identity gate: live body md5 == `2dff1dab88fb1f9e3f341ea6f9f843c7` | EXECUTABLE — DO block, RAISE aborts txn (§2) |
| C-2 | Post-apply marker: deployed body contains `capability_gated` | EXECUTABLE — DO block, same txn (§2) |
| C-3 | Post-apply full 14-row matrix equality, both directions, both clients | EXECUTABLE — DO block, same txn; failure rolls back the CREATE OR REPLACE (§2) |
| C-R1 | Rollback byte-exactness: restored md5 == baseline | EXECUTABLE — DO block in rollback migration (§3) |
| C-4 | Atomicity: C-1 → CREATE OR REPLACE → C-2/C-3 are ONE migration on the NAMED single-call channel `mcp__supabase__apply_migration`; psql fallback requires explicit BEGIN/COMMIT | EXECUTABLE (AHA-05-1 remediation): `s7_txn_guard` temp table (`ON COMMIT DROP`) written at C-1, existence + `txid_current()` identity re-verified inside the C-2/C-3 block — an unwrapped/autocommit execution is DETECTED and fails loudly with an explicit run-the-rollback instruction, never a false green |
| P-1 | Frozen-hash match: packet sha256 at P-3B == the hash the review chain pinned | PROCEDURAL — orchestrator/PK verify-or-abort before apply |
| P-2 | Non-clean review verdict, unexpected origin movement, or unexpected file set → sequence VOID | PROCEDURAL — Convention-2 mandatory STOPs |

Honesty note (cc-0079 Slice-2 failure class): the only protections NOT SQL-enforced are P-1/P-2,
which are inherently procedural gate mechanics; every data/identity/behaviour protection above
is executable and fail-closed inside the migration transaction.

## §7 Grants, volatility, search_path, tier

- **Volatility safety:** `public.select_template` is `STABLE` with no DML (verified live) — legal
  inside the `STABLE` grid; the full amended pipeline executed clean as a read-only query.
- **Grants:** no change. `select_template` EXECUTE = {postgres, service_role} (live `proacl`);
  every caller path into the grid executes as one of those (§5). Grid stays non-SECDEF,
  owner postgres, ACL unchanged.
- **search_path:** the live function has `proconfig: null` (no pin) — a pre-existing nit carried
  since v4.13. **This packet deliberately does NOT add a pin** (byte-minimal change; all object
  references are schema-qualified). Named as a carry; PK may order a follow-up lane.
- **Tier: T3** — live PP behaviour change (YouTube allocation), per Convention 3.

## §8 What P-3B is asked to authorise (and nothing else)

1. Run migration `s7_demand_grid_capability_guard_v1` (§2) via `apply_migration`, exactly as
   frozen — after re-verifying the packet hash (P-1) and a clean review chain (P-2).
2. Post-apply: readback of the live grid for both clients (expected: §4 AFTER matrices) +
   `get_week_format_allocation` spot-check for PP (expected: gated allocation) — read-only.
3. On any STOP: rollback migration (§3) is **rehearsal-proven** (§9), byte-exact, self-verifying.

Explicitly NOT in scope: §7 search_path pin · `ice_ro.format_mix_capability_gaps` diagnostic
view (named future T2 lane) · three-way predicate consolidation carry · Track-B/OQ4 (gates
Slice A, not this apply) · any enrolment/reachability expansion (B2 tranches wait for this).

## §9 Pre-freeze live rehearsal record (AHA-07-1 evidence)

Executed 2026-08-01 against live production (project `mbkmaxqhsohbtwsqolns`) as ONE
`BEGIN … ROLLBACK` transaction via `execute_sql` — net-zero mutation, the house-sanctioned
prod dry-run pattern:

1. C-1 baseline gate: PASSED (live md5 == `2dff1dab88fb1f9e3f341ea6f9f843c7`).
2. `s7_txn_guard` written; §2 guarded body applied (transiently).
3. C-4 single-transaction guard: PASSED. C-2 marker: PASSED.
4. **C-3 full 14-row matrix equality: PASSED against live data** — the §2 body, executed for
   real, reproduced the §4 AFTER matrices exactly (both clients, both directions).
5. §3 rollback body applied (transiently); **C-R1: PASSED — restored body md5 byte-exact ==
   baseline** (proves the §3 embedded literal survives `pg_get_functiondef` normalisation).
6. `ROLLBACK` issued; post-rehearsal live readback: md5 == `2dff1dab88fb1f9e3f341ea6f9f843c7`,
   `capability_gated` marker ABSENT — production bit-identical to pre-rehearsal.

The full sequence C-1 → apply → C-4/C-2/C-3 → rollback → C-R1 has therefore executed
successfully once, end-to-end, on the real database. Both AHA findings
(`apply-harness-auditor` shadow run, verdict CONCERNS: AHA-05-1 medium, AHA-07-1 low) are
remediated in this revision: AHA-05-1 by the executable C-4 txn-identity guard, AHA-07-1 by
this record.

---

*Freeze record (appended at freeze): sha256 + hash-checkpoint verdict + review-chain verdicts.*
