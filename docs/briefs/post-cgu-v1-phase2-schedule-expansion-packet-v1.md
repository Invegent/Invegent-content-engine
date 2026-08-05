# Post-CGU-v1 — Phase 2 Schedule Expansion — Apply Packet v1

**Status:** FROZEN pending review chain. **No execution authorized by this document —
a separate, explicit PK production-authorization message is required, per this lane's
standing gate (identical to v11).**

**Scope:** implements exactly the approved matrix in
`post-cgu-v1-phase2-schedule-expansion-proposal-v1.md` §§2–3. 17 row-level mutations,
all currently `enabled=false, format_override=NULL`, flipped to `enabled=true` with a
pinned Layer-1 format (`image_quote` or `text` only). Zero touch to Property Pulse,
zero touch to any client's YouTube, zero touch to CFW/Invegent LinkedIn, zero touch to
NDIS LinkedIn, zero touch to any Layer-2/legacy/carousel/video_* format.

**Provenance:** builds on `post-cgu-v1-optimum-schedule-expansion-packet-v11.md`
(executed 2026-08-04, hash `6f06e950ebff678c46678532f24a0af05c829ea50abc5716e41050048741c8f2`).
This packet's 17 target `schedule_id`s were independently checked against all 102
`schedule_id`s v11 closed — **zero overlap**, verified both by manual cross-reference at
authoring time and by a machine-enforced in-transaction assertion (§5, "no-reopened-v11-row"
check) that runs regardless of how the target list was chosen.

---

## 1. Exact row-level manifest (17 rows)

| # | Client | Platform | Day (0=Sun) | Time | schedule_id | Target format |
|---|---|---|---|---|---|---|
| 1 | ndis-yarns | facebook | 0 | 10:30 | `249a5d06-898c-45f7-abe0-21d1890d5e98` | image_quote |
| 2 | ndis-yarns | facebook | 6 | 10:00 | `e9b518d8-4518-45a9-aa71-bc943e3c04ca` | image_quote |
| 3 | ndis-yarns | facebook | 1 | 10:30 | `1f1fefc4-c28b-4ed5-9ae0-e18e3b2ed8ab` | text |
| 4 | ndis-yarns | facebook | 6 | 10:30 | `400abc22-3bff-4a71-a26e-a78f72f36ff1` | text |
| 5 | ndis-yarns | instagram | 1 | 09:00 | `b687d768-e3eb-4dff-9260-2969ccb681c5` | text |
| 6 | ndis-yarns | instagram | 2 | 09:00 | `346b009a-334f-4ca4-9e2b-6d8b5aa36f86` | text |
| 7 | ndis-yarns | instagram | 3 | 09:00 | `36da26e4-0095-4fc3-9cc2-a0b8680a25cf` | text |
| 8 | ndis-yarns | instagram | 4 | 09:00 | `2f6b57e0-02cb-4de3-b076-f5f0db9c5530` | text |
| 9 | ndis-yarns | instagram | 5 | 09:00 | `f66ba6d1-85db-4a68-8145-ed4ec2eb911e` | text |
| 10 | care-for-welfare-pty-ltd | facebook | 0 | 09:06 | `29d106ce-08d1-41ad-b158-eccca09101a6` | text |
| 11 | care-for-welfare-pty-ltd | facebook | 2 | 11:02 | `40339124-5240-4bd9-9603-1d638c83f9a2` | text |
| 12 | care-for-welfare-pty-ltd | instagram | 0 | 09:06 | `0242e748-bbde-4824-8d80-9825110dd6c5` | text |
| 13 | care-for-welfare-pty-ltd | instagram | 4 | 09:06 | `b4ce3b90-0341-4d8e-8946-2066b4d00803` | text |
| 14 | invegent | facebook | 0 | 08:06 | `030f82cf-fce9-49b7-9185-285a915f2155` | text |
| 15 | invegent | facebook | 6 | 08:06 | `f5005061-3eb6-4c30-990c-fcf2acb24b63` | text |
| 16 | invegent | instagram | 0 | 08:06 | `b7cf0b1d-91e9-498a-82a5-cd186dd6c429` | text |
| 17 | invegent | instagram | 6 | 08:06 | `e2e54e54-ba9f-450d-a81a-e0051194dc15` | text |

