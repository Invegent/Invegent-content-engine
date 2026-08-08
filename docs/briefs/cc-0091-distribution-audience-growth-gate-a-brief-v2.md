# Brief cc-0091 — distribution-audience-growth-gate-a (v2)

**Created:** 2026-08-08 Sydney
**Author:** chat
**Executor:** Claude Code
**Status:** **SUPERSEDED — do not execute**
**Supersedes:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v1.md`
**Superseded by:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v3.md` (2026-08-08)

> **⚠ SUPERSEDED.** v2 kept A2a execution inside Gate A, which would have made Gate A the first
> behavioural rollout step. PK ruled 2026-08-08 that A2a execution moves to Gate B and Gate A makes
> zero live behaviour change. Retained unaltered as the audit record; execute **v3**.
**Result file:** `docs/briefs/results/cc-0091-distribution-audience-growth-gate-a.md` (on completion)

> **Lane:** Distribution & Audience Growth — **Gate A (foundation)**.
> **Lane classification (CCF-02):** PRODUCT_PROOF. **Tier:** T2 throughout — Gate A applies
> nothing. Gate B (proof publishes + 30-day experiment) and Gate C (Facebook activation) are
> separate briefs and are NOT authorised here.
>
> **v2 amendment basis:** `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md`
> (11 `ffprobe` artifact probes, 2026-08-08). **A1 is DETERMINED, not investigative.** v1's A1
> scope ("determine whether ICE can produce an Instagram-shaped asset") is answered and removed:
> it can, at 1080×1920 9:16 h264/AAC, and has since 2026-03-31.

---

## Task

Make Instagram a **governed discovery target** in ICE rather than a feed receiving cross-posted
static output. Gate A delivers foundation only: apply the determined registry correction, author
the governed mix restoration **without letting it depend on unproven transport**, make capability
shortfalls surface as explicit gaps instead of silently degrading to static, and capture the
distribution evidence Gate B will read.

**674 successfully published posts is an operational metric, not a distribution outcome.** Gate A
exists so ICE can begin answering *published → shown to how many new people → watched → shared →
profile visit → follow → which content caused it*.

## Accepted state (determined — do not re-investigate)

| Format | Verdict | Action in Gate A |
|---|---|---|
| `video_short_stat` | **SUPPORTED** (spec-proven, live-unproven) | registry `false` → `true` |
| `video_short_stat_voice` | **SUPPORTED** (spec-proven, live-unproven) | registry `null` → `true` |
| `video_short_kinetic_voice` | **SUPPORTED** (spec-proven, live-unproven) | registry `null` → `true` |
| `video_short_kinetic` | **UNPROVEN** — no audio stream (4/4 renders) | stays `false`, **cause recorded** |
| `video_short_avatar` | **SUPPORTED** — live-proven, 6 Reels, latest 2026-06-19 | unchanged; existing live proof |

`animated_data` / `animated_text_reveal` are **out of scope** — absent from `IG_VIDEO_FORMATS`, so
their `false` is consistent with the publisher.

## Source context

- `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md` — the A1 determination and
  full evidence index. **Primary input to this brief.**
- `t."5.3_content_format".platform_support` — the three wrong values.
- `t.platform_format_mix_default` — current IG rows `carousel` 60% + `image_quote` 40% = 100%
  static, effective 2026-07-25, `evidence_source = cc-0079-slice-2`
  (`"renormalised vs platform_support (Fault A)"`). Superseded 2026-04-22 rows carried 35% video.
- `supabase/functions/instagram-publisher/index.ts:154-158` (`IG_VIDEO_FORMATS`), `:328`
  (`media_type = 'REELS'`), `:341-342` (**stale comment** — "No reel has published yet"; six have).
- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v3.md` — the demand-grid /
  capability-guard spine A3 must flow through.
- `docs/briefs/format-capability-indicator-v1-brief.md`,
  `docs/briefs/global-format-capability-pyramid-slice0-brief.md` — existing capability surfacing.
- `docs/briefs/cc-0043-asset-gap-analyzer-write-lane-brief.md` — Asset Gap receiver for A3.
- `supabase/functions/ai-worker/index.ts:294-310` — precedent for a platform-support opt-in
  semantics fix (`s[platform] !== true`), same failure shape.

## Scope

### A1 — Registry correction *(determined; apply-artifact only)*

Author `NOT_APPLIED_*` migration + ROLLBACK setting the three values to `true`. Record
`video_short_kinetic`'s audio-gap cause against its `false` so the value is no longer unexplained.
Correct the stale `:341-342` publisher comment.

### A2 — Mix restoration, **two-tier and proof-gated**

**A2 must NOT restore material Instagram video allocation from spec compatibility alone.**
Author two separate artifacts, both `NOT_APPLIED_*`:

- **A2a — proof-tier mix.** The minimum video share sufficient to emit **one draft per newly
  SUPPORTED format** (`video_short_stat`, `video_short_stat_voice`, `video_short_kinetic_voice`).
  This exists to generate Gate B's transport proof, nothing more.
- **A2b — material discovery mix.** The real discovery allocation, per-row evidence-noted, summing
  to 100%. **Explicitly blocked** — A2b may not be applied until each of the three formats has a
  successful governed Reel publish on record from Gate B.

Do not weight either tier toward `video_short_kinetic` while its audio question is open.

### A3 — No silent degradation *(the architectural centre of this brief)*

> **Governing statement (PK, 2026-08-08):** Capability data must not be allowed to silently remove
> requested format capability from a schedule. Unsupported, null, or unproven capability must
> surface as an explicit gap/status that the dashboard can expose and the Asset Gap machinery can
> consume.

Implement that. The renormaliser did not malfunction on 2026-07-25 — it consumed three values with
no evidentiary basis and did exactly what it was told, with no gap raised. The defect class is
**unvalidated capability data driving irreversible mix decisions with no surfaced gap.** Correcting
three booleans repairs this incident; A3 is what prevents the next one.

Must distinguish **three** states, not two: supported · unsupported-with-cause · **unproven**.
`null` must never be silently coerced to unsupported.

### A4 — Instagram packaging

Instagram-specific caption/hook shaping, structurally distinct from the Facebook body. Hashtags are
included as **context/search metadata only** — explicitly not the deliverable, and must not be
presented as "Instagram solved".

### A5 — Distribution evidence

Schema + capture path for, per published item: non-follower reach, follower reach, retention/watch
signal, shares, saves, profile visits, follows gained. Graph API field mapping named per metric.

**Out of scope:** the 30-day experiment and any growth target (Gate B) · Facebook app publish /
business verification / Live transition (Gate C, PK-owned) · account distribution tactics
(collaborations, seeding, paid amplification) · **any** follower-buying, mass automated
following/commenting or synthetic engagement (permanently out of scope for this programme) ·
per-brand growth playbooks beyond recording that they must differ · LinkedIn and YouTube behaviour
· HeyGen sunset remediation (risk-note only) · re-investigating A1.

## Allowed actions

- Read any repo file, register, and the DB via `db-read.py` (R0) or read-only `execute_sql`.
- Author `NOT_APPLIED_*` migration + ROLLBACK artifacts under `docs/briefs/artifacts/`.
- Author code changes for A3/A4/A5 in an **isolated worktree** via `ef-builder`; run hermetic tests.
- Invoke `db-rls-auditor` on any DB-touching proposal; `branch-warden` before any commit;
  `apply-harness-auditor` (shadow) on the apply packet before freeze.
- Run `ask_chatgpt_review` on the final packet, recording `reviewed_input_hash`.

## Forbidden actions

- **Do NOT apply any migration.** Production mutation is watch-gated to ~2026-08-11 20:20 Sydney;
  every DB artifact stays `NOT_APPLIED_*` pending PK's gate.
- **Do NOT deploy any edge function.** Deploy is a PK hard stop.
- **Do NOT apply A2b**, or any material video allocation, before Gate B's per-format Reel proofs.
- **Do NOT unfreeze Lane 5 `select_music`** (branch `lane5/select-music-seed-rotation @ b24ebe4`)
  to make this Gate pass. The music dependency is **recorded, not actioned**.
- Do NOT publish a test Reel — that is Gate B, and needs its own gate.
- Do NOT publish the Meta app to Live, alter business verification, or change any Facebook /
  Instagram account or page setting.
- Do NOT change LinkedIn or YouTube mix, publisher behaviour, or scheduling.
- Do NOT alter live `platform_support` or `platform_format_mix_default` rows directly.
- Do NOT increase publishing volume or cadence for any brand.
- Do NOT declare Instagram "fixed" on hashtags, or on a restored mix without published-Reel evidence.
- Do NOT mark any capability `proven` — proving is Gate B's job.
- Do NOT clean or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence).

## Success criteria

- A1 artifacts set exactly three values to `true`; `video_short_kinetic` remains `false` **with its
  audio-gap cause recorded** and handed to the Asset Gap lane (Lane 5 dependency named, not actioned).
  Stale publisher comment corrected.
- A2a and A2b exist as **separate** byte-hashed `NOT_APPLIED_*` artifacts, each with ROLLBACK, each
  summing to 100%, each row evidence-noted. A2b carries an explicit, machine-readable block
  referencing the three required Reel proofs.
- A3 proves by test that a scheduled discovery format which cannot be produced yields a **surfaced
  gap** (dashboard indicator + Asset Gap requirement) and **not** a static substitution — and that
  `unproven` is distinguishable from `unsupported` and from `supported`. A test that fails if the
  silent-renormalisation path is reachable.
- A4 produces Instagram captions structurally distinct from the Facebook body, distinction stated
  and testable.
- A5 schema captures all seven named metrics with Graph API field mapping per metric.
- `db-rls-auditor` `pass`; `branch-warden` `safe`; `apply-harness-auditor` run (shadow, advisory);
  external review clean with `reviewed_input_hash` matching the frozen packet.
- Result doc states exactly what Gate B must publish and measure to call this proven.

## Stop condition

Report result per `docs/briefs/_template_result.md`, then stop. Do not apply, deploy, or merge.
Gate A ends at a PK-reviewable packet; Gate B opens only on PK's word.

---

## Notes

**Sequencing.** A1 + A2a + A3 is the coherent first slice if the packet needs splitting — A1 repairs
the incident, A2a enables Gate B's proof, A3 is the durable fix. A2b/A4/A5 can follow without
re-opening the registry question.

**Standing risk (carried from A1).** `video_short_avatar` is the **only live-proven** Instagram
video format and is HeyGen-rendered; the HeyGen legacy API sunsets ~Oct 2026. The three formats A1
reclassified are spec-proven but have never published a Reel. Until Gate B lands those proofs,
ICE's entire *demonstrated* Instagram discovery surface is one single-vendor format with a clock on
it. This is the reason A2b is proof-gated rather than trusted.

**`video_short_kinetic` resolution paths (either is acceptable, neither is Gate A work):**
(a) governed audio attachment via the music lane when it thaws on its own schedule, or
(b) a controlled silent-Reel proof. Until one lands, `false` + recorded cause is the correct state.
