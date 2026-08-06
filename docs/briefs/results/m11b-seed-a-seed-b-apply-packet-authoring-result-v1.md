# Result — M11b Seed A + Seed B apply-packet authoring

**Brief files:** `docs/briefs/m11b-seed-a-ndis-carousel-governance-closure-gate1-brief-v1.md` (Option (a) ratified, v6.147 §2.4) + `docs/briefs/m11b-seed-b-cfw-invegent-fence-hardening-gate1-brief-v1.md` ("approved as drafted," v6.147 §2.4)
**Seed:** cross-session control-tower dispatch, "M11b Seed A + Seed B apply-packet authoring" (2026-08-06) — Gate-1-approved authoring, no build lane, no applies
**Executed by:** Claude Code (orchestrator) + `db-rls-auditor` (fresh live evidence) + `apply-harness-auditor` (shadow-mode dual-packet audit)
**Completed:** 2026-08-06 Sydney

---

## 1. Result status

`Complete` — both apply packets authored, both shadow-audited, both fixed post-audit before freeze. **Zero DB mutation occurred.** This is the third packet in the M11b closure trio (with the earlier kinetic_voice packet), completing the set for the post-watch apply wave.

## 2. Commit(s)

N/A — docs-only artifacts, not committed (consistent with this session's posture: main-checkout docs work stays uncommitted unless PK explicitly instructs a commit/push).

## 3. Files changed

- `docs/briefs/artifacts/m11b-seed-a-ndis-carousel-governance-closure-apply-packet-v1.md` — created, then fixed post-audit
- `docs/briefs/artifacts/m11b-seed-b-cfw-invegent-fence-hardening-apply-packet-v1.md` — created, then fixed post-audit
- `docs/briefs/results/m11b-seed-a-seed-b-apply-packet-authoring-result-v1.md` — this file

## 4. Actions taken

**4.1 Fresh live pre-checks (`db-rls-auditor`, `execute_sql` SELECT-only) — one combined pass covering both packets' required facts.** Highlights:
- NDIS's carousel `client_format_config` row and all 12 carousel `format_override` schedule rows confirmed still disabled, unchanged since the 2026-08-04 apply. **One naming discrepancy caught**: the only matching rollback-snapshot table in the DB is named `..._v10_20260804`, not `_v11_` as the Seed A brief's own framing states — flagged for reconciliation, not silently corrected.
- PP's D2 governance row unchanged (`declarative_registry_ref=NULL`, `enabled=true`) — the known trip precondition is intact.
- CFW's exact `client_id` freshly looked up (not trusted from any prior citation): `3eca32aa-e460-462f-a846-3f6ace6a3cae`.
- CFW and Invegent each confirmed at exactly 2 `client_format_config` rows (`image_quote`/`text`, both enabled), unchanged since 2026-08-02. Neither client has a pre-existing `carousel` row in either target table — idempotency clean for both packets.
- **A real methodology trap caught and corrected mid-investigation**: a naive `ILIKE '%carousel%'` substring check on CFW/Invegent draft activity returned 5 false-positive rows — the AI's own rejection-reasoning text merely *mentioned* carousel while explaining why it chose a different format. Re-verified with exact-match logic: true count is 0 for both clients (and NDIS). This methodology note is now baked into the Seed B packet itself so a future re-run doesn't repeat the trap.
- **`tmr-drift-probe`'s actual current status pulled from its own result table** (`c.tmr_drift_probe_run`, not the cron-health monitoring views, which don't track this job at all — a monitoring-surface gap caught this session): `status='error'`, 3/3 recent runs, with 4 named, pre-existing, carousel-unrelated causes (NDIS declarative-pattern-not-found, CFW 404, Invegent + PP `declarative_registry_ref_missing`).

