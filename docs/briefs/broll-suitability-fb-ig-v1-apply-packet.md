CLAIMED · broll-suitability-fb-ig-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1+2 · 2026-07-29

# Apply Packet — B-roll Platform Suitability (facebook + instagram) v1

**Created:** 2026-07-29 Sydney · **Status: FROZEN — awaiting PK Gate-2 apply authorisation.**
**Lane classification:** PRODUCT_PROOF · **Tier: T3** (§2).
**Origin:** PK instruction 2026-07-29 — *"Add the suitability row for 46c5c4ac"*, opening the lane this
session flagged as separate at `broll-platform-scope-correction-v1-result.md` §4.
**Artifacts:** `docs/briefs/artifacts/broll-suitability-fb-ig-v1-forward.sql` · `…-rollback.sql`

> **This is a REPOINT.** Adding these rows moves facebook and instagram from the incumbent
> (`video_stat_reveal_9x16_v2`) to the B-roll template. **TPR-1 + Addendum v1 therefore govern it** —
> §3 is the mandatory three-surface effective-spec diff. Production (`p_platform=NULL`) is unaffected.

---

## 1. The change

INSERT 2 rows into `c.creative_template_platform_suitability`:

| template_id | platform | placement | suitability_status |
|---|---|---|---|
| `dd5fd75e` (provider `46c5c4ac`) | `facebook` | `feed` | `candidate` |
| `dd5fd75e` (provider `46c5c4ac`) | `instagram` | `feed` | `candidate` |

`candidate` is the honest status and mirrors the incumbent's own rows exactly (`'D6 Lane 2 — …
platform-unproven'`). It passes the selector gate (`NOT IN ('not_suitable','blocked')`) while still
emitting the `platform_suitability_unproven` warning. Claiming `platform_safe` or `production_proven`
would over-claim — neither template has been platform-proven.

**No DDL · no GRANT · no template, resolver, asset, fence, `fit_status`, code or deploy change.**

## 2. Tier: T3

**Assessed T3, up from the previous lane's T2.** This one genuinely changes *what production would
select* at two platforms — a product output change, which Convention 3 puts at T3. Escalation up is
free; this lane takes it rather than argue T2 on the grounds that the path is currently unreachable
(§5). Given the external reviewer's standing pushback that tier should track what a change *governs*,
T3 is also the consistent reading.

## 3. TPR-1 + Addendum v1 — mandatory three-surface effective-spec diff

**First application of the addendum ratified this morning (v6.57).** Required at Gate 1 by TPR-1.b.

| Surface | OUTGOING — `c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` (`video_stat_reveal_9x16_v2`) | INCOMING — `46c5c4ac-4d35-488c-b57c-44e05d790fb9` (`AU_generic_national_Suburb_9:16_V1`) |
|---|---|---|
| **A** — saved provider-template spec (`c.creative_provider_template`) | `1080 × 1920`, `12s` | `720 × 1280`, `8s` |
| **B** — worker parity overlay (`B1_VIDEO_TEMPLATE_OUTPUT_PARITY`) | **absent** → empty overlay | `width=1080`, `height=1920`, `.duration=12` on **all 8** elements |
| **Effective spec** | **`1080 × 1920 / 12s`** | **`1080 × 1920 / 12s`** |
| **`source`** | `provider_template_default` | `render_time_parity_overlay` |

### ✅ `specs_match = TRUE`

- **TPR-1.c** — the incoming registry row still reads `720/1280/8` and is **left untouched**; it
  truthfully describes the provider object. Divergence declared here, not reconciled by mutation.
- **TPR-1.e (overlay completeness)** — the overlay sets `.duration` on all 8 elements
  (`Background`, `Logo`, `StatValue`, `StatLabel`, `ContextLine`, `CtaText`, `MusicBed`, `VoiceAudio`),
  asserted by the worker's hermetic tests. No element renders short against a 12s composition.
- **TPR-1.f (containment)** — unchanged; the overlay sets output geometry only, enforced by
  `assertParityOverlayDisjoint` plus merge order.

### Surface C — measured rendered output, and an honest caveat

**C = `1080 × 1920 / 00:00:12.00`**, ffmpeg-measured from the produced file in the v6.54 activation
proof, byte-identical to the PK-approved pre-apply render.

