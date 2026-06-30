# TMR Template Proof Lifecycle v1 — G1 Write-RPC (Apply Result)

> **Lane:** Step 3, Gate G1 — governed proof write-RPC `public.record_tmr_proof_event(...)`.
> **Status:** ✅ **APPLIED — VERIFIED.** SECURITY DEFINER function created; service-role-only EXECUTE; zero rows written.
> **Date:** 2026-07-01 Sydney · **Project:** `mbkmaxqhsohbtwsqolns`
> **Packet:** `docs/briefs/tmr-template-proof-lifecycle-v1-smoke-render-packet.md` (Part A / §3, §10–§11)
> **In-repo migration record:** `supabase/migrations/20260630231747_tmr_proof_write_rpc_record_tmr_proof_event_v1.sql`
> **reviewed_input_hash:** `79294a06b9c4f517bcb4e057023a2200944a6c44f1be4d1f812b7fde78fcbd42` (re-verified MATCH immediately before apply)

---

## 1. What was applied

Created `public.record_tmr_proof_event(p_provider_template_id uuid, p_proof_type text, p_proof_status text, p_evidence_reference text, p_evidence_kind text, p_platform text, p_placement text, p_assignment_id uuid, p_occurred_at timestamptz, p_recorded_by text) returns jsonb` — the single sanctioned proof write-path, reusable for all four proof types. SECURITY DEFINER, `search_path=''`, append-only single INSERT into `c.creative_template_proof_event`, with the validation guards (template identity, proof_type/proof_status CHECK, evidence present + not secret-like + not payload, platform_* evidence gated on a real success-status `m.*` row, optional assignment belongs to template). Plus its `REVOKE EXECUTE FROM public, anon, authenticated` + `GRANT EXECUTE TO service_role`. **No rows written; no render; no publish.**

## 2. Gates (all passed before apply)

- **db-rls-auditor:** `concerns` → corrected (V-1 `render_log_id`, V-2 `post_publish_id` + `status='published'`, `search_path=''`, regex `destination_id` dropped, §5/§6 example id); V-1…V-5 resolved.
- **security-auditor:** **GREEN** — REVOKE mandatory (Supabase default ACL auto-grants anon+authenticated EXECUTE on `public.` functions); SECURITY DEFINER hardened, no escalation/injection; append-only, no status elevation, no secret read; inference prevention proven.
- **external review:** `ask_chatgpt_review` `83f84078-5ccc-48c1-b4c6-e7ea2f588a29` — agree / medium / high / no-escalate, reviewed against hash `79294a06…`.
- **PK apply gate:** exact-hash approval phrase given 2026-07-01.

## 3. Pre-apply re-verification (read-only, immediately before)

Hash re-verified == `79294a06…` ✓ · function absent (0) ✓ · proof table 0 rows ✓ · migration-name collision 0 ✓ · max version `20260630222620`.

## 4. Apply mechanism

- `apply_migration` (identity `tmr_proof_write_rpc_record_tmr_proof_event_v1`) **harness-denied** (expected; consistent pattern).
- Fell back to **`execute_sql`** running the **byte-identical** reviewed SQL (no error).
- **Ledger backfill marker applied immediately:** version **`20260630231747`** (real apply-time UTC, > prior max `20260630222620`), name `tmr_proof_write_rpc_record_tmr_proof_event_v1`, `ON CONFLICT (version) DO NOTHING` → 1 row. In-repo migration file added — repo↔prod drift avoided.

## 5. Post-apply verification (all PASS)

| Check | Expected | Actual |
|---|---|---|
| function exists | 1 | ✅ 1 |
| `prosecdef` (SECURITY DEFINER) | true | ✅ true |
| `provolatile` | v | ✅ v |
| `proconfig` search_path | empty | ✅ `search_path=""` |
| owner | postgres | ✅ postgres |
| identity signature | `(uuid,text,text,text,text,text,text,uuid,timestamptz,text)` | ✅ exact |
| **anon EXECUTE** | false | ✅ false |
| **authenticated EXECUTE** | false | ✅ false |
| public EXECUTE | false | ✅ false |
| **service_role EXECUTE** | true | ✅ true |
| `c.creative_template_proof_event` rows | 0 | ✅ 0 |
| ledger marker present | 1 | ✅ 1 |
| new security advisor for this function | none | ✅ none (`record_tmr_proof_event` absent from `get_advisors(security)`) |

The load-bearing security assertion holds: the mandatory REVOKE took (anon/authenticated EXECUTE = false; service_role = true), and the `search_path=''` pin landed (`search_path=""`) with no new advisor.

## 6. Non-claims / safety (post-apply)

- Mutation surface: **one function created + its grants + one ledger marker row.** Nothing else.
- **0** proof rows written · **0** render · **0** publish · **0** storage object · **0** enablement · **0** binding · **0** platform_safe · **0** production_proven · **0** G2 work · **0** DDL beyond this function · **0** dashboard · **0** runtime · **0** provider call.
- The template is unchanged — still an inventory `platform_candidate`; not render/publish/production-proven, not platform-safe, not enabled, not bound.
- Reversible: single `DROP FUNCTION public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text);`.

## 7. Verdict

```
G1 — APPLIED — VERIFIED
```

The governed proof write-path is live and locked to service_role. **Stopped before G2.** The remaining gates each require separate PK approval: **G2** safe `_smoke/` render of `490ad9ea…` → **G3** `smoke_render` proof via the RPC → **G4** PK visual review → **G5** `visual_approval` proof. No smoke-render work begins until PK separately approves G2.
