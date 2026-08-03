# Apply packet — P3: register + calibrate `video_stat_reveal_9x16_v2` and restore PP (Lane A, WS-5)

**Created:** 2026-08-03 Sydney · **Author:** chat (orchestrator) · **Status:** DRAFT — awaiting chain + PK apply gate
**Lane:** `ws5-production-envelope-enforcement-foundation` (P1 merged+deployed+verified · P2 containment applied `ae40dbf1…` · template edit saved `f98a8e08…` · PP non-regression PK PASS recorded)
**Tier:** T3 (one tracked DDL migration + governed-RPC DML on `c.*` + the PP restore).
**Evidence base:** `docs/briefs/artifacts/ws5-p3-stat-calibration-evidence-v1.md` (6 probes + PASS render).
**F-1 disposition honored:** prior condition recorded as `graduation_contract_rung_2_incomplete` (template was selectable before its full field inventory existed; only Background/Logo rows existed).

## Ordered steps (Convention-2 shape; a tripped STOP voids the remainder)

### Step 0 — vocabulary migration (PK-gated `apply_migration`)

File (repo, to be committed on PK instruction): `supabase/migrations/20260803090000_tmr5_field_constraints_vocabulary_max_words_v1.sql`
— `CREATE OR REPLACE c.tmr_validate_field_constraints` whose body is **byte-identical to the v2
function except one line**: `text_limits` allowed keys gain optional `max_words` (verified by
mechanical diff; ACL preserved by CREATE OR REPLACE + re-asserted REVOKE/GRANT in-file).
Migration name is permanent identity; any revision gets a NEW name.
**Post-checks:** (a) smoke `SELECT c.tmr_validate_field_constraints('X','text', <valid JSON incl. max_words triple>) IS NULL`;
(b) rejection smoke: unknown key still rejected; (c) `get_advisors(security)` → ZERO new findings
(function must not appear under SECDEF-executable or search_path classes).
**Rollback:** re-apply the v2 body verbatim (new migration name `…_rollback_v1`), text pre-staged in this packet's appendix by reference to the v2 migration §2.
**STOP:** smoke fails · any new advisor finding.

### Step 1 — field registration + calibration + re-capture (ONE `execute_sql` DO-block; self-aborting)

One DO block (single statement, single transaction — the ws5-metadata self-aborting precedent):
7 × `public.record_tmr_template_field` (new rows, constraints validated in-RPC) +
2 × `public.set_tmr_field_constraints` (existing Background/Logo rows, CAS-from-NULL) +
the re-capture UPDATE, each gated: any returned `error`/non-ok/rowcount≠1 → `RAISE EXCEPTION`
(everything rolls back). Template `a3d8472d-9438-4312-9f11-b6a920be4014`.

New rows (element ids/tracks from the saved source `f98a8e08…`; `dynamic=true`; `recorded_by='chat — Lane A P3, PK apply gate 2026-08-03'`):

| element_name | kind | required_for_render | content_source | text_limits (all probe_calibrated with render-id evidence) | notable |
|---|---|---|---|---|---|
| `StatValue` | text | true | ai_authored | max_chars **7** · max_lines **1** · max_words **1** | overflow_risk high; container notes 216px/no-autoscale; bare-key note |
| `StatLabel` | text | true | ai_authored | max_chars **30** · max_lines **1** | overflow high; pill |
| `ContextLine` | text | true | ai_authored | max_chars **130** · max_lines **4** | overflow medium |
| `CtaText` | text | true | ai_authored | max_chars **38** · max_lines **1** | overflow high; pill |
| `EyebrowText` | text | true | **worker_computed** | max_chars **13** · max_lines **1** | **baked: `eyebrow_value_property_pulse='MARKET UPDATE'` · `eyebrow_value_ndis_yarns='NDIS UPDATE'`** (PK D-4); video-worker v3.17.0 fail-loud consumer |
| `VoiceAudio` | audio | true | render_binding | — (non-text) | empty_ok true (vocabulary rule; `''`=silent; worker fail-louds upstream on missing VO) |
| `MusicBed` | audio | true | render_binding | — | empty_ok true (`''`=silent bed, N1; volume template-controlled, N3) |

