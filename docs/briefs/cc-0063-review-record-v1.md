# cc-0063 — Review Record & Handoff Manifest (companion to the frozen Gate-1 packet)

**Created:** 2026-07-24 Sydney · **Author:** Claude Code — S3 (AGP Identity)
**Status:** `open` — this file is the **mutable** companion. The packet is **frozen**.
**Companion to:** `docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md` (FROZEN)

> **Why this file exists.** The packet moved 328 → 298 → 439 → 487 lines across recording passes, and
> a recording lane's no-drift guard correctly refused a commit whose index held content it had never
> read. Every correction landing *in* the packet also invalidated every review pinned to the packet's
> hash — a loop that cannot terminate. **This file breaks the loop:** the packet is frozen at one
> hash, and all later evidence, re-reviews and corrections land here instead. The packet is never
> edited again.

---

## 1. FROZEN ARTIFACT MANIFEST

| # | Path | sha256 | bytes | Status |
|---|---|---|---|---|
| 1 | `docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md` | `adf6276ecef4542ea828f9f4c8a4d38a490cf9d65a617133b48aa70eafcc5482` | 33647 | **FROZEN** |
| 2 | `supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql` | `6321c50f156530236316e999318de9fae4ad0018ebed244c0873d851a5dee224` | 6107 | **FROZEN** |
| 3 | `supabase/migrations/20260724120100_cc0063_brand_host_designation_rollback_v1.sql` | `6f60194d0ca489738b5f157211318becb5476e7b7c79b5c81206e7a4fd26404a` | 2852 | **FROZEN** |

**Hash-equality proof (chain step 5).** The packet's §13.1 pins the migration and rollback to
`6321c50f…` and `6f60194d…`. Recomputed after the freeze: **identical**. They also match the control
tower's independent preservation copy **exactly**, both hash and byte count. **The packet references
these exact artifacts — no drift, in either direction.**

**Nothing else belongs to this lane.** Any other file in the shared checkout is another owner's.

## 2. Freeze report (chain steps 1–4)

| Step | Outcome |
|---|---|
| 1 — Freeze the packet | ✅ **Done.** One final edit added a FROZEN banner naming this file as the sole channel for later evidence. **487 → 494 lines, then stopped.** No further edit will be made. |
| 2 — Track the two SQL files | ⚠ **Not staged by me — deliberately. See §5.** |
| 3 — Fix the missing §13.8 reference | ✅ **No fix needed — §13.8 already exists** at line 441 (`### 13.8 External review (chain item 5)`), and §13.7's row 5 references it correctly. The report of a dangling reference was taken from a snapshot captured *before* §13.8 was appended. Verified by direct read, not assumed. |
| 4 — Generate exact hashes | ✅ §1 above. |

## 3. Review chain — validity after the freeze

| Review | Pinned to | Still valid? |
|---|---|---|
| `db-rls-auditor` — verdict `concerns`, **no DB defect** | the two **SQL** hashes | ✅ **VALID.** Both SQL files are byte-unchanged. It was never pinned to the packet. |
| External review #1 `ec18e549-551e-4c99-8f2d-0c43b890d4e4` — `partial`, `apply_corrected`, **no escalation** | packet `b9346b55…` | ❌ **VOID** — superseded by the freeze. |
| External review #2 `5ee6c901-8324-46d8-bcc3-89ce872caf71` — `partial`, **ESCALATED** | packet `adf6276e…` + both SQL hashes | ✅ **CURRENT** — pinned to the frozen artifacts. |

## 4. 🔴 External re-review #2 — ESCALATED TO PK

**Review id `5ee6c901-8324-46d8-bcc3-89ce872caf71`** · verdict **`partial`** · risk **medium** ·
confidence **high** · routing **`escalate_explicit_flag`** · **`escalate: true`** ·
**`requires_pk_escalation: true`**.

> Bridge escalation reason, verbatim: *"Operational risks associated with potential SQL execution and
> residual risks that may not be fully addressed by documentation changes alone."*

**⚠ This is a CHANGE from review #1, which did NOT escalate.** Same artifacts, same SQL, stronger
routing. It must not be reported as "still partial, no defect" — **the bridge now demands a PK
decision.** Per the standing contract, bridge auto-escalation is a **hard stop → surface to PK**, and
this lane therefore does not reach apply on the strength of any review.

