# Archive — Retirement Batch v1 (2026-07-31)

**Authority:** PK rulings on `docs/briefs/branch-packet-retirement-batch-v1.md` (E1/E2 approved 2026-07-31).
**Preservation rule:** every file in this directory is stored **byte-exact** (sha256 below matches the
pre-retirement record in the batch doc) — provenance banners live HERE, not stamped into the files, so
the hashes remain verifiable forever. Deviation from the batch doc's §2 sketch, noted deliberately:
one consolidated archive directory instead of two locations.

| File | Provenance (branch · commit · authored) | sha256 | PK ruling / status |
|---|---|---|---|
| `cc-0090-read-model-apply-packet-PROPOSED-v1.md` | CE `claude/creatomate-global-progress-r0vbuf` · `b399f5c` · 2026-07-30 overnight | `8504abd648295454c32fe7be921307e6e82a7da84ecab49d329e086482d09166` | **SUPERSEDED** by the landed cc-0090 lane (v6.87: brief + result + live migration `20260731001557`). Historical draft only; PK never reviewed it; authorises nothing. |
| `ndis-video-short-stat-youtube-suitability-apply-packet-PROPOSED-v1.md` | CE `claude/creatomate-global-progress-r0vbuf` · `73d82bf` · 2026-07-30 overnight | `1dcde08ed42cdf998a12a4c4ec30734c555e10fc2840513b652b5e59680d4e80` | **UNADOPTED HISTORICAL INPUT (PK ruling E1).** The proposed one-row `video_stat_reveal_9x16_v2 × youtube` suitability insert is NOT adopted. YouTube reachability remains governed by the S9 posture (v6.85, 0% by design) and the capability-expansion Slice C/B2 gates — any future lane re-derives from live evidence at its own Gate 1; this draft is reference history only. |
| `template-mix-repetition-controls-gate1-brief-v1.md` | dashboard `claude/creatomate-global-progress-r0vbuf` · `2f8d5e5` · 2026-07-30 overnight | `97cfa1f7bb12b6e6091591eadc376febb016b9ba32fa04443f7c717ab3ee8762` | **PK-PAUSED RESEARCH (PK ruling E2).** Portfolio-mix/repetition controls stay PK-paused pending a governed CE mechanism (v6.78 carry, restated v6.88). Not promoted, not implemented; archived for reference only. |
| `s9-cta-bounded-regen-index-wiring-wip.patch` | CE `lane/s9-cta-text-bounded-regen-v2` · `b7e371e` (salvaged from the Jul-28 recovery snapshot) | `20d72b0cbdc9a5e10d8146d43338af57f0fd00738f85129443d8dec66c305cb8` | ⛔ **NEVER APPLY THIS PATCH DIRECTLY.** Historical WIP of the old `ai-worker/index.ts` integration, explicitly EXCLUDED by the v6.91 minimal landing packet because it predates and would silently drop the since-landed ai-worker v2.25.0 S9 capability-enforcement rewrite. Archived as history only; any future integration is fresh work per `docs/briefs/results/s9-cta-text-bounds-minimal-landing-packet-v1.md`. |

Not archived (recorded by hash only, per the batch doc): `20260725130000_w1_planner_dark_schedule_format_assignment_v1.sql`
(`3375905f47f0269e49d5cb7d2301192a8abee86cccae9ad57f04291150f1d347`, branch `lane/w1-planner-dark-v2` · `391f47f`) —
design formally superseded by PK ruling v6.89; its record and banner-stamped governing brief are on `main`.

Retired source refs (deleted only AFTER this commit landed on `main`; tip SHAs recorded in the batch doc's
execution record): CE `claude/creatomate-global-progress-r0vbuf` (`73d82bf`) · CE `lane/w1-planner-dark-v2`
(`391f47f`) · CE `lane/s9-cta-text-bounded-regen-v2` (`b7e371e`) · dashboard
`claude/creatomate-global-progress-r0vbuf` (`2f8d5e5`) · dashboard `s2-gcp-slice3` (merged, ref-only cleanup).
