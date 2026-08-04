# post-cgu-v1-optimum-schedule-expansion — Frozen Apply Packet v5

**Status: FROZEN FOR REVIEW. v4 is REJECTED (INCOMPLETE verdict, `apply-harness-auditor`) — none of its
review results carry forward. NOT AUTHORIZED FOR LIVE APPLY. A PK execution gate follows review
completion. This packet is Sections 0–6; Section 7 (review results) is appended after Sections 0–6 are
hashed and must never cause that hash to change.**

Two independent problem classes are fixed in this version: (A) five `apply-harness-auditor` findings
against v4's SQL harness (AHA-V4-01 through AHA-V4-05), and (B) a carousel-provenance gap surfaced by a
four-client bounded investigation PK ordered before allowing any refreeze — v4's carousel-protection
logic checked the wrong table for one client (NDIS) and left that client's real, live containment
mechanism completely untouched.

---

## 0. Carousel-provenance investigation — summary and disposition

Full investigation recorded as an addendum to `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md`
§12 (2026-08-04, same day, read-only, zero mutations). Four parallel `db-rls-auditor` investigations, one
per client, each answering 8 fixed questions (latest activity, timing vs config, draft-creation/render
path, schedule lineage, whether governance/config/TMR was actually consulted, the real permitting/
preventing mechanism, current 7d/14d volume, and whether this packet could plausibly increase it).

