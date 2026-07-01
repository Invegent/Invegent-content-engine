# TMR G2 Fix — Neutral Placeholder Size Patch (Deploy Packet)

> **Lane:** TMR Template Proof Lifecycle v1 — **G2 Fix** (Option 2 placeholder-size patch). Code **BUILT + REVIEWED, LOCAL-ONLY, NOT DEPLOYED, NOT COMMITTED.** No render, no G2 retry, no proof.
> **Owner:** PK · **Date:** 2026-07-01 Sydney · **Repo HEAD:** `8a386e4` (== origin/main, 0/0) · **Registers:** v4.69 · **Project:** `mbkmaxqhsohbtwsqolns`
> **`reviewed_input_hash` (final corrected diff):** `032e00d153eef95768b2482b1ba599cff5a4cdbc212d69de59db9172bf0e2e0d`

---

## 1. Verdict

```
DEPLOYED_AND_VERIFIED  (PK-run CLI deploy 2026-07-01; post-deploy verification PASS)
```

## 2. Files changed (local-only, uncommitted)

| File | Change |
|---|---|
| `supabase/functions/image-worker/tmr_smoke.ts` | ONE hunk: the placeholder comment + the two base64 constants → **valid** larger neutral solid PNGs |
| `supabase/functions/image-worker/index.ts` | `VERSION` `v3.20.0` → **`v3.20.1`** + one changelog line |

Guards, allow/deny request-field lists, `SMOKE_PREFIX` + `_smoke/tmr/.../{inputs,output}/` paths, fixed synthetic modifications, `renderUploadSmokeNoLog` (no `write_render_log`), and the safe response are **byte-unchanged** from the deployed v3.20.0.

## 3. What changed

The 1×1 placeholders (which Creatomate rejected as "damaged or unsupported (element Background)") are replaced with **valid larger neutral synthetic solid PNGs**:
- `PLACEHOLDER_BG_PNG_B64` → **1080×1080** solid `#8A8F94` (matches the 1:1 canvas).
- `PLACEHOLDER_LOGO_PNG_B64` → **512×512** solid `#C9CDD2`.
Both brand-free, in-code, still the only image sources, still uploaded only to `_smoke/tmr/.../inputs/`.

## 4. Review chain — RESULTS (all clean, incl. a real defect caught + fixed)

| Review | Verdict | Notes |
|---|---|---|
| **ef-builder** | built + `deno check` pass | generated the PNGs (python stdlib); only the 2 constants + comment + VERSION changed |
| **security-auditor** | **security-GREEN** + caught a functional defect | flagged that the **first embedded base64 was corrupt** — the edit tooling truncated the ~6600-char string, producing invalid PNGs (IDAT overrun / CRC mismatch). No security regression; but the patch would not have fixed the render. |
| **fix** | applied | regenerated + **wrote the constants byte-exact via python** (not the edit tool); **independently re-validated the in-file bytes** (security-auditor §9 proof): PNG signature ✓, IHDR 1080×1080 / 512×512 ✓, **every chunk CRC valid** ✓, IDAT decompresses ✓, pixel colours `#8A8F94` / `#C9CDD2` ✓ → **BOTH VALID** (b64 lengths 6640 / 1996). |
| **db-rls-auditor** | **pass** | no DB-mutation surface, storage-only, write posture unchanged (`_smoke/tmr/` only, no render-log) |
| **external review** | **agree** / low / high / no-escalate | `ask_chatgpt_review` `b5ba8c0a-31c8-4f73-8e12-60b93670899e`, reviewed against hash `032e00d1…` |

**Process note (lesson):** embedding a very long (~6.6 KB) base64 string via the file-edit tooling corrupted it (dropped ~388 chars). The reliable method is a programmatic byte-exact write + independent in-file validation. This is why the in-file PNGs are re-validated here, not just trusted from generation.

## 5. Local checks

`deno check` (index.ts + tmr_smoke.ts) → **pass** (deno 2.6.5). In-file PNG validation → **BOTH VALID**. No Creatomate call, no render.

## 6. Deploy plan (PK-run, at the deploy gate — NOT performed here)

- **Command:** `supabase functions deploy image-worker --no-verify-jwt` — **`--no-verify-jwt` mandatory** (image-worker uses `x-image-worker-key`, not JWT; omitting flips `verify_jwt→true` → 401→502). (The Bash deploy is harness-denied for the agent → PK-run, as with v3.20.0.)
- **Precondition:** commit the 2-file bundle first (on PK approval).

## 7. Rollback plan

Additive/data-only ⇒ trivial: revert the 2 constants + version (redeploy v3.20.0). No DB/state to unwind.

## 8. Post-deploy verification (no G2 render)

- `GET image-worker` → `version:"image-worker-v3.20.1"`, active.
- Negative guards still reject without rendering (wrong template-id / `synthetic_only:false` / forbidden field → 400; missing `x-image-worker-key` → 401).
- Invariants unchanged: proof rows 0; no new `m.post_render_log` / `m.post_publish`; template `platform_candidate`; G3/G4/G5 untouched.
- **Running the G2 re-render is a separate PK gate — NOT part of deploy verification.**

## 9. Non-claims

No render executed, no storage object created, no proof event, no `m.post_render_log`, no `m.post_publish`, no publish/enable/bind/platform_safe/production_proven. Template remains `platform_candidate`. Proof rows 0.

## 10. Gate separation + next step

- **This lane** = build/review + PK deploy gate *(reviews clean; awaiting PK deploy approval)*.
- **Deploy** = PK-run `--no-verify-jwt` *(separate gate)*.
- **G2 re-render** = run the smoke render again with the valid placeholders *(separate PK gate; still `_smoke/tmr/` only; no proof/publish)*.
- **G3/G4/G5** = later separate gates.

**On PK deploy approval:** commit the 2-file bundle + this result doc + register reconciliation → PK runs the deploy → post-deploy verification (§8). **Do not run the G2 re-render after deploy** without separate PK approval.

## 11. Deploy Verification Result (PASS) — 2026-07-01

Deploy mechanism: **PK-run CLI** `supabase functions deploy image-worker --no-verify-jwt` (Bash deploy harness-denied for the agent; MCP deploy declined for the shared production function). Deployed code == reviewed valid code (working-tree diff hash `032e00d1…`).

| Check | Expected | Actual |
|---|---|---|
| function ACTIVE | yes | ✅ (`GET` → `{ok:true,function:"image-worker"}`) |
| version | `image-worker-v3.20.1` | ✅ `image-worker-v3.20.1` |
| `verify_jwt` | false (unauth GET works) | ✅ unauthenticated GET 200 (flag preserved) |
| `tmr_template_smoke` branch + valid placeholders | live | ✅ (deployed==reviewed; in-file PNGs pre-validated 1080×1080 #8A8F94 / 512×512 #C9CDD2, CRC valid, IDAT decompresses) |
| proof rows | 0 | ✅ 0 |
| G2 re-render run | none | ✅ none |
| new `_smoke/tmr/…/output/` object | 0 | ✅ 0 |
| new `m.post_render_log` `_smoke/tmr/` | 0 | ✅ 0 |
| new `m.post_publish` `_smoke/tmr/` | 0 | ✅ 0 |
| template lifecycle | `platform_candidate` | ✅ `platform_candidate` |
| G3/G4/G5 · publish/enable/bind/platform_safe/production_proven | untouched / none | ✅ |

**Result: DEPLOYED_AND_VERIFIED.** The valid placeholders are live but **the G2 re-render has NOT run** — it remains a separate PK gate.
