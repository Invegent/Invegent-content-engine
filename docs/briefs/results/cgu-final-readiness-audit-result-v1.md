# Result — Creatomate Global Ultimate: Final Readiness Audit (Milestone 1 verdict + Milestone 2 gap ledger + re-run contract)

**Lane:** `cgu-final-readiness-audit` — the programme's final measurement session (read-only).
**Governing:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §1.1 (two milestones), §1.2 (target matrix, D1–D4 decided), §5.
**Executed by:** Claude Code (orchestrator). **Zero writes, zero applies, zero register cuts** — the register payload (§7) is handed to the WS-5 session's register-cut pass.
**Measured:** 2026-08-02 ~03:45–04:05 UTC, live project `mbkmaxqhsohbtwsqolns`, repo HEAD `8d92fe0`.
**Measuring instruments (per §1.1):** `get_client_production_readiness_queue` (all four brands, full output — 100 live cells), `classify_format_capability` (as captured per-cell by the queue), `c.creative_template_proof_event` (full read), `m.post_publish × m.post_draft` 90-day publish history + draft provenance, and the accepted D1/D2 evidence ledgers. Live truth was read directly in every case where it is readable; no doc's claim was substituted for it.

---

## 1. Result status

`Complete` — both verdicts delivered with per-cell evidence.

- **Milestone 1 (Governed Boundary Complete): FAIL on the strict §1.1 three-state test — 8 cells enumerated (§3.1) — but PASS under §1.1's own operational measuring rule ("boundary-complete = zero unowned non-ready target cells"), with exactly one PK disposition outstanding (INV carousel queue-absence, §3.2).** Zero unowned cells, zero unrouted silent-degrade classifications, zero live degrade paths (S7 v6.106 + S9 enforcement both live). The 8 strict failures are proof-*record* gaps and deferral-*visibility* gaps, not governance gaps.
- **Milestone 2 (Ultimate): NOT YET — 12 of 25 committed cells are fully state-1; the remaining 13 have exactly named missing evidence and arrival paths (§4).** The Milestone-2 enrolment-proof clause is already satisfied (NDIS zero-code enrolment, v6.113). The distance to Ultimate is: 1 natural kinetic slot + 2 PK wait-vs-accelerate decisions + 1 config reconciliation + 1 proof-event trail-alignment DML.
- **D2 final pick: CLOSED mid-session, before this audit's write-up** — applied 2026-08-02 03:43:40 UTC (Option C, merge `ec1c3c8`); verified live by this audit (§2 row 21–22). Not an open item anymore.

---

## 2. Phase 1 — per-cell classification table (the full target matrix)

Cell-state vocabulary (§1.1): **S1** = ready + production-proven · **S2** = explicitly deferred, reason recorded · **S3** = routed owned gap (named `responsible_lane`) · **—** = fails all three (enumerated in §3.1).

Live-read columns: `cap` = `capability_status` (+`/ge` = `governed_exempt` overlay) · `state` = `overall_state` · `reach` = `runtime_reachable`. Publish counts are real `m.post_publish.status='published'` rows in the last 90 days (read 2026-08-02). "PP event" = a `c.creative_template_proof_event` row `proof_type='platform_publish'`, `passed`, for that client×platform.

### image_quote (matrix: ✅ all 12 cells)

| # | Cell | Live read | 90d publishes | PP event | State | Evidence pointer |
|---|---|---|---|---|---|---|
| 1 | PP × FB | ready / ready / true | 50 (last 07-30) | ✓ ×2 (07-02, 07-05) | **S1** | queue + proof-event live reads, this audit |
| 2 | PP × IG | ready / ready / true | 42 (last 07-31) | ✓ (07-02) | **S1** | same |
| 3 | PP × LI | ready / ready / true | 21 (last 07-31) | **✗ none** | **—** (recording gap) | proof-event table has zero LI rows for any brand |
| 4 | NDIS × FB | ready / ready / true | 48 (last 08-01) | ✓ (07-19, B1) | **S1** | v6.94 B1 trail alignment + live reads |
| 5 | NDIS × IG | ready / ready / true | 29 (last 08-01) | **✗ none** | **—** (recording gap) | this audit |
| 6 | NDIS × LI | ready / ready / true | 8 (last 07-27) | **✗ none** | **—** (recording gap) | this audit |
| 7 | CFW × FB | ready / **blocked** / **false** | 10 (last 07-30) | ✓ (07-30, B1) | **S3** (routed: `capability_template_remediation`) | queue's own reason: "classifier says ready but not runtime-reachable" — see §5 note A |
| 8 | CFW × IG | ready / blocked / false | 44 (last 07-31) | ✗ | **S3** (routed) | same |
| 9 | CFW × LI | ready / blocked / false | **0 in 90d** | ✗ | **S3** (routed) | evidence decay — see §4 E3 |
| 10 | INV × FB | ready / blocked / false | 49 (last 07-31) | ✓ (07-26, B1) | **S3** (routed) | same as row 7 |
| 11 | INV × IG | ready / blocked / false | 45 (last 07-31) | ✗ | **S3** (routed) | same |
| 12 | INV × LI | ready / blocked / false | 5 (last 07-27) | ✗ | **S3** (routed) | same |

