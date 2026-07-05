CLAIMED v5.00 · tmr-dead-ref-cleanup-lane-d · shared-main-docs · commit-gate · 2026-07-05T05:20Z

# Result — TMR Dead-Reference Cleanup — Lane D — CE Declarative Registry Truth Pass

**Governing plan:** `docs/briefs/tmr-dead-reference-cleanup-plan-packet.md` (PK-approved; order D→B→W) · **Gate 1:** PK 2026-07-05 (T1 · SAFETY_GATE) · **Completed:** 2026-07-05
**Status:** ✅ APPLIED (docs-only, uncommitted) — **awaiting PK commit gate**

## 1. What changed (3 files, additions/relabels only — history preserved)

**`docs/creative-library/property-pulse.json` → registry v0.4:**
- All 3 PP news variants retired as live truth via NEW `provider_status`/`provider_status_note` fields + `purpose` RETIRED relabels: `centred-scrim-16x9` → `retired_artwork_repurposed` (C4 — the silent-wrong case: ID `48cba556` now hosts the 1:1 generic market-insight; 16:9 artwork gone) · `centred-scrim-9x16-video` → `retired_provider_deleted` (C3) · `centred-scrim-1x1` → `retired_provider_deleted` (C1 — the 2026-07-04 outage template; superseded by Option D).
- 1x1 `known_limitations` prefixed HISTORICAL (pre-Option-D) · capability-contract `evidence.notes` gains a 2026-07-05 truth annotation (contract v3 stays a separate carry, per plan) · both legacy `implementations[]` entries gain matching `provider_status` · `carries[]` gains the v0.4 changelog incl. the **`2fd50302` never-wired record** (C-plan annotation).
- **Evidence blocks verbatim:** every render_log_id / source_commit / proof_gate / production_instances value kept — warden-verified programmatically, **51/51 present**, only 6 sanctioned `-` lines (relabels), zero evidence deletions. `fb9820f8` TMR registry row untouched (historical production_proven, per plan).

**`docs/creative-library/property-pulse-template-family-news-v1.md`:** §7 matrix — 2 rows RETIRED-annotated (+`(history)` on proofs) + the missing `centred-scrim-1x1` row ADDED as RETIRED (auditor advisory #1 delivered; variant had been absent from the matrix since v0.3).

**`docs/architecture/current-ice-flow-v2.md`:** 5-line pointer note appended to the B0 bullet (auditor advisory #2 delivered — the approved-scope item initially missed): fb9820f8 deleted provider-side, proofs remain history, production now Option-D winner-driven.

## 2. Before/after reference table

| ID | BEFORE (live-truth claims) | AFTER |
|---|---|---|
| `48cba556` (C4) | json:183 "proven PP 16:9 variant" · impl status active · family doc "proven (Gate C)" | `retired_artwork_repurposed` + note (ID hosts market_insight 1:1; API-verified 2026-07-05); family row RETIRED; proofs kept as history |
| `fb9820f8` (C1) | json:223 "**the LIVE … PRODUCTION** variant" · v0.3 changelog "LIVE 1:1" · flow-v2 un-pointered B0 narrative | `retired_provider_deleted` + Option-D supersession note; known_limitations HISTORICAL; flow-v2 pointer note; 1x1 family row added RETIRED; evidence verbatim |
| `bc32f52f` (C3) | json:203 "proven PP News video variant" · impl active · family doc "proven (Gate D2)" | `retired_provider_deleted` + note (future video re-authors from scratch); family row RETIRED |
| `490ad9ea` (C2) | no declarative-registry presence (purged v4.71) — nothing to retire here | unchanged (correct); code-side cleanup = Lane W |
| `2fd50302` | undocumented orphan | v0.4 changelog: authored B0-era, NEVER WIRED, no registry entry needed |

## 3. Proofs

- **creative-graph-auditor: PASS** — evidence-SHAPE intact, keys/references resolve, runtime-import guard holds, vendored drift stays `stale_documented` (Lane B fixes it). 6 advisories: 2 delivered in-lane (§1); 4 carried → family-doc §6/§13 two-variant prose reconcile (register-reconciler), `provider_status` vocabulary clause for registry-schema-v2.md, drift-note wording refresh (Lane B), approved_at backfill (existing carry), contract purpose reword (contract v3 carry).
- **branch-warden:** content checks ALL PASS (json 51/51 evidence preserved; family doc matrix-only; architecture doc pure addition). Verdict `stop` on three procedural items, each resolved: HEAD drift 786a6db→`894247c` = 3 parallel-session commits, warden-verified **file-disjoint** from Lane D → base re-pinned; "staged harvester files" premise stale (they committed in `894247c`); stray modified `.claude/agents/brief-author.md` = the parallel brief-author-promotion lane's uncommitted work → **excluded from Lane D's commit pathspec, untouched**.
- **AFTER grep:** declarative surfaces carry the 4 IDs only inside retirement annotations/history; zero mutation elsewhere (`git status`: exactly the 3 Lane-D files + pre-existing parallel-session items).
- Boundaries held: no worker/dashboard/DB/storage/Creatomate/render/publish/deploy; D6 artifact untouched; fb9820f8 registry row untouched; no historical doc rewritten (annotations only); contract v3 not started.

## 4. Commit plan (PK gate)

Exact pathspec (nothing else — notably NOT `.claude/agents/brief-author.md`): the 3 changed docs + `docs/briefs/tmr-dead-reference-cleanup-plan-packet.md` (governing plan, first commit) + this result doc + registers (v5.00 pointers). Suggested message: `docs: lane d — retire dead creatomate references in declarative registry (v0.4)`.

## 5. Next

Lane B (dashboard truth refresh, T2) awaits its own Gate 1 · Lane W (worker dead-code, T3) after that · **D6 preempts all** (publish slot 21:30Z tonight).
