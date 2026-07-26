# Gate Packet — Video Breadth Phase 2B · PP Candidacy Write-Set (DESIGN, HELD) — v3 (S3)

**Created:** 2026-07-25 Sydney · **Revised:** 2026-07-26 Sydney · **Author:** S3 · **Status:** DESIGN packet v3 — FROZEN, **no DB write**. Stops at the 2B T3 DB-write gate.
**Supersedes:** v2 `93ce8310…` (reviewed by the 2B chain, hash-pinned external review `2ad2f061`). **v3 fixes ONE concrete defect found at the v2 T3 apply attempt (2026-07-26):** the load-bearing winner-guard checked `alternatives[] @> {"provider_template_id":"03bc6a3c…"}`, but `public.select_template` builds `alternatives[]` elements **without** `provider_template_id` (only `template_id` / `provider_template_name` / `variant_key` / `rank_reasons` — source `20260703035154_create_select_template_v1.sql` L391-395; only `selected` carries `provider_template_id`, L369). The v2 guard was therefore structurally guaranteed to fail-closed **even though the breadth outcome was correct** (`c11bb8ab` won, `03bc6a3c` was the ranked alternative). **v3 keys the guard on the internal `template_id` (`nid`, already derived in the assertion)** and corrects the §5 proof annotation to the true alternatives shape. **No column value, no row, no rung changes** — this is a harness-predicate-only fix, narrower than the v1→v2 delta. The v2 apply attempt **rolled back cleanly under the single-call atomicity harness — ZERO production change** (verified live: `03bc6a3c` absent, PP winner still `c11bb8ab`, `alternatives=0`).
**Earlier v2 basis (unchanged):** applied the `apply-harness-auditor` (shadow) findings AHA-05-1 (single-call atomicity), AHA-07-1 (rollback identity inline), AHA-03-1 (executable `count(*)=1` template STOP), AHA-06-1 (untouched-claim narrowed); `db-rls-auditor` PASS / no must-fix on write-set content (schema/constraint/FK/unique/RLS conform; winner-unchanged confirmed live); `evidence_kind` aligned to the `local_render_file` exemplar.
**Base (ground-truthed):** origin/main == `5488e85` (authoritative; local HEAD `8e3e9d6` = origin + 1 commit = the v2 packet's OWN immutable-ref commit `93ce8310`). Design-only; no git mutation.
**PK ruling:** Phase 2B target = **Property Pulse** (not NDIS) — a genuine SECOND governed candidate on the PP `video_short_stat` path. PK accepts the live-selection implication.
**Predecessors:** 2A acceptance `f53d7836…` · numeric audio `7bf00b27…` · Stage-2 packet `1db3718f…`.

> **HELD.** Exact write-set + selector proof + rollback for the T3 apply gate. Nothing is applied. No DB write, no publication, no production draft, no queue mutation, no client-wide enablement.

---

## 0. Object under change

- **New governed template (PK-created duplicate, 2A-passed):** `03bc6a3c-985a-4488-b008-67632372783c` — "Stat Reveal 9×16 — Governed AV v2". **It has NO ICE registry row yet** — 2B must REGISTER it, then climb the candidacy rungs. (This differs from the earlier edit-in-place assumption; duplicate-first means a fresh registration.)
- **Existing proven candidate (must NOT be touched):** `c11bb8ab` (internal `a3d8472d-9438-4312-9f11-b6a920be4014`), created 2026-07-09, `visually_approved`, PP-assigned, 2 passed proofs.

---

## 1. Safety analysis — why this is safe on the ENABLED PP path

PP `video_short_stat` is already `enabled=true`. Making `03bc6a3c` a PP candidate means production *could* select it. Three grounded facts make it safe:

**S1 — `c11bb8ab` remains the deterministic winner (proven from the selector source).** `select_template` scans candidates `ORDER BY t.created_at ASC, t.id ASC` (migration `20260703035154` L183), buckets `intent_strong || intent_other || strong || other` (L336), and takes `winner = v_ranked->0` (L353); the tiebreak reason is literally `registry_order_tiebreak` (L390). Production calls `select_template(slug, NULL, 'video_short_stat', **NULL**, seed)` (D6-8 — `variant_intent=NULL`, verified in worker), so there is **no intent bucket**; both candidates are `strong` and ranked by `created_at ASC`. `c11bb8ab` (2026-07-09) precedes a freshly-registered `03bc6a3c` (`now()`) → **`c11bb8ab` wins; `03bc6a3c` is the top alternative.** Breadth is proven by a non-empty `alternatives[]` **without changing which template PP renders.**
  - *Guard:* `03bc6a3c` gets a **distinct** `variant_key` (`stat-reveal-9x16-governed-av-v2`), so it can never collide with or shadow `c11bb8ab`'s `stat-reveal-9x16-video-v2`.

**S2 — `03bc6a3c` is production-safe IF it ever wins (Logo resolves).** `resolve_slot_assets` is **template-dependent**: it reads `c.creative_provider_template_field` for the template (L138-140). A template with no field rows resolves `status=ok` but **empty modifications** (verified live: `c6dcaa2d` → `{}`) — which would pass the selector's R6 (`status='ok'`) but then **throw `tmr_video_slot_resolution_incomplete: missing Logo.source`** in `buildGovernedVideoStatPlan` if it were the winner. **To close this, 2B registers `03bc6a3c` WITH a `Logo` field** (mirroring `c11bb8ab`'s `field_kind='logo'` row), so `resolve_slot_assets §7` fills `Logo.source` from PP's governed brand assets (`pp_logo_primary`). Verified live that this is how PP's logo resolves for `c11bb8ab`.

