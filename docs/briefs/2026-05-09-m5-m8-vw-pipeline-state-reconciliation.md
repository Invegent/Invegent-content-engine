# M5–M8 reconciliation brief — against `m.vw_pipeline_state` definition

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Status:** decision note — reconciliation findings + sequencing recommendations + open questions for PK  
**Output type:** read-only analysis. **No production changes proposed in this brief.** All future production state changes go through normal D-01 + apply path.

---

## 0. TL;DR

Five applied + three pending migrations from the queue integrity remediation (M1–M8) reconcile cleanly with the §10.2 `m.vw_pipeline_state` contract. There is no view-vs-migration conflict. Two sequencing observations and three open questions for PK below.

**Headline:** the reconciliation is favourable. M5 already simplified M7 to nominal. M6 Phase A+B do not require `dead_reason` column-add work (verified read-only: all four pipeline tables already carry the column). Today's row counts have drained naturally vs the M5 session record (108 → 11 Phase A; 47 → 43 Phase B).

---

## 1. Inputs read

| Source | sha | Purpose |
|---|---|---|
| `docs/briefs/2026-05-05-queue-integrity-incident.md` (v3) | `751f7919…` | Canonical M1–M8 scope, fix order, defect framing |
| `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` | `d9398202…` | M5 actual delta + carry-forward statement of M6 scope |
| `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` (§10.2 + §10.7) | `ba0ced49…` | `m.vw_pipeline_state` contract, build-blocker decisions |
| `docs/00_action_list.md` v2.54 | (live) | Carry-forward classification of M6/M7/M8 |
| Live DB read — `information_schema.columns` for `dead_reason` presence on m/post_draft, m/post_publish_queue, m/ai_job, f/canonical_content_body | (live, read-only) | Phase 1.7 column dependency check |
| Live DB read — row counts for Phase A (Bug 3 fingerprint) + Phase B (v4 mismatch) + queue depth + already-dead | (live, read-only) | Scope sizing vs M5 session record |

Live read snapshot (2026-05-09, AEST morning):

| Scope | M5 session figure (5 May) | Today (9 May) | Delta | Note |
|---|---|---|---|---|
| Phase A — Bug 3 fingerprint (`q.scheduled_for ≈ q.created_at + 5 min`, ±60 s) | 108 | **11** | –97 | Natural FIFO drain over 4 days; M3 prevented new fingerprint creation; existing rows continue publishing in queue order |
| Phase B — v4 mismatch (`pd.slot_id NOT NULL AND q.scheduled_for != s.scheduled_publish_at`) | 47 | **43** | –4 | Slow drain; 4 rows resolved over 4 days |
| All queued+failed | (not stated) | 488 | n/a | Healthy queue depth |
| All dead | 47 (historic) | 48 | +1 | One additional dead row over 4 days |

**Implication:** the M5 session's row counts are stale by 4 days. Whatever apply-time scope is used must be re-verified at apply time, not lifted from memory. The work is smaller than memory implies, but the criterion definition matters — my Phase A criterion is the strict 5-min fingerprint; M5 session's 108 figure may have used a broader criterion (e.g. all pre-M3 legacy-origin queue rows). Open question 1 below.

---

## 2. Migration-by-migration reconciliation against §10.2

§10.2 commits `m.vw_pipeline_state` as a VIEW with these source tables: `m.digest_item` + `m.ai_job` + `m.post_draft` + `m.post_publish_queue` + `m.post_publish`. View contract attributes: `pipeline_row_id, state, state_since, client_id, digest_item_id, slot_id, ai_job_id, post_draft_id, post_publish_queue_id, post_publish_id, format_key, platform, scheduled_publish_at, last_error, dead_reason`. Precedence rules per §10.2 step 1–9.

### 2.1 M1 — Cleanup trigger fix (Bug 1) [APPLIED v2.50]

**Delta:** `m.cleanup_queue_on_publish_v1` filter changed from `post_draft_id` to `queue_id`. Prevents cross-platform deletion when a draft publishes on one platform.

**Reconciliation with §10.2:**
- Source-table impact: NONE — schema unchanged.
- View behaviour: previously, when a draft published on FB, the LinkedIn queue row was deleted. The view would then surface `published` for the FB row and have NO row to surface for the LinkedIn intent (gone). Post-M1, the LinkedIn queue row survives — view surfaces both, classifying FB as `published` and LI as `queued` (or appropriate state) per precedence.
- **No conflict.** M1 actually improves view fidelity: multi-platform schedule integrity is now visible to the view.

