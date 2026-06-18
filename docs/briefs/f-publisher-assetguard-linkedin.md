# Brief F-PUBLISHER-ASSETGUARD-LINKEDIN — LinkedIn interim assetless-publish guard

**Created:** 2026-06-18 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (ef-builder, isolated worktree)
**Status:** draft
**Result file:** `docs/briefs/results/f-publisher-assetguard-linkedin.md` (created on completion)

---

## Task

Port the proven Facebook interim assetless-publish guard to the LinkedIn publish path so a draft whose `recommended_format` requires a rendered visual asset is **never silently published as a text-only post** when that asset is missing/failed/pending. Harden **both** LinkedIn edge functions: the live `linkedin-zapier-publisher` (text-only bridge, in production) and the repo-only `linkedin-publisher` (direct API, not yet deployed, gated on B24/F06). Code-only; no DB/schema/migration.

## PK decisions (ratified for this brief)

- **D1 — targets:** Harden **both** EFs — live `linkedin-zapier-publisher` **and** repo-only `linkedin-publisher`.
- **D2 — format policy:** Any non-text format must **block/hold safely and never text-fallback**.
  - Zapier bridge is text-only → non-text format ⇒ **block** with an explicit `asset_guard_blocked:<reason>`.
  - Direct API path **may** hold a pending image *if/when a media-publish path exists*, but must **never** text-fallback. (Note: the direct publisher has **no media path today** — see §6 — so its interim behaviour is also block.)

## Source context

- `supabase/functions/publisher/guard.ts` — the **proven FB template** (pure `classifyFbFormat` + `decideAssetGuard`; "NEVER returns publish:text for an asset-required format").
- `supabase/functions/publisher/index.ts` — FB guard **integration pattern** (SELECT of asset columns; `decideAssetGuard` → hold/block/publish; `assetGuardHold`/`assetGuardBlock`).
- `docs/briefs/publisher-assetless-guard-validation.test.ts` — FB guard unit-test harness (21/21) to port.
- `supabase/functions/linkedin-zapier-publisher/index.ts` — **live** target (v1.1.0).
- `supabase/functions/linkedin-publisher/index.ts` — **repo-only** target (v1.2.0).
- `docs/00_action_list.md` line ~325 — carry `F-PUBLISHER-ASSETGUARD-LINKEDIN` (P2 OPEN); line ~303 — FB guard STATUS BLOCK (v3.44 template).
- Standing gotcha: deploy ICE EFs with `--no-verify-jwt` (CLI default flips `verify_jwt`→true and breaks `x-publisher-key`-only callers).

---

## 1. Problem statement

The FB publisher incident (v3.44) showed that a draft requiring a rendered asset (`image_quote`/`carousel`/video) whose asset is missing or `failed` can be **silently published as text**, losing the intended visual format with no reviewable signal. The FB publisher was fixed with an interim asset guard. **LinkedIn is the remaining publisher with this exposure**: both LinkedIn EFs construct a text payload from `draft_title`+`draft_body` and publish it **unconditionally**, with no knowledge of `recommended_format` or asset readiness. A non-text LinkedIn draft with a missing/failed asset therefore ships as text-only.

**Frequency caveat (honest):** the v3.53 `platform_support` correction made LinkedIn series drafts resolve to `text` only, so *current series-path* incidents are unlikely. But the publishers do **not** re-validate format against `platform_support` at publish time, so any non-text LinkedIn draft from a legacy/manual/non-series path still hits this exposure. The guard is warranted as **defence-in-depth**, identical in rationale to the shipped FB guard, at low cost.

## 2. Evidence — live `linkedin-zapier-publisher` is text-only and lacks an asset guard

`supabase/functions/linkedin-zapier-publisher/index.ts` (v1.1.0, **LIVE**):
- Draft SELECT reads only text/approval columns — **no `recommended_format`, no asset-status columns** (L108-113):
  `.select('post_draft_id, draft_title, draft_body, approval_status')`
- Builds a text payload and POSTs it to the Zapier webhook **unconditionally** once approved — no format/asset branch (L131-159).
- On success writes `m.post_publish` `status='published'` with no asset signal (L168-181).
- The only gate is the v1.1.0 **approval** gate (L120-129) — it does **not** consider assets.
- Transport is a Zapier webhook carrying `{ text, title, client_name, ... }` (L152-158) — **text-only**, no media fields.

⇒ A LinkedIn queue item with `recommended_format='image_quote'`+`image_status='failed'` is published as text. **REAL, active.**

## 3. Evidence — repo-only `linkedin-publisher` has the same gap

`supabase/functions/linkedin-publisher/index.ts` (v1.2.0, **repo-only, not deployed**; activates on B24/F06):
- Draft SELECT reads only text/approval columns — same gap (L74):
  `.select("post_draft_id, draft_title, draft_body, approval_status")`
- `linkedInPost()` posts `commentary: text` to `https://api.linkedin.com/rest/posts` — **text-only**, no asset/media upload path (L21-32).
- Publishes unconditionally once approved; no format/asset branch (L92-114).
- Approval gate present (L81-90); **no asset guard**.

