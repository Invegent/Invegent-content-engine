# Brief cc-0038 — governed PP video fail-closed proof on a real draft (DoD B4)

**Created:** 2026-07-10 Sydney
**Author:** chat (orchestrator draft — Gate 1 pending PK approval)
**Executor:** Claude Code (orchestrator) + PK (production-write authorisation gate)
**Status:** issued — Gate 1 OPENED by PK 2026-07-16; **HELD at the production-write gate** (PK directive: stop at Gate 1 if the proof needs a production mutation — it does). Refreshed read-only 2026-07-16.
**Tier:** T3 (production write on a live published draft) · explicit PK gate · **Lane:** SAFETY_GATE
**Result file:** `docs/briefs/results/cc-0038-governed-pp-video-fail-closed-b4-proof.md` (on completion)

---

## Task

Prove the **fail-closed** behaviour of the governed PP `video_short_stat` path **on a real production draft** (DoD Level B, criterion **B4**): a governed render whose stat fields violate the hard gate must **throw → the draft goes `video_status='failed'` + a `post_render_log` row is written, with NO legacy fallback and nothing published**, then be fully restored. This is the one criterion a *successful* render (cc-0035) structurally cannot exercise. Mirrors cc-0035 exactly in shape and safety — a different single field, the same publish-safe draft class, the same four guards, the same rollback. **No deploy, no migration, no code change.**

## Source context

- `docs/governance/pp-tmr-definition-of-done-v1.md` (Level B) — B4 = "fail-closed exercised on a **real** draft (governed throw → `video_status='failed'` + render-log row, no legacy fallback)". Today B4 is FALSE (zero PP `video_short_stat` rows at `video_status='failed'`).
- `docs/briefs/cc-0035-governed-pp-video-live-draft-render-proof.md` + result — the precedent (D1.0→D1.5 shape, publish-safety, cron jobid 33, rollback). This lane reuses it.
- `supabase/functions/video-worker/b1_video_stat.ts` — `assertStatFieldsWithinGate` hard-gates the 4 fields fail-LOUD (throws): `stat_value ≤12 · stat_label ≤48 · context_line ≤160 · **cta_text ≤90**`. Called first inside `buildGovernedVideoStatPlan`.
- `supabase/functions/video-worker/index.ts` — governed branch is an early-return fork (`isB1GovernedVideoStat ∧ enabled → renderGovernedVideoStat → return`). A throw propagates to the **per-draft outer catch** → `video_status='failed'` + a `post_render_log` row (index.ts:198, :24) — it does **not** fall through to the legacy `isStat` block. That "no legacy fallback" is exactly what B4 proves.
- **Deployed = v3.7.0** (Music Lane): `select_music('format','video_short_stat')` now returns **0 rows** (`require_content_id_safe`; all 9 tracks `content_id_safe=false`) → the governed render currently binds a **silent bed**. **B4 is bed-independent** — the throw is on the field gate, which fires before/regardless of the bed — so v3.7.0 does not affect this proof.

## Elected draft (publish-safe) + captured rollback tuple

Reuse the cc-0035 draft — already validated publish-safe and fully restored:
- **`post_draft_id = 1f5633de-6b83-4440-90ab-6673b0b8fbaa`** · client `4036a6b5-…`
- `video_status='published'` · `video_url = …/4036a6b5-…/1f5633de-…_stat.mp4` · `approval_status='approved'` · `draft_format→youtube_video_id='tZEVJW7fnyU'`
- **`cta_text` = "Are you watching the Perth market? Drop your thoughts below 👇" (61 chars — VALID)** ← the rollback value
- render-log rows for this draft = **2** (legacy 2026-06-24 + governed `8c41689a`) — baseline for the failure-row assertion.

**Why publish-safe:** `draft_format→youtube_video_id` is non-null, so the youtube-publisher's `…IS NULL` predicate structurally cannot re-select it; a `published` `post_publish` row already exists. Four no-publish guards (cc-0035, db-rls-verified) hold. The trip fails the render *before* any output, so no new artifact and nothing published.

## The gate-trip (which field, why)

Set **`cta_text` to a ≥91-char value** (over the 90 gate). Chosen because **`cta_text` is NOT spoken** — `composeGovernedVideoNarration` uses only stat_label/stat_value/context_line — so the VO generation that precedes the gate stays normal, and the over-length value is a minimal, obviously-reversible content change. Proposed injection: the original + a clearly-marked ` [cc-0038 B4 gate-trip padding to exceed the 90-char CtaText hard gate]` → ~120 chars.

> Side-effect note (harmless, record it): `renderGovernedVideoStat` generates+uploads the VO *before* `buildGovernedVideoStatPlan` throws, so one orphan `…_voice.mp3` may land in `post-videos/`. It is inert (never published, not the render). Optional post-run cleanup; not required for the proof.

## Scope

**In scope:** one production write to `1f5633de` (`video_status → 'pending'` + `cta_text → over-length`, CAS-guarded, rowcount=1); wait for cron jobid 33; assert the fail-closed signature; assert publish-neutrality; rollback (restore `video_status`, `video_url`, `cta_text`). Read-only pre-checks + evidence capture.

**Out of scope / FORBIDDEN:** invoking the worker manually (wait for cron 33); any deploy / migration / code change; any `enabled` change; publishing; touching `approval_status` or `draft_format→youtube_video_id`; touching any other draft or the music library; amending the DoD (record-reconciliation owns it). No `git add -A`; explicit pathspecs only if any commit is later gated.

