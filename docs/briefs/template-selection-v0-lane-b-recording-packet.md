# Lane B — PP Proof Wall — Visual-Approval Recording Packet

**Created:** 2026-07-03 Sydney · **Design authority:** Gate 1 (ladder; decision 2 = one-sitting L3+L4 capture) · **Gallery:** `_harness/pp_proof_wall/` (18/18 renders, all via live `resolve_slot_assets`)
**Status:** review chain run — **awaiting PK apply gate (HARD STOP)**
**Artifact:** `_harness/lane-b-visual-approval-recording.sql` · **sha256 `37a5c67090a0a8dec68d63325cb167523723f44c55d9d6325b6f5f5ed2ac80b1`**

## 1. PK decisions recorded (gallery review 2026-07-03)

**Approved (10)** → `proposed → visually_approved` + `visual_approval/passed` proof event each:
auction_snapshot · announcement · quote_card *(content-governance note)* · stat_hero *(logo-transparency carry)* · listicle · before_after *(logo-transparency carry)* · news_summary · portrait_feed · linkedin_landscape · story_static.

**Needs tweak (6 templates / 4 units) — NOT touched, stay `proposed`/non-selectable:**
market_insight (location mismatch — Perth headline over Brisbane bg) · testimonial (persona/testimonial governance risk) · carousel cover+body+closing (closing-slide CTA/website duplication) · youtube_thumbnail (title/EP placement polish; optional FaceObject warning remains).

**Rejected:** none. **Scrim calibration decision:** **48 preferred default** · 64 acceptable only for busy backgrounds/dense text · 80 never default.

## 2. Exact mutations (one transaction, exact-count assertions, re-run = clean abort)

- **A:** UPDATE 10 PP assignments (listed template_ids, guarded `status='proposed' AND approved_by IS NULL`) → `visually_approved`, `approved_by='PK'`, `approved_at=now()`. Assert 10.
- **B:** INSERT 10 `visual_approval`/`passed` proof events, assignment-scoped, evidence = the exact reviewed render file per unit, platform per render, `recorded_by='PK (Lane B proof wall review 2026-07-03)'`. Assert 10.
- Template rows untouched (`creative_provider_template.status` stays `smoke_rendered` — approval is per-PP-assignment, not generic). No `client_enabled`/`production_proven` granted anywhere.

## 3. Before / after

| Measure | Before | After |
|---|---|---|
| PP assignments `proposed` | 16 | 6 |
| PP assignments `visually_approved` | 0 | 10 |
| `visual_approval` proof events | 0 | 10 |
| **Selectable set (visually_approved+ ∧ passed proof)** | **0** | **10** |
| client_enabled / production_proven | 0 | 0 (unchanged) |

## 4. Rollback

Commented in the artifact: DELETE the 10 proofs by the unique `recorded_by` marker (expect 10) + revert the 10 assignments by status guard (expect 10). Point-in-time exact; zero collateral (no other visually_approved rows or visual_approval proofs exist).

## 5. Carries recorded (per PK)

1. **Scrim recalibration** — `resolve_slot_assets` constants: `needs_scrim` default 64→**48**; 64 reserved for busy-background/dense-text cases (requires a small function-update lane, v1.1 — the "busy" signal needs a definition); 80 excluded.
2. **Location-aware background selection** (Slice-1 v2) — asset `location` metadata exists but is not a selection criterion; the wall surfaced the Perth-headline/Brisbane-skyline mismatch.
3. **Transparent/logo-variant intake for PP** — solid-navy logo box visible on solid-colour cards.
4. **Testimonial content-source guard** — template must only ever carry real, sourced testimonials (blocks its approval until governance defined).
5. **YouTube thumbnail FaceObject** — remains optional-unfilled with visible warning until a governed face asset exists.

## 6. Review chain

| Review | Status |
|---|---|
| db-rls-auditor | **run — §6a** |
| security-auditor | n/a (data-only; no DEFINER/grant/storage/runtime surface) |
| external review | **run on the exact artifact hash — §6b** |
| PK apply gate | **HARD STOP — pending** |

### 6a. db-rls-auditor (2026-07-03, read-only) — verdict **PASS, zero must-fix**

All 6 checks green against live data: the 10 target ids exist and family-key-match the approved units exactly; each has exactly ONE assignment (all PP; PP total 16 = 10 approved + 6 held, consistent); the 6 needs-tweak ids appear nowhere in the artifact; `visually_approved`/`visual_approval`/`passed` valid per live CHECKs; proof_event NOT-NULL/FK/default surface satisfied, no unique-conflict possible; **zero pre-existing visually_approved assignments or visual_approval proofs anywhere** → step-B join provably yields exactly 10 and current selectable count is provably 0; no triggers/views; readers unchanged (the 3 display/validation RPCs only — no production path); re-run = clean abort at A; rollback 10+10 point-in-time exact (informational: the assignment-revert guard is collateral-free only while no other lane elevates a PP assignment — re-verify counts at rollback time). Advisors: only the pre-existing `rls_enabled_no_policy` INFO (intended service-fenced posture).

### 6b. external review (2026-07-03) — verdict `agree` / decision `proceed`

`review_id f356eecc-6535-4f64-b223-011b42e45cac` · `reviewed_input_hash 37a5c67090a0a8dec68d63325cb167523723f44c55d9d6325b6f5f5ed2ac80b1` (== artifact) · risk medium · confidence high · **zero pushback, zero unverified claims, no escalation**. Verified: pre-state targeting, clean-abort integrity, exact 10+10 rollback.

## 7. Apply / no-apply recommendation

**APPLY.** The packet is a faithful transcription of PK's gallery decisions (10 approved ids in, 6 needs-tweak ids provably absent), targeting is live-verified 1:1, ladder math is exact (selectable 0 → 10, nothing enabled beyond `visually_approved`), the transaction is fail-loud with clean re-run behaviour, and rollback is point-in-time exact. Apply as postgres/service_role with the hash re-verified immediately before execution.
