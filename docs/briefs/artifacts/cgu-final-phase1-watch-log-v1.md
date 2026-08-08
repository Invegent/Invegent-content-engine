# CGU Final — Phase-1 Watch Log (2026-08-04 → 2026-08-11, Sydney)

Read-only monitoring record for the v11 seven-day watch, per the PK control-tower ruling
(`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`, v6.140). All reads via the
allowlisted R0 path (`scripts/db-read.py`, `ice_ro` views) — zero writes. Feeds the
watch-expiry verdict; resolves nothing by itself.

## Day 1 — 2026-08-05 ~15:20 Sydney (baseline)

- **Cron health:** 12/12 jobs `green`, zero consecutive misses (incl. `fill-pending-slots-every-10m`,
  `materialise-slots-nightly`, `asset-gap-analysis-daily`).
- **Slots scheduled after the v11 commit time (2026-08-04T10:20Z), by platform (status: filled/future/skipped):**
  facebook 6/21/7 · instagram 4/25/8 · linkedin 3/31/14 · youtube 3/8/5.
  Skips are terminal by design (S9); counts recorded as baseline, to be trended not judged.
- **Pipeline health (latest snapshot 2026-08-05T05:00Z):** queue_total 830, queued 26,
  **failed 15, has_stuck_items=true** — recorded as baseline for trending; not classified an
  incident by this read. If failed/stuck grows day-over-day, escalate to PK before watch end.
- **Watched supervised-only cells (v11 exception list):** no volume observed outside baseline —
  PP YT kinetic / NDIS YT stat / CFW LI image_quote remain supervised-only; NDIS carousel frozen.

## Control-tower notes — corrections owed at the NEXT register cut (not a daily entry)

1. **v6.142 protocol-note correction:** S-A (M11c reconciliation) committed `e3129d1` locally only
   and never pushed — content reached origin via the control tower's subsequent pushes. The entry's
   "self-committed/pushed" overstates by one word; deviation was commit-instead-of-return only.
2. **Commit `a814e4f` attribution:** the M13 packet §13 addendum in that commit was authored by the
   M13 scoping session (S-B, staged in the shared checkout, swept in by the control tower's Seed-A
   commit) — not by the Gate-1 batch lane the commit message names.

## Session-reduction status (v6.140 order) — as of 2026-08-05 ~16:20 Sydney

All three watch-week decision-prep lanes TERMINAL and archived (Gate-1 batch · M11c reconciliation ·
M13 scoping). Active: control tower + CFW/INV asset sourcing only.

## M18 escalation-trigger sweep — 2026-08-05 ~16:45 Sydney (read-only; digest-only discipline, no value read into any transcript)

- Repo: **zero literal key assignments** (pattern scan, 35 env-var-name references all benign).
- The 4 local out-of-band scripts (M18 packet §B rows 4–7): all read `Deno.env.get('CREATOMATE_API_KEY')`,
  **zero embedded literals**.
- Operator shell env: `CREATOMATE_API_KEY` **SET**, sha256 prefix `df13b951` = the key P1_FINDINGS
  (2026-07-10) digest-confirmed as **invalid** — benign unless the v5.89 rotation reused it (unlikely, unverified).
- **⚠ FINDING — probable trigger match:** `C:/Users/parve/Downloads/creatomate api key.txt` exists,
  96 chars trimmed, file dated **2026-07-19** (the v5.89 rotation window), sha256 prefix `bcde13d1` —
  a **third digest**, matching neither the P1-invalid key nor the pre-rotation production key
  (`8ab5a356`). Most probable classification: **plaintext copy of the CURRENT production key,
  unmanaged, on disk**. Liveness NOT confirmed — confirming would require using the key (R2 secret-USE,
  needs its own Gate-1 rider; not done). Surfaced to PK same session as a probable match to the
  v6.140 M18 early-execution trigger ("current accessible unmanaged credential").
