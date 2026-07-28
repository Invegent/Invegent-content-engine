CLAIMED v6.43 · SIDE_PROVING · T2 · worktree: main (docs/harness-only lane) · gate: result · timestamp: 2026-07-28T14:20Z Sydney (renumbered from an initial v6.42 draft on discovering a collision with a parallel session's uncommitted v6.42 B-roll-consumption entry — v6.42 kept by the earlier claimant per CCF-02 protocol)

# Result cc-0085 — HeyGen actor→compose fenced spike

**Brief file:** `docs/briefs/cc-0085-heygen-actor-compose-spike.md`
**Executed by:** Claude Code (orchestrator), live HeyGen API + wired HyperFrames connector's raw render API
**Completed:** 2026-07-28 Sydney

---

## 1. Result status

`Complete` — all three experiments executed, evidence gathered, decision matrix filled, provider cleanup
done. **No architecture selected. No production build started**, per brief scope.

## 2. Commit(s)

N/A — no commits. This lane is evidence-gathering only; harness artifacts are untracked local files.

## 3. Files changed

- `_harness/cc0085_heygen_spike/**` — created (test0 preflight JSON, test1 Marcus webm + probes,
  test2 compose project/zips/renders, test3 Cinematic mp4 + frames, provenance JSON for every call)
- `docs/briefs/results/cc-0085-heygen-actor-compose-spike.md` — created (this file)

No production repo files changed. No DB writes. No deploys.

## 4. Actions taken

**Test 0 (free, read-only preflight):**
- DB read (`c.brand_avatar` JOIN `c.brand_stakeholder`) mapped Marcus→`local_area_coordinator`,
  Alex→`participant` for client `fb98a472…` — identity mapping only, per the brief's constraint.
- Verified both against **official HeyGen v3 GETs**, not the DB: `GET /v3/avatars/looks?ownership=private`
  (paginated, 53 looks) located both by `id`: Marcus `45addba0…` and Alex `b3a7e888…`, both
  `avatar_type:"photo_avatar"`, `status:"completed"`, `supported_api_engines:["avatar_iv","avatar_iii"]`.
  `GET /v2/voices` confirmed both `voice_id`s resolve to named voices ("Marcus - Voice 2", "Alex - Voice
  2"). **No matting/webm/alpha field exists anywhere in the look schema** (checked the full key-union
  across all 53 looks) — confirming the brief's fallback rule: matting had to be tested live, not inferred.

**Test 1 — Marcus transparent clip:**
- `POST /v3/videos` `type:"avatar"`, `engine:{type:"avatar_iv"}`, exact script, `output_format:"webm"`,
  1080p/9:16. Completed in ~75s, 4.911s duration, 5.93MB.
- Downloaded, then **rigorously tested for alpha** (see §6 — first pass used a flawed method and gave a
  false positive, corrected below): decoded 5 sampled frames across the clip's full duration via
  ffmpeg→RGBA; alpha channel is **uniformly 255 (fully opaque)** at every sampled point. **No real
  transparency was produced**, despite the API accepting `output_format:"webm"` without any rejection.
- `caption_url` in the poll response was empty — **no subtitle sidecar was returned** for this render.
- Frame inspection (viewed directly): clean, recognisable avatar likeness, natural expression, smiling
  mid-speech; background is a solid black fill, not alpha.

**Test 2 — two-avatar HyperFrames composition:**
- Rendered Alex's clip the same way (3.57s, 5.01MB, also alpha=255 on inspection).
- Authored a HyperFrames project (`index.html`, GSAP timeline, two `<video>` elements) per the official
  contract: zipped → `POST /v3/assets` (multipart `file`, after an initial 400 correcting the upload
  format) → `asset_id` → `POST /v3/hyperframes/renders` with `variables:{marcus_video_url, alex_video_url,
  setting_label}`, `Idempotency-Key` set throughout.
- **v1** (with `currentTime` GSAP tweens + missing HyperFrames scene structure) **failed** fast (~4s,
  generic `failure_message`, no logs endpoint exposed — tried 3 undocumented paths, all 404).
- **v2** (fixed: proper `.scene`/`.scene-content` structure, `data-hf-src` binding + JS fallback,
  removed non-standard video-seek tweens) **rendered successfully** — composition *validated* — but
  output was suspiciously small (400,705 bytes / 10s).
- **PK-authorised final retry (v3):** re-hosted both actor clips as HeyGen assets
  (`resource2.heygen.ai` same-origin URLs, via `POST /v3/assets`) instead of presigned cross-origin
  `files2.heygen.ai` URLs, resubmitted with fresh Idempotency-Key.
- **v3 output is byte-for-byte identical (SHA256 match) to v2**, despite completely different injected
  video URLs. This is decisive, non-visual proof that **the render pipeline never read either video
  variable** — hosting origin was not the cause. Frame extraction confirmed visually: the composite shows
  the navy background, "NDIS PLANNING CONVERSATION" header, and "Marcus"/"Alex" name labels, with the two
  actor boxes **completely empty** (no avatar content) at both t=2s and t=6s.
- **Per the PK hard boundary: this closes Test 2. No further iteration.**

**Test 3 — Cinematic two-shot:**
- `POST /v3/videos` `type:"cinematic_avatar"`, `avatar_id:[marcus_look_id, alex_look_id]`, a documentary-
  style establishing prompt, 10s, 1080p/9:16. Completed in ~5 minutes (generative pipeline, notably
  slower than avatar renders), 7.71MB MP4.
- Frame inspection at t=3s and t=7s: **both characters present and distinct in one shot**, seated at a
  table in a bright, plausible community-centre/classroom setting (windows, bookshelves, plant, water
  glasses, notebooks) — strong prompt adherence to "documentary style," "bright community centre," and
  "sitting at a table."
- **Likeness continuity, scored separately:** Marcus in the Cinematic shot (grey/white short hair, brown
  skin, light-blue striped button shirt) closely matches the Test-1 portrait render of the same look ID.
  Alex in the Cinematic shot (same multicolour patterned headband, same grey top with partial "Ki…" text
  visible on the collar, same brown floral cardigan) closely matches the Test-2 portrait render of the
  same look ID. **Both looks are recognisably the same governed identities across the two rendering
  engines**, and the two characters remain visually distinct from each other throughout.
- Not scored on dialogue/lip-sync (Cinematic is generative, silent-script by design — matches the brief).

**Provider-side cleanup (post-download, per brief §Notes):**
- `DELETE /v3/videos/{id}` (documented) on all 3 video ids (Marcus, Alex, Cinematic) — all `HTTP 200
  {"deleted":true}`.
- Best-effort `DELETE` on all 4 uploaded assets (2 project zips + 2 hosted actor webm assets) and all 3
  HyperFrames render ids — undocumented but all returned `HTTP 200`.
- Local evidence retained under `_harness/cc0085_heygen_spike/**` (request/response JSON, byte files,
  extracted frames) — no client/production data, fully synthetic NDIS dialogue only.

## 5. Constraints confirmed

- No external publish — confirmed; all outputs shared only with PK via direct file transfer, never a
  public URL or client channel.
- No production change / deploy / migration / DB write — confirmed; only one read-only `execute_sql`
  SELECT was run (Test 0 identity mapping).
- No production Studio Template created — confirmed; the schema-feasibility probe (§6) was inspection-only,
  no template authored.
- No Cinematic production build — confirmed; one evaluation render only.
- Asset-provisioning functions (`heygen-avatar-creator`/`-poller`) untouched — confirmed, not referenced.
- API key never written to any file/artifact/transcript — confirmed; read from the conveyed file into an
  env var per shell invocation only, never echoed or logged.
- Real participant/client data never used — confirmed; synthetic NDIS lines only ("Hi, I'm your local area
  coordinator…" / "I'd love more support getting to my community art class…"), consistent with cc-0084's
  synthetic register.
- Spend ceiling ($12) — confirmed not breached (§7 total).

## 6. Open issues

- **Correction to an earlier in-session claim:** mid-spike, before this result was written, matting/alpha
  was reported to PK as "CONFIRMED" based on a raw byte-substring search (`\x53\xc0`) in the WebM binary.
  That method is unsound — a 2-byte sequence match is statistically near-certain by chance across a 5.9MB
  file regardless of actual content — and was **retracted and re-tested** before finalising this result.
  The rigorous finding (ffmpeg RGBA decode, 5 sampled frames, full duration) is the **opposite**: alpha is
  uniformly opaque. This is recorded here as the authoritative finding; the earlier claim should be treated
  as superseded.
- **HeyGen's `output_format:"webm"` did not raise the documented rejection** ("This video avatar does not
  support webm output") for either look, yet also did not produce real transparency. Two explanations are
  plausible and neither was tested further (out of budget/scope): (a) these specific photo-avatar looks
  are not actually matting-trained despite completing without error, or (b) an additional undocumented
  parameter (e.g. an explicit `remove_background` or a different `background` value) is required beyond
  `output_format:"webm"` alone. This is a genuine gap in the official docs vs. observed behaviour.
- **No logs/diagnostics endpoint exists** for a failed HyperFrames render (`/logs`, `/workflow`, `/events`
  all 404) — the only signal on v1's failure was a generic `failure_message` string. This limits any future
  debugging of the composition itself.
- **HyperFrames variable injection did not work in either of two tested configurations** (presigned
  cross-origin URL, and same-origin HeyGen-hosted asset URL). The root cause was not isolated within the
  authorised budget — candidates include: `data-hf-src` binding conventions differing from what was
  authored, the renderer not executing/waiting on the fallback JS that sets `.src`, a CORS/autoplay policy
  in the headless render browser, or a schema mismatch between the declared `data-composition-variables`
  and what the render pipeline actually reads. **This is recorded as unproven/failed for the tested raw-API
  approach — not as proof that no HyperFrames configuration could work.**
- **HeyGen still returns no per-render cost** (`credits_used`-equivalent absent from the v3 response body)
  — the cost figures below are derived from the published self-serve pricing page, not API-reported spend.
  This is the same standing RI cost-opacity gap flagged in the 2026-06-20 audit.
- The Studio-Template two-speaker schema probe (brief's piggyback item) was **not separately executed** —
  spike time went to the HyperFrames debug cycle and the PK-authorised retry instead. Recorded honestly as
  **not run**, not as `schema-infeasible`.

## 7. Next recommended step

None from this lane — per the brief and PK's explicit instruction, this spike's job was evidence only.
The next step (architecture selection or any build) is a **separate future PK gate**, informed by §8 below
and the research pack's §5 matrix. If that gate wants to pursue the HyperFrames-compose hypothesis further,
the recommended next probe (not authorised here) is a minimal single-avatar HyperFrames composition (one
`<video>`, no second actor) to isolate whether the variable-injection mechanism works at all before
retrying two-avatar compositing.

**Total spend (estimated from published pricing; HeyGen returns no per-render cost):**

| Item | Rate basis | Est. cost |
|---|---|---|
| Marcus webm (4.911s, avatar_iv/photo_avatar) | $0.05–0.0667/sec | $0.25–$0.33 |
| Alex webm (3.57s, avatar_iv/photo_avatar) | $0.05–0.0667/sec | $0.18–$0.24 |
| HyperFrames render v2 (10s, 1080p/30fps, completed) | $0.10/min | $0.017 |
| HyperFrames render v3 (10s, 1080p/30fps, completed) | $0.10/min | $0.017 |
| HyperFrames render v1 (failed fast, ~4s) | uncertain if billed | $0–0.02 |
| Cinematic two-shot (10s, flat) | $7.00/video | $7.00 |
| **Total** | | **≈ $7.5–$7.8 of $12 ceiling** |

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matched the brief's structure (3 experiments, decisive Test-2 acceptance checklist, separate
  likeness scoring, provider cleanup) with the PK-authorised single retry correctly bounded and honoured.
- **Test 1 — PARTIAL.** Script/voice/render succeeded cleanly; the transparency requirement (the entire
  point of "transparent actor clip") was **not met** — alpha is fully opaque. This is a materially
  different and more important finding than initially reported mid-session, and is corrected here.
- **Test 2 — FAIL**, per the brief's own decisive-acceptance checklist: zero of the checklist items can be
  true because neither avatar rendered into the scene at all. The **byte-identical v2/v3 hash** is the
  strongest possible evidence for this — stronger than a visual read, since it rules out "maybe it's subtly
  there" — the pipeline provably ignored the video variables. **Working hypothesis (HeyGen actors →
  HyperFrames compose) is UNPROVEN/FAILED for the specific raw-API approach tested**, not disproven as a
  category — see §6 root-cause candidates.
- **Test 3 — PASS on its own terms.** Clean, well-composed two-shot with genuine likeness continuity for
  both governed identities, scored separately, and correctly not judged on dialogue.
- No constraint was violated; the cost ceiling held with meaningful margin even after the extra retry.
- New risk surfaced: the Test 1 finding means **Architecture B's precondition (transparent actor clips) is
  itself unverified as working** on these avatar looks — a future lane pursuing Architecture B needs to
  resolve the webm/matting gap before touching composition at all.

## 9. Learning notes (chat fills this)

- **Verify container-level claims with an actual decode, not a byte-pattern search.** A short binary
  signature "found" in a compressed video file is close to meaningless without parsing the container
  format properly; this cost a retraction mid-session. Future briefs involving binary format verification
  should specify the verification method up front (e.g. "decode via ffmpeg to RGBA and check alpha
  statistics," not "check for a marker byte").
- **Byte-identical outputs across different inputs is a stronger negative-proof technique than visual
  inspection** — worth naming explicitly as a check in any future compositing/pipeline-proof lane: hash the
  output before and after changing exactly one input; if unchanged, the input was never consumed.
- **HyperFrames' silent-drop failure mode (validates + renders, but ignores unread variables) is worse than
  an outright failure** — it costs money and produces a plausible-looking-but-wrong artifact. A future
  probe should isolate variable injection with a minimal single-element test before attempting anything
  compound.
- The brief's "schema-feasible / schema-infeasible / still-requires-paid-render" vocabulary for the
  Studio-Template probe was good discipline — worth applying the same three-way honesty (`done` /
  `not-run` / `inconclusive`) to any optional piggyback item under time pressure, rather than silently
  dropping it.
- `imageio_ffmpeg`'s bundled ffmpeg binary (already present as a Python dependency, no install needed) was
  a reliable path to frame/alpha extraction without a system ffmpeg — worth remembering for any future
  video-evidence lane in this environment.
</content>
