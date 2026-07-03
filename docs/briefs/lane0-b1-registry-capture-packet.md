# Lane 0 — B1 Registry Capture Packet

**Created:** 2026-07-03 Sydney · **Queue authority:** PK-ratified next-work queue item 0 (action_list @ `09986ef`); prerequisite for S1 (v4.80 ratified decision 5)
**Status:** review chain run — **awaiting PK apply gate (HARD STOP)**
**Artifact:** `_harness/lane0-b1-registry-capture.sql` · **sha256 — see §6**
**Mutation proposed:** data-only INSERTs (no DDL · no UPDATE/DELETE · no function change · no render · no publish · no runtime/dashboard change): **1 family + 1 template + 9 fields + 1 variant candidate + 2 platform-suitability + 1 assignment + 5 proof events = 20 rows.**

## 1. Purpose

Capture the **live PP production template** (`fb9820f8-3fee-4448-b324-3d500fa74b40`, `news_static_centered_scrim_1x1_v1` — what B1-v2 renders with today) into the TMR registry as a **client-scoped, evidence-cited** entry. Effect on the machine: shadow comparisons upgrade from blanket `expected_structural_divergence` to genuine template-level comparison; `select_template`'s rejected[] names the production template with an honest `wrong_scope` reason instead of not knowing it exists.

## 2. Evidence basis (all verified live this lane)

