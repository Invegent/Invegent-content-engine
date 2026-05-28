# cc-0020 Stage 5 — Live Gmail Execution (SCOPING / EXECUTION PLAN ONLY)

**Status:** SCOPING AUTHORED (non-mutating). **NOT EXECUTED. NOT APPLIED. NOT DEPLOYED. NO OAUTH/TOKEN/GMAIL ACTION.**
**Authored:** 2026-05-28 Sydney
**Author:** CCD (laptop terminal Claude Code) under PK directive (post-v3.16 merge `883cbf72`)
**Parent brief:** [`docs/briefs/cc-0020-subscription-email-ingest.md`](../cc-0020-subscription-email-ingest.md) §3 row "5 — LIVE Gmail path"
**Predecessor stages (live in production at session start):** Stage 0 discovery (closed); Stage 1 parser+fixtures+Deno tests; Stage 2/2a/2b migration draft → applied as `20260527114041`; Stage 3 fixture-only ingest scaffold; Stage 3a DB-layer validation closed (PGlite 37/37); Stage 4-A dashboard UI + Stage 4-B service-role RPC routes live at `dashboard.invegent.com/system/subscriptions`; Stage 4-C grants hotfix `20260527114333` live (service_role + postgres only). Reconciliation v2 merged on `main` via PR #4 / merge commit `883cbf72`.
**Constraint of authorship:** this document was produced with **0 OAuth action, 0 Gmail/token access, 0 Pub/Sub creation, 0 EF deploy, 0 cron activation, 0 DB write, 0 migration, 0 production mutation, 0 D-01.** It only reads docs, repo files, and `m.chatgpt_review` was NOT queried.

> **The destructive Stage 5 execution remains FUTURE/GATED.** This artefact is the *execution plan* only. Before any unit ships, the **per-unit gates in §6** MUST be satisfied (each unit fires its own D-01 + PK exact approval phrase + the prerequisite verifications). Nothing here implies, infers, or pre-authorises any of those gates.

---

## 1. Stage objective

End-to-end objective: enable cc-0020 to **ingest subscription-billing emails from PK's Gmail mailbox into `k.subscription_import_candidate`** on an automated cadence, so that PK's dashboard review surface (`/system/subscriptions` Stage 4-A/4-B) is populated by live data rather than fixtures — **without** storing email bodies, leaking OAuth tokens, or breaching the cc-0020 idempotency/privacy contracts.

Stage 5 is **the smallest end-to-end live wiring** that closes the loop:
1. obtain a Gmail OAuth refresh-token for PK's mailbox (one-time, manual);
2. deploy `supabase/functions/subscription-email-ingest` with the fixture-only `gmail` mode replaced by a real Gmail fetch behind a feature flag (default OFF);
3. on first live invoke, ingest a tiny smoke window (≤24 h, ≤N messages) with the dashboard review surface gated behind PK eyes-on; only after that smoke passes does the cron/Pub-Sub trigger activate.

