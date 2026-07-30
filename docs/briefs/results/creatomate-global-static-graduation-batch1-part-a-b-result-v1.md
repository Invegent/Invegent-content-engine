# Result — Creatomate Global: Static Graduation Batch 1 — Part A (Announcement Card) + Part B (Carousel Cover Integration Verdict)

**Brief file:** `docs/briefs/creatomate-global-static-graduation-batch1-gate1-brief-v1.md`
**Executed by:** Claude Code (orchestrator + subagent chain)
**Completed:** 2026-07-30 Sydney

---

## 1. Result status

**Partial.** Part A: the mechanism-gap code fix is LIVE and proven against a real production draft, but the resulting render surfaced a genuine template layout defect and PK issued a **REJECT** verdict — Part A stops here, before publish/platform-suitability/selector-ranking, pending a Creatomate template fix. Part B: **Complete — BLOCKED verdict**, evidence-grounded, no carousel body/closing work performed.

## 2. Commit(s)

- `c9bf193` — `feat(image-worker): additive b1_variant_intent_override passthrough (v3.35.0)` — merged to `main`, pushed to `origin/main`.
- Migration `20260730120000_add_post_draft_b1_variant_intent_override` — applied live (project `mbkmaxqhsohbtwsqolns`).

## 3. Files changed

- `supabase/functions/image-worker/index.ts` — modified (v3.34.0 → v3.35.0): `quoteDrafts` select() now reads `b1_variant_intent_override`; the production `image_quote` branch's `select_template` call passes `draft.b1_variant_intent_override ?? null` instead of a hardcoded `null`; `templateSpec` gains `variant_intent_override_used` / `variant_intent_override_value` evidence fields. Byte-identical behaviour for every row where the column is NULL (100% of rows before this session's supervised test).
- `supabase/migrations/20260730120000_add_post_draft_b1_variant_intent_override.sql` — created: additive `m.post_draft.b1_variant_intent_override text` column, nullable, no default, no backfill, no constraint/index/trigger/grant change.
- No other file created, edited, or deleted. `buildTmrRenderPlan`, `generic_stat_hero_card_1x1_v1` support, carousel body/closing mappings, and `select_template`'s own ranking/registry rows are all untouched.

## 4. Actions taken