### text (matrix: 🎯 8 cells — D1)

All eight committed cells live-read `unsupported_silent_degrade/ge` with `overall_state='ready'` via the D1 governed-exempt rider — the accepted D1 treatment: **the live RPC output is the evidence; no synthetic proof rows** (Stage-0 ledger `docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-reconstruction-v1.md` §4–5, on `origin/main` with the 2026-08-02 review-correction `992f359`; rider migration `20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql` tracked on main).

| # | Cell | Live read | 90d publishes | State | Note |
|---|---|---|---|---|---|
| 13 | PP × FB | usd/ge / ready / true | 5 (last 06-29) | **S1** (D1 basis) | next slot 2026-08-06 |
| 14 | PP × LI | usd/ge / ready / true | 68 (last 07-17) | **S1** (D1) | |
| 15 | NDIS × FB | usd/ge / ready / true | 19 (last 07-20) | **S1** (D1) | |
| 16 | NDIS × LI | usd/ge / ready / true | 71 (last **08-02**) | **S1** (D1) | published today |
| 17 | CFW × FB | usd/ge / ready / false | 1 (06-23) | **S1** (D1) | thin history; reach=false is the §5-A config artifact, D1 keys on `platform_support` only |
| 18 | CFW × LI | usd/ge / ready / false | 11 (last 07-15) | **S1** (D1) | |
| 19 | INV × FB | usd/ge / ready / false | 4 (last 05-10) | **S1** (D1) | thin/stale history, noted |
| 20 | INV × LI | usd/ge / ready / false | 49 (last 07-31) | **S1** (D1) | |

### carousel (matrix: 🎯 PP FB/IG · ⏸ NDIS/CFW/INV FB+IG)

| # | Cell | Live read | 90d publishes | State | Evidence pointer |
|---|---|---|---|---|---|
| 21 | PP × FB 🎯 | ready / ready / true | 16 (last 07-26) | **S1** (D2 basis) | **D2 APPLIED 2026-08-02 03:43:40Z** — governance row `d2510001-…-0001` live-verified by that lane; ledger `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md` (23 FB publishes recorded 03-20→07-26); zero proof-event rows **by design** — the legacy pipeline is template-less, `proof_event.template_id` is NOT NULL, a row would be fabricated |
| 22 | PP × IG 🎯 | ready / ready / true | 14 (last 07-17) | **S1** (D2 basis) | same ledger (14 IG publishes 06-14→07-17) |
| 23 | NDIS × FB ⏸ | usd / blocked / true | 7 (last 06-19) | **S3** (routed `capability_template_remediation`) | deferral not queue-visible — §3.2 |
| 24 | NDIS × IG ⏸ | usd / blocked / true | 3 (last 07-21) | **S3** (routed) | same |
| 25 | CFW × FB ⏸ | usd / blocked / false | 1 (06-14) | **S3** (routed) | same |
| 26 | CFW × IG ⏸ | usd / blocked / false | 4 (06-23) | **S3** (routed) | same |
| 27 | INV × FB ⏸ | **absent from queue** | 0 in 90d | **—** (unclassified) | no queue row exists (no demand, no config, no publishing) — §3.2 disposition |
| 28 | INV × IG ⏸ | **absent from queue** | 0 in 90d | **—** (unclassified) | same |

### video_short_stat (matrix: 🎯 PP YT, NDIS YT · ⏸ D3 CFW YT, INV YT)

