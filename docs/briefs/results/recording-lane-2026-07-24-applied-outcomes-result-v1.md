# Result — Recording Lane pass 5, 2026-07-24: cc-0063 APPLIED-version reconciliation + cc-0080/cc-0079 gate-1 briefs

**Status:** `RECORDING COMPLETE · ZERO PRODUCTION MUTATION BY THIS LANE · cc-0063 IS LIVE (applied by S3, recorded here) · cc-0073 IN-FLIGHT`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers only — this lane applies, deploys, mutates NOTHING)
**Date:** 2026-07-24 Sydney
**Executor:** Claude Code — session **S4 (Recording Lane)**, serialized recorder
**Register pointer:** **v6.18**, in `docs/00_sync_state.md` and `docs/00_action_list.md`
**Predecessors:** v6.14/v6.15 · v6.16 · v6.17 (`043c394`, pushed)

> **Two distinct verbs, kept separate.** cc-0063's migration was **applied to production by S3** at its
> own PK gate; this lane **records** that outcome (and reconciles its minted version) — it did not run
> the apply. Everything else here is a Gate-1 brief: **authored-only, not applied.**

---

## 0. Stale-ref gate — PASS

`git fetch --prune origin`; local `HEAD` = `origin/main` = `043c3946d3b7aa4b04a3d229816c53e52ff9d36f`,
parity 0/0, branch `main`. Base at upstream, not stale.

## 1. Independent verification

### 1a. Manifest hashes — recomputed here, all matched

| Artifact | Manifest sha256 | Recomputed |
|---|---|---|
| `cc-0080-publish-status-reconciliation-gate1-v1.md` | `afc33694…` | ✅ match |
| `cc-0079-schedule-format-authority-architecture-gate1-v1.md` | `e60f4b70…` | ✅ match |
| `cc-0079-linkedin-youtube-zero-publish-triage-v1.md` | `a8ab0119…` | ✅ match |
| `cc-0079-slice-1-aiworker-platform-blind-format-gate1-v1.md` | `cc171b78…` | ✅ match |
| `cc-0079-slice-2-format-mix-renormalization-gate1-v1.md` | `eefd2f4e…` | ✅ match |
| `results/cc-0063-brand-host-designation-result-v1.md` | *(no pinned hash)* | read in full |

### 1b. cc-0063 live-apply — independently confirmed against the database, not taken from the result doc

`execute_sql` (R1) against `mbkmaxqhsohbtwsqolns`, 2026-07-24:

| Check | Result |
|---|---|
| `supabase_migrations.schema_migrations` row `20260724043508` | **present**, name `cc0063_brand_host_designation_v1` |
| `c.brand_avatar` where `is_default_host` | **2** rows: `83ff167d…` (ndis-yarns) + `d6c422fb…` (property-pulse) |
| `c.brand_avatar` where `is_active IS TRUE` | **2** — untouched |

The applied state matches S3's result-doc claim exactly. (R0 cannot reach `supabase_migrations` —
42501 — so this used SELECT-only `execute_sql`, the expected R1 path for a non-view read.)

## 2. cc-0063 — APPLIED-version reconciliation (the [[apply-migration mints its own version]] gotcha)

**cc-0063's migration is LIVE. This is the board's first production mutation of this arc** — applied
by **S3** at the T2 PK gate in its own window (cc-0073 held separate). This lane records it.

**The version divergence, RECORDED not renamed:**

| | Value |
|---|---|
| Repo filename version | `20260724120000` (in `20260724120000_cc0063_brand_host_designation_v1.sql`) |
| **Applied ledger version** (minted by `apply_migration`) | **`20260724043508`** |
| Migration name (identical both sides) | `cc0063_brand_host_designation_v1` |

**Decision applied here: RECORD, do not rename.** The repo filename stays `20260724120000`; the
divergence from the applied `20260724043508` is documented in this result and the v6.18 pointer.

