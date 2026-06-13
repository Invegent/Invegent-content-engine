# T0 — Content Studio Single Post: governed ICE path (D-01 review packet)

**Brief ID:** `t0-content-studio-governed-path`
**Class:** `sql_migration + ef_deploy + dashboard_deploy` (three coordinated pieces, one decision)
**Status:** IMPLEMENTED ON BRANCHES + LOCALLY VALIDATED — **NOT MERGED, NOT DEPLOYED.**
**Remaining gates (in order):** D-01 `ask_chatgpt_review` → PK exact approval phrase → merge → `apply_migration` → ai-worker CLI deploy → dashboard merge + Vercel deploy → post-deploy verification (Cases A–D live).
**Scope:** T0 ONLY — governance repair. No T1 creative-intent layer, no T2 asset QA, no content-package abstraction, no sibling grouping, no campaign abstraction, no series work.

---

## 1. Architecture summary

**Before (governance bypass):**
```
Content Studio → direct AI call (preview route)
              → public.manual_post_insert        ← operator text lands directly in m.post_draft
                  destination='draft' → approval_status='needs_review'
                  destination='queue' → approval_status='approved' + m.post_publish_queue row   ← FULL BYPASS
```
No Advisor, no compliance, no approval controls, no render eligibility — and queue-save skipped review entirely. `manual_post_insert` is EXECUTE-granted to `anon`/`authenticated` (pre-existing exposure).

**After (T0 target, implemented):**
```
Content Studio → public.create_manual_slot (SECURITY DEFINER, service_role only)
              → m.slot (source_kind='manual', slot-carried source_material, created_by)
              → m.fill_pending_slots (manual branch — NO canonical pool)
              → ai-worker slot_fill_synthesis_v1 (synthesis_mode='manual')
              → Advisor (sees explicit operator format preference; retains authority)
              → compliance (HARD_BLOCK → draft dead — gate, not log)
              → auto-approver / human review → render eligibility → queue → publish
```
Manual content enters ICE **as intent** (the operator brief), not as a finished draft. From `pending_fill` onward a manual slot is governance-identical to an automated slot. The Studio's preview (direct AI call) is retained as a **non-persisting preview aid only** — the published artifact is produced by the pipeline.

**Non-negotiable rules — disposition:**
1. Intent not draft ✓ (brief on `m.slot.source_material`). 2. Same Advisor/compliance/approval/render/publish controls ✓ (same skeleton-draft + `slot_fill_synthesis_v1` contract). 3. Queue-save bypass removed ✓ (single governed submit; route no longer reads `destination`; bypass RPC deprecated + revoked from anon/authenticated). 4. Compliance stays a gate ✓ (unchanged ai-worker HARD_BLOCK → `approval_status='dead'`). 5. Format = preference only ✓ (`format_preference_explicit` surfaced to Advisor via the existing preference-bias mechanism; Advisor retains authority; the established narrow A2 avatar override applies unchanged). 6. Platform policy-gated ✓ (`m.is_publish_eligible` — the same cc-0019 gate as automated fill — enforced at slot creation AND again at fill). 7. No canonical pool for operator briefs ✓ (manual fill branch never touches `m.signal_pool`/dedup/evergreen). 8. No creative-intent abstraction ✓ (two columns on `m.slot`; no new tables). 9. No T2 work ✓.

## 2. Files changed

**`Invegent-content-engine` branch `feat/t0-manual-slot-governed-studio`:**
- `supabase/migrations/20260613010000_t0_manual_slot_governed_studio.sql` (NEW)
- `supabase/functions/ai-worker/index.ts` (v2.13.0 → v2.14.0; +40/−2 lines; `deno check` pass)
- `docs/briefs/t0-content-studio-governed-path.md` (this packet)

