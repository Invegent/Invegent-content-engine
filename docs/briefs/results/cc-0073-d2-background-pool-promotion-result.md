# Result — cc-0073 D2: Governed starter background-pool promotion (Invegent + CFW)

**Completed (data-side):** 2026-07-27 · **Lane:** PRODUCT_PROOF · **Tier:** T3
**Packet:** `_harness/cc0073_promote_20260726/apply_packet.sql` (sha256 `9ee262a7b943a13018f6efa68f1ec3ad28c06758747029b557d4fc64de469380`)
**Rollback:** `_harness/cc0073_promote_20260726/rollback_packet.sql` (sha256 `60f07c62…`)
**Status:** CLOSED — APPLIED + fully proven. **P7 PK visual PASS — GRANTED 2026-07-27** on both live renders.

## Outcome
Drained the CFW + Invegent static-background rotation gap by promoting fenced shared assets.
Purely **additive** (no client lost access). Interpretation of PK's picks (03+01+04 / 03+07+08):
asset 08 (data-centre) shared by BOTH clients so each reaches the ≥4 floor.

### Committed end-state — `c.shared_creative_asset` (5 governed+active shared backgrounds)
| Asset | allowed_clients | change |
|---|---|---|
| soft_blue_gradient `84a2751e` | {invegent} | promoted from intake_candidate |
| abstract_wall_sky `4a4087e6` | {invegent} | promoted |
| landscaped_garden `4042286e` | {cfw} | promoted |
| soft_grey_bokeh `c36bb74f` | {cfw, invegent} | +invegent |
| datacentre_server `0ba46053` | {invegent, cfw} | +cfw |

3 untouched fenced rows remain fenced: neutral_concrete `3719033b`, glass_office_tower `bd462204`,
contemporary_home `9c52865f`.

### Rotation proof (committed, 10-seed sweep × fb/ig/li)
| Client | before | after | backgrounds |
|---|---|---|---|
| Invegent | 1 | **4 / 4 / 4** | abstract, datacentre, blue, bokeh |
| CFW | 2 | **4 / 4 / 4** | navy (own), datacentre, garden, bokeh |
| property-pulse | 9 | 9 / 9 / 9 (identical keys) | neutral |
| ndis-yarns | 9 | 9 / 9 / 9 (identical keys) | neutral |

## Success criteria
- P1 rotation floor (≥4) — **MET** (both clients 4 on all 3 platforms).
- P2 ≥3 distinct/5 seeds — **EXCEEDED** (4 distinct each).
- P3 pool neutrality — **MET** (in-txn fail-closed assertion 3d passed; PP/NDIS identical pre/post; zero `Shared/` leakage confirmed in the pre-apply committed-nothing dry-run).
- P5 byte + public-URL sha256 — **MET** (3 promoted assets verified match).
- P8 rollback validated before apply — **MET** (apply/rollback identity, same 5 ids).
- P9 no spine mutation — data-only DML; no function change.
- **P6 live render succeeded — MET:** CFW+garden render `cfa09758` (sha256 `860a39c4…`), Invegent+abstract render `a21e3964` (sha256 `30865956…`); both `succeeded`, resolver-emitted modifications, scrim 62.
- **P7 PK visual PASS — GRANTED** (2026-07-27; both renders passed).

## Chain
sha256 ✓ · apply-harness-auditor (shadow) PASS/clean 10/10 · db-rls-auditor concerns-advisory / zero must-fix / no blocker · external review `2764527…`→`b2764527` partial→escalate, sole missing-evidence concern (cross-client leakage) answered by the committed-nothing dry-run · rollback identity verified · pre-apply hash + live pre-state re-verified at gate.

## Notes / carries
- CFW pool-policy was already `best_fit` (`cc-0073-cfw-bestfit-v1`) from a prior session — the D1/D2
  policy fork was pre-resolved, so shared promotions reach CFW.
- db-rls-auditor caveat recorded: `approval_status` is NOT a resolver eligibility lever (the packet
  also flips `is_active`+`production_use_allowed`, which ARE read); assertion 3d is correct but
  vacuous (PP/NDIS are `client_only`) — real neutrality is the allowlist gate + 3a/3b/3c.
- No commit/push performed. Origin diverged (ahead 1, behind 1 — unrelated v6.30 video lane);
  register pointer + commit are a separate PK-gated docs lane.
- Transcription note: the pinned hash label carried a stray `1` (`9ee262a71b943…`) in review/gate
  text; the true artifact hash is `9ee262a7b943…`, byte-identical review→apply.
