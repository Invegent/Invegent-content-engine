# M18 — Creatomate Key Rotation: Security Packet (v1)

## A. Status

- Lane: `m18-creatomate-key-rotation`. **Advisory design packet — no rotation, no `supabase secrets
  set`, no deploy, no revoke has been executed.** Nothing in this packet mutates production.
- Produced: 2026-08-05 (CE session). CE state at time of writing: `HEAD == a8ed9de` on branch
  `claude/creatomate-key-rotation-elpbak`.
- Chain run: repo sweep (orchestrator, both `Invegent-content-engine` + `invegent-dashboard`) →
  DB-side confirmation (orchestrator, direct `mcp__Supabase__execute_sql` / `get_advisors` /
  `list_extensions` against project `mbkmaxqhsohbtwsqolns` — **substitution note:** `db-rls-auditor`
  was dispatched first but returned `block` — no live DB tool wiring in that subagent invocation this
  session; the orchestrator performed the DB sweep directly instead and that substitution is recorded
  here per the CCF-02 R1 refinement) → `security-auditor` triage (independently re-verified the
  repo-side evidence via `git log -p -S`, corrected and materially extended the exposure picture).
- **PK constraints in force for this lane (unchanged by this packet):**
  1. Do **not** rotate the live key during the active seven-day schedule watch (armed 2026-08-04
     ~20:20 Sydney → 2026-08-11 ~20:20 Sydney, `docs/00_sync_state.md` v6.130 — this watch governs the
     **schedule-expansion apply**, confirmed unrelated to Creatomate; see §C.4) **unless PK separately
     rules the exposure requires immediate action.**
  2. No production mutation or deploy without a **fresh, explicit PK execution gate** on this packet.

---

## B. Credential inventory

**Credential:** `CREATOMATE_API_KEY` — a single Bearer-token API key for `api.creatomate.com`
(video/image render provider). One key, project-wide, shared by all consumers below.

**Storage — the ONLY place the value lives today:** a Supabase **Edge Function project secret**
(`Deno.env.get('CREATOMATE_API_KEY')`), set via `supabase secrets set` / the Supabase dashboard,
injected as process env at Edge Function runtime. Confirmed by full DB sweep (§C.1): **no table,
view, or function anywhere in the database is named or shaped like a Creatomate credential store**,
and no DB object holds the value.

**Consumers — every worker/environment/operational path that reads it:**

| # | Path | Kind | Inbound auth gate | Creatomate call | Cadence |
|---|---|---|---|---|---|
| 1 | `supabase/functions/video-worker/index.ts` + `creatomate_submit.ts` | Deployed EF, `verify_jwt=false` | `x-video-worker-key == PUBLISHER_API_KEY` | POST+GET `/v2/renders` (submit+poll) | on-demand, production render path |
| 2 | `supabase/functions/image-worker/index.ts` | Deployed EF, `verify_jwt=false` | `x-image-worker-key == PUBLISHER_API_KEY` | POST+GET `/v2/renders` (submit+poll) | on-demand, production render path |
| 3 | `supabase/functions/tmr-drift-probe/index.ts` | Deployed EF, `verify_jwt=false` | inbound `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY` | GET templates-list (read-only, never mutates provider state) | daily, `pg_cron` `tmr-drift-probe-daily` `35 17 * * *` UTC |
| 4 | `scripts/ws4-d4-kinetic-proof-render.ts` | Local, operator-run, out-of-band | operator's local shell | POST+GET `/v2/renders` | manual, ad hoc |
| 5 | `_harness/ws5_p2_pp_nonregression/pp-nonregression-render.ts` | Local, operator-run, out-of-band | operator's local shell | render | manual, ad hoc (created 2026-08-03) |
| 6 | `_harness/ws5_p3_stat_calibration/probe-render.ts` | Local, operator-run, out-of-band | operator's local shell | render | manual, ad hoc (created 2026-08-03) |
| 7 | `_harness/ws5_p4_ndis_corrected/p4-corrected-render.ts` | Local, operator-run, out-of-band | operator's local shell | render | manual, ad hoc (created 2026-08-03) |

Rows 4–7 all read the **same production-named** env var (`CREATOMATE_API_KEY`) from whatever shell
the operator runs them in — this is a recurring pattern, not a one-off, and three of the four local
scripts are **2 days old** as of this packet (created 2026-08-03, alongside row 1's script from
2026-08-02).

