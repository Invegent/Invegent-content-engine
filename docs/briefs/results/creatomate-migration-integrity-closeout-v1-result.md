CLAIMED · creatomate-migration-integrity-closeout-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · docs-only lane · 2026-07-29

# Result — Creatomate Global: Current Migration Integrity Closeout v1

**Date:** 2026-07-29 Sydney · **Lane classification:** SAFETY_GATE (docs-only) · **Tier: T1**
(git/file writes only — no DB mutation, no template activation, no selector/worker change, no
replay of already-applied SQL).
**Type:** git-history reconciliation, continuing `docs/briefs/cc-0087-migration-ledger-reconciliation-brief-v1.md`
(§6 "explicitly out of scope" carries #1 and #2).

---

## 1. What this closes

`cc-0087` (2026-07-29, commit `8fbba80`) backfilled 19 confirmed git↔ledger gaps and explicitly
flagged two carries as out of scope: (1) a 20th gap, template `46c5c4ac`'s B-roll activation, found
mid-lane but too late to fold in safely; (2) six migrations whose repo filename timestamp differs
from the Supabase ledger's recorded version. This lane closes both, plus two further B-roll DML
changes (`platform_scope` correction, platform-suitability fb/ig insert) that landed on top of the
20th gap in the hours after `cc-0087` closed — all three are part of the same current-era B-roll
activation arc and none had a git-tracked migration file.

**No live DB mutation.** Every change recorded here was already live before this lane. This lane
only makes git match reality (Scope A) and decides, per-file with evidence, how to handle the six
timestamp mismatches (Scope B).

## 2. Scope A — B-roll `46c5c4ac` activation reconciliation

Three separate, already-applied production DML changes around provider template `46c5c4ac` /
registry template `dd5fd75e` had **zero** corresponding file anywhere in `supabase/migrations/`
(confirmed by grep for `46c5c4ac`, and by table/column name, across the full tracked history):

| # | Change | New migration file | Version chosen | Grounding |
|---|---|---|---|---|
| 1 | Fit-status repoint: `dd5fd75e` → `strong_candidate`, both incumbents (`a3d8472d`, `4cd2c9e2`) → `candidate` demoted, on `c.creative_template_variant_candidate` (3 rows, DML only) | `20260729053002_broll_parity_activation_v1_video_short_stat_repoint.sql` | `20260729053002` | Live `updated_at`/`reviewed_at` on all 3 rows, confirmed by db-rls-auditor this lane: `2026-07-29 05:30:02.033359+00` |
| 2 | `platform_scope` correction: `{youtube}` → `{facebook,instagram,youtube}` on both `usage='broll_background'` rows, `c.client_brand_asset` (2 rows, DML only) | `20260729064935_broll_platform_scope_correction_v1.sql` | `20260729064935` | No live timestamp exists for this table's writes (confirmed no `updated_at` trigger — both rows byte-unchanged across the committed UPDATE). Version is a **documented proxy**: UTC commit time of `b7f0658` ("v6.59 — APPLIED"), which correctly sorts between #1 and #3 |
| 3 | Platform suitability insert: 2 rows (`facebook`/`instagram`, `feed`, `candidate`) into `c.creative_template_platform_suitability` for `dd5fd75e` (DML only) | `20260729071004_broll_suitability_fb_ig_v1.sql` | `20260729071004` | Live `created_at`/`updated_at` on both inserted rows, confirmed by db-rls-auditor this lane: `2026-07-29 07:10:04.120513+00` |

Each file is a **byte-exact copy** of its already-committed, already-reviewed source
(`docs/briefs/artifacts/broll-{parity-activation,platform-scope-correction,suitability-fb-ig}-v1-forward.sql`
— all three git-tracked since their own apply-packet commits), with a reconciliation banner added
above the original content stating: this is a record of an already-applied change, not executable
greenfield DDL; the exact source; the version-choice rationale; and an explicit "replay warning" that
each file's own G0-Gn guards will correctly abort a re-run against current live state (the pre-image
each guard checks for no longer exists), so no accidental double-apply is possible even if migration
tooling ever executed these files. **No `.sql` body text was altered below the banner.**

None of the three has a `supabase_migrations.schema_migrations` ledger row — all three were applied
via a direct `execute_sql` call at a PK gate, not `apply_migration` (which mints its own ledger
version). Their chosen versions are reconciliation identities, not re-stated ledger values — unlike
Scope B, where a real ledger row exists for every item.