⇒ Same exposure; would ship on activation unless guarded now (matching its own "defensive day-1" comment).

## 4. Existing protections (FB/IG/YT) and why LinkedIn is the remaining gap

- **Facebook** — interim asset guard **shipped** (publisher v1.9.0/v1.10.0, v3.44): `guard.ts` classifies format and blocks/holds asset-required formats; never text-fallback; queue `skipped` + `asset_guard_blocked:<reason>` + audit row; 21/21 unit tests.
- **Instagram** — audited (v3.44 non-FB asset-guard audit) **not exposed** (IG publisher requires a generated image; no text-fallback path).
- **YouTube** — audited **not exposed** for this class (video-only; SELECT gated on `video_status='generated'`); separately hardened for platform isolation (v1.12.0/v1.13.0).
- **LinkedIn** — **the last publisher without the guard.** Closing it completes publisher asset-guard coverage.

## 5. Proposed guard module design

A pure, dependency-free module mirroring `publisher/guard.ts`, forward-compatible with a future LinkedIn media path:

- `classifyLinkedinFormat(fmt): "text" | "image" | "carousel" | "video" | "unknown"` — same mapping as `classifyFbFormat` (`""`/`text`→text; `image_quote`→image; `carousel`→carousel; `video*`→video; else→unknown).
- `decideLinkedinAssetGuard(input, opts: { mediaPublishSupported: boolean }): AssetGuardDecision`
  - `text` ⇒ `{ kind:"publish", method:"text" }`.
  - **`mediaPublishSupported === false`** (both EFs **today**): any non-text ⇒ `{ kind:"block" }`:
    - known media (`image`/`carousel`/`video`) ⇒ `reason:"li_media_publish_not_supported_interim"`
    - `unknown` ⇒ `reason:"unknown_asset_required_format_default_deny"`
    - **never** returns `publish:text` for a non-text format.
  - **`mediaPublishSupported === true`** (future direct-API path only): adopt FB semantics — image/carousel: `pending`→hold, `generated`+url→publish, else block; video: `pending`→hold, else block. Never text-fallback.
- Decision type identical to FB (`publish` | `hold` | `block`). Default-deny on unknown.

Both EFs pass `mediaPublishSupported: false` in this lane → both **block** non-text. This satisfies D1 (both hardened) and D2 (never text-fallback; hold reserved for a real media path).

## 6. Format classification policy for LinkedIn

| `recommended_format` | class | Interim decision (both EFs, no media path) | Future (direct API w/ media path) |
|---|---|---|---|
| `""` / `text` / null | text | **publish (text)** | publish (text) |
| `image_quote` | image | **block** `li_media_publish_not_supported_interim` | pending→hold; generated+url→publish; else block |
| `carousel` | carousel | **block** `li_media_publish_not_supported_interim` | pending→hold; generated≥2 slides→publish; else block |
| `video_*` | video | **block** `li_media_publish_not_supported_interim` | pending→hold; else block (no text) |
| `animated_*` / other | unknown | **block** `unknown_asset_required_format_default_deny` | block (default deny) |

Rationale: neither LinkedIn EF has a media-publish path today (Zapier carries text only; the direct API call posts `commentary` text only) — so the only safe interim for a non-text format is to block, never degrade to text.

## 7. Required code changes

