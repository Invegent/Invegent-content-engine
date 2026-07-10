# TMR D6 — Corrected PP-Hardcoded Chokepoint Census v1

**Status:** DRAFT — read-only evidence, nothing applied. **Prepared as input to:** the record-reconciliation lane (`register-reconciler`, TMR Fixups).
**Date:** 2026-07-10 · **Repo state:** re-anchored to HEAD **`2d8b092`** (originally scanned at `8199153`) · **Method:** comment-stripped, test-file-excluded scan of the four governed workers for the token set `{property-pulse, propertypulse, property_pulse, PROPERTY NEWS, 4036a6b5-…}`.

> **This document does not amend the accepted DoD.** It supplies the reconciler with the true baseline so the register does not record the smaller number. Recording, and any DoD amendment, stay PK-gated.

## Re-scan at current HEAD (2026-07-10, addressing the "Census NOT adopted" objection)

The reconciliation lane declined these totals on the grounds that the draft self-anchored at HEAD `8199153`, three commits behind, and required *"a comment-stripped, test-excluded static re-scan at current HEAD before any total becomes the D6 baseline."* That objection was correct as to provenance. It is now discharged.

**Re-scan executed at HEAD `2d8b092`. Result: identical — 30 literal lines, 8 files.**

| file | literal lines |
|---|---|
| `image-worker/creative_contract.ts` | 10 |
| `ai-worker/creative_contract.ts` | 10 |
| `image-worker/b1_production.ts` | 2 |
| `image-worker/branch_b_proof.ts` | 2 |
| `image-worker/contract_validation.ts` | 2 |
| `video-worker/b1_video_stat.ts` | 2 |
| `video-worker/index.ts` | 1 |
| `video-worker/voice_id.ts` | 1 |
| **total** | **30** |

Independently: `git diff --name-only 8199153..2d8b092 -- supabase/functions/` returns **empty**. No worker source changed across those three commits, so the original scan was never stale in substance — only its anchor label was. Both scans are reproducible with the command recorded in this lane's transcript.

Note the 30 lines span the eight `.ts` files above; **unit 5 (the sole declarative registry `property-pulse.json`) is a structural unit, not a literal line**, which is why 8 units and 8 files coincide numerically without being the same set.

---

## Why this exists

The accepted DoD records D6 — a **hard gate** — as:

> *today: audit named **5**; Spine Gen v1 closed **1**; the video-worker lane **added 2** — [b1_video_stat.ts:32](../../supabase/functions/video-worker/b1_video_stat.ts:32), [index.ts:981](../../supabase/functions/video-worker/index.ts:981) — **net 6, unrecorded***

The count is low, and the two cited sites are not the full addition. D6's own wording is *"every PP identity literal in the governed worker path is register-recorded and trending to 0"* — a gate that cannot function against an undercounted baseline, because a lane could remove one literal, add two elsewhere, and still appear to trend down.

**Corrected position: 8 open units across 8 files, 30 literal lines. Not 6.**

---

## The census

Units are de-hardcoding units (what one fix would close), not raw line counts.

