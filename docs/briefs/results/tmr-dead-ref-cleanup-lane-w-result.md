CLAIMED v5.07 · tmr-dead-ref-cleanup-lane-w · ice-wt-lane-w · deployed · 2026-07-05T07:15Z

# Result — TMR Dead-Reference Cleanup — Lane W — Worker Dead-Code Removal

**Governing plan:** `docs/briefs/tmr-dead-reference-cleanup-plan-packet.md` (final lane; D → B → W all now complete) · **Gate:** PK conditional sequence on pin `17e2ed3a…` (T3 · SAFETY_GATE) · **Completed:** 2026-07-05
**Status:** ✅ MERGED + BOTH WORKERS DEPLOYED + VERIFIED — **the cleanup plan is closed end-to-end; zero STOPs tripped (one pre-STOP self-caught, see §3)**

## 1. What shipped

All four provider-dead opt-in surfaces retired: image-worker `tmr_template_smoke` (490ad9ea) · `template_smoke` (48cba556-as-16:9 — the silent-wrong case, C4) · `creative_library_manual_render` + `creative_library_draft_proof` (fb9820f8/dead impls, D-W2) · video-worker Gate-D2 smoke (bc32f52f). Each mode now returns an explicit **HTTP 410** `<mode>_retired` guard (post-auth, pre-DB/provider, static body citing TMR-GOV-PROVIDER-1) — the D-W1 design, which also **closes a pre-existing fall-through hazard** (a mode-bearing body with a mismatched template previously dropped into the production draft-selection loop). Dead modules/exports removed on a proven import graph; live survivors: `computePropsHash`, `buildProofFieldsFromDraft`(+deps), `composeRenderSpec` (builder-discovered LIVE production code — video `template_smoke.ts` trimmed, not deleted). Contract pins untouched (D-W3 → contract v3 carry). Net −751 lines.

## 2. Identity + verification

Pin **`17e2ed3a742707fa2c5b1731bbaab73947b3c6dc692b8ac80fd67c912e4b93fd`** = original commit `5f4f9be` = rebased commit **`89088eb`** (re-hash after rebase onto `5c137a6`: exact match → warden/auditor verdicts carry by content identity). Pushed `5c137a6..89088eb`. Deploys from the lane worktree: **image-worker fn88\* v3.23.0** (\*fn87→next; GET-verified `image-worker-v3.23.0`) · **video-worker v3.4.0** (was fn56/v3.3.1; GET-verified), both `--no-verify-jwt`. **410 probes:** authenticated retired-mode POSTs → exact `tmr_template_smoke_retired` / `template_smoke_retired` bodies, HTTP 410, **zero side-effects** (0 render_log rows, 0 failures post-deploy). Production guarantee = the triple byte-identical proof (§4); natural-render observation continues at tonight's cohort.

## 3. Sequence notes (honest record)

- Origin had advanced 2 docs-only commits past the lane base → rebased, re-hash exact, no STOP.
- Local shared main carried a parallel session's unpushed docs commit → lane pushed via direct refspec (`89088eb:main`), leaving their work untouched (they rebased themselves minutes later).
- **Self-caught deployed-artifact mismatch:** first image-worker deploy ran from the shared checkout (which lacked the lane commit) — the mandatory version probe caught it instantly (still v3.22.0), redeployed from the lane worktree, verified v3.23.0. The sequence's named STOP check worked exactly as designed; no wrong code ever served a request (the shared checkout's code was the previous production version, briefly redeployed as-is).

## 4. Chain (all on pin `17e2ed3a…`)

deno **78/78 + 39/39** (deltas = exactly the deleted dead-surface tests) + `deno check` clean → **security-auditor GREEN zero-remediation** (production tails hash-identical old-694→EOF / old-766→EOF; guards post-auth pre-DB, no leakage; retired-mode caller census: manual/PK-supervised only) → **branch-warden safe** (isolation, exact 11-file set, independent hunk-boundary enumeration: last changed old lines 693/765, `renderUploadAndLog` untouched; CRLF-vs-git-object nuance resolved) → **external review agree/proceed zero-pushback** (`review_id 48bf856c-fbae-41ce-ae5a-442804e716b1`).

## 5. Cleanup plan closure + carries

**D → B → W all complete:** CE declarative registry truthful (v0.4, `b9d02ca`) · dashboard truthful (0856dcb, Vercel prod) · workers clean (89088eb, both deployed). End-state grep holds: dead IDs survive only in the two D-W3 contract pins, the LIVE 48cba556 winner fixture, historical changelogs/docs, and retirement annotations. Carries: contract v3 (`policy: tmr_spine`, removes the last fb9820f8 pins) · periodic provider-inventory drift probe · dashboard 5-key vendor already dated by the day-hero promotion (next registry pass) · optional `template_smoke.ts`→`render_spec.ts` rename (video) · rollback identities recorded (image v3.22.0/fn87 · video v3.3.1/fn56; restores code, not function).

## 6. Boundaries held

Only the 11 approved files · production sections byte-identical (proven 3 ways) · no DB/storage/registry/dashboard/contract change · D6 artifact + queued publish untouched · ai-worker untouched.
