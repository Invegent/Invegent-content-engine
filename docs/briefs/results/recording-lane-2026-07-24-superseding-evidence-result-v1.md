# Result — Recording Lane pass 3, 2026-07-24: superseding evidence, PK rulings, and four gate-1 packets

**Status:** `RECORDING PARTIAL — 4 of 5 PACKETS COMMITTED, cc-0063 DEFERRED · ZERO PRODUCTION MUTATION · NO HISTORY REWRITTEN`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers only)
**Date:** 2026-07-24 Sydney
**Executor:** Claude Code — session **S4 (Recording Lane)**, reopened under orchestrator directive
**Register pointer:** **v6.16**, in `docs/00_sync_state.md` and `docs/00_action_list.md`
**Not committed:** `cc-0063-brand-host-designation-gate1-packet-m2-v1.md` — see §9.1a
**Predecessors:** `docs/briefs/results/recording-lane-2026-07-24-gate1-round-result-v1.md` (v6.14 `e2343a8` · v6.15 `495abe3`, both pushed)

> **The governing instruction for this pass: record corrections as SUPERSEDING EVIDENCE without
> rewriting history.** Every original record is preserved exactly as committed. Nothing below edits a
> committed document, and nothing below resolves a defect — this lane records, it does not repair.

---

## 1. Item 1 — the site count: **six is superseded by five additional / seven total**

**Original record, preserved unchanged:** `docs/briefs/dashboard-containment-batch-2-boundary-and-eq2-proof-v1.md`
§3.2 (committed `e2343a8`, pushed) states **six** further caller-controllable `exec_sql` sites. **That
document was NOT edited.**

**Superseding finding (S1, PK-ratified):** `app/(dashboard)/actions/discovery-keywords.ts:32` was a
census false positive. Read at dashboard `origin/main` `1572fbd`:

```
23:  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
26:  if (!UUID_RE.test(clientId)) return [];
```

The grammar is anchored, hex-and-hyphen only, **no `m` flag, no `g` flag**, so it admits no quote,
whitespace, or comment character.

**⚠ The justification changed during this lane and the earlier one is RETRACTED.** An earlier revision
argued the missing `typeof` guard was safe because *"the RSC wire format delivers only plain values,
never objects carrying an adversarial `toString`"*. S1 records that claim as **false as written** —
`decodeReply` can deliver arrays, Maps, Sets, Dates, typed arrays, and objects with an own `toString`.
**The load-bearing argument is now no-divergence (no TOCTOU):** `.test()` at `:26` and the template at
`:29-33` are separated only by a synchronous `createServiceClient()` call at `:27`, **with no `await`
between them**, so a stateful `toString` has no interleaving point. The conclusion is unchanged; the
reason was wrong and has been corrected.

**⚠ The precise claim is "not injectable at `:32`" — NOT "the file is clean."** S1 scopes this
deliberately: `addDiscoverySeeds` (`discovery-keywords.ts:41-60`) passes caller-controlled `client_id`
/ `keywords` / `example_urls` to `add_client_discovery_seeds` through the service-role client with **no
validation and no authz**. Bound parameters, so not an injection sink — but an unvalidated,
unauthorized privileged write. **`discovery-keywords.ts` must not be "fixed" at `:32`, and must not be
described as clean.**

**Reconciliation with Batch 1, recorded so it is not read as a licence:** `lib/validation.ts:47-49`
states the `typeof` check *"MUST stay above the regex"*. Both are correct for different reasons —
`assertUuid` is general-purpose and its callers may separate validation from use, so it cannot rely on
a no-divergence precondition; `discovery-keywords.ts` satisfies that precondition locally. **This is
not a pattern to copy elsewhere.**

**The governing arithmetic from here on — PK-ratified:**

| | Count | Owner |
|---|---|---|
| Caller-controllable `exec_sql` paths at `1572fbd` | **7** | — |
| `run-scans/route.ts:20` · `onboarding-scans.ts:75` | **2** | **cc-0053** |
| `client-profile/page.tsx` · `api/visuals/route.ts` · `api/feeds/available/route.ts` · `pipeline-stats.ts` · `digest-policy.ts` | **5** | **cc-0054** |