**S3 — audio needs no field rows.** VoiceAudio/MusicBed are supplied by the WORKER (`generateAndUploadVoice` + `select_music`), not by `resolve_slot_assets` (which handles only Background/Logo/image slots). `c11bb8ab` has no audio field rows; neither will `03bc6a3c`. The 2A render already proved the audio elements bind.

**Two honest quality caveats (documented; they do NOT manifest while `c11bb8ab` wins):**
- **C1 — background.** `03bc6a3c`'s `Background` is a baked **shape** (not a governed dynamic image field). 2B registers **no** Background field, so `resolve_slot_assets` offers no `Background.source` and the builder sends none → `03bc6a3c` renders its baked background. If `03bc6a3c` were ever promoted to winner, it would render **without** a client governed background (unlike `c11bb8ab`, which shows e.g. `bg_pp_new_build_construction_site`). Acceptable for a breadth proof where `c11bb8ab` is the winner; flagged for any future winner-promotion.
- **C2 — resolution.** `03bc6a3c` is 720×1280; `c11bb8ab` renders 1080×1920. A quality difference, only relevant if `03bc6a3c` ever wins.

---

## 2. The exact write-set — ONE INDIVISIBLE TRANSACTION (register + 5 rungs + fail-closed assertion)

> **⚠ APPLY AS A SINGLE `execute_sql` CALL (AHA-05-1).** The `BEGIN` … CTE write-set … `DO $$` assertion … `COMMIT` below is ONE contiguous SQL string and **MUST be submitted in one `execute_sql` invocation** — never split across calls. If `BEGIN`/inserts and the assertion/`COMMIT` land on different pooled backend sessions, the registration could auto-commit before a failing winner-guard can roll it back (the cc-0079 Slice-2 pooled-call non-composition class). `apply_migration` is agent-deny-listed → apply via `execute_sql` under PK authorisation. The `DO` block re-derives the new id by the UNIQUE `provider_template_id` (confirmed unique + collision-free by `db-rls-auditor`), so no manual `<NID>` paste is needed anywhere.

