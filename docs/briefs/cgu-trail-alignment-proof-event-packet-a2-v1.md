# Apply Packet A2 — CGU Trail Alignment: 3 further `platform_publish` proof events (CFW-IG, INV-IG, INV-LI)

**Authorizing decision:** PK 2026-08-02 direct chat: "authorize Packet A2" — extends decision #2's
B1-pattern recording to the three remaining image_quote cells with real publish history but no recorded
event, named in `cgu-final-readiness-audit-result-v1.md` §6c item 3. **CFW×LinkedIn is deliberately
EXCLUDED** (zero 90d publishes — needs a fresh natural publish or a PK evidence ruling first; not
covered by this authorization).
**Pattern:** identical to Packet A (`cgu-trail-alignment-proof-event-packet-v1.md`, applied clean
2026-08-02) and v6.94 B1. **Tier:** T2, additive DML only.
**Channel (pinned):** ONE `mcp__supabase__execute_sql` call containing exactly the §2 DO block.

## 1. The three rows (all evidence live-read 2026-08-02 ~05:4x UTC)

| # | Cell | Assignment (production_proven, live-verified; render-attributed identically) | Template | Evidence publish | occurred_at |
|---|---|---|---|---|---|
| 1 | CFW × instagram × image_quote | `60e43a0e-8ac3-497d-b823-8d41c2aa123b` | `0e006c5c…` generic_market_insight_card_1x1_v1 | `42030092…` 2026-07-31 (IG `18101318126601954`, draft `7f7a23a8…`, render_log `4302e2a2…`, tmr winner = market_insight) · 44 CFW-IG publishes/90d | 2026-07-31 01:15:16.042+00 |
| 2 | INV × instagram × image_quote | `ecba211b-5217-4790-afe5-a2f98616712f` | `1cfe0f9c…` generic_quote_card_1x1_v1 | `bfd5c17a…` 2026-07-31 (IG `17947801005038699`, draft `446cbddc…`, render_log `93ff0e1e…`, tmr winner = quote_card) · 45 INV-IG publishes/90d | 2026-07-31 00:45:16.373+00 |
| 3 | INV × linkedin × image_quote | `ecba211b-5217-4790-afe5-a2f98616712f` | `1cfe0f9c…` | `08709a25…` 2026-07-27 (draft `eaf0bd2d…`, render_log `7395027b…`, tmr winner = quote_card) · 5 INV-LI publishes/90d | 2026-07-27 02:40:02.946+00 |

**Winner-flip note (Invegent):** rows 2–3 attribute to `generic_quote_card_1x1_v1` — the template that
ACTUALLY rendered and published these posts. Invegent's live `select_template` winner flipped to
`generic_market_insight_card_1x1_v1` on 2026-08-02 (v6.118, rung 6 only); that flip post-dates these
publishes and has no publish history of its own yet. Attributing to the flip's new winner would be
fabrication; this packet records what happened.

Fixed row IDs (rollback identity): `c9150002-0000-4000-8000-00000000000{1,2,3}`.

## 2. Forward SQL (the exact, single `execute_sql` payload)

