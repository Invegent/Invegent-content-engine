# Brief cc-0087 — migration ledger reconciliation

**Created:** 2026-07-29 Sydney
**Author:** chat
**Executor:** Claude Code (ef-builder-style, isolated worktree; git/file writes only — no DB mutation)
**Status:** draft
**Result file:** `docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md` (created on completion)

---

## Task

Backfill git-tracked `supabase/migrations/*.sql` files for every migration that Supabase's own
`supabase_migrations.schema_migrations` ledger records as **applied**, since 2026-06-30, but that has
**no corresponding file anywhere in this repo's git history** (confirmed via `git log --all -S`, not
just a working-tree check). This closes the exact gap that caused the `select_template` incident in the
Creatomate registry-repair lane (`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md`
§0.3): reasoning from `supabase/migrations/` alone produced a materially wrong safety claim because the
live deployed function diverged from its only tracked migration file.

**This is a documentation/backfill task, not a schema change.** Every one of the 20 confirmed gaps is
already live and applied — the task is making the git record match reality, not changing reality.

## Source context

- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §0.3 — the incident that
  surfaced this; row 17's safety analysis had to be corrected mid-lane because of exactly this gap.
- `docs/briefs/results/video-d6-lane2-registry-mapping-result-v1.md` — the fullest-documented instance
  of the pattern: `apply_migration` was harness-denied that session, PK ran SQL directly, the ledger was
  reconciled after the fact (`schema_migrations` rows inserted for `20260719010700`/`20260719010800`),
  but the byte-exact SQL was only ever written to `_harness/video_d6_lane2_20260719/` — which
  `2b5e44b` gitignores. This is the recurring failure shape to look for at each gap: check for a
  matching `_harness/<lane>/` directory first (121 harness directories still exist on disk locally,
  even though gitignored — several already spot-confirmed to match gap names, e.g.
  `_harness/video_d6_lane2_20260719/`, `_harness/cc_broll_*_202607*` for the two `resolve_slot_assets`
  broll gaps).
