# Result — NDIS Yarns Phase-1 Person-Free Background Sourcing + Fenced Intake (Round 1)

**Brief:** `docs/briefs/ndis-phase1-person-free-imagery-sourcing-v1.md` · **Policy:** `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` (register v5.79)
**Executed by:** Claude Code (orchestrator) · **Completed:** 2026-07-19 Sydney
**Lane / label / tier:** Phase 1 · PRODUCT_PROOF · sourcing (T2 fenced intake) — no production surface (rows fenced/inert)

---

## 1. Result status

`Complete` — 9 person-free real-photo NDIS backgrounds sourced, reviewed, PK-visually-accepted, and **applied to the DB as fenced candidates** (pool-neutral, verified). Register record + commit **HELD** pending a clean shared-worktree git state (see §6).

## 2. What was done

- **Gate 1:** brief approved; PK row election = CORE 7 + `ny_assistive_tech_no_user` + `ny_hands_ordinary_activity` (9 rows); `ny_distant_soft_focus_presence` HELD.
- **Stage 1 (harvester):** `HARVEST_COMPLETE` — 9/9 rows, 25 Pexels candidates (1 best-pick each), 16 rejects on identity/signage/plate/tone. Package `_harness/image_harvester_v0/ndis_phase1_20260719/`.
- **Orchestrator byte-verify:** 34/34 sha256 (25 candidates + 9 final), 0 mismatch.
- **Stage 2 (reviewer):** `REVIEW_COMPLETE`/clean — all person-free, licence-safe, **no cultural elements (no ESCALATE)**; 7 PASS/PASS_WITH_NOTE, 1 PASS_GENERIC_ONLY (community_facility), 1 PARTIAL_FIT_ONLY (accessible_transport, weak texture).
- **Crop-proof:** 1:1/1080/navy-scrim~0.55 + sample 71-char NDIS headline — all 9 text-safe, no residual legible signage.
- **PK visual gate:** all 9 ACCEPTED ("like all the images").
- **Fenced DB-intake (T2):** 9 fenced rows into `c.client_brand_asset` (asset_type='other', is_active=false, 4 fences off, usage='background', full provenance). db-rls-auditor **pass/clean** (structural pool-neutrality proven from live resolvers), external review agree (`07e5207c`→re-baselined `001c9e98`).
- **Apply:** uploaded 9 crops → `brand-assets/NDIS_Yarns/Backgrounds/` (9× HTTP 200); public-URL sha256 == crop sha256 (9/9); INSERT applied (PK-authorized). **Post-verify: 9 new rows, all fully fenced, active bg pool 5→5 (neutral), total 15→24; my 9 NOT in the selectable pool.**

## 3. Assets (fixed ids bf1ac701-…-01..09, all fenced intake_candidate)

`bg_ny_accessible_home_interior` · `bg_ny_accessible_pathway` · `bg_ny_inclusive_public_space` · `bg_ny_community_facility` · `bg_ny_accessible_transport` · `bg_ny_everyday_living` · `bg_ny_education_or_work` · `bg_ny_assistive_tech_no_user` · `bg_ny_hands_ordinary_activity`. Path `brand-assets/NDIS_Yarns/Backgrounds/<asset_key>.jpg`. All Pexels License, provenance + reviewer_verdict + usage_constraint recorded in asset_meta.

## 4. The concurrency STOP (handled correctly)

First apply attempt **fail-closed and rolled back (0 rows)**: PRECHECK caught the NDIS active bg pool had moved 1→5 — a **parallel lane** (commit `017c88b`, v5.82) promoted 4 abstract NDIS backgrounds fenced→live (total unchanged 15). Re-baselined the active-pool assertion 1→5 (only change; new hash `b7f3e7f6`), re-ran external review (`001c9e98` agree/low/high), PK re-authorized, applied clean. The double fence (is_active+approved both off) means the 9 real photos are inert regardless of the abstract-pool size.

## 5. Constraints confirmed

- No identifiable people / faces / minors / clinical / cultural content — confirmed (person-free set; hands row no-face).
- No promotion / no eligibility flip — the 9 stay fenced; active pool unchanged (5).
- No production rotation caused by this lane; live NDIS renders untouched.
- Service-role key: USE-only, loaded from env (Downloads file), never printed/stored/committed.

## 6. Open issues