Anti-goals:
- No bulk historical backfill in Stage 5 (deferred to a later "Stage 6 — backfill window" brief).
- No new schema (`k.*` is final for v1; any new column = a v1.1 migration outside Stage 5).
- No second mailbox (Stage 5 is PK's primary mailbox only — multi-mailbox is out-of-scope).
- No dashboard UI changes (4-A/4-B already consume the RPCs; they will just see real rows where they currently see zero).

---

## 2. Exact entry criteria (from v3.16, plus Stage 5 prerequisites)

Stage 5 may only **begin scoping** (this artefact) after each of the v3.16 closures hold AND the per-unit prerequisites below are confirmed before that unit fires.

### v3.16 closure facts (entry baseline)

| # | Fact | Source / verification |
|---|---|---|
| E-1 | PR #4 / v3.16 docs reconciliation merged on `main` | merge commit `883cbf72deec562edeb175f2179164773eb8ab43` on `origin/main`; verified via `git ls-remote origin main` |
| E-2 | Migrations `20260527114041` (tables) + `20260527114144` (read RPCs) + `20260527114333` (security hotfix) applied to prod `mbkmaxqhsohbtwsqolns` | `supabase/migrations/` canonical files + applied-prod banners; tables `k.subscription_import_candidate` + `k.subscription_spend_event` exist |
| E-3 | RPC EXECUTE = service_role + postgres only | `supabase/migrations/20260527114144_*.sql` lines 269–286 + `20260527114333_*.sql` lines 16–19 |
| E-4 | Dashboard Stage 4-A UI + Stage 4-B service-role RPC routes live | `dashboard.invegent.com/system/subscriptions` (per v3.16 carry); not in this repo |
| E-5 | Stage 5 wall (Gmail OAuth + Pub/Sub + EF deploy + cron) **intact** | this artefact does NOT relax the wall; it only plans the controlled relaxation |
| E-6 | Repo↔prod migration-history reconciliation v2 mainlined | merge `883cbf72` parent path includes `fa2aefc`; tombstone slots permanent |
| E-7 | cc-0020 governance trail acknowledged with residuals G1 (`6d9a4bd3` close-the-loop never recorded) + G2 (`114333` hotfix has no D-01) | v3.16 carries; **these residuals are NOT a Stage 5 blocker** because the safety property (RPC EXECUTE service_role+postgres only) is verified correct — but the gate flow in §6 records each residual where relevant |

### Stage 5 prerequisites that must be re-verified at the start of each unit

| Pre | Requirement | Check |
|-----|-------------|-------|
| P-1 | An OAuth client (Google Cloud project) exists with **Production publishing status** and the **`https://www.googleapis.com/auth/gmail.readonly`** scope authorised | discovery + Console screenshot ref — recorded in §6 U-A1's pre-flight |
| P-2 | A refresh token has been minted by PK in a one-shot manual flow, with `access_type=offline` + `prompt=consent` | F-YT-OAUTH-TESTING-MODE lesson v3.05 applies: **Google "Testing" mode caps refresh tokens to 7 days** — verify Production status before counting on durability |
| P-3 | Supabase Edge-Function secrets exist for the new function (`SUBSCRIPTION_GMAIL_REFRESH_TOKEN`, `SUBSCRIPTION_GMAIL_CLIENT_ID`, `SUBSCRIPTION_GMAIL_CLIENT_SECRET`, `SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST`, `SUBSCRIPTION_GMAIL_INGEST_ENABLED`) | `supabase secrets list` (dry run; no read of values) |
| P-4 | The function's repository layer is wired to the `service_role` Supabase client and the existing `INSERT … ON CONFLICT (gmail_message_id) DO NOTHING` semantics in `repository.ts` lines 25–33 | code change is part of U-B; verify on each branch push |
| P-5 | At least 14 production days of stable Stage 4-A/4-B operation have elapsed before automated cron is turned on | mirror cc-0016 Stage E's ≥14-day operational maturity rule (parent brief Stage E §6) |

If any prerequisite fails, the corresponding unit holds; CCD does not improvise around a failed prerequisite.

---

## 3. Components touched (per unit; complete list)

### Code
- `supabase/functions/subscription-email-ingest/gmail.ts` — replace the fail-closed stub with a real `fetchSubscriptionEmails()` that mirrors `supabase/functions/email-ingest/index.ts` (the existing newsletter ingest function — already does refresh-token → access-token → `messages.list` → `messages.get`). Privacy filter applied **before any payload leaves the function**: drop bodies, keep only the structured RawEmailInput fields.
- `supabase/functions/subscription-email-ingest/repository.ts` — add `ServiceRoleIngestRepository` implementation (currently only `InMemoryIngestRepository` exists; the SQL templates `CANDIDATE_UPSERT_SQL` + `SPEND_EVENT_UPSERT_SQL` already exist as documentation-only constants at lines 25–42 and become the actual prepared statements).
- `supabase/functions/subscription-email-ingest/index.ts` — replace the in-memory repo with the service-role repo when `mode='gmail'`; keep `mode='manual'` fixture path intact for parity testing.
- `supabase/functions/subscription-email-ingest/gmail_fetch.ts` (NEW, optional) — keep the live-Gmail path in a separate module from `gmail.ts` (which currently documents the fail-closed contract) so reviewers can diff one module rather than re-reading the safety stub. Decision deferred to U-A1 design review.
- `supabase/functions/subscription-email-ingest/types.ts` (NEW, optional) — extract the shared `RawEmailInput` and result types if `index.ts` grows beyond ~80 lines after the live wiring (style guard, not load-bearing).

### Config
- Supabase Edge-Function secrets (env): `SUBSCRIPTION_GMAIL_REFRESH_TOKEN`, `SUBSCRIPTION_GMAIL_CLIENT_ID`, `SUBSCRIPTION_GMAIL_CLIENT_SECRET`, `SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST` (comma-separated domains; e.g. `paypal.com,stripe.com,…`), `SUBSCRIPTION_GMAIL_INGEST_ENABLED` (the existing flag in `gmail.ts:27`, default OFF).
- Supabase cron (`cron.job`) — a new entry e.g. `subscription-email-ingest-hourly` invoking the deployed function via `net.http_post` (Stage 5 default cadence: **hourly during smoke, then 4×/day after maturity**; tighter than Pub/Sub but simpler to disable).
- Google Cloud Pub/Sub — **deferred to Stage 5b** (only if cron polling proves inadequate). v1 uses cron polling against `messages.list` with a `Date.now()-1h` filter; no Pub/Sub subscription / Gmail Watch needed.

### Data
- Inserts into `k.subscription_import_candidate` ONLY. No writes to `k.subscription_spend_event` (those happen via the existing `public.review_subscription_candidate(uuid,text,uuid)` RPC when PK reviews in the dashboard — Stage 5 does NOT modify the review path).
- No writes to `k.subscription_register` (untouched by lane design).

### Out-of-scope components (kept verbatim from parent brief §6)
- `c.client_channel.config` — NOT a place to store Gmail tokens; this lane uses Edge-Function secrets directly.
- `m.subscription_*` — not a schema in this lane.
- Dashboard UI — no edits; the existing `/system/subscriptions` Tabs + RPCs consume the live data automatically.
- `friction.*` — orthogonal lane; no cross-mutation.

---

## 4. Sequencing plan by unit

Stage 5 splits into **6 small units, A through F**. Each is independently gated; each can hold without breaking the prior. Order is forced (A → B → C → D → E → F); do not run B before A's gate closes.

### U-A — Gmail OAuth client + refresh token (one-time, MANUAL by PK)

**What:** PK creates / verifies the Google Cloud OAuth client; PK runs a one-shot consent flow to mint a `1//...` refresh token; PK records the token in Supabase Edge-Function secrets.

**CCD role:** authoring & verification only. CCD does NOT touch OAuth, does NOT see tokens, does NOT write secrets.

**Output:**
- Google Cloud project ID + OAuth client ID recorded (NOT the secret) in this brief's "Authoring trail" section as proof of provenance.
- Verification that the OAuth app's publishing status is **Production** (per F-YT-OAUTH-TESTING-MODE — v3.05 lesson).
- A redacted confirmation from PK: "refresh token minted, stored in Supabase secrets as `SUBSCRIPTION_GMAIL_REFRESH_TOKEN`."
- **Sender allowlist** (`SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST`) seeded with PK's confirmed list of subscription-billing senders.

**Why this unit is first:** without a refresh token, no further unit can be tested live. And token minting is a manual PK operation that CCD cannot proxy.

### U-B — Live `gmail.ts` implementation + service-role repository

**What:** CCD implements `fetchSubscriptionEmails()` as a real-but-bounded Gmail fetch (mirroring `supabase/functions/email-ingest/index.ts` lines 18–51 patterns) and a `ServiceRoleIngestRepository` implementing `IngestRepository` against Supabase Postgres via the service-role key.

**Boundaries on the live fetch:**
- Query: `messages.list?q=from:({allowlist}) newer_than:1d&maxResults=25` — narrow window, capped result count.
- Per-message: `messages.get?format=metadata&metadataHeaders=From,Subject,Date` ONLY — **no `format=full`, never any body**. The parser must operate on metadata + the subject line + the structured-data extraction path it already uses on fixtures.
- ⚠️ If the parser fundamentally requires body content for any real vendor email, that's a Stage 5 blocker — surface it before deploy, never silently fetch bodies.
- Sender-domain allowlist enforced post-fetch: any message whose `From:` domain is not in `SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST` is dropped (defence-in-depth — Gmail's `q=from:` is the primary filter).
- `SUBSCRIPTION_GMAIL_INGEST_ENABLED` flag (already in `gmail.ts:27`) gates the live path — defaults OFF and remains OFF until U-D PK approval.

**ServiceRoleIngestRepository:**
- Uses `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` and the existing prepared-statement SQL in `repository.ts` lines 25–33 (`CANDIDATE_UPSERT_SQL`) and 36–42 (`SPEND_EVENT_UPSERT_SQL`) — these constants stop being "documentation only" and become the actual queries.
- Service-role bypasses RLS on `k.*` (deny-by-default for anon/authenticated remains intact).
- Service-role key is read from Edge-Function env, never logged.

**Output:** branch-only code changes; `deno test` still GREEN against fixtures (the fixture path is unchanged); no deploy yet.

### U-C — Edge-Function deploy (DISABLED state)

**What:** `supabase functions deploy subscription-email-ingest --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns`.

**Critical:** the deployed function has `SUBSCRIPTION_GMAIL_INGEST_ENABLED=false` (or unset). Invoking it returns the existing fail-closed result; nothing reads Gmail. This is a **safe-deploy** unit — the function lands but cannot do anything yet.

**Reason for separating C from D:** verifying the deploy went through, the function is reachable, and `mode='manual'` still works on a fixture payload is a clean smoke that does NOT touch Gmail.

**Output:** function version `subscription-email-ingest-v1.0.0-disabled` live; `mode='manual'` invoke returns expected counts; `mode='gmail'` invoke returns `gmail_fetch_disabled`.

### U-D — First live smoke (≤24 h window, ≤10 messages, dashboard eyes-on)

**What:** PK flips `SUBSCRIPTION_GMAIL_INGEST_ENABLED=true`. PK manually invokes the function ONCE with `mode='gmail'` (no cron yet). The function reads metadata for at most 10 messages from the last 24 h, runs the parser, and idempotently inserts candidates.

**Verification path:** PK opens `dashboard.invegent.com/system/subscriptions` → Import Candidates tab → confirms candidates appeared with sensible vendor/amount/date; OR clicks the rows that came in.

**Smallest blast radius:** this is the recommended **first live smoke design** (see also §9).

**Output:** between 0 and 10 new rows in `k.subscription_import_candidate`; nothing in `k.subscription_spend_event` yet (those only land on PK's accept action via the dashboard RPC, which is unchanged).

**Hold conditions:** if even one of those 10 messages parses with `confidence < MIN_CANDIDATE_CONFIDENCE` (per `parser.ts`), the row is skipped (counted as `low_confidence_skipped`) — that's expected behaviour, not a hold. A hold IS triggered if a candidate row arrives with PII in `vendor_raw`/`vendor_normalised`/`source_subject` that exceeds the privacy contract, OR if the function logs anything resembling a token / refresh_token / body content.

### U-E — Cron activation (`cron.job` schedule)

**What:** Apply a small migration (`cc_0020_e_stage_5_cron_subscription_ingest`) to register a `cron.job` entry: `subscription-email-ingest-hourly` calling `net.http_post(…function-url…, body={"mode":"gmail"})`.

**Cadence:** start at hourly during the first 7 production days, then taper to 4×/day (every 6 h) after operational maturity. Cadence change is config, not code.

**Pre-conditions:** U-D smoke green for ≥48 h with PK eyes-on at least one cycle; no privacy holds.

**Output:** automated subscription-email ingestion live; new candidates surface in the dashboard without operator action.

### U-F — Pub/Sub trigger (DEFERRED — Stage 5b)

**What:** If cron polling proves inadequate (latency complaint, missed messages, or PK directs), implement Gmail `users.watch` + a Pub/Sub topic + a Cloud Run / Supabase Edge-Function HTTP push subscriber.

**This unit is NOT planned for Stage 5 v1.** It is named here only to declare scope and ensure cron is treated as the v1 trigger.

**Defer reason:** Pub/Sub requires GCP project + topic + subscription + Gmail `users.watch` quota work (≤7-day watch renewals) + HTTP push auth — substantial extra surface for a workflow whose latency floor (hourly cron) is already operator-acceptable for a *historical* ledger.

---

## 5. Verification checklist (per unit + cumulative)

Each unit has its own V-checks; the smoke unit U-D is the heaviest.

### U-A V-checks
- V-A1: OAuth client exists in Google Cloud with publishing status **Production** (NOT Testing).
- V-A2: Scope = `https://www.googleapis.com/auth/gmail.readonly` ONLY (no `.modify`, no `.send`, no `.compose`).
- V-A3: Refresh token stored as `SUBSCRIPTION_GMAIL_REFRESH_TOKEN` in Supabase secrets via `supabase secrets set …` (PK runs this; CCD never sees the value).
- V-A4: `SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST` populated (e.g. `paypal.com,stripe.com,github.com,…`) with PK's confirmed list.
- V-A5: PK confirms the OAuth screen explicitly read "Production" before consent — not "Testing".

### U-B V-checks (code-level; no live invoke)
- V-B1: `deno test` GREEN — all existing fixture tests still pass (the manual path is unchanged).
- V-B2: New unit test for `ServiceRoleIngestRepository` against a PGlite or transactional fixture (real-PG; does NOT touch prod). The test must prove `ON CONFLICT (gmail_message_id) DO NOTHING` semantics: re-ingest of the same `gmail_message_id` returns `inserted: false`.
- V-B3: Static check — grep the function source for `format=full`, `.body`, `payload.body`, `messages\\.get.*format=full`. Zero hits required.
- V-B4: Static check — grep for any reference to `refresh_token`, `access_token`, `Bearer ` in `console.log`, `JSON.stringify`, or error throws. Zero hits required (defence: token never leaves the function).
- V-B5: TypeScript strict mode passes (`deno check`).

### U-C V-checks (deploy-only; no live Gmail)
- V-C1: `supabase functions list` shows `subscription-email-ingest` deployed at the new version.
- V-C2: `GET <function-url>` (or fixture-mode POST `{"mode":"manual","emails":[]}`) returns `{ok: true, version: "subscription-email-ingest-v1.0.0-disabled", mode: "manual", messages_seen: 0, …}`.
- V-C3: POST `{"mode":"gmail"}` returns `{ok: false, error: "gmail_fetch_disabled: …"}` (the flag is OFF).
- V-C4: Function logs show NO outbound HTTPS to `gmail.googleapis.com` during V-C2 + V-C3.
- V-C5: `SUBSCRIPTION_GMAIL_INGEST_ENABLED` is verifiably absent or `false` in the function's runtime env (PK confirms via Supabase dashboard).

### U-D V-checks (first live smoke; PK eyes-on)
- V-D1: PK flips `SUBSCRIPTION_GMAIL_INGEST_ENABLED=true`; CCD confirms function logs the flag flip (NOT the value, just the transition).
- V-D2: PK invokes ONCE with `mode='gmail'`. Function returns `{ok: true, mode: 'gmail', messages_seen: N (0 ≤ N ≤ 10), candidates_created, duplicates_skipped, low_confidence_skipped, errors: 0}`.
- V-D3: PK confirms in dashboard `/system/subscriptions` → Import Candidates tab that the new rows look right (vendor, amount, date in PK's expected range).
- V-D4: Function logs grep for `body`, `text/plain`, `text/html`, `payload.parts`. Zero hits required.
- V-D5: Function logs grep for `Authorization: Bearer`, `refresh_token=`, `client_secret=`. Zero hits required.
- V-D6: Re-invoke ONCE more with the same window. Expect `duplicates_skipped` to equal the prior `candidates_created` (proves ON CONFLICT works against the live DB; this is the live equivalent of V-B2).
- V-D7: `SELECT count(*) FROM k.subscription_spend_event;` returns the same number as before U-D (the ledger MUST be unchanged — only candidates are created in U-D; ledger promotion is the dashboard's review-RPC path).
- V-D8: Flip `SUBSCRIPTION_GMAIL_INGEST_ENABLED=false`. Re-invoke `mode='gmail'`. Confirm `{ok: false, gmail_fetch_disabled}` again.

### U-E V-checks (cron)
- V-E1: `SELECT jobname, schedule, active FROM cron.job WHERE jobname='subscription-email-ingest-hourly'` returns 1 row, `active=true`.
- V-E2: Wait for one natural fire; confirm a new row in `cron.job_run_details` with `status='succeeded'`.
- V-E3: Confirm the new natural-fire ingest produced new candidates OR was idempotent (duplicates_skipped > 0). Never `errors > 0`.
- V-E4: Confirm `SUBSCRIPTION_GMAIL_INGEST_ENABLED` is still `true` and not silently flipped.

### Cumulative privacy V-check (every unit)
- V-PRIV: at the end of each unit, grep the function source + function logs + DB rows for any of: `body`, `text/plain`, `text/html`, `Bearer `, `refresh_token`, `1//[A-Za-z0-9_-]{40,}`, `client_secret`. Zero hits required across all four surfaces.

---

## 6. D-01 / PK gates per unit

| Unit | Gate fire | Action type | requires_pk_escalation | PK approval phrase template |
|------|-----------|-------------|------------------------|------------------------------|
| U-A  | none in `m.chatgpt_review` (manual PK Google Cloud Console operation); record PK verbal confirmation in the session note + this brief's authoring trail | n/a | n/a | `PK confirms: SUBSCRIPTION_GMAIL_REFRESH_TOKEN minted (Production status), <YYYY-MM-DD>` |
| U-B  | **plan_review** D-01 (per protocol — non-mutating code change being prepared for deploy) | `plan_review` | false (clean code-review gate) | n/a (review-only; no apply) |
| U-C  | **ef_deploy** D-01 (production EF deploy of a previously inert function; deploy is the mutation) | `ef_deploy` | **true** (first deploy of a Gmail-touching function — even in disabled state, lesson v3.09 / v3.10 precedent) | `PK APPROVES cc-0020 STAGE 5 U-C DEPLOY (subscription-email-ingest v1.0.0-disabled; SUBSCRIPTION_GMAIL_INGEST_ENABLED=false)` |
| U-D  | **2-step**: (1) **ops_change** D-01 for the env-flag flip (`SUBSCRIPTION_GMAIL_INGEST_ENABLED=false→true`); (2) **first_live_invoke** explicit PK approval phrase for the smoke invoke | `ops_change` then verbal | **true** for both | (1) `PK APPROVES cc-0020 STAGE 5 U-D FLAG FLIP — enable Gmail fetch for smoke window only` ; (2) `PK APPROVES cc-0020 STAGE 5 FIRST LIVE INVOKE — newer_than:1d, maxResults:10` |
| U-E  | **sql_destructive** D-01 (cron migration is DDL/`cron.schedule` mutation) | `sql_destructive` | **true** (cron activation = automated recurring side-effects against PK's mailbox) | `PK APPROVES cc-0020 STAGE 5 U-E CRON — subscription-email-ingest-hourly, <cadence>` |
| U-F  | DEFERRED — Stage 5b would fire its own ef_deploy + topic-creation gates | — | — | — |

**Close-the-loop discipline (every D-01 fired):** every review row must be re-opened post-action and updated with `status=completed`, `resolved_by` set, `escalation_resolved_at` set — directly addressing residual G1 from v3.16 (`6d9a4bd3` was never closed in-row; Stage 5 will not replicate that pattern).

**Governance dependencies (carries from v3.16 that intersect Stage 5):**
- **Residual G1:** the `6d9a4bd3` close-the-loop for the cc-0020 Stage 4-A/4-B apply needs a separate PK confirmation + DB write. Stage 5 does NOT depend on G1 being closed first (the live grant posture is verified correct), but **PK may choose to close G1 as a prerequisite to Stage 5 starts** purely to keep the governance trail clean. PK's call.
- **Residual G2:** the `20260527114333` security hotfix has no D-01 row. Same as G1 — not a Stage 5 blocker, but PK may choose to fire a retrospective governance row as a prerequisite. PK's call.

---

## 7. Rollback / disable plan (per unit + global kill switch)

### Global kill switch (works at any point post-U-C)

```
supabase secrets set SUBSCRIPTION_GMAIL_INGEST_ENABLED=false --project-ref mbkmaxqhsohbtwsqolns
```

This **immediately and durably disables the live Gmail fetch** (the flag check at `gmail.ts:27` short-circuits before any OAuth/network operation). The function continues to return `{ok: false, gmail_fetch_disabled: …}` for `mode='gmail'`. **No code change, no migration, no deploy needed** to kill the live path. This is the single most important property of Stage 5's design.

Additionally, the cron entry (U-E) can be disabled in one statement:

```sql
SELECT cron.unschedule('subscription-email-ingest-hourly');
-- OR (less destructive, easier re-enable):
UPDATE cron.job SET active=false WHERE jobname='subscription-email-ingest-hourly';
```

### Per-unit rollback

| Unit | Rollback | Side-effects to expect |
|------|----------|------------------------|
| U-A  | PK revokes the OAuth refresh token in Google Account → Security → Third-party access. Any future Gmail fetch returns `invalid_grant`. | None on `k.*` tables; ingest function returns `errors` until the flag is flipped to OFF (which is the global kill switch). |
| U-B  | `git revert <U-B SHA>` on branch; redeploy U-C with the inert version | None — code was never live without the flag. |
| U-C  | `supabase functions deploy subscription-email-ingest --no-verify-jwt` against the prior version, OR `supabase functions delete subscription-email-ingest` | Function disappears or reverts to prior version. `k.*` untouched. |
| U-D  | Flip flag OFF (above). Future invokes are `gmail_fetch_disabled` again. Any rows already in `k.subscription_import_candidate` are **NOT** auto-deleted — that's a PK decision (most likely they stay, since they came from real billing emails; review/reject via the dashboard if any are unwanted). | Already-ingested candidates persist; only future fetches are stopped. |
| U-E  | `cron.unschedule('subscription-email-ingest-hourly')` OR `UPDATE cron.job SET active=false` | Future fires stop; in-flight fires complete; nothing in-flight is rolled back. |

### What is NOT rollable
- A spend event already promoted via the dashboard `public.review_subscription_candidate(uuid,text,uuid)` RPC. That's not a Stage 5 mutation (it's an operator action), so it's not Stage 5's to roll back.
- A real Gmail message read. Once read, it is read; the only mitigation is the **metadata-only** fetch (V-B3 guarantee) so no body ever crossed the network in the first place.

---

## 8. Explicit out-of-scope list

Stage 5 v1 **does NOT** do, and a follow-on brief is required for any of:

1. **Bulk historical backfill** — ingesting older than 24 h. Deferred to "Stage 6 — backfill window" (separate brief; would require explicit window dates + PK approval + a one-shot cron + a far higher message cap).
2. **Body-content parsing** — `messages.get?format=full`, `payload.parts`, MIME walks, attachment downloads. Stage 5's metadata-only is a hard contract.
3. **Multi-mailbox** — PK's other mailboxes, second Google account, Microsoft 365 ingest. Each is a separate lane.
4. **Gmail `users.watch` / Pub/Sub** — see U-F (deferred to Stage 5b).
5. **Schema changes** — `k.subscription_import_candidate` / `k.subscription_spend_event` are final for v1. Any new column = a v1.1 migration outside Stage 5 (e.g. a `content_hash` secondary idempotency signal — already noted as Stage 5 future in parent brief §3a).
6. **Dashboard UI changes** — `/system/subscriptions` already consumes the RPCs; Stage 5 produces rows, the UI shows them.
7. **`k.subscription_register` mutations** — register is current-state-only and lane-OFF-LIMITS (parent brief §1).
8. **Email auto-categorisation / vendor matching** — `matched_subscription_id` left NULL on insert; dashboard review-RPC handles match decisions. Auto-matching = separate brief.
9. **Cron cadence < hourly** — sub-hourly polling is operationally noisy for a historical ledger; deferred.
10. **Pub/Sub `users.watch` quota / renewal automation** — Stage 5b only.
11. **Any cross-talk with the Instagram / cc-0019 / cc-0015 lanes** — lane isolation per parent §6.

---

## 9. Recommended "first live smoke" design (smallest blast radius)

The **smallest possible first live action** that proves the end-to-end path works without committing to durable automation:

### Smoke parameters
- **Time window:** `newer_than:1d` (last 24 h only)
- **Message cap:** `maxResults: 10`
- **Sender filter:** `q=from:({SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST})` — Gmail-side filter, not in-memory
- **Format:** `format=metadata&metadataHeaders=From,Subject,Date` (no body, ever)
- **Mode:** `mode='gmail'` ONE invoke (no cron)
- **Trigger:** PK manually invokes via `curl` or the Supabase dashboard "Invoke" button — NOT cron
- **Result-acceptance:** PK opens dashboard `/system/subscriptions` → Import Candidates tab → eyeballs the new rows
- **Flag posture:** `SUBSCRIPTION_GMAIL_INGEST_ENABLED=true` for the duration of the smoke (one invoke), then **PK flips it back to `false`** before walking away
- **Rollback:** zero-effort (the flag flip back to OFF is the rollback; the rows already ingested are real subscription billing data and stay)

### Why this is the smallest blast radius
- Window is 24 h: at most one day's worth of billing emails, typically 0–3 messages.
- Cap is 10: a hard limit on row inserts even if the allowlist matches a noisy sender.
- Metadata-only: no body crosses the network; no privacy contract violation is possible from the Gmail side.
- One invoke: no cron, no recurring fire — PK chooses when to look again.
- Flag flip back to OFF after smoke: between U-D and U-E the system is back in the safe-disabled posture; cron activation (U-E) is its own gate.
- Reversible at every step: no Gmail-side modification (no `messages.modify`, no label changes, no marking-as-read).

### Cumulative effect on prod after smoke
- 0–10 rows in `k.subscription_import_candidate` with `review_status='candidate'`
- 0 rows added to `k.subscription_spend_event`
- 0 changes to `k.subscription_register`
- 0 changes to any RPC, table, RLS, grant, or cron entry
- 0 emails marked as read / labeled / modified in PK's mailbox

### What the smoke proves (in order of importance)
1. The OAuth refresh token works against the Production-mode app (durability ≥1 day; full ≥7-day durability needs the U-E watch period).
2. The metadata-only fetch path is correct (no body crossed the wire).
3. The parser's confidence threshold + sender allowlist correctly classify real billing emails.
4. The ON CONFLICT idempotency works against the real DB (V-D6 re-invoke).
5. The dashboard RPCs surface the new rows without UI change.

### What the smoke does NOT prove
- Cron durability (that's U-E).
- 7-day refresh-token durability (that's a calendar watch — flag-flip the smoke twice over a week).
- Multi-day idempotency at scale (that's normal operation post-U-E).
- Backfill correctness (that's Stage 6).

---

## 10. Splitting Stage 5 into safer units — recommendation

**YES.** Stage 5 is explicitly split into **6 units (A → B → C → D → E → F)** above, with U-F deferred to Stage 5b. The split is the recommendation; the alternative monolithic "do Stage 5" execution would conflate token minting (manual PK), code change (CCD), deploy (production mutation), live invoke (first irreversible Gmail read), cron activation (durable automated mutation), and Pub/Sub plumbing (extra infrastructure surface) into one D-01 with one PK approval phrase. That conflation is exactly the failure mode lessons L62 + v3.05 + v3.09/v3.10 warn against.

The unit split also lets U-A and U-B run in parallel (PK on Google Cloud Console while CCD writes code) without either being a blocker for the other, but it does NOT let any of U-C / U-D / U-E start before its prerequisite unit is verified complete.

Recommended cadence if PK pursues Stage 5 over a single working week:
- Day 1: U-A (PK manual) + U-B (CCD code; plan_review fires CLEAN at EOD)
- Day 2: U-C (CCD deploy; ef_deploy D-01 closed-loop at EOD; **no Gmail read yet**)
- Day 3–4: U-D smoke (PK eyes-on; flag stays ON for the smoke window of minutes, then OFF; PK confirms dashboard rows look right)
- Day 5: hold; observe; review the smoke output; PK decides cron go/no-go
- Day 6–7: U-E (cron activation; sql_destructive D-01 closed-loop; first natural fire watched)

If any unit holds, Stage 5 holds — no domino effect.

---

## 11. Risk notes

| ID | Risk | Mitigation |
|----|------|------------|
| R-1 | Gmail refresh token expires (Production-mode 6-month inactivity rule, or PK revokes consent) | The flag-OFF posture remains the safe default; the function returns `errors` rather than partial reads; cron auto-disables itself on N consecutive errors (future hardening, not v1). |
| R-2 | Sender allowlist false-negative (billing email from a vendor not in the list is missed) | PK reviews dashboard regularly; PK adds vendors to `SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST` over time. No data loss — re-running U-D with the expanded allowlist will pick up the missed emails (within the 24-h window; older needs Stage 6). |
| R-3 | Sender allowlist false-positive (vendor is in the list but the email isn't a billing notice — e.g. a marketing email from PayPal) | Parser confidence threshold `MIN_CANDIDATE_CONFIDENCE` filters; `low_confidence_skipped` counter surfaces these. |
| R-4 | A vendor's billing email format changes; parser produces wrong amount / wrong date | Dashboard review-RPC requires PK to accept each candidate before it lands in the ledger — wrong parses get rejected by PK, no silent ledger corruption. |
| R-5 | Token leak via log line / error trace | V-B4 static check + V-D5 runtime log grep + the `gmail.ts` module never logs the token (only the flag transition). |
| R-6 | Body content leaked via Gmail API misuse (`format=full` slipped in) | V-B3 static check (zero `format=full` allowed) + V-D4 runtime grep. |
| R-7 | Cron fires while ingest function is being upgraded; partial state | Cron entry can be disabled before deploy; cron rows are short single fires (no transaction across fires); idempotency on `gmail_message_id` means a re-fire is a no-op. |
| R-8 | OAuth scope creep (someone widens to `gmail.modify`) | V-A2 + V-B3 (no `messages.modify` references in source) — at the source level the scope cannot be exercised. |
| R-9 | `service_role` key leak via Edge-Function env-dump | Edge-Function env is read at runtime; never echoed; logs include only the flag flip, not the key. |
| R-10 | Stage 4-A/4-B dashboard regression while Stage 5 is in flight | Stage 5 changes ONLY the ingest function + cron + secrets. The dashboard RPCs (`get_subscription_import_candidates`, `get_subscription_spend_events`, `get_subscription_spend_trends`, `review_subscription_candidate`) are byte-stable through Stage 5. |

---

## 12. Open questions for the gate (deferred — NOT decided here)

These questions feed into U-B's plan_review and U-C/U-D/U-E D-01 framings; this document does NOT decide them.

| # | Question |
|---|---|
| OQ-1 | Does PK want `vendor_normalised` improvements (e.g. domain-based mapping) baked into U-B, or deferred to a follow-on v1.1? |
| OQ-2 | Cron cadence: hourly during smoke (recommended) vs daily (more conservative) vs Pub/Sub straight away (heavier)? |
| OQ-3 | Should U-D's smoke be repeated on a 7-day calendar to prove refresh-token durability past the F-YT-OAUTH-TESTING-MODE pattern, before U-E fires? Recommendation: yes (smoke twice in week 1). |
| OQ-4 | Multi-currency: parser already extracts `currency` + ledger has `amount_aud` + `amount_original`. Stage 5 ingest writes `amount_aud=NULL` unless `currency='AUD'`; FX conversion is out-of-scope. PK confirm? |
| OQ-5 | Auto-rejection of candidates older than X days that PK has not reviewed: nice-to-have or noise? Defer to "Stage 7 — review-lifecycle" brief. |
| OQ-6 | Should the function emit a `friction.event` row on `errors > 0` to surface ingest failures in the friction register (the operator-friction surveillance pattern)? Aligns with cc-0015/cc-0017 lane patterns but adds a cross-lane dependency. Defer to PK call. |

---

## 13. Authoring trail and verification provenance

- This document was authored at content-engine `main` = `883cbf72deec562edeb175f2179164773eb8ab43` (PR #4 / v3.16 merge), on a fresh branch `feat/cc-0020-stage-5-scoping` cut from that SHA.
- Read: `docs/briefs/cc-0020-subscription-email-ingest.md` (parent brief, full); `supabase/functions/subscription-email-ingest/{index,gmail,ingest,repository}.ts` (Stage 0–4B function source); `supabase/functions/email-ingest/index.ts` (existing newsletter Gmail-OAuth pattern — Stage 5 mirror); `supabase/migrations/20260527114144_cc_0020_subscription_read_rpcs.sql` lines 269–286 + `20260527114333_cc_0020_subscription_rpcs_revoke_anon_auth.sql` lines 16–19 (RPC grant posture).
- 0 OAuth action. 0 Gmail/token access. 0 Pub/Sub creation. 0 EF deploy. 0 cron activation. 0 DB write. 0 migration. 0 production mutation. 0 D-01 fired by this authorship.
- The Stage 5 destructive gates (§6) are NOT opened by this document.

---

*cc-0020 Stage 5 execution plan v1.0. Authored 2026-05-28 Sydney. Non-mutating spec. No D-01 fired. No approval inferred. Live Gmail / deploy / cron remain future/gated per §6.*