### 2.2 M2 — Per-partition cap (Bug 2) [APPLIED v2.50]

**Delta:** `m.publisher_lock_queue_v2` eligibility CTE adds per-partition cap enforcement before global LIMIT.

**Reconciliation with §10.2:**
- Source-table impact: NONE — schema unchanged.
- View behaviour: per-partition caps reduce the rate at which `queued` rows transition to `publishing`/`published`. The view's `state` column reflects this directly via precedence rules; no contract change.
- **No conflict.**

### 2.3 M3 — Fallback fix (Bug 3) [APPLIED v2.50]

**Delta:** `public.get_next_scheduled_for` returns NULL (was `p_from_utc + 5 min`). Cron jobid 48 skips rows where the function returned NULL.

**Reconciliation with §10.2:**
- Source-table impact: NONE — schema unchanged. Behaviour change at write-path layer.
- View behaviour: NEW pre-M3 anomalous rows are no longer created. The 11 historical Bug 3 fingerprint rows still in queue continue to surface as `queued` until either FIFO publishes them or M6 Phase A dead-letters them.
- **No conflict.**
- **Convergent with view design:** §10.2 precedence rule 5 surfaces `queued` for these rows; the brief notes "anomalous items are not permanently trapped — FIFO eventually reaches them, slowly". Today's snapshot (108→11) confirms the FIFO-drain hypothesis empirically.

### 2.4 M4 — Enqueue scheduled_for source fix + backfill (Defect 5 revised) [APPLIED v2.50]

**Delta:** Cron jobid 48 command uses `COALESCE(pd.scheduled_for, s.scheduled_publish_at, public.get_next_scheduled_for(...))` — adds slot lookup before the (now-NULL-returning) fallback. Backfill: 147 v4 drafts had `pd.scheduled_for` populated from `slot.scheduled_publish_at`.

**Reconciliation with §10.2:**
- Source-table impact: 147 row updates on `m.post_draft.scheduled_for`. NO column adds.
- View behaviour: §10.2's `scheduled_publish_at` view-attribute is derived from queue/post_publish. Post-M4, `q.scheduled_for == s.scheduled_publish_at` for v4-origin rows (modulo the 43 Phase B carry-forward). The view's `scheduled_publish_at` becomes deterministic for v4 rows.
- **No conflict.**
- **Convergent with view design:** §10.2 explicitly handles v4 with `digest_item_id IS NULL` via LEFT JOIN; M4 reinforced the slot-driven write path that the view contract assumes.

### 2.5 M5 — `p_shadow` / `is_shadow` removal [APPLIED v2.50]

**Delta:** `is_shadow` columns dropped from `m.post_draft` and `m.ai_job`. `p_shadow` parameter dropped from `m.fill_pending_slots` (old 2-arg signature retired). Cron jobid 75 command updated to remove `p_shadow := true` argument. View `m.evergreen_ratio_7d` rewritten to drop `live_*`/`shadow_*` column split. Function `m.check_evergreen_threshold` refactored to remove shadow ELSIF branch.

**Reconciliation with §10.2:**
- Source-table impact: 2 `is_shadow` columns dropped; old function signature dropped; one separate view rewritten.
- §10.2 view contract: does NOT include `is_shadow` in any attribute. View DDL written against §10.2 will compile cleanly post-M5.
- The separate `m.evergreen_ratio_7d` view (and its consumer `m.check_evergreen_threshold`) are NOT in the `m.vw_pipeline_state` source list. Independent.
- `m.brief` inputs (§10.5) reference `m.vw_pipeline_state` and `m.attention_item`; no `is_shadow` reference there either.
- **No conflict.** **M5 fully compatible with §10.2.**
- **Convergent with view design:** M5's removal of an unenforced flag is consistent with §10.2's preference for derived-state semantics over write-time labels.

**Significant downstream effect on M7:** see §2.7.

### 2.6 M6 Phase A — historical Bug 3 fingerprint dead-letter [PENDING]

**Delta proposed:** UPDATE `m.post_publish_queue` SET `status='dead'`, `dead_reason='anomalous_scheduled_for_bug3_fallback'` for rows matching the Bug 3 fingerprint criterion.

**Today's scope:** 11 rows (was 108 per M5 session record; FIFO drained 97 over 4 days).