- **Register pointer + commit HELD** — at record time the shared worktree was diverged (origin `d627a8c` vs local `af9ac35`, ahead 1/behind 1) with another lane's `00_action_list.md` change staged in the index and v5.83 (Video D6 Lane 2) in flight. Committing would entangle this record with another lane's unpushed work. Record kept local; register pointer (tentative **v5.84**) + commit to be cut once the git state settles or PK coordinates the shared worktree. **The DB intake itself is fully applied + verified — only the documentation commit waits.**
- **accessible_transport** best-pick is a weak abstract texture (PARTIAL_FIT) — round-2 reshoot queued.

## 6b. Round 2 (applied + verified 2026-07-19)

- **Sourced:** 8-theme new person-free set — `HARVEST_COMPLETE`, 24 candidates, 18 rejects (person-presence, signage/plates, cultural/religious icons, tone). Package `_harness/image_harvester_v0/ndis_phase1_r2_20260719/`.
- **Reviewer:** `REVIEW_COMPLETE`/clean — no cultural ESCALATE, no affiliation, no identity-leak in the offered set. Two library ALTS REJECT_PROPOSED (legible spines / relief portrait-face plaques) — not best-picks, excluded. Best-picks PASS→PASS_GENERIC_ONLY.
- **PK visual gate:** all 8 ACCEPTED ("accept all, i like them") — incl. `library_reading_nook` (PK accepted despite partly-legible benign book spines; recorded `usage_constraint=pk_accepted_benign_book_spines`).
- **Intake (T2, P2 same-shape ride on round 1's chain):** 8 fenced rows (ids `bf1ac702-…-01..08`), uploaded (8× HTTP 200) + public-URL sha256 verified (8/8) + INSERT applied (PK-authorized). **Post-verify: 8 new fully-fenced, active bg pool 5→5, total 24→32; 17 real-photo fenced candidates total.** Per-apply guards all run (byte + public-URL sha256 + in-txn pool-neutrality + fail-closed).
- **Assets:** `bg_ny_accessible_transport_v2` (real ramp-to-platform scene, generic-only) · `bg_ny_assistive_tech_home` (stairlift) · `bg_ny_community_garden` · `bg_ny_library_reading_nook` · `bg_ny_makerspace_studio` · `bg_ny_welcoming_reception` · `bg_ny_morning_light_home` · `bg_ny_accessible_boardwalk`. Rollback `ndis_phase1_r2_20260719/intake/intake_rollback.sql` (guarded, 8 ids).

## 6c. Promotion #1 — 8 real backgrounds LIVE (T3, applied + live-proven 2026-07-19)

- **PK-elected set (8 strongest):** `bg_ny_accessible_pathway` · `bg_ny_everyday_living` · `bg_ny_education_or_work` · `bg_ny_hands_ordinary_activity` (R1) · `bg_ny_community_garden` · `bg_ny_welcoming_reception` · `bg_ny_morning_light_home` · `bg_ny_accessible_boardwalk` (R2).
- **T3 chain:** db-rls-auditor **DB-safety clean** (verdict `concerns` → 2 creative-gov items resolved) + external `7c16daa4` partial→PK escalation (no defect; production-change judgment) pinned hash `00a5d258`. PK T3 apply gate authorized.
- **Concern fixes folded in:** scrim set via **`scrim_opacity_override=55`** (the key the resolver actually reads; renders at the reviewed 0.55 — the inert `suggested_scrim_opacity` was dropped); rollback hardened to BEGIN/COMMIT + rowcount + pool assert.
- **Apply (CAS-guarded, fail-closed):** `promote_apply.sql` (`_harness/image_harvester_v0/ndis_phase1_promo1_20260719/`) flipped exactly **8** fenced→governed; in-txn pre/post asserts passed.
- **Live proof:** NDIS active bg pool **5 → 13** (5 abstract textures + 8 real photos); all 8 `governed` + `scrim_opacity_override=55`; 9 real candidates still fenced; the 5 textures untouched; eligibility confirmed via the resolver's `is_active=true AND approved IS TRUE` predicate. Real imagery is now live in NDIS rotation.
- **Rollback standing:** `promote_rollback.sql` (re-fence exactly the 8, pool 13→5).
- **Acknowledged:** no-seed default pick now a real photo (warm default); per-post seed spreads rotation across all 13.

## 7. Next recommended step

Round 2 sourcing (new person-free set + accessible-transport reshoot) — launched. Cut the register pointer + commit this record when the shared worktree is clean. Promotion of any of these 9 from fenced→eligible remains a separate future T3 gate.
