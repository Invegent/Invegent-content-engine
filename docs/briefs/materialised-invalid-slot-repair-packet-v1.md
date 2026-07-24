# Already-Materialised Invalid Slot Repair — Packet v1 (data-only, 3 rows)

> **Lane:** already-materialised invalid slot repair (opened by PK as a contained repair lane; found by S7 while designing the cc-0079 durable grid fix) · **Session:** S8 · **Type:** APPLY packet (DML) · **Tier:** T3 (production data mutation on the scheduling spine)
> **Status:** author-only. **NOT APPLIED.** No DML executed, no row mutated, no commit, no push, no deploy.
> **ID:** **none allocated.** S8 did not self-allocate a `cc-` identifier — the control tower allocates centrally. This packet is referenced by path until an ID is issued.
> **Author:** S8. **S8 is NOT the apply hand.** Segregation of duties, same shape as cc-0079 Slice 2: the hand that authored the packet must not be the hand that executes it. **Anything ambiguous in this packet is a halt for the apply hand, not a judgement call.**
> **Base (stale-ref gate PASSED, independently re-derived):** CE `HEAD == origin/main == 565540dbeff3e9c10bb0c32e23342c53feca3e15` (v6.23), branch `main`, parity 0/0. Target project `mbkmaxqhsohbtwsqolns` (`content_engine`). All evidence read live **2026-07-24**, in-DB `now()` = `2026-07-24 13:36:15.867207+00`.

---

## 0 · Why this lane exists, and what it is NOT

`m.materialise_slots(7)` runs nightly (cron `materialise-slots-nightly`, jobid **72**, `0 15 * * *`) and inserts slots 7 days forward with `ON CONFLICT DO NOTHING`. A slot row already written therefore keeps the `format_preference` it was born with **forever** — the function has no `UPDATE` branch and no `EXCLUDED` clause (§2, verified in the live function body).

Three future Property Pulse slots currently carry a format their platform cannot publish. **Neither cc-0079 Slice 2 nor S7's durable read-time intersection repairs them:**

| Fix | What it changes | Why these rows survive it |
|---|---|---|
| **cc-0079 Slice 2** (data) | the *mix defaults* in `t.platform_format_mix_default` | these slot rows were written from the OLD mix and are never re-read from it |
| **S7 durable fix** (code) | intersects `platform_support` at *grid build time* inside `m.build_weekly_demand_grid` | these rows are already materialised — downstream of grid build |

They are **downstream of both**. This packet is the only thing that repairs them.

**Scope: exactly three rows, one column.** No schema change, no function change, no other row, no other client, no past row.

---

## 1 · The three rows — PINNED LIVE (step 1)

Derived mechanically, not from any description. The query joins every future slot's `format_preference` against `t."5.3_content_format".platform_support` and returns those the platform cannot publish:

```sql
SELECT s.slot_id, c.client_slug, s.platform, s.scheduled_publish_at, s.format_preference,
       (f.platform_support->>s.platform) AS support_raw, s.status, s.filled_at, s.filled_draft_id, s.format_chosen
  FROM m.slot s
  JOIN c.client c ON c.client_id = s.client_id
  LEFT JOIN LATERAL unnest(s.format_preference) AS pf(k) ON true
  LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
 WHERE s.scheduled_publish_at >= now() AND pf.k IS NOT NULL
   AND COALESCE((f.platform_support->>s.platform)::boolean,false) = false
 ORDER BY s.scheduled_publish_at;
```

**Returned exactly 3 rows — no more, no fewer:**

| # | `slot_id` | client | platform | `scheduled_publish_at` (UTC) | `format_preference` | `platform_support` | status | `filled_at` | `filled_draft_id` | `format_chosen` |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `4d81ae7c-d330-4b16-80f4-2893ec532fd8` | property-pulse | linkedin | `2026-07-27 02:00:00+00` | `{carousel}` | `false` | `future` | NULL | NULL | NULL |
| 2 | `cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6` | property-pulse | linkedin | `2026-07-28 02:00:00+00` | `{carousel}` | `false` | `future` | NULL | NULL | NULL |
| 3 | `a8c70f51-8319-402b-a645-f7cbd8014c79` | property-pulse | instagram | `2026-07-30 00:00:00+00` | `{video_short_kinetic}` | `false` | `future` | NULL | NULL | NULL |

Supporting live facts: PP `client_id = 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`, `timezone = Australia/Sydney`, `m.format_mix_enrolled = true`, **0** current rows in `c.client_format_mix_override`.

---

## 2 · Why normal materialisation will NEVER correct them (step 2)

**Verified by reading the live function body**, not inherited from the seed. `m.materialise_slots` ends every iteration with:

```sql
INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, fill_window_opens_at,
                    fill_lead_time_minutes, status, source_kind, schedule_id)
VALUES (v_rule.client_id, v_rule.platform, v_slot_time, v_format_pref, v_slot_time - interval '1440 minutes',
        1440, 'future', 'scheduled', v_rule.schedule_id)
ON CONFLICT DO NOTHING;
```

There is **no `DO UPDATE`, no `EXCLUDED`, no `SET`** anywhere in the statement — the whole function contains exactly one write to `m.slot`, and it is this INSERT.

**The conflict target** (bare `ON CONFLICT DO NOTHING` matches any unique violation) is:

```sql
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot USING btree (client_id, platform, scheduled_publish_at)
  WHERE (status <> ALL (ARRAY['skipped'::text, 'failed'::text, 'published'::text]));
```

All three rows are `status='future'`, so they are **inside** the partial index. Every nightly run recomputes the correct `v_format_pref`, collides on this index, discards it, and increments `skipped_already_exist`. **The corrected value is computed and thrown away, nightly.** This is a pure write-once row; the recompute never lands.

**Zero user triggers exist on `m.slot`** (all triggers on the table are internal RI constraint triggers), so no trigger corrects it either.

---

## 3 · The governed assignment under the POST-Slice-2 policy (step 3)

