<!-- CLAIMED v5.42 · music-library-v0 starter-harvest fenced intake · lane MUSIC-INTAKE-1 · shared worktree (main) · gate: APPLIED+PROVEN, push held · 2026-07-09 -->
# Result — Music Library v0 · Starter-Harvest FENCED Intake (9 CC0 tracks)

**Brief file:** `docs/briefs/music-library-v0-manual-starter-harvest-brief.md` (gate1_approved)
**Governing design:** `docs/briefs/music-library-v0-schema-packet.md` · live schema migration `20260708224532_create_music_library_v0.sql`
**Executed by:** Claude Code (orchestrator) — PK-authorized apply
**Completed:** 2026-07-09 Sydney
**Lane / tier / label:** MUSIC-INTAKE-1 · **T3** (production DML on live tables + storage) · **PRODUCT_PROOF**

---

## 1. Result status

`Complete` — 9 CC0 instrumental tracks intaken as **FENCED** candidates (nothing selectable). Live-proven. Push held.

## 2. Commit(s)

- `e4e4078` — chore(music-harvester-v0): save reviewed CC0 starter-harvest intake package + brief (text artifacts only, no mp3 binaries). **Note: swept to origin by the parallel PP-video push** (see §6).
- `44eae8a` — chore(music-harvester-v0): fix RAISE `%%`→`%` in intake SQL (11 format strings) so the fail-closed guards compile. New SQL sha256 `9db2d8604908bee62985ccaa285cfbfb6f279979013ba304ac5f2b12221c71fe`.

## 3. Files changed

- `_harness/music_harvester_v0/**` (README, SOURCING_LOG, manifest, build/harvest scripts, 9 `*.license.txt`, `music_v0_intake_apply.sql`) — created (committed `e4e4078`; SQL corrected in fix commit). The 9 `*.mp3` binaries stay **untracked** (reproducible from manifest CDN URLs + sha256; live in `post-music` storage).
- `docs/briefs/music-library-v0-manual-starter-harvest-brief.md` — created (committed `e4e4078`).
- `docs/briefs/results/music-library-v0-starter-harvest-intake-result.md` — created (this doc).
- **DB (live, project `mbkmaxqhsohbtwsqolns`):** +9 rows `m.music_track`, +9 rows `m.music_license` (fenced). No DDL, no GRANT/REVOKE, no policy change.
- **Storage:** 9 `.mp3` objects in bucket `post-music` at `global/<mood>/<track_key>.mp3` — **pre-existing** (uploaded 2026-07-09 05:35–05:36 UTC by a prior/parallel step); byte-verified, not re-uploaded this lane.

## 4. Actions taken

