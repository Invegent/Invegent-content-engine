# Brief — `m.post_draft` born-approved DB fence (Safeguard A)

**Created:** 2026-08-01 Sydney
**Author:** chat (orchestrator-direct; DB-lane brief per CLAUDE.md — `brief-author` is proven on
docs/planning briefs only, first DB-lane brief gets candidate-level scrutiny, so this one is
orchestrator-authored)
**Executor:** Claude Code (this session, isolated worktree) → PK deploy gate
**Status:** rev-3 — **REVIEW CHAIN COMPLETE, READY FOR PK GATE 2. NOT APPLIED, NO apply authority.**
`branch-warden` safe · `db-rls-auditor` pass (zero must-fix) · external review agree/medium/high
(`review_id` `19849fcf-952d-4956-bed8-f31831417603`), all against frozen hash `2bd2ae1e…`,
commit `16e1b75` on isolated branch `lane/post-draft-approval-fence` (not pushed, not merged).
(PK decision sitting 2026-08-01, items 6/7, relayed via cross-session message from the
programme-planning session — quoted verbatim below). Production apply remains a separate PK gate.
**Result file:** `docs/briefs/results/post-draft-approval-fence-result-v1.md` (created on completion)
**Tier:** T3 (production DDL: new trigger on a hot production table)
**Lane class:** SAFETY_GATE

> **PK decision (2026-08-01, item 6):** *"Approve Gate-1 for the approval-fence brief: freeze and
> review only. Approve the independent grant-revoke review chain, but preserve a separate
> production apply gate. The fence must prevent caller-supplied approver identity from becoming
> trusted approval provenance."* Execution note: *"the design requirement is now explicit: the
> fence must make caller-supplied approver identity (`draft_set_status.p_approved_by` /
> `ui_set_post_draft_status_v1.p_actor` free text) incapable of becoming trusted approval
> provenance, regardless of RPC or raw-SQL path. The AMBER residual is the fence's target, not a
> separate fix."*
>
> **This materially changes rev-1's design.** rev-1 scoped the fence to INSERT-time born-approved
> rows only and explicitly deferred the free-text-approver-identity problem to a separate RPC-level
> fix. Per this decision, that deferral is withdrawn: the fence itself must close it. rev-2 below
> (§Notes) replaces rev-1's trigger design; every other section is otherwise unchanged from rev-1
> except where marked.

---

## Task

Build Safeguard A from the NDIS Yarns "free chat" investigation
(`docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md` §4A): a DB-level fence
on `m.post_draft` making it structurally impossible for a row to be written already in a
post-review status ("born-approved") outside the one proven, currently-active governed path. This
closes the exact bypass mechanism of the 2026-07-31 incident — a raw-SQL INSERT set
`approval_status='approved'` + `approved_by='PK'` in the same statement that created the row,
skipping every review layer, and the row auto-published a false NDIS Yarns claim to YouTube within
hours. That row's audit field was corrected separately (v6.105); this brief is the structural fix
so the next raw-SQL INSERT cannot do the same thing.

## Source context

- `docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md` §3.2, §4 — names the
  defect and proposes Safeguard A.
- `docs/briefs/results/ndis-yarns-free-chat-video-remediation-record-v1.md` §4.1 — records the
  audit-field fix and explicitly leaves this safeguard open.
- Live evidence gathered for this brief (`db-rls-auditor` recon pass, 2026-08-01, read-only,
  project `mbkmaxqhsohbtwsqolns`) — full findings below; not re-quoted verbatim, but every claim in
  this brief traces to it or to a direct follow-up query run by chat.
- `authz.prevent_last_admin_delete()` + `trg_prevent_last_admin_delete` on `authz.user_role` — the
  closest existing house precedent for a fail-closed trigger guard with a named governed-override
  GUC. This brief's function matches its idiom (SECURITY DEFINER, `SET search_path TO ''`, GUC
  override, `RAISE EXCEPTION ... USING ERRCODE = '23514'`).
- `docs/00_sync_state.md` — Grant-Safety / migration-naming / R0-read-path standing rules apply
  unchanged.