**PK ruled D3 = Option 1:** Slice 0.5 enforcement may **NOT** be enabled until **all seven** are
contained. **cc-0053 alone does not unblock enforcement — cc-0053 and cc-0054 must both land.**
"Batch 2 shipped" is not a synonym for "the E-Q2 precondition is met"; cc-0053 discharges two sevenths.

**Census scope also moved:** the packets now record the census as covering **every non-test `exec_sql`
file (51 matches; 50 excluding `tests/`)**, where the committed boundary doc said 47. Recorded, not
reconciled — see §9.3.

**Unchanged and still true:** the most reachable injection point remains `/client-profile?client=`
(a GET-reachable server-component page), not either cc-0053 sink.

## 2. Item 2 — AC-LAYOUT: a binding condition whose FIRST FORMULATION WAS UNSOUND, on a stale baseline

**PK elevated the E-Q4 finding to a binding acceptance condition. Failing it is a STOP.**

**⚠ Two independent defects were found in it during this lane, and both are recorded.**

**(a) The first formulation was UNSOUND — corrected.** As first written, AC-LAYOUT was *"no unguarded
`'use server'` function may become reachable through `app/layout.tsx` or its transitive imports"*, and
its check derived the action set from a **hardcoded `app/mcp-*` glob**. But `middleware.ts:35-40` also
admits **`/login`** anonymously, and `app/(auth)/login/page.tsx:1` imports the `'use server'` export
`login` from `actions/auth.ts`. **A lane could therefore satisfy the criterion in full while an action
imported by the login page became anonymously reachable.** This was `security-auditor` **MF-1**.

**The corrected condition, stated over the set that actually matters:**

> **No unguarded `'use server'` function may become reachable from any worker that `middleware.ts`
> admits anonymously** — whether imported by that page directly, or transitively via `app/layout.tsx`
> or any component it renders.

The action set must be **derived from `middleware.ts`**, never from a path glob — matching is by
*pathname*, so a route group changes the bundle path without changing the pathname. The check gains a
**named exception register** for legitimately-unauthenticated actions (`login`/`logout`), without which
the criterion would be unsatisfiable. It also gains a **resolution caveat**: the manifest maps workers
to **webpack module ids, not source paths**, so resolving a member to its source is *reasoning to be
shown*, not a mechanical lookup.

**This correction is strictly broader than PK's wording and subsumes it.** Recorded here because a
binding acceptance condition that can be satisfied while the invariant regresses is worse than no
condition.

**(b) The baseline is stale, wrong-branch evidence.** The `|A| = 1` figure (`emitFriction` alone, via
`FrictionFAB` in `app/layout.tsx`) was read from `.next/server/server-reference-manifest.json` dated
**2026-07-02**, built from the local checkout's branch **`tmr-template-intake-ui-v0`** — **not** from
`origin/main` `1572fbd`.

- The **E-Q4 mechanism** conclusion does **not** depend on it — derived from pinned `next@14.2.35`
  source, and it **stands**.
- The **per-action count** does. **It must be re-derived by a build at the implementation base before
  reliance, and must never be quoted as the current state in the interim.** The E-Q4 verdict document
  was **rev-2'd to retract its "exactly one action" headline**.

Recorded rather than resolved: re-deriving requires a build, and both lanes are authoring-only.

## 3. Item 3 — the stale AGP review-chain blocker is RESOLVED

**Original record:** `cc-0047` §6 recorded a `db-rls-auditor` **DB-tool / credential access gap** that
"may block the §10 review chain", carried into the cc-0063 brief §14 as a named handoff.

