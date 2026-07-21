CLAIMED cc-0046 · Dashboard Operator-Capability Arc / SLICE 0 (read-only 3-axis matrix) · worktree claude/dashboard-operator-capability-slice-0-k2soo3 · gate 1 (brief gate-1 APPROVED PK 2026-07-21) · 2026-07-21 02:02 +1000 Sydney

# Result — Dashboard Operator-Capability Arc (cc-0046) — SLICE 0: Truth-wired 3-axis capability matrix (READ-ONLY)

**Brief:** `docs/briefs/dashboard-operator-capability-arc-brief-v1.md` (gate-1 APPROVED PK 2026-07-21; external review `f4139c7d` partial→PK, authz resolved role-gated)
**Lane class / tier:** PRODUCT_PROOF · **T2** (read-only dashboard surface; new DB *read* via existing SECURITY-DEFINER `exec_sql` RPC against `ice_ro` views + `t."5.3_content_format"`; behind a feature flag)
**Repo / branch:** `invegent-dashboard` @ `claude/dashboard-operator-capability-slice-0-k2soo3` (base HEAD `fda2b51`)
**Reviewed artifact:** `cc-0046-slice0.patch` (5 files, +850/−13) · **sha256 `d11d612bed834663aff1ad334aac1fd0ce5b4ddd9481c991f9195d068950b1f4`**
**Status:** `Complete` (Slice 0) — **DEPLOYED DARK** (Vercel preview) under the PK-authorized Convention-2 sequence (PK ruling 2026-07-21). **Flag stays FALSE; enabling it is a separate PK gate.**

> **Slice scope:** Slice 0 ONLY (read-only). Slice 0.5 (governance role model) and Slice 1 (governance
> writes) NOT started — Slice 1 is gated on Slice 0.5 per the brief. No governance write, role model, or
> Content Studio edit is present in this change.

---

## 1. What Slice 0 delivers

New read-only surface `/create/capability-matrix`, behind server feature flag
`DASHBOARD_CAPABILITY_MATRIX_ENABLED` (default off): a **platform × format × format-type** capability
matrix + live template inventory + live governance state, sourced from **live CE truth every request**,
superseding the vendored/stale creative-library snapshot and the empty Template Registry. Fully additive.

- **Axes** from live `t."5.3_content_format"`: format (`ice_format_key`) × format-type (`format_category`,
  the NEW axis) × platform (`platform_support`). NULL format-types → explicit "Uncategorised" group (never hidden).
- **Overlays** (live `ice_ro` views): `template_registry_status` (25 templates → coverage counts + inventory
  panel, kills the empty TMR) · `asset_governance_status` (5 rows → per-format "Governed for" + governance panel,
  kills the vendored snapshot). Client names resolved via read-only `list_active_clients` (fallback: `contract_ref` slug).
- **Anti-silent-staleness:** reads bypass the error-swallowing `sql()` helper; each read is a per-source
  discriminated result; a failed read renders an explicit red "LIVE READ FAILED — not shown as empty" card.
  Every read is live (`force-dynamic`/`revalidate=0`) → staleness structurally impossible, failure visibly flagged.

## 2. Commit(s)

- **`f0ab7422`** (dashboard) — `feat(capability-matrix): cc-0046 Slice 0 …` — the exact reviewed 5-file set
  (diff vs `fda2b51` hashes to `d11d612b…`). FF-merged into `claude/dashboard-operator-capability-slice-0-k2soo3`; pushed to origin.
- CE recording commit — this result doc + register pointers (v6.07).

## 3. Files changed

- Dashboard (5): `actions/capability-matrix.ts` (new) · `components/capability-matrix/CapabilityMatrixView.tsx` (new) ·
  `app/(dashboard)/create/capability-matrix/page.tsx` (new) · `components/sidebar.tsx` (mod) · `app/(dashboard)/layout.tsx` (mod).
  `package.json`/`package-lock.json` unchanged (no new dependency).
- CE (recording): this result doc · `docs/00_sync_state.md` · `docs/00_action_list.md` (pointers).

## 4. Actions taken

- Read gate-1-approved brief; confirmed Slice-0-only scope. Claimed **cc-0046** (highest prior cc-0045).
- Mapped dashboard surfaces + data path; validated live data shape via read-only `ice_ro` peeks; confirmed
  `exec_sql` is SECURITY DEFINER (postgres) so the service-role read reaches `ice_ro`/`t` — the only in-scope path.
- Built via `ef-builder` in an isolated worktree, local-only. `tsc --noEmit` + `next build` pass; new dynamic route present.
- Ran full **T2 review chain** (§7). PK ruling GO/dark → executed the Convention-2 sequence (§6).

## 5. Constraints confirmed (brief Forbidden actions)

