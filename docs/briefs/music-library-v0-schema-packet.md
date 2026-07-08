---
status: gate1_approved_docs_only
owner: PK
lane: planning / docs-only design packet
production_state: no_commit_to_build
supabase_writes: none
github_writes: doc_only
created: 2026-07-08
pk_gate1_approved: 2026-07-09
reviewed_input_hash: 797719f4e6f397d347064d7ad095edb16e60a63e770b63272f6c8f21ce98bd0f
review_chain: brief-author DRAFT_READY · db-rls-auditor clean · security-auditor clean/GREEN-with-conditions · external partial→PK policy-decision (accepted, not a schema defect)
supersedes: none (reconciles-later with docs/briefs/music-architecture-v0.1-draft.md)
related:
  - docs/briefs/music-architecture-v0.1-draft.md (prior paid-AI-gen music draft — sharing/reuse design reused, sourcing model discarded)
  - docs/briefs/creative-asset-intake-registry-v0-discovery-metadata-model.md (proven governed asset-registry pattern, music out of its v0 scope but 'designed to extend')
  - _harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql (live fenced-intake shape: 4 fences + sha256 + storage precheck + in-txn verify)
  - supabase/functions/video-worker/index.ts (current env-gated hardcoded music path, v3.0.0)
---

# Music Library v0 — Shared Harvest-Free Schema (design packet)

## ⚠️ STANDING FLAG — nothing is applied in this lane

This is a **docs-only design packet**. It designs a schema and its governance/selection layers and is returned as a reviewable artifact. **Nothing is built, applied, harvested, uploaded, or wired.** Each downstream stage (first harvest, schema apply, worker integration, flag enable) requires **its own gate** per ICE governance (mirrors the STANDING FLAG discipline of `docs/briefs/music-architecture-v0.1-draft.md:20-34`).

**This packet explicitly does NOT:** harvest any track · upload any file · author or apply any DDL/migration · modify `video-worker` · enable `VIDEO_WORKER_MUSIC_ENABLED` (default-off gate at `supabase/functions/video-worker/index.ts:274`) · wire Creatomate · create or repurpose any bucket · approve/promote any track · touch DB/network/git.

---

## 0. PK Gate-1 decision (2026-07-09) — APPROVED docs/register only

PK approved this packet at Gate 1 for **docs/register only** (design of record). The external review's `partial→escalate` verdict is **accepted as a PK policy-decision item, not a schema defect** — no fix-and-re-review loop runs unless a concrete defect appears. The four open decisions are now **FINALIZED** (these resolve §11 items 3, 5, 6, 8):

1. **Namespace — DECIDED:** `m.*` for the shared music tables (`music_track`/`_license`/`_track_tag`/`_suitability`/`_usage_event`/`_review_event`); `c.client_music_profile` for per-client preferences.
2. **Bucket — DECIDED: PUBLIC for v0.** ⚠ **Correction carried:** `post-music` does **not** exist live (§2a) — the future apply lane must **CREATE** it, recorded as **net-new infrastructure at the apply gate** (not a reuse). **Private + signed-URL is DEFERRED to a later hardening lane** (its own gate).
3. **Audio metadata — DECIDED: human-recorded** `loudness_lufs` / `bpm` / `text_overlay_safe` in v0. Automated audio QA is a future improvement, **not a blocker**.
4. **Facets — DECIDED:** typed CHECK columns on `m.music_track` **plus** the `m.music_track_tag` table (the §3.3 hybrid).

**Non-rigid future order (PK — indicative, may change):** (1) commit/register this packet → (2) author the actual migration + rollback → (3) review the migration → (4) PK apply gate → (5) create bucket + schema → (6) manual starter harvest → (7) fenced music intake → (8) aural/licence review → (9) approval → (10) later `select_music()` + video-worker **dark** integration.

**Hard boundaries reaffirmed for this commit and until the next explicit PK gate:** no harvesting · no uploads · no DDL apply · no bucket creation yet · no `video-worker` change · no `select_music()` implementation yet · no `VIDEO_WORKER_MUSIC_ENABLED` change · no Creatomate/music render. This Gate-1 approval authorises **only** the docs/register commit — nothing schema, storage, or runtime.

---

## 1. Task

Design the schema + governance + selection layers for a **globally shared, royalty-free, harvest-free music library** so brand videos can later carry background music. PK's governing premise: **music is fundamentally SHARED** — one royalty-free track legitimately serves all clients, all platforms, all videos — unlike the per-client image/logo registry (`c.client_brand_asset` is client-keyed; see `_harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql:11-15`). This packet designs that shared library and defers **all** harvesting until PK approves the schema.

