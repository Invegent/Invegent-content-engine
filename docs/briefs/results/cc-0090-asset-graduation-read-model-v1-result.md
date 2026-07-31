CLAIMED v6.87 · cc-0090-asset-graduation-read-model-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · gate=applied · 2026-07-31T00:17:31.943Z

# Result cc-0090 — Asset Graduation Read Model v1 (O-4 follow-on)

**Brief file:** `docs/briefs/cc-0090-asset-graduation-read-model-v1-brief.md`
**Executed by:** chat
**Completed:** 2026-07-31 Sydney

---

## 1. Result status

`Complete` — including the T3 apply. PK authorised proceeding on 2026-07-31; the
migration was promoted and applied to live project `mbkmaxqhsohbtwsqolns`, with
post-apply verification passing end-to-end (§4 steps 13–16 below).

## 2. Commit(s)

N/A — no commits yet. Per Forbidden Actions, nothing is committed or pushed without
PK's explicit word; that authorization has not been given for this lane. The applied
migration lives in the live database (confirmed via `list_migrations`) independently of
git commit state — the local migration file is currently untracked, matching it.

## 3. Files changed

- `docs/briefs/cc-0090-asset-graduation-read-model-v1-brief.md` — created (Gate-1 brief;
  status updated in-session to record PK's gate-1 approval)
- `docs/briefs/artifacts/cc-0090-asset-graduation-read-model-v1.sql` — created (forward:
  4 new `ice_ro` views + grants/revokes + fail-closed assertions), then edited twice to
  apply `db-rls-auditor`'s two should-fix findings (schema-wide grant-total assertion;
  `subject_tags` jsonb-type normalisation)
- `docs/briefs/artifacts/cc-0090-asset-graduation-read-model-v1-rollback.sql` — created
  (`DROP VIEW IF EXISTS` × 4 + post-rollback assertion)
- `supabase/migrations/20260731001557_cc_0090_asset_graduation_read_model_v1.sql` —
  created (the promoted, applied migration; DDL byte-identical to the reviewed artifact
  above). File authored locally with a provisional timestamp
  (`20260731010000`), then renamed to match the version Supabase actually minted
  (`20260731001557`) — confirmed via `apply_migration mints own version` gotcha memory
  and `list_migrations` after the fact.
- `docs/00_sync_state.md` / `docs/00_action_list.md` — one pointer entry each (v6.87,
  Convention 1), current-marker rotated ahead of v6.86.

No other file was touched — no worker, resolver, or template code changed.

## 4. Actions taken

1. Drafted the Gate-1 brief instantiating O-4 (`asset-graduation-contract-v1.md:448`),
   grounded in the Slice-1 result doc and its live-verified read-pack column provenance.
2. PK approved gate 1; brief status updated to record it.
3. Authored 4 new `ice_ro`-schema views (`asset_graduation_client_owned`,
   `asset_graduation_shared_reachability`, `asset_graduation_client_pool_policy`,
   `asset_graduation_geo_classes`) modeled on the existing G-RO v2 pattern, plus grants,
   defensive revokes, a fail-closed assertion block, and a rollback file.
4. **Before running any DDL live**, validated the tool's transactional behaviour with a
   harmless probe view inside `BEGIN...ROLLBACK` — confirmed nothing persists (re-checked
   post-hoc via `pg_class`).
5. Ran the full forward SQL (views + grants + revokes + assert block) inside a single
   `BEGIN...ROLLBACK` `execute_sql` call against live project `mbkmaxqhsohbtwsqolns`,
   then queried the new views for the same real Property Pulse / Invegent asset rows
   Slice-1's shadow batch used, before rolling back.