> **⚠ THIS IS A PROJECTION, NOT A READING.** cc-0079 Slice 2 is **not applied** as of this authoring. The post-Slice-2 shares do not exist in the database yet. Everything in this section is computed by feeding the **frozen Slice-2 payload** through the **real, live allocator**. It depends on Slice 2 applying **exactly** its frozen payload — and §5's `A-PROJ` assertion **re-derives it from live state at apply time and aborts if it no longer holds**, so the projection is never trusted as a constant.

### 3.1 — The method was validated against ground truth first

Before projecting, the method was checked by feeding **today's live grid** through the real `m.allocate_week_formats(shares, 5)` and comparing to what is actually stored in the three rows:

| platform | live grid shares (today) | allocator output (today) | ordinal → predicted | **actually stored** | match |
|---|---|---|---|---|---|
| linkedin | carousel 40 · text 20 · image_quote 15 · video_short_kinetic 15 · video_short_stat_voice 10 | `carousel · carousel · text · image_quote · video_short_kinetic` | **1** → `carousel`<br>**2** → `carousel` | `{carousel}`<br>`{carousel}` | ✓ ✓ |
| instagram | carousel 30 · image_quote 20 · video_short_kinetic 20 · video_short_stat_voice 15 · animated_data 10 · animated_text_reveal 5 | `carousel · carousel · image_quote · video_short_kinetic · video_short_stat_voice` | **4** → `video_short_kinetic` | `{video_short_kinetic}` | ✓ |

**All three stored values are reproduced exactly.** The method is sound. *(These also match the cc-0079 Slice 2 v4 packet §1 BEFORE table character-for-character — an independent third reproduction.)*

### 3.2 — Ordinals and cadence, recomputed live

Reproducing `m.materialise_slots`' own ordinal expression (`row_number()` over the week's enabled schedule occurrences in the client's timezone):

| `slot_id` | platform | local date | ISO week Monday | **ordinal** | N (enabled slots/week/platform) |
|---|---|---|---|---|---|
| `4d81ae7c…` | linkedin | 2026-07-27 | **2026-07-27** | **1** | 5 |
| `cdb9cc97…` | linkedin | 2026-07-28 | **2026-07-27** | **2** | 5 |
| `a8c70f51…` | instagram | 2026-07-30 | **2026-07-27** | **4** | 5 |

All three fall in the **same** ISO week (Monday 2026-07-27). N=5 confirmed live per platform from `c.client_publish_schedule`.

### 3.3 — The projection

Post-Slice-2 shares (LI `text 57.14 · image_quote 42.86`; IG `carousel 60.00 · image_quote 40.00`) fed through the live `m.allocate_week_formats(shares, 5)`:

| platform | projected week assignment | ordinal → format |
|---|---|---|
| linkedin | `text · image_quote · text · text · image_quote` | **1** → `text` · **2** → `image_quote` |
| instagram | `carousel · image_quote · carousel · carousel · image_quote` | **4** → `carousel` |

*(These match the Slice 2 v4 packet §1 AFTER table exactly — reproduced here independently, not carried.)*

### 3.4 — The repair, therefore

| # | `slot_id` | platform | scheduled (UTC) | ord | **from** | **to** |
|---|---|---|---|---|---|---|
| 1 | `4d81ae7c-d330-4b16-80f4-2893ec532fd8` | linkedin | `2026-07-27 02:00:00+00` | 1 | `carousel` | **`text`** |
| 2 | `cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6` | linkedin | `2026-07-28 02:00:00+00` | 2 | `carousel` | **`image_quote`** |
| 3 | `a8c70f51-8319-402b-a645-f7cbd8014c79` | instagram | `2026-07-30 00:00:00+00` | 4 | `video_short_kinetic` | **`carousel`** |

**What this depends on** (each re-asserted in code at apply time): cc-0079 Slice 2 applied with its frozen payload (`P-PRECOND`) · PP still has 0 current mix overrides and the grid stays a pass-through (`A-PROJ`) · cadence still N=5 and the ordinals unchanged (`A-PROJ`) · `platform_support` unchanged for the target formats (`A-TARGET`).

### 3.5 — Target formats are safe to repair INTO (checked, not assumed)

`m.fill_pending_slots` **fails** a slot with `format_policy_missing:<fmt>` if either `t.format_synthesis_policy` or `t.format_quality_policy` lacks a current row for the chosen format. Repairing into such a format would trade one defect for another. Verified live:

| format | `platform_support` (target platform) | `is_active` | current synthesis policy | current quality policy |
|---|---|---|---|---|
| `text` | linkedin **true** | true | **1** | **1** |
| `image_quote` | linkedin **true** | true | **1** | **1** |
| `carousel` | instagram **true** | true | **1** | **1** |

All three are safe. Enforced at apply time by `A-TARGET`.

---

## 4 · Downstream dependency determination (step 4) — the safety question

**This is the step that decides whether the repair is safe or whether it orphans work.** Every inbound FK to `m.slot` was enumerated from `pg_constraint` and each one queried against the three target ids:

| Referencing table | FK | `ON DELETE` | **rows attached to the 3 targets** |
|---|---|---|---|
| `m.post_draft` | `post_draft_slot_id_fkey` | SET NULL | **0** |
| `m.ai_job` | `fk_ai_job_slot` | CASCADE | **0** |
| `m.slot_fill_attempt` | `slot_fill_attempt_slot_id_fkey` | CASCADE | **0** |
| `m.slot_alerts` | `slot_alerts_slot_id_fkey` | CASCADE | **0** |
| `r.ice_publication_evidence` | `ice_publication_evidence_slot_id_fkey` | SET NULL | **0** |

Outbound/own columns on the three rows: `filled_draft_id` **NULL** · `intent_id` **NULL** · `format_chosen` **NULL** · `filled_at` **NULL** · `status` **`future`** (all three).