## Live evidence (why the design is shaped this way)

**Only a trigger closes this — REVOKE/RLS structurally cannot.** `postgres` is the table owner
(REVOKE never applies to the owner) and `service_role` has `rolbypassrls=true`; both bypass RLS
regardless of `FORCE ROW LEVEL SECURITY`. The 2026-07-31 incident was performed as `postgres` via
raw SQL. A `BEFORE INSERT OR UPDATE` trigger is the only enforcement layer in Postgres that fires
unconditionally per-row regardless of role, ownership, or RLS bypass status.

**The `approval_status` vocabulary** (live CHECK constraint, `post_draft_approval_status_check`):
`draft` · `needs_review` · `approved` · `rejected` · `scheduled` · `published` · `dead` · `voided`.
"Post-review terminal-positive" = `approved`, `scheduled`, `published` — a row could bypass review
by being inserted directly into any of these three, not just `approved`.

**Every currently-live code path that creates a `m.post_draft` row, checked directly:**

| Source | Status at INSERT | Verified how |
|---|---|---|
| `ai-worker` (the generation pipeline) | `needs_review` or `dead` only | Repo grep, both call sites read (`index.ts:1531,1839,1902`) |
| `m.fill_pending_slots` / T0 governed studio (`20260613010000`) | `'draft'` (hardcoded literal in the `VALUES` clause) | Migration read directly |
| `public.manual_post_insert(p_platform, p_draft_body, p_approval_status, p_client_id, p_destination)` | **caller-supplied** `p_approval_status`, but `approved_by`/`approved_at` are hardcoded to `'manual-studio'`/`now()` **only when** `p_destination='queue'`, else both `NULL` | Function body read directly (`pg_get_functiondef`) |
| Everything else (`youtube-publisher`, `image-worker`, `video-worker`, publishers, `auto-approver`) | Never INSERTs a draft — only reads/updates existing rows | Repo grep across `supabase/functions` |

**`manual_post_insert` is one legitimate, currently-active born-approved path — and it is
identity-safe by construction.** A caller can force `approval_status='approved'` through it, but
**cannot** choose the `approved_by` value — it is hardcoded to the literal `'manual-studio'`, never
caller input.

**Full-table live audit of the incident's INSERT-time signature** (`approved_at = created_at` — the
proxy for "approved with zero elapsed time, i.e. never actually reviewed"): **15 rows total, every
one individually inspected** by `db-rls-auditor`. All 15 resolve to the incident row itself (now
corrected to `orchestrator_gate8_supervised`, v6.105), the `manual-studio` queue-bypass path above,
or previously-identified proof-lane residue (`cc-0089-audit-write-proof`) that is already
self-voided/inert.

**rev-2 addition — the complete closed vocabulary of `approved_by` values for rows currently in a
post-review status, live, first-hand verified (not relayed) via `pg_get_functiondef` on every
writer:**

| `approved_by` value | Live rows | Most recent | Writer (verified `pg_get_functiondef`) | Caller-controlled? |
|---|---|---|---|---|
| `auto-agent-v1` | 1,313 | 2026-08-01 (today) | `auto-approver` EF — hardcoded literal, `index.ts:268` | No |
| `manual` | 112 | 2026-07-30 | `public.draft_approve_and_enqueue[_scheduled](p_draft_id)` — hardcoded literal, no identity parameter | No |
| `portal-client` | (subset of above; overwrites `manual`) | — | `public.portal_approve_draft(p_client_id, p_draft_id)` — hardcoded literal, no identity parameter | No |
| `manual-studio` | 12 | 2026-03-27 | `public.manual_post_insert(...)`, `p_destination='queue'` branch — hardcoded literal, paired with `created_by='manual-studio'` | No |
| `orchestrator_gate8_supervised` | 1 | 2026-07-31 | The incident row, corrected v6.105 — historical, not an ongoing writer | n/a |
| `pk@invegent.com` | 3 | **2026-02-28** | No live function writes this — **5+ months stale, superseded by `manual`/`portal-client`** | Dead |
| everything else (`schedule-authority-goldenpath-proof`, `manual_test*`, `cc-0089-audit-write-proof`) | 1 each | ≤2026-07-26 | Proof-lane residue, self-voided/inert | Dead |
| `NULL` (with `approval_status` already in `approved`/`scheduled`/`published`) | 231 | **2026-06-26** (latest) | Legacy bootstrap/seed labels (`seed_and_enqueue`, `seed_client_to_ai_v2`, `fill_function`, `bundle_seed`, etc.) — none correspond to any currently-live EF or function; includes 2 further `created_by='postgres'` rows from **April 2026**, a second prior instance of the same raw-SQL anti-pattern, unattributed | Dead |