- **Provider-read unavailable, honestly recorded:** the generics-project Creatomate key returns "No template was found with that ID" for `fb9820f8…`, while production rendered with it 2026-07-02 → the B1 template lives in a **separate Creatomate project**. Capture is `inventory_status='captured_from_docs'` (a first-class vocabulary value), sources cited in-row: vendored implementation (`image-worker/index.ts` + `b1_production.ts` — the exact 8 modification keys), `docs/creative-library/property-pulse.json`, 17 succeeded production render_specs, registers v3.98/v4.00/v4.05.
- **Publish evidence:** **5 distinct B1 drafts published to facebook + 5 to instagram** (`m.post_publish` joined to the B1 render pool) — the only platforms claimed.
- **Field surface:** 8 dynamic modifications (`CategoryBadge/Headline/Subtitle/Location/Date/Footer` text + `Background`/`Logo` sources) + 1 **static** Scrim shape (unlike the generics, B1's scrim is baked in). `Headline`/`Background`/`Logo` recorded `required_for_render=true` (hard gate / fail-loud, per the worker).
- **All CHECK vocabularies verified live** before authoring: template status ladder (has `production_proven`), family status (`active` valid), scope (`client` valid), fit_status, output_type, field_kind, suitability status (`production_proven` valid), placements in use (`feed` valid); `element_id` nullable (unknown without provider read — NULL with element_name authoritative).

## 3. Recommended status values (PK ratifies at this gate)

| Object | Recommended | Basis |
|---|---|---|
| template.status | `production_proven` | 17 succeeded production renders, 14 drafts, publishes on 2 platforms, PK visual approvals on record |
| family.status | `active` | it IS the live production family (generics are `draft` candidates) |
| assignment_status (PP) | `production_proven` | same evidence; records existing reality, grants nothing new |
| suitability fb / ig | `production_proven` | 5+5 published drafts per platform; **no other platform claimed** |
| proof events | smoke_render · visual_approval · platform_render · platform_publish×2, all `passed` | each row cites its evidence (render_log 50f09ca2 [B0 proof]; B1-v1 proof = post_draft 52165857-ba7e / **render_log c3c7489b** — corrected per db-rls-auditor: 52165857 is the draft id, a mis-citation the repo had already retired once in Slice 1B; register versions; m.post_publish) with historical `occurred_at` |

These are **retrospective records of already-earned status**, not promotions — nothing renders/publishes differently, and the selection fence below makes leakage into v0 selection impossible.

## 4. Selection safety — the load-bearing invariant, asserted in-transaction

`scope='client'` ⇒ `select_template` v0 (generic-only) rejects the B1 template at filter (a) with `wrong_scope`, **before** assignment/proof/asset checks — so `production_proven` statuses cannot make it selectable. The artifact **proves this inside the apply transaction**: after the inserts it calls `select_template('property-pulse','facebook','image_quote')` and **aborts everything** unless the winner is still `generic_quote_card_1x1_v1` AND the B1 template appears in rejected[] as `wrong_scope`. Capture is selection-neutral by construction *and* by proof.

**Shadow semantics after capture:** S0's 17 historical rows are point-in-time records and are NOT re-stamped; S1 forward rows will classify against the new registry truth (template mismatches become genuine `selector_disagreement`, explainable via the `wrong_scope` rejection). Exactly the honesty upgrade the queue ordered.

## 5. Assertions / idempotency / rollback

Single transaction (`BEGIN + DO + COMMIT`): pre-asserts (client exists · template absent by provider id AND fixed id · family absent) make any re-run abort cleanly; exact-count asserts (9 fields, 5 proofs); fixed ids `c0b10001-…-0001..0004` + `recorded_by='lane0-b1-registry-capture'` are the rollback keys. Rollback = 7 reverse-dependency DELETEs (commented in the artifact; expected counts 5/1/2/1/9/1/1) — zero collateral (all rows new, nothing references them).

## 6. Review chain

| Review | Status |
|---|---|
| db-rls-auditor | **run — §6a** |
| security-auditor | n/a with reason: data-only INSERTs; no DEFINER/grant/storage/runtime surface |
| external review | **run on the exact artifact hash — §6b** |
| PK apply gate | **HARD STOP — pending** |

### 6a. db-rls-auditor (2026-07-03, read-only) — verdict `concerns` → **one must-fix, APPLIED; all else clean**

Confirmed clean against live: **every inserted value inside its live CHECK vocabulary** (no CHECK on element_type; `required_field_mapping_status` nullable-no-default, safe to omit; no NOT-NULL-without-default omitted anywhere); FK chain satisfied by insertion order (note: `client_id` columns carry no FK — value resolved live from `c.client` by slug); uniqueness all respected (`fb9820f8…` absent, all fixed ids absent, family_key absent, `(provider,provider_template_id)` / `(template_id,element_name)` / `(template_id,variant_key)` / `(template_id,platform,placement)` all clear); **evidence spot-checks exact** (17/14 pool · 5 fb + 5 ig published drafts · 50f09ca2 = the `_smoke` B0 proof · occurred_at values accurate incl. 2026-07-02T00:15:14Z = pool max); **selection safety verified from source**: post-capture the B1 template enters the candidate set (11→12) and rejects at filter (a) `wrong_scope` FIRST — status/assignment/proof/asset filters unreachable, so `production_proven` cannot leak into selection; the in-transaction invariant sees uncommitted inserts (STABLE plpgsql) and full-aborts on drift; **shadow impact confirmed** (S0 CASE's registry-EXISTS flips → future S1 rows classify `selector_disagreement`; zero UPDATE/DELETE in the artifact, S0 rows untouched); transaction/rollback sound (counts 5/1/2/1/9/1/1 exact, no strandable refs); blast radius = the 3 display RPCs + select_template rejected[] + future shadow classification only.

**Must-fix (APPLIED, artifact re-hashed):** the visual_approval evidence cited `render_log 52165857` — but 52165857 is the **post_draft** id; the real render_log row is `c3c7489b…` (succeeded 2026-06-26 04:07Z). The repo had already retired this exact mis-citation in Slice 1B; re-introducing it into a permanent evidence row would have defeated the lane's purpose. Corrected to cite both ids accurately; `occurred_at` tightened to 04:07Z. **Informational (recorded):** `resolve_slot_assets` detects Scrim by element_name without a `dynamic` filter, so a hypothetical direct call on the B1 template would emit `Scrim.opacity` against a baked-in scrim — unreachable today (scope fence + zero consumers); noted for any future direct-call consumer. No unique constraint exists on assignment `(template_id, client_id)` — the pre-asserts are the re-run guard (sound).

### 6b. external review (2026-07-03) — verdict `agree` / decision `proceed`

`review_id 459008cb-2a72-4c64-a664-98eb9d8f22d9` · `reviewed_input_hash bdaa788cf018bed2a44a9c32dadeb690cc313c9ace6f9cb528d8d24751f8629b` (== the CORRECTED artifact, post-must-fix) · risk **low** · confidence **high** · **zero pushback, zero unverified claims, no escalation**. Verified: CHECK compliance, exact-count zero-collateral rollback, and double-proven selection neutrality.

## 7. Apply / no-apply recommendation

**APPLY.** Grounds: queue-item-0 authority; every value live-verified against CHECK vocabularies; evidence citations now exact (the one defect was caught by the auditor and corrected — the corrected hash is what both the external review and this recommendation are pinned to); selection neutrality proven by source analysis AND enforced by the in-transaction invariant (any drift = full abort); shadow upgrade is precisely the queue's stated purpose; rollback exact with zero collateral; re-run refuses cleanly. Apply as postgres/service_role with `sha256 == bdaa788c…` re-verified immediately before execution. Post-apply verification plan: row counts (1/1/9/1/2/1/5 by marker/ids) → live `select_template` probe (winner unchanged + B1 in rejected[] as `wrong_scope`) → S0 rows untouched (still 17× structural) → TMR dashboard list shows the new client-scoped entry → result doc + registers.

## 7. Boundaries

No render · no publish · no runtime/dashboard caller · no Format Mix binding · no production enablement **change** (the template is already the production path; this lane only records that fact) · no S1 build · no template/asset edits · queue items 1–5 untouched.
