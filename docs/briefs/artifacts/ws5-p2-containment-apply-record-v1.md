# Apply record — P2 shared-template edit-window containment (Lane A, WS-5)

**Applied:** 2026-08-03 Sydney, by chat (orchestrator) on PK's explicit apply instruction.
**Packet:** `docs/briefs/artifacts/ws5-p2-shared-template-containment-apply-packet-v2.md`, hash re-verified at apply time = `ae40dbf16d5cbb40d90d9e6333aa61e6d9dbe7412408576a66376b506ca86b1b` (exact match to PK's pinned hash).

## Pre-apply

- **Pre-image (captured):** `1ee1a547-08b8-4ce8-8045-d545be16c699` · template `a3d8472d-9438-4312-9f11-b6a920be4014` · client `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` (PP) · `assignment_status='visually_approved'` · `approved_by='PK'` · `approved_at='2026-07-19 01:08:00.4319+00'` · `updated_at='2026-07-19 01:08:00.4319+00'`.
- **Rollback-validation stanza:** all 4 criteria PASS (pre-image status == rollback restore literal · rollback SET list restores every mutated column except acknowledged `updated_at` advance · WHERE identity character-identical forward/rollback · approval columns confirmed untouched by both SET lists).

## Apply

- Single CAS-guarded UPDATE (packet §Forward apply, verbatim) via one `execute_sql` call.
- **Read-back (mandatory rule): `rows_updated=1` · `approved_by_preserved='PK'` · `approved_at_preserved='2026-07-19 01:08:00.4319+00'`.** Apply complete.
- Note: a transient MCP `fetch failed` interrupted post-apply checks 3–4 on first attempt (after checks 1–2 had passed); re-run succeeded. No write was involved in the interruption — the forward UPDATE had already returned its read-back before the outage.

## Post-apply verification (4/4 PASS)

1. **PP winner unchanged:** `select_template('property-pulse',NULL,'video_short_stat')` → selected `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` (`AU_generic_national_Suburb_9:16_V1`); `a3d8472d-…` now in `rejected[]` with `assignment_blocked`; alternatives = `4cd2c9e2-…` only.
2. **NDIS unchanged:** `select_template('ndis-yarns','youtube','video_short_stat')` → `fail_closed / no_selectable_template`.
3. **Row state:** both assignments on `a3d8472d-…` = `blocked`; approval columns intact on both (PP `2026-07-19…`, NDIS `2026-07-20…`).
4. **Canonical claimable-drafts SQL → `claimable = 0`.**

## Resulting state (PK's required final state — MET in full)

PP assignment blocked · NDIS assignment blocked · approval columns unchanged · `video_stat_reveal_9x16_v2` unselectable by every client · PP live winner `AU_generic_national_Suburb_9:16_V1` · zero claimable video drafts · exact-inverse rollback remains valid (row is in the rollback's CAS pre-state `'blocked'`; restore literal + identity validated pre-apply).

## P2 window events (appended)

- **Template edit SAVED (PK sitting, 2026-08-03):** track-5 eyebrow element parameterised → `name='EyebrowText'`, `dynamic=true`, saved default text `MARKET UPDATE`; all other elements byte-unchanged. Post-save source pasted by PK and frozen: `docs/briefs/artifacts/ws5-p2-video-stat-reveal-9x16-v2-eyebrow-param-source-v1.json` (sha256 `f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423`). This is the re-capture fingerprint source for the P3 packet.
- **Local Creatomate key note:** shell env key returned 401 (stale post-rotation); render run with the key file PK designated (`Downloads/creatomate api key.txt`, file→env conveyance, value never in transcript). Standing exposure/rotation carry unchanged — managed storage still owed.
- **PP NON-REGRESSION RENDER — PK VISUAL PASS (D-3), 2026-08-03:** out-of-band render `a955d1f6-2a1a-4f12-9d95-3530dd8a22a9` of `c11bb8ab…` with `EyebrowText.text='MARKET UPDATE'` (explicit dynamic binding — accepted by Creatomate, proving the parameterisation live), stat fields at saved defaults, baseline background `bg_pp_family_backyard_summer` + PP logo, silent audio. Local evidence `_harness/ws5_p2_pp_nonregression/renders/ws5_p2_pp_nonregression.mp4` sha256 `c4139da5a694e17196f281e110256908c0eaf40847ec9b5298c180957f9cd69f`. Mechanical: 12.000s · 1080×1920 · 30fps on both new render and baseline `f607a66d…`; audio-shape non-regression proven statically (audio elements byte-identical in the saved source). **PK verdict: "it looks good no issue" (screenshot on device, 2026-08-03) — PASS.** No DB writes, no publish.
- **PP restore NOT yet run:** the packet's restore condition requires the re-capture (P3) in addition to this PASS; restore remains a PK-gated act.

## Standing window rules (until restore)

- Row `1ee1a547-…` is owned EXCLUSIVELY by Lane A until the rollback runs (after template edit + re-capture + PP non-regression render + PK PASS). Unexpected state at rollback = STOP, never force.
- The Creatomate editor sitting is authorized to begin (PK, 2026-08-03). NO P3 DML, NO assignment restoration, NO public publish authorized yet.