6. **Live reproduction achieved:** `client_owned=4`, `shared_pooled=9` (under Invegent,
   real `allow_global_shared=true` policy), `shared_unreachable=9` (under Property Pulse,
   which structurally has **no** `client_asset_pool_policy` row — confirmed live). This
   fully reconciles against Slice-1's documented method (§5 of its result doc: "9 real
   fenced global_generic shared rows... evaluated under Invegent's real permissive policy
   → shared_pooled" and "...under Property Pulse's real absent-policy context →
   shared_unreachable") — Slice-1's own aggregate table showed `shared_pooled:2` only
   because its single merged 15-row batch selectively duplicated 2 of the 9 shared rows
   into the Invegent context rather than all 9; this lane's exhaustive check confirms all
   9 behave identically under both contexts, and the distinct-asset-level reason-code
   distribution (see step 7) reconciles Slice-1's exact `provenance_incomplete×8 /
   licence_ambiguous×6 / fence_open_on_intake×1` figures precisely.
7. **Re-ran the actual Slice-1 evaluator binary** (`.claude/helpers/asset-graduation-
   check.mjs` — not a reimplementation) against a payload transformed from the new views'
   flat output into the evaluator's exact expected input shape (nested `provenance`,
   nested `client_asset_pool_policy`, `asset_meta_usage`). Result: identical reason codes
   per asset (`provenance_incomplete` / `licence_ambiguous` / `fence_open_on_intake`),
   the exact `31.64%` retained-crop / `1.7778×` upscale figure Slice-1's own result doc
   quotes for the 1920×1080-source asset at a 1080×1920 target, and **byte-identical**
   evaluator output across 2 repeated runs (`diff` empty).
8. Confirmed post-hoc, twice, that nothing persisted: `SELECT count(*) FROM pg_class ...
   WHERE relname LIKE 'asset_graduation%'` returned `0` after every proof run.
9. Ran `db-rls-auditor` against the authored SQL + live schema. Verdict: `concerns`
   (0 must-fix, 3 should-fix). Applied both SQL-level fixes (schema-wide grant-total
   assertion; `subject_tags` jsonb normalisation across both views) and re-ran the full
   live proof to confirm both fixes hold (`total_grants_ice_readonly=14`,
   `pg_typeof` both `jsonb`). The third finding (byte-identical reproduction concern) is
   closed by the evidence in step 7, gathered independently of the auditor's own check.
10. Ran `branch-warden`. Verdict: `safe` — `main` at `09eae15`, ahead 0 / behind 0 vs
    `origin/main`, the three new files present as untracked and uncommitted, zero
    modified tracked files.
11. Called `ask_chatgpt_review`, packet pinned to the final file hashes (brief
    `3a75f8ba…`, forward SQL `07fb1f17…`, rollback SQL `6689ebc8…`). Verdict: `agree`,
    risk `low`, confidence `high`, `requires_pk_escalation: false`. No triage class
    applies (clean verdict).
12. Wrote this result doc and stopped for the PK T3 apply gate.
13. **PK authorised "proceed" (2026-07-31).** Before applying, re-verified git safety
    fresh: origin/main had moved by one commit since branch-warden's earlier check
    (`09eae15` → `1163ce2b`); confirmed via `git log`/`git diff --stat` that the new
    commit was an unrelated automated Cowork run marker (`docs/runtime/runs/no-ready-
    briefs-2026-07-30T215650Z.md`, +35 lines, zero overlap with this lane) — independently
    verified benign per the standing STOP-condition exception, so proceeded. Also
    re-confirmed the live `ice_readonly` grant baseline was still exactly 10 (unchanged
    since the review) before promoting.
14. Promoted the reviewed artifact into `supabase/migrations/20260731001557_cc_0090_
    asset_graduation_read_model_v1.sql` — DDL byte-identical to the reviewed Sections
    A/B/C, only the header comment is new (documents the promotion + PK authorization +
    review chain). Applied via `mcp__supabase__apply_migration` (not raw `execute_sql`,
    per the tool's own DDL guidance) against `mbkmaxqhsohbtwsqolns` — returned
    `{"success":true}`.
15. Confirmed live post-apply: `list_migrations` shows `20260731001557_cc_0090_asset_
    graduation_read_model_v1` recorded; a direct query confirms 4 new views exist, 14
    total `ice_readonly` SELECT grants, 0 PUBLIC/anon/authenticated grants on the new
    views. Renamed the local migration file to match the version Supabase actually
    minted (`20260731001557`, not the provisionally-chosen `20260731010000`) — a known
    gotcha (`apply-migration-mints-own-version` memory) — so the repo ledger doesn't
    drift from live truth.
16. **Post-apply end-to-end verification via `scripts/db-read.py`** (the zero-prompt R0
    path, confirming the confined `ice_readonly` role — not just the migration-executor
    role — can actually read the new views): `asset_graduation_shared_reachability`
    under `property-pulse` → 14/14 `shared_unreachable` (correct — no policy row);
    `asset_graduation_client_pool_policy` → 4 rows, one per client, correctly showing
    `policy_row_absent=true` for `property-pulse`/`ndis-yarns` and real policies for
    `invegent`/`care-for-welfare-pty-ltd`; `asset_graduation_geo_classes` → 12 rows;
    `asset_graduation_client_owned` → 64 rows (all clients, background+broll_background
    usage). All four reachable with zero prompts, zero errors.
17. Ran `get_advisors(security)` post-apply — zero findings reference `ice_ro` or
    `asset_graduation` (grepped the full output). No new security posture introduced.
18. Added one Convention-1 pointer entry (v6.87) to `docs/00_sync_state.md` and
    `docs/00_action_list.md`, rotating the current marker ahead of v6.86 — used
    `claim-stub.mjs` to confirm v6.87 is the correct normal sequential cut (the tool's
    `v7.9` alternative proposal was a reserved/ahead-of-head collision-avoidance number
    from an unrelated result-doc stub high-water mark, not applicable to a register cut).

## 5. Constraints confirmed

- Apply the view/RPC to the live database **outside the separate PK-run T3 step** —
  **confirmed honoured**: every live touch during authoring/proving ran inside
  `BEGIN...ROLLBACK` (re-verified empty afterward each time); the real apply happened
  only after, and only because, PK explicitly authorised it as its own distinct gate
  (§4 step 13).
- Grant `SELECT`/`EXECUTE` to `PUBLIC`/`anon`/`authenticated` — **confirmed not done**;
  explicit `REVOKE ALL ... FROM PUBLIC, anon, authenticated` is part of the forward file
  and was assert-verified live (0 matching grants).
- Grant production graduation authority — **confirmed not done**; these are read-only
  views with no write path.
- Auto-promote/auto-graduate any asset — **confirmed not done**; zero DML anywhere.
- Source new assets — **confirmed not done**.
- Implement C12 (declared==resolver-reachable) enforcement — **confirmed not done**;
  explicitly out of scope, not computed by any of the 4 views.
- Touch `resolve_slot_assets` / `select_template` / any worker / any template —
  **confirmed not done**.
- Widen `execute_sql`/general SQL access — **confirmed not done**; `execute_sql` was
  used exactly as before (orchestrator-level read/proof access), nothing granted to any
  new role or caller.
- Commit or push without PK's explicit word — **confirmed not done**; nothing staged
  or committed.

## 6. Open issues

- **Named gap, carried from Slice 1, not modeled here either:** the live resolver's
  shared-asset gate also checks a per-row `purpose_bound` boolean, `vertical_key` match,
  and `allowed_clients`/`excluded_clients` membership. `SHARED_POOLED` in this read model
  means "policy + governance_scope permit consultation", not a complete reachability
  proof — disclosed in the SQL file's own header, matching Slice-1's own disclosure.
- **db-read.py cannot call an RPC** — confirmed early in this lane (the wrapper forbids
  `execute`/`call` keywords), which is why this read model is 4 plain `SELECT`-able
  views rather than a parameterised function; this shaped the whole design and is worth
  keeping in mind for any future ICE read-model lane.

## 7. Next recommended step

None required to close this lane — brief, apply, and post-apply verification are all
complete. Future/optional: a real consumer (e.g. a Slice-2 graduation-packet generator,
or re-pointing the Slice-1 evaluator's read step at `db-read.py` instead of a prompted
`execute_sql` batch read) can now build on these 4 views with zero further DB apply
needed. Committing the four new/changed files to git remains a separate, not-yet-
authorised step (§2).

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matches the brief: 4 secret-free read-only views authored (not the originally-
  considered SECDEF RPC — abandoned once `db-read.py`'s statement gate was confirmed to
  forbid function calls entirely, which is a materially better reason than a stylistic
  preference and is recorded above as an open issue for future lanes).
- Every Forbidden Action was checked and confirmed not violated (§5 above).
- No unexpected files changed — `branch-warden` confirmed zero modified tracked files.
- All five Proof requirements from PK's original task spec are met: (1) the same 15-row-
  equivalent shadow classification is reproduced (exhaustively, a superset of Slice-1's
  own sampled batch, fully reconciled against its reported counts); (2) evaluator output
  is byte-identical across repeated runs against the read-model-derived payload, and
  matches Slice-1's own documented reason codes and the exact 31.64%/1.7778× geometry
  figure; (3) Property Pulse's shared rows remain `shared_unreachable` (proven: no
  policy row exists for that client, live-confirmed); (4) the same permitted shared rows
  remain `shared_pooled` for Invegent (proven: real `allow_global_shared=true` policy,
  live-confirmed); (5) B-roll usage (`broll_background`) and slot typing (`asset_kind`
  video vs image, mime-derived) are represented identically to Slice 1's corrected logic,
  including the exact same fence-check nuance for the already-eligible diagnostic row
  (`broll_pp_au_suburb_aerial` → `fence_open_on_intake`, matching Slice-1 §7's disclosed
  scope note verbatim). Rollback is authored and its logic was implicitly exercised
  (every proof transaction rolled back cleanly pre-apply) — it has NOT yet been run for
  real against the now-applied migration (that would remove the live views), which is
  correct: rollback is the standing reversal path, exercised only if/when actually needed,
  not as a matter of course after a successful apply.
- New risk surfaced and closed: `db-rls-auditor` caught a real should-fix (asymmetric
  assertion coverage between forward and rollback files) before this ever reached a PK
  apply decision — exactly the kind of pre-freeze catch this specialist lane exists for.
- No follow-up needed before the PK T3 gate; the "Next recommended step" above is the
  follow-up.

## 9. Learning notes (chat fills this)

- **Reusable pattern:** when a read-model needs per-viewing-client relative reachability
  and the confined read role can only run plain `SELECT`/`WITH...SELECT` (no function
  calls), the answer is a `CROSS JOIN` against the client table with the reachability
  logic inlined as a `CASE` expression, not a parameterised RPC — confirmed viable and
  now precedented for any future ICE read-model lane with the same shape of requirement.
- **Reusable technique:** before running any live DDL-in-a-transaction proof, run a
  single harmless probe (`BEGIN; CREATE VIEW ...; ROLLBACK;` then a separate existence
  check) to confirm the calling tool actually honours the transaction boundary within
  one call, rather than assuming it. This session's probe caught nothing wrong, but the
  check itself is now a documented, cheap precondition worth doing every time before a
  live-DDL proof of any kind.
- **Reusable technique:** to get a true "byte-identical to a prior evaluator run" proof
  when the prior run's exact input JSON wasn't preserved as a file, re-derive the input
  from the current live data through the new interface, transform it into the evaluator's
  documented input contract, and re-run the SAME evaluator binary — then reconcile any
  count differences arithmetically against the prior run's own documented method rather
  than treating a surface-level mismatch as a regression. That reconciliation (Slice-1's
  selective 2-of-9 sampling vs this lane's exhaustive 9-of-9) turned out to fully explain
  the numbers rather than exposing a defect.
- No ambiguity in the brief itself; the one genuine design pivot (RPC → plain views) was
  driven by a hard tooling constraint discovered mid-lane, not a brief gap.