**Reconciliation with §10.2:**
- Source-table impact: 11 row UPDATEs on `m.post_publish_queue.status` + `dead_reason`. NO column adds. NO schema migration.
- **`dead_reason` column verified present** on all four pipeline tables (live read 2026-05-09): `m.post_draft`, `m.post_publish_queue`, `m.ai_job`, `f.canonical_content_body`. **Phase 1.7 already shipped at column level.** M6 Phase A is NOT column-blocked.
- View behaviour: §10.2 precedence rule 1 ("If any related row is `dead` → state = `dead`") reclassifies all 11 rows from `queued` to `dead` automatically. The view's `dead_reason` attribute becomes populated for these rows.
- **No conflict.** **M6 Phase A is unblocked by view design.** 
- **Convergent with view design:** §10.2 explicitly carries `dead_reason` as a view attribute; M6 Phase A populates it for the first time at meaningful scale.

**Sequencing note 1:** M6 Phase A could ship before, during, or after `m.vw_pipeline_state` is built. Recommended order: ship M6 Phase A BEFORE the view, so the view's first day of operation shows clean dead-counts, not 11 rows of noise still classifying as `queued` despite being known-anomalous.

### 2.7 M6 Phase B — v4 mismatch dead-letter [PENDING]

**Delta proposed:** UPDATE `m.post_publish_queue` SET `status='dead'`, `dead_reason='anomalous_pre_m4_v4_mismatch'` (or similar) for rows where `pd.slot_id IS NOT NULL AND q.scheduled_for != s.scheduled_publish_at`.

**Today's scope:** 43 rows (was 47 per M5 session record).

**Reconciliation with §10.2:**
- Same shape as Phase A. NO schema impact, NO column adds.
- View behaviour: same as Phase A — precedence rule 1 reclassifies to `dead`.
- **No conflict.** **M6 Phase B is also unblocked.**

**Sequencing note 2:** M6 Phase B is genuinely sequenced AFTER Phase A per the M5 session record carry-forward. There is no architectural reason for the ordering — it appears to be an operator-comfort sequencing (clean the obvious anomaly cohort first, then the v4-pre-M4 cohort). Phase A and Phase B could ship in either order or together; §10.2 view design imposes no order on them.

### 2.8 M7 — Promote v4 (cron 75: `p_shadow := false`) [PENDING — BUT EFFECTIVELY NOMINAL]

**Delta originally proposed (queue integrity v3 brief):** Cron jobid 75 command change `p_shadow := true` to `p_shadow := false`.

**Critical finding from M5 session V6 verification (5 May 2026):**
> "V6 cron 75 command: no `p_shadow`" 

M5 already removed the `p_shadow` parameter from cron 75's command. The original M7 delta no longer applies — there is nothing left to flip from `true` to `false`, because the parameter no longer exists.

**M7's residual scope is whatever portion of "promote v4" was NOT subsumed by M5.** Candidates from the v3 brief that remain genuinely pending:
- (M7-residual-1) Document v4 as the canonical draft-generation path (decision-only; no schema/code change).
- (M7-residual-2) Update `04_phases.md` and `03_blueprint.md` to reflect v4 as the active path post-cutover.

Neither of these is a database migration. **M7 has effectively been absorbed into M5 + documentation work.**

**Reconciliation with §10.2:**
- Source-table impact: NONE.
- View behaviour: NONE.
- **No conflict.** **M7 reduces to documentation-only effort.**

**Open question 2:** Does PK want a formal M7 "promote v4" closure even though the substantive change happened in M5? Or fold M7 closure into M8?

### 2.9 M8 — Disable legacy enqueue + Phase B cleanup of legacy-origin futures [PENDING]

**Delta proposed (queue integrity v3 brief):**
- Cron jobid 48 (`enqueue-publish-queue-every-5m`): set `active=false`.
- Mark `public.get_next_scheduled_for` deprecated.
- Generate dead-letter list for remaining legacy-origin futures and apply UPDATEs.

**Note:** the queue integrity v3 brief used "Phase B" to mean the M8-time cleanup of legacy-origin futures. The M5 session record uses "M6 Phase B" to mean the 47 v4 mismatch rows. These are TWO DIFFERENT "Phase B" populations — same name, different rows. The reconciliation brief follows the M5 session record's definitions.

