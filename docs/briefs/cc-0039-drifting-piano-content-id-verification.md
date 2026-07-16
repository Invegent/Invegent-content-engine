# Brief cc-0039 — Drifting Piano YouTube Content-ID verification (B3 unblock)

**Created:** 2026-07-16 Sydney
**Author:** chat
**Executor:** PK (verification upload) + Claude Code (evidence-recording, held migration prep)
**Status:** issued (Gate 1 approved 2026-07-16)
**Result file:** `docs/briefs/results/cc-0039-drifting-piano-content-id-verification.md` (created on completion)

---

## Task

Resolve the B3 blocker on the governed PP video path by determining — empirically — whether the one otherwise-eligible music track, **"Drifting Piano"** (`calm_piano_drifting_006`, CC0, HoliznaCC0), triggers a **YouTube Content-ID claim**. Today `m.music_license.content_id_safe = false` is a deliberate *fail-closed UNKNOWN* (not "known unsafe"), so `select_music('format','video_short_stat',…)` returns **0 rows** and every governed PP video renders **voice-only, silent bed**. The only method that produces authoritative evidence is a **private/unlisted YouTube test upload** of a video carrying the track's audio, then reading the Content-ID / copyright status in YouTube Studio after processing. If the result is **CLEAN**, prepare (but hold) the governed flip `content_id_safe` false→true so B3 can be restored at a separate PK gate. If a **CLAIM** appears, keep the flag false, record the verdict, and name the alternative path.

## Source context

- **This session's read-only B3 findings (established live facts, 2026-07-16):**
  - `public.select_music('format','video_short_stat',12,null)` → **0 rows**.
  - `select_music` v2 (ledger `20260710094353` / `20260710115043`) enforces `AND l.content_id_safe IS TRUE`.
  - Drifting Piano passes **every** other predicate (is_active/approved/production_use_allowed=true, `approval_status='approved_scoped'`, dur 110.5s≥12, commercial+social use, has `format/video_short_stat` scoped_approval) — the **sole** failing gate is `content_id_safe=false`. No other track in the 9-track library is Content-ID-safe (all 8 others are still fenced at intake).
  - Deployed **video-worker v3.7.0** (platform version 60, verified from live edge-function source): empty `select_music` → `{url:'', trackId:null}` → silent bed, **no throw**; only an RPC *error* throws. So the render outcome is VO-only, not fail-closed.
- `m.music_track` / `m.music_license` / `m.music_review_event` rows for `track_id=8f520a93-a2ed-4ba3-80fa-1ca4884dff88`:
  - Licence: **CC0 1.0 Universal**, source FMA (`https://freemusicarchive.org/music/holiznacc0/background-music/drifting-piano/`), snapshot hash `c7301a66…`. commercial/social/modification/paid_ads all TRUE, attribution FALSE, **content_id_safe FALSE**.
  - Approval event (PK, 2026-07-09): scope narrowed to `format=video_short_stat`; reason states verbatim **"content_id_safe=false — YouTube excluded."**
- `_harness/music_harvester_v0/candidates/calm_piano_drifting_006.license.txt` — licence snapshot; line 24 records the fail-closed rationale: *"CC0 waives the uploader's copyright but does NOT guarantee the absence of a third-party YouTube Content-ID claim. NOT YouTube-eligible in v0."*
- Existing test asset (optional reuse): the PK-approved combo render from 2026-07-10 (VO over Drifting Piano bed at 70%) — see `docs/briefs/results/cc-0032-step5-governed-combo-branch-build.md`. Also raw track at `_harness/music_harvester_v0/candidates/calm_piano_drifting_006.mp3` (sha `5d1d80af…`).
- Governance: `CLAUDE.md` (T3 chain · external review on the FINAL diff · PK deploy/migrate HARD STOP · `apply_migration` deny-lift discipline · public-function ACL post-assert). `docs/governance/pp-tmr-definition-of-done-v1.md` (B3 criterion).
- Memory: `video-tmr-first-proof-gate1` (B3 regression history), `music-library-v0-starter-intake` (the 9-track intake; on-state token is `approved_scoped`, not `approved`).

## Scope

**In scope:**
1. Produce/identify ONE test video whose audio contains the Drifting Piano track (prominent enough for Content-ID to fingerprint).
2. PK (or PK-authorized) uploads it **UNLISTED or PRIVATE** to a designated YouTube channel — **test/personal channel preferred** over the production Property Pulse channel.
3. Wait for YouTube Content-ID processing; read the copyright/claim status in YouTube Studio.
4. Record the verdict (CLEAN / CLAIMED) with evidence (Studio screenshot or state description) in the result doc.
5. **If CLEAN:** author a HELD migration flipping `m.music_license.content_id_safe` false→true for `track_id=8f520a93…` (single-row, CAS-guarded on current `false`), with a validated rollback, ready for a **separate T3 PK gate**; and re-verify that `select_music('format','video_short_stat',12,null)` would then return exactly 1 row.
6. Delete the test video after the verdict is captured (unless PK wants it retained).

