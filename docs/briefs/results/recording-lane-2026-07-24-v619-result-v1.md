# Result — Recording Lane pass 6, 2026-07-24: cc-0073 PK-ACCEPTED, cc-0078 census, cc-0080 v2, three PK rulings

**Status:** `RECORDING COMPLETE · ZERO PRODUCTION MUTATION BY THIS LANE · cc-0073 APPLIED + PK-ACCEPTED · cc-0080 NOT APPLIED`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers/artifacts — applies nothing)
**Date:** 2026-07-24 Sydney
**Executor:** Claude Code — session **S4 (Recording Lane)**, serialized recorder
**Register pointer:** **v6.19** (sequential registrar, not a reserved block)
**Predecessors:** v6.14/v6.15 · v6.16 · v6.17 · v6.18 (`800a02e`, pushed)

> **Four states kept distinct throughout:** **APPLIED + PK-ACCEPTED** (cc-0073) · **APPLIED, held
> open** (cc-0063) · **AUTHORED ONLY, not applied** (cc-0078, cc-0080 v2, cc-0079 slices) ·
> **NEWLY OPENED** (cc-0081).

---

## 0. Stale-ref gate — PASS

`git fetch --prune origin`; local `HEAD` = `origin/main` = `800a02ecc07c2a41101134b776c3f412e586501b`,
parity 0/0, `main`.

## 1. Hash verification — recomputed independently, all matched

| Artifact | Manifest sha256 | Recomputed | bytes |
|---|---|---|---|
| `cc-0078-silent-db-failure-census-and-gate1-brief-v1.md` | `fac11aeb…` | ✅ | 16598 |
| `NOT_APPLIED_cc0080_reconcile_publish_status_v2.sql` | `d227fefc…` | ✅ | 20279 |
| `cc-0080-reconciler-gate1-proof-and-apply-packet-v2.md` | `41e790fb…` | ✅ | 9119 |
| `results/mcp-github-bridge-provenance-recovery-v1.md` | *(unpinned)* | read in full | 5688 |

**Superseded v1 artifacts verified present and untracked, hashes confirmed against the manifest:**
`NOT_APPLIED_cc0080_…_v1.sql` = `6949bb44…`, `cc-0080-…-apply-packet-v1.md` = `f6e22a7a…`. **They are
NOT committed by this lane and NOT deleted** — superseded is recorded, history is not rewritten. (The
separate `cc-0080-publish-status-reconciliation-gate1-v1.md`, committed at v6.18, is a *different*
document and is unaffected.)

## 2. cc-0073 — APPLIED and PK-ACCEPTED on the visual axis

### 2.1 The verdict — verbatim

> "yes the after image is more crisp."

### 2.2 Applied state — independently verified by this recorder, not taken on report

Live `execute_sql` against `mbkmaxqhsohbtwsqolns`, 2026-07-24:

| Check | Result |
|---|---|
| `c.shared_creative_asset` rows with `scrim_opacity_override = '62'` | **8 of 8** |
| Fractional/bad values (ST-9 guard: `^\s*[+-]?0?\.`, `< 1`, or non-string) | **0** |
| Rows with `is_active IS TRUE` | **1** — S8 / Invegent, confirming the live blast radius |

**Applied by direct `execute_sql` DML — no migration version was minted**, so this apply has no
`schema_migrations` row (unlike cc-0063). Recorded so no future reader looks for a ledger version that
does not exist.

**Live blast radius: Invegent / S8 only.** The other seven were corrected **while still fenced** —
fixed before promotion rather than shipped and repaired afterwards.

### 2.3 What the verdict does and does not cover — scoped honestly

**It is an acceptance of the rendered visual improvement.** It is **NOT**:

- a **promotion** — the seven fenced assets remain fenced; promotion stays a per-asset PK gate;
- **proof for the fenced seven** — they render nowhere, so nothing about them was visually proven;
- a **standing waiver** — it does not pre-approve future scrim changes, future renders, or any other
  asset or template.