1. **Located + verified package.** All 9 local mp3 sha256 + byte sizes match the intake SQL exactly. Reviewed SQL, manifest, sourcing log.
2. **Committed the reviewed package** (`e4e4078`, explicit pathspec, no mp3, other session's staged tmr-readiness files left untouched — R4).
3. **Re-reviewed on the exact SQL** (prior session's review had no persisted `reviewed_input_hash`, so it could not be carried — contract rule 4):
   - `db-rls-auditor` → **PASS** (high confidence): column/type match, every CHECK value live-valid, four fences NOT-NULL default to fenced state, `UNIQUE(track_key)` idempotency, RLS deny-all, no anon/authenticated grants, tables empty.
   - `ask_chatgpt_review` (hash `2c26433f`) → **agree/proceed** (review_id `742cbf45`).
4. **Storage state check:** found all 9 objects already present (unexpected vs. upload-first plan) → treated as a STOP → **verified benign** via the non-waivable byte-verify guard: fetched each public URL and confirmed **sha256 of actual bytes == manifest** for all 9 (not just name+size). Exactly 9 objects, no extras.
5. **First apply attempt errored fail-closed** — `RAISE` used `%%` (literal, zero placeholders) with one argument → *"too many parameters specified for RAISE"* at compile; whole transaction rolled back, tables re-confirmed 0/0. **Concrete defect** neither static review caught.
6. **Fixed `%%`→`%`** (11 RAISE strings), re-hashed (`9db2d860`), **re-ran external review** pinned to the new hash → **agree/proceed** (review_id `ff08927f`, low risk).
7. **Applied** the corrected fenced intake (single transaction; per-track storage prechecks + final pool-neutrality assertion) — COMMIT succeeded.
8. **Proved:** total 9/9 tracks/licenses · batch 9 · fenced_ok **9/9** · **selectable 0** (pool neutral) · 9 CC0 licenses (attribution=false, content_id_safe=false) · every track has a license. Security advisors: music tables appear **only** under INFO `rls_enabled_no_policy` (intended dark deny-all); **no new WARN/ERROR** introduced (data-only).

## 5. Constraints confirmed (forbidden items — NOT done)

- **No approval / fence-flip.** All four fences remain off (`is_active`/`approved`/`production_use_allowed`=false, `approval_status='intake_candidate'`). Nothing selectable. Approval is a separate future PK gate.
- **No `select_music` RPC, no video-worker change, no `VIDEO_WORKER_MUSIC_ENABLED` flip, no Creatomate wiring.**
- **No DDL / GRANT / REVOKE / policy change.** Data-only INSERT.
- **No CC-BY / CC-BY-SA / NC / AI-generated / paid-stock** sourced — all 9 are CC0 1.0.
- **`content_id_safe=false` on all 9** (fail-closed) — none YouTube-eligible in v0.
- **No push** of this lane's work (push held; but see §6).

## 6. Open issues

- **`e4e4078` reached origin unintentionally.** The parallel PP-video-TMR session committed on top and **pushed**, sweeping my package commit to `origin/main` (parity 0/0) despite "push held". Harmless content (reviewed intake package, no production behaviour); not worth an irreversible un-push. The **SQL fix commit** and **register pointers** remain **push-held** pending PK.
- **`storage_path` modelling note (should-fix, non-blocking, from db-rls-auditor):** rows store `storage_path='post-music/global/…'` (bucket-prefixed) while the storage object key is `global/…`. Harmless for this fenced apply; reconcile the convention **before** a `select_music` RPC consumes the column.
- **Facets are harvester guesses** (mood/energy/tempo_band/genre) — PK aural verdict is authoritative at approval. `corporate_theme_medieval_008` mood flagged (reads folk/dramatic); `uplifting_composed_pluto_007` ~230s (loop/trim candidate). `loudness_lufs`/`bpm`/`text_overlay_safe` all null (no automated audio QA).
- **corporate + uplifting have 1 candidate each**, both stretch-fits from a CC0 ambient/acoustic catalog. Pixabay/YouTube Audio Library (the strong sources for those moods) were not machine-harvestable — recommend PK hand-source at the aural gate.

## 7. Next recommended step

Two separate future PK gates (neither started): **(a)** the SQL-fix commit + register pointers are push-held — PK authorizes push when ready; **(b)** the **aural + final-licence approval gate** — PK reviews the 9 tracks, sets authoritative facets, and elects which (if any) to promote (fence-flip). Only after approval does the `select_music` RPC / video-worker wiring become in-scope.

---

## 8. Verification

**Verdict:** `Pass`

- Output matched the brief: 9 CC0 fenced candidates, nothing selectable, full provenance. ✓
- Constraints respected: no approval/flip/RPC/worker/DDL/grant; CC0-only; content_id_safe=false. ✓
- Unexpected files changed: none in the DB beyond the 9+9 fenced rows; storage objects pre-existed and were byte-verified. ✓
- Success criteria met: fenced_ok 9/9, selectable 0, advisors clean (no new WARN/ERROR). ✓
- New risks: the accidental origin push of `e4e4078` (benign); `storage_path` prefix convention to reconcile before selection. ✓ (both logged)

## 9. Learning notes

- **A hash-verified, twice-reviewed SQL artifact still carried a compile-time defect** (`%%` vs `%` in `RAISE`) that both static reviews (schema-level db-rls-auditor + gpt-4o-mini) missed. Apply-time execution is the real test; the fail-closed single-transaction design made the miss safe (nothing partial). Worth a lint on harness SQL for `RAISE … %%` with an argument.
- **Deferred-upload objects may already exist** when a lane resumes across sessions — the standing per-apply **public-URL sha256 byte-verify** (not just the SQL's name+size precheck) is what converts "unexpected pre-existing objects" into "verified benign". Keep it non-waivable.
- **Resuming a lane from a prior session's review requires a fresh review** when no `reviewed_input_hash` was persisted — persist the reviewed hash in the package next time.
