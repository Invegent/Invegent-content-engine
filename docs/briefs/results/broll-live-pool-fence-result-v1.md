# Result — B-roll live-pool audit + fence of two defective production assets

**Brief file:** none — PK-directed in-session, arising from the P1 conflict recorded at
`docs/briefs/results/broll-video-sourcing-4brand-result-v1.md` §6 (committed `9dcdb92`).
**Predecessor result doc:** `broll-video-sourcing-4brand-result-v1.md` — **NOT amended** (no historical
rewrite). That doc records `f84ac010` as flagged-not-resolved and has no knowledge of `e6e24358`; this
doc supersedes it on both points.
**Executed by:** Claude Code (orchestrator), first-hand — no subagent verified any finding here
**Completed:** 2026-08-07 Sydney
**VERSION-LESS** — register payload at §10.

---

## 1. Result status

`Complete`. Two live production assets **fenced** and post-verified. Full live PP B-roll pool
(6 rows) audited first-hand. **One new defect discovered** that no prior lane knew about.
**Five items left deliberately open** (§7) — none closed by this lane.

**Classification (control tower, 2026-08-07):** PK-authorized production write under the explicit-PK-
authorization carve-out — the v6.140/v6.147 hold bars mutation *until watch PASS + explicit PK production
authorization*; PK gave it directly, on verified evidence.

## 2. Commit(s)

N/A at authoring — working-tree only. Persistence is the control tower's step.

## 3. Files changed

- `docs/briefs/results/broll-live-pool-fence-result-v1.md` — created (this doc).
- **Database:** 2 rows in `c.client_brand_asset` (§4). No DDL. No storage change. No repo/code change.

## 4. Actions taken

### 4.1 The executed statement (verbatim)

```sql
UPDATE c.client_brand_asset
SET is_active = false,
    asset_meta = asset_meta
      || jsonb_build_object(
           'approved', false,
           'production_use_allowed', false,
           'approval_status', 'fenced_signage_defect',
           'fenced_at', now()::text,
           'fenced_by', 'PK',
           'fenced_reason', 'Legible third-party business signage present in the delivered 1080x1920 frame, verified at 1:1 across clip duration. f84ac010: "Fremantle" (Bathers Beach House) wordmark. e6e24358: "Owen Hodge" law-firm wordmark plus rooftop/retail branding. The prior review_notes claim "No text/watermark/legible signage across 9 sampled full-timeline frames" is RETRACTED as false for both rows.'
         ),
    updated_at = now()
WHERE asset_id IN ('e6e24358-ab81-4f48-9d40-c4e756410b34',
                   'f84ac010-80bc-481e-91b7-cb9bc9b4b94f')
  AND is_active = true
RETURNING asset_id, is_active, asset_meta->>'approved', asset_meta->>'approval_status';
```

`RETURNING` confirmed exactly 2 rows, both `is_active=false` · `approved=false` ·
`approval_status=fenced_signage_defect`. The `AND is_active = true` guard is **not** load-bearing for
scoping (asset_id is the PK); it makes a re-run a harmless 0-row no-op instead of re-stamping `fenced_at`.

### 4.2 Defect evidence — `f84ac010-80bc-481e-91b7-cb9bc9b4b94f`

Pexels `32433684` · storage `broll_pp_au_wa_perth_coastal.mp4` · native 1080×1920 / 19.7s.

- **Live storage bytes downloaded; sha256 matched the DB record exactly** (`9bf4cf20…`) — the file is
  what the row claims, and no crop mitigates because the file **is** the delivery frame.
- **"Fremantle" (Bathers Beach House) wordmark legible at full frame** from ~0.5s to ≥16s. Degrades to
  marginal only at ~19.5s as the camera pulls back — **under 4s clean against a 12s usable bar, so no
  trim rescues it.**
- **Geo label wrong:** footage is unmistakably Fremantle (Bathers Beach House, Esplanade Park Ferris
  wheel, West End architecture); `geography='au_wa_perth_cottesloe'` and the asset_name say Cottesloe,
  ~10km distant. `geo_scope='au_wa_perth'` remains correct at metro level. Pexels' own title is generic
  ("Perth's scenic coastline") — the Cottesloe attribution was added by the row author, inherited from
  nothing.
- **Independently corroborated:** the same provider ID was sourced and REJECTED on this exact ground by
  the unrelated 2026-08-07 harvest lane, before the live row was ever read.

### 4.3 Defect evidence — `e6e24358-ab81-4f48-9d40-c4e756410b34` — **NEW, previously unknown**

Pexels `31639439` · storage `broll_pp_au_nsw_urban_centre.mp4` · native 1080×1920 / 51.6s ·
PP Hurstville urban centre.

