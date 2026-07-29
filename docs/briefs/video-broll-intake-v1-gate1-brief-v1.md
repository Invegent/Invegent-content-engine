CLAIMED · video-broll-intake-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1 ratification · 2026-07-29

# Brief — video-broll-intake-v1 (P2-5, Gate-1)

**Created:** 2026-07-29 Sydney · **Status: ✅ GATE-1 RATIFIED (PK, 2026-07-29).** Execution (sourcing/
harvesting/intake/promotion/any DB mutation) is **explicitly NOT authorized to begin in the session that
produced this ratification** — it is a separate future lane, its own gate-2 sequencing.
**Author:** orchestrator (direct) · **Supersedes:** `docs/briefs/video-broll-intake-v1-gate1-brief-DRAFT.md`
(2026-07-27, stale resolver premise — see "What changed" below).
**Executor (future lane):** Claude Code (orchestrator), or `image-harvester`-class tooling once a
video-capable sourcing path exists — **SOURCING + FENCED INTAKE ONLY**; no promotion authorized by
this brief.
**Result file (future lane):** `docs/briefs/results/video-broll-intake-v1-result.md`

> **Lane classification:** PRODUCT_PROOF · **Tier: T2** for the DB write (same-shape fenced DML into
> `c.client_brand_asset`, additive, isolated — proven twice: Perth 2026-07-09, AU-suburb 2026-07-1x) —
> **except the sourcing sub-step, which is genuinely new** (no proven video-harvest primitive exists;
> `image-harvester` is stills-only per its charter) and gets candidate-level scrutiny on its first run.
> **Client:** Property Pulse only.

---

## What changed since the 2026-07-27 DRAFT (live-reverified 2026-07-29)

The draft's central scoping premise was stale. In the 48 hours before this ratification, the
**Governed B-roll Consumption v1** lane (2026-07-28) and the **B-roll Production Activation v1** lane
(2026-07-28→29, applied/proven/rolled back) both landed:

1. **The resolver is not what the draft says.** Draft claimed `resolve_slot_assets` "still filters
   `usage IN ('background','logo')`", so `broll_background` rows were "invisible to selection by kind."
   **False, live-reconfirmed twice (2026-07-29, incl. a dedicated db-rls-auditor pass):** the resolver
   is **v1.4** (`v_bg_is_video` exclusive-by-element-type discriminator) and **already actively
   consumes** `usage='broll_background'` rows for any video-typed Background field. The draft's "true
   danger point" (widening the resolver) already happened, in a different, already-proven, already-live
   lane — not this brief's to avoid, because it's already done and out of scope here regardless (§TPR-1
   boundary below).
2. **A B-roll-capable template already exists and is registered** — `46c5c4ac` / ICE row `dd5fd75e`
   (720×1280, 8s, `variant_key='stat-reveal-9x16-broll-v1'`), `fit_status='candidate'` (not the
   production default). Sourcing more clips feeds a real, live, already-proven selection mechanism —
   not an inert one.
3. **Production is currently back on the incumbent** (`c11bb8ab`/`a3d8472d`, 1080×1920/12s). B-roll was
   activated, proven end-to-end, then **rolled back by PK** because the promoted B-roll template
   renders at 720×1280/8s — a silent downgrade from the incumbent nobody caught until the render proof.
   This produced standing requirement **TPR-1**: any future repoint of a governed format's default
   template must diff the output spec (resolution/duration/codec) of outgoing vs. incoming at Gate 1.
   This brief sources fenced candidates only — it does not repoint anything — but PK's rulings below
   fold TPR-1's *intent* into candidate review (crop-proof to 1080×1920/12s at review time), so a future
   promotion lane inherits clean footage rather than re-discovering a spec mismatch late.
4. **Real inventory, db-rls-auditor-confirmed 2026-07-29: exactly 2 `broll_background` rows, not
   "2 fenced."**
   - `42211c0f…` (Perth, **16:9**, `geography=au_wa_perth`, `safe_for_text_overlay='needs_gradient_scrim'`)
     — still fenced (`intake_candidate`). **Carry:** `needs_gradient_scrim` is not in the resolver's
     accepted vocabulary (`IN ('true','needs_scrim')` only, confirmed live in `resolve_slot_assets` —
     anything else resolves `text_safety_unknown` and fails closed) — this clip cannot become eligible
     even if promoted, without a value correction. Recorded here; not fixed by this brief (§5 below).
   - `2d62b04e…` (**9:16**, `safe_for_text_overlay='needs_scrim'`) — **already governed/active**, the
     sole eligible `broll_background` row today (one-clip pool, PK-accepted risk pending this intake).
   - The real gap: **1 governed clip, 0 additional fenced candidates in the pipeline**, against the
     ratified pool-sizing floor of 3 (min) / 8 (target).
