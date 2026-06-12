# 2026-06-12 — META-TOKEN-PROVENANCE-AUDIT + CFW reconnect verification (read-only lanes; CFW rotation VERIFIED)

**Status:** PK-accepted. Two consecutive read-only lanes recorded: (1) META-TOKEN-PROVENANCE-AUDIT (opened after PK corrected the rotation framing — the Invegent Publisher Meta app was previously DENIED App Review and not resubmitted; dashboard OAuth was not to be assumed functional); (2) CFW dashboard reconnect performed manually by PK, then verified read-only.
**Actors:** PK (manual dashboard reconnect via `/connect`); CCH (read-only audit + verification + this record). CCD: register patch at next reconciliation pass (>80KB rule — registers untouched from chat).
**Production mutation in these lanes:** none. (The only mutation in the adjacent security lane was the PK-approved `security_purge_pgnet_stage_r_159957` pg_net purge, recorded in the Fix 1 brief §2.5.)
**No token values appear in this file.** Identity is recorded as md5 prefix + length only (non-reversible).

---

## 1. Token provenance (audit findings)

**Storage map:**
- **Primary store: `c.client_publish_profile.page_access_token`** (inline; all 4 FB rows populated), with `credential_env_key`, `token_expires_at`, `page_id`, `page_name`, `destination_id`. The column has only existed since **2026-03-16** — added by `20260316_oauth_connect.sql` together with the `public.store_facebook_page_token` RPC (verified present, signature matches the dashboard callback).
- **NY/PP also have legacy env-key paths:** `FB_PAGE_TOKEN_NDIS_YARNS`, `FB_PAGE_TOKEN_PROPERTY_PULSE` (EF env secrets; pre-March original path). Supabase **Vault holds NO Meta tokens** (internal keys only).
- **Consumer preferences differ:** **publisher v1.8.0 prefers inline → env fallback; insights-worker v14.1.0 prefers env → inline fallback** — so for NY/PP the two workers may be using different physical tokens (env copies uncomparable from SQL). **CFW has no env fallback — inline is the sole source for BOTH consumers** (which made rotation single-point and low-risk). Invegent likewise inline-only.
- Dashboard `/connect` reads safe metadata only; writes only via the OAuth callback → RPC. Crons consume tokens only indirectly via the two EFs.
- Token-health infra (`m.platform_token_health`, `m.token_expiry_alert`) **exists but has never run — both tables empty**. The publisher exposes an unused-by-cron **`/token-health` GET endpoint** (debug_token per profile; returns `is_valid/expires_at/scopes`; no token values) — used for this verification and the natural ongoing monitor.

**Generation fingerprints:**
- The dashboard FB OAuth flow is **real, complete code** (auth → consent → code exchange → long-lived upgrade → page fetch → RPC store), built **2026-03-15/16 for the Meta App Review screencast** (commit `9d17c2d9`, dashboard repo), env vars set in Vercel same day. The callback **always writes a genuine computed expiry** — that is the fingerprint.
- **NY + PP:** inline rows updated **2026-04-18 06:43, same minute**, expiry sentinel `2099-12-31` → **manual batch paste**, not the OAuth flow. **Invegent:** 2026-05-01, `2099-12-31` → manual.
- **CFW (pre-reconnect):** 2026-05-27, finite minute-precise expiry → **likely dashboard-OAuth-minted** (the flow works in dev mode for app-role users despite the App Review denial).
- Verdict: mixed fleet — 3 manual/sentinel, 1 OAuth-minted; the OAuth path is functional-in-dev-mode, not aspirational. D-YT-OAUTH-1 (dashboard-first for reconnects) is validated.

## 2. CFW reconnect verification (2026-06-12, post-PK manual reconnect)

