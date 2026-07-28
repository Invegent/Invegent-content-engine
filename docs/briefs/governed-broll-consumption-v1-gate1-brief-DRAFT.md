# Brief cc-NNNN — governed-broll-consumption-v1 (two slices)

**Created:** 2026-07-27 Sydney · **Re-cut:** 2026-07-27 (PK ruling — D3 in force; two-slice split)
**Author:** orchestrator re-cut of the brief-author draft, per PK's explicit slice spec
**Executor:** {PK | Claude Code} — this brief authorizes NO build/apply/deploy on approval alone; every step carries its own gate
**Status:** draft (uncommitted proposal — awaiting PK Gate 1)
**Result file:** `docs/briefs/results/cc-NNNN-governed-broll-consumption-v1.md` (created on completion)

> **Lane classification (CLAUDE.md CCF-02):** PRODUCT_PROOF · **Client:** Property Pulse only · Format: `video_short_stat` only. The proofs are the deliverable, not a rollout.

> **PK GATE-1 RULING (2026-07-27) — binding on this brief.** The lane found the right governance boundary and must not weaken it. **(1) D3 remains in force for the first proof** — the first composite proof is a **DIRECT BIND, NO resolver** (`docs/briefs/pp-broll-template-proof-gate1-brief.md:124`). **(2) Do NOT widen `resolve_slot_assets` yet.** **(3) Do NOT admit `intake_candidate` assets through any special proof predicate.** A fenced candidate must not be auto-selected by the production resolver, and a proof-only exception would undermine the exact Asset-Gap governance boundary. Resolver selection is earned only *after* a real promotion (Slice B), never via a fence bypass.

> **Sequencing (PK):** Slice A (direct-bind consumption proof) → PK visual gate → Slice B (governed resolver integration, after a real promotion) → **only then** the Asset-Gap intake lane reopens for automated B-roll sourcing/shortage detection. The separate `docs/briefs/video-broll-intake-v1-gate1-brief-DRAFT.md` remains a **dependency/readiness record only** — no sourcing/build authorized.

---

## Task

Prove B-roll **render capability** first (Slice A), then B-roll **governed selection** (Slice B), in the existing single-scene `video_short_stat` path — using the two Property Pulse clips already fenced in `c.client_brand_asset`. Source nothing. Promote nothing in Slice A; promote exactly one clip through the existing PK-controlled process in Slice B.

## Shared source context (verified from local tree, HEAD `e4c40e9` / register v6.38)

- **No Creatomate template-create API** → the full-frame video-layer template is **PK-authored/duplicated in Creatomate**, not code-generated (`docs/briefs/pp-broll-template-proof-gate1-brief.md:74-78`). D3 direct-bind ruling: `:124`.
- **Resolver reality:** `public.resolve_slot_assets` filters `cba.asset_meta->>'usage' IN ('background','logo')` (`supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql:204`) and requires `is_active IS TRUE` + `approved = true` (`:210-212`). So `broll_background` is invisible by kind AND a fenced clip is ineligible — the collision that makes Slice B require a **real promotion**, not a bypass. Widening this predicate is "the true danger point" (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:81`). Live definition/grants = `db-rls-auditor` handoff.
- **Worker consumption:** `supabase/functions/video-worker/b1_video_stat.ts:302-333` already binds `Background.source` **optionally** (v3.10.0 Option B); baked-bg variant omits the key (`:31-45`). This is the direct-bind seam Slice A uses.
- **The two fenced clips** (both `asset_type='other'`, `asset_meta.usage='broll_background'`, all four fences false): **AU-suburb aerial** `2d62b04e-c1b5-44df-b382-59cbb991e166` = native **9:16**, **no-audio** (`docs/00_sync_state.md:485-486`) — **Slice A uses this one**; **Perth skyline** `42211c0f-6d06-4780-950a-a4a1d61b880b` = **16:9** (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:96-97`) — not used (wrong aspect).
- **Regression guards (must stay intact):** video-worker **v3.13.0** race-safe draft-claim/retry (`docs/briefs/results/video-worker-render-claim-concurrency-v1.md`); the governed audio/voice path (template `c11bb8ab`); the publish/release path.
- **Render ceiling:** ≤2-min Creatomate render, **no retry** (standing) — a full-frame video layer may lengthen render; measure it.
- **Audio nuance:** the AU-suburb clip is silent; "audible audio" (Slice A crit) is satisfied by the **existing governed voice track**, not the clip. The B-roll video layer must **not** introduce or override audio (Creatomate `source:""` = silent; omit clip audio) so the governed VO remains audible.
- **Deploy-chokepoint sequencing hold** on video-worker (`docs/00_action_list.md:20`); DO-NOT-START (`:182`). Deploy/migrate/merge = PK HARD STOPS; EF deploy carries `--no-verify-jwt` (standing gotcha).

