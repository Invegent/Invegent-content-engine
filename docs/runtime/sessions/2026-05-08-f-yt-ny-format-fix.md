# 2026-05-08 Sydney — F-YT-NY-FORMAT-SELECTION closed end-to-end (v2.53)

**Outcome:** P1 F-YT-NY-FORMAT-SELECTION closed via single-EF deploy. Commit `1ccfe9a21b3282245a646f659434239fcf71ed0c` shipped ai-worker v2.11.1 → v2.12.0 with two-part format-advisor-v1 fix. 1 D-01 fire (`64230c18`, clean PASS, 0 pushback, 0 escalation). safe-deploy.sh `--allow-warn` honoured as authoritative gate. Live version verified `ai-worker-v2.12.0` via GET endpoint. Post-deploy drift fire `3bed87b0` confirmed Class A-LE (logical-equivalent, normalised hashes match). 0 state-capture exceptions. Hold-state preserved throughout (STANDING_THREE untouched, cron 53/11/64/65 still paused, NDIS-Yarns IG `publish_enabled=false` unchanged).

---

## Investigation

**Symptom:** NDIS-Yarns × YouTube selecting `text` format for 100% of last 14 days' drafts (8/8); Property-Pulse × YouTube selecting `text` for 76% (13/17). YouTube cannot publish text → 0 published posts on NY×YT, 24% publish rate on PP×YT.

**Diagnosis path:**
1. Read `supabase/functions/ai-worker/index.ts` v2.11.1 source via Invegent GitHub MCP `get_file_contents` (sha `54bf045d`, 56415 B).
2. Inspected `t."5.3_content_format"` table via Supabase MCP read-only catalogue query: 10 buildable format rows, each with `platform_support` JSONB column. 5 of 10 rows have NO `youtube` key in their `platform_support` (only `facebook`, `instagram`, `linkedin` keys present).
3. Identified two coupled bugs in ai-worker:
   - **Bug 1 — `fetchFormatContext` filter**: `if (s[platform] === false) continue` uses opt-OUT semantics. Rows missing the `youtube` key entirely have `s["youtube"] === undefined`, which is `!== false`, so they pass through. All 10 rows reach the candidate set including 5 non-video formats (text, image_quote, carousel, animated_text_reveal, animated_data) inappropriate for YouTube.
   - **Bug 2 — `callFormatAdvisor` system prompt**: Function signature has no `platform` parameter; system prompt is platform-blind. Even if Bug 1 were fixed, the advisor has no platform context to reason about format compatibility.
4. Verified candidate set behaviour for all 4 platforms by simulating both filter semantics against the live `platform_support` data:
   - facebook: 10 (opt-out) → 10 (opt-in) ✓ no change
   - linkedin: 4 (opt-out) → 4 (opt-in) ✓ no change
   - instagram: 5 (opt-out) → 5 (opt-in) ✓ no change
   - youtube: 10 (opt-out — BUG) → 5 (opt-in — CORRECT) ✓ matches video-only set

**Brief reference:** `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` (sha `7d71eda6`).

## Decision