- Out-of-M18-scope pattern, noted for PK: Downloads also holds plaintext `ANTHROPIC_API_KEY.txt`,
  `Elevellabsapikey.txt`, `ICE_HEYGEN_API_KEY.txt`, `ICE_PEXELS_API_KEY.txt`, `ICE_Pixabay_API_KEY.txt`,
  and 3 Google `client_secret_*.json` files — same unmanaged-plaintext habit across 6+ other credentials.

## M18 — trigger CONFIRMED + rotation pre-flight baseline (2026-08-05 evening, PK-authorized rotation in progress)

- **Exposure upgraded PROBABLE → CONFIRMED:** `supabase secrets list` shows the live
  `CREATOMATE_API_KEY` value-digest = `bcde13d1…` — exact match to the Downloads file's digest.
  The plaintext `Downloads/creatomate api key.txt` IS the current production key. Digest-only
  discipline maintained (no value in any transcript/doc/log).
- **PK ruling (v6.145): trigger MET, rotate now via packet §F.** Sequence in flight.
- **Pre-flight baseline (read-only, per §F):** secret present by name ✓ · last successful
  creatomate renders — image-worker/image_quote 2026-08-05T04:30Z · video-worker/video_short_stat
  2026-08-04T11:01Z (kinetic 08-03T19:00Z) · `tmr-drift-probe`: absent from `ice_ro.cron_health`
  (0 rows); its daily logical `status='error'` is the KNOWN pre-existing multi-cause condition
  (v6.129/M11c memo) — §H's rotation proof must use provider-access success (templates-list
  reachable), NOT the logical status, which will stay `error` for unrelated reasons.

## M18 — ROTATION EXECUTED, 3/4 verifications PASS (2026-08-05 ~21:10 Sydney)

- Sequence (single-key model — Creatomate has no dual-key overlap; §F adapted accordingly):
  PK regenerated in-dashboard → pre-tested the value locally (200) → stored ONLY in Bitwarden
  (new managed store, replacing the Downloads/spreadsheet habit) → `secrets set --env-file`.
  Live secret digest lineage this rotation: `bcde13d1` (exposed old) → `04df9270` (bad first
  copy, never valid at provider, caused a ~90-min contained STOP; zero production impact —
  cutover ran inside a verified zero-fill window) → **`39bdf541` (final, verified)**.
- Verifications: video-worker smoke `ok:true` 11:07:16Z · image-worker smoke `ok:true` 11:07:37Z
  (both timestamped post-rotation per §H) · advisors recheck **unchanged** 3 ERROR + 185 WARN,
  zero Creatomate findings · **drift-probe deferred to tonight's 17:35Z cron** — pass signal =
  no `401/invalid_api_key` cause (logical `error` persists for known unrelated causes). Failed
  render row 11:03:30Z = the pre-fix 401 attempt, expected artifact.
- Old keys: dead by regeneration (single-key model — each regenerate revokes). PK-side closing
  facts still owed (§H): delete `Downloads/creatomate api key.txt` · delete the spreadsheet key
  row (revision-history caveat recorded: unpurgeable, mitigated by the key being dead) · clear
  any shell `CREATOMATE_API_KEY` export · optional old-key 401 test before deletion.

## Day 2 — 2026-08-06 ~10:15 Sydney

- **M18 verification 4/4 — ROTATION FULLY VERIFIED.** `tmr-drift-probe` 2026-08-05T17:35:07Z run
  (6.5h post-rotation, v2.1.0) completed its full provider templates-list fetch on the new key —
  complete provider_check produced (impossible without provider access) — and its logical `error`
  carries only the three KNOWN pre-existing declarative-coverage causes; zero `401`/
  `invalid_api_key`. Combined with day-1's two smoke passes + unchanged advisors: **all three
  consumers proven on the rotated key.** Remaining M18-rotation items are PK-side attestations
  (Downloads file delete · spreadsheet row delete · shell env clear).
- **Overnight production: healthy on the new key.** Edge-function log sweep: all worker/publisher
  invocations 200. One `pipeline-ai-summary` 500 observed (~23:35Z) — unrelated to Creatomate
  (no Creatomate dependency), logged as a watch observation, not escalated; re-check day 3.
