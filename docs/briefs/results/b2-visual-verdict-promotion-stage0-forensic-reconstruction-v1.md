# Result — B2 Visual-Verdict-Promotion-and-Proof: Stage 0 Forensic Reconstruction

**RECONSTRUCTED 2026-08-01 after loss of the originating session's uncommitted files.**

**Brief:** Seed packet "b2-visual-verdict-promotion-and-proof" (WS-1, Creatomate Global Ultimate
programme brief §3 WS-1), relayed 2026-08-01; Stage 0 scope refined by PK direct instruction
(this session, 2026-08-01) with an explicit authority order: (1) live database and function
bodies, (2) origin/main migration and commit history, (3) preserved PK/session transcripts and
handoffs, (4) no inference presented as fact.
**Executed by:** Claude Code (orchestrator)
**Completed:** 2026-08-01 Sydney

---

## 1. Result status

**Partial — by design.** Stage 0 is forensic reconstruction, not new work. Sub-stages A and C
recovered complete, verified live evidence. Sub-stage B found D1 fully executed and verifiable,
but found **no evidence D2 has been executed at all** — that finding is reported as a gap, not
papered over. Sub-stage D found `task_05bf8b3d` fully documented (contrary to this session's own
earlier, mistaken "no trace found" read). No visual-verdict promotion, assignment approval, or
winner change occurred in this pass — none was in scope.

## 2. Commit(s)

