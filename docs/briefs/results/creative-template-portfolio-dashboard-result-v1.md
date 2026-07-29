CLAIMED · creative-template-portfolio-dashboard-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1/2 record · 2026-07-29

# Result — Creative Templates Dashboard Section + Seven-State Capability Correction

**Brief file:** `docs/briefs/creative-template-portfolio-dashboard-gate1-v1.md`
**Executed by:** chat (orchestrator-driven: `ef-builder` ×2 isolated worktrees, `db-rls-auditor` ×2,
`branch-warden` ×2, external review ×2 rounds, explicit PK deploy/merge authorization)
**Completed:** 2026-07-29 Sydney

---

## 1. Result status

`Complete`. Both deploys live: CE migration applied to production, dashboard merged +
Vercel-deployed. Full T2 review chain clean, explicit PK authorization taken before any
apply/merge, production smoke pass on the DB side (dashboard UI visual check is a carried
gap — see §6).

## 2. Commit(s)

- CE repo `dbe7956` — migration + rollback + Gate-1 brief (`main`, pushed).
- `invegent-dashboard` `aa8209f` — Creative Templates tab + seven-state capability fix
  (pushed directly to `main`, fast-forward from `origin/main` tip `80e7185`).

## 3. Files changed

CE repo:
- `supabase/migrations/20260729160000_creative_template_portfolio_read_rpc_v1.sql` — created
- `supabase/migrations/ROLLBACK_20260729160000_creative_template_portfolio_read_rpc_v1.sql` — created
- `docs/briefs/creative-template-portfolio-dashboard-gate1-v1.md` — created

`invegent-dashboard`:
- `actions/creative-templates.ts` — created
- `lib/creative-templates.ts` — created
- `components/clients/CreativeTemplatesTab.tsx` — created
- `components/clients/creative-templates/{PortfolioSummaryPanel,BrollStatusCard,TemplateDossierList}.tsx` — created
- `app/(dashboard)/clients/page.tsx` — modified (new tab wiring only)
- `lib/format-capability.ts`, `components/format-capability/CapabilityCell.tsx` — modified (7th status)
- `tests/format-capability.test.ts` — modified (test updated for the 7th status)

## 4. Actions taken

- Drafted the Gate-1 brief directly (task was already fully specified by PK; plan-mode
  approval served as Gate 1), grounded in the 27-template graduation matrix, the B-roll
  rotation readiness handoff, and the S5 capability-classifier result doc.
- `ef-builder` (CE, isolated worktree) authored the migration: two additive-only SECURITY
  DEFINER RPCs, `get_creative_template_portfolio(text)` and `_summary(text)`, mechanically
  deriving Lifecycle/Runtime/blocker/next-gate via one precedence-ordered CASE chain each,
  a single hardcoded+cited provider-deletion override, and a live-queried B-roll eligible-pool
  count.
- `db-rls-auditor` live review caught one real blocking defect (`c.client_brand_asset.approved`
  isn't a column, it's an `asset_meta` key) — fixed, independently re-verified by me reading the
  corrected lines. A follow-up pass, triggered by the external reviewer's evidence request,
  specifically traced client isolation through the more complex summary RPC and confirmed it
  airtight; surfaced two non-blocking documentation gaps, closed as comment-only fixes.
- `ef-builder` (dashboard, fresh isolated worktree forked from `origin/main`'s exact tip —
  explicitly NOT the diverged local `tmr-template-intake-ui-v0` checkout) built the tab + the
  seven-state capability label extension. Hermetic checks: `tsc --noEmit` clean, `vitest run`
  321/321, `next build` clean.
- `branch-warden`: safe on both repos, each checked twice (before and after the isolation
  follow-up / doc fixes).
- External review: round 1 `partial` (two pushback points: a `missing_evidence` isolation
  question, resolved with the follow-up audit; a `policy_decision` on the hardcoded B-roll
  literals, routed to PK). Round 2 `agree`, medium risk, high confidence, zero pushback
  (`review_id e34e2e42-0808-4af3-a8ab-17da24de8a99`, pinned `81362a34…`).
- Presented the full chain + the one open policy call to PK. **PK decision:** keep the
  hardcoded `VALUES` list (not a new evidence table); **authorized deploy.**
- Applied the CE migration live via `execute_sql` (not `apply_migration`, per house gotcha)
  against `mbkmaxqhsohbtwsqolns`, plus an explicit `supabase_migrations.schema_migrations`
  ledger insert (avoiding the exact under-recording gap flagged against the prior S5 lane).
