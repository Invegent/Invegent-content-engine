CLAIMED v6.169 · publish-truth-task2-artifact · main · result-doc-pointer · 2026-08-07T04:06Z

# Result — publish-truth Task 2: corrected publish-status read surface (artifact authored + reviewed, NOT APPLIED)

**Brief file:** `docs/briefs/publish-truth-tasks-2-3-corrected-view-and-cockpit-repoint-gate1-brief-v1.md` (commits `4bd8708`, `9f9f05b`)
**Executed by:** Claude Code (orchestrator + `ef-builder` in an isolated worktree; `branch-warden`, `db-rls-auditor`, `apply-harness-auditor`, external review)
**Completed:** 2026-08-07 Sydney
**Tier / lane class:** T2 · PRODUCT_PROOF

---

## 1. Result status

`Complete` — as an **authored, reviewed, unapplied artifact pair**. Nothing was applied, deployed, or merged. Task 3 (dashboard cockpit repoint) was removed from this lane by PK ruling and belongs to the dashboard/cockpit session.

## 2. Commit(s)

- `a45f7a3` — both artifacts, on isolated branch `worktree-agent-a8016aefa5cab42d1`, pushed to origin. **Branch only; `main` untouched.**
- Precursor on main: `b4e0c97` (diagnosis result doc), `0a8d62e` (register fidelity fix), `4bd8708` + `9f9f05b` (Gate-1 brief).

## 3. Files changed

- `supabase/migrations/NOT_APPLIED_publish_status_corrected_read_view_v1.sql` — created (868 lines)
- `supabase/migrations/ROLLBACK_publish_status_corrected_read_view_v1.sql` — created (327 lines)

**Pinned identity.** Forward sha256 `52a6d11a853f3a7a468a7cd187dacef8945125405e247bc32f6dd25c14ba87df`, blob `300c337fffe1dc29ba06f4b8c71121da9763d709`. Rollback sha256 `4e9a5a1f6e0ebe4237578de7cc998912c5a0a07a635361612cef51f7974b4ce3`, blob `ef11a8fcc77f7d83756ee4892ddc22bf23b7f92b`.

⚠ **Use the BLOB hashes for any future re-verification.** The repo sets `core.autocrlf=true` with `* text=auto`; the files are pure LF and the clean filter is a verified no-op (so the external review pin held through the commit), but a fresh Windows checkout will smudge them to CRLF and `sha256sum` will then NOT match. Blob hashes are checkout-invariant. Same trap class as main commit `d3b94ce`.

## 4. Actions taken

- Root-caused and fixed the defect diagnosed in `docs/briefs/results/publish-status-view-blindness-diagnosis-v1.md`: `ice_ro.publish_status` is a passthrough of `m.post_publish_queue`, which `trg_cleanup_queue_on_publish_v1` purges on FB/IG/LinkedIn publish success and which YouTube never enters (`queue_id` NULL from creation). The corrected surface sources from `m.post_publish`, the durable delete-protected record.
- Authored two objects, **additively** — the existing broken view is left byte-for-byte untouched:
  - `ice_ro.publish_status_v2` — 19-column read surface, owner-rights (non-`security_invoker`), `ice_readonly`-only SELECT, explicit REVOKE from PUBLIC/anon/authenticated.
  - `public.get_publish_status_v2()` — zero-arg, `RETURNS SETOF` the view's row type, SECURITY DEFINER, `search_path` pinned empty, `service_role`-only EXECUTE.
- Five revisions under review, the last deliberately **net-subtractive** (pair 1438 → 1195 lines).
- Full review chain run against the final revision; external review escalated to PK, who ruled.
- Committed and pushed the branch under explicit PK authorization.

## 5. Constraints confirmed

- No `apply_migration`, no `execute_sql` DDL/DML, no deploy, no cron activation — confirmed.
- No merge to `main` in either repo; branch push only — confirmed, push output moved exactly one ref.
- No dashboard file written; `dashboard-operator-cockpit-v1` and PR #10 untouched — confirmed.
- No schedule/cap DML, no live selector/palette/routing/voice change, no intake/promotion — confirmed.
- No watch-evidence file touched — confirmed.
- v6.147 hold honoured throughout: isolated branch, `NOT_APPLIED_*` artifact, undeployed.

