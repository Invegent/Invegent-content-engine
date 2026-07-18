CLAIMED v5.68–v5.69 · tmr-d7-second-brand-governed-image-proof · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK reconciliation commit (Convention-2, push authorized post-branch-warden) · 2026-07-18T01:17Z

# Result — TMR D7 · NDIS Yarns second-brand governed-image proof

**Status:** IN PROGRESS — build-out lane open (steps 2–7); every apply/flip/deploy/render is a PK gate.
**Brief:** [`docs/briefs/tmr-d7-second-brand-exit-test-v1.md`](../tmr-d7-second-brand-exit-test-v1.md) + [`docs/briefs/spine-gen-v2-image-path-rewire-brief-v1.md`](../spine-gen-v2-image-path-rewire-brief-v1.md) (N1–N7).
**Lane class / tier:** PRODUCT_PROOF · steps span T2 (declarative/dark-additive) → T3 (asset promotion · code+deploy · governance flip · render).
**Orchestration:** PK is driving this lane through the TMR Lane Orchestrator (confirmed 2026-07-18); orchestrator coordination carries PK intent; applies remain PK gates.

## Goal
Prove NDIS Yarns (`client_id fb98a472-ae4d-432d-8738-2273231c1ef4`, slug `ndis-yarns`) renders a governed `image_quote` through the live Spine Gen v2 path (image-worker v3.28.0), FB-first — the D7 second-brand exit test. The code is now brand-agnostic; NDIS **fails closed** until its data + vendored contract land (N1–N7).

## Blocker state (2026-07-18)
- **G0a — PP no-regression render proof through the rewired path: ✅ DB-CONFIRMED.** PP `image_quote` governed render `render_log 028e7e26-646b-444e-ab8d-b2342404813c` (draft `bf404cf1-5e41-48b2-88e4-140e0916183d`), 2026-07-17 13:30 UTC, `status=succeeded`, `selector_status=ok`, resolved PP's **own** governed Background (`bg_pp_modern_home_exterior_front`) + Logo (`pp_logo_primary`) on the generic winner `generic_market_insight_card_1x1_v1`. Proves Spine Gen v2 (D6-1/2/3/4) works on PP with no wrong-brand bleed. *(Payload category/footer + no-overprint/signage are the orchestrator's visual verdict, not DB-observable from `post_render_log`.)*
- **G0b — D6-5 brand-payload de-hardcode: ✅ DEPLOYED** (image-worker v3.28.0, register v5.67, origin `c15245a`; verified on origin/main, parity 0/0).

## Steps (owner: this lane = steps 2–6 + 7; step 0 = `TMR-fix-g0b` [done]; step 1 = `TMR-supp-ndis-bg`)

### Step 2 — NDIS logo promotion (N4) — ✅ APPLIED (terminal)
PK visual selection gate: **#1 full-colour master `d1b10010`** (accept reconstruction; null scope). Applied 2026-07-18 via `execute_sql` (reviewed hash `55d8c439…`; db-rls clean; external `abdc6eec` agree).
- `d1b10010` → `is_active=true, approved=true, approval_status='governed', production_use_allowed=true`; provenance keys preserved; forward-only `promoted_by` added.
- Post-verify (all PK checks passed, no STOP tripped): `UPDATE 1`; NDIS eligible logos = **1** (`d1b10010`); PP pool unchanged = **8**; NDIS backgrounds = 0; NDIS governance = 0; no render triggered; rollback (re-fence) ready.
- Resolver fact recorded: `resolve_slot_assets` Logo eligibility = `is_active` + `asset_meta.approved=true` + license + `bucket='brand-assets'` + platform_scope-passes; `production_use_allowed`/`approval_status` are **not** consulted. Logo pick = `v_elig_logo->0` (first by `created_at ASC, asset_id ASC`) — single-variant promotion = deterministic pick.
- **Inert as designed:** no NDIS governance row + no assignment ⇒ governed gate resolves legacy for NDIS ⇒ this logo renders nothing yet.

