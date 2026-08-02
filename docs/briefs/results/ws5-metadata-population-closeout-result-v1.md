# Result — WS-5 Metadata Population Closeout (Task A/B/C)

**Seed packet:** `ws5-metadata-population-closeout` (WS-5 DoD completion + register-cut pass), governing
`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-5, §5 WS-5 DoD.
**Executed by:** Claude Code (orchestrator) + `db-rls-auditor` (read-only DB evidence + validator runs)
+ `branch-warden` (git-state verification)
**Completed:** 2026-08-02 Sydney

---

## 1. Result status

`Complete.` Task A's declared contracts are authored, validated, and **now APPLIED** — both
templates' field/platform constraints are live (PK-authorised, 2026-08-02, see §4a). Task B is
complete (both items verified/closed). Task C (register-cut pass) is complete for every payload
that was ready to cut; one payload (B2 Stage 2) was found already recorded and was deliberately
**not** re-cut (see §5).

## 2. Commit(s)

- First commit `80ab857` on `main` (register cut v6.121–v6.125 + Task A/B artifacts) — **pushed to
  `origin/main`, PK-authorised** (fast-forward, verified conflict-free by fresh `branch-warden`
  immediately before push).
- Second commit (this update, pending) — records the Task A apply (corrected `field_kind` values,
  applied contracts, before/after validator outputs, register entry v6.126). Push authorization to
  be confirmed with PK per this repo's standing per-commit push gate.

## 3. Files changed

- `docs/briefs/artifacts/ws5-market-insight-declared-contract-v1.json` — created, then corrected
  (`output_type: image→static_image`; `Background`/`Logo` `field_kind: image→background/logo`)
  (Task A)
- `docs/briefs/artifacts/ws5-quote-card-declared-contract-v1.json` — same two corrections (Task A)
- `supabase/migrations/20260802010109_ws3_asset_gap_backlog_read_view_v1.sql` — created, byte-exact
  backfill (Task B1)
- `docs/00_sync_state.md` — 5 pointer entries (v6.121–v6.125) + 1 more (v6.126, the Task A apply)
  (Task C)
- `docs/00_action_list.md` — marker updated + 1 new carry line (`tmr-drift-probe` Option-B patch) (Task C)
- `docs/briefs/results/ws5-metadata-population-closeout-result-v1.md` — this file, updated with the
  apply record

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

## 4a. Task A — APPLY (PK-authorised, 2026-08-02)

**PK authorisation (direct, this session):** population writes authorised for both templates,
under an explicit discipline — per template: fresh declared-only PASS immediately before writing;
writes via `set_tmr_field_constraints`/`set_tmr_platform_constraints` CAS-from-NULL only; every
numeric limit a calibration triple; re-run the validator after writing and attach both outputs;
**any validator failure or CAS mismatch = STOP and report, don't adapt silently.**

**A real defect was found and reported, not silently fixed.** The first real-apply attempt for
`generic_market_insight_card_1x1_v1` (a self-aborting transaction — dry-run first, then the real
attempt) failed its in-transaction `validate_tmr_template_intake` capture-check gate:
`field_kind_mismatch` on `Background` (`captured: "background"`, `declared: "image"`) and `Logo`
(`captured: "logo"`, `declared: "image"`) — 2 hard failures. **Root cause:** the live registry's
`field_kind` controlled vocabulary (`text·image·logo·background·shape·audio·video`, enforced inside
`set_tmr_field_constraints` itself) distinguishes `background`/`logo` as their own values, not a
generic `image`; the declared contracts had used `"image"` for both, a misreading of an earlier
evidence summary's ambiguous "image/background"/"image/logo" notation. **Zero writes persisted** —
independently re-verified by direct table read immediately after the error
(`c.creative_provider_template_field`: 0/9 non-null, `c.creative_template_platform_suitability`:
0/4 non-null for the market-insight template) before reporting to PK. Per instruction, stopped and
reported rather than auto-correcting. **PK reviewed and authorised the fix + retry** ("Fix it and
retry both templates").

**Fix applied to both artifacts:** `field_kind` corrected to `"background"`/`"logo"` for the
`Background`/`Logo` elements (matching the live registry exactly); both files re-confirmed valid
JSON. Declared-only validation re-run fresh on both (immediately before writing, per PK's
discipline) — both `verdict=pass`, `hard_failure_count=0` (identical to the pre-fix runs; the
`field_kind` key is not checked in declared-only mode, only in capture-check mode against the live
row, which is exactly where the original defect surfaced).

**Live writes executed, each as one self-aborting transaction (all field CAS writes + all platform
CAS writes + an in-transaction `validate_tmr_template_intake` capture-check gate; any `error` key
or non-`pass` verdict → `RAISE EXCEPTION` → full rollback):**

| Template | Field writes | Platform writes | In-txn gate | Committed |
|---|---|---|---|---|
| `generic_market_insight_card_1x1_v1` (`0e006c5c…`) | 9/9 `ok:true` (Headline/Subtitle/CategoryBadge/Location/Date/Footer/Background/Logo/Scrim, all CAS-from-NULL) | 4/4 `ok:true` (facebook/instagram/linkedin feed, website card) | `verdict:pass, hard_failure_count:0` | ✅ |
| `generic_quote_card_1x1_v1` (`1cfe0f9c…`) | 8/8 `ok:true` (QuoteText/Attribution/SourceLabel/Footer/Background/Logo/QuoteMark/Scrim, all CAS-from-NULL) | 4/4 `ok:true` (same 4 platform/placement pairs) | `verdict:pass, hard_failure_count:0` | ✅ |

**Independent post-commit verification (separate reads, not the in-transaction result):**
- Row counts: market-insight fields 9/9 non-null, suitability 4/4 non-null; quote-card fields 8/8
  non-null, suitability 4/4 non-null — exactly the expected population, nothing extra, nothing
  missing.
- Fresh, independently-run `validate_tmr_template_intake(template_id, contract)` capture-check for
  **both** templates: `verdict=pass, hard_failure_count=0`, identical `calibration_required[]`
  queues to the in-transaction result (6 items market-insight, 4 items quote-card — see §4).

**Both templates now carry live, governed, validator-confirmed constraints.** This is the WS-5 DoD's
"2–3 production-proven templates populated" clause — 3 templates now carry calibrated/declared
constraints counting the kinetic template (v6.109-era) plus these two. The registry `status`-vs-
proof-event discrepancy (§4) is unchanged by this apply — still an open item, not resolved here.

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
  gate or one per template, PK's choice per the packet). **Superseded same-session by v6.126** (§4a)
  once PK authorised and the apply completed — v6.125 itself is not rewritten, per Convention 1.
- **v6.126** — WS-5 metadata population: Task A **APPLIED** (§4a above). PK-authorised both
  templates; one real defect found and reported (STOP, not silently fixed) — `field_kind` mismatch
  on `Background`/`Logo` (declared `image`, live `background`/`logo`) — zero writes persisted on
  that attempt; PK reviewed and authorised the fix + retry. Both templates now committed:
  `generic_market_insight_card_1x1_v1` (9 fields + 4 platforms) and `generic_quote_card_1x1_v1`
  (8 fields + 4 platforms), each via one self-aborting transaction with an in-transaction
  capture-check gate, independently re-verified post-commit. `verdict=pass, hard_failure_count=0`
  for both, both times.

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

- Task A's writes were exactly the PK-authorised discipline: CAS-from-NULL only, every numeric limit
  a calibration triple, no invented numbers, fresh validator immediately before writing, in-transaction
  + independent post-commit re-validation both attached.
- The one real defect found (`field_kind` mismatch) triggered a genuine STOP-and-report, not a
  silent fix — zero writes persisted from the failed attempt, independently re-verified before
  reporting.
- Zero DDL/DML beyond the B1 backfill and the Task A field/platform-constraint writes (both governed
  writer-RPC calls, no raw table DML, no DDL).
- No file outside the declared set touched; `branch-warden` re-verification confirmed the first
  commit's staged set matched exactly what's listed in §3.
- First commit (`80ab857`) pushed to `origin/main`, PK-authorised, verified fast-forward/
  conflict-free immediately before push.

## 8. Open issues

- The registry `status`-vs-proof-event discrepancy (§4) is unresolved by this apply — a PK/owner
  judgment call, not a defect this lane can fix.
- The `content_source` vocabulary gap (§4) is an open question for whoever owns the WS-5 shape spec.
- `generic_quote_card_1x1_v1`'s missing structural layout guard (§4) remains open — a probe/design
  carry, unaffected by this metadata population.
- `tmr-drift-probe` Option-B patch (action-list carry) is real, scoped, future work — not started.
- The second commit (this apply + v6.126 register entry) has not yet been pushed — confirm with PK.

## 9. Next recommended step

Confirm push of the second commit (Task A apply + v6.126 register entry) to `origin/main`. Beyond
that, this lane's own scope is closed — the registry-status discrepancy, content_source vocabulary
question, quote-card layout-guard gap, and `tmr-drift-probe` patch are each their own future,
separately-gated lane.

---

## 10. Verification (chat fills this)

**Verdict:** `Pass with notes` — every claim in this doc is evidence-cited against live reads or
byte-verified file state; the two genuine open items (registry status vs. proof events; the
content_source vocabulary gap) are surfaced, not smoothed over; the duplicate Stage-2 payload was
caught before being re-cut; the one real write-time defect (`field_kind` mismatch) was caught,
reported, and fixed only after PK review — not silently adapted.

## 11. Non-claims

This result does not resolve the registry-status discrepancy, does not decide the content_source
vocabulary question, does not build the quote-card layout guard, does not patch `tmr-drift-probe`,
and does not push the second commit without PK confirmation.
