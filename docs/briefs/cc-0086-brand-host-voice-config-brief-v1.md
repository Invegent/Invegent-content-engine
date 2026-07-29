# Brief cc-0086 — Brand Host Voice governed dashboard config

**Created:** 2026-07-29 Sydney
**Author:** chat
**Executor:** Claude Code (ef-builder, two repos)
**Status:** draft
**Result file:** `docs/briefs/results/cc-0086-brand-host-voice-config-result-v1.md` (created on completion)
**Tier:** T3 (production DB migration + EF deploy + read-only secret USE — see secret-handling rider below)
**Lane:** PRODUCT_PROOF

---

## Task

Add a governed "Brand Host Voice" panel to the client dashboard (`invegent-dashboard`) so an
operator can configure a new brand's ElevenLabs narration voice — view status, edit the voice ID
and enabled flag, run a supervised preview, and see who/when it last changed — **without** editing
code, touching a secret, or redeploying `video-worker`. The underlying table
(`c.client_voice_config`) and its worker read path (`resolveGovernedVoice` in
`supabase/functions/video-worker/voice_id.ts`) already exist and are unchanged by this brief; today
the table has **no read/write RPC and no dashboard surface at all** — it is populated only by direct,
out-of-band DB access.

## Source context

- `supabase/migrations/20260719180000_create_client_voice_config_v1.sql` — the live table:
  `client_id uuid PK → c.client(client_id) ON DELETE CASCADE`, `elevenlabs_voice_id text NOT NULL
  CHECK (btrim(...) <> '')`, `enabled boolean DEFAULT true`, `created_at`/`updated_at timestamptz`.
  RLS enabled, **zero policies**, grants `service_role` (full DML) + `inspector_ro` (SELECT) only —
  nothing to `PUBLIC`/`anon`/`authenticated`. Confirmed byte-identical live (no drift) 2026-07-29.
- `supabase/functions/video-worker/voice_id.ts:37-55` — `resolveGovernedVoice(supabase, clientId)`:
  direct service-role read `schema('c').from('client_voice_config').select('elevenlabs_voice_id')
  .eq('client_id', clientId).eq('enabled', true).maybeSingle()`; fail-closed on any error/no-row/
  blank id (never throws, returns `{voiceId: null, method: 'unresolved'}`). Three call sites in
  `index.ts` (lines ~1240, ~1301, ~1429) each `throw` fail-loud if `voiceId` is null.
- `supabase/functions/video-worker/voice_id_test.ts` — 7 hermetic Deno tests pinning this exact
  contract (schema/table/filter shape + every fail-closed branch). **Must still pass unmodified.**
- `supabase/migrations/20260727150000_pb1_publish_cadence_write_rpc.sql` — the RPC pattern to
  clone: append-only `c.publish_cadence_change_log` (RLS ENABLE+FORCE, zero grants to any role —
  writable only by the definer function running as owner `postgres`), read RPC
  `public.get_publish_cadence`, write RPC `public.save_publish_cadence` (SECURITY DEFINER,
  `SET search_path=''`, fail-closed validation, captures old values, strict column-whitelist
  UPDATE, inserts audit row, `GRANT EXECUTE ... TO service_role` only). Confirmed byte-identical
  live (no drift) 2026-07-29.