### Step 3 — NDIS contract + declarative registry (N7) — N7a COMPLETE · N7b ENVELOPE
**Scope correction (material):** N7 is TWO artifacts; the render-critical one is a code+deploy lane, not doc authoring.
- **N7a — declarative `docs/creative-library/ndis-yarns.json`** — ✅ COMPLETE (registry v0.1; all objects `candidate`/`unproven`; zero proof claimed). `creative-graph-auditor` **PASS** (normalized clean; FAIL→fixed: added `validator_policy`, downgraded family/variant `proof_posture`→`candidate`). NOT read at runtime (runtime-import guard). Brand values DECIDED (PK 2026-07-18): `category='NDIS UPDATE'`, `footer=''` (intentional resolved blank), `location=''`.
- **N7b — vendored `CreativeContract` in `creative_contract.ts` ×2 (image-worker + ai-worker)** — ✅ **DEPLOYED (PK-run 2026-07-18).** image-worker **v3.29.0** + ai-worker **v2.19.0** LIVE. Chain: ef-builder (8 files; image 22/22, ai 20/20, deno check clean, PP byte-identical, parity preserved, no video-worker) → branch-warden safe (sole flag = benign origin move `c15245a→bbc3c84`, docs-only) → external review **agree/low/high** (`review_id 99cda703`, pinned diff sha256 `14e24dd0…`) → PK deploy gate. **Deployed-artifact verified** on BOTH: `NDIS_IMAGE_QUOTE_NEWS_CARD_V1` + `ndis_yarns.image_quote.news_card` + client_id + `NDIS UPDATE` present, version markers v3.29.0/v2.19.0 present; boot health 200, no worker errors. NDIS contract now **resolves** (no more `brand_payload_contract_unresolved`); PP byte-identical. Envelope: `docs/briefs/tmr-d7-n7b-vendored-contract-envelope-v1.md`.
  - **Source-of-truth reconciliation PENDING (PK gate):** deployed = worktree `worktree-agent-a9d61219e36966171` (v3.29.0/v2.19.0); `main` still `c15245a` (v3.28.0/v2.18.0), `origin/main` at `bbc3c84`. FF `main`→`bbc3c84` (benign docs-only) → merge the worktree branch → push (PK) → worktree teardown. N7b deploy = its own register version (claim v5.69 via orchestrator).

