# 2026-06-12 — Option C / A2 review-gate decision-prep evidence pack (gate w/c 2026-06-15)

**Status:** PK-approved gate-prep artifact. Read-only evidence assembly; docs/session file only — **0 register edits / 0 code / 0 DB / 0 Advisor / 0 ai-worker / 0 format-policy / 0 config / 0 provider-worker call / 0 cron / 0 D-01 / 0 production change. T1 untouched. `00_` registers untouched (at v3.40 parity, CCD commit `8304468a`).**
**Actors:** CCH (evidence assembly + this record).
**Authority impact:** none (read-only evidence; as-built decision flow + T1 unchanged). This artifact is INPUT to the Option C/A2 review gate, not a decision record.

---

## 1. Gate-trigger status: `avatar_identity` telemetry HAS ARRIVED

1. The review gate's trigger condition ("w/c 2026-06-15, **or earlier on meaningful `avatar_identity` telemetry**") has fired.
2. **Two post-v2.1.1 HeyGen renders populated `avatar_identity`** in `m.post_render_log` (2026-06-11 ~08:00 + ~10:00 UTC ticks, both `succeeded`; the two 2026-06-10 rows pre-dated v2.1.1 — one has no key, one has the key empty).
3. **Both show `avatar_selected_by='fallback_limit1'` and `stakeholder_role=null`** — the v3.34 arbitrary-first finding is now PROVEN on live renders, not just inferred from code.
4. **Current de-facto YouTube hosts (matched via `c.brand_avatar.heygen_avatar_id` → `c.brand_stakeholder.role_code`):**
   - **NDIS Yarns: "Alex — NDIS Participant (Realistic)"** (role `participant`; `talking_photo_id b3a7e888…`)
   - **Property Pulse: "Tenant (Realistic)"** (role `tenant`; `talking_photo_id 47a5c85c…`)
5. **This proves arbitrary fallback host selection is live and brand-governance unsafe:** both channels' first-person expert narration is fronted by an arbitrarily-selected stakeholder persona nobody chose (PP's market commentary delivered by a "Tenant"), and `LIMIT 1` without `ORDER BY` carries **no stability guarantee** — the face could silently change between renders. Deployed versions verified read-only via `m.vw_ef_drift_current`: heygen-worker 2.1.1 A-LE, ai-worker 2.13.0 A-LE.

## 2. Format-behaviour evidence base (v3.34 + v3.39 + v3.40, all live-verified)

- **Social slot monoculture:** `image_quote` stamped on 100% of FB/IG/LI comparable slots (82/80/64 in 30d) via the `fill_pending_slots` fallback; `preferred_format_linkedin`/`_instagram` NULL for every client.
- **YouTube default:** `video_short_avatar` hardcoded in `m.materialise_slots` on 100% of YT slots (36/36) — the true home of A2.
- **The Advisor is the only meaningful source of format diversity in production**, and it behaves correctly: LinkedIn's 71.9% "override" is valid content-fit correction (42/46 → text, 46/46 published — v3.40); Instagram's 11.3% is palette-gated (text excluded); Facebook's 29.3% is dampened by the `preferred_format_facebook='image_quote'` bias instruction.
- **v3.39:** the Format Mix "No Format" bucket was intentional compliance skips (51/51), not pipeline failure; the panel has a semantics gap (counts dead drafts); CFW feed-scope / F-CFW-COMPLIANCE-PREGEN / intentional-skip observability remain separate carries — none of them are format-policy questions.
- **v3.40:** LinkedIn text-heavy output is valid and published; **F-AIW-PREF-COL-HARDCODE is confirmed-in-source but inert today** — it becomes blocking only if platform-specific preferred-format config is activated, and **must be fixed before any such config is set**.

## 3. A2 avatar 30-day stats (read 2026-06-12)

26 `video_short_avatar` drafts (NY 12 / PP 13 / CFW 1); 24 via the A2 override; 22 realised (`youtube_video_id` set) — consistent with v3.33 (~8% overall share, skew not reproduced). Avatar inventory rich and fully role-tagged: NY 11 + PP 13 active `c.brand_avatar` rows (all `stock` type, realistic + animated variants, each joined to a `brand_stakeholder.role_code`) — **Branch B's data layer already exists; only the ai-worker wiring (`stakeholder_role` emission) is absent.**

## 4. The missing evidence: engagement