**Independent live re-verification (db-rls-auditor, this lane, 2026-07-29):** all three post-states
confirmed to match the migration files' post-state exactly — the `video_short_stat` variant-candidate
projection (3/3 rows), both `client_brand_asset.platform_scope` arrays, and both new suitability
rows. A full-table sanity scan of `c.creative_template_variant_candidate` (20 rows, 5 `format_key`
values) found no unexpected 4th `video_short_stat` row and no other `format_key` disturbed.

## 3. Scope B — six ledger/filename version mismatches

`list_migrations` re-pulled fresh this lane. For each mismatch, db-rls-auditor independently
verified the live object definition against the repo file's content, and I (orchestrator) searched
all git-tracked docs/code/SQL for citations of the exact current filename before deciding
rename vs. leave-in-place — per the standing rule "do not rename blindly where another migration
depends on the existing filename or ordering."

| Ledger version | Logical name | Repository file (before this lane) | Content parity | Repair decision |
|---|---|---|---|---|
| `20260724043508` | `cc0063_brand_host_designation_v1` | `20260724120000_cc0063_brand_host_designation_v1.sql` | **Confirmed live** — `c.brand_avatar.is_default_host=true` on both designated rows, matches file exactly. File's own banner ("⛔ DESIGN — NOT APPLIED") is **stale** | **Documentation-only mapping** (this table). 6 git-tracked docs (3 cc-0063 briefs/packets, 3 recording-lane result docs) cite this exact filename; a rename would orphan every citation and there is no ordering conflict to force one. Stale-banner correction is a separate, smaller PK-authorized edit, not done here (would touch an existing tracked file's bytes) |
| `20260726072610` | `gcp_slice3_list_active_clients_add_slug` | `NOT_APPLIED_gcp_slice3_list_active_clients_add_slug_v1.sql` (+ paired `ROLLBACK_...`) | **Confirmed live** — `pg_get_functiondef(public.list_active_clients())` returns the `slug` key exactly as the file defines it | **Rename** (done this lane). This file was **never git-tracked on any branch** (`git log --all` — zero hits) and had **zero citations** anywhere in tracked docs/code. Its own header explicitly anticipated "the apply lane renames it to a real timestamped identity at the PK apply gate" — that rename never happened. Renamed to `20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql` + paired rollback to `ROLLBACK_20260726072610_...`; stale "NOT_APPLIED" banner replaced with a reconciliation banner (safe here — the file was never a tracked identity to begin with, so this is a first-time commit, not an edit to existing history) |
| `20260727090955` | `pb1_publish_cadence_write_rpc` | `20260727150000_pb1_publish_cadence_write_rpc.sql` | **Confirmed live** — both RPCs (`get_publish_cadence`, `save_publish_cadence`) and `c.publish_cadence_change_log` exist exactly as defined | **Documentation-only mapping** (this table). Cited by `docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md` ("Pattern cloned from: 20260727150000_pb1_publish_cadence_write_rpc.sql") and its own apply-packet artifacts |
| `20260727101335` | `video_render_claim_rpc` | `20260727120000_video_render_claim_rpc.sql` | **Confirmed live** — `public.claim_pending_video_drafts(int)` matches exactly | **Documentation-only mapping** (this table). Cited by 2 result docs **and by a live source-code comment in `supabase/functions/video-worker/index.ts`** — renaming would break a production code citation, the clearest case in this set for leaving the filename untouched |
| `20260728000335` | `authz_last_admin_delete_guard_v1` | `20260728090000_authz_last_admin_delete_guard_v1.sql` | **Confirmed live** — `authz.prevent_last_admin_delete()` + `trg_prevent_last_admin_delete` trigger both exist and match | **Documentation-only mapping** (this table). This file already self-documents its true ledger version internally ("APPLIED live 2026-07-28 via apply_migration → ledger version 20260728000335") — it is already effectively self-reconciled; this table formalizes that into the authoritative cross-reference. Also has a paired, identically-timestamp-drifted rollback file (`20260728090001_..._rollback_v1.sql`) whose own identity would need to move in lockstep — added reason to prefer leaving in place |
| `20260729053829` | `cc0086_voice_config_write_rpc_v1` | `20260729150000_cc0086_voice_config_write_rpc_v1.sql` | **Confirmed live** — both RPCs (`get_voice_config`, `save_voice_config`) and `c.client_voice_config_change_log` (RLS ENABLE+FORCE) exist exactly as defined | **Documentation-only mapping** (this table). Cited by 3 git-tracked docs (its own apply packet, its own result doc, a dashboard gate-1 brief) **and by the very next migration file**, `20260729160000_creative_template_portfolio_read_rpc_v1.sql` — the highest citation count of the six, ruling out a rename outright |

