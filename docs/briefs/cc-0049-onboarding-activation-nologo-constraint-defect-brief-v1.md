# Brief — cc-0049 / F-ONB-ACTIVATE-NOLOGO-1: Onboarding Activation No-Logo Brand-Profile Constraint Defect (Gate-1)

**Lane class / tier:** SAFETY_GATE (broken production provisioning path) · **fix tier T3** (redefining a live SECURITY DEFINER RPC = DDL on production; DML/DDL ≥ T2, production-touching → T3).
**Repos:** `Invegent-content-engine` (the RPC + constraint; and the brand-scanner EF if the source-vocabulary leg is chosen) · possibly `invegent-dashboard` (only if the activation-precondition model B is adopted).
**Origin:** surfaced by the Batch 2 production test (2026-07-23). PK ruling 2026-07-23 authorized this as a **distinct lane** for **read-only diagnosis + this Gate-1 brief only**. **No implementation, migration, RPC replacement, constraint change, data repair, or deploy is authorized.**
**Diagnosis source:** live read-only reads on project `mbkmaxqhsohbtwsqolns` (`content_engine`), 2026-07-23 — LIVE-VERIFIED below.

> **Not Batch 2, not cc-0046.** Batch 2 (containment) is PK-accepted and behavior-neutral on this path. This lane owns ONLY the no-logo activation data-contract defect.

## 1. Task
Design the fix for onboarding activation failing on no-logo submissions. **Do not implement.** Compare repair models A–D and recommend on **domain semantics**, not smallest diff.

## 2. Exact root cause — LIVE-VERIFIED

**The failure:** `public.activate_client_from_submission(p_submission_id uuid, p_client_id uuid)` (SECURITY DEFINER, owner `postgres`, `search_path=public`) inserts into `c.client_brand_profile` and sets `logo_extraction_method` **verbatim** from the submission's brand-scan result, with **no normalization and no logo-presence guard**. The relevant live expressions (from `pg_get_functiondef`):

```sql
v_brand_scan := v_submission.form_data -> 'brand_scan_result';
INSERT INTO c.client_brand_profile (... logo_extraction_method ...)
VALUES (... v_brand_scan ->> 'extraction_method' ...)   -- RAW, no COALESCE/CASE/NULLIF
ON CONFLICT (client_id) DO UPDATE SET
  logo_extraction_method = EXCLUDED.logo_extraction_method, ...   -- same raw value on update
```

**The constraint (live):** `CHECK (logo_extraction_method = ANY (ARRAY['scraped','uploaded','manual']))`. Column `logo_extraction_method text`, **nullable, no default → NULL is permitted** (a `col = ANY(...)` check is satisfied when the value is NULL).

**The bad value (live):** the brand-scanner EF initialises `extraction_method = 'none'` and only overwrites it to `'scraped'` / `'uploaded'` / `'favicon'` when a logo is actually obtained (`brief_016_brand_scanner.md:289/316/366/380`). It persists the raw result — including `'none'` and `'favicon'` — into `form_data.brand_scan_result`. **`'none'` and `'favicon'` are both outside the constraint domain.**

**The failing record (live):** submission `69bb19b4-9325-46ed-851c-c276de1598b9` "ZZ Lane B Smoke Test" → `extraction_method = 'none'`, `logo_url` absent, `status = 'pending'` (the activation transaction aborted, so status never advanced to `approved`).

**Chain:** no-logo scan → `extraction_method='none'` in `form_data.brand_scan_result` → RPC forwards `'none'` unmodified → INSERT → `'none' ∉ {scraped,uploaded,manual}` → `client_brand_profile_logo_extraction_method_check` violation → whole activation transaction aborts.

**Layer ownership — BOTH:**
- **Scan-persistence (brand-scanner EF):** emits a vocabulary (`none`, `favicon`) wider than the target constraint domain.
- **Mapping (activation RPC):** forwards the raw value with no normalization and no logo-presence guard.
The **constraint itself is arguably correct** as the intended 3-value vocabulary — do NOT widen it reflexively.

## 3. Was no-logo activation ever intended to succeed?
Under current code there is **no** no-logo handling on the write path (no `COALESCE`/`CASE`/`NULLIF`/`manual`/NULL fallback in the RPC; the scanner just leaves `'none'`). So no-logo activation was **not made to succeed**. However, the schema **already accommodates "no method" via NULL**, and — see census — **3 of 4 existing brand profiles already have `logo_extraction_method = NULL`**. The dashboard UI says *"no logo found (manual entry needed)"*, implying the intended human flow is manual logo handling. **PK decision needed:** should no-logo activation (a) succeed with `logo_extraction_method = NULL`, or (b) be blocked until an operator supplies a logo / selects manual?

## 4. Affected population / census — LIVE-VERIFIED
- **`c.client_brand_profile` (4 rows):** `NULL` × 3, `scraped` × 1. **No invalid rows exist** (the CHECK makes them impossible) → **no in-table data remediation needed**. NULL is already the live majority state.
- **`c.onboarding_submission` with a brand scan (2 rows):** `none` × 1 (**not yet activated — the stranded record, ZZ Lane B**), `scraped` × 1 (activated). No `favicon`/`uploaded`/`manual` present today.
- **Stranded population that would fail activation right now: exactly 1** (`69bb19b4…`). Small (early/test data), but the defect is systemic — every future no-logo onboarding hits it.

## 5. Repair models (compare — recommend on domain semantics)

