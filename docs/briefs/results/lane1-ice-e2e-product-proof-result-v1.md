# Result — Lane 1: ICE End-to-End Product Proof (read-only evidence matrix)

**Task:** PK-issued directly (no prior brief) — produce a read-only evidence matrix covering
representative governed TEXT, image_quote, and short-video journeys from schedule through
publication and dashboard evidence.
**Executed by:** Claude Code (orchestrator + 3 parallel read-only evidence agents)
**Completed:** 2026-08-06 Sydney
**Lane classification:** SIDE_PROVING / T1 (read-only, docs-only output — no code/DB/config touched)

**Amendment (2026-08-06, PK-directed, post-acceptance):** applies the weakest-hop classification
rule to the image_quote record, splits the short-video Publish hop by platform, states the
Lane 1 / Lane 2 scope boundary explicitly, and replaces §7 with exactly three follow-on pointers.
No new evidence was gathered for this amendment — it re-frames the same evidence already in §3–§6.

---

## 1. Method

**Scope boundary (explicit):** Lane 1 (this result) inspected only backend `ice_ro` read-only
evidence surfaces — curated DB views plus SELECT-level table reads — cross-cited against repo
source. It did **not** inspect the deployed dashboard UI. A separate Lane 2 inspected the
deployed dashboard UI. **Neither lane's findings should be represented as proving the other:**
Lane 1 cannot certify what the dashboard UI actually renders to an operator, and Lane 2 (UI
inspection) cannot certify backend data correctness. Treat them as complementary evidence, not
substitutes for one another.

Three independent read-only `general-purpose` agents, one per journey, each traced ONE real
currently-existing slot/draft end to end using `scripts/db-read.py` against the 10 `ice_ro.*` R0
views (zero-prompt) plus `mcp__supabase__execute_sql` (plain SELECT only) against project
`mbkmaxqhsohbtwsqolns`, cross-cited against live repo source (ai-worker, image-worker,
video-worker, publisher family, migrations). No writes, migrations, deploys, or repo edits were
performed by any agent. **The `invegent-dashboard` repo (actual dashboard UI) is not present in
this checkout** — "dashboard evidence" below means the `ice_ro.*` curated views the dashboard is
built on, not an inspection of dashboard UI code.

Full per-journey agent transcripts (raw findings, additional row IDs, code citations) are
preserved in this session; this doc is the synthesized matrix.

## 2. Constraints confirmed

- No INSERT/UPDATE/DELETE/DDL executed — confirmed not done (all three agents SELECT-only)
- No migration/deploy/apply tool invoked — confirmed not done
- No repo file edited — confirmed not done
- No schedule/asset/config mutated — confirmed not done

## 3. Evidence matrix

