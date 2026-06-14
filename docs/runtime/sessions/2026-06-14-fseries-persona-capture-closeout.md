# 2026-06-14 — F-SERIES-PERSONA-CAPTURE: persona intent capture/persistence close-out (COMPLETE; avatar differentiation DEFERRED)

**Status:** Persona **intent** capture + persistence + carry-through = **COMPLETE / DEPLOYED / VERIFIED.** Avatar differentiation = **DEFERRED (Branch B / avatar-governance).**
**Register:** docs-only reconciliation at **v3.49** (`docs/00_action_list.md` + `docs/00_sync_state.md`).
**Authority impact:** none (persona is planning intent captured upstream; as-built decision flow + T1 unchanged; avatar selection untouched).

---

## 1. What is now live (intent capture)
- **EF — series-outline v1.4.0** (commit `4d9b82c72b16d065ea6e778b84546dd8f0590a03`; Supabase function **version 47**; `verify_jwt=false`; `deno check` exit 0; live GET `series-outline-v1.4.0`). Persona-only delta over v1.3.0: prompt requests `persona_label`/`avatar_preference`/`persona_notes` (optional, null-safe via `cleanStr`); `episodeRows` maps them. v1.3.0 platform-aware resolver / whitelist / fail-loud logic **unchanged.** EF D-01 `d311d11c-bae5-487f-b0d4-27301baa3a2a` (partial / escalate=true — PK approved despite escalation).
- **DB — `save_series_outline`** persists the three persona keys from `p_episode_rows` into `c.content_series_episode` — body md5 `ec5db30454c0aa942716292236b8ad44` → `93cf6ff9793282b6e56397c05d043fd3`; DB D-01 `2db87754-5af1-4727-9f0b-440bbcea8d91`.
- **`fan_out_episode` UNCHANGED** — already carries the episode persona fields into the child brief and `creative_intent.source_material.persona` (verified live; not modified this lane).
- **No production series mutated** during verification (read-only checks only).

## 2. Explicit boundary — avatar differentiation NOT complete
Different avatars / character / voice rendering per persona remains **deferred Branch B / avatar-governance work.** This lane does **NOT** change `stakeholder_role`, heygen-worker, `c.brand_avatar`, A2 / Branch-A pinning, or avatar selection. Persona is captured as **intent only**; it does not yet drive which avatar/voice renders.

## 3. Carries
- **F-SERIES-AVATAR-DIFFERENTIATION (Branch B)** — P3 DEFERRED — persona→distinct avatar/voice rendering + pin-vs-persona governance.
- **F-SERIES-FORMAT-DIVERSITY** — P3 DEFERRED.
- **F-SLOT-SCHEDULE-FIDELITY** — P4 WATCH (v3.48).
- **Stage 4 (UI)** — NOT started (persona today is outline-prompt/model-driven; a dedicated operator capture surface is Stage 4).

## 4. Rollback (independent halves; no data migration)
- **EF:** redeploy series-outline **v1.3.0** with `--no-verify-jwt`.
- **DB:** re-apply the prior `save_series_outline` body (md5 `ec5db30454c0aa942716292236b8ad44`).

## 5. Footprint
The DB migration + EF deploy were prior lanes; **this reconciliation pass is docs-only — 0 code / 0 DB / 0 migration / 0 deploy / 0 dashboard / 0 production mutation.**
