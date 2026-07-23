# Result cc-0048 — Image Worker Creative-Contract Registry Recovery (Care For Welfare + Invegent)

**Status:** `DEPLOYED · CFW RECOVERED · INVEGENT UNBLOCKED VIA SUCCESSOR cc-0049 · NO-REGRESSION PROOF PARTIAL`
**Lane classification (CCF-02):** SAFETY_GATE / production incident · T2 build · T3 deploy
**Recorded:** 2026-07-24 (retrospective — governance recovery lane)
**Brief:** `docs/briefs/cc-0048-image-worker-creative-contract-registry-recovery-brief.md` (rev-2)
**Canonical ID:** `cc-0048` RETAINED — see §7 and the collision ledger in
`docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.

> ⚠ **This is a RETROSPECTIVE record.** The work was built, gated and deployed on 2026-07-22; the
> result doc and register pointer were never written at the time. This document reconstructs the
> lane from authoritative evidence only (git, live Edge Function bundle, live DB). Where a step
> cannot be evidenced from those sources it is marked **UNRECONSTRUCTABLE** in §6 rather than
> inferred. Nothing here is a fresh approval, and nothing here was mutated to produce it.

---

## 1. What was wrong

`image_quote` renders were failing fail-closed for two clients with
`error_message = 'brand_payload_contract_unresolved'`.

`supabase/functions/image-worker/creative_contract.ts` held `CREATIVE_CONTRACT_REGISTRY` — a
hardcoded in-module map keyed `${client_id}::${recommended_format}` containing **exactly two
entries**: Property Pulse (`4036a6b5-…`) and NDIS Yarns (`fb98a472-…`). `resolveCreativeContract()`
returned null for any other client, and the v3.28.0 fail-closed guard threw.

**Why it started 2026-07-20:** the cc-0044 Checkpoint-D lane onboarded Invegent through governed
DATA. The moment those clients produced approved `image_quote` drafts, every render hit the missing
registry entry. **cc-0044's "zero client code" onboarding claim does not hold for the image render
path** — it still required a per-client entry in worker code. This is the
`declared-control-not-consulted` family: governed data meeting a hardcoded client gate.

Observed failure volume (live `m.post_render_log`, read 2026-07-24):
`care-for-welfare-pty-ltd` **202** failed `image_quote` renders through 2026-07-22T06:30:06Z;
`invegent` **148** failed through 2026-07-23T03:30:14Z. Property Pulse and NDIS Yarns unaffected.

## 2. What shipped

**Commit `5a6c998`** — `fix(cc-0048): restore image_quote for Care For Welfare + Invegent — add
missing creative-contract registry entries (image-worker v3.32.0)`, authored 2026-07-22T06:41:26Z
(2026-07-22 16:41:26 +1000), on `origin/main`.

- Added contract entries for CFW and Invegent to **both vendored `creative_contract.ts` copies**
  (a parity test deep-equals them).
- **PK-authored brand values** (verbatim, not derived): CFW `category='CARE UPDATE'` /
  `footer='Care For Welfare'`; Invegent `category='AI & AUTOMATION'` / `footer='Invegent'`.
- `index.ts` VERSION bump v3.31.0 → v3.32.0 — **mandatory**, because the drift gate hashes only
  `index.ts`; without it the change stays A-LE and `safe-deploy.sh` blocks.
- ai-worker parity edit shipped **UNDEPLOYED** (carry F-A).

**Deployment:** image-worker deployed to project `mbkmaxqhsohbtwsqolns`. Live unauthenticated
`GET /functions/v1/image-worker` returned HTTP 200 with `image-worker-v3.32.0`, which simultaneously
proved the new bundle was live and that `verify_jwt` remained `false` (the 401→502 guard).

## 3. Outcome — status by client

| Client | Status | Evidence |
|---|---|---|
| care-for-welfare-pty-ltd | **RECOVERED** | `brand_payload_contract_unresolved` count → 0 post-deploy. Governed TMR evidence on the recovered renders: `selector_status=ok`, assignment `60e43a0e…`, winner `generic_market_insight_card_1x1_v1`, storage output present. |
| invegent | **NOT recovered by this lane** | Unblocked the contract guard, then hit a **second, independent defect the first one masked**: `tmr_winner_unmapped: generic_quote_card_1x1_v1`. Successor lane **cc-0049**. |
| property-pulse / ndis-yarns | Unaffected | Not in the failing cohort. |

**Why Invegent still failed:** `TMR_WINNER_TEXT_FIELDS` in `image-worker/b1_production.ts` mapped
only certain winners — including `generic_market_insight_card_1x1_v1`, which is exactly why CFW
worked and Invegent did not. Invegent's governed winner is the quote card → hard fail-closed
("never guess a layout"). Correctly **not** patched in this lane: it needs per-template text-element
names and a geometry check, which is cc-0049's scope.

**Rollback was deliberately NOT taken:** rollback would have re-broken CFW and would not have helped
Invegent.

## 4. Verification chain (as recorded in the lane's build artifacts)

- Tests **167 passed / 0 failed** across both worker suites, including the vendored-copy parity test,
  plus 7 new cc-0048 tests.
- `branch-warden` **safe** (9/9).
- External review **agree/proceed**, `ee197f92-746a-40df-8a54-a78f728be22d`, pinned to diff sha256
  `22b8cea9abd7cc665697ca11e763c275fcc2f49fd1b3fcc5c79064ac378f540c`.
- `db-rls-auditor` **N/A — named omission** (zero DB change).
- Deno tests require `--allow-read --allow-net --allow-env` or they false-fail on permissions.

## 5. Live re-verification performed by this recovery lane (2026-07-24, read-only)

The deployed bundle was re-read from the live Edge Function and grepped for change-specific markers
(the bundles-from-CWD "old code shipped" guard). Superseded by cc-0049's v3.33.0, so v3.32.0 itself
is no longer live; the cc-0048 payload is confirmed **carried forward intact**:

| Marker | Deployed bundle |
|---|---|
| `CFW_IMAGE_QUOTE_NEWS_CARD_V1` | **PRESENT** |
| `image-worker-v3.32.0` (stale string) | **ABSENT** (correctly superseded) |

Live drift (`ice_ro.deploy_drift_status`, checked 2026-07-23T17:00:06Z): `image-worker` class
**A-LE**, direction **clean**, `deploy_version = repo_version = 3.33.0`.

## 6. Governance gaps — NOT reconstructable

1. **No PK-acceptance artifact for the deploy.** The deploy demonstrably happened, but no record
   captures the PK gate-2 authorization phrase, its timestamp, or the exact command run. Recorded as
   **DEPLOYED**, never as **PK-ACCEPTED**.
2. **No result doc or register pointer existed** until this retrospective — the defect this lane
   exists to fix.
3. **Carry F-A (ai-worker parity edit, undeployed)** — no evidence found either way as to whether it
   has since been deployed. Left OPEN.
4. **Carry F-C (`RENDER_ATTEMPT_CAP=5` unreachable)** — recorded in the brief, **not fixed**.
   `pipeline-fixer` FIX 2 filters `updated_at < now()-120min`, but every failed render refreshes
   `updated_at`, so a draft failing every ~15 min is never a candidate and is neither reset nor
   dead-lettered. Same family as the cc-0040 headline-gate loop. **Still open.**

## 7. Canonical-ID note

A parallel session independently issued a *different* `cc-0048` — "HeyGen avatar typed-resolver" —
on `origin/claude/new-session-swx6cf` (brief `191db5f`, 2026-07-23T01:26:46Z; branch register
**v6.12**). **This lane retains `cc-0048`**: `5a6c998` is the earliest committed claim by ~19 hours
and was already an ancestor in the branch's own history. The HeyGen lane is renumbered **cc-0052**.

## 8. Status vocabulary applied

`PLANNED` no · `DEPLOYED` **yes** (image-worker v3.32.0, superseded by v3.33.0) ·
`ROLLED_BACK` no · `RECOVERED` **yes, CFW only** · `PROVEN` **no** (see cc-0049 §5 for the
no-regression matrix) · `PK-ACCEPTED` **no artifact found**.
