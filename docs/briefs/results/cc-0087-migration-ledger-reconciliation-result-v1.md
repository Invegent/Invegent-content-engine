# Result cc-0087 — migration ledger reconciliation

**Brief:** `docs/briefs/cc-0087-migration-ledger-reconciliation-brief-v1.md`
**Status:** complete (pending final verification pass at time of writing — see §5)
**Type:** git-history backfill. No DB mutation. No live state changed by this lane.

---

## 1. What this closes

The `select_template` incident in the Creatomate registry-repair lane
(`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §0.3) surfaced that
`supabase/migrations/` is missing files for migrations Supabase's own ledger
(`supabase_migrations.schema_migrations`) records as applied. This lane backfills every confirmed gap
since 2026-06-30.

## 2. Re-verification at lane start

Re-ran `list_migrations` fresh — ledger unchanged from brief-drafting time (still ends at
`20260729143000`). Re-checked local file existence **both by exact version-prefix AND by name
substring** (the brief's own filtering method, since some historical files use an 8-digit-date naming
convention a naive prefix diff misreads as missing). This surfaced a correction to the brief's own
gap list:

- **6 of the brief's 26 raw candidates already had local files** — not missing, but **version-mismatched**:
  the ledger's recorded version differs from the local file's timestamp prefix (same descriptive name).
  `cc0063_brand_host_designation_v1`, `gcp_slice3_list_active_clients_add_slug`,
  `pb1_publish_cadence_write_rpc`, `video_render_claim_rpc`, `authz_last_admin_delete_guard_v1`,
  `cc0086_voice_config_write_rpc_v1`. **Left untouched** — renaming an existing tracked file's version
  changes its identity under the standing house rule and wasn't part of this brief's approved scope.
  Flagged in §6 for a separate PK decision.
- **`s9_layer1_capability_gate_fill_pending_slots`** already exists locally under the EXACT correct
  name+version — it's simply uncommitted (a `git status` untracked file from other in-progress session
  work), not a reconciliation-lane concern. Not touched.
- **19 confirmed true gaps** — zero local file under any name/version. All 19 backfilled below.

## 3. The 19 backfilled files

| Version | Name | Source |
|---|---|---|
| `20260630112110` | `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix` | `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` §D — transcribed, byte-diffed against source, exact match |
| `20260719010700` | `video_d6_lane2_select_template_client_scope_rung` | `_harness/video_d6_lane2_20260719/m1_select_template_client_scope_rung.sql` — direct copy |
| `20260719010800` | `video_d6_lane2_register_pp_video_short_stat_mapping` | `_harness/video_d6_lane2_20260719/m2_register_pp_video_short_stat_mapping.sql` — direct copy |
| `20260719160000` | `cc_0041_asset_gap_analysis_schema_v1` | `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — direct copy |
| `20260719170000` | `cc_0042_appetite_inventory_read_path_v1` | `docs/briefs/cc-0042-appetite-inventory-read-path-ddl-v1.sql` — direct copy |
| `20260719190000` | `cc_0042_appetite_inventory_read_path_v2_fix` | `docs/briefs/cc-0042-appetite-inventory-read-path-ddl-v2.sql` — direct copy |
| `20260719210000` | `cc0043_asset_gap_analyzer_writer_v1` | git branch `ice-wt-cc0043-writer` (commit `7c66f80`) — cherry-picked via `git show` |
| `20260723035423` | `cc_0049_activate_client_normalize_logo_extraction_method_v1` | git branch `origin/claude/dashboard-work-summary-h4no2f` (commit `0cb1ca6`) — cherry-picked via `git show` |
| `20260725223652` | `r3a_resolver_shadow_columns_and_resolve_final_format_v4` | `docs/briefs/artifacts/r3a-resolver-shadow-migration-v4.sql` — direct copy |
| `20260726071501` | `rescope_pp_youtube_thumbnail_backgrounds_pathb` | `docs/briefs/asset-intake-batch1-gap1-pathB-rescope-apply-packet-v1.md` §3 — transcribed, byte-diffed against source (1 cosmetic char fixed: an ASCII `->` typed for the source's `→` inside a comment), exact match after fix |
| `20260726232436` | `cc0083_add_persona_name_to_brand_stakeholder` | `docs/briefs/cc-0083-sliceA-persona-name-apply-packet-v1.md` §4 — transcribed, byte-diffed against source, exact match |
| `20260727005836` | `cc0083_activate_ndis_participant_lac_avatars` | `docs/briefs/cc-0083-sliceC-activate-avatars-apply-packet-v2.md` §4 (v2 supersedes v1 — closes an apply-harness-auditor finding) — transcribed, byte-diffed against source, exact match |
| `20260727012219` | `automated_image_intake_v1_slice1_rejected_fingerprint` | `_harness/img_intake_v1_20260727/slice1_rejected_fingerprint.sql` — direct copy |
| `20260727042653` | `automated_image_intake_v1_slice2_shortage_detector` | `_harness/img_intake_v1_20260727/slice2_shortage_detector.sql` — direct copy |
| `20260727080229` | `automated_image_intake_v1_slice3_filter_new_candidates` | `_harness/img_intake_v1_20260727/slice3_filter_new_candidates.sql` — direct copy |
| `20260727083508` | `pa1_client_schedule_cap_override_store` | git branch `posting-cap-p1` (commit `684e19e`, file `20260727140000_pa1_client_schedule_cap_override_store.sql` on that branch — different timestamp there too) — cherry-picked via `git show` |
| `20260728021841` | `resolve_slot_assets_v1_3_broll_background` | `_harness/cc_broll_consumption_sliceB_20260728/01_resolve_slot_assets_v1_3_broll_background.sql` — direct copy |
| `20260728021934` | `broll_consumption_v1_slice_b_promote_register` | `_harness/cc_broll_consumption_sliceB_20260728/02_promote_and_register_broll_slice_b.sql` — direct copy |
| `20260728024645` | `resolve_slot_assets_v1_4_broll_exclusive` | `_harness/cc_broll_consumption_sliceB_20260728/03_resolve_slot_assets_v1_4_broll_exclusive.sql` — direct copy |

Every file carries a standard reconciliation banner at the top naming its exact source and stating that
any "NOT APPLIED"/"PREPARED"/"DESIGN" framing surviving from the original packet content below the
banner is stale historical language — the migration is live.

**Every one of the 19 turned out to have a genuine, high-fidelity source** (a gitignored harness dir, an
already-reviewed apply-packet doc, or an already-committed-but-unmerged branch) — none required the
brief's fallback "reconstructed snapshot from live state" labeling. This is a materially better outcome
than the brief anticipated.

## 4. Known chains (not defects)

Several backfilled functions/tables were legitimately modified again by migrations that ARE already
tracked locally — this is expected, not a discrepancy:
- `cc_0042_appetite_inventory_read_path_v1`'s three functions were fully superseded same-day by v2
  (3 documented defects — `docs/briefs/results/cc-0042-appetite-inventory-read-path.md`).
- `resolve_shared_pool_assets`/`analyze_asset_gap` (from v2) were each further modified by
  `20260720090951`/`20260720160000`, then `20260721110000`.
- `run_asset_gap_analysis` (from cc0043) was modified twice more by `20260720190000`/`20260721110000`.
- `m.asset_gap_suggestion` (from cc0041) was additively ALTERed by `20260721100000`.

## 5. Verification

**db-rls-auditor, final pass** — read all 19 written files and independently verified each against live
DB truth (`pg_get_functiondef`, `information_schema`, `pg_constraint`, `pg_index`, grants, direct row
queries), not by trusting the files' own banners. **18 of 19 CONFIRMED outright** (7 byte-identical
against live state today; the rest legitimately superseded by already-tracked later migrations, each
chain traced and named — e.g. `20260702111455_tmr_registry_fresh_capture_generic_static_library_v1.sql`
explains #1's divergence via a documented full-registry reset; the cc-0044/cc-0045/cc-0046 chain explains
#5/#6's function divergence). **The 19th** (`20260728021934_broll_consumption_v1_slice_b_promote_register.sql`)
is itself confirmed as an accurate record of what applied on 2026-07-28 — the auditor's flag was about a
**separate, newer** live change layered on the same row since (§6).

**branch-warden** caught a live race mid-check: HEAD moved during verification (another session
committed+pushed twice — `b7f0658`/`854f5fc`, "B-roll Platform Suitability"/"B-roll platform_scope
Correction", topically unrelated to this lane) in this same shared, non-isolated worktree, and flagged
that the pre-existing uncommitted `video-worker` files (out of scope for this whole task per the original
Creatomate brief's boundary) now showed clean with no diff. Investigated directly: `git merge-base
--is-ancestor d5ddca1 HEAD` confirms that commit (which carries exactly those file changes) is an
ancestor of current HEAD, and the reflog shows a clean fast-forward/rebase chain with my own prior
commit (`531d155`) intact throughout — nothing was discarded, the content is preserved in history.
Independently verified benign and unrelated per the standing Convention-2 exception. Re-confirmed
immediately before commit: all 19 files present, zero collisions with `HEAD`-tracked
`supabase/migrations/` filenames, `video-worker/` clean.

**Verdict: proceed.** 19/19 files accurate; commit boundary safe.

## 6. Explicitly out of scope (named, not actioned)

- **A newly-surfaced 20th gap, found DURING this lane's verification pass, NOT part of the approved 19:**
  template `46c5c4ac`'s `fit_status` (now `strong_candidate`, was `candidate`) and 2 new
  `platform_suitability` rows (facebook/instagram, `candidate`) exist live, timestamped
  **2026-07-29T05:30:02Z (today)**, `fit_reason` reading *"B-roll PARITY Activation v1 (PK 2026-07-29):
  promoted to PP default for video_short_stat... Supersedes the v6.48 activation, rolled back for the
  720p/8s output-spec regression."* Grepped all of `supabase/migrations/` for `46c5c4ac` — the file this
  lane just backfilled (#18 above) is the only hit; nothing explains this later change. Confirmed the 3
  concurrent commits that landed on `main` during this lane's verification pass (`b7f0658`/`c8e4fad`/
  `854f5fc`) touched zero files under `supabase/migrations/` — they're docs-only register pointers, so
  this gap is still open, not accidentally closed by that concurrent work. **Same failure class as
  everything else in this lane, but discovered too late to fold into the approved 19-item scope safely**
  — flagging for a fresh PK decision (either a follow-up cc-0087-style backfill, or fold into whatever
  packet produced today's B-roll Parity Activation DB write, per the memory note
  `broll-production-activation-live.md`, which as of its last write says this "NOT applied/deployed" —
  live DB now shows it evidently *was*, worth reconciling that doc too).
- **6 version-mismatched files** (§2) — same descriptive name as a ledger entry, different timestamp
  prefix. Needs a PK decision: rename (git mv, no content change) to the ledger's true version, or leave
  as-is with the mismatch documented. Not touched by this lane.
- **The pre-2026-06-30 historical gap** (~526 raw ledger/local mismatches, mostly early
  inconsistent-naming-convention noise per a first pass, not individually name-verified) — a separate,
  much larger, lower-priority archaeology project.
- **Process fix** for the `apply_migration`-denial → gitignored-harness-only pattern that caused this —
  a PK policy decision.

## 7. Non-claims

- This lane did not verify or change anything about the objects' CURRENT correctness — only that the
  backfilled file accurately represents what was historically applied under that migration name/version.
- Commit only; **not pushed** — per the brief's stop condition, push requires a separate explicit PK
  instruction.
