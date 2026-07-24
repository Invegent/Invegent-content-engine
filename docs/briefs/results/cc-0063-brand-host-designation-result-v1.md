# Result cc-0063 — Brand Host Designation v0 (M2)

**Status:** `APPLIED — HOLDING OPEN for the natural live-submit proof` · **not closed**
**Lane classification (CCF-02):** SAFETY_GATE · T2 · **first real production mutation on the board**
**Applied:** 2026-07-24 at the T2 PK gate, own change window (cc-0073 held by S5; S3 alone)
**Packet (FROZEN):** `docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md` (`adf6276e…`)
**Review record:** `docs/briefs/cc-0063-review-record-v1.md` (`5ee6c901` escalation + apply gate §8)
**Parent:** `cc-0047` Part-3 step 4 · **Refuted sibling:** `cc-0052`

---

## 🔒 Verbatim rulings — never paraphrase

> **Designation is NOT governed selection capability.**
>
> **No second avatar may be activated until the live resolver consumes designation, or an equivalent
> database-enforced ambiguity guard exists.**

## Mandatory non-claim — verbatim (PK-ratified)

> Completing this lane grants **no** governance capability. The designation is written and unread.
> Live selection remains the unordered `LIMIT 1` A2 pin. Nothing about avatar selection has become
> deterministic, governed, or safe. What has changed is that the brand's host is now a **declared
> fact** rather than an inference from `is_active` — the prerequisite for step B, and nothing more.

---

## 1. What was applied

One designation-only migration, `mcp__supabase__apply_migration`, project `mbkmaxqhsohbtwsqolns`,
returned `{"success": true}`. Set `c.brand_avatar.is_default_host = true` on exactly two rows.
Nothing else.

## 2. Version — RECORD, not rename (rename-or-record decision)

**`apply_migration` minted its own wall-clock version, as expected** (memory: it stamps its own,
ignoring the filename).

| | Value |
|---|---|
| Repo filename version | `20260724120000` |
| **Applied ledger version** | **`20260724043508`** |
| Migration name (identical both sides) | `cc0063_brand_host_designation_v1` |

**Decision: RECORD, do not rename.** The repo filename stays `20260724120000`; the divergence from
the applied `20260724043508` is recorded here. The repo `.sql` header still reads `⛔ DESIGN — NOT
APPLIED` — **that header is now stale and must be reconciled** (it joins `cc-0047` §4's two other
applied-but-header-says-NOT-APPLIED migrations). Reconciliation is a **docs correction for S4/PK**,
not a rewrite of the applied migration.

## 3. Two-changed-cells diff — verified post-apply, read-only

| Check | Value | Verdict |
|---|---|---|
| designated total (`is_default_host`) | **0 → 2** | ✅ exactly two cells flipped false→true |
| ndis-yarns `83ff167d…` | `active=true dflt=true prim=false` | ✅ designated |
| property-pulse `d6c422fb…` | `active=true dflt=true prim=false` | ✅ designated |
| active total (`is_active IS TRUE`) | **2 → 2** | ✅ untouched |
| `is_primary` total | **0 → 0** | ✅ untouched |
| total rows | 28 | ✅ unchanged |
| designated NOT active-realistic | 0 | ✅ invariant holds |
| duplicate (client, render_style) groups | 0 | ✅ index guarantee holds |
| `r.avatar_resolution_shadow` rows | **0** | ✅ no soak started |

**Exactly two cells changed, both `is_default_host` false→true. `is_active` and `is_primary`
untouched.** The migration's own three in-transaction guards also passed (the apply would have
aborted otherwise — non-idempotent by design).

## 4. Pre-apply gate — all clear at base `043c394` (fetched 2026-07-24T04:33Z)

Stale-ref gate PASS (0 ahead / 0 behind) · hashes `adf6276e`/`6321c50f`/`6f60194d` matched ·
live fingerprint 13/13 · `apply_migration` allow/not-denied on the `mcp__supabase__` alias ·
**no live EF consumes `is_default_host`** (repo grep NONE) · 2 active by both predicates, 0
designated, nothing mid-activation. Full detail: review record §8.

## 5. heygen-worker fence — held

Verified live pre-apply: fn **43**, `verify_jwt=false`, ACTIVE, drift A-LE clean (2.3.0==2.3.0).
Untouched by this lane. D5 (`cc-0078`, the discarded-`error` defect at `index.ts:92`) not touched.

## 6. Carries (unchanged, still open)

- **C-1** (Q1) — the boolean cannot distinguish "deliberately no host" / "not yet designated" / "no
  asset exists." Invegent + CFW read `false` identically. `cc-0047` step-4's governed
  `no-eligible-avatar` requirement is **carried, lands on step B**.
- **C-2** — the A→B→C invariant has **ZERO database enforcement**; `public.assign_brand_avatar`
  (dashboard SECDEF) sets `is_active=true` unconditionally — a one-click path to step C. PK ruling:
  **no second avatar until the live resolver consumes designation or a DB-enforced ambiguity guard
  exists.** Dashboard-side gap routed to S1. Lands on step B.
- **C-3** — no triggers on `c.brand_avatar`, so `updated_at` not bumped; no actor identity in ICE.
  The migration + commit + PK gate are the entire audit trail.

## 7. Lane state — HELD OPEN

**Not closed.** The last acceptance item is the **live no-change proof**: the **next
naturally-scheduled** `video_short_avatar` submit must select the same avatar with
`avatar_selected_by='fallback_limit1'` unchanged. **No submit is manufactured** (Q4). The lane stays
open until that draft lands.

**STOP condition if the proof fails:** a different avatar or a different `avatar_selected_by` on the
next submit → rollback available at `20260724120100_cc0063_brand_host_designation_rollback_v1.sql`
(`6f60194d…`), which returns to the now-proven pre-apply state (0 designated rows).

## 8. Not done, correctly

No push (S4 records the applied-version reconciliation; push is PK's) · no register version cut ·
no second host · no soak · no `AVATAR_SHADOW_TELEMETRY` · no cutover · no `heygen-worker`/`ai-worker`
change · `cc-0078` inactive · cc-0073 not interleaved (separate window).