**Superseding finding (S3, verified):** the gap is **resolved**. The agent carries its DB tools, and
`scripts/db-read.py` resolves its DSN from `~/.ice_readonly_dsn`. **No CCF-02 R1 substitution is
needed; the cc-0063 review chain runs as written** — `db-rls-auditor` + `branch-warden` + external
review pinned to the migration hash + rollback authored before apply + PK gate.

**Precision, so this is not over-read:** resolving the *credential* gap does **not** put `c.brand_avatar`
on the zero-prompt R0 path. `ice_readonly` remains confined by schema-USAGE to `ice_ro` plus public
catalogs and cannot reach `c.*`, so every avatar read still goes through `execute_sql` (`ask`).
**Operator prompts during the cc-0063 review are designed friction, not a fault.**

## 4. Item 4 — corrected persona evidence: the recorded framing is partly wrong

| Recorded | Corrected |
|---|---|
| 16 successes | **20** successes |
| implied a spread | **all on one day** |
| a clean cliff to `no_persona_available` | `no_persona_available` begins the **same day** — **there is no clean cliff** |
| persona data stopped | persona data is **still being written** — **43 of 62 intents** |
| the persona stage is the cause | **the dominant cause is upstream: 809 of 973 slots (83%) carry NULL `intent_id`** |

**Additional structural finding:** **four distinct causes collapse into the single reason string
`no_persona_available`**, and **one of them is a swallowed database error**. A single reason string
covering four causes — one of which is an error being discarded — is the same failure shape as the
cc-0052 defect, in a different worker.

**Recorded, not repaired.** Handoff document: `docs/briefs/agp-persona-signal-outage-handoff-v1.md`
(**see §9.2 — not committed**).

## 5. Item 5 — four of five packets committed AS AUTHORED; **cc-0063 DEFERRED**

Each committed packet was read in full **at the version committed**; **no content was edited by this
lane.**

| Path | Session | State recorded |
|---|---|---|
| `docs/briefs/cc-0053-containment-batch-2-gate1-finalization-v1.md` | S1 | DRAFT — awaiting PK |
| `docs/briefs/cc-0054-dashboard-exec-sql-caller-controlled-containment-brief-v1.md` | S1 | Gate-1 DRAFT — awaiting PK |
| `docs/briefs/results/auth-uid-verification-note-v1.md` | S1 | DRAFT — awaiting PK |
| `docs/briefs/cc-0073-decision-packs-a-b-c.md` | S5 | decision packs — awaiting PK rulings |
| ~~`docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md`~~ | S3 | 🔴 **NOT COMMITTED — see §9.1a** |

**`security-auditor` verdict on the cc-0053/cc-0054 pair — now recorded:** **`concerns` (AMBER)**,
**7 must-fix** (all verified against source and applied) and **10 should-fix**. Its own conclusion:
the five-site correction, the seven-path total, the "do not fix `discovery-keywords`" call, and the T2
tier **all survive adversarial checking and stand**. MF-1 was the AC-LAYOUT unsoundness (§2a).
Evidence: `docs/briefs/results/cc-0053-cc-0054-gate1-review-evidence-v1.md` (**not committed — §9.2**).

**New open decision D-6 (cc-0054):** whether to scope `upsertDigestPolicy` (`digest-policy.ts:24-40`)
into the lane. It is an unvalidated, unauthorized **privileged write** in a file cc-0054 already edits
— **the same class cc-0053's D-3 ruled IN for `activateClient`**. Consistency argues to include it; the
pinned five-site scope argues against. S1 recommends PK rule explicitly rather than let the precedent
diverge silently.

**On the `auth.uid()` note:** it closes a **named substitution** carried in two already-committed
documents (`cc-0046-slice-0-5-a-class-ruling-packet-v1.md` §0 and the boundary doc §3.1 C2), which
relied on the Slice 0.5 brief's 2026-07-22 read. It **supersedes the substitution without editing
either document**. Confirmed: `auth.uid()` is SECURITY **INVOKER**, STABLE, **no `proconfig`** (mutable
`search_path`), and carries **PUBLIC EXECUTE**; identity derives entirely from
`current_setting('request.jwt.claim.sub' / 'request.jwt.claims')`, so it is NULL under the service-role
client and forgeable via `set_config` through any `exec_sql` path. **E-Q2 conclusion C2 is now
independently verified rather than carried.** C1 never depended on it.

