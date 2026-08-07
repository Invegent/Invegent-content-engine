# Result — CGU Final Build Lane (recycled from M16): M14 Lane-B WS-1 + WS-3 (isolated, non-production)

**Seed:** cross-session control-tower dispatch, "M14 Lane-B build prep: WS-1 + WS-3" (2026-08-06), final mission in the v6.147 §3 recycle queue
**Governing ruling:** `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` (isolated, non-production implementation only)
**Design authority:** `docs/briefs/results/s1-m14-calibration-backfill-inventory-v1.md` (backlog inventory) + the WS-5 machinery precedent (`ai-worker/stat_envelope.ts`, `video-worker/b1_video_stat.ts`, the `set_tmr_field_constraints` CAS RPC)
**Executed by:** Claude Code orchestrator (live constraints baseline + source-archaeology handoff) + `ef-builder` subagent + `branch-warden` verification
**Completed:** 2026-08-06 Sydney
**VERSION-LESS** — no register/sync-state cut (this doc is the record)

---

## 1. Result status

`Complete` — isolated build only, as scoped. 7 of 10 open calibration triples resolved paper-first; 3 correctly left `to_be_calibrated`/`probe_required` rather than invented. WS-3 enforcement built, tested (196/196 Deno tests pass), undeployed.

## 2. Commits (isolated branch `lane/m14-ws1-ws3-build`, worktree `C:\Users\parve\ice-worktrees\m14-lane-b-ws1-ws3`, based on main HEAD `e121f6b`)

- `33b0f81` — docs(m14): live constraints baseline for WS-1 calibration (orchestrator)
- `b85c6a1` — feat(m14): WS-1 calibration backfill draft + WS-3 image-worker text_limits enforcement (isolated, undeployed) (`ef-builder`)

