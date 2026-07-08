# Result cc-0028 — LinkedIn image_quote-first media publish v0

**Lane:** cc-0028 · **Tier:** T3 · **Label:** PRODUCT_PROOF
**Date:** 2026-07-07 Sydney
**Brief:** `docs/briefs/cc-0028-linkedin-image-media-publish-v0.md`
**Verdict:** ✅ **Transport PROVEN** (image_quote publishes as a native LinkedIn image, no text fallback) · ⚠️ **with material findings** (legacy asset, duplicate post, audit-row miss) · **NOT broadened; held for follow-on.**

---

## 1. Outcome (one paragraph)

`linkedin-zapier-publisher` **v1.3.0** was built, reviewed, deployed to production, and exercised with one supervised single-draft fire. It **published an `image_quote` draft's rendered image as a native LinkedIn image post** on the Property Pulse company page — proving the media-publish transport end-to-end. **No text-only fallback occurred** (visually confirmed: the post shows the image card, not a bare-text post). However, the proof draft was an **old, legacy-rendered, already-published** draft, so this **does not** demonstrate governed/TMR LinkedIn creative quality, and it exposed a **pre-existing EF audit defect**. The lane is **not** broadened; cron 54 stays paused and the GFCP migration stays unapplied pending the cc-0029 follow-on.

## 2. What shipped

- **EF:** `linkedin-zapier-publisher` v1.3.0 — Supabase **function version 38**, `verify_jwt=false`, `ezbr_sha256=7be381e1a498f82f5f36b2fe49f9553e422bb0fa51182f56a2560fe46b81cdae`. Deployed via CLI from the main checkout (MCP + CLI-from-orchestrator-shell were both permission-blocked; PK ran the CLI).
- **Change:** `mediaPublishSupported` flipped `false→true`; new pure `media_action.ts::resolveZapierAction` fail-closed allowlist (`text`+`image` only); shared `writeTerminalBlock`; `image_url` added to the Zapier body only for method `image`; `guard.ts` **byte-unchanged** (`84628286c1495f3645fd60bdb8468225b2420c9f`).
- **Repo landing:** main commit **`4e81263`** (cherry-picked from isolated worktree commit `30593f02`), 4 files, **local-only — NOT pushed**. `index.ts`/`media_action.ts`/`media_action_test.ts`/migration blob-verified equal to the reviewed set.
- **Migration `20260706120000_linkedin_image_quote_platform_support_enable.sql`:** committed but **UNAPPLIED**. Live GFCP `image_quote` stays `{"facebook":true,"linkedin":false,"instagram":true}` (`md5 aaae14e76ed4541359cf2b9e6cbfe122`).

## 3. Review chain (all clean before deploy)

- brief-author `DRAFT_READY` (gate-1 draft) → PK narrowed to image_quote-first.
- ef-builder: `deno check` clean, **11/11** hermetic tests; re-cut to remove an `import.meta.main` guard (orchestrator rejected it as an unverified prod risk) → house-pattern unconditional `Deno.serve`.
- branch-warden **safe** (isolated worktree, four-file set, guard.ts untouched).
- db-rls-auditor **pass**, zero must-fix (image_quote-only migration, pre/post md5 self-abort verified, single-row scope).
- External review (`ask_chatgpt_review`) **agree / proceed**, `reviewed_input_hash=9b567db45e4d49697242eb2a8ca851e1d4ac25634e9c4bdc9a9da9b6287a83b2`, review_id `8702aeed-dbce-40c3-b259-cc69e74fa246`.

## 4. Deploy-artifact discipline (two STOPs that mattered)

The first two deploy reports did **not** land — production stayed v1.2.0 (version 37, unchanged `ezbr_sha256`), while the reporter's dry-run/GET reflected a **local `supabase functions serve`**, not the remote endpoint. The orchestrator STOPped both times on the deployed-artifact mismatch (authoritative check = production GET + `get_edge_function` version). Deploy only counted after **production GET returned `v1.3.0`** and the metadata version bumped **37→38**.

## 5. The supervised proof

- **Zaps:** PK live-tested all four brand LinkedIn Zaps (`Image Type=post_media`, `Image=Step 1 Image Url`) — the "Zap cannot take a single media URL" hard-STOP is cleared for all four.
- **Proof draft:** `7d0c0102-a1f8-4acc-b1f8-8d7c42934b86` — Property Pulse (`client_id 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`), "Negative equity risk exposes the real cost of thin deposits", image_quote, `image_status=generated`.
- **Staging (PK-authorized mutations):** cron **jobid 54 paused** (`cron.alter_job(54, active:=false)`); enqueued exactly one queue row `6e9cb735-7b59-4ba8-bbe6-5e1737b01e65` for the draft; verified it was the **only** due LinkedIn item.
- **Production dry-run (v1.3.0):** `locked:1 / processed:1`, `results[0] = {status:"dry_run_ok", method:"image", would_send_image:true}` — posts nothing. Schedule reset to now afterward.
- **Real fire (`{"limit":1}`):** `results[0] = {status:"published", platform_post_id:"zapier-li-1783419310757", client:"Property Pulse", duration_ms:507}`. Queue row → `published`.
- **Visual (decisive):** PP LinkedIn (`company/112999127`) shows a **native image post** — title text + the image card ("A 5% deposit leaves almost no buffer when valuations correct even modestly"). **No text-only fallback.**

## 6. Findings

