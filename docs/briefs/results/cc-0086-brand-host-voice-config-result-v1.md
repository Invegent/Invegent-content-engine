# Result cc-0086 — Brand Host Voice governed dashboard config

**Brief file:** `docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md`
**Executed by:** Claude Code (orchestrator; ef-builder ×2 repos, branch-warden, db-rls-auditor,
apply-harness-auditor, security-auditor, external review — PK-gated at both Gate 1 and Gate 2)
**Completed:** 2026-07-29 Sydney

---

## 1. Result status

`Complete`

## 2. Commit(s)

- CE repo `32a1081` — `feat(cc-0086): Brand Host Voice governed config — write RPCs + preview EF` (pushed to `origin/main`)
- Dashboard repo `80e7185` — `feat(cc-0086): Brand Host Voice governed config panel` (pushed to `origin/main`)

## 3. Files changed

- `supabase/migrations/20260729150000_cc0086_voice_config_write_rpc_v1.sql` — created (applied live)
- `supabase/functions/voice-preview/index.ts` — created (deployed, `verify_jwt=true`, v1)
- `supabase/functions/voice-preview/index_test.ts` — created (21/21 hermetic tests)
- `invegent-dashboard/actions/voice-config.ts` — created
- `invegent-dashboard/lib/voice-config.ts` — created
- `invegent-dashboard/components/clients/BrandHostVoiceTab.tsx` — created
- `invegent-dashboard/app/(dashboard)/clients/page.tsx` — modified (wired new tab)
- `docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md` — created (Gate 1)
- `docs/briefs/artifacts/cc-0086-voice-config-apply-packet-v1.md` — created (static harness audit input)

## 4. Actions taken

- Drafted and PK-approved (Gate 1) a T3 brief after correcting the task's stated ground truth:
  `c.client_voice_config` and the worker's read path (`resolveGovernedVoice`) already existed live,
  but had zero RPC/dashboard surface — populated only by direct out-of-band DB access.
- Built the CE-side migration (audit table `c.client_voice_config_change_log` + `get_voice_config`/
  `save_voice_config` RPCs) and the `voice-preview` edge function in an isolated worktree; built the
  dashboard panel in a separate isolated worktree against a fixed, pre-agreed contract so both sides
  matched without a second round-trip.
- Full review chain: branch-warden (both repos, safe) → db-rls-auditor (concerns → fixed → pass) →
  apply-harness-auditor (INCOMPLETE → fixed → PASS, shadow) → security-auditor (GREEN, one named
  residual) → external review (`partial`, auto-escalated one policy point to PK).