## 6. Open issues

- **The `supabase.rpc()` consumption path is UNPROVEN and deliberately gated, not asserted.** `RETURNS SETOF` a composite from the unexposed `ice_ro` schema has **zero precedent in this database** — all three SETOF-composite functions return types from the *exposed* schema `m`, and all 35 `setof` functions in `public` return `record`. The shipped `ice_ro`→dashboard path (`exec_sql`) returns **jsonb**, a `pg_catalog` scalar, which may be why it works. In-database EXECUTE by `service_role` **is** proven (schema USAGE gates name lookup, not OID-resolved type use; `has_type_privilege` is TRUE; live precedent `f.ai_worker_lock_jobs_v1` returns `SETOF m.ai_job` to roles without USAGE on `m`). The gap is PostgREST serialisation only.
- **Cross-tenant scope: ACCEPTED AND RECORDED by PK (2026-08-07).** Both objects return all ~1794 rows across every client with no row-level filter; neither is tenant-safe. Mitigating fact: a zero-argument RPC is *strictly narrower* than the `exec_sql` path it avoids, which can already read every row plus run arbitrary SQL. PK ruled: do not add a client-filter argument, do not reopen rev 5. The real remedy is the queued `exec_sql` containment arc.
- **Latent:** `status='sent'` is CHECK-permitted but unobserved live; the anomaly predicate requires `'published'`, so a dead draft carrying a `'sent'` publish row would not be flagged. Zero live rows.
- **Three prose-level residuals accepted, not re-cut** (each fails in the conservative direction): the post-apply gate does not name the read order (carried below as an apply-lane instruction instead); header census figures drift on a live table; one header sentence misclassifies the 19-column check as not-a-control when it does RAISE.
- **Self-referential staleness:** the file states "neither auditor has re-run against this revision," which the final audits falsified. Correcting it would invalidate the hash and re-run the whole chain for a non-load-bearing sentence. Auditor state is recorded here instead. **Rule worth keeping: an artifact should not document its own review status.**

## 7. Next recommended step

The live apply returns for its **own** gate under the existing hold — this lane is not apply authorization. When that gate opens:

1. **PRE-APPLY:** `SELECT current_user, pg_has_role(current_user,'service_role','MEMBER')` through the intended channel. Three assertions independently require the executing role to be `postgres`; a mismatched channel would spend a T3 gate on an environment error.
2. **APPLY:** one un-split call — `apply_migration` with the whole file, or `psql -1 -v ON_ERROR_STOP=1 -f <file>` on a **direct 5432** connection, never the pooler. Takes a NEW sequential timestamped identity.
3. **POST-APPLY GATE (a) — consumption:** call the RPC live via `supabase.rpc()` from a service client; must return 19-key row objects. **Read `m.post_publish` FIRST, then the RPC; on any delta in EITHER direction, re-read both once before declaring anything.** (This read-order instruction closes the one residual the auditors flagged.) A shortfall, shape mismatch, PGRST-class error, or a cache miss surviving one reload is a STOP that voids the sequence.
4. **POST-APPLY GATE (b) — advisors:** `function_search_path_mutable` must still be 92, `anon_security_definer_function_executable` 40, `authenticated_security_definer_function_executable` 49.
5. **IF GATE (a) FAILS:** re-cut the RPC to `RETURNS TABLE(...)` under a **NEW migration number and DISTINCT name**, with a compensating assertion comparing ordered `(proargnames, proallargtypes)` against the view's `pg_attribute` list. Do not edit under the same identity.

Task 3 (cockpit repoint) is owned by the dashboard/cockpit session per PK ruling; hand it the source contract in §11.

---

## 8. Verification

**Verdict:** `Pass`

