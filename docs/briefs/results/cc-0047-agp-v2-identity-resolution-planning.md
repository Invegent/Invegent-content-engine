CLOSED v6.11 · cc-0047 AGP v2 identity-resolution planning (read-only) · main worktree · PK-ACCEPTED as canonical AGP v2 planning artifact (SAFETY_GATE · T1) · 2026-07-23

# Result cc-0047 — AGP v2 identity-resolution planning lane (read-only)

**Brief file:** `docs/briefs/cc-0047-agp-v2-identity-resolution-planning.md`
**Executed by:** Claude Code (orchestrator, read-only) + branch-warden + orchestrator-run live census (named substitution for the capability-blocked db-rls-auditor — see §6)
**Completed:** 2026-07-23 Sydney — PK-ACCEPTED as the canonical AGP v2 planning artifact; cc-0047 CLOSED

---

## THE FIVE-PART ARTIFACT

> Live-state facts below were verified read-only against project `mbkmaxqhsohbtwsqolns` on **2026-07-23** (migration ledger, catalog reads, `c.brand_avatar` / `m.post_draft` / `r.avatar_resolution_shadow` SELECTs). Source-brief facts (dated 2026-06-15/18/19) are cited for design/provenance and are marked where the 2026-07-23 census **confirms** them as current.

### Part 1 — Current-state identity-resolution architecture

