# T1 — Content Studio Creative Intent: Operational Visibility (CCD-ready brief)

**Brief ID:** `content-studio-t1-visibility`
**Parent:** T1 implementation brief `docs/briefs/content-studio-t1-creative-intent.md` (`633b3217`); T1 live and verified.
**Status:** BRIEF ONLY — no implementation. Gates: CCD patch → (UI-only; no DB/EF) → PK review → deploy → close-out.
**Scope:** smallest dashboard surface for "one idea → many governed outcomes" without SQL. **No T2 work, no DB/RPC change** (the data layer already suffices — see §6).
**Authority impact:** none (read-only prep + this docs commit).

---

## 1. Current operator visibility gaps

T1's data path is complete but **headless** — an operator who submits an idea in Content Studio gets no governed view of what happened to it. Today, answering "did my hiring post go out on FB and LinkedIn?" requires SQL against `m.creative_intent` + `get_creative_intent_detail`. Specific gaps: no list of intents; no parent→children grouping in the UI; no per-child governed-state display; no human-readable skip/failure reason; no way to see that a child was compliance-skipped vs still-waiting vs published. The capability audits already flagged the studio's save path was re-pointed (T0/T1) but the **read-back surface was never built**.

**Live finding (read-only, this lane):** both T1 verification intents show `status='active'` at the parent while **both children were compliance-skipped to `approval_status='dead'`** (`skip_reason='compliance_skip:not relevant to CFW scope — internal hiring/recruitment notice, not a sector signal…'`). This is correct governance behaviour (the compliance-reviewer correctly rejected an internal recruitment notice as off-scope for CFW's clinical content boundary — exactly the boundary enforcement T1 promised), **but the parent status `active` does not reflect that all children are dead** — a status-rollup gap the visibility layer must expose and that §4 addresses. Without the UI, this divergence is invisible.

## 2. Minimal visibility model

The operator must see, per intent:

**Creative Intent (parent):** intent_id (short), client, created_by, source-material summary (brief/URL truncated), status, created_at.
**Children (one row each):** platform · slot_status · draft/approval_status · chosen format (`format_chosen`/`recommended_format`) · Advisor outcome (reason present + chosen format) · compliance outcome (clean / skipped + reason) · approval outcome (auto-agent / human / dead) · render state (image_status/video_status) · queue state · publish state (+ platform_post_id when published) · `selected_canonical_ids_count` (governance proof — should be 0).

Every one of these fields is **already returned** by `get_creative_intent_detail` (§6).

## 3. Recommended UI surface — smallest viable

**Option chosen: Intent drill-down inside Content Studio** — a "My Ideas" / Intents list (most recent N for the operator's clients) where each row expands to the parent summary + children table. Not a separate top-level page (more routing/nav than needed); not a reconciliation-style cross-client view (that's an ops-monitor concern, heavier). The drill-down reuses the existing Content Studio shell and the dashboard's established list→detail pattern (as used by Draft Inbox / Series Detail). One new read-only view component + one list component, both fed by existing RPCs. No new nav tree, no new auth surface.

Rationale: an operator's mental model is "the idea I just submitted" → they are already in Content Studio when they submit, so the result belongs there. Series Detail is the proven precedent for parent→children drill-down in this codebase.

## 4. Status model (define + operator interpretation)

Parent status values and how to read them:
- **active** — children created and in flight (filling/generating/awaiting approval/queued). Operator: "in progress, check children for stage."
- **partial** — some children reached a terminal *success* (published) while others terminally failed (dead/skipped), OR some targets were rejected at fan-out. Operator: "mixed — some went out, some didn't; see per-child reason."
- **completed** — all children published. Operator: "fully done."
- **failed** — zero children succeeded (all dead/skipped/rejected). Operator: "nothing went out; see reasons."

**Required behaviour the UI must enforce/surface:** the parent status must be **derived from children at view time** (or the rollup fixed), because the live finding shows a parent stuck at `active` while both children are `dead` — true state is `failed`. Two implementation options for CCD (UI-only path preferred): (a) the visibility view **computes** the effective parent status from children for display (no DB change — recommended for this brief); (b) a later separate lane adds a status-rollup trigger/cron (DB change — out of scope here, note as a carry **F-INTENT-STATUS-ROLLUP P3**). For this brief, compute-on-display; flag the rollup as the follow-up.

## 5. Failure visibility (must answer without SQL)

The children table must render `skip_reason` / `dead_reason` verbatim (truncated with expand) and map each child to a plain-language line:
- *Why did Facebook fail?* → child row: approval_status `dead`, skip_reason text ("compliance_skip: not relevant to CFW scope…").
- *Why did LinkedIn succeed?* → child row: publish_status `published`, platform_post_id present, compliance clean.
- *Why did one child die?* → dead/skip reason rendered inline.
- *Why is one child waiting?* → slot_status `pending`/draft awaiting approval; show the stage label.
All four are answerable directly from `get_creative_intent_detail` children fields (`skip_reason`, `approval_status`, `slot_status`, `publish_status`, `image_status`/`video_status`, `queue_status`) — no SQL, no new data.

## 6. Existing API reuse — **sufficient, no DB/RPC change needed**

Verified read-only this lane: `get_creative_intent_detail(p_intent_id uuid)` already returns `{ok, intent:{...all parent fields incl. fanout_result, source_material, target_platforms}, children:[{slot_id, draft_id, platform, slot_status, approval_status, image_status, video_status, queue_status, publish_status, format_chosen, recommended_format, skip_reason, slot_confidence, platform_post_id, scheduled_publish_at, selected_canonical_ids_count, draft_intent_id}]}`. This covers **every field in §2 and every question in §5**. The only missing piece is a **list** RPC (intents for a client, newest first) to populate the drill-down list before the operator picks one — a thin read RPC `list_creative_intents(p_client_id, p_limit)` returning parent rows + a child-count/derived-status, OR a direct PostgREST/select if `m.creative_intent` is exposed. CCD picks the lighter of the two at build. **No change to `get_creative_intent_detail`, `create_creative_intent`, or any pipeline object.**

## 7. Build recommendation (CCD-ready)

**UI-only build, dashboard repo:**
1. **Intents list** component in Content Studio: calls a thin `list_creative_intents` read RPC (or exposed select) → rows: short intent_id, client, source summary, **derived status**, created_at, child-count. Newest first, operator's clients only (RLS/existing client scope).
2. **Intent detail/drill-down** component: calls `get_creative_intent_detail(intent_id)` → renders parent summary block + children table per §2/§5, with verbatim skip/dead reasons (expandable) and a governance chip showing `selected_canonical_ids_count=0`.
3. **Derived parent status** computed in the view from children (active/partial/completed/failed per §4) until the rollup carry is addressed.
4. No write actions in this surface (read-only visibility; approve/retry actions are a later scope decision, not this brief).

**Carries surfaced (not fixed here):**
- **F-INTENT-STATUS-ROLLUP — P3:** parent `creative_intent.status` does not auto-reflect terminal child states (live: `active` parent over two `dead` children). Visibility layer computes-on-display now; durable fix (trigger/cron) is a separate gated lane.
- Note for PK product call (not this brief): the T1 verification intents were *correctly* compliance-killed because an internal hiring notice is off-scope for CFW's clinical content boundary — which raises whether **operator-authored promos/recruitment** need the `preserve`/operator-intent content class (decision-brief row 8, verbatim-copy mode) so they aren't judged as sector signals. Real product signal, deferred.

## 8. Validation plan

Live (read-only, existing intents — no new content needed): load the two existing verification intents → confirm list shows them, detail renders both children with `dead` status + the compliance skip_reason verbatim, derived parent status shows `failed` (not `active`), governance chip shows canonical=0. Then one fresh operator intent through the real UI → confirm in-flight states render through to terminal. No forced runs.

## 9. Explicitly out of scope

T2 post-render QA / OCR / transcript / asset compliance; any pipeline or RPC mutation; the status-rollup DB fix (carry only); approve/retry/kill actions from the UI; series visibility; campaign views; cross-client ops monitor; register reconciliation; the verbatim/operator-promo content-class decision (noted for PK, not built).

## 10. What CCD may implement after PK approval

A **UI-only** dashboard change (no DB/EF/migration): the Intents list + Intent drill-down components in Content Studio, fed by `get_creative_intent_detail` (unchanged) and one thin list read-path (`list_creative_intents` read RPC **or** an exposed select — the only possible new DB object, a read-only SECURITY DEFINER function if chosen, which would then need its own one-line D-01 note). Parent status derived on display. No writes, no pipeline touch, no T2. Nothing implemented before PK approval.