For clarity going forward:
- **"M6 Phase A"** = 11 Bug 3 fingerprint rows (today)
- **"M6 Phase B"** = 43 v4 mismatch rows (today)
- **"M8 cleanup"** = remaining legacy-origin futures (`pd.slot_id IS NULL AND created_by='seed_and_enqueue' AND scheduled_for > NOW()`) at the moment of cron 48 disable

**Reconciliation with §10.2:**
- Source-table impact: NONE on schema. Behaviour: cron config change + function deprecation marker.
- View behaviour: post-M8, NEW queue rows arrive only via the v4 path. The view continues to operate via LEFT JOIN on `m.digest_item` (per §10.2 edge-case row 4), so legacy rows already in queue are not orphaned by M8 — they just stop being created going forward.
- **No conflict.** **M8 fully compatible with §10.2.**

**Open question 3:** what is the M8 cleanup scope today? The v3 brief estimated ~140 rows under "legacy-origin futures" criteria. Today's queue depth (488 queued+failed) is roughly consistent with that. A read-only diagnostic at apply time will produce the actual count; it is NOT 140 verbatim.

---

## 3. Edge cases (§10.2) cross-checked against pipeline state

§10.2 lists five edge cases in the precedence-rules section. Reconciliation:

| Edge case | §10.2 resolution | Post-M1–M8 reality |
|---|---|---|
| `m.post_draft.approval_status='dead'` AND `m.post_publish_queue.status='queued'` for same `post_draft_id` | state = `dead` (rule 1) | M6 Phase A/B target queue rows whose drafts may already be in approved/published states. View precedence still applies cleanly: drafts at `dead` cascade. |
| `m.post_publish` exists AND `m.post_publish_queue.status='failed'` race | state = `published` (rule 2; success completes) | Bug 1 was generating these races (cross-platform deletion). M1 closes the source. View remains correct. |
| `m.ai_job.status='dead'` AND `m.post_draft` doesn't exist | state = `dead` (rule 1) | No M1–M8 migration creates this shape; ai-worker failure path handled separately. |
| Slot-driven draft (v4) with `digest_item_id IS NULL` | LEFT JOIN handles | M4+M5 reinforced the slot-driven path; **§10.2 contract was written assuming exactly this pattern**. Convergent. |
| Multiple `m.ai_job` rows for same draft seed (retries) | Use most recent by `created_at` | No M1–M8 migration changes ai-worker retry behaviour; §10.2 ordering rule applies independently. |

**No edge case is broken or made-broken by M1–M8.** All resolutions in §10.2 remain correct post-cutover.

---

## 4. View attributes that need separate Phase 0 attention (out of scope for M5–M8)

Two §10.2 view attributes are NOT addressed by M1–M8 and require Phase 0 implementation work:

### 4.1 `format_key` derivation

§10.2 contract: `format_key text — From c.client_publish_profile resolution per workflow`.

The view DDL will need a JOIN to `c.client_publish_profile` (or an upstream resolution function) to populate `format_key`. M1–M8 does not touch this. **Flag for M-09-03 implementer: format_key derivation is part of the view DDL, not a follow-up.**

### 4.2 Orphan-row handling (precedence rule 9)

§10.2: "Else → state is undefined (orphan row; surface in honest limitations)".

M1–M8 does not produce orphan rows directly, BUT there are theoretical orphan classes that the M-09-03 implementer should think about:
- Queue rows whose `post_draft_id` references a row that has since been hard-deleted (none expected; pipeline is dead-letter not delete).
- ai_job rows whose `digest_item_id` references a digest that has since been deleted (compliance with retention policy may produce this; defer).
- Pre-M5 rows that had `is_shadow=true` and were filtered out of dashboards — now visible but otherwise normal. These are NOT orphans; they have full table joins.

**Recommendation:** the M-09-03 view DDL should classify orphan rows as `state='orphan'` with a `last_error` indicating which join failed. This is more honest than NULL state.

---

## 5. Sequencing recommendation

```
  M5 (applied)                                                  §10.2 view contract
   |                                                             |
   +—————————— absorbs majority of M7 ——————————+   |
                                                             |   |
   M6 Phase A (11 rows) ——————————————————————————+   |
         |                                                       |
         v                                                       |
   M6 Phase B (43 rows) ——————————————————————————+   |
         |                                                       |
         v                                                       v
   M8 (cron 48 disable + cleanup) ——————————————————————> M-09-03 builds view
         |                                                       (Phase 0)
         v
   M7 closure (documentation; absorbs into PHASES sync)
```