```sql
BEGIN;
-- R0. Register the new provider template (status visually_approved — 2A proof exists)
WITH ins_t AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, scope, client_id, family_id,
     width, height, aspect_ratio, output_type, duration_seconds, status,
     inventory_status, inventory_source, captured_by,
     needs_governed_background, image_slot_min, image_slot_max)
  VALUES
    ('creatomate','03bc6a3c-985a-4488-b008-67632372783c','Stat Reveal 9×16 — Governed AV v2',
     'generic', NULL, '0688284e-6b96-4e34-a5be-e915ff1e024c',   -- generic.stat_hero_card (from source c6dcaa2d)
     720, 1280, '9:16', 'video', 12, 'visually_approved',
     'captured_from_manual_entry',
     'Route A governed-AV duplicate of c6dcaa2d (03bc6a3c): added dynamic Logo+VoiceAudio+MusicBed, removed CategoryBadge+BrandName, extended 8s→12s. Phase-2A PK visual+audible PASS + numeric audio (mean −26.6 dBFS / −24.2 LUFS) on render a8559ec9 (sha256 443361da…).',
     'S3 breadth 2B (Route A governed AV v2)',
     false, 0, 0)
  RETURNING id
),
-- R6-enabler. Logo field so resolve_slot_assets fills Logo.source (production-safe if ever selected)
ins_f AS (
  INSERT INTO c.creative_provider_template_field
    (template_id, element_name, field_kind, dynamic, required_for_render, style_summary)
  SELECT id, 'Logo', 'logo', true, true,
    'Governed brand logo — the governed visual slot (background baked as shape; no governed dynamic bg field, C1).'
  FROM ins_t RETURNING template_id
),
-- R1. Variant candidate (DISTINCT variant_key; mapping_complete proven by 2A)
ins_vc AS (
  INSERT INTO c.creative_template_variant_candidate
    (template_id, format_key, variant_key, fit_status, fit_reason,
     required_field_mapping_status, missing_fields, reviewed_by, reviewed_at)
  SELECT id, 'video_short_stat', 'stat-reveal-9x16-governed-av-v2', 'strong_candidate',
    'Route A governed-AV template; governed keys (Logo/VoiceAudio/MusicBed + 4 text) bind — proven at 2A.',
    'mapping_complete', NULL, 'PK', now()
  FROM ins_t RETURNING template_id
),
-- R3. Platform suitability (parity with c11bb8ab; only enforced for non-null platform)
ins_ps AS (
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  SELECT id, p, 'feed', 'candidate',
    'Route A governed-AV v2 9x16; visual+audio approved 2A, platform-unproven.'
  FROM ins_t, unnest(ARRAY['facebook','instagram','linkedin']) AS p
  RETURNING template_id
),
-- R4. Client assignment — Property Pulse
ins_a AS (
  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at, style_guide_reference)
  SELECT id, '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'client_allowed', 'visually_approved', 'PK', now(),
    'Phase 2A PK acceptance (creatomate-video-breadth-2a-pk-acceptance-v1.md); render a8559ec9'
  FROM ins_t RETURNING id AS assignment_id, template_id
)
-- R5. Passed visual_approval proof (evidence = the 2A accepted render)
INSERT INTO c.creative_template_proof_event
  (template_id, assignment_id, proof_type, proof_status, evidence_kind, evidence_reference, recorded_by, occurred_at)
SELECT a.template_id, a.assignment_id, 'visual_approval', 'passed', 'local_render_file',
  'Controlled direct Creatomate render a8559ec9-7921-4881-ac9d-095c36534882 of 03bc6a3c with governed PP logo (pp_logo_primary) + governed PP voice YCxeyFA0G7yTk6Wuv2oq + governed bed; PK visual+audible PASS 2026-07-25; numeric audio mean −26.6 dBFS / integrated −24.2 LUFS, no clipping (443361da…). Voice defect v1 (NDIS) corrected to PP in v2.',
  'PK (breadth 2A acceptance 2026-07-25)', now()
FROM ins_a a;

-- ── In-txn fail-closed assertion (AHA-03 executable count=1 template STOP; rolls back on any mismatch) ──
DO $$
DECLARE nid uuid; c_tmpl int; c_field int; c_vc int; c_ps int; c_asg int; c_proof int;
        c11_vc int; sel jsonb;
BEGIN
  -- (AHA-03) exactly-1-template STOP, executable; also self-verifies the id derivation
  SELECT count(*) INTO c_tmpl FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c';
  IF c_tmpl <> 1 THEN RAISE EXCEPTION 'BREADTH_2B_TEMPLATE_COUNT_FAIL c_tmpl=%', c_tmpl; END IF;
  SELECT id INTO nid FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c';
  SELECT count(*) INTO c_field FROM c.creative_provider_template_field WHERE template_id=nid AND element_name='Logo';
  SELECT count(*) INTO c_vc    FROM c.creative_template_variant_candidate WHERE template_id=nid AND format_key='video_short_stat';
  SELECT count(*) INTO c_ps    FROM c.creative_template_platform_suitability WHERE template_id=nid;
  SELECT count(*) INTO c_asg   FROM c.creative_template_client_assignment WHERE template_id=nid AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  SELECT count(*) INTO c_proof FROM c.creative_template_proof_event WHERE template_id=nid AND proof_type='visual_approval' AND proof_status='passed';
  -- (AHA-06) narrowed claim: c11bb8ab's PRIOR video_short_stat candidacy is intact (exactly its one variant_candidate row).
  --  This is a candidacy-scope invariant, NOT a full byte-baseline; it is sufficient because the write-set references
  --  c11bb8ab in ZERO statements (verifiable in §2), so nothing above can mutate any c11bb8ab attribute.
  SELECT count(*) INTO c11_vc FROM c.creative_template_variant_candidate v
    JOIN c.creative_provider_template t ON t.id=v.template_id
    WHERE t.provider_template_id='c11bb8ab-18bd-45ff-aedd-0a59cb3773ab' AND v.format_key='video_short_stat';
  IF nid IS NULL OR c_field<>1 OR c_vc<>1 OR c_ps<>3 OR c_asg<>1 OR c_proof<>1 OR c11_vc<>1 THEN
    RAISE EXCEPTION 'BREADTH_2B_ASSERT_FAIL nid=% field=% vc=% ps=% asg=% proof=% c11_vc=%',
      nid, c_field, c_vc, c_ps, c_asg, c_proof, c11_vc;
  END IF;
  -- LOAD-BEARING winner-unchanged guard: selector must still pick c11bb8ab, with 03bc6a3c as an alternative.
  -- NOTE (v3 fix): select_template builds alternatives[] with the INTERNAL template_id (+ provider_template_name/
  -- variant_key/rank_reasons), NOT provider_template_id (which appears only on `selected`). We therefore assert
  -- 03bc6a3c's presence in alternatives by its internal id `nid` (derived above), never by provider_template_id.
  sel := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'assert_seed');
  IF (sel->'selected'->>'provider_template_id') <> 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab'
     OR NOT (sel->'alternatives') @> jsonb_build_array(jsonb_build_object('template_id', to_jsonb(nid))) THEN
    RAISE EXCEPTION 'BREADTH_2B_WINNER_GUARD_FAIL selected=% alts=%', sel->'selected'->>'provider_template_id', sel->'alternatives';
  END IF;
END $$;
COMMIT;
```

