# S5 Evidence Window — Apply Runbook v1 (PK-authorised 2026-07-31; executes Sat 2026-08-01 evening Sydney)

**Authority:** PK apply authorisation 2026-07-31 (this session): apply the reduced, P1-grounded
amendment set; PP fb image_quote per decision 2 (first preference — defect closed+proven+recorded+
register cleared) else decision 3 (exclude the cell only); STOP if PP fb pause still active; preserve
all holds. Plan: `s5-cross-brand-evidence-schedule-plan-v1.md` rev-2 (frozen `52c87048…`, external
review `49d12314` → PK escalation → these decisions). Baseline: `s5-evidence-window-p1-snapshot-v1.md`
(dump sha256 `7b8fecd8…`).
**Why Saturday:** PP facebook `paused_until = 2026-08-01 10:33:02Z` (20:33 Sydney) is a deliberate
cc-0089 48-h supervised hold ("pending render inspection" — selector-policy row `efd263a5…`). Per PK
decision 4 the apply runs only after it is inactive; execution is scheduled ~20:45 Sydney Sat, well
before the Sun 22:00 Sydney deadline and the Mon 01:00 materialise.

## Ordered sequence (single batch; a tripped STOP voids the remainder)

**S0 — pre-checks (read-only):**
1. `SELECT paused_until, publish_enabled FROM c.client_publish_profile` for property-pulse×facebook →
   **STOP unless `paused_until IS NULL OR paused_until <= now()`** (decision 4; the recorded value
   `2026-08-01 10:33:02Z` in the past satisfies "pause not active" — record the literal value).
2. Baseline drift check: re-read the 14 profile rows + per-cell schedule row counts + cap-override
   rows + mix-override count (expect 0) and diff against the P1 snapshot → **STOP on any drift**
   other than the known pause expiry (something else changed production since P1 → fresh PK gate).
3. Branch check: local HEAD contains the frozen packet; working tree clean.
4. Variant selection: Variant **A** if the `task_05bf8b3d` closure result doc + register-clearing
   entry are committed AND deploy-verifier content verdict = PASS (decision 2 conditions met);
   else Variant **B** (decision 3).

**S1 — A2 publish-cadence raises (5 calls, audit rows automatic):**
```sql
SELECT public.save_publish_cadence('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook', 4,20,'s5-evidence-window');
SELECT public.save_publish_cadence('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','instagram',4, 6,'s5-evidence-window');
SELECT public.save_publish_cadence('fb98a472-ae4d-432d-8738-2273231c1ef4','facebook', 4,10,'s5-evidence-window');
SELECT public.save_publish_cadence('3eca32aa-e460-462f-a846-3f6ace6a3cae','facebook', 3,10,'s5-evidence-window');
SELECT public.save_publish_cadence('3eca32aa-e460-462f-a846-3f6ace6a3cae','instagram',3,10,'s5-evidence-window');
SELECT public.save_publish_cadence('93494a09-cc89-41d1-b364-cb63983063a6','facebook', 3,10,'s5-evidence-window');
SELECT public.save_publish_cadence('93494a09-cc89-41d1-b364-cb63983063a6','instagram',3,10,'s5-evidence-window');
```
(7 statements — CFW and Invegent each need fb+ig; PP needs fb+ig; NDIS fb only. LinkedIn untouched.)

**S2 — A3 UI cap overrides (9 calls):** `SELECT public.save_schedule_cap_override(<client>,<platform>,4,20);`
for PP/CFW/INV × fb/ig/li. NDIS's 4 pre-existing rows untouched.

**S3 — A1 schedule replace-all (9 calls):** for each cell in
`docs/briefs/data/s5-apply-a1-payloads-v1.json` →
`SELECT public.save_publish_schedule('<client_id>','<platform>','<payload jsonb>');`
Payloads are COMPLETE row sets (PP 18/18/17 rows; CFW/INV 28 rows with weekend rows re-enabled).
**No call for any ndis-yarns or youtube cell.**

**S4 — A4 PP format-mix overrides (INSERT … RETURNING override_id; record ids):**
Variant A (PP fb image_quote INCLUDED — decision 2 satisfied):
```sql
INSERT INTO c.client_format_mix_override (client_id, platform, ice_format_key, override_share_pct, reason, effective_from)
VALUES
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook','image_quote',45,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook','carousel',25,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook','animated_text_reveal',15,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook','text',15,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','instagram','image_quote',45,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','instagram','carousel',30,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','instagram','animated_data',25,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','linkedin','text',50,'s5-evidence-window','2026-08-01'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','linkedin','image_quote',50,'s5-evidence-window','2026-08-01')
RETURNING override_id;
```
Variant B (PP fb image_quote EXCLUDED — decision 3): replace the four facebook rows with
`carousel 60 · text 25 · animated_text_reveal 15` (image_quote share 0 — no row). **Named residual
(not silent):** the ai-worker format advisor can override a slot's allocated format; a Variant-B
window can still see an advisor-chosen PP fb image_quote → announcement_card publish. If PK wants a
hard exclusion, that requires a selector/assignment-state change outside this authorisation —
surfaced, not taken.

**S5 — readback verification (STOP on any mismatch):** re-read the 14 profile rows, all 9 cell
row-sets (diff vs submitted payloads), the 9 override rows, the mix-override rows; then
`SELECT m.materialise_slots(7);` is NOT called manually — the edit-trigger re-flow + nightly cron
own materialisation; instead verify `m.slot` rows exist for 2026-08-03 with the new times after the
nightly run (or trigger re-flow evidence immediately).

**S6 — arm rollback:** confirm `docs/briefs/data/s5-rollback-a1-payloads-v1.json` +
restoration values (§7 of the plan) reproduce P1; schedule the 2026-08-10 09:00 Sydney rollback
reminder.

**STOPs (non-removable):** PP fb pause active · baseline drift · any RPC error/bounds rejection ·
readback ≠ submitted · unexpected rows in any touched table · rollback artifacts unreadable.
