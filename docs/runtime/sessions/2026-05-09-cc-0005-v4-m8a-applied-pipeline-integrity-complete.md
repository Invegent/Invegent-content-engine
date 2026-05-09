# 2026-05-09 Sydney — cc-0005 v4 / M8a APPLIED (M8 Path A complete; pipeline-integrity block effectively closed) (v2.59)

**Outcome:** **M8a Path A APPLIED and CLOSED.** cc-0005 v4 APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place; `active=true` and `schedule='*/5 * * * *'` and `jobname='enqueue-publish-queue-every-5m'` all preserved unchanged across apply boundary. Legacy `public.get_next_scheduled_for(...)` fallback removed from cron 48's COALESCE chain. Autonomous slot-driven enqueue path preserved (V9 in-migration gate verified `INSERT INTO m.post_publish_queue` + `pd.scheduled_for` + `s.scheduled_publish_at` all still represented in rewritten command). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) deferred to M8b per v4 design.** `public.get_next_scheduled_for(p_client_id uuid, p_platform text, p_from_utc timestamp with time zone) RETURNS timestamp with time zone` continues to exist with original name and signature. The 2 manual callers (`public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`) NOT modified.

**Urgent pipeline-integrity block now effectively complete:** M1+M2+M3 (v2.55 lineage), M4 (v2.55), M5 (v2.55), M6 Phase A (v2.55), M6 Phase B (v2.56), M7 (folds into M8a per reconciliation §6 Q2; doc-only), **M8a (v2.59)**. M8b is the only residual M-series item; reserved as separate cc-NNNN brief for after manual caller remediation.

**Apply summary:**

| Item | Value |
|---|---|
| Brief | `docs/briefs/cc-0005-m8-atomic-cutover.md` (v4 patch, commit `577d8568`) |
| Migration name | `m8a_cron48_rewrite_and_legacy_cleanup_v1` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `apply_migration` (single atomic transaction; 2 components + 2 in-migration verify gates) |
| `apply_migration` return | `{"success": true}` |
| Result file commit | `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B) |
| Result file path | `docs/briefs/results/cc-0005-m8-atomic-cutover.md` (CC retained brief filename, not M8a-specific) |
| Rows dead-lettered | **344** |
| `dead_reason` | `m8_cutover_legacy_path_deprecated` |
| Cron 48 command md5 | `5113bc435fe5cb1a088931b66eabdbfe` → `57bbafb19a51308a69db18607c8ad991` |
| Cron 48 command length | 2054 → 2203 (+149 bytes; matches v3-rephrased comment additions) |
| Cron 48 active | `true` (unchanged) |
| Cron 48 schedule | `*/5 * * * *` (unchanged) |
| Cron 48 jobname | `enqueue-publish-queue-every-5m` (unchanged) |
| Component 3 (function rename + COMMENT) | DEFERRED to M8b per v4 design |
| `public.get_next_scheduled_for` | NOT renamed; original signature preserved |
| Manual callers | NOT modified (`public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`) |
| Rollback fired | NO |
| cc-0005 brief §8 path triggered | NONE (clean apply) |

**V1–V10' verification (all PASS):**

| V | Source | Expected | Actual | Status |
|---|---|---|---|---|
| V1 | `m.post_publish_queue` `dead_reason='m8_cutover_legacy_path_deprecated'` count | `0 + 344 = 344` | **344** | PASS |
| V2 | rows still matching cleanup criterion in `(queued, failed)` | 0 | **0** | PASS |
| V3 | `m.post_publish_queue` `status IN ('queued','failed')` count | `441 - 344 = 97` | **97** | PASS |
| V4 | `m.post_publish_queue` `status='dead'` count | `100 + 344 = 444` | **444** | PASS |
| V5 | post-apply dead+m8 set vs captured 344-row snapshot | exactly the 344 captured queue_ids | **344 returned, set-equal** (`/tmp/captured-344.txt` vs `/tmp/post-apply-344.txt` diff = empty) | PASS |
| V6 | per-status aggregates coherent | `queued=441→97, dead=100→444, published=95 unchanged` | `{dead: 444, queued: 97, published: 95}` ✓ | PASS |
| V7 | cron 48 `active=true` + schedule unchanged + jobname unchanged | identical to pre-apply (only command + command_md5 changed) | **active=true, schedule=`*/5 * * * *`, jobname=`enqueue-publish-queue-every-5m`** | PASS |
| V8 | cron 48 command no longer contains a function-call to legacy fallback | regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` matches false | **`still_has_legacy_substr=false`** | PASS |
| V9 | autonomous slot-driven enqueue path still represented | command contains `INSERT INTO m.post_publish_queue` + `pd.scheduled_for` + `s.scheduled_publish_at` | **all 3 true** | PASS |
| V10' | expected callers list = exactly 2 non-cron functions; 0 cron rows | `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`; cron 48 dropped | **2 functions returned (the 2 manual callers); 0 cron rows** | PASS |