The **winner-guard is the load-bearing safety assertion**: it aborts the whole (single-call) transaction if `03bc6a3c` would displace `c11bb8ab` as PP's production winner. Because the assertion lives inside the same `BEGIN…COMMIT`, a raise rolls back the registration too — **only** when submitted as one `execute_sql` call (the §2 mandate).

---

## 4. Before / after candidacy rows (video_short_stat, PP)

| | BEFORE (live now) | AFTER (2B applied) |
|---|---|---|
| `video_short_stat` candidates | **1** — `c11bb8ab` | **2** — `c11bb8ab`, `03bc6a3c` |
| `03bc6a3c` registry row | none | 1 (`visually_approved`, generic, video, 12s) |
| `03bc6a3c` Logo field | none | 1 (`field_kind='logo'`) |
| `select_template(PP,NULL,video_short_stat)` → `selected` | `c11bb8ab`, `alternatives=[]` | `c11bb8ab`, **`alternatives=[03bc6a3c]`** |
| PP production winner | `c11bb8ab` | **`c11bb8ab` (unchanged)** |

---

## 5. Selector proof (read-only, post-apply — the breadth demonstration)

```sql
-- P1. Breadth + winner-unchanged (platform NULL — the production shape)
SELECT jsonb_pretty(public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'breadth_proof'));
--   expect: status=ok; selected.provider_template_id = c11bb8ab; alternatives=[{ template_id:<03bc6a3c's internal id>,
--           provider_template_name:'Stat Reveal 9×16 — Governed AV v2', variant_key:'stat-reveal-9x16-governed-av-v2',
--           rank_reasons:[fit_strong_candidate, registry_order_tiebreak] }]
--   NOTE: alternatives[] carry the INTERNAL template_id + provider_template_name, NOT provider_template_id
--         (only `selected` exposes provider_template_id). Identify 03bc6a3c in alternatives by variant_key or its internal id.
-- P2. Platform-scoped (facebook) — suitability rung exercised
SELECT jsonb_pretty(public.select_template('property-pulse', 'facebook', 'video_short_stat', NULL, 'breadth_proof_fb'));
-- P3. 03bc6a3c resolves cleanly (production-safe-if-selected): Logo.source present
SELECT public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat',
        (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c'),
        'rsa_proof')->'modifications';
--   expect: {"Logo.source": "…/PP_logo_2.png"}   (no Background.source — C1)
-- P4. Deterministic-fallback floor intact (a no-candidate format still fails closed)
SELECT public.select_template('property-pulse', NULL, 'video_short_kinetic', NULL, 'floor')->>'status';  -- expect fail_closed
```

