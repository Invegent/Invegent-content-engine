# Briefs Queue

Active briefs ready for execution by the D182 v1 non-blocking automation system.

## How this file works

Briefs live as individual files in `docs/briefs/`. This file is the operator-facing queue showing what's ready, what's in flight, and what's done. Cowork (when scheduled in Phase 4) reads this file to find the next brief with `status: ready`.

When a brief moves through the lifecycle, update the row here. Detailed state lives in `docs/runtime/runs/{brief_id}-{timestamp}.md`.

## Active queue

| brief_id | risk_tier | status | owner | created | latest run |
|---|---|---|---|---|---|
| `post-publish-observability-column-purposes` | 1 | ready | cc | 2026-04-30 | — |

## Recently completed

| brief_id | risk_tier | status | owner | created | run | completed | notes |
|---|---|---|---|---|---|---|---|
| `phase-b-patch-image-quote-body-health-gate` | 2 | done | cc | 2026-04-30 | 2026-04-30T033748Z | 2026-04-30 | Phase B patch — body-health gate on `m.fill_pending_slots(integer, boolean)` candidate_pool + relaxed_pool CTEs and `m.hot_breaking_pool` view. Pre-flight clean (1 overload, 0 dependents, both definitions captured verbatim). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T03:48:25Z. Four-step rollback test passed end-to-end: apply ✅ → rollback ✅ → re-apply ✅ → patched final state ✅. Reproducibility 12/12 (3 PASS / 9 EXCLUDE). Pool retention exact match to brief: CFW 132 / NDIS-Yarns 132 / PP 64 / Invegent 13. +24h observation checkpoint due 2026-05-01T03:48:25Z drives Gate B Sat 2 May exit decision. Embedded BEGIN/COMMIT wrapper in CC's draft accepted as Path A — no surfaced warning. |
| `slot-core-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T020151Z | 2026-04-30 | 56 columns populated across m.slot (20), m.slot_fill_attempt (16), m.ai_job (20) — each at 100% documented. m schema coverage 9.2% → 17.3% (63 → 119 of 686). All HIGH confidence (4 JSONB sourced from production data + check_pool_health function body, 10 enum columns enumerated from observed value distributions, 42 from FK + name + table_purpose signals); zero LOW-confidence escalations. Atomic DO block self-verified pre/post count delta = 56. Migration applied by chat via Supabase MCP per D170. |
| `phase-d-array-mop-up` | 1 | done | cowork | 2026-04-29 | 2026-04-29T102956Z | 2026-04-29 | 🎉 First D182 run — 5/5 success thresholds. 7 ARRAY columns documented (c+f 142→149, 22.1%). Cowork run — 0 questions, 0 corrections, 0 production writes from automation, ~5 min runtime, ~45k token burn. Migration applied by PK via Supabase MCP per D170. |

## Failed / blocked

*(none)*

---

## Status legend

- **ready** — brief authored, frontmatter complete, awaiting execution
- **running** — Cowork has picked it up
- **questions_pending** — Cowork has written to `claude_questions.md`, awaiting `claude_answers.md`
- **validation_pending** — output ready for GitHub Actions validation
- **review_required** — validation passed, awaiting PK morning approval
- **done** — PK has approved and applied (move to Recently completed)
- **failed** — something went wrong; PK to inspect state file and decide next step
- **blocked** — Tier 2/3 escalation hit; PK must reset to ready manually

## Adding a new brief

1. Create `docs/briefs/{brief-id}.md` with v1 frontmatter (see `docs/runtime/automation_v1_spec.md`)
2. Add row to Active queue table above
3. Set `status: ready` in the brief frontmatter
4. Commit

That's it. The brief is now visible to Cowork.
