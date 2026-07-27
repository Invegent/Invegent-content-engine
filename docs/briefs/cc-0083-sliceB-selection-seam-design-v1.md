# cc-0083 Slice B — selection seam implementation packet (v1)

**Created:** 2026-07-26 Sydney · **Lane:** cc-0083 (avatar role-lens selection) · **Slice:** B (code)
**Tier:** T3 (production EF deploy on the live avatar-video path) · **Gate:** PK deploy gate (built local-only, staged for deploy)
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`
**Executor:** ef-builder (isolated worktree, LOCAL-ONLY) → branch-warden → external review → PK deploy gate.

---

## 1. Purpose

Turn the script→role signal on. Two edge-function changes, both load-bearing:

1. **ai-worker** — promote the already-computed presenter-role suggestion into the **consumed** field `video_script.stakeholder_role`, gated on a clear/confident single-role suggestion. (Today it writes only the inert `avatar_role_suggestion`.)
2. **heygen-worker** — when a `stakeholder_role` is requested but the client has no active avatar for it, **fall back to the default host** (PK ruling, cc-0083) instead of failing closed.

The **poller display** change is dropped from this slice (see §6). No schema change (Slice A already added `persona_name`; the `stakeholder_role` field is a JSON key on `draft_format.video_script`, already read by heygen-worker — no DDL).

## 2. Change 1 — ai-worker: promote the role suggestion

**File:** `supabase/functions/ai-worker/index.ts`
**Site:** the suggestion attach block at ~`:1330-1334` (inside the existing guard that attaches `avatar_role_suggestion`):

```ts
const roleSuggestion = await suggestAvatarRole(supabase, anthropicKey, { clientId: job.client_id, slotId: job.slot_id });
(videoScript as any).avatar_role_suggestion = roleSuggestion;   // KEEP — observability unchanged
```

**Add** (same block, same guard — do NOT widen the guard):

```ts
// cc-0083: promote a CLEAR, confident single-role suggestion into the CONSUMED field
// heygen-worker reads (video_script.stakeholder_role). Left NULL otherwise → default host.
const sr = roleSuggestion?.suggested_stakeholder_role;
const srConf = Number(roleSuggestion?.suggested_stakeholder_role_confidence ?? 0);
if (typeof sr === 'string' && sr && srConf >= AVATAR_ROLE_MIN_CONFIDENCE) {
  (videoScript as any).stakeholder_role = sr;
}
// else: leave stakeholder_role unset → heygen-worker resolves the default host.
```

- Add a named constant near the top: `const AVATAR_ROLE_MIN_CONFIDENCE = 0.6;` (tunable; documents "clear role only"). `suggestAvatarRole` already returns a non-null role only when the LLM picks a valid in-set code; the threshold is the secondary "clear lens" guard PK's rule implies ("default_host only when no clear role").
- **Never throw:** the promotion reads fields off the best-effort object; keep it inside the existing non-fatal try. If `roleSuggestion` is null/errored, `sr` is undefined → no write → default host. Fail-open to default host, never break the draft.
- **Scope:** only within the current avatar/video attach guard — do not write `stakeholder_role` for formats that have no presenter concept.
- Bump the `avatar_role_suggestion` header comment (`:96-105`, `:423-428`) to note that cc-0083 now ALSO conditionally writes `stakeholder_role`. Bump ai-worker VERSION (minor).

## 3. Change 2 — heygen-worker: default-host fallback

**File:** `supabase/functions/heygen-worker/index.ts`
**Site:** the `no_eligible_avatar` branch at ~`:499-506`. Today:

```ts
if (res.outcome === 'no_eligible_avatar') {
  await markFailed(...);   // fails the render
  results.push({ ... status: 'failed', error: 'no_eligible_avatar' });
  continue;
}
```

**Change to** (PK ruling — role requested but unavailable → default host):

```ts
if (res.outcome === 'no_eligible_avatar') {
  if (stakeholderRole) {
    // cc-0083: a role was requested but no active avatar carries it → fall back to the client
    // default host (role-less resolve). Only genuinely-no-avatar (default host also missing) fails.
    const fb = await lookupAvatar(supabase, clientId, null, renderStyle);
    if (fb.outcome === 'default_host' || fb.outcome === 'primary_fallback' || fb.outcome === 'undesignated_tiebreak') {
      talkingPhotoId = fb.talking_photo_id;
      voiceId = voiceId ?? fb.voice_id;
      avatarSelectedBy = fb.outcome;      // the host actually used
      roleFallbackToDefaultHost = true;   // telemetry (see §4)
    } else {
      await markFailed(supabase, draftId, fmt, {
        heygen_error: `submit_error: No active ${renderStyle} avatar for client ${clientId} (role ${stakeholderRole} unavailable AND no default host)`,
        avatar_resolution_outcome: 'no_eligible_avatar',
      });
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: 'no_eligible_avatar' });
      continue;
    }
  } else {
    // no role requested AND no avatar at all → genuine hard fail (unchanged)
    await markFailed(supabase, draftId, fmt, {
      heygen_error: `submit_error: No active ${renderStyle} avatar for client ${clientId}`,
      avatar_resolution_outcome: 'no_eligible_avatar',
    });
    results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: 'no_eligible_avatar' });
    continue;
  }
}
```

- **`resolution_failed` branch is UNCHANGED** — a query error still fails closed (never masquerade an error as a fallback).
- Bump heygen-worker VERSION (minor, e.g. v2.5.0). Keep `--no-verify-jwt` on deploy.

## 4. Telemetry for proof legibility (both workers)

To make the proof unambiguous, record on `draft_format.avatar_identity` at submit (the object already frozen at ~`:543-549`):
- `requested_stakeholder_role`: the `stakeholderRole` heygen-worker filtered on (string or null).
- `role_fallback_to_default_host`: boolean (§3, default false).

Then the proof reads directly: role-matched render ⟺ `requested_stakeholder_role='participant'` AND selected `talking_photo_id` == participant's HeyGen id AND `role_fallback_to_default_host=false`; default-host render ⟺ `requested_stakeholder_role=null` AND selected == Sarah. `avatar_selected_by` (the ranking code) stays as-is and is secondary.

## 5. Tests (ef-builder, local)

- Extend `supabase/functions/heygen-worker/qa_test.ts` (already exercises `fallback_taken`): add cases for (a) role requested + eligible avatar → role-matched pick, no fallback; (b) role requested + NO eligible avatar + default host present → fallback to default host, `role_fallback_to_default_host=true`; (c) role requested + no avatar at all → hard fail; (d) no role → default host (unchanged).
- ai-worker: a unit around the promotion gate — confident in-set role → `stakeholder_role` written; null/low-confidence → unwritten. Reuse existing test harness patterns.
- All deno tests must pass locally (ef-builder reports counts). No deploy from ef-builder.

## 6. Explicitly OUT of this slice

- **Poller display name** (`heygen-avatar-poller/index.ts:195`) — the poller only runs for `avatar_gen_status IN ('generating','training')`; the NDIS cast is already-assigned `stock`, so it would not update their display names. Cosmetic and non-load-bearing for the proof (identity evidence = `persona_name`+`role_label` read directly). **Optional carry**, not in cc-0083 unless PK elects it.
- The dashboard Avatars-tab display string. Same rationale.
- `is_primary` designation; any avatar generation; other clients; animated style.

## 7. Deploy plan (staged for PK gate — NOT run by ef-builder)

- Build in an **isolated worktree**; branch-warden `safe` before anything.
- Deploy via `scripts/safe-deploy.sh <ef> --allow-warn` for **ai-worker** and **heygen-worker**; **`--no-verify-jwt`** semantics preserved (x-series-key callers).
- **Bundles-from-CWD guard:** deploy from the worktree that holds the change; grep the DEPLOYED bundle for the cc-0083 marker + new VERSION before trusting it (deploy-verifier).
- Drift: push → refresh `drift-check?write=true&slug=<ef>` per EF. Note the drift gate hashes only `index.ts` — both changes are in `index.ts`, so drift will register (no helper-only A-LE trap).
- Apply order within Slice B: deploy **heygen-worker first** (fallback safety net), then **ai-worker** (turns the signal on) — matches the brief's global order (C → heygen → ai-worker).
- Post-deploy: deploy-verifier PASS on both (marker-in-bundle · VERSION==repo · verify_jwt==false).

## 8. Open items (flag at build/proof, not blockers)

- `AVATAR_ROLE_MIN_CONFIDENCE = 0.6` is a proposed default; confirm it lets the three clear-lens proof scripts through (Slice D crafts high-signal `avatar_preference`).
- **Proof-path liveness:** confirm the avatar/HeyGen render path is enabled for NDIS drafts (memory notes NDIS prod video has been OFF). If the path is dark, standing it up for the proof is its own precondition to surface at Slice D — the code seam here is independent of that.
