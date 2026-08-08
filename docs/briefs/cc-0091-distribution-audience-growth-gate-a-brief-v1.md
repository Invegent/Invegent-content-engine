# Brief cc-0091 — distribution-audience-growth-gate-a

**Created:** 2026-08-08 Sydney
**Author:** chat
**Executor:** Claude Code
**Status:** **SUPERSEDED — do not execute**
**Superseded by:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v2.md` (2026-08-08)
**Result file:** `docs/briefs/results/cc-0091-distribution-audience-growth-gate-a.md` (created on completion)

> **⚠ SUPERSEDED.** v1 treated A1 as investigative. A1 is now **determined** — see
> `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md`. Retained unaltered as the
> audit record of the pre-determination scope; execute **v2** instead.

> **Lane:** Distribution & Audience Growth — **Gate A (foundation)**.
> **Lane classification (CCF-02):** PRODUCT_PROOF. **Tier:** T2 for the registry/mix
> correction and evidence capture; **T3** for any change that alters live publishing
> behaviour for a brand. Gate B (30-day governed experiment) and Gate C (Facebook
> activation) are **separate briefs** and are NOT authorised here.

---

## Task

Make Instagram a **governed discovery target** in ICE rather than a feed that receives
cross-posted static output. Gate A delivers the foundation only: correct the format
registry defect that removed every short-video format from the Instagram mix, restore a
deliberate discovery share, make capability shortfalls **surface as gaps instead of
silently degrading to another static post**, and start capturing the distribution
evidence (non-follower reach, retention, shares, profile visits, follows) that Gate B's
experiment will read.

The framing correction that motivates this brief: **674 successfully published posts is
an operational metric, not a distribution outcome.** Gate A exists so ICE can begin
answering *published → shown to how many new people → watched → shared → profile visit →
follow → which content caused it*.

## Source context

**The Instagram defect (primary finding, evidenced 2026-08-08):**

- `t."5.3_content_format".platform_support` — Instagram support flags are wrong for the
  Creatomate short-video family. Measured values:

  | ice_format_key | render_engine | `instagram` | `youtube` |
  |---|---|---|---|
  | `video_short_kinetic` | creatomate | **false** | true |
  | `video_short_stat` | creatomate | **false** | true |
  | `video_short_kinetic_voice` | creatomate+elevenlabs | **null** | true |
  | `video_short_stat_voice` | creatomate+elevenlabs | **null** | true |
  | `video_short_avatar` | heygen | true | true |
  | `animated_data` / `animated_text_reveal` | creatomate | **false** | null |
  | `carousel` / `image_quote` | creatomate | true | — |

  Same render engine, same output, marked supported on YouTube and unsupported on
  Instagram. `video_short_avatar` is the **only** IG-eligible video format.

- `supabase/functions/instagram-publisher/index.ts:154-158` — `IG_VIDEO_FORMATS` already
  whitelists **all five** short-video formats for Instagram publishing, and
  `index.ts:328` sets `media_type = 'REELS'`. **The publisher can already do what the
  registry says it cannot.** This is a registry-vs-publisher divergence, the same class
  as the S7 guard/classifier divergence already on record.

- `t.platform_format_mix_default` (platform `instagram`) — on **2026-07-25**, cc-0079
  Slice-2 renormalised the mix `"vs platform_support (Fault A)"`. Current rows
  (`is_current = true`): **`carousel` 60% + `image_quote` 40% = 100% static.**
  The superseded 2026-04-22 mix carried **35% video** (`video_short_kinetic` 20%,
  `video_short_stat_voice` 15%) with the evidence note *"Reels get 2.25x reach of
  single-image posts"*. The renormaliser **rebalanced into static instead of raising a
  capability gap** — the exact silent-degradation anti-pattern.

**Observed consequence (measured):**

- Last `video_short_avatar` Instagram draft: **2026-06-15** (Property Pulse, NDIS Yarns);
  CFW 2026-07-06. Invegent has never had one.
- Last reel **published** to Instagram: **2026-06-19** (6 reels all-time,
  all `video_short_avatar`).
- Instagram published all-time by method: `single_image` 172 · `carousel` 22 ·
  legacy-null 22 · **`reel` 6**.
- Last 60 days published: Instagram 168 posts, **1 with a hashtag**, 13 with a video_url.
- Instagram reach tracks follower count (NDIS Yarns: 2 followers → reach 2).

**Architecture this must connect to:**

- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v3.md` — the
  demand-grid/capability-guard spine this correction must flow through.
- `docs/briefs/format-capability-indicator-v1-brief.md` +
  `docs/briefs/global-format-capability-pyramid-slice0-brief.md` — existing capability
  surfacing.
- Asset Gap lane (`docs/briefs/cc-0043-asset-gap-analyzer-write-lane-brief.md`) — the
  receiver for unmet capability requirements.
- `supabase/functions/ai-worker/index.ts:294-310` — precedent for a platform-support
  opt-in semantics fix (`s[platform] !== true`), including the identical failure shape.

**Out-of-lane but load-bearing:** the Facebook lane is blocked on Meta business
verification (app `Invegent Publisher` / `3267448306765213` is **Unpublished / In
Development**). That is **Gate C** and PK-owned. It does not block Gate A.

## Scope

**In scope:**

1. **A1 — Registry correction.** Establish the *correct* Instagram `platform_support`
   value for each short-video format, evidenced against what
   `instagram-publisher` can actually publish (`IG_VIDEO_FORMATS` + the `REELS`
   container path). Where ICE genuinely cannot produce an Instagram-shaped asset
   (e.g. aspect ratio, duration), record that as a **capability gap**, not as `false`.
