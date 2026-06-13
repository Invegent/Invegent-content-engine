# 2026-06-13 — Content Studio capability alignment: deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `b773e312-38a7-4cc8-a3be-e4e990cb9cd1`, **decision A** (taxonomy-governed; LinkedIn voice variants stay disabled-with-reason; no taxonomy expansion).
**Brief:** `docs/briefs/content-studio-capability-alignment.md`. UI alignment + one read-only RPC. No pipeline/T2 change.

---

## 1. Shipped
- **content-engine `main` `faa1b2be`** ← merge of `feat/studio-capability-resolver` (`817f6083`). `public.get_studio_capabilities` applied to prod — verified STABLE/read-only, service-role only.
- **dashboard `main` `caddf67c`** ← merge of `feat/studio-capability-resolver` (`3fe664be`). Vercel prod `dpl_6XQj6FhV1uQk9fE5EAH9bTEmk6Mr` READY (`dashboard.invegent.com`). Single Post + Series both consume `useStudioCapabilities`; hardcoded `STUDIO_SUPPORTED_PLATFORMS` / `FORMAT_OPTIONS` / per-component platform fetch removed.

## 2. Post-deploy verification (read-only, prod RPC, all 4 clients)
| brand | platforms | LI kinetic_voice | LI stat_voice | LI image | IG text | IG kinetic | YT text | unsupported-enabled |
|---|---|---|---|---|---|---|---|---|
| CFW | fb,ig,li | disabled | disabled | enabled | hidden | disabled | (no YT) | 0 |
| Invegent | fb,ig,li | disabled | disabled | enabled | hidden | disabled | (no YT) | 0 |
| NDIS Yarns | fb,ig,li,yt | disabled | disabled | enabled | hidden | disabled | hidden | 0 |
| Property Pulse | fb,ig,li,yt | disabled | disabled | enabled | hidden | disabled | hidden | 0 |

- **LinkedIn voice variants `disabled` for every client** (decision A; no LI voice enablement).
- **`unsupported_enabled = 0`** for every client — no format with `platform_support=false` is ever in an enabled state (the critical safety invariant; LI voice never appears enabled).
- Eligibility correct (NY/PP +youtube; CFW/Invegent no youtube). Supported+proven combos enabled; IG text hidden; YT non-video hidden.

## 3. Scope / guardrails
One new read-only DB object (`get_studio_capabilities`, STABLE/SELECT-only/service-role). No change to `create_creative_intent` / `get_creative_intent_detail` / `list_active_clients` / `list_creative_intents` / `fill_pending_slots` / ai-worker / Advisor / compliance / render / publishers. No taxonomy expansion (`platform_support`/`is_buildable` untouched), no LinkedIn voice enablement, no new publisher, no T2, no Option C, no Fix 2, no register reconciliation.

## 4. Validation
PGlite 36/36 (`docs/briefs/studio-capability-resolver-validation.mjs`); dashboard `tsc --noEmit` exit 0; grep — no hardcoded Studio platform/format arrays remain; Vercel build READY (no error); live matrix above.

## 5. Rollback
content-engine — `DROP FUNCTION public.get_studio_capabilities(uuid)`. dashboard — revert merge / redeploy prior deployment (`dpl_BMUCjpWsZfKrvbmMtVpoPp2aUELw`). Independent per repo; no data migration.

## 6. Carry (unchanged, not actioned)
LinkedIn `video_short_kinetic_voice`/`stat_voice` have 10 published LI rows (90d) but `platform_support.linkedin=false` — UI keeps them disabled-with-reason (decision A). Enabling them is a separate gated taxonomy data change, not done.
