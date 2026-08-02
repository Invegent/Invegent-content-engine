# Apply Packet — CGU Trail Alignment: 4 `platform_publish` proof events (PK decisions #2 + #3)

**Authorizing decisions:** PK 2026-08-02 (recorded `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` §6b):
#2 — record `platform_publish` proof events for the three ready image_quote cells with real publish
history but no recorded event (PP×LinkedIn, NDIS×Instagram, NDIS×LinkedIn); #3 — record PP×YouTube
`video_short_stat` against the two PK-accepted 2026-07-27 governed publishes rather than waiting for
a natural slot post-D4 allocation may never schedule.
**Pattern precedent:** S6 B1 trail alignment (v6.94, `capability-expansion-b1-implementation-packet-v1.md`)
— additive `c.creative_template_proof_event` rows recording already-real publish history; same table,
same shape, same guard style. **This packet re-decides nothing** — every cited publish, render, draft,
and assignment ID was read live 2026-08-02 (~04:30Z) by the CGU audit session and is asserted again
in-transaction at apply time.
**Tier:** T2 (additive production DML, no DDL, no status change, no selector impact).
**Channel (pinned):** ONE `mcp__supabase__execute_sql` call containing exactly the §2 DO block —
single-statement, single-transaction by construction. `apply_migration` is NOT used (pure
row-recording DML, B1 precedent; no migration identity minted).

## 1. The four rows (all evidence live-read 2026-08-02)

| # | Cell | Assignment (status live-verified) | Template | Evidence publish | occurred_at |
|---|---|---|---|---|---|
| 1 | PP × linkedin × image_quote | `7806fa5e-9fe1-4955-a5b3-3095d5ab6d5c` (production_proven) | `0e006c5c…` generic_market_insight_card_1x1_v1 | `1c72a9bd…` 2026-07-31 (draft `20e53cc4…`, render_log `2af78dda…`, tmr winner = market_insight, assignment-attributed in render_spec) · 21 PP-LI publishes/90d | 2026-07-31 02:00:05.694+00 |
| 2 | NDIS × instagram × image_quote | `c4737728-eb87-462f-aa79-ce6b321ba8ef` (production_proven) | `0e006c5c…` | `074486e0…` 2026-08-01 (draft `35fbc2cd…`, render_log `20b9fe62…`) · 29/90d | 2026-08-01 01:00:24.165+00 |
| 3 | NDIS × linkedin × image_quote | `c4737728-eb87-462f-aa79-ce6b321ba8ef` | `0e006c5c…` | `ce960b44…` 2026-07-27 (draft `376320ed…`, render_log `4b6e4556…`) · 8/90d | 2026-07-27 00:00:08.178+00 |
| 4 | PP × youtube × video_short_stat | `1ee1a547-08b8-4ce8-8045-d545be16c699` (visually_approved — status NOT changed by this packet) | `a3d8472d…` video_stat_reveal_9x16_v2 | Both PK-accepted governed publishes: `a580133a…` (YT `XPQ26cF9sBA` 07-26, draft `db67b61c…`, render `2f86f1a6…`/creatomate `758f98e2…`) + `ad41daf1…` (YT `oHDyazW1isQ` 07-27, draft `4dcd3c86…`, render `dfcbec28…`/creatomate `d56d1273…`); authority pin v2.22.0 fired; slots force-filled (supervised), accepted per PK decision #3 | 2026-07-26 11:45:08.261+00 |

Fixed row IDs (rollback identity): `c9150001-0000-4000-8000-00000000000{1,2,3,4}`.

## 2. Forward SQL (the exact, single `execute_sql` payload)