**Recommended order:**

1. **M6 Phase A** (11 rows; ~30 min D-01 + apply + verify; D-186 closure budget impact ~0.5h)
2. **M6 Phase B** (43 rows; same shape; ~30 min)
3. **M8** — atomic: cron 48 active=false + dead-letter remaining legacy-origin futures (count read-only at apply time) + deprecate `public.get_next_scheduled_for` (comment only). ~1.5h estimate.
4. **M7 closure** — documentation-only; fold into next 4-way sync (action_list + sync_state + roadmap + memory) as "M7 closed via M5 + M8". No D-01 fire (doc-only).
5. **M-09-03** ships the `m.vw_pipeline_state` view in Phase 0. After step 4, the queue is clean and the view's first-day reading shows truthful state without anomaly noise.

**Steps 1–2 can run before or after PK's other priorities.** Steps 3–4 are gated by "PK ready to flip the legacy switch". Step 5 is Phase 0 and gated separately.

**Alternative ordering:** ship M-09-03 view FIRST (Phase 0), use it to OBSERVE the queue cleanup landing (Phase A then Phase B then M8 cleanup), let the view be the verifier. This is cleaner if PK wants visible evidence-of-cleanup. Cost: the view's first day shows 11 + 43 = 54 anomaly rows still classified as `queued`. Mostly aesthetic.

---

## 6. Open questions for PK

### Q1 — Phase A criterion definition

M5 session record cited 108 historical Bug 3 fingerprint rows. Today's snapshot using strict `q.scheduled_for ≈ q.created_at + 5 min` (±60 s) returns 11 rows. The 97-row delta is most likely natural FIFO drain over 4 days, BUT could also reflect criterion difference — the M5 session may have used a broader "all pre-M3 legacy-origin queue rows" definition.

**Question:** which criterion does PK want for the M6 Phase A apply? 
(a) Strict 5-min fingerprint (today: 11 rows). Cleanest causal claim. 
(b) Broader "any pre-M3 row whose `scheduled_for` doesn't match a configured slot" (would need to be re-counted; could be 50–80 rows). More defensive. 
(c) Even broader "any pre-M4 legacy-origin row currently queued" (overlaps with M8 cleanup scope; recommend NOT this).

Default recommendation: (a) strict fingerprint. The 11 rows are the rows that empirically match the Bug 3 mechanism described in the v3 brief Section 2. Anything broader is dead-lettering rows on a hypothesis-of-anomaly rather than evidence-of-anomaly.

### Q2 — M7 closure shape

M5's V6 verification confirms cron 75 already has no `p_shadow` argument. The original M7 delta ("flip `p_shadow := true` to `false`") no longer applies because the parameter doesn't exist. Two ways to close M7:

(a) Formal M7 closure note in `06_decisions.md` and `00_action_list.md` recording that M5 absorbed the substantive change. No D-01, doc-only. 
(b) Fold M7 closure into the M8 4-way sync — record both M7 and M8 as closed in the same session.

Default recommendation: (b). M7 and M8 were always intended as the cutover pair; closing them together is cleaner.

### Q3 — M8 cleanup scope

The v3 brief estimated ~140 legacy-origin future rows for M8 cleanup. Today's read-only diagnostic at apply time would produce the actual count. PK to confirm: is the cleanup eligibility criterion still `pd.is_shadow=false AND pd.slot_id IS NULL AND created_by='seed_and_enqueue' AND scheduled_for > NOW()`?

Note that `pd.is_shadow` no longer exists post-M5 — the criterion needs to be rewritten as: 
`pd.slot_id IS NULL AND created_by='seed_and_enqueue' AND scheduled_for > NOW() AND status IN ('queued','failed')`

Default recommendation: confirm this rewritten criterion at M8 apply time via read-only diagnostic. The v3 brief criterion was written pre-M5; M5's column drop necessitates the rewrite.

---

## 7. Risks / honest limitations

1. **Row counts re-verify at apply time.** Today's snapshot: 11 + 43. M5 session: 108 + 47. Whatever count is used in the apply migration must be from a fresh read-only SELECT, not from this brief or any other document. The criterion definitions are stable; the counts are not.

2. **`format_key` derivation is unspecified by M1–M8.** §10.2 says "From `c.client_publish_profile` resolution per workflow". This is implementation work for M-09-03, not M5–M8. **Phase 0 implementer must not assume `format_key` is a column on any pipeline table.** It is a derived attribute.

