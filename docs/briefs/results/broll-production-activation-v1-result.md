# Result — B-roll Production Activation v1 (Route A)

**Date:** 2026-07-28 Sydney · **Lane class:** PRODUCT_PROOF · **Tier:** T3 · **Register:** v6.48
**Brief:** `docs/briefs/broll-production-activation-v1-gate1-brief.md`
**Packet:** `docs/briefs/broll-production-activation-v1-apply-packet.md` (rev 3, pin `77d8f6cd…`)

## Verdict — ⏪ APPLIED, PROVEN, THEN ROLLED BACK ON PK DECISION

The activation worked exactly as designed and the render proof **passed on measured audio**. But the
render proof also surfaced a consequence **no gate had disclosed**: the repoint silently downgraded PP's
governed video from **1080×1920 / 12s → 720×1280 / 8s**. PK elected to roll back rather than accept it.

**Production is on the incumbent `a3d8472d` (`video_stat_reveal_9x16_v2`, 1080×1920 / 12s) — the
pre-lane state. Net production DB effect of this entire lane: ZERO.** B-roll returns to
**proven-but-inert**, exactly where it started. Nothing from the consumption proof, resolver v1.4, or the
governed clip was disturbed.

## Final state — rolled back, digest-exact

Executed via the same single-call channel (rollback `c5cd0afe…`); every control passed.

| Check | Result |
|---|---|
| Restore digest vs frozen pre-image | **`962043fb…` == `962043fb…`** — byte-exact on every attested column |
| `fit_status` trio | `4cd2c9e2=strong`, `a3d8472d=strong`, `dd5fd75e=candidate` — original |
| `reviewed_at` on the B-roll row | **`NULL` restored** (the one a naive rollback loses) |
| `fit_reason` ×3 | original strings, verbatim |
| PP production winner | **`video_stat_reveal_9x16_v2`**, background back to the still `Brisbane_CBD_Suburbs.jpg` |
| NDIS | `ok` — unaffected throughout |

Only `updated_at` differs from the pre-lane state, and nothing reads it (verified: no non-internal
triggers; none of the four functions referencing the table read that column).

**The rollback proved itself rather than asking to be trusted** — its step (2a) recomputed the apply's
own frozen digest and refused to commit unless it matched exactly. That control exists because the
round-2 auditors flagged that "the literals reproduce the original state" was asserted but never
enforced. It is the single highest-value control in the packet.

---

# 🔒 TPR-1 — Template Parity Requirement (NEW, standing)

**Any change that repoints a governed format's default template MUST diff the OUTPUT SPEC of the
outgoing and incoming template — resolution, duration, codec/audio shape — and state the delta
explicitly at Gate 1, or carry written PK acceptance of it.**

**Why this exists:** this lane ran three full review rounds. `db-rls-auditor`, `apply-harness-auditor`
and an external cross-model adversary all scrutinised selection mechanics, harness fail-closure,
transaction atomicity, digest invariance and rollback fidelity — and **not one of them looked at what
the promoted template actually renders.** The downgrade was found only because a render proof was run
*after* the apply. A selector repoint is not merely a selection change; it is a **product output
change**, and no existing control covers that.

**Mechanical check (cheap — one query):**
```sql
SELECT provider_template_name, width, height, duration_seconds, output_type
FROM c.creative_provider_template WHERE id IN ('<outgoing>','<incoming>');
```
Measured evidence for this lane:

| Template | Resolution | Duration |
|---|---|---|
| `c11bb8ab` `video_stat_reveal_9x16_v2` — incumbent | **1080×1920** | **12 s** |
| `4cd2c9e2` `Stat Reveal 9×16 — Governed AV v2` | 720×1280 | 12 s |
| `46c5c4ac` `AU_generic_national_Suburb_9:16_V1` — B-roll | **720×1280** | **8 s** |

**Binding consequence for the B-roll arc:** re-activation is now blocked on a **template-spec problem,
not a selection problem.** It requires either a B-roll-capable template at 1080×1920 / 12s, or explicit
PK acceptance of the reduced spec. The selection mechanics are solved and proven; do not re-litigate them.

**Applies to (not exhaustive):** any `fit_status` repoint · any new `creative_template_variant_candidate`
row that could out-rank an incumbent · any `platform_suitability` addition that makes a new template
reachable · any client assignment that admits a template to a client's pool.

---

## What was applied (during the applied window)

Three guarded UPDATEs on `c.creative_template_variant_candidate` (DML only — no DDL, no function change,
no grants, no EF deploy), applied as ONE `execute_sql` call at PK Gate 2:

| Row | Template | fit_status |
|---|---|---|
| `8b611275…` | `dd5fd75e` (B-roll) | `candidate` → `strong_candidate` |
| `b61e2f15…` | `a3d8472d` (incumbent) | `strong_candidate` → `candidate` |
| `dee47d2e…` | `4cd2c9e2` (incumbent) | `strong_candidate` → `candidate` |

All eight in-transaction controls passed. **Why all three rows:** ranking is
`v_b_intent_strong ‖ v_b_intent_other ‖ v_b_strong ‖ v_b_other`, each ordered by template `created_at ASC`.
The production caller passes `p_variant_intent=null`, so the winner is the first `strong_candidate` by
creation date — and `dd5fd75e` is the **newest** template. **Promoting it alone can never make it win;
the demotions are what make the promotion effective.** Demoted rows stay selectable (`candidate` passes),
so they become the automatic fallback.

## Verified during the applied window

