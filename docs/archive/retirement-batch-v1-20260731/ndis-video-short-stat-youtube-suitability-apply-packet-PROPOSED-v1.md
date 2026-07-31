# ⚠ PROPOSED / NOT FROZEN / NOT PK-APPROVED — data-only apply packet draft (overnight session, no authority)

# NDIS `video_short_stat` → YouTube platform-suitability row (ONE-row data-only apply)

**Status:** PROPOSED — authored 2026-07-30 in an autonomous overnight session against repo HEAD
`09eae15` (branch `claude/creatomate-global-progress-r0vbuf`). Nothing here is approved, frozen,
hashed, scheduled, or applied. Every "expected" value below that is not statically provable from the
repo is a **verify-or-abort precondition** for PK to check live at the gate — none was read from the
live DB by this session (hard constraint: no `execute_sql`, no `db-read.py` in this container).
**Tier recommendation:** **T3** (see §8). **Lane class:** PRODUCT_PROOF.
**Apply channel (named):** the entire §5 script is executed as **ONE single `execute_sql` call**
containing the whole `BEGIN; … COMMIT;` text. The MCP SQL channel is pooled: `BEGIN`/`COMMIT` split
across separate calls do NOT compose into one transaction, so a multi-call apply is forbidden — the
single-call rule is the atomicity channel, and G0 additionally proves in-SQL that the script ran in
one transaction.
**Migration identity (assigned at freeze, never reused):** `202608XXXXXXXX_ndis_video_short_stat_youtube_suitability_v1.sql`
— number cut at freeze time per the standing rule (a revision gets a NEW number + name).

---

## 1. What this is, in one sentence

INSERT **exactly one row** into `c.creative_template_platform_suitability` —
`(template a3d8472d 'video_stat_reveal_9x16_v2', platform 'youtube', placement 'feed', status 'candidate')` —
which is, per the evidence chain in §2, the **single missing selector rung** standing between
NDIS Yarns `video_short_stat` on YouTube and a `select_template(...)='ok'` /
`classify_format_capability(...)='ready'` cell. No DDL, no GRANT/REVOKE, no code, no deploy,
no publish, no imagery, no fence/fit_status/assignment change.

## 2. Evidence chain — why ONE row (every claim cited)

1. **The S9 arc closed YouTube with 0% reachable formats and named the missing piece.**
   `docs/briefs/results/s9-youtube-containment-release-result-v1.md` (v6.85, commit `c892933`):
   PK ruling 2 — *"Do not describe YouTube as publishing-operational until Creatomate Global supplies
   at least one supported, selector-reachable format"* (§1, §10). The palette table (§7) shows NDIS
   `video_short_stat` on YouTube classifies `unsupported_silent_degrade` with underlying blocker
   **`no_selectable_template`** — a config gap, not a template/asset/governance gap.
2. **The classifier's own validation set pins the blocker.**
   `docs/briefs/shared-capability-contract-classifier-gate1-v1.md:71` — NDIS `video_short_stat` YT =
   `fail_closed` `no_selectable_template` / **`platform_unsuitable`**.
3. **`select_template` rung (c) is the rejecting filter.**
   `supabase/migrations/20260703035154_create_select_template_v1.sql:204-229` — with a non-NULL
   `p_platform`, a candidate with **zero** `c.creative_template_platform_suitability` rows for that
   platform is rejected `platform_unsuitable / no_suitability_row_for_platform`. A row in
   (`unknown`,`candidate`,`needs_review`) passes **with** the visible
   `platform_suitability_unproven` warning; only `not_suitable`/`blocked` reject.
4. **No `video_short_stat` candidate template has a YouTube suitability row — deliberately.**
   - `supabase/migrations/20260719010800_video_d6_lane2_register_pp_video_short_stat_mapping.sql:44-50`
     seeded a3d8472d suitability for **facebook/instagram/linkedin only** (placement `'feed'`,
     status `'candidate'`).
   - `docs/briefs/broll-parity-activation-v1-apply-packet.md:182` — *"all three templates lack a
     youtube suitability row, and that gate runs before `fit_status`."*
   - `docs/briefs/broll-suitability-fb-ig-v1-apply-packet.md:111,186` and
     `supabase/migrations/20260729071004_broll_suitability_fb_ig_v1.sql:59-65` — YouTube was
     **explicitly excluded** from the 2026-07-29 fb/ig suitability apply because *"Adding one would
     newly enable youtube video selection, and youtube-publisher is schedule-blind auto-publish.
     Requires an explicit separate PK decision"* — with guard G7 asserting YouTube stayed
     unselectable. **This packet is that explicit, separate PK decision, surfaced for the gate.**
