# CC-TASK-04 — Dead vocab + email typo cleanup

**Draft date:** 2026-04-25 (drafted same session CC-TASK-03 closed)
**Priority:** P1 (HIGH — bundled fix for 2 of 3 HIGH findings from audit trilogy)
**Effort:** ~15 minutes
**Risk:** LOW (mechanical fixes, zero interpretation, dormant values)
**Repos touched:** `invegent-dashboard` only

---

## CONTEXT

CC-TASK-03 (frontend format + platform vocab audit, closed 25 Apr morning) surfaced 1 HIGH / 9 MEDIUM / 3 LOW findings. Two of the non-CC-TASK-02 HIGH-priority items are pure mechanical fixes with zero interpretation risk, bundled here into a single small commit.

**Findings addressed by this task (both from `docs/briefs/2026-04-25-frontend-format-vocab-audit.md`):**

- **H1** — `invegent-dashboard/app/(dashboard)/actions/video-tracker.ts:52` — exec_sql SELECT filter includes `'video_avatar'` and `'video_episode'`. Both absent from `t."5.3_content_format"` catalog. Zero rows in `m.post_draft` use them today. Dead-vocab read-path trap — silent UX bug today, latent write bug if anyone copies the pattern to an INSERT path.

- **M9** — `invegent-dashboard` reference to `STUDIO_SUPPORTED_PLATFORMS` that includes `'email'`, which is NOT a valid `platform_code` in `t."5.0_social_platform"`. Likely intended `'newsletter'` (which IS in the catalog as a configured pipeline). Single-word change; worth doing promptly because if any route writes this value to a catalog-FK-bound column, FK fires.

**Findings deliberately NOT addressed by this task:**
- CC-TASK-02 HIGH (feed-intelligence upsert partial-index) — waits on PK Option A vs B decision
- 7 other MEDIUM platform-dropdown constraints — cleanup-on-touch per CC's own recommendation
- 3 LOW `FORMAT_LABELS` Record misses — cosmetic only, raw format_key falls through as display
- Portal-side MEDIUM finding (`invegent-portal/app/onboard/OnboardingForm.tsx`) — out of scope; dashboard-only bundle
- `usePlatformVocab` / `useFormatVocab` hook pattern rollout — 3-4h focused PR, deserves PK involvement

---

## SETUP — READ FIRST

