# 2026-06-14 — F-YT-PLATFORM-ISOLATION: YouTube cross-publish P0 fix close-out (DEPLOYED / VERIFIED / CLOSED for future publishing)

**Status:** youtube-publisher **v1.12.0** DEPLOYED / VERIFIED. P0 cross-platform-publish isolation bug CLOSED for future publishing. Positive-publish = WATCH. Historical remediation + WordPress audit = OPEN carries.
**Register:** docs-only reconciliation at **v3.50** (`docs/00_action_list.md` + `docs/00_sync_state.md`).
**Authority impact:** none (publisher is downstream of the decision tree; as-built flow + T1 unchanged).

---

## 1. Incident (P0)
youtube-publisher v1.11.0 is a DIRECT-READ publisher: its draft SELECT lacked a `platform='youtube'` filter. Any approved draft carrying a generated `video_short_avatar` asset — **including non-YouTube FB/IG/LI drafts** — could be picked up and uploaded to YouTube (cross-platform publish).

## 2. Fix (isolation only) — youtube-publisher v1.12.0
- (a) Added `platform` to the SELECT columns + a HARD **`.eq('platform','youtube')`** filter.
- (b) Defensive in-loop **`draft.platform !== 'youtube'` skip** (defence-in-depth; logs `platform_isolation_skip`).
- No other logic changed.
- Commit `258d213ff3bb93cbaa5b9a7aab91a262ed666d5f`; D-01 `e0c87546-ffe0-409a-ba60-40a037793133` (proceed / agree / medium risk / high confidence); deployed via Supabase CLI `--no-verify-jwt`; Supabase function version 52; `verify_jwt=false` preserved.

## 3. Verification
- `deno check` exit 0; live GET `youtube-publisher-v1.12.0`; verify_jwt false (authoritative + header-less GET 200); deployed source confirmed to contain `.eq('platform','youtube')` + the in-loop guard.
- **0** new YouTube cross-publishes after deploy; **0** non-YouTube drafts stamped with YouTube IDs after deploy; no runtime errors.
- **Positive-publish = WATCH:** no eligible YouTube draft existed post-deploy, so the first legitimate YouTube draft after v1.12.0 must be confirmed to publish **while its FB/IG/LI siblings receive NO YouTube `m.post_publish` row.**

## 4. Status
**F-YT-PLATFORM-ISOLATION DEPLOYED / VERIFIED / CLOSED for future publishing.**

## 5. Carries (NOT done — explicitly open)
- **YT-CROSSPUB-HISTORICAL-REMEDIATION (P2)** — already-uploaded cross-platform YouTube videos remain UNRESOLVED; identify + decide takedown/relabel/leave. No remediation performed this lane.
- **WP-DIRECT-READ-ISOLATION-AUDIT (P2)** — audit the WordPress publisher for the same direct-read class (possible FB→website cross-publish); NOT patched this lane.

## 6. Scope / footprint
youtube-publisher only. The EF deploy was the prior lane; **this reconciliation pass is docs-only — 0 code / 0 DB / 0 migration / 0 dashboard / 0 deploy / 0 historical-remediation / 0 WordPress change / 0 production mutation.**
