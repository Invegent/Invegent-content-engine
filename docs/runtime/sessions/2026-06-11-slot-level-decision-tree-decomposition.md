# Slot-Level Decision Tree Decomposition — 7-Day Cohort (read-only evidence capture)

**Date:** 2026-06-11 Sydney
**Session role:** CCH (read-only verification + doc commit)
**Companion document:** `docs/runtime/sessions/2026-06-11-content-decision-trace-audit.md` (commit `6fd5f4d`) — the v3.34 post-level trace audit. This document is the slot-level proof of the same decision tree.
**Walls honoured:** 0 production mutation · 0 DB write · 0 D-01 · 0 deploy · 0 provider call · 0 cron change. All queries read-only against project `mbkmaxqhsohbtwsqolns`.

## Purpose

Prove the current ICE decision tree at **slot level**, not post level: decompose every slot created in the last 7 days from creation to final (or current in-flight) outcome, and trace the format decision chain across every stage — slot `format_preference` → fill `chosen_format` → advisor `recommended_format` → render format → published format.

## Method

Cohort = all `m.slot` rows with `created_at >= now() - interval '7 days'` (window 2026-06-04 → 2026-06-11). Joined read-only across `m.slot_fill_attempt` (latest filled attempt per slot), `m.ai_job` (via `slot_id`), `m.post_draft` (via `slot_id`), `m.post_render_log` (succeeded renders per draft, `ice_format_key`), and `m.post_publish` (per-draft publish ledger). Client names via `c.client`.

**Column-truth note discovered en route:** `m.post_draft.draft_format` is NOT a format column — it is a jsonb provenance blob (model + timestamp on live drafts; kill reason + timestamp on dead drafts). The final draft format **is** `recommended_format`; no downstream stage re-decides it. "Published format" has no independent column — publishers consume the draft as-is, so published format ≡ `recommended_format` by construction.

## 1 — Slot funnel (84 slots created in window)

```
84 created
├─ 44 future          (demand pre-materialised by m.materialise_slots; fill window not yet open)
├─  1 pending_fill    (window open, awaiting attempt)
├─  9 skipped
│   ├─ 2 pool_thin;no_eligible_evergreen   — refused BEFORE ai_job (pool=0; no threshold relaxation)
│   └─ 7 compliance_skip "not relevant to CFW scope"
│        — ai_job RAN → draft created → killed dead (null recommended_format, reason in draft_format jsonb)
└─ 30 filled → 30 ai_jobs → 30 live drafts
    ├─ 25 published
    │    ├─ 17 draft approval_status = 'published'
    │    └─  8 draft approval_status stuck at 'approved' (LinkedIn + YouTube publishers do not flip it)
    ├─  3 approved, not yet published (in flight)
    └─  2 ⚠ draft approval_status = 'published' but m.post_publish ledger contains FAILED rows only
```

**Stage totals:** 84 created → 31 fill-attempted-or-pending of which 30 filled → **37 ai_jobs → 37 drafts** (the 7 CFW compliance kills consume a full ai_job + draft generation before dying — the scope/compliance decision currently executes inside ai-worker, *after* generation, not at fill) → 25 published / 3 in flight / 2 ledger-anomalous / 7 dead.

Skip behaviour was correct where exercised: the 2 `pool_thin` skips refused to force-fill an empty pool rather than relax thresholds (0 `threshold_relaxed` in window).

## 2 — Format decision chain (all 37 drafts)

Chain notation: slot `format_preference[1]` → fill `chosen_format` → advisor `recommended_format` (FINAL) → render (`m.post_render_log.ice_format_key`, succeeded) → published.

| Chain pattern | n | Proof point |
|---|---|---|
| iq → iq → **iq** → iq render → published | 18 | preference honoured end-to-end |
| null → iq (COALESCE default) → **text** → no render → published/in-flight | 8 | advisor override; LinkedIn 7 + Instagram 1 |
| iq → iq → **text** → no render → published | 2 | advisor overrides an explicit FB preference too |
| iq → iq → **video_short_stat** → stat render → published | 1 | advisor upgrade to video |
| null → iq → **text** → ⚠ **carousel render succeeded** → published as text | 1 | chain-integrity break — orphan slides (F-ADVISOR-RESPIN-ORPHAN-SLIDES class) |
| avatar → avatar → **avatar** → heygen render → published | 2 | A2 hardcode (YouTube), zero deviation |
| iq/null → iq → **null (killed)** → no render → dead | 7 | compliance kill at advisor stage (all CFW) |

