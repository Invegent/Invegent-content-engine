# CGU Final — Revised Phase-2 Schedule-Expansion Matrix (v1, DRAFT for PK preview)

**Status:** **PK-APPROVED 2026-08-05 — shape: base + E-1** (PK, direct in the control-tower
session: "matrix approved base + E-1, proceed on that shape at expiry"). The E-1 CFW increment
remains DORMANT behind its §2.2 precondition (≥3 PK-visually-approved CFW backgrounds); the
Invegent hold and every §2.4 exclusion stand unchanged. **Execution remains gated:** per the
v6.140 ruling, the fresh apply packet is authored only at/after watch expiry (~2026-08-11 20:20
Sydney) AND only if the watch verdict passes — this approval fixes the SHAPE, not the timing.
Nothing here authorizes any schedule DML, cap change, or mutation before that gate.
**Author:** CGU Final control tower, 2026-08-05.
**Inputs:** frozen packet v3 manifest (review-only evidence, committed `c7aef0b`) · the v6.131
CFW/Invegent reliability correction · the §3 asset-constraint live finding (packet proposal-v1) ·
S1's M16 CFW pool-starvation diagnosis (v6.143) · Phase-1 watch log day-1 baseline.

---

## 1. What changed vs the frozen v3 packet, and why

1. **The reliability hold on CFW/Invegent image_quote is dead** (v6.131): the 85%/78% failure
   rates were fully accounted for by the already-fixed cc-0048/cc-0049 incidents; both clients are
   ~100% successful since 2026-07-23. v3's "expanding image_quote would only increase failed
   renders" reasoning is superseded and MUST NOT be re-cited at the gate.
2. **But the asset constraint survives on its own:** live `c.client_brand_asset` evidence (packet
   proposal §3) — CFW has **one** usable background asset; Invegent has **zero**
   (`usage='background'`), succeeding via the shared-pool fallback. Expanding image_quote today
   is no longer a *reliability* risk; it is a *repetition/brand-quality* risk (every extra CFW
   image_quote reuses the same single background).
3. **PK ruling constraint applied verbatim:** Invegent stays conservative **pending asset
   evidence** — a background-harvest lane has been re-seeded (2026-08-05) but until candidates
   pass the PK visual gate, Invegent image_quote does not move.
4. **CFW LinkedIn image_quote stays excluded** and now has a diagnosed reason (S1/M16, v6.143):
   pool starvation is structural (paywalled-source attrition + reuse penalty + a green-blind
   health check that never auto-relaxes). It re-opens only via its own remediation lane
   (3 options on the PK stack), never via this matrix.

## 2. The revised matrix

### 2.1 Base rows — carried unchanged from the frozen v3 manifest (17 rows, text-led)

The 17-row manifest (packet v3 §1: NDIS FB +2 image_quote +2 text · NDIS IG +5 text · CFW FB/IG
+2/+2 text · INV FB/IG +2/+2 text) is carried **byte-identical in target** into this matrix as the
approved-shape base. Rationale: text is asset-independent (no background constraint applies);
NDIS image_quote has a governed rotation pool behind it; the SQL-logic core of these rows survived
five clean reviews + three apply-harness-auditor rounds unchanged. Per-client/platform deltas:

| Client | Platform | Before | After (base) | Δ | Format mix of Δ |
|---|---|---|---|---|---|
| ndis-yarns | facebook | 10 | 14 | +4 | +2 image_quote, +2 text |
| ndis-yarns | instagram | 7 | 12 | +5 | +5 text |
| ndis-yarns | linkedin | 14 | 14 | 0 | untouched |
| care-for-welfare | facebook | 3 | 5 | +2 | +2 text |
| care-for-welfare | instagram | 2 | 4 | +2 | +2 text |
| invegent | facebook | 2 | 4 | +2 | +2 text |
| invegent | instagram | 2 | 4 | +2 | +2 text |
| property-pulse | (all) | — | — | 0 | zero change (v3 §1 reasoning stands: at ceiling; NULL-resolver slots risk carousel exposure) |

### 2.2 Election E-1 (PK choice at the gate): CFW image_quote conditional increment

Now that the reliability blocker is gone, PK may elect **+1 CFW facebook image_quote/week and
+1 CFW instagram image_quote/week**, under a hard precondition:

> **Precondition (non-waivable):** ≥3 CFW background assets `approved=true` past the PK visual
> gate (the re-seeded harvest lane's output). Until then the election, even if approved, stays
> dormant — no apply packet row is authored for it.

If PK declines E-1, CFW image_quote stays flat and re-enters at a future gate on asset evidence.
**Repetition note either way:** with 1 background today, current CFW image_quote volume already
repeats a single image; the harvest lane improves this independent of any expansion.

### 2.3 Invegent image_quote — HELD FLAT, no election offered (PK ruling applied)

Zero owned backgrounds + shared-pool fallback = conservative hold, exactly as ruled. The path to
an Invegent election is: harvest lane candidates → PK visual gate → asset evidence recorded →
a future matrix revision. Not offered at this gate.

### 2.4 Exclusions — preserved verbatim, zero changes (ruling constraint)

All v11 Layer-2 and YouTube exclusions carry unchanged: NDIS carousel + video_short* + video_long*
(all platforms) · NDIS YouTube (all formats) · PP video_short_kinetic (supervised — and additionally
gated on kinetic_voice palette hygiene per the v6.127 PK order) · PP carousel (legacy, no exposure
increase) · **CFW LinkedIn image_quote** (M16 remediation lane is the only reopening path) ·
CFW/Invegent YouTube entirely (D3). The three supervised-only cells remain supervised-only.
`client_format_config.is_enabled=true` remains capability, not scheduling permission.

## 3. Gate mechanics (what PK approves at watch expiry)

1. **Watch verdict** (delivered with this matrix): PASS → proceed; any STOP-condition finding →
   this matrix is void pending re-cut.
2. **This matrix**, in one of two shapes: base-only (§2.1) or base + E-1 dormant-conditional (§2.2).
3. Only then: a **fresh apply packet** is authored against the approved shape (v3 is review-only
   evidence and is never executed), runs the full T2/T3 chain (db-rls-auditor · apply-harness-auditor
   shadow · branch-warden · external review pinned to hash), and stops for PK production
   authorization — identical gate discipline to v11.
4. Rollback + before/after readiness snapshots per the §6.3 discipline of the original proposal;
   any cell moving `ready`→failure state at apply time is an automatic STOP.

## 4. Non-claims

Does not authorize any mutation; does not reopen any exclusion; does not resolve M16 remediation,
the harvest lane's visual gate, or any watch-expiry stack item; does not replace the watch verdict.
The frozen v1–v3 packet lineage remains review-only evidence per v6.140.
