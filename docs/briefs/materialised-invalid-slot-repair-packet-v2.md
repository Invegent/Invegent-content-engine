# Already-Materialised Invalid Slot Repair — Packet v2 (data-only, 6 rows)

> **Lane:** already-materialised invalid slot repair (S8) · **Type:** APPLY packet (DML) · **Tier:** T3 (production data mutation on the scheduling spine)
> **Status:** author-only. **NOT APPLIED.** No DML executed, no row mutated, no commit, no push, no deploy.
> **Supersedes:** `docs/briefs/materialised-invalid-slot-repair-packet-v1.md` (`834d4f7cfcb9d7f3a66da92e29acbba7375af46b55206f91c327040d11c502ef`, 48846 B) — **NOT overwritten; preserved for the record.** v1 was authored pre-Slice-2 against a **3-row** invalid population; the live population has since grown to **6** (three NEW post-Slice-2 rows materialised by the nightly cron). v1 would abort at its `A-IDENT` presence/absence check and is **non-executable**. This v2 replaces it.
> **ID:** **none allocated.** S8 did not self-allocate a `cc-` identifier — the control tower allocates centrally.
> **Author:** S8 (author only). **S8 is NOT the apply hand.** Segregation of duties, same shape as cc-0079 Slice 2. **Anything ambiguous in this packet is a halt for the apply hand, not a judgement call.**
> **Base (stale-ref gate PASSED, independently re-derived):** CE `HEAD == origin/main == git ls-remote origin refs/heads/main == befdaf57af918dcc65e868be875fd81c72b11227` (v6.25), branch `main`, parity 0/0. Target project `mbkmaxqhsohbtwsqolns` (`content_engine`). All evidence read live **2026-07-25**, in-DB `now()` = `2026-07-25 01:17:55+00`.

---

## 0 · Why this lane exists, and what it is NOT

`m.materialise_slots(7)` runs nightly (cron `materialise-slots-nightly`, jobid **72**, `0 15 * * *`) and inserts slots 7 days forward with `ON CONFLICT DO NOTHING` — no `UPDATE` branch, no `EXCLUDED` clause. A slot row already written therefore keeps the `format_preference` it was born with **forever** (§2). Slots carrying a format their platform cannot publish are never self-corrected.

**cc-0079 Slice 2 is now APPLIED and PROVEN** (v6.25 — the stored mix records only publishable formats, FB 3 / IG 2 / LI 2, YouTube untouched). But Slice 2 fixed the *mix defaults*; it does not re-write slot rows already materialised from the *old* mix, and — critically — the nightly cron, running against the *new* mix, **still materialises invalid slots** whenever the allocator's demand-vs-cadence rounding lands a valid-but-still-unpublishable format into a slot. **The invalid-future population grew from 3 to 6 between v1 and v2**, confirming the drift is live, not static.

| Fix | What it changes | Why these 6 rows survive it |
|---|---|---|
| **cc-0079 Slice 2** (data, APPLIED) | the *mix defaults* in `t.platform_format_mix_default` | these slot rows were written by `materialise_slots`, which never re-reads the mix for an existing row |
| **S7 durable fix** (code, PENDING) | intersects `platform_support` at *grid build time* in `m.build_weekly_demand_grid` | these rows are already materialised — downstream of grid build |

They are **downstream of both**. This packet is the only thing that repairs them. **Scope: exactly six rows, one column (`format_preference`).** No schema change, no function change, no other row, no other client, no past row.

---

## 1 · The invalid-future population — PINNED LIVE, FULL SET (dispatch steps 1 + 5)

Re-derived mechanically at 2026-07-25 01:17:55Z, not trusted from the dispatch. The query joins every future slot's `format_preference` against `t."5.3_content_format".platform_support`:

```sql
SELECT s.slot_id, c.client_slug, s.platform, s.scheduled_publish_at, s.format_preference,
       (f.platform_support->>s.platform) AS support_raw, s.status, s.filled_at, s.filled_draft_id, s.format_chosen, s.intent_id
  FROM m.slot s
  JOIN c.client c ON c.client_id = s.client_id
  CROSS JOIN LATERAL unnest(s.format_preference) AS pf(k)
  LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
 WHERE s.scheduled_publish_at >= now()
   AND COALESCE((f.platform_support->>s.platform)::boolean,false) = false
 ORDER BY s.scheduled_publish_at;
```

**Returned exactly 6 rows — no more, no fewer. All property-pulse, all `status='future'`, all commitment columns NULL:**

| # | `slot_id` | platform | `scheduled_publish_at` (UTC) | current fmt | `platform_support` | status | filled/chosen/intent |
|---|---|---|---|---|---|---|---|
| 1 | `4d81ae7c-d330-4b16-80f4-2893ec532fd8` | linkedin | `2026-07-27 02:00:00+00` | `carousel` | `false` | `future` | all NULL |
| 2 | `cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6` | linkedin | `2026-07-28 02:00:00+00` | `carousel` | `false` | `future` | all NULL |
| 3 | `a8c70f51-8319-402b-a645-f7cbd8014c79` | instagram | `2026-07-30 00:00:00+00` | `video_short_kinetic` | `false` | `future` | all NULL |
| 4 | `fbcbd5cd-3c15-4193-96d1-170954e7ba47` | facebook | `2026-07-30 21:30:00+00` | `video_short_kinetic` | `false` | `future` | all NULL |
| 5 | `94d61b80-ed97-40b5-9329-0c1cce96e55e` | instagram | `2026-07-31 00:00:00+00` | `video_short_stat_voice` | **`null`** | `future` | all NULL |
| 6 | `16127789-b493-4936-ac85-2ad1d4b8d18e` | linkedin | `2026-07-31 02:00:00+00` | `video_short_kinetic` | `false` | `future` | all NULL |