1. This brief (full)
2. `docs/briefs/2026-04-25-frontend-format-vocab-audit.md` — CC-TASK-03 findings brief. Read H1 and M9 sections for the exact file locations + code snippets + rationale
3. `docs/00_sync_state.md` — session state (orient on today's context)

**Working repo:** `invegent-dashboard` (clone or cd into it before editing). The brief and findings report live in `Invegent-content-engine`; the code fix commit goes to `invegent-dashboard` main.

**Dev workflow:** Direct-push to main per D165. No branch + PR ceremony.

**Orphan-branch sweep:** Not required for this task (small fix, no cross-repo coordination). But take 30 seconds at start to `git branch -a` and note anything unusual.

---

## OBJECTIVE

Ship two mechanical fixes in a single commit on `invegent-dashboard` main:

1. Remove `'video_avatar'` and `'video_episode'` from the exec_sql SELECT filter around `video-tracker.ts:52`
2. Change `'email'` → `'newsletter'` in the `STUDIO_SUPPORTED_PLATFORMS` array (wherever it is defined in `invegent-dashboard`)

Both changes are verified-safe: the removed values produce zero rows in production today, and the typo change matches an existing catalog entry.

---

## METHOD

### Fix H1 — dead vocab removal

1. Open `invegent-dashboard/app/(dashboard)/actions/video-tracker.ts`
2. Locate the exec_sql SELECT filter around line 52 (line number may have shifted — look for the IN clause that includes `'video_avatar'` and `'video_episode'`)
3. Remove `'video_avatar'` and `'video_episode'` from the IN clause
4. If the remaining IN clause is non-empty (e.g. still includes `'video_short_kinetic'`, etc.), leave it as-is. If removing these two leaves the clause empty, use your judgment: either drop the whole filter or keep it as a no-op; the former is cleaner, the latter is safer for diff review. Prefer the cleaner option unless there's ambiguity.
5. Grep the rest of the file for any remaining references to either value and confirm they're either tests/comments or dead code

### Fix M9 — email → newsletter typo

1. Grep `invegent-dashboard` for `STUDIO_SUPPORTED_PLATFORMS` to find the definition (the CC-TASK-03 findings brief has the exact path; search if the line has shifted)
2. Locate the `'email'` string inside the array
3. Change it to `'newsletter'` (verify the catalog spelling: `SELECT platform_code FROM t."5.0_social_platform" WHERE platform_code IN ('email','newsletter');` — expected: only `'newsletter'` returns)
4. Check callers of `STUDIO_SUPPORTED_PLATFORMS` — grep for references. Newsletter is a superset of email semantically for the UI, so callers should be unaffected. If a caller does `=== 'email'`-style string compare, flag for PK rather than extending scope.

### Verification

1. `npm run build` must pass cleanly in `invegent-dashboard`
2. `grep -RIn "video_avatar\|video_episode" invegent-dashboard/app` — should return no matches in active code. Comments, tests, or type definitions mentioning these values are acceptable; SELECT filters or runtime-used strings are not.
3. `grep -RIn "'email'" invegent-dashboard/app/api/client-profile` (or wherever `STUDIO_SUPPORTED_PLATFORMS` lives) — after the fix, `'email'` in platform contexts should be gone. Email in unrelated contexts (email fields, SMTP, etc.) is fine.
4. Optional: `npm run type-check` or equivalent if your toolchain has it
5. Open the diff one more time and confirm it's exactly the two fixes — no scope creep, no unrelated reformatting

### Commit

Single commit to `invegent-dashboard` main. Suggested message:

```
fix(dashboard): remove dead format vocab + email→newsletter typo (CC-TASK-04)

Fixes 2 of 3 HIGH findings from CC-TASK-03 frontend vocab audit:

H1 (video-tracker.ts): removed 'video_avatar' and 'video_episode' from
exec_sql SELECT filter. Both absent from t."5.3_content_format"; zero
rows in m.post_draft use them. Dead-vocab read-path trap cleanup.

M9 (STUDIO_SUPPORTED_PLATFORMS): changed 'email' to 'newsletter'.
'email' is not in t."5.0_social_platform"; 'newsletter' is the
catalog entry.

Not addressed by this commit (per scope):
- 7 MEDIUM platform-dropdown constraints — cleanup-on-touch
- 3 LOW FORMAT_LABELS misses — cosmetic
- CC-TASK-02 HIGH (feed-intelligence upsert) — waits on Option A vs B
- usePlatformVocab / useFormatVocab hook rollout — separate PR

Source: Invegent-content-engine docs/briefs/
2026-04-25-frontend-format-vocab-audit.md

Closes: CC-TASK-04
```

Then push direct to main.

---

## DELIVERABLES

1. **One commit** on `invegent-dashboard` main containing both H1 and M9 fixes
2. **Closure line** appended to `Invegent-content-engine/docs/00_sync_state.md` under the "TODAY'S COMMITS" section, invegent-dashboard block:

   ```
   - `<sha>` (dashboard) — fix: removed dead format vocab (H1) + email→newsletter (M9) — CC-TASK-04 CLOSED
   ```

3. **Sprint board update** in the same sync_state edit:
   - Remove the two entries from Sprint Board HIGH priority (CC-TASK-03 H1 fix, CC-TASK-03 M9 fix)
   - Add a "CC-TASK-04" row under Medium showing ✅ closed
4. **Backlog cleanup** in the same sync_state edit:
   - Strike through (or remove) the CC-TASK-03 H1 fix item in the Backlog section
   - Strike through (or remove) the CC-TASK-03 M9 fix item in the Backlog section
   - Leave the `usePlatformVocab` / `useFormatVocab` hook rollout item in place — that's separate work

---

## VERIFICATION CHECKLIST

Before marking closed:

- [ ] `video_avatar` no longer appears in any active code path in `video-tracker.ts`
- [ ] `video_episode` no longer appears in any active code path in `video-tracker.ts`
- [ ] `'email'` in `STUDIO_SUPPORTED_PLATFORMS` changed to `'newsletter'`
- [ ] `npm run build` passes on `invegent-dashboard`
- [ ] `grep -R` confirms no remaining references to removed values in active code
- [ ] One commit on `invegent-dashboard` main (direct-push per D165)
- [ ] Closure line added to `Invegent-content-engine` sync_state per COMMIT BACK TO SYNC_STATE section
- [ ] Sprint board + backlog entries in sync_state updated to reflect closure

---

## OUT OF SCOPE

- The 7 other MEDIUM constrained-dropdown findings from CC-TASK-03
- The 3 LOW `FORMAT_LABELS` misses
- The `usePlatformVocab` / `useFormatVocab` hook rollout (3-4h separate PR)
- Portal-side MEDIUM finding (`invegent-portal/app/onboard/OnboardingForm.tsx`) — this task is dashboard-only
- CC-TASK-02 HIGH finding (feed-intelligence upsert) — waits on PK Option A vs B
- Any reformatting, linting, dependency updates, or broader refactoring beyond the two specific fixes
- Any changes to portal or content-engine repos

If any out-of-scope work feels natural while editing (e.g. "I'm already in this file, might as well fix the other thing"), stop and flag it for a future task. Scope creep is the failure mode.

---

## EXPECTED SCALE

- ~5-15 lines of code changed total across both fixes
- 1 commit on `invegent-dashboard` main
- 1-3 lines added/removed from sync_state
- ~15 minutes wall time, 20 minutes at the outside

**If this is taking more than 30 minutes, something has drifted — stop and flag rather than extend the scope.**

---

## COMMIT BACK TO SYNC_STATE

After the fix commit lands on `invegent-dashboard` main, edit `docs/00_sync_state.md` in `Invegent-content-engine`:

1. Under the `invegent-dashboard (main):` subsection of TODAY'S COMMITS, append:
   ```
   - `<sha>` (dashboard) — fix: removed dead format vocab (H1) + email→newsletter (M9) — CC-TASK-04 CLOSED
   ```

2. In the Sprint Board HIGH priority table, remove the rows for "CC-TASK-03 H1 fix" and "CC-TASK-03 M9 fix"

3. In the Sprint Board Medium table, add a row:
   ```
   | CC-TASK-04 | dead vocab + email typo cleanup | ✅ |
   ```

4. In the Backlog section under "New 25 Apr morning (from CC-TASK-03)", strike through or remove the H1 and M9 fix entries. Leave the `usePlatformVocab` / `useFormatVocab` item.

5. Commit:
   ```
   docs(sync_state): CC-TASK-04 CLOSED — dead vocab (H1) + email typo (M9) shipped to dashboard

   Dashboard commit: <sha>
   2 of 3 HIGH findings from CC-TASK-03 resolved. Remaining HIGH:
   CC-TASK-02 feed-intelligence upsert (waits on PK Option A vs B).
   MEDIUM + LOW cleanup-on-touch items remain in backlog.
   ```

That's it. No other files to touch. Nothing else in sync_state needs to change.

---

## RELATED

- `docs/briefs/2026-04-25-frontend-format-vocab-audit.md` — CC-TASK-03 findings brief (source of truth)
- `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` — why these values became dead (catalog unified 24 Apr evening)
- `docs/00_sync_state.md` — session state
- D165 — direct-push-to-main dev workflow
