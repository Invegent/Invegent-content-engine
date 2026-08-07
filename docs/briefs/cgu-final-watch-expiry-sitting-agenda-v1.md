# CGU Final — Watch-Expiry Sitting Agenda (v1 DRAFT — maintained by the control tower until ~2026-08-11 20:20 Sydney)

**Purpose:** the single ordered agenda for PK's one sitting at watch expiry. Every item pre-staged;
every recommendation advisory-only. Updated as watch days 4–7 land. Companion evidence:
`docs/briefs/artifacts/cgu-final-phase1-watch-log-v1.md` (the watch log) and the v6.140–v6.158
register arc.

---

## Part 1 — The gate itself (sequential, blocking)

1. **Watch verdict** (control tower presents): 7-day evidence, W-1 root-caused (causal, not
   statistical), STOP-condition audit. Verdict PASS expected unless days 5–7 change the picture.
2. **Phase-2 apply authorization**: on PASS, the control tower authors ONE fresh apply packet on
   the PK-approved shape (base + dormant E-1, v6.144/v6.145) → full T2/T3 chain → PK production
   authorization. v3 remains review-only evidence, never executed.
3. **Time-bound rider — slot `c1f38536…` (PP YouTube 2026-08-13T07:00Z)**: bound draft
   `video_status='failed'`; silent schedule-miss risk (no backfill path). Options: re-render ·
   T0 manual replacement (CFW-LI precedent) · accept miss. *Must be ruled at this sitting —
   only 2 days of margin after it.*

## Part 2 — Post-watch apply-wave ordering (one ruling, recommended order below)

> Control-tower recommended order, per W-1 causality and dependency chains:
1. **M16 fix apply** (T2/T3 Gate — the two-function fix, branch `lane/m16-pool-health-fix-build`):
   FIRST — restores CFW *and* NDIS image_quote fills (W-1 upgraded fleet-relevance to CERTAIN);
   E-1 precondition-2.
2. **Background intake + promotion** (the PK-visually-approved 6 CFW / 8 INV) — E-1
   precondition-1; carries: cfw-09 zoom-check · cfw-13 authenticity · inv-07/08 never geo-label.
3. **E-1 activation check** (both preconditions then met → the dormant CFW election goes live in
   the Phase-2 apply or a follow-up rider).
4. **M11b closure applies** (kinetic_voice T2-DB then T3-code sub-gates · Seed A · Seed B — all
   AHA-shadow-hardened, `apply_migration` channel pinned).