This set **exactly matches the control tower's cross-check list** (6 rows, same ids/platforms/formats/times) — independent derivation, same result.

> **Slot 5 detail:** `video_short_stat_voice.platform_support` is `{"youtube":true,"facebook":false}` — it has **no `instagram` key at all**. `platform_support->>'instagram'` returns SQL `NULL`, which `COALESCE(...,false)` correctly treats as unpublishable. The invalid-detection predicate handles the missing-key case identically to an explicit `false`; slot 5 is genuinely invalid on Instagram, not a query artifact.

Supporting live facts: PP `client_id = 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`, `timezone = Australia/Sydney`, `m.format_mix_enrolled = true`, **0** current rows in `c.client_format_mix_override`.

---

## 2 · Why normal materialisation will NEVER correct them (dispatch step, unchanged from v1)

Verified by reading the live `m.materialise_slots` body. Its only write to `m.slot` is:

```sql
INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, ...)
VALUES (..., v_format_pref, ...)
ON CONFLICT DO NOTHING;
```

No `DO UPDATE`, no `EXCLUDED`, no `SET`. The conflict target is:

```sql
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot USING btree (client_id, platform, scheduled_publish_at)
  WHERE (status <> ALL (ARRAY['skipped'::text, 'failed'::text, 'published'::text]));
```

All 6 rows are `status='future'` → inside the partial index. Every nightly run recomputes the correct preference, collides, and **discards it**. Zero user triggers exist on `m.slot`. The corrected value is computed and thrown away nightly; it never lands.

---

## 3 · The governed assignment for each slot (dispatch step 2)

Slice 2 is **applied**, so this is a **live reading**, not a projection (the v1 caveat no longer applies). Each row below was produced by feeding the **live** `m.build_weekly_demand_grid(PP, week)` through the **real** `m.allocate_week_formats(shares, N)` and taking the element at the slot's live ordinal. All six slots fall in ISO week Monday **2026-07-27**, N=5 per platform.

| # | `slot_id` | platform | sched (UTC) | ordinal | live week assignment | **from** | **to** |
|---|---|---|---|---|---|---|---|
| 1 | `4d81ae7c…` | linkedin | 07-27 02:00 | 1 | `text·image_quote·text·text·image_quote` | `carousel` | **`text`** |
| 2 | `cdb9cc97…` | linkedin | 07-28 02:00 | 2 | `text·image_quote·text·text·image_quote` | `carousel` | **`image_quote`** |
| 3 | `a8c70f51…` | instagram | 07-30 00:00 | 4 | `carousel·image_quote·carousel·carousel·image_quote` | `video_short_kinetic` | **`carousel`** |
| 4 | `fbcbd5cd…` | facebook | 07-30 21:30 | 5 | `image_quote·carousel·image_quote·carousel·text` | `video_short_kinetic` | **`text`** |
| 5 | `94d61b80…` | instagram | 07-31 00:00 | 5 | `carousel·image_quote·carousel·carousel·image_quote` | `video_short_stat_voice` | **`image_quote`** |
| 6 | `16127789…` | linkedin | 07-31 02:00 | 5 | `text·image_quote·text·text·image_quote` | `video_short_kinetic` | **`image_quote`** |

`A-PROJ` in §5 re-derives every one of these from live state at apply time and aborts if any no longer holds — the table is a snapshot, never a trusted constant. (Method soundness is self-evident here: the LinkedIn/Instagram ordinals 1/2/4 reproduce the same values the equivalent v1 lane validated against ground truth.)

### 3.1 — Target formats are safe to repair INTO (checked, not assumed)

`m.fill_pending_slots` **fails** a slot with `format_policy_missing:<fmt>` if either `t.format_synthesis_policy` or `t.format_quality_policy` lacks a current row for the chosen format. All five distinct proposed formats verified live:

| platform | proposed | `platform_support` | `is_active` | current synth policy | current quality policy |
|---|---|---|---|---|---|
| linkedin | `text` | true | true | 1 | 1 |
| linkedin | `image_quote` | true | true | 1 | 1 |
| instagram | `carousel` | true | true | 1 | 1 |
| instagram | `image_quote` | true | true | 1 | 1 |
| facebook | `text` | true | true | 1 | 1 |

All safe. Enforced at apply time by `A-TARGET`.

---

## 4 · Downstream dependency determination (dispatch steps 3 + 4 + 7) — the safety question

Every inbound FK to `m.slot` (enumerated from `pg_constraint`) queried against **all six** target ids:

| Referencing table | FK | `ON DELETE` | **rows attached to the 6 targets** |
|---|---|---|---|
| `m.post_draft` | `post_draft_slot_id_fkey` | SET NULL | **0** |
| `m.ai_job` | `fk_ai_job_slot` | CASCADE | **0** |
| `m.slot_fill_attempt` | `slot_fill_attempt_slot_id_fkey` | CASCADE | **0** |
| `m.slot_alerts` | `slot_alerts_slot_id_fkey` | CASCADE | **0** |
| `r.ice_publication_evidence` | `ice_publication_evidence_slot_id_fkey` | SET NULL | **0** |

Own commitment columns across all six: `filled_at` NULL · `filled_draft_id` NULL · `format_chosen` NULL · `intent_id` NULL · `status='future'`. Rows with any commitment: **0**.

> **Verdict: ZERO downstream drafts, renders, approvals, publications, AI jobs, fill attempts or alerts across all six.** Every slot is an empty, unfilled, uncommitted future row. **The repair orphans nothing.** `A-DEP` re-asserts all of this at apply time and aborts if any slot has acquired downstream work (dispatch step 7).

### 4.1 — The repair is material, not cosmetic

`m.fill_pending_slots` (live body) contains `v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');`, and `v_chosen_format` drives the synthesis/quality-policy lookup, the evergreen match, `slot_fill_attempt.chosen_format`, `ai_job.input_payload->>'format'` (what the AI worker synthesises) and `slot.format_chosen`. Repairing `format_preference` changes what actually gets made.

