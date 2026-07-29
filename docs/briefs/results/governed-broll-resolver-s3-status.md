# S3 Status — Type-aware resolver (`video_background`) — ❌ DISCARDED AS SUPERSEDED

> ## ⛔ SUPERSEDED 2026-07-28 — DO NOT APPLY, DO NOT ROLL BACK
>
> The problem this slice solved is **solved in production by a different mechanism**. Live
> `resolve_slot_assets` **v1.4** (`resolve_slot_assets_v1_4_broll_exclusive`, applied under v6.42)
> selects governed B-roll into a video Background using the **existing** `element_type='video'`
> discriminator — no new `field_kind`, no CHECK widen. Proven live end-to-end:
> `docs/briefs/results/governed-broll-consumption-v1-slice-b-result.md`.
>
> **Reconciliation verdict: DISCARD.** Nothing in this packet is worth folding forward; the live
> design is strictly less invasive and already proven. Evidence and residual gaps below.
>
> **Both SQL artifacts are now unsafe or dead:**
> - `s3_forward.sql` — **cannot apply.** Its in-transaction self-verify oracle spans every template ×
>   every client, which now includes the live B-roll template. Its forward body lacks v1.4's
>   `v_bg_is_video` logic, so that combo's output would change and the `RAISE` would abort the
>   transaction. Fail-safe, but permanently un-appliable as written.
> - `s3_rollback.sql` — **actively dangerous.** It restores the pre-v1.3 function body with **no
>   self-verify**, and its stated safe-fail precondition does not fire (it guards on
>   `field_kind='video_background'` rows, of which there are zero — the live path uses
>   `element_type`). Running it would silently revert v1.4 and break the proven B-roll path.
>   A `DO NOT RUN` banner has been prepended to the file.
>
> **The resume paths in §"Resume path" below are VOID.** Do not paste either file into the SQL editor.

**Date:** 2026-07-28 · **Lane:** Governed Resolver Selection of B-roll (Option A), slice S3 · **Tier:** T3
**State:** ❌ **DISCARDED — superseded by live resolver v1.4.** Never applied; prod was never touched by this lane.

## Reconciliation against live v1.4 (2026-07-28)

Verified against live DB truth, not docs (`pg_get_functiondef` + `pg_constraint` catalog reads):

| Concern | S3 packet (unapplied) | Live v1.4 (applied, proven) | Outcome |
|---|---|---|---|
| Discriminator | new `field_kind='video_background'` + CHECK widen | existing `field_kind='background' AND element_type='video'` | **v1.4 wins** — no vocabulary change, no DDL |
| CHECK constraint | widened to 9 values | **still the original 8** (verified live) | S3 part 1 never applied |
| Eligibility gates | is_active · approved · licence present/unexpired · `bucket='brand-assets'` · platform_scope · sfto ∈ {true,needs_scrim} | **identical** | parity — nothing lost |
| Seeded pick | FNV-1a | **identical FNV-1a** | parity |
| Shared-pool fallback | excluded for video by design | gated `AND NOT v_bg_is_video` | parity |
| Template | `ee2c13dc` (S1) | `46c5c4ac` → ICE row `dd5fd75e` | S-arc template **never registered in ICE** |

**S-arc live footprint: zero.** Template `ee2c13dc` has no ICE registration; no `video_background`
field row exists; the CHECK is unmodified. Discarding costs nothing already built.

### Residual gaps v1.4 does NOT cover (carries, not reasons to keep this packet)

1. **Multi-background-field ambiguity.** S3 fail-closed with `ambiguous_background_kind` when a template
   declared both kinds. v1.4's `v_bg_is_video` is a `bool_or`, so a template carrying *both* an image
   Background field and a video Background field would flip **all** Background resolution to
   `broll_background`, feeding a video URL to the image field. No live template does this (verified:
   one template has a video Background field, and it has only that one). Narrow, latent, worth a guard.
2. **Diagnostic granularity.** v1.4 returns the generic `no_governed_background`; S3 distinguished
   `no_governed_video_background`. Cosmetic — a fail-closed video slot is harder to triage.