5. **Both existing rows carry `platform_scope=['youtube']`, which is not exercised correctly today**
   (production calls `resolve_slot_assets` with `p_platform=NULL`, which is permissive of any
   `platform_scope` value regardless — db-rls-auditor confirmed this fires the unconditional
   `platform_input_missing` warning, not a per-row `platform_scope_unbacked` one; and YouTube itself
   independently fails at the template-suitability layer before asset scope would ever matter).
6. **`2d62b04e` is mislabeled** — `asset_name` says "**Generic** AU suburban aerial" but `geography` is
   the specific `au_nsw_sydney_hurstville` — the same "declared-generic but actually specific" gap the
   repo's C1 geo-authenticity carry exists to catch.

---

## Task

Source, licence-clear, dedup, and **fence-insert** (default-closed) a themed batch of additional
Property Pulse video B-roll clips into `c.client_brand_asset` (`usage='broll_background'`), moving
toward the ratified pool-sizing floor (min 3, target 8). Stops at the PK visual gate. Promotes nothing,
reactivates nothing, does not touch the resolver or any template.

## PK Gate-1 rulings (2026-07-29 — binding on the future execution lane)

### 1. Approved source allow-list
- **Pexels Video.**
- **Pixabay Video** — **do NOT treat Pixabay generally as CC0.** Each Pixabay clip must be
  individually verified for its actual licence terms; do not assume a site-wide blanket licence.
- **Other sources** only where the **individual clip** carries explicit, archived CC0/public-domain
  evidence (a saved licence page/statement, not a verbal claim).
- **Excluded:** YouTube/social-platform downloads; generic "no copyright" aggregation sites (no
  individually-verifiable, archivable licence chain).
- **Provenance requirement (every clip, no exceptions):** creator name, source URL, provider ID,
  download timestamp, licence evidence (archived, not just linked), and sha256 hash — all recorded in
  `asset_meta`, mirroring the proven Perth/AU-suburb shape plus this explicit provenance set.

### 2. Batch
- Source **8 candidates** in one themed batch.
- **Target 4–6 accepted** candidates into the fenced shortlist.
- **Stop when sufficient coverage is achieved — do not maximise volume.** Fewer than 8 sourced or
  fewer than 4 accepted is an acceptable outcome if quality/geo-authenticity would otherwise be
  compromised; this is not a quota to force-fill.

### 3. Technical acceptance
- **Native 9:16 preferred.**
- **Must crop safely to 1080×1920** — verify the safe-crop region at review time (not deferred to a
  future promotion lane), per the TPR-1-motivated crop-proofing below.
- **Must provide at least 12 seconds of usable footage after trimming.**
- **Reject:** embedded text, watermarks, legible signage, third-party branding, unsafe focal placement
  (a subject that would sit under the text-safety zone or get cropped awkwardly at 9:16).
- **Avoid identifiable people** unless release posture is adequately evidenced (mirrors the existing
  image-lane people-forward caution — no release evidence = reject).

