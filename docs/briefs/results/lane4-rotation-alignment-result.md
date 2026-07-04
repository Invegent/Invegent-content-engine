# Result — Lane 4 — B1 Rotation Alignment (Option A-now-D-later)

**Packet:** `docs/briefs/lane4-rotation-alignment-packet.md` · **Completed:** 2026-07-04 Sydney
**Status:** ✅ MERGED + DEPLOYED + VERIFIED — **B1 production rotation is aligned to the governed resolver (5 keys, resolver rank order); queue item 4 COMPLETE except the live stamper proof, which fires at the next natural B1 render**

## 1. What shipped

PK resolved the Lane 4 policy fork ("Approve Option A-now-D-later", explicitly accepting the controlled production render behaviour change) after the lane discovered the resolver pool had grown 3→5 (PK's own P0 promotion 2026-07-03T23:21Z) — making the originally-directed order-swap mathematically useless (mod-3 vs mod-5 coprime → ~20% agreement regardless of order).

- `B1_BACKGROUND_KEYS` 3→5, exactly the resolver eligible-pool rank order: `[bg_perth_cbd, bg_sydney_cbd, bg_brisbane_cbd, bg_pp_au_suburb_aerial_grid, bg_pp_home_keys_contract_table]`. FNV-1a hash logic byte-unchanged; perth stays index 0 (back-compat).
- Vendored contract (both worker copies): same 5-key pool; `contract_version` v1→**v2** (contract_key/contract_ref/variant identity unchanged); warn-only `EXPECTED_CONTRACT_VERSION` → v2.
- Declarative registry `property-pulse.json` (6 sites) + pattern-library table synced; v2 PK-decision evidence note added (creative-graph-auditor advisory folded in pre-pin).
- The 2 newly promoted governed backgrounds now appear in B1 production renders (~⅖ of new seeds) — PK-acknowledged consequence.
- **Stopgap disclosure (ratified):** alignment holds only while the eligible pool is exactly these 5 in this order; any pool change silently re-diverges it. Durable fix = Option D (B1 consumes select_template/resolve_slot_assets directly; the constant dies).

## 2. Identity

Pinned diff hash **`a005c5e9904c262bcf9deebfca3b3b5ceec982c86f6169f3a8bd83772de738d2`** = commit **`4c33858`** (verified: `git diff bc77ae8 4c33858 | sha256sum` exact) — 13 files (12 M + 1 new harness), fast-forward merged `bc77ae8 → 4c33858`, pushed (origin/main parity 0/0). Deploys: **image-worker fn v84** (repo v3.21.0), **ai-worker fn v115** (v2.17.0), both `--no-verify-jwt` via authenticated CLI back-to-back (2026-07-04 05:50–05:51Z).

## 3. Gate trail (all pinned to `a005c5e9…`)

Evidence/decision packet (fork surfaced: order-swap 20%→20% useless; full-align vs accept vs defer) → PK "Option A-now-D-later" → ef-builder isolated worktree (13 files; 2 justified extra-file deviations: contract_stamp_test pin + EXPECTED_CONTRACT_VERSION) → deno **63/63** ×7 files, `deno check` clean → **equivalence proof 514/514** (14 S0 seeds + 500 synthetic UUIDs through worktree TS pick AND live SQL resolver: canonical md5 digests IDENTICAL `2111b5765d1bfebeee1dfd6d9dbc10d0`, distributions identical 103/105/95/99/112, 0 nulls) → creative-graph-auditor **PASS** (advisory 2 folded in; advisories 1+3 carried) → branch-warden **safe** ×2 (pre-review + pre-merge) → external review **agree/proceed zero-pushback** (`review_id 2ac80909-7c23-46e2-805e-c0a0a5b0ef51`) → PK approved hash + full proceed-sequence → this execution.

## 4. Execution + verification (ALL PASS)

| Step | Result |
|---|---|
| Hash re-verify pre-commit | worktree diff == `a005c5e9…` exact |
| Commit / merge / push | `4c33858`, ff-only, origin parity 0/0; branch-warden safe pre-merge |
| **Pre-deploy pool re-check (STOP condition)** | full-filter-chain query → eligible pool EXACTLY `[perth, sydney, brisbane, aerial_grid, home_keys]` → proceed |
| Deploy | CLI authenticated (Windows credential store); both workers deployed back-to-back `--no-verify-jwt` |
| verify_jwt | **PROVEN false on both**: unauthenticated GET probes returned 200 (a flipped flag would 401 at the gateway) |
| Versions | image-worker fn 83→**84** ACTIVE · ai-worker fn 114→**115** ACTIVE |
| Deployed-source byte checks | image-worker: exact 5-key array present, old 3-key array 0 occurrences, v3.21.0 header present · ai-worker: `ai-worker-v2.17.0`, `contract_version: 'v2'` ×2, 5-key pool present, old array 0 |
| Unshadowed B1 pool | 0 → supervised stamper proof correctly PENDING the next natural render |

**Known cosmetic note (disclosed):** image-worker's runtime `VERSION` const still reports `image-worker-v3.20.1` (GET probe) — the const was last bumped by the v3.20.1 hotfix and the reviewed diff (correctly matching its pinned content) added only the v3.21.0 header block. The deployed CODE is the pinned v3.21.0 artifact (byte-checked above). Const bump = trivial future carry, next image-worker lane.

## 5. Expected S1 impact (now armed)

Next natural PP B1 render: production and selector both compute FNV-1a(post_draft_id) mod 5 over the identical ranked list → the supervised `stamp_tmr_shadow_forward()` run should stamp `background_match=true` (and simultaneously deliver the outstanding S1 live-stamping proof). Divergence rows after this point = real selector differences.

## 6. Boundaries held

No TMR-live activation · no Format Mix binding · no publisher change · no dashboard change · no new asset approvals · no resolver/selector/stamper logic change · no template ranking-policy change · no files beyond the reviewed diff · S0 rows untouched (zero DB writes this lane) · deploy only after the pool re-check passed.

## 7. Carries

1. **S1 live proof** (pending): supervised stamper at next B1 render → expect `background_match=true`; then the hourly cron gate (sql_destructive D-01).
2. **Option D** (ratified direction): B1 consumes the TMR spine directly; delete `B1_BACKGROUND_KEYS`.
3. Post-merge provenance refresh: vendored `source_commit '2ac172b'` → `4c33858` in both creative_contract.ts copies (creative-graph-auditor advisory; next worker lane).
4. image-worker `VERSION` const bump to v3.21.x (cosmetic, next image-worker lane).
5. Pre-existing registry `approved_at` nulls backfill (existing carry).
6. Worktree `C:\Users\parve\ice-wt-lane4-rotation` + branch `lane4-rotation-alignment` (merged, clean) — removable at will.