The packets' own honest limit stands unchanged: **62 does not rescue S5 and S7** (busy foliage, bright
sky defeat a uniform scrim at any density) — the remediation restores a certified density, it does not
upgrade an asset. The residual gap to `quote_card`'s authored 72% is a recorded cc-0051 observation,
not closed.

### 2.4 ⚠ v6.18 said "in-flight / pending" — that was true at its commit time

**v6.18 is NOT amended.** It recorded cc-0073 as in-flight because, at that moment, S5 had not returned
and no visual verdict existed — an accurate statement of what was then known. The applied state and the
verdict are recorded **here, as the new entry**, per the standing no-history-rewrite rule. The accepted
mutation is therefore no longer shown anywhere as merely pending.

### 2.5 Still pending

**S5's cc-0073 result doc has not been frozen or handed over** — no path, no hash, and no such file
exists in the tree at commit time. Named as pending; **no hash was inferred and nothing was chased.**

## 3. cc-0078 — Silent Database-Failure Census (Gate-1, READ-ONLY, authored-only)

**The headline is bigger than the lane that opened it.**

- **11 sites, not 8.** `ai-worker` has **9** (not 8) — **`:404` uses double-quoted `"exec_sql"` and was
  invisible to a single-quote grep**; `heygen-worker` has **2** (`:92`, `:455`). **Zero of the eleven
  check `error`.**
- **🔴 The most dangerous sites are the COMPLIANCE loader, not the avatar.** `fetchComplianceBlock`
  (`:488`, `:501`, `:511`) **returns an empty string on any database error**, and the caller then
  generates content with **no compliance rules at all** — no HARD_BLOCK, no SOFT_WARN, no exception.
  For NDIS/health-adjacent content this is a **content-safety** consequence, **not a reliability one**.
- The enclosing `try/catch` blocks are **load-bearing in appearance only**: a discarded `error` never
  throws, so the `catch` never runs, and both paths converge on the same silent fallback.
- The pattern's true cost is **misattribution** — a DB failure is reported as a confident, specific,
  wrong business reason (`no_persona_available`, `no_active_brand_roles`, "No active avatar", or a
  silently empty compliance block).

**Evidence limit, recorded verbatim as instructed:** *"Only the `:92` case has a confirmed casualty
(`cc-0052`, 2026-07-23). The others are **latent by inspection** — and by construction they leave no
trace, so absence of evidence here is genuinely not evidence of absence."*

Recommends a **shared wrapper, not 11 hand-edits**, mechanism deliberately unpinned (cc-0052 L5),
staged S-1 (the CRITICAL four) → S-2 (avatar, own window, real live submit) → S-3 (advisory/shadow).
**T3 when implemented; this census authorises none of it.**

## 4. cc-0080 v2 — recorded as an EXPLICIT APPLY PRECONDITION (recording ≠ applying)

v2 supersedes v1 after independent review returned **`concerns` · 3 MUST-FIX**. Committing these two
files **closes MUST-FIX 2**: the SoD control cannot function while the artifact is an untracked
working-tree file, because the apply hand must be able to `git show <ref>:<path>` and hash **that**.
The packet states it plainly — *"No SoD apply may proceed until S4 has committed the artifact."*

**cc-0080 is NOT applied and is mid delta re-review.** Independently verified: **no `cc0080` /
`reconcile_publish` row exists in `supabase_migrations.schema_migrations`.** The filename is
deliberately not a valid timestamped migration name so no apply tool can sweep it up.

Recorded v2 substance: the ARMED pin is now a real hash (v1's was the literal placeholder
`<SEE FREEZE BLOCK …>`, so the abort-unless-hash step **could not execute** — the control PK added was
documentary, not operative); queue and slot predicates converted from **deny-lists to allow-lists**
(the author records having reintroduced the same anti-pattern at the slot surface and correcting it —
755 → 752); rollback made complete across all six trigger-cleared columns; owner-only by design (no
`service_role` grant). Disclosed forward coupling, not fixed: both LinkedIn publishers gate on
`approval_status !== 'approved'` and do not accept `'published'`, so post-apply re-queues soft-fail and
burn queue ticks.