> **Verdict: ZERO downstream drafts, renders, approvals, publications, AI jobs, fill attempts or alerts.** All three slots are empty, unfilled, uncommitted future rows. **The repair orphans nothing** — it changes an intent that has not yet been acted on.
>
> This is the *cheap* case. A slot with an approved draft or a completed render would be a different problem requiring a different packet — so `A-DEP` re-asserts all of the above **at apply time** and aborts if any of it has changed.

### 4.1 — The repair is material, not cosmetic

Worth stating plainly, because `m.slot.format_chosen` is famously read by nothing. **`format_preference` is different.** `m.fill_pending_slots` (live body read) contains:

```sql
v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');
```

and `v_chosen_format` then drives: the `format_synthesis_policy`/`format_quality_policy` lookup · the evergreen-library match (`v_chosen_format = ANY(el.format_keys)`) · `m.slot_fill_attempt.chosen_format` · `m.ai_job.input_payload->>'format'` (what the AI worker is told to synthesise) · and finally `m.slot.format_chosen`. **Repairing this column changes what actually gets made.**

### 4.2 — ⚠ There is NO `platform_support` gate anywhere in the fill path

Twelve historical PP LinkedIn `carousel` slots are `status='skipped'`. It would be easy to read that as "the system already protects itself." **It does not.** Their skip reason is:

```
bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen
```

— a **thin content pool**, entirely unrelated to LinkedIn's inability to publish a carousel. `m.fill_pending_slots` never consults `platform_support`. The historical skips were coincidental, not protective. If the pool is healthy when these slots fill, a carousel **will** be synthesised for LinkedIn. This is corroborating evidence for S7's durable fix; it is **not** repaired here.

---

## 5 · The repair script — ONE transaction, ONE call (step 5 + step 6)

> **Submit this entire block as a SINGLE execution.** Sanctioned channels in §7.1. Fragmented execution is a STOP condition **and** is machine-blocked by `G-ATOMIC`.
> **Every assertion below is executable code that `RAISE EXCEPTION`s. Not one is a comment.** This inherits the cc-0079 Slice 2 halt findings (`docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md`) directly: M-1 (comments are not assertions), M-2 (separate `execute_sql` calls do not share a transaction), S-3 (an assertion that detects duplicates does not detect absence).
> The script produces **exactly one result set** — the final summary `SELECT` before `COMMIT`. **Record it verbatim.**