---

## SLICE A — Direct-bind B-roll consumption proof

**Goal:** prove the template can *composite* a full-frame B-roll video layer with acceptable framing/motion/audio inside the 2-min ceiling — not that ICE can *select* it. **Tier: T2 contained proof** (no production code change, no deploy, no DB change, no promotion) — downgraded from T3 by the finding below.

> **EXECUTION-PATH FINDING (2026-07-27, read-only scope-check — supersedes Open Q1).** The production worker's **direct bind was RETIRED in v3.8.0**: the render path is now 100% resolver-driven and fail-closed (`b1_video_stat.ts:23,206-207,219` — `bind_mode` was `'direct_bind_pre_select_template'`, now always `'resolved'`, `resolver_used:true`; the worker throws `tmr_video_selector_fail_closed` unless the *selector* returns `status:'ok'` + `provider_template_id` + `Background.source`). **There is no non-resolver injection seam in production.** So a "direct bind through the worker" would mean re-adding a retired production seam + a deploy — the wrong move for a capability proof. Instead **Slice A is a standalone Creatomate direct-source render harness**: render PK's new template **by `template_id` + `modifications`** (`Background.source` = the AU-suburb clip's public URL, plus the stat/logo text mods) via the Creatomate render API (per the direct-source recipe), in `_harness/`, touching NO production worker and NO deploy. The worker's video-consumption binding **already exists** (Option B, `b1_video_stat.ts:332-334`) and is exercised **for real in Slice B** (resolver supplies the values). Slice A crit 5 ("retry/timeout unchanged") is then satisfied by **not touching the worker** + its existing hermetic tests still passing.

**In scope**
1. **PK authors/duplicates** the `video_short_stat` Creatomate template with a defined full-frame `Background` **VIDEO** slot. **Live-confirmed base:** duplicate `video_stat_reveal_9x16_v2` (`provider_template_id c11bb8ab-18bd-45ff-aedd-0a59cb3773ab`, 9:16) — its `Background` element is currently **`element_type='image'`** (`c.creative_provider_template_field`), so it renders a still `.jpg`, not footage. Change that element to a **video element** (or add a full-frame video element at the bottom track, z-under the scrim/text/logo), keep StatValue/StatLabel/ContextLine/CtaText + Logo. **PK provides the new `template_id` + the `Background` (video) element name.** *(PK ACTION — blocks Slice A start.)*
2. **Standalone direct-source render harness** (no resolver, no worker, no deploy): render the new template by `template_id` with `modifications` = `{<Background video element>.source = <AU-suburb clip public URL>, StatValue/StatLabel/ContextLine/CtaText, Logo.source}`. **Clip confirmed live** — `asset_id 2d62b04e…`, native 9:16, silent, bytes present in `brand-assets`: `https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4` (still fenced/`intake_candidate` — read, not promoted). Pair with a **generic national stat** (clip is geo-constrained national-only; C1 not machine-enforced).
3. **One contained render** in `_harness/`, no draft row, no `post_draft`, no publish.

**Success criteria (PK's Slice-A list)**
- Full-frame B-roll video layer renders in `video_short_stat`.
- **No manual production promotion** — the clip stays fenced (`is_active=false`, `approved=false`, `approval_status='intake_candidate'`); it is fed by direct bind, not selection.
- Acceptable framing + motion (native 9:16; footage visibly moving full-frame under the scrim; text/logo legible).
- **Audible audio** — governed voice track audible; B-roll layer contributes no audio.
- **Retry + timeout behaviour unchanged** — v3.13.0 claim/retry verified intact.
- **No external publishing.**
- **Render time measured against the 2-min ceiling** (recorded in the result doc).

**Slice-A chain (no production deploy):** PK provides `template_id` + element names → `db-rls-auditor` read-only (AU-suburb clip live public URL + fence state, confirming it is still fenced) → standalone render harness in `_harness/` → **PK visual gate** (framing/motion/audio/render-time-vs-2-min). The production worker is untouched; its existing hermetic tests re-run green to evidence crit 5. No `ef-builder`, no deploy, no `branch-warden`-for-commit unless the harness lands as a committed proof script (then a docs-lane commit only, on PK instruction).

**Slice-A forbidden:** no resolver change, no `usage`-predicate widening, no promotion/fence-flip/`enabled`-flip, no proof-only predicate, no sourcing, no publish, no touching retry/audio/publish logic beyond verifying it passes, no multi-scene assumption.

---

## SLICE B — Governed resolver integration (only after Slice A passes the PK visual gate)

**Goal:** prove ICE can *automatically select* a B-roll clip through the **real** governance path — no fence bypass. **Tier: T3** (production resolver change + a promotion).

**In scope (PK's Slice-B list, in order)**
1. **Promote exactly ONE clip** (the AU-suburb 9:16) through the **existing PK-controlled asset-promotion process** → genuinely `approved=true`, `is_active=true`. *(Separate PK-gated promotion — the normal T3 promotion lane, not invented here.)*
2. **Extend the resolver to recognise `broll_background`** — widen `resolve_slot_assets`'s `usage` predicate (`:204`) or add a scoped B-roll selector. This is the named danger point → full `db-rls-auditor` + external review + `branch-warden` + rollback-proven-before-apply.
3. **Keep `approved=true` / `is_active=true` semantics unchanged** — selection relies on the genuine promotion, not on any relaxed eligibility gate; `:210-212` stay as-is.
4. **Prove automatic selection with NO asset-ID literal** anywhere in the worker/render path — a contained render whose B-roll clip is resolver-chosen end to end.

**Slice-B chain:** PK-controlled promotion (its own gate) → `db-rls-auditor` (live resolver def + predicate + eligibility gates + `asset_type` CHECK + post-promotion fence state) → resolver change designed + rollback → `ef-builder` (remove the direct-bind literal; rely on resolver) → `branch-warden` → external review pinned to hash → **PK deploy HARD STOP** → contained resolver-selected render → PK visual gate → `deploy-verifier`.

**Slice-B forbidden:** no auto-selection of any fenced/`intake_candidate` clip; no relaxation of the `is_active`/`approved` eligibility gates; no promotion of more than the one clip; PP + `video_short_stat` only.

---

## Stop condition

Gate 1 stops here. On approval, **Slice A cannot start until PK provides the template id**; Slice A then stops at the PK Gate-2 deploy HARD STOP, then the PK visual gate. **Slice B does not begin until Slice A passes the visual gate** and PK runs the promotion. The **Asset-Gap automated-sourcing lane reopens only after Slice B succeeds.** Report per the result template at each visual gate; otherwise stop for PK.

## Open questions for PK (Gate 1)

1. **Worker binding sufficiency (Slice A).** Does the existing v3.10.0 Option-B `Background.source` path already carry a *video* URL into the video `Background` element, or is a small additive field/binding needed? (Decides whether Slice A §2 is a code change or verify-only.) — `db-rls-auditor`/`ef-builder` scope-check.
2. **Template variant registration.** Does the PK-authored variant need a `c.creative_provider_template` variant/field row for the worker/`select_template` to address it (memory: 7 of 8 video templates have no variant row)? If direct-bind reaches the template by explicit `provider_template_id`, Slice A may not need the row — Slice B likely does. — `db-rls-auditor` dependency.
3. **Promotion mechanism (Slice B).** Confirm the "existing PK-controlled asset-promotion process" to use for the one clip, so Slice B step 1 reuses it rather than inventing a path.

## Notes

- **C1 geo-guard carry** (`pp-video-broll-background-capability-scope-brief.md:57`): `label_constraint`/`geo_scope` are read by no render path; the AU-suburb clip is national-only. Not a blocker for a contained proof, but it is a **promotion precondition** to keep the eventual production use honest — flag at Slice B's promotion gate.
- **Watch:** the underlying grounded claims came from brief-author's first code+DB draft — read the worker/resolver specifics with candidate-level scrutiny until Slice A confirms them live.
