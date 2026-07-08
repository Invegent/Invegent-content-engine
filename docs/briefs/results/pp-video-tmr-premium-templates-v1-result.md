# Result — PP Video TMR Premium Templates v1 (design + voiceover proven)

**Created:** 2026-07-08 Sydney · **Tier:** T1 (design/preview — no governed wiring, no production change, no publish) · **Sprint:** Creatomate Video TMR, Phase 2 (template build)
**Status:** ✅ 5 premium templates built + rendered; voiceover proven end-to-end. Design phase — NOT yet governed/wired.

## What this is

Property Pulse premium video templates, built in the **Creatomate premium style** learned from three example templates PK supplied (`C:\Users\parve\Downloads\Creatomate Video template examples`). Supersedes the earlier flat-background / text-only attempts (v1–v2, retained as history). The design model that PK signed off:

- **Real image background** (the existing governed 17-image PP pool; b-roll video is a later parallel harvest lane) with a **Ken-Burns zoom**.
- **Dark scrim** for legibility over the photo.
- **Animated text on bars** — `text-slide` / `text-fly` with `background_effect: scaling-clip` (the exact patterns from the examples), not bare text.
- **Relative units** (`vmin` / `%`) → flexible across any aspect ratio.
- **Governed logo** + a **Music/Voiceover audio slot**.

## The 5 templates (source JSON committed; renders are regenerable outputs, not committed)

| Template | File (`_harness/video_tmr/`) | Named dynamic fields |
|---|---|---|
| Market Stat Reveal | `video_premium_market_v4.json` (+ `_v5_vo.json` = VO variant) | Background, StatValue, StatLabel, ContextLine, CtaText, Logo |
| 3-Point Tips / Listicle | `video_premium_tips_v1.json` | Background, Title, Point1-3, CtaText, Logo |
| Multi-Stat Data Card | `video_premium_multistat_v1.json` | Background, Title, Stat1-3 Value/Label, CtaText, Logo |
| Suburb Spotlight (photo-forward) | `video_premium_suburb_v1.json` | Background, SuburbName, Stat1-2 Value/Label, CtaText, Logo |
| Sales Result / SOLD (photo-forward) | `video_premium_sales_v1.json` | Background, StampText, Headline, StatValue, StatLabel, CtaText, Logo |

Earlier iterations retained as history: `video_short_stat_template_v1_source.json`, `video_short_stat_preview.json`, `video_short_stat_preview_v2_premium.json`, `video_premium_market_v3.json`.

## Voiceover — proven end-to-end (all 5)

Pipeline (fully automated from the local PowerShell): **ElevenLabs TTS** (PP host voice `YCxeyFA0G7yTk6Wuv2oq` — the active PP `brand_avatar` "Buyer's Agent (Realistic)") → host the mp3 → inject a Creatomate `audio` element → render. A tailored VO script per template, matched to its on-screen content. All 5 rendered narrated and were viewed by PK.

**Audio model proven:** voiceover ✅ · music = same mechanism (a 2nd `audio` element ~16% volume) · combo = both, Creatomate mixes. Music/combo pending the parallel music-harvest lane.

## Render mechanism (internal preview)

Rendered via `POST https://api.creatomate.com/v2/renders` with the raw composition as body (the proven video-worker pattern; `/v2` takes the composition at top level, `/v1` wants it `{source:...}`-wrapped). Keys (Creatomate + ElevenLabs) read from local Downloads text files into variables — never in transcript. Renders + VO audio are internal previews on ephemeral hosts (Creatomate/backblaze render URLs; catbox VO audio).

## Carries / next (NOT done here)

- **Governed audio bucket:** VO audio currently on a temp public host (catbox) for previews → production moves it to a **governed Supabase bucket** (service-role write — a governed step).
- **Designate the PP host voice:** `is_default_host` is currently false on all PP `brand_avatar` rows; formally designate one.
- **Music lane** (parallel session) + **b-roll harvest lane** (parallel) feed the Background(b-roll) + Music slots; advisor to choose image-vs-b-roll later.
- **Multi-image switching** (cycle 2-3 backgrounds per video, like example 3) — a template enhancement once pools exist.
- **Governed wiring (the actual TMR spine):** once PK locks the template looks → save each as a Creatomate provider template → pin `provider_template_id` → register `c.creative_provider_template` (`output_type='video'`) → V2 governed `video-worker` branch → first governed render proof to YouTube. **The dark V3/V4/V5 declarative + governance-row authoring is already done + reviewed** (creative-graph-auditor PASS + db-rls-auditor PASS), held in worktree `video-tmr-phase2-dark` pending the locked template.

## Boundaries honoured

Design/preview only. No governed wiring, no `provider_template_id` save, no provider-template registration, no dark-migration apply, no worker/render-path change, no publish, no production change. No new DB writes. Renders are internal previews.
