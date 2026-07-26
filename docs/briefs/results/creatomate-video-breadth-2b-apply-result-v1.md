# Result — Video Breadth Phase 2B · PP Candidacy T3 Apply (v3) — LANDED + PROVEN

**Lane:** cc-0044 CP-E video breadth · Phase 2B (Property Pulse second governed `video_short_stat` candidate)
**Date:** 2026-07-26 Sydney · **Author/orchestrator record.** · **Tier:** T3 (production DML on the enabled PP path)
**Outcome:** **APPLIED & PROVEN.** `03bc6a3c` registered as a live governed candidate on PP `video_short_stat`; `c11bb8ab` remains the deterministic production winner; breadth (≥2 ranked candidates) proven live.

---

## 0. Identity

| | value |
|---|---|
| Reviewed packet | `docs/briefs/creatomate-video-breadth-2b-design-packet-v3.md` |
| Packet sha256 (reviewed_input_hash) | `4a68e2b3c8b3602d4d8dbaa78f9837b864f52de1419f49ae15fcb3318af14783` |
| APPLY block [0] sha256 | `7648e00a7b4d0ee739a94a092428f35254f83748fb9b78bdc375d3846261db26` |
| ROLLBACK block [2] sha256 | `1b510e122da2ca7501f0e4aaca21df410e406f2ba9dcaad9dfff219b9d6e6b7d` (byte-identical to v2) |
| New provider template | `03bc6a3c-985a-4488-b008-67632372783c` — "Stat Reveal 9×16 — Governed AV v2" |
| New INTERNAL template id (minted at apply) | `4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958` |
| Proven winner (untouched) | `c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` (internal `a3d8472d-9438-4312-9f11-b6a920be4014`) |
| PP client_id | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` · family `0688284e-…` (generic.stat_hero_card) |

---

## 1. What happened (v2 fail-closed → v3 fix → v3 apply)

1. **v2 apply attempt (packet `93ce8310`, PK-authorised 2026-07-26) FAIL-CLOSED and rolled back — ZERO production change.**
   The load-bearing in-txn winner-guard raised `BREADTH_2B_WINNER_GUARD_FAIL`. Root cause = a **concrete defect in the guard PREDICATE**: it checked `alternatives[] @> {"provider_template_id":"03bc6a3c…"}`, but `public.select_template` builds `alternatives[]` elements **without** `provider_template_id` — only the internal `template_id` + `provider_template_name` + `variant_key` + `rank_reasons` (source `20260703035154_create_select_template_v1.sql` L391-395); `provider_template_id` appears **only** on `selected` (L369). The guard was structurally guaranteed to raise even though the breadth OUTCOME was correct (the in-txn selector returned `c11bb8ab` winner with `03bc6a3c` as the alternative). The single-call atomicity harness rolled the whole registration back; verified live afterward: `03bc6a3c` absent, PP winner still `c11bb8ab`, alternatives 0.

2. **v3 fix (harness-predicate only).** Guard re-keyed to assert `03bc6a3c` in alternatives by its **internal** `template_id` (`nid`, already derived in the assertion):
   `alternatives @> jsonb_build_array(jsonb_build_object('template_id', to_jsonb(nid)))`.
   The §5 P1 proof annotation was corrected to the true alternatives shape. **The INSERT write-set (register + 5 rungs) is byte-identical to v2** (verified by diff); only the guard predicate changed. Durable gotcha memorialised: *select_template alternatives[] lacks provider_template_id*.

3. **v3 review chain (all green).**
   - `db-rls-auditor`: **PASS / clean** — schema conforms across all 6 target tables (every column, NOT-NULL, CHECK literal, UNIQUE/FK); winner-guard **semantically correct & fail-closed, proven 3 ways** (selector source · operator-containment probe · end-to-end probe vs real `select_template` output); no RLS/REST/migration regression; advisors no new finding (data-only INSERT).
   - `apply-harness-auditor` (SHADOW): **PASS / clean** — all ten checks, Check 7 (apply/rollback identity) clean (6 write targets ↔ 6 identity-inline DELETEs, child-before-parent); every declared STOP executable. *Shadow — cleared no gate.*
   - External review `ee8a3578` (pinned `4a68e2b3`): `partial` → PK; no concrete defect; escalation = `policy_decision` (live PP candidate, PK-accepted via PP-over-NDIS ruling) + `runtime_verification_required` (closed by the read-only guard-semantics proof + §5 P1).
   - Guard semantics proven read-only: passes only on a genuine alternative; fail-closes if displaced or wrong.

4. **v3 apply — fresh PK authorisation, one `execute_sql` call.** Preconditions re-asserted immediately pre-apply (winner `c11bb8ab`, alternatives 0, `03bc6a3c` absent). The winner-guard passed; COMMIT succeeded.

---

## 2. Post-apply proof (§5, read-only, live)

| Probe | Expected | Live |
|---|---|---|
| P1 status | ok | `ok` ✅ |
| P1 selected (winner) | `c11bb8ab` | `c11bb8ab` (unchanged) ✅ |
| P1 alternatives count | 1 | 1 ✅ |
| P1 alt[0] | `03bc6a3c` variant `stat-reveal-9x16-governed-av-v2`, rank_reasons `[fit_strong_candidate, registry_order_tiebreak]` | exact match ✅ |
| P3 `03bc6a3c` resolve | `Logo.source` present (governed `pp_logo_primary`), no `Background.source` (C1) | `{"Logo.source":".../PP_logo_2.png"}` ✅ |
| P4 floor (`video_short_kinetic`) | fail_closed | `fail_closed` ✅ |

**Governed video breadth is real:** PP `video_short_stat` now has two ranked governed candidates, winner unchanged.

---

## 3. Fences honoured

Template id pinned `03bc6a3c` · no `m.*` touch (no draft/render/publish/queue) · no `c.client_creative_governance` (no client-wide enablement) · `c11bb8ab` in zero write/delete statements (in-txn assertion + winner-guard verified untouched) · complete by-identity rollback available (`1b510e12…`).

---

## 4. Outcome part 2 — governed PP video PRODUCED + PK-APPROVED PUBLISH-READY ✅

A real governed PP `video_short_stat` video was rendered through the **production winner** and PK-accepted as publish-ready (visual + audible) on 2026-07-26.

| Field | Value |
|---|---|
| Template | `c11bb8ab` (winner; 9:16, 1080×1920, 12s) |
| Creatomate render | `989558b1-8d82-4924-b9a1-d46db5d8f59f` (succeeded) |
| MP4 | 4,277,000 B · sha256 `310d8f7270b56a787d5696d2c6b37ec7673302194584481fb745768d83896aaa` · local `_harness/pp2b_governed_render_20260726/pp_governed_video_short_stat.mp4` |
| Governed Logo | `resolve_slot_assets` → `Property_Pulse/Logos/PP_logo_2.png` |
| Governed Background | `resolve_slot_assets` (live seed) → `Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg` |
| Governed Voice | PP `YCxeyFA0G7yTk6Wuv2oq` (c.client_voice_config) · ElevenLabs `eleven_multilingual_v2`, stability .5 / similarity .75 · VO sha256 `54d8669a…` |
| Governed Music | `select_music('format','video_short_stat')` → `calm_piano_drifting_006` "Drifting Piano" (−27.2 LUFS) |
| Stat copy (within gates) | `$782K` / Perth median house price / +3.7% quarter / "What does this mean for your next move?" |

**Provenance is genuinely governed** — Logo/Background from the resolver, bed from `select_music`, voice from the voice-config; only the stat copy is hand-authored. **Side effects contained:** one VO mp3 to `post-videos/_harness/pp2b_governed_20260726/` (scratch); NO draft / queue / publication / production-rotation change. Producer harness: `_harness/pp2b_governed_render_20260726/render_pp_governed.py` (self-sources keys; keys never in transcript).

## 5. Carries / next

- **Register recording:** `00_sync_state.md` + `00_action_list.md` pointer, and this packet's v3 immutable-ref placement, to be committed with an **EXPLICIT PATHSPEC** (the pending v6.28 docs commit is still staged in the shared worktree — must not fold in). Commit + push are PK gates.
- **Separate following lane (unchanged):** video audio numeric measurement (ffmpeg/loudness) — deferred per the standing carry; PK visual+audible verdict already given for THIS render.
- **C1/C2 (documented, non-manifesting while `c11bb8ab` wins):** `03bc6a3c` renders a baked background (no governed dynamic bg field) and 720×1280 vs the winner's 1080×1920 — relevant only if `03bc6a3c` were ever promoted to winner.
