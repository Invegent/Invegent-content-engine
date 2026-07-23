# Result — cc-0049 / F-ONB-ACTIVATE-NOLOGO-1: No-Logo Activation RPC Fix (APPLIED · PROVEN · CLOSED)

**Brief:** `docs/briefs/cc-0049-onboarding-activation-nologo-constraint-defect-brief-v1.md`
**Lane class / tier:** SAFETY_GATE · **T3** (production SECURITY DEFINER RPC redefine) · **Status:** `APPLIED to production + transactionally PROVEN + repo parity + closed`. PK gate granted 2026-07-23 (apply gate YES · proof Method A).
**Origin:** surfaced by the Batch 2 production test; ruled a distinct lane (not Batch 2, not cc-0046).

## 1. What was applied
Migration **`20260723035423_cc_0049_activate_client_normalize_logo_extraction_method_v1`** — a single `CREATE OR REPLACE FUNCTION public.activate_client_from_submission(uuid,uuid)`. On **both** write paths (INSERT VALUES + ON CONFLICT UPDATE), `logo_extraction_method` is now allow-list normalized:
```
CASE WHEN <val> IN ('scraped','uploaded','manual') THEN <val> ELSE NULL END
```
`scraped/uploaded/manual` pass through; `none`, `favicon`, blank, missing, any unsupported value → NULL (per PK ruling 2026-07-23). No constraint change, no scanner change, no favicon→scraped, no data migration. **Redefined only this function.**

- **Reviewed/applied artifact hash (canonical):** sha256 `e0b2e40f545a751ef63d23b10cea3ff3f3d57135556a1b4eb7643f055bed9cf8`.
- **Pre-apply body md5** `20adc8063c1d80a55f334b749af4fdf7` → **post-apply** `dfe1b855d91f5fc8523fd32d77bc41a8` (change applied).

## 2. Review chain (T3 — clean)
| Stage | Verdict |
|---|---|
| `db-rls-auditor` | **pass** — CREATE OR REPLACE preserves owner/ACL/SECDEF/search_path; normalization correct+total on both paths; NULL constraint-legal; only this function touched; no injection |
| `security-auditor` | **clean / GREEN** high confidence — posture unchanged; value-narrowing not widening; no new injection/priv-esc; constraint not widened; grants untouched |
| external review (pinned to `e0b2e40f…`) | **agree / proceed**, no escalation, medium risk / high confidence, no pushback — review_id `f189e2ff-8372-46e1-99da-6022da9f4080` |

## 3. Pre-flight STOP-checks (all held before apply)
Origin unmoved (dashboard `origin/main`=`6fe8d1e`, CE branch=`7c34217`) · artifact byte-identical (`e0b2e40f…`) · live posture matched Gate-2 (owner `postgres`, SECDEF, `search_path=public`, ACL `{postgres,service_role}=X`, single overload) · **no triggers** on `c.client_brand_profile`/`c.onboarding_submission` and the RPC body is pure SELECT/INSERT/UPDATE/RETURN — **no EF/HTTP/queue/webhook/storage/NOTIFY** side effects → Method A (transaction+rollback) safe.

## 4. Deployed-artifact check (immediately post-apply)
`activate_client_from_submission(uuid,uuid)` — owner `postgres` ✓ · `prosecdef=true` ✓ · `proconfig={search_path=public}` ✓ · ACL `{postgres=X, service_role=X}` (EXECUTE service_role only, unchanged) ✓ · **overload_count=1** (no shadow) ✓ · **allowlist_case_count=2** (both INSERT + UPDATE normalized) ✓. No posture mismatch.

## 5. Production proof — real RPC, transaction-wrapped, rolled back (Method A)
**Method A (UPDATE path — the real failing branch), real submission `69bb19b4…` (ZZ Lane B, `extraction_method='none'`) into real client `3eca32aa…` (Care For Welfare, existing profile):**
`CC0049_METHOD_A rpc_ok=true method=[<NULL>] version=2 is_active=t sub_status=approved` — RPC succeeded (no CHECK violation), `logo_extraction_method` normalized to **NULL**, `version` 1→2 proves the **UPDATE/ON CONFLICT path** was exercised; forced `RAISE EXCEPTION` rolled the transaction back.

**INSERT path (rollback-contained: txn-local delete of CFW profile → RPC INSERT branch):**
`CC0049_INSERT_PROOF rpc_ok=true method=[<NULL>] version=1 is_active=t` — fresh `version=1` proves the **INSERT path**; normalized to NULL; rolled back.

**Normalization matrix (deployed CASE, every input class):** `scraped→scraped · uploaded→uploaded · manual→manual · none→NULL · favicon→NULL · ''→NULL · NULL→NULL` (all correct).

**Post-rollback — Care For Welfare independently re-read, UNCHANGED:** `logo_extraction_method='scraped'` (not NULL) · `version=1` (not 2) · `brand_logo_url` intact (submission `730049b9` logo) · `brand_bio` intact · `updated_at=2026-04-23 23:45:02.156798+00` (no write persisted) · ZZ Lane B submission still `status='pending'` · `client_brand_profile` still 4 rows (no unexpected row/audit/downstream state). **No test data persisted.**

## 6. Rollback (available, validated by construction)
`CREATE OR REPLACE FUNCTION public.activate_client_from_submission(...)` restoring the two write-path expressions to the raw `->> 'extraction_method'` / `EXCLUDED.logo_extraction_method` (verbatim pre-apply body, captured live before apply; posture-identical). No constraint/grant/data to unwind.

```sql
-- rollback: restore raw pass-through on both write paths (pre-cc-0049 body)
-- INSERT VALUES:  v_brand_scan ->> 'extraction_method'
-- ON CONFLICT UPDATE:  logo_extraction_method = EXCLUDED.logo_extraction_method
-- (full body captured in the lane record; single CREATE OR REPLACE, owner/ACL/SECDEF/search_path preserved)
```

## 7. Repo parity
`supabase/migrations/20260723035423_cc_0049_activate_client_normalize_logo_extraction_method_v1.sql` — canonical hash `e0b2e40f…` == reviewed == applied artifact.

## 8. Scope statements (PK-required)
- The **literal production retry into Care For Welfare was intentionally NOT performed** — the target client already held a genuine `scraped` brand profile, so a literal retry would have overwritten a real client's profile with smoke-test data and dropped its method `scraped→NULL`. That is destructive and was not authorized.
- The real **UPDATE path was instead proven transactionally and rolled back**; post-rollback Care For Welfare state is unchanged.
- **Batch 2 remained closed and was NOT rolled back.**
- **Scanner vocabulary was NOT changed** — the brand scanner still emits `none`/`favicon`; the RPC now **independently defends the database domain** by normalizing at the write boundary. The constraint `{scraped,uploaded,manual}` was not widened.
- Batch 2 (containment) and Slice 0.5 (authorization) are untouched by this lane.

## 9. Stop condition
cc-0049 is applied, proven, and closed. The onboarding→activation no-logo defect is fixed at the RPC boundary: no-logo activation now succeeds writing `logo_extraction_method = NULL`. The 1 previously-stranded submission (ZZ Lane B) will activate cleanly on a real (non-smoke-test) run; no data remediation was required (no invalid rows exist; read-time normalization heals source data at activation).
