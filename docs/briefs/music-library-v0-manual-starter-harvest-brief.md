# Brief cc-NNNN — music-library-v0-manual-starter-harvest

**Created:** 2026-07-09 Sydney
**Author:** brief-author (draft) — orchestrator persists
**Executor:** Claude Code (manual/human sourcing + fenced-intake SQL authoring; PK runs any apply)
**Status:** gate1_approved (2026-07-09)
**Result file:** `docs/briefs/results/cc-NNNN-music-library-v0-manual-starter-harvest.md` (created on completion)

---

## PK Gate-1 decisions (2026-07-09) — APPROVED

The five open questions are resolved; the lane is approved to proceed to sourcing (source + fenced-package only; approval/live-upload/fence-flip remain future gates):

1. **Track selection — Claude curates a shortlist.** I source a licence-clean, instrumental, mood-balanced shortlist and return it (clips + provenance) for PK's aural approve/cull. PK keeps the final say at the aural gate.
2. **Upload timing — DEFER.** No live-bucket upload in this lane. Download candidates locally to `_harness/music_harvester_v0/candidates/`, build the manifest + provenance, and author the fenced-intake SQL as a *parameterised* package whose `post-music` byte-precheck runs at the LATER apply gate (after PK aural approval + upload). Nothing touches the live bucket until PK has heard it.
3. **content_id_safe — FAIL-CLOSED.** Every track gets `content_id_safe = UNKNOWN/false` (⇒ NOT YouTube-eligible in v0) unless a track explicitly proves Content-ID safety. CC0/Pixabay waive copyright but don't guarantee no third-party Content-ID claim.
4. **Lane label — PRODUCT_PROOF.** Tier **T2** (fenced dark-intake; the apply is a separate PK hard-stop).
5. **Intake review-event rows — DEFER** (minor): review-event rows are written at the aural/approval gate, not in the fenced-intake package.

**Lane deliverable (revised for the DEFER decision):** curated candidate files + manifest + licence evidence + the parameterised fenced-intake SQL, RETURNED for PK aural/licence review. **No live upload, no intake apply in this lane.**

---

## Task

