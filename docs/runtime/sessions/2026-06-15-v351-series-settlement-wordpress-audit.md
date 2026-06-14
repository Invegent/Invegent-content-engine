# v3.51 — Three-Series Settlement + WordPress Direct-Read Audit (docs-only)

**Date:** 2026-06-15 (Sydney)
**Lane:** Register reconciliation — docs-only. 0 code / 0 SQL / 0 migration / 0 function / 0 deploy / 0 dashboard / 0 T1 / 0 production mutation / 0 D-01.
**Files this pass:** `docs/00_sync_state.md` (v3.51 banner), `docs/00_action_list.md` (header + WP carry flip + new render-latency carry), this session note.
**Authority impact:** none — no T1 promotion, no architecture change, no decision-tree change.

---

## Part A — WordPress publisher direct-read audit → COMPLETE / VERIFIED (NO defect)

Read-only audit (1 EF read + 5 SQL reads; 0 D-01) of `wordpress-publisher` (v1.0.0, sha `a446e9ab…`) to determine whether it shares the YouTube missing-platform-filter isolation defect fixed in youtube-publisher v1.12.0 (v3.50).

**Finding: NO defect. `facebook → website` is intentional owned-publish architecture, not accidental fan-out.**

- wordpress-publisher IS direct-read on `m.post_draft`, but it **deliberately filters `pd.platform = 'facebook'`** (plus `approval_status='approved'`, title/body present, `LENGTH(body)>50`, `NOT EXISTS` website publish, `LIMIT 3`) and posts the FB draft's title+body as a WordPress **article**. It never selects instagram/linkedin/youtube drafts. This is the opposite of the YouTube class (a *missing* filter); here the source filter is present and intentional.
- `website` is a recognised platform in `t.5.0_social_platform` (id 28) but a **non-router (`is_router_target=false`), `owned_publish`, article/link** destination — noted "Legacy platform code. Same semantic as blog." `website` is **never** a `post_draft.platform` (drafts exist only for facebook/instagram/linkedin/youtube), and there is no website publish-profile or channel. There is no native website draft; repurposing the facebook draft's text is the intended (only) mechanism.
- **Blast radius (all-time):** 26 rows, **CFW only** (the sole `website_publish_enabled` client), **facebook-source only**, all `status='published'`, 2026-04-19 → 2026-06-14. By source format: text 15, image_quote 7, video_short_stat 2, video_short_avatar 1, video_short_kinetic 1.
- **Output type:** always text/article (title+body → `/wp-json/wp/v2/posts`; no media). 11/26 rows are image/video-format source drafts rendered text-only — a **content-fidelity caveat** (editorial), **not** an isolation defect.

**Classification:** expected/intentional behaviour. **No platform-isolation fix required. No historical remediation required.** WordPress cross-post behaviour is **architectural, not accidental fan-out.**

---

## Part B — Three-series production proof (settled)

**F-SERIES-PERSONA-CAPTURE stays COMPLETE / DEPLOYED / VERIFIED — not reopened.**

- Persona generation **PASS**, persistence **PASS**, propagation **PASS**, influence **PASS**, avatar-boundary-preserved **PASS**.
- **33 child slots** generated (NY 4 + PP 4 + CFW 3 platforms × 3 episodes).
- Persona reached `creative_intent.source_material.persona`; drafts demonstrated persona-specific voice.
- Avatar differentiation remains out of scope (Branch B) — the persona lane captures intent only and does not drive avatar selection.

**Schedule-fidelity production evidence HEALTHY.** No NOW()-collapse, no ~23.5h-early signature, `published_at` always ≥ slot time. **F-SLOT-SCHEDULE-FIDELITY stays P4 / WATCH — not closed.**

**YouTube isolation fix holding.** youtube-publisher v1.12.0 (v3.50) post-deploy stays clean: 0 new cross-publishes, 0 non-YouTube drafts stamped with YouTube IDs. **Positive-publish remains a WATCH (OPEN)** — no eligible YouTube draft existed post-deploy; the first legitimate post-v1.12.0 YouTube publish must prove YT publishes **while its FB/IG/LI siblings receive NO YouTube `m.post_publish` row.**

---

## Part C — Remaining active production carries

| Carry | Status |
|---|---|
| F-SERIES-AVATAR-DIFFERENTIATION (Branch B) | P3 DEFERRED |
| F-SERIES-FORMAT-DIVERSITY | P3 DEFERRED / OPEN |
| YT-CROSSPUB-HISTORICAL-REMEDIATION | P2 OPEN (already-uploaded cross-platform YouTube videos unresolved) |
| Avatar-video render-latency / asset-guard-recovery | OPEN (late avatar renders not auto-recovered after asset-guard skip; `release_queue_on_asset_ready` excludes `video_short_avatar`; `heal_reset_stuck_queue` resets only running/locked) |
| YT positive-publish | WATCH / OPEN (first legit post-v1.12.0 YouTube publish) |

---

**Carries closed this pass:** WP-DIRECT-READ-ISOLATION-AUDIT (→ COMPLETE / VERIFIED, no defect, no remediation).
**Carries opened this pass:** Avatar-video render-latency / asset-guard-recovery (OPEN, register-surfaced).
**Carries unchanged:** F-SERIES-PERSONA-CAPTURE (COMPLETE/DEPLOYED/VERIFIED), F-SLOT-SCHEDULE-FIDELITY (P4/WATCH), YT positive-publish (WATCH/OPEN), F-SERIES-AVATAR-DIFFERENTIATION (P3 DEFERRED), F-SERIES-FORMAT-DIVERSITY (P3 DEFERRED), YT-CROSSPUB-HISTORICAL-REMEDIATION (P2 OPEN).

**Authority impact: none.** Docs-only; 0 production mutation; 0 D-01. PHASES leg N/A.