**4.2 Drift-probe impact — computed precisely for both packets, not assumed "same as D2."** Both packets' new rows are `enabled=false`; `fetchGovernedClients()` filters `.eq('enabled', true)` (verified against the live/deployed function in the Seed A brief's own earlier addendum, re-confirmed this session via the fresh `tmr_drift_probe_run` read). Since the probe is *already* `error` from 4 unrelated causes and these new rows are invisible to it by construction, **both packets' apply would leave the probe's status byte-identical `error` with the same 4 causes** — neither packet can add a new cause, and Seed B's own open question 2 (accept-vs-patch-first) is resolved as moot for this specific `enabled=false` design.

**4.3 Seed B's fence-hardening mechanism re-confirmed against a fresh code read**, per the brief's own explicit instruction (its Notes section flagged the forward-mechanism claim as brief-author inference, not independently re-traced). Re-read `ai-worker/index.ts`'s `fetchFormatContext` this session: confirmed the claim holds — the fail-open `NOT EXISTS` branch checks "any config row for this client, any format," so the explicit `carousel, is_enabled=false` row genuinely closes the row-deletion fragility independent of what happens to the pre-existing `image_quote`/`text` rows, because the per-format `EXISTS(... is_enabled=true)` branch now independently resolves false for carousel regardless.

**4.4 Both packets authored** following the D2 migration's proven pattern (deterministic id, `ON CONFLICT DO NOTHING` + fail-loud row-count assertion, paired rollback). Seed B additionally carries the two deliberately-distinct retirement-record wordings the brief specified (CFW: real 171-render history; Invegent: zero real posts ever, per the Zapier-bridge-bug correction).

**4.5 `apply-harness-auditor` shadow review run on both packets, per the seed's explicit instruction.**

| Packet | Verdict | Findings |
|---|---|---|
| Seed A | **CONCERNS** → fixed | AHA-01-1 (high): the packet's own declared "hard abort on nonzero delta" CAS guard was present only in prose (§5), not in the executable transaction — a declared-STOP-in-prose-only pattern. AHA-01-2 (low): execution channel named as two interchangeable tools (`execute_sql`/`apply_migration`) rather than one specific channel. |
| Seed B | **CONCERNS** → fixed | Only AHA-02-1 (low), the same dual-channel-naming gap. Notably, Seed B's own CAS guard was **correctly implemented inside the atomic block from the start** — the audit explicitly contrasted this against Seed A's gap. |

**Both fixed before freeze, not left open:**
- Seed A's CAS guard is now an executable `count(*)`/`RAISE EXCEPTION` assertion inside the same `DO` block as the INSERT, mirroring Seed B's own correct pattern — no longer deferred to an unscripted manual step.
- Both packets now pin the execution channel to `mcp__supabase__apply_migration` specifically (not left as an "either tool" ambiguity) — reasoned explicitly: both packets are intended to land as real, ledgered migration files at apply time, mirroring the D2 precedent's own applied form, not ad-hoc `execute_sql` DML.

The auditor was also asked explicitly to verify (not just accept) that neither packet repeated the earlier kinetic_voice packet's execution-channel-naming gap — confirmed neither did (both named a channel from the start); the dual-tool-naming issue found is a distinct, lower-severity gap, not a recurrence of the deeper defect class.

## 5. Constraints confirmed

- **No DML/DDL apply of any kind** — confirmed: all SQL in both packets is illustrative markdown text, never executed; every live read this session (`db-rls-auditor`'s pass, this orchestrator's own `c.tmr_drift_probe_run` follow-up reads) was `SELECT`-only
- **No schedule DML, no cap raises, no new heavy CGU Final implementation lane** — confirmed, none attempted; both packets' apply steps remain explicitly watch-gated per their own governing briefs
- **Neither Seed Packet C nor any other M11b sub-item started** — confirmed, scope stayed exactly to Seed A + Seed B
- **No code change, no worker edit, no deploy** — confirmed; Seed B's brief explicitly scopes to DB rows only, and this lane touched no `.ts`/`.sql`-migration file, only draft artifact markdown
- **No modification to CFW's/Invegent's existing `image_quote`/`text` rows** — confirmed additive-only design, CAS-guarded in Seed B's own executable transaction
- **No touch to PP's or NDIS's OTHER rows** beyond the one new NDIS governance row Seed A itself proposes — confirmed, Seed A's idempotency precheck scopes exactly to the one new row
- **Did not silently choose Option (a) vs (b) for Seed A** — restated both, noted PK has already ratified (a) per v6.147, did not re-decide
- **Did not silently resolve Seed B's open questions** — watch-timing and drift-probe-side-effect-acceptance both named as open in the packet, with the drift-probe question additionally resolved-as-moot-for-this-design (a factual computation, not a policy resolution)

