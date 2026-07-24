# Brief cc-0063 — Brand Host Designation (v0)

**Created:** 2026-07-24 Sydney
**Author:** Claude Code — S3 (AGP Identity), planning-only worker session
**Executor:** TBD at PK gate 1 — **not** this session
**Status:** `draft` — awaiting PK Gate 1
**Parent:** `cc-0047` (PK-ACCEPTED planning artifact) · step 4 of its Part-3 gate map
**Sibling (failed):** `cc-0052` — ⛔ refuted, do not execute, do not inherit
**Lane classification (CCF-02):** SAFETY_GATE · **Tier T2** (see §10; escalation triggers named)
**Result file:** `docs/briefs/results/cc-0063-brand-host-designation-result-v1.md` (on completion)

> **This brief is a PROPOSAL for a future lane. It authorises nothing.** No marker write, no code,
> no deploy, no flag, no avatar activation is performed by drafting or approving it as a *draft* —
> approval at Gate 1 authorises the **implementation lane described in §7–§11 and nothing else**.
>
> **Deliberately un-pinned mechanism.** Per `cc-0052` lesson 5 (*"a pinned mechanism in a brief is a
> risk concentrator"*), §3.4 states required **properties** and lists candidate mechanisms with
> trade-offs. The implementation lane selects one at its own gate. **A brief that pins the mechanism
> and de-scopes the alternative is the exact shape that produced the 2026-07-23 outage.**

---

## 1. Task

Give ICE a **declared answer** to the question *"who normally presents this brand?"* — today that
answer is an accident, not a decision.

Live avatar selection resolves identity by the **A2 pin**: `is_active = true` ∧ exact `render_style`,
then `LIMIT 1` with **no `ORDER BY`**. It returns the right avatar only because each of NDIS Yarns
and Property Pulse happens to have exactly **one** active row. Nothing declares that row to be the
brand's host; `is_active` means "this asset is usable", and it is being read as if it meant "this is
the brand's identity". Those are two different facts stored in one flag.

This lane separates them: it makes **host designation an explicit, governed, auditable declaration**
(`c.brand_avatar.is_default_host`), while leaving live selection **byte-identical**. It is the
foundation every later AGP v2 step stands on — and it is safe precisely *because* it changes nothing
that runs.

## 2. Source context

| Source | Why it matters |
|---|---|
| `docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md` | The PK-ACCEPTED plan. Part 2 control census; Part 3 step 4 = this lane; Part 3 steps 5–7 depend on it. |
| `docs/briefs/results/cc-0052-heygen-typed-resolver-incident-result-v1.md` | The failed sibling. §8 lessons are binding design constraints here (§6). |
| `docs/briefs/character-model-v0-brand-host-designation.md` §3, §6, §8 | The approved Character Model v0, the verified 2026-06-19 inventory, and the original §8 recommendation this brief supersedes-by-expansion. |
| `docs/briefs/agp-d01-3-shadow-resolver-telemetry.md` §A.2, §A.3, §B.2 | Marker semantics, the two partial unique indexes, candidate-multiplicity analysis, the total-order pin. |
| `docs/briefs/agp-d01-gate3-phase3.3-activation-soak-runbook.md` | **Sequencing superseded** (`cc-0047` Part 4); mechanics reusable — see §5. |
| `supabase/functions/heygen-worker/index.ts:61–107` (v2.3.0, fn 43) | The live `lookupAvatar`. Read-only reference. **Not touched by this lane.** |
| `CLAUDE.md` | Standing orchestration contract; tiering, gates, DB gotchas. |

**Entry-state facts** (census-verified 2026-07-23, `cc-0047` Part 2 — **not re-derived here**):

- 1 active realistic avatar for NDIS Yarns (`83ff167d-a844-4e1c-9d1a-d8ff257c11bc`) and 1 for
  Property Pulse (`d6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd`); **0 avatars** for Invegent and CFW.
- `is_primary` / `is_default_host` exist with two partial unique indexes — **0 of 28 rows set**.
- `stakeholder_role` null on all 86–87 renders and all 119 `video_short_avatar` drafts; selection is
  **100 % `fallback_limit1`**. The role predicate has never fired in production.
- `r.avatar_resolution_shadow` exists with **0 rows**; `AVATAR_SHADOW_TELEMETRY` inferred **OFF**.

**Re-verified by this session (read-only, repo grep, 2026-07-24):** `is_default_host` / `is_primary`
appear in **no** Edge Function source. The only `is_primary` hits in `supabase/functions/**` are on
the unrelated `c.client_content_scope` table (`ai-worker/index.ts:989`, `image-worker/index.ts:1073`,
`youtube-publisher/index.ts:353`). The marker columns are confirmed unread by live selection.

## 3. The designation model

### 3.1 What designation *means*

**Brand host designation is a declaration of identity, not a statement of capability.**

| Fact | Stored as | Question it answers |
|---|---|---|
| capability | `is_active` | *May this asset be rendered at all?* |
| **identity** | **`is_default_host`** | ***Is this the brand's presenter when nothing more specific applies?*** |
| role fit | `is_primary` (+ `stakeholder.role_code`) | *Is this the canonical avatar for a given role?* — **out of scope, see §9** |

Today `is_active` is doing all three jobs by accident of there being one row. Designation makes the
middle row of that table a **real, separately-writable, separately-auditable fact**.

Two properties follow, and both must hold:

1. **Designation is inert until a resolver reads it.** Writing `is_default_host` changes no rendered
   output, no selection, no telemetry. That is the point: it is the one step in AGP v2 that can be
   taken with essentially zero production risk.
2. **Designation is not sufficient.** A designated host that no resolver consults is a *declared
   control production never reads* — the named ICE failure mode. This brief therefore **explicitly
   refuses to claim any governance benefit on completion** (§13.1). The benefit accrues only when a
   later, separately-gated lane makes selection read it.

### 3.2 Who holds designation

**PK holds it.** Host designation is a brand-identity decision (who speaks for this brand), not an
operational one. It is not delegable to an agent, an operator UI, or an automated rule in v0.

**Mechanism of record: an auditable migration only** (`apply_migration`), never ad-hoc DML — carried
forward from `character-model-v0-brand-host-designation.md` §8.

⚠ **Known limitation, must be stated in the result, not papered over:** ICE has no actor identity.
There is no FK from any audit column to `auth.users`, and `auth.uid()` is NULL under the service-role
client. A designation write is therefore attributable to *a migration file and a commit*, **not to a
person, by the database**. The migration + commit + PK gate record *is* the audit trail for v0. If
per-person attribution is later required, that is a separate lane.

### 3.3 The four-client picture — absence is not a decision

|  | Invegent | Care For Welfare | NDIS Yarns | Property Pulse |
|---|---|---|---|---|
| avatars | 0 | 0 | 14 (1 active) | 14 (1 active) |
| host designated after this lane | **no** | **no** | yes | yes |
| but *why* not | no asset exists | deferred by decision | — | — |

After this lane, Invegent and CFW are indistinguishable in the database from "a brand whose host
simply hasn't been designated yet" — all three states read as `is_default_host = false` everywhere.
**`cc-0047` Part 3 step 4 requires these clients to resolve to an explicit governed
`no-eligible-avatar` state and never silently fall through.** A boolean cannot express that.

This is a **real modelling gap**, surfaced not solved: see open question **Q1** (§13).

### 3.4 Required properties — mechanism deliberately NOT pinned

Whatever mechanism the implementation lane selects **must**:

- **P1** — write exactly the designation fact and nothing else; touch no other column, in particular
  never `is_active`.
- **P2** — be reversible by a single inverse statement with no data loss.
- **P3** — fail closed on violation of either partial unique index, rather than silently choosing.
- **P4** — leave live selection provably byte-identical (§10 evidence bar).
- **P5** — express "designated: none" distinguishably from "not yet designated" **or** explicitly
  record that it does not, and name what does (Q1).

Candidate mechanisms for the implementation lane to weigh (**not a shortlist to be narrowed here**):

| Mechanism | For | Against |
|---|---|---|
| **(a)** `UPDATE … SET is_default_host = true` on the 2 rows, via migration | smallest possible change; uses applied dormant infrastructure; index-guarded | cannot express P5; per (client, render_style) not per client — see Q2 |
| **(b)** (a) **+** a client-level designation-state field | satisfies P5; makes "deliberately no host" a first-class value | adds schema; needs its own DDL review; larger blast radius |
| **(c)** a designation **table** (client, render_style, brand_avatar_id, designated_at, rationale) | full history; rationale is captured; no overloading of a boolean | most schema; duplicates a fact the existing column can hold; migration-heavier |

## 4. Governed ambiguity — the load-bearing section

Mission item 2 asks what it means for a brand to have more than one legitimately active identity, and
who decides. The answer has a hard sequencing constraint that must not be violated.

### 4.1 Where ambiguity actually comes from

`brand_avatar_stakeholder_id_render_style_key` makes (stakeholder, render_style) unique. Therefore
**multiple candidates can only arise across stakeholders within one (client, render_style)** —
i.e. a second *person/role* for the brand, in the same style
(`agp-d01-3-shadow-resolver-telemetry.md` §A.3).

Consequences worth stating plainly:

- The 7 dormant **animated** rows per brand are **not** ambiguity. `render_style` is an exact-match
  filter, so a realistic and an animated avatar never compete. Activating an animated variant does
  not create ambiguity — it creates a second, separate, unambiguous lane.
- **Legitimate ambiguity means: the brand genuinely has two presenters** — e.g. NDIS Yarns fielding
  both a Support Coordinator and a Participant Advocate, both real, both usable, both realistic.
- Anything else — a duplicate row, a test asset left active, a migration artefact — is not ambiguity.
  It is a **defect**, and the resolver must not be asked to arbitrate it.

### 4.2 The three steps, and the invariant between them

| | Step | Live risk |
|---|---|---|
| **A** | **Declare** the designation (this lane) | none — marker unread |
| **B** | Make live selection **read** the designation | **high** — this is the step `cc-0052` failed |
| **C** | **Create** ambiguity (activate a second host) | **high, and silent** |

> ### ⛔ INVARIANT — the single most important sentence in this brief
> **C must never precede B.** Activating a second avatar while live selection is still an unordered
> `LIMIT 1` makes the brand's on-screen presenter **nondeterministic by storage order** — Postgres
> guarantees nothing. It would not fail loudly. It would render the wrong person, intermittently,
> with a green pipeline.

A → B → C is therefore the only admissible order, and **A is safe only because it is inert**. The
temptation this brief exists to defuse is doing A and C together ("designate a host *and* switch on
the second avatar so there's something to designate between") — that combination converts a zero-risk
step into a silent production hazard.

### 4.3 Who decides ambiguity

**PK, per brand, per activation** — the same authority that holds designation (§3.2), and never as a
side effect of an asset-intake or onboarding lane. Concretely, the lane that first activates a second
avatar must be its own T3 brief and must demonstrate, before apply, that step B is complete and
proven. Asset onboarding lanes must be forbidden from flipping `is_active` on an avatar for a client
that already has an active one in the same render_style.

## 5. Why the Phase 3.3 soak leaves the critical path

Mission item 3, discharged with the reason stated once:

The Phase 3.3 soak measures **resolver-vs-live agreement across a candidate set**. With exactly one
active avatar per client, every row it could write would read `candidate_count = 1`, `agree = true`,
`drift_class = none`. It is an EF deploy plus a secret flip purchasing **zero decision evidence**.
The runbook's own success criterion — *"100 % of `ordering_drift` cases enumerated"*
(`agp-d01-gate3-phase3.3-activation-soak-runbook.md` §E) — is vacuously satisfied by an empty set.

**The soak is not deleted; it is repositioned.** Its true value is as the **observation instrument for
step C** — the safety net that makes first-ambiguity introduction auditable rather than hopeful. Its
mechanics (candidate set capture, `drift_class` ladder, snapshot hash, deterministic replay,
flag-flip rollback) are all reusable there, unchanged.

**Revised position:** the soak is a **prerequisite of C**, not of A or B. It is hereby **off the
critical path of Brand Host Designation**. Phase 3.3 remains BLOCKED; this brief does not unblock it
and does not ask to.

## 6. cc-0052 lessons carried — including one that is still open in production

The five lessons of `cc-0052` §8 are binding on every lane downstream of this one. Three are directly
load-bearing here, and one produced a new finding.

**L1 — destructuring only `data` hides every query error as a false null.**

⚠ **NEW FINDING, read-only, 2026-07-24 — this defect is NOT fixed. It is live right now.**
The rolled-back v2.3.0 `lookupAvatar` reads:

```ts
const { data: rows } = await supabase.rpc('exec_sql', { query: `…` });   // index.ts:84
```

`error` is discarded here **exactly as it was in the code that caused the outage**. The rollback
restored the *previous* code, not *correct* code. Any `exec_sql` failure — RPC error, permission
change, malformed interpolation, transient fault — produces the identical false-null → *"No active
avatar"* failure. The 2026-07-23 outage exposed a defect the rollback did not cure; it only removed
one way of triggering it.

This is **recorded, not fixed** (§9 forbids touching `heygen-worker`). It is a **named precondition**
on any future resolver lane and belongs in the design of record. Alongside it, the `exec_sql`
string-interpolation injection shape remains **OPEN** and accepted-for-now (service-role only, not
anon-reachable) per `cc-0052` §9 — this brief does not reopen it and does not treat it as urgent.

**L2 — "strict parity" across execution paths is not a safe assumption.** Any future resolver work
must treat an `exec_sql` string join and a PostgREST embed on a non-`public` schema as *materially
different execution paths* and prove equivalence, never assert it.

**L3 — verify against a real live submit.** Applied to this lane in the evidence bar (§10): the
"nothing changed" claim is proven by an actual `video_short_avatar` submit, not by inspection.

**L5 — a pinned mechanism concentrates risk.** Applied structurally in §3.4.

### 6.1 Standing prohibition — typed-resolver refix

**No typed-resolver reattempt is authorised by this brief or by any lane it opens.** A future attempt
requires a **NEW brief under a NEW gate**, and:

- **must not inherit `cc-0052`'s pinned mechanism** — the query-builder implementation was pinned and
  the RPC de-scoped, which removed the fallback that would have avoided the outage. The RPC option
  must be live on the table.
- must check `error` on every query path, and treat a null result and an errored result as
  **distinct**, never collapsed.
- must prove its **contract and error behaviour** — including the behaviour on zero candidates, on a
  query error, and on a permission failure — before deploy.
- must include a **real live submit** in its acceptance evidence.
- must retain the current `exec_sql` path as a proven rollback until the replacement is proven live.

## 7. Scope

**In scope**

- Designate the brand host for **NDIS Yarns** and **Property Pulse** — the two clients with an active
  realistic avatar — as a declared, auditable, reversible fact.
- Choose the mechanism from §3.4 against properties P1–P5, at the implementation lane's own gate.
- Record the designation model, the ambiguity invariant (§4.2) and the §6 findings as the **design of
  record** for AGP v2 identity.
- Produce the result doc, including the honest non-claim in §13.1.

**Out of scope** (each its own future gate)

Making live selection read the designation (step B) · creating ambiguity / activating any second
avatar (step C) · the shadow soak · cutover · Branch B · persona/role work · `is_primary` (role-path)
designation · Invegent/CFW avatar onboarding · the `exec_sql` hardening · the shadow-table
`service_role` over-grant · repo migration-header doc hygiene.

## 8. Allowed actions

- Read-only DB verification via `python scripts/db-read.py` (R0 views) and `execute_sql` **SELECT-only**
  for `c.brand_avatar` / `c.brand_stakeholder` / `r.*` reads no view serves.
- Read-only repo/git inspection.
- Author **one** migration implementing the selected mechanism, plus its inverse rollback script.
- Run the T2 review chain (§10) and present at the PK gate.
- **On PK authorisation at that gate, and only then:** apply the migration.
- Verify post-apply state read-only; author the result doc.

## 9. Forbidden actions

- ⛔ **Any touch of `heygen-worker`** — no edit, deploy, flag, secret, or marker write in code. This
  prohibition lifts only under a new PK-approved implementation gate.
- ⛔ Any change to `is_active` on any `c.brand_avatar` row — **no second-avatar activation.**
- ⛔ Any `is_primary` write (role-path marker — different lane).
- ⛔ `AVATAR_SHADOW_TELEMETRY` flip · any shadow soak · Phase 3.3 activation (**BLOCKED**).
- ⛔ Cutover (**BLOCKED**) · Branch B (**NOT AUTHORISED**) · marker-driven or persona-driven live
  selection.
- ⛔ Any typed-resolver work (§6.1).
- ⛔ Repairing the persona outage — **named handoff**, not this scope.
- ⛔ Touching `cc-0048` / `cc-0049` image_quote incident lanes (owner S2). They share two affected
  client ids; findings must not be conflated.
- ⛔ Reintroducing `69541fd` in any form; it stays on `origin/claude/new-session-swx6cf` as evidence.
- ⛔ Ad-hoc DML (migration only) · register entries · push (orchestrator owns both).
- ⛔ Claiming any governance capability is gained (§13.1).

## 10. Tier, review chain, evidence bar

**Tier T2.** DML on a production table ⇒ ≥ T2 (`CLAUDE.md`). It is *not* T3: the write touches a
column provably unread by any live code path (census + repo grep, §2), performs no DDL, no
GRANT/REVOKE, no deploy, no caller change. **PK may elect T3;** de-escalation from T3 would require a
fresh Gate 1.

**Escalation to T3 is automatic if any of these become true:** the selected mechanism requires DDL
(mechanisms (b)/(c) in §3.4) · the migration touches any column other than the designation fact · any
`is_active` value would change · the lane acquires a `heygen-worker` change · pre-apply census does
not match the fingerprint below.

**Review chain (T2):** `db-rls-auditor` (subject is the DB) + `branch-warden` + external review
pinned to the migration hash + rollback written and validated before apply + PK gate.

**Pre-apply fingerprint — any mismatch is a hard STOP, not a reconciliation:**

| Check | Required value |
|---|---|
| active realistic avatars, NDIS Yarns | exactly 1 — `83ff167d-a844-4e1c-9d1a-d8ff257c11bc` |
| active realistic avatars, Property Pulse | exactly 1 — `d6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd` |
| Invegent / CFW avatars | 0 / 0 |
| rows with `is_default_host = true` | **0** |
| rows with `is_primary = true` | **0** |
| `r.avatar_resolution_shadow` row count | **0** (soak still off) |
| `heygen-worker` deployed version | `heygen-worker-v2.3.0`, fn 43, `verify_jwt = false` |

**Post-apply evidence bar:**

1. Exactly **2** rows carry the designation; **0** elsewhere; both partial unique indexes satisfied.
2. `is_active` values **unchanged** — verified by explicit before/after comparison, not by assumption.
3. No other column on any row changed.
4. **Live no-change proof (L3):** one real `video_short_avatar` submit completes after the apply and
   selects the *same* avatar as before, with `avatar_selected_by = 'fallback_limit1'` unchanged. A
   claim of "nothing changed" without a live submit is **not** acceptable evidence in this lane —
   that substitution is precisely what `cc-0052` made.
5. Rollback demonstrated to be executable (§11).

## 11. Rollback

Single inverse statement clearing the designation on exactly the affected rows; no data loss, since
the designation *is* the only fact written. Both partial unique indexes are satisfied by zero marked
rows (the current live state), so the rollback target is a state already proven to exist.

Because the designation is unread by live selection, **neither the apply nor the rollback can change
a rendered output** — the rollback is a governance correction, not an incident recovery.

⚠ **Validation caveat, stated honestly:** a dry-run cannot fully validate this write. ICE has already
been burned by reconcile dry-runs that skip the write, so FK/CHECK failures surface only at live
apply. The rollback is validated by being the exact inverse of a single-column update to a state that
currently exists — **not** by a dry-run that proves it.

## 12. What approval of this brief does NOT authorise

Step B (resolver reads designation) · step C (second-avatar activation / ambiguity) · the shadow soak
or `AVATAR_SHADOW_TELEMETRY` · cutover · Branch B · any `heygen-worker` change of any kind · any
typed-resolver reattempt · persona/role restoration · `is_primary` designation · Invegent or CFW
avatar onboarding · `exec_sql` hardening · shadow-table grant remediation · any register entry or
push. Each is its own Gate 1.

## 13. Open questions for PK

**Q1 — how is "deliberately no host" expressed?** (§3.3, property P5.) Invegent (no asset), CFW
(deferred) and "not yet designated" all read as `false`. `cc-0047` step 4 requires an explicit
governed `no-eligible-avatar` state. Options: accept the boolean for v0 and record the gap as a named
carry (cheapest, keeps this lane T2); or adopt mechanism (b)/(c) and escalate to T3. **PK decision —
this is a policy call, not a defect to fix.**

**Q2 — is the brand host one per brand, or one per brand per render_style?** The Character Model v0
says *"one host per brand is the ceiling for now"* (§2), but the applied index
`uq_brand_avatar_default_host_per_client_style` is `UNIQUE (client_id, render_style) WHERE
is_default_host` — i.e. the schema permits one realistic host **and** one animated host per brand.
These are different models. The schema is applied and the doc is not; the doc should not be assumed
to govern. **PK ruling needed** — it determines whether activating an animated host later is a
designation question or an ambiguity question (§4.1).

**Q3 — tier election.** T2 as argued in §10, or does PK elect T3 given the table sits in the live
selection path even though the column does not?

**Q4 — does the live-submit proof (§10, evidence item 4) require a fresh submit, or is the next
naturally-scheduled `video_short_avatar` draft acceptable?** A forced submit costs a HeyGen render;
waiting costs lane time. Recommend: accept the next natural submit, with the lane staying open until
it lands.

## 13.1 Required non-claim (must appear in the result doc)

> Completing this lane grants **no** governance capability. The designation is written and unread.
> Live selection remains the unordered `LIMIT 1` A2 pin. Nothing about avatar selection has become
> deterministic, governed, or safe. What has changed is that the brand's host is now a **declared
> fact** rather than an inference from `is_active` — the prerequisite for step B, and nothing more.

This paragraph is mandatory. ICE's named failure mode is a control declared, recorded, and scored
PASS while no production path reads it; this lane *deliberately* creates such a control, and must say
so in the same breath.

## 14. Named handoffs

- **Persona signal outage** — Stage-1 suggester produced 16 suggestions on 2026-06-15 then
  `no_persona_available` on 38 consecutive drafts. Not this lane. Blocks `cc-0047` step 2, not step 4.
- **`exec_sql` false-null defect (§6, L1)** — live in `heygen-worker` v2.3.0 today. Handoff to
  whichever lane next opens `heygen-worker` under a PK gate.
- **`exec_sql` injection shape** — OPEN, accepted-for-now, `cc-0052` §9.
- **`r.avatar_resolution_shadow` `service_role` UPDATE+DELETE over-grant** — separate safety
  follow-up; **must not be folded into any resolver slice** without a distinct PK scope ruling.
- **`db-rls-auditor` DB-tool/credential access gap** — `cc-0047` §6; may block the §10 review chain.
  Resolve before this lane's review, or name the substitution again.
- **Repo migration-header doc hygiene** — two applied AGP migrations still carry `NOT APPLIED`
  headers (`cc-0047` §4).

## 15. Success criteria

1. A single mechanism selected against P1–P5 with the rejection of the others reasoned, not asserted.
2. Pre-apply fingerprint (§10) matched exactly, or the lane STOPPED.
3. Migration + inverse rollback authored; T2 chain clean; external review pinned to the migration hash.
4. PK gate passed; apply performed by or under PK authorisation.
5. Post-apply evidence bar (§10) satisfied — **including the live submit**.
6. Result doc carries §13.1 verbatim, the §6 L1 finding, and Q1/Q2 as recorded carries or PK rulings.
7. Zero forbidden actions taken; `heygen-worker` untouched.

## 16. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Do not** proceed to step B, step C, the
soak, or any resolver work — each requires a fresh Gate 1.

**Stop immediately and surface to PK if:** the pre-apply fingerprint mismatches · a second active
avatar is discovered for any client+render_style · either partial unique index rejects the write ·
the mechanism requires touching any column beyond the designation fact · any review returns non-clean ·
the live submit selects a different avatar or a different `avatar_selected_by` · `heygen-worker`
deployed state differs from v2.3.0 / fn 43 / `verify_jwt = false`.

---

## Notes

**Why host designation leads.** It is the only AGP v2 step that is simultaneously *foundational* and
*zero-risk-to-production*. Steps 5–7 of `cc-0047`'s gate map all presuppose a declared host: ambiguity
is meaningless without a declared default to disambiguate *toward*, and the soak is uninformative
without ambiguity. Leading with it also inverts the failure pattern of `cc-0052`, which began with the
riskiest available step (a production resolver rewrite) before the governance it was meant to serve
existed.

**On the temptation to bundle.** Every subsequent step is more interesting than this one. A → B → C
in one lane would be faster and would be wrong: A is safe *because* it is inert, and bundling it with
B or C spends that safety for nothing.
