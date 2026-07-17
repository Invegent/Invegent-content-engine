CLAIMED v5.61 · tmr-d6-chokepoint-inventory · main-checkout · PK-commit-gate · 2026-07-17T04:39Z

# TMR D6 — PP-Hardcoded Chokepoint Inventory v2 (DENOMINATOR OF RECORD)

**Status:** ✅ PK-RATIFIED baseline — supersedes `docs/briefs/tmr-d6-chokepoint-census-v1.md` (DRAFT).
**Lane:** D6 — PP-identity chokepoint inventory (a `pp-tmr-definition-of-done-v1.md` Ultimate hard gate).
**Repo state:** HEAD **`7a9d85d`** · three-worker source **byte-unchanged since `9a61bfc`** (`git diff --name-only 9a61bfc..7a9d85d -- supabase/functions/{image,video,ai}-worker` = empty), so every `file:line` below is current.
**Method:** read-only. Comment-stripped, test-excluded (`*_test.ts`) static scan of the three governed render workers + source-read of every gate/wiring site + independent `ice-architecture-cartographer` cross-check (verdict PASS) + `db-rls-auditor` live-truth confirmation (SELECT/RPC-read only). No code, DB, deploy, or register mutated by this lane.

> **This document IS D6's denominator of record.** It resolves the "undefined denominator" state recorded in the DoD (`pp-tmr-definition-of-done-v1.md` lines 168–180). The register cut recording it, and any DoD amendment, stay PK-gated. D6 remains an OPEN hard gate; this doc defines what it counts, it does not close it.

---

## 1. What PK ratified (2026-07-17)

1. **`brand-payload-hardcode` is a 4th hardcode class** (alongside identity-gate / format-hardcode / asset-hardcode). It is distinct because it fails **OPEN**: the other three mostly fail *closed* (route to legacy or throw); a brand-payload hardcode renders wrong-brand output that passes every existing assertion.
2. **The behavioural unit definition (the denominator).** A **de-hardcoding unit** exists wherever **production behaviour reads a hardcoded constant instead of the TMR / client spine** (the `select_template` / `resolve_slot_assets` RPCs or the `c.client_*` governance/brand tables). This is a *behavioural* test, deliberately **not** a brand-token match — because two token-invisible spine-bypasses (a generic template UUID, a format literal) would otherwise escape the gate (see §4, units D6-6/D6-8).
3. **The count of record: 9 de-hardcoding units · 30 literal lines · 8 files.**

## 2. The denominator — definitions