- Live baseline (2026-07-29, read-only, for the no-regression proof — see Success criteria):

  | client_id | client_slug | elevenlabs_voice_id | enabled | created_at = updated_at |
  |---|---|---|---|---|
  | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` | property-pulse | `YCxeyFA0G7yTk6Wuv2oq` | true | 2026-07-19T08:16:55.747976Z |
  | `fb98a472-ae4d-432d-8738-2273231c1ef4` | ndis-yarns | `iamiUYVj7ixJcRZQkS8B` | true | 2026-07-19T08:16:55.747976Z |

  Only these 2 of 4 `c.client` rows have a voice-config row (`care-for-welfare-pty-ltd` and
  `invegent` have none — the "new brand with no config yet" case this feature must handle).
- `docs/briefs/cc-0046-slice-0-5-protected-action-census-v1.md:106-117` — dashboard-side census
  confirms **no governed write RPC is reachable from the dashboard for any creative-governance-style
  config today** (Finding D-1); corroborates this is genuinely new surface, not a gap in existing UI.
- **Naming collision to avoid:** `invegent-dashboard/app/(dashboard)/actions/voice.ts` already exists
  and edits `c.content_type_prompt` (AI copywriting/tone prompt), an unrelated "voice." Name this
  feature's files/labels distinctly — e.g. server action `actions/voice-config.ts`, UI label
  "Brand Host Voice" or "Narration Voice" (never bare "Voice") — to avoid operator confusion.
- `supabase/functions/brand-scanner/index.ts` — nearest structural analog for a supervised
  "call an external API on demand, show the result, don't persist automatically" action.
- ICE has no real actor identity (`changed_by` is always best-effort free text: user.email → user
  id → `"dashboard"` fallback) — same convention `save_publish_cadence`'s dashboard caller uses in
  `invegent-dashboard/actions/publish-cadence.ts`; clone it rather than inventing a new identity model.

## Scope

**In scope:**
- CE repo migration: `c.client_voice_config_change_log` audit table (ENABLE + FORCE RLS, zero
  grants to any role) + two RPCs: `public.get_voice_config(p_client_id uuid)` (read, fail-closed
  shape: `{client_id, elevenlabs_voice_id, enabled, configured, updated_at}` — `configured=false`
  and nulls on no row, never an error) and `public.save_voice_config(p_client_id uuid,
  p_elevenlabs_voice_id text, p_enabled boolean, p_changed_by text)` (write). Both `SECURITY
  DEFINER`, `SET search_path=''`, `GRANT EXECUTE ... TO service_role` only (no `PUBLIC`/`anon`/
  `authenticated`), owner `postgres`.
- `save_voice_config` must be **upsert-capable** (`INSERT ... ON CONFLICT (client_id) DO UPDATE`),
  unlike `save_publish_cadence` (UPDATE-only) — because most clients currently have **no** row, and
  "a new brand can receive a voice without a code edit" requires first-time creation, not just
  editing an existing row. Validate: `p_client_id` exists in `c.client`; `p_elevenlabs_voice_id`
  non-blank (mirrors the table's own CHECK, but fail with a clear RPC error rather than a raw
  constraint violation); capture old values (null if no prior row = "first configuration" in the
  audit log, not an error).
- A supervised preview/test path: a new, narrowly-scoped edge function (or a clearly separated
  action within an existing one — executor's call, propose in the diff) that accepts an operator-
  supplied `elevenlabs_voice_id` + a **fixed, short, non-arbitrary sample sentence** (not
  free-text from the dashboard — cap cost/abuse), calls the ElevenLabs TTS endpoint using the
  existing `ELEVENLABS_API_KEY` secret server-side only, returns transient audio (e.g. a short-lived
  signed URL or inline base64) for the operator to listen to, and **persists nothing**. Standard
  `verify_jwt` posture (this is dashboard-invoked only, never a cron/webhook caller — do not carry
  over `--no-verify-jwt` from `video-worker`'s unrelated x-series-key requirement).
- Dashboard (`invegent-dashboard`): a "Brand Host Voice" panel (client-scoped settings surface,
  same placement family as the existing Schedule/Cadence tabs) showing configured/missing/disabled
  status, an edit form (voice ID + enabled toggle) wired to `save_voice_config` via a new server
  action, a "Test voice" button wired to the preview path, and a last-changed-by/at readout sourced
  from the audit log (via a small read of `c.client_voice_config_change_log`, latest row per client —
  expose only via the existing RPC or a new minimal read path, never a direct table grant to
  `authenticated`).
- A no-regression proof (see Success criteria) that PP/NDIS resolution is untouched.

**Out of scope:**
- Any change to `voice_id.ts` / `resolveGovernedVoice` / video-worker's read path — it must remain
  byte-identical; the new RPCs are an **additional** write/read surface on the same table, not a
  replacement.
- `ELEVENLABS_API_KEY` — no rotation, no exposure to any RPC return value or dashboard-visible
  field, no new secret. It stays a `video-worker`-scoped (or new EF's own, if a separate function is
  used) Edge Function secret only.
- `invegent-dashboard/actions/voice.ts` / `c.content_type_prompt` — untouched, unrelated surface.
- Any RLS policy addition to `c.client_voice_config` itself — its deny-all-by-design posture
  (RLS enabled, zero policies, service_role/inspector_ro only) is unchanged; only the two new
  `SECURITY DEFINER` RPCs mediate dashboard access, matching the `publish_cadence` precedent.
- Bulk/automated onboarding of voice config for all clients — this brief is the operator-facing
  control surface only, one client at a time.
- Enabling `FORCE ROW LEVEL SECURITY` retroactively on `c.client_voice_config` itself (out of scope —
  flagged as a discretionary hardening item only for the **new** audit table, which will ship with
  FORCE from day one per the newer convention).

## Allowed actions

- `ef-builder` (CE repo, isolated worktree): author the migration (audit table + 2 RPCs), the
  preview/test EF change, and hermetic tests for both new RPCs' validation/fail-closed branches
  (modeled on `voice_id_test.ts` / the `publish_cadence` RPC's own test coverage if any). Run local
  checks (`deno check`, unit tests). No deploy, no migration apply, no push to shared `main`.
- `ef-builder` (dashboard repo, isolated worktree): author the "Brand Host Voice" panel, server
  actions, and any client-side test. No deploy, no push to shared `main`.
- `branch-warden`: verify HEAD/branch/diff cleanliness in both worktrees before any gate.
- `db-rls-auditor`: review the migration (grants, RLS posture, upsert-vs-update correctness,
  PostgREST exposure) before freeze, and re-run the live baseline read (§ Success criteria) after
  apply.
- `apply-harness-auditor`: static pre-freeze audit of the migration's declared safety harness
  (shadow mode — advisory only, does not clear any gate).
- `security-auditor`: confirm the secret-handling rider (below) holds — `ELEVENLABS_API_KEY` never
  reachable from any RPC return, dashboard field, or log line.
- Orchestrator: call `ask_chatgpt_review` on the final diff/plan before the PK deploy gate; write
  the result doc; propose (never apply) the migration and EF deploy commands for PK to run/approve.

## Forbidden actions

- No `execute_sql` DDL/DML against production — migration content only, applied by PK via the
  sanctioned path after Gate 2.
- No edge function deploy without PK's explicit go-ahead at Gate 2; if `video-worker` itself needs
  no change (preferred — keep the test path in a **new**, separate small EF), do not touch/redeploy
  `video-worker` at all, to keep this change's blast radius off the production TTS render path.
- No `--no-verify-jwt` on the new preview/test EF unless a concrete caller requirement is named and
  reviewed (see Standing ICE gotchas in CLAUDE.md).
- No change to `ELEVENLABS_API_KEY` value, storage location, or exposure surface.
- No touching `c.client_voice_config`'s existing RLS/grants, or its 2 existing rows' data, except
  through the new `save_voice_config` RPC under explicit operator action during testing (and any
  test-time writes must be reverted / scoped to a throwaway client, never PP/NDIS).
- No merge/push to shared `main` in either repo without a fresh PK gate.
- No enabling of voice for any client beyond what the operator explicitly sets in the dashboard.

## Secret-handling rider (CCF-02 Phase 2/3 R2 — read-only secret USE, not a posture change)

- **Which secret:** `ELEVENLABS_API_KEY` (existing Supabase Edge Function secret).
- **Conveyance:** read via `Deno.env.get('ELEVENLABS_API_KEY')` inside the new/extended edge
  function only, exactly as `video-worker` already does — never passed through a request body,
  RPC argument, RPC return value, log line, or dashboard-visible response field.
- **Use vs. change:** USE only. This brief does not rotate, re-store, or widen exposure of the key.

## Success criteria

- Migration applies cleanly with a validated single-statement rollback; `db-rls-auditor` returns
  `pass`/`clean` on grants, RLS posture, and PostgREST exposure.
- `apply-harness-auditor` returns PASS/CONCERNS with no unresolved CONCERNS before freeze (shadow —
  advisory, does not itself clear the gate).
- `get_voice_config`/`save_voice_config` hermetic tests cover: no-row read (fail-closed shape, not
  an error), first-time INSERT (upsert), update of an existing row, blank/whitespace voice ID
  rejected, unknown `client_id` rejected, `enabled=false` still returns a readable status (dashboard
  must show "disabled", not "missing").
- Dashboard panel: shows one of exactly three states (configured-enabled / configured-disabled /
  not-configured) for any client with zero silent-blank states; edit form round-trips through
  `save_voice_config`; "Test voice" plays audio without writing to `c.client_voice_config` or its
  audit log; last-changed-by/at reflects the true latest write.
- **No-regression proof (mandatory, live, post-build):** a fresh read-only `db-rls-auditor` pass of
  `c.client_voice_config` for the PP and NDIS `client_id`s returns **byte-identical**
  `elevenlabs_voice_id`/`enabled`/`updated_at` to the baseline table in § Source context (i.e. this
  build touched neither row), **and** `voice_id_test.ts`'s 7 tests still pass unmodified, **and** a
  read-only confirmation that `video-worker`'s deployed bundle/version is unchanged (no redeploy
  occurred) unless Gate 2 explicitly authorized one.
- `ask_chatgpt_review` returns a clean verdict (or a named, PK-resolved triage class) on the final
  diff before Gate 2.

## Stop condition

Stop after: build complete in both isolated worktrees → branch-warden safe on both →
db-rls-auditor pass → apply-harness-auditor + security-auditor findings resolved →
`ask_chatgpt_review` clean → orchestrator presents the exact migration-apply + EF-deploy +
dashboard-deploy sequence and the no-regression proof plan to PK at Gate 2 (hard stop). **Do not
apply the migration, deploy any edge function, or deploy the dashboard without explicit PK
authorization at that gate.** Report result per `docs/briefs/_template_result.md`, then stop and
clear the session per PK's standing instruction for this task.

---

## Notes

- Two repos, two isolated worktrees, two `branch-warden` passes — name both explicitly in the
  result doc (CE repo commit + dashboard repo commit are separate artifacts, separate Gate-2 items).
- The reserved-vs-normal register-cut ambiguity flagged by `claim-stub` (proposed v7.9 vs. sequential
  v6.53) is unrelated to this brief's task numbering (cc-0086, confirmed free — highest existing is
  cc-0085) — surfaced here only so whoever cuts the next register version resolves it, not this lane.