5. **Every OTHER selector rung is already satisfied for NDIS on template a3d8472d** (statically, as
   of the cited applies; each is re-verified live in §4):
   - scope `generic`: `20260720040000_video_c11bb8ab_scope_client_to_generic_v1.sql`.
   - status ≥ `smoke_rendered` (`visually_approved`): `20260719010800…:22-24`.
   - NDIS assignment `visually_approved` + **passed** `visual_approval` proof:
     `20260720130000_video_c11bb8ab_bgfield_pp_reproof_ndis_assign_v1.sql:38-52` (in-txn
     postconditions asserted NDIS `select_template` = ok at `p_platform=NULL`).
   - assets resolve for NDIS (governed bg `bg_ny_morning_light_home` + `ny_logo_mark_only` + voice):
     same migration's postcondition block (lines 70-75) + PK visual+audio PASS render `233ab253`.
6. **The capability spine converts `ok` → `ready` → unblocked cell.**
   `20260729120000_classify_format_capability_v2_publisher_path.sql:135-151` — `select_template`
   returning `ok` short-circuits to `status='ready'` (the silent-degrade overlay only applies to
   fail-closed cells). `20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql:255-339` —
   the Layer-1 slot gate skips any non-`ready` cell; `ready` fills normally.
   `supabase/functions/youtube-publisher/index.ts:452,608` — the publisher excludes only
   `final_format_authority='blocked_by_capability'`.
7. **Live candidate set for `video_short_stat` (3 templates, statically reconstructed):**
   `dd5fd75e` B-roll (`strong_candidate`, fb+ig suitability only, PP-assigned only) ·
   `a3d8472d` incumbent (`candidate`, fb+ig+li suitability, **PP and NDIS assigned**) ·
   `4cd2c9e2` governed-AV v2 (`candidate`, PP-assigned) — per
   `20260729053002_broll_parity_activation_v1_video_short_stat_repoint.sql:162-206` and
   `20260728021934_broll_consumption_v1_slice_b_promote_register.sql:115-133`.
   **Only a3d8472d can win for NDIS** (the other two have no NDIS assignment), so the one row goes
   on a3d8472d, and after it, a3d8472d is the **only** YouTube-suitable candidate for either client.

## 3. Scope

- **One row. Data-only. No DDL.** Single `INSERT` into `c.creative_template_platform_suitability`
  (table DDL: `20260630042316_tmr3_template_metadata_registry.sql:102-117`; UNIQUE
  `(template_id, platform, placement)`; `suitability_status` CHECK vocabulary includes
  `'candidate'`; `platform` is unconstrained text — `'youtube'` is the platform string used
  system-wide).
- `'candidate'`, never `'platform_safe'`/`'production_proven'` — suitability claims must not launder
  into proof (`create_select_template_v1.sql:53-58`); the winner surfaces the
  `platform_suitability_unproven` warning until a real proof event exists.
- `placement='feed'` matches every existing suitability row on all three video templates (house
  precedent `20260719010800…:47-49`, `20260729071004…:107-113`). If PK prefers `'shorts'` for
  YouTube semantics, that is a gate-time style call — the selector never reads `placement`
  (`create_select_template_v1.sql:205-212`), only the unique key uses it.
- **Explicitly NOT in scope** (each its own gated lane): any `c.client_creative_governance` write
  (the NDIS video-enable row is a named PREREQUISITE, §4 P6 — not authored here) · any
  slot/draft/publish mutation · any render · any code/EF deploy · any change for
  `video_short_stat_voice` or any other format · any imagery sourcing (§9) · any
  `c.creative_template_selector_policy` row (cc-0089 table) · any second suitability row anywhere.

### 3.1 Named blast radius — the same row reaches Property Pulse (cannot be scoped away)

Suitability is keyed `(template_id, platform)` — there is **no client column**. The identical row
that makes NDIS selector-reachable also removes the `platform_unsuitable` rejection for
**property-pulse × youtube × video_short_stat** (PP holds its own `visually_approved` assignment +
passed proof on a3d8472d — `20260719010800…:52-71`). Modeled consequence: PP's YouTube
`video_short_stat` cell also flips to `ready`, un-skipping future PP YouTube stat slots into a
**schedule-blind auto-publish** publisher. This is exactly the surface the 2026-07-29 apply's G7
guard refused to open silently. **There is no data-only way to open NDIS without PP on this
template.** The packet therefore (a) pins the PP post-state as an in-txn assertion (§5 G7) so it can
never happen silently, and (b) requires PK to explicitly accept — or reject — the PP side effect at
the gate (§7 stop list). If PK wants NDIS-only, this packet must be abandoned in favour of a
different design (e.g. a separate NDIS-assigned template), which is out of scope here.