- Live bytes sha256 matched the DB record exactly (`acb408d2…`).
- **"Owen Hodge" (a Hurstville law firm) wordmark legible at TRUE 1:1, no upscaling**, on a building
  facade. Confirmed present at **t=1 and t=40** — it persists across the clip, so as with `f84ac010`
  no trim removes it. Additional rooftop retail branding and shopfront signage present.
- **This row was not on any prior lane's radar.** It was found only because PK directed a full pool
  audit rather than a single-asset check.

### 4.4 Licence dimension (not merely an internal rule)

The Pexels License restricts implying endorsement by brands appearing in the imagery. A legible
third-party hospitality venue / law-firm name in a Property Pulse marketing video is that exposure
directly. Both rows were `platform_scope=[facebook, instagram, youtube]` and fully unfenced, i.e.
publishable.

### 4.5 Full live-pool audit (all 6 live rows, first-hand)

Every row: live bytes downloaded, sha256 verified against the DB record (**6/6 matched**), all native
1080×1920, contact sheets over full duration plus targeted 1:1 and brightened zooms.

| Row | Subject | Outcome |
|---|---|---|
| `f84ac010` | Perth/Fremantle coastal | **FENCED** — legible "Fremantle" |
| `e6e24358` | Hurstville urban centre | **FENCED** — legible "Owen Hodge" (NEW) |
| `2d62b04e` | "Generic AU suburban aerial" | **OPEN PK JUDGMENT — LEFT LIVE.** McDonald's arches identifiable at ~15px at 1:1: brand *mark*, no readable wordmark. Materially weaker than the two fenced; deliberately not fenced. Separately: named "Generic" while geo-tagged `au_nsw_sydney_hurstville` |
| `4653144c` | Sydney metro waterway | **CLEAN.** Opens over a school/community facility — checked first as the most sensitivity-laden content in the pool: courts, car park and grounds **empty**, filmed out-of-hours. No people, no readable signage |
| `9cf9d01a` | "CBD skyline" | **CLEAN.** Despite the name it is a residential suburban aerial with the CBD only on the distant horizon. No readable commercial signage |
| `aa55659e` | Apartment balcony abstract | **CLEAN.** No people, no signage. Note: near-static, very little motion across 25s |

Already-fenced 7th row `42211c0f` was not touched — see §7 item 3.

## 5. Constraints confirmed

- **DDL:** none. **Storage:** unchanged. **Repo/code:** unchanged (this doc is the only file write).
- **Rows touched:** exactly 2, by primary key. Post-verified: 0 rows accidentally caught; total PP
  broll rows still 7 (nothing deleted).
- **Direction of change:** exposure-REDUCING (removes two assets from production selection). No asset
  promoted, no fence opened, no pool widened.
- **Reversible:** rollback SQL validated and prior state captured OUTSIDE the DB (§6.3).
- **External review gate:** honoured, including a non-clean first verdict that was **not** applied (§6.1).
- The freshly sourced 2026-08-07 corpus remains **harness-only and NOT intaken** — this lane promoted
  nothing to refill the pool.

## 6. Gate trail and verification

### 6.1 External review — first verdict was NOT applied

| Review | Verdict | Outcome |
|---|---|---|
| `0061d0c4-4a13-4da1-9505-660faf125ae7` | **partial / medium risk / escalate** | **NOT APPLIED.** Three points triaged individually |
| `5d7651db-4105-4e38-a7d4-6f445f948d50` | **agree / clean / no escalation** | Applied — this is the statement in §4.1 |

Triage of the first review, point by point:

1. **"prior_state_for_rollback inside asset_meta pollutes the metadata contract"** → **ACCEPTED AND
   FIXED.** The key was removed from the write entirely; rollback state moved outside the DB.
2. **"other consumers may bypass is_active/approved"** → `missing_evidence` → **evidence gathered**
   (§6.2), not argued away.
3. **"another row with the same UUID but a different status could be affected"** → **DISMISSED WITH
   EVIDENCE**: `pg_constraint` shows `client_brand_asset_pkey = PRIMARY KEY (asset_id)`; a UUID cannot
   appear twice. Premise did not hold.

The first review was **addressed, not overridden.** Only the clean re-review was executed.

### 6.2 Fence-targeting evidence — the declared-control check

`pg_get_functiondef(public.resolve_slot_assets)` gates on exactly two of the four fence fields:

```
IF   r.is_active IS NOT TRUE            THEN v_reason := 'inactive';
ELSIF (r.approved_txt)::boolean IS NOT TRUE THEN v_reason := 'not_approved';
```

**`production_use_allowed` and `approval_status` do not appear in the function body at all.** Fencing
via those two alone would have produced a row that *looks* fenced and changes nothing — the
declared-control-never-consulted failure class. `is_active` and `approved` are therefore the
load-bearing writes here; the other two are documentary.