4 fix shapes evaluated:
- **A:** platform-aware system prompt only (defence-in-depth, but doesn't close the candidate-leak vector)
- **B:** post-decision override (forces text → fallback if non-video chosen on YouTube — band-aid, doesn't fix root cause)
- **C:** opt-in candidate filter (root cause; 1-line change)
- **D:** new schema column on `t."5.3_content_format"` (over-engineered)

**Selected: C + light A** (defence-in-depth). 5 surgical edits + VERSION bump. No schema/data/refactor changes.

## Code changes

All edits to `supabase/functions/ai-worker/index.ts`. 6 str_replace edits applied locally on byte-exact stage of v2.11.1 source:

1. VERSION bump `v2.11.1` → `v2.12.0` + ~25-line changelog block prepended
2. `fetchFormatContext` filter: `s[platform] === false` → `s[platform] !== true` (opt-in semantics)
3. `callFormatAdvisor` opts type: added `platform: string;` field
4. `callFormatAdvisor` destructure: added `, platform`
5. `callFormatAdvisor` system prompt: inserted `\n\nTarget platform: ${platform}. Choose only formats compatible with ${platform}.\n\n` after role line
6. `callFormatAdvisor` call site: added `, platform` argument (already in scope from `const platform = job.platform ?? 'facebook'`)

**Final size:** 58063 B (LF line endings). **Expected blob SHA-1:** `84da0e7aa4d61f5f6f8f6e0fbafbc2902c63497d`.

## D-01 fire

**Review id:** `64230c18-362b-4d0c-bf82-b5ab6eda3856`. action_type `ef_deploy`.

**Verdict:** agree, risk medium, confidence high. 0 pushback points. 0 escalation. Clean approve.

T-MCP-02 cumulative: 49 → 50. State-capture exceptions v2.53: 0.

## Commit + acceptance

**First push attempt** truncated mid-content due to combined output budget across multi-tool turn. **Retry** in fresh turn with no preamble succeeded — push_files committed atomically.

**Commit:** `1ccfe9a21b3282245a646f659434239fcf71ed0c` on `main`.

**Acceptance integrity:** Re-fetched landed file via Invegent GitHub MCP. Returned blob SHA `84da0e7aa4d61f5f6f8f6e0fbafbc2902c63497d` matches expected exactly. Size 58063 B matches. All 6 edits visible in returned content. Changelog v2.12.0 block present. Byte-perfect transfer confirmed.

## Pre-deploy drift fire (Option 3 path per PK directive)

PK directive: do NOT bypass safe-deploy.sh. Fire drift-check manually post-commit, expect class shift A → B-FD, then run script with `--allow-warn`.

**Manual fire:** Replicated cron jobid 80 SQL command verbatim via Supabase MCP `execute_sql`. 5 parallel `net.http_post` calls to `drift-check?write=true&limit=10` with offsets 0/10/20/30/40, fresh `gen_random_uuid()` scan_id.

**Result:** scan_id `04c3fd1b-8155-4d06-88cf-f631d31ee5d0`. 49 rows / 49 distinct EFs in 880ms. ai-worker:
- current_class: **B-FD** (was A) — state_changed = true
- severity: P3
- deploy_version: 2.11.1
- repo_version: 2.12.0
- security_definer_regression_risk: false
- hashes_match (normalised): false

Matches predicted gate state for `--allow-warn` → WARN+PASS path.

## Deploy via safe-deploy.sh

Environment survey via Windows-MCP PowerShell:
- Repo found at `C:\Users\parve\Invegent-content-engine`
- Pulled latest: HEAD now `1ccfe9a2`. Local file 59013 B (CRLF translation, +950 B vs LF blob — drift-checker uses `*_hash_normalised` columns to handle this)
- `git`, `supabase` CLI 2.75.0, `curl` in PATH
- `bash`, `sed` not in PATH but available via Git for Windows (`C:\Program Files\Git\bin\bash.exe` and `C:\Program Files\Git\usr\bin\sed.exe`)
- User-level env: `SUPABASE_SERVICE_ROLE_KEY` SET (length 219), no `SUPABASE_ACCESS_TOKEN`
- Discovery: `supabase functions list` works with SERVICE_ROLE_KEY alone (no separate access token needed)

**`--check-only --allow-warn` first** (gate dry-run): exit 0, prints WARN, prints PASS. Confirms gate logic before live deploy.

**Live deploy** (`bash ./scripts/safe-deploy.sh ai-worker --allow-warn`):
```
[safe-deploy] WARN  ai-worker — class=B-FD (drift detected; --allow-warn permits PASS).
[safe-deploy] invoking: supabase functions deploy ai-worker
Uploading asset (ai-worker): supabase/functions/ai-worker/index.ts
Deployed Functions on project mbkmaxqhsohbtwsqolns: ai-worker
```
Exit code 0. Advisory warnings only: Docker not running (cloud deploy doesn't need it), CLI upgrade available (deferred).

## Post-deploy verification

**GET endpoint:** `GET /functions/v1/ai-worker` → 200 OK, body `{"ok":true,"function":"ai-worker","version":"ai-worker-v2.12.0"}`. Live version confirmed.

**Post-deploy drift fire:** scan_id `3bed87b0-a151-4d27-8a26-e0988ca009a9`. ai-worker:
- current_class: **A-LE** (was B-FD) — state_changed = true
- severity: none
- deploy_version: 2.12.0
- repo_version: 2.12.0
- security_definer_regression_risk: false
- hashes_match (normalised): true

Class A-LE rather than pure A: raw hashes differ (CRLF vs LF artifact from Windows deploy) but normalised hashes match. A-LE is in the Class A family (no severity, no action). Round-trip fully closed.

## Closure budget

| Step | Time |
|---|---|
| Investigation (source read + catalogue inspect + bug confirmation) | ~30 min |
| Code patch authoring + 6 str_replace edits | ~20 min |
| D-01 fire #1 (`64230c18`) | ~10 min |
| GitHub commit (with truncation retry) | ~15 min |
| Manual pre-deploy drift fire + class verify | ~10 min |
| Repo pull + Windows env survey | ~10 min |
| safe-deploy.sh `--check-only` + live deploy | ~5 min |
| Post-deploy GET verify + drift fire | ~10 min |
| 4-way sync close | ~30 min |
| **Total** | **~2.5h chat** |

Day total v2.53: ~2.5h. Trailing-14-day: ~54h + 2.5h = ~56.5h above 8.0 floor. ~4 P0+P1 open of 20 cap (was ~5 v2.52). ✅ within budget.

## 4-way sync close

- Session file: `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` (this file)
- Sync state: refreshed v2.53 (`docs/00_sync_state.md`)
- Action list: v2.53 bump (1 closure, Top 3 reordered, F-YT-PUB-AVATAR-EXCLUSION P3 NEW)
- Memory: rolling-window `recent_updates` v2.53 entry replaces v2.52
- **Dashboard roadmap PHASES — 9th consecutive deferral** (was 8th in v2.52). Risk unchanged: roadmap still doesn't reflect Stage 2b ship, Stage 3 ship, P1 SD triage closure, insights-worker drift closure, RPC migration orphan closures, OR this F-YT-NY closure.

## Open items / carries

**NEW v2.53:**
- **F-YT-PUB-AVATAR-EXCLUSION (P3)** — Latent risk identified during F-YT-NY analysis. `youtube-publisher` `.in()` filter on draft format excludes `video_short_avatar` from the allowed list. With the F-YT-NY fix in place, format-advisor can now legitimately pick `video_short_avatar` for YouTube — but the publisher would reject it. P3 because: (a) only surfaces if advisor picks avatar format, (b) HeyGen avatar pipeline is still in beta. Fix would be to either add `video_short_avatar` to the publisher's allow list, or add explicit avatar-handling branch.

**Passive validators (will close themselves):**
- Next NY×YT slot fire — expect ai-worker log line `advisor chose <video_format>` (was always `text` before)
- 7-day distribution check (`m.post_draft.draft_format->'ai'->>'format_decided'` GROUPED BY client+platform) — confirm FB/LI/IG unchanged + YT now picks video formats
- Drift cron tonight 17:00 UTC (~03:00 AEST 9 May) — should re-confirm A-LE

**Carried unchanged from v2.52:**
- Crazy Domains refund follow-up (Personal businesses; PK actions manually)
- morning-inbox-sweep-v1 brief amendment (P3, status=draft, awaiting PK)
- 21+ close-the-loop UPDATEs to `m.chatgpt_review` cumulative ~24+ (this session adds 1)
- Dashboard roadmap PHASES — **9th** consecutive deferral
- All other v2.51+v2.52 carries unchanged

## Honest limitations

- **Memory at 30-edit cap pre-session.** v2.53 update folds bytes from v2.52 (preserving Crazy Domains + morning-inbox-sweep threads in compressed form) into single rolling `recent_updates` entry replacing v2.52.
- **Format choice was unverified empirically** — no synthetic NY×YT job fired post-deploy to observe advisor live behaviour. Verification deferred to next natural slot fire (passive validator). The deploy verification chain (GET endpoint + post-deploy drift A-LE) confirms code is live; advisor behaviour confirmation requires actual job fire.
- **CRLF vs LF normalisation artifact**: Local Windows checkout has 950-byte size delta vs GitHub blob due to CRLF line-endings. Deployed binary has CRLF. Drift-checker handles this via `*_hash_normalised` columns. No functional impact but raw hashes will continue to differ from blob SHA until a Linux-native deploy happens.
- **No empirical confirmation that F-YT-PUB-AVATAR-EXCLUSION will trigger.** Logged as P3 follow-up based on code-read inference, not observed misfire. Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar` will reveal it.
