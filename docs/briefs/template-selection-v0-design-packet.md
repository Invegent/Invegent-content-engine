# Template Selection v0 — Gate 1 Design Packet (read-only decision model)

**Created:** 2026-07-03 Sydney
**Author:** Claude Code orchestrator
**Status:** draft — awaiting PK Gate 1 decisions
**Scope of this packet:** decision model only. **No DB apply · no runtime callers · no render · no publish · no dashboard work · no production / Format Mix claim.**

---

## 1. Goal

Given **client + platform + format + content context**, ICE identifies **which approved and visually
proven template assignment it would use** — or **fails closed with machine-readable reasons**. This is
the TMR brain sitting between the Format Advisor (upstream, decides *format*) and Asset Selection
Slice-1 (`resolve_slot_assets`, downstream, fills the chosen template's slots — live + dark since v4.76).

## 2. Verified inputs (live registry, read 2026-07-03)

- **16 generic static templates** (`scope='generic'`, all `status='smoke_rendered'`, 16 smoke_render proofs passed). Aspects: 12×1:1, 4:5, 16:9, 9:16, 1.91:1.
- **`creative_template_platform_suitability`** — 55 rows over 5 platforms (facebook, instagram, linkedin, website, youtube), **all `suitability_status='candidate'`** (declared fit, not proven).
- **`creative_template_variant_candidate`** — 16 rows with a populated **`variant_key` content-shape taxonomy** (`market_update.v1`×4, `announcement.v1`, `quote_card.v1`, `stat_card.v1`, `educational.v1`, `comparison.v1`, `testimonial.v1`, `news_summary.v1`, `carousel_cover/body/closing.v1`, `story_static.v1`, `thumbnail.v1`), all `fit_status='strong_candidate'` — **but `format_key` is NULL on all 16 rows**: the bridge from ICE production formats (`image_quote`, `carousel`, …) to templates is the one missing data link.
- **`creative_template_client_assignment`** — 0 rows; schema is built for the lifecycle this packet formalizes (`assignment_status` default `'proposed'`, `approved_by/at`).
- **`creative_template_proof_event.assignment_id`** — proofs can attach to a **client×template assignment**, not just a template. Visual approval is inherently per-brand (a generic template only becomes judgeable wearing PP's logo/colours/backgrounds).
- **Asset layer:** `resolve_slot_assets` (v4.76) answers slot-fill for any (client, template) with fail-closed reason codes.
- **Gap (verified):** the live B1 production template (`fb9820f8…`, news_static_centered_scrim_1x1_v1) is **NOT in the TMR registry** — see risk R5.

## 3. The lifecycle ladder (answers PK questions 1–4)

```
L0  REGISTRY TRUTH      template exists · scope='generic' · status ≥ smoke_rendered
L1  ELIGIBLE (computed) platform suitable + format_key mapped + client can fill slots
                        (resolve_slot_assets = ok)          — a VIEW/query, zero rows stored
L2  PROPOSED            batch INSERT of the L1 snapshot as assignment_status='proposed'
                        (system drafts; one reviewed PK-gated DML lane)
L3  APPROVED            PK batch decision flips 'proposed' → 'approved' (approved_by/at
                        recorded); 'rejected' rows stay as an audit trail, invisible to selection
L4  VISUALLY PROVEN     creative_template_proof_event row with THIS assignment_id,
                        proof_type='visual_approval', proof_status='passed'
                        (created only by the PP branded proof-wall lane: render with PP
                        assets → PK visual gate → proof event)
L5  SELECTABLE          Template Selection v0 may choose it
────────────────────────────────────────────────────────────────────────────
 above v0 (NOT in scope): platform_safe → client_enabled → production_proven
```

- **How generic templates become eligible for PP (Q1):** never by hand — L1 is *computed* from registry truth + the asset layer. PP's governed assets (v4.75) currently make ~15/16 templates asset-resolvable (the youtube thumbnail's FaceObject is optional, so it passes with a warning); a client with no governed assets computes to zero eligible. No rows, no drift.
- **Eligible → proposed (Q2):** a batch DML packet snapshots L1 into `proposed` rows (with a computed-evidence citation each). System drafts; nothing is selectable yet.
- **PK approval (Q3):** one batch review flips rows to `approved` — your `approved_by/at` is the governance record. Approval ≠ selectable: it only admits the pair to the visual gate.
- **Visual proof (Q4):** **hard selectability gate.** No `visual_approval` passed proof on the assignment → the pair is invisible to selection, full stop. Consequence accepted honestly: **at v0 launch the selectable set is EMPTY** — every call fails closed with `not_visually_proven` until the proof wall lane runs. That is correct behaviour, not a bug.

## 4. The decision model (answers Q5–Q6)

**Inputs:** `client_slug, platform, format, content_type (optional), seed (optional)`.

**Selection chain** (first failing filter = the rejection reason; every survivor and every rejection is returned):

```
0. format → candidate set    format_key match on variant_candidate. Unmapped format ⇒
                             fail_closed 'format_unmapped' (never guess a template class).
1. scope + status            scope='generic' (v0; 'client'-scoped joins later) · status ≥
                             smoke_rendered ⇒ else 'status_below_smoke'.
2. platform                  a suitability row for the platform must exist and not be
                             'unsuitable' ⇒ else 'platform_unsuitable'. Rows are all
                             'candidate' today ⇒ survivors carry warning
                             'platform_suitability_unproven' (permissive-with-warning,
                             same doctrine as Slice-1's platform_scope — never silent).
3. assignment                approved assignment for this client exists ⇒ else
                             'no_assignment' / 'assignment_not_approved'.
4. visual proof              visual_approval passed on the assignment ⇒ else 'not_visually_proven'.
5. assets (composition)      resolve_slot_assets(client, platform, format, template, seed)
                             must return ok ⇒ else 'assets_fail_closed:<its fail_reason>'
                             (Slice-1's reason echoed verbatim — the two fail-closed layers
                             stay distinguishable).
6. rank                      (a) content_type→variant_key affinity when content_type given
                             (exact map; no fuzzy matching in v0); (b) fit_status
                             strong_candidate > candidate; (c) deterministic tiebreak
                             (template created_at, id). content_type is a RANKER, not a
                             filter, in v0 — it can never empty the set, only order it.
7. return or fail closed     winner = {assignment, template, modifications (from Slice-1),
                             reasons[]} + ranked_alternatives[] + rejected[] + warnings[]
                             — or status:'fail_closed' with everything above populated.
                             Zero survivors after 0–5 ⇒ 'no_selectable_template' with the
                             per-template rejection list (the "why not" payload).
```

**What v0 may choose from (Q5):** exactly the L5 set — generic, smoke-proven, platform-suitable, format-mapped, PK-approved-assignment, visually-proven, asset-resolvable templates. Nothing else, ever.

**What it must reject and why (Q6):** everything below L5, each with the specific code above — including the *currently-live-in-production* B1 template (not in the registry ⇒ not selectable by v0; production is untouched and unjudged by this layer).

## 5. Proposed format_key backfill (PK to approve values — applied in the NEXT lane, not this one)

| variant_key | → format_key (ICE format) |
|---|---|
| market_update.v1 ×4 · announcement.v1 · quote_card.v1 · stat_card.v1 · educational.v1 · comparison.v1 · testimonial.v1 · news_summary.v1 | `image_quote` (the live static-card production format) |
| carousel_cover/body/closing.v1 | `carousel` |
| thumbnail.v1 | `youtube_thumbnail` |
| story_static.v1 | `story_image` *(no live production format yet — mapped but expected to select only when the Advisor ever emits it)* |

One format → many templates (content_type ranks within); one template → one format (v0 simplification; revisit if a template genuinely serves two formats).

## 6. Key decisions for PK (Gate 1)

1. **Ratify the lifecycle ladder** (L0–L5) and that **visual proof is a hard selectability gate**, accepting the honest empty-at-launch selectable set.
2. **Ratify the assignment model:** system-computed eligibility → batch `proposed` → your batch approval → per-assignment visual proofs. (Formalizes what we sketched in chat; the schema already encodes it.)
3. **Approve the format_key mapping values** in §5 (or edit).
4. **Platform suitability doctrine:** permissive-with-warning while rows are `candidate` (recommended — mirrors ratified Slice-1 doctrine), vs hard-require proven (would zero the set for a different reason than the visual gate).
5. **content_type as ranker-not-filter in v0** (recommended) — hard content filtering deferred until the taxonomy is exercised.
6. **B1 registry gap disposition:** capture `fb9820f8…` into the registry as a client-scoped, production-proven template in a later small lane (recommended — enables like-for-like shadow comparison), or leave v0 blind to it.
7. **Implementation shape (for the build lane, not now):** read-only RPC `select_template(...)` composing `resolve_slot_assets`, same SECDEF/service-role-only/ships-dark posture as Slice-1.

## 7. Risks

- **R1 — empty selectable set at launch** (by design): every call fails closed until the proof wall runs. Mitigation: reason codes make "empty because ungated" self-explaining; the proof wall lane is already queued.
- **R2 — format_key backfill quality:** a wrong mapping selects the wrong template *class*. Mitigation: PK approves the exact values (§5); mapping is data, trivially correctable by a later reviewed UPDATE.
- **R3 — two fail-closed layers can blur:** selection failure vs asset failure. Mitigation: `assets_fail_closed:<echoed reason>` keeps provenance explicit.
- **R4 — suitability rows are unproven claims:** must never launder into `platform_safe`. Mitigation: warning surfaced on every selection that relies on a `candidate` row; platform_safe stays a separate proof rung.
- **R5 — v0 cannot see the actual production template** (B1 not in registry): shadow comparisons would compare the new brain's pick vs production's un-registered template. Mitigation: decision 6.
- **R6 — visual gate attrition:** the 16 generics have never worn PP branding; some will fail your gallery gate, shrinking the selectable set below 16. Expected and healthy — but plan the proof wall before promising coverage.
- **R7 — taxonomy drift:** `variant_key`/format strings vs future Format Advisor outputs. Mitigation: mapping is declarative data with the registry as source of truth; version it.

## 8. Smallest safe next build lane (recommended sequence)

**Lane A (next): "PP Assignment Proposal + format_key Backfill packet"** — read-only eligibility
computation (L1, using live `resolve_slot_assets` calls as evidence) → ONE reviewed DML packet:
(a) UPDATE the 16 `variant_candidate.format_key` values per approved §5; (b) INSERT the L1-passing
PP assignments as `proposed`; then your batch approval flips them `approved`. No function, no
runtime, no render — pure data, Slice-1-style review chain, trivially reversible.

Then **Lane B:** PP branded proof wall (renders via the proven non-publishing smoke mechanism →
your gallery gate → `visual_approval` proof events on assignment_ids; doubles as scrim-constant
calibration). Then **Lane C:** the `select_template` RPC itself (ships dark; hermetic tests can
prove the whole chain even while the live selectable set is still small). Shadow stamping and any
dashboard surface come after all three, each separately gated.

## 9. Boundaries held

This packet is docs-only: no DB apply, no runtime caller, no render, no publish, no dashboard work,
no production / platform_safe / production_proven / Format Mix claim. Nothing here changes what
production does today (B1-v2 keeps rendering exactly as released).