5. **M14 calibration writes + image-worker v3.39.0 deploy** (branch `lane/m14-ws1-ws3-build`).
6. **M7 snapshot schema apply** (+ PK's first manual weekly cost entry).
7. **M1 Gate-2 chain** (branch `worktree-cgu-l1-m1-loudness-phase1`; preconditions: Edge-Runtime
   proof · outlier explanation · grant/name/cadence decisions).
8. **Publish-truth view apply + cockpit deploy** (once Tasks 2–3 are authored — see Part 3.C).

## Part 3 — Decisions (batchable, each with recommendation)

**A. M12 design fork** — pure seed-hash rotation (works NOW, no M1 gate) vs loudness pre-rank
(waits on M1). *Recommend: pure seed-hash; loudness becomes a later enhancement.*
**B. NDIS text supply** — source-diversification decision (top-2 picks share a source_domain):
add sources vs adjust the diversity dimension. *Recommend: add 2–3 NDIS-vertical sources first
(supply-true fix); touching the diversity check changes fleet behavior.*
**C. Publish-truth Tasks 2–3 go** — the authoring is watch-legal; PK's word in that session
unlocks it pre-sitting. *Recommend: give the go early; the apply still waits.*
**D. Evergreen library seeding** — `t.evergreen_library` empty fleet-wide (never seeded); a whole
skip-reason class. *Recommend: elect a small T2 seeding lane, per-client curated.*
**E. `Location.max_chars`** — content policy call; zero live evidence exists (all clients declare
''). *Recommend: set a generous provisional (e.g. 40) marked provisional_uncalibrated, or defer
until a client actually uses Location.*
**F. Legacy-publish dispositions** — `4ejuEQ15j0U` (published kinetic_voice video): *recommend
leave + record as legacy-era publish.* `a44288f7…` (NDIS stale approved draft, stable-blocked):
*recommend void inside the kinetic_voice/M11b apply.*
**G. M6 five design opens** — S3's advisory (2026-08-06, propose-only, full chain in the M6
result §9 + S3 transcript):
  1. format_key → **`video_short_triptych`** (names the fixed-3-panel narrative shape; style
     names stay free for future formats).
  2. Scope → **client-generic, PP as first proving client** (avoids the known
     hardcoded→generic migration pain; both composited scenes are already resolver-driven).
  3. Scene3Headline → **65 chars** (Scene 3 is modeled verbatim on kinetic's cta scene —
     borrowing stat's 90 would be internally inconsistent).
  4. Durations → **anchor Hook 5–7s + CTA 4–6s from the live kinetic prompt's own bounds;
     Proof = remainder** (reused provenance, not three invented numbers).
  5. Audio → **silent v1, audio deferred to v2** (kinetic's documented VoiceAudio regression +
     the first-proof risk is the 13-element render vs the 120s ceiling — don't conflate risks).
**H. M8.1 + P-1 Gate-1s** — both now cheap independent dashboard wirings (v6.158: M8.1 reuses a
live+wired RPC; P-1 renders a live-but-dark RPC). *Recommend: approve both as one small
dashboard lane each, post-watch.*
**I. Agent-status reviews** — `apply-harness-auditor`: 3-for-3 real pre-freeze catches in shadow
→ *recommend promotion review packet (control tower drafts).* `creatomate-specialist`: first
mission PACKAGE_READY, zero charter violations → *candidate→proven is PK's call; one more
mission (the M6 transposition support) would give a 2-mission record.*
**J. M13 lane sequencing — ✅ PK PRE-RULED (2026-08-06, via the S3 session; supersedes the draft
recommendation):** Lane 2 is CONFIRMED DONE (folded into the landed Lane 1; the diff engine now
has a second real-artifact proof — clean + deliberately-drifted-caught against the M6 Blueprint,
satisfying §8's proven-fixture-pass precondition twice over). **Lane 4 (Asset Gap Build-Pack
display, T2): PULLED FORWARD — runs now** (never watch-gated; §9 holds only lanes 3/5; isolated/
undeployed dashboard work). **Lane 3 (registry persistence, T3): starts the moment Phase-2 apply
authorization clears at the sitting** — its only remaining gate is the Phase-2 hold itself (diff
engine proven + format_key decision at item G are its internal preconditions). **Lane 5 (e2e
proof, T3): immediately after Lane 3 lands**, using the real M6 Blueprint
(`docs/briefs/artifacts/m6-triptych-blueprint-v1.json`) as its proof input.
**K. M11c migrate design lane timing** — ruled "after M13 v1"; clarify whether Lane-1-landed
suffices or full-M13. *Recommend: after Lane 3 lands (registry persistence is what the
migration actually needs).*
**L. M4 B-roll sourcing batch election** — manifest prepped (v6.159): Perth reinforcement
(source 3 → 1–2 accepted) + Brisbane as the new 3rd locality (source 5 → 2–3 accepted);
Melbourne alternate. Geo-declaration pre-verified: PP video copy_geo='au' means any AU locality
is reachable without governance change. Lane = T2 same-shape under the P2 rule (per-apply guards
never waived), full chain named. *Recommend: approve the manifest as drafted; sourcing runs
post-watch (or PK may elect harvest-only earlier — harvest is watch-legal).* Carry flagged, not
in this lane: all 6 eligible clips show `platform_scope=null` live — feeds the ruled M4
enforcement design.

**M. B-roll batch — UPDATED 2026-08-07 evening: the P1 is RESOLVED-BY-FENCE (PK-authorized
production write, full gate trail); successor decisions below:**
  · ✅ `f84ac010` + `e6e24358` (NEW second defect: Owen Hodge law-firm signage, found by the
    PK-directed full-pool audit) — both FENCED (`is_active=false·approved=false·
    approval_status='fenced_signage_defect'`), post-verified, reversible. Pool 6→4.
  · **M-1: ✅ RULED AND CLOSED (2026-08-07)** — `2d62b04e` FENCED (third fence; PK reaffirmed
    with the depletion facts in hand; two escalating reviews addressed, neither overridden;
    row was `review_notes=null` — unrecorded class, no retraction implied). Addendum doc
    `broll-live-pool-fence-addendum-v1.md`.
  · **M-2 (URGENCY ESCALATED): pool is now 3, effective selection 2** (recent-use exclusion
    leaves `pool_after_recent_use=2`; two of three are tonally similar aerials). **Measured
    resolver facts (rolled-back-txn simulations + live confirm):** NO minimum-pool threshold
    exists mechanically ("POOL=6 MET" is governance, not code) · video backgrounds have NO
    shared-pool fallback · pool=0 → `fail_closed`, slot does not fill. **Treat the third fence
    as the LAST before backfill** — a fourth leaves effective selection at 1. *Recommendation:
    the pre-intake person-detection pass runs NOW (harness-side, watch-legal — seeded); the
    intake→promotion chain then becomes ONE PK gate, electable before the sitting under the
    same explicit-authorization carve-out as the fences, or at the sitting (4 days) if no
    further defect forces it.*
  · **M-3 (CORRECTED per the fence result doc §8.1 — supersedes the earlier whole-batch framing):**
    the false-claim pattern is **contained to `broll_background` (7 rows, 4 carrying the claim) —
    and all 7 have now been re-verified first-hand by the fence lane; the broll re-verification
    is DISCHARGED.** The remaining ruling is only `2d62b04e` (M-1). **The REAL implied lane
    (§8.2, not started/authorized): `still-background-signage-verification-v1`** — the 44 live
    still-image `background` rows carry NO recorded signage verification under any phrasing
    (unrecorded, not falsely recorded; single-frame, cheap per-asset). *Recommend: elect it as a
    post-watch T1/T2 lane.* **Structural recommendation (§8.3, for PK's stack):** nothing
    re-checks live pool contents against admission rules — both defects surfaced by accident;
    consider a periodic re-verification pass and/or requiring signage/person claims to cite frame
    ARTIFACTS rather than prose.
  · **NEW M-4: follow-up writes** — f84ac010 geo-label correction (Cottesloe→Fremantle; separate
    write, not done) · `42211c0f`'s unrecognized `needs_gradient_scrim` value (inert while fenced;
    fix before any promotion).
  · Fence-targeting fact (register-bound): `resolve_slot_assets` reads ONLY `is_active`+`approved`
    — `production_use_allowed`/`approval_status` are never consulted (declared-control class).
  · The six sourcing decisions: 2 contested CFW clips · NDIS Thailand-sourced clip (geo-neutral
    read) · PP incidental-people posture (top-down/faceless vs person-free claim) · one 185MB
    clip trim-before-upload · storage policy for video assets.
  · M4 intel folded into item L: this corpus advances the M4 locality bar by ZERO (all PP clips
    geo-neutral; pp-broll-06's Perth claim downgraded — the grounding tower falls outside the
    9:16 crop). **Brisbane CBD aerials are a dead lane (0/5 clean — all failed on readable
    corporate signage); the M4 batch must target suburban/coastal Brisbane.** Sourcing epistemics
    note for every visual gate: person-free is verified to the standard of the LAST pass, not
    absolutely — deeper inspection kept finding people across three lanes.

## Part 4 — Standing confirmations (no decision unless PK objects)

- M18: rotation half CLOSED; migration tail continues at PK's pace.
- M2: directions stand (CFW Matilda-type · INV Stream B); config apply joins the wave post-pick.
- W-1 monitoring continues through expiry; fills-vs-skips trend included in the verdict.
- Fleet: control tower + asset-sourcing hold; lane slots closed as archived.

*(Control-tower notes: agenda updated in place as days 4–7 land; the verdict section is written
last. PK may pre-rule any Part-3 item early — each early ruling shrinks the sitting.)*