```sql
DO $$
DECLARE v_pre int; v_post int;
BEGIN
  SELECT count(*) INTO v_pre FROM c.creative_template_proof_event;

  -- G1: target assignments exist with the exact statuses this packet was authored against
  IF (SELECT count(*) FROM c.creative_template_client_assignment
       WHERE (id='7806fa5e-9fe1-4955-a5b3-3095d5ab6d5c' AND assignment_status='production_proven')
          OR (id='c4737728-eb87-462f-aa79-ce6b321ba8ef' AND assignment_status='production_proven')
          OR (id='1ee1a547-08b8-4ce8-8045-d545be16c699' AND assignment_status='visually_approved')) <> 3 THEN
    RAISE EXCEPTION 'G1 STOP: an assignment is missing or its status moved since packet authoring';
  END IF;

  -- G2: none of the four (assignment, platform) cells already carries a platform_publish event
  IF EXISTS (SELECT 1 FROM c.creative_template_proof_event
              WHERE proof_type='platform_publish'
                AND ((assignment_id='7806fa5e-9fe1-4955-a5b3-3095d5ab6d5c' AND platform='linkedin')
                  OR (assignment_id='c4737728-eb87-462f-aa79-ce6b321ba8ef' AND platform='instagram')
                  OR (assignment_id='c4737728-eb87-462f-aa79-ce6b321ba8ef' AND platform='linkedin')
                  OR (assignment_id='1ee1a547-08b8-4ce8-8045-d545be16c699' AND platform='youtube'))) THEN
    RAISE EXCEPTION 'G2 STOP: a target cell already carries a platform_publish event (duplicate)';
  END IF;

  -- G3: every cited publish row still exists with status=published
  IF (SELECT count(*) FROM m.post_publish WHERE status='published' AND post_publish_id IN
       ('1c72a9bd-c50b-4a53-8707-3796db9dd1b5','074486e0-31c7-47c3-b08b-6defc75c05c7',
        'ce960b44-a966-4ffe-888a-b6aed971239d','a580133a-799c-4d39-9da3-e500c744ab63',
        'ad41daf1-61db-4d85-8cef-b18ddc052529')) <> 5 THEN
    RAISE EXCEPTION 'G3 STOP: a cited evidence publish row is missing or no longer published';
  END IF;

  -- G4: fixed row IDs unused
  IF EXISTS (SELECT 1 FROM c.creative_template_proof_event WHERE id IN
       ('c9150001-0000-4000-8000-000000000001','c9150001-0000-4000-8000-000000000002',
        'c9150001-0000-4000-8000-000000000003','c9150001-0000-4000-8000-000000000004')) THEN
    RAISE EXCEPTION 'G4 STOP: a packet row ID already exists';
  END IF;

  INSERT INTO c.creative_template_proof_event
    (id, template_id, assignment_id, platform, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES
  ('c9150001-0000-4000-8000-000000000001','0e006c5c-45aa-4829-82ec-89dd282a8c56','7806fa5e-9fe1-4955-a5b3-3095d5ab6d5c','linkedin','platform_publish','passed',
   'Client-attributed LinkedIn publish: post_publish 1c72a9bd-c50b-4a53-8707-3796db9dd1b5 (linkedin 2026-07-31) · render_log 2af78dda-8ad1-4222-b36c-c50ede7d87be (tmr winner generic_market_insight_card_1x1_v1, assignment-attributed) · draft 20e53cc4-0254-4a9e-9dfc-adaccb55b2e9; 21 PP linkedin image_quote publishes in the 90d to 2026-07-31. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-v1.md',
   'production_publish','2026-07-31 02:00:05.694+00','CGU trail alignment (PK decisions 2+3, 2026-08-02, cgu-final-readiness-audit-result-v1.md s6b; B1 pattern)'),
  ('c9150001-0000-4000-8000-000000000002','0e006c5c-45aa-4829-82ec-89dd282a8c56','c4737728-eb87-462f-aa79-ce6b321ba8ef','instagram','platform_publish','passed',
   'Client-attributed Instagram publish: post_publish 074486e0-31c7-47c3-b08b-6defc75c05c7 (instagram 2026-08-01, platform_post_id 18626585773045542) · render_log 20b9fe62-99df-4939-8229-0d29831b1eda (tmr winner generic_market_insight_card_1x1_v1) · draft 35fbc2cd-f6f4-4a17-98cb-6a5788d4f067; 29 NDIS instagram image_quote publishes in the 90d to 2026-08-01. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-v1.md',
   'production_publish','2026-08-01 01:00:24.165+00','CGU trail alignment (PK decisions 2+3, 2026-08-02, cgu-final-readiness-audit-result-v1.md s6b; B1 pattern)'),
  ('c9150001-0000-4000-8000-000000000003','0e006c5c-45aa-4829-82ec-89dd282a8c56','c4737728-eb87-462f-aa79-ce6b321ba8ef','linkedin','platform_publish','passed',
   'Client-attributed LinkedIn publish: post_publish ce960b44-a966-4ffe-888a-b6aed971239d (linkedin 2026-07-27) · render_log 4b6e4556-b894-49ec-8e09-9a6bdaf270a4 (tmr winner generic_market_insight_card_1x1_v1) · draft 376320ed-d844-481d-b2b4-99c446fcf833; 8 NDIS linkedin image_quote publishes in the 90d to 2026-07-27. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-v1.md',
   'production_publish','2026-07-27 00:00:08.178+00','CGU trail alignment (PK decisions 2+3, 2026-08-02, cgu-final-readiness-audit-result-v1.md s6b; B1 pattern)'),
  ('c9150001-0000-4000-8000-000000000004','a3d8472d-9438-4312-9f11-b6a920be4014','1ee1a547-08b8-4ce8-8045-d545be16c699','youtube','platform_publish','passed',
   'PK-accepted governed publishes (acceptance 2026-07-27, docs/briefs/results/pp-youtube-three-consecutive-governed-stat-videos-result-v1.md; recording elected by PK decision 3, 2026-08-02): post_publish a580133a-799c-4d39-9da3-e500c744ab63 (youtube XPQ26cF9sBA 2026-07-26, draft db67b61c-33f2-40da-b14c-c83b52b026d2, render_log 2f86f1a6-c2a4-4389-b2c2-d741f238d039, creatomate 758f98e2) AND ad41daf1-61db-4d85-8cef-b18ddc052529 (youtube oHDyazW1isQ 2026-07-27, draft 4dcd3c86-4296-4524-b9e3-5ce6cd628218, render_log dfcbec28-3c33-43dd-a3b7-7ce91d2773b3, creatomate d56d1273); tmr winner video_stat_reveal_9x16_v2, authority pin v2.22.0 fired on both; slots force-filled early (supervised pipeline runs, not fully natural) — disclosed, accepted. Packet: docs/briefs/cgu-trail-alignment-proof-event-packet-v1.md',
   'production_publish','2026-07-26 11:45:08.261+00','CGU trail alignment (PK decisions 2+3, 2026-08-02, cgu-final-readiness-audit-result-v1.md s6b; B1 pattern)');

  SELECT count(*) INTO v_post FROM c.creative_template_proof_event;
  IF v_post - v_pre <> 4 THEN
    RAISE EXCEPTION 'G5 STOP: expected exactly 4 inserted rows, got %', v_post - v_pre;
  END IF;
END $$;
```

