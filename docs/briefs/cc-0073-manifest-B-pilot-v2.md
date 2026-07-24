# cc-0073 — MANIFEST B (v2): PILOT promotion — ONE shared asset for CFW

**Created:** 2026-07-24 Sydney · **Author:** chat (S5) · **Status:** authored + frozen — **HELD, NOT APPLIED**
**Supersedes for apply purposes:** `cc-0073-manifest-B-promotion-shared-assets-v1.md`
(`ae5041ae…` — **NOT edited, NOT withdrawn**; retained as the full-expansion design and as the
evidence base for the per-asset suitability reasoning, which is unchanged)
**Ruling:** PK constraint on PK-9/PK-13 · **Tier:** T3 · **Change class:** data-only, **1 row**

> ⛔ **HOLD.** Apply order is **S8 security containment → S5 policy window → S5 pilot window →
> cc-0080**. S5 is **second and third**, not first. **Two windows, not one:** await
> **"S5 GO — policy window open"** and, separately, **"S5 GO — pilot window open."**

## PK ruling, verbatim — never paraphrased

> **"Apply the inert policy separately, then pilot a smaller promotion — preferably one shared asset
> for roughly 50/50 rotation — before expanding after visual proof. Do not introduce a 75% shared
> visual identity shift as an incidental consequence of pool activation."**

### Why this re-cut exists

v1 would have promoted 3 assets to CFW, giving a 4-asset pool: **~25% brand-navy, ~75% shared
neutrals**. That was surfaced in v1 as a brand-identity shift arriving as a side effect of pool
activation. PK has constrained the lane accordingly. **The v1 suitability analysis is unchanged and
still correct — only the STAGING changes.** Expansion to S1 and S4 remains available on the strength
of v1's reasoning, gated behind visual proof of this pilot.

---

## Stage 1 — Manifest A (policy) ALONE, in its own window

Unchanged: `docs/briefs/cc-0073-manifest-A-policy-cfw-bestfit-v1.md` (`030256b8…`).

**Its inertness is now the point, not a footnote.** With A applied and no promotion, the shared-pool
loop is *reached* but rejects all 8 (7 × `inactive`, S8 × `not_in_allowlist`). CFW renders
byte-identically — same background, same scrim 48, pool size 1. Proof **A5** demonstrates the
structural unlock works **without changing a single pixel**, which is exactly what makes it safe to
land on its own and independently reversible (`DELETE` one row).

---

## Stage 2 — the PILOT: exactly one asset

### Selection — **S3, Shared BG — Soft grey bokeh** (`c36bb74f-6f3b-4939-8bdc-c47fc2f39e82`)

Chosen on the Pack A criteria, not on convenience:

| Criterion | S3 assessment |
|---|---|
| **C1 no false sector implicature** | **Strongest in the set.** Pure abstract defocused light — carries *no* sector signal whatsoever. Cannot imply real-estate, landscaping, corporate or clinical services. |
| **C2 dignity-neutral / non-clinical** | Soft and warm-neutral; nothing institutional or austere (this is precisely where S2 concrete fails for a care brand). |
| **C3 person-free** | Yes — no people, no identity, no disability/service-status inference. NDIS Phase 2 CLOSED / Phase 3 HELD are untouched by an abstract. |
| **C4 legible at the production scrim** | **Best in the set** — the darkest candidate, so the strongest white-headline contrast at the now-live 62. Lowest text-safety risk of any asset available. |
| **C5 brand-palette compatible** | Neutral grey — recedes behind CFW navy rather than competing with it (unlike S5/S7's saturated greens). |
| **C6 warm / calm tone** | Soft, calm, human-feeling **without depicting anyone** — unusually well suited to a care/welfare register. |

**Runners-up, and why not first:** **S1** soft blue gradient is high-key, so it was the *weakest*
headline case at 40% — it benefits most from 62 but has the least contrast margin, making it a poor
choice for the one asset that must not fail. **S4** abstract wall & sky has a pale wall exactly in the
headline zone, same reasoning. Both remain suitable (v1 analysis stands) and are the natural
expansion set **after** S3's visual proof.

### The change — one row

```sql
UPDATE c.shared_creative_asset
   SET is_active = true, production_use_allowed = true, approval_status = 'governed',
       allowed_clients = ARRAY['3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid],  -- CFW ONLY
       asset_meta = asset_meta || jsonb_build_object(
         'promoted_by','cc-0073 Manifest B v2 PILOT; PK gate 2026-07-24. ONE asset for ~50/50 rotation against CFW brand-navy. Expansion to S1/S4 gated behind visual proof.'),
       updated_at = now()
 WHERE id = 'c36bb74f-6f3b-4939-8bdc-c47fc2f39e82'
   AND approval_status = 'intake_candidate'            -- guard: fenced row only
   AND asset_meta->>'scrim_opacity_override' = '62';   -- guard: scrim remediation present

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM c.shared_creative_asset WHERE is_active AND production_use_allowed;
  IF n <> 2 THEN RAISE EXCEPTION 'cc-0073B2 ABORT: expected 2 live shared assets (S8+S3), got %', n; END IF;
  SELECT count(*) INTO n FROM c.shared_creative_asset WHERE approval_status='intake_candidate';
  IF n <> 6 THEN RAISE EXCEPTION 'cc-0073B2 ABORT: expected 6 still fenced, got %', n; END IF;
END $$;
```

**Allowlist is `{CFW}` only — deliberately NOT `{CFW, Invegent}`.** This keeps the pilot's blast
radius to exactly one client, so its visual proof is attributable. If Invegent proceeds (below), S3
is added to Invegent's set in that separate decision, not smuggled in here.

**Allowlist mechanic (recorded design finding, unchanged from v1):** an **empty** `allowed_clients`
means available to **every** client with a permitting policy. Because sector-appropriateness is
brand-specific, a "shared" pool cannot be brand-neutral in practice — **every** promoted asset must
carry an explicit per-brand allowlist.

### Projected rotation — the 50/50 target, verified against live counts

CFW eligible client backgrounds re-verified live: **1** (`bg_cfw_brand_texture_navy_waves`,
`safe_for_text_overlay='needs_scrim'`). Invegent: **0**.

Under `best_fit` (Manifest A), client and shared merge into one ranked list:

| Rank | Asset | sfto | origin |
|---|---|---|---|
| 0 | S3 soft grey bokeh | `true` | shared |
| 1 | bg_cfw_brand_texture_navy_waves | `needs_scrim` | client |

`v_bg_count = 2`; pick = `hash(seed) mod 2` ⇒ **exactly 50/50**. S3 sorts first (text-safe-first
ordering) but ordering does not bias the pick — the modulo is uniform. **CFW's brand-navy remains on
half of all cards**, which is the identity outcome PK asked for.

### Honest expectation the pilot must state up front

**A 2-asset pool makes consecutive repeats MORE likely, not less.** Selection is memoryless
(`hash(seed) mod count`, no anti-repeat memory), so the chance two consecutive CFW posts share a
background is **50%** at N=2 — versus 25% at N=4 and 17% at N=6.

**This is expected and is not a pilot failure.** The pilot's purpose is to prove *visual acceptance
of a shared asset on a CFW card*, not to demonstrate rotation richness. Judging the pilot on
repeat-frequency would reject a design that is behaving exactly as specified. Anti-repeat guarantees
require resolver logic — **cc-0051 handoff, recorded, not actioned.**

### Rollback

```sql
UPDATE c.shared_creative_asset
   SET is_active = false, production_use_allowed = false, approval_status = 'intake_candidate',
       allowed_clients = '{}'::uuid[], asset_meta = asset_meta - 'promoted_by', updated_at = now()
 WHERE id = 'c36bb74f-6f3b-4939-8bdc-c47fc2f39e82';
```

Restores byte-identical prior state (verified: no `promoted_by` key, `{}`, false, false,
`intake_candidate`). The `approval_status` guard makes a re-run update 0 rows. Pre-apply snapshot of
all 8 rows to disk for byte-diff. **Rolling back the pilot alone returns CFW to a 1-asset pool
without touching Manifest A.**

### Proof

| # | Check | Pass condition |
|---|---|---|
| P-1 | Fence state | live shared = **2** (S8, S3); fenced = **6**; S1/S2/S4/S5/S6/S7 byte-identical; **S8 byte-identical** |
| P-2 | Allowlist exact | S3 = `{CFW}` · S8 = `{Invegent}` unchanged |
| P-3 | `asset_meta` intact | differs only by `promoted_by`; **`scrim_opacity_override='62'` still on all 8** |
| P-4 | **CFW pool == 2** | ≥10 distinct seeds → exactly **2** distinct `asset_key`: S3 + brand-navy, nothing else |
| P-5 | **~50/50 split** | over ≥20 seeds, each background appears in **35–65%** of draws (binomial tolerance at n=20) |
| P-6 | **Sector fence holds** | CFW **never** resolves S1, S2, S4, S5, S6, S7 or S8 — the per-brand judgment is enforced, not merely documented |
| P-7 | Invegent unchanged | still resolves **only** S8, `Scrim.opacity=62`, on fb/ig/li — the pilot did not leak |
| P-8 | PP / NDIS unchanged | pinned seed `cc0073-baseline`: PP 48/48/48 · NDIS 55/55/55, same backgrounds |
| P-9 | Scrim survives | S3 resolution emits `Scrim.opacity=62` + `scrim_override_applied` |
| P-10 | Spine unmutated | md5 `resolve_slot_assets`=`75d59925316ccde39073113557504596` · `select_template`=`41df4745707d0396f145d32d7ffd7483` |
| P-11 | Ledger frozen | 8 rows, 4 open; carousel ×3 `(assignment, unassigned)`; PP YouTube `(platform_config, misconfigured)` |
| P-12 | **Live render + PK visual PASS** | a real CFW render on S3 — **PK's visual verdict is the deciding act**; nothing is marked proven, and no expansion is proposed, before it |

**P-6 is the pilot's most important proof:** it demonstrates the per-brand sector fence actually
holds, which is what makes any later expansion trustworthy.

### Stop conditions

Target row not `intake_candidate` or lacking `scrim_opacity_override='62'` → STOP · rows updated ≠ 1 ·
live shared ≠ 2 or fenced ≠ 6 (in-txn abort) · any other shared row differs → STOP + rollback ·
**CFW resolves any asset other than S3 or brand-navy** → STOP + rollback · Invegent's resolution
changes → STOP + rollback · PP/NDIS drift at the pinned seed → STOP + rollback ·
`scrim_opacity_override` altered or lost → STOP + rollback · spine digest differs → STOP · any ledger
classification column changes → STOP · PK visual verdict ≠ PASS → rollback · any attempt to bundle
Manifest A, Invegent promotion, sourcing, template or resolver change → STOP · unexpected origin
movement or out-of-set files → STOP.

### Explicitly NOT in this manifest

Manifest A (separate window) · **expansion to S1/S4 — gated behind this pilot's visual proof** ·
S2/S5/S6/S7 promotion · **Invegent promotion — a separate decision, below** · **CFW's 2–4 asset
sourcing — CLOSED by PK ruling; we learn whether the smaller pool suffices in practice first** ·
resolver/template change · ledger mutation · commit/register/push.

---

## Invegent — a SEPARATE decision, not a rider

Stated separately as directed; it is **not** bundled into the CFW pilot and would need its own gate
and its own window.

### Why Invegent is a genuinely different case

PK's constraint is about **displacement of an existing brand identity**. That mechanism does not
exist for Invegent:

| | CFW | Invegent |
|---|---|---|
| Eligible **client** backgrounds | **1** (brand-navy) | **0** (live-verified) |
| What promotion displaces | its own brand texture, 100% → 25% | **nothing** — there is no brand background to displace |
| Current state | 1 asset, 100% brand-navy | 1 asset, 100% `bg_shared_datacentre_server` — a **generic stock photo**, not brand identity |
| Effect of expansion | dilutes brand identity | replaces one repeated stock image with several |

Expanding Invegent does not reduce any brand-owned imagery, because Invegent has none. It changes
*generic → varied generic*. The identity risk PK constrained is structurally absent.

### 🔶 The real Invegent risk, named honestly

It is **not** identity dilution — it is that **5 of the 6 candidates have never been rendered through
the real template.** Only S8 has a live Creatomate render (the scrim proof, PK-accepted). The other
five have been seen only in the contact sheet, which is a **faithful simulation** (verified
`#080C1E` full-bleed at production geometry) but **not** a Creatomate render.

This gap applies to the CFW pilot too — S3 has never been rendered either — but the pilot's *scale*
makes it a 1-asset exposure rather than a 5-asset one.

### Recommendation

> **Invegent MAY proceed more broadly than CFW, and I recommend a middle path: promote 3
> (S6 glass office tower · S3 soft grey bokeh · S1 soft blue gradient) → pool of 4 with S8**,
> rather than the full 6 of v1.
>
> **Reasoning:** the displacement risk is genuinely absent, so Invegent need not be held to a 2-asset
> pilot; but the *unrendered-candidate* risk is real and scales with count. A pool of 4 clears the
> Pack A floor recommendation of 4, cuts Invegent's consecutive-repeat rate from 100% to 25%, and
> keeps S2 and S4 in reserve for a second step once real renders exist. S6 leads because it is the
> clearest B2B-sector fit and the sharpest illustration that the C1 test resolves by brand.
>
> **If PK prefers maximum consistency with the CFW ruling**, the equivalent-stage alternative is
> **1 asset (S6) → pool of 2**. I do not recommend it: it holds Invegent back for a risk it does not
> carry, and leaves it at a 50% repeat rate when nothing brand-owned is at stake.
>
> **Cheap de-risk available on request, before any Invegent gate:** render each candidate through
> the real `generic_quote_card_1x1_v1` template at the live 62 scrim — the same method that produced
> the PK-accepted scrim proof. That converts the contact-sheet simulation into actual production
> renders. It is read-only against ICE (an external provider call, no DB write) and I have **not**
> done it unbidden.

**Standing constraint reaffirmed:** no Invegent **client-scoped** background may ever be introduced
while Invegent is `client_preferred` — the first such asset would make `jsonb_array_length(v_bg_true)`
non-zero and **suppress Invegent's entire shared pool**, silently reducing it to 1. Invegent must move
to `best_fit` **before** any client-scoped background is added.

---

## Rulings requested

1. **Stage 1 — Manifest A alone** (`030256b8…`), own window. Recommend **yes** — provably inert.
2. **Stage 2 — pilot: promote S3 to CFW only** (`{CFW}` allowlist), own window, → 50/50.
   Recommend **yes**.
3. **Invegent — separate gate:** promote **3** (S6, S3, S1) → pool of 4. Recommend **yes**;
   alternative 1-asset staging stated above and not recommended.
4. **Optional pre-gate de-risk:** real Creatomate renders of the candidates. Available on request.
