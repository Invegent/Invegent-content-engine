# 2026-06-13 — T1 Content Studio Creative Intent: deploy + live verification close-out

**Status:** DEPLOYED + LIVE-VERIFIED (PASS WITH CARRY). PK-approved D-01 `76c8d9c8-b582-48b3-9fbf-c333811d8656`.
**Builds on:** T0 governed manual-slot path (`38b0d0a`). Brief: `docs/briefs/content-studio-t1-creative-intent.md`. Implementation brief: `633b321`.
**Scope locks honoured:** additive only; ai-worker / Advisor / compliance / render workers / publishers UNCHANGED; no T2; no series/campaign; no register reconciliation (held).

---

## 1. What shipped

- **content-engine `main` `9e4ceb12`** ← merge of `feat/t1-creative-intent-content-package` (`95b59382`). Migration `20260613020000_t1_creative_intent.sql` + validation harness `docs/briefs/t1-validation-harness.mjs`.
- **DB (production `mbkmaxqhsohbtwsqolns`)** — applied as MCP migrations `t1_creative_intent` (sections 1–6) + `t1_creative_intent_fill_link` (section 7):
  - `m.creative_intent` parent table (+ indexes); no RLS (m not REST-exposed; service-role RPCs only).
  - nullable `m.slot.intent_id` + `m.post_draft.intent_id` FKs → `m.creative_intent` ON DELETE SET NULL (+ partial indexes).
  - `m.create_manual_slot_internal` (shared validated insert + idx_slot_unique_active collision retry); `public.create_manual_slot` rewritten as a thin wrapper (T0 behaviour preserved); `public.create_creative_intent` (parent + per-target fan-out, partial-success); `public.get_creative_intent_detail`.
  - `m.fill_pending_slots` — manual branch only: copy `slot.intent_id → draft.intent_id`; preserve `slot_confidence` (was NULL). **Automated path byte-identical** (post-apply: manual branch stripped → 20,544-char body / md5 `e356e822…` = the PGlite-validated automated path; all `source_kind` refs live only in the manual branch).
- **dashboard `main` `d48772b3`** ← merge of `feat/t1-creative-intent-studio` (`af721e44`). Vercel prod `dpl_FCo3ftDav35RiZWVCX8w3ePw7txf` READY. New `/api/post-studio/intent` route + single "Submit to Pipeline (N platforms)" action + grouped result panel.

## 2. Pre-deploy validation (PGlite, 39/39)

Real T0→T1 migration files applied. INV1: automated-fill md5 invariant T0↔T1. T0 regression intact against the refactored wrapper. T1 cases C1–C7 + same-platform distinct-ts + ON DELETE SET NULL lineage + no manual_post_insert. Dashboard `tsc --noEmit` exit 0.

## 3. Live verification (production, natural cron, no forced runs)

**Intent A — `0d0a45a0…`** (`content-studio:t1-live-verification`, CFW × facebook+linkedin, hiring brief, +2d schedule): status `active`, 2 accepted, distinct timestamps. Natural fill → 2 linked skeleton drafts (`intent_id` inherited), `slot_confidence=1.0`, **0 canonical** → ai-worker ran → **both children independently compliance HARD_BLOCKED** ("not relevant to CFW scope" / "recruitment notice"), drafts `dead`, slots `skipped`, **0 queue rows, 0 publish rows, never pre-approved**. Demonstrates the per-child compliance gate working (gate, not log).

**Intent B — `f8c10b91…`** (`…-verification-2`, CFW × facebook+linkedin, in-scope OT/NDIS brief, +2d): status `active`, 2 accepted, distinct timestamps. Natural fill → 2 linked drafts (`intent_id` inherited, `slot_confidence=1.0`, **0 canonical**) → ai-worker → **independent Advisor formats per child** (facebook `video_short_kinetic`, linkedin `video_short_avatar`), **compliance passed (0 flags)**, **auto-approved by `auto-agent-v1`**. Traced through fan-out → linkage → per-child Advisor authority → compliance pass → approval.

**Pre-publish hold (safety):** verification confirmed the publisher does **not** reliably gate on `scheduled_for` (zero future-scheduled rows ever sit `queued`), so the +2d schedule would not have prevented a live publish of the two in-scope video drafts. Publishing extra content is outside the approved verification scope (trace target = approval/render/queue; no publish authorisation). Both Intent B drafts were therefore **held pre-publish** before enqueue/render: queue rows removed (0 existed — caught before enqueue), drafts → `dead` (`dead_reason='t1_live_verification_hold_do_not_publish'`), slots → `skipped`. No render credits spent, no live post. Render→queue→publish is the unchanged shared pipeline already proven live in T0.

**Governance invariants confirmed live:** no draft bypass, no queue bypass (0 rows), no compliance bypass (gate fired on A; passed cleanly on B), no Advisor bypass (distinct per-child formats on B), no canonical-pool leakage (0 on all 4 children), no duplicate child creation, no slot-uniqueness collision (distinct timestamps both intents).

## 4. Carries / limitations (for register pass + PK)

1. **Parent-status downstream recompute (P3, known gap vs brief §5).** `creative_intent.status` is set at **creation time** (active/partial/failed by accepted-vs-rejected targets). It is **not** recomputed when children later die/skip/fail downstream (e.g. compliance death): both verification parents read `active` while all children are `dead`/`skipped`. Per-child truth IS surfaced by `get_creative_intent_detail.children[]`. The brief's "parent recomputed to partial for later failures" was not implemented (would need a read-time aggregate in the detail RPC or a trigger — deliberately NOT ai-worker, which stays unchanged). Recommend: add a computed live-status to `get_creative_intent_detail` in a follow-up (additive, no pipeline change).
2. **Zero-accepted disposition** (PK-confirmed): a fully-rejected intent persists the parent with `status='failed'` as an audit record — kept as approved.
3. **Verification artifacts:** Intents `0d0a45a0…` (compliance-dead) and `f8c10b91…` (held) remain in `m.creative_intent` as `active` parents with dead/skipped children — test rows, safe to leave or prune.
4. **Register reconciliation** (`00_action_list` / `00_sync_state`) intentionally **not** done (out of scope this lane).

## 5. Rollback (unchanged from D-01; pure additive)

Restore `public.create_manual_slot` to the T0 body; CREATE OR REPLACE `m.fill_pending_slots` to the T0-deployed body; DROP `create_creative_intent`, `get_creative_intent_detail`, `create_manual_slot_internal`; drop `m.slot.intent_id` + `m.post_draft.intent_id`, then `m.creative_intent`. Dashboard: redeploy the prior Vercel deployment. New columns nullable/inert → partial rollback safe.