(iq = image_quote. The 2 YouTube avatar rows are the cohort's only YT slots already through to publish; the week's other 7 avatar publishes traced in the v3.34 audit came from slots created before this cohort window.)

## 3 — Slot-level conclusions

1. **`fill_pending_slots` is mechanical.** Non-YouTube fills chose `image_quote` **35/35** — either the FB `preferred_format_facebook` column or the `COALESCE(format_preference[1],'image_quote')` default on null IG/LI preferences. Zero deviations, zero decisions.
2. **ai-worker's format advisor is the real live format decision-maker.** Counting overrides (12) plus compliance kills (7), the advisor altered **19/37 fills (51%)**. All format diversity in the system is created at this single node.
3. **Render and publish execute rather than decide.** Renders matched the advisor-final format in every case but one; publishers carry the draft format unchanged (no format column, no re-decision).
4. **One chain-integrity break exists:** a successful carousel render against a text-final draft (advisor re-ran after the visual spec was consumed) — wasted Creatomate credits + orphan `m.post_carousel_slide` rows. Already carried as F-ADVISOR-RESPIN-ORPHAN-SLIDES (v3.34).
5. **Compliance skip currently happens AFTER AI generation, not before.** All 7 CFW kills consumed a full ai_job + draft generation before dying. Intentional in outcome (v3.32 classification stands) but paid for in generation cost.
6. The 2 `pool_thin` skips and 0 threshold relaxations show the demand side degrades safely when supply is thin.

## 4 — New findings → proposed carries

Recorded here as **proposed carries**. NOT yet added to `docs/00_action_list.md` — that file is >80KB and CCD-routed (see `docs/briefs/v3.34-doc-sync-ccd-patch.md`, commit `b77f4f98`, still pending CCD apply). These four should be folded into the next `00_` patch cycle (v3.35 or appended to the pending v3.34 apply at PK's direction).

### P2 — F-PUBLISH-LEDGER-STATUS-MISMATCH (proposed)
2 drafts in cohort carry `approval_status='published'` while `m.post_publish` contains **failed rows only** (no successful publish row). Either the asset went out and the success row was never written, or the status flipped on a failure. Ledger/status integrity investigation needed: identify the 2 drafts, check platform-side existence of the posts, find the code path that flipped status without a success row. Read-only investigation first; any fix gated.

### P2/P3 — F-IG-TEXT-PALETTE-GAP (proposed)
1 Instagram draft has `recommended_format='text'` despite taxonomy `t."5.3_content_format".platform_support.instagram=false` for text_post. The advisor palette (t.5.3 `platform_support` ∩ `c.client_format_config`) did not enforce the platform_support leg for this case. Draft is approved and unpublished — likely to strand or fail at the IG publisher (IG requires media). Needs an advisor palette enforcement check in ai-worker; watch the draft's outcome as evidence either way. No patch now.

### P3 — F-PUBLISHER-STATUS-FLIP-INCONSISTENT (proposed)
FB publisher flips drafts to `approval_status='published'`; LinkedIn and YouTube publishers leave successfully published drafts at `'approved'` (8 of 25 in cohort). Cosmetic but pollutes any status-based reporting and inflates "approved not published" counts. Candidate fix: align status flip across publishers in their next respective patch windows. Not standalone-deploy-worthy.

### P3 — F-CFW-COMPLIANCE-PREGEN (proposed, efficiency)
CFW compliance skips currently consume a full ai_job + draft generation before being killed (7 in this cohort; ~12/week historically). Consider whether scope/compliance rejection can run BEFORE generation (e.g. a cheap relevance pre-check at fill or a first-pass classifier before full draft synthesis) in a future gated patch. **Do not implement now** — the post-generation kill is functioning correctly as a safety net; this is a cost optimisation only.

## 5 — Repo / governance state

- This document is evidence capture only. No code patched, no config changed, no production mutated, no D-01 opened, no deploy, no provider call, no cron change.
- `00_sync_state.md` / `00_action_list.md` untouched this session pending CCD apply of the v3.34 patch spec (`b77f4f98`).
