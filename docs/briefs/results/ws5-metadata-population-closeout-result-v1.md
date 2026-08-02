# Result — WS-5 Metadata Population Closeout (Task A/B/C)

**Seed packet:** `ws5-metadata-population-closeout` (WS-5 DoD completion + register-cut pass), governing
`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-5, §5 WS-5 DoD.
**Executed by:** Claude Code (orchestrator) + `db-rls-auditor` (read-only DB evidence + validator runs)
+ `branch-warden` (git-state verification)
**Completed:** 2026-08-02 Sydney

---

## 1. Result status

`Partial — by design.` Task A (declared contracts) is drafted and validator-clean, but the actual
governed writes (`set_tmr_field_constraints`/`set_tmr_platform_constraints`) are **NOT applied** —
that is its own PK apply gate, per the packet's own instruction ("Every apply is its own PK gate").
Task B is complete (both items verified/closed). Task C (register-cut pass) is complete for every
payload that was ready to cut; one payload (B2 Stage 2) was found already recorded and was
deliberately **not** re-cut (see §5).

## 2. Commit(s)

- Committed on `main` at HEAD `8d92fe0` (verified clean/safe by `branch-warden` immediately before
  this session's edits — 0 ahead/behind `origin/main`, no staged/modified tracked files). Per the
  packet's instruction, **not pushed** — push remains a separate, explicit PK gate.

## 3. Files changed

- `docs/briefs/artifacts/ws5-market-insight-declared-contract-v1.json` — created (Task A)
- `docs/briefs/artifacts/ws5-quote-card-declared-contract-v1.json` — created (Task A)
- `supabase/migrations/20260802010109_ws3_asset_gap_backlog_read_view_v1.sql` — created, byte-exact
  backfill (Task B1)
- `docs/00_sync_state.md` — 5 new pointer entries appended (v6.121–v6.125) (Task C)
- `docs/00_action_list.md` — marker updated + 1 new carry line (`tmr-drift-probe` Option-B patch) (Task C)
- `docs/briefs/results/ws5-metadata-population-closeout-result-v1.md` — created (this file)

---

## 4. Task A — declared contracts for `generic_market_insight_card_1x1_v1` + `generic_quote_card_1x1_v1`

**Evidence sources:** live registry reads (`db-rls-auditor`, both templates' field/suitability rows,
all confirmed NULL `constraints` baseline) + `supabase/functions/image-worker/{b1_production.ts,
branch_b_proof.ts}` (the only code that maps/bounds these templates' text fields) + the WS-5 design
packet's `tmr_field_constraints_v1` shape spec.

**Both contracts pass `public.validate_tmr_template_intake(NULL, contract)` in declared-only mode:
`verdict=pass`, `hard_failure_count=0`.** Three validator round-trips were needed to reach a clean
pass (each genuinely caught a real shape defect in the drafted JSON, not a validator bug):
1. Extra unrecognized keys in the top-level `template` object → `declared_template_section_invalid`.
2. Missing `collapse` object on 10 text elements across both files → `collapse_required_object`.
3. Over-length `container.summary`/`notes` strings (>500 chars) on 7 elements → `notes_invalid`
   (empirically bounded — not documented in the design packet's prose, discovered via the char-length
   pattern across pass/fail elements).

**Calibration queue surfaced (`calibration_required[]`, matches P-7 wording — not a failure at
intake):** market-insight: `Headline.max_lines`, `Subtitle.max_lines`, `CategoryBadge.max_chars`,
`Location.max_chars`, `Date.max_chars`, `Footer.max_chars` (6 items). quote-card:
`QuoteText.max_lines`, `Attribution.max_chars`, `SourceLabel.max_chars`, `Footer.max_chars` (4 items).
None invented — every TBC value stayed `null`/`to_be_calibrated`, consistent with the never-invent
discipline.

**Open items flagged for the PK gate, not silently resolved:**
- **Registry `status` still `smoke_rendered` for both templates**, despite `platform_publish`
  proof_status=`passed` events and fresh 2026-08-02 `visual_approval` proof events for both
  (`db-rls-auditor` finding). The proof-event trail supports "production-proven" language; the
  registry `status` column does not yet reflect it. Recommend confirming/promoting status as its
  own small governed step, separate from this population.
- **`content_source` vocabulary gap:** `tmr_field_constraints_v1`'s six-value vocabulary
  (`ai_authored·worker_computed·template_fixed·governed_asset·brand_profile_colour·render_binding`)
  has no dedicated value for "per-client governed creative-contract text" (category/footer/location/
  attribution/source_label — resolved via `resolveCreativeContract`, TMR D6-5). Classified
  `worker_computed` as the closest fit; flagged as a real open question for the shape's owner, not
  silently decided.
- **`generic_quote_card_1x1_v1` has NO structural layout guard** (unlike market-insight/announcement
  card) — `QuoteText`'s 180-char bound has never been probed against this template's box; cc-0049's
  own result doc names this as a real, currently-open production risk, not a WS-5 finding. Carried
  into the calibration queue at high priority (`overflow_risk: high`).
- **Template `width`/`height` (1080×1080) inferred from the `1x1` naming convention**, not confirmed
  against a stored dimension column — the live registry query that returned template rows did not
  surface width/height. Flag for confirmation before any future capture-check-mode validation run.

**NOT done this lane (explicit non-claim):** no `set_tmr_field_constraints`/
`set_tmr_platform_constraints` calls were made — zero DB writes. The two JSON artifacts above are
the PK apply-gate input; PK's own choice (per the packet) is one combined gate or one per template.

## 5. Task B — hygiene carries

### B1 — ledger backfill: migration `20260802010109`

**Confirmed missing** from the repo (glob: zero matches) despite being live (`list_migrations`
confirms the ledger name `ws3_asset_gap_backlog_read_view_v1`). The frozen, already-applied artifact
that produced this exact migration was found still on disk at
`docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql` (sha256 `8d5ca12d…8985` — the same hash
cited in `docs/briefs/results/ws3-asset-gap-read-view-result-v1.md` as what was actually applied via
`apply_migration`). Backfilled by copying that artifact byte-exact to
`supabase/migrations/20260802010109_ws3_asset_gap_backlog_read_view_v1.sql` — **sha256 verified
identical to the frozen artifact after copy.** This is the strongest form of the cc-0087 pattern
(recovering the literal applied bytes, not reconstructing from `pg_get_viewdef`), no live DB read
needed to prove exactness. Zero production behaviour change — the view has been live since
2026-08-02; this only closes the git↔ledger gap.

### B2 — B2 Stage-0 rider-rollback carry (v6.120)

**Already resolved, verified not re-done.** Both the forward migration
(`supabase/migrations/20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql`) and its
paired rollback (`ROLLBACK_20260801120000_...sql`) exist on disk. Commit `992f359` (2026-08-02,
already on `main` before this session started) corrected the Stage-0 result doc's stale "review
pending" language: the `db-rls-auditor` review (verdict `concerns`, non-blocking) and `branch-warden`
review (verdict `safe`) had actually both run, in the same originating session, before the commit
that landed the migration files — only the doc's prose lagged. v6.120's own "found absent" framing
predates that correction. **Closed in the register at v6.122** (see §6) — the v6.120 carry line is
now honestly superseded, not silently dropped (v6.120 itself is not rewritten, per Convention 1).

## 6. Task C — register-cut pass

Ran as the single register-cut owner for this pass (packet's explicit instruction), `claim-stub`-
checked before allocating (`node .claude/helpers/claim-stub.mjs`, scanned register head v6.120 →
normal sequential cut v6.121; the tool's `high=v7.8` reserved-or-ahead advisory was reviewed and
judged not applicable — every claimant in this session's own evidence chain (v6.117 through v6.120)
uses the v6.1xx sequence, and this pass continues that same register, not an unrelated reserved
block). `branch-warden` re-verified immediately before editing: `main` clean, `HEAD=8d92fe0`, 0
ahead/behind `origin/main` — safe to commit.

**Cut, in order:**

- **v6.121** — WS-4/D4 PP YouTube kinetic: **DEPLOYED + ACTIVATED + `overall_state='ready'`**
  (supersedes v6.119's "dark, deploy pending" framing). Source: `docs/briefs/results/pp-yt-kinetic-
  worker-and-graduation-result-v1.md` (commit `b5bcd8b`). `video-worker` v3.16.2 deployed
  (`deploy-verifier`-confirmed content PASS), activation migration `20260802000000` applied
  (`status: inventory_captured→visually_approved`, `governance.enabled: false→true`),
  `classify_format_capability`/readiness-queue independently re-read live and confirmed `ready`/
  `selectable`/`runtime_reachable`. Rungs 8–9 (real draft + publish) deliberately left to land
  naturally via the scheduled S9 cron slot (`2026-08-03T07:00:00+00:00`), not forced.
- **v6.122** — B2 Stage-0 forensic reconstruction: **TERMINAL**, closing the v6.120 carry (§5 B2
  above). Source: `docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-reconstruction-
  v1.md` (merge `474be78`, correction `992f359`).
- **v6.123** — D2: PP legacy-carousel governance declaration **APPLIED**. Source:
  `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md` (merge `ec1c3c8`).
  One additive row in `c.client_creative_governance` (property-pulse × carousel, `enabled=true`),
  PK Option C accepted (disclosed `tmr-drift-probe` side effect — see the action-list carry below).
- **v6.124** — T1 hygiene carries closed this pass: the B1 ledger backfill (§5 B1 above) and the B2
  rider-rollback carry closure (folded into v6.122's own text rather than duplicated here).
- **v6.125** — WS-5 metadata population closeout (Task A, §4 above): both declared contracts
  authored + validator-clean, **NOT applied** — awaiting a PK Gate-2 apply decision (one combined
  gate or one per template, PK's choice per the packet).

**Action-list carry added (no version — per the drafted payload's own instruction):**
`tmr-drift-probe` should be patched to skip governance rows with no resolvable
`declarative_registry_ref` instead of failing its whole daily run (Option B from the D2 decision,
queued as future T2 work; the probe's daily status reads `error`, not `ok`, starting 2026-08-02 —
expected/disclosed per PK's Option C acceptance, not a new incident if seen).

**Deliberately NOT cut — found already recorded:** the drafted "B2 Stage 2" pointer payload
(`docs/briefs/artifacts/b2-register-pointer-payloads-draft-v1.md` Payload 2) cites the exact same
three merges (`3dd207a`/`ef0eee9`/`e9e18ad`) already recorded at **v6.118**. Re-cutting it would have
been a duplicate register entry. This is flagged here as a real finding, not silently reconciled —
the draft payload doc appears to have been prepared before its author checked whether v6.118 already
covered this ground (v6.118 was itself cut mid-session, by a different lane, before the payload draft
was written).

## 7. Constraints confirmed

- Zero DB writes performed by Task A (the two declared contracts are read-only validator inputs).
- Zero DDL/DML beyond the B1 backfill, which is a repo-file-only change (no `apply_migration`/
  `execute_sql` write call was made for it — the object has been live since 2026-08-02).
- No push to `origin/main` — commit only, per the packet's instruction and this repo's standing
  push-is-a-hard-stop rule.
- No file outside the declared set touched; `branch-warden` re-verification confirms the staged set
  matches exactly what's listed in §3.

## 8. Open issues

- Task A's actual population apply (the `set_tmr_field_constraints`/`set_tmr_platform_constraints`
  CAS writes) is unstarted — PK gate pending, per §4.
- The registry-status / proof-event discrepancy (§4) is unresolved — a PK/owner judgment call, not a
  defect this lane can fix.
- The `content_source` vocabulary gap (§4) is an open question for whoever owns the WS-5 shape spec.
- `tmr-drift-probe` Option-B patch (action-list carry) is real, scoped, future work — not started.
- Push to `origin/main` is withheld pending explicit PK instruction.

## 9. Next recommended step

PK gate on Task A: authorize (or decline/modify) the `set_tmr_field_constraints`/
`set_tmr_platform_constraints` population for both templates against the two validated declared
contracts — one combined gate or one per template. Separately, confirm whether this session's commit
(register cut + Task A/B artifacts) should be pushed to `origin/main`.

---

## 10. Verification (chat fills this)

**Verdict:** `Pass with notes` — every claim in this doc is evidence-cited against live reads or
byte-verified file state; the two genuine open items (registry status vs. proof events; the
content_source vocabulary gap) are surfaced, not smoothed over; the duplicate Stage-2 payload was
caught before being re-cut.

## 11. Non-claims

This result does not apply the WS-5 population writes, does not resolve the registry-status
discrepancy, does not decide the content_source vocabulary question, does not patch
`tmr-drift-probe`, and does not push or merge anything to `origin/main`.
