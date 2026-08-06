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

*(Subsequent daily entries append below; one line-block per day; any STOP-condition match →
surface to PK immediately, do not wait for watch expiry.)*