**Not a consumer:** `invegent-dashboard` — zero credential-handling code; only UI/business-logic
string references to "creatomate" as a provider name (`lib/format-capability.ts`,
`lib/creative-library/registry.ts`, etc.). No `.env` files, no CI, nothing to rotate on that side.

**Not a consumer / false positive investigated:** `c.external_reviewer.api_key_secret` (DB column) —
read directly; its 4 rows contain only env-var **name** strings (`OPENAI_API_KEY`, `ICE_XAI_API_KEY`,
`ICE_GEMINI_API_KEY`) for an unrelated external-review MCP bridge. Zero Creatomate rows, zero actual
secret values.

---

## C. Exposure assessment

### C.1 — DB-side sweep (ground truth, `mbkmaxqhsohbtwsqolns`)

- `information_schema.columns` swept project-wide for `%key%/%secret%/%credential%/%token%` — the
  only genuine secret-value stores in the entire database are `auth.*` (Supabase Auth internals,
  unrelated) and `vault.secrets` / `vault.decrypted_secrets` (Supabase Vault).
- No table/view/function anywhere named `%creatomate%` — zero DB footprint of any kind, not even a
  reference row.
- **Supabase Vault is installed and actively used** (`supabase_vault` v0.3.1, 8 secrets currently
  stored: `project_url`, `publishable_key`, `ingest_api_key`, `ai_worker_api_key`,
  `publisher_api_key`, `pipeline_fixer_api_key`, `CRON_SECRET`, `service_role_key`) — but for a
  **different purpose**: secrets that `pg_cron`/`pg_net` jobs inject into HTTP headers when calling
  FROM Postgres INTO edge functions. `CREATOMATE_API_KEY` is absent from Vault, consistent with the
  fact that no SQL/cron job calls Creatomate directly — only edge-function runtime code does.
- `get_advisors(security)`: 3 ERROR + 185 WARN project-wide; **none reference Creatomate, secrets, or
  credential exposure.** The 3 ERRORs are pre-existing `SECURITY DEFINER` view findings
  (`public.vw_proof_ndis_yarns`, `m.vw_ef_drift_current`, `friction.case_with_attachment_count`) —
  unrelated to this lane, explicitly **excluded** from this packet (do not bundle into this gate).

### C.2 — Repo-side sweep (both repos, ~350 files)

- No tracked `.env`/`.env.*`/`*.env` in either repo (both `.gitignore` cover all three patterns).
- No `.github` CI workflows in either repo — zero CI exposure surface.
- No hardcoded key value anywhere in source or docs across both repos.
- `git log --all -p -S"CREATOMATE_API_KEY="` — zero hits across full history; the literal value was
  never committed.
- The key is **never logged**: only render id/status is `console.log`'d
  (`creatomate_submit.ts:51`); thrown errors carry the Creatomate response body text, never the
  request or the key. Same pattern in `image-worker`.
- One session doc (`docs/runtime/sessions/2026-06-02-v3.25-video-worker-pass1-creatomate-deploy.md`)
  explicitly records "env presence verified by name/length only … no secret values printed" — existing
  good discipline, worth restating as the standing rule (§F).

### C.3 — Confirmed historical unmanaged copy (load-bearing finding)

This is **documented fact, not a hypothetical risk**, found by `security-auditor` on independent
re-check of the register:

- `_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md` (2026-07-10) states verbatim: *"Key:
  production Creatomate key (digest `8ab5a356…`), read from PK's Downloads at runtime, never printed,
  never written to disk. The `CREATOMATE_API_KEY` env var on this machine is a **different, invalid**
  key (digest `df13b951…`) — confirmed by digest, not by trial."*
- `docs/00_sync_state.md` v5.44 (2026-07-07) independently names the then-deployed production secret
  as "the operator's Downloads key" (a dependency note for a smoke gate) — two independent register
  entries, ~3 days apart, both pointing at a persisted file in PK's Downloads folder holding a working
  copy of the production key, used to feed local probe scripts.