**Caveat, stated rather than glossed:** that measurement was taken at the **`p_platform=NULL`**
production signature. TPR-1.b asks for C "on a render made at the real production call signature" — and
for facebook/instagram **no such signature exists today**, because no caller passes an explicit platform
for `video_short_stat` (§5). The claim that C transfers is a **code-level inference, not a fresh
measurement**: `parityOverlayForProviderTemplate(providerTemplateId)` is keyed **solely** by
provider-template id and takes no platform argument, so the identical overlay applies on any platform;
the rendered bytes cannot differ by platform. **PK's call:** accept the inference, or require a fresh
fb/ig render proof — which would first require constructing a caller that does not currently exist.

## 4. Measured effect (live dry run, aborted transaction)

| `p_platform` | BEFORE | AFTER |
|---|---|---|
| **`NULL`** — production | `AU_generic_national_Suburb_9:16_V1` | **unchanged** ✅ |
| `facebook` | `video_stat_reveal_9x16_v2` | **`AU_generic_national_Suburb_9:16_V1`** ← the repoint |
| `instagram` | `video_stat_reveal_9x16_v2` | **`AU_generic_national_Suburb_9:16_V1`** ← the repoint |
| `linkedin` | `video_stat_reveal_9x16_v2` | **unchanged** (no li row added) ✅ |
| `youtube` | `(none)` | **`(none)`** — not newly enabled ✅ |

Production is unaffected because the selector's suitability gate is wrapped in
`IF … AND p_platform IS NOT NULL` (verified in the live function body) — at `NULL` it never runs.

## 5. ⚠ Reachability — this has ZERO live effect today

No production caller passes an explicit platform for `video_short_stat`:

| Caller | `p_platform` |
|---|---|
| `video-worker` production (`index.ts:1251`) | **`null`** |
| `video-worker` governed smoke (`index.ts:1437`) | **`null`** |
| `image-worker` (`index.ts:833`, `:952`) | explicit — but `image_quote`, a different format |

**So nothing renders through the fb/ig video path today.** This change is **preparatory**: it makes
B-roll *selectable* at fb/ig for whenever such a caller exists. Stated plainly so the apply is not
mistaken for "fb/ig B-roll now renders" — it does not, because nothing calls it.

## 6. Deliberate exclusions (each its own decision — NOT silently made)

- **LinkedIn — excluded.** The asset `platform_scope` set at v6.59 is
  `{facebook,instagram,youtube}`, so a li suitability row would declare the template li-suitable while
  the assets block it at `no_governed_background`. That is exactly the "declared control production
  never reads" anti-pattern this whole arc has been correcting. Guard **G6** asserts linkedin still
  resolves the incumbent.
- **YouTube — excluded, and this one is a safety call.** **No template currently has a youtube
  suitability row**, so youtube video selection fails closed for everything. Adding one here would
  newly open youtube — and `youtube-publisher` is **schedule-blind auto-publish** (a generated+approved
  PP YouTube draft publishes publicly within ~30 min). Opening a publish surface is a T3 posture change
  in its own right and must be an explicit, separate PK decision. Guard **G7** asserts youtube remains
  unselectable, so this apply cannot open it even by accident.

## 7. Guard register (all executable `RAISE`, none prose)

| ID | Guard | Fail |
|---|---|---|
| **G0** | atomicity armed pre-write, re-asserted post | abort |
| **G1** | pre-state: **exactly 0** suitability rows for this template | abort |
| **G2** | exactly 2 rows inserted | abort |
| **G3** | post-state exactly 2 rows, all `(facebook\|instagram, feed, candidate)` | abort |
| **G4** | **production-signature winner unchanged** *and* still the B-roll template | abort |
| **G5** | the intended repoint took: fb **and** ig both resolve B-roll | abort |
| **G6** | **no linkedin leakage** — still the incumbent | abort |
| **G7** | **no youtube enablement** — still unselectable | abort |

G1 also makes the apply non-idempotent by design: a second run aborts rather than duplicating (the
`UNIQUE (template_id, platform, placement)` constraint would catch it too, but G1 fails first and more
legibly).

## 8. Rollback — proven BEFORE apply

```
G1 pre-state: 0 suitability rows — OK
FORWARD:  G2..G7 all PASS (prod=B-roll unchanged, fb+ig=B-roll, li=incumbent, yt=none)
ROLLBACK: 2 deleted, 0 remain, fb+ig restored to incumbent — CLEAN
=> ROLLBACK_PROOF_PASSED — zero production effect
```