**The layered identity model (AGP v2 frame):** `intent → identity → asset → provider`, with distinct concepts: **brand host** (brand's primary presenter, one per brand today) · **narrator mode** (per-piece presentation mode) · **stakeholder persona** (governed role/voice) · **character identity** (future library) · **avatar asset** (`c.brand_avatar` row = HeyGen talking-photo + voice) · **provider identity** (HeyGen avatar/voice id). (`character-model-v0-brand-host-designation.md:23-46`)

**The live production path (single selection site):**

1. **Intent origin — NOT an identity choice.** The avatar *preference* ("use an avatar on YouTube") is set upstream in `m.materialise_slots` (the A2 decision) and re-asserted as a *format* override (`video_short_avatar`) in `ai-worker`; neither picks an identity. (`f-series-avatar-differentiation.md:66`, Appendix A.1)
2. **Format decided in `ai-worker`; role never derived.** `generateVideoScript('video_short_avatar')` returns exactly `{format, narration_text, render_style:'realistic'(hardcoded), total_duration_s}` — no role, no persona read. (`f-series…:44-48`, Appendix B; `agp-d01-3-shadow-resolver-telemetry.md:27`)
3. **⇒ Why `stakeholder_role` is always null.** It is **not** a DB gap — `ai-worker` simply never derives or emits a role. The "persona signal" exists upstream as free-text (`creative_intent.source_material.persona`: `persona_label` = audience, `avatar_preference` = presenter direction, `persona_notes` = tone) but is never classified into a `role_code`. (`f-series…:20, 25, §5`) **LIVE-CONFIRMED 2026-07-23:** of 86 avatar drafts carrying an `avatar_identity` (2026-06-11 → 2026-07-22), **0 have a populated `stakeholder_role`** (in either `avatar_identity` or `video_script`), and **all 86 are `avatar_selected_by='fallback_limit1'`.**
4. **Identity resolved once, in `heygen-worker`.** `runSubmitPhase()` (`supabase/functions/heygen-worker/index.ts:306`) calls `lookupAvatar(clientId, stakeholderRole, renderStyle)` (`index.ts:61-82`, string built at `:86-107`), executed via the `public.exec_sql` raw-SQL RPC with **direct string interpolation** of `client_id`/`render_style`/`role_code`:
   ```sql
   SELECT ba.heygen_avatar_id, ba.heygen_voice_id
   FROM c.brand_avatar ba JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
   WHERE ba.client_id = '<id>' AND ba.is_active = true AND ba.render_style = '<style>'
     [AND bs.role_code = '<role>']   -- only when role non-null (never today)
   LIMIT 1                            -- NO ORDER BY
   ```
   A second string-interpolated `exec_sql` call exists at `index.ts:455-456` (`c.client_brand_profile`). (`agp-d01-3…:14-25`; census-confirmed `exec_sql` posture below.)
5. **The "A2 pin" determinism rule.** Determinism = `is_active` ∧ exact `render_style` ∧ optional `role_code`, then `LIMIT 1` with **no `ORDER BY`** → the pick is deterministic *only by accident of storage order* when the candidate set has >1 row. **Today the candidate set is always size 1** (one active avatar per brand), so the nondeterminism never bites — which is also precisely why a shadow soak now would prove nothing. (`agp-d01-3…:31-32`)
6. **Output frozen + copied.** The live pick is written to `draft_format.avatar_identity` `{talking_photo_id, voice_id, render_style, stakeholder_role(null), avatar_selected_by}` (`index.ts:360-371`) and copied verbatim to `m.post_render_log.render_spec` at poll (no re-lookup). (`agp-d01-3…:28`)
7. **Markers not read by live selection.** `is_primary` / `is_default_host` are **not referenced anywhere in live selection code**; the *only* reader is the dormant shadow resolver, and only when its flag is on (it is off). (`character-model…:29, 84-91`)

**CI ↔ RI boundary (load-bearing).** Creative Intelligence = *what to say + WHO says it* (may **suggest** identity/persona); Render Intelligence = *how to produce it* (**resolves** identity → eligible asset → provider). CI must not pick avatar assets; RI must not pick topic/angle/hook. (`creative-render-intelligence-character-architecture.md:15-46`) **Current reality:** there is effectively **no CI identity-suggestion step** (no persona→role classification), and RI "resolution" is the degenerate A2 pin. AGP v2 is the layer that makes this boundary real.

### Part 2 — Declared-control census + gap matrix (LIVE-verified 2026-07-23)

| Control | Exists (live) | Consulted by LIVE selection | Consulted by SHADOW path | Status |
|---|---|---|---|---|
| `c.brand_avatar.is_active` (A2 pin) | ✓ — 1 active NY, 1 active PP, 0 Invegent, 0 CFW | **YES** — the sole live gate | yes (candidate filter) | **ACTIVE — the only live control** |
| `render_style` exact match | ✓ | **YES** | yes | ACTIVE |
| `role_code` filter (via `stakeholder_role`) | ✓ (code path live) | conditional — but `stakeholder_role` null on 86/86 drafts ⇒ **never exercised** | yes | DORMANT-IN-PRACTICE |
| `is_primary` | ✓ column; **0 set** | NO | yes (order key, inert) | UNCONSUMED-BY-LIVE |
| `is_default_host` | ✓ column; **0 set** | NO | yes (order key, inert) | UNCONSUMED-BY-LIVE |
| `uq_brand_avatar_primary_per_role_style` (partial unique) | ✓ applied | enforcement guard | — | ACTIVE-GUARD (effect dormant, 0 markers) |
| `uq_brand_avatar_default_host_per_client_style` (partial unique) | ✓ applied | enforcement guard | — | ACTIVE-GUARD |
| `public.resolve_and_record_avatar_shadow` RPC | ✓ applied — SECDEF, `search_path=public`, 8-arg, EXECUTE `service_role`+`postgres` only | NO | the shadow engine | DORMANT (flag off) |
| `r.avatar_resolution_shadow` table | ✓ applied — **0 rows**, RLS on / 0 policies, grants `service_role`(SIUD)+`postgres`(owner) | NO | write target | DORMANT (0 rows) |
| `heygen-worker` shadow hook (`recordAvatarShadow`) | ✓ deployed v2.2.0, flag-gated, fail-open | NO (result never read back) | fires when flag on | DORMANT |
| `AVATAR_SHADOW_TELEMETRY` flag | EF secret (not DB-readable) — inferred OFF from 0 rows | — | activation gate | OFF |
| `public.exec_sql` RPC | ✓ applied — SECDEF, `search_path=public`, EXECUTE `service_role`+`postgres` only (**anon/authenticated/authenticator = NO**) | **YES** — live lookup runs through it, string-interpolated | — | **ACTIVE — SAFETY_GATE target** |

**Gap statement:** the entire governance layer (markers, role filter, shadow resolver, telemetry) is **built and dormant**. The *only* live identity control is the A2 single-active-avatar pin + `render_style`. In one sentence: **identity governance today is "one hardcoded host per brand, resolved by an unordered `LIMIT 1` over a size-1 candidate set, through a string-interpolated SECDEF RPC."**

### Part 3 — AGP v2 gate map (PK's 7-step sequence as future, separately-gated lanes)

Each step is its own Gate-1 brief + tier + review chain. **Standing holds unchanged:** Phase 3.3 flag-enable BLOCKED · cutover BLOCKED · Branch B NOT AUTHORISED.

1. **Architecture & census (read-only)** — **THIS lane (cc-0047).** ✓ delivered here.
2. **Separate HOST governance from PERSONA governance** (future lane). Host = "who normally represents this brand" → deterministic default-host resolution. Persona = "does this content need a different speaker" → requires **restoring the persona signal in `ai-worker`** (B2: constrained LLM role extraction from the free-text persona, `f-series…:97, §5`). **A `no_persona_available` condition must NOT block deterministic host resolution** — the two governances must not block each other.
3. **Remove the unsafe legacy lookup** — replace the string-interpolated `exec_sql` avatar lookup with a typed resolver/RPC at **strict parity**. **← THE NAMED SMALLEST-SAFE SLICE (Part 5).** Implementation tier T3.
4. **Designate default hosts** via `is_default_host` (future gated migration): set `is_default_host=true` for `83ff167d…` (NY) + `d6c422fb…` (PP); **Invegent + CFW (0 avatars each) must resolve to an explicit governed `no-eligible-avatar` state, never silently fall through.** (`character-model…:107-120`)
5. **Create meaningful ambiguity safely** — a **fenced** test condition with legitimate alternatives (default host / animated variant / role-specific alt / controlled test-brand pool), **NOT** a second production-avatar activation. The resolver must then prove it selects by declared policy, not DB row order.
6. **Run the shadow soak** — Phase 3.3, now useful. Measures beyond agreement: candidate count · selected identity + reason · fallback path · default-host use · role match · render-style match · no-eligible result · live-vs-shadow disagreement classification. (The runbook's `drift_class` ladder + SQL metrics, `agp-d01-gate3-phase3.3-activation-soak-runbook.md:44-51, §5`, are directly reusable.)
7. **Controlled cutover** — one fenced slice first (probably PP realistic default-host), rollback to the live lookup retained; expand only after parity · multi-candidate · zero-candidate · provider-identity-mapping · telemetry-visibility are each proven.

### Part 4 — Phase-3.2 compatibility decision (keep vs supersede)

**KEEP** (all LIVE-verified applied 2026-07-23 via migration ledger + catalog):

| Artifact | Live status | Disposition |
|---|---|---|
| Migration `agp_d01_2…priority_default_markers` (`20260616015419`) | applied | KEEP |
| Migration `agp_d01_3_avatar_shadow_resolver_telemetry` (applied `20260618084054`) | applied | KEEP |
| Migration `agp_gate3_revoke_authenticator_select_avatar_shadow` (applied `20260618092646`) | applied | KEEP |
| Marker columns `is_primary`/`is_default_host` + 2 partial unique indexes | applied, 0 markers set | KEEP (dormant, ready) |
| `r.avatar_resolution_shadow` (0 rows, RLS on/0 policies, service_role+postgres) | applied, dormant | KEEP |
| `resolve_and_record_avatar_shadow` RPC (SECDEF, service_role-only) | applied, dormant | KEEP |
| `heygen-worker` shadow hook v2.2.0 (flag-gated, fail-open) | deployed, inert | KEEP |
| Character Model v0 + CI/RI architecture (docs) | current | KEEP |

**SUPERSEDE:**

- `agp-d01-gate3-phase3.3-activation-soak-runbook.md` — its **mechanics** (flip/soak/metrics/`drift_class` ladder/rollback) are reusable in step 6, but its **sequencing premise** (soak *before* host designation; determinism-as-end-goal) is superseded by AGP v2. Disposition: **keep-as-reference, sequencing superseded** — do not re-run its Phase-3.3 activation runbook as written.
- The assumptions: soak-before-host-designation · determinism-is-the-end-goal · personas-directly-after-host-designation-without-first-restoring-the-persona-signal.

**Compatibility nuances (should-fix, separate lanes):**
- **Repo↔prod migration-timestamp drift (cosmetic).** Applied versions (`…084054`, `…092646`) differ from repo filenames (`…090000`, `…133000`); names match; blob byte-identical (branch-warden confirmed repo side; ledger confirmed applied). **The repo files carry misleading `AUTHORED, NOT APPLIED` / `DRAFT — DO NOT APPLY` headers even though the migrations ARE applied in prod** — recommend a doc-hygiene correction (its own docs lane) so the repo doesn't imply the infra is unbuilt.
- **`service_role` holds UPDATE+DELETE on the append-only shadow table** (runbook-noted minor over-grant) — flag if append-only immutability becomes a stated invariant; not a blocker.

### Part 5 — Recommended smallest-safe implementation slice (single named — PK ruling)

**Replace the string-interpolated `exec_sql` avatar lookup with a typed resolver/RPC** (parameterised; SECDEF; `service_role`+`postgres` EXECUTE only; `search_path=public` — mirroring the already-proven shadow-resolver posture), whose **acceptance condition is STRICT PARITY** with today's single-active-avatar production path (byte-identical selection on the current size-1 candidate sets).

- **Why it is the right first slice:** it removes the SQL-injection-*shaped* string interpolation and establishes the **typed resolution seam** that steps 4–7 build on, while changing no behaviour. It is decoupled from the risky brand decisions (host designation, pin relaxation).
- **Honest risk framing (from the census, not the stale briefs):** `exec_sql` today is **SECDEF + `service_role`/`postgres` EXECUTE only — anon/authenticated/authenticator have NO execute**, and the interpolated values are internal pipeline data (`client_id`/`render_style`/`role_code`), not end-user input. So this is a **latent-hazard hardening + architecture improvement**, NOT the patch of an anon-exposed injection. Framed that way so the tier and urgency aren't overstated.
- **Distinct from the shadow RPC:** `resolve_and_record_avatar_shadow` is the *telemetry writer*, not the live picker. This slice is a **new read-only typed live resolver** (or a `lookupAvatar` refactor onto the supabase-js query builder / a typed `SELECT`-only RPC), separate from the shadow object.
- **Tier when implemented: T3** (production EF + DB caller path) — full review chain + external review pinned to the diff hash + PK deploy gate + rollback proven before apply + `--no-verify-jwt` preserved on `heygen-worker`. **This planning lane only NAMES it.**

---

## 1. Result status

`Complete` — five-part read-only planning artifact delivered; live census obtained (orchestrator substitution); zero mutations. **PK-ACCEPTED 2026-07-23 as the canonical AGP v2 planning artifact; cc-0047 CLOSED.**

## 2. Commit(s)

- N/A — no commit yet (docs-only lane; commit + push are separate PK-gated steps).

## 3. Files changed

- `docs/briefs/cc-0047-agp-v2-identity-resolution-planning.md` — created (brief)
- `docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md` — created (this five-part artifact + result)

## 4. Actions taken

- Persisted the PK-gate-1-approved brief (SAFETY_GATE · T1 · one-named-slice).
- Ran `brief-author` (draft) → `branch-warden` (`safe`) → `db-rls-auditor` (census BLOCKED — no live-read path in its toolset; nothing mutated).
- On PK ruling, ran the live census read-only as orchestrator (named substitution): `list_migrations`, catalog reads, and `c.brand_avatar` / `m.post_draft` / `r.avatar_resolution_shadow` SELECTs. Resolved the "repo NOT-APPLIED header vs runbook APPLIED" contradiction (infra **is** applied) and confirmed all reframe premises live.
- Synthesised the five-part artifact from source (fully cited) + live census.

## 5. Constraints confirmed (Forbidden actions — all held)

- No `AVATAR_SHADOW_TELEMETRY` flip / no shadow soak (Phase 3.3 BLOCKED) — confirmed not done.
- No cutover (BLOCKED) — confirmed not done.
- No Branch B / persona-driven / marker-driven live selection (NOT AUTHORISED) — confirmed not done.
- No marker write (`is_primary`/`is_default_host`) — confirmed not done (read-only SELECTs only).
- No second-avatar activation (`is_active` flip) — confirmed not done.
- No migration / DDL / DML / secret change / EF deploy / provider call — confirmed; every DB touch was a read (`SELECT`/catalog/`list_migrations`/`get_advisors`), zero writes.
- No code change; no register or CLAUDE.md edit; old-AGP "superseded" register marking NOT performed (PK scheduled it for after acceptance).
- No approval / nothing marked proven.

## 6. Open issues

- **Named substitution (CCF-02 R1) — PK-ACCEPTED for this lane.** The designated `db-rls-auditor` was capability-blocked this session (no `mcp__supabase__*` in its toolset; `db-read.py` had no `ICE_READONLY_DSN`). The orchestrator ran the read-only census in its place, on explicit PK election; the limitation, method, and read-only boundary were disclosed. PK accepted the substitution for cc-0047. **FOLLOW-UP (separate CCF/tooling item, not a cc-0047 blocker):** fix the `db-rls-auditor` DB-tool/credential access gap before the next DB-subject lane.
- **SAFETY FOLLOW-UP (separate, do NOT fold into the strict-parity resolver slice without a separate PK scope ruling):** `service_role` holds UPDATE+DELETE on the append-only `r.avatar_resolution_shadow` telemetry table (§4 nuance). Recorded here so it is not lost.
- **Advisor slice — DONE (confirmatory).** Of 241 project security advisors, the only avatar-named advisor is **INFO `rls_enabled_no_policy` on `r.avatar_resolution_shadow`** (the intended deny-by-default). **No** advisor targets `exec_sql`, `resolve_and_record_avatar_shadow`, `brand_avatar`, or `brand_stakeholder`; `exec_sql` is absent from `function_search_path_mutable` (its `search_path=public` is pinned). The `exec_sql` string-interpolation is a **design finding, not an advisor hit** — linters don't detect injection-shape — reinforcing that step 3 is a proactive hardening, not a flagged vuln.
- **Repo doc-hygiene:** the two applied AGP migration files still carry `NOT APPLIED` headers (§4) — recommend a corrective docs lane.

## 7. Next recommended step

Sequenced by PK (2026-07-23): (1) commit + push these two cc-0047 docs (message `docs(agp): close cc-0047 identity-resolution planning`; old-AGP marking excluded); then (2) old-AGP register-marking docs lane (verify-or-abort; reconcile the misleading migration-header state via current documentation only — no rewrite of historically applied migration files unless repo policy explicitly authorizes); then (3) a T3 brief-author lane for the single named slice (`exec_sql` → typed resolver/RPC at strict parity), authorizing brief-preparation ONLY. Kept outside that slice: host/persona selection, marker backfill, second-avatar activation, shadow telemetry activation/soak, service-role grant remediation, Invegent/CFW avatar onboarding.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

- Output matched the brief: all five parts delivered (architecture · control census+gap matrix · 7-step gate map · keep/supersede · single named slice).
- Constraints respected: zero mutations; every DB touch read-only; all standing holds (Phase 3.3 / cutover / Branch B) observed, not touched.
- No unexpected files: exactly the two cc-0047 docs created.
- Success criteria met: every live-state claim census-verified 2026-07-23 or cited to source; the required-agent substitution disclosed and PK-accepted.
- New risks / follow-ups: (a) `db-rls-auditor` DB-tool access gap → separate CCF/tooling item; (b) append-only shadow-table `service_role` over-grant → separate safety follow-up; (c) repo migration-header doc-hygiene → folded into the old-AGP register-marking lane.
- PK ruling: artifact accepted as canonical; substitution accepted; `exec_sql` proactive-hardening framing accepted. cc-0047 CLOSED.

## 9. Learning notes (chat fills this)

- A "required agent" (db-rls-auditor for a DB-subject lane) can be capability-blocked; the contract's named-substitution path (orchestrator read-only census on PK election) worked cleanly and kept PK in the loop via the `ask`-gated `execute_sql` prompts.
- Repo migration-file headers are NOT a reliable applied-state signal here — `list_migrations` is authoritative. The "AUTHORED, NOT APPLIED" headers nearly produced a false "infra unbuilt" conclusion.