**It verified:** that the migration sets the marker on exactly the two named rows, and that the two
SQL files are byte-identical to what it reviewed before. **It found no concrete defect.**

**Its pushback — and the honest response:**

| Pushback | Response |
|---|---|
| *"Documentation cannot mitigate risks related to SQL execution."* | **Correct, and conceded.** Documentation discharged review #1's asks, which were themselves documentation asks. It does not reduce execution risk. Execution risk is bounded here by the three in-transaction guards and the fail-closed design — not by prose. |
| *"Residual risks (dormant functions, lack of database enforcement) need further attention despite documentation updates."* | **Correct on the substance.** The A→B→C invariant genuinely has **zero database enforcement** (carry C-2). PK has since ruled it a **hard step-C precondition** — no second avatar until the live resolver consumes governed designation or an equivalent DB-enforced guard exists — and routed the dashboard-side `assign_brand_avatar` gap to S1. **That is a governance control, not a database one.** The reviewer is right that the gap remains open; it is now owned and gated rather than closed. |

**Its three `unverified_claims` — all fair, and all structural:** the bridge has **no repo access and
no database access**. It cannot see the simulation output, the live NULL distribution, or the
flag-gate code. It is reviewing my prose about evidence, not the evidence. That is a limit of the
channel, **not a deficiency in the claims** — the underlying evidence is in packet §13.2/§13.3 and was
independently reproduced by `db-rls-auditor` against live state.

**Triage classification (CLAUDE.md):** `missing_evidence` (the bridge cannot see the evidence) +
`policy_decision` (whether documented-but-DB-unenforced residuals are acceptable at T2) +
`runtime_verification_required` (guard behaviour is an execution property). **NOT `concrete_defect`.
NOT `structural_DDL_DML_escalation`** — no DDL, no grant change.

**Routing:** `policy_decision` → **PK decision gate.** This is PK's call, not a defect to fix and not
something S3 may resolve by asserting the residuals are acceptable.

### 4.1 The decision PK now owns

**Is a designation write acceptable at T2 while the invariant it establishes has no database
enforcement?**

- **For proceeding:** the write is two cells in one column, read by no live code, fully reversible,
  guarded three ways, and validated positively *and* negatively. It cannot change a rendered output.
- **For holding:** the reviewer's point stands — the value of a declared host depends on a sequencing
  invariant that only governance, not the database, protects. C-2 is a real open hazard.
- **Note either way:** holding does **not** reduce risk to zero. The unenforced `assign_brand_avatar`
  path exists **today**, with or without this lane. Designation does not create that hazard; it makes
  its consequences legible.

## 5. ⚠ Chain step 2 — why I did NOT stage the SQL files

The directive says to track the two files. The shared-checkout protocol issued in the same message
says: **"the shared git index is not a handoff channel"**, *"S4 verifies hashes before staging"*, and
*"S4 must never stage a file while its owner is writing it."*

`git add` **is** staging. Staging into an index shared with S1, S4 and S5 — minutes after a protocol
was issued assigning staging to S4 after hash verification — would violate the newer, more specific
rule. **So I froze and manifested instead of staging, and I am flagging the conflict rather than
silently resolving it.**

**Current index state, verified:** all three artifacts are `??` — **untracked and unstaged**. The
earlier `AM` collision on the packet is gone; nothing of mine sits in the index. **The checkout is
clean for S4 to act on.**

**If the intent was that I run `git add`, say so and I will** — it is one command. I have not assumed
either way.

## 6. Handoff manifest for S4

**Verify before staging** — recompute all three hashes and compare to §1. **Any mismatch aborts the
pass; do not reconcile it silently.**

1. `docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md` — `adf6276e…` — 33647 B
2. `supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql` — `6321c50f…` — 6107 B
3. `supabase/migrations/20260724120100_cc0063_brand_host_designation_rollback_v1.sql` — `6f60194d…` — 2852 B
4. `docs/briefs/cc-0063-review-record-v1.md` — this file (hash it at staging time; it is the mutable
   companion and is expected to move — **the packet is not**)