V5 evidence: 344-row queue_id snapshot persisted to `/tmp/cc-0005-v4-targets-2026-05-09.json` (26,871 bytes; 344 distinct queue_ids; all `pre_status='queued'`) BEFORE the UPDATE fired. Post-apply set comparison was empty-diff; no row outside the captured snapshot was touched.

**Pre-flight + final re-verify (no drift between initial §1 capture and ~60 s pre-apply re-verify):** §1.0 sequencing gate cleared (cc-0003 v2 + cc-0004 both Complete v2.55/v2.56). §1.3 cron 48 `active=true`, `command_md5=5113bc4...`, `length=2054`, schedule `*/5 * * * *` — identical at re-verify. §1.4 callers list = exactly 3 (cron 48 + 2 manual functions); v4 §8.2.g HALT criterion not triggered. §1.5a cleanup count 344 (in band [250, 500]) — identical at re-verify. §1.5b distinct `pd.created_by` = only `seed_and_enqueue`. §1.5c un-publishable cohort = 94 (informational; recorded as separate follow-up per v4 design). §1.5d slot alignment misaligned count = **0** (HALT §8.2.l not triggered). §1.5 cross-check vs cc-0003 v2 + cc-0004 = 0 + 0 (no overlap). §1.6 snapshot persisted. §1.7 pre-state aggregates: queued=441, dead=100, published=95. §1.8 `pre_dead_reason_count=0` for `m8_cutover_legacy_path_deprecated`. §1.9 dead_reason cross-check: Bug 3=9 (cc-0003 v2), v4=43 (cc-0004) — both as expected.

