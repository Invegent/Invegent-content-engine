CLAIMED cc-0046 · Dashboard Operator-Capability Arc / SLICE 0 (read-only 3-axis matrix) · worktree claude/dashboard-operator-capability-slice-0-k2soo3 · gate 1 (brief gate-1 APPROVED PK 2026-07-21) · 2026-07-21 02:02 +1000 Sydney

# Result — Dashboard Operator-Capability Arc (cc-0046) — SLICE 0: Truth-wired 3-axis capability matrix (READ-ONLY)

**Brief:** `docs/briefs/dashboard-operator-capability-arc-brief-v1.md` (gate-1 APPROVED PK 2026-07-21; external review `f4139c7d` partial→PK, authz resolved role-gated)
**Lane class / tier:** PRODUCT_PROOF · **T2** (read-only dashboard surface; new DB *read* via existing SECURITY-DEFINER `exec_sql` RPC against `ice_ro` views + `t."5.3_content_format"`; behind a feature flag)
**Repo / branch:** `invegent-dashboard` @ `claude/dashboard-operator-capability-slice-0-k2soo3` (base HEAD `fda2b51`)
**Reviewed artifact:** `cc-0046-slice0.patch` (5 files, +850/−13) · **sha256 `d11d612bed834663aff1ad334aac1fd0ce5b4ddd9481c991f9195d068950b1f4`**
**Status:** `Complete` (Slice 0) — **ACTIVATED / LIVE IN PRODUCTION** (`dashboard.invegent.com` @ `f0ab7422`, deployment `dpl_6KgpPCbNkce…`; `DASHBOARD_CAPABILITY_MATRIX_ENABLED=true`, Production scope). PK set the flag and redeployed; orchestrator verification read-only. Authenticated dark pre-check + post-activation verification both PASSED (§6d). Preview remains dark (flag not set there). **Two advisories raised, not acted on — §6d / §8.**

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

### 6b. Production promotion (PK ruling #2, 2026-07-21 — after PK's authenticated preview eyeball PASSED)

PK performed the authenticated **preview** eyeball and confirmed PASS: `/create/capability-matrix` showed only
the inert "Capability Matrix is not enabled in this environment." notice, and the CREATE nav had **no**
"Capability Matrix" item (screenshots). Then, per the bounded sequence:

- **Re-verified STOP checks at the moment of action:** `origin/main == fda2b51` (unchanged) AND `f0ab7422`'s
  diff still hashes to `d11d612b…` → clean fast-forward, **no reconciled-equivalent rebase needed**.
- **Promotion:** clean FF push `f0ab7422 → main` (`fda2b51..f0ab742`). Vercel auto-built the **production**
  deployment **`dpl_7X4A1M5CanhcCdsCWW7bHCSxVY51`** from `main@f0ab7422`, state **READY**, aliases include
  `dashboard.invegent.com`. Env flag `DASHBOARD_CAPABILITY_MATRIX_ENABLED` left **unset** → production-dark. I did NOT set the flag.

