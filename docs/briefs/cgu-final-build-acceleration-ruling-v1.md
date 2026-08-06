# CGU Final — PK Ruling: Build Acceleration During the Phase-1 Watch (2026-08-06)

**Lane classification:** T1 (docs/ruling record) · SAFETY_GATE · PK ruling, recorded verbatim.
**Recorded by:** the CGU Final control tower, 2026-08-06 (Sydney). **Register pointer:** v6.147.
**Decision line (PK-specified):**
> `RECOMMENDATIONS ACCEPTED WITH AMENDMENT — CGU Final build accelerated; production mutation remains watch-gated.`

---

## 1. PK ruling (verbatim paste-block)

> PK RULING — CGU Final acceleration during the Phase-1 schedule watch
>
> The Phase-1 schedule watch remains unchanged through approximately 2026-08-11 20:20 Sydney. It
> must continue to produce the schedule verdict and revised Phase-2 evidence.
>
> The earlier blanket hold on heavy implementation is amended.
>
> Effective immediately, CGU Final may proceed with isolated, non-production implementation that
> cannot alter the live schedule-watch conditions.
>
> Allowed during the watch:
>
> * implementation in isolated branches;
> * schema, migration and RPC authoring without live apply;
> * worker and resolver code without production deploy or activation;
> * automated tests and fixture-based proofs;
> * calibration and structural-diff work;
> * read-only diagnostics;
> * asset sourcing and manifest preparation;
> * documentation, architecture and Gate-1 rulings.
>
> Still prohibited until watch PASS and explicit PK production authorization:
>
> * Phase-2 schedule or cap DML;
> * production database migrations;
> * live selector, palette, routing or voice-config changes;
> * production worker deployment or cron activation;
> * asset intake or promotion that changes live selection;
> * M11 governance closure applies;
> * any mutation that could alter or contaminate the schedule-watch evidence.
>
> Start no more than three build lanes:
>
> 1. M1 loudness Phase-1 implementation;
> 2. M7 cost-capture implementation;
> 3. M13 Build Pack Lane 1 — scalar proof with the ordered-sequence seam preserved.
>
> Recycle completed sessions into M16, then M14. Do not expand the fleet.
>
> Decision-sheet ruling:
> Accept the recommendations for M16, M11c, M13, the M11b/M15 briefs, M12 and M14.
>
> Amend the M9 P-1 + M8.1 ruling:
>
> * one shared investigation is approved for efficiency;
> * implementation and acceptance remain independently gated unless a shared authoritative data
>   contract is proven.
>
> Record the decision as:
> `RECOMMENDATIONS ACCEPTED WITH AMENDMENT — CGU Final build accelerated; production mutation
> remains watch-gated.`
>
> M18 urgent rotation is already closed. Its remaining credential-migration tail is separate and
> does not block this acceleration.

## 2. Ratified decisions (per the accepted decision sheet — now standing rulings)

1. **M16:** Option **C (health-check decay-visibility fix, re-arming the auto-relax valve) with
   Option B (format-specific fitness-gate correctness fix) folded into the same lane.** Option A
   (source swap) folds into content-supply strategy, not this lane. This selection defines E-1
   precondition-2's "bounded M16 fix". W-1 fleet-relevance (NDIS `pool_thin` never relaxing) is in
   the lane's investigation scope.
2. **M11c (six):** disposition **MIGRATE confirmed** (on the reconciliation memo's evidence basis)
   · schema direction = **bind an ordered sequence of the existing 3 template families** (final
   design in the M13-coordinated lane) · render-latency measurement affirmed as a pre-migration
   step · render-qa v0 exclusion = **separate carry** · migration sequenced **after M13 v1 scalar
   proof**, multi-object schema work done once for both consumers · **live `pg_get_functiondef`
   read retained as a hard Phase-1 gate**.
3. **M13:** scope **RATIFIED** as packeted; proof lane targets a **scalar template first**; the
   ordered-sequence seam is preserved in v1 schemas.
4. **Gate-1 approvals:** Seed A — **option (a)**, explicit `enabled=false` governance closure row
   (apply watch-gated) · Seed B — approved as drafted (applies watch-gated) · kinetic_voice (M15
   fold) — approved with **widened scope: both `_voice` siblings** (`video_short_kinetic_voice` +
   `video_short_stat_voice`) and the one live eligible draft ruled **contained/voided**, not left
   ambiguous (any live palette/routing change stays watch-gated) · **M9-P1 + M8.1 — AMENDED:** one
   shared *investigation* approved for efficiency; **implementation and acceptance remain
   independently gated unless a shared authoritative data contract is proven.**
5. **M12 (four):** Content-ID test on the 3 named tracks authorized (PK-personal) · fresh sourcing
   = contingency-only pending test results · `select_music` seed/rotation resolver lane scoping
   authorized (docs; build after M1) · `corporate_theme_medieval_008` aural listen taken with the
   test sitting.
6. **M14:** staged order ratified — **value-calibration (2 high-exposure templates) + image-worker
   enforcement build-out FIRST; shape-capture-from-zero (16 templates) LAST.**

## 3. Operational effect (control-tower reading)

- **Three build lanes open now** (isolated branches, zero production surface, per §1's allowed/
  prohibited lists): L1 = M1 loudness Phase-1 · L2 = M7 cost-capture · L3 = M13 Lane 1 scalar
  proof. **Session recycle queue:** as lanes complete → M16 (C+B fix, isolated build) → M14
  (WS-1 + WS-3 build prep). Fleet does not expand beyond control tower + asset-sourcing + the
  three lane slots.
- Every lane seed carries the §1 prohibited list verbatim; any migration/RPC produced is authored
  as `NOT_APPLIED` artifacts; nothing deploys, applies, or activates before watch PASS + explicit
  PK production authorization. Watch monitoring and the expiry package remain the control tower's
  unchanged obligations.