### 4.2 — ⚠ There is NO `platform_support` gate anywhere in the fill path

`m.fill_pending_slots` never consults `platform_support`. Historical PP LinkedIn `carousel` slots that show `skipped` did so for `bundle_diversity_insufficient` (thin pool), coincidentally — **not** because the system rejected the format. If the pool is healthy when these slots fill, an unpublishable format **will** be synthesised. This is corroborating evidence for S7's durable fix; it is **not** repaired here.

---

## 5 · The repair script — ONE transaction, ONE call (dispatch steps 5, 6, 8)

> **Submit this entire block as a SINGLE execution.** Sanctioned channels in §9.1. Fragmented execution is a STOP condition **and** is machine-blocked by `G-ATOMIC`.
> **Every assertion below is executable code that `RAISE EXCEPTION`s. Not one is a comment.** Inherits the cc-0079 Slice 2 halt lessons (`docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md`): M-1 (comments are not assertions), M-2 (separate `execute_sql` calls do not share a transaction), S-3 (detect absence, not just duplicates).
> The script produces **exactly one result set** — the final summary `SELECT` before `COMMIT`. **Record it verbatim.**

```sql
BEGIN;

-- ============================================================================
-- STEP 0 -- transaction anchor + in-transaction baselines (NO mutation yet)
-- ============================================================================
CREATE TEMP TABLE _s8_txn ON COMMIT DROP AS
SELECT pg_current_xact_id() AS xid, pg_backend_pid() AS pid, clock_timestamp() AS t0;

CREATE TEMP TABLE _s8_before ON COMMIT DROP AS
SELECT slot_id, client_id, platform, scheduled_publish_at, format_preference,
       format_chosen, status, filled_at, filled_draft_id, intent_id
  FROM m.slot;

-- The repair payload -- FROZEN. Single source of truth for both the UPDATE
-- and the assertions.
CREATE TEMP TABLE _s8_repair(
  slot_id uuid, platform text, sched timestamptz, ordinal int, from_fmt text, to_fmt text) ON COMMIT DROP;
INSERT INTO _s8_repair VALUES
  ('4d81ae7c-d330-4b16-80f4-2893ec532fd8','linkedin' ,'2026-07-27 02:00:00+00',1,'carousel'              ,'text'),
  ('cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6','linkedin' ,'2026-07-28 02:00:00+00',2,'carousel'              ,'image_quote'),
  ('a8c70f51-8319-402b-a645-f7cbd8014c79','instagram','2026-07-30 00:00:00+00',4,'video_short_kinetic'   ,'carousel'),
  ('fbcbd5cd-3c15-4193-96d1-170954e7ba47','facebook' ,'2026-07-30 21:30:00+00',5,'video_short_kinetic'   ,'text'),
  ('94d61b80-ed97-40b5-9329-0c1cce96e55e','instagram','2026-07-31 00:00:00+00',5,'video_short_stat_voice','image_quote'),
  ('16127789-b493-4936-ac85-2ad1d4b8d18e','linkedin' ,'2026-07-31 02:00:00+00',5,'video_short_kinetic'   ,'image_quote');

-- ============================================================================
-- P-PRECOND -- cc-0079 Slice 2 MUST be applied. Machine-enforced, not memory.
-- ============================================================================
DO $$
DECLARE n_bad int; n_plat int; r record;
BEGIN
  SELECT count(*) INTO n_bad
    FROM t.platform_format_mix_default d
    JOIN t."5.3_content_format" f ON f.ice_format_key = d.ice_format_key
   WHERE d.is_current AND COALESCE((f.platform_support->>d.platform)::boolean,false) = false;
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'P-PRECOND FAILED: % current mix row(s) unpublishable -- Slice 2 not applied. ABORT.', n_bad; END IF;

  SELECT count(DISTINCT platform) INTO n_plat FROM t.platform_format_mix_default WHERE is_current;
  IF n_plat <> 4 THEN
    RAISE EXCEPTION 'P-PRECOND FAILED: % platform(s) with current mix rows, expected 4. ABORT.', n_plat; END IF;

  FOR r IN SELECT platform, count(*) AS c, sum(default_share_pct) AS s
             FROM t.platform_format_mix_default WHERE is_current GROUP BY platform LOOP
    IF r.s <> 100.00 THEN RAISE EXCEPTION 'P-PRECOND FAILED: platform % sums to %, expected 100.00. ABORT.', r.platform, r.s; END IF;
    IF r.platform='facebook'  AND r.c<>3 THEN RAISE EXCEPTION 'P-PRECOND FAILED: facebook % current rows, expected 3. ABORT.', r.c; END IF;
    IF r.platform='instagram' AND r.c<>2 THEN RAISE EXCEPTION 'P-PRECOND FAILED: instagram % current rows, expected 2. ABORT.', r.c; END IF;
    IF r.platform='linkedin'  AND r.c<>2 THEN RAISE EXCEPTION 'P-PRECOND FAILED: linkedin % current rows, expected 2. ABORT.', r.c; END IF;
    IF r.platform='youtube'   AND r.c<>5 THEN RAISE EXCEPTION 'P-PRECOND FAILED: youtube % current rows, expected 5. ABORT.', r.c; END IF;
  END LOOP;
END $$;

-- ============================================================================
-- A-IDENT -- pinned 6 match live EXACTLY, and NO invalid future slot exists
-- outside the pinned set (PRESENCE and ABSENCE -- the population-completeness
-- assertion, dispatch step 5).
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(DISTINCT slot_id) INTO n FROM _s8_repair;
  IF n <> 6 THEN RAISE EXCEPTION 'A-IDENT FAILED: payload holds % distinct slot id(s), expected 6. ABORT.', n; END IF;

  -- PRESENCE: each target exists live and matches platform + schedule + current format
  SELECT count(*) INTO n
    FROM _s8_repair rp JOIN m.slot s ON s.slot_id = rp.slot_id
   WHERE s.platform = rp.platform AND s.scheduled_publish_at = rp.sched
     AND s.format_preference = ARRAY[rp.from_fmt];
  IF n <> 6 THEN
    RAISE EXCEPTION 'A-IDENT FAILED: only % of 6 target(s) match live identity. Rows drifted since authoring. ABORT and re-derive.', n; END IF;

  -- ABSENCE / COMPLETENESS: no OTHER future slot may carry an unpublishable format
  SELECT count(*) INTO n
    FROM m.slot s
    CROSS JOIN LATERAL unnest(s.format_preference) AS pf(k)
    LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
   WHERE s.scheduled_publish_at >= now()
     AND COALESCE((f.platform_support->>s.platform)::boolean,false) = false
     AND s.slot_id NOT IN (SELECT slot_id FROM _s8_repair);
  IF n <> 0 THEN
    RAISE EXCEPTION 'A-IDENT FAILED: % future slot(s) OUTSIDE the pinned set carry an unpublishable format -- the population changed since authoring. ABORT and re-derive.', n; END IF;
END $$;

-- ============================================================================
-- A-DEP -- the dependency fence (dispatch steps 3, 4, 7). Any downstream work
-- or commitment on any target aborts.
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.post_draft d        JOIN _s8_repair rp ON rp.slot_id = d.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % post_draft row(s) attached. ABORT and surface to PK.', n; END IF;
  SELECT count(*) INTO n FROM m.ai_job a            JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % ai_job row(s) attached. ABORT and surface to PK.', n; END IF;
  SELECT count(*) INTO n FROM m.slot_fill_attempt a JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % slot_fill_attempt row(s) attached -- slot already worked. ABORT and surface to PK.', n; END IF;
  SELECT count(*) INTO n FROM m.slot_alerts a       JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % slot_alerts row(s) attached. ABORT and surface to PK.', n; END IF;
  SELECT count(*) INTO n FROM r.ice_publication_evidence e JOIN _s8_repair rp ON rp.slot_id = e.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % publication evidence row(s) attached -- slot PUBLISHED. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM m.slot s JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.filled_at IS NOT NULL OR s.filled_draft_id IS NOT NULL OR s.format_chosen IS NOT NULL
      OR s.intent_id IS NOT NULL OR s.status NOT IN ('future','pending_fill');
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % target(s) already filled or committed. ABORT and surface to PK.', n; END IF;
END $$;

-- ============================================================================
-- A-TARGET -- never repair INTO an unpublishable/inactive/policy-missing format
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM _s8_repair rp
    JOIN t."5.3_content_format" f ON f.ice_format_key = rp.to_fmt
   WHERE COALESCE((f.platform_support->>rp.platform)::boolean,false) = true
     AND f.is_active = true
     AND EXISTS (SELECT 1 FROM t.format_synthesis_policy p WHERE p.ice_format_key = rp.to_fmt AND p.is_current)
     AND EXISTS (SELECT 1 FROM t.format_quality_policy   q WHERE q.ice_format_key = rp.to_fmt AND q.is_current);
  IF n <> 6 THEN
    RAISE EXCEPTION 'A-TARGET FAILED: only % of 6 proposed format(s) are publishable AND active AND hold BOTH current policies. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A-PROJ -- RE-DERIVE the governed assignment from LIVE state through the real
-- allocator, per slot. The §3 table is never trusted as a constant.
-- ============================================================================
DO $$
DECLARE
  rp record; v_client uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  v_tz text; v_wk date; v_shares jsonb; v_assign text[]; v_n integer; v_ord integer; v_expect text;
BEGIN
  SELECT timezone INTO v_tz FROM c.client WHERE client_id = v_client;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'A-PROJ FAILED: client timezone NULL. ABORT.'; END IF;

  FOR rp IN SELECT * FROM _s8_repair ORDER BY sched LOOP
    v_wk := date_trunc('week', (rp.sched AT TIME ZONE v_tz)::date)::date;

    SELECT COUNT(*)::integer INTO v_n
      FROM c.client_publish_schedule s
      JOIN generate_series(v_wk, v_wk + 6, interval '1 day') d ON EXTRACT(isodow FROM d)::integer = s.day_of_week
     WHERE s.client_id = v_client AND s.platform = rp.platform AND s.enabled = TRUE;
    IF v_n <> 5 THEN
      RAISE EXCEPTION 'A-PROJ FAILED: platform % has % enabled slot(s) in week %, expected 5 -- cadence changed. ABORT.', rp.platform, v_n, v_wk; END IF;

    SELECT occ.ordinal INTO v_ord
      FROM (SELECT (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz AS occ_ts,
                   row_number() OVER (ORDER BY (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz ASC) AS ordinal
              FROM c.client_publish_schedule s
              JOIN generate_series(v_wk, v_wk + 6, interval '1 day') d ON EXTRACT(isodow FROM d)::integer = s.day_of_week
             WHERE s.client_id = v_client AND s.platform = rp.platform AND s.enabled = TRUE) occ
     WHERE occ.occ_ts = rp.sched ORDER BY occ.ordinal ASC LIMIT 1;
    IF v_ord IS NULL OR v_ord <> rp.ordinal THEN
      RAISE EXCEPTION 'A-PROJ FAILED: slot % live ordinal %, packet froze %. ABORT and re-derive.', rp.slot_id, COALESCE(v_ord,-1), rp.ordinal; END IF;

    SELECT jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                     ORDER BY g.share_pct DESC, g.ice_format_key ASC)
      INTO v_shares
      FROM m.build_weekly_demand_grid(v_client, v_wk) g WHERE g.platform = rp.platform;
    IF v_shares IS NULL THEN
      RAISE EXCEPTION 'A-PROJ FAILED: demand grid empty for platform % -- it vanished from the grid. ABORT.', rp.platform; END IF;

    v_assign := m.allocate_week_formats(v_shares, v_n);
    IF v_assign IS NULL OR array_length(v_assign,1) <> v_n THEN
      RAISE EXCEPTION 'A-PROJ FAILED: allocator returned % element(s) for %, expected %. ABORT.', COALESCE(array_length(v_assign,1),0), rp.platform, v_n; END IF;

    v_expect := v_assign[rp.ordinal];
    IF v_expect IS DISTINCT FROM rp.to_fmt THEN
      RAISE EXCEPTION 'A-PROJ FAILED: slot % (% ord %) -- live allocator yields %, packet froze %. ABORT and re-derive.', rp.slot_id, rp.platform, rp.ordinal, COALESCE(v_expect,'<null>'), rp.to_fmt; END IF;
  END LOOP;
END $$;

-- ============================================================================
-- U1 -- the repair. Six rows, one column. CAS-guarded on the prior value.
-- ============================================================================
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _s8_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at U1: transaction identity changed (anchor %, now %). Not one transaction. ABORT.', v_anchor, pg_current_xact_id(); END IF;

  UPDATE m.slot s
     SET format_preference = ARRAY[rp.to_fmt], updated_at = now()
    FROM _s8_repair rp
   WHERE s.slot_id = rp.slot_id
     AND s.format_preference = ARRAY[rp.from_fmt];   -- CAS: only if still unchanged

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'U1 FAILED: updated % row(s), expected exactly 6. ABORT.', n; END IF;
END $$;

-- ============================================================================
-- A-POST -- the repair achieved its purpose (PRESENCE and ABSENCE)
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.slot s JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rp.to_fmt];
  IF n <> 6 THEN RAISE EXCEPTION 'A-POST FAILED: only % of 6 target(s) hold the repaired format. ABORT.', n; END IF;

  SELECT count(*) INTO n
    FROM m.slot s CROSS JOIN LATERAL unnest(s.format_preference) AS pf(k)
    LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
   WHERE s.scheduled_publish_at >= now()
     AND COALESCE((f.platform_support->>s.platform)::boolean,false) = false;
  IF n <> 0 THEN RAISE EXCEPTION 'A-POST FAILED: % future slot(s) STILL carry an unpublishable format. ABORT.', n; END IF;
END $$;

-- ============================================================================
-- A-BLAST -- blast radius. Exactly 6 rows, exactly 1 column, nothing else.
-- ============================================================================
DO $$
DECLARE n_now int; n_before int; n_diff int;
BEGIN
  SELECT count(*) INTO n_now FROM m.slot;
  SELECT count(*) INTO n_before FROM _s8_before;
  IF n_now <> n_before THEN RAISE EXCEPTION 'A-BLAST FAILED: m.slot holds % rows vs % at snapshot. ABORT.', n_now, n_before; END IF;

  SELECT count(*) INTO n_diff FROM m.slot s JOIN _s8_before b USING (slot_id)
   WHERE s.format_preference IS DISTINCT FROM b.format_preference;
  IF n_diff <> 6 THEN RAISE EXCEPTION 'A-BLAST FAILED: % row(s) changed format_preference, expected 6. ABORT.', n_diff; END IF;

  SELECT count(*) INTO n_diff FROM m.slot s JOIN _s8_before b USING (slot_id)
   WHERE s.format_preference IS DISTINCT FROM b.format_preference
     AND s.slot_id NOT IN (SELECT slot_id FROM _s8_repair);
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A-BLAST FAILED: % changed row(s) NOT in the pinned set. ABORT.', n_diff; END IF;

  SELECT count(*) INTO n_diff FROM m.slot s JOIN _s8_before b USING (slot_id) JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.client_id IS DISTINCT FROM b.client_id OR s.platform IS DISTINCT FROM b.platform
      OR s.scheduled_publish_at IS DISTINCT FROM b.scheduled_publish_at
      OR s.format_chosen IS NOT NULL OR s.filled_at IS NOT NULL OR s.filled_draft_id IS NOT NULL
      OR s.intent_id IS NOT NULL OR s.status NOT IN ('future','pending_fill');
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A-BLAST FAILED: % target(s) had an immutable column altered or became filled mid-txn. ABORT.', n_diff; END IF;
END $$;

-- ============================================================================
-- FINAL -- the ONLY result set. RECORD THIS OUTPUT VERBATIM.
-- ============================================================================
SELECT 'REPAIR OK -- all assertions passed'                  AS status,
       (SELECT count(*) FROM _s8_repair)                     AS rows_repaired,
       (SELECT xid FROM _s8_txn)                             AS txn_xid,
       (SELECT jsonb_agg(jsonb_build_object(
                 'slot_id', s.slot_id, 'platform', s.platform,
                 'scheduled_publish_at', s.scheduled_publish_at,
                 'was', rp.from_fmt, 'now', s.format_preference)
               ORDER BY s.scheduled_publish_at)
          FROM m.slot s JOIN _s8_repair rp ON rp.slot_id = s.slot_id) AS repaired_rows;

COMMIT;
```

