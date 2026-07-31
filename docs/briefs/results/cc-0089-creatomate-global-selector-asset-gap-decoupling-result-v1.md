CLAIMED v6.92 · cc-0089-creatomate-global-selector-asset-gap-decoupling · main · close · 2026-07-31T04:45:59Z

# Result cc-0089 — Creatomate Global: Selector and Asset Gap Decoupling

**Brief file:** `docs/briefs/cc-0089-creatomate-global-selector-asset-gap-decoupling-brief-v1.md`
**Executed by:** Claude Code (orchestrator + `db-rls-auditor` + `ef-builder` + `branch-warden` + external review)
**Completed:** 2026-07-31 Sydney

---

## 1. Result status

`Complete` — **cc-0089 GRADUATED / RELEASED / COMPLETE.**

## 2. Commit(s)

- `701b374` — `cc-0089: decouple selector ranking from Asset Gap tiebreak + fix publisher audit-write gap` (migration apply + `task_05bf8b3d` publisher fix, T3 PK apply gate)
- `2b71d23` — `fix(image-worker v3.37.0): cc-0089 PP announcement_card CTA content fix`
- `4fbe10d` — `fix(image-worker v3.38.0): cc-0089 follow-up #2 — smoke-only CTA field-merge stomp`

## 3. Files changed

- `supabase/migrations/20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql` — new table + `select_template` CREATE OR REPLACE + 1 governed DML row
- `supabase/migrations/ROLLBACK_20260730140000_...sql` — companion rollback
- `supabase/functions/publisher/index.ts`, `instagram-publisher/index.ts`, `linkedin-publisher/index.ts` (+ 6 `attempt_no.ts`/test pairs) — `task_05bf8b3d` audit-write fix
- `supabase/functions/image-worker/creative_contract.ts`, `branch_b_proof.ts`, `index.ts` (v3.37.0) — PP CTA content fix
- `supabase/functions/image-worker/smoke_field_merge.ts` (+test), `index.ts` (v3.38.0) — smoke-only field-merge fix

## 4. Actions taken

1. **Selector-policy graduation.** New service-role-only table `c.creative_template_selector_policy` (template_id, platform, priority), read EXCLUSIVELY by `select_template` as a within-rank-bucket tiebreak — `derive_asset_appetite`/`analyze_asset_gap` never reference it, confirmed both directions by direct source read. One governed row: `generic_announcement_card_1x1_v1` × facebook, priority 100.
2. **Live selector winner/alternative.** `select_template('property-pulse','facebook','image_quote',NULL,NULL)` selects **`generic_announcement_card_1x1_v1`** (`fb8a4a9b-904e-4a50-8ade-873aff4a53ae`) — the only facebook `production_proven` template in the set. `generic_market_insight_card_1x1_v1` remains the top-ranked, immediately rollback-ready **alternative**.
3. **Emergency correction mid-lane.** `select_template` was found to be a live production consumer (`image-worker/index.ts` production branch), not dark as initially believed. On discovery, the policy row was deleted immediately (PK ruling); `db-rls-auditor` independently confirmed PASS: market-insight reverted as winner, Asset Gap output byte-identical to baseline, table fully empty, no unrelated client/platform touched.
4. **`task_05bf8b3d` live-proven** against the real `m.post_publish` table and its real `uq_publish_attempt` constraint: two sequential real inserts got distinct `attempt_no` (1, 2) with zero collision; the pre-fix naive-insert pattern was independently shown to genuinely violate the constraint (`23505`), confirming the defect and the fix.
5. **Supervised hold, not blind trust.** Before re-promoting, Property Pulse Facebook publish was paused (`client_publish_profile.paused_until`) so selection/rendering could proceed naturally while nothing could actually post — this is the "narrowest available hold," scoped to PP+facebook only.
6. **Visual gate — HOLD then PASS.** First supervised render (`governed_image_quote_smoke`) showed a real defect: the CTA button rendered Creatomate's generic placeholder ("Call to action") because no PP brand copy had ever been authored, and production would show the identical placeholder. PK: HOLD.
7. **image-worker v3.37.0** — real PP CTA copy ("Explore the latest market update") added as a `creative_contract.ts` `renderer_fixed` entry, read via `branch_b_proof.ts`'s `buildProofFieldsFromDraft` (mirrors the existing cc-0049 attribution/source_label pattern exactly). NDIS/CFW/Invegent contracts untouched, proven byte-identical by full-object-equality tests. 164/164 tests. `branch-warden` safe, external review agree/medium/high-confidence.
8. **image-worker v3.38.0** — re-render after v3.37.0 still showed the placeholder (byte-identical `props_hash` before/after). Traced: the `governed_image_quote_smoke` branch's own field-merge stomped the contract-resolved `cta` back to `undefined` whenever the caller omitted an explicit override — a pre-existing, unrelated smoke-only bug (production's own call site has no such stomp, confirmed unaffected). Fixed via a new pure helper `mergeSmokeOverrideFields`: caller-supplied CTA overrides only when explicitly present; omitted CTA preserves the contract-resolved value. 9 new regression tests (omitted/explicit × cta/slide_number). 173/173 full suite. `branch-warden` safe, external review agree/low/high-confidence.
9. **Visual PASS, confirmed unforced.** Re-ran the smoke with NO manual CTA override — output byte-identical (sha256) to the manually-forced proof render. Real CTA copy now renders correctly by default, exactly as a natural production draft would produce it.
10. **Pause cleared deliberately.** `paused_until` set back to `NULL` (not left to expire) — normal PP-facebook publish state restored.
11. **S5 Variant A restored.** Exclusion was achieved solely via the pause (no S5 config was ever touched); clearing it fully restores PP × Facebook × image_quote eligibility with zero S5-side changes.