## 6. Open issues

1. **Rollback-table naming discrepancy** (§4.1) — the Seed A brief's own "v11 apply" framing doesn't match the only matching snapshot table found (`_v10_20260804`). Substance checks out (pre/post state is consistent); the version-number citation needs reconciling with whoever owns that naming convention.
2. **Both packets' apply-gate timing remains genuinely open** — PK has not yet ruled whether either packet's DML apply may proceed inside the current v6.140 watch window or must wait for watch expiry (~2026-08-11 20:20 Sydney). Not decided here, per each brief's own Stop condition.
3. **Seed B's drift-probe open question is resolved as moot for THIS design** (§4.2) but would become live again if PK ever wanted the governance rows `enabled=true` instead — not proposed or recommended here, named for completeness.
4. **`tmr-drift-probe`'s absence from the cron-health monitoring tables** (`ice_ro.cron_health`, `m.cron_health_status`) is a genuine, pre-existing monitoring gap unrelated to this lane's scope — flagged for awareness, not fixed here (out of scope; would be its own small T2 lane).
5. **CFW/Invegent's substring-vs-exact-match investigation trap** (§4.1) is now documented inline in the Seed B packet itself, so it doesn't need re-discovering on any future re-verification pass.

## 7. Next recommended step

Both packets are frozen and ready for their own next gates: `db-rls-auditor` fresh pass at actual execution time (this session's reads should be treated as the pre-check baseline, but a fresh read immediately before any real apply remains standard T2 discipline), external review pinned to each packet's frozen hash, `branch-warden` safe, and the explicit PK apply gate — which must separately name whether it proceeds now or waits for watch close, per both briefs' own Stop conditions. This completes the authoring half of all three M11b closure sub-items now on file (kinetic_voice, Seed A, Seed B) for a single, coordinated post-watch apply wave if PK elects to batch them.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Every success criterion named in both governing briefs is met: fresh execution-time pre-checks (not reused dated figures) for every required fact in both packets; the `enabled=false` drift-probe impact computed and stated, not assumed; `db-rls-auditor`/`apply-harness-auditor` verdicts recorded and named, not summarized away; Seed A's Option (a)/(b) card restated per the scoping packet's own trade-offs; zero mutation.
- The `apply-harness-auditor` shadow pass caught one real, meaningful gap (Seed A's prose-only CAS guard) and one minor completeness gap (dual-channel naming, both packets) — both fixed, not ignored, consistent with the standard this build-acceleration window has held to across all four M11b-related packets authored this session (kinetic_voice, Seed A, Seed B).
- The substring-vs-exact-match false-positive catch (§4.1) is worth flagging as a genuinely useful investigation-methodology finding, independent of this lane's own DML content — it protects any future re-verification pass from repeating the same trap.

## 9. Learning notes

- Running the same shadow-audit tool across four related packets in one build-acceleration window (kinetic_voice, Seed A, Seed B, plus this session's own fixes) surfaces a pattern worth naming: the FIRST packet author-reviewed this way (kinetic_voice) had a channel-naming gap; every packet afterward proactively named a channel — but naming a channel loosely (two interchangeable tools) is itself a distinct, catchable gap the auditor still found. Fixing one instance of a defect class doesn't retire the whole class — worth treating apply-harness-auditor as a real per-packet gate, not a one-time lesson to internalize and skip re-running.
- Pulling a probe/job's OWN result table (`c.tmr_drift_probe_run`) rather than trusting a cron-scheduler's "did it fire" signal (`cron.job_run_details`) mattered here — the two answered different questions (mechanism-fired vs business-logic-outcome), and conflating them would have produced a wrong "current status" citation in both packets.