Rows 1–2 (image_quote) draw on NDIS's 21-asset background pool (§5 of the proposal).
Every other row is `text` — capability-exempt, zero background-asset dependency, chosen
specifically to avoid the CFW/invegent asset-starvation constraint documented in the
proposal. Rows 5–9, 12–13, 16–17 introduce **Instagram-text as a new rotation** for their
respective clients (no such row previously existed on that platform); this is deliberately
named in the readiness-appearance exception list below (§4) rather than left implicit.

## 2. Before / after volume matrix

| Client | Platform | Before | After | Δ |
|---|---|---|---|---|
| ndis-yarns | facebook | 10 (iq5+txt5) | 14 (iq7+txt7) | +4 |
| ndis-yarns | instagram | 7 (iq7) | 12 (iq7+txt5) | +5 |
| ndis-yarns | linkedin | 14 | 14 | 0 (untouched) |
| ndis-yarns | youtube | 0 | 0 | 0 (untouched) |
| care-for-welfare | facebook | 3 (iq1+txt2) | 5 (iq1+txt4) | +2 |
| care-for-welfare | instagram | 3 (iq3) | 5 (iq3+txt2) | +2 |
| care-for-welfare | linkedin | 5 (txt5) | 5 | 0 (untouched) |
| invegent | facebook | 3 (iq1+txt2) | 5 (iq1+txt4) | +2 |
| invegent | instagram | 3 (iq3) | 5 (iq3+txt2) | +2 |
| invegent | linkedin | 5 (iq1+txt4) | 5 | 0 (untouched) |
| property-pulse | all | 16 | 16 | 0 (untouched) |
| **Total** | | **69** | **86** | **+17** |

---

## 3. SQL — the single, atomic apply transaction

**Execution channel rule (identical to v11):** this entire script — from the first
`BEGIN;` through the terminal `COMMIT;` — MUST be submitted as the `query` parameter of
exactly ONE call to the `mcp__supabase__execute_sql` MCP tool against project
`mbkmaxqhsohbtwsqolns`. Never split across multiple calls, never pasted incrementally,
never chunked by a pooled-connection wrapper.

