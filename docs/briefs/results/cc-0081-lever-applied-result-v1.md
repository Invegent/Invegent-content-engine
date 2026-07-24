CLAIMED v7.08 · cc-0081 interim lever APPLIED — result · S8 · shared checkout · gate: window CLOSED · 2026-07-24

# Result — `cc-0081` interim containment lever **APPLIED**

**Status:** `APPLIED · ALL ASSERTIONS PASSED · NO ROLLBACK TAKEN · WINDOW CLOSED`
**Sanctioned wording — now earned, and the only permitted summary:**

> **"outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains."**

**⛔ NOT revocation.** Does **not** kill already-issued access tokens · does **not** stop a new consent flow · does **not** close **L3** · **L2 remains open even after the full three-part patch lands.**

**Lane class:** SAFETY_GATE · **T2** (single-table DML, one column, three rows, reversible) · no DDL, no deploy, no commit
**Environment:** Supabase project **`mbkmaxqhsohbtwsqolns`** (ICE production)
**Executed by:** S8, inside a PK-opened window, alone. **Total production mutation: one UPDATE, one column, three rows.**
**Governing artifact:** runbook v2, pin **`2226e389d7e12d619ca9b14f6bb575b2745b92fb1cfef244040bedb220b44f82`** (`80e4c180…` retired)
**Governing review:** **`000d5892-2f3b-43eb-9151-bb5b1b435d49`** — `agree` / `proceed` / `escalate: false`, zero pushback

---

## 1. Why this window existed — keep this sentence prominent

**`mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32` was issued 2026-05-04 against the bridge's v2.0.0 READ-ONLY build. It silently acquired GitHub WRITE authority over three repositories when v3.0.0 deployed on 2026-05-14 — because tokens are not version-scoped, and nobody re-consented.**

That is the justification for the whole lane: a credential granted for a read-only bridge became a write credential without any act by its holder or its grantor.

## 2. Preflight — all six re-run fresh, all PASS

| # | Check | Observed |
|---|---|---|
| 1 | Authoritative remote | `HEAD` = `origin/main` = `ls-remote` = **`052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9`**, parity **0/0** ✅ |
| 2 | Artifact vs **new** pin | frozen == live == **`2226e389d7e1…`** ✅ · retired `80e4c180…` not cited ✅ |
| 3 | Three targets present | exactly 3 ✅ |
| 4 | Unsuffixed pre-state | all 3 `client_secret_post`, all with a secret, **none** suffixed ✅ |
| 5 | Drift + rollback target | `mcp-chatgpt-bridge` **A-LE**, `hashes_equal = true`, deployed == repo blob **`df0f1ec3…`** → **rollback target known** ✅ · `mcp-github-bridge` **B-RR**, deployed **`2b9b7c1d…`** ✅ |
| 6 | Environment stated | `mbkmaxqhsohbtwsqolns` ✅ |

A preflight that passed earlier in the day was **not** reused — every value above was re-derived at window open.

## 3. A3 — the mutation

The atomic `DO` block executed **byte-identical to the reviewed text** (block hash `432a5b9f446b3363…`, proven identical to v1 by mechanical extraction — see the v2 §1 delta verification). It **returned without raising**, which is itself the proof that `ROW_COUNT` was exactly **3**: any other value raises and rolls the block back. **Partial application was impossible by construction.**

## 4. A4 — all four assertions PASS

| Assertion | Expected | Observed | |
|---|---|---|---|
| **A4.1** targets suffixed | 3, all `true` | **3, all `true`** | ✅ |
| **A4.2** neutrality — non-github untouched | **14** *(corrected from 7)* | **14** | ✅ |
| **A4.3** whole table | 30 / 16 / 14 / **3** | **30 / 16 / 14 / 3** | ✅ |
| **A4.4** per-row fingerprint diff, all 30 rows | exactly **3 changed / 27 identical**, changed set == targets | **3 changed / 27 identical, changed set == targets exactly** | ✅ |

**A4.4 in full — the strongest of the four.** `left(md5(client_secret),8)` compared per row against the pre-mutation baseline across the entire table. No `client_secret` value was read or recorded at any point.

| target | pre | post |
|---|---|---|
| `mcp_gh_6e4ec94e75c941f3e3910dcdc0d94b32` | `767d17db` | `8a55be9e` |
| `mcp_gh_3acd65f6d56d1cd4067285b2dafeef70` | `aa350f91` | `d4d0aacf` |
| `mcp_gh_a7565c37a7dd6c2c37a2c26fb17ef7f9` | `425705f1` | `d383138d` |

**All 27 non-targets byte-identical — 13 other github rows and all 14 chatgpt rows.** The live review connector `mcp_a73a5315318dc24b574ad953fd61da04` is unchanged at **`db261915`** before and after. **No unrelated OAuth client changed, proven table-wide rather than by sampling.**

## 5. A5 — post-lever review-gate proof: **PASS**

`ask_chatgpt_review` · **`review_id a96d1b14-b6c1-4364-9d90-984667d387ca`**.

**The defined criterion was whether the call succeeds. It did** — a complete structured response returned after the mutation. **The `mcp-chatgpt-bridge` and the external-review gate are unimpaired. No rollback trigger fired; A6 was not run.**

The reviewer independently **verified** three claims: the single atomic UPDATE affected exactly three rows · 3 changed / 27 identical · **the review-connector row was unchanged before and after**.

Its verdict was `partial` with one epistemic pushback — *does a successful call actually prove the exclusion list correct?* — and it escalated. **That is a caveat, not a concrete defect, and not a rollback trigger** (the runbook conditions rollback on the call *failing*). It is recorded here rather than waved away, and its `corrected_action` is closed below.

### The reviewer's point was directionally right, and here is the honest limit