## Ordered steps (all PREPARED; each production write needs the PK gate)

**B4.0 — pre-check STOPs (run first; abort on any mismatch):** governance `enabled=true` for `video_short_stat`; draft `1f5633de` reads exactly the captured tuple above (`video_status='published'`, `video_url`=`_stat.mp4`, `approval_status='approved'`, `youtube_video_id='tZEVJW7fnyU'`, `cta_text`=the 61-char value, render-log rows=2); `post_publish`=1/`tZEVJW7fnyU`, `queue`=1/`queued`; packet hash unchanged; parity/origin as expected; no sibling session touching `m.post_draft` for this id.

**B4.1 — the write (ONE row, CAS, assert rowcount=1):**
```sql
UPDATE m.post_draft
   SET video_status = 'pending',
       draft_format = jsonb_set(draft_format, '{video_script,cta_text}', to_jsonb(<ORIGINAL_CTA || cc-0038 padding>::text)),
       updated_at = now()
 WHERE post_draft_id = '1f5633de-6b83-4440-90ab-6673b0b8fbaa'
   AND video_status  = 'published';   -- CAS: 0 rows => state moved => STOP
```
Assert `rowcount = 1`.

**B4.2 — wait + observe (cron jobid 33, `*/30`; do NOT invoke the worker):** poll `m.post_render_log` for this draft and the draft state. **Fail-closed success signature:** draft `video_status='failed'`; render-log rows for the draft = **3** (one NEW failure row from the outer catch; note it will NOT carry `variant_key='stat-reveal-9x16-video-v2'` because the plan threw before the templateSpec was built — assert on `status`/`error_message` reflecting the gate, not the governed variant); **no** new `…_stat_governed.mp4`; `video_status` is `'failed'` NOT `'generated'` (proves no legacy fallback). Do NOT assert on a bare count delta of the whole table.

**B4.3 — publish-neutrality (must hold):** `post_publish`=1/`tZEVJW7fnyU`, `queue`=1/`queued`, unchanged. Any change ⇒ STOP + immediate rollback.

**B4.4 — rollback (after the signature is captured, or immediately on any STOP):**
```sql
UPDATE m.post_draft
   SET video_status = 'published',
       video_url    = 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/post-videos/4036a6b5-b4a3-406e-998d-c2fe14a8bbdd/1f5633de-6b83-4440-90ab-6673b0b8fbaa_stat.mp4',
       draft_format = jsonb_set(draft_format, '{video_script,cta_text}', to_jsonb('Are you watching the Perth market? Drop your thoughts below 👇'::text)),
       updated_at   = now()
 WHERE post_draft_id = '1f5633de-6b83-4440-90ab-6673b0b8fbaa';
```
Assert `rowcount=1`. Re-verify the full tuple == B4.0. `approval_status` and `youtube_video_id` never written by this lane. (Rollback validated zero-persist before apply, per the cc-0035 method.)

## Success criteria

- Draft ends `video_status='failed'` with exactly ONE new `post_render_log` row for it (throw, no legacy fallback), **nothing published**, no new governed mp4 — the B4 fail-closed signature.
- Publish-neutrality held throughout; rollback restored the exact B4.0 tuple (zero net change); `approval_status`/`youtube_video_id` untouched.

## Stop condition

Report the fail-closed signature + publish-neutrality + rollback verification, then stop. **B4 has no PK visual/aural verdict — the DB-state signature IS the proof** (unlike cc-0035). The production write itself is the PK gate.

## Gate-1 refresh — read-only verification 2026-07-16 (all GREEN)

- **governance** `enabled=true` for `video_short_stat` ✓
- **elected draft `1f5633de`** still in the exact captured baseline (untouched since cc-0035 rollback, `updated_at` 2026-07-10T07:43Z): `video_status='published'` · `approval_status='approved'` · `video_url`→`…_stat.mp4` · `cta_text`="Are you watching the Perth market? Drop your thoughts below 👇" (**61 chars**, valid) · `youtube_video_id='tZEVJW7fnyU'` ✓
- **render-log rows for the draft = 2** (both `succeeded`) — baseline for the +1 failure-row assertion ✓
- **gate** `B1_VIDEO_CTA_TEXT_MAX_CHARS = 90`, `assertStatFieldsWithinGate` throws first inside `buildGovernedVideoStatPlan` (deployed v3.7.0, source line 181); comment confirms the throw "hits the EXISTING per-draft catch → video_status='failed'; there is NO governed fallback" ✓
- **cron jobid 33** active, schedule `*/30 * * * *` (the renderer) ✓

## Notes — sequencing (UPDATED 2026-07-16)

**A B4 PASS NOW CLOSES DoD Level B.** The prior note (B3 regressed FALSE) is SUPERSEDED — **B3 was restored TRUE 2026-07-16 via lane cc-0039** (`content_id_safe`→true for Drifting Piano; `select_music('format','video_short_stat')`=1). So Level B is now **B1 PASS · B2 PASS · B3 PASS · B4 FALSE** — **B4 is the last open criterion**. B4 remains bed-independent: the gate throws in `buildGovernedVideoStatPlan` regardless of whether the bed resolves to Drifting Piano or silent, so B3's restoration does not change the fail-closed outcome (it only means a bed URL is resolved just before the throw — no artifact). This brief prepares B4; the production write is the PK gate.
