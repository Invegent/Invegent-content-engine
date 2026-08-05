# S3 Content-Prep — M12 Music Sourcing PLAN (not sourcing)

**Lane:** Content-prep (T1, docs-only, read-only research) · **Deliverable is VERSION-LESS** —
no register edit, no register-cut-owner claim taken (per `docs/briefs/register-cut-owner-arrangement.md`
convention this memo does not touch).
**Governing constraint:** PK watch ruling, `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`
§1 — zero DB writes, zero fenced-intake rows, zero downloads into governed storage, zero schedule
surface during the Phase-1 watch (to ~2026-08-11 20:20 Sydney).
**Nothing in this memo is applied.** No track sourced, no track downloaded, no SQL authored/run,
no fence flipped, no `select_music` change, no `video-worker` change.

---

## 0. Headline

**The 8 already-fenced candidates are structurally sufficient to reach PK's number (4 selectable,
≥3 exercised) — no new sourcing is required as the primary path.** The real blockers are two
external, non-DB actions only PK can perform: (1) a real per-track YouTube Content-ID check on at
least 3 of the 7 viable candidates, and (2) a resolver capability that does not exist yet —
`select_music` has no rotation/seed mechanism at all, so "≥3 exercised, no unnecessary consecutive
same-brand reuse" cannot be proven today even after Content-ID clears. §3 names the sourcing
manifest as a **contingency**, not the default path. §4 names the resolver gap as the load-bearing
finding for part (c).

## 1. Governing PK number (already set, cited, not re-litigated here)

