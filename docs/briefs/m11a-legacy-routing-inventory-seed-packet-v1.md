# Brief M11a — Legacy-routing inventory (governed vs legacy, per committed cell)

**Created:** 2026-08-04 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor:** chat (Claude Code), read-only DB evidence via `db-rls-auditor` or `db-read.py`/`execute_sql` (read-only)
**Status:** issued
**Tier:** T1 (docs/read-only) — no dependency, authorised to start immediately
**Result file:** `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` (created on completion)

---

## Task

Produce a per-cell inventory, across every one of CGU's 25 committed
format×client×platform cells, of whether that cell's **real scheduled occurrences** actually
execute the governed builder (selector + asset resolver + metadata + QA + evidence path) or a
legacy code-composed route — not just whether the code path *exists*, but whether it is what
*actually ran* recently. This is the read-only inventory M11 (`docs/briefs/creatomate-global-
ultimate-final-delta-audit-v1.md` §2.2) names as its own precondition, and it is explicitly
authorised to start now (PK sequencing directive, §0f) as a preflight input to the §6 schedule-
expansion plan's own separate approval.

This inventory also carries the M15-fold sub-scope (PK ruling, §0f): identify every code location
where `kinetic_voice` (`video_short_kinetic_voice`) currently has format-list *eligibility*
without governed *implementation*, so a future M11b closure lane can act on "remove unsupported
`kinetic_voice` eligibility unless/until it gets its own governed implementation + proof." This
packet inventories those locations; it does **not** remove them.

## Source context

