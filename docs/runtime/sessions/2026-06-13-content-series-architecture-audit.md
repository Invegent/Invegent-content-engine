# Content Series Architecture & Behaviour Audit (read-only, 2026-06-13)

**Status:** READ-ONLY audit. No implementation. Anchored on live test series `7ddf29e7` (the one that produced `series_not_approved` + retry failure).
**Authority impact:** none.

---

## 1. Current Series architecture map

A **legacy, self-contained flow parallel to T0/T1** — it shares no machinery with manual slots or creative_intent:
```
Studio Series form → create_content_series (status draft) → series-outline EF → save_series_outline (status outline_ready)
→ approve_series_outline (status approved) → series-writer EF → series_post_insert (per platform) → m.post_draft DIRECT (created_by='series-writer', needs_review)
→ episode.platform_drafts{platform:draft_id} + episode.post_draft_id=first → set_episode_schedule → [agents sweep] → queue/publish
```
Tables: `c.content_series` (carries BOTH `platform` singular AND `platforms[]` — the collapse seam) + `c.content_series_episode` (`platform_drafts jsonb`, single `post_draft_id`, `recommended_format`, `scheduled_for`, `status`). RPCs: create/save_outline/approve_outline/series_post_insert/set_episode_schedule/link_episode_to_draft/update_series_status + read RPCs. **No slot, no creative_intent, no Advisor call, no compliance gate at insert.**

## 2. State-machine map

Series.status: `draft → outline_ready → approved → writing → active` (+ episode.status: `outline → draft_ready`). Transitions: `save_series_outline` sets outline_ready; `approve_series_outline` sets approved **only from outline_ready**; series-writer moves to writing; episodes flip `outline→draft_ready` as `series_post_insert` runs. **No rollup**: series.status is set by the writer process, not derived from episode completion.

## 3. Scheduling model

Per-**episode** single timestamp (`episode.scheduled_for`), set by `set_episode_schedule`, propagated into `series_post_insert`'s `p_scheduled_for` → `post_draft.scheduled_for`. **Not** per-platform, not per-draft, not cadence-driven, **does not create `m.slot` rows** (legacy direct-draft path — so it sits entirely outside the slot layer and therefore outside `m.fill_pending_slots`). Test series episodes were scheduled 11:44–11:49 (one minute apart, operator-set). It does **not** suffer F-SLOT-SCHEDULE-FIDELITY (that's a slot→queue drift; series has no slots) — but it also gains none of the slot layer's governance.

## 4. Platform fan-out reality

**Fan-out DOES work at the writer level** — confirmed: test ep1 + ep2 each have `platform_drafts` = {youtube, facebook, linkedin, instagram} with **four distinct draft IDs** (one draft per platform). But:
- `episode.post_draft_id` stores **only the first platform** (`COALESCE(post_draft_id, v_draft_id)`) → all downstream single-draft linkage (`link_episode_to_draft`, detail views) **collapses to one platform**. The other three live only in `platform_drafts` jsonb.
- The fan-out is **partial/fragile**: episodes 3–5 never got written (`status='outline'`, empty `platform_drafts`) — the writer stopped after ep2 (the partial-write symptom).
- Series-level `platform='facebook'` (singular) is set despite `platforms[]` having four — `get_content_series_detail` reads the singular, so the UI under-represents the fan-out.

## 5. Format-selection reality

Format is chosen **per episode** by the **series-outline EF** (stored `episode.recommended_format`), applied to **every platform child identically** in `series_post_insert` (`p_recommended_format` same for all platforms of that episode). **Advisor never runs** (recommended_reason NULL on all fanned drafts). No taxonomy/platform_support validation: test **ep3 = `text` and ep1's youtube child = `image_quote`/`carousel`** — both **invalid for YouTube** (video-only), yet written. This is the format×platform mismatch: one episode format blindly stamped across platforms that can't render it.

## 6. Advisor / compliance / render involvement

