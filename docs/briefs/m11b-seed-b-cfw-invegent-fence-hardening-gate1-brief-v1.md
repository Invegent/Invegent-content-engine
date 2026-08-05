# Brief M11b Seed B — CFW + Invegent carousel fence-hardening + retirement records

**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator, via brief-author subagent draft)
**Executor:** chat (Claude Code) + `db-rls-auditor` (fresh live evidence) + `apply-harness-auditor` (shadow-mode packet audit) + `branch-warden` (safe-state confirmation); PK holds the DML apply gate.
**Status:** draft
**Tier:** T2 (additive DML to `c.client_format_config` + `c.client_creative_governance`; DML/DDL is always ≥ T2 per Convention 3, `CLAUDE.md` "Workflow acceleration conventions" §3) — the brief itself is authored as a T1 docs-only artifact; the lane it describes is T2.
**Result file:** `docs/briefs/results/m11b-seed-b-cfw-invegent-fence-hardening-result-v1.md` (created on completion, not yet)
**⚠ This is a DRAFT ONLY, produced for PK Gate 1.** No apply has been authorized, and nothing below clears the standing v6.140 watch hold (see Forbidden actions). Execution — including the T2 chain and the DML apply gate itself — requires its own fresh PK go-ahead, separate from approval of this brief's scope.

---

## Task

