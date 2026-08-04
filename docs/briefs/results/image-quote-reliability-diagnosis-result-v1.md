# Result — image_quote reliability diagnosis (CFW/invegent background-scarcity theory tested and rejected)

**Brief file:** none issued — ad-hoc, PK-prompted read-only investigation, orchestrated same-session
**Executed by:** chat (Claude Code orchestrator) + `db-rls-auditor` (×2, live DB evidence) + `general-purpose` acting as `brief-author` (draft only, not issued)
**Completed:** 2026-08-04 Sydney

---

## 1. Result status

`Complete` — root cause found, already fixed, independently corroborated by two separate
investigation passes. Directly corrects a hard constraint asserted in
`docs/briefs/post-cgu-v1-phase2-schedule-expansion-proposal-v1.md` §3/§5/§6-item-2.

## 2. Commit(s)

- (this commit) — adds this result doc + the Phase-2 proposal addendum + register pointers.

## 3. Files changed

- `docs/briefs/results/image-quote-reliability-diagnosis-result-v1.md` — created (this file).
- `docs/briefs/post-cgu-v1-phase2-schedule-expansion-proposal-v1.md` — addendum section appended
  (surgical; original matrix/tables untouched).
- `docs/00_sync_state.md` — pointer entry added (v6.131).
- `docs/00_action_list.md` — pointer entry added (v6.131).

## 4. Actions taken

- **Pass 1 (`db-rls-auditor`, read-only-view access):** re-investigated why invegent's `image_quote`
  renders succeed at all despite showing zero active `usage='background'` rows in its own
  `c.client_brand_asset`. Traced the live code path (`image-worker/index.ts`'s governed branch,
  `c.client_creative_governance.enabled=true` for invegent) and found the resolver
  (`select_template`→`resolve_slot_assets`) deliberately falls through to a **PK-proven governed
  shared-pool background** (`bg_shared_datacentre_server.jpg`), per
  `docs/briefs/results/cc-0044-proof1-invegent-shared-pool-render-result-v1.md` (2026-07-20, PK
  visual PASS) — a deliberate, working mechanism, not a bug or silent fallback.
- **Parallel (`brief-author` draft, not issued):** drafted a Gate-1 brief for a CFW/invegent
  background-sourcing lane per the original ask, and in doing so surfaced that
  `docs/briefs/results/cc-0073-d2-background-pool-promotion-result.md` (2026-07-27) already
  promoted shared-pool assets giving **both** CFW and invegent 4 rotation-pool backgrounds each —
  the "CFW=1/invegent=0" figures are scoped to each client's own asset table only, not their
  effective rotation pool.
- **Pass 2 (`db-rls-auditor`, `execute_sql`/`get_advisors` access restored):** queried
  `m.post_render_log.error_message` directly for both clients over the 30-day window and found the
  failure counts fully, exactly accounted for by two already-fixed incidents (§6 below) — not an
  asset-supply problem at all. Cross-checked against NDIS (control, 0% failure, registry-present
  throughout) and PP (separate, also-historical headline-length issue) to rule out a platform-wide
  cause.

## 5. Constraints confirmed

- No DDL/DML of any kind across either `db-rls-auditor` pass — confirmed, all queries were `SELECT`.
- The `brief-author` draft did not write any file itself (Read/Grep/Glob only, per its charter) —
  confirmed; its draft is not issued/persisted as a standalone brief and is superseded by this
  result's finding (a background-sourcing lane would not have fixed the reliability problem it was
  originally proposed against).
- No schedule/cadence/DB mutation was made or is authorized by this result — confirmed, this is a
  T1 read-only diagnosis feeding evidence into a still-unapproved Phase-2 proposal.
- The active 7-day monitoring watch on the v11 schedule-expansion apply (armed 2026-08-04 ~20:20
  Sydney → 2026-08-11 ~20:20 Sydney, per `docs/00_sync_state.md` v6.130) is **not** touched or
  bypassed by this result — no Phase-2 mutation is made here, only a documentation correction.

---

## 6. Root cause (the actual finding)

**The reported CFW/invegent `image_quote` failure rates (CFW facebook 14–15/35 ≈ 15% success;
invegent facebook 20/87 ≈ 19%, invegent instagram 19/61 ≈ 24%) are the exact, fully-accounted-for
residue of two already-fixed, back-to-back incidents that both happen to fall inside a 30-day
lookback window — not a live defect, and not caused by background-asset scarcity.**

| Incident | Error | Rows | Window | Status |
|---|---|---|---|---|
| cc-0048 | `brand_payload_contract_unresolved` — CFW+invegent had no entry in image-worker's `CREATIVE_CONTRACT_REGISTRY`, so every `image_quote` render fail-closed | 202 (CFW) + 110 (invegent) = 312 | 2026-07-20 15:30Z → 2026-07-22 | **Fixed** — registry entries added |
| cc-0049 | `tmr_winner_unmapped: generic_quote_card_1x1_v1` — invegent's winning template had no winner→field mapping | 38 (invegent) | 2026-07-22 06:45Z → 2026-07-23 03:30Z | **Fixed** 2026-07-23 |
| (residual) | Backblaze `connection closed before message completed` (transient network) | 2 (CFW), attempt 3 succeeded 45 min later | 2026-08-04 | Self-recovered, not actionable |

`202+2 = 204` = CFW's exact reported failed count. `110+38 = 148` = invegent's exact reported failed
count. **Zero unexplained residual for either client.**

