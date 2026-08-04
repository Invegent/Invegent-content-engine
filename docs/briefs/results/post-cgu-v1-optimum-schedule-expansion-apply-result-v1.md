CLAIMED v6.130 · schedule-apply-closeout · main checkout · gate: PK apply confirmation + dashboard acceptance · 2026-08-04

# Result — post-cgu-v1-optimum-schedule-expansion apply (v11) + execution-provenance closeout

**Brief file:** `docs/briefs/post-cgu-v1-optimum-schedule-expansion-packet-v11.md`
**Executed by:** Claude Code (session `f20f008f-e98c-43ab-b9c2-747c9a460f01`, main checkout)
**Verified by:** Claude Code (session `b5236fd9-f5c7-4035-bb5c-60e383d168b2`, worktree `post-cgu-v1-optimum-schedule-expansion`) — independent read-only DB verification + live dashboard visual check
**Completed:** 2026-08-04 Sydney

---

## 1. Result status

`Complete`

## 2. Commit(s)

- N/A on the apply itself — the apply is a database transaction, not a repo commit. This result doc + the two register pointer edits are the only commits from this closeout, made directly on `main` in the main checkout.

## 3. Files changed

- `docs/briefs/results/post-cgu-v1-optimum-schedule-expansion-apply-result-v1.md` — created (this file)
- `docs/00_sync_state.md` — pointer entry added
- `docs/00_action_list.md` — pointer entry added

## 4. Actions taken

### 4.1 The apply itself

A single atomic `mcp__supabase__execute_sql` call (project `mbkmaxqhsohbtwsqolns`), `BEGIN;` through `COMMIT;`, executed the v11 frozen packet: 102 `client_publish_schedule` rows + 9 `client_format_config` rows (111 total), including the v11-specific AHA-10-1 fix — the `_expected_ownership_schedule`/`_expected_ownership_config` frozen-ownership datasets that independently pin row→client→platform→pre/after state ahead of the guarded `UPDATE`s for Changes 1, 2, and 10.

### 4.2 Execution provenance (corrected wording)

- **Executing Claude Code session:** `f20f008f-e98c-43ab-b9c2-747c9a460f01`
- **Checkout:** main repository checkout (`C:\Users\parve\Invegent-content-engine`) — not the isolated worktree
- **Dispatch:** `2026-08-04T10:19:49.758Z` (tool_use, `mcp__supabase__execute_sql`, 43,512-char query)
- **Successful return:** `2026-08-04T10:20:38.286Z` (empty result set — the identity-resolution `DO` block raised no exception)
- **Execution:** one atomic call, containing `BEGIN;` … `COMMIT;`, the AHA-10-1 expected-ownership protections, and both frozen-ownership datasets
- **Result:** transaction committed, all CAS/ownership/post-assertion/readiness checks passed per that session's own assistant text; its own after-state spot-check (`pp_fb_ig_enabled:10, pp_carousel_config_enabled:1, cfw_containing_config_enabled:2, invegent_containing_config_enabled:2`) matches this session's independent read-only verification exactly.

**Evidence-source correction:** session attribution and the precise dispatch/return timestamps above come from the **local Claude Code session transcript** (`f20f008f-e98c-43ab-b9c2-747c9a460f01.jsonl`, line 884/888), located by grepping every session transcript under this project's `.claude/projects` directory for a real dispatch of the v11 guarded `UPDATE`. **PostgreSQL itself provided no actor/session attribution** — `pgaudit` and `pg_stat_monitor` are both available as extensions but neither is installed on this project, and `get_logs` only surfaces a recent slice of Postgres log lines above a ~10s duration threshold, which does not cover this apply's individual statements. Database evidence (`pg_stat_statements` statement fingerprints, the durable rollback tables, and the committed after-state) **corroborates** the executed statement and its outcome; it does not itself identify who ran it.

### 4.3 `pg_stat_statements calls=3` — resolved, not open

The shared, ownership-guarded `UPDATE c.client_publish_schedule ... WHERE ... AND eo.expected_platform = $2 ...` (queryid `6674042157580624564`) shows `calls: 3, rows: 67` in `pg_stat_statements`. Pulled the full untruncated statement text to confirm: `eo.expected_platform` is a single scalar bind parameter, so the same normalized statement is issued **three times within the one v11 transaction** — once for Facebook (18 rows), once for Instagram (21 rows), once for YouTube (28 rows). 18 + 21 + 28 = 67, matching `rows` exactly. This is not evidence of two additional packet executions; confirmed closed.

### 4.4 Independent read-only DB verification (this session)