**Part A:**
- Drafted the Gate-1 brief (`brief-author`), surfaced the mechanism gap (production branch hardcodes `p_variant_intent: null`) as a blocking Open Question before any code was written; PK chose the scoped-override design.
- `ef-builder` (isolated worktree) implemented the additive column + code passthrough; `deno check` clean, `deno test` 158/158 pass, `deno lint` unchanged pre-existing category.
- `branch-warden` caught real HEAD drift (local `main` 2 commits behind true `origin/main` from an unrelated already-pushed lane) — fixed via fast-forward; worktree change committed at `c9bf193`.
- `db-rls-auditor` reviewed the migration live: no naming collision, correct grants/RLS/downstream blast radius, `select_template` signature match — **pass**.
- External review (`ask_chatgpt_review`, hash-pinned to `c9bf193`) — **agree**, medium risk, high confidence, no escalation.
- PK authorized the full merge → apply-migration → deploy sequence. Merged, migration applied live, `image-worker` deployed via the sanctioned `scripts/safe-deploy.sh --allow-warn` wrapper (drift refreshed pre- and post-deploy: `B-FD` forward-drift as expected → `A-LE` clean post-deploy). `deploy-verifier` confirmed **PASS** on marker/version/`verify_jwt` (drift class itself `UNREADABLE` to that agent's toolset — advisory only, independently confirmed clean by the orchestrator's own drift-check read).
- `db-rls-auditor` located the exact-match `variant_key` (`announcement.v1`, sole candidate, no sibling ambiguity) and confirmed no draft anywhere currently sat in the image-worker's exact polled state (`approved` + `image_status='pending'`).
- **New finding, disclosed and spun off separately (not fixed in this lane, per boundaries):** the production `image_quote` poll has no `client_id` filter and no `ORDER BY` before `.limit(3)` — a latent cross-client race. Logged as its own follow-up task (`task_500c9698`), out of scope here.
- PK chose to reset an already-approved, already-rendered PP draft back to `pending` rather than wait for a natural fresh draft. First candidate (`5ee5e727…`) was found to already carry a **live pre-existing** `post_publish_queue` entry (Instagram, firing 2026-07-31 00:00 UTC) — unrelated to this batch, left untouched on PK's instruction. Switched to a clean candidate with zero queue entries: `92d98a6e-9d37-4966-a960-5db452df11b1` ("Strong jobs data narrows near-term rate cut probability for property investors").
- Backed up the pre-existing rendered image locally (byte-for-byte) before overwrite. Applied `b1_variant_intent_override='announcement.v1'` + `image_status='pending'` to that one row (external review ran first — flagged the auto-publish-interaction concern that led to the queue-entry check above).
- The standing `image-worker-15min` cron picked up the draft naturally within the window and rendered it through the **real production branch** (not the smoke entrypoint) — confirmed via `m.post_render_log`: `provider_template_id=a75e7139…` (`generic_announcement_card_1x1_v1`), `variant_intent_override_used=true`, `variant_intent_override_value='announcement.v1'`, governed background `bg_brisbane_cbd`.
- Independently re-verified the produced file (not the render's self-report): **1080×1080 JPEG** (confirmed via `file`), governed Property Pulse logo correctly positioned, governed background present, footer `propertypulse.com.au` present.
- **Defect found on visual inspection:** the headline (4 lines at this length) visually overlaps and collides with the subtitle text underneath, making both largely illegible in the overlap band. The CTA renders the literal placeholder text "Call to action" (no PK-authored copy was supplied — matches the pre-existing disclosed placeholder gap from the compat-build proof). This is exactly the class of defect a fixed-text smoke render could never have surfaced.
- Presented the actual rendered image to PK. **PK verdict: REJECT** — fix the template layout defect before any further promotion.
- Rolled back the test draft completely: DB row restored (`b1_variant_intent_override=NULL`, `image_status='generated'`), and the original image bytes re-uploaded to the same storage path — verified **byte-identical** to the pre-test backup (`cmp` exact match).

**Part B:**
- Live-confirmed (not static-only): 104 real Property Pulse carousel drafts exist today, all on the **legacy** `recommended_format='carousel'` pipeline (`callContentAdvisor` → `buildCarouselSlideScript` → `m.post_carousel_slide`, ordered by `slide_index`) — this pipeline never calls `select_template` and has no relationship to the TMR provider-template registry.
- Live-confirmed exactly **one** historical `select_template` call ever made with `format_key='carousel'` across the entire `m.post_render_log` history, for **any** client — and it is this same lane's own compat-build smoke render (`client_id NULL`, label `creative_library_b1_smoke`, synthetic seed `postdeploy-proof-carousel-cover`, dated 2026-07-29), not a production call. Zero production callers exist or have ever existed.
- Confirmed the worker's `TMR_WINNER_TEXT_FIELDS` allowlist has exactly 4 entries (`market_insight_card`, `quote_card`, `announcement_card`, `carousel_cover`); `generic_carousel_body_1x1_v1` and `generic_carousel_closing_1x1_v1` have **zero** mapping of any kind.
- Confirmed Facebook (`publisher/index.ts`) and Instagram (`instagram-publisher/index.ts`) are the only two publishers with multi-image carousel delivery, both reading `m.post_carousel_slide` directly — neither has any code path that reads a `provider_template_id`-based render. Confirmed (grep, zero hits) LinkedIn and YouTube publishers have **no** carousel/multi-image handling at all.

## 5. Constraints confirmed

- `buildTmrRenderPlan` — not modified. Confirmed via diff review at every stage.
- `generic_stat_hero_card_1x1_v1` — no support added.
- Carousel body/closing mappings — none added.
- Both templates never made simultaneous production winners — the selector-ranking change was never even drafted (Part A stopped before reaching that step).
- No claim anywhere that carousel production is complete from a cover-only render — Part B's verdict states the opposite explicitly.
- Scope stayed on Property Pulse only — NDIS's paused containment state and the unrelated Instagram queue timer on `5ee5e727…` were both identified and explicitly left untouched.
- No promotion occurred from the smoke render alone — the real production draft's defect is exactly why that rule mattered.

## 6. Open issues

- **Part A blocked on a Creatomate template layout defect**, not a code defect: `generic_announcement_card_1x1_v1`'s headline text box does not reserve space for a longer real headline, causing it to overlap the subtitle. This is very likely a fix inside the Creatomate template designer itself (there is no template CRUD API — confirmed prior finding), not a repo code change. Needs its own scoped fix-and-reverify pass before Part A can resume (publish proof, platform suitability, selector-ranking packet all remain undone).
- CTA still renders Creatomate's own placeholder text ("Call to action") — no real PK-authored copy exists yet for this template; a content decision, not a code one.
- The pre-existing Instagram auto-publish timer on draft `5ee5e727-c2bb-41e3-89f3-d62ce99473a5` (scheduled 2026-07-31 00:00 UTC) was found but deliberately left untouched per PK's explicit "no preference / leave alone" answer — it is unrelated to this batch and will fire on its normal path.
- The image-worker `image_quote` poll's missing client-scope/ordering was spun off as its own follow-up (`task_500c9698`), not fixed here.
- Another concurrent session has an **uncommitted** v6.79 (B-roll Rotation Governance monitoring baseline) docs edit sitting in this same shared `main` checkout. This result doc and its register pointer were added without committing anything, per PK's explicit instruction, so as not to disturb that other lane's in-progress work.

## 7. Next recommended step

Scope and run a Creatomate template-layout fix for `generic_announcement_card_1x1_v1` (headline/subtitle collision at real-world headline lengths) as its own small, PK-gated lane — likely template-editor work outside this repo, plus a re-render/re-verify pass reusing the now-live `b1_variant_intent_override` mechanism. Only after that passes PK's visual verdict should Part A resume at the native-publisher proof step. Part B is closed at BLOCKED; the next Creatomate Global outcome (per PK's own framing) should treat "Carousel Family Compatibility Build" as a genuinely new integration project (wiring the TMR `carousel_cover` template into the existing `m.post_carousel_slide`/FB-IG delivery mechanism) rather than an extension of the cover-only work done so far — a decision PK should make explicitly given the two-system finding.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matched the brief's stop conditions: Part A stopped before the registry/selector apply gate (in fact stopped earlier, at PK's REJECT on the visual verdict — a stricter reading of "do not promote solely from a supervised smoke render," since the real render also failed). Part B stopped at a clearly evidenced BLOCKED verdict, never claiming carousel completeness from the cover render.
- All named boundaries confirmed respected (§5 above).
- One unexpected file-state discovery (the shared-worktree concurrent uncommitted docs edit) was handled by leaving it untouched, as PK directed.
- New risk surfaced and disclosed, not fixed: the unscoped/unordered image_quote poll query (spun off separately).
- Follow-up needed: Creatomate template layout fix before Part A can resume.

## 9. Learning notes (chat fills this)

- The Gate-1 brief's own mechanism-gap finding (production branch hardcodes `p_variant_intent: null`) was exactly right and saved real time — worth continuing to have `brief-author` read the actual render code path, not just the registry state, before drafting Part-A-shaped briefs.
- A real production-shaped draft test caught a template defect that two prior smoke-render proofs (compat-build, deploy-verification) both missed, because both used the same fixed short test headline. **Reusable pattern:** any future template graduation should test with at least one real, variable-length, in-the-wild headline before calling a template production-ready — a fixed smoke headline is not sufficient evidence of layout robustness.
- Resetting an already-approved draft's `image_status` back to `pending` to force a controlled re-render is a real, generally-applicable technique for this kind of test — but it must always be preceded by a live check of `m.post_publish_queue` for that draft, since an already-approved draft can carry a live auto-publish timer on a completely different platform than the one being tested. Worth adding this check to any future brief template that proposes reusing an existing approved draft.