- **A rotation already happened once, evidently in response to this pattern:** `docs/00_sync_state.md`
  v5.89 (2026-07-xx, chronologically after the finding above): *"`CREATOMATE_API_KEY` rotation
  confirmed (PK)."* — closing a carry that had appeared at v5.75/v5.76/v5.82/v5.85. **Caveat:** the
  record does not explicitly state the Downloads-key finding *caused* the v5.89 rotation — that causal
  link is inferred from timing, not asserted in the register. Flagging as inferred, not proven.
- **The pattern recurred after the rotation.** Three of the four local out-of-band scripts that read
  the same production-named env var were created **2026-08-03 — two days before this packet** (rows
  5–7 in §B), continuing the exact habit (local scripts depending on the operator's shell holding
  `CREATOMATE_API_KEY`) that produced the original finding.
- **What is NOT known:** whether a Downloads-folder (or any other local) copy of the *current* key
  exists right now. This cannot be determined from repo/DB evidence — it can only be confirmed or
  ruled out on PK's own machine.

### C.4 — "Seven-day schedule watch" — confirmed unrelated

The only "seven-day … watch" in the register is `docs/00_sync_state.md` v6.130 (2026-08-04): *"Seven-
day monitoring watch armed 2026-08-04 ~20:20 Sydney → 2026-08-11 ~20:20 Sydney; no automatic cap raise
or Phase-2 mutation during the watch."* This governs the **schedule-expansion (pg_cron publish-slot)
apply**, not Creatomate. Named here so this packet's own PK-instructed hold (§A) is not confused with
or justified by that unrelated watch — **the hold on live rotation is a standing instruction for
*this* lane regardless of the schedule-expansion watch's own status.**

### C.5 — Adjacent but separate (not bundled)

`docs/00_sync_state.md` (most recent hit, v6.85) still carries "service-role key rotation still
outstanding on PK's side" — this is `SUPABASE_SERVICE_ROLE_KEY`, a different credential with real
DB/service-role reach. Named so PK doesn't conflate "the key rotation" with this Creatomate-scoped
packet; **not addressed here.**

### C.6 — Blast radius if the current key were compromised

- Scope of access (from our own usage, confirmed in code): submit+poll renders (render-credit/billing
  consumption), read templates-list (creative-IP/template-inventory visibility). If the key is
  workspace-wide rather than project-scoped at Creatomate (unverifiable from our side — provider-
  account fact only), broader read visibility into that Creatomate account's assets is possible.
- **No destructive/mutating template-edit capability exists via the API at all** —
  `docs/00_sync_state.md` v4.89 records as a durable fact that Creatomate has no template-update
  endpoint (PATCH/PUT 404); PK pastes template edits manually in the Creatomate UI. This durably caps
  the worst case: a compromised key cannot vandalize provider templates via API.
- Worst realistic case: render-credit/billing abuse (render spam) and template/render-inventory read —
  not data destruction.
- **No path to broader ICE/Supabase compromise found.** Pure third-party bearer token, zero DB/
  service-role reach: no table stores it, never combined with `SUPABASE_SERVICE_ROLE_KEY` in any code
  path, no Creatomate→ICE callback/webhook driven by this key. Residual unknown: Creatomate's own
  account-security posture (billing/user-management scope of this key) is not visible from our side —
  named as a PK-side dashboard check in §G.

### C.7 — Classification (two layers — do not collapse)

- **Managed-secret architecture + production consumer code path: GREEN.** Supabase EF project secrets
  is the correct store for this credential class; all 3 live consumers use the intended server-side
  principal; no PUBLIC/anon/browser path exists anywhere; rollback is a single `secrets set` call;
  blast radius is bounded (§C.6).
- **Current exposure state of the credential VALUE: AMBER.** Not RED — no legitimate public/anon
  caller exists, so rotating cannot break an intended flow, and rollback is straightforward. Not
  GREEN — there is confirmed (not hypothetical) historical evidence of an unmanaged local copy
  (§C.3), a recurring pattern still active 2 days before this packet, and no way to positively confirm
  today that no further copy currently exists. **"No leak found in this sweep" is not proof of
  safety** given the documented pattern — this AMBER is the reason rotation is warranted now, and it
  shapes what "done" must mean: rotating the value without also closing the local-copy *habit* just
  resets the clock on the same finding.

---

## D. Target secret architecture