```sql
DO $$
DECLARE v_pre int; v_post int;
BEGIN
  SELECT count(*) INTO v_pre FROM c.creative_template_proof_event;

  -- G1: both assignments still production_proven
  IF (SELECT count(*) FROM c.creative_template_client_assignment
       WHERE id IN ('60e43a0e-8ac3-497d-b823-8d41c2aa123b','ecba211b-5217-4790-afe5-a2f98616712f')
         AND assignment_status='production_proven') <> 2 THEN
    RAISE EXCEPTION 'G1 STOP: an assignment is missing or its status moved since packet authoring';
  END IF;

  -- G2: no existing platform_publish event on any target cell
  IF EXISTS (SELECT 1 FROM c.creative_template_proof_event
              WHERE proof_type='platform_publish'
                AND ((assignment_id='60e43a0e-8ac3-497d-b823-8d41c2aa123b' AND platform='instagram')
                  OR (assignment_id='ecba211b-5217-4790-afe5-a2f98616712f' AND platform='instagram')
                  OR (assignment_id='ecba211b-5217-4790-afe5-a2f98616712f' AND platform='linkedin'))) THEN
    RAISE EXCEPTION 'G2 STOP: a target cell already carries a platform_publish event (duplicate)';
  END IF;

  -- G3: every cited publish row still exists with status=published
  IF (SELECT count(*) FROM m.post_publish WHERE status='published' AND post_publish_id IN
       ('42030092-3662-4f07-ae5a-f73006a18eda','bfd5c17a-e157-4189-9bc3-56667dbd84f9',
        '08709a25-2587-4d88-ae9f-81c3074faa6f')) <> 3 THEN
    RAISE EXCEPTION 'G3 STOP: a cited evidence publish row is missing or no longer published';
  END IF;

  -- G4: fixed row IDs unused
  IF EXISTS (SELECT 1 FROM c.creative_template_proof_event WHERE id IN
       ('c9150002-0000-4000-8000-000000000001','c9150002-0000-4000-8000-000000000002',
        'c9150002-0000-4000-8000-000000000003')) THEN
    RAISE EXCEPTION 'G4 STOP: a packet row ID already exists';
  END IF;

  INSERT INTO c.creative_template_proof_event
    (id, template_id, assignment_id, platform, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES
  ('c9150002-0000-4000-8000-000000000001','0e006c5c-45aa-4829-82ec-89dd282a8c56','60e43a0e-8ac3-497d-b823-8d41c2aa123b','instagram','platform_publish','passed',
   'Client-attributed Instagram publish: post_publish 42030092-3662-4f07-ae5a-f73006a18eda (instagram 2026-07-31, platform_post_id 18101318126601954) · render_log 4302e2a2-bc3d-4776-97e2-17da4daade1a (tmr winner generic_market_insight_card_1x1_v1, assignment-attributed) · draft 7f7a23a8-cc88-4945-8939-a3d2c5a0cf73; 44 CFW instagram image_quote publishes in the 90d to 2026-07-31. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-a2-v1.md',
   'production_publish','2026-07-31 01:15:16.042+00','CGU trail alignment A2 (PK authorization 2026-08-02, cgu-final-readiness-audit-result-v1.md s6c; B1 pattern)'),
  ('c9150002-0000-4000-8000-000000000002','1cfe0f9c-3810-4bf1-8785-083fead4eefe','ecba211b-5217-4790-afe5-a2f98616712f','instagram','platform_publish','passed',
   'Client-attributed Instagram publish: post_publish bfd5c17a-e157-4189-9bc3-56667dbd84f9 (instagram 2026-07-31, platform_post_id 17947801005038699) · render_log 93ff0e1e-ae8a-43b1-b744-3c4324780b6c (tmr winner generic_quote_card_1x1_v1 — the pre-flip production template that actually rendered this; see packet winner-flip note) · draft 446cbddc-3063-478c-b7f8-41e7749b67d5; 45 Invegent instagram image_quote publishes in the 90d to 2026-07-31. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-a2-v1.md',
   'production_publish','2026-07-31 00:45:16.373+00','CGU trail alignment A2 (PK authorization 2026-08-02, cgu-final-readiness-audit-result-v1.md s6c; B1 pattern)'),
  ('c9150002-0000-4000-8000-000000000003','1cfe0f9c-3810-4bf1-8785-083fead4eefe','ecba211b-5217-4790-afe5-a2f98616712f','linkedin','platform_publish','passed',
   'Client-attributed LinkedIn publish: post_publish 08709a25-2587-4d88-ae9f-81c3074faa6f (linkedin 2026-07-27) · render_log 7395027b-9c32-4b5a-9d60-802da02f9f3e (tmr winner generic_quote_card_1x1_v1) · draft eaf0bd2d-24d8-452e-b976-d8c8d858b6d9; 5 Invegent linkedin image_quote publishes in the 90d to 2026-07-27. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-a2-v1.md',
   'production_publish','2026-07-27 02:40:02.946+00','CGU trail alignment A2 (PK authorization 2026-08-02, cgu-final-readiness-audit-result-v1.md s6c; B1 pattern)');

  SELECT count(*) INTO v_post FROM c.creative_template_proof_event;
  IF v_post - v_pre <> 3 THEN
    RAISE EXCEPTION 'G5 STOP: expected exactly 3 inserted rows, got %', v_post - v_pre;
  END IF;
END $$;
```

## 3. Rollback

```sql
DO $$
DECLARE v_n int;
BEGIN
  DELETE FROM c.creative_template_proof_event WHERE id IN
    ('c9150002-0000-4000-8000-000000000001','c9150002-0000-4000-8000-000000000002',
     'c9150002-0000-4000-8000-000000000003');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN RAISE EXCEPTION 'ROLLBACK STOP: expected 3 rows, deleted %', v_n; END IF;
END $$;
```

## 4. Blast radius / non-effects

Identical to Packet A (verified there by `db-rls-auditor` from the live `select_template` body and
schema reads, both unchanged since): additive INSERT only; zero selector impact (`select_template`
gates on `visual_approval` events only); zero queue-output change (queue reads `m.post_publish`);
no status/grant/DDL change. Consumers: audit/graduation evidence readers + re-run contract R2.

## 5. Post-apply verification

`SELECT id, assignment_id, platform FROM c.creative_template_proof_event WHERE id::text LIKE 'c9150002%'`
→ exactly 3 rows. R2 then shows every publishing image_quote cell carrying its event; the only
image_quote cell without one is CFW×LinkedIn (excluded, awaiting its evidence ruling).