Manually source a small starter pool (5–10) of **licence-clean, instrumental, text-overlay-safe** background music tracks and bring them into the now-LIVE Music Library v0 schema as **FENCED intake candidates only**. This is the first harvest — it proves the schema and the review process (`docs/briefs/music-library-v0-schema-packet.md` — PK decision #2, manual-first, no harvester agent). The lane sources/downloads to a harness sub-root, computes `sha256` + captures licence evidence, builds a harvest manifest, runs a **human aural + licence review**, and authors a **fenced-intake SQL package** (INSERT into `m.music_track` + `m.music_license`, all four fences false) — then RETURNS the package for PK aural/licence review. **NOTHING is approved, promoted, uploaded to a live-selectable state, or made selectable in this lane.** Approval, live upload, and fence-flip are SEPARATE future gates.

The schema is LIVE and ships dark: `create_music_library_v0` applied to production (ledger `20260708224532`, commit `46b3a83`, reviewed sha256 `1b7c1f3e`; 7 tables + net-new PUBLIC `post-music` bucket + service-role write policy; RLS deny-all; tables EMPTY; no `select_music` RPC; `VIDEO_WORKER_MUSIC_ENABLED` off). *Live-truth of this apply is orchestrator-asserted — re-verify before any apply step (see Forbidden actions).*

## Source context

- `docs/briefs/music-library-v0-schema-packet.md` — governing design: §4 governed CHECK vocabularies + fail-closed defaults, §6 fenced-until-approved review/approval flow, §8 licensing evidence model + six fail-closed booleans, §0 PK gate-1 decisions, §15 forbidden actions, §12 the video-worker seam that this lane must NOT touch.
- `supabase/migrations/20260708224532_create_music_library_v0.sql` — the LIVE target shapes: `m.music_track` columns + the four fences + CHECK vocabularies (`:81-111`), `m.music_license` with the six fail-closed booleans (`:119-137`), `storage_path` convention `post-music/global/<mood>/<track_key>.mp3` (`:88`), net-new PUBLIC `post-music` bucket + service-role-only write policy (`:268-294`).
- `_harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql` — the PROVEN fenced-intake apply pattern to MIRROR: storage byte-size precheck (`:7-10`), sha256 in the row (`:14`), `WHERE NOT EXISTS` idempotency (`:15`), in-txn fenced-count verify (`:180-184`), production-neutrality assertion (`:186-195`). For music: assert **no track becomes selectable** — all four fences false, zero approved.
- `docs/briefs/results/cc-0027-image-harvester-agent-v0-result.md` — PK-ratified conservative-licence rule for images (CC BY-SA hold · CC BY hold · AI excluded); `docs/briefs/image-agents-promotion-review-v1.md` — CC BY / CC BY-SA are unproven/excluded unlocks. **Mirror for music:** admit only no-attribution classes because ICE has no render-time attribution mechanism.
- `CLAUDE.md` — tiers T1–T3 + findings contract + PK deploy/DB gates + standing gotchas (migration-name identity; REVOKE from anon/authenticated not PUBLIC alone; PGRST106 on unexposed schema).

## Scope

**In scope:**
1. **Manual sourcing** of 5–10 candidate instrumental tracks from the no-attribution-only allow-list (below), downloaded to `_harness/music_harvester_v0/` (one harness sub-root per session/run — CCF-02 R4).
2. For each candidate: compute **sha256-of-bytes** + record `bytes`/`mime`/`duration_seconds`; capture the **licence evidence** (saved licence text/screenshot + `license_snapshot_hash`); human-record `loudness_lufs`/`bpm`/`text_overlay_safe` (nullable ok — PK decision, no automated audio QA).
3. Build a **harvest manifest** (per-track metadata → the live columns; see below).
4. **Human aural + licence review** of every candidate (listen; verify each of the six licence booleans is EXPLICITLY set from the source's licence; fail-closed on any unknown).
5. Author a **fenced-intake SQL package** mirroring the logo-intake apply: byte precheck + sha256 + `WHERE NOT EXISTS` + in-txn fenced-count + neutrality assertion; INSERT into `m.music_track` (all four fences false: `approval_status='intake_candidate'`, `approved=false`, `production_use_allowed=false`, `is_active=false`) and its 1:1 `m.music_license` row; optionally a `m.music_review_event(event_kind='intake')` row per track.
6. RETURN the manifest + candidates + SQL package for PK aural/licence review.

**Out of scope (SEPARATE future gates — do NOT perform here):** approval / scoped approval / fence-flip · upload to a live-selectable state · running the intake SQL against production (that is a PK-gated apply, pinned to the file's sha256) · `select_music()` RPC build (its own later migration) · any `video-worker` change · any `VIDEO_WORKER_MUSIC_ENABLED` change (`supabase/functions/video-worker/index.ts:274`) · any Creatomate/music render wiring · `c.client_music_profile` population · `m.music_suitability` scoped-fit rows (those accompany scoped approval, not intake).

## Allowed actions

- Download candidate tracks from the no-attribution allow-list into `_harness/music_harvester_v0/` only.
- Compute `sha256`, byte size, duration; capture and hash licence-evidence artifacts (store under the same harness sub-root).
- Human-listen and human-judge `text_overlay_safe`, `loudness_lufs`, `bpm` (nullable if not judged).
- Author (but NOT apply) the fenced-intake SQL package and the manifest.
- Return everything for PK review.

### Source allow-list (no-attribution-only — decision #1)

Each source must map to a `license_type` ∈ {`cc0`, `public_domain`, `royalty_free_no_attrib`} and its licence evidence must be captured (`source_url` + saved licence text/screenshot + `license_snapshot_hash`).

| Source | Maps to `license_type` | Licence-evidence to capture | content_id_safe posture |
|---|---|---|---|
| **Pixabay Music** (Pixabay Content License — no attribution, commercial OK) | `royalty_free_no_attrib` | Track page URL + saved snapshot of the Pixabay Content License text as shown for the track; note commercial + no-attribution terms | **OPEN QUESTION** — Pixabay tracks are generally described as safe but per-track Content-ID posture is NOT guaranteed; treat `content_id_safe` as UNKNOWN unless the source states YouTube/Content-ID safety per track → fail-closed (NOT YouTube-eligible) until confirmed. |
| **YouTube Audio Library** — the **no-attribution-required subset ONLY** | `royalty_free_no_attrib` | Screenshot of the library entry showing the "no attribution required" licence flag + the download provenance | Nominally Content-ID-safe as YouTube's own library, but capture the per-track flag; if the "attribution required" filter is on, EXCLUDE the track (attribution-required is out for v0). |
| **CC0 sources** — Free Music Archive (CC0 filter), ccMixter (CC0 filter) | `cc0` | Track page URL + saved CC0 deed/notice snapshot | **OPEN QUESTION** — CC0 waives copyright but does NOT guarantee no Content-ID claim (a third party may have registered a claim); treat `content_id_safe` as UNKNOWN → fail-closed unless independently confirmed. |

**Any source whose commercial/social rights, no-attribution status, OR Content-ID/YouTube safety is uncertain → the track is INELIGIBLE (fail-closed), recorded as such in the manifest, not intaken.** Do NOT source CC BY / CC BY-SA or any attribution-required class (mirroring the image lane's CC-BY exclusion — ICE has no render-time attribution mechanism). Do NOT source anything AI-generated or paid-stock in v0.

### Per-track metadata to capture (→ the live columns)

Into `m.music_track` (`create_music_library_v0.sql:81-111`): `track_key` (stable slug, e.g. `calm_corporate_neutral_001`) · `title` · `source='manual_harvest'` · `storage_bucket='post-music'` · `storage_path='post-music/global/<mood>/<track_key>.mp3'` · `sha256` · `mime` (e.g. `audio/mpeg`) · `bytes` · `duration_seconds` · `loudness_lufs` (human, nullable) · `bpm` (human, nullable) · `mood` ∈ {calm,corporate,uplifting,warm,neutral} · `energy` ∈ {low,medium,high} · `tempo_band` ∈ {slow,mid,up} · `genre` ∈ {ambient,corporate,acoustic,electronic,orchestral,other} · `vocals='instrumental_only'` · `text_overlay_safe` (human, nullable) · the four fences all false. **CHECK-valid values ONLY** — an unknown/unmapped value is a rejection, not a pass.

Into `m.music_license` (`create_music_library_v0.sql:119-137`, 1:1 by `track_id`): `license_type` · `license_name` · `source_url` · `license_snapshot_hash` · `license_snapshot_path` · the six booleans (below) · `expiry_date` (usually null for cc0/public-domain/royalty-free).

### The six licence booleans — set EXPLICITLY per track, fail-closed (PK decision #7)

For each track, set each from the source's actual licence; any UNKNOWN → leave the track INELIGIBLE and record why:
- `commercial_use_allowed` — must be true for a usable track.
- `social_use_allowed` — must be true.
- `modification_allowed` — record honestly (music beds may be trimmed/faded).
- `paid_ads_allowed` — record honestly; some royalty-free terms restrict paid ads.
- `attribution_required` — **MUST be false for v0**; any track requiring attribution is EXCLUDED at source.
- `content_id_safe` — set true ONLY on explicit per-source evidence; NULL/unknown ⇒ NOT YouTube-eligible (fail-closed).

### Lane flow (per the packet's non-rigid order)

1. Source/download candidates → `_harness/music_harvester_v0/` (allow-list only).
2. Compute `sha256` + `bytes` + `duration`; capture licence evidence + `license_snapshot_hash`.
3. Build the harvest manifest (per-track metadata, CHECK-valid values).
4. **Human aural + licence review** — listen; set the six booleans; mark ineligible/fail-closed candidates.
5. **FENCED intake SQL package** — INSERT into `m.music_track` + `m.music_license` (all four fences false); byte precheck; sha256; `WHERE NOT EXISTS`; in-txn fenced-count + neutrality assert.
6. RETURN for PK aural/licence review.

**IN this lane:** steps 1–6 (source + fenced intake package, RETURNED). **FUTURE separate gates:** PK aural/scoped-approval gate → upload-to-live + fence-flip → `m.music_suitability` scoped rows → `select_music()` build → dark `video-worker` integration.

### Intake mechanics (MIRROR the logo-intake apply, `ndis_logo_intake_apply.sql`)

- **Storage byte-size precheck** per object, in a `DO $$ ... RAISE EXCEPTION ... $$` that rolls back if the object is missing or the size differs (mirror `:7-10`). NOTE: for music the object lives in bucket `post-music` (not `brand-assets`); the precheck queries `storage.objects WHERE bucket_id='post-music' AND name=<storage_path> AND (metadata->>'size')::bigint = <bytes>`. *(This precheck presumes the object was uploaded to `post-music` — see the upload-timing open question; if PK wants upload deferred until after aural review, the precheck runs at the apply gate, not now.)*
- **sha256 in the row**; **`WHERE NOT EXISTS`** idempotency keyed on `track_key` (mirror `:14-15`).
- **In-txn fenced-count verify**: assert exactly N inserted tracks all have `is_active=false` AND `approved=false` AND `approval_status='intake_candidate'` AND `production_use_allowed=false`, else `RAISE EXCEPTION` (mirror `:180-184`).
- **Production-neutrality assertion** (the music analogue of the logo lane's zero-governed-logo check, `:186-190`): assert **zero** `m.music_track` rows are selectable — i.e. count of rows with `is_active=true` OR `approved=true` OR `approval_status='approved_scoped'` OR `production_use_allowed=true` is **0** after this DML. NOTHING becomes selectable.

## Forbidden actions

- Do NOT approve, scope-approve, promote, fence-flip, or mark-proven any track.
- Do NOT upload any track to a live-selectable state; do NOT set any of the four fences true.
- Do NOT run the fenced-intake SQL against production yourself — apply is a **PK hard-stop pinned to the file's sha256** (CLAUDE.md deploy/migrate gate).
- Do NOT author or apply any DDL / new migration; the schema is already live. Do NOT create/repurpose any bucket (the `post-music` bucket is already live).
- Do NOT build or wire `select_music()` (its own later migration).
- Do NOT modify `video-worker` or any worker; do NOT enable/change `VIDEO_WORKER_MUSIC_ENABLED` (`supabase/functions/video-worker/index.ts:274`).
- Do NOT wire Creatomate or any render path to music.
- Do NOT include any attribution-required licence class (CC BY / CC BY-SA) or any track whose commercial/social/no-attribution rights are unknown; do NOT source AI-generated or paid-stock music in v0.
- Do NOT treat any NULL safety/licence boolean as permission — fail-closed.
- Do NOT populate `c.client_music_profile` or `m.music_suitability` scoped rows in this lane (those belong to scoped approval, a future gate).
- **Re-verify HEAD/branch and the live schema before any apply step** — the migration is applied but `local main ahead of origin, NOT pushed`; shared-worktree race + local-HEAD-authoritative rules apply. Prefer an isolated worktree (CCF-02 R4; one harness sub-root per run).
- **Standing DO NOT START items** (`docs/00_action_list.md:169`): HeyGen · broad dashboard IA overhaul · B0/B1 — none are in scope here.

## Success criteria

- **N (5–10) licence-clean instrumental candidates** sourced to `_harness/music_harvester_v0/`, each with: `sha256` + `bytes` + `mime` + `duration_seconds`; captured licence evidence + `license_snapshot_hash`; a suggested balanced mood spread (~1–2 per mood across calm/corporate/uplifting/warm/neutral — decision #8).
- **Every candidate carries all six licence booleans set EXPLICITLY**, with `attribution_required=false` on every intaken track, and any UNKNOWN-rights or UNKNOWN-content_id track marked INELIGIBLE (fail-closed) in the manifest.
- **A harvest manifest** mapping each track to CHECK-valid live-column values.
- **A fenced-intake SQL package** that: INSERTs into `m.music_track` + `m.music_license` (all four fences false); mirrors the logo-intake byte-precheck + sha256 + `WHERE NOT EXISTS`; includes an in-txn fenced-count assert AND a production-neutrality assert (zero selectable tracks after the DML); is IDEMPOTENT.
- Every material claim in the returned package is cited; nothing invented; every unknown is an open question or a fail-closed exclusion.
- **Nothing approved / promoted / fence-flipped / made selectable; `VIDEO_WORKER_MUSIC_ENABLED` untouched; no worker/RPC/Creatomate change.**

## Stop condition

Return the manifest + candidates + fenced-intake SQL package for **PK aural/licence review**, per the result template, then STOP. Do not proceed to any approval, live upload, fence-flip, apply-against-production, `select_music()` build, or worker change without a fresh, named PK gate.

## Tier + lane label (CCF-02)

**Recommended tier: T2** for the lane as a whole. Rationale: the sourcing + manifest + human review is T1-shaped (read/write confined to a harness sub-root, no production touch), but the deliverable is a **fenced dark-intake SQL package** that INSERTs into live production tables (`m.music_track`/`m.music_license`) — DML ≥ T2 (CLAUDE.md §3). Because it is **additive, fully-fenced, pool-neutral, INSERT-only, no DDL, no GRANT/REVOKE, no upsert** (the same shape as the proven logo/background dark-intake lanes at v5.32/v5.24), it does NOT reach T3 on its own; the **actual apply is a separate PK hard-stop** (deploy/migrate gate) with `db-rls-auditor` + `branch-warden` + external review pinned to the package hash, and per-apply guards (byte-verify + sha256 + in-txn neutrality assert) never waived. **If PK elects to also upload the objects to the live `post-music` bucket within this lane** (see open question), that storage write is still additive/fenced but should be named at Gate 1 so the tier is set with eyes open.

**Recommended lane label: PRODUCT_PROOF** — this first harvest proves the schema + review process end-to-end for a genuine product capability (music beds on brand videos). *(SIDE_PROVING is a defensible alternative if PK frames it primarily as proving the review workflow rather than delivering the starter pool.)*

---

## Open questions for PK (Gate 1)

1. **Upload timing** — upload objects to the live public `post-music` bucket WITHIN this lane (so the byte-size precheck runs at intake, mirroring the logo lane), or defer upload until after PK aural review (listen-before-upload; the intake SQL + precheck run only at a later apply gate)?
2. **Track selection** — PK hand-picks the 5–10 from a returned candidate short-list (harvest wide, PK selects), or the executor curates a 5–10 within the stated constraints (executor curates, PK ratifies at the aural gate)?
3. **content_id_safe posture** — accept a source-level assertion of YouTube/Content-ID safety for Pixabay/CC0, or default every track to `content_id_safe`=UNKNOWN (fail-closed, not YouTube-eligible) until independently confirmed?
4. **Lane label** — PRODUCT_PROOF (recommended) vs SIDE_PROVING.
5. **Intake review-event rows** — write `m.music_review_event(event_kind='intake')` rows in the intake package, or defer all review-event rows to the aural gate? (minor)

## Notes

- This is the **first code/DB-shaped brief** drafted under the brief-author scoped-promotion note — the DML mechanics (fenced-count assert, the audio production-neutrality assert = zero selectable tracks, the bucket-specific `post-music` precheck) are the load-bearing part and warrant candidate-level scrutiny.
- Live DB/deploy/git truth was **not** verified by the brief author — the applied-schema and "local main ahead of origin, not pushed" state are orchestrator-asserted; handoffs to `db-rls-auditor` (verify schema live before intake), `branch-warden` (HEAD/parity before any apply), and `register-reconciler` (confirm the applied-vs-unpushed marker is normal mid-flight) are named.
