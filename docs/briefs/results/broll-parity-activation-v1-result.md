# Result — B-roll PARITY Activation v1

**Packet:** `docs/briefs/broll-parity-activation-v1-apply-packet.md`
**Tier:** T3 · **Lane class:** PRODUCT_PROOF · **Register:** v6.54
**Completed:** 2026-07-29 Sydney

---

## 1. Result status

`Complete` — **LIVE**. PP governed `video_short_stat` now renders a governed B-roll footage background
at the incumbent's full output contract (1080×1920 / 12s). The v6.48 regression is closed.

## 2. Commit(s)

- `d5ddca1` — `feat(video-worker v3.15.0): render-time output-parity overlay for the governed B-roll template`
- `<this commit>` — `docs(v6.54): B-roll Parity Activation v1 — LIVE`

## 3. What is live now

| | before | after |
|---|---|---|
| EF `video-worker` | v3.14.0 | **v3.15.0** |
| governed `video_short_stat` winner | `a3d8472d` / `c11bb8ab` `video_stat_reveal_9x16_v2` | **`dd5fd75e` / `46c5c4ac` `AU_generic_national_Suburb_9:16_V1`** |
| background | still image `bg_pp_contract_signing_closeup.jpg` | **governed B-roll video** `broll_pp_au_suburb_aerial.mp4` |
| output spec | 1080×1920 / 12s | **1080×1920 / 12s (unchanged — the point of the lane)** |
| first fallback | — | incumbent `c11bb8ab`, still fully selectable |

`fit_status` projection: `dd5fd75e=strong_candidate`, `a3d8472d=candidate`, `4cd2c9e2=candidate`.

## 4. Actions taken, in order

1. **Code** — wired the parity overlay into `buildGovernedVideoStatPlan` (allow-list of exactly one
   `provider_template_id`; overlay merges before governed bindings; `assertParityOverlayDisjoint` refuses
   any `.source`/`.volume`/governed-key collision; effective spec stamped into
   `render_spec.template.tmr.output_spec`). VERSION bump + smoke expected-template set in `index.ts`.
2. **Hermetic** — 142/142 pass, incl. allow-list canaries added in response to external review.
3. **Live production-shaped render proof** (pre-apply) — real published draft, verbatim live selector
   response, resolver-selected assets, real ElevenLabs VO, live `select_music` winner, plan built by the
   **production module itself**. TPR-1 diff measured on BOTH sides: outgoing 1080×1920/12.00s vs incoming
   1080×1920/12.00s ⇒ `specs_match=true`. Audio proven to bind (sha ≠ no-audio control).
4. **Rollback proven BEFORE apply** — `ROLLBACK_PROOF_PASSED`, digest-exact restore, zero production effect.
5. **External review** — 2 rounds, `partial`/medium/high, `pushback_points: []`, no concrete defect;
   escalated 2 `policy_decision` items → PK accepted at the gate.
6. **PK Gate 2** — approved: deploy → verify marker → apply.
7. **Deploy blocker found and surfaced, NOT worked around** (see §6).
8. **Push** `d5ddca1` → drift refresh (`A-LE` → `B-FD`) → `safe-deploy.sh video-worker --allow-warn` → deployed.
9. **STOP-2/3** — deployed bundle grepped: `video-worker-v3.15.0` present, `v3.14.0` absent, all four
   overlay markers present, new smoke-set symbol present, old single-id symbol absent; `verify_jwt=false`.
10. **STOP-4/5** — drift refreshed to clean `A-LE`; pre-image digest re-confirmed `962043fb…`.
11. **STOP-6** — `forward.sql` applied in ONE `execute_sql` call. All guards passed; committed.
12. **STOP-7** — post-activation proof on the **real production call signature** (§5).

## 5. Post-activation proof

Selector on the production signature (`p_platform=NULL`, `p_variant_intent=NULL`) returns the B-roll
template with `reasons` no longer containing `variant_intent_match` — i.e. it wins on its own ranking,
not on a hint. Rebuilt the plan from that response through the production module and rendered it:

- `tmr.output_spec` = `{1080, 1920, 12, 'render_time_parity_overlay'}`
- provider-reported **and** ffmpeg-measured: **1080×1920, 00:00:12.00**
- **−22.9 LUFS**, audio stream present (floor −40)
- wall clock **25.7s** (ceiling 120s)
- sha256 `db83c58e…` — **byte-identical** to the pre-apply render PK visually approved