**Breadth is claimed only if P1 shows `alternatives` naming `03bc6a3c` AND `selected` is still `c11bb8ab`.** No content is created or published by any probe — `select_template`/`resolve_slot_assets` are read-only, service-role, and produce no draft/render.

---

## 6. Complete rollback (restores the prior candidate set exactly)

Because 2B CREATED `03bc6a3c`'s registration (it had none before), full deletion restores the exact prior state ( `c11bb8ab` sole candidate ). Validated **before** apply; recorded in the ledger `rollback` column. **Single `execute_sql` call.**

> **⚠ Identity derived INLINE in EVERY delete (AHA-07-1).** No `<NID>` paste anywhere — every child DELETE resolves `template_id` via a subquery on the UNIQUE `provider_template_id='03bc6a3c…'`, so the id can **never** resolve to `c11bb8ab` (`a3d8472d…`). This makes "never touches `c11bb8ab`" mechanical, not paste-dependent.

```sql
BEGIN;
DELETE FROM c.creative_template_proof_event
  WHERE template_id = (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c')
    AND proof_type='visual_approval';
DELETE FROM c.creative_template_client_assignment
  WHERE template_id = (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c')
    AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
DELETE FROM c.creative_template_platform_suitability
  WHERE template_id = (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c');
DELETE FROM c.creative_template_variant_candidate
  WHERE template_id = (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c')
    AND format_key='video_short_stat';
DELETE FROM c.creative_provider_template_field
  WHERE template_id = (SELECT id FROM c.creative_provider_template WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c');
-- parent LAST (children gone); double-guarded by the same provider_template_id
DELETE FROM c.creative_provider_template
  WHERE provider_template_id='03bc6a3c-985a-4488-b008-67632372783c';
-- verify: select_template(PP,NULL,video_short_stat) → alternatives=[] and selected=c11bb8ab
COMMIT;
```
Child-before-parent FK order preserved. `c11bb8ab` (`a3d8472d…`) is unreachable by any subquery here — it cannot match `provider_template_id='03bc6a3c…'`.

---

## 7. Fences enforced (PK's list — each mechanically honoured)

