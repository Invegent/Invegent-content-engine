# Schedule-Driven Governed Video — Golden-Path Proof (Gate-1 Brief)

> **Lane:** schedule→format authority, minimal golden-path slice · **Type:** code + live-proof
> **Tier:** **T3** (deploys `ai-worker`; changes what format a LIVE PP YouTube slot renders; produces a publish-ready governed video)
> **Lane class:** PRODUCT_PROOF (prove the gate) + SAFETY_GATE (touches the live authority path)
> **Status:** DRAFT — awaiting PK Gate-1 approval. Authorises NO build, NO deploy until approved.
> **Scope decision (PK, this session):** *Minimal golden-path proof* — smallest durable change that makes the
> gate literally true end-to-end. Does **NOT** build the general cc-0079 R3/R4 resolver.

---

## 1 · Outcome & gate

- **Outcome:** Prove *repeatable* Creatomate production from an **authoritative scheduled video slot** through to a **publish-ready video**.
- **Gate:** the schedule-selected video format must **drive** the governed Creatomate path **end-to-end**.

## 2 · Where it stands (grounded, current code + live DB, 2026-07-26)

- **Render half already PROVEN.** Governed PP `video_short_stat` is fully spine-driven (template + baked-bg + governed logo + governed voice, zero client hardcodes; video-worker v3.9.0). PK-approved publish-ready render `989558b1` (v6.29).
- **Authority half BROKEN — this is the whole gap.** Every renderer/publisher reads `m.post_draft.recommended_format` — the **Advisor's** pick, written by `ai-worker`. `m.slot.format_chosen` — the **schedule's** allocation — is read by nothing in production (only `obs-observer` telemetry). No governed resolver sits between them. Confirmed in current code (`video-worker/index.ts:1092,1234`; `ai-worker` writes `recommended_format`; grep of `format_chosen` = telemetry/audit only).
- **Live baseline — the defect caught on the exact golden path.** All 3 filled PP YouTube slots whose schedule chose `video_short_stat`:

  | Slot | Sched date | Schedule chose | Advisor `recommended_format` | Governed render? |
  |---|---|---|---|---|
  | `3ab2e6a2` | 2026-07-23 | `video_short_stat` | `text` (unpublishable on YT) | never fired |
  | `b57a506b` | 2026-07-16 | `video_short_stat` | `video_short_kinetic_voice` (legacy) | never fired |
  | `52758754` | 2026-07-09 | `video_short_stat` | `text` | never fired |

  **3/3 overridden, 0 reached the governed Creatomate path.** Next queued: slot `a157f5bb` (2026-07-30, `video_short_stat`, `future`) — same fate unless fixed.

- `video_short_stat` is platform-valid ONLY on **YouTube** (`platform_support` FB✗/IG✗/LI✗/YT✓), so the authoritative video slot IS a PP YouTube slot. PP is the sole governance-enabled client for the format.

## 3 · The change — one narrow, precedented hard-pin

**Exact in-repo precedent:** the F-HEYGEN A2 avatar override (`ai-worker/index.ts:1072-1077`) already hard-pins `decidedFormat` for ONE format when the slot requested it, and records what the Advisor would have chosen. This lane does the identical thing for `video_short_stat`:

> When a scheduled slot's `input_payload.format === 'video_short_stat'` **AND** the client has a
> governance-enabled `(client, video_short_stat)` row in `c.client_creative_governance` **AND** the
> platform is YouTube (the only platform-valid target) → force `decidedFormat = 'video_short_stat'`;
> record `advisor_would_have=<pick>` in the advisor reason. The Advisor keeps every other power
> (angle, headline, copy, template); it loses only the ability to change *this* format when the
> schedule authoritatively demands it and the governed path exists.

This makes the schedule's `video_short_stat` survive to `recommended_format` → the governed video fork (`video-worker/index.ts:1092`) fires → governed Creatomate render. **Zero change to renderers/publishers.** Self-limiting: only governance-enabled PP YouTube `video_short_stat` slots are affected — exactly the golden path.

**Two live risks folded in (both current, both real):**
- **`cta_text` max_chars kill.** Governed video has run twice ever; the second died `pre_render` — `cta_text` 133 > max 90, no AI repair. The proof draft must satisfy the video contract's `max_chars` (constrain the AI copy to the contract, or select/repair a compliant subject) or it dies permanently. Handled in the code slice.
- **Silent-video (audio never measured).** `video-worker/qa.ts` defers audio by design; `succeeded` has been logged on silent output. "Publish-ready" here uses the P1 **measured**-audio criteria (ffprobe stream present · −45 dBFS floor · LUFS vs −58 regression), not render status.

## 4 · Proof (no PASS on a plan — only on observed output)

1. **Baseline** (done, read-only): 3/3 override table above.
2. **Authority:** after the pin, subject slot's `recommended_format == video_short_stat` (schedule choice survives); `advisor_would_have` recorded.
3. **End-to-end:** governed video fork fires → Creatomate render → measured audio PASS → **publish-ready** (stop before actual publish — that is a separate PK act).
4. **Repeatable:** convergence (allocator is deterministic, §4.1 cc-0079) + the recurring weekly YouTube demand → next slot behaves identically; re-run yields the same pin.
5. **No regression:** non-governed / non-YouTube / non-`video_short_stat` slots unchanged; Advisor authority intact everywhere else. Deno tests + the existing avatar-override tests stay green.

## 5 · Lane sequence (each gate unchanged)

1. Confirm build preconditions (read-only): `input_payload.format` carries `video_short_stat` on these scheduled jobs; PP `(video_short_stat)` governance `enabled=true`; capture subject `cta_text` length.
2. **ef-builder** in an isolated worktree — the pin + cta_text contract-constraint + Deno tests (LOCAL only).
3. **branch-warden** (safe) · **db-rls-auditor** (ai-worker gains a read of `c.client_creative_governance` — read-only; confirm no exposure/privilege issue) · external `ask_chatgpt_review` pinned to the diff hash.
4. **PK deploy gate (HARD STOP)** — `safe-deploy.sh ai-worker --allow-warn` (confirm `verify_jwt` posture); **deploy-verifier** post-deploy.
5. **Live end-to-end proof** — drive the subject slot in a controlled manner (not wait on cron autopublish) → governed render → measured-audio QA → publish-ready evidence captured.
6. **Result doc + register pointer** (Convention 1).

## 6 · Scope fences

Touches **only** `ai-worker` (one narrow override + cta_text constraint) and produces a publish-ready video. **No** general R3/R4 resolver, **no** schema change, **no** change to renderers/publishers/allocator/mix, **no** static-YouTube capability, **no** actual publish. Reversible (revert the deploy). The Advisor retains all authority except changing `video_short_stat` on the governed golden path.

**Non-claims:** does not claim the general schedule→format authority is solved (it is not — this is one golden path); does not claim other formats/platforms/clients are governed by the schedule; does not claim the cta_text or audio-measurement defects are fixed system-wide (only handled for this proof).