## 5. Constraints confirmed

- No client other than Property Pulse touched — confirmed structurally: `generic_announcement_card_1x1_v1` has exactly one row in `c.creative_template_client_assignment` system-wide (PP), so no other client could ever reach the tiebreak regardless of the policy table's schema.
- No carousel, B-roll, or Dashboard portfolio-weights work.
- No worker layout-logic (`buildTmrRenderPlan`) change — both image-worker fixes are additive field-merge/content changes only, confirmed by diff.
- No S5 schedule/config change of any kind — exclusion and restoration both went through the publish-profile pause alone.
- `verify_jwt: false` preserved across both image-worker deploys (v3.37.0, v3.38.0) via `config.toml`'s explicit per-function setting; drift-check clean (`A-LE`) after each.
- Unattended automatic selection was never left running unattended past the scope PK authorized at each step — the emergency correction, the supervised hold, and the deliberate pause-clear were each an explicit, evidenced decision.

## 6. Open issues

- None blocking. Two `m.post_publish` audit rows from the `task_05bf8b3d` live-proof test remain permanently (by design — `m.prevent_post_publish_delete` blocks deletion), clearly labeled as test evidence via `error`/`request_payload` text; the associated test draft is `voided`.

## 7. Next recommended step

None — workstream closed. Dashboard Template Portfolio Mix / Repetition Controls (named PK carry, `cc-0088`/v6.78) remains the next Creatomate-adjacent outcome, not part of this lane.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matches the outcome exactly: selector/Asset Gap decoupling proven structurally and empirically, Announcement Card genuinely selectable with a governed real render, publisher audit-write proven against real constraints, rollback proven twice (once under real emergency correction, once by design), no other client/schedule/S5 config touched.
- A mid-lane authorization-scope correction occurred (selector believed dark, found live) — handled by immediate rollback + independent re-verification before any re-promotion, not by continuing on the mistaken premise.
- Two real defects were found and fixed live (CTA placeholder content gap; smoke-only field-merge stomp) — both disclosed with exact mechanism, both externally reviewed, both proven fixed via byte-level evidence, not visual impression alone.

## 9. Learning notes (chat fills this)

- "Ships dark, no production consumer" claims in code comments can go stale silently when a later lane wires the function into production without updating the earlier comment — worth grep-verifying any such claim against actual call sites before trusting it for a risk assessment, not just reading the nearest comment.
- A diagnostic/smoke entrypoint's own field-composition code can have defects independent of the production path it's meant to mirror — matching `props_hash` (or any content-identity hash) before/after a supposed fix is a fast, reliable way to catch "the change didn't actually take effect here" versus a rendering/caching red herring.