Every `RAISE EXCEPTION` aborts the single-statement transaction — all STOPs are executable, none prose-only.

## 3. Rollback (validated shape; byte-exact reverse)

```sql
DO $$
DECLARE v_n int;
BEGIN
  DELETE FROM c.creative_template_proof_event WHERE id IN
    ('c9150001-0000-4000-8000-000000000001','c9150001-0000-4000-8000-000000000002',
     'c9150001-0000-4000-8000-000000000003','c9150001-0000-4000-8000-000000000004');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 4 THEN RAISE EXCEPTION 'ROLLBACK STOP: expected 4 rows, deleted %', v_n; END IF;
END $$;
```

Pre-image = zero (G4 asserts the IDs are unused), so DELETE-by-fixed-ID restores the exact pre-apply state.

## 4. Blast radius / non-effects

- Additive INSERT only; no UPDATE/DELETE, no DDL, no grant change, no status column touched (row-4's assignment stays `visually_approved` — rung-12 promotion is deliberately NOT taken here).
- `select_template` does not read `c.creative_template_proof_event` for `platform_publish` rows in its eligibility gate (it gates on `visual_approval`) — zero selector impact. The readiness queue reads publish history from `m.post_publish`, not this table — zero queue-output change.
- Consumers of these rows: audit/graduation evidence readers (the 13-rung ladder rung-9 record) and the Milestone re-run contract R2 (`cgu-final-readiness-audit-result-v1.md` §6).

## 4b. Review chain (complete 2026-08-02 — packet STOPPED at PK apply gate)

- `db-rls-auditor`: **clean/pass, high confidence, zero must-fix** — all live assertions re-verified (3 assignment statuses exact · 5 publish rows published, platforms/timestamps byte-matching · zero duplicate events · 4 fixed IDs unused · live `select_template` body filters proof events on `visual_approval` only, zero selector impact · schema/constraint fit confirmed · single-statement DO = single txn, all guards abort-and-rollback). One benign note: G5's v_pre/v_post under READ COMMITTED can false-abort on a concurrent commit — fail-closed direction, accepted.
- `apply-harness-auditor` (SHADOW, clears no gate): **PASS/clean, zero findings**; check-7 identity chain exact.
- `branch-warden`: **safe** (isolated worktree, this branch).
- External review: **agree / proceed, no escalation** — `review_id ce70d9c6-d3b6-4218-a1ac-4e5dbb449eb7`, `reviewed_input_hash` (this file, pre-§4b revision) `169d881b5087c415f0c1e5b465fcf9b729a462b0b2a2b378c85f3486de89b75b`. This §4b block was appended AFTER the review; the reviewed content (§1–§5 apply substance) is unchanged — any edit to §1–§5 voids the review.

**Apply authority: NOT granted by this chain.** The apply is a separate PK act against this exact packet.

## 5. Expected post-apply verification

`SELECT id, assignment_id, platform FROM c.creative_template_proof_event WHERE id::text LIKE 'c9150001%'` → exactly 4 rows; re-run of audit query R2 shows the four cells carrying `platform_publish/passed`.