The byte-identity is the strongest single result: the plan derived from the production signature is
indistinguishable from the plan derived via the intent hint, so activation changed *which template is
selected* and nothing about *how it is composed*.

⚠ `render_proof_postapply_meta.json` has three comparison fields that are meaningless in that run
(`audio_keys_bind`, `control_lufs`, `outgoing_incumbent`) because it is a single-render script derived
from the three-render one — all three variables bind to the same render. **This is not an audio
regression.** Full explanation and the location of the real evidence:
`_harness/cc_broll_parity_activation_20260729/POSTAPPLY_PROOF_NOTE.md`.

## 6. Blocker found at the gate — reported, not worked around

The approved sequence was deploy → apply → record → push. It could not run in that order:

- `safe-deploy.sh` **BLOCKED** at class `A-LE`; `--allow-warn` only lifts class B.
- The gate's "repo" side is fetched from `raw.githubusercontent.com/.../main` (`drift-check/index.ts:392`)
  — **GitHub main, hard-pinned, never the local tree**. With v3.15.0 uncommitted, a drift refresh would
  re-confirm `A-LE`, not reclassify.
- Raw `supabase functions deploy` is **DENY-listed** (`.claude/settings.local.json`) — no sanctioned bypass.

⇒ **The sanctioned deploy path requires the code to be on `origin/main` first.** Surfaced to PK, who
chose to commit and push the lane's own commit ahead of the deploy. Sequence otherwise ran unchanged.

**Second finding, same moment:** a concurrent session's commit `8e1c0ff` (v6.53) was unpushed and ahead;
a plain push would have carried it — the v6.52 incident. Handled by committing in an **isolated worktree
based on `origin/main`**, so the shared checkout's HEAD was never touched. Mid-flight, that session
pushed `8e1c0ff` itself; the pre-push `origin/main..HEAD` inspection caught the resulting divergence
(the push would have force-reverted their work), the commit was rebased onto the new `origin/main`, and
the final push carried **exactly one commit — this lane's**. The v6.52 corrective rule worked as designed.

## 7. Constraints confirmed

- No DDL, no migration, no grant, no secret change, no registry-row mutation.
- 3 DML rows, all guarded and asserted; other clients unaffected (`no_assignment` sits above `fit_status`).
- `verify_jwt` unchanged; drift clean post-deploy.
- Incumbent remains the first fallback — asserted in-transaction, verified live.
- Rollback remains one `execute_sql` call: `docs/briefs/artifacts/broll-parity-activation-v1-rollback.sql`.
  The EF does **not** need reverting with it — the overlay targets a template that stops being selected.

## 8. Open items / carries

1. **One-clip pool (live consequence).** Exactly one eligible `broll_background` asset, so **every PP
   governed video now gets the identical AU suburb aerial** until Asset Gap "Video B-roll Intake v1"
   lands. PK-accepted, but now materially live rather than latent.
2. **TPR-1 addendum — proposed, NOT ratified.** The registry row for `dd5fd75e` still reads 720/1280/8
   (it correctly describes the provider object). TPR-1's cheap SQL check is therefore misleading for this
   one template. Proposed: the diff must consult the registry row **and**
   `B1_VIDEO_TEMPLATE_OUTPUT_PARITY`, diffing an overlay-listed template on its *effective* spec.
   **Needs a PK ratification step.**
3. **Smoke guard accepts two ids.** Deliberate (§7 of the packet); revisit if a third template is ever
   added to the parity map.
4. **`supabase_migrations` ledger gap** for `20260729120000` — inherited carry from v6.52, untouched here.

## 9. Verification

**Verdict:** `Pass`

- Every packet STOP condition was evaluated; STOP-1 tripped on the first attempt and was surfaced to PK
  rather than bypassed. No STOP was waived.
- Live state independently re-read after apply (not inferred from the apply's own output).
- Post-activation render measured, not asserted.
- Artifacts: `_harness/cc_broll_parity_activation_20260729/` (proofs, renders, frames, notes);
  apply/rollback SQL git-anchored under `docs/briefs/artifacts/`.