**Guard de-risk (source-verified):** `branch_b_proof.ts:83` checks `category===undefined || footer===undefined` (strict), and `fixedValue('footer')` returns `''` for a `{field:'footer',value:''}` entry → `''` passes (RESOLVED, not `brand_payload_contract_incomplete`). **No guard-logic fix — N7b is data-only.** Clean footer *suppression* (no divider/orphan spacing) is a RENDER property → step-7 visual gate (generic template HAS a dynamic `Footer` element; PP's live empty `Location=''` on the same template supports it; confirm `Footer` specifically). Hermetic empty-footer test required in N7b.

**Brand decision (PK 2026-07-18):** category `NDIS UPDATE` (fixed v1 badge); footer explicitly BLANK `''` (no URL/handle/name/tagline); backgrounds = `brand_texture-01` sole P0.

### Step 4 — assignment (N2) — BLOCKED (needs N5 bg eligible + N7)
Bind NDIS → generic `generic_market_insight_card_1x1_v1` (provider `48cba556…`, registry `0e006c5c…`) at `visually_approved`+. T3.

### Step 5 — visual-proof event (N3) — BLOCKED (mirror PP bootstrap)
Controlled proof render → PK visual PASS (this is where **P8 overprint is re-evidenced on NDIS's stat-led corpus** — a PP closure does not transfer) → write assignment + proof event. T3.

### Step 6 — governance flip (N1) — BLOCKED
INSERT `(NDIS, image_quote, enabled=true)` ONLY after N2–N5/N7 ready + fail-closed verified. T3.

### Step 7 — NDIS governed proof render — BLOCKED on steps 1–6 (G0a/G0b now clear)
FB-first. Pass = `status!=failed` + `selector_status=ok` + emitted `modifications` with NDIS's own `asset_id`s and **no PP string** + PK visual PASS. Apply the text-safety crop-proof (no legible signage) before the visual gate.

### Step 1 (consumed) — `TMR-supp-ndis-bg` — P0 set FENCED; (c) intake ENVELOPE
PK decision (2026-07-18): **`brand_texture-01` = SOLE P0 background** for the FB-first proof; `civic_neutral-04` crop routed back to `TMR-supp-ndis-bg`.
- **(c) fenced intake — ✅ APPLIED (PK-approved 2026-07-18).** Envelope `docs/briefs/tmr-d7-c-ndis-background-intake-envelope-v1.md`. Upload → `brand-assets/NDIS_Yarns/Backgrounds/bg_ny_brand_texture_navy_waves.jpg` (x-upsert:false, HTTP 200); pre-upload byte-verify + public-URL sha256 both == manifest `40fb69b4…` (57991 bytes, 1920×2877). Fenced INSERT via PL/pgSQL `DO` block with in-txn fail-closed assertions (fence-state + pool-neutrality) → asset_id `225eb232-e4d0-49ec-ad5d-f0e34d4bcfd0`. Post-verify: rowcount 1 · all 4 fences OFF (is_active/approved/production_use_allowed=false, approval_status=intake_candidate) · NDIS eligible-bg still **0** · PP eligible pool **22 unchanged** · no STOP tripped. **db-rls-auditor PASS** (zero must-fix; RLS/grants intact, not anon-reachable, resolver double-fences, pool-neutral, no dup/upsert). Secret rider (R2): service_role key used for upload — env-conveyed, never in transcript, USE-only (no posture change).
- **NOTE:** the uploaded asset is the source-identical uncropped portrait (1920×2877) — consistent with PP (generic template Background covers/crops to 1:1); pre-crop optional (`TMR-supp-ndis-bg`).
- **Promotion (un-fence → eligible) = SEPARATE PK gate** (crop-proof/visual, sets authoritative `safe_for_text_overlay`). Surface DISJOINT from N7b → was parallel-safe.

## Register pointers (DRAFT — hold for PK commit; claimed v5.68 via orchestrator)
Commit message per PK instruction; no trailer unless PK asks; push only on explicit PK instruction. Re-verify v5.68 free at commit.

**sync_state (new head, above v5.67):**
> `▶ v5.68 — TMR D7 NDIS second-brand governed-image proof: BUILD-OUT OPEN (T3 lane · PRODUCT_PROOF) — record: docs/briefs/results/tmr-d7-second-brand-proof-v1.md.`
> `· Step-2 logo (N4) d1b10010 PROMOTED eligible (PK visual pick #1 full-colour; reviewed 55d8c439…; PP pool unchanged 8; NDIS inert until governance). · G0a PP no-regression render 028e7e26/draft bf404cf1 selector_status=ok (DB-confirmed; payload/visual = orchestrator verdict). · Brand values DECIDED (PK 2026-07-18): category='NDIS UPDATE', footer='' (resolved blank), location=''. · N7a ndis-yarns.json v0.1 → creative-graph-auditor PASS (all unproven, zero false proof). · N7b vendored-contract ENVELOPE at PK Gate-1 (render-critical, T3 code+deploy, fail-closes brand_payload_contract_unresolved; footer='' guard-verified as resolved). · (c) bg intake ENVELOPE (brand_texture-01 sole P0). · Steps 4–7 gated on N7b deploy + bg promotion + assignment/proof/flip. Video untouched.`

**action_list (current marker):**
> `- v5.68 — TMR D7 NDIS second-brand proof BUILD-OUT OPEN: step-2 logo d1b10010 promoted (PK pick #1); G0a confirmed (028e7e26); brand values decided (category='NDIS UPDATE', footer=''); N7a PASS; N7b + (c)-bg envelopes staged (N7b at PK Gate-1); steps 4–7 gated → docs/briefs/results/tmr-d7-second-brand-proof-v1.md`

## Non-claims
Nothing deployed/flipped/rendered by this lane. NDIS has produced NO governed render and NO publish. G0a is a PP proof (DB-confirmed pipeline; payload/visual = orchestrator verdict). The N7a skeleton claims zero proof. Video path untouched.