**`invegent-dashboard` branch `feat/t0-studio-governed-save`:**
- `app/api/post-studio/save/route.ts` (re-pointed `manual_post_insert` → `create_manual_slot`; submits brief + format preference; `destination` no longer read)
- `app/(dashboard)/content-studio/components/SinglePost/PostStudioForm.tsx` (single governed "Submit to Pipeline" action; brief is what's submitted; governance note added)
- `components/platform-preview-card.tsx` (optional `sendLabel`/`sentLabel` props, buttons render only when their handler is passed — defaults preserve the other consumer; `tsc --noEmit` exit 0)

## 3. Migration summary (`20260613010000_t0_manual_slot_governed_studio.sql`)

1. **`m.slot`** + `source_material text`, + `created_by text` (nullable; commented). No constraint change — `source_kind` has no CHECK; production values today: `scheduled` 633, `breaking` 51; `manual` is additive.
2. **`public.create_manual_slot`** (NEW, SECURITY DEFINER, pinned `search_path`, **service_role-only** EXECUTE — anon/authenticated/PUBLIC revoked per the cc-0020 lesson). Validations return clean `{ok:false, error}` jsonb and create nothing.
3. **`m.fill_pending_slots`** — CREATE OR REPLACE with the **T0 MANUAL BRANCH** inserted immediately after the cc-0019 gate. **Transcription fidelity proven:** stripping the manual block from the migration's function reproduces the deployed definition **byte-identically — md5 `0e2ca3baca4b54a012ee7bf2d0734d92` on both sides** (prod `pg_get_functiondef` vs stripped local, 2026-06-13). Scheduled/breaking behaviour is untouched by construction.
4. **`public.manual_post_insert`** — DEPRECATED comment + EXECUTE revoked from `PUBLIC/anon/authenticated` (service_role retains — rollback path). Function NOT removed.

## 4. RPC summary — `public.create_manual_slot(p_client_id uuid, p_platform text, p_brief text, p_format_preference text DEFAULT NULL, p_scheduled_for timestamptz DEFAULT NULL, p_created_by text DEFAULT 'content-studio') RETURNS jsonb`

| Check (in order) | Rejection (`{ok:false, error:…}`, nothing created) |
|---|---|
| brief ≥ 20 chars of intent | `brief_too_short` |
| `m.is_publish_eligible(client, platform)` — same cc-0019 policy gate as automated fill (covers unknown client, inactive client, missing/disabled/paused profile) | `platform_not_eligible` |
| format preference (if given): active row in `t."5.3_content_format"` | `format_not_in_taxonomy` |
| format preference: `platform_support->>platform = true` | `format_not_supported_on_platform` |
| `p_scheduled_for` not in the past | `scheduled_for_in_past` |

Success: inserts `m.slot` with `source_kind='manual'`, `status='pending_fill'`, `fill_window_opens_at=now()` (immediately fillable), `scheduled_publish_at=COALESCE(p_scheduled_for, now()+1h)`, `format_preference=[pref]` or `[]`, `source_material=brief`, `created_by` attribution; returns `{ok:true, slot_id, status:'pending_fill', …}`.

**Fill manual branch:** re-checks source material (≥20 chars; else slot `failed:manual_source_material_missing`, no ai_job); records `slot_fill_attempt` (`pool_snapshot {manual:true,…}`); creates the standard skeleton draft (`approval_status='draft'`, same ON CONFLICT shape) + `slot_fill_synthesis_v1` ai_job with `synthesis_mode='manual'`, `source_material`, `created_by`, `format`, `format_preference_explicit`; slot → `fill_in_progress`. Pool/dedup/evergreen/pool-health: never touched.

**ai-worker v2.14.0:** `synthesis_mode==='manual'` maps the brief onto the existing `rewrite_v1` path (`digest_item.body_text = brief`) — identical Advisor + compliance + approval chain; explicit operator preference (only when `format_preference_explicit===true`) is passed to `callFormatAdvisor` as the preferred format via the existing bias-instruction mechanism. Scheduled/breaking jobs are unchanged (their fill-time fallback `format` is NOT surfaced as a preference).

## 5. Validation evidence (PGlite, real migration file applied; harness `C:\Users\parve\t0-validation\validate.mjs`)

**39/39 PASS** (2026-06-13). Per required case:
- **Case A** (brief "We have two Support Coordinator positions available."): slot created (`manual`/`pending_fill`/source material/attribution: A1–A6) → fill `filled, manual:true` → slot `fill_in_progress` → skeleton draft `approval_status='draft'`, NOT pre-approved → `slot_fill_synthesis_v1` queued with `synthesis_mode='manual'` + brief, `canonical_ids=[]` (pool untouched) → attempt row recorded → publish queue untouched (A7–A15). *Advisor/compliance/approval execution is the unchanged ai-worker chain consuming this exact contract — live confirmation is the post-deploy verification step (LLM stages cannot run in PGlite).*
- **Case B** (`video_short_avatar` preference): accepted on eligible platform; preference recorded on slot; ai_job carries `format=video_short_avatar` + `format_preference_explicit=true` (Advisor visibility); draft awaits governance at `'draft'` — no bypass (B1–B4). Policy validation: non-supported platform → `format_not_supported_on_platform`; unknown format and inactive format → `format_not_in_taxonomy` (B5–B7).
- **Case C** (ineligible platform): `platform_not_eligible`, **no slot created**; unknown client equally rejected; brief floor + past schedule rejected; slot count unchanged across all rejections (C1–C7).
- **Case D** (queue-save equivalent): governed submit → draft NOT auto-approved, publish queue NOT written; `manual_post_insert` EXECUTE revoked from anon+authenticated yet retained with DEPRECATED comment; `create_manual_slot` service_role-only (D1–D8).
- **Regression guard:** wiped source material → slot `failed:manual_source_material_missing`, no ai_job (R1–R2).
- **Transcription fidelity:** md5 `0e2ca3baca4b54a012ee7bf2d0734d92` (deployed `fill_pending_slots`) == md5 (migration function minus manual block).
- Build checks: ai-worker `deno check` pass; dashboard `tsc --noEmit` exit 0.

## 6. Rollback plan (each piece independent, single-step)

1. **Dashboard:** revert the dashboard merge commit (or redeploy previous Vercel deployment) → Studio calls `manual_post_insert` again (function retained and service_role still granted — this is why T0 does not remove it yet).
2. **ai-worker:** redeploy v2.13.0 from git (blob `8204a5c7`) via CLI — manual jobs would error `slot_fill_no_canonical_ids` visibly in `m.ai_job.error` rather than silently misbehave.
3. **DB:** `CREATE OR REPLACE m.fill_pending_slots` back to the deployed body (recoverable byte-exact: migration minus manual block, md5-proven); `DROP FUNCTION public.create_manual_slot(...)`; columns may stay (nullable, inert) or be dropped; re-grant `manual_post_insert` if anon/authenticated access is ever wanted back (not recommended). No data rollback needed — manual slots are additive rows.

## 7. D-01 review packet — decision under review

- **decision_under_review:** convert Content Studio Single Post from a governance-bypass path into governed ICE intent (T0), via the three coordinated pieces above.
- **production_action_if_approved:** apply migration (2 nullable columns; 1 new locked-down RPC; fill function replaced — unchanged path md5-proven; deprecation comment + revoke), deploy ai-worker v2.14.0, merge + deploy dashboard.
- **consequence_if_delayed:** every Studio queue-save continues to publish with zero Advisor/compliance/approval control; `manual_post_insert` stays EXECUTE-open to anon/authenticated.
- **current_evidence:** 39/39 PGlite checks on the real migration; md5 transcription proof; type checks green both repos.
- **known_weak_evidence / risks:** (a) Advisor/compliance execution on a manual brief not yet observed live (post-deploy verification case); (b) operator identity is coarse (`created_by='content-studio'` — dashboard has no per-operator auth context; finer attribution is follow-up, not T0-blocking); (c) Studio preview remains a direct AI call (non-persisting aid; retained deliberately to avoid redesigning Studio in T0); (d) multi-platform submits create one manual slot per clicked platform — deliberate, no automatic variant generation (out of scope).
- **default_action:** proceed to PK approval.

**Out-of-scope confirmation:** no creative-intent/content-package parent, no sibling grouping, no platform variant generation, no campaign abstraction, no post-render QA/OCR/transcript/asset-review, no series redesign/claiming, no VideoTracker/GIF cleanup, no newsletter/reddit, no T2. No Option C change, no aggregation-ownership change, no YouTube-repair change, no cron change.

**Post-deploy verification plan (after PK approval + deploys):** run Cases A–D against production via the Studio (one CFW low-volume brief): confirm slot → fill (next `fill_pending_slots` tick) → ai-worker generates draft (Advisor `recommended_format` + reason populated; compliance flags present or HARD_BLOCK dead) → draft sits at `needs_review`/auto-approval path → render eligibility honoured; confirm Case C rejection in the UI; confirm no `m.post_publish_queue` row exists before approval.