- `mcp__supabase__list_migrations` (project `mbkmaxqhsohbtwsqolns`) — the ledger; re-pull fresh at lane
  start, do not trust the version list below as still-current (today alone added
  `20260729143000`/`s9_layer1_capability_gate_fill_pending_slots` after this brief was drafted, and
  today isn't over).

## Scope

**In scope:** the 20 confirmed gaps below (version → ledger `name`, name-matched against local
filenames, not just timestamp-prefix-matched — some historical files use an 8-digit-date naming
convention that a naive prefix diff misreads as missing):

```
20260630112110  tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix
20260719010700  video_d6_lane2_select_template_client_scope_rung
20260719010800  video_d6_lane2_register_pp_video_short_stat_mapping
20260719160000  cc_0041_asset_gap_analysis_schema_v1
20260719170000  cc_0042_appetite_inventory_read_path_v1
20260719190000  cc_0042_appetite_inventory_read_path_v2_fix
20260719210000  cc0043_asset_gap_analyzer_writer_v1
20260723035423  cc_0049_activate_client_normalize_logo_extraction_method_v1
20260724043508  cc0063_brand_host_designation_v1
20260725223652  r3a_resolver_shadow_columns_and_resolve_final_format_v4
20260726071501  rescope_pp_youtube_thumbnail_backgrounds_pathb
20260726072610  gcp_slice3_list_active_clients_add_slug
20260726232436  cc0083_add_persona_name_to_brand_stakeholder
20260727005836  cc0083_activate_ndis_participant_lac_avatars
20260727012219  automated_image_intake_v1_slice1_rejected_fingerprint
20260727042653  automated_image_intake_v1_slice2_shortage_detector
20260727080229  automated_image_intake_v1_slice3_filter_new_candidates
20260727083508  pa1_client_schedule_cap_override_store
20260727090955  pb1_publish_cadence_write_rpc
20260727101335  video_render_claim_rpc
20260728000335  authz_last_admin_delete_guard_v1
20260728021841  resolve_slot_assets_v1_3_broll_background
20260728021934  broll_consumption_v1_slice_b_promote_register
20260728024645  resolve_slot_assets_v1_4_broll_exclusive
20260729053829  cc0086_voice_config_write_rpc_v1
20260729143000  s9_layer1_capability_gate_fill_pending_slots
```
(26 listed — re-verify at lane start against a fresh `list_migrations` pull + fresh
`git log --all -S "<name>"` per entry; some may have landed locally between this brief and execution.)

**Out of scope:**
- Any DB write, `apply_migration` call, or DDL/DML execution of any kind. Nothing here changes live state.
- The much larger pre-2026-06-30 historical gap (raw diff found ~526 ledger versions with no
  timestamp-matching local file; a first pass suggests most of that is an early inconsistent
  `YYYYMMDD_name.sql` vs full-14-digit naming convention, not genuine drift, but this was NOT
  individually name-verified the way the 26 above were). That's a separate, much bigger, lower-priority
  archaeology project — flag it in the result doc as an open question, do not attempt it here.
- Deciding or changing the process that caused this (the `apply_migration` harness-denial workaround, or
  the `_harness/` gitignore rule from `2b5e44b`). Name it as a recommended follow-up in the result doc;
  it is a PK policy decision, not something this lane resolves.
- Any function/table whose CURRENT live definition has been further modified by a LATER, already-tracked
  migration (e.g. if a gap's function was superseded by a subsequent local file) — in that case the
  backfilled file must represent what THAT SPECIFIC migration actually changed at the time, not today's
  end state; if the two can't be disentangled confidently, stop and report rather than guess (see
  Forbidden actions).

## Allowed actions

- Read `_harness/**` (gitignored but present on disk) for each gap's likely original SQL — match by
  lane-name substring first, then by content (`grep` for the migration's ledger `name` or nearby table/
  function names inside harness `.sql` files).
- Where a harness match exists: verify it byte-reproduces the live object (e.g. `pg_get_functiondef` for
  a function, `information_schema`/`\d+` equivalent for a table) before using it as the backfilled file's
  content — a harness file could itself be a draft that diverged slightly from what was actually applied.
- Where no harness match exists: reconstruct the migration's content from live state via
  `pg_get_functiondef`, `information_schema.columns`, `pg_get_constraintdef`, etc. (read-only), and label
  it clearly in the file header as a **reconstructed snapshot** (current live state, not a guaranteed
  byte-exact replay of what was originally executed) — never presented as byte-exact when it isn't.
- Write one `.sql` file per gap into `supabase/migrations/`, named `<version>_<ledger_name>.sql` (exact
  version + name from the ledger, so `supabase migration list`/CLI tooling recognizes it as already
  applied and never tries to re-run it).
- Use an isolated worktree (branch-warden-checked) for the writes; local read-only DB queries via
  `db-read.py`/`execute_sql` (SELECT-only) to pull live definitions.
- Run `db-rls-auditor` to verify each backfilled file's content against live truth before the lane is
  considered done (byte-diff for harness-sourced files; confirm-matches-live for reconstructed ones).

## Forbidden actions

- No `apply_migration`, no `execute_sql` write/DML/DDL, no `ALTER`/`CREATE OR REPLACE`/`DROP` of any kind
  against the live database. This lane only adds files to git.
- No fabricating SQL for a gap where neither a harness match nor a confident live reconstruction is
  possible — report it as unresolved in the result doc instead of guessing.
- No touching the pre-2026-06-30 historical gap, no un-gitignoring `_harness/`, no changing the
  `apply_migration` harness-denial policy — all named PK decisions, out of scope here.
- No modifying any EXISTING migration file's content (identity is permanent per the standing house rule
  — a correction is a NEW file, never an edit to an old one, and this lane isn't correcting anything
  existing, only adding what's missing).

## Success criteria

- All 20 confirmed gaps (re-verified fresh at lane start, list may grow by a few if more landed since
  this brief) have a corresponding git-committed file in `supabase/migrations/`.
- For harness-sourced files: content matches the harness source AND independently verified against live
  DB state (function body / table shape) via `db-rls-auditor`.
- For reconstructed files: clearly labeled as reconstructed-from-live-state in the file header, and
  verified to match live state at write time.
- A fresh diff of the ledger (`list_migrations`) against local files, for versions ≥ `20260630000000`,
  shows zero remaining name-verified gaps (excluding any this lane explicitly reports as unresolved).
- `branch-warden` confirms the resulting commit(s) are clean (no unrelated files swept in — in particular
  the shared checkout's existing uncommitted `video-worker` changes must NOT be touched or committed).
- Result doc lists every gap with its resolution (harness-matched / reconstructed / unresolved) and cites
  the evidence for each.

## Stop condition

Report per the result template, listing every gap's resolution and any unresolved items with the reason.
Commit only the new migration files (plus the result doc) — commit message must not claim these were
applied by this lane (they were applied historically; this lane only backfills the record). **Do not
push without a separate explicit PK instruction**, per the standing push-gate rule. Then stop — this
brief does not authorize touching the pre-2026-06-30 gap or the process-fix follow-ups named above.

---

## Notes

- This is lower-risk than a typical DB lane (no live mutation), but treat file accuracy seriously: a
  wrong backfilled migration file is a NEW source of the exact misinformation this lane exists to fix.
  Prefer "unresolved, reported" over a low-confidence guess.
- Recommended follow-ups for a SEPARATE PK decision (name in the result doc, do not act on them here):
  (1) a process fix so any future `apply_migration`-denied session is required to still produce a
  committed file, immediately or as a same-day follow-up; (2) reconsidering whether `_harness/` should
  stay fully gitignored, or whether `.sql` artifacts specifically should be exempted; (3) whether the
  pre-2026-06-30 historical gap is worth a dedicated archaeology lane at all, given its age.
