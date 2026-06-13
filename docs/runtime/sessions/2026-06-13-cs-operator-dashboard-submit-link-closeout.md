# 2026-06-13 — Content Studio operator dashboard: submit→Ideas-detail loop close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `f3a6cf70-9bcb-472d-97ce-aaf7056b0895`.
**Brief:** `docs/briefs/content-studio-t0-t1-operator-dashboard.md`. UI-only; no DB/RPC/pipeline change.

---

## 1. Finding
The brief's Required Build was already ~95% live from three prior PK-approved lanes:
- Active-client roster (`list_active_clients` + `useActiveClients` hook in all 4 Studio selectors) — items 1.
- Unified governed submit (`PostStudioForm` "Submit to Pipeline (N)" → `create_creative_intent`, grouped accepted/rejected+reasons result) — items 2, 3, 4.
- Ideas list + intent drill-down (per-child platform/slot/draft/format/Advisor/compliance/approval/render/queue/publish + verbatim `skip_reason` + `selected_canonical_ids_count` chip + derived parent status) — items 5, 6, 7, 8.

The one gap vs §3 was "link straight to the new Intent detail." This lane added it.

## 2. Shipped
- **dashboard `main` `129f042d`** ← merge of `feat/cs-operator-dashboard-submit-link` (`465c81b4`). Vercel prod `dpl_BMUCjpWsZfKrvbmMtVpoPp2aUELw` READY (`dashboard.invegent.com`).
- `PostStudioForm.tsx`: optional `onViewIntent(intentId)`; result panel "Track this idea in Ideas →" CTA (shown when ≥1 child accepted) + governed/non-replaceable note.
- `page.tsx`: CTA → `setIdeasView({detail, intentId})` + `setMode('ideas')` → opens the new intent's `get_creative_intent_detail`.

## 3. Validation
- Dashboard `tsc --noEmit` exit 0; Vercel build READY (no error).
- Case mapping: one-/multi-platform submit result, rejected-target reason, detail child outcomes, `selected_canonical_ids_count` visible — all deployed in prior lanes; the submit→detail deep link is the new piece.
- CTA navigation is client-side React state (no network, no write path). Destination confirmed live: `get_creative_intent_detail('0d0a45a0…')` → ok, 2 children, every child `selected_canonical_ids_count=0` + verbatim `skip_reason`. Lifecycle traceable without SQL.

## 4. Scope / guardrails
UI-only (2 .tsx files). No new API/RPC/DB object; reuses shipped RPCs. No pipeline/Advisor/compliance/render/publisher change; submit routes through `create_creative_intent` (never `manual_post_insert`). No parent-status persistence (derived on display; F-INTENT-STATUS-ROLLUP untouched). No T2 / preserve mode / recruitment class / campaign / series / register reconciliation / Fix 2. Optional per-target schedule picker deferred (default next-slot; RPC still supports `scheduled_for`).

## 5. Rollback
Revert the dashboard merge / redeploy prior deployment (`dpl_A2fAYtt3aVxSwu8t2oJLWg6dcJB1`). 2-file UI change, no data/schema/RPC — the CTA disappears; rest unaffected. Unambiguous.