```sql
BEGIN;

-- ══ Protection A: live client-identity resolution — literal single-row-per-slug guard ══
DO $$
DECLARE v_pp uuid; v_ndis uuid; v_cfw uuid; v_inv uuid;
BEGIN
  BEGIN
    SELECT client_id INTO STRICT v_pp FROM c.client WHERE client_slug='property-pulse' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=property-pulse.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=property-pulse.';
  END;
  IF v_pp IS DISTINCT FROM '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid THEN
    RAISE EXCEPTION 'STOP: property-pulse client_id drifted from the frozen, verified value. Got %.', v_pp; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_ndis FROM c.client WHERE client_slug='ndis-yarns' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=ndis-yarns.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=ndis-yarns.';
  END;
  IF v_ndis IS DISTINCT FROM 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid THEN
    RAISE EXCEPTION 'STOP: ndis-yarns client_id drifted from the frozen, verified value. Got %.', v_ndis; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_cfw FROM c.client WHERE client_slug='care-for-welfare-pty-ltd' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=care-for-welfare-pty-ltd.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=care-for-welfare-pty-ltd.';
  END;
  IF v_cfw IS DISTINCT FROM '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid THEN
    RAISE EXCEPTION 'STOP: care-for-welfare-pty-ltd client_id drifted from the frozen, verified value. Got %.', v_cfw; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_inv FROM c.client WHERE client_slug='invegent' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=invegent.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=invegent.';
  END;
  IF v_inv IS DISTINCT FROM '93494a09-cc89-41d1-b364-cb63983063a6'::uuid THEN
    RAISE EXCEPTION 'STOP: invegent client_id drifted from the frozen, verified value. Got %.', v_inv; END IF;
END $$;

-- ══ 0. Readiness baseline, DETAIL level (Protection B) ══
CREATE TEMP TABLE _readiness_before_detail AS
SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
FROM c.client cl
CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
  AND cell->>'overall_state' = 'ready';

-- ══ Protection B: named EXPECTED new-appearance list — the only cells allowed to newly
-- become ready. Unlike v11 (a containment packet, which permitted named regressions),
-- Phase-2 is expansion-only: ZERO regressions are tolerated anywhere in this packet. ══
CREATE TEMP TABLE _readiness_expected_new_appearances (client_slug text, platform text, format text, reason text);
INSERT INTO _readiness_expected_new_appearances VALUES
  ('ndis-yarns', 'instagram', 'text', 'Phase-2: new text rotation introduced on NDIS Instagram, capability-exempt format'),
  ('care-for-welfare-pty-ltd', 'instagram', 'text', 'Phase-2: new text rotation introduced on CFW Instagram, capability-exempt format'),
  ('invegent', 'instagram', 'text', 'Phase-2: new text rotation introduced on invegent Instagram, capability-exempt format');

-- ══ 1. Pre-image capture (rollback source, §4) ══
CREATE TEMP TABLE _pre_image AS
SELECT schedule_id, client_id, platform, enabled, format_override
FROM c.client_publish_schedule
WHERE schedule_id IN (
  '249a5d06-898c-45f7-abe0-21d1890d5e98','e9b518d8-4518-45a9-aa71-bc943e3c04ca',
  '1f1fefc4-c28b-4ed5-9ae0-e18e3b2ed8ab','400abc22-3bff-4a71-a26e-a78f72f36ff1',
  'b687d768-e3eb-4dff-9260-2969ccb681c5','346b009a-334f-4ca4-9e2b-6d8b5aa36f86',
  '36da26e4-0095-4fc3-9cc2-a0b8680a25cf','2f6b57e0-02cb-4de3-b076-f5f0db9c5530',
  'f66ba6d1-85db-4a68-8145-ed4ec2eb911e',
  '29d106ce-08d1-41ad-b158-eccca09101a6','40339124-5240-4bd9-9603-1d638c83f9a2',
  '0242e748-bbde-4824-8d80-9825110dd6c5','b4ce3b90-0341-4d8e-8946-2066b4d00803',
  '030f82cf-fce9-49b7-9185-285a915f2155','f5005061-3eb6-4c30-990c-fcf2acb24b63',
  'b7cf0b1d-91e9-498a-82a5-cd186dd6c429','e2e54e54-ba9f-450d-a81a-e0051194dc15'
);

-- ══ 2. Durable rollback persistence — bare CREATE TABLE, unique packet identifier ══
-- Distinct from BOTH the v10/v11 rollback tables (…_v10_20260804[_cfg]) — cannot collide.
CREATE TABLE c._rollback_post_cgu_v1_phase2_20260804 AS SELECT * FROM _pre_image;

-- ══ 3. Frozen expected-ownership + expected-final-state dataset (AHA-10-1-safe pattern,
-- carried forward from v11) — independent of the live rows being validated. ══
CREATE TEMP TABLE _expected_ownership (
  schedule_id uuid, expected_client_id uuid, expected_client_slug text, expected_platform text,
  expected_pre_enabled boolean, expected_pre_format text, expected_after_format text
);
INSERT INTO _expected_ownership VALUES
  ('249a5d06-898c-45f7-abe0-21d1890d5e98', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', false, NULL, 'image_quote'),
  ('e9b518d8-4518-45a9-aa71-bc943e3c04ca', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', false, NULL, 'image_quote'),
  ('1f1fefc4-c28b-4ed5-9ae0-e18e3b2ed8ab', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', false, NULL, 'text'),
  ('400abc22-3bff-4a71-a26e-a78f72f36ff1', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', false, NULL, 'text'),
  ('b687d768-e3eb-4dff-9260-2969ccb681c5', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', false, NULL, 'text'),
  ('346b009a-334f-4ca4-9e2b-6d8b5aa36f86', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', false, NULL, 'text'),
  ('36da26e4-0095-4fc3-9cc2-a0b8680a25cf', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', false, NULL, 'text'),
  ('2f6b57e0-02cb-4de3-b076-f5f0db9c5530', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', false, NULL, 'text'),
  ('f66ba6d1-85db-4a68-8145-ed4ec2eb911e', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', false, NULL, 'text'),
  ('29d106ce-08d1-41ad-b158-eccca09101a6', '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'care-for-welfare-pty-ltd', 'facebook', false, NULL, 'text'),
  ('40339124-5240-4bd9-9603-1d638c83f9a2', '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'care-for-welfare-pty-ltd', 'facebook', false, NULL, 'text'),
  ('0242e748-bbde-4824-8d80-9825110dd6c5', '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'care-for-welfare-pty-ltd', 'instagram', false, NULL, 'text'),
  ('b4ce3b90-0341-4d8e-8946-2066b4d00803', '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'care-for-welfare-pty-ltd', 'instagram', false, NULL, 'text'),
  ('030f82cf-fce9-49b7-9185-285a915f2155', '93494a09-cc89-41d1-b364-cb63983063a6', 'invegent', 'facebook', false, NULL, 'text'),
  ('f5005061-3eb6-4c30-990c-fcf2acb24b63', '93494a09-cc89-41d1-b364-cb63983063a6', 'invegent', 'facebook', false, NULL, 'text'),
  ('b7cf0b1d-91e9-498a-82a5-cd186dd6c429', '93494a09-cc89-41d1-b364-cb63983063a6', 'invegent', 'instagram', false, NULL, 'text'),
  ('e2e54e54-ba9f-450d-a81a-e0051194dc15', '93494a09-cc89-41d1-b364-cb63983063a6', 'invegent', 'instagram', false, NULL, 'text');

-- ══ 4. Pre-existing invariant baselines (must not move — defense in depth) ══
CREATE TEMP TABLE _pp_total_baseline AS
SELECT count(*) AS cnt FROM c.client_publish_schedule
WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND enabled = true;

CREATE TEMP TABLE _pp_carousel_config_baseline AS
SELECT count(*) AS cnt FROM c.client_format_config
WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true;

CREATE TEMP TABLE _cfw_li_image_quote_baseline AS
SELECT count(*) AS cnt FROM c.client_publish_schedule
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'linkedin'
  AND format_override = 'image_quote' AND enabled = true;

CREATE TEMP TABLE _ndis_yt_baseline AS
SELECT count(*) AS cnt FROM c.client_publish_schedule
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform = 'youtube' AND enabled = true;

CREATE TEMP TABLE _ndis_li_baseline AS
SELECT count(*) AS cnt FROM c.client_publish_schedule
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform = 'linkedin' AND enabled = true;

-- ══ 5. CAS guard — the 17 target rows exactly match frozen pre-state; the v11 closure
-- boundary and every untouched-platform baseline are re-verified before any mutation. ══
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM _pre_image;
  IF v_count <> 17 THEN
    RAISE EXCEPTION 'CAS FAIL: expected 17 pre-image rows, found %. Data has drifted since packet freeze — ABORT.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM _expected_ownership;
  IF v_count <> 17 THEN
    RAISE EXCEPTION 'CAS FAIL: frozen ownership dataset itself has % rows, expected 17. Authoring error — ABORT.', v_count;
  END IF;

  -- Every frozen row must match LIVE ownership + exact pre-state (disabled, NULL format)
  SELECT count(*) INTO v_count
  FROM _expected_ownership eo
  JOIN c.client_publish_schedule cps ON cps.schedule_id = eo.schedule_id
  WHERE cps.client_id = eo.expected_client_id
    AND cps.platform = eo.expected_platform
    AND cps.enabled = eo.expected_pre_enabled
    AND cps.format_override IS NOT DISTINCT FROM eo.expected_pre_format;
  IF v_count <> 17 THEN
    RAISE EXCEPTION 'CAS FAIL: only % of 17 frozen rows matched live ownership+pre-state exactly — missing, extra, already-enabled, or wrong-owner row detected. ABORT, re-derive, do not proceed.', v_count;
  END IF;

  -- Hard guard: none of the 17 targets may be one of the 102 rows v11 already closed
  SELECT count(*) INTO v_count
  FROM _expected_ownership eo
  JOIN c._rollback_post_cgu_v1_schedule_v10_20260804 r ON r.schedule_id = eo.schedule_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: % of the 17 Phase-2 targets are rows v11 already closed — reopening a v11 closure is forbidden. ABORT.', v_count;
  END IF;

  -- Hard guard: zero v11-closed rows are currently enabled (pre-existing invariant, checked before we add anything)
  SELECT count(*) INTO v_count
  FROM c._rollback_post_cgu_v1_schedule_v10_20260804 r
  JOIN c.client_publish_schedule cps ON cps.schedule_id = r.schedule_id
  WHERE cps.enabled = true;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: % of v11''s 102 closed rows are currently enabled=true — pre-existing drift outside this packet''s control. ABORT, investigate before proceeding.', v_count;
  END IF;

  -- Baselines: PP untouched, CFW LI image_quote stays 0, NDIS YT stays 0, NDIS LI stays 14
  IF (SELECT cnt FROM _pp_total_baseline) <> 16 THEN
    RAISE EXCEPTION 'CAS FAIL: expected Property Pulse total enabled rows = 16 before this packet, got %. Re-derive.', (SELECT cnt FROM _pp_total_baseline);
  END IF;
  IF (SELECT cnt FROM _pp_carousel_config_baseline) <> 1 THEN
    RAISE EXCEPTION 'CAS FAIL: expected PP carousel config row enabled=true (1), got %. Re-derive.', (SELECT cnt FROM _pp_carousel_config_baseline);
  END IF;
  IF (SELECT cnt FROM _cfw_li_image_quote_baseline) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: expected CFW LinkedIn image_quote enabled rows = 0 before this packet, got %. Re-derive.', (SELECT cnt FROM _cfw_li_image_quote_baseline);
  END IF;
  IF (SELECT cnt FROM _ndis_yt_baseline) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: expected NDIS YouTube enabled rows = 0 before this packet, got %. Re-derive.', (SELECT cnt FROM _ndis_yt_baseline);
  END IF;
  IF (SELECT cnt FROM _ndis_li_baseline) <> 14 THEN
    RAISE EXCEPTION 'CAS FAIL: expected NDIS LinkedIn enabled rows = 14 before this packet, got %. Re-derive.', (SELECT cnt FROM _ndis_li_baseline);
  END IF;
END $$;

-- ══ 6. The guarded UPDATE — single statement, joined to the frozen ownership dataset ══
UPDATE c.client_publish_schedule cps
SET enabled = true, format_override = eo.expected_after_format
FROM _expected_ownership eo
WHERE cps.schedule_id = eo.schedule_id
  AND cps.client_id = eo.expected_client_id
  AND cps.platform = eo.expected_platform;

-- ══ 7. Post-image assertions ══
DO $$
DECLARE v_count int;
BEGIN
  -- All 17 rows landed exactly on their frozen target (ownership-independent join, not self-referential)
  SELECT count(*) INTO v_count
  FROM _expected_ownership eo
  JOIN c.client_publish_schedule cps ON cps.schedule_id = eo.schedule_id
  WHERE cps.client_id IS DISTINCT FROM eo.expected_client_id
     OR cps.platform IS DISTINCT FROM eo.expected_platform
     OR cps.enabled IS DISTINCT FROM true
     OR cps.format_override IS DISTINCT FROM eo.expected_after_format;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: % of the 17 rows did not land on their expected final state (or ownership drifted).', v_count; END IF;

  -- Missing/extra check
  SELECT count(*) INTO v_count
  FROM _expected_ownership eo
  WHERE EXISTS (SELECT 1 FROM c.client_publish_schedule cps WHERE cps.schedule_id = eo.schedule_id AND cps.client_id = eo.expected_client_id);
  IF v_count <> 17 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: only % of 17 frozen rows still exist under their expected owner post-apply.', v_count; END IF;

  -- Re-verify: still zero v11-closed rows enabled (this packet must not have touched them)
  SELECT count(*) INTO v_count
  FROM c._rollback_post_cgu_v1_schedule_v10_20260804 r
  JOIN c.client_publish_schedule cps ON cps.schedule_id = r.schedule_id
  WHERE cps.enabled = true;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'STOP: % of v11''s 102 closed rows are now enabled=true post-apply — a v11 closure was reopened. Automatic abort.', v_count;
  END IF;

  -- Property Pulse, CFW LI image_quote, NDIS YT, NDIS LI — byte-identical to baseline
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND enabled = true;
  IF v_count <> (SELECT cnt FROM _pp_total_baseline) THEN
    RAISE EXCEPTION 'STOP: Property Pulse total enabled rows changed % -> % — this packet must not touch PP at all.', (SELECT cnt FROM _pp_total_baseline), v_count;
  END IF;

  SELECT count(*) INTO v_count FROM c.client_format_config
    WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true;
  IF v_count <> (SELECT cnt FROM _pp_carousel_config_baseline) THEN
    RAISE EXCEPTION 'STOP: PP carousel config lever changed — must stay untouched, declared-legacy D2.';
  END IF;

  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'linkedin' AND format_override = 'image_quote' AND enabled = true;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'STOP: CFW LinkedIn image_quote is now schedulable (% rows) — this format stays supervised on this platform per PK ruling.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform = 'youtube' AND enabled = true;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'STOP: NDIS YouTube has % enabled rows post-apply — zero unattended volume is a standing, non-negotiable rule.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform = 'linkedin' AND enabled = true;
  IF v_count <> (SELECT cnt FROM _ndis_li_baseline) THEN
    RAISE EXCEPTION 'STOP: NDIS LinkedIn enabled count changed % -> % — this packet does not touch LinkedIn.', (SELECT cnt FROM _ndis_li_baseline), v_count;
  END IF;

  -- Total scope sanity
  SELECT count(*) INTO v_count FROM c.client_publish_schedule WHERE schedule_id IN (SELECT schedule_id FROM _pre_image);
  IF v_count <> 17 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: expected 17 rows in scope, found %.', v_count; END IF;
END $$;

-- ══ Protection B: readiness — zero regressions tolerated; only the 3 named appearances allowed ══
DO $$
DECLARE v_regressions int; v_unexpected_appearance int;
BEGIN
  CREATE TEMP TABLE _readiness_after_detail AS
  SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
  FROM c.client cl
  CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
  WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
    AND cell->>'overall_state' = 'ready';

  SELECT count(*) INTO v_regressions
  FROM _readiness_before_detail b
  WHERE NOT EXISTS (SELECT 1 FROM _readiness_after_detail a WHERE a.client_slug=b.client_slug AND a.platform=b.platform AND a.format=b.format);
  IF v_regressions <> 0 THEN
    RAISE EXCEPTION 'STOP: % cell(s) regressed from ready to not-ready — zero regressions are tolerated in an expansion-only packet. Automatic abort.', v_regressions;
  END IF;

  SELECT count(*) INTO v_unexpected_appearance
  FROM _readiness_after_detail a
  WHERE NOT EXISTS (SELECT 1 FROM _readiness_before_detail b WHERE b.client_slug=a.client_slug AND b.platform=a.platform AND b.format=a.format)
    AND NOT EXISTS (SELECT 1 FROM _readiness_expected_new_appearances e WHERE e.client_slug=a.client_slug AND e.platform=a.platform AND e.format=a.format);
  IF v_unexpected_appearance <> 0 THEN
    RAISE EXCEPTION 'STOP: % cell(s) became newly ready outside the 3 named expected appearances (NDIS/CFW/invegent Instagram text) — unexpected side effect, not authorized by this packet.', v_unexpected_appearance;
  END IF;
END $$;

COMMIT;
```