Existing rows (CAS-from-NULL `set_tmr_field_constraints`): `Background` + `Logo` →
`content_source='governed_asset'`, `asset={resolver:'resolve_brand_assets', missing_behaviour:'fail_loud', asset_kind:'background'|'logo'}`, keys `Background.source`/`Logo.source`, activation persistent.

All text elements: `slot.activation='persistent'` (template-fixed timing; no `.time`/`.duration`
modification keys — vocabulary-consistent), `collapse.collapsible=false`, `empty_ok=false` (text).
Canonical suffixed modification_keys recorded (`Element.text`/`Element.source`); the worker's
current bare-key form for the 4 stat texts noted in `notes` (Creatomate accepts both).

Re-capture (same transaction): `UPDATE c.creative_provider_template SET inventory_hash='f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423', inventory_source = inventory_source || ' · 2026-08-03 eyebrow-parameterisation re-capture (EyebrowText dynamic; saved editor source docs/briefs/artifacts/ws5-p2-video-stat-reveal-9x16-v2-eyebrow-param-source-v1.json)', updated_at=now() WHERE id='a3d8472d-…' AND inventory_hash IS NULL` (CAS-from-NULL; pre-image captured first).

**In-transaction gate:** after all writes, assert
`(SELECT count(*) FROM c.creative_provider_template_field WHERE template_id='a3d8472d-…' AND constraints IS NOT NULL) = 9`
and re-capture rowcount=1 — else RAISE (full rollback).

**Rollback (validated against pre-images BEFORE apply):** DELETE the 7 inserted rows by
(template_id, element_name) · `UPDATE … SET constraints=NULL` on Background/Logo (CAS on the
exact constraints just written) · `UPDATE … SET inventory_hash=NULL, inventory_source=<pre-image text>` (CAS on the new hash). Byte-exact reverse; pre-images captured in the lane record at apply time.

**STOP:** any RPC error return · rowcount mismatch · post-apply read-back ≠ expected.

### Step 2 — post-apply verification (read-only)

1. 9 field rows on the template, all `constraints IS NOT NULL`; EyebrowText baked values exact.
2. `inventory_hash = f98a8e08…` on the template row.
3. Selector state UNCHANGED by this step: NDIS `fail_closed` · PP winner `dd5fd75e…` (both
   assignments still `blocked` — constraints do not unblock anything).
4. Canonical claimable-drafts SQL → 0.
5. `validate_tmr_template_intake` smoke against the declared contract derived from the saved
   source → expect PASS/green (D-2 restoration precondition #3; result recorded; any FAIL = STOP,
   NDIS restore stays blocked regardless of other progress).

### Step 3 — PP restore (the containment packet's validated rollback; PK D-3 preconditions now met: edit saved + re-captured + non-regression PK PASS)

`UPDATE c.creative_template_client_assignment SET assignment_status='visually_approved', updated_at=now() WHERE id='1ee1a547-08b8-4ce8-8045-d545be16c699' AND template_id='a3d8472d-…' AND assignment_status='blocked'` (CAS; read-back rows=1; approval columns untouched by construction).
**Post-checks:** PP winner STILL `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` (any change = STOP) ·
`a3d8472d-…` back in PP `alternatives[]` · NDIS still `fail_closed` (its restore is P5 only) ·
claimable drafts 0.
**Window note:** exclusive Lane-A ownership of row `1ee1a547…` ENDS at successful restore.

## Explicitly NOT in this packet

NDIS assignment restore (P5: requires the corrected NDIS render + live bounds pass + PK visual
PASS + the re-close gate) · any publish · Lane B backfill · any `select_template`/worker change ·
any register version cut. The ai-worker prompt's static example `$62.17/hr` (9ch — now over the
7ch envelope) is NOT patched here: the deployed envelope loader states the real limits in the
prompt and the validator/re-prompt/fail-closed chain enforces them; a cosmetic example tweak is
a future ai-worker patch note, not a P3 blocker.

## STOP conditions (all steps)

Hash mismatch on this packet at apply time · any RPC/DO error · any post-check mismatch ·
PP winner change · origin movement · any non-clean chain verdict below.