**(a) The governed-worker-path file set** = production (non-`*_test.ts`) modules in the three render workers `supabase/functions/{image-worker,video-worker,ai-worker}/` that participate in the governed render path. Explicitly **excluded from D6's three-worker scope** (real chokepoints, tracked as their own items — must not be silently absorbed or dropped):
- `supabase/functions/tmr-drift-probe/**` — the drift-probe PP-lock; **CLOSED by Spine Gen v1** (readiness-audit unit #4). A separate diagnostic EF, not a render worker.
- `docs/creative-library/property-pulse.json` — the sole declarative registry (readiness-audit unit #5); a registry-reconciliation item, not worker code.

**(b) A unit** = one logical de-hardcoding fix site where production behaviour reads a hardcoded PP identity / format / asset / brand-payload constant instead of the spine. Byte-identical duplicated code across files = **one** unit (all locations recorded). Comments and test files are never units. Supervised-smoke entrypoints are reported but **not** counted (non-production).

**Counts at HEAD `7a9d85d`:**
- **30 PP-brand literal lines / 8 files** — comment-stripped, test-excluded. (A 9th file, `image-worker/index.ts`, carries the PP UUID only inside a comment and is therefore excluded.) Reproduces the v1 census figure exactly; only the non-literal gate-*wiring* line numbers had drifted.
- **9 production de-hardcoding units** (7 live/warn-only · 2 on the now-armed video path). **2 of the 9 carry token-invisible literals** (a generic template UUID and a format string) that a brand-token scan structurally cannot see — this is why the ratified definition is behavioural.

## 3. The definitive chokepoint list (9 units)

Class: **IG** identity-gate · **FH** format-hardcode · **AH** asset-hardcode · **BP** brand-payload-hardcode.

| # | Unit | Class | Evidence (`file:line`) | Live status |
|---|---|---|---|---|
| **D6-1** | Image governed gate keyed on PP UUID — decides whether TMR runs at all; every non-PP client falls to legacy | IG | [`b1_production.ts:28`](../../supabase/functions/image-worker/b1_production.ts:28) const · [`:83`](../../supabase/functions/image-worker/b1_production.ts:83) fn · wired [`index.ts:793`](../../supabase/functions/image-worker/index.ts:793) | **LIVE** |
| **D6-2** | Governed slug `'property-pulse'` fed to the generic `select_template` + storage path | IG→FH/AH | [`b1_production.ts:33`](../../supabase/functions/image-worker/b1_production.ts:33) · wired [`index.ts:801`](../../supabase/functions/image-worker/index.ts:801) (RPC), [`:855`](../../supabase/functions/image-worker/index.ts:855) (path) | **LIVE** — fix atomically w/ D6-1 |
| **D6-3** | Capability-contract resolver + frozen `PP_IMAGE_QUOTE_NEWS_CARD_V1`, **byte-duplicated across 2 files** (nothing enforces parity) | IG (additive-metadata effect) | gate [`ai-worker/creative_contract.ts:215`](../../supabase/functions/ai-worker/creative_contract.ts:215) (+125,126,128,129,131,135,161,163,193) wired [`ai-worker/index.ts:993`](../../supabase/functions/ai-worker/index.ts:993) · byte-identical dup [`image-worker/creative_contract.ts`](../../supabase/functions/image-worker/creative_contract.ts:215) (same 10 lines; `resolveCreativeContract` unused in image-worker production) | **LIVE** (stamps `draft_format.contract` provenance only; no format/asset/render effect) |
| **D6-4** | Contract-identity validation expectations (warn-only) | IG | [`contract_validation.ts:10-11`](../../supabase/functions/image-worker/contract_validation.ts:10) wired [`index.ts:839`](../../supabase/functions/image-worker/index.ts:839) | **LIVE** (warn-only, never throws) |
| **D6-5** | **Brand-visible payload hardcode** — `category:'PROPERTY NEWS'`, `footer:'propertypulse.com.au'` written into the live render `modifications` | **BP** | [`branch_b_proof.ts:50`](../../supabase/functions/image-worker/branch_b_proof.ts:50), [`:55`](../../supabase/functions/image-worker/branch_b_proof.ts:55) → `buildProofFieldsFromDraft` wired [`index.ts:803`](../../supabase/functions/image-worker/index.ts:803) → mapped to `CategoryBadge.text`/`Footer.text` ([`b1_production.ts:182`](../../supabase/functions/image-worker/b1_production.ts:182)) | **LIVE — highest severity (fails OPEN)** |
| **D6-6** | Video governed gate: PP UUID + governed-format literal | IG+FH | [`b1_video_stat.ts:32`](../../supabase/functions/video-worker/b1_video_stat.ts:32) UUID · [`:36`](../../supabase/functions/video-worker/b1_video_stat.ts:36) format `'video_short_stat'` (**token-invisible**) · [`:74`](../../supabase/functions/video-worker/b1_video_stat.ts:74) fn · wired [`index.ts:982`](../../supabase/functions/video-worker/index.ts:982) | **ARMED** — see §4 (gov flag `enabled=true`) |
| **D6-7** | Video registry `contract_ref` literal | IG | [`b1_video_stat.ts:62`](../../supabase/functions/video-worker/b1_video_stat.ts:62) | **ARMED** |
| **D6-8** | Video **direct-bind provider template + baked PP background — spine BYPASS** | FH+AH | [`b1_video_stat.ts:52`](../../supabase/functions/video-worker/b1_video_stat.ts:52) (`c11bb8ab`, **token-invisible**) — NOT via `select_template`; background baked into the template ([`:78`](../../supabase/functions/video-worker/b1_video_stat.ts:78)) | **ARMED** — load-bearing (§4 Q2) |
| **D6-9** | Voice map keyed on PP UUID | AH | [`voice_id.ts:23`](../../supabase/functions/video-worker/voice_id.ts:23) → `getVoiceIdForDraft` | **LIVE** (2-client map; already the target shape) |
| *(smoke)* | Video smoke slug literal — **non-production, not counted** | IG | [`index.ts:1057`](../../supabase/functions/video-worker/index.ts:1057) `clientSlug:'property-pulse'` | SMOKE surface only |

**Files (8) carrying non-comment literals:** `image-worker/`{`b1_production.ts`, `branch_b_proof.ts`, `contract_validation.ts`, `creative_contract.ts`} · `video-worker/`{`b1_video_stat.ts`, `index.ts`(smoke), `voice_id.ts`} · `ai-worker/creative_contract.ts`.

**Architectural asymmetry (cartographer + auditor, concur):** the **image** path's format/asset selection already reads the TMR spine (`select_template` + `slot_resolution`) — only its *entry gate* (D6-1) and slug (D6-2) are PP literals. The **video** path does **not** read the spine at all: it direct-binds the template and bakes the background (D6-8). Closing D6-8 makes the video path converge on the image pattern.

## 4. Live-truth (db-rls-auditor, project `mbkmaxqhsohbtwsqolns`, SELECT/RPC-read only)

**Q1 — the "DARK" label was STALE. The governed video branch is ARMED at the governance gate.**
`c.client_creative_governance` for (PP, `video_short_stat`) has **`enabled = true`** (set 2026-07-10 04:25Z, `render_label='creative_library_video_stat_production'`), same as (PP, `image_quote`). The gate `isB1GovernedVideoStat(client_id, fmt) && isVideoGovernanceEnabled(...)` ([`index.ts:982`](../../supabase/functions/video-worker/index.ts:982)) is therefore satisfied for a PP `video_short_stat` draft → governed early-return, NOT legacy.

**This contradicts stale in-code comments the fix lane should correct:** [`index.ts:978`](../../supabase/functions/video-worker/index.ts:978) and [`b1_video_stat.ts:16`](../../supabase/functions/video-worker/b1_video_stat.ts:16) ("enabled=false today … branch does NOT fire") — both false as of the DB. **Caveat (not a DB fact, handoff):** whether the *deployed* video-worker binary carries the governed branch, and whether a live `m.post_render_log` governed video row exists, is outside SELECT scope — confirm deployed version + a live render row before recording the end-to-end path as "producing."

**Q2 — `select_template` fail-closes for `video_short_stat`: CONFIRMED (`fail_reason=format_unmapped`).** The D6-8 direct-bind is correctly load-bearing. But de-hardcoding it is blocked on **more than visual approval** — the registry mapping is *entirely absent*: no `creative_template_variant_candidate` row maps `format_key='video_short_stat'`; zero `creative_template_client_assignment` rows for any `output_type='video'`; provider template `c11bb8ab` sits at status `governance_reviewed`, not `production_proven`. To make the spine resolve `video_short_stat` needs (a) a variant-candidate mapping, (b) a PP client assignment reaching the selectable bar, and (c) provider status raised to `production_proven` / variant passing visual-approval proof.

## 5. Reconciliation to prior figures — "net 6" corrected

| Prior claim | Verdict at HEAD `7a9d85d` |
|---|---|
| Readiness audit named **5** | Confirmed — but only **3** are three-worker chokepoints (audit #1/#2/#3 = D6-1/D6-2/D6-3). #4 (drift-probe) and #5 (registry) are out of the render-worker scope. |
| Spine Gen v1 closed **1** | Confirmed — it closed **#4 (drift-probe)**, which is **out of the three-worker scope**. Spine Gen v1 closed **zero** three-worker chokepoints. The DoD's "5 − 1 = 4" silently mixes scopes. |
| Video lane added **2** (`b1_video_stat.ts:32`, `index.ts:981`) | **Undercount + drift.** In-scope brand-literal adds ≥3 (`b1_video_stat.ts:32`, `:62`, `voice_id.ts:23`) **plus 2 token-invisible** spine-bypass adds (`b1_video_stat.ts:52`, `:36`). `index.ts:981`→`1057` at HEAD and is the **smoke** surface, not the production gate (the gate is the function call at `:982`). |
| DoD **"net 6"** | **Corrected → 9 units · 30 literal lines · 8 files** (three-worker scope) + 2 out-of-scope items tracked separately. |

Supersedes: `tmr-d6-chokepoint-census-v1.md` (its 30/8 line figure is adopted; its unit total is refined to the ratified 9 and re-anchored to current HEAD).

## 6. Elimination plan per unit (feeds Spine Gen v2 — NOT implemented here; Spine Gen v2 is PK-held)

- **D6-1 + D6-2 (atomic).** Replace the `isB1GovernedImageQuote` boolean with a `c.client_creative_governance` lookup (the table the video gate already reads) and pass the **draft's resolved client slug** to `select_template`, not a constant. Staged (gate lifted, slug still PP) is *strictly worse* — it resolves a second brand's draft against PP's own templates/logo/backgrounds.
- **D6-3 / D6-4.** Replace the frozen single-client contract + UUID-keyed `resolveCreativeContract` with a per-client contract lookup from the same registry `select_template` reads; **de-duplicate** the two byte-identical `creative_contract.ts` files. Validation expectations become per-variant, sourced from the resolved contract.
- **D6-5 (brand-payload).** **Being fixed by a dedicated safety lane PK is opening — DO NOT fix here.** Target: `category` derives from the format taxonomy, `footer` from `c.client_brand_profile`, never hardcoded. Its exit condition must assert on the emitted `modifications` payload (see `tmr-d7-second-brand-exit-test-v1.md`), not on render status — otherwise a second brand publishes "PROPERTY NEWS / propertypulse.com.au" while passing every gate. Referenced here for completeness; owned by that lane.
- **D6-6 / D6-7.** Generalise the video gate's PP-UUID + format literal to the governance-table read it already partially does; `contract_ref` → per-client registry lookup.
- **D6-8.** Replace the `c11bb8ab` direct bind + baked background with `select_template` / `resolve_slot_assets` resolution (mirroring `buildTmrRenderPlan`). **Blocked** on the full registry mapping in §4 Q2 (variant candidate + client assignment + `production_proven`), not visual approval alone.
- **D6-9.** Move `VOICE_ENV_BY_CLIENT_ID` from code into a client voice-config table (0 rows fleet-wide today). Lowest urgency — already a data map, fails *closed*.

## 7. Open / unverified (handoffs — not closed by this read-only lane)

- **Deployed video-worker binary + a live governed video render row** — confirms whether the now-armed video path (D6-6/D6-7/D6-8) is end-to-end *producing*, not just gate-armed. `db-rls-auditor` established DB truth (flag on); deploy/runtime truth is a separate check.
- **Stale in-code "DARK" comments** ([`video-worker/index.ts:978`](../../supabase/functions/video-worker/index.ts:978), [`b1_video_stat.ts:14-17`](../../supabase/functions/video-worker/b1_video_stat.ts:14), [`:47-51`](../../supabase/functions/video-worker/b1_video_stat.ts:47)) and the memory note `video-tmr-first-proof-gate1` — all say `enabled=false`/dark; the DB says `enabled=true` since 2026-07-10. A comment/record-reconciliation item.

## 8. Boundaries honoured

Read-only throughout — repo reads + SELECT/RPC-reads only. No worker/DB/register/deploy change, no external-provider call, no render, no publish. D6-5 is referenced, not fixed (its safety lane owns it). Spine Gen v2 and second-client rollout stay PK-held. This document is D6's denominator of record; recording it in the register and amending the DoD stay PK-gated. **STOP: PK commit gate.**
