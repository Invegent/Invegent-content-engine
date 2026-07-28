# ICE Asset Gap Register v1 (read-only investigation — authoritative asset backlog)

**Created:** 2026-07-26 Sydney · **Author:** Claude Code — S4 (read-only investigation; authoring only)
**Status:** `draft — issued for PK` · **NO mutation** (no asset sourced, uploaded, promoted, or changed).
**Base:** `HEAD == ae6a0e922090f6ded997fc8db8d9b8b7553609c1`, branch `main`, ahead 2 / behind 0 (the two
ahead commits are other lanes' docs — not this read-only lane's; not pushed). Stale-ref gate run.
**Evidence:** `db-rls-auditor` coverage pull (live `mbkmaxqhsohbtwsqolns`, 2026-07-26) + repo/registers +
the cc-0041/cc-0042/cc-0043 AGP infra + `m.analyze_asset_gap` governed verdicts. All read-only.

> **⚠ 2026-07-28 REFRESH — see §0 before reading anything below as current.** This file was never
> committed to git (confirmed untracked). Session 5 (Asset Sufficiency) re-verified the register live
> on 2026-07-28 and found **two of the seven headlines below are now stale** (P0-1 closed, P1-1/P1-3
> closed) plus a genuine git↔DB parity gap in the writer packet. §0 is the current authoritative
> status; §§1–6 are preserved unmodified as the 2026-07-26 historical record (Recording-compression
> convention — no historical rewrite).

> **Operating rule (governs every severity call):** the objective is **NOT** maximum volume — it is
> **"every active template has a sufficient governed, licence-safe, rotation-capable asset pool."** A
> thin-but-rendering pool is a **P1 quality/rotation** gap, not a P0 blocker. P0 is reserved for a
> resolver **fail-closed** or forced excessive repetition.

---

## 0. 2026-07-28 refresh (Session 5 — Asset Sufficiency)

**Author:** Claude Code (orchestrator, read-only) · **Evidence:** `db-rls-auditor` live pull,
project `mbkmaxqhsohbtwsqolns`, 2026-07-28 + git history across `main` and both parked worktrees.
**No mutation.** This section supersedes §§1–2's headline claims where noted; §§1–6 below are left
as the unmodified 2026-07-26 historical record.

### 0.1 First outcome 1 — the authoritative analyzer/writer packet

The two "parked cc-0043/cc-0044 analyzer/writer worktrees" named in the carry are:

- `C:\Users\parve\ice-wt-cc0043-writer` (branch `ice-wt-cc0043-writer` @ `89d57aa`, 2026-07-19)
- `C:\Users\parve\_wt\ce-cc0044-cpc-writer` (branch `ice-wt-cc0044-cpc-writer` @ `7c66f80`, 2026-07-20)