```sql
BEGIN;

-- ============================================================================
-- STEP 0 -- transaction anchor + in-transaction baselines (NO mutation yet)
-- ============================================================================

-- G-ATOMIC anchor. Every mutating step re-asserts the xid still equals this.
-- If the script is fragmented across pooled calls, each fragment autocommits
-- and mints a new xid -> the guard aborts BEFORE mutating.
CREATE TEMP TABLE _s8_txn ON COMMIT DROP AS
SELECT pg_current_xact_id() AS xid, pg_backend_pid() AS pid, clock_timestamp() AS t0;

-- Full pre-repair snapshot of the ENTIRE slot table (1401 rows -- trivially cheap).
-- Self-contained: no out-of-band fingerprint constant is trusted.
CREATE TEMP TABLE _s8_before ON COMMIT DROP AS
SELECT slot_id, client_id, platform, scheduled_publish_at, format_preference,
       format_chosen, status, filled_at, filled_draft_id, intent_id
  FROM m.slot;

-- The repair payload, as DATA -- FROZEN. Single source of truth for both the
-- UPDATE and the assertions, so the two cannot silently diverge.
CREATE TEMP TABLE _s8_repair(
  slot_id  uuid,
  platform text,
  sched    timestamptz,
  ordinal  int,
  from_fmt text,
  to_fmt   text) ON COMMIT DROP;
INSERT INTO _s8_repair VALUES
  ('4d81ae7c-d330-4b16-80f4-2893ec532fd8','linkedin' ,'2026-07-27 02:00:00+00',1,'carousel'           ,'text'),
  ('cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6','linkedin' ,'2026-07-28 02:00:00+00',2,'carousel'           ,'image_quote'),
  ('a8c70f51-8319-402b-a645-f7cbd8014c79','instagram','2026-07-30 00:00:00+00',4,'video_short_kinetic','carousel');

-- ============================================================================
-- P-PRECOND -- cc-0079 Slice 2 MUST be applied first. PK's sequencing is
-- machine-enforced here, not left to the operator's memory.
-- ============================================================================
DO $$
DECLARE n_bad int; n_plat int; r record;
BEGIN
  SELECT count(*) INTO n_bad
    FROM t.platform_format_mix_default d
    JOIN t."5.3_content_format" f ON f.ice_format_key = d.ice_format_key
   WHERE d.is_current
     AND COALESCE((f.platform_support->>d.platform)::boolean,false) = false;
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'P-PRECOND FAILED: % current mix row(s) are still unpublishable -- cc-0079 Slice 2 is NOT applied. PK ordered Slice 2 applied AND proven before this repair. ABORT.', n_bad;
  END IF;

  SELECT count(DISTINCT platform) INTO n_plat
    FROM t.platform_format_mix_default WHERE is_current;
  IF n_plat <> 4 THEN
    RAISE EXCEPTION 'P-PRECOND FAILED: % platform(s) hold current mix rows, expected 4. ABORT.', n_plat;
  END IF;

  FOR r IN SELECT platform, count(*) AS c, sum(default_share_pct) AS s
             FROM t.platform_format_mix_default WHERE is_current GROUP BY platform LOOP
    IF r.s <> 100.00 THEN
      RAISE EXCEPTION 'P-PRECOND FAILED: platform % current shares sum to %, expected 100.00. ABORT.', r.platform, r.s; END IF;
    IF r.platform='facebook'  AND r.c<>3 THEN
      RAISE EXCEPTION 'P-PRECOND FAILED: facebook holds % current rows, expected 3 post-Slice-2. ABORT.', r.c; END IF;
    IF r.platform='instagram' AND r.c<>2 THEN
      RAISE EXCEPTION 'P-PRECOND FAILED: instagram holds % current rows, expected 2 post-Slice-2. ABORT.', r.c; END IF;
    IF r.platform='linkedin'  AND r.c<>2 THEN
      RAISE EXCEPTION 'P-PRECOND FAILED: linkedin holds % current rows, expected 2 post-Slice-2. ABORT.', r.c; END IF;
    IF r.platform='youtube'   AND r.c<>5 THEN
      RAISE EXCEPTION 'P-PRECOND FAILED: youtube holds % current rows, expected 5. ABORT.', r.c; END IF;
  END LOOP;
END $$;

-- ============================================================================
-- A-IDENT -- the pinned 3 must match live EXACTLY, and there must be NO
-- fourth invalid future slot (PRESENCE and ABSENCE, per the S-3 lesson).
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(DISTINCT slot_id) INTO n FROM _s8_repair;
  IF n <> 3 THEN
    RAISE EXCEPTION 'A-IDENT FAILED: repair payload holds % distinct slot id(s), expected 3. ABORT.', n; END IF;

  -- PRESENCE: every target exists live and matches platform + schedule + current format
  SELECT count(*) INTO n
    FROM _s8_repair rp
    JOIN m.slot s ON s.slot_id = rp.slot_id
   WHERE s.platform = rp.platform
     AND s.scheduled_publish_at = rp.sched
     AND s.format_preference = ARRAY[rp.from_fmt];
  IF n <> 3 THEN
    RAISE EXCEPTION 'A-IDENT FAILED: only % of 3 target slot(s) match live identity (platform/schedule/current format). The rows drifted since authoring. ABORT and re-derive.', n; END IF;

  -- ABSENCE: no OTHER future slot may carry an unpublishable format
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
-- A-DEP -- the dependency fence. A slot with downstream work is a DIFFERENT
-- problem and this packet does not authorise repairing it.
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.post_draft d        JOIN _s8_repair rp ON rp.slot_id = d.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % post_draft row(s) attached to a target slot. A slot with a draft is a different problem. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM m.ai_job a            JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % ai_job row(s) attached. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM m.slot_fill_attempt a JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % slot_fill_attempt row(s) attached -- the slot has already been worked. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM m.slot_alerts a       JOIN _s8_repair rp ON rp.slot_id = a.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % slot_alerts row(s) attached. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM r.ice_publication_evidence e JOIN _s8_repair rp ON rp.slot_id = e.slot_id;
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % publication evidence row(s) attached -- the slot has PUBLISHED. ABORT and surface to PK.', n; END IF;

  SELECT count(*) INTO n FROM m.slot s JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.filled_at        IS NOT NULL
      OR s.filled_draft_id  IS NOT NULL
      OR s.format_chosen    IS NOT NULL
      OR s.intent_id        IS NOT NULL
      OR s.status NOT IN ('future','pending_fill');
  IF n<>0 THEN RAISE EXCEPTION 'A-DEP FAILED: % target slot(s) are already filled or committed. ABORT and surface to PK.', n; END IF;
END $$;

-- ============================================================================
-- A-TARGET -- never repair INTO a format that is unpublishable, inactive, or
-- missing a policy (which would fail the slot with format_policy_missing).
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
  IF n <> 3 THEN
    RAISE EXCEPTION 'A-TARGET FAILED: only % of 3 proposed format(s) are publishable AND active AND hold BOTH a current synthesis and quality policy. Repairing into such a format would make m.fill_pending_slots fail the slot with format_policy_missing. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A-PROJ -- RE-DERIVE the governed assignment from LIVE post-Slice-2 state
-- through the real allocator. The frozen §3 projection is never trusted as a
-- constant: if live no longer yields it, this aborts.
-- ============================================================================
DO $$
DECLARE
  rp        record;
  v_client  uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  v_tz      text;
  v_wk      date;
  v_shares  jsonb;
  v_assign  text[];
  v_n       integer;
  v_ord     integer;
  v_expect  text;
BEGIN
  SELECT timezone INTO v_tz FROM c.client WHERE client_id = v_client;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'A-PROJ FAILED: client timezone is NULL -- the ordinal mapping cannot be reproduced. ABORT.'; END IF;

  FOR rp IN SELECT * FROM _s8_repair ORDER BY sched LOOP
    v_wk := date_trunc('week', (rp.sched AT TIME ZONE v_tz)::date)::date;

    -- cadence must still be 5, else the ordinal mapping is invalid
    SELECT COUNT(*)::integer INTO v_n
      FROM c.client_publish_schedule s
      JOIN generate_series(v_wk, v_wk + 6, interval '1 day') d
        ON EXTRACT(isodow FROM d)::integer = s.day_of_week
     WHERE s.client_id = v_client AND s.platform = rp.platform AND s.enabled = TRUE;
    IF v_n <> 5 THEN
      RAISE EXCEPTION 'A-PROJ FAILED: platform % has % enabled slot(s) in week %, expected 5 -- cadence changed, the ordinal mapping is void. ABORT.', rp.platform, v_n, v_wk; END IF;

    -- the slot's live ordinal must still be what the packet froze
    SELECT occ.ordinal INTO v_ord
      FROM (SELECT (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz AS occ_ts,
                   row_number() OVER (ORDER BY (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz ASC) AS ordinal
              FROM c.client_publish_schedule s
              JOIN generate_series(v_wk, v_wk + 6, interval '1 day') d
                ON EXTRACT(isodow FROM d)::integer = s.day_of_week
             WHERE s.client_id = v_client AND s.platform = rp.platform AND s.enabled = TRUE) occ
     WHERE occ.occ_ts = rp.sched
     ORDER BY occ.ordinal ASC LIMIT 1;
    IF v_ord IS NULL OR v_ord <> rp.ordinal THEN
      RAISE EXCEPTION 'A-PROJ FAILED: slot % live ordinal is %, packet froze %. ABORT and re-derive.', rp.slot_id, COALESCE(v_ord,-1), rp.ordinal; END IF;

    -- the demand grid, shaped exactly as m.materialise_slots shapes it
    SELECT jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                     ORDER BY g.share_pct DESC, g.ice_format_key ASC)
      INTO v_shares
      FROM m.build_weekly_demand_grid(v_client, v_wk) g
     WHERE g.platform = rp.platform;
    IF v_shares IS NULL THEN
      RAISE EXCEPTION 'A-PROJ FAILED: the demand grid returned NO rows for platform % -- that platform has vanished from the grid. ABORT.', rp.platform; END IF;

    v_assign := m.allocate_week_formats(v_shares, v_n);
    IF v_assign IS NULL OR array_length(v_assign,1) <> v_n THEN
      RAISE EXCEPTION 'A-PROJ FAILED: allocator returned % element(s) for platform %, expected %. ABORT.', COALESCE(array_length(v_assign,1),0), rp.platform, v_n; END IF;

    v_expect := v_assign[rp.ordinal];
    IF v_expect IS DISTINCT FROM rp.to_fmt THEN
      RAISE EXCEPTION 'A-PROJ FAILED: slot % (% ordinal %) -- the LIVE allocator now yields %, but this packet froze %. The §3 projection no longer holds. ABORT and re-derive.', rp.slot_id, rp.platform, rp.ordinal, COALESCE(v_expect,'<null>'), rp.to_fmt; END IF;
  END LOOP;
END $$;

-- ============================================================================
-- U1 -- the repair. Three rows, one column. CAS-guarded on the prior value.
-- ============================================================================
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _s8_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at U1: transaction identity changed (anchor %, now %). This script was NOT executed as one transaction. ABORT.', v_anchor, pg_current_xact_id();
  END IF;

  UPDATE m.slot s
     SET format_preference = ARRAY[rp.to_fmt],
         updated_at        = now()
    FROM _s8_repair rp
   WHERE s.slot_id = rp.slot_id
     AND s.format_preference = ARRAY[rp.from_fmt];   -- CAS: only if still unchanged

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN
    RAISE EXCEPTION 'U1 FAILED: updated % row(s), expected exactly 3. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A-POST -- the repair achieved its purpose (PRESENCE and ABSENCE)
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM m.slot s JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rp.to_fmt];
  IF n <> 3 THEN
    RAISE EXCEPTION 'A-POST FAILED: only % of 3 target(s) hold the repaired format. ABORT.', n; END IF;

  SELECT count(*) INTO n
    FROM m.slot s
    CROSS JOIN LATERAL unnest(s.format_preference) AS pf(k)
    LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
   WHERE s.scheduled_publish_at >= now()
     AND COALESCE((f.platform_support->>s.platform)::boolean,false) = false;
  IF n <> 0 THEN
    RAISE EXCEPTION 'A-POST FAILED: % future slot(s) STILL carry an unpublishable format. ABORT.', n; END IF;
END $$;

-- ============================================================================
-- A-BLAST -- blast radius. Exactly 3 rows, exactly 1 column, nothing else.
-- ============================================================================
DO $$
DECLARE n_now int; n_before int; n_diff int;
BEGIN
  SELECT count(*) INTO n_now FROM m.slot;
  SELECT count(*) INTO n_before FROM _s8_before;
  IF n_now <> n_before THEN
    RAISE EXCEPTION 'A-BLAST FAILED: m.slot holds % rows vs % at snapshot -- rows were created or destroyed. ABORT.', n_now, n_before; END IF;

  -- exactly three rows changed format_preference...
  SELECT count(*) INTO n_diff
    FROM m.slot s JOIN _s8_before b USING (slot_id)
   WHERE s.format_preference IS DISTINCT FROM b.format_preference;
  IF n_diff <> 3 THEN
    RAISE EXCEPTION 'A-BLAST FAILED: % row(s) changed format_preference, expected exactly 3. ABORT.', n_diff; END IF;

  -- ...and they are THE three targets
  SELECT count(*) INTO n_diff
    FROM m.slot s JOIN _s8_before b USING (slot_id)
   WHERE s.format_preference IS DISTINCT FROM b.format_preference
     AND s.slot_id NOT IN (SELECT slot_id FROM _s8_repair);
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A-BLAST FAILED: % changed row(s) are NOT in the pinned repair set. ABORT.', n_diff; END IF;

  -- no non-target row changed format_preference (restated as absence)
  -- and no target row had an immutable/commitment column altered
  SELECT count(*) INTO n_diff
    FROM m.slot s JOIN _s8_before b USING (slot_id) JOIN _s8_repair rp ON rp.slot_id = s.slot_id
   WHERE s.client_id            IS DISTINCT FROM b.client_id
      OR s.platform             IS DISTINCT FROM b.platform
      OR s.scheduled_publish_at IS DISTINCT FROM b.scheduled_publish_at
      OR s.format_chosen        IS NOT NULL
      OR s.filled_at            IS NOT NULL
      OR s.filled_draft_id      IS NOT NULL
      OR s.intent_id            IS NOT NULL
      OR s.status NOT IN ('future','pending_fill');
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A-BLAST FAILED: % target row(s) had a column this repair must never touch, or became filled mid-transaction. ABORT.', n_diff; END IF;
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

| # | Assertion | Expected | Enforcement | Why it exists |
|---|---|---|---|---|
| **G-ATOMIC** | current xid == the xid anchored at step 0 | equal | `RAISE` in U1; every step structurally depends on step-0 temp tables | M-2: fragmented execution autocommits and mints a new xid |
| **P-PRECOND** | every current mix row publishable · 4 platforms · sums 100.00 · FB 3 / IG 2 / LI 2 / YT 5 | exact | `RAISE` × 3 + loop | **Machine-enforces PK's ordering** — the repair cannot run before Slice 2 |
| **A-IDENT** | 3 distinct pinned ids · all 3 match live platform+schedule+current format · **zero** invalid future slots outside the set | 3 / 3 / 0 | `RAISE` × 3 | PRESENCE *and* ABSENCE (the S-3 lesson) |
| **A-DEP** | 0 rows in each of the 5 inbound-FK tables · targets unfilled/uncommitted | 0 everywhere | `RAISE` × 6 | Step 4: a slot with downstream work is a different problem |
| **A-TARGET** | proposed formats publishable + active + BOTH policies current | 3 of 3 | `RAISE` | Never repair into `format_policy_missing` |
| **A-PROJ** | live cadence N=5 · live ordinal == frozen · grid non-empty · allocator output at ordinal == frozen `to_fmt` | exact, per slot | `RAISE` × 5 in loop | **The §3 projection is re-derived, never trusted as a constant** |
| **U1** | rows updated | exactly **3** | `GET DIAGNOSTICS` + `RAISE`, CAS on prior value | The repair itself |
| **A-POST** | 3 targets hold repaired value · **zero** invalid future slots remain | 3 / 0 | `RAISE` × 2 | PRESENCE *and* ABSENCE post-state |
| **A-BLAST** | row count unchanged · exactly 3 format_preference diffs · all 3 in the pinned set · no other column touched on targets | exact | `RAISE` × 4 | Blast-radius fence |

**Failure semantics:** any `RAISE EXCEPTION` aborts the entire call; the open transaction rolls back and **nothing commits**. There is no path in which a subset commits, provided the script is submitted through a sanctioned channel — and `G-ATOMIC` aborts it if it is not.

**Known benign-abort case:** `A-BLAST`'s target-row check aborts if a target is promoted `future → pending_fill` **and then filled** by cron mid-transaction. A promote alone is tolerated (`status IN ('future','pending_fill')`). A fill mid-transaction is exactly what should abort. The transaction is sub-second against a 5-minute cron, so this is unlikely; if it trips, **do not retry blindly** — re-derive, because the slot now has downstream work.

---

## 7 · Rollback (step 7)

### 7.1 — Exact rollback, by identity, CAS-guarded

Run as **ONE call**, same channel rules as §5. This is a complete restoration: the prior values are literals in the script, so it does **not** depend on §5's result set having been recorded.

```sql
BEGIN;

