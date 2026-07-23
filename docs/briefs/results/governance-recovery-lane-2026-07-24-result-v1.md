# Result — Governance Recovery & Recording Lane (cc-0047 … cc-0052)

**Status:** `RECORDING COMPLETE · CANONICAL IDS ASSIGNED · TWO PRODUCTION LANES REMAIN UNPROVEN · ONE LANE ROLLED_BACK`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers only — zero production mutation)
**Date:** 2026-07-24 Sydney
**Executor:** Claude Code (orchestrator-direct) + PK gates
**Authorization:** PK directive 2026-07-24 — *"Proceed with the governance recovery and recording
lane first. Do not run Gate 1 on cc-0050, and do not deploy, apply, publish, manufacture operator
events, or mutate production."*

---

## 0. Why this lane exists

Three production-affecting lanes shipped code to `origin/main` — two of them deployed to live Edge
Functions — with **no brief under version control, no result document, and no register pointer**.
A fourth lane deployed a worker, caused an outage, and was rolled back, with its implementation
sitting on an unmerged branch. Concurrently, a parallel session claimed **two task IDs and two
register versions** that the main line was also using.

The governance chain was therefore not merely incomplete — it was **ambiguous**: `grep cc-0048`
returned two unrelated production lanes, and the next register version on main (`v6.11`) was already
taken on a branch.

**This lane mutated nothing.** All findings are recomputed from authoritative sources: `origin/*`
git refs, live Edge Function bundles, and live database reads.

---

## 1. Method — what counted as evidence

| Class | Source | Not accepted |
|---|---|---|
| Code identity | `origin/main` + all `origin/*` refs; commit hashes, authored timestamps, ancestry via `git merge-base --is-ancestor` | Register prose, memory files, session recollection |
| Deploy identity | `get_edge_function` deployed-bundle grep for change-specific markers; unauthenticated `GET` version probe; `ice_ro.deploy_drift_status` | The plan's *claimed* deployed version |
| Runtime truth | Live `m.post_render_log`, `m.post_draft`, `m.post_publish_queue`, `m.asset_gap_suggestion` | Inferred recovery from "the fix shipped" |

Read routing followed `CLAUDE.md` §Operator read path: `ice_ro` views via `scripts/db-read.py`
where a curated view served the read; `execute_sql` **SELECT-only** for `m.*`/`c.*` reads no view
covers. `db-rls-auditor` was **not** invoked — this lane makes no DB judgment and proposes no DB
change; the DB is evidence, not subject (CCF-02 R1 substitution, named here as required).

---

## 2. The two divergent lines

Both descend from the **same** commit — `194e43e` (register v6.10) — and diverged without either
side seeing the other.

```
194e43e  (v6.10, 2026-07-22T22:56Z)
   ├─ origin/main ──────────── e232607   cc-0049 image-worker v3.33.0   03:28Z 07-23
   └─ origin/claude/new-session-swx6cf
          198a841  cc-0047 AGP planning closed         00:52Z 07-23
          2c5a503  registers v6.11                     01:12Z 07-23
          191db5f  cc-0048 heygen typed-resolver brief 01:26Z 07-23
          af0d9b7  registers v6.12                     01:29Z 07-23
          69541fd  heygen-worker v2.4.0 implementation 04:30Z 07-23
```

The branch is **unmerged**. Its register entries v6.11 and v6.12 are therefore **claimed but not on
main** — which is why this lane's register entry is **v6.13**, not v6.11.

---

## 3. Canonical ID reconciliation ledger

**Rule applied (uniform, stated before use):** *the earliest **committed** claim on any `origin/*`
ref keeps the number; later or uncommitted claimants renumber.* This is `CLAUDE.md` CCF-02
§Parallel-session claims applied literally — a claim is made by a committed artifact, because
uncommitted local files are invisible to a parallel session and cannot be a claim.