---

## 6 · Assertion register — every STOP, and where it is enforced

**Every row below is executable code in §5. None is a comment.**

| # | Assertion | Expected | Enforcement | Purpose |
|---|---|---|---|---|
| **G-ATOMIC** | current xid == anchored xid | equal | `RAISE` in U1; every step depends on step-0 temp tables | M-2: fragmented execution aborts |
| **P-PRECOND** | all current mix rows publishable · 4 platforms · sums 100.00 · FB3/IG2/LI2/YT5 | exact | `RAISE`×3 + loop | Machine-enforces Slice-2-first |
| **A-IDENT** | 6 distinct ids · all 6 match live · **zero** invalid future slots outside the set | 6/6/0 | `RAISE`×3 | PRESENCE + ABSENCE (population-completeness, dispatch step 5) |
| **A-DEP** | 0 rows in each of 5 inbound-FK tables · targets unfilled/uncommitted | 0 everywhere | `RAISE`×6 | Dispatch steps 3/4/7 |
| **A-TARGET** | proposed formats publishable+active+both policies | 6 of 6 | `RAISE` | Never repair into `format_policy_missing` |
| **A-PROJ** | live N=5 · live ordinal==frozen · grid non-empty · allocator[ordinal]==frozen to_fmt | exact, per slot | `RAISE`×5 in loop | §3 re-derived, never a constant |
| **U1** | rows updated | exactly **6** | `GET DIAGNOSTICS`+`RAISE`, CAS on prior | The repair |
| **A-POST** | 6 targets hold repaired value · **zero** invalid future slots remain | 6/0 | `RAISE`×2 | PRESENCE + ABSENCE post-state |
| **A-BLAST** | row count unchanged · exactly 6 diffs · all in pinned set · no other column touched | exact | `RAISE`×4 | Blast-radius fence |