- **4 selectable Content-ID-safe tracks required; ≥3 exercised in the proof week; no unnecessary
  consecutive same-brand reuse** — PK ruling 2026-08-04
  (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:226-227,596-598`).
- M12 is Phase-2 (does not start before the §6 schedule-expansion plan is approved,
  `creatomate-global-ultimate-final-delta-audit-v1.md:487-489`) and is itself **gated behind M1**
  (automated loudness measurement) for its rotation-proof — `creatomate-global-ultimate-final-delta-audit-v1.md:470`:
  *"M1 Loudness measurement ← blocks: M2 acceptance quality, M6's reproducibility bar, **M12's
  rotation proof**"*. This memo is preflight planning only; it does not start Phase 2 work.
- Estimated shape already scoped: **1 sourcing batch + 1 rotation-proof lane**, sourcing tier T2,
  proof tier T1 ("reuses B-roll's uniformity method") — `creatomate-global-ultimate-final-delta-audit-v1.md:551`.

## 2. Paper evaluation of the 8 fenced `intake_candidate` tracks

Authoritative inventory (live DB read 2026-07-28, per
`docs/briefs/music-completion-gate1-packet-v1.md:37-55`), excluding the one already-selectable
track (Drifting Piano):

| track_key | title | mood | duration | licence | content_id_safe | classification |
|---|---|---|---|---|---|---|
| `warm_acoustic_simple_001` | A Simple Theme | warm | 97.3s | CC0 | false (UNKNOWN, fail-closed) | PROMOTE-CANDIDATE |
| `warm_acoustic_ducklin_002` | Little Ducklin | warm | 138.8s | CC0 | false | PROMOTE-CANDIDATE |
| `calm_ambient_glen_003` | Whispers of the Glen | calm | 161.6s | CC0 | false | PROMOTE-CANDIDATE |
| `neutral_jazz_saxpiano_004` | Sax and Piano | neutral | 94.2s | CC0 | false | PROMOTE-CANDIDATE |
| `neutral_piano_spring_005` | Spring On The Horizon | neutral | 91.8s | CC0 | false | PROMOTE-CANDIDATE |
| `uplifting_composed_pluto_007` | A Small Town On Pluto | uplifting | 230.3s | CC0 | false | PROMOTE-CANDIDATE — **sole uplifting-mood track** |
| `corporate_theme_medieval_008` | Medieval Theme | corporate | 156.8s | CC0 | false | RETAIN FENCED — mood-tag sanity flag (title reads medieval/period, not corporate; wants a PK listen before promoting under that tag) |
| `neutral_short_4mei_009` | 4 mei | neutral | 65.8s | CC0 | false | PROMOTE-CANDIDATE |

Source: `music-completion-gate1-packet-v1.md:37-96` (§1 inventory, §3 classification, §4 non-regression proof). No REJECT and no DUPLICATE/SUPERSEDED classification exists for any of the 8 (`:84-85`).

**Licence class:** all 9 tracks (the 8 above + Drifting Piano) are CC0 1.0 Universal, `commercial_use_allowed`/`social_use_allowed`=true, `attribution_required`=false — licence-safe by construction, no per-track licence risk remains open (`music-completion-gate1-packet-v1.md:51-53`). This was proven at intake with the same fenced-mechanics discipline as the logo lane: per-object storage byte-precheck + sha256 + `WHERE NOT EXISTS` idempotency + in-txn fenced-count + a **production-neutrality assertion** (zero tracks selectable after the DML) — `docs/briefs/results/music-library-v0-starter-harvest-intake-result.md:33-40`, mirroring `_harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql`.

**Content-ID posture:** `content_id_safe=false` on all 8 is a deliberate **fail-closed UNKNOWN**, not "known unsafe" (`docs/briefs/cc-0039-drifting-piano-content-id-verification.md:13`). The only method that has ever produced authoritative evidence is the cc-0039 method — PK (or PK-authorized) builds/identifies a track-forward test clip, uploads it **unlisted** to a real YouTube channel, and personally reads the Content-ID/copyright status in YouTube Studio after processing (`cc-0039-drifting-piano-content-id-verification.md:33-38,58-59`). This is an external, real-world action; no DB flag can truthfully substitute for it (`music-completion-gate1-packet-v1.md:12-19`). CC0 waives the *uploader's* copyright but does not prove the absence of a *third-party* Content-ID fingerprint match (`cc-0039-drifting-piano-content-id-verification.md:94`, and the licence-evidence snapshot itself: *"CC0 waives the uploader's copyright but does NOT guarantee the absence of a third-party YouTube Content-ID claim"* — `music-library-v0-manual-starter-harvest-brief.md:67`, source allow-list table).

**Mood/tempo spread vs. the gap:** warm×2, calm×1 (Drifting Piano already covers calm), neutral×3, uplifting×1 (sole uplifting candidate — highest diversity value per `music-completion-gate1-packet-v1.md:81`), corporate×1 (flagged, not clean). The starter-harvest result already logged that corporate and uplifting were the two thinnest moods and **not machine-harvestable** from CC0 catalogs — Pixabay/YouTube Audio Library (the strong sources for those moods) require hand-sourcing (`docs/briefs/results/music-library-v0-starter-harvest-intake-result.md:56`). No genre/energy/bpm tag data exists for any of the 9 (`music-completion-gate1-packet-v1.md:53`); `loudness_lufs`/`bpm`/`text_overlay_safe` are null on all 8 (human-recorded fields never filled in at intake, `music-completion-gate1-packet-v1.md:42-49`).

## 3. Can the fenced 8 yield 3 more Content-ID-safe promotable tracks? — Yes, structurally; PK action is the only gap

**Verdict: yes**, with no new sourcing needed, IF PK runs the cc-0039 Content-ID check on 3 of the
7 PROMOTE-CANDIDATE tracks. No licence, identity, or duration disqualifier exists for any of them
(`music-completion-gate1-packet-v1.md:84`). Recommended pick, weighted for mood diversity (the
richest gap dimension the register currently shows):

1. **`uplifting_composed_pluto_007`** — the only uplifting-mood candidate; highest marginal
   diversity value.
2. **One warm-mood track** (`warm_acoustic_simple_001` or `warm_acoustic_ducklin_002`) — Drifting
   Piano is calm, so warm is the next distinct register available.
3. **One neutral-mood track** (`neutral_piano_spring_005` or `neutral_short_4mei_009` — the
   shortest at 65.8s, cheapest to test) — neutral is the deepest pool (3 candidates) so it can
   absorb a CLAIMED result without losing the whole mood.

`corporate_theme_medieval_008` is deliberately excluded from this pick — it carries an open
mood-tag sanity question (§2) that should resolve before it is worth a Content-ID test, not because
of any licence/Content-ID defect.

**If PK has already run this check informally** on any of the 7 (outside this repo's evidence
trail), the existing guarded single-row flip pattern used for Drifting Piano
(`flip_content_id_safe_FORWARD.sql` precedent, `music-completion-gate1-packet-v1.md:108-109`) can be
reapplied per-track with no new design work — that is a future PK-gated apply lane, not this memo.

### 3a. Contingency — licence-safe sourcing manifest (only if PK elects it)

Spec this ONLY if PK's Content-ID checks on the existing 7 come back CLAIMED for enough tracks that
fewer than 3 remain viable, or if PK wants to backfill the corporate/uplifting mood thinness with
genuinely fresh material rather than relying on the existing pool. The manifest reuses the exact
fenced-first pattern already proven for both music (starter-harvest lane) and B-roll:

- **Allow-listed sources only** (no-attribution-only, mirrors
  `docs/briefs/music-library-v0-manual-starter-harvest-brief.md:59-69`):

  | Source | `license_type` | Content-ID posture |
  |---|---|---|
  | Pixabay Music (Pixabay Content License) | `royalty_free_no_attrib` | UNKNOWN unless the source states per-track YouTube/Content-ID safety → fail-closed |
  | YouTube Audio Library — no-attribution-required subset ONLY | `royalty_free_no_attrib` | Nominally Content-ID-safe as YouTube's own library, but capture the per-track flag |
  | CC0 sources (Free Music Archive CC0 filter, ccMixter CC0 filter) | `cc0` | UNKNOWN → fail-closed unless independently confirmed |

  Any source whose commercial/social rights, no-attribution status, or Content-ID/YouTube safety is
  uncertain is INELIGIBLE by construction — no CC BY / CC BY-SA / attribution-required / AI-generated
  / paid-stock, matching the image lane's own CC-BY exclusion
  (`music-library-v0-manual-starter-harvest-brief.md:36,69`).
- **Mechanics to mirror** (proven twice now — logo lane + this music lane): download to a harness
  sub-root only (never a live bucket in the sourcing step) → sha256-of-bytes + licence-evidence
  snapshot + `license_snapshot_hash` → human aural + licence review setting all six licence booleans
  explicitly, fail-closed on any unknown → fenced-intake SQL (all four fences false) with byte
  precheck + `WHERE NOT EXISTS` idempotency + in-txn fenced-count + a **production-neutrality
  assertion** (zero selectable tracks after the DML) — `music-library-v0-manual-starter-harvest-brief.md:41-104`,
  `docs/briefs/results/music-library-v0-starter-harvest-intake-result.md:29-40`.
- This is the **same shape as the B-roll batch-2 lane** that the delta audit already cites as the
  precedent M12 sourcing should reuse (`creatomate-global-ultimate-final-delta-audit-v1.md:488-489`).
- **This memo does not perform any of the above** — no download, no harness write, no SQL authored.
  It is returned as a spec only, per the watch ruling.

## 4. Rotation-proof method — reuses the B-roll seed-distribution uniformity check, WITH a named structural gap

### 4.1 The proven method (B-roll precedent)

The B-roll rotation proof draws N distinct UUID seeds through the resolver and checks two things:
**reachability** (every eligible asset is selected at least once) and **uniformity** (hit-count
distribution across seeds is near-equal, not skewed to one asset). Proven live twice:

- **40-seed sweep, 4-clip pool → 10/10/10/10 (exactly 25% each), zero unreachable clips** — "Perfectly
  uniform... rather than one clip repeated on every render"
  (`docs/briefs/results/broll-promotion-batch1-result.md:57-68`, guard **G8**: "rotation proof — all
  4 clips reachable across 24 seeds ✅", `:46`).
- The CGU-Final audit names this exact method as the reusable instrument for M12: *"Rotation seed
  distribution: reuse the existing uniformity check (40+ seeds, near-uniform distribution expected)
  for any pool a Week-1 mix draws from"* (`creatomate-global-ultimate-final-delta-audit-v1.md:719`),
  and separately: *"Music: with exactly 1 selectable track today..., Week 1 will show 100% repeat...
  this is the exact evidence M12's PK depth-number decision should be made against"*
  (`:713-716`).
- Mechanically, this works for B-roll because `resolve_slot_assets` accepts a seed parameter and
  performs seed-stable ranked selection across the eligible pool (design mirrored at
  `docs/briefs/music-library-v0-schema-packet.md:178`: *"mirroring `select_template`'s ranked-buckets
  + `p_seed` approach"*).

### 4.2 The gap: `select_music` has no seed parameter today — the method cannot be run as-is

This is the load-bearing finding for this section, and it is NOT a re-litigation of §0 — it is the
mechanical reason a synthetic seed sweep against `select_music` would currently return the *same*
track on every one of 40 seeds regardless of pool size:

- **Live `select_music` (4-arg, confirmed live) has zero rotation/seed input.** Its selection is
  `ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key LIMIT 1` — a single
  deterministic winner, always (`music-completion-gate1-packet-v1.md:20-29`, citing
  `supabase/migrations/20260710115043_select_music_require_content_id_safe.sql:119-120`).
- **All 8 candidate tracks have `loudness_lufs=NULL`**, which sorts last under `NULLS LAST` — so even
  if all 8 cleared Content-ID today, Drifting Piano (the only track with a *measured* loudness value)
  would keep winning every single call, unchanged (`music-completion-gate1-packet-v1.md:24-27`).
  Promoting more tracks **changes which track could win**, never whether the pool actually rotates.
- The unapplied, uncommitted 5-arg per-platform draft (`supabase/migrations/20260711003222_select_music_per_platform_scope.sql`)
  does not add a seed parameter either (checked directly — no `p_seed`/seed/rotation reference in
  the cc-0032 design packet, `docs/briefs/cc-0032-select-music-rpc-t3-design-packet.md`) and is not
  live regardless (`music-completion-gate1-packet-v1.md:65-70`).
- This is explicitly the same structural class already flagged for the Logo slot resolver
  (`music-completion-gate1-packet-v1.md:27-29`) and is named as an **open PK decision, not yet
  authorized**: *"Rotation: `select_music` will only ever return one deterministic track
  system-wide, forever, ... until it gains a seed/rotation mechanism... Building that is a separate
  resolver-upgrade lane, out of this task's boundary unless PK explicitly authorizes touching
  `select_music`"* (`:113-116`).
- **M1 (automated loudness measurement) is a hard prerequisite, already named by the audit**:
  *"M1 Loudness measurement ← blocks: ... M12's rotation proof"*
  (`creatomate-global-ultimate-final-delta-audit-v1.md:470`) — without real, distinct
  `loudness_lufs` values across the pool, even a seeded resolver would have a degenerate sort key
  (all-NULL ties) to fall back on.

### 4.3 Method as planned (to run once the prerequisite lands — not this week)

1. **Land M1** (loudness measurement) so every content-id-safe track in the pool carries a real,
   distinct `loudness_lufs` value — Phase 1 foundation item, already sequenced ahead of M12
   (`creatomate-global-ultimate-final-delta-audit-v1.md:469-479`).
2. **Name, and get PK authorization for, a resolver-upgrade lane** adding a `p_seed`/weighted-random
   selection path to `select_music`, mirroring `resolve_slot_assets`'s proven seed-stable ranking —
   its own T2/T3-gated lane, out of this week's no-DB-writes/no-schedule-surface scope. Nothing built
   in this memo.
3. **Once that lands, run the identical B-roll-shape sweep**: ≥40 distinct seeds through
   `select_music`, requiring (i) 100% reachability — every one of the ≥4 selectable tracks hit at
   least once, and (ii) near-uniform distribution (parity across seeds, allowing for legitimate skew
   from suitability/cooldown filtering, not raw bias) — same acceptance shape as the B-roll G8 guard
   and the 40-seed 10/10/10/10 result (`broll-promotion-batch1-result.md:57-68`).
4. **Cross-check against real usage, not only synthetic seeds**, because PK's ruling frames the
   requirement in terms of an actual proof-week outcome ("≥3 exercised... no unnecessary consecutive
   same-brand reuse"), not a synthetic sweep alone: read `m.music_usage_event` (the append-only usage
   log that powers the per-client/per-platform cooldown window and the same-day cross-client dedup
   guard, `music-library-v0-schema-packet.md:132-133,190-193`) across the real Week-1 mix, per the
   audit's own Week-1 reporting instruction (`creatomate-global-ultimate-final-delta-audit-v1.md:713-720`).

## 5. What this memo is NOT proposing

No track sourced, downloaded, Content-ID-tested, or fence-flipped. No `select_music` change
authored or authorized. No migration, RPC, or worker edit. No register edit. This is planning input
only, for PK's review at (or after) watch expiry.

## 6. Open questions for PK

1. Authorize the cc-0039-style Content-ID test on the 3 recommended tracks (§3), or a different
   selection?
2. Elect §3a (fresh sourcing) now, defer it, or hold it as contingency-only pending the Content-ID
   results?
3. Authorize scoping a `select_music` seed/rotation resolver-upgrade lane (§4.3 step 2) — its own
   future T2/T3 gate — or hold the rotation proof entirely until M1 lands and re-decide then?
4. `corporate_theme_medieval_008` — keep the `corporate` mood tag as-is, or take the aural listen
   first (carried open question, `music-completion-gate1-packet-v1.md:117-118`)?

## 7. Sources

`docs/briefs/music-completion-gate1-packet-v1.md` · `docs/briefs/music-library-v0-schema-packet.md`
· `docs/briefs/music-library-v0-manual-starter-harvest-brief.md` ·
`docs/briefs/results/music-library-v0-starter-harvest-intake-result.md` ·
`docs/briefs/cc-0039-drifting-piano-content-id-verification.md` ·
`docs/briefs/cc-0032-select-music-rpc-t3-design-packet.md` ·
`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` ·
`docs/briefs/results/broll-promotion-batch1-result.md` ·
`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`.