- Two review-driven fixes applied before re-review: explicit `BEGIN;`/`COMMIT;` transaction wrapper
  (atomicity was previously implicit/unnamed), and explicit `REVOKE ALL ... FROM service_role,
  inspector_ro` on both new functions (matching the audit table's own defensive pattern).
- PK Gate 2: resolved the one escalated policy point (`voice-preview`'s anon-JWT reachability — ship
  as-is, track hardening separately) and approved the full deploy sequence.
- Executed the sequence: applied the migration (`mbkmaxqhsohbtwsqolns`), deployed `voice-preview` via
  the sanctioned `scripts/safe-deploy.sh` path (no `--no-verify-jwt`, confirmed live `verify_jwt=true`),
  committed + fast-forward-merged + pushed both repos, dashboard auto-deployed to production
  (`dashboard.invegent.com`, Vercel deployment `dpl_AdsmL4eeFWeioiZboXg69XYgC4Sk`, READY).
- Post-apply no-regression proof: live re-read of `c.client_voice_config` shows the property-pulse
  and ndis-yarns rows byte-identical to the pre-change baseline (same voice IDs, `enabled=true`, same
  `created_at`/`updated_at` timestamps — confirming nothing wrote to them); `video-worker/voice_id_test.ts`
  still 7/7 passing on current `main`; `video-worker` was not touched or redeployed by this lane.
- Cleaned up both isolated worktrees after merge.

## 5. Constraints confirmed

- `video_id.ts` / `resolveGovernedVoice` / any `video-worker/index.ts` code path — confirmed
  byte-identical before and after (branch-warden ×2 passes + post-deploy test re-run)
- `ELEVENLABS_API_KEY` — not rotated, not exposed in any RPC/response/log (security-auditor traced
  every read site)
- `actions/voice.ts` / `c.content_type_prompt` — confirmed untouched in both worktree passes
- No RLS policy added to the existing `c.client_voice_config` table; no change to its grants
- No `--no-verify-jwt` applied to `voice-preview` — confirmed live (`verify_jwt: true`)
- No merge/push to shared main without a fresh PK gate — both merges executed only after PK's
  Gate 2 approval of the named sequence

## 6. Open issues

- **`voice-preview` anon-JWT reachability** (named by both security-auditor and external review,
  independently): `verify_jwt=true` accepts any validly-signed project JWT, including the public
  anon key — no role/claim check inside the function. Cost/abuse-only (fixed sample sentence, zero
  DB write, zero data exposure); structurally identical to the already-live `brand-scanner`
  function's actual posture. **PK decision:** ship as-is; track a role-check/rate-limit as a
  separate future backlog item — not part of this lane.
- **Minor factual correction to the review record:** the security review assumed `brand-scanner`
  (unlisted in `config.toml`) has `verify_jwt=true` by analogy. Live `list_edge_functions` shows
  `brand-scanner` actually has `verify_jwt=false` today — it must have been deployed at some point
  with `--no-verify-jwt` explicitly. This doesn't change `voice-preview`'s correctness (it got the
  posture the brief actually wanted, `verify_jwt=true`), just corrects the stated analogy.
- **Unrelated concurrent lane observed mid-build:** a separate, already-PK-approved "B-roll Parity
  Activation v1" lane landed on `main` (commits `d5ddca1`/`b7568ce`) between our worktree branching
  and our merge. Verified disjoint (no shared files, no touch to `voice_id.ts` or any voice-resolution
  call site) before rebasing our branch onto it — not a regression, not caused by this lane.

## 7. Next recommended step

None required for this lane. Optional, PK-elective, separate backlog item: add a lightweight
role-claim check or rate limit to `voice-preview` (and, if desired, the pre-existing `brand-scanner`)
to close the anon-JWT cost/abuse gap named above.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the brief: read/write/preview/audit/fail-closed-status/no-regression-proof all
  delivered as specified, stopping at deploy gates as instructed.
- All forbidden-action constraints confirmed not violated (see §5).
- Unexpected files changed: none beyond the two repos' declared file sets.
- Success criteria met: migration clean apply + rollback validated; RPCs upsert-capable and
  fail-closed; dashboard shows three explicit states with no silent-blank case; preview persists
  nothing; no-regression proof passed live.
- New risk surfaced and PK-resolved: `voice-preview` anon-JWT reachability (see §6) — accepted,
  not blocking.
- Follow-up: none mandatory; optional hardening item noted above.

## 9. Learning notes (chat fills this)

- The task's own "ground truth" statement was subtly wrong (claimed the worker already read
  `c.client_voice_config` via a live table with no RPC gap framing) — worth always independently
  re-verifying a task's stated ground truth against live DB/repo evidence before drafting a brief,
  even when it sounds authoritative in the prompt.
- Two independent reviewers (db-rls-auditor, apply-harness-auditor) converging on the exact same
  atomicity concern from different angles was a strong signal it was real and cheap to fix outright
  rather than argue about whether the implicit-transaction assumption was "probably fine."
- Sending a fix instruction to the wrong parked agent (branch-warden instead of ef-builder) cost one
  wasted round-trip — worth double-checking the recipient's role/capability before resuming an agent
  by ID rather than by name when several are in flight.
- Unexpected origin movement mid-lane (Convention 2's named STOP) is real and did occur here — the
  fix was cheap (verify disjoint files, rebase, proceed) precisely because the two lanes touched
  completely different files; this would have been a much harder judgment call had they overlapped.