3. **Scrim.** S3 suppressed `Scrim.opacity` for video backgrounds; v1.4 emits it whenever a `Scrim`
   element exists. Inert today (the footage template's scrim is baked, no `Scrim` field), but it means
   the suppression is incidental rather than designed.

---

## Historical record (superseded — retained for audit)

## Artifacts (all on disk, uncommitted)
- Forward: `_harness/cc_broll_resolver_20260728/s3_forward.sql` (frozen; combined pin hash `ff420dd1…`)
- Rollback: `_harness/cc_broll_resolver_20260728/s3_rollback.sql`
- Verify: `_harness/cc_broll_resolver_20260728/s3_verify.sql`
- Dry-run: `_harness/cc_broll_resolver_20260728/s3_dryrun.sql`
- Packet: `docs/briefs/governed-broll-resolver-s3-packet.md`
- Gate-1 brief (whole arc): `docs/briefs/governed-broll-resolver-selection-gate1-brief.md`

## Review chain — COMPLETE (all pinned to `ff420dd1…`)
- **db-rls-auditor** R1 PASS/clean · R2 PASS/clean (high conf). Rollback proven byte-identical to the (baseline) live function; forward = rollback + only `v_has_video_background`-gated additions; SECDEF/`search_path=''`/STABLE/ACL preserved; CHECK pure-widening; new branch fail-closed gates mirror the image path. One optional non-vacuity note (unaddressed — self-verify vacuously passes at 0 combos; not reachable, 208+ live combos).
- **apply-harness-auditor** R1 INCOMPLETE → all findings addressed → R2 PASS/clean, 0 findings (in-txn self-verify, named channel, all-client coverage, apply/rollback identity all confirmed).
- **external `ask_chatgpt_review`** R1 + R2 both `partial → PK escalation` — no concrete defect (the bridge auto-escalates every T3 DDL/DML by design). review_ids `63b85e0d`, `cbdcacb6`.

## Apply attempts (2026-07-28) — SELF-VERIFY WORKED, PROD UNTOUCHED
Two apply attempts via `mcp supabase execute_sql`. **Both aborted at the in-transaction self-verify** (`S3 self-verify FAILED — image-path output changed`, identical digests `pre=0e8e5bcc… post=d35fa174…`). The `RAISE` rolled back the whole transaction each time. **Post-checks confirm prod is untouched:** live `resolve_slot_assets` unchanged (no `video_background` branch), 0 `video_background` fields, CHECK still the original 8-value set, clip `42211c0f` still fenced (`approved=false`), `ee2c13dc` not registered.

## Root cause of the blocked apply (diagnosed)
- **NOT a bad artifact.** `s3_forward.sql` + its reviews are valid.
- **NOT a concurrent function change.** A parallel PK lane added a template (`46c5c4ac`, for the asset-gap lane) — an INSERT that does **not** alter `resolve_slot_assets`. The function is unchanged. (An earlier "resolver changed" reading was a false alarm: a body-hash compared against db-rls's `9064b0cd…` used a different substring-extraction than db-rls, so the mismatch was measurement noise.)
- **The actual blocker: no reliable write channel for the 470-line function.** The only DDL channel available to the orchestrator is `execute_sql` (inline SQL string). Hand-transcribing the 470-line `CREATE OR REPLACE FUNCTION` into it introduced a small, consistent error (same `d35fa174` digest twice). There is **no file-based apply path** from the orchestrator's tools: no `psql` binary on this box, and the only DB connection (`scripts/db-read.py`) is the read-only `ice_readonly` role. The self-verify correctly caught the transcription drift and protected prod.

## Resume path (either works; nothing else changed)
1. **PK pastes `s3_forward.sql`** into the Supabase SQL editor (exact file bytes, zero transcription; self-verifying → commits or aborts safely). Reliable; needs PK at a laptop.
2. **Meta-patch apply** (orchestrator, if PK authorizes): fetch the current live function source server-side, inject only the small `video_background` additions via targeted string-replace inside a `DO` block, and validate (self-verify + B1/B2/B3 probes + `fn_has_video_branch`) in a rolled-back dry-run before committing — sidesteps the 470-line transcription.

Then S3 → **S2** (promote clip) → **S4** (register `ee2c13dc` `video_background` field + PP assignment; decide c11bb8ab-vs-ee2c13dc precedence) → **S5** (live proof).

## Not committed / not pushed
Nothing from this arc is in git (working tree dirty; commit/push is a PK gate). All artifacts + this status are on local disk + memory `[[pp-video-broll-footage-decision]]`.
