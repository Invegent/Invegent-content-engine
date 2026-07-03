# Result — Lane 0 — B1 Registry Capture

**Packet:** `docs/briefs/lane0-b1-registry-capture-packet.md` · **Completed:** 2026-07-03 Sydney
**Status:** ✅ APPLIED + VERIFIED — **the registry now knows the template production actually uses; selection provably unchanged; S1 unblocked**

## 1. What was applied

Artifact `_harness/lane0-b1-registry-capture.sql`, sha256 `bdaa788cf018bed2a44a9c32dadeb690cc313c9ace6f9cb528d8d24751f8629b` (PK "apply" on this hash; re-verified MATCH pre-apply). One transaction, 20 data-only INSERTs capturing the live PP production template `fb9820f8…` (`news_static_centered_scrim_1x1_v1`) as a client-scoped, evidence-cited TMR entry — including the **in-transaction selection-safety invariant**, which passed at commit time.

## 2. Post-apply verification (ALL PASS)

| Check | Result |
|---|---|
| Rows: family / template / fields / variant / suitability / assignment / proofs | **1 / 1 / 9 / 1 / 2 / 1 / 5** — exact |
| Template status · scope | `production_proven` · `client` (client_id = property-pulse) |
| Live `select_template('property-pulse','facebook','image_quote')` | winner **unchanged** `generic_quote_card_1x1_v1`; rejected[] now **3** entries — the needs-tweak pair + **`news_static_centered_scrim_1x1_v1 · wrong_scope`** (the selector can finally name the production template when explaining itself) |
| S0 shadow rows | **17 × `expected_structural_divergence` untouched** (point-in-time records preserved) |
| S1 classification flip | registry-EXISTS on `fb9820f8…` now **true** → future forward-shadow rows classify genuine `selector_disagreement` |

## 3. Evidence integrity note

db-rls-auditor caught one evidence mis-citation pre-apply (`render_log 52165857` — actually the *post_draft* id; real render_log `c3c7489b…`, a citation the repo had already retired once in Slice 1B). **Corrected before review pinning**; the applied visual_approval proof row cites both ids accurately with the true 04:07Z timestamp. All other evidence spot-checked exact against live (17/14 render pool; 5 facebook + 5 instagram distinct published B1 drafts; `50f09ca2` = the `_smoke` B0 proof). `inventory_status='captured_from_docs'` honestly records that the B1 template lives in a **separate Creatomate project** unreadable by the generics API key (discovered this lane, recorded in-row).

## 4. Gate trail

Queue item 0 (PK-ratified order, action_list @ `09986ef`) → evidence gathering (live catalog vocabularies, publish evidence, vendored field surface, provider-read probe) → packet + artifact → db-rls-auditor `concerns` → **must-fix applied, re-hashed** → external review **agree/proceed, low/high, zero pushback** (`review_id 459008cb-2a72-4c64-a664-98eb9d8f22d9`, pinned to the corrected hash) → security-auditor n/a-with-reason (data-only) → PK apply → verification ALL PASS.

## 5. Non-claims / boundaries held

No render · no publish · no runtime/dashboard caller · no Format Mix · **no production-enablement change** (the template already was the production path; this lane recorded that fact) · no S1 build · no template/asset edits · S0 rows untouched. The `production_proven` statuses are retrospective records of already-earned status and are provably selection-neutral (scope fence + in-transaction proof). Informational carry: `resolve_slot_assets` scrim detection lacks a `dynamic` filter — irrelevant today (no direct-call consumer), noted for any future one.

## 6. Rollback (standing)

7 reverse-dependency DELETEs (commented in the artifact), expected counts 5/1/2/1/9/1/1, keyed on fixed ids `c0b10001-…` + marker `lane0-b1-registry-capture`; zero collateral.

## 7. Queue state

**Item 0 COMPLETE → item 1 (S1 forward shadow stamping) is unblocked** and remains behind its own design-confirmation + build gates (cron-EF recommendation standing). Items 2–5 unchanged.