## 6. Item 6 — PP YouTube static `image_quote`: ACCEPTED NON-CAPABILITY

**A deliberate product choice, not a defect.** `t.platform_format_mix_default` (`is_current=true`,
effective 2026-04-22) allocates YouTube **100% video** — kinetic 30% · kinetic_voice 25% · stat 20% ·
stat_voice 15% · avatar 10% — and gives `image_quote` **no YouTube row at all**, while allocating it
30% facebook / 20% instagram / 15% linkedin, each with a cited evidence source.
`c.client_format_mix_override` is empty. Zero future YouTube slots request a static format.

**Recorded as an accepted limitation. The historical classification is NOT rewritten** — the PP
YouTube ledger row stays **`(platform_config, misconfigured)`**, frozen and untouched, exactly as
directed. F3 resolves as correct-by-design; F4 is downgraded from defect to accepted limitation. **No
template lane, no suitability rows, no sourcing, no ledger mutation.** The correct trigger to revisit
is an amendment to `t.platform_format_mix_default`.

## 7. Item 7 — 🔴 OPEN PRODUCTION-PROOF DEFECT: the scrim mismatch

**Every shared asset records `asset_meta.crop_proof = "pass_1x1_scrim62"` — proven readable at a 62%
scrim. `resolve_slot_assets` v1.2 hard-codes 40% for `safe_for_text_overlay = true`:**

```
c_scrim_opacity_needs_scrim CONSTANT numeric := 48;
c_scrim_opacity_text_safe   CONSTANT numeric := 40;
```

All 8 shared assets carry `safe_for_text_overlay = 'true'`, so **production applies 40% and never 62%.
The text-safety proof was validated at a density production never applies.**

**This touches a §2 non-negotiable of the Image Workflow Acceleration policy** — *text-safety crop
proof before any accept*. A proof conducted at a density production does not use does not discharge
that guard. It is also the named ICE failure mode: **a declared control production never reads**, here
inside a text-legibility guard.

**Observed consequence, not inferred:** `contact_sheet_as_rendered.jpg` shows S1, S4 and S6 with
visibly weak white headline contrast at 40%, and S5/S7 unreadable over foliage. **The one already-live
shared asset (S8, `bg_shared_datacentre_server`, Invegent) has been rendering at a scrim density its
own crop proof did not certify.**

> **STATUS: OPEN. This lane records it and does NOT record it as resolved.** A remediation exists on
> paper — `resolve_slot_assets` already honours a per-asset `asset_meta.scrim_opacity_override`,
> clamped 0–100 — but it is **proposed, not applied**, and every mutation remains gated. **The lane is
> S5's remediation packet (`docs/briefs/cc-0073-decision-packs-a-b-c.md`, rulings A2 and B2).** No
> override was written by this lane or any other.

## 8. PK rulings recorded

| Ruling | Effect |
|---|---|
| **Dashboard Gate 1 approved for `cc-0053` and `cc-0054`** | **BUILD authorized.** **Deploy, apply, merge, push and enforcement are NOT authorized.** Enforcement additionally blocked by D3 until all seven paths are contained |
| **`cc-0063` ruled T2** | Auto-escalation to T3 remains armed on any resolver-consumed structure, live-selection behaviour, DDL, `is_active` change, worker change, or fingerprint mismatch |
| **S1 holds write precedence over the `cc-0054` targets** | **S6 is analysis-only** on those paths |
| **CFW / Invegent directions approved PROVISIONALLY** | **All mutations remain gated** — every promotion, policy row, sourcing action, ledger write, commit, register version and push stays forbidden until PK rules per item |
| **`cc-0078` and register block v6.70–79 RESERVED, NOT ACTIVATED** | The pattern-level silent-database-failure lane (`heygen-worker` / `ai-worker` `exec_sql` callers) is **not opened**. Its inventory was **not begun** |