- `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §2.2 (M11 row, incl. folded
  M15), §3 (Phase 1 placement, PK sequencing directive), §5 item 8/9, §0f — the ratified must-have
  definition and the exact ruling this packet executes against.
- `docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md` — PP YouTube's 2-of-44 real
  governed-occurrence rate (the concrete instance of the trap M11 targets); confirms 25/25 cells
  are now state-1 in the readiness queue, which is exactly the "readiness-queue eligibility ≠ real
  occurrence routing" distinction M11 exists to close.
- **Grounded code citations (verified this session by repo search, not assumed):**
  - `supabase/functions/video-worker/b1_video_stat.ts:83` — `B1_VIDEO_GOVERNED_FORMAT =
    'video_short_stat'`; comment at lines 81-82 states the `_voice` variant is "DELIBERATELY
    EXCLUDED."
  - `supabase/functions/video-worker/index.ts:1628` — the live gate:
    `if (fmt === B1_VIDEO_GOVERNED_FORMAT && await isVideoGovernanceEnabled(...))` — a strict
    `===` on the base format key, so `video_short_stat_voice` never matches (confirmed in the
    surrounding comment block, index.ts:1618-1627).
  - `supabase/functions/video-worker/b1_video_kinetic.ts:71` — `B1_VIDEO_KINETIC_GOVERNED_FORMAT =
    'video_short_kinetic'`, gated identically at `index.ts:1641`; its own comment
    (index.ts:1636-1638) states `video_short_kinetic_voice` "does NOT match and falls through
    unchanged to the legacy isKinetic branch."
  - `supabase/functions/video-worker/index.ts:1645-1646` — the legacy fallthrough both `_voice`
    variants land in: `isKinetic = fmt === 'video_short_kinetic' || fmt ===
    'video_short_kinetic_voice'`; `isStat = fmt === 'video_short_stat' || fmt ===
    'video_short_stat_voice'` — code-composed, not selector-driven.
  - `supabase/functions/image-worker/index.ts:1082` (governed fork,
    `isImageGovernanceEnabled(..., 'image_quote')`) and `index.ts:1100` (`select_template` call)
    — `image_quote`'s governed path.
  - `supabase/migrations/20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql:53-54`
    — states outright that `isImageGovernanceEnabled` is only ever called with `'image_quote'`,
    "never with 'carousel'"; PP's carousel is governed by **declaring the existing legacy pipeline
    itself governed** (`property_pulse.carousel.legacy_pipeline` /
    `image_worker_legacy_carousel_v1`), not by a `select_template` route. **This is a different
    governance shape than every other format cell — flag it explicitly, do not silently count it
    as "the same kind of governed" as `image_quote`/`video_short_stat`/`video_short_kinetic`.**
  - `text` format: **no governed/legacy fork found** in `image-worker/index.ts` or
    `ai-worker/index.ts` (searched, not found — stated explicitly, not assumed). D1 (governed text
    carve-out) is recorded as "live via the governed-exempt rider" (Final proposal §1) — confirm
    what that rider actually is in code, since no `select_template`/governance-gate call was
    located for `text`.
  - `kinetic_voice` format-list memberships (eligibility without implementation) —
    `ai-worker/index.ts:346`, `youtube-publisher/index.ts:306`, `image-worker/index.ts:607`,
    publisher `asset_backstop.ts` files, and several migrations (`VIDEO_FORMATS`/
    `ELIGIBLE_FORMATS`/`isKinetic` checks). No `B1_VIDEO_KINETIC_VOICE_GOVERNED_FORMAT`-equivalent
    constant exists; no entry in `classify_format_capability`
    (`supabase/migrations/20260728034955_classify_format_capability_v1.sql`,
    `20260729120000_classify_format_capability_v2_publisher_path.sql` — grep confirmed no match in
    either).
  - `docs/briefs/creatomate-governed-video-production-gate1-packet-v1.md` §G2/G3 and
    `docs/briefs/pp-yt-kinetic-worker-and-graduation-gate1-brief-v1.md` — existing partial
    inventories of this exact fork; read first, do not re-derive what they already establish.

## Scope

**In scope:**
- All 25 committed cells (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §1/§6.1
  baseline): `image_quote` ×4 clients ×3 platforms, `text` ×4×2, `carousel` (PP FB/IG live, NDIS/CFW
  deferred), `video_short_stat` (PP, NDIS), `video_short_kinetic` (PP).
- For each cell: does it route governed or legacy for its **real recent scheduled occurrences**
  (not just readiness-queue `ready` state)? Use live read-only evidence (recent
  `m.post_publish`/draft history, `c.client_creative_governance` rows) cross-referenced against the
  code-path citations above — code existence alone is not sufficient evidence per M11's own
  acceptance test.
- Explicit classification of the two known naming-trap variants (`video_short_stat_voice`,
  `video_short_kinetic_voice`) and PP's carousel declared-legacy-pipeline pattern as their own
  named categories, not folded silently into "governed."
- The `kinetic_voice` eligibility location list (file:line), so an M11b closure lane can act on it
  without re-deriving this search.
- Confirm or correct the `text` format's "governed via governed-exempt rider" claim against actual
  code — if no rider is found, say so explicitly.

**Out of scope:**
- Any M11b closure work (migrating a cell to governed, retiring a legacy route, removing
  `kinetic_voice` eligibility, patching the `B1_VIDEO_GOVERNED_FORMAT` string-match). This packet
  inventories; it does not close.
- Any code edit, DB write, migration, deploy, or GRANT/REVOKE.
- Any schedule-volume expansion (§6) — explicitly gated behind its own separate PK approval (§0f
  sequencing directive); this inventory's findings inform that approval, they do not authorise it.
- Any format/cell outside the 25 committed cells (no speculative coverage of Weekly Digest,
  animated formats, or other explicitly-out-of-scope items per Final proposal §2.3).

## Allowed actions

- `Read`/`Grep`/`Glob` across the repo (worker source, migrations, docs/briefs).
- Read-only DB queries: prefer `python scripts/db-read.py "SELECT … FROM ice_ro.<view>"` for any
  read a curated R0 view can serve (`template_registry_status`, `pipeline_health`, etc. — check the
  10-view list first); fall back to `execute_sql` (read-only SELECT only) for anything not
  view-coverable, e.g. `c.client_creative_governance` rows, recent `m.post_publish` counts per
  cell, `m.video_short*` draft history.
- Cite every claim to a file:line or a live query result, exactly as this packet's own Source
  context does. Mark anything not independently re-verified as `[UNVERIFIED — needs a fresh
  check]`, per this programme's own evidence discipline.

## Forbidden actions

- No DDL/DML of any kind. No `apply_migration`, no `GRANT`/`REVOKE`, no code edit, no deploy.
- Do not remove or modify `kinetic_voice`'s format-list memberships — inventory the locations,
  hand off the removal action to M11b.
- Do not begin any other CGU Final must-have work (M1/M2/M4/M6/M7/M8/M9/M10/M12/M13/M14/M16/M18) —
  this packet is scoped to M11a only.
- Do not treat this inventory's completion as authorisation to expand schedule volume (§6) — that
  remains a separate, still-open PK approval (§0f).
- Do not silently reclassify PP's carousel declared-legacy-pipeline pattern as equivalent to a
  `select_template` governed route — it is a different governance shape and must be labeled as
  such.

## Success criteria

- A per-cell table (all 25 committed cells) with a governed/legacy/declared-legacy-governed/
  unclear classification, each row cited to a file:line or a live query, none invented.
- The two known naming-trap variants (`video_short_stat_voice`, `video_short_kinetic_voice`)
  explicitly confirmed as legacy-routed with their exact fallthrough citation.
- The `kinetic_voice` eligibility-location list is complete enough that an M11b closure lane could
  act on it without re-searching the repo.
- The `text` format's governance claim ("governed-exempt rider") is either confirmed with a
  citation or explicitly flagged as unconfirmed.
- Zero DB/repo mutations of any kind.

## Stop condition

Report the result per `docs/briefs/results/_template_result.md` (or nearest equivalent in this
repo) as `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md`, then stop. Do not
proceed to M11b or any other must-have item without a fresh PK gate — this packet's own scope ends
at the inventory.

---

## Notes

This is the first implementation output of the CGU Final programme's ratified must-have list
(§0f). It is deliberately the cheapest, lowest-risk item in Phase 1 (§3) and is explicitly
authorised to run ahead of the §6 schedule-expansion plan's own approval, per PK's sequencing
directive — its findings are meant to inform that approval, not to pre-empt it.