**Per-format engagement evidence does not exist yet.** `m.post_format_performance` (30d window, post_count ≥ 3) accumulates volume (NY: text 82, image_quote 43, carousel 8; PP: image_quote 40, text 29, kinetic 15, stat 10; CFW: image_quote 12; Invegent: image_quote 22) but **`avg_engagement_rate` is effectively NULL on nearly every row** (the only non-null values are 0.00 on video rows). Consequences: the Advisor's performance-bias input is empty, and **Option C's core premise — an evidence-based mix policy — has no evidence feed to run on.** Likely linked to existing register carries (NY-fb insights coverage gap; YouTube insights worker manual-invoke-only, no cron). Also unknown: LIMIT-1 face stability over time (2 data points, one per client); whether text-heavy LinkedIn output performs.

## 5. Option C status (unchanged)

6. **Option C remains only a preferred reference hypothesis** — the standard against which Option A (formal retirement) and Option B (continued dormancy) are compared at the gate.
7. **Option C implementation remains UNAPPROVED:** policy reconnection, mix-table reseed (2026-04-22 seed carries ~19% taxonomy-illegal cells), narrative layer, and Advisor changes all remain unapproved. Live chain (Demand → Slot → Fill → Advisor → Draft → Render → Publish) unchanged; T1 unchanged.
8. **Engagement evidence is still missing** (`avg_engagement_rate` effectively NULL — §4), so the format-mix fork cannot yet be decided on evidence.

## 6. Recommended Monday posture (PK-approved framing)

9. **Decide A2 narrowly; keep Option C parked.** The avatar question is decision-ready; the format-mix question is not — they share a decision surface but have different evidence maturity.
   - **Branch A (pin single branded host, config-only) — DECISION-READY.** Evidence complete; near-zero implementation risk (deactivate all-but-one `brand_avatar` per client); trivially reversible (reactivate rows); directly fixes the proven problem (arbitrary, unstable, possibly off-brand host). Requires one PK input: name the standing face for NDIS Yarns and for Property Pulse.
   - **Branch B (role-aware wiring) — DEFERRED.** Data layer ready; needs an ai-worker patch (emit `stakeholder_role`) + a content→role mapping decision; candidate bundle with the eventual F-AIW-PREF-COL-HARDCODE ai-worker patch; ef_deploy-gated; reversible by redeploy.
   - **Branch C (relax to content-fit) — DEFERRED.** Removes the `materialise_slots` hardcode; sql_destructive-gated; weakest evidence case — no engagement data to justify changing avatar volume in either direction.
   - **Option C — REMAINS PARKED.** Monday's higher-value output: commission the missing evidence feed — a read-only diagnosis of why `avg_engagement_rate` is NULL (insights→format-performance join / coverage gaps) — rather than deciding the fork blind. A mix policy decided without engagement data would be a second seeded guess like the 2026-04-22 mix.

## 7. Do-not-build boundaries

**Do not build yet, under any branch:** no Advisor logic change; no `materialise_slots` change; no mix-table reseed; no policy-envelope reconnection; no narrative layer; no panel relabels; no `preferred_format_*` activation.

**Safe to build later ONLY IF:**
- **Branch A** — only after PK names the host per client; then config-only, still gated (ops-change D-01 + PK approval).
- **Branch B** — only after Branch A is settled, bundled with the F-AIW-PREF-COL-HARDCODE fix in a reviewed ai-worker patch (ef_deploy D-01).
- **Branch C** — only after per-format engagement data exists AND shows avatar volume is mis-allocated (sql_destructive D-01).
- **Any `preferred_format_linkedin`/`_instagram` value** — only after the hardcode fix is deployed.
- **Any Option C implementation** — only after the engagement-evidence feed is live and a fresh pool-adequacy check passes.

## 8. Constraint compliance (this lane)

Read-only evidence assembly: 6 SELECT-only queries against production `mbkmaxqhsohbtwsqolns` (render log, drift register view, information_schema, brand_avatar/brand_stakeholder, post_draft, post_format_performance) + this session-file commit. **0 register edits / 0 code / 0 DB write / 0 migration / 0 Advisor change / 0 ai-worker change / 0 format-policy change / 0 config change / 0 provider or worker call / 0 cron change / 0 D-01 / 0 production mutation. T1 untouched. `00_` registers untouched (v3.40 parity per CCD `8304468a`).** Register recording of this gate-prep (if wanted) is a separate PK-approved pass.