**Repair-decision summary:** 5 of 6 → **documentation-only mapping** (this table is the record;
no files touched); 1 of 6 (`gcp_slice3`) → **rename**, executed this lane. No migration in this set
reuses a name with different SQL (the standing "migration name = permanent identity" invariant is
intact for all six) — every mismatch is a pure timestamp-prefix drift, not a content violation.

**Why rename only one:** the deciding factor was **evidence of actual citations**, not a hypothetical
same-day-ordering risk (same-day ordering was checked for all six and found safe in isolation — no
intervening migration on the same calendar day depends on any of these six objects). Real citations
in committed docs, briefs, and — in two cases — production **code comments** and an **adjacent
migration file**, are a stronger and more concrete reason to leave a filename in place than an
ordering analysis that found no conflict. `gcp_slice3` is the one case with zero such citations and
an explicit self-declared intent to be renamed, which is why it alone was renamed.

## 4. Verification

- **db-rls-auditor** (this lane, live read-only, project `mbkmaxqhsohbtwsqolns`): independently
  re-verified all three Scope A DML changes and all six Scope B object definitions against live
  state — zero discrepancies from what the reconciliation files/mapping table claim. Also ran the
  standing grant/RLS sweep: zero anon/authenticated table exposure on any touched table; the six new
  functions from Scope B are all `service_role`-only EXECUTE. Surfaced (not acted on, out of scope):
  five tables (`c.creative_template_variant_candidate`, `c.creative_template_platform_suitability`,
  `c.client_voice_config`, `c.client_voice_config_change_log`, `c.publish_cadence_change_log`) carry
  RLS enabled with zero policies — currently non-exploitable (no anon/authenticated grants), a latent
  gap worth a future policy pass, not a defect of this lane.
- **branch-warden**: run immediately before commit (§5).
- **No external review** run for this lane — per CLAUDE.md, external review is required for
  production DML/DDL, EF deploy, or config changes affecting clients. This lane executes none of
  those (git-file writes only, mirroring the `cc-0087` precedent, which also ran without external
  review for the same reason).

## 5. Non-claims

- This lane did not verify or change anything about the CURRENT correctness of any object — only
  that each reconciliation file/mapping-table row accurately represents an already-applied change.
- No `supabase_migrations.schema_migrations` row was inserted, altered, or read-modified for the
  three Scope A files — they intentionally carry no ledger row (see §2).
- The stale "NOT APPLIED"/"DESIGN" banner inside `20260724120000_cc0063_brand_host_designation_v1.sql`
  was **not corrected** in this lane (documentation-only repair decision; correcting it would edit an
  existing tracked file's bytes, which is a separate, smaller PK-authorized action, not bundled here).
- No unrelated registry status changed. No template activation, selector change, or worker change.
  No pre-2026-06-30 archaeology (the ~526-item historical gap from `cc-0087` §6 remains untouched and
  out of scope).
- Commit and push per this task's own explicit completion instruction (Convention 2 — a named,
  bounded sequence: verify → decide → commit → push → register pointer).

## 6. Files changed

**New (Scope A, git-history reconciliation, no DB effect):**
- `supabase/migrations/20260729053002_broll_parity_activation_v1_video_short_stat_repoint.sql`
- `supabase/migrations/20260729064935_broll_platform_scope_correction_v1.sql`
- `supabase/migrations/20260729071004_broll_suitability_fb_ig_v1.sql`

**New (Scope B, the one rename, executed as delete-untracked + add-correctly-named — the old files
were never git-tracked, so this is a first commit, not a history rewrite):**
- `supabase/migrations/20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql`
- `supabase/migrations/ROLLBACK_20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql`

**Removed (local working-tree only, never git-tracked — not a git deletion):**
- `supabase/migrations/NOT_APPLIED_gcp_slice3_list_active_clients_add_slug_v1.sql`
- `supabase/migrations/ROLLBACK_gcp_slice3_list_active_clients_add_slug_v1.sql`

**Untouched (Scope B, 5 of 6 — documentation-only mapping, this document is the record):**
- `supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql`
- `supabase/migrations/20260727150000_pb1_publish_cadence_write_rpc.sql`
- `supabase/migrations/20260727120000_video_render_claim_rpc.sql`
- `supabase/migrations/20260728090000_authz_last_admin_delete_guard_v1.sql`
- `supabase/migrations/20260729150000_cc0086_voice_config_write_rpc_v1.sql`

Register pointers: `docs/00_sync_state.md`, `docs/00_action_list.md` (v6.62, Convention 1).

## 7. Stop condition

**Met.** Both scopes closed with evidence. Push happens per this task's own explicit instruction.
Next queued Creatomate Global outcome: **Static Template Graduation Batch 1** (multiple visually
distinct image-quote layouts into the production portfolio) — not started by this lane.