| Check | Result |
|---|---|
| PP production call (`p_platform=null`) | `ok`, winner `AU_generic_national_Suburb_9:16_V1` |
| Background resolved | `…/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4` — a governed **video** |
| Row state | Intended state; `fit_reason` written verbatim (no transcription drift) |
| NDIS | `ok`, still `video_stat_reveal_9x16_v2` — proves `candidate` stays selectable |

**Caller split, measured:** `p_platform=null` → B-roll · facebook/instagram/linkedin → incumbent,
unchanged · `youtube` → `fail_closed`. **The youtube failure is PRE-EXISTING** — all three templates
lack a youtube suitability row (incumbent rows cover only fb/ig/li), and that gate runs *before* and
*independently of* `fit_status`, so it is identical pre- and post-apply. Platform-declaring callers were
entirely unaffected by the repoint.

## Render proof — audio MEASURED (not declared) ✅ PASS

Harness `_harness/cc_broll_activation_20260728/render_proof.py` · meta `render_proof_meta.json`.
Two renders of `46c5c4ac`, measured with `ffmpeg ebur128`.

| | control (baked audio only) | production shape (+ the 2 audio keys the worker binds) |
|---|---|---|
| render_id | `92961a07…` | `12e89f92…` |
| sha256 | `58fd69c1…` | `99f38d0e…` |
| duration / size | 8.00 s · 720×1280 | 8.00 s · 720×1280 |
| **integrated loudness** | **−29.0 LUFS** | **−27.4 LUFS** |
| true peak | −16.8 dBFS | −13.0 dBFS |
| wall clock | 13.1 s (≪ 2-min ceiling) | 13.1 s |

1. **Determinism** — the control reproduced Slice B's sha `58fd69c1…` **byte-exactly**, so the pipeline
   is reproducible and the baseline faithful.
2. **The audio keys genuinely BIND.** `buildGovernedVideoStatPlan` always adds `VoiceAudio.source` +
   `MusicBed.source` (`b1_video_stat.ts:326-327`). Binding them changed the output (different sha,
   +1.6 LU, +3.8 dB peak), **disproving** the silent-drop mode — had the template lacked those elements
   the output would have been byte-identical (the cc-0085 technique). Both renders carry a real `soun`
   track, far above the −40 LUFS `audio_gate` floor.

## Review chain (three rounds)

| Reviewer | R1 | R2 | R3 |
|---|---|---|---|
| db-rls-auditor | concerns | concerns (0 must_fix) | concerns → 2 must_fix, **packet-text only**, fixed |
| apply-harness-auditor (SHADOW) | CONCERNS ×7 | CONCERNS ×4 | CONCERNS ×4 — packet-text / handed off |
| branch-warden | — | **stop** (HEAD drift) | **safe** after re-pin |
| external `ask_chatgpt_review` | — | — | `partial` → PK escalate, no concrete defect (`5f301cd9…`) |

**Three real defects caught and fixed before apply**, none cosmetic:
1. **Scope-binding gap (AHA-02-2) — explicitly NOT fail-closed.** Pre-image keyed on `format_key`,
   UPDATEs keyed on `id`, never joined. Fixed: `format_key` in all six predicates + `id`/`format_key`/
   `variant_key` in the digest payload.
2. **Timezone-dependent digest (SF-5/AHA-02-4).** `reviewed_at::text` renders per session TimeZone —
   proven to yield five different digests under five timezones. Fixed with `to_char(… AT TIME ZONE 'UTC')`;
   invariance then proven empirically against a control.
3. **Unguarded rollback + detective-only atomicity (SF-4/AHA-02-1).** The emergency path had no txid
   guard; the apply's fired only *after* mutation. Both now assert **before** any write.

Also corrected: the packet's over-broad "100% of PP video" claim, and a factually wrong rationale in the
Gate-1 brief (it said other clients lack a video governance row — NDIS has one; the real reason they are
unaffected is `no_assignment`, which gates *upstream* of `fit_status`).

**And the chain's blind spot: TPR-1 above.** Three rounds of rigorous review, zero coverage of output spec.

## Carries / next

- **TPR-1 is the gating carry for re-activation** — needs a 1080×1920/12s B-roll template, or explicit
  PK acceptance of 720p/8s. Selection mechanics are solved; the blocker is template authoring.
- **One-clip pool.** The eligible `broll_background` pool is exactly one clip (`2d62b04e`), so any future
  activation gives every PP video identical footage until **Asset Gap "Video B-roll Intake v1"** lands.
- **Governed smoke:** `index.ts:1442` hard-asserts `c11bb8ab`. Correct again post-rollback and needs no
  fix — but **any future repoint breaks it** until that constant is updated (code + EF deploy, own T3 gate).
  The assert is working as designed: it refuses to prove against a drifted surface.
- **Suitability rows for `dd5fd75e`** would converge platform callers with production — separate decision.
- **Geo:** the clip is AU-national; `label_constraint`/`geo_scope` are not machine-enforced. City-specific
  copy over generic national footage remains an open C1-class carry.
- **`safe_for_text_overlay='needs_gradient_scrim'`** on the fenced Perth clip `42211c0f` is an
  unrecognised value (resolver accepts only `true`/`needs_scrim`) — it would **silently fail closed** if
  that clip were promoted without a fix.
- **Reusable harness lessons** (see also the S3 discard record): bind attested and mutated scopes on the
  same key · never digest a `timestamptz` via `::text` · arm atomicity guards *before* the first write ·
  make a rollback recompute the apply's own pre-image digest.