**Both clients have rendered `image_quote` at ~100% success for the 12 days since the cc-0049 fix**
(2026-07-23 → 2026-08-04 at time of this diagnosis; modest volume, ~34 renders/12 days combined —
caveat noted, not a high-volume proof).

**The background-scarcity theory is independently disproven, twice:**
1. Invegent's "0 background assets" was a scope artifact (own-table only) — it already draws from a
   PK-proven governed shared-pool background and always did.
2. **CFW already has its own dedicated background asset** (unlike invegent) and still failed at an
   equal-or-worse rate during the incident window (85% vs invegent's 78%) — if missing backgrounds
   were the cause, the client *with* one should have failed less. It didn't. The two registry-gap
   incidents were the actual, sole cause for both clients.

**Control group (30-day window, same period):** NDIS (registry-present from the start) ran 0%
failure throughout — rules out a platform-wide Creatomate/render-pipeline outage. PP's unrelated
24.1% fail rate is its own separate, also-historical `B1_HEADLINE_MAX_CHARS=90` hard-gate issue
(2026-04-17→2026-07-18, not recurring in the 17 days before this diagnosis) — out of scope here,
noted for awareness only.

Template graduation status was checked and does **not** correlate with the failures: both
`generic_quote_card_1x1_v1` (invegent) and `generic_market_insight_card_1x1_v1` (CFW) are still
`family_status='draft'`/`inventory_status='smoke_rendered'`, yet the fail-closed registry/mapping
guard threw *before* Creatomate was ever called — un-graduated status is a governance label here,
not what broke renders. Both are candidates for a deliberate graduation decision given 12 days of
clean production service (PK's call, not a reliability blocker).

## 7. Correction to the Phase-2 schedule-expansion proposal

`docs/briefs/post-cgu-v1-phase2-schedule-expansion-proposal-v1.md` §3, §5, and §6-item-2 assert a
"hard constraint found in the data" that CFW/invegent `image_quote` failure rates are caused by
background-asset scarcity, and hold `image_quote` schedule capacity flat for both clients on that
basis, listing invegent's unexplained-success as an open item to resolve "before trusting any
capacity math involving invegent image_quote." **That reasoning is now stale.** An addendum has
been appended directly to that proposal document (its own §8) recording this correction in place,
rather than restating it only here — see that file for the PK-facing correction. This result doc
does not itself change the proposal's proposed row counts; whether to revise the matrix given the
resolved constraint is a separate PK decision.

## 8. Open issues

- Post-fix volume is modest (~34 renders/12 days combined for both clients) — "100% success" should
  be re-confirmed at higher volume before being treated as a durable steady-state, not just a
  12-day sample.
- PP's historical headline-length gate (55 rows, 2026-04-17→2026-07-18) was surfaced incidentally by
  the control-group check — not investigated further, flagged for awareness only in case it recurs.
- Both resolved templates remain un-graduated (`family_status='draft'`) despite 12 days of clean
  service — a housekeeping item for PK, not a reliability blocker.
- The `brief-author` draft for a CFW/invegent background-sourcing lane was never issued/persisted —
  its own premise (fixing the failure rate) no longer holds, though the underlying "zero
  brand-specific imagery, generic shared-pool only" gap it identified (per
  `docs/briefs/ice-asset-gap-register-v1.md` §1) remains real and independent of this correction.

## 9. Next recommended step

Feed this correction into the Phase-2 proposal review (done — see §8 addendum in that file) and let
PK decide, at the Phase-2 approval gate, whether to revise the CFW/invegent `image_quote` row counts
given the resolved constraint, or leave them flat and treat any future increase as a distinct,
separately-justified decision.

---

## 10. Verification (chat fills this)

**Verdict:** `Pass` — root cause identified with exact-count corroboration (zero unexplained
residual for either client), independently cross-checked against a control client, and the stale
proposal constraint corrected in place rather than left standing.

**Notes:**

- Did output match the ask? Yes — "trace the render-success mystery first, don't assume" (the
  original prompt's own instruction) was honored; two independent passes were run rather than
  accepting the first plausible explanation.
- Were constraints respected? Yes — zero DB/repo mutation beyond this documentation correction.
- Were unexpected files changed? No — scoped to this result doc, the named addendum, and the two
  register pointers.
- New risks: none identified beyond the modest-volume caveat (§8).
- Follow-up: PK decision needed on whether to revise Phase-2's CFW/invegent `image_quote` capacity
  given the resolved constraint (see §7).

## 11. Learning notes (chat fills this)

- A prior finding ("CFW has 1 background asset, invegent has 0") was accurate as far as it went but
  scoped to the wrong table (own-asset vs effective rotation pool) — a reminder to check whether a
  client-specific figure has already been supplemented by a shared/pooled resource before treating
  it as the whole picture.
- The decisive piece of evidence was a same-shape comparison (CFW *has* an asset and still fails
  worse) — a client that satisfies a hypothesized cause and still exhibits the effect is stronger
  disconfirmation than any amount of missing-asset data alone.
- `execute_sql`/`get_advisors` access materially changed what was verifiable — the first pass (view-
  only) could only reach architectural/documentary evidence; the second pass (raw-table access)
  reached the actual error text and closed the question definitively. Worth requesting DB-write-free
  but raw-table read access up front for any "why is this failing" diagnosis, rather than starting
  from the R0 view surface.
