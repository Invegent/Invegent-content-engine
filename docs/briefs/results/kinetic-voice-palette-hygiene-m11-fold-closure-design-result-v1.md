# Result — kinetic_voice / stat_voice palette hygiene (M11b closure design)

**Brief file:** `docs/briefs/kinetic-voice-palette-hygiene-m11-fold-closure-design-gate1-brief-v1.md`
**Seed:** cross-session control-tower dispatch, "kinetic_voice palette hygiene (folded M15): investigation + closure packet" (2026-08-06), Gate-1-approved scope per v6.147 §2.4
**Executed by:** Claude Code (orchestrator, read-only investigation) + `db-rls-auditor` (live DB reads) + `apply-harness-auditor` (shadow packet review)
**Completed:** 2026-08-06 Sydney

---

## 1. Result status

`Complete` — investigation + closure-design packet delivered, per the brief's T1 docs-only scope. **Zero code, DB, schedule, or config mutation occurred.** One material correction to the seed's own framing was found and is reported prominently below, not smoothed over.

## 2. Commit(s)

N/A — docs-only artifacts, not committed to any branch (consistent with this session's posture: main-checkout docs work stays uncommitted unless PK explicitly instructs a commit/push).

## 3. Files changed

- `docs/briefs/artifacts/m11b-kinetic-voice-palette-hygiene-closure-apply-packet-v1.md` — created (the closure apply packet, DRAFT/NOT-FOR-APPLY)
- `docs/briefs/results/kinetic-voice-palette-hygiene-m11-fold-closure-design-result-v1.md` — this file

## 4. ⚠ Headline finding — the seed's "live eligible draft" assumption is stale

The control-tower seed stated: *"the one live eligible draft is ruled CONTAINED/VOIDED (design its containment; do not execute it)"* — referring to draft `4f877c79…` (property-pulse, `video_short_kinetic_voice`), per the earlier `s9-youtube-containment-release-result-v1.md` citation.

**A fresh live read today (2026-08-06) found this draft has since PUBLISHED**: `video_status='published'`, `youtube_published='2026-07-31T04:51:33.955Z'`, live at `https://www.youtube.com/watch?v=4ejuEQ15j0U`. It went out 6 days ago, before this ruling was made. **It is no longer unpublished/pending — a "containment" design for a pre-publish draft is not executable or meaningful for it.** Reversing a live YouTube publish is a takedown decision, categorically different from voiding an in-flight draft, and is not named or authorized anywhere in this brief's scope.

The fresh read instead surfaced a **different** genuinely-still-unpublished row that better fits the "approved + unpublished + past-due" pattern: `a44288f7-5654-477f-8a78-3c64febb1de3` (ndis-yarns, youtube, `approval_status='approved'`, `scheduled_for=2026-05-20` — over 2 months past-due, `video_status=null`, never updated since creation). This row predates the `final_format_authority`/`advisor_format` columns being populated, so its format-resolution provenance can't be independently confirmed from the row alone — it reads as a stale, possibly-orphaned pre-existing row, not a fresh instance of the advisor-palette deviation this closure targets. **This result does not decide its disposition** — named as an open PK question (§9), consistent with the brief's own instruction not to resolve genuinely open questions unilaterally.

This correction is reported per the brief's own explicit instruction: *"the executor should still name this reading explicitly... rather than treat it as beyond doubt"* and *"Must be freshly re-checked, not assumed still in this state."*

## 5. Actions taken

**5.1 Code-site re-verification (current HEAD, 2026-08-06).** Fresh grep for `kinetic_voice`/`stat_voice` across all `supabase/functions/**` found **9 sites that must change together** for a complete removal — more than M11a's original citation list (which named 4-5 core sites but not every `asset_backstop.ts` variant). Full current-line-number table in the apply packet §2. Notably: `video-worker/index.ts`'s legacy `isKinetic`/`isStat` render composer is a render-time CONSUMER, not an eligibility SOURCE — judged out of scope for removal (it becomes unreachable dead code once the 9 eligibility sites close, not itself a defect requiring a change).

**5.2 A significant architectural correction to the brief's own framing.** The brief characterized `ai-worker/index.ts:343-348`'s `VIDEO_FORMATS` Set as directly grounding what "palette" means. **Reading `fetchFormatContext` (lines ~1183-1206) shows the advisor's actual candidate-palette query is 100% DB-driven** (`t."5.3_content_format".is_buildable=true` joined against `c.client_format_config`, with a fail-open branch only when a client has ZERO config rows at all) — `VIDEO_FORMATS` is a downstream classifier used elsewhere in the file, not the palette source. This matters for the removal design: **the advisor palette's actual, complete, single-point control is the DB row's `is_buildable` flag**, not any in-code Set.

**5.3 Live-state investigation (`db-rls-auditor`, read-only, `execute_sql` SELECT-only).**
- `t."5.3_content_format"`: both `_voice` keys carry **`is_buildable=true`** today — the live, global exposure this closure needs to remove.
- `c.client_format_config`: PP and NDIS each carry explicit `is_enabled=false` rows for both keys (already correctly excluded today). CFW and Invegent carry **no row at all** for either key specifically — but are NOT zero-total-rows clients, so the fail-open branch does not trigger for them either. **Net finding: the advisor palette is not currently offering these formats to any of the 4 existing clients** — the real remaining exposure is the *global*, *latent* risk to any *future* new client with zero config rows, plus the independent downstream publish-eligibility arrays (§5.1) which never consult `is_buildable` at all.
- Two other currently-unpublished `_voice`-adjacent drafts (`2e34d0c2`, `90cf9bc8`) exist but are stuck at `approval_status='draft'`/`blocked_by_capability` — not currently publisher-reachable, correctly fail-closed by the existing S9 capability gate.
- Slot `89545735…` (named in the brief's source context) is `status='skipped'`, terminal, not re-fillable.

**5.4 Closure apply packet authored** (`docs/briefs/artifacts/m11b-kinetic-voice-palette-hygiene-closure-apply-packet-v1.md`), covering: the corrected fresh-state facts; the complete 9-site removal list; the corrected in-flight-draft finding; a ranked removal-mechanism recommendation (global `is_buildable=false` AND the 6 downstream code-constant trims — both, neither alone is sufficient, with rationale for rejecting a per-client-config-only approach); a T2 (DB half) / T3-deploy-adjacent (code half) review-tier recommendation with CLAUDE.md Convention-3 citation; executable fail-closed pre/post-check SQL; a byte-symmetric rollback plan; the re-entry condition quoted verbatim from the governing ruling; and the compound-condition statement (this closure alone does not lift PP kinetic's supervised status).

**5.5 `apply-harness-auditor` shadow review run on the packet before freeze**, per the seed's explicit instruction. Verdict: **INCOMPLETE** (fail-closed default, not a fabricated PASS) — two findings, both around the same root cause: the packet's precheck/UPDATE/postcheck SQL block named no execution channel, so its own "rollback the whole transaction" assumption was not mechanically guaranteed (the exact cc-0079 non-composition failure class this tool exists to catch). **Fixed before freeze**: the packet now explicitly names the required single-call execution channel (`execute_sql`/`apply_migration`, one call, all three statements verbatim) in §6-§8. Checks 1/2/3/6/7/8/9 all passed clean on first pass (fail-closed row counts, byte-symmetric apply/rollback identity, no prose-only STOPs, no swallowed-exception branch). This is a shadow-mode, zero-authority signal — it clears no gate; the packet still requires its own Gate-1, `db-rls-auditor`, external review, and PK apply gate.

## 6. Constraints confirmed

- **No code edit, DB write, migration apply, or deploy of any kind** — confirmed: every `.ts` file referenced was only `Read`/`Grep`'d, never edited; the SQL in the apply packet is illustrative text in a markdown file, never executed (the investigation's own reads were `SELECT`-only, independently confirmed by `db-rls-auditor`'s own report)
- **No schedule DML or cap raise** — confirmed, none attempted
- **Did not treat closure as sufficient, alone, to lift PP kinetic's supervised status** — the compound condition is stated explicitly in the packet §10
- **Did not design or recommend a governed kinetic_voice/stat_voice implementation as a substitute** — the packet's §9 re-entry condition names a future governed-implementation mission as a SEPARATE, not-yet-elected item, never proposed as an alternative here
- **Did not expand into other M11b closure sub-items** (undeclared-legacy carousel, base-key pre-governance window) — not touched, not mentioned beyond this note
- **Did not proceed past design to any execution/apply gate** — the packet is explicitly DRAFT/NOT-FOR-APPLY throughout, with its own named prerequisite gates before any future apply

## 7. Open issues

Carried forward from the brief's own Open Questions, with fresh-read updates:

1. **`stat_voice` symmetry** — RESOLVED by v6.147 (both siblings in scope). No longer open.
2. **In-flight draft handling** — the ORIGINAL target (`4f877c79…`) is moot (§4, already published). The NEW candidate this fresh read surfaced (`a44288f7…`) is a genuine open PK decision — void it, leave it, or investigate its provenance further first (its format-resolution trail can't be confirmed from the row alone). **Not resolved here.**
3. **Terminology confirmation ("palette hygiene")** — unchanged from the original brief; "palette" = the advisor's candidate-format set, well-evidenced in code (`formatPalette` variable, `ai-worker/index.ts:1233`) but not confirmed against an original source document. Still an open technical-confirmation item, not a policy call.
4. **CFW/Invegent's "no config row for this format" state** — functions correctly today only because neither is a zero-total-rows client; whether to add explicit `is_enabled=false` rows for them too (belt-and-braces, matching PP/NDIS) or rely solely on the global `is_buildable=false` fix is a design-completeness question for whoever authors the real future apply packet (packet §11 item 3).
5. **`apply-harness-auditor`'s two findings are fixed in the current packet version** — not carried forward as open, but noted here for the record since they materially changed the packet between first draft and freeze.

## 8. Next recommended step

Per the seed, this was the approved-scope follow-up mission (not a new build lane) in the v6.147 recycle sequence. Next: PK review of (a) the headline correction in §4 (the original containment target already published — does this change PK's read of the situation at all, and what should happen to the newly-surfaced `a44288f7…` instead), and (b) whether to advance the apply packet to its own fresh Gate-1 (which would then trigger `db-rls-auditor` + external review + the T2/T3-split PK apply+deploy gate named in the packet §5). This closure item remains **necessary but not sufficient** for PP kinetic's return to unsupervised scheduling — the compound condition's second half (one natural unattended cycle succeeding) is unaffected by anything in this lane and remains a separate, later, watch-dependent milestone.

---

## 9. Verification

**Verdict:** `Pass`

**Notes:**
- Every success criterion from the governing Gate-1 brief (§71-76 of that file) is met: fresh live-state facts with citations (a); the corrected in-flight-draft status (b); a current-HEAD-verified, line-numbered site enumeration, more complete than the original M11a citation (c); a ranked removal mechanism with rationale (d); a tiered review recommendation with Convention-3 reasoning (e); a byte-symmetric rollback plan (f); the compound-condition statement (g).
- Zero mutation occurred — independently confirmed via `db-rls-auditor`'s own report (all reads it ran were `SELECT`-only) and via this orchestrator never invoking any write tool against any `.ts`/migration file.
- The apply-harness-auditor shadow pass caught a real structural gap (unnamed execution channel) before freeze — exactly the kind of pre-freeze catch this tool exists for; fixed, not ignored.
- The stale-assumption correction (§4) is the most consequential finding of this lane — it changes what any future execution step would actually need to act on, and is surfaced prominently rather than silently reconciled against the seed's framing.

## 10. Learning notes

- "Freshly re-verify, don't trust the snapshot" paid off directly here: the seed's own framing (inherited from an earlier session's ruling) was based on state that had already changed by the time this lane ran. A T1 investigation lane's highest-value output can be catching exactly this kind of drift, not just confirming what was assumed.
- The brief's own citation of `ai-worker/index.ts:343-348` as "the direct technical grounding for what 'palette' means" was itself imprecise — a useful reminder that even a well-evidenced Gate-1 brief's citations should be re-verified against the actual runtime logic (`fetchFormatContext`'s SQL), not just the nearest-looking named constant.
