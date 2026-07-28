# Brief cc-NNNN — video-broll-intake-v1

**Created:** 2026-07-27 Sydney
**Author:** brief-author (subagent) — returned draft; orchestrator persists
**Executor:** {PK | Claude Code} — SOURCING + FENCED INTAKE ONLY; no promotion authorized by this brief
**Status:** draft (uncommitted proposal — awaiting PK Gate 1)
**Result file:** `docs/briefs/results/cc-NNNN-video-broll-intake-v1.md` (created on completion)

> **Lane classification (CLAUDE.md CCF-02):** PRODUCT_PROOF · **Tier:** proposed **T2** (fenced/default-closed DML into `c.client_brand_asset`, additive, isolated), with named **escalation triggers to T3** (see §Tier). **Client:** Property Pulse only. Any later promotion/fence-flip is a **separate T3 lane**, not this one.

---

## Task

Stand up a **fenced-first (default-closed) Video B-roll Intake v1 spine** for Property Pulse that honestly reuses the PROVEN image-lane primitives — licence-safe candidate sourcing → full-clip review → dedup → a **FENCED** shortlist of governed video B-roll clips inserted into `c.client_brand_asset` (`is_active=false`, `approved=false`, `approval_status='intake_candidate'`) — and **stops at the PK visual gate**. It builds inventory for the ratified full-frame B-roll background layer of the single-scene `video_short_stat` template; it promotes nothing, wires no resolver, and deploys nothing.

> **PREMISE CORRECTION (load-bearing — PK please confirm, Open Q1).** The literal task named 'Creatomate multi-scene production'. **There is no Creatomate multi-scene lane in this repo.** Governed Creatomate video is **single-scene** (`video_short_stat`, a single-stat reveal); 'multi-scene' in-repo means legacy ungoverned kinetic or HeyGen, **not** Creatomate. The genuine, already-ratified B-roll need is a **full-frame B-roll BACKGROUND LAYER inside the single-scene `video_short_stat` template** (`docs/briefs/pp-broll-template-proof-gate1-brief.md:12-16`), where the background is today **BAKED as a still** with no background field in the worker modification set (`docs/briefs/pp-broll-template-proof-gate1-brief.md:23-28`). This brief is scoped to that real need; it does not assume any multi-scene capability.

## Source context