**(a) New guard module — `supabase/functions/linkedin-zapier-publisher/guard.ts`** (and shared with the direct EF, or a sibling copy under `linkedin-publisher/guard.ts` — executor's call; prefer a single shared file if the deploy bundler allows, else duplicate the pure module). Implements `classifyLinkedinFormat` + `decideLinkedinAssetGuard` per §5. Pure, no I/O, unit-testable.

**(b) Update live `linkedin-zapier-publisher/index.ts`:**
- Expand draft SELECT (L111) to add `recommended_format, image_status, image_url, video_status, video_url`.
- Add a **defensive `.eq('platform','linkedin')`** style filter — the queue is locked by `publisher_lock_queue_v2(p_platform:'linkedin')`, so add a per-row defensive guard (mirror YT v1.12.0 / IG v2.0.0): if a loaded draft's `platform` is not `linkedin`, skip with `platform_isolation_skip` (requires adding `platform` to the SELECT). 
- After the approval gate, call `classifyLinkedinFormat` + `decideLinkedinAssetGuard({...}, { mediaPublishSupported:false })`.
- `hold` ⇒ re-queue (`status='queued'`, `scheduled_for=now+minutes`, `last_error=reason`, clear lock) — no Zapier POST.
- `block` ⇒ queue `status='skipped'`, `last_error='asset_guard_blocked:'+reason`, insert `m.post_publish` `status='failed'` audit row, **draft preserved** — no Zapier POST.
- `publish` (text only this lane) ⇒ existing Zapier POST path unchanged.

**(c) Update repo-only `linkedin-publisher/index.ts`** identically:
- Expand draft SELECT (L74) with the same asset columns + `platform`.
- Defensive `platform!=='linkedin'` skip.
- Same `classify`/`decide` call with `{ mediaPublishSupported:false }`; same hold/skip/audit behaviour; existing `linkedInPost` text path only on `publish`.
- Bump `VERSION` `linkedin-publisher-v1.2.0` → `v1.3.0`; keep **repo-only / not deployed** unless §9 says otherwise.

**(d) No DB/schema change** — `recommended_format, image_status, image_url, video_status, video_url, platform` already exist on `m.post_draft`; queue `status='skipped'` and `post_publish.status='failed'` are existing values.

## 8. Validation plan

- `deno check` on both edited EFs + the guard module → exit 0.
- **Guard unit tests** (port `publisher/.../publisher-assetless-guard-validation.test.ts`): cover text→publish; image/carousel/video→block `li_media_publish_not_supported_interim`; unknown→default deny; and (forward-compat) `mediaPublishSupported:true` hold/publish/block matrix. `deno test` green.
- **branch-warden** — verify HEAD/branch/parity + changed-file set == approved set (isolated worktree, verdict `safe`).
- **No `db-rls-auditor`** — no DB touched.
- **External review** — `ask_chatgpt_review` on the **final diff** (re-run if the diff changes after review); route any non-clean verdict per CLAUDE.md triage.
- **Post-deploy (Zapier EF) read-only checks:** live `GET` returns the new version; `verify_jwt=false` confirmed (header-less GET 200 + authoritative `list_edge_functions`); current LinkedIn queue not stranded (no legitimately-publishable text item newly blocked); a synthetic/dry-run non-text item resolves to `skipped` + `asset_guard_blocked:*`, draft preserved.

## 9. Deploy plan

- **`linkedin-zapier-publisher`** (live): deploy via Supabase CLI **`--no-verify-jwt`** (preserve `verify_jwt=false`; it is `x-publisher-key`-authed). This is the irreversible step → **PK gate (HARD STOP)** before deploy.
- **`linkedin-publisher`** (repo-only, inactive): **commit the guarded code but do NOT deploy** in this lane — it activates with B24/F06. Deploying it now is out of scope (it is not wired to a live queue path beyond the shared `linkedin` lock, and the Zapier bridge is the active path). Leave its day-1 safety in the committed source.
- Deploy order: Zapier EF only. No DB step.

## 10. Rollback plan

- **Zapier EF:** redeploy prior `linkedin-zapier-publisher` v1.1.0 (git blob) via Supabase CLI `--no-verify-jwt`. No DB rollback (guard writes only existing columns/values).
- **Direct EF:** revert the commit (never deployed) — no runtime impact.
- No schema/data to revert.

## 11. Explicit non-goals

- No new LinkedIn **media-publish** capability (image/carousel/video posting) — interim guard only; media path is separate future work that flips `mediaPublishSupported`.
- No DB/schema/migration; no change to `platform_support`, `get_studio_capabilities`, or any resolver.
- No deploy of the repo-only direct `linkedin-publisher`.
- No change to FB/IG/YT publishers; no full-T2 (OCR/transcript/visual/brand/audio QA) — that remains the deferred durable replacement (`F-PUBLISHER-FULL-T2`).
- No AGP / Branch B / avatar-governance / telemetry-flag / security-D-002 work.
- No register edits in the ef-builder step (register reconciliation is a separate docs lane after the result).

## Allowed actions (ef-builder)

- Create the guard module(s); edit the two LinkedIn EF `index.ts` files per §7; add/port the guard unit tests; run `deno check` + `deno test` locally in an isolated worktree.

## Forbidden actions (ef-builder)

- No deploy, no migration, no DB write, no commit to a shared branch, no register edit, no production mutation. Hand the diff + deploy plan back to the orchestrator for external review + the PK gate. Honor all active hold-states in `docs/00_sync_state.md` (Branch B NOT AUTHORISED; Phase 3.3 flag-enable BLOCKED; AVATAR_SHADOW_TELEMETRY OFF/unset).

## Success criteria

- Both LinkedIn EFs: a non-text `recommended_format` with missing/failed/pending asset resolves to **block/hold**, never a text publish; text drafts publish unchanged.
- `deno check` exit 0; guard unit tests green (incl. default-deny + never-text assertions).
- Defensive `platform` skip present in both EFs.
- branch-warden `safe`; external review clean (or escalations resolved per triage); changed-file set == guard module(s) + the two `index.ts` (+ test) only.
- Post-deploy: Zapier EF live at new version, `verify_jwt=false`, queue not stranded.

## Stop condition

Report result per result template (`docs/briefs/_template_result.md`), then stop. Deploy and any commit/push remain orchestrator-driven PK gates.

---

## Notes

- The direct `linkedin-publisher` posts `commentary` text only via `/rest/posts` — there is no current image/asset upload path, which is why its interim policy is also block (D2's "hold pending image" is reserved for when a media path is built; the guard's `mediaPublishSupported` flag makes that a one-line flip later).
- Prefer a single shared pure guard module if the per-function deploy bundle permits importing across function dirs; otherwise duplicate the small pure module per EF (FB keeps its guard local to `publisher/`).