**The two caller-controlled (unsafe) writers, confirmed first-hand:** `public.draft_set_status`'s
`p_approved_by` (free text, no validation) and `m.ui_set_post_draft_status_v1`'s `p_actor` (free
text via `COALESCE`, no validation). Both can currently write `approved_by='PK'` on a real UPDATE,
reproducing the incident's trust-exploitation exactly — this is the AMBER residual PK's decision
names as the fence's actual target.

**Zero currently-active, ongoing legitimate flow relies on any pattern the rev-2 design (below)
would block.** The 231-row NULL/legacy cohort and the `pk@invegent.com` rows are historical data,
untouched by an INSERT/UPDATE-triggered guard; no live writer produces either pattern today.

## Scope

**In scope (rev-2 — per PK's 2026-08-01 decision):**
- One new `SECURITY DEFINER` trigger function + one new `BEFORE INSERT OR UPDATE` trigger on
  `m.post_draft`, purely additive (no `ALTER`/`DROP` of any existing column, constraint, trigger,
  function, grant, or RLS policy).
- **Closed-vocabulary approval-provenance guard, covering INSERT and UPDATE alike.** Any write that
  establishes or changes `approved_by` while the row is landing in `approval_status IN
  ('approved','scheduled','published')` is rejected **unless** `NEW.approved_by` is one of the four
  confirmed hardcoded-safe values: `'auto-agent-v1'`, `'manual'`, `'portal-client'`,
  `'manual-studio'`. This directly satisfies PK's requirement — no caller (raw SQL, `draft_set_status`,
  `ui_set_post_draft_status_v1`, or anything future) can make `approved_by` say `'PK'`, any other
  human name/email, or any unrecognized string, **regardless of which RPC or path is used.** This
  supersedes rev-1's narrower `created_by='manual-studio' AND approved_by='manual-studio'`
  INSERT-only exception — the closed-vocabulary check subsumes it (INSERT is just `TG_OP='INSERT'`,
  one case of the general rule) while also closing the UPDATE-side gap rev-1 deliberately deferred.
- The guard only evaluates when `approved_by` is actually being newly set or changed by this
  statement (`TG_OP='INSERT'` or `NEW.approved_by IS DISTINCT FROM OLD.approved_by`) — an unrelated
  `UPDATE` to an already-approved row (e.g. `video_status`) that leaves `approved_by` untouched is
  never affected, regardless of what value it already holds (including the historical
  dead/legacy `pk@invegent.com`/`NULL` rows — this trigger governs new writes, not retroactive data).
- A named governed-override session GUC (`m.allow_ungoverned_approval_provenance`), mirroring
  `authz.prevent_last_admin_delete`'s pattern, for adding a genuinely new governed approval source
  in future — settable only by a role that already holds equivalent privilege, so not an escalation.
- Hermetic proof covering: the incident replayed as both an INSERT and (separately) as a
  `draft_set_status`/`ui_set_post_draft_status_v1`-shaped UPDATE with `approved_by='PK'` — both
  blocked; every one of the four confirmed-legitimate writers succeeds unchanged; the historical
  legacy/dead rows are untouched by the guard since they don't re-write `approved_by`.
- A live dry-run verification post-apply, inside `BEGIN…ROLLBACK`: reproduce the incident's exact
  INSERT shape, and separately call `draft_set_status`/`ui_set_post_draft_status_v1` with
  `p_approved_by`/`p_actor='PK'` against a real (rolled-back) row — both expected to fail.