- **Cron:** 0 non-green jobs. **Pipeline trend:** queue_failed 15 (flat vs day-1 15),
  has_stuck_items=true (flat), queue_total 830→834 (normal accretion). No STOP condition.
- **Harvest batch — PK VISUAL GATE COMPLETE (2026-08-06):** CFW 6 accepted / 7 rejected
  (cfw-05 self-reject RATIFIED by PK) · Invegent 8 accepted / 3 rejected. Recorded as a
  `pk_visual_gate` block in the package manifest (worktree `admiring-shtern-6fdb19`), byte/sha256
  re-verified untouched. Visual sign-off ONLY — intake/promotion stays post-watch (own T2/T3
  chain). E-1 precondition-1 note: 6 CFW backgrounds PK-visually-accepted ≥ the 3 required, but
  the precondition is met only when they are `approved=true` IN DB — i.e., after the post-watch
  intake+promotion applies. Carry-forwards for that intake lane: cfw-09 wall-mark zoom-check ·
  cfw-13 authenticity confirm · inv-07/inv-08 never geo-captioned.

## M18 — ROTATION HALF FORMALLY CLOSED (2026-08-06, PK attestations + final cleanup)

- **PK attests (direct, control-tower session 2026-08-06):** (1) `Downloads/creatomate api key.txt`
  DELETED (independently confirmed absent by control-tower read; Recycle Bin emptying advised) ·
  (2) spreadsheet key row(s) DELETED (revision-history caveat stands, accepted — keys dead).
- **(3) Shell export CLEARED by control tower on PK instruction:** `CREATOMATE_API_KEY` existed as
  a persistent User-level env var (`HKCU:\Environment`, held the long-dead `df13b951` key) —
  registry entry removed, re-verified null. Open terminals retain inherited copies until closed.