- No production-governance write — confirmed (surface is SELECT-only + one read RPC; no write affordance exists).
- No S1 write reachable by any user — confirmed (none built; Slice 0.5 role model not needed yet, not built).
- No CE backend/RPC/migration/EF/DB change — confirmed (dashboard code only; no migration; no DB writes).
- Did not touch diverged dashboard `main` — confirmed (dedicated branch; production main/`fda2b51` untouched).
- Did not un-fence/promote any real asset — confirmed (no writes). Vendored registry left untouched (removal = Slice 3).
- No silently-stale visibility — confirmed (fully live + explicit error states).

## 6. Deployment (PK-authorized Convention-2 sequence, 2026-07-21) + verification evidence

**Pre-merge STOP checks (all passed):** patch hash re-derived `d11d612b…` == reviewed; exactly the 5-file set;
dashboard branch at `fda2b51`, main checkout clean; origin had no prior `claude/dashboard-…` branch (base `fda2b51`
present on origin as `feat/creative-library-slot-eligibility-geoscope`) → no origin movement, clean FF path.

- **Merge:** committed the 5-file set on iso branch `claude/cc-0046-slice0-iso` (`f0ab7422`) → `git merge --ff-only`
  into `claude/dashboard-operator-capability-slice-0-k2soo3` (FF `fda2b51..f0ab742`) → **pushed** (branch created on origin).
- **Deploy (flag=false):** the push auto-triggered Vercel deployment **`dpl_7A2VgJexr6uwyciEniPSWogSh3E4`**, state
  **READY**, commit `f0ab7422`, **target `null` (preview)**. Flag `DASHBOARD_CAPABILITY_MATRIX_ENABLED` left **unset**
  (never configured) → evaluates false → dark. I did NOT set the flag.

**Verification (PK step 4):**
1. **Deployed commit identity** — `dpl_7A2Vg…` `githubCommitSha == f0ab7422` (the reviewed commit). ✅
2. **Dashboard health** — preview served **HTTP 200**; unauthenticated request correctly redirected to `/login`
   (`x-matched-path:/login`); existing FrictionFAB renders. Build READY (nodejs functions healthy). ✅
3. **Existing routes unaffected** — production domains (`dashboard.invegent.com`, `invegent-dashboard.vercel.app`)
   still map to the **production** deployment (`main`/`fda2b51`, `dpl_8K9Sq…`); the preview is a separate URL. Change
   is additive (exactly 5 files; branch-warden verified). ✅
4. **`/create/capability-matrix` gated while flag false** — the deployed code (commit `f0ab7422`) gates the page on
   `DASHBOARD_CAPABILITY_MATRIX_ENABLED === "true"` (inert notice otherwise) and the nav item on the same flag; the
   var is newly-introduced by this commit and never configured → unset → gated. **Verification boundary:** full
   *behavioral* confirmation of the inert notice + hidden nav requires an authenticated session on the preview URL
   (all dashboard routes sit behind session auth), which is PK's to perform — I did not authenticate. Code + config-default + isolation give high confidence it is dark. ⚠ (boundary noted, not a failure)
5. **No CE/backend/DB changes** — confirmed: no CE code/migration/EF/deploy; no DB writes (read-only peeks only). ✅

## 7. ICE review chain (T2) — pinned to `d11d612b…`

- **branch-warden → clean / safe.** Exactly the 5-file set, isolated worktree, main checkout clean, origin parity, clean FF.
- **db-rls-auditor → clean / pass.** All four interactions read-only; both `ice_ro` views secret/PII-free by explicit
  column list; `t."5.3_content_format"` projection non-secret (omits `advisor_description`); PGRST106 N/A (RPC path);
  `list_active_clients` service-role-only `{id,name}`. `exec_sql`-as-postgres reach = pre-existing fact, observation-not-defect.
- **dashboard-ia-lint → WARN** (no BLOCK; no governed invariant violated). Two advisory/reversible WARNs — nav word
  "Capability" adjacent to "Format Capability"; no primary-question marker (no page in the tree has one). Handoff:
  stale IA §2.1 route inventory (pre-existing → register-reconciler).
- **external review (`ask_chatgpt_review`) → partial → auto-escalated to PK** (`review_id bd7a1911`; hash `d11d612b…`).
  **No concrete defect.** Two `missing_evidence` points, both answered: direct-URL gated via inert notice; `list_active_clients` PII cleared.

**PK product rulings applied:** keep nav label "Capability Matrix" (no relabel, no hash re-pin); primary-question
marker deferred; IA §2.1 reconciliation deferred to register-reconciler; neither advisory folded into Slice 0.

## 8. Open issues / next gate

- **Flag enable is the next PK gate** — `DASHBOARD_CAPABILITY_MATRIX_ENABLED=true` must NOT be set without separate PK authorization.
- Behavioral confirmation of the gated state on the preview needs an authenticated session (PK) — see §6.4 boundary.
- Slice 0.5 (governance role model) and Slice 1 (governance writes) remain **not started**; S1 gated on S0.5.

## 9. Stop condition

Per the PK-authorized sequence: merged, pushed, deployed **dark** (preview), verified. **STOPPED — reporting the
deployment evidence at the next PK gate.** The flag stays FALSE; enabling it, and any subsequent slice, require fresh PK gates.
