CLAIMED v5.55 · cc-0038-b4-fail-closed-proof · shared default worktree (main) · T3 production-write proof (done, rolled back) · 2026-07-16T07:46Z

# Result cc-0038 — governed PP video fail-closed proof on a real draft (DoD B4) — PASS

**Completed:** 2026-07-16 Sydney
**Lane:** cc-0038 · **Tier:** T3 (production write on a live published draft) · **Label:** SAFETY_GATE
**Brief:** `docs/briefs/cc-0038-governed-pp-video-fail-closed-b4-proof.md`
**Outcome:** ✅ **B4 PASS → DoD Level B CLOSED** (B1·B2·B3·B4 all PASS). Draft fully restored; zero net change.

---

## What was proven

The governed PP `video_short_stat` path **fails closed** when a stat field violates the hard gate: the render throws, the draft goes `video_status='failed'` with a new `post_render_log` failure row, **NO legacy fallback**, and **nothing is published** — then the draft is fully restored. This is the one criterion a *successful* render (cc-0035) structurally cannot exercise.

## Method (mirrors cc-0035; no deploy/migration/code)
- **Elected draft:** `1f5633de-6b83-4440-90ab-6673b0b8fbaa` (client `4036a6b5…`) — publish-safe (`youtube_video_id='tZEVJW7fnyU'` non-null → publisher `IS NULL` predicate can't re-select it).
- **B4.1 write** (reviewed sha `92da4ba6…`, applied via execute_sql, CAS-guarded rowcount=1, 2026-07-16T06:31:22Z): `video_status` published→pending + `cta_text` 61→**132/133 chars** (over the 90 gate). `cta_text` is not spoken → VO composition unaffected.
- **Trigger:** cron jobid 33 (`*/30`), NOT invoked manually. Fired 07:00Z; render attempted 07:00:12Z.

## Fail-closed signature (observed 2026-07-16 ~07:29Z — all ✅)
| Assertion | Observed |
|---|---|
| draft `video_status` | **`failed`** (not `generated` → **no legacy fallback**) |
| new render-log row | +1 (2→3); exactly 1 `status='failed'`, `attempt_number=3` |
| failure cause | `error_message` = "b1_video: cta_text length 133 exceeds max_chars=90 (no truncation / no AI rewrite in v1)" — the governed hard gate |
| artifact | none — `creatomate_render_id=null`, no `storage_url`, no `_stat_governed.mp4` |
| `video_url` | unchanged (`…_stat.mp4`) |
| publish-neutrality | `post_publish`=1/`tZEVJW7fnyU`, `queue`=1 — **unchanged** |
| approval_status / youtube_video_id | untouched |

## Rollback (B4.4, reviewed sha `67d72519…`, applied 2026-07-16 ~07:44Z, rowcount=1)
Restored draft to the exact baseline: `video_status='published'` · `video_url`→`…_stat.mp4` · `cta_text`="Are you watching the Perth market? Drop your thoughts below 👇" (61) · `approval_status='approved'` · `youtube_video_id='tZEVJW7fnyU'` · `post_publish`=1 · `queue`=1. **Zero net change.** The render-log failure row (row 3) remains as the B4 evidence — correctly not rolled back.

## Review chain
- **External review** (ChatGPT bridge, pinned sha `92da4ba6…`): verdict `partial` → auto-escalated to PK (review_id `0b512196…`). Triage: **no concrete defect** — generic production-write caution + two reviewer misreads (CAS guard already asserts rowcount=1; worker is cron-fired not manually invoked). PK cleared the escalation and authorized the B4.1 write on PK authority. Classified `policy_decision` / `runtime_verification_required` — the runtime verification (the observed fail-closed signature above) is discharged.
- Pre-write STOP checks all GREEN (hash match · exact baseline tuple · publish/queue baseline). Rollback verify-or-abort hash match.

## Side-effect (harmless, recorded)
`renderGovernedVideoStat` generates+uploads the VO mp3 *before* `buildGovernedVideoStatPlan` throws, so an orphan `…_voice.mp3` may exist in `post-videos/`. It is inert (never published, not a render output). Optional cleanup; not required for the proof.

## Scope compliance
No publish · no `enabled` flip · no B-roll · no music policy change · no track approvals · no template redesign · no deploy/migration/code. The only production writes were the transient B4.1 trip and its B4.4 rollback.

## Follow-ups (NOT this lane)
- **DoD amendment** (mark Level B CLOSED in `docs/governance/pp-tmr-definition-of-done-v1.md`) is owned by **record-reconciliation**, not this lane.
- **cc-0035 CtaText clipping** carry (long real CTAs render clipped on the pill) is unchanged — a *rendering-quality* issue, distinct from this *fail-closed-safety* proof.
- **Ultimate DoD** (beyond Level B: D4 drift · D5 overprint[blocker, cc-0033a] · D6 8-units/30-lines · D7 unsound-check) remains open.