**Failure semantics:** any `RAISE EXCEPTION` aborts the entire call; the transaction rolls back and **nothing commits**. No subset can commit through a sanctioned channel, and `G-ATOMIC` aborts a non-sanctioned one.

**Known benign-abort case:** `A-BLAST` aborts if a target is promoted `future→pending_fill` **and then filled** by cron mid-transaction. A promote alone is tolerated. A fill mid-transaction is exactly what should abort. The transaction is sub-second against a 5-minute cron; if it trips, **do not retry blindly** — re-derive, because the slot now has downstream work.

---

## 7 · Rollback (dispatch step 9)

### 7.1 — Exact rollback, by identity, CAS-guarded

Run as **ONE call**, same channel rules as §5. Prior values are literals, so it does **not** depend on §5's result set.

```sql
BEGIN;

CREATE TEMP TABLE _s8_rb_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

CREATE TEMP TABLE _s8_rb(slot_id uuid, restore_to text, repaired_to text) ON COMMIT DROP;
INSERT INTO _s8_rb VALUES
  ('4d81ae7c-d330-4b16-80f4-2893ec532fd8','carousel'              ,'text'),
  ('cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6','carousel'              ,'image_quote'),
  ('a8c70f51-8319-402b-a645-f7cbd8014c79','video_short_kinetic'   ,'carousel'),
  ('fbcbd5cd-3c15-4193-96d1-170954e7ba47','video_short_kinetic'   ,'text'),
  ('94d61b80-ed97-40b5-9329-0c1cce96e55e','video_short_stat_voice','image_quote'),
  ('16127789-b493-4936-ac85-2ad1d4b8d18e','video_short_kinetic'   ,'image_quote');

-- R0 -- guard: rows must currently hold the REPAIRED value
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rb.repaired_to];
  IF n <> 6 THEN RAISE EXCEPTION 'R0 FAILED: only % of 6 hold the repaired value. Rollback does not describe live state. ABORT.', n; END IF;
END $$;

-- R1 -- restore
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _s8_rb_txn;
  IF pg_current_xact_id() <> v_anchor THEN RAISE EXCEPTION 'G-ATOMIC FAILED at R1: transaction identity changed. ABORT.'; END IF;

  UPDATE m.slot s SET format_preference = ARRAY[rb.restore_to], updated_at = now()
    FROM _s8_rb rb
   WHERE s.slot_id = rb.slot_id AND s.format_preference = ARRAY[rb.repaired_to];

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'R1 FAILED: restored % row(s), expected 6. ABORT.', n; END IF;
END $$;

-- R2 -- assert restored
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rb.restore_to];
  IF n <> 6 THEN RAISE EXCEPTION 'R2 FAILED: only % of 6 hold the restored value. ABORT.', n; END IF;
END $$;

SELECT 'ROLLBACK OK -- pre-repair state restored' AS status,
       (SELECT jsonb_agg(jsonb_build_object('slot_id', s.slot_id, 'format_preference', s.format_preference)
                         ORDER BY s.scheduled_publish_at)
          FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id) AS restored_rows;

COMMIT;
```