**D-01 fires this cycle (chat side):** 1 fire (cc-0005 v4 D-01 review by chat). Verdict `agree / proceed`, M8a-only scope, normal controls. PK approval phrase: `"pk proceed with cc-0005 v4 M8a apply"`. Action type: `sql_destructive`. Conditions all met (re-run final verify; halt criteria not triggered; capture fresh queue_id list before UPDATE; use exact v4 §3 SQL verbatim; apply only after PK explicit phrase; run V1–V10'; commit result file). v2.59 4-way sync close commit (this) is doc-only and per protocol does NOT require a fire.

**Brief-runner-v0 patterns observed (cc-0005 v4 / M8a apply session, captured in result file §9):**

1. **Multi-component single-transaction with in-migration verify gates** — Component 1 (cron rewrite) → V7+V8+V9 verify gate → Component 2 count gate → Component 2 UPDATE. Each `RAISE EXCEPTION` inside a DO block atomically rolls back the entire transaction. Pattern is sound; produced clean apply on first attempt.
2. **md5 fingerprint cron edit verification** — Component 1's effect was independently verifiable post-apply via cron 48 `command_md5` transition (`5113bc4...` → `57bbafb...`) and length delta (+149 bytes). Cheap, deterministic, non-flaky. Reaffirms L11 from cc-0006 cycle.
3. **§1.6 snapshot persisted to local file** — captured 344-row queue_id JSON to `/tmp/cc-0005-v4-targets-2026-05-09.json` BEFORE the UPDATE. Set-comparison V5 used local diff between captured set and post-apply set (zero diff). Rollback authority concretely materialised; no reliance on in-memory state.
4. **V10' "expected delta" framing** — pre-apply 3 callers, post-apply 2 callers (cron 48 dropped by design). Reframed from "zero callers required" (v3) to "exactly the 2 manual callers; 0 cron rows" (v4). Delta-framed verification more accurate for partial-cutover patterns.
5. **Function rename deferral via Component 3 → M8b** — v4's design choice to ship cron rewrite + cleanup in M8a while deferring rename to a later session (after manual caller remediation) materially reduced apply-time risk. Manual callers continue to function unchanged. Cleanest path-A-with-incremental-cutover pattern in the M-series.

**Brief-runner-v0 lessons — cc-0005 v4 / M8a cycle:**

- **L19 (CC v3 pre-flight HALT pattern)** — **VINDICATED** by full closure cycle. v3 §1.4 caller check (substring → function-call-syntax regex via L16) HALTed correctly when expected (1) didn't match observed (3). v4 reframed expectations (3 callers, V10' delta framing) and applied cleanly on first attempt. Promotion to baseline candidate.
- **L20 (in-place patch vs scope-reduce vs new brief)** — **VINDICATED**. v4 retired Component 3 in-place; M8b reserved as separate cc-NNNN brief. v4 applied cleanly without retrying Component 3 in-line. Pattern proven: when a blocker requires non-trivial follow-up work, defer to a NEW brief rather than retry in-place. M8b is the exemplar.
- **L21 (scope re-banding pattern)** — **VINDICATED**. v4's [250, 500] band held; observed count 344 was inside band; no apply-time amendment required. Lower-bound HALT criterion (250) was not exercised but pattern is durable.
- **L11 (md5 baseline + post-md5 fingerprint)** — **VINDICATED AGAIN** (now twice across cc-0006 cron_edit + cc-0005 v4 sql_destructive cron edit). Promotion to baseline candidate.
- **L17 (in-place patching pattern)** — **VINDICATED AGAIN** (now three times: cc-0003 v2, cc-0005 v3 → v4, cc-0005 v4 itself was the in-place super of v3; v3 never applied). Promotion to baseline candidate.
- **L16 (function-call regex pattern)** — **VINDICATED AGAIN** (now twice: cc-0005 v3 review pass + cc-0005 v4 applied verification gates). Promotion to baseline candidate.
- **L18 (pre-flight cohort surfacing pattern)** — **VINDICATED AGAIN**. §1.5c un-publishable cohort (94 rows) surfaced cleanly; PK informed; cohort recorded as separate follow-up out-of-scope for M8a/M8b. Promotion to baseline candidate.

**M-series closure milestone:**

| Brief | Closure version | Apply commit | Rows / Effect |
|---|---|---|---|
| M1 + M2 + M3 | v2.55 (lineage) | (5 May) | Tier 1 queue integrity foundations |
| M4 | v2.55 (lineage) | (5 May) | State-capture override; 8/8 PASS |
| M5 | v2.55 (lineage) | (5 May) | Corrected cascade fix; 7/7 PASS |
| M6 Phase A | v2.55 | `d60dcfbc` | 9 Bug 3 fingerprint rows dead-lettered |
| M6 Phase B | v2.56 | `9d5bdd37` | 43 v4-mismatch rows dead-lettered |
| M7 | doc-only | (folds into M8a 4-way sync per reconciliation §6 Q2) | n/a |
| **M8a** | **v2.59 (this)** | result `eb820bae` | **344 legacy-origin future queue rows dead-lettered + cron 48 rewritten in place** |
| M8b | DEFERRED | TBD (separate cc-NNNN brief) | function rename + COMMENT after manual caller remediation |

**Total residual rows cleared by M-series dead-letter cycles:** 9 (Phase A) + 43 (Phase B) + 344 (M8a) = **396 rows** since 8 May 2026.

**Carry-forward post-v2.59:**