| # | Cell | Live read | Evidence | State | Pointer |
|---|---|---|---|---|---|
| 29 | PP × YT 🎯 | ready / ready / true | 16 publishes/90d; **2 governed publishes PK-accepted 2026-07-27** (`XPQ26cF9sBA`, `oHDyazW1isQ`; drafts `db67b61c`/`4dcd3c86`, `created_by='fill_function'`, slot-backed, authority pin fired) — but both slots were **force-filled early**, so **zero fully-natural occurrences**; **zero recorded platform_publish proof events**; assignment `visually_approved`, never rung-12 promoted; **no future PP YT stat slot exists** (queue `next_scheduled_occurrence=null`) | **—** (substantively proven, unrecorded) | `pp-youtube-three-consecutive-governed-stat-videos-result-v1.md` + this audit's draft-provenance read |
| 30 | NDIS × YT 🎯 | ready / ready / true | 4 publishes/90d, **none governed**: 3 are May legacy; the 2026-07-31 one is a hand-authored `created_by='postgres'`, slot-less draft (not the governed/natural path). Assignment `visually_approved` (07-20 CP-E). **No future NDIS YT stat slot** (`next_slot=null`) | **—** (no governed evidence) | this audit's provenance read |
| 31 | CFW × YT ⏸ D3 | platform reads `publisher_path_missing / not_configured / publisher_onboarding`, reason "No `c.client_publish_profile` row" | — | **S2** (per v6.120 disposition: the live mechanical classification carries the deferral's reason + lane) | `docs/00_sync_state.md` v6.120 |
| 32 | INV × YT ⏸ D3 | same | — | **S2** (same) | same |

### video_short_kinetic (+voice variants) (matrix: 🎯 PP YT · ⏸ NDIS/CFW/INV YT; voice variants deferred by the v6.115 scope rider)

| # | Cell | Live read | Evidence | State | Pointer |
|---|---|---|---|---|---|
| 33 | PP × YT 🎯 | ready / ready / true, **next natural slot 2026-08-03T07:00:00Z** (live-confirmed) | Rung 6 ✓ (proof events `2ccdb697…` template-level 08-01 + `4244b22f…` assignment-level 08-02) · rung 7 ✓ (out-of-band PK-confirmed render) · worker v3.16.2 deployed + `deploy-verifier` content PASS · activation applied (status `visually_approved`, governance `enabled=true`) · **rungs 8–9 NOT yet observed**; the 28 legacy kinetic publishes/90d are the pre-D4 ungoverned path and do not count | **—** (in flight; nearest natural closure) | `pp-yt-kinetic-worker-and-graduation-result-v1.md` (v6.119 + `b5bcd8b`) + queue live read |
| 34 | NDIS × YT ⏸ | usd / blocked / true | 3 legacy publishes (May); S7 excludes allocation | **S3** (routed) | deferral not queue-visible — §3.2 |
| 35 | CFW × YT ⏸ | platform `publisher_path_missing` | — | **S2** (D3-style) | v6.120 |
| 36 | INV × YT ⏸ | same | — | **S2** | same |

**Out-of-matrix queue cells (boundary check beyond the matrix):** every remaining live queue cell (avatar, `*_voice`, `animated_*`, `video_short`, `video_long_*`, NDIS carousel LI, PP carousel LI, etc.) is either `ready` or `blocked`-with-a-named-`responsible_lane` (`creatomate_global`, `capability_template_remediation`, `publisher_onboarding`). **Zero unowned cells anywhere in the 100-cell live output.** The `*_voice` kinetic/stat cells with scheduled future slots (e.g. NDIS YT kinetic_voice 08-03T01:30Z) are S9-contained: skipped slots are terminal, no silent degrade path exists (S9 resolver+publisher enforcement live, v6.58/v6.68; S7 allocation guard live, v6.106).

---

## 3. Milestone-1 verdict

### 3.1 Strict §1.1 three-state test: **FAIL — 8 cells**

| Cell | Why it fails the strict test | Class |
|---|---|---|
| PP LI image_quote (#3) | ready + 21 real publishes/90d, but zero recorded `platform_publish` proof events | recording gap |
| NDIS IG image_quote (#5) | same (29/90d) | recording gap |
| NDIS LI image_quote (#6) | same (8/90d) | recording gap |
| PP YT video_short_stat (#29) | governed publish proof exists and is PK-accepted, but unrecorded; zero fully-natural occurrences | recording + naturalness gap |
| NDIS YT video_short_stat (#30) | zero governed render/publish evidence of any kind | evidence gap |
| PP YT video_short_kinetic (#33) | rungs 8–9 pending (natural slot tomorrow) | in flight |
| INV FB carousel (#27) | ⏸ deferral recorded only in the ratified matrix; cell absent from the queue → not "visible in the readiness queue" | deferral visibility |
| INV IG carousel (#28) | same | deferral visibility |

### 3.2 Operational rule (§1.1's own measuring sentence): **PASS, one disposition outstanding**

"Boundary-complete = zero unowned non-ready target cells." Live: **every non-ready cell across all four brands carries a named `responsible_lane`** (independently re-confirming v6.117's all-brand routing verification at audit time); every `unsupported_silent_degrade` classification is routed and mechanically contained (S7/S9); D1 cells are governed-exempt/ready; D3's deferral visibility is satisfied per the v6.120 precedent.

**The one genuine disposition:** INV FB/IG carousel (⏸) produce **no queue row at all** (no demand, no config, zero 90d publishes — the cells are inert). PK options: **(a) accept queue-absence-of-an-inert-cell as satisfying state-2 for matrix-recorded deferrals** — a D3-style register note, zero mechanism (recommended: an inert cell cannot silently degrade, which is the property Milestone 1 exists to guarantee); or **(b)** build a deferral overlay in the queue RPC (a D1-rider-style migration) so ⏸ cells surface explicitly. Option (b) would also make the NDIS/CFW carousel and NDIS YT kinetic ⏸ cells read as deferrals instead of remediation-routed gaps (#23–26, #34) — today those satisfy Milestone 1 as S3 owned gaps, but the queue's stated treatment ("Apply capability enforcement (R3)") does not match the matrix's deferral intent. Bookkeeping mismatch, not a governance hole.

---

## 4. Phase 2 — Milestone-2 gap ledger (every committed 🎯/✅ cell not fully state-1)

Committed cells: 25 (12 image_quote ✅ + 8 text 🎯 + 2 PP carousel 🎯 + PP/NDIS YT stat 🎯 + PP YT kinetic 🎯). **Fully state-1 today: 12** (PP FB/IG, NDIS FB image_quote; all 8 text; both PP carousel — the last two families on their accepted D1/D2 evidence-ledger bases, which are terminal: no proof-event rows will ever exist for template-less paths). The Milestone-2 **enrolment-proof clause is DONE** (v6.113, NDIS, empty CE code diff). Remaining 13 cells:

**A — PP YT video_short_kinetic (#33) — nearest closure, no decision needed.**
Missing: rung 8 (real `m.post_draft` via the live S9 cron) + rung 9 (publish) + recorded proof events (+ rung-12 promotion when PK elects).
Arrival: **natural slot 2026-08-03T07:00:00Z** → S9 fill → ai-worker → video-worker v3.16.2 governed path → draft. **⚠ The rung-9 "PK publish gate" must be exercised knowing `youtube-publisher` is schedule-blind: approving the draft auto-publishes public within ≤30 min** (proven, 3-consec doc §3). After publish: record `platform_publish` (and optionally `real_draft_render`) proof events via `record_tmr_proof_event`, then re-run §6.

**B — PP YT video_short_stat (#29) — PK wait-vs-accelerate decision.**
Missing: (i) a recorded `platform_publish` proof event; (ii) a *fully-natural* occurrence (both existing governed publishes ran on force-filled slots — PK already accepted them as proof of governed production, 2026-07-27); (iii) rung-12 promotion.
The wait option has **no scheduled arrival**: the queue shows no future PP YT stat slot (post-D4, current allocation favors the kinetic family). Options for PK: **(1) accept the existing PK-accepted governed publishes as rung-9 evidence and record the proof events now** (a B1-pattern trail-alignment DML, T2/T3 gate — closes the cell in one sitting); **(2) supervised proof** — force-fill one stat slot exactly as the 3-consec lane did, let the full pipeline run, record events; **(3) wait** for the grid to naturally allocate a stat slot (indefinite — nothing scheduled).

**C — NDIS YT video_short_stat (#30) — PK wait-vs-accelerate decision (steeper: no governed evidence at all).**
Missing: rungs 7–9 end-to-end on the governed path (zero governed renders ever; the only recent publish was a hand-authored slot-less `postgres` draft), + proof events + promotion. No future NDIS YT stat slot scheduled. Options: **(1) supervised proof** — force-fill an NDIS YT stat slot through the live pipeline (the PP 3-consec precedent, spelled out: create/force-fill slot → cron chain fill→ai→auto-approve→video-worker→publisher → publish is auto-public ≤30min → PK verdict → record events); **(2) wait** for natural allocation (indefinite); **(3) PK re-defers the cell** (Milestone 2 explicitly allows re-deferral — the matrix's 🎯 would be re-cut, a PK act).

**D — proof-event trail alignment for 3 ready image_quote cells (#3, #5, #6).**
Missing: recorded `platform_publish` proof events only (real publish history: PP LI 21, NDIS IG 29, NDIS LI 8 in 90d). Arrival: one B1-pattern additive DML (v6.94 precedent — same table, same shape, PK apply gate), recording events against the existing `m.post_publish` history. Optionally fold in CFW IG (44/90d) and INV IG/LI (45/5) so every publishing cell carries its trail.

**E — CFW/INV image_quote blocked-on-config (6 cells, #7–12).**
1. Missing for all six: `client_format_config`/`platform_support` reconciliation — the queue's own named outcome; `runtime_reachable=false` is the only blocker (classifier reads `selectable` on every one; publishing continues live on FB/IG). Arrival: a config-reconciliation lane (likely T2 DML on `c.client_format_config`; the queue flips blocked→ready mechanically). Root context: CFW/INV are not format-mix enrolled; `runtime_reachable` composes `platform_support × client_format_config` and is advisory (see RPC's own provenance-correction comment block).
2. Missing for IG/LI cells: proof-event recording (fold into D).
3. **CFW LI (#9) additionally has zero publishes in 90 days** — after reconciliation it needs either one fresh natural publish or PK acceptance of >90d evidence; flag rather than assume.

**F — deferral-visibility disposition (#27–28 + bookkeeping on #23–26, #34).** §3.2's PK choice. Not blocking under the operational rule; blocks a strict-letter Milestone-1 PASS.

**Standing items touched but unchanged by this audit:** `task_05bf8b3d` (announcement_card unattended-selection release gate — unrelated to these cells, still open) · tmr-drift-probe daily status will read `error` until the Option-B patch lands (disclosed D2 side effect, PK-accepted — not an incident) · the v6.115 voice-variant scope rider keeps `video_short_kinetic_voice` + imagery-backed variants out of every count above.

---

## 5. Measurement notes (read before re-running)

- **A — `runtime_reachable` is advisory and orthogonal.** Per the RPC's own header (migration `20260730120000…`, provenance correction 2026-07-30): it composes `platform_support × client_format_config`; the `platform_support` half is enforced nowhere in the live fill path — `classify_format_capability` is the proven gate. Hence CFW/INV cells publish while reading `reach=false`. Do not read `reach=false` as "production is broken"; read it as the named reconciliation item.
- **B — `unsupported_silent_degrade` classifications are 90d-evidence-driven and now contained.** S7 (v6.106) closed the allocation edge; S9 closed resolver+publisher. A `usd` cell with a scheduled slot means that slot will be skipped terminally, not silently degraded.
- **C — proof events are assignment/template-scoped.** Template-less paths (D1 text, D2 legacy carousel) can never carry them (`template_id NOT NULL`); their accepted evidence is the ledger docs + live RPC/publish history. This is settled treatment, not a gap.
- **D — the brief's "rung 10+" phrasing maps to ladder rung 9** (publish proof, `m.post_publish.status='published'`) + its recorded `platform_publish` proof-event form; ladder rung 10 is selector eligibility (graduation contract §4).

## 6. Phase 3 — the re-run contract (the 10-minute Milestone-2 re-read)

Run these four reads verbatim; the pass conditions are mechanical. No new audit needed.

**R1 — queue (all four brands):**
```sql
SELECT b.c AS client, e->>'platform' pf, e->>'format' fmt,
       e->>'capability_status' cap, e->>'capability_status_overlay' ge,
       e->>'overall_state' st, e->>'responsible_lane' lane, e->>'runtime_reachable' reach
FROM (SELECT 'property-pulse' AS c UNION ALL SELECT 'ndis-yarns'
      UNION ALL SELECT 'care-for-welfare-pty-ltd' UNION ALL SELECT 'invegent') b,
LATERAL jsonb_array_elements(get_client_production_readiness_queue(b.c)) e;
```
PASS when: all 12 image_quote cells `st='ready'` (the 6 CFW/INV cells flip after lane E) · all 8 text cells still `ge='governed_exempt', st='ready'` · PP FB/IG carousel still `ready` · PP YT kinetic + PP/NDIS YT stat `ready` · zero non-ready cells without a `lane`.

**R2 — proof events:**
```sql
SELECT cl.client_slug, v.format_key, pe.platform, pe.proof_status, pe.occurred_at
FROM c.creative_template_proof_event pe
JOIN c.creative_template_client_assignment a ON a.id = pe.assignment_id
JOIN c.client cl ON cl.client_id = a.client_id
LEFT JOIN c.creative_template_variant_candidate v ON v.template_id = pe.template_id
WHERE pe.proof_type='platform_publish' AND pe.proof_status='passed';
```
PASS when rows exist for: PP×`video_short_kinetic`×youtube (lane A) · PP×`video_short_stat`×youtube (lane B) · NDIS×`video_short_stat`×youtube (lane C, unless PK re-defers) · PP×image_quote×linkedin, NDIS×image_quote×instagram, NDIS×image_quote×linkedin (lane D) · CFW/INV×image_quote×(ig/li) if folded into D. Text + PP carousel need **no** rows (note C).

**R3 — natural/governed publish provenance (the kinetic + stat closers):**
```sql
SELECT cl.client_slug, pd.recommended_format, pd.created_by, pd.slot_id IS NOT NULL AS slot_backed,
       pd.video_status, pp.published_at
FROM m.post_draft pd
JOIN c.client cl ON cl.client_id = pd.client_id
LEFT JOIN m.post_publish pp ON pp.post_draft_id = pd.post_draft_id AND pp.status='published'
WHERE pd.platform='youtube' AND pd.created_at >= '2026-08-03'
  AND pd.recommended_format IN ('video_short_kinetic','video_short_stat')
  AND cl.client_slug IN ('property-pulse','ndis-yarns');
```
PASS when PP kinetic shows ≥1 row `created_by='fill_function'`, `slot_backed=true`, published (lane A), plus the stat rows lanes B/C elect.

**R4 — promotions (only if PK elects rung-12 as part of "done"):**
```sql
SELECT cl.client_slug, v.format_key, a.assignment_status
FROM c.creative_template_client_assignment a
JOIN c.client cl ON cl.client_id=a.client_id
JOIN c.creative_template_variant_candidate v ON v.template_id=a.template_id
WHERE v.format_key IN ('video_short_stat','video_short_kinetic');
```

**Final verdict rule:** Milestone 2 = PASS when R1+R2(+R3) pass for all 25 committed cells or a PK re-deferral is recorded for the shortfall, **and** the §3.2 INV-carousel disposition is recorded (either option). The enrolment clause is already met (v6.113). Milestone 1 strict-letter flips to PASS with lanes D + F alone.

---

## 6b. PK DECISIONS (2026-08-02, direct chat — post-audit addendum)

PK ruled on all six open items, accepting each recommendation:

| # | Item | PK ruling |
|---|---|---|
| 1 | INV FB/IG carousel queue-absence (§3.2) | **Option (a)** — queue-absence-of-an-inert-cell satisfies state-2 for matrix-recorded deferrals. **This paragraph is the D3-style note:** INV FB/IG carousel are ⏸ per the ratified matrix (D2 scoped carousel to PP only for Ultimate v1); both cells are inert (zero demand, zero `client_format_config` enablement, zero 90d publishes) and therefore produce no readiness-queue row; an inert cell cannot silently degrade, which is the property Milestone 1 guarantees. No overlay is built (mirrors the v6.120 D3 disposition). **Milestone-1 cells #27/#28 are hereby state-2.** |
| 2 | Trail-alignment proof events (PP-LI, NDIS-IG, NDIS-LI image_quote) | **Authorized** — B1-pattern additive `platform_publish` proof-event DML (v6.94 precedent). Executes as a packet through the standard chain → PK apply gate. |
| 3 | PP YT `video_short_stat` | **Record against the accepted publishes** — proof events recorded against the two PK-accepted 2026-07-27 governed publishes (`XPQ26cF9sBA`, `oHDyazW1isQ`); no waiting for a natural slot post-D4 allocation may never schedule. Folded into the same packet as #2. |
| 4 | NDIS YT `video_short_stat` | **Supervised force-fill proof** through the real pipeline (PP 3-consec precedent), its own lane with PK gates mid-flight (publish is auto-public ≤30min). Re-defer remains the named fallback. |
| 5 | CFW/INV image_quote reconciliation (6 cells) | **Authorized** — data-only `client_format_config`/`platform_support` reconciliation lane, including the CFW-LI evidence-decay check. |
| 6 | Audit branch push | **Push** — `lane/cgu-final-readiness-audit` pushed to origin. |

Consequence for the verdicts: with #1 recorded, the strict Milestone-1 failing set drops from 8 cells to 6 (#27/#28 close as state-2); the remaining 6 close via the #2/#3 packet (3 cells + PP YT stat), the kinetic natural slot (#33), and the #4 lane (#30). Milestone-2 distance is unchanged in substance — every remaining cell now has an authorized, named lane.

## 6c. APPLY RECORD (2026-08-02, ~05:2x UTC — PK "apply A and apply B")

Pre-apply drift check: worktree clean at `903c5ba`; both packets byte-identical to their frozen
apply substance (post-freeze hash movement = the disclosed appended chain-record blocks only).

- **Packet A APPLIED** — one `execute_sql` call, the exact §2 DO block; no guard tripped (G1–G5 all
  passed). Post-apply §5 readback: exactly 4 rows `c9150001-…{1..4}` live with the specified
  assignment/platform/occurred_at values.
- **Packet B APPLIED** — one `execute_sql` call, the exact §4 DO block (incl. G2b); no guard tripped.
  Post-apply R1 re-read (CFW+INV, full queue): **all 6 image_quote cells now `ready`/`ready`/`reach=true`**;
  FB/LI text cells reach-true (still `governed_exempt`/`ready`); YT image_quote `is_probe_cell`
  flipped true→false as predicted; carousel cells untouched. **One honest prediction deviation:** the
  new IG `text` cells read `template_missing`/`blocked` (routed `creatomate_global`), not the predicted
  `not_configured` — same benign class (text is IG-unsupported; nothing publishes), noted, not a STOP.

**Milestone tally after the applies:** strict-fail set 6→2 in-flight cells (PP YT kinetic — natural slot
2026-08-03T07:00Z; NDIS YT stat — supervised lane per §6b #4). Committed-cell state-1 count 12→18
(PP-LI, NDIS-IG, NDIS-LI, PP-YT-stat, CFW-FB, INV-FB close). **Remaining Milestone-2 distance, exactly:**
1. PP YT kinetic rungs 8–9 (tomorrow's natural slot + PK publish gate + proof events);
2. NDIS YT stat supervised lane (run-sheet on this branch);
3. **4 residual image_quote recording items NOT covered by PK decision #2's scope** (it named 3 cells):
   CFW-IG (44 real publishes/90d), INV-IG (45/90d), INV-LI (5/90d) need only the same B1-pattern
   proof-event row each — a mechanical "Packet A2" awaiting PK authorization; CFW-LI additionally has
   zero 90d publishes → needs one fresh natural publish or PK acceptance of >90d evidence first.

## 6d. PACKET A2 APPLY RECORD (2026-08-02, ~06:0x UTC — PK "authorize Packet A2" then "apply A2")

Packet `docs/briefs/cgu-trail-alignment-proof-event-packet-a2-v1.md` (frozen `d1fcf582…`, chain:
`db-rls-auditor` clean · AHA shadow PASS all-10 · external agree `ba05dfdb`) **APPLIED** — one
`execute_sql` call, the exact §2 DO block, no guard tripped. Post-apply R2 readback: 3 rows
`c9150002-…{1..3}` live; **every publishing image_quote cell across all four brands now carries its
recorded `platform_publish` proof event** — the sole image_quote cell without one is CFW×LinkedIn
(deliberately excluded: zero 90d publishes; awaits a fresh natural publish or a PK evidence ruling).

**Tally CORRECTION (honest recount, no delta was wrong — the base was):** §4's "fully state-1 today: 12"
undercounted by one (3 iq + 8 text + 2 carousel = **13**); §6c's "12→18" is therefore **13→19**; after
A2 the correct count is **22 of 25 committed cells state-1**. Remaining 3: **PP YT kinetic** (rungs
8–9, natural slot 2026-08-03T07:00Z + PK publish gate) · **NDIS YT stat** (supervised lane, run-sheet
on this branch) · **CFW-LI image_quote** (evidence ruling: fresh publish vs acceptance of >90d evidence).

## 6e. NDIS YT STAT SUPERVISED LANE — Gate A executed; three findings (2026-08-02)

Gate A (PK "proceed") executed; full attempt-by-attempt record + the three structural findings live in
`docs/briefs/cgu-ndis-yt-stat-supervised-proof-runsheet-v1.md` §Execution record. Summary: (1) the
publisher pause also blocks slot fill (`m.is_publish_eligible` shared predicate — attempt 1 terminally
skipped); (2) NDIS stat natural fills are fitness-starved (0 of 26 candidates ≥ threshold 65, max 40 —
the `ready` cell can never naturally fill today; named programme carry); (3) NDIS's missing
`video_short_stat` governance row was a hidden prerequisite (classifier doesn't read it; both worker
gates fail closed without it) — added as a disclosed, reversible lane-prerequisite
(`c9150004-…0001`, PP row shape). Attempt 3 (Grattan "$3.31" source) was REJECTED by the auto-approver's
sensitive-keyword gate ("royal commission") — **PK Option B ruling: kept as honest evidence, never
approved/rendered**. Attempt 4 (health.gov.au source) proceeds on the preserved chain; publish remains
behind PK's final verdict + the active channel pause. CFW-LI: controlled `image_quote` nudge on natural
slot `46387fda…` (publishes 2026-08-04T03:04Z).

## 6f. NDIS YT STAT — PUBLISHED, CELL STATE-1 (PK publish verdict; lane CLOSED)

Attempt 4 published under PK's explicit Gate-B verdict: YouTube **`oCrtq6R9VFQ`** (2026-08-02 19:15:08Z,
`m.post_publish` `9fb06e0a…`, draft `4d81324a…`, governed render 43.9s, audio gate PASS −18.3 LUFS).
Proof events `c9150005-…{1,2}` (`platform_render` [supervised — vocabulary substitution disclosed] +
`platform_publish`) recorded on assignment `aa2179eb…`; re-read confirms the cell **STATE-1**.
Rejected "$3.31" draft `d6c7e3e3…` + the four-attempt record preserved as governance evidence
(run-sheet §Execution record + §Close-out). Fourth mechanism finding: `youtube-publisher` v1.14.0+
release-date gate held the future-dated draft correctly; released by CAS update under PK instruction.
**Committed-cell tally: 23 of 25 state-1.** Remaining 2, handed to the next session (PK: no new CGU
work from this one): PP YT kinetic (natural slot 2026-08-03T07:00Z + PK publish gate) · CFW-LI
image_quote (controlled slot `46387fda…` fills ~03:04Z, publishes 2026-08-04T03:04Z, then its
trail-alignment event + the final §6 re-run).

## 6g. NDIS YT STAT REOPENED — VISUAL-QUALITY REMEDIATION (PK ruling 2026-08-03; additive, §6f stands as the record of its moment)

PK's on-device review of `oCrtq6R9VFQ` found three template-fit defects (static "MARKET UPDATE"
eyebrow collision + wrong-brand copy · two-word StatValue geometry break past the char-only clamp ·
ContextLine exceeding the never-calibrated text-safe bounds). **Disposition:
`published_proof_captured / visual_quality_remediation_required / final_acceptance_open`.** All
publish/render/proof evidence preserved. Assignment `aa2179eb…` CONTAINED `visually_approved`→
`blocked` (approval columns untouched); live-verified `select_template` fail-closes and the queue
cell reopened as a routed owned gap. The PK-defined 7-point contained repair outcome (incl. making
calibrated constraints a mandatory graduation requirement) is recorded in the run-sheet ADDENDUM —
a future lane, not started from this one. **Corrected tally: 22 of 25 committed cells state-1**
(NDIS YT stat leaves state-1 until remediated re-close). Root-cause class recorded: rung-6 approval
is per-render, not per-content-envelope — nothing mechanically enforces a template's content
envelope at generation/render time; this is the substantive answer to the auto-onboarded-template
quality question and is also lodged as a correction against the (unratified) CGU Final proposal.

## 6h. RE-CLOSE RULE ADJUSTED + v1/FINAL QUALITY BOUNDARY (PK ruling 2026-08-03)

PK ruled the incident splits cleanly: **CGU v1 = one contained repair of a known defective committed
cell; universal future quality perfection is NOT a v1 pass condition.** The NDIS cell re-closes on
five conditions (eyebrow removed/parameterised · safe StatValue+ContextLine bounds for
`video_stat_reveal_9x16_v2` · one corrected NDIS replacement render · PK visual PASS · assignment
restored + selector/readiness verified) — **no second public publish** unless the repair changes
governed routing, rendering authority, or publisher behaviour; the preserved publish stands as the
platform-transport/evidence proof, the corrected render supplies the visual-quality proof. Full rule:
run-sheet §RE-CLOSE RULE ADJUSTED. Repair executes as **Lane A
`ws5-production-envelope-enforcement-foundation`** (reusable foundation + this repair); the
fleet-wide controls (calibration coverage across every production-selectable template · live bounds
validation · layout-aware generation · calibration as a mandatory graduation rung · ongoing
sampling/quality policy · reopen-only-on-systemic-failure) are **CGU Final quality hardening**
(Lane B `ws5-production-template-calibration-backfill`), recorded in the proposal's §0c on
`lane/cgu-final-proposal-ws5-correction`. Milestone-2 remaining set unchanged: PP YT kinetic ·
CFW-LI · NDIS stat re-close (by the adjusted rule).

## 7. Register payload (version-less — for the WS-5 session's register-cut pass)

> **✅ vX.XXX — CGU final readiness audit: Milestone-1 FAIL(strict, 8 cells)/PASS(operational, 1 disposition) · Milestone-2 = 12/25 committed cells state-1, gap ledger + 10-min re-run contract delivered (T1 · read-only; zero writes/applies)** — result: `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` (branch `lane/cgu-final-readiness-audit`).
> · Failing/open cells: 3 image_quote proof-event recording gaps (PP-LI/NDIS-IG/NDIS-LI) · PP+NDIS YT `video_short_stat` (**no natural stat slot scheduled for either**) · PP YT kinetic rungs 8–9 (natural slot 2026-08-03T07:00Z; approve = auto-public ≤30min) · 6 CFW/INV image_quote cells blocked on `client_format_config` reconciliation only. D1/D2/D3 all verified executed/closed on live truth (D2 applied 2026-08-02 03:43Z); enrolment clause met (v6.113).
> · **PK decisions 2026-08-02 (§6b, all six):** INV FB/IG carousel queue-absence = state-2 (D3-style note, no overlay — strict-fail set 8→6 cells) · trail-alignment proof-event DML authorized (3 image_quote cells + PP YT stat against the accepted 07-27 publishes) · NDIS YT stat = supervised force-fill lane (re-defer fallback) · CFW/INV config reconciliation authorized (incl. CFW-LI evidence-decay check) · branch pushed.
> · **BOTH PACKETS APPLIED 2026-08-02 (§6c, PK "apply A and apply B"):** Packet A (4 `platform_publish` proof events, hash `169d881b…`/`957d5379…`, chain clean+external agree `ce70d9c6`) and Packet B (4 CFW/INV `client_format_config` rows, hash `7503e1e7…`, chain clean+external partial→PK-ruled `aba9169b`) — zero guards tripped, post-apply verification exact (6 image_quote cells `blocked`→`ready`; one benign prediction deviation recorded). **Committed-cell state-1: 12→18** *(corrected at §6d: 13→19)*. Remaining M2 distance: PP YT kinetic rungs 8–9 (slot 08-03T07:00Z) · NDIS YT stat supervised lane · 4 CFW/INV IG/LI recording residuals outside decision #2's scope (§6c item 3, incl. the CFW-LI evidence-decay ruling).
> · **PACKET A2 APPLIED same day (§6d):** 3 further trail-alignment events (CFW-IG, INV-IG, INV-LI; hash `d1fcf582…`, chain clean, external agree `ba05dfdb`) — every publishing image_quote cell now carries its recorded proof event.
> · **NDIS YT STAT PUBLISHED + STATE-1 (§6e/§6f):** supervised lane complete under PK gates — 4 attempts, 4 structural findings (pause-blocks-fill · stat pool fitness-starved 0/26 ≥65 · missing governance row added `c9150004-…0001` · publisher v1.14.0 release-date gate), sensitive-keyword rejection preserved as evidence (`d6c7e3e3…`), publish `oCrtq6R9VFQ` (19:15Z), proof events `c9150005-…{1,2}`.
> · **REOPENED next day (§6g, PK 2026-08-03):** three visual template-fit defects on the live video → disposition `published_proof_captured / visual_quality_remediation_required / final_acceptance_open`; assignment `aa2179eb…` CONTAINED (`blocked`, approval history + all evidence preserved; selector fail-closes, cell = routed owned gap). 7-point contained repair outcome recorded (run-sheet ADDENDUM) incl. calibrated-constraints-as-mandatory-graduation-rung; WS-5 correction lodged against the unratified CGU Final proposal. **State-1: 22 of 25.** Open: PP YT kinetic (slot 08-03T07:00Z + PK gate) · CFW-LI (publishes 08-04T03:04Z + event) · NDIS stat remediated re-close.

## 8. Constraints confirmed

- Read-only throughout: zero DB writes, zero applies, zero deploys, zero register cuts; queue/proof/publish reads via `execute_sql` (no `ice_ro` view serves the readiness RPC — noted as a possible future R0 view, not built).
- Live truth read wherever readable; docs used only for accepted treatments (D1/D2 ledgers, PK acceptances) — and each such doc verified present on `origin/main` before being relied on.
- Mid-session HEAD movement (992f359 → 8d92fe0, the D2 apply landing) was detected and the audit re-based on it rather than reporting the stale D2-open state the seed packet anticipated.
- This branch contains exactly one new file (this doc); no shared-checkout file touched.
