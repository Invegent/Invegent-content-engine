CLAIMED · static-template-graduation-batch1-image-worker-deploy-v1 · shared main checkout · deploy gate (Convention-2 sequence approval) · 2026-07-30

# Result — Static Template Graduation Batch 1: image-worker deploy (announcement_card + carousel_cover)

**Brief file:** this outcome was PK-specified directly as a Convention-2 conditional-sequence approval
("Merge ... into current main ... Then deploy the image-worker through the sanctioned deployment
path"), pinning commit `fad8780` and naming the ordered steps + required post-deploy proofs. Grounded
against the prior compatibility-build outcome
`docs/briefs/results/static-template-graduation-batch1-image-worker-compat-result-v1.md`, whose own
§7 named this deploy step as the deliberately-deferred next gate.
**Executed by:** Claude Code (orchestrator + `branch-warden` + `deploy-verifier`)
**Completed:** 2026-07-30 Sydney

---

## 1. Result status

`Complete`. Merge landed on `main`, image-worker deployed v3.33.0 → v3.34.0 via the sanctioned path,
all required post-deploy proofs passed. Selector/registry state confirmed unchanged.

## 2. Commit(s)

- `a7577c2` — merge commit, `lane/tmr-winner-text-fields-ext` (`fad8780`) into `main`. Non-fast-forward
  (main had advanced 4 unrelated docs-only commits since the lane's base `b32d6018`); clean 3-way merge,
  no conflicts.
- Pushed to `origin/main` immediately after merge (required — `drift-check` hashes GitHub `main`, not
  the local working copy).
- Local `main` was then fast-forwarded onto 2 further unrelated origin commits (`e5f027d`, `a4cc4a0` —
  NDIS Instagram containment docs, zero overlap with `image-worker`) landed concurrently by another
  session, before this result doc's own commit.

## 3. Preconditions verified before merge

- **File-set exact match:** commit `fad8780` touches exactly the 4 reviewed files — `b1_production.ts`,
  `index.ts`, `b1_production_test.ts`, `cc0049_quote_card_winner_test.ts`. No 5th file, nothing outside
  `image-worker/`.
- **No concurrent-commit overlap:** the 4 commits on `main` between merge-base `b32d6018` and pre-merge
  HEAD `4f35380` are all docs-only (B-roll governance, client platform summary, NDIS FB/IG containment) —
  zero touch to `supabase/functions/image-worker/`.
- **Artifact hash unchanged:** recomputed `sha256(git diff base..lane -- supabase/functions/image-worker/)`
  = `93c243a6d53bf8b12658bdfe0c1a701babc4df14fd90c3912c7841a3015b57eb` — an exact match to the
  `reviewed_input_hash` recorded in the prior compat-build result doc's external review (agree/medium/
  high-confidence, zero pushback). No re-review needed; the diff was byte-identical to what was reviewed.
- **`branch-warden` precondition check:** verdict **safe** — clean working tree, merge-base is an
  ancestor of `main`, exact file-set match, zero intervening overlap, clean `merge-tree` dry-run, origin
  parity even.

## 4. Deploy sequence executed

1. `git push origin main` (merge commit `a7577c2`).
2. Drift refresh: `POST drift-check?write=true&slug=image-worker` → reclassified `A-LE` (stale) →
   `B-FD` (repo v3.34.0 ahead of deployed v3.33.0), as expected for a just-pushed entrypoint change.
3. `bash scripts/safe-deploy.sh image-worker --allow-warn` → WARN class=B-FD, permitted by
   `--allow-warn`; invoked `supabase functions deploy image-worker` (no `--no-verify-jwt` flag — relies
   on `config.toml`'s `verify_jwt=false` for this function, confirmed present before deploy).
4. Post-deploy drift refresh → resolved to `A-LE`, `deployed_hash_normalised == repo_hash_normalised`
   (`e37fc2d7…`), `direction=clean`.

## 5. Post-deploy proof — required checklist

All items independently recomputed from live ground truth (deployed bundle content, live DB reads, real
HTTP calls to the deployed function) — never taken from the merge-commit's own claims.

| Requirement | Result |
|---|---|
| Deployed bundle contains the two new named mappings | **PASS** — `deploy-verifier`: full-file byte comparison of deployed `b1_production.ts`/`index.ts` vs local HEAD is an exact match; `TMR_WINNER_TEXT_FIELDS` contains `generic_announcement_card_1x1_v1` + `generic_carousel_cover_1x1_v1`. |
| Existing production mappings remain present and unchanged | **PASS** — same byte-comparison; the 2 pre-existing keys (`generic_market_insight_card_1x1_v1`, `generic_quote_card_1x1_v1`) unchanged. |
| `generic_stat_hero_card_1x1_v1` remains unmapped | **PASS (double-verified)** — absent from `TMR_WINNER_TEXT_FIELDS` in the deployed bundle (only appears in a version-header comment noting it's out of scope); live call to the deployed worker forcing `variant_intent=stat_card.v1` / `expected_provider_template_id=54b305c8…` returned `{"ok":false,"error":"tmr_winner_unmapped: generic_stat_hero_card_1x1_v1"}`. |
| Unknown templates continue to fail closed | **PASS** — same call above; `tmr_winner_unmapped` throw path is exercised live, not just by static code reading. |
| Announcement-card supervised render succeeds through the deployed worker | **PASS** — `POST /functions/v1/image-worker {mode:governed_image_quote_smoke, variant_intent:announcement.v1, expected_provider_template_id:a75e7139…}` → `{"ok":true,"provider_template_id":"a75e7139…","version":"image-worker-v3.34.0"}`. |
| Carousel-cover supervised render succeeds through the deployed worker | **PASS** — same call shape, `variant_intent:carousel_cover.v1`, `expected_provider_template_id:c9a59faa…` → `{"ok":true,"provider_template_id":"c9a59faa…","version":"image-worker-v3.34.0"}`. |
| Both outputs remain 1080×1080 | **PASS** — both smoke outputs downloaded from `post-images/_smoke/governed_image_quote_v1.jpg` immediately after each call and independently verified via `file`: `1080x1080` for both. |
| Governed background and logo bindings remain intact | **PASS** — both live calls passed the smoke's own `assertGovernedAssetReachable` gate (fail-loud on unreachable/ungoverned assets) with `ok:true`; `m.post_render_log` rows for both renders show real governed `bg_pp_*` background keys (varying correctly by seed, matching the `p_seed` rotates-background-only design) and the standard governed Logo/Background reasons (`governed`, `license_ok`, `client_match`). |
| Current production winner and selector results remain unchanged | **PASS** — live `select_template` RPC call with production's own hardcoded params (`p_client_slug=property-pulse`, `p_variant_intent=null`, `p_format=image_quote`) still returns `generic_market_insight_card_1x1_v1` (`48cba556…`) as `selected`, exactly as before this deploy. Both new templates appear only in `alternatives` (ranked lower, never selected) — confirms the two new mappings cannot activate in the unforced production path. |
| No registry, assignment, suitability, or fit-status mutation occurred | **PASS** — `c.creative_template_variant_candidate.updated_at` for all 3 relevant templates (`stat_hero_card`, `announcement_card`, `carousel_cover`) reads `2026-07-03 01:11:31…` — predates this session entirely; `fit_status`/`required_field_mapping_status` unchanged. Zero DML in the diff (TS-only) and zero DML observed live. |

## 6. Constraints confirmed

- No DDL, no migration, no `GRANT`/`REVOKE` — code-only deploy.
- `verify_jwt` confirmed `false` both pre- and post-deploy (`list_edge_functions`), matching
  `supabase/config.toml` — no 401→502 regression risk for `x-image-worker-key` callers.
- Deploy did not touch any other edge function; `list_edge_functions` shows only `image-worker`
  (version 105→106, `updated_at` matching the deploy timestamp) changed.
- The two smoke test-render calls used the supervised `governed_image_quote_smoke` entrypoint only —
  no draft/publish path exercised, no `m.post_draft` row touched.

## 7. Open issues / carries (unchanged from the compat-build result doc)

1. The announcement_card residual-backstop-removal scenario (correlated `resolve_slot_assets` failure
   across the 5 higher-ranked `image_quote` candidates) — named, not re-litigated here; unchanged by
   this deploy since it's a pre-existing structural property, not something this diff introduces.
2. CTA/SlideNumber field values remain Creatomate's own `default_value_safe` placeholders, not final
   PK-authored brand copy — real values are a decision for the graduation outcome, not this one.
3. `generic_stat_hero_card_1x1_v1` remains explicitly out of scope, deferred to its own outcome per the
   original readiness packet's §5.2 structural-blocker finding.

## 8. Next recommended step

The outcome named in the task is complete: **Static Template Graduation Batch 1 — Announcement Card and
Carousel Cover, worker compatibility built, reviewed, merged and deployed.** The follow-on named by PK
— *real-draft, publish and selector graduation* — is a separate, later, freshly-gated lane (this deploy
does not itself change the selector's default winner or graduate either template into production
selection; both remain reachable only via explicit `variant_intent` override, exactly as designed).

---

## 9. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Every required post-deploy proof item passed, each independently recomputed against live state
  (deployed bundle bytes, live HTTP calls to the deployed function, live DB reads) rather than trusted
  from the deploy step's own success message.
- `deploy-verifier` flagged one documentation discrepancy (non-blocking): its own charter's drift-class
  vocabulary is inverted relative to the actual running `drift-check` classifier (`A-LE`=clean,
  `B-FD`=forward-drift, not the reverse as the charter text states) — recommend a future docs fix to
  `deploy-verifier`'s registration text, not an action item for this lane.
- No PK escalation required — no STOP condition tripped during the sequence.

## 10. Learning notes (chat fills this)

- Reusable pattern for "deploy then prove" outcomes with a supervised smoke entrypoint: call the
  *deployed* HTTP endpoint directly (not a local re-import of the module) for the strongest possible
  proof that the live bundle — not just the repo source — behaves correctly; download and independently
  verify binary output (dimensions) rather than trusting the function's own self-reported metadata.
- The production selector's default-params call (`p_variant_intent: null`) is a cheap, powerful
  regression check after any `TMR_WINNER_TEXT_FIELDS` change — it directly proves new mappings didn't
  shift the unforced production winner, rather than relying only on static reasoning about ranking order.