- **Token changed safely:** md5 prefix `f9203060` → `b27c0284`, length 204 → 205 (prefix/length only; values never selected).
- **Expiry refreshed:** `token_expires_at` now **2026-08-11 20:57 UTC = grant + exactly 60 days** (long-lived OAuth fingerprint).
- **Token valid:** publisher **`/token-health`** (invoked once via pg_net; key + URL built in-SQL from vault, never output) ran real `debug_token` checks: **CFW `is_valid: true`** — and **all four FB tokens valid** (NY, PP, Invegent included; free fleet-wide pass).
- **`pages_read_engagement` PRESENT** on CFW's new token — and on all four. Full per-token scope set: pages_manage_posts, pages_read_engagement, pages_show_list, read_insights, pages_manage_metadata, business_management, instagram_basic, instagram_content_publish, publish_video, public_profile.
- **No token values exposed:** response body passed through an `EAA…`-pattern redaction guard (nothing to mask — metadata only, no `paging` blocks, L-StageR-paging honoured); response row 160574 contains no secrets, no purge needed.
- **Findings of record (no changes made):** (a) `store_facebook_page_token` does **not bump `updated_at`** — unreliable as a reconnect indicator; hash/expiry change is the proof. (b) `debug_token` returns **`expires_at: 0` on all four — never-expiring page tokens**: DB expiry dates describe the user-token window, not page-token life; the never-run token-health infra, not `token_expires_at`, is the right long-term monitor. (c) NY/PP/Invegent's `2099-12-31` sentinels are accidentally truthful in spirit.

## 3. Residual risk decision (PK, 2026-06-12)

- The old leaked CFW token is a never-expiring page token and **may not be invalidated by the reconnect** — it will not lapse on 08-11.
- **Residual risk ACCEPTED for now:** the leak was a **fragment-only** exposure in a private session transcript, and the DB-side copy was purged (`security_purge_pgnet_stage_r_159957`).
- **Meta Business Integration removal is DEFERRED** — removing the Invegent Publisher grant may invalidate **all four** page grants (NY/PP/Invegent included), creating unnecessary operational blast radius. **Old-token invalidation remains optional/manual hardening, not a blocker.**

## 4. Fix 1 implication

- **Fix 1 can proceed** (brief `docs/briefs/f-optionc-engagement-evidence-null-fix1-fb-engagement-acquisition.md`, amended commit `a5815d4e`). It was never blocked on CFW: the v14.2.0 patch is client-agnostic and CFW's token was valid throughout; rotation was precautionary.
- New nuance from the scope finding: Stage R's #10 (Leg B, fields call) was proven only on the **old** CFW token; all four current tokens carry `pages_read_engagement`, so Leg B may have been old-token-specific and the RCS zeros elsewhere may be genuine. **Include one gated CFW fields-call retest in the Fix 1 execution session if needed** — it may shrink or close the §3a Meta-side carry and restore comments+shares coverage without waiting on Meta. The reduced-basis patch shape (`post_reactions_by_type_total`) remains the safe default and stands unchanged.
- **Option C remains PARKED.**

## 5. Register patch text for CCD (apply at next reconciliation; surgical, read-HEAD-first)

`docs/00_action_list.md` — Closed list prepend: **Closed (token lanes, 2026-06-12):** META-TOKEN-PROVENANCE-AUDIT complete (storage map: inline `client_publish_profile` primary, NY/PP legacy env duals, publisher inline-first vs insights-worker env-first, CFW/Invegent inline-only; fingerprints: NY/PP/Invegent manual 2099-sentinel pastes, CFW dashboard-OAuth-minted; dashboard FB OAuth flow real + dev-mode functional, built 03-16 for the denied App Review). CFW reconnect by PK **VERIFIED** (hash/length changed, expiry refreshed +60d, valid, `pages_read_engagement` present; all four FB tokens valid via publisher `/token-health`; zero token values exposed). Residual old-token risk accepted (fragment-only, DB copy purged); Business Integration removal deferred (four-grant blast radius); old-token invalidation optional hardening. New facts of record: `store_facebook_page_token` doesn't bump `updated_at`; all four page tokens never-expiring per debug_token (DB expiry = user-token window); token-health infra exists but never run. Fix 1 unblocked; Option C stays parked. Session record `docs/runtime/sessions/2026-06-12-meta-token-provenance-and-cfw-reconnect-verification.md`.

`docs/00_sync_state.md` — banner line: **🟢 CFW FB token rotated + verified (2026-06-12):** dashboard reconnect by PK; new token valid, `pages_read_engagement` present, all four FB tokens valid; old-token residual risk accepted (fragment-only); provenance audit complete — see session record above. Fix 1 proceeds; Option C parked.

## 6. Constraint compliance (both lanes end-to-end)

Audit lane: 4 read-only SELECTs (safe metadata only) + 5 repo reads; 0 Graph calls. Verification lane: 3 read-only SELECTs + **1 narrow pg_net GET to the publisher `/token-health` metadata endpoint** (PK's preferred path; no broad Graph calls, no publishing, no worker job runs). Across both: **0 token values selected/printed/persisted, 0 DB/config changes, 0 deploys, 0 register edits from chat, 0 production changes.** T1 untouched.
