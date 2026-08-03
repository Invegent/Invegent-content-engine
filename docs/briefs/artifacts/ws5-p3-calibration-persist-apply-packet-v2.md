# Apply packet — P3: register + calibrate `video_stat_reveal_9x16_v2` and restore PP (Lane A, WS-5) — v2

**Created:** 2026-08-03 Sydney · **Author:** chat (orchestrator) · **Status:** v2 — chain-amended, EXECUTABLE HARNESS FROZEN IN-PACKET, awaiting PK apply gate
**Lane:** `ws5-production-envelope-enforcement-foundation` (P1 merged+deployed+verified · P2 containment applied · template edit saved `f98a8e08…` · PP non-regression PK PASS).
**Tier:** T3. **Evidence:** `docs/briefs/artifacts/ws5-p3-stat-calibration-evidence-v1.md` (`e631089f…`). **Migration file:** `supabase/migrations/20260803090000_tmr5_field_constraints_vocabulary_max_words_v1.sql` (`18ce83e3…`).

**v2 delta over v1 (`1fdfedf5…`) — executable SQL now FROZEN in-packet; every chain finding addressed:**
- **AHA-01-1 (high):** the complete literal Step-1 DO block is Appendix A (full UUIDs, all 9 constraint JSONB payloads, per-call RAISE gating, strengthened terminal assertion). The packet hash now pins the harness, not prose.
- **db-rls must-fix 1:** post-check 5 pinned to a literal declared contract with **`platforms: []`** (Appendix B) — the 4 live platform-suitability rows carry NULL constraints, so a platform-inclusive contract hard-fails `platform_constraints_missing` today. **Decision recorded: platform-constraints population is deliberately Lane B** (§0c outcome 1/2 fleet work); element-level intake validation is the D-2 restoration precondition satisfied here. All 9 elements declared with constraints jsonb-equal to the Step-1 payloads (C2/C3 satisfied by construction — same literals).
- **db-rls must-fix 2:** the 9 payload literals are in Appendix A/B — apply-time bytes are review-pinned.
- **AHA-01-2:** Step-0 rollback staged-source is now declared as the in-repo v2 migration §2 itself (`20260801043347_…_v2.sql`, function body md5 `0926f72fe52ad80111b72e226272e385`, live==repo byte-verified by db-rls-auditor) re-applied under a NEW migration name `tmr5_field_constraints_vocabulary_max_words_rollback_v1`. No phantom appendix.
- **AHA-01-3:** pre-image capture SELECTs staged verbatim (Appendix C.1) as a named mandatory pre-apply step; the rollback consumes their recorded output.
- **AHA-01-4:** rollback claim scoped: **logical reverse; `updated_at` advances by design in both directions** (db-rls: nothing reads these tables' `updated_at` for ranking; zero triggers).
- **AHA-01-5:** PP restore wrapped in a DO block with `GET DIAGNOSTICS` + RAISE on rowcount≠1 (Appendix C.3); the read-back remains mandatory and recorded.
- **db-rls should-fixes:** terminal assertion strengthened to `count(*)=9 AND zero NULL-constraints rows`; Step-0 advisor comparison = against a FRESH pre-apply security-advisor count captured at apply time (live baseline drifted 251→250; never compare against a stale number).

## Ordered steps (Convention-2; any tripped STOP voids the remainder; packet-hash re-verify at apply is step 0a)

- **0a.** Re-verify this packet's sha256 against PK's pinned hash; capture FRESH `get_advisors(security)` count; run Appendix C.1 pre-image SELECTs and record outputs in the lane record; validate rollback literals (Appendix C.2/C.3) against those pre-images: pre-state `inventory_hash IS NULL`, Background/Logo `constraints IS NULL`, PP assignment `blocked`, all 4 stat-text rows ABSENT. Any mismatch = STOP.
- **0b.** PK-gated `apply_migration` name `tmr5_field_constraints_vocabulary_max_words_v1`, SQL = the in-repo file (`18ce83e3…`). Post-smokes (read-only, Appendix C.4): max_words triple accepted (returns NULL) · unknown key still rejected · advisor count == fresh baseline (zero new). STOP on any miss. (Repo file commit/push to main happens with the lane's git step under PK instruction — migration ledger and git must not drift.)
- **1.** ONE `execute_sql` call = Appendix A verbatim (single DO block, single transaction, self-aborting). Ordering is HARD: 0b before 1 (StatValue carries `max_words`; proven live to fail `text_limits_unknown_key:max_words` pre-migration).
- **2.** Read-only post-checks (Appendix C.5): 9 rows all constraints non-null with expected md5s · EyebrowText baked values exact · `inventory_hash='f98a8e08…'` · NDIS selector still `fail_closed` · PP winner still `dd5fd75e…` (both assignments still blocked at this point) · canonical claimable-drafts SQL → 0 · **post-check 5:** Appendix B intake-validation call → `verdict='pass'`, `hard_failure_count=0` (FAIL = STOP; NDIS restore stays blocked regardless).
- **3.** PP restore = Appendix C.3 DO block (containment-packet rollback, preconditions met: edit saved + re-captured [step 1] + PP non-regression PK PASS). Post-checks: PP winner STILL `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` (change = STOP) · `a3d8472d…` back in PP `alternatives[]` only · NDIS still `fail_closed` · claimable 0. Lane-A exclusive ownership of row `1ee1a547…` ends on success.

**NOT in this packet:** NDIS restore (P5) · any publish · platform-constraints population (Lane B, decision recorded above) · any worker/selector change · register cuts. The ai-worker prompt's static example `$62.17/hr` (9ch, now over-envelope) is a noted future cosmetic patch — the deployed envelope loader + validator chain enforces the real limits regardless.

---

## Appendix A — Step-1 executable (ONE `execute_sql` call, verbatim)

```sql
DO $p3$
DECLARE
  r jsonb; n integer; v_total integer; v_null integer;
BEGIN
  -- 1/10 StatValue
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'StatValue', 'text', 'text', true,
    $j1${"schema_version":"tmr_field_constraints_v1","modification_keys":["StatValue.text"],"slot":{"slot_key":"stat_value","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":7,"basis":"probe_calibrated","evidence_reference":"renders 1f6cb404-f4b7-40ca-8349-cd09c15290de (7ch wide-glyph PASS) vs 4e0905ff-0c70-4d15-a980-7d63aff89b4e (8ch edge-clip) + bb5033c6-fcec-43ab-8526-61e61c4967fd (9ch clip) + b5378ff9-7e44-4a24-bff6-b7526c3c99cb (12ch clip), 2026-08-03"},"max_lines":{"value":1,"basis":"probe_calibrated","evidence_reference":"render 3e6fbe96-809c-403b-a226-87bfa652771a - any wrap collides with EyebrowText above and StatLabel below (live-incident regression reproduction), 2026-08-03"},"max_words":{"value":1,"basis":"probe_calibrated","evidence_reference":"render 3e6fbe96-809c-403b-a226-87bfa652771a (two-word 2 people wrap = oCrtq6R9VFQ defect) vs 1f6cb404 single-token PASS, 2026-08-03"}},"overflow_risk":"high","container":{"summary":"92% width centered y49, 20vmin/216px Montserrat 900, no autoscale; single-token numeric; overflow clips at canvas edges"},"collapse":{"collapsible":false},"notes":"Worker sends bare key StatValue today (b1_video_stat.ts); canonical suffixed key recorded; Creatomate accepts both address forms."}$j1$::jsonb,
    '7bb1e760-30ec-4e78-8e26-7a9856d96a16', '6', true, '34.2%',
    'Montserrat 900 20vmin white, x_align 50%, text-fly by word @1.0s',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort StatValue: %', r; END IF;

  -- 2/10 StatLabel
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'StatLabel', 'text', 'text', true,
    $j2${"schema_version":"tmr_field_constraints_v1","modification_keys":["StatLabel.text"],"slot":{"slot_key":"stat_label","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":30,"basis":"probe_calibrated","evidence_reference":"renders 4e0905ff-0c70-4d15-a980-7d63aff89b4e (30ch PASS) vs 62085407-e4ef-48bc-8cf2-a01a20c79072 (35ch pill edge-clip), 2026-08-03"},"max_lines":{"value":1,"basis":"probe_calibrated","evidence_reference":"single-line pill; overflow clips, never wraps - renders 62085407 + b5378ff9, 2026-08-03"}},"overflow_risk":"high","container":{"summary":"auto-width pill centered y62, 4.2vmin + 6% letter-spacing, background padding 58%/38%, radius 40%"},"collapse":{"collapsible":false},"notes":"Worker sends bare key StatLabel today; canonical suffixed key recorded."}$j2$::jsonb,
    'a89fff46-4cd1-4173-b25f-57ceda7c82f5', '7', true, 'MEDIAN PRICE GROWTH',
    'Montserrat 700 4.2vmin on #ECA02D pill, text-slide up @2.4s',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort StatLabel: %', r; END IF;

  -- 3/10 ContextLine
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'ContextLine', 'text', 'text', true,
    $j3${"schema_version":"tmr_field_constraints_v1","modification_keys":["ContextLine.text"],"slot":{"slot_key":"context_line","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":130,"basis":"probe_calibrated","evidence_reference":"renders 4e0905ff-0c70-4d15-a980-7d63aff89b4e (130ch 4-line PASS) + bb5033c6-fcec-43ab-8526-61e61c4967fd (103ch 3-line clean) vs b5378ff9-7e44-4a24-bff6-b7526c3c99cb (160ch 5-line crowding), 2026-08-03"},"max_lines":{"value":4,"basis":"probe_calibrated","evidence_reference":"same probe set: 4 lines clear; 5 lines crowd StatLabel above and CtaText below, 2026-08-03"}},"overflow_risk":"medium","container":{"summary":"84% width centered y72, 3.9vmin, line_height 142%; wraps naturally"},"collapse":{"collapsible":false},"notes":"Worker sends bare key ContextLine today; canonical suffixed key recorded."}$j3$::jsonb,
    'e4c8bdb8-cdd6-4583-a963-26ca4e967680', '8', true,
    'Perth dwelling values over the past 12 months, outpacing the national average.',
    'Montserrat 3.9vmin #F1F5F9, line-height 142%, text-slide up @4.2s',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort ContextLine: %', r; END IF;

  -- 4/10 CtaText
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'CtaText', 'text', 'text', true,
    $j4${"schema_version":"tmr_field_constraints_v1","modification_keys":["CtaText.text"],"slot":{"slot_key":"cta_text","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":38,"basis":"probe_calibrated","evidence_reference":"renders bb5033c6-fcec-43ab-8526-61e61c4967fd (38ch clean PASS) vs 4e0905ff-0c70-4d15-a980-7d63aff89b4e (42ch flush-borderline) + 62085407-e4ef-48bc-8cf2-a01a20c79072 (49ch clip), 2026-08-03"},"max_lines":{"value":1,"basis":"probe_calibrated","evidence_reference":"single-line pill; overflow clips - renders 62085407 + b5378ff9, 2026-08-03"}},"overflow_risk":"high","container":{"summary":"auto-width pill centered y85, 4.4vmin, background padding 52%/44%, radius 50%"},"collapse":{"collapsible":false},"notes":"Worker sends bare key CtaText today; canonical suffixed key recorded."}$j4$::jsonb,
    '4005259c-47ea-42a1-a6e6-e01f249c62e4', '9', true,
    $d4$Thinking of selling? Let's talk numbers.$d4$,
    'Montserrat 700 4.4vmin on white pill, text-slide up @6.4s',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort CtaText: %', r; END IF;

  -- 5/10 EyebrowText (PK D-4: governed per-client copy, never freeform AI)
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'EyebrowText', 'text', 'text', true,
    $j5${"schema_version":"tmr_field_constraints_v1","modification_keys":["EyebrowText.text"],"slot":{"slot_key":"eyebrow","activation":"persistent"},"content_source":"worker_computed","empty_ok":false,"text_limits":{"max_chars":{"value":13,"basis":"probe_calibrated","evidence_reference":"renders a955d1f6-2a1a-4f12-9d95-3530dd8a22a9 + 62085407-e4ef-48bc-8cf2-a01a20c79072 (MARKET UPDATE 13ch, wide margins) and b5378ff9-7e44-4a24-bff6-b7526c3c99cb (NDIS UPDATE 11ch), 2026-08-03"},"max_lines":{"value":1,"basis":"probe_calibrated","evidence_reference":"same renders; single line by design, 2026-08-03"}},"overflow_risk":"low","container":{"summary":"centered y40, 3.6vmin, 38% letter-spacing; sits directly above the StatValue box"},"collapse":{"collapsible":false},"baked":{"eyebrow_value_property_pulse":"MARKET UPDATE","eyebrow_value_ndis_yarns":"NDIS UPDATE"},"notes":"PK D-4 2026-08-03: video-worker v3.17.0 resolves baked eyebrow_value_<client_slug> fail-loud (b1_video_stat_eyebrow_value_missing); never freeform AI, never default text."}$j5$::jsonb,
    '00511901-a420-45de-abdd-fbd5381c8426', '5', true, 'MARKET UPDATE',
    'Montserrat 700 3.6vmin #ECA02D, letter-spacing 38%, text-slide up @0.6s',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort EyebrowText: %', r; END IF;

  -- 6/10 VoiceAudio
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'VoiceAudio', 'audio', 'audio', true,
    $j6${"schema_version":"tmr_field_constraints_v1","modification_keys":["VoiceAudio.source"],"slot":{"slot_key":"voice_audio","activation":"persistent"},"content_source":"render_binding","empty_ok":true,"collapse":{"collapsible":false},"notes":"Empty source renders silent (Creatomate contract); production VO is worker-generated and fail-loud upstream (b1_video_missing_voiceover). Template volume 100%."}$j6$::jsonb,
    '5dd2097d-0fc2-4903-b5b2-e8d97dedd0d9', '11', true, '',
    'VO slot, template volume 100%',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort VoiceAudio: %', r; END IF;

  -- 7/10 MusicBed
  r := public.record_tmr_template_field(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'MusicBed', 'audio', 'audio', true,
    $j7${"schema_version":"tmr_field_constraints_v1","modification_keys":["MusicBed.source"],"slot":{"slot_key":"music_bed","activation":"persistent"},"content_source":"render_binding","empty_ok":true,"collapse":{"collapsible":false},"notes":"Empty source = explicitly silent bed (N1). Bed level stays template-controlled at 70% (N3 - workers never set MusicBed.volume)."}$j7$::jsonb,
    '94674c59-09fb-4c87-954a-bfddfc82f43e', '10', true, '',
    'Music bed, template volume 70%',
    'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort MusicBed: %', r; END IF;

  -- 8/10 Background (existing row; CAS-from-NULL)
  r := public.set_tmr_field_constraints(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'Background',
    $j8${"schema_version":"tmr_field_constraints_v1","modification_keys":["Background.source"],"slot":{"slot_key":"background","activation":"persistent"},"content_source":"governed_asset","empty_ok":false,"asset":{"resolver":"resolve_brand_assets","missing_behaviour":"fail_loud","asset_kind":"background"},"collapse":{"collapsible":false},"notes":"Image element with 108->134% zoom keyframes; saved-source PP default is replaced per render by the governed resolver."}$j8$::jsonb,
    null, null, 'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort Background: %', r; END IF;

  -- 9/10 Logo (existing row; CAS-from-NULL)
  r := public.set_tmr_field_constraints(
    'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, 'Logo',
    $j9${"schema_version":"tmr_field_constraints_v1","modification_keys":["Logo.source"],"slot":{"slot_key":"logo","activation":"persistent"},"content_source":"governed_asset","empty_ok":false,"asset":{"resolver":"resolve_brand_assets","missing_behaviour":"fail_loud","asset_kind":"logo"},"collapse":{"collapsible":false},"notes":"Logo slot 44x13 vmin at y5.6, fit contain; governed per client."}$j9$::jsonb,
    null, null, 'chat - Lane A P3 (PK apply gate 2026-08-03)');
  IF (r->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'p3_abort Logo: %', r; END IF;

  -- 10/10 Re-capture (CAS-from-NULL on inventory_hash)
  UPDATE c.creative_provider_template
     SET inventory_hash = 'f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423',
         inventory_source = inventory_source || ' | 2026-08-03 eyebrow-parameterisation re-capture (EyebrowText dynamic; saved editor source docs/briefs/artifacts/ws5-p2-video-stat-reveal-9x16-v2-eyebrow-param-source-v1.json)',
         updated_at = now()
   WHERE id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
     AND inventory_hash IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'p3_abort recapture rowcount=%', n; END IF;

  -- Terminal assertion (strengthened per db-rls should-fix)
  SELECT count(*), count(*) FILTER (WHERE constraints IS NULL)
    INTO v_total, v_null
    FROM c.creative_provider_template_field
   WHERE template_id = 'a3d8472d-9438-4312-9f11-b6a920be4014';
  IF v_total <> 9 OR v_null <> 0 THEN
    RAISE EXCEPTION 'p3_abort terminal: total=% null_constraints=%', v_total, v_null;
  END IF;
END $p3$;
```

## Appendix B — post-check 5: intake validation (read-only; `platforms:[]` by recorded decision)

Call: `SELECT public.validate_tmr_template_intake('a3d8472d-9438-4312-9f11-b6a920be4014'::uuid, <contract>)` where `<contract>` =
`{"contract_version":"tmr_intake_declared_contract_v1","template":{"provider":"creatomate","scope":"generic","output_type":"video","width":1080,"height":1920},"platforms":[],"elements":[ …the 9 objects {element_name, field_kind, required_for_render, constraints} with constraints JSONB EXACTLY as Appendix A ($j1..$j9)… ]}`
**Expected:** `verdict='pass'`, `mode='capture_check'`, `hard_failure_count=0`. Any other result = STOP (and the D-2 NDIS-restore precondition stays unmet).

## Appendix C — staged pre-images, rollbacks, smokes, post-checks

**C.1 Pre-image SELECTs (run at 0a; outputs recorded in the lane record; the rollback consumes them):**
```sql
SELECT id, inventory_hash, inventory_source, updated_at, status FROM c.creative_provider_template WHERE id='a3d8472d-9438-4312-9f11-b6a920be4014';
SELECT element_name, field_kind, (constraints IS NULL) AS constraints_null, id FROM c.creative_provider_template_field WHERE template_id='a3d8472d-9438-4312-9f11-b6a920be4014' ORDER BY element_name;
SELECT id, assignment_status, approved_by, approved_at, updated_at FROM c.creative_template_client_assignment WHERE id='1ee1a547-08b8-4ce8-8045-d545be16c699';
```
Required pre-state: `inventory_hash IS NULL` · exactly 2 field rows (Background, Logo), both `constraints_null=true` · PP assignment `blocked` with `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'`.

**C.2 Step-1 rollback (logical reverse; `updated_at` advances by design; run only on PK instruction after a tripped STOP):**
```sql
DO $rb$
DECLARE n integer;
BEGIN
  DELETE FROM c.creative_provider_template_field
   WHERE template_id='a3d8472d-9438-4312-9f11-b6a920be4014'
     AND element_name IN ('StatValue','StatLabel','ContextLine','CtaText','EyebrowText','VoiceAudio','MusicBed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'p3_rollback abort: deleted % of 7', n; END IF;
  UPDATE c.creative_provider_template_field SET constraints=NULL
   WHERE template_id='a3d8472d-9438-4312-9f11-b6a920be4014' AND element_name IN ('Background','Logo') AND constraints IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'p3_rollback abort: nulled % of 2', n; END IF;
  UPDATE c.creative_provider_template
     SET inventory_hash=NULL,
         inventory_source=<PRE-IMAGE inventory_source TEXT from C.1, pasted verbatim at rollback time>,
         updated_at=now()
   WHERE id='a3d8472d-9438-4312-9f11-b6a920be4014'
     AND inventory_hash='f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'p3_rollback abort: recapture reverse rowcount=%', n; END IF;
END $rb$;
```
Step-0 rollback: new migration `tmr5_field_constraints_vocabulary_max_words_rollback_v1` = the v2 §2 function body verbatim from the in-repo file (md5 `0926f72f…`, live==repo verified).

**C.3 Step-3 PP restore (DO-wrapped per AHA-01-5):**
```sql
DO $pr$
DECLARE n integer;
BEGIN
  UPDATE c.creative_template_client_assignment
     SET assignment_status='visually_approved', updated_at=now()
   WHERE id='1ee1a547-08b8-4ce8-8045-d545be16c699'
     AND template_id='a3d8472d-9438-4312-9f11-b6a920be4014'
     AND assignment_status='blocked';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'pp_restore abort: rowcount=% (state moved - STOP, surface to PK)', n; END IF;
END $pr$;
```
Reverse (if ever needed): the containment packet's forward CAS (proven live 2026-08-03).

**C.4 Step-0 smokes (read-only):**
```sql
SELECT c.tmr_validate_field_constraints('SmokeElem','text',
  $s1${"schema_version":"tmr_field_constraints_v1","modification_keys":["SmokeElem.text"],"slot":{"slot_key":"smoke","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":10,"basis":"declared_from_source","source":"smoke"},"max_words":{"value":1,"basis":"declared_from_source","source":"smoke"}},"overflow_risk":"low","collapse":{"collapsible":false}}$s1$::jsonb) AS should_be_null;
SELECT c.tmr_validate_field_constraints('SmokeElem','text',
  $s2${"schema_version":"tmr_field_constraints_v1","modification_keys":["SmokeElem.text"],"slot":{"slot_key":"smoke","activation":"persistent"},"content_source":"ai_authored","empty_ok":false,"text_limits":{"max_chars":{"value":10,"basis":"declared_from_source","source":"smoke"},"bogus_key":{"value":1,"basis":"declared_from_source","source":"smoke"}},"overflow_risk":"low","collapse":{"collapsible":false}}$s2$::jsonb) AS should_name_unknown_key;
```

**C.5 Step-2 read-backs:** 9-row constraint listing with md5(constraints::text) per element · EyebrowText baked map exact-match · template `inventory_hash` exact · `select_template('ndis-yarns','youtube','video_short_stat')->>'status'='fail_closed'` · PP winner check · the canonical claimable-drafts SQL (containment packet v2 text) → 0.
