#!/usr/bin/env python3
"""Generate the batch-2 fenced-intake SQL + its matching rollback, from manifest.json.

The SQL is GENERATED (never hand-edited) so the manifest, the apply and the rollback cannot drift.

v3 (2026-08-06) — re-authored across THREE apply-harness-auditor shadow runs, each on the previous
version's output. Runs 1 and 2 each closed findings while introducing new ones; run 3 confirmed
every run-2 fix closed in the executable text and found six more. Changes by run:

RUN 1 (v1 -> v2), CONCERNS/10:
  AHA-05-1  transaction-identity guard placed BEFORE the first INSERT, so a split channel is a
            pre-commit STOP instead of a post-commit detection.
  AHA-02-2  temp relations schema-qualified pg_temp.* so the asserts do not ride on search_path.
  AHA-01-1  the four fence values written EXPLICITLY in every INSERT, not inherited from DEFAULTs.
  AHA-06-1  row-count baseline for m.music_track + m.music_license (delta-aware, idempotency-safe).
  AHA-07-2  rollback keyed on the 13 literal track_keys, not the mutable free-text notes column.
  AHA-07-1  rollback emitted as a REAL transactional script with child-table preconditions.
  AHA-07-3  rollback states the storage disposition (objects LEFT in place — PK ruling).
  AHA-04-1  one execution channel pinned: psql -f with ON_ERROR_STOP=1; apply_migration ruled out.

RUN 2 (v2 -> v3), CONCERNS/7 — two of these were defects the run-1 fixes INTRODUCED:
  AHA-01-2  [HIGH] rollback validity window checked only child tables; approval state lives in
            COLUMNS, so a direct fence flip would pass and the rollback would delete an approved,
            selectable track. Precondition (a) added.
  AHA-02-1  the channel header was transplanted into the rollback claiming a guard it did not
            have. channel_block() is now parameterised by guard site and the guard is EMITTED.
  AHA-06-1  rollback baselined only a scalar orphan count. Four real baselines added.
  AHA-01-1  C-11 credited C-12 with backing it lacks (C-12 catches SPLIT, not NESTING).
  AHA-01-3  apply asserts still scoped on notes; re-scoped onto track_key.
  AHA-02-2  generator unpinned, no regenerate-and-diff step.
  AHA-07-1  C-14's rationale overstated what it proves.

RUN 3 (v3 fixes), CONCERNS/6, 0 high:
  AHA-03-1  every rollback assert was satisfiable by a ZERO-MATCH run. Precondition (0) adds a
            cardinality floor: key table must load N and all N targets must be present.
  AHA-06-1  the one unqualified temp WRITE (INSERT INTO _music_rollback_keys) now pg_temp-qualified.
  AHA-07-1  the apply SKIPS a pre-existing track_key while the rollback deleted all N
            unconditionally. Precondition (c) asserts sha256 provenance per row.
  AHA-01-1  register lead sentence over-claimed RAISE backing for C-2/C-5/C-17 (packet fix).
  AHA-01-2  C-19's "no worse than found" vs the SQL's exact equality (packet wording fix).
  AHA-01-3  generator + emitted headers still self-identified as v2 (this docstring).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
BATCH_NOTE = "music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable"
# Live baseline as read 2026-08-06 via ice_ro.music_governance_status.
EXPECTED_BASELINE = ["calm_piano_drifting_006"]

SELECTABLE_PRED = ("is_active IS TRUE OR approved IS TRUE "
                   "OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE")

# FK children of m.music_track other than music_license
# (20260708224532_create_music_library_v0.sql:147,162,181,199).
CHILD_TABLES = ["m.music_track_tag", "m.music_suitability",
                "m.music_usage_event", "m.music_review_event"]

def channel_block(guard_site):
    """Header block for the pinned execution channel.

    guard_site names WHERE this file's executable split-channel guard sits. It is a parameter,
    not a constant, because v2 transplanted the apply's wording into the rollback and thereby
    claimed a guard the rollback did not have (AHA-02-1, second run) — a prose-only STOP, the
    exact failure class this harness exists to avoid.
    """
    return [
        "-- ⚠ PINNED EXECUTION CHANNEL (PK ruling 2026-08-06) — psql -f with ON_ERROR_STOP=1:",
        "--     psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f <this file>",
        "--   This file carries its OWN BEGIN/COMMIT and its own temp relations, so it needs a channel",
        "--   that executes it as ONE call in ONE session.",
        "--   apply_migration is RULED OUT: it mints its own migration version and supplies its own",
        "--   transaction wrapper, which would nest this file's BEGIN/COMMIT and give a harness intake a",
        "--   permanent migration identity (standing gotcha: migration name = permanent identity).",
        "--   SCOPE OF THE EXECUTABLE GUARD: the transaction guard " + guard_site + " detects a SPLIT /",
        "--   autocommitting channel (temp relations gone, or txid changed). It CANNOT detect a NESTING",
        "--   wrapper such as apply_migration — under one, the temp relations still exist and the txid is",
        "--   unchanged, so the guard passes while this file's BEGIN/COMMIT silently joins the outer",
        "--   transaction. Ruling apply_migration out is therefore an OPERATOR control only; after the",
        "--   fact it shows up as an unexpected migration-ledger entry (a db-rls-auditor read).",
    ]


def txn_guard(prefix, phase, tables):
    """Emit the executable split-channel guard shared by both files."""
    L = []
    L.append(f"-- SPLIT-CHANNEL GUARD (executable; runs BEFORE any {phase}).")
    L.append("-- If the channel autocommits per statement, the ON COMMIT DROP temp relations are already")
    L.append("-- gone and/or the xid has changed — abort here, while aborting still prevents the writes.")
    L.append("DO $$")
    L.append("DECLARE base_txid bigint;")
    L.append("BEGIN")
    conds = [f"to_regclass('pg_temp.{t}') IS NULL" for t in tables]
    L.append("  IF " + ("\n     OR ".join(conds)) + " THEN")
    L.append(f"    RAISE EXCEPTION '{prefix}: temp baseline relation(s) missing before {phase} — the execution channel is NOT running this file as one transaction; STOP, nothing written';")
    L.append("  END IF;")
    L.append(f"  SELECT txid INTO base_txid FROM pg_temp.{tables[0]};")
    L.append("  IF base_txid <> txid_current() THEN")
    L.append(f"    RAISE EXCEPTION '{prefix}: transaction id changed (% -> %) before {phase} — split channel; STOP, nothing written', base_txid, txid_current();")
    L.append("  END IF;")
    L.append("END $$;")
    return L


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def build_apply(tracks):
    n = len(tracks)
    keys = [t["music_track"]["track_key"] for t in tracks]
    keylist = ", ".join(q(k) for k in keys)
    baseline_list = ", ".join(q(k) for k in EXPECTED_BASELINE)

    L, A = [], None
    A = L.append
    A(f"-- Music Library v0 — BATCH 2 fenced intake ({n} CC0 instrumental tracks, four-brand mood cover)")
    A("-- GENERATED from manifest.json by build_intake.py (v3) — do not hand-edit; regenerate instead.")
    A("-- v3: re-authored across three apply-harness-auditor shadow runs (see the generator docstring).")
    A("--")
    A("-- FENCED intake ONLY: all four fences written explicitly OFF (approval_status='intake_candidate',")
    A("--   approved / production_use_allowed / is_active = false). Nothing becomes selectable.")
    A("--   No approval, no fence-flip, no m.music_suitability rows, no c.client_music_profile rows.")
    A("--   Approval + scoped suitability are SEPARATE PK gates.")
    A("--")
    L.extend(channel_block("immediately below, before the first INSERT"))
    A("--")
    A("-- ⚠ UPLOAD PRECONDITION: each .mp3 must ALREADY exist in bucket 'post-music' at")
    A("--   global/<mood>/<track_key>.mp3 with the exact byte count. Missing/wrong-size => rollback.")
    A("--")
    A("-- Idempotent: WHERE NOT EXISTS on track_key. A re-run inserts nothing, and the row-count")
    A("--   assert accounts for rows already present, so a clean re-run still passes.")
    A("--")
    A("-- ROLLBACK: music_v1_batch2_intake_rollback.sql (a real transactional script keyed on the")
    A("--   same 13 track_keys this file inserts). Storage objects are LEFT IN PLACE for re-attempt")
    A("--   (PK ruling 2026-08-06).")
    A("")
    A("BEGIN;")
    A("")
    A("-- ── BASELINE CAPTURE (before ALL DML) ────────────────────────────────────────────────")
    A("CREATE TEMP TABLE _music_intake_txn ON COMMIT DROP AS")
    A("  SELECT txid_current() AS txid;")
    A("")
    A("CREATE TEMP TABLE _music_intake_baseline ON COMMIT DROP AS")
    A(f"  SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED};")
    A("")
    A("CREATE TEMP TABLE _music_intake_counts ON COMMIT DROP AS")
    A("  SELECT (SELECT count(*) FROM m.music_track)   AS track_n,")
    A("         (SELECT count(*) FROM m.music_license) AS license_n,")
    A(f"         (SELECT count(*) FROM m.music_track WHERE track_key IN ({keylist})) AS pre_existing;")
    A("")
    A("-- C-12")
    L.extend(txn_guard("music-intake C-12", "INSERT",
                       ["_music_intake_txn", "_music_intake_baseline", "_music_intake_counts"]))
    A("")
    A("-- C-3 BASELINE IS THE EXPECTED POOL.")
    A("DO $$")
    A("DECLARE n int; unexpected text;")
    A("BEGIN")
    A("  SELECT count(*) INTO n FROM pg_temp._music_intake_baseline;")
    A(f"  IF n <> {len(EXPECTED_BASELINE)} THEN")
    A(f"    RAISE EXCEPTION 'music-intake BASELINE: % selectable tracks, expected {len(EXPECTED_BASELINE)} — the live pool changed since this packet was authored; STOP and re-author — rolled back', n;")
    A("  END IF;")
    A("  SELECT string_agg(track_key, ', ') INTO unexpected FROM pg_temp._music_intake_baseline")
    A(f"    WHERE track_key NOT IN ({baseline_list});")
    A("  IF unexpected IS NOT NULL THEN")
    A(f"    RAISE EXCEPTION 'music-intake BASELINE: unexpected selectable track(s) [%], expected exactly [{', '.join(EXPECTED_BASELINE)}] — rolled back', unexpected;")
    A("  END IF;")
    A("END $$;")
    A("")

    for t in tracks:
        mt, ml = t["music_track"], t["music_license"]
        tk = mt["track_key"]
        obj = f"global/{mt['mood']}/{tk}.mp3"
        A(f"-- {tk}  ({mt['title']} · {mt['mood']} · {round(float(mt['duration_seconds']))}s · {ml['license_type']})")
        A("DO $$ BEGIN")
        A("  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'")
        A(f"    AND name = {q(obj)} AND (metadata->>'size')::bigint = {mt['bytes']};")
        A(f"  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', {q(obj)}; END IF;")
        A("END $$;")
        A("WITH ins AS (")
        A("  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)")
        A("  SELECT " + ", ".join(q(x) for x in [
            tk, mt["title"], mt["source"], mt["storage_bucket"], mt["storage_path"],
            mt["sha256"], mt["mime"], mt["bytes"], mt["duration_seconds"], mt["mood"],
            mt["energy"], mt["tempo_band"], mt["genre"], mt["vocals"],
            # AHA-01-1: the four fences written explicitly, not inherited from DEFAULTs.
            mt["approval_status"], mt["approved"], mt["production_use_allowed"], mt["is_active"],
            BATCH_NOTE]))
        A(f"  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = {q(tk)})")
        A("  RETURNING track_id")
        A(")")
        A("INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)")
        A("SELECT ins.track_id, " + ", ".join(q(x) for x in [
            ml["license_type"], ml["license_name"], ml["source_url"],
            ml["license_snapshot_hash"], ml["license_snapshot_path"],
            ml["commercial_use_allowed"], ml["social_use_allowed"], ml["modification_allowed"],
            ml["paid_ads_allowed"], ml["attribution_required"], ml["content_id_safe"]]) + " FROM ins;")
        A("")

    A("-- ── VERIFY (all fail-closed; any breach rolls the whole batch back) ──────────────────")
    A("DO $$")
    A("DECLARE batch int; bad_lic int; missing_lic int; drift int;")
    A("        base_track bigint; base_lic bigint; pre_ex bigint; expected_new bigint;")
    A("        grew_track bigint; grew_lic bigint; incongruent text;")
    A("BEGIN")
    A("  -- 0. Still the same transaction (C-12 re-check at the far end).")
    A("  IF (SELECT txid FROM pg_temp._music_intake_txn) <> txid_current() THEN")
    A("    RAISE EXCEPTION 'music-intake C-12: transaction id changed during the batch — rolled back';")
    A("  END IF;")
    A("")
    A("  -- 1. Fenced-count: exactly N rows, every one of the four fences off.")
    A("  --    Scoped on track_key, NOT on notes: notes is nullable unconstrained free text that a")
    A("  --    human may legitimately edit at the aural gate, so it is not a safe identity predicate")
    A("  --    (the same reasoning that re-keyed the rollback).")
    A(f"  SELECT count(*) INTO batch FROM m.music_track WHERE track_key IN ({keylist})")
    A("    AND is_active IS FALSE AND approved IS FALSE")
    A("    AND approval_status = 'intake_candidate' AND production_use_allowed IS FALSE;")
    A(f"  IF batch <> {n} THEN")
    A(f"    RAISE EXCEPTION 'music-intake verify: % fenced rows in batch, expected {n} — rolled back', batch;")
    A("  END IF;")
    A("")
    A("  -- 2. MARKER CONSISTENCY (data quality, not identity): every row this apply is responsible")
    A("  --    for should also carry the batch marker, and the marker should not have leaked to any")
    A("  --    other row. Identity itself is the track_key set above and in the rollback.")
    A("  SELECT string_agg(track_key, ', ') INTO incongruent FROM (")
    A(f"    (SELECT track_key FROM m.music_track WHERE notes = {q(BATCH_NOTE)}")
    A("     EXCEPT")
    A(f"     SELECT * FROM (VALUES {', '.join('(' + q(k) + ')' for k in keys)}) v(track_key))")
    A("    UNION ALL")
    A(f"    (SELECT * FROM (VALUES {', '.join('(' + q(k) + ')' for k in keys)}) v(track_key)")
    A("     EXCEPT")
    A(f"     SELECT track_key FROM m.music_track WHERE notes = {q(BATCH_NOTE)})")
    A("  ) d;")
    A("  IF incongruent IS NOT NULL THEN")
    A("    RAISE EXCEPTION 'music-intake verify: batch marker and track_key set diverge on [%] — rolled back', incongruent;")
    A("  END IF;")
    A("")
    A("  -- 3. Every batch track has its 1:1 licence row (no orphan track).")
    A("  SELECT count(*) INTO missing_lic FROM m.music_track t")
    A(f"    WHERE t.track_key IN ({keylist})")
    A("      AND NOT EXISTS (SELECT 1 FROM m.music_license l WHERE l.track_id = t.track_id);")
    A("  IF missing_lic <> 0 THEN")
    A("    RAISE EXCEPTION 'music-intake verify: % batch track(s) with no licence row — rolled back', missing_lic;")
    A("  END IF;")
    A("")
    A("  -- 4. v0 licence invariants: cc0, no attribution obligation, Content-ID fail-closed.")
    A("  SELECT count(*) INTO bad_lic FROM m.music_track t JOIN m.music_license l USING (track_id)")
    A(f"    WHERE t.track_key IN ({keylist})")
    A("      AND NOT (l.license_type = 'cc0'")
    A("               AND l.attribution_required IS FALSE")
    A("               AND l.content_id_safe IS FALSE")
    A("               AND l.commercial_use_allowed IS TRUE")
    A("               AND l.social_use_allowed IS TRUE);")
    A("  IF bad_lic <> 0 THEN")
    A("    RAISE EXCEPTION 'music-intake verify: % batch licence row(s) violate the v0 invariant — rolled back', bad_lic;")
    A("  END IF;")
    A("")
    A("  -- 5. ADDITIVE-ONLY: both tables grew by exactly the number of rows this run inserted")
    A("  --    (13 minus any already present), so nothing else was created or destroyed.")
    A("  SELECT track_n, license_n, pre_existing INTO base_track, base_lic, pre_ex")
    A("    FROM pg_temp._music_intake_counts;")
    A(f"  expected_new := {n} - pre_ex;")
    A("  SELECT count(*) - base_track INTO grew_track FROM m.music_track;")
    A("  SELECT count(*) - base_lic   INTO grew_lic   FROM m.music_license;")
    A("  IF grew_track <> expected_new THEN")
    A("    RAISE EXCEPTION 'music-intake verify: m.music_track grew by %, expected % — rolled back', grew_track, expected_new;")
    A("  END IF;")
    A("  IF grew_lic <> expected_new THEN")
    A("    RAISE EXCEPTION 'music-intake verify: m.music_license grew by %, expected % — rolled back', grew_lic, expected_new;")
    A("  END IF;")
    A("")
    A("  -- 6. POOL NEUTRALITY: the selectable set must equal the pre-DML baseline, BOTH directions.")
    A("  --    NOTE: EXCEPT and UNION ALL share precedence and are LEFT-associative in Postgres,")
    A("  --    so each arm MUST be parenthesised. Without the parens this collapses to a")
    A("  --    one-directional check that silently misses newly-selectable tracks.")
    A("  SELECT count(*) INTO drift FROM (")
    A(f"    (SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED}")
    A("     EXCEPT")
    A("     SELECT track_key FROM pg_temp._music_intake_baseline)")
    A("    UNION ALL")
    A("    (SELECT track_key FROM pg_temp._music_intake_baseline")
    A("     EXCEPT")
    A(f"     SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED})")
    A("  ) d;")
    A("  IF drift <> 0 THEN")
    A("    RAISE EXCEPTION 'music-intake verify: selectable pool changed by % track(s) — intake must be pool-neutral — rolled back', drift;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("COMMIT;")
    A("")
    return "\n".join(L)


def build_rollback(tracks):
    n = len(tracks)
    keys = [t["music_track"]["track_key"] for t in tracks]


    L, A = [], None
    A = L.append
    A(f"-- Music Library v0 — BATCH 2 fenced intake ROLLBACK ({n} tracks)")
    A("-- GENERATED by build_intake.py (v3) alongside music_v1_batch2_intake_apply.sql.")
    A("--")
    A("-- IDENTITY: keyed on the SAME 13 track_keys the apply inserts by (AHA-07-2). It is NOT keyed")
    A("--   on m.music_track.notes — that column is nullable, unconstrained free text that a human")
    A("--   may legitimately edit at the aural gate, which would silently shrink a notes-keyed")
    A("--   rollback into a partial no-op.")
    A("--")
    L.extend(channel_block("immediately below, before the first DELETE"))
    A("--")
    A("-- ⚠ STORAGE DISPOSITION (PK ruling 2026-08-06): the 13 uploaded objects in the PUBLIC")
    A("--   post-music bucket are LEFT IN PLACE for re-attempt. This rollback deliberately removes")
    A("--   DB rows only. If the batch is abandoned rather than retried, removing those objects is a")
    A("--   separate, explicit operator step — their paths are enumerable from manifest.json.")
    A("--")
    A("-- ⚠ VALIDITY WINDOW: pre-approval only. This script ABORTS rather than deleting if EITHER")
    A("--   (a) any target row has left the fenced state (approval_status <> 'intake_candidate', or")
    A("--       any of approved / production_use_allowed / is_active true) — approval state lives in")
    A("--       COLUMNS on m.music_track, and the migration creates no trigger forcing a review-event")
    A("--       row on a fence flip, so a direct flip would otherwise leave every child table empty")
    A("--       and slip past a child-only precondition; or")
    A("--   (b) any child row exists (m.music_track_tag / m.music_suitability / m.music_usage_event /")
    A("--       m.music_review_event) — a later gate has begun, and a blind delete would destroy that")
    A("--       evidence and/or fail on FK partway through, leaving tracks with no licence row.")
    A("")
    A("BEGIN;")
    A("")
    A("CREATE TEMP TABLE _music_rollback_txn ON COMMIT DROP AS")
    A("  SELECT txid_current() AS txid;")
    A("")
    A("CREATE TEMP TABLE _music_rollback_keys (track_key text PRIMARY KEY, sha256 text NOT NULL)")
    A("  ON COMMIT DROP;")
    A("-- pg_temp-qualified WRITE, not just the reads: an unqualified INSERT resolves through")
    A("-- search_path, so a same-named relation earlier on the path would leave the identity table")
    A("-- empty while the INSERT silently succeeded elsewhere (AHA-06-1 run 3).")
    A("INSERT INTO pg_temp._music_rollback_keys (track_key, sha256) VALUES")
    A("  " + ",\n  ".join(f"({q(t['music_track']['track_key'])}, {q(t['music_track']['sha256'])})"
                          for t in tracks) + ";")
    A("")
    A("-- BASELINES (before any DELETE): the selectable pool, both table row counts, how many target")
    A("-- rows actually matched, and the pre-existing orphan count. Without these the verify below")
    A("-- could not tell an in-scope delete from an out-of-scope one.")
    A("CREATE TEMP TABLE _music_rollback_selectable ON COMMIT DROP AS")
    A(f"  SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED};")
    A("")
    A("CREATE TEMP TABLE _music_rollback_baseline ON COMMIT DROP AS")
    A("  SELECT (SELECT count(*) FROM m.music_track)   AS track_n,")
    A("         (SELECT count(*) FROM m.music_license) AS license_n,")
    A("         (SELECT count(*) FROM m.music_track t")
    A("            JOIN pg_temp._music_rollback_keys k USING (track_key))  AS matched_tracks,")
    A("         (SELECT count(*) FROM m.music_license l")
    A("            JOIN m.music_track t USING (track_id)")
    A("            JOIN pg_temp._music_rollback_keys k USING (track_key))  AS matched_licenses,")
    A("         (SELECT count(*) FROM m.music_track t")
    A("            WHERE NOT EXISTS (SELECT 1 FROM m.music_license l WHERE l.track_id = t.track_id))")
    A("           AS orphans_before;")
    A("")
    L.extend(txn_guard("music-rollback GUARD", "DELETE",
                       ["_music_rollback_txn", "_music_rollback_keys",
                        "_music_rollback_selectable", "_music_rollback_baseline"]))
    A("")
    A("-- PRECONDITION (0): CARDINALITY FLOOR. Without this every assert below is satisfied")
    A("-- vacuously by a zero-match run — wrong database, apply never committed, or an")
    A("-- under-populated key table would all 'succeed' while deleting nothing (AHA-03-1 run 3).")
    A("DO $$")
    A("DECLARE loaded bigint; matched bigint;")
    A("BEGIN")
    A("  SELECT count(*) INTO loaded FROM pg_temp._music_rollback_keys;")
    A(f"  IF loaded <> {n} THEN")
    A(f"    RAISE EXCEPTION 'music-rollback ABORTED: key table loaded % rows, expected {n} — nothing removed', loaded;")
    A("  END IF;")
    A("  SELECT matched_tracks INTO matched FROM pg_temp._music_rollback_baseline;")
    A(f"  IF matched <> {n} THEN")
    A(f"    RAISE EXCEPTION 'music-rollback ABORTED: only % of {n} target track(s) present — this is not the applied batch (wrong database, apply not committed, or already rolled back); nothing removed', matched;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("-- PRECONDITION (c): PROVENANCE. Every target row's sha256 must match the manifest value for")
    A("-- that track_key. The apply SKIPS a pre-existing track_key (C-6 idempotency), so without this")
    A("-- the rollback could delete a same-keyed row this apply never created (AHA-07-1 run 3).")
    A("DO $$")
    A("DECLARE mismatched text;")
    A("BEGIN")
    A("  SELECT string_agg(t.track_key, ', ') INTO mismatched")
    A("    FROM m.music_track t JOIN pg_temp._music_rollback_keys k USING (track_key)")
    A("   WHERE t.sha256 IS DISTINCT FROM k.sha256;")
    A("  IF mismatched IS NOT NULL THEN")
    A("    RAISE EXCEPTION 'music-rollback ABORTED: sha256 mismatch on (%) — the stored row is not the one this batch inserted; nothing removed', mismatched;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("-- PRECONDITION (a): every target row must still be FENCED.")
    A("DO $$")
    A("DECLARE unfenced text;")
    A("BEGIN")
    A("  SELECT string_agg(t.track_key || ' [' || t.approval_status")
    A("           || ' approved=' || t.approved")
    A("           || ' prod=' || t.production_use_allowed")
    A("           || ' active=' || t.is_active || ']', ', ')")
    A("    INTO unfenced")
    A("    FROM m.music_track t JOIN pg_temp._music_rollback_keys k USING (track_key)")
    A("   WHERE NOT (t.approval_status = 'intake_candidate'")
    A("              AND t.approved IS FALSE")
    A("              AND t.production_use_allowed IS FALSE")
    A("              AND t.is_active IS FALSE);")
    A("  IF unfenced IS NOT NULL THEN")
    A("    RAISE EXCEPTION 'music-rollback ABORTED: target track(s) are no longer fenced (%) — approval has begun; this rollback is only valid pre-approval; resolve by hand — nothing removed', unfenced;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("-- PRECONDITION (b): no child rows may exist for these tracks.")
    A("DO $$")
    A("DECLARE blockers text := '';")
    A("        c bigint;")
    A("BEGIN")
    for tbl in CHILD_TABLES:
        A(f"  SELECT count(*) INTO c FROM {tbl} x")
        A("    WHERE x.track_id IN (SELECT t.track_id FROM m.music_track t")
        A("                          JOIN pg_temp._music_rollback_keys k USING (track_key));")
        A(f"  IF c > 0 THEN blockers := blockers || '{tbl}=' || c || ' '; END IF;")
    A("  IF blockers <> '' THEN")
    A("    RAISE EXCEPTION 'music-rollback ABORTED: child rows exist for the batch (%) — a later gate has begun; resolve by hand, do not blind-delete — nothing removed', blockers;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("-- Children before parent (m.music_license.track_id REFERENCES m.music_track).")
    A("DELETE FROM m.music_license")
    A(" WHERE track_id IN (SELECT t.track_id FROM m.music_track t")
    A("                     JOIN pg_temp._music_rollback_keys k USING (track_key));")
    A("")
    A("DELETE FROM m.music_track")
    A(" WHERE track_key IN (SELECT track_key FROM pg_temp._music_rollback_keys);")
    A("")
    A("-- VERIFY: the batch is fully gone, and NOTHING outside it moved.")
    A("DO $$")
    A("DECLARE remaining int; orphans_now bigint; drift int;")
    A("        b_track bigint; b_lic bigint; m_track bigint; m_lic bigint; b_orph bigint;")
    A("        fell_track bigint; fell_lic bigint;")
    A("BEGIN")
    A("  IF (SELECT txid FROM pg_temp._music_rollback_txn) <> txid_current() THEN")
    A("    RAISE EXCEPTION 'music-rollback GUARD: transaction id changed during the delete — rolled back';")
    A("  END IF;")
    A("")
    A("  SELECT b.track_n, b.license_n, b.matched_tracks, b.matched_licenses, b.orphans_before")
    A("    INTO b_track, b_lic, m_track, m_lic, b_orph")
    A("    FROM pg_temp._music_rollback_baseline b;")
    A("")
    A("  -- 1. Every target row is gone.")
    A("  SELECT count(*) INTO remaining FROM m.music_track")
    A("    WHERE track_key IN (SELECT track_key FROM pg_temp._music_rollback_keys);")
    A("  IF remaining <> 0 THEN")
    A("    RAISE EXCEPTION 'music-rollback verify: % batch track(s) still present — rolled back', remaining;")
    A("  END IF;")
    A("")
    A("  -- 2. BOUNDED CARDINALITY: both tables fell by exactly the number of rows that MATCHED the")
    A("  --    key list — so nothing outside the batch was deleted.")
    A("  SELECT b_track - count(*) INTO fell_track FROM m.music_track;")
    A("  SELECT b_lic   - count(*) INTO fell_lic   FROM m.music_license;")
    A("  IF fell_track <> m_track THEN")
    A("    RAISE EXCEPTION 'music-rollback verify: m.music_track fell by %, expected % — out-of-scope deletion — rolled back', fell_track, m_track;")
    A("  END IF;")
    A("  IF fell_lic <> m_lic THEN")
    A("    RAISE EXCEPTION 'music-rollback verify: m.music_license fell by %, expected % — out-of-scope deletion — rolled back', fell_lic, m_lic;")
    A("  END IF;")
    A("")
    A("  -- 3. POOL NEUTRALITY: the selectable set is untouched, BOTH directions.")
    A("  --    (Each arm parenthesised — EXCEPT/UNION ALL are equal-precedence and left-associative.)")
    A("  SELECT count(*) INTO drift FROM (")
    A(f"    (SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED}")
    A("     EXCEPT")
    A("     SELECT track_key FROM pg_temp._music_rollback_selectable)")
    A("    UNION ALL")
    A("    (SELECT track_key FROM pg_temp._music_rollback_selectable")
    A("     EXCEPT")
    A(f"     SELECT track_key FROM m.music_track WHERE {SELECTABLE_PRED})")
    A("  ) d;")
    A("  IF drift <> 0 THEN")
    A("    RAISE EXCEPTION 'music-rollback verify: selectable pool changed by % track(s) — a rollback must never move the live pool — rolled back', drift;")
    A("  END IF;")
    A("")
    A("  -- 4. The 1:1 invariant is no worse than we found it.")
    A("  SELECT count(*) INTO orphans_now FROM m.music_track t")
    A("    WHERE NOT EXISTS (SELECT 1 FROM m.music_license l WHERE l.track_id = t.track_id);")
    A("  IF orphans_now <> b_orph THEN")
    A("    RAISE EXCEPTION 'music-rollback verify: orphan tracks went % -> % — this rollback broke the 1:1 invariant — rolled back', b_orph, orphans_now;")
    A("  END IF;")
    A("END $$;")
    A("")
    A("COMMIT;")
    A("")
    return "\n".join(L)


def main():
    man = json.load(open(os.path.join(HERE, "manifest.json"), encoding="utf-8"))
    tracks = man["tracks"]
    for name, body in (("music_v1_batch2_intake_apply.sql", build_apply(tracks)),
                       ("music_v1_batch2_intake_rollback.sql", build_rollback(tracks))):
        p = os.path.join(HERE, name)
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)
        print(f"wrote {name}  ({len(body.splitlines())} lines)")


if __name__ == "__main__":
    main()