**Out of scope (named, not silently folded in):**
- **Editing `public.draft_set_status` or `m.ui_set_post_draft_status_v1` themselves.** The trigger
  fence protects them without touching their bodies — deliberately, since a trigger closes the gap
  for every caller of *both* functions plus any future one, where editing the two functions
  individually would not. If PK separately wants defense-in-depth at the RPC layer too (e.g.
  validating `p_approved_by` in-body), that is a distinct, later T2/T3 lane, not this one.
- **`m.ui_set_post_draft_status_v1`'s `EXECUTE ... TO PUBLIC` grant.** A separate finding
  (`security-auditor` triage, GREEN, D-01 packet ready) with its **own independent review chain**,
  approved to run in parallel per PK's decision item 6 — not this brief's concern. Verified NOT
  currently REST-reachable by `anon`/`authenticated` (live probe: `42501 permission denied for
  schema m`).
- **`manual_post_insert`'s free-text `p_approval_status` parameter, and its non-`'queue'`-destination
  edge case.** Named as a hermetic-proof verification item below (§Notes), not a design change —
  see the residual risk note.
- No RLS policy change. No GRANT/REVOKE. No change to any existing trigger or function body.

**Stated limit of this design, honestly, not smoothed over:** a closed-vocabulary check constrains
the *value* written, not *who* is capable of writing it — it defends against exactly the incident's
actual mechanism (a careless or shortcut raw-SQL/RPC write stamping a plausible-looking identity),
not against a determined actor who already holds `postgres`/`service_role`-level access, knows the
vocabulary, and deliberately writes `approved_by='manual'` via raw SQL to blend in. That deeper
problem — no real actor-identity binding exists anywhere in ICE ("ICE has no actor identity",
standing finding) — is not solvable by a single trigger and is not this brief's scope. This is the
same limitation the existing `authz.prevent_last_admin_delete` precedent already accepts (a
sufficiently privileged session could set its own override GUC too); this design is proportionate
to and consistent with that established house pattern, and it fully closes the one thing that
matters most: **no draft can ever again claim a named human approved it when they did not.**

## Allowed actions

- Read `m.post_draft`'s live schema, triggers, constraints, grants (already done for this brief;
  executor may re-verify).
- Author the trigger function + trigger as one migration file, additive only.
- Build hermetic proof (ephemeral schema or `BEGIN…ROLLBACK`-wrapped live test) covering every case
  enumerated in Success Criteria below — both INSERT and UPDATE bypass shapes, all four confirmed
  writers, the unrelated-column-update no-op case, the `manual_post_insert` edge case, and the GUC
  override.
- Run `branch-warden` + `db-rls-auditor` on the final diff.
- Prepare (not apply) the exact `apply_migration` call + rollback SQL for the PK deploy gate.

## Forbidden actions

- **No `apply_migration` / no live DDL execution of any kind without an explicit PK Gate-2
  instruction on the frozen diff.** Gate 1 (this decision) authorizes freeze + review only.
- No REVOKE/GRANT change in this lane (the `ui_set_post_draft_status_v1` grant fix is a separate,
  independently-gated lane per PK decision item 6).
- No edit to `public.manual_post_insert`, `public.draft_set_status`,
  `m.ui_set_post_draft_status_v1`, or any other existing function body.
- No touching of any historical row — this trigger governs future writes only; it does not
  retroactively affect existing data (including the 231 legacy-NULL rows and the dead
  `pk@invegent.com` rows).
- Active hold-states from `docs/00_sync_state.md` remain unchanged and untouched by this lane (NDIS
  video governance, dashboard diverged-main items, etc. — none intersect this table).

## Success criteria

- Migration is purely additive: `git diff` shows exactly one new function + one new trigger, zero
  lines changed elsewhere.
