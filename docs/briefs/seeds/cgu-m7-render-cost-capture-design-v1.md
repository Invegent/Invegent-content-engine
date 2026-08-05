# Scoping Design — M7: Render Monitoring + Cost Capture (CGU Final)

**Created:** 2026-08-05 Sydney · **Author:** foundation-design lane (control-tower dispatch, S2)
**Status:** DESIGN ONLY — non-mutating. **NOT a brief, NOT Gate-1 approved, NOT applied. VERSION-LESS** per PK watch ruling v6.140 (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`) — no register version cut. Zero DB writes, zero deploys, zero code edits performed in producing this doc (one read-only DB query via the allowlisted R0 path — see §9). Every claim is source-cited against local HEAD `a0c932e`.

**Governing acceptance target** (delta audit `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:396`): *"`render_spec` carries a non-null cost/credit value for a sample of recent Creatomate renders; a documented weekly cost figure exists (even if the honest figure today is 'previously unknown, now observed')."* Pure additive logging; **no cap proposed** (delta audit `:470-471`, `:546`).

## 1. Current state — the plumbing already exists end-to-end, and is confirmed dark

This is not a "build the capture" design. The capture code has existed since before this repo's oldest audited record and is **wired, deployed, and running on every render** — it simply never receives a non-null value from Creatomate.

- `pollRender` (`supabase/functions/video-worker/creatomate_submit.ts:43-53`) reads `data.credits` from Creatomate's `GET /v2/renders/{id}` response on `status==='succeeded'`: `creditsUsed: data.credits != null ? Number(data.credits) : null` (`creatomate_submit.ts:49`).
- `creditsUsed` is threaded straight into the `write_render_log` RPC as `p_credits_used` on the success path (`supabase/functions/video-worker/index.ts:1034`), landing in `m.post_render_log.credits_used`.
- The identical pattern exists in `image-worker` (confirmed by the column-purpose audit below), and the column is already exposed read-only via `ice_ro.render_status` (`supabase/migrations/20260719150000_ice_ro_r0_views_and_confined_role.sql:53-57`).
- **The gap is documented in the schema itself, dated 2026-05-02** — `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql:86`: *"Creatomate credits billed for this render, sourced from the `GET /v2/renders/{id}` response's `data.credits` field ... production sample is `credits_used=NULL` on all 932 rows because the current Creatomate v2/renders response shape does not return credits to image-worker."*
- **Re-confirmed live, today, 3 months later, on video-worker specifically** — a read-only query via the R0 path (`ice_ro.render_status`, zero-prompt, `mcp` untouched) against the 20 most recent Creatomate renders (17 succeeded, 1 failed, 2026-08-03 through 2026-08-05) returned `credits_used` **empty on every single row**. This is a stable, non-transient gap across two independent workers and a three-month span — not a fluke, not a recent regression, not something a code fix on the ICE side can close.

**Implication for this design**: the acceptance target's phrase "render_spec carries a non-null cost/credit value" cannot be satisfied by changing ICE-side code — the field the current plumbing targets is one Creatomate's response never populates for this account/plan. Closing M7 requires a **second, separate capture channel**, not a repair of the existing one.

## 2. What Creatomate's API exposes today (per this repo's existing evidence only — no new API calls made, per the task's scope)

- **Per-render**: `POST /v2/renders` (submit) → `GET /v1|v2/renders/{id}` (poll) returns `status`/`url`/`credits`(observed always null on this account)/`error_message` (`creatomate_submit.ts:43-53`; memory `creatomate-api-gotchas` point 6, established 2026-07-10).
- **No renders-list endpoint exists.** `GET /v1/renders` and `GET /v2/renders` both 404 — *"the requested API endpoint does not exist"* (memory `creatomate-api-gotchas` point 6). Confirms per-render capture must happen at submit/poll time; there is no way to retroactively enumerate renders provider-side.
- **No template CRUD API** (memory `creatomate-api-gotchas` point 3) — irrelevant to cost capture directly, cited only to bound what "check the API" can mean here: templates are editor-authored, and by the same evidence pattern, account-level usage/billing has **not been checked from this codebase** in any prior lane found during this pass.
- **to_be_confirmed, explicitly out of this design's scope** (task instruction: "no API calls needed for design"): whether Creatomate exposes an account-level usage/billing/subscription endpoint (distinct from the per-render `credits` field) that would return a true consumption figure. This is the single most load-bearing unknown in this whole design — the recommended shape in §4 is built to be agnostic to the exact endpoint, but the endpoint itself needs a documentation check (or a dashboard-reported balance, or the monthly invoice) before Phase 1 can be scoped for real.

## 3. Capture-point options

| Option | What it captures | Verdict |
|---|---|---|
| **A — Leave the existing per-render capture exactly as-is** | Nothing new; documents the dark state honestly. Zero cost, zero risk, already deployed. | **Keep, but insufficient alone** — satisfies neither acceptance clause today. |
| **B — Fix/replace the per-render capture** | Would require Creatomate to start returning `data.credits`, which is outside ICE's control (§1). No code change on this side can make a vendor populate a field it omits. | **Not actionable from this codebase** — not a design option, a vendor dependency. |
| **C — Separate weekly/periodic account-level usage sweep** | A NEW, additive capture channel against whatever account-level usage surface Creatomate exposes (§2, to_be_confirmed) — or, as a zero-infrastructure bridge, a manually-entered figure sourced from Creatomate's dashboard/invoice on a cadence. Produces the aggregate the acceptance target's own fallback clause explicitly accepts: *"a documented weekly cost figure ... even if ... previously unknown, now observed."* | **Recommended — this is what actually satisfies M7.** |

The acceptance target itself anticipated exactly this outcome: it does not require the per-render figure to be non-null (Creatomate may simply never expose that), only that *some* non-null cost/credit signal exists on a render-adjacent artifact, plus a documented weekly figure. Option C, landing the weekly figure into its own table rather than forcing it into the already-proven-empty `render_spec`/`credits_used` slot, is the honest way to meet that.

## 4. Storage shape

Precedent in this codebase for "a periodic observability snapshot, written on a cadence, exposed read-only": `m.pipeline_health_log` (`ice_ro.pipeline_health` view, `snapshot_at` + 19 point-in-time counters, `...ice_ro_r0_views_and_confined_role.sql:81-86`) and `m.cron_health_status` (`ice_ro.cron_health`, `...:66-70`). Both are append/upsert snapshot tables with no relation to the row-level render log — cost capture should follow the same shape rather than being forced into `m.post_render_log`.

**Proposed (not created here — scoped for a future T1/T2 apply packet):**
- New table, e.g. `m.render_cost_snapshot`: `snapshot_id`, `period_start`, `period_end`, `provider` (text, e.g. `'creatomate'` — reserved discriminator, mirrors `render_engine`'s own discriminator framing at column_id 824267), `credits_or_spend` (numeric), `unit` (text, e.g. `'credits'` | `'usd'` — Creatomate's dashboard may report either), `source` (text — e.g. `'account_usage_api'` | `'dashboard_manual_entry'` | `'invoice_manual_entry'`, so a manually-entered weekly figure is honestly distinguishable from an automated read once/if the automated path lands), `captured_at` (timestamptz default now()).
- Additive DDL only — **no touch to `m.post_render_log`** (the existing `credits_used` column stays exactly as it is, dark, reserved for if Creatomate ever starts populating it — per the existing column-purpose comment's own framing, `...audit_post_render_log_column_purposes.sql:86`, "Reserved as the cost-monitoring axis ... for when Creatomate's response or image-worker's parsing changes").

## 5. The weekly-figure read — `ice_ro` view candidate

Per the standing CLAUDE.md R0 rule (`CLAUDE.md` — "For any read that a curated `ice_ro` view can serve, run `db-read.py`... zero prompt"), a new curated view is the correct read path for a recurring "what did we spend this week" check, rather than falling back to `execute_sql` (R1, still `ask`).

- **Name candidate**: `ice_ro.render_cost_status` (mirrors the existing `render_status`/`publish_status`/`cron_health` naming convention — `*_status` for point-in-time state, which fits a "most recent weekly snapshot" read).
- **Shape**: all columns of `m.render_cost_snapshot` are already safe (no secrets, no freeform PII — mirrors `cron_health`'s "all columns SAFE" framing, `...:66`) — a straight `SELECT *` view, same minimal-withholding pattern as `cron_health`/`pipeline_health`.
- Not created here — this is a **name + shape proposal** for the eventual Phase-1 apply packet, per the task's explicit instruction ("name it, don't create it").

## 6. Capture cadence / point

Two independently-viable cadences, not mutually exclusive:

1. **Automated weekly sweep** (once the account-usage endpoint is confirmed, §2) — a new low-frequency `pg_cron`-triggered Edge Function, following the exact proven pattern already used for `content_fetch` (every 10 min), the hourly planner, and others (`supabase/migrations/phase2/cron_jobs_snapshot.sql:15-55`: *"pg_cron jobs ... triggers [X] Edge Function"*). This is architecturally the cheapest new-infrastructure option in the whole M1/M7 pair — no new external service is needed if Creatomate's usage data is reachable over plain HTTPS from a Deno EF (unlike M1's loudness measurement, which is blocked on ffmpeg's absence from the EF runtime — cost capture has no such blocker, since it's a JSON API read, not a media-processing operation).
2. **Manual/interim entry** (zero-infrastructure bridge, available immediately) — a weekly operator glance at Creatomate's dashboard/invoice, recorded as one row with `source='dashboard_manual_entry'`. This alone would already satisfy the acceptance target's literal wording ("a documented weekly cost figure exists ... previously unknown, now observed") without waiting on the automated-endpoint confirmation in §2.

Given the delta audit's own framing of M7 as *"pure additive logging; no cap proposed"* and *"cheapest lane in this table"* (`...delta-audit-v1.md:396,470-471,546`), starting with option 2 (manual) to close the acceptance criterion honestly and cheaply, then layering option 1 (automated) once §2's endpoint question is answered, is the lower-risk sequencing — it does not gate "documented weekly figure exists" on an unconfirmed vendor API.

## 7. No cap / guardrail — explicitly out of scope

The delta audit names the current gap as *"no LLM-cost-guardrail design was ever built for render providers"* (`...delta-audit-v1.md:396`) but explicitly scopes M7 as observability only, no cap (`:470-471`). This design proposes **logging only** — `m.render_cost_snapshot` records what was spent; it does not gate, throttle, or alert on any threshold. A future cost-guardrail design is a separate, later lane, not started here.

## 8. Open questions (to_be_confirmed / PK decisions — NOT resolved here)

1. Does Creatomate expose an account-level usage/billing/subscription API endpoint distinct from the per-render `credits` field? **Named confirmation step**: check Creatomate's own API documentation (a read of public docs, not an authenticated API call against the render endpoint) — explicitly deferred past this design pass per the task's "no API calls needed" instruction.
2. If no such endpoint exists, is the dashboard-reported balance or the monthly invoice the durable source of truth for `source='dashboard_manual_entry'` rows — and who owns the weekly manual-entry cadence operationally?
3. Unit: does Creatomate's account view report "credits" (an internal unit) or a currency figure directly? Affects the `unit` column's real values — not decided here.
4. Exact `m.render_cost_snapshot` DDL / RLS posture / who writes it (service-role EF vs. a manually-run script) — Phase-1 design work.
5. Whether `image-worker`'s identical dark `credits_used` state (also confirmed NULL on all 932 audited rows) should be folded into the same `render_cost_snapshot` capture (`provider`/discriminator column already anticipates this) — reasonable given both workers hit the same Creatomate account, but not decided here.

## 9. Boundaries of this design

Read-only static analysis plus one read-only DB check via the allowlisted R0 path (`ice_ro.render_status`, zero-prompt db-read.py, used only to re-confirm the `credits_used`-always-null claim on video-worker specifically — no write, no schema touch performed). No code written, no migration applied, no deploy, no schedule surface touched, no register version cut, no Creatomate API called. Authorises nothing. Input to a future PK Gate-1 for the Phase-1 capture lane.
