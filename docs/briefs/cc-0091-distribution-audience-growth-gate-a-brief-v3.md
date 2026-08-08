# Brief cc-0091 — distribution-audience-growth-gate-a (v3)

**Created:** 2026-08-08 Sydney
**Author:** chat
**Executor:** Claude Code
**Status:** draft — **Gate-1 scope APPROVED by PK 2026-08-08**, ready to issue
**Supersedes:** `...-brief-v2.md` (which superseded `...-brief-v1.md`)
**Result file:** `docs/briefs/results/cc-0091-distribution-audience-growth-gate-a.md` (on completion)

> **Lane:** Distribution & Audience Growth — **Gate A (foundation)**.
> **Lane classification (CCF-02):** PRODUCT_PROOF. **Tier: T2** — Gate A applies nothing and
> changes no live behaviour.
>
> **v3 amendment basis — PK ruling 2026-08-08:** A2a **execution** moves out of Gate A into
> Gate B. Gate A makes **zero live scheduling/mix behaviour change**. A4/A5 remain separable
> (determination below: neither is an A3 prerequisite).

---

## Ultimate

> **Correct the false capability state, and prevent unsupported/null/unproven capability data from
> silently degrading requested schedule formats.** *(PK, 2026-08-08)*

Gate A is a **truth-and-safeguard** gate. It is explicitly **not** the first behavioural rollout
step. The boundary this preserves: Gate A establishes *"we now know the truth"*; Gate B establishes
*"we have proven the production path"*. Nothing in Gate A may blur that line.

## Accepted state (determined — do not re-investigate)

Per `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md` (11 `ffprobe` artifact
probes, 2026-08-08):

| Format | Verdict | Gate A action |
|---|---|---|
| `video_short_stat` | **SUPPORTED** (spec-proven, live-unproven) | registry `false` → `true` |
| `video_short_stat_voice` | **SUPPORTED** (spec-proven, live-unproven) | registry `null` → `true` |
| `video_short_kinetic_voice` | **SUPPORTED** (spec-proven, live-unproven) | registry `null` → `true` |
| `video_short_kinetic` | **UNPROVEN** — no audio stream (4/4 renders) | stays `false`, **cause recorded** |
| `video_short_avatar` | **SUPPORTED** — live-proven, 6 Reels, latest 2026-06-19 | unchanged |

`animated_data` / `animated_text_reveal` are **out of scope** — absent from `IG_VIDEO_FORMATS`, so
their `false` is consistent with the publisher.

## Source context

- `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md` — A1 determination + evidence
  index. **Primary input.**
- `t."5.3_content_format".platform_support` — the three wrong values.
- `t.platform_format_mix_default` — current IG rows `carousel` 60% + `image_quote` 40% = 100%
  static, effective 2026-07-25, `evidence_source = cc-0079-slice-2`
  (`"renormalised vs platform_support (Fault A)"`). Superseded 2026-04-22 rows carried 35% video.
- `supabase/functions/instagram-publisher/index.ts:154-158`, `:328`, `:341-342`
  (**stale comment** — "No reel has published yet"; six have).
- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v3.md` — demand-grid /
  capability-guard spine A3 must flow through.
- `docs/briefs/format-capability-indicator-v1-brief.md`,
  `docs/briefs/global-format-capability-pyramid-slice0-brief.md` — existing capability surfacing.
- `docs/briefs/cc-0043-asset-gap-analyzer-write-lane-brief.md` — Asset Gap receiver for A3.
- `supabase/functions/ai-worker/index.ts:294-310` — precedent for a platform-support opt-in
  semantics fix (`s[platform] !== true`), same failure shape.

## Scope

### A1 — Registry correction *(determined; apply-artifact only, NOT applied)*

`NOT_APPLIED_*` migration + ROLLBACK setting the three values to `true`. Record
`video_short_kinetic`'s audio-gap cause against its `false` so the value is no longer unexplained,
and hand that gap to the Asset Gap lane. Correct the stale `:341-342` publisher comment.

### A3 — No silent degradation *(the architectural centre)*

> **Governing statement (PK, 2026-08-08):** Capability data must not be allowed to silently remove
> requested format capability from a schedule. Unsupported, null, or unproven capability must
> surface as an explicit gap/status that the dashboard can expose and the Asset Gap machinery can
> consume.

Implement that. The renormaliser did not malfunction on 2026-07-25 — it consumed three values with
no evidentiary basis and did exactly what it was told, raising no gap. The defect class is
**unvalidated capability data driving irreversible mix decisions with no surfaced gap.** The three
registry corrections repair *this* incident; A3 is what prevents the next one.

**Three-state model, mandatory:** `SUPPORTED` · `UNSUPPORTED_WITH_CAUSE` · `UNPROVEN`.
**`null` must never be collapsed into `false`.** A two-state model would have reproduced this exact
failure with better logging — `video_short_stat_voice` and `video_short_kinetic_voice` were `null`,
not `false`.

### A2a / A2b — **authoring only, execution deferred to Gate B**

Author both as byte-hashed `NOT_APPLIED_*` artifacts with ROLLBACK, as **future gated state**:

- **A2a — proof-tier mix.** Minimum video share sufficient to emit one draft per newly SUPPORTED
  format. **Applied in Gate B, not here.**
- **A2b — material discovery mix.** Real discovery allocation, per-row evidence-noted, summing to
  100%, carrying an explicit machine-readable block referencing the three required Reel proofs.

Neither tier may be weighted toward `video_short_kinetic` while its audio question is open.
Authoring these is optional-if-useful; if authoring them would pressure Gate A toward behavioural
change, defer both wholly to Gate B and say so in the result.

### Deferred — A4 (Instagram packaging) · A5 (distribution evidence)

**Prerequisite determination (as PK conditioned):** neither is a prerequisite for A3. A3 surfaces
**capability gaps** (three-state status → dashboard + Asset Gap); A5 captures **distribution
outcomes** (non-follower reach, retention, shares, saves, profile visits, follows). Different data,
no dependency. A4 is caption/hook shaping and is unrelated to A3. **Both separable — not authorised
here.**

> **Sequencing consequence to carry:** A5 is not an A3 prerequisite, but it **is** a prerequisite
> for the *experiment* half of Gate B. Gate B's *proof* half (publish one Reel per format, confirm
> transport) needs only existing `m.post_publish` data. The 30-day experiment cannot measure
> anything without A5. **A5 must therefore land between Gate B's proof and Gate B's experiment** —
> flagged now so it is not discovered mid-Gate-B.

**Also out of scope:** Facebook app publish / business verification / Live transition (Gate C,
PK-owned) · account distribution tactics (collaborations, seeding, paid amplification) · **any**
follower-buying, mass automated following/commenting or synthetic engagement (permanently out of
scope for this programme) · per-brand growth playbooks beyond recording that they must differ ·
LinkedIn and YouTube behaviour · HeyGen sunset remediation (risk-note only) · re-investigating A1.

## Allowed actions

- Read any repo file, register, and the DB via `db-read.py` (R0) or read-only `execute_sql`.
- Author `NOT_APPLIED_*` migration + ROLLBACK artifacts under `docs/briefs/artifacts/`.
- Author A3 code changes in an **isolated worktree** via `ef-builder`; run hermetic tests.
- Invoke `db-rls-auditor` on any DB-touching proposal; `branch-warden` before any commit;
  `apply-harness-auditor` (shadow) on the apply packet before freeze.
- Run `ask_chatgpt_review` on the final packet, recording `reviewed_input_hash`.

## Forbidden actions

- **Do NOT make any live scheduling or mix behaviour change.** Gate A is truth-and-safeguard only.
- **Do NOT apply any migration** — including A1. Production mutation is watch-gated to
  ~2026-08-11 20:20 Sydney; every DB artifact stays `NOT_APPLIED_*` pending PK's gate.
- **Do NOT apply A2a or A2b.** A2a execution is Gate B's.
- **Do NOT generate, alter, or trigger any draft** for any brand.
- **Do NOT publish a Reel** — Gate B, under its own gate.
- **Do NOT deploy any edge function.** Deploy is a PK hard stop.
- **Do NOT unfreeze Lane 5 `select_music`** (branch `lane5/select-music-seed-rotation @ b24ebe4`)
  to make this Gate pass. The music dependency is **recorded, not actioned**.
- Do NOT publish the Meta app to Live, alter business verification, or change any Facebook /
  Instagram account or page setting.
- Do NOT change LinkedIn or YouTube mix, publisher behaviour, or scheduling.
- Do NOT alter live `platform_support` or `platform_format_mix_default` rows directly.
- Do NOT increase publishing volume or cadence for any brand.
- Do NOT declare Instagram "fixed" on hashtags, or on a restored mix without published-Reel evidence.
- Do NOT mark any capability `proven` — proving is Gate B's job.
- Do NOT clean or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence).

## Success criteria

- **Zero live behaviour change demonstrable** — no draft generated, no mix row altered, no EF
  deployed, no schedule affected. This is a pass/fail criterion for the gate itself.
- A1 artifacts set exactly three values to `true`; `video_short_kinetic` remains `false` **with its
  audio-gap cause recorded** and handed to the Asset Gap lane (Lane 5 dependency named, not
  actioned). Stale publisher comment corrected.
- A3 proves **by test** that a scheduled discovery format which cannot be produced yields a
  **surfaced gap** (dashboard indicator + Asset Gap requirement) and **not** a static substitution;
  and that `UNPROVEN` is distinguishable from `UNSUPPORTED_WITH_CAUSE` and from `SUPPORTED`, with
  `null` never coerced to `false`. Include a test that **fails** if the silent-renormalisation path
  is reachable.
- A2a/A2b, if authored, exist as separate byte-hashed `NOT_APPLIED_*` artifacts each with ROLLBACK,
  each summing to 100%, each row evidence-noted; A2b carries its machine-readable proof block.
  If deferred instead, the result says so and why.
- `db-rls-auditor` `pass`; `branch-warden` `safe`; `apply-harness-auditor` run (shadow, advisory);
  external review clean with `reviewed_input_hash` matching the frozen packet.
- Result doc states the Gate B handoff below in concrete, checkable terms.

## Gate B handoff (defined here, authorised separately)

1. Apply A1 (registry correction) under PK's gate.
2. Apply **A2a** proof-tier mix.
3. Generate **exactly** the drafts needed — one per newly SUPPORTED format.
4. Publish **one governed Reel per format**: `video_short_stat`, `video_short_stat_voice`,
   `video_short_kinetic_voice`. Collect transport proof.
5. **Permit or block A2b** on that evidence.
6. Land **A5** before the 30-day experiment begins.

## Stop condition

Report result per `docs/briefs/_template_result.md`, then stop. Do not apply, deploy, or merge.
Gate A ends at a PK-reviewable packet; Gate B opens only on PK's word.

---

## Notes

**Standing risk (carried from A1).** `video_short_avatar` is the **only live-proven** Instagram
video format and is HeyGen-rendered; the HeyGen legacy API sunsets ~Oct 2026. The three formats A1
reclassified are spec-proven but have never published a Reel. Until Gate B lands those proofs,
ICE's entire *demonstrated* Instagram discovery surface is one single-vendor format with a clock on
it. This is why A2b is proof-gated rather than trusted.

**`video_short_kinetic` resolution paths** (either acceptable, neither is Gate A work):
(a) governed audio attachment via the music lane when it thaws on its own schedule, or
(b) a controlled silent-Reel proof. Until one lands, `false` + recorded cause is the correct state.