| Client | Disposition | Real control (code-verified, not assumed) | Action in v5 |
|---|---|---|---|
| property-pulse | `live_legacy_route` | `c.client_format_config` row `fc339e1e-5809-4b9c-9c03-2c60a4166a80` (carousel, `is_enabled`) — consumed at `ai-worker/index.ts:1193-1196`. Genuinely live (40 drafts/90d), matches this cell's own D2 declared-legacy status. | **No change to the row** (intentionally declared-legacy, D2-accepted) — but now explicitly asserted byte-identical before/after (§3.2 Step 6), closing the gap where v4 protected only the schedule table, not the actual lever. |
| ndis-yarns | `live_legacy_route` | Same mechanism, but NDIS's carousel row (`61e4f143-f0cf-4a9b-853c-f592daf82aaf`) is still `is_enabled=true`, never touched by v4. Current silence is an **incidental** render-time `select_template` fail-closed gap, not a real control — could resume with zero further change. | **New Change 11**: disable this row. v4's Step 6 assertion checked **CFW's** config row instead of NDIS's own — a real bug, now fixed to check the correct client. |
| care-for-welfare-pty-ltd | `historical_route_now_contained` | `client_format_config` row-*presence* itself is the mechanism: 0 rows → fail-open (all formats offered); CFW went from 0→2 rows (`image_quote`,`text`) on 2026-08-02, flipping the code to a strict allowlist that excludes carousel. Zero activity in 7d/14d. | No mutation (not this packet's to make) — but a **new existence-guard assertion**: those 2 rows must remain present+enabled, since deletion (not disablement) would silently reopen the palette. |
| invegent | `historical_route_now_contained` | Identical mechanism, holding 8/8 real drafts since 2026-08-02. (Correction to the M11a result: Invegent's historical "5 succeeded" carousel figure was slide-render successes, not delivered posts — 2 voided, 3 downgraded to plain text by a since-fixed Zapier bug.) | Same existence-guard pattern as CFW. |

**Also confirmed, independently, by all four investigations**: `c.client_publish_schedule.format_override`
is **never read by any edge function in this repository** (repo-wide grep, zero matches across all four
investigations). It has no effect on format selection. The only live, effective gate for carousel
eligibility — for every client — is `c.client_format_config`. This packet's schedule-row mutations
(Changes 1–9) change posting cadence and mix among already-eligible formats; they cannot open or close
carousel eligibility in either direction. This is now a structurally-confirmed fact, not an assumption,
and directly answers PK's "could v4 directly or indirectly increase carousel" question for all four
clients: **no**, by construction, independent of anything else in this packet.

No client returned `unable_to_prove_containment`, so no schedule mutation needs to be stripped from this
packet under that branch of PK's instruction — but NDIS's `live_legacy_route` finding required a real
fix (Change 11), not just a note.

---

## 1. Fixes to `apply-harness-auditor`'s v4 findings

| Finding | v4 defect | v5 fix |
|---|---|---|
| AHA-V4-01 (INCOMPLETE trigger) | No statement named the single-call execution channel this transaction depends on | Explicit operator instruction added directly above §3.2's SQL (§3.2 preamble): this entire block must be submitted as ONE call, never split |
| AHA-V4-02 | "Single-row-per-slug guard" was claimed but actually implemented as an aggregate `count(*)=4` check plus non-STRICT `SELECT INTO` (silently takes the first row on a hypothetical duplicate) | Replaced with `SELECT ... INTO STRICT` per slug (§3.2 Step 1) — Postgres natively raises `NO_DATA_FOUND`/`TOO_MANY_ROWS` on zero or multiple matches, literally implementing the guard as described, not incidentally |
| AHA-V4-03 | §1's fix-mapping table cited "Step 7" for the carousel-protection fix; the actual code is in "Step 6" | Corrected in this table (§3.2 headers are now internally consistent throughout this document) |
| AHA-V4-04 | 2 of 4 captured carousel-baseline values (`ndis_carousel_enabled`, `cfw_carousel_config_enabled`) were captured but never read back — dead data; the CFW baseline also turned out to be checking a row that doesn't exist (CFW has no carousel row at all) | Every baseline captured in §3.2 Step 2 is now read and compared in Step 6 — none dead. The CFW/Invegent checks were redefined from "carousel row is_enabled" (meaningless — no such row exists) to "the 2 rows that ARE the containment mechanism remain present+enabled" (§0 above) |
| AHA-V4-05 | (no defect — already correctly disclosed) | Unchanged; STOP conditions #10-11 remain honestly labeled human/pre-flight-run |

---

## 2. Scope note (carried from v4, unchanged in substance)

"25/25 must not regress" means `state_1_capability_proven` (proof-event-based, immutable under this
packet's mutations), not the live R1 `overall_state='ready'` queue snapshot — which will correctly show
NDIS YT `video_short_stat` and now NDIS carousel as less/no-longer schedulable, by design, as part of
the Layer-2 demotion and the new carousel closure. See `packet-v4.md` §2 for the full explanation; the
reasoning is unchanged.

---

## 3. Frozen manifest and CAS-guarded SQL

### 3.1 Manifest (Changes 1–10 unchanged from v4, zero drift re-confirmed within this session; Change 11 new)

| # | Target | Client | Scope | Rows | Action |
|---|---|---|---|---|---|
| 1 | `client_publish_schedule` | ndis-yarns | FB+IG uncommitted-format + 1 NULL-safety row | 39 | `enabled=false` |
| 2 | `client_publish_schedule` | ndis-yarns | All YouTube rows | 28 | `enabled=false` |
| 3 | `client_publish_schedule` | care-for-welfare-pty-ltd | Facebook | 5 | mix + reduce |
| 4 | `client_publish_schedule` | care-for-welfare-pty-ltd | Instagram | 5 | reduce |
| 5 | `client_publish_schedule` | care-for-welfare-pty-ltd | LinkedIn | 5 | force `text` (Layer-2) |
| 6 | `client_publish_schedule` | invegent | Facebook | 5 | mix + reduce |
| 7 | `client_publish_schedule` | invegent | Instagram | 5 | reduce |
| 8 | `client_publish_schedule` | invegent | LinkedIn | 5 | force 4-text/1-image |
| 9 | `client_publish_schedule` | property-pulse | YouTube | 5 | reduce, force `video_short_stat` (Layer-2) |
| 10 | `client_format_config` | property-pulse + ndis-yarns | 4 format keys × 2 clients (hygiene) | 8 | `is_enabled=false` |
| **11 (NEW)** | `client_format_config` | ndis-yarns | 1 row: `carousel` | **1** | `is_enabled=false` — closes the live carousel route, §0 |
| | | | **Schedule total: 102** | **Config total: 9** | **Grand total: 111** (never asserted as one combined number — same discipline as the v4 fix) |

### 3.2 Corrected CAS-guarded single-transaction SQL

**Execution channel (fixes AHA-V4-01 — mandatory, not advisory): this entire block, from the first
`BEGIN` to the final `COMMIT`, MUST be submitted as ONE call to the database** — one
`mcp__supabase__execute_sql` invocation, or one `psql -f` file execution. **Never split across multiple
tool calls or multiple round-trips.** `TEMP TABLE` state (`_resolved_clients`, `_pre_image_schedule`,
etc.) and transaction/session identity do not survive a split — if this text is ever chunked across
separate calls, later statements will fail hard with "relation does not exist" (a safe, loud failure,
not a silent one, but still a failure this note exists to prevent in the first place).

```sql
BEGIN;

-- ============================================================
-- STEP 1: Resolve all 4 client identities LIVE, by slug — literal single-row-per-slug guard (fixes AHA-V4-02)
-- ============================================================
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

  CREATE TEMP TABLE _resolved_clients (client_id uuid, client_slug text);
  INSERT INTO _resolved_clients VALUES
    (v_pp, 'property-pulse'), (v_ndis, 'ndis-yarns'),
    (v_cfw, 'care-for-welfare-pty-ltd'), (v_inv, 'invegent');
END $$;

-- ============================================================
-- STEP 2: Pre-image capture — schedule (102) and config (9, was 8) as SEPARATE, correctly-scoped counts
-- ============================================================
CREATE TEMP TABLE _pre_image_schedule AS
SELECT schedule_id, client_id, platform, day_of_week, publish_time, enabled, format_override
FROM c.client_publish_schedule
WHERE schedule_id IN (
  -- NDIS FB+IG (39) — Change 1
  '3404a622-c796-4f42-85d7-dadd8c61e8d8','b68d689e-4b41-4e66-988f-9dd2090019a7',
  '760e45d9-542c-4b8b-b329-53ba77c22381','965b3d09-d297-4479-9249-7957b13be7a3',
  '3e044993-6839-457c-a9fa-57038006c1eb','722a79b0-8279-4021-9158-d742797f4309',
  '5da5170b-a299-47d4-a4ac-d748e5f5210d','6fee130f-3fd6-473c-8c1c-1f1106c95f86',
  '792b5730-37f1-485d-8630-e6d2efdb2d33','afcf6ede-d8e8-4577-9975-f165a75444ca',
  '3eea8e57-2372-4992-852f-69181d2ec9b4','515d29ae-e733-4baf-ab4a-05789b634a9b',
  '00200f6e-01ee-4af0-b783-5b0c56648668','c4b040ea-a461-4213-9db2-b5e5f507e4e8',
  '3e273d85-7779-4a79-bea7-9504900f1559','e850df9f-9e9f-478b-86a7-36a63db09f6a',
  '9454330d-0a6e-492c-b683-4d59652f0887','fcc9042d-1132-4955-bccd-efa67fb24ab5',
  'cb022c88-38af-48ec-a584-aae32dc4c03d','00e1c92b-cdae-482d-809a-697309db5d7c',
  'd2d87149-4440-43c9-a4b3-8ac434cc93b9','633db37f-d79a-4653-9794-e91cf6807ab6',
  'a69bdae4-f040-4a03-ab37-20cb9b45253c','f3092ee5-3fdf-408e-a4e0-29a5b72215d4',
  '39d5ac62-c953-48e9-bea7-29ab9eec4038','11890abb-02ae-46db-a5b1-55891b8b75da',
  'ed82fd5c-3f13-4394-a3a1-f3c33429673f','ef0677a9-e87b-4a04-8a06-6b6b36562d86',
  'f0e3664f-417f-46d6-b57e-e85105252469','ff35d328-f5bf-4b53-aefc-334745d79b99',
  'c038a040-b3cc-4fdc-91d3-dfa925efc1e5','bef7d0d6-f1d4-4851-a0c1-c52414d81b38',
  'fcb62704-8563-41fc-a162-b6c055f877c0','953b8fea-a1cb-4e52-888c-71e0e68f8535',
  '2fe80416-c4fb-47d8-b8c9-1e5e55d5828f','14d73efc-6d43-4aff-a4e6-58df436d105c',
  '747b5c92-61b9-4745-9ef5-2df4bd3e25e2','2c0d8f18-b8ed-408c-9240-59c2d93f1655',
  'd3c96a3c-e8c4-4132-a57d-e760bc6de9c1',
  -- NDIS YT (28) — Change 2
  'cc78b906-62f2-43ab-9cec-402bc5d54275','2204aa6c-e153-414d-ad3c-f8f38d8cc386',
  '95153ba2-ff9c-4846-b920-ab9c1cce8857','e5d4dd4c-aace-460f-ab90-f3e0bf5fea73',
  '2209a43a-2577-41cd-a7e5-90075b07af77','eb31b6dc-0b90-43aa-a5be-793f6c3d2be8',
  '48469965-41fd-4dd5-895a-de6eb8df54d0','5b2cdba0-03a3-407c-a123-7abbeb8971f1',
  '8ecb3dca-98d3-47ed-94d3-58e6ca564e15','27032abb-8d4a-4a96-88a8-5a07b0cba40b',
  '713252b4-510a-4f04-995c-e85e6736e0f7','ba95b4ab-666f-45c0-9f00-cc72b88155a5',
  '46a1d126-2933-4da9-b45c-78670f92ed2c','f040361b-e897-4135-af0f-38ab94d8857d',
  '60262d20-42a3-4b0a-8e31-f27bb9e11384','33dfa214-bd09-455d-807c-75dc1bb12f64',
  'deb81600-90e0-494c-b7f6-af551b6f07f9','5d63f6da-b57b-40c3-834b-a0aa9499c913',
  '5c31ac01-c310-4b39-ae87-a3c1157d0339','b9b53d59-92be-4b39-a0e5-b9e40fec39ad',
  '11fe1ffd-747d-4e9d-869c-d9523048a301','005825db-a3e7-4a29-9691-3f1c1982bb54',
  '051762a3-c517-44ab-96cf-c73cd6a18350','d8d77bce-e041-4c22-bde4-94f3356bd71b',
  '8f66f05b-5be3-4e81-bcdc-6772c10087f6','67656b73-3e83-4233-a5c7-b9b201dc7705',
  '5d65eb5e-6aa3-4085-9e0f-54af94d5e9fd','3824b3f4-af5c-4ec0-b664-268d25dd69ce',
  -- CFW/Invegent/PP (35) — Changes 3-9
  '433c52c1-9385-4a5e-83ae-96c5c603f915','cb3e86fa-0b7b-4ab0-8b98-93de30bc699f',
  'f9e49b40-9e04-4548-860f-875c907ad8d8','6966af5b-5a2e-4f0c-81e0-0e20b3c6afb1',
  '90b8583e-b77d-498d-ba03-52e64c727a6b','e2024323-c0e0-468d-ac84-ff7e6cc90c66',
  '9e0ce8da-861a-4b22-ab5e-415d1330e6dc','544a05d8-bcb4-4c36-a336-ebfc99237d54',
  'ce03f531-b40c-4705-b40d-1480c78aa48b','525ab2af-cb29-4a4b-a7e6-d85597838410',
  '4bb57dbb-fa45-40a4-a749-2ff4ca39f2ce','0a3958a8-87e5-48fe-8ab9-aeb6b57cf9d4',
  'fd359088-507c-4b83-80da-b4736c51e64f','9e826d46-29e3-40da-839a-ca19bf61bfe7',
  '8ad8f4e9-a07e-41ad-873f-852287846daa','1fd9a842-4db0-4292-a760-8155874b33ac',
  'a7ea2dc4-8adf-439b-9d9e-ba985fce5548','c1abb720-4060-496d-8312-97cb9286c04d',
  '1bddacbc-af9c-4adb-b764-b9d44c75b44b','5ad2665f-c0f8-4add-a6fe-b876c4bceeba',
  '8f6c2266-8e37-4ba0-b1b6-57434432f4ff','6c52b1d4-bdbc-48fc-9e21-9b5d139b70f8',
  'fd8aae40-6c75-4dcb-bb2b-6ae36e51793e','3fb1c2e6-b427-4b5d-bd7b-589e38663f0d',
  'ff5927b4-184d-4a57-948d-7623e75f7008','b66abd5a-5541-4de0-acfa-60a53d36bb9b',
  '1a6c4fde-030e-44f4-9d22-9ca00b4c9fa1','10fb5b91-c580-4a10-bb5a-625fec75ff37',
  'e22560a5-d584-468f-8c9d-accc921c330a','135a32a0-4a45-4687-af3a-839b40eb6cf2',
  'e951069c-e995-4cc8-a56e-b4c33291683f','abdc58c4-8aff-4483-bd91-bc2c248b6932',
  'f1cc1c32-0759-4ab7-a748-a70f8ae9aade','71a9fbd3-7ed1-41f9-b776-b63adfa3ad8b',
  'bf705fed-6f90-49c8-becd-10b07c64b09c'
);

CREATE TEMP TABLE _pre_image_config AS
SELECT config_id, client_id, ice_format_key, is_enabled
FROM c.client_format_config
WHERE config_id IN (
  'ca8a085d-7abb-47b8-a32f-4357ca74c479','e3edf302-97ec-4a6d-9eb2-b26b11b567a9',
  'da5b5c8c-ab31-433f-8069-b6562d8461c9','2a1932a9-08d2-4ad4-8b7d-c89b54e469b9',
  '8a2df44a-ee15-4795-8ce5-fc2019cec716','fdb3fc40-8374-439c-b67c-763121ac9961',
  '487dcde2-c313-4725-a4e1-6c1d8aa8a070','a6f0a8bd-e14c-4a90-9f68-ec2e5006f233',
  '61e4f143-f0cf-4a9b-853c-f592daf82aaf'  -- NEW: NDIS carousel, Change 11
);

-- Baseline captures for the carousel-protection assertions (§0 — every row here is read back in Step 6)
CREATE TEMP TABLE _pre_image_baseline AS
SELECT 'pp_fb_ig_total' AS metric, count(*) AS v FROM c.client_publish_schedule
  WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='property-pulse')
    AND platform IN ('facebook','instagram')
UNION ALL
SELECT 'pp_fb_ig_enabled', count(*) FROM c.client_publish_schedule
  WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='property-pulse')
    AND platform IN ('facebook','instagram') AND enabled = true
UNION ALL
SELECT 'pp_carousel_config_enabled', count(*) FROM c.client_format_config
  WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true
UNION ALL
SELECT 'ndis_carousel_schedule_enabled', count(*) FROM c.client_publish_schedule
  WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='ndis-yarns')
    AND format_override = 'carousel' AND enabled = true
UNION ALL
SELECT 'ndis_carousel_config_enabled', count(*) FROM c.client_format_config
  WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf' AND is_enabled = true
UNION ALL
SELECT 'cfw_config_rows_present', count(*) FROM c.client_format_config
  WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='care-for-welfare-pty-ltd')
    AND ice_format_key IN ('image_quote','text') AND is_enabled = true
UNION ALL
SELECT 'invegent_config_rows_present', count(*) FROM c.client_format_config
  WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='invegent')
    AND ice_format_key IN ('image_quote','text') AND is_enabled = true;

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM _pre_image_schedule;
  IF v_count <> 102 THEN
    RAISE EXCEPTION 'CAS FAIL: expected exactly 102 pre-image schedule rows, found %. Data has drifted since packet freeze — ABORT.', v_count; END IF;

  SELECT count(*) INTO v_count FROM _pre_image_config;
  IF v_count <> 9 THEN
    RAISE EXCEPTION 'CAS FAIL: expected exactly 9 pre-image config rows, found %. ABORT.', v_count; END IF;

  SELECT count(*) INTO v_count FROM _pre_image_schedule WHERE enabled = false;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: % of the 102 target schedule rows were already disabled. ABORT, re-derive.', v_count; END IF;

  SELECT count(*) INTO v_count FROM _pre_image_config WHERE is_enabled = false;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: % of the 9 target config rows were already disabled. ABORT.', v_count; END IF;

  SELECT count(*) INTO v_count FROM _pre_image_baseline;
  IF v_count <> 7 THEN
    RAISE EXCEPTION 'CAS FAIL: expected exactly 7 baseline metrics captured, found %. ABORT.', v_count; END IF;
END $$;

-- ============================================================
-- STEP 3: Persist pre-image to DURABLE storage before any mutation
-- ============================================================
CREATE TABLE public._rollback_pcgu_v5_schedule AS SELECT * FROM _pre_image_schedule;
REVOKE ALL ON public._rollback_pcgu_v5_schedule FROM PUBLIC, anon, authenticated;
CREATE TABLE public._rollback_pcgu_v5_config AS SELECT * FROM _pre_image_config;
REVOKE ALL ON public._rollback_pcgu_v5_config FROM PUBLIC, anon, authenticated;

-- ============================================================
-- STEP 4: Mutations, each with a per-change expected-row-count assertion
-- ============================================================

-- Change 1: NDIS FB+IG cleanup (expect 39)
DO $$
DECLARE v_count int;
BEGIN
  UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN (
    SELECT schedule_id FROM _pre_image_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='ndis-yarns')
      AND platform IN ('facebook','instagram'));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 39 THEN RAISE EXCEPTION 'CHANGE 1 FAIL: expected 39 rows updated, got %.', v_count; END IF;
END $$;

-- Change 2: NDIS YouTube full disable (expect 28)
DO $$
DECLARE v_count int;
BEGIN
  UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN (
    SELECT schedule_id FROM _pre_image_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='ndis-yarns')
      AND platform = 'youtube');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 28 THEN RAISE EXCEPTION 'CHANGE 2 FAIL: expected 28 rows updated, got %.', v_count; END IF;
END $$;

-- Change 3: CFW Facebook (expect 5)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'image_quote' WHERE schedule_id = '433c52c1-9385-4a5e-83ae-96c5c603f915';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET format_override = 'text' WHERE schedule_id IN ('f9e49b40-9e04-4548-860f-875c907ad8d8','90b8583e-b77d-498d-ba03-52e64c727a6b');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET enabled = false WHERE schedule_id IN ('cb3e86fa-0b7b-4ab0-8b98-93de30bc699f','6966af5b-5a2e-4f0c-81e0-0e20b3c6afb1');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 3 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 4: CFW Instagram (expect 5)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'image_quote' WHERE schedule_id IN ('e2024323-c0e0-468d-ac84-ff7e6cc90c66','544a05d8-bcb4-4c36-a336-ebfc99237d54','525ab2af-cb29-4a4b-a7e6-d85597838410');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET enabled = false WHERE schedule_id IN ('9e0ce8da-861a-4b22-ab5e-415d1330e6dc','ce03f531-b40c-4705-b40d-1480c78aa48b');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 4 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 5: CFW LinkedIn (expect 5, forces text — Layer-2 enforcement)
DO $$
DECLARE v_count int;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'text' WHERE schedule_id IN (
    '4bb57dbb-fa45-40a4-a749-2ff4ca39f2ce','0a3958a8-87e5-48fe-8ab9-aeb6b57cf9d4',
    'fd359088-507c-4b83-80da-b4736c51e64f','9e826d46-29e3-40da-839a-ca19bf61bfe7',
    '8ad8f4e9-a07e-41ad-873f-852287846daa');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 5 THEN RAISE EXCEPTION 'CHANGE 5 FAIL: expected 5 rows updated, got %.', v_count; END IF;
END $$;

-- Change 6: Invegent Facebook (expect 5)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'image_quote' WHERE schedule_id = '1fd9a842-4db0-4292-a760-8155874b33ac';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET format_override = 'text' WHERE schedule_id IN ('c1abb720-4060-496d-8312-97cb9286c04d','5ad2665f-c0f8-4add-a6fe-b876c4bceeba');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET enabled = false WHERE schedule_id IN ('a7ea2dc4-8adf-439b-9d9e-ba985fce5548','1bddacbc-af9c-4adb-b764-b9d44c75b44b');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 6 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 7: Invegent Instagram (expect 5)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'image_quote' WHERE schedule_id IN ('8f6c2266-8e37-4ba0-b1b6-57434432f4ff','fd8aae40-6c75-4dcb-bb2b-6ae36e51793e','ff5927b4-184d-4a57-948d-7623e75f7008');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET enabled = false WHERE schedule_id IN ('6c52b1d4-bdbc-48fc-9e21-9b5d139b70f8','3fb1c2e6-b427-4b5d-bd7b-589e38663f0d');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 7 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 8: Invegent LinkedIn (expect 5)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'text' WHERE schedule_id IN (
    'b66abd5a-5541-4de0-acfa-60a53d36bb9b','1a6c4fde-030e-44f4-9d22-9ca00b4c9fa1',
    'e22560a5-d584-468f-8c9d-accc921c330a','135a32a0-4a45-4687-af3a-839b40eb6cf2');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET format_override = 'image_quote' WHERE schedule_id = '10fb5b91-c580-4a10-bb5a-625fec75ff37';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 8 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 9: PP YouTube (expect 5, Layer-2 enforcement)
DO $$
DECLARE v_count int; v_total int := 0;
BEGIN
  UPDATE c.client_publish_schedule SET format_override = 'video_short_stat' WHERE schedule_id = 'f1cc1c32-0759-4ab7-a748-a70f8ae9aade';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  UPDATE c.client_publish_schedule SET enabled = false WHERE schedule_id IN (
    'e951069c-e995-4cc8-a56e-b4c33291683f','abdc58c4-8aff-4483-bd91-bc2c248b6932',
    '71a9fbd3-7ed1-41f9-b776-b63adfa3ad8b','bf705fed-6f90-49c8-becd-10b07c64b09c');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  IF v_total <> 5 THEN RAISE EXCEPTION 'CHANGE 9 FAIL: expected 5 rows touched total, got %.', v_total; END IF;
END $$;

-- Change 10: format_config hygiene (expect 8)
DO $$
DECLARE v_count int;
BEGIN
  UPDATE c.client_format_config SET is_enabled = false
  WHERE config_id IN (
    'ca8a085d-7abb-47b8-a32f-4357ca74c479','e3edf302-97ec-4a6d-9eb2-b26b11b567a9',
    'da5b5c8c-ab31-433f-8069-b6562d8461c9','2a1932a9-08d2-4ad4-8b7d-c89b54e469b9',
    '8a2df44a-ee15-4795-8ce5-fc2019cec716','fdb3fc40-8374-439c-b67c-763121ac9961',
    '487dcde2-c313-4725-a4e1-6c1d8aa8a070','a6f0a8bd-e14c-4a90-9f68-ec2e5006f233');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 8 THEN RAISE EXCEPTION 'CHANGE 10 FAIL: expected 8 rows updated, got %.', v_count; END IF;
END $$;

-- Change 11 (NEW): NDIS carousel — closes the live route identified by the carousel-provenance investigation (§0)
DO $$
DECLARE v_count int;
BEGIN
  UPDATE c.client_format_config SET is_enabled = false
  WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'CHANGE 11 FAIL: expected 1 row updated (NDIS carousel config), got %.', v_count; END IF;
END $$;

-- ============================================================
-- STEP 5: Structural Layer-2 enforcement assertions (unchanged from v4, resolved client_ids only)
-- ============================================================
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='property-pulse')
      AND platform='youtube' AND enabled=true AND format_override <> 'video_short_stat';
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: PP YT kinetic still schedulable, % rows.', v_count; END IF;

  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='ndis-yarns')
      AND platform='youtube' AND enabled=true;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: NDIS YT still has % enabled rows.', v_count; END IF;

  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='care-for-welfare-pty-ltd')
      AND platform='linkedin' AND enabled=true AND format_override <> 'text';
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: CFW LI image_quote still schedulable, % rows.', v_count; END IF;
END $$;

-- ============================================================
-- STEP 6: Carousel-protection assertions — CORRECTED and EXPANDED (fixes AHA-V4-03/04, closes §0's gap)
-- Every baseline captured in Step 2 is read here; none left unused.
-- ============================================================
DO $$
DECLARE v_before int; v_after int;
BEGIN
  -- PP: posting-cadence protection (schedule table) — unchanged from v4
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='pp_fb_ig_total';
  SELECT count(*) INTO v_after FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='property-pulse')
      AND platform IN ('facebook','instagram');
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'STOP: PP FB/IG total row count changed (% -> %) — unexpected redistribution.', v_before, v_after; END IF;

  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='pp_fb_ig_enabled';
  SELECT count(*) INTO v_after FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='property-pulse')
      AND platform IN ('facebook','instagram') AND enabled = true;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'STOP: PP FB/IG enabled row count changed (% -> %).', v_before, v_after; END IF;

  -- PP: the REAL carousel lever (client_format_config) — NEW, closes the assertion-scope gap §0 found
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='pp_carousel_config_enabled';
  SELECT count(*) INTO v_after FROM c.client_format_config
    WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'STOP: PP carousel config row (fc339e1e...) is_enabled changed (% -> %) — must stay untouched, declared-legacy D2.', v_before, v_after; END IF;

  -- NDIS: schedule-level carousel exposure — real diff, not absolute-only (fixes AHA-V4-04)
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='ndis_carousel_schedule_enabled';
  IF v_before = 0 THEN
    RAISE EXCEPTION 'CAS FAIL: expected NDIS to have had schedule-level carousel exposure before this packet (baseline was 0). Re-derive — this packet assumed 13 enabled rows existed.'; END IF;
  SELECT count(*) INTO v_after FROM c.client_publish_schedule
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='ndis-yarns')
      AND format_override = 'carousel' AND enabled = true;
  IF v_after <> 0 THEN
    RAISE EXCEPTION 'STOP: NDIS still has % enabled schedule-level carousel rows post-apply — expected 0.', v_after; END IF;

  -- NDIS: the REAL lever (client_format_config carousel row) — NEW, this is what actually closes the live route
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='ndis_carousel_config_enabled';
  IF v_before <> 1 THEN
    RAISE EXCEPTION 'CAS FAIL: expected NDIS carousel config row enabled=true (1) before this packet, got %. Re-derive.', v_before; END IF;
  SELECT count(*) INTO v_after FROM c.client_format_config
    WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf' AND is_enabled = true;
  IF v_after <> 0 THEN
    RAISE EXCEPTION 'STOP: NDIS carousel config row still enabled=true post-apply (%) — Change 11 did not take effect.', v_after; END IF;

  -- CFW: existence guard on the 2 rows that ARE the containment mechanism (fragility, §0)
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='cfw_config_rows_present';
  SELECT count(*) INTO v_after FROM c.client_format_config
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='care-for-welfare-pty-ltd')
      AND ice_format_key IN ('image_quote','text') AND is_enabled = true;
  IF v_after <> v_before OR v_after <> 2 THEN
    RAISE EXCEPTION 'STOP: CFW client_format_config row count changed or is not 2 (before % after %) — these rows'' PRESENCE is what contains carousel; row-absence fails open.', v_before, v_after; END IF;

  -- Invegent: same existence guard, same reasoning
  SELECT v INTO v_before FROM _pre_image_baseline WHERE metric='invegent_config_rows_present';
  SELECT count(*) INTO v_after FROM c.client_format_config
    WHERE client_id = (SELECT client_id FROM _resolved_clients WHERE client_slug='invegent')
      AND ice_format_key IN ('image_quote','text') AND is_enabled = true;
  IF v_after <> v_before OR v_after <> 2 THEN
    RAISE EXCEPTION 'STOP: Invegent client_format_config row count changed or is not 2 (before % after %) — same fragility as CFW.', v_before, v_after; END IF;
END $$;

-- ============================================================
-- STEP 7: "Retained non-ready route" assertion (unchanged from v4)
-- ============================================================
DO $$
DECLARE v_bad_count int;
BEGIN
  CREATE TEMP TABLE _live_ready_cells AS
  SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
  FROM c.client cl
  CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
  WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
    AND cell->>'overall_state' = 'ready';

  SELECT count(*) INTO v_bad_count
  FROM c.client_publish_schedule cps
  JOIN c.client cl ON cl.client_id = cps.client_id
  WHERE cps.enabled = true AND cps.format_override IS NOT NULL
    AND cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
    AND NOT EXISTS (
      SELECT 1 FROM _live_ready_cells lrc
      WHERE lrc.client_slug = cl.client_slug AND lrc.platform = cps.platform AND lrc.format = cps.format_override
    );
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'POST-ASSERT FAIL: % enabled schedule rows resolve to a format/platform not in the live R1-ready set.', v_bad_count;
  END IF;
END $$;

-- ============================================================
-- STEP 8: Final total-row-count assertions, correctly split (schedule 102, config 9)
-- ============================================================
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM c.client_publish_schedule WHERE schedule_id IN (SELECT schedule_id FROM _pre_image_schedule);
  IF v_count <> 102 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: expected 102 schedule rows in scope, found %.', v_count; END IF;

  SELECT count(*) INTO v_count FROM c.client_format_config WHERE config_id IN (SELECT config_id FROM _pre_image_config);
  IF v_count <> 9 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: expected 9 config rows in scope, found %.', v_count; END IF;
END $$;

COMMIT;
```

### 3.3 Exact inverse rollback — reads from DURABLE tables

```sql
BEGIN;

UPDATE c.client_publish_schedule cps
SET enabled = pi.enabled, format_override = pi.format_override
FROM public._rollback_pcgu_v5_schedule pi
WHERE cps.schedule_id = pi.schedule_id;

UPDATE c.client_format_config cfc
SET is_enabled = pi.is_enabled
FROM public._rollback_pcgu_v5_config pi
WHERE cfc.config_id = pi.config_id;

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM c.client_publish_schedule cps
    JOIN public._rollback_pcgu_v5_schedule pi ON cps.schedule_id = pi.schedule_id
    WHERE cps.enabled IS DISTINCT FROM pi.enabled OR cps.format_override IS DISTINCT FROM pi.format_override;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ROLLBACK FAIL: % schedule rows did not restore to their exact pre-image.', v_count; END IF;

  SELECT count(*) INTO v_count FROM c.client_format_config cfc
    JOIN public._rollback_pcgu_v5_config pi ON cfc.config_id = pi.config_id
    WHERE cfc.is_enabled IS DISTINCT FROM pi.is_enabled;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ROLLBACK FAIL: % config rows did not restore to their exact pre-image.', v_count; END IF;
END $$;

COMMIT;

-- Manual follow-up after a VERIFIED successful rollback (not automatic):
-- DROP TABLE public._rollback_pcgu_v5_schedule;
-- DROP TABLE public._rollback_pcgu_v5_config;
```

**Same single-call execution rule applies to this rollback script** as to §3.2 — submit as one call.

---

## 4. Pre-flight and before/after capture

```sql
-- Pre-flight (run BEFORE opening the apply transaction, as its own step)
SELECT count(*) AS still_matching FROM c.client_publish_schedule
WHERE schedule_id IN (SELECT schedule_id FROM _pre_image_schedule) AND enabled = true;
-- Expected: 102.

SELECT count(*) AS still_matching_config FROM c.client_format_config
WHERE config_id IN (SELECT config_id FROM _pre_image_config) AND is_enabled = true;
-- Expected: 9.

-- Before/after: schedule rows, config rows, demand grid, readiness — same queries as packet-v4.md §4,
-- plus the NDIS carousel-specific check:
SELECT count(*) AS ndis_carousel_config_still_enabled FROM c.client_format_config
WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf' AND is_enabled = true;
-- Before: 1. After: 0. Non-zero after is a STOP.
```

---

## 5. STOP conditions

| # | Condition | Enforcement |
|---|---|---|
| 1 | Any CAS pre-image assertion fails (§3.2 Step 2, now split schedule/config/baseline counts) | In-transaction, automatic |
| 2 | Client resolution fails — zero/multiple matches (literal STRICT guard) or pinned-UUID drift | In-transaction, automatic |
| 3 | Any per-change row count mismatch (Changes 1–11) | In-transaction, automatic |
| 4 | Any Layer-2 cell retains unattended eligibility/volume | In-transaction, automatic |
| 5 | Any change in PP FB/IG schedule row count | In-transaction, automatic |
| 6 | **PP's actual carousel lever (`client_format_config`) changes at all** | In-transaction, automatic — NEW |
| 7 | NDIS carousel exposure remains at either the schedule or config level post-apply | In-transaction, automatic — config check is NEW |
| 8 | CFW's or Invegent's 2 containing `client_format_config` rows change count or drop below 2 | In-transaction, automatic — NEW |
| 9 | Any enabled, non-NULL-format schedule row resolves to a live non-ready cell | In-transaction, automatic |
| 10 | Final schedule/config row-count totals don't match 102/9 | In-transaction, automatic |
| 11 | Rollback's own post-restore diff is non-zero | In-transaction, automatic (on rollback) |
| 12 | Pre-flight shows drift immediately before execution | Executable, separate step before opening the transaction |
| 13 | `state_1_capability_proven` proof-event count changes before/after | Executable query named; human/db-rls-auditor-run |

All conditions 1–11 cause automatic `ROLLBACK` via `RAISE EXCEPTION`.

---

## 6. M11b carry

Recorded at `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` §12 (this session's
carousel-provenance addendum) — supplements, does not replace, the official M11a inventory's Finding 1.
The prior `creatomate-global-ultimate-final-delta-audit-v1.md` edit attempt was lost to a concurrent
commit (`e998e7b`) earlier in this session; that document's own current content already carries M11b as
a scoped, tier-decided Phase-2 workstream (needs M11a inventory, no longer needs a new candidate-tier
bullet), so no further edit to that file is needed — the addendum above is the correct, non-duplicating
record of this session's specific finding.

---
