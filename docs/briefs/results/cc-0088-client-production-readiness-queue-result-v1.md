# Result — cc-0088 Client Production Readiness Queue v1

**Brief:** `docs/briefs/cc-0088-client-production-readiness-queue-brief-v1.md`
**Status:** LIVE (2026-07-30). CE migration applied to production; dashboard tab merged to `main` and deployed.
**Tier:** T2 (PK-confirmed at Gate 1).

## Outcome

One authoritative client-level queue now exists showing, for every relevant client × platform × requested-format cell: scheduled demand, next scheduled occurrence (+ source), platform pause/release state, publisher readiness, capability status + reason, runtime reachability (as a field distinct from capability status), current practical template winner, eligible-template count, required asset slots, declared vs resolver-reachable asset-pool counts, minimum required pool, missing proof/governance gate, responsible remediation lane, next required outcome, and a coarse overall state (Ready/Blocked/Waiting for proof/Not configured) rendered alongside — never in place of — the granular detail. This is the dashboard foundation for restarting Asset Gap as a demand-driven function, per PK's original framing.

## What shipped

**CE repo** (`Invegent-content-engine`, commit `5f9131c` on `main`, migration `20260730120000_client_production_readiness_queue_rpc_v1.sql`): one new additive `SECURITY DEFINER` SQL function, `public.get_client_production_readiness_queue(p_client_slug text)`. Pure read-only composition of five already-live sources — `classify_format_capability`, `get_creative_template_portfolio_summary`, `platform_support` × `client_format_config` (independently-computed `runtime_reachable`), `client_publish_profile`/`client_publish_schedule`, `m.slot`, `client_brand_asset`. No existing function/table/grant modified. `service_role`-only EXECUTE (anon/authenticated explicitly revoked). Applied live 2026-07-30; smoke-tested against all three PK-named clients (property-pulse: 40 cells, ndis-yarns: 46 cells, care-for-welfare-pty-ltd: 7 cells, all non-empty).

**Dashboard repo** (`invegent-dashboard`, commit `fc9c5c9` on `main`, Vercel deployment `dpl_Depi6PAekXru9yWEumsFM4d5UftK`, READY/production): new read-only "Production Readiness Queue" tab on `/clients?client=<slug>`, zero controls, reads the RPC via a `'use server'` action mirroring the existing `creative-templates` action's pattern. Capability status and runtime reachability render as two distinct badges (never collapsed). Declared and resolver-reachable asset counts always render together. `responsible_lane` fails closed (never silently coerced to Asset Gap). 362/362 tests pass, clean typecheck, clean build. Includes one bundled docs-accuracy fix (`docs/dashboard/global-client-picker-v1-brief.md`, correcting a stale "Slice 3 deferred" claim the live code had already superseded).

## Canonical gap-ownership routing — implemented and tested

Mechanical mapping off `classify_format_capability`'s own status + the function's own paused/schedule/config signals: `asset_shortage`→Asset Gap, `template_missing`→Creatomate Global, `pipeline_missing`→worker lane, `publisher_path_missing`→publisher/onboarding, `governance_unproven`→graduation/governance, `unsupported_silent_degrade`→capability/template remediation, no-demand/probe cell→dashboard/onboarding, currently-paused platform→capability enforcement (evaluated ahead of every other branch — a deliberate containment hold wins regardless of what the classifier would otherwise say). `asset_gap` fires **only** from `asset_shortage` — never a default fallback. Verified live for care-for-welfare-pty-ltd × youtube (routes to `publisher_onboarding`, not `asset_gap`, despite appearing as a probe cell) and for ndis-yarns × facebook × carousel (routes to `capability_template_remediation`, not `asset_gap`).

## Review chain (full)

| Gate | Verdict |
|---|---|
| `db-rls-auditor` (CE, live `BEGIN...ROLLBACK`) | concerns → fixed → clean (one comment-provenance defect corrected) |
| `branch-warden` (CE) | safe ×4 (build, comment-fix amend, rebase, F1-addendum amend) |
| `branch-warden` (dashboard) | safe ×1 |
| `dashboard-ia-lint` | WARN, non-blocking (two IA-spec doc-clarity gaps, zero BLOCK) |
| `ask_chatgpt_review` (external) | partial/medium → escalated (generic caution, no defect cited) |
| `security-auditor` | **GREEN** — independently refuted both external-review concerns; one non-blocking should-fix (F1, addressed) |

## Deploy record

- CE: pushed `lane/cc-0088-client-production-readiness-queue` → `origin/main` fast-forward (`c9bf193..5f9131c`), then `apply_migration` (project `mbkmaxqhsohbtwsqolns`) — success. Live-verified: `prosecdef=true`, `service_role`-only grant, zero related security-advisor findings.
- Dashboard: pushed `claude/cc-0088-production-readiness-queue` → `origin/main` fast-forward (`a8ebd05..fc9c5c9`) — Vercel auto-deployed to production, `state=READY`.
- Rollback (untaken, available): `DROP FUNCTION IF EXISTS public.get_client_production_readiness_queue(text);` — nothing else was created by the forward migration.

## Discovered mid-lane (handled, not left open)

- **NDIS Instagram pause-state anomaly** — live-grounding found Instagram's `paused_until` already NULL, contradicting the brief's assumed "only Facebook released" framing. Escalated as a standalone investigation, then resolved by direct evidence in a since-landed commit (`ba084d5`, NDIS LinkedIn containment release) confirming Instagram's release was deliberate, monitored, and proven — not a gap. Investigation task withdrawn as answered.
- **Origin moved twice during the CE build** (NDIS LinkedIn containment release, B-roll Rotation Governance v1 apply) — both independently verified benign/unrelated per the standing Convention-2 check (zero file overlap), rebased through cleanly each time.

## Carried / open (not blocking, not silently resolved)

- Six explicit design-gate judgment calls in the migration's own header comment (J1–J6): single-most-constraining asset role only (not full per-role breakdown); `minimum_required_pool=1` for non-B-roll roles is a reasonable default, not PK-ratified; `resolver_reachable_asset_count` reuses an existing pool-estimate approximation (no `platform_scope` check, same as its precedent); `next_occurrence_source='projected_schedule'` only on exact format-override match; NULL-vs-zero distinction on asset fields when zero candidate templates exist.
- `dashboard-ia-lint`'s two WARNs are unresolved IA-spec doc-clarity questions (whether capability/readiness status vocabularies need `lib/intent-status.ts` placement; missing primary-question marker convention) — recommended as a future light-touch spec amendment, not scoped into this lane.
- Per the brief's own carry note: the next Dashboard outcome (Template Portfolio Mix / Repetition Controls) stays deferred until Creatomate Global ships two distinct production layouts — not started, not implied by this lane.