---

## 4. Rollback plan

`c._rollback_post_cgu_v1_phase2_20260804` holds the exact 17-row pre-image
(`schedule_id, client_id, platform, enabled=false, format_override=NULL`). Inverse apply,
if ever needed:

```sql
BEGIN;
UPDATE c.client_publish_schedule cps
SET enabled = r.enabled, format_override = r.format_override
FROM c._rollback_post_cgu_v1_phase2_20260804 r
WHERE cps.schedule_id = r.schedule_id AND cps.client_id = r.client_id;
COMMIT;
```

## 5. STOP conditions (enumerated, all machine-enforced above)

1. Any of the 17 pre-image rows count ≠ 17 (drift since freeze).
2. Frozen ownership dataset itself ≠ 17 rows (authoring error).
3. Any of the 17 rows fails to match live ownership + exact pre-state (missing/extra/already-enabled/wrong-owner).
4. Any of the 17 targets is one of the 102 rows v11 already closed.
5. Any of v11's 102 closed rows is found enabled=true **before** this packet runs (pre-existing drift, unrelated to this packet, but must be investigated first).
6. Any of the 17 rows fails to land on its exact frozen final state post-UPDATE.
7. Any of v11's 102 closed rows is found enabled=true **after** this packet runs (a v11 closure was reopened).
8. Property Pulse total enabled-row count changes at all.
9. PP carousel config lever changes.
10. CFW LinkedIn image_quote becomes schedulable (>0 enabled).
11. NDIS YouTube has any enabled row.
12. NDIS LinkedIn enabled count changes.
13. Any readiness cell regresses from ready to not-ready (zero tolerance this packet).
14. Any readiness cell becomes newly ready outside the 3 named expected appearances.
15. Native PostgreSQL DDL error on `CREATE TABLE c._rollback_post_cgu_v1_phase2_20260804` (naming collision — aborts automatically, not a `RAISE EXCEPTION`).

Any STOP triggers automatic `ROLLBACK` — no partial apply is possible.

---

**Next steps (not yet done):** `apply-harness-auditor` (static, shadow mode) and
`branch-warden` review, then a hash-pinned `ask_chatgpt_review` (mandatory — this packet
is DML). Execution requires a separate, explicit PK production-authorization message
naming this exact file and its frozen hash, per this lane's standing gate.
