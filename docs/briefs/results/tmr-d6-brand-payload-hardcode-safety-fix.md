CLAIMED v5.62 · TMR-D6-BP (D6-5 brand-payload fail-closed safety fix) · isolated worktree wt-tmr-d6-bp → committed 75c72fa on main · gate: DEPLOYED + live-proven, recording · 2026-07-17T05:42:03Z

# Result — TMR-D6-BP: brand-payload-hardcode safety fix (D6-5 unit)

**Completed:** 2026-07-17 Sydney
**Lane:** TMR-D6-BP · **T3 · SAFETY_GATE** · brief `docs/briefs/tmr-d6-brand-payload-hardcode-safety-fix-brief.md`
**Outcome:** ✅ **COMPLETE — deployed and live-proven.** image-worker `v3.25.0 → v3.26.0`. The fail-OPEN brand-payload hardcode (D6-5) is converted to a fail-CLOSED identity guard; no PP brand literal can reach a non-PP render.
**Deployed commit:** [`75c72fa`](https://github.com/Invegent/Invegent-content-engine/commit/75c72fa) on `main` (pushed).
**Register version:** v5.62 (claimed; head was v5.61, v5.62 open, no competing stub — CCF-02 claim protocol satisfied).

> **Naming:** PK's lane label "D6-4" = the **4th hardcode class** (`brand-payload-hardcode`); the site is **unit D6-5** in the denominator of record `docs/briefs/tmr-d6-chokepoint-inventory-v2.md` §3. Same defect.

---

## 1. Defect fixed

`supabase/functions/image-worker/branch_b_proof.ts` → `buildProofFieldsFromDraft` unconditionally emitted the Property Pulse brand payload `category:'PROPERTY NEWS'` (line 50) and `footer:'propertypulse.com.au'` (line 55), mapped into the live render `modifications` (`CategoryBadge.text`/`Footer.text` at `b1_production.ts:184,189`). It was the only D6 chokepoint that failed **OPEN** — a non-PP governed render would silently carry PP branding while passing every existing gate. Its sole production caller (`index.ts:803`) runs inside the PP-only `isB1GovernedImageQuote` gate (`index.ts:793`), so the leak was **latent/structural** (not live), realised only if that gate is later generalised by Spine Gen v2.

## 2. Fix — Approach A (fail-CLOSED), PK-ratified

Inside `buildProofFieldsFromDraft`, after the existing `image_headline` hard-gate, a guard throws `brand_payload_non_pp_fail_closed` when `(draft?.client_id ?? '') !== B1_GOVERNED_CLIENT_ID` (imported from `./b1_production.ts:28`, the PP UUID `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`). Strict equality against a single constant → the set of inputs that pass is exactly `{PP client_id}`; everything else (any other id, `null`, `''`) fails closed → the caller's per-draft catch → `image_status='failed'` (fail loud). PP output is byte-identical (guard is a no-op pass-through for the PP client; return values unchanged). This converts a fail-OPEN brand-payload hardcode into a fail-CLOSED identity guard — the safety goal.

**Explicitly NOT done (Spine Gen v2, PK-held):** no gate rewire, no `B1_GOVERNED_CLIENT_SLUG` change, no `select_template`/`resolve_slot_assets` change, no brand-profile-derived `category`/`footer` (the D6-5 *elimination* end-state per inventory §6), no `creative_contract.ts` de-dup, no video/ai-worker change.

## 3. Diff — exactly 3 files, +45/−5

| File | Change |
|---|---|
| `supabase/functions/image-worker/branch_b_proof.ts` | Import `B1_GOVERNED_CLIENT_ID`; fail-closed guard after the headline gate. |
| `supabase/functions/image-worker/branch_b_proof_test.ts` | 4 field-shaping success tests moved from placeholder client_ids (`'c1'`/`null`/`'c'`) to `B1_GOVERNED_CLIENT_ID`; new test asserts non-PP client_id (`UUID`/`null`/`''`) throws `brand_payload_non_pp_fail_closed`; headline-gate + `formatProofDate` tests unchanged. |
| `supabase/functions/image-worker/index.ts` | **Cosmetic** `v3.25.0→v3.26.0` header + `const VERSION` bump only (drift-gate reclassification; no logic change). |

**Pinned diff sha256:** `51462ca1929137ddc2edb9fec566fc61c3fc110a4c8643e9d68814eadae1352f` — verified identical at: worktree build · staged (pre-commit) · committed (`ac412dc..75c72fa`). The external review is valid only for this hash.

## 4. Gate chain (T3, full)

- **Gate 1 (brief):** PK approved; Approach A elected.
- **ef-builder:** isolated worktree `wt-tmr-d6-bp` (base `ff796122`), local-only. Tests: `branch_b_proof_test.ts` **7/7**; full image-worker suite **110/110** (`--allow-read`). `deno check` clean, no circular import.
- **branch-warden #1** (post-build): `safe` — 3 files `M`, +45/−5, detached, no stray commits.
- **branch-warden #2** (pre-commit @ `ac412dc`): `safe` — main image-worker tree clean; explicit pathspec is the complete-and-only image-worker change; v5.61 (`ff796122→ac412dc`) touched **0** image-worker files (disjoint), so the base was still current.
- **External review** `43b47b39-f88b-46bf-9d33-8445b6b6c6c0` (action_type `ef_deploy`, hash-pinned): **partial → escalate_explicit_flag** (medium risk, high confidence). **No concrete defect, no failed claim** — generic "more edge-case testing" + deploy-approval request. Triage: **policy_decision** (primary) + missing_evidence (retired: strict-equality guard is complete by construction) + runtime_verification_required (post-deploy checks below). **PK ruled it a policy decision, not a blocker** — approved as-is.
- **Gate 2 (deploy):** PK-authorised Convention-2 sequence (hash-pinned, STOP conditions). Committed by explicit pathspec (`75c72fa`, no trailer per house style) → pushed (`ac412dc..75c72fa`, parity 0/0) → **deploy run by PK** (`supabase functions deploy image-worker --no-verify-jwt`; the deploy command is fenced from the orchestrator — deploy stayed manual, as designed).

## 5. Live deploy proof (read-only, post-deploy)

- Deployed source `const VERSION = 'image-worker-v3.26.0'` ✅ (was `v3.25.0`).
- Fail-closed guard `brand_payload_non_pp_fail_closed` present in the deployed bundle ✅.
- `verify_jwt: false` ✅ (did **not** flip; `--no-verify-jwt` honoured; Supabase deploy counter → v92).
- **Drift refresh** (`POST /functions/v1/drift-check?write=true&slug=image-worker`, `drift-check-v1.0.8`): `ok:true`, row written (scan `20441baa-7409-4e87-b371-c632ff44385e`), **severity `none`, 0 errors, 0 security-definer risk**. Reported class `A-LE`.

**All PK STOP conditions held throughout:** diff hash matched at every checkpoint · HEAD never moved off the approved base before commit · no intervening image-worker code · branch-warden `safe` (×2) · post-deploy version == v3.26.0 · verify_jwt stayed false.

## 6. Open notes / carries (non-blocking)

- **Drift class `A-LE` vs anticipated `B-FD`.** The brief (per memory `drift-check-hashes-only-entrypoint`) anticipated the paired `index.ts` bump would land the class as `B-FD`; the refreshed row reports `A-LE` with **severity `none`, 0 errors**. The deploy is independently proven by the live bundle (§5), so this is a bookkeeping/taxonomy observation, not a functional gap. **Recommend reconciling the memory note's A-LE/B-FD semantics against `drift-check-v1.0.8`** (the severity-none signal suggests A-LE-severity-none is the benign in-sync state, not a blocked state) — a small future read-only check, not a lane blocker.
- **D6-5 *elimination* (spine-derived payload)** remains owned by **Spine Gen v2** (PK-held): `category` from format taxonomy, `footer` from `c.client_brand_profile`. This lane delivered only the fail-closed safety net.
- **D7 second-brand exit test** (`docs/briefs/tmr-d7-second-brand-exit-test-v1.md`, C3): the guard satisfies the "no PP string in emitted `modifications` for a non-PP client" principle at the builder boundary (throws before `modifications` are built). D7 itself stays gated on D5 + the full predicate set.
- **D6 remains an OPEN hard gate** — this closes the fail-open severity of one unit (D6-5) with a safety guard; it does not close D6.

## 7. Boundaries honoured

Isolated worktree; local-only build; explicit-pathspec commit (no sweep of the repo's other unrelated dirty/untracked paths); deploy run by PK (fenced from orchestrator); no register/DoD/CLAUDE.md edit inside the code commit (recorded separately here + pointer); no other D6 unit, no video/ai-worker, no DB write, no migration touched; PP rendered output unchanged.
