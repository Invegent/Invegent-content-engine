# Content Studio — Decision Brief (from the four audit lanes, 2026-06-13)

**Status:** DECISION BRIEF ONLY — no implementation, no CCD build brief, no migration SQL. Read-only synthesis of: capability audit, governed-insertion audit, slot-sufficiency validation, broad-vision architecture audit.
**Purpose:** convert audit evidence into PK decisions. CCD receives nothing until PK selects a tier line from §G.

---

## A. Executive summary (one page)

Content Studio today is an ungoverned side-door: the Single Post path is **effectively text-only** (format selector is a no-op end-to-end; `manual_post_insert` writes NULL-format drafts no render worker can pick up), it **bypasses** signal lineage, the slot/cadence layer, the Advisor, format taxonomy, auto-approval scoring and — on queue-save — **human review itself** (auto-approved, scheduled `now()`); compliance flags arrive after approval and gate nothing. Series Studio is closer to the engine (real formats, compliance flags, human approval, renders fire) but skips the Advisor, auto-scoring, taxonomy buildability validation, and the slot layer entirely.

The audits established three load-bearing facts. **First**, ICE already has the right abstraction for manual single-post intent: `m.slot` natively carries platform, schedule, fill window and an Advisor-overridable `format_preference[]`, and the fill engine enforces publish-eligibility (cc-0019), format policy, and the skeleton-draft + ai_job contract — a manual slot inherits the entire governed chain. Two corrections from adversarial validation: operator **briefs must not enter the global canonical pool** (cross-client leakage risk — carry them on the slot, precedent: `c.content_series.source_material`), and `canonical_ids` is fill *output*, so content-binding needs one fill-function branch. Net Tier 0 cost: two nullable slot columns, one fill branch, one RPC, one UI re-point. **Second**, the broad studio vision (one idea → multi-platform, carousels, video, avatar, skits, packages) needs exactly **one** genuinely new abstraction — a lightweight **creative intent** parent grouping sibling platform-native drafts. Drafts remain the production unit; render jobs stay draft-attached; nothing else new. **Third**, **rendered-asset compliance does not exist anywhere**: all compliance is seed/copy-stage; nothing inspects a generated PNG/MP4; the pre-publish render hold is soft and has already leaked — **44 image-class posts published with no asset at all** (35 image_quote, 9 carousel) plus one published-while-render-pending. Before video/avatar volume grows in a regulated sector, a post-render QA gate is the highest-consequence missing control.

Recommended path: **approve Tier 0 + Tier 1 + Tier 2, built strictly in that order**, with video/avatar formats unlocked in the studio only after Tier 2 lands. Tier 0 alone already stops the live governance bypass and gives operators all eight buildable formats through the Advisor.

---

## B. Decision table

