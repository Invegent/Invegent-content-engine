CLAIMED v5.65 · d4-close-lane · main-checkout · PK-commit-gate · 2026-07-17T07:50Z

# Result — D4 close (Path B, invariant) + PP Static TMR Done ratified TRUE

**Lane:** D4 declarative-registry drift → close via invariant + `tmr-drift-probe` check (d); PP Static TMR Done ratification folded in (PK).
**Executed by:** Claude Code (orchestrator + ef-builder), PK gates + Convention-2 two-apply sequence.
**Completed:** 2026-07-17 Sydney. **Register: v5.65** (D4 CLOSED pointer; v5.63 = Apply A).

---

## 1. Result status

`Complete` — **D4 FORMALLY CLOSED** and **PP Static TMR Done RATIFIED TRUE**. Two applies, both PK-gated, landed and proven.

## 2. Commit(s)

- `ef308e2` — **Apply A** (v5.63, docs): `property-pulse.json` v0.10 back-declare (8→17) + DoD supersede (Static TRUE + D4→invariant) + register pointer.
- `651362b` — **Apply B** (code): `tmr-drift-probe` v2.1.0 check (d) declarative-coverage.
- `<this commit>` — **Apply B close-out** (v5.65, docs): D4-CLOSED confirmation + register pointer + this result doc.

## 3. Files changed

- `docs/creative-library/property-pulse.json` — v0.9→v0.10; background pool 8→17 declared across all 4 sites; empty `background_declaration_exemptions` home; v0.10 carries entry.
- `docs/governance/pp-tmr-definition-of-done-v1.md` — additive 2026-07-17 SUPERSEDE block (Static ratified TRUE + D4 redefined to invariant) + D4-CLOSED confirmation.
- `supabase/functions/tmr-drift-probe/{index.ts,compare.ts,compare_test.ts}` — v2.1.0 check (d).
- `docs/00_sync_state.md` + `docs/00_action_list.md` — v5.63 + v5.65 pointers.

## 4. Actions taken

- **PP Static TMR Done RATIFIED TRUE** (PK): evidence — overprint fixed+deployed (image-worker v3.24.0), PK visual PASS IG `604c3dfb` + FB `a3ac9129`, C-OQ1 carousel overprint measured **0/600 non-blocking** (`task_8c5dab3b`). C1–C4 remain named carries, not blockers.
- **D4 REDEFINED** scalar→invariant: *every active/approved/production-use governed PP asset must be declared, exempt-with-reason, or deactivated* (PK-ratified; scalar was retired because `12/12/11/9` went stale within hours — live moved to 16/16/15/13 at 02:06 mid-audit).
- **Apply A — live pre-apply check + back-declare.** Ground truth diverged from the packet (a v5.60 promotion moved the pool); the live must-declare set was **17**, not 16 — a STOP was raised and PK ruled a fresh gate: declare the 9th key `bg_pp_modern_home_exterior_front` (active+approved+production-use, promoted since the packet); predicate = active∧approved∧production_use_allowed; the 5 active+approved-but-not-production-use keys left OUTSIDE the invariant. Back-declared all 9 undeclared live keys → `property-pulse.json` pool **8→17**; **invariant holds (declared 17 == live must-declare 17)**. Chain: creative-graph-auditor PASS (17-key pool identical across all 4 mirrors) + branch-warden safe. Committed+pushed `ef308e2` (v5.63).
- **Apply B — probe check (d) + deploy (Option 3).** ef-builder (isolated worktree) added a per-client declarative-coverage check: fetches `property-pulse.json` from **GitHub main** (raw.githubusercontent + reused GITHUB_PAT, no new secret), computes `must_declare − (declared ∪ exempt)`, writes `declarative_coverage` into the existing `divergence_summary` jsonb (no DDL); additive + informs-only, checks a/b/c byte-preserved, check (d) independently fenced. 36/36 tests. Chain: db-rls-auditor PASS (must_declare 17 == declared 17 → predicted ok) + external review agree (pinned `b4de184b…`, review `1bd80593`) + branch-warden safe. Committed+pushed `651362b`; deployed **tmr-drift-probe v2.1.0** via governed `safe-deploy.sh --allow-warn`; post-deploy drift clean (A-LE, deployed==repo); `verify_jwt=false` confirmed.
- **FINAL PROOF (D4 closes):** triggered the deployed probe (via the cron's `net.http_post` mechanism, correct service-role Bearer). Check (d) returned **`declarative_coverage.status='ok'`, must_declare_count=17, declared_count=17, exempt_count=0, violation_keys=[], registry_source='github:main', registry_version='v0.10'**. The invariant is continuously machine-checked and holds → **D4 FORMALLY CLOSED**.

## 5. Constraints confirmed

- Additive/dated DoD supersede only (no in-place rewrite; all prior rulings retained). Explicit-pathspec commits (no `git add -A`; xlsx never swept). No DDL/migration in Apply B (nested in existing jsonb). No new secret. No block/remediation (probe informs only). Checks a/b/c byte-unchanged. Every STOP condition honoured (the pool-moved and v5.64-collision STOPs were surfaced to PK for fresh gates).

## 6. Open issues

- **v5.64 collision** — F-spinegen holds a `CLAIMED v5.64` stub (07:04Z); this lane renumbered to **v5.65** (PK-confirmed). Orchestrator to finalise.
- **Concurrent EF work** — `lane/ap4-contract-v3` holds 2 unpushed commits touching `tmr-drift-probe` (future merge to sequence via orchestrator).
- **D6 remains an OPEN hard gate** (undefined-denominator; separate lanes). D5 overprint closed.
- The 5 active+approved-not-production-use keys (`au_suburb_texture`, `contract_signing_closeup`, `family_backyard_summer`, `open_home_entry`, `perth_skyline_dawn_moody`) — outside the invariant by the production-use clause; a data-hygiene review (why active+approved but not production-cleared) is a separate item, not a D4 blocker.

## 7. Next recommended step

D4 is closed and continuously probed. Remaining Ultimate gates: **D6 open** (D1/D2/D3/D7 per the DoD). No follow-up required on D4 itself; the probe now catches any future declarative drift automatically (daily cron + on-demand).

---

## 8. Verification

**Verdict:** `Pass` — D4 CLOSED, invariant holds and is machine-checked (`status='ok'` against pushed main); Static Done ratified TRUE. All chain stages clean; both STOPs surfaced + PK-ruled.

## 9. Learning notes

- **Invariant > scalar** for a live-mutated pool: the scalar D4 figure went stale within hours; the membership invariant (must_declare − declared∪exempt) survives churn because deactivating/de-production-using a key removes it from the checked set.
- **Live pre-apply re-derivation is essential:** the packet's "8 undeclared" was stale (a promotion added a 9th); re-checking at apply time caught it — a scalar-count target would have silently failed the invariant.
- **Probe validates against pushed GitHub main** (Option 3): the registry must be on main before the probe relies on it (Apply A before Apply B). An unpushed registry edit reads as drift by design.
- **EF auth:** tmr-drift-probe gates on `Bearer == its injected SUPABASE_SERVICE_ROLE_KEY`; a local service key that works for REST may differ from the function's injected key — trigger via the cron's `net.http_post` (vault secret) instead.