**Confirmed, not changed:** Supabase Edge Function project secrets remains the correct managed
authority for this credential class. Moving it into `supabase_vault` would add a DB round-trip
(`vault.decrypted_secrets` read) for a value that already arrives for free as injected env at EF
runtime, for a key no SQL/cron job needs directly (unlike the 8 secrets Vault already holds for
pg_net→EF header injection). **No storage migration is recommended.**

Hardening this credential specifically should still get, beyond a bare value swap:

1. **Close the recurring local-copy habit, not just the current instance** (see §G — this is now part
   of the rotation's definition of done, not a separate follow-on).
2. **Structural follow-on (separate, smaller, later T2 code lane — NOT bundled into this rotation):**
   if Creatomate's plan supports scoped/multiple API keys, mint a distinct dev/probe key for the local
   harness scripts (rows 4–7, §B), repointed at a differently-named env var (e.g.
   `CREATOMATE_DEV_API_KEY`). This would mean future local probe runs never touch or re-copy the
   production value, and a leaked dev-key copy would never require rotating the production path. Named
   here for PK's awareness; not designed or executed in this packet.
3. Keep the existing good discipline (name/length/digest-only verification, never print values —
   already evidenced in `docs/runtime/sessions/2026-06-02-v3.25-*.md` and in `P1_FINDINGS.md`'s own
   digest-only comparison) as the explicit standing rule for any future credential handling.

---

## E. Risk tier

**T3** — per the standing Convention 3 risk-tiered review chain: "callers/grants/deploy/publish/
secrets → T3." This is a production-touching secret change with 3 live deployed consumers; it gets
the full chain regardless of the "no DB write" framing — named live pre-check STOPs, rollback proven
before apply, explicit PK gate, nothing waived.

---

## F. Exact bounded mutation/deploy packet (DESIGNED, NOT EXECUTED)

This is the exact, bounded sequence for PK to run (or explicitly authorise) at the next PK execution
gate. **Nothing below has been run.** Value never appears in any transcript, doc, or log at any step —
presence/length/digest only.

**Pre-flight (read-only, safe to run any time):**
```
supabase secrets list          # confirm CREATOMATE_API_KEY present by name only
```
Capture baseline: most recent successful `m.post_render_log` row per consumer (`engine=creatomate`)
for video-worker/image-worker, and `tmr-drift-probe`'s last successful daily run — establishes
"before" health, read-only.

**Apply (PK-run, one operation — the secret is project-level, shared by all 3 EFs):**
```
supabase secrets set CREATOMATE_API_KEY=<new-value>
```

**Verify (§G — do not proceed to revoke until ALL of these pass):**
1. Non-publishing smoke render on `video-worker` (existing `_smoke/`-style / controlled non-publishing
   re-render pattern already proven in this codebase).
2. Non-publishing smoke render on `image-worker` (same pattern).
3. Confirm `tmr-drift-probe`'s next daily cycle (or a manual invoke) succeeds against the
   templates-list endpoint.
4. `get_advisors(security)` recheck — expect **unchanged** 3 ERROR + 185 WARN; a pure env-value swap
   should not move DB posture at all. **Any new finding is a STOP.**

**Sequenced strictly after all 4 verifications pass:**
5. PK revokes the OLD key in the Creatomate dashboard.
6. PK locates and securely deletes any local copy of the OLD key (named location: Downloads folder
   per §C.3 — but also check anywhere else the "save the key to run a probe" habit may have left a
   trace: clipboard managers, shell history, cloud-synced folders).
7. PK repoints or clears local shells' `CREATOMATE_API_KEY` export (if any) to the NEW value only, or
   removes it entirely between probe sessions.

**Explicitly excluded from this bounded packet:** no DB write, no GRANT/REVOKE, no migration, no
schema change, no repo edit — the 3 EFs' code and auth gates are unchanged by this rotation; this is a
pure secret-value swap plus an operator-hygiene action.

---

## G. Rollback / emergency recovery

If the new key fails any consumer's smoke (`401`/`invalid_api_key`-shaped response from Creatomate):
```
supabase secrets set CREATOMATE_API_KEY=<old-value>
```
This immediately restores service. **This rollback path is only valid if the OLD key has not yet been
revoked at Creatomate** — which is exactly why revoke (§F step 5) must be the *last* step, never an
early one. Rollback is void the moment the old key is revoked; do not revoke until all 3 consumer
smokes (§F steps 1–3) are green.

---

## H. Worker-authentication proof plan

Per-consumer verification that each of the 3 deployed EFs is actually using the NEW key post-rotation
(not a stale cached value):

| Consumer | Proof mechanism | Pass signal |
|---|---|---|
| `video-worker` | Non-publishing smoke render, timestamped after rotation | `m.post_render_log` row `status='succeeded'` with a timestamp strictly after the `secrets set` call — not a stale/cached hit |
| `image-worker` | Non-publishing smoke render, timestamped after rotation | Same pattern |
| `tmr-drift-probe` | Next daily cron cycle or manual invoke | Successful templates-list GET, HTTP 200, no `401`/`invalid_api_key` |

**Durable evidence the OLD key is no longer usable or stored:**

- **Provable from ICE's side:** the NEW key works (above), and — optionally, if PK deliberately tests
  the OLD key once post-revoke before its last copy is destroyed — that it now fails with a
  `401`/`invalid_api_key`-shaped response. This mirrors the exact failure signature this team already
  recognizes from a prior ElevenLabs key rotation.
- **NOT provable from ICE's side, ever:** that Creatomate has actually deleted/deactivated the old key
  account-side. No key-list/key-status endpoint is used or known in this codebase, and calling one to
  check would itself require exposing a key. **This must be manually confirmed by PK in the Creatomate
  dashboard** (key shown as revoked/deleted; its "last used" timestamp stops advancing) and recorded
  as the closing fact of the rotation — not inferred from our side.
- **"No plaintext/unmanaged copy remains"** is similarly a PK-side fact for the local-copy question
  (§C.3, §F steps 6–7) — ICE tooling cannot inspect PK's Downloads folder, shell history, or clipboard
  manager. The closing record for this rotation should state PK's own confirmation of both facts
  explicitly, not assume them from "no further leak found in this sweep."

---

## I. Version-less register payload (for PK to insert when this lane is claimed/closed)

> **[VERSION] — M18 Creatomate key rotation: security packet complete, rotation PENDING PK gate
> (T3 · SAFETY_GATE)** — record: `docs/briefs/m18-creatomate-key-rotation-security-packet-v1.md`.
> · Inventory: 1 credential (`CREATOMATE_API_KEY`), 3 deployed EF consumers (video-worker,
> image-worker, tmr-drift-probe) + 4 local out-of-band scripts sharing the same env-var name (3 of the
> 4 created 2026-08-03). Storage confirmed GREEN (Supabase EF project secret only, zero DB footprint,
> `get_advisors` clean of Creatomate findings). Credential-value exposure classified **AMBER**:
> confirmed historical unmanaged local copy (`P1_FINDINGS.md` 2026-07-10, digest-confirmed; prior
> rotation v5.89 closed a related carry) with the local-script pattern still recurring as of
> 2026-08-03; no active leak found in repo/git/CI/DB. Target architecture unchanged (EF project
> secrets, not Vault — Vault serves a different secret class). Bounded rotation packet + rollback +
> per-consumer smoke proof plan + old-key-dead proof plan (PK-manual, Creatomate-dashboard-side)
> designed, **NOT executed** — held per standing instruction pending PK's own exposure-urgency call and
> the schedule-expansion 7-day watch (v6.130, confirmed unrelated but named as the co-occurring hold
> context). **NEXT (PK gate):** go/no-go on rotation timing + explicit sequence approval (new-key-set →
> smoke-all-3 → old-key-revoke → local-copy-clear), or a ruling that exposure warrants immediate action
> ahead of the watch window.

---

## J. Explicit non-claims

- This packet does not authorise apply. It is advisory design input only.
- `db-rls-auditor`'s native DB findings in this record are orchestrator-substituted (§A) — the
  subagent itself returned `block` for lack of live tool wiring; the substitution is named per CCF-02's
  R1 refinement, not silently absorbed.
- The causal link between the 2026-07-10 Downloads-key finding and the v5.89 rotation is inferred from
  timing, not asserted fact in the register (§C.3).
- Whether the Creatomate key is workspace-wide or project-scoped, and its account-side billing/user-
  management blast radius, are unverifiable from ICE's side (§C.6) — PK-dashboard facts only.
- Whether any local copy of the *current* key exists today is unknown and cannot be proven negative
  from repo/DB evidence (§C.3) — this is the central open question this rotation exists to close.
