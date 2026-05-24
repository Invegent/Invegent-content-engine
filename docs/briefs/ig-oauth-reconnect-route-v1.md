# Brief — Instagram OAuth Reconnect Route + `store_instagram_token` RPC

> ## ⛔ ON HOLD — DO NOT BUILD/DEPLOY/APPLY (2026-05-24)
> **Superseded for the immediate fix by `docs/briefs/ig-publisher-v2.3.0-image-publish-retry.md` (v2.3.0 Option-2 EF patch).**
>
> **Why held:** Source forensics (v1.0.0 commit `1a74f238` vs v2.2.0 `90602787`) + the full Graph error proved this brief's premise wrong. IG publishing **never used a dedicated Instagram OAuth**. v1.0.0 (22 successful image publishes, 19–25 Apr) published with only `POST /{ig_user_id}/media` → `POST /{ig_user_id}/media_publish` using the **stored `c.client_publish_profile.page_access_token`** (an FB-page token that carries IG) and did **no container-status GET for images**. The same token **creates the container and authenticates the publish call** (CFW reached `media_publish` → `9007`), so "token lacks read scope → needs new scoped OAuth" is the *weakest* explanation. The new `100/33` is on a container-status **GET that v2.2.0 introduced** and that the working path never made for images — i.e. a publish-path readiness/timing issue, not an auth-scope gap. The full error is `"Authorization Error" / GraphMethodException / code 100 / subcode 33` (object/method/permission), **not** "nonexisting field". Building `instagram_content_publish` OAuth would also require Meta App Review, which is not in place.
>
> **What stays valid from this brief (for FUTURE external-client use only):** a real per-client IG OAuth + `store_instagram_token` (with `destination_id` capture + `client_channel` provenance) is still the right long-term shape **if/when** external clients need self-serve IG connection under an approved Meta app. Internal clients (Invegent/CFW) do **not** need it — their `destination_id` values are already populated (2026-05-24) and their page tokens already publish.
>
> **Staged artifacts (leave shelved, do NOT push/merge/apply):** dashboard branch `feat/ig-oauth-reconnect` (commit `43ff72a`, routes `app/api/instagram/{auth,callback}`), content-engine branch `feat/ig-store-token-rpc` (migration `20260524000000_f_ig_store_instagram_token.sql` — NOT applied; runbook `docs/runbooks/ig-oauth-reconnect-and-retest.md`). Both local-only; nothing deployed or applied. Nothing to roll back.
>
> **Resume condition:** only revisit for external-client IG onboarding under an approved Meta app. Not for the current internal-client drain.

---

**Status:** DRAFT — for CCD. Build behind branch+PR. **D-01 required before migration apply and before dashboard deploy.**
**Author:** CCH (chat)  ·  **Date:** 2026-05-24
**Repos touched:** `invegent-dashboard` (new API routes + button is already wired) and `Invegent-content-engine` (one migration: new RPC).
**Lineage:** IG publisher repair chain — v2.1.0 throttle robustness → v2.2.0 image-container poll → this. Sibling docs: `docs/briefs/ig-reenable-throttled-drain-v1.md`, `docs/runbooks/ig-v2.1.0-deploy-test.md`.

---

## 1. Why (problem statement)

The supervised v2.2.0 deploy-test surfaced, in sequence:
1. `9007 / 2207027 "Media ID is not available"` at publish — fixed by v2.2.0 (image-container readiness poll). 
2. After v2.2.0, the readiness poll itself failed with **`code 100 / subcode 33` GraphMethodException ("Authorization Error")** on `GET /{container_id}?fields=status_code,status`.

Read-only diagnosis traced (2) to **token scope/provenance**, then PK hit a **404** clicking the Invegent IG **Reconnect** button. Root causes confirmed by repo inspection:

- The IG Reconnect button links to **`/api/instagram/auth`**, which **does not exist** in `invegent-dashboard` (no `instagram` dir under `app/api`). → the 404.
- The only Meta OAuth route that exists (`/api/facebook/auth` + `/callback`) is **Facebook-only**: it requests scopes `pages_manage_posts, pages_read_engagement, pages_show_list` (**no `instagram_basic`, no `instagram_content_publish`**), stores via `store_facebook_page_token` with `p_platform='facebook'`, and **never resolves the Instagram Business Account id** (no `destination_id`).

Net: there is **no mechanism to mint a properly-scoped Instagram token** or populate the IG profile. The existing IG tokens were set outside any OAuth flow (no `c.client_channel` rows; `token_expires_at` = sentinel `2099-12-31`) and lack `instagram_basic` — exactly the read scope the container-status GET needs. This explains both the `100/33` and the missing provenance.

> **NOTE (2026-05-24, post-forensics):** The clause above — "lack `instagram_basic` … the read scope the container-status GET needs" — is the disproven hypothesis. See the HOLD banner. The same token publishes; the `100/33` is a v2.2.0-introduced container GET, not a scope gap.