CREATE TEMP TABLE _s8_rb_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

-- The exact pre-repair state of the three rows -- FROZEN, read live 2026-07-24.
CREATE TEMP TABLE _s8_rb(
  slot_id uuid, restore_to text, repaired_to text) ON COMMIT DROP;
INSERT INTO _s8_rb VALUES
  ('4d81ae7c-d330-4b16-80f4-2893ec532fd8','carousel'           ,'text'),
  ('cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6','carousel'           ,'image_quote'),
  ('a8c70f51-8319-402b-a645-f7cbd8014c79','video_short_kinetic','carousel');

-- R0 -- guard: the rows must currently hold the REPAIRED value, else this
-- rollback is being run against a state it does not describe.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rb.repaired_to];
  IF n <> 3 THEN
    RAISE EXCEPTION 'R0 FAILED: only % of 3 row(s) currently hold the repaired value. This rollback does not describe the live state. ABORT and surface to PK.', n;
  END IF;
END $$;

-- R1 -- restore
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _s8_rb_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at R1: transaction identity changed. ABORT.'; END IF;

  UPDATE m.slot s
     SET format_preference = ARRAY[rb.restore_to],
         updated_at        = now()
    FROM _s8_rb rb
   WHERE s.slot_id = rb.slot_id
     AND s.format_preference = ARRAY[rb.repaired_to];

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'R1 FAILED: restored % row(s), expected 3. ABORT.', n; END IF;
END $$;