- **M8b separate brief** (NOT YET AUTHORED) — reserved as separate cc-NNNN brief. Sequencing gate: BOTH `public.draft_approve_and_enqueue` AND `public.draft_approve_and_enqueue_scheduled` must first be remediated (either updated to call the post-rename `__deprecated_m8b` slug, or refactored to no longer call the function at all). Once remediated AND V10' returns 0 callers, M8b applies the rename. Brief shape sketched in cc-0005 v4 §M8b follow-up section.
- **94-row un-publishable legacy draft cohort** — separate follow-up brief if PK directs. Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')`. Currently 94 rows; oldest 2026-04-17, newest 2026-04-25 (10-day pre-M3/M4 era window). Post-M8a these will silently never publish (cron 48's WHERE filter drops them). Resolution candidates documented in cc-0005 v4 brief §Separate follow-up section: (a) bulk dead-letter, (b) per-draft triage, (c) retroactive scheduling, (d) leave indefinitely.
- **Publisher latent config risk** (carry from v2.58) — doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml`; no deploy required (publisher currently working). Removes regression risk for next publisher deploy. P3 quick win (~5 min). PK directs scheduling.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, P2 sec, OPEN unchanged) — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key`. Rotation requires PK auth + vault entry creation + cron command refactor. Separate cc-NNNN brief.
- **Outstanding `m.chatgpt_review` close-the-loop UPDATEs** — 5 cumulative pending (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires). All deferred per PK "no Supabase writes" scope across v2.55 / v2.56 / v2.57 / v2.58 / v2.59.
- **Platform Reconciliation View brief candidate** — added inline post-v2.57 (commit `a8a241d1`). **Sequencing per PK directive: ALL THREE prior blockers now cleared (cc-0007 closure v2.58, cc-0005 M8a closure v2.59, urgent pipeline-integrity block effectively complete). Per PK directive 2026-05-09: this becomes the next major planning/work item after this sync close.**

**Pipeline-integrity block status (PK explicit framing 2026-05-09):**

| Block | Status | Closure |
|---|---|---|
| cc-0007 ai-worker 401 recovery | CLOSED | v2.58 |
| cc-0005 M8a Path A | **CLOSED** | **v2.59 (this)** |
| Urgent pipeline-integrity closure work | **EFFECTIVELY COMPLETE** | v2.59 (this; M8b is the only residual M-series item, gated on manual caller remediation; not blocking new work) |

**Per PK directive recorded at Platform Reconciliation View brief candidate addition (commit `a8a241d1`):** with all three sequencing blockers now cleared, **Platform Reconciliation View becomes the next major planning/work item after this sync close**. Implementation gates: Phase 0 confirmation defaults still pending (P1 TOP carry); architecture review §10 extension scope to be decided at brief-authoring time; manual override design (dashboard input form vs Supabase RLS-protected table) to be decided at brief-authoring time; API ingestion priority order (Facebook + Instagram via Meta Graph API likely first; LinkedIn manual until Phase 2.x; YouTube via Data API if possible) to be decided at brief-authoring time. Brief author when promoted: chat (consistent with observability-class cc-NNNN pattern). 13 seed manual observations from 2026-05-09 captured in dedicated 🟢 status block in `docs/00_action_list.md` (preserved across v2.58 and v2.59 closes).

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8b apply work. Single doc-only commit covering 3 files. cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files **untouched**.

**Closed v2.59:** **M8 Path A (cc-0005 v4 / M8a)** — Component 1 (cron 48 in-place rewrite) + Component 2 (legacy-origin future cleanup, 344 rows). Result commit `eb820bae`. M8b is the only residual M-series item (deferred to separate cc-NNNN brief; gated on manual caller remediation; not blocking new work).

**Open / deferred this turn (carried per PK explicit scope):** 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires) deferred per PK "no Supabase writes" scope; memory `recent_updates` v2.55+v2.56+v2.57+v2.58+v2.59 entries chat-owned at next opportunity; dashboard PHASES reconciliation **15th** consecutive deferral; M8b brief authoring deferred (gated on manual caller remediation); 94-row un-publishable legacy draft cohort cleanup separate follow-up if PK directs; Phase 0 scheduling still NOT scheduled; Publisher latent config risk follow-up (P3, carry); F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, carry); Platform Reconciliation View promotes to next major work item per PK directive.

**P0+P1 open count delta:** ~2 → ~2 (cc-0005 v4 / M8a was P3 scheduling; closure does not change P0+P1 count; pipeline-integrity block is now effectively complete though).

**State-capture exception count v2.59: 0** (cc-0005 v4 D-01 fire returned clean agree; no escalation, no override).

**Sequencing state for next session:**

1. **Platform Reconciliation View** — **PROMOTED to next major planning/work item per PK directive**. Brief authoring (chat) when scheduled.
2. **Phase 0 confirmation defaults** still gated (P1 TOP).
3. **AI cost view** (P3 quick win, ~1h estimate).
4. **Publisher latent config risk follow-up** (P3, doc-only patch, ~5 min).
5. **Personal businesses check-in** (P0 standing).

M8b brief authoring is held until manual caller remediation is scoped (separate work track; not blocking new work).