| Model | Change | Pros | Cons / semantics |
|---|---|---|---|
| **A. RPC normalization** | In the RPC, map any `extraction_method` outside the domain → `NULL` (e.g. `NULLIF`/`CASE`, or `CASE WHEN … IN (scraped,uploaded,manual) THEN … ELSE NULL END`). | Single-point fix; **heals the 1 stranded row at activation (read-time)** → no data migration; NULL is truthful for "no logo obtained" and already the live majority; no constraint change; no consumer audit. | Silently folds `'favicon'` → NULL too, which **loses the fact a (favicon) logo WAS found** — see the favicon sub-decision below. |
| **B. Activation precondition** | Block activation until an operator supplies a logo or explicitly selects manual (dashboard guard + RPC guard). | Forces a deliberate brand-completeness decision; matches the "manual entry needed" UI intent. | Heavier UX; **does not by itself fix the value contract** (still needs the RPC to accept the chosen state); doesn't heal the stranded row without operator action; larger scope (dashboard + RPC). |
| **C. Contract expansion** | Add a governed value (e.g. `'none'`/`'pending_manual'`) to the CHECK. | Preserves the scanner's richer vocabulary; no value loss. | Requires auditing **every** consumer of `logo_extraction_method` (renderers, brand resolution, image-worker) for the new value; widens a governed vocabulary; storing `'none'` is **less truthful than NULL**, which already means "no method". Only justified if a downstream consumer must distinguish "scanned-no-logo" as a stored value — the census shows NULL already serves this. |
| **D. Combined** | A (RPC normalization) + B (explicit activation precondition) + optionally reconcile the scanner's emitted vocabulary at source so the invalid value can't recur. | Defense in depth across source + mapping + UX; can't recur. | Largest scope; most review. |

**⚠ Scanner-only fix is insufficient alone:** the 1 stranded row already has `'none'` persisted in `form_data`; only RPC read-time normalization (A/D) or an explicit reprocess heals it. Any fix **must** include the mapping (RPC) layer.

**Favicon sub-decision (PK):** is a downloaded favicon a *found logo* (then `'favicon'` should normalize to `'scraped'` or the domain should admit `'favicon'`) or *not a real logo* (then `'favicon'` → NULL like `'none'`)? This is a genuine brand-quality decision, not a mechanical one.

## 6. Recommendation (on domain semantics, not size)
**Scoped Model D, correctness core = A.** The truthful representation of "brand scan ran, no logo found" is `logo_extraction_method = NULL` (no logo ⇒ no extraction method), and NULL is already the live majority state — so **normalize in the RPC: `'none'` (and any out-of-domain value) → NULL**. This is the minimal *correct* fix and it heals the single stranded row at activation with zero data migration. Layer on:
- **PK decision (i) — favicon semantics** (§5) before finalising the ELSE branch.
- **PK decision (ii) — activation policy** (§3): if PK wants no-logo activation *blocked* rather than *NULL-allowed*, add Model B as a precondition (dashboard + RPC guard) on top of A.
- **Do NOT choose C** (constraint expansion) unless a downstream consumer is shown to need a stored no-logo value; NULL already covers it.

## 7. Fix-lane requirements (to be executed only after a separate PK implementation authorization)
- **Affected objects:** `public.activate_client_from_submission(uuid,uuid)` (RPC — the fix site); `c.client_brand_profile.logo_extraction_method` + its CHECK (read-only reference, unchanged under A); brand-scanner EF `brief_016` source (only if the source-vocabulary leg of D is adopted); `invegent-dashboard` onboarding UI (only under B).
- **Migration + rollback:** the fix is a `CREATE OR REPLACE FUNCTION` migration (new name/number; identity is permanent). **Rollback = re-apply the current definition, which has been captured verbatim in this lane's diagnosis** (the exact live body is recorded — restore-to-current is a clean revert). No constraint/data change under A → nothing else to unwind.
- **Test matrix:** `scraped` / `uploaded` / `manual` (unchanged pass-through) · **`none` → NULL (heals)** · `favicon` (per PK decision i) · brand_scan absent entirely (already NULL, must still pass) · re-activation via ON CONFLICT UPDATE path (same normalization) · the stranded row `69bb19b4…` activates cleanly.
- **Production-proof plan:** after apply, re-run the ZZ Lane B activation (or a fresh no-logo submission) → expect `ok:true`, a `client_brand_profile` row with `logo_extraction_method = NULL`, submission → `approved`. Read-only verify the row.
- **Data-remediation decision:** **none required** under A/D (read-time normalization heals the only stranded row; no invalid rows exist in `client_brand_profile`). A scanner-only fix would instead require reprocessing the stranded `form_data` — a reason to prefer A.
- **Risk tier + review chain:** **T3** — `db-rls-auditor` (RPC redefinition review) + `security-auditor` (SECURITY DEFINER/owner/search_path preserved; no privilege change) + external review pinned to the migration hash + **PK deploy gate** (or a Convention-2 sequence) + named live pre-check + rollback proven before apply. `branch-warden` on any repo diff.

## 8. Scope / forbidden (this Gate-1 lane)
Design only. No implementation, migration, RPC replacement, constraint change, data repair, or deploy (PK ruling 2026-07-23). Does not touch Batch 2 (accepted) or Slice 0.5. The two PK decisions (favicon semantics; no-logo activation policy) are posed here, resolved at Gate-1 approval.

## 9. Open questions for PK (Gate-1)
1. **Activation policy:** no-logo activation succeeds with `logo_extraction_method = NULL` (Model A), or is blocked pending operator logo/manual entry (add Model B)?
2. **Favicon semantics:** is a favicon a found logo (`'favicon'` → `'scraped'` or admit `'favicon'`) or not (`'favicon'` → NULL)?
3. **Source leg:** also fix the brand-scanner EF to stop emitting out-of-domain values (full D), or RPC-normalize only (A) and leave the scanner's `form_data` vocabulary as-is?
