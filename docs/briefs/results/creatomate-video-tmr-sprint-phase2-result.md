# Result — Creatomate Video TMR Sprint · Phase 2 (M1: dark V3/V4/V5 + governance seed APPLIED · M2: V1 provider-template registered)

**Created:** 2026-07-09 Sydney · **Tier:** T3 · **Label:** PRODUCT_PROOF
**Brief:** `docs/briefs/creatomate-video-tmr-sprint-phase2-packet-v2.md` (PK Gate 1 approved 2026-07-09)
**Status:** ✅ Milestone 1 (dark authoring + governance seed) PUSHED to origin. ✅ **Milestone 2 (V1 provider-template register) APPLIED to prod + PUSHED** (register v5.41, commits `ec0cff1` + `47bb3f5`, pushed to origin 2026-07-09 `eb50f56..47bb3f5` parity 0/0 — the parallel-session music-harvester commit `e4e4078` PK-authorised at the same push-safety gate). The lane continues (V2 governed worker branch · one render-and-inspect · flip `enabled=true`) at later gates.

---

## Milestone 2 — V1 provider-template register (APPLIED 2026-07-09, register v5.41)

Registered the governed `vid_market_stat_reveal` Creatomate **video** provider template — provider-template-bound (D1a), still-image Ken-Burns (D2 baked), 0.55 scrim, `output_type=video`, 9:16, 12s.

- **Template authored by PK** in the Creatomate editor from the spec `_harness/video_tmr/vid_market_stat_reveal_v1_provider_template_source.json`; **verified in-account via read-only API GET** (key out-of-transcript): id `901a30ce-292a-4e4f-8e46-fef93f71e098`, name `vid_market_stat_reveal_v1`, mp4/12s/30fps, **Background baked** (not dynamic), source `Perth_CBD_Suburbs.jpg` (`bg_perth_cbd`), scrim `rgba(18,25,50,0.55)`, **5 dynamic fields** (Logo, StatValue, StatLabel, ContextLine, CtaText).
- **DB:** one additive INSERT into `c.creative_provider_template` — `provider_template_name=video_stat_reveal_9x16_v1`, family `c0b10001-…-001` (property-pulse-news), scope=client PP, `output_type=video`, mp4, 1080×1920/9:16, `duration_seconds=12`, `status=governance_reviewed`. **Applied** via PK-authorised temporary `apply_migration` deny-lift (guard restored byte-exact, settings sha `6a698857…`), **prod ledger `20260709055112`** (migration file committed to match).
- **Declarative v0.7→v0.8:** `provider_template_id` pinned at the variant + capability contract; `provider_status` pending_authoring→registered; `motion.duration_seconds` reconciled 20→12 (matches the verified template).
- **Review chain:** db-rls-auditor **pass** zero-must-fix · creative-graph-auditor **PASS** · external **partial→PK** (generic "verify legacy first" caution, **no concrete defect**, medium/high) on reviewed sha256 `c1cd5f8e`.
- **Post-apply proof GREEN (inertness verified):** exactly **1 row** inserted; **17 static_image rows untouched**; `select_template` image_quote winner **UNCHANGED** (fb+ig `48cba556…` / generic_market_insight_card); `select_template` `video_short_stat` **still `fail_closed`/`format_unmapped`** — the new `governance_reviewed` row is **not selectable** (concretely answering the external caution). Legacy inline video path + live image spine byte-untouched.
- **Still dark / NOT done:** no worker deploy, no render, no `enabled=true` flip, no publish. `provider_status=registered` ≠ proven (proof is the render gate).

---

**Status (M1):** ✅ Milestone 1 complete — the first governed video slice authored + landed on `main` and its DARK governance hook LIVE (`enabled=false`). **PUSHED to origin 2026-07-09** (fast-forward `43358ff..345f1ca`, parity 0/0) after a push-safety gate where PK explicitly authorised the 3 register-entangled prior-session Music Library commits alongside the 4 TMR commits.

## What this milestone did

Landed the held dark V3/V4/V5 authoring for the first governed PP video slice (`video_short_stat` / `vid_market_stat_reveal`) and applied its additive DARK governance-seed row. Behaviour-preserving: no runtime consumer reads the declarative registry, and the seed row is `enabled=false` (the drift probe does not check it yet).

## Gate-1 rulings (PK, 2026-07-09) — pinned in the brief

- **Roster:** `vid_market_stat_reveal` LOCKED as the first governed video proof.
- **D1 = (a) provider-template-bound.**
- **D2 = still-image Ken-Burns NOW** (design source `_harness/video_tmr/video_premium_market_v4.json`, governed 17-pool still + **0.55** scrim; background **baked** into the provider template, logo the only governed asset; footage = a later background swap, B-roll stays a separate lane).
- **D4 = render-and-inspect only** (no live/unlisted YouTube publish this gate).
- Scrim authoritative: `market_v4` 0.55 / `footage_v2` 0.60 (the older 0.52 DECISION_PREP value retired).

## Evidence chain (all clean, pinned to reviewed diff `478533087eb456bd…`)