- `docs/briefs/pp-broll-template-proof-gate1-brief.md` — the **PK-ratified 2026-07-11** single-clip proof lane; establishes the real need (full-frame layer in the single-scene template), that the background is baked (`:23-28`), that **Creatomate has no template-create API** so the template is PK-authored (`:74-78`), and the standing hard boundaries (no promotion/sourcing-in-that-lane/resolver-change/enabled-flip, `:41-52,132-134`). **HELD** pending PK authoring the template (`:3-5`).
- `docs/briefs/pp-video-broll-background-capability-scope-brief.md` — the capability scope above the proof; names that widening `resolve_slot_assets`'s `usage IN (...)` predicate is **'the true danger point in the B-roll promotion lane'** (`:21,40,81`), records the **C1 geo-guard carry** (`label_constraint`/`geo_scope` read by no render path; `:21,57`) as a **promotion precondition, not a sourcing one**, and its **Open Q1** explicitly warns intake work must be reconciled with — not duplicated against — the proof/capability lanes (`:19,94,105`).
- `docs/briefs/pp-video-broll-perth-intake-v0-packet.md` — the **proven reuse primitives** (applied 2026-07-09): the fenced INSERT into `c.client_brand_asset` with `asset_type='other'` + `asset_meta` carrying `mime/usage='broll_background'/duration_s/fps/has_audio/motion/loopable` (`:26-63`); the **four per-apply guards NEVER waived** — byte-verify, post-upload public-URL sha256, in-txn fail-closed pool-neutrality assertion pinned to the live selector, branch-warden (`:66-78`); and the storage constraint (`:5,84,95`).
- `supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql:204` — verified: the live selector still filters `cba.asset_meta->>'usage' IN ('background','logo')`, so `usage='broll_background'` rows are invisible to selection **by kind** (this is why the intake is inert and why a shortage detector is premature).
- `docs/00_sync_state.md:14` — `m.detect_background_shortage` measures **background** rotation depth for image templates with a background appetite (image lane only); `:481-482` — the au-suburb B-roll clip fenced/inert (v5.47).
- `docs/00_action_list.md:18,20` — the 'Video B-roll progress' active-lane note (owns video-worker EF · `broll_*` assets · music library; parallel-safe) and the **deploy-chokepoint sequencing hold** (never two lanes deploying the same EF; deploy stays a PK hard-stop); `:182` — DO-NOT-START holds.
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md:40,46` — `c.client_brand_asset` column/`asset_meta` split; the table DDL is a **known repo-drift item not in `supabase/migrations/**`**, so the `asset_type` CHECK constraint must be confirmed live (handoff), not asserted.
- `CLAUDE.md` — image-workflow §2 non-negotiables + P2 mechanical same-shape gate; Convention-3 risk tiers; `image-harvester` team-table scope (**background-image** sourcing — **not** scoped to video); PK deploy/merge/migrate HARD STOP.

## Scope

**In scope** — a v1 fenced-first intake spine that reuses the proven image primitives, end to end, for PP video B-roll:

1. **A video-scoped candidate SOURCING step.** `image-harvester` is scoped to **background images, not video** (CLAUDE.md team table) — so this brief **requires PK to define a video provider + licence allow-list** before any fetch (recommended floor: Pexels-video / Pixabay / CC0, no CC BY / CC BY-SA / AI-gen / paid-stock without a per-asset PK exception, mirroring the cc-0027 image policy). No fetch happens until that allow-list exists (Open Q2).
2. **A full-clip REVIEW step** (not thumbnail): scan the **whole timeline** at full resolution for legible third-party signage, people, and scene drift, plus scrim-over-motion contrast for the `needs_gradient_scrim` posture (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:54,15`). Readable signage/people in any frame → REJECT.
3. **A DEDUP step, HONEST about video.** sha256-exact dedup transfers from the image lane but is **weak for video** (a trim/re-encode changes the bytes). v1 ships **sha256 + provider-id + source-url** dedup only, and **explicitly DEFERS perceptual/temporal fingerprinting to v2** (Open Q3).
4. **A FENCED INSERT** into `c.client_brand_asset` reusing the proven shape: `asset_type='other'`; `asset_meta` = `mime/usage='broll_background'/duration_s/fps/has_audio/motion/loopable` + provenance (`sha256`, `source_url`, `license`, `asset_key`, `geography`, `bucket='brand-assets'`); all four fences false (`is_active=false`, `approved=false`, `production_use_allowed=false`, `approval_status='intake_candidate'`) (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:26-63`).
5. **The four per-apply guards, never waived, on every clip:** byte-verify local sha256 == public-URL sha256; the **in-txn fail-closed pool-neutrality assertion** pinned to the exact live selector predicate (asserted 25→25 or the current live count — a `db-rls-auditor` fact); branch-warden clean (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:66-78`).
6. **Terminal state = the PK visual gate.** The shortlist stays fenced/inert; PK's visual verdict is the only deciding act. Nothing is promoted, activated, or wired.

**Out of scope (explicitly deferred to their own gated lanes):**

- ❌ **Any resolver change.** No widening of `resolve_slot_assets`'s `usage IN ('background','logo')` predicate and no B-roll selector — this is **'the true danger point'** (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:21,40,81`; verified live at `supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql:204`).
- ❌ **Any promotion / approval / fence-flip / `enabled`-flip.** Promotion is a separate T3 lane, gated on the proof passing AND C1 closed.
- ❌ **A video shortage detector.** No governed video template exposes a B-roll/background slot and the selector filters `usage='broll_background'` out (`...resolve_slot_assets...:204`), so a shortage signal has nothing to measure against — **premature; not in v1.**
- ❌ **Authoring the Creatomate footage-layer template.** PK-only; Creatomate has no template-create API (`docs/briefs/pp-broll-template-proof-gate1-brief.md:74-78`). This intake **feeds** the HELD proof/capability lanes, it does not build them.
- ❌ **Closing geo-guard carry C1.** `label_constraint`/`geo_scope` are read by no render path (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:21,57`) — a **promotion precondition**, not a sourcing task.
- ❌ Non-Property-Pulse clients; non-`video_short_stat` formats; auction/crowd/people-forward footage.

## Allowed actions

- Read repo/docs/registers as evidence; run the v1 spine sourcing→review→dedup→**fenced** intake for PP video B-roll **once PK has ratified this brief AND defined the video provider/licence allow-list** (Open Q2).
- Insert **fenced, default-closed** `c.client_brand_asset` rows using the proven shape, each behind the four per-apply guards.
- Present the fenced shortlist for the PK visual gate; surface every unknown as an open question or named handoff.

## Forbidden actions

- ❌ **No resolver change** — no widening of `resolve_slot_assets` `usage IN ('background','logo')`, no B-roll selector (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:21,40,81`).
- ❌ **No promotion / approval / activation / fence-flip** of any B-roll clip; every row stays `is_active=false`, `approved=false`, `production_use_allowed=false`, `approval_status='intake_candidate'` (proof-lane standing boundary, `docs/briefs/pp-broll-template-proof-gate1-brief.md:41-52,132-134`).
- ❌ **No `enabled`-flag flip** on `c.client_creative_governance` for the video path.
- ❌ **No template authoring, worker code, deploy, or render** — this brief authorizes intake only; the footage template is PK's manual task (`docs/briefs/pp-broll-template-proof-gate1-brief.md:74-78,136-140`).
- ❌ **No fetch of any video** until PK defines the video provider/licence allow-list (Open Q2); no CC BY / CC BY-SA / AI-generated / paid-stock without a per-asset PK exception; no people-forward or auction/crowd footage (CLAUDE.md image-agent scoped conditions).
- ❌ **No shortage detector, no C1 geo-guard work** in this lane (both out of scope above).
- ❌ **No mutation of the enabled audio path (`c11bb8ab`), no music/voice work** (`docs/briefs/pp-broll-template-proof-gate1-brief.md:49`).
- ❌ Respect the **deploy-chokepoint sequencing hold** (`docs/00_action_list.md:20`) and the **DO-NOT-START list** (`docs/00_action_list.md:182`); PP only.
- ❌ **Never waive a per-apply guard** — byte-verify + public-URL sha256 + in-txn fail-closed pool-neutrality assertion + branch-warden run on **every** clip, **every** intake (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:66-78`; CLAUDE.md image-workflow §2/P2).

## Tier and gate chain (Convention 3 + image-workflow P2)

- **Proposed T2** for this intake: it writes **fenced, default-closed, inert** rows (DML ≥ T2) using a shape already proven at the prior two intakes, additive and isolated. The first video intake was **T3** because it was the FIRST video asset and a NEW shape (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:3`); that shape now exists, so a same-shape reuse sits at T2 under the P2 mechanical same-shape gate.
- **Named T3 escalation triggers (any one → new shape → full T3 chain; when in doubt → T3):** any new eligibility-touching `asset_meta` key; a provider/licence not on the ratified allow-list; any DDL or GRANT/REVOKE; any `ON CONFLICT`/upsert; a bucket other than `brand-assets`. The **video-sourcing sub-step is genuinely new** (no proven video-harvest primitive exists), which itself argues for PK to treat the first v1 run with candidate-level scrutiny.
- **Chain:** scope-relevant `db-rls-auditor` (live selector predicate + `asset_type` CHECK + current fenced count) → external review pinned to the packet hash → `branch-warden` → the four per-apply guards in the apply txn → **PK visual gate**. Rollback (row DELETE + storage-object delete) written and validated before any apply (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:80-81`).
- **Promotion is a separate T3 lane** (full T3 chain + live proof + rollback-proven + C1 closed), never this one.

## Success criteria

- A licence-safe, deduplicated, full-clip-reviewed **FENCED** shortlist of PP video B-roll clips exists in `c.client_brand_asset`, every row with all four fences false and the proven `asset_meta` shape (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:26-63`).
- The live-eligible background/logo pool count is **provably unchanged** (in-txn fail-closed assertion pinned to the live selector, plus an independent post-read) for every intake (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:66-78`).
- Every clip carries byte-verified provenance (local sha256 == public-URL sha256) and dedup was applied by sha256 + provider-id + source-url (with perceptual/temporal dedup recorded as a deferred v2 gap).
- No resolver, template, worker, deploy, promotion, fence-flip, or `enabled`-flip occurred; the lane terminated at the PK visual gate.
- The brief's relationship to the HELD proof lane and the capability-scope brief is stated so PK is not asked to approve duplicate work (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:94,105`).

## Stop condition

Stop for PK at **Gate 1**. On approval AND once PK has defined the video provider/licence allow-list, the intake spine runs to the fenced shortlist and then **stops at the PK visual gate**. No promotion, resolver wiring, or template/worker build begins on approval of this brief alone. Report per the result template, then stop.

---

## Notes

- **This intake feeds two existing lanes; it does not duplicate them.** The single-clip **proof** lane (`docs/briefs/pp-broll-template-proof-gate1-brief.md`, PK-ratified, HELD pending PK authoring the template) answers 'does the composite render at all'; the **capability scope** (`docs/briefs/pp-video-broll-background-capability-scope-brief.md`) answers 'what is the full build'. Intake v1 supplies the **inventory** those lanes will need; it must be sequenced with them, not run against the same EF concurrently (`docs/00_action_list.md:18,20`).
- **Current inventory (to confirm — see handoffs):** two fenced B-roll clips are on record — Perth skyline **16:9** (`asset_id 42211c0f…`, `docs/briefs/pp-video-broll-perth-intake-v0-packet.md:97`) and AU-suburb aerial **9:16** (`asset_id 2d62b04e…`, `docs/00_sync_state.md:482`), both inert. Only the 9:16 is native to the target frame, so usable 9:16 inventory is effectively **one** clip — the honest gap this v1 begins to fill.
- **Storage is an intake constraint.** The 4K master 413'd the project upload limit; PK raised it to **200 MB** and the clip was right-sized to 1080p; storage upload needs the Supabase service-role key or a PK/dashboard upload (`docs/briefs/pp-video-broll-perth-intake-v0-packet.md:5,84,95`). Name the upload mechanism at apply (Open Q5).
- **Recurring ICE failure mode (carry-forward):** `label_constraint`/`geo_scope` are trusted-in-place-of-controls — read by no render path (`docs/briefs/pp-video-broll-background-capability-scope-brief.md:57`). This is why geo-authenticity is a **promotion** precondition (C1), never satisfied by sourcing.

---

## Open questions / PK decisions needed at Gate 1

1. **PREMISE (must-fix):** confirm the lane is scoped to the full-frame B-roll background layer in the single-scene `video_short_stat` template, **NOT** any Creatomate multi-scene production (which does not exist in-repo). If PK means legacy kinetic or HeyGen, this is a different lane entirely.
2. **Provider/licence allow-list (must-fix):** define the video provider + licence allow-list before any fetch (recommended floor: Pexels-video / Pixabay / CC0; exclude CC BY / CC BY-SA / AI-gen / paid-stock absent a per-asset exception). `image-harvester` is not scoped to video → a new sourcing path/tooling must be named.
3. **Dedup scope:** confirm v1 dedup = sha256 + provider-id + source-url only, with perceptual/temporal (trim/re-encode-resistant) fingerprinting **deferred to v2**.
4. **Sourcing batch:** theme set + per-theme clip count (recommend ≥2 verified native-9:16 clips per theme so a future resolver has a real pool, not a pool of one) + target frame (9:16).
5. **Upload mechanism** for the mp4 (service-role key vs PK/dashboard upload) given the 200 MB limit and 413 history.
6. **Tier:** confirm proposed **T2** (same-shape fenced DML) vs treating the first v1 run at **T3** given the genuinely new video-sourcing sub-step and the PK scoped note that brief-author's first DB-lane brief gets candidate-level scrutiny.

## Live-truth handoffs (asserted, NOT verified by this draft)

- **db-rls-auditor:** (1) confirm `resolve_slot_assets` still filters `usage IN ('background','logo')` live; (2) confirm the `asset_type` CHECK on `c.client_brand_asset` (DDL is repo-drift, not in migrations); (3) current fenced `broll_background` row count + fence states; (4) exact current live-eligible bg/logo pool count to pin the in-txn pool-neutrality assertion.
- **branch-warden:** confirm git HEAD/parity and deploy-chokepoint availability before any intake apply is sequenced against other in-flight video-worker lanes.
- **register-reconciler:** register drift — the action-list line numbers supplied in the task for geo-guard C1 (469/473/484) no longer match content (now governance-adoption text); reconcile the 'Video B-roll progress' active-lane note + head version against live fenced/live B-roll counts.