- **Managed storage adopted:** Bitwarden vault live with ICE credential entries (Creatomate,
  ElevenLabs, HeyGen, Pexels, Pixabay, Supabase service backend; remainder migrating at PK's pace).
- **M18 rotation half: CLOSED** — trigger confirmed → rotated → 4/4 verified → old copies removed →
  attested. Remaining M18 scope before Final PASS: complete the credential migration (PK, ongoing)
  + the packet's target-architecture confirmation at the M18 closeout gate.

## Day 3 — 2026-08-06 ~10:30 Sydney (PK-requested check)

- **Steady state:** cron 12/12 green · pipeline flat vs baseline (834/30/15/stuck=true, unchanged)
  · advisors posture unchanged · supervised-only exception cells all quiet · no readiness
  regression · NO STOP CONDITION.
- **⚠ FINDING W-1 (watch finding, not a STOP): NDIS added capacity is partially outrunning its
  content supply.** Since the v11 apply, NDIS fills = 7 (FB 4 iq · IG 1 iq · LI 2 iq, **zero text
  fills**) vs 17 non-capability skips. Skip reasons (m.slot_fill_attempt, R1 read):
  `bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen` (FB 5 · LI 4, pool avg 42 —
  populated but diversity-thin) and `pool_thin;no_eligible_evergreen` (IG 3 · LI 2 · FB 1,
  eligible pool 0 at attempt). Every reason also shows an EMPTY eligible-evergreen fallback.
  Layer-2/YT skips (`capability_blocked:unsupported_silent_degrade:*`) are correct fail-closed
  behavior, as designed.
- **Reading:** the apply itself is behaving exactly as designed — slots fail closed, no bad
  content, schedule state undisturbed. But added NDIS capacity only yields output when the signal
  pool feeds it; current NDIS pool diversity/evergreen depth cannot fill the increased slot count.
  **Implication carried to the watch verdict:** Phase-2's NDIS rows (the largest share of the 17)
  should be weighed against pool supply — same principle PK set for CFW/M16 (capacity ≠ output on
  a thin pool; reliability vs pool-capacity are distinct constraints, now observed for a second
  client). No remediation performed or authorized during the watch; NDIS content ingestion
  (content_fetch cron) continues normally and may organically improve the ratio — day 4–7 entries
  will trend fills-vs-skips to give the verdict real numbers.
- CFW-LI skips (5) = the known M16 starved cell, expected. Invegent: zero notable skips.
  `pipeline-ai-summary` 500: no recurrence check this pass (log window); re-check day 4.

## W-1 ROOT-CAUSED (2026-08-06 evening — diagnosis lane, read-only; full doc `docs/briefs/results/w1-ndis-content-supply-diagnosis-v1.md`, commit `836a54d`)

- **The two NDIS skip classes are format-segregated, distinct causes:**
  · TEXT (26 skips/7d) = `bundle_diversity_insufficient` on SOURCE CONCENTRATION only (pool size
  clears the gate; top-2 picks share a `source_domain`). Supply-side fix class; M16 does not apply.
  · IMAGE_QUOTE (26/7d) = `pool_thin`, **the EXACT M16 defect, now LIVE-CONFIRMED for NDIS**
  (all 64 body-healthy items at reuse≥2 → effective fitness caps ~57.2 < 60; `check_pool_health()`
  still 'green', masking the relax path that would clear at ≥50). M16's fleet-relevance caveat
  upgrades plausible → CERTAIN: **the already-built M16 fix, once applied post-watch, is expected
  to restore NDIS image_quote fills as well as CFW's.**
  · `no_eligible_evergreen` = trivial + fleet-wide: `t.evergreen_library` has ZERO rows for any
  client/format. New small lane candidate: populate the evergreen library (was never seeded).
- **Slot `c1f38536…` (PP YouTube, 2026-08-13T07:00Z):** filled, but its bound draft is
  `video_status='failed'` — publisher gate prevents bad publish; the real risk is a SILENT
  SCHEDULE MISS (no slot re-open/backfill path exists — reconfirmed). **PK decision needed before
  08-13** (fits the 08-11 sitting): re-render / T0 manual replacement (CFW-LI precedent) / accept
  miss. One data discrepancy flagged (hand-authored-looking dead_reason; attempt-count mismatch
  vs the Lane-1 citation) — unresolved, named.
- Verdict implication: the Phase-2 supply-side story is now CAUSAL, not statistical — approve
  base+E-1 with (a) M16 apply early in the post-watch wave (fixes CFW + NDIS image_quote fills),
  (b) an NDIS text source-diversification decision, (c) an evergreen-seeding lane election.

## Day 4 — 2026-08-06 (post-10:30 remainder) — ⚠ BACKFILLED 2026-08-08, NOT a contemporaneous observation

> **Read this header first.** This block was written on **2026-08-08**, two days after the window it
> describes. It is a **retrospective reconstruction from retained telemetry**, not a watch reading
> taken at the time. No one observed this window live and no STOP-condition judgement was exercised
> during it. It is labelled so that it can never be mistaken for a performed check — the same failure
> class as the 2026-07-29 intake `review_notes` that asserted verifications which were never done
> (day-5 entry, systemic finding). Backfilled at PK's instruction after the gap was noticed at the
> day-6 cut.

**Why the gap existed.** Partly a numbering artifact: Day 2 and Day 3 are BOTH dated 2026-08-06
(~10:15 and ~10:30, the second a PK-requested re-check), so the day counter ran ahead of the calendar.
But the artifact is not the whole story — **the remainder of 2026-08-06 after ~10:30 genuinely received
no watch-health entry.** Its analytical content is covered by the `W-1 ROOT-CAUSED` block above
(2026-08-06 evening); what was missing is the health observation, reconstructed below.

**Pipeline — REAL retained data** (`ice_ro.pipeline_health`, **48 snapshots** across 2026-08-06,
read 2026-08-08). Dead flat for 22 hours:
`queue_total 834 / queued 30 / failed 15 / has_stuck_items=true / has_failed_images=false`
held constant from 00:00Z to 22:00Z, easing to `832 / 28 / 15` at 22:30Z through end of day.
Against the day-1 baseline (830/26/15/true) this is normal accretion and drain. **`queue_failed` never
moved off 15 all day**, and `has_failed_images` was false at every single snapshot.

**Cron — REAL retained data, and BROADER than any live entry in this log** (`cron.job_run_details`,
read 2026-08-08): **3,664 job runs across 60 distinct jobs on 2026-08-06, and every one recorded
`status='succeeded'`. Zero failures, zero non-succeeded rows.**
Note this materially exceeds the daily "cron 12/12 green" figure used elsewhere in this log, which
comes from `ice_ro.cron_health` — a curated view covering only **12 of the 71 active jobs** (day-6
carry). For this one window the scheduler evidence is therefore *stronger* than the contemporaneous
entries, not weaker.

**⇒ NO STOP CONDITION OCCURRED IN THIS WINDOW.** Both watched signals — pipeline trend and scheduler
health — are verifiable from retained telemetry and both are clean. The verdict's seven-day trend is
not compromised by the missing entry.

**What CANNOT be reconstructed, and is therefore NOT claimed here:** the supervised-only exception-cell
observation (PP YT kinetic / NDIS YT stat / CFW LI image_quote) · the advisors posture at that time ·
the `pipeline-ai-summary` 500 recurrence check that day-3 deferred to "day 4" · and any judgement that
would have depended on looking at the system in the moment. Those are gaps in the record and remain so.

**Activity in the window (from committed evidence, for context only — not watch observation):** the
v6.147 build-acceleration ruling and the entire authorized build wave landed here — kinetic_voice
closure packet (v6.148), M11b Seed A/B (v6.149), M12 scoping (v6.150), build wave complete (v6.151),
M13 Lane-1 landed on main (v6.152), L1 evidence secured (v6.153), W-1 root-caused (v6.156), M6 design
+ first Blueprint (v6.157), M9-P1/M8.1 disproven (v6.158), M4 manifest (v6.159), item-J pre-ruling
(v6.160), M13 Lane 4 built (v6.161). **Zero production mutation across the wave** — consistent with
the v6.147 ruling that held all production writes to the watch gate.

## Day 5 — 2026-08-07 (PK-authorized production write DISCLOSED + watch health)

- **PRODUCTION WRITE (PK-authorized, explicit-authorization carve-out; NOT a watch breach):**
  2-row fence on `c.client_brand_asset` — `f84ac010` (Fremantle-signage defect, the agenda-M P1)
  + `e6e24358` (NEW: Owen Hodge law-firm signage, found by the PK-directed full-pool audit).
  Full gate trail (external review partial→fixed→`5d7651db` agree/clean → applied → post-verified;
  rollback held outside DB). **PP B-roll eligible pool 6→4** — below the recorded POOL=6
  threshold, no auto-backfill; the natural refill (the 2026-08-07 B-roll corpus) is intake-gated.
  Schedule surface untouched; not a STOP; disclosed here because pool composition is watch-visible
  context for video renders.
- **Systemic finding (register-bound):** the 2026-07-29 intake batch's `review_notes` assert
  verifications that were NOT performed (identical false "no signage across 9 frames" phrasing on
  both fenced rows) — all signage/person claims from that batch are UNVERIFIED pending a
  re-verification lane.
- Watch health: cron/pipeline steady (no STOP); detailed trend reads continue; verdict drafting
  begins on day-6 evidence.

## Day 6 — 2026-08-08 (PK-authorized EF deploy + the W-1 time-bound slot decision CLOSED)

- **Watch health:** cron **12/12 green, 0 consecutive misses**. Pipeline 04:00Z snapshot
  `queue_total 831 / queued 26 / failed 15 / has_stuck_items=true` — flat against the day-1 baseline
  (830/26/15/true). **NO STOP CONDITION.**

- **✅ SLOT `c1f38536…` (PP YouTube 2026-08-13T07:00Z) RECOVERED — the W-1 time-bound PK decision is
  CLOSED, no longer a sitting item.** Draft `452f58b9…` is `video_status='generated'` with a real
  `video_url` (`…/property-pulse/452f58b9…_stat_governed.mp4`); render `succeeded`, creatomate
  `e75b4f2b…`, **27,483 ms**. Slot binding, approval and content all unchanged (body 720 chars,
  title unchanged). PK elected re-render; no content was redesigned or replaced.

- **TWO STACKED DEFECTS, both cleared. The second had been masking the first:**
  1. **ElevenLabs API key INVALID** — introduced by the 08-05/06 credential migration to Bitwarden
     (VO last verified working 2026-08-05T11:06:40Z via the smoke artifact). Failed *earlier* in the
     chain than the original fault, so it presented as the same opaque error. **PK-side fix, 3
     attempts** (key **ID** pasted → wrong field → correct `sk_` key; secret digest lineage
     `4bcfd78a` → `f5db81db` → `46a7a289`). Now proven: VO generated 158,450 B of real audio.
  2. **Creatomate MARGINAL render timeout** — the ORIGINAL 07-27 blocker. Not a code defect and not
     draft-specific (**reproduced in the smoke using SAMPLE fields**). Measured latency for the same
     governed `video_short_stat` template on the same day: **27.5 s (success) vs 129–132 s
     (timeouts)** against a fixed **120 s** poll ceiling — a ~5× spread. It needed no fix; it needed
     the retry model to be *allowed to run*. The draft had previously received exactly ONE attempt
     because a human stamped `manual_terminal:known_timeout_08-13_retry_proof_done`.

- **🔐 PRODUCTION MUTATIONS THIS DAY (all PK-authorized, disclosed per the fence precedent):**
  · **EF DEPLOY — `video-worker` v3.17.1 → v3.18.0** via the sanctioned `scripts/safe-deploy.sh
  --allow-warn` after a drift refresh moved it `A-LE` → `B-FD`. Deployed marker verified in the live
  bundle (`video-worker-v3.18.0`, bundles-from-CWD guard satisfied); **`verify_jwt` confirmed still
  false** (unauthenticated POST returns the function's own key-guard 401, not a gateway rejection).
  · **2 single-row draft re-queues** on `452f58b9…` (`video_status` failed→pending + terminal/retry
  markers stripped), each CAS-guarded on 5 columns and each preserving the prior row as rollback
  (md5 `66be2c9a…`, then `d2f0741f…`).
  · **Drift-log refresh** (`drift-check?write=true`), 14 rows written across two runs.
  · **`ELEVENLABS_API_KEY` secret rotated** (PK-side, digest-only discipline maintained).
  · Merge + push of v3.18.0 to `origin/main` (`b1a26e9..42be22d`) — **disclosed:** that push also
  carried `cc8270c`, an unrelated cc-0091 docs commit from a parallel session that landed on shared
  main between the pre-merge verification and the merge. Surfaced to PK BEFORE pushing; PK authorized.
  Same push-sweep mechanism as v6.156/v6.172 — the standing isolated-branch rule remains the fix.

- **v3.18.0 is why any of this was diagnosable.** A VO failure previously collapsed THREE causes into
  one bare `null`, reaching no durable record. Within four minutes of deploy it named three *different*
  causes in sequence — `tts_http_status_401 invalid_api_key`, then `tts_http_status_400 "API key ID
  used as API key"`, then the render timeout. Under v3.17.1 all three were the identical opaque string.
  External review `ec74aa07` (agree/med/high) after `083e73ea` (partial) was addressed by narrowing
  the sanitizer. Retry semantics deliberately UNCHANGED.

- **Carried, none urgent, none blocking the verdict:** the marginal 120 s render ceiling (intermittent
  by construction — will recur) · PK direction that genuine provider **5xx should become retryable**
  in a later bounded change · the sanitizer's 200-char detail clip · **`ice_ro.cron_health` covers 12
  of 71 active cron jobs**, so daily "12/12 green" is a PARTIAL signal, not fleet-wide scheduler proof
  (`video-worker-every-30min`, the job this recovery depended on, is not in the view).

*(Subsequent daily entries append below; one line-block per day; any STOP-condition match →
surface to PK immediately, do not wait for watch expiry.)*