**Out of scope:**
- Applying the `content_id_safe` flip (that is a separate T3 PK gate — this lane only *prepares* it).
- Any change to `select_music` SQL or the `require_content_id_safe` rule.
- Any change to `video-worker`, the `c.client_creative_governance.enabled` flag, or any render/publish behaviour.
- Approving, re-scoping, or altering any other music track.
- Anything B-roll: no sourcing, no intake, no promotion, no predicate widening.
- Re-rendering or mutating any production `post_draft`.

## Allowed actions

- Read-only DB reads to (re)confirm the pre-state and to compose the held migration + rollback.
- Assemble the test video from the existing PK-approved combo render **or** the raw track over a neutral still (Claude may prepare the file locally in `_harness/`).
- Draft the held flip migration + rollback SQL (file only; NOT applied).
- Record the Content-ID verdict and evidence in the result doc.
- Run the standard review chain on the prepared (held) migration: `db-rls-auditor` + external review pinned to the exact SQL hash + `branch-warden`.

## Forbidden actions

- **Do NOT publish the test video publicly.** Unlisted/Private only.
- **Do NOT upload on PK's behalf without explicit approval** — the YouTube upload is a side-effectful publish; PK performs it or explicitly authorizes each upload.
- **Do NOT apply the `content_id_safe` flip in this lane.** It is prepared-and-held; application is a distinct T3 PK gate.
- Do NOT modify `select_music`, the `require_content_id_safe` licence rule, `video-worker`, or any `enabled` governance flag.
- Do NOT touch, source, intake, or promote any B-roll clip; do NOT widen the `resolve_slot_assets` usage predicate.
- Do NOT approve or alter any other music track.
- Do NOT lift the `apply_migration` / `deploy_edge_function` deny entries in this lane (no application happens here).
- Standing hold-states from `docs/00_sync_state.md` remain in force (cc-0033a image overprint BLOCKER unaffected by this lane).

## Success criteria

- **A definitive Content-ID verdict for Drifting Piano — CLEAN or CLAIMED — evidenced from YouTube Studio** (not inferred from the CC0 deed alone).
- **If CLEAN:**
  - A prepared, reviewed, **HELD** migration that flips `content_id_safe` false→true for exactly `track_id=8f520a93…`, single-row CAS-guarded (asserts current value = false, rowcount = 1 before commit), with a validated ZERO-PERSIST rollback.
  - Confirmation (read-only, post-flip simulation or reasoning) that `select_music('format','video_short_stat',12,null)` would then return **exactly 1 row** (Drifting Piano) → B3 would flip TRUE once applied.
  - Review chain clean: `db-rls-auditor` pass · external review agree on the pinned SQL hash · `branch-warden` safe. STOP at the PK T3 gate for application.
- **If CLAIMED:**
  - Verdict + evidence recorded; `content_id_safe` stays false; B3 remains FALSE.
  - The alternative path named: (a) source/verify a genuinely Content-ID-safe track, or (b) PK elects VO-only as the governed video audio design (which then requires redefining the B3 "exactly 1 row" DoD tripwire).

## Stop condition

Report result per the result template. **If CLEAN → STOP at the T3 PK gate** for the held flip (do not apply). **If CLAIMED → STOP at the alternative-path decision** for PK. Either way, delete the test video once the verdict is captured (unless PK retains it).

---

## Gate-1 pinned decisions (PK, 2026-07-16)

1. **Channel:** Property Pulse production YouTube channel, **UNLISTED**.
2. **Test asset:** track-forward clip (Drifting Piano audio dominant / full track).
3. **Lane label:** PRODUCT_PROOF confirmed.

## Notes

- **Tier / classification:** the verification upload is a reversible, low-blast side-effect (an unlisted video that can be deleted) — **T2**. The eventual `content_id_safe` flip is production DML on a governance table that controls the audio of **published** videos — **T3** (full chain + external review + rollback-proven + explicit PK gate). This brief spans T2→T3; de-escalation would need a fresh Gate 1. Lane label: **PRODUCT_PROOF** (unblocks DoD B3) with a **safety-sensitive** write — PK confirms the label at Gate 1.
- **Risk framing for PK:** a Content-ID *claim* is **not** a channel strike — it monetizes or blocks the single claimed video, nothing more, and the test upload is deletable. Using a **non-production/test channel** removes even that exposure. This is why the empirical test is low-cost despite touching YouTube.
- **Why not just trust CC0:** CC0 waives the *uploader's* copyright but cannot prevent a *third party* from having fingerprinted the same recording (or a derivative) into Content-ID. HoliznaCC0 is a well-known genuinely-public-domain artist (low prior risk), but "low" ≠ "verified" — the test converts a fail-closed UNKNOWN into evidence.
- **Test-asset choice:** the PK-approved combo render has the bed at 70% under VO — Content-ID usually still matches at that level, but a **track-forward** clip (music dominant) is the more conservative test. Recommend the track-forward clip to minimise false-negatives.
- **Downstream, not this lane:** even after B3 is restored, the governed combo render PK approved on 2026-07-10 becomes reproducible again — but the separate **cc-0035 CtaText clipping carry** and the **B4 fail-closed proof (cc-0038, held)** remain open and are not touched here.