## 2. Relationship to prior work

- **`docs/briefs/music-architecture-v0.1-draft.md` (prior draft) — REUSE the sharing/selection/reuse design, DISCARD the sourcing model.** REUSED: the global-vs-client scope split (that draft already introduced a `scope in ('global_starter','client')` and a null-`client_id` global pool — `music-architecture-v0.1-draft.md:268-276,157`); the per-client × per-platform × 90-day reuse window with cross-client-allowed + same-day-cross-client dedup (`music-architecture-v0.1-draft.md:143-149,401`); the append-only usage log and licence-snapshot-hash idea (`music-architecture-v0.1-draft.md:300-310,288-289`). DISCARDED: its entire **paid AI-generation 'Vibe Pool'** sourcing model (Mubert/ElevenLabs/Stable Audio generation, topup CRON, generation-log — `music-architecture-v0.1-draft.md:139-166,331-341`) and its 6-table generation-centric schema. **SUPERSEDED-LATER, not now:** paid/AI-generated music reconciles into THIS base later as a `source` variant column value (PK direction #3), **not** as a separate system.
- **The live env-gated 9-MP3 path (`supabase/functions/video-worker/index.ts`) — ADOPT the bucket name + path convention, do NOT touch the code.** Today music is a hardcoded `MUSIC_LIBRARY` const → `post-music/<vibe>/track-N.mp3` (`video-worker/index.ts:248-264`), picked at random by `resolveMusicUrl(format)` (`:273-283`), mapped by `VIBE_FOR_FORMAT` (`:266-271`), gated off by default via `VIDEO_WORKER_MUSIC_ENABLED !== 'true'` (`:274`). This packet **adopts the `post-music` bucket name** (PK direction #4) and designs a future `select_music()` RPC that will *later* replace the hardcoded pick — but authors **no worker edit** in this lane (see §12). **⚠ Live-truth correction (see §2a): the `post-music` bucket does NOT currently exist** — so "reuse" is inaccurate; the first apply gate CREATES it net-new. The hardcoded legacy path already points at this non-existent bucket.
- **The image/logo registry (`creative-asset-intake-registry-v0...` + live `c.client_brand_asset`) — MIRROR the governance discipline, DIVERGE on keying.** MIRRORED: fail-closed everywhere, scoped approval (never global 'approved'), append-only review + usage events, service-role-only / RLS-deny-all / read-RPC posture, source≠rights≠approval≠suitability (`creative-asset-intake-registry-v0-discovery-metadata-model.md:124-132,86-93,58-65`); the four live fences `is_active=false` + `asset_meta.approved=false` + `approval_status='intake_candidate'` + `production_use_allowed=false` (`ndis_logo_intake_apply.sql:14,182-183`); sha256-of-bytes + storage byte-size precheck + in-txn verify + `WHERE NOT EXISTS` idempotency (`ndis_logo_intake_apply.sql:7-10,14,15,177-196`). DIVERGED (PK direction #6): the image registry is **client-keyed** (`client_id` is part of every row — `ndis_logo_intake_apply.sql:12`); the music **track** table is **GLOBAL** (no `client_id`). Client/platform/format scoping lives in the suitability + profile + usage layers, not on the track.

## 2a. Live-truth corrections (db-rls-auditor review, 2026-07-08 — read-only, verdict `clean`)

The DB/RLS auditor verified the packet's live-DB premises. Corrections and confirmations that bind the future apply gates:

- **`post-music` bucket does NOT exist live** (`storage.buckets` holds only `brand-assets`, `post-images`; zero objects under `bucket_id='post-music'`). PK direction #4 said "reuse the existing bucket" — live-truth says it is a **net-new create**. Consequences: (a) there is **no** collision with any pre-existing `post-music/<vibe>/track-N.mp3` demo objects — they do not exist (the §11.3 concern is moot); (b) the first apply gate must **create** the bucket and decide **public vs private** (+ `storage.objects` RLS if private); (c) the legacy env-gated `video-worker` `MUSIC_LIBRARY` path currently points at a bucket that isn't there — a latent legacy-path fact flagged for the video-worker owner, out of this packet's scope.
- **Genuine first create CONFIRMED against the live catalog** (not just repo grep): zero `m.music_*` tables, zero `c.client_music_profile`, zero `public.select_music`, no relation `ILIKE '%music%'`; schemas `m` and `c` both exist; `m.select_property_v1` and `m.post_render_log` exist (confirming the §3 `m.*` namespace rationale). The §10 "empty tables, no rollback data risk" claim is true.
- **RPC convention mirror is faithful:** both live `public.select_template` and `public.resolve_slot_assets` are `RETURNS jsonb`, `STABLE`, `SECURITY DEFINER`, `proconfig search_path=''`, with EXECUTE = `service_role` only (anon/authenticated/PUBLIC all false). `select_music()` (§5) must replicate this exactly.
- **`m.*` is genuinely unexposed** to anon/authenticated (no schema `USAGE`), so routing reads through `public.select_music()` is the correct PGRST106-avoidance pattern.
- **`c.client` PK column = `client_id`** (confirms §3.7 FK and the standing "resolve by client_id not id" lesson).

## 3. Schema proposal (design — NO DDL authored)

> **Namespace choice: `m.*` for the global track/library/suitability/usage/review tables; `c.*` for `client_music_profile`.** Rationale: the prior music draft already placed the pool/usage/log tables under `m.*` (`music-architecture-v0.1-draft.md:244,268,301,313,331`), and `m.*` is the existing schema for render/publish/selection machinery (e.g. `m.select_property_v1`, `m.post_render_log` referenced across the repo). Per-client **preference** rows belong under `c.*` alongside `c.client_brand_profile` / `c.client_brand_asset` (`ndis_logo_intake_apply.sql:193`), consistent with the image registry's own namespace reasoning (`creative-asset-intake-registry-v0-discovery-metadata-model.md:118`). This is a **recommendation**, flagged for the schema-apply gate; the alternative (all under `c.*` like the image registry) is a live open decision — see §11.

**Fail-closed convention applies to every table below:** any NULL safety/licence boolean is treated as NOT allowed; unknown `content_id_safe` ⇒ not YouTube-eligible; `attribution_required=true` ⇒ excluded in v0 (PK directions #1, #7). Types/constraints below are a **design proposal**, not authored DDL.

### 3.1 `m.music_track` — GLOBAL shared track (no client_id; the 4 fences)
| column | type | notes |
|---|---|---|
| `track_id` | uuid PK | |
| `track_key` | text UNIQUE NOT NULL | stable slug, e.g. `calm_corporate_neutral_001`; mirrors `asset_key` uniqueness (`ndis_logo_intake_apply.sql:15`) |
| `title` | text | |
| `source` | text NOT NULL, CHECK ∈ §4 `source` vocab | v0 = `manual_harvest`; `paid_generated`/`ai_generated` reserved for the later reconcile (PK #3) |
| `storage_bucket` | text NOT NULL DEFAULT `'post-music'` | reuse existing bucket (PK #4) |
| `storage_path` | text NOT NULL | `post-music/global/<mood>/<track_key>.mp3` (PK #4) |
| `sha256` | text NOT NULL | byte hash of the file (provenance; mirrors `ndis_logo_intake_apply.sql:14`) |
| `mime` | text | e.g. `audio/mpeg` |
| `bytes` | bigint | for the storage byte-size precheck (mirrors `ndis_logo_intake_apply.sql:8`) |
| `duration_seconds` | numeric | |
| `loudness_lufs` | numeric NULL | how measured = open decision §11 |
| `bpm` | numeric NULL | |
| `mood` | text CHECK ∈ §4 `mood` | typed facet column (low-cardinality) |
| `energy` | text CHECK ∈ §4 `energy` | |
| `tempo_band` | text CHECK ∈ §4 `tempo_band` | |
| `genre` | text CHECK ∈ §4 `genre` | |
| `vocals` | text NOT NULL CHECK ∈ §4 `vocals` | v0 target = `instrumental_only` (PK #8) |
| `text_overlay_safe` | boolean | human-judged in v0 (§11) |
| `approval_status` | text NOT NULL DEFAULT `'intake_candidate'` CHECK ∈ §4 | fence 1 (mirrors `ndis_logo_intake_apply.sql:14`) |
| `approved` | boolean NOT NULL DEFAULT false | fence 2 |
| `production_use_allowed` | boolean NOT NULL DEFAULT false | fence 3 |
| `is_active` | boolean NOT NULL DEFAULT false | fence 4 |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | |

### 3.2 `m.music_license` — 1:1 rights record, fail-closed booleans
| column | type | notes |
|---|---|---|
| `track_id` | uuid PK, FK → `m.music_track` | 1:1 (highest-risk bucket gets its own record — mirrors `creative-asset-intake-registry-v0...md:57`) |
| `license_type` | text NOT NULL CHECK ∈ §4 | e.g. `cc0`, `public_domain`, `royalty_free_no_attrib` |
| `license_name` | text | |
| `source_url` | text NOT NULL | provenance |
| `license_snapshot_hash` | text NOT NULL | hash of the captured licence text (mirrors `music-architecture-v0.1-draft.md:288`) |
| `license_snapshot_path` | text | stored licence-text artifact path |
| `commercial_use_allowed` | boolean | fail-closed: NULL ⇒ NOT allowed |
| `social_use_allowed` | boolean | fail-closed |
| `modification_allowed` | boolean | fail-closed |
| `paid_ads_allowed` | boolean | fail-closed |
| `attribution_required` | boolean | v0: true ⇒ track EXCLUDED (PK #1) |
| `content_id_safe` | boolean | fail-closed: NULL/unknown ⇒ NOT YouTube-eligible (PK #7) |
| `expiry_date` | date NULL | past ⇒ not usable (mirrors image registry `:62`) |
| `created_at` | timestamptz | |

### 3.3 Selection facets — typed columns (on 3.1) + a tag table for open-ended labels
- Low-cardinality, single-value facets live as **typed CHECK columns on `m.music_track`** (mood/energy/tempo_band/genre/vocals) — cheap to filter in `select_music()`.
- Open-ended / multi-value labels live in **`m.music_track_tag`** (`track_id` FK, `tag` text, PK(`track_id`,`tag`)) — mirrors the image registry's 'many facets, multi-row, additive' rule (`creative-asset-intake-registry-v0...md:68-72`). Columns-vs-table split is itself an open decision (§11).

### 3.4 `m.music_suitability` — scoped (platform/format/vertical/client), never global
| column | type | notes |
|---|---|---|
| `suitability_id` | uuid PK | |
| `track_id` | uuid FK → `m.music_track` | |
| `scope_kind` | text NOT NULL CHECK ∈ (`platform`,`format`,`vertical`,`client`) | one dimension per row (mirrors the four suitability dimensions, `creative-asset-intake-registry-v0...md:76-82`) |
| `scope_value` | text NOT NULL | e.g. `youtube` / `video_short_stat` / `real_estate` / client-slug — **soft reference, no hard FK** to client/template |
| `fit_status` | text NOT NULL CHECK ∈ §4 | `unknown`/`candidate`/`suitable`/`not_suitable`/`needs_review`/`blocked` |
| `reason` | text | |
| `created_at` | timestamptz | |

### 3.5 `m.music_usage_event` — append-only usage log (powers cooldown)
`usage_id` uuid PK · `track_id` uuid FK · `client_id` uuid (soft ref) · `platform` text · `format` text · `draft_id` uuid · `render_id` uuid · `used_at` timestamptz. Immutable; append-only (mirrors `creative-asset-intake-registry-v0...md:129` and `music-architecture-v0.1-draft.md:301-310`).

### 3.6 `m.music_review_event` — append-only review/approval log
`review_id` uuid PK · `track_id` uuid FK · `event_kind` text CHECK ∈ §4 (`intake`,`aural_review`,`scoped_approval`,`restriction`,`rejection`,`revocation`) · `scope_kind`/`scope_value` (the approval is scoped) · `prior_status` / `new_status` text · `actor` text · `reason` text · `occurred_at` timestamptz. Approval is **recorded, never inferred** (mirrors image registry `:93,129`).

### 3.7 `c.client_music_profile` — per-client preferences (only client-keyed table)
`client_id` uuid PK, FK → `c.client(client_id)` (note: resolve clients by `client_id`, not `id` — standing lesson) · `music_enabled` boolean DEFAULT false · `preferred_moods` text[] · `banned_moods` text[] · `allow_vocals` boolean DEFAULT false · `default_bed_volume` text (e.g. `'15%'`, matching current behaviour, `video-worker/index.ts` music-bed) · `created_at`/`updated_at`. Preferences only — **never** the source of a global track.

## 4. Governed vocabularies (CHECK / lookup) — proposed values + fail-closed defaults
- **`source`:** `manual_harvest` (v0 default) · `paid_generated` · `ai_generated` (last two reserved for later reconcile, PK #3). Unknown ⇒ reject.
- **`license_type`:** `cc0` · `public_domain` · `royalty_free_no_attrib`. **Excluded in v0:** any attribution-required class (`cc_by`, `cc_by_sa`) — mirrors the image lane's CC-BY exclusion (PK #1). Unknown ⇒ not usable.
- **`mood`:** `calm` · `corporate` · `uplifting` · `warm` · `neutral` (PK #8 starter set). Extendable by migration.
- **`energy`:** `low` · `medium` · `high`. Default filter target v0 = low/medium.
- **`tempo_band`:** `slow` · `mid` · `up`.
- **`genre`:** `ambient` · `corporate` · `acoustic` · `electronic` · `orchestral` · `other`.
- **`vocals`:** `instrumental_only` (v0 target) · `has_vocals` (excluded v0). NULL ⇒ treated as unsafe ⇒ excluded.
- **`approval_status`:** `intake_candidate` (default/fenced) · `aural_reviewed` · `approved_scoped` · `restricted` · `rejected` · `archived`. Default `intake_candidate` = fenced.
- **`fit_status`:** `unknown` (default) · `candidate` · `suitable` · `not_suitable` · `needs_review` · `blocked`.
- **`review_event.event_kind`:** `intake` · `aural_review` · `scoped_approval` · `restriction` · `rejection` · `revocation`.
- **`usage scope` (suitability `scope_kind`):** `platform` · `format` · `vertical` · `client`.

**Fail-closed default across all vocabularies: an unknown/unmapped value is a rejection, not a pass.**

## 5. Selection RPC contract — `select_music(...)` (design; mirrors house `select_*`/`resolve_*`)

**Signature (mirrors `public.select_template(...)` at `supabase/migrations/20260703035154_create_select_template_v1.sql:81-92` and `public.resolve_slot_assets(...)` at `20260703002813_create_resolve_slot_assets_v1.sql:48-59`):**
```
public.select_music(
  p_client_slug   text,
  p_platform      text,
  p_format        text,
  p_vertical      text  DEFAULT NULL,
  p_duration_need numeric DEFAULT NULL,
  p_seed          text  DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
```
(`STABLE SECURITY DEFINER SET search_path=''` is the mandatory house shape — `select_template` `:90-92`, `resolve_slot_assets` `:57-59`; `SET search_path=''` also satisfies the standing SECURITY-DEFINER gotcha in CLAUDE.md.)

**Filter/rank logic (fail-closed at each step):**
1. Candidate set = `m.music_track` WHERE all four fences green (`is_active` · `approved` · `production_use_allowed` true; `approval_status='approved_scoped'`).
2. Licence-clean join to `m.music_license`: `commercial_use_allowed` AND `social_use_allowed` true; `attribution_required` false (v0); `expiry_date` null-or-future; if `p_platform='youtube'` then `content_id_safe` true (NULL ⇒ dropped, PK #7).
3. Platform/format/vertical fit via `m.music_suitability` — the requested scope values must not be `not_suitable`/`blocked`; `suitable`/`candidate` pass.
4. Client preference via `c.client_music_profile`: `music_enabled` true; mood ∈ `preferred_moods` (if set) and ∉ `banned_moods`; `allow_vocals` respected.
5. Cooldown (see §7): exclude tracks used for this `(client, platform)` inside the window; same-day cross-client dedup.
6. Rank the survivors deterministically (seed-stable, mirroring `select_template`'s ranked-buckets + `p_seed` approach, `select_template.sql:104-111`); return a `selected` winner + `alternatives` + `rejected`+`warnings` arrays (same jsonb envelope shape as the house RPCs).

**Fail-closed behaviour:** empty survivor set ⇒ return the house fail-closed envelope — align to the live shape `{ status:'fail_closed', selected:null, fail_reason:'...', alternatives:[], rejected:[...], warnings:[...], context:{...} }` (the deployed `select_template` envelope, per db-rls-auditor) rather than a bespoke `{reason}` key, so all house selectors read uniformly — the caller renders **no music** (identical to today's `resolveMusicUrl` returning `null`, `video-worker/index.ts:276-280`). `select_music()` NEVER invents a track or relaxes a fence.

> **RPC implementation note (db-rls-auditor — for the future `select_music()` apply gate, NOT this docs lane):** the fail-closed licence semantics must be written with explicit three-valued-logic guards. A bare `WHERE commercial_use_allowed` already drops NULL (fail-closed, good), but an exclusion like `WHERE NOT attribution_required` would let NULL rows THROUGH. Exclusions must be `attribution_required IS FALSE` (or `COALESCE(attribution_required,true)=false`), and `content_id_safe` must be `IS TRUE` for the YouTube path. This is an implementation obligation carried to the RPC gate; the packet's stated intent is correct.

## 6. Review / approval flow (fenced-until-approved; scoped, never global)
- **Intake (fenced):** a harvested track enters as `approval_status='intake_candidate'`, all four fences false — exactly the live logo shape (`ndis_logo_intake_apply.sql:14,182-183`). A `music_review_event(event_kind='intake')` row is written.
- **Aural review:** a human listens; `event_kind='aural_review'` recorded → `approval_status='aural_reviewed'`. Analogue of the image lane's `visual_review` (`creative-asset-intake-registry-v0...md:93`).
- **Scoped approval:** approval is **never global** — it names a `(platform, format, vertical, client)` scope via `m.music_suitability` rows + a `music_review_event(event_kind='scoped_approval', scope_kind, scope_value)` (mirrors `creative-asset-intake-registry-v0...md:88`). Only then do the four fences flip true **for that scope's selection path**.
- **Transitions:** `intake_candidate → aural_reviewed → approved_scoped`; side exits `restricted` / `rejected` / `archived` (terminal). Every transition is an append-only `music_review_event` row; status is never inferred.

## 7. Usage / cooldown model
- **Window:** per-client × per-platform cooldown (default 90 days, adopting the prior draft's recommended rule, `music-architecture-v0.1-draft.md:149,401`) — a client does not get the same track twice on the same platform inside the window.
- **Cross-client:** allowed (the whole point of a shared library) **except** a **same-day cross-client dedup** guard so two clients don't post the identical bed the same day (`music-architecture-v0.1-draft.md:149`).
- **Mechanism:** `m.music_usage_event` is the source of truth; `select_music()` step 5 reads it (`used_at`, `client_id`, `platform`) to compute exclusions. Populating it is a runtime step at render time (future lane), not this packet.

## 8. Licensing evidence model
Every track carries, in `m.music_license`: `source_url`, `license_snapshot_hash` (+ stored snapshot path), and the **six required booleans** `commercial_use_allowed` · `social_use_allowed` · `modification_allowed` · `paid_ads_allowed` · `attribution_required` · `content_id_safe` (PK #7); plus `sha256`-of-bytes on `m.music_track` (byte provenance, mirroring `ndis_logo_intake_apply.sql:14`). **Fail-closed rules:** (a) any NULL boolean ⇒ NOT allowed; (b) `content_id_safe` NULL/unknown ⇒ track is NOT YouTube-eligible; (c) `attribution_required=true` ⇒ EXCLUDED in v0 (no render-time attribution mechanism exists — PK #1, mirroring the image lane's CC-BY exclusion, `creative-asset-intake-registry-v0...md:64`); (d) `expiry_date` past ⇒ not usable.

## 9. Migration / apply plan (PLAN ONLY — no DDL authored or applied here)
- **File naming (house discipline: migration name = permanent identity, CLAUDE.md standing gotcha):** a single timestamped migration, e.g. `<ts>_create_music_library_v0.sql`, plus a separate later `<ts>_create_select_music_v1.sql` for the RPC (matching the split used for `create_select_template_v1` / `create_resolve_slot_assets_v1`). A revision gets a NEW number+name, never the same name with different SQL.
- **Ordering:** (1) `m.music_track` → (2) `m.music_license` (FK) → (3) `m.music_track_tag` (FK) → (4) `m.music_suitability` (FK) → (5) `m.music_usage_event` (FK) → (6) `m.music_review_event` (FK) → (7) `c.client_music_profile` → (8) grants/REVOKE/RLS → (9, later gate) `select_music()` RPC.
- **Posture (mirror TMR/asset registry):** service-role-only writes; `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with **deny-all** (no permissive policy); `REVOKE ALL ... FROM public, anon, authenticated` on every table (standing gotcha: revoking from PUBLIC alone is insufficient — also anon/authenticated, CLAUDE.md). Reads/selection **only via SECURITY DEFINER RPCs** — do NOT expose `m.*` over REST (avoids PGRST106 on an unexposed schema, CLAUDE.md; route reads through `select_music()` / a read RPC on an exposed schema, exactly as `select_template`/`resolve_slot_assets` are `public.*`).
- **Ships dark:** the migration adds **empty tables and an unused RPC** — no worker reads them, `VIDEO_WORKER_MUSIC_ENABLED` stays off, behaviour is unchanged (mirrors the 'ships dark: no production consumer' framing at `20260703035154_create_select_template_v1.sql:76`).
- **Bucket create (db-rls-auditor correction):** because `post-music` does not exist live (§2a), the first apply gate ALSO creates the bucket net-new and decides **public vs private** (+ `storage.objects` RLS if private). This is NOT a "reuse" — it is a fresh storage resource whose visibility is a PK/product call at that gate.
- **RPC EXECUTE grant (db-rls-auditor — for the later `select_music()` gate):** the RPC migration must `REVOKE EXECUTE ... FROM public, anon, authenticated` and `GRANT EXECUTE ... TO service_role` — mirroring the verified live grant matrix of `select_template`/`resolve_slot_assets` (anon/authenticated/PUBLIC=false, service_role=true). §9's "reads only via SECURITY DEFINER RPCs" implies but does not state this; it is named here so the RPC is not silently exposed.
- **First apply gate covers:** the 7 tables + grants/REVOKE/RLS + the net-new `post-music` bucket create (NOT the RPC, NOT any data, NOT any worker change). Apply is a PK hard-stop pinned to the file's sha256 (mirrors `20260703002813_create_resolve_slot_assets_v1.sql:41-42`). **No DDL is authored in this lane** — this is the plan for a future gated apply.
- **Auditors re-review the AUTHORED SQL (security-auditor SF-5):** this packet is DESIGN, not DDL. Both apply lanes (tables+bucket; RPC) require `db-rls-auditor` + `branch-warden` + external review of the **real authored migration SQL** before the PK apply — the design mirror being faithful does not certify the eventual SQL. RPC-lane classification: **T3 AMBER→GREEN** once the default-`EXECUTE TO PUBLIC` REVOKE (SF-1) and the three-valued-logic licence predicates (SF-2) are authored and proven with a negative test (a NULL-`attribution_required`/NULL-`content_id_safe` row must never survive into a YouTube set); verify the RPC grant post-apply via `SET ROLE`/`has_function_privilege`, not `role_table_grants`.

## 10. Rollback plan (for the future apply)
- **Dependency-safe DROP order (reverse of §9 create):** `select_music()` (if applied) → `c.client_music_profile` → `m.music_review_event` → `m.music_usage_event` → `m.music_suitability` → `m.music_track_tag` → `m.music_license` → `m.music_track`. Stated as **reference-only** in the migration header, never auto-executed (mirrors `20260703002813_...:45-46`, `20260703035154_...:78-79`).
- **No data risk:** v0 tables start **EMPTY** (confirmed: a repo-wide search found no existing `m.music_*` tables in `supabase/migrations/**`, so this is a genuine first create). Rollback drops empty structures; no rows, no storage objects, no worker state to unwind (env flag was never flipped).

## 11. Risks & open decisions (recommendations; PK decides)

> **RESOLVED at Gate 1 (§0, 2026-07-09):** item 3 (bucket → **public v0, net-new create**; private+signed-URL deferred), item 5 (loudness/bpm → **human-recorded v0**), item 6 (facets → **columns + tag table**), item 8 (namespace → **`m.*` + `c.client_music_profile`**), item 7 (text-overlay-safety → **human-judged v0**). Items 1–2 were fixed PK directions; item 4 (paid/AI-gen provenance cols) and item 9 (starter-pool harvest) remain future-gate items.
1. **Attribution-required deferral (PK #1, fixed):** v0 excludes attribution-required tracks. Recommendation: keep excluded until a render-time attribution mechanism exists; revisit as a named future lane. *(Constraint, not open — recorded for completeness.)*
2. **Music-harvester agent deferral (PK #2, fixed):** no harvester agent in v0; first harvest is manual to prove schema + review. Recommendation: keep manual; only consider an agent after the first manual batch proves the review process (parallels image-harvester's proving arc).
3. **Bucket (PK #4 = `post-music`; live-truth: net-new create, NOT reuse):** db-rls-auditor confirmed the `post-music` bucket does NOT exist live (§2a), so there are no demo objects to collide with, and the first apply gate must CREATE the bucket. **Live open decision: public vs private.** `brand-assets` and `post-images` are both public; a public `post-music` matches convention and the current `resolveMusicUrl` public-URL assumption, but private + signed-URL/RPC read is the more defensive posture. **security-auditor coupling (SF-3): the choice is NOT aesthetic** — `resolveMusicUrl` builds a `/storage/v1/object/public/` URL (`video-worker/index.ts:282`), so if PK elects **private**, the future `select_music()`/worker seam MUST return a signed URL (or RPC read) or the legacy path 404s were the flag ever flipped; a private bucket must be co-decided with the worker-seam design. For v0's CC0/public-domain/royalty-free-no-attribution scope, **public is acceptable** (the licence already permits redistribution; only library-composition is "leaked", no rights/PII surface). *(PK decision at the apply gate.)* Path prefix `post-music/global/<mood>/` stands regardless.

3a. **Provenance integrity — intake-time vs render-time (security-auditor SF-4):** `sha256` pins the bytes **at intake**, but `select_music()` reads DB rows, not object bytes — so a post-approval storage swap at the same path (same key, different bytes) would be selected/rendered **without re-verification**. This is the **same posture the live image/logo lanes already run** (they don't re-hash at render) — not a regression, but a genuine residual TOCTOU gap. Mitigations for the apply gate: (a) service-role-only `storage.objects` write policy on `post-music`; (b) a no-overwrite convention on `post-music/global/**`; (c) optional render-time sha256 re-verify (heavier, future). Recommend at minimum documenting "sha256 = intake provenance, not render-time integrity; storage writes are service-role-only." *(PK note; not a v0 blocker.)*
4. **Generate-vs-harvest reconciliation (PK #3):** paid/AI-gen later becomes a `source` value, not a new system. Open: whether generated tracks need extra provenance columns (e.g. provider/prompt) — recommend adding them in the later reconcile migration, not v0.
5. **How `loudness_lufs`/`bpm` get measured at intake:** manual measurement in v0? Recommend **manual/human-recorded** at intake for the 5–10 starter tracks; automated measurement is a future lane. *(PK call; columns are nullable so v0 can proceed without them.)*
6. **Facets: columns vs multi-row table:** low-cardinality typed columns on `m.music_track` (mood/energy/…) + `m.music_track_tag` for open-ended labels. Recommend this hybrid (matches the image registry's multi-row facet rationale, `creative-asset-intake-registry-v0...md:71`). *(PK confirm the split.)*
7. **LUFS / text-overlay-safety human-judged in v0:** `text_overlay_safe` and loudness are human calls in v0 (no automated audio QA). Recommend recording them as human-judged review evidence on `m.music_review_event`. *(PK confirm acceptable for v0.)*
8. **Namespace (`m.*` track tables + `c.*` profile):** recommended in §3; the all-`c.*` alternative (image-registry-consistent) is viable. *(PK decision at the schema-apply gate.)*
9. **Starter-pool target (PK #8, PLAN ONLY):** 5–10 tracks, instrumental, text-overlay-safe, moods calm/corporate/uplifting/warm/neutral, PP-video-first but globally reusable — **not harvested in this lane**; the actual harvest is a separate future gate.

## 12. How this later plugs into video-worker without changing behaviour yet
**The seam (design intent only — NO worker edit in this lane):**
- Today, `video-worker` chooses music by calling `resolveMusicUrl(fmt)` (`supabase/functions/video-worker/index.ts:704`), which random-picks from the hardcoded `MUSIC_LIBRARY` (`:281`) **only if** `VIDEO_WORKER_MUSIC_ENABLED==='true'` (`:274`).
- In a **future, separately-gated** lane, that single call site would be swapped to call `select_music(client, platform, format, ...)` (the RPC in §5), which returns a governed, licence-clean, cooldown-aware track URL instead of a random hardcoded one.
- **Behaviour is identical until that separate gate** because: (a) this packet authors **no** worker change; (b) `VIDEO_WORKER_MUSIC_ENABLED` **stays off** (`:274` unchanged), so both the old and any future path emit no music; (c) `select_music()` returns `null` on an empty/failed set — the same signal `resolveMusicUrl` already returns (`:276-280`) — so even with the flag on, an unpopulated governed library degrades to today's no-music behaviour. The swap is a one-call-site change guarded by its own future PK gate, tier T2/T3 depending on whether it ships with the flag flipped.

## 13. Success criteria (for this docs-only packet)
- The packet is persisted with every material claim cited to a repo path/line; no uncited fact.
- All 12 required sections present; all 8 PK direction constraints reflected (attribution-only-no-attrib · manual-first · free-base/paid-later-variant · `post-music` adopt/create · fenced governance · global-first no-client_id track table · six fail-closed licence booleans · starter-pool plan-only).
- Every unknown appears as an open decision or named handoff — nothing invented.
- Nothing applied/harvested/uploaded/wired; `VIDEO_WORKER_MUSIC_ENABLED` untouched.

## 14. Stop condition
Return the packet for PK gate-1 review. Do not proceed to any harvest, schema authoring, apply, or worker change without a fresh, named PK gate.

## 15. Forbidden actions (this and any lane derived from this packet)
- Do NOT harvest, download, or upload any music file.
- Do NOT author or apply any DDL/migration; do NOT create/repurpose any bucket.
- Do NOT modify `video-worker` or any worker; do NOT enable `VIDEO_WORKER_MUSIC_ENABLED`.
- Do NOT wire Creatomate or any render path to music.
- Do NOT approve, promote, or mark-proven any track.
- Do NOT include any attribution-required licence class in v0 (PK #1).
- Do NOT key `m.music_track` to `client_id` (PK #6 — global-first).
- Do NOT treat any NULL safety/licence boolean as permission (fail-closed).
- Standing DO-NOT-START items (`docs/00_action_list.md:169`): HeyGen · broad dashboard IA overhaul · B0/B1 — none are in scope here; do not drift into them.

---

*End of packet. Status: draft. Production state: no_commit_to_build. Next: PK gate-1 review of this design; nothing applied without its own gate.*