- Hermetic proof, all passing:
  - Incident replayed as an INSERT (`approval_status='approved', approved_by='PK'` in one
    statement) → rejected, `23514`.
  - Incident replayed as an UPDATE shaped like `draft_set_status('...', 'approved', 'PK')` and,
    separately, like `ui_set_post_draft_status_v1(..., p_actor:='PK')` → **both** rejected, `23514`.
  - A raw-SQL UPDATE setting `approved_by` to any string outside the four-value vocabulary (e.g. a
    plausible-looking but unrecognized value) → rejected.
  - Each of the four confirmed-legitimate writers (`auto-approver`'s UPDATE pattern,
    `draft_approve_and_enqueue[_scheduled]`, `portal_approve_draft`, `manual_post_insert`'s queue
    path) → succeeds unchanged.
  - An unrelated UPDATE to an already-approved row that does not touch `approved_by` (e.g.
    `video_status`) → succeeds unchanged, trigger not even invoked (confirms the `IS DISTINCT FROM`
    scoping is correct).
  - The `manual_post_insert(p_approval_status='approved', p_destination <> 'queue')` edge case
    (§Notes residual) → confirmed rejected (an unattributed approval), and confirmed this
    combination has no live caller today, so nothing breaks.
  - GUC override (`m.allow_ungoverned_approval_provenance='on'`) → bypasses the guard as designed.
- `db-rls-auditor` verdict `pass` on the frozen diff.
- `branch-warden` verdict `safe`.
- External review (`ask_chatgpt_review`) clean or all triage classes resolved, pinned to the frozen
  diff hash.
- Post-apply live verification (inside `BEGIN…ROLLBACK`, never committed): the incident's exact
  INSERT shape AND a `draft_set_status`/`ui_set_post_draft_status_v1`-shaped UPDATE attempt with
  `approved_by`/`p_actor='PK'` are both attempted against real function calls and rejected; rolled
  back; zero live data touched.
- Rollback SQL (`DROP TRIGGER`, `DROP FUNCTION`) proven syntactically and named in the result doc,
  not required to be run.

## Stop condition

Report per `docs/briefs/_template_result.md`, including the hermetic proof output, the review
chain's verdicts, and the exact frozen migration SQL + rollback SQL, then **stop at the PK deploy
gate (Gate 2)** — this is T3, deploy/migrate is a hard stop per CLAUDE.md regardless of how clean
the chain is. Gate 1 (this decision) does not authorize apply under any circumstance, including a
fully clean review chain.

---

## Notes

> **⚠ rev-3 CORRECTION — 2026-08-01, found by `ef-builder`'s own hermetic proof, not by
> inspection.** rev-2's trigger (preserved below, struck through in spirit, not in fact — see
> the note after it) has a real logic defect: in PL/pgSQL, `NEW.approved_by = ANY(ARRAY[...])`
> evaluates to SQL `NULL` (not `FALSE`) when `NEW.approved_by IS NULL`, so `NOT (...)` is also
> `NULL`, the surrounding `AND`-chain collapses to `NULL`, and `IF NULL THEN` is treated as
> false in PL/pgSQL — **the exception branch never fires.** A row landing
> `approval_status='approved'` with `approved_by` left `NULL` sails through completely
> unguarded — worse than spoofing `'PK'`, since a caller doesn't even need to know the
> vocabulary, just omit the column. This directly contradicts rev-2's own claim ("this trigger
> correctly rejects — NULL is not in the vocabulary") and defeats the brief's core requirement
> for exactly that one case. The historical `manual_post_insert` NULL-edge-case named as a
> hermetic-proof residual in rev-2 turned out to be the exact case that exposed the bug — the
> residual was right to flag, for the wrong reason. **Fix is a logic change (`NEW.approved_by
> IS NULL OR ...`), so per the build's own stop condition it was not silently applied — reported
> here as a brief revision instead.** The fix does not change design intent (NULL was already
> meant to be rejected); it corrects an implementation bug in the SQL that failed to realize
> that intent. rev-3 (below) is now what Gate 1 approves; rev-2's text is retained beneath it,
> unmodified, as the record of what was actually built and hermetically proven wrong.