A successful `ask_chatgpt_review` exercises the connector's **MCP invocation path** (`POST /`). It very likely does **not** exercise `POST /token`, since the connector presents an already-issued credential. **So this call alone does not prove the token-issuance path is undamaged.**

**What does prove it is A4.4:** all 14 chatgpt client rows are byte-identical, so no input to the chatgpt bridge's `/token` client lookup changed at all. The two evidences are complementary and together cover both paths — **the invocation path by demonstration, the issuance path by proof of non-modification.** Neither alone would have been sufficient, and claiming the single call covered both would have been an overreach.

## 6. What is now true, and what is not

| | |
|---|---|
| ✅ | The refresh **and** authorization-code exchanges are blocked for the three GitHub-bridge credentials — the indefinite renewal chains are ended |
| ✅ | Fully reversible; the audit trail in `m.mcp_oauth_code` is intact (which is why `DELETE` was rejected) |
| ✅ | Zero collateral: 27 of 30 rows untouched, review gate live |
| ❌ | **Already-issued access tokens are NOT invalidated** — the MCP auth path never reads the client table. Moot for these three (floors 2026-06-03 / 06-13 / 06-17 all passed) but **the mechanism remains** for any future token |
| ❌ | **A new consent flow can still mint fresh credentials.** Outstanding keys are revoked; the door is not locked |
| ❌ | **L3 not closed** — the ChatGPT passphrase can still mint a new GitHub-bridge token by cross-redemption |
| ❌ | **L2 not closed, and will still be open after the full three-part patch** |

**Carried, and now live in production behaviour:** because the two bridges share `m.mcp_oauth_client`, these three client_ids will now also fail at the **ChatGPT bridge's** `/token`. Intended and harmless — they are GitHub-bridge clients — and it is the same shared-table defect class as L3.

## 7. Rollback posture — armed, not used

Not exercised; no assertion failed. It remains available and deterministic: an exact-length `left()` strip (`a386dcd2122f91ce…`, hash-identical to the reviewed text) restoring the **original bytes**, fail-closed on `ROW_COUNT <> 3`. Runbook v2 §7.

## 8. Still open — this window closed one thing only

1. **Patch A/B/C** — discriminator (closes L3) + strict `aud`/`iss` + mandatory `exp` (closes L1) + `jti`/`token_version` fail-closed revocation with refresh rotation. **Designed, not built.** T3.
2. **L2 static-secret replay** — needs a PK choice: bridge-scoped derived token, or a separate secret (secret-posture T3).
3. **Recovery commit** — `index.ts.v3.0.0.recovered`, sha256 `2b9b7c1d…`, path-scoped, assert the **staged blob**. Must land before any deploy (`safe-deploy` blocks on B-RR), and **must stay separate from the remediation commit**.
4. **Deploy chokepoint** — `mcp-chatgpt-bridge` first, alone, rollback equality re-verified immediately prior, live review-call proof, only then `mcp-github-bridge`.
5. **R-8 PAT scope** undetermined · **R-3/R-4/R-5** recorded, not actioned.

## 9. Non-claims

No deploy, no redeploy, no commit, no staging, no DDL, no grant change. No secret was read; only truncated md5 fingerprints were recorded, and no `client_secret` value appears in any artifact or transcript. **No exploitation of L1/L2/L3 is claimed or evidenced** — the bridges log no tool invocations, so absence of evidence is not evidence of absence. The refresh-window dates that justified the target set remain **floors**, not expiries. A5 proves the invocation path by demonstration and the issuance path only by A4.4's proof of non-modification; **neither is an empirical test of `/token`**. This result closes containment of three outstanding credentials — **it closes no finding, approves nothing, and proves nothing about the two open cross-bridge legs.**

## 10. Draft register pointer (for S4 — S8 does not cut register versions)

> **v7.08 — 🟢 cc-0081 interim lever APPLIED (S8 · T2 · SAFETY_GATE · one UPDATE / one column / three rows).** Preflight **6/6 fresh PASS** under new pin **`2226e389d7e1…`** (`80e4c180…` retired); review **`000d5892…`** (`agree`/`proceed`/zero pushback). Atomic `DO` block ran **byte-identical to the reviewed text** and returned without raising ⇒ `ROW_COUNT` exactly **3**; partial application impossible by construction. **A4 all four PASS: targets 3/3 suffixed · neutrality 14 (corrected from the miscounted 7) · whole table 30/16/14/3 · per-row fingerprint diff across all 30 rows = exactly 3 changed / 27 identical, changed set == targets.** Review connector `mcp_a73a5315…` unchanged (`db261915`). **A5 PASS — the post-mutation `ask_chatgpt_review` call SUCCEEDED (`a96d1b14…`), proving the review gate unimpaired; no rollback trigger, A6 not run.** Its `partial` verdict was an **epistemic caveat, not a defect**, and its point is answered honestly: the call proves the **invocation** path by demonstration, while the **issuance** path is proven only by A4.4's non-modification of all 14 chatgpt rows — neither alone suffices, and the call was not claimed to cover both. **🔴 `mcp_gh_6e4ec94e…` remains the justification: issued 2026-05-04 against the READ-ONLY v2.0.0 bridge, it silently gained GitHub WRITE authority when v3.0.0 deployed 2026-05-14, with nobody re-consenting.** ⛔ **Wording — "outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains." NOT revocation; issued access tokens NOT invalidated; a new consent flow still mints credentials; L3 NOT closed; L2 open even after the full patch.** Now live: these 3 client_ids also fail at the ChatGPT bridge's `/token` (shared table, same defect class as L3). Rollback armed, unused. **Window CLOSED.** Result: `docs/briefs/results/cc-0081-lever-applied-result-v1.md`.
