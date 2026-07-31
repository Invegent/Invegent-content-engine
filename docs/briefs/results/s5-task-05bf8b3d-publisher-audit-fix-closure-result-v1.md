CLAIMED v6.88 · s5-cross-brand-evidence-schedule (task_05bf8b3d closure) · claude/s5-cross-brand-evidence-schedule-x7rbn8 · PK-decision-2 gate · 2026-07-31T03:35Z

# task_05bf8b3d — Facebook Publisher Audit-Write Defect: CLOSED + PROVEN (S5 decision-2 lane)

**Verdict:** CLOSED — fix live, verified, live-behaviour-proven, recorded here; register release
gate formally cleared at v6.88 under explicit PK authority (S5 apply authorisation, decision 2,
2026-07-31: *"Close and prove that publisher defect under its own governed gate before the S5 apply
deadline. Include the PP Facebook image_quote cell only if the fix is live, verified, recorded, and
the register restriction is formally cleared."*).

## 1. The defect (register v6.83–v6.84, `task_05bf8b3d`)

The Facebook publisher's four `m.post_publish` insert call-sites never set `attempt_no` (silently
defaulting to 1 against `uq_publish_attempt (post_draft_id, attempt_no)`) and never checked the
insert's `.error` — a second/cross-platform publish-audit insert for the same draft silently
collided and dropped the audit row while queue/draft state still advanced. Standing RELEASE GATE:
announcement_card barred from unattended automatic selection until proven fixed.

## 2. Fix — live

- **Code:** commit `701b374` (2026-07-30, PK-authorised per its recorded gate trail: Gate-1 brief →
  ef-builder isolated worktree → branch-warden safe → db-rls-auditor pass → external review
  agree/medium/high, review `2c8cda87`, diff hash `6f9bcaeb…` → PK authorized). Publisher v1.12.0:
  pure `nextAttemptNoFrom` helper (`attempt_no.ts`, unit tests `attempt_no_test.ts`), `attempt_no`
  derived + set on all four insert payloads, insert `.error` captured/logged,
  `audit_row_inserted` surfaced per result row. Same pattern ported to instagram-publisher and
  linkedin-publisher (mirroring youtube-publisher v1.10.0 / linkedin-zapier-publisher v1.4.0).
  `verify_jwt=false` pinned for all three (`dc6b64c`).
- **Deployed:** live deployment **v102, ACTIVE, updated 2026-07-30T09:41:02Z**, project
  `mbkmaxqhsohbtwsqolns`.

## 3. Verification (2026-07-31, read-only)

- **Registered `deploy-verifier` run:** returned fail-closed **UNREADABLE→MISMATCH** — its subagent
  sandbox had no live read path (no Supabase MCP tools registered; org egress proxy 403 on the
  project host; no DSN). Correct fail-closed behaviour, recorded verbatim; per its own handoff the
  content checks were completed **orchestrator-side** (CCF-02 R1 substitution, named here), where
  the live read path exists.
- **Orchestrator content checks — source_read = deployed bundle via Supabase MCP
  `get_edge_function` (persisted output):**
  1. **Marker-in-deployed-bundle: PASS** — deployed bundle (5 files incl. `publisher/attempt_no.ts`)
     contains `const VERSION = "publisher-v1.12.0"`, the `nextAttemptNoFrom` import, the
     "ATTEMPT_NO AUDIT-GAP FIX — cc-0089 / task_05bf8b3d" header, ≥3 `attempt_no: nextAttemptNo`
     payload sites, ≥4 `audit_row_inserted` result fields.
  2. **Deployed == repo: PASS** — deployed `index.ts` and `attempt_no.ts` byte-identical to repo
     HEAD (CRLF-normalized; index.ts sha256 `95cfb20d78fc822d…` both sides). Repo HEAD contains
     `701b374` as the last publisher-touching commit.
  3. **verify_jwt == expected: PASS** — live `verify_jwt=false` (x-publisher-key caller intact).
  - **Drift verdict: FLAG (unread)** — advisory only per the two-verdict contract; drift class not
    readable this session, never a content STOP. Handoff: read `ice_ro.deploy_drift_status` from a
    DSN-bearing session.