> **rev-3 BUILT + HERMETICALLY PROVEN + FULL REVIEW CHAIN COMPLETE — 2026-08-01.** `ef-builder`
> patched the migration in its isolated worktree (`lane/post-draft-approval-fence`, commit
> `16e1b75`, migration sha256 `2bd2ae1eb34dd872ae17483a8aec2e627578bf0ab8c7f3f93e2df986fbb68fff`;
> rollback unchanged, sha256 `1a902c206e00a01f11e7a0b81f4a8dbc908d32fe10dbd8ab5f25c68ec1c48da2`)
> and re-ran the full hermetic harness: **18/18 PASS, 0 FAIL, 0 DEFECT** — including SC6/SC6b (the
> two NULL-bypass cases that were DEFECT before the fix), zero regression on the 16 that already
> passed.
>
> **`branch-warden`: `safe`.** Correct HEAD/parent chain, clean tree, diff is exactly the two
> expected files (migration + hermetic-test log), surgical fix confirmed not a rewrite, not
> pushed, not merged, primary `main` checkout confirmed unaffected.
>
> **`db-rls-auditor`: `pass`, zero must-fix.** Independently re-verified every load-bearing claim
> live rather than trusting this brief's prior recon: the `approval_status` CHECK vocabulary
> unchanged, all four pre-existing triggers unaffected, no name/version collision in the applied
> ledger, all five writer functions re-pulled via `pg_get_functiondef` and re-confirmed hardcoded
> (`draft_set_status`/`ui_set_post_draft_status_v1` re-confirmed genuinely caller-controlled — the
> two vectors this trigger targets). **Independently traced the NULL-fix truth table by hand**
> rather than accepting the brief's explanation. Confirmed the self-`REVOKE` is load-bearing, not
> cosmetic (new functions are born `PUBLIC`-executable by default ACL — a standing named trap in
> this codebase). Confirmed the assert block's fail-closed atomicity matches the proven
> `authz_last_admin_delete_guard_v1` precedent exactly. One non-blocking note: confirm at Gate 2
> that `apply_migration` submits the file as a single message (standard behavior; the assert's
> atomicity depends on it).
>
> **External review (`ask_chatgpt_review`): `agree`, risk `medium`, confidence `high`, zero
> pushback points, `requires_pk_escalation: false`** (`review_id` `19849fcf-952d-4956-bed8-
> f31831417603`, pinned to `reviewed_input_hash` `2bd2ae1e…`). Two commentary notes, neither a
> defect: (1) the disclosed "ICE has no actor identity" limitation wasn't backed by a specific
> citation in the review packet — true, it's a standing separate architectural finding, not
> something this migration could fix or needed to prove; (2) the reviewer restated the same
> design limit already disclosed upfront (defends the incident's actual mechanism, not a
> determined insider with existing DB access) — read as confirmation the disclosure landed
> clearly, not a new concern.
>
> **Full chain complete. This is now ready for PK Gate 2 — apply remains entirely PK's decision,
> not authorized by any part of this chain regardless of how clean it is.**

**rev-3 trigger** (corrected; supersedes rev-2 below):

```sql
CREATE OR REPLACE FUNCTION m.guard_post_draft_approval_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- deliberate governed override (adding a genuinely new governed approval source), settable only
  -- by a role that already holds equivalent privilege — not an escalation. Mirrors
  -- authz.prevent_last_admin_delete's override pattern.
  IF current_setting('m.allow_ungoverned_approval_provenance', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Fires only when this statement is ESTABLISHING approval provenance: the row is landing in a
  -- post-review status AND approved_by is being newly set/changed (not merely carried forward
  -- unchanged by an unrelated update, e.g. a video_status write on an already-approved row).
  -- rev-3: the NULL check is explicit and comes first — PL/pgSQL's `x = ANY(array)` evaluates to
  -- NULL (not FALSE) when x IS NULL, so without this guard `NOT (NULL)` is NULL, the AND-chain
  -- collapses to NULL, and `IF NULL THEN` is silently treated as false — the exception would
  -- never fire for a NULL approved_by. Hermetic-proof-confirmed defect in rev-2; fixed here.
  IF NEW.approval_status IN ('approved','scheduled','published')
     AND (TG_OP = 'INSERT' OR NEW.approved_by IS DISTINCT FROM OLD.approved_by)
     AND (NEW.approved_by IS NULL
          OR NOT (NEW.approved_by = ANY (ARRAY['auto-agent-v1','manual','portal-client','manual-studio'])))
  THEN
    RAISE EXCEPTION
      'm.post_draft: approved_by=% cannot become approval provenance for status % — only a recognized governed source may approve a draft, regardless of caller, RPC, or raw SQL (set m.allow_ungoverned_approval_provenance=on to add a new governed source)',
      COALESCE(NEW.approved_by, '<NULL>'), NEW.approval_status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER trg_guard_post_draft_approval_provenance
  BEFORE INSERT OR UPDATE ON m.post_draft
  FOR EACH ROW
  WHEN (NEW.approval_status IN ('approved','scheduled','published'))
  EXECUTE FUNCTION m.guard_post_draft_approval_provenance();
```