- Verified live: grants (`service_role`-only, confirmed via `pg_proc.proacl`), row counts by
  client isolation (PP=27, NDIS=25 — the 2-row delta matches PP's known client-scoped rows),
  PP's real production winner (`48cba556`) correctly `production_proven`/`production_winner`,
  the deleted-provider template (`fb9820f8`) correctly `retired`/`provider_missing` with an
  honest blocker text, B-roll status honestly showing saved 720×1280/8s vs effective
  1080×1920/12s with `single_clip_warning=true`/`below_floor=true`, and
  `classify_format_capability('care-for-welfare-pty-ltd','youtube','video_long_form')`
  returning `publisher_path_missing` live (the exact S5-cited example).
- Merged + pushed the dashboard branch directly to `origin/main` (fast-forward, re-verified
  fresh immediately before push — no drift from the branch's fork point). Vercel auto-deployed
  to production (`dpl_4d7R7fmi9TXjcZvP6Bs6oTBuf1Tv`, READY, build completed clean in 41s, zero
  runtime errors in the hour after deploy).

## 5. Constraints confirmed

- Read-only visibility only — confirmed no promote/retire/activate control exists anywhere in
  either diff (grepped for forms/buttons in every new component; none found).
- No existing function/table/grant/RLS policy/index touched — confirmed via `git diff --stat`
  on both repos (exactly the new/expected files) and `db-rls-auditor`'s live grant/RLS check.
- No registry row mutated — `c.creative_provider_template.status` for `fb9820f8` was **not**
  touched by this lane (it had already independently self-corrected to `deprecated` between
  the graduation matrix and this lane, per a concurrent `creatomate-registry-repair-packet-v1`
  effort — not this lane's doing, confirmed by live `fit_reason` text on the variant_candidate row).
- No classifier logic reproduced in the frontend — confirmed: the seven-state change only adds
  label/tone entries keyed by a status string the DB already returns.
- Deploy/merge only after explicit PK authorization — confirmed; nothing was applied/merged
  before PK's "go ahead."

## 6. Open issues

- **UI visual smoke not completed.** The live dashboard (`dashboard.invegent.com`) sits behind
  a login form; I have no credentials and should not obtain or enter them. I verified
  correctness at the DB layer (live RPC calls proving every behavioral claim in PK's
  verification checklist) and at the deploy layer (Vercel build clean, zero runtime errors
  post-deploy), but did not visually confirm the rendered tab in a browser. **PK should do one
  visual pass** on `/clients?client=property-pulse&tab=creative-templates` to close this gap.
- Two carried, non-blocking items, both documented inline in the migration: (a) `recent_uses`
  under-reports renders where `m.post_render_log.client_id` is null but the linked draft's
  client_id is correct (confirmed live, doesn't leak, not fixed); (b) the B-roll
  winner/spec fields in the summary RPC are global constants, not per-client-verified — now
  clearly commented.
- Static-family "worker_unsupported" classification for video families beyond the proven
  `stat_hero_card` shape is a conservative default per the brief's own note — flagged there,
  not re-flagged here as new.

## 7. Next recommended step

PK visual smoke pass **completed** (2026-07-29) — §1/§2 confirmed exactly as expected; §3
(seven-state fix) surfaced a real, traced dashboard visibility gap, now tracked as its own
follow-up: `docs/00_sync_state.md` v6.65, pointer `docs/00_action_list.md`. Not a classifier
defect — `classify_format_capability` still correctly returns `publisher_path_missing` live;
the gap is that the one page rendering the status (`WeekFormatPlanTab.tsx`) only shows
scheduled `(platform,format)` pairs, and the two clients missing a publisher path also have
zero YouTube schedule rows. Needs its own Gate-1 scope decision before any build. Beyond that:
no further action required this lane — governed controls (promote/retire/activate) are
explicitly a separate, later, governed outcome per PK's original brief, not started here.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matches PK's brief exactly: every required field present in the per-template dossier,
  Lifecycle/Runtime as two distinct badges, raw evidence always shown alongside derived state,
  portfolio visibility (winner/alternates/repetition/variety-source) present, B-roll status
  card with honest saved-vs-effective spec and pool warnings, seven-state capability
  correction shipped and live-verified.
- All constraints respected (§5). No unexpected files touched in either repo, confirmed twice
  by `branch-warden` and by my own direct diff reads.
- Success criteria met on the DB side with live proof; the one open note is the UI visual pass
  (§6), not a functional gap — every behavioral claim was independently proven via direct RPC
  calls against production, not just inferred from code review.
- No new risks beyond what was already carried into the plan (B-roll pool still below floor,
  hardcoded literals need manual refresh if the worker overlay changes — both pre-existing,
  both documented, neither created by this lane).

## 9. Learning notes (chat fills this)

- The external review bridge's evidence-gap pushback (round 1) was worth acting on literally:
  a targeted follow-up `db-rls-auditor` pass produced genuinely new, independent structural
  confirmation of client isolation rather than just re-asserting the same claim — this is the
  CCF-02 `missing_evidence` triage class working as designed, not a formality to route around.
- A concurrent, unrelated lane (`creatomate-registry-repair-packet-v1`) had already corrected
  the exact DB contradiction this feature's demo case was built around (`fb9820f8`'s status)
  between the graduation matrix being written and this lane executing — a reminder that "known
  ground truth" docs can go stale within the same day on a fast-moving shared database, and
  that live-testing every specific example cited in a brief (rather than trusting the citing
  doc) is what caught it here.
- Login-gated production UIs are a real, recurring verification limitation for this
  orchestrator — DB-level and deploy-health verification substituted well here (every claim was
  independently, live-proven), but a true end-to-end visual check still needs PK when a
  password gate is in the way. Worth remembering as a standing constraint on "production smoke"
  scope for future dashboard lanes, not something to attempt to route around.
