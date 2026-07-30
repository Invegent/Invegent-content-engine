# Brief cc-0088 — client-production-readiness-queue-v1

**Created:** 2026-07-30 Sydney
**Author:** brief-author (draft, orchestrator-persisted)
**Executor:** Claude Code (orchestrator-driven: db-rls-auditor, ef-builder ×2 isolated worktrees [CE + invegent-dashboard], branch-warden ×2, dashboard-ia-lint, external review, PK gate)
**Status:** GATE 1 APPROVED 2026-07-30 — tier T2 · host shape = extend existing RPC (`get_creative_template_portfolio_summary` or sibling) · overall-state = coarse column alongside full detail, never replacing it · next step = db-rls-auditor live-grounding pass, then design gate on the remaining open items below.
**Result file:** `docs/briefs/results/cc-0088-client-production-readiness-queue-result-v1.md` (created on completion)

---

## Task

Build ONE new, read-only dashboard surface — the **Client Production Readiness Queue** — that shows, for every relevant client × platform × requested-format cell, a truthful production-readiness picture derived from canonical backend evidence rather than status labels: scheduled demand, next scheduled occurrence, current platform pause/release state, publisher readiness, capability status + reason, runtime reachability, current practical template winner, eligible-template count, required asset slots, declared asset-pool count, resolver-reachable asset count, minimum required pool, missing proof or governance gate, the responsible remediation lane, the next required outcome, and an overall Ready / Blocked / Waiting-for-proof / Not-configured state. Every non-Ready cell must route to exactly one of eight named owning lanes (asset shortage → Asset Gap; template missing → Creatomate Global; worker compatibility missing → worker lane; publisher path missing → publisher/onboarding; governance unproven → graduation/governance; unsupported silent degrade → capability/template remediation; schedule/client configuration missing → dashboard/onboarding; platform paused pending containment → Capability Enforcement) — never defaulting every non-Ready result to Asset Gap. This is the dashboard foundation PK intends to use to restart Asset Gap as a demand-driven function; it is explicitly **read-only visibility only** — no promotion, no schedule/pause mutation, no selector/portfolio-weight change, no publisher-profile creation, and no reproduction of `classify_format_capability`'s decision logic in the frontend.

## Source context

**Direct precedent (same shape, one grain coarser — reuse the pattern, not the code verbatim):**
- `docs/briefs/client-platform-readiness-summary-gate1-v1.md` + `docs/briefs/results/client-platform-readiness-summary-result-v1.md` — the LIVE (2026-07-29, merged `a8ebd05`) client×platform (not ×format) readiness panel on `invegent-dashboard`'s `/clients` Schedule tab. It already reuses `getFormatCapabilityMap`/`classify_format_capability`/`CapabilityCell` verbatim and already surfaced, live, exactly PK's proof case 1: Property Pulse LinkedIn (`text`) and YouTube (`video_short_kinetic`) show `unsupported_silent_degrade`/`format_unmapped` with 69 and 28 posts published in 90 days on an ungoverned path. This task's per-format grain is a strict superset of that panel's per-platform grain — reuse its probe-format / fail-closed / paused_reason-vs-paused_until conventions rather than re-deriving them.
- `docs/briefs/creative-template-portfolio-dashboard-gate1-v1.md` + `docs/briefs/results/creative-template-portfolio-dashboard-result-v1.md` — LIVE (migration `20260729160000_creative_template_portfolio_read_rpc_v1.sql`; dashboard tab merged `aa8209f`). Two additive SECURITY DEFINER RPCs, `public.get_creative_template_portfolio(p_client_slug)` and `_summary(p_client_slug)`, already compute per-client production winner, Lifecycle vs Runtime as two distinct badges, a live B-roll eligible-pool count, and a saved-vs-effective spec with `single_clip_warning`/`below_floor` flags. This is the closest existing source for "current practical template winner", "eligible-template count", and the B-roll half of "resolver-reachable asset count" — reuse/extend, don't re-derive.
- `docs/briefs/shared-capability-contract-classifier-gate1-v1.md` — the normative definition of `public.classify_format_capability(p_client_slug, p_platform, p_format)`: composes `select_template` + `resolve_slot_assets` + a `m.post_publish`-based silent-degrade overlay; returns one of `ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade · unknown` (plus `publisher_path_missing`, added by `20260729120000_classify_format_capability_v2_publisher_path.sql`), with a `routed_lane` field close to PK's owning-lane vocabulary. **Authoritative source for "capability status and reason" and most of "responsible lane" — do not reimplement its logic anywhere else.**
- `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` — enforcement architecture on top of the classifier: `publisher_lock_queue_v1`/`v2` dequeue mechanics, the auto-approver capability-blind guard, and the `blocked_by_capability`/`final_format_authority`/`final_format_reason` contract — any "publisher readiness" or "missing proof/governance gate" column should read this, not re-derive it.