**They are confirmed the SAME packet, not competing designs.** Both commits carry the identical
message ("park(cc-0043): PREPARED AT PK APPLY GATE — reviewed asset-gap analyzer/writer packet; NOT
applied, NOT merged, no production writer enabled") and both add the byte-identical file
`supabase/migrations/20260719210000_cc0043_asset_gap_analyzer_writer_v1.sql` (`git diff
ice-wt-cc0043-writer ice-wt-cc0044-cpc-writer -- '*cc0043*.sql'` = empty). `ice-wt-cc0044-cpc-writer`
is the later of the two (rebased cleanly onto `origin/main @87ca54d` per session memory) and is the
copy the live database's own migration-ledger provenance comment cites as authoritative — **so
`ice-wt-cc0044-cpc-writer @ 7c66f80` is the authoritative copy**, `ice-wt-cc0043-writer @ 89d57aa` is
a redundant earlier duplicate of the same content.

**A real git↔DB parity gap exists (`db-rls-auditor` CONFIRMED, verdict `concerns`), distinct from the
worktree duplication:** the cc-0043 writer (`public.run_asset_gap_analysis` /
`public.preview_asset_gap_analysis`, SECURITY DEFINER, service_role-only) has been live in production
since 2026-07-20 — applied via `execute_sql` and ledger-backfilled into
`supabase_migrations.schema_migrations` — but **the migration file itself was never committed to
`main`**. It exists only on the two never-merged worktree branches above. The live ledger's own
provenance comment points at `ice-wt-cc0044-cpc-writer @ 7c66f80` as the "authoritative body" — a
commit whose own message says NOT applied/NOT merged. cc-0041 (the underlying 4-table schema) is
**not** a gap in the same way — its DDL is committed on `main`, just under
`docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` rather than `supabase/migrations/`, a path
inconsistency only. The downstream migrations that `CREATE OR REPLACE` the cc-0043 functions
(cc-0044 `20260720120000`, cc-0045 `20260720140000`, cc-0046 `20260721100000`/`110000`/`120000`) ARE
all committed on `main` — so `main` currently contains modifications to a base object it does not
itself define. **This is the same failure class as the F-DEL-1 Git-DB parity gap reconciled in
`846514d`** — recording-only, no DB change, migration NOT re-applied. Recommended next step (own
future PK-gated T2 docs lane, not performed here): commit the cc-0043 DDL from
`ice-wt-cc0044-cpc-writer @ 7c66f80` onto `main` under its existing filename/identity (the content is
unchanged from what's already live — this is recording live truth, not a new apply), the same pattern
as the F-DEL-1 reconciliation.

**Worktree disposition:** keep both worktrees until the above reconciliation lands — they are
currently the *only* surviving source for the live cc-0043 function bodies. Once the migration file is
committed to `main`, both parked worktrees/branches become fully redundant and are safe to remove
(pending PK confirmation; not deleted in this read-only session).

### 0.2 First outcome 2 — current demand-ranked shortage register (live-reverified 2026-07-28)

**P0-1 (PP × YouTube × `youtube_thumbnail`) is CLOSED, not open.** The register's §1 headline #1 and
§2 row `P0-1` claimed this was "the only live fail-closed gap." Re-probed live today:
`select_template('property-pulse','youtube','youtube_thumbnail',NULL,seed)` returns `status=ok`,
selecting the client's own governed background `bg_pp_au_suburb_aerial_grid` (`platform_scope` was
widened to include `youtube`, `updated_at=2026-07-26 07:15:01+00` — someone closed this the same day
the register was drafted, evidence pull order uncertain but the gap does not reproduce today).
`analyze_asset_gap` for the same input now returns `asset_gap_detected=false`. **No corresponding row
ever existed in `m.asset_gap_suggestion`** — the register's P0-1 was sourced from a direct
`analyze_asset_gap` probe, not the persisted ledger; worth naming the evidence path explicitly in any
future register to avoid conflating the two.

**P1-1 (Invegent) and P1-3 (CFW) rotation gaps are CLOSED, not open.** cc-0073 D2 (applied
2026-07-27, PK visual PASS granted — `docs/briefs/results/cc-0073-d2-background-pool-promotion-result.md`)
promoted 3 fenced shared backgrounds and widened 2 more. Re-verified live today: **Invegent = 4
governed backgrounds** (0 own + 4 reachable shared: abstract_wall_sky, datacentre_server,
soft_blue_gradient, soft_grey_bokeh) and **CFW = 4 governed backgrounds** (1 own navy-waves + 3
reachable shared: datacentre_server, landscaped_garden, soft_grey_bokeh) — both across
facebook/instagram/linkedin **and youtube**. This meets the ≥4-per-platform floor PK ratified at the
cc-0073 D0 gate (stricter than this register's own proposed floor of 3). Three fenced shared
backgrounds remain unpromoted (neutral_concrete, glass_office_tower, contemporary_home) — **not** a
shortage; sufficiency is already met, promoting more would be maximising inventory, which is out of
scope per this session's boundary.

**Current `m.asset_gap_suggestion` ledger — unchanged since 2026-07-20 (8 rows, 4 open / 4 resolved,
nothing newer than 2026-07-25).** The 4 open rows, reclassified against the six-status capability
contract's routing taxonomy ([[capability-demand-architecture]] — Asset Gap owns missing-ASSET cells
only):

| Client | Platform | Format | subject_kind / failure_state | primary_route | Capability-contract bucket | Asset task? |
|---|---|---|---|---|---|---|
| CFW | linkedin | carousel | assignment / unassigned | governance_gap | **Template missing** (no call site ever passes `carousel` to the governed spine — cc-0073 §G/F4) | **No — excluded by session boundary** |
| Invegent | linkedin | carousel | assignment / unassigned | governance_gap | **Template missing** (same) | **No** |
| CFW | facebook | carousel | assignment / unassigned | governance_gap | **Template missing** (same) | **No** |
| PP | youtube | video_short_stat | platform_config / misconfigured | template_gap | **Template missing / Pipeline misconfig** (not an asset shortage — a suitability-row config issue, handed to cc-0051) | **No** |

**Net result: the current genuine-asset-shortage backlog is EMPTY.** Every open ledger row is a
Template-missing/misconfiguration cell that this session's boundary explicitly excludes from asset
tasking ("Do not create asset tasks for Template missing, Pipeline missing, Governance unproven or
Publisher path missing cells"), and the two real background-supply gaps this register carried (P0-1,
P1-1/P1-3) are now closed. This is a **sufficiency** finding, not a gap in coverage: PP (22/18/18/5)
and NDIS (21 on every platform) were already healthy; Invegent and CFW are now at the ratified floor.

**Correction — P1-2/P1-4 (Invegent + CFW brand colours) are ALSO already CLOSED**, per session memory
`ice-asset-gap-register-v1` (2026-07-26T07:59Z, predates this register file's own P0-1 text — the two
apparently drifted apart across parallel sessions): `#1B3A5C/#05ADDA` (Invegent) and `#233141/#00BCE4`
(CFW) filled into `c.client_brand_profile.brand_colour_{primary,secondary}` same-day, chain-clean,
apply live-proven. **Not independently re-verified live in this session** — carried from memory, flag
for live re-check before treating as final.

**Carried forward unchanged (not re-verified live this session — still accurate per last known state,
each already its own separate future PK-gated lane, none actioned here):**

| # | Item | Status | Next gate |
|---|---|---|---|
| P0-2/P0-3 | Governed video single point (1 template) + ungoverned legacy volume (~89% of PP video) | OPEN — template/governance problem, not asset-sourcing | separate video governance lane |
| P1-2/P1-4 | Invegent + CFW brand colours | **⚠ Also CLOSED 2026-07-26** — see correction above | none — closed |
| P1-5 | NDIS authoritative logo — fenced, not promoted | OPEN — promotion only, already sourced | operator/PK promotion gate |
| P1-6 | PP YouTube-thumbnail foreground/subject image (optional role) | Rides the now-closed P0-1 background fix; foreground role itself unconfirmed live this session | image agents, low priority |
| P2-1 | Music — 1 selectable track globally, 8 fenced | OPEN — promotion gate | music lane + PK |
| P2-2/2-3/2-4 | Avatar/voice depth (CFW/Invegent = 0 avatars, 0 voice; PP/NDIS single-character) | OPEN — onboarding, not asset-sourcing | S8 onboarding contract |
| P2-5 | PP video B-roll (2 fenced, Video B-roll Intake v1 unblocked per carry) | OPEN — **requires its own Gate-1** per this session's explicit boundary; not opened here | separate Gate-1 (video B-roll lane) |

**Recommended priority order for the next PK-gated outcome** (per the session's completion rule —
"reopen Asset Sufficiency for the highest-priority intake or promotion outcome"), ranked by
leverage-to-cost now that the true P0s are closed:
1. **P1-5 NDIS logo promotion** — cheapest (a promotion of already-sourced, already-fenced material, not new sourcing).
2. **P2-1 Music promotion** — same shape, 8 already-fenced CC0 tracks awaiting a selectability decision.
3. **P2-5 Video B-roll Intake v1 Gate-1** — unblocked infra, but explicitly out of this session's scope; needs its own brief.
4. **P0-2/P0-3 Governed video breadth** — highest value, but a governance/template lane, not asset intake — needs its own Gate-1, explicitly out of this session's boundary (do not redesign `resolve_slot_assets`).

(P1-2/P1-4 brand-colour fill dropped from this ranking — already closed 2026-07-26, see correction above.)

---

## 1. Executive summary

**The system renders today for all four brands at the image_quote entry point — but that success masks
thin brand-specific pools.** The governed read-path (`m.analyze_asset_gap`) returns **no gap** for every
brand × image_quote combo, because 4 image_quote families need only a logo (no background) and 2
shared global backgrounds backstop the rest. Only **one** hard, fail-closed gap exists live.

**Seven headlines (⚠ #1, #3, #4 CLOSED as of 2026-07-28 — see §0.2 before acting on any of these):**
1. ~~**P0 — the only live fail-closed gap:**~~ **CLOSED 2026-07-28.** PP × YouTube × `youtube_thumbnail` — `select_template`
   fails closed on a `static_background` subject (`analyze_asset_gap` = `asset_gap` / `drainable`). The
   thumbnail family needs a governed background suited to that placement; none resolves.
2. **P0 — governed video is a single point, no rotation:** exactly **1** governed video candidate
   (PP `video_short_stat` on template `c11bb8ab`). The 6 fenced generic video templates are
   **silent + background-free** (0-audio-track intake) — **not** drop-in governed candidates; writing
   candidacy rows would record a false capability. ~89% of PP video runs the legacy ungoverned path.
3. ~~**P1 — Invegent is the thinnest brand:**~~ **Background rotation CLOSED 2026-07-28 (now 4).** **0 governed backgrounds**, 1 logo, 0 avatars, no voice,
   no brand colours. It renders image_quote **only** via generic no-background templates + the 2 shared
   backgrounds → **zero brand-specific imagery + severe rotation weakness** (2-asset shared pool). Identity depth (logo/avatar/voice/colours) unchanged.
4. ~~**P1 — CFW is nearly as thin:**~~ **Background rotation CLOSED 2026-07-28 (now 4).** 1 background, 1 logo, 0 avatars, no voice, no colours. Identity depth unchanged.
5. **P1 — identity depth:** NDIS has 21 governed backgrounds (strong) but only **1 governed logo**
   (the authoritative logo is still fenced — carry). PP is the only fully-equipped brand
   (22 backgrounds, 8 logos, voice, avatar, colours).
6. **P1/P0 — cross-brand rotation fragility:** **14 of 18** selectable templates require a governed
   background, yet only **2** shared backgrounds are eligible cross-brand. Brands without their own
   backgrounds (Invegent 0, CFW 1) rely on that 2-asset pool → repetition risk.
7. **P2 — depth gaps:** **1** selectable music track globally (8 fenced); avatars are single-character
   for PP/NDIS and absent for CFW/Invegent; no governed video B-roll pool (PP has 2 fenced broll bgs).

**Coverage snapshot (governed = live + approved):**

| Brand | Gov. backgrounds | Gov. logos | Avatars (active) | Voice | Brand colours | Standing |
|---|---|---|---|---|---|---|
| Property Pulse | **22** | 8 | 1 | ✅ | primary+secondary | strong (1 P0: yt thumbnail) |
| NDIS Yarns | **21** | **1** | 1 | ✅ | primary+secondary | strong bg, thin identity |
| Care For Welfare | **1** | 1 | 0 | ❌ | none | thin |
| Invegent | **0** | 1 | 0 | ❌ | none | thinnest |

---

## 2. The register

Columns: severity · brand · platform/format · template family · asset role · required spec · **gov. count** ·
min pool · target pool · operational status · gap qty · proposed method · evidence · owner · next gate.
Pool-sizing standard proposed in §4 (PK ratifies). "Gov. count" = live + approved governed assets.

### P0 — production blockers / fail-closed / no-rotation-on-active-format

| # | Brand | Platform/Format | Family | Asset role | Req. spec | Gov. | Min | Target | Status | Gap | Method | Owner | Next gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P0-1 | PP | youtube / youtube_thumbnail | generic.youtube.thumbnail_16x9 | **background** | 16:9, text-safe, YT-thumbnail-suitable | 0 fit | 2 | 4 | **⚠ CLOSED as of 2026-07-28 — see §0.2.** (was FAIL_CLOSED at authoring; `platform_scope` widened 2026-07-26, now resolves `ok`) | 0 | — | — | closed, no gate needed |
| P0-2 | PP | (all) / video_short_stat + video breadth | governed video (`c11bb8ab` only) | template + background/broll | 9:16 governed video candidate(s) w/ Logo+VoiceAudio+MusicBed elements | 1 template | 2 | 3–4 | **SINGLE POINT** (no rotation; 6 fenced generics are silent/bg-free, not drop-in) | ≥1 capable template | provider-side add elements OR per-template mod-map (H2 routes, see video memo) | S3 (video lane) | separate video Gate-1 (NOT an asset-only intake) |
| P0-3 | PP | facebook+instagram+linkedin / video (legacy) | `video_short_kinetic`/`_voice`/`_stat_voice` | governed builder + assets | governed candidacy for the 89% legacy volume | 0 governed | — | — | **UNGOVERNED VOLUME** (renders in code, no `select_template`/`resolve_slot_assets`) | policy, not asset | governance decision (route legacy → governed) — NOT closable by sourcing | S3 + PK | video governance lane (out of asset-register scope; flagged) |

### P1 — cross-brand quality / rotation / identity

| # | Brand | Platform/Format | Family | Asset role | Req. spec | Gov. | Min | Target | Status | Gap | Method | Owner | Next gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1-1 | **Invegent** | all static / image_quote+story+carousel | generic (bg-required families) | **background** | brand-fit static bg, text-safe, per platform aspect | **⚠ CLOSED as of 2026-07-28 — see §0.2.** (cc-0073 D2: now 4 governed via shared promotion, fb/ig/li/yt) | 3 | 8 | MET (≥4 floor ratified at cc-0073 D0) | 0 | — | — | closed, no gate needed |
| P1-2 | Invegent | identity | — | brand colours + logo variants | primary/secondary hex; logo variants for placements | 1 logo, 0 colours | — | — | THIN IDENTITY (no colours → default fallbacks) | colours + variants | brand-profile data (colours) + logo-variant intake | operator + image agents | Gate-1 (data) |
| P1-3 | **CFW** | all static / image_quote+story+carousel | generic (bg-required) | **background** | brand-fit static bg, text-safe | **⚠ CLOSED as of 2026-07-28 — see §0.2.** (cc-0073 D2: now 4 governed — 1 own + 3 shared, fb/ig/li/yt) | 3 | 8 | MET (≥4 floor ratified at cc-0073 D0) | 0 | — | — | closed, no gate needed |
| P1-4 | CFW | identity | — | brand colours + logo variants | primary/secondary hex; variants | 1 logo, 0 colours | — | — | THIN IDENTITY | colours + variants | brand-profile data + logo-variant intake | operator + image agents | Gate-1 (data) |
| P1-5 | **NDIS** | identity | — | **authoritative logo** + variants | governed primary logo (authoritative), variants | 1 (logo_icon; authoritative fenced) | 1 primary | 1+variants | THIN (backgrounds strong at 21) | promote authoritative logo | promote existing fenced authoritative logo (carry from ndis-yarns-readiness) | operator/PK | Gate-1 (promotion) |
| P1-6 | PP | youtube / youtube_thumbnail | thumbnail_16x9 | **foreground image** (subject) | 16:9 subject/product image | 0 | 1 | 3 | thumbnail also needs a foreground image role (optional) | ≥1 | image-harvester | image agents | rides P0-1 batch |

### P2 — future capability / depth

| # | Brand | Class | Asset role | Req. spec | Gov. | Min | Target | Status | Method | Owner | Next gate |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P2-1 | all | music/audio | governed music tracks | licence-safe (CC0/owned), per-mood | **1 selectable** (8 fenced) | 3 | 8–10 | **SINGLE TRACK** globally → all voiced/music video shares one bed | promote fenced CC0 tracks / source more | music lane + PK | Gate-1 (music promotion) |
| P2-2 | PP, NDIS | avatar/character | ≥2 active hosts (multi-character) | governed brand_avatar, is_default_host designated | 1 active each | 1 | 2+ | SINGLE CHARACTER (rotation blocked until Step B/C-2 land + 2nd activated) | Step B (deployed) → C-2 guard → onboard 2nd | AGP lane (S4/S8) | gated by C-2 + step C |
| P2-3 | CFW, Invegent | avatar/character | brand host | governed brand_avatar + voice | 0 avatars, 0 voice | 1 | 1+ | NO VIDEO-HOST IDENTITY (cannot do avatar/voiced video) | S8 onboarding contract (`7c72874c`) on a governed path | S8 | onboarding Gate-1 |
| P2-4 | CFW, Invegent | voice | brand voice | ElevenLabs voice_id in `c.client_voice_config` | 0 | 1 | 1 | NO VOICE (blocks voiced video for these brands) | voice config (data) | operator | Gate-1 (data) |
| P2-5 | PP | video B-roll | footage backgrounds | licence-safe brand-fit B-roll clips | 2 fenced | 3 | 8 | FENCED/THIN (PP video B-roll decision held) | footage sourcing (held decision) | S3/PK | video B-roll lane (held) |
| P2-6 | all | template-governed elements | per-template governed slots | (e.g. governed logo required on the 2 required-logo families) | logos present | — | — | OK for logo-required families (all brands ≥1 logo) | n/a — covered | — | — |

---

## 3. First recommended intake batch (the P0/early-P1 starting set)

Ordered by the dispatch priority; each is a **fenced-first, PK-gated** intake — nothing promoted here.

1. **PP YouTube-thumbnail background pack (P0-1 + P1-6).** The only live fail-closed gap. Source 3–4
   licence-safe 16:9 text-safe backgrounds + 1–3 subject foregrounds via `image-harvester` → fenced →
   `image-reviewer` → PK visual → promote. **Closes the one resolver fail_closed today.** Smallest,
   highest-value, unblocks PP YouTube.
2. **Invegent background starter pool (P1-1).** 3–4 brand-fit static backgrounds so Invegent stops
   depending 100% on the 2 shared generics → gives real rotation + brand identity. Pair with the
   Invegent brand-colour data fill (P1-2) so rendered cards aren't on default fallbacks.
3. **CFW background starter pool (P1-3) + brand-colour data (P1-4).** Same shape as Invegent, one step
   less urgent (CFW has 1 own background).
4. **NDIS authoritative-logo promotion (P1-5).** A promotion, not a sourcing — the authoritative logo
   is already fenced; promote it so NDIS identity is governed (backgrounds already strong).

**Deliberately NOT in the first batch** (each its own lane/gate): governed video breadth (P0-2 — a
video-governance/template lane, not an asset intake; the fenced generics are silent/incapable), legacy
video governance (P0-3 — a policy decision), music depth (P2-1), avatar/voice onboarding for CFW/Invegent
(P2-3/4 — S8 onboarding contract), PP B-roll (P2-5 — held decision).

---

## 4. Proposed pool-sizing standard (PK ratifies; drives min/target above)

| Asset class | Minimum (rotation floor) | Target (healthy rotation) | Rationale |
|---|---|---|---|
| Static background (per brand, per major aspect) | 3 | 8–12 | avoid visible repetition across a week's slots |
| Logo (per brand) | 1 primary | 1 primary + placement variants | one governed primary is functional; variants improve fit |
| Brand colours | primary + secondary | + accent | avoids default-fallback rendering |
| Avatar/host (per brand) | 1 designated | 2+ (multi-character) | 1 renders; 2+ needs C-2 + step C first |
| Voice (per brand, if voiced video) | 1 | 1 | one governed voice is sufficient |
| Music track | 3 | 8–10 | one bed for all output is severe repetition |
| Video B-roll (per brand) | 3 | 8 | rotation for footage-bg video |

These are proposed floors, not volume targets — consistent with the operating rule.

---

## 5. Evidence, caveats, and what this register does NOT claim

**Provenance (all live/read-only 2026-07-26, project `mbkmaxqhsohbtwsqolns`):** the 18 selectable
`creative_template_variant_candidate` rows + their dynamic `creative_provider_template_field` roles; the
per-brand `client_brand_asset` governed counts (governed = `is_active AND asset_meta->>'approved'='true'`,
`usage` from `asset_meta`); `shared_creative_asset` (2 eligible / 6 fenced); `brand_avatar`;
`m.music_track` (1 selectable); `c.client_voice_config`; `c.client_brand_profile` colours;
`m.analyze_asset_gap(client_slug, platform, format, seed)` verdicts. Cross-checked against the
cc-0041/42/43 AGP infra and the governed-video memo.

**Caveats the register carries (do not mis-read):**
- **Selectability has no boolean flag** — `variant_candidate.fit_status='strong_candidate'` +
  `provider_template.status` are the signals; `creative_template_family.status='draft'` on 16/17
  families does **not** gate selection.
- **image_quote "no gap" ≠ well-supplied** — the governed verdict is OK for every brand because
  no-background families + 2 shared backgrounds mask thin brand pools. The register scores those as
  P1 quality gaps deliberately (operating rule), not as "covered".
- **Governed video breadth is a template/governance problem, not an asset-sourcing one** (P0-2/P0-3);
  sourcing backgrounds will not make the 6 fenced silent templates usable.
- **Audio is never measured** anywhere in ICE — any "video succeeded" row is not proof of audio; a music
  or voice pool cannot be validated by the render pipeline (out-of-band check required).
- **Music is global, not per-brand** in `m.music_track`; per-brand enablement would come from
  `c.client_music_profile` (not evaluated).
- The one residual not closable read-only: exact per-asset **licence/provenance** fitness for a *new*
  placement is asserted at intake by the image agents, not derivable from current metadata.

**Non-claims:** this register sources/promotes/mutates nothing; it does not approve any intake; it does
not allocate a `cc-` ID or claim a register version; severities are proposals for PK. Every intake it
names is a future fenced-first, PK-gated lane. The parked security remediation brief (`556224f3`) is
untouched and remains parked.

## 6. Stop condition

This session stops at delivery of this register (path + sha256 to the control tower). It is the
authoritative asset backlog; each named intake is a separate future PK-gated lane. No mutation authority
held or conveyed.