Branch is purely local — no remote-tracking ref. `branch-warden` verdict on the **lane worktree itself**: clean, exactly these 2 commits, exactly the 5 expected files touched, nothing pushed. `branch-warden` also flagged (verdict `stop`, scoped to this observation) that the **shared main checkout** currently carries an uncommitted, unrelated modification to `docs/briefs/music-architecture-v0.1-draft.md` (a frontmatter `last_updated`/`session` edit) — independently confirmed **not caused by this lane** (this lane's commits never touch that file) and consistent with another concurrent session editing the shared default worktree directly. Disclosed here per the reporting contract; does not affect this lane's own isolated, clean record, and no action was taken on it (not this lane's file to touch).

## 3. Files changed

- `docs/briefs/artifacts/m14-ws1-live-constraints-baseline-v1.md` — created (live-read baseline, orchestrator)
- `supabase/migrations/NOT_APPLIED_m14_ws1_calibration_backfill_v1.sql` — created (`ef-builder`)
- `supabase/functions/image-worker/text_limits_envelope.ts` — created (`ef-builder`)
- `supabase/functions/image-worker/text_limits_envelope_test.ts` — created, 23 tests (`ef-builder`)
- `supabase/functions/image-worker/index.ts` — modified (v3.38.0 → v3.39.0; wired the new envelope check into the production `image_quote` branch, after `buildTmrRenderPlan`, before the Creatomate call) (`ef-builder`)

No touch to the 16 zero-coverage templates, `m.post_render_log`/`m.check_pool_health`/`m.fill_pending_slots` (M7/M16 lanes), or platform-suitability constraints.

## 4. Actions taken

**4.1 Live constraints baseline.** Before any write was drafted, the orchestrator confirmed WS-1's actual starting state directly (not from the stale declared-contract JSON docs): both templates already carry LIVE field constraints (applied 2026-08-02, `docs/briefs/results/ws5-metadata-population-closeout-result-v1.md`, v6.126) — WS-1's job is backfilling the `to_be_calibrated` placeholders WITHIN them via CAS-guarded whole-object replace (`set_tmr_field_constraints`), not a NULL-bootstrap. Pulled the exact current constraints JSON + CAS `md5` for all 17 field rows across both templates via `execute_sql` (SELECT-only), confirming the S1 inventory's 6-TBC/4-TBC counts exactly.

**4.2 WS-1 — value calibration (7 of 10 triples calibrated, paper-first, evidence-cited):**

| Template | Element.limit | Result | Basis |
|---|---|---|---|
| market-insight | `CategoryBadge.max_chars` | **11** | `declared_from_source` — exact max of the 2 clients (NDIS, CFW) whose `creative_contract.ts` entry actually maps to this template (PP/Invegent map elsewhere — verified, not assumed) |
| market-insight | `Date.max_chars` | **17** | `declared_from_source` — exhaustively re-derived from `formatProofDate`'s own format string; corrects the baseline doc's unverified "≤18" |
| market-insight | `Footer.max_chars` | **16** | `declared_from_source` — same 2-client (NDIS/CFW) derivation |
| quote-card | `Attribution.max_chars` | **26** | `declared_from_source` — n=1 (Invegent is the *only* registered contract mapping to this template) |
| quote-card | `SourceLabel.max_chars` | **12** | `declared_from_source` — n=1, same caveat |
| quote-card | `Footer.max_chars` | **8** | `declared_from_source` — n=1, same caveat |
| market-insight | `Headline.max_lines`, `Subtitle.max_lines` | **left open** | no computable geometry formula (Subtitle has zero container evidence at all) |
| quote-card | `QuoteText.max_lines` | **left open** | explicitly documented, named production risk (no layout guard, never probed near 180 chars) |
| market-insight | `Location.max_chars` | **left open** | genuine judgment call — all 4 registered clients declare `''`, no real-length sample exists; neither a `max_chars=1` floor nor an invented placeholder was judged defensible |

Every calibrated number is the exact observed/computed value with no padding margin — a defensible, non-inventive floor, but genuinely fragile (a legitimately longer future governed string on any of these fields will correctly `throw` under WS-3's enforcement and require a registry update, not silently degrade — this is flagged as expected behavior, not a defect). The `n=1` caveat on the three quote-card triples is stated in-band in each write's own `source` citation, not hidden.

Author artifact: `NOT_APPLIED_m14_ws1_calibration_backfill_v1.sql` — 7 `set_tmr_field_constraints` calls, each carrying the exact live CAS `md5` from the baseline read, each a full whole-object replace (every pre-existing key preserved, only the target triple changed). Not applied; not referenced by any migration-runner.

**4.3 WS-3 — image-worker enforcement build-out.** New module `text_limits_envelope.ts` (pure core + thin loader, mirroring `stat_envelope.ts`'s house pattern): reads the winner template's governed `text_limits.max_chars` for whatever elements `TMR_WINNER_TEXT_FIELDS[winnerName]` actually produced (generic — not hardcoded to the two WS-1 templates, same generality discipline as M16's Option C), and enforces char-count limits before the Creatomate render call.

- **Per-field posture**: calibrated + over-limit → **throw** (fail-closed, no truncation — matches `assertHeadlineWithinGate`/`assertStatFieldsWithinGate`'s established convention). Still-`to_be_calibrated`/absent → **no-op** (nothing to enforce; must not regress a field that renders unconstrained today).
- **Whole-envelope-load-failure posture**: **fail-open**, a deliberate, documented choice — reasoned in the module's own header: image-worker has no pre-existing vendored floor bound for 6 of the 8 newly-covered fields (unlike `stat_envelope.ts`'s established 12/48/160/90), so fabricating one to serve as a fallback would violate the same never-invent discipline WS-1 was built under; and Headline/Subtitle are unaffected either way since they keep their own independent existing hard gates, which run before and regardless of this module. This is a considered choice, not a default — named explicitly, per the seed's instruction.
- Existing hardcoded gates (`assertHeadlineWithinGate`, `B1_SUBTITLE_MAX_CHARS`) were left in place as redundant belt-and-braces, not reconciled — the new module is a second, independent, registry-sourced check layered on top.
- **Line-count (`max_lines`) enforcement is explicitly out of scope for this module** — consistent with every `max_lines` triple in WS-1 staying `to_be_calibrated`/`probe_required` by design; char-count is the only load-bearing bound this lane enforces.

**4.4 Hermetic tests — actually executed, not just authored.** `deno test --allow-read --allow-env --allow-net supabase/functions/image-worker/` → **196 passed, 0 failed** (23 new in `text_limits_envelope_test.ts`, covering within-limits-pass, over-limit-block, missing-constraints-no-op, and both envelope-load-failure cases, each explicitly named against the fail-open posture). `deno check` on the modified `index.ts` → clean. This is a stronger verification bar than the M7/M16 lanes reached (no `psql`/Docker was available for those; `deno` was available here and was actually run).

## 5. Constraints confirmed (per the build-acceleration ruling's prohibited list + this lane's own scope fence)

- No live DB write — the calibration SQL is `NOT_APPLIED`-prefixed, never executed, not referenced by any migration-runner list
- No touch to the 16 zero-coverage templates (WS-2, separately staged) — confirmed, only the two named templates' field rows appear anywhere in the SQL
- No touch to platform-suitability constraints (`c.creative_template_platform_suitability`/`set_tmr_platform_constraints`) — confirmed untouched
- No touch to any M7/M16 lane file (`m.render_cost_snapshot`, `m.check_pool_health`, `m.fill_pending_slots`) — confirmed, `branch-warden`'s exhaustive diff shows exactly 4 files in the build commit, none overlapping
- No deploy, no live/probe render — confirmed; `text_limits_envelope.ts`/`index.ts` changes are undeployed source on the isolated branch only
- No invented calibration value — every calibrated number carries a real, checkable citation; every ungroundable one was left open rather than guessed

## 6. Open issues

1. **3 calibration triples remain open**, each with a named reason (not silently dropped): `Headline.max_lines`, `Subtitle.max_lines` (market-insight — no geometry formula), `QuoteText.max_lines` (quote-card — documented open production risk). Each needs a real probe render to resolve (out of scope here per the seed — probe renders are a post-watch/PK-elected step).
2. **`Location.max_chars` is a genuine unresolved judgment call**, not a defect: zero non-empty observed values exist across any registered client today, so there is no positive evidence to calibrate from at all. Needs a PK-authored real value (a governed content decision, not a derivable one) before it can leave `to_be_calibrated`.
3. **The 3 calibrated quote-card triples (Attribution/SourceLabel/Footer) are each grounded on exactly ONE client's value** (Invegent — the only client whose `creative_contract.ts` entry maps to `generic_quote_card_1x1_v1`) — a legitimate, cited floor, but worth flagging that a second client adopting this template with a longer governed string will correctly throw under WS-3 and require a registry update, not a code fix.
4. **`governed_image_quote_smoke` was deliberately not wired with the new envelope check** — out of this lane's named scope (only the production render path was named in the seed); flagged as a candidate follow-up for smoke/production parity.
5. **Unrelated concurrent-session activity observed in the shared main checkout** (§2 above, `docs/briefs/music-architecture-v0.1-draft.md`) — not caused by, and not blocking, this lane; surfaced per the reporting contract only.
6. This lane reaches a stronger local-verification bar than M7/M16 (tests actually ran) — worth noting as a positive precedent for future image-worker/Deno-touching lanes in this build-acceleration window.

## 7. Next recommended step

Per v6.147 §3, this was the **final mission in the current recycle queue** (L1=M1, L2=M7 [done], L3=M13, then M16 [done], then M14 Lane-B [this lane, done]). A fresh Gate-1 to apply `NOT_APPLIED_m14_ws1_calibration_backfill_v1.sql` and to deploy the `text_limits_envelope.ts`-enforced `image-worker` — requires: `db-rls-auditor` review of the 7 constraint writes, external review pinned to both artifacts' hashes, `branch-warden` re-verification, deploy-plan review (image-worker version bump v3.38.0→v3.39.0, no `verify_jwt` change), and an explicit PK apply+deploy gate. **Watch-gated**: cannot proceed before the Phase-1 schedule watch reaches PASS and PK grants explicit production authorization (~2026-08-11 20:20 Sydney or later). The 3 open calibration triples and the `Location` judgment call are separate follow-ups, each needing either a probe render or a PK content decision, independent of whether the 7 resolved triples get applied.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Scope matched the seed's four numbered items (WS-1 calibration, WS-3 enforcement, template-touch fence, result doc).
- Independently spot-checked `ef-builder`'s arithmetic against the cited `creative_contract.ts` values (CategoryBadge 'NDIS UPDATE'/'CARE UPDATE'=11, Footer 'Care For Welfare'=16 vs 'NDIS Yarns'=10 → max 16, Attribution 'Invegent — AI & Automation'=26, SourceLabel 'invegent.com'=12, quote-card Footer 'Invegent'=8) before accepting them — all check out exactly.
- Independently re-read the migration file's header/derivation comments and the `text_limits_envelope.ts` module header (fail-open reasoning) rather than trusting the self-report alone.
- `branch-warden` caught a real, unrelated shared-worktree hazard (the music-architecture doc edit) — correctly attributed to a different concurrent session, not this lane, and correctly not treated as blocking this lane's own clean isolated record.
- The decision to run `deno test` for real (rather than disclosing "not run" like M7/M16) reflects genuinely better tooling availability in this environment, not a quality gap in the earlier lanes.

## 9. Learning notes

- When a lane's evidence trail runs through an in-code registry (`creative_contract.ts`) rather than a live DB table, the correct move is to hand the orchestrator-gathered LIVE state (constraints + CAS tokens, which genuinely can't be read without a DB call) as a baseline artifact, then let `ef-builder` do the source-code archaeology itself (no drift risk reading committed git source, unlike live DB function bodies) — this split kept the orchestrator's live-query surface small while still giving `ef-builder` everything it needed to ground every number.
- "Never invent a value" cuts both ways usefully here: it correctly blocked 3 triples from getting a fabricated number, but also correctly justified NOT fabricating a fallback bound for WS-3's whole-envelope-failure case — the same discipline applied consistently at both the data-calibration layer and the enforcement-architecture layer.