## 9. Findings this lane records but did not resolve

### 9.1 The packets moved under this lane mid-commit — caught by `branch-warden`

`cc-0053` and `cc-0054` were read, staged, and then **re-authored by S1 while staged**. `branch-warden`
returned **`stop`** on the first attempt, catching **67 added / 15 removed** unstaged lines on
`cc-0054` and **54 / 19** on `cc-0053` — content the staged blobs did not contain.

**This was not cosmetic.** The staged version asserted the RSC-wire-format reasoning that the newer
version **retracts as false** (§1), and carried the AC-LAYOUT check procedure the newer version labels
**UNSOUND** (§2a). **Committing the first staging would have landed, into a superseding-evidence lane,
the exact version its own successor supersedes.**

Both packets were **re-read in full at the new version** before re-staging — this lane does not commit
a document it has not read. Recorded because it is the shared-checkout hazard behaving exactly as
CLAUDE.md warns, and because the guard that caught it was the mandated pre-commit `branch-warden` run,
not luck.

### 9.1a 🔴 `cc-0063` M2 packet DEFERRED — actively being rewritten, and unread at the staged version

**It is not committed.** S3 is authoring it live, and it moved three times during this lane:

| Observation | Lines |
|---|---|
| Version read in full at the start of this lane | 328 |
| Version actually in the index when re-staged | **298** — §5/§5.1 already rewritten to stop restating the SQL |
| Worktree during the pre-commit guard | 439 → **487**, still growing |

**Two independent reasons to stop, either sufficient:**

1. **The staged version was one this lane had not read.** S3 rewrote §5/§5.1 between the full read and
   the re-stage, so the index held content never reviewed here. Committing it would have broken this
   lane's own rule — *never commit a document you have not read* — silently.
2. **It is not stable.** The file grew by 48 lines between two consecutive verification commands.
   There is no version to pin.

The pre-commit guard caught it: the commit was gated on *no unstaged drift across every staged path*,
and that guard failed rather than the commit proceeding.

**What the new material contains** (read, though not committed): a completed T2 review chain — migration
and rollback **sha256 hashes**, positive **and negative** guard validation, a rollback round-trip
fidelity proof over all 28 rows, a `db-rls-auditor` verdict of **`concerns`** with four `must_fix`
dispositions, a fresh permission re-verification finding that **the standing "`apply_migration` is
harness-deny-listed" memory is now STALE** (it was true on 2026-07-20; the posture changed), and two
new carries — **C-2**, that the A→B→C invariant has **zero database enforcement** and
`public.assign_brand_avatar` gives the dashboard a one-click path to step C, and **C-3**, that the
designation leaves no temporal trace.

**⚠ Two further items surfaced and NOT resolved:**

- **The packet pins sha256 hashes for two real, untracked SQL files** —
  `supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql` (6107 B) and
  `…120100_…_rollback_v1.sql` (2852 B). **They exist on disk and are not in version control.** They are
  the normative artifacts the review chain is pinned to; they are also **not docs**, so they were never
  within this T1 lane's remit. Committing the packet without them would pin hashes to files no one else
  can see.
- **§13.7 references a `§13.8` (external review pinned to hash) that does not exist in the document.**

**Disposition: cc-0063 needs its own recording pass, once S3 stops writing and the packet is stable** —
with the two migration files' disposition decided by PK, since they fall outside a docs-only lane.

### 9.2 🔴 Five dangling references — cited documents that exist but are NOT committed

The approved file set named exactly five paths. Those five cite five documents that exist untracked in
the shared checkout and are **not** in the set, so they land as dangling references:

| Cited by | Referenced document | Why it matters |
|---|---|---|
| `cc-0053` §7 | `docs/briefs/results/cc-0053-cc-0054-gate1-review-evidence-v1.md` | **The `security-auditor` evidence** for a verdict both packets rely on — 7 must-fix dispositions and the residual open items |
| `cc-0053` §4 · `cc-0054` §4, §8.1, §9.1 | `docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md` | **The derivation of AC-LAYOUT**, a binding condition whose failure is a STOP — and it has been **rev-2'd** |
| `cc-0063` M2 header | `docs/briefs/cc-0063-brand-host-designation-implementation-packet-v1.md` | The packet M2 **supersedes in part**; its census, review verdict, invariants and execution discipline are carried forward |
| `cc-0073` header | `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` | cc-0073's **parent brief**, recorded as "Gate 1 accepted" |
| `cc-0063` M2 §9 | `docs/briefs/agp-persona-signal-outage-handoff-v1.md` | The persona handoff underlying §4 above |

**A clarification was requested and not answered, so this lane took the conservative reading** of its
binding constraint — it staged only the explicitly approved paths rather than widening its own scope.
**The references are recorded as open, not silently tolerated.** Committing the five is a short
follow-up for whoever holds the next recording pass.

*Note: the review-evidence file did not exist when this lane first checked; S1 created it mid-lane. Its
absence was going to be recorded as a governance defect — a review claimed with no artifact. That is
now moot: the artifact exists. It is simply not committed.*

### 9.3 Two counts that moved and were not reconciled

The committed boundary doc records the census as covering **47** non-test `exec_sql` files; the current
packets record **51 matches, 50 excluding `tests/`**. Separately, the committed Batch 2 brief §9 says
*"roughly 40 further interpolation sites"* while the boundary doc supersedes a *"~140"* standing
position — the discrepancy this lane's predecessor also declined to reconcile.

**Not reconciled, deliberately.** These are different scopes stated by different authors at different
times, and reconciling them would mean editing packets this lane is directed to record as authored.
**The claim that matters is independent of all of them: the caller-controllable subset is SEVEN — two
in cc-0053, five in cc-0054 — and PK has ratified that arithmetic.**

## 10. What this lane changed

**Files created:** this document.

**Files brought under version control:** the **four** packets in §5, **as authored, at the version read**. **`cc-0063` was deliberately excluded** (§9.1a).

**Files NOT edited, deliberately:** `docs/briefs/dashboard-containment-batch-2-boundary-and-eq2-proof-v1.md`
(carries the superseded six-site count and the 47-file census figure) ·
`docs/briefs/dashboard-privileged-action-containment-batch-2-brief-v1.md` ·
`docs/briefs/cc-0046-slice-0-5-a-class-ruling-packet-v1.md` (carries the now-closed `auth.uid()`
substitution) · the cc-0049 lane record · every earlier register entry. **No history was rewritten.**

**Registers:** one Convention-1 pointer at **v6.16** in both. **v6.16 is sequential registrar
numbering and is NOT drawn from any reserved block** — v6.20–29 (S1) · v6.30–39 (S2) · v6.40–49 (S3) ·
v6.50–59 (S4-spine) · **v6.70–79 (`cc-0078`, reserved not activated)** all remain untouched. v6.20,
v6.50 and v6.70 were not taken. **v6.14 and v6.15 were not amended.**

**Production mutations: 0.** No deploy, migration, DML, publish, approval, flag change, promotion,
policy row, ledger write, branch mutation, or push.

## 11. Next gate

> **PK rules on the open items:** `cc-0053` F-1…F-4 (external-review scope, branch retirement,
> cc-0053/cc-0054 sequencing, AC-LAYOUT as a control) · `cc-0054` **D-1…D-6** (D-6 is new — scope
> `upsertDigestPolicy` in, or leave it named-and-excluded) · `cc-0063` at its packet hash · the
> `cc-0073` A1/A2/A3/A4/B1/B2/B3/C1 rulings.

**Also awaiting disposition:** `cc-0063` and its two untracked migration files (§9.1a) · the five dangling references (§9.2).

**`cc-0078` is reserved and not opened. Its inventory has not begun.**

**Push remains a PK hard stop.**
