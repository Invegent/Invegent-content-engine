# Result — cc-0083 Role-Lens Avatar Selection (PROVEN in production)

**Date:** 2026-07-27 Sydney · **Lane:** cc-0083 · **Tier:** T3 · **Verdict:** ✅ PROVEN
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`
**Register cut:** v6.35

---

## Outcome

The video **script's stakeholder lens now selects the matching governed avatar** end-to-end in production, with the client **default host** as the fallback when no clear role exists. Each character presents a separate persona name + role. Proven live on NDIS-Yarns with zero external publish.

## The proof (all 4 units correct — PK gate: no mismatch)

| Script lens | `stakeholder_role` written by ai-worker | character selected by heygen-worker | `talking_photo_id` | render |
|---|---|---|---|---|
| Support Coordinator | support_coordinator (conf 0.98) | **Sarah** | `7e98bd3860f14ee18c9b4909e46ac77c` | MP4 succeeded |
| Participant | participant (0.99) | **Alex** | `b3a7e888d11843d79cd66f61a8f941f4` | MP4 succeeded |
| Local Area Coordinator | local_area_coordinator (0.99) | **Marcus** | `45addba04379432b8c2854097f91bce0` | MP4 succeeded |
| Unclear (neutral narrator) | *(unset — `no_confident_role`)* | **default host — Sarah** | `7e98bd38…` (`selected_by=default_host`, `role_fallback=false`) | rendering |

Verified at both layers: selection (`draft_format.avatar_identity.requested_stakeholder_role` + `talking_photo_id`) and render (`m.post_render_log` `succeeded`, distinct MP4 per character). Three distinct lenses → three distinct matched characters; unclear → default host.

**Containment (NDIS publishes live on 4 platforms — mandatory):** proof drafts all `platform='linkedin'` + pre-inserted `post_publish_queue status='skipped'`. Post-proof check: **0** `post_publish` rows, **0** non-skipped queue rows, **4** skipped. Nothing posted to NDIS's channels.

## The arc (4 slices)

- **Slice A** — added `c.brand_stakeholder.persona_name` + populated 7 NDIS names (Alex/Sarah/Marcus/Priya/James/Caleb/Diane). Migration `20260726232436`. Chain: db-rls-auditor pass · apply-harness-auditor(shadow) clean · external `93f45691` agree.
- **Slice C** — activated 2 more NDIS realistic avatars (participant/Alex + local_area_coordinator/Marcus) → 3 distinct-role active characters; Sarah remains sole default host (INV-1/INV-2 intact). Migration `20260727005836`, packet v2 `f1a66d1c…` (closed harness finding AHA-07-1: baseline-pinned + symmetric rollback). Chain: db-rls-auditor clean · apply-harness-auditor clean · external `ffb4f21e` agree.
- **Slice B** — the code seam. **ai-worker v2.22.0→v2.23.0** (promote a confident ≥0.6 in-set role into the consumed `video_script.stakeholder_role`; keep the observability field; fail-open). **heygen-worker v2.4.1→v2.5.0** (on `no_eligible_avatar` for a requested role, fall back to default host instead of failing; `resolution_failed` still fails closed; adds `requested_stakeholder_role` + `role_fallback_to_default_host` telemetry). Commit `68cacff`, diff `b23824cde5…`. Chain: ef-builder 28/28 + 44/44 tests · branch-warden safe · external `b835afa1` agree · deploy-verifier **content PASS** on both (marker-in-bundle · VERSION==repo · verify_jwt=false). **Zero production regression** (daily NDIS avatar slots carry no persona → unchanged).
- **Slice D** — this proof. Packet v2 `7d1628fd…`. Chain: db-rls-auditor clean SQL + **containment CONTAINED** (verified against live publisher/trigger/cron defs) · external `616cd46d` partial→escalate (no concrete defect; runtime-verification concern answered by staged checkpoints).

## Standing facts discovered (carry)

1. **`drift-check` reads the repo from GitHub `raw.githubusercontent.com/.../main`, not the local checkout** (`GITHUB_REF="main"`). So the sanctioned deploy path (safe-deploy → drift gate) **requires the code on origin/main** — a local-only commit stays class A-LE (hard-blocked). The land-then-deploy order is mandatory; "deploy from worktree, land later" does not clear the gate. (During this lane the Slice B commit reached origin via a shared-checkout auto-push, not an explicit push.)
2. **ai-worker manual synthesis (`synthesis_mode='manual'`) reads the brief from `ai_job.input_payload.source_material`** (index.ts:945), NOT the slot/intent — a proof draft without it fails `manual_fill_no_source_material` before reaching the role seam.
3. **ai-worker resource ceiling:** invoking `/run?limit=20` over a backlog hit `WORKER_RESOURCE_LIMIT` (546) mid-batch, orphaning locked jobs as `running` (lock filter is `status='queued'`, so orphans need a manual re-queue). Use a small `limit` (≤5) + `priority` (lower=first, `priority asc, created_at asc`) to target specific jobs.
4. `c.brand_stakeholder.is_active` is true for all 7 NDIS roles (the role list the LLM sees), but only 3 have active AVATARS — the other 4 role-match to no eligible avatar and fall back to the default host.

## Closeout

Proof rows (tagged `created_by='ice-stakeholder-proof'`) neutralized to `voided` then torn down child-first at closeout. Rendered MP4s were LinkedIn-contained and never posted.

## Following outcome (next)

**Multi-character dialogue** — e.g. a Local Area Coordinator speaking with a participant in one video — the next larger video capability now that single-role selection is proven. Not started.