**The reachability-vs-capability distinction (load-bearing, must not be collapsed):**
- `docs/briefs/results/s9-facebook-containment-release-result-v1.md` §7 carry 1: `classify_format_capability` does **not** consult `platform_support`, so a `ready` verdict does not imply the format is *reachable*. NDIS `video_short_stat` on Facebook classifies `ready` yet is unreachable because `platform_support.facebook = false`. This is the concrete evidence base for the two SEPARATE required fields "capability status and reason" (→ classifier) and "runtime reachability" (→ `platform_support` × `client_format_config`) — they must render as two distinct signals, never one.
- `supabase/migrations/20260615110000_..._platform_support_publisher_reality.sql` — `t."5.3_content_format".platform_support` is a global (not per-client) jsonb, one boolean per platform per format.
- `supabase/migrations/20260725120000_durable_platform_support_guard_grid_and_materialiser.sql` — confirms `c.client_format_config` as the per-client enablement join partner.
- `docs/00_action_list.md` v6.72 marker restates this exact warning verbatim.

**Asset-count grounding (declared vs resolver-reachable, must not be conflated):**
- `docs/briefs/results/broll-promotion-batch1-result.md` §11 — G4 guard: declared pool count MUST equal resolver-reachable count, established after a real incident (declared-6, actually resolver-reachable-5, mislabeled fence). This is a **proven real defect class**, not hypothetical — grounds why the queue must show both counts, never one derived from the other.
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md` — asset fence model: `is_active` is a real column; `approved`/`production_use_allowed`/`approval_status` are `asset_meta` keys; only `is_active` + `asset_meta.approved` are ever read by a resolver.
- `docs/briefs/ice-asset-gap-register-v1.md` §4 — a proposed, **PK-not-yet-ratified** pool-sizing standard, distinct from the one ratified floor that exists today (B-roll min 4 / target 6).
- `docs/briefs/broll-rotation-governance-v1-brief.md` + `docs/00_action_list.md` v6.72 — resolver **v1.4 is LIVE** (pool=6, all six resolver-reachable); **v1.5** (recency-avoidance + geography) is **BUILT + DRY-RUN PROVEN but NOT applied**. The queue must reflect v1.4's live behaviour and show B-roll rotation/geography-governance as open gaps — not a bug to fix, a fact to display honestly.

**NDIS containment / platform pause state:**
- `docs/briefs/results/s9-facebook-containment-release-result-v1.md` — live state at evidence-read time: NDIS Facebook `paused_until` = NULL (RELEASED); Instagram/LinkedIn/YouTube remain `paused_until = 2027-01-01`. Release order is PK-mandated Facebook → Instagram → LinkedIn → YouTube last. **Re-confirm live before build** — this is exactly the kind of fast-moving fact prior lanes have caught changing mid-session.
- NDIS Facebook's reachable palette post-release: `image_quote` ready; `text` exempt/silent-degrade (template-less carve-out, PK-accepted); `carousel` blocked (`unsupported_silent_degrade`, PK-accepted as terminal).

**Property Pulse / Care for Welfare grounding:**
- `docs/briefs/results/client-platform-readiness-summary-result-v1.md` §4 — PP LinkedIn/YouTube unsupported finding, independently re-verified live (69 + 28 posts/90d, ungoverned). Matches proof case 1.
- `docs/briefs/results/static-template-graduation-batch1-image-worker-compat-result-v1.md` — grounds the "announcement card/carousel cover worker-compatible/render-proven" claim, **but as of this diff's own recorded state the change (image-worker v3.34.0) sits UNCOMMITTED in an isolated worktree (`lane/tmr-winner-text-fields-ext`) — NOT deployed.** PK's "after deployment" wording assumes a state this repo does not yet show as true — flagged as an evidence gap, not silently assumed either way.
- Same result doc confirms `care-for-welfare-pty-ltd` × youtube × any format → `publisher_path_missing`/`no_publish_profile_row` (true double-absence in both `client_publish_profile` and `client_publish_schedule`) — matches proof case 3 exactly.

**Composite-verdict tension (surfaced to PK, not silently resolved):**
- `docs/briefs/dashboard-redesign-gap-analysis-brief-v1.md` §0.9/§0.10c independently warns against a single composite "health" indicator that averages a 40%-degraded platform and a 0%-dead platform into one figure describing neither, proposing instead always-separate readouts. PK's own task asks for a fourth composite field ("overall state"). Not necessarily contradictory (a coarse triage column *alongside*, never replacing, the granular fields can satisfy both) — flagged as an open design question, not resolved here.

**Cross-repo / IA-conformance:**
- `.claude/agents/dashboard-ia-lint.md` — the two governing IA docs live in **`invegent-dashboard`**, not this repo. This change must be audited against them via `dashboard-ia-lint` before the PK gate, per CLAUDE.md's standing instruction.
- `docs/briefs/dashboard-redesign-gap-analysis-brief-v1.md` §0.2/§9.2 — the dashboard has authentication but zero authorization; this surface inherits that standing fact, it is not a new exposure. Same doc confirms `/clients` (the likely host page) is NOT a cc-0054 caller-controlled-`exec_sql` target — re-verify against CURRENT `invegent-dashboard` origin/main at build time, not assumed from a dated analysis.

## Scope

**In scope:**
- One new additive, read-only backend surface (CE repo) composing existing canonical functions — `classify_format_capability`, `select_template`, `resolve_slot_assets`, `get_creative_template_portfolio`/`_summary`, `platform_support` × `client_format_config`, `client_publish_profile`/`client_publish_schedule` — into one client-scoped result set at the (client, platform, format) grain. Exact host shape (new RPC / extension / dashboard-side composition) is a **design-gate decision**, not decided by this brief — see Open questions.
- One new dashboard tab/section (`invegent-dashboard`) rendering the composed per-cell data as a queue/table.
- Reproducing PK's three named proof cases exactly, every cell traceable to a cited backend read.
- Implementing the canonical gap-ownership routing table as a mechanical mapping off the classifier's own `routed_lane`/`status` plus pause/schedule-existence signals — never a frontend re-derivation, never a default-to-Asset-Gap fallback.
- Distinguishing declared vs resolver-reachable asset-pool counts explicitly.
- Distinguishing capability status from runtime reachability as two separate fields.
- `dashboard-ia-lint` audit before the PK gate.

**Out of scope:**
- Promoting any template or asset. Altering any schedule row or platform pause. Changing selector ranking, `select_template`, or `resolve_slot_assets` logic. Changing portfolio weights or building Template Portfolio Mix / Repetition Controls (PK has explicitly deferred that "next Dashboard outcome" until Creatomate Global ships both layouts — not this task, not even scoped in as a mention beyond this carry note). Creating any publisher profile row. Reproducing classifier/resolver decision logic in the frontend. Reopening broad asset sourcing. A broad dashboard IA overhaul or the Stage-2 work parked in `dashboard-redesign-gap-analysis-brief-v1.md`. Any migration/DDL beyond one additive, dark-shippable read-only function. Deploying, merging, or applying anything — this brief stops before that gate.

## Allowed actions

- Read/query both repos and the live Supabase project (read-only) to ground every field before design.
- `db-rls-auditor`: live, read-only grounding of every cited function/table (grants, current NDIS pause state per platform, current B-roll resolver version, current image-worker deploy state) — **mandatory before any code is written.**
- A short **design gate** before freezing the host shape and the "overall state" rollup rule.
- `ef-builder` ×2 isolated worktrees (CE + `invegent-dashboard`, forked fresh from its own `origin/main` tip).
- `branch-warden` on both repos before any commit.
- `dashboard-ia-lint` on the dashboard diff.
- Orchestrator: `ask_chatgpt_review` on the final combined diff, pinned to its hash; present the exact deploy/merge plan to PK.

## Forbidden actions

- Do NOT promote, retire, activate, or reassign any template.
- Do NOT alter any schedule row, `paused_until`/`paused_reason`, `publish_enabled`, or any publisher profile.
- Do NOT change `select_template`, `resolve_slot_assets`, `classify_format_capability`, or any worker/publisher behaviour.
- Do NOT change selector ranking or any portfolio-weight/repetition-control mechanism.
- Do NOT create a publisher profile row for any client/platform.
- Do NOT reproduce any classifier/resolver decision logic in the frontend — label only what a backend read already returns.
- Do NOT reopen broad asset sourcing or imply a sourcing decision has been made.
- Do NOT default a template-missing, worker-incompatible, publisher-missing, governance-unproven, schedule-missing, or platform-paused cell to "Asset Gap" — misrouting is a defect, PK named this as a success-criterion test.
- Do NOT render a declared asset-pool count as usable where the resolver-reachable count is lower — always show both, flag the delta.
- Do NOT collapse "capability status" and "runtime reachability" into one field/badge.
- Do NOT imply B-roll rotation/geography governance is closed — v1.5 is built+dry-run-proven but NOT applied; live behaviour is still v1.4.
- Do NOT deploy, merge, or apply the CE migration (if any) or the dashboard change without a separate, explicit PK authorization at the deploy/merge gate — this brief's scope ends at build + review.
- **Active hold-states carried forward:** NDIS Instagram/LinkedIn/YouTube publishing remain paused (only Facebook released, fixed order); B-roll resolver v1.5 NOT applied; Template Portfolio Mix / Repetition Controls explicitly PK-deferred; dashboard has zero authorization (do not design as role-gated); cc-0054 remains an open lane elsewhere in the dashboard — re-confirm the host page is clear of it at build time, not from a dated analysis.

## Success criteria

- Every one of the 16 required per-cell fields renders, each traceable to a cited backend read, with `unknown`/`not available` shown honestly wherever a source could not be confirmed — never fabricated.
- Property Pulse, NDIS Yarns, and Care for Welfare proof cases each reproduce exactly as specified above (with the announcement-card/carousel-cover claim shown as its true current state — reconfirmed deployed or not — rather than PK's assumed state, if the two diverge).
- Canonical-ownership routing test passes: a template-missing or publisher-missing cell never routes to Asset Gap.
- Declared-vs-resolver-reachable discipline holds on every cell.
- `db-rls-auditor` PASS on every new read; `branch-warden` safe on both repos; `dashboard-ia-lint` PASS or PK-accepted WARN; external review clean-or-PK-routed on the final combined hash.

## Stop condition

Build + full review chain (db-rls-auditor, branch-warden ×2, dashboard-ia-lint, external review) complete; present the exact deploy/merge plan and preconditions to PK; **STOP at the dashboard merge/deploy gate.** After PK-authorized deploy and a production smoke pass, write the result doc, register pointers, commit, and push — that step is out of scope for this brief.

---

## Notes — open questions requiring a PK gate-1 decision

1. **Tier: T2 or T3?** Closest recent precedent (`creative-template-portfolio-dashboard`, same shape) was tiered T2. The immediately preceding classifier lane tiered a similarly-shaped new SECURITY DEFINER read function T3, reasoning any new privileged read surface over `c.*`/`m.*`/`t.*` is a grant change under Convention 3 regardless of read-only/dark-shipped status. Recommend T2 by closest-precedent analogy; naming the T3 argument for PK to pick.
2. **Host shape** for the composed per-cell read: new standalone RPC vs extension of `get_creative_template_portfolio_summary` vs dashboard-side composition of existing calls (lowest-risk/reuse-first).
3. **"Overall state" derivation rule** — given the evidenced warning against composite health indicators (dashboard-redesign-gap-analysis). Recommend a coarse triage column that always appears *alongside*, never in place of, the granular fields.
4. **"Next scheduled occurrence" source** — the recurring schedule rule (`client_publish_schedule`) vs the actually-materialised slot (`m.slot`/`ice_ro.slot_status`) — these can diverge; pick one explicitly or show both.
5. **Twelve-state asset graduation vocabulary** (sourced / technically validated / human review / fenced / approved / resolver-reachable / render proven / draft proven / publish proven / production eligible / blocked / retired) has no single existing column — needs explicit composition from existing signals at design gate, not invented ad hoc in the frontend.
6. **Relationship to `dashboard-redesign-gap-analysis-brief-v1.md`'s** provisional "Platform health"/"Pool health"/"Slot ledger" sketches — does this supersede, implement, or run parallel to them?

## Named evidence gaps — live reconfirmation needed before/at build (not decided by this brief)

- Current NDIS pause state per platform (only Facebook confirmed released as of the evidence read).
- Current image-worker deployed version — confirm whether `lane/tmr-winner-text-fields-ext` has since merged/deployed before rendering PK's proof-case-1 claim as current fact.
- Live grants/isolation proof for whatever new read surface the design gate selects (db-rls-auditor).
- Live re-confirmation that the host dashboard file is still clear of cc-0054's current target list (branch-warden + a fresh read on `invegent-dashboard`'s current `origin/main`).
- `docs/00_sync_state.md` (1.1MB) was only grepped, not read in full, in the evidence pass for this brief — a register-reconciler pass would reduce staleness risk before build.

**Recommended review chain:** `db-rls-auditor` (mandatory) → design gate (items 1–3 above) → `ef-builder` ×2 → `branch-warden` ×2 → `dashboard-ia-lint` → external review pinned to final hash → PK deploy/merge gate.

---

## Gate-1 + live-grounding outcome (2026-07-30)

**PK decisions:** tier T2 · host shape = extend/compose via the existing proven RPC family (`get_creative_template_portfolio_summary` and siblings) rather than a from-scratch function · overall state = coarse triage column always rendered alongside full per-field detail, never replacing it.

**db-rls-auditor live-grounding pass — results:**
1. NDIS pause state: Facebook + **Instagram** both `paused_until = NULL`; LinkedIn/YouTube `= 2027-01-01`. **This contradicts the brief's assumed "only Facebook released" framing** — no audit-log entry explains the Instagram value. **Escalated separately as its own investigation (task `task_ed28b4c0`, independent of this build)** per PK decision 2026-07-30 — this brief's queue will render NDIS Instagram's live pause state truthfully whatever the investigation concludes; it is not blocked on that outcome.
2. Image-worker v3.34.0 (announcement-card/carousel-cover): merged to `main` (`a7577c22890b0bb3b6d7e915cbf835c84dce6280`) and deployed, drift-clean. The brief's "possibly undeployed" flag is stale — proof case 1's worker-compatible/render-proven claim is now solid.
3. Grants on all 5 target RPCs (`get_creative_template_portfolio`, `get_creative_template_portfolio_summary`, `classify_format_capability`, `select_template`, `resolve_slot_assets`): service_role-only, no anon/authenticated EXECUTE. Clean grant surface to extend.
4. B-roll resolver: confirmed still v1.4 live (no v1.5 code path deployed) — brief's framing holds.

**Cleared to proceed to build** (ef-builder, CE repo first) using the confirmed-live facts above in place of the brief's original (now-superseded) assumptions on items 2–4, and the live-truthful (not brief-assumed) NDIS pause values for item 1.

## Ground-truth update mid-build (2026-07-30, discovered via branch-warden Convention-2 origin-movement check)

While the CE-side migration was being built/reviewed, `origin/main` advanced 3 commits (all PK-authored, unrelated files, no conflict with this lane's 2 files) that materially change facts this brief and its build were grounded in:

- **`ba084d5` "NDIS LinkedIn containment RELEASED — platform 3 of 4"**: NDIS LinkedIn `paused_until` → NULL. NDIS release state is now Facebook + Instagram + LinkedIn all released; **only YouTube remains paused**. This also *retroactively confirms* the Instagram anomaly found during this session's live-grounding pass was a deliberate, monitored, proven release (2nd of 4) — commit message: "The Instagram publish (2026-07-29 19:30:15) confirmed that release's own prediction end-to-end." The separately-escalated investigation (`task_ed28b4c0`) has been dismissed as answered by this evidence. **Proof case 2 in this brief (originally: "Instagram, LinkedIn and YouTube show paused pending their containment releases") is now stale — only YouTube fits that description.** The RPC itself reads `client_publish_profile` live at call time, so its OUTPUT is unaffected and will render this correctly without a code change; only this brief's narrative text was stale.
- **`4527798` "B-roll Rotation Governance v1 APPLIED + PROVEN — resolve_slot_assets v1.5 live"**: resolver **v1.5 is now LIVE in production** (pinned hash-verified apply, 13/13 post-apply proofs passed, pool stays 6, declared==resolver-reachable preserved). **This supersedes both this brief's and this session's own earlier db-rls-auditor finding that "production still runs v1.4"** — that was true at the time it was checked, and has since changed underneath this build. Functionally low-risk for this lane (the new RPC's B-roll counts come from `get_creative_template_portfolio_summary`'s own existing pool-estimate CTE, not a direct `resolve_slot_assets` call, and the v1.5 apply's own proof shows the same pool=6/declared=resolver-reachable numbers) — but any migration comment describing "B-roll rotation/geography governance not yet applied" is now inaccurate and needs a follow-up correction pass.

**Action taken:** cc-0088's worktree rebased cleanly onto the new `origin/main` (`ba084d5`, zero conflicts); grepped for stale v1.4/"not applied" language — none was present (the migration's comments were already written version-agnostically as "an estimate", not tied to a specific resolver version), so no fix was needed.

## Full review chain — outcome (2026-07-30)

| Gate | Verdict | Notes |
|---|---|---|
| `db-rls-auditor` (CE, live BEGIN...ROLLBACK) | concerns → fixed → clean | One comment-provenance defect (runtime_reachable claimed a false predicate-reuse lineage) found and corrected. All 6 proof-case queries, grant checks, and error-handling passed. |
| `branch-warden` (CE) | safe ×3 | Initial build, post-comment-fix amend, post-rebase — all clean, exactly the 2 intended files. |
| ef-builder (dashboard) | complete | 5 files, 362/362 tests pass, clean typecheck, clean build. |
| `branch-warden` (dashboard) | safe | Clean fork from `origin/main` a8ebd05, exactly 5 files, nothing pushed. |
| `dashboard-ia-lint` | WARN (non-blocking) | Two doc-clarity gaps in the IA spec itself (status-vocabulary scoping, missing primary-question marker), zero BLOCK findings. |
| `ask_chatgpt_review` (external) | partial/medium → escalated | Generic SQL-injection/privilege-escalation caution, no specific defect cited. Per standing contract, routed to a dedicated specialist rather than dismissed. |
| `security-auditor` | **GREEN** | Independently refuted both external-review concerns with full call-graph tracing and live grant re-verification. One non-blocking should-fix (F1: documentation addendum naming a minor new aggregated read-grant surface via composition — low-sensitivity config tables, same trust model as sibling functions). |

**Status: all review-chain gates clear. Ready for PK deploy/merge decision — this brief's scope stops here.**