- **Live behaviour proof (the defect's exact scenario, natural production data):** draft
  `51cc9770-e22b-4951-98ae-f2b7513c5163` carries **attempt 1** (website, 2026-07-30 00:00Z,
  published) and **attempt 2** (facebook, 2026-07-30 23:10Z — 13.5 h post-deploy — published,
  `error IS NULL`, real `platform_post_id`). Pre-fix, that second insert defaulted to
  `attempt_no=1`, collided on `uq_publish_attempt`, and the audit row was silently lost; post-fix
  it was written as `attempt_no=2`. No attempt_no anomalies in any post-deploy row (fb/ig/li
  sampled 2026-07-30T23:00Z → 2026-07-31T02:40Z).
- **Selector state (context):** `c.creative_template_selector_policy` row `efd263a5…`
  (facebook × `fb8a4a9b…`, priority 100, created 2026-07-30T10:33:02Z, reason "cc-0089: reapplied
  post task_05bf8b3d live-proof + PK ruling; PP-facebook publish paused for supervised hold pending
  render inspection") — announcement_card is now the deliberate governed FB winner, and PP×facebook
  `paused_until = 2026-08-01T10:33:02Z` is that 48-h supervised hold, not an incident pause.

## 4. Register clearing + conditions

- v6.88 pointer entry (this lane) formally clears the `task_05bf8b3d` release gate. The v6.84
  **platform scope ruling stands unchanged**: announcement_card production_proven suitability is
  Facebook-only, not extended to LinkedIn/Instagram.
- **Surfaced, not silent:** the supervised hold ("pending render inspection") expires on its own at
  2026-08-01T10:33Z. If PK intends a visual render inspection before unattended announcement_card
  publishes resume, it must happen before Sat 20:33 Sydney; the S5 apply (decision 4) only checks
  that the pause is no longer active.
- S5 consequence: **PP × facebook × image_quote is INCLUDED in the evidence window (decision 2
  first preference met — Variant A of `s5-apply-runbook-v1.md`).**

## 5. Reconciliation addendum (2026-07-31 — supersedes §4's unqualified inclusion)

PK reconciliation ruling (same day, after this doc was cut): PP × facebook × image_quote is
classified **`VISUAL_RELEASE_HOLD — CTA_PLACEHOLDER`**. Inclusion stands **subject to the hold**:
- Hold **mechanism** = `c.client_publish_profile.paused_until` (property-pulse × facebook);
  selector-policy row `efd263a5…` is **rationale only**, not a mechanism.
- Successful CAS mutation recorded: `2026-08-02 12:00:00+00` → **`2026-08-03 12:00:00+00`**
  (live-verified 2026-07-31); hold rollback value `2026-08-02 12:00:00+00` (PK-owned, outside S5's
  restoration set — S5 never writes `paused_until`).
- The path stays **excluded while paused** (with all PP facebook publishing + fills); the active
  hold is converted from a global apply STOP into **one accepted bounded exception** (runbook §R);
  all unaffected S5 schedule/cadence/evidence changes continue. Day-1 PP fb slots = expected
  `publish_path_disabled` skips; PP fb evidence runs Tue 2026-08-04 onward unless PK extends.
- The `task_05bf8b3d` audit-defect closure in §1–§3 is unaffected — the gate stays cleared; the
  remaining withhold on this cell is the visual (CTA placeholder) release, not the audit defect.

## 6. Second reconciliation addendum (2026-07-31 — hold RESOLVED; supersedes §5's exclusion)

PK reconciliation #2 (authoritative facts): the governed Announcement Card **CTA production fix is
deployed**, the corrected render received **PK visual PASS**, and the CTA-placeholder release
condition is **closed**. Classification superseded: **`VISUAL_RELEASE_PASS — CTA_RESOLVED`**.
- PP × facebook × image_quote restored to **Variant A without qualification**; the expected Monday
  `publish_path_disabled` outcome is withdrawn; all PP facebook formats are expected to operate
  normally across the window.
- The platform-wide pause **must be cleared before the evidence window** (not left to expire mid
  day-1); the clearing is a **separate explicit mutation authorisation** — this lane never writes
  `paused_until`.
- A **smoke-only field-merge defect** remains under its own separately bounded follow-up; it does
  **not** affect the production render path and is not an S5 condition.
- §5's history (hold mechanism · CAS extension · bounded exception) is preserved append-only above;
  full record: runbook §R (historical) + §R2 (governing).