## 4. Verify-or-abort preconditions — PK runs these live at the gate (read-only)

Any deviation from an "expected" value → **abort the gate, re-cut the packet**. Do not approximate,
do not hand-reconcile. (R0 note: none of these are covered by an `ice_ro` view; they are `c.*`/RPC
reads → `execute_sql` R1 path at the gate, or `db-rls-auditor`.)

**P1 — candidate set is exactly the modeled trio.**
```sql
SELECT vc.template_id, vc.variant_key, vc.fit_status, t.scope, t.status
FROM c.creative_template_variant_candidate vc
JOIN c.creative_provider_template t ON t.id = vc.template_id
WHERE vc.format_key = 'video_short_stat'
ORDER BY vc.variant_key;
```
Expected: exactly 3 rows — `dd5fd75e…/stat-reveal-9x16-broll-v1/strong_candidate`,
`a3d8472d…/stat-reveal-9x16-video-v2/candidate`, `4cd2c9e2…/stat-reveal-9x16-governed-av-v2/candidate`;
a3d8472d `scope='generic'`, `status` ∈ (`visually_approved`,`platform_safe`,`client_enabled`,`production_proven`).

**P2 — suitability pre-state on the trio (freezes G1's counts).**
```sql
SELECT template_id, platform, placement, suitability_status
FROM c.creative_template_platform_suitability
WHERE template_id IN ('a3d8472d-9438-4312-9f11-b6a920be4014',
                      'dd5fd75e-982d-4c3d-89cd-7ce0936076b2',
                      '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958')
ORDER BY template_id, platform;
```
Expected: a3d8472d = exactly (facebook,feed) (instagram,feed) (linkedin,feed), none negative;
dd5fd75e = exactly (facebook,feed,candidate) (instagram,feed,candidate); **zero `youtube` rows on
all three**. 4cd2c9e2's exact non-youtube set is not statically pinned — record it verbatim; the
hard requirement is only its youtube count = 0.
Also record the table-wide check
`SELECT count(*) FROM c.creative_template_platform_suitability WHERE platform='youtube';` — repo
evidence disagrees with itself (cc-0073 §E found ONE youtube row on `generic_youtube_thumbnail_16x9_v1`,
format `youtube_thumbnail`; the 2026-07-29 broll packet says "no template" holds one). Either live
answer is compatible with this apply (that template is not a `video_short_stat` candidate); the
discrepancy is recorded, not resolved, here.

**P3 — NDIS assignment + proof on a3d8472d.**
```sql
SELECT a.id, a.assignment_status,
       (SELECT count(*) FROM c.creative_template_proof_event p
         WHERE p.assignment_id = a.id AND p.proof_type='visual_approval' AND p.proof_status='passed') AS passed_proofs
FROM c.creative_template_client_assignment a
WHERE a.template_id='a3d8472d-9438-4312-9f11-b6a920be4014'
  AND a.client_id ='fb98a472-ae4d-432d-8738-2273231c1ef4';
```
Expected: exactly 1 row, `assignment_status='visually_approved'` (or higher), `passed_proofs >= 1`.

**P4 — NDIS YouTube publish profile is the released v6.85 row.**
```sql
SELECT client_publish_profile_id, paused_until
FROM c.client_publish_profile
WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='youtube';
```
Expected: exactly 1 row, id `e2261899-7a02-4a48-a364-79544791424a`, `paused_until IS NULL`.
(If a pause has been re-applied since v6.85, the apply may still be valid but the proof plan is not
— surface to PK.)

**P5 — assets actually resolve for NDIS at the explicit `youtube` platform.** The selector's rung (f)
and the asset `platform_scope` filter (`resolve_slot_assets`, v1.5: rejects an asset whose non-NULL
`platform_scope` excludes the platform — `20260729225034…:404-405,500-501`) cannot be proven from
the repo for NDIS image backgrounds/logo.
```sql
SELECT public.resolve_slot_assets('ndis-yarns','youtube','video_short_stat',
       'a3d8472d-9438-4312-9f11-b6a920be4014', NULL);
```
Expected: `status='ok'` with `modifications.'Logo.source'` and `modifications.'Background.source'`
non-null. Anything else → the "one row" claim is false for NDIS → **abort** (the gap is then
assets/scope, a different lane).

**P6 — SEQUENCING PREREQUISITE: NDIS video governance row exists and is enabled.**
```sql
SELECT enabled FROM c.client_creative_governance
WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND format='video_short_stat';
```
Expected: exactly 1 row, `enabled=true`. **As of the latest repo evidence this row does NOT exist**
(`docs/briefs/creatomate-governed-video-production-gate1-packet-v1.md` §2.2: *"NDIS video is one
governed data row away from live"* — that row, a **different** one-row decision, its own gated
lane). Applying THIS packet while P6 fails would create a `ready` capability cell whose renders take
`video-worker`'s **legacy ungoverned fork** (`index.ts:1092` gate fails closed to legacy) — i.e. it
would re-open exactly the ungoverned-output class S9 closed. Therefore **P6 failing = hard hold**:
this packet waits behind the NDIS video-enable lane. Also enforced in-SQL (§5 G1c) so the apply
cannot run early even by mistake.

**P7 — format config + platform support + voice.**
```sql
SELECT is_enabled FROM c.client_format_config
WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND ice_format_key='video_short_stat';
SELECT platform_support->>'youtube' FROM c.content_format WHERE ice_format_key='video_short_stat';
SELECT count(*) FROM c.client_voice_config
WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4';
```
Expected: `true` · `'true'` · `>= 1` (governed voice `iamiUYVj7ixJcRZQkS8B` per
`20260720130000…` proof text; the governed AV plan fails loud without a voice).
*(Column/table names for the first two reads follow the register evidence — v6.82 palette table
"client cfg true / platform_support.youtube true" and `docs/00_session_state.md:197`'s
`c.client_format_config … ice_format_key` shape; verify the exact identifiers live before running.)*

**P8 — pre-state of both capability cells (baseline for §5 and for PK's blast-radius acceptance).**
```sql
SELECT public.classify_format_capability('ndis-yarns','youtube','video_short_stat');
SELECT public.classify_format_capability('property-pulse','youtube','video_short_stat');
SELECT public.resolve_slot_assets('property-pulse','youtube','video_short_stat',
       'a3d8472d-9438-4312-9f11-b6a920be4014', NULL);
```
Expected NDIS: `status='unsupported_silent_degrade'` with `blocker_fail_reason='no_selectable_template'`
(v6.85 §7) — or, if the 90-day publish window has rolled past the last 2026-05 publishes by gate
time, the underlying `governance_unproven`/`template_missing` mapping of the same blocker; record
the actual. **STOP if already `ready`** (state drifted; someone else opened it) or
`publisher_path_missing`. Expected PP: a non-`ready` status pre-apply, and `resolve_slot_assets` =
`ok` — which pins the §5 G7 modeled post-state (`ready`). If PP's resolve is NOT ok, G7's pinned
value is wrong → re-cut the packet with the observed value before freeze.

**P9 — demand snapshot (informs the proof plan, not the apply).**
```sql
SELECT count(*) FROM m.slot
WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='youtube'
  AND status='pending' AND scheduled_publish_at > now()
  AND format_preference[1] = 'video_short_stat';
```
Expected: 0 (v6.82 palette: no scheduled stat slots) — meaning the §10 natural-render proof will
need either the allocator's next YouTube cadence pick or a PK-authored slot (both pass the same
Layer-1 gate).

## 5. The apply — single-call, self-verifying, fail-closed (every STOP an executable RAISE)

```sql
BEGIN;

DO $$
DECLARE
  c_tid    CONSTANT uuid := 'a3d8472d-9438-4312-9f11-b6a920be4014';  -- video_stat_reveal_9x16_v2
  c_broll  CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_av2    CONSTANT uuid := '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958';
  c_ndis   CONSTANT uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
  -- PP production-signature winner is pinned BY UUID (= c_broll, the B-roll template, per the
  -- 2026-07-29 parity activation); PP youtube post-state pinned from P8 at the gate.
  c_expected_pp_post CONSTANT text := 'ready';  -- re-freeze if P8 disagrees

  v_n int;
  v_pre_yt int;
  v_gov int;
  v_before_pp_null jsonb; v_after_pp_null jsonb;
  v_before_nd_null jsonb; v_after_nd_null jsonb;
  v_nd jsonb; v_cap_nd jsonb; v_cap_pp jsonb;
BEGIN
  -- G0 — atomicity armed BEFORE any write (single-call channel proof).
  PERFORM set_config('ice.apply_txid', txid_current()::text, TRUE);
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard could not be armed — refusing to write';
  END IF;

  -- G1a — pre-state: ZERO youtube suitability rows across all three video_short_stat candidates.
  SELECT count(*) INTO v_pre_yt
  FROM c.creative_template_platform_suitability
  WHERE template_id IN (c_tid, c_broll, c_av2) AND platform = 'youtube';
  IF v_pre_yt <> 0 THEN
    RAISE EXCEPTION 'G1a FAILED: expected 0 pre-existing youtube suitability rows on the candidate trio, found % — state drifted, refusing to write', v_pre_yt;
  END IF;

  -- G1b — pre-state: a3d8472d holds exactly its 3 known rows (fb/ig/li, placement feed, none negative).
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id = c_tid;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'G1b FAILED: expected exactly 3 pre-existing suitability rows for a3d8472d, found % — refusing to write', v_n;
  END IF;
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id = c_tid
    AND (platform NOT IN ('facebook','instagram','linkedin')
         OR placement <> 'feed'
         OR suitability_status IN ('not_suitable','blocked'));
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'G1b FAILED: % a3d8472d suitability row(s) deviate from the frozen (fb|ig|li, feed, non-negative) pre-state — refusing to write', v_n;
  END IF;

  -- G1c — SEQUENCING GATE (P6 enforced in-SQL): NDIS video governance must already be enabled,
  -- otherwise a ready cell would route renders down the LEGACY ungoverned video-worker fork.
  SELECT count(*) INTO v_gov
  FROM c.client_creative_governance
  WHERE client_id = c_ndis AND format = 'video_short_stat' AND enabled = true;
  IF v_gov <> 1 THEN
    RAISE EXCEPTION 'G1c FAILED: NDIS (video_short_stat) c.client_creative_governance enabled row count = % (need exactly 1). This apply is SEQUENCED BEHIND the NDIS video-enable lane — refusing to write', v_gov;
  END IF;

  -- G2 — baselines captured BEFORE the write (cover every later invariance assertion).
  -- G2s — FULL-TABLE pre-apply baseline snapshot: every suitability row in the registry, no
  --       scope filter, so the G4s comparison covers EVERY scope (any platform, placement,
  --       status, template), not just the counted shapes.
  CREATE TEMP TABLE pre_suitability_snapshot ON COMMIT DROP AS
    SELECT template_id, platform, placement, suitability_status, reason
    FROM c.creative_template_platform_suitability;

  v_before_pp_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'ndis-yt-suitability-apply-probe');
  v_before_nd_null := public.select_template('ndis-yarns',     NULL, 'video_short_stat', NULL, 'ndis-yt-suitability-apply-probe');
  IF (v_before_pp_null->'selected'->>'template_id') IS DISTINCT FROM c_broll::text THEN
    RAISE EXCEPTION 'G2 FAILED: PP production-signature baseline winner is % (expected the B-roll template %) — model invalid, refusing to write',
      COALESCE(v_before_pp_null->'selected'->>'template_id','(none)'), c_broll;
  END IF;
  IF (v_before_nd_null->>'status') IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'G2 FAILED: NDIS production-signature baseline is % (expected ok) — model invalid, refusing to write',
      COALESCE(v_before_nd_null->>'status','(null)');
  END IF;

  -- ---- THE CHANGE (the packet's entire mutation surface: ONE row) -----------------------
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  VALUES
    (c_tid, 'youtube', 'feed', 'candidate',
     'NDIS video_short_stat YouTube enablement (this packet): first youtube suitability row on the video candidate set. candidate = passing-but-unproven; graduates only via a real proof event. Opens selector reachability for BOTH assigned clients (ndis-yarns, property-pulse) — PP side effect PK-accepted at this packet''s gate. S9 v6.85 carry: "YouTube is not publishing-operational until Creatomate Global supplies at least one supported, selector-reachable format."');
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- G3 — exactly one row written.
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'G3 FAILED: expected exactly 1 row inserted, got % — refusing to commit', v_n;
  END IF;

  -- G4 — post-state exact: a3d8472d now 4 rows; the youtube row is exactly as specified;
  --      the other two candidates gained NOTHING.
  SELECT count(*) INTO v_n FROM c.creative_template_platform_suitability WHERE template_id = c_tid;
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'G4 FAILED: expected exactly 4 suitability rows for a3d8472d post-insert, found % — refusing to commit', v_n;
  END IF;
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id = c_tid AND platform = 'youtube'
    AND placement = 'feed' AND suitability_status = 'candidate';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'G4 FAILED: the (youtube, feed, candidate) row is not exactly present post-insert (count=%) — refusing to commit', v_n;
  END IF;
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id IN (c_broll, c_av2) AND platform = 'youtube';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'G4 FAILED: % unexpected youtube suitability row(s) on dd5fd75e/4cd2c9e2 — refusing to commit', v_n;
  END IF;

  -- G4s — NON-REGRESSION vs the pre_suitability_snapshot baseline: the live table minus ONLY
  --       the one new row must be row-identical (symmetric difference = 0) to the snapshot.
  --       Proves no pre-existing suitability row anywhere was touched, on any column, any scope.
  SELECT count(*) INTO v_n FROM (
    (SELECT template_id, platform, placement, suitability_status, reason
       FROM c.creative_template_platform_suitability s
      WHERE NOT (s.template_id = c_tid AND s.platform = 'youtube')
     EXCEPT
     SELECT template_id, platform, placement, suitability_status, reason
       FROM pre_suitability_snapshot)
    UNION ALL
    (SELECT template_id, platform, placement, suitability_status, reason
       FROM pre_suitability_snapshot
     EXCEPT
     SELECT template_id, platform, placement, suitability_status, reason
       FROM c.creative_template_platform_suitability s
      WHERE NOT (s.template_id = c_tid AND s.platform = 'youtube'))
  ) diff;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'G4s FAILED: % pre-existing suitability row(s) differ from the pre-apply snapshot — refusing to commit', v_n;
  END IF;

  -- G5 — PRODUCTION-SIGNATURE INVARIANCE: video-worker calls with p_platform=NULL; the
  --      suitability gate is skipped there, so NULL-platform selection must be unchanged.
  v_after_pp_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'ndis-yt-suitability-apply-probe');
  v_after_nd_null := public.select_template('ndis-yarns',     NULL, 'video_short_stat', NULL, 'ndis-yt-suitability-apply-probe');
  IF (v_after_pp_null->'selected'->>'provider_template_name')
     IS DISTINCT FROM (v_before_pp_null->'selected'->>'provider_template_name')
     OR (v_after_nd_null->'selected'->>'template_id')
     IS DISTINCT FROM (v_before_nd_null->'selected'->>'template_id') THEN
    RAISE EXCEPTION 'G5 FAILED: a production-signature (p_platform=NULL) winner CHANGED — refusing to commit';
  END IF;

  -- G6 — INTENDED EFFECT: NDIS × youtube × video_short_stat is now selector-reachable AND ready.
  v_nd := public.select_template('ndis-yarns','youtube','video_short_stat',NULL,'ndis-yt-suitability-apply-probe');
  IF (v_nd->>'status') IS DISTINCT FROM 'ok'
     OR (v_nd->'selected'->>'template_id') IS DISTINCT FROM c_tid::text
     OR (v_nd#>>'{slot_resolution,modifications,Logo.source}') IS NULL THEN
    RAISE EXCEPTION 'G6 FAILED: NDIS youtube selection not ok/a3d8472d/logo-resolved: status=% winner=% — refusing to commit',
      COALESCE(v_nd->>'status','(null)'), COALESCE(v_nd->'selected'->>'template_id','(none)');
  END IF;
  v_cap_nd := public.classify_format_capability('ndis-yarns','youtube','video_short_stat');
  IF (v_cap_nd->>'status') IS DISTINCT FROM 'ready' THEN
    RAISE EXCEPTION 'G6 FAILED: NDIS youtube capability = % (expected ready) — refusing to commit',
      COALESCE(v_cap_nd->>'status','(null)');
  END IF;

  -- G7 — DISCLOSED SIDE EFFECT PINNED (never silent): the PP youtube cell must land exactly on
  --      the value PK accepted at the gate (pinned from P8). Any other value = model wrong = abort.
  v_cap_pp := public.classify_format_capability('property-pulse','youtube','video_short_stat');
  IF (v_cap_pp->>'status') IS DISTINCT FROM c_expected_pp_post THEN
    RAISE EXCEPTION 'G7 FAILED: PP youtube capability post-state = % but the gate accepted exactly "%" — refusing to commit',
      COALESCE(v_cap_pp->>'status','(null)'), c_expected_pp_post;
  END IF;

  -- G8 — NO LEAKAGE elsewhere: PP linkedin winner unchanged (still the incumbent a3d8472d,
  --      per broll-suitability-fb-ig G6), and G0 re-assert.
  IF (public.select_template('property-pulse','linkedin','video_short_stat',NULL,'ndis-yt-suitability-apply-probe')
      ->'selected'->>'template_id') IS DISTINCT FROM c_tid::text THEN
    RAISE EXCEPTION 'G8 FAILED: PP linkedin winner moved off the incumbent — refusing to commit';
  END IF;
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): transaction identity changed mid-apply — refusing to commit';
  END IF;

  RAISE NOTICE 'APPLY OK: 1 youtube suitability row on a3d8472d; NDIS yt=ok/ready; PP yt pinned=%; NULL-platform winners unchanged; li unchanged', c_expected_pp_post;
END $$;

COMMIT;
```

## 6. Rollback — written before apply, identity-matched to the insert

Deletes **exactly** the tuple §5 inserts (same unique key), fail-closed, same single-call channel:

```sql
BEGIN;

DO $$
DECLARE
  -- SAME pinned identity set as the apply (single source: §5's constants, restated verbatim).
  c_tid   CONSTANT uuid := 'a3d8472d-9438-4312-9f11-b6a920be4014';
  c_broll CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_av2   CONSTANT uuid := '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958';
  c_ndis  CONSTANT uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
  v_n int; v_nd jsonb;
BEGIN
  -- confinement-check: this rollback touches ONLY the suitability row. The apply's G1c
  -- prerequisite row (NDIS video governance) must be present-and-untouched before and after.
  SELECT count(*) INTO v_n
  FROM c.client_creative_governance
  WHERE client_id = c_ndis AND format = 'video_short_stat' AND enabled = true;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK HALT: NDIS video governance row count = % (expected 1) — state does not match the applied packet''s world; surface to PK instead of proceeding blind', v_n;
  END IF;

  DELETE FROM c.creative_template_platform_suitability
  WHERE template_id = c_tid
    AND platform = 'youtube' AND placement = 'feed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: expected exactly 1 row deleted, got % — aborting rollback txn', v_n;
  END IF;
  -- restore-check 1: the trio is back to the G1a pre-state — ZERO youtube suitability rows.
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id IN (c_tid, c_broll, c_av2) AND platform = 'youtube';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: % youtube suitability row(s) remain on the candidate trio — aborting rollback txn', v_n;
  END IF;
  -- restore-check 2: a3d8472d is back to its 3-row G1b pre-state.
  SELECT count(*) INTO v_n
  FROM c.creative_template_platform_suitability
  WHERE template_id = c_tid;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: a3d8472d suitability row count = % (expected the 3-row pre-state) — aborting rollback txn', v_n;
  END IF;
  -- restore-check 3: NDIS youtube must be fail_closed again (the pre-apply state).
  v_nd := public.select_template('ndis-yarns','youtube','video_short_stat',NULL,'ndis-yt-suitability-rollback-probe');
  IF (v_nd->>'status') IS DISTINCT FROM 'fail_closed' THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: NDIS youtube still % after delete — aborting rollback txn',
      COALESCE(v_nd->>'status','(null)');
  END IF;
END $$;

COMMIT;
```

**Honest residue (disclosed, not silently claimed reversible):** slots filled / drafts created /
posts published during any window in which the cell was `ready` are **not** retro-blocked by the
DELETE — capability stamps are written at slot-fill/publish time, not re-derived. The rollback
runbook therefore includes this read for PK:
```sql
SELECT s.slot_id, s.status, s.scheduled_publish_at
FROM m.slot s
WHERE s.client_id IN ('fb98a472-ae4d-432d-8738-2273231c1ef4','4036a6b5-b4a3-406e-998d-c2fe14a8bbdd')
  AND s.platform='youtube' AND s.created_at >= '<apply timestamp>';
```
Anything it returns is a PK triage item (hold/skip/let-run), not an automatic action.

## 7. STOP conditions

**Executable (each enforced by a named RAISE in §5/§6 — a tripped guard aborts the transaction with
nothing written):** G0/G0-post atomicity · G1a/G1b pre-state drift · G1c NDIS-governance sequencing ·
G2 baseline mismatch · G3 rowcount ≠ 1 · G4 post-state deviation · G5 production-signature movement ·
G6 intended effect absent · G7 PP side effect ≠ the gate-accepted value · G8 linkedin leakage ·
rollback rowcount ≠ 1 · rollback post-check not fail_closed.

**Procedural gate stops (orchestrator/PK-enforced at the gate, per Convention 2 — these cannot be
expressed in the apply SQL):** packet hash at apply ≠ the frozen `reviewed_input_hash` · unexpected
`origin/main` movement · any §4 precondition deviating from its expected value · any non-clean
`db-rls-auditor` / `branch-warden` / external-review verdict · PK has not explicitly accepted the §3.1
PP side effect in writing · the NDIS video-enable lane (P6) has not landed · rollback not
walked-through before apply.

## 8. Tier recommendation — T3

DML puts the floor at ≥ T2 (Convention 3). This packet exceeds the floor because it is
**publish-posture touching**: the one row flips capability cells that feed the Layer-1 slot gate and
sit upstream of `youtube-publisher`, a schedule-blind auto-publisher (~30-minute tick), on **two**
clients — the precise reason the 2026-07-29 lane declared "adding one is its own T3 gate with its
own review" (`broll-suitability-fb-ig-v1-apply-packet.md:186`). Recommended chain: full T3 —
`db-rls-auditor` (live truth of §4), `branch-warden`, external review pinned to the frozen packet
hash, rollback proven before apply, explicit PK gate (or a Convention-2 pinned sequence), and the
§10 verification step named in advance (`runtime_verification_required` is satisfied by naming it,
not by skipping it). Shadow `apply-harness-auditor` run recorded in §11 (advisory only; clears no
gate).

## 9. NDIS sensitive-imagery policy boundary (named, untouched)

This packet writes platform-suitability configuration only. It sources, approves, promotes, or
rotates **no imagery**; the NDIS backgrounds it makes reachable are the already-governed Phase-0
abstract pool (`bg_ny_*`, PK-approved 2026-07-20). The staged NDIS real-imagery policy
(`docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md`) is unaffected: no phase opens, no
specialist prerequisite is touched, no purpose-bound asset is involved.

## 10. Follow-on proof plan — SEPARATE gated step, explicitly NOT authorized by this packet

A future Gate-1 brief (its own lane, own tier, own PK gates) should prove the opened cell end-to-end:

1. **Natural fill:** the next NDIS YouTube slot whose format lands on `video_short_stat` (P9 says
   none is scheduled — either await the allocator's weekly YouTube cadence or PK authors a slot;
   both pass the same Layer-1 gate) fills without a capability skip; the slot's capability evidence
   records `ready`.
2. **Governed render:** `ai-worker` holds the format (the `video_short_stat`×youtube pin fires only
   for governance-enabled clients — P6 makes NDIS visible to it); `video-worker` takes the governed
   fork (`index.ts:1092`), renders a3d8472d with NDIS logo/background/voice; PK inspects the mp4
   (visual + audio, the only deciding act).
3. **Supervised publish:** PK observes the first `youtube-publisher` pick-up of the approved draft
   in a named window (auto-publish is ~30 min from generated+approved — the observation window must
   be planned, not discovered). Tripwires modeled on v6.85 §8: any NDIS YouTube publish in a format
   other than `video_short_stat` post-apply = the silent-degrade defect returned; any
   `video_short_avatar` publish = hard alarm.
4. **Suitability graduation:** only after a PK-passed platform proof does a separate lane consider
   `candidate` → `platform_safe` (with a real `proof_event`) — never this packet.
5. **PP's first YouTube stat publish** (side effect accepted at this gate) gets the same supervised
   observation on its first occurrence.

## 11. Shadow apply-harness-auditor record (CCF-04 §4 — advisory, clears no gate)

Run at authoring, BEFORE freeze, per the registered shadow-mode charter (PK 2026-07-25):

- **Run 1 (initial draft): `CONCERNS`, 8 findings.** Assessment by the invoking session:
  - `AHA-07-1` (apply/rollback identity — the check the contract says to watch first): **real.**
    The rollback pinned only the target template while the apply pinned the full trio + client.
    **Fixed** — the rollback now restates the apply's constant set verbatim and proves trio-wide
    restore (`restore-check 1/2`) plus scope confinement (governance row untouched).
  - `AHA-06-x` (uncovered assertion baselines): **substantively real.** The draft asserted
    post-state shapes against literals with no captured pre-image. **Fixed** — G2s now takes a
    full-table `CREATE TEMP TABLE pre_suitability_snapshot` baseline and G4s enforces a
    symmetric-difference-zero comparison against it (covers every scope, every column).
  - `AHA-01-1` (declared control "V1" unenforced): **false positive** — the token was the literal
    provider-template name `AU_generic_national_Suburb_9:16_V1` inside a SQL constant, not a
    declared control. Resolved as a side effect of a real improvement: winners are now pinned by
    template UUID (the already-declared constants) instead of name literals.
- **Run 2 (after snapshot + rollback hardening): `CONCERNS`, 6** (identity check clean; snapshot
  digest pattern not recognized by the parser) → reworked the baseline into the tool's named
  `CREATE TEMP TABLE … AS SELECT` construct, which is also the genuinely stronger harness.
- **Run 3 (final text of this file): `PASS`, 0 findings.**

Shadow mode: this PASS **clears no gate**; `db-rls-auditor`, `branch-warden`, external review, and
the PK apply gate all still run above it, unchanged.