| # | Decision | Options | Recommended | Reason | Risk if deferred |
|---|---|---|---|---|---|
| 1 | **Tiering** | T0 only / T0+T1 / T0+T1+T2 / hold | **T0+T1+T2, sequenced** | Each tier closes a proven gap; none is speculative | Bypass stays live (T0); studio can't grow (T1); rendered-media incidents (T2) |
| 2 | **Tier 0 scope** | as validated / wider | **As validated:** `m.slot` + `source_material` + `created_by`, fill branch on `source_kind='manual'`, `create_manual_slot` RPC, UI re-point, deprecate `manual_post_insert` | Sufficiency formally validated; smallest governed insertion | Every studio save remains ungoverned |
| 3 | **Brief carrier** | canonical pool / slot-carried | **Slot-carried** (URL case only → real canonical via normal ingest) | Global pool = cross-client promo leakage; fake fetch lifecycle avoided | Client A's promo surfaces in client B's digest |
| 4 | **Creative intent parent (T1)** | new table / stretch slot / stretch series / jsonb | **One new table** `(intent_id, client_id, intent_kind, source_material, created_by, status)` + nullable `post_draft.intent_id` | Only genuine gap above slot/draft; slot=schedule, draft=output, neither groups variants; series' `platform_drafts` jsonb is the local precedent | Variant sprawl with no parent; per-format hacks accumulate |
| 5 | **Render-job attachment** | draft / intent / asset-job table | **Stay on draft** (`post_render_log`, slides, urls) | Evidence: model already works; variants are drafts so per-variant renders come free | Pointless re-plumbing |
| 6 | **Post-render QA (T2)** | none / flag-and-review / hard-block / split | **Split: HARD-BLOCK video+avatar; flag-and-review images/carousels initially** | Video = highest consequence, low volume (~90/90d); images high volume (~7/day — vision pass trivial cost) | The 44-leak repeats; unreviewed rendered media in a regulated sector |
| 7 | **QA checks** | minimal / full | Images: OCR-vs-approved-copy, disclaimers, slide count, dims, brand. Video: transcript-vs-narration_text, frame-OCR sample, 9:16/duration, **avatar-identity vs Branch A pin**, disclaimers | Maps to observed failure modes | Wrong-avatar / corrupted-text publishes undetected |
| 8 | **Verbatim copy** | rewrite-only / +preserve mode / +light-polish | **Rewrite default; `preserve` as explicit mode — compliance still gates, ALWAYS needs_review, never auto-approve; polish later** | Preserve is the one use case slot+generation can't honestly serve; review is the safety net | Operators keep a reason to want the old bypass |
| 9 | **Format/platform source of truth** | hardcoded / taxonomy-driven | **Taxonomy-driven:** `t."5.3_content_format"` `is_buildable` × `platform_support` × cc-0019; Advisor-overridable preference; policy-forbidden absolute | Three divergent hardcoded lists exist today; the DB layer is already built | Lists drift again immediately |
| 10 | **GIF contradiction** | build them / flip `is_buildable=false` | **Flip false until actually built** | `is_buildable=true` + "NOT YET BUILDABLE" text + zero drafts ever = a trap for taxonomy-driven UI | Studio offers unrenderable formats again |
| 11 | **Phantom platforms** | keep / remove | **Remove newsletter+reddit from preview API; blog deferred until wordpress path wired to studio** | No publishers exist (newsletter/reddit); orphaned capability pair (blog) | Confusing dead options |
| 12 | **YouTube in studio** | keep excluded / expose at T1 | **Excluded through T0/T1; expose with video formats after T2** | Video pipeline + QA gate first | Premature ungated video |
| 13 | **Series × slots** | ignore / claim slots / cadence-visible | **Episodes claim slots** | Ends series/slot-fill double-booking; manual-slot machinery reusable | Cadence collisions persist |
| 14 | **Series × intent** | migrate now / reference later | **Reference later (optional)** — don't block T1 on series migration | Series works; unification is cleanup not necessity | None material |
| 15 | **Series outline editing** | keep insert-only / build UPDATE RPC | **Defer** — documented wart, regenerate path works | Not a governance gap | Abandoned-series rows accumulate (cosmetic) |
| 16 | **Series format validation** | trust EF / validate vs taxonomy | **Validate at write time** (buildability + platform_support) | Cheap; closes the EF-as-parallel-format-brain gap | Unbuildable episode formats reach render |
| 17 | **Operator fast-lane** | bypass / threshold-only / per-client config later | **No bypass; auto-approval ONLY via auto-agent-v1 threshold; queue-save cannot skip gates.** Per-client fast lane = explicitly deferred PK option | The defining line: manual input yes, manual bypass no | Reintroduces the exact hole being closed |
| 18 | **manual_post_insert** | drop / deprecate | **Deprecate** — keep callable (rollback/audit), remove from routes at T0; `preserve` mode is its only possible successor use | 18 legacy drafts inert (17 published, 1 dead) | None |
| 19 | **VideoTracker.tsx** | delete / wire / defer | **Defer to UI work** — confirmed unimported by the studio page; grep for other importers at build time | Cosmetic | None |

## C. Recommended build sequencing

**T0** (migration: 2 slot columns → fill branch → `create_manual_slot` → UI re-point → deprecation marker) → **T1** (intent table + draft FK + fan-out generation; studio exposes text/image_quote/carousel only) → **T2** (asset_review_status + QA passes + publisher hard rule "no asset + no QA = no publish", closing the 44-leak) → **then** unlock video/avatar formats in the studio. Each stage is its own gated brief: CCD patch → D-01 → PK phrase → deploy → V-checks. Series items (#13, #16) can ride T1 or run parallel.

## D. Non-negotiable rules (apply at every tier)

1. Every manual artefact carries lineage and `created_by` — no orphan drafts, all writes via SECURITY DEFINER RPCs.
2. Format preference is preference, never mandate; Advisor may override; only buildable × platform-supported × publish-eligible combos are offerable or fillable.
3. No path skips review: `needs_review` default; auto-approval solely via the same auto-agent-v1 threshold; compliance must gate before queue, never log after approval.
4. `preserve` (verbatim) mode always terminates in human review.
5. Manual slots are created non-replaceable (high `slot_confidence`) so `try_urgent_breaking_fills` cannot evict an operator's post.
6. Once T2 lands: image/video-class formats publish only with asset present + QA passed.
7. Policy-forbidden stays forbidden regardless of operator request: HARD_BLOCK content, disabled publish paths, off-pin avatars, non-buildable formats.

## E. Explicitly NOT built yet

Campaigns (Phase 2.4), newsletter/reddit publishers, outline-edit RPC, series→intent migration, client-portal exposure, studio UI redesign beyond save-path re-point, multi-language, Advisor internals, aggregation-ownership (Fix 2) and YouTube insights (Fix 3) — those remain their own gated lanes.

## F. Open unknowns (none decision-blocking; resolve at build time, read-only)

1. Full `m.fill_pending_slots` body beyond the audited head — skeleton-draft/ai_job contract details for the manual branch (CCD reads at T0 build).
2. Whether `VideoTracker.tsx` is imported anywhere outside the studio page (grep at build).
3. video-worker / heygen-worker pickup trigger conditions (T2 design input).
4. Vision-model cost per QA pass (T2 sizing; volumes known: ~620 images + ~90 videos /90d).

## G. PK sign-off line (pick one)

☐ Approved Tier 0 only ☐ Approved T0+T1 ☐ **Approved T0+T1+T2 (recommended)** ☐ Hold — re-audit: ______
Plus any row-level overrides to §B by number.