**Advisor: not at all** (format pre-decided by outline EF; recommended_reason NULL). **Compliance: yes, but post-hoc** — the agents sweep all drafts, so the four ep1 drafts got `compliance_flags` + `auto_approval_scores` **and all four were `rejected`/`approved_status=rejected`** by the sweep *after* insert (compliance is not a gate at series-insert; it's a later judgement, and it judged these off-scope/failed). **Render: standard** — drafts carry formats so image/video workers would pick up valid ones; but invalid combos (text/image_quote on YouTube) have no render path.

## 7. Avatar/persona handling reality

**Completely lost.** The operator brief explicitly said *"I want to use different avatars to represent how they perceive their future"* and the episodes are literally personas (Priya/Gary/Colleen). Yet: `series.source_material` keeps the brief text, but **episode plan has no persona/avatar field**, `draft_format` contains **no avatar/persona** data (`avatar_in_df=no` on all), `series_post_insert` has no avatar param, **heygen-worker receives nothing**, and the Branch A pin would override anyway. Persona intent dies at the outline stage — there is no field to carry it.

## 8. Root cause analysis

**`series_not_approved` — VALID GUARDRAIL mis-fired by a state-ordering bug, not a bug in the guard itself.** `approve_series_outline` only accepts `status='outline_ready'`. The test series is now at `writing` (it WAS approved at 11:39, then the writer advanced it). A second approval attempt (or a UI approve action after writing began) returns `series_not_in_outline_ready_state`. So: the guard is correct (don't approve twice), but **the UI surfaces it as a failure** and there's **no episode-level approval** — approval is series-outline-level only, so once writing starts there's no "approve this episode/draft" path; the four written drafts sit `rejected` (by compliance sweep) with no operator approval route. The symptom is really "approval model is outline-only; no per-episode/per-draft approval; parent status can't go back."

**`retry failed episodes` — NOT IMPLEMENTED.** There is **no retry RPC** in the inventory (no `retry_episode`, no `regenerate_episode`). Episodes 3–5 stuck at `outline` have no function to re-invoke the writer for just them; `save_series_outline` is insert-only (documented wart) so re-outlining abandons the series. "Retry failed episodes" is a UI affordance with **no backend** — it calls nothing that exists, hence silent failure. The partial write (ep1–2 done, 3–5 not) is unrecoverable through the UI.

## 9. Gaps vs T0/T1 governed model

| Dimension | T0/T1 | Series today |
|---|---|---|
| Entry | manual slot / creative_intent | direct `m.post_draft` insert |
| Lineage | slot_id + intent_id | none (slot=NULL, intent=NULL on all series drafts) |
| Advisor | runs per draft | never runs |
| Compliance | gates before queue | post-hoc sweep, not a gate |
| Format | taxonomy/platform_support gated, Advisor-overridable | outline-EF pre-decided, no validation, same across platforms |
| Fan-out | N sibling slots, distinct timestamps | N drafts in jsonb, post_draft_id collapses to 1 |
| Schedule | slot scheduled_publish_at | episode scheduled_for, no slots |
| Retry | (n/a) | no backend |
| Avatar | Branch A pin governs | intent lost entirely |
| Status rollup | T1 derives on display | none |

## 10. Recommended Series v2 operating model

**Series becomes a producer of T1 creative_intents.** Target:
```
series idea (+persona/avatar intent) → outline (episode plan, persona-aware) → outline approval
→ EACH episode → ONE creative_intent (intent_kind='episode') → fan out to N child slots (one per platform) via existing T1 path
→ governed chain per child (fill → Advisor format choice gated by taxonomy×platform_support → compliance gate → auto-approval → render → queue → publish)
→ episode/series status derived from children; per-episode + per-draft retry = re-run the intent fan-out
```
This inherits T1's fan-out (distinct timestamps, sibling slots), Advisor format-fitness (fixes the YT/text mismatch — Advisor picks a platform-valid format), compliance-as-gate, governance lineage, and the visibility surface — and replaces the dead retry with "re-fan-out the episode's intent."

## 11. Integration verdict: **T1 creative_intent (primarily), which sits on T0 slots**

Each **episode → one creative_intent**; each **episode-platform output → one child slot/draft** (exactly T1's model). Series should **not** keep its direct-draft path. It uses T0 slots transitively (creative_intent fans out to slots). Verdict: **integrate with T1 (and thereby T0)** — not neither, not T0-only. The `series_post_insert` legacy path is deprecated in favour of `create_creative_intent` per episode.

## 12. Recommended next build brief scope

A **Series v2 integration brief**: (a) episode→creative_intent bridge (replace `series_post_insert` with per-episode `create_creative_intent` fan-out); (b) persona/avatar field on the episode plan carried into intent `source_material` → slot → draft_format → heygen (resolving how it coexists with the Branch A pin — likely the pin becomes per-intent-overridable for series); (c) format validation via taxonomy×platform_support at outline time (no text-on-YouTube); (d) approval model: per-episode/per-draft approval, not outline-only; (e) **implement retry** as episode-intent re-fan-out; (f) status rollup (shared with F-INTENT-STATUS-ROLLUP); (g) UI: stop reading `series.platform` singular, surface the fan-out. **This is a Series v2 redesign, not a small bug fix** — see success criterion.

## 13. Explicitly out of scope

T2 asset QA, Option C, Fix 2 (done), register reconciliation (held), the avatar multi-persona engine build itself (design intent exists, never implemented — Series v2 would be its first real consumer; flagged, not built here), campaign abstraction, and any implementation.

## Success criterion — answer

Content Series needs a **larger Series v2 redesign integrating with T1 creative_intent**, not a small bug fix. The two reported symptoms have specific causes (approval = outline-only state-guard mis-surfaced + no per-episode approval; retry = no backend at all), but they sit on deeper divergences — direct-draft bypass of all governance, format collapse across platforms, post-id collapse to one platform, and total loss of persona/avatar intent — that only a T1 integration resolves. **Recommended path: Series v2 brief per §12; do not patch the legacy flow piecemeal.**

**Constraint compliance:** 5 read-only SQL probes — 0 code/DB/migration/deploy/provider/publisher/render/register changes, 0 new test series, no implementation. T0/T1/Fix lanes untouched.