**Production verification (PK ruling #2 step 5):**
1. **Production SHA == `f0ab7422`** — `dpl_7X4A1M…` `githubCommitSha == f0ab7422`, ref `main`, target `production`. Exact reviewed commit (no reconciled equivalent needed). ✅
2. **Production health** — served **HTTP 200**, correct `/login` redirect (`x-matched-path:/login`), new production buildId, FrictionFAB intact. ✅
3. **Existing routes unaffected** — additive change (5 files); production build READY and serving; production domains now map to `f0ab7422`. ✅
4. **Authenticated nav hidden + direct route inert** — identical build to the one PK just eyeballed on preview, with the production flag unset → same dark behavior. Behavioral confirmation on production likewise requires an authenticated session (PK); PK's preview eyeball on this exact build already proved the gate. ⚠ (boundary; PK may re-eyeball production if desired)
5. **No CE/backend/DB changes** — confirmed (git-only FF to main; no CE code/migration/EF; no DB writes). ✅

### 6c. Activation authorized (PK ruling #3, 2026-07-21) — execution boundary + live reference

PK authorized production activation (set `DASHBOARD_CAPABILITY_MATRIX_ENABLED=true`). **Execution boundary
recorded honestly:** this session has **no Vercel env-var management tool** (the available Vercel MCP surface is
get/list project + deployments, web_fetch, deploy-new-project, toolbar, billing — none set a project env var),
and **no authenticated in-app session** is available (Supabase login; no credentials; not logged into production).
Therefore the flag-set (step 2) and the authenticated confirmations (steps 1, 4) must be performed by PK/someone
with Vercel project settings + an app login. I did NOT set the flag and did NOT fake any authenticated check.

**Live-truth reference (read-only, `mbkmaxqhsohbtwsqolns`, 2026-07-21) — what the activated matrix must show:**
- `ice_ro.template_registry_status` = **25** templates (17 `static_image` + 8 `video`) → inventory non-empty (kills empty-TMR).
- `ice_ro.asset_governance_status` = **5** rows (all enabled) across **2** formats (`image_quote`, `video_short_stat`) → governance populated.
- `t."5.3_content_format"` = **13** ICE formats, **7 with NULL `format_category`** → the "Uncategorised format-type" group must be visible.

**Fail-loud boundary (step 5):** the error-surfacing path is **code-reviewed** — `readSelect()` returns
`{ok:false,error}` on any `exec_sql` error and the view renders the red "LIVE READ FAILED — not shown as empty"
card per source (never a silent empty). No **safe, reversible** method exists to induce a live read failure
without a forbidden mutation (CE / DB perms / views / production data). Per PK's step-5 fallback: **recorded as
code-reviewed, NOT destructively exercised** (scope not expanded to build a failure mechanism).

**Rollback readiness (steps 6–7):** activation is a pure Vercel env-var toggle on the already-live production
build `f0ab7422`. Rollback = remove/set `DASHBOARD_CAPABILITY_MATRIX_ENABLED` to false/unset + redeploy, or
Vercel instant-rollback to the current dark production deployment `dpl_7X4A1M…` (which *is* `f0ab7422`). No code
revert needed; the dark build is the current production deployment.

### 6d. ACTIVATED (2026-07-21/22) — flag ON in production, authenticated verification PASSED

PK elected the Vercel-UI path at the activation gate (this laptop session had a Vercel CLI blocked by an
**invalid `VERCEL_TOKEN`** — User-scope, len 60, `vercel whoami` rejects it — and the connected Vercel MCP still
exposes **no env-var management tool**). **PK set the flag and ran the redeploy; the orchestrator performed only
read-only verification.** No CE, DB, EF, migration, or dashboard-code change was made in this step.

**Activated deployment identity:**
- **`dpl_6KgpPCbNkceTzgnehRMsB3QhEuvK`** — `state=READY`, `target=production`, `source=redeploy`,
  `action=redeploy`, `originalDeploymentId=dpl_7X4A1M5CanhcCdsCWW7bHCSxVY51`.
- **`githubCommitSha = f0ab74229318b9616fb731f72d47ae5d1dca9f7a`**, ref `main`, `githubCommitVerification=verified`
  → **the exact reviewed commit; no code change, env-only rebuild.** Reviewed patch hash `d11d612b…` unchanged.
- Alias now resolves: `dashboard.invegent.com` → `dpl_6KgpPCbNkce…` (also `invegent-dashboard.vercel.app`,
  `…-git-main-…`). `aliasError: null`. Built 2026-07-21 22:56Z → ready 22:57Z.
- **Flag state:** `DASHBOARD_CAPABILITY_MATRIX_ENABLED = true`, **Production scope only** (set by PK in Vercel
  project settings; Preview/Development left unset — preview therefore remains dark).

**Dark pre-check BEFORE the flip (authenticated, production, step 1) — PASS.** On `dpl_7X4A1M…`:
no "Capability Matrix" item anywhere in the CREATE nav (full nav read: Content Studio · Creative Library ·
Formats · Format Capability · Template Registry · Creative Intake · Background Assets); `/create/capability-matrix`
rendered exactly `Capability Matrix is not enabled in this environment.`; nearby Create routes normal. This closes
the §6.4/§6b step-4 boundary that earlier sessions could only infer — **the gated state is now behaviorally proven
on production, not just on preview.**

**Authenticated verification AFTER the flip (step 4) — all checks PASS:**

| Check | Expected | Observed live |
|---|---|---|
| "Capability Matrix" in CREATE nav | exactly once; route loads | **once** (`/create/capability-matrix`), placed after Template Registry; route renders ✅ |
| Template inventory non-empty | 25 (17 static_image + 8 video) | **25 live templates**; section headers "17 live templates (static_image)" + "8 live templates (video)" ✅ |
| Governance populated from `ice_ro` | 5 rows; `image_quote` + `video_short_stat` | **5 governance rows** (CFW, PP, Invegent, NDIS Yarns × `image_quote`; PP × `video_short_stat`), all `enabled` ✅ |
| "Uncategorised format-type" group present | 7 of 13 formats NULL `format_category` | group present and labelled "NULL format-type — never hidden"; **7 formats** under it, **13** formats total across all groups ✅ |
| No vendored snapshot served as live | — | all three panels name their live source inline (`t."5.3_content_format"`, `ice_ro.template_registry_status`, `ice_ro.asset_governance_status`) with a request-time read timestamp ✅ |
| No false empty-TMR | — | inventory renders 25 templates, not empty ✅ |
| Nearby Create routes fine | — | `/create/format-capability` (52 cells, 13×4, diagnostics), `/create/templates` (25 templates / 17 families), `/content-studio` all render normally ✅ |
| No secret / PII / `advisor_description` exposure | — | full page text read; none present ✅ |
| Client-side errors | — | **no console errors or exceptions** ✅ |

**Independent cross-check of the overlay counts** (read-only, project `mbkmaxqhsohbtwsqolns`, via allowlisted
`scripts/db-read.py`): `ice_ro.template_registry_status` = **25**, `ice_ro.asset_governance_status` = **5** —
both match the rendered surface exactly. **Boundary named honestly:** the 7-of-13 `format_category` figure could
**not** be independently re-derived here — `t` is outside the R0 grant (`db-read.py` → `42501 permission denied
for schema t`), so that number is confirmed from the rendered surface (which reads that source live) and from the
prior session's `execute_sql` reading, not from a second independent read in this session.

**Two advisories for PK — neither is a rollback trigger, neither was acted on:**

1. **The "empty Template Registry" claim is stale and now user-visible.** The surface renders the copy
   *"25 live templates — the honest replacement for the empty Template Registry"* (and the same premise appears in
   the commit message and §1 above). But the live `/create/templates` Template Registry **is not empty** — it shows
   **25 templates / 17 families** from the same source. The matrix's *data* is correct; the *justification copy*
   overstates. This matches the standing register note that the TMR registry is populated, not empty. **Copy-only;
   PK's call whether to correct it in a follow-up.**
2. **The nav/purpose overlap with `/create/format-capability` is materially stronger than the
   `dashboard-ia-lint` WARN conveyed.** The lint flagged only the adjacent word "Capability". In live production the
   two surfaces are near-twins by stated purpose: the pre-existing Format Capability page also renders a
   *"Capability matrix — format × platform"* over the **same 13 formats × 4 platforms**, and additionally carries the
   proof chain, conflict diagnostics and per-cell evidence the new surface does not. They now sit two items apart in
   the same CREATE group. This is adjacent to the named **"confusing duplicate nav"** rollback trigger. **Not acted
   on** — the fence says keep the label "Capability Matrix", no relabel/re-pin. **Flagged for PK ruling.**

**Fail-loud (step 5) — unchanged from §6c: recorded as CODE-REVIEWED, not destructively exercised.** No safe,
reversible way exists to induce a live read failure without a forbidden mutation; per PK's step-5 fallback no
failure mechanism was built. The live surface did not exercise the error path (all three reads succeeded).

**Rollback readiness (steps 6–7) — verified available, not needed.** No rollback trigger fired: live reads all
succeeded; no failed read shown as empty; no nav/Create regression; no secret/PII/`advisor_description` exposure;
production health normal. Rollback remains a pure env toggle on an unchanged build — remove/false
`DASHBOARD_CAPABILITY_MATRIX_ENABLED` + redeploy, **or** Vercel instant-rollback to `dpl_7X4A1M…`
(still listed `isRollbackCandidate: true`, and it *is* the same `f0ab7422`). No code revert path required.

### 6e. PK RULING — Slice 0 ACCEPTED (2026-07-22)

**Verdict: `PRODUCTION-ENABLED · VERIFIED LIVE · READ-ONLY PROVEN`.** PK accepted the §6d evidence in full —
deployment `dpl_6KgpPCbNkce…`, reviewed SHA `f0ab74229318…`, reviewed input hash `d11d612b…` unchanged,
dark-before-flip confirmed in production, activated nav + route verified, 25 templates (17 `static_image` +
8 `video`), 5 governance rows across `image_quote` + `video_short_stat`, Uncategorised grouping visible for
7 of 13 formats, no PII / secrets / `advisor_description` / console errors / empty-TMR falsehood /
neighbouring-route regression, rollback deployment available. **Fail-loud as code-reviewed-but-not-
destructively-exercised is explicitly ACCEPTED.**

- **`DASHBOARD_CAPABILITY_MATRIX_ENABLED` stays `true`. No rollback required.**
- **Advisory 1 (stale copy) — UPHELD.** The "empty Template Registry" claim "must not remain as durable
  operator copy". PK authorized a **separate copy-only follow-up** replacing it with neutral current wording
  (e.g. *"25 live templates from the current Template Registry"* / *"Live template inventory sourced from the
  current registry"*), and it must **not** imply `/create/templates` is empty, superseded, or non-live.
  **It changes the reviewed production patch → it must be independently hashed and re-reviewed, and must NOT
  be folded into this closeout-record commit.** Not started.
- **Advisory 2 (duplicate capability surfaces) — UPHELD as a confirmed IA reconciliation requirement**, not a
  naming preference. PK opened **`cc-0046 Slice 0.1 — Capability surface IA reconciliation`** (read-only
  analysis + presentation design ONLY; no implement, rename, nav removal, route redirect, or flag change).
- **Sequencing:** Slice 0 stays enabled while Slice 0.1 runs · **Slice 0.5 NOT authorized** · Slice 1 remains
  blocked on Slice 0.5 · no governance writes, role-model implementation, Content Studio edits, CE/backend
  changes, DB changes, migrations, or unrelated cleanup authorized.

PK authorized commit + push of this docs-only closeout set (exact 3-file set; fetch + re-read origin first;
never from the shared main checkout; stop if reconciliation alters substantive closeout content or the file
set). Origin re-read at commit time: lane branch `0/0` vs origin — **no reconciliation was needed**
(CE `origin/main` had independently advanced to `8cf573e`; unrelated to this branch, not merged here).

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

- **Slice 0 is ACCEPTED, ACTIVATED and LIVE** (§6d evidence, §6e ruling) — `PRODUCTION-ENABLED · VERIFIED LIVE ·
  READ-ONLY PROVEN`; flag `true`, Production scope, on `dpl_6KgpPCbNkce…` = `f0ab7422`. No remaining Slice 0
  execution step; no rollback required.
- **Advisory #1 → authorized copy-only follow-up (NOT STARTED).** Replace the stale "empty Template Registry"
  claim with neutral current wording; must not imply `/create/templates` is empty/superseded/non-live.
  **Changes the reviewed production patch → independently hashed + re-reviewed; never folded into a record commit.**
- **Advisory #2 → `cc-0046 Slice 0.1 — Capability surface IA reconciliation` OPENED (read-only).** Compare the
  two surfaces on primary operator question · live data source · axes · proof/governance overlays · conflict
  diagnostics · intended operator action · audience+frequency; recommend ONE durable model (merge / retain both
  with distinct jobs+names / drill-down / retire one preserving unique diagnostics) plus the smallest
  implementation option. **No implement, rename, nav removal, route redirect, or flag change in Slice 0.1.**
- Deferred, unchanged: primary-question marker; IA §2.1 route-inventory reconciliation (→ `register-reconciler`).
- **Independent-read boundary:** the 7-of-13 `format_category` figure is UI-derived + prior-session `execute_sql`;
  `t` is outside the R0 `ice_ro` grant, so it has no second independent read in this session. A curated
  secret-free `ice_ro` view for the format taxonomy would close this gap under the normal T2/T3 gate.
- Slice 0.5 (governance role model) and Slice 1 (governance writes) remain **not started**; S1 gated on S0.5.

## 9. Stop condition

Per the three PK-authorized sequences: merged, pushed, deployed dark to preview → PK preview eyeball PASSED →
promoted the exact reviewed `f0ab7422` to production-dark → **PK set the flag and redeployed; orchestrator ran
read-only verification only.** Authenticated dark pre-check PASSED, authenticated post-activation verification
PASSED on every named check, rollback verified available and not needed, two advisories raised and **not** acted
on → **PK ACCEPTED Slice 0 as `PRODUCTION-ENABLED · VERIFIED LIVE · READ-ONLY PROVEN` and authorized this
docs-only closeout push (§6e).** Both advisories were upheld as separate authorized work: a copy-only
follow-up (independently hashed + re-reviewed) and read-only `Slice 0.1`. **STOPPING after this push and the
Slice 0.1 IA recommendation — both return at the next PK gate.** Slice 0.5 is NOT authorized; Slice 1 stays
blocked on Slice 0.5; no governance write, role model, Content Studio edit, CE/backend/DB change, migration,
or unrelated cleanup is authorized.