Before and after locating the executing session, ran independent read-only `SELECT`s against the live project (no writes):
- All 4 client-identity pins (`property-pulse`, `ndis-yarns`, `care-for-welfare-pty-ltd`, `invegent`) resolve to the exact UUIDs the packet pins.
- All 111 target rows present; aggregate enabled-state matches the packet's declared after-state exactly (23/102 schedule rows enabled, all 67 NDIS Change-1/2 rows disabled, all 9 config rows disabled).
- Durable rollback tables `c._rollback_post_cgu_v1_schedule_v10_20260804` (+ `_cfg`) exist live: 102 / 9 rows respectively, every row captured as `enabled=true` / `is_enabled=true` — a correct pre-mutation snapshot.
- Post-hoc ownership check on all 67 mutated NDIS rows (the exact class of gap AHA-10-1 targets): all 67 correctly belong to `ndis-yarns` on the expected platform. Zero wrong-owner mutations detected.

### 4.5 Live dashboard visual check (this session, PK-authenticated browser)

Backend/dashboard-source state: **PASS**. Dashboard UI visual state: **PASS**. Checked all four brands at `dashboard.invegent.com/clients?client=<slug>&tab=schedule` against the applied v11 after-state:

| Brand | Facebook | Instagram | LinkedIn | YouTube | Carousel |
|---|---|---|---|---|---|
| Property Pulse | 5/5 (untouched) | 5/5 (untouched) | untouched | **1/5** (Change 9 supervised-only ✓) | Active/enforced on FB+IG — Protection 1 lever intact |
| NDIS-Yarns | **10/28** (Change 1 ✓) | **7/28** (Change 1 ✓) | 14/14 (untouched) | **0/28** (Change 2 supervised-only ✓) | **Off** on FB+IG — Change 11 closure ✓ |
| Care For Welfare | **3/5** (Change 3 ✓) | **3/5** (Change 4 ✓) | 5/5, all forced to `text` (Change 5 supervised-only ✓) | not configured | **Off** — no carousel row, Protection 2 containment ✓ |
| Invegent | **3/5** (Change 6 ✓) | **3/5** (Change 7 ✓) | **5/5** (Change 8 ✓) | not configured | **Off** — Protection 2 containment ✓ |

No dashboard-read defect found; UI matches the DB's committed state exactly.

## 5. Constraints confirmed

- No SQL executed by this (verifying) session — every DB interaction here was a read-only `SELECT`.
- The isolated worktree (`post-cgu-v1-optimum-schedule-expansion`) left untouched under its PK-directed read-only hold — no file in it was read, edited, or committed during this closeout.
- No password/credential entry performed by this agent — the dashboard login was completed by PK; this session only navigated and read the already-authenticated page.
- No automatic cap raise or Phase-2 schedule mutation applied or scheduled.
- Commit scope limited to exactly this result doc + the two register files — verified via `git status --porcelain` immediately before commit (see §6).

## 6. Open issues

- None outstanding. (Prior open item — dashboard verification — is now closed per §4.5.)

## 7. Next recommended step

Enter the seven-day monitoring watch (below). No further action on this lane until the watch closes or a STOP condition fires.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**
- Output matches the frozen v11 packet's declared after-state, independently confirmed at both the DB and dashboard-UI layers, by a session that did not perform the apply.
- Constraints respected — see §5.
- No unexpected files changed; commit scope was verified immediately before commit (§9 below).
- Execution-provenance and `calls=3` questions from the incident review are both resolved with cited evidence, not asserted.

## 9. Learning notes (chat fills this)

- Local Claude Code session transcripts (`.claude/projects/<project>/<session>.jsonl`) are a genuine, searchable provenance source for "which session did X" questions in a multi-session/shared-worktree topology — more reliable here than DB-side audit tooling, which was not installed.
- `pg_stat_statements` queryid groups on parsed structure, not literal text — a single script issuing the same statement shape with a different literal per platform will show `calls > 1` for one apply, not multiple applies. Worth checking full (untruncated) query text before treating a `calls` count as suspicious.

---

## Monitoring window (armed this closeout)

- **Watch period:** 2026-08-04 ~20:20 Sydney → 2026-08-11 ~20:20 Sydney (seven days from the verified commit time).
- **What it watches:** the readiness-queue regressions named in the packet's exception list (PP YT `video_short_kinetic`, NDIS YT `video_short_stat`, CFW LI `image_quote` — all three supervised-only cells — and NDIS carousel closure), and the four brands' schedule/cap state generally, for any unexpected drift from the after-state recorded in §4.4–4.5.
- **Standing constraint for the duration of the watch:** no automatic cap raise and no Phase-2 schedule mutation. Any cap raise or further schedule change during this window is a fresh PK-gated decision, not a continuation of this lane.
- **This is a documentation/observation window, not new automated infrastructure** — no monitor process was built or armed by this closeout; "armed" means the above is now the recorded standing watch for this lane.

## Lane status: CLOSED

The schedule-apply lane (post-cgu-v1-optimum-schedule-expansion, v1→v11) is closed as of this result. The only open state carried forward is the seven-day monitoring watch above.
