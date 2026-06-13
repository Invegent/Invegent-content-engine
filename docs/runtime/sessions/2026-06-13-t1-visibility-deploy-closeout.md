# 2026-06-13 — T1 Content Studio visibility: deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `01d0a001-98bb-4cb0-a181-f544ffb0d20f`.
**Brief:** `docs/briefs/content-studio-t1-visibility.md`. UI-only + one read-only RPC. No pipeline/governance/T2 change.

---

## 1. Shipped
- **content-engine `main` `2ae568ee`** ← merge of `feat/t1-visibility-list-rpc` (`787cfea8`). Migration `20260613060000_t1_list_creative_intents.sql` applied to prod as `t1_list_creative_intents`.
- **DB:** NEW `public.list_creative_intents(uuid,integer)` — verified deployed: volatility STABLE (read-only), grants service_role only (anon/authenticated NOT granted). `get_creative_intent_detail` and all pipeline objects UNCHANGED.
- **dashboard `main` `f5c27874`** ← merge of `feat/t1-visibility-studio` (`3e2ad70a`). Vercel prod `dpl_2Te6pxyZhYCN1r4VePFrHe8MTPZT` READY (`dashboard.invegent.com`). New Content Studio "Ideas" tab → list + intent drill-down; server routes `/api/post-studio/intents` + `/api/post-studio/intent/[intentId]` (service-role); `lib/intent-status.ts` derive-on-display.

## 2. Validation
- PGlite 24/24 (`docs/briefs/t1-visibility-validation-harness.mjs`): list counts across all-states; deriveIntentStatus Cases A–F; detail failure-visibility; RPC STABLE/SELECT-only/service-role-only.
- Dashboard `tsc --noEmit` exit 0; Vercel build READY (no error).
- **Live (prod, post-deploy):** `list_creative_intents(CFW)` returns the 2 real intents (`0d0a45a0`, `f8c10b91`), each `child_total=2, published=0, failed=2, inflight=0, fanout_rejected=0` → **derived `failed`** (stored `active` — the F-INTENT-STATUS-ROLLUP divergence the UI surfaces, not fixes). `get_creative_intent_detail` for both: 2 children each, `slot=skipped/draft=dead`, **`selected_canonical_ids_count=0`** on all, **verbatim `skip_reason`** present ("compliance_skip:not relevant to CFW scope…" / "t1_live_verification_hold"). Case C (compliance-killed) + Case F (explains outcome without SQL) confirmed live.

## 3. Scope confirmation
Read-only throughout: one SELECT-only RPC added; no write RPC; no pipeline/Advisor/compliance/render/publisher/ai-worker edit; no trigger/cron; parent status computed on display only (no persistence). T2 not touched. Register reconciliation deliberately held.

## 4. Carries
- **F-INTENT-STATUS-ROLLUP (P3):** parent `creative_intent.status` stays creation-time; the visibility layer derives the true status on display and labels the divergence. Durable rollup fix remains a separate gated lane.
- Two verification intents remain as `failed`-deriving test rows (safe).

## 5. Rollback
- DB: `DROP FUNCTION public.list_creative_intents(uuid,integer)` (additive read fn; nothing depends on it).
- Dashboard: revert merge / redeploy prior Vercel deployment (`dpl_FCo3ftDav35RiZWVCX8w3ePw7txf`). Independent per repo; zero data migration.