| Canonical ID | Subject | Keeps / renumbered | Earliest committed claim | Alias trail |
|---|---|---|---|---|
| **cc-0047** | AGP v2 identity-resolution planning | **KEEPS** | `198a841` 2026-07-23T00:52:27Z (branch) | — |
| **cc-0048** | Image-worker creative-contract registry recovery | **KEEPS** | `5a6c998` 2026-07-22T06:41:26Z (main) | — |
| **cc-0049** | Invegent governed quote-card winner mapping | **KEEPS** (no collision) | `e232607` 2026-07-23T03:28:29Z (main) | — |
| **cc-0050** | *(AGP v2 planning duplicate)* | **RETIRED UNUSED** | never committed | was proposed for AGP v2 planning → superseded by canonical `cc-0047` |
| **cc-0051** | Governed execution-spine coverage & repairability classification | **RENUMBERED** ← was `cc-0047` | never committed (local 2026-07-22T05:18–05:29Z) | `cc-0047` → **`cc-0051`** |
| **cc-0052** | HeyGen avatar typed-resolver (exec_sql → query-builder) | **RENUMBERED** ← was `cc-0048` | `191db5f` 2026-07-23T01:26:46Z (branch) — 19h later than main's cc-0048 | `cc-0048` → **`cc-0052`** |

### 3.1 Decisive fact for the cc-0048 collision