### 4. Platform scope
- New rows' `platform_scope` defaults **explicitly** to `['facebook','instagram','youtube']`.
- **Do not use a `NULL`/"generic" scope** (supersedes this brief's earlier draft recommendation of
  `NULL` — PK's ruling is more precise: name the platforms explicitly).
- **Exclude LinkedIn** from the default scope until LinkedIn's own governed vertical-video template
  and publisher path are proven (separate, unstarted lane).

### 5. Existing-row carries
- **Record** (this brief, §"What changed" points 4–6): the `platform_scope=['youtube']` mis-scoping
  and the Hurstville clip's incorrect "generic" classification.
- **Do not mutate** `42211c0f` or `2d62b04e` in this sourcing outcome — carried forward as-is.
- The new batch **must not repeat either problem**: correct `platform_scope` per ruling 4, and label
  every new clip by what it actually, specifically shows (no "generic" label on a geographically
  specific clip).

### 6. TPR-1 boundary
- **Apply 1080×1920 and 12-second crop-proofing during candidate review** — i.e., verify each accepted
  clip's safe-crop region and usable-duration claim now, at intake, not deferred.
- **Do not** activate a template, promote any clip to production selection, or change resolver v1.4 in
  this lane. TPR-1 itself (diffing a *template's* output spec at any future repoint) remains the
  concern of a later promotion/reactivation lane — this ruling only pulls the *clip-level* crop/duration
  verification forward so that lane inherits clean material.

---

## Scope

**In scope (future execution lane, not this session):**
1. Candidate sourcing from the ratified allow-list (§1) only.
2. Full-clip review (whole timeline, not a thumbnail): technical acceptance per §3, AU geo-authenticity
   (recognisably Australian — tiled/Colorbond roofs, gum trees, wide suburban lots, known AU skylines —
   or geo-neutral/abstract motion; never a foreign locale passed off as AU), crop/duration proofing
   per §6.
3. Honest sha256 + provider-id + source-url dedup (perceptual/temporal fingerprinting deferred to v2).
4. Fenced insert reusing the twice-proven shape: `asset_type='other'`, `usage='broll_background'`,
   `asset_meta` carrying mime/duration_s/fps/has_audio/motion/loopable/aspect_ratio/geography +
   the full provenance set from §1 + `platform_scope=['facebook','instagram','youtube']` (§4) +
   `safe_for_text_overlay` using only `'true'`/`'needs_scrim'` (never `'needs_gradient_scrim'` —
   confirmed not resolver-recognised); all four fences false.
5. The four per-apply guards, never waived: byte-verify local sha256 == public-URL sha256; in-txn
   fail-closed pool-neutrality assertion pinned to the live eligible-broll-pool count (re-verify at
   apply time, not frozen from this brief); branch-warden clean; rollback (row DELETE + storage-object
   delete) written and validated before any apply.
6. Terminal state = PK visual gate. Shortlist stays fenced/inert.

**Out of scope (this brief and its eventual execution lane):**
- ❌ Any resolver change (moot — already v1.4, already consumes this usage).
- ❌ Any promotion / fence-flip / template repoint / `fit_status` change / `enabled`-flip.
- ❌ Authoring or editing any Creatomate template (PK-only; no template-create API).
- ❌ Mutating `42211c0f` or `2d62b04e` (§5 — record only).
- ❌ Non-PP clients; non-`video_short_stat` formats; LinkedIn scope (§4); people-forward without
  release evidence; auction/crowd footage.

## Allowed actions (future execution lane)
- Read repo/docs/registers/live DB as evidence.
- Fetch candidate clips **only** from the §1 allow-list, review per §3/§6, dedup, insert fenced rows
  behind the four guards.
- Present the fenced shortlist for the PK visual gate.

## Forbidden actions (future execution lane)
- ❌ No fetch from any provider/licence not on the §1 allow-list; no unverified Pixabay CC0 assumption;
  no YouTube/social downloads; no generic aggregation sites.
- ❌ No promotion, approval, fence-flip, `fit_status` change, or `enabled`-flip of any clip or template.
- ❌ No resolver, worker, or template edits; no deploy; no render trigger.
- ❌ No mutation of the two existing `broll_background` rows.
- ❌ No LinkedIn platform scope on new rows.
- ❌ Never waive a per-apply guard on any clip.
- ❌ Respect the deploy-chokepoint sequencing hold and the DO-NOT-START list.

**Forbidden in THIS session specifically (PK instruction, 2026-07-29):** no harvesting, downloading,
intake, promotion, or DB mutation of any kind — this session finalizes and ratifies the brief text
only.

## Tier and gate chain
- **T2** for the DB write; sourcing sub-step gets candidate-level scrutiny on its first v1 run.
- **Chain (future execution lane):** db-rls-auditor (live selector version + CHECK constraints +
  current exact eligible-pool count, re-verified at apply time) → external review pinned to the apply
  packet hash → branch-warden → the four per-apply guards in the apply transaction → **PK visual gate**
  per clip/batch.
- Promotion of any sourced clip is a **separate future T3 lane**, never this one.

## Success criteria
- A licence-safe, full-clip-reviewed, deduplicated, crop/duration-proofed **fenced** shortlist of 4–6
  new PP B-roll clips (from a batch of 8 sourced), each row carrying the full §1 provenance set,
  correct `platform_scope` (§4), and an honest label (no "generic" mislabelling).
- Live-eligible broll/background/logo pool count provably unchanged by every intake apply.
- No resolver, template, `fit_status`, `enabled`, or production-selection change occurred.
- The two existing rows' carries (§5) are recorded, not mutated.
- Lane terminates at the PK visual gate.

## Stop condition
**This session:** stop now — brief ratified, committed, pushed; no execution begins.
**Future execution lane:** stop for PK at the visual gate once the fenced shortlist (target 4–6 of 8
sourced) is built. No promotion or reactivation begins on this ratification alone — that is a separate
future T3 gate.

---

## Live-truth basis (db-rls-auditor pass, 2026-07-29 — confirms this brief's citations)
- `broll_background` row count/state: confirmed exactly as described (item 4 above) — no drift since
  the brief's first draft earlier the same day.
- `safe_for_text_overlay` accepted vocabulary: confirmed live — exactly `'true'` / `'needs_scrim'`;
  no CHECK constraint exists (jsonb key, application-level only), matching the resolver body read.
- `asset_type` CHECK: confirmed live list includes `'other'` (the value both existing rows use).
- `platform_scope` mechanics: confirmed — `p_platform=NULL` is permissive regardless of a row's
  `platform_scope` contents (fires the unconditional `platform_input_missing` warning); an explicit
  `p_platform='linkedin'` against `['facebook','instagram','youtube']` correctly excludes
  (`platform_excluded`) — relevant if a future caller ever passes an explicit platform.
- No B-roll shortage detector exists anywhere in the catalog (confirmed via a full `pg_proc.prosrc`
  sweep for `broll_background`) — still just `resolve_slot_assets` and nothing else.

All of the above were read-only catalog/data reads; nothing was written, mutated, or promoted.