-- R2 -- assert the pre-repair state is restored
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id
   WHERE s.format_preference = ARRAY[rb.restore_to];
  IF n <> 3 THEN RAISE EXCEPTION 'R2 FAILED: only % of 3 row(s) hold the restored value. ABORT.', n; END IF;
END $$;

SELECT 'ROLLBACK OK -- pre-repair state restored' AS status,
       (SELECT jsonb_agg(jsonb_build_object('slot_id', s.slot_id, 'format_preference', s.format_preference)
                         ORDER BY s.scheduled_publish_at)
          FROM m.slot s JOIN _s8_rb rb ON rb.slot_id = s.slot_id) AS restored_rows;

COMMIT;
```

### 7.2 — Rollback residual (named, not hidden)

`updated_at` is the **only** column that does not return to its pre-repair value — the three rows carried `2026-07-20 15:00:03.382276+00`, `2026-07-21 15:00:00.589371+00` and `2026-07-23 15:00:00.862918+00` respectively, and will carry the repair's / rollback's `now()`. **`format_preference` restores exactly. Nothing is destroyed; no row is deleted or created.**

**Rolling back restores a known-broken state** — it returns the slots to formats their platform cannot publish. It is the correct action if the repair itself misfires, but it is not a resting place: a rolled-back state still needs a re-derived repair before the fill window opens (§8).

---

## 8 · ⛔ TIMING — a hard deadline PK must see

The repair is sequenced **after** Slice 2, and PK holds exactly one production window open at a time. **Cron does not wait for that ordering.**

| cron | jobid | schedule | effect |
|---|---|---|---|
| `materialise-slots-nightly` | 72 | `0 15 * * *` | inserts +7 days, `ON CONFLICT DO NOTHING` (cannot repair — §2) |
| `promote-slots-to-pending-every-5m` | 73 | `*/5 * * * *` | `UPDATE m.slot SET status='pending_fill' WHERE status='future' AND fill_window_opens_at <= now() + interval '10 minutes'` |
| `fill-pending-slots-every-10m` | 75 | `*/10 * * * *` | `m.fill_pending_slots(5)` — **reads `format_preference[1]`** |

Note the promoter fires **10 minutes early**. Deadlines, from live `fill_window_opens_at` (in-DB `now()` = `2026-07-24 13:36:15+00`):

| slot | platform | `fill_window_opens_at` | **effective deadline** (−10 min) | time remaining at authoring |
|---|---|---|---|---|
| `4d81ae7c…` | linkedin | `2026-07-26 02:00:00+00` | **`2026-07-26 01:50 UTC`** | **≈ 1 d 12 h** |
| `cdb9cc97…` | linkedin | `2026-07-27 02:00:00+00` | `2026-07-27 01:50 UTC` | ≈ 2 d 12 h |
| `a8c70f51…` | instagram | `2026-07-29 00:00:00+00` | `2026-07-29 00:50 UTC` *(−10 min: `2026-07-28 23:50`)* | ≈ 4 d 10 h |

> **If Slice 2's apply gate and this repair's window both slip past `2026-07-26 01:50 UTC`, slot `4d81ae7c…` self-fills with `carousel` on LinkedIn** — a format LinkedIn cannot publish, with **no `platform_support` gate anywhere in the fill path to stop it** (§4.2).
>
> **S8 does not resolve this and has taken no action on it.** It is surfaced because it is a scope/sequencing fact PK owns. Three levers exist, all PK's: (a) apply Slice 2 and this repair inside the available window; (b) authorise this repair **before** Slice 2 — which would require re-deriving §3 against the *pre*-Slice-2 policy and removing `P-PRECOND`, i.e. a **v2 packet**, not a waiver; (c) accept one mis-formatted LinkedIn fill and repair after. **This packet as written implements (a) only.**

---

## 9 · Execution control

### 9.1 — Sanctioned channels

§5 **must** be submitted so that all statements share one backend session and one transaction. Exactly three channels qualify:

| # | Channel | Condition |
|---|---|---|
| **C-1** | A **single** `mcp__supabase__execute_sql` call carrying the entire §5 script | Proven to compose by S1 probe P2 (halt result §10) |
| **C-2** | `psql -v ON_ERROR_STOP=1 -f <script>` | one session |
| **C-3** | Supabase SQL Editor, whole script pasted and run **once** | one run action only |

**FORBIDDEN — a STOP condition:** statement-by-statement execution · splitting §5 across two or more calls · pressing run more than once · any channel not listed. Also machine-enforced by `G-ATOMIC`.

### 9.2 — Sequence

1. Re-hash this packet **from a ref** (`git show <ref>:docs/briefs/materialised-invalid-slot-repair-packet-v1.md`). Mismatch → **STOP**.
2. Confirm target project `mbkmaxqhsohbtwsqolns`. Different project → **STOP**.
3. Confirm **cc-0079 Slice 2 is applied AND proven** (PK's ordering). Not proven → **STOP**. *(Also machine-enforced by `P-PRECOND`, but the human gate comes first.)*
4. Confirm the external review's `reviewed_input_hash` equals this packet's sha256. Mismatch or missing → **STOP**.
5. Confirm `db-rls-auditor` returned normalized `clean` **against this hash**. Any other verdict → **STOP**.
6. Capture the out-of-band baseline (§9.4).
7. **PK apply gate. No production mutation occurs before this point.**
8. Execute §5 through **one** channel from §9.1. Record the final result set verbatim.
9. **Post-repair proof** (§9.3) — separate read-only call, after COMMIT.

### 9.3 — Post-repair proof (read-only, run after COMMIT)

```sql
SELECT s.slot_id, s.platform, s.scheduled_publish_at, s.format_preference, s.status,
       COALESCE((f.platform_support->>s.platform)::boolean,false) AS is_valid
  FROM m.slot s
  LEFT JOIN LATERAL unnest(s.format_preference) AS pf(k) ON true
  LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = pf.k
 WHERE s.slot_id IN ('4d81ae7c-d330-4b16-80f4-2893ec532fd8',
                     'cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6',
                     'a8c70f51-8319-402b-a645-f7cbd8014c79')
 ORDER BY s.scheduled_publish_at;
