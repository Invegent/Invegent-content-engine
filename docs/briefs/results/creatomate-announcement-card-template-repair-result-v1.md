# Result — Creatomate Global: Announcement Card Template Repair

**Brief:** PK outcome spec "CREATOMATE GLOBAL — ANNOUNCEMENT CARD TEMPLATE REPAIR" (issued in-session, 2026-07-30; supersedes/corrects part of `docs/briefs/creatomate-global-static-graduation-batch1-gate1-brief-v1.md` Part A's original mechanism assumption)
**Executed by:** Claude Code (orchestrator + subagent chain)
**Completed:** 2026-07-30 Sydney

---

## 1. Result status

**Complete.** Headline/subtitle collision defect repaired, stress-tested across 8 render cases (7 isolated + 1 real end-to-end production-pipeline render), PK visual verdict: **APPROVE**.

## 2. Commit(s)

- `8ea2456` — `fix(image-worker): announcement_card headline/subtitle layout guard (v3.36.0)` — merged to `main`, pushed, deployed, `deploy-verifier` PASS.

## 3. Files changed

- `supabase/functions/image-worker/b1_production.ts` — modified: one new entry added to the existing `TMR_WINNER_LAYOUT_GUARD` table for `generic_announcement_card_1x1_v1` (`Headline.height: '20%'`, `Headline.font_size: null`, `font_size_minimum: '24 px'`, `font_size_maximum: '72 px'`). `buildTmrRenderPlan` itself untouched — it already generically reads this table.
- `supabase/functions/image-worker/index.ts` — VERSION bump v3.35.0 → v3.36.0 + dated header comment. No logic change.
- No migration, no other file.

## 4. Actions taken

- **Feasibility check (load-bearing, corrected an assumption in PK's own outcome spec):** PK's instructions asked for a "provider-template layout" repair with a "do not change image-worker code" boundary. Directly tested Creatomate's template API with the real key from Downloads: `GET` works (200), `PATCH`/`PUT` both 404 ("endpoint does not exist"), `POST` returns 200 but is a demonstrated no-op (re-fetch confirmed byte-identical template, nothing changed). **Creatomate has no template write/update API of any kind** — only a human editing the template manually in Creatomate's web Template Editor can change its layout. This is not something available to an automated lane. Reported this conflict to PK; PK's ruling: keep the already-deployed code-level fix (`b1_production.ts`'s `TMR_WINNER_LAYOUT_GUARD` entry, from the earlier Part A gate) as the actual repair mechanism, and treat "do not change image-worker code" as governing *further* changes, not the already-shipped fix.
- **Root cause, confirmed via the live template's own JSON** (`GET /v1/templates/{id}`): `Headline` is top-anchored at `y: 32%` with no height bound and a fixed `font_size: 72`; `Subtitle` sits at a fixed `y: 55%`. A long real headline wraps to more lines than the unbounded box was ever measured against and grows into the subtitle. Exactly the same defect class already fixed once before in this repo for a different template (`generic_market_insight_card_1x1_v1`), via the same `TMR_WINNER_LAYOUT_GUARD` mechanism.
- **Calibration, before writing any code:** 3 non-destructive Creatomate template-mode render probes (`POST /v1/renders` with `template_id` + `modifications` — no template write, no DB write) against real headline text pulled live from `m.post_draft`. Worst-case real headline (94 chars) confirmed the defect independently (5-line collision, worse than the original 78-char failure) and then confirmed the fix (`Headline.height: '20%'`, `font_size: null`, min `24px`/max `72px`) renders clean. Same values also verified clean on the exact 78-char headline that triggered the original REJECT, and on a short 52-char headline (no awkward over-shrinking).
- **Code change:** `ef-builder` (isolated worktree) added the single new `TMR_WINNER_LAYOUT_GUARD` entry, mirroring the existing `market_insight_card` entry's shape and comment density exactly. `deno check`/`lint`/`test` all clean (158/158 tests pass, including pre-existing dedicated test cases for this scenario). `branch-warden` verdict: safe (based on true current `origin/main`, exactly 2 files touched). External review (`ask_chatgpt_review`, hash-pinned): **agree**, medium risk, high confidence, no escalation.
- **PK merge/deploy gate:** authorized. Merged, deployed via the sanctioned `scripts/safe-deploy.sh --allow-warn` wrapper, drift refreshed clean (`A-LE`, repo == deployed hash), `deploy-verifier` confirmed PASS on marker/version/`verify_jwt`.
- **Full stress-test proof, per PK's required-proof list:**
  1. Previously rejected text (78-char headline) — clean, 3 lines, no overlap.
  2. Worst-case real headline (94 chars) — clean, 3 lines (was a 5-line collision before the fix).
  3. Short headline (52 chars) — clean, full 72px font, no awkward shrink.
  4. Max-length subtitle (~90 chars, wraps 3 lines) — clean, no CTA/footer squeeze.
  5. High-density/busy background (market-data chart grid) — clean, contrast holds.
  6. Absolute code-enforced headline ceiling (~178 chars, `B1_HEADLINE_MAX_CHARS`) — auto-shrinks to 4 lines at the font floor, still zero collision, no clipping.
  7. **Real end-to-end production-pipeline render**, not an isolated probe: reused the `b1_variant_intent_override` mechanism on a clean, queue-free approved PP draft (`6b39c4b9-bb3f-4f86-be45-f2b377f5fa7a`), picked up naturally by the standing 15-minute `image-worker-15min` cron, confirmed via `m.post_render_log` (`provider_template_id=a75e7139…`, `variant_intent_override_used=true`), a **third** distinct governed background (`bg_pp_subdivision_land_estate`, aerial). Independently re-verified 1080×1080. Clean — full worker contract (selector → `buildTmrRenderPlan` with the new guard → governed asset resolution → render → storage → DB → render_log) confirmed intact end-to-end.
  8. Both test drafts (`92d98a6e…` used earlier in the Part A gate, and `6b39c4b9…` used for this repair's real-pipeline proof) rolled back to their exact prior state — DB row and storage bytes (`cmp` byte-exact match confirmed) — nothing left in an altered state.
- **PK visual verdict: APPROVE.**

## 5. Constraints confirmed

- Image-worker code: only the one already-PK-approved `TMR_WINNER_LAYOUT_GUARD` entry from the earlier gate; no further code change made in this repair lane.
- Selector ranking: not touched.
- Template not promoted: `generic_announcement_card_1x1_v1` remains unselected by any natural production caller; nothing in this lane changed that.
- Carousel: not touched, not mentioned.
- Market-insight incumbent: untouched — confirmed unforced winner throughout.
- Provider template identity, field names, Background/Logo elements, 1080×1080 output, brand styling, and the image-worker mapping contract: all preserved — confirmed the template's own `provider_template_id`, element names, and all other elements are byte-identical to before (only the render-time `modifications` payload changed, never the template).
- Real content was never shortened to make the template pass — the fix works at the actual observed worst-case (94 chars) and the code's own absolute ceiling (~178 chars), not by capping input.

## 6. Open issues

- None blocking. The only residual note: `Headline.font_size_minimum: '24 px'` is the floor tested against the code's absolute 180-char ceiling; no real production headline has ever exceeded 94 chars, so this floor has generous headroom for realistic content.

## 7. Next recommended step

Per PK's own framing: the next fresh outcome is **"Announcement Card Publish and Selector Graduation"** — a new Gate-1 lane (native publisher proof, platform suitability, selector-ranking-change packet with rollback proof, stopping at the registry/selector apply gate, exactly as originally scoped in Part A before the defect was found). Not started in this session.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the corrected outcome exactly once the template-API feasibility conflict was surfaced and PK ruled on it.
- All constraints respected; no unexpected files changed.
- All required proof cases delivered, including the real end-to-end pipeline case PK specifically asked for (not just isolated API probes).
- New risk avoided: nearly attempted a template-layer edit PK's instructions implied was possible; empirical testing (not assumption) caught that it wasn't, before any wasted effort.

## 9. Learning notes (chat fills this)

- **When a PK instruction assumes a capability, test the assumption before either complying or refusing.** The new outcome's "modify only the provider-template layout" boundary rested on an implicit assumption that template layout is API-editable. It isn't — but the right response wasn't to silently ignore the instruction or silently keep the old fix; it was to empirically prove the constraint (PATCH/PUT 404, POST confirmed no-op) and bring the conflict back to PK explicitly, with evidence, before proceeding.
- **Reusable pattern:** a per-render `modifications` table (`TMR_WINNER_LAYOUT_GUARD`) keyed by template winner name is a durable, low-risk mechanism for fixing provider-template geometry defects without ever needing template write access — this is now proven twice (market_insight_card, announcement_card) and should be the default first option for any future "template renders wrong" defect in this family.
- Testing the actual code-enforced ceiling (not just realistic worst-case) surfaced confidence the fix is structurally robust, not just empirically lucky on the samples tried — worth doing as standard practice for any auto-fit/bounded-box layout fix.