**rev-2 trigger, as built and hermetically disproven** (preserved for the record, not for use):

```sql
CREATE OR REPLACE FUNCTION m.guard_post_draft_approval_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF current_setting('m.allow_ungoverned_approval_provenance', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IN ('approved','scheduled','published')
     AND (TG_OP = 'INSERT' OR NEW.approved_by IS DISTINCT FROM OLD.approved_by)
     AND NOT (NEW.approved_by = ANY (ARRAY['auto-agent-v1','manual','portal-client','manual-studio']))
     -- ^ BUG: this whole line evaluates to NULL, not TRUE, when NEW.approved_by IS NULL — the
     --   IF below then silently does not fire. See rev-3 correction above.
  THEN
    RAISE EXCEPTION
      'm.post_draft: approved_by=% cannot become approval provenance for status % — only a recognized governed source may approve a draft, regardless of caller, RPC, or raw SQL (set m.allow_ungoverned_approval_provenance=on to add a new governed source)',
      COALESCE(NEW.approved_by, '<NULL>'), NEW.approval_status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER trg_guard_post_draft_approval_provenance
  BEFORE INSERT OR UPDATE ON m.post_draft
  FOR EACH ROW
  WHEN (NEW.approval_status IN ('approved','scheduled','published'))
  EXECUTE FUNCTION m.guard_post_draft_approval_provenance();
```

**Why the vocabulary array is inline, not a lookup table:** these four values are load-bearing
security constants, not application data — a lookup table would itself become a new writable
surface (who can INSERT into it?) without adding safety. Adding a fifth requires a fresh, reviewed
migration (`CREATE OR REPLACE FUNCTION`), the same durable path every other change to this guard
takes — this is the correct amount of friction for "who is allowed to say a draft is approved."

**Why the `WHEN` clause still matters even though the trigger now also covers `UPDATE`:** it means
the function body is never invoked for the overwhelming majority of writes — any row that isn't
landing in `approved`/`scheduled`/`published` this statement (which is most `UPDATE`s: `video_status`,
`image_status`, rejection, scheduling metadata, etc.) skips the trigger entirely at the executor
level, before the function even runs. Near-zero overhead.

**Residual named for hermetic proof, not resolved here:** `manual_post_insert(p_approval_status,
p_destination)` takes a caller-supplied `p_approval_status` and only sets `approved_by` to
`'manual-studio'` when `p_destination='queue'` — a call with `p_approval_status='approved'` and
`p_destination <> 'queue'` would land `approved_by=NULL`, which this trigger correctly rejects
(NULL is not in the vocabulary). No repo evidence of any live caller using that combination (the
callers live in the dashboard/portal repos, not checked out here), but the hermetic proof phase
must confirm this explicitly before build is considered done, per Success Criteria above.

**Collateral security finding, now a parallel independently-gated lane (not blocking this brief):**
`m.ui_set_post_draft_status_v1`'s `EXECUTE ... TO PUBLIC` grant — GREEN, D-01 packet ready
(`REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`), approved by PK (decision item 6) to enter
its own review chain now, with its own separate apply gate. `public.draft_set_status`'s grant layer
is already closed (June 2026, `D-2026-06-16-002`) — no action needed there.