2. **A2 — Mix restoration.** Propose a new `t.platform_format_mix_default` row set for
   `instagram` carrying a deliberate discovery (Reel) share, superseding the
   100%-static current rows, with evidence notes per row.
3. **A3 — No silent degradation.** Make the renormalisation path raise a surfaced
   capability gap (dashboard indicator + Asset Gap requirement) when a scheduled
   discovery format cannot be produced, instead of rebalancing into static.
4. **A4 — Instagram packaging.** Instagram-specific caption/hook shaping distinct from
   the Facebook body. Hashtags are included as **context/search metadata only** — they
   are explicitly NOT the deliverable and must not be presented as "Instagram solved".
5. **A5 — Distribution evidence.** Capture per published item: non-follower reach,
   follower reach, retention/watch signal, shares, saves, profile visits, follows
   gained. Schema + capture path only.

**Out of scope:**

- The 30-day governed experiment and any growth target — **Gate B**.
- Facebook app publish / business verification / Live transition — **Gate C, PK-owned**.
- Account distribution tactics (collaborations, community seeding, paid amplification).
- Any follower-buying, mass automated following/commenting, or synthetic engagement —
  permanently out of scope for this programme, not merely this gate.
- Per-brand growth playbooks (NDIS Yarns / Property Pulse / Invegent / CFW differentiation)
  beyond recording that they must differ.
- LinkedIn and YouTube behaviour changes — both are validated by real feedback and are
  not to be touched.
- HeyGen dependency remediation (legacy API sunset ~Oct 2026) — note as risk only.

## Allowed actions

- Read any repo file, register, brief, and the DB via `db-read.py` (R0 views) or
  read-only `execute_sql` for `m.*`/`c.*`/`t.*` inspection.
- Draft migration SQL for A1/A2 as **artifacts under `docs/briefs/artifacts/`**,
  named `NOT_APPLIED_*`, with a matching ROLLBACK artifact.
- Author code changes for A3/A4/A5 in an **isolated worktree** via `ef-builder`.
- Run hermetic/local tests in that worktree.
- Invoke `db-rls-auditor` for any DB-touching proposal and `branch-warden` before any commit.
- Run `ask_chatgpt_review` on the final packet, recording `reviewed_input_hash`.

## Forbidden actions

- **Do NOT apply any migration.** Production mutation is watch-gated to ~2026-08-11
  20:20 Sydney; every DB artifact stays `NOT_APPLIED_*` pending PK's gate.
- **Do NOT deploy any edge function.** Deploy is a PK hard stop.
- Do NOT publish the Meta app to Live, start/alter business verification, or change any
  Facebook/Instagram account or page setting.
- Do NOT change LinkedIn or YouTube format mix, publisher behaviour, or scheduling.
- Do NOT alter live `t.platform_format_mix_default` rows or `platform_support` values
  directly — proposals only.
- Do NOT increase publishing volume or cadence for any brand.
- Do NOT declare Instagram "fixed" on the basis of hashtags, or on the basis of a
  restored mix without published-Reel evidence.
- Do NOT mark any capability `proven`; proving is Gate B's job.
- Do NOT clean or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence).

## Success criteria

- A written, evidence-cited determination for **each** of the five short-video formats:
  Instagram-supported (with the publisher path named) **or** a capability gap (with the
  specific missing capability/asset named and handed to the Asset Gap lane). No format
  left as an unexplained `false`/`null`.
- `NOT_APPLIED_*` migration + ROLLBACK artifacts for A1 and A2, each byte-hashed, with
  the A2 mix rows carrying a per-row evidence note and summing to 100%.
- A3 demonstrates, in a test, that an unproducible scheduled discovery format yields a
  **surfaced gap** (dashboard indicator + Asset Gap requirement) and **not** a static
  substitution. A test proving the silent-degradation path is closed.
- A4 produces Instagram captions structurally distinct from the Facebook body, with the
  distinction stated and testable.
- A5 schema captures non-follower reach, retention, shares, saves, profile visits and
  follows-gained per published item, with the Graph API field mapping named per metric.
- `db-rls-auditor` verdict `pass`; `branch-warden` verdict `safe`; external review clean
  with `reviewed_input_hash` matching the frozen packet.
- Result doc records what Gate B must measure to call this proven.

## Stop condition

Report result per `docs/briefs/_template_result.md`, then stop. Do not apply, deploy, or
merge. Gate A ends at a PK-reviewable packet — Gate B opens only on PK's word.

---

## Notes

**Sequencing note for PK.** A1+A2 are small, high-leverage and reversible; A3 is the
architecturally important one (it is what stops this recurring on the next platform);
A4/A5 are prerequisites for Gate B being measurable. If the packet needs to be split for
gate throughput, A1+A2+A3 is the coherent first slice — A4/A5 can follow without
re-opening the registry question.

**Standing risk to record, not to fix here:** `video_short_avatar` is the only currently
IG-supported video format and it is HeyGen-rendered; the HeyGen legacy API sunsets
~Oct 2026. If A1 concludes the Creatomate formats genuinely cannot reach Instagram, ICE's
entire Instagram discovery surface has a single-vendor dependency with a clock on it.
That conclusion would itself be a PK escalation, not a Gate A outcome.

**Correction carried into this brief:** an earlier read of
`instagram-publisher/index.ts:341-342` ("No reel has published yet") is **stale** — six
reels published, most recently 2026-06-19. The source comment should be corrected as part
of A1 so the next reader is not misled.