### 7.2 — Rollback residual (named)

`updated_at` is the **only** column that does not return to its pre-repair value. The six rows currently carry `created_at == updated_at`: slots 1/2/3 at `2026-07-20/21/23 15:00Z`, slots 4/5/6 uniformly `2026-07-24 15:00:00.605281+00`. After repair (or rollback) they carry `now()`. **`format_preference` restores exactly; nothing is destroyed; no row is deleted or created.**

**Rolling back restores a known-broken state** — it returns the slots to unpublishable formats. Correct if the repair misfires, but not a resting place: a rolled-back slot still needs a re-derived repair before its fill window.

---

## 8 · ⛔ TIMING — the hard deadline

The chain must fit before the earliest fill window. Cron does not wait.

| cron | jobid | schedule | effect |
|---|---|---|---|
| `promote-slots-to-pending-every-5m` | 73 | `*/5 * * * *` | `future → pending_fill` where `fill_window_opens_at <= now() + interval '10 minutes'` (**fires 10 min early**) |
| `fill-pending-slots-every-10m` | 75 | `*/10 * * * *` | `m.fill_pending_slots(5)` — **reads `format_preference[1]`; no `platform_support` gate** |

Deadlines, from live `fill_window_opens_at` (in-DB `now()` = `2026-07-25 01:17:55Z`):