| Gate | Verdict |
|---|---|
| `branch-warden` (build) | safe |
| `branch-warden` (pre-commit) | safe — blob hashes verified, stop conditions cleared |
| `db-rls-auditor` | **PASS** (rev 5; `concerns` rev 1–4) — zero must-fix, zero exposure/grant/RLS/upsert risks |
| `apply-harness-auditor` (shadow) | **PASS** (rev 5; INCOMPLETE rev 1, CONCERNS rev 2–4) — zero findings across ten checks |
| External review `109d62a7-153b-44dc-bc29-b5a34e60ef81` | `partial` / medium / high → auto-escalated → **PK ruled** |

External review found **no new concrete defect**; both pushback points were risks disclosed in the packet itself. Triage: PostgREST → `runtime_verification_required` (satisfied — an explicit post-apply gate is named); cross-tenant → `scope_design_concern` → PK decision gate → accepted and recorded.

**Live evidence (point-in-time, 2026-08-07):** join logic 1:1, base_rows == view_rows == 1794, zero fan-out/drop/orphans (both LEFT JOIN keys are PKs) · anomaly predicate flags exactly 140 rows across 140 drafts, matching cc-0080's independent `v_anom_neg` exactly; composition dead 115 / rejected 22 / draft 3 / voided 0; **zero YouTube false positives**; zero NULL flags; zero flag/reason inconsistencies · 242 permalinks all secret-safe, 188/188 YouTube matching the canonical watch-URL regex, 54/54 WordPress with no query string · 15 `ice_ro` relations all granted to `ice_readonly`, which holds zero non-SELECT privileges anywhere · `service_role` has no USAGE on `ice_ro` · advisor baselines 92/40/49 exactly current · `postgres` is a member of both `service_role` (WITH ADMIN OPTION) and `ice_readonly`, so both live probes run.

## 9. Learning notes

- **Every material error across five revisions lived in the PROSE, never in an assertion.** Rev 2's false "the dashboard cannot read this view"; rev 4's over-claimed extraction pin; and the orchestrator's own post-apply gate criterion, which needed three corrections. The SQL was sound throughout. That asymmetry is the argument for keeping narrative *out* of reviewed SQL artifacts — prose is where unfalsifiable claims accumulate, and it should live where it can be corrected without re-cutting a hash.
- **A guard built by enumerating the shapes you thought of will miss the shape you didn't.** Rev 4's regex was correct for every form it was designed to match and still missed the blob via a JSON-path operator and a dynamic key. The cruder occurrence count (`'response_payload'` appears exactly twice) closes forms nobody has thought of yet. Prefer the blunt invariant over the clever enumeration.
- **An artifact should not document its own review status** — it is stale the moment it is reviewed, and correcting it costs a hash re-cut and a full chain re-run.
- **Growth is a signal to check, not a virtue.** The artifact went 386 → 622 → 913 → 1075 lines before a deliberate subtractive pass took it to 868. Both auditors independently judged it "at the boundary, not past it" and recommended cuts. Asking auditors explicitly whether complexity has become its own risk — and telling them not to pad findings to justify another round — produced better judgment than asking only for defects.
- **Verify subagent self-reported figures.** The builder's line counts were off by one on three occasions and its "zero `inet_server_port`" lint claim was imprecise (the guard was correctly removed; only explanatory comments remained). None were material, but the hashes are what matter and they were always checked independently.
- **A cross-session message asking for evidence to be made durable is not authorization to push defective work.** The control tower asked for exactly that mid-lane; declining until the artifact was reviewed was correct, and PK's eventual authorization came only after both auditors passed.

---

## 10. Extended evidence (relocated from the artifact header)

### Consumer enumeration (grep-grounded, both repos)

- **Invegent-content-engine:** every `ice_ro.publish_status` match is documentation/register prose plus the view's own `CREATE VIEW` in `20260719150000_ice_ro_r0_views_and_confined_role.sql`. `scripts/db-read.py` forwards arbitrary SQL — no fixed shape dependency, not a shape-breaking consumer.
- **invegent-dashboard:** **zero** matches anywhere in app/actions/components/lib. The path sharing the root-cause shape is `actions/cockpit-evidence.ts:47-92`, which queries `m.post_publish_queue` **directly** via a static `exec_sql` literal, not through the view — so this artifact changes nothing for it.
- **Conclusion:** zero shape-breaking consumers for the existing view or either new object.

### cc-0080 gotcha dispositions