Rollback is a pinned `DELETE` of exactly the 2 rows, asserting 0 remain and that fb/ig return to the
incumbent. One `execute_sql` call.

## 9. Apply sequence

1. Verify pre-state is still **0** suitability rows for `dd5fd75e` (G1 enforces it anyway).
2. Run `broll-suitability-fb-ig-v1-forward.sql` — **one** `execute_sql` call, whole file.
3. Readback: 2 rows, fb+ig/feed/candidate.
4. Live probe: `NULL` unchanged · fb+ig → B-roll · li → incumbent · yt → none.
5. Record, commit, push.

**STOP conditions:** pre-state ≠ 0 rows · rowcount ≠ 2 · any guard raising · production winner moving ·
linkedin moving off the incumbent · youtube becoming selectable · unexpected files in the change set.

## 10. Non-claims

- ❌ Not claimed: that fb/ig B-roll renders after this. **Nothing calls that path** (§5).
- ❌ Not claimed: that Surface C was measured at an fb/ig signature. It was not, and cannot be today
  (§3) — the transfer is a stated code-level inference for PK to accept or reject.
- ❌ Not claimed: that the template is platform-proven. Status is `candidate`; the selector emits
  `platform_suitability_unproven`.
- ❌ Not claimed: that the B-roll pool improved. **Still 1 eligible clip, still below the floor of 4.**
- ❌ Not claimed: that youtube or linkedin are addressed. Both deliberately excluded (§6).

## 11. External review record

**Round 1** — `review_id 8a990dde-ec47-4afb-9434-cc921d021e4b`, `reviewed_input_hash`
`29d7cdb80b1e16e996b72a38f0f12fb329706d7fcbcec24e0145768892fb258a` (packet) /
`1355fb80…` / `794e9459…` (SQL). Verdict **`partial`** · risk medium · confidence medium ·
`requires_pk_escalation: true`.

- **Verified:** zero live effect (no caller passes an explicit platform for `video_short_stat`), and
  that the guards enforce their conditions before execution.
- **No concrete defect** raised against the SQL, the guard set, the status choice, or the rollback.
- **Pushback 1 — Surface C.** The reviewer declines to accept the code-level inference and asks for a
  fresh render/validation proof before acceptance. **Triage: `runtime_verification_required`.** CCF-02
  routing: proceed **only** if an explicit post-apply verification gate is named, else **stop**. No such
  gate can be named today — an fb/ig render requires a caller that does not exist (§5). **→ PK decides:
  accept the inference, or hold this lane until an fb/ig caller exists to measure against.**
- **Pushback 2 — G7 durability.** The reviewer notes G7 has not been validated against *future* changes
  that might alter youtube's status. **This is correct but describes a different control.** G7 is an
  **apply-time** guard: it guarantees *this* transaction cannot open youtube. It is not, and was never
  claimed to be, a standing control against a future lane. The standing protection is structural — **no
  template has a youtube suitability row at all**, so youtube fails closed globally, and adding one is
  its own T3 gate with its own review. Recorded so the distinction is explicit rather than assumed.

**Escalation reason returned by the bridge:** the youtube publish-surface implications. Note this lane
**excludes** youtube and asserts that exclusion in G7 — the escalation is about the *class* of risk, not
a defect found in this packet.

## 12. What PK must decide before this can apply

1. **Surface C (blocking).** Accept the code-level inference — `parityOverlayForProviderTemplate` takes
   only a provider-template id and no platform, so the rendered bytes cannot vary by platform — **or**
   require a fresh measured render at an fb/ig signature, which would first require building a caller
   that does not currently exist. **The lane's read:** the inference is sound, because platform is never
   an input to the Creatomate render payload at all; but this is PK's call, not the lane's, and the
   review explicitly withheld acceptance.
2. **Tier.** Assessed **T3** (§2). Confirm or adjust.
3. **Whether a preparatory, currently-unreachable change is wanted at all** (§5) — it is inert until an
   fb/ig video caller exists. Applying now is defensible (the row is ready and correct); so is deferring
   until the caller lands, which would let Surface C be measured properly and close pushback 1 naturally.

## 13. Stop condition

**Packet frozen; apply NOT executed.** DML is a PK hard stop, and this is additionally a T3 repoint
under TPR-1. PK authorises step 2, or runs it.