| Gate | Verdict |
|---|---|
| creative-graph-auditor | **PASS** (keys unique · refs + back-reference symmetry resolve · evidence-shape ok · runtime-import guard intact) |
| db-rls-auditor | **pass**, zero must-fix (live: `creative_provider_template` 17/17 static_image, no video row; governance table pre-apply = 1 row; migration correctly dark, INSERT-only, ON CONFLICT target valid, naming sound) |
| branch-warden | **concerns→handled** (HEAD stable · held authoring isolated/uncommitted · commit path-scoped; no CE-anchor drift) |
| JSON.parse | valid (registry `v0.7`) |
| external review (`ask_chatgpt_review`) | **agree · low · high**, no pushback, no escalation |

## What landed

- **Declarative v0.7** (`docs/creative-library/property-pulse.json` + `registry-schema-v2.md`): new variant `stat-reveal-9x16-video-v1` (9:16 mp4, `provider_template_id='PENDING_CREATOMATE_AUTHORING'`, unproven/governance_candidate) + new capability contract `property_pulse.video_short_stat.market_stat.v1` (4 ai-authored text fields + governed logo + NEW `motion` field-class) + `pp_stat_card_v1` back-reference symmetry. Cosmetic fixes folded in: packet refs → `-v2`, design-source → `video_premium_market_v4.json`, D2=baked recorded.
- **Governance seed migration** `20260709010032_seed_client_creative_governance_video_short_stat_v1.sql`: one idempotent additive INSERT (`PP × video_short_stat`, `enabled=false`, `ON CONFLICT (client_id, format) DO NOTHING`). No DDL, no grant.

## Production apply

- **Applied** via `mcp__supabase__apply_migration` under a **PK-authorised temporary `apply_migration` deny-lift** (only the two `apply_migration` deny entries removed; all `deploy_edge_function` / functions-deploy / merge / force-push denies left intact; guard **restored byte-exact** from backup immediately after apply — settings sha `dd6cddfe…` verified identical before and after).
- **Ledger version `20260709010032`** (server-UTC 2026-07-09T01:00:32Z); repo file renamed from the placeholder `20260708000000` prefix to match — repo↔prod reconciled (mirrors the Music Library v0 apply).
- **Post-apply proof GREEN:** `c.client_creative_governance` now **2 rows** — `(PP, image_quote, enabled=true)` untouched + new `(PP, video_short_stat, enabled=false)` with the exact `contract_ref`. Security advisor: **no new ERROR/WARN** (INSERT-only introduces zero advisors; the table still carries only the intended INFO `rls_enabled_no_policy` deny-all; the project's 3 ERROR / 186 WARN are the pre-existing baseline).

## Commits on `main` (PUSHED to origin 2026-07-09, ff `43358ff..345f1ca`, parity 0/0)

- `b59db96` — docs: register v5.39 (Gate-1 approval pointer)
- `c6d68cd` — feat(creative-library): v0.7 dark video authoring
- `4f20d56` — chore(migrations): reconcile seed filename to applied ledger `20260709010032`
- (+ this result doc + v5.40 register pointer, docs commit)

All commits **path-scoped** — the two pre-session staged `tmr-readiness-workbook…` files were never swept in (branch-warden hazard respected) and were NOT pushed (still uncommitted locally). Push-safety gate (2026-07-09): origin/main confirmed unmoved at `43358ff`; branch-warden R4 STOP flagged the 3 register-entangled Music Library commits as another session's unpushed work; PK explicitly authorised all 7; fast-forward push, parity 0/0.

## Governance note — hard-stop hole found (hardening carry)

The `apply_migration` deny-list covers `mcp__claude_ai_Supabase__` and `mcp__supabase__` aliases but **not** `mcp__39a0f413-…__apply_migration`, which sits in `allow`. The migrate hard-stop is therefore only partially enforced. This lane did NOT use that side-door (applied via the named+lifted `mcp__supabase__` path). **Recommend** a future settings-hardening lane: add the `39a0f…` alias (and its `deploy_edge_function` sibling) to `deny` and remove from `allow`.

## NOT done (subsequent gates)

- **V1** — author + register the `vid_market_stat_reveal` Creatomate provider template (`provider_template_id`), replacing the `PENDING_CREATOMATE_AUTHORING` placeholder at its 2 sites + registering `c.creative_provider_template` (`output_type='video'`). Manual Creatomate-editor step + DB INSERT (T3).
- **V2** — behaviour-preserving governed `video-worker` branch (PP `video_short_stat` only; legacy path + all other formats/clients byte-identical, diff-proven). ef-builder, isolated worktree, full T3 chain.
- **One supervised render-and-inspect** (T3) — single governed mp4, visual gate only, no publish.
- **Flip `enabled=true`** — only after the render proof passes (own gate).
- Voice/VO (separately proven, later follow) · footage background swap (B-roll lane) · music (deferred).

## Boundaries honoured

No worker deploy · no provider-template register · no render · no publish · no YouTube · no enable-flip · no B-roll sourcing · no music · legacy video path + all other formats/clients byte-untouched. The only production mutation was the single DARK `enabled=false` governance-row INSERT.
