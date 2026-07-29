# Gate-1 Architecture + Implementation Boundary — S9 Permanent Capability Enforcement

**Author:** orchestrator (this session) · **Date:** 2026-07-28 Sydney
**Lane:** S9 Capability Enforcement (per `capability-demand-architecture` PK routing, 2026-07-28)
**Tier:** design/read-only this lane (T1) → the resolver and publisher builds it authorizes are each their own future T3 lane
**Status:** ARCHITECTURE APPROVED BY PK (2026-07-28, five rulings — §0a) — this revision incorporates them. **No code, migration, or config was changed to produce this document** (one read-only re-verification pass was run after the rulings — see §0b). Everything below is either a direct source citation (file:line) or a live read-only DB finding, gathered via `db-rls-auditor` + `Explore` + direct `Read`/`Grep`/`Bash`.
**Supersedes nothing; extends:** `docs/briefs/ndis-capability-leak-interim-containment-plan-v1.md` + `docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md` (the temporary all-4-platform pause, APPLIED 2026-07-28 08:52:27 UTC, still live) and `docs/briefs/cc-0079-schedule-format-authority-architecture-gate1-v1.md` (the original read-only diagnosis this design completes).

---

## 0a. PK rulings of record (2026-07-28)

PK approved the Gate-1 direction with five rulings, recorded verbatim in substance:

1. **Classifier dependency** — correct the classifier-record status (see §0b — ground truth moved further than the ruling's own premise); the classifier must be reconciled into main and proven against the live DB **before enforcement implementation begins**; do not reapply the function.
2. **WordPress** — excluded from Capability Enforcement v1. V1 covers exactly the four currently-contained NDIS platforms (Facebook, Instagram, LinkedIn, YouTube). WordPress is recorded as a future caller/dequeue census item, not built now, unless evidence shows it currently publishes the same NDIS drafts (checked — see §1.4).
3. **Blocked-state representation** — use the existing format-authority fields, no new schema in the first enforcement slice: preserve `requested_format`; do not substitute a legacy resolved/recommended format; set `final_format_authority = 'blocked_by_capability'`; preserve the classifier's status + blocker reason in the existing reason/metadata surface; never misuse render (`video_status`), approval (`approval_status`), or publish-failure statuses for capability blocking.
4. **Release sequence** — do not release all four platform pauses together. Order: Facebook → Instagram → LinkedIn → **YouTube last**. Each platform passes the defined release evidence (§5) independently; YouTube stays paused until its two separate entry paths are proven fail-closed.
5. **Gate-1 completion** — before treating this architecture as approved: correct the classifier-record status; run adversarial external review on the final packet; confirm all 11 resolver fallback paths converge through the enforcement boundary; confirm the shared queue predicate covers live Facebook/Instagram/LinkedIn; confirm both YouTube entry paths are included; confirm auto-approver cannot revive/approve a capability-blocked draft; record these five rulings. Then commit + push the packet, its review evidence, and a register pointer. Stop after that — no resolver/publisher implementation this session. The 4-platform NDIS pause remains live until permanent enforcement is deployed and proven.

Each is addressed in place below (§0b, §1.4, §2.1/§4, §5, §10).

## 0b. Classifier-record status — ground truth as of this revision (flagged discrepancy)

Ruling 1's own premise (as stated) was: artifacts preserved and pushed on `lane/shared-capability-classifier @ adbedca`, not yet reconciled into main. **Fresh verification this session (`git fetch` + direct read + a live `db-rls-auditor` re-check) shows ground truth has moved past that premise:**

- `adbedca` is the tip of `lane/shared-capability-classifier`'s own WIP recovery-snapshot commit ("chore(shared-capability-classifier): recovery-session snapshot of WIP") — the same pattern as the unrelated `lane/s9-cta-text-bounded-regen` branch (§1.6), not "the classifier committed to main."
- **The classifier's migration, brief, and result doc are already committed to `main`** — commit `14453ff` ("docs(v6.46): S5 shared capability contract classifier — durable record committed"), register marker v6.46.
- **`main` is already fully pushed** — `git fetch origin` + `git rev-list --left-right --count main...origin/main` → `0 0` (zero ahead, zero behind).
- **Byte-match + live-behavior re-confirmed fresh, post-commit:** the committed file's sha256 (`44770731aded356bc1fb3d9ab5f6219ace21d1b35937713a3b6e22dd54028629`) matches the register claim exactly; `pg_get_functiondef('public.classify_format_capability(text,text,text)'::regprocedure)` is character-identical to the committed file (only cosmetic pretty-printer formatting differs); re-running the `image_quote`→`ready` and `video_short_avatar`→`unsupported_silent_degrade` proof cells against the live function today reproduces the original result doc's findings exactly, including the silent-degrade evidence (`publish_count: 54`, `latest_published_at: 2026-07-27T08:15:07.9Z`).

**Conclusion: Ruling 1's precondition — "reconciled into main and proven against the live DB before enforcement implementation begins" — is already satisfied**, ahead of the ruling's own stated premise. Recorded here as verified current fact rather than the stated-stale premise, since writing "not yet reconciled" into this permanent record would now be factually wrong. **The function was NOT reapplied** — only its already-committed source and already-live behavior were read and compared, per the ruling's explicit instruction.

The classifier's own proof run additionally surfaced a **scope-widening safety finding**: NDIS-Yarns's `unsupported_silent_degrade` status is live not just for `video_short_avatar` (the 2026-07-27 YouTube incident named in the containment plan, 54 publishes/90d) but **also for `carousel` (Instagram) and `video_short_stat` (YouTube)** — both confirmed via 3 recent publishes each. The interim containment's blunt 4-platform pause already covers all of these (it stops the platform, not the format-cell), but **any permanent enforcement design must close all three cells, not just the one named in the original incident.**

---

## 1. Grounding summary (what is true today, cited)

### 1.1 The classifier (built, dark, now committed + pushed to main — §0b)

`public.classify_format_capability(p_client_slug text, p_platform text, p_format text) RETURNS jsonb` — SECURITY DEFINER, owner `postgres`, `STABLE`, `search_path=''`, **`service_role`-only EXECUTE** (`anon`/`authenticated` explicitly denied, confirmed via `has_function_privilege`). Composes `public.select_template` (governance authority) + `public.resolve_slot_assets` (asset-shortage vs. pipeline-missing split) + a `m.post_publish`-based silent-degrade overlay (90-day window, tunable). Returns exactly one of:

`ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade` — plus a fail-closed `unknown`.

**Precedence rule (load-bearing):** `unsupported_silent_degrade` is checked **first** and is mutually exclusive with the other five — if a cell has recently published despite `select_template` fail-closing, that overrides whatever the underlying blocker would otherwise report (the blocker reason is preserved in `reason_code`, not lost). This is a deliberate PK ruling from the classifier's own gate, not an accident.

### 1.2 R3a shadow resolver — confirmed still shadow-only, zero enforcement power

`m.resolve_final_format(uuid,text,text,text,text)` exists live; all 9 shadow columns exist on `m.post_draft`. Live sample (last 7 days, 31 shadow-aware rows): **`recommended_format` equals `advisor_format` in 100% of rows** — the resolver's disagreement is never consumed. Direct proof case: `post_draft_id 88ee5ee7…` (2026-07-27) — `advisor_format='video_short_avatar'`, `shadow_resolved_format='video_short_kinetic'`, `final_format_authority='resolver_fallback'`, `final_format_reason='legacy_advisor_ineligible:video_short_avatar'`, and yet **`recommended_format` stayed `'video_short_avatar'`** — confirmed by the resolver's own applied SQL comment: *"...it does NOT write recommended_format (advisor remains live authority until R3c)"* (`r3a-resolver-shadow-migration-v4.sql:310-315`).

**Open forensic note, explicitly flagged rather than papered over:** neither this row's `recommended_format`, nor any code in `ai-worker/index.ts` / `heygen-worker/index.ts` / `video-worker/index.ts`, was found to actually *write* `video_short_kinetic` for this draft — `heygen-worker` only ever queries `recommended_format='video_short_avatar'` (`index.ts:394`, `:597`) and fails closed to `video_status='failed'` when no avatar is eligible, it does not itself substitute kinetic. The exact code path that produced a **published kinetic-style video** for an avatar-requested NDIS YouTube slot could not be pinned to a single current-code branch in this grounding pass — it is most likely mediated by the schedule-fill stage's own hardcoded YouTube default (§1.3) combined with an older code shape, not fully reproducible from today's source. **This does not block the design below**: the proposed enforcement is a fail-closed chokepoint inserted *before* any format is finalized or dispatched to any renderer, which closes the class of bug regardless of which exact historical path produced any one incident. It is named here as an open item for whoever builds the resolver change to re-verify against current `heygen-worker`/`video-worker` source at build time, not to assert as solved.

### 1.3 Every current resolver fallback path (ai-worker, exhaustive, file:line)

| # | Location | Trigger | Result |
|---|---|---|---|
| 1 | `ai-worker/index.ts:1364` | Advisor never invoked (no key / empty palette) or `callFormatAdvisor` throws (caught `:1371-1373`) | `decidedFormat` stays initial value `'text'` |
| 2 | `ai-worker/index.ts:827` | LLM returns a `format_key` outside the platform-filtered candidate list | `'text'` |
| 3 | `ai-worker/index.ts:782` | Zero buildable+enabled formats for `(client, platform)` | synthetic single-entry `text` palette |
| 4 | `ai-worker/index.ts:800-803` | Format-context query throws | same synthetic `text` palette |
| 5 | `ai-worker/index.ts:789-797` | Reads `preferred_format_facebook` regardless of `platform` param | preference bias silently nulled for YouTube/Instagram/LinkedIn |
| 6 | `ai-worker/index.ts:1233` (evergreen path) | `job.input_payload.format` null on an evergreen job | `'text'`, written **directly** to `recommended_format`, bypassing Advisor + resolver |
| 7 | `ai-worker/index.ts:1381-1386` | `input_payload.format==='video_short_avatar'` (A2 override) | pins `decidedFormat` unconditionally, **no eligibility check** |
| 8 | `ai-worker/index.ts:1396-1402` | `input_payload.format==='video_short_avatar_dialogue'` (cc-0084) | pins to `video_short_avatar`, **no eligibility check** |
| 9 | `ai-worker/index.ts:1410-1417` | `input_payload.format==='video_short_stat' && platform==='youtube' && governanceEnabled` | pins to `video_short_stat`; the *only* one of the three pins with any live gate, and that gate gets to see PP only |
| 10 | `m.resolve_final_format`, consumed at `:1556-1561` main / `:1241-1246` evergreen | Resolver computes `resolver_fallback`/`governed_skip` | **Discarded** — written only to shadow columns; this is the chokepoint gap |
| 11 | `m.fill_pending_slots` (schedule-fill, upstream of ai-worker; **outside this grep**, per `cc-0079-schedule-format-authority-architecture-gate1-v1.md:87,163`) | Legacy path falls to `c.client_publish_profile.preferred_format_<platform>`, **YouTube hardcoded to `'video_short_avatar'` in the function body**; separately `COALESCE(format_preference[1],'image_quote')` | Sets `job.input_payload.format` *before* ai-worker ever runs — the origin of the `video_short_avatar` request in the incident |

`m.slot.format_chosen` (the schedule's own desired-format record) is confirmed read by **nothing** in production — telemetry-only (`obs-observer`) — unchanged from the cc-0079 finding.

### 1.4 Publisher dequeue/claim mechanisms (all 4, confirmed current + a 5th found)

| Publisher | Dequeue | Claim mechanism | Chokepoint for a blocked-state predicate |
|---|---|---|---|
| Facebook (`publisher`) | `m.publisher_lock_queue_v1` (defaults `platform='facebook'`), `index.ts:284` | Row lock via RPC (`status='running'`, skip-locked) | Inherited automatically — v1 is a pure delegating wrapper to v2 |
| Instagram (`instagram-publisher`) | `m.publisher_lock_queue_v1`, `p_platform='instagram'`, `index.ts:452` | Same RPC lock; bounded `attempt_count` retry → terminal `dead` (`index.ts:893-929`) | Inherited via v2 |
| LinkedIn — **active** (`linkedin-zapier-publisher`) | `m.publisher_lock_queue_v2` directly, `p_platform='linkedin'`, `index.ts:115` | Same RPC lock | Inherited via v2 directly |
| LinkedIn — dead code (`linkedin-publisher`) | n/a — confirmed **undeployed** ("not deployed yet" per its own header) | n/a | Not a design target |
| YouTube (`youtube-publisher`) | **Bypasses the lock queue entirely** — direct `SELECT` on `m.post_draft`, `index.ts:298-308`, gated on `video_status='generated' AND approval_status IN ('approved','published') AND video_url IS NOT NULL AND youtube_video_id IS NULL AND scheduled_for` release check | **Two-stage**: SELECT, then an independent atomic `UPDATE ... SET draft_format={yt_publish_claim_at:now()}` at `index.ts:401-426` as "the last guard before the irreversible public upload" | **Needs two edits**, not one: the SELECT predicate *and* a re-check immediately before the claim UPDATE (closes the TOCTOU window the file already defends against for other conditions) |
| **Excluded from v1 — WordPress (`wordpress-publisher`)** | Same schedule-blind direct-read shape as YouTube, gated on `approval_status='approved'`, `index.ts:153` | n/a | **PK ruling 2: excluded from v1.** Confirmed NOT currently reachable for NDIS-Yarns: (a) zero `wordpress`/`blog` rows in NDIS-Yarns's `c.client_publish_profile`; (b) zero `m.post_publish` history for this client on that path, ever; (c) the function's own client-selection query gates on `c.client.profile->>'website_publish_enabled'='true' AND wp_site_url IS NOT NULL AND wp_username IS NOT NULL` — all three are `NULL` on NDIS-Yarns's profile, so the function would never enumerate this client regardless of draft state. **Recorded as a future caller/dequeue census item** — the census must check those three `c.client.profile` JSON keys specifically (not just `client_publish_profile`, which this publisher doesn't consult) — that JSON-key gate is the actual control surface. NDIS-Yarns holds 128 approved `platform='facebook'` drafts this function's row-selection would immediately treat as eligible the moment those keys were ever set. |

**`m.publisher_lock_queue_v1`/`v2` are live catalog objects with no tracked migration file in this repo** — their body is known only via the audit packet's verbatim quote and this session's confirmation. Any resolver/publisher build must pull the live definition fresh (`pg_get_functiondef`) before drafting DDL, and should backfill a migration file for provenance as part of that lane — this repo cannot currently diff against it.

**Confirmed: zero capability/readiness check exists on any of the 4 (or the 5th) publisher today** — the only gates at publish time are `approval_status`, `publish_enabled`/`paused_until`, throttle, and per-platform asset-presence. This is exactly the gap Objective 2 closes.

**A guard that must move together with the publisher change:** `auto-approver/index.ts` fetches via `m.auto_approver_fetch_drafts`, whose only eligibility filter is `approval_status='needs_review'` (`20260503085435_f_aap_001_auto_approver_fetcher_v4_compat.sql:133`) — it has **no capability awareness at all**. If a blocked draft's `approval_status` is ever left at/returned to `needs_review`, this function will silently re-approve it on its next tick, independent of whatever gate is added at the publisher. **The design principle this forces: the publisher-side capability gate must not trust `approval_status` as a safety proxy — it must independently re-check capability at dequeue, every time, regardless of approval state.**

**A related, NOT-in-scope-here fail-open bug, flagged for its own hardening item:** `youtube-publisher`'s per-client `paused_until` preload is wrapped in `try{}catch(_){}` (`index.ts:313-320`) and **fails open** on a read error. It doesn't invalidate this design (verified live today the read succeeds), but it means YouTube's platform-level hold is structurally weaker than FB/IG/LI's fail-closed lock-queue predicate — worth naming explicitly in the release criteria (§5).

### 1.5 Dashboard-visible state — a parallel packet already exists, ready, blocked on 2 PK decisions

`docs/briefs/format-capability-indicator-implementation-packet-v1.md` (S2 lane) is a **complete, packet-ready** design for a dashboard "Capability" column reading this same classifier, rendering `Planned — blocked by capability` without hiding the desired/scheduled format. It explicitly stops short of building, pending exactly two PK decisions:

1. Whether to invent a 7th "Publisher path missing" status (the packet recommends **no**, defer — the classifier's 6+unknown vocabulary already carries the reason text under whichever bucket it falls into).
2. Whether to build now against the live-but-uncommitted classifier and hold merge/deploy until its record lands, or wait entirely.

**This Gate-1 does not re-design the dashboard surface** — Objective 3 below is scoped to *what the resolver/publisher layer must preserve and expose*, so that the already-designed S2 indicator (or any future consumer) has something correct to read. The S2 packet and this one should reconcile on the same status vocabulary; recommend not diverging.

### 1.6 `lane/s9-cta-text-bounded-regen` — confirmed UNRELATED, a naming collision only

The preserved branch (`origin/lane/s9-cta-text-bounded-regen`, tip `2aeedb3`, explicitly marked "recovery-session snapshot of WIP... Not tested-clean, not reviewed, not gated") modifies `ai-worker/index.ts` + adds `video_stat_bounds.ts`/tests. Its actual content (confirmed by full diff read) is a **producer-side bounded-regeneration guard for `video_short_stat`'s script fields** (`cta_text`/`stat_value`/`stat_label`/`context_line`) — it catches a script that would trip the *render-gate* length bounds in `video-worker/b1_video_stat.ts` and re-prompts the LLM up to 2 extra times before returning a typed rejection sentinel, so a doomed draft never enrolls for render. This is a **dead-draft precondition repair for one video format's copy generation** — it has **zero relationship to format-capability classification, resolver fallback semantics, or publisher enforcement.** It happens to carry the label "s9" (its own commit message header: *"v2.21.0 (2026-07-25) — S9 BOUNDED-COPY REPAIR"*), which **collides with the "S9 Capability Enforcement" session name** used elsewhere in current routing — the same task-ID collision pattern already seen once with cc-0046. **Recommendation: rename this branch's internal "S9" label to avoid confusion (e.g. a distinct slug like `video-stat-bounded-regen`) when it is next picked up; do not merge it as part of, or block it on, the capability-enforcement lane.** It is WIP, untested-clean per its own commit message, and its fate (finish/discard/rebase) is a separate, unrelated PK call.

---

## 2. Objective 1 — Resolver enforcement architecture

**Requirement (PK):** a non-Ready requested format must become visibly `blocked_by_capability`; it must not fall through to a legacy format.

### 2.1 Design: one authoritative chokepoint, defense-in-depth at three insertion points

Rather than patching each of the 11 fallback paths in §1.3 individually (guaranteed to miss one — that IS how this leak happened across three separate format cells), the design is a **single classifier call, inserted at the point every path in §1.3 already funnels through**, plus two cheaper defense-in-depth checks upstream and downstream of it:

- **Layer 1 (schedule-fill, `m.fill_pending_slots`):** before the function's existing `COALESCE`/hardcoded-YouTube-default logic assigns a format to a new slot, call `classify_format_capability(client_slug, platform, candidate_format)`. If non-`ready`, do not silently substitute another legacy default — either pick the next candidate from an explicit, PK-approved allow-list ranked by preference, or leave the slot in its existing `status='skipped'` machinery with a new `skip_reason` code (§4) naming the blocked format. This is the earliest possible gate and matches cc-0079's own original recommendation (`cc-0079-schedule-format-authority-architecture-gate1-v1.md:161`, "capability check at `m.fill_pending_slots`, before the skeleton `m.post_draft` INSERT").
- **Layer 2 (`ai-worker`, the actual chokepoint):** immediately before the single write site that finalizes `decidedFormat` into `recommended_format` (main path `index.ts:1542-1562`, evergreen path `:1224-1246`), call the classifier on `(client, platform, decidedFormat)` — **after** the Advisor's pick and **after** the three unconditional pins (#7/#8/#9 in §1.3), so the check is the true last word regardless of which of the 11 paths produced `decidedFormat`. Non-`ready` → **per PK ruling 3, using only existing format-authority fields, no new schema:**
  - **`requested_format` preserved unconditionally** — records what was actually asked for (the candidate that failed classification), never silently altered.
  - **`recommended_format` is NOT written to `decidedFormat`, the pin's forced value, `'text'`, or any other substitute — no legacy format is substituted.** It is left unset/null for this draft. Every current renderer (`heygen-worker`, `video-worker`) and every current publisher's queue-population path key off specific `recommended_format` values (§1.3/§1.4) — a null value matches none of them, so nothing downstream can pick the draft up for render or publish. **Build-time verify item (not resolved by this Gate-1):** confirm `m.post_draft.recommended_format` is nullable; if it currently carries a `NOT NULL` constraint, relaxing that is the one minimal, explicitly-named DDL touch this slice would require — not a new column or table.
  - **`final_format_authority = 'blocked_by_capability'`** — a new *value* within the existing free-text `final_format_authority` column (already carries `advisor`/`governed_skip`/`resolver_fallback`/`resolver_unavailable` with no CHECK-constrained enum found in this grounding pass — adding a value is a data convention, not schema DDL; re-verify no CHECK exists at build time).
  - **`final_format_reason` carries the classifier's own `status` + `reason_code` + evidence verbatim** (existing free-text column, unchanged shape) — not a re-derived string, matching the same "don't reproduce classifier logic independently" rule the S2 dashboard packet already follows.
  - **Never** written: no `video_status` transition (render/failure statuses stay untouched — this is not a render failure), no `approval_status` change (approval/rejection statuses stay untouched — this is not an approval decision), no publish-failure status of any kind. Capability blocking is deliberately invisible to all three of those surfaces, exactly as ruled.
  - This one edit point closes fallback paths #1, #2, #3, #4, #6, #7, #8, #9, and #10 in §1.3 simultaneously, because all of them terminate at the same write site.
- **Layer 3 (render-dispatch, `heygen-worker`/`video-worker`, belt-and-braces only):** both workers already query strictly by `recommended_format` value (`heygen-worker/index.ts:394,597`) — if Layer 2 is built correctly, a blocked draft never reaches `recommended_format` at all, so Layers 1+2 should be *sufficient* and Layer 3 is optional hardening (re-check classify at submit time) rather than a required build item. Recommend scoping it out of the first build and revisiting only if a real bypass (manual job creation, a script that writes `recommended_format` directly) is found to exist.

**Fail-closed classifier-call semantics (non-negotiable, matches the classifier's own `unknown` design):** an RPC failure (timeout, error, unreachable) must be treated as **not `ready`** — never silently treated as Ready to keep content flowing. This mirrors the classifier's own `unknown` status and the dashboard packet's handling (§1.5) — the resolver side must not diverge from that convention.

### 2.2 What does NOT change

- `select_template`, `resolve_slot_assets`, and the classifier itself are **read-only inputs** to this design — no change to their logic.
- The R3a shadow columns (`advisor_format`, `shadow_resolved_format`, `final_format_authority`, etc.) stay exactly as they are; this design does not flip R3a to authoritative (R3c) and does not require it to. The classifier-based gate is a **separate, additive** enforcement layer sitting downstream of whatever `decidedFormat` value the Advisor/pins/resolver-shadow arrive at — it does not replace the format-*selection* logic, only adds a final capability veto before persistence.
- The three unconditional pins (A2 avatar override, cc-0084 dialogue, schedule-authority video_short_stat pin) keep their existing trigger conditions; they simply no longer bypass the capability check on the way to `recommended_format`.

---

## 3. Objective 2 — Publisher enforcement architecture

**Requirement (PK):** a blocked/non-Ready draft must never enter any publisher queue, even when already approved, even when a publisher is schedule-blind.

### 3.1 Design

- **FB/IG/LinkedIn(-zapier) — one shared edit:** add a predicate to `m.publisher_lock_queue_v2`'s eligibility CTE excluding any row carrying the new blocked-state marker from §4 (a join or subquery against `m.post_draft`). Because `v1` is a pure delegating wrapper (`SELECT * FROM m.publisher_lock_queue_v2(...)`, confirmed live), this single DB-side edit is inherited by all three platforms simultaneously with no EF code change on their side.
- **YouTube — two edits required**, because it bypasses the lock queue:
  1. Add the same blocked-state exclusion to the existing SELECT predicate (`index.ts:299-308`).
  2. Add a **per-row re-check immediately before the `yt_publish_claim_at` UPDATE** (`index.ts:410-426`) — matching the file's own established pattern of re-checking conditions right before its "last guard before the irreversible public upload" comment, closing the same TOCTOU-shaped window it already defends against for other conditions.
- **WordPress — excluded from v1 (PK ruling 2).** Confirmed not currently reachable for NDIS-Yarns (§1.4) — deferred to a future caller/dequeue census, not built in this slice.
- **`auto-approver` guard (mandatory, not optional):** independent of how the blocked state is represented, `m.auto_approver_fetch_drafts`'s `WHERE approval_status='needs_review'` filter (or the EF's `evaluateGates`) must also exclude capability-blocked rows — otherwise a blocked draft that is left at (or returns to) `needs_review` gets silently re-approved on the next auto-approver tick, defeating the publisher-side gate's purpose the moment `approval_status` flips back to `approved`. This is why §3.1's publisher-side predicate must re-check capability independently at dequeue rather than trusting `approval_status` as a safety proxy (§1.4).
- **`crosspost_facebook_to_linkedin`:** confirmed a documented no-op today (disabled since D154); no action needed unless it is ever re-enabled, at which point it needs the same guard.

### 3.2 What does NOT change

- Existing lock/claim/retry/dead-letter mechanics on all publishers are untouched — the new predicate is additive to the eligibility check, not a replacement of the locking mechanism. `attempt_count`, `dead_reason`, `last_error*` semantics are preserved exactly.
- `youtube-publisher`'s fail-open `paused_until` preload bug is **not** fixed by this design (out of scope, named in §1.4) — flagged separately in §5 as a release-criteria consideration, since it is a structurally different weakness from the capability gate being added here.

---

## 4. Objective 3 — Dashboard-visible state (what the resolver/publisher layer must preserve, not the UI itself)

**Requirement (PK):** preserve the desired schedule and blocker reason instead of silently changing the requested format.

This objective is a **contract the resolver enforcement (§2) must honor**, so that the already-designed S2 dashboard indicator (§1.5) — or any future consumer — has correct, non-destructive state to read. **Per PK ruling 3: existing format-authority fields only, no new schema in this slice.** This section is now identical in substance to §2.1's Layer 2 write behavior — restated here as the dashboard-facing contract:

- **Desired format, preserved:** `m.post_draft.requested_format` becomes the authoritative record of what was actually asked for, written unconditionally regardless of whether the resolver blocks it — **never** altered to reflect a substitute. `m.slot.format_chosen` (already exists, currently read by nothing) remains the schedule-level desired-format record and is likewise **never overwritten** by a block. This directly satisfies "preserve the desired schedule... instead of silently changing the requested format."
- **No legacy format substituted:** `recommended_format` is left unset/null rather than written to any fallback value (§2.1) — the classifier's block, not a legacy pick, governs whether it's written at all.
- **Blocker authority + reason, in the existing surface:** `final_format_authority = 'blocked_by_capability'` (a new value in the existing free-text column, not a new column) + `final_format_reason` carrying the classifier's `status`/`reason_code`/evidence verbatim (existing free-text column, unchanged shape) — not a re-derived string, matching the dashboard packet's own "do not reproduce classifier logic independently" rule.
- **Explicitly not used for this:** `approval_status` (no new value, no reuse of `dead`/`rejected`/`voided`), `video_status` (no `failed`/render-status reuse), and no publish-failure status of any kind — capability blocking is a distinct concept from all three per PK ruling 3, and this design does not conflate them.
- **Slot-level:** `m.slot.skip_reason` already follows a semicolon-composable, prefixed-code convention (`pool_thin`, `compliance_skip:<reason>`, `exceeded_recovery_attempts`) — a new prefixed code (`capability_blocked:<format>`) is consistent with the established pattern for Layer 1 (§2.1) and requires no new column or new `m.slot.status` value, consistent with ruling 3's no-new-schema instruction.
- **Reconciliation with the S2 indicator packet:** the exact field/value names above (`requested_format`, `final_format_authority='blocked_by_capability'`, `final_format_reason`) should be handed to the S2 dashboard lane (currently blocked on 2 unrelated decisions per §1.5) so the two stay on one vocabulary — the resolver build lane should name this handoff explicitly rather than assuming S2 independently re-derives it.

---

## 5. Objective 4 — Containment-release criteria

**Requirement (PK):** define exactly what must be proven before the four NDIS publishing pauses (`paused_until=2027-01-01` on facebook/instagram/linkedin/youtube, applied 2026-07-28 08:52:27 UTC) can be rolled back.

All of the following must be true, evidenced, before **each platform's own** rollback of the containment apply packet's §7 SQL is executed — **per PK ruling 4, platforms release independently, in order, not together:**

1. **Classifier durable record — satisfied (§0b).** Committed to main, pushed, byte-verified against live behavior. No longer a per-release gate; carried here only for completeness.
2. **This platform's enforcement live**, not just designed: the §2 resolver chokepoint (Layers 1+2) AND this platform's share of the §3 publisher chokepoint — for Facebook/Instagram/LinkedIn, the shared `publisher_lock_queue_v2` predicate; for YouTube, **both** its SELECT-predicate edit and its pre-claim re-check edit — plus the `auto-approver` guard (applies to all four, since it gates re-approval regardless of platform).
3. **This platform's non-Ready NDIS cells re-verified closed.** At minimum `video_short_avatar` (YouTube) and `video_short_stat` (YouTube) for YouTube's release, `carousel` (Instagram) for Instagram's release — per the classifier's own proof run (§0b) these currently classify `unsupported_silent_degrade` for NDIS-Yarns. A release proof that only re-tests one cell would under-verify a platform carrying more than one.
4. **Live, read-only backtest proof for this platform**, in the same style as the containment packet's own §4.5 (EXPLAIN/simulate before executing): replay the exact eligibility predicate with the new capability-blocked exclusion added, against the *current* live queue + a synthetic non-Ready draft for each of this platform's known cells, and show `any_still_eligible = false`.
5. **Zero regression on this platform's governed-Ready steady state** (e.g. Facebook/Instagram/LinkedIn `image_quote`, LinkedIn `text`) — shown to classify `ready` and flow through the new gate unblocked, with a live sample proving continued eligibility post-change.
6. **Standard chain clean on the final enforcement diff** covering this platform's edit: `db-rls-auditor` + `branch-warden` + (if a safety-harness apply packet is involved) `apply-harness-auditor` shadow pass + external review pinned to the final hash + explicit PK gate-2 approval + `deploy-verifier` PASS post-deploy on any edge function touched.
7. **A durable rollback path for this platform's enforcement change**, proven executable (mirroring the containment apply packet's own guarded, fail-loud rollback convention).
8. **A go-forward signal for `blocked_by_capability` occurrences on this platform**, live-readable (the §4 state, the S2 indicator, or an interim query) before or at the same time this platform's pause lifts.
9. **YouTube-specific, additional (PK ruling 4 — "remains paused until its separate dequeue/claim paths are proven fail-closed"):** both YouTube entry paths (§10 confirmation 5) independently demonstrated fail-closed, **and** the `paused_until` preload's fail-open `try{}catch(_){}` bug (§1.4) is named as an explicit co-requirement for YouTube's release specifically — not merely disclosed. YouTube is last in the order precisely because it carries this extra, structurally-weaker-mechanism burden.

**PK-mandated release order (ruling 4, not a recommendation — binding):**

1. **Facebook** — releases once criteria 1–8 are met for Facebook alone.
2. **Instagram** — releases once criteria 1–8 are met for Instagram alone (independently of Facebook's timing).
3. **LinkedIn** — releases once criteria 1–8 are met for LinkedIn alone.
4. **YouTube — last.** Releases only once criteria 1–9 are met for YouTube specifically, including its extra dequeue/claim fail-closed proof and the fail-open preload disclosure/fix consideration.

Each platform's rollback is its own explicit PK act (mirroring the containment apply packet's own §7 guarded rollback, scoped per-platform rather than all four at once) — not a single combined rollback of all four rows.

---

## 6. Sequencing recommendation (per the stated boundary)

Per the boundary — *"do not build resolver and publisher changes simultaneously before the architecture, rollback and release proof are agreed"* — now that this Gate-1 is PK-approved:

1. **Gate 1 (this document) → PK-approved (§0a).**
2. Classifier durable record → already satisfied (§0b); no further action needed before enforcement build starts.
3. **Resolver build (§2)** as its own T3 lane: brief → `ef-builder` (isolated worktree) → `db-rls-auditor` + `branch-warden` → external review → PK gate 2 → deploy → `deploy-verifier`.
4. **Publisher build (§3)** as its own T3 lane, sequenced *after* the resolver lane lands (there is no value in blocking publishers on a capability signal the resolver isn't yet producing) — same chain. Excludes WordPress (ruling 2).
5. **Release proof (§5)**, executed **platform-by-platform in the PK-mandated order** (Facebook → Instagram → LinkedIn → YouTube last) — each platform's own rollback of the containment pause is its own explicit PK act, not a single combined release.

---

## 7. Open items carried forward (resolved items removed per the PK rulings above)

1. S2's own two open decisions (7th status; build-now-vs-wait-for-commit, `format-capability-indicator-implementation-packet-v1.md`) are unchanged by this document — surfaced here only because Objective 3's contract should stay reconciled with whatever S2 decides.
2. `youtube-publisher`'s fail-open `paused_until` preload bug (§1.4) — named as a co-requirement for YouTube's specific release (§5 item 9), not fixed by this design; whether it is fixed as part of the YouTube publisher build or as a separate hardening lane is for the resolver/publisher build lane to propose, not decided here.
3. Whether `m.post_draft.recommended_format` currently carries a `NOT NULL` constraint (§2.1) — a build-time verify item, not an architectural fork; if constrained, relaxing it is the one minimal DDL touch this slice needs.
4. Whether `final_format_authority` currently carries any CHECK-constrained enum (§2.1/§4) — likewise a build-time verify item.

---

## 8. Explicitly NOT this lane

- The dashboard UI build itself (S2's packet already covers it; this Gate-1 only sets the data contract it must honor).
- **WordPress publisher enforcement (PK ruling 2)** — excluded from v1 scope entirely; recorded as a future caller/dequeue census item (§1.4).
- Fixing `youtube-publisher`'s fail-open `paused_until` preload (named, not fixed — a candidate co-requirement for YouTube's release specifically, per §5 item 9).
- Flipping R3a to authoritative (R3c) — this design does not require or depend on that flip.
- Any change to `select_template`, `resolve_slot_assets`, or the classifier's own logic (and per PK ruling 1, the classifier itself is NOT reapplied by this lane — only read/verified).
- Lifting any part of the current 4-platform containment pause — that remains the safety net until §5's per-platform criteria are met and PK separately authorizes each platform's rollback, in the ruling-4 order.
- `lane/s9-cta-text-bounded-regen` (§1.6) — confirmed unrelated; not merged, not blocked on, as part of this lane.
- **Resolver or publisher implementation itself** (PK ruling 5, explicit stop condition) — this session stops at the approved architecture packet, its review evidence, and a register pointer.

---

## 9. Gate-1 completion checklist (PK ruling 5)

| # | Confirmation required | Result |
|---|---|---|
| 1 | Correct the classifier-record status | **Done — §0b.** Ground truth (committed to main `14453ff`, pushed, byte-verified live) recorded in place of the ruling's stated premise, with the discrepancy explicitly flagged rather than silently overwritten. |
| 2 | Run adversarial external review on the final packet | See §10 — run after this checklist, pinned to the final file hash. |
| 3 | Confirm all 11 resolver fallback paths converge through the proposed enforcement boundary | **Confirmed.** §1.3 enumerates all 11; §2.1 Layer 2 traces each to the single write site (`index.ts:1542-1562` main / `:1224-1246` evergreen) that all 11 terminate at — paths #1,#2,#3,#4,#6,#7,#8,#9,#10 converge directly there; #5 (platform-blind preference read) is a bias-nulling defect, not a format-fallback, unaffected by the gate either way; #11 (schedule-fill hardcoded default) is Layer 1, upstream and additional, per cc-0079's own recommended chokepoint. |
| 4 | Confirm the shared queue predicate covers the live Facebook, Instagram, and LinkedIn publishers | **Confirmed.** §1.4/§3.1: `publisher` (Facebook, `index.ts:284`) and `instagram-publisher` (`index.ts:452`) both call `m.publisher_lock_queue_v1`, which is a plain delegating wrapper (`SELECT * FROM m.publisher_lock_queue_v2(...)`) to `m.publisher_lock_queue_v2`; `linkedin-zapier-publisher` (the confirmed-active LinkedIn path, `index.ts:115`) calls `v2` directly. One predicate edit inside `v2`'s eligibility CTE is inherited by all three. |
| 5 | Confirm both YouTube entry paths are included | **Confirmed.** §1.4/§3.1: (a) the SELECT predicate at `youtube-publisher/index.ts:299-308`, and (b) the independent atomic pre-claim `UPDATE ... yt_publish_claim_at` at `index.ts:401-426` — both named as required edits, closing the TOCTOU window between them. |
| 6 | Confirm auto-approver cannot revive or approve a capability-blocked draft | **Confirmed as a mandatory build item, not automatic from the blocked-state representation alone.** §1.4/§3.1: `m.auto_approver_fetch_drafts`'s only eligibility filter is `approval_status='needs_review'` (`20260503085435_f_aap_001_auto_approver_fetcher_v4_compat.sql:133`) — it is blind to `final_format_authority` and, left unguarded, **can** still flip a blocked draft's `approval_status` to `'approved'`. The `recommended_format=NULL` design (§2.1) independently prevents that from ever reaching a renderer or a queue-populated publisher, but PK's literal requirement — auto-approver cannot *approve* a blocked draft — additionally requires the guard named in §3.1: `m.auto_approver_fetch_drafts`'s `WHERE` clause (or the EF's `evaluateGates`) must exclude rows carrying `final_format_authority='blocked_by_capability'`. This is recorded here as a **mandatory, not optional**, part of the resolver/publisher build — not merely hardening. |
| 7 | Record the five PK rulings | **Done — §0a.** |

---

## 10. Review record

| Check | Result |
|---|---|
| Grounding method | Read-only: `db-rls-auditor` (live classifier/schema/R3a state, run twice — once pre-ruling, once post-ruling to re-verify §0b), 2× `Explore` (ai-worker fallback map; publisher dequeue map), direct `Read`/`Grep`/`Bash` (branch content, cc-0079/S5/S2 prior artifacts, git fetch/log verification) |
| DB/DDL/config touched | None — zero writes, zero migrations, zero deploys, zero re-application of the classifier this session |
| External review (`ask_chatgpt_review`) | **Run, adversarial, pinned.** First attempt (`review_id 9a277aa4-…`) was **void** — a placeholder was accidentally left in the `proposal` field instead of the packet text, so nothing was actually reviewed; discarded, not used as evidence. **Second, corrected attempt is the one of record**: `review_id f5b823e3-0db5-4abe-9978-7e342776f2e8`, pinned to `reviewed_input_hash = f0fd60d9a8ec5eac4bbfe5b23b9b1fdc935ce8419a667589e1ff26176a3a3753` (this file's sha256 at review time, post the §1.1 heading fix). **Verdict: `agree`, risk `medium`, confidence `high`, zero pushback points, zero unverified claims flagged.** Per CCF-02 triage: a clean `agree` with no `concrete_defect`/`missing_evidence`/`policy_decision` items — no routing action required. |
| PK gate | Architecture direction already approved (§0a); this revision + its clean external review is the final artifact for the commit (`e28391d`, pushed) |

---

## 11. Erratum 1 — §1.3 row 11 citation corrected (2026-07-29, additive, does not alter the reviewed text above)

**This section is an addition made after the packet above was committed (`e28391d`) and externally reviewed (`review_id f5b823e3-0db5-4abe-9978-7e342776f2e8`, pinned to `reviewed_input_hash f0fd60d9a8ec5eac4bbfe5b23b9b1fdc935ce8419a667589e1ff26176a3a3753`). Nothing above this line is altered, reworded, or deleted — that text and its review hash remain the historical record of what was reviewed and approved. This erratum was triggered by the resolver build brief's own grounding pass (`docs/briefs/s9-resolver-enforcement-build-brief-v1.md`), which could not corroborate row 11's citation and named it a live-truth gap; PK ordered a full retrace before Gate-1 completion (rather than accepting or silently correcting it).**

### 11.1 The incorrect statement

§1.3 row 11 (original text, unchanged above) reads: *"`m.fill_pending_slots` (schedule-fill, upstream of ai-worker...) — Legacy path falls to `c.client_publish_profile.preferred_format_<platform>`, **YouTube hardcoded to `'video_short_avatar'` in the function body**... Sets `job.input_payload.format` before ai-worker ever runs — the origin of the `video_short_avatar` request in the incident."*

**This attributes the hardcode to the wrong function.** `m.fill_pending_slots` was re-verified live twice this session (once during the original Gate-1 grounding, once again during this retrace) and contains **zero platform-conditional logic of any kind** — its entire format-selection logic is `COALESCE(v_slot.format_preference[1], 'image_quote')`, reading whatever `format_preference` array a slot already carries. There is no `IF/ELSIF platform = 'youtube'` branch, no reference to `c.client_publish_profile.preferred_format_<platform>`, anywhere in this function.

### 11.2 The verified current truth

The hardcode is real — it exists, live, right now — but in a **different, upstream function**: `m.materialise_slots(p_days_forward integer)`, the function that creates `m.slot` rows from `c.client_publish_schedule` (days ahead of `m.fill_pending_slots`, which later fills an already-created slot into a draft). Confirmed via fresh `pg_get_functiondef('m.materialise_slots(integer)'::regprocedure)`, byte-identical to the newest tracked migration (`supabase/migrations/20260727100100_p1c_materialise_slots_honour_format_override.sql`):

```sql
IF v_rule.platform = 'facebook' THEN
  SELECT preferred_format_facebook INTO v_preferred_fmt FROM c.client_publish_profile ...
ELSIF v_rule.platform = 'instagram' THEN
  SELECT preferred_format_instagram INTO v_preferred_fmt FROM c.client_publish_profile ...
ELSIF v_rule.platform = 'linkedin' THEN
  SELECT preferred_format_linkedin INTO v_preferred_fmt FROM c.client_publish_profile ...
ELSIF v_rule.platform = 'youtube' THEN
  v_preferred_fmt := 'video_short_avatar';
END IF;
```

This exact line is present identically in three tracked migrations (oldest `20260628000000_format_mix_enforcement_phase1.sql:217`, then `20260725120000_durable_platform_support_guard_grid_and_materialiser.sql:487` — **never applied to production**, confirmed absent from the migration ledger, its paired rollback file is unused/inert — then `20260727100100_p1c_materialise_slots_honour_format_override.sql:75`, the version actually live today, ledger entry `20260727032613` — a version-number-vs-filename-timestamp mismatch consistent with the known `apply_migration mints own version` trap, not a naming-collision violation, since content is identical).

**Additional live facts, not in the original packet:**
- This `v_preferred_fmt` assignment only fires on the function's **legacy (non-format-mix-enrolled) path** — confirmed live: `m.format_mix_enrolled('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid)` (NDIS-Yarns) → `false`, so NDIS-Yarns's YouTube slots do take this legacy branch, not the weekly-demand-grid allocator.
- **The hardcode is currently latent, not operative, for NDIS-Yarns specifically**: every one of NDIS-Yarns's enabled YouTube rows in `c.client_publish_schedule` carries an explicit, non-NULL `format_override` (confirmed live) — and per the same function's own final precedence step (`IF v_rule.format_override IS NOT NULL THEN v_format_pref := ARRAY[v_rule.format_override]; END IF;`, added by the newest migration), an explicit override always supersedes the hardcode. **Some of those override values are themselves explicitly set to `'video_short_avatar'`** — i.e., today's exposure comes from a deliberate schedule configuration, not from the hardcode silently firing. The hardcode remains live, unexercised-for-NDIS code that would become operative the moment any NDIS YouTube row's `format_override` were ever cleared back to NULL.
- `m.fill_pending_slots` reads whichever `format_preference[1]` value `m.materialise_slots` (or a manual override) already set, days later, at fill time — it does not itself decide anything platform-specific; it is a generic reader.

### 11.3 Does this change the approved implementation boundary? — **No.**

The resolver architecture's Layer 1 chokepoint (§2.1) was already designed to be **origin-agnostic**: it checks whatever candidate format sits in a slot at fill time, regardless of which upstream mechanism (the `materialise_slots` hardcode, an enrolled client's weekly-allocator assignment, or a human-set `format_override`) put it there. Since `m.fill_pending_slots` is confirmed to be the single point every one of those origins funnels through before a draft is created, **Layer 1's insertion point stays exactly as designed** — no redesign, no additional insertion point, no scope change to the resolver build.

One nuance worth naming, not adopted as a requirement: since the hardcode is set as early as `m.materialise_slots` (up to 7 days before fill, per `p_days_forward`), an *additional* capability check at that earlier point would surface a block to operators sooner than the existing Layer 1 design does. This is a genuine possible enhancement, **not required by this design and not added to the resolver build's scope** — Layer 1 at `m.fill_pending_slots` remains sufficient to guarantee no non-Ready draft is ever created, which is the boundary's actual requirement.

### 11.4 Carries into the resolver build

- The resolver build brief's Layer 1 design, scope, and insertion point are **unchanged** by this erratum.
- The `20260725120000_durable_platform_support_guard_grid_and_materialiser` migration and its rollback are confirmed **inert** (never applied) — any future lane must not assume a "platform-support guard" already exists inside `materialise_slots`; it does not.
- NDIS-Yarns currently has live, human-configured YouTube schedule rows explicitly requesting `video_short_avatar` (a confirmed `unsupported_silent_degrade` cell) — this is existing, real demand the resolver build will correctly convert to `blocked_by_capability`, not a hypothetical edge case.