**F1 — Legacy asset, not governed creative (product).** The published image is the **legacy image_quote render** (dark centred-scrim card), not the new governed/TMR template. Cause: draft `7d0c0102` is dated 2026-06-07, so its `image_url` was rendered a month ago, before the governed pipeline. **This proof does NOT establish governed/TMR LinkedIn creative quality** — only the publish transport.

**F2 — Duplicate post.** Draft `7d0c0102` had **already been published as a TEXT post on 2026-06-07** (`m.post_publish 5844df89`, `attempt_no=1`, `platform_post_id zapier-li-1780798801988`, text-only payload `text_length=1926`). The Zapier publisher never stamps `post_draft.approval_status='published'`, so the draft still read `approved` and the eligibility query treated it as unpublished. Result: the same content is now on PP's LinkedIn **twice** (text June 7 + image today). Selection miss owned by the orchestrator — candidate drafts were not screened for prior `post_publish` rows.

**F3 — Audit row did not persist (EF defect, pre-existing).** Today's success insert `(post_draft_id, attempt_no=1)` collided with the June-7 row on **`uq_publish_attempt UNIQUE (post_draft_id, attempt_no)`**. The EF **hardcodes `attempt_no` to the default `1`** (never increments on republish) **and does not check the insert's `.error`** (supabase-js returns the error rather than throwing), so it **silently swallowed the unique violation and still marked the queue `published`**. Consequence: **no `post_publish` audit row exists for the real image publish**, so `method='image'`/`image_sent=true` could not be confirmed from the DB (confirmed instead by the production dry-run + the deterministic code path + the visual). Present identically in v1.2.0 — **not caused by cc-0028**, but exposed by it. **Required pre-broadening fix** (increment/derive `attempt_no`, or upsert; and check the insert error — a republish must never lose its audit row or report success on a failed write).

## 7. Render-coverage finding (does governed render cover LinkedIn?)

**Yes — the governed render covers Property Pulse LinkedIn image_quote drafts.**

- The image-worker governed branch is **client-gated, not platform-gated** — it gates on `client_id = 4036a6b5…` (Property Pulse) (image-worker v3.14.0). A LinkedIn PP image_quote draft enters it, and `isImageEnabled()`'s hardcoded Facebook flag does not block it (PP FB image generation is on).
- `select_template('property-pulse','linkedin','image_quote',NULL,seed)` returns **`status:"ok"` with a real governed winner**: template `0e006c5c-45aa-4829-82ec-89dd282a8c56` (`generic_market_insight_card_1x1_v1`, `assignment_status=production_proven`, approved_by PK), with fully-resolved governed assets — Background `bg_pp_home_keys_contract_table`, Logo `PP_logo_2.png`, `Scrim.opacity:48`. Identical shape to the Facebook result; platform-aware (some backgrounds return `platform_excluded` for LinkedIn).
- **Caveat A — aspect ratio:** LinkedIn currently receives the **1:1 governed card**, not a landscape one. A `generic_linkedin_landscape_card_1200x628_v1` template exists (appears as an *alternative*, not the winner).
- **Caveat B — unproven scope:** the LinkedIn winner carries advisory warnings **`platform_suitability_unproven`** (template) + **`platform_scope_unbacked`** (slot). Governed and production-proven in general, but LinkedIn platform scope is not formally backed — the selector warns visibly and proceeds (D2).
- **The real gate is upstream (assignment, not render):** GFCP `image_quote → linkedin:false` stops the resolver creating **new** LinkedIn image_quote drafts; existing ones are old (already `generated`, legacy) and won't re-render. Flipping GFCP is what lets new LinkedIn image_quote drafts be assigned → governed-rendered → published governed via v1.3.0.

## 8. Held state (production — DO NOT change without PK)

- **Cron `jobid 54` (linkedin-zapier-publisher, every 20 min) is PAUSED.** ⚠️ **All LinkedIn auto-publishing (text included) is currently OFF** until PK explicitly re-enables. This is a standing production impact.
- **GFCP migration `20260706120000` is UNAPPLIED** (image_quote stays linkedin:false).
- **No broadening approved** — no other client/draft; the direct `linkedin-publisher` EF stays undeployed.
- Staging artifacts left in place: queue row `6e9cb735` (now `published`), the local-only main commit `4e81263` (unpushed).

## 9. Carries → cc-0029 (follow-on)

1. **[required, safety] Fix F3** — `attempt_no` + unchecked `post_publish` insert — **before any broadening**.
2. Decide LinkedIn **aspect**: 1:1 vs the `generic_linkedin_landscape_card_1200x628_v1` template.
3. Decide whether to **formally back LinkedIn platform suitability/scope** (clear the `platform_*_unproven` warnings) or accept them.
4. Apply GFCP `image_quote → linkedin:true` **only after** the F3 safety fix.
5. Produce/await a **fresh, never-published** PP LinkedIn image_quote draft.
6. Confirm it renders through the governed/TMR path.
7. Publish exactly one supervised native LinkedIn image post.
8. Verify the `post_publish` audit row **persists** with `method='image'` and `image_sent=true`.
9. Only then decide on cron 54 re-enable + broadening.
10. **[hygiene]** Decide whether to remove today's duplicate/legacy PP post.

---

*Canonical lane record (Convention 1: registers get pointer entries only). Local-only landing — nothing pushed, nothing applied, nothing broadened. cc-0029 brief: `docs/briefs/cc-0029-linkedin-governed-image-quote-supply-proof-v1.md`.*