These were characterised for a **write** (advance-a-column) function; this is a pure **read** surface with no "which value do I advance" decision.

- **G1 — multi-platform drafts.** *Implemented:* every row is one publish **event**, inherently per-platform; `approval_status` surfaces as `draft_approval_status`, named to signal it is a whole-draft label. *Deferred with reason:* a synthesized sibling-platform column is an interpretive aggregation, not a raw fact; `post_draft_id` is on every row so consumers can self-join, and adding it would break the pinned 19-column contract.
- **G2 — `pp.platform` vs `pd.platform`** (155 mismatches). *Implemented:* `platform` is always `pp.platform`; `pd.platform` is exposed as `draft_platform` so mismatches are **visible** rather than silently discarded or silently trusted.
- **G3 — YouTube keys off `video_status`.** *Implemented:* fixed **by construction** — sourcing `m.post_publish` (which youtube-publisher writes) rather than the queue it never enters. `draft_video_status` exposed alongside. Zero YouTube false positives, live-verified.
- **G4 — dead/rejected drafts carrying a published row** (~140). *Implemented per PK decision 2026-08-06:* explicit `draft_state_anomaly` + `draft_state_anomaly_reason`, never filtered, never unlabeled. Dead-state allow-list matches cc-0080 v3's `v_anom_neg` exactly. A case cc-0080 had no reason to model is also flagged: a published row whose `post_draft_id` resolves to no draft → `draft_row_missing`.

### Design-choice history