Convert Care For Welfare's (CFW) and Invegent's current carousel containment — which today rests entirely on the accidental side effect of an unrelated 2-row `c.client_format_config` addition (`image_quote`, `text`, both `is_enabled=true`, added 2026-08-02) flipping `ai-worker`'s fail-open `NOT EXISTS` fallback closed for every format not explicitly listed — into an explicit, deliberate, self-documenting state: one new `c.client_format_config` row per client (`carousel`, `is_enabled=false`) plus one new `c.client_creative_governance` retirement-record row per client, worded to reflect each client's differing real-world carousel history (CFW: a genuine historical route being retired; Invegent: a route that never actually delivered a real post). This is Seed Packet B of the M11b fleet-carousel-closure scoping packet (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md` §4.2) — this brief operationalizes that seed description into an executable Gate-1 packet; it does not itself execute anything.

## Source context

- `docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md` §2.3 (CFW disposition), §2.4 (Invegent disposition), §4.2 (Seed Packet B's own scope description, affected surfaces, proof requirements, rollback) — the packet this brief operationalizes. Read fully; this brief does not re-derive its findings, only turns its §4.2 sketch into an executable Gate-1 shape.
- `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` §7 Finding 1 (lines 104-125 — CFW's 171 succeeded carousel renders/90d is real, non-marginal production volume, and the CGU Final baseline's "NDIS/CFW deferred" framing wrongly implied only PP has live carousel activity) and §12 addendum (lines 198-225 — the exact per-client mechanism and the row-deletion fragility statement, quoted precisely under Scope below).
- `docs/briefs/m11a-legacy-routing-inventory-seed-packet-v1.md` — the original M11a framing the addendum supplements; establishes the governed/legacy/declared-legacy-governed/capability-exempt taxonomy this lane's "retirement record" borrows from PP's own D2 declared-legacy pattern.
- `docs/00_sync_state.md` v6.140 pointer + `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md` (verbatim PK ruling) — the live Phase-1 watch hold this brief's Forbidden actions must respect; §2 item 4 of the ruling explicitly names "M11b Gate-1 briefs" as an in-flight docs-only follow-up that remains at PK's discretion and is **not newly authorized** by the ruling — meaning drafting this brief is consistent with the ruling, but the ruling does not itself clear this lane's eventual DML apply.
- `supabase/functions/ai-worker/index.ts:1188-1197` (per the scoping packet's own citation) — the exact `EXISTS(carousel row, is_enabled=true) OR NOT EXISTS(any config row for this client)` fail-open logic this lane's fence-hardening closes for CFW/Invegent specifically.

## Scope

**In scope:**
- One new `c.client_format_config` row for Care For Welfare: `format='carousel'`, `is_enabled=false` (scoping packet §4.2).
- One new `c.client_format_config` row for Invegent: `format='carousel'`, `is_enabled=false` (scoping packet §4.2).
- One new `c.client_creative_governance` row for Care For Welfare, `contract_ref='care_for_welfare.carousel.legacy_pipeline_retired'` — worded as a genuine historical retirement, because CFW delivered 171 real succeeded carousel renders across FB/IG/LI in the cited 90-day window before its 2026-08-02 incidental containment (m11a-legacy-routing-inventory-result-v1.md §7 line 121, scoping packet §2.3 line 152).
- One new `c.client_creative_governance` row for Invegent, `contract_ref='invegent.carousel.retired_never_live'` — worded as a route that never produced a real delivered post: the scoping packet's addendum correction (result doc §12 line 211, scoping packet §2.4 line 162) found Invegent's "5 succeeded" carousel figure was successful slide-image *renders*, not delivered posts — 2 drafts were voided pre-publish and 3 were silently downgraded to plain text by a since-fixed (v1.3.0, 2026-07-06) Zapier bridge bug; zero real carousel posts were ever delivered for Invegent.
- **The central risk this lane exists to close — the row-deletion fragility, quoted precisely, not paraphrased:** per `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md:209` (CFW) and `:211` (Invegent), the current containment "holds only while those 2 rows [`image_quote`, `text`] continue to exist — deletion (not disablement) would silently reopen the full palette" — because `ai-worker/index.ts`'s eligibility check is `EXISTS(carousel row, is_enabled=true) OR NOT EXISTS(any config row for this client)`, and today neither client has any `carousel` row at all, so if the two existing rows were ever deleted (row count returning to zero — e.g. by someone "cleaning up" what looks like an unrelated stray config pair, unaware it is load-bearing), the `NOT EXISTS` branch would again evaluate true and carousel eligibility (and every other unlisted format) would silently reopen fleet-wide for that client with zero active decision. Adding the explicit `carousel, is_enabled=false` row this lane proposes closes this specific fragility going forward — as long as that new row itself persists, deleting the original `image_quote`/`text` rows no longer reopens carousel, because the `EXISTS(carousel, is_enabled=false)` check will independently and correctly resolve to "not enabled" regardless of what happens to the other two rows. **This mechanism read is the brief-author's own inference from the cited code logic (scoping packet §1 table, `ai-worker/index.ts:1188-1197`) and the addendum's fragility statement — it is not itself independently re-derived from a fresh code read this drafting pass, and is named as an item for the executing session to confirm before relying on it (see Forbidden actions / fresh pre-checks).**
- Full T2 proof chain per the scoping packet's own §4.2 proof requirements: fresh `db-rls-auditor` read confirming current state, existence-check-before-insert idempotency guard, `apply-harness-auditor` shadow-mode pass, `branch-warden` safe, post-apply re-derivation of both clients' config row counts and byte-identical pre-existing rows, and the CAS no-volume-increase guard (scoping packet §4.2, reusing the proven v11-packet pattern).

**Out of scope:**
- Seed Packet A (NDIS governance-layer closure record) and Seed Packet C (PP migrate-vs-retire feasibility) — separate lanes, each its own Gate-1 brief per the scoping packet §3/§4.1/§4.3.
- Any code change, worker edit, or deploy — the scoping packet is explicit that Seed Packet B touches DB rows only, no code (§4.2: "No code change").
- Any resolution of the `tmr-drift-probe` `declarative_registry_ref_missing` side effect (scoping packet §7 last bullet) — this brief surfaces it as an open decision (below), it does not decide whether to accept it as a known/disclosed side effect (PP's D2 precedent, Option C) or sequence this lane after an as-yet-unbuilt Option-B patch.
- Any change to the pre-existing `image_quote`/`text` rows for either client — the CAS guard explicitly asserts these are untouched (scoping packet §4.2).
- Actually executing the T2 chain or the DML apply — this brief is the Gate-1 artifact only; execution needs its own separate, explicit PK go-ahead per this brief's own Stop condition.

## Allowed actions

*(For the eventual executing session, once PK approves this brief at Gate 1 — not exercised in drafting it.)*

- Read-only repo/DB evidence gathering to confirm this brief's citations are still current.
- A fresh `db-rls-auditor` pass against `c.client_format_config` and `c.client_creative_governance` for both clients (see "fresh live pre-checks" under Forbidden actions/Success criteria — session-specific, not reused from this drafting session or from M11a's original inventory).
- Freezing an apply packet (INSERT-only, both tables) once the fresh pre-checks pass, and running it through `apply-harness-auditor` (shadow mode), `branch-warden`, and the external-review gate on the frozen packet/diff per `CLAUDE.md`'s external-review rules.
- Requesting the PK apply gate (hard stop, DML) once the full T2 chain returns clean.

## Forbidden actions

- **v6.140 watch hold (active, `docs/00_sync_state.md` v6.140 pointer; verbatim ruling `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md:26-36`):** no schedule DML or cap increases; no new heavy CGU Final implementation lane opens before the Phase-2 ruling (watch closes ~2026-08-11 20:20 Sydney). The ruling's own §2 item 4 (`cgu-final-control-tower-watch-ruling-v1.md:64-67`) explicitly names "M11b Gate-1 briefs" as an in-flight docs-only item that "remain[s] at PK's discretion — this ruling does not newly authorize them." **Reading of this brief: drafting/approving this Gate-1 brief is consistent with that carve-out; it does NOT, by itself, authorize this lane's DML apply during the watch window.** Whether Seed Packet B's apply (4 new rows, no schedule table touched) counts as a "new heavy CGU Final implementation lane" for watch-hold purposes is named as an explicit open PK decision below — treat it as HELD until PK rules either way.
- No DDL of any kind; no code edit; no deploy; no touch to `c.client_publish_schedule` (unrelated to this lane, and separately covered by the watch's "no schedule DML" clause).
- No modification of CFW's or Invegent's existing `image_quote`/`text` `c.client_format_config` rows — additive INSERT only, byte-identical pre-image required post-apply (CAS guard).
- No touch to Property Pulse's or NDIS's carousel rows/governance rows — those belong to Seed Packets A and C respectively, not this lane.
- No silent resolution of the `tmr-drift-probe` side-effect question (accept known side effect vs. sequence after an Option-B patch) — that is a named PK decision, not this brief's or the executor's call to make unilaterally.
- No treating this brief's Gate-1 approval as also clearing the DML apply gate — per `CLAUDE.md`'s proof lane, brief approval (Gate 1) and the deploy/apply hard stop (Gate 2) are always separate PK gates; nothing in this brief pre-authorizes both in one motion (no Convention-2 conditional-sequence language is proposed here).
- No relying on this brief's own citations as current at execution time — every live-state claim in Source context/Scope above is dated to 2026-08-02 (containment) / 2026-08-04 (last independent DB verification, per the addendum) / 2026-08-05 (this drafting pass); none of it was independently re-verified live by this drafting pass (brief-author has no DB access by design).

## Success criteria

- **Fresh, session-specific live pre-checks (not reused from this drafting session or from M11a's original inventory) confirm, via a NEW `db-rls-auditor` read at execution time:**
  - CFW's and Invegent's `c.client_format_config` currently hold exactly the 2 rows (`image_quote`, `text`, both `is_enabled=true`) recorded in the scoping packet, unchanged since 2026-08-02 — **and CFW's exact `client_id` is independently looked up fresh** (the scoping packet names Invegent's `client_id` explicitly, `93494a09-cc89-41d1-b364-cb63983063a6`, but does not name CFW's — this brief does not invent it).
  - Neither client already has a `carousel` row in `c.client_format_config` (idempotency guard — a pre-existing row must fail the lane loud, not be silently upserted).
  - Neither client already has a `carousel` row in `c.client_creative_governance` for the same reason.
  - Zero carousel drafts/renders/publishes for both clients since their 2026-08-02 containment date, re-derived fresh (not the 2026-08-04-dated "expected zero, not independently re-verified" figure carried in the scoping packet §2.3/§2.4).
  - Current `tmr-drift-probe` cron health status recorded as a clean baseline immediately before apply, so any post-apply `ok`→`error` flip (the known `declarative_registry_ref_missing` side effect) is attributable, not ambiguous.
  - The v6.140 watch's current state (still active / expired / superseded) is confirmed against the live calendar date and any newer PK ruling, before treating the hold as binding on the apply step.
- `apply-harness-auditor` shadow-mode PASS (or CONCERNS resolved) on the frozen packet, `branch-warden` `safe`, and a clean external review pinned to the frozen diff's hash, per `CLAUDE.md`.
- Post-apply: both clients show exactly 3 `c.client_format_config` rows (`image_quote`, `text`, `carousel`), the two pre-existing rows byte-identical to their pre-image, and one new `c.client_creative_governance` row each with the correct `contract_ref`.
- The CAS no-volume-increase guard (scoping packet §4.2) recorded as asserted, not assumed, in the result doc.
- Zero mutation to any table/row/format outside this lane's named surfaces.

## Stop condition

This brief itself has no further action until PK completes Gate 1: approve / amend / reject the scope above, AND separately rule on the named open question of whether this lane's DML apply may proceed inside the current v6.140 watch window or must wait for watch expiry (~2026-08-11 20:20 Sydney). **Do not begin the T2 chain, freeze an apply packet, or request the DML apply gate until both of those are explicit.** Once executed, report per `docs/briefs/results/_template_result.md` as `docs/briefs/results/m11b-seed-b-cfw-invegent-fence-hardening-result-v1.md`, then stop.

---

## Notes

- This brief deliberately keeps CFW's and Invegent's retirement-record wording distinct (`legacy_pipeline_retired` vs `retired_never_live`) because the evidence supports two genuinely different histories, not one template applied twice — CFW delivered real production (171 succeeded renders/90d), Invegent never delivered a real post. Collapsing them to identical wording would misrepresent the evidence.
- The row-deletion fragility described above is this brief's central risk rationale; it is grounded in the addendum's own words (quoted, not paraphrased) but the *forward* mechanism claim — that adding the new `carousel, is_enabled=false` row actually closes the fragility even if the original two rows are later deleted — is the brief-author's own reading of the cited `ai-worker` boolean logic, not independently re-verified against a fresh code read this pass. The executing session should re-confirm this logic against the live `ai-worker/index.ts` source before relying on it as the lane's safety rationale.
- Seed Packet B is explicitly sequenced independently of Seed Packets A and C (scoping packet §3 item 2) and can run in parallel with A; nothing about the watch hold changes that relative sequencing, only the absolute timing of when B's own apply may fire.

---

## Open questions (PK decisions needed)

1. **Watch-window timing.** Does Seed Packet B's DML apply (4 additive rows, no schedule table touched) count as a "new heavy CGU Final implementation lane" barred until watch expiry, or may it proceed sooner inside the current v6.140 watch window with a fresh, explicit PK go-ahead? — *PK decision needed.*
2. **tmr-drift-probe side effect.** Accept the known, disclosed `declarative_registry_ref_missing` side effect now (PP's D2 precedent, Option C), or sequence this lane after an as-yet-unbuilt Option-B patch that would avoid tripping it? — *PK decision needed.*
3. **Fence-hardening mechanism re-confirmation.** The brief's forward-mechanism claim (an explicit `carousel, is_enabled=false` row closes the row-deletion fragility even if the pre-existing `image_quote`/`text` rows are later deleted) is the brief-author's own inference from cited code logic, not an independently re-traced code read this pass — the executing session should re-confirm against a fresh `ai-worker/index.ts` read before relying on it. Not a PK decision; a pre-execution technical confirmation.

## Evidence gaps (named, not invented)

- CFW's exact `client_id` is not stated anywhere in the cited packets — needs a fresh `db-rls-auditor` lookup before an apply packet can be frozen.
- `docs/00_action_list.md` exceeded this drafting pass's single-read size limit and was not fully read; `docs/00_sync_state.md` plus the verbatim watch-ruling doc were used instead and are treated as sufficient for the watch-hold citation, but a full action-list read was not completed.
- Whether the explicit `carousel` row fully and permanently closes the row-deletion fragility under every future code path (not just the cited `ai-worker` eligibility check) was not independently re-traced this pass.
