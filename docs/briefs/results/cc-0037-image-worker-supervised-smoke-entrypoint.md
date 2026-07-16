# Result cc-0037 — image-worker supervised smoke entrypoint

**Brief file:** `docs/briefs/cc-0037-image-worker-supervised-smoke-entrypoint.md`
**Executed by:** Claude Code (orchestrator + ef-builder), PK gates
**Completed:** 2026-07-16 Sydney

---

## 1. Result status

`Complete` — deployed to production (image-worker **v3.25.0**) and live-verified. A supervised, non-production render surface for governed PP `image_quote` cards now exists again. **PK visual verdict: PASS.**

## 2. Commit(s)

- `7d7cb4d` — feat(image-worker): cc-0037 v3.25.0 — supervised `governed_image_quote_smoke` entrypoint (3 files).

(Pushed to `origin/main`, clean fast-forward, no sibling commit swept.)

## 3. Files changed

- `supabase/functions/image-worker/index.ts` — modified (new v3.25.0 banner above cc-0033a's v3.24.0 block; `VERSION`→v3.25.0; `EXPECTED_SMOKE_PROVIDER_TEMPLATE_ID` + `SMOKE_SEED` consts; the `governed_image_quote_smoke` mode branch after the four 410 guards, before production selection; import merge).
- `supabase/functions/image-worker/b1_production.ts` — modified (additive: `B1_SMOKE_LABEL='creative_library_b1_smoke'` const + `assertExpectedProviderTemplate()` pure fn).
- `supabase/functions/image-worker/b1_production_test.ts` — modified (merged import; +4 hermetic smoke tests appended after cc-0033a's guard tests).

## 4. Actions taken

- **Rebased the parked cc-0037 change** (hash `010abb01…`, cut against the pre-cc-0033a base `8199153`) onto the current post-cc-0033a `main` via ef-builder in a fresh isolated worktree. Resolved three collisions with cc-0033a: (i) version renumbered v3.24.0 → **v3.25.0** throughout (cc-0033a shipped v3.24.0); (ii) `b1_production_test.ts` import + test-append MERGED with cc-0033a's guard tests (not clobbered); (iii) confirmed the `computePropsHash(plan.modifications as Record<string,string>)` cast still compiles against cc-0033a's widened `…|null` type. The smoke now legitimately renders WITH the layout guard in `plan.modifications` — intended (it is a headline-overprint probe).
- **The mode branch** (`body?.mode === 'governed_image_quote_smoke'`): keeps `assertHeadlineWithinGate` but returns a clean **422** `headline_gate_rejected` on a gate throw (so a supervisor can probe the gate); OQ-1 **selector-derived bind** — calls the same read-only `select_template` + `buildTmrRenderPlan` production uses, then **asserts** `providerTemplateId === '48cba556…'` via `assertExpectedProviderTemplate()` and throws on drift (converts the silent C4 provider-drift hazard into a loud failure); asserts governed logo+background reachability; renders to `post-images/_smoke/governed_image_quote_v1.jpg` with `postDraftId=null, clientId=null, logMustSucceed=true`; writes its render-log row with the distinct **`B1_SMOKE_LABEL`**. Returns in every path — no fall-through to production selection.
- **Local checks:** `deno check` clean (index.ts + b1_production.ts); `b1_production_test.ts` **30/30** (26 cc-0033a incl. layout-guard cases + 4 cc-0037 smoke); `creative_contract_test.ts` 9/9.
- **Review chain (T3, full re-run — the prior review `3ee6c2bc`/`010abb01…` voided on rebase):** branch-warden **safe** (exact 3-file set, isolated worktree, no R4 sweep); db-rls-auditor **pass**; external review re-pinned to the new diff `8e884f5e…fe…` (`review_id 6285ac78`, agree/medium/high).
- **db-rls-auditor confirmed live:** OQ-1 assert holds — all `select_template('property-pulse', {null,facebook,linkedin}, 'image_quote', NULL, seed)` calls returned `status='ok'`, `provider_template_id=48cba556…`, `slot_resolution.status='ok'` with non-null Background/Logo (winner platform- and seed-invariant, `assignment_status='production_proven'`). Smoke-row invisibility confirmed against all 4 live `m.post_render_log` readers (stamper triple-fenced; capability pyramid inner-joins `m.post_draft`, dropping the null-draft row). `post-images` bucket public, no storage RLS referencing it. No DDL/DML/GRANT required.
- **Deploy (PK-gated Convention-2 sequence):** committed + pushed, refreshed drift (A-LE → **B-FD**), deployed via `scripts/safe-deploy.sh image-worker --allow-warn`. Verified: `VERSION=image-worker-v3.25.0`; `verify_jwt=false` (no-auth GET → 200); post-deploy drift clean (`deploy_version 3.25.0`).
- **Post-deploy live proof (success criteria 1–3):** `POST {"mode":"governed_image_quote_smoke"}` with `x-image-worker-key` → **200**, `provider_template_id=48cba556` (OQ-1 assert passed live), `render_spec_label=creative_library_b1_smoke`, `storage_url=…/_smoke/governed_image_quote_v1.jpg`. Rendered a clean governed card (3-line headline, no overprint — the layout guard is active). db read-back: exactly one new `m.post_render_log` row with `post_draft_id IS NULL` + label `creative_library_b1_smoke`; **zero** `m.post_draft` writes. **PK visual verdict: PASS.**

## 5. Constraints confirmed

- No `m.post_draft` read/insert/update; no `image_url`/`image_status` write — confirmed (postDraftId/clientId null throughout).
- No publish, no scheduler enqueue, no slot fill — confirmed.
- No production-labelled render-log row from the smoke — confirmed (distinct `creative_library_b1_smoke`).
- No read or flip of `c.client_creative_governance.enabled` — confirmed.
- No DDL/DML/GRANT/migration; no dashboard change; no un-retiring of any 410 guard — confirmed.
- No change to the production `image_quote` branch, `buildTmrRenderPlan`, `select_template`, the stamper, or the cc-0033a layout guard — confirmed (additions land beside/before them; existing lines byte-unchanged apart from the import line).
- Deploy carried `--no-verify-jwt` (via the governed gate); `verify_jwt=false` confirmed post-deploy.

## 6. Open issues

- **`record_tmr_proof_event` carry (`task_75ddb5c5`) — STILL OPEN** (report item, not introduced here, not a blocker). It validates `platform_render` evidence on `status='succeeded'` ALONE (no label / no non-null-draft fence), so a smoke row *could* be accepted as proof **if a caller explicitly passed its `render_log_id`** with `proof_type='platform_render'`. Mitigants: it is not an autonomous reader (only validates a caller-supplied reference), and the cc-0037 smoke path never calls it — so the smoke cannot self-promote. Recommendation (future small lane): add a `label NOT LIKE '%_smoke'` and/or `post_draft_id IS NOT NULL` fence to that validation branch.
- **Carry C5** (from cc-0033a): the smoke asserts `providerTemplateId`, never geometry, so an admissible ≤90-char single unbreakable-token headline could render broken and still return `ok:true`. Pre-existing, documented; a separate input-gate lane if ever needed.
- **Drift-gate coverage gap** (`drift-check` hashes only `index.ts`): still open as its own recommended lane (recorded in memory `drift-check-hashes-only-entrypoint`). This lane changed `index.ts`, so it was deployable without the workaround cc-0033a needed.

## 7. Next recommended step

Both TMR Image FixUp lanes (cc-0033a + cc-0037) are closed. The image lane now has a supervised smoke surface for future static-card verification. Optional backlog lanes: the `record_tmr_proof_event` fence and the drift-gate coverage-gap fix. cc-0033b (contract `limits` + writer budget) remains unopened.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Output matched the brief and Gate-1 decisions (OQ-1 option B selector-derived bind + assert; OQ-2 distinct smoke label; OQ-3 keep gate, surface 422; OQ-4 bucket handoff satisfied).
- Constraints respected; change set was exactly the three named files; the four 410 guards and the production path are byte-unchanged.
- Success criteria 1–8 met; live smoke returned 200 with a viewable `_smoke/` URL, null-draft smoke-labelled render-log row, zero post_draft writes.
- **PK visual verdict: PASS.**
- Known carry (`record_tmr_proof_event`) surfaced and recorded, not a blocker.

## 9. Learning notes

- A parked patch cut against an old base does not `git apply` onto a moved base — it must be re-applied semantically. The version-number collision (both cc-0033a and cc-0037 wanted v3.24.0) is a predictable consequence of serialized same-file lanes; the second to land renumbers.
- The selector-derived bind (OQ-1 B) is the right pattern for a smoke surface: it exercises the real governed path and converts silent provider drift into a loud, immediate failure — the exact hazard that retired the old hardcoded `template_smoke`.
- Reusable: the same governed drift gate + Convention-2 deploy sequence used for cc-0033a applied cleanly here; because this lane changed `index.ts`, drift reclassified to B-FD without the entrypoint-bump workaround cc-0033a required.