| # | slot | platform | `fill_window_opens_at` | **effective deadline** (−10 min) |
|---|---|---|---|---|
| 1 | `4d81ae7c…` | linkedin | `2026-07-26 02:00Z` | **`2026-07-26 01:50 UTC` / 11:50 AM Sydney** ← earliest |
| 2 | `cdb9cc97…` | linkedin | `2026-07-27 02:00Z` | `2026-07-27 01:50 UTC` |
| 3 | `a8c70f51…` | instagram | `2026-07-29 00:00Z` | `2026-07-28 23:50 UTC` |
| 4 | `fbcbd5cd…` | facebook | `2026-07-29 21:30Z` | `2026-07-29 21:20 UTC` |
| 5 | `94d61b80…` | instagram | `2026-07-30 00:00Z` | `2026-07-29 23:50 UTC` |
| 6 | `16127789…` | linkedin | `2026-07-30 02:00Z` | `2026-07-30 01:50 UTC` |

> **The whole 6-row repair applies in one transaction, so the binding deadline is the earliest: `2026-07-26 01:50 UTC`.** The author→`db-rls-auditor`→external-review→PK-gate→apply chain must complete before it. If at any point it cannot safely fit, the apply hand **STOPs and surfaces to the control tower** (per dispatch). If only slot 1's window is at risk, note that repairing all six in one atomic call is still correct — there is no partial-apply that helps, because a fill mid-window is exactly what `A-BLAST`/`A-DEP` are designed to catch.

---

## 9 · Execution control

### 9.1 — Sanctioned channels

§5 **must** be submitted so all statements share one backend session and one transaction:

| # | Channel | Condition |
|---|---|---|
| **C-1** | A **single** `mcp__supabase__execute_sql` call carrying the entire §5 script | Proven to compose (cc-0079 halt probe P2) |
| **C-2** | `psql -v ON_ERROR_STOP=1 -f <script>` | one session |
| **C-3** | Supabase SQL Editor, whole script pasted and run **once** | one run action only |

**FORBIDDEN — a STOP:** statement-by-statement · splitting §5 across calls · pressing run more than once · any other channel. Also machine-enforced by `G-ATOMIC`.

### 9.2 — Sequence

1. Re-hash this packet **from a ref** (`git show <ref>:docs/briefs/materialised-invalid-slot-repair-packet-v2.md`). Mismatch → **STOP**.
2. Confirm target project `mbkmaxqhsohbtwsqolns`. Different → **STOP**.
3. Confirm cc-0079 Slice 2 applied AND proven. *(Also machine-enforced by `P-PRECOND`; the human gate comes first.)*
4. Confirm the external review's `reviewed_input_hash` equals this packet's sha256. Mismatch/missing → **STOP**.
5. Confirm `db-rls-auditor` returned normalized `clean` **against this hash**. Any other verdict → **STOP**.
6. Capture the out-of-band baseline (§9.4).
7. **PK apply gate. No production mutation occurs before this point.**
8. Execute §5 through **one** channel. Record the final result set verbatim.
9. **Post-repair proof** (§9.3) — separate read-only call, after COMMIT.

### 9.3 — Post-repair proof (read-only, after COMMIT)

```sql
SELECT s.slot_id, s.platform, s.scheduled_publish_at, s.format_preference, s.status,
       COALESCE((f.platform_support->>s.platform)::boolean,false) AS is_valid
  FROM m.slot s
  LEFT JOIN LATERAL unnest(s.format_preference) AS pf(k) ON true
  LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
 WHERE s.slot_id IN ('4d81ae7c-d330-4b16-80f4-2893ec532fd8','cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6',
                     'a8c70f51-8319-402b-a645-f7cbd8014c79','fbcbd5cd-3c15-4193-96d1-170954e7ba47',
                     '94d61b80-ed97-40b5-9329-0c1cce96e55e','16127789-b493-4936-ac85-2ad1d4b8d18e')
 ORDER BY s.scheduled_publish_at;
```

**Expected:** `text` / `image_quote` / `carousel` / `text` / `image_quote` / `image_quote`, `is_valid=true` on all six. Anything else → surface to PK. Also re-run §1's population query — it must now return **0 rows**.

### 9.4 — Out-of-band baseline (operator's record; `A-BLAST` does not depend on it)

```sql
SELECT slot_id, client_id, platform, scheduled_publish_at, format_preference,
       format_chosen, status, filled_at, filled_draft_id, intent_id, updated_at
  FROM m.slot WHERE scheduled_publish_at >= now() ORDER BY scheduled_publish_at;
```

Continuity value only: full-table `format_preference` fingerprint at authoring was `818a4fc53d78693d18d79f9659798fc8` over **1415** rows. `A-BLAST` uses the in-transaction snapshot, not this.

### 9.5 — STOP conditions

Packet hash mismatch · review hash mismatch/missing/non-clean · `db-rls-auditor` not `clean` on this hash · wrong project · Slice 2 not proven · any channel outside §9.1 · **any `RAISE EXCEPTION` from §5** (transaction already rolled back; do not retry without re-deriving) · post-repair proof not all-valid or population query not 0 · unexpected origin movement on the packet's ref · **any ambiguity in this packet** · **the earliest fill deadline cannot be safely met** (surface to control tower).

A tripped STOP voids the remainder; resumption requires a fresh PK gate (Convention 2).

### 9.6 — Privilege precondition

§5 reads `t.*`, `c.*`, `m.*` and writes `m.slot`. Schema `t` grants USAGE to none of `anon`, `authenticated`, `service_role` — the apply runs under the privileged role the sanctioned channels use. A `42501 permission denied` at step 0 means the wrong role: **STOP**, do not widen any grant.

---

## 10 · Observed but deliberately NOT repaired (scope fence)

**PK's blocker rule binds: none of these displaces the ordered program.**