```

**Expected:** `text` / `image_quote` / `carousel`, `is_valid = true` on all three. Anything else → surface to PK.

### 9.4 — Out-of-band baseline (operator's record; `A-BLAST` does not depend on it)

```sql
SELECT slot_id, client_id, platform, scheduled_publish_at, format_preference,
       format_chosen, status, filled_at, filled_draft_id, intent_id, updated_at
  FROM m.slot WHERE scheduled_publish_at >= now() ORDER BY scheduled_publish_at;
```

Continuity value only, **not gated on**: full-table `format_preference` fingerprint at authoring was `61d824bbed3370c1a51acfc51037f629` over 1401 rows (`md5(string_agg(slot_id||'|'||array_to_string(format_preference,',') , E'\n' ORDER BY slot_id))`). The expression is recorded so it is reproducible — but `A-BLAST` uses the **in-transaction snapshot**, which cannot be forgotten or mis-scoped.

### 9.5 — STOP conditions

Packet hash mismatch · review hash mismatch, missing or non-clean · `db-rls-auditor` not `clean` on this hash · wrong project · **Slice 2 not applied and proven** · any channel outside §9.1 · **any `RAISE EXCEPTION` from §5** (the transaction has already rolled back; do not retry without re-deriving) · post-repair proof not all-valid · unexpected origin movement on the packet's ref · **any ambiguity in this packet**.

A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate (Convention 2).

### 9.6 — Privilege precondition

§5 reads `t.*`, `c.*`, `m.*` and writes `m.slot`. Schema `t` grants USAGE to none of `anon`, `authenticated`, `service_role` — the apply must run under the privileged role the sanctioned channels already use. A `42501 permission denied` at step 0 means the channel is running as the wrong role: **STOP**, and do not widen any grant to make it pass.

---

## 10 · Observed but deliberately NOT repaired (scope fence)

Recorded so nothing is silently dropped, and so a later reader does not mistake omission for oversight. **PK's blocker rule binds: none of these displaces the ordered program, and this packet touches none of them.**

| Observation | Why not repaired here |
|---|---|
| **~50 PAST slots carry unpublishable formats** (PP LI `carousel` ×12 `skipped`; PP IG `video_short_kinetic` ×3, IG `video_short_stat_voice` ×3, FB `video_short_kinetic` ×3, LI `video_short_kinetic` ×3 `filled`; PP/NDIS/CFW historical `video_short_avatar` and YouTube `image_quote` rows) | Already published, filled, skipped or failed. Repairing history changes nothing downstream and would be a rewrite, not a repair. **Out of scope, minimum-repair rule.** |
| **No `platform_support` gate anywhere in `m.fill_pending_slots`** (§4.2) | This is precisely S7's durable-fix territory and a **code** change. Named as corroborating evidence; **not** this data lane. |
| **`m.materialise_slots` has no update path** (§2) | The durable fix is S7's, sequenced *after* this repair by PK's explicit order. |
| **Slots whose format becomes stale in future weeks** | Same root cause; the durable fix closes it. This packet repairs only the three rows that exist today. |
| **`m.slot.format_chosen` is written by the filler but read by nothing** | Pre-existing, unrelated to this defect, and touching it is out of scope. |

---

## 11 · Review status

- **A fresh external review pinned to this packet's sha256 is REQUIRED and has NOT been run.** No prior review covers this artifact — it is new.
- **`db-rls-auditor` must be run against this hash.** It has NOT been run.
- **The orchestrator runs both — not S8, and not the apply hand.**
- Only then the **PK apply gate**.
- Any byte change to this packet mints a new sha256 and **invalidates every review pinned to the old one** (CLAUDE.md external-review rules 1 and 4).

**Chain:** S8 freezes → orchestrator runs `db-rls-auditor` + fresh external review against the exact hash → an independent apply hand receives the reviewed packet → works §9.2 and **stops at the PK apply gate** → **no production mutation before that gate.**

---

## 12 · Non-claims

**Nothing applied. No DML executed, no row mutated, no schema touched, no function altered, no migration run, no commit, no push, no deploy.** S8 ran only read-only SELECTs and catalog reads (`pg_proc`, `pg_constraint`, `pg_index`, `pg_trigger`, `cron.job`, `information_schema`) plus two read-only function calls — `m.allocate_week_formats` (**IMMUTABLE**) and `m.build_weekly_demand_grid` (**STABLE**), both verified non-volatile from `pg_proc.provolatile` **before** being called. No production table was written and no residue was left.

The §5 and §7 scripts have **never been executed in any form**. `P-PRECOND`, `A-IDENT`, `A-DEP`, `A-TARGET`, `A-PROJ`, `U1`, `A-POST`, `A-BLAST`, `G-ATOMIC` and the rollback guards are **new code that has never run**. Their primitives (`DO`/`RAISE EXCEPTION`, single-call transaction composition, `ON COMMIT DROP` temp tables, the xid anchor) were proven by S1's probes P1–P3 in the cc-0079 Slice 2 halt lane; **this specific script has not been.** That is what the `db-rls-auditor` pass, the external review and the PK gate are for.

**§3 is a PROJECTION, not a reading.** cc-0079 Slice 2 is not applied; the post-Slice-2 shares do not exist in the database. The projection was produced by feeding the frozen Slice-2 payload through the live allocator, and its method was validated by reproducing all three currently-stored values exactly — but it is re-derived from live state by `A-PROJ` at apply time and is never trusted as a constant.

This packet does **not** approve, ratify or authorise the apply. It does not allocate a `cc-` identifier. It does not claim a register version. It does not decide the §8 timing question — that is PK's. It does not repair past slots, does not change `m.materialise_slots`, does not add a `platform_support` gate to the fill path, and does not touch cc-0079 Slice 2, S7's durable fix, or any other lane. All counts, ids, timestamps and formats are live as of **2026-07-24**; identity, dependency and projection drift are all re-verified **by the script itself** at apply time — §1, §3 and §4 are point-in-time reads, not locks.

---

## FREEZE BLOCK

```
artifact  : docs/briefs/materialised-invalid-slot-repair-packet-v1.md
lane      : already-materialised invalid slot repair (S8) -- NO cc- ID allocated
scope     : 3 rows of m.slot, column format_preference ONLY
payload   : FROZEN
            4d81ae7c-d330-4b16-80f4-2893ec532fd8  linkedin  2026-07-27 02:00Z  carousel            -> text
            cdb9cc97-b2b9-4881-b6b9-d0ad33c818f6  linkedin  2026-07-28 02:00Z  carousel            -> image_quote
            a8c70f51-8319-402b-a645-f7cbd8014c79  instagram 2026-07-30 00:00Z  video_short_kinetic -> carousel
depends on: cc-0079 Slice 2 APPLIED AND PROVEN (machine-enforced by P-PRECOND)
sequencing: PK order -- (1) Slice 2 proven, (2) THIS repair, (3) prove downstream
            consistency, (4) S7 durable m.build_weekly_demand_grid change
deadline  : earliest slot fill window effectively opens 2026-07-26 01:50 UTC (see section 8)
author    : S8 (author only; NOT the apply hand)
base      : CE HEAD == origin/main == 565540dbeff3e9c10bb0c32e23342c53feca3e15 (v6.23), parity 0/0
target    : project mbkmaxqhsohbtwsqolns (content_engine)
sha256    : carried OUT-OF-BAND in the S8 handoff line (a file cannot contain its own hash).
            Verify: python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/materialised-invalid-slot-repair-packet-v1.md','rb').read()).hexdigest())"
            Any byte change invalidates the pinned hash AND every review pinned to it.
bytes     : carried OUT-OF-BAND in the S8 handoff line.
review    : REQUIRED, NOT YET RUN. No prior review covers this artifact.
auditor   : db-rls-auditor REQUIRED against this hash, NOT YET RUN.
status    : NOT APPLIED -- FROZEN
```