Consumer enumeration (both directions):

- **All 7 DB functions** whose bodies reference `client_brand_asset` read `is_active`:
  `probe_asset_inventory`, `resolve_brand_assets`, `resolve_slot_assets`,
  `list_client_governed_assets`, `get_creative_template_portfolio`,
  `get_creative_template_portfolio_summary`, `get_client_production_readiness_queue`.
- **One direct-table reader in the repo:** `supabase/functions/tmr-drift-probe/index.ts:345`, which
  filters `asset_meta->>usage = 'background'` (still images, **not** `broll_background`) — it never sees
  these rows, and is read-only monitoring rather than a selection path.

**No production selection path reads these rows without honouring `is_active`.**

### 6.3 Rollback (validated; held outside the DB)

```sql
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta
      || jsonb_build_object('approved', true, 'production_use_allowed', true,
                            'approval_status', 'governed')
       - 'fenced_at' - 'fenced_by' - 'fenced_reason',
    updated_at = now()
WHERE asset_id IN ('e6e24358-ab81-4f48-9d40-c4e756410b34',
                   'f84ac010-80bc-481e-91b7-cb9bc9b4b94f');
```

Exact pre-change state, both rows: `is_active=true` · `approved=true` ·
`production_use_allowed=true` · `approval_status='governed'`.
Pre-change `asset_meta` md5: **`e6e24358` = `8cdedca32ba7540d9b27089d2bbfe85b`** ·
**`f84ac010` = `7e89bd7103bacd39a7b1ff6ef189c6df`**. Full pre-change `asset_meta` for both rows is in
the session transcript.

### 6.4 Post-apply verification (effect, not just field values)

Re-ran the eligibility filter used by the pool-count functions:

| Metric | Result |
|---|---|
| Eligible PP broll pool | **6 → 4** (`aa55659e`, `2d62b04e`, `9cf9d01a`, `4653144c`) |
| Fenced rows still appearing in pool | **0** |
| Total PP broll rows | **7** — unchanged, nothing deleted |
| Rows accidentally carrying the new `fenced_signage_defect` status | **0** |

## 7. Open issues — five items, NONE closed by this lane

1. **`2d62b04e` remains LIVE and needs an explicit PK yes/no.** McDonald's arches identifiable at ~15px
   at 1:1 — a brand mark without a readable wordmark. Precedent cuts toward consistency (the Invegent
   sourcing lane rejected a clip for an Amazon logo, also a mark not text), but the scale here is very
   different. Deliberately left live rather than resolved by orchestrator judgment. Its
   "Generic"-name-vs-`au_nsw_sydney_hurstville`-tag mismatch is a second, separate defect on the same row.
2. **Pool is at 4, below the previously recorded "POOL=6 MET" threshold, with no automatic backfill.**
   The natural refill is the watch-gated 2026-08-07 corpus, which makes the intake election more urgent.
   Threshold consequence is a PK/product call, not a rule failure.
3. **`42211c0f`** (already fenced, untouched) carries `safe_for_text_overlay='needs_gradient_scrim'` — a
   value the resolver does **not** recognise (it accepts only `'true'`/`'needs_scrim'`). Inert while
   fenced; **would misbehave if ever promoted as-is.** Noted, not fixed.
4. **`f84ac010`'s geo label is still wrong** (`au_wa_perth_cottesloe`, actually Fremantle). Fencing was
   the instruction; correcting a label is a separate write and was not made. Low urgency while fenced,
   but it must not be un-fenced with the label intact.
5. **The seven open PK decisions from the predecessor result doc** (§7 of
   `broll-video-sourcing-4brand-result-v1.md`) are unchanged, minus the `f84ac010` verification which
   this lane discharged.

## 8. SYSTEMIC FINDING — asserted-but-unperformed verification

**Both fenced rows' `asset_meta.review_notes` state: _"No text/watermark/legible signage across 9
sampled full-timeline frames."_ Both claims are demonstrably FALSE.** Identical phrasing, same
2026-07-29 intake batch, both `approved_by: PK`. `f84ac010`'s notes additionally describe Cottesloe
scenery ("Norfolk Island pines, Indian Ocean w/ seagrass, white limestone foreshore") for footage that
is Fremantle — confidently wrong, not merely vague.

The failure is not that a reviewer missed something subtle. **It is that the record asserts a specific
verification, with a frame count, that did not happen — and PK's approval rested on that assertion.**
An approval is only as good as the evidence claim under it, and that claim was unfalsifiable from the
record alone: nothing in the row distinguishes "9 frames sampled and clean" from "9 frames not sampled".

### 8.1 Scope — measured, and NARROWER than first reported