## 2. Goal / definition of done

A working Instagram OAuth reconnect so PK can reconnect an IG profile from the dashboard, minting a token with the correct IG scopes and writing the IG Business Account id, so the v2.2.0 publisher can read container status (no `100/33`) and publish.

**Done when:**
1. Clicking IG **Reconnect** completes Meta consent and returns to `/connect` with success (no 404).
2. `c.client_publish_profile` (platform `instagram`, the reconnected client) has a refreshed `page_access_token`, a **real** `token_expires_at` (not `2099`), and the correct `destination_id` (IG Business Account id).
3. A `c.client_channel` row (platform `instagram`) exists with provenance (`ig_user_id`, `page_id`, `scopes`, `connected_at`) — **no raw token duplicated there**.
4. The subsequent supervised `limit=1` re-test (separate, PK-gated) reaches `container … FINISHED` and publishes exactly one post with correct `destination_id`, and the immediate re-invoke throttles on `min_gap`.

## 3. Scope of work

### A) Migration (`Invegent-content-engine` → `supabase/migrations/`) — new RPC `store_instagram_token`
Mirror `store_facebook_page_token` (`SECURITY DEFINER`, `search_path public,c`, `UPDATE … WHERE client_id AND platform`, `RAISE` if not found) **plus**: set `destination_id`, and upsert a `c.client_channel` provenance row. Reference implementation (CCD to finalise as the migration file):

```sql
CREATE OR REPLACE FUNCTION public.store_instagram_token(
  p_client_id        uuid,
  p_page_access_token text,
  p_page_id          text,            -- FB Page id backing the IG account
  p_destination_id   text,            -- IG Business Account id (ig_user_id) used by the publisher
  p_page_name        text,
  p_token_expires_at timestamptz DEFAULT NULL,
  p_ig_username      text DEFAULT NULL,
  p_scopes           text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','c'
AS $fn$
DECLARE v_expires timestamptz := COALESCE(p_token_expires_at, NOW() + INTERVAL '60 days');
BEGIN
  UPDATE c.client_publish_profile
     SET page_access_token = p_page_access_token,
         page_id           = p_page_id,
         destination_id    = p_destination_id,
         page_name         = p_page_name,
         token_expires_at  = v_expires
   WHERE client_id = p_client_id AND platform = 'instagram';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No instagram client_publish_profile for client_id=%', p_client_id;
  END IF;

  -- Provenance (no raw token here). UPDATE-then-INSERT (do not assume a unique constraint on (client_id,platform)).
  UPDATE c.client_channel
     SET handle = COALESCE(p_ig_username, handle), is_enabled = true,
         config = jsonb_strip_nulls(COALESCE(config,'{}'::jsonb) || jsonb_build_object(
                    'ig_user_id', p_destination_id, 'page_id', p_page_id,
                    'scopes', p_scopes, 'connected_at', NOW(), 'token_expires_at', v_expires)),
         updated_at = NOW()
   WHERE client_id = p_client_id AND platform = 'instagram';
  IF NOT FOUND THEN
    INSERT INTO c.client_channel (client_id, platform, handle, is_enabled, config, created_at, updated_at)
    VALUES (p_client_id, 'instagram', p_ig_username, true,
            jsonb_strip_nulls(jsonb_build_object('ig_user_id', p_destination_id, 'page_id', p_page_id,
              'scopes', p_scopes, 'connected_at', NOW(), 'token_expires_at', v_expires)), NOW(), NOW());
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.store_instagram_token(uuid,text,text,text,text,timestamptz,text,text) TO service_role;
```
Pre-flight (CCD): confirm `c.client_channel` column set is `{client_channel_id, client_id, platform, handle, is_enabled, config, created_at, updated_at}` (verified 2026-05-24) and that `client_channel_id` has a default (uuid). Adjust the INSERT if not.

### B) Dashboard (`invegent-dashboard`) — new routes (mirror the Facebook flow)
- **`app/api/instagram/auth/route.ts`** — mirror `app/api/facebook/auth/route.ts`, but:
  - `scope = ["instagram_basic","instagram_content_publish","pages_show_list","pages_read_engagement"].join(",")` (add `pages_manage_posts` only if one consent should also cover FB — otherwise keep minimal).
  - `redirect_uri = ${origin}/api/instagram/callback`.
  - Same `https://www.facebook.com/v21.0/dialog/oauth`, `client_id=META_APP_ID`, `state=base64url({clientId, ts})`.