## 5. PK rulings recorded

### 5.1 MCP-github-bridge write authority — AUTHORIZED, Option A, by exact enumeration

**Recorded as the enumeration, deliberately not as the phrase "all three actions"** — that phrasing was
ambiguous and was explicitly disambiguated:

- **Read:** `get_file_contents` · `list_directory` · `list_recent_commits`
- **Write:** `create_or_update_file` · `push_files`
- **Repositories:** `Invegent-content-engine` · `invegent-dashboard` · `invegent-portal`

New lane **`cc-0081`** opened in **S8**, register block **v7.00–v7.09**.

### 5.2 Compliance FAILS CLOSED on database error — three-state contract

| State | Behaviour |
|---|---|
| `error` | **fail closed** — abort generation |
| `configured-empty` | proceed, **recorded** |
| `rules-loaded` | normal |

**The availability trade is explicitly accepted by PK**: this will surface as failed jobs where today
there are silently-unconstrained drafts. That is the intended direction — generating without compliance
rules is worse than not generating.

### 5.3 `ai-worker` implementation ownership → S3 (cc-0078); cc-0079 Slice 1 ABSORBED

**Reason, recorded so no future lane re-splits it:** `:404` error-discard → `:427` text-only palette →
`:472` coercion is **one causal chain**, and one writer must fix and test it. **S7 retains Slice 2**
(the data-only format-mix renormalization) and becomes **reviewer / domain input** on the absorbed work.

## 6. The provenance record — recorded as an INPUT, explicitly UNREVIEWED

`docs/briefs/results/mcp-github-bridge-provenance-recovery-v1.md` is committed **flagged**:

> **UNREVIEWED — control-tower-authored, no independent verification. S8 / `cc-0081` is verifying it
> independently. It is an input, not a finding.**

Its substance: the deployed `mcp-github-bridge` is **v3.0.0 with write tools, while the repo holds
v2.0.0 with none**, and the v3.0.0 source exists on **no git ref** — deployed ~10 days after the last
commit to that path and never committed. The record itself argues the severity is **"unversioned, not
rogue"** and that no exploitation is claimed or evidenced. **This recording neither endorses nor
disputes that assessment** — it is recorded pending S8's independent verification.

## 7. What this lane changed

**Files created:** this document.

**Files brought under version control (4, all read in full + hash-verified):** the cc-0078 census; the
cc-0080 v2 migration SQL and v2 apply packet; the provenance record.

**Files NOT committed, deliberately:** cc-0080 v1 SQL + v1 apply packet (superseded, retained
untracked, hashes recorded) · the applied cc-0063 migration (untouched, byte-frozen) · `cc-0050-*`
(VOID) · the `.xlsx` · every other untracked path. **v6.18 and all earlier entries not amended.**

**Production mutations by this lane: 0.** No apply, migration run, DML, deploy, promotion, ledger
write, flag change, branch mutation, or push. The two production mutations *referenced* (cc-0063,
cc-0073) were their owners', at their own gates, and are recorded — not performed — here.

## 8. Next gate

> **cc-0073:** visual axis CLOSED (PK-ACCEPTED). S5's result doc still to be frozen and recorded.
> **cc-0063:** no gate — APPLIED, HELD OPEN for the natural live-submit proof (elapsed time only).
> **cc-0080:** the tracking precondition is now closed by this commit; apply remains hard-blocked on
> PK's apply gate + the SoD hand + completion of the delta re-review.
> **cc-0078:** PK Gate 1 (incl. Q1 one-lane-or-split, Q2 fail-closed **already ruled**, Q3/Q4 scope).
> **cc-0079:** Slice 2 with S7; Slice 1 now absorbed into cc-0078 under S3.
> **cc-0081:** newly opened in S8 (block v7.00–v7.09).

**Push remains a PK hard stop.**