- **Template ID pinned** to `03bc6a3c-985a-4488-b008-67632372783c` throughout. ✓
- **No publication / no production draft / no queue mutation** — the write-set touches only 5 `c.creative_*` governance tables + the template registry; nothing in `m.*` (drafts/queues/renders). ✓
- **No client-wide video enablement** — `c.client_creative_governance` is **not** touched (PP `video_short_stat` was already enabled; 2B adds a candidate, not an enablement). ✓
- **No replacement/deletion of the proven candidate** — `c11bb8ab` appears in **zero** write/delete statements; the in-txn assertion + winner-guard verify it untouched and still the winner. ✓
- **Deterministic selector call showing the ranked set** — §5 P1/P2. ✓
- **Exact before/after candidacy rows** — §4. ✓
- **Complete rollback restoring the prior candidate set** — §6. ✓

---

## 8. Review chain (T3) — outcomes to date + remaining gates

Ran on this packet (v1 `cba1e9a9…` unless noted):
- **`apply-harness-auditor` (SHADOW):** CONCERNS — 4 findings, all resolved in v2: AHA-05-1 (single-call atomicity → §2 mandate), AHA-07-1 (rollback identity inline → §6), AHA-03-1 (executable `count(*)=1` template STOP → §2 assertion), AHA-06-1 (untouched-claim narrowed → §2 comment). It **confirmed** the modifying-CTE semantics are correct (no execution gotcha). *Shadow — clears no gate.*
- **`db-rls-auditor`:** **PASS / no must-fix.** Every column/type/NOT-NULL/CHECK literal/FK/unique conforms live; `03bc6a3c` not yet registered; RLS/exposure clean; **winner-unchanged confirmed against live truth** (c11bb8ab wins, 03bc6a3c becomes the alternative). Non-blocking note applied: `evidence_kind` aligned to the `local_render_file` exemplar. `required_field_mapping_status` is DB-unvalidated (informational only).
- **External review (v1):** `partial` / medium / high-confidence, **auto-escalated to PK** (review_id `c37c9532`, pinned `cba1e9a9`). Triage: **policy_decision** (touching PP's production winner is a PK judgment call) + **missing_evidence** (winner-guard/Logo sufficiency — since **closed** by db-rls-auditor's live confirmation). No concrete defect.
- **External review (v2):** `partial` → PK (review_id `2ad2f061`, pinned `93ce8310`); verified the atomicity + inline-rollback fixes landed; policy_decision only, no concrete defect flagged. **The v2 apply then fail-closed on the winner-guard predicate bug — a `concrete_defect` the chain missed because it verified the *winner* (correct) but not the guard's exact `@>` key.** Recorded live: `03bc6a3c` never persisted, PP winner unchanged.
- **v3 delta:** guard keyed on internal `template_id` (§2) + §5 P1 annotation corrected. Harness-predicate only; no column/row/rung change. **The v2 external review is STALE (hash rule 4) → re-run pinned to the v3 hash before apply.**

**Remaining gates (PK's to open):** `db-rls-auditor` (re-confirm harness-only, guard predicate sound) → `apply-harness-auditor` (SHADOW, re-audit) → external re-review pinned to the **v3** hash → `branch-warden` at the gate (⚠ shared-worktree staged index carries the pending v6.28 docs commit — the post-apply register pointer must be committed with an EXPLICIT PATHSPEC, never a bare `git commit`) → **rollback validated before apply** → explicit **fresh** PK apply gate. Apply as **one `execute_sql` call** under PK authorisation. Post-apply: run §5 probes; if P1 fails the winner-unchanged expectation → immediate rollback (§6). The policy_decision (live PP candidate on an enabled path) is inherently PK's to accept — which PK already did in ruling PP over NDIS.

## 9. Stop condition

Design packet frozen. **Stop — no DB write.** Return path + sha256. Execution is the 2B T3 DB-write gate, PK's to open; no DB-write/mutation authority is conveyed here. Governed breadth is claimed only after apply + a passing §5 P1 proof.