- (this branch's own commits — see §3; not yet merged to `main`, per instruction: "commit result
  docs to branch before reporting complete")

## 3. Files changed

- `supabase/migrations/20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql` — created (ledger backfill, documents an already-live change, changes no production behaviour)
- `supabase/migrations/ROLLBACK_20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql` — created (exact predecessor rollback)
- `docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-reconstruction-v1.md` — created (this file)

Branch: `lane/b2-stage0-forensic-reconstruction` (off `main` at the session's starting HEAD).

---

## 4. Stage 0A — Readiness-queue governed-exempt rider

**Method:** captured `pg_get_functiondef('public.get_client_production_readiness_queue(text)')`
live (project `mbkmaxqhsohbtwsqolns`) and diffed it line-for-line against the tracked predecessor
(`supabase/migrations/20260730120000_client_production_readiness_queue_rpc_v1.sql`).

**Finding: the ONLY delta is the D1 governed-exempt rider.** No other function, table, grant, or
column differs between live and tracked. The rider adds, in one coherent block:
1. A new `exempt_cells` CTE (capability-exempt cells surface even with zero demand).
2. An `is_governed_exempt` computed column (`public.is_capability_exempt_format(format)` AND
   `platform_support` true for the platform).
3. Four downstream `CASE` branches (`responsible_lane`, `next_required_outcome`,
   `missing_proof_or_gate`, `overall_state`) that reclassify governed-exempt cells instead of
   letting them read as a template gap.
4. One new output field, `capability_status_overlay` (`'governed_exempt'` or `NULL`).

`public.is_capability_exempt_format(text)` — the predicate the rider calls — is **not** new drift:
it was created by the already-tracked `20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql`
and its live body is byte-identical to that tracked file. `public.classify_format_capability` was
also checked and is byte-identical live vs. tracked (`20260728034955_classify_format_capability_v1.sql`)
— **no unrelated drift found; the per-instruction STOP-and-separate condition did not trigger.**

**Fresh live output (four brands, 2026-08-01), text (D1) and carousel (D2) cells only:**

| Client | Platform | Format | capability_status | overlay | overall_state |
|---|---|---|---|---|---|
| property-pulse | facebook | text | unsupported_silent_degrade | governed_exempt | ready |
| property-pulse | linkedin | text | unsupported_silent_degrade | governed_exempt | ready |
| ndis-yarns | facebook | text | unsupported_silent_degrade | governed_exempt | ready |
| ndis-yarns | linkedin | text | unsupported_silent_degrade | governed_exempt | ready |
| care-for-welfare-pty-ltd | facebook | text | unsupported_silent_degrade | governed_exempt | ready |
| care-for-welfare-pty-ltd | linkedin | text | unsupported_silent_degrade | governed_exempt | ready |
| invegent | facebook | text | unsupported_silent_degrade | governed_exempt | ready |
| invegent | linkedin | text | unsupported_silent_degrade | governed_exempt | ready |
| property-pulse | facebook | carousel | ready | — | ready |
| property-pulse | instagram | carousel | ready | — | ready |
| ndis-yarns | facebook/instagram/linkedin | carousel | unsupported_silent_degrade | — | blocked |
| care-for-welfare-pty-ltd | facebook/instagram/linkedin | carousel | unsupported_silent_degrade | — | blocked |

All 8 committed D1 cells (4 brands × FB/LI text) are live, `governed_exempt`, `ready` — matches
the programme brief's D1 scope exactly ("all brands ... wherever `platform_support` marks text
supported (FB/LI today)"). NDIS/CFW carousel remain `blocked` as expected (D2 covers PP FB/IG
only; NDIS/CFW carousel is `⏸` deferred in the matrix, not `🎯` committed — no change expected or
seen there).

**Disposition:** a reviewed repository-ledger backfill was created
(`20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql`) matching the verified
live function body exactly, with a paired exact-predecessor rollback
(`ROLLBACK_20260801120000_...sql`, restores the byte-identical pre-rider body from
`20260730120000`). **This backfill changes no production behaviour — the rider was already live.**

**CORRECTED 2026-08-02** (this line originally read "pending review, not yet run as of this doc" —
the review was actually run, in the same session, before the commit that landed this file; the
text below was simply never updated at the time. Caught by a later register-cut session's chase,
`docs/00_sync_state.md` v6.120, which correctly found no written record of the outcome anywhere —
this correction supplies it): **`db-rls-auditor` review COMPLETE, verdict `concerns`
(non-blocking).** Confirmed the forward migration's function body is code-identical to the live
`pg_get_functiondef` output (only cosmetic comment-line differences); confirmed the rollback body
is code-identical to the tracked `20260730120000` predecessor; confirmed
`public.is_capability_exempt_format` is unchanged live vs. tracked and not created/altered by this
migration; confirmed grants unchanged (`service_role` EXECUTE only, no anon/authenticated); no RLS
gap, no new REST exposure, no upsert/DML risk; migration naming has zero ledger collision. One
pre-existing, non-blocking observation noted (the predecessor file's name-embedded timestamp
doesn't match its ledger-recorded apply version — the already-known "migration ledger ≠ git
history" drift pattern, not introduced by this pair). **`branch-warden` review COMPLETE, verdict
`safe`** — HEAD/branch/file-set all matched immediately before the commit. Both reviews ran before
`c8a6d61` (the commit that landed these files) and before `474be78` (the merge to `main`) — the
review gate was never actually skipped, only under-documented.

## 5. Stage 0B — D1 / D2 reconstruction

### D1 — governed template-less text path, all brands: **DECIDED and EXECUTED, verified live.**

Fully covered by §4 above. Evidence: the readiness-queue rider is live, and all 8 committed
(brand × FB/LI) text cells resolve `governed_exempt` / `ready`. No synthetic proof-event row is
needed or created — the live RPC output **is** the evidence.

### D2 — PP legacy carousel governed for Ultimate v1: **DECIDED, but NOT executed. No artifact found.**

This is the one place this reconstruction found a real gap between the programme brief's decision
log and live state, and it is reported honestly rather than smoothed over.

- `c.client_creative_governance` for property-pulse (`client_id 4036a6b5-...`) has exactly two
  rows — `video_short_stat` and `image_quote` — **no `carousel` row.**
- `c.creative_template_proof_event` has no row referencing carousel, "legacy carousel", or the
  "104 real drafts" the programme brief cites, at any date.
- PP FB/IG carousel **does** show `capability_status: ready` in the live readiness queue, but
  this is explained by a **different, pre-existing fact**: `public.select_template('property-pulse',
  'facebook'|'instagram', 'carousel', NULL, NULL)` resolves to `generic_carousel_cover_1x1_v1`
  (`template_id 15ef4676-83ee-4dea-9973-9d50e0b86d3f`), a **TMR-registered generic template**,
  `visually_approved`, `approved_by: PK`, proof dated **2026-07-03** — three days before D2 was
  even decided (2026-08-01) and unrelated to the "legacy carousel pipeline / BackgroundSolid fix"
  language the programme brief uses for D2. The readiness queue's `ready` state for PP carousel
  predates D2 and is not evidence D2 was executed.

**Conclusion:** D2's declaration lane (declare the legacy carousel pipeline governed for PP FB/IG,
record proof events against the 104 real historical drafts) has not yet been actioned in the
database. Per instruction, **no synthetic proof-event row was created** to paper over this gap.
This is a finding to carry forward, not a blocker for Stage 0 itself.

## 6. Stage 0C — B2 Stage-1 live proposed assignment rows + selector baseline

**Live query, `c.creative_template_client_assignment` where `assignment_status = 'proposed'`** —
exactly three rows found, all created in the same instant, confirming the seed packet's "3 dark
proposed assignment rows" claim precisely:

| assignment_id | client | template | provider_template_name | scope | status | approved_by | created_at |
|---|---|---|---|---|---|---|---|
| `b2510001-...-000000000001` | invegent | `0e006c5c-45aa-4829-82ec-89dd282a8c56` | `generic_market_insight_card_1x1_v1` | generic_allowed | proposed | NULL | 2026-08-01 07:33:03.944705+00 |
| `b2510001-...-000000000002` | ndis-yarns | `1cfe0f9c-3810-4bf1-8785-083fead4eefe` | `generic_quote_card_1x1_v1` | generic_allowed | proposed | NULL | 2026-08-01 07:33:03.944705+00 |
| `b2510001-...-000000000003` | care-for-welfare-pty-ltd | `1cfe0f9c-3810-4bf1-8785-083fead4eefe` | `generic_quote_card_1x1_v1` | generic_allowed | proposed | NULL | 2026-08-01 07:33:03.944705+00 |

`c.creative_template_client_assignment` carries no actor/session attribution column at all
(`id, template_id, client_id, brand_key, assignment_scope, assignment_status,
style_guide_reference, approved_by, approved_at, created_at, updated_at` — that is the full
column set) — `approved_by`/`approved_at` NULL is the only "attribution" the schema can carry for
an unapproved row, consistent with [[ice-has-no-actor-identity]].

**What the three rows actually propose, established by cross-referencing every existing
assignment row for these two templates:** each of Invegent, NDIS, and CFW currently holds exactly
one `production_proven`/`visually_approved` generic card template (Invegent → quote_card, NDIS →
market_insight, CFW → market_insight; PP alone already holds both). The three dark rows propose
giving each brand its *missing* second card template — Invegent → market_insight (new), NDIS →
quote_card (new), CFW → quote_card (new) — widening each brand's image_quote template variety from
one to two. This is now stated as established fact (not inference) — it was reconstructed by
reading every assignment row for both template IDs, not guessed.

**Selector baseline — zero current output change, reconstructed live (not the original 8-call
run, which is unrecoverable):** the original "eight-call before/after" design was lost with the
worktree and could not be recovered from any surviving source. Rather than fabricate a matching
call count, `select_template(client_slug, platform, 'image_quote', NULL, NULL)` was rerun now for
all 9 (client × platform) combinations across the three affected clients × their three proven
`image_quote` platforms (FB/IG/LI):

- invegent → FB/IG/LI: winner = `generic_quote_card_1x1_v1` (its existing `production_proven`
  assignment) on all three, unchanged.
- ndis-yarns → FB/IG/LI: winner = `generic_market_insight_card_1x1_v1` (its existing
  `production_proven` assignment) on all three, unchanged.
- care-for-welfare-pty-ltd → FB/IG/LI: winner = `generic_market_insight_card_1x1_v1` (its existing
  `production_proven` assignment) on all three, unchanged.
- In every one of the 9 calls, the proposed (dark) template for that client does **not** appear as
  the winner and does not appear in `alternatives[]` — `select_template`'s
  `visually_approved+ AND passed visual_approval proof` gate correctly excludes `proposed`-status
  rows. **Zero current output change, confirmed.**

**Label per instruction:** this is a **live current-state reconstruction** run 2026-08-01, not a
replay of untouched historical evidence, and not a claim to have recovered the original 8-call
design.

## 7. Stage 0D — `task_05bf8b3d` disposition

**This session's own earlier claim of "no trace found anywhere in the repo" was wrong** and is
corrected here. The authoritative source is
`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §2.4 item 3, which itself points to
the origin: `docs/briefs/results/creatomate-announcement-card-pk-ruling-and-handoff-v1.md`
(PK ruling issued 2026-07-30).

**Exact STOP condition (PK's own words, 2026-07-30 ruling):** "The audit-write bug
(`task_05bf8b3d`) must be proven fixed before `announcement_card` is allowed into unattended
automatic selection — this is now a standing release gate, not just a tracked follow-up." Root
cause: the publisher failed to write its own audit record after a real Facebook publish of
`announcement_card`, a defect kept separate from (and not invalidating) the underlying publish
proof.

**Disposition: OPEN, standing release gate, scoped to `announcement_card` unattended selection
only.** Per the 2026-07-30 result doc's own carried-forward section, it was "not yet fixed" as of
that date, and no later fix or independent audit-write health proof was found anywhere in this
session's search (git history, migrations, or docs). The Creatomate Global Ultimate programme
brief (2026-08-01) still lists it as an active blocker and names it explicitly as the STOP
condition gating "B2 tranche 1" (§4.4 execution order item 7: *"Begin B2 tranche 1 (respect
`task_05bf8b3d`)"*).

**Scope check against this Stage 0 lane:** `task_05bf8b3d` gates *unattended automatic selection
of `announcement_card`* specifically. Stage 0C's proposed rows are for `market_insight_card` and
`quote_card` — a different template family — and Stage 0 performed no selection/approval/promotion
action at all (read-only + ledger backfill only). **`task_05bf8b3d` does not block Stage 0**, but
it remains a real, open, standing gate that **must** be respected before any unattended
`announcement_card` selection inside B2, and is unrelated to the visual-verdict PK gate Stage 1
will present.

## 8. Constraints confirmed

- No assignment promotion, approval, or winner change performed — the three `proposed` rows remain
  exactly as found (`approved_by`/`approved_at` still NULL).
- No synthetic proof-event row created for D2, despite the gap found — the gap is reported, not
  filled.
- `task_05bf8b3d` was not silently retired — an authoritative source was found and it is recorded
  as still-open.
- The Stage 0A ledger backfill changes no production behaviour (the rider was already live); it
  was authored on an isolated branch, not applied to any environment in this pass.
- At original authoring time, nothing had yet been committed to `main` — result docs were staged
  on `lane/b2-stage0-forensic-reconstruction` pending the review step. **CORRECTED 2026-08-02: the
  review step ran before that commit** (see §4 correction above); the branch was then committed
  (`c8a6d61`) and merged to `main` (`474be78`).

## 9. Open issues

- **D2 has no execution artifact.** Someone with the authority to action it needs to either (a)
  run D2's declaration + proof-event lane for real, or (b) confirm PK considers D2's intent
  already satisfied by the pre-existing `generic_carousel_cover_1x1_v1` TMR template and update
  the programme brief's language accordingly. This reconstruction does not decide between those —
  it only establishes that today, no D2-specific artifact exists. **Still open as of 2026-08-02**
  (a separate D2 declaration packet was later drafted and reviewed on `lane/d2-pp-legacy-carousel-
  governance`, but remains unapplied, blocked on its own PK scope decision — not part of this
  Stage-0 doc's original scope).
- **The original "eight-call" selector baseline design is unrecoverable.** §6's 9-call rerun is
  this session's own equivalent-quality substitute, not a restoration of the original.
- **`task_05bf8b3d` remains open** — a real, standing release gate, not resolved by this lane.
- ~~Stage 0A's migration backfill has not yet been through `db-rls-auditor` review or
  `branch-warden`~~ — **RESOLVED, see §4 correction.** Both reviews ran before this file's commit;
  the strikethrough claim above was stale documentation, not a real gap.

## 10. Next recommended step

~~Run the Stage 0 review step (`db-rls-auditor` on the migration backfill pair, `branch-warden` on
this branch), then commit.~~ **Done — see §4.** Realised next: generate fresh previews from the
three live candidates (§6) and return the three-option PK visual sitting card, per the seed
packet's Stage 1 — no promotion or winner change before that verdict. (This subsequently happened
in the same session; see the B2 Stage 1/Stage 2 result docs for what followed.)

---

## 11. Verification (chat fills this)

**Verdict:** `Needs follow-up` (D2 gap only — the review step is complete, see 2026-08-02 correction
in §4/§9/§10)

**Notes:** D1 and B2 Stage-1's factual claims were independently verified against live DB state
and matched closely (exact assignment IDs, exact template names, exact cell counts). D2's claim
did not hold up under verification and is reported as a gap rather than reconciled away.
`task_05bf8b3d` was mis-searched earlier in this session (false negative) and is corrected here
with its actual source cited. **2026-08-02 addendum:** a later register-cut session (`docs/00_
sync_state.md` v6.120) chased this doc's own "review step pending" language and correctly found no
written record of the outcome — the review had actually been run, just never documented back into
this file before commit. Corrected in place above; v6.120 itself is not rewritten (register
entries don't get retroactively edited), but its "found absent" framing is superseded by this
correction.

## 12. Learning notes (chat fills this)

- The earlier "no trace found anywhere in the repo" conclusion for `task_05bf8b3d` was reached
  from an incomplete grep pass, not a real absence — worth remembering that a first grep miss is
  not proof of non-existence when the search surface is this large; a second, more targeted pass
  (reading the actual programme brief in full) found it immediately.
- "Ready" in a capability-status field is not self-explanatory provenance — the PP carousel
  `ready` state looked like it might corroborate D2 until `select_template`'s own evidence
  (`proof.occurred_at: 2026-07-03`) showed it predated D2 by four weeks and came from an unrelated
  TMR template. Always trace a status back to its selected/evidence payload before citing it as
  proof of a specific decision's execution.
- **A "next step" sentence in a result doc must be updated the moment that step actually happens
  — writing the doc early and running the step late (even seconds later, before the same commit)
  creates a false "not done" record if the text isn't revisited.** This doc said "pending review"
  right up through its own commit, even though the review had by then already run — a later
  register-cut session correctly took that sentence at face value and cut a "found absent" entry
  (v6.120) for work that had, in fact, been done. The gap was purely documentary, but it read as a
  real one to anyone checking the written record instead of the conversation history. Going
  forward: when a review/check runs after a doc's prose is drafted but before the doc is committed,
  go back and edit the prose before committing — don't rely on remembering to fix it later.