3. **`m.evergreen_ratio_7d` view (separate from `m.vw_pipeline_state`)** lost `live_*`/`shadow_*` column split in M5. Any external query against the old column names would break. M5 session noted GitHub TS search returned 0 hits, but PostgREST consumers could exist. **NOT in scope for this reconciliation brief; flagged for completeness.**

4. **The v3 queue integrity brief used "Phase B" with two different meanings** — the M5 session record's "M6 Phase B" (47 v4 mismatch rows) and the v3 brief's "Phase B at cutover" (legacy-origin futures). This brief uses the M5 session naming. Future briefs should pick one and stick with it; recommend dropping the v3 brief's "Phase B" terminology and using "M8 cleanup" instead.

5. **No D-01 was fired for this brief.** This is a decision-note + read-only investigation. Two read-only SELECTs ran (information_schema + row counts); no DML, no DDL, no cron edits, no deploys. D-01 will fire individually for each apply migration that follows.

6. **Read-only DB queries today did not check `c.client_publish_profile` column structure.** Phase 0 implementer should verify the JOIN columns exist before writing the view DDL.

7. **Sequencing recommendation in §5 is opinionated.** Alternative orderings work; PK's call.

---

## 8. Standing rules honoured

- **D-01:** Not fired (read-only + decision note; no production-state change).
- **D-170:** N/A (no migration applied).
- **D-186:** Closure budget — ~1.5h chat (read source files + 2 read-only SELECTs + author this brief). Architectural classification = excluded from closure floor.
- **Lesson #61:** Pre-flight P1–P5 not required (no apply step). Pre-flight verification done where it informs scope: column existence check, row-count check.
- **G1 convention:** This brief is at `docs/briefs/`, not `docs/runtime/sessions/`. Today's session file (when 4-way sync closes) will reference this brief.
- **STANDING_THREE:** No EFs touched.
- **§10.2 view contract:** All references in this brief are read-only against the contract; no amendment proposed.
- **Acceptance integrity (v2.50):** This brief will be re-read post-push to confirm landed content.

---

## 9. What is NOT in this brief

- Phase 0 scheduling (per PK's session-start instruction).
- Specific SQL for M6 Phase A / Phase B / M8 apply migrations.
- D-01 packet drafts for M6/M8.
- M-09-03 view DDL.
- `format_key` resolution function design.
- Implementation choice for the view (TABLE vs VIEW; §10.7 already locked as VIEW).
- Compatibility with future Phase 0 primitives `m.attention_item`, `m.action_event`, `m.brief`, `m.vw_agent_status`, scope (these primitives don't reference `m.post_publish_queue` directly except via `m.vw_pipeline_state`; the view isolates them from M5–M8 detail).
- Cron reliability triage (PK's tertiary today; separate brief if reached).

---

## 10. Recommendation summary

**Reconciliation verdict:** M5–M8 reconcile cleanly with `m.vw_pipeline_state` per §10.2. No view contract amendment needed. No source-table schema migrations needed beyond what M5 already shipped. M6 Phase A/B are unblocked at the column level.

**Recommended next-action sequencing (decision note for PK):**
1. Author cc-0003-style brief for M6 Phase A apply (11 rows; D-01 + apply + verify) — ~30 min
2. Author cc-0004-style brief for M6 Phase B apply (43 rows; same shape) — ~30 min
3. Author cc-0005-style brief for M8 atomic cutover (cron 48 disable + dead-letter + deprecation marker) — ~1–1.5h
4. Doc-only M7 closure folded into the M8 session's 4-way sync — included in step 3
5. M-09-03 view ships in Phase 0 (separate gating; not blocked by M5–M8)

Each apply step has its own D-01 fire, P1–P5 pre-flight, and apply approval per the normal protocol.

**No scheduling proposed in this brief.** PK directs sequencing.

---

*Brief authored 2026-05-09 Sydney morning session. Inputs: queue integrity v3 brief + M5 session record + §10.2 architecture review + 2 read-only DB queries. Output: reconciliation findings (§2), edge-case cross-check (§3), out-of-scope view attributes (§4), sequencing recommendation (§5), open questions for PK (§6), risks (§7). No production state changed. Awaiting PK direction on Q1–Q3 before any follow-up apply briefs are authored.*