| Observation | Why not repaired here |
|---|---|
| **~50 PAST slots carry unpublishable formats** (historical PP LI `carousel`, PP video-format rows, `video_short_avatar`, YouTube `image_quote`) | Already published/filled/skipped/failed. Repairing history changes nothing downstream. Out of scope. |
| **The nightly cron STILL materialises new invalid slots post-Slice-2** (this is why the population grew 3→6) | Root cause is the missing grid-time intersection — **S7's durable code fix**, sequenced after this repair. This packet repairs the rows that exist today; it does not stop tomorrow's. |
| **No `platform_support` gate in `m.fill_pending_slots`** (§4.2) | S7's durable-fix territory; a code change. Named as corroboration, not repaired. |
| **`m.materialise_slots` has no update path** (§2) | The durable fix is S7's. |
| **`m.slot.format_chosen` written by the filler but read by nothing** | Pre-existing, unrelated, out of scope. |

> **Standing recommendation (control tower's call, not this packet's):** because the cron keeps minting invalid slots, this repair is a **stopgap that will need re-running** until S7's durable fix lands. That is an argument for prioritising S7 immediately after this repair proves — it is **not** a reason to widen this data lane.

---

## 11 · Review status

- **A fresh external review pinned to this packet's sha256 is REQUIRED and has NOT been run.** No prior review covers this artifact (it is new; v1's had none either).
- **`db-rls-auditor` must be run against this hash.** NOT yet run.
- **The orchestrator runs both — not S8, and not the apply hand.**
- Any byte change mints a new sha256 and invalidates every review pinned to the old one (CLAUDE.md external-review rules 1, 4).

**Chain:** S8 freezes → orchestrator runs `db-rls-auditor` + fresh external review against the exact hash → an independent apply hand receives the reviewed packet → works §9.2 and **stops at the PK apply gate** → **no production mutation before that gate.**

---

## 12 · Non-claims

**Nothing applied. No DML executed, no row mutated, no schema touched, no function altered, no migration run, no commit, no push, no deploy.** S8 ran only read-only SELECTs and catalog reads plus two read-only function calls — `m.allocate_week_formats` (**IMMUTABLE**) and `m.build_weekly_demand_grid` (**STABLE**), both verified non-volatile before being called. No production table was written; no residue left.

The §5 and §7 scripts have **never been executed in any form.** Their assertions are new code that has never run; the primitives (`DO`/`RAISE EXCEPTION`, single-call transaction, `ON COMMIT DROP` temp tables, xid anchor) were proven by S1's probes in the cc-0079 halt lane, but this specific script has not been. That is what the `db-rls-auditor` pass, the external review and the PK gate are for.

**§3 is a live reading** (Slice 2 is applied), re-derived and re-verified by `A-PROJ` at apply time; it is never trusted as a constant. This packet does **not** approve, ratify or authorise the apply, does not allocate a `cc-` id, does not claim a register version, and does not decide the §8 timing question (control tower's). It does not repair past slots, does not change `m.materialise_slots`, does not add a `platform_support` gate to the fill path, and does not touch cc-0079 Slice 2, S7's durable fix, or any other lane. All counts, ids, timestamps and formats are live as of **2026-07-25**; identity, dependency, completeness and projection drift are all re-verified **by the script itself** at apply time — §1, §3 and §4 are point-in-time reads, not locks.

---

## FREEZE BLOCK

```
artifact  : docs/briefs/materialised-invalid-slot-repair-packet-v2.md
supersedes: docs/briefs/materialised-invalid-slot-repair-packet-v1.md
            (834d4f7cfcb9d7f3a66da92e29acbba7375af46b55206f91c327040d11c502ef, 48846 B)
            -- NOT overwritten; v1 was a 3-row pre-Slice-2 packet, non-executable under current 6-row population
lane      : already-materialised invalid slot repair (S8) -- NO cc- ID allocated
scope     : 6 rows of m.slot, column format_preference ONLY
payload   : FROZEN
            4d81ae7c-d330-4b16-80f4-2893ec532fd8  linkedin  2026-07-27 02:00Z  carousel               -> text
            cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6  linkedin  2026-07-28 02:00Z  carousel               -> image_quote
            a8c70f51-8319-402b-a645-f7cbd8014c79  instagram 2026-07-30 00:00Z  video_short_kinetic    -> carousel
            fbcbd5cd-3c15-4193-96d1-170954e7ba47  facebook  2026-07-30 21:30Z  video_short_kinetic    -> text
            94d61b80-ed97-40b5-9329-0c1cce96e55e  instagram 2026-07-31 00:00Z  video_short_stat_voice -> image_quote
            16127789-b493-4936-ac85-2ad1d4b8d18e  linkedin  2026-07-31 02:00Z  video_short_kinetic    -> image_quote
depends on: cc-0079 Slice 2 APPLIED AND PROVEN (v6.25) -- machine-enforced by P-PRECOND
sequencing: PK order -- (1) Slice 2 proven [DONE], (2) THIS repair, (3) prove downstream
            consistency, (4) S7 durable m.build_weekly_demand_grid change
deadline  : earliest fill window effectively opens 2026-07-26 01:50 UTC / 11:50 AM Sydney (section 8)
author    : S8 (author only; NOT the apply hand)
base      : CE HEAD == origin/main == befdaf57af918dcc65e868be875fd81c72b11227 (v6.25), parity 0/0
target    : project mbkmaxqhsohbtwsqolns (content_engine)
sha256    : carried OUT-OF-BAND in the S8 handoff line (a file cannot contain its own hash).
            Verify: python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/materialised-invalid-slot-repair-packet-v2.md','rb').read()).hexdigest())"
            Any byte change invalidates the pinned hash AND every review pinned to it.
bytes     : carried OUT-OF-BAND in the S8 handoff line.
review    : REQUIRED, NOT YET RUN. No prior review covers this artifact.
auditor   : db-rls-auditor REQUIRED against this hash, NOT YET RUN.
status    : NOT APPLIED -- FROZEN
```