`5a6c998` (main's cc-0048) is **an ancestor of the branch itself** — verified by
`git merge-base --is-ancestor 5a6c998 origin/claude/new-session-swx6cf` → true. The branch author's
own history already contained a commit using `cc-0048`. This is a genuine collision, not a
simultaneous-allocation race, and main's claim is unambiguous.

### 3.2 The one judgment call — flagged for PK reversal

**cc-0047 cuts the other way and is the weakest determination in this ledger.**

- The **branch** lane committed first (00:52Z 07-23) and is recorded **PK-ACCEPTED** at branch v6.11.
- The **main** lane's briefs were *authored earlier* (local mtimes 2026-07-22T05:18/05:29Z) but were
  **never committed**, so under the protocol they never claimed anything.

Protocol favours the branch; wall-clock authorship favours main. This lane applied the protocol and
renumbered the **uncommitted** lane, because that is the cheaper and less destructive correction — it
disturbs no accepted record and rewrites no history. **If PK prefers authorship time, the reversal is
mechanical**: rename the two `cc-0051-*` briefs back, and renumber the branch lane instead. Nothing
downstream depends on the choice — a repo-wide grep confirmed the two `cc-0051` briefs are referenced
**only by each other**.

### 3.3 Register version collision

Branch commits `2c5a503` and `af0d9b7` claimed **v6.11** and **v6.12** at 01:12Z / 01:29Z on
2026-07-23, both earlier than this lane. Main therefore **skips to v6.13**. Versions v6.11 and v6.12
are **reserved to the branch** and must not be reused on main; if the branch is ever merged its
entries land under those numbers unchanged.

### 3.4 Structural finding — the collisions are not bad luck

`cc-0046` already held **two** unrelated lanes (Dashboard Operator-Capability Arc at v6.07/v6.08;
Orthogonal Gap Classification at v6.06), a known and recorded collision. cc-0047 and cc-0048 are the
**second and third** occurrences, and register versions collided for the first time. There is no
allocation mechanism — IDs and register versions are chosen by reading the highest existing number in
a working tree, which is a **read-then-write race by construction** whenever two sessions run
concurrently. Handed to `register-reconciler` as an open item; the durable fix is a real allocator,
not more diligence.

---

## 4. Commits and deployments mapped to each canonical task

| Canonical | Commit(s) | On main? | Deployment | Live-verified state |
|---|---|---|---|---|
| **cc-0048** | `5a6c998` (image-worker v3.32.0) | ✅ yes | image-worker v3.32.0, 2026-07-22 | Superseded by v3.33.0; payload carried forward (`CFW_IMAGE_QUOTE_NEWS_CARD_V1` **PRESENT** in deployed bundle) |
| **cc-0049** | `e232607` (image-worker v3.33.0); build `e522e54` | ✅ yes | image-worker **fn version 101**, **2026-07-23T04:38:06Z**, `verify_jwt=false` | **DEPLOYED, content-verified** — all 6 cc-0049 markers PRESENT, stale `v3.32.0` string ABSENT, drift **A-LE clean**, deploy==repo 3.33.0 |
| **cc-0052** | `69541fd` (heygen-worker v2.4.0) | ❌ **branch only** | Deployed, then **ROLLED_BACK** | heygen-worker **fn version 43**, **2026-07-23T10:21:04Z**, `VERSION=heygen-worker-v2.3.0`, `verify_jwt=false` — deployed bundle re-read: `lookupAvatar` uses **`exec_sql`**, the `!inner` embed is **ABSENT** → **rollback content-PROVEN** |
| **cc-0047** | `198a841`, `2c5a503`, `191db5f`, `af0d9b7` | ❌ branch only | none (docs) | PK-ACCEPTED per branch v6.11; **not on main** |
| **cc-0051** | none | ❌ uncommitted | none | draft only |

### 4.1 The cc-0052 outage — reconstructed

**Change:** `lookupAvatar` was rewritten from a string-interpolated `exec_sql` inner-join to a
supabase-js query-builder embed
(`schema('c').from('brand_avatar').select('…, brand_stakeholder!…!inner(role_code)')`), claiming
strict behavioural parity, and destructuring **only `data`** — `error` was never checked.

**Root cause:** the **`c`-schema PostgREST `!inner` embed does not resolve via supabase-js at
runtime**; the query errors. Because only `data` was destructured, the error was **silently
swallowed** → `data` null → `lookupAvatar` returned null → the caller threw *"No active avatar"*.

**Proven a false negative, not a data change:** the SQL-equivalent inner-join still returns the NDIS
avatar, and every prior day's `exec_sql` path selected it.

**Live casualty evidence:** NDIS Yarns `video_short_avatar` draft moved to `video_status='failed'` at
**2026-07-23T09:30:04Z** — inside the window between the v2.4.0 deploy and the 10:21:04Z rollback.
This is the only avatar-draft state change in the window. Submit-phase failures are deliberately not
written to `m.post_render_log` (no `provider_job_id` yet), which is why the outage leaves **no render-log
row** — the absence is by design, not missing evidence.

**Rollback mechanics (sanctioned path):** CWD `heygen-worker` on `main` (`e232607`) was byte-identical
to the v2.3.0 `exec_sql` source → `scripts/safe-deploy.sh heygen-worker --allow-warn`. The gate first
read **stale A-LE** (drift last checked before the bad deploy) → BLOCK; a targeted
`drift-check?write=true&slug=heygen-worker` refresh reclassified **B-RR** (deployed ahead of repo) →
`--allow-warn` PASS → deploy → final refresh **A-LE clean**.

**Reusable lessons (three):** (1) a supabase-js query that destructures only `data` hides **all**
query errors as a false null — always check `error`; (2) "strict parity" between an `exec_sql` string
join and a query-builder `!inner` embed is **not** a safe assumption on non-`public` schemas;
(3) verify a resolver change against a real live submit, not against a claim.

### 4.2 ⚠ The gate that was crossed

Branch register **v6.12** (`af0d9b7`, 01:29Z) states in terms:

> *"The brief authorises **NO code, DB change, deployment, cutover or production-selection change** —
> issuance only… **Next gate: explicit PK authorisation to open the cc-0048 implementation lane.**"*

**Three hours later, `69541fd` implemented it, and it was deployed.** No artifact records the PK
authorization that the register itself declared to be the required next gate. Either the
authorization was given and never recorded, or the gate was crossed. **This lane cannot determine
which, and does not guess.** It is the single most serious governance finding in this recovery — see
§6.1.

---

## 5. Proof-complete vs proof-pending matrix

Deploy boundary for image-worker v3.33.0 = **2026-07-23T04:38:06Z**.

| Obligation | Class | State | Evidence / what is missing |
|---|---|---|---|
| image-worker v3.33.0 is the live bundle | deploy content | ✅ **PROVEN** | 6/6 markers present in deployed bundle; stale `v3.32.0` absent; bundles-from-CWD trap excluded |
| `verify_jwt` unchanged (401→502 guard) | deploy safety | ✅ **PROVEN** | `verify_jwt=false` on live fn 101 |
| Drift clean, deploy == repo | deploy hygiene | ✅ **PROVEN** | A-LE clean, 3.33.0 == 3.33.0, `state_changed=false` |
| CFW `image_quote` recovered | runtime | ✅ **PROVEN** | `brand_payload_contract_unresolved` → 0; render 2026-07-23T15:30:25Z `a17872dc-…` |
| Invegent `image_quote` recovered | runtime | ✅ **PROVEN** | `tmr_winner_unmapped` cleared; renders 05:15:17Z `654b7a6d-…`, 06:30:10Z `bc8e97ce-…` |
| NDIS post-deploy no-regression | runtime | ✅ **PROVEN** | render 2026-07-23T15:30:16Z `bb4be175-…`, post-boundary |
| **PP post-deploy no-regression** | runtime | 🔴 **PENDING** | **No PP `image_quote` render since 2026-07-23T02:15:16Z — pre-boundary.** All PP drafts already `generated`; awaits next natural slot fill. **Cannot be manufactured.** |
| **Invegent quote-card geometry / visual acceptance** | product | 🔴 **PENDING** | **No PK visual PASS exists.** `succeeded` ≠ correct layout — the market-insight geometry is explicitly non-portable and the commit names the first controlled render as the mandatory gate. Discharging it requires invoking `governed_image_quote_smoke` = controlled production event = **T3 PK gate. NOT INVOKED.** |
| heygen-worker rollback is live | deploy content | ✅ **PROVEN** | deployed bundle uses `exec_sql`; `!inner` embed absent; VERSION v2.3.0; fn 43 |
| cc-0052 forward fix | product | ⬜ **NOT STARTED** | Deliberately open; separate future gated lane |
| PK gate-2 authorization for either image-worker deploy | governance | 🔴 **UNRECONSTRUCTABLE** | §6.1 |
| PK authorization for the cc-0049 containment DML | governance | 🔴 **UNRECONSTRUCTABLE** | §6.2 |

**Recorded separately, as instructed: render success and geometry acceptance are different
obligations.** Three clients rendering successfully post-deploy proves the code path executes; it
does not prove the Invegent quote card looks right. **No PK visual PASS is claimed anywhere in this
recovery.**

---

## 6. Governance gaps that cannot honestly be reconstructed

1. **No PK gate-2 artifact for any of the three deploys** (image-worker v3.32.0, v3.33.0,
   heygen-worker v2.4.0). The deploys are evidenced beyond doubt; the authorizations are not
   evidenced at all. All three are recorded **DEPLOYED**, none **PK-ACCEPTED**. For cc-0052 this is
   sharpened by §4.2: the register entry itself declared PK authorization to be the required next
   gate, three hours before implementation.
2. **The cc-0049 containment DML has no authorization artifact.** Four Invegent `m.post_publish_queue`
   rows sit at `purged`, last updated 2026-07-23T06:19:19Z. The action is evidenced in live state;
   its gate is not. The packet that designed it is marked *"DRAFT — awaiting PK gate. Authorises
   nothing on its own."*
3. **No external-review id for the final `e232607` diff.** cc-0049's rev-2 raised STOP #3 *after* the
   recorded review, so any earlier approval is stale under `CLAUDE.md` §External review rules 1 and 4
   (`reviewed_input_hash` must match the current diff). Whether a fresh review ran is unknown.
4. **cc-0052's implementation is not on main** and its result was never recorded on any ref. The
   branch's own register stops at "queued"; it never records that the code shipped, broke production,
   or was rolled back. Reconstructed here.
5. **cc-0048 carry F-A** (ai-worker parity edit, shipped undeployed): no evidence either way as to
   whether it has since deployed. **Left OPEN, not assumed.**
6. **cc-0048 carry F-C** (`RENDER_ATTEMPT_CAP=5` unreachable — `pipeline-fixer` FIX 2 filters on
   `updated_at < now()-120min`, but each failed render refreshes `updated_at`, so a draft failing
   every ~15 min is never reset nor dead-lettered): recorded, **not fixed**, still open.

---

## 7. Unrelated open truths — preserved unchanged

Restated verbatim in intent so this lane cannot be read as having advanced or closed them:

- **Dashboard authenticated-approval proof remains PENDING a natural operator event.** Not
  manufactured. A draft was **not** approved to produce evidence.
- **Dashboard Batch 2 remains an integrity precondition to authorization enforcement.** While
  `app/api/onboarding/run-scans/route.ts:20` and `app/(dashboard)/actions/onboarding-scans.ts:75`
  remain unguarded, an adversary can write their own `administrator` row and spoof `auth.uid()` via
  `set_config` — so enforcement built on top of them enforces nothing. **Batch 2 before enforcement.**
- **AGP remains unadmitted and did not advance.** `cc-0050` was **not** gated; it is retired as a
  duplicate of canonical `cc-0047`. No AGP shadow soak, activation, marker designation, resolver
  replacement or cutover occurred. Phase 3.3 BLOCKED · cutover BLOCKED · Branch B NOT AUTHORISED —
  all unchanged.
- **Asset-gap remains complete-and-idle.** Live ledger re-read 2026-07-24: **8 rows — 4 resolved, 4
  open** (3 carousel `(assignment, unassigned)` → `config_repair`; 1 PP YouTube `(platform_config,
  misconfigured)` → `config_repair`); **zero rows route to `governed_sourcing`**. **The carousel
  tickets were NOT assigned.** Assigning them would auto-close the tickets while gaining zero
  capability — no `select_template` call site passes `carousel`, so carousel renders on the legacy
  ungoverned path. Untouched by design.

---

## 8. What this lane changed

**Files renamed** (untracked → canonical, with alias headers): `cc-0047-governed-execution-spine-coverage-brief.md`
→ `cc-0051-…`; `cc-0047-governed-assignment-repair-loop-brief.md` → `cc-0051-…`.

**Files created:** this document; `docs/briefs/results/cc-0048-image-worker-creative-contract-registry-recovery.md`;
`docs/briefs/results/cc-0049-invegent-quote-card-winner-mapping.md`.

**Files brought under version control:** the cc-0048, cc-0049 (+ sequence packet) and cc-0051 briefs,
each with a canonical-ID header.

**Left deliberately uncommitted:** `cc-0050-agp-v2-identity-resolution-planning-lane-brief.md`,
retained on disk for audit with a VOID header. Committing it would give a duplicate lane the
appearance of standing.

**Registers:** one Convention-1 pointer each in `docs/00_sync_state.md` and `docs/00_action_list.md`
at **v6.13** (v6.11/v6.12 reserved to the unmerged branch).

**Production mutations: 0.** No deploy, no migration, no DML, no publish, no approval, no flag change,
no branch mutation, no push.

---

## 9. Next single PK gate

> **Settle the `cc-0047` collision determination (§3.2), then choose whether to open the T3 gate for
> the Invegent quote-card geometry proof (§5, cc-0049 §5c).**

Everything else in this lane is recorded and needs no decision. The PP no-regression evidence
(§5) arrives on its own with the next natural PP render and requires no gate — only elapsed time.