| # | Unit | File(s) | Lines | Status | In DoD? |
|---|---|---|---|---|---|
| 1 | Governed image gate keyed on PP UUID | `image-worker/b1_production.ts` | 28, 69 | **OPEN** | ✅ audit #1 |
| 2 | `B1_GOVERNED_CLIENT_SLUG` fed to `select_template` | `image-worker/b1_production.ts` | 33 | **OPEN** | ✅ audit #2 |
| 3 | Capability-contract resolver + frozen PP contract, **duplicated byte-for-byte** | `image-worker/creative_contract.ts`, `ai-worker/creative_contract.ts` | 125,126,128,129,131,135,161,163,193,215 **in each** | **OPEN** | ✅ audit #3 |
| 3b | Contract-identity expectations (warn-only; same unit as 3) | `image-worker/contract_validation.ts` | 10, 11 | **OPEN** | ⚠️ implied, never enumerated |
| 4 | Drift probe PP lock | `tmr-drift-probe/` | — | ✅ **CLOSED** (Spine Gen v1) | ✅ audit #4 |
| 5 | Sole declarative registry `property-pulse.json` | `docs/creative-library/` | — | **OPEN** | ✅ audit #5 |
| 6 | **Brand-visible card literals** — `category: 'PROPERTY NEWS'`, `footer: 'propertypulse.com.au'` | `image-worker/branch_b_proof.ts` | 50, 55 | **OPEN** | 🔴 **UNRECORDED** |
| 7 | Video governed-client UUID **+ contract_ref** | `video-worker/b1_video_stat.ts` | 32, **62** | **OPEN** | ⚠️ line 32 only |
| 8 | Video governed slug literal | `video-worker/index.ts` | 981 | **OPEN** | ✅ |
| 9 | **Voice-map keyed on PP UUID** | `video-worker/voice_id.ts` | 23 | **OPEN** | 🔴 **UNRECORDED** |

Unit 4 is the only closure. Units 1–3, 5–9 are open. (Numbering keeps the audit's 1–5 stable; 6–9 are additions.)

## Delta against the DoD's recorded figure

| | DoD | Corrected |
|---|---|---|
| Named at audit | 5 | 5 |
| Closed by Spine Gen v1 | 1 | 1 |
| Added by the video lane | 2 | **3** (`b1_video_stat.ts:62` and `voice_id.ts:23` also PP-keyed) |
| Never named by any lane | 0 | **1** (`branch_b_proof.ts:50,55` — predates the video lane; missed by the original audit) |
| **Net open units** | **6** | **8** |
| Files carrying PP literals | 2 cited | **8** |
| Raw literal lines | not tracked | **30** |

## The finding that matters most

**Unit 6 is not like the others.** Units 1, 2, 7, 8, 9 are *gates and identities* — if they misfire, a render fails closed or routes to legacy. Unit 6 is **brand-visible payload**: `buildProofFieldsFromDraft` hardcodes `category: 'PROPERTY NEWS'` and `footer: 'propertypulse.com.au'`, and those strings are consumed on the live governed path at [`index.ts:662`](../../supabase/functions/image-worker/index.ts:662) and written straight into the Creatomate `modifications`.

Consequence: a second brand can pass every gate, produce `image_status='rendered'`, stamp clean `render_spec.tmr` evidence with `selector_status='ok'`, and publish a card that says **PROPERTY NEWS** and **propertypulse.com.au**. It fails no assertion that exists today.

This is why D7's pass condition must assert on the emitted `modifications` payload, not on render status — see [`tmr-d7-second-brand-exit-test-v1.md`](tmr-d7-second-brand-exit-test-v1.md) §2.

## Also worth the reconciler's attention

- **Units 1 and 2 must be fixed atomically.** Lifting the gate (1) without making the slug (2) data-driven does not fail closed — it resolves the second brand's draft against **PP's** templates, logo and backgrounds. A staged fix is strictly worse than the status quo.
- **`TMR_WINNER_TEXT_FIELDS`** ([`b1_production.ts:152`](../../supabase/functions/image-worker/b1_production.ts:152)) was classified "PP-hardcoded but acceptable" because it is template-keyed, not client-keyed. That holds **only while every governed brand binds the same generic card.** It is a conditional pass, not a permanent one; it should carry that condition in the register rather than sitting in the "acceptable" bucket unqualified.
- **The duplicated `creative_contract.ts`** (unit 3) is two files that must not drift. Nothing enforces byte-parity today.

## Boundaries

Read-only: repo reads and SELECT-only queries. No file in `supabase/functions/**` was modified. No register edited, no entry cut, nothing committed or staged. The reconciler owns the register entry and its own PK gate; this document is evidence, not a record.