I initially relayed to the control tower that *every* signage/person claim from that batch should be
treated as unverified. **That framing was too broad and is corrected here.** Measured across all
`c.client_brand_asset` rows:

| Usage class | Rows | Carrying a sampled-frames/signage claim |
|---|---|---|
| `broll_background` | 7 (4 live + 3 fenced) | **4** |
| `background` (still) | 57 (44 live + 13 fenced) | **0** |
| `logo` | 36 | **0** |
| `logo_vector_source` | 34 | **0** |

**The false-claim pattern is contained to `broll_background`** — and **all 7 rows in that class have now
been independently re-verified first-hand by this lane** (§4.5). So the re-verification lane this finding
implies is, for the broll class, **already discharged**; the only residue is the `2d62b04e` ruling (§7.1).

### 8.2 The lane it actually implies — a DIFFERENT gap

The 44 live still-image `background` rows carry **no** recorded signage verification under any phrasing
searched. **Absence of a false claim is not evidence of a clean asset** — it means there is no recorded
verification to audit at all. That is a different and larger gap than the one just closed: **unrecorded**
rather than **falsely recorded**, across a bigger surface.

**Named implied lane — `still-background-signage-verification-v1` (NOT started, NOT authorized):**
first-hand signage/person re-verification of the 44 live still-image background rows, using this lane's
method (live bytes downloaded, sha256 checked against the DB record, inspection at true 1:1 in the
delivered frame). Read-only until a defect is found; any fence is its own PK gate. Scoping note: still
images are single-frame, so per-asset cost is far below the video case.

### 8.3 Structural recommendation (for PK, not adopted here)

Nothing in the pipeline re-checks live pool contents against the rules they were admitted under. Both
defects here surfaced by accident — a fresh harvest happened to re-source the same provider ID. A
periodic re-verification pass, or a requirement that a signage/person claim name its artifact
(frame paths, not prose), would make the claim auditable. **Not built, not authorized — a PK decision.**

---

## 9. Learning notes

- **Verify the live artifact, not the record, and not a subagent's account of it.** Every finding here
  came from downloading the live storage bytes, hash-matching them to the DB row, and reading frames
  directly. Relaying a subagent's claim about a live production asset would have repeated the exact
  failure being diagnosed.
- **Check what the code reads before writing a fence.** Two of the four fence fields are never consulted
  by the resolver. A fence set only on those would have looked right in the row and changed nothing.
- **A non-clean external review is a routing instruction, not an obstacle.** One point was a real design
  defect (fixed), one needed evidence (gathered), one rested on a false premise (dismissed with
  `pg_constraint` output). Applying on the `partial` verdict, or re-submitting unchanged to get a
  different answer, would both have been wrong.
- **Auditing the neighbours of a known defect is where the yield is.** `f84ac010` was the reported item;
  `e6e24358` — equally live, equally publishable — was found only because the whole pool was checked.
- **Correct your own scope claims when measurement narrows them.** §8.1 walks back a broader statement I
  had already relayed; leaving it uncorrected would have sent a re-verification lane after 127 rows when
  the real gap is a different 44.

---

## 10. Register payload (version-less — pointer only, per Convention 1)

```
B-roll LIVE POOL: 2 defective production assets FENCED (PK-authorized production write, watch-window
carve-out). f84ac010 (legible "Fremantle" wordmark; geo label wrong — Fremantle not Cottesloe) +
e6e24358 (legible "Owen Hodge" law-firm wordmark — NEW defect, previously unknown). Reviews
0061d0c4 partial/NOT-APPLIED -> fixed+evidenced -> 5d7651db agree/clean -> applied.
Post-verified: eligible pool 6->4, fenced-in-pool 0, total rows 7, accidental 0. Reversible —
rollback SQL + prior-state md5s held outside DB.
SYSTEMIC: both rows' review_notes asserted "no legible signage across 9 sampled full-timeline frames"
— FALSE for both, same 2026-07-29 batch, both approved on that claim. Scope MEASURED + NARROWED:
contained to broll_background (4 of 7 rows); all 7 now re-verified first-hand. Implied NEW lane =
44 live still-image background rows carry NO recorded signage verification (unrecorded, not false).
FENCE-TARGETING: resolve_slot_assets reads ONLY is_active+approved; production_use_allowed and
approval_status are NEVER read (declared-control class).
OPEN: 2d62b04e still LIVE (McDonald's mark ~15px, PK ruling) · pool 4 < "POOL=6 MET", no backfill ·
42211c0f 'needs_gradient_scrim' unrecognised value · f84ac010 geo label uncorrected · 7 prior-doc
decisions carry.
Result: docs/briefs/results/broll-live-pool-fence-result-v1.md
Predecessor NOT amended (9dcdb92). Next gate: PK decisions.
```