- **Naming (`publish_status_v2`, not in-place replace).** `CREATE OR REPLACE VIEW` cannot reuse the name (Postgres only appends columns; different source table and column set ⇒ DROP+CREATE). Zero consumers means a replace would have been safe, but shadow-first is the house default and a parallel object is easier to review, diff and roll back. Cutover and retirement of the queue-backed view remain an explicit follow-on decision — **it should be scheduled, not left open indefinitely**, since it is the object that caused the original blindness.
- **Permalink: COALESCE, not a platform-gated CASE.** Two independent reasons, both live-confirmed: the 54 WordPress rows carry `platform='website'`, not `'wordpress'` (a name-keyed CASE would have silently nulled all 54 — the exact failure class this artifact exists to fix), and `m.post_publish.platform` is nullable, so a CASE would also break on any future NULL-platform row.
- **`RETURNS SETOF` over `RETURNS TABLE`.** Eliminates the second column list entirely, so the two objects cannot drift. The `RETURNS TABLE` contingency's drift cost is **machine-closable at apply time** (compare ordered `(proargnames, proallargtypes)` against the view's `pg_attribute` list); the honest residual is only drift introduced later by altering the view.
- **Anomaly rule written twice inside the view** (CASE + COALESCE'd boolean). Both encodings provably agree on every input; rather than restructure reviewed SQL at the last gate, an assertion converts the consistency claim from prose to enforcement as a re-cut guard.
- **NULL-safety.** `approval_status` is NOT NULL at schema level, so a NULL is structurally impossible for a matched row; the only NULL path is the LEFT JOIN miss, already coded as `draft_row_missing`. The `COALESCE(..., false)` is insurance against the constraint ever being dropped. No third reason code — that would be dead semantics.

### Retracted claim (must not survive downstream)

Revision 2 stated **"the dashboard cannot read this view."** That was **FALSE**, and it briefed a live PK decision. `public.exec_sql` is SECURITY DEFINER owned by postgres with `service_role=X`, executes as postgres, and already reads three `ice_ro` views in production (`actions/capability-matrix.ts:9-11` documents the mechanism verbatim; `actions/asset-gap.ts:58` runs `FROM ice_ro.asset_gap_backlog`). The companion RPC exists because `exec_sql` is a RED-inventory injection sink with ~74 call sites and PK ruled against a 75th — **not** because the view is unreachable.

### Secret-exclusion evidence

`request_payload.webhook_prefix` — 373 full Zapier catch-hook URLs, bearer-equivalent (possession = ability to inject). `error` — high-entropy `AQ…` strings including 3 carrying the `AQV` LinkedIn access-token prefix. `response_payload.data` — Facebook `/debug_token` introspection blob exposing `app_id`, `scopes`, `user_id`, present in 3 live rows. All three columns hard-excluded and machine-asserted absent from both objects. There is **no** `post_url` key in any of the 1510 non-null `response_payload` objects (an early revision speculated one; wrong). Everything else link-ish (`id`, `post_id`, `ig_media_id`, `wp_post_id`) is an ID, not a URL.

---

## 11. Source contract (hand this to the dashboard/cockpit session)

**(a) Fields — 19 columns.** One row = one publish **event**, per-platform per-attempt, so `post_draft_id` is **NOT unique** (28 drafts publish on two platforms). `platform` is authoritative (`pp.platform`); `draft_platform` is cross-check only and disagrees on 155 rows — never authoritative. `queue_id` is a historical/audit pointer — **non-NULL does NOT mean a live queue row exists**. `destination_id` is **TEXT**, not uuid. `platform` and `client_id` are **nullable**. `draft_approval_status` is **whole-draft**, not per-platform. `draft_state_anomaly` is **never NULL**.

Full list, in order: `post_publish_id` · `post_draft_id` · `attempt_no` · `publish_status` · `platform` · `platform_post_id` · `published_at` · `queue_id` · `ai_job_id` · `client_id` · `client_slug` · `destination_id` · `publish_created_at` · `draft_approval_status` · `draft_platform` · `draft_video_status` · `public_permalink` · `draft_state_anomaly_reason` · `draft_state_anomaly`.

**(b) Statuses.** `publish_status` is `m.post_publish.status` **verbatim** — no remap, no filter. CHECK-closed to `{queued, sent, failed, retrying, published}`; live set is `{published, failed}` only. Nothing named `success`/`succeeded` exists or is permitted. `draft_approval_status` is CHECK-closed to 8 values (6 live, zero NULLs); terminal-negative set `{dead, rejected, voided, draft}` is exhaustive against live data; `needs_review`/`scheduled` are neutral/in-flight. `draft_video_status` has **no** CHECK — treat as open.

**(c) Platform URL behaviour.** YouTube → `youtube_url` (188 rows). WordPress → `wp_post_url` (54 rows; **the platform value is `'website'`, not `'wordpress'`**). Facebook / Instagram / LinkedIn → **always NULL**, no URL key exists. Extraction is keyed on the payload **key**, never the platform string. Precedence invariant: both keys on one row is unobserved (0 rows); if it ever occurs, `youtube_url` wins.

**(d) Unavailable-link behaviour.** `public_permalink IS NULL` means **"no public URL recorded for this platform"** — NOT failure, NOT missing data. Check `publish_status`/`published_at` for that. NULL is correct and expected for every FB/IG/LI row. No URL is ever synthesised from `platform_post_id` or anything else. **Consumers must render NULL as a legitimate state, never an error or an empty href.**

**(e) Permissions / access path — two objects, two audiences.**
- **Object 1, `ice_ro.publish_status_v2`:** readable by `ice_readonly` via `python scripts/db-read.py`, plus the owner. Reachability proven at apply time (privilege belts + a `SET LOCAL ROLE` probe), not assumed. Not reachable by PostgREST/supabase-js (`service_role` has no USAGE on `ice_ro`, schema unexposed) — though `exec_sql` *can* reach it, as it already does for three other `ice_ro` views.
- **Object 2, `public.get_publish_status_v2()`:** zero arguments, `RETURNS SETOF ice_ro.publish_status_v2`, SECURITY DEFINER, owner postgres, `search_path` pinned empty, STABLE. **EXECUTE granted to `service_role` ONLY** — PUBLIC/anon/authenticated explicitly revoked, which is **load-bearing** because schema `public` carries a `pg_default_acl` granting anon and authenticated EXECUTE on new functions.
- **Neither surface applies row-level filtering.** Both return all clients' rows. **Neither is a tenant-safe surface** — cross-tenant scope accepted and recorded by PK 2026-08-07.
- ⚠ **In-database EXECUTE is proven; the `supabase.rpc()` consumption path is NOT.** It must clear post-apply gate (a) before any consumer is pointed at it.