- **`app/api/instagram/callback/route.ts`** — mirror `app/api/facebook/callback/route.ts` steps 1–3 (state → code → short-lived → long-lived user token), then:
  - Step 4: `GET /v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}` (request the IG account inline).
  - Single page: resolve `ig = page.instagram_business_account`. **If `ig` is null → redirect `/connect?error=This Page has no linked Instagram Business account`.** Else call `store_instagram_token(clientId, page.access_token, page.id, ig.id, page.name, tokenExpiresAt, ig.username, "<scopes>")` and redirect success.
  - Multiple pages: reuse/extend the existing `/connect/select-page` picker + `fb_page_picker` cookie pattern, carrying `instagram_business_account` per page; the picker's store step must call `store_instagram_token` (not the FB RPC). (For Invegent/CFW, single-page is the likely path — but build multi-page correctly.)
  - Token expiry: store whatever Meta returns (`expires_in`); page tokens derived from a long-lived user token are typically long-lived — that's fine and is the point (replaces the `2099` sentinel with a real value or a genuine long-lived token).
- **Button:** already points to `/api/instagram/auth?client_id={uuid}` — no change needed once the route exists.

### C) Meta App / env preconditions (PK / CCD verify before deploy)
- `META_APP_ID`, `META_APP_SECRET` set in the dashboard's Vercel project (the FB flow already relies on these).
- Register `https://dashboard.invegent.com/api/instagram/callback` under the Meta App → Facebook Login → **Valid OAuth Redirect URIs**.
- `instagram_basic` + `instagram_content_publish` are usable in **development mode** for users with an app role; Invegent/CFW are PK's own assets with PK as app admin, so **Meta App Review is NOT a blocker for the internal-client reconnect**. (External clients still require the Phase 1.6 review — unchanged.)

## 4. Out of scope / do NOT
- Do **not** modify the Facebook, LinkedIn, or YouTube routes/RPCs.
- Do **not** touch the `instagram-publisher` Edge Function (v2.2.0 stays as deployed).
- Do **not** enable cron 53/64, flip `publish_enabled`, touch NDIS-Yarns/Property Pulse, drain the backlog, or touch dead rows.
- Do **not** store the raw access token in `c.client_channel.config` (token lives only in `c.client_publish_profile.page_access_token`).

## 5. Governance & sequencing
1. CCD builds on a branch (multi-repo coordinated change + credential flow ⇒ branch+PR, not direct-push).
2. **D-01 (`ef_deploy`/`config_change`) before:** (a) applying the migration, and (b) deploying the dashboard. CCH reviews scope (only `app/api/instagram/**` added; FB/LinkedIn/YT untouched; migration adds only the new function).
3. Migration applied via **Supabase `apply_migration`** (chat/CCH) — the only correct path for DDL. **Not** `execute_sql`, not CLI push.
4. Dashboard deploys via Vercel on PR merge to main.
5. After deploy: PK reconnects **Invegent first** → CCH read-only verification → supervised `limit=1` re-test (per `ig-v2.1.0-deploy-test.md`, `timeout_milliseconds ≥ 180000`, abort gates incl. `100/33` and `9007` recurrence). CFW reconnect only after Invegent re-test is clean.

## 6. Acceptance criteria
- IG Reconnect completes consent → `/connect?success` (no 404).
- Reconnected IG profile: fresh `page_access_token`, real `token_expires_at`, `destination_id` = resolved IG Business Account id (for Invegent, expect `17841478620496802` — flag if different).
- `c.client_channel` row (platform `instagram`) present with provenance; no raw token in it.
- Supervised re-test: `container … FINISHED` logged; exactly one publish; `destination_id` matches profile; immediate re-invoke → `throttled`/`min_gap`, no second publish. (This also finally validates RE-A cap/gap throttle.)
- No change to FB/LinkedIn/YT connections, crons, or NY/PP state.

## 7. Failure branches (post-deploy)
- **`100/33` persists** on a freshly-scoped token ⇒ token-scope hypothesis falsified ⇒ systemic status-read issue ⇒ CCD EF adjustment (initial delay + bounded retry on the status GET, and/or read `status_code` only) + new D-01.
- **`9007` returns** (poll passes, publish rejects) ⇒ image media specifics (dimensions/colour-profile) ⇒ image-worker/EF follow-up + D-01.
- **Page has no linked IG Business account** ⇒ data/setup issue on Meta side, not code ⇒ PK links the IG account to the Page in Meta Business settings.

## 8. References
- `supabase/functions/instagram-publisher/index.ts` @ v2.2.0 (commit `90602787`) — publish + `pollContainerReady`.
- `invegent-dashboard`: `app/api/facebook/auth/route.ts`, `app/api/facebook/callback/route.ts`, `app/api/facebook/select-page/` (mirror template).
- DB: `public.store_facebook_page_token` (pattern), `public.store_linkedin_org_token` / `store_youtube_channel_token` (per-platform precedent).
- Diagnosis: `100/33` on `GET /{container_id}`; tokens `EAAu…`, `token_expires_at=2099` sentinel, no `c.client_channel` rows.
