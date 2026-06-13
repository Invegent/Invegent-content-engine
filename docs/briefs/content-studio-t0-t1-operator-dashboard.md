# Content Studio T0/T1 Operator Dashboard (CCD-ready build brief)

**Brief ID:** `content-studio-t0-t1-operator-dashboard`
**Builds on:** T0 close `38b0d0a3`, T1 close + visibility brief `c05dd0a0`, T1 impl `633b3217`. T0/T1/visibility all LIVE.
**Status:** BRIEF ONLY — no implementation, no deploy, no DB/code change. **UI-only build** (dashboard repo) on top of already-shipped RPCs.
**Gates:** CCD patch on branch → PK review (UI-only, no D-01 needed unless a new DB object is introduced — none is) → Vercel deploy → operator walkthrough.
**Authority impact:** none (this brief is docs-only).

---

## 0. Data-source verification (read-only, 2026-06-13)

All four reuse RPCs exist with confirmed signatures — **no new DB object required**, so this stays a pure UI build:
- `list_active_clients()` → (zero-arg) active client roster. **Replaces the hardcoded two-client `CLIENTS` constant** — fixes carry F-CONTENT-STUDIO-CLIENT-ROSTER (CFW + Invegent currently unreachable).
- `create_creative_intent(p_client_id uuid, p_brief text, p_targets jsonb, p_intent_kind text, p_url text, p_format_preference text, p_created_by text)` → fan-out (single or multi-platform).
- `list_creative_intents(p_client_id uuid, p_limit integer)` → Ideas list rows.
- `get_creative_intent_detail(p_intent_id uuid)` → parent + children full state (every field §3 needs; verified in the T1 visibility lane).
- (`create_manual_slot(...)` still exists — T0's single-platform path; **superseded for the UI** by `create_creative_intent` with a one-element `p_targets`, so the operator has one submit path, not two. Keep `create_manual_slot` callable; do not route new UI through it.)

## 1. Current UX state

Content Studio shipped the plumbing but the operator surface is thin: the legacy Single Post form does direct-AI text only (the ungoverned path, now superseded by T0), and the Ideas tab (IntentsList/IntentDetail) renders but is gated to a **hardcoded two-client list** so CFW/Invegent — including the T1 verification intents — are unreachable. There is no single governed "submit an idea → see what happened" loop an operator can use end to end. This brief specifies that loop.

## 2. Target T0/T1 operator flow

```
Idea / brief (+ optional URL)
→ client            (list_active_clients — full active roster)
→ platform targets  (1 = single-platform/T0 shape; N = multi-platform/T1 fan-out)
→ optional format preference (per-idea or per-target; taxonomy-gated; Advisor-overridable)
→ Submit to governed pipeline  (create_creative_intent; targets = [{platform, format_preference?, scheduled_for?}, …])
→ intent created (parent) + child slots created (one per target)
→ governed chain per child (fill → ai-worker → Advisor → compliance → auto-approval → render → queue → publish) — UNCHANGED
→ lifecycle visible in Ideas (list → detail → per-child cards)
```
Single-platform and multi-platform are the **same** submit path with 1 vs N targets — no separate forms.

## 3. Required UI surfaces

**Submit (improved):**
- **Idea input:** brief textarea + optional URL field (maps to `p_brief` / `p_url`).
- **Client selector:** from `list_active_clients()` (not the hardcoded constant).
- **Platform selector:** multi-select, **gated to connected + publish-eligible platforms** for the chosen client (FB/IG/LI/YT per eligibility); offering an ineligible platform is blocked client-side with a reason, and the RPC remains the server-side gate of record. Each selected platform = one entry in `p_targets`.
- **Format preference selector:** optional, **taxonomy-driven** — only `is_buildable=true` formats with `platform_support[platform]=true`; presented as preference ("let AI decide" default), Advisor may override downstream. Per-idea default with optional per-target override.
- **Schedule / next-slot behaviour:** default "next available slot" (RPC assigns distinct per-platform timestamps respecting `idx_slot_unique_active`); optional operator-chosen `scheduled_for` per target. Surface that manual slots are created non-replaceable (high confidence) so they won't be evicted.
- **Submit result summary:** after `create_creative_intent` returns, show the parent + per-target accepted/rejected outcome (from `fanout_result`), with rejection reasons inline; link straight to the new Intent detail.

**Visibility (extends the live Ideas tab):**
- **Ideas list:** `list_creative_intents(client, limit)` — rows: source summary, derived status, child-count, published-count, platforms, intent_id short, created_by/at. Client picker from `list_active_clients()`.
- **Intent detail:** `get_creative_intent_detail(intent_id)` — parent summary block + children.
- **Child outcome cards/table:** one per child — platform, slot_status, draft/approval_status, chosen format, render state (image/video_status), queue state, publish state (+ platform_post_id link when published).
- **Failure reason display:** render `skip_reason`/`dead_reason` verbatim (expandable), mapped to a plain-language line per child (succeeded / waiting / blocked-why / dead-why).
- **Governance proof display:** per child show `selected_canonical_ids_count` (=0 expected) as a small "governed: no pool contamination" chip — makes the governance guarantee visible to the operator.

## 4. Data sources to reuse

`list_active_clients`, `create_creative_intent`, `list_creative_intents`, `get_creative_intent_detail` (all verified §0). **No new RPC, no DB change.** Parent status is **derived on display** (active/partial/completed/failed computed from children) per the visibility brief, because parent persistence is out of scope (guardrail) and the live carry F-INTENT-STATUS-ROLLUP shows stored status can lag.

## 5. Validation cases

1. one idea → one platform → one child rendered in detail, governed chip canonical=0.
2. one idea → multiple platforms → N children, each independent state.
3. unsupported platform/format → blocked client-side with reason; if it reaches the RPC, rejected in `fanout_result` and shown.
4. compliance-killed child → child card shows `dead` + verbatim compliance skip_reason (the T1 verification intents are live examples once CFW is selectable).
5. waiting child → shows in-flight stage label (fill pending / awaiting approval / queued).
6. successful child → published state + platform_post_id link.
7. **no SQL needed** to understand any outcome — every question answerable from the detail surface.

## 6. Guardrails (do not change)

Pipeline, ai-worker, Advisor, compliance-reviewer, auto-approver, render workers, publisher, T2 asset QA (does not exist yet — do not assume), and **parent status persistence** (UI derives on display; no write-back of computed status). No write actions from the visibility surface beyond the submit form's `create_creative_intent` call. No new DB object.

## 7. Explicitly out of scope

OCR, transcript checks, rendered-asset QA (all T2); campaign abstraction; series redesign; preserve/verbatim mode; recruitment/promo content class; Fix 2 work (done separately); register reconciliation (held); the GIF buildability flip (separate cleanup — until flipped, the format selector simply must not surface non-buildable formats, which the taxonomy gate already achieves).

## 8. What CCD may implement after PK approval

A **UI-only** dashboard change (no DB/EF/migration): (1) replace the hardcoded `CLIENTS` constant with `list_active_clients()` across Content Studio; (2) a unified governed submit form (idea + client + multi-platform + taxonomy-gated format preference + schedule) calling `create_creative_intent`; (3) a submit-result summary from `fanout_result`; (4) extend the Ideas list/detail to render child outcome cards, verbatim failure reasons, and the governance chip; (5) derived parent status on display. Pipeline and all governance internals unchanged. Nothing before PK approval.