**⚠ The applied `.sql` file was NOT edited by this lane — deliberately, per PK ruling + cross-model
concurrence.** Its header still reads `⛔ DESIGN — NOT APPLIED`. **That header is now stale**, but
editing the file after apply would change its bytes and break the `6321c50f…` hash that the review
chain (db-rls-auditor, external review #2) and the v6.17 record pin to. The stale header is therefore
reconciled **by superseding evidence in the register**, not by an edit. **It joins `cc-0047` §4's two
other applied-but-header-says-NOT-APPLIED migrations** — the same known pattern, recorded, not
silently corrected.

**What the apply did and did not buy — verbatim, per the result doc and PK ruling:**

> Designation is NOT governed selection capability. No second avatar may be activated until the live
> resolver consumes designation, or an equivalent database-enforced ambiguity guard exists.

The mandatory non-claim stands: the designation is **written and unread**; live selection remains the
unordered `LIMIT 1` A2 pin. Carries C-1 (boolean cannot express "deliberately no host"), C-2 (the
A→B→C invariant has zero DB enforcement — `public.assign_brand_avatar` is a one-click path to step C,
routed to S1), and C-3 (no temporal trace / no actor identity) are open and land on step B.

**cc-0063 lane state: APPLIED but HELD OPEN** — the last acceptance item is the natural live-submit
proof (the next scheduled `video_short_avatar` submit must select the same avatar, `fallback_limit1`
unchanged). **No submit is manufactured.** Rollback available at `20260724120100…rollback_v1.sql`
(`6f60194d…`) to the now-proven pre-apply state (0 designated rows).

## 3. cc-0080 — Publish-Status Reconciliation Contract (Gate-1, T1, READ-ONLY)

Recorded as an **authored-only Gate-1 brief.** Diagnoses that `m.post_publish` is the single source
of publication truth while `m.post_draft.approval_status` and `m.post_publish_queue.status` reconcile
to it inconsistently per publish path — the defect behind the "153 drafts, 0 published" false-red.
Per-path writeback map: only Facebook, Instagram-happy and the **inactive** native LinkedIn publisher
reconcile `approval_status`; the two paths actually carrying LI/YT production
(`linkedin-zapier-publisher`, `youtube-publisher`) do not — one by omission, one by design. Recommends
**Option B (a governed read-of-truth/write-of-derived-status reconciliation sweep) first, Option A
(per-publisher writeback) as defense-in-depth**; notes the S6 dashboard three-state cell can ship
read-only with zero writes. **Authorises no status write, no sweep, no deploy.** Self-assigns register
block v6.90–99 (its own; not this registrar entry).

## 4. cc-0079 — Schedule → Format Authority (architecture + triage + two slice briefs, all Gate-1, authored-only)

Four briefs, recorded as authored, **none applied**:

- **Architecture (`e60f4b70…`)** — the schema gap (format mode is not representable below the client
  enrolment flag), the eight conflated format-authority concepts, and the recommended R3 governed
  resolver (sole writer of `recommended_format`, workers unchanged) + R4 target (`format_mode` +
  `requested_format` on the schedule). Records the **live production defect (§9)**: `slot.format_chosen`
  is read by no production worker; the Advisor's `recommended_format` is final by construction;
  **Fault A** (the default mix allocates platform-invalid formats — 25/50/65% on FB/IG/LI) and
  **Fault B** (the Advisor has unconstrained final authority — visible on YouTube where the mix is
  100% valid yet 4 `text` picks shipped unpublishable). Both required; the data fix is the larger win.
- **LI/YT zero-publish triage (`a8ab0119…`)** — **the premise is a measurement artifact; both
  platforms publish successfully** (LI 68, YT ~37/38 in `m.post_publish`; `approval_status='published'`
  = 0 all-time for both by omission/design). **No containment required for either.** Carries a separate
  28-draft LinkedIn dead-letter anomaly for its own lane.
- **Slice 1 (`cc171b78…`, T2 code)** — remove `ai-worker`'s two platform-blind `'text'` fallbacks
  (`:472`, `:427`) and fix the platform-blind preference read (`:437`); fail closed to a governed gap,
  never a synthetic format. Eliminates the YouTube-`text` class. **Not built, not deployed.**
- **Slice 2 (`eefd2f4e…`, T2 data-only)** — renormalize `t.platform_format_mix_default` against
  `platform_support`, preserving relative weighting; collapses IG/LI to 2 valid formats each (a
  `policy_decision` PK must ratify — the diversity was never publishable). Versioned supersede via
  `is_current`, reversible. **Not applied.**

## 5. cc-0073 — scrim remediation: IN-FLIGHT, OUTCOME PENDING

S5's T3 scrim apply is executing in a **separate window**. As of this commit, **S5 has not returned an
apply outcome to this recorder, and no PK visual PASS exists.** Per directive, cc-0073 is recorded as
**in-flight / apply outcome pending — NOT applied-and-proven.** This lane makes **no claim** about its
database state and does not probe it; its recording is a later pass, gated on S5's return **and** the
PK visual verdict (V3/L5), neither of which may be assumed.

## 6. What this lane changed

**Files created:** this document.

**Files brought under version control (6, all read + hash-verified):** the cc-0063 applied-lane result;
cc-0080; the cc-0079 architecture brief, LI/YT triage, Slice 1 and Slice 2.

**Files NOT edited, deliberately:** the applied `20260724120000_cc0063_…_v1.sql` (stale header
reconciled by superseding evidence, never by an edit — §2) · every committed record (no history
rewritten) · `cc-0050-*` (VOID) · the `.xlsx` · every other untracked path.

**Registers:** one Convention-1 pointer at **v6.18**. **Sequential registrar numbering, NOT a reserved
block** — v6.20–29 / v6.30–39 / v6.40–49 / v6.50–59 / v6.60–69 / v6.70–79 (cc-0078) / v6.90–99
(cc-0080's self-assigned block) all untouched; v6.20/v6.50/v6.70/v6.80 not taken. v6.14–v6.17 not
amended.

**Production mutations by this lane: 0.** No apply, migration run, DML, deploy, promotion, ledger
write, flag change, branch mutation, or push. The one production mutation referenced (cc-0063) was
S3's, at its own gate, and is recorded — not performed — here. `branch-warden` (authorized-main-docs)
ran before the commit with origin parity re-verified immediately beforehand.

## 7. Next gate

> **cc-0063:** no gate — HELD OPEN for the natural live-submit proof (elapsed time only). The stale
> `.sql` header is reconciled by this record; do not edit the applied file.
> **cc-0080 · cc-0079 (arch + 2 slices):** PK Gate-1 rulings, each on its own hash. Slice 2 is
> data-only and may precede Slice 1. cc-0080's sweep and the cc-0079 slices are separate future
> T2/T3 apply lanes.
> **cc-0073:** its apply outcome + PK visual PASS record in a later pass, once S5 returns.

**`cc-0078` remains reserved and inactive — its inventory has not begun. Push remains a PK hard stop.**
