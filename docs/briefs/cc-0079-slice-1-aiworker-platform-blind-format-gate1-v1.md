# cc-0079 Slice 1 — Remove `ai-worker` Platform-Blind `text` Fallbacks (Gate-1)

> **Lane:** cc-0079 Slice 1 · **Type:** Gate-1 brief · **Tier:** T2 (isolated EF code, single function, hermetic tests) · **Class:** SAFETY_GATE
> **Status:** DRAFT — authored + reviewable. **NOT APPLIED / NOT DEPLOYED.** No worktree change made, no commit, no push.
> **Author base (stale-ref gate PASSED):** CE `origin/main = ce3e4b8…`, HEAD `ce3e4b8…`, parity 0/0, `main`. Source read at HEAD 2026-07-24.

---

## 1 · Problem (architecture brief §9.2 / §9.3)

Three platform-blind selections in `ai-worker` produce, and mask, platform-invalid formats — most visibly YouTube `text`, which cannot publish (4 unpublishable drafts in 30 days, 0 published):

| # | Location | Current | Defect |
|---|---|---|---|
| D1 | `index.ts:472` | `... ? parsed.format_key : 'text'` | out-of-palette Advisor answer falls back to `'text'` **with no platform check**; on YouTube `text` is never valid |
| D2 | `index.ts:427` | `allFormats.length > 0 ? allFormats : [{ ice_format_key: 'text', … }]` | empty palette invents a synthetic `text` format even for platforms that don't support text (IG, YT) |
| D3 | `index.ts:434-441` | selects `preferred_format_facebook` for **every** platform | client-preference bias can only ever fire on Facebook; IG/LI preference columns are read by nothing |

D1's live proof: a YouTube `m.post_visual_spec` row recorded `format_key='text'` while its own stored reason argued for `image_quote` — the model returned `image_quote`, it wasn't in the YouTube palette, `validKeys.includes` failed, and the constant `'text'` fired. The format contradicts the reasoning in the same object.

---

## 2 · Scope

**IN:** replace the two hardcoded `'text'` fallbacks (D1, D2) with platform-valid, fail-closed resolution, and fix the platform-blind preference read (D3). Single file: `supabase/functions/ai-worker/index.ts`. Regression tests per platform.

**OUT:** the governed final-format resolver (Slice 3 — this slice does **not** introduce it); promoting `slot.format_chosen` (explicitly preserved as non-authoritative); any change to `image-worker`/`video-worker`/publishers; the format-mix data (Slice 2); schema/DB.

**Architecture invariant preserved:** `m.post_draft.recommended_format` remains the single column every downstream worker reads. This slice changes only how `ai-worker` *derives* the value it writes there — never who reads it, never the column, never `slot.format_chosen`.

---

## 3 · Required behaviour

### D1 — out-of-palette fallback (`:472`)
When the Advisor returns a key not in `validKeys`, the fallback must be a **platform-valid member of the live palette** (`formats`), never the literal `'text'`. Since `formats` is already platform-filtered (`s[platform] !== true` excludes at `:424`), any element of it is platform-valid by construction. If the palette is empty, fail closed (see D2) — do not synthesise. Record the substitution so §9-class silent overrides become visible.

### D2 — empty-palette handler (`:427`)
An empty `allFormats` must **not** be back-filled with a synthetic `text` entry. `text` is invalid on Instagram and YouTube; injecting it is the root of the unpublishable-draft class. An empty platform palette is a **governed gap**, not a format: the job should surface a skip/no-eligible-format signal rather than fabricate one. (The downstream `m.fill_pending_slots` already has a `skip_reason` mechanism; this slice makes `ai-worker` refuse to invent, and hands the gap forward rather than manufacturing `text`.)

### D3 — platform-correct preference read (`:434-441`)
Select the column matching the target platform — `preferred_format_instagram` for instagram, `preferred_format_linkedin` for linkedin, `preferred_format_facebook` for facebook. YouTube has no such column (its format is governed elsewhere) → null preference, which is correct. The query already filters `platform = '${platform}'`; only the projected column is wrong.

> Note (recorded, not fixed here): the `exec_sql` calls in `fetchFormatContext` interpolate `clientId`/`platform` into SQL strings. This slice touches these lines and should parameterise or continue to rely on the fact that both values are server-derived UUIDs/enums, not user input. Flag for `db-rls-auditor` at review; not a new exposure introduced by this slice.

---

## 4 · What must NOT change

- `recommended_format` stays the consumed column; no worker edits.
- `slot.format_chosen` stays non-authoritative and unread by production.
- The avatar override (`:1009-1014`) is untouched.
- The correct opt-in palette filter at `:424` (the v2.11.2 YouTube fix) is preserved — this slice builds on it, and D2 is precisely the gap it left.
- No change to prompt content, model, temperature, or the synthesis path.

---

## 5 · Regression tests (per platform — mandatory)

Hermetic unit tests on the format-resolution helpers, one row per platform, plus the adversarial cases:

| # | Case | Platform | Expect |
|---|---|---|---|
| S1-T1 | Advisor returns out-of-palette key | youtube | resolves to a palette-valid video format or a governed gap — **never `text`** |
| S1-T2 | Advisor returns out-of-palette key | instagram | resolves valid; never `text` (IG unsupported) |
| S1-T3 | Advisor returns out-of-palette key | facebook | resolves to a valid FB format; may legitimately be `text` (FB supports it) |
| S1-T4 | Advisor returns out-of-palette key | linkedin | resolves valid; `text` allowed (LI supports it) |
| S1-T5 | empty palette | youtube | governed gap; **no synthetic `text`** |
| S1-T6 | empty palette | instagram | governed gap; no synthetic `text` |
| S1-T7 | in-palette Advisor answer | all | passes through unchanged (no regression) |
| S1-T8 | preference read | instagram | reads `preferred_format_instagram`, not `_facebook` |
| S1-T9 | preference read | linkedin | reads `preferred_format_linkedin` |
| S1-T10 | preference read | youtube | null preference, no error |
| S1-T11 | substitution provenance | any | out-of-palette substitution is recorded/inspectable, not silent |

Baseline to capture before change: current YouTube `text`-selection rate (4/30d) and the FB/IG/LI preference-read behaviour, so post-change proof shows the `text`-on-YT rate → 0.

---

## 6 · Apply shape

- `ef-builder` in an **isolated worktree**, local-only; `branch-warden` `safe` before any gate; targeted `deno test` on the new cases must pass; `db-rls-auditor` on the touched `exec_sql` reads; external review pinned to the final diff hash.
- Deploy is the PK hard stop, via the sanctioned path (`scripts/safe-deploy.sh ai-worker --allow-warn`), drift-refresh after push. **Not in this lane.**
- Marker/version bump on `ai-worker` VERSION so `deploy-verifier` can confirm the deployed bundle (bundles-from-CWD guard).

---

## 7 · Non-claims

Does not build the resolver (Slice 1 is harm-reduction, not the Mode-A guarantee). Does not make YouTube capable of static/text formats — it makes an invalid format **unselectable**, per the architecture brief's explicit fence. Does not fix Fault A (that is Slice 2 — an empty/invalid palette caused by the mix is narrowed by Slice 2, and D2 is the fail-closed backstop). Does not deploy or apply. Evidence: `ai-worker/index.ts` at CE `ce3e4b8`, live `m.post_visual_spec` reads, 2026-07-24.