**Both SQL files must land in the same commit as the packet.** A packet pinning hashes to untracked
files would pin its review chain to artifacts nobody else can see.

**S3 is not writing any of files 1–3 again.** File 4 moves only if PK rules or new evidence lands.

## 7. Where the lane stands

**Complete:** freeze · hash equality · full T2 review chain · guard validation (positive **and**
negative) · rollback fidelity · permission re-verification.

**Blocking apply — two gates, both PK's:**
1. **The `5ee6c901` escalation** (§4.1) — a `policy_decision` PK must rule on.
2. **The T2 apply gate itself** — unchanged, and never delegated.

**Not run, correctly:** `branch-warden` (belongs at the commit/apply gate, not here) · the apply ·
the live-submit proof, which by Q4 **waits for a natural production event** and is never manufactured.

**Unchanged prohibitions:** no apply · no `heygen-worker` or `ai-worker` change · no deploy · no
typed-resolver restart · no second-host activation · no soak · `cc-0078` reserved and inactive · no
commit, register version, or push.

**The mandatory non-claim still governs the eventual result doc:** completing this lane grants **no**
governance capability — the designation is written and unread.

---

## 8. 🚪 THE APPLY GATE — cc-0063 (one decision, nothing re-argued)

**Prepared:** 2026-07-24T03:37Z · **Status:** awaiting PK · **Nothing has been applied.**

> Everything architectural is CLOSED by PK ruling: T2 accepted · a dark designation write acceptable
> in principle · no second avatar may be activated · the designation must not be represented as
> governed selection capability (the mandatory non-claim, now a PK ruling, verbatim). **This section
> re-argues none of it.** It is the pre-apply evidence and the one command.

### 8.1 Stale-ref gate — **PASS**

| | |
|---|---|
| Fetch | `git fetch --prune --all`, **2026-07-24T03:37:18Z** |
| Remote | `origin` → `https://github.com/Invegent/Invegent-content-engine.git` |
| Fetched upstream SHA | **`ce3e4b8cfd65951e1719e936aa5b12d77b6573d4`** |
| Local `HEAD` | **`ce3e4b8cfd65951e1719e936aa5b12d77b6573d4`** — identical |
| Branch | `main` |
| Divergence | **0 ahead / 0 behind** |

**Base is at the fetched upstream. Not stale. No divergence to describe.**

### 8.2 Artifact integrity — **PASS, zero drift**

Re-hashed after the freeze; unchanged, and matching the control tower's independent preservation copy:

| Path | sha256 | bytes |
|---|---|---|
| packet (FROZEN) | `adf6276ecef4542ea828f9f4c8a4d38a490cf9d65a617133b48aa70eafcc5482` | 33647 |
| forward migration | `6321c50f156530236316e999318de9fae4ad0018ebed244c0873d851a5dee224` | 6107 |
| rollback migration | `6f60194d0ca489738b5f157211318becb5476e7b7c79b5c81206e7a4fd26404a` | 2852 |

### 8.3 Permission re-verification — **PASS** (re-read live, not carried forward)

| Tool | Posture |
|---|---|
| `mcp__supabase__apply_migration` | **allow**, absent from deny → **available** |
| `apply_migration` on the `39a0f413…` alias | **not in allow** → do not use that alias |
| `deploy_edge_function` — all three aliases | **DENY** (deny overrides the stray allow entry) |
| `Bash(supabase functions deploy:*)`, `Bash(npx supabase functions deploy:*)` | **DENY** |

Unchanged from the earlier reading. The stale-but-once-true memory (deny-listed on 2026-07-20) remains
stale. **Re-verify once more at the moment of apply — in either direction.**

### 8.4 Live-state fingerprint — **PASS, 13/13**

Read-only, `mbkmaxqhsohbtwsqolns`, 2026-07-24:

| # | Check | Required | Actual |
|---|---|---|---|
| 01 | `c.brand_avatar` total rows | 28 | **28** ✅ |
| 02 | rows with `is_default_host` | 0 | **0** ✅ |
| 03 | rows with `is_primary` | 0 | **0** ✅ |
| 04 | active (`IS TRUE`) | 2 | **2** ✅ |
| 05 | active (`= true`) | 2 | **2** ✅ |
| 06 | `is_active` NULL rows | 0 | **0** ✅ |
| 07 | `83ff167d…` ndis-yarns active realistic | 1 | **1** ✅ |
| 08 | `d6c422fb…` property-pulse active realistic | 1 | **1** ✅ |
| 09 | Invegent + CFW avatars | 0 | **0** ✅ |
| 10 | `r.avatar_resolution_shadow` rows | 0 | **0** ✅ |
| 11 | default-host index definition | byte-exact | **exact match** ✅ |
| 12 | `uq_brand_avatar_primary_per_role_style` present | 1 | **1** ✅ |
| 13 | `cc0063` already in applied ledger | 0 | **0** ✅ |

Checks 04–06 together re-prove the `IS TRUE` / `= true` equivalence on live data. Newest applied
ledger version is `20260723035423`, so both filename versions sort after it (informational).

### 8.5 `heygen-worker` fence — **PASS, verified live**

| Check | Required | Actual |
|---|---|---|
| deployed function version | 43 | **43** ✅ |
| `verify_jwt` | false | **false** ✅ |
| status | ACTIVE | **ACTIVE** ✅ |
| deploy vs repo version | 2.3.0 == 2.3.0 | **2.3.0 == 2.3.0**, drift class **A-LE clean**, normalised hashes identical ✅ |

Function version and `verify_jwt` read **live** from the platform; the drift row corroborates
(last checked 2026-07-23T17:00:06Z — stale by design, so the live read is the authority).
**No deploy has occurred. The fence held.**

### 8.6 The decision

**Approve, or withhold, the apply of ONE migration** —
`supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql` at sha256 `6321c50f…` —
via `mcp__supabase__apply_migration`, setting `c.brand_avatar.is_default_host = true` on exactly two
rows (`83ff167d…` ndis-yarns/realistic, `d6c422fb…` property-pulse/realistic).

**That is the whole decision.** Nothing else is requested and nothing else is authorised by it.

**Blocked on, and not S3's to discharge:** conditions **2** (both SQL files tracked) and **5** (S4
records the immutable set). Per the orchestrator's resolution, **S3 does not stage; S4 stages from
the §1 manifest after verifying every hash itself.** Both SQL files must land in the **same commit**
as the packet.

### 8.7 On apply — the sequence, and where it stops

1. Re-run §8.3 permission check and §8.4 fingerprint **immediately before** apply. **Any mismatch is a
   STOP, not a reconciliation.**
2. Apply the forward migration via `mcp__supabase__apply_migration`.
3. Record the **minted** version — `apply_migration` stamps its own wall-clock version and ignores the
   filename. **Decide rename-or-record before commit** and state which was chosen. Do not create a
   third migration whose repo file still reads `NOT APPLIED`.
4. Post-apply read-only verification per packet §7: before/after snapshot of all 28 rows showing
   **exactly two changed cells**; `is_active` identical; both partial unique indexes satisfied;
   shadow table still 0 rows; `heygen-worker` still 43 / `verify_jwt=false`.
5. **The lane then STAYS OPEN** for the live no-change proof — the **next naturally-scheduled**
   `video_short_avatar` submit selecting the same avatar with `avatar_selected_by='fallback_limit1'`
   unchanged. **Per Q4 no submit is manufactured.**
6. Result doc carries the **mandatory non-claim verbatim** (now a PK ruling), plus carries **C-1**,
   **C-2** and **C-3**.

**Stops immediately, no exceptions:** fingerprint mismatch · guard raise · affected rows ≠ 2 · a third
changed cell · index rejection · a second active avatar found for any (client, render_style) ·
`heygen-worker` not at 43 / `verify_jwt=false` · the live submit selecting a different avatar or a
different `avatar_selected_by`.

**Not in this gate and not authorised by it:** step B · step C · the soak or
`AVATAR_SHADOW_TELEMETRY` · cutover · Branch B · any `heygen-worker` or `ai-worker` change ·
`cc-0078` · any typed-resolver work · persona repair · `is_primary` · Invegent/CFW onboarding · any
DDL · any grant change · any commit, register version, or push.
