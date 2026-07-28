# Result — S9 Permanent Capability Enforcement, Gate-1 Architecture

**Brief/packet file:** `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md`
**Executed by:** Claude Code (orchestrator-driven)
**Completed:** 2026-07-28 Sydney
**Lane class:** SAFETY_GATE / PRODUCT_PROOF (design) · **Tier:** T1 (this lane, read-only design) — the resolver/publisher builds it authorizes are each their own future T3 lane

---

## 1. Result status

`Complete — Gate-1 architecture PK-approved with five rulings, review clean, packet finalized.` No resolver/publisher implementation performed or attempted this session, per explicit PK stop condition (ruling 5).

## 2. What was produced

A single Gate-1 architecture + implementation-boundary document (`docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md`, sha256 `f0fd60d9a8ec5eac4bbfe5b23b9b1fdc935ce8419a667589e1ff26176a3a3753` at final review) covering, per the original 4-part outcome request:

1. **Resolver enforcement architecture** — a single classifier chokepoint (`public.classify_format_capability`) inserted at the one `ai-worker` write site all 11 identified fallback paths converge through, plus an earlier schedule-fill check and optional render-dispatch hardening.
2. **Publisher enforcement architecture** — one shared predicate edit to `m.publisher_lock_queue_v2` covering Facebook/Instagram/LinkedIn (inherited via the `v1`→`v2` delegating wrapper), two edits for YouTube's independent schedule-blind dequeue/claim path, and a mandatory `auto-approver` guard.
3. **Dashboard-visible state contract** — reuses existing `requested_format` / `final_format_authority` / `final_format_reason` fields (no new schema), explicitly never conflated with `video_status`/`approval_status`/publish-failure statuses.
4. **Containment-release criteria** — nine conditions per platform, executed in a PK-mandated sequential order (Facebook → Instagram → LinkedIn → YouTube last), not a combined release.

Grounded via `db-rls-auditor` (2 passes, live DB), 2× `Explore` (ai-worker fallback map; publisher dequeue map), and direct `Read`/`Grep`/`Bash` (git branch/log verification, prior artifact review). Zero writes, zero migrations, zero deploys, zero re-application of the classifier.

## 3. PK rulings incorporated (2026-07-28)

1. Classifier dependency status corrected — **and found more advanced than the ruling's own stated premise**: already committed to `main` (`14453ff`) and pushed (0 ahead/0 behind origin), byte-verified against live DB behavior. Flagged as a discrepancy rather than silently written as instructed (§0b of the packet).
2. WordPress excluded from v1; confirmed not currently reachable for NDIS-Yarns; recorded as a future census item with the specific `c.client.profile` JSON-key gate named.
3. Blocked-state representation uses only existing format-authority fields (`requested_format`, `final_format_authority='blocked_by_capability'`, `final_format_reason`) — no new schema, no misuse of render/approval/publish-failure statuses.
4. Release order fixed: Facebook → Instagram → LinkedIn → YouTube last, each independently gated; YouTube's extra dequeue/claim proof + its fail-open preload bug named as an explicit co-requirement.
5. Gate-1 completion checklist (11-path convergence, shared-queue coverage, both YouTube entry paths, auto-approver guard mandatory, external review) — all confirmed in the packet's §9, with citations.

## 4. External review

- **First attempt void** (`review_id 9a277aa4-…`) — a placeholder was left in the `proposal` field instead of the actual packet text; nothing was reviewed; discarded.
- **Second, corrected attempt is of record**: `review_id f5b823e3-0db5-4abe-9978-7e342776f2e8`, `action_type=plan_review`, pinned to `reviewed_input_hash = f0fd60d9a8ec5eac4bbfe5b23b9b1fdc935ce8419a667589e1ff26176a3a3753`. **Verdict `agree`, risk `medium`, confidence `high`, zero pushback points.** No `concrete_defect`/`missing_evidence`/`policy_decision` triage class raised — no routing action required per the CCF-02 contract.

## 5. Chain

| Gate | Result |
|---|---|
| Grounding (`db-rls-auditor` ×2, `Explore` ×2) | Clean — all citations verified live/current at time of writing |
| Git/branch verification (`branch-warden`-equivalent manual check) | `main` HEAD `14453ff`, 0 ahead/0 behind origin, working tree pre-existing 429-path dirty state unrelated to this lane (untouched) |
| External review | `agree` / medium / high confidence (see §4) |
| PK gate | Architecture direction approved 2026-07-28 with 5 rulings; this is the closing record |

## 6. Explicit boundary held

No resolver or publisher code, migration, or config was written, changed, or deployed this session. The classifier (`public.classify_format_capability`) was read and its live behavior re-verified but **not reapplied**. The 4-platform NDIS containment pause (`docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md`) remains live and unchanged — it is the safety net until the resolver + publisher builds this Gate-1 authorizes are deployed and each platform's release criteria (§5 of the packet) are independently met, in the PK-mandated order.

## 7. Next steps (not started this session)

Per the packet's §6: (1) resolver build as its own T3 lane (brief → `ef-builder` → `db-rls-auditor`/`branch-warden` → external review → PK gate 2 → deploy → `deploy-verifier`); (2) publisher build as its own T3 lane, sequenced after; (3) per-platform release proof in the fixed order. A handful of small build-time verify items are carried in the packet's §7 (nullability of `recommended_format`, absence of a CHECK constraint on `final_format_authority`) — neither is an architectural fork, both are cheap to check when the resolver build starts.