| Journey | Schedule | Generate / Select | Render | Publish | Dashboard evidence | **Overall** |
|---|---|---|---|---|---|---|
| **Governed text** | `legacy` — no schedule-authority pin exists for `text`; live-traced slot requested `format_preference=['image_quote']` but the Advisor silently delivered `text` instead (schedule intent overridden, not enforced). The R3a shadow resolver (`m.resolve_final_format`) computes an authority verdict but is read by nothing downstream — confirmed unwired on the very row traced. | `governed_and_autonomous` — S9 Layer 1 (`m.fill_pending_slots`) + Layer 2 (`ai-worker` `classify_format_capability`) both fail-closed, live-confirmed in the deployed bundle (v2.26.0) and in `pg_get_functiondef`. Text is registry-exempted from capability blocking (`render_engine='none'`), confirmed by zero `capability_blocked:*:text` rows ever recorded. | n/a (text has no render step) | `governed_but_supervised` — Facebook/Instagram/LinkedIn-Zapier share one enforced lock-queue (`m.publisher_lock_queue_v2`) gated on capability + an approval step; YouTube bypasses the shared queue with its own separate release-time gate; **WordPress is unsupported** by S9 enforcement (out of scope of the enforcing migration). | `legacy` (for publish visibility) — `ice_ro.publish_status` is built on `m.post_publish_queue`, which a DB trigger deletes the instant a post publishes; the view **cannot show a completed text publish**, even though the traced post genuinely published (real Facebook `platform_post_id`). `draft_status` remains accurate. | **`governed_but_supervised`**, with a **legacy format-authority gap**: generation and publish-queue gating are fail-closed and code-enforced; schedule intent for text is advisory-only and the dashboard's queue-based publish view structurally cannot surface a completed text publish. |
| **image_quote** | `governed_and_autonomous` — same S9 Layer 1/2 chokepoints, live match confirmed (`format_chosen='image_quote'` == draft's `recommended_format`). | `governed_and_autonomous` — render gated on `client_creative_governance(...).enabled`; asset selection verified against a real `c.shared_creative_asset` row where every `slot_reasons` governance claim (`governed`, `license_ok`, `text_safe_true`, `client_match`, `scrim_override_applied`) independently checks out against the row's actual columns. | `governed_and_autonomous` — fail-closed render guards (`tmr_selector_fail_closed`, `tmr_winner_unmapped`) confirmed live; a real completed render traced (`creatomate_render_id` present, `status='succeeded'`). Coverage note: only 4 of 12 registered static templates are currently reachable by the winner-text mapping — a coverage gap, not a safety gap (unmapped winners throw rather than render broken). | `governed_but_supervised` — Facebook/Instagram/YouTube share one `requireAssetPresent` backstop module; **LinkedIn runs a separate, parallel guard** (`decideLinkedinAssetGuard`) with a stale header comment but equivalent enforcement (confirmed: it live-blocked a real publish attempt on an unready image, `last_error='asset_guard_blocked:...'`). No platform silently downgrades an image post to text. Release itself is queue/approval-gated on every platform — not autonomous. | `governed_but_supervised`, gap noted — `publish_status` (queue-based) returns zero rows for an already-published sibling draft that `m.post_publish` confirms did publish; same purge-on-publish structural gap as text. `draft_status` accurate. | **`governed_but_supervised` — autonomous generation/rendering, supervised release.** Weakest-hop rule applied: schedule/select/render are `governed_and_autonomous`, each fail-closed with real production proof; release (publish) is gated (queue + approval on FB/IG/YouTube, a separate parallel guard on LinkedIn) rather than autonomous — the weakest hop, not the strongest, sets the overall record. |
| **Short-video** | `governed_and_autonomous` — a hard schedule-authority pin exists for `video_short_stat` on YouTube (`ai-worker` v2.22.0, unconditional override of the Advisor's pick, live-confirmed on a real slot). | `governed_and_autonomous`, one latent gap — `select_template` ranking is real and live-confirmed (matches what actually rendered); production always calls it with `platform=NULL`. If any future caller passed `platform` explicitly, 2 of 3 candidate templates would silently become unreachable (`platform_unsuitable:no_suitability_row_for_platform` — the same defect class cc-0089 already fixed for image_quote, latent here). `video_short_kinetic` has exactly **one** registered candidate — a genuine single point of failure for that sub-format. | `governed_but_supervised` — **correction to a prior stale memory note**: the "failed drafts never re-selected / silent no-video slot" behaviour was true pre-v3.12.0 but was fixed by v3.12.0 (`F-VIDEO-RENDER-RETRY`) + v3.13.0 (`F-VIDEO-RENDER-CLAIM`). Failures are now classified `transient` (auto-retried, capped at 3 attempts) or `terminal` (visibly labeled `video_dead_reason`, never silent). Live-traced both a retry-then-recover-then-publish case and a terminal-failure case. Open risk: no evidenced slot-level mechanism re-opens or backfills a slot once its bound draft goes terminal. | **No single classification applies uniformly — split by platform, see §3a**: YouTube = `governed/autonomous, subject to release gate`; Instagram = `governed_but_supervised, partial`; Facebook = `unsupported by design`; LinkedIn = `built but not deployed`. | `governed_but_supervised`, gap noted — `publish_status` is blind to YouTube publishes specifically (YouTube never populates the queue table it's built on); `draft_status` (`video_status`) is the accurate surface. | **`governed_but_supervised`** — schedule and template-selection are deterministic and fail-closed; render is autonomous with genuine (not silent) fail-closed labeling; publish is platform-fragmented (§3a) and slot-level recovery after terminal render failure is unverified. |

### 3a. Short-video publish — per-platform breakdown (supersedes a single lumped Publish cell)

| Platform | Classification | Evidence |
|---|---|---|
| YouTube | `governed/autonomous, subject to release gate` | Bypasses the shared lock-queue entirely; runs its own full pipeline with an explicit release-time gate (`scheduled_for` wait, `youtube-publisher` v1.14.0+) and its own retry cap (5) — autonomous once scheduled, but release itself is machine-gated on publish time, not on a human approval step. |
| Instagram | `governed_but_supervised, partial` | Genuine video support via a hold/timeout gate before posting; shares the `requireAssetPresent` backstop with Facebook/YouTube; goes through the shared lock-queue (queue/approval-gated), so release is supervised. |
| Facebook | `unsupported by design` | No video publish path exists — `publisher/index.ts` explicitly blocks rather than ever falling back to text; an intentional product boundary, not a defect. |
| LinkedIn | `built but not deployed` | `linkedin-publisher/index.ts` v1.4.0 exists in-repo with `mediaPublishSupported:false`; no `cron.job` entry — not live in production for any format, including video. |

## 4. Fail-closed proofs (evidence, not assertion)

At least one required; three independent ones were found and live-verified:

1. **Text — publish-eligibility gate blocks before spend.** Slot `76d4048d-ba25-4443-a9b9-60814b50aac9`
   (Property Pulse, facebook) → `m.slot_fill_attempt` `4a99d3bf-...`, `decision='skipped'`,
   `skip_reason='publish_path_disabled'`. Guard: `m.is_publish_eligible()` inside
   `m.fill_pending_slots` (cc-0019 gate) — fires *before* any pool query, skeleton draft, or
   AI-job/token spend.
2. **image_quote — render-time template guard.** `tmr_winner_unmapped` fail-closed guard fired
   live on drafts `b3a4aa42-...` and `e3d11975-...` during the historic 2026-07-22→23 bug window,
   then **zero occurrences since** — independently re-verified fresh (not trusted from prior
   session notes), confirming the earlier "resolved" claim still holds. Separately, LinkedIn's
   publish-time asset guard live-blocked a real attempt on an unready image
   (`asset_guard_blocked:image_required_but_failed`).
3. **Short-video — terminal render failure is visibly labeled, not silent.** Draft `452f58b9-...`
   shows 5 real ~128s timeout cycles (matching the coded 2-minute ceiling) before
   `video_status='failed'` with a named `draft_format.video_dead_reason` — a visible terminal
   state. Structurally: `alternatives[]` entries in `select_template`'s output never carry
   `provider_template_id`, so any downstream assertion checking for it is guaranteed to fail
   closed (this exact trap was hit and cleanly rolled back during a prior apply attempt,
   `docs/briefs/creatomate-video-breadth-2b-design-packet-v3.md`).

## 5. Cross-journey findings worth PK attention

- **`ice_ro.publish_status` cannot show a completed publish, for any journey.** It's built on
  `m.post_publish_queue`; a cleanup trigger purges the row on successful FB/IG/LinkedIn publish,
  and YouTube never populates the queue at all (it bypasses it by design). All three agents hit
  this independently. `draft_status` (via `approval_status` / `video_status`) is the accurate
  dashboard-facing surface today, not `publish_status`. Whether the queue-purge is deliberate
  retention policy is an open question, not confirmed either way.
- **Schedule authority is inconsistent by format.** `video_short_stat`/YouTube has a hard pin;
  `text` has none (Advisor can silently override the schedule's stated `format_preference`, as
  observed on a live row); `image_quote`'s override behaviour under a schedule/Advisor conflict
  was not independently stress-tested this pass.
- **Platform coverage is uneven and mostly by design, not oversight**: WordPress sits outside S9
  text enforcement; Facebook has no video publish path (intentional); LinkedIn's video publisher
  is built but not deployed.
- **Correction to standing memory:** `video-worker-2min-render-timeout-no-retry.md` ("failed
  drafts never re-selected = silent no-video slot") is **stale** — superseded by v3.12.0/v3.13.0
  retry+claim logic. Updating that memory record as a follow-up to this result.

## 6. Open issues / unverified (stated honestly, not guessed)

- Whether `publisher/index.ts` (FB/text path) re-checks a future `scheduled_for` at dequeue time
  the way `youtube-publisher` explicitly does.
- Root cause of the specific `publish_path_disabled` block used as the text fail-closed proof —
  the block itself and its guard code are solid evidence; the historical *why* (profile state at
  that instant) could not be reconstructed from the current audit trail.
- Whether the `m.post_publish_queue` purge-on-publish behaviour is deliberate.
- Whether any slot-level mechanism re-opens/backfills a slot after its bound video draft reaches
  terminal failure — no such code was found; worth a direct check before slot `c1f38536-...`
  (bound to terminally-failed draft `452f58b9-...`, scheduled 2026-08-13) comes due.
- WordPress's actual capability-enforcement posture beyond "excluded from the S9 migration's
  scope" was not independently investigated.

## 7. Follow-on pointers (exactly three — no new lanes opened at this stage)

Per PK instruction, platform-coverage limitations found in this audit (WordPress text exclusion,
Facebook video exclusion, LinkedIn video not-deployed) are recorded as findings only in §3/§3a/§5
and are **not** converted into new CGU Final lanes here.

1. **Urgent read-only check** — verify slot `c1f38536-67f5-421f-a314-900fc0122221` (bound to
   terminally-failed draft `452f58b9-...`, `scheduled_publish_at=2026-08-13`) before that date;
   no auto-backfill path was found in this audit.
2. **Dashboard cockpit completed-publish evidence** — the dashboard's completed-publish surface
   should be sourced from a durable publish record (`m.post_publish`), not queue residue
   (`m.post_publish_queue`, which is purged on FB/IG/LinkedIn publish and never populated by
   YouTube — see §5).
3. **Post-watch schedule-authority decision** — a PK/product decision is needed on Advisor format
   substitution (current default for `text`) versus a hard schedule pin (current default for
   `video_short_stat`/YouTube); this audit surfaces the inconsistency, it does not resolve it.
